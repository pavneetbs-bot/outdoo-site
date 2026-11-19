// Builds the search-engine pages for outrr.in from the live catalog in Supabase:
//   p/<product>/index.html   one fast, crawlable page per product (title, description, price, JSON-LD)
//   c/<category>/index.html  one page per category, linking to its products
//   sitemap.xml, robots.txt, feed/google.xml (Google Merchant Center)
// Run it whenever products change, then Republish:  node scripts/build-seo.mjs
import { PIXEL_HEAD } from './pixel.mjs'
import { buildFooter, withFooter } from './footer.mjs'
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = 'https://outrr.in'
const html0 = readFileSync(join(ROOT, 'index.html'), 'utf8')
const SUPA = { url: html0.match(/OUTRR_SUPA = \{ url: "([^"]+)"/)[1], anon: html0.match(/OUTRR_SUPA = \{[^}]*anon: "([^"]+)"/)[1] }
const H = { apikey: SUPA.anon, Authorization: 'Bearer ' + SUPA.anon }
const getAll = async path => {   // Supabase returns at most 1,000 rows per request
  const out = []
  for (let o = 0; ; o += 1000) { const d = await get(`${path}&limit=1000&offset=${o}`); out.push(...d); if (d.length < 1000) return out }
}
const get = async path => {
  const r = await fetch(`${SUPA.url}/rest/v1/${path}`, { headers: H })
  if (!r.ok) throw new Error(`${path} → ${r.status} ${await r.text()}`)
  return r.json()
}

// clean product URL: name, plus the SKU when the name doesn't already contain it (kept unique)
export const slug = (name, sku) => {
  const base = String(name || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70).replace(/-+$/, '')
  const s = String(sku || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `-${base}-`.includes(`-${s}-`) ? base : `${base}-${s}`
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const inr = n => '₹' + Math.round(+n || 0).toLocaleString('en-IN')
const clip = (s, n) => (s = String(s || '').replace(/\s+/g, ' ').trim()).length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s

// 076: packaging + the highest delivery charge the seller set (per piece, incl. GST) — what a buyer far away pays; 0 = free
// 178 / feed fix: prices on the site include packaging + delivery; without a place the store shows the lowest it can be
// (near.js charge(): empty rate → the next wider one). SEO pages, JSON-LD and the Google / Meta feed use the same price.
const nz = v => v == null || v === '' || isNaN(+v) ? null : +v
const feeOf = p => { const l = nz(p.ship_local), s = nz(p.ship_state), i = nz(p.ship_india), pk = nz(p.pack_fee) || 0
  const r = z => { const v = z === 'l' ? (l ?? s ?? i) : z === 's' ? (s ?? i) : i; return v == null ? 0 : v }
  return [pk, l, s, i].some(v => v > 0) ? pk + Math.min(r('l'), r('s'), r('i')) : 0 }
const delivered = p => { if (p.kind === 'mto') return p; const f = feeOf(p), p0 = +p.price || 0, m0 = +p.mrp || 0
  return { ...p, price: Math.round(p0 + f), mrp: m0 > p0 ? Math.round(m0 + f) : m0 } }
const products = (await getAll('products?status=eq.published&select=id,sku,name,seo_title,seo_description,seo_keywords,image_alt,price,mrp,ship_text,image_url,collection_slug,subcategory_slug,description,material,dims,tier,in_stock,updated_at,pack_fee,ship_local,ship_state,ship_india,orders_open,kind,mto,tags&order=name,sku'))
  .filter(p => p.price > 0).map(delivered)
// 135: listed but not on sale yet (seller not live / preview only) — "Coming soon": no price, no cart, not in the Google feed
const soon = p => p.orders_open === false
const SOON = '<span class="soon">Coming soon</span>'
const cols = await get('collections?active=eq.true&select=*&order=sort')
const subs = await get('subcategories?active=eq.true&select=*&order=sort').catch(() => [])
const colOf = Object.fromEntries(cols.map(c => [c.slug, c]))
const taken = new Set()
for (const p of products) { let sl = slug(p.name, p.sku); if (taken.has(sl)) sl = `${sl}-${String(p.sku).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`; taken.add(sl); p.slug = sl }
const today = new Date().toISOString().slice(0, 10)

// 098: ratings from published customer reviews (search-result stars)
const RATE = Object.fromEntries((await fetch(`${SUPA.url}/rest/v1/rpc/seo_ratings`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: '{}' }).then(r => r.ok ? r.json() : []).catch(() => [])).map(r => [r.product_id, r]))
const describe = p => p.description?.trim() || [
  `${p.name} from the outrr ${colOf[p.collection_slug]?.title || 'outdoor'} range${colOf[p.collection_slug]?.tagline ? ` (${colOf[p.collection_slug].tagline.toLowerCase()})` : ''}.`,
  p.material ? `Made in ${p.material}.` : 'Built for Indian weather: sun, rain and dust.',
  p.dims ? `Size: ${p.dims}.` : '',
  `${p.ship_text || 'Ships in 7-10 days'}, delivered across India, secure online payment.`,
].filter(Boolean).join(' ')

// category pages follow the admin ranking (Settings → Search & ranking); name order if it isn't available
const rankOf = async cat => {
  try {
    const r = await fetch(`${SUPA.url}/rest/v1/rpc/search_products`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ q: '', p_category: cat, p_limit: 500 }) })
    if (!r.ok) return {}
    return Object.fromEntries((await r.json()).map((x, i) => [x.sku, i]))
  } catch { return {} }
}
const ranked = {}
for (const c of cols) { const rk = await rankOf(c.slug); ranked[c.slug] = products.filter(p => p.collection_slug === c.slug).sort((a, b) => (rk[a.sku] ?? 1e9) - (rk[b.sku] ?? 1e9)) }
// sub-category groups of a category, in admin sort order (products without one go under "More")
const groupsOf = cs => {
  const list = ranked[cs] || [], own = subs.filter(x => x.category_slug === cs)
  const g = own.map(x => ({ slug: x.slug, title: x.title, image: x.image_url, items: list.filter(p => p.subcategory_slug === x.slug) }))
  const rest = list.filter(p => !own.some(x => x.slug === p.subcategory_slug))
  if (rest.length && own.length) g.push({ slug: `${cs}-more`, title: 'More', items: rest })
  return g.filter(x => x.items.length)
}

const slim = (u, w = 600) => { const m = String(u || '').match(/^(https:\/\/[a-z0-9]+\.supabase\.co)\/storage\/v1\/object\/public\/([^?]+)(?:\?(.*))?$/); return m && /\.(jpe?g|png|webp)$/i.test(m[2]) ? `${m[1]}/storage/v1/render/image/public/${m[2]}?width=${w}&resize=contain&quality=75${m[3] ? '&' + m[3] : ''}` : u }
// desktop mega menu (pure CSS hover): sub-category tiles with pictures + a feature picture
const MEGA = Object.fromEntries(cols.map(c => {
  const gs = groupsOf(c.slug), list = ranked[c.slug] || []
  if (!list.length) return [c.slug, '']
  const feat = c.menu_image || list[0].image_url
  return [c.slug, `<div class="dd"><div class="ddin"><div class="dd-subs">${(gs.length ? gs : [{ slug: '', title: 'All ' + c.title, items: list }]).map(g =>
    `<a href="/c/${c.slug}/${g.slug ? '#' + g.slug : ''}"><img src="${esc(slim(g.image || g.items[0].image_url))}" alt="" loading="lazy" width="160" height="160"><b>${esc(g.title)}</b><small>${g.items.length} product${g.items.length > 1 ? 's' : ''}</small></a>`).join('')}</div>
<a class="dd-feat" href="/c/${c.slug}/"><img src="${esc(feat)}" alt="${esc(c.title)}" loading="lazy"><span><b>${esc(c.menu_note || c.tagline || c.title)}</b><u>Shop all ${list.length} →</u></span></a></div></div>`]
}))

// ---------------------------------------------------------------- shared layout
const CSS = `:root{--terra:#BE5633;--terra-deep:#A84F33;--olive:#2E2E2E;--sand:#EADCC8;--sand-soft:#F6F1E7;--char:#2E2E2E;--muted:#7a756c;--line:#e6e0d4}
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Poppins,system-ui,sans-serif;color:var(--char);background:#fff;line-height:1.55;font-size:14.5px}
a{color:inherit;text-decoration:none}img{display:block;max-width:100%}
.wrap{max-width:1120px;margin:0 auto;padding:0 18px}
header{border-bottom:1px solid var(--line);position:sticky;top:0;background:#fff;z-index:5}
.hd{display:flex;align-items:center;gap:18px;height:62px}.logo{display:flex;align-items:center}.logo img{height:26px;width:auto;display:block}
.nav{display:flex;gap:16px;overflow-x:auto;flex:1;font-size:13.5px;font-weight:500;scrollbar-width:none}.nav a{white-space:nowrap;color:#555}.nav a:hover,.nav a.on{color:var(--terra)}
.nv{position:static}.dd{display:none}.nav .dd a{white-space:normal;color:inherit}
@media(hover:hover) and (min-width:900px){.nv>a{display:block;padding:21px 0}.nv:hover>a{color:var(--terra)}
.nv:hover .dd{display:block}.dd{position:absolute;left:0;right:0;top:100%;background:#fff;border-top:1px solid var(--line);box-shadow:0 18px 40px rgba(0,0,0,.12)}
.ddin{max-width:1120px;margin:0 auto;padding:22px 18px 24px;display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:24px;white-space:normal}
.dd-subs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;align-content:start}.dd-subs a img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px;background:var(--sand-soft)}
.dd-subs b{display:block;font-size:13px;margin-top:6px;line-height:1.3;color:var(--char)}.dd-subs small{font-size:11.5px;color:var(--muted)}.dd-subs a:hover b{color:var(--terra)}
.dd-feat{position:relative;border-radius:14px;overflow:hidden;min-height:260px;background:var(--sand)}.dd-feat img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.dd-feat span{position:absolute;inset:auto 0 0;padding:14px;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.65))}.dd-feat b{display:block;font-size:15px;line-height:1.3;margin-bottom:6px}.dd-feat u{font-size:12px;font-weight:600}}
.cmpx{margin:0 0 40px}.cmpx h2{font-size:17px;margin-bottom:10px}.cw{overflow-x:auto;border:1px solid var(--line);border-radius:12px}
.cmpx table{border-collapse:separate;border-spacing:0;width:100%;min-width:600px;table-layout:fixed;font-size:13px}.cmpx th,.cmpx td{padding:10px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top;background:#fff}
.cmpx tr:last-child>*{border-bottom:0}.cmpx th{width:120px;position:sticky;left:0;background:var(--sand-soft);color:var(--muted);font-size:12px}.cmpx td.me{background:#fffaf6}
.cmpx td img{width:100%;max-width:170px;aspect-ratio:1;object-fit:cover;border-radius:10px;background:var(--sand-soft);margin-bottom:6px}.cmpx td b{display:block;font-weight:600;line-height:1.3}.cmpx td a:hover b{color:var(--terra)}
.cmpx .tg{display:inline-block;font-size:10px;font-weight:700;background:var(--terra);color:#fff;border-radius:4px;padding:2px 6px;margin-bottom:5px}.cmpx strong{font-size:15px}.cmpx em{display:block;font-style:normal;font-size:11px;color:#A84F33;font-weight:600}.cmpx s{color:var(--muted)}
.sub-h{font-size:17px;margin:26px 0 12px;scroll-margin-top:80px}
.cart.acc{margin-right:6px}@media(max-width:560px){.cart.acc{display:none}}
.cart{position:relative;font-weight:600;font-size:13.5px;border:1px solid var(--line);border-radius:99px;padding:7px 14px;white-space:nowrap}.cart span{background:var(--terra);color:#fff;border-radius:99px;font-size:11px;padding:1px 7px;margin-left:6px}
.crumbs{font-size:12.5px;color:var(--muted);margin:18px 0 10px}.crumbs a:hover{color:var(--terra)}
.pd{display:grid;grid-template-columns:1.1fr 1fr;gap:34px;margin-bottom:40px}
.pimg{background:var(--sand-soft);border-radius:16px;overflow:hidden;aspect-ratio:1}.pimg img{width:100%;height:100%;object-fit:cover}
h1{font-size:27px;line-height:1.2;margin:4px 0 10px;letter-spacing:-.01em}
.tier{display:inline-block;font-size:11.5px;font-weight:600;background:var(--sand-soft);color:var(--olive);border-radius:99px;padding:3px 10px}
.price{display:flex;align-items:baseline;gap:10px;margin:14px 0 4px}.price b{font-size:28px}.price s{color:var(--muted)}.price em{font-style:normal;color:#A84F33;font-weight:600}
.soon{display:inline-block;padding:4px 12px;border-radius:999px;background:#fbefe8;color:#A84F33;font-size:13px;font-weight:700}
.tax{font-size:12px;color:var(--muted)}
.btns{display:flex;gap:10px;margin:20px 0}.btn{flex:1;display:inline-flex;justify-content:center;align-items:center;border:0;border-radius:11px;padding:14px 18px;font:600 15px Poppins,sans-serif;cursor:pointer;background:var(--terra);color:#fff}.btn.alt{background:var(--olive)}.btn:disabled{opacity:.5}
.perks{list-style:none;display:grid;gap:7px;font-size:13.5px;border:1px solid var(--line);border-radius:12px;padding:14px 16px}.perks li:before{content:'✓';color:var(--olive);font-weight:700;margin-right:8px}
.desc{margin-top:20px}.desc h2,.rel h2,.cat h2{font-size:17px;margin-bottom:8px}.desc dl{display:grid;grid-template-columns:120px 1fr;gap:6px 12px;margin-top:12px;font-size:13.5px}.desc dt{color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.card .im{aspect-ratio:1;background:var(--sand-soft);border-radius:12px;overflow:hidden}.card .im img{width:100%;height:100%;object-fit:cover;transition:transform .3s}.card:hover img{transform:scale(1.04)}
.card .n{font-size:13.5px;font-weight:500;margin:8px 0 2px;line-height:1.35}.card .p{font-weight:700}.card .p s{font-weight:400;color:var(--muted);font-size:12px;margin-left:6px}
.rel{margin:10px 0 50px}.cat{margin:6px 0 50px}.cat .lead{color:var(--muted);margin-bottom:18px}.cat .intro{max-width:860px;line-height:1.65;margin:0 0 14px}.subnav{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}.subnav a{border:1px solid #E2D6C4;border-radius:999px;padding:7px 14px;font-size:13px;text-decoration:none;color:inherit;background:#fff}.subnav a.on{border-color:#C26445;color:#9C4127;font-weight:600}.faq{max-width:860px;margin:30px 0}.faq details{border-bottom:1px solid #E2D6C4;padding:10px 0}.faq summary{cursor:pointer;font-weight:600}.faq p{margin:8px 0 0;line-height:1.6;color:#4A4640}.cat .more-h{font-size:15px;margin:26px 0 8px}
footer{background:var(--sand-soft);padding:30px 0;font-size:13px;color:#555}footer .cols{display:flex;gap:30px;flex-wrap:wrap;justify-content:space-between}footer a{display:block;margin:3px 0}footer a:hover{color:var(--terra)}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--char);color:#fff;border-radius:99px;padding:10px 18px;font-size:13px;opacity:0;transition:opacity .2s;pointer-events:none}.toast.on{opacity:1}
@media(max-width:760px){.pd{grid-template-columns:1fr;gap:18px}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}h1{font-size:22px}.hd{gap:12px}.logo img{height:23px}}`

const CART_JS = `function _c(){try{return JSON.parse(localStorage.getItem('outrr_cart')||'[]')}catch(e){return[]}}
function _cs(c){try{localStorage.setItem('outrr_cart',JSON.stringify(c))}catch(e){}var n=c.reduce(function(a,x){return a+x.q},0),e=document.getElementById('cartn');if(e)e.textContent=n}
function addCart(id,v){var c=_c(),f=c.find(function(x){return x.id===id});f?f.q=Math.min(10,f.q+1):c.push({id:id,q:1});_cs(c);if(window.otrack)otrack('add_to_cart',{sku:id,value:v});var t=document.getElementById('toast');t.textContent='Added to cart';t.classList.add('on');setTimeout(function(){t.classList.remove('on')},1600)}
_cs(_c());`

const page = ({ title, desc, path, image, body, jsonld = [], cur = '', view = null, keywords = [] }) => `<!doctype html>
<html lang="en-IN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${keywords.length ? `<meta name="keywords" content="${esc(keywords.join(', '))}">` : ''}
<link rel="canonical" href="${SITE}${path}">
<meta property="og:type" content="${path.startsWith('/p/') ? 'product' : 'website'}"><meta property="og:site_name" content="outrr">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${SITE}${path}">
${image ? `<meta property="og:image" content="${esc(image)}"><meta name="twitter:card" content="summary_large_image">` : ''}
${PIXEL_HEAD}
<link rel="icon" href="/favicon.png?v=3">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@800&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style>
${jsonld.map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head><body>
<header><div class="wrap hd"><a class="logo" href="/"><img src="/img/outrr-logo.png?v=3" alt="outrr" height="26"></a>
<nav class="nav">${cols.map(c => `<div class="nv"><a href="/c/${c.slug}/"${c.slug === cur ? ' class="on"' : ''}>${esc(c.title)}</a>${MEGA[c.slug] || ''}</div>`).join('')}</nav>
<a class="cart acc" href="/?account=1">Account</a><a class="cart" href="/?cart=1">Cart<span id="cartn">0</span></a></div></header>
<main class="wrap">${body}</main>
${FOOT}
<div class="toast" id="toast"></div>
<script>${CART_JS}</script>
<script>window.OUTRR_SUPA = { url: "${SUPA.url}", anon: "${SUPA.anon}" };</script>
<script src="/track.js"></script>
${view ? `<script>if(window.otrack)otrack('view_item',{sku:${JSON.stringify(view.sku)},value:${Math.round(+view.price || 0)}})</script>` : ''}
</body></html>`

const isMto = p => p.kind === 'mto'
// 163: the SEO pages are the shop itself (same product page, cards, cart) with this page's own head and text,
// opened on that view by window.OUTRR_ROUTE; the text below is what crawlers read before the shop draws.
let SHOP = readFileSync(join(ROOT, 'index.html'), 'utf8')
const crumbNav = items => `<nav class="crumb" aria-label="Breadcrumb">${items.map(([n, u], i) => i === items.length - 1 ? `<span>${esc(n)}</span>` : `<a href="${u}">${esc(n)}</a>`).join('<i>›</i>')}</nav>`
const shell = ({ title, desc, path, image, body, jsonld = [], keywords = [], route, h1 }) => {
  let h = SHOP
  // one h1 per page: the shop's own headings become plain text, except a product page's title (filled with the product name)
  h = h.replace(/<h1>The best room([\s\S]*?)<\/h1>/, '<div class="h1">The best room$1</div>')
  if (h1) h = h.replace('<div class="h1" id="pdT"></div>', `<h1 id="pdT">${esc(h1)}</h1>`)
  const set = (re, rep) => { h = h.replace(re, () => rep) }
  set(/<title>[\s\S]*?<\/title>/, `<base href="/"><title>${esc(title)}</title>`)
  set(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">${keywords.length ? `<meta name="keywords" content="${esc(keywords.join(', '))}">` : ''}`)
  set(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${SITE}${path}">`)
  set(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`)
  set(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`)
  set(/<meta property="og:type" content="[^"]*">/, `<meta property="og:type" content="${path.startsWith('/p/') ? 'product' : 'website'}">`)
  set(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${SITE}${path}">`)
  if (image) set(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${esc(image)}"><meta name="twitter:card" content="summary_large_image">`)
  set(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, jsonld.map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n') + `\n<script>window.OUTRR_ROUTE=${JSON.stringify(route).replace(/</g, '\\u003c')};document.documentElement.className+=' js'</script>`)
  set(/<body([^>]*)>/, (m => `<body${m[1].includes('class="') ? m[1].replace('class="', 'class="routing ') : m[1] + ' class="routing"'}>`)(h.match(/<body([^>]*)>/)))
  set(/<div id="plp">/, `<section id="seoBody">${body}</section>\n<div id="plp">`)
  return h
}
// listing / card photos: Supabase-resized (600 px) instead of the full original
const card = p => `<a class="card" href="/p/${p.slug}/"><div class="im"><img src="${esc(slim(p.image_url))}" alt="${esc(p.image_alt || p.name)}" loading="lazy" width="400" height="400"></div>
<div class="n">${esc(p.name)}</div><div class="p">${soon(p) ? SOON : isMto(p) ? `From ${inr(p.price)}` : `${inr(p.price)}${p.mrp > p.price ? `<s>${inr(p.mrp)}</s>` : ''}`}</div></a>`


// Amazon-style "Compare with similar items": same sub-category first, then closest price
const similar = (p, n = 4) => (ranked[p.collection_slug] || []).filter(x => x.sku !== p.sku)
  .map((x, i) => [x, (x.subcategory_slug && x.subcategory_slug === p.subcategory_slug ? 3 : 0) - Math.abs(Math.log((x.price || 1) / (p.price || 1))) - i / 2000 - (x.in_stock === false ? 5 : 0)])
  .sort((a, b) => b[1] - a[1]).slice(0, n).map(a => a[0])
const subT = Object.fromEntries(subs.map(x => [x.slug, x.title]))
const compare = p => {
  const L = [p, ...similar(p)]; if (L.length < 2) return ''
  const low = Math.min(...L.filter(x => !soon(x)).map(x => +x.price)), off = x => x.mrp > x.price ? Math.round((1 - x.price / x.mrp) * 100) : 0
  const rows = [
    ['', (x, i) => `<a href="/p/${x.slug}/">${i ? '' : '<span class="tg">THIS ITEM</span>'}<img src="${esc(slim(x.image_url))}" alt="${esc(x.name)}" loading="lazy" width="200" height="200"><b>${esc(x.name)}</b></a>`, 1],
    ['Price', x => soon(x) ? SOON : `<strong>${inr(x.price)}</strong>${+x.price === low && L.some(y => +y.price !== low) ? '<em>Lowest price</em>' : ''}`, 1],
    ['MRP · discount', x => !soon(x) && off(x) ? `<s>${inr(x.mrp)}</s> · ${off(x)}% off` : '—'],
    ['Type', x => esc(subT[x.subcategory_slug] || colOf[x.collection_slug]?.title || '—')],
    ['Material', x => esc(x.material || '—')],
    ['Size', x => esc(x.dims || '—')],
    ['Delivery', x => esc(x.ship_text || 'Ships in 7-10 days')],
  ]
  const body = rows.map(([h, f, keep]) => { const c = L.map(f); if (!keep && c.every(v => v === '—')) return ''
    return `<tr><th>${h}</th>${c.map((v, i) => `<td${i ? '' : ' class="me"'}>${v}</td>`).join('')}</tr>` }).join('')
  return `<section class="cmpx"><h2>Compare with similar items</h2><div class="cw"><table>${body}</table></div></section>`
}
// ---------------------------------------------------------------- write pages
// no live products yet (sellers not Active): keep the pages already in the repo instead of publishing an empty catalog
if (!products.length) { console.log('SEO pages: no live products right now, keeping the existing product pages, sitemap and feed'); process.exit(0) }
for (const d of ['p', 'c', 'feed']) if (existsSync(join(ROOT, d))) rmSync(join(ROOT, d), { recursive: true })
// 162: sub-category page URLs (also used by the footer)
const subPath = (c, x) => { let t = String(x.title || '').toLowerCase().replace(/&/g, ' and ').replace(/[—–]/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); return t || x.slug }
const subUrl = {}
for (const c of cols) { const seen = new Set(); for (const x of subs.filter(y => y.category_slug === c.slug)) { let k = subPath(c, x); if (seen.has(k)) k = x.slug; seen.add(k); subUrl[x.slug] = `/c/${c.slug}/${k}/` } }
// SEO footer (footer.mjs): from the live catalogue + Claude's homepage picks, the same on every page
const HOME = await fetch(`${SUPA.url}/rest/v1/rpc/home_public`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: '{}' }).then(r => r.ok ? r.json() : {}).catch(() => ({}))
const FOOT = buildFooter({ cols, subs, products, subUrl, home: HOME || {}, slugOf: p => p.slug, ranked })
SHOP = withFooter(SHOP, FOOT)   // every product / category page is a copy of the shop page
// the shop itself, the product page shell and the policy pages (build-pages.mjs) get the same footer
for (const f of ['index.html', 'product.html', ...['about', 'contact', 'privacy', 'returns', 'shipping', 'terms', 'warranty', 'payments', 'quote'].map(d => d + '/index.html')]) {
  const fp = join(ROOT, f); if (!existsSync(fp)) continue
  const t = readFileSync(fp, 'utf8'), n = withFooter(t, FOOT); if (n !== t) writeFileSync(fp, n)
}
const write = (rel, text) => { const f = join(ROOT, rel); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, text) }

for (const p of products) {
  const c = colOf[p.collection_slug], url = `/p/${p.slug}/`, desc = describe(p)
  const off = p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0
  const related = products.filter(x => x.collection_slug === p.collection_slug && x.sku !== p.sku).slice(0, 8)
  const jsonld = [...(soon(p) ? [] : [{
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.sku, image: [p.image_url], description: desc,
    brand: { '@type': 'Brand', name: 'outrr' }, category: c?.title,
    ...(p.material ? { material: p.material } : {}),
    ...(RATE[p.id]?.n > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: +RATE[p.id].rating, reviewCount: RATE[p.id].n, bestRating: 5, worstRating: 1 } } : {}),
    offers: isMto(p) ? { '@type': 'AggregateOffer', url: SITE + url, priceCurrency: 'INR', lowPrice: (+p.price).toFixed(2), offerCount: 1, availability: 'https://schema.org/PreOrder' } : { '@type': 'Offer', url: SITE + url, priceCurrency: 'INR', price: (+p.price).toFixed(2), itemCondition: 'https://schema.org/NewCondition',
      availability: p.in_stock === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'outrr' },
      shippingDetails: { '@type': 'OfferShippingDetails', shippingRate: { '@type': 'MonetaryAmount', value: 0, currency: 'INR' }, shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IN' } } },
  }]), {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
      ...(c ? [{ '@type': 'ListItem', position: 2, name: c.title, item: `${SITE}/c/${c.slug}/` }] : []),
      { '@type': 'ListItem', position: c ? 3 : 2, name: p.name, item: SITE + url }],
  }]
  write(`p/${p.slug}/index.html`, shell({ route: { p: p.sku }, h1: p.name,
    title: p.seo_title ? (/\| outrr$/.test(p.seo_title) ? p.seo_title : `${p.seo_title} | outrr`) : (soon(p) ? `${p.name} | Coming soon | outrr` : isMto(p) ? `${p.name} | Made to Size, from ${inr(p.price)} | outrr` : `${p.name} | Buy Online at ${inr(p.price)} | outrr`), desc: clip(p.seo_description || desc, 158), keywords: p.seo_keywords || [], path: url, image: p.image_url, jsonld, cur: p.collection_slug, view: p,
    body: `${crumbNav([['Home', '/'], ...(c ? [[c.title, `/c/${c.slug}/`]] : []), [p.name]])}<h2>${esc(p.name)}</h2><p>${soon(p) ? 'Coming soon' : `${isMto(p) ? 'From ' : ''}${inr(p.price)}${!isMto(p) && off ? ` (MRP ${inr(p.mrp)}, ${off}% off)` : ''} · inclusive of GST`}</p>
<p class="seo-intro">${esc(desc)}</p>${c ? `<p><a href="/c/${c.slug}/">More ${esc(c.title)}</a></p>` : ''}
${related.length ? `<h2>More in ${esc(c?.title || 'this range')}</h2><ul class="seo-list">${related.map(x => `<li><a href="/p/${x.slug}/">${esc(x.name)}</a></li>`).join('')}</ul>` : ''}`,
  }))
}

// 162: category and sub-category pages — own title / description / intro / FAQs (admin text first, else written from the catalogue)
const lc = t => String(t || '').split(' ').map(w => /^[A-Z0-9]{2,}$/.test(w) ? w : w.toLowerCase()).join(' ')
const priceSpan = L => { const ps = L.filter(p => !soon(p) && +p.price > 0).map(p => +p.price); return ps.length ? [Math.min(...ps), Math.max(...ps)] : null }
const COLW = /^(black|white|grey|gray|brown|natural|teak|walnut|charcoal|gold|silver|beige|cream|metal|multi.*)$/i
const topMats = L => { const m = {}; L.forEach(p => new Set(String(p.material || '').split(/[\/,;()+]| or | and | with /i).map(x => x.trim()).filter(x => x && x.length <= 22 && !COLW.test(x))).forEach(x => { m[x] = (m[x] || 0) + 1 })); return Object.keys(m).filter(k => m[k] >= Math.min(2, L.length)).sort((a, b) => m[b] - m[a]).slice(0, 4) }
function autoText(name, L, parent) {
  const mto = L.filter(isMto).length > L.length / 2, pr = priceSpan(L), mats = topMats(L), anySoon = L.every(soon)
  const inst = L.some(p => p.mto?.install?.required), instOpt = !inst && L.some(p => p.mto?.install?.offered)
  const unit = { area: 'sq ft of area', face: 'sq ft', length: 'running ft', seat: 'seat' }[L.find(isMto)?.mto?.unit] || ''
  const title = mto ? `${name} — Made to Your Size in India${pr ? ` | From ${inr(pr[0])}` : ''}` : `Buy ${name} Online in India${pr ? ` | From ${inr(pr[0])}` : ''}`
  const desc = mto
    ? `${L.length} ${lc(name)} designs made to your size${unit ? `, priced per ${unit.replace(/ of .*/, '')}` : ''}${mats.length ? ` in ${mats.slice(0, 3).join(', ')}` : ''}. ${inst ? 'Measured, made and installed by outrr.' : 'Drawing for your approval, delivered across India.'}`
    : `Shop ${L.length} ${lc(name)} designs${mats.length ? ` in ${mats.slice(0, 3).join(', ')}` : ''}${pr ? ` from ${inr(pr[0])}` : ''}. Built for Indian weather, GST invoice, delivered across India.`
  const intro = mto
    ? `Every ${lc(name)} design here is made for your space: enter your size and pick the finish and options to see the price${unit ? ` (worked out per ${unit})` : ''}. ${mats.length ? `Choose from ${mats.join(', ')}. ` : ''}We send a drawing for your approval before making it, you pay 50% to start and the rest before dispatch${inst ? ', and our partner installs it' : instOpt ? '; installation is available in many cities' : ''}.${anySoon ? ' Orders open soon — save your favourites.' : ''}`
    : `${L.length} ${lc(name)} designs for balconies, terraces and gardens${parent ? ` from our ${parent} range` : ''}, picked by the team behind 300+ outdoor projects.${mats.length ? ` Materials: ${mats.join(', ')}.` : ''}${pr ? ` Prices from ${inr(pr[0])} to ${inr(pr[1])}, inclusive of GST.` : ''} Delivery charge is shown for your pincode, with weather-safe packing and a GST invoice on every order.`
  const faqs = mto ? [
    { q: `How is the price of ${lc(name)} worked out?`, a: `By your size${unit ? ` (per ${unit})` : ''}, the finish and the options you pick — the price updates on the product page as you choose.` },
    { q: 'Do I see a drawing before it is made?', a: 'Yes. After you order, we send a drawing of your design and size for your approval; making starts only after you approve.' },
    { q: 'How do I pay?', a: 'You pay 50% online when you order and the rest when it is ready, before dispatch.' },
    { q: inst ? 'Is installation included?' : 'Can you install it?', a: inst ? 'Yes — an outrr partner measures and installs it. Enter your pincode on the product page to see the charge for your city.' : instOpt ? 'Installation is available in Delhi NCR and other cities; enter your pincode on the product page to see if it is available and its charge.' : 'It comes with a fixing guide.' },
    { q: 'How long does it take?', a: `Usually ${L.find(isMto)?.mto?.make_days?.join('–') || '10–25'} days to make after the drawing is approved, then delivery${inst ? ' and installation' : ''}.` }]
  : [{ q: `Do you deliver ${lc(name)} across India?`, a: 'Yes. The delivery charge for your pincode is shown before you pay, and every order is packed for the weather.' },
    { q: `Will ${lc(name)} survive rain and sun?`, a: 'Everything is picked for Indian outdoor conditions — UV-stable finishes and rust-proof hardware. Care tips are on each product page.' },
    { q: 'Do I get a GST invoice?', a: 'Yes, a GST invoice comes with every order.' },
    { q: 'What if something arrives damaged?', a: 'Report it within 48 hours with photos and it is replaced or repaired free.' }]
  return { title, desc, intro, faqs }
}
const faqHtml = fs => fs.length ? `<h2>Questions about this range</h2>${fs.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}` : ''
const faqLd = fs => fs.length ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: fs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }] : []
const listLd = (name, url, L) => ({ '@context': 'https://schema.org', '@type': 'CollectionPage', name, url: SITE + url, mainEntity: { '@type': 'ItemList', numberOfItems: L.length, itemListElement: L.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/p/${p.slug}/`, name: p.name })) } })
const crumbLd = items => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: SITE + u })) })
const subPages = []
for (const c of cols) {
  const list = ranked[c.slug] || []
  if (!list.length) continue
  const url = `/c/${c.slug}/`, gs = groupsOf(c.slug), real = gs.filter(g => subUrl[g.slug]), at = autoText(c.title, list)
  const faqs = Array.isArray(c.seo_faqs) && c.seo_faqs.length ? c.seo_faqs : at.faqs
  const nav = real.length > 1 ? `<nav class="subnav" aria-label="${esc(c.title)} types">${real.map(g => `<a href="${subUrl[g.slug]}">${esc(g.title)} (${g.items.length})</a>`).join('')}</nav>` : ''
  write(`c/${c.slug}/index.html`, shell({ route: { c: c.slug },
    title: `${clip(c.seo_title || at.title, 62)} | outrr`, desc: clip(c.seo_description || at.desc, 158),
    path: url, image: list[0].image_url, cur: c.slug,
    jsonld: [listLd(c.title, url, list), crumbLd([['Home', '/'], [c.title, url]]), ...faqLd(faqs)],
    body: `${crumbNav([['Home', '/'], [c.title]])}<h1>${esc(c.title)}</h1><p class="seo-intro">${esc(c.seo_intro || at.intro)}</p>
${real.length > 1 ? `<nav class="seo-subs" aria-label="${esc(c.title)} types">${real.map(g => `<a href="${subUrl[g.slug]}">${esc(g.title)} (${g.items.length})</a>`).join('')}</nav>` : ''}
<ul class="seo-list">${list.map(x => `<li><a href="/p/${x.slug}/">${esc(x.name)}</a></li>`).join('')}</ul>
${faqHtml(faqs)}`,
  }))
  for (const g of real) {
    const x = subs.find(y => y.slug === g.slug), su = subUrl[g.slug], st = autoText(g.title, g.items, c.title.toLowerCase())
    subPages.push(su)
    write(su.slice(1) + 'index.html', shell({ route: { c: c.slug, sub: g.title },
      title: `${clip(x.seo_title || st.title, 62)} | outrr`, desc: clip(x.seo_description || st.desc, 158),
      path: su, image: g.items[0].image_url, cur: c.slug,
      jsonld: [listLd(g.title, su, g.items), crumbLd([['Home', '/'], [c.title, url], [g.title, su]]), ...faqLd(st.faqs)],
      body: `${crumbNav([['Home', '/'], [c.title, url], [g.title]])}<h1>${esc(g.title)}</h1><p class="seo-intro">${esc(x.seo_intro || st.intro)}</p>
<nav class="seo-subs">${real.map(h => `<a href="${subUrl[h.slug]}">${esc(h.title)}</a>`).join('')}<a href="${url}">All ${esc(c.title)}</a></nav>
<ul class="seo-list">${g.items.map(x => `<li><a href="/p/${x.slug}/">${esc(x.name)}</a></li>`).join('')}</ul>${faqHtml(st.faqs)}`,
    }))
  }
}

write('slugs.json', JSON.stringify(Object.fromEntries(products.map(p => [p.sku, p.slug]))))   // 163: the shop links to these pages
// ---------------------------------------------------------------- sitemap, robots, Google Merchant feed
const POLICY = ['about', 'shipping', 'warranty', 'payments', 'returns', 'privacy', 'terms', 'contact'].map(k => [`${SITE}/${k}/`, today, '0.3'])
const urls = [[`${SITE}/`, today, '1.0'], ...POLICY, ...cols.filter(c => products.some(p => p.collection_slug === c.slug)).map(c => [`${SITE}/c/${c.slug}/`, today, '0.8']), ...subPages.map(u => [SITE + u, today, '0.7']),
  ...products.map(p => [`${SITE}/p/${p.slug}/`, (p.updated_at || today).slice(0, 10), '0.7'])]
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, d, pr]) => `  <url><loc>${u}</loc><lastmod>${d}</lastmod><priority>${pr}</priority></url>`).join('\n')}\n</urlset>\n`)
// 098: renamed products keep their old links: every earlier /p/<slug>/ → the current one (Cloudflare Pages _redirects)
const slugRows = await getAll('product_slugs?select=slug,product_id&order=slug').catch(() => [])
const curSlug = Object.fromEntries(products.map(p => [p.id, p.slug]))
const redir = slugRows.filter(r => curSlug[r.product_id] && r.slug !== curSlug[r.product_id]).map(r => `/p/${r.slug}/ /p/${curSlug[r.product_id]}/ 301\n/p/${r.slug} /p/${curSlug[r.product_id]}/ 301`)
// 173: Partition Screens merged into Privacy Screens; wall-top sub-categories renamed "Parapet …"
redir.push('/c/privacy-screens/cnc-jali-screens/* /c/privacy-screens/parapet-jali-screens/ 301', '/c/privacy-screens/louver-screens/* /c/privacy-screens/parapet-louver-screens/ 301',
  '/c/privacy-screens/hedge-screens/* /c/privacy-screens/parapet-hedge-screens/ 301', '/c/partition-screens/* /c/privacy-screens/:splat 301')
write('_redirects', redir.join('\n') + '\n')
write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /preview/\n\nSitemap: ${SITE}/sitemap.xml\n`)
const x = s => esc(s)
write('feed/google.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>
<title>outrr</title><link>${SITE}/</link><description>outrr outdoor furniture, lighting and decor</description>
${products.filter(p => !soon(p) && !isMto(p)).map(p => `<item>
  <g:id>${x(p.sku)}</g:id><g:title>${x(clip(p.name, 150))}</g:title><g:description>${x(clip(describe(p), 4900))}</g:description>
  <g:link>${SITE}/p/${p.slug}/</g:link><g:image_link>${x(p.image_url)}</g:image_link>
  <g:availability>${p.in_stock === false ? 'out_of_stock' : 'in_stock'}</g:availability><g:condition>new</g:condition>
  ${p.mrp > p.price && !isMto(p) ? `<g:price>${(+p.mrp).toFixed(2)} INR</g:price><g:sale_price>${(+p.price).toFixed(2)} INR</g:sale_price>` : `<g:price>${(+p.price).toFixed(2)} INR</g:price>`}
  <g:brand>outrr</g:brand><g:identifier_exists>no</g:identifier_exists><g:product_type>${x(colOf[p.collection_slug]?.title || 'Outdoor')}</g:product_type>
  <g:shipping><g:country>IN</g:country><g:price>0.00 INR</g:price></g:shipping>
</item>`).join('\n')}
</channel></rss>
`)
console.log(`SEO pages built: ${products.length} products, ${cols.length} categories, sitemap ${urls.length} URLs, Google feed ${products.filter(p => !soon(p) && !isMto(p)).length} items`)
