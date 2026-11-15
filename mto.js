/* outrr — Made to Order (MTO) designs: product page with size + options, and its own checkout.
   The price shown here follows the same rules as the database (_mto_price, migration 133);
   the order is always priced again by the database from the customer's size (134). */
(function () {
  'use strict';
  var rnd = function (x) { return Math.round(+Number(x).toFixed(6)); };   // 150: half-up on the decimal value, same as the database
  var num = function (v) { if (typeof v === 'number') return isFinite(v) ? v : null; var s = String(v == null ? '' : v).trim(); return /^-?\d+(\.\d+)?$/.test(s) ? +s : null; };
  var arr = function (v) { return Array.isArray(v) ? v : []; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var rs = function (n) { return '₹' + Math.round(+n || 0).toLocaleString('en-IN'); };
  var UW = function (u) { return u === 'length' ? 'running ft' : u === 'fixed' ? 'piece' : u === 'seat' ? 'seat' : 'sq ft'; };
  var PCT = 50;
  // 140: modular panels (privacy screens): running length rounded up to whole ft, fewest standard panels, a post at each joint
  function panelSizes(m) { var out = []; arr(m && m.panels && m.panels.sizes).forEach(function (x) { x = num(x); if (x > 0 && x === Math.floor(x) && out.indexOf(x) < 0) out.push(x); }); return out.sort(function (a, b) { return b - a; }); }
  function panels(m, w) {
    var sz = panelSizes(m); w = num(w);
    if (!sz.length || w == null || w <= 0 || w > 500) return null;
    var W = Math.ceil(w - 1e-9), top = W + sz[0], best = [], pick = [], k, i;
    for (k = 0; k <= top; k++) { best.push(Infinity); pick.push(0); }
    best[0] = 0;
    for (k = 1; k <= top; k++) for (i = 0; i < sz.length; i++) if (sz[i] <= k && best[k - sz[i]] + 1 < best[k]) { best[k] = best[k - sz[i]] + 1; pick[k] = sz[i]; }
    k = W; while (k <= top && best[k] === Infinity) k++;
    if (k > top) return null;
    var ps = []; for (var r = k; r > 0; r -= pick[r]) ps.push(pick[r]);
    ps.sort(function (a, b) { return b - a; });
    return { width: k, panels: ps, count: ps.length, posts: ps.length + 1 };
  }
  function panelsText(p) {
    if (!p) return ''; var c = {}; p.panels.forEach(function (x) { c[x] = (c[x] || 0) + 1; });
    return Object.keys(c).sort(function (a, b) { return b - a; }).map(function (s) { return c[s] + ' × ' + s + ' ft'; }).join(' + ') + ' panels, ' + p.posts + ' posts';
  }

  function missing(m) {
    if (!m || typeof m !== 'object') return ['setup'];
    var u = m.unit, r = [];
    if (u === 'cabin') {   // 156
      if (!m.cabin || typeof m.cabin !== 'object' || !cabin(m.cabin, m.cabin.layout).ok) r.push('cabin');
      var cd = arr(m.make_days); if (!(((num(cd[1]) != null ? num(cd[1]) : num(cd[0])) || 0) > 0)) r.push('days');
      if (m.install && m.install.offered && !arr(m.install.cities).length) r.push('cities');
      if (m.install && m.install.required && !m.install.offered) r.push('install');
      return r;
    }
    if (['area', 'face', 'length', 'fixed', 'seat'].indexOf(u) < 0) return ['pricing'];
    var lim = function (d) { return (num(m[d] && m[d].min) || 0) > 0 && (num(m[d] && m[d].max) || 0) >= (num(m[d] && m[d].min) || 0); };
    if (u === 'fixed') { if (!arr(m.sizes).length) r.push('sizes'); }
    else if (u === 'seat') { if (!((num(m.n && m.n.min) || 0) >= 1 && (num(m.n && m.n.max) || 0) >= (num(m.n && m.n.min) || 0))) r.push('n'); }
    else {
      if ((u === 'area' || u === 'length') && !lim('l')) r.push('l');
      if ((u === 'area' || u === 'face') && !lim('w')) r.push('w');
      if (u === 'face' && !arr(m.h && m.h.options).length && !lim('h')) r.push('h');
      if (m.panels && (u !== 'face' || !panelSizes(m).length || (num(m.w && m.w.min) || 0) < Math.min.apply(null, panelSizes(m)))) r.push('panels');
    }
    if (!arr(m.materials).some(function (x) { return String(x && x.name || '').trim() && ((num(x.rate) || 0) > 0 || u === 'fixed'); })) r.push('material');
    if (u !== 'fixed' && u !== 'seat' && !((num(m.min_charge) || 0) > 0)) r.push('min');
    var md = arr(m.make_days); if (!(((num(md[1]) != null ? num(md[1]) : num(md[0])) || 0) > 0)) r.push('days');
    if (m.install && m.install.offered && !arr(m.install.cities).length) r.push('cities');
    if (m.install && m.install.required && !m.install.offered) r.push('install');   // 148
    if (arr(m.groups).some(function (g) { return !String((g && g.name) || '').trim() || !arr(g.options).some(function (y) { return String((y && y.name) || '').trim(); }); })) r.push('groups');
    return r;
  }
  function pinIn(pin, list) {
    pin = String(pin || '').replace(/\D/g, ''); if (pin.length !== 6) return false;
    var parts = String(list || '').replace(/\s/g, '').split(',');
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i]; if (!part) continue;
      if (part.indexOf('-') >= 0) {
        var ab = part.split('-'), a = ab[0], b = ab[1];
        if (!/^\d{1,6}$/.test(a) || !/^\d{1,6}$/.test(b) || a.length !== b.length) continue;
        var n = +pin.slice(0, a.length); if (n >= +a && n <= +b) return true;
      } else if (/^\d{1,6}$/.test(part) && pin.indexOf(part) === 0) return true;
    }
    return false;
  }

  // 156: "Customise your cabin" — a cabin priced from its layout (same as _mto_cabin in the database)
  var SIDES = ['front', 'right', 'back', 'left'];
  function cabin(c, lay) {
    var isObj = function (v) { return v && typeof v === 'object' && !Array.isArray(v); };
    if (!isObj(c) || !isObj(lay)) return { ok: false, error: 'Lay out your cabin' };
    var dv = function (v, d) { v = num(v); return v == null ? d : v; };
    var Lmin = dv(c.L && c.L.min, 8), Lmax = dv(c.L && c.L.max, 40), Wmin = dv(c.W && c.W.min, 8), Wmax = dv(c.W && c.W.max, 20), bay = dv(c.bay, 4);
    var L = num(lay.L), W = num(lay.W);
    if (L == null || L !== Math.floor(L) || L < Lmin || L > Lmax) return { ok: false, error: 'Length must be ' + Lmin + ' to ' + Lmax + ' ft' };
    if (W == null || W !== Math.floor(W) || W < Wmin || W > Wmax) return { ok: false, error: 'Width must be ' + Wmin + ' to ' + Wmax + ' ft' };
    if (!((num(c.shell) || 0) > 0) || !arr(c.bays).length) return { ok: false, error: 'This design is not ready to order yet' };
    var fl = L * W, pick = function (list, name) { return arr(list).filter(function (x) { return x && x.name === name; })[0] || arr(list)[0] || null; };
    var roof = pick(c.roofs, lay.roof), hgt = pick(c.heights, lay.height), pnl = pick(c.panels, lay.panel), gls = pick(c.glasses, lay.glass), frm = pick(c.frames, lay.frame);
    var ws = 0, nb = 0, cnt = {}, walls = {}, si, err = null;
    for (si = 0; si < SIDES.length && !err; si++) {
      var side = SIDES[si], n = Math.ceil((side === 'front' || side === 'back' ? L : W) / bay), ks = lay.walls && lay.walls[side];
      if (!Array.isArray(ks) || ks.length !== n) return { ok: false, error: 'The ' + side + ' wall needs ' + n + ' bays' };
      var i = 0;
      while (i < n) {
        var k = ks[i], b = arr(c.bays).filter(function (x) { return x && x.key === k; })[0];
        if (!b) return { ok: false, error: 'Choose what goes in bay ' + (i + 1) + ' of the ' + side + ' wall' };
        var sp = Math.max(Math.floor(dv(b.span, 1)), 1);
        if (i + sp > n) return { ok: false, error: b.name + ' does not fit at the end of the ' + side + ' wall' };
        for (var j = 1; j < sp; j++) if (ks[i + j] !== '-') return { ok: false, error: b.name + ' needs ' + sp + ' bays on the ' + side + ' wall' };
        ws += (num(b.price) || 0) + (b.solid ? num(pnl && pnl.extra) || 0 : 0) + (b.glass ? num(gls && gls.extra) || 0 : 0) + (b.glass || b.door ? num(frm && frm.extra) || 0 : 0);
        cnt[k] = (cnt[k] || 0) + 1; nb += sp; i += sp;
      }
      walls[side] = ks;
    }
    var wamt = rnd(ws * (1 + (num(hgt && hgt.walls_pct) || 0) / 100)), samt = rnd(fl * ((num(c.shell) || 0) + (num(roof && roof.rate) || 0) + (num(hgt && hgt.rate) || 0)));
    var summ = arr(c.bays).filter(function (x) { return cnt[x.key]; }).map(function (x) { return x.name + ' × ' + cnt[x.key]; }).join(', ');
    var nm = function (x) { return x ? x.name : null; };
    var lines = [{ name: (c.kind || 'Cabin') + ' shell · ' + L + ' × ' + W + ' ft (' + fl + ' sq ft) · ' + ((roof && roof.name) || 'roof'), amount: samt },
      { name: 'Walls · ' + nb + ' bays: ' + summ, amount: wamt }, { name: 'Spec: ' + [nm(hgt), nm(pnl), nm(gls), nm(frm)].filter(function (x) { return x != null; }).join(', '), amount: 0 }];
    var total = samt + wamt, items = {}, its = arr(c.items);
    for (var t = 0; t < its.length; t++) {
      var it = its[t];
      if (!isObj(lay.items) || !(it.key in lay.items)) continue;
      var qv = num(lay.items[it.key]);
      if (qv == null || qv < 0 || qv !== Math.floor(qv) || qv > dv(it.max, 100)) return { ok: false, error: 'Check the quantity of ' + String(it.name).toLowerCase() };
      if (qv === 0) continue;
      var amt = it.unit === 'floor' ? rnd((num(it.price) || 0) * fl) : rnd((num(it.price) || 0) * qv);
      lines.push({ name: it.name + (it.unit === 'floor' ? '' : it.unit === 'rft' ? ' · ' + qv + ' ft' : it.unit === 'wall_sqft' ? ' · ' + qv + ' sq ft' : ' × ' + qv), amount: amt });
      items[it.key] = qv; total += amt;
    }
    // 157: where things sit inside (drag and drop) — kept for the drawing, not priced
    var cl = function (v, hi) { return rnd(Math.min(Math.max(dv(v, 0), 0), hi) * 2) / 2; };
    var places = (Array.isArray(lay.places) ? lay.places.slice(0, 40) : []).map(function (pl) {
      var it = pl && typeof pl === 'object' ? arr(c.items).filter(function (x) { return x && x.key === pl.key && (x.unit === 'nos' || x.unit === 'rft'); })[0] : null;
      return it ? { key: pl.key, x: cl(pl.x, L), y: cl(pl.y, W), rot: num(pl.rot) === 90 ? 90 : 0, len: it.unit === 'rft' ? Math.min(Math.max(rnd(dv(pl.len, 1)), 1), Math.max(L, W)) : null } : null;
    }).filter(function (x) { return x; });
    return { ok: true, L: L, W: W, floor: fl, size: L + ' × ' + W + ' ft', total: total, lines: lines,
      layout: { L: L, W: W, roof: nm(roof), height: nm(hgt), panel: nm(pnl), glass: nm(gls), frame: nm(frm), walls: walls, items: items, places: places } };
  }
  window.mtoCabin = cabin;
  function price(m, o, payPct) {
    o = o || {};
    if (m && m.unit === 'cabin') {   // 156: priced from the layout, then quoted as one piece
      if (missing(m).length) return { ok: false, error: 'This design is not ready to order yet' };
      var cb = cabin(m.cabin, o.layout !== undefined ? o.layout : m.cabin && m.cabin.layout);
      if (!cb.ok) return cb;
      var m2 = {}, o2 = {}, kk; for (kk in m) m2[kk] = m[kk]; for (kk in o) if (kk !== 'groups' && kk !== 'addons' && kk !== 'colour') o2[kk] = o[kk];
      m2.unit = 'fixed'; m2.sizes = [{ label: cb.size, price: cb.total }]; m2.materials = [{ name: 'As configured', rate: 0, colours: [] }]; m2.groups = []; m2.addons = []; m2.min_charge = null; m2.delivery = {};
      var ins0 = m.install || {}, ins2 = {}; for (kk in ins0) ins2[kk] = ins0[kk];
      ins2.cities = arr(ins0.cities).map(function (x) { var y = {}, z; for (z in x) y[z] = x[z]; y.visit = (num(x.visit) || 0) + rnd((num(x.rate) || 0) * cb.floor); y.rate = 0; return y; }); m2.install = ins2;
      o2.size = cb.size; o2.material = 'As configured';
      var q0 = price(m2, o2, payPct); if (!q0.ok) return q0;
      q0.unit = 'cabin'; q0.qty = cb.floor; q0.addons = cb.lines.concat([{ name: 'Layout', amount: 0, layout: cb.layout }]); q0.cabin = { ok: true, L: cb.L, W: cb.W, floor: cb.floor, size: cb.size, total: cb.total };
      return q0;
    }
    if (missing(m).length) return { ok: false, error: 'This design is not ready to order yet' };
    var u = m.unit, l = num(o.l), w = num(o.w), h = num(o.h), qty, sz = null;
    if (u === 'fixed') { sz = arr(m.sizes).filter(function (x) { return x.label === o.size; })[0]; if (!sz) return { ok: false, error: 'Choose a size' }; qty = 1; }
    else if (u === 'seat') { var nn = num(o.n), nlo = num(m.n.min), nhi = num(m.n.max); if (nn == null || nn !== Math.floor(nn) || nn < nlo || nn > nhi) return { ok: false, error: 'Choose ' + nlo + ' to ' + nhi + ' seats' }; qty = nn; }
    else {
      var chk = function (d, v, word) { var lo = num(m[d] && m[d].min), hi = num(m[d] && m[d].max); return v == null || v < lo || v > hi ? word + ' must be ' + lo + ' to ' + hi + ' ft' : null; };
      var e;
      if (u === 'area' || u === 'length') { e = chk('l', l, 'Length'); if (e) return { ok: false, error: e }; }
      if (u === 'area' || u === 'face') { e = chk('w', w, m.panels ? 'Length' : 'Width'); if (e) return { ok: false, error: e }; }
      if (arr(m.h && m.h.options).length) { if (h == null || !m.h.options.some(function (x) { return num(x) === h; })) return { ok: false, error: 'Choose a height' }; }
      else if (u === 'face') { e = chk('h', h, 'Height'); if (e) return { ok: false, error: e }; }
      qty = Math.round((u === 'area' ? l * w : u === 'face' ? w * h : l) * 100) / 100;
    }
    var pn = u === 'face' && m.panels ? panels(m, w) : null;
    if (u === 'face' && m.panels) { if (!pn) return { ok: false, error: 'Enter the running length' }; qty = Math.round(pn.width * h * 100) / 100; }
    var mat = arr(m.materials).filter(function (x) { return !o.material || x.name === o.material; })[0];
    if (!mat) return { ok: false, error: 'Choose a material' };
    var rate = num(mat.rate) || 0, col = null;
    if (o.colour) { col = arr(mat.colours).filter(function (x) { return x.name === o.colour; })[0]; if (!col) return { ok: false, error: 'Choose a colour' }; rate += num(col.extra) || 0; }
    var own = u === 'fixed' && mat.prices ? num(mat.prices[sz.label]) : null;   // 147: this finish's own price for this size
    var base = u === 'fixed' ? (own != null ? own + rate - (num(mat.rate) || 0) : (num(sz.price) || 0) + rate) : (num(mat.base) || 0) + rnd(qty * rate + (pn ? pn.width * (num(mat.rate_rft) || 0) + pn.posts * h * (num(mat.rate_postft) || 0) + pn.posts * (num(mat.rate_post) || 0) : 0)), minUsed = false, minc = num(m.min_charge) || 0;
    if (base < minc) { base = minc; minUsed = true; }
    var picked = arr(o.addons), addons = [];
    arr(m.addons).forEach(function (a) { if (picked.indexOf(a.name) >= 0) addons.push({ name: a.name, amount: rnd((num(a.price) || 0) * (a.charge === 'unit' ? qty : 1)) }); });
    var groups = {}, gs = arr(m.groups), gErr = null;   // 148: one choice per group, fixed + per unit, listed with the add-ons
    gs.forEach(function (g) { if (gErr) return; var c2 = arr(g.options).filter(function (y) { return y.name === (o.groups || {})[g.name]; })[0];
      if (!c2) { gErr = 'Choose ' + String(g.name).toLowerCase(); return; }
      addons.push({ name: g.name + ': ' + c2.name, amount: (num(c2.fixed) || 0) + rnd((num(c2.rate) || 0) * qty + (num(c2.rate_w) || 0) * (w || 0)), group: g.name }); groups[g.name] = c2.name; });
    if (gErr) return { ok: false, error: gErr };
    var addT = addons.reduce(function (s, a) { return s + a.amount; }, 0), product = base + addT, install = null, instFee = 0;
    if (m.install && m.install.offered) {
      var c = arr(m.install.cities).filter(function (x) { return pinIn(o.pin, x.pins); })[0], req = !!m.install.required;
      install = { offered: true, available: !!c, city: c ? c.name : null, required: req };
      if (c) install.fee = (num(c.visit) || 0) + rnd((num(c.rate) || 0) * qty);
      if (req && !c && String(o.pin || '') !== '') return { ok: false, error: 'Not available at this pincode yet', install: install };
      if (c && (o.install || req)) instFee = install.fee;
    }
    var D = m.delivery || {}, delivery = null, dlv = 0;
    if ([D.local, D.state, D.india].some(function (v) { return num(v) != null; })) {
      if (['local', 'state', 'india'].indexOf(o.zone) >= 0) {
        var dr = o.zone === 'local' ? (num(D.local) != null ? num(D.local) : num(D.state) != null ? num(D.state) : num(D.india)) : o.zone === 'state' ? (num(D.state) != null ? num(D.state) : num(D.india)) : num(D.india);
        dlv = rnd((dr || 0) * qty); delivery = { zone: o.zone, fee: dlv };
      } else delivery = { zone: null, fee: null };
    }
    var payNow = rnd(product * (payPct == null ? 50 : payPct) / 100);
    return { panels: pn, delivery: delivery, delivery_fee: dlv, seats: u === 'seat' ? qty : null, ok: true, unit: u, qty: qty, rate: rate, base: base, min_charge_used: minUsed, material: mat.name, colour: col ? col.name : null, size: sz ? sz.label : null,
      addons: addons, product: product, install: install, install_fee: instFee, total: product + instFee + dlv, pay_now: payNow, before_dispatch: product - payNow + instFee + dlv };
  }
  window.mtoPrice = price;
  // 147: a finish's price at one size (its own price when set, else size price + extra)
  function fixedAt(m, mat, sz) { var own = mat && mat.prices ? num(mat.prices[sz.label]) : null; return own != null ? own : (num(sz.price) || 0) + (num(mat && mat.rate) || 0); }
  // delivery zone from the maker's pincode (the order is priced again by the database, nearby cities included)
  function zoneOf(from, to) {
    if (!/^[1-9][0-9]{5}$/.test(to || '') || !window.locFromPin) return null;
    var a = locFromPin(from), b = locFromPin(to); if (!a || !b) return null;
    if (a.city && b.city && a.city === b.city) return 'local';
    if (a.state && b.state && a.state === b.state) return 'state';
    return 'india';
  }
  var hasDlv = function (m) { var D = m.delivery || {}; return [D.local, D.state, D.india].some(function (v) { return num(v) != null; }); };

  // ------------------------------------------------------------ styles
  var css = '' +
    '.mto-ov{position:fixed;inset:0;z-index:80;background:#F6F0E6;overflow-y:auto;display:none}.mto-ov.open{display:block}' +
    '.mto-top{position:sticky;top:0;z-index:2;background:#FFFBF5;border-bottom:1px solid #E2D6C4;display:flex;align-items:center;gap:12px;padding:10px 16px}' +
    '.mto-top b{font-size:15px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mto-x{border:1px solid #D6CBB9;background:transparent;border-radius:999px;min-width:44px;min-height:44px;font-size:18px;cursor:pointer}' +
    '.mto-wrap{max-width:1240px;margin:0 auto;padding:20px 16px 60px;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:32px;align-items:start}' +
    '.mto-gal .main{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:16px;background:#E4DACB;display:block}' +
    '.mto-th{display:flex;gap:8px;margin-top:10px;overflow-x:auto}.mto-th button{border:2px solid transparent;padding:0;border-radius:10px;background:none;cursor:pointer;flex:0 0 auto}.mto-th button.on{border-color:#C26445}.mto-th img{width:72px;height:56px;object-fit:cover;border-radius:8px;display:block}' +
    '.mto-facts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}.mto-facts div{background:#FFFBF5;border:1px solid #E2D6C4;border-radius:12px;padding:10px 12px;font-size:13px;color:#6A6258}.mto-facts b{display:block;color:#2E2E2E;font-size:14px;margin-top:2px}' +
    '.mto-badge{display:inline-block;background:#2E2E2E;color:#FBF6EE;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:5px 10px;border-radius:999px}' +
    '.mto-cfg h1{font-size:30px;line-height:1.15;margin:10px 0 4px}.mto-by{color:#6A6258;font-size:14px;margin:0 0 8px}.mto-from{font-size:15px;color:#6A6258;margin:0 0 14px}.mto-from b{font-size:24px;color:#2E2E2E}' +
    '.mto-box{border:1px solid #E2D6C4;background:#FFFBF5;border-radius:14px;padding:14px;margin:0 0 12px}.mto-box h3{font-size:15px;margin:0 0 10px}' +
    '.mto-g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.mto-g label,.mto-f{font-size:12px;color:#4A4640;display:flex;flex-direction:column;gap:5px}' +
    '.mto-box input[type=text],.mto-box input[inputmode],.mto-box select,.mto-box textarea{font:inherit;font-size:16px;padding:9px 11px;border:1px solid #CFC3B1;border-radius:10px;min-height:44px;box-sizing:border-box;width:100%;background:#fff}' +
    '.mto-opt{display:flex;gap:10px;align-items:flex-start;border:1px solid #CFC3B1;border-radius:12px;padding:10px 12px;font-size:14px;cursor:pointer;margin-bottom:8px}.mto-opt.on{border:2px solid #C26445}' +
    '.mto-sw{display:flex;gap:8px;flex-wrap:wrap}.mto-sw button{border:1px solid #CFC3B1;background:#fff;border-radius:999px;padding:8px 14px;min-height:40px;font:inherit;font-size:13px;cursor:pointer}.mto-sw button.on{border:2px solid #C26445;font-weight:600}' +
    '.mto-chk{display:flex;gap:10px;align-items:flex-start;font-size:14px;padding:6px 0}.mto-chk input{margin-top:3px}.mto-chk span.r{margin-left:auto;white-space:nowrap;color:#6A6258}' +
    '.mto-warn{font-size:13px;background:#F3E3D9;color:#7E3A24;border-radius:10px;padding:10px 12px;margin-top:8px}' +
    '.mto-sum{background:#2E2E2E;color:#FBF6EE;border-radius:16px;padding:16px}.mto-sum .rw{display:flex;justify-content:space-between;gap:12px;font-size:14px;padding:3px 0}.mto-sum .rw span:first-child{color:#CFC8BD}' +
    '.mto-sum .tt{border-top:1px solid #4A4946;margin-top:6px;padding-top:8px;font-weight:700}.mto-sum .tt span:first-child{color:#FBF6EE}' +
    '.mto-pay{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.mto-pay div{background:#3B3A38;border-radius:10px;padding:10px;font-size:12px;color:#CFC8BD}.mto-pay b{display:block;font-size:18px;color:#FBF6EE;margin-top:2px}' +
    '.mto-go{margin-top:12px;width:100%;min-height:50px;border:none;border-radius:12px;background:#C26445;color:#FFFBF5;font:inherit;font-size:16px;font-weight:700;cursor:pointer}.mto-go[disabled]{opacity:.5;cursor:not-allowed}' +
    '.mto-err{color:#F2B49C;font-size:14px}.mto-steps{grid-column:1/-1;margin-top:20px}.mto-steps h2{font-size:22px;margin:0 0 12px}' +
    '.mto-steps ol{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}.mto-steps li{background:#FFFBF5;border:1px solid #E2D6C4;border-radius:12px;padding:12px;font-size:13px;color:#6A6258}.mto-steps li b{display:block;color:#2E2E2E;font-size:14px;margin:4px 0 2px}.mto-steps li i{font-style:normal;color:#A34F33;font-weight:700}' +
    '.mto-more{grid-column:1/-1}.mto-more h2{font-size:22px;margin:10px 0 12px}.mto-more .row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.mto-more a{cursor:pointer;color:#2E2E2E;text-decoration:none;display:flex;flex-direction:column;gap:4px;font-size:14px}.mto-more img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:12px;background:#E4DACB}' +
    '.mto-faq{grid-column:1/-1}.mto-faq details{background:#FFFBF5;border:1px solid #E2D6C4;border-radius:12px;padding:12px 14px;margin-bottom:8px}.mto-faq summary{font-weight:600;cursor:pointer}.mto-faq p{font-size:14px;color:#4A4640;line-height:1.6;margin:8px 0 0}' +
    '.co-mto{font-size:13px;color:#4A4640;line-height:1.55;margin-top:4px}' +
    '@media (max-width:820px){.mto-wrap{grid-template-columns:1fr;gap:18px}.mto-steps ol{grid-template-columns:repeat(2,minmax(0,1fr))}.mto-more .row{grid-template-columns:repeat(2,minmax(0,1fr))}.mto-g{grid-template-columns:repeat(2,minmax(0,1fr))}.mto-cfg h1{font-size:26px}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);


  // ------------------------------------------------------------ 156: cabin builder (layout) — tap a wall bay, choose what goes there; price updates live
  function cbClone(v) { return JSON.parse(JSON.stringify(v)); }
  function cbBay(c, k) { return arr(c.bays).filter(function (b) { return b.key === k; })[0] || null; }
  function cbSpan(c, k) { var b = cbBay(c, k); return b ? Math.max(Math.floor(num(b.span) || 1), 1) : 1; }
  function cbFill(c) { return c.fill && cbBay(c, c.fill) ? c.fill : (arr(c.bays)[0] || {}).key; }
  function cbLen(c, lay, side) { return side === 'front' || side === 'back' ? num(lay.L) : num(lay.W); }
  function cbN(c, lay, side) { return Math.ceil(cbLen(c, lay, side) / (num(c.bay) || 4)); }
  function cbNorm(c, ks, n) {   // whole elements only: orphans and doors cut by the end become plain wall
    var f = cbFill(c), out = ks.slice(0, n), i = 0; while (out.length < n) out.push(f);
    while (i < n) { var k = out[i]; if (k === '-' || !cbBay(c, k)) { out[i] = f; i++; continue; } var sp = cbSpan(c, k); if (i + sp > n) { out[i] = f; i++; continue; } for (var j = 1; j < sp; j++) out[i + j] = '-'; i += sp; }
    return out;
  }
  function cbHead(ks, i) { while (i > 0 && ks[i] === '-') i--; return i; }
  function cbSet(c, lay, side, i, key) {   // put `key` at bay i (wide doors take the next bays)
    var n = cbN(c, lay, side), ks = lay.walls[side].slice(), f = cbFill(c), sp = cbSpan(c, key);
    var clear = function (h) { h = cbHead(ks, h); var s2 = cbSpan(c, ks[h]); for (var j = 0; j < s2 && h + j < n; j++) ks[h + j] = f; };
    var h = cbHead(ks, i); clear(h);
    var st = Math.min(h, n - sp); if (st < 0) return false;
    for (var j = st; j < st + sp; j++) if (ks[j] !== f || cbSpan(c, ks[j]) > 1) clear(j);
    ks[st] = key; for (j = 1; j < sp; j++) ks[st + j] = '-';
    lay.walls[side] = cbNorm(c, ks, n); return true;
  }
  function cbResize(c, lay) { SIDES.forEach(function (sd) { lay.walls[sd] = cbNorm(c, arr(lay.walls[sd]), cbN(c, lay, sd)); }); }
  function cbColor(b) { return !b ? '#D9D4CB' : b.door ? (b.glass ? '#4E93AD' : '#8C7E6C') : b.glass ? (b.key === 'frost' ? '#B9CDD4' : '#8EC3D6') : '#D9D4CB'; }
  // 157: drag and drop — things placed inside (toilet, WC, pantry, partitions, partition doors) and wall pieces dropped on bays
  var CB_FOOT = { toilet: [4, 6, 'Toilet'], wc: [4, 4, 'WC'], pantry: [6, 2, 'Pantry'], pdoor: [3, 0.6, 'Door'], gdoorp: [3, 0.6, 'Glass door'] };
  function cbPlaceable(it) { return it && (it.unit === 'nos' || it.unit === 'rft'); }
  function cbItem(c, k) { return arr(c.items).filter(function (x) { return x.key === k; })[0] || null; }
  function cbDims(c, pl) { var it = cbItem(c, pl.key), f = CB_FOOT[pl.key] || [3, 3, it ? it.name : '']; if (it && it.unit === 'rft') return [pl.rot === 90 ? 0.4 : pl.len, pl.rot === 90 ? pl.len : 0.4]; return pl.rot === 90 ? [f[1], f[0]] : [f[0], f[1]]; }
  function cbSync(c, lay) {   // quantities follow what is placed
    var items = {}, k; for (k in (lay.items || {})) items[k] = lay.items[k];
    arr(c.items).forEach(function (it) { if (!cbPlaceable(it)) return; var v = 0; arr(lay.places).forEach(function (p) { if (p.key === it.key) v += it.unit === 'rft' ? (num(p.len) || 0) : 1; }); if (v || it.key in items) items[it.key] = v; });
    lay.items = items;
  }
  function cbClamp(c, lay, pl) { var d = cbDims(c, pl), L = num(lay.L), W = num(lay.W); if (pl.len != null) pl.len = Math.max(1, Math.min(pl.len, pl.rot === 90 ? W : L)); d = cbDims(c, pl);
    pl.x = Math.round(Math.max(0, Math.min(pl.x, L - d[0])) * 2) / 2; pl.y = Math.round(Math.max(0, Math.min(pl.y, W - d[1])) * 2) / 2; }
  function cbAdd(c, lay, key, x, y) { var it = cbItem(c, key); if (!cbPlaceable(it)) return -1;
    var pl = { key: key, x: 0, y: 0, rot: it.unit === 'rft' ? 90 : 0, len: it.unit === 'rft' ? num(lay.W) : null }, d = cbDims(c, pl);
    pl.x = x == null ? num(lay.L) / 2 - d[0] / 2 : x - d[0] / 2; pl.y = x == null ? num(lay.W) / 2 - d[1] / 2 : y - d[1] / 2;
    lay.places = arr(lay.places).concat([pl]); cbClamp(c, lay, pl); cbSync(c, lay); return lay.places.length - 1; }
  function cbDefaults(c, lay) {   // a preset without positions: put its items in sensible places
    if (Array.isArray(lay.places)) return; lay.places = []; var L = num(lay.L), W = num(lay.W), cx = 0, its = lay.items || {};
    ['toilet', 'wc'].forEach(function (k) { for (var i = 0; i < (num(its[k]) || 0); i++) { var f = CB_FOOT[k]; lay.places.push({ key: k, x: cx, y: 0, rot: 0, len: null }); cx += f[0]; } });
    if (num(its.pantry)) lay.places.push({ key: 'pantry', x: L - 6, y: 0, rot: 0, len: null });
    var px = Math.max(cx + 2, Math.min(8, L / 2));
    ['ppart', 'gpart', 'fpart'].forEach(function (k) { var v = num(its[k]) || 0; if (v) { lay.places.push({ key: k, x: px, y: 0, rot: 90, len: Math.min(v, W) }); px = Math.min(L - 1, px + 6); } });
    ['pdoor', 'gdoorp'].forEach(function (k) { for (var i = 0; i < (num(its[k]) || 0); i++) { var pt = lay.places.filter(function (p) { return p.rot === 90 && p.len; })[i]; lay.places.push({ key: k, x: pt ? Math.max(0, pt.x - 0.1) : L / 2, y: W - 4, rot: 90, len: null }); } });
    lay.places.forEach(function (p) { cbClamp(c, lay, p); });
  }
  function cbPlan(c, lay, sel, psel) {
    var L = num(lay.L), W = num(lay.W), bay = num(c.bay) || 4, s = Math.min(560 / L, 330 / W, 34), ox = 30, oy = 30, t = 12, o = '';
    o += '<rect x="' + ox + '" y="' + oy + '" width="' + L * s + '" height="' + W * s + '" fill="#FBF8F3" stroke="#E2D6C4" data-floor="1"/>';
    for (var gx = 1; gx < L; gx++) o += '<line x1="' + (ox + gx * s) + '" y1="' + oy + '" x2="' + (ox + gx * s) + '" y2="' + (oy + W * s) + '" stroke="#F0EAE0" pointer-events="none"/>';
    for (var gy = 1; gy < W; gy++) o += '<line x1="' + ox + '" y1="' + (oy + gy * s) + '" x2="' + (ox + L * s) + '" y2="' + (oy + gy * s) + '" stroke="#F0EAE0" pointer-events="none"/>';
    // things inside
    arr(lay.places).forEach(function (pl, n) {
      var it = cbItem(c, pl.key), d = cbDims(c, pl), x = ox + pl.x * s, y = oy + pl.y * s, w = d[0] * s, h = d[1] * s, on = psel === n, sh = '';
      if (it && it.unit === 'rft') { var col = pl.key === 'gpart' ? '#8EC3D6' : pl.key === 'fpart' ? '#B9CDD4' : '#B9B2A6';
        sh = '<rect x="' + (x - 8) + '" y="' + (y - 8) + '" width="' + (w + 16) + '" height="' + (h + 16) + '" fill="' + (on ? '#F7DDD2' : 'transparent') + '" rx="4"/>' + '<rect x="' + x + '" y="' + y + '" width="' + Math.max(w, 5) + '" height="' + Math.max(h, 5) + '" fill="' + col + '"/>';
      } else if (pl.key === 'pdoor' || pl.key === 'gdoorp') {
        sh = '<rect x="' + (x - 4) + '" y="' + (y - 4) + '" width="' + (w + 8) + '" height="' + (h + 8) + '" fill="' + (on ? '#F7DDD2' : '#FFFFFF') + '" stroke="' + (pl.key === 'gdoorp' ? '#4E93AD' : '#8C7E6C') + '" stroke-width="2" rx="2"/>';
      } else {
        sh = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + (pl.key === 'pantry' ? '#EFE6D6' : '#EAF3F6') + '" stroke="' + (on ? '#C26445' : '#8EC3D6') + '" stroke-width="' + (on ? 3 : 1.5) + '" rx="3"/>' +
          '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 4) + '" font-size="11" text-anchor="middle" fill="#2E2E2E" pointer-events="none">' + esc((CB_FOOT[pl.key] || [0, 0, ''])[2]) + '</text>';
      }
      o += '<g data-pl="' + n + '" style="cursor:grab;touch-action:none"><title>' + esc((it ? it.name : pl.key) + (pl.len ? ' · ' + pl.len + ' ft' : '') + ' — drag to move, tap for options') + '</title>' + sh + '</g>';
    });
    // walls
    SIDES.forEach(function (side) {
      var ks = lay.walls[side], n = ks.length, len = cbLen(c, lay, side), i = 0;
      while (i < n) {
        var k = ks[i], b = cbBay(c, k), sp = cbSpan(c, k), a = i * bay, e = Math.min((i + sp) * bay, len), x1, y1, x2, y2;
        if (side === 'front') { x1 = ox + a * s; x2 = ox + e * s; y1 = y2 = oy + W * s; }
        else if (side === 'back') { x1 = ox + a * s; x2 = ox + e * s; y1 = y2 = oy; }
        else if (side === 'right') { x1 = x2 = ox + L * s; y1 = oy + W * s - a * s; y2 = oy + W * s - e * s; }
        else { x1 = x2 = ox; y1 = oy + W * s - a * s; y2 = oy + W * s - e * s; }
        var on = sel && sel.side === side && cbHead(ks, sel.i) === i, hx = Math.min(x1, x2) - 11, hy = Math.min(y1, y2) - 11, hw = Math.abs(x2 - x1) + 22, hh = Math.abs(y2 - y1) + 22;
        o += '<g data-bay="' + side + ':' + i + '" style="cursor:pointer"><title>' + esc(side + ' wall, bay ' + (i + 1) + ': ' + (b ? b.name : '')) + '</title>' +
          '<rect x="' + hx + '" y="' + hy + '" width="' + hw + '" height="' + hh + '" fill="' + (on ? '#F7DDD2' : 'transparent') + '" stroke="' + (on ? '#C26445' : 'none') + '" stroke-width="2" rx="4"/>' +
          '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + cbColor(b) + '" stroke-width="' + t + '"/>' +
          (b && b.key === 'window' ? '<line x1="' + (x1 + (x2 - x1) * .2) + '" y1="' + (y1 + (y2 - y1) * .2) + '" x2="' + (x1 + (x2 - x1) * .8) + '" y2="' + (y1 + (y2 - y1) * .8) + '" stroke="#8EC3D6" stroke-width="' + (t - 5) + '"/>' : '') +
          (b && b.key === 'vent' ? '<line x1="' + (x1 + (x2 - x1) * .38) + '" y1="' + (y1 + (y2 - y1) * .38) + '" x2="' + (x1 + (x2 - x1) * .62) + '" y2="' + (y1 + (y2 - y1) * .62) + '" stroke="#8EC3D6" stroke-width="' + (t - 5) + '"/>' : '') + '</g>';
        i += sp;
      }
    });
    // resize handle (back-right corner stays, front-right corner drags)
    o += '<rect data-rzbox="1" x="' + ox + '" y="' + oy + '" width="' + L * s + '" height="' + W * s + '" fill="none" stroke="#C26445" stroke-dasharray="6 4" stroke-width="2" style="display:none" pointer-events="none"/>';
    o += '<g data-rz="1" style="cursor:nwse-resize;touch-action:none"><title>Drag to change the size</title><circle cx="' + (ox + L * s) + '" cy="' + (oy + W * s) + '" r="14" fill="#C26445"/><path d="M' + (ox + L * s - 5) + ',' + (oy + W * s + 1) + ' l5,5 l5,-5 M' + (ox + L * s + 1) + ',' + (oy + W * s - 5) + ' l5,5 l-5,5" stroke="#fff" stroke-width="2" fill="none" pointer-events="none"/></g>';
    o += '<text x="' + (ox + L * s / 2) + '" y="' + (oy + W * s + 30) + '" font-size="11" fill="#6A6258" text-anchor="middle" letter-spacing="1" pointer-events="none">FRONT · ' + L + ' × ' + W + ' ft</text>';
    return '<svg data-plan="' + ox + ',' + oy + ',' + s + '" viewBox="0 0 ' + (L * s + 70) + ' ' + (W * s + 64) + '" style="width:100%;max-height:420px;display:block;touch-action:pan-y;user-select:none" role="img" aria-label="Your cabin plan — drag pieces onto walls or inside, tap a wall bay to change it">' + o + '</svg>';
  }
  function cabinUI(m, o) {
    var c = m.cabin, lay = o.layout, sel = S.sel || { side: 'front', i: 0 }, q0 = cabin(c, lay), ks = lay.walls[sel.side], hi = cbHead(ks, Math.min(sel.i, ks.length - 1)), cur = ks[hi];
    var opts = function (lo, hi2, v, key) { var r = ''; for (var i = lo; i <= hi2; i++) r += '<option' + (i === num(v) ? ' selected' : '') + '>' + i + '</option>'; return '<select data-cdim="' + key + '">' + r + '</select>'; };
    var chip = 'style="touch-action:none;cursor:grab;font-size:13px"';
    var wallPal = arr(c.bays).map(function (b) {
      var l2 = cbClone(lay), okk = cbSet(c, l2, sel.side, hi, b.key), q2 = okk ? cabin(c, l2) : { ok: false }, d = q2.ok && q0.ok ? q2.total - q0.total : null;
      return '<button type="button" data-bk="' + esc(b.key) + '" data-dragbay="' + esc(b.key) + '" ' + chip + ' class="' + (b.key === cur ? 'on' : '') + '"><i style="display:inline-block;width:12px;height:12px;border-radius:2px;margin-right:6px;vertical-align:-1px;background:' + cbColor(b) + '"></i>' + esc(b.name) + (b.key === cur || d == null ? '' : ' <span style="color:#6A6258">' + (d >= 0 ? '+' : '−') + rs(Math.abs(d)) + '</span>') + '</button>';
    }).join('');
    var inPal = arr(c.items).filter(cbPlaceable).map(function (it) { return '<button type="button" data-dragpl="' + esc(it.key) + '" ' + chip + '>+ ' + esc(it.name.replace(/ \(.*\)$/, '')) + ' <span style="color:#6A6258">' + rs(it.price) + (it.unit === 'rft' ? '/ft' : '') + '</span></button>'; }).join('');
    var TB = 'font:600 13px Inter,sans-serif;min-height:40px;padding:0 14px;border-radius:99px;border:1px solid #C9BBA6;background:#fff;color:#2E2E2E;cursor:pointer';
    var pl = S.psel != null ? arr(lay.places)[S.psel] : null, pit = pl ? cbItem(c, pl.key) : null;
    var tools = pl ? '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px;background:#FBEDE7;border-radius:10px;padding:8px 10px"><b style="font-size:13px">' + esc(pit ? pit.name : pl.key) + (pl.len ? ' · ' + pl.len + ' ft' : '') + '</b>' +
      '<button type="button" style="' + TB + '" data-pact="rot">Rotate</button>' + (pit && pit.unit === 'rft' ? '<button type="button" style="' + TB + '" data-pact="less">− 1 ft</button><button type="button" style="' + TB + '" data-pact="more">+ 1 ft</button>' : '') +
      '<button type="button" style="' + TB + '" data-pact="del">Remove</button><button type="button" style="' + TB + '" data-pact="done">Done</button></div>' : '';
    var row = function (key, list, lbl) { list = arr(list); if (list.length < 2) return ''; return '<p style="font-size:13px;color:#4A4640;margin:10px 0 6px">' + lbl + '</p><div class="mto-sw">' + list.map(function (x) {
      var l2 = cbClone(lay); l2[key] = x.name; var q2 = cabin(c, l2), d = q2.ok && q0.ok ? q2.total - q0.total : 0;
      return '<button type="button" data-cch="' + key + '" data-v="' + esc(x.name) + '" class="' + (lay[key] === x.name ? 'on' : '') + '">' + esc(x.name) + (lay[key] === x.name || !d ? '' : ' <span style="color:#6A6258">' + (d >= 0 ? '+' : '−') + rs(Math.abs(d)) + '</span>') + '</button>'; }).join('') + '</div>'; };
    var extras = arr(c.items).filter(function (it) { return !cbPlaceable(it); }).map(function (it) {
      var v = num((lay.items || {})[it.key]) || 0, step = it.unit === 'wall_sqft' ? 20 : 1;
      if (it.unit === 'floor') return '<label class="mto-chk"><input type="checkbox" data-citc="' + esc(it.key) + '"' + (v ? ' checked' : '') + '><span>' + esc(it.name) + '</span><span class="r">' + rs(it.price) + ' / sq ft</span></label>';
      return '<div class="mto-chk" style="align-items:center"><span style="flex:1">' + esc(it.name) + '<br><span style="color:#6A6258;font-size:12.5px">' + rs(it.price) + (it.unit === 'wall_sqft' ? ' / sq ft of wall' : ' each') + '</span></span>' +
        '<button type="button" class="mto-x" style="min-width:40px;min-height:40px" data-cit="' + esc(it.key) + '" data-d="-' + step + '" aria-label="Less ' + esc(it.name) + '">−</button><b style="min-width:60px;text-align:center">' + v + (it.unit === 'wall_sqft' ? ' sq ft' : '') + '</b>' +
        '<button type="button" class="mto-x" style="min-width:40px;min-height:40px" data-cit="' + esc(it.key) + '" data-d="' + step + '" aria-label="More ' + esc(it.name) + '">+</button></div>';
    }).join('');
    return '<div class="mto-g" style="grid-template-columns:repeat(2,minmax(0,1fr))"><label>Length (ft)' + opts(num(c.L && c.L.min) || 8, num(c.L && c.L.max) || 40, lay.L, 'L') + '</label><label>Width (ft)' + opts(num(c.W && c.W.min) || 8, num(c.W && c.W.max) || 20, lay.W, 'W') + '</label></div>' +
      '<div id="cbPlanBox" style="background:#fff;border:1px solid #E2D6C4;border-radius:12px;padding:8px;margin-top:10px">' + cbPlan(c, lay, { side: sel.side, i: hi }, S.psel) + '</div>' + tools +
      '<p style="font-size:12.5px;color:#6A6258;margin:6px 0 0">Drag a wall piece onto any wall, drag rooms and fittings inside, drag the orange corner to resize. Or tap a wall bay and pick below.</p>' +
      '<p style="font-size:13px;font-weight:700;margin:12px 0 6px">Walls — ' + esc(sel.side) + ' wall, bay ' + (hi + 1) + ' selected</p><div class="mto-sw">' + wallPal + '</div>' +
      '<p style="font-size:13px;font-weight:700;margin:14px 0 6px">Inside — drag onto the plan (or tap to add)</p><div class="mto-sw">' + inPal + '</div>' +
      row('roof', c.roofs, 'Roof') + row('height', c.heights, 'Height') + row('panel', c.panels, 'Wall panels') + row('glass', c.glasses, 'Glass') + row('frame', c.frames, 'Frame colour') +
      (extras ? '<p style="font-size:13px;font-weight:700;margin:14px 0 4px">Finishes</p>' + extras : '');
  }
  // pointer drag: palette → wall / floor, move a placed piece, resize from the corner
  var DR = null;
  function cbFt(svg, cx, cy) { var a = svg.getAttribute('data-plan').split(',').map(Number), pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy; var p = pt.matrixTransform(svg.getScreenCTM().inverse()); return { x: (p.x - a[0]) / a[2], y: (p.y - a[1]) / a[2], s: a[2] }; }
  function cbWallAt(c, lay, f) { var L = num(lay.L), W = num(lay.W), bay = num(c.bay) || 4, best = null, cand = [['front', Math.abs(f.y - W), f.x >= -1 && f.x <= L + 1], ['back', Math.abs(f.y), f.x >= -1 && f.x <= L + 1], ['right', Math.abs(f.x - L), f.y >= -1 && f.y <= W + 1], ['left', Math.abs(f.x), f.y >= -1 && f.y <= W + 1]];
    cand.forEach(function (z) { if (z[2] && z[1] < 2.2 && (!best || z[1] < best[1])) best = z; }); if (!best) return null;
    var along = best[0] === 'front' || best[0] === 'back' ? f.x : W - f.y, len = best[0] === 'front' || best[0] === 'back' ? L : W;
    return { side: best[0], i: Math.floor(Math.max(0, Math.min(along, len - 0.01)) / bay) }; }
  function cbDown(e) {
    if (!S || !PRODS[S.id] || !PRODS[S.id].cz || PRODS[S.id].cz.unit !== 'cabin') return;
    var t = e.target.closest && e.target.closest('[data-dragbay],[data-dragpl],[data-pl],[data-rz]'); if (!t || (e.button != null && e.button > 0)) return;
    if (e.pointerType === 'mouse') e.preventDefault();   // no native drag / text selection taking the pointer away (a tap still clicks)
    DR = { t: t, x0: e.clientX, y0: e.clientY, moved: false, ghost: null, id: e.pointerId };
  }
  function cbMove(e) {
    if (!DR || e.pointerId !== DR.id) return;
    var dx = e.clientX - DR.x0, dy = e.clientY - DR.y0; if (!DR.moved && Math.abs(dx) + Math.abs(dy) < 7) return;
    if (!DR.moved) { DR.moved = true; if (DR.t.hasAttribute('data-dragbay') || DR.t.hasAttribute('data-dragpl')) { var g = document.createElement('div'); g.textContent = DR.t.textContent.replace(/[+−].*$/, '').trim() || DR.t.textContent; g.style.cssText = 'position:fixed;z-index:10000;pointer-events:none;background:#2E2E2E;color:#fff;padding:6px 10px;border-radius:8px;font:600 13px Inter,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25)'; document.body.appendChild(g); DR.ghost = g; } }
    e.preventDefault();
    if (DR.ghost) { DR.ghost.style.left = (e.clientX + 12) + 'px'; DR.ghost.style.top = (e.clientY + 12) + 'px'; return; }
    var svg = document.querySelector('#cbPlanBox svg'); if (!svg) return; var a = svg.getAttribute('data-plan').split(',').map(Number), f0 = cbFt(svg, DR.x0, DR.y0), f1 = cbFt(svg, e.clientX, e.clientY);
    if (DR.t.hasAttribute('data-pl')) DR.t.setAttribute('transform', 'translate(' + (f1.x - f0.x) * a[2] + ',' + (f1.y - f0.y) * a[2] + ')');
    if (DR.t.hasAttribute('data-rz')) { var c = PRODS[S.id].cz.cabin, lay = S.o.layout, L = Math.max(num(c.L && c.L.min) || 8, Math.min(num(c.L && c.L.max) || 40, Math.round(f1.x))), W = Math.max(num(c.W && c.W.min) || 8, Math.min(num(c.W && c.W.max) || 20, Math.round(f1.y)));
      var bx = svg.querySelector('[data-rzbox]'); bx.style.display = ''; bx.setAttribute('width', L * a[2]); bx.setAttribute('height', W * a[2]); DR.L = L; DR.W = W; }
  }
  function cbUp(e) {
    if (!DR || e.pointerId !== DR.id) return; var d = DR; DR = null; if (d.ghost) d.ghost.remove(); if (!d.moved) return;   // a tap: the click handler does it
    var c = PRODS[S.id].cz.cabin, lay = S.o.layout, svg = document.querySelector('#cbPlanBox svg'); d.t.setAttribute('data-dragged', '1');
    if (!svg) return; var f = cbFt(svg, e.clientX, e.clientY);
    if (d.t.hasAttribute('data-dragbay')) { var w = cbWallAt(c, lay, f); if (w && cbSet(c, lay, w.side, w.i, d.t.getAttribute('data-dragbay'))) { var ks = lay.walls[w.side]; S.sel = { side: w.side, i: cbHead(ks, Math.min(w.i, ks.length - 1)) }; } }
    else if (d.t.hasAttribute('data-dragpl')) { if (f.x > -0.5 && f.y > -0.5 && f.x < num(lay.L) + 0.5 && f.y < num(lay.W) + 0.5) S.psel = cbAdd(c, lay, d.t.getAttribute('data-dragpl'), f.x, f.y); }
    else if (d.t.hasAttribute('data-pl')) { var n = +d.t.getAttribute('data-pl'), f0 = cbFt(svg, d.x0, d.y0), pl = lay.places[n]; pl.x += f.x - f0.x; pl.y += f.y - f0.y; cbClamp(c, lay, pl); S.psel = n; }
    else if (d.t.hasAttribute('data-rz') && d.L) { lay.L = d.L; lay.W = d.W; cbResize(c, lay); arr(lay.places).forEach(function (p) { cbClamp(c, lay, p); }); cbSync(c, lay); S.sel = { side: S.sel.side, i: 0 }; }
    draw();
  }
  document.addEventListener('pointerdown', cbDown); document.addEventListener('pointermove', cbMove, { passive: false }); document.addEventListener('pointerup', cbUp); document.addEventListener('pointercancel', function () { if (DR && DR.ghost) DR.ghost.remove(); DR = null; });
  document.addEventListener('dragstart', function (e) { if (DR) e.preventDefault(); });

  // ------------------------------------------------------------ product page
  var S = null;   // {id, o, img}
  function daysTxt(d) { d = arr(d).map(num).filter(function (x) { return x != null; }); return d.length ? (d.length > 1 && d[0] !== d[1] ? d[0] + '–' + d[1] : d[d.length - 1]) + ' days' : ''; }
  function lastPin() { try { return (JSON.parse(localStorage.getItem('outrr_addr') || '{}').pincode) || ''; } catch (e) { return ''; } }

  window.mtoOpen = function (id) {
    var x = PRODS[id]; if (!x || !x.cz) return;
    var m = x.cz;
    S = { id: id, img: 0, o: { n: (m.n && num(m.n.min)) || '', l: '', w: '', h: arr(m.h && m.h.options)[0] || '', size: '', material: (arr(m.materials)[0] || {}).name || '', colour: '',
      addons: arr(m.addons).filter(function (a) { return a.on; }).map(function (a) { return a.name; }), install: !!(m.install && m.install.required), pin: lastPin(),
      groups: arr(m.groups).reduce(function (g, x) { var f = arr(x.options).filter(function (y) { return String(y.name || '').trim(); })[0]; if (f) g[x.name] = f.name; return g; }, {}),
      drawing: m.drawing !== 'no', size_ok: false, note: '' } };
    if (m.unit === 'cabin' && m.cabin && m.cabin.layout) { S.o.layout = cbClone(m.cabin.layout); cbDefaults(m.cabin, S.o.layout); S.o.material = ''; S.sel = { side: 'front', i: 0 }; S.psel = null; }   // 156, 157
    try { curPid = id; } catch (e) {}
    var ov = document.getElementById('mtoOv');
    if (!ov) { ov = document.createElement('div'); ov.id = 'mtoOv'; ov.className = 'mto-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); document.body.appendChild(ov);
      ov.addEventListener('input', onInput); ov.addEventListener('change', onChange); ov.addEventListener('click', onClick); }
    ov.setAttribute('aria-label', x.n);
    draw(); ov.classList.add('open'); ov.scrollTop = 0; document.body.classList.add('flt-open');
    try { if (window.otrack) otrack('view_item', { sku: id, value: x.p }); } catch (e) {}
  };
  window.mtoClose = function () { var ov = document.getElementById('mtoOv'); if (ov) ov.classList.remove('open'); document.body.classList.remove('flt-open'); };

  function gal(id) { var x = PRODS[id]; return [IMGS[x.img]].concat((window.GAL && GAL[id]) || []).filter(Boolean).filter(function (u, i, a) { return a.indexOf(u) === i; }); }

  function draw() {
    var x = PRODS[S.id], m = x.cz, o = S.o, u = m.unit, uw = UW(u), imgs = gal(S.id);
    var mats = arr(m.materials).filter(function (y) { return String(y.name || '').trim(); }), mat = mats.filter(function (y) { return y.name === o.material; })[0] || mats[0];
    var hOpts = arr(m.h && m.h.options);
    var size = u === 'cabin' ? cabinUI(m, o) : u === 'seat'
      ? '<p style="font-size:13px;color:#4A4640;margin:0 0 8px">How many seats?</p><div class="mto-sw">' + (function () { var b = []; for (var i = num(m.n.min); i <= num(m.n.max); i++) b.push('<button type="button" data-n="' + i + '" class="' + (String(o.n) === String(i) ? 'on' : '') + '">' + i + '</button>'); return b.join(''); })() + '</div>'
      : u === 'fixed'
      ? '<div class="mto-sw">' + arr(m.sizes).map(function (s) { return '<button type="button" data-size="' + esc(s.label) + '" class="' + (o.size === s.label ? 'on' : '') + '">' + esc(s.label) + ' · ' + rs(fixedAt(m, mat, s)) + '</button>'; }).join('') + '</div>'
      : '<div class="mto-g">' +
        ((u === 'area' || u === 'length') ? '<label>Length (ft)<input inputmode="decimal" data-k="l" value="' + esc(o.l) + '" placeholder="' + esc(m.l.min) + '–' + esc(m.l.max) + '"></label>' : '') +
        ((u === 'area' || u === 'face') ? '<label>' + (m.panels ? 'Running length (ft)' : 'Width (ft)') + '<input inputmode="decimal" data-k="w" value="' + esc(o.w) + '" placeholder="' + esc(m.w.min) + '–' + esc(m.w.max) + '"></label>' : '') +
        (hOpts.length ? '<label>Height (ft)<select data-k="h">' + hOpts.map(function (h) { return '<option' + (String(h) === String(o.h) ? ' selected' : '') + '>' + esc(h) + '</option>'; }).join('') + '</select></label>'
          : u === 'face' ? '<label>Height (ft)<input inputmode="decimal" data-k="h" value="' + esc(o.h) + '" placeholder="' + esc(m.h.min) + '–' + esc(m.h.max) + '"></label>' : '') +
        '</div><p style="font-size:13px;color:#6A6258;margin:8px 0 0">Measure the space in feet. ' + (u === 'area' ? 'Length × width is the area it covers.' : u === 'face' && m.panels ? 'Total length of the wall or parapet to cover. It is made in standard ' + panelSizes(m).join(' / ') + ' ft panels, rounded up to the next foot.' : u === 'face' ? 'Width × height of the opening or wall.' : 'Total running length.') + '</p>';
    var matHtml = u === 'cabin' || !mat ? '' : mats.length > 1 ? mats.map(function (y) { return '<label class="mto-opt' + (y === mat ? ' on' : '') + '"><input type="radio" name="mtoMat" data-mat="' + esc(y.name) + '"' + (y === mat ? ' checked' : '') + '><span><b>' + esc(y.name) + '</b><br><span style="color:#6A6258">' + (u === 'fixed' ? (y.prices && Object.keys(y.prices).length ? 'From ' + rs(Math.min.apply(null, arr(m.sizes).map(function (z) { return fixedAt(m, y, z); }))) : +y.rate ? '+ ' + rs(y.rate) : 'Standard') : m.panels ? 'Panels, frame and posts' : rs(y.rate) + ' / ' + uw) + '</span></span></label>'; }).join('') : '<p style="margin:0 0 8px;font-size:14px"><b>' + esc(mat.name) + '</b></p>';
    var cols = arr(mat && mat.colours);
    var colHtml = cols.length ? '<p style="font-size:13px;color:#4A4640;margin:6px 0">Colour</p><div class="mto-sw">' + cols.map(function (c) { return '<button type="button" data-col="' + esc(c.name) + '" class="' + (o.colour === c.name ? 'on' : '') + '">' + esc(c.name) + (+c.extra ? ' (+' + rs(c.extra) + '/' + uw + ')' : '') + '</button>'; }).join('') + '</div>' : '';
    var adds = arr(m.addons).filter(function (a) { return a.name; });
    var addHtml = adds.length ? '<div class="mto-box"><h3>3 · Add-ons</h3>' + adds.map(function (a) { return '<label class="mto-chk"><input type="checkbox" data-add="' + esc(a.name) + '"' + (o.addons.indexOf(a.name) >= 0 ? ' checked' : '') + '><span>' + esc(a.name) + '</span><span class="r">+ ' + rs(a.price) + (a.charge === 'unit' ? ' / ' + uw : '') + '</span></label>'; }).join('') + '</div>' : '';
    var gs = arr(m.groups).filter(function (g) { return g.name && arr(g.options).length; });
    var grpHtml = gs.map(function (g) { return '<div class="mto-box"><h3>' + esc(g.name) + '</h3>' + arr(g.options).filter(function (y) { return y.name; }).map(function (y) {
      var on = (o.groups || {})[g.name] === y.name, pr = [+y.fixed ? rs(y.fixed) : '', +y.rate ? rs(y.rate) + ' / ' + uw : '', +y.rate_w ? rs(y.rate_w) + ' / ft width' : ''].filter(Boolean).join(' + ');
      return '<label class="mto-chk"><input type="radio" name="mtoG_' + esc(g.name) + '" data-grp="' + esc(g.name) + '" value="' + esc(y.name) + '"' + (on ? ' checked' : '') + '><span>' + esc(y.name) + '</span><span class="r">' + (pr ? '+ ' + pr : 'Included') + '</span></label>'; }).join('') + '</div>'; }).join('');
    addHtml += grpHtml;
    var inst = m.install && m.install.offered, instReq = inst && m.install.required;
    var drw = m.drawing || 'choose';
    var instHtml = '<div class="mto-box"><h3>' + (u === 'cabin' ? '2' : adds.length ? '4' : '3') + ' · ' + (inst ? 'Installation &amp; drawing' : 'Drawing') + '</h3>' +
      (inst ? '<label class="mto-chk"><input type="checkbox" data-k="install"' + (o.install || instReq ? ' checked' : '') + (instReq ? ' disabled' : '') + '><span><b>' + (instReq ? 'Installation included (required)' : 'Add installation') + '</b> by ' + (m.install.by === 'brand' ? esc(x.br || 'the maker') : 'a verified outrr partner') + '<br><span id="mtoInstTxt" style="color:#6A6258"></span></span></label>' +
        '' : '') +
      (inst || hasDlv(m) ? '<label class="mto-f" style="max-width:220px;margin:4px 0 10px">Your pincode' + (hasDlv(m) ? ' (for delivery)' : '') + '<input inputmode="numeric" maxlength="6" data-k="pin" value="' + esc(o.pin) + '" placeholder="122002"></label>' : '') +
      (drw === 'choose' ? '<p style="margin:6px 0;font-size:14px;font-weight:600">Approve a drawing before we make it?</p>' +
        '<label class="mto-chk"><input type="radio" name="mtoDrw" data-drw="1"' + (o.drawing ? ' checked' : '') + '><span><b>Yes, send me a drawing</b>' + (daysTxt(m.drawing_days) ? ' (adds ' + daysTxt(m.drawing_days) + ')' : '') + '. Production starts after you approve it.</span></label>' +
        '<label class="mto-chk"><input type="radio" name="mtoDrw" data-drw="0"' + (!o.drawing ? ' checked' : '') + '><span><b>No, make it to my size</b></span></label>'
        : drw === 'always' ? '<p style="font-size:14px;margin:4px 0">We send you a drawing to approve before production' + (daysTxt(m.drawing_days) ? ' (' + daysTxt(m.drawing_days) + ')' : '') + '.</p>' : '') +
      (!o.drawing || drw === 'no' ? '<div class="mto-warn">Without a drawing, it is made exactly to the size you enter. outrr and the maker are not responsible for a wrong size.</div>' +
        '<label class="mto-chk"><input type="checkbox" data-k="size_ok"' + (o.size_ok ? ' checked' : '') + '><span>I have checked my size and I take responsibility for it.</span></label>' : '') +
      '<label class="mto-f" style="margin-top:8px">Anything the maker should know? <span style="color:#6A6258">(optional)</span><textarea rows="2" data-k="note" maxlength="500">' + esc(o.note) + '</textarea></label></div>';
    var more = Object.keys(PRODS).filter(function (k) { return k !== S.id && PRODS[k].cz && PRODS[k].col === x.col; }).slice(0, 4);
    var ov = document.getElementById('mtoOv');
    ov.innerHTML = '<div class="mto-top"><button class="mto-x" type="button" data-act="close" aria-label="Back">←</button><b>' + esc(x.n) + '</b><button class="mto-x" type="button" data-act="close" aria-label="Close">✕</button></div>' +
      '<div class="mto-wrap"><section class="mto-gal" aria-label="Photos"><img class="main" src="' + esc(imgs[S.img] || '') + '" alt="' + esc(x.alt || x.n) + '">' +
      (imgs.length > 1 ? '<div class="mto-th">' + imgs.map(function (g, i) { return '<button type="button" data-img="' + i + '" class="' + (i === S.img ? 'on' : '') + '" aria-label="Photo ' + (i + 1) + '"><img src="' + esc(g) + '" alt=""></button>'; }).join('') + '</div>' : '') +
      '<div class="mto-facts"><div>Made in<b>' + esc(daysTxt(m.make_days) || '—') + '</b></div><div>Delivery<b>' + (hasDlv(m) ? 'By pincode' : 'Included in the price') + '</b></div><div>Installation<b>' + (instReq ? 'Included' : inst ? 'Optional add-on' : 'By you') + '</b></div></div>' +
      (x.ds ? '<p style="font-size:15px;line-height:1.65;color:#4A4640;margin-top:16px">' + esc(x.ds) + '</p>' : '') + '</section>' +
      '<section class="mto-cfg" aria-label="Build your design"><span class="mto-badge">Made to Order</span><h1>' + esc(x.n) + '</h1>' +
      '<p class="mto-by">by <b>' + esc(x.br || 'outrr') + '</b>' + (x.mat ? ' · ' + esc(x.mat) : '') + '</p>' +
      (x.oo === false ? '<p class="mto-from"><span class="soonb">Coming soon</span></p>' : '<p class="mto-from">From <b>' + rs(x.p) + '</b>' + (u === 'cabin' ? ' · this preset as shown' : u !== 'fixed' ? ' · ' + rs(Math.min.apply(null, mats.map(function (y) { return +y.rate || 0; }))) + ' / ' + uw : '') + ' · incl. GST</p>') +
      (u === 'cabin' ? '<div class="mto-box"><h3>1 · Customise your cabin</h3>' + size + '</div>' + instHtml :
      '<div class="mto-box"><h3>1 · Your size</h3>' + size + '</div>' +
      '<div class="mto-box"><h3>2 · Material &amp; finish</h3>' + matHtml + colHtml + '</div>' + addHtml + instHtml) +
      '<div class="mto-sum" id="mtoSum"></div></section>' +
      '<section class="mto-steps" aria-label="How it is made"><h2>How your order is made</h2><ol>' +
      ['Order & ' + PCT + '%|Size and options locked', 'Drawing|If you chose it: approve online', 'Production|' + (daysTxt(m.make_days) || 'Made for you'), 'Balance|Pay the rest' + (inst ? ' + installation' : '') + ' before dispatch', 'Dispatch|Tracking shared', 'Installation|If added: OTP on completion']
        .map(function (s, i) { var p = s.split('|'); return '<li><i>' + (i + 1) + '</i><b>' + esc(p[0]) + '</b>' + esc(p[1]) + '</li>'; }).join('') + '</ol></section>' +
      (more.length ? '<section class="mto-more"><h2>More designs</h2><div class="row">' + more.map(function (k) { var y = PRODS[k]; return '<a data-open="' + esc(k) + '"><img src="' + esc(IMGS[y.img] || '') + '" alt=""><span style="color:#6A6258;font-size:12px">by ' + esc(y.br || 'outrr') + '</span><b>' + esc(y.n) + '</b><span>From ' + rs(y.p) + '</span></a>'; }).join('') + '</div></section>' : '') +
      (arr(m.specs).length ? '<section class="mto-faq" aria-label="Specifications"><h2 style="font-size:22px;margin:10px 0 12px">Specifications</h2><div style="background:#FFFBF5;border:1px solid #E2D6C4;border-radius:12px;overflow:hidden">' +
        arr(m.specs).map(function (sp, i, a) { var g = i === 0 || a[i - 1].group !== sp.group; return (g ? '<div style="padding:10px 14px;background:#EADCC8;font-weight:700;font-size:13px">' + esc(sp.group) + '</div>' : '') +
          '<div style="display:grid;grid-template-columns:minmax(0,0.8fr) minmax(0,1.6fr);gap:12px;padding:10px 14px;border-top:1px solid #EDE3D4;font-size:14px"><span style="color:#6A6258">' + esc(sp.label) + '</span><span>' + esc(sp.value) + '</span></div>'; }).join('') + '</div></section>' : '') +
      '<section class="mto-faq"><h2 style="font-size:22px;margin:10px 0 12px">Questions</h2>' +
      arr(m.faqs).map(function (f) { return '<details><summary>' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p></details>'; }).join('') +
      '<details><summary>How do I measure?</summary><p>' + (u === 'area' ? 'Measure the floor area it should cover, post to post, in feet.' : u === 'face' ? 'Measure the width and height of the wall or opening, in feet.' : u === 'length' ? 'Measure the total running length, in feet.' : 'Pick the size that fits your space; the sizes are in the size chart photo.') + ' Not sure? Choose the drawing option and we check it with you.</p></details>' +
      '<details><summary>When do I pay the rest?</summary><p>You pay ' + PCT + '% now. The rest' + (inst ? ' and the installation charge are' : ' is') + ' paid when it is ready, before it is dispatched: we email you the link.</p></details>' +
      '<details><summary>Can I cancel or return it?</summary><p>It is made for you, so it can’t be cancelled once production starts or returned for a change of mind. A defect or damage in delivery is fixed by the maker.</p></details>' +
      (inst && !instReq ? '<details><summary>Can I install it myself?</summary><p>Yes. Without installation, fixing is yours: a fixing guide comes with it.</p></details>' : '') +
      '</section></div>';
    paint();
  }

  function paint() {
    var x = PRODS[S.id], m = x.cz, o = S.o; o.zone = zoneOf(m.ships_from, o.pin); var q = price(m, o, PCT), el = document.getElementById('mtoSum'), it = document.getElementById('mtoInstTxt');
    if (it) it.textContent = !/^\d{6}$/.test(o.pin) ? 'Enter your pincode to see the installation charge' : q.ok && q.install ? (q.install.available ? q.install.city + ': ' + rs(q.install.fee) : 'Not available at this pincode yet: delivery only, with a fixing guide') : '';
    if (!el) return;
    if (!q.ok) { el.innerHTML = '<p class="mto-err" style="margin:0">' + esc(q.error) + '</p><button class="mto-go" type="button" disabled>Enter your size</button>'; return; }
    var ins = o.install && q.install && q.install.available;
    var needOk = !o.drawing && !o.size_ok, closed = x.oo === false, needPin = q.delivery && q.delivery.fee == null;
    if (m.unit === 'cabin') {   // 156
      el.innerHTML = q.addons.filter(function (a) { return a.name !== 'Layout'; }).map(function (a) { return a.amount ? '<div class="rw"><span>' + esc(a.name) + '</span><span>' + rs(a.amount) + '</span></div>' : '<div class="rw" style="font-size:12.5px"><span>' + esc(a.name) + '</span><span></span></div>'; }).join('') +
        (q.install && q.install.available ? '<div class="rw"><span>Installation + transport (' + esc(q.install.city) + ')</span><span>' + rs(q.install_fee) + '</span></div>' : '<div class="rw"><span>Installation + transport</span><span>' + (/^\d{6}$/.test(o.pin) ? 'Not available' : 'Enter your pincode') + '</span></div>') +
        '<div class="rw tt"><span>Total</span><span>' + rs(q.total) + '</span></div>' +
        '<div class="mto-pay"><div>Pay now (' + PCT + '%)<b>' + rs(q.pay_now) + '</b></div><div>Later (dispatch + delivery)<b>' + rs(q.before_dispatch) + '</b></div></div>' +
        '<button class="mto-go" type="button" data-act="order"' + (closed || !q.install || !q.install.available ? ' disabled' : '') + '>' + (closed ? 'Orders open soon' : !(q.install && q.install.available) ? 'Enter your pincode' : 'Order now · pay ' + rs(q.pay_now)) + '</button>';
      return;
    }
    el.innerHTML = '<div class="rw"><span>' + (m.unit === 'fixed' ? esc(q.size) + (q.rate || arr(m.materials).length > 1 ? ' + ' + esc(q.material) : '') : m.unit === 'seat' ? q.qty + '-seat bench' : q.panels ? q.panels.width + ' ft × ' + esc(o.h) + ' ft high, ' + esc(q.material) : q.qty + ' ' + UW(m.unit) + ' × ' + rs(q.rate)) + (q.min_charge_used ? ' (minimum)' : '') + '</span><span>' + rs(q.base) + '</span></div>' +
      (q.panels ? '<div class="rw" style="font-size:12.5px;color:#6A6258"><span>' + esc(panelsText(q.panels)) + '</span><span></span></div>' : '') +
      q.addons.map(function (a) { return '<div class="rw"><span>' + esc(a.name) + '</span><span>' + rs(a.amount) + '</span></div>'; }).join('') +
      (ins ? '<div class="rw"><span>Installation (' + esc(q.install.city) + ')</span><span>' + rs(q.install_fee) + '</span></div>' : '') +
      '<div class="rw"><span>Delivery</span><span>' + (!q.delivery ? 'Included' : q.delivery.fee == null ? 'Enter your pincode' : rs(q.delivery_fee)) + '</span></div>' +
      '<div class="rw tt"><span>Total</span><span>' + rs(q.total) + '</span></div>' +
      '<div class="mto-pay"><div>Pay now (' + PCT + '%)<b>' + rs(q.pay_now) + '</b></div><div>Before dispatch' + (ins ? ' (rest + installation)' : '') + '<b>' + rs(q.before_dispatch) + '</b></div></div>' +
      (o.install && q.install && !q.install.available && /^\d{6}$/.test(o.pin) ? '<p class="mto-err" style="margin:10px 0 0">Installation isn’t available at ' + esc(o.pin) + ' yet: untick it to order without.</p>' : '') +
      '<button class="mto-go" type="button" data-act="order"' + (needOk || closed || needPin || (o.install && q.install && !q.install.available) ? ' disabled' : '') + '>' + (closed ? 'Orders open soon' : needPin ? 'Enter your pincode' : needOk ? 'Confirm your size above' : 'Order now · pay ' + rs(q.pay_now)) + '</button>' +
      '<p style="text-align:center;font-size:13px;color:#CFC8BD;margin:10px 0 0">Buying for a project or 5+ pieces? <a style="color:#F2B49C;cursor:pointer" data-act="bulk">Get a bulk quote</a></p>';
  }

  function onInput(e) { var k = e.target.getAttribute('data-k'); if (!k || !S) return; if (k === 'pin') e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); S.o[k] = e.target.value; paint(); }
  function onChange(e) {
    var t = e.target, k = t.getAttribute('data-k'); if (!S) return;
    if (k === 'install' || k === 'size_ok') { S.o[k] = t.checked; var mm = (PRODS[S.id] || {}).cz; if (k === 'install' && mm && mm.install && mm.install.required) S.o.install = true; return paint(); }
    if (t.hasAttribute('data-grp')) { S.o.groups = Object.assign({}, S.o.groups); S.o.groups[t.getAttribute('data-grp')] = t.value; return paint(); }
    if (t.hasAttribute('data-cdim')) { var cz = PRODS[S.id].cz; S.o.layout[t.getAttribute('data-cdim')] = +t.value; cbResize(cz.cabin, S.o.layout); arr(S.o.layout.places).forEach(function (p) { cbClamp(cz.cabin, S.o.layout, p); }); cbSync(cz.cabin, S.o.layout); S.sel = { side: S.sel.side, i: 0 }; return draw(); }   // 156
    if (t.hasAttribute('data-citc')) { S.o.layout.items = Object.assign({}, S.o.layout.items); S.o.layout.items[t.getAttribute('data-citc')] = t.checked ? 1 : 0; return draw(); }
    if (k === 'h') { S.o.h = t.value; return paint(); }
    if (t.hasAttribute('data-mat')) { S.o.material = t.getAttribute('data-mat'); S.o.colour = ''; return draw(); }
    if (t.hasAttribute('data-drw')) { S.o.drawing = t.getAttribute('data-drw') === '1'; return draw(); }
    if (t.hasAttribute('data-add')) { var n = t.getAttribute('data-add'); S.o.addons = S.o.addons.filter(function (a) { return a !== n; }); if (t.checked) S.o.addons.push(n); return paint(); }
  }
  function onClick(e) {
    var t = e.target.closest('[data-act],[data-size],[data-col],[data-img],[data-open],[data-n],[data-bay],[data-bk],[data-cch],[data-cit],[data-pl],[data-dragpl],[data-pact]'); if (!t || !S) return;
    var cz0 = (PRODS[S.id] || {}).cz;   // 156: cabin builder
    if (t.getAttribute && t.getAttribute('data-dragged')) { t.removeAttribute('data-dragged'); return; }
    if (t.hasAttribute('data-pl')) { S.psel = +t.getAttribute('data-pl'); return draw(); }   // 157
    if (t.hasAttribute('data-dragpl')) { S.psel = cbAdd(cz0.cabin, S.o.layout, t.getAttribute('data-dragpl')); return draw(); }
    if (t.hasAttribute('data-pact')) { var pa = t.getAttribute('data-pact'), lay0 = S.o.layout, pl0 = arr(lay0.places)[S.psel];
      if (pa === 'done' || !pl0) S.psel = null;
      else if (pa === 'del') { lay0.places = lay0.places.filter(function (z, zi) { return zi !== S.psel; }); S.psel = null; }
      else if (pa === 'rot') { pl0.rot = pl0.rot === 90 ? 0 : 90; cbClamp(cz0.cabin, lay0, pl0); }
      else { pl0.len = Math.max(1, (num(pl0.len) || 1) + (pa === 'more' ? 1 : -1)); cbClamp(cz0.cabin, lay0, pl0); }
      cbSync(cz0.cabin, lay0); return draw(); }
    if (t.hasAttribute('data-bay')) { var bp = t.getAttribute('data-bay').split(':'); S.sel = { side: bp[0], i: +bp[1] }; return draw(); }
    if (t.hasAttribute('data-bk')) { var ks0 = S.o.layout.walls[S.sel.side], h0 = cbHead(ks0, Math.min(S.sel.i, ks0.length - 1)), nk = t.getAttribute('data-bk'); if (cbSet(cz0.cabin, S.o.layout, S.sel.side, h0, nk)) S.sel.i = Math.max(0, Math.min(h0, ks0.length - cbSpan(cz0.cabin, nk))); return draw(); }
    if (t.hasAttribute('data-cch')) { S.o.layout[t.getAttribute('data-cch')] = t.getAttribute('data-v'); return draw(); }
    if (t.hasAttribute('data-cit')) { var ik = t.getAttribute('data-cit'), itd = arr(cz0.cabin.items).filter(function (z) { return z.key === ik; })[0]; S.o.layout.items = Object.assign({}, S.o.layout.items); S.o.layout.items[ik] = Math.max(0, Math.min(num(itd && itd.max) || 100, (num(S.o.layout.items[ik]) || 0) + (+t.getAttribute('data-d')))); return draw(); }
    if (t.hasAttribute('data-n')) { S.o.n = +t.getAttribute('data-n'); return draw(); }
    if (t.hasAttribute('data-size')) { S.o.size = t.getAttribute('data-size'); return draw(); }
    if (t.hasAttribute('data-col')) { var c = t.getAttribute('data-col'); S.o.colour = S.o.colour === c ? '' : c; return draw(); }
    if (t.hasAttribute('data-img')) { S.img = +t.getAttribute('data-img'); return draw(); }
    if (t.hasAttribute('data-open')) { return window.mtoOpen(t.getAttribute('data-open')); }
    var a = t.getAttribute('data-act');
    if (a === 'close') return window.mtoClose();
    if (a === 'bulk') { window.mtoClose(); try { if (window.openBulk) return openBulk(S.id); } catch (er) {} return toast('Write to us on WhatsApp for a bulk quote'); }
    if (a === 'order') return order();
  }

  // ------------------------------------------------------------ checkout (its own: one design, 50% now)
  window.MTO_BUY = null;
  function order() {
    var x = PRODS[S.id], q = price(x.cz, S.o, PCT); if (!q.ok) return toast(q.error);
    if (x.oo === false) return toast('Orders for this maker open soon');
    var o = S.o;
    window.MTO_BUY = { id: S.id, o: { n: o.n, l: o.l, w: o.w, h: o.h, size: o.size, material: o.material, colour: o.colour, addons: o.addons.slice(), groups: Object.assign({}, o.groups || {}), install: !!o.install, drawing: !!o.drawing, size_ok: !!o.size_ok, note: o.note, layout: o.layout ? cbClone(o.layout) : undefined }, pin: o.pin };
    window.mtoClose();
    var go = function () { renderCheckout(); showView('checkout'); };
    try { if (window.otrack) otrack('begin_checkout', { value: q.total, skus: [S.id] }); } catch (e) {}
    if (window.acRequire && (window.OUTRR_SUPA || {}).url) return acRequire(go, 'Sign in to check out');
    go();
  }
  function coPin() { var e = document.getElementById('coPin'); return e ? e.value.trim() : ''; }
  function buyQuote() { var b = window.MTO_BUY, x = b && PRODS[b.id]; if (!x) return null; var o = {}; for (var k in b.o) o[k] = b.o[k]; o.pin = coPin(); o.zone = zoneOf(x.cz.ships_from, o.pin); return price(x.cz, o, PCT); }

  var _ct = window.coTotals, _rc = window.renderCheckout, _po = window.placeOrder, _sp = window.coShipPaint, _oc = window.openCart, _ock = window.openCheckout;
  window.coTotals = function () {
    if (!window.MTO_BUY) return _ct();
    var q = buyQuote() || { ok: false };
    return { sub: q.ok ? q.product : 0, mrp: q.ok ? q.product : 0, save: 0, coup: 0, code: null, ship: 0, loc: null, total: q.ok ? q.total : 0, items: 1, mq: q };
  };
  var _csh = window.coSplitHTML, _cpl = window.coPayLabel;
  window.coSplitHTML = function (t) { if (!window.MTO_BUY) return _csh(t); var q = t.mq || {}; if (!q.ok) return '<div class="mto-warn">' + esc(q.error || '') + '</div>';
    return '<div class="osum" style="margin-top:10px;padding:10px 12px;font-size:13px">You pay <b>' + PCT + '% now (' + rs(q.pay_now) + ')</b>. The rest, ' + rs(q.before_dispatch) + (q.install_fee ? ' with the installation charge' : '') + ', is paid before dispatch: we email you the link when it is ready.' +
      (window.MTO_BUY.o.install && q.install && !q.install.available && /^\d{6}$/.test(coPin()) ? '<div class="mto-warn">Installation isn’t available at ' + esc(coPin()) + '. Use the address where it is installed, or go back and untick installation.</div>' : '') + '</div>'; };
  window.coPayLabel = function (t) { if (!window.MTO_BUY) return _cpl(t); var q = t.mq || {}; return q.ok ? 'Pay ' + PCT + '% now · ' + rs(q.pay_now) : 'Check the size'; };
  window.renderCheckout = function () {
    if (!window.MTO_BUY) return _rc();
    var b = window.MTO_BUY, x = PRODS[b.id], keep = CART;
    CART = [{ id: b.id, q: 1 }];
    try { _rc(); } finally { CART = keep; }
    var pe = document.getElementById('coPin'); if (pe && !pe.value && /^\d{6}$/.test(b.pin || '')) pe.value = b.pin;   // the pincode typed on the design page
    var o = b.o, spec = [x.cz.unit === 'cabin' ? o.layout.L + ' × ' + o.layout.W + ' ft, your layout' : x.cz.unit === 'seat' ? o.n + ' seats' : x.cz.unit === 'fixed' ? o.size : [o.l, o.w].filter(Boolean).join(' × ') + ' ft' + (o.h ? ', ' + o.h + ' ft high' : ''), o.material, o.colour].concat(o.addons).concat(Object.keys(o.groups || {}).map(function (g) { return g + ': ' + o.groups[g]; })).filter(Boolean).join(' · ');
    var cl = document.querySelector('#coBody .coline');
    if (cl) cl.innerHTML = '<div class="im"><img src="' + esc(IMGS[x.img] || '') + '" alt=""></div><div><b>' + esc(x.n) + '</b> <span class="mto-badge" style="font-size:9px;padding:3px 7px">Made to Order</span>' +
      '<div class="co-mto">' + esc(spec) + '<br>' + (o.drawing ? 'Drawing to approve before production' : 'Made to the size you entered (you confirmed it)') + (o.install ? '<br>With installation' : '') + '</div></div><div class="q" id="coMtoAmt"></div>';
    var dl = document.getElementById('coDlvTxt'); if (dl) dl.innerHTML = (hasDlv(x.cz) ? '<b>Delivery to your pincode</b>' : '<b>Delivery included</b>') + '<span>Made in ' + esc(daysTxt(x.cz.make_days) || 'a few weeks') + ', then dispatched with tracking</span>';
    var asm = dl && dl.closest('.cobox') && dl.closest('.cobox').querySelector('.secline'); if (asm) asm.textContent = o.install ? 'Installed by ' + (x.cz.install.by === 'brand' ? (x.br || 'the maker') : 'a verified outrr partner') + ' after delivery.' : 'Fixing is yours: a fixing guide comes with it.';
    mtoCoPaint();
  };
  function mtoCoPaint() {
    var t = window.coTotals(), q = t.mq || {}, sum = document.querySelector('#coBody .osum');
    if (sum) {
      var rows = '<div class="r"><span>Design</span><span>' + (q.ok ? rs(q.product) : '—') + '</span></div>' +
        (window.MTO_BUY.o.install ? '<div class="r"><span>Installation' + (q.ok && q.install && q.install.city ? ' (' + esc(q.install.city) + ')' : '') + '</span><span>' + (q.ok && q.install && q.install.available ? rs(q.install_fee) : /^\d{6}$/.test(coPin()) ? 'Not available here' : 'Enter pincode') + '</span></div>' : '') +
        '<div class="r"><span>Delivery</span>' + (!q.delivery ? '<span class="grn">Included</span>' : q.delivery.fee == null ? '<span>Enter pincode</span>' : '<span>' + rs(q.delivery_fee) + '</span>') + '</div><div class="r tot"><span>Total</span><span id="coTot">' + (q.ok ? rs(q.total) : '—') + '</span></div>';
      sum.innerHTML = rows;
    }
    var amt = document.getElementById('coMtoAmt'); if (amt) amt.textContent = q.ok ? rs(q.product) : '';
    var sp = document.getElementById('coSplit'); if (sp) sp.innerHTML = window.coSplitHTML(t);
    var bt = document.getElementById('coPlace'); if (bt && !bt.disabled) bt.textContent = window.coPayLabel(t);
  }
  window.coShipPaint = function () { if (!window.MTO_BUY) return _sp(); mtoCoPaint(); };
  var _nb = window.nearBlocked; window.nearBlocked = function () { return window.MTO_BUY ? false : (_nb ? _nb() : false); };
  window.openCart = function () { window.MTO_BUY = null; return _oc.apply(this, arguments); };
  window.openCheckout = function () { window.MTO_BUY = null; return _ock.apply(this, arguments); };
  window.placeOrder = async function () {
    if (!window.MTO_BUY) return _po();
    var b = window.MTO_BUY, q = buyQuote();
    if (q && q.ok && b.o.install && q.install && !q.install.available && /^\d{6}$/.test(coPin())) return toast('Installation isn’t available at this pincode');
    var keep = CART, line = { id: b.id, q: 1, mto: b.o };
    CART = [line];
    try { await _po(); } finally {
      if (!CART.length) { CART = keep; try { updBadge(); } catch (e) {} window.MTO_BUY = null; }   // placed: the retail cart comes back untouched
      else CART = keep;
    }
  };
})();
