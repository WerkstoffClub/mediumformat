# POS Development — Preparation Notes

**Date:** 2026-07-02 · **Status:** Groundwork in place; development not started

## What already exists to build on (as of today)

- **Production stack** at mediumformat.info: Caddy (behind shared Traefik) routing
  `/` → prototype, `/backoffice/` → React SPA, `/api/v1/` → NestJS API + Postgres 16
  (compose stack in `deploy/docker/`, app deploys via `deploy-app.sh`).
- **Live product catalogue**: 713 releases with price, cost, stock, barcode/SKU
  (`catNumber`), format (incl. CASSETTE) — synced from DealPOS and refreshable via
  `POST /api/v1/dealpos/sync`.
- **Payment methods** mirrored from DealPOS (12, incl. EDC banks, QRIS variants,
  Bank Transfer, **Saldo Tiktok**, **Shopee**) in `DpPaymentMethod`.
- **Auth** with roles (ADMIN/MANAGER/SHOPKEEPER) — SHOPKEEPER is the POS operator role.
- **Design contract**: `mockup-pos.html` + `mockup-pos-checkout.html` (+ mobile) — the
  approved UX, including the payment family structure:
  EDC terminal · Xendit gateway · **Marketplace balance (Saldo TikTok / ShopeePay)** · Cash.

## Suggested build order (each phase = its own brainstorm → spec → plan)

1. **Sale domain** — `Sale`/`SaleLine`/`SalePayment` Prisma models writing against
   `Release` stock (decrement on completion, restore on void); sale number series
   per outlet/day like DealPOS (`YY.MM.NNNNN`).
2. **POS API** — cart pricing, barcode lookup (`GET /inventory?q=` already matches
   barcode/SKU), payment capture per family, receipt payload; shift open/close later.
3. **POS UI** — new `apps/pos` (or `/pos` route group in backoffice) following the
   mockups; keyboard-first + barcode-scanner-first input.
4. **Write-back strategy** — decide whether the POS *replaces* DealPOS selling
   (Medium Format becomes source of truth; DealPOS sync flips to export/off) or
   runs alongside during a transition (then sales must ALSO push to DealPOS via
   `POST /api/v3/Invoice` to keep its stock true — riskier, needs idempotency).
   **This is the key open decision — settle it before phase 1.**
5. **Payments** — EDC flow is manual-confirm (record method + approval code);
   Xendit needs an account + API keys (create payment / QRIS webhooks);
   marketplace balances are record-only (settled on platform).

## Open questions for the user

- Replace DealPOS at the register, or run in parallel first? (see #4)
- Xendit account status (needed for QRIS/VA/e-wallet at the counter)?
- Receipt printing hardware (ESC/POS thermal? which model) and barcode scanner?
