# Orders & Payments

`/admin/orders` aggregates orders from **all channels**: WEBSITE, POS, DISCOGS,
TOKOPEDIA, SHOPEE.

## Order lifecycle

```
DRAFT ─► PENDING_PAYMENT ─► PAID ─► PACKED ─► SHIPPED ─► COMPLETED
                       │                              │
                       └─► EXPIRED / CANCELLED        └─► REFUNDED
```

State transitions are owned by route handlers / webhook handlers — never by
the UI directly. The UI calls server actions; those write audit log entries.

## Money columns on `Order`

| Field | Notes |
|---|---|
| `subtotal` | sum(`unitPriceIdr * qty`) before discount |
| `tax` | usually 0 — most catalog prices are PPN-inclusive |
| `shippingFee` | Biteship quote at checkout time |
| `discount` | promo + manual |
| `channelFeeAmount` | what Discogs / Tokopedia / Shopee took |
| `paymentFeeAmount` | Xendit MDR (for reporting margin honestly) |
| `total` | what the customer paid |

## Payments

`Payment` rows can be many-per-order (split tender, top-up after partial
refund).

| `gateway` | Notes |
|---|---|
| `XENDIT` | Online — QRIS, OVO, GoPay, VA, cards. `gatewayRef` = invoice id |
| `CASH` | POS cash |
| `BANK_TRANSFER` | Manual BCA/Mandiri confirmation |
| `POS_CARD` | Out-of-band card terminal |

## Xendit webhook

`/api/webhooks/xendit` (POST) verifies `X-CALLBACK-TOKEN` header against
`XENDIT_WEBHOOK_TOKEN`. On `invoice.paid`:

1. Find `Payment` by `gatewayRef`.
2. Mark `status = PAID`, set `paidAt`.
3. Promote `Order.status` from `PENDING_PAYMENT` → `PAID`.
4. Convert reservations to `SALE` `StockMovement`s.
5. Enqueue Biteship label creation if shipping is required.

## Shipping

`Shipment` per `Order` (1:n — split shipments allowed).

| Status | Set by |
|---|---|
| `PENDING` | `Order.status = PAID` |
| `LABEL_CREATED` | Biteship order create response |
| `PICKED_UP` | Biteship webhook |
| `IN_TRANSIT` | Biteship webhook |
| `DELIVERED` | Biteship webhook |
| `RETURNED` | Biteship webhook |
| `CANCELLED` | Manual or Biteship cancellation |

Biteship is an aggregator — `Shipment.courier` is the chosen courier
(JNE / J&T / SiCepat / Ninja / etc.), `service` is the service code.
