🤖 AGENTS.md — AI Agent Operating Rules 🎯 Objective You are an autonomous AI software engineer.Your goal is to design, build, debug, and improve this project with clean, production-ready code. Always prioritize:

* Correctness
* Simplicity
* Maintainability
* Performance

🧠 Core Behavior Rules

1. Think Before Acting

* Always analyze the task before writing code
* Break problems into smaller steps
* Avoid unnecessary complexity

1. Code Quality Standards

* Write clean, readable, and modular code
* Use meaningful variable and function names
* Follow consistent formatting
* Avoid duplication (DRY principle)

1. Project Awareness Before making changes:

* Read existing files
* Understand project structure
* Respect current architecture DO NOT:
* Rewrite entire codebases unnecessarily
* Introduce breaking changes without reason

1. File Handling Rules

* Create new files only when necessary
* Update existing files instead of duplicating logic
* Keep file structure organized

🏗️ Architecture Guidelines Frontend (if applicable)

* Use component-based architecture
* Keep components small and reusable
* Separate UI and logic Backend (if applicable)
* Follow MVC or modular structure
* Keep business logic separate from routes
* Validate all inputs

🔐 Security Best Practices

* Never expose API keys or secrets
* Use environment variables
* Validate and sanitize user input
* Prevent common vulnerabilities (XSS, SQL Injection)

⚡ Performance Guidelines

* Avoid unnecessary re-renders or loops
* Optimize database queries
* Use caching when appropriate

🧪 Testing & Debugging

* Write testable code
* Add basic error handling
* Log meaningful debug information

🧩 Task Execution Strategy When given a task:

1. Understand the requirement
2. Check existing implementation
3. Plan minimal changes
4. Implement step-by-step
5. Test the result
6. Refactor if needed

📚 Documentation Rules

* Add comments only where necessary
* Explain complex logic clearly
* Keep README updated if major changes occur

🚫 What to Avoid

* Overengineering
* Unnecessary dependencies
* Hardcoded values
* Ignoring existing patterns

🧠 Context Memory Strategy Use project files as long-term memory:

* README.md → project overview
* AGENTS.md → rules (this file)
* docs/ → detailed documentation Always refer to these before making decisions.

🛠️ Default Tech Stack (if not specified)

* Frontend: React
* Backend: Node.js (Express)
* Database: PostgreSQL
* Styling: Tailwind CSS

🎬 Special Instruction (For Demo / Teaching Projects)

* Prefer simple and clear implementations
* Add explanatory comments for beginners
* Avoid overly complex patterns unless necessary

✅ Output Expectations Every output should be:

* Working
* Clean
* Minimal
* Easy to understand

🔄 Continuous Improvement If you see a better approach:

* Suggest improvement
* Then implement it safely

**🚀** Final Rule Always act like a senior software engineerwho writes code that others can easily understand, use, and scale.

## Backoffice storefront modules (2026-07-12)

New editable-CRUD backoffice modules landed alongside public read APIs and Release-editor integrations. Key surface areas:

- **Purchase Orders** (`/purchase-orders`) — sits above Inventory in the sidebar; editable canonical PO records with a DealPOS seed job (`POST /api/v1/purchase-orders/sync-from-dealpos`). Once a PO leaves DRAFT, sync leaves it alone.
- **Preorders** (`/preorders`) — thin editor over `Release.preorder` + `Release.preorderEta`.
- **Vouchers** (`/vouchers`) — code / kind / value / min-order / window / usage / active; validator lives in `apps/api/src/vouchers/vouchers.validator.ts` and is reused by the public storefront endpoint.
- **Newsletter** (`/newsletter`) — Subscribers + Campaigns tabs. Send action is intentionally stubbed pending Resend / Mailchimp wiring.
- **Storefront (public)** — unauthenticated `GET /api/v1/storefront/releases`, `/preorders`, `/posts` (list + `:slug`), `POST /storefront/newsletter/subscribe`, `POST /storefront/vouchers/validate`. Rate-limited via `@nestjs/throttler`.
- **Release editor** — centered 940px layout, `Get details` (Discogs autofill), `Get media` (Discogs image gallery, re-hosted server-side), per-track preview popover with 4 sources (Apple, Bandcamp, SoundCloud, manual upload) and a "Fetch all previews from…" batch action.

### Env vars

All integrations degrade gracefully if unset — the corresponding endpoint returns 501 with a friendly reason.

- `DISCOGS_TOKEN` — Discogs personal access token (higher rate limit)
- `AWS_S3_BUCKET`, `AWS_S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` — S3 for uploads (falls back to `apps/api/uploads/` served at `/uploads/*`)

iTunes and Bandcamp need no auth.

## POS sales & payments (2026-11-13)

Till sales from the back-office POS are recorded in the **MF database only** (`PosSale`, `PosSaleLine`, `PosPayment`; module `apps/api/src/pos`). Nothing is written to DealPOS.

- `POST /api/v1/pos/sales` (staff): the server re-prices the cart from `Release`, applies the voucher (wins over a manual discount) or the manual discount, adds PPN 11 %, and takes the stock. Numbers look like `POS-YYMMDD-XXXXX` (WIB date).
- **Cash / EDC / DealPOS method** → `PAID` at once. EDC has no terminal integration: the cashier copies the approval code (required), RRN, card last 4 and type from the slip.
- **Xendit** → `PENDING`. The API creates a Xendit **Invoice** (one hosted page for QRIS, VA, e-wallet and card); the register shows it as a QR and polls `GET /pos/sales/:id`. The invoice webhook moves the sale to `PAID`, or `EXPIRED` (stock returned). `POST /pos/sales/:id/void` cancels a sale and returns stock; a sale already paid via Xendit must be refunded in Xendit first.
- Stock caveat: the DealPOS inventory sync overwrites `Release.stock` with DealPOS OnHand, so a POS decrement only lasts until the next sync.

### Xendit setup

Until both keys are set, Xendit endpoints answer 501 and the register shows "Xendit is not set up yet".

- `XENDIT_SECRET_KEY` — secret API key (Xendit dashboard → Settings → API keys; needs Money-in write).
- `XENDIT_CALLBACK_TOKEN` — the callback verification token (Settings → Webhooks).
- In Xendit → Webhooks, set **Invoices paid** to `https://mediumformat.info/api/v1/webhooks/xendit/invoice`.
- Optional `XENDIT_API_URL` (default `https://api.xendit.co`) for tests.

Put the keys in the API stack's `api.env` on the VPS, never in the repo. Test with a `xnd_development_…` key first.
