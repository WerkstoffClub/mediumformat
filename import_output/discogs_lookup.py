#!/usr/bin/env python3
"""Discogs lookup → build TSV for the Discogs sheet.

For every item from build_tsv.py:
  A  Query              = "{FORMAT_UPPER} {ARTIST_UPPER} {Smart Title}"
  B  Source             (from PURCHASED)
  C  No
  D  Artist Name
  E  Catalog Title
  F  Format
  G  Edition
  H  Qty
  I  UPC/Catalog No.
  J  AEC Cat
  K  Total Items Ordered
  L  Weight/PCS (LB)
  M  Weight/PCS (KG)
  N  Total Weight (KG)
  O  Shipping Cost
  P  Forwarder Shipping (IDR)
  Q  Identifier         (Discogs release/master ID + URL)
  R  Barcode            (digits-only)

Lookup strategy per row (tried in order, first hit wins):
  1. UPC numeric (>=8 digits) → `barcode=UPC` search.
  2. UPC alphanumeric (e.g. "WARPLP 240") → `catno=UPC` search.
  3. Text fallback: `q=artist title` + format filter.
  4. Pick the top result; if zero results, leave Identifier blank.

Discogs personal token rate cap: 60 req/min. We sleep 1.05s per call and
cache every response to JSON so re-runs only fetch what's missing.

Usage:
  python3 discogs_lookup.py            # process all 155 items
  python3 discogs_lookup.py --limit 5  # smoke test with first 5
  python3 discogs_lookup.py --no-net   # rebuild TSV from cache only
"""
from __future__ import annotations
import argparse, json, os, re, sys, time
import urllib.parse, urllib.request, urllib.error

# Pull invoice data from the sibling script
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_tsv import P19, P12, P18, Item, Invoice, WEIGHT_LB, LB_TO_KG  # noqa: E402

# ─── Config ───────────────────────────────────────────────────────────
TOKEN          = "koyDmZAictDrjARklpvYMClqQsyXksJlpVKYWepM"
BASE_URL       = "https://api.discogs.com/database/search"
USER_AGENT     = "MediumFormatInventory/0.1 +https://mediumformat.local"
SLEEP_SECONDS  = 1.05
CACHE_DIR      = os.path.join(os.path.dirname(os.path.abspath(__file__)), "discogs_cache")
OUTPUT_TSV     = os.path.join(os.path.dirname(os.path.abspath(__file__)), "discogs_sheet.tsv")
os.makedirs(CACHE_DIR, exist_ok=True)


# ─── Discogs format mapping ───────────────────────────────────────────
# Map our canonical format key → Discogs `format` search filter value
DISCOGS_FORMAT = {
    "CD":          "CD",
    "2xCD":        "CD",
    "CD Single":   "CD",
    "CD+Blu-ray":  "CD",
    "LP":          "Vinyl",
    "LP 180g":     "Vinyl",
    "2xLP":        "Vinyl",
    "2xLP 180g":   "Vinyl",
    "12\"":        "Vinyl",
    "7\"":         "Vinyl",
    "Cassette":    "Cassette",
    "2xCassette":  "Cassette",
    "Headphones":  None,  # not in Discogs db
}


def digits_only(s: str) -> str:
    return re.sub(r"\D", "", s or "")


def smart_title(item: Item) -> str:
    """Catalog Title with edition appended in parens if Edition is set."""
    title = item.title.strip()
    edition = (item.edition or "").strip()
    if edition and edition.lower() not in title.lower():
        return f"{title} ({edition})"
    return title


def build_query(item: Item) -> str:
    """Format(All Caps) Artist(All Caps) Smart Title"""
    fmt = item.fmt.upper()
    artist = item.artist.upper()
    return f"{fmt} {artist} {smart_title(item)}"


# ─── HTTP layer ───────────────────────────────────────────────────────
def cache_path(key: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", key)[:200]
    return os.path.join(CACHE_DIR, safe + ".json")


def discogs_search(params: dict, *, allow_net: bool) -> dict | None:
    """Cached Discogs search. Returns parsed JSON or None on failure."""
    key = urllib.parse.urlencode(sorted(params.items()))
    path = cache_path(key)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    if not allow_net:
        return None

    query_params = dict(params)
    query_params["token"] = TOKEN
    url = f"{BASE_URL}?{urllib.parse.urlencode(query_params)}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code} on {url}", file=sys.stderr)
        # cache the failure as empty so we don't retry hot
        data = {"results": [], "error": f"HTTP {e.code}"}
    except urllib.error.URLError as e:
        print(f"  URL error: {e}", file=sys.stderr)
        return None
    finally:
        time.sleep(SLEEP_SECONDS)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return data


def lookup_item(item: Item, *, allow_net: bool) -> tuple[str, str]:
    """Returns (identifier, barcode).

    identifier = "release/<id>" or "master/<id>" or "" — we prefer release.
    barcode    = digits-only barcode (UPC/EAN) from invoice if numeric,
                 else from Discogs result.
    """
    raw_upc = (item.upc or "").strip()
    invoice_upc_digits = digits_only(raw_upc)
    upc_has_letters = any(c.isalpha() for c in raw_upc)

    # Strategy 1: numeric UPC → barcode search
    result = None
    if invoice_upc_digits and len(invoice_upc_digits) >= 8:
        result = discogs_search(
            {"barcode": invoice_upc_digits, "per_page": 5},
            allow_net=allow_net,
        )

    # Strategy 2: alphanumeric UPC → catalog-number search
    if (not result or not result.get("results")) and raw_upc and upc_has_letters:
        result = discogs_search(
            {"catno": raw_upc, "type": "release", "per_page": 5},
            allow_net=allow_net,
        )

    # Strategy 3: text search with format filter
    if not result or not result.get("results"):
        q_params = {
            "q": f"{item.artist} {smart_title(item)}",
            "type": "release",
            "per_page": 5,
        }
        fmt_filter = DISCOGS_FORMAT.get(item.fmt)
        if fmt_filter:
            q_params["format"] = fmt_filter
        result = discogs_search(q_params, allow_net=allow_net)

    if not result:
        return "", invoice_upc_digits

    hits = result.get("results", []) or []
    if not hits:
        return "", invoice_upc_digits

    top = hits[0]
    type_ = top.get("type", "release")
    rid   = top.get("id")
    identifier = f"{type_}/{rid}" if rid else ""

    # Prefer invoice UPC if present, else Discogs barcode
    barcode = invoice_upc_digits
    if not barcode:
        for b in (top.get("barcode") or []):
            d = digits_only(b)
            if len(d) >= 8:
                barcode = d
                break

    return identifier, barcode


# ─── TSV assembly ─────────────────────────────────────────────────────
HEADER = [
    "Query", "Source", "No", "Artist Name", "Catalog Title", "Format",
    "Edition", "Qty", "UPC/Catalog No.", "AEC Cat", "Total Items Ordered",
    "Weight/PCS (LB)", "Weight/PCS (KG)", "Total Weight (KG)",
    "Shipping Cost", "Forwarder Shipping (IDR)", "Identifier", "Barcode",
]


def fmt_money(currency: str, value: float) -> str:
    return f"{currency}{value:,.2f}"


def build_row(inv: Invoice, idx: int, it: Item, identifier: str, barcode: str) -> list[str]:
    wt_lb = WEIGHT_LB.get(it.fmt)
    if wt_lb is None:
        wt_lb_s = wt_kg_s = tot_kg_s = ""
    else:
        wt_kg = wt_lb * LB_TO_KG
        tot_kg = wt_kg * it.qty
        wt_lb_s = f"{wt_lb:.2f}"
        wt_kg_s = f"{wt_kg:.4f}"
        tot_kg_s = f"{tot_kg:.4f}"

    shipping_cell = fmt_money(inv.currency_symbol, inv.shipping) if idx == 1 else ""
    total_items_cell = str(inv.total_units) if idx == 1 else ""

    return [
        build_query(it),                # A Query
        inv.source,                     # B Source
        str(it.no),                     # C No
        it.artist,                      # D Artist
        it.title,                       # E Catalog Title
        it.fmt,                         # F Format
        it.edition,                     # G Edition
        str(it.qty),                    # H Qty
        it.upc,                         # I UPC/Cat No.
        it.aec,                         # J AEC Cat
        total_items_cell,               # K Total Items Ordered
        wt_lb_s,                        # L Wt/PCS LB
        wt_kg_s,                        # M Wt/PCS KG
        tot_kg_s,                       # N Total Wt KG
        shipping_cell,                  # O Shipping
        "",                             # P Forwarder Ship IDR
        identifier,                     # Q Identifier
        barcode,                        # R Barcode
    ]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None,
                    help="Process only the first N items across all invoices (smoke test).")
    ap.add_argument("--no-net", action="store_true",
                    help="Only use cached responses, never hit the network.")
    args = ap.parse_args()

    rows: list[list[str]] = []
    processed = 0
    found = 0
    missing = []

    for inv in (P19, P12, P18):
        print(f"=== {inv.source} ===")
        for idx, it in enumerate(inv.items, start=1):
            if args.limit is not None and processed >= args.limit:
                break
            processed += 1
            ident, bc = lookup_item(it, allow_net=not args.no_net)
            if ident:
                found += 1
                marker = "✓"
            else:
                marker = "·"
                missing.append((inv.source, it.no, it.artist, it.title))
            print(f"  {marker} #{it.no} {it.artist} — {it.title} → {ident or 'no match'}")
            rows.append(build_row(inv, idx, it, ident, bc))
        if args.limit is not None and processed >= args.limit:
            break

    base = os.path.dirname(OUTPUT_TSV)
    paths = {
        OUTPUT_TSV:                                      ("with",   "legacy alias"),
        os.path.join(base, "discogs_sheet_WITHHEADER.tsv"): ("with", "header included"),
        os.path.join(base, "discogs_sheet_NOHEADER.tsv"):   ("no",   "append-ready"),
    }
    for path, (mode, _label) in paths.items():
        with open(path, "w", encoding="utf-8") as f:
            if mode == "with":
                f.write("\t".join(HEADER) + "\n")
            for r in rows:
                f.write("\t".join(r) + "\n")

    print()
    print(f"Wrote {len(rows)} rows → {OUTPUT_TSV}")
    print(f"Discogs hits: {found}/{processed} ({(found/processed*100 if processed else 0):.0f}%)")
    if missing:
        print(f"Missing matches ({len(missing)}):")
        for src, no, artist, title in missing[:20]:
            print(f"  [{src}] #{no} {artist} — {title}")
        if len(missing) > 20:
            print(f"  …and {len(missing)-20} more")


if __name__ == "__main__":
    main()
