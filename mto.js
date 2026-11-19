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
      // 188: where two sides meet (an L) the corner square is built too, and priced like the rest
      var ncor = [['front', 'right'], ['right', 'back'], ['back', 'left'], ['left', 'front']].filter(function (q) { return psd.indexOf(q[0]) >= 0 && psd.indexOf(q[1]) >= 0; }).length;
      if (plen > 0) { var plc0 = plen + ncor * dep; a2 = rnd(plc0 * ((num(c.proj.rate) || 0) + (num(pdz && pdz.extra) || 0)) + (plen * dep + ncor * dep * dep) * ((num(ptp && ptp.rate) || 0) + (num(pun && pun.rate) || 0)));
        lines.push({ name: 'Pergola projection ' + dep + ' ft deep · ' + plen + ' ft (' + psd.join(', ') + ')' + (ncor ? ' + ' + ncor + ' corner' + (ncor > 1 ? 's' : '') : '') + ' · ' + [nm(pdz), nm(ptp), nm(pun)].filter(function (x) { return x != null; }).join(', ') + ' · lights included', amount: a2 }); total += a2; }
      pj = { sides: psd, design: nm(pdz), top: nm(ptp), under: nm(pun) };
    }
    // 188: floor finish (always one), wall finish + shade per wall, deck profile light per side
    var flo = arr(c.floors).length ? pick(c.floors, lay.floor) : null;
    if (flo) { a2 = rnd(fl * (num(flo.rate) || 0)); lines.push({ name: 'Floor finish · ' + flo.name, amount: a2 }); total += a2; }
    var Hft = /^10/.test((hgt && hgt.name) || '') ? 10 : 8.5, wfin = null;
    if (arr(c.wall_fins).length) {
      wfin = {};
      SIDES.forEach(function (sd) {
        var lw = isObj(lay.wall_fin) && isObj(lay.wall_fin[sd]) ? lay.wall_fin[sd] : {}, f = pick(c.wall_fins, lw.fin), sh = arr(c.shades).length ? pick(c.shades, lw.shade) : null;
        var nsol = 0, ks2 = walls[sd], q = 0; while (q < ks2.length) { var b2 = arr(c.bays).filter(function (x) { return x && x.key === ks2[q]; })[0], sp2 = Math.max(Math.floor(dv(b2.span, 1)), 1); if (b2.solid && !b2.door) nsol += sp2; q += sp2; }
        var area = Math.min(nsol * bay, sd === 'front' || sd === 'back' ? L : W) * Hft, am = rnd(area * (num(f && f.rate) || 0));
        wfin[sd] = { fin: nm(f), shade: nm(sh) };
        if (am) { lines.push({ name: 'Wall finish · ' + sd + ' · ' + f.name + (sh && !/wpc|laminate|wood/i.test(f.name) ? ' (' + sh.name + ')' : '') + ' · ' + area + ' sq ft', amount: am }); total += am; }
      });
    }
    var dls = null;
    if ((num(c.deck_light) || 0) > 0) {
      dls = SIDES.filter(function (x) { return Array.isArray(lay.deck_lights) && lay.deck_lights.indexOf(x) >= 0; });
      var dlen = dls.reduce(function (t0, x) { return t0 + (x === 'front' || x === 'back' ? L : W); }, 0);
      if (dlen) { a2 = rnd(dlen * num(c.deck_light)); lines.push({ name: 'Deck profile light · ' + dlen + ' ft (' + dls.join(', ') + ')', amount: a2 }); total += a2; }
    }
    var ceilT = arr(c.ceilings).length ? pick(c.ceilings, lay.ceiling_type) : null;
    for (var t = 0; t < its.length; t++) {
      var it = its[t];
      if (!isObj(lay.items) || !(it.key in lay.items)) continue;
      var qv = num(lay.items[it.key]);
      if (qv == null || qv < 0 || qv !== Math.floor(qv) || qv > dv(it.max, 100)) return { ok: false, error: 'Check the quantity of ' + String(it.name).toLowerCase() };
      if (qv === 0) continue;
      var ic = it.key === 'ceiling' && ceilT, amt = it.unit === 'floor' ? rnd((ic ? num(ceilT.rate) || 0 : num(it.price) || 0) * fl) : rnd((num(it.price) || 0) * qv);
      lines.push({ name: (ic ? 'False ceiling — ' + ceilT.name + ' with LED (whole floor)' : it.name) + (it.unit === 'floor' ? '' : it.unit === 'rft' ? ' · ' + qv + ' ft' : it.unit === 'wall_sqft' ? ' · ' + qv + ' sq ft' : ' × ' + qv), amount: amt });
      items[it.key] = qv; total += amt;
    }
    // 157: where things sit inside (drag and drop) — kept for the drawing, not priced
    var cl = function (v, hi) { return rnd(Math.min(Math.max(dv(v, 0), 0), hi) * 2) / 2; };
    // 188: toilet / WC / pantry can be made bigger (never smaller than standard): w × d ft (before turning); extra area / length priced
    var RM = isObj(c.rooms) ? c.rooms : {}, rx = 0, rxs = [];
    var places = (Array.isArray(lay.places) ? lay.places.slice(0, 40) : []).map(function (pl) {
      var it = pl && typeof pl === 'object' ? arr(c.items).filter(function (x) { return x && x.key === pl.key && (x.unit === 'nos' || x.unit === 'rft'); })[0] : null;
      if (!it) return null;
      var o2 = { key: pl.key, x: cl(pl.x, L), y: cl(pl.y, W), rot: num(pl.rot) === 90 ? 90 : 0, len: it.unit === 'rft' ? Math.min(Math.max(rnd(dv(pl.len, 1)), 1), Math.max(L, W)) : null }, r = RM[pl.key];
      if (isObj(r) && num(r.w) && num(r.d)) {
        o2.w = Math.min(Math.max(cl(dv(pl.w, r.w), 99), num(r.w)), Math.max(L, W)); o2.d = Math.min(Math.max(cl(dv(pl.d, r.d), 99), num(r.d)), Math.max(L, W));
        var ex = num(r.rate_rft) ? (o2.w - num(r.w)) * num(r.rate_rft) : (o2.w * o2.d - num(r.w) * num(r.d)) * (num(r.rate) || 0);
        if (ex > 0) { rx += ex; rxs.push(it.name.replace(/ \d.*$/, '').replace(/ —.*$/, '') + ' ' + o2.w + ' × ' + o2.d + ' ft'); }
      }
      return o2;
    }).filter(function (x) { return x; });
    if (rx > 0) { a2 = rnd(rx); lines.push({ name: 'Bigger rooms · ' + rxs.join(', '), amount: a2 }); total += a2; }
    return { ok: true, L: L, W: W, floor: fl, size: L + ' × ' + W + ' ft', total: total, lines: lines,
      layout: { L: L, W: W, roof: nm(roof), height: nm(hgt), panel: nm(pnl), glass: nm(gls), frame: nm(frm), walls: walls, items: items, places: places,
        tracks: nm(trk), full_doors: lay.full_doors === true, gutter: gsd, proj: pj,
        floor: nm(flo), wall_fin: wfin, deck_lights: dls, ceiling_type: nm(ceilT) } };
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
    '.pdp-mto .qtyrow,.pdp-mto .cashback,.pdp-mto .etamod,.pdp-mto .delvblock,.pdp-mto #vSec,.pdp-mto #setSec,.pdp-mto .acc.rts-only,.pdp-mto #pdHurry,.pdp-mto #pdSize,.pdp-mto .chips .chip.terra,.pdp-mto #pdDlv,.pdp-mto #pdMto,.pdp-mto #pdEtaLine{display:none!important}' +
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
    '.pdp-cab .pdp-grid>div:first-child>.gal-main,.pdp-cab .pdp-grid>div:first-child>.thumbs{display:none!important}'+
    '.cb-stage{background:#fff;padding:0 0 8px;z-index:6}.cb-stage .wz-3dv{height:min(42vh,420px);border-radius:16px}.cb-stage .cb-pic{height:min(42vh,420px);border-radius:16px;background:#F3EEE6;overflow:auto;position:relative}'+
    '.cb-pic img{width:100%;height:100%;object-fit:contain;display:block}.cb-pic .cb-plan{padding:6px;box-sizing:border-box;height:100%;background:#fff}.cb-plan svg{width:100%!important;height:100%!important}'+
    '.cb-vw{display:flex;gap:5px;margin-top:8px;flex-wrap:wrap}.cb-vw button{flex:1 1 auto;border:1px solid #E2D6C4;background:#fff;border-radius:99px;padding:6px 8px;min-height:34px;font:inherit;font-size:12px;font-weight:600;cursor:pointer;color:#2E2E2E;white-space:nowrap}.cb-vw button.on{background:#2E2E2E;color:#fff;border-color:#2E2E2E}'+
    '.cb-sides{position:absolute;bottom:8px;right:8px;display:flex;gap:4px;z-index:2}.cb-sides button{border:0;background:rgba(255,255,255,.92);border-radius:8px;min-width:34px;min-height:32px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.15)}.cb-sides button.on{background:#C26445;color:#fff}'+
    '.cb-nav{position:absolute;top:50%;transform:translateY(-50%);border:0;background:rgba(255,255,255,.9);width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer}'+
    '@media(max-width:899px){.pdp-cab .pdp-grid>div:first-child{display:contents}.cb-stage{position:sticky;top:var(--cbtop,0px);margin:0 -14px;padding:0 14px 8px;box-shadow:0 6px 10px -8px rgba(0,0,0,.25)}.cb-stage .wz-3dv,.cb-stage .cb-pic{height:30vh;min-height:200px}}'+
    '@media(min-width:900px){.pdp-cab .pdp-grid>div:first-child{position:sticky;top:calc(var(--cbtop,96px) + 12px)}}'+
    '.wz-stc{display:flex;gap:6px;overflow-x:auto;margin:0 0 12px;scrollbar-width:none;padding-bottom:2px}.wz-stc button{flex:none;border:1px solid #E2D6C4;background:#fff;border-radius:99px;padding:6px 12px;min-height:34px;font:inherit;font-size:12.5px;cursor:pointer;color:#6A6258}.wz-stc button.dn{color:#2E2E2E;border-color:#C9BBA6}.wz-stc button.on{background:#C26445;border-color:#C26445;color:#fff;font-weight:700}'+
    '.wz-tpl{display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;scrollbar-width:thin}.wz-tpl .wz-card{flex:0 0 132px}'+
    '.cbbar{display:flex;gap:10px;align-items:center;width:100%}.cbbar .cbp{flex:1;text-align:left;background:none;border:0;font:inherit;cursor:pointer;padding:0;color:#2E2E2E}.cbbar .cbp b{display:block;font-size:19px}.cbbar .cbp small{font-size:12px;color:#9C4127;font-weight:600}'+
    '.cbbar .cbn{flex:1.2;background:#2E2E2E;color:#fff;border:0;border-radius:12px;min-height:48px;font:inherit;font-weight:700;font-size:15px;cursor:pointer}.cbbar .cbn[disabled]{background:#9A958C;cursor:not-allowed}'+
    '.cb-sheet{position:fixed;inset:0;z-index:400;background:rgba(0,0,0,.4);display:none;align-items:flex-end;justify-content:center}.cb-sheet.open{display:flex}.cb-sheet>div{background:#fff;width:min(560px,100%);max-height:80vh;overflow:auto;border-radius:18px 18px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom))}'+
    '.cb-sheet .mto-go{display:none}.cb-sheet h4{margin:0 0 10px;font-size:17px;display:flex;justify-content:space-between;align-items:center}.cb-sheet h4 button{border:0;background:#F3EEE6;border-radius:50%;width:36px;height:36px;font-size:16px;cursor:pointer}'+
    'body.pdp-cab-on .ctas>*:not(.cbbar):not(.cbcta){display:none!important}'+
    '#pdp.pdp-mtofull .speccard{display:none}#pdp.pdp-mtofull .acc:has(#pdRevAvg){display:none}'+
    '.mf{margin:44px 0 0;padding-top:26px;border-top:1px solid #E7DDCF}.mf h2{font-size:26px;margin:0 0 4px}.mf-sub{color:#6A6258;margin:0 0 16px;font-size:14px}'+
    '.mf-parts{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:10px}.mf-part{display:flex;gap:12px;align-items:center;background:#fff;border:1px solid #EADFD0;border-radius:12px;padding:8px}'+
    '.mf-pi{flex:none;width:72px;height:72px;border-radius:9px;overflow:hidden;border:0;padding:0;background:#F3EEE6;cursor:zoom-in;display:grid;place-items:center}.mf-pi img{width:100%;height:100%;object-fit:cover;transition:transform .25s}.mf-pi:hover img{transform:scale(1.08)}'+
    '.mf-noimg{cursor:default;font-size:24px;font-weight:800;color:#C26445;background:#FBEDE7}.mf-part b{display:block;font-size:14px;line-height:1.3}.mf-part small{display:block;font-size:12px;color:#6A6258;line-height:1.4;margin-top:2px}.mf-part .mf-br{color:#9C4127;font-weight:600}'+
    '.mf-spec{display:grid;grid-template-columns:1fr 1fr;column-gap:40px;background:#fff;border:1px solid #EADFD0;border-radius:14px;padding:4px 22px}.mf-spec>div{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #F0E8DC;padding:11px 0;font-size:14px}.mf-spec span{color:#6A6258;flex:none;max-width:45%}.mf-spec b{font-weight:600;text-align:right}'+
    '.mf-steps{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}.mf-steps>div{background:#fff;border:1px solid #EADFD0;border-radius:14px;padding:16px}.mf-steps i{font-style:normal;display:inline-grid;place-items:center;width:32px;height:32px;border-radius:50%;background:#C26445;color:#fff;font-weight:700}.mf-steps b{display:block;margin:10px 0 3px}.mf-steps small{font-size:13px;color:#6A6258;line-height:1.5}'+
    '.mf-rv{background:#fff;border:1px solid #EADFD0;border-radius:14px;padding:18px 20px}'+
    '.mf-faq{display:grid;grid-template-columns:300px 1fr;gap:36px}.mf-faq aside{background:#2E2E2E;color:#fff;border-radius:16px;padding:22px;align-self:start;position:sticky;top:110px}.mf-faq aside b{font-size:19px;display:block;margin-bottom:6px}.mf-faq aside p{color:#D8D0C4;font-size:14px;line-height:1.6;margin:0}.mf-faq aside button{margin-top:14px;background:#25D366;color:#fff;border:0;border-radius:10px;padding:12px 16px;font:inherit;font-weight:700;cursor:pointer}'+
    '.mf-cat{font-size:12px;font-weight:700;letter-spacing:1px;color:#9C4127;text-transform:uppercase;margin:18px 0 8px}.mf-cat:first-child{margin-top:0}.mf-faq details{background:#fff;border:1px solid #EADFD0;border-radius:12px;margin-bottom:8px;padding:0 18px}'+
    '.mf-faq summary{list-style:none;cursor:pointer;padding:16px 0;font-weight:600;font-size:15.5px;display:flex;justify-content:space-between;gap:12px}.mf-faq summary::-webkit-details-marker{display:none}.mf-faq summary::after{content:"+";font-size:22px;color:#C26445;line-height:1}.mf-faq details[open] summary::after{content:"−"}.mf-faq details p{margin:0 0 16px;color:#4A4640;line-height:1.7;font-size:14.5px}'+
    '@media(max-width:760px){.mf h2{font-size:21px}.mf-parts{grid-template-columns:1fr}.mf-pi{width:60px;height:60px}.mf-spec{grid-template-columns:1fr;padding:4px 14px}.mf-steps{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:62%;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 -14px;padding:0 14px 4px}.mf-steps>div{scroll-snap-align:start;padding:12px}.mf-faq{grid-template-columns:1fr;gap:16px}.mf-faq aside{position:static;order:2}}'+
    'body.pdp-cab-on:not(.cb-studio) #cbStage,body.pdp-cab-on:not(.cb-studio) #mtoCfg,body.pdp-cab-on:not(.cb-studio) .ctas .cbbar{display:none!important}'+
    'body.pdp-cab-on:not(.cb-studio) .pdp-cab .pdp-grid>div:first-child>.gal-main{display:block!important}body.pdp-cab-on:not(.cb-studio) .pdp-cab .pdp-grid>div:first-child>.thumbs{display:flex!important}'+
    '@media(max-width:899px){body.pdp-cab-on:not(.cb-studio) .pdp-cab .pdp-grid>div:first-child{display:block}}'+
    '.cbcta{display:flex;flex-direction:column;gap:10px;width:100%}.cbcta button{min-height:52px;border-radius:12px;font:inherit;font-weight:700;font-size:16px;cursor:pointer;width:100%}'+
    '.cbc-main{background:#C26445;color:#fff;border:0;box-shadow:0 6px 18px -6px rgba(194,100,69,.65);animation:cbpulse 2.4s ease-in-out 3}.cbc-main:hover{background:#A84F33}.cbc-sec{background:#fff;color:#2E2E2E;border:1.5px solid #2E2E2E}'+
    '@keyframes cbpulse{0%,100%{box-shadow:0 6px 18px -6px rgba(194,100,69,.65)}50%{box-shadow:0 0 0 6px rgba(194,100,69,.18)}}'+
    '.cb-avg{position:fixed;inset:0;z-index:960;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;padding:14px}.cb-avg.open{display:flex}'+
    '.cb-avgb{background:#fff;border-radius:18px;width:min(980px,100%);max-height:92vh;overflow:auto;padding:18px}.cb-avgb h4{margin:0;font-size:20px;display:flex;justify-content:space-between;align-items:center}.cb-avgb h4 button{border:0;background:#F3EEE6;border-radius:50%;width:38px;height:38px;font-size:16px;cursor:pointer}'+
    '.cb-avgs{font-size:13px;color:#6A6258;margin:4px 0 14px}.cb-avgg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.cb-avgc{border:1px solid #E2D6C4;border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:4px;background:#FFFBF5}.cb-avgc.on{border:2px solid #C26445}'+
    '.cb-avgc img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:10px;margin-bottom:6px}.cb-avgc>b{font-size:16px}.cb-avgc>small{color:#6A6258;font-size:12px}.cb-avgp{display:flex;align-items:baseline;gap:8px;margin-top:6px}.cb-avgp span{font-size:12px;color:#6A6258}.cb-avgp b{font-size:24px}'+
    '.cb-avgr{font-size:12px;color:#4A4640}.cb-avgc button{margin-top:auto;background:#2E2E2E;color:#fff;border:0;border-radius:10px;min-height:44px;font:inherit;font-weight:700;font-size:13.5px;cursor:pointer;margin-top:10px}.cb-avgc.on button{background:#C26445}'+
    '@media(max-width:760px){.cb-avg{align-items:flex-end;padding:0}.cb-avgb{border-radius:18px 18px 0 0;max-height:88vh}.cb-avgg{grid-template-columns:1fr}.cb-avgc{display:grid;grid-template-columns:110px 1fr;column-gap:12px}.cb-avgc img{grid-row:span 5;margin:0;height:100%;aspect-ratio:auto}.cb-avgc button{grid-column:1/-1}}'+
    '.cbs-ov{position:fixed;inset:0;z-index:900;background:#F6F1E9;display:none}.cbs-ov.open{display:block}'+
    '.cbs-hd{height:56px;display:flex;align-items:center;gap:10px;padding:0 12px;background:#fff;border-bottom:1px solid #E7DDCF;box-sizing:border-box}.cbs-hd>div{flex:1;min-width:0;text-align:center}.cbs-hd b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cbs-hd small{font-size:12px;color:#9C4127;font-weight:600}'+
    '.cbs-x{border:0;background:#F3EEE6;border-radius:50%;width:40px;height:40px;font-size:18px;cursor:pointer;flex:none}'+
    'body.cb-studio{overflow:hidden;--cbsh:60px;--cbsp:214px;--cbs3d:calc(100vh - var(--cbsh) - var(--cbsp))}body.cb-studio.cbs-big{--cbsp:0px}'+
    '.cbs-hd{height:var(--cbsh)!important}.cbs-tt{flex:0 0 auto!important;text-align:left!important;max-width:220px}.cbs-st{flex:1;min-width:0;display:flex;justify-content:center}.cbs-st .wz-stc{margin:0;padding:0}'+
    'body.cb-studio #cbStage{position:fixed!important;top:var(--cbsh)!important;left:0;right:0;height:var(--cbs3d);margin:0!important;padding:8px 12px!important;box-shadow:none!important;background:transparent!important;z-index:901;box-sizing:border-box;display:flex;flex-direction:column}'+
    '.cbs-v{position:relative;flex:1;min-height:0;width:100%;margin:0 auto}.cbs-v .wz-3dv{height:100%!important;border-radius:16px}.cbs-v .wz-3dv>svg{padding:24px}'+
    '.cbs-z button[disabled]{opacity:.35;cursor:default}.cbs-z{position:absolute;right:10px;top:10px;display:flex;flex-direction:column;gap:6px;z-index:2}.cbs-z button{border:0;background:rgba(255,255,255,.95);width:40px;height:40px;border-radius:10px;font-size:19px;font-weight:700;cursor:pointer;box-shadow:0 1px 5px rgba(0,0,0,.18)}.cbs-z button.on{background:#C26445;color:#fff}'+
    '.cbs-hint{position:absolute;left:50%;transform:translateX(-50%);bottom:10px;margin:0;font-size:11.5px;color:#fff;background:rgba(46,46,46,.62);padding:4px 10px;border-radius:99px;pointer-events:none;white-space:nowrap;max-width:94%;overflow:hidden;text-overflow:ellipsis}'+
    '.cbs-ed{position:absolute;left:10px;right:60px;bottom:10px;z-index:2;background:rgba(255,255,255,.93);border-radius:12px;padding:6px 8px;box-shadow:0 2px 10px rgba(0,0,0,.15)}.cbs-ed .cb-ed{margin:0}'+
    'body.cb-studio #mtoCfg{position:fixed!important;left:0;right:0;bottom:0;height:var(--cbsp);overflow:hidden;z-index:901;margin:0!important;border:0!important;border-top:1px solid #E7DDCF!important;border-radius:0!important;background:#fff!important;padding:14px 300px 14px 20px!important;box-sizing:border-box;display:flex;gap:22px}'+
    'body.cb-studio.cbs-big #mtoCfg{display:none!important}'+
    '.cbs-t{flex:0 0 210px}.cbs-t .wz-h{font-size:18px}.cbs-t .wz-sub{font-size:12.5px;margin:4px 0 0}'+
    '.cbs-o{flex:1;min-width:0;height:100%;overflow-x:auto;overflow-y:hidden;display:flex;flex-direction:column;flex-wrap:wrap;align-content:flex-start;column-gap:26px;scrollbar-width:thin}'+
    '.cbs-o>*{flex:none;max-width:560px}.cbs-g{margin:0 0 6px}.cbs-g .wz-lbl{margin:0 0 6px!important}.cbs-o .wz-lbl{margin:0 0 6px;font-size:12px}.cbs-o .wz-lbl:not(:first-child){margin-top:8px}'+
    '.cbs-o .wz-cards{display:flex;gap:8px;overflow:visible;max-width:none}.cbs-o .wz-card{flex:0 0 128px;min-height:0;padding:7px}.cbs-o .wz-card .wz-pic{height:54px}.cbs-o .wz-card b{font-size:13px}.cbs-o .wz-card small{font-size:11px}'+
    '.cbs-o .wz-row{width:330px;box-sizing:border-box;margin:0 0 8px;padding:8px 12px}.cbs-o .wz-note{width:330px;box-sizing:border-box;margin:0 0 8px;font-size:12px;padding:8px 10px}.cbs-o .wz-tabs{margin:0 0 6px}.cbs-o .wz-tpl{max-width:560px}'+
    '.cbs-o .wz-sum{width:380px;margin:0}.cbs-o .wz-elev{width:420px}.cbs-o .wz-dims{display:none}'+
    'body.cb-studio .ctas .cbbar{position:fixed;right:0;bottom:0;width:280px;height:var(--cbsp);z-index:902;background:#FBF7F1;border-left:1px solid #E7DDCF;padding:16px;box-sizing:border-box;display:grid;grid-template-columns:auto auto 1fr;grid-template-rows:1fr auto;gap:10px;align-items:end}body.cb-studio .ctas .cbbar .cbb{grid-row:2}body.cb-studio .ctas .cbbar .cbb:first-child{grid-column:1}'+
    'body.cb-studio .ctas .cbbar .cbp{grid-column:1/-1;grid-row:1;align-self:start}body.cb-studio .ctas .cbbar .cbp b{font-size:24px}body.cb-studio .ctas .cbbar .cbn{grid-column:3;grid-row:2;min-height:50px}body.cb-studio .ctas .cbbar .cbn:first-child,body.cb-studio .ctas .cbbar .cbp:first-child+.cbn{grid-column:1/-1}'+
    'body.cb-studio.cbs-big .ctas .cbbar{height:auto;width:auto;left:auto;top:auto;bottom:14px;right:14px;border-radius:14px;border:1px solid #E7DDCF;grid-template-rows:auto;grid-template-columns:auto auto auto;align-items:center}body.cb-studio.cbs-big .ctas .cbbar .cbp{grid-column:auto}body.cb-studio.cbs-big .ctas .cbbar .cbn{grid-column:auto}body.cb-studio.cbs-big .ctas .cbbar .cbn,body.cb-studio.cbs-big .ctas .cbbar .cbp,body.cb-studio.cbs-big .ctas .cbbar .cbb{grid-row:auto}'+
    '.cbbar .cbb{flex:none;width:48px;min-height:48px;border:1.5px solid #2E2E2E;background:#fff;border-radius:12px;font-size:18px;cursor:pointer}'+
    '@media(max-width:899px){body.cb-studio{--cbsh:96px;--cbsp:auto;--cbs3d:52vh;--cbs3d:52dvh}.cbs-hd{flex-wrap:wrap;align-content:center;row-gap:6px;padding:6px 10px!important}.cbs-tt{flex:1!important;max-width:none;text-align:center!important}.cbs-st{order:3;flex:0 0 100%!important;justify-content:flex-start!important;overflow-x:auto}.cbs-x{width:36px;height:36px}'+
    'body.cb-studio #mtoCfg{top:calc(var(--cbsh) + var(--cbs3d));bottom:74px;height:auto;display:block;overflow:auto;padding:10px 14px 14px!important}.cbs-o{display:block;height:auto;overflow:visible}.cbs-o>*{max-width:none}.cbs-o .wz-cards{overflow-x:auto;padding-bottom:4px}.cbs-o .wz-row,.cbs-o .wz-note,.cbs-o .wz-sum,.cbs-o .wz-elev{width:auto}.cbs-t{margin-bottom:8px}'+
    'body.cb-studio .ctas .cbbar{left:0;width:auto;height:auto;min-height:74px;border-left:0;border-top:1px solid #E7DDCF;display:flex;padding:10px 14px calc(10px + env(safe-area-inset-bottom))}body.cb-studio.cbs-big .ctas .cbbar{left:0;right:0;bottom:0;border-radius:0}'+
    '.cbs-hint{white-space:normal;text-align:center;font-size:10.5px;width:86%;line-height:1.3}.cbs-ed{right:56px}}'+
    'body.cb-studio .cb-sheet{z-index:950}body.cb-studio .cb-avg{z-index:960}'+
    'body.cb-studio .pdp-cab .pdp-grid>div:first-child{position:static!important}body.cb-studio .ctas{z-index:902!important}body.cb-studio .ctas{background:none!important;box-shadow:none!important;border:0!important;padding:0!important}body.cb-studio .ctas .cbcta{display:none!important}body.cb-studio #nearPill,body.cb-studio .wafab{display:none!important}'+
    'body.cb-studio .pdp-info{position:static!important;top:auto!important}'+   /* a sticky column makes its own layer and hid the options under the studio */
    '@media(min-width:900px){body.cb-studio{--cbsw:400px}body.cb-studio #cbStage{right:var(--cbsw);height:calc(100vh - var(--cbsh));padding:10px 6px 10px 12px!important}body.cb-studio.cbs-big #cbStage{right:0}'+
    'body.cb-studio #mtoCfg{top:var(--cbsh);left:auto!important;right:0;width:var(--cbsw);bottom:156px;height:auto;display:block;overflow-y:auto;padding:16px 18px!important;border-top:0!important;border-left:1px solid #E7DDCF!important}'+
    '.cbs-t{margin:0 0 12px}.cbs-o{display:block;height:auto;overflow:visible}.cbs-o>*{max-width:none}.cbs-o .wz-cards{flex-wrap:wrap}.cbs-o .wz-card{flex:1 1 150px}.cbs-o .wz-row,.cbs-o .wz-note,.cbs-o .wz-sum,.cbs-o .wz-elev{width:auto}'+
    'body.cb-studio:not(.cbs-big) .ctas .cbbar{width:var(--cbsw);height:156px;border-top:1px solid #E7DDCF}}'+   /* desktop: big model on the left, every choice in a panel on the right (like the pergola studio) */
    '.cb-ov{position:absolute;top:8px;left:8px;display:flex;gap:6px;z-index:2}.cb-ov button{border:0;background:rgba(255,255,255,.92);border-radius:99px;padding:6px 11px;min-height:32px;font:inherit;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.15)}'+
    '.cb-fn{position:absolute;left:10px;bottom:8px;font-size:10.5px;color:#fff;background:rgba(46,46,46,.6);padding:3px 8px;border-radius:99px;pointer-events:none}'+
    '.cb-hint{font-size:12px;color:#6A6258;margin:8px 2px 0}.cb-ed{display:flex;gap:6px;overflow-x:auto;margin-top:8px;align-items:center;padding-bottom:2px;scrollbar-width:none}'+
    '.cb-ed .cb-et{flex:none;font-size:12px;font-weight:700;color:#9C4127;padding-right:2px}.cb-ed button{flex:none;border:1px solid #E2D6C4;background:#fff;border-radius:10px;padding:6px 10px;min-height:36px;font:inherit;font-size:12.5px;cursor:pointer;color:#2E2E2E}'+
    '.cb-ed button small{color:#6A6258;font-size:11px}.cb-ed button.on{border-color:#C26445;background:#FBEDE7;font-weight:700}.cb-ed button.dn{background:#2E2E2E;color:#fff;border-color:#2E2E2E}.cb-ed button[disabled]{opacity:.4}'+
    '.wz-3d{position:sticky;top:52px;z-index:3;background:#FFFBF5;padding-bottom:8px;margin:0 -2px 10px}.wz-3dv{height:260px;background:#F3EEE6;border-radius:16px;overflow:hidden;position:relative}.wz-3dv>svg{padding:12px;box-sizing:border-box}'+
    '.wz-views{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:8px}.wz-views button{border:1px solid #E2D6C4;background:#fff;border-radius:99px;padding:5px 4px;min-height:36px;font:inherit;font-size:12.5px;cursor:pointer;color:#2E2E2E}.wz-views button.on{background:#2E2E2E;color:#fff;border-color:#2E2E2E}'+
    '.wz-hint{position:absolute;left:10px;bottom:8px;font-size:11px;color:#6A6258;background:rgba(255,251,245,.85);padding:3px 8px;border-radius:99px;pointer-events:none}'+
    '.wz-dims{background:#fff;border:1px solid #E2D6C4;border-radius:12px;padding:6px;margin-top:12px}.wz-dims h5{font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#6A6258;margin:6px 6px 2px}'+
    '.wz-stp{display:flex;align-items:center;gap:8px}.wz-stp input{width:72px!important;text-align:center;min-height:40px!important}.wz-note{background:#EEF3EA;border:1px solid #CBD8C2;border-radius:12px;padding:10px 12px;font-size:13px;color:#33402B;margin:10px 0}'+
    '.wz-steps{display:flex;gap:5px;margin:0 0 12px}.wz-steps button{flex:1;height:6px;border:0;border-radius:3px;background:#E6DED2;padding:0;cursor:pointer}.wz-steps button.on{background:#C26445}'+
    '.wz-h{font-size:19px;font-weight:800;margin:0}.wz-sub{font-size:13px;color:#6A6258;margin:2px 0 12px}.wz-lbl{font-size:13px;font-weight:700;margin:14px 0 8px}'+
    '.wz-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.wz-card{border:1px solid #E2D6C4;background:#fff;border-radius:14px;padding:10px;text-align:center;font:inherit;color:#2E2E2E;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;min-height:64px}'+
    '.wz-card.on{border:2px solid #C26445;background:#FBEDE7}.wz-card[disabled]{opacity:.45;cursor:not-allowed}.wz-card b{font-size:14px}.wz-card small{font-size:12px;color:#6A6258}.wz-pic{display:block;width:100%;height:70px;margin-bottom:4px}'+
    '.wz-row{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #E2D6C4;border-radius:14px;padding:12px;margin-bottom:10px;cursor:pointer}.wz-row>span:first-child{flex:1;display:flex;flex-direction:column}.wz-row small{font-size:12px;color:#6A6258}.wz-pr{font-size:12.5px;color:#6A6258;white-space:nowrap}'+
    '.wz-sw{appearance:none;-webkit-appearance:none;width:48px;height:28px;border-radius:99px;background:#D9D4CB;position:relative;cursor:pointer;flex:none;margin:0;transition:background .15s}.wz-sw:checked{background:#C26445}.wz-sw::after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;transition:left .15s}.wz-sw:checked::after{left:23px}'+
    '.ts-h{margin:16px 0 8px;font-size:13px;font-weight:700;color:#2E2E2E}.ts-h span{font-weight:400;color:#7A7268;font-size:12px}.ts-lb{margin:0 0 6px;font-size:12px;color:#6A6258}.ts-big{margin:2px 0 4px!important}.ts-big button{padding:10px 16px!important;font-size:14px!important}.ts-sm button{padding:5px 10px!important;font-size:12px!important}.ts-add{margin-top:6px!important}.ts-add button{border-style:dashed!important}'+
    '.ts-row{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;margin:8px 0}.ts-n{display:flex;flex-direction:column;font-size:11px;color:#6A6258;gap:3px;position:relative}.ts-n input{width:80px;height:38px;border:1px solid #D9CDBB;border-radius:10px;padding:0 24px 0 10px;font:600 14px Inter,sans-serif;box-sizing:border-box}.ts-n i{position:absolute;right:9px;bottom:11px;font-style:normal;font-size:12px;color:#8A8276}.ts-x{width:32px;height:32px;border-radius:8px;border:1px solid #E2D6C4;background:#fff;cursor:pointer;flex:none}.ts-c{height:38px;padding:0 12px;border-radius:10px;border:1px solid #2E2E2E;background:#fff;font-weight:600;font-size:12.5px;cursor:pointer}'+
    '.ts-blk{border:1px solid #E7DDCF;border-radius:12px;padding:10px 12px;margin:0 0 8px;background:#FFFCF8}.ts-bh{display:flex;align-items:center;justify-content:space-between;margin:0 0 6px}.ts-bh b{font-size:13.5px}.ts-ck{display:flex;gap:6px;align-items:center;font-size:12.5px;color:#4A4640}'+
    '.wz-more{border:1px solid #E2D6C4;border-radius:12px;padding:8px;margin:6px 0;background:#FBF8F3}.wz-more .wz-tabs{margin:4px 0}.wz-x{margin-left:auto;color:#B3261E!important}' +
    '.wz-pm{width:40px;height:40px;border-radius:50%;border:1px solid #C9BBA6;background:#fff;font-size:20px;cursor:pointer}.wz-tabs{display:flex;gap:8px;flex-wrap:wrap}.wz-tabs button,.wz-chip{border:1px solid #E2D6C4;background:#fff;border-radius:99px;padding:8px 14px;min-height:40px;font:inherit;font-size:13px;cursor:pointer}.wz-tabs button.on{border:2px solid #C26445;font-weight:700}'+
    '.wz-sw-col{width:46px;height:46px;border-radius:50%;border:1px solid #BBB;cursor:pointer}.wz-sw-col.on{outline:3px solid #C26445;outline-offset:2px}.wz-elev{background:#fff;border:1px solid #E2D6C4;border-radius:12px;padding:10px;margin-top:10px}'+
    '.wz-nav{display:flex;justify-content:space-between;align-items:center;margin-top:16px;gap:10px}.wz-next{background:#2E2E2E;color:#fff;border:0;border-radius:12px;padding:13px 22px;font:inherit;font-weight:700;min-height:46px;cursor:pointer}.wz-prev{background:none;border:0;font:inherit;color:#4A4640;cursor:pointer;min-height:44px}'+
    '.plan-card{display:flex!important;align-items:center;gap:12px;width:100%;text-align:left;border:1.5px solid #C26445!important;background:#FFF8F2!important;color:#2E2E2E!important;border-radius:14px;padding:12px 14px!important;margin:0 0 10px;font:inherit;cursor:pointer}.plan-card>span:first-child{font-size:26px}.plan-card b{display:block;font-size:14.5px}.plan-card small{display:block;font-size:12px;color:#6A6258;font-weight:500;margin-top:2px}.plan-card i{margin-left:auto;font-style:normal;font-weight:700;color:#C26445;font-size:18px}'+
    '.wz-back{display:block;margin-top:14px;background:none;border:0;color:#9C4127;font:inherit;font-weight:700;cursor:pointer;min-height:44px;padding:0}.wz-sum{margin:0;padding-left:18px;line-height:1.9;font-size:14px}'+
    '.mto-sw{display:flex;gap:8px;flex-wrap:wrap}.mto-dot{display:inline-block;width:16px;height:16px;border-radius:50%;border:1px solid #CFC3B1;vertical-align:-3px;margin-right:6px}.mto-sw button{border:1px solid #CFC3B1;background:#fff;border-radius:999px;padding:8px 14px;min-height:40px;font:inherit;font-size:13px;cursor:pointer}.mto-sw button.on{border:2px solid #C26445;font-weight:600}' +
    '.mto-chk{display:flex;gap:10px;align-items:flex-start;font-size:14px;padding:6px 0}.mto-chk input{margin-top:3px}.mto-chk span.r{margin-left:auto;white-space:nowrap;color:#6A6258}' +
    '.mto-warn{font-size:13px;background:#F3E3D9;color:#7E3A24;border-radius:10px;padding:10px 12px;margin-top:8px}' +
    '.mto-lock{background:#FBF6EE;border:1px solid #E2D6C4;border-radius:16px;padding:18px}.mto-lock .mto-go{margin-top:10px}' +
    '.mto-prof{position:fixed;inset:0;background:rgba(20,18,15,.55);display:none;align-items:center;justify-content:center;z-index:9999;padding:16px}.mto-prof.open{display:flex}' +
    '.mto-pbox{background:#fff;border-radius:18px;padding:22px;max-width:380px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.25)}.mto-pbox h3{margin:0 0 4px;font-size:20px}.mto-pbox p{margin:0 0 12px;color:#6A6258;font-size:14px}' +
    '.mto-pbox label{display:block;font-size:12.5px;font-weight:600;color:#4a453e;margin:8px 0}.mto-pbox input{display:block;width:100%;margin-top:4px;padding:11px 12px;border:1px solid #D9CEBD;border-radius:10px;font:inherit;font-size:15px}.mto-pbox .mto-go{margin-top:12px}' +
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
  function cbDims(c, pl) { var it = cbItem(c, pl.key), f0 = CB_FOOT[pl.key] || [3, 3, it ? it.name : ''], f = [num(pl.w) || f0[0], num(pl.d) || f0[1]]; if (it && it.unit === 'rft') return [pl.rot === 90 ? 0.4 : pl.len, pl.rot === 90 ? pl.len : 0.4]; return pl.rot === 90 ? [f[1], f[0]] : [f[0], f[1]]; }
  var CB_SHORT = { ppart: 'PUF partition', gpart: 'Glass partition', fpart: 'Frosted partition', pdoor: 'Door (PUF)', gdoorp: 'Door (glass)', toilet: 'Toilet pod', wc: 'WC + basin', pantry: 'Pantry' };   // 188: one clear name each (no two "+ Door in a partition")
  // 188: nothing stands in front of a door — the floor a door needs (swing: its width, slide / fold: 2 ft) is kept free
  function cbDoorZones(c, lay) {
    var L = num(lay.L), W = num(lay.W), bay = num(c.bay) || 4, z = [];
    SIDES.forEach(function (side) { var ks = arr(lay.walls && lay.walls[side]), len = cbLen(c, lay, side), i = 0;
      while (i < ks.length) { var k = ks[i], b = cbBay(c, k), sp = cbSpan(c, k), a = i * bay, e = Math.min((i + sp) * bay, len);
        if (b && b.door) { var dp = k === 'slide' || k === 'fold' ? 2 : Math.min(e - a, 3.5);
          z.push(side === 'front' ? [a, W - dp, e, W] : side === 'back' ? [a, 0, e, dp] : side === 'right' ? [L - dp, W - e, L, W - a] : [0, W - e, dp, W - a]); }
        i += sp; } });
    return z;
  }
  function cbFreeOfDoors(c, lay, pl) {
    if (!(pl.key in CB_FOOT) || pl.key === 'pdoor' || pl.key === 'gdoorp') return;
    var ROOM = { toilet: 1, wc: 1, pantry: 1 }, PART = { ppart: 1, gpart: 1, fpart: 1 }, isRoom = !!ROOM[pl.key];
    var L = num(lay.L), W = num(lay.W), d = cbDims(c, pl), zs = isRoom ? cbDoorZones(c, lay) : [];
    // 192: rooms don't sit on each other or on a partition; a partition doesn't cut through a room
    arr(lay.places).forEach(function (o) { if (o === pl || !(isRoom ? ROOM[o.key] || PART[o.key] : ROOM[o.key])) return; var e = cbDims(c, o); zs.push([o.x, o.y, o.x + e[0], o.y + e[1]]); });
    var hit = function (x, y) { return zs.some(function (r) { return x < r[2] - 0.01 && x + d[0] > r[0] + 0.01 && y < r[3] - 0.01 && y + d[1] > r[1] + 0.01; }); };
    if (!hit(pl.x, pl.y)) return;
    var best = null; zs.forEach(function (r) { [[r[0] - d[0], pl.y], [r[2], pl.y], [pl.x, r[1] - d[1]], [pl.x, r[3]]].forEach(function (q) {
      var x = Math.round(Math.max(0, Math.min(q[0], L - d[0])) * 2) / 2, y = Math.round(Math.max(0, Math.min(q[1], W - d[1])) * 2) / 2;
      if (hit(x, y)) return; var m = Math.abs(x - pl.x) + Math.abs(y - pl.y); if (!best || m < best[2]) best = [x, y, m]; }); });
    if (!best) for (var gx = 0; gx <= L - d[0]; gx += 0.5) for (var gy = 0; gy <= W - d[1]; gy += 0.5) { if (hit(gx, gy)) continue; var m2 = Math.abs(gx - pl.x) + Math.abs(gy - pl.y); if (!best || m2 < best[2]) best = [gx, gy, m2]; }   // anywhere free
    if (best) { pl.x = best[0]; pl.y = best[1]; }
  }
  function cbSync(c, lay) {   // quantities follow what is placed
    var items = {}, k; for (k in (lay.items || {})) items[k] = lay.items[k];
    arr(c.items).forEach(function (it) { if (!cbPlaceable(it)) return; var v = 0; arr(lay.places).forEach(function (p) { if (p.key === it.key) v += it.unit === 'rft' ? (num(p.len) || 0) : 1; }); if (v || it.key in items) items[it.key] = v; });
    lay.items = items;
  }
  function cbClamp(c, lay, pl) { var d = cbDims(c, pl), L = num(lay.L), W = num(lay.W); if (pl.len != null) pl.len = Math.max(1, Math.min(pl.len, pl.rot === 90 ? W : L)); d = cbDims(c, pl);
    pl.x = Math.round(Math.max(0, Math.min(pl.x, L - d[0])) * 2) / 2; pl.y = Math.round(Math.max(0, Math.min(pl.y, W - d[1])) * 2) / 2; cbFreeOfDoors(c, lay, pl); }
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
          '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 4) + '" font-size="11" text-anchor="middle" fill="#2E2E2E" pointer-events="none">' + esc(CB_SHORT[pl.key] || (CB_FOOT[pl.key] || [0, 0, ''])[2]) + '</text>';
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
    var it = lay.items || {}, more = [], mainSeen = false;   // 188: doors on other walls too
    SIDES.forEach(function (sd) { lay.walls[sd].forEach(function (k) { var b = cbBay(c, k); if (!b || !b.door) return; var t = k === 'fold' ? 'fold' : k === 'slide' ? 'slide' : k === 'double' || k === 'pdouble' ? 'double' : 'single';
      if (!mainSeen && sd === side && t === door) { mainSeen = true; return; } more.push({ door: t, side: sd }); }); });
    return { more: more, glass: g, door: door, side: side, windows: win, rooms: (num(it.ppart) || 0) + (num(it.gpart) || 0) + (num(it.fpart) || 0) > 0, toilet: (num(it.toilet) || 0) > 0, wc: (num(it.wc) || 0) > 0, pantry: (num(it.pantry) || 0) > 0, exhaust: (num(it.exhaust) || 0) > 0 };
  }
  function wzBuild(c, lay, w) {   // walls from the simple choices: glass level, one main door, windows on solid walls, a vent by the toilet
    var gw = wzGlassWalls(w.glass), solid = cbBay(c, 'puf') ? 'puf' : cbFill(c), glass = cbBay(c, 'glass') ? 'glass' : solid;
    SIDES.forEach(function (sd) { var n = cbN(c, lay, sd), ks = []; for (var i = 0; i < n; i++) ks.push(gw[sd] ? glass : solid); lay.walls[sd] = ks; });
    var dk = wzDoorKey(c, w.door, gw[w.side]), n0 = cbN(c, lay, w.side), sp = cbSpan(c, dk);
    if (sp > n0) { dk = wzDoorKey(c, 'single', gw[w.side]); sp = 1; }
    cbSet(c, lay, w.side, Math.max(0, Math.floor((n0 - sp) / 2)), dk);
    arr(w.more).forEach(function (md) {   // 188: more doors, each on its wall (middle of the free solid / glass bays)
      var n1 = cbN(c, lay, md.side), k1 = wzDoorKey(c, md.door, gw[md.side]), s1 = cbSpan(c, k1), ks1 = lay.walls[md.side];
      if (s1 > n1) { k1 = wzDoorKey(c, 'single', gw[md.side]); s1 = 1; }
      var free = []; for (var i1 = 0; i1 + s1 <= n1; i1++) { var ok = true; for (var j1 = 0; j1 < s1; j1++) { var b1 = cbBay(c, ks1[i1 + j1]); if (!b1 || b1.door || ks1[i1 + j1] === '-') ok = false; } if (ok) free.push(i1); }
      if (free.length) cbSet(c, lay, md.side, free[Math.floor((free.length - 1) / 2)], k1);
    });
    var left = w.windows, order = ['front', 'right', 'left', 'back'], placed = true;
    if (w.toilet || w.wc) { var lk = lay.walls.left, vi = lk.indexOf(solid); if (vi < 0) { lk = lay.walls.back; vi = lk.indexOf(solid); if (vi >= 0) lay.walls.back[vi] = 'vent'; } else lay.walls.left[vi] = 'vent'; }
    while (left > 0 && placed) { placed = false; for (var oi = 0; oi < order.length && left > 0; oi++) { var ks2 = lay.walls[order[oi]], free = []; ks2.forEach(function (k, i) { if (k === solid) free.push(i); }); if (free.length) { ks2[free[Math.floor(free.length / 2)]] = 'window'; left--; placed = true; } } }
    var it = {}, k0; for (k0 in (lay.items || {})) it[k0] = lay.items[k0];
    // 188: what is already placed stays where it is (and its size); a switch only adds one when there is none, or removes them all
    var has = function (k) { return lay.places.some(function (p) { return p.key === k; }); }, RP = ['ppart', 'gpart', 'fpart', 'pdoor', 'gdoorp'];
    lay.places = arr(lay.places).filter(function (p) { return !((p.key === 'toilet' && !w.toilet) || (p.key === 'wc' && !w.wc) || (p.key === 'pantry' && !w.pantry) || (RP.indexOf(p.key) >= 0 && !w.rooms)); });
    var W = num(lay.W), L = num(lay.L), x = lay.places.filter(function (p) { return p.key === 'toilet' || p.key === 'wc'; }).reduce(function (m, p) { return Math.max(m, p.x + cbDims(c, p)[0]); }, 0);
    if (w.toilet && cbItem(c, 'toilet') && !has('toilet')) { lay.places.push({ key: 'toilet', x: x, y: 0, rot: 0, len: null }); x += 4; }
    if (w.wc && cbItem(c, 'wc') && !has('wc')) { lay.places.push({ key: 'wc', x: x, y: 0, rot: 0, len: null }); x += 4; }
    if (w.pantry && cbItem(c, 'pantry') && !has('pantry')) lay.places.push({ key: 'pantry', x: Math.max(0, L - 6), y: 0, rot: 0, len: null });
    if (w.rooms && !RP.some(has)) { var pk = w.glass === 'most' || w.glass === 'all' ? 'gpart' : 'ppart', px = Math.max(x + 2, Math.round(L / 3)); lay.places.push({ key: pk, x: px, y: 0, rot: 90, len: W }); lay.places.push({ key: pk === 'gpart' ? 'gdoorp' : 'pdoor', x: Math.max(0, px - 0.1), y: Math.max(0, W - 4), rot: 90, len: null }); }
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
  var V3 = [['3d', '3D'], ['360', '360°'], ['inside', 'Inside'], ['top', 'Top'], ['front', 'Front'], ['right', 'Right'], ['back', 'Back'], ['left', 'Left']];
  function wzAuto(st, w, lay) { var it = lay.items || {}; return st === 0 ? 'top' : st === 1 ? '3d' : st === 2 ? (w.side || 'front') : st === 3 ? (C3.st === 2 ? 'cut' : 'top') : st === 4 ? '3d' : st === 5 ? ((num(it.ceiling) || 0) > 0 ? 'inside' : '3d') : '360'; }
  var C3 = { st: 0 };   // 0 not loaded, 1 loading, 2 ready, -1 not possible (no WebGL)
  function mount3d() {
    var el = document.getElementById('cb3d'); if (!el || !S || !S.wz) return;
    var hd = S.pdp && document.querySelector('header'), box = el.parentNode; if (box && box.classList.contains('wz-3d')) box.style.top = (hd ? Math.max(0, Math.round(hd.getBoundingClientRect().height)) : 52) + 'px';   // stay under the store header
    if (C3.st === 2) { try { if (!C3.ev) { C3.ev = 1; window.Cabin3D.onEvent(on3d); }
      window.Cabin3D.show(el, PRODS[S.id].cz.cabin, S.o.layout, S.view3, { sel: S.sel3 ? { bay: S.sel3 } : S.psel != null ? { pl: S.psel } : null, furn: S.furn || 'none', night: !!S.night, site: S.studio ? tsOpts() : null }); } catch (er) { C3.st = -1; if (window.console) console.warn(er); } return; }
    if (C3.st !== 0) return;
    try { var cv = document.createElement('canvas'); if (!(cv.getContext('webgl2') || cv.getContext('webgl'))) { C3.st = -1; return; } } catch (er) { C3.st = -1; return; }
    C3.st = 1;
    var ready = function () { C3.st = window.Cabin3D ? 2 : -1; if (S && S.pdp && document.getElementById('cbStage')) cbStage(); mount3d(); };   // 3D ready: show its views, furniture and edit bar
    try { new Function('u', 'return import(u)')('/cabin3d.js?v=14').then(ready, function () { C3.st = -1; }); }   // dynamic import: not touched by the page's <head> changes
    catch (er) { var sc = document.createElement('script'); sc.type = 'module'; sc.src = '/cabin3d.js?v=14'; sc.onload = ready; sc.onerror = function () { C3.st = -1; }; document.body.appendChild(sc); }
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
  // ---- 2026-11-18 step 1 "Where": lawn or a Delhi builder-floor terrace (looks only — never changes the price or the order).
  // A terrace: plot size, corner plot (road left / right), parapet, higher neighbour walls, what is already on the roof
  // (mumty, lift room, shafts, rooms — each on a wall or free, sized, dragged in 3D, never on top of each other), and the
  // cabin placed on it (drag it, turn its front). Plot coords: x from the left, z from the back (pd = front / road).
  var TS_PLOTS = [['100', 20, 45], ['125', 25, 45], ['200', 30, 60], ['300', 40, 67], ['500', 50, 90]];
  var TS_KIND = { mumty: ['Mumty (stair room)', 'Mumty'], lift: ['Lift room', 'Lift room'], shaft: ['Shaft', 'Shaft'], room: ['Room already built', 'Room'], ac: ['AC outdoor unit', 'AC unit'] };
  var TS_CUTS = [['bl', 'Back-left'], ['br', 'Back-right'], ['fl', 'Front-left'], ['fr', 'Front-right']];   // 193: corners cut (front = road side)
  var TS_WALLS = [['left', 'Left wall'], ['right', 'Right wall'], ['back', 'Back wall'], ['front', 'Front wall'], ['free', 'Free']];
  var TS_ROT = [[0, 'Road side'], [90, 'Right'], [180, 'Back'], [270, 'Left']];
  function tsNew(lay) { var t = { kind: 'terrace', plot: '200', pw: 30, pd: 60, corner: '', par: 3, tanks: true, rot: 0, high: {}, blocks: [] }; tsPlot(t, 30, 60, lay, true); return t; }
  function tsDims(t, lay) { return (num(t.rot) || 0) % 180 ? [num(lay.W), num(lay.L)] : [num(lay.L), num(lay.W)]; }
  function tsWall(t, b, side) {   // put a block against a wall (keeps its place along that wall)
    var P = 0.75; b.side = side;
    if (side === 'left') b.x = P; else if (side === 'right') b.x = t.pw - P - b.w; else if (side === 'back') b.z = P; else if (side === 'front') b.z = t.pd - P - b.d;
    b.x = Math.max(P, Math.min(t.pw - P - b.w, b.x)); b.z = Math.max(P, Math.min(t.pd - P - b.d, b.z));
  }
  function tsCut(t, r) {   // = cabin3d.js cutHit: does rect r reach into a cut corner (with the parapet)?
    var C = t && t.cuts, P = 0.75; if (!C) return false;
    return ['bl', 'br', 'fl', 'fr'].some(function (k) { var c = C[k]; if (!c || (c.type !== 'notch' && c.type !== 'slant')) return false; var a = num(c.a) || 0, b = num(c.b) || 0; if (!(a > 0 && b > 0)) return false;
      var x0 = k[1] === 'r' ? t.pw - (r.x + r.w) : r.x, z0 = k[0] === 'f' ? t.pd - (r.z + r.d) : r.z;
      return c.type === 'notch' ? x0 < a + P - 0.01 && z0 < b + P - 0.01 : x0 / a + z0 / b < 1 + P * Math.hypot(1 / a, 1 / b) - 0.001; });
  }
  function tsHit(a, b) { return a.x < b.x + b.w - 0.01 && a.x + a.w > b.x + 0.01 && a.z < b.z + b.d - 0.01 && a.z + a.d > b.z + 0.01; }
  function tsFree(t, i) {   // block i sits on another one: slide it along its wall (or anywhere when free) to the nearest clear spot
    var b = t.blocks[i], P = 0.75, others = t.blocks.filter(function (o, j) { return j !== i; });
    if (!others.some(function (o) { return tsHit(b, o); }) && !tsCut(t, b)) return true;
    var alongZ = b.side === 'left' || b.side === 'right', alongX = b.side === 'back' || b.side === 'front', best = null;
    for (var dd = 0.5; dd < Math.max(t.pw, t.pd) && !best; dd += 0.5) [-dd, dd].forEach(function (s0) { if (best) return;
      var tries = alongZ ? [[b.x, b.z + s0]] : alongX ? [[b.x + s0, b.z]] : [[b.x + s0, b.z], [b.x, b.z + s0]];
      tries.forEach(function (q) { if (best || q[0] < P || q[1] < P || q[0] > t.pw - P - b.w || q[1] > t.pd - P - b.d) return; var c2 = { x: q[0], z: q[1], w: b.w, d: b.d }; if (!others.some(function (o) { return tsHit(c2, o); }) && !tsCut(t, c2)) best = q; }); });
    if (!best) return false; b.x = best[0]; b.z = best[1]; return true;
  }
  function tsAdd(t, type, side, w, d, at) {   // a new block on a wall, at a clear spot
    var b = { type: type, side: side, w: w, d: d, x: 0, z: 0 }; b.x = at && at[0] != null ? at[0] : (t.pw - w) / 2; b.z = at && at[1] != null ? at[1] : (t.pd - d) / 2;
    tsWall(t, b, side); t.blocks.push(b); if (!tsFree(t, t.blocks.length - 1)) { t.blocks.pop(); return false; } return true;
  }
  function tsPlot(t, pw, pd, lay, fresh) {   // a new plot size: everything keeps its wall and its place in proportion
    var opw = t.pw, opd = t.pd; t.pw = Math.max(15, Math.min(120, Math.round(pw))); t.pd = Math.max(20, Math.min(150, Math.round(pd)));
    if (fresh) { var sm = t.pw <= 25; t.blocks = []; tsAdd(t, 'mumty', 'left', sm ? 8 : 10, sm ? 16 : 18); var m = t.blocks[0]; tsAdd(t, 'lift', 'left', 6, 6, [0, m.z - 6]); tsAdd(t, 'shaft', 'right', 3, 4); }
    else t.blocks.forEach(function (b, i) { b.w = Math.min(b.w, t.pw - 3); b.d = Math.min(b.d, t.pd - 3); b.x = Math.round((b.x + b.w / 2) / opw * t.pw - b.w / 2); b.z = Math.round((b.z + b.d / 2) / opd * t.pd - b.d / 2); tsWall(t, b, b.side); tsFree(t, i); });
    tsCentre(t, lay);
  }
  function tsFoot(t, lay) {   // the cabin + its pergola projection, on the plot (its front turned by t.rot)
    var pj = lay.proj ? arr(lay.proj.sides) : [], dep = 1.5, SD = ['front', 'right', 'back', 'left'], k = Math.round((num(t.rot) || 0) / 90) % 4, e = { front: 0, right: 0, back: 0, left: 0 };
    pj.forEach(function (sd) { var j = SD.indexOf(sd); if (j >= 0) e[SD[(j + k) % 4]] = dep; });
    var d = tsDims(t, lay); return { L: d[0], W: d[1], e: { l: e.left, r: e.right, b: e.back, f: e.front } };
  }
  function tsWord() { return S && isPg(S.id) ? 'pergola' : 'cabin'; }
  function tsLay() { return S && isPg(S.id) ? pgLay() : S.o.layout; }   // 193f: the pergola uses the same terrace (its length × width, no projections)
  function tsClash(t, lay) {   // why it doesn't fit there, or ''
    var F = tsFoot(t, lay), r = { x: t.cx - F.e.l, z: t.cz - F.e.b, w: F.L + F.e.l + F.e.r, d: F.W + F.e.b + F.e.f };
    if (r.w > t.pw - 1.5 || r.d > t.pd - 1.5) return 'The ' + tsWord() + ' is bigger than this terrace — make it smaller';
    if (r.x < 0.75 || r.z < 0.75 || r.x + r.w > t.pw - 0.75 || r.z + r.d > t.pd - 0.75) return 'The ' + tsWord() + ' goes over the parapet — drag it in';
    if (tsCut(t, r)) return 'The ' + tsWord() + ' reaches into a cut corner — drag it in';
    var b = arr(t.blocks).filter(function (o) { return tsHit(r, o); })[0];
    if (!b && S && S.pl && S.plFor === S.id && t === S.site) { var ai = arRects().filter(function (o) { return tsHit(r, o); })[0]; if (ai) return 'The ' + tsWord() + ' sits on the ' + String(ai.label).toLowerCase() + ' — drag one of them'; }
    return b ? 'The ' + tsWord() + ' sits on the ' + TS_KIND[b.type][1].toLowerCase() + ' — drag one of them' : '';
  }
  function tsCentre(t, lay) {   // the best free spot: near the front and the middle first
    var F = tsFoot(t, lay), x0 = Math.max(0.75 + F.e.l, Math.round((t.pw - F.L) / 2 * 2) / 2), z0 = Math.max(0.75 + F.e.b, t.pd - 0.75 - F.W - F.e.f - 3), best = null;
    for (var z = z0; z >= 0.75 + F.e.b && !best; z -= 0.5) for (var dx = 0; dx <= t.pw && !best; dx += 0.5) [x0 - dx, x0 + dx].forEach(function (x) { if (best) return; t.cx = x; t.cz = z; if (!tsClash(t, lay)) best = [x, z]; });
    t.cx = best ? best[0] : x0; t.cz = best ? best[1] : z0;
  }
  function tsOpts() { var t = S.site; if (!t || t.kind !== 'terrace') return null; keepSite(); if (!AR.st) arLoad(); var o2 = JSON.parse(JSON.stringify(t)); o2.clash = !!tsClash(t, tsLay()); o2.place = isPg(S.id) ? !!S.pgW : !!S.siteEd; o2.whole = !!S.whole; var ar = arAround(); if (ar) { o2.around = ar.list; o2.asel = ar.sel; } return o2; }
  function terraceUI(lay, noPlace) {
    var t = S.site || { kind: 'ground' }, on = t.kind === 'terrace', h = '';
    var btn = function (attr, isOn, txt) { return '<button type="button" ' + attr + ' class="' + (isOn ? 'on' : '') + '" aria-pressed="' + !!isOn + '">' + txt + '</button>'; };
    var nIn = function (key, val, lbl, min, max) { return '<label class="ts-n"><span>' + lbl + '</span><input type="number" inputmode="decimal" min="' + min + '" max="' + max + '" step="0.5" data-tsin="' + key + '" value="' + val + '"><i>ft</i></label>'; };
    var sec = function (title, sub) { return '<p class="ts-h">' + title + (sub ? ' <span>' + sub + '</span>' : '') + '</p>'; };
    h += '<div class="cbs-t"><h4 class="wz-h">Where will it go?</h4><p class="wz-sub">' + (on ? 'Set up your terrace — close, not exact. Your ' + tsWord() + ' comes on it next' + (tsWord() === 'cabin' ? '; move it any time with ▦ Whole terrace' : ' — then drag it where you want') + '. Doesn\'t change the price.' : 'A lawn or a terrace? We\'ll show the cabin there.') + '</p></div><div class="cbs-o">';
    h += '<div class="wz-tabs ts-big">' + btn('data-ts="kind:ground"', !on, '🌳 Lawn / garden') + btn('data-ts="kind:terrace"', on, '🏙 Terrace') + '</div>';
    if (on) {
      h += sec('Plot') + '<div class="wz-tabs">' + TS_PLOTS.map(function (p) { return btn('data-ts="plot:' + p[0] + '"', t.plot === p[0], p[0] + ' gaj'); }).join('') + '</div>';
      h += '<div class="ts-row">' + nIn('pw', t.pw, 'Width', 15, 120) + nIn('pd', t.pd, 'Depth', 20, 150) + '</div>';
      h += sec('Corner plot?', 'road on which side') + '<div class="wz-tabs">' + btn('data-ts="corner:"', !t.corner, 'No') + btn('data-ts="corner:left"', t.corner === 'left', 'Road on the left') + btn('data-ts="corner:right"', t.corner === 'right', 'Road on the right') + '</div>';
      h += sec('Parapet') + '<div class="wz-tabs">' + btn('data-ts="par:3"', t.par === 3, '3 ft') + btn('data-ts="par:4"', t.par === 4, '4 ft') + '</div>';
      h += sec('Neighbour\'s wall higher than yours?') + '<div class="wz-tabs">' + [['left', 'Left'], ['right', 'Right'], ['back', 'Back']].filter(function (s0) { return s0[0] !== t.corner; }).map(function (s0) { var hi = t.high && t.high[s0[0]]; return btn('data-ts="high:' + s0[0] + '"', hi, (hi ? '✓ ' : '') + s0[1]); }).join('') + '</div>';
      var CU = t.cuts || {};
      h += sec('Corners cut?', 'front = road side') + TS_CUTS.map(function (ck) { var c = CU[ck[0]] || {}, cOn = c.type === 'notch' || c.type === 'slant';
        return '<div class="ts-blk"><div class="ts-bh"><b>' + ck[1] + '</b></div><div class="wz-tabs ts-sm">' + btn('data-ts="cut:' + ck[0] + ':"', !cOn, 'No cut') + btn('data-ts="cut:' + ck[0] + ':notch"', c.type === 'notch', '⌐ Straight') + btn('data-ts="cut:' + ck[0] + ':slant"', c.type === 'slant', '◸ Slant') + '</div>' +
          (cOn ? '<div class="ts-row">' + nIn('ca:' + ck[0], c.a, 'Across', 1, t.pw - 4) + nIn('cb:' + ck[0], c.b, 'Deep', 1, t.pd - 4) + '</div>' : '') + '</div>'; }).join('');
      h += sec('Already on the roof', 'drag them on the 3D too') + arr(t.blocks).map(function (b, i) {
        return '<div class="ts-blk"><div class="ts-bh"><b>' + esc(TS_KIND[b.type][0]) + '</b><button type="button" class="ts-x" data-ts="del:' + i + '" aria-label="Remove">✕</button></div>' +
          '<div class="wz-tabs ts-sm">' + TS_WALLS.map(function (wl) { return btn('data-ts="wall:' + i + ':' + wl[0] + '"', b.side === wl[0], wl[1]); }).join('') + '</div>' +
          '<div class="ts-row">' + nIn('w:' + i, b.w, 'Width', 1, 40) + nIn('d:' + i, b.d, 'Length', 1, 40) + nIn('l:' + i, Math.round(b.x * 2) / 2, 'From left', 0.75, t.pw) + nIn('f:' + i, Math.round((t.pd - b.z - b.d) * 2) / 2, 'From front', 0.75, t.pd) + '</div>' +
          (b.type === 'mumty' ? '<label class="ts-ck"><input type="checkbox" data-ts="tanks"' + (t.tanks !== false ? ' checked' : '') + '> Water tanks on top</label>' : '') + '</div>';
      }).join('');
      h += '<div class="wz-tabs ts-add">' + ['mumty', 'lift', 'shaft', 'room', 'ac'].map(function (k) { return '<button type="button" data-ts="add:' + k + '">+ ' + TS_KIND[k][1] + '</button>'; }).join('') + '</div>';
      if (S.tsMsg) h += '<div class="wz-note" style="background:#FFF4E5;border-color:#F1D3A8">' + esc(S.tsMsg) + '</div>';
      if (!noPlace) h += placeBox(lay);
      return h + '</div>';
    }
    return h + '</div>';
  }
  function placeBox(lay) {   // 193f: where the cabin / pergola stands — shown once the terrace is set up
    var t = S.site, h = '', W = tsWord(); if (!t || t.kind !== 'terrace') return '';
    var btn = function (attr, isOn, txt) { return '<button type="button" ' + attr + ' class="' + (isOn ? 'on' : '') + '" aria-pressed="' + !!isOn + '">' + txt + '</button>'; };
    var nIn = function (key, val, lbl, min, max) { return '<label class="ts-n"><span>' + lbl + '</span><input type="number" inputmode="decimal" min="' + min + '" max="' + max + '" step="0.5" data-tsin="' + key + '" value="' + val + '"><i>ft</i></label>'; };
    var sec = function (title, sub) { return '<p class="ts-h">' + title + (sub ? ' <span>' + sub + '</span>' : '') + '</p>'; };
    if (true) {
      h += sec('Place the ' + W, 'drag it on the 3D') + '<p class="ts-lb">Its front faces</p><div class="wz-tabs">' + TS_ROT.map(function (r) { return btn('data-ts="rot:' + r[0] + '"', (num(t.rot) || 0) === r[0], r[1]); }).join('') + '</div>';
      h += '<div class="ts-row">' + nIn('cx', t.cx, 'From left', 0, t.pw) + nIn('cf', Math.round((t.pd - t.cz - tsDims(t, lay)[1]) * 2) / 2, 'From front', 0, t.pd) + '<button type="button" class="ts-c" data-ts="centre">Find a free spot</button></div>';
      h += '<div class="wz-tabs ts-sm">' + btn('data-ts="view:3d"', S.view3 !== 'top', 'See in 3D') + btn('data-ts="view:top"', S.view3 === 'top', 'See from the top') + '</div>';
      var cl = tsClash(t, lay); h += cl ? '<div class="wz-note" style="background:#FDECEA;border-color:#F3B8B0;color:#9B2C22">⚠ ' + esc(cl) + '</div>' : '<div class="wz-note">✓ It fits here.</div>';
    }
    return h;
  }
  function tsClick(t) {
    var k = t.getAttribute('data-ts'); if (k == null) return false; var lay = tsLay(), x = S.site, a = k.split(':'); S.tsMsg = '';
    if (a[0] === 'open') { S.siteEd = true; S.sel3 = null; S.psel = null; return true; }
    if (a[0] === 'kind') { if (a[1] === 'terrace') { S.site = x && x.pw ? x : (sharedSite() || tsNew(lay)); S.site.kind = 'terrace'; if (S.site.cx == null) tsCentre(S.site, lay); } else if (x) x.kind = 'ground'; S.v3 = S.view3 = '3d'; return true; }
    if (a[0] === 'view') { S.v3 = S.view3 = a[1]; return true; }
    if (!x) return true;
    var b = a[1] != null && /^\d+$/.test(a[1]) ? x.blocks[+a[1]] : null, keep = b ? { x: b.x, z: b.z, side: b.side } : null;
    if (a[0] === 'plot') { var p = TS_PLOTS.filter(function (z) { return z[0] === a[1]; })[0]; x.plot = a[1]; tsPlot(x, p[1], p[2], lay); }
    else if (a[0] === 'corner') { x.corner = a[1] || ''; if (x.high && x.corner) x.high[x.corner] = false; }
    else if (a[0] === 'par') x.par = +a[1];
    else if (a[0] === 'cut') { x.cuts = x.cuts || {}; if (!a[2]) delete x.cuts[a[1]]; else x.cuts[a[1]] = Object.assign({ a: Math.min(8, Math.round(x.pw / 4)), b: Math.min(8, Math.round(x.pd / 6)) }, x.cuts[a[1]] || {}, { type: a[2] }); x.blocks.forEach(function (bb, i) { tsFree(x, i); }); if (tsClash(x, lay)) tsCentre(x, lay); }
    else if (a[0] === 'high') { x.high = x.high || {}; x.high[a[1]] = !x.high[a[1]]; }
    else if (a[0] === 'tanks') x.tanks = x.tanks === false;
    else if (a[0] === 'del' && b) x.blocks.splice(+a[1], 1);
    else if (a[0] === 'wall' && b) { tsWall(x, b, a[2]); if (!tsFree(x, +a[1])) { b.x = keep.x; b.z = keep.z; b.side = keep.side; S.tsMsg = 'No free room on that wall'; } }
    else if (a[0] === 'add') { var D = { mumty: [10, 18], lift: [6, 6], shaft: [3, 4], room: [10, 12], ac: [3, 1.2] }[a[1]]; if (!tsAdd(x, a[1], a[1] === 'room' ? 'back' : 'right', D[0], D[1])) S.tsMsg = 'No free room for it — make the others smaller or move them'; }
    else if (a[0] === 'rot') { var d0 = tsDims(x, lay), mx = x.cx + d0[0] / 2, mz = x.cz + d0[1] / 2; x.rot = +a[1]; var d1 = tsDims(x, lay); x.cx = Math.round((mx - d1[0] / 2) * 2) / 2; x.cz = Math.round((mz - d1[1] / 2) * 2) / 2; }
    else if (a[0] === 'centre') tsCentre(x, lay);
    return true;
  }
  function tsInput(el) {   // the exact sizes typed in
    var k = el.getAttribute('data-tsin'), x = S.site, lay = tsLay(), v = parseFloat(el.value); if (!k || !x || !(v >= 0)) return false; var a = k.split(':'), b = a[1] != null ? x.blocks[+a[1]] : null; S.tsMsg = '';
    if (a[0] === 'pw' || a[0] === 'pd') { x.plot = ''; tsPlot(x, a[0] === 'pw' ? v : x.pw, a[0] === 'pd' ? v : x.pd, lay); return true; }
    if (a[0] === 'ca' || a[0] === 'cb') { var cu = x.cuts && x.cuts[a[1]]; if (!cu) return false; cu[a[0] === 'ca' ? 'a' : 'b'] = Math.max(1, Math.min(a[0] === 'ca' ? x.pw - 4 : x.pd - 4, Math.round(v * 2) / 2)); x.blocks.forEach(function (bb, i) { tsFree(x, i); }); if (tsClash(x, lay)) tsCentre(x, lay); return true; }
    if (a[0] === 'cx') { x.cx = Math.max(0, Math.min(x.pw, v)); return true; }
    if (a[0] === 'cf') { x.cz = Math.max(0, x.pd - v - tsDims(x, lay)[1]); return true; }
    if (!b) return false; var keep = JSON.stringify(b);
    if (a[0] === 'w') b.w = Math.max(1, Math.min(x.pw - 1.5, v)); else if (a[0] === 'd') b.d = Math.max(1, Math.min(x.pd - 1.5, v));
    else if (a[0] === 'l') { b.x = v; b.side = 'free'; } else if (a[0] === 'f') { b.z = x.pd - v - b.d; b.side = 'free'; }
    tsWall(x, b, b.side); if (!tsFree(x, +a[1])) { var o = JSON.parse(keep); Object.keys(o).forEach(function (kk) { b[kk] = o[kk]; }); S.tsMsg = 'That would sit on top of another one'; }
    return true;
  }
  function tsDrop(ev) {   // a block dragged in 3D: snaps to a wall within 1 ft; never on another block
    var x = S.site, b = x && arr(x.blocks)[ev.i]; if (!b) return; var keep = { x: b.x, z: b.z, side: b.side }, P = 0.75; b.x = ev.x; b.z = ev.z;
    b.side = b.x <= P + 1 ? 'left' : b.x + b.w >= x.pw - P - 1 ? 'right' : b.z <= P + 1 ? 'back' : b.z + b.d >= x.pd - P - 1 ? 'front' : 'free'; tsWall(x, b, b.side);
    S.tsMsg = ''; if (x.blocks.some(function (o, j) { return j !== ev.i && tsHit(b, o); })) { b.x = keep.x; b.z = keep.z; b.side = keep.side; S.tsMsg = 'It can\'t go on top of another one — try a clear spot'; }
    else if (tsCut(x, b)) { b.x = keep.x; b.z = keep.z; b.side = keep.side; S.tsMsg = 'That corner is cut — it can\'t go there'; }
  }
  function cabinUI(m, o) {
    var c = m.cabin, lay = o.layout, w = S.wz, q0 = cabin(c, lay), st = w.step, TITLES = ['Glass & roof', 'How big?', 'Doors', 'Rooms inside', 'Outside', 'The look', 'Your cabin'];
    var SUBS = ['How much glass on the walls, and the roof — these set the look of your cabin', 'Pick a size — or set it exactly with − / +', 'Pick the door, the wall it goes on and its height', 'Switch on what you need — move things on the plan if you like', 'Pergola projection over the walls, and a rain gutter', 'Roof, frame colour and a few upgrades', 'Check it, then order — final drawings come to you for approval first'];
    var v3 = S.view3 = S.studio ? (S.v3 || (st === 3 && !w.adv ? 'cut' : '3d')) : S.v3 || (w.adv ? (w.aside || 'front') : wzAuto(st, w, lay));
    var h = S.pdp ? '' : '<div class="wz-3d"><div class="wz-3dv" id="cb3d">' + (C3.st === 2 ? '' : wzIso(c, lay)) + '</div>' + (C3.st === -1 ? '' : '<div class="wz-views" role="tablist" aria-label="Views">' + V3.map(function (v) { return '<button type="button" role="tab" data-wzv="' + v[0] + '" class="' + (v[0] === v3 ? 'on' : '') + '" aria-selected="' + (v[0] === v3) + '">' + v[1] + '</button>'; }).join('') + '</div>') + '</div>';
    var SHORT = ['Glass & roof', 'Size', 'Doors', 'Rooms', 'Outside', 'Look', 'Done'];
    var off = S.studio ? 1 : 0, sE = S.studio && S.siteEd;   // studio: step 1 is "Where" (lawn / terrace)
    var chips = '<div class="wz-stc" role="tablist" aria-label="Steps">' + (off ? '<button type="button" role="tab" data-ts="open" class="' + (sE ? 'on' : 'dn') + '" aria-selected="' + sE + '">' + (sE ? '' : '✓ ') + '1 · Where</button>' : '') + SHORT.map(function (t, i) { var mx = Math.max(w.max || 0, st), cur = i === st && !w.adv && !sE; return '<button type="button" role="tab" data-wzgo="' + i + '" class="' + (cur ? 'on' : i <= mx && !(sE && !S.siteDone) ? 'dn' : '') + '" aria-selected="' + cur + '"' + (i > mx || (sE && !S.siteDone && i > 0) ? ' disabled' : '') + '>' + ((i < st || (i <= mx && i !== st)) && !(sE && !S.siteDone) ? '✓ ' : '') + (i + 1 + off) + ' · ' + t + '</button>'; }).join('') + '</div>';
    if (S.studio) { var hc = document.getElementById('cbsSteps'); if (hc) { hc.innerHTML = chips; var on = hc.querySelector('.on'), sc = hc.querySelector('.wz-stc'); [hc, sc].forEach(function (b) { if (b && on && b.scrollWidth > b.clientWidth) b.scrollLeft = Math.max(0, on.offsetLeft - b.clientWidth / 2 + on.offsetWidth / 2); }); } }
    if (S.studio && S.siteEd) return terraceUI(lay, true);   // step 1: where it goes (the terrace only — 193e)
    if (S.studio && S.whole && S.site && S.site.kind === 'terrace') h += '<div class="cbs-t ts-place">' + placeBox(lay) + arUI() + '</div>';   // 193f: ▦ Whole terrace = where the cabin stands
    h += S.studio ? '' : S.pdp ? chips
      : '<div class="wz-steps">' + TITLES.map(function (t, i) { return '<button type="button" data-wzgo="' + i + '" class="' + (i <= st ? 'on' : '') + '" aria-label="Step ' + (i + 1) + ': ' + t + '"></button>'; }).join('') + '</div>';
    h += (S.studio ? '<div class="cbs-t">' : '') +
      '<h4 class="wz-h">' + (w.adv ? 'Edit each wall' : TITLES[st]) + '</h4><p class="wz-sub">' + (w.adv ? 'Pick a wall, tap a panel, choose what it should be' : SUBS[st]) + '</p>' + (S.studio ? '</div><div class="cbs-o">' : '');
    var mini = function (lay2) { return wzIso(c, lay2, true); };
    var dimsBox = S.pdp ? '' : '<div class="wz-dims"><h5>Your layout · sizes in ft-in</h5>' + wzDims(c, lay) + '</div>';
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
      return S.studio ? h + '</div>' : h;
    }
    if (st === 1) {
      var tps = S.studio ? [] : arr(c.templates);   // studio: no ready layouts here — they would undo the glass / roof picked first
      if (tps.length) h += '<p class="wz-lbl" style="margin-top:0">Start from a ready layout <span style="font-weight:400;color:#6A6258">— or just change things below</span></p><div class="wz-tpl">' + tps.map(function (t) { var tt = wzTry(c, lay, function (l2) { var k; for (k in l2) delete l2[k]; var t2 = cbClone(t.layout); for (k in t2) l2[k] = t2[k]; cbDefaults(c, l2); });
        return '<button type="button" data-wztpl="' + esc(t.code) + '" class="wz-card' + (S.tpl === t.code ? ' on' : '') + '"><span class="wz-pic">' + wzIso(c, t.layout, true) + '</span><b>' + esc(t.name) + '</b><small>' + num(t.layout.L) + ' × ' + num(t.layout.W) + ' ft' + (tt != null ? ' · ' + rs(tt) : '') + '</small></button>'; }).join('') + '</div><p class="wz-lbl">Size</p>';
      h += wzCards(WZ_SIZES.map(function (z) { return [z[0], z[0], z[1] + ' × ' + z[2] + ' ft · ' + z[3]]; }), (WZ_SIZES.filter(function (z) { return z[1] === num(lay.L) && z[2] === num(lay.W); })[0] || [''])[0], 'data-wzsize',
        function (z) { var zz = WZ_SIZES.filter(function (y) { return y[0] === z[0]; })[0]; return wzTry(c, lay, function (l2) { l2.L = zz[1]; l2.W = zz[2]; wzBuild(c, l2, w); }); });
      var stp = function (key, lbl, lo, hi2) { return '<div class="wz-row" style="cursor:default"><span><b>' + lbl + '</b><small>' + lo + '–' + hi2 + ' ft · now ' + fi(lay[key]) + '</small></span><span class="wz-stp"><button type="button" class="wz-pm" data-cstep="' + key + ':-1" aria-label="' + lbl + ' less"' + (num(lay[key]) <= lo ? ' disabled' : '') + '>−</button><input type="number" inputmode="numeric" min="' + lo + '" max="' + hi2 + '" step="1" data-cdim="' + key + '" value="' + num(lay[key]) + '" aria-label="' + lbl + ' in feet"><button type="button" class="wz-pm" data-cstep="' + key + ':1" aria-label="' + lbl + ' more"' + (num(lay[key]) >= hi2 ? ' disabled' : '') + '>+</button></span></div>'; };
      h += '<p class="wz-lbl">Exact size</p>' + stp('L', 'Length', num(c.L && c.L.min) || 8, num(c.L && c.L.max) || 40) + stp('W', 'Width', num(c.W && c.W.min) || 8, num(c.W && c.W.max) || 20);
    } else if (st === 0) {
      h += wzCards(WZ_GLASS, w.glass, 'data-wzglass', function (g) { return wzTry(c, lay, function (l2) { wzBuild(c, l2, withW({ glass: g[0] })); }); },
        function (g) { var l2 = cbClone(lay); l2.L = 12; l2.W = 10; wzBuild(c, l2, withW({ glass: g[0], door: 'single', side: 'front', windows: 2, rooms: false, toilet: false, wc: false, pantry: false })); return mini(l2); });
      if (arr(c.roofs).length > 1) h += '<p class="wz-lbl">Roof</p>' + wzCards(arr(c.roofs).map(function (x) { return [x.name, x.name.replace(/ — .*$/, '').replace(/ \(.*\)$/, ''), /glass/i.test(x.name) ? 'on slim steel members' : '']; }), lay.roof, 'data-cchk="roof" data-v', function (x) { return wzTry(c, lay, function (l2) { l2.roof = x[0]; }); });
    } else if (st === 2) {
      h += wzCards(WZ_DOORS, w.door, 'data-wzdoor', function (d) { return wzTry(c, lay, function (l2) { wzBuild(c, l2, withW({ door: d[0] })); if (!l2.walls[w.side].some(function (k) { var b = cbBay(c, k); return b && b.door && cbSpan(c, k) === cbSpan(c, wzDoorKey(c, d[0], true)); })) l2.L = -1; }); },
        function (d) { var l2 = cbClone(lay); l2.L = 12; l2.W = 10; wzBuild(c, l2, withW({ door: d[0], side: 'front', windows: 0, rooms: false, toilet: false, wc: false, pantry: false })); return mini(l2); });
      h += '<p class="wz-lbl">Which wall?</p><div class="wz-tabs">' + WZ_SIDES.map(function (sd) { return '<button type="button" data-wzdside="' + sd[0] + '" class="' + (sd[0] === w.side ? 'on' : '') + '">' + sd[1] + '</button>'; }).join('') + '</div>';
      // 188: doors on more walls
      h += '<p class="wz-lbl">More doors</p>';
      arr(w.more).forEach(function (md, mi) {
        h += '<div class="wz-more"><div class="wz-tabs">' + WZ_DOORS.map(function (d) { return '<button type="button" data-wzmd="' + mi + ':' + d[0] + '" class="' + (d[0] === md.door ? 'on' : '') + '">' + d[1] + '</button>'; }).join('') + '</div>' +
          '<div class="wz-tabs">' + WZ_SIDES.map(function (sd) { return '<button type="button" data-wzms="' + mi + ':' + sd[0] + '" class="' + (sd[0] === md.side ? 'on' : '') + '">' + sd[1] + '</button>'; }).join('') + '<button type="button" data-wzmx="' + mi + '" class="wz-x" aria-label="Remove this door">✕ Remove</button></div></div>';
      });
      if (arr(w.more).length < 3) h += '<button type="button" class="wz-chip" data-wzmadd="1">+ Add a door on another wall</button>';
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
      if (S.pdp && C3.st === 2) h += '<div class="wz-note">✋ Move the toilet, pantry or partitions right on the 3D model above — drag them; they snap to walls and corners.</div>';
      else if (arr(lay.places).length) h += '<p class="wz-lbl">Move things if you like (drag on the plan)</p><div id="cbPlanBox" style="background:#fff;border:1px solid #E2D6C4;border-radius:12px;padding:6px">' + cbPlan(c, lay, null, S.psel, true) + '</div>' + (S.psel != null && lay.places[S.psel] ? '<div style="display:flex;gap:8px;margin-top:8px"><button type="button" class="wz-chip" data-pact="rot">Turn</button><button type="button" class="wz-chip" data-pact="done">Done</button></div>' : '');
    } else if (st === 4) {   // 159: pergola projection (always, like a pergola — never a PUF box) and the rain gutter
      var P = c.proj, lp = lay.proj || {}, sides = arr(lp.sides);
      if (P) {
        h += '<p class="wz-lbl">Projection — ' + fi(num(P.depth) || 1.5) + ' deep, on which walls?</p><div class="wz-tabs">' + WZ_SIDES.map(function (sd) { var on = sides.indexOf(sd[0]) >= 0; return '<button type="button" data-wzpj="' + sd[0] + '" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '">' + (on ? '✓ ' : '') + sd[1] + '</button>'; }).join('') + '</div>';
        var pset = function (key, list, lbl, attr) { list = arr(list); if (!list.length) return ''; return '<p class="wz-lbl">' + lbl + '</p>' + wzCards(list.map(function (x) { return [x.name, x.name, '']; }), lp[key] || list[0].name, attr, function (x) { return wzTry(c, lay, function (l2) { l2.proj = Object.assign({}, l2.proj); l2.proj[key] = x[0]; }); }); };
        h += pset('design', P.designs, 'Pergola design', 'data-wzpd') + pset('top', P.tops, 'Cover on top', 'data-wzpt') + pset('under', P.unders, 'Underneath', 'data-wzpu');
        h += '<div class="wz-note">💡 Lights under the projection are always included.</div>';
      }
      if (num(c.deck_light)) {   // 188
        var dl = arr(lay.deck_lights);
        h += '<p class="wz-lbl">Deck profile light — glowing strip along the deck edge · ' + rs(c.deck_light) + ' / ft</p><div class="wz-tabs">' + WZ_SIDES.map(function (sd) { var on = dl.indexOf(sd[0]) >= 0, ln = sd[0] === 'front' || sd[0] === 'back' ? num(lay.L) : num(lay.W); return '<button type="button" data-wzdl="' + sd[0] + '" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '">' + (on ? '✓ ' : '') + sd[1] + ' <small>+' + rs(ln * num(c.deck_light)) + '</small></button>'; }).join('') + '</div>';
      }
      if (num(c.gutter)) {
        h += '<p class="wz-lbl">Rain gutter</p>' + tgl('data-wzgon="1"', SIDES.indexOf(lay.gutter) >= 0, 'Rain gutter + downpipe', 'collects roof water and drains it on one side', SIDES.indexOf(lay.gutter) >= 0 ? '' : '+' + rs(num(c.gutter) * num(lay.L)));
        if (SIDES.indexOf(lay.gutter) >= 0) h += '<p class="wz-lbl">Roof slope — water drains to the</p><div class="wz-tabs">' + WZ_SIDES.map(function (sd) { return '<button type="button" data-wzgut="' + sd[0] + '" class="' + (sd[0] === lay.gutter ? 'on' : '') + '">' + sd[1] + '</button>'; }).join('') + '</div>';
      }
    } else if (st === 5) {
      var row = function (key, list, lbl) { list = arr(list); if (list.length < 2) return ''; return '<p class="wz-lbl">' + lbl + '</p>' + wzCards(list.map(function (x) { return [x.name, x.name.replace(/ — .*$/, '').replace(/ \(.*\)$/, ''), '']; }), lay[key], 'data-cchk="' + key + '" data-v', function (x) { return wzTry(c, lay, function (l2) { l2[key] = x[0]; }); }); };
      h += '<div class="wz-note">💡 LED lights inside are always included.</div>';
      // 188: floor finish (always one), wall finish + shade per wall, false ceiling type
      if (arr(c.floors).length) h += '<p class="wz-lbl">Floor finish</p>' + wzCards(arr(c.floors).map(function (x) { return [x.name, x.name.replace(/ — .*$/, '').replace(/ \(.*\)$/, ''), /client/i.test(x.name) ? 'floor by you' : /plank|wood/i.test(x.name) ? 'indoor laminate' : '']; }), lay.floor || arr(c.floors)[0].name, 'data-cchk="floor" data-v', function (x) { return wzTry(c, lay, function (l2) { l2.floor = x[0]; }); });
      if (arr(c.wall_fins).length) {
        var ws2 = w.wside || 'front', wf2 = (lay.wall_fin || {})[ws2] || {}, fin2 = wf2.fin || arr(c.wall_fins)[0].name, sh2 = wf2.shade || (arr(c.shades)[0] || {}).name;
        h += '<p class="wz-lbl">Wall finish — pick for each wall</p><div class="wz-tabs">' + WZ_SIDES.map(function (sd) { var f3 = ((lay.wall_fin || {})[sd[0]] || {}), hx = (arr(c.shades).filter(function (z) { return z.name === f3.shade; })[0] || arr(c.shades)[0] || {}).hex; return '<button type="button" data-wzws="' + sd[0] + '" class="' + (sd[0] === ws2 ? 'on' : '') + '"><i style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;vertical-align:-1px;border:1px solid #0002;background:' + (/wpc|laminate|wood/i.test(f3.fin || '') ? '#7A5537' : hx || '#F2EFE8') + '"></i>' + sd[1] + '</button>'; }).join('') + '</div>';
        h += wzCards(arr(c.wall_fins).map(function (x) { return [x.name, x.name, x.rate ? rs(x.rate) + ' / sq ft of wall' : '']; }), fin2, 'data-wzwf', function (x) { return wzTry(c, lay, function (l2) { var o3 = Object.assign({}, l2.wall_fin); o3[ws2] = { fin: x[0], shade: sh2 }; l2.wall_fin = o3; }); });
        if (arr(c.shades).length && !/wpc|laminate|wood/i.test(fin2)) h += '<p class="wz-lbl">Shade — ' + esc(ws2) + ' wall: ' + esc(sh2 || '') + '</p><div style="display:flex;gap:8px;flex-wrap:wrap">' + arr(c.shades).map(function (z) { return '<button type="button" data-wzsh="' + esc(z.name) + '" class="wz-sw-col' + (z.name === sh2 ? ' on' : '') + '" style="background:' + esc(z.hex) + '" title="' + esc(z.name) + '" aria-label="' + esc(z.name) + '"></button>'; }).join('') + '</div><button type="button" class="wz-chip" data-wzshall="1" style="margin-top:8px">Use this finish on all walls</button>';
      }
      var frames = arr(c.frames), fcol = function (n) { n = n.toLowerCase(); return /grey/.test(n) ? '#8A8A8A' : /white/.test(n) ? '#FFFFFF' : /wood/.test(n) ? '#8B5A2B' : '#2E2E2E'; };
      if (frames.length > 1) h += '<p class="wz-lbl">Frame colour</p><div style="display:flex;gap:12px;flex-wrap:wrap">' + frames.map(function (f) { var t = wzTry(c, lay, function (l2) { l2.frame = f.name; }); return '<button type="button" data-cch="frame" data-v="' + esc(f.name) + '" class="wz-sw-col' + (lay.frame === f.name ? ' on' : '') + '" style="background:' + fcol(f.name) + '" aria-label="' + esc(f.name) + '" title="' + esc(f.name) + (t != null && t > q0.total ? ' +' + rs(t - q0.total) : '') + '"></button>'; }).join('') + '</div><p class="wz-sub" style="margin-top:4px">' + esc(lay.frame || '') + '</p>';
      var up = function (key, list, name, sub) { list = arr(list); if (list.length < 2) return ''; var on = lay[key] && lay[key] !== list[0].name, t1 = wzTry(c, lay, function (l2) { l2[key] = list[1].name; }), t0 = wzTry(c, lay, function (l2) { l2[key] = list[0].name; });
        return '<label class="wz-row"><span><b>' + esc(name) + '</b><small>' + esc(sub) + '</small></span><span class="wz-pr">' + (t1 != null && t0 != null ? '+' + rs(t1 - t0) : '') + '</span><input type="checkbox" class="wz-sw" data-wzup="' + key + '"' + (on ? ' checked' : '') + '></label>'; };
      h += '<p class="wz-lbl">Upgrades</p>' + up('height', c.heights, 'Taller — 10 ft inside', 'instead of 8.5 ft') + up('glass', c.glasses, 'Cooler double glass', 'DGU on every glass panel') + up('panel', c.panels, 'Extra insulation', 'thicker 75 mm walls');
      var ceilOn = num((lay.items || {}).ceiling) > 0;
      arr(c.items).filter(function (it) { return !cbPlaceable(it); }).forEach(function (it) { if (it.unit === 'floor' && it.key === 'ceiling' && arr(c.ceilings).length) { var ct2 = arr(c.ceilings).filter(function (z) { return z.name === lay.ceiling_type; })[0] || arr(c.ceilings)[0];
        h += '<label class="wz-row"><span><b>False ceiling with LED</b><small>whole floor</small></span><span class="wz-pr">' + (ceilOn ? '' : '+' + rs(Math.round(num(ct2.rate) * num(lay.L) * num(lay.W)))) + '</span><input type="checkbox" class="wz-sw" data-citc="ceiling"' + (ceilOn ? ' checked' : '') + '></label>';
        if (ceilOn) h += wzCards(arr(c.ceilings).map(function (z) { return [z.name, z.name, rs(z.rate) + ' / sq ft']; }), ct2.name, 'data-cchk="ceiling_type" data-v', function (z) { return wzTry(c, lay, function (l2) { l2.ceiling_type = z[0]; }); }); return; }
        if (it.unit === 'floor') h += '<label class="wz-row"><span><b>' + esc(it.name.replace(/ \(.*\)$/, '')) + '</b><small>' + rs(it.price) + ' / sq ft</small></span><span class="wz-pr">+' + rs(Math.round(it.price * num(lay.L) * num(lay.W))) + '</span><input type="checkbox" class="wz-sw" data-citc="' + esc(it.key) + '"' + ((num((lay.items || {})[it.key]) || 0) ? ' checked' : '') + '></label>'; });
    } else {
      var gname = (WZ_GLASS.filter(function (g) { return g[0] === w.glass; })[0] || ['', ''])[1], dname = (WZ_DOORS.filter(function (d) { return d[0] === w.door; })[0] || ['', ''])[1];
      var ins = []; if (w.rooms) ins.push('2 rooms'); if (w.toilet) ins.push('toilet'); if (w.wc) ins.push('small toilet'); if (w.pantry) ins.push('pantry'); if (w.windows) ins.push(w.windows + ' window' + (w.windows > 1 ? 's' : ''));
      if (w.exhaust) ins.push('exhaust fans');
      var pj2 = lay.proj && arr(lay.proj.sides).length ? 'Pergola projection (' + arr(lay.proj.sides).join(', ') + ') · ' + [lay.proj.design, lay.proj.top, lay.proj.under].filter(Boolean).join(' · ') : '';
      h += '<ul class="wz-sum"><li><b>' + fi(lay.L) + ' × ' + fi(lay.W) + '</b> · ' + (num(lay.L) * num(lay.W)) + ' sq ft</li><li>' + esc(gname) + ' · ' + esc(dname) + ' (' + esc(w.side) + ')' + (lay.full_doors === true ? ' · full-height doors' : ' · 8 ft doors') + (SIDES.some(function (sd) { return lay.walls[sd].indexOf('slide') >= 0; }) && lay.tracks ? ' · ' + esc(lay.tracks) : '') + '</li><li>' + esc(ins.join(' · ') || 'open inside') + '</li>' + (pj2 ? '<li>' + esc(pj2) + '</li>' : '') + (SIDES.indexOf(lay.gutter) >= 0 ? '<li>Rain gutter, slope to the ' + esc(lay.gutter) + '</li>' : '') + '<li>' + esc([lay.roof, lay.frame, lay.height].filter(Boolean).join(' · ')) + ' · LED lights included</li></ul>';
      h += '<div class="wz-note"><b>Before we make it:</b> final drawings of your cabin are sent to you for approval. Making starts only after you approve them.</div>';
      if (S.studio && S.site && S.site.kind === 'terrace') h += '<button type="button" class="plan-card" data-ar="open"><span>🛋️</span><span><b>Add things around it — here</b><small>Seating, planters, a pergola, a bar… on your terrace with this cabin, in this 3D</small></span><i>→</i></button>';   // 193j
      if (S.fromPlan == null) h += '<button type="button" class="plan-card" onclick="mtoPlanFrom()"><span>🗺️</span><span><b>Add more around it</b><small>Put a pergola, seating, planters, a bar… on your ' + (S.site && S.site.kind === 'terrace' ? 'terrace' : 'lawn') + ' with this cabin — see it all in 3D</small></span><i>→</i></button>';   // 193f
      if (S.pdp) h += pdpTail(PRODS[S.id], m, o);
      h += partsMini();
      if (S && !S.cabDone) { S.cabDone = true; setTimeout(function () { try { var x0 = PRODS[S.id]; if (x0 && document.getElementById('mtoFull') && !document.getElementById('mfParts')) window.mtoShowParts(); } catch (e) {} }, 0); }
      h += '<button type="button" class="wz-back" data-wzadv="1">✎ Edit each wall yourself</button>';
    }
    if (S.pdp) return S.studio ? h + '</div>' : h;
    h += dimsBox + '<div class="wz-nav">' + (st > 0 ? '<button type="button" class="wz-prev" data-wzgo="' + (st - 1) + '">← Back</button>' : '<span></span>') + (st < 6 ? '<button type="button" class="wz-next" data-wzgo="' + (st + 1) + '">Next →</button>' : '') + '</div>';
    return h;
  }
  function wzClick(t) {   // returns true when it handled the click
    var c = PRODS[S.id].cz.cabin, lay = S.o.layout, w = S.wz, k;
    if ((k = t.getAttribute('data-wzgo')) != null) { if (S.studio && +k > Math.max(w.max || 0, w.step)) return true; if (S.siteEd) { S.siteEd = false; S.siteDone = true; } w.step = +k; w.adv = false; S.psel = null; S.v3 = null; return true; }
    if ((k = t.getAttribute('data-wzv')) != null) { S.v3 = k; return true; }
    if ((k = t.getAttribute('data-wztpl')) != null) { var tp = arr(c.templates).filter(function (x) { return x.code === k; })[0]; if (tp) { var keep = { step: w.step }; S.o.layout = lay = cbClone(tp.layout); cbDefaults(c, lay); S.wz = wzRead(c, lay); S.wz.step = keep.step; S.wz.adv = false; S.tpl = k; S.v3 = '3d'; S.sel3 = null; S.psel = null; if (S.pdp) S.furn = furnGuess(PRODS[S.id]); } return true; }
    if ((k = t.getAttribute('data-cstep')) != null) { var cs = k.split(':'); setDim(cs[0], num(lay[cs[0]]) + (+cs[1])); return true; }
    if ((k = t.getAttribute('data-wztrk')) != null) { lay.tracks = k; return true; }
    if ((k = t.getAttribute('data-wzpj')) != null) { var pj = Object.assign({}, lay.proj), sd0 = arr(pj.sides).slice(), ix = sd0.indexOf(k); if (ix >= 0) { if (sd0.length > 1 || !(c.proj && c.proj.required)) sd0.splice(ix, 1); } else sd0.push(k); pj.sides = SIDES.filter(function (x) { return sd0.indexOf(x) >= 0; }); lay.proj = pj; return true; }
    if ((k = t.getAttribute('data-wzpd')) != null || (k = t.getAttribute('data-wzpt')) != null || (k = t.getAttribute('data-wzpu')) != null) { var pk = t.hasAttribute('data-wzpd') ? 'design' : t.hasAttribute('data-wzpt') ? 'top' : 'under'; lay.proj = Object.assign({}, lay.proj); lay.proj[pk] = k; return true; }
    if ((k = t.getAttribute('data-wzgut')) != null) { lay.gutter = k; return true; }
    // 188: more doors, deck lights, wall finishes
    if (t.getAttribute('data-wzmadd') != null) { var used = [w.side].concat(arr(w.more).map(function (x) { return x.side; })), fs = SIDES.filter(function (x) { return used.indexOf(x) < 0; })[0] || 'back'; w.more = arr(w.more).concat([{ door: 'single', side: fs }]); wzBuild(c, lay, w); return true; }
    if ((k = t.getAttribute('data-wzmd')) != null) { var q1 = k.split(':'); w.more = arr(w.more).slice(); w.more[+q1[0]] = Object.assign({}, w.more[+q1[0]], { door: q1[1] }); wzBuild(c, lay, w); return true; }
    if ((k = t.getAttribute('data-wzms')) != null) { var q2 = k.split(':'); w.more = arr(w.more).slice(); w.more[+q2[0]] = Object.assign({}, w.more[+q2[0]], { side: q2[1] }); wzBuild(c, lay, w); return true; }
    if ((k = t.getAttribute('data-wzmx')) != null) { w.more = arr(w.more).filter(function (z, zi) { return zi !== +k; }); wzBuild(c, lay, w); return true; }
    if ((k = t.getAttribute('data-wzdl')) != null) { var dl0 = arr(lay.deck_lights).slice(), di = dl0.indexOf(k); if (di >= 0) dl0.splice(di, 1); else dl0.push(k); lay.deck_lights = SIDES.filter(function (x) { return dl0.indexOf(x) >= 0; }); return true; }
    if ((k = t.getAttribute('data-wzws')) != null) { w.wside = k; return true; }
    if ((k = t.getAttribute('data-wzwf')) != null || (k = t.getAttribute('data-wzsh')) != null) { var sd3 = w.wside || 'front', o4 = Object.assign({}, lay.wall_fin), cur3 = Object.assign({ fin: arr(c.wall_fins)[0] && c.wall_fins[0].name, shade: (arr(c.shades)[0] || {}).name }, o4[sd3]);
      if (t.hasAttribute('data-wzwf')) cur3.fin = k; else cur3.shade = k; o4[sd3] = cur3; lay.wall_fin = o4; return true; }
    if (t.getAttribute('data-wzshall') != null) { var src = Object.assign({}, (lay.wall_fin || {})[w.wside || 'front']), o5 = {}; SIDES.forEach(function (x) { o5[x] = Object.assign({}, src); }); lay.wall_fin = o5; return true; }
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
    S = { id: id, img: 0, o: { n: (m.n && num(m.n.min)) || '', l: '', w: '', h: arr(m.h && m.h.options)[0] || '', size: m.unit === 'fixed' && arr(m.sizes).length === 1 ? m.sizes[0].label : '', material: (arr(m.materials)[0] || {}).name || '', colour: (arr((arr(m.materials)[0] || {}).colours)[0] || {}).name || '',   // 175: one size / the photo's finish preselected
     
      addons: arr(m.addons).filter(function (a) { return a.on; }).map(function (a) { return a.name; }), install: !!(m.install && (m.install.required || (isPg(id) && m.install.offered))), pin: lastPin(),   // pergolas: our installer first, install-yourself on the proposal
     
      groups: arr(m.groups).reduce(function (g, x) { var f = arr(x.options).filter(function (y) { return String(y.name || '').trim(); })[0]; if (f) g[x.name] = f.name; return g; }, {}),
      drawing: m.drawing !== 'no', size_ok: false, note: '' } };
    if (!window.__ad3d && /[?&]3d(=|&|$)/.test(location.search)) {   // ad links: /p/<design>/?3d opens the 3D designer / cabin studio straight away
      window.__ad3d = true; try { if (window.otrack) otrack('customise_start', { sku: id, ref: 'ad3d' }); } catch (e) {}
      if (m.unit === 'cabin') window.__cbsOpen = id; else if (/^MTO-PG-/.test(id)) window.__mtoPre = Object.assign({}, window.__mtoPre && window.__mtoPre.id === id ? window.__mtoPre : { id: id }, { open3d: true });
    }
    var pre = window.__mtoPre;   // home "Design it yourself": size / roof / finish picked there carry over (only valid choices)
    if (pre && pre.id !== id) window.__mtoPre = null;   // kept for this product (also after signing in to see the price)
    if (pre && pre.id === id) {
      if (pre.open3d) { pre.open3d = false; setTimeout(function () { try { window.pg3Open(true); } catch (e) {} }, 400); }
      var inR = function (v, k) { v = num(v); return v != null && v >= (num(m[k] && m[k].min) || 0) && (num(m[k] && m[k].max) == null || v <= num(m[k].max)); };
      if (inR(pre.l, 'l')) S.o.l = pre.l; if (inR(pre.w, 'w')) S.o.w = pre.w;
      var mt = arr(m.materials).filter(function (x) { return x.name === pre.material; })[0];
      if (mt) { S.o.material = mt.name; if (arr(mt.colours).some(function (c) { return c.name === pre.colour; })) S.o.colour = pre.colour; else S.o.colour = (arr(mt.colours)[0] || {}).name || ''; }
      Object.keys(pre.groups || {}).forEach(function (k) { if (arr(m.groups).some(function (g) { return g.name === k && arr(g.options).some(function (y) { return y.name === pre.groups[k]; }); })) S.o.groups[k] = pre.groups[k]; });
    }
    if (m.unit === 'cabin' && m.cabin && m.cabin.layout) { S.o.layout = cbClone(m.cabin.layout); cbDefaults(m.cabin, S.o.layout); S.o.material = ''; S.sel = { side: 'front', i: 0 }; S.psel = null; S.wz = wzRead(m.cabin, S.o.layout); S.wz.step = 0; S.wz.adv = false; }   // 156, 157, 158
    var ed = window.__mtoEdit;   // 190: "Edit design" from the cart — the saved choices come back; saving updates that cart line
    if (ed && ed.id === id) { window.__mtoEdit = null; Object.keys(ed.o || {}).forEach(function (k) { if (ed.o[k] !== undefined) S.o[k] = k === 'layout' ? cbClone(ed.o[k]) : k === 'addons' ? arr(ed.o[k]).slice() : k === 'groups' ? Object.assign({}, ed.o[k]) : ed.o[k]; });
      if (ed.pin) S.o.pin = ed.pin; S.editK = ed.k; if (S.o.layout && m.cabin) { cbDefaults(m.cabin, S.o.layout); S.wz = wzRead(m.cabin, S.o.layout); S.wz.step = 0; S.wz.adv = false; S.cbsInit = true; } }
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
    try { history.pushState({ v: 'modal' }, '', location.pathname + location.search) } catch (e) {}   // back closes the builder
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
    window.addCart = function (id) { if (S && S.pdp && (!id || id === S.id) && PRODS[S.id] && PRODS[S.id].cz) return pdpOrder(true); return _ac.apply(this, arguments); };   // 190: into the cart
  }
  function pdpOrder(add) { if (isPg(S.id) && !S.pgLegacy) return window.pg3Open(true); if (isProp(S.id) && PRODS[S.id].cz.unit !== 'cabin' && !S.pgLegacy) return window.cuOpen(true); if (!mtoOk() && PRODS[S.id].cz.unit !== 'cabin') return window.mtoUnlock(S.id); var c = document.getElementById('mtoCfg'), q = priceR(S.id, PRODS[S.id].cz, S.o, PCT); if (!q.ok || PRODS[S.id].oo === false) { if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); return toast(PRODS[S.id].oo === false ? 'Coming soon — orders open soon' : q.error); } if (add) return addM(false); order(); }
  // 160: the cabin builder on the product page — the 3D model takes the photo's place, a sticky bar carries the price and Next
  var CBV = [['3d', '3D'], ['cut', 'Roof off'], ['360', '360°'], ['inside', 'Inside'], ['top', 'Top'], ['plan', 'Plan'], ['front', 'Sides'], ['photos', 'Photos']];
  var FURN = [['lounge', 'Lounge'], ['office', 'Office'], ['cafe', 'Café'], ['stay', 'Stay'], ['none', 'No furniture']];
  function furnGuess(x) {   // 160: furniture to show, from the layout it started from
    var t = (arr(x.cz.cabin.templates).filter(function (z) { return z.code === S.tpl; })[0] || {}).name || x.n || '';
    return /caf|dining/i.test(t) ? 'cafe' : /quarter|cottage|farm|stay|cabana/i.test(t) ? 'stay' : /office|site|guard|kiosk|store|showroom|pod|porta|hybrid/i.test(t) ? 'office' : 'lounge';
  }
  function wzSyncRooms(c, lay) { var r = wzRead(c, lay); ['rooms', 'toilet', 'wc', 'pantry', 'exhaust'].forEach(function (k) { S.wz[k] = r[k]; }); }
  function on3d(ev) {   // taps and drags in the 3D model
    if (!S || !S.wz) return; var c = PRODS[S.id].cz.cabin, lay = S.o.layout;
    if (ev.t === 'none') { if (!S.sel3 && S.psel == null) return; S.sel3 = null; S.psel = null; }
    else if (ev.t === 'selbay') { S.sel3 = { side: ev.side, i: cbHead(lay.walls[ev.side], ev.i) }; S.psel = null; }
    else if (ev.t === 'selpl') { S.psel = ev.i; S.sel3 = null; }
    else if (ev.t === 'movesite') tsDrop(ev);
    else if (ev.t === 'movecab') tsMoveTo(ev, S.o.layout);
    else if (ev.t === 'selitem' || ev.t === 'moveitem') return arEv(ev);
    else if (ev.t === 'movepl') { var p = arr(lay.places)[ev.i]; if (!p) return; p.x = ev.x; p.y = ev.y; cbClamp(c, lay, p); S.psel = ev.i; S.sel3 = null; }
    draw();
  }
  function tsMoveTo(ev, LAY) { if (!S.site) return; var k0 = [S.site.cx, S.site.cz]; S.site.cx = ev.cx; S.site.cz = ev.cz;   // 192: never over the parapet or on a block (cabin + pergola)
      if (tsClash(S.site, LAY)) { var bst = null; for (var r9 = 0.5; r9 <= 12 && !bst; r9 += 0.5) for (var a9 = 0; a9 < 16 && !bst; a9++) { var cx9 = Math.round((ev.cx + r9 * Math.cos(a9 * Math.PI / 8)) * 2) / 2, cz9 = Math.round((ev.cz + r9 * Math.sin(a9 * Math.PI / 8)) * 2) / 2; S.site.cx = cx9; S.site.cz = cz9; if (!tsClash(S.site, LAY)) bst = [cx9, cz9]; }
        if (bst) { S.site.cx = bst[0]; S.site.cz = bst[1]; } else { S.site.cx = k0[0]; S.site.cz = k0[1]; S.tsMsg = 'It doesn\'t fit there — try a clear spot'; } }
  }
  function cbEditBar(c, lay, v) {   // what you can do with what is selected in the 3D model
    var short = function (n) { return String(n || '').replace(/ — .*$/, '').replace(/ \(.*\)$/, ''); }, h = '';
    if (S.sel3 && lay.walls[S.sel3.side]) {
      var ks = lay.walls[S.sel3.side], hi = cbHead(ks, Math.min(S.sel3.i, ks.length - 1)), cur = ks[hi];
      h = '<span class="cb-et">' + esc(S.sel3.side.charAt(0).toUpperCase() + S.sel3.side.slice(1)) + ' wall · panel ' + (hi + 1) + '</span>' + WZ_PIECES.filter(function (x) { return cbBay(c, x[0]); }).map(function (x) { var b = cbBay(c, x[0]), ok = cbSet(c, cbClone(lay), S.sel3.side, hi, x[0]);
        return '<button type="button" data-e3k="' + esc(x[0]) + '" class="' + (x[0] === cur ? 'on' : '') + '"' + (ok ? '' : ' disabled') + '>' + esc(x[1]) + ' <small>' + rs(num(b.price) || 0) + '</small></button>'; }).join('') + '<button type="button" data-e3x="1" class="dn">Done</button>';
    } else if (S.psel != null && arr(lay.places)[S.psel]) {
      var pl = lay.places[S.psel], it = cbItem(c, pl.key) || {}, rft = it.unit === 'rft', rm = c.rooms && c.rooms[pl.key], dd = cbDims(c, Object.assign({}, pl, { rot: 0 }));
      h = '<span class="cb-et">' + esc(CB_SHORT[pl.key] || short(it.name || (CB_FOOT[pl.key] || [])[2])) + (rft ? ' · ' + fi(pl.len) : rm ? ' · ' + fi(dd[0]) + ' × ' + fi(dd[1]) : '') + '</span>' + (rft ? '<button type="button" data-e3p="less">− Shorter</button><button type="button" data-e3p="more">Longer +</button>' : '')
        + (rm ? '<button type="button" data-e3p="w-"' + (dd[0] <= num(rm.w) ? ' disabled' : '') + '>− Narrower</button><button type="button" data-e3p="w+">Wider +</button>' + (num(rm.rate_rft) ? '' : '<button type="button" data-e3p="d-"' + (dd[1] <= num(rm.d) ? ' disabled' : '') + '>− Shallower</button><button type="button" data-e3p="d+">Deeper +</button>') : '') + '<button type="button" data-e3p="rot">↻ Turn</button><button type="button" data-e3p="del">Remove</button><button type="button" data-e3x="1" class="dn">Done</button>';
    } else if (v === 'cut' || v === 'top') {
      h = '<span class="cb-et">Add inside</span>' + arr(c.items).filter(cbPlaceable).map(function (it) { return '<button type="button" data-e3add="' + esc(it.key) + '">+ ' + esc(CB_SHORT[it.key] || short(it.name)) + '</button>'; }).join('');
    }
    var hint = v === 'inside' ? 'Drag to look around · tap the floor to walk there' : v === 'cut' || v === 'top' ? 'Tap a wall panel or a room to change it · drag rooms and partitions to move them' : ['3d', 'front', 'right', 'back', 'left'].indexOf(v) >= 0 ? 'Tap any wall panel to change it — door, window, glass…' : '';
    return (hint && !S.sel3 && S.psel == null ? '<p class="cb-hint">' + hint + '</p>' : '') + (h ? '<div class="cb-ed">' + h + '</div>' : '');
  }
  // 192: undo / redo in the studio — every change to the layout or the terrace is a step (60 kept)
  function cbHist() {
    if (!S || !S.studio || !S.o || !S.o.layout) return;
    var k = JSON.stringify([S.o.layout, S.site || null]);
    if (S.histId !== S.id) { S.histId = S.id; S.hist = []; S.hi = -1; }
    if (S.hist[S.hi] === k) return;
    S.hist = S.hist.slice(0, S.hi + 1); S.hist.push(k); if (S.hist.length > 60) S.hist.shift(); S.hi = S.hist.length - 1;
  }
  function cbUndo(dir) {
    var j = S.hi + dir; if (!S.hist || j < 0 || j >= S.hist.length) return; S.hi = j;
    var v = JSON.parse(S.hist[j]), c = PRODS[S.id].cz.cabin; S.o.layout = v[0]; S.site = v[1]; S.psel = null; S.sel3 = null; S.tsMsg = '';
    S.wz = Object.assign({}, S.wz, wzRead(c, S.o.layout));
  }
  document.addEventListener('keydown', function (e) {
    if (!S || !S.studio || !(e.ctrlKey || e.metaKey) || /input|textarea|select/i.test((e.target && e.target.tagName) || '')) return;
    var k = String(e.key).toLowerCase(); if (k === 'z' || k === 'y') { e.preventDefault(); cbUndo(k === 'y' || e.shiftKey ? 1 : -1); draw(); }
  });
  function cbStage() {
    var col = document.querySelector('#pdp .pdp-grid > div:first-child'); if (!col) return;
    var st = document.getElementById('cbStage'); if (!st) { st = document.createElement('div'); st.id = 'cbStage'; st.className = 'cb-stage'; col.insertBefore(st, col.firstChild); st.addEventListener('click', stageClick); }
    if (S.studio) {
      var cS = PRODS[S.id].cz.cabin, vS = S.view3 === 'cut' ? 'cut' : '3d', flS = (FURN.filter(function (f) { return f[0] === (S.furn || 'none'); })[0] || FURN[4])[1], ok3 = C3.st !== -1;
      st.innerHTML = '<div class="cbs-v"><div class="wz-3dv" id="cb3d">' + (C3.st === 2 ? '' : wzIso(cS, S.o.layout)) + '</div>' +
        (C3.st === 2 ? '<div class="cb-ov"><button type="button" data-cbroof="1" aria-pressed="' + (vS === 'cut') + '">' + (vS === 'cut' ? '⌂ Roof on' : '⌂ Roof off') + '</button><button type="button" data-e3furn="1">🛋 ' + esc(flS) + '</button><button type="button" data-e3night="1" aria-pressed="' + !!S.night + '">' + (S.night ? '🌙 Evening' : '☀ Day') + '</button><button type="button" data-cbsite="1" aria-pressed="' + !!S.siteEd + '">' + (S.site && S.site.kind === 'terrace' ? '🏙 Terrace' : '🌳 Lawn') + '</button></div>' +
          '<div class="cbs-z"><button type="button" data-cbz="undo" aria-label="Undo" title="Undo (Ctrl+Z)"' + (S.hi > 0 ? '' : ' disabled') + '>↶</button><button type="button" data-cbz="redo" aria-label="Redo" title="Redo (Ctrl+Y)"' + (S.hist && S.hi < S.hist.length - 1 ? '' : ' disabled') + '>↷</button>' +
          (S.site && S.site.kind === 'terrace' && !S.siteEd ? '<button type="button" data-cbz="whole" class="' + (S.whole ? 'on' : '') + '" aria-pressed="' + !!S.whole + '" aria-label="' + (S.whole ? 'Back to the cabin' : 'See the whole terrace') + '" title="' + (S.whole ? 'Back to the cabin' : 'Whole terrace') + '">' + (S.whole ? '◎' : '▦') + '</button>' : '') +
          '<button type="button" data-cbz="in" aria-label="Zoom in">+</button><button type="button" data-cbz="out" aria-label="Zoom out">−</button>' +
          '<button type="button" data-cbz="pan" class="' + (S.pan ? 'on' : '') + '" aria-pressed="' + !!S.pan + '" aria-label="Move mode: drag to move the model" title="Move: drag to slide the model">✋</button>' +
          '<button type="button" data-cbz="home" aria-label="Back to the start view" title="Centre the model">⌖</button>' +
          '<button type="button" data-cbz="big" aria-label="' + (S.big ? 'Smaller view' : 'Bigger view') + '">' + (S.big ? '⤡' : '⤢') + '</button></div>' : '') +
        (ok3 ? (function (eb) { eb = eb.replace(/<p class="cb-hint">[\s\S]*?<\/p>/, ''); return eb ? '<div class="cbs-ed">' + eb + '</div>' : (C3.st === 2 ? '<p class="cbs-hint">' + (S.pan ? '✋ Drag to move the model · tap ✋ again to turn it' : S.whole && !S.siteEd && S.site && S.site.kind === 'terrace' ? 'Drag the cabin to move it on your terrace · drag elsewhere to turn' : S.siteEd && S.site && S.site.kind === 'terrace' ? 'Drag the mumty, lift room, shafts or AC units to move them · drag elsewhere to turn — your cabin comes next' : 'Drag to turn it 360° · two fingers / right-drag to move · pinch to zoom') + '</p>' : ''); })(cbEditBar(cS, S.o.layout, vS === 'cut' ? 'cut' : '360')) : '') + '</div>';
      return;
    }
    cbTop(); if (!cbStage.on) { cbStage.on = true; window.addEventListener('scroll', cbTop, { passive: true }); window.addEventListener('resize', cbTop); }
    var c = PRODS[S.id].cz.cabin, v = S.view3, side = ['front', 'right', 'back', 'left'].indexOf(v) >= 0, imgs = gal(S.id), h = '';
    if (v === 'plan') h = '<div class="cb-pic"><div class="cb-plan">' + wzDims(c, S.o.layout) + '</div></div>';
    else if (v === 'photos') { var gi = Math.min(S.img || 0, imgs.length - 1); h = '<div class="cb-pic"><img src="' + esc(imgs[gi] || '') + '" alt="' + esc(PRODS[S.id].n) + '">' + (imgs.length > 1 ? '<button type="button" class="cb-nav" style="left:8px" data-gi="' + ((gi + imgs.length - 1) % imgs.length) + '" aria-label="Previous photo">‹</button><button type="button" class="cb-nav" style="right:8px" data-gi="' + ((gi + 1) % imgs.length) + '" aria-label="Next photo">›</button>' : '') + '</div>'; }
    else h = '<div class="wz-3dv" id="cb3d" style="position:relative">' + (C3.st === 2 ? '' : wzIso(c, S.o.layout)) + '</div>';
    if (side) h = h.replace('id="cb3d" style="position:relative">', 'id="cb3d" style="position:relative">');
    var sides = side ? '<div class="cb-sides">' + [['front', 'F'], ['right', 'R'], ['back', 'B'], ['left', 'L']].map(function (x) { return '<button type="button" data-wzv="' + x[0] + '" class="' + (x[0] === v ? 'on' : '') + '" aria-label="' + x[0] + ' side">' + x[1] + '</button>'; }).join('') + '</div>' : '';
    var persp = ['3d', 'cut', 'inside', '360'].indexOf(v) >= 0 && C3.st === 2, fl = (FURN.filter(function (f) { return f[0] === (S.furn || 'none'); })[0] || FURN[4])[1];
    var ov = persp ? '<div class="cb-ov"><button type="button" data-e3furn="1" aria-label="Furniture to show: ' + esc(fl) + '">🛋 ' + esc(fl) + '</button><button type="button" data-e3night="1" aria-pressed="' + !!S.night + '">' + (S.night ? '🌙 Evening' : '☀ Day') + '</button></div>' + (S.furn && S.furn !== 'none' ? '<span class="cb-fn">Furniture is shown for ideas — not included</span>' : '') : '';
    st.innerHTML = '<div style="position:relative">' + h + sides + ov + '</div><div class="cb-vw" role="tablist" aria-label="Views">' + CBV.filter(function (x) { return C3.st === 2 || ['plan', 'photos'].indexOf(x[0]) >= 0 || (C3.st !== -1 && x[0] !== 'cut'); }).map(function (x) { var on = x[0] === v || (x[0] === 'front' && side); return '<button type="button" role="tab" data-wzv="' + x[0] + '" class="' + (on ? 'on' : '') + '" aria-selected="' + on + '">' + x[1] + '</button>'; }).join('') + '</div>' + (C3.st === 2 ? cbEditBar(c, S.o.layout, v) : '');
    if (side) { var cv = st.querySelector('#cb3d'); if (cv) cv.parentNode.style.position = 'relative'; }
  }
  function cbTop() {   // the stage sticks right under whatever part of the store header is showing
    var hd = document.querySelector('.stickytop') || document.querySelector('header'), b = 0; if (hd) { var r = hd.getBoundingClientRect(); b = Math.max(0, Math.round(r.bottom)); }
    document.documentElement.style.setProperty('--cbtop', b + 'px');
  }
  function stageClick(e) {
    var t = e.target.closest('[data-wzv],[data-gi],[data-e3k],[data-e3x],[data-e3p],[data-e3add],[data-e3furn],[data-e3night],[data-cbz],[data-cbroof],[data-cbsite]'); if (!t || !S || t.disabled) return;
    if (t.hasAttribute('data-cbsite')) { S.siteEd = true; S.sel3 = null; S.psel = null; return draw(); }
    if (t.hasAttribute('data-cbz') && /^(undo|redo)$/.test(t.getAttribute('data-cbz'))) { cbUndo(t.getAttribute('data-cbz') === 'undo' ? -1 : 1); return draw(); }   // 192
    if (t.getAttribute('data-cbz') === 'whole') { S.whole = !S.whole; return draw(); }   // 193f: the panel shows where the cabin stands
    if (t.hasAttribute('data-cbz')) { var zk = t.getAttribute('data-cbz'); if (zk === 'pan') { S.pan = !S.pan; try { window.Cabin3D.panMode(S.pan); } catch (er) {} cbStage(); return mount3d(); } if (zk === 'home') { try { window.Cabin3D.home(); } catch (er) {} return; } if (zk === 'big') { S.big = !S.big; document.body.classList.toggle('cbs-big', S.big); cbStage(); mount3d(); setTimeout(function () { try { window.Cabin3D.resize(); } catch (er) {} }, 60); } else try { window.Cabin3D.zoom(zk === 'in' ? 0.8 : 1.25); } catch (er) {} return; }
    if (t.hasAttribute('data-cbroof')) { S.v3 = S.view3 = S.view3 === 'cut' ? '3d' : 'cut'; if (S.view3 !== 'cut') S.psel = null; cbStage(); return mount3d(); }
    var c = PRODS[S.id].cz.cabin, lay = S.o.layout, k;
    if ((k = t.getAttribute('data-e3k')) != null && S.sel3) { var ks = lay.walls[S.sel3.side], hi = cbHead(ks, Math.min(S.sel3.i, ks.length - 1)); if (cbSet(c, lay, S.sel3.side, hi, k)) S.sel3.i = Math.max(0, Math.min(hi, lay.walls[S.sel3.side].length - cbSpan(c, k))); S.wz.custom = true; return draw(); }
    if (t.hasAttribute('data-e3x')) { S.sel3 = null; S.psel = null; return draw(); }
    if ((k = t.getAttribute('data-e3p')) != null) { var pl = arr(lay.places)[S.psel]; if (!pl) return;
      if (k === 'del') { lay.places = lay.places.filter(function (z, zi) { return zi !== S.psel; }); S.psel = null; }
      else if (k === 'rot') { pl.rot = pl.rot === 90 ? 0 : 90; cbClamp(c, lay, pl); }
      else if (/^[wd][+-]$/.test(k)) { var rm2 = (c.rooms || {})[pl.key]; if (rm2) { var f9 = CB_FOOT[pl.key], ax = k.charAt(0), cur9 = num(pl[ax]) || (ax === 'w' ? f9[0] : f9[1]), mn = num(rm2[ax]) || cur9, mx9 = Math.max(num(lay.L), num(lay.W));   // 188: never below standard
          pl[ax] = Math.max(mn, Math.min(mx9, cur9 + (k.charAt(1) === '+' ? 1 : -1))); cbClamp(c, lay, pl); } }
      else { pl.len = Math.max(1, (num(pl.len) || 1) + (k === 'more' ? 1 : -1)); cbClamp(c, lay, pl); }
      cbSync(c, lay); wzSyncRooms(c, lay); return draw(); }
    if ((k = t.getAttribute('data-e3add')) != null) { S.psel = cbAdd(c, lay, k); S.sel3 = null; wzSyncRooms(c, lay); if (['cut', 'top'].indexOf(S.view3) < 0) S.v3 = S.view3 = 'cut'; return draw(); }
    if (t.hasAttribute('data-e3furn')) { var fi0 = FURN.map(function (f) { return f[0]; }).indexOf(S.furn || 'none'); S.furn = FURN[(fi0 + 1) % FURN.length][0]; cbStage(); return mount3d(); }
    if (t.hasAttribute('data-e3night')) { S.night = !S.night; cbStage(); return mount3d(); }
    if (t.hasAttribute('data-gi')) S.img = +t.getAttribute('data-gi'); else { S.v3 = S.view3 = t.getAttribute('data-wzv'); if (['cut', 'top'].indexOf(S.v3) < 0) S.psel = null; }
    cbStage(); mount3d();
  }
  function cbSheet() {
    var sh = document.getElementById('cbSheet'); if (sh) return;
    sh = document.createElement('div'); sh.id = 'cbSheet'; sh.className = 'cb-sheet'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-label', 'Price details');
    sh.innerHTML = '<div><h4>Price details <button type="button" aria-label="Close" data-x="1">✕</button></h4><div class="mto-sum lt" id="mtoSum" style="margin-top:0"></div></div>';
    sh.addEventListener('click', function (e) { if (e.target === sh || e.target.closest('[data-x]')) sh.classList.remove('open'); });
    document.body.appendChild(sh);
  }
  window.mtoState = function () { return S; };   // for tests
  window.cbOpenSheet = function () { var sh = document.getElementById('cbSheet'); if (sh) sh.classList.add('open'); };
  window.cbNext = function () {
    if (!S || !S.wz) return; var w = S.wz;
    if (S.studio && S.siteEd) { S.siteEd = false; S.siteDone = true; S.v3 = null; if (S.site && S.site.kind === 'terrace' && tsClash(S.site, S.o.layout)) tsCentre(S.site, S.o.layout); }   // 193e: the cabin appears now, on a free spot else if (w.adv) { w.adv = false; } else if (w.step < 6) { w.step++; w.max = Math.max(w.max || 0, w.step); S.v3 = null; S.psel = null; } else return pdpOrder();
    draw(); if (S.studio) { var cf0 = document.getElementById('mtoCfg'); if (cf0) cf0.scrollTop = 0; var sc0 = cf0 && cf0.querySelector('.wz-stc .on'); if (sc0 && sc0.scrollIntoView) sc0.scrollIntoView({ block: 'nearest', inline: 'center' }); return; } var cfg = document.getElementById('mtoCfg'), stg = document.getElementById('cbStage'), hd = document.querySelector('.stickytop') || document.querySelector('header');
    if (cfg) { var off = (window.innerWidth < 900 && stg ? stg.offsetHeight : 0) + (hd ? Math.max(0, hd.getBoundingClientRect().bottom) : 0) + 8; window.scrollTo({ top: cfg.getBoundingClientRect().top + window.scrollY - off, behavior: 'smooth' }); }
  };
  function cbBar(q) {
    var ct = document.querySelector('.ctas'); if (!ct) return; var b = ct.querySelector('.cbbar'); if (!b) { b = document.createElement('div'); b.className = 'cbbar'; ct.appendChild(b); }
    var x = PRODS[S.id], last = S.wz.step >= 6 && !S.wz.adv, closed = x.oo === false, o = S.o, needPin = !(q.ok && q.install && q.install.available);
    var NX = ['Size', 'Doors', 'Rooms', 'Outside', 'Look', 'Review'], hs = document.getElementById('cbsStep'), sE = S.studio && S.siteEd; if (hs) hs.textContent = S.wz.adv ? 'Edit each wall' : S.studio ? 'Step ' + (sE ? 1 : S.wz.step + 2) + ' of 8' : 'Step ' + (S.wz.step + 1) + ' of 7';
    if (sE) last = false;
    b.innerHTML = (S.studio && !sE ? '<button type="button" class="cbb" onclick="cbPrev()" aria-label="Back">←</button>' : '') + (S.fromPlan != null && !last ? '<button type="button" class="cbb" style="width:auto;padding:0 12px;font-size:13px;font-weight:600" onclick="mtoBackToPlan()">Save to plan</button>' : '') +
      (last && S.fromPlan == null && !closed && !needPin && q.ok && !isProp(S.id) ? '<button type="button" class="cbb" style="width:auto;padding:0 12px;font-size:13px;font-weight:600" onclick="mtoAddCart()">' + (S.editK ? 'Update cart' : '+ Cart') + '</button>' : '') + '<button type="button" class="cbp" onclick="cbOpenSheet()">' + (q.ok ? '<b>' + rs(q.total) + '</b><small>Price details ▴</small>' : '<small>' + esc(q.error) + '</small>') + '</button>' +
      '<button type="button" class="cbn" onclick="' + (last && S.fromPlan != null ? 'mtoBackToPlan()' : last && isProp(S.id) ? 'mtoProposal(true)' : 'cbNext()') + '"' + (last && S.fromPlan == null && (isProp(S.id) ? !q.ok : (closed || needPin || !q.ok)) ? ' disabled' : '') + '>' + (!last ? (sE ? 'Next: Glass & roof →' : S.studio && !S.wz.adv ? 'Next: ' + NX[S.wz.step] + ' →' : 'Next →') : S.fromPlan != null ? 'Save to my plan →' : isProp(S.id) ? 'See my proposal →' : closed ? 'Coming soon' : needPin ? 'Enter your pincode' : 'Order · pay ' + rs(q.pay_now)) + '</button>';
    var pr = document.getElementById('pdPrice'); if (pr && q.ok && x.oo !== false && S.studio) pr.innerHTML = rs(q.total) + '<span class="mrplab">your design, incl. GST</span>';
  }
  // 175: cabins — the product page shows photos, a highlighted Customise button and Check price (average cost of the three types);
  // the builder opens full screen: big 360 model in the middle, the steps one after another underneath
  function cbAvg(id) {   // average / range of a cabin type over its ready layouts
    var x = PRODS[id], c = x && x.cz && x.cz.cabin; if (!c) return null;
    var t = arr(c.templates).map(function (tp) { var l2 = cbClone(tp.layout); cbDefaults(c, l2); var q = cabin(c, l2); return q.ok ? { v: q.total, a: num(l2.L) * num(l2.W) } : null; }).filter(Boolean);
    if (!t.length) { var l0 = cbClone(c.layout); cbDefaults(c, l0); var q0 = cabin(c, l0); if (!q0.ok) return null; t = [{ v: q0.total, a: num(l0.L) * num(l0.W) }]; }
    var vs = t.map(function (z) { return z.v; }), sum = vs.reduce(function (a, b) { return a + b; }, 0), as = t.map(function (z) { return z.a; });
    return { avg: Math.round(sum / vs.length / 1000) * 1000, lo: Math.min.apply(null, vs), hi: Math.max.apply(null, vs), sqft: Math.round(sum / as.reduce(function (a, b) { return a + b; }, 0) / 50) * 50, amin: Math.min.apply(null, as), amax: Math.max.apply(null, as) };
  }
  function lakh(v) { return v >= 100000 ? '₹' + (v / 100000).toFixed(v >= 1000000 ? 1 : 2).replace(/\.?0+$/, '') + ' L' : rs(v); }
  function cbCtas() {
    var ct = document.querySelector('.ctas'); if (!ct) return; var b = ct.querySelector('.cbcta'); if (!b) { b = document.createElement('div'); b.className = 'cbcta'; ct.insertBefore(b, ct.firstChild); }
    b.innerHTML = '<button type="button" class="cbc-main" onclick="cbStudio(true)">✦ Customise your cabin</button><button type="button" class="cbc-sec" onclick="cbPrices()">Check price</button>';
  }
  window.cbPrices = function () {
    var ids = Object.keys(PRODS).filter(function (i) { var z = PRODS[i]; return z.cz && z.cz.unit === 'cabin' && z.cz.cabin; });
    var ord = function (i) { var n = (PRODS[i].n || '').toLowerCase(); return /glass/.test(n) ? 0 : /hybrid/.test(n) ? 1 : 2; }; ids.sort(function (a, b) { return ord(a) - ord(b); });
    var el = document.getElementById('cbAvg'); if (!el) { el = document.createElement('div'); el.id = 'cbAvg'; el.className = 'cb-avg'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Cabin prices'); document.body.appendChild(el);
      el.addEventListener('click', function (e) { if (e.target === el || e.target.closest('[data-x]')) return window.cbPricesClose(); var g = e.target.closest('[data-cbgo]'); if (g) { var gid = g.getAttribute('data-cbgo'); el.classList.remove('open'); document.body.classList.remove('flt-open'); if (S && S.id === gid) return window.cbStudio(true, true); window.__cbsOpen = gid; if (window.openProduct) window.openProduct(gid); } }); }
    el.innerHTML = '<div class="cb-avgb"><h4>What a cabin costs <button type="button" data-x="1" aria-label="Close">✕</button></h4><p class="cb-avgs">Average prices of our ready layouts, incl. GST. Your exact cost depends on the size, glass, doors and rooms you choose.</p><div class="cb-avgg">' +
      ids.map(function (i) { var a = cbAvg(i), z = PRODS[i], im = gal(i)[0]; if (!a) return '';
        return '<div class="cb-avgc' + (S && S.id === i ? ' on' : '') + '">' + (im ? '<img src="' + esc(im) + '" alt="" loading="lazy">' : '') + '<b>' + esc(String(z.n).replace(/ — .*$/, '')) + '</b><small>' + esc(z.mat || '') + '</small>' +
          '<div class="cb-avgp"><span>Average</span><b>' + lakh(a.avg) + '</b></div><div class="cb-avgr">' + lakh(a.lo) + ' – ' + lakh(a.hi) + ' · ' + a.amin + '–' + a.amax + ' sq ft · about ' + rs(a.sqft) + ' / sq ft</div>' +
          '<button type="button" data-cbgo="' + esc(i) + '">Customise &amp; know the exact cost →</button></div>'; }).join('') + '</div></div>';
    el.classList.add('open'); document.body.classList.add('flt-open');
    try { history.pushState({ v: 'modal' }, '', location.pathname + location.search); } catch (e) {}
  };
  window.cbPricesClose = function (fromPop) { var el = document.getElementById('cbAvg'); if (!el || !el.classList.contains('open')) return; if (!fromPop && history.state && history.state.v === 'modal') return history.back(); el.classList.remove('open'); document.body.classList.remove('flt-open'); };
  function cbCheap() {   // the studio starts from the lowest price: smallest size, one door, no rooms, no extras — every choice after only adds
    var c = PRODS[S.id].cz.cabin, lay = S.o.layout, w = S.wz, lo = function (list, key) { list = arr(list); if (!list.length) return; var best = null; list.forEach(function (x) { var t = wzTry(c, lay, function (l2) { l2[key] = x.name; }); if (t != null && (!best || t < best[0])) best = [t, x.name]; }); if (best) lay[key] = best[1]; };
    var Lmin = num(c.L && c.L.min) || 8, Wmin = num(c.W && c.W.min) || 8, Lmax = num(c.L && c.L.max) || 40, Wmax = num(c.W && c.W.max) || 20;
    var z = WZ_SIZES.filter(function (y) { return y[1] >= Lmin && y[2] >= Wmin && y[1] <= Lmax && y[2] <= Wmax; })[0]; lay.L = z ? z[1] : Lmin; lay.W = z ? z[2] : Wmin;
    lay.items = {}; lay.places = []; lay.full_doors = false; lay.gutter = null;
    if (c.proj) { var P = c.proj, f0 = function (l) { return (arr(l)[0] || {}).name; }; lay.proj = { sides: P.required ? ['front'] : [], design: f0(P.designs), top: f0(P.tops), under: f0(P.unders) }; }
    ['rooms', 'toilet', 'wc', 'pantry', 'exhaust'].forEach(function (k) { w[k] = false; }); w.more = []; w.door = 'single'; w.side = 'front'; w.windows = Math.min(w.windows || 0, 2);
    ['height', 'panel', 'glass'].forEach(function (k) { var l = arr(c[k === 'height' ? 'heights' : k === 'panel' ? 'panels' : 'glasses']); if (l.length) lay[k] = l[0].name; });
    if (arr(c.tracks).length) lay.tracks = c.tracks[0].name;
    wzBuild(c, lay, w); lo(c.roofs, 'roof'); lo(c.frames, 'frame'); if (w.glass === 'all') { var gr = arr(c.roofs).filter(function (r) { return /glass/i.test(r.name); })[0]; if (gr) lay.roof = gr.name; }
    w.step = 0; w.max = 0; w.adv = false; S.tpl = null; S.v3 = null; S.sel3 = null; S.psel = null; S.furn = furnGuess(PRODS[S.id]);
  }
  window.cbStudio = function (on, fresh) {
    if (!S || !S.pdp || !S.wz) return;
    var el = document.getElementById('cbStudio');
    if (on) {
      if (!el) { el = document.createElement('div'); el.id = 'cbStudio'; el.className = 'cbs-ov'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); document.body.appendChild(el); }
      el.innerHTML = '<div class="cbs-hd"><button type="button" class="cbs-x" onclick="cbStudio(false)" aria-label="Back to the product">←</button><div class="cbs-tt"><b>' + esc(String(PRODS[S.id].n).replace(/ — .*$/, '')) + '</b><small id="cbsStep">Step 1 of 7</small></div><div class="cbs-st" id="cbsSteps"></div><button type="button" class="cbs-x" onclick="cbStudio(false)" aria-label="Close">✕</button></div>';
      if (!el.dataset.w) { el.dataset.w = 1; el.addEventListener('click', function (e) { var t = e.target.closest('[data-wzgo],[data-ts]'); if (!t || t.disabled || !S || !S.studio) return; if (t.hasAttribute('data-ts')) { tsClick(t); draw(); return; } if (wzClick(t)) { draw(); var cf = document.getElementById('mtoCfg'); if (cf) cf.scrollTop = 0; } }); }
      if (!S.cbsInit || fresh) { cbCheap(); S.cbsInit = true; }
      var pz = window.__cbsSize; if (pz) { window.__cbsSize = null; var c0 = PRODS[S.id].cz.cabin;   // home "Design it yourself": the size picked there
        if (pz[0] >= (num(c0.L && c0.L.min) || 8) && pz[0] <= (num(c0.L && c0.L.max) || 40) && pz[1] >= (num(c0.W && c0.W.min) || 8) && pz[1] <= (num(c0.W && c0.W.max) || 20)) { S.o.layout.L = pz[0]; S.o.layout.W = pz[1]; wzBuild(c0, S.o.layout, S.wz); } }
      S.studio = true; if (!S.siteDone) { S.siteEd = true; S.sel3 = null; S.psel = null; } el.classList.add('open'); document.body.classList.add('cb-studio');
      try { history.pushState({ v: 'modal' }, '', location.pathname + location.search); } catch (e) {}
      draw(); var cf = document.getElementById('mtoCfg'); if (cf) cf.scrollTop = 0;
      setTimeout(function () { try { window.Cabin3D && window.Cabin3D.resize(); } catch (er) {} }, 80);
      try { if (window.otrack) otrack('customise_start', { sku: S.id }); } catch (e) {}
    } else {
      if (!el || !el.classList.contains('open')) return;
      if (on !== null && history.state && history.state.v === 'modal') return history.back();   // back closes it (popstate → closeModals)
      if (S.fromPlan != null) { S.fromPlan = null; setTimeout(function () { if (window.outrrPlan) window.outrrPlan({ reload: true }); }, 150); }   // 193g: closed without saving — back to the plan as it was
      el.classList.remove('open'); document.body.classList.remove('cb-studio', 'cbs-big'); S.studio = false; S.big = false; if (S.pan) { S.pan = false; try { window.Cabin3D.panMode(false); } catch (er) {} } S.v3 = null; draw(); window.scrollTo(0, 0);
    }
  };
  function cbsGroup(el) {   // studio panel: a label and what it labels stay together in one column
    var o = el.querySelector('.cbs-o'); if (!o) return;
    [].slice.call(o.querySelectorAll(':scope > .wz-lbl')).forEach(function (l) { var n = l.nextElementSibling, g = document.createElement('div'); g.className = 'cbs-g'; o.insertBefore(g, l); g.appendChild(l); if (n && !n.classList.contains('wz-lbl')) g.appendChild(n); });
  }
  window.cbStudioClose = function () { window.cbStudio(null); };   // from the store's back-button handler
  window.cbPrev = function () { if (!S || !S.wz) return; var w = S.wz; if (w.adv) w.adv = false; else if (S.studio && w.step === 0) { S.siteEd = true; S.sel3 = null; S.psel = null; } else if (w.step > 0) { w.step--; S.v3 = null; S.psel = null; } draw(); var cf = document.getElementById('mtoCfg'); if (cf) cf.scrollTop = 0; };
  // 176: Made to Order — full-width sections under the product: what goes into it (parts with photos), specs, how it's made, reviews, questions
  var PART_IMG = window.OUTRR_PART_IMG || {"frame-ms":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-1/MTO-PL-1_01_hero_v1.jpg?width=500&resize=contain&quality=75","frame-alu":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-1/MTO-PL-1_02_side_v1.jpg?width=500&resize=contain&quality=75","base-gi":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-1/MTO-PL-1_03_front_v1.jpg?width=500&resize=contain&quality=75","puf":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-1/MTO-PL-1_04_closeup_v1.jpg?width=500&resize=contain&quality=75","glass":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-1/MTO-PL-1_06_scene2_v1.jpg?width=500&resize=contain&quality=75","dgu":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-2/MTO-PL-2_01_hero_v1.jpg?width=500&resize=contain&quality=75","glassroof":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-2/MTO-PL-2_02_side_v1.jpg?width=500&resize=contain&quality=75","frosted":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-2/MTO-PL-2_03_front_v1.jpg?width=500&resize=contain&quality=75","slidedoor":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-2/MTO-PL-2_04_closeup_v1.jpg?width=500&resize=contain&quality=75","door":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-2/MTO-PL-2_06_scene2_v1.jpg?width=500&resize=contain&quality=75","window":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-3/MTO-PL-3_01_hero_v1.jpg?width=500&resize=contain&quality=75","ledpanel":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-3/MTO-PL-3_02_side_v1.jpg?width=500&resize=contain&quality=75","ledstrip":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-3/MTO-PL-3_03_front_v1.jpg?width=500&resize=contain&quality=75","switch":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-3/MTO-PL-3_04_closeup_v1.jpg?width=500&resize=contain&quality=75","metalroof":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-3/MTO-PL-3_06_scene2_v1.jpg?width=500&resize=contain&quality=75","gutter":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-4/MTO-PL-4_01_hero_v1.jpg?width=500&resize=contain&quality=75","louver":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-4/MTO-PL-4_02_side_v1.jpg?width=500&resize=contain&quality=75","wpcdeck":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-4/MTO-PL-4_03_front_v1.jpg?width=500&resize=contain&quality=75","wpcslat":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-4/MTO-PL-4_04_closeup_v1.jpg?width=500&resize=contain&quality=75","hpl":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-4/MTO-PL-4_06_scene2_v1.jpg?width=500&resize=contain&quality=75","jali":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-5/MTO-PL-5_01_hero_v1.jpg?width=500&resize=contain&quality=75","powder":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-5/MTO-PL-5_02_side_v1.jpg?width=500&resize=contain&quality=75","teak":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-5/MTO-PL-5_03_front_v1.jpg?width=500&resize=contain&quality=75","acacia":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-5/MTO-PL-5_04_closeup_v1.jpg?width=500&resize=contain&quality=75","rattan":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-5/MTO-PL-5_06_scene2_v1.jpg?width=500&resize=contain&quality=75","fabric":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-6/MTO-PL-6_01_hero_v1.jpg?width=500&resize=contain&quality=75","ss":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-6/MTO-PL-6_02_side_v1.jpg?width=500&resize=contain&quality=75","anchor":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-6/MTO-PL-6_03_front_v1.jpg?width=500&resize=contain&quality=75","granite":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-6/MTO-PL-6_04_closeup_v1.jpg?width=500&resize=contain&quality=75","onyx":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-6/MTO-PL-6_06_scene2_v1.jpg?width=500&resize=contain&quality=75","pustone":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-7/MTO-PL-7_01_hero_v1.jpg?width=500&resize=contain&quality=75","mosaic":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-7/MTO-PL-7_02_side_v1.jpg?width=500&resize=contain&quality=75","hedge":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-7/MTO-PL-7_03_front_v1.jpg?width=500&resize=contain&quality=75","polycarb":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-7/MTO-PL-7_04_closeup_v1.jpg?width=500&resize=contain&quality=75","corten":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-7/MTO-PL-7_06_scene2_v1.jpg?width=500&resize=contain&quality=75","stone":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-8/MTO-PL-8_01_hero_v1.jpg?width=500&resize=contain&quality=75","frp":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-8/MTO-PL-8_02_side_v1.jpg?width=500&resize=contain&quality=75","pump":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-8/MTO-PL-8_03_front_v1.jpg?width=500&resize=contain&quality=75","rafter":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-8/MTO-PL-8_04_closeup_v1.jpg?width=500&resize=contain&quality=75","bamboo":"https://ewgpvclqbnaeucvjnuch.supabase.co/storage/v1/render/image/public/product-images/ai/MTO-PL-8/MTO-PL-8_06_scene2_v1.jpg?width=500&resize=contain&quality=75"};   // 176: the parts photo library (Runway, MTO-PL-1..8 in the admin — drafts, not for sale)
  var PART_RE = [[/^(pergola|projection)/i, 'louver'], [/^floor/i, 'wpcdeck'], [/^doors?\b/i, 'door'], [/^windows?\b/i, 'window'], [/^(lighting|lights)\b/i, 'ledpanel'], [/^electrical/i, 'switch'], [/^base\b/i, 'base-gi'], [/^frame\b[\s\S]*alumin/i, 'frame-alu'], [/^frame\b/i, 'frame-ms'], [/^roof\b[\s\S]*glass/i, 'glassroof'], [/^walls?\b[\s\S]*puf/i, 'puf'], [/glass roof|laminated glass|purlin/i, 'glassroof'], [/dgu|double glass|double glaz/i, 'dgu'], [/flut.*glass|frost|reeded/i, 'frosted'], [/toughened|glass/i, 'glass'],
    [/puf|sandwich|insulated panel/i, 'puf'], [/alumin.*(louver|louvre)|louver|louvre/i, 'louver'], [/rafter/i, 'rafter'], [/alumin/i, 'frame-alu'], [/galvan|gi |base frame|levelling|adjustable feet|deck on/i, 'base-gi'],
    [/ms |mild steel|shs|rhs|steel tube|steel frame|ms\b/i, 'frame-ms'], [/sliding door|slide/i, 'slidedoor'], [/door/i, 'door'], [/window/i, 'window'], [/led strip|strip light/i, 'ledstrip'], [/led|light/i, 'ledpanel'],
    [/switch|socket|wiring|electrical/i, 'switch'], [/metal sheet|false ceiling/i, 'metalroof'], [/gutter|downpipe/i, 'gutter'], [/wpc.*(deck|floor)|decking/i, 'wpcdeck'], [/wpc|fluted panel/i, 'wpcslat'], [/hpl/i, 'hpl'],
    [/jali|jaali|laser/i, 'jali'], [/powder coat/i, 'powder'], [/teak/i, 'teak'], [/acacia|hardwood|wood/i, 'acacia'], [/rattan|wicker|weave/i, 'rattan'], [/cushion|fabric/i, 'fabric'], [/stainless|ss 304|ss304|bolt|screw/i, 'ss'],
    [/anchor|fastener/i, 'anchor'], [/granite|quartz/i, 'granite'], [/onyx/i, 'onyx'], [/pu stone|pu-stone/i, 'pustone'], [/mosaic|tile/i, 'mosaic'], [/hedge|artificial grass|green wall/i, 'hedge'], [/polycarbonate/i, 'polycarb'],
    [/corten|patina|rust/i, 'corten'], [/stone|cladding|marble/i, 'stone'], [/frp|fibreglass|fiberglass/i, 'frp'], [/pump|nozzle/i, 'pump'], [/bamboo/i, 'bamboo']];
  var NOT_PART = /open area|shown|^heights?$|^widths?$|^sizes?$|detail|options|weight|clear height/i;
  var PART_GROUPS = /^(construction|build|structure|finish|mounting|fittings|pots|design|materials?|frame|roof|walls?|doors?|what's included)$/i, PART_LABEL = /^(walls?|roof|floor|frame|lighting|lights|electrical|doors?|windows?|glass|pergola projection|posts|panels?|panel frame|top|body|cladding|hardware|base|deck|cushions?|fabric|materials?|structure)$/i;
  function isPart(sp) { return (PART_GROUPS.test(String(sp.group || '').trim()) || PART_LABEL.test(String(sp.label || '').trim())) && !NOT_PART.test(sp.label); }
  function partImg(t) { for (var i = 0; i < PART_RE.length; i++) if (PART_RE[i][0].test(t) && PART_IMG[PART_RE[i][1]]) return PART_IMG[PART_RE[i][1]]; return ''; }
  // 177: thin line icons for the order steps, picked from each step's title
  var SI = {
    pay: '<path d="M3 7h18v10H3z"/><path d="M3 10h18"/><path d="M7 14h3"/>',
    draw: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
    make: '<path d="M3 20h18"/><path d="M5 20V10l5 3V10l5 3V7l4 2v11"/>',
    ship: '<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/>',
    fit: '<path d="M14 6a4 4 0 0 0-5 5l-6 6 3 3 6-6a4 4 0 0 0 5-5l-3 3-2-2z"/>',
    ok: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
    measure: '<path d="M3 15l12-12 6 6-12 12z"/><path d="M7 11l2 2M10 8l2 2M13 5l2 2"/>',
    home: '<path d="M4 11l8-6 8 6v9H4z"/><path d="M10 20v-5h4v5"/>'
  };
  function stepIcon(t) { t = String(t || '').toLowerCase();
    var k = /pay|order|advance|balance|book/.test(t) ? 'pay' : /draw|design|approve/.test(t) ? 'draw' : /measure|site|visit|survey/.test(t) ? 'measure' : /mak|build|craft|factory|product/.test(t) ? 'make'
      : /dispatch|deliver|ship|transit/.test(t) ? 'ship' : /install|fit|assembl/.test(t) ? 'fit' : /hand|done|complete|enjoy/.test(t) ? 'home' : 'ok';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + SI[k] + '</svg>'; }
  // 177: the parts list, for the customised cabin's last step (next to its price)
  // ------------------------------------------------------------ "Factory-made. Installed in 2 days." — what every pergola order gets (the same for every design)
  var TRUST_IMG = ['/img/trust/pg-weld.jpg', '/img/trust/pg-coat.jpg', '/img/trust/pg-pack.jpg', '/img/trust/pg-fit.jpg'];
  var TRUST_CB = ['/img/trust/cb-panel.jpg', '/img/trust/cb-glass.jpg', '/img/trust/cb-kit.jpg', '/img/trust/cb-fit.jpg'];
  function isCab(id) { return /^MTO-CB-(GLASS|HYBRID|PORTA)$/.test(String(id || '')); }
  function trustSec(m) {
    if (!S || !isProp(S.id)) return '';
    var cab = isCab(S.id);
    if (!document.getElementById('trustCss')) { var st = document.createElement('style'); st.id = 'trustCss';
      st.textContent = '.tr-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:14px}.tr-c{background:#fff;border:1px solid var(--line,#e8e2d8);border-radius:14px;overflow:hidden;display:flex;flex-direction:column}' +
        '.tr-c img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;background:#efe9df}.tr-c div{padding:12px 13px 14px}.tr-c b{display:flex;align-items:center;gap:8px;font-size:14.5px;margin-bottom:4px}.tr-c b svg{flex:none;color:var(--terra,#BE5633)}.tr-c p{margin:0;font-size:12.5px;line-height:1.5;color:#5d574e}' +
        '.tr-line{display:flex;flex-wrap:wrap;gap:8px 18px;margin-top:14px;font-size:12.5px;color:#3c3a36}.tr-line span{display:inline-flex;align-items:center;gap:6px}.tr-line em{font-style:normal;width:20px;height:20px;border-radius:50%;background:var(--terra,#BE5633);color:#fff;font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center}' +
        '@media(max-width:760px){.tr-cards{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.tr-c p{font-size:11.5px}}';
      document.head.appendChild(st); }
    if (!(isPg(S.id) || isCab(S.id))) return trustGen(m);
    var ic = function (d) { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
    var C = cab ? [
      [ic('<path d="M3 21h18M5 21V9l7-5 7 5v12"/><path d="M9 21v-6h6v6"/>'), 'Made in the factory', 'Steel frame, insulated PUF wall panels and glass units are made in the factory to your approved drawing.'],
      [ic('<path d="M4 4h16v16H4z"/><path d="M4 12h16M12 4v16"/>'), 'Factory finish', 'Powder-coated frame and ready-finished panels; doors, windows and glass come fitted in their frames.'],
      [ic('<path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/>'), 'Delivered as a kit', 'Frame, panels, glass and doors are packed, numbered and delivered together on one truck.'],
      [ic('<path d="M14 7l3-3 3 3-3 3M17 4v7"/><path d="M4 20l8-8M9 13l2 2"/>'), 'Assembled in 2–5 days', 'Male–female panels lock into each other and are screwed tight to the frame. No welding, no civil work by us.']] : [
      [ic('<path d="M3 21h18M5 21V9l7-5 7 5v12"/><path d="M9 21v-6h6v6"/>'), 'Made in the factory', 'Cut, welded and drilled in the factory to your approved drawing, in frames sized to travel.'],
      [ic('<path d="M4 7h16v4H4zM6 11v9M18 11v9M9 15h6"/>'), 'Factory finish', 'Zinc primer and powder coat, baked in an oven: an even colour with no brush marks.'],
      [ic('<path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/>'), 'Packed & numbered', 'Every part is pre-drilled, tagged and wrapped, packed with its bolts and base plates.'],
      [ic('<path d="M14 7l3-3 3 3-3 3M17 4v7"/><path d="M4 20l8-8M9 13l2 2"/>'), 'Installed in 2 days', 'The factory frames bolt together at your home, with small touch-up welds only. Up to 12 × 10 ft is installed in 2 days.']];
    var days = daysTxt(m.make_days) || (cab ? '20–30 days' : '15–25 days'), IMG = cab ? TRUST_CB : TRUST_IMG;
    return '<section class="mf" id="mfTrust"><h2>' + (cab ? 'Factory-made. Assembled in 2–5 days.' : 'Factory-made. Installed in 2 days.') + '</h2><p class="mf-sub">' + (cab ? 'Every cabin is made in the factory and put together at your site — built for Indian heat, monsoon rain and strong winds' : 'Every pergola is made in the factory and bolted together at your home') + '</p><div class="tr-cards">' +
      C.map(function (c, i) { return '<div class="tr-c"><img src="' + IMG[i] + '" alt="" loading="lazy" onerror="this.remove()"><div><b>' + c[0] + esc(c[1]) + '</b><p>' + esc(c[2]) + '</p></div></div>'; }).join('') + '</div>' +
      (cab ? '<div class="tr-line" style="font-weight:600"><span><em>✓</em>10-year warranty on all items</span><span><em>✓</em>Built for Indian weather — heat, monsoon, strong winds</span><span><em>✓</em>No civil work by us — sits on our steel deck</span><span><em>✓</em>Electrical + LED lights included</span><span><em>✓</em>Damage in delivery or assembly is ours to fix</span></div>' +
        '</section>'
      : '<div class="tr-line" style="font-weight:600"><span><em>✓</em>3-year warranty on the steel frame</span><span><em>✓</em>Built for Indian weather and Delhi wind loads</span><span><em>✓</em>Damage in delivery or fitting is ours to fix</span><span><em>✓</em>Fixed on steel base plates with chemical anchors</span></div>' +
        '</section>');   // 8: the steps are in "How your order is made" just below
  }
  function partsMini() { var ps = arr(mtoFull.parts); if (!ps.length) return '';
    return '<div class="wz-parts"><b>What goes into it</b><ul>' + ps.map(function (p) { return '<li><span>' + esc(p.name) + '</span><small>' + esc(p.spec) + '</small></li>'; }).join('') + '</ul></div>'; }
  function mtoFull(x, m, stp, faqs, own) {
    mtoFull.args = [x, m, stp, faqs, own];
    var pdp = document.getElementById('pdp'), cmp = document.getElementById('cmpSec'); if (!pdp || !cmp) return;
    var el = document.getElementById('mtoFull'); if (!el) { el = document.createElement('div'); el.id = 'mtoFull'; var at = document.getElementById('pdMore') || cmp; at.parentNode.insertBefore(el, at); el.addEventListener('click', function (e) { var t = e.target.closest('[data-pimg]'); if (t && window.lbxOne) window.lbxOne(t.getAttribute('data-pimg')); }); }
    var specs = arr(m.specs).filter(function (s) { return s && s.label && s.value; }), parts = arr(m.parts).length ? arr(m.parts) : specs.filter(isPart).map(function (s) { return { name: s.label, spec: s.value }; });
    var rest = arr(m.parts).length ? specs : specs.filter(function (s) { return !isPart(s); });
    var nm = String(x.n || '').replace(/ — .*$/, '');
    var h = '';
    var seen = m.unit === 'cabin' ? !!(S && S.cabDone) : mtoOk();   // 177: shown with the price, not before
    mtoFull.parts = parts; mtoFull.nm = nm;
    h += trustSec(m);   // pergolas: factory-made, finish, 2-day install, warranty
    if (parts.length && seen && !isProp(S.id)) h += '<section class="mf" id="mfParts"><h2>What goes into it</h2><p class="mf-sub">Every part of your ' + esc(nm.toLowerCase()) + ' — the same parts as on your drawing</p><div class="mf-parts">' +
      parts.map(function (p) { var im = p.img || partImg(p.name + ' ' + p.spec); return '<div class="mf-part">' + (im ? '<button type="button" class="mf-pi" data-pimg="' + esc(im) + '" aria-label="See the photo of ' + esc(p.name) + '"><img src="' + esc(im) + '" alt="' + esc(p.name) + '" loading="lazy"></button>' : '<span class="mf-pi mf-noimg">' + esc(String(p.name).charAt(0)) + '</span>') +
        '<div><b>' + esc(p.name) + '</b>' + (p.brand ? '<small class="mf-br">' + esc(p.brand) + '</small>' : '') + '<small>' + esc(p.spec) + '</small></div></div>'; }).join('') + '</div></section>';
    if (isProp(S.id)) rest = rest.filter(function (s) { return !/^installation$/i.test(s.label); });   // said once below, with the install-yourself choice
    var kv = rest.map(function (s) { return '<div><span>' + esc(s.label) + (s.group && rest.filter(function (z) { return z.label === s.label; }).length > 1 ? ' · ' + esc(s.group) : '') + '</span><b>' + esc(s.value) + '</b></div>'; }).join('') +
      '<div><span>Made in</span><b>' + esc(daysTxt(m.make_days) || '—') + ' after you order' + (m.drawing !== 'no' ? ' (and approve the drawing)' : '') + '</b></div><div><span>Installation</span><b>' + (isProp(S.id) && m.install && m.install.offered ? (m.install.required ? 'Included — by your nearest outrr installer' : 'By your nearest outrr installer, or by you (assembly guide + all hardware in the package)') : m.install && m.install.required ? 'Included' : m.install && m.install.offered ? 'Optional — priced for your city' : 'By you, with the fixing guide') + '</b></div><div><span>SKU</span><b>' + esc(x.sku || S.id) + ' · Made in India</b></div>';
    h += '<section class="mf"><h2>Specifications</h2><div class="mf-spec">' + kv + '</div></section>';
    h += '<section class="mf"><h2>How your order is made</h2><p class="mf-sub">You see and approve everything before making starts</p><div class="mf-steps">' + stp.map(function (t, i) { var q = t.split('|'); return '<div><i class="mf-ic" aria-hidden="true">' + stepIcon(q[0]) + '<em>' + (i + 1) + '</em></i><b>' + esc(q[0]) + '</b><small>' + esc(q[1]) + '</small></div>'; }).join('') + '</div></section>';
    h += '<section class="mf" id="mfRev"><h2>Reviews</h2><p class="mf-sub">Only verified buyers can review, after delivery — with photos of their own</p><div class="mf-rv"></div></section>';
    var mine = faqs.slice(0, own), seen = mine.map(function (f) { return String(f.q).toLowerCase().trim(); }), ours = faqs.slice(own).filter(function (f) { return seen.indexOf(String(f.q).toLowerCase().trim()) < 0; });
    var qa = function (f, i) { return '<details' + (i === 0 ? ' open' : '') + '><summary>' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p></details>'; };
    h += '<section class="mf"><h2>Questions, answered</h2><p class="mf-sub">What people ask before ordering</p><div class="mf-faq"><aside><b>Still have a question?</b><p>Talk to our design team on WhatsApp — send your site photos and size, we reply within a few hours.</p><button type="button" onclick="var w=document.querySelector(\'.wafab\');if(w)w.click()">💬 Ask on WhatsApp</button></aside><div>' +
      (mine.length ? '<div class="mf-cat">About this ' + esc(nm.toLowerCase()) + '</div>' + mine.map(qa).join('') : '') + '<div class="mf-cat">Order, payment &amp; delivery</div>' + ours.map(function (f, i) { return qa(f, mine.length ? 1 : i); }).join('') + '</div></div></section>';
    el.innerHTML = h;
    var rl = document.getElementById('pdRevList'); if (rl) { if (!mtoFull.home) mtoFull.home = rl.parentNode; el.querySelector('.mf-rv').appendChild(rl); }
    pdp.classList.add('pdp-mtofull');
  }
  window.mtoShowParts = function () { if (mtoFull.args) mtoFull.apply(null, mtoFull.args); };
  window.mtoPdpReset = function () {
    try { var mf = document.getElementById('mtoFull'), rl = document.getElementById('pdRevList'); if (rl && mtoFull.home && rl.parentNode !== mtoFull.home) mtoFull.home.insertBefore(rl, mtoFull.home.firstChild); if (mf) mf.remove(); var pp = document.getElementById('pdp'); if (pp) pp.classList.remove('pdp-mtofull'); } catch (e) {}
    try { var sd = document.getElementById('cbStudio'); if (sd) sd.classList.remove('open'); document.body.classList.remove('cb-studio', 'cbs-big'); var cc = document.querySelector('.ctas .cbcta'); if (cc) cc.remove(); var cm = document.getElementById('cmpSec'); if (cm) cm.style.display = ''; } catch (e) {}
    if (S) { S.studio = false; S.big = false; }
    var p = document.getElementById('pdp'); if (p) p.classList.remove('pdp-mto', 'pdp-cab'); document.body.classList.remove('pdp-mto-on', 'pdp-cab-on');
    ['cbStage', 'cbSheet'].forEach(function (k) { var e = document.getElementById(k); if (e) e.remove(); }); var cb = document.querySelector('.ctas .cbbar'); if (cb) cb.remove();
    ['mtoCfg', 'mtoAccs', 'mtoChip', 'mtoChip2'].forEach(function (k) { var e = document.getElementById(k); if (e) e.remove(); });
    try { var dh = window.mtoPdp.descHome; if (dh) { dh[0].classList.remove('mto-desc'); dh[1].insertBefore(dh[0], dh[2] && dh[2].parentNode === dh[1] ? dh[2] : null); window.mtoPdp.descHome = null; } } catch (e) {}
    try { window.mtoProposal(false); } catch (e) {}
    if (S) S.pdp = false;
  };
  window.mtoPdp = function (id) {
    if (!mtoInit(id)) return; S.pdp = true; pdpWire();
    var x = PRODS[id], m = x.cz, u = m.unit, uw = UW(u), pdp = document.getElementById('pdp'); pdp.classList.add('pdp-mto'); document.body.classList.add('pdp-mto-on');
    if (u === 'cabin') { pdp.classList.add('pdp-cab'); document.body.classList.add('pdp-cab-on'); S.v3 = null; var j0 = JSON.stringify(m.cabin.layout); S.tpl = (arr(m.cabin.templates).filter(function (t) { return JSON.stringify(t.layout) === j0; })[0] || {}).code || null; S.furn = furnGuess(x); S.night = false; S.sel3 = null; }
    var c0 = arr((arr(m.materials)[0] || {}).colours)[0]; if (c0 && !S.o.colour) S.o.colour = c0.name;
    setTimeout(function () { try { colGal(); } catch (e) {} }, 0);   // 187
    var mats = arr(m.materials).filter(function (y) { return String(y.name || '').trim(); }), lo = mats.length ? Math.min.apply(null, mats.map(function (y) { return +y.rate || 0; })) : 0;
    var pr = document.getElementById('pdPrice'); if (pr && x.oo !== false) pr.innerHTML = '<span class="mfrom">From</span> ' + rs(x.p) + (u !== 'fixed' && u !== 'cabin' && u !== 'seat' && lo ? '<span class="mrplab">' + rs(lo) + ' / ' + uw + '</span>' : '');
    var tl = document.querySelector('#pdp .taxline'); if (tl) { tl.style.display = ''; tl.textContent = 'Inclusive of GST · priced for your size and options below'; }
    var sk = document.getElementById('pdSku'); if (sk) sk.textContent = 'SKU ' + id + ' · ' + ((window.COLS_T && COLS_T(x.col)) || '') + ' · Made to Order';
    var own = /^MTO-/.test(id), instOn = m.install && (m.install.offered || m.install.required);
    var mt = document.getElementById('pdMat'); if (mt) mt.textContent = own ? 'outrr in-house design' + (instOn ? ' · installed by your nearest outrr installer' : '') : (x.mat || '');   // 7
    var mf0 = document.getElementById('pdMfr'); if (mf0 && own) mf0.innerHTML = 'Designed in-house by <b>outrr</b> (a LifeWall Group company). Made in India by a verified outrr factory partner, to the drawing you approve.' + (instOn ? ' Installed by your nearest verified outrr installer' + (isPg(id) ? ' — or by you, with the assembly guide and all hardware in the package.' : '.') : '') + ' GST invoice on every order.';
    if (own) { var cm0 = document.getElementById('cmpSec'); if (cm0) cm0.style.display = 'none'; }   // 19: compare only for branded designs
    if (isProp(id)) propCss();
    if (isProp(id)) { var dsc = document.getElementById('pdDesc'), dc = dsc && dsc.closest('.pcard'), tc = document.querySelector('#pdp .pdp-info .pcard');   // 3: the description + its tags right under the title
      if (dc && tc && dc !== tc && tc.nextSibling !== dc) { window.mtoPdp.descHome = [dc, dc.parentNode, dc.nextSibling]; tc.parentNode.insertBefore(dc, tc.nextSibling); } dc && dc.classList.add('mto-desc'); }
    // the configurator card: right under the title card
    var first = document.querySelector('#pdp .pdp-info .pcard'), cfg = document.createElement('div'); cfg.id = 'mtoCfg'; cfg.className = 'pcard mto-pcfg';
    if (isProp(id) && first.nextSibling && first.nextSibling.classList && first.nextSibling.classList.contains('mto-desc')) first = first.nextSibling;
    first.parentNode.insertBefore(cfg, first.nextSibling);
    // details: the design's own specifications
    var kv = document.getElementById('pdKV');
    if (kv) kv.innerHTML = arr(m.specs).map(function (sp) { return '<div class="k">' + esc(sp.label) + '</div><div class="v">' + esc(sp.value) + '</div>'; }).join('') +
      '<div class="k">Made in</div><div class="v">' + esc(daysTxt(m.make_days) || '—') + ' after you order' + (m.drawing !== 'no' ? ' (and approve the drawing)' : '') + '</div>' +
      '<div class="k">Installation</div><div class="v">' + (m.install && m.install.required ? 'Included — by ' + (m.install.by === 'brand' ? esc(x.br || 'the maker') : 'a verified outrr partner') : m.install && m.install.offered ? 'Optional' : 'By you, with a fixing guide') + '</div>' +
      '<div class="k">SKU</div><div class="v">' + esc(id) + ' · Made in India</div>';
    var sz = document.getElementById('pdSize'); if (sz) sz.innerHTML = '';
    var ch = document.getElementById('pdShip'); if (ch) { var c1 = document.createElement('span'); c1.id = 'mtoChip'; c1.className = 'chip'; c1.textContent = isProp(id) && m.install && m.install.offered && !m.install.required ? 'Installed by outrr — or by you' : m.install && m.install.required ? 'Installed by outrr' : m.install && m.install.offered ? 'Installation available' : 'Fixing guide included'; ch.parentNode.insertBefore(c1, ch.nextSibling); var c2 = document.createElement('span'); c2.className = 'chip'; c2.textContent = 'Made to order · returns only for defects'; c1.appendChild(document.createTextNode('')); ch.parentNode.insertBefore(c2, c1.nextSibling); c2.id = 'mtoChip2'; }
    // accordions: how it's made + questions (the ready-to-ship delivery / returns one is hidden)
    var acc = document.createElement('div'); acc.id = 'mtoAccs';
    var stp = ['Order & pay ' + PCT + '%|Size and options locked', 'Drawing|' + (m.drawing === 'no' ? 'Not needed' : 'Approve it online'), 'Making|' + (daysTxt(m.make_days) || 'Made for you'), 'Balance|Pay the rest before dispatch', (m.install && m.install.offered ? 'Installation|By our partner, OTP on completion' : 'Delivery|Tracking shared')];
    var faqs = arr(m.faqs).concat([{ q: 'How do I measure?', a: (u === 'area' ? 'Measure the floor area it should cover, post to post, in feet.' : u === 'face' ? 'Measure the width and height of the wall or opening, in feet.' : u === 'length' ? 'Measure the total running length, in feet.' : 'Pick the size that fits your space.') + ' Not sure? We check it with you on the drawing.' },
      { q: 'When do I pay the rest?', a: 'You pay ' + PCT + '% now. The rest is paid when it is ready, before dispatch: we email you the link.' },
      { q: 'Can I cancel or return it?', a: 'It is made for you, so it can’t be cancelled once production starts or returned for a change of mind. A defect or damage in delivery is fixed by the maker.' }]);
    acc.innerHTML = '<div class="acc"><div class="acc-h" onclick="accT(this)">How your order is made<span class="pm">+</span></div><div class="acc-b"><ol class="mto-stp">' + stp.map(function (t) { var p = t.split('|'); return '<li><b>' + esc(p[0]) + '</b> — ' + esc(p[1]) + '</li>'; }).join('') + '</ol></div></div>' +
      '<div class="acc"><div class="acc-h" onclick="accT(this)">Questions<span class="pm">+</span></div><div class="acc-b">' + faqs.map(function (f) { return '<p class="mto-q"><b>' + esc(f.q) + '</b><br>' + esc(f.a) + '</p>'; }).join('') + '</div></div>';
    var why = [].slice.call(document.querySelectorAll('#pdp .acc')).filter(function (a) { return /Why outrr/.test(a.textContent); })[0];
    mtoFull(x, m, stp, faqs, arr(m.faqs).length);   // 176: details, how it's made, reviews and questions — full width under the product
    [].slice.call(document.querySelectorAll('#pdp .acc')).forEach(function (a) { if (/Delivery, assembly/.test((a.querySelector('.acc-h') || {}).textContent || '')) a.classList.add('rts-only'); });
    try { if (window.otrack) otrack('view_item', { sku: id, value: x.p }); } catch (e) {}
    drawPdp();
    if (u === 'cabin') { cbCtas(); var cm = document.getElementById('cmpSec'); if (cm) cm.style.display = 'none'; if (window.__cbsOpen === id) { window.__cbsOpen = null; setTimeout(function () { window.cbStudio(true); }, 50); } }
  };
  function sel(attr, list, cur, lab) {   // a picklist; list = [[value, label]]
    return '<label class="mto-pk"><span>' + lab + '</span><select ' + attr + '>' + list.map(function (v) { return '<option value="' + esc(v[0]) + '"' + (String(v[0]) === String(cur) ? ' selected' : '') + '>' + esc(v[1]) + '</option>'; }).join('') + '</select></label>';
  }
  function drawPdp() {
    var x = PRODS[S.id], m = x.cz, o = S.o, u = m.unit, uw = UW(u), el = document.getElementById('mtoCfg'); if (!el) return;
    var mats = arr(m.materials).filter(function (y) { return String(y.name || '').trim(); }), mat = mats.filter(function (y) { return y.name === o.material; })[0] || mats[0];
    var hOpts = arr(m.h && m.h.options), f = [];
    if (u === 'cabin') { cbHist(); el.innerHTML = cabinUI(m, o); if (S.studio) cbsGroup(el); cbStage(); cbSheet(); paint(); return mount3d(); }
    var np = !mtoOk();   // 172: before sign-in every variant shows (to see the finishes / colours / photos), only the prices wait
    if (u === 'seat') { var sv = []; for (var i = num(m.n.min); i <= num(m.n.max); i++) sv.push([i, i + ' seats']); f.push(sel('data-pick="n"', sv, o.n, 'Seats')); }
    else if (u === 'fixed') f.push(sel('data-pick="size"', [['', 'Choose a size']].concat(arr(m.sizes).map(function (z) { return [z.label, z.label + (np ? '' : ' — ' + rs(fixedAt(m, mat, z)))]; })), o.size, 'Size'));
    else {
      if (u === 'area' || u === 'length') f.push('<label class="mto-pk"><span>Length (ft)</span><input inputmode="decimal" data-k="l" value="' + esc(o.l) + '" placeholder="' + esc(m.l.min) + '–' + esc(m.l.max) + '"></label>');
      if (u === 'area' || u === 'face') f.push('<label class="mto-pk"><span>' + (m.panels ? 'Running length (ft)' : 'Width (ft)') + '</span><input inputmode="decimal" data-k="w" value="' + esc(o.w) + '" placeholder="' + esc(m.w.min) + '–' + esc(m.w.max) + '"></label>');
      if (hOpts.length) f.push(sel('data-k="h"', hOpts.map(function (h) { return [h, h + ' ft']; }), o.h, 'Height'));
      else if (u === 'face') f.push('<label class="mto-pk"><span>Height (ft)</span><input inputmode="decimal" data-k="h" value="' + esc(o.h) + '" placeholder="' + esc(m.h.min) + '–' + esc(m.h.max) + '"></label>');
    }
    if (mats.length > 1) f.push(sel('data-pick="material"', mats.map(function (y) { return [y.name, y.name + (np ? '' : u === 'fixed' ? (+y.rate ? ' (+' + rs(y.rate) + ')' : '') : m.panels ? '' : ' — ' + rs(y.rate) + ' / ' + uw)]; }), mat && mat.name, esc((m.labels && m.labels.material) || 'Finish')));
    var cols = arr(mat && mat.colours);
    if (cols.length) f.push(sel('data-pick="colour"', [].concat(cols.map(function (c) { return [c.name, c.name + (!np && +c.extra ? ' (+' + rs(c.extra) + ' / ' + uw + ')' : '')]; })), o.colour, esc((m.labels && m.labels.colour) || 'Colour')));
    arr(m.groups).filter(function (g) { return g.name && arr(g.options).length; }).forEach(function (g) {
      f.push(sel('data-grp="' + esc(g.name) + '"', arr(g.options).filter(function (y) { return y.name; }).map(function (y) {
        var pr = [+y.fixed ? (+y.fixed > 0 ? '+' : '−') + rs(Math.abs(y.fixed)) : '', +y.rate ? '+' + rs(y.rate) + ' / ' + uw : '', +y.rate_w ? '+' + rs(y.rate_w) + ' / ft width' : ''].filter(Boolean).join(' ');
        return [y.name, y.name + (pr && !np ? ' (' + pr + ')' : '')]; }), (o.groups || {})[g.name], esc(g.name)));
    });
    var adds = arr(m.addons).filter(function (a) { return a.name; });
    if (isPg(S.id)) {   // pergolas: every choice is made in the 3D customiser; price, drawings and site details are on the proposal after it
      var pq0 = pgOpts(); if (!num(o.l)) o.l = pq0.l; if (!num(o.w)) o.w = pq0.w;
      if (!S.pgLegacy) { el.innerHTML = p3Btn() + propInfo(x, m); ctaPaint(null); return; }
      var rows = [['Size', o.l + ' × ' + o.w + ' ft']]; if (mats.length > 1 && mat) rows.push([(m.labels && m.labels.material) || 'Finish', mat.name]); if (o.colour) rows.push([(m.labels && m.labels.colour) || 'Colour', o.colour]);
      arr(m.groups).filter(function (g) { return g.name && arr(g.options).length; }).forEach(function (g) { var v = (o.groups || {})[g.name] || (arr(g.options)[0] || {}).name; if (v) rows.push([g.name, String(v).split(' (')[0]]); });
      if (adds.length) rows.push(['Add-ons', arr(o.addons).length ? o.addons.join(', ') : 'None']);
      el.innerHTML = p3Btn() + '<div class="pg-sum"><div class="pg-sum-h"><b>Your pergola</b><button type="button" data-act="pg3">Change in 3D</button></div>' + rows.map(function (r) { return '<div class="pg-sum-r"><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('') + '</div>' +
        (np ? lockHTML(x, true) : pdpTail(x, m, o) + '<div class="mto-sum lt" id="mtoSum"></div>');
      if (np) { ctaPaint(null); return; }
      return paint();
    }
    if (isProp(S.id) && !S.pgLegacy) { el.innerHTML = cuBtn() + propInfo(x, m); ctaPaint(null); if (CU.open) cuDraw(); return; }   // 198
    var hint = u === 'area' ? 'Length × width of the floor it covers, in feet.' : u === 'face' && m.panels ? 'Total length to cover — made in ' + panelSizes(m).join(' / ') + ' ft panels.' : u === 'face' ? 'Width × height of the wall or opening, in feet.' : u === 'length' ? 'Total running length, in feet.' : '';
    el.innerHTML = p3Btn() + '<h3 class="mto-ph">' + (m.labels ? 'Choose your options' : 'Choose your size &amp; options') + '</h3>' + (m.photo_note ? '<p class="mto-hint">Photo shows: ' + esc(m.photo_note) + '</p>' : '') + (hint ? '<p class="mto-hint">' + hint + '</p>' : '') + '<div class="mto-pks">' + f.join('') + '</div>' +
      (adds.length ? '<div class="mto-adds"><span class="mto-al">Add-ons</span>' + adds.map(function (a) { return '<label class="mto-chk"><input type="checkbox" data-add="' + esc(a.name) + '"' + (o.addons.indexOf(a.name) >= 0 ? ' checked' : '') + '><span>' + esc(a.name) + '</span>' + (np ? '' : '<span class="r">+' + rs(a.price) + (a.charge === 'unit' ? ' / ' + uw : '') + '</span>') + '</label>'; }).join('') + '</div>' : '') +
      (np ? lockHTML(x, true) : pdpTail(x, m, o) + '<div class="mto-sum lt" id="mtoSum"></div>');
    if (np) { ctaPaint(null); return; }
    paint();
  }
  function pdpTail(x, m, o, noInst) {   // pincode (installation / delivery), drawing, note
    var inst = m.install && m.install.offered, instReq = inst && m.install.required, drw = m.drawing || 'choose', h = '';
    if (inst || hasDlv(m)) h += '<div class="mto-pks" style="margin-top:10px"><label class="mto-pk"><span>Your pincode</span><input inputmode="numeric" maxlength="6" data-k="pin" value="' + esc(o.pin) + '" placeholder="e.g. 110001"></label>' +
      (drw === 'choose' ? sel('data-pick="drawing"', [['1', 'Yes — send me a drawing to approve'], ['0', 'No — make it to my size']], o.drawing ? '1' : '0', 'Drawing before making?') : '') + '</div>';
    else if (drw === 'choose') h += '<div class="mto-pks" style="margin-top:10px">' + sel('data-pick="drawing"', [['1', 'Yes — send me a drawing to approve'], ['0', 'No — make it to my size']], o.drawing ? '1' : '0', 'Drawing before making?') + '</div>';
    if (inst && !noInst) h += instReq ? '<p class="mto-hint" style="margin-top:8px">Installation included · <span id="mtoInstTxt"></span></p>' : '<label class="mto-chk"><input type="checkbox" data-k="install"' + (o.install ? ' checked' : '') + '><span><b>Add installation</b> · <span id="mtoInstTxt"></span></span></label>';
    if (drw === 'always') h += '<p class="mto-hint">We send you a drawing to approve before making it' + (daysTxt(m.drawing_days) ? ' (' + daysTxt(m.drawing_days) + ')' : '') + '.</p>';
    if (!o.drawing || drw === 'no') h += '<div class="mto-warn">Made exactly to the size you enter — please check it.</div><label class="mto-chk"><input type="checkbox" data-k="size_ok"' + (o.size_ok ? ' checked' : '') + '><span>I have checked my size and I take responsibility for it.</span></label>';
    h += '<details class="mto-note"><summary>Add a note for the maker</summary><textarea rows="2" data-k="note" maxlength="500">' + esc(o.note) + '</textarea></details>';
    return h;
  }
  function ctaPaint(q) {   // the page's own Buy button (and the sticky bar) follow the configuration
    var x = PRODS[S.id], closed = x.oo === false;
    if (isProp(S.id) && x.cz.unit !== 'cabin' && !S.pgLegacy) { document.querySelectorAll('button[onclick="buyNow()"]').forEach(function (b) { b.style.display = ''; b.disabled = false; b.classList.remove('soonbtn'); b.title = ''; b.textContent = 'Customise & check price'; });
      document.querySelectorAll('button[onclick="addCart()"]').forEach(function (b) { b.style.display = 'none'; }); return; }
    document.querySelectorAll('button[onclick="buyNow()"]').forEach(function (b) { b.style.display = ''; var o = S.o, needPin = q && q.ok && q.delivery && q.delivery.fee == null, noInst = q && q.ok && o.install && q.install && !q.install.available, needOk = !o.drawing && !o.size_ok;
      if (!mtoOk() && x.cz.unit !== 'cabin') { b.disabled = false; b.textContent = 'Check price'; return; }   // 172
      b.disabled = closed; b.textContent = closed ? 'Coming soon' : !(q && q.ok) ? 'Choose your size' : needPin || noInst ? 'Enter your pincode' : needOk ? 'Confirm your size' : 'Order now · pay ' + rs(q.pay_now); });
    document.querySelectorAll('button[onclick="addCart()"]').forEach(function (b) { b.style.display = closed ? 'none' : ''; b.disabled = closed; b.textContent = S.editK ? 'Update cart' : 'Add to cart'; });   // 190
  }

  // a colour with its own photo (pergola finishes): picking the colour shows that photo
  window.mtoColourOf = function (id) { return S && S.id === id ? S.o.colour : null; };   // 187: the product page shows the picked finish's photos
  function colGal() { if (!S || !window.GALC || !(GALC[S.id] || []).length || !window.pdThumbs) return false;
    var G = window.PDG; if (!G || G.id !== S.id) return false; window.pdThumbs(S.id);   // a finish without its own photos: every photo again
    if (!GALC[S.id].some(function (g) { return g[1] === S.o.colour; })) return false; if (window.pdGo) window.pdGo(0); return true; }
  function colPic(name) { if (colGal()) return; var x = PRODS[S.id], c = null; arr(x && x.cz && x.cz.materials).forEach(function (mm) { arr(mm.colours).forEach(function (cc) { if (cc.name === name) c = cc; }); }); if (!c || !c.img) return;
    var key = function (u) { u = String(u || '').split('?')[0]; return u.split('product-images/')[1] || u; }, g = gal(S.id).map(key), k = g.indexOf(key(c.img)); if (k >= 0) S.img = k;
    var G = window.PDG; if (G && G.id === S.id && window.pdGo) { var j = G.list.map(key).indexOf(key(c.img)); if (j >= 0) window.pdGo(j); } }   // the product page's own gallery
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
    var colHtml = cols.length ? '<p style="font-size:13px;color:#4A4640;margin:6px 0">' + esc((m.labels && m.labels.colour) || 'Colour') + '</p><div class="mto-sw">' + cols.map(function (c) { return '<button type="button" data-col="' + esc(c.name) + '" class="' + (o.colour === c.name ? 'on' : '') + '">' + (c.hex ? '<i class="mto-dot" style="background:' + (c.hex2 ? 'linear-gradient(135deg,' + esc(c.hex) + ' 50%,' + esc(c.hex2) + ' 50%)' : esc(c.hex)) + '"></i>' : '') + esc(c.name) + (+c.extra ? ' (+' + rs(c.extra) + '/' + uw + ')' : '') + '</button>'; }).join('') + '</div>' : '';
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
      (x.oo === false ? '' : '<p class="mto-from">From <b>' + rs(x.p) + '</b>' + (u === 'cabin' ? ' · this preset as shown' : u !== 'fixed' ? ' · ' + rs(Math.min.apply(null, mats.map(function (y) { return +y.rate || 0; }))) + ' / ' + uw : '') + ' · incl. GST</p>') +
      (u === 'cabin' ? '<div class="mto-box"><h3>1 · Customise your cabin</h3>' + size + '</div>' + instHtml :
      '<div class="mto-box"><h3>1 · Your size</h3>' + size + '</div>' +
      '<div class="mto-box"><h3>2 · ' + (m.labels ? 'Frame &amp; finish' : 'Material &amp; finish') + '</h3>' + (m.photo_note ? '<p style="font-size:13px;color:#6A6258;margin:0 0 8px">Photo shows: ' + esc(m.photo_note) + '</p>' : '') + matHtml + colHtml + '</div>' + addHtml + instHtml) +
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

  // ------------------------------------------------------------ 185: installation from the server — installer rate + travel + stay + lifting
  // (installer rates are private, so the store asks mto_quote; the local price() still gives the design price instantly)
  var RQ = {};
  function rqKey(id, o) { return id + '|' + JSON.stringify([o.l, o.w, o.h, o.n, o.size, o.material, o.colour, o.groups, o.addons, o.layout || null, o.pin, !!o.install, !!o.lift, +o.floor || 0, o.lift_type || 'none', o.lift_w || '', o.lift_h || '', o.lift_d || '', o.lift_by || '']); }
  function siteOn(m, o) { return /^\d{6}$/.test(o.pin || '') && ((m.install && m.install.offered && (o.install || m.install.required)) || (+o.floor > 0 && !!o.lift)); }
  function rqOpts(o) { var r = {}, k; for (k in o) if (o[k] !== undefined && o[k] !== '') r[k] = o[k]; r.floor = +o.floor || 0; return r; }
  function fetchRQ(id, o, key) {
    var x = PRODS[id], call = window._supaRpc;
    if (!x || !x.pid || !call) { RQ[key] = false; return; }
    call('mto_quote', { p_product: x.pid, p_opts: rqOpts(o) }).then(function (r) { RQ[key] = r || false; }, function () { RQ[key] = false; })
      .then(function () { try { if (S && S.id === id) paint(); mRepaint(id); } catch (e) {} });
  }
  function priceR(id, m, o, pct) {
    var q = price(m, o, pct); if (!q.ok || !siteOn(m, o)) return q;
    var key = rqKey(id, o), r = RQ[key];
    if (r === undefined) { RQ[key] = null; fetchRQ(id, o, key); }
    if (r === false) return q;   // no server (preview): the design's own city price
    if (!r) { q.install = Object.assign({}, q.install || {}, { pending: true }); return q; }
    if (!r.ok) return r;
    q.install = r.install; q.install_fee = r.install_fee; q.total = r.total; q.before_dispatch = r.before_dispatch; return q;
  }
  // the installation / lifting rows of the summary (cls = row class: 'rw' on the design page, 'r' at checkout)
  function instRows(q, cls) {
    var i = q.install || {}, pt = i.parts, R = function (a, b, st) { return '<div class="' + cls + '"' + (st ? ' style="' + st + '"' : '') + '><span>' + a + '</span><span>' + b + '</span></div>'; };
    if (i.pending) return R('Installation', 'Working it out…');
    if (!pt) return i.available ? R('Installation' + (i.city ? ' (' + esc(i.city) + ')' : ''), rs(q.install_fee)) : '';
    if (!pt.available) return R(pt.install ? 'Installation' : 'Lifting', 'Not available here');
    var sm = 'font-size:12.5px;color:#8A8278', h = '';
    if (pt.install) h += R('Installation work' + (pt.region ? ' (' + esc(pt.region) + ')' : ''), rs(pt.work));
    if (pt.travel && pt.travel.amount) { h += R('Team travel & stay', rs(pt.travel.amount)); h += (pt.travel.lines || []).map(function (l) { return R('· ' + esc(l.name), rs(l.amount), sm); }).join(''); }
    if (pt.lifting) { var lf = pt.lifting, how = { lift: 'fits your lift', labour: 'by labour', hydra: 'by hydra', chain: 'by chain pulley' }[lf.method] || lf.method;
      h += R('Lifting to floor ' + lf.floor + ' (' + how + ')', lf.amount ? rs(lf.amount) : 'Free');
      if ((lf.outside || []).length) h += R('· Outside the lift: ' + esc(lf.outside.join(', ')), '', sm); }
    if ((pt.to_confirm || []).length) h += R('Our team confirms: ' + esc(pt.to_confirm.join(', ')), '', sm);
    return h;
  }

  function paint() {
    var x = PRODS[S.id], m = x.cz, o = S.o; o.zone = zoneOf(m.ships_from, o.pin); var q = priceR(S.id, m, o, PCT), el = document.getElementById('mtoSum'), it = document.getElementById('mtoInstTxt');
    if (CU.open) cuPrice(q);
    if (!mtoOk() && m.unit !== 'cabin') { if (el) el.innerHTML = S.pdp ? '' : lockHTML(x); if (S.pdp) ctaPaint(null); return; }   // 172
    if (q.ok && m.unit !== 'cabin') logPrice(S.id, o, q);
    if (S.pdp) { if (m.unit === 'cabin' && S.wz) cbBar(q); else ctaPaint(q); }
    if (it) it.textContent = !/^\d{6}$/.test(o.pin) ? 'Enter your pincode to see the installation charge' : q.ok && q.install ? (q.install.available ? q.install.city + ': ' + rs(q.install.fee) : 'Not available at this pincode yet: delivery only, with a fixing guide') : '';
    if (!el) return;
    if (!q.ok) { el.innerHTML = '<p class="mto-err" style="margin:0">' + esc(q.error) + '</p>' + (S.prop ? '' : '<button class="mto-go" type="button" disabled>Enter your size</button>'); if (S.prop) propCta(q); return; }
    var ins = o.install && q.install && q.install.available;
    var needOk = !o.drawing && !o.size_ok, closed = x.oo === false, needPin = q.delivery && q.delivery.fee == null;
    if (m.unit === 'cabin') {   // 156
      el.innerHTML = q.addons.filter(function (a) { return a.name !== 'Layout'; }).map(function (a) { return a.amount ? '<div class="rw"><span>' + esc(a.name) + '</span><span>' + rs(a.amount) + '</span></div>' : '<div class="rw" style="font-size:12.5px"><span>' + esc(a.name) + '</span><span></span></div>'; }).join('') +
        (q.install && (q.install.available || q.install.pending) ? instRows(q, 'rw') : '<div class="rw"><span>Installation + transport</span><span>' + (/^\d{6}$/.test(o.pin) ? 'Not available' : 'Enter your pincode') + '</span></div>') +
        '<div class="rw tt"><span>Total</span><span>' + rs(q.total) + '</span></div>' +
        '<div class="mto-pay"><div>Pay now (' + PCT + '%)<b>' + rs(q.pay_now) + '</b></div><div>Later (dispatch + delivery)<b>' + rs(q.before_dispatch) + '</b></div></div>' +
        (S.prop ? '' : '<button class="mto-go" type="button" data-act="order"' + (closed || !q.install || !q.install.available ? ' disabled' : '') + '>' + (closed ? 'Orders open soon' : !(q.install && q.install.available) ? 'Enter your pincode' : 'Order now · pay ' + rs(q.pay_now)) + '</button>' + addBtn(closed || !q.install || !q.install.available));
      if (S.prop) propCta(q);
      return;
    }
    el.innerHTML = '<div class="rw"><span>' + (m.unit === 'fixed' ? esc(q.size) + (q.rate || arr(m.materials).length > 1 ? ' + ' + esc(q.material) : '') : m.unit === 'seat' ? q.qty + '-seat bench' : q.panels ? q.panels.width + ' ft × ' + esc(o.h) + ' ft high, ' + esc(q.material) : q.qty + ' ' + UW(m.unit) + ' × ' + rs(q.rate)) + (q.min_charge_used ? ' (minimum)' : '') + '</span><span>' + rs(q.base) + '</span></div>' +
      (q.panels ? '<div class="rw" style="font-size:12.5px;color:#6A6258"><span>' + esc(panelsText(q.panels)) + '</span><span></span></div>' : '') +
      q.addons.map(function (a) { return '<div class="rw"><span>' + esc(a.name) + '</span><span>' + (a.amount ? rs(a.amount) : 'Included') + '</span></div>'; }).join('') +
      (ins || (q.install && q.install.pending) ? instRows(q, 'rw') : '') +
      '<div class="rw"><span>Delivery</span><span>' + (!q.delivery ? 'Included' : q.delivery.fee == null ? 'Enter your pincode' : rs(q.delivery_fee)) + '</span></div>' +
      '<div class="rw tt"><span>Total</span><span>' + rs(q.total) + '</span></div>' +
      '<div class="mto-pay"><div>Pay now (' + PCT + '%)<b>' + rs(q.pay_now) + '</b></div><div>Before dispatch' + (ins ? ' (rest + installation)' : '') + '<b>' + rs(q.before_dispatch) + '</b></div></div>' +
      (o.install && q.install && !q.install.available && /^\d{6}$/.test(o.pin) ? '<p class="mto-err" style="margin:10px 0 0">Installation isn’t available at ' + esc(o.pin) + ' yet: untick it to order without.</p>' : '') +
      (S.prop ? '' : '<button class="mto-go" type="button" data-act="order"' + (needOk || closed || needPin || (o.install && q.install && !q.install.available) ? ' disabled' : '') + '>' + (closed ? 'Orders open soon' : needPin ? 'Enter your pincode' : needOk ? 'Confirm your size above' : 'Order now · pay ' + rs(q.pay_now)) + '</button>' + addBtn(needOk || closed || needPin || (o.install && q.install && !q.install.available)) +
      '<p style="text-align:center;font-size:13px;color:#CFC8BD;margin:10px 0 0">Buying for a project or 5+ pieces? <a style="color:#F2B49C;cursor:pointer" data-act="bulk">Get a bulk quote</a></p>');
    if (S.prop) propCta(q);
  }

  function addBtn(off) {   // 190: keep shopping — the design goes into the cart with ready-to-ship items
    return '<button class="mto-go mto-go2" type="button" data-act="addcart"' + (off ? ' disabled' : '') + ' style="margin-top:8px;background:transparent;border:1.5px solid currentColor">' + (S.editK ? 'Update cart' : 'Add to cart') + '</button>';
  }
  function setDim(key, v) {   // 159: size from − / + or typed, kept inside the limits
    var cz = PRODS[S.id].cz, c = cz.cabin, lay = S.o.layout, lim = c[key] || {}, lo = num(lim.min) || 8, hi = num(lim.max) || (key === 'L' ? 40 : 20);
    lay[key] = Math.max(lo, Math.min(hi, Math.round(num(v) || lo)));
    if (S.wz && !S.wz.custom) wzBuild(c, lay, S.wz); else cbResize(c, lay); arr(lay.places).forEach(function (p) { cbClamp(c, lay, p); }); cbSync(c, lay); S.sel = { side: (S.sel || {}).side || 'front', i: 0 };
  }
  function onInput(e) { var k = e.target.getAttribute('data-k'); if (!k || !S) return; if (k === 'pin') e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); S.o[k] = e.target.value; paint(); }
  function onChange(e) {
    var t = e.target, k = t.getAttribute('data-k'); if (!S) return;
    if (t.hasAttribute('data-tsin')) { if (tsInput(t)) draw(); return; }
    var pk = t.getAttribute('data-pick');   // 159 picklists
    if (pk === 'n') { S.o.n = +t.value; return draw(); }
    if (pk === 'size') { S.o.size = t.value; return draw(); }
    if (pk === 'material') { S.o.material = t.value; var mm1 = arr(PRODS[S.id].cz.materials).filter(function (y) { return y.name === t.value; })[0]; S.o.colour = (arr(mm1 && mm1.colours)[0] || {}).name || ''; if (S.o.colour) colPic(S.o.colour); return draw(); }
    if (pk === 'colour') { S.o.colour = t.value; colPic(t.value); return draw(); }
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
    if (t.hasAttribute('data-mat')) { S.o.material = t.getAttribute('data-mat'); S.o.colour = ''; var mm2 = arr(PRODS[S.id].cz.materials).filter(function (y) { return y.name === S.o.material; })[0], c2 = arr(mm2 && mm2.colours)[0]; if (c2 && c2.img) { S.o.colour = c2.name; colPic(c2.name); } return draw(); }
    if (t.hasAttribute('data-drw')) { S.o.drawing = t.getAttribute('data-drw') === '1'; return draw(); }
    if (t.hasAttribute('data-add')) { var n = t.getAttribute('data-add'); S.o.addons = S.o.addons.filter(function (a) { return a !== n; }); if (t.checked) S.o.addons.push(n); return paint(); }
  }
  function onClick(e) {
    var t = e.target.closest('[data-act],[data-size],[data-col],[data-img],[data-open],[data-n],[data-bay],[data-bk],[data-cch],[data-cit],[data-pl],[data-dragpl],[data-pact],[data-wzgo],[data-wzadv],[data-wzside],[data-wp],[data-wzpiece],[data-wzsize],[data-wzglass],[data-wzdoor],[data-wzdside],[data-wzwin],[data-cchk],[data-wzv],[data-cstep],[data-wztrk],[data-wzpj],[data-wzpd],[data-wzpt],[data-wzpu],[data-wzgut],[data-wztpl],[data-ts],[data-wzmadd],[data-wzmd],[data-wzms],[data-wzmx],[data-wzdl],[data-wzws],[data-wzwf],[data-wzsh],[data-wzshall]'); if (!t || !S) return;
    if (t.hasAttribute('data-ts')) { if (tsClick(t)) draw(); return; }
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
    if (t.hasAttribute('data-col')) { var c = t.getAttribute('data-col'); S.o.colour = S.o.colour === c ? '' : c; if (S.o.colour) colPic(c); return draw(); }
    if (t.hasAttribute('data-img')) { S.img = +t.getAttribute('data-img'); return draw(); }
    if (t.hasAttribute('data-open')) { return window.mtoOpen(t.getAttribute('data-open')); }
    var a = t.getAttribute('data-act'); if (a === 'unlock') return window.mtoUnlock(S.id);   // 172
    if (a === 'pg3') return window.pg3Open(true);
    if (a === 'cu') return window.cuOpen(true);   // 198
    if (a === 'cab') return window.cbStudio(true);
    if (a === 'close') { if (history.state && history.state.v === 'modal') return history.back(); return window.mtoClose(); }
    if (a === 'bulk') { window.mtoClose(); try { if (window.openBulk) return openBulk(S.id); } catch (er) {} return toast('Write to us on WhatsApp for a bulk quote'); }
    if (a === 'order') return order();
    if (a === 'addcart') return addM(false);   // 190
  }

  // ------------------------------------------------------------ 190: Made to Order designs in the cart, with ready-to-ship items — one order, one payment
  // Each design keeps its own size / options (MC, localStorage outrr_mcart). Site details (floor, lift, lifting) are asked once at checkout (SITE).
  // Pay now = ready-to-ship items in full + PCT% of each design; the rest of the designs + installation before they are dispatched.
  var MK = 'outrr_mcart', SK = 'outrr_msite', MC = [], SITE = {};
  try { MC = JSON.parse(localStorage.getItem(MK) || '[]').filter(function (c) { return c && c.id && c.k && c.o; }); } catch (e) { MC = []; }
  try { SITE = JSON.parse(localStorage.getItem(SK) || '{}') || {}; } catch (e) { SITE = {}; }
  function mSave() { try { localStorage.setItem(MK, JSON.stringify(MC)); localStorage.setItem(SK, JSON.stringify(SITE)); } catch (e) {} }
  function mLive() { return MC.filter(function (c) { return PRODS[c.id] && PRODS[c.id].cz; }); }
  window.mtoCartLines = function () { return MC.slice(); };
  function cfgOf(o) { return { n: o.n, l: o.l, w: o.w, h: o.h, size: o.size, material: o.material, colour: o.colour, addons: arr(o.addons).slice(), groups: Object.assign({}, o.groups || {}),
    install: !!o.install, drawing: !!o.drawing, size_ok: !!o.size_ok, note: o.note, layout: o.layout ? cbClone(o.layout) : undefined }; }
  function addM(go) {
    var x = PRODS[S.id], q = priceR(S.id, x.cz, S.o, PCT); if (!q.ok) return toast(q.error);
    if (x.oo === false) return toast('Orders for this maker open soon');
    if (!S.o.drawing && !S.o.size_ok && x.cz.drawing !== 'always') return toast('Please confirm your size first');
    var k = S.editK, i = -1; MC.forEach(function (c, j) { if (k && c.k === k) i = j; });
    if (i < 0 && MC.length >= 20) return toast('Up to 20 Made to Order designs in one order');   // 193
    var line = { k: i >= 0 ? k : 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), id: S.id, o: cfgOf(S.o), pin: S.o.pin };
    if (i >= 0) MC[i] = line; else MC.push(line);
    var dk = isPg(S.id) && S.o.deck && i < 0 ? deckLine() : null;   // 193f: the deck under the pergola, as its own Decking line
    if (dk && MC.length < 20) MC.push({ k: 'm' + Date.now().toString(36) + 'dk', id: dk.id, o: cfgOf(dk.o), pin: dk.o.pin });
    S.editK = null; mSave(); try { updBadge(); } catch (e) {}
    try { if (window.otrack) otrack('add_to_cart', { sku: S.id, value: q.total }); } catch (e) {}
    window.mtoClose(); try { if (S.studio) window.cbStudio(null); } catch (e) {}
    if (go) return openCart();
    toast(i >= 0 ? 'Cart updated ✓' : 'Added to cart ✓');
    try { if (S.pdp) paint(); } catch (e) {}
  }
  function order() { addM(true); }
  // 193 "Plan your space": put a whole plan in the cart — [{ id, o }] each priced like a design page; returns { added, skipped: [names] }
  window.mtoCartAddMany = function (lines) {
    var r = { added: 0, skipped: [] };
    arr(lines).forEach(function (l) {
      var x = PRODS[l.id]; if (!x || !x.cz) return r.skipped.push(l.id);
      var o = Object.assign({ pin: lastPin(), addons: [], groups: {}, drawing: x.cz.drawing !== 'no', size_ok: true, note: '' }, l.o || {});
      var q = priceR(l.id, x.cz, o, PCT);
      if (!q.ok || x.oo === false || MC.length >= 20) return r.skipped.push(short(x.n));
      MC.push({ k: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), id: l.id, o: cfgOf(o), pin: o.pin }); r.added++;
      try { if (window.otrack) otrack('add_to_cart', { sku: l.id, value: q.total }); } catch (e) {}
    });
    mSave(); try { updBadge(); } catch (e) {} return r;
  };
  // 193: "Plan your space" sets a cabin's length × width — same as resizing in the studio (walls re-laid, rooms kept inside)
  window.mtoCabinSize = function (id, lay, L, W) {
    var x = PRODS[id], c = x && x.cz && x.cz.cabin; if (!c) return null;
    var dv = function (v, d) { v = num(v); return v == null ? d : v; }, lim = { Lmin: dv(c.L && c.L.min, 8), Lmax: dv(c.L && c.L.max, 40), Wmin: dv(c.W && c.W.min, 8), Wmax: dv(c.W && c.W.max, 20) };
    var l = cbClone(lay && lay.walls ? lay : c.layout || {}); if (!l.walls) return Object.assign({ lay: null }, lim);
    l.L = Math.round(Math.max(lim.Lmin, Math.min(lim.Lmax, num(L) || num(l.L) || lim.Lmin))); l.W = Math.round(Math.max(lim.Wmin, Math.min(lim.Wmax, num(W) || num(l.W) || lim.Wmin)));
    cbResize(c, l); arr(l.places).forEach(function (p) { cbClamp(c, l, p); }); cbSync(c, l);
    return Object.assign({ lay: l }, lim);
  };
  // 193: from a cabin studio / pergola designer into "Plan your space" with this design (and the studio's terrace) already on it
  // 193g: designers ↔ planner. Rotation: the studio turns the cabin / pergola by +rot on the plot, the planner by −rot.
  function planRot(r) { return (360 - (num(r) || 0)) % 360; }
  function siteOut(t) { if (!t) return null; var v = JSON.parse(JSON.stringify(t)); ['cx', 'cz', 'rot', 'clash', 'place', 'whole'].forEach(function (k) { delete v[k]; }); return v; }
  function planItem() {   // this design as a planner item, where it stands on the studio's terrace
    var x = PRODS[S.id], m = x.cz, t = S.site, ter = t && t.kind === 'terrace', it;
    if (m.unit === 'cabin') { var lay = S.o.layout || {}; it = { cat: 'cabin', sku: S.id, pick: S.id, lsku: S.id, layout: cbClone(lay), cfg: cfgOf(S.o), cfgId: S.id, label: short(x.n), w: (num(lay.L) || 12) + 1.2, d: (num(lay.W) || 10) + 1.2, h: 10, rot: ter ? planRot(t.rot) : 0 };
      if (ter) { var F = tsFoot(t, lay); it.bcx = t.cx + F.L / 2; it.bcz = t.cz + F.W / 2; } }   // the planner centres it there (its plinth / projections around)
    else { var q = pgOpts(); it = { cat: 'pergola', pick: S.id, cfg: cfgOf(S.o), cfgId: S.id, label: short(x.n), w: q.l, d: q.w, h: parseFloat(q.height) || 8, deck: !!S.o.deck, rot: ter ? planRot(t.rot) : 0, hAuto: false, deckAuto: false };
      if (ter) { it.x = t.cx; it.z = t.cz; } }
    return it;
  }
  window.mtoPlanFrom = function () {
    if (!S || !PRODS[S.id] || !window.outrrPlan) return; var t = S.site, seed = { item: planItem(), site: t && t.kind === 'terrace' ? siteOut(t) : t && t.kind === 'ground' ? { kind: 'ground' } : null, fresh: S.proj === 'new' };   // 16: "another project" starts a new plan (the old one stays in the account)
    if (S.pl && S.plFor === S.id && arOthers(S.pl).length && t && t.kind === 'terrace') { var p0 = arSync(); try { localStorage.setItem('outrr_plan', JSON.stringify({ v: 1, step: 1, site: p0.site, items: arOthers(p0), pid: null, pname: '', source: isPg(S.id) ? 'pergola' : 'cabin' })); } catch (e) {} seed.site = p0.site; seed.reload = true; S.pl = null; }   // 193j: the things already put around it go along
    try { window.mtoClose(); } catch (e) {} try { if (S.studio) window.cbStudio(null); } catch (e) {} try { window.pg3Open(false); } catch (e) {} try { window.mtoProposal(false); } catch (e) {}
    if (seed.fresh) S.proj = 'same';
    window.outrrPlan(seed);
  };
  // from the planner: open this cabin / pergola's designer on the plan's terrace, where it stands; "Save to my plan" brings it back
  window.mtoFromPlan = function (idx, it, site) {
    var id = it.cat === 'cabin' ? it.sku : (it.cfgId || it.pick); if (!id || !PRODS[id]) return false;
    try { openProduct(id); } catch (e) { return false; }
    var n = 0; (function wait() { if (!S || S.id !== id || !S.o) { if (n++ < 60) return setTimeout(wait, 100); return; }
      if (it.cfg && it.cfgId === id) { var c = it.cfg; ['material', 'colour', 'h', 'note'].forEach(function (k) { if (c[k] != null) S.o[k] = c[k]; }); S.o.groups = Object.assign({}, S.o.groups, c.groups || {}); S.o.addons = arr(c.addons).slice(); }
      var ter = site && site.kind === 'terrace', t = ter ? JSON.parse(JSON.stringify(site)) : site && site.kind === 'ground' ? { kind: 'ground' } : null;
      if (it.cat === 'cabin') { if (it.layout && (it.lsku || it.sku) === id) S.o.layout = cbClone(it.layout);
        if (ter) { t.rot = planRot(it.rot); var F = tsFoot(t, S.o.layout), f = (+it.rot || 0) % 180 ? [it.d, it.w] : [it.w, it.d]; t.cx = Math.round((it.x + f[0] / 2 - F.L / 2) * 2) / 2; t.cz = Math.round((it.z + f[1] / 2 - F.W / 2) * 2) / 2; }
        S.site = t; S.fromPlan = idx; S.siteDone = true; S.cbsInit = true; window.cbStudio(true); }
      else { S.o.l = it.w; S.o.w = it.d; S.o.deck = !!it.deck; if (ter) { t.rot = planRot(it.rot); t.cx = it.x; t.cz = it.z; } S.site = t; S.fromPlan = idx; window.pg3Open(true); }
      draw(); })();
    return true;
  };
  window.mtoBackToPlan = function () {   // write this design back into the plan item it came from, open the planner
    if (!S || S.fromPlan == null || !window.outrrPlan) return; var plan = null; try { plan = JSON.parse(localStorage.getItem('outrr_plan') || 'null'); } catch (e) {}
    if (!plan || !Array.isArray(plan.items)) return; var idx = S.fromPlan, nu = planItem(), old = plan.items[idx] || {};
    nu.lock = old.lock; if (S.site && S.site.kind === 'terrace') plan.site = siteOut(S.site);
    if (nu.x == null && nu.bcx == null) { nu.x = old.x; nu.z = old.z; }
    plan.items[idx] = nu; plan.step = 1; try { localStorage.setItem('outrr_plan', JSON.stringify(plan)); } catch (e) {}
    S.fromPlan = null; try { if (S.studio) window.cbStudio(null); } catch (e) {} try { window.pg3Open(false); } catch (e) {} try { window.mtoClose(); } catch (e) {}
    window.outrrPlan({ reload: true });
  };
  // 193j: things around the cabin / pergola in the designers — the planner's own things and rules (planner.js api) on a plan { site, items }; the design itself is the item marked _me
  var AR = { m: null, st: 0 };
  function arLoad() { if (AR.st) return; AR.st = 1; try { new Function('u', 'return import(u)')('/planner.js?v=18').then(function (m) { AR.m = m.api; AR.st = 2; if (S) { draw(); arRe(); } }, function () { AR.st = -1; }); } catch (e) { AR.st = -1; } }
  function arRe() { try { if (S && isPg(S.id)) p3Draw(); else mount3d(); } catch (e) {} }
  function arOn() { return !!(S && S.site && S.site.kind === 'terrace' && S.o && (isPg(S.id) || (S.studio && PRODS[S.id] && PRODS[S.id].cz.unit === 'cabin'))); }
  function arPlan() {
    if (S.pl && S.plFor === S.id) return S.pl; var p = null;
    if (S.fromPlan != null) { try { p = JSON.parse(localStorage.getItem('outrr_plan') || 'null'); } catch (e) {} if (p && Array.isArray(p.items)) { p.items.forEach(function (o) { if (o) delete o._me; }); if (p.items[S.fromPlan]) p.items[S.fromPlan]._me = true; } }
    if (!p || !Array.isArray(p.items)) p = { v: 1, step: 1, items: [] };
    S.pl = p; S.plFor = S.id; p.sel = null; return p;
  }
  function arOthers(p) { return arr(p && p.items).filter(function (o) { return o && !o._me; }); }
  function arSync() {   // the design (where it stands now) and the terrace into the plan; things on it move off
    var p = arPlan(); if (!AR.m || !arOn()) return p;
    arr(S.site.blocks).forEach(function (b) { if (!b.id) b.id = 'b' + Math.random().toString(36).slice(2, 8); });
    p.site = siteOut(S.site); var me = planItem(), i = -1; me._me = true; p.items.forEach(function (o, j) { if (o && o._me) i = j; });
    var sel = p.sel != null ? p.items[p.sel] : null; AR.m.put(p, i, me); p.sel = sel ? p.items.indexOf(sel) : null; if (p.sel < 0) p.sel = null;
    arKeep(p); return p;
  }
  function arKeep(p) {   // opened from the planner: the plan is kept as it changes ("Save to my plan" puts the design back in its place)
    var k = -1; p.items.forEach(function (o, j) { if (o && o._me) k = j; }); if (S.fromPlan != null && k >= 0) S.fromPlan = k;
    if (S.fromPlan != null) try { localStorage.setItem('outrr_plan', JSON.stringify({ v: 1, step: p.step || 1, site: p.site, items: p.items, pid: p.pid || null, pname: p.pname || '', source: p.source || '' })); } catch (e) {}
  }
  function arAround() { if (!arOn() || (S.fromPlan == null && !(S.pl && S.plFor === S.id))) return null; if (!AR.m) { arLoad(); return null; } arPlan(); if (!arOthers(S.pl).length) return null; var p = arSync(); return { list: p.items.map(function (o) { return o && !o._me ? o : null; }), sel: p.sel }; }
  function arRects() { return arOthers(S.pl && S.plFor === S.id ? S.pl : null).filter(function (o) { return !o.segs && !o.box && o.mode == null && o.cat !== 'deck'; }).map(function (o) { var f = (+o.rot || 0) % 180 ? [o.d, o.w] : [o.w, o.d]; return { x: +o.x, z: +o.z, w: f[0], d: f[1], label: o.label || o.cat }; }); }
  function arDo(fn) { if (!AR.m) return; var p = arSync(); fn(p); arKeep(p); S.arMsg = p.msg || ''; if (!isPg(S.id)) S.whole = true; draw(); arRe(); }
  function arEv(ev) {   // taps / drags on the things in the 3D
    if (!AR.m || !S.pl) return; if (ev.t === 'selitem') return arDo(function (p) { p.sel = p.sel === ev.i ? null : ev.i; p.ask = null; });
    if (ev.t === 'moveitem') return arDo(function (p) { AR.m.move(p, ev.i, ev.x, ev.z); });
  }
  function arClick(k) {
    if (!S) return; if (k === 'open') { if (!isPg(S.id)) { S.whole = true; S.arOpen = true; draw(); var pn = document.querySelector('.cbs-pn,.cbs-o'); if (pn && pn.scrollIntoView) pn.scrollIntoView({ block: 'start' }); } return; }
    if (k === 'plan') return S.fromPlan != null ? window.mtoBackToPlan() : window.mtoPlanFrom();
    if (k === 'close') { S.arOpen = false; if (S.pl) S.pl.sel = null; return draw(); }
    if (!AR.m) return arLoad(); arDo(function (p) { AR.m.act(p, k); });
  }
  function arInput(el) { var k = el.getAttribute('data-arin'), v = parseFloat(el.value); if (!k || !(v > 0) || !AR.m || !S || !S.pl) return; arDo(function (p) { if (p.sel != null) AR.m.size(p, p.sel, k, v); }); }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-ar]'); if (b && !b.disabled) { e.preventDefault(); arClick(b.getAttribute('data-ar')); } });
  document.addEventListener('change', function (e) { if (e.target.getAttribute && e.target.hasAttribute('data-arin')) arInput(e.target); });
  function arUI() {   // the panel: what can go around it, the things placed, the picked one's size / turn / lock / remove
    if (!S || !S.site || S.site.kind !== 'terrace') return '<p class="ts-h">Around it</p><button type="button" class="ar-more" data-ar="plan">🗺️ Plan seating, planters, a bar… around it on your lawn →</button>';
    if (!AR.m) { arLoad(); return '<p class="ts-h">Around it</p><p class="ar-note">' + (AR.st < 0 ? 'Couldn\'t load — try again' : 'Loading…') + '</p>'; }
    var p = arPlan(), skip = isPg(S.id) ? 'pergola' : 'cabin', cats = AR.m.cats(skip), h = '<div class="ar"><p class="ts-h">Around it <span>tap to add · drag on the 3D</span></p>';
    h += '<div class="ar-pal">' + cats.map(function (c) { return '<button type="button" data-ar="add:' + c.k + '"><i>' + c.e + '</i>' + esc(c.t) + '</button>'; }).join('') + '</div>';
    if (p.ask === 'privacy') h += '<div class="ar-ed"><b>Privacy screen — where?</b><div class="ar-row"><button type="button" data-ar="pmode:par">On the parapet</button><button type="button" data-ar="pmode:part">A partition</button><button type="button" data-ar="pmode:tank">Round the tanks</button><button type="button" data-ar="askx">✕</button></div></div>';
    var list = []; p.items.forEach(function (o, j) { if (o && !o._me) list.push([o, j]); });
    if (list.length) h += '<div class="ar-list">' + list.map(function (x) { var c = AR.m.cat(x[0].cat) || {}; return '<button type="button" data-ar="sel:' + x[1] + '" class="' + (p.sel === x[1] ? 'on' : '') + '">' + (c.e || '•') + ' ' + esc(x[0].label || c.t || x[0].cat) + (x[0].lock ? ' 🔒' : '') + '</button>'; }).join('') + '</div>';
    var it = p.sel != null ? p.items[p.sel] : null;
    if (it && !it._me) { var c = AR.m.cat(it.cat) || {}, sz = c.size || 'fixed', att = it.mode === 'par' || it.mode === 'tank' || it.mode === 'ac';
      var row = function (key, lbl, v) { return '<div class="ar-pm"><span>' + lbl + '</span><button type="button" data-ar="rs:' + key + ':-1"' + (it.lock ? ' disabled' : '') + ' aria-label="Smaller">−</button><input type="number" inputmode="decimal" step="0.5" data-arin="' + key + '" value="' + v + '"' + (it.lock ? ' disabled' : '') + '><button type="button" data-ar="rs:' + key + ':1"' + (it.lock ? ' disabled' : '') + ' aria-label="Bigger">+</button><i>ft</i></div>'; };
      h += '<div class="ar-ed"><b>' + (c.e || '') + ' ' + esc(it.label || c.t || it.cat) + '</b>';
      if (!att && /w/.test(sz)) h += row('w', 'Length', it.w); if (!att && sz === 'wd') h += row('d', 'Width', it.d); if (sz === 'wh' || it.cat === 'pergola' || it.mode === 'par' || it.mode === 'tank') h += row('h', 'Height', it.h);
      if (sz === 'fixed' && !att) h += '<p class="ar-note">' + it.w + ' × ' + it.d + ' ft — its real size comes with the design you pick</p>';
      h += '<div class="ar-row">' + (att ? '' : '<button type="button" data-ar="rot"' + (it.lock ? ' disabled' : '') + '>↻ Turn</button>') + '<button type="button" data-ar="lock">' + (it.lock ? '🔓 Unlock' : '🔒 Lock') + '</button><button type="button" data-ar="del">✕ Remove</button><button type="button" data-ar="done">Done</button></div></div>'; }
    if (S.arMsg) h += '<div class="wz-note" style="background:#FFF4E5;border-color:#F1D3A8">' + esc(S.arMsg) + '</div>';
    if (list.length) { var f = null; try { f = AR.m.from(p); } catch (e) {}
      h += '<button type="button" class="ar-more" data-ar="plan">' + list.length + ' thing' + (list.length > 1 ? 's' : '') + ' around it' + (f && f.n ? ' · from ' + rs(f.t) : '') + ' — <b>choose designs &amp; add to cart →</b></button>'; }
    return h + '</div>';
  }
  var AR_CSS = '.ar{margin:14px 0 0}.ar .ts-h span{font-weight:500;color:#8a857c}.ar-pal{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.ar-pal button{border:1px solid #E2D6C4;background:#fff;border-radius:10px;padding:7px 6px;font:600 11.5px inherit;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;color:#2E2E2E}.ar-pal button:hover{border-color:#C26445}.ar-pal i{font-style:normal;font-size:18px}' +
    '.ar-list{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0}.ar-list button{border:1px solid #ddd;background:#fff;border-radius:999px;padding:6px 11px;font:600 12px inherit;font-family:inherit;cursor:pointer;color:#2E2E2E}.ar-list button.on{border-color:#C26445;background:#fbefe9;color:#8a3a1f}' +
    '.ar-ed{border:2px solid #C26445;border-radius:12px;padding:10px;background:#FFF8F2;margin:10px 0 0}.ar-ed>b{font-size:13.5px}.ar-pm{display:flex;align-items:center;gap:6px;margin:6px 0;font-size:12.5px}.ar-pm span{min-width:56px}.ar-pm button{width:32px;height:32px;border-radius:50%;border:1px solid #ccc;background:#fff;font-size:16px;cursor:pointer}.ar-pm input{width:64px;height:32px;border:1px solid #C9BBA6;border-radius:8px;text-align:center;font:inherit;font-weight:700}.ar-pm i{font-style:normal;color:#8a857c}' +
    '.ar-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.ar-row button{border:1px solid #ddd;background:#fff;border-radius:999px;padding:6px 11px;font:600 12px inherit;font-family:inherit;cursor:pointer;color:#2E2E2E}.ar-row button:disabled{opacity:.45}.ar-note{font-size:12px;color:#7A7268;margin:6px 0}' +
    '.ar-more{display:block;width:100%;margin:10px 0 0;padding:10px 12px;border:1.5px solid #C26445;border-radius:12px;background:#FFF8F2;color:#2E2E2E;font:500 12.5px inherit;font-family:inherit;text-align:left;cursor:pointer}.ar-more b{color:#8a3a1f}';
  (function () { try { var st = document.createElement('style'); st.textContent = AR_CSS; document.head.appendChild(st); } catch (e) {} })();
  // 193i: the planner's estimate of delivery + installation for one design at a pincode (installation when the design offers it)
  window.mtoEstimate = function (id, o0, pin) {
    var x = PRODS[id]; if (!x || !x.cz || !/^\d{6}$/.test(pin || '')) return Promise.resolve(null); var m = x.cz, o = Object.assign({}, o0, { pin: pin });
    o.zone = zoneOf(m.ships_from, pin); if (m.install && (m.install.required || m.install.offered)) o.install = true;
    return new Promise(function (res) { var n = 0; (function poll() { var q = null; try { q = priceR(id, m, o, PCT); } catch (e) {} if (q && q.install && q.install.pending && n++ < 40) return setTimeout(poll, 250); res(q); })(); });
  };
  window.mtoOpenCart = function () { try { openCart(); } catch (e) {} };
  window.mtoAddCart = function () { if (!S) return; if (!mtoOk() && PRODS[S.id].cz.unit !== 'cabin') return window.mtoUnlock(S.id); addM(false); };
  window.mtoCartRm = function (k) { MC = MC.filter(function (c) { return c.k !== k; }); mSave(); try { updBadge(); } catch (e) {} if (isOn('checkout')) { if (!MC.length && !CART.length) return openCart(); renderCheckout(); } else renderCart(); };
  window.mtoCartEdit = function (k) { var c = MC.filter(function (z) { return z.k === k; })[0]; if (!c) return; window.__mtoEdit = { id: c.id, k: k, o: c.o, pin: c.pin };
    if (PRODS[c.id].cz.unit === 'cabin') window.__cbsOpen = c.id; if (window.openProduct) window.openProduct(c.id); };
  function isOn(v) { var e = document.getElementById(v); return !!e && e.style.display === 'block'; }
  function coPin() { var e = document.getElementById('coPin'); return e ? e.value.trim() : ''; }
  function mPin(c) { var p = isOn('checkout') ? coPin() : ''; return /^\d{6}$/.test(p) ? p : (c.pin || lastPin() || ''); }
  function lineOpts(c) {
    var x = PRODS[c.id], m = x.cz, o = {}, k; for (k in c.o) o[k] = c.o[k];
    o.pin = mPin(c); o.zone = zoneOf(m.ships_from, o.pin); if (m.install && m.install.required) o.install = true;
    o.floor = +SITE.floor || 0; o.lift_type = SITE.lift_type || 'none'; ['lift_w', 'lift_h', 'lift_d', 'lift_by'].forEach(function (f) { if (SITE[f]) o[f] = SITE[f]; });
    o.lift = !!SITE.lift && o.floor > 0;
    return o;
  }
  function mSum() {
    var s = { lines: [], n: 0, ok: true, err: '', total: 0, now: 0, later: 0, inst: 0, pend: false, needPin: false };
    mLive().forEach(function (c) { var x = PRODS[c.id], o = lineOpts(c), q = priceR(c.id, x.cz, o, PCT); s.lines.push({ c: c, x: x, o: o, q: q }); s.n++;
      var bad = function (t) { s.ok = false; if (!s.err) s.err = t; };
      if (!q.ok) return bad(short(x.n) + ': ' + q.error);
      if (x.oo === false) bad(short(x.n) + ': orders open soon');
      if (q.install && q.install.pending) s.pend = true;
      if (q.delivery && q.delivery.fee == null) { s.needPin = true; bad('Enter your pincode'); }
      if ((o.install || o.lift) && q.install && !q.install.available && !q.install.pending && /^\d{6}$/.test(o.pin)) bad((o.install ? 'Installation' : 'Lifting') + ' for ' + short(x.n) + ' isn’t available at ' + o.pin + '. Untick it or use another address.');
      s.total += q.total; s.now += q.pay_now; s.later += q.before_dispatch; s.inst += q.install_fee || 0; });
    return s;
  }
  function short(n) { return String(n || '').replace(/ — .*$/, ''); }
  function specOf(x, o) {
    return [x.cz.unit === 'cabin' && o.layout ? o.layout.L + ' × ' + o.layout.W + ' ft, your layout' : x.cz.unit === 'seat' ? o.n + ' seats' : x.cz.unit === 'fixed' ? o.size : [o.l, o.w].filter(Boolean).join(' × ') + ' ft' + (o.h ? ', ' + o.h + ' ft high' : ''), o.material, o.colour]
      .concat(arr(o.addons)).concat(Object.keys(o.groups || {}).map(function (g) { return g + ': ' + o.groups[g]; })).filter(Boolean).join(' · ');
  }
  function mLineHTML(l) {
    var x = l.x, q = l.q, o = l.c.o;
    return '<div class="cline mline"><div class="im"><img src="' + esc(IMGS[x.img] || '') + '" alt=""></div><div class="inf"><div class="nm">' + esc(x.n) + ' <span class="mto-badge" style="font-size:9px;padding:3px 7px">Made to Order</span></div>' +
      '<div class="vlab">' + esc(specOf(x, o)) + '</div><div class="vlab">' + (o.drawing ? 'Drawing to approve before production' : 'Made to the size you confirmed') + (o.install || (x.cz.install && x.cz.install.required) ? ' · with installation' : '') + '</div>' +
      '<div class="pr">' + (q.ok ? rs(q.total) : '<span class="mto-err">' + esc(q.error) + '</span>') + '</div>' + (q.ok ? '<div class="vlab">Pay ' + rs(q.pay_now) + ' now · ' + rs(q.before_dispatch) + ' before dispatch</div>' : '') +
      '<div class="row2"><span class="rm" onclick="mtoCartEdit(\'' + l.c.k + '\')">Edit design</span><span class="rm" onclick="mtoCartRm(\'' + l.c.k + '\')">Remove</span></div></div></div>';
  }
  function payLine(rts, s) {
    return 'Pay <b>' + rs(rts + s.now) + '</b> now (' + (rts > 0 ? 'ready-to-ship items in full + ' : '') + PCT + '% of ' + (s.n > 1 ? 'each design' : 'the design') + '). The rest, <b>' + rs(s.later) + '</b>' + (s.inst ? ' with installation' : '') +
      ', is paid before ' + (s.n > 1 ? 'the designs are' : 'it is') + ' dispatched: we email you the link.' + (rts > 0 ? ' Ready-to-ship items are dispatched straight away.' : '');
  }
  var amt = function (el) { return +String(el ? el.textContent : '').replace(/[^\d.]/g, '') || 0; };

  // the badge counts the designs too
  var _ub = window.updBadge;
  window.updBadge = function () { _ub.apply(this, arguments); var n = CART.reduce(function (a, c) { return a + c.q; }, 0) + MC.length; ['cartn', 'cartn2'].forEach(function (id) { var e = document.getElementById(id); if (e) e.textContent = n; }); };
  try { window.updBadge(); } catch (e) {}

  // cart page: the designs on top, their price in the summary
  var _rcart = window.renderCart;
  window.renderCart = function () {
    _rcart.apply(this, arguments);
    var body = document.getElementById('cartBody'); if (!body || !mLive().length) return;
    var s = mSum(), html = '<div class="mto-cart"><div class="cgrp">Made to Order <span>made for you · ' + PCT + '% now, the rest before dispatch</span></div>' + s.lines.map(mLineHTML).join('') + '</div>';
    var cnt = document.getElementById('cartCnt'); if (cnt) cnt.textContent = (CART.reduce(function (a, c) { return a + c.q; }, 0) + s.n) + ' items';
    var row = '<div class="r"><span>Made to Order (' + s.n + (s.n > 1 ? ' designs' : ' design') + ')</span><span>' + (s.ok || s.total ? rs(s.total) : '—') + '</span></div>';
    if (!CART.length) {
      body.innerHTML = '<div class="cartwrap"><div>' + html + '</div><div class="csum">' + row + '<div class="r tot"><span>Total</span><span>' + rs(s.total) + '</span></div>' +
        '<div class="secline" style="margin-top:6px">' + payLine(0, s) + '</div><div class="cartcta"><button class="btn" onclick="openCheckout()">Proceed to Checkout</button></div></div></div>';
      return;
    }
    var left = body.querySelector('.cartwrap > div'), pg = left && left.querySelector('.cprog'); if (pg) pg.insertAdjacentHTML('afterend', html); else if (left) left.insertAdjacentHTML('afterbegin', html);
    var tot = body.querySelector('.csum .r.tot'); if (!tot) return; var rts = amt(tot.lastElementChild);
    tot.insertAdjacentHTML('beforebegin', row); tot.lastElementChild.textContent = rs(rts + s.total);
    tot.insertAdjacentHTML('afterend', '<div class="secline" style="margin-top:6px">' + payLine(rts, s) + '</div>');
  };

  // checkout: retail functions see only retail lines; the designs are added on top
  var _ct = window.coTotals, _rc = window.renderCheckout, _po = window.placeOrder, _sp = window.coShipPaint, _ock = window.openCheckout, _csh = window.coSplitHTML, _cpl = window.coPayLabel, _nb = window.nearBlocked;
  function retail(f) { var keep = CART; if (keep.some(function (c) { return c.mto; })) CART = keep.filter(function (c) { return !c.mto; }); try { return f(); } finally { CART = keep; } }
  window.coTotals = function () {
    var t = retail(function () { return _ct(); }); if (!mLive().length) return t;
    var s = mSum(); t.m = s; t.rts = CART.length ? t.total : 0; t.total = t.rts + s.total; t.payNow = t.rts + s.now; t.items = (CART.length ? t.items : 0) + s.n; return t;
  };
  window.nearBlocked = function () { return retail(function () { return CART.length && _nb ? _nb() : false; }); };
  window.coSplitHTML = function (t) { if (!t.m) return _csh(t); var s = t.m;
    return '<div class="osum" style="margin-top:10px;padding:10px 12px;font-size:13px">' + (s.ok || !s.err ? payLine(t.rts, s) : '<div class="mto-warn">' + esc(s.err) + '</div>') + '</div>'; };
  window.coPayLabel = function (t) { if (!t.m) return _cpl(t); var s = t.m; return s.ok ? 'Pay now · ' + rs(t.payNow) : s.needPin ? 'Enter your pincode' : 'Check your designs'; };
  window.openCheckout = function () {
    if (!mLive().length || CART.some(function (c) { return PRODS[c.id] && PRODS[c.id].pv; })) return _ock.apply(this, arguments);
    var go = function () { renderCheckout(); showView('checkout'); };
    try { if (window.otrack) otrack('begin_checkout', { value: coTotals().total, skus: CART.map(function (c) { return c.id; }).concat(MC.map(function (c) { return c.id; })) }); } catch (e) {}
    if (window.acRequire && !window.ASSIST && (window.OUTRR_SUPA || {}).url) return acRequire(go, 'Sign in to check out');   // 186
    go();
  };
  window.renderCheckout = function () {
    _rc.apply(this, arguments); var L = mLive(); if (!L.length) return;
    var sum = document.querySelector('#coBody .osum'); if (!sum) return;
    var pe = document.getElementById('coPin'); if (pe && !pe.value) { var p0 = (L.filter(function (c) { return /^\d{6}$/.test(c.pin || ''); })[0] || {}).pin; if (p0) pe.value = p0; }   // the pincode typed on the design page
    sum.insertAdjacentHTML('beforebegin', L.map(function (c) { var x = PRODS[c.id];
      return '<div class="coline mco"><div class="im"><img src="' + esc(IMGS[x.img] || '') + '" alt=""></div><div><b>' + esc(x.n) + '</b> <span class="mto-badge" style="font-size:9px;padding:3px 7px">Made to Order</span>' +
        '<div class="co-mto">' + esc(specOf(x, c.o)) + '<br>' + (c.o.drawing ? 'Drawing to approve before production' : 'Made to the size you entered (you confirmed it)') + '</div></div><div class="q" data-mk="' + c.k + '"></div></div>'; }).join(''));
    if (!CART.length) [].slice.call(sum.querySelectorAll('.r')).forEach(function (r) { if (!r.classList.contains('tot')) r.remove(); });
    var tot = sum.querySelector('.r.tot'); if (tot) tot.insertAdjacentHTML('beforebegin', '<div id="coMtoR"></div>');
    var dl = document.getElementById('coDlvTxt'), dbox = dl && dl.closest('.cobox');
    if (dbox) { var days = L.map(function (c) { return daysTxt(PRODS[c.id].cz.make_days); }).filter(Boolean);
      dbox.insertAdjacentHTML('beforeend', '<div class="secline" id="coMtoDlv">Made to Order: made in ' + esc(days[0] || 'a few weeks') + ', then dispatched with tracking' + (CART.length ? '; ready-to-ship items go out straight away.' : '.') + '</div>'); }
    var asm = dbox && dbox.querySelector('.secline'); if (asm && !CART.length) asm.textContent = L.some(function (c) { return c.o.install || (PRODS[c.id].cz.install && PRODS[c.id].cz.install.required); }) ? 'Installed by a verified outrr partner after delivery (where you chose installation).' : 'Fixing is yours: a fixing guide comes with it.';
    siteBox(dbox);
    mCoPaint();
  };
  window.coShipPaint = function () { _sp.apply(this, arguments); if (mLive().length) mCoPaint(); };
  function mCoPaint() {
    var t = window.coTotals(), s = t.m; if (!s) return;
    s.lines.forEach(function (l) { var e = document.querySelector('#coBody .q[data-mk="' + l.c.k + '"]'); if (e) e.textContent = l.q.ok ? rs(l.q.total) : ''; });
    var box = document.getElementById('coMtoR');
    if (box) box.innerHTML = s.lines.map(function (l) { var q = l.q, o = l.o, R = function (a, b) { return '<div class="r"><span>' + a + '</span><span>' + b + '</span></div>'; };
      if (!q.ok) return R(esc(short(l.x.n)), '<span class="mto-err">' + esc(q.error) + '</span>');
      var h = R(esc(short(l.x.n)) + (s.n > 1 ? ' (' + esc(specOf(l.x, l.c.o).split(' · ')[0]) + ')' : ' (design)'), rs(q.product)) + (q.delivery ? R('· Delivery', q.delivery.fee == null ? 'Enter pincode' : rs(q.delivery_fee)) : '');
      if (o.install || o.lift) h += q.install && (q.install.available || q.install.pending || q.install.parts) ? instRows(q, 'r') : R(o.install ? '· Installation' : '· Lifting', /^\d{6}$/.test(o.pin) ? 'Not available here' : 'Enter pincode');
      return h; }).join('');
    var tot = document.getElementById('coTot'); if (tot) tot.textContent = s.ok || s.total ? rs(t.total) : '—';
    var sp = document.getElementById('coSplit'); if (sp) sp.innerHTML = window.coSplitHTML(t);
    var bt = document.getElementById('coPlace'); if (bt && !bt.disabled) bt.textContent = window.coPayLabel(t);
  }
  window.placeOrder = async function () {
    var L = mLive(); if (!L.length) return _po();
    var s = mSum();
    if (/^\d{6}$/.test(coPin())) { if (s.pend) return toast('Working out the installation charge — try again in a moment'); if (!s.ok) return toast(s.err); }
    var keep = CART;
    CART = keep.filter(function (c) { return !c.mto; }).concat(s.lines.map(function (l) { var o = {}, k; for (k in l.o) if (k !== 'zone' && k !== 'pin') o[k] = l.o[k]; return { id: l.c.id, q: 1, mto: o }; }));
    try { await _po(); } finally {
      if (!CART.length) { MC = []; mSave(); try { updBadge(); } catch (e) {} }   // placed: retail + designs in one order
      else CART = keep;
    }
  };

  // 185: checkout — site details for installation / lifting, asked once for every design. Mandatory ones come pre-ticked.
  var FLOORS = ['Ground'].concat(Array.from({ length: 30 }, function (_, i) { return 'Floor ' + (i + 1); }));
  function siteBox(anchor) {
    if (!anchor) return;
    if (!document.getElementById('mtoSiteCss')) { var st = document.createElement('style'); st.id = 'mtoSiteCss';
      st.textContent = '#mtoSite>div>div>label,#mtoSite>div>label.sl{display:block;font-size:11.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#6A6258;margin:0 0 6px}' +
        '#mtoSite select,#mtoSite input[inputmode]{width:100%;padding:11px 12px;border:1px solid #DDD5C8;border-radius:10px;font:inherit;background:#fff}#mtoSite .mto-chk{margin-top:10px}';
      document.head.appendChild(st); }
    var box = document.getElementById('mtoSite'); if (!box) { box = document.createElement('div'); box.id = 'mtoSite'; box.className = 'cobox'; anchor.parentNode.insertBefore(box, anchor);
      box.addEventListener('change', siteSet); box.addEventListener('input', function (e) { if (/^lift_[whd]$/.test(e.target.getAttribute('data-s') || '')) siteSet(e); }); }
    siteDraw();
  }
  function siteDraw() {
    var box = document.getElementById('mtoSite'); if (!box) return;
    var s = mSum(), fl = +SITE.floor || 0, anyInst = false, lf = null;
    var chk = function (k, on, dis, txt, key) { return '<label class="mto-chk"><input type="checkbox" data-s="' + k + '"' + (key ? ' data-mk="' + key + '"' : '') + (on ? ' checked' : '') + (dis ? ' disabled' : '') + '><span>' + txt + '</span></label>'; };
    var ins = s.lines.map(function (l) { var m = l.x.cz, off = m.install && m.install.offered, req = off && m.install.required; if (!off) return ''; if (l.o.install) anyInst = true;
      var p = l.q.install && l.q.install.parts && l.q.install.parts.lifting; if (p && (p.options || []).length > 1 && !lf) lf = p;
      var nm = s.n > 1 ? ' — ' + esc(short(l.x.n) + ' (' + specOf(l.x, l.c.o).split(' · ')[0] + ')') : '';
      return chk('install', l.o.install, req, req ? '<b>Installation included' + nm + '</b> (required for this design)' : '<b>Installation' + nm + '</b> by a verified outrr partner', l.c.k); }).join('');
    var allInst = s.lines.every(function (l) { return l.o.install; });
    box.innerHTML = '<h3>Site details</h3><div class="secline">For installation and getting ' + (s.n > 1 ? 'the designs' : 'it') + ' up to the floor. Mandatory items are already ticked.</div>' + ins +
      '<div class="frow2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px"><div><label>Where does it go?</label><select data-s="floor">' + FLOORS.map(function (f, i) { return '<option value="' + i + '"' + (i === fl ? ' selected' : '') + '>' + f + '</option>'; }).join('') + '</select></div>' +
      (fl > 0 ? '<div><label>Lift in the building?</label><select data-s="lift_type">' + [['none', 'No lift'], ['small', 'Small (passenger)'], ['big', 'Big (service / stretcher)'], ['custom', 'I know its size']].map(function (t) { return '<option value="' + t[0] + '"' + ((SITE.lift_type || 'none') === t[0] ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select></div>' : '<div></div>') + '</div>' +
      (fl > 0 && SITE.lift_type === 'custom' ? '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:8px">' + [['lift_w', 'Door width ft'], ['lift_h', 'Door height ft'], ['lift_d', 'Inside depth ft']].map(function (f) { return '<div><label>' + f[1] + '</label><input inputmode="decimal" data-s="' + f[0] + '" value="' + esc(SITE[f[0]] || '') + '"></div>'; }).join('') + '</div>' : '') +
      (fl > 0 ? (allInst ? '<p class="mto-hint" style="margin:8px 0 0">Getting it up to floor ' + fl + ' is part of the installation.</p>' : chk('lift', SITE.lift, false, '<b>Get ' + (anyInst ? 'the other designs' : s.n > 1 ? 'the designs' : 'it') + ' up to floor ' + fl + '</b> (optional — else delivered on the ground floor)')) : '') +
      (lf ? '<div style="margin-top:10px"><label class="sl">How it goes up' + (lf.required ? ' <span class="small">(long / heavy pieces' + (lf.floor > 3 ? ' or high floor' : '') + ': hydra or chain pulley needed)</span>' : '') + '</label><div style="display:flex;gap:14px;flex-wrap:wrap">' +
        lf.options.map(function (k) { return '<label class="mto-chk" style="margin:0"><input type="radio" name="liftby" data-s="lift_by" value="' + k + '"' + (lf.method === k ? ' checked' : '') + '><span>' + { labour: 'By labour', hydra: 'Hydra', chain: 'Chain pulley' }[k] + '</span></label>'; }).join('') + '</div></div>' : '');
  }
  function siteSet(e) {
    var t = e.target, k = t.getAttribute('data-s'); if (!k) return;
    if (k === 'install') { var c = MC.filter(function (z) { return z.k === t.getAttribute('data-mk'); })[0]; if (c) c.o.install = t.checked; }
    else if (k === 'lift') SITE.lift = t.checked;
    else if (k === 'floor') { SITE.floor = +t.value; if (!SITE.floor) { SITE.lift = false; SITE.lift_type = 'none'; } }
    else SITE[k] = t.value;
    mSave(); if (e.type === 'change') siteDraw(); mCoPaint();
  }
  function mRepaint(id) { if (!mLive().some(function (c) { return c.id === id; })) return; if (isOn('checkout')) { siteDraw(); mCoPaint(); } else if (isOn('cart')) renderCart(); }

  // ------------------------------------------------------------ 172: Made to Order prices open after sign-in (email code + name, mobile, city).
  // The first price check makes the customer's CRM lead; every later price check / product view / login lands on it.
  var OKK = 'outrr_mto_ok';
  function mtoOk() { if (window.ASSIST && window.ASSIST.name) return true;   // 186: Sales mode sees the prices
    try { return !!(window.acToken && localStorage.getItem('outrr_session') && sessionStorage.getItem(OKK) === '1'); } catch (e) { return false; } }
  window.mtoOk = mtoOk;
  async function crm(kind, d) {
    try { var t = window.acToken && await window.acToken(); if (!t) return null; var A = window.OUTRR_SUPA || {}, vid = null; try { vid = localStorage.getItem('outrr_vid'); } catch (e) {}
      var r = await fetch(A.url + '/rest/v1/rpc/crm_touch', { method: 'POST', headers: { apikey: A.anon, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify({ p: Object.assign({ kind: kind, vid: vid }, d || {}) }) });
      return r.ok ? await r.json() : null; } catch (e) { return null; }
  }
  window.mtoCrm = crm;
  async function profileOk() {
    var t = window.acToken && await window.acToken(); if (!t) return false; var A = window.OUTRR_SUPA || {};
    try { var r = await fetch(A.url + '/rest/v1/rpc/customer_profile_ok', { method: 'POST', headers: { apikey: A.anon, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: '{}' }); return r.ok && (await r.json()) === true; } catch (e) { return false; }
  }
  function unlocked(id) { try { sessionStorage.setItem(OKK, '1'); } catch (e) {} crm('login'); if (typeof id === 'function') return id(); if (typeof openProduct === 'function') openProduct(id); else if (S && S.id) draw(); }
  window.mtoUnlock = async function (id) {
    id = id || (S && S.id); if (!window.acRequire) return toast('Please try again in a moment');
    window.acRequire(async function () { if (await profileOk()) return unlocked(id); profileForm(id); }, 'Sign in to see the price for your size');
  };
  function profileForm(id, err) {
    var d = document.getElementById('mtoProf'); if (!d) { d = document.createElement('div'); d.id = 'mtoProf'; d.className = 'mto-prof'; document.body.appendChild(d); }
    var v = function (k) { var i = document.getElementById('mp-' + k); return i ? i.value : ''; };
    d.innerHTML = '<div class="mto-pbox" role="dialog" aria-modal="true" aria-label="Your details"><h3>One last step</h3><p>So our design team can help you with this order.</p>' +
      '<label>Your name<input id="mp-n" autocomplete="name" value="' + esc(v('n')) + '"></label><label>Mobile number<input id="mp-p" inputmode="numeric" maxlength="10" autocomplete="tel-national" placeholder="10-digit mobile" value="' + esc(v('p')) + '"></label>' +
      '<label>City<input id="mp-c" autocomplete="address-level2" placeholder="e.g. Gurugram" value="' + esc(v('c')) + '"></label>' + (err ? '<div class="mto-err">' + esc(err) + '</div>' : '') +
      '<button type="button" class="mto-go" id="mp-go">See the price</button></div>';
    d.classList.add('open');
    document.getElementById('mp-go').onclick = async function () {
      var n = v('n').trim(), ph = v('p').replace(/\D/g, '').slice(-10), c = v('c').trim();
      if (n.length < 2) return profileForm(id, 'Enter your name'); if (!/^[6-9]\d{9}$/.test(ph)) return profileForm(id, 'Enter a valid 10-digit mobile number'); if (c.length < 2) return profileForm(id, 'Enter your city');
      this.disabled = true; this.textContent = 'Saving…';
      try { var t = await window.acToken(), A = window.OUTRR_SUPA || {};
        var r = await fetch(A.url + '/rest/v1/rpc/customer_save_profile', { method: 'POST', headers: { apikey: A.anon, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify({ p: { name: n, phone: ph, city: c } }) });
        if (!r.ok) { var j = await r.json().catch(function () { return {}; }); return profileForm(id, j.message || 'Something went wrong'); }
      } catch (e) { return profileForm(id, 'Something went wrong — please try again'); }
      d.classList.remove('open'); unlocked(id);
    };
  }
  // ------------------------------------------------------------ pergolas: "Design it in 3D" — size, height, finish, colour, roof and layout on a live model
  var P3 = { st: 0, open: false, night: false };
  function isPg(id) { return /^MTO-PG-/.test(String(id || '')); }
  function isProp(id) { var x = PRODS[id]; return /^MTO-/.test(String(id || '')) && !/^MTO-PL-/.test(String(id)) && !!(x && x.cz) && ['furniture', 'sculptures'].indexOf(x.col) < 0; }   // 198: outrr's own make + install designs
  function pgGrp(m, re) { return arr(m.groups).filter(function (g) { return re.test(g.name || ''); })[0] || null; }
  function pgOpts() {
    var x = PRODS[S.id], m = x.cz, o = S.o, gv = function (re) { var g = pgGrp(m, re); return g ? (o.groups || {})[g.name] || (arr(g.options)[0] || {}).name : ''; };
    var lim = function (k, d) { var lo = num(m[k] && m[k].min) || 8, hi = num(m[k] && m[k].max) || 20; return Math.min(Math.max(num(o[k]) || d, lo), hi); };
    return { l: lim('l', 12), w: lim('w', 10), height: gv(/height/i) || o.h || '8 ft', material: o.material, colour: o.colour, cover: gv(/roof|cover/i), layout: gv(/layout/i) };
  }
  function pgLay() { var q = pgOpts(); return { L: q.l, W: q.w }; }
  function sharedSite() {   // 193f: the terrace the customer set up anywhere (planner / cabin studio) — one terrace everywhere
    try { var v = JSON.parse(localStorage.getItem('outrr_site') || 'null') || (JSON.parse(localStorage.getItem('outrr_plan') || 'null') || {}).site; if (v && v.kind === 'terrace' && v.pw) { v = JSON.parse(JSON.stringify(v)); delete v.cx; delete v.cz; v.rot = 0; return v; } } catch (e) {}
    return null;
  }
  function keepSite() { if (S && S.proj === 'new') return; try { if (S && S.site && S.site.kind === 'terrace') { var v = JSON.parse(JSON.stringify(S.site)); delete v.clash; delete v.place; delete v.whole; localStorage.setItem('outrr_site', JSON.stringify(v)); } } catch (e) {} }
  function pgAutoWall() {   // against a mumty / room / lift: fixed to it (posts on that side go, layout Wall-mounted); moved off: free-standing again
    var t = S.site, m = PRODS[S.id].cz, o = S.o, lg = pgGrp(m, /layout/i); if (!t || t.kind !== 'terrace' || !lg) return;
    var wallOpt = arr(lg.options).filter(function (y) { return /wall/i.test(y.name || ''); })[0], freeOpt = arr(lg.options).filter(function (y) { return /free/i.test(y.name || ''); })[0] || arr(lg.options)[0]; if (!wallOpt) return;
    var L = pgLay(), d = tsDims(t, L), r = { x: t.cx, z: t.cz, w: d[0], d: d[1] }, hit = null;
    arr(t.blocks).filter(function (b) { return /mumty|room|lift/.test(b.type); }).forEach(function (b) { if (hit) return;
      var oz = Math.min(r.z + r.d, b.z + b.d) - Math.max(r.z, b.z), ox = Math.min(r.x + r.w, b.x + b.w) - Math.max(r.x, b.x), ok = function (g) { return g > -0.05 && g <= 0.8; };
      if (oz >= 2 && ok(r.x - (b.x + b.w))) hit = ['left', b]; else if (oz >= 2 && ok(b.x - (r.x + r.w))) hit = ['right', b]; else if (ox >= 2 && ok(r.z - (b.z + b.d))) hit = ['back', b]; else if (ox >= 2 && ok(b.z - (r.z + r.d))) hit = ['front', b]; });
    o.groups = Object.assign({}, o.groups);
    if (hit) { var rot = { back: 0, left: 90, front: 180, right: 270 }[hit[0]], b = hit[1], cx = r.x + r.w / 2, cz = r.z + r.d / 2; t.rot = rot; var d2 = tsDims(t, L);   // its back to the wall, flush
      if (hit[0] === 'left') { t.cx = b.x + b.w; t.cz = Math.round((cz - d2[1] / 2) * 2) / 2; } else if (hit[0] === 'right') { t.cx = b.x - d2[0]; t.cz = Math.round((cz - d2[1] / 2) * 2) / 2; }
      else if (hit[0] === 'back') { t.cz = b.z + b.d; t.cx = Math.round((cx - d2[0] / 2) * 2) / 2; } else { t.cz = b.z - d2[1]; t.cx = Math.round((cx - d2[0] / 2) * 2) / 2; }
      if (tsClash(t, L)) return; if (o.groups[lg.name] !== wallOpt.name) { o.groups[lg.name] = wallOpt.name; S.pgAuto = true; S.tsMsg = 'Fixed to the ' + TS_KIND[b.type][1].toLowerCase() + ' wall — no posts on that side ("' + wallOpt.name.split(' (')[0] + '", price updated)'; } }
    else if (S.pgAuto && o.groups[lg.name] === wallOpt.name) { o.groups[lg.name] = freeOpt.name; S.pgAuto = false; S.tsMsg = 'Free-standing again'; }
  }
  function pgEv(ev) { if (!S || !isPg(S.id)) return; if (ev.t === 'selitem' || ev.t === 'moveitem') return arEv(ev); if (ev.t === 'movesite') tsDrop(ev); else if (ev.t === 'movecab') { tsMoveTo(ev, pgLay()); pgAutoWall(); } keepSite(); draw(); p3Draw(); }
  function cheapO(m, l, w) {   // the cheapest way to have design m at l × w (decking under a pergola)
    var o = { l: l, w: w, pin: lastPin(), addons: arr(m.addons).filter(function (a) { return a.on; }).map(function (a) { return a.name; }), groups: {}, drawing: m.drawing !== 'no', size_ok: true, note: '' };
    arr(m.groups).forEach(function (g) { var op = arr(g.options).slice().sort(function (a, b) { return ((num(a.fixed) || 0) + (num(a.rate) || 0)) - ((num(b.fixed) || 0) + (num(b.rate) || 0)); })[0]; if (op) o.groups[g.name] = op.name; });
    var hs = arr(m.h && m.h.options); if (hs.length) o.h = num(hs[0]); var best = null;
    arr(m.materials).slice(0, 6).forEach(function (mt) { var oo = Object.assign({}, o, { material: mt.name, colour: (arr(mt.colours)[0] || {}).name || '' }), q = null; try { q = window.mtoPrice(m, oo); } catch (e) {} if (q && q.ok && (!best || q.product < best.price)) best = { o: oo, price: q.product }; });
    return best;
  }
  function deckLine() {   // 193f: the deck under a pergola goes in the cart as the cheapest open Decking design at its size
    var q = pgOpts(), best = null; Object.keys(PRODS).forEach(function (id) { var x = PRODS[id]; if (!x || !x.cz || x.col !== 'decking' || x.oo === false) return; var b = cheapO(x.cz, q.l, q.w); if (b && (!best || b.price < best.price)) best = { id: id, o: b.o, price: b.price }; });
    return best;
  }
  function p3Css() {
    if (document.getElementById('pg3Css')) return; var st = document.createElement('style'); st.id = 'pg3Css';
    st.textContent = '.pg3-btn{display:flex;align-items:center;gap:10px;width:100%;margin:0 0 14px;padding:12px 14px;border:1.5px solid var(--terra,#BE5633);border-radius:12px;background:#fbefe9;color:#8a3a1f;font:700 14px inherit;font-family:inherit;cursor:pointer;text-align:left}.pg3-btn small{display:block;font-weight:500;font-size:11.5px;color:#7a5a4c}' +
      'body.pg3-on .near-pill,body.pg3-on #wachat,body.pg3-on .wa-fab{display:none!important}.pg3-ov{position:fixed;inset:0;z-index:300;background:#fff;display:none;flex-direction:column}.pg3-ov.open{display:flex}body.pg3-on{overflow:hidden}' +
      '.pg3-hd{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #eee}.pg3-hd b{font-size:15px;flex:1}.pg3-hd button{border:1px solid #ddd;background:#fff;border-radius:999px;padding:7px 12px;font:600 12px inherit;font-family:inherit;cursor:pointer}' +
      '.pg3-bd{flex:1;display:grid;grid-template-columns:minmax(0,1fr) 340px;min-height:0}.pg3-st{position:relative;min-height:0;background:#eef0ea}.pg3-st canvas{display:block}' +
      '.pg3-cap{position:absolute;left:12px;bottom:12px;background:rgba(255,255,255,.94);border-radius:10px;padding:7px 11px;font-size:12px;font-weight:600;color:#2E2E2E;pointer-events:none}' +
      '.pg3-pn{overflow:auto;padding:14px 16px 170px;border-left:1px solid #eee}.pg3-pn .lb{font-size:10.5px;font-weight:700;color:#8a857c;letter-spacing:.06em;text-transform:uppercase;margin:12px 0 6px}' +
      '.pg3-ch{display:flex;flex-wrap:wrap;gap:6px}.pg3-ch button{border:1px solid #ddd;background:#fff;border-radius:999px;padding:6px 11px;font:600 12px inherit;font-family:inherit;cursor:pointer;color:#2E2E2E}.pg3-ch button.on{border-color:var(--terra,#BE5633);background:#fbefe9;color:#8a3a1f}' +
      '.pg3-sw{width:30px;height:30px;border-radius:50%;padding:0!important;border:2px solid #fff!important;box-shadow:0 0 0 1px #ccc}.pg3-sw.on{box-shadow:0 0 0 2px var(--terra,#BE5633)}' +
      '.pg3-sz{display:flex;gap:16px;flex-wrap:wrap;font-size:13px}.pg3-sz span{display:inline-flex;align-items:center;gap:7px}.pg3-sz button{width:30px;height:30px;border-radius:50%;border:1px solid #ddd;background:#fff;font-size:16px;cursor:pointer}' +
      '.pg3-ft{position:absolute;right:0;bottom:0;width:340px;padding:12px 16px;background:#fff;border-top:1px solid #eee;border-left:1px solid #eee}.pg3-ft button{width:100%;padding:13px;border:0;border-radius:10px;background:var(--terra,#BE5633);color:#fff;font:700 14px inherit;font-family:inherit;cursor:pointer}' +
            '.pg3-where{margin:0 0 6px}.pg3-where .wz-tabs{display:flex;flex-wrap:wrap;gap:6px}.pg3-where .wz-tabs button,.pg3-where .ts-c{border:1px solid #ddd;background:#fff;border-radius:999px;padding:6px 11px;font:600 12px inherit;font-family:inherit;cursor:pointer}.pg3-where .wz-tabs button.on{border-color:var(--terra,#BE5633);background:#fbefe9;color:#8a3a1f}.pg3-where .wz-h{font-size:16px;margin:4px 0}.pg3-where .wz-sub{font-size:12.5px;color:#6A6258}.pg3-where .ts-h{font-size:12px;font-weight:700;margin:12px 0 6px}.pg3-where .ts-h span{font-weight:500;color:#8a857c}.pg3-where .ts-row{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;margin:6px 0}.pg3-where .ts-n{display:flex;flex-direction:column;font-size:11px;color:#6A6258}.pg3-where .ts-n input{width:64px;height:32px;border:1px solid #D9CDBB;border-radius:8px;padding:0 6px}.pg3-where .ts-n i{display:none}.pg3-where .ts-blk{border:1px solid #EEE6DA;border-radius:10px;padding:8px;margin:0 0 6px}.pg3-where .ts-bh{display:flex;justify-content:space-between}.pg3-where .ts-x{border:0;background:none;color:#B3261E;cursor:pointer}.pg3-where .wz-note{font-size:12px;background:#EEF3E8;border:1px solid #D3DEC5;border-radius:10px;padding:7px 10px;margin:8px 0}.pg3-where .ts-lb{font-size:12px;margin:4px 0}.pg3-go{width:100%;margin:12px 0 0;padding:12px;border:0;border-radius:10px;background:#2E2E2E;color:#fff;font:700 14px inherit;font-family:inherit;cursor:pointer}.pg3-note{font-size:12px;color:#6A6258;margin:6px 0 0}'+
      '.pg3-pr{margin:18px 0 0;padding:12px 14px;border-radius:12px;background:#F6F1EA;font-size:13px;color:#4A4640}.pg3-pr b{display:block;font-size:20px;color:#2E2E2E;margin:2px 0}.pg3-pr small{font-size:11.5px;color:#8a857c}' +
      '.pg-sum{border:1px solid #E7DFD3;border-radius:12px;padding:4px 14px 8px;margin:0 0 6px;background:#fff}.pg-sum-h{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F0EAE1;margin-bottom:4px}.pg-sum-h b{font-size:14px}.pg-sum-h button{border:0;background:none;color:var(--terra,#BE5633);font:700 12.5px inherit;font-family:inherit;cursor:pointer;padding:4px 0}.pg-sum-r{display:flex;justify-content:space-between;gap:12px;padding:5px 0;font-size:13px}.pg-sum-r span{color:#8a857c}.pg-sum-r b{font-weight:600;color:#2E2E2E;text-align:right}' +
      '@media(max-width:760px){.pg3-ft .plan-card small{display:none}.pg3-ft .plan-card{padding:8px 12px!important;margin-bottom:6px}.pg3-ft .plan-card>span:first-child{font-size:20px}.pg3-pn{padding-bottom:130px}.pg3-bd{grid-template-columns:1fr;grid-template-rows:46vh auto}.pg3-pn{border-left:0;border-top:1px solid #eee}.pg3-ft{width:100%;border-left:0}}';
    document.head.appendChild(st);
  }
  function p3Btn() { if (!isPg(S && S.id)) return ''; p3Css();   // its styles were added only when the 3D opened, so the button showed tiny and unstyled
    return '<button type="button" class="pg3-btn" data-act="pg3"><span style="font-size:22px">✦</span><span>Customise &amp; check price<small>Size, finish, roof and add-ons on a live 3D model — then your proposal with price and drawings</small></span></button>'; }
  function p3Where() {   // 193f: lawn / terrace (the studio's terrace setup), where it stands, a deck and furniture to see it with
    var t = S.site, on = t && t.kind === 'terrace', h = '';
    if (S.pgW) return '<div class="pg3-where">' + terraceUI(pgLay(), true) + '<button type="button" class="pg3-go" data-p3="wdone">Done — put the pergola on it →</button></div>';
    h += '<div class="lb">Where</div><div class="pg3-ch">' + '<button type="button" data-ts="kind:ground" class="' + (!on ? 'on' : '') + '">🌳 Lawn / garden</button><button type="button" data-ts="kind:terrace" class="' + (on ? 'on' : '') + '">🏙 Terrace</button>' + (on ? '<button type="button" data-p3="wopen">✎ Set up the terrace</button>' : '') + '</div>';
    if (on) h += '<div class="pg3-where">' + placeBox(pgLay()) + (S.tsMsg ? '<div class="wz-note">' + esc(S.tsMsg) + '</div>' : '') + '</div>';
    var fu = S.o.furn || '';
    if (on) return h + '<div class="lb">Under it</div><div class="pg3-ch"><button type="button" data-p3x="deck" class="' + (S.o.deck ? 'on' : '') + '">' + (S.o.deck ? '✓ ' : '+ ') + 'Deck floor under it</button></div>' + (S.o.deck && mtoOk() ? (function (dl) { return '<p class="pg3-note">' + (dl ? 'Goes in your cart as <b>' + esc(short(PRODS[dl.id].n)) + '</b>, ' + q2(pgOpts()) + ' — ' + rs(dl.price) : 'Our team will price the deck') + '</p>'; })(deckLine()) : '') + arUI();   // 193j
    h += '<div class="lb">Around it <span style="text-transform:none;font-weight:500;letter-spacing:0">— to see how it looks</span></div><div class="pg3-ch"><button type="button" data-p3x="deck" class="' + (S.o.deck ? 'on' : '') + '">' + (S.o.deck ? '✓ ' : '+ ') + 'Deck floor under it</button></div>';
    if (S.o.deck && mtoOk()) { var dl = deckLine(); h += '<p class="pg3-note">' + (dl ? 'Goes in your cart as <b>' + esc(short(PRODS[dl.id].n)) + '</b>, ' + q2(pgOpts()) + ' — ' + rs(dl.price) : 'Our team will price the deck') + '</p>'; }
    h += '<div class="pg3-ch" style="margin-top:6px">' + [['', 'No furniture'], ['lounge', 'Sofa set'], ['dining', 'Dining set'], ['swing', 'Swing']].map(function (f) { return '<button type="button" data-p3f="' + f[0] + '" class="' + (fu === f[0] ? 'on' : '') + '">' + f[1] + '</button>'; }).join('') + '</div>';
    return h;
  }
  function q2(q) { return q.l + ' × ' + q.w + ' ft'; }
  function p3Panel() {
    if (S.projAsk && S.proj !== 'pending') return projAskUI2();
    if (S.pgW) return p3Where();
    var x = PRODS[S.id], m = x.cz, o = S.o, q = pgOpts(), h = p3Where(), chips = function (g, cur) { return '<div class="pg3-ch">' + arr(g.options).filter(function (y) { return y.name; }).map(function (y) { return '<button type="button" class="' + (y.name === cur ? 'on' : '') + '" data-p3g="' + esc(g.name) + '" data-v="' + esc(y.name) + '">' + esc(String(y.name).split(' (')[0]) + '</button>'; }).join('') + '</div>'; };
    h += '<div class="lb">Size (ft)</div><div class="pg3-sz"><span>Length <button type="button" data-p3d="l,-1" aria-label="Shorter">−</button><b>' + q.l + '</b><button type="button" data-p3d="l,1" aria-label="Longer">+</button></span><span>Width <button type="button" data-p3d="w,-1" aria-label="Narrower">−</button><b>' + q.w + '</b><button type="button" data-p3d="w,1" aria-label="Wider">+</button></span></div>';
    var mats = arr(m.materials).filter(function (y) { return y.name; }), mat = mats.filter(function (y) { return y.name === o.material; })[0] || mats[0];
    if (mats.length > 1) h += '<div class="lb">' + esc((m.labels && m.labels.material) || 'Finish') + '</div><div class="pg3-ch">' + mats.map(function (y) { return '<button type="button" class="' + (y === mat ? 'on' : '') + '" data-p3m="' + esc(y.name) + '">' + esc(y.name) + '</button>'; }).join('') + '</div>';
    var cols = arr(mat && mat.colours);
    if (cols.length) h += '<div class="lb">Colour · ' + esc(o.colour || '') + '</div><div class="pg3-ch">' + cols.map(function (c) { return '<button type="button" class="pg3-sw' + (c.name === o.colour ? ' on' : '') + '" title="' + esc(c.name) + '" aria-label="' + esc(c.name) + '" data-p3c="' + esc(c.name) + '" style="background:' + (c.hex2 ? 'linear-gradient(135deg,' + c.hex + ' 50%,' + c.hex2 + ' 50%)' : c.hex || '#999') + '"></button>'; }).join('') + '</div>';
    var gs = arr(m.groups).filter(function (g) { return g.name && arr(g.options).length; }), rk = function (g) { return /roof|cover/i.test(g.name) ? 0 : /height/i.test(g.name) ? 1 : /layout/i.test(g.name) ? 2 : 3; };
    gs.slice().sort(function (a, b) { return rk(a) - rk(b); }).forEach(function (g) { h += '<div class="lb">' + esc(g.name) + '</div>' + chips(g, (o.groups || {})[g.name]); });   // every option group of the design, not only roof / height / layout
    var adds = arr(m.addons).filter(function (a) { return a.name; }), ok = mtoOk();
    if (adds.length) h += '<div class="lb">Add-ons</div><div class="pg3-ch">' + adds.map(function (a) { var on = arr(o.addons).indexOf(a.name) >= 0; return '<button type="button" class="' + (on ? 'on' : '') + '" data-p3a="' + esc(a.name) + '">' + (on ? '✓ ' : '+ ') + esc(a.name) + (ok && +a.price ? ' · ' + rs(a.price) + (a.charge === 'unit' ? '/' + UW(m.unit) : '') : '') + '</button>'; }).join('') + '</div>';
    if (ok) { var pq = null; try { pq = priceR(S.id, m, o, PCT); } catch (e) {} if (pq && pq.ok) h += '<div class="pg3-pr">Your price <b>' + rs(pq.total) + '</b><small>incl. GST' + (pq.install && pq.install.amount ? ' and installation' : '') + ' · delivery as per pincode</small></div>'; }
    return h;
  }
  function p3Draw() {
    var ov = document.getElementById('pg3'); if (!ov || !P3.open || !S || !isPg(S.id)) return; var q = pgOpts();
    var pn = document.getElementById('pg3Pn'); if (pn) pn.innerHTML = p3Panel();
    var cap = document.getElementById('pg3Cap'); if (cap) cap.textContent = q.l + ' × ' + q.w + ' ft · ' + q.height + ' clear · ' + (q.colour || '') + (q.cover && !/^open/i.test(q.cover) ? ' · ' + String(q.cover).split(' (')[0] : '') + (q.layout && !/free/i.test(q.layout) ? ' · ' + String(q.layout).split(' (')[0] : '');
    var nb = document.getElementById('pg3Night'); if (nb) nb.textContent = P3.night ? '☀ Day' : '☾ Night';
    if (P3.st === 2) { try { if (!P3.ev && window.Pergola3D.onEvent) { P3.ev = 1; window.Pergola3D.onEvent(pgEv); }
      window.Pergola3D.show(document.getElementById('pg3St'), S.id, q, { night: P3.night, site: tsOpts(), deck: !!S.o.deck, furn: S.site && S.site.kind === 'terrace' ? '' : S.o.furn === 'lounge' ? 'sofa' : S.o.furn || '' }); window.Pergola3D.resize(); } catch (e) { if (window.console) console.warn(e); } return; }
    if (P3.st !== 0) return; P3.st = 1;
    var ready = function () { P3.st = window.Pergola3D ? 2 : -1; p3Draw(); };
    try { new Function('u', 'return import(u)')('/pergola3d.js?v=6').then(ready, function () { P3.st = -1; }); } catch (e) { P3.st = -1; }
  }
  window.pg3Open = function (on) {
    if (!S || !isPg(S.id)) return; p3Css(); var ov = document.getElementById('pg3');
    if (on === false) { if (ov) ov.classList.remove('open'); document.body.classList.remove('pg3-on'); P3.open = false; return; }
    if (!ov) { ov = document.createElement('div'); ov.id = 'pg3'; ov.className = 'pg3-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Design your pergola in 3D'); document.body.appendChild(ov);
      ov.addEventListener('click', p3Click); ov.addEventListener('change', function (e) { if (S && isPg(S.id) && tsInput(e.target)) { if (S.site && S.site.cx == null) tsCentre(S.site, pgLay()); keepSite(); draw(); p3Draw(); } }); }
    if (S.fromPlan == null && S.proj == null) projLoad();
    if (!S.site && S.proj !== 'new') { var sh = sharedSite(); if (sh) { S.site = sh; tsCentre(sh, pgLay()); } }
    var x = PRODS[S.id];
    ov.innerHTML = '<div class="pg3-hd"><b>' + esc(x.n) + ' · 3D</b><button type="button" id="pg3Night" data-p3="night">☾ Night</button><button type="button" data-p3="close" aria-label="Close">✕ Close</button></div>' +
      '<div class="pg3-bd"><div class="pg3-st" id="pg3St"><div class="pg3-cap" id="pg3Cap"></div></div><div class="pg3-pn" id="pg3Pn"></div></div>' +
      '<div class="pg3-ft">' + (S.fromPlan != null ? '<button type="button" data-p3="toplan">Save to my plan →</button></div>' : '') + (S.fromPlan != null ? '' : '<button type="button" class="plan-card" data-p3="plan"><span>🗺️</span><span><b>Add more around it</b><small>Seating, planters, a bar, a cabin… on your terrace / lawn with this pergola</small></span><i>→</i></button><button type="button" data-p3="done">' + (mtoOk() ? 'Done — see my proposal' : 'Done — see my price') + '</button></div>');
    var oo = S.o, q = pgOpts(); oo.l = oo.l || q.l; oo.w = oo.w || q.w;   // the model's size becomes the order size
    ov.classList.add('open'); document.body.classList.add('pg3-on'); P3.open = true; draw(); p3Draw();
    try { if (window.otrack) otrack('customise_start', { sku: S.id, ref: '3d' }); } catch (e) {}
  };
  function p3Click(e) {
    var t = e.target.closest('button'); if (!t || !S) return; var o = S.o, m = PRODS[S.id].cz, a = t.getAttribute('data-p3');
    if (a === 'close') { if (S.fromPlan != null) { S.fromPlan = null; window.pg3Open(false); return window.outrrPlan && window.outrrPlan({ reload: true }); } return window.pg3Open(false); }
    if (a === 'night') { P3.night = !P3.night; return p3Draw(); }
    if (a === 'proj-same' || a === 'proj-new') { S.proj = a === 'proj-new' ? 'new' : 'same'; S.projAsk = null;
      if (S.proj === 'new') { S.site = null; S.pl = null; } else if (!S.site) { var sh2 = sharedSite(); if (sh2) { S.site = sh2; tsCentre(sh2, pgLay()); } }
      draw(); return p3Draw(); }
    if (a === 'plan') { window.pg3Open(false); return window.mtoPlanFrom(); }   // 193
    if (a === 'toplan') return window.mtoBackToPlan();   // 193g
    if (t.hasAttribute('data-ts')) { var wasT = S.site && S.site.kind === 'terrace'; tsClick(t); var isT = S.site && S.site.kind === 'terrace';
      if (isT && !wasT) S.pgW = true; if (isT && S.site.cx == null) tsCentre(S.site, pgLay()); if (/^rot:|^centre/.test(t.getAttribute('data-ts'))) pgAutoWall(); keepSite(); draw(); return p3Draw(); }
    if (a === 'wopen') { S.pgW = true; return p3Draw(); }
    if (a === 'wdone') { S.pgW = false; if (S.site && S.site.kind === 'terrace' && (S.site.cx == null || tsClash(S.site, pgLay()))) tsCentre(S.site, pgLay()); pgAutoWall(); keepSite(); return p3Draw(); }
    if (t.hasAttribute('data-p3x')) { o.deck = !o.deck; draw(); return p3Draw(); }
    if (t.hasAttribute('data-p3f')) { o.furn = t.getAttribute('data-p3f'); return p3Draw(); }
    var ad = t.getAttribute('data-p3a'); if (ad) { o.addons = arr(o.addons).filter(function (z) { return z !== ad; }); if (!t.classList.contains('on')) o.addons.push(ad); draw(); return p3Draw(); }
    if (a === 'done') { pgSnap(); window.pg3Open(false); if (!mtoOk()) { var kid = S.id, ko = S.o, ks = { snap: S.snap, site: S.site, proj: S.proj, pl: S.pl, plFor: S.plFor };   // sign in: the product page opens again — the choices come back, then the proposal
        return window.mtoUnlock(function () { try { openProduct(kid); } catch (er) {} var n = 0; (function w() { if (!S || S.id !== kid || !S.pdp) { if (n++ < 80) return setTimeout(w, 100); return; } S.o = ko; Object.assign(S, ks); draw(); window.mtoProposal(true); })(); }); }
      return window.mtoProposal(true); }
    var d = t.getAttribute('data-p3d'); if (d) { var k = d.split(',')[0], q = pgOpts(), lo = num(m[k] && m[k].min) || 8, hi = num(m[k] && m[k].max) || 20; o[k] = Math.min(Math.max(q[k] + (+d.split(',')[1]), lo), hi); draw(); return p3Draw(); }
    var mt = t.getAttribute('data-p3m'); if (mt) { o.material = mt; var mm = arr(m.materials).filter(function (y) { return y.name === mt; })[0]; o.colour = (arr(mm && mm.colours)[0] || {}).name || ''; if (o.colour) colPic(o.colour); draw(); return p3Draw(); }
    var c2 = t.getAttribute('data-p3c'); if (c2) { o.colour = c2; colPic(c2); draw(); return p3Draw(); }
    var g = t.getAttribute('data-p3g'); if (g) { o.groups = Object.assign({}, o.groups); o.groups[g] = t.getAttribute('data-v'); if (/height/i.test(g)) { var hv = parseFloat(o.groups[g]); if (hv && arr(m.h && m.h.options).length) o.h = arr(m.h.options).filter(function (z) { return parseFloat(z) === hv; })[0] || o.h; } draw(); return p3Draw(); }
  }
  function lockHTML(x, below) {   // below = under the options: the price for the choices made above
    return '<div class="mto-lock"' + (below ? ' style="margin-top:14px"' : '') + '><h3 class="mto-ph">Price for your ' + (below ? 'choices' : 'size') + '</h3><p class="mto-hint">Every ' + esc(x.n) + ' is made to your size' + (x.cz && x.cz.install && x.cz.install.offered ? ' and installed by our team' : '') +
      '. Sign in with your email to see the price for your size, finish and options — it takes 30 seconds.</p><button type="button" class="mto-go" data-act="unlock">Check price</button></div>';
  }
  var sent = {}, sentT = null;
  function logPrice(id, o, q) {   // one price check per product per configuration, after the customer stops changing it
    var key = id + '|' + JSON.stringify([o.l, o.w, o.h, o.n, o.size, o.material, o.colour, o.groups, o.addons, o.install]);
    if (sent[key]) return; clearTimeout(sentT);
    sentT = setTimeout(function () { sent[key] = 1; crm('price_check', { sku: id, price: Math.round(q.total || 0), options: { l: o.l, w: o.w, h: o.h, n: o.n, size: o.size, finish: o.material, colour: o.colour, groups: o.groups, addons: o.addons, install: !!o.install, pin: o.pin } })
      .then(function (r) { if (r && r.need_profile) { try { sessionStorage.removeItem(OKK); } catch (e) {} profileForm(id); } }); }, 2500);
  }
  // signed in earlier in this browser: check once whether the profile is complete, so prices open without asking again
  (async function () { try { if (sessionStorage.getItem(OKK) !== '1' && localStorage.getItem('outrr_session')) { var w = 0; while (!window.acToken && w++ < 40) await new Promise(function (r) { setTimeout(r, 100); }); if (await profileOk()) { sessionStorage.setItem(OKK, '1'); if (S && S.pdp && S.id) draw(); } } } catch (e) {} })();
  (async function () { try { if (!sessionStorage.getItem('outrr_login_logged') && localStorage.getItem('outrr_session')) { var w = 0; while (!window.acToken && w++ < 40) await new Promise(function (r) { setTimeout(r, 100); }); sessionStorage.setItem('outrr_login_logged', '1'); crm('login'); } } catch (e) {} })();
  // ------------------------------------------------------------ pergolas: the product page's short info, the project question, and the proposal after the customiser
  // The proposal = one page after "Done": final design (3D) + reference photo, plan and elevations with sizes, one spec list, the price,
  // what goes into it, technical specs, things around it, payment terms, how it's made, questions, then delivery + installation and Add to cart.
  // Each proposal is saved to the customer's account (My account → Proposals) and emailed (customer_proposals, 197).
  var PG_D = { 'MTO-PG-AF': { leg: 'aframe', over: 0, bover: 0, raf: [40, 120], gap: 200 }, 'MTO-PG-AL': { roof: 'louvre', over: 150 }, 'MTO-PG-BR': { leg: 'branch', post: 125 },
    'MTO-PG-CA': { roof: 'barrel' }, 'MTO-PG-EG': { roof: 'grid', post: 125, raf: [50, 200], gap: 600 }, 'MTO-PG-FP': { leg: 'gate' }, 'MTO-PG-FR': { roof: 'float' }, 'MTO-PG-GB': { roof: 'gable' },
    'MTO-PG-HP': { roof: 'hip', post: 125 }, 'MTO-PG-IP': { post: 125, inset: 600, over: 600 }, 'MTO-PG-KB': { leg: 'knee', post: 125, over: 450 }, 'MTO-PG-LD': { leg: 'ladder', post: 80 },
    'MTO-PG-LP': { leg: 'lean' }, 'MTO-PG-OV': { over: 300, bover: 300 }, 'MTO-PG-PA': { post: 200, beam: [200, 200], over: 0, bover: 0, raf: [40, 150], gap: 150 }, 'MTO-PG-PB': { leg: 'pillar' },
    'MTO-PG-PF': { leg: 'portal', post: 150 }, 'MTO-PG-RH': { gap: 120, raf: [40, 120] }, 'MTO-PG-SO': { leg: 'sidetwin' }, 'MTO-PG-TP': { leg: 'mast' }, 'MTO-PG-TT': { roof: 'tiers' },
    'MTO-PG-TW': { leg: 'twin', post: 90 }, 'MTO-PG-WC': { post: 200, beam: [100, 300], raf: [50, 150], gap: 220, over: 150 }, 'MTO-PG-WV': { roof: 'wave' }, 'MTO-PG-XG': { roof: 'xgable', post: 125 } };
  function pgSpec(id, q) {   // = pergola3d.js build(): posts, beams, rafters at this size (for the drawings and the numbers)
    var r = PG_D[id] || {}, ft = function (v) { return v / 304.8; }, L = +q.l || 12, W = +q.w || 10, H = parseFloat(q.height) || 8;
    var post = r.post || 100, beam = r.beam || [100, 200], raf = r.raf || [50, 150], gap = r.gap || 450, P = ft(post), inset = ft(r.inset || 0);
    var over = ft(r.over == null ? 450 : r.over), bover = ft(r.bover == null ? 300 : r.bover), lay = String(q.layout || '').toLowerCase(), wall = /wall/.test(lay), dbl = /double/.test(lay);
    var spread = function (a, b, minN) { var n = Math.max(minN, Math.ceil((b - a) / 14 - 0.001)), o = []; for (var k = 0; k <= n; k++) o.push(a + (b - a) * k / n); return o; };
    var rows = wall ? [W - inset - P / 2] : spread(inset + P / 2, W - inset - P / 2, 1), cols = spread(inset + P / 2, L - inset - P / 2, dbl ? 2 : 1), leg = r.leg || 'straight', pts = [];
    cols.forEach(function (x) { rows.forEach(function (z) { if (x === cols[0] || x === cols[cols.length - 1] || z === rows[0] || z === rows[rows.length - 1] || W > 20) pts.push([x, z]); }); });
    if (leg === 'branch') pts = cols.filter(function (x, i) { return i > 0 && i < cols.length - 1; }).length ? cols.slice(1, -1).map(function (x) { return [x, W / 2]; }) : [[L * 0.27, W / 2], [L * 0.73, W / 2]];
    var n = pts.length * (leg === 'twin' ? 2 : 1) + (leg === 'sidetwin' ? 4 : 0), span = L + 2 * over, nRaf = Math.max(2, Math.floor(span / ft(gap)) + 1);
    return { L: L, W: W, H: H, post: post, beam: beam, raf: raf, gap: gap, over: over, bover: bover, P: P, rows: rows, cols: cols, pts: pts, posts: n, nRaf: nRaf, wall: wall, leg: leg, roof: r.roof || 'flat' };
  }
  function ftin(v) { v = Math.round((+v || 0) * 12); var f = Math.floor(v / 12), i = v - f * 12; return f + "'" + (i ? ' ' + i + '"' : ''); }
  function pgDrawings(id, q) {   // plan (top) + front and side elevations, sizes in feet — indicative; the maker's drawing comes for approval
    var g = pgSpec(id, q), L = g.L, W = g.W, H = g.H, ov = g.over, bo = g.bover, P = Math.max(g.P, 0.35), BH = g.beam[1] / 304.8, RH = g.raf[1] / 304.8, ink = '#2E2E2E', mu = '#9A9184', ac = '#C26445';
    var dimH = function (x1, x2, y, t) { return '<line x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '" stroke="' + ac + '" stroke-width="0.06" marker-start="url(#pa)" marker-end="url(#pa)"/><text x="' + (x1 + x2) / 2 + '" y="' + (y - 0.35) + '" font-size="0.75" text-anchor="middle" fill="' + ac + '" font-weight="700">' + t + '</text>'; };
    var dimV = function (x, y1, y2, t) { return '<line x1="' + x + '" y1="' + y1 + '" x2="' + x + '" y2="' + y2 + '" stroke="' + ac + '" stroke-width="0.06" marker-start="url(#pa)" marker-end="url(#pa)"/><text x="' + (x - 0.35) + '" y="' + (y1 + y2) / 2 + '" font-size="0.75" text-anchor="middle" fill="' + ac + '" font-weight="700" transform="rotate(-90 ' + (x - 0.35) + ' ' + (y1 + y2) / 2 + ')">' + t + '</text>'; };
    var defs = '<defs><marker id="pa" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="' + ac + '"/></marker></defs>';
    var svg = function (vb, body, lab) { return '<figure class="pp-dw"><svg viewBox="' + vb + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + lab + '">' + defs + body + '</svg><figcaption>' + lab + '</figcaption></figure>'; };
    // plan
    var b = '<rect x="' + (-ov) + '" y="' + (-bo) + '" width="' + (L + 2 * ov) + '" height="' + (W + 2 * bo) + '" fill="#F4EEE4" stroke="' + mu + '" stroke-width="0.05" stroke-dasharray="0.3 0.2"/>';
    var nr = Math.min(g.nRaf, 80); for (var k = 0; k < nr; k++) { var x = -ov + (L + 2 * ov) * (nr > 1 ? k / (nr - 1) : 0); b += '<line x1="' + x + '" y1="' + (-bo) + '" x2="' + x + '" y2="' + (W + bo) + '" stroke="#CDBFA9" stroke-width="0.05"/>'; }
    g.rows.forEach(function (z) { b += '<line x1="' + (-ov) + '" y1="' + z + '" x2="' + (L + ov) + '" y2="' + z + '" stroke="' + ink + '" stroke-width="' + Math.max(g.beam[0] / 304.8, 0.18) + '"/>'; });
    g.pts.forEach(function (p) { b += '<rect x="' + (p[0] - P / 2) + '" y="' + (p[1] - P / 2) + '" width="' + P + '" height="' + P + '" fill="' + ink + '"/>'; });
    if (g.wall) b += '<rect x="' + (-ov - 1) + '" y="-0.9" width="' + (L + 2 * ov + 2) + '" height="0.5" fill="#BDB4A6"/><text x="' + L / 2 + '" y="-1.2" font-size="0.6" text-anchor="middle" fill="' + mu + '">WALL</text>';
    b += dimH(0, L, W + bo + 1.4, ftin(L)) + dimV(L + ov + 1.4, 0, W, ftin(W));
    var plan = svg((-ov - 1.8) + ' ' + (-bo - 1.8) + ' ' + (L + 2 * ov + 4.6) + ' ' + (W + 2 * bo + 4.4), b, 'Plan (top view) · ' + ftin(L) + ' × ' + ftin(W) + ' · ' + g.posts + ' posts');
    // elevations: front (length) and side (width)
    var elev = function (len, ext, pos, side) {
      var top = H + BH, roofTop = top + RH, e = '<line x1="' + (-ext - 2) + '" y1="0" x2="' + (len + ext + 2) + '" y2="0" stroke="' + mu + '" stroke-width="0.08"/>';
      pos.forEach(function (x) { e += '<rect x="' + (x - P / 2) + '" y="' + (-H) + '" width="' + P + '" height="' + H + '" fill="' + ink + '"/>'; });
      e += '<rect x="' + (-ext) + '" y="' + (-top) + '" width="' + (len + 2 * ext) + '" height="' + BH + '" fill="' + ink + '"/>';
      if (g.roof === 'gable' || g.roof === 'xgable' || g.roof === 'hip') e += side || g.roof !== 'gable' ? '<path d="M' + (-ext) + ' ' + (-top) + ' L' + len / 2 + ' ' + (-top - len * 0.28) + ' L' + (len + ext) + ' ' + (-top) + '" fill="none" stroke="' + ink + '" stroke-width="0.25"/>' : '<rect x="' + (-ext) + '" y="' + (-roofTop - W * 0.28) + '" width="' + (len + 2 * ext) + '" height="' + (W * 0.28 + RH) + '" fill="none" stroke="' + ink + '" stroke-width="0.15"/>';
      else if (g.roof === 'barrel') e += '<path d="M' + (-ext) + ' ' + (-top) + ' Q' + len / 2 + ' ' + (-top - len * 0.32) + ' ' + (len + ext) + ' ' + (-top) + '" fill="none" stroke="' + ink + '" stroke-width="0.25"/>';
      else e += '<rect x="' + (-ext) + '" y="' + (-roofTop) + '" width="' + (len + 2 * ext) + '" height="' + RH + '" fill="#6E655A"/>';
      e += dimH(0, len, 1.3, ftin(len)) + dimV(-ext - 1.2, -H, 0, ftin(H) + ' clear');
      return e;
    };
    var hTop = H + BH + RH + (g.roof === 'barrel' || g.roof === 'gable' || g.roof === 'xgable' || g.roof === 'hip' ? Math.max(L, W) * 0.33 : 0) + 1;
    var front = svg((-ov - 3) + ' ' + (-hTop) + ' ' + (L + 2 * ov + 5) + ' ' + (hTop + 2.6), elev(L, ov, g.cols, false), 'Front elevation · ' + ftin(H) + ' clear height');
    var side = svg((-bo - 3) + ' ' + (-hTop) + ' ' + (W + 2 * bo + 5) + ' ' + (hTop + 2.6), elev(W, bo, g.rows, true), 'Side elevation');
    return plan + front + side;
  }
  function pgPdpInfo(x, m) {   // under the Customise button on the product page: the base rate and what happens next
    propCss();
    var mats = arr(m.materials).filter(function (y) { return y.name && +y.rate; }), lo = mats.length ? Math.min.apply(null, mats.map(function (y) { return +y.rate; })) : 0;
    return (lo ? '<div class="pg-rate"><span>Starts at</span><b>' + rs(lo) + ' <small>/ sq ft</small></b><em>incl. GST · ' + esc(mats.filter(function (y) { return +y.rate === lo; })[0].name) + ', open roof</em></div>' : '') +
      '<ol class="pg-next"><li><b>Customise in 3D</b> — size, finish, colour, roof, height, layout and add-ons</li><li><b>Get your proposal</b> — price, plan &amp; elevation drawings, specifications</li><li><b>Add to cart</b> — pay ' + PCT + '% now, the rest before dispatch</li></ol>' +
      (S.prop0 ? '<button type="button" class="pg-again" onclick="mtoProposal(true)">See your proposal →</button>' : '');
  }
  function localPlan() {   // a plan the customer has started (planner / designers), with things in it
    try { var p = JSON.parse(localStorage.getItem('outrr_plan') || 'null'); var its = arr(p && p.items).filter(function (o) { return o && !o._me && o.cat !== 'pergola'; }); if (its.length) return { n: its.length, items: its, name: p.pname || '', site: p.site || {} }; } catch (e) {}
    return null;
  }
  function projAskUI() {
    var p = S.projAsk, sz = p.site && p.site.pw ? p.site.pw + ' × ' + p.site.pd + ' ft ' + (p.site.kind === 'ground' ? 'lawn' : 'terrace') : (p.site && p.site.kind === 'ground' ? 'lawn' : 'terrace');
    return '<div class="pp-ask"><b>Is this pergola for the space you are already planning?</b><p>You have a plan' + (p.name ? ' “' + esc(p.name) + '”' : '') + ' — ' + esc(sz) + ' with ' + p.n + ' thing' + (p.n > 1 ? 's' : '') + ' in it.</p>' +
      '<button type="button" data-p3="proj-same">Yes — same space<small>The pergola goes on that ' + (p.site && p.site.kind === 'ground' ? 'lawn' : 'terrace') + ', with the things around it</small></button>' +
      '<button type="button" data-p3="proj-new">No — another project<small>A different home or client: start fresh (your plan stays saved)</small></button></div>';
  }
  function pgSnap() { try { var r = window.Pergola3D && window.Pergola3D._r && window.Pergola3D._r(); if (r && r.renderer) { r.renderer.render(r.scene, r.cam); S.snap = r.renderer.domElement.toDataURL('image/jpeg', 0.86); } } catch (e) {} }
  function refPhoto(x) { var c = S.o.colour, im = ''; try { var gc = window.GALC && GALC[S.id]; if (gc && c) { var hit = gc.filter(function (g) { return g && g[1] === c; })[0]; if (hit) im = hit[0]; }
    if (!im && c) arr(x.cz.materials).forEach(function (mm) { arr(mm.colours).forEach(function (cc) { if (!im && cc.name === c && cc.img) im = cc.img; }); }); } catch (e) {} return im || IMGS[x.img] || ''; }
  function pgParts(id, q, m, sp) {   // what goes into it, with the numbers for this size
    var o = S.o, cov = String(q.cover || ''), col = (o.colour || '') + ' ' + (o.material || ''), wood = /wood|wpc/i.test(col), out = [];
    var add = function (name, spec, key, num) { out.push({ name: name, spec: spec, num: num || '', img: partImg(key) }); };
    add('Posts', (sp.leg === 'pillar' ? 'on stone-clad pillar bases · ' : '') + sp.post + ' × ' + sp.post + ' mm MS SHS, ' + ftin(sp.H) + ' clear height', 'ms shs steel frame', sp.posts + ' nos');
    add('Main beams', sp.beam[0] + ' × ' + sp.beam[1] + ' mm MS RHS, around the frame', 'steel frame', (sp.rows.length * 2) + ' runs');
    if (sp.roof === 'louvre') add('Angled louvres', 'MS / aluminium blades at about 35°, fixed', 'louvre', sp.nRaf + ' nos');
    else add('Rafters', sp.raf[0] + ' × ' + sp.raf[1] + ' mm, about ' + sp.gap + ' mm apart' + (sp.roof !== 'flat' ? ' (' + sp.roof + ' roof)' : ''), 'rafter', '~' + sp.nRaf + ' nos');
    if (/poly/i.test(cov)) add('Roof sheet', 'Multiwall polycarbonate, UV-protected, with sealing tape and end caps', 'polycarbonate', Math.round((sp.L + 2 * sp.over) * (sp.W + 2 * sp.bover)) + ' sq ft');
    else if (/glass/i.test(cov)) add('Roof glass', 'Toughened / laminated glass panels on purlins', 'laminated glass', Math.round(sp.L * sp.W) + ' sq ft');
    else if (/louv/i.test(cov)) add('Louvre roof', 'Aluminium louvre blades on the rafters', 'aluminium louver', Math.round(sp.L * sp.W) + ' sq ft');
    add('Finish', wood ? 'Zinc primer + powder coat, wood-look finish' : 'Zinc primer + oven-baked powder coat · ' + (o.colour || 'black'), 'powder coat');
    add('Base plates & anchors', 'MS base plates with chemical anchors (terrace) or RCC footings (lawn)', 'anchor', sp.posts + ' sets');
    add('Bolts & fixings', 'SS / GI bolts, washers and brackets — every part pre-drilled and numbered', 'ss bolt');
    arr(m.specs).filter(function (s) { return /light/i.test(s.label); }).forEach(function (s) { add('Lighting', s.value, 'led strip light'); });
    arr(o.addons).forEach(function (a) { add(a, 'Add-on', a); });
    return out;
  }
  function aroundList() {   // 15: things placed around this pergola / cabin (designer / plan)
    var its = arOthers(S.pl && S.plFor === S.id ? S.pl : null); if (!its.length && S.proj === 'same' && (isPg(S.id) || PRODS[S.id].cz.unit === 'cabin')) { var lp = localPlan(); if (lp) its = lp.items; }
    var me = isPg(S.id) ? 'pergola' : PRODS[S.id].cz.unit === 'cabin' ? 'cabin' : ''; return its.filter(function (o) { return o && o.cat !== me; });
  }
  window.mtoOpenProposal = function (id, cfg, pin) {   // My account → Proposals → Open: the product page with those choices, then the proposal
    if (!PRODS[id]) return toast('This design is not on the store now'); try { openProduct(id); } catch (e) { return; }
    var n = 0; (function w() { if (!S || S.id !== id || !S.pdp) { if (n++ < 80) return setTimeout(w, 100); return; }
      Object.keys(cfg || {}).forEach(function (k) { if (cfg[k] !== undefined && k !== 'layout') S.o[k] = k === 'addons' ? arr(cfg[k]).slice() : k === 'groups' ? Object.assign({}, cfg[k]) : cfg[k]; });
      if (/^\d{6}$/.test(pin || '')) S.o.pin = pin; S.proj = 'same'; draw(); window.mtoProposal(true); })();
  };
  function propCss() {
    if (document.getElementById('ppCss')) return; var st = document.createElement('style'); st.id = 'ppCss';
    st.textContent = '.pp-ov{position:fixed;inset:0;z-index:320;background:#F7F3EC;display:none;flex-direction:column}.pp-ov.open{display:flex}body.pp-on{overflow:hidden}body.pp-on .near-pill,body.pp-on #wachat,body.pp-on .wa-fab{display:none!important}' +
      '.pp-hd{display:flex;align-items:center;gap:10px;padding:10px 16px;background:#fff;border-bottom:1px solid #E7DFD3}.pp-hd b{flex:1;font-size:15px}.pp-hd button{border:1px solid #ddd;background:#fff;border-radius:999px;padding:7px 12px;font:600 12px inherit;font-family:inherit;cursor:pointer}' +
      '.pp-bd{flex:1;overflow:auto;padding:18px 16px 120px}.pp-w{max-width:1080px;margin:0 auto}.pp-s{background:#fff;border:1px solid #E7DFD3;border-radius:16px;padding:18px 20px;margin:0 0 14px}.pp-s h2{font-size:19px;margin:0 0 4px}.pp-s .sub{font-size:13px;color:#7A7268;margin:0 0 12px}' +
      '.pp-top h1{font-size:26px;margin:0 0 2px}.pp-top .meta{font-size:12.5px;color:#7A7268}.pp-pics{display:grid;grid-template-columns:1.25fr 1fr;gap:12px;margin-top:12px}.pp-pics figure{margin:0;border-radius:12px;overflow:hidden;background:#EEF0EA;position:relative}.pp-pics img{width:100%;height:100%;max-height:420px;object-fit:cover;display:block}.pp-pics figcaption{position:absolute;left:10px;bottom:10px;background:rgba(255,255,255,.94);border-radius:8px;padding:5px 9px;font-size:12px;font-weight:600}' +
      '.pp-dws{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:12px;align-items:start}.pp-dw{margin:0;border:1px solid #EFE7DA;border-radius:12px;padding:10px;background:#FFFDF9}.pp-dw svg{width:100%;height:auto;max-height:360px;display:block;font-family:inherit}.pp-dw figcaption{font-size:12px;color:#5d574e;font-weight:600;margin-top:6px}.pp-note{font-size:12px;color:#8A8278;margin:8px 0 0}' +
      '.pp-spec{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 26px}.pp-spec h3{grid-column:1/-1;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#C26445;margin:14px 0 4px}.pp-spec div{display:flex;justify-content:space-between;gap:14px;padding:8px 0;border-bottom:1px solid #F0EAE1;font-size:13.5px}.pp-spec span{color:#7A7268}.pp-spec b{font-weight:600;text-align:right}' +
      '.pp-price .mto-sum{background:#2E2E2E;color:#fff;border-radius:14px;padding:14px 16px}.pp-price .mto-sum .rw span{color:#F2EDE6}.pp-parts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.pp-part{display:flex;gap:10px;border:1px solid #EFE7DA;border-radius:12px;padding:8px;align-items:center}.pp-part img,.pp-part i{width:64px;height:64px;border-radius:9px;object-fit:cover;flex:none;background:#F2ECE2;display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:700;color:#B5A894}.pp-part b{display:block;font-size:13.5px}.pp-part small{display:block;font-size:12px;color:#6A6258;line-height:1.4}.pp-part em{font-style:normal;font-size:11.5px;font-weight:700;color:#C26445}' +
      '.pp-tech{width:100%;border-collapse:collapse;font-size:13px}.pp-tech th,.pp-tech td{text-align:left;padding:8px 10px;border-bottom:1px solid #F0EAE1;vertical-align:top}.pp-tech th{font-size:11px;color:#8A8278;text-transform:uppercase;letter-spacing:.06em}.pp-tech td:last-child{font-weight:700;white-space:nowrap}' +
      '.pp-ar details{border:1px solid #EFE7DA;border-radius:12px;padding:10px 12px;margin:0 0 8px}.pp-ar summary{cursor:pointer;font-weight:600;font-size:13.5px}.pp-ar p{font-size:12.5px;color:#6A6258;margin:6px 0 0}' +
      '.pp-terms{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.pp-terms div{background:#F7F3EC;border-radius:12px;padding:12px}.pp-terms b{display:block;font-size:20px}.pp-terms small{font-size:12px;color:#6A6258}' +
      '.pp-steps{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;counter-reset:s}.pp-steps div{border:1px solid #EFE7DA;border-radius:12px;padding:10px;font-size:12.5px;color:#5d574e}.pp-steps b{display:block;font-size:13px;color:#2E2E2E}.pp-steps b:before{counter-increment:s;content:counter(s);display:inline-flex;width:20px;height:20px;border-radius:50%;background:#C26445;color:#fff;font-size:11px;align-items:center;justify-content:center;margin-right:6px}' +
      '.pp-faq details{border-bottom:1px solid #F0EAE1;padding:10px 0}.pp-faq summary{cursor:pointer;font-weight:600;font-size:14px}.pp-faq p{font-size:13px;color:#5d574e;margin:6px 0 0}' +
      '.pp-inst{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:6px 0 10px}.pp-inst button{border:1.5px solid #E2D6C4;background:#fff;border-radius:12px;padding:12px;text-align:left;font:inherit;cursor:pointer;color:#2E2E2E}.pp-inst button.on{border-color:#C26445;background:#FFF8F2}.pp-inst b{display:block;font-size:14px}.pp-inst small{display:block;font-size:12px;color:#6A6258;margin-top:3px}' +
      '.pp-cta{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.pp-cta .mto-go{flex:1 1 220px;margin:0}.pp-more{flex:1 1 220px;border:1.5px solid #C26445;background:#FFF8F2;color:#8a3a1f;border-radius:12px;padding:13px;font:700 14px inherit;font-family:inherit;cursor:pointer}.pp-mail{flex-basis:100%;font-size:12.5px;color:#6A6258;margin:2px 0 0}' +
      '.pp-bar{position:fixed;left:0;right:0;bottom:0;z-index:321;background:#fff;border-top:1px solid #E7DFD3;padding:10px 16px;display:none}.pp-ov.open~.pp-bar,.pp-bar.open{display:block}.pp-bar .in{max-width:1080px;margin:0 auto;display:flex;gap:12px;align-items:center}.pp-bar .t{flex:1;font-size:12.5px;color:#6A6258}.pp-bar .t b{display:block;font-size:19px;color:#2E2E2E}.pp-bar button{border:0;border-radius:10px;background:#C26445;color:#fff;padding:12px 20px;font:700 14px inherit;font-family:inherit;cursor:pointer}.pp-bar button:disabled{opacity:.5}' +
      '.pg-rate{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px;margin:2px 0 10px}.pg-rate span{font-size:12.5px;color:#7A7268}.pg-rate b{font-size:22px}.pg-rate small{font-size:13px;font-weight:600;color:#7A7268}.pg-rate em{flex-basis:100%;font-style:normal;font-size:12px;color:#8A8278}' +
      '.pg-next{margin:0;padding:0 0 0 18px;font-size:13px;color:#5d574e;line-height:1.7}.pg-next b{color:#2E2E2E}.pg-again{margin-top:10px;width:100%;border:1.5px solid #C26445;background:#FFF8F2;color:#8a3a1f;border-radius:10px;padding:10px;font:700 13px inherit;font-family:inherit;cursor:pointer}' +
      '.pp-ask{border:2px solid #C26445;border-radius:14px;padding:14px;background:#FFF8F2;margin:4px 0 10px}.pp-ask b{font-size:15px}.pp-ask p{font-size:12.5px;color:#6A6258;margin:6px 0 10px}.pp-ask button{display:block;width:100%;text-align:left;border:1px solid #E2D6C4;background:#fff;border-radius:10px;padding:10px 12px;margin:0 0 8px;font:700 13.5px inherit;font-family:inherit;cursor:pointer;color:#2E2E2E}.pp-ask small{display:block;font-weight:500;font-size:12px;color:#7A7268}' +
      '.pp-pics.one{grid-template-columns:1fr}.pp-dws.one{grid-template-columns:minmax(0,680px)}.cu-st img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}.tr-noimg .tr-c div{padding:14px}.pdp-mto .mto-desc .trustrow{flex-wrap:wrap;overflow:visible}.pdp-mto .mto-desc .chips{flex-wrap:wrap}' +
      '@media(max-width:760px){.pp-pics,.pp-dws,.pp-spec,.pp-parts,.pp-terms,.pp-inst{grid-template-columns:1fr}.pp-steps{grid-template-columns:1fr 1fr}.pp-top h1{font-size:21px}.pp-s{padding:14px}.pp-bd{padding:12px 10px 120px}}';
    document.head.appendChild(st);
  }
  window.mtoProposal = function (on) {
    var ov = document.getElementById('mtoProp'), bar = document.getElementById('ppBar');
    if (on === false) { if (ov && ov.classList.contains('open')) { ov.classList.remove('open'); if (bar) bar.classList.remove('open'); document.body.classList.remove('pp-on'); if (S) { S.prop = false; try { draw(); } catch (e) {} } } return; }
    if (!S || !PRODS[S.id] || !isProp(S.id)) return; propCss(); if (PRODS[S.id].cz.unit === 'cabin') { try { var sn = window.Cabin3D && window.Cabin3D.snapshot(); if (sn) S.snap = sn; } catch (e) {} } try { window.cuOpen(false); } catch (e) {} try { if (S.studio) window.cbStudio(null); } catch (e) {}
    if (!ov) { ov = document.createElement('div'); ov.id = 'mtoProp'; ov.className = 'pp-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); document.body.appendChild(ov);
      ov.addEventListener('input', onInput); ov.addEventListener('change', onChange); ov.addEventListener('click', propClick);
      bar = document.createElement('div'); bar.id = 'ppBar'; bar.className = 'pp-bar'; document.body.appendChild(bar); bar.addEventListener('click', propClick); }
    S.prop = true; S.prop0 = true; S.propAdded = false; var x = PRODS[S.id];
    ov.setAttribute('aria-label', 'Your proposal — ' + x.n); ov.innerHTML = propHTML();
    ov.classList.add('open'); bar.classList.add('open'); document.body.classList.add('pp-on'); var bd = ov.querySelector('.pp-bd'); if (bd) bd.scrollTop = 0;
    paint(); propSave();
    try { if (window.otrack) otrack('view_proposal', { sku: S.id }); } catch (e) {}
  };
  function propHTML() {
    if (!isPg(S.id)) return propGen();
    var x = PRODS[S.id], m = x.cz, o = S.o, q = pgOpts(), sp = pgSpec(S.id, q), nm = short(x.n), today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    var mats = arr(m.materials).filter(function (y) { return y.name; }), mat = mats.filter(function (y) { return y.name === o.material; })[0] || mats[0];
    var row = function (a, b) { return b ? '<div><span>' + esc(a) + '</span><b>' + esc(b) + '</b></div>' : ''; }, specOf = function (re) { var s = arr(m.specs).filter(function (z) { return re.test(z.label); })[0]; return s ? s.value : ''; };
    var grpVal = function (g) { return String((o.groups || {})[g.name] || (arr(g.options)[0] || {}).name || '').split(' (')[0]; }, others = arr(m.groups).filter(function (g) { return g.name && arr(g.options).length && !/roof|cover|height|layout/i.test(g.name); });
    var h = '<div class="pp-hd"><button type="button" data-pp="back">← Change in 3D</button><b>Your proposal · ' + esc(nm) + '</b><button type="button" data-pp="close" aria-label="Close">✕</button></div><div class="pp-bd"><div class="pp-w">';
    // 1. the design
    h += '<section class="pp-s pp-top"><h1>' + esc(nm) + '</h1><div class="meta">' + esc(sp.L + ' × ' + sp.W + ' ft · ' + q.height + ' clear · ' + (o.colour || '') + (mat && mats.length > 1 ? ' ' + mat.name : '')) + ' · ' + esc(today) + ' · SKU ' + esc(S.id) + ' · outrr in-house design</div>' +
      '<div class="pp-pics">' + (S.snap ? '<figure><img src="' + S.snap + '" alt="Your pergola in 3D"><figcaption>Your design (3D)</figcaption></figure>' : '') + '<figure><img src="' + esc(refPhoto(x)) + '" alt="' + esc(x.alt || nm) + '"><figcaption>' + esc(nm) + ' (reference photo, for the look)</figcaption></figure></div></section>';
    // 2. drawings
    h += '<section class="pp-s"><h2>Plan &amp; elevations</h2><p class="sub">Your size, in feet. The maker sends the full working drawing for your approval before making starts.</p><div class="pp-dws">' + pgDrawings(S.id, q) + '</div><p class="pp-note">Indicative drawing — post positions and member sizes are confirmed on the approval drawing after a site check.</p></section>';
    // 3. specifications — the one list
    h += '<section class="pp-s"><h2>Specifications</h2><p class="sub">Everything you chose, in one place</p><div class="pp-spec"><h3>Design</h3>' + row('Design', nm) + row('SKU', S.id) + row('Designed by', 'outrr (in-house design)') + row('Made by', 'A verified outrr factory partner') +
      '<h3>Size</h3>' + row('Length × width', ftin(sp.L) + ' × ' + ftin(sp.W)) + row('Area covered', Math.round(sp.L * sp.W) + ' sq ft') + row('Clear height', String(q.height)) + row('Layout', String(q.layout || 'Free-standing').split(' (')[0]) +
      '<h3>Frame &amp; roof</h3>' + row((m.labels && m.labels.material) || 'Finish', mat && mat.name) + row((m.labels && m.labels.colour) || 'Colour', o.colour) + row('Roof covering', String(q.cover || 'Open').split(' (')[0]) + row('Roof', specOf(/^roof$/i)) + row('Posts', sp.posts + ' × ' + sp.post + ' mm MS SHS') +
      others.map(function (g) { return row(g.name, grpVal(g)); }).join('') + row('Add-ons', arr(o.addons).length ? o.addons.join(', ') : 'None') +
      '<h3>Build &amp; service</h3>' + row('Structure', specOf(/structure/i)) + row('Lighting', specOf(/light/i)) + row('Fixing', specOf(/fixing/i)) + row('Made in', (daysTxt(m.make_days) || '15–25 days') + ' after you approve the drawing') + row('Warranty', '3 years on the steel frame') + row('Installation', 'Your choice below — outrr installer or install yourself') + '</div></section>';
    // 4. price
    h += '<section class="pp-s pp-price"><h2>Price</h2><p class="sub">Incl. GST · delivery and installation for your pincode (enter it below)</p><div class="mto-sum lt" id="mtoSum"></div></section>';
    // 5. what goes into it + 6. technical specifications
    var parts = pgParts(S.id, q, m, sp);
    h += '<section class="pp-s"><h2>What goes into it</h2><p class="sub">Every part of your ' + esc(nm.toLowerCase()) + ', for this size</p><div class="pp-parts">' + parts.map(function (p) { return '<div class="pp-part">' + (p.img ? '<img src="' + esc(p.img) + '" alt="" loading="lazy">' : '<i>' + esc(p.name.charAt(0)) + '</i>') + '<div><b>' + esc(p.name) + (p.num ? ' <em>' + esc(p.num) + '</em>' : '') + '</b><small>' + esc(p.spec) + '</small></div></div>'; }).join('') + '</div></section>';
    var tech = [['Posts', sp.post + ' × ' + sp.post + ' mm MS square hollow section', sp.posts + ' nos × ' + ftin(sp.H)], ['Main beams', sp.beam[0] + ' × ' + sp.beam[1] + ' mm MS RHS', sp.rows.length * 2 + ' runs'],
      [sp.roof === 'louvre' ? 'Louvres' : 'Rafters', sp.raf[0] + ' × ' + sp.raf[1] + ' mm at ~' + sp.gap + ' mm centres', '~' + sp.nRaf + ' nos'], ['Overhang', 'Beyond the posts', ftin(sp.over) + ' / ' + ftin(sp.bover)],
      ['Clear height', 'Floor to underside of the beams', String(q.height)], ['Overall size', 'Roof outline (with overhang)', ftin(sp.L + 2 * sp.over) + ' × ' + ftin(sp.W + 2 * sp.bover)],
      ['Finish', 'Zinc primer + powder coat (oven-baked)', o.colour || ''], ['Fixing', specOf(/fixing/i) || 'Base plates + chemical anchors', sp.posts + ' sets'], ['Wind', 'Designed for Delhi NCR wind loads', '']];
    h += '<section class="pp-s"><h2>Technical specifications</h2><p class="sub">The numbers for your ' + esc(sp.L + ' × ' + sp.W) + ' ft pergola</p><table class="pp-tech"><tr><th>Part</th><th>Specification</th><th>Qty / size</th></tr>' + tech.map(function (t) { return '<tr><td>' + esc(t[0]) + '</td><td>' + esc(t[1]) + '</td><td>' + esc(t[2]) + '</td></tr>'; }).join('') + '</table></section>';
    // 7. things around it (15)
    var ar = aroundList();
    if (ar.length) h += '<section class="pp-s pp-ar"><h2>Around it — ' + ar.length + ' more thing' + (ar.length > 1 ? 's' : '') + '</h2><p class="sub">From your plan. Pick their designs and add them to the cart from the planner.</p>' + ar.map(function (it, i) { var c = (AR.m && AR.m.cat && AR.m.cat(it.cat)) || {}; return '<details' + (ar.length === 1 ? ' open' : '') + '><summary>' + (c.e || '•') + ' ' + esc(it.label || c.t || it.cat) + ' · ' + esc((+it.w || '') + (it.d ? ' × ' + it.d : '') + ' ft') + '</summary><p>' + esc((c.t || it.cat) + (it.h ? ' · ' + it.h + ' ft high' : '') + (it.pick && PRODS[it.pick] ? ' · ' + short(PRODS[it.pick].n) : ' · design not picked yet')) + '</p></details>'; }).join('') + '<button type="button" class="pp-more" data-pp="plan">🗺️ Open the plan — choose their designs →</button></section>';
    // 8. payment terms + 9. how it's made
    h += '<section class="pp-s"><h2>Payment terms</h2><p class="sub">Secure online payment — UPI, cards, netbanking</p><div class="pp-terms"><div><b>' + PCT + '%</b><small>Now, with the order — size and options locked</small></div><div><b>' + (100 - PCT) + '%</b><small>Before dispatch, when it is ready (we email the link)</small></div><div><b>With balance</b><small>Delivery + installation, paid with the balance</small></div></div><p class="pp-note">Made for you: it can’t be cancelled once making starts. A defect or damage in delivery / fitting is ours to fix.</p></section>';
    h += '<section class="pp-s"><h2>How your order is made</h2><p class="sub">You see and approve everything before making starts</p><div class="pp-steps"><div><b>Order</b>Pay ' + PCT + '%, choices locked</div><div><b>Drawing</b>Site check + drawing to approve</div><div><b>Making</b>' + esc(daysTxt(m.make_days) || '15–25 days') + ' in the factory</div><div><b>Balance</b>Pay the rest, then dispatch</div><div><b>Install</b>Our installer in ~2 days — or by you</div></div></section>';
    // 10. questions
    var faqs = arr(m.faqs).concat([{ q: 'When do I pay the rest?', a: 'You pay ' + PCT + '% now. The rest is paid when it is ready, before dispatch: we email you the link.' }, { q: 'Can I install it myself?', a: 'Yes. Every part comes pre-drilled and numbered with an assembly guide and all bolts, base plates and anchors. You need 2–3 people, a drill and a ladder; we recommend our installer for terraces above the 2nd floor.' }, { q: 'Can I cancel or return it?', a: 'It is made for you, so it can’t be cancelled once production starts or returned for a change of mind. A defect or damage in delivery is fixed by us.' }]);
    h += '<section class="pp-s pp-faq"><h2>Questions</h2>' + faqs.map(function (f) { return '<details><summary>' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p></details>'; }).join('') + '</section>';
    // 11. delivery + installation (last), note for the maker, add to cart
    h += '<section class="pp-s" id="ppSite"><h2>Delivery &amp; installation</h2><p class="sub">Your pincode prices the delivery and the installation</p>' + pdpTail(x, m, o, true) +
      '<div class="pp-inst"><button type="button" data-pinst="1" class="' + (o.install ? 'on' : '') + '"><b>' + (o.install ? '● ' : '○ ') + 'Installed by outrr</b><small>By your nearest verified outrr installer, in about 2 days · <span id="mtoInstTxt"></span></small></button>' +
      '<button type="button" data-pinst="0" class="' + (!o.install ? 'on' : '') + '"><b>' + (!o.install ? '● ' : '○ ') + 'Install it yourself</b><small>Assembly guide + all hardware (bolts, base plates, anchors) in the package. Every part pre-drilled and numbered.</small></button></div>' +
      '<div class="pp-cta" id="ppCta"></div></section>';
    return h + '</div></div>';
  }
  function propCta(q, noSave) {
    var el = document.getElementById('ppCta'), bar = document.getElementById('ppBar'); if (!el || !S) return; var x = PRODS[S.id], o = S.o;
    var cab = x.cz.unit === 'cabin', closed = x.oo === false, needPin = q && q.ok && (cab ? !(q.install && q.install.available) : q.delivery && q.delivery.fee == null), noInst = q && q.ok && o.install && q.install && !q.install.available && /^\d{6}$/.test(o.pin || ''), needOk = !o.drawing && !o.size_ok && x.cz.drawing !== 'always';
    var off = !(q && q.ok) || closed || needPin || noInst || needOk || (o.install && !/^\d{6}$/.test(o.pin || ''));
    var lab = S.propAdded ? '✓ In your cart — view cart' : closed ? 'Orders open soon' : !(q && q.ok) ? (q && q.error) || 'Choose your size' : needPin || (o.install && !/^\d{6}$/.test(o.pin || '')) ? 'Enter your pincode' : noInst ? 'Installation not available here — pick “Install it yourself”' : needOk ? 'Confirm your size above' : (S.editK ? 'Update cart' : 'Add to cart') + ' · pay ' + rs(q.pay_now) + ' now';
    el.innerHTML = '<button type="button" class="mto-go" data-pp="cart"' + (off && !S.propAdded ? ' disabled' : '') + '>' + esc(lab) + '</button><button type="button" class="pp-more" data-pp="plan">+ Add more elements to your space</button>' +
      '<p class="pp-mail">' + (S.propNo ? '<b>Proposal ' + esc(S.propNo) + '</b> — ' : '') + 'We email you this proposal, and it stays saved in <b>My account → Proposals</b>' + (S.propMail ? ' (sent to ' + esc(S.propMail) + ')' : '') + '.</p>';
    if (!noSave && q && q.ok) propSave();
    if (bar) bar.innerHTML = '<div class="in"><div class="t">' + (q && q.ok ? 'Total incl. GST<b>' + rs(q.total) + '</b>' : 'Your pergola') + '</div><button type="button" data-pp="' + (S.propAdded ? 'cart' : off ? 'site' : 'cart') + '"' + (closed && !S.propAdded ? ' disabled' : '') + '>' + (S.propAdded ? 'View cart' : closed ? 'Orders open soon' : off ? 'Delivery & installation ↓' : 'Add to cart') + '</button></div>';
  }
  function propClick(e) {
    var t = e.target.closest('[data-pp],[data-pinst]'); if (!t) return onClick(e); var a = t.getAttribute('data-pp');
    if (t.hasAttribute('data-pinst')) { S.o.install = t.getAttribute('data-pinst') === '1'; var bs = document.querySelectorAll('#mtoProp [data-pinst]'); [].forEach.call(bs, function (b) { var on = b.getAttribute('data-pinst') === (S.o.install ? '1' : '0'); b.classList.toggle('on', on); var bb = b.querySelector('b'); if (bb) bb.textContent = (on ? '● ' : '○ ') + bb.textContent.replace(/^[●○] /, ''); }); return paint(); }
    if (a === 'close') { window.mtoProposal(false); return; }
    if (a === 'back') { window.mtoProposal(false); return isPg(S.id) ? window.pg3Open(true) : PRODS[S.id].cz.unit === 'cabin' ? window.cbStudio(true) : window.cuOpen(true); }
    if (a === 'plan') { window.mtoProposal(false); return window.mtoPlanFrom(); }
    if (a === 'site') { var st = document.getElementById('ppSite'); if (st) st.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (a === 'cart') { if (S.propAdded) { window.mtoProposal(false); try { openCart(); } catch (er) {} return; }
      var before = MC.length, k0 = S.editK; addM(false); if (MC.length > before || (k0 && !S.editK)) { S.propAdded = true; propSave({ carted: true }); } return paint(); }
  }
  // saved to the account + emailed (197): one proposal per configuration; the same choices again update it
  async function authRpc(fn, args) {
    var t = window.acToken && await window.acToken(); if (!t) return null; var A = window.OUTRR_SUPA || {};
    var r = await fetch(A.url + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: A.anon, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify(args || {}) });
    return r.ok ? r.json() : null;
  }
  var propT = null;
  function propSave(extra) {
    if (!S || !S.prop || !(window.acToken)) return; clearTimeout(propT);
    var key = S.id + JSON.stringify(cfgOf(S.o)) + (S.o.pin || '') + JSON.stringify(extra || {}); if (key === S.propKey) return;
    propT = setTimeout(async function () { try {
      var x = PRODS[S.id], o = S.o, q = priceR(S.id, x.cz, o, PCT), sp = isPg(S.id) ? pgSpec(S.id, pgOpts()) : null, ar = aroundList();
      var pg = isPg(S.id), szT = pg ? sp.L + ' × ' + sp.W + ' ft' : sizeTxt(x.cz, o);
      var r = await authRpc('proposal_save', { p: Object.assign({ sku: S.id, name: short(x.n) + (szT ? ' · ' + szT : ''), cfg: cfgOf(o), pin: o.pin || '',
        summary: pg ? { size: szT, area: Math.round(sp.L * sp.W), height: pgOpts().height, finish: o.material, colour: o.colour, cover: String(pgOpts().cover || '').split(' (')[0], layout: String(pgOpts().layout || '').split(' (')[0], addons: arr(o.addons), posts: sp.posts }
          : { size: szT, finish: x.cz.unit === 'cabin' ? '' : o.material, colour: o.colour, addons: arr(o.addons), options: Object.keys(o.groups || {}).map(function (k) { return k + ': ' + String(o.groups[k]).split(' (')[0]; }) },
        price: q && q.ok ? { total: Math.round(q.total), pay_now: Math.round(q.pay_now), later: Math.round(q.before_dispatch || 0), install: !!o.install } : null,
        around: ar.slice(0, 30).map(function (it) { return { cat: it.cat, label: it.label || '', w: it.w, d: it.d, h: it.h || null, pick: it.pick || null }; }) }, extra || {}) });
      S.propKey = key; if (r && r.no) { S.propNo = r.no; S.propMail = r.email || ''; propCta(q, true); }
    } catch (e) {} }, extra ? 0 : 1800);
  }

  // ------------------------------------------------------------ 198: every outrr make + install design (not furniture / sculptures) — same as pergolas:
  // product page = title, description + tags, one "Customise & check price" button with the starting rate; customiser (photo + options) → proposal.
  var CU = { open: false };
  function cuBtn() { p3Css(); propCss(); var x = PRODS[S.id], cab = x.cz.unit === 'cabin';
    return '<button type="button" class="pg3-btn" data-act="' + (cab ? 'cab' : 'cu') + '"><span style="font-size:22px">✦</span><span>Customise &amp; check price<small>' + (cab ? 'Size, doors, rooms and finishes in 3D' : 'Size, finish, colour and options') + ' — then your proposal with price and drawings</small></span></button>'; }
  function unitWord(m) { return m.unit === 'length' ? 'running ft' : m.unit === 'area' || m.unit === 'face' ? 'sq ft' : ''; }
  function propInfo(x, m) {   // under the button: the starting rate (public) and what happens next
    propCss(); var mats = arr(m.materials).filter(function (y) { return y.name; }), uw = unitWord(m), line = '';
    if (uw) { var lo = Math.min.apply(null, mats.map(function (y) { return +y.rate || Infinity; })); if (isFinite(lo) && lo > 0) line = '<div class="pg-rate"><span>Starts at</span><b>' + rs(lo) + ' <small>/ ' + uw + '</small></b><em>incl. GST · ' + esc((mats.filter(function (y) { return +y.rate === lo; })[0] || {}).name || '') + '</em></div>'; }
    else if (m.unit === 'fixed') { var best = Infinity; arr(m.sizes).forEach(function (z) { mats.slice(0, 6).forEach(function (mt) { var v = fixedAt(m, mt, z); if (+v > 0 && v < best) best = v; }); }); if (isFinite(best)) line = '<div class="pg-rate"><span>Starts at</span><b>' + rs(best) + '</b><em>incl. GST · ' + esc((arr(m.sizes)[0] || {}).label || 'smallest size') + '</em></div>'; }
    var cab = m.unit === 'cabin', inst = m.install && m.install.offered;
    return line + '<ol class="pg-next"><li><b>Customise' + (cab || isPg(S.id) ? ' in 3D' : '') + '</b> — ' + (cab ? 'size, doors, rooms, roof and finishes' : isPg(S.id) ? 'size, finish, colour, roof, height, layout and add-ons' : 'size, finish, colour and options') + '</li><li><b>Get your proposal</b> — price, drawings with sizes, specifications</li><li><b>Add to cart</b> — pay ' + PCT + '% now, the rest before dispatch' + (inst ? (m.install.required ? ' · installed by outrr' : ' · installed by outrr or by you') : '') + '</li></ol>' +
      (S.prop0 ? '<button type="button" class="pg-again" onclick="mtoProposal(true)">See your proposal →</button>' : '');
  }
  function sizeTxt(m, o) {
    var u = m.unit; if (u === 'cabin') return o.layout ? num(o.layout.L) + ' × ' + num(o.layout.W) + ' ft' : '';
    if (u === 'area') return num(o.l) && num(o.w) ? o.l + ' × ' + o.w + ' ft' : '';
    if (u === 'face') return num(o.w) ? o.w + (num(o.h) ? ' × ' + o.h : '') + ' ft' + (num(o.h) ? '' : ' wide') : '';
    if (u === 'length') return num(o.l) ? o.l + ' running ft' + (num(o.h) ? ', ' + o.h + ' ft high' : '') : '';
    if (u === 'seat') return o.n ? o.n + ' seats' : ''; return o.size || '';
  }
  function optForm(x, m, o) {   // the design's choices (same fields as the old product-page form) — prices only when signed in
    var u = m.unit, uw = UW(u), np = !mtoOk(), f = [], hOpts = arr(m.h && m.h.options), mats = arr(m.materials).filter(function (y) { return String(y.name || '').trim(); }), mat = mats.filter(function (y) { return y.name === o.material; })[0] || mats[0];
    if (u === 'seat') { var sv = []; for (var i = num(m.n.min); i <= num(m.n.max); i++) sv.push([i, i + ' seats']); f.push(sel('data-pick="n"', sv, o.n, 'Seats')); }
    else if (u === 'fixed') f.push(sel('data-pick="size"', [['', 'Choose a size']].concat(arr(m.sizes).map(function (z) { return [z.label, z.label + (np ? '' : ' — ' + rs(fixedAt(m, mat, z)))]; })), o.size, 'Size'));
    else {
      if (u === 'area' || u === 'length') f.push('<label class="mto-pk"><span>Length (ft)</span><input inputmode="decimal" data-k="l" value="' + esc(o.l) + '" placeholder="' + esc(m.l.min) + '–' + esc(m.l.max) + '"></label>');
      if (u === 'area' || u === 'face') f.push('<label class="mto-pk"><span>' + (m.panels ? 'Running length (ft)' : 'Width (ft)') + '</span><input inputmode="decimal" data-k="w" value="' + esc(o.w) + '" placeholder="' + esc(m.w.min) + '–' + esc(m.w.max) + '"></label>');
      if (hOpts.length) f.push(sel('data-k="h"', hOpts.map(function (h) { return [h, h + ' ft']; }), o.h, 'Height'));
      else if (u === 'face') f.push('<label class="mto-pk"><span>Height (ft)</span><input inputmode="decimal" data-k="h" value="' + esc(o.h) + '" placeholder="' + esc(m.h.min) + '–' + esc(m.h.max) + '"></label>');
    }
    if (mats.length > 1) f.push(sel('data-pick="material"', mats.map(function (y) { return [y.name, y.name + (np ? '' : u === 'fixed' ? (+y.rate ? ' (+' + rs(y.rate) + ')' : '') : m.panels ? '' : ' — ' + rs(y.rate) + ' / ' + uw)]; }), mat && mat.name, esc((m.labels && m.labels.material) || 'Finish')));
    var cols = arr(mat && mat.colours);
    var h = '<div class="mto-pks">' + f.join('') + '</div>';
    if (cols.length) h += '<div class="lb">' + esc((m.labels && m.labels.colour) || 'Colour') + ' · ' + esc(o.colour || '') + '</div><div class="pg3-ch">' + cols.map(function (c) { var bg = c.hex2 ? 'linear-gradient(135deg,' + c.hex + ' 50%,' + c.hex2 + ' 50%)' : c.hex || (c.img ? 'url(' + c.img + ') center/cover' : '');
      return bg ? '<button type="button" class="pg3-sw' + (c.name === o.colour ? ' on' : '') + '" title="' + esc(c.name) + '" aria-label="' + esc(c.name) + '" data-cuc="' + esc(c.name) + '" style="background:' + bg + '"></button>' : '<button type="button" class="' + (c.name === o.colour ? 'on' : '') + '" data-cuc="' + esc(c.name) + '">' + esc(c.name) + '</button>'; }).join('') + '</div>';
    arr(m.groups).filter(function (g) { return g.name && arr(g.options).length; }).forEach(function (g) {
      h += '<div class="lb">' + esc(g.name) + '</div><div class="pg3-ch">' + arr(g.options).filter(function (y) { return y.name; }).map(function (y) { var pr = [+y.fixed ? (+y.fixed > 0 ? '+' : '−') + rs(Math.abs(y.fixed)) : '', +y.rate ? '+' + rs(y.rate) + '/' + uw : ''].filter(Boolean).join(' ');
        return '<button type="button" class="' + (y.name === (o.groups || {})[g.name] ? 'on' : '') + '" data-cug="' + esc(g.name) + '" data-v="' + esc(y.name) + '">' + esc(String(y.name).split(' (')[0]) + (pr && !np ? ' · ' + pr : '') + '</button>'; }).join('') + '</div>'; });
    var adds = arr(m.addons).filter(function (a) { return a.name; });
    if (adds.length) h += '<div class="lb">Add-ons</div><div class="pg3-ch">' + adds.map(function (a) { var on = arr(o.addons).indexOf(a.name) >= 0; return '<button type="button" class="' + (on ? 'on' : '') + '" data-cua="' + esc(a.name) + '">' + (on ? '✓ ' : '+ ') + esc(a.name) + (!np && +a.price ? ' · ' + rs(a.price) + (a.charge === 'unit' ? '/' + uw : '') : '') + '</button>'; }).join('') + '</div>';
    return h + '<div id="cuPr"></div>';
  }
  function cuPrice(q) { var el = document.getElementById('cuPr'); if (!el) return; if (!mtoOk()) { el.innerHTML = ''; return; }
    el.innerHTML = q && q.ok ? '<div class="pg3-pr">Your price <b>' + rs(q.total) + '</b><small>incl. GST' + (q.install && q.install.amount ? ' and installation' : '') + ' · delivery as per pincode</small></div>' : q && q.error ? '<p class="mto-err" style="margin:14px 0 0">' + esc(q.error) + '</p>' : ''; }
  window.cuOpen = function (on) {
    var ov = document.getElementById('cuOv');
    if (on === false) { if (ov) ov.classList.remove('open'); document.body.classList.remove('pg3-on'); CU.open = false; return; }
    if (!S || !isProp(S.id)) return; p3Css(); propCss();
    if (!ov) { ov = document.createElement('div'); ov.id = 'cuOv'; ov.className = 'pg3-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); document.body.appendChild(ov);
      ov.addEventListener('input', onInput); ov.addEventListener('change', onChange); ov.addEventListener('click', cuClick); }
    var x = PRODS[S.id], m0 = x.cz, o0 = S.o; ov.setAttribute('aria-label', 'Customise ' + x.n);
    ['l', 'w', 'h'].forEach(function (k) { if (!num(o0[k]) && m0[k] && num(m0[k].min) && !(k === 'h' && arr(m0.h.options).length)) o0[k] = num(m0[k].min); });   // a size to start from: the price shows at once
    if (m0.unit === 'fixed' && !o0.size && arr(m0.sizes).length) o0.size = m0.sizes[0].label;
    ov.innerHTML = '<div class="pg3-hd"><b>' + esc(short(x.n)) + ' · Customise</b><button type="button" data-cu="close" aria-label="Close">✕ Close</button></div>' +
      '<div class="pg3-bd"><div class="pg3-st cu-st"><img id="cuImg" alt=""><div class="pg3-cap" id="cuCap"></div></div><div class="pg3-pn" id="cuPn"></div></div>' +
      '<div class="pg3-ft"><button type="button" data-cu="done">' + (mtoOk() ? 'Done — see my proposal' : 'Done — see my price') + '</button></div>';
    ov.classList.add('open'); document.body.classList.add('pg3-on'); CU.open = true; cuDraw();
    try { if (window.otrack) otrack('customise_start', { sku: S.id, ref: 'form' }); } catch (e) {}
  };
  function cuDraw() {
    var pn = document.getElementById('cuPn'); if (!pn || !CU.open || !S) return; var x = PRODS[S.id], m = x.cz, o = S.o, st = pn.scrollTop;
    pn.innerHTML = '<p class="mto-hint" style="margin:0 0 6px">' + (m.unit === 'area' ? 'Length × width of the floor it covers, in feet.' : m.unit === 'face' && m.panels ? 'Total length to cover — made in ' + panelSizes(m).join(' / ') + ' ft panels.' : m.unit === 'face' ? 'Width × height of the wall or opening, in feet.' : m.unit === 'length' ? 'Total running length, in feet.' : 'Pick the size and finish.') + '</p>' + (m.photo_note ? '<p class="mto-hint">Photo shows: ' + esc(m.photo_note) + '</p>' : '') + optForm(x, m, o);
    pn.scrollTop = st; var im = document.getElementById('cuImg'); if (im) { var u = refPhoto(x); if (im.getAttribute('src') !== u) im.src = u; }
    var cp = document.getElementById('cuCap'); if (cp) cp.textContent = [sizeTxt(m, o), o.colour, o.material && arr(m.materials).length > 1 ? o.material : ''].filter(Boolean).join(' · ') || short(x.n);
    try { cuPrice(priceR(S.id, m, o, PCT)); } catch (e) {}
  }
  function cuClick(e) {
    var t = e.target.closest('button'); if (!t || !S) return; var o = S.o, m = PRODS[S.id].cz, a = t.getAttribute('data-cu');
    if (a === 'close') return window.cuOpen(false);
    if (a === 'done') { var q = priceR(S.id, m, o, PCT); if (!q.ok && mtoOk()) return toast(q.error || 'Choose your size'); window.cuOpen(false); return propGo(); }
    var c = t.getAttribute('data-cuc'); if (c) { o.colour = c; colPic(c); return draw(); }
    var g = t.getAttribute('data-cug'); if (g) { o.groups = Object.assign({}, o.groups); o.groups[g] = t.getAttribute('data-v'); return draw(); }
    var ad = t.getAttribute('data-cua'); if (ad) { o.addons = arr(o.addons).filter(function (z) { return z !== ad; }); if (!t.classList.contains('on')) o.addons.push(ad); return draw(); }
    return onClick(e);
  }
  function propGo() {   // signed in → the proposal; else sign in first (the product page opens again with the choices), then the proposal
    if (mtoOk() || PRODS[S.id].cz.unit === 'cabin') return window.mtoProposal(true);
    var kid = S.id, ko = S.o, ks = { snap: S.snap, site: S.site, proj: S.proj, pl: S.pl, plFor: S.plFor };
    window.mtoUnlock(function () { try { openProduct(kid); } catch (er) {} var n = 0; (function w() { if (!S || S.id !== kid || !S.pdp) { if (n++ < 80) return setTimeout(w, 100); return; } S.o = ko; Object.assign(S, ks); draw(); window.mtoProposal(true); })(); });
  }
  function trustGen(m) {   // other outrr designs: made in the factory, finished, delivered, installed — one row of cards, no repeated steps
    var inst = m.install && m.install.offered, ic = function (d) { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
    var C = [[ic('<path d="M3 21h18M5 21V9l7-5 7 5v12"/><path d="M9 21v-6h6v6"/>'), 'Made in the factory', 'Made by a verified outrr partner to the drawing you approve.'],
      [ic('<path d="M4 7h16v4H4zM6 11v9M18 11v9M9 15h6"/>'), 'Factory finish', 'Finished and checked in the factory before it is packed.'],
      [ic('<path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/>'), 'Packed & delivered', 'Weather-safe packing, delivered to your site; damage in delivery is ours to fix.'],
      [ic('<path d="M14 7l3-3 3 3-3 3M17 4v7"/><path d="M4 20l8-8M9 13l2 2"/>'), inst ? 'Installed by outrr' : 'Easy to fix', inst ? (m.install.required ? 'Installed by your nearest verified outrr installer.' : 'By your nearest verified outrr installer — or by you, with the guide and hardware.') : 'Comes with a fixing guide and the hardware it needs.']];
    return '<section class="mf" id="mfTrust"><h2>Factory-made for your space</h2><p class="mf-sub">Every outrr design is made to your size and checked before it leaves the factory</p><div class="tr-cards tr-noimg">' +
      C.map(function (c) { return '<div class="tr-c"><div><b>' + c[0] + esc(c[1]) + '</b><p>' + esc(c[2]) + '</p></div></div>'; }).join('') + '</div></section>';
  }
  function genDrawings(x, m, o) {   // indicative drawings with sizes, by how the design is sized
    var u = m.unit, ac = '#C26445', ink = '#2E2E2E', mu = '#9A9184';
    if (u === 'cabin' && m.cabin && o.layout) { var c = m.cabin, lay = o.layout, fig = function (svg, cap) { return '<figure class="pp-dw">' + svg + '<figcaption>' + cap + '</figcaption></figure>'; };
      try { return fig(wzDims(c, lay), 'Plan (top view) · ' + num(lay.L) + ' × ' + num(lay.W) + ' ft') + fig(wzIso(c, lay), '3D sketch') + fig(wzElev(c, lay, 'front', -1), 'Front wall'); } catch (e) { return ''; } }
    var dims = null, fix = function (v) { return Math.round(v * 100) / 100; };
    if (u === 'area' && num(o.l) && num(o.w)) dims = { a: num(o.l), b: num(o.w), lab: ['Length', 'Width'], cap: 'Plan (top view)', plan: true };
    else if (u === 'face' && num(o.w)) dims = { a: num(o.w), b: num(o.h) || num(m.h && m.h.max) || 6, lab: ['Width', 'Height'], cap: 'Front elevation', panels: m.panels ? price(m, o, PCT).panels : null };
    else if (u === 'length' && num(o.l)) dims = { a: num(o.l), b: num(o.h) || 3.5, lab: ['Length', 'Height'], cap: 'Front elevation (running length)' };
    else if (u === 'fixed' && o.size) { var nn = String(o.size).match(/[\d.]+/g) || [], inch = /in|"|″/i.test(o.size) && !/ft|'/.test(o.size), k = inch ? 1 / 12 : 1; if (nn.length >= 2) dims = { a: fix(+nn[0] * k), b: fix(+nn[nn.length - 1] * k), lab: ['Width', 'Height'], cap: 'Front elevation · ' + o.size, fixed: true }; }
    if (!dims) return '';
    var A = dims.a, B = dims.b, pad = Math.max(A, B) * 0.18 + 1, b = '';
    var dimH = function (x1, x2, y, t) { return '<line x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '" stroke="' + ac + '" stroke-width="' + pad * 0.04 + '"/><text x="' + (x1 + x2) / 2 + '" y="' + (y + pad * 0.42) + '" font-size="' + pad * 0.38 + '" text-anchor="middle" fill="' + ac + '" font-weight="700">' + t + '</text>'; };
    var dimV = function (x, y1, y2, t) { return '<line x1="' + x + '" y1="' + y1 + '" x2="' + x + '" y2="' + y2 + '" stroke="' + ac + '" stroke-width="' + pad * 0.04 + '"/><text x="' + (x + pad * 0.2) + '" y="' + (y1 + y2) / 2 + '" font-size="' + pad * 0.38 + '" fill="' + ac + '" font-weight="700" dominant-baseline="middle">' + t + '</text>'; };
    b += '<rect x="0" y="0" width="' + A + '" height="' + B + '" fill="#F4EEE4" stroke="' + ink + '" stroke-width="' + pad * 0.06 + '"/>';
    if (dims.panels && arr(dims.panels.panels).length) { var xx = 0; arr(dims.panels.panels).forEach(function (pw) { xx += num(pw) || 0; if (xx < A - 0.01) b += '<line x1="' + xx + '" y1="0" x2="' + xx + '" y2="' + B + '" stroke="' + mu + '" stroke-width="' + pad * 0.04 + '"/>'; }); }
    else if (!dims.plan && !dims.fixed) { var n = Math.max(1, Math.round(A / 4)); for (var i = 1; i < n; i++) b += '<line x1="' + A * i / n + '" y1="0" x2="' + A * i / n + '" y2="' + B + '" stroke="#D9CDBB" stroke-width="' + pad * 0.03 + '" stroke-dasharray="' + pad * 0.12 + ' ' + pad * 0.08 + '"/>'; }
    if (!dims.plan) b += '<line x1="' + (-pad * 0.6) + '" y1="' + B + '" x2="' + (A + pad * 0.6) + '" y2="' + B + '" stroke="' + mu + '" stroke-width="' + pad * 0.06 + '"/>';
    b += dimH(0, A, B + pad * 0.55, ftin(A)) + dimV(A + pad * 0.35, 0, B, ftin(B));
    var svg = '<svg viewBox="' + (-pad) + ' ' + (-pad * 0.6) + ' ' + (A + pad * 2.8) + ' ' + (B + pad * 1.9) + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(dims.cap) + '">' + b + '</svg>';
    return '<figure class="pp-dw">' + svg + '<figcaption>' + esc(dims.cap) + ' · ' + esc(dims.lab[0]) + ' ' + ftin(A) + ' × ' + esc(dims.lab[1]) + ' ' + ftin(B) + '</figcaption></figure>';
  }
  function propSite(x, m, o) {   // delivery + installation (last on the proposal), note for the maker, Add to cart
    var inst = m.install && m.install.offered, req = inst && m.install.required, h = '<section class="pp-s" id="ppSite"><h2>Delivery &amp; installation</h2><p class="sub">Your pincode prices the delivery' + (inst ? ' and the installation' : '') + '</p>' + pdpTail(x, m, o, true);
    if (req) h += '<div class="pp-inst"><button type="button" class="on" disabled><b>● Installed by outrr — included</b><small>By your nearest verified outrr installer · <span id="mtoInstTxt"></span></small></button></div>';
    else if (inst) h += '<div class="pp-inst"><button type="button" data-pinst="1" class="' + (o.install ? 'on' : '') + '"><b>' + (o.install ? '● ' : '○ ') + 'Installed by outrr</b><small>By your nearest verified outrr installer · <span id="mtoInstTxt"></span></small></button>' +
      '<button type="button" data-pinst="0" class="' + (!o.install ? 'on' : '') + '"><b>' + (!o.install ? '● ' : '○ ') + 'Install it yourself</b><small>Fixing guide + all hardware in the package.</small></button></div>';
    return h + '<div class="pp-cta" id="ppCta"></div></section>';
  }
  function propGen() {
    var x = PRODS[S.id], m = x.cz, o = S.o, u = m.unit, cab = u === 'cabin', nm = short(x.n), today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    var mats = arr(m.materials).filter(function (y) { return y.name; }), mat = mats.filter(function (y) { return y.name === o.material; })[0] || mats[0], szT = sizeTxt(m, o);
    var row = function (a, b) { return b ? '<div><span>' + esc(a) + '</span><b>' + esc(b) + '</b></div>' : ''; };
    var specs = arr(m.specs).filter(function (s) { return s && s.label && s.value && !/^installation$/i.test(s.label); }), parts = arr(m.parts).length ? arr(m.parts) : specs.filter(isPart).map(function (s) { return { name: s.label, spec: s.value }; }), rest = arr(m.parts).length ? specs : specs.filter(function (s) { return !isPart(s); });
    var h = '<div class="pp-hd"><button type="button" data-pp="back">← Change ' + (cab ? 'in 3D' : 'choices') + '</button><b>Your proposal · ' + esc(nm) + '</b><button type="button" data-pp="close" aria-label="Close">✕</button></div><div class="pp-bd"><div class="pp-w">';
    h += '<section class="pp-s pp-top"><h1>' + esc(nm) + '</h1><div class="meta">' + esc([szT, o.colour, mat && mats.length > 1 ? mat.name : ''].filter(Boolean).join(' · ')) + ' · ' + esc(today) + ' · SKU ' + esc(S.id) + ' · outrr in-house design</div>' +
      '<div class="pp-pics' + (S.snap && cab ? '' : ' one') + '">' + (S.snap && cab ? '<figure><img src="' + S.snap + '" alt="Your design in 3D"><figcaption>Your design (3D)</figcaption></figure>' : '') + '<figure><img src="' + esc(refPhoto(x)) + '" alt="' + esc(x.alt || nm) + '"><figcaption>' + esc(nm) + ' (reference photo' + (cab ? ', for the look' : ' — made to your size and finish') + ')</figcaption></figure></div></section>';
    var dw = genDrawings(x, m, o);
    if (dw) h += '<section class="pp-s"><h2>' + (cab ? 'Plan &amp; views' : 'Drawing') + '</h2><p class="sub">Your size, in feet. The maker sends the full working drawing for your approval before making starts.</p><div class="pp-dws' + (cab ? '' : ' one') + '">' + dw + '</div><p class="pp-note">Indicative drawing — confirmed on the approval drawing after a site check.</p></section>';
    var grp = {}; rest.forEach(function (s) { var g = s.group || 'Details'; (grp[g] = grp[g] || []).push(s); });
    h += '<section class="pp-s"><h2>Specifications</h2><p class="sub">Everything you chose, in one place</p><div class="pp-spec"><h3>Design</h3>' + row('Design', nm) + row('SKU', S.id) + row('Designed by', 'outrr (in-house design)') + row('Made by', 'A verified outrr factory partner') +
      '<h3>Your choices</h3>' + row('Size', szT) + (cab ? (function () { var q0 = null; try { q0 = price(m, o, PCT); } catch (e) {} return q0 && q0.ok ? arr(q0.addons).filter(function (a) { return a.name && a.name !== 'Layout'; }).map(function (a) { return row('Includes', a.name); }).join('') : ''; })() : row((m.labels && m.labels.material) || 'Finish', mat && mat.name)) + row((m.labels && m.labels.colour) || 'Colour', o.colour) +
      arr(m.groups).filter(function (g) { return g.name && arr(g.options).length; }).map(function (g) { return row(g.name, String((o.groups || {})[g.name] || (arr(g.options)[0] || {}).name || '').split(' (')[0]); }).join('') + (arr(m.addons).length ? row('Add-ons', arr(o.addons).length ? o.addons.join(', ') : 'None') : '') +
      Object.keys(grp).map(function (g) { return '<h3>' + esc(g) + '</h3>' + grp[g].map(function (s) { return row(s.label, s.value); }).join(''); }).join('') +
      '<h3>Making &amp; installation</h3>' + row('Made in', (daysTxt(m.make_days) || '15–25 days') + ' after you approve the drawing') + row('Installation', m.install && m.install.offered ? (m.install.required ? 'Included — by your nearest outrr installer' : 'Your choice below — outrr installer or install yourself') : 'By you, with the fixing guide') + '</div></section>';
    h += '<section class="pp-s pp-price"><h2>Price</h2><p class="sub">Incl. GST · delivery' + (m.install && m.install.offered ? ' and installation' : '') + ' for your pincode (enter it below)</p><div class="mto-sum lt" id="mtoSum"></div></section>';
    if (parts.length) h += '<section class="pp-s"><h2>What goes into it</h2><p class="sub">Every part of your ' + esc(nm.toLowerCase()) + '</p><div class="pp-parts">' + parts.map(function (p) { var im = p.img || partImg(p.name + ' ' + p.spec); return '<div class="pp-part">' + (im ? '<img src="' + esc(im) + '" alt="" loading="lazy">' : '<i>' + esc(String(p.name).charAt(0)) + '</i>') + '<div><b>' + esc(p.name) + '</b>' + (p.brand ? '<small>' + esc(p.brand) + '</small>' : '') + '<small>' + esc(p.spec) + '</small></div></div>'; }).join('') + '</div></section>';
    var tech = rest.filter(function (s) { return /\d/.test(s.value); });
    if (tech.length) h += '<section class="pp-s"><h2>Technical specifications</h2><p class="sub">The numbers for your ' + esc(nm.toLowerCase()) + '</p><table class="pp-tech"><tr><th>Part</th><th>Specification</th><th></th></tr>' + tech.map(function (t) { var im = partImg(t.label + ' ' + t.value); return '<tr><td>' + esc(t.label) + '</td><td>' + esc(t.value) + '</td><td>' + (im ? '<img src="' + esc(im) + '" alt="" loading="lazy" style="width:52px;height:40px;object-fit:cover;border-radius:6px">' : '') + '</td></tr>'; }).join('') + '</table></section>';
    var ar = aroundList();
    if (ar.length) h += '<section class="pp-s pp-ar"><h2>Around it — ' + ar.length + ' more thing' + (ar.length > 1 ? 's' : '') + '</h2><p class="sub">From your plan. Pick their designs and add them to the cart from the planner.</p>' + ar.map(function (it) { var c = (AR.m && AR.m.cat && AR.m.cat(it.cat)) || {}; return '<details><summary>' + (c.e || '•') + ' ' + esc(it.label || c.t || it.cat) + ' · ' + esc((+it.w || '') + (it.d ? ' × ' + it.d : '') + ' ft') + '</summary><p>' + esc((c.t || it.cat) + (it.pick && PRODS[it.pick] ? ' · ' + short(PRODS[it.pick].n) : ' · design not picked yet')) + '</p></details>'; }).join('') + '<button type="button" class="pp-more" data-pp="plan">🗺️ Open the plan — choose their designs →</button></section>';
    h += '<section class="pp-s"><h2>Payment terms</h2><p class="sub">Secure online payment — UPI, cards, netbanking</p><div class="pp-terms"><div><b>' + PCT + '%</b><small>Now, with the order — size and options locked</small></div><div><b>' + (100 - PCT) + '%</b><small>Before dispatch, when it is ready (we email the link)</small></div><div><b>With balance</b><small>Delivery' + (m.install && m.install.offered ? ' + installation' : '') + ', paid with the balance</small></div></div><p class="pp-note">Made for you: it can’t be cancelled once making starts. A defect or damage in delivery / fitting is ours to fix.</p></section>';
    h += '<section class="pp-s"><h2>How your order is made</h2><p class="sub">You see and approve everything before making starts</p><div class="pp-steps"><div><b>Order</b>Pay ' + PCT + '%, choices locked</div><div><b>Drawing</b>' + (m.drawing === 'no' ? 'Made to your size' : 'Drawing to approve') + '</div><div><b>Making</b>' + esc(daysTxt(m.make_days) || '15–25 days') + ' in the factory</div><div><b>Balance</b>Pay the rest, then dispatch</div><div><b>' + (m.install && m.install.offered ? 'Install' : 'Delivery') + '</b>' + (m.install && m.install.offered ? 'By our installer' + (m.install.required ? '' : ' — or by you') : 'Tracking shared') + '</div></div></section>';
    var faqs = arr(m.faqs).concat([{ q: 'When do I pay the rest?', a: 'You pay ' + PCT + '% now. The rest is paid when it is ready, before dispatch: we email you the link.' }, { q: 'Can I cancel or return it?', a: 'It is made for you, so it can’t be cancelled once production starts or returned for a change of mind. A defect or damage in delivery is fixed by us.' }]);
    h += '<section class="pp-s pp-faq"><h2>Questions</h2>' + faqs.map(function (f) { return '<details><summary>' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p></details>'; }).join('') + '</section>';
    return h + propSite(x, m, o) + '</div></div>';
  }
  window.mtoCustomise = function () { if (!S || !PRODS[S.id]) return; if (isPg(S.id)) return window.pg3Open(true); if (PRODS[S.id].cz.unit === 'cabin') return window.cbStudio(true); if (isProp(S.id)) return window.cuOpen(true); };
  // which space is it for? (16) — the plan open in this browser and the plans saved in the account; or a new space
  function projLoad() {
    var lp = null; try { lp = JSON.parse(localStorage.getItem('outrr_plan') || 'null'); } catch (e) {}
    var lpOk = lp && lp.site && (arr(lp.items).filter(function (o) { return o && !o._me && o.cat !== 'pergola'; }).length || (lp.site.kind === 'terrace' && arr(lp.site.blocks).length));
    var list = []; if (lpOk) list.push({ local: true, id: lp.pid || 'local', name: lp.pname || 'The plan open on this device', size: lp.site.pw ? lp.site.pw + ' × ' + lp.site.pd + ' ft' : '', kind: lp.site.kind === 'ground' ? 'lawn' : 'terrace', n: arr(lp.items).filter(function (o) { return o && !o._me && o.cat !== 'pergola'; }).length });
    S.proj = 'pending'; S.projAsk = list.length ? { list: list } : null;
    var done = function () { if (S.projAsk && S.projAsk.list.length) { S.proj = null; } else { S.projAsk = null; S.proj = 'same'; } try { p3Draw(); } catch (e) {} };
    if (!window.acToken || !localStorage.getItem('outrr_session')) return done();
    authRpc('my_plans').then(function (r) { if (S.projPicked) return; arr(r).slice(0, 12).forEach(function (p) { if (list.some(function (z) { return z.id === p.id; })) return; list.push({ id: p.id, name: p.name, size: p.size || '', kind: p.kind, n: p.item_count || 0, at: p.updated_at }); }); S.projAsk = list.length ? { list: list } : null; done(); }, done);
    done();
  }
  function projAskUI2() {
    var L = S.projAsk.list, w = isPg(S.id) ? 'pergola' : 'cabin';
    return '<div class="pp-ask"><b>Which space is this ' + w + ' for?</b><p>Pick one of your plans — the ' + w + ' goes on that terrace / lawn, with the things around it. Or start a new one (for another home or client).</p>' +
      L.map(function (p) { return '<button type="button" data-proj="' + esc(p.id) + '">' + esc(p.name) + '<small>' + esc([p.kind === 'lawn' ? 'Lawn' : 'Terrace', p.size, p.n ? p.n + ' thing' + (p.n > 1 ? 's' : '') : '', p.local ? 'open on this device' : ''].filter(Boolean).join(' · ')) + '</small></button>'; }).join('') +
      '<button type="button" data-proj="new">＋ A new space / another project<small>Start fresh — your plans stay saved in your account</small></button></div>';
  }
  async function projPick(id) {
    S.projPicked = true;
    if (id === 'new') { S.proj = 'new'; S.projAsk = null; S.site = null; S.pl = null; draw(); return p3Draw(); }
    var it = (S.projAsk && S.projAsk.list || []).filter(function (p) { return p.id === id; })[0]; S.projAsk = null; S.proj = 'same';
    if (it && !it.local) { var r = await authRpc('plan_get', { p_id: id }); if (r && r.site) { try { localStorage.setItem('outrr_plan', JSON.stringify({ v: 1, step: 1, site: r.site, items: arr(r.items), pid: r.id, pname: r.name, source: r.source || 'planner' })); if (r.site.kind === 'terrace') localStorage.setItem('outrr_site', JSON.stringify(r.site)); } catch (e) {} } }
    S.site = null; S.pl = null; var sh = sharedSite(); if (sh) { S.site = sh; tsCentre(sh, pgLay()); } else { try { var pl = JSON.parse(localStorage.getItem('outrr_plan') || 'null'); if (pl && pl.site && pl.site.kind === 'ground') S.site = { kind: 'ground' }; } catch (e) {} }
    draw(); p3Draw();
  }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-proj]'); if (b && S) { e.preventDefault(); e.stopPropagation(); projPick(b.getAttribute('data-proj')); } }, true);

})();
