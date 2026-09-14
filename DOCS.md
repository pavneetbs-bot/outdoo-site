# OUTDOO Mockup — Code Documentation

**Files:**
| File | Size | Use |
|---|---|---|
| `Outdoo_Mobile_Mockup_v3.html` | ~1 MB | Demo file. Images embedded as base64 — works offline. Use this for investor demos. |
| `Outdoo_Mobile_Mockup_v3_lite.html` | ~50 KB | Same code, images load from Unsplash URLs. Use this for sharing with ChatGPT/developers. Needs internet. |

Single self-contained HTML file. No build step, no dependencies, no framework — plain HTML + CSS + vanilla JavaScript. Open in any browser.

---

## 1. What it is

A clickable UI mockup of OUTDOO — an outdoor-living e-commerce store (Pepperfry-style, mobile-first). Three screens in one file, switched via JavaScript (no page reloads):

1. **Home** (`#home`) — announcement bar, header with search, category tabs, category photo grid (10 tiles), auto-rotating hero carousel (3 slides), stats strip, signup offer banner, 2 promo tiles, Bestsellers grid, New Arrivals grid, brand band, footer.
2. **Collection / PLP** (`#plp`) — category banner with offer badge, coupon-style offer strip, product count, working sort (Popular / Price low-high / high-low), product grid. 5 collections.
3. **Product / PDP** (`#pdp`) — gallery + thumbnails, title + share, "By Outdoo Originals", people-viewing strip, price + MRP + % off, cashback line, QTY stepper + "Hurry! Only X left", delivery pincode check, accordions (Product Details, Specifications, Seller, Ratings & Reviews, Q&A), similar-items scroll row, sticky Add to Cart / Buy Now bar.

Persistent chrome: bottom navigation (Home / Categories / Track / Wishlist / Account), floating "Buy on WhatsApp" pill, toast notifications. On PDP the bottom nav is replaced by the sticky CTA bar (via `body.pdp-open` class).

---

## 2. Brand system (CSS variables, in `:root`)

| Token | Value | Use |
|---|---|---|
| `--terra` / `--terra-deep` | `#C26445` / `#A84F33` | Primary buttons, badges, accents |
| `--olive` / `--olive-deep` | `#55634A` / `#414D38` | Secondary buttons, rating chips, brand band |
| `--sand` / `--sand-soft` | `#EADCC8` / `#F6F1E7` | Surfaces, image placeholders |
| `--stone` | `#D6D2C7` | Neutral |
| `--char` | `#2E2E2E` | Text |
| `--line` | `#e6e0d4` | Borders |

**Fonts:** Poppins (all UI text), Plus Jakarta Sans (logo wordmark only) — loaded from Google Fonts.
**Logo:** built in code — "outd" text + two SVG circles (`#o-chair` terracotta with chair glyph, `#o-arc` olive with white band), defined once in `<defs>` and reused via `<use href>`.
**Light theme is forced** (`color-scheme: light`, `background:#fff !important`, plus a `prefers-color-scheme: dark` override) so in-app browsers with dark mode can't invert the page.

To rebrand: change the `:root` variables and the two `<g id="o-*">` defs. Nothing else needs touching.

---

## 3. Data models (all in the single `<script>` at the bottom)

### `IMGS` — image registry
```js
const IMGS = { HERO:"...", SOFA:"...", CHAIR:"...", ... };  // 14 keys
```
Every image lives here once (base64 in the demo file, URL in the lite file). Markup uses `<img data-img="SOFA">`; a one-liner on load fills the `src` from `IMGS`. **To change any photo, edit only this object.**

### `PRODS` — product catalog (14 products)
```js
lounge: { n:'Terraza 4-Seater...', p:86999, m:104000, r:'4.6', c:212,
          ship:'Ships in 10 days', img:'SOFA', col:'furniture' }
```
`n` name · `p` price · `m` MRP (0 = no strike-through) · `r` rating · `c` rating count · `ship` dispatch line · `img` key into `IMGS` · `col` key into `COLS`. Discount % is computed from `p`/`m` — never hardcoded.

### `COLS` — collections (5)
```js
furniture: { t:'Outdoor Furniture', tag:'Lounges, dining...', off:'UP TO 40% OFF',
             img:'SOFA', offer:'Extra 10% off with OUTDOO10 · ...' }
```
`t` title · `tag` subtitle · `off` banner badge · `img` banner image · `offer` coupon-strip text.

### `COLDET` — per-collection PDP details
Material / assembly / dimensions / warranty strings used to fill the Product Details accordion table.

**To add a product:** add one entry to `PRODS` (and an image to `IMGS` if new). It automatically appears in its collection page, sorts correctly, opens a full PDP, and shows in similar-items rows. Home-page Bestsellers/New Arrivals cards are static HTML — edit those separately if needed.

---

## 4. Key functions

| Function | Does |
|---|---|
| `showView(v)` | Switches between `home` / `plp` / `pdp`; toggles `body.pdp-open` |
| `openCol(key)` | Fills collection banner/offer from `COLS`, renders grid, shows PLP |
| `renderPLP()` | Filters `PRODS` by collection, applies the sort dropdown, renders cards |
| `openProduct(id)` | Fills every PDP field from `PRODS[id]` + `COLDET` (price, discount %, viewers, stock, cashback, details table, specs, reviews header, similar items), shows PDP |
| `backFromPDP()` | Returns to last collection, else home |
| `qch(±1)` | Quantity stepper (1–10) |
| `accT(el)` | Accordion open/close |
| `addCart()` | Increments cart badge + toast |
| `checkPin()` | Validates 6-digit pincode, shows success line |
| `doSearch()` / `goCats()` / `toast(msg)` | Search stub / scroll to categories / notification pill |
| Carousel | `setInterval` every 3.5s rotates `.slide.on` + dots |

Dynamic PDP numbers are derived (deterministic, no randomness): viewers = `40 + c%260`, stock = `2 + c%6`, cashback = `5%` of price rounded to ₹10.

---

## 5. What is mockup-only (not real)

- No backend, no real cart/checkout/payment — buttons show toasts.
- Search, wishlist, account, track are stubs.
- Products, prices, ratings, reviews, offers are **dummy data**.
- Photos are Unsplash placeholders — to be replaced with outdoorfurniture.in product shots / LifeWall project photos (edit `IMGS`).
- WhatsApp button shows a toast; in production it should open `https://wa.me/<number>?text=...`.

## 6. Path to the real build

The real store (per the build brief `claude_Replit_OutdoorStore_Build_Prompt.md`) is React + Vite + Supabase + Razorpay with an admin panel. This mockup is the **visual + UX spec** for its storefront: screens, components, spacing, colors, and interaction patterns should be lifted from here. `PRODS`/`COLS` map 1:1 to the `products`/`categories` tables in the Supabase schema.

---

*Generated 11 Sep 2026 · OUTDOO — A LifeWall Group Company*
