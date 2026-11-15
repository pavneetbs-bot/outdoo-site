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
    var ws = 0, nb = 0, nsl = 0, ndr = 0, cnt = {}, walls = {}, si, err = null;
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
        cnt[k] = (cnt[k] || 0) + 1; nb += sp; i += sp; if (k === 'slide') nsl++; if (b.door) ndr++;
      }
      walls[side] = ks;
    }
    var wamt = rnd(ws * (1 + (num(hgt && hgt.walls_pct) || 0) / 100)), samt = rnd(fl * ((num(c.shell) || 0) + (num(roof && roof.rate) || 0) + (num(hgt && hgt.rate) || 0)));
    var summ = arr(c.bays).filter(function (x) { return cnt[x.key]; }).map(function (x) { return x.name + ' × ' + cnt[x.key]; }).join(', ');
    var nm = function (x) { return x ? x.name : null; };
    var lines = [{ name: (c.kind || 'Cabin') + ' shell · ' + L + ' × ' + W + ' ft (' + fl + ' sq ft) · ' + ((roof && roof.name) || 'roof'), amount: samt },
      { name: 'Walls · ' + nb + ' bays: ' + summ, amount: wamt }, { name: 'Spec: ' + [nm(hgt), nm(pnl), nm(gls), nm(frm)].filter(function (x) { return x != null; }).join(', '), amount: 0 }];
    var total = samt + wamt, items = {}, its = arr(c.items), a2;
    // 159: sliding door tracks, full-height doors, rain gutter, pergola projection
    var trk = pick(c.tracks, lay.tracks);
    if (nsl > 0 && (num(trk && trk.extra) || 0) !== 0) { a2 = rnd(nsl * num(trk.extra)); lines.push({ name: 'Sliding doors: ' + trk.name + ' × ' + nsl, amount: a2 }); total += a2; }
    if (lay.full_doors === true && ndr > 0 && (num(c.full_door) || 0) > 0) { a2 = rnd(ndr * num(c.full_door)); lines.push({ name: 'Full-height doors × ' + ndr, amount: a2 }); total += a2; }
    var gsd = SIDES.indexOf(lay.gutter) >= 0 && typeof lay.gutter === 'string' && (num(c.gutter) || 0) > 0 ? lay.gutter : null;
    if (gsd) { var gl = gsd === 'front' || gsd === 'back' ? L : W; a2 = rnd(num(c.gutter) * gl); lines.push({ name: 'Rain gutter + downpipe · slope to the ' + gsd + ' · ' + gl + ' ft', amount: a2 }); total += a2; }
    var pj = null;
    if (isObj(c.proj)) {
      var ps0 = lay.proj && Array.isArray(lay.proj.sides) ? lay.proj.sides : null, psd = ['front', 'right', 'back', 'left'].filter(function (x) { return ps0 && ps0.indexOf(x) >= 0; });
      if (!psd.length && c.proj.required === true) return { ok: false, error: 'Choose where the pergola projection goes' };
      var lp = lay.proj || {}, pdz = pick(c.proj.designs, lp.design), ptp = pick(c.proj.tops, lp.top), pun = pick(c.proj.unders, lp.under);
      var plen = psd.reduce(function (t, x) { return t + (x === 'front' || x === 'back' ? L : W); }, 0), dep = dv(c.proj.depth, 1.5);
      if (plen > 0) { a2 = rnd(plen * ((num(c.proj.rate) || 0) + (num(pdz && pdz.extra) || 0)) + plen * dep * ((num(ptp && ptp.rate) || 0) + (num(pun && pun.rate) || 0)));
        lines.push({ name: 'Pergola projection ' + dep + ' ft deep · ' + plen + ' ft (' + psd.join(', ') + ') · ' + [nm(pdz), nm(ptp), nm(pun)].filter(function (x) { return x != null; }).join(', ') + ' · lights included', amount: a2 }); total += a2; }
      pj = { sides: psd, design: nm(pdz), top: nm(ptp), under: nm(pun) };
    }
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
      layout: { L: L, W: W, roof: nm(roof), height: nm(hgt), panel: nm(pnl), glass: nm(gls), frame: nm(frm), walls: walls, items: items, places: places,
        tracks: nm(trk), full_doors: lay.full_doors === true, gutter: gsd, proj: pj } };
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
    '.pdp-mto .qtyrow,.pdp-mto .cashback,.pdp-mto .etamod,.pdp-mto .delvblock,.pdp-mto #vSec,.pdp-mto #setSec,.pdp-mto .acc.rts-only,.pdp-mto #pdHurry,.pdp-mto #pdSize,.pdp-mto .chips .chip.terra,.pdp-mto #pdDlv,.pdp-mto #pdMto,.pdp-mto #pdEtaLine,.pdp-mto-on .ctas button[onclick="addCart()"],.pdp-mto button[onclick="addCart()"]{display:none!important}' +
    '.mfrom{font-size:14px;font-weight:600;color:#6b665c;margin-right:2px}.mto-pcfg .mto-ph{font-size:15px;margin:0 0 4px}.mto-hint{font-size:12.5px;color:#6b665c;margin:0 0 10px}' +
    '.mto-pks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.mto-pk{display:flex;flex-direction:column;gap:5px;font-size:12px;color:#6b665c;font-weight:600}' +
    '.mto-pk select,.mto-pk input,.mto-note textarea{font:inherit;font-size:14px;font-weight:500;color:#2e2e2e;padding:9px 11px;border:1.5px solid var(--line,#E2D6C4);border-radius:10px;min-height:44px;box-sizing:border-box;width:100%;background:#fff}.mto-pk select:focus,.mto-pk input:focus{border-color:#C26445;outline:none}' +
    '.mto-adds{margin-top:12px}.mto-al{display:block;font-size:12px;color:#6b665c;font-weight:600;margin-bottom:2px}.mto-pcfg .mto-chk{font-size:13.5px}.mto-note{margin-top:8px;font-size:13px}.mto-note summary{cursor:pointer;color:#9C4127;font-weight:600;min-height:32px}' +
    '.mto-sum.lt{background:#FBF6EE;color:#2E2E2E;border:1px solid #E2D6C4;margin-top:14px}.mto-sum.lt .rw span:first-child{color:#6b665c}.mto-sum.lt .tt span:first-child{color:#2E2E2E}.mto-sum.lt .tt{border-color:#E2D6C4}.mto-sum.lt .mto-pay div{background:#fff;border:1px solid #E2D6C4;color:#6b665c}.mto-sum.lt .mto-pay b{color:#2E2E2E}.mto-sum.lt .mto-err{color:#9C4127}.mto-sum.lt p a{color:#9C4127!important}.mto-sum.lt p{color:#6b665c!important}' +
    '.mto-stp{margin:0;padding-left:18px;line-height:1.8;font-size:13.5px}.mto-q{font-size:13.5px;margin:0 0 10px;line-height:1.5}' +
    '@media(max-width:560px){.mto-pks{grid-template-columns:1fr}}' +
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
    '.wz-pic-main{height:210px;background:#F3EEE6;border-radius:16px;padding:12px;box-sizing:border-box;margin-bottom:12px}'+
    '.mto-wrap>section{min-width:0}.wz-views{max-width:100%}'+
    '.wz-3d{position:sticky;top:52px;z-index:3;background:#FFFBF5;padding-bottom:8px;margin:0 -2px 10px}.wz-3dv{height:260px;background:#F3EEE6;border-radius:16px;overflow:hidden;position:relative}.wz-3dv>svg{padding:12px;box-sizing:border-box}'+
    '.wz-views{display:flex;gap:6px;overflow-x:auto;margin-top:8px;scrollbar-width:none}.wz-views button{flex:none;border:1px solid #E2D6C4;background:#fff;border-radius:99px;padding:6px 12px;min-height:36px;font:inherit;font-size:12.5px;cursor:pointer;color:#2E2E2E}.wz-views button.on{background:#2E2E2E;color:#fff;border-color:#2E2E2E}'+
    '.wz-hint{position:absolute;left:10px;bottom:8px;font-size:11px;color:#6A6258;background:rgba(255,251,245,.85);padding:3px 8px;border-radius:99px;pointer-events:none}'+
    '.wz-dims{background:#fff;border:1px solid #E2D6C4;border-radius:12px;padding:6px;margin-top:12px}.wz-dims h5{font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#6A6258;margin:6px 6px 2px}'+
    '.wz-stp{display:flex;align-items:center;gap:8px}.wz-stp input{width:72px!important;text-align:center;min-height:40px!important}.wz-note{background:#EEF3EA;border:1px solid #CBD8C2;border-radius:12px;padding:10px 12px;font-size:13px;color:#33402B;margin:10px 0}'+
    '.wz-steps{display:flex;gap:5px;margin:0 0 12px}.wz-steps button{flex:1;height:6px;border:0;border-radius:3px;background:#E6DED2;padding:0;cursor:pointer}.wz-steps button.on{background:#C26445}'+
    '.wz-h{font-size:19px;font-weight:800;margin:0}.wz-sub{font-size:13px;color:#6A6258;margin:2px 0 12px}.wz-lbl{font-size:13px;font-weight:700;margin:14px 0 8px}'+
    '.wz-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.wz-card{border:1px solid #E2D6C4;background:#fff;border-radius:14px;padding:10px;text-align:center;font:inherit;color:#2E2E2E;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;min-height:64px}'+
    '.wz-card.on{border:2px solid #C26445;background:#FBEDE7}.wz-card[disabled]{opacity:.45;cursor:not-allowed}.wz-card b{font-size:14px}.wz-card small{font-size:12px;color:#6A6258}.wz-pic{display:block;width:100%;height:70px;margin-bottom:4px}'+
    '.wz-row{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #E2D6C4;border-radius:14px;padding:12px;margin-bottom:10px;cursor:pointer}.wz-row>span:first-child{flex:1;display:flex;flex-direction:column}.wz-row small{font-size:12px;color:#6A6258}.wz-pr{font-size:12.5px;color:#6A6258;white-space:nowrap}'+
    '.wz-sw{appearance:none;-webkit-appearance:none;width:48px;height:28px;border-radius:99px;background:#D9D4CB;position:relative;cursor:pointer;flex:none;margin:0;transition:background .15s}.wz-sw:checked{background:#C26445}.wz-sw::after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;transition:left .15s}.wz-sw:checked::after{left:23px}'+
    '.wz-pm{width:40px;height:40px;border-radius:50%;border:1px solid #C9BBA6;background:#fff;font-size:20px;cursor:pointer}.wz-tabs{display:flex;gap:8px;flex-wrap:wrap}.wz-tabs button,.wz-chip{border:1px solid #E2D6C4;background:#fff;border-radius:99px;padding:8px 14px;min-height:40px;font:inherit;font-size:13px;cursor:pointer}.wz-tabs button.on{border:2px solid #C26445;font-weight:700}'+
    '.wz-sw-col{width:46px;height:46px;border-radius:50%;border:1px solid #BBB;cursor:pointer}.wz-sw-col.on{outline:3px solid #C26445;outline-offset:2px}.wz-elev{background:#fff;border:1px solid #E2D6C4;border-radius:12px;padding:10px;margin-top:10px}'+
    '.wz-nav{display:flex;justify-content:space-between;align-items:center;margin-top:16px;gap:10px}.wz-next{background:#2E2E2E;color:#fff;border:0;border-radius:12px;padding:13px 22px;font:inherit;font-weight:700;min-height:46px;cursor:pointer}.wz-prev{background:none;border:0;font:inherit;color:#4A4640;cursor:pointer;min-height:44px}'+
    '.wz-back{display:block;margin-top:14px;background:none;border:0;color:#9C4127;font:inherit;font-weight:700;cursor:pointer;min-height:44px;padding:0}.wz-sum{margin:0;padding-left:18px;line-height:1.9;font-size:14px}'+
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
  function cbPlaceable(it) { return it && ((it.unit === 'nos' && it.key in CB_FOOT) || it.unit === 'rft'); }
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
  function cbPlan(c, lay, sel, psel, only) {   // only: arrange things inside (158)
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
        o += '<g' + (only ? '' : ' data-bay="' + side + ':' + i + '"') + ' style="cursor:' + (only ? 'default' : 'pointer') + '"><title>' + esc(side + ' wall, bay ' + (i + 1) + ': ' + (b ? b.name : '')) + '</title>' +
          '<rect x="' + hx + '" y="' + hy + '" width="' + hw + '" height="' + hh + '" fill="' + (on ? '#F7DDD2' : 'transparent') + '" stroke="' + (on ? '#C26445' : 'none') + '" stroke-width="2" rx="4"/>' +
          '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + cbColor(b) + '" stroke-width="' + t + '"/>' +
          (b && b.key === 'window' ? '<line x1="' + (x1 + (x2 - x1) * .2) + '" y1="' + (y1 + (y2 - y1) * .2) + '" x2="' + (x1 + (x2 - x1) * .8) + '" y2="' + (y1 + (y2 - y1) * .8) + '" stroke="#8EC3D6" stroke-width="' + (t - 5) + '"/>' : '') +
          (b && b.key === 'vent' ? '<line x1="' + (x1 + (x2 - x1) * .38) + '" y1="' + (y1 + (y2 - y1) * .38) + '" x2="' + (x1 + (x2 - x1) * .62) + '" y2="' + (y1 + (y2 - y1) * .62) + '" stroke="#8EC3D6" stroke-width="' + (t - 5) + '"/>' : '') + '</g>';
        i += sp;
      }
    });
    // resize handle (back-right corner stays, front-right corner drags)
    o += '<rect data-rzbox="1" x="' + ox + '" y="' + oy + '" width="' + L * s + '" height="' + W * s + '" fill="none" stroke="#C26445" stroke-dasharray="6 4" stroke-width="2" style="display:none" pointer-events="none"/>';
    if (!only) o += '<g data-rz="1" style="cursor:nwse-resize;touch-action:none"><title>Drag to change the size</title><circle cx="' + (ox + L * s) + '" cy="' + (oy + W * s) + '" r="14" fill="#C26445"/><path d="M' + (ox + L * s - 5) + ',' + (oy + W * s + 1) + ' l5,5 l5,-5 M' + (ox + L * s + 1) + ',' + (oy + W * s - 5) + ' l5,5 l-5,5" stroke="#fff" stroke-width="2" fill="none" pointer-events="none"/></g>';
    o += '<text x="' + (ox + L * s / 2) + '" y="' + (oy + W * s + 30) + '" font-size="11" fill="#6A6258" text-anchor="middle" letter-spacing="1" pointer-events="none">FRONT · ' + L + ' × ' + W + ' ft</text>';
    return '<svg data-plan="' + ox + ',' + oy + ',' + s + '" viewBox="0 0 ' + (L * s + 70) + ' ' + (W * s + 64) + '" style="width:100%;max-height:420px;display:block;touch-action:pan-y;user-select:none" role="img" aria-label="Your cabin plan — drag pieces onto walls or inside, tap a wall bay to change it">' + o + '</svg>';
  }
  // ------------------------------------------------------------ 158: the cabin builder in 6 simple steps (size, glass, door, rooms, look, check) + a simple wall editor
  var WZ_SIZES = [['Small', 10, 8, '1–2 people'], ['Medium', 12, 10, 'office / room'], ['Large', 20, 10, 'studio'], ['Extra large', 20, 12, 'café / stay']];
  var WZ_GLASS = [['solid', 'Mostly solid', 'windows only'], ['front', 'Glass front', 'solid back + sides'], ['most', 'Mostly glass', 'one solid wall'], ['all', 'All glass', 'glass on every wall']];
  var WZ_DOORS = [['single', 'Single door', '3 ft'], ['double', 'Double door', '6 ft'], ['slide', 'Sliding glass', '8 ft'], ['fold', 'Folding glass', '12 ft']];
  var WZ_SIDES = [['front', 'Front'], ['right', 'Right side'], ['left', 'Left side'], ['back', 'Back']];
  var WZ_PIECES = [['puf', 'Wall'], ['window', 'Window'], ['vent', 'Small vent'], ['glass', 'Glass'], ['frost', 'Frosted glass'], ['door', 'Door'], ['gdoor', 'Glass door'], ['pdouble', 'Double door'], ['double', 'Glass double door'], ['slide', 'Sliding glass door'], ['fold', 'Folding glass door']];
  function wzGlassWalls(g) { return { front: g !== 'solid', right: g === 'most' || g === 'all', left: g === 'most' || g === 'all', back: g === 'all' }; }
  function wzDoorKey(c, t, glassWall) { var k = t === 'single' ? (glassWall ? 'gdoor' : 'door') : t === 'double' ? (glassWall ? 'double' : 'pdouble') : t; return cbBay(c, k) ? k : cbBay(c, 'door') ? 'door' : cbFill(c); }
  function wzRead(c, lay) {   // what the current layout looks like, in the simple words of the steps
    var gw = {}; SIDES.forEach(function (sd) { var ks = lay.walls[sd], g = 0, n = 0; ks.forEach(function (k) { var b = cbBay(c, k); if (b) { n++; if (b.glass) g++; } }); gw[sd] = n && g * 2 >= n; });
    var g = gw.front && gw.right && gw.left && gw.back ? 'all' : gw.front && (gw.right || gw.left) ? 'most' : gw.front ? 'front' : 'solid', door = 'single', side = 'front', best = 0;
    SIDES.forEach(function (sd) { lay.walls[sd].forEach(function (k) { var b = cbBay(c, k); if (b && b.door && (num(b.price) || 0) > best) { best = num(b.price) || 0; side = sd; door = k === 'fold' ? 'fold' : k === 'slide' ? 'slide' : k === 'double' || k === 'pdouble' ? 'double' : 'single'; } }); });
    var win = 0; SIDES.forEach(function (sd) { lay.walls[sd].forEach(function (k) { if (k === 'window') win++; }); });
    var it = lay.items || {};
    return { glass: g, door: door, side: side, windows: win, rooms: (num(it.ppart) || 0) + (num(it.gpart) || 0) + (num(it.fpart) || 0) > 0, toilet: (num(it.toilet) || 0) > 0, wc: (num(it.wc) || 0) > 0, pantry: (num(it.pantry) || 0) > 0, exhaust: (num(it.exhaust) || 0) > 0 };
  }
  function wzBuild(c, lay, w) {   // walls from the simple choices: glass level, one main door, windows on solid walls, a vent by the toilet
    var gw = wzGlassWalls(w.glass), solid = cbBay(c, 'puf') ? 'puf' : cbFill(c), glass = cbBay(c, 'glass') ? 'glass' : solid;
    SIDES.forEach(function (sd) { var n = cbN(c, lay, sd), ks = []; for (var i = 0; i < n; i++) ks.push(gw[sd] ? glass : solid); lay.walls[sd] = ks; });
    var dk = wzDoorKey(c, w.door, gw[w.side]), n0 = cbN(c, lay, w.side), sp = cbSpan(c, dk);
    if (sp > n0) { dk = wzDoorKey(c, 'single', gw[w.side]); sp = 1; }
    cbSet(c, lay, w.side, Math.max(0, Math.floor((n0 - sp) / 2)), dk);
    var left = w.windows, order = ['front', 'right', 'left', 'back'], placed = true;
    if (w.toilet || w.wc) { var lk = lay.walls.left, vi = lk.indexOf(solid); if (vi < 0) { lk = lay.walls.back; vi = lk.indexOf(solid); if (vi >= 0) lay.walls.back[vi] = 'vent'; } else lay.walls.left[vi] = 'vent'; }
    while (left > 0 && placed) { placed = false; for (var oi = 0; oi < order.length && left > 0; oi++) { var ks2 = lay.walls[order[oi]], free = []; ks2.forEach(function (k, i) { if (k === solid) free.push(i); }); if (free.length) { ks2[free[Math.floor(free.length / 2)]] = 'window'; left--; placed = true; } } }
    var it = {}, k0; for (k0 in (lay.items || {})) it[k0] = lay.items[k0];
    lay.places = arr(lay.places).filter(function (p) { return ['ppart', 'gpart', 'fpart', 'pdoor', 'gdoorp', 'toilet', 'wc', 'pantry'].indexOf(p.key) < 0; });
    var W = num(lay.W), L = num(lay.L), x = 0;
    if (w.toilet && cbItem(c, 'toilet')) { lay.places.push({ key: 'toilet', x: 0, y: 0, rot: 0, len: null }); x = 4; }
    if (w.wc && cbItem(c, 'wc')) { lay.places.push({ key: 'wc', x: x, y: 0, rot: 0, len: null }); x += 4; }
    if (w.pantry && cbItem(c, 'pantry')) lay.places.push({ key: 'pantry', x: Math.max(0, L - 6), y: 0, rot: 0, len: null });
    if (w.rooms) { var pk = w.glass === 'most' || w.glass === 'all' ? 'gpart' : 'ppart', px = Math.max(x + 2, Math.round(L / 3)); lay.places.push({ key: pk, x: px, y: 0, rot: 90, len: W }); lay.places.push({ key: pk === 'gpart' ? 'gdoorp' : 'pdoor', x: Math.max(0, px - 0.1), y: Math.max(0, W - 4), rot: 90, len: null }); }
    ['ppart', 'gpart', 'fpart', 'pdoor', 'gdoorp', 'toilet', 'wc', 'pantry'].forEach(function (k) { if (k in it || lay.places.some(function (p) { return p.key === k; })) it[k] = 0; });
    if (cbItem(c, 'exhaust')) { var wet = lay.places.filter(function (p) { return p.key === 'toilet' || p.key === 'wc' || p.key === 'pantry'; }).length; it.exhaust = w.exhaust && wet ? Math.min(wet, num(cbItem(c, 'exhaust').max) || 6) : 0; }   // 159: one exhaust fan per wet area
    lay.items = it; lay.places.forEach(function (p) { cbClamp(c, lay, p); }); cbSync(c, lay);
  }
  // 159: feet and inches, the plan with measurements, and the 3D view
  function fi(v) { v = Math.round(num(v) * 12); var f = Math.floor(v / 12), i = v - f * 12; return f + "'" + (i ? '-' + i + '"' : '-0"'); }
  function wzDims(c, lay) {   // the layout seen from the top, every size in ft-in
    var L = num(lay.L), W = num(lay.W), bay = num(c.bay) || 4, pj = lay.proj && Array.isArray(lay.proj.sides) ? lay.proj.sides : [], dep = num(c.proj && c.proj.depth) || 1.5;
    var pad = { front: pj.indexOf('front') >= 0 ? dep : 0, back: pj.indexOf('back') >= 0 ? dep : 0, left: pj.indexOf('left') >= 0 ? dep : 0, right: pj.indexOf('right') >= 0 ? dep : 0 };
    var s = Math.min(520 / (L + pad.left + pad.right), 360 / (W + pad.front + pad.back), 30), ox = 58 + pad.left * s, oy = 50 + pad.back * s, o = '', FC = '#2E2E2E', DC = '#9C4127';
    var X = function (x) { return Math.round((ox + x * s) * 10) / 10; }, Y = function (y) { return Math.round((oy + y * s) * 10) / 10; };
    var dim = function (x1, y1, x2, y2, t, off, vert) {   // a dimension line with ticks and its text
      var r = ''; if (vert) { r += '<line x1="' + (x1 + off) + '" y1="' + y1 + '" x2="' + (x1 + off) + '" y2="' + y2 + '" stroke="' + DC + '" stroke-width="1"/>'; [y1, y2].forEach(function (y) { r += '<line x1="' + (x1 + off - 4) + '" y1="' + (y + 4) + '" x2="' + (x1 + off + 4) + '" y2="' + (y - 4) + '" stroke="' + DC + '" stroke-width="1.4"/>'; });
        r += '<text x="' + (x1 + off + (off < 0 ? -4 : 4)) + '" y="' + ((+y1 + +y2) / 2 + 4) + '" font-size="11" fill="' + DC + '" text-anchor="' + (off < 0 ? 'end' : 'start') + '">' + t + '</text>'; }
      else { r += '<line x1="' + x1 + '" y1="' + (y1 + off) + '" x2="' + x2 + '" y2="' + (y1 + off) + '" stroke="' + DC + '" stroke-width="1"/>'; [x1, x2].forEach(function (x) { r += '<line x1="' + (x - 4) + '" y1="' + (y1 + off + 4) + '" x2="' + (+x + 4) + '" y2="' + (y1 + off - 4) + '" stroke="' + DC + '" stroke-width="1.4"/>'; });
        r += '<text x="' + ((+x1 + +x2) / 2) + '" y="' + (y1 + off + (off < 0 ? -4 : 12)) + '" font-size="11" fill="' + DC + '" text-anchor="middle">' + t + '</text>'; }
      return r; };
    // pergola projection (dashed) and gutter
    pj.forEach(function (sd) { var x = sd === 'right' ? L : sd === 'left' ? -dep : 0, y = sd === 'front' ? W : sd === 'back' ? -dep : 0, w = sd === 'front' || sd === 'back' ? L : dep, h = sd === 'front' || sd === 'back' ? dep : W;
      o += '<rect x="' + X(x) + '" y="' + Y(y) + '" width="' + (w * s).toFixed(1) + '" height="' + (h * s).toFixed(1) + '" fill="#F4EFE6" stroke="#8C7E6C" stroke-dasharray="5 4"/>';
      if (sd === 'front') o += dim(X(L), Y(W), X(L), Y(W + dep), fi(dep) + ' pergola', 8, true); });
    if (SIDES.indexOf(lay.gutter) >= 0) { var g = lay.gutter, go = (pad[g] || 0) + 0.6, gx1 = g === 'right' ? L + go : g === 'left' ? -go : 0, gx2 = g === 'right' ? L + go : g === 'left' ? -go : L, gy1 = g === 'front' ? W + go : g === 'back' ? -go : 0, gy2 = g === 'front' ? W + go : g === 'back' ? -go : W;
      o += '<line x1="' + X(gx1) + '" y1="' + Y(gy1) + '" x2="' + X(gx2) + '" y2="' + Y(gy2) + '" stroke="#3C3C3C" stroke-width="4"/><circle cx="' + X(gx2) + '" cy="' + Y(gy2) + '" r="5" fill="#3C3C3C"/>'; }
    o += '<rect x="' + X(0) + '" y="' + Y(0) + '" width="' + (L * s).toFixed(1) + '" height="' + (W * s).toFixed(1) + '" fill="#FBF8F3"/>';
    // things inside, with their sizes
    arr(lay.places).forEach(function (pl) { var it = cbItem(c, pl.key), d = cbDims(c, pl), x = X(pl.x), y = Y(pl.y), w = d[0] * s, h = d[1] * s;
      if (it && it.unit === 'rft') { o += '<rect x="' + x + '" y="' + y + '" width="' + Math.max(w, 4) + '" height="' + Math.max(h, 4) + '" fill="' + (pl.key === 'gpart' ? '#8EC3D6' : pl.key === 'fpart' ? '#B9CDD4' : '#B9B2A6') + '"/>';
        o += '<text x="' + (+x + w / 2 + (pl.rot === 90 ? 8 : 0)) + '" y="' + (+y + h / 2 + (pl.rot === 90 ? 4 : -6)) + '" font-size="10" fill="#4A4640" text-anchor="' + (pl.rot === 90 ? 'start' : 'middle') + '">' + esc((it.name || '').replace(/ — .*$/, '').replace(/ \(.*\)$/, '')) + ' ' + fi(pl.len) + '</text>'; return; }
      if (pl.key === 'pdoor' || pl.key === 'gdoorp') { o += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="#fff" stroke="' + (pl.key === 'gdoorp' ? '#4E93AD' : '#8C7E6C') + '" stroke-width="1.5"/>'; return; }
      o += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + (pl.key === 'pantry' ? '#EFE6D6' : '#EAF3F6') + '" stroke="#8EC3D6" stroke-width="1.2"/><text x="' + (+x + w / 2) + '" y="' + (+y + h / 2 - 1) + '" font-size="10.5" font-weight="700" fill="#2E2E2E" text-anchor="middle">' + esc((CB_FOOT[pl.key] || [0, 0, ''])[2]) + '</text><text x="' + (+x + w / 2) + '" y="' + (+y + h / 2 + 11) + '" font-size="9.5" fill="#6A6258" text-anchor="middle">' + fi(d[0]) + ' × ' + fi(d[1]) + '</text>'; });
    // walls, each piece with its width (front and right chains)
    var DH = lay.full_doors === true ? '' : " · 8'-0\" high";
    SIDES.forEach(function (side) { var ks = lay.walls[side] || [], len = cbLen(c, lay, side), i = 0;
      while (i < ks.length) { var k = ks[i], b = cbBay(c, k), sp = cbSpan(c, k), a = i * bay, e = Math.min((i + sp) * bay, len), x1, y1, x2, y2;
        if (side === 'front') { x1 = X(a); x2 = X(e); y1 = y2 = Y(W); } else if (side === 'back') { x1 = X(a); x2 = X(e); y1 = y2 = Y(0); } else if (side === 'right') { x1 = x2 = X(L); y1 = Y(W - a); y2 = Y(W - e); } else { x1 = x2 = X(0); y1 = Y(W - a); y2 = Y(W - e); }
        o += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + cbColor(b) + '" stroke-width="8"/>';
        if (k === 'window' || k === 'vent') o += '<line x1="' + (+x1 + (x2 - x1) * .25) + '" y1="' + (+y1 + (y2 - y1) * .25) + '" x2="' + (+x1 + (x2 - x1) * .75) + '" y2="' + (+y1 + (y2 - y1) * .75) + '" stroke="#8EC3D6" stroke-width="4"/>';
        if (side === 'front') o += dim(x1, y1, x2, y2, fi(e - a), 14 + pad.front * s + (pad.front ? 4 : 0) + (lay.gutter === 'front' ? 12 : 0));
        if (side === 'right') o += dim(x1, y2, x2, y1, fi(e - a), 14 + pad.right * s + (lay.gutter === 'right' ? 12 : 0), true);
        if (b && b.door) { var mx = (+x1 + +x2) / 2, my = (+y1 + +y2) / 2, ins = side === 'front' ? [0, -14] : side === 'back' ? [0, 20] : side === 'right' ? [-8, 0] : [8, 0];
          o += '<text x="' + (mx + ins[0]) + '" y="' + (my + ins[1]) + '" font-size="10" fill="#4A4640" text-anchor="' + (side === 'right' ? 'end' : side === 'left' ? 'start' : 'middle') + '">' + esc((b.name || '').replace(/ \(.*\)$/, '')) + (k === 'slide' && lay.tracks ? ' · ' + esc(lay.tracks) : '') + DH + '</text>'; }
        i += sp; } });
    o += dim(X(0), Y(0), X(L), Y(0), fi(L) + ' outside', -16 - pad.back * s - (lay.gutter === 'back' ? 12 : 0));
    o += dim(X(0), Y(0), X(0), Y(W), fi(W), -16 - pad.left * s - (lay.gutter === 'left' ? 12 : 0), true);
    var H = /^10/.test(lay.height || '') ? '10\'-0"' : '8\'-6"';
    var vw = (L + pad.left + pad.right) * s + 130, vh = (W + pad.front + pad.back) * s + 110;
    o += '<text x="' + X(L / 2) + '" y="' + (vh - 8) + '" font-size="11" fill="#6A6258" text-anchor="middle" letter-spacing="1">FRONT · clear height ' + H + ' · area ' + (L * W) + ' sq ft</text>';
    return '<svg viewBox="0 0 ' + vw.toFixed(0) + ' ' + vh.toFixed(0) + '" style="width:100%;display:block" role="img" aria-label="Your layout with measurements in feet and inches">' + o + '</svg>';
  }
  var V3 = [['3d', '3D'], ['top', 'Top'], ['front', 'Front'], ['right', 'Right'], ['back', 'Back'], ['left', 'Left'], ['inside', 'Inside'], ['360', '360°']];
  function wzAuto(st, w, lay) { var it = lay.items || {}; return st === 0 ? 'top' : st === 1 ? '3d' : st === 2 ? (w.side || 'front') : st === 3 ? 'top' : st === 4 ? '3d' : st === 5 ? ((num(it.ceiling) || 0) > 0 ? 'inside' : '3d') : '360'; }
  var C3 = { st: 0 };   // 0 not loaded, 1 loading, 2 ready, -1 not possible (no WebGL)
  function mount3d() {
    var el = document.getElementById('cb3d'); if (!el || !S || !S.wz) return;
    if (C3.st === 2) { try { window.Cabin3D.show(el, PRODS[S.id].cz.cabin, S.o.layout, S.view3); } catch (er) { C3.st = -1; } return; }
    if (C3.st !== 0) return;
    try { var cv = document.createElement('canvas'); if (!(cv.getContext('webgl2') || cv.getContext('webgl'))) { C3.st = -1; return; } } catch (er) { C3.st = -1; return; }
    C3.st = 1; var sc = document.createElement('script'); sc.type = 'module'; sc.src = '/cabin3d.js?v=1';
    sc.onload = function () { C3.st = window.Cabin3D ? 2 : -1; mount3d(); }; sc.onerror = function () { C3.st = -1; }; document.head.appendChild(sc);
  }
  function wzIso(c, lay, small) {   // a 3D-looking sketch of the layout (front + right side), like the drawings
    var L = num(lay.L), W = num(lay.W), H = /^10/.test(lay.height || '') ? 10 : 8.5, bay = num(c.bay) || 4, C = 0.866, Sn = 0.5;
    var P = function (x, y, z) { return [(x - y) * C, (x + y) * Sn - z]; }, pts = function (a) { return a.map(function (p) { var q = P(p[0], p[1], p[2]); return q[0].toFixed(2) + ',' + q[1].toFixed(2); }).join(' '); };
    var poly = function (a, f, st, op) { return '<polygon points="' + pts(a) + '" fill="' + f + '" stroke="' + (st || '#2E2E2E') + '" stroke-width="' + (small ? 0.12 : 0.08) + '"' + (op ? ' fill-opacity="' + op + '"' : '') + '/>'; };
    var fr = (lay.frame || '').toLowerCase(), FC = /grey/.test(fr) ? '#8A8A8A' : /white/.test(fr) ? '#CFCFCF' : /wood/.test(fr) ? '#8B5A2B' : '#2E2E2E', o = '';
    o += poly([[-0.4, W + 0.4, -0.8], [L + 0.4, W + 0.4, -0.8], [L + 0.4, W + 0.4, 0], [-0.4, W + 0.4, 0]], '#6E6A63', 'none');
    o += poly([[L + 0.4, -0.4, -0.8], [L + 0.4, W + 0.4, -0.8], [L + 0.4, W + 0.4, 0], [L + 0.4, -0.4, 0]], '#5A564F', 'none');
    var wall = function (side) {
      var ks = lay.walls[side], len = side === 'front' ? L : W, i = 0, r = '';
      var q = function (u, z) { return side === 'front' ? [u, W, z] : [L, W - u, z]; };
      while (i < ks.length) {
        var k = ks[i], b = cbBay(c, k), sp = cbSpan(c, k), a = i * bay, e = Math.min((i + sp) * bay, len), gl = b && b.glass;
        r += poly([q(a, 0), q(e, 0), q(e, H), q(a, H)], gl ? (k === 'frost' ? '#D5E3E8' : '#BFDCE6') : '#F1EFEA', FC, gl ? 0.95 : 1);
        if (k === 'window') r += poly([q(a + (e - a) * .2, 3.2), q(e - (e - a) * .2, 3.2), q(e - (e - a) * .2, 6.4), q(a + (e - a) * .2, 6.4)], '#BFDCE6', FC);
        if (k === 'vent') r += poly([q(a + (e - a) * .3, 6.6), q(e - (e - a) * .3, 6.6), q(e - (e - a) * .3, 7.6), q(a + (e - a) * .3, 7.6)], '#BFDCE6', FC);
        if (b && b.door) { var lv = k === 'fold' ? 6 : sp > 1 ? 2 : 1; for (var j = 0; j < lv; j++) { var a1 = a + 0.2 + j * (e - a - 0.4) / lv, e1 = a + 0.2 + (j + 1) * (e - a - 0.4) / lv; r += poly([q(a1, 0), q(e1, 0), q(e1, 7.2), q(a1, 7.2)], gl ? '#A9D0DD' : '#D9D4CB', FC); } }
        i += sp;
      }
      return r;
    };
    o += wall('right') + wall('front');
    var rf = /glass/i.test(lay.roof || '') ? '#BFDCE6' : '#E4E1DA';
    o += poly([[-0.5, -0.5, H + 0.5], [L + 0.5, -0.5, H + 0.5], [L + 0.5, W + 0.5, H + 0.5], [-0.5, W + 0.5, H + 0.5]], rf, FC, /glass/i.test(lay.roof || '') ? 0.85 : 1);
    o += poly([[-0.5, W + 0.5, H], [L + 0.5, W + 0.5, H], [L + 0.5, W + 0.5, H + 0.5], [-0.5, W + 0.5, H + 0.5]], FC, FC);
    o += poly([[L + 0.5, -0.5, H], [L + 0.5, W + 0.5, H], [L + 0.5, W + 0.5, H + 0.5], [L + 0.5, -0.5, H + 0.5]], FC, FC);
    var xs = [], ys = []; [[-1, -1, -1], [L + 1, -1, -1], [L + 1, W + 1, -1], [-1, W + 1, -1], [-1, -1, H + 1], [L + 1, -1, H + 1], [L + 1, W + 1, H + 1], [-1, W + 1, H + 1]].forEach(function (p) { var q = P(p[0], p[1], p[2]); xs.push(q[0]); ys.push(q[1]); });
    var x0 = Math.min.apply(null, xs), y0 = Math.min.apply(null, ys);
    return '<svg viewBox="' + x0.toFixed(1) + ' ' + y0.toFixed(1) + ' ' + (Math.max.apply(null, xs) - x0).toFixed(1) + ' ' + (Math.max.apply(null, ys) - y0).toFixed(1) + '" style="width:100%;height:100%;display:block" aria-hidden="true">' + o + '</svg>';
  }
  function wzElev(c, lay, side, selI) {   // one wall, flat: tap a panel to change it
    var ks = lay.walls[side], len = cbLen(c, lay, side), bay = num(c.bay) || 4, H = 8.5, s = 26, o = '', i = 0, FC = '#2E2E2E';
    o += '<rect x="0" y="' + H * s + '" width="' + len * s + '" height="10" fill="#6E6A63"/><rect x="-4" y="-8" width="' + (len * s + 8) + '" height="8" fill="' + FC + '"/>';
    while (i < ks.length) {
      var k = ks[i], b = cbBay(c, k), sp = cbSpan(c, k), a = i * bay * s, e = Math.min((i + sp) * bay, len) * s, w = e - a, gl = b && b.glass, on = selI === i;
      o += '<g data-wp="' + i + '" style="cursor:pointer"><title>' + esc((b ? b.name : '') + ' — tap to change') + '</title><rect x="' + a + '" y="0" width="' + w + '" height="' + H * s + '" fill="' + (gl ? (k === 'frost' ? '#D5E3E8' : '#BFDCE6') : '#F1EFEA') + '" stroke="' + FC + '" stroke-width="2"/>';
      if (k === 'window') o += '<rect x="' + (a + w * .18) + '" y="' + 3 * s + '" width="' + w * .64 + '" height="' + 3.3 * s + '" fill="#BFDCE6" stroke="' + FC + '" stroke-width="2"/>';
      if (k === 'vent') o += '<rect x="' + (a + w * .3) + '" y="' + 6.5 * s + '" width="' + w * .4 + '" height="' + s + '" fill="#BFDCE6" stroke="' + FC + '" stroke-width="2"/>';
      if (b && b.door) { var lv = k === 'fold' ? 6 : sp > 1 ? 2 : 1; for (var j = 0; j < lv; j++) o += '<rect x="' + (a + 4 + j * (w - 8) / lv) + '" y="' + (H - 7.2) * s + '" width="' + (w - 8) / lv + '" height="' + 7.2 * s + '" fill="none" stroke="' + FC + '" stroke-width="3"/>'; }
      if (on) o += '<rect x="' + (a + 3) + '" y="3" width="' + (w - 6) + '" height="' + (H * s - 6) + '" fill="none" stroke="#C26445" stroke-width="6" rx="4"/>';
      o += '</g>'; i += sp;
    }
    return '<svg viewBox="-6 -12 ' + (len * s + 12) + ' ' + (H * s + 26) + '" style="width:100%;max-height:230px;display:block" role="img" aria-label="' + esc(side) + ' wall — tap a panel to change it">' + o + '</svg>';
  }
  function wzCards(list, cur, attr, priceOf, pic) {   // picture cards; price shown as +₹ over the cheapest choice
    var tot = list.map(function (x) { return priceOf(x); }), ok = tot.filter(function (t) { return t != null; }), lo = ok.length ? Math.min.apply(null, ok) : 0;
    return '<div class="wz-cards">' + list.map(function (x, i) {
      var t = tot[i], tag = t == null ? 'not possible here' : t === lo ? 'included' : '+' + rs(t - lo);
      return '<button type="button" ' + attr + '="' + esc(x[0]) + '" class="wz-card' + (x[0] === cur ? ' on' : '') + '"' + (t == null ? ' disabled' : '') + '>' + (pic ? '<span class="wz-pic">' + pic(x) + '</span>' : '') + '<b>' + esc(x[1]) + '</b><small>' + esc(x[2] ? x[2] + ' · ' + tag : tag) + '</small></button>';
    }).join('') + '</div>';
  }
  function wzTry(c, lay, f) { var l2 = cbClone(lay); f(l2); var q = cabin(c, l2); return q.ok ? q.total : null; }
  function cabinUI(m, o) {
    var c = m.cabin, lay = o.layout, w = S.wz, q0 = cabin(c, lay), st = w.step, TITLES = ['How big?', 'How much glass?', 'Doors', 'Rooms inside', 'Outside', 'The look', 'Your cabin'];
    var SUBS = ['Pick a size — or set it exactly with − / +', 'We put the glass on the walls for you', 'Pick the door, the wall it goes on and its height', 'Switch on what you need — move things on the plan if you like', 'Pergola projection over the walls, and a rain gutter', 'Roof, frame colour and a few upgrades', 'Check it, then order — final drawings come to you for approval first'];
    var v3 = S.view3 = S.v3 || (w.adv ? (w.aside || 'front') : wzAuto(st, w, lay));
    var h = '<div class="wz-3d"><div class="wz-3dv" id="cb3d">' + (C3.st === 2 ? '' : wzIso(c, lay)) + '</div>' + (C3.st === -1 ? '' : '<div class="wz-views" role="tablist" aria-label="Views">' + V3.map(function (v) { return '<button type="button" role="tab" data-wzv="' + v[0] + '" class="' + (v[0] === v3 ? 'on' : '') + '" aria-selected="' + (v[0] === v3) + '">' + v[1] + '</button>'; }).join('') + '</div>') + '</div><div class="wz-steps">' + TITLES.map(function (t, i) { return '<button type="button" data-wzgo="' + i + '" class="' + (i <= st ? 'on' : '') + '" aria-label="Step ' + (i + 1) + ': ' + t + '"></button>'; }).join('') + '</div>' +
      '<h4 class="wz-h">' + (w.adv ? 'Edit each wall' : TITLES[st]) + '</h4><p class="wz-sub">' + (w.adv ? 'Pick a wall, tap a panel, choose what it should be' : SUBS[st]) + '</p>';
    var mini = function (lay2) { return wzIso(c, lay2, true); };
    var dimsBox = '<div class="wz-dims"><h5>Your layout · sizes in ft-in</h5>' + wzDims(c, lay) + '</div>';
    var tgl = function (attr, on, name, sub, pr) { return '<label class="wz-row"><span><b>' + esc(name) + '</b><small>' + esc(sub) + '</small></span><span class="wz-pr">' + (pr || '') + '</span><input type="checkbox" class="wz-sw" ' + attr + (on ? ' checked' : '') + '></label>'; };
    var dif = function (f1, f0) { var a1 = wzTry(c, lay, f1), a0 = wzTry(c, lay, f0); return a1 != null && a0 != null ? (a1 - a0 ? '+' + rs(a1 - a0) : 'included') : ''; };
    var withW = function (ch) { var w2 = {}, k; for (k in w) w2[k] = w[k]; for (k in ch) w2[k] = ch[k]; return w2; };
    if (w.adv) {
      var side = w.aside || 'front', ks = lay.walls[side], hi = cbHead(ks, Math.min(w.ai || 0, ks.length - 1)), cur = ks[hi];
      h += '<div class="wz-tabs">' + WZ_SIDES.map(function (sd) { return '<button type="button" data-wzside="' + sd[0] + '" class="' + (sd[0] === side ? 'on' : '') + '">' + sd[1] + '</button>'; }).join('') + '</div>';
      h += '<div class="wz-elev">' + wzElev(c, lay, side, hi) + '</div><p class="wz-sub" style="margin-top:6px">Selected: panel ' + (hi + 1) + ' of the ' + esc(side) + ' wall</p>';
      var pieces = WZ_PIECES.filter(function (p) { return cbBay(c, p[0]); }).map(function (p) { var b = cbBay(c, p[0]); return [p[0], p[1], cbSpan(c, p[0]) > 1 ? (cbSpan(c, p[0]) * (num(c.bay) || 4)) + ' ft wide' : '']; });
      h += '<div class="wz-cards">' + pieces.map(function (p) { var b = cbBay(c, p[0]), okk = cbSet(c, cbClone(lay), side, hi, p[0]);   // each piece with its own price
        return '<button type="button" data-wzpiece="' + esc(p[0]) + '" class="wz-card' + (p[0] === cur ? ' on' : '') + '"' + (okk ? '' : ' disabled') + '><b>' + esc(p[1]) + '</b><small>' + rs(num(b.price) || 0) + (p[2] ? ' · ' + esc(p[2]) : '') + '</small></button>'; }).join('') + '</div>';
      h += '<button type="button" class="wz-back" data-wzadv="0">← Back to the simple steps</button>' + dimsBox;
      return h;
    }
    if (st === 0) {
      h += wzCards(WZ_SIZES.map(function (z) { return [z[0], z[0], z[1] + ' × ' + z[2] + ' ft · ' + z[3]]; }), (WZ_SIZES.filter(function (z) { return z[1] === num(lay.L) && z[2] === num(lay.W); })[0] || [''])[0], 'data-wzsize',
        function (z) { var zz = WZ_SIZES.filter(function (y) { return y[0] === z[0]; })[0]; return wzTry(c, lay, function (l2) { l2.L = zz[1]; l2.W = zz[2]; wzBuild(c, l2, w); }); });
      var stp = function (key, lbl, lo, hi2) { return '<div class="wz-row" style="cursor:default"><span><b>' + lbl + '</b><small>' + lo + '–' + hi2 + ' ft · now ' + fi(lay[key]) + '</small></span><span class="wz-stp"><button type="button" class="wz-pm" data-cstep="' + key + ':-1" aria-label="' + lbl + ' less"' + (num(lay[key]) <= lo ? ' disabled' : '') + '>−</button><input type="number" inputmode="numeric" min="' + lo + '" max="' + hi2 + '" step="1" data-cdim="' + key + '" value="' + num(lay[key]) + '" aria-label="' + lbl + ' in feet"><button type="button" class="wz-pm" data-cstep="' + key + ':1" aria-label="' + lbl + ' more"' + (num(lay[key]) >= hi2 ? ' disabled' : '') + '>+</button></span></div>'; };
      h += '<p class="wz-lbl">Exact size</p>' + stp('L', 'Length', num(c.L && c.L.min) || 8, num(c.L && c.L.max) || 40) + stp('W', 'Width', num(c.W && c.W.min) || 8, num(c.W && c.W.max) || 20);
    } else if (st === 1) {
      h += wzCards(WZ_GLASS, w.glass, 'data-wzglass', function (g) { return wzTry(c, lay, function (l2) { wzBuild(c, l2, withW({ glass: g[0] })); }); },
        function (g) { var l2 = cbClone(lay); l2.L = 12; l2.W = 10; wzBuild(c, l2, withW({ glass: g[0], door: 'single', side: 'front', windows: 2, rooms: false, toilet: false, wc: false, pantry: false })); return mini(l2); });
    } else if (st === 2) {
      h += wzCards(WZ_DOORS, w.door, 'data-wzdoor', function (d) { return wzTry(c, lay, function (l2) { wzBuild(c, l2, withW({ door: d[0] })); if (!l2.walls[w.side].some(function (k) { var b = cbBay(c, k); return b && b.door && cbSpan(c, k) === cbSpan(c, wzDoorKey(c, d[0], true)); })) l2.L = -1; }); },
        function (d) { var l2 = cbClone(lay); l2.L = 12; l2.W = 10; wzBuild(c, l2, withW({ door: d[0], side: 'front', windows: 0, rooms: false, toilet: false, wc: false, pantry: false })); return mini(l2); });
      h += '<p class="wz-lbl">Which wall?</p><div class="wz-tabs">' + WZ_SIDES.map(function (sd) { return '<button type="button" data-wzdside="' + sd[0] + '" class="' + (sd[0] === w.side ? 'on' : '') + '">' + sd[1] + '</button>'; }).join('') + '</div>';
      var hasSlide = SIDES.some(function (sd) { return lay.walls[sd].indexOf('slide') >= 0; });
      if (hasSlide && arr(c.tracks).length > 1) h += '<p class="wz-lbl">Sliding door tracks</p>' + wzCards(arr(c.tracks).map(function (t) { return [t.name, t.name, t.name.charAt(0) + ' glass panels slide']; }), lay.tracks || arr(c.tracks)[0].name, 'data-wztrk', function (t) { return wzTry(c, lay, function (l2) { l2.tracks = t[0]; }); });
      if (num(c.full_door)) h += '<p class="wz-lbl">Door height</p>' + tgl('data-wzfull="1"', lay.full_doors === true, 'Full-height doors', 'standard doors are 8 ft high with wall above — this takes them up to the roof', dif(function (l2) { l2.full_doors = true; }, function (l2) { l2.full_doors = false; }));
    } else if (st === 3) {
      var tg = function (key, name, sub, item) { var it = cbItem(c, item); if (!it) return ''; var on = !!w[key], t1 = wzTry(c, lay, function (l2) { var ch = {}; ch[key] = true; wzBuild(c, l2, withW(ch)); }), t0 = wzTry(c, lay, function (l2) { var ch = {}; ch[key] = false; wzBuild(c, l2, withW(ch)); });
        return '<label class="wz-row"><span><b>' + esc(name) + '</b><small>' + esc(sub) + '</small></span><span class="wz-pr">' + (t1 != null && t0 != null ? '+' + rs(t1 - t0) : '') + '</span><input type="checkbox" class="wz-sw" data-wztog="' + key + '"' + (on ? ' checked' : '') + '></label>'; };
      h += tg('rooms', 'Split into 2 rooms', 'a wall with a door between', 'ppart') + tg('toilet', 'Toilet', 'WC, basin and shower', 'toilet') + tg('wc', 'Small toilet', 'WC and basin', 'wc') + tg('pantry', 'Pantry', 'counter and sink', 'pantry');
      if (cbItem(c, 'exhaust') && (w.toilet || w.wc || w.pantry)) h += tgl('data-wztog="exhaust"', !!w.exhaust, 'Exhaust fans', 'one in each toilet / pantry, fitted on the wall', dif(function (l2) { wzBuild(c, l2, withW({ exhaust: true })); }, function (l2) { wzBuild(c, l2, withW({ exhaust: false })); }));
      var wp = cbBay(c, 'window');
      if (wp) h += '<div class="wz-row"><span><b>Windows</b><small>sliding, with mesh · ' + rs(wp.price) + ' each</small></span><span style="display:flex;align-items:center;gap:10px"><button type="button" class="wz-pm" data-wzwin="-1" aria-label="Fewer windows">−</button><b>' + w.windows + '</b><button type="button" class="wz-pm" data-wzwin="1" aria-label="More windows">+</button></span></div>';
      if (arr(lay.places).length) h += '<p class="wz-lbl">Move things if you like (drag on the plan)</p><div id="cbPlanBox" style="background:#fff;border:1px solid #E2D6C4;border-radius:12px;padding:6px">' + cbPlan(c, lay, null, S.psel, true) + '</div>' + (S.psel != null && lay.places[S.psel] ? '<div style="display:flex;gap:8px;margin-top:8px"><button type="button" class="wz-chip" data-pact="rot">Turn</button><button type="button" class="wz-chip" data-pact="done">Done</button></div>' : '');
    } else if (st === 4) {   // 159: pergola projection (always, like a pergola — never a PUF box) and the rain gutter
      var P = c.proj, lp = lay.proj || {}, sides = arr(lp.sides);
      if (P) {
        h += '<p class="wz-lbl">Projection — ' + fi(num(P.depth) || 1.5) + ' deep, on which walls?</p><div class="wz-tabs">' + WZ_SIDES.map(function (sd) { var on = sides.indexOf(sd[0]) >= 0; return '<button type="button" data-wzpj="' + sd[0] + '" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '">' + (on ? '✓ ' : '') + sd[1] + '</button>'; }).join('') + '</div>';
        var pset = function (key, list, lbl, attr) { list = arr(list); if (!list.length) return ''; return '<p class="wz-lbl">' + lbl + '</p>' + wzCards(list.map(function (x) { return [x.name, x.name, '']; }), lp[key] || list[0].name, attr, function (x) { return wzTry(c, lay, function (l2) { l2.proj = Object.assign({}, l2.proj); l2.proj[key] = x[0]; }); }); };
        h += pset('design', P.designs, 'Pergola design', 'data-wzpd') + pset('top', P.tops, 'Cover on top', 'data-wzpt') + pset('under', P.unders, 'Underneath', 'data-wzpu');
        h += '<div class="wz-note">💡 Lights under the projection are always included.</div>';
      }
      if (num(c.gutter)) {
        h += '<p class="wz-lbl">Rain gutter</p>' + tgl('data-wzgon="1"', SIDES.indexOf(lay.gutter) >= 0, 'Rain gutter + downpipe', 'collects roof water and drains it on one side', SIDES.indexOf(lay.gutter) >= 0 ? '' : '+' + rs(num(c.gutter) * num(lay.L)));
        if (SIDES.indexOf(lay.gutter) >= 0) h += '<p class="wz-lbl">Roof slope — water drains to the</p><div class="wz-tabs">' + WZ_SIDES.map(function (sd) { return '<button type="button" data-wzgut="' + sd[0] + '" class="' + (sd[0] === lay.gutter ? 'on' : '') + '">' + sd[1] + '</button>'; }).join('') + '</div>';
      }
    } else if (st === 5) {
      var row = function (key, list, lbl) { list = arr(list); if (list.length < 2) return ''; return '<p class="wz-lbl">' + lbl + '</p>' + wzCards(list.map(function (x) { return [x.name, x.name.replace(/ — .*$/, '').replace(/ \(.*\)$/, ''), '']; }), lay[key], 'data-cchk="' + key + '" data-v', function (x) { return wzTry(c, lay, function (l2) { l2[key] = x[0]; }); }); };
      h += '<div class="wz-note">💡 LED lights inside are always included.</div>' + row('roof', c.roofs, 'Roof');
      var frames = arr(c.frames), fcol = function (n) { n = n.toLowerCase(); return /grey/.test(n) ? '#8A8A8A' : /white/.test(n) ? '#FFFFFF' : /wood/.test(n) ? '#8B5A2B' : '#2E2E2E'; };
      if (frames.length > 1) h += '<p class="wz-lbl">Frame colour</p><div style="display:flex;gap:12px;flex-wrap:wrap">' + frames.map(function (f) { var t = wzTry(c, lay, function (l2) { l2.frame = f.name; }); return '<button type="button" data-cch="frame" data-v="' + esc(f.name) + '" class="wz-sw-col' + (lay.frame === f.name ? ' on' : '') + '" style="background:' + fcol(f.name) + '" aria-label="' + esc(f.name) + '" title="' + esc(f.name) + (t != null && t > q0.total ? ' +' + rs(t - q0.total) : '') + '"></button>'; }).join('') + '</div><p class="wz-sub" style="margin-top:4px">' + esc(lay.frame || '') + '</p>';
      var up = function (key, list, name, sub) { list = arr(list); if (list.length < 2) return ''; var on = lay[key] && lay[key] !== list[0].name, t1 = wzTry(c, lay, function (l2) { l2[key] = list[1].name; }), t0 = wzTry(c, lay, function (l2) { l2[key] = list[0].name; });
        return '<label class="wz-row"><span><b>' + esc(name) + '</b><small>' + esc(sub) + '</small></span><span class="wz-pr">' + (t1 != null && t0 != null ? '+' + rs(t1 - t0) : '') + '</span><input type="checkbox" class="wz-sw" data-wzup="' + key + '"' + (on ? ' checked' : '') + '></label>'; };
      h += '<p class="wz-lbl">Upgrades</p>' + up('height', c.heights, 'Taller — 10 ft inside', 'instead of 8.5 ft') + up('glass', c.glasses, 'Cooler double glass', 'DGU on every glass panel') + up('panel', c.panels, 'Extra insulation', 'thicker 75 mm walls');
      arr(c.items).filter(function (it) { return !cbPlaceable(it); }).forEach(function (it) { if (it.unit === 'floor') h += '<label class="wz-row"><span><b>' + esc(it.name.replace(/ \(.*\)$/, '')) + '</b><small>' + rs(it.price) + ' / sq ft</small></span><span class="wz-pr">+' + rs(Math.round(it.price * num(lay.L) * num(lay.W))) + '</span><input type="checkbox" class="wz-sw" data-citc="' + esc(it.key) + '"' + ((num((lay.items || {})[it.key]) || 0) ? ' checked' : '') + '></label>'; });
    } else {
      var gname = (WZ_GLASS.filter(function (g) { return g[0] === w.glass; })[0] || ['', ''])[1], dname = (WZ_DOORS.filter(function (d) { return d[0] === w.door; })[0] || ['', ''])[1];
      var ins = []; if (w.rooms) ins.push('2 rooms'); if (w.toilet) ins.push('toilet'); if (w.wc) ins.push('small toilet'); if (w.pantry) ins.push('pantry'); if (w.windows) ins.push(w.windows + ' window' + (w.windows > 1 ? 's' : ''));
      if (w.exhaust) ins.push('exhaust fans');
      var pj2 = lay.proj && arr(lay.proj.sides).length ? 'Pergola projection (' + arr(lay.proj.sides).join(', ') + ') · ' + [lay.proj.design, lay.proj.top, lay.proj.under].filter(Boolean).join(' · ') : '';
      h += '<ul class="wz-sum"><li><b>' + fi(lay.L) + ' × ' + fi(lay.W) + '</b> · ' + (num(lay.L) * num(lay.W)) + ' sq ft</li><li>' + esc(gname) + ' · ' + esc(dname) + ' (' + esc(w.side) + ')' + (lay.full_doors === true ? ' · full-height doors' : ' · 8 ft doors') + (SIDES.some(function (sd) { return lay.walls[sd].indexOf('slide') >= 0; }) && lay.tracks ? ' · ' + esc(lay.tracks) : '') + '</li><li>' + esc(ins.join(' · ') || 'open inside') + '</li>' + (pj2 ? '<li>' + esc(pj2) + '</li>' : '') + (SIDES.indexOf(lay.gutter) >= 0 ? '<li>Rain gutter, slope to the ' + esc(lay.gutter) + '</li>' : '') + '<li>' + esc([lay.roof, lay.frame, lay.height].filter(Boolean).join(' · ')) + ' · LED lights included</li></ul>';
      h += '<div class="wz-note"><b>Before we make it:</b> final drawings of your cabin are sent to you for approval. Making starts only after you approve them.</div>';
      h += '<button type="button" class="wz-back" data-wzadv="1">✎ Edit each wall yourself</button>';
    }
    h += dimsBox + '<div class="wz-nav">' + (st > 0 ? '<button type="button" class="wz-prev" data-wzgo="' + (st - 1) + '">← Back</button>' : '<span></span>') + (st < 6 ? '<button type="button" class="wz-next" data-wzgo="' + (st + 1) + '">Next →</button>' : '') + '</div>';
    return h;
  }
  function wzClick(t) {   // returns true when it handled the click
    var c = PRODS[S.id].cz.cabin, lay = S.o.layout, w = S.wz, k;
    if ((k = t.getAttribute('data-wzgo')) != null) { w.step = +k; w.adv = false; S.psel = null; S.v3 = null; return true; }
    if ((k = t.getAttribute('data-wzv')) != null) { S.v3 = k; return true; }
    if ((k = t.getAttribute('data-cstep')) != null) { var cs = k.split(':'); setDim(cs[0], num(lay[cs[0]]) + (+cs[1])); return true; }
    if ((k = t.getAttribute('data-wztrk')) != null) { lay.tracks = k; return true; }
    if ((k = t.getAttribute('data-wzpj')) != null) { var pj = Object.assign({}, lay.proj), sd0 = arr(pj.sides).slice(), ix = sd0.indexOf(k); if (ix >= 0) { if (sd0.length > 1 || !(c.proj && c.proj.required)) sd0.splice(ix, 1); } else sd0.push(k); pj.sides = SIDES.filter(function (x) { return sd0.indexOf(x) >= 0; }); lay.proj = pj; return true; }
    if ((k = t.getAttribute('data-wzpd')) != null || (k = t.getAttribute('data-wzpt')) != null || (k = t.getAttribute('data-wzpu')) != null) { var pk = t.hasAttribute('data-wzpd') ? 'design' : t.hasAttribute('data-wzpt') ? 'top' : 'under'; lay.proj = Object.assign({}, lay.proj); lay.proj[pk] = k; return true; }
    if ((k = t.getAttribute('data-wzgut')) != null) { lay.gutter = k; return true; }
    if ((k = t.getAttribute('data-wzadv')) != null) { w.adv = k === '1'; w.aside = w.aside || 'front'; w.ai = 0; return true; }
    if ((k = t.getAttribute('data-wzside')) != null) { w.aside = k; w.ai = 0; return true; }
    if ((k = t.getAttribute('data-wp')) != null) { w.ai = +k; return true; }
    if ((k = t.getAttribute('data-wzpiece')) != null) { var ks = lay.walls[w.aside], hi = cbHead(ks, Math.min(w.ai, ks.length - 1)); if (cbSet(c, lay, w.aside, hi, k)) w.ai = Math.max(0, Math.min(hi, ks.length - cbSpan(c, k))); w.custom = true; return true; }
    if ((k = t.getAttribute('data-wzsize')) != null) { var z = WZ_SIZES.filter(function (y) { return y[0] === k; })[0]; lay.L = z[1]; lay.W = z[2]; wzBuild(c, lay, w); return true; }
    if ((k = t.getAttribute('data-wzglass')) != null) { w.glass = k; if (k === 'all') { var gr = arr(c.roofs).filter(function (r) { return /glass/i.test(r.name); })[0]; if (gr) lay.roof = gr.name; } wzBuild(c, lay, w); return true; }
    if ((k = t.getAttribute('data-wzdoor')) != null) { w.door = k; wzBuild(c, lay, w); if (k === 'slide' && !lay.tracks && arr(c.tracks).length) lay.tracks = c.tracks[0].name; return true; }
    if ((k = t.getAttribute('data-wzdside')) != null) { w.side = k; wzBuild(c, lay, w); if (S.v3 && ['front', 'right', 'back', 'left'].indexOf(S.v3) >= 0) S.v3 = k; return true; }
    if ((k = t.getAttribute('data-wzwin')) != null) { w.windows = Math.max(0, Math.min(12, w.windows + (+k))); wzBuild(c, lay, w); return true; }
    if ((k = t.getAttribute('data-cchk')) != null) { lay[k] = t.getAttribute('data-v'); return true; }
    return false;
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

  window.mtoOpen = function (id) { if (window.openProduct) return window.openProduct(id); };   // 159: one product page for every product
  function mtoInit(id) {
    var x = PRODS[id]; if (!x || !x.cz) return;
    var m = x.cz;
    S = { id: id, img: 0, o: { n: (m.n && num(m.n.min)) || '', l: '', w: '', h: arr(m.h && m.h.options)[0] || '', size: '', material: (arr(m.materials)[0] || {}).name || '', colour: '',
      addons: arr(m.addons).filter(function (a) { return a.on; }).map(function (a) { return a.name; }), install: !!(m.install && m.install.required), pin: lastPin(),
      groups: arr(m.groups).reduce(function (g, x) { var f = arr(x.options).filter(function (y) { return String(y.name || '').trim(); })[0]; if (f) g[x.name] = f.name; return g; }, {}),
      drawing: m.drawing !== 'no', size_ok: false, note: '' } };
    if (m.unit === 'cabin' && m.cabin && m.cabin.layout) { S.o.layout = cbClone(m.cabin.layout); cbDefaults(m.cabin, S.o.layout); S.o.material = ''; S.sel = { side: 'front', i: 0 }; S.psel = null; S.wz = wzRead(m.cabin, S.o.layout); S.wz.step = 0; S.wz.adv = false; }   // 156, 157, 158
    return S;
  }
  window.mtoOpenOverlay = function (id) {
    if (!mtoInit(id)) return; var x = PRODS[id];
    try { curPid = id; } catch (e) {}
    var ov = document.getElementById('mtoOv');
    if (!ov) { ov = document.createElement('div'); ov.id = 'mtoOv'; ov.className = 'mto-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); document.body.appendChild(ov);
      ov.addEventListener('input', onInput); ov.addEventListener('change', onChange); ov.addEventListener('click', onClick); }
    ov.setAttribute('aria-label', x.n);
    draw(); ov.classList.add('open'); ov.scrollTop = 0; document.body.classList.add('flt-open');
    try { if (window.otrack) otrack('view_item', { sku: id, value: x.p }); } catch (e) {}
  };
  window.mtoClose = function () { var ov = document.getElementById('mtoOv'); if (ov) ov.classList.remove('open'); document.body.classList.remove('flt-open'); };


  // ------------------------------------------------------------ 159: Made to Order on the regular product page (same layout as ready-to-ship)
  function pdpWire() {
    if (pdpWire.done) return; pdpWire.done = true;
    var inCfg = function (f) { return function (e) { if (S && S.pdp && e.target.closest && e.target.closest('#mtoCfg')) f(e); }; };
    document.addEventListener('input', inCfg(onInput)); document.addEventListener('change', inCfg(onChange)); document.addEventListener('click', inCfg(onClick));
    var _bn = window.buyNow, _ac = window.addCart;
    window.buyNow = function () { if (S && S.pdp && PRODS[S.id] && PRODS[S.id].cz) return pdpOrder(); return _bn.apply(this, arguments); };
    window.addCart = function (id) { if (S && S.pdp && (!id || id === S.id) && PRODS[S.id] && PRODS[S.id].cz) return pdpOrder(); return _ac.apply(this, arguments); };
  }
  function pdpOrder() { var c = document.getElementById('mtoCfg'), q = price(PRODS[S.id].cz, S.o, PCT); if (!q.ok || PRODS[S.id].oo === false) { if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); return toast(PRODS[S.id].oo === false ? 'Coming soon — orders open soon' : q.error); } order(); }
  window.mtoPdpReset = function () {
    var p = document.getElementById('pdp'); if (p) p.classList.remove('pdp-mto'); document.body.classList.remove('pdp-mto-on');
    ['mtoCfg', 'mtoAccs', 'mtoChip', 'mtoChip2'].forEach(function (k) { var e = document.getElementById(k); if (e) e.remove(); });
    if (S) S.pdp = false;
  };
  window.mtoPdp = function (id) {
    if (!mtoInit(id)) return; S.pdp = true; pdpWire();
    var x = PRODS[id], m = x.cz, u = m.unit, uw = UW(u), pdp = document.getElementById('pdp'); pdp.classList.add('pdp-mto'); document.body.classList.add('pdp-mto-on');
    var c0 = arr((arr(m.materials)[0] || {}).colours)[0]; if (c0 && !S.o.colour) S.o.colour = c0.name;
    var mats = arr(m.materials).filter(function (y) { return String(y.name || '').trim(); }), lo = mats.length ? Math.min.apply(null, mats.map(function (y) { return +y.rate || 0; })) : 0;
    var pr = document.getElementById('pdPrice'); if (pr && x.oo !== false) pr.innerHTML = '<span class="mfrom">From</span> ' + rs(x.p) + (u !== 'fixed' && u !== 'cabin' && u !== 'seat' && lo ? '<span class="mrplab">' + rs(lo) + ' / ' + uw + '</span>' : '');
    var tl = document.querySelector('#pdp .taxline'); if (tl) { tl.style.display = ''; tl.textContent = 'Inclusive of GST · priced for your size and options below'; }
    var sk = document.getElementById('pdSku'); if (sk) sk.textContent = 'SKU ' + id + ' · ' + String((document.getElementById('crumbPath') || {}).textContent || '').replace(/^Home \/ /, '') + ' · Made to Order';
    var mt = document.getElementById('pdMat'); if (mt) mt.textContent = x.mat || '';
    // the configurator card: right under the title card
    var first = document.querySelector('#pdp .pdp-info .pcard'), cfg = document.createElement('div'); cfg.id = 'mtoCfg'; cfg.className = 'pcard mto-pcfg';
    first.parentNode.insertBefore(cfg, first.nextSibling);
    // details: the design's own specifications
    var kv = document.getElementById('pdKV');
    if (kv) kv.innerHTML = arr(m.specs).map(function (sp) { return '<div class="k">' + esc(sp.label) + '</div><div class="v">' + esc(sp.value) + '</div>'; }).join('') +
      '<div class="k">Made in</div><div class="v">' + esc(daysTxt(m.make_days) || '—') + ' after you order' + (m.drawing !== 'no' ? ' (and approve the drawing)' : '') + '</div>' +
      '<div class="k">Installation</div><div class="v">' + (m.install && m.install.required ? 'Included — by ' + (m.install.by === 'brand' ? esc(x.br || 'the maker') : 'a verified outrr partner') : m.install && m.install.offered ? 'Optional' : 'By you, with a fixing guide') + '</div>' +
      '<div class="k">SKU</div><div class="v">' + esc(id) + ' · Made in India</div>';
    var sz = document.getElementById('pdSize'); if (sz) sz.innerHTML = '';
    var ch = document.getElementById('pdShip'); if (ch) { var c1 = document.createElement('span'); c1.id = 'mtoChip'; c1.className = 'chip'; c1.textContent = m.install && m.install.required ? 'Installed by outrr' : m.install && m.install.offered ? 'Installation available' : 'Fixing guide included'; ch.parentNode.insertBefore(c1, ch.nextSibling); var c2 = document.createElement('span'); c2.className = 'chip'; c2.textContent = 'Made to order · returns only for defects'; c1.appendChild(document.createTextNode('')); ch.parentNode.insertBefore(c2, c1.nextSibling); c2.id = 'mtoChip2'; }
    // accordions: how it's made + questions (the ready-to-ship delivery / returns one is hidden)
    var acc = document.createElement('div'); acc.id = 'mtoAccs';
    var stp = ['Order & pay ' + PCT + '%|Size and options locked', 'Drawing|' + (m.drawing === 'no' ? 'Not needed' : 'Approve it online'), 'Making|' + (daysTxt(m.make_days) || 'Made for you'), 'Balance|Pay the rest before dispatch', (m.install && m.install.offered ? 'Installation|By our partner, OTP on completion' : 'Delivery|Tracking shared')];
    var faqs = arr(m.faqs).concat([{ q: 'How do I measure?', a: (u === 'area' ? 'Measure the floor area it should cover, post to post, in feet.' : u === 'face' ? 'Measure the width and height of the wall or opening, in feet.' : u === 'length' ? 'Measure the total running length, in feet.' : 'Pick the size that fits your space.') + ' Not sure? We check it with you on the drawing.' },
      { q: 'When do I pay the rest?', a: 'You pay ' + PCT + '% now. The rest is paid when it is ready, before dispatch: we email you the link.' },
      { q: 'Can I cancel or return it?', a: 'It is made for you, so it can’t be cancelled once production starts or returned for a change of mind. A defect or damage in delivery is fixed by the maker.' }]);
    acc.innerHTML = '<div class="acc"><div class="acc-h" onclick="accT(this)">How your order is made<span class="pm">+</span></div><div class="acc-b"><ol class="mto-stp">' + stp.map(function (t) { var p = t.split('|'); return '<li><b>' + esc(p[0]) + '</b> — ' + esc(p[1]) + '</li>'; }).join('') + '</ol></div></div>' +
      '<div class="acc"><div class="acc-h" onclick="accT(this)">Questions<span class="pm">+</span></div><div class="acc-b">' + faqs.map(function (f) { return '<p class="mto-q"><b>' + esc(f.q) + '</b><br>' + esc(f.a) + '</p>'; }).join('') + '</div></div>';
    var why = [].slice.call(document.querySelectorAll('#pdp .acc')).filter(function (a) { return /Why outrr/.test(a.textContent); })[0];
    if (why) why.parentNode.insertBefore(acc, why);
    [].slice.call(document.querySelectorAll('#pdp .acc')).forEach(function (a) { if (/Delivery, assembly/.test((a.querySelector('.acc-h') || {}).textContent || '')) a.classList.add('rts-only'); });
    try { if (window.otrack) otrack('view_item', { sku: id, value: x.p }); } catch (e) {}
    drawPdp();
  };
  function sel(attr, list, cur, lab) {   // a picklist; list = [[value, label]]
    return '<label class="mto-pk"><span>' + lab + '</span><select ' + attr + '>' + list.map(function (v) { return '<option value="' + esc(v[0]) + '"' + (String(v[0]) === String(cur) ? ' selected' : '') + '>' + esc(v[1]) + '</option>'; }).join('') + '</select></label>';
  }
  function drawPdp() {
    var x = PRODS[S.id], m = x.cz, o = S.o, u = m.unit, uw = UW(u), el = document.getElementById('mtoCfg'); if (!el) return;
    var mats = arr(m.materials).filter(function (y) { return String(y.name || '').trim(); }), mat = mats.filter(function (y) { return y.name === o.material; })[0] || mats[0];
    var hOpts = arr(m.h && m.h.options), f = [];
    if (u === 'cabin') { el.innerHTML = '<h3 class="mto-ph">Design your cabin</h3>' + cabinUI(m, o) + pdpTail(x, m, o) + '<div class="mto-sum lt" id="mtoSum"></div>'; return paint(); }
    if (u === 'seat') { var sv = []; for (var i = num(m.n.min); i <= num(m.n.max); i++) sv.push([i, i + ' seats']); f.push(sel('data-pick="n"', sv, o.n, 'Seats')); }
    else if (u === 'fixed') f.push(sel('data-pick="size"', [['', 'Choose a size']].concat(arr(m.sizes).map(function (z) { return [z.label, z.label + ' — ' + rs(fixedAt(m, mat, z))]; })), o.size, 'Size'));
    else {
      if (u === 'area' || u === 'length') f.push('<label class="mto-pk"><span>Length (ft)</span><input inputmode="decimal" data-k="l" value="' + esc(o.l) + '" placeholder="' + esc(m.l.min) + '–' + esc(m.l.max) + '"></label>');
      if (u === 'area' || u === 'face') f.push('<label class="mto-pk"><span>' + (m.panels ? 'Running length (ft)' : 'Width (ft)') + '</span><input inputmode="decimal" data-k="w" value="' + esc(o.w) + '" placeholder="' + esc(m.w.min) + '–' + esc(m.w.max) + '"></label>');
      if (hOpts.length) f.push(sel('data-k="h"', hOpts.map(function (h) { return [h, h + ' ft']; }), o.h, 'Height'));
      else if (u === 'face') f.push('<label class="mto-pk"><span>Height (ft)</span><input inputmode="decimal" data-k="h" value="' + esc(o.h) + '" placeholder="' + esc(m.h.min) + '–' + esc(m.h.max) + '"></label>');
    }
    if (mats.length > 1) f.push(sel('data-pick="material"', mats.map(function (y) { return [y.name, y.name + (u === 'fixed' ? (+y.rate ? ' (+' + rs(y.rate) + ')' : '') : m.panels ? '' : ' — ' + rs(y.rate) + ' / ' + uw)]; }), mat && mat.name, 'Finish'));
    var cols = arr(mat && mat.colours);
    if (cols.length) f.push(sel('data-pick="colour"', [].concat(cols.map(function (c) { return [c.name, c.name + (+c.extra ? ' (+' + rs(c.extra) + ' / ' + uw + ')' : '')]; })), o.colour, 'Colour'));
    arr(m.groups).filter(function (g) { return g.name && arr(g.options).length; }).forEach(function (g) {
      f.push(sel('data-grp="' + esc(g.name) + '"', arr(g.options).filter(function (y) { return y.name; }).map(function (y) {
        var pr = [+y.fixed ? (+y.fixed > 0 ? '+' : '−') + rs(Math.abs(y.fixed)) : '', +y.rate ? '+' + rs(y.rate) + ' / ' + uw : '', +y.rate_w ? '+' + rs(y.rate_w) + ' / ft width' : ''].filter(Boolean).join(' ');
        return [y.name, y.name + (pr ? ' (' + pr + ')' : '')]; }), (o.groups || {})[g.name], esc(g.name)));
    });
    var adds = arr(m.addons).filter(function (a) { return a.name; });
    var hint = u === 'area' ? 'Length × width of the floor it covers, in feet.' : u === 'face' && m.panels ? 'Total length to cover — made in ' + panelSizes(m).join(' / ') + ' ft panels.' : u === 'face' ? 'Width × height of the wall or opening, in feet.' : u === 'length' ? 'Total running length, in feet.' : '';
    el.innerHTML = '<h3 class="mto-ph">Choose your size &amp; options</h3>' + (hint ? '<p class="mto-hint">' + hint + '</p>' : '') + '<div class="mto-pks">' + f.join('') + '</div>' +
      (adds.length ? '<div class="mto-adds"><span class="mto-al">Add-ons</span>' + adds.map(function (a) { return '<label class="mto-chk"><input type="checkbox" data-add="' + esc(a.name) + '"' + (o.addons.indexOf(a.name) >= 0 ? ' checked' : '') + '><span>' + esc(a.name) + '</span><span class="r">+' + rs(a.price) + (a.charge === 'unit' ? ' / ' + uw : '') + '</span></label>'; }).join('') + '</div>' : '') +
      pdpTail(x, m, o) + '<div class="mto-sum lt" id="mtoSum"></div>';
    paint();
  }
  function pdpTail(x, m, o) {   // pincode (installation / delivery), drawing, note
    var inst = m.install && m.install.offered, instReq = inst && m.install.required, drw = m.drawing || 'choose', h = '';
    if (inst || hasDlv(m)) h += '<div class="mto-pks" style="margin-top:10px"><label class="mto-pk"><span>Your pincode</span><input inputmode="numeric" maxlength="6" data-k="pin" value="' + esc(o.pin) + '" placeholder="e.g. 110001"></label>' +
      (drw === 'choose' ? sel('data-pick="drawing"', [['1', 'Yes — send me a drawing to approve'], ['0', 'No — make it to my size']], o.drawing ? '1' : '0', 'Drawing before making?') : '') + '</div>';
    else if (drw === 'choose') h += '<div class="mto-pks" style="margin-top:10px">' + sel('data-pick="drawing"', [['1', 'Yes — send me a drawing to approve'], ['0', 'No — make it to my size']], o.drawing ? '1' : '0', 'Drawing before making?') + '</div>';
    if (inst) h += instReq ? '<p class="mto-hint" style="margin-top:8px">Installation included · <span id="mtoInstTxt"></span></p>' : '<label class="mto-chk"><input type="checkbox" data-k="install"' + (o.install ? ' checked' : '') + '><span><b>Add installation</b> · <span id="mtoInstTxt"></span></span></label>';
    if (drw === 'always') h += '<p class="mto-hint">We send you a drawing to approve before making it' + (daysTxt(m.drawing_days) ? ' (' + daysTxt(m.drawing_days) + ')' : '') + '.</p>';
    if (!o.drawing || drw === 'no') h += '<div class="mto-warn">Made exactly to the size you enter — please check it.</div><label class="mto-chk"><input type="checkbox" data-k="size_ok"' + (o.size_ok ? ' checked' : '') + '><span>I have checked my size and I take responsibility for it.</span></label>';
    h += '<details class="mto-note"><summary>Add a note for the maker</summary><textarea rows="2" data-k="note" maxlength="500">' + esc(o.note) + '</textarea></details>';
    return h;
  }
  function ctaPaint(q) {   // the page's own Buy button (and the sticky bar) follow the configuration
    var x = PRODS[S.id], closed = x.oo === false;
    document.querySelectorAll('button[onclick="buyNow()"]').forEach(function (b) { b.style.display = ''; var o = S.o, needPin = q && q.ok && q.delivery && q.delivery.fee == null, noInst = q && q.ok && o.install && q.install && !q.install.available, needOk = !o.drawing && !o.size_ok;
      b.disabled = closed; b.textContent = closed ? 'Coming soon' : !(q && q.ok) ? 'Choose your size' : needPin || noInst ? 'Enter your pincode' : needOk ? 'Confirm your size' : 'Order now · pay ' + rs(q.pay_now); });
  }

  function gal(id) { var x = PRODS[id]; return [IMGS[x.img]].concat((window.GAL && GAL[id]) || []).filter(Boolean).filter(function (u, i, a) { return a.indexOf(u) === i; }); }

  function draw() {
    if (S.pdp) return drawPdp();   // 159: Made to Order on the regular product page
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
      ['Order & ' + PCT + '%|Size and options locked', u === 'cabin' ? 'Final drawings|Sent to you for approval — making starts only after you approve' : 'Drawing|If you chose it: approve online', 'Production|' + (daysTxt(m.make_days) || 'Made for you'), 'Balance|Pay the rest' + (inst ? ' + installation' : '') + ' before dispatch', 'Dispatch|Tracking shared', 'Installation|If added: OTP on completion']
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
    if (u === 'cabin') mount3d();   // 159
  }

  function paint() {
    var x = PRODS[S.id], m = x.cz, o = S.o; o.zone = zoneOf(m.ships_from, o.pin); var q = price(m, o, PCT), el = document.getElementById('mtoSum'), it = document.getElementById('mtoInstTxt');
    if (S.pdp) ctaPaint(q);
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
      q.addons.map(function (a) { return '<div class="rw"><span>' + esc(a.name) + '</span><span>' + (a.amount ? rs(a.amount) : 'Included') + '</span></div>'; }).join('') +
      (ins ? '<div class="rw"><span>Installation (' + esc(q.install.city) + ')</span><span>' + rs(q.install_fee) + '</span></div>' : '') +
      '<div class="rw"><span>Delivery</span><span>' + (!q.delivery ? 'Included' : q.delivery.fee == null ? 'Enter your pincode' : rs(q.delivery_fee)) + '</span></div>' +
      '<div class="rw tt"><span>Total</span><span>' + rs(q.total) + '</span></div>' +
      '<div class="mto-pay"><div>Pay now (' + PCT + '%)<b>' + rs(q.pay_now) + '</b></div><div>Before dispatch' + (ins ? ' (rest + installation)' : '') + '<b>' + rs(q.before_dispatch) + '</b></div></div>' +
      (o.install && q.install && !q.install.available && /^\d{6}$/.test(o.pin) ? '<p class="mto-err" style="margin:10px 0 0">Installation isn’t available at ' + esc(o.pin) + ' yet: untick it to order without.</p>' : '') +
      '<button class="mto-go" type="button" data-act="order"' + (needOk || closed || needPin || (o.install && q.install && !q.install.available) ? ' disabled' : '') + '>' + (closed ? 'Orders open soon' : needPin ? 'Enter your pincode' : needOk ? 'Confirm your size above' : 'Order now · pay ' + rs(q.pay_now)) + '</button>' +
      '<p style="text-align:center;font-size:13px;color:#CFC8BD;margin:10px 0 0">Buying for a project or 5+ pieces? <a style="color:#F2B49C;cursor:pointer" data-act="bulk">Get a bulk quote</a></p>';
  }

  function setDim(key, v) {   // 159: size from − / + or typed, kept inside the limits
    var cz = PRODS[S.id].cz, c = cz.cabin, lay = S.o.layout, lim = c[key] || {}, lo = num(lim.min) || 8, hi = num(lim.max) || (key === 'L' ? 40 : 20);
    lay[key] = Math.max(lo, Math.min(hi, Math.round(num(v) || lo)));
    if (S.wz && !S.wz.custom) wzBuild(c, lay, S.wz); else cbResize(c, lay); arr(lay.places).forEach(function (p) { cbClamp(c, lay, p); }); cbSync(c, lay); S.sel = { side: (S.sel || {}).side || 'front', i: 0 };
  }
  function onInput(e) { var k = e.target.getAttribute('data-k'); if (!k || !S) return; if (k === 'pin') e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); S.o[k] = e.target.value; paint(); }
  function onChange(e) {
    var t = e.target, k = t.getAttribute('data-k'); if (!S) return;
    var pk = t.getAttribute('data-pick');   // 159 picklists
    if (pk === 'n') { S.o.n = +t.value; return draw(); }
    if (pk === 'size') { S.o.size = t.value; return draw(); }
    if (pk === 'material') { S.o.material = t.value; var mm1 = arr(PRODS[S.id].cz.materials).filter(function (y) { return y.name === t.value; })[0]; S.o.colour = (arr(mm1 && mm1.colours)[0] || {}).name || ''; return draw(); }
    if (pk === 'colour') { S.o.colour = t.value; return draw(); }
    if (pk === 'drawing') { S.o.drawing = t.value === '1'; return draw(); }
    if (k === 'install' || k === 'size_ok') { S.o[k] = t.checked; var mm = (PRODS[S.id] || {}).cz; if (k === 'install' && mm && mm.install && mm.install.required) S.o.install = true; return paint(); }
    if (t.hasAttribute('data-grp')) { S.o.groups = Object.assign({}, S.o.groups); S.o.groups[t.getAttribute('data-grp')] = t.value; return paint(); }
    if (t.hasAttribute('data-cdim')) { setDim(t.getAttribute('data-cdim'), Math.round(+t.value || 0)); return draw(); }   // 156
    if (t.hasAttribute('data-wzfull')) { S.o.layout.full_doors = t.checked; return draw(); }   // 159
    if (t.hasAttribute('data-wzgon')) { S.o.layout.gutter = t.checked ? (S.o.layout.gutter && SIDES.indexOf(S.o.layout.gutter) >= 0 ? S.o.layout.gutter : 'back') : null; return draw(); }
    if (t.hasAttribute('data-wztog')) { var czw = PRODS[S.id].cz.cabin; S.wz[t.getAttribute('data-wztog')] = t.checked; wzBuild(czw, S.o.layout, S.wz); return draw(); }   // 158
    if (t.hasAttribute('data-wzup')) { var czu = PRODS[S.id].cz.cabin, lu = arr(czu[{ height: 'heights', glass: 'glasses', panel: 'panels' }[t.getAttribute('data-wzup')]]); S.o.layout[t.getAttribute('data-wzup')] = lu[t.checked ? 1 : 0].name; return draw(); }
    if (t.hasAttribute('data-citc')) { S.o.layout.items = Object.assign({}, S.o.layout.items); S.o.layout.items[t.getAttribute('data-citc')] = t.checked ? 1 : 0; return draw(); }
    if (k === 'h') { S.o.h = t.value; return paint(); }
    if (t.hasAttribute('data-mat')) { S.o.material = t.getAttribute('data-mat'); S.o.colour = ''; return draw(); }
    if (t.hasAttribute('data-drw')) { S.o.drawing = t.getAttribute('data-drw') === '1'; return draw(); }
    if (t.hasAttribute('data-add')) { var n = t.getAttribute('data-add'); S.o.addons = S.o.addons.filter(function (a) { return a !== n; }); if (t.checked) S.o.addons.push(n); return paint(); }
  }
  function onClick(e) {
    var t = e.target.closest('[data-act],[data-size],[data-col],[data-img],[data-open],[data-n],[data-bay],[data-bk],[data-cch],[data-cit],[data-pl],[data-dragpl],[data-pact],[data-wzgo],[data-wzadv],[data-wzside],[data-wp],[data-wzpiece],[data-wzsize],[data-wzglass],[data-wzdoor],[data-wzdside],[data-wzwin],[data-cchk],[data-wzv],[data-cstep],[data-wztrk],[data-wzpj],[data-wzpd],[data-wzpt],[data-wzpu],[data-wzgut]'); if (!t || !S) return;
    var cz0 = (PRODS[S.id] || {}).cz;   // 156: cabin builder
    if (t.getAttribute && t.getAttribute('data-dragged')) { t.removeAttribute('data-dragged'); return; }
    if (cz0 && cz0.unit === 'cabin' && S.wz && wzClick(t)) return draw();   // 158
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
