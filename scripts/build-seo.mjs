// Builds the search-engine pages for outdoo.in from the live catalog in Supabase:
//   p/<product>/index.html   one fast, crawlable page per product (title, description, price, JSON-LD)
//   c/<category>/index.html  one page per category, linking to its products
//   sitemap.xml, robots.txt, feed/google.xml (Google Merchant Center)
// Run it whenever products change, then Republish:  node scripts/build-seo.mjs
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = 'https://outdoo.in'
const html0 = readFileSync(join(ROOT, 'index.html'), 'utf8')
const SUPA = { url: html0.match(/OUTDOO_SUPA = \{ url: "([^"]+)"/)[1], anon: html0.match(/OUTDOO_SUPA = \{[^}]*anon: "([^"]+)"/)[1] }
const H = { apikey: SUPA.anon, Authorization: 'Bearer ' + SUPA.anon }
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
const TIER = { select: 'OUTDOO Select', exclusive: 'OUTDOO Exclusive', originals: 'OUTDOO Originals' }
const clip = (s, n) => (s = String(s || '').replace(/\s+/g, ' ').trim()).length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s

const products = (await get('products?status=eq.published&select=sku,name,price,mrp,ship_text,image_url,collection_slug,description,material,dims,tier,in_stock,updated_at&order=name&limit=5000'))
  .filter(p => p.price > 0)
const cols = await get('collections?active=eq.true&select=slug,title,tagline,sort&order=sort')
const colOf = Object.fromEntries(cols.map(c => [c.slug, c]))
const taken = new Set()
for (const p of products) { let sl = slug(p.name, p.sku); if (taken.has(sl)) sl = `${sl}-${String(p.sku).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`; taken.add(sl); p.slug = sl }
const today = new Date().toISOString().slice(0, 10)

const describe = p => p.description?.trim() || [
  `${p.name} from the OUTDOO ${colOf[p.collection_slug]?.title || 'outdoor'} range${colOf[p.collection_slug]?.tagline ? ` (${colOf[p.collection_slug].tagline.toLowerCase()})` : ''}.`,
  p.material ? `Made in ${p.material}.` : 'Built for Indian weather: sun, rain and dust.',
  p.dims ? `Size: ${p.dims}.` : '',
  `${p.ship_text || 'Ships in 7-10 days'}, free delivery to top metros, cash on delivery available.`,
].filter(Boolean).join(' ')

// ---------------------------------------------------------------- shared layout
const CSS = `:root{--terra:#C26445;--terra-deep:#A84F33;--olive:#55634A;--sand:#EADCC8;--sand-soft:#F6F1E7;--char:#2E2E2E;--muted:#7a756c;--line:#e6e0d4}
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Poppins,system-ui,sans-serif;color:var(--char);background:#fff;line-height:1.55;font-size:14.5px}
a{color:inherit;text-decoration:none}img{display:block;max-width:100%}
.wrap{max-width:1120px;margin:0 auto;padding:0 18px}
header{border-bottom:1px solid var(--line);position:sticky;top:0;background:#fff;z-index:5}
.hd{display:flex;align-items:center;gap:18px;height:62px}.logo{font:800 25px 'Plus Jakarta Sans',sans-serif;letter-spacing:-.03em}.logo b{color:var(--terra)}
.nav{display:flex;gap:16px;overflow-x:auto;flex:1;font-size:13.5px;font-weight:500;scrollbar-width:none}.nav a{white-space:nowrap;color:#555}.nav a:hover,.nav a.on{color:var(--terra)}
.cart{position:relative;font-weight:600;font-size:13.5px;border:1px solid var(--line);border-radius:99px;padding:7px 14px;white-space:nowrap}.cart span{background:var(--terra);color:#fff;border-radius:99px;font-size:11px;padding:1px 7px;margin-left:6px}
.crumbs{font-size:12.5px;color:var(--muted);margin:18px 0 10px}.crumbs a:hover{color:var(--terra)}
.pd{display:grid;grid-template-columns:1.1fr 1fr;gap:34px;margin-bottom:40px}
.pimg{background:var(--sand-soft);border-radius:16px;overflow:hidden;aspect-ratio:1}.pimg img{width:100%;height:100%;object-fit:cover}
h1{font-size:27px;line-height:1.2;margin:4px 0 10px;letter-spacing:-.01em}
.tier{display:inline-block;font-size:11.5px;font-weight:600;background:var(--sand-soft);color:var(--olive);border-radius:99px;padding:3px 10px}
.price{display:flex;align-items:baseline;gap:10px;margin:14px 0 4px}.price b{font-size:28px}.price s{color:var(--muted)}.price em{font-style:normal;color:#2E7D4F;font-weight:600}
.tax{font-size:12px;color:var(--muted)}
.btns{display:flex;gap:10px;margin:20px 0}.btn{flex:1;display:inline-flex;justify-content:center;align-items:center;border:0;border-radius:11px;padding:14px 18px;font:600 15px Poppins,sans-serif;cursor:pointer;background:var(--terra);color:#fff}.btn.alt{background:var(--olive)}.btn:disabled{opacity:.5}
.perks{list-style:none;display:grid;gap:7px;font-size:13.5px;border:1px solid var(--line);border-radius:12px;padding:14px 16px}.perks li:before{content:'✓';color:var(--olive);font-weight:700;margin-right:8px}
.desc{margin-top:20px}.desc h2,.rel h2,.cat h2{font-size:17px;margin-bottom:8px}.desc dl{display:grid;grid-template-columns:120px 1fr;gap:6px 12px;margin-top:12px;font-size:13.5px}.desc dt{color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.card .im{aspect-ratio:1;background:var(--sand-soft);border-radius:12px;overflow:hidden}.card .im img{width:100%;height:100%;object-fit:cover;transition:transform .3s}.card:hover img{transform:scale(1.04)}
.card .n{font-size:13.5px;font-weight:500;margin:8px 0 2px;line-height:1.35}.card .p{font-weight:700}.card .p s{font-weight:400;color:var(--muted);font-size:12px;margin-left:6px}
.rel{margin:10px 0 50px}.cat{margin:6px 0 50px}.cat .lead{color:var(--muted);margin-bottom:18px}
footer{background:var(--sand-soft);padding:30px 0;font-size:13px;color:#555}footer .cols{display:flex;gap:30px;flex-wrap:wrap;justify-content:space-between}footer a{display:block;margin:3px 0}footer a:hover{color:var(--terra)}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--char);color:#fff;border-radius:99px;padding:10px 18px;font-size:13px;opacity:0;transition:opacity .2s;pointer-events:none}.toast.on{opacity:1}
@media(max-width:760px){.pd{grid-template-columns:1fr;gap:18px}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}h1{font-size:22px}.hd{gap:12px}.logo{font-size:22px}}`

const CART_JS = `function _c(){try{return JSON.parse(localStorage.getItem('outdoo_cart')||'[]')}catch(e){return[]}}
function _cs(c){try{localStorage.setItem('outdoo_cart',JSON.stringify(c))}catch(e){}var n=c.reduce(function(a,x){return a+x.q},0),e=document.getElementById('cartn');if(e)e.textContent=n}
function addCart(id){var c=_c(),f=c.find(function(x){return x.id===id});f?f.q=Math.min(10,f.q+1):c.push({id:id,q:1});_cs(c);var t=document.getElementById('toast');t.textContent='Added to cart';t.classList.add('on');setTimeout(function(){t.classList.remove('on')},1600)}
_cs(_c());`

const page = ({ title, desc, path, image, body, jsonld = [], cur = '' }) => `<!doctype html>
<html lang="en-IN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${path}">
<meta property="og:type" content="${path.startsWith('/p/') ? 'product' : 'website'}"><meta property="og:site_name" content="OUTDOO">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${SITE}${path}">
${image ? `<meta property="og:image" content="${esc(image)}"><meta name="twitter:card" content="summary_large_image">` : ''}
<link rel="icon" href="/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@800&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style>
${jsonld.map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head><body>
<header><div class="wrap hd"><a class="logo" href="/">outd<b>oo</b></a>
<nav class="nav">${cols.map(c => `<a href="/c/${c.slug}/"${c.slug === cur ? ' class="on"' : ''}>${esc(c.title)}</a>`).join('')}</nav>
<a class="cart" href="/?cart=1">Cart<span id="cartn">0</span></a></div></header>
<main class="wrap">${body}</main>
<footer><div class="wrap cols">
<div><b>OUTDOO</b><br>Every Outdoor Possibility<br>A LifeWall Group Company<br>Free delivery to top metros · Cash on delivery</div>
<div><b>Shop</b>${cols.map(c => `<a href="/c/${c.slug}/">${esc(c.title)}</a>`).join('')}</div>
<div><b>OUTDOO</b><a href="/">Home</a><a href="https://seller.outdoo.in">Sell on OUTDOO</a></div>
</div></footer>
<div class="toast" id="toast"></div>
<script>${CART_JS}</script>
</body></html>`

const card = p => `<a class="card" href="/p/${p.slug}/"><div class="im"><img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy" width="400" height="400"></div>
<div class="n">${esc(p.name)}</div><div class="p">${inr(p.price)}${p.mrp > p.price ? `<s>${inr(p.mrp)}</s>` : ''}</div></a>`

// ---------------------------------------------------------------- write pages
for (const d of ['p', 'c', 'feed']) if (existsSync(join(ROOT, d))) rmSync(join(ROOT, d), { recursive: true })
const write = (rel, text) => { const f = join(ROOT, rel); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, text) }

for (const p of products) {
  const c = colOf[p.collection_slug], url = `/p/${p.slug}/`, desc = describe(p)
  const off = p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0
  const related = products.filter(x => x.collection_slug === p.collection_slug && x.sku !== p.sku).slice(0, 8)
  const jsonld = [{
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.sku, image: [p.image_url], description: desc,
    brand: { '@type': 'Brand', name: 'OUTDOO' }, category: c?.title,
    ...(p.material ? { material: p.material } : {}),
    offers: { '@type': 'Offer', url: SITE + url, priceCurrency: 'INR', price: (+p.price).toFixed(2), itemCondition: 'https://schema.org/NewCondition',
      availability: p.in_stock === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'OUTDOO' },
      shippingDetails: { '@type': 'OfferShippingDetails', shippingRate: { '@type': 'MonetaryAmount', value: 0, currency: 'INR' }, shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IN' } } },
  }, {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
      ...(c ? [{ '@type': 'ListItem', position: 2, name: c.title, item: `${SITE}/c/${c.slug}/` }] : []),
      { '@type': 'ListItem', position: c ? 3 : 2, name: p.name, item: SITE + url }],
  }]
  write(`p/${p.slug}/index.html`, page({
    title: `${p.name} | Buy Online at ${inr(p.price)} | OUTDOO`, desc: clip(desc, 158), path: url, image: p.image_url, jsonld, cur: p.collection_slug,
    body: `<div class="crumbs"><a href="/">Home</a> › ${c ? `<a href="/c/${c.slug}/">${esc(c.title)}</a> › ` : ''}${esc(p.name)}</div>
<div class="pd"><div class="pimg"><img src="${esc(p.image_url)}" alt="${esc(p.name)}" width="800" height="800"></div>
<div><span class="tier">${esc(TIER[p.tier] || TIER.select)}</span><h1>${esc(p.name)}</h1>
<div class="price"><b>${inr(p.price)}</b>${off ? `<s>${inr(p.mrp)}</s><em>${off}% off</em>` : ''}</div><div class="tax">Inclusive of all taxes · GST invoice</div>
<div class="btns">${p.in_stock === false ? '<button class="btn" disabled>Out of stock</button>' : `<button class="btn" onclick="addCart('${esc(p.sku)}')">Add to cart</button><a class="btn alt" href="/?buy=${encodeURIComponent(p.sku)}">Buy now</a>`}</div>
<ul class="perks"><li>${esc(p.ship_text || 'Ships in 7-10 days')}</li><li>Free delivery to top metros</li><li>Cash on delivery available</li><li>Weather-safe packing · assembly guide included</li></ul>
<div class="desc"><h2>About this product</h2><p>${esc(desc)}</p>
<dl>${c ? `<dt>Category</dt><dd><a href="/c/${c.slug}/">${esc(c.title)}</a></dd>` : ''}${p.material ? `<dt>Material</dt><dd>${esc(p.material)}</dd>` : ''}${p.dims ? `<dt>Size</dt><dd>${esc(p.dims)}</dd>` : ''}<dt>SKU</dt><dd>${esc(p.sku)}</dd></dl></div>
</div></div>
${related.length ? `<section class="rel"><h2>More in ${esc(c?.title || 'this range')}</h2><div class="grid">${related.map(card).join('')}</div></section>` : ''}`,
  }))
}

// category pages follow the admin ranking (Settings → Search & ranking); name order if it isn't available
const rankOf = async cat => {
  try {
    const r = await fetch(`${SUPA.url}/rest/v1/rpc/search_products`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ q: '', p_category: cat, p_limit: 500 }) })
    if (!r.ok) return {}
    return Object.fromEntries((await r.json()).map((x, i) => [x.sku, i]))
  } catch { return {} }
}
for (const c of cols) {
  const rk = await rankOf(c.slug)
  const list = products.filter(p => p.collection_slug === c.slug).sort((a, b) => (rk[a.sku] ?? 1e9) - (rk[b.sku] ?? 1e9))
  if (!list.length) continue
  const url = `/c/${c.slug}/`
  write(`c/${c.slug}/index.html`, page({
    title: `${c.title} Online in India | ${list.length} Designs | OUTDOO`,
    desc: clip(`Shop ${c.title.toLowerCase()} online at OUTDOO: ${c.tagline ? c.tagline.toLowerCase() + '. ' : ''}${list.length} designs built for Indian weather, free delivery to top metros, cash on delivery.`, 158),
    path: url, image: list[0].image_url, cur: c.slug,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: c.title, url: SITE + url,
      mainEntity: { '@type': 'ItemList', itemListElement: list.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/p/${p.slug}/` })) } }],
    body: `<div class="crumbs"><a href="/">Home</a> › ${esc(c.title)}</div><section class="cat"><h1>${esc(c.title)}</h1>
<p class="lead">${esc(c.tagline || '')}${c.tagline ? ' · ' : ''}${list.length} designs · free delivery to top metros · cash on delivery</p>
<div class="grid">${list.map(card).join('')}</div></section>`,
  }))
}

// ---------------------------------------------------------------- sitemap, robots, Google Merchant feed
const urls = [[`${SITE}/`, today, '1.0'], ...cols.filter(c => products.some(p => p.collection_slug === c.slug)).map(c => [`${SITE}/c/${c.slug}/`, today, '0.8']),
  ...products.map(p => [`${SITE}/p/${p.slug}/`, (p.updated_at || today).slice(0, 10), '0.7'])]
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, d, pr]) => `  <url><loc>${u}</loc><lastmod>${d}</lastmod><priority>${pr}</priority></url>`).join('\n')}\n</urlset>\n`)
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`)
const x = s => esc(s)
write('feed/google.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>
<title>OUTDOO</title><link>${SITE}/</link><description>OUTDOO outdoor furniture, lighting and decor</description>
${products.map(p => `<item>
  <g:id>${x(p.sku)}</g:id><g:title>${x(clip(p.name, 150))}</g:title><g:description>${x(clip(describe(p), 4900))}</g:description>
  <g:link>${SITE}/p/${p.slug}/</g:link><g:image_link>${x(p.image_url)}</g:image_link>
  <g:availability>${p.in_stock === false ? 'out_of_stock' : 'in_stock'}</g:availability><g:condition>new</g:condition>
  ${p.mrp > p.price ? `<g:price>${(+p.mrp).toFixed(2)} INR</g:price><g:sale_price>${(+p.price).toFixed(2)} INR</g:sale_price>` : `<g:price>${(+p.price).toFixed(2)} INR</g:price>`}
  <g:brand>OUTDOO</g:brand><g:identifier_exists>no</g:identifier_exists><g:product_type>${x(colOf[p.collection_slug]?.title || 'Outdoor')}</g:product_type>
  <g:shipping><g:country>IN</g:country><g:price>0 INR</g:price></g:shipping>
</item>`).join('\n')}
</channel></rss>
`)
console.log(`SEO pages built: ${products.length} products, ${cols.length} categories, sitemap ${urls.length} URLs, Google feed ${products.length} items`)
