/* outrr — Made to Order (MTO) designs: product page with size + options, and its own checkout.
   The price shown here follows the same rules as the database (_mto_price, migration 133);
   the order is always priced again by the database from the customer's size (134). */
(function () {
  'use strict';
  var num = function (v) { if (typeof v === 'number') return isFinite(v) ? v : null; var s = String(v == null ? '' : v).trim(); return /^-?\d+(\.\d+)?$/.test(s) ? +s : null; };
  var arr = function (v) { return Array.isArray(v) ? v : []; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var rs = function (n) { return '₹' + Math.round(+n || 0).toLocaleString('en-IN'); };
  var UW = function (u) { return u === 'length' ? 'running ft' : u === 'fixed' ? 'piece' : u === 'seat' ? 'seat' : 'sq ft'; };
  var PCT = 50;

  function missing(m) {
    if (!m || typeof m !== 'object') return ['setup'];
    var u = m.unit, r = [];
    if (['area', 'face', 'length', 'fixed', 'seat'].indexOf(u) < 0) return ['pricing'];
    var lim = function (d) { return (num(m[d] && m[d].min) || 0) > 0 && (num(m[d] && m[d].max) || 0) >= (num(m[d] && m[d].min) || 0); };
    if (u === 'fixed') { if (!arr(m.sizes).length) r.push('sizes'); }
    else if (u === 'seat') { if (!((num(m.n && m.n.min) || 0) >= 1 && (num(m.n && m.n.max) || 0) >= (num(m.n && m.n.min) || 0))) r.push('n'); }
    else {
      if ((u === 'area' || u === 'length') && !lim('l')) r.push('l');
      if ((u === 'area' || u === 'face') && !lim('w')) r.push('w');
      if (u === 'face' && !arr(m.h && m.h.options).length && !lim('h')) r.push('h');
    }
    if (!arr(m.materials).some(function (x) { return String(x && x.name || '').trim() && ((num(x.rate) || 0) > 0 || u === 'fixed'); })) r.push('material');
    if (u !== 'fixed' && u !== 'seat' && !((num(m.min_charge) || 0) > 0)) r.push('min');
    var md = arr(m.make_days); if (!(((num(md[1]) != null ? num(md[1]) : num(md[0])) || 0) > 0)) r.push('days');
    if (m.install && m.install.offered && !arr(m.install.cities).length) r.push('cities');
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
  function price(m, o, payPct) {
    o = o || {};
    if (missing(m).length) return { ok: false, error: 'This design is not ready to order yet' };
    var u = m.unit, l = num(o.l), w = num(o.w), h = num(o.h), qty, sz = null;
    if (u === 'fixed') { sz = arr(m.sizes).filter(function (x) { return x.label === o.size; })[0]; if (!sz) return { ok: false, error: 'Choose a size' }; qty = 1; }
    else if (u === 'seat') { var nn = num(o.n), nlo = num(m.n.min), nhi = num(m.n.max); if (nn == null || nn !== Math.floor(nn) || nn < nlo || nn > nhi) return { ok: false, error: 'Choose ' + nlo + ' to ' + nhi + ' seats' }; qty = nn; }
    else {
      var chk = function (d, v, word) { var lo = num(m[d] && m[d].min), hi = num(m[d] && m[d].max); return v == null || v < lo || v > hi ? word + ' must be ' + lo + ' to ' + hi + ' ft' : null; };
      var e;
      if (u === 'area' || u === 'length') { e = chk('l', l, 'Length'); if (e) return { ok: false, error: e }; }
      if (u === 'area' || u === 'face') { e = chk('w', w, 'Width'); if (e) return { ok: false, error: e }; }
      if (arr(m.h && m.h.options).length) { if (h == null || !m.h.options.some(function (x) { return num(x) === h; })) return { ok: false, error: 'Choose a height' }; }
      else if (u === 'face') { e = chk('h', h, 'Height'); if (e) return { ok: false, error: e }; }
      qty = Math.round((u === 'area' ? l * w : u === 'face' ? w * h : l) * 100) / 100;
    }
    var mat = arr(m.materials).filter(function (x) { return !o.material || x.name === o.material; })[0];
    if (!mat) return { ok: false, error: 'Choose a material' };
    var rate = num(mat.rate) || 0, col = null;
    if (o.colour) { col = arr(mat.colours).filter(function (x) { return x.name === o.colour; })[0]; if (!col) return { ok: false, error: 'Choose a colour' }; rate += num(col.extra) || 0; }
    var base = u === 'fixed' ? (num(sz.price) || 0) + rate : (num(mat.base) || 0) + Math.round(qty * rate), minUsed = false, minc = num(m.min_charge) || 0;
    if (base < minc) { base = minc; minUsed = true; }
    var picked = arr(o.addons), addons = [];
    arr(m.addons).forEach(function (a) { if (picked.indexOf(a.name) >= 0) addons.push({ name: a.name, amount: Math.round((num(a.price) || 0) * (a.charge === 'unit' ? qty : 1)) }); });
    var addT = addons.reduce(function (s, a) { return s + a.amount; }, 0), product = base + addT, install = null, instFee = 0;
    if (m.install && m.install.offered) {
      var c = arr(m.install.cities).filter(function (x) { return pinIn(o.pin, x.pins); })[0];
      install = { offered: true, available: !!c, city: c ? c.name : null };
      if (c) { install.fee = (num(c.visit) || 0) + Math.round((num(c.rate) || 0) * qty); if (o.install) instFee = install.fee; }
    }
    var D = m.delivery || {}, delivery = null, dlv = 0;
    if ([D.local, D.state, D.india].some(function (v) { return num(v) != null; })) {
      if (['local', 'state', 'india'].indexOf(o.zone) >= 0) {
        var dr = o.zone === 'local' ? (num(D.local) != null ? num(D.local) : num(D.state) != null ? num(D.state) : num(D.india)) : o.zone === 'state' ? (num(D.state) != null ? num(D.state) : num(D.india)) : num(D.india);
        dlv = Math.round((dr || 0) * qty); delivery = { zone: o.zone, fee: dlv };
      } else delivery = { zone: null, fee: null };
    }
    var payNow = Math.round(product * (payPct == null ? 50 : payPct) / 100);
    return { delivery: delivery, delivery_fee: dlv, seats: u === 'seat' ? qty : null, ok: true, unit: u, qty: qty, rate: rate, base: base, min_charge_used: minUsed, material: mat.name, colour: col ? col.name : null, size: sz ? sz.label : null,
      addons: addons, product: product, install: install, install_fee: instFee, total: product + instFee + dlv, pay_now: payNow, before_dispatch: product - payNow + instFee + dlv };
  }
  window.mtoPrice = price;
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

  // ------------------------------------------------------------ product page
  var S = null;   // {id, o, img}
  function daysTxt(d) { d = arr(d).map(num).filter(function (x) { return x != null; }); return d.length ? (d.length > 1 && d[0] !== d[1] ? d[0] + '–' + d[1] : d[d.length - 1]) + ' days' : ''; }
  function lastPin() { try { return (JSON.parse(localStorage.getItem('outrr_addr') || '{}').pincode) || ''; } catch (e) { return ''; } }

  window.mtoOpen = function (id) {
    var x = PRODS[id]; if (!x || !x.cz) return;
    var m = x.cz;
    S = { id: id, img: 0, o: { n: (m.n && num(m.n.min)) || '', l: '', w: '', h: arr(m.h && m.h.options)[0] || '', size: '', material: (arr(m.materials)[0] || {}).name || '', colour: '',
      addons: arr(m.addons).filter(function (a) { return a.on; }).map(function (a) { return a.name; }), install: false, pin: lastPin(),
      drawing: m.drawing !== 'no', size_ok: false, note: '' } };
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
    var size = u === 'seat'
      ? '<p style="font-size:13px;color:#4A4640;margin:0 0 8px">How many seats?</p><div class="mto-sw">' + (function () { var b = []; for (var i = num(m.n.min); i <= num(m.n.max); i++) b.push('<button type="button" data-n="' + i + '" class="' + (String(o.n) === String(i) ? 'on' : '') + '">' + i + '</button>'); return b.join(''); })() + '</div>'
      : u === 'fixed'
      ? '<div class="mto-sw">' + arr(m.sizes).map(function (s) { return '<button type="button" data-size="' + esc(s.label) + '" class="' + (o.size === s.label ? 'on' : '') + '">' + esc(s.label) + ' · ' + rs(s.price) + '</button>'; }).join('') + '</div>'
      : '<div class="mto-g">' +
        ((u === 'area' || u === 'length') ? '<label>Length (ft)<input inputmode="decimal" data-k="l" value="' + esc(o.l) + '" placeholder="' + esc(m.l.min) + '–' + esc(m.l.max) + '"></label>' : '') +
        ((u === 'area' || u === 'face') ? '<label>Width (ft)<input inputmode="decimal" data-k="w" value="' + esc(o.w) + '" placeholder="' + esc(m.w.min) + '–' + esc(m.w.max) + '"></label>' : '') +
        (hOpts.length ? '<label>Height (ft)<select data-k="h">' + hOpts.map(function (h) { return '<option' + (String(h) === String(o.h) ? ' selected' : '') + '>' + esc(h) + '</option>'; }).join('') + '</select></label>'
          : u === 'face' ? '<label>Height (ft)<input inputmode="decimal" data-k="h" value="' + esc(o.h) + '" placeholder="' + esc(m.h.min) + '–' + esc(m.h.max) + '"></label>' : '') +
        '</div><p style="font-size:13px;color:#6A6258;margin:8px 0 0">Measure the space in feet. ' + (u === 'area' ? 'Length × width is the area it covers.' : u === 'face' ? 'Width × height of the opening or wall.' : 'Total running length.') + '</p>';
    var matHtml = mats.length > 1 ? mats.map(function (y) { return '<label class="mto-opt' + (y === mat ? ' on' : '') + '"><input type="radio" name="mtoMat" data-mat="' + esc(y.name) + '"' + (y === mat ? ' checked' : '') + '><span><b>' + esc(y.name) + '</b><br><span style="color:#6A6258">' + (u === 'fixed' ? (+y.rate ? '+ ' + rs(y.rate) : 'Standard') : rs(y.rate) + ' / ' + uw) + '</span></span></label>'; }).join('') : '<p style="margin:0 0 8px;font-size:14px"><b>' + esc(mat.name) + '</b></p>';
    var cols = arr(mat.colours);
    var colHtml = cols.length ? '<p style="font-size:13px;color:#4A4640;margin:6px 0">Colour</p><div class="mto-sw">' + cols.map(function (c) { return '<button type="button" data-col="' + esc(c.name) + '" class="' + (o.colour === c.name ? 'on' : '') + '">' + esc(c.name) + (+c.extra ? ' (+' + rs(c.extra) + '/' + uw + ')' : '') + '</button>'; }).join('') + '</div>' : '';
    var adds = arr(m.addons).filter(function (a) { return a.name; });
    var addHtml = adds.length ? '<div class="mto-box"><h3>3 · Add-ons</h3>' + adds.map(function (a) { return '<label class="mto-chk"><input type="checkbox" data-add="' + esc(a.name) + '"' + (o.addons.indexOf(a.name) >= 0 ? ' checked' : '') + '><span>' + esc(a.name) + '</span><span class="r">+ ' + rs(a.price) + (a.charge === 'unit' ? ' / ' + uw : '') + '</span></label>'; }).join('') + '</div>' : '';
    var inst = m.install && m.install.offered;
    var drw = m.drawing || 'choose';
    var instHtml = '<div class="mto-box"><h3>' + (adds.length ? '4' : '3') + ' · ' + (inst ? 'Installation &amp; drawing' : 'Drawing') + '</h3>' +
      (inst ? '<label class="mto-chk"><input type="checkbox" data-k="install"' + (o.install ? ' checked' : '') + '><span><b>Add installation</b> by ' + (m.install.by === 'brand' ? esc(x.br || 'the maker') : 'a verified outrr partner') + '<br><span id="mtoInstTxt" style="color:#6A6258"></span></span></label>' +
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
      '<div class="mto-facts"><div>Made in<b>' + esc(daysTxt(m.make_days) || '—') + '</b></div><div>Delivery<b>' + (hasDlv(m) ? 'By pincode' : 'Included in the price') + '</b></div><div>Installation<b>' + (inst ? 'Optional add-on' : 'By you') + '</b></div></div>' +
      (x.ds ? '<p style="font-size:15px;line-height:1.65;color:#4A4640;margin-top:16px">' + esc(x.ds) + '</p>' : '') + '</section>' +
      '<section class="mto-cfg" aria-label="Build your design"><span class="mto-badge">Made to Order</span><h1>' + esc(x.n) + '</h1>' +
      '<p class="mto-by">by <b>' + esc(x.br || 'outrr') + '</b>' + (x.mat ? ' · ' + esc(x.mat) : '') + '</p>' +
      (x.oo === false ? '<p class="mto-from"><span class="soonb">Coming soon</span></p>' : '<p class="mto-from">From <b>' + rs(x.p) + '</b>' + (u !== 'fixed' ? ' · ' + rs(Math.min.apply(null, mats.map(function (y) { return +y.rate || 0; }))) + ' / ' + uw : '') + ' · incl. GST</p>') +
      '<div class="mto-box"><h3>1 · Your size</h3>' + size + '</div>' +
      '<div class="mto-box"><h3>2 · Material &amp; finish</h3>' + matHtml + colHtml + '</div>' + addHtml + instHtml +
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
      (inst ? '<details><summary>Can I install it myself?</summary><p>Yes. Without installation, fixing is yours: a fixing guide comes with it.</p></details>' : '') +
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
    el.innerHTML = '<div class="rw"><span>' + (m.unit === 'fixed' ? esc(q.size) + (q.rate ? ' + ' + esc(q.material) : '') : m.unit === 'seat' ? q.qty + '-seat bench' : q.qty + ' ' + UW(m.unit) + ' × ' + rs(q.rate)) + (q.min_charge_used ? ' (minimum)' : '') + '</span><span>' + rs(q.base) + '</span></div>' +
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
    if (k === 'install' || k === 'size_ok') { S.o[k] = t.checked; return paint(); }
    if (k === 'h') { S.o.h = t.value; return paint(); }
    if (t.hasAttribute('data-mat')) { S.o.material = t.getAttribute('data-mat'); S.o.colour = ''; return draw(); }
    if (t.hasAttribute('data-drw')) { S.o.drawing = t.getAttribute('data-drw') === '1'; return draw(); }
    if (t.hasAttribute('data-add')) { var n = t.getAttribute('data-add'); S.o.addons = S.o.addons.filter(function (a) { return a !== n; }); if (t.checked) S.o.addons.push(n); return paint(); }
  }
  function onClick(e) {
    var t = e.target.closest('[data-act],[data-size],[data-col],[data-img],[data-open],[data-n]'); if (!t || !S) return;
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
    window.MTO_BUY = { id: S.id, o: { n: o.n, l: o.l, w: o.w, h: o.h, size: o.size, material: o.material, colour: o.colour, addons: o.addons.slice(), install: !!o.install, drawing: !!o.drawing, size_ok: !!o.size_ok, note: o.note }, pin: o.pin };
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
    var o = b.o, spec = [x.cz.unit === 'seat' ? o.n + ' seats' : x.cz.unit === 'fixed' ? o.size : [o.l, o.w].filter(Boolean).join(' × ') + ' ft' + (o.h ? ', ' + o.h + ' ft high' : ''), o.material, o.colour].concat(o.addons).filter(Boolean).join(' · ');
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
