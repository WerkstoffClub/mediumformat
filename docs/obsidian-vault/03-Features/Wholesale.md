# Wholesale

`/wholesale` — MVP-4.

## Who gets access

- `User.role = WHOLESALER`
- `CustomerProfile.wholesaleApproved = true` (toggled by admin)

Staff promote a customer via `/admin/customers`.

## Pricing

Every `Variant` can carry `wholesalePriceIdr`. When a `WHOLESALER` views the
site, that price replaces `priceIdr`. If `wholesalePriceIdr` is null, fall back
to `priceIdr`.

## Catalog filtering

Wholesale catalog shows only `Product.status = ACTIVE` items with stock at
the `WAREHOUSE` location (not the storefront).

## Minimum order

Configured per `Setting`:

- `wholesale.min_order_idr` — e.g. `Rp 1.500.000`
- `wholesale.min_units` — e.g. `10`

Both enforced at `/cart`.
