// SEO footer for every page of outrr.in — built from the live catalogue on every build (each push + the daily
// 6 am rebuild), so new categories, sub-categories, Made to Order ranges, the design studio and partner pages
// appear by themselves. Algorithm (no hand lists):
//   · Ready to ship / Made to Order: active categories split by what most of their listed products are,
//     ordered by the AI "categories by interest" (home_public.cats), then by how many products they have
//   · Popular types: the sub-categories with the most products (each has its own SEO page)
//   · Popular searches: Claude's homepage searches (home_public.searches) when there are any, else
//     "<space> <type>" phrases built from the products' Place tags × sub-categories, linking to that type's page
//   · Design studio: the cabin studios and pergola designers that exist (Made to Order products), + Get a quote
//   · Trending now: Claude's trending / in-season picks, else the newest listed products
// Used by build-seo.mjs: its own pages + index.html, product.html and the policy pages get the same footer.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const cap = s => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1)
const lc = t => String(t || '').split(' ').map(w => /^[A-Z0-9]{2,}$/.test(w) ? w : w.toLowerCase()).join(' ')
const SELL = 'https://seller.outrr.in'
const UTM = '?utm_source=outrr.in&utm_medium=site&utm_campaign=footer'
const CITIES = ['Delhi NCR', 'Gurugram', 'Noida', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Chandigarh', 'Jaipur', 'Lucknow']

export function buildFooter({ cols, subs, products, subUrl, home = {}, slugOf, ranked = {} }) {
  const by = {}; for (const p of products) (by[p.collection_slug] ||= []).push(p)
  const interest = Object.fromEntries((home.cats || []).map((s, i) => [s, i]))
  const order = (a, b) => (interest[a.slug] ?? 99) - (interest[b.slug] ?? 99) || (by[b.slug]?.length || 0) - (by[a.slug]?.length || 0)
  const live = cols.filter(c => (by[c.slug] || []).length).sort(order)
  // a category goes under each kind it really sells (3+ products of that kind, or all of it)
  const nK = (c, mto) => by[c.slug].filter(p => (p.kind === 'mto') === mto).length
  const has = (c, mto) => nK(c, mto) >= Math.min(3, by[c.slug].length)
  const rts = live.filter(c => has(c, false)), mto = live.filter(c => has(c, true))
  const colLink = c => `<a href="/c/${c.slug}/" data-col="${c.slug}">${esc(c.title)}</a>`

  // popular types: sub-categories with the most products
  const nSub = {}; for (const p of products) if (p.subcategory_slug && subUrl[p.subcategory_slug]) nSub[p.subcategory_slug] = (nSub[p.subcategory_slug] || 0) + 1
  const subOf = Object.fromEntries(subs.map(s => [s.slug, s]))
  const types = Object.keys(nSub).sort((a, b) => nSub[b] - nSub[a]).slice(0, 10).map(k => subOf[k]).filter(Boolean)

  // popular searches: AI first, else Place tag × sub-category phrases (most products first)
  let searches = (home.searches || []).filter(x => x && x.q).slice(0, 10).map(x => [cap(x.q), `/?q=${encodeURIComponent(x.q)}`])
  if (searches.length < 6) {
    const combo = {}
    for (const p of products) {
      const places = (p.tags || []).filter(t => /^Place:/i.test(t)).map(t => t.split(':')[1].trim())
      if (!p.subcategory_slug || !subUrl[p.subcategory_slug]) continue
      for (const pl of places) { const k = pl + '|' + p.subcategory_slug; combo[k] = (combo[k] || 0) + 1 }
    }
    const seen = new Set(searches.map(s => s[0].toLowerCase()))
    for (const k of Object.keys(combo).sort((a, b) => combo[b] - combo[a])) {
      const [pl, sl] = k.split('|'), t = `${cap(pl)} ${lc(subOf[sl]?.title || '')}`.trim()
      if (seen.has(t.toLowerCase()) || [...seen].filter(x => x.startsWith(pl.toLowerCase() + ' ')).length >= 2) continue
      seen.add(t.toLowerCase()); searches.push([t, subUrl[sl]]); if (searches.length >= 10) break
    }
    for (const s of types) { if (searches.length >= 10) break; const t = `${cap(lc(s.title.replace(/&/g, 'and')))} online`; if (!seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); searches.push([t, subUrl[s.slug]]) } }
  }

  // design studio: what can be designed on the site
  const mtoP = products.filter(p => p.kind === 'mto' && p.mto && typeof p.mto === 'object')
  const cabins = mtoP.filter(p => p.mto.unit === 'cabin').slice(0, 3)
  const pergola = mtoP.find(p => /^MTO-PG-/.test(p.sku) && p.mto.unit === 'area')
  const studio = [['Design it yourself', '/#dzSec'], ['Plan your space (terrace / lawn)', '/?plan'],
    ...cabins.map(p => [`Design your ${p.name.replace(/\s*[—–(-].*$/, '').trim()}`, `/p/${slugOf(p)}/`]),
    ...(pergola ? [['Pergola designer', `/p/${slugOf(pergola)}/`]] : []),
    ...mto.slice(0, 3).filter(c => !/cabin/.test(c.slug)).map(c => [`Made to size ${lc(c.title)}`, `/c/${c.slug}/`]),
    ['Get a quote (₹2 lakh+)', '/quote/']]

  // trending: AI picks, else newest
  const bySku = Object.fromEntries(products.map(p => [p.sku, p]))
  let trend = [...(home.trend?.skus || []), ...(home.season?.skus || []), ...(home.best?.skus || [])].map(s => bySku[s]).filter(Boolean)
  if (trend.length < 6) for (let i = 0; i < 3 && trend.length < 8; i++) for (const c of live) {   // else: the top-ranked products, one per category in interest order
    const p = (ranked[c.slug] || by[c.slug])[i]; if (p && !trend.includes(p)) trend.push(p); if (trend.length >= 8) break }
  trend = [...new Map(trend.map(p => [p.sku, p])).values()].slice(0, 8)

  const spaces = [['Balcony', 'sp-balcony'], ['Terrace', 'sp-terrace'], ['Garden', 'sp-garden'], ['Poolside', 'sp-poolside']]
  const year = new Date().getFullYear()
  const nP = products.length, nC = live.length

  const html = `<footer class="of"><div class="of-w">
<div class="of-cols">
  <div class="of-brand">
    <a href="/" class="of-logo"><img src="/img/outrr-lockup-white.png?v=3" alt="outrr — Every Outdoor Possibility" loading="lazy"></a>
    <p>Every outdoor possibility: ${nP}+ outdoor products in ${nC} categories${rts.length ? `, from ready-to-ship ${rts.slice(0, 3).map(c => esc(lc(c.title))).join(', ')}` : ''}${mto.length ? ` to made-to-size ${mto.slice(0, 4).map(c => esc(lc(c.title))).join(', ')}` : ''}. Delivered and installed across India.</p>
    <div class="of-tag">A LIFEWALL GROUP COMPANY</div>
    <p>WhatsApp support · <a href="mailto:support@outrr.in">support@outrr.in</a><br>Delhi NCR, India</p>
    <p><a href="https://www.instagram.com/lifewall_official/" target="_blank" rel="noopener">Instagram</a></p>
  </div>
  <div id="ftShop"><div class="fh">Ready to ship</div>${rts.map(colLink).join('')}</div>
  ${mto.length ? `<div><div class="fh">Made to order</div>${mto.map(colLink).join('')}</div>` : ''}
  <div><div class="fh">Design studio</div>${studio.map(([t, u]) => `<a href="${u}">${esc(t)}</a>`).join('')}</div>
  ${types.length ? `<div><div class="fh">Popular types</div>${types.map(s => `<a href="${subUrl[s.slug]}">${esc(s.title)}</a>`).join('')}</div>` : ''}
  <div><div class="fh">Partner with outrr</div>
    <a href="${SELL}/${UTM}" target="_blank" rel="noopener">Sell ready products</a><a href="${SELL}/make${UTM}" target="_blank" rel="noopener">Make outrr designs</a>
    <a href="${SELL}/install${UTM}" target="_blank" rel="noopener">Install outrr designs</a><a href="${SELL}/brand${UTM}" target="_blank" rel="noopener">Brand partners</a>
    <a href="${SELL}/#login" target="_blank" rel="noopener">Partner login</a>
    <div class="fh of-h2">Company</div><a href="/about/">About outrr</a><a href="/contact/">Contact us</a></div>
  <div><div class="fh">Help &amp; policies</div>
    <a href="/?track=">Track your order</a><a href="/?account=1">My account</a><a href="/shipping/">Shipping &amp; delivery</a><a href="/returns/#damage">Damage-free promise</a>
    <a href="/warranty/">Warranty policy</a><a href="/payments/">Payments</a><a href="/returns/">Returns &amp; cancellations</a><a href="/privacy/">Privacy policy</a><a href="/terms/">Terms of service</a></div>
</div>
${searches.length ? `<div class="of-row"><b>Popular searches</b>${searches.map(([t, u]) => `<a href="${u}">${esc(t)}</a>`).join('')}</div>` : ''}
${trend.length ? `<div class="of-row"><b>Trending now</b>${trend.map(p => `<a href="/p/${slugOf(p)}/">${esc(p.name)}</a>`).join('')}</div>` : ''}
<div class="of-row"><b>Shop by space</b>${spaces.map(([t, k]) => `<a href="/?c=${k}">${t}</a>`).join('')}</div>
<div class="of-pay"><span>UPI</span><span>Cards &amp; netbanking</span><span>Secured by Razorpay</span><span>Delivered across India</span></div>
<p class="of-city">Outdoor furniture, decor and made-to-size outdoor structures online in ${CITIES.join(', ')}: terrace, balcony, garden, poolside, café and farmhouse living by outrr.</p>
<p class="of-note">© ${year} outrr · LifeWall Greentech Private Limited · Made in India</p>
</div>
<style>
footer.of{background:#2E2E2E;color:#cfcbc2;padding:34px 0 22px;font:12px/1.5 Inter,Poppins,system-ui,sans-serif;margin-top:0}
footer.of .of-w{max-width:1280px;margin:0 auto;padding:0 20px}
footer.of a{color:#cfcbc2;text-decoration:none}footer.of a:hover{color:#fff}
footer.of .of-cols{display:grid;grid-template-columns:1.4fr repeat(6,1fr);gap:26px;margin-bottom:22px}
footer.of .of-cols>div>a{display:block;padding:3px 0;font-size:11.5px}
footer.of .fh{font-size:10.5px;letter-spacing:.09em;color:#fff;font-weight:800;margin-bottom:9px;text-transform:uppercase}
footer.of .of-h2{margin-top:14px}
footer.of .of-brand p{margin:8px 0;font-size:11.5px}footer.of .of-logo img{height:34px;width:auto}
footer.of .of-tag{font-size:10px;letter-spacing:.14em;color:#C26445;font-weight:800;margin-top:6px}
footer.of .of-row{border-top:1px solid #444;padding:10px 0;font-size:11.5px;display:flex;flex-wrap:wrap;gap:4px 14px}
footer.of .of-row b{color:#fff;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;margin-right:4px}
footer.of .of-pay{display:flex;flex-wrap:wrap;gap:8px;border-top:1px solid #444;padding-top:12px}footer.of .of-pay span{border:1px solid #555;border-radius:99px;padding:3px 10px;font-size:11px}
footer.of .of-city,footer.of .of-note{font-size:11px;color:#a8a49b;margin:10px 0 0}
@media(max-width:1100px){footer.of .of-cols{grid-template-columns:repeat(3,1fr)}footer.of .of-brand{grid-column:1/-1}}
@media(max-width:640px){footer.of .of-cols{grid-template-columns:1fr 1fr;gap:20px}}
</style></footer>`
  return html
}

// put the footer into a page: replaces its first <footer>…</footer> (pages without one are left alone)
export function withFooter(page, html) {
  const a = page.indexOf('<footer'), b = page.indexOf('</footer>', a)
  if (a < 0 || b < 0) return page
  return page.slice(0, a) + html + page.slice(b + '</footer>'.length)
}
