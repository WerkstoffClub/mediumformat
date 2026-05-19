# Customers & CRM

`/admin/customers` and `/admin/messages`.

## Customer record

A customer is a `User` with `role = CUSTOMER` plus a 1:1 `CustomerProfile`:

| Field | Notes |
|---|---|
| `userId` | PK + FK to User |
| `defaultAddressId` | most-used Address |
| `notes` | free text — internal staff notes |
| `vip` | flag — shown on `/admin/orders` |
| `wholesaleApproved` | promotes to `WHOLESALER` access |

## Addresses

`Address` rows (n per User). Indonesian-shaped: `line1`, `line2`, `city`,
`province`, `postal`, `country` (default `ID`).

## Wantlist

`Wantlist` row per `(userId, releaseId | queryJson)`. When a matching Variant
is listed `FOR_SALE`, a notification job (TODO) emails the customer and
sets `notified = true`.

`maxPriceIdr` lets a wantlist row say "I want this LP for ≤ Rp 600.000".

## Messages

Each conversation lives in a `MessageThread` (1:n `Message`).

- `channel`: `WEBSITE` (contact form), `DISCOGS`, `TOKOPEDIA`, `SHOPEE`.
- `externalId`: the channel's thread id (Discogs message id, Tokopedia chat id…).
- `senderRole`: `STAFF` or `CUSTOMER`.
- Attachments stored as JSON manifest pointing at `public/uploads/`.

`/admin/messages` is one inbox across all channels.
