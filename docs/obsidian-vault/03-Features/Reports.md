# Reports

`/admin/reports`

Capabilities: `reports.sales` (STAFF+) and `reports.financial` (ADMIN only).

## MVP-3 sales reports

- **Sales by channel** — daily / monthly / YTD; bar chart per `Channel.name`.
- **Top sellers** — Variants ranked by `SUM(OrderItem.qty)` over a window.
- **AOV** (average order value) — `AVG(Order.total)` per channel.
- **Sell-through** — units sold / units in `Stock` over window.

## MVP-4 financial reports

- **COGS** — per Variant: average buy-in tracked via `StockMovement` notes
  (TODO: dedicated `costIdr` column on `StockMovement` for `RECEIVING`).
- **Channel margin** — `Order.total - Order.channelFeeAmount - Order.paymentFeeAmount - COGS`.
- **Tax (PPN 11%)** — sum of `Order.tax` for the period.
- **Cashbox variance** — `PosSession.closingCount` − expected based on
  `Payment{gateway: "CASH"}` in window.

## Implementation note

Reports are read-only queries against the OLTP DB. If volume becomes a
problem, the path is: nightly materialised views, then a read replica, then
a warehouse. We're nowhere near that yet.
