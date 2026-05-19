# Shipping

## Domestic — Biteship

Biteship is an Indonesian shipping aggregator that fronts JNE, J&T, SiCepat,
Ninja Xpress, AnterAja, Lion Parcel, Pos Indonesia and Gojek/Grab Instant.

We use:

- **Rates** (`POST /v1/rates/couriers`) at checkout to show the customer
  available couriers + ETA + price.
- **Order create** to generate the AWB + label.
- **Tracking webhook** to update `Shipment.status`.

`BITESHIP_API_KEY` is the auth header. Webhook signature is verified against
`BITESHIP_WEBHOOK_TOKEN`.

## International + marketplaces — `ShippingPolicy`

For non-domestic and for marketplaces that don't accept Biteship rates inline,
we maintain a `ShippingPolicy` table keyed by `(channel, region, formatWeightClass)`:

| Column | Example |
|---|---|
| `channel` | `WEBSITE`, `DISCOGS`, `TOKOPEDIA`, `SHOPEE` |
| `region` | `ID`, `SE_ASIA`, `ASIA`, `EU`, `US`, `ROW` |
| `formatWeightClass` | `LP`, `2LP`, `12_INCH`, `7_INCH`, `CD`, `CASSETTE` |
| `baseIdr` | flat IDR base |
| `perKgIdr` | additional per kg |
| `currency` | usually `IDR`; Discogs forces marketplace currency |

The Discogs marketplace currency is configurable in `.env`:
`DISCOGS_MARKETPLACE_CURRENCY=IDR`.

## Weight classes

Default weights (override per Variant via `weightG`):

| Format | Default g |
|---|---|
| LP (single) | 350 |
| 2LP | 600 |
| 12" single | 300 |
| 7" single | 100 |
| CD | 100 |
| Cassette | 80 |

Sleeve/mailer overhead is added in the rate calc, not stored on the Variant.
