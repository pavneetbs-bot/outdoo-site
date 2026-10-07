// Pages: /about/ /shipping/ /returns/ /privacy/ /terms/ /contact/
// Needed for Google Merchant Center, Meta Commerce and the Consumer Protection (E-Commerce) Rules.
// No network needed. Run: node scripts/build-pages.mjs   (npm run update runs it too)
// Edit the text in PAGES below, run the script, commit.
import { writeFileSync, mkdirSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = 'https://outdoo.in'
const html0 = readFileSync(join(ROOT, 'index.html'), 'utf8')
const SUPA = { url: html0.match(/OUTDOO_SUPA = \{ url: "([^"]+)"/)[1], anon: html0.match(/OUTDOO_SUPA = \{[^}]*anon: "([^"]+)"/)[1] }

// ---------------------------------------------------------------- business facts (one place)
const CO = {
  legal: 'Sunshine Upgrades Private Limited',
  brand: 'OUTDOO',
  group: 'A LifeWall Group Company',
  email: 'orders@outdoo.in',
  city: 'New Delhi',
  returnDays: 7,
  damageHours: 48,
  updated: '4 October 2026',
}
const CATS = [['furniture', 'Furniture'], ['shade', 'Shade'], ['lighting', 'Lighting'], ['planters', 'Planters'], ['art', 'Art'], ['furnishings', 'Furnishings']]

const PAGES = {
  about: {
    title: 'About OUTDOO', desc: 'OUTDOO is an online marketplace for outdoor living — furniture, shade, lighting, planters and decor, direct from Indian manufacturers.',
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
<p>Make outdoor furniture or decor? Apply at <a href="https://seller.outdoo.in">seller.outdoo.in</a>.</p>
<h2>Company</h2>
<p>${CO.brand} is operated by ${CO.legal}, Delhi NCR, India. Questions? Write to <a href="mailto:${CO.email}">${CO.email}</a>.</p>`,
  },
  shipping: {
    title: 'Shipping & Delivery', desc: 'Free delivery to top metros, dispatch timelines, cash on delivery and what to check when your OUTDOO order arrives.',
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
    title: 'Returns, Refunds & Cancellations', desc: `Cancel free before dispatch, report damage within ${CO.damageHours} hours, return within ${CO.returnDays} days. How OUTDOO refunds work.`,
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
  privacy: {
    title: 'Privacy Policy', desc: 'What information OUTDOO collects, why, who it is shared with, and your rights under the Digital Personal Data Protection Act, 2023.',
    body: `
<p>${CO.brand} (${CO.group}) is run by ${CO.legal} (“we”). This policy explains how we handle your personal data on outdoo.in, in line with the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000.</p>
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
    title: 'Terms of Service', desc: 'The terms for buying on OUTDOO, an online marketplace for outdoor furniture, lighting and decor.',
    body: `
<p>outdoo.in is operated by ${CO.legal} (“${CO.brand}”, “we”), ${CO.group}. By using the site or placing an order you agree to these terms.</p>
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
    title: 'Contact Us', desc: 'Reach OUTDOO for orders, delivery, returns, bulk enquiries or selling on OUTDOO.',
    body: `
<h2>Orders and support</h2>
<p>Email <a href="mailto:${CO.email}">${CO.email}</a> — please add your order number (starts with OD). We usually reply within one working day.</p>
<h2>Sell on ${CO.brand}</h2>
<p>Manufacturers and brands can apply at <a href="https://seller.outdoo.in">seller.outdoo.in</a>.</p>
<h2>Grievance Officer</h2>
<p>As required by the Consumer Protection (E-Commerce) Rules, 2020 and the IT Rules:<br>
Grievance Officer, ${CO.legal}<br>
Email: <a href="mailto:${CO.email}">${CO.email}</a><br>
We acknowledge complaints within 48 hours and resolve them within one month.</p>
<h2>Company</h2>
<p>${CO.legal}<br>${CO.brand} — ${CO.group}<br>Delhi NCR, India</p>`,
  },
}

const CSS = `:root{--terra:#C26445;--olive:#55634A;--sand-soft:#F6F1E7;--char:#2E2E2E;--muted:#7a756c;--line:#e6e0d4}
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Poppins,system-ui,sans-serif;color:var(--char);background:#fff;line-height:1.65;font-size:15px}
a{color:var(--terra)}.wrap{max-width:1120px;margin:0 auto;padding:0 18px}
header{border-bottom:1px solid var(--line);position:sticky;top:0;background:#fff;z-index:5}
.hd{display:flex;align-items:center;gap:18px;height:62px}.logo{font:800 25px 'Plus Jakarta Sans',sans-serif;letter-spacing:-.03em;color:var(--char);text-decoration:none}.logo b{color:var(--terra)}
.nav{display:flex;gap:16px;overflow-x:auto;flex:1;font-size:13.5px;font-weight:500;scrollbar-width:none}.nav a{white-space:nowrap;color:#555;text-decoration:none}.nav a:hover{color:var(--terra)}
.cart{font-weight:600;font-size:13.5px;border:1px solid var(--line);border-radius:99px;padding:7px 14px;white-space:nowrap;color:var(--char);text-decoration:none}
.crumbs{font-size:12.5px;color:var(--muted);margin:18px 0 10px}.crumbs a{color:inherit;text-decoration:none}
article{max-width:760px;margin:0 0 60px}h1{font-size:30px;line-height:1.2;margin:4px 0 6px}.upd{color:var(--muted);font-size:13px;margin-bottom:22px}
h2{font-size:18px;margin:26px 0 8px}p{margin:0 0 12px}ul{margin:0 0 12px 20px}li{margin:4px 0}
.side{display:flex;gap:10px;flex-wrap:wrap;margin:30px 0 0;padding-top:18px;border-top:1px solid var(--line);font-size:13.5px}.side a{color:#555;text-decoration:none;border:1px solid var(--line);border-radius:99px;padding:6px 12px}.side a.on{border-color:var(--terra);color:var(--terra)}
footer{background:var(--sand-soft);padding:30px 0;font-size:13px;color:#555}footer .cols{display:flex;gap:30px;flex-wrap:wrap;justify-content:space-between}footer a{display:block;margin:3px 0;color:#555;text-decoration:none}
@media(max-width:760px){h1{font-size:24px}.hd{gap:12px}.logo{font-size:22px}}`

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const page = (key, p) => `<!doctype html>
<html lang="en-IN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)} | OUTDOO</title>
<meta name="description" content="${esc(p.desc)}">
<link rel="canonical" href="${SITE}/${key}/">
<meta property="og:type" content="website"><meta property="og:site_name" content="OUTDOO"><meta property="og:title" content="${esc(p.title)} | OUTDOO"><meta property="og:url" content="${SITE}/${key}/">
<link rel="icon" href="/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@800&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head><body>
<header><div class="wrap hd"><a class="logo" href="/">outd<b>oo</b></a>
<nav class="nav">${CATS.map(([s, t]) => `<a href="/c/${s}/">${t}</a>`).join('')}</nav>
<a class="cart" href="/?cart=1">Cart</a></div></header>
<main class="wrap"><div class="crumbs"><a href="/">Home</a> › ${esc(p.title)}</div>
<article><h1>${esc(p.title)}</h1><div class="upd">Last updated ${CO.updated}</div>
${p.body.trim()}
<nav class="side" aria-label="Policies">${Object.entries(PAGES).map(([k, x]) => `<a href="/${k}/"${k === key ? ' class="on"' : ''}>${esc(x.title)}</a>`).join('')}</nav>
</article></main>
<footer><div class="wrap cols">
<div><b>OUTDOO</b><br>Every Outdoor Possibility<br>${CO.group}<br>Free delivery to top metros · Cash on delivery</div>
<div><b>Shop</b>${CATS.map(([s, t]) => `<a href="/c/${s}/">${t}</a>`).join('')}</div>
<div><b>Help</b>${Object.entries(PAGES).map(([k, x]) => `<a href="/${k}/">${esc(x.title)}</a>`).join('')}<a href="https://seller.outdoo.in">Sell on OUTDOO</a></div>
</div></footer>
<script>window.OUTDOO_SUPA = { url: "${SUPA.url}", anon: "${SUPA.anon}" };</script>
<script src="/track.js"></script>
</body></html>
`

for (const [key, p] of Object.entries(PAGES)) {
  const f = join(ROOT, key, 'index.html'); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, page(key, p))
}
export const POLICY_PATHS = Object.keys(PAGES).map(k => `/${k}/`)
console.log(`Policy pages built: ${POLICY_PATHS.join(' ')}`)
