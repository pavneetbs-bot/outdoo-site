/* outrr brand store: a seller's page in the home-page theme (Amazon / Pepperfry style)
   /?store=<slug>[&token=<preview token>]  → a seller on outrr (seller_page RPC); products are real catalog products
   /?pitch=<slug>[&team=1]                → a sample page the team made for a prospect (pitch_open RPC); its products
                                            go in the cart like real ones but can't be ordered until the brand joins
   Old links /seller/?s= and /preview/?s= redirect here. */
(function () {
  var Q = new URLSearchParams(location.search)
  var slug = (Q.get('store') || Q.get('pitch') || '').trim().toLowerCase()
  if (!slug) return
  var PITCH = Q.has('pitch'), team = Q.get('team') === '1', token = Q.get('token') || null
  var S = window.OUTRR_SUPA || {}, root = document.getElementById('store')
  if (!root || typeof PRODS === 'undefined') return
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
  var D = null, IDS = [], CATS = [], TAB = 'home', SORT = 'pop', FIND = '', NAME = ''

  // ---------- styles (home theme tokens) ----------
  var css = document.createElement('style')
  css.textContent = [
    '.stbar{background:#2E2E2E;color:#fff;font-size:12px;line-height:1.3;padding:7px 14px;display:flex;gap:10px;align-items:center;justify-content:center;text-align:center}',
    '.stbar b{color:#F3C9B5;font-weight:700}.stbar a{color:#fff;font-weight:700;text-decoration:underline;white-space:nowrap;cursor:pointer}',
    '#store{padding-bottom:10px}',
    '.sthero{position:relative;height:clamp(240px,34vw,500px);overflow:hidden;background:linear-gradient(120deg,#BE5633,#6d3a25)}',
    '.sthero img{width:100%;height:100%;object-fit:cover;display:block}',
    '.sthero::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(20,18,14,.72) 0%,rgba(20,18,14,.35) 45%,rgba(20,18,14,0) 75%)}',
    '.sthero .tx{position:absolute;z-index:2;left:max(16px,calc((100vw - 1132px)/2));top:50%;transform:translateY(-62%);color:#fff;max-width:540px;padding-right:16px}',
    '.stban{display:block;width:100%;height:auto;max-height:min(520px,70vw);object-fit:contain;border-radius:18px;background:var(--sand-soft)}',
    '.sthero.own{height:clamp(200px,31vw,470px);background:var(--sand-soft)}.sthero.own::after{display:none}.sthero.own img{object-position:center}',
    '.stauto{display:grid;grid-template-columns:1fr 1.15fr;min-height:clamp(260px,32vw,460px);background:var(--bg)}',
    '.stauto .tx{align-self:center;padding:28px 28px 64px max(16px,calc((100vw - 1132px)/2));color:var(--char)}',
    '.stauto .k{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--ac)}',
    '.stauto h1{font-size:clamp(28px,4vw,50px);line-height:1.05;font-weight:800;margin:8px 0 10px;letter-spacing:-.02em;color:var(--ac)}',
    '.stauto p{font-size:clamp(13px,1.2vw,15.5px);line-height:1.5;opacity:.85;max-width:460px}',
    '.stauto .th{display:flex;gap:8px;margin-top:14px}.stauto .th img{width:58px;height:58px;border-radius:12px;object-fit:cover;border:2px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.1)}',
    '.stauto .cta{display:inline-block;margin-top:16px;background:var(--ac);color:var(--bg);font-weight:700;font-size:13px;padding:11px 20px;border-radius:99px;cursor:pointer}',
    '.stauto .pic{position:relative;overflow:hidden}.stauto .pic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}',
    '.sthero .k{font-size:11px;font-weight:800;letter-spacing:.12em;opacity:.85;text-transform:uppercase}',
    '.sthero h1{font-size:clamp(28px,4.2vw,52px);line-height:1.06;font-weight:800;margin:8px 0 10px;letter-spacing:-.02em;color:#fff}',
    '.sthero p{font-size:clamp(13px,1.3vw,16px);line-height:1.5;opacity:.92;color:#fff}',
    '.sthero .cta{display:inline-block;margin-top:16px;background:#fff;color:var(--char);font-weight:700;font-size:13px;padding:11px 20px;border-radius:99px;cursor:pointer}',
    '.stcard{position:relative;z-index:3;margin-top:-46px;background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.08);padding:14px 18px;display:flex;gap:16px;align-items:center}',
    '.stcard .lg{width:72px;height:72px;border-radius:14px;background:var(--olive-soft);color:var(--terra-deep);display:grid;place-items:center;font-weight:800;font-size:24px;flex:none;border:1px solid var(--line);overflow:hidden}',
    '.stcard .lg img{width:100%;height:100%;object-fit:cover}',
    '.stcard .nm{flex:1 1 0;min-width:0}.stcard h2{font-size:21px;margin:0 0 4px;line-height:1.2}',
    '.stcard .mt{font-size:12.5px;color:var(--muted);display:flex;gap:4px 12px;flex-wrap:wrap;align-items:center}.stcard .mt b{color:var(--char)}',
    '.stcard .vf{background:#EAF3E6;color:#3E6B35;font-weight:700;font-size:11px;padding:2px 8px;border-radius:99px}.stcard .vf.smp{background:var(--terra-soft);color:var(--terra-deep)}',
    '.stcard .acts{display:flex;gap:8px;flex:none}.stcard .acts button{border:1px solid var(--terra);background:#fff;color:var(--terra-deep);border-radius:99px;padding:9px 16px;font:700 12.5px inherit;font-family:inherit;cursor:pointer}',
    '.stcard .acts button.f{background:var(--terra);color:#fff}',
    '.stnav{position:sticky;top:var(--stk,0px);z-index:20;background:#fff;border-bottom:1px solid var(--line);margin-top:14px}',
    '.stnav .in{display:flex;align-items:center;gap:20px}',
    '.stnav .lab{font-size:11px;font-weight:800;letter-spacing:.08em;color:var(--terra-deep);white-space:nowrap;padding-right:14px;border-right:1px solid var(--line);text-transform:uppercase;max-width:240px;overflow:hidden;text-overflow:ellipsis}',
    '.stnav .tabs{display:flex;gap:20px;overflow-x:auto;scrollbar-width:none;flex:1}.stnav .tabs::-webkit-scrollbar{display:none}',
    '.stnav .tabs a{padding:13px 0;font-size:13.5px;font-weight:600;color:#555;border-bottom:2px solid transparent;white-space:nowrap;cursor:pointer}',
    '.stnav .tabs a.on{color:var(--terra-deep);border-color:var(--terra)}',
    '.stnav input{border:1px solid var(--line);border-radius:99px;padding:8px 14px;font:inherit;font-size:12.5px;width:210px;background:var(--sand-soft)}',
    '.prow{display:grid;grid-template-columns:1fr 1fr;gap:14px}',
    '.pban{position:relative;border-radius:18px;overflow:hidden;aspect-ratio:16/10;cursor:pointer;background:var(--sand-soft)}',
    '.pban img{width:100%;height:100%;object-fit:cover}',
    '.pban::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,18,14,0) 40%,rgba(20,18,14,.7))}',
    '.pban .tx{position:absolute;z-index:2;left:20px;bottom:18px;right:20px;color:#fff}',
    '.pban small{font-size:11px;font-weight:800;letter-spacing:.1em;opacity:.9;text-transform:uppercase}.pban h3{font-size:clamp(20px,2.2vw,28px);font-weight:800;margin:4px 0 8px;line-height:1.1;color:#fff}',
    '.pban .tx span{display:inline-block;background:#fff;color:var(--char);font-size:12px;font-weight:700;padding:8px 14px;border-radius:99px}',
    '.wide{position:relative;border-radius:18px;overflow:hidden;height:clamp(220px,30vw,420px);cursor:pointer;background:var(--sand-soft)}',
    '.wide img{width:100%;height:100%;object-fit:cover}',
    '.wide::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(20,18,14,.7),rgba(20,18,14,0) 65%)}',
    '.wide .tx{position:absolute;z-index:2;left:clamp(18px,4vw,48px);top:50%;transform:translateY(-50%);color:#fff;max-width:440px}',
    '.wide small{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.wide h3{font-size:clamp(24px,3.2vw,40px);font-weight:800;line-height:1.08;margin:6px 0 10px;color:#fff}.wide p{font-size:14px;opacity:.9;line-height:1.5;color:#fff}',
    '.wide .cta{display:inline-block;margin-top:14px;background:var(--terra);color:#fff;font-size:13px;font-weight:700;padding:10px 18px;border-radius:99px}',
    '.stcats{display:grid;grid-template-columns:repeat(6,1fr);gap:14px}',
    '.otile .smp{position:absolute;left:8px;top:8px;background:rgba(46,46,46,.72);color:#fff;font-size:9.5px;font-weight:700;border-radius:5px;padding:2px 6px}',
    '.otile .pw .pol{font-size:12px;color:var(--terra-deep);font-weight:600}',
    '.kits{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}',
    '.kit{background:#fff;border:1px solid var(--line);border-radius:16px;overflow:hidden;display:flex;flex-direction:column}',
    '.kit .im{position:relative;aspect-ratio:4/3;background:var(--sand-soft)}.kit .im img{width:100%;height:100%;object-fit:cover}',
    '.kit .save{position:absolute;top:10px;left:10px;background:var(--olive);color:#fff;font-size:10px;font-weight:800;padding:4px 8px;border-radius:6px}',
    '.kit .bd{padding:13px 14px 15px;display:flex;flex-direction:column;flex:1}',
    '.kit h3{font-size:15.5px;font-weight:800}.kit .kn{font-size:11.5px;color:var(--muted);line-height:1.5;margin:5px 0 10px}',
    '.kit .its{display:flex;gap:6px;margin-bottom:10px;align-items:center}.kit .its img{width:44px;height:44px;border-radius:8px;object-fit:cover;border:1px solid var(--line);cursor:pointer}',
    '.kit .its b{font-size:11px;color:var(--muted);margin-left:2px}',
    '.kit .pr{font-size:18px;font-weight:800;margin-top:auto}.kit .pr s{font-size:12px;color:var(--muted);font-weight:500;margin-left:6px}',
    '.kit .pr small{display:block;font-size:10.5px;color:var(--muted);font-weight:600}',
    '.kit .bt{display:flex;gap:8px;margin-top:10px}.kit .bt button{flex:1;border-radius:10px;padding:10px 6px;font-weight:700;font-size:12px;font-family:inherit;border:1px solid var(--terra);background:#fff;color:var(--terra-deep);cursor:pointer}',
    '.kit .bt button.f{background:var(--terra-deep);color:#fff}',
    '.kit .sty{position:absolute;right:10px;bottom:10px;background:rgba(255,255,255,.9);color:var(--char);font-size:10px;font-weight:700;padding:3px 8px;border-radius:99px}',
    '.kit .kw{margin-bottom:8px}.kit .kw>span{display:block;font-size:11px;color:var(--muted);margin-bottom:4px}.kit .kw b{color:var(--char)}.kit .kw .its{margin:0}',
    '.rvs{display:grid;grid-template-columns:240px repeat(3,1fr);gap:14px}',
    '.rvsum{background:var(--olive-soft);border-radius:16px;padding:18px}.rvsum b{font-size:40px;font-weight:800;display:block;line-height:1}',
    '.rvsum .st,.rvc .st{color:#E0A100;font-size:16px;margin:6px 0}.rvsum small{color:var(--muted);font-size:12px}',
    '.rvc{border:1px solid var(--line);border-radius:16px;padding:16px;background:#fff}.rvc p{font-size:13px;line-height:1.55;margin:4px 0 8px}.rvc small{font-size:11.5px;color:var(--muted)}',
    '.stab{display:grid;grid-template-columns:1.1fr 1fr;gap:22px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:18px;padding:22px}',
    '.stab small{font-size:11px;font-weight:800;letter-spacing:.1em;color:var(--terra-deep)}.stab h3{font-size:22px;font-weight:800;margin:4px 0 8px}.stab p{font-size:14px;line-height:1.65;color:#444;white-space:pre-line}',
    '.stab .gal{max-width:340px;justify-self:end;display:grid;grid-template-columns:1fr 1fr;gap:8px}.stab .gal img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px}',
    '.stall .bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px}.stall .bar h2{font-size:20px;margin-right:auto}',
    '.stall select{border:1px solid var(--line);border-radius:10px;padding:8px 10px;font:inherit;font-size:13px;background:#fff}',
    '.stall .none{color:var(--muted);padding:30px 0}',
    '.stclaim{text-align:center;padding:30px 20px;border-radius:18px;background:var(--sand-soft)}.stclaim h2{font-size:22px;margin-bottom:6px}.stclaim p{color:var(--muted);margin-bottom:14px;font-size:14px}',
    '.stclaim a{display:inline-block;background:var(--terra);color:#fff;font-weight:700;padding:11px 20px;border-radius:99px;text-decoration:none}',
    '.stempty{text-align:center;padding:80px 20px}.stempty h1{font-size:24px;margin-bottom:8px}.stempty p{color:var(--muted)}.stempty a{display:inline-block;margin-top:16px;background:var(--terra);color:#fff;text-decoration:none;border-radius:99px;padding:11px 20px;font-weight:700}',
    '.stload{padding:120px 0;text-align:center;color:var(--muted)}',
    '@media(min-width:900px){.otiles.st4{grid-template-columns:repeat(4,1fr)}}',
    '@media(max-width:760px){body.store .shopnav{display:none}',
    ' .stauto{grid-template-columns:1fr}.stauto .pic{height:190px;order:-1}.stauto .tx{padding:18px 16px 56px}.sthero.own{height:auto;aspect-ratio:16/9}',
    ' .sthero{height:360px}.sthero::after{background:linear-gradient(180deg,rgba(20,18,14,.15),rgba(20,18,14,.75))}.sthero .tx{top:auto;bottom:58px;transform:none}',
    ' .stcard{margin-top:-34px;flex-wrap:wrap;padding:12px}.stcard .lg{width:54px;height:54px;font-size:18px}.stcard h2{font-size:18px}.stcard .acts{width:100%}.stcard .acts button{flex:1}',
    ' .stnav input,.stnav .lab{display:none}.prow{grid-template-columns:1fr}.stcats{grid-template-columns:repeat(3,1fr)}',
    ' .kits{display:flex;overflow-x:auto;scrollbar-width:none;padding-bottom:6px}.kit{flex:0 0 78%}',
    ' .rvs{display:flex;overflow-x:auto;scrollbar-width:none}.rvsum,.rvc{flex:0 0 78%}.stab{grid-template-columns:1fr;padding:16px}.stab .gal{justify-self:stretch;max-width:none}}'
  ].join('\n')
  document.head.appendChild(css)
  document.body.classList.add('store')

  // the thin top strip replaces the launch ticker
  function topBar(html) {
    var b = document.querySelector('.stbar')
    if (!b) { b = document.createElement('div'); b.className = 'stbar'; b.setAttribute('role', 'status'); document.body.prepend(b) }
    b.innerHTML = html
  }
  var an0 = document.querySelector('.announce'); if (an0) an0.remove()   // no launch ticker on store pages
  root.innerHTML = '<div class="stload">Loading…</div>'
  window.storeShow = function () { showView('store') }
  showView('store')
  history.replaceState({ v: 'store' }, '', location.pathname + location.search)
  window.showHome = function () { location.href = '/' }   // the logo leaves the store for the outrr home page

  function none(t, b, cta) {
    document.title = t + ' | outrr'
    root.innerHTML = '<div class="wrap stempty"><h1>' + esc(t) + '</h1><p>' + esc(b) + '</p><a href="' + (cta || '/') + '">' + (cta ? 'Apply to sell on outrr' : 'Shop outrr') + '</a></div>'
    var b2 = document.querySelector('.stbar'); if (b2) b2.remove()
  }
  function rpc(fn, args) {
    return fetch(S.url + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: S.anon, Authorization: 'Bearer ' + S.anon, 'Content-Type': 'application/json' }, body: JSON.stringify(args) })
      .then(function (r) { return r.ok ? r.json() : null })
  }
  if (!S.url) return none('Page not available', 'Please try again later.')

  var claimUrl = function () { return 'https://seller.outrr.in/?pitch=' + encodeURIComponent(slug) + '&utm_source=pitch&utm_medium=preview&utm_campaign=' + encodeURIComponent(slug) + '#apply' }
  var load
  if (PITCH) {
    var sid; try { sid = sessionStorage.getItem('outrr_pv_sid'); if (!sid) { sid = Math.random().toString(36).slice(2, 12); sessionStorage.setItem('outrr_pv_sid', sid) } } catch (e) { sid = Math.random().toString(36).slice(2, 12) }
    load = rpc('pitch_open', { p_slug: slug, p_sid: sid, p_device: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop', p_count: !team })
  } else load = rpc('seller_page', { p_slug: slug, p_token: token })
  // seller pages use the live catalog: wait for it (max ~4 s)
  var ready = new Promise(function (res) { var n = 0; (function w() { if (window.__odLoaded || ++n > 40) res(); else setTimeout(w, 100) })() })
  Promise.all([load, ready]).then(function (r) {
    var d = r[0]
    if (!d || !d.available) {
      if (PITCH) return d && d.expired ? none('This preview has expired', 'Ask the outrr team for a fresh link, or apply to sell on outrr directly.', 'https://seller.outrr.in/?utm_source=pitch&utm_medium=preview_expired#apply') : none('Preview not found', 'Check the link the outrr team sent you.')
      return none(d && d.name ? d.name + ' isn’t showing a page right now' : 'Seller page not found', d && d.name ? 'Their products are still on outrr.' : 'Check the link, or browse everything on outrr.')
    }
    D = d; build()
  }).catch(function () { none('Couldn’t load this page', 'Please check your connection and try again.') })

  // ---------- data → PRODS ----------
  function build() {
    NAME = D.brand && D.brand !== D.name ? D.brand : (D.brand || D.name)
    var colOk = function (c) { return c && COLS[c] ? c : (D.categories && D.categories[0] && COLS[D.categories[0].slug] ? D.categories[0].slug : Object.keys(COLS)[0]) }
    IDS = []
    ;(D.products || []).forEach(function (p, i) {
      if (PITCH) {
        if (!p || !p.name) return
        var id = 'pv:' + slug + ':' + i, pr = Math.round(+p.price || 0)
        PRODS[id] = { n: String(p.name), p: pr, m: Math.round(+p.mrp || 0), r: '4.5', c: 0, ship: 'Orders open when ' + NAME + ' joins outrr', img: id, col: colOk(p.cat), pv: NAME, smp: !!p.sample, mat: '', dim: '', kg: 0, stock: true, tier: 'select' }
        IMGS[id] = p.image || ''
        IDS.push(id)
      } else {
        var k = p.sku
        if (!PRODS[k]) {   // unpublished preview, or the live catalog didn't load
          PRODS[k] = { n: p.name, p: Math.round(+p.price), m: p.mrp ? Math.round(+p.mrp) : 0, r: String(p.rating || '4.5'), c: p.rating_count || 0, ship: p.ship_text || 'Ships in 7-10 days', img: k, col: colOk(p.collection_slug), stock: p.in_stock, tier: 'select', mat: '', dim: '', kg: 0 }
          IMGS[k] = p.image_url || ''
        }
        IDS.push(k)
      }
    })
    var seen = {}
    CATS = []
    IDS.forEach(function (id) { var c = PRODS[id].col; if (!seen[c]) { seen[c] = 1; CATS.push({ slug: c, title: (COLS[c] && COLS[c].t) || c, ids: [] }) } })
    IDS.forEach(function (id) { CATS.filter(function (c) { return c.slug === PRODS[id].col })[0].ids.push(id) })
    // sub-categories read better than broad categories when a seller sells in one category
    if (CATS.length === 1 && typeof subOf === 'function') {
      var subs = {}; IDS.forEach(function (id) { var s = subOf(id); if (s && s !== 'All' && s !== 'More') (subs[s] = subs[s] || []).push(id) })
      var keys = Object.keys(subs); if (keys.length >= 2) CATS = keys.map(function (s) { return { slug: 'sub:' + s, title: s, ids: subs[s] } })
    }

    document.title = NAME + (PITCH ? ' on outrr (preview)' : (D.tagline ? ' – ' + D.tagline : '') + ' | outrr')
    if (PITCH || !D.published) { var m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex, nofollow'; document.head.appendChild(m) }
    var md = document.querySelector('meta[name=description]'); if (md) md.content = (D.tagline || ('Shop ' + NAME + ' on outrr')) + '. ' + IDS.length + ' products, free delivery to top metros.'
    var q = document.getElementById('q'); if (q) q.placeholder = 'Search all of outrr'

    if (PITCH) topBar(D.claimed ? '<span><b>' + esc(NAME) + '</b> has claimed this page. It goes live once the seller account is set up.</span>'
      : '<span>A <b>sample page</b> outrr made for ' + esc(NAME) + '. Orders open once they join.</span><a href="' + claimUrl() + '" data-claim>Claim this page</a>')
    else if (!D.published) topBar('<span><b>Preview:</b> your page isn’t published yet. Only you and the outrr team can see it.</span>' + (D.plan === 'free' ? '<a href="https://seller.outrr.in/#plan">Publish</a>' : ''))
    else { var b = document.querySelector('.stbar'); if (b) b.remove() }
    var st = document.querySelector('.stickytop'); if (st) document.documentElement.style.setProperty('--stk', st.offsetHeight + 'px')
    render()
    Array.prototype.forEach.call(document.querySelectorAll('[data-claim]'), function (a) { a.addEventListener('click', function () { if (window.otrack) otrack('pitch_claim', { path: '/preview/' + slug }) }) })
    if (window.otrack) otrack('page_view', { path: (PITCH ? '/preview/' : '/seller/') + slug })
    if (!PITCH && D.rating_count) reviews()
    if (PITCH) loadKits()
  }

  // product page: their products show their name, and sample products show only their own photo
  var by0 = (document.querySelector('.byline') || {}).innerHTML, op = window.openProduct
  window.openProduct = function (id) {
    op(id)
    var mine = IDS.indexOf(id) >= 0, by = document.querySelector('.byline')
    if (by) by.innerHTML = mine ? 'By <b>' + esc(NAME) + '</b>' : by0
    Array.prototype.forEach.call(document.querySelectorAll('.thumbs .th'), function (t, i) { t.style.display = i && PRODS[id] && PRODS[id].pv ? 'none' : '' })
  }

  // ---------- pieces ----------
  var priced = function (id) { return PRODS[id].p > 0 }
  function tile(id) {
    var x = PRODS[id], ok = priced(id) && x.stock !== false
    return '<div class="otile" onclick="' + (priced(id) ? 'openProduct(\'' + id + '\')' : '') + '"><div class="im"><img src="' + esc(IMGS[x.img] || '') + '" alt="' + esc(x.n) + '" loading="lazy">'
      + (x.smp ? '<span class="smp">Sample image</span>' : '')
      + (ok ? '<span class="addp" onclick="event.stopPropagation();addCart(\'' + id + '\')">+ Add</span>' : '') + '</div>'
      + '<div class="nm2">' + esc(x.n) + '</div><div class="pw">' + (priced(id) ? inr(x.p) + (x.m > x.p ? '<s>' + inr(x.m) + '</s>' : '') : '<span class="pol">Price on listing</span>') + (x.stock === false ? ' <span class="pol">Out of stock</span>' : '') + '</div></div>'
  }
  var tiles = function (l, cls) { return '<div class="otiles ' + (cls || 'st4') + '">' + l.map(tile).join('') + '</div>' }
  var sec = function (h, p, body, more) { return '<div class="sec2"><div class="sh"><h2>' + h + '</h2>' + (p ? '<p>' + p + '</p>' : '') + '</div><div style="height:14px"></div>' + body + (more || '') + '</div>' }
  var imgOf = function (id) { return id && PRODS[id] ? IMGS[PRODS[id].img] || '' : '' }
  var initials = function () { return String(NAME || '?').trim().split(/\s+/).map(function (x) { return x[0] }).slice(0, 2).join('').toUpperCase() }

  // kits: the seller's own products put together (one per category mix), added to the cart in one tap
  // pitch pages: the standard space kits (admin → Kit templates) = 2 of the prospect's products + one product from
  // other sellers on outrr for each other category of the kit, with the kit's styled picture
  var TPL = null, FILL = {}, need0 = []
  function loadKits() {
    var H = { apikey: S.anon, Authorization: 'Bearer ' + S.anon }
    return fetch(S.url + '/rest/v1/kit_templates?active=eq.true&select=slug,title,blurb,categories,image_url&order=sort', { headers: H })
      .then(function (r) { return r.ok ? r.json() : [] }).then(function (t) {
        TPL = t || []
        var own = {}; IDS.forEach(function (id) { own[PRODS[id].col] = 1 })
        var need = []; TPL.forEach(function (k) { (k.categories || []).forEach(function (c) { if (!own[c] && need.indexOf(c) < 0) need.push(c) }) })
        need0 = need
        return need.length ? rpc('kit_fill', { p_cats: need, p_per: 6 }).catch(function () { return [] }) : []
      }).then(function (l) {
        FILL = {}
        ;(l || []).forEach(function (p) {
          if (!PRODS[p.sku]) { PRODS[p.sku] = { n: p.name, p: Math.round(+p.price), m: p.mrp ? Math.round(+p.mrp) : 0, r: '4.5', c: 0, ship: 'Ships in 7-10 days', img: p.sku, col: p.collection_slug, stock: true, tier: 'select', mat: '', dim: '', kg: 0 }; IMGS[p.sku] = p.image_url || '' }
          PRODS[p.sku].sl = p.seller
          ;(FILL[p.collection_slug] = FILL[p.collection_slug] || []).push(p.sku)
        })
        // before sellers go live the storefront shows the built-in catalog (made by Tersoro): use it for empty categories
        need0.forEach(function (c) { if (FILL[c]) return
          var l = Object.keys(PRODS).filter(function (k) { var x = PRODS[k]; return x.col === c && !x.pv && x.p > 0 && IDS.indexOf(k) < 0 && IMGS[x.img] })
          l.forEach(function (k) { if (!PRODS[k].sl) PRODS[k].sl = 'Tersoro' }); if (l.length) FILL[c] = l })
        // kits stay affordable: the lower-priced pieces of each category first
        Object.keys(FILL).forEach(function (c) { FILL[c] = FILL[c].sort(function (a, b) { return PRODS[a].p - PRODS[b].p }).slice(0, 6) })
        renderBody()
      }).catch(function () { TPL = []; renderBody() })
  }
  function pitchKits() {
    var own = IDS.filter(function (id) { return priced(id) }), out = []
    if (!own.length || !TPL) return []
    TPL.forEach(function (t, i) {
      var cats = t.categories || [], mine = own.filter(function (id) { return cats.indexOf(PRODS[id].col) >= 0 })
      if (!mine.length) mine = own
      var items = [mine[(i * 2) % mine.length]]; if (mine.length > 1) { var b = mine[(i * 2 + 1) % mine.length]; if (items.indexOf(b) < 0) items.push(b) }
      var others = []
      cats.forEach(function (c) { var l = FILL[c]; if (l && l.length && !own.some(function (id) { return PRODS[id].col === c })) others.push(l[i % l.length]) })
      if (!others.length) return
      out.push({ n: t.title, blurb: t.blurb, pic: t.image_url, own: items, others: others.slice(0, 3), items: items.concat(others.slice(0, 3)) })
    })
    return out
  }
  function kits() {
    if (PITCH) return pitchKits()
    var pool = CATS.map(function (c) { return c.ids.filter(function (id) { return priced(id) && PRODS[id].stock !== false }) }).filter(function (l) { return l.length })
    var all = [].concat.apply([], pool); if (all.length < 4) return []
    // round-robin across categories, then groups of 3: every product in at most one kit, kits mix categories
    var mix = [], i = 0, more = true
    while (more) { more = false; pool.forEach(function (l) { if (i < l.length) { mix.push(l[i]); more = true } }); i++ }
    var size = mix.length >= 9 ? 3 : 2, names = ['Starter kit', 'Bestseller combo', 'Complete look', 'Gift set'], out = []
    for (var k = 0; k + size <= mix.length && out.length < 4; k += size) out.push({ n: names[out.length], items: mix.slice(k, k + size) })
    return out.slice(0, 4)
  }
  function kitCard(k, i) {
    if (k.own) return pitchKitCard(k, i)
    var tot = k.items.reduce(function (a, id) { return a + PRODS[id].p }, 0), mrp = k.items.reduce(function (a, id) { return a + Math.max(PRODS[id].m, PRODS[id].p) }, 0)
    var off = mrp > tot ? Math.round((1 - tot / mrp) * 100) : 0
    return '<div class="kit"><div class="im">' + (off >= 5 ? '<span class="save">SAVE ' + off + '%</span>' : '') + '<img src="' + esc(imgOf(k.items[0])) + '" alt="" loading="lazy"></div>'
      + '<div class="bd"><h3>' + k.n + '</h3><div class="kn">' + esc(k.items.map(function (id) { return PRODS[id].n }).join(' + ')) + '</div>'
      + '<div class="its">' + k.items.map(function (id) { return '<img src="' + esc(imgOf(id)) + '" alt="' + esc(PRODS[id].n) + '" title="' + esc(PRODS[id].n) + '" onclick="openProduct(\'' + id + '\')">' }).join('') + '<b>' + k.items.length + ' items</b></div>'
      + '<div class="pr"><small>Kit price</small>' + inr(tot) + (mrp > tot ? '<s>' + inr(mrp) + '</s>' : '') + '</div>'
      + '<div class="bt"><button onclick="openProduct(\'' + k.items[0] + '\')">View items</button><button class="f" onclick="stKit(' + i + ')">+ Add kit</button></div></div></div>'
  }
  function pitchKitCard(k, i) {
    var tot = k.items.reduce(function (a, id) { return a + PRODS[id].p }, 0)
    var by = {}; k.others.forEach(function (id) { var n = PRODS[id].sl || 'other sellers'; (by[n] = by[n] || []).push(id) })
    var row = function (who, l) { return '<div class="kw"><span>From <b>' + esc(who) + '</b></span><div class="its">' + l.map(function (id) { return '<img src="' + esc(imgOf(id)) + '" alt="' + esc(PRODS[id].n) + '" title="' + esc(PRODS[id].n) + ' \u00b7 ' + inr(PRODS[id].p) + '" onclick="openProduct(\'' + id + '\')">' }).join('') + '</div></div>' }
    return '<div class="kit"><div class="im">' + (k.pic ? '<span class="sty">Styled look</span><img src="' + esc(k.pic) + '" alt="" loading="lazy">' : '<img src="' + esc(imgOf(k.own[0])) + '" alt="" loading="lazy">') + '</div>'
      + '<div class="bd"><h3>' + esc(k.n) + '</h3>' + (k.blurb ? '<div class="kn">' + esc(k.blurb) + '</div>' : '')
      + row(NAME, k.own) + Object.keys(by).map(function (n) { return row(n, by[n]) }).join('')
      + '<div class="pr"><small>' + k.items.length + ' items \u00b7 kit price</small>' + inr(tot) + '</div>'
      + '<div class="bt"><button onclick="openProduct(\'' + k.own[0] + '\')">View items</button><button class="f" onclick="stKit(' + i + ')">+ Add kit</button></div></div></div>'
  }
  var KITS = []
  window.stKit = function (i) {
    var k = KITS[i]; if (!k) return
    k.items.forEach(function (id) { var f = CART.find(function (c) { return c.id === id }); f ? f.q++ : CART.push(cartLine(id)) })
    updBadge(); miniCart(true); miniTitle(k.n + ' added ✓')
    if (window.otrack) otrack('add_to_cart', { sku: k.items.join(','), value: k.items.reduce(function (a, id) { return a + PRODS[id].p }, 0) })
  }
  window.stTab = function (t) { TAB = t; FIND = ''; render(); var n = document.querySelector('.stnav'); if (n && t !== 'home') window.scrollTo({ top: n.getBoundingClientRect().top + window.scrollY - (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--stk')) || 0), behavior: 'smooth' }) }
  window.stFind = function (v) { FIND = v.trim().toLowerCase(); if (TAB === 'home' || TAB === 'about') TAB = 'all'; renderBody() }
  window.stSort = function (v) { SORT = v; renderBody() }
  window.stShare = function () {
    var u = location.origin + '/?' + (PITCH ? 'pitch' : 'store') + '=' + encodeURIComponent(slug) + (PITCH && team ? '' : '')
    if (navigator.share) navigator.share({ title: document.title, url: u }).catch(function () {}); else { try { navigator.clipboard.writeText(u); toast('Link copied') } catch (e) { toast(u) } }
  }

  // ---------- page ----------
  function render() {
    var since = D.since ? new Date(D.since).getFullYear() : null
    var h = heroHTML()
    h += '<div class="wrap"><div class="stcard"><div class="lg">' + (D.logo ? '<img src="' + esc(D.logo) + '" alt="' + esc(NAME) + ' logo">' : esc(initials())) + '</div>'
      + '<div class="nm"><h2>' + esc(NAME) + '</h2><div class="mt">' + (PITCH ? '<span class="vf smp">Sample page</span>' : '<span class="vf">✓ Verified seller</span>')
      + (!PITCH && D.rating_count ? '<span>★ <b>' + D.rating + '</b> (' + D.rating_count + ' rating' + (D.rating_count > 1 ? 's' : '') + ')</span>' : '')
      + (D.city ? '<span>📍 ' + esc(D.city) + '</span>' : '') + '<span>' + IDS.length + ' product' + (IDS.length === 1 ? '' : 's') + '</span>'
      + (!PITCH && since ? '<span>On outrr since ' + since + '</span>' : '') + '<span>Free delivery to top metros</span></div></div>'
      + '<div class="acts"><button onclick="stShare()">Share</button><button class="f" onclick="waToggle()">Ask a question</button></div></div></div>'
    h += '<div class="stnav"><div class="wrap in"><span class="lab">' + esc(NAME) + ' store</span><div class="tabs" id="stTabs"></div>'
      + '<input type="search" placeholder="Search in this store" aria-label="Search in this store" oninput="stFind(this.value)"></div></div>'
    h += '<div class="wrap" id="stBody"></div>'
    var foot = document.querySelector('#home footer')
    if (foot) h += foot.outerHTML
    root.innerHTML = h
    renderBody()
  }
  // banner: one template for every store: a coloured panel for their main category (name, tagline, product
  // thumbnails) beside the category photo. Their own banner (often with offers written on it) is never cropped:
  // it shows whole, at its own shape, as the first banner under the store menu.
  var THEME = { planters: ['#E6EDE0', '#3F5A35'], furniture: ['#EFE4D4', '#7A4A2E'], lighting: ['#2E2E2E', '#F2C76E'], shade: ['#E3E0D8', '#4B5A63'], art: ['#F3E3DA', '#A84F33'], furnishings: ['#F4EADF', '#8A4B5C'] }
  function heroHTML() {
    var n = {}, main = ''; IDS.forEach(function (id) { var c = PRODS[id].col; n[c] = (n[c] || 0) + 1; if (!main || n[c] > n[main]) main = c })
    var col = COLS[main] || {}, th = THEME[main] || ['#F4EADF', '#A84F33'], pic = IMGS[col.img] || imgOf(IDS[0])
    var tag = String(D.tagline || col.tag || '').replace(/\s*\|.*$/, ''); if (tag.length > 110) tag = tag.slice(0, 107).replace(/\s+\S*$/, '') + '…'
    var thumbs = IDS.filter(function (id) { return imgOf(id) }).slice(0, 3)
    return '<div class="stauto" style="--bg:' + th[0] + ';--ac:' + th[1] + '"><div class="tx"><div class="k">Now on outrr · ' + esc(col.t || 'Outdoor living') + '</div>'
      + '<h1>' + esc(NAME) + '</h1>' + (tag ? '<p>' + esc(tag) + '</p>' : '')
      + (thumbs.length === 3 ? '<div class="th">' + thumbs.map(function (id) { return '<img src="' + esc(imgOf(id)) + '" alt="">' }).join('') + '</div>' : '')
      + '<span class="cta" onclick="stTab(\'all\')">Shop all ' + IDS.length + ' products →</span></div>'
      + '<div class="pic">' + (pic ? '<img src="' + esc(pic) + '" alt="">' : '') + '</div></div>'
  }
  function tabsHTML() {
    var t = [['home', 'Home'], ['all', 'All products']].concat(CATS.length > 1 ? CATS.map(function (c) { return ['c:' + c.slug, c.title] }) : [])
    if (KITS.length) t.push(['kits', 'Kits'])
    if (D.about) t.push(['about', 'About'])
    return t.map(function (x) { return '<a class="' + (TAB === x[0] ? 'on' : '') + '" onclick="stTab(\'' + x[0].replace(/'/g, "\\'") + '\')">' + esc(x[1]) + '</a>' }).join('')
  }
  function renderBody() {
    KITS = kits()
    document.getElementById('stTabs').innerHTML = tabsHTML()
    var b = document.getElementById('stBody'), h = ''
    if (TAB === 'home') h = homeHTML()
    else if (TAB === 'kits') h = sec('Ready-made kits', (PITCH ? 'Their products in a complete space, with pieces from other sellers on outrr. One tap adds the whole kit to your cart.' : 'Their products, put together. One tap adds the whole kit to your cart.'), '<div class="kits">' + KITS.map(kitCard).join('') + '</div>')
    else if (TAB === 'about') h = aboutHTML() + faqHTML()
    else {
      var cat = TAB.indexOf('c:') === 0 ? TAB.slice(2) : '', c = CATS.filter(function (x) { return x.slug === cat })[0]
      var l = (c ? c.ids : IDS).filter(function (id) { return !FIND || PRODS[id].n.toLowerCase().indexOf(FIND) >= 0 }).slice()
      var off = function (id) { var x = PRODS[id]; return x.m > x.p ? (x.m - x.p) / x.m : 0 }
      if (SORT === 'lo') l.sort(function (a, b) { return PRODS[a].p - PRODS[b].p }); else if (SORT === 'hi') l.sort(function (a, b) { return PRODS[b].p - PRODS[a].p }); else if (SORT === 'off') l.sort(function (a, b) { return off(b) - off(a) })
      h = '<div class="sec2 stall"><div class="bar"><h2>' + esc(c ? c.title : FIND ? 'Results for “' + FIND + '”' : 'All products') + ' <span class="small" style="font-weight:500;color:var(--muted);font-size:13px">(' + l.length + ')</span></h2>'
        + '<select aria-label="Sort" onchange="stSort(this.value)">' + [['pop', 'Popular'], ['lo', 'Price: low to high'], ['hi', 'Price: high to low'], ['off', 'Biggest discount']].map(function (o) { return '<option value="' + o[0] + '"' + (SORT === o[0] ? ' selected' : '') + '>' + o[1] + '</option>' }).join('') + '</select></div>'
        + (l.length ? tiles(l) : '<p class="none">Nothing matches. Try another word.</p>') + '</div>'
    }
    if (PITCH && !D.claimed) h += '<div class="sec2"><div class="stclaim"><h2>Like your page?</h2><p>Claim it and start selling on outrr. Takes about 3 minutes; we fill in what we already know.</p><a href="' + claimUrl() + '" data-claim>Claim this page</a></div></div>'
    b.innerHTML = h
    if (RV && TAB === 'home') { var r = document.getElementById('stRv'); if (r) r.innerHTML = RV }
  }
  function homeHTML() {
    var h = '', top = IDS.slice(0, 4)
    if (D.banner) h += '<div class="sec2"><img class="stban" src="' + esc(D.banner) + '" alt="' + esc(NAME) + '" loading="lazy"></div>'
    // two big banners: the two biggest categories (or two top products)
    var big = CATS.slice().sort(function (a, b) { return b.ids.length - a.ids.length })
    var pair = big.length >= 2 ? big.slice(0, 2).map(function (c) { return { img: imgOf(c.ids[0]), k: 'Collection', t: c.title, go: "stTab('c:" + c.slug.replace(/'/g, "\\'") + "')", cta: 'Shop ' + c.title.toLowerCase() } })
      : IDS.slice(0, 2).map(function (id) { return { img: imgOf(id), k: 'Featured', t: PRODS[id].n, go: "openProduct('" + id + "')", cta: 'View' } })
    if (pair.length === 2) h += '<div class="sec2"><div class="prow">' + pair.map(function (p) { return '<div class="pban" onclick="' + p.go + '"><img src="' + esc(p.img) + '" alt="" loading="lazy"><div class="tx"><small>' + p.k + '</small><h3>' + esc(p.t) + '</h3><span>' + esc(p.cta) + ' →</span></div></div>' }).join('') + '</div></div>'
    if (CATS.length >= 3) h += sec('Shop by category', '', '<div class="stcats">' + CATS.map(function (c) { return '<div class="arch" onclick="stTab(\'c:' + c.slug.replace(/'/g, "\\'") + '\')"><div class="im"><img src="' + esc(imgOf(c.ids[0])) + '" alt="" loading="lazy"></div><span>' + esc(c.title) + '</span></div>' }).join('') + '</div>')
    h += sec('Bestsellers', 'Most loved from ' + esc(NAME), tiles(top))
    if (KITS.length) h += sec('Ready-made kits', (PITCH ? 'Their products in a complete space, with pieces from other sellers on outrr. One tap adds the whole kit to your cart.' : 'Their products, put together. One tap adds the whole kit to your cart.'), '<div class="kits">' + KITS.map(kitCard).join('') + '</div>')
    if (IDS.length >= 8) { var w = IDS[4]; h += '<div class="sec2"><div class="wide" onclick="stTab(\'all\')"><img src="' + esc(imgOf(w)) + '" alt="" loading="lazy"><div class="tx"><small>Made by ' + esc(NAME) + '</small><h3>' + esc(PRODS[w].n) + '</h3>' + (D.tagline ? '<p>' + esc(D.tagline) + '</p>' : '') + '<span class="cta">Shop all →</span></div></div></div>' }
    if (IDS.length > 4) h += sec('Trending now', 'Popular picks from ' + esc(NAME), '<div class="hstrip">' + IDS.slice(4, 14).filter(priced).map(miniCard).join('') + '</div>', '<span class="pillv" onclick="stTab(\'all\')">View all ' + IDS.length + ' products</span>')
    var deal = IDS.filter(function (id) { var x = PRODS[id]; return priced(id) && x.m > x.p }).sort(function (a, b) { return (1 - PRODS[a].p / PRODS[a].m) < (1 - PRODS[b].p / PRODS[b].m) ? 1 : -1 })[0]
    if (deal) { var x = PRODS[deal]; h += '<div class="sec2"><div class="shl"><h2>Best value</h2><span class="view">' + Math.round((1 - x.p / x.m) * 100) + '% off MRP</span></div><div class="deal" onclick="openProduct(\'' + deal + '\')"><div class="im"><img src="' + esc(imgOf(deal)) + '" alt=""></div><div class="tx"><span class="db">BEST VALUE</span><h3>' + esc(x.n) + '</h3><div class="dp">' + inr(x.p) + '<span class="dm">' + inr(x.m) + '</span></div><div class="tm">Secure online payment</div></div></div></div>' }
    CATS.map(function (c) { return { c: c, l: c.ids.filter(function (id) { return top.indexOf(id) < 0 }) } }).filter(function (o) { return o.l.length >= 3 }).slice(0, 3).forEach(function (o) { var c = o.c; h += sec(esc(c.title), '', tiles(o.l.slice(0, 4)), c.ids.length > 4 ? '<span class="pillv" onclick="stTab(\'c:' + c.slug.replace(/'/g, "\\'") + '\')">View all ' + c.ids.length + '</span>' : '') })
    if (!PITCH && D.rating_count) h += sec('What customers say', 'Verified buyers on outrr', '<div class="rvs" id="stRv"><div class="rvsum"><b>' + D.rating + '</b><div class="st">' + stars(Math.round(D.rating)) + '</div><small>' + D.rating_count + ' rating' + (D.rating_count > 1 ? 's' : '') + '</small></div></div>')
    h += aboutHTML() + faqHTML()
    var more = moreOnOutrr()
    if (more.length) h += sec('More on outrr', 'Complete the space with furniture, lighting and decor from other sellers', '<div class="hstrip">' + more.map(miniCard).join('') + '</div>', '<span class="pillv" onclick="location.href=\'/\'">Shop all of outrr</span>')
    return h
  }
  // other sellers' products, a few from each category the store doesn't sell
  function moreOnOutrr() {
    var own = {}; IDS.forEach(function (id) { own[PRODS[id].col] = 1 })
    var by = {}; Object.keys(PRODS).forEach(function (k) { var x = PRODS[k]; if (x.pv || IDS.indexOf(k) >= 0 || !(x.p > 0) || !IMGS[x.img] || x.stock === false) return; (by[x.col] = by[x.col] || []).push(k) })
    var cols = Object.keys(by).sort(function (a, b) { return (own[a] ? 1 : 0) - (own[b] ? 1 : 0) }), out = []
    for (var i = 0; out.length < 12 && i < 4; i++) cols.forEach(function (c) { if (by[c][i] && out.length < 12) out.push(by[c][i]) })
    return out
  }
  var stars = function (n) { return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(n) }
  function aboutHTML() {
    if (!D.about) return ''
    var gal = IDS.slice(0, 4).map(imgOf).filter(Boolean)
    return '<div class="sec2"><div class="stab"><div><small>ABOUT THE SELLER</small><h3>' + esc(NAME) + '</h3><p>' + esc(D.about) + '</p></div>'
      + (gal.length === 4 ? '<div class="gal">' + gal.map(function (u) { return '<img src="' + esc(u) + '" alt="" loading="lazy">' }).join('') + '</div>' : '') + '</div></div>'
  }
  function faqHTML() {
    var q = [['Who delivers my order?', NAME + ' packs your order; outrr tracks the delivery and keeps you updated by email.'],
      ['What if something arrives damaged?', 'Share a photo at delivery and outrr sorts out a replacement or refund.'],
      ['How can I pay?', 'Online at checkout: UPI, cards, netbanking or wallets, secured by Razorpay.']]
    return sec('Buying from ' + esc(NAME) + ' on outrr', '', q.map(function (x) { return '<div class="acc"><div class="acc-h" onclick="accT(this)">' + esc(x[0]) + '<span class="pm">+</span></div><div class="acc-b">' + esc(x[1]) + '</div></div>' }).join(''))
  }
  // a few recent published reviews of their products
  var RV = ''
  function reviews() {
    Promise.all(IDS.slice(0, 8).map(function (id) { return rpc('product_reviews_public', { p_sku: id }).catch(function () { return null }) })).then(function (l) {
      var all = []; l.forEach(function (r) { (r && r.reviews || []).forEach(function (x) { if (x.comment) all.push(x) }) })
      all.sort(function (a, b) { return (b.date || '') > (a.date || '') ? 1 : -1 })
      if (!all.length) return
      RV = '<div class="rvsum"><b>' + D.rating + '</b><div class="st">' + stars(Math.round(D.rating)) + '</div><small>' + D.rating_count + ' rating' + (D.rating_count > 1 ? 's' : '') + '</small></div>'
        + all.slice(0, 3).map(function (x) { return '<div class="rvc"><div class="st">' + stars(x.rating) + '</div><p>' + esc(x.comment) + '</p><small>' + esc(x.name || 'Customer') + (x.city ? ', ' + esc(x.city) : '') + ' · Verified buyer</small></div>' }).join('')
      var r = document.getElementById('stRv'); if (r) r.innerHTML = RV
    })
  }
})()
