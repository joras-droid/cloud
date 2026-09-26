# Ghar Ko Swad — Build Spec v0.2

> v0.2 incorporates your decisions: Nepal/NPR, manual Yango delivery, QR **or** cash on delivery, English + Nepali from day one, self-hosted on a VPS with Docker, placeholder brand assets.

---

## 1. What we are building

A cloud kitchen ordering site with two faces:

1. **Storefront** — customers browse a bilingual menu, add to cart with near-zero friction, check out, pay by scanning a QR (uploading the payment screenshot) or choose cash on delivery, then leave a review after the food arrives.
2. **Admin panel** — the kitchen manages menu items, prices, photos/videos, orders, payment verification, manual Yango dispatch, review moderation, and self-authored "story" sections (recipes, how it's made, the organic-sourcing angle).

Two guiding constraints, in priority order:

- **Speed is a feature.** Browsing and adding to cart must feel instant on a mid-range Android phone on 4G in Kathmandu.
- **The kitchen runs the site.** The admin must never need a developer to add a dish, change a price, or publish a new highlight section.

### Non-goals for v1

No loyalty program, no multi-outlet support, no rider tracking app, no POS integration, no automated payment-gateway callbacks, and **no Yango API integration** — dispatch is a manual form, by your decision.

---

## 2. Tech stack (locked)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16.3, App Router, React 19, TypeScript strict** | Server Components ship the menu as near-static HTML with almost no JS. One codebase for storefront + admin + API. |
| Styling | **Tailwind CSS v4 + CSS design tokens** | Zero runtime cost. Tokens mean the placeholder brand can be swapped later without touching components. |
| Database | **PostgreSQL 17 in Docker**, on the same VPS | Local socket beats a managed DB's network hop, and it's free. Money and orders are relational. |
| ORM | **Drizzle ORM + drizzle-kit** | Typed SQL, reviewable migrations, no hidden N+1s. |
| Cart | **Zustand + `persist` to localStorage** | The core performance bet — see §5. |
| i18n | **next-intl**, locales `en` / `ne` | Routing, message catalogs, and locale-aware formatting. See §12. |
| Validation | **Zod v4**, one schema shared by form, server action, and DB insert | Stops client/server validation drift. |
| Auth (admin) | Signed **JOSE** JWT session cookie + bcrypt | Small trusted staff set; no third-party auth dependency to self-host. |
| Auth (customer) | **Guest checkout by phone**, OTP only for COD | A signup wall before checkout is the biggest conversion killer in food ordering. |
| Media | **Cloudflare R2** + presigned direct uploads | Free egress, and it keeps big media off a small VPS. |
| Cache/limits | **Redis** in Docker | Rate limiting, OTP storage, ISR cache when we scale past one container. |
| Edge/CDN | **Cloudflare proxy** in front of the VPS | Cloudflare has a Kathmandu PoP — this is what recovers the edge performance we give up by self-hosting. Load-bearing, not optional. |
| Reverse proxy | **Caddy** in Docker | Automatic Let's Encrypt TLS, HTTP/3, trivial config. |
| Deploy | **GitHub Actions → GHCR → Docker Compose on VPS** | Reproducible image builds; the VPS only pulls and restarts. |
| SMS | **Sparrow SMS** (Nepal) | Order status and COD OTP. SMS beats email in this market. |
| Monitoring | Sentry (SaaS free tier) + Uptime Kuma container | We need real field error data; self-hosting Sentry isn't worth the RAM. |
| Testing | Vitest + Playwright on the checkout path | Checkout is the one flow that must never silently break. |

### VPS sizing and region

**2 vCPU / 4 GB RAM / 80 GB SSD, Ubuntu 24.04 LTS, in Singapore or Mumbai** (Vultr, DigitalOcean, or Linode — roughly $24/month). Nepali ISPs route to Singapore and Mumbai with the lowest latency; a European host like Hetzner would add 250 ms+ and is disqualified despite the price. That box handles well past 1,000 orders/day for this workload.

---

## 3. Performance budget (enforced in CI)

Pass/fail gates, not aspirations.

| Metric | Budget |
|---|---|
| Menu LCP (4G, mid-range Android) | **< 1.5 s** |
| TTFB on Cloudflare-cached menu | **< 200 ms** |
| JS shipped on menu route | **< 120 KB** gzipped |
| Add-to-cart interaction | **< 50 ms**, zero network |
| CLS | **< 0.05** |
| Lighthouse mobile Performance | **>= 95** |

How we hold them: static render + ISR; only the cart button and drawer are client islands; images capped at 1200px and served as AVIF from R2 via Cloudflare; no third-party script on the storefront without sign-off; fonts self-hosted with `size-adjust`.

**Self-hosting changes the caching story.** Without Vercel's edge we cache HTML at Cloudflare using `s-maxage`, and publishing from the admin issues a **purge-by-URL** (Cloudflare's free tier has no cache-tag purge — Enterprise only). That's workable because we always know exactly which URLs a menu or section change affects.

**The Devanagari font is a real trap.** Noto Sans Devanagari is heavy. We subset it and split the `@font-face` by `unicode-range` so English visitors never download a byte of it. Getting this wrong costs more than every other optimization combined.

---

## 4. Information architecture

Locale prefix is `as-needed`: English stays at `/menu`, Nepali is `/ne/menu`.

### Storefront

```
/                      Home — hero, featured items, admin-authored sections
/menu                  Full menu, category rail, filters
/menu/[category]       Category view
/item/[slug]           Item detail — gallery, recipe video, ingredient story, reviews
/cart                  Cart review (drawer on desktop, page on mobile)
/checkout              Contact, delivery area, payment method choice
/checkout/payment      QR display + screenshot upload (QR path only)
/order/[code]          Order status tracker — public, code is the key
/order/[code]/review   Tokenized review form, opens after delivery
/story                 Sourcing / organic story, composed of admin-built sections
```

### Admin (`/admin`, auth-gated, `noindex`)

```
/admin                 Dashboard — today's orders, revenue, pending payments/reviews
/admin/orders          Live order board (kanban by status)
/admin/orders/[id]     Detail, screenshot viewer, verify/reject, Yango dispatch form
/admin/menu            Item list, drag-to-reorder, inline price, sold-out toggle
/admin/menu/[id]       Item editor — bilingual fields, variants, modifiers, media
/admin/media           Media library, upload, alt text
/admin/sections        Highlight-section builder (§9)
/admin/reviews         Moderation queue
/admin/settings        Hours, delivery zones, fees, QR images, COD rules, banner
/admin/staff           Admin users, roles, audit log
```

---

## 5. The add-to-cart experience (the core UX bet)

**Adding to cart never touches the network.** Cart is client state persisted to `localStorage`, sent to the server exactly once — at checkout, where prices are recomputed server-side.

A server round-trip per add costs 200–600 ms on Nepali mobile data. A user adding four items feels that four times. Local state makes it instant and keeps the site usable through a dead zone.

- Every card has a `+` that morphs in place into a `−  1  +` stepper. No modal, no navigation, no scroll jump.
- Items with required modifiers open a bottom sheet with a sane default preselected, so it's one tap to confirm.
- A sticky bar appears on first add: "3 items · Rs 940 · View cart". The only persistent chrome.
- Cart survives refresh and return visits. On load we reconcile against live prices and surface "Chicken Momo is now Rs 280 (was Rs 260)" instead of silently changing the total. Sold-out items are flagged, not auto-removed — the user decides.

**Server-side price re-validation at checkout is non-negotiable.** The client total is a display value; the order total is computed fresh from the DB inside a transaction. Tampered localStorage must never produce a Rs 1 order.

---

## 6. Order, payment, and delivery flow

Two payment paths diverge at checkout.

### QR path

```
Checkout ──▶ validate + recompute prices ──▶ order created (pending_payment)
             order_code generated: GKS-4F7Q
         ◀── show QR + "put GKS-4F7Q in the remark"
Scan & pay in bank app
Upload screenshot ──▶ presigned R2 upload ──▶ payment_submitted ──▶ admin verifies
         ◀── SMS "Order confirmed" ◀── confirmed ──▶ preparing ──▶ ready
Admin books Yango manually, records rider name + phone ──▶ out_for_delivery
         ◀── SMS with rider contact, then review link after delivered
```

### COD path

```
Checkout (COD) ──▶ SMS OTP to verify the phone number ──▶ order created (pending_confirmation)
              ──▶ admin confirms on the board ──▶ confirmed ──▶ (same kitchen flow)
Rider collects cash ──▶ admin marks payment collected at delivered
```

### Status machine

Illegal transitions are rejected in the service layer, not merely hidden in the UI.

```
pending_payment ──▶ payment_submitted ──▶ confirmed
        ▲                  │                  │
        └─ payment_rejected┘                  │
pending_confirmation ─────────────────────────┤
                                              ▼
                                  preparing ──▶ ready ──▶ out_for_delivery ──▶ delivered
anything before `preparing` ──▶ cancelled
```

### Decisions worth your attention

- **The order row is created before payment.** It has to be, because it generates `order_code`, which the customer types as the payment remark — that code is the only thing linking a screenshot to an order. A `pending_payment` order is not in the kitchen queue and not counted as revenue. Unpaid orders auto-expire after 45 minutes.
- **`order_code` is short and human-readable** (`GKS-4F7Q`), from an unambiguous alphabet (no O/0, I/1). It gets read aloud over the phone, and it's long enough that order pages can't be enumerated.
- **Every line item stores a price snapshot.** Raising the momo price tomorrow must not alter yesterday's order. This is the most common bug in ordering systems.
- **Screenshots upload browser → R2 directly** via presigned URL; the image never passes through our server. Limits: 8 MB, JPEG/PNG/WebP/HEIC sniffed by magic bytes rather than extension, EXIF stripped, private bucket, admin views via short-lived signed URL. We hash each file and warn if the same screenshot is submitted twice.
- **Rejection is a first-class path.** Admin picks a reason (wrong amount / unreadable / duplicate / not received); the customer sees it on the status page and can re-upload.
- **COD requires phone OTP.** Without it you will get prank orders, and a cloud kitchen eats the food cost. The QR path stays frictionless — OTP is COD-only. Backed by a configurable COD cap (default Rs 3,000) and a phone blocklist for no-shows.

### Delivery: manual Yango

There is no API. Dispatch is a form on the order detail page where the admin records **rider name, rider phone, and an optional Yango booking reference**, which flips the order to `out_for_delivery` and SMSes the rider's contact to the customer. Everything lands in a `deliveries` table, so if Yango ever opens a business API it slots in behind the same shape with no schema change.

**Delivery fees are zone-based flat rates, not distance-based.** Yango's cost varies by distance and is unknowable at checkout, so the customer picks their **area from a dropdown** with a fee attached, and the kitchen absorbs the variance. Zones and fees are editable in settings.

This also solves addressing: Kathmandu addresses are landmark-based and largely un-geocodable, so a free-text landmark plus an area dropdown beats a map pin for reliability. We still offer an optional "share my location" GPS pin, because it genuinely helps the rider find the door.

---

## 7. Reviews and moderation

- Review link goes out by SMS after `delivered`: `/order/[code]/review?t=<token>`. Single-use, scoped to that order, expires in 14 days, **no login** — a login wall here kills the review rate.
- One overall rating (1–5), optional per-item ratings, free text, up to 3 photos.
- **Every review lands as `pending` and stays invisible until approved.** Aggregate ratings count approved reviews only, enforced at the query layer so no view can leak a pending review.
- Admin can approve, reject with an internal note, or post a public reply. Admins **cannot edit review text** — editing a customer's words is a reputational liability if it ever surfaces.
- Because each review is tied to a real delivered order, we show a **"Verified order"** badge. That's a genuine trust advantage over open review forms.
- Abuse controls: rate limit per IP and per phone, honeypot field, Cloudflare Turnstile if spam appears.

---

## 8. Menu management

The item editor covers bilingual name and description, slug, category, base price, variants (Half/Full), modifier groups (spice level, add-ons with price deltas), veg/non-veg, spice rating, prep time, availability (`draft` / `published` / `sold_out`), gallery, recipe video, ingredient story, and SEO fields.

Operational details that matter more than they look:

- **Sold-out is one tap from the list view.** At 8pm on a busy night nobody opens a detail page.
- **Drag to reorder** items and categories — merchandising order drives revenue.
- **Publishing purges the Cloudflare cache for the affected URLs** and calls `revalidateTag('menu')`, so a price change is live in seconds with no rebuild.
- Deleting an item that appears in past orders **soft-deletes**. Order history must stay intact.

---

## 9. Admin-authored highlight sections

A **block-based page builder**, because "sections the admin creates on their own" can't be hardcoded components.

A **Section** has bilingual title/subtitle, a layout, a theme, a page assignment (home / story / item), sort order, and publish state. It contains ordered **Blocks**, each with a `kind` and a JSONB `payload` validated by a per-kind Zod schema.

v1 block kinds: `rich_text`, `image`, `gallery`, `video` (recipe / how-it's-made), `item_carousel` (references live menu items so prices stay accurate), `stat_strip` ("100% organic · 12 local farms · 0 preservatives"), `quote`, `ingredient_story` (the organic-secret angle), `steps`, `faq`.

Layouts are a **fixed set of presets** (`full_bleed`, `split_left`, `split_right`, `grid_3`, `carousel`) and themes come from design tokens. The admin never enters raw HTML or CSS — that would be an XSS hole and the site would drift off-brand within a month. A genuinely new layout is a small dev task to add one preset, which is the right trade.

Every section gets a **draft preview URL** so it can be checked before publishing.

---

## 10. Data model

```
categories          id, slug, name_en, name_ne, sort_order, is_active
menu_items          id, slug, category_id, name_en, name_ne, desc_en, desc_ne,
                    base_price, is_veg, spice_level, prep_minutes, status,
                    sort_order, hero_media_id, seo_title, seo_desc, deleted_at
item_variants       id, item_id, label_en, label_ne, price_delta, is_default, sort_order
modifier_groups     id, name_en, name_ne, min_select, max_select, is_required
modifiers           id, group_id, name_en, name_ne, price_delta, is_available
item_modifier_grps  item_id, group_id, sort_order

media               id, kind, r2_key, mime, width, height, blurhash, duration_s,
                    alt_en, alt_ne, caption_en, caption_ne, file_hash, uploaded_by
item_media          item_id, media_id, role(gallery|recipe|process), sort_order

customers           id, phone(unique), name, email, phone_verified_at, is_blocked
delivery_zones      id, name_en, name_ne, fee, is_active, cod_allowed, sort_order

orders              id, order_code(unique), customer_id, status, payment_method,
                    zone_id, address_line, landmark, lat, lng, locale,
                    subtotal, delivery_fee, discount, total, notes,
                    placed_at, expires_at, cancelled_reason
order_items         id, order_id, item_id, name_snapshot, unit_price_snapshot, qty,
                    variant_snapshot jsonb, modifiers_snapshot jsonb, line_total
order_events        id, order_id, from_status, to_status, actor, note, created_at

payments            id, order_id, method(fonepay|esewa|khalti|bank|cod), amount,
                    screenshot_media_id, payer_name, payer_phone, txn_ref,
                    status(pending|submitted|verified|rejected|collected),
                    reject_reason, verified_by, verified_at
deliveries          id, order_id, rider_name, rider_phone, yango_ref,
                    dispatched_by, dispatched_at, delivered_at

reviews             id, order_id, item_id(null), customer_id, rating, body,
                    status(pending|approved|rejected), admin_note,
                    moderated_by, moderated_at, published_at
review_media        review_id, media_id
review_replies      id, review_id, body_en, body_ne, author_id, created_at

sections            id, slug, title_en, title_ne, subtitle_en, subtitle_ne,
                    layout, theme, page_scope, sort_order, is_published
blocks              id, section_id, kind, payload jsonb, sort_order

store_settings      singleton: open_hours, min_order, cod_enabled, cod_max,
                    qr_images jsonb, banner_en, banner_ne, is_accepting_orders
admin_users         id, email, password_hash, role(owner|manager|staff)
audit_log           id, actor_id, entity, entity_id, action, diff jsonb, created_at
otp_codes           phone, code_hash, purpose, expires_at, attempts   (Redis, not PG)
```

Money is stored as **integer paisa**, never float. Timestamps are `timestamptz` in UTC, rendered in `Asia/Kathmandu`.

---

## 11. Security

- Admin routes are protected by middleware **and** a server-side session check inside every action — middleware alone is not an authorization boundary.
- Roles: `staff` moves order status; `manager` verifies payments and edits the menu; `owner` manages users and settings.
- Server Actions re-validate with Zod and re-check authorization. Never trust a client-supplied price, total, or status.
- Uploads are presigned, size/MIME-capped, magic-byte sniffed, EXIF-stripped, in a private bucket with short-TTL signed reads.
- Rate limits (Redis) on checkout, OTP, upload, and review endpoints.
- Full audit log on every price change, payment verification, and review moderation.
- PII is limited to phone numbers and addresses. **No card data ever touches us** — a real benefit of the QR approach.
- VPS hardening: SSH keys only, `ufw`, `fail2ban`, unattended security upgrades, Postgres bound to the Docker network and never exposed publicly, containers running as non-root.

---

## 12. Bilingual (English + Nepali) from day one

- `next-intl` with `localePrefix: 'as-needed'` — English at `/menu`, Nepali at `/ne/menu`. A language switch preserves the current path.
- **UI strings** live in `messages/en.json` and `messages/ne.json`. **Content** is bilingual columns in the DB. If a Nepali field is empty we fall back to English rather than showing a blank — the admin editor flags missing translations instead of blocking a save, so adding a dish at 8pm is never gated on translation.
- **Prices use Western digits in both locales** (Rs 280, not रु २८०). Devanagari numerals for money invite misreading at the point of payment; the currency label is what gets localized.
- Dates render in AD with Nepali month names. Bikram Sambat is a later option if you want it.
- `hreflang` alternates on every page, both locales in the sitemap, and `lang` set correctly on `<html>` for screen readers.
- Font strategy per §3: subset Noto Sans Devanagari, split by `unicode-range` so English visitors download none of it.

---

## 13. Accessibility & branding

WCAG 2.1 AA: keyboard-navigable cart and stepper, visible focus rings, 4.5:1 contrast, live-region announcements on add-to-cart, and alt text **required** on admin uploads — enforced in the form, not suggested.

Brand assets are placeholders for now, so everything routes through CSS design tokens (color, radius, spacing, type scale) and a small set of shared primitives. Swapping in the real logo, palette, and photography later is a token edit, not a component rewrite. Placeholder food imagery is served from the same R2 pipeline as real photos so we never discover the image path is broken on launch day.

---

## 14. Delivery phases

**Phase 0 — Foundation.** Repo, Docker Compose (Postgres + Redis + app + Caddy), Drizzle schema and migrations, seed data, design tokens, next-intl wiring, admin auth, R2 setup, GitHub Actions deploy.

**Phase 1 — Order the food.** Bilingual menu (static + ISR), item detail, cart, checkout, QR + screenshot upload, COD with OTP, order status page, admin menu CRUD, admin order board with payment verification and Yango dispatch. *First releasable product.*

**Phase 2 — Trust.** Tokenized review submission, moderation queue, public display, verified badge, aggregate ratings, Sparrow SMS notifications.

**Phase 3 — Story.** Section/block builder, media library, recipe videos, ingredient stories, home and story pages composed from sections.

**Phase 4 — Operations.** Analytics, coupons, scheduled availability, printable kitchen tickets, reports.

Each phase ends with the performance budget verified on a real device, not just in CI.

---

## 15. Still open

- [ ] **VPS provider and region** — Vultr / DigitalOcean / Linode, Singapore or Mumbai? Needed before deploy config is final.
- [ ] **Domain** — registered? Required for Cloudflare and TLS.
- [ ] **QR providers** — which of FonePay / eSewa / Khalti / direct bank, and do you have the QR images and account names?
- [ ] **Delivery zones** — list of area names and the fee for each.
- [ ] **COD cap** — default Rs 3,000; adjust?
- [ ] **Pickup** — delivery-only for v1, with pickup behind a settings flag? Confirm.
- [ ] **Sparrow SMS account** — needed for OTP and status messages. Until it exists, OTP is logged to the console in dev.
- [ ] **Expected order volume** — shapes whether notifications need a queue.

---

## 16. Anti-patterns we are explicitly avoiding

1. **Server round-trip on add-to-cart** — the reason most food sites feel sluggish.
2. **Trusting client-computed totals** — prices are always recomputed server-side.
3. **Live price references in order history** — snapshots only.
4. **Hard-deleting menu items** — breaks historical orders and reports.
5. **Hardcoded homepage sections** — every one becomes a dev ticket forever.
6. **Raw HTML/CSS fields in the admin** — XSS plus guaranteed brand drift.
7. **Floats for money** — paisa integers, always.
8. **Auto-publishing reviews** — moderation enforced at the query layer.
9. **Forcing signup before checkout** — guest checkout by phone.
10. **Uploading images through our server** — direct-to-R2 presigned uploads.
11. **COD without phone verification** — an open invitation to prank orders.
12. **Distance-based delivery fees with no API** — unknowable at checkout; zones instead.
13. **Machine-translating the Nepali** — bad food copy reads as untrustworthy; admin writes both.
14. **One-off CSS per page** — design tokens and shared primitives only.
15. **A separate admin app** — one codebase, one deploy, one set of types.
