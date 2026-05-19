# Catalog

`/admin/catalog`

## Mental model

```
Release  (a record — Discogs identity)
  ├─ Track (n)
  └─ Product (n)
       └─ Variant (n)   ← the sellable SKU, stock tracked here
```

A single Discogs release (e.g. *Aphex Twin — Selected Ambient Works 85-92, R&S RS 9007*)
can map to many *Products* — typically one per stock arrival. Each Product has
*Variants* split by condition / pressing / colour.

## Import flow

1. Staff pastes a Discogs URL or release ID into `/admin/catalog`.
2. We call `lib/integrations/discogs/client.ts` and cache the response in
   `Release` (`title`, `artistsJson`, `labelsJson`, `year`, `country`,
   `genres`, `styles`, `formatsJson`, `catno`, `extBarcode`, `coverUrl`,
   `rawJson`).
3. `Tracks` rows are created from `rawJson.tracklist`.
4. A `track-resolve` job is enqueued.
5. Staff creates a Product against the Release and one or more Variants.

## Variant fields

| Field | Notes |
|---|---|
| `sku` | unique — usually `MF-{catno}-{seq}` |
| `internalBarcode` | unique — Code128 printed by `lib/barcode/render.ts` |
| `extBarcode` | external (publisher) barcode if known |
| `conditionMedia` / `conditionSleeve` | Goldmine grading |
| `pressingYear`, `color` | for repress / coloured variant |
| `priceIdr`, `wholesalePriceIdr` | gross IDR, PPN-inclusive |
| `weightG` | default 350 (12" LP) |
| `taxRate` | default 0.1100 (PPN 11%) |

## Product status

- `DRAFT` — not visible on website
- `ACTIVE` — on site / can be listed on channels
- `ARCHIVED` — hidden from shop but kept for order history integrity
