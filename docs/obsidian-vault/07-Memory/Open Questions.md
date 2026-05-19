# Open Questions

Things we know we'll need to decide. Resolve, then move to [[06-History/Decisions]].

## Q-007 · Staging environment

- Today: single production VPS, no staging.
- Question: do we want a staging environment? Cheapest approach: second
  small VPS running the same compose stack from a `staging` branch, with
  its own `staging.mediumformat.info` subdomain. Or skip it and rely on
  local dev + careful PRs.

## Q-006 · Deploy notifications

- Today: GHA emails the committer on workflow failure. No success
  notifications.
- Question: post to Slack / Discord on deploy success + failure? Worth it
  once there's a team. For a one-developer project, email is fine.

## Q-005 · Image storage

- Today: local `public/uploads/` mounted into both `app` and `worker`.
- Question: when do we move to R2/S3? Threshold ≈ 10 GB or before
  cross-region read latency hurts.

## Q-004 · Currency display for international buyers

- Discogs marketplace currency is forced via `DISCOGS_MARKETPLACE_CURRENCY`
  (IDR by default).
- Question: do we offer a USD/EUR display toggle on the public site?
  Probably no — Indonesian customers are 90%+ — but parking the question.

## Q-003 · Discount strategy for wholesale

- Static `Variant.wholesalePriceIdr` per variant is rigid.
- Alternative: percentage discount at checkout time keyed on
  `WHOLESALER` role. Less DB writes when prices change.

## Q-002 · Pre-orders

- Not modelled yet. Probably a `ProductStatus.PRE_ORDER` plus
  `Product.releaseAt` DateTime, with a separate `reserved-preorder` bucket
  so we don't oversell pre-orders.

## Q-001 · Multi-warehouse transfer UI

- Data model already supports it (`TRANSFER_IN`/`TRANSFER_OUT` movements).
- Question: how does staff initiate a transfer? Probably a `/admin/inventory/transfers`
  page — designs TBD.
