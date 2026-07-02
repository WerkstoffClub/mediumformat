#!/usr/bin/env python3
"""Push a TSV file directly to a tab on the Medium Format Google Sheet.

Reuses OAuth creds from the Discogs Crawler project.

Usage:
  python3 push_to_sheet.py <tsv_file> <tab_name> [--mode overwrite|append]

Examples:
  # Overwrite PURCHASED with the WITHHEADER file
  python3 push_to_sheet.py ALL_combined_WITHHEADER.tsv PURCHASED --mode overwrite

  # Append the NOHEADER file to Discogs
  python3 push_to_sheet.py discogs_sheet_NOHEADER.tsv Discogs --mode append
"""
from __future__ import annotations
import argparse, csv, os, sys

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

SHEET_ID = "1bh08UB_uPxyT6jwR0DKmnfUVuk_yp3c1ZiloWpc57UU"
CREDS_DIR = "/Users/sonatsu/Documents/Projects/AI Agents/Antigravity/Discogs Crawler"
TOKEN_PATH = os.path.join(CREDS_DIR, "token.json")
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]


def get_service():
    creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        with open(TOKEN_PATH, "w") as f:
            f.write(creds.to_json())
    return build("sheets", "v4", credentials=creds)


def read_tsv(path: str) -> list[list[str]]:
    with open(path, encoding="utf-8") as f:
        reader = csv.reader(f, delimiter="\t")
        return [row for row in reader if row]


def resolve_tab(svc, want: str) -> tuple[int, str]:
    """Find a tab by case-insensitive match. Returns (sheetId, exact title)."""
    meta = svc.spreadsheets().get(spreadsheetId=SHEET_ID).execute()
    tabs = [(s["properties"]["sheetId"], s["properties"]["title"])
            for s in meta["sheets"]]
    for sid, title in tabs:
        if title.lower() == want.lower():
            return sid, title
    raise SystemExit(f"Tab '{want}' not found. Available: {[t for _, t in tabs]}")


def find_last_data_row(svc, tab_title: str) -> int:
    """1-indexed last row containing any value in column A. Returns 0 if empty."""
    rng = f"'{tab_title}'!A:A"
    resp = svc.spreadsheets().values().get(
        spreadsheetId=SHEET_ID, range=rng
    ).execute()
    values = resp.get("values", [])
    return len(values)


def push(tsv_path: str, tab_name: str, mode: str):
    rows = read_tsv(tsv_path)
    if not rows:
        raise SystemExit(f"TSV {tsv_path} is empty")

    svc = get_service()
    sheet_id, tab_title = resolve_tab(svc, tab_name)
    print(f"Target: '{tab_title}' (sheetId={sheet_id}) — {len(rows)} rows from {os.path.basename(tsv_path)}")

    if mode == "overwrite":
        clear_range = f"'{tab_title}'!A:ZZ"
        svc.spreadsheets().values().clear(
            spreadsheetId=SHEET_ID, range=clear_range, body={}
        ).execute()
        start_row = 1
        print(f"  Cleared '{tab_title}'")
    elif mode == "append":
        last = find_last_data_row(svc, tab_title)
        start_row = last + 1
        print(f"  Last data row in col A: {last}; appending from row {start_row}")
    else:
        raise SystemExit(f"Unknown mode: {mode}")

    target_range = f"'{tab_title}'!A{start_row}"
    body = {"values": rows}
    result = svc.spreadsheets().values().update(
        spreadsheetId=SHEET_ID,
        range=target_range,
        valueInputOption="USER_ENTERED",
        body=body,
    ).execute()
    print(f"  Wrote {result.get('updatedCells', 0)} cells across "
          f"{result.get('updatedRows', 0)} rows × "
          f"{result.get('updatedColumns', 0)} cols → {result.get('updatedRange')}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("tsv", help="TSV file path (relative to cwd ok)")
    ap.add_argument("tab", help="Sheet tab name, e.g. PURCHASED")
    ap.add_argument("--mode", choices=["overwrite", "append"], default="append",
                    help="overwrite = clear tab first then write at A1. "
                         "append = write below last data row in column A. "
                         "Default: append.")
    args = ap.parse_args()

    tsv_path = args.tsv if os.path.isabs(args.tsv) else os.path.abspath(args.tsv)
    if not os.path.exists(tsv_path):
        raise SystemExit(f"TSV not found: {tsv_path}")
    push(tsv_path, args.tab, args.mode)


if __name__ == "__main__":
    main()
