# Back-office × Prototype Merge (v2.2 shell + Dashboard) — Design

**Date:** 2026-07-03 · **Status:** Approved · **Deploy:** LOCAL preview only

## Goal

The production React back-office adopts the prototype's look and functions
(`mockup-dashboard.html`, v2.2 tokens): its shell (grouped sidebar with counts,
user card and theme control; breadcrumb topbar with ⌘K and a primary action)
and its dashboard (tabstrip, greeting, period selector, KPI cards with deltas
and sparklines, revenue chart with previous-period comparison, needs-attention
alerts) — all fed by the live DealPOS mirror. No production deploy this round.

## Decisions (from user)

- Sidebar: **mockup groups + all real pages** — Overview (Home, Dashboard,
  Finance) · Selling (Orders +unpaid-count pill, Inventory, Customers,
  Channels +status dot) · Shop (Purchase Orders, Vouchers) · Marketing
  (Newsletter, Social Media, Blog) · Config (Preferences). **No stub items.**
- Topbar: **real actions** — primary button "Add release"; ⌘K command palette
  searches releases and jumps to pages; bell shows an alert dot.
- Styling source of truth: the mockup's v2.2 tokens (canvas `#0F0F0F` dark /
  `#F0F0F0` light, status tints, chart grid/area tokens, radius scale).

## Scope

**Changed:** `tokens.css` (v2.2 set incl. `--*-t` tints, `--grid`,
`--area-top`, radii, focus, `--ch-*` channel colours), `Sidebar.tsx`,
`Topbar.tsx`, `AppShell.tsx` (palette mount), new `CommandPalette.tsx`,
`Dashboard.tsx` rebuild, `api/ops.ts` gains the `payment` filter param.

**Untouched:** the API (endpoints already provide everything), all other pages
(they inherit tokens), auth, DealPOS sync, deploy scripts.

## Components

- **Sidebar (232px)** — brand lockup (theme-swapped); grouped items with icon,
  label, optional count pill (Orders → live count of `paymentStatus=Unpaid`)
  and status dot (Channels, green); footer user card (initials avatar from the
  logged-in user, name, role) with sign-out and the labelled theme button.
- **Topbar (60px)** — mobile hamburger; breadcrumb "Medium Format / {page}"
  from a route→label map; centered ⌘K trigger styled like the mockup search
  (readonly, opens the palette); bell with red dot when alerts > 0;
  "Add release" primary button → `/inventory/new`.
- **Command palette** — overlay opened by ⌘K/Ctrl-K or clicking the trigger;
  debounced release search via `GET /inventory?q=` (top 8, artist – title,
  price) + static page-jump entries; arrow/enter/escape keyboard control;
  selecting a release opens its edit page.
- **Dashboard** — mockup structure with live data:
  - tabstrip = quick-nav (Dashboard active; Orders, Inventory, Customers,
    Finance, Channels navigate);
  - greeting "Selamat pagi/siang/sore/malam, {firstName}" + date eyebrow +
    live sub-line (unpaid orders count, low-stock count);
  - period selector Today/7D/30D/90D/YTD → drives KPIs, sparklines, chart.
    Delta = current summary vs a second summary over the previous
    equal-length window (client-side; two `/finance/summary` calls);
  - KPI cards: Gross revenue, Orders, Avg ticket (AOV), Gross margin % — each
    with ▲/▼ delta and a sparkline derived from one `/finance/timeseries`
    call (granularity: day ≤30D, week for 90D, month for YTD);
  - Revenue panel: area chart (gradient fill under solid this-period line),
    dashed previous-period line, success-dot on the latest point, stats row
    (This period / Previous / Delta), axis labels;
  - Needs attention: real alerts with severity bars — low stock (warning,
    price figure), unpaid marketplace orders (info, summed amount), DealPOS
    sync errors (danger), quiet state when nothing needs attention.

## Error handling

Every data fetch fails soft (card/pill renders "—" or hides); the palette
shows "no matches"; alert queries cap at 50 rows.

## Testing & preview

Typecheck + build both apps; API tests stay green (no API change); visual
verification dark + light via browser screenshots. Dev servers stay running —
preview at `http://localhost:5173` (admin@mediumformat.id / changeme123).
Production deploy deliberately excluded.
