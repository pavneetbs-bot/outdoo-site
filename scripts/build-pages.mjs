// Pages: /about/ /shipping/ /returns/ /privacy/ /terms/ /contact/
// Needed for Google Merchant Center, Meta Commerce and the Consumer Protection (E-Commerce) Rules.
// No network needed. Run: node scripts/build-pages.mjs   (npm run update runs it too)
// Edit the text in PAGES below, run the script, commit.
import { writeFileSync, mkdirSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = 'https://outrr.in'
const html0 = readFileSync(join(ROOT, 'index.html'), 'utf8')
const SUPA = { url: html0.match(/OUTRR_SUPA = \{ url: "([^"]+)"/)[1], anon: html0.match(/OUTRR_SUPA = \{[^}]*anon: "([^"]+)"/)[1] }

// ---------------------------------------------------------------- business facts (one place)
const CO = {
  legal: 'Sunshine Upgrades Private Limited',
  brand: 'outrr',
  group: 'A LifeWall Group Company',
  email: 'support@outrr.in',
  city: 'New Delhi',
  returnDays: 7,
  damageHours: 48,
  updated: '7 October 2026',
}
const CATS = [['furniture', 'Furniture'], ['shade', 'Shade'], ['lighting', 'Lighting'], ['planters', 'Planters'], ['art', 'Art'], ['furnishings', 'Furnishings']]

const PAGES = {
  about: {
    title: 'About outrr', desc: 'outrr is an online marketplace for outdoor living — furniture, shade, lighting, planters and decor, direct from Indian manufacturers.',
    body: `
<p>${CO.brand} is an online marketplace for outdoor living. Balconies, terraces, gardens, farmhouses and cafés: everything to furnish them, in one place. Our tagline says it: <b>Every Outdoor Possibility</b>.</p>
<h2>Direct from the makers</h2>
<p>We work directly with manufacturers, so you buy from the people who build the product, without a chain of middlemen in between. Every seller on ${CO.brand} is GST-registered and verified by us before their products go live.</p>
<h2>Curated by people who build outdoor spaces</h2>
<p>${CO.brand} is ${CO.group.charAt(0).toLowerCase() + CO.group.slice(1)}. LifeWall designs and builds luxury outdoor spaces across Delhi NCR and has completed 300+ projects: pergolas, terraces, water features and more. The same team picks what goes on ${CO.brand}, choosing pieces that hold up to Indian sun, rain and dust.</p>
<h2>What you can expect</h2>
<ul>
<li>Free delivery to top metros, with cash on delivery.</li>
<li>${CO.returnDays}-day returns. See <a href="/returns/">Returns, Refunds &amp; Cancellations</a>.</li>
<li>Damage-free promise: report transit damage within ${CO.damageHours} hours and we sort it out.</li>
</ul>
<h2>Sell on ${CO.brand}</h2>
<p>Make outdoor furniture or decor? Apply at <a href="https://seller.outrr.in">seller.outrr.in</a>.</p>
<h2>Company</h2>
<p>${CO.brand} is operated by ${CO.legal}, Delhi NCR, India. Questions? Write to <a href="mailto:${CO.email}">${CO.email}</a>.</p>`,
  },
  shipping: {
    title: 'Shipping & Delivery', desc: 'Free delivery to top metros, dispatch timelines, cash on delivery and what to check when your outrr order arrives.',
    body: `
<h2>Where we deliver</h2>
<p>We deliver to India's major metro cities. Delivery is <b>free</b>. If your pincode can't be served yet, we call you before dispatch and cancel the order at no cost to you.</p>
<h2>When it ships</h2>
<p>Every product page shows its dispatch time (for example “Ships in 7–10 days”). Many pieces are finished to order by the maker, so this is the time to get it ready and hand it to the courier. After dispatch, delivery usually takes 3–7 days depending on your city. We share tracking details once it's on the way.</p>
<p>If an order has products from more than one seller, they may arrive in separate deliveries.</p>
<h2>Paying</h2>
<p>Pay by <b>cash or UPI on delivery</b>. Online payment is coming soon. Prices include GST; the GST invoice comes from the seller.</p>
<h2>When it arrives</h2>
<ul><li>Check the outer packaging before signing. If it's badly damaged, note it on the delivery slip or refuse the delivery.</li>
<li>Please record a short <b>unboxing video</b> — it makes any damage claim quick (see <a href="/returns/#damage">Damage-free promise</a>).</li>
<li>Assembly is by you. Fittings and a step-by-step guide ship with every piece that needs it.</li></ul>
<h2>Questions</h2>
<p>Write to <a href="mailto:${CO.email}">${CO.email}</a> with your order number (starts with OD).</p>`,
  },
  returns: {
    title: 'Returns, Refunds & Cancellations', desc: `Cancel free before dispatch, report damage within ${CO.damageHours} hours, return within ${CO.returnDays} days. How outrr refunds work.`,
    body: `
<h2>Cancel an order</h2>
<p>You can cancel <b>free of charge</b> any time before the order is dispatched. Write to <a href="mailto:${CO.email}">${CO.email}</a> or reply on WhatsApp with your order number.</p>
<h2 id="damage">Damage-free promise</h2>
<p>If something arrives <b>damaged, defective or different</b> from what you ordered, tell us within <b>${CO.damageHours} hours of delivery</b> with photos (and the unboxing video if you have it). We'll arrange a free replacement or a full refund — your choice, subject to stock.</p>
<h2>Change of mind</h2>
<p>You can return a product within <b>${CO.returnDays} days of delivery</b> if it's unused, unassembled and in its original packaging. For change-of-mind returns the return shipping cost is paid by you; we tell you the amount before pickup.</p>
<p>Not returnable: items made or cut to your size, plants and live items, and anything that has been assembled, installed or used.</p>
<h2>Refunds</h2>
<p>Once the returned item reaches the seller and passes a quick check, we refund within <b>7 working days</b>. Cash-on-delivery orders are refunded by UPI or bank transfer to an account you give us.</p>
<h2>How to start</h2>
<p>Email <a href="mailto:${CO.email}">${CO.email}</a> with your order number, the product, the reason and photos.</p>`,
  },
  warranty: {
    title: 'Warranty Policy', desc: 'How product warranties work on outrr: who gives them, what they cover and how to make a claim.',
    body: `
<h2>Who gives the warranty</h2>
<p>Products on ${CO.brand} are made and sold by verified sellers, and the warranty comes from the seller or manufacturer. Where a product has a warranty, its period and what it covers are shown on the product page under Specifications. If no warranty is shown, the product doesn't carry one beyond the <a href="/returns/#damage">damage-free promise</a>.</p>
<h2>What warranties usually cover</h2>
<ul>
<li>Manufacturing defects: broken welds or joints, frame failure, faulty wiring in lights.</li>
<li>Defects that show up under normal outdoor use as described on the product page.</li>
</ul>
<h2>What they don't cover</h2>
<ul>
<li>Normal weathering: gradual fading in direct sun, natural patina on metal, wood or stone.</li>
<li>Damage from misuse, wrong assembly, overloading, accidents or changes you make to the product.</li>
<li>Cushions and fabrics left out in heavy rain or stored wet, unless the product page says they're made for it.</li>
<li>Damage in transit. That's covered separately: report it within ${CO.damageHours} hours under our <a href="/returns/#damage">damage-free promise</a>.</li>
</ul>
<h2>How to make a claim</h2>
<p>Email <a href="mailto:${CO.email}">${CO.email}</a> with your order number (starts with OD), photos or a short video of the problem, and a line on what happened. We take it up with the seller for you and keep you updated. If the claim is accepted, the seller repairs or replaces the part or product as their warranty terms set out.</p>
<h2>Care</h2>
<p>Outdoor pieces last longer with a little care: cover or store cushions when it rains, wipe off dust and bird droppings, and follow the care guide that ships with your product.</p>`,
  },
  payments: {
    title: 'Payments', desc: 'How to pay for your outrr order: cash or UPI on delivery today, with online payment coming soon.',
    body: `
<h2>Pay on delivery</h2>
<p>Right now every ${CO.brand} order is paid on delivery. Pay the delivery partner in cash or by UPI when your order arrives. There's nothing to pay when you place the order.</p>
<h2>Online payment</h2>
<p>Card, UPI and net-banking payments at checkout are coming soon. We'll update this page when they go live.</p>
<h2>Prices and GST</h2>
<p>All prices on ${CO.brand} include GST. Your GST invoice comes from the seller. Business buyers can add their GSTIN at checkout to get a B2B invoice; it can be changed until the invoice is generated.</p>
<h2>Refunds</h2>
<p>Refunds for pay-on-delivery orders go by UPI or bank transfer to an account you give us, within 7 working days of the return passing the seller's check. See <a href="/returns/">Returns, Refunds &amp; Cancellations</a>.</p>
<h2>Stay safe</h2>
<p>${CO.brand} will never ask for your card details, UPI PIN or OTP over phone, email or WhatsApp. Report anything suspicious to <a href="mailto:${CO.email}">${CO.email}</a>.</p>`,
  },
  privacy: {
    title: 'Privacy Policy', desc: 'What information outrr collects, why, who it is shared with, and your rights under the Digital Personal Data Protection Act, 2023.',
    body: `
<p>${CO.brand} (${CO.group}) is run by ${CO.legal} (“we”). This policy explains how we handle your personal data on outrr.in, in line with the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000.</p>
<h2>What we collect</h2>
<ul><li><b>When you order:</b> name, mobile number, email (optional), delivery address, city, state and pincode, and what you bought.</li>
<li><b>When you contact us:</b> what you write to us and your contact details.</li>
<li><b>When you browse:</b> pages and products viewed, items added to cart, device type, and where you came from (for example an Instagram post or a Google ad). We use a random visitor ID for this, not your name.</li></ul>
<h2>Why we use it</h2>
<ul><li>To deliver your order, call you to confirm it, and give support, returns and refunds.</li>
<li>To issue GST invoices and meet legal and tax duties.</li>
<li>To improve the site and measure which ads and posts work.</li>
<li>To send offers on email or WhatsApp <b>only if you agree</b>. You can stop them any time.</li></ul>
<h2>Who we share it with</h2>
<ul><li>The <b>seller</b> of your product and the <b>courier</b>, only what they need to pack and deliver.</li>
<li>Service providers that run the site for us (hosting, database, messaging), under contract.</li>
<li>Advertising and analytics partners — <b>Meta</b> (Facebook / Instagram) and <b>Google</b> — through cookies and tags on this site, so we can measure ads and show relevant ads. You can block these in your browser or ad settings.</li>
<li>Authorities, when the law requires it.</li></ul>
<p>We don't sell your personal data.</p>
<h2>Cookies and similar tech</h2>
<p>We use your browser's storage to remember your cart and saved address, and tags from Meta Pixel, Google Analytics and Google Ads. Clearing your browser data removes them.</p>
<h2>How long we keep it</h2>
<p>Order and invoice records are kept as long as tax law requires (usually 8 years). Browsing data is kept for up to 24 months.</p>
<h2>Your rights</h2>
<p>You can ask to see, correct or delete your personal data, withdraw consent for marketing, or raise a complaint. Write to our Grievance Officer at <a href="mailto:${CO.email}">${CO.email}</a>; we reply within 30 days. If you're not satisfied, you may approach the Data Protection Board of India.</p>
<h2>Changes</h2>
<p>We'll post any changes on this page with a new date.</p>`,
  },
  terms: {
    title: 'Terms of Service', desc: 'The terms for buying on outrr, an online marketplace for outdoor furniture, lighting and decor.',
    body: `
<p>outrr.in is operated by ${CO.legal} (“${CO.brand}”, “we”), ${CO.group}. By using the site or placing an order you agree to these terms.</p>
<h2>Marketplace</h2>
<p>${CO.brand} is an online marketplace. Products are made and sold by independent sellers (manufacturers and brands) listed on ${CO.brand}. The seller is responsible for the product, its quality and its GST invoice; ${CO.brand} runs the platform, takes orders and payments, and handles customer support.</p>
<h2>Products and prices</h2>
<ul><li>Prices are in Indian rupees and include GST. Delivery to serviceable cities is free unless shown otherwise.</li>
<li>Photos may be styled or AI-assisted to show the product in a setting. Colours, wood grain and finishes can vary slightly; sizes are approximate (about ±2 cm).</li>
<li>If a price or detail is listed wrongly, we may cancel the order and refund anything paid.</li></ul>
<h2>Orders and payment</h2>
<p>An order is confirmed when we call or message you to confirm it. Payment is by cash or UPI on delivery for now. We may cancel orders we can't deliver, suspected fake orders, or bulk orders meant for resale.</p>
<h2>Delivery, returns and refunds</h2>
<p>See <a href="/shipping/">Shipping & Delivery</a> and <a href="/returns/">Returns, Refunds & Cancellations</a>.</p>
<h2>Use of the site</h2>
<p>Don't misuse the site, copy its content or images, or try to break its security. The ${CO.brand} name, logo and site content belong to us or our licensors.</p>
<h2>Liability</h2>
<p>Outdoor products should be assembled and used as shown in their guides. To the extent the law allows, our liability for an order is limited to the amount paid for it.</p>
<h2>Governing law</h2>
<p>These terms are governed by Indian law. Courts in ${CO.city} have jurisdiction. For complaints, contact our Grievance Officer — see <a href="/contact/">Contact</a>.</p>`,
  },
  contact: {
    title: 'Contact Us', desc: 'Reach outrr for orders, delivery, returns, bulk enquiries or selling on outrr.',
    body: `
<h2>Orders and support</h2>
<p>Email <a href="mailto:${CO.email}">${CO.email}</a> — please add your order number (starts with OD). We usually reply within one working day.</p>
<h2>Sell on ${CO.brand}</h2>
<p>Manufacturers and brands can apply at <a href="https://seller.outrr.in">seller.outrr.in</a>.</p>
<h2>Grievance Officer</h2>
<p>As required by the Consumer Protection (E-Commerce) Rules, 2020 and the IT Rules:<br>
Grievance Officer, ${CO.legal}<br>
Email: <a href="mailto:${CO.email}">${CO.email}</a><br>
We acknowledge complaints within 48 hours and resolve them within one month.</p>
<h2>Company</h2>
<p>${CO.legal}<br>${CO.brand} — ${CO.group}<br>Delhi NCR, India</p>`,
  },
}

const CSS = `:root{--terra:#BE5633;--olive:#2E2E2E;--sand-soft:#F6F1E7;--char:#2E2E2E;--muted:#7a756c;--line:#e6e0d4}
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Poppins,system-ui,sans-serif;color:var(--char);background:#fff;line-height:1.65;font-size:15px}
a{color:var(--terra)}.wrap{max-width:1120px;margin:0 auto;padding:0 18px}
header{border-bottom:1px solid var(--line);position:sticky;top:0;background:#fff;z-index:5}
.hd{display:flex;align-items:center;gap:18px;height:62px}.logo{display:flex;align-items:center}.logo img{height:26px;width:auto;display:block}
.nav{display:flex;gap:16px;overflow-x:auto;flex:1;font-size:13.5px;font-weight:500;scrollbar-width:none}.nav a{white-space:nowrap;color:#555;text-decoration:none}.nav a:hover{color:var(--terra)}
.cart{font-weight:600;font-size:13.5px;border:1px solid var(--line);border-radius:99px;padding:7px 14px;white-space:nowrap;color:var(--char);text-decoration:none}
.crumbs{font-size:12.5px;color:var(--muted);margin:18px 0 10px}.crumbs a{color:inherit;text-decoration:none}
article{max-width:760px;margin:0 0 60px}h1{font-size:30px;line-height:1.2;margin:4px 0 6px}.upd{color:var(--muted);font-size:13px;margin-bottom:22px}
h2{font-size:18px;margin:26px 0 8px}p{margin:0 0 12px}ul{margin:0 0 12px 20px}li{margin:4px 0}
.side{display:flex;gap:10px;flex-wrap:wrap;margin:30px 0 0;padding-top:18px;border-top:1px solid var(--line);font-size:13.5px}.side a{color:#555;text-decoration:none;border:1px solid var(--line);border-radius:99px;padding:6px 12px}.side a.on{border-color:var(--terra);color:var(--terra)}
footer{background:var(--sand-soft);padding:30px 0;font-size:13px;color:#555}footer .cols{display:flex;gap:30px;flex-wrap:wrap;justify-content:space-between}footer a{display:block;margin:3px 0;color:#555;text-decoration:none}
@media(max-width:760px){h1{font-size:24px}.hd{gap:12px}.logo img{height:23px}}`

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const page = (key, p) => `<!doctype html>
<html lang="en-IN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)} | outrr</title>
<meta name="description" content="${esc(p.desc)}">
<link rel="canonical" href="${SITE}/${key}/">
<meta property="og:type" content="website"><meta property="og:site_name" content="outrr"><meta property="og:title" content="${esc(p.title)} | outrr"><meta property="og:url" content="${SITE}/${key}/">
<link rel="icon" href="/favicon.png?v=3">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@800&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head><body>
<header><div class="wrap hd"><a class="logo" href="/"><img src="/img/outrr-logo.png?v=3" alt="outrr" height="26"></a>
<nav class="nav">${CATS.map(([s, t]) => `<a href="/c/${s}/">${t}</a>`).join('')}</nav>
<a class="cart" href="/?cart=1">Cart</a></div></header>
<main class="wrap"><div class="crumbs"><a href="/">Home</a> › ${esc(p.title)}</div>
<article><h1>${esc(p.title)}</h1><div class="upd">Last updated ${CO.updated}</div>
${p.body.trim()}
<nav class="side" aria-label="Policies">${Object.entries(PAGES).map(([k, x]) => `<a href="/${k}/"${k === key ? ' class="on"' : ''}>${esc(x.title)}</a>`).join('')}</nav>
</article></main>
<footer><div class="wrap cols">
<div><b>outrr</b><br>Every Outdoor Possibility<br>${CO.group}<br>Free delivery to top metros · Cash on delivery</div>
<div><b>Shop</b>${CATS.map(([s, t]) => `<a href="/c/${s}/">${t}</a>`).join('')}</div>
<div><b>Help</b>${Object.entries(PAGES).map(([k, x]) => `<a href="/${k}/">${esc(x.title)}</a>`).join('')}<a href="https://seller.outrr.in">Sell on outrr</a></div>
</div></footer>
<script>window.OUTRR_SUPA = { url: "${SUPA.url}", anon: "${SUPA.anon}" };</script>
<script src="/track.js"></script>
</body></html>
`

for (const [key, p] of Object.entries(PAGES)) {
  const f = join(ROOT, key, 'index.html'); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, page(key, p))
}

// ---------------------------------------------------------------- seller pages: /seller/?s=<slug>
// Dynamic: reads seller_page() from Supabase. Published = seller on a plan with a page (Basic / Premium)
// and Active. Unpublished pages open only from Seller Hub / admin (preview link) with a banner.
const SELLER_CSS = `.sp-pv{background:#FBEFE9;border:1px solid #EFC9B8;border-radius:12px;padding:12px 16px;margin:16px 0 0;display:flex;gap:14px;align-items:center;flex-wrap:wrap}
.sp-pv div{flex:1;min-width:220px}.sp-pv b{display:block;font-size:15px}.sp-pv span{font-size:13px;color:#7a4a32}
.sp-pv a{background:var(--terra);color:#fff;text-decoration:none;border-radius:10px;padding:10px 16px;font-weight:600;font-size:13.5px;white-space:nowrap}
.sp-hero{position:relative;margin:16px 0 0;border-radius:18px;overflow:hidden;background:linear-gradient(120deg,#BE5633,#8f3f24);min-height:190px}
.sp-hero img.bn{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.sp-hero:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 30%,rgba(0,0,0,.35))}
.sp-id{display:flex;gap:18px;align-items:flex-end;margin:-46px 0 0 22px;position:relative;z-index:2}
.sp-logo{width:108px;height:108px;border-radius:20px;background:#fff;border:4px solid #fff;box-shadow:0 6px 20px rgba(0,0,0,.12);overflow:hidden;display:flex;align-items:center;justify-content:center;font:800 34px 'Plus Jakarta Sans',sans-serif;color:var(--terra);flex-shrink:0}
.sp-logo img{width:100%;height:100%;object-fit:cover}
.sp-nm{padding:0 0 4px;min-width:0;align-self:flex-end;margin-top:52px}.sp-nm h1{font-size:28px;line-height:1.15;margin:0;letter-spacing:-.01em}.sp-nm p{color:var(--muted);margin:4px 0 0;font-size:14.5px}
.sp-facts{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 0}
.sp-facts span{font-size:12.5px;font-weight:500;border:1px solid var(--line);border-radius:99px;padding:5px 12px;background:#fff}
.sp-facts .ver{background:#2E2E2E;color:#fff;border-color:#2E2E2E}.sp-facts .tr{background:var(--sand-soft)}
.sp-share{margin-left:auto;background:none;border:1px solid var(--line);border-radius:99px;padding:5px 14px;font:600 12.5px Poppins,sans-serif;cursor:pointer}
.sp-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:30px 0 14px}.sp-bar h2{font-size:19px;margin:0 auto 0 0}
.sp-chips{display:flex;gap:8px;flex-wrap:wrap}.sp-chips button{border:1px solid var(--line);background:#fff;border-radius:99px;padding:7px 14px;font:500 13px Poppins,sans-serif;cursor:pointer;color:#555}
.sp-chips button.on{background:var(--char);border-color:var(--char);color:#fff}
.sp-bar select{border:1px solid var(--line);border-radius:10px;padding:8px 10px;font:500 13px Poppins,sans-serif;background:#fff}
.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}
.card{display:block;color:inherit}.card a{text-decoration:none;color:inherit}.card .im{position:relative;aspect-ratio:1;background:var(--sand-soft);border-radius:14px;overflow:hidden}
.card .im img{width:100%;height:100%;object-fit:cover;transition:transform .3s}.card:hover .im img{transform:scale(1.04)}
.card .off{position:absolute;left:10px;top:10px;background:var(--terra);color:#fff;font-size:11px;font-weight:700;border-radius:6px;padding:3px 7px}
.card .oos{position:absolute;inset:auto 0 0;background:rgba(46,46,46,.75);color:#fff;font-size:12px;text-align:center;padding:5px}
.card .n{font-size:13.5px;font-weight:500;margin:9px 0 3px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card .p{font-weight:700;font-size:15px}.card .p s{font-weight:400;color:var(--muted);font-size:12px;margin-left:6px}
.card .rt{font-size:12px;color:var(--muted);margin-top:2px}
.card .add{margin-top:8px;width:100%;border:1px solid var(--terra);color:var(--terra);background:#fff;border-radius:10px;padding:8px;font:600 13px Poppins,sans-serif;cursor:pointer}
.card .add:hover{background:var(--terra);color:#fff}
.sp-about{display:grid;grid-template-columns:1fr 1.4fr;gap:30px;margin:48px 0 56px;padding:28px;border-radius:18px;background:var(--sand-soft)}
.sp-about h2{font-size:21px;margin:0 0 6px}.sp-about p{white-space:pre-line;margin:0;color:#444}
.sp-empty{text-align:center;padding:70px 20px}.sp-empty h1{font-size:24px;margin-bottom:8px}.sp-empty a.btn{display:inline-block;margin-top:16px;background:var(--terra);color:#fff;text-decoration:none;border-radius:10px;padding:11px 18px;font-weight:600}
.sp-load{padding:90px 0;text-align:center;color:var(--muted)}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--char);color:#fff;border-radius:99px;padding:10px 18px;font-size:13px;opacity:0;transition:opacity .2s;pointer-events:none}.toast.on{opacity:1}
@media(max-width:900px){.grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:760px){.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.sp-hero{min-height:130px;border-radius:14px}
 .sp-id{margin:-34px 0 0 12px;gap:12px}.sp-nm{margin-top:38px}.sp-logo{width:80px;height:80px;border-radius:16px;font-size:26px}.sp-nm h1{font-size:21px}.sp-about{grid-template-columns:1fr;gap:10px;padding:20px}}`

const SELLER_JS = `(function(){
var Q=new URLSearchParams(location.search),slug=(Q.get('s')||'').trim().toLowerCase(),tok=Q.get('preview')||null,root=document.getElementById('sp');
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var inr=function(n){return '\\u20b9'+Math.round(+n||0).toLocaleString('en-IN')};
var TIER={exclusive:'outrr Exclusive',originals:'outrr Originals'};
function cart(){try{return JSON.parse(localStorage.getItem('outrr_cart')||'[]')}catch(e){return[]}}
function setCart(c){try{localStorage.setItem('outrr_cart',JSON.stringify(c))}catch(e){}var n=c.reduce(function(a,x){return a+x.q},0),e=document.getElementById('cartn');if(e)e.textContent=n}
function toast(t){var e=document.getElementById('toast');e.textContent=t;e.classList.add('on');setTimeout(function(){e.classList.remove('on')},1700)}
window.spAdd=function(sku,v){var c=cart(),f=c.find(function(x){return x.id===sku});f?f.q=Math.min(10,f.q+1):c.push({id:sku,q:1});setCart(c);if(window.otrack)otrack('add_to_cart',{sku:sku,value:v});toast('Added to cart')};
setCart(cart());
function none(name){document.title='Seller page not available | outrr';root.innerHTML='<div class="sp-empty"><h1>'+(name?esc(name)+' isn\\u2019t showing a page right now':'Seller page not found')+'</h1><p>'+(name?'Their products are still on outrr. Browse the full range below.':'Check the link, or browse everything on outrr.')+'</p><a class="btn" href="/">Shop outrr</a></div>'}
if(!slug)return none();
var S=window.OUTRR_SUPA;
fetch(S.url+'/rest/v1/rpc/seller_page',{method:'POST',headers:{apikey:S.anon,Authorization:'Bearer '+S.anon,'Content-Type':'application/json'},body:JSON.stringify({p_slug:slug,p_token:tok})})
.then(function(r){return r.ok?r.json():null}).then(function(d){if(!d||!d.available)return none(d&&d.name);render(d)}).catch(function(){none()});
var D,cat='',sort='pop';
function render(d){D=d;var nm=d.brand&&d.brand!==d.name?d.brand:d.name;
 document.title=nm+(d.tagline?' \\u2013 '+d.tagline:'')+' | outrr';
 if(!d.published){var m=document.createElement('meta');m.name='robots';m.content='noindex';document.head.appendChild(m)}
 var md=document.querySelector('meta[name=description]');if(md)md.content=(d.tagline||('Shop '+nm+' on outrr'))+'. '+d.products.length+' products, free delivery to top metros.';
 var since=d.since?new Date(d.since).getFullYear():null,ini=String(nm||'?').trim().split(/\\s+/).map(function(x){return x[0]}).slice(0,2).join('').toUpperCase();
 var h='';
 if(!d.published)h+='<div class="sp-pv" role="status"><div><b>Your page is unpublished</b><span>'+(d.plan!=='free'&&d.seller_status!=='active'?'It goes live once outrr verifies your seller account. Only you and the outrr team can see this preview.':'Pay for your listing to publish your page. Only you and the outrr team can see this preview.')+'</span></div>'+(d.plan==='free'?'<a href="https://seller.outrr.in/#plan">Pay to publish</a>':'')+'</div>';
 h+='<div class="sp-hero">'+(d.banner?'<img class="bn" src="'+esc(d.banner)+'" alt="">':'')+'</div>';
 h+='<div class="sp-id"><div class="sp-logo">'+(d.logo?'<img src="'+esc(d.logo)+'" alt="'+esc(nm)+' logo">':esc(ini))+'</div><div class="sp-nm"><h1>'+esc(nm)+'</h1>'+(d.tagline?'<p>'+esc(d.tagline)+'</p>':'')+'</div></div>';
 h+='<div class="sp-facts"><span class="ver">\\u2713 Verified seller</span>'+(TIER[d.tier]?'<span class="tr">'+TIER[d.tier]+'</span>':'')+(d.city?'<span>'+esc(d.city)+'</span>':'')+(since?'<span>On outrr since '+since+'</span>':'')
  +(d.rating_count?'<span>\\u2605 '+d.rating+' ('+d.rating_count+' review'+(d.rating_count>1?'s':'')+')</span>':'')+'<span>'+d.products.length+' product'+(d.products.length===1?'':'s')+'</span><button class="sp-share" onclick="spShare()">Share</button></div>';
 h+='<div class="sp-bar"><h2>All products</h2><div class="sp-chips" id="spc"></div><select id="sps" aria-label="Sort"><option value="pop">Popular</option><option value="lo">Price: low to high</option><option value="hi">Price: high to low</option><option value="off">Biggest discount</option></select></div><div class="grid" id="spg"></div>';
 if(d.about)h+='<section class="sp-about"><div><h2>About '+esc(nm)+'</h2><div class="crumbs" style="margin:0">'+(d.city?esc(d.city)+' \\u00b7 ':'')+'Sells on outrr'+(since?' since '+since:'')+'</div></div><p>'+esc(d.about)+'</p></section>';
 else h+='<div style="height:50px"></div>';
 root.innerHTML=h;
 document.getElementById('sps').onchange=function(e){sort=e.target.value;grid()};chips();grid();
 if(window.otrack)otrack('page_view',{path:'/seller/'+slug});
}
function chips(){var c=[{slug:'',title:'All',count:D.products.length}].concat(D.categories||[]);if(c.length<3){document.getElementById('spc').innerHTML='';return}
 document.getElementById('spc').innerHTML=c.map(function(x){return '<button class="'+(cat===x.slug?'on':'')+'" data-c="'+esc(x.slug)+'">'+esc(x.title)+' \\u00b7 '+x.count+'</button>'}).join('');
 Array.prototype.forEach.call(document.querySelectorAll('#spc button'),function(b){b.onclick=function(){cat=b.getAttribute('data-c');chips();grid()}})}
function grid(){var off=function(p){return p.mrp>p.price?(p.mrp-p.price)/p.mrp:0};
 var l=D.products.filter(function(p){return !cat||p.collection_slug===cat}).slice();
 if(sort==='lo')l.sort(function(a,b){return a.price-b.price});else if(sort==='hi')l.sort(function(a,b){return b.price-a.price});else if(sort==='off')l.sort(function(a,b){return off(b)-off(a)});
 var g=document.getElementById('spg');
 if(!l.length){g.innerHTML='<p style="color:var(--muted);grid-column:1/-1;padding:30px 0">No products live yet.</p>';return}
 g.innerHTML=l.map(function(p){var o=Math.round(off(p)*100),u='/?p='+encodeURIComponent(p.sku);
  return '<div class="card"><a href="'+u+'"><div class="im">'+(p.image_url?'<img src="'+esc(p.image_url)+'" alt="'+esc(p.name)+'" loading="lazy" width="400" height="400">':'')+(o>=5?'<span class="off">'+o+'% OFF</span>':'')+(p.in_stock===false?'<span class="oos">Out of stock</span>':'')+'</div>'
   +'<div class="n">'+esc(p.name)+'</div><div class="p">'+inr(p.price)+(p.mrp>p.price?'<s>'+inr(p.mrp)+'</s>':'')+'</div>'+(p.rating_count?'<div class="rt">\\u2605 '+(+p.rating).toFixed(1)+' ('+p.rating_count+')</div>':'')+'</a>'
   +(p.in_stock===false?'':'<button class="add" onclick="spAdd(\\''+esc(p.sku).replace(/\\\\/g,'')+'\\','+Math.round(p.price)+')">Add to cart</button>')+'</div>'}).join('')}
window.spShare=function(){var u=location.origin+'/seller/?s='+encodeURIComponent(slug);if(navigator.share)navigator.share({title:document.title,url:u}).catch(function(){});else{try{navigator.clipboard.writeText(u);toast('Link copied')}catch(e){prompt('Copy this link',u)}}};
})();`

const sellerPage = () => `<!doctype html>
<html lang="en-IN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Seller | outrr</title>
<meta name="description" content="Shop direct from verified Indian makers of outdoor furniture, lighting and decor on outrr.">
<meta property="og:type" content="website"><meta property="og:site_name" content="outrr">
<link rel="icon" href="/favicon.png?v=3">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@800&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS}
.cart span{background:var(--terra);color:#fff;border-radius:99px;font-size:11px;padding:1px 7px;margin-left:6px}
${SELLER_CSS}</style>
</head><body>
<header><div class="wrap hd"><a class="logo" href="/"><img src="/img/outrr-logo.png?v=3" alt="outrr" height="26"></a>
<nav class="nav">${CATS.map(([s, t]) => `<a href="/c/${s}/">${t}</a>`).join('')}</nav>
<a class="cart" href="/?cart=1">Cart<span id="cartn">0</span></a></div></header>
<main class="wrap" id="sp"><div class="sp-load">Loading…</div></main>
<footer><div class="wrap cols">
<div><b>outrr</b><br>Every Outdoor Possibility<br>${CO.group}<br>Free delivery to top metros · Cash on delivery</div>
<div><b>Shop</b>${CATS.map(([s, t]) => `<a href="/c/${s}/">${t}</a>`).join('')}</div>
<div><b>Help</b>${Object.entries(PAGES).map(([k, x]) => `<a href="/${k}/">${esc(x.title)}</a>`).join('')}<a href="https://seller.outrr.in">Sell on outrr</a></div>
</div></footer>
<div class="toast" id="toast"></div>
<script>window.OUTRR_SUPA = { url: "${SUPA.url}", anon: "${SUPA.anon}" };</script>
<script src="/track.js"></script>
<script>${SELLER_JS}</script>
</body></html>
`
{ const f = join(ROOT, 'seller', 'index.html'); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, sellerPage()) }
console.log('Seller page built: /seller/?s=<slug>')

export const POLICY_PATHS = Object.keys(PAGES).map(k => `/${k}/`)
console.log(`Policy pages built: ${POLICY_PATHS.join(' ')}`)
