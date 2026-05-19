# Inventory

`/admin/inventory`

## Two tables

- **`Stock`** — current state per `(variantId, locationId)`: `onHand`, `reserved`.
- **`StockMovement`** — append-only journal: every change writes a row with
  `delta`, `reason`, optional `refType`/`refId`, optional `userId`, optional `note`.

A reconciliation invariant: for any `(variant, location)`,
`Stock.onHand == sum(StockMovement.delta where !RESERVE_*)`.

## Reasons

| Reason | Used by |
|---|---|
| `RECEIVING` | Manual goods-in from `/admin/inventory` |
| `SALE` | Order paid → stock reduces |
| `RETURN` | Refund / cancellation → stock returns |
| `ADJUSTMENT` | Manual correction with a note |
| `TRANSFER_IN` / `TRANSFER_OUT` | Movement between Locations |
| `STOCKTAKE` | Variance after a count (MVP-4) |
| `DAMAGE` | Broken sleeve, scratched record |
| `WRITE_OFF` | Lost / unsellable |

## Reservations

- During checkout (website) or cart-add (POS), we increment `Stock.reserved`
  to prevent oversell across channels.
- On payment success → `reserved -= qty`, `onHand -= qty`, write a `SALE`
  movement.
- On cart expiry / cancellation → `reserved -= qty`, no movement.

## Locations seeded

- `loc-store-default` — `Toko Medium Format` (STORE, `isDefault: true`)
- `loc-warehouse-default` — `Warehouse` (WAREHOUSE)

Names can be edited in `/admin/settings` (also `SEED_DEFAULT_LOCATION_NAME` env).
