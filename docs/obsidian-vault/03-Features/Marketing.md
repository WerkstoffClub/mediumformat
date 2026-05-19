# Marketing

`/admin/marketing`

## Promos

`Promo` table. Codes redeemed at `/cart` or applied to a POS order.

| Field | Notes |
|---|---|
| `code` | unique string — case-insensitive in UI, stored as-typed |
| `type` | `PCT` (percent), `FIXED` (IDR off), `FREE_SHIP` |
| `value` | percent (e.g. `0.10`) or IDR amount |
| `minTotalIdr` | minimum order subtotal |
| `startsAt` / `endsAt` | validity window |
| `usageLimit` / `usedCount` | per-code cap |
| `active` | manual kill switch |

## Newsletter — Listmonk

Self-hosted Listmonk runs as its own container (`listmonk` + `listmonk-db`).
Admin UI at `https://mail.mediumformat.info` (basic auth — `LISTMONK_USERNAME`,
`LISTMONK_PASSWORD`).

`lib/integrations/listmonk/client.ts` wraps Listmonk's REST API for:

- list management (newsletter signup on the website creates a Listmonk
  subscriber).
- campaign creation (admin drafts a campaign in our UI; we push it to Listmonk
  for the actual send).

OpenRouter assists with copy — see [[02-Architecture/Integrations]].

## AI assist

`lib/integrations/openrouter/client.ts`.

- Default model: `anthropic/claude-sonnet-4-6` (for high-quality blurbs).
- Bulk model: `openai/gpt-4o-mini` (for cheap translation passes).
- Inputs: Release `rawJson` + staff notes + reference style guides.
- Outputs: short blurb (≤ 280 chars), long blurb (~ 100 words), ID/EN
  translation pair.
