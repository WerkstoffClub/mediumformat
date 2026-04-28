# Medium Format — Infrastructure & Subscription Budget
**Date:** 2026-04-28
**Version:** 1.0
**Status:** Approved
**Scope:** Full production system — server, plugins, subscriptions
**Stack:** Option A (Managed PaaS) with Dokploy + Hetzner, OpenRouter AI
**Exchange rate reference:** 1 USD ≈ IDR 16,300

---

## 1. One-Time Setup Costs

| Item | USD | IDR | Notes |
|------|-----|-----|-------|
| Domain registration (.com) | $10 | IDR 163,000 | Via Cloudflare Registrar — lowest renewal price, no markup |
| Hetzner account + VPS provisioning | $0 | IDR 0 | Free to create |
| Dokploy installation | $0 | IDR 0 | Open-source, self-hosted on Hetzner VPS |
| Xendit merchant onboarding | $0 | IDR 0 | Requires KTP, NPWP, SIUP — no fee |
| Stripe account | $0 | IDR 0 | Free |
| PayPal Business account | $0 | IDR 0 | Free |
| Biteship account | $0 | IDR 0 | Free |
| Discogs API key | $0 | IDR 0 | Free |
| Spotify Developer app | $0 | IDR 0 | Free |
| YouTube Data API (Google Cloud project) | $0 | IDR 0 | Free quota — no billing until exceeded |
| Meta Business + Commerce API | $0 | IDR 0 | Free, requires business verification |
| eBay Developer account | $0 | IDR 0 | Free |
| Google Merchant Center | $0 | IDR 0 | Free |
| WhatsApp Business verification | $0 | IDR 0 | Via Meta Business Suite — free |
| Fonnte WhatsApp provider setup | $0 | IDR 0 | Free account creation |
| OpenRouter account | $0 | IDR 0 | Free, pay-per-use only |
| **TOTAL SETUP** | **$10** | **IDR 163,000** | Domain is the only day-one cost |

---

## 2. Fixed Monthly Subscriptions

### 2.1 Infrastructure

| Service | Plan | USD/month | IDR/month | Purpose |
|---------|------|----------|----------|---------|
| **Hetzner CX32** | VPS | ~$9 | IDR 147,000 | Runs Dokploy — hosts Next.js storefront + Node.js API + background sync workers. 4 vCPU, 8GB RAM, 80GB NVMe SSD |
| **Hetzner Snapshots** | Usage | ~$2 | IDR 33,000 | Automated VPS backups (~$0.01/GB/month) |
| **Neon** | Launch | $19 | IDR 310,000 | PostgreSQL — 10GB storage, scales to zero when idle |
| **Cloudflare R2** | Usage | ~$8 | IDR 130,000 | File storage: record cover images, PO receipt scans. No egress fees |
| **Upstash Redis** | Free | $0 | IDR 0 | Session cache + job queues. Upgrade at scale |
| **Cloudflare** | Free | $0 | IDR 0 | DNS management, CDN (compensates for no Vercel edge), DDoS protection, SSL certificates |
| **Subtotal** | | **~$38** | **IDR ~620,000** | |

### 2.2 Communication

| Service | Plan | USD/month | IDR/month | Purpose |
|---------|------|----------|----------|---------|
| **Resend** | Free | $0 | IDR 0 | Transactional email: order confirmations, shipping updates. 3,000 emails/month — sufficient at launch. Upgrade to Starter ($20) when order volume demands |
| **Brevo** | Starter | $9 | IDR 147,000 | Newsletter campaigns — 5,000 emails/month. Upgrade to $25 plan when subscriber list exceeds 500 |
| **Fonnte** | Standard | ~$6 | IDR 100,000 | WhatsApp Business broadcast: new arrivals, order notifications |
| **Subtotal** | | **~$15** | **IDR ~247,000** | |

### 2.3 AI

| Service | Plan | USD/month | IDR/month | Purpose |
|---------|------|----------|----------|---------|
| **OpenRouter** | Pay-per-use | ~$3 | IDR 49,000 | Single API key for all AI tasks. Free models (Llama 3.3 70B, Mistral) used for newsletter drafting and subject lines. Claude Haiku or Llama 3.2 Vision for PO invoice PDF parsing |
| **Subtotal** | | **~$3** | **IDR ~49,000** | |

**OpenRouter model routing:**

| Task | Model | Cost |
|------|-------|------|
| Newsletter copy drafting | Meta Llama 3.3 70B (free) | $0 |
| Email subject line generation | Mistral 7B (free) | $0 |
| PO invoice PDF parsing | Llama 3.2 Vision (free) or Claude Haiku 3.5 | ~$0–3 |

### 2.4 Shipping APIs

| Service | Plan | USD/month | IDR/month | Purpose |
|---------|------|----------|----------|---------|
| **Biteship** | Starter | ~$9 | IDR 149,000 | Rate calculation + tracking for all Indonesian couriers (JNE, J&T, SiCepat, Anteraja, GoSend, GrabExpress). 1,000 queries/month |
| **DHL Express API** | Free | $0 | IDR 0 | International rate calculation. No monthly fee — per-shipment charges only |
| **FedEx API** | Free | $0 | IDR 0 | International rate calculation. No monthly fee |
| **Subtotal** | | **~$9** | **IDR ~149,000** | |

### 2.5 Dev & Monitoring (all free)

| Service | Plan | USD/month | Purpose |
|---------|------|----------|---------|
| **GitHub** | Free | $0 | Version control, CI/CD via GitHub Actions |
| **Sentry** | Free | $0 | Error monitoring — 5,000 errors/month, sufficient for v1 |
| **UptimeRobot** | Free | $0 | Uptime monitoring + email/WhatsApp alerts |

---

### Fixed Monthly Total

| Category | USD/month | IDR/month |
|----------|----------|----------|
| Infrastructure | ~$38 | IDR ~620,000 |
| Communication | ~$15 | IDR ~247,000 |
| AI | ~$3 | IDR ~49,000 |
| Shipping APIs | ~$9 | IDR ~149,000 |
| Dev & Monitoring | $0 | IDR 0 |
| **TOTAL** | **~$65/month** | **IDR ~1,065,000/month** |
| **Annual** | **~$780/year** | **IDR ~12,780,000/year** |

---

## 3. Variable & Transaction Fees

These scale with sales volume. Not a fixed monthly cost — budget as a percentage of GMV.

### 3.1 Payment Gateways

| Gateway | Fee | When |
|---------|-----|------|
| **Xendit — Virtual Account** | IDR 4,500 flat | Per domestic VA payment (BCA, BNI, BRI, Mandiri, Permata) |
| **Xendit — E-Wallet** | 1.5% | GoPay, OVO, DANA, ShopeePay, LinkAja |
| **Xendit — QRIS** | 0.7% | Walk-in + online QRIS scan |
| **Xendit — Credit/Debit Card** | 2.9% | Domestic card payments |
| **Xendit — Paylater** | 3–4% | Kredivo, Akulaku |
| **Xendit — Retail** | IDR 5,000 flat | Indomaret, Alfamart |
| **Stripe** | 2.9% + $0.30 | International card, Apple Pay, Google Pay |
| **PayPal** | 3.49% + $0.49 | International PayPal buyers |

### 3.2 APIs with Free Quotas (no cost under normal usage)

| Service | Free Quota | Exceeds at |
|---------|-----------|-----------|
| **YouTube Data API v3** | 10,000 units/day | ~5,000 track lookups/day — well above typical catalog import rate |
| **Spotify Web API** | Unlimited for catalog lookup | No quota concern |
| **Discogs API** | 60 requests/minute (authenticated) | Sufficient for import workflows |
| **Meta Commerce API** | Rate-limited, not metered | No cost |
| **eBay API** | Free standard tier | No cost |
| **Google Merchant Center** | Free | No cost |

---

## 4. Budget-Effective Decisions

Key choices that reduce cost without capability loss:

| Decision | Chosen | Avoided | Monthly Saving |
|----------|--------|---------|---------------|
| **Hosting** | Dokploy on Hetzner CX32 (~$11) | Vercel Pro + Railway (~$35) | ~$24 |
| **File storage** | Cloudflare R2 (no egress fees) | AWS S3 + CloudFront | ~$20–40 |
| **CDN** | Cloudflare free (already in stack) | Vercel edge network (bundled with Pro) | — |
| **WhatsApp** | Fonnte IDR 100k/month | Twilio WABA (~$50/month) | ~$43 |
| **Newsletter** | Brevo Starter ($9) | Mailchimp Essentials ($26 for 500 contacts) | ~$17 |
| **Transactional email** | Resend free tier (3k/month) | SendGrid Essentials ($19.95) | ~$20 |
| **AI** | OpenRouter free models (Llama, Mistral) | Direct Anthropic API ($15+/month) | ~$12 |
| **Domain renewal** | Cloudflare Registrar (~$9/year) | GoDaddy/Namecheap (~$15–18/year) | ~$6/year |
| **Database** | Neon (scales to zero when idle) | Supabase Pro ($25) | ~$6 |
| **Monitoring** | Sentry free + UptimeRobot free | Datadog ($34+/month) | ~$34 |

---

## 5. Upgrade Triggers

Services to stay on free tier and upgrade only when these conditions are hit:

| Service | Upgrade when | To | Cost increase |
|---------|-------------|-----|--------------|
| **Resend** | Orders exceed ~100/month (3k transactional emails) | Starter $20/month | +$20 |
| **Brevo** | Subscriber list > 500 | Business $25/month | +$16 |
| **Upstash Redis** | Job queue depth or session cache misses become a problem | Pay-as-you-go ~$10/month | +$10 |
| **Biteship** | Shipment queries exceed 1,000/month | Business IDR 299,000 (~$18) | +$9 |
| **Neon** | Database storage exceeds 10GB | Scale plan $69/month | +$50 |
| **Hetzner VPS** | CPU or RAM consistently above 80% | CX42 (8 vCPU, 16GB) ~$18/month | +$9 |

---

## 6. Client Pricing (Indonesian Market)

### 6.1 Project Fees — Phased Fixed Price

| Phase | Scope | IDR | USD equiv. |
|-------|-------|-----|-----------|
| **Phase 1 — Foundation** | Inventory + barcode, orders, own website storefront, Xendit + Stripe, Biteship local couriers, Discogs import, track preview player | IDR 45,000,000 | ~$2,760 |
| **Phase 2 — Channels** | Tokopedia + Shopee sync, Meta + eBay + Google Merchant, PayPal, international shipping (DHL/FedEx), purchase orders module | IDR 40,000,000 | ~$2,450 |
| **Phase 3 — Full Platform** | POS mobile app (iOS + Android), wholesale/B2B module, AI newsletter + PO invoice parsing, WhatsApp broadcast, marketing tools | IDR 35,000,000 | ~$2,150 |
| **Total** | Full production as per spec | **IDR 120,000,000** | **~$7,360** |

Payment terms: 50% upfront per phase, 50% on milestone delivery.

### 6.2 Monthly Retainer (Post-Launch)

| Tier | IDR/month | USD equiv. | Includes |
|------|----------|-----------|---------|
| Basic | IDR 2,500,000 | ~$153 | Bug fixes, security patches, server upkeep — up to 8h/month |
| **Standard (recommended)** | **IDR 4,000,000** | **~$245** | Above + minor feature additions — up to 14h/month |

Infrastructure costs (IDR 1,065,000/month) are billed as a pass-through on top of the retainer, or bundled into the Standard tier.

### 6.3 Value Justification

Frame the project cost against ongoing SaaS alternatives the client would otherwise pay:

| Tool replaced by Medium Format | Monthly SaaS cost (IDR) |
|-------------------------------|------------------------|
| Shopify Plus equivalent | IDR 850,000–2,600,000 |
| Tokopedia/Shopee sync tools | IDR 300,000–700,000 |
| Newsletter platform | IDR 200,000–500,000 |
| Shipping aggregator | IDR 149,000 |
| Wholesale portal | IDR 300,000–600,000 |
| **Total SaaS equivalent** | **IDR 1,800,000–5,000,000/month** |

At IDR 120,000,000 one-time, the platform pays for itself in **2–5 years** vs ongoing SaaS — and the client owns it completely with no vendor lock-in.

---

## 7. Summary

| | USD | IDR |
|-|-----|-----|
| **One-time setup** | ~$10 | IDR ~163,000 |
| **Monthly (fixed)** | **~$65/month** | **IDR ~1,065,000/month** |
| **Annual (fixed)** | **~$780/year** | **IDR ~12,780,000/year** |
| **Transaction fees** | % of GMV | % of GMV |
| | | |
| **Client project fee (total)** | **~$7,360** | **IDR 120,000,000** |
| **Client retainer (post-launch)** | **~$245/month** | **IDR 4,000,000/month** |

> All third-party API accounts (Discogs, Spotify, YouTube, Meta, eBay, Google Merchant, Tokopedia, Shopee) are free to register and use within standard rate limits. No setup cost beyond the domain.
