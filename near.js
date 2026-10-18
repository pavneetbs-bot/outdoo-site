(function(){
const STATES=[['DL', 'Delhi', ['11']], ['HR', 'Haryana', ['12', '13']], ['PB', 'Punjab', ['14', '15', '16']], ['CH', 'Chandigarh', ['160']], ['HP', 'Himachal Pradesh', ['17']], ['JK', 'Jammu & Kashmir', ['18', '19']], ['LA', 'Ladakh', ['194']], ['UP', 'Uttar Pradesh', ['20', '21', '22', '23', '24', '25', '26', '27', '28']], ['UK', 'Uttarakhand', ['246', '247', '248', '249', '262', '263']], ['RJ', 'Rajasthan', ['30', '31', '32', '33', '34']], ['GJ', 'Gujarat', ['36', '37', '38', '39']], ['MH', 'Maharashtra', ['40', '41', '42', '43', '44']], ['GA', 'Goa', ['403']], ['MP', 'Madhya Pradesh', ['45', '46', '47', '48']], ['CG', 'Chhattisgarh', ['49']], ['TG', 'Telangana', ['50']], ['AP', 'Andhra Pradesh', ['51', '52', '53']], ['KA', 'Karnataka', ['56', '57', '58', '59']], ['TN', 'Tamil Nadu', ['60', '61', '62', '63', '64']], ['PY', 'Puducherry', ['605']], ['KL', 'Kerala', ['67', '68', '69']], ['WB', 'West Bengal', ['70', '71', '72', '73', '74']], ['SK', 'Sikkim', ['737']], ['AN', 'Andaman & Nicobar', ['744']], ['OR', 'Odisha', ['75', '76', '77']], ['AS', 'Assam', ['78']], ['AR', 'Arunachal Pradesh', ['790', '791', '792']], ['ML', 'Meghalaya', ['793', '794']], ['MN', 'Manipur', ['795']], ['MZ', 'Mizoram', ['796']], ['NL', 'Nagaland', ['797', '798']], ['TR', 'Tripura', ['799']], ['BR', 'Bihar', ['80', '81', '82', '83', '84', '85']], ['JH', 'Jharkhand', ['814', '815', '816', '822', '823', '824', '825', '826', '827', '828', '829', '831', '832', '833', '834', '835']]];
const CITIES=[{ slug: 'delhi', name: 'Delhi', state: 'DL', lat: 28.6139, lng: 77.2090, pins: ['110'], sort: 10 },
  { slug: 'gurgaon', name: 'Gurugram', state: 'HR', lat: 28.4595, lng: 77.0266, pins: ['1220', '1221'], sort: 11 },
  { slug: 'noida', name: 'Noida', state: 'UP', lat: 28.5355, lng: 77.3910, pins: ['2013'], sort: 12 },
  { slug: 'ghaziabad', name: 'Ghaziabad', state: 'UP', lat: 28.6692, lng: 77.4538, pins: ['2010', '2011', '2012'], sort: 13 },
  { slug: 'faridabad', name: 'Faridabad', state: 'HR', lat: 28.4089, lng: 77.3178, pins: ['1210', '1211'], sort: 14 },
  { slug: 'sonipat', name: 'Sonipat', state: 'HR', lat: 28.9931, lng: 77.0151, pins: ['1310', '1311'], sort: 15 },
  { slug: 'mumbai', name: 'Mumbai', state: 'MH', lat: 19.0760, lng: 72.8777, pins: ['400'], sort: 20 },
  { slug: 'thane', name: 'Thane', state: 'MH', lat: 19.2183, lng: 72.9781, pins: ['4006'], sort: 21 },
  { slug: 'navi-mumbai', name: 'Navi Mumbai', state: 'MH', lat: 19.0330, lng: 73.0297, pins: ['4007', '4102'], sort: 22 },
  { slug: 'pune', name: 'Pune', state: 'MH', lat: 18.5204, lng: 73.8567, pins: ['411', '4120'], sort: 23 },
  { slug: 'bangalore', name: 'Bengaluru', state: 'KA', lat: 12.9716, lng: 77.5946, pins: ['560'], sort: 30 },
  { slug: 'hyderabad', name: 'Hyderabad', state: 'TG', lat: 17.3850, lng: 78.4867, pins: ['500'], sort: 31 },
  { slug: 'chennai', name: 'Chennai', state: 'TN', lat: 13.0827, lng: 80.2707, pins: ['600'], sort: 32 },
  { slug: 'kolkata', name: 'Kolkata', state: 'WB', lat: 22.5726, lng: 88.3639, pins: ['700'], sort: 33 },
  { slug: 'howrah', name: 'Howrah', state: 'WB', lat: 22.5958, lng: 88.2636, pins: ['711'], sort: 34 },
  { slug: 'ahmedabad', name: 'Ahmedabad', state: 'GJ', lat: 23.0225, lng: 72.5714, pins: ['380', '3824'], sort: 40 },
  { slug: 'gandhinagar', name: 'Gandhinagar', state: 'GJ', lat: 23.2156, lng: 72.6369, pins: ['3820'], sort: 41 },
  { slug: 'surat', name: 'Surat', state: 'GJ', lat: 21.1702, lng: 72.8311, pins: ['394', '395'], sort: 42 },
  { slug: 'vadodara', name: 'Vadodara', state: 'GJ', lat: 22.3072, lng: 73.1812, pins: ['390', '391'], sort: 43 },
  { slug: 'jaipur', name: 'Jaipur', state: 'RJ', lat: 26.9124, lng: 75.7873, pins: ['302'], sort: 44 },
  { slug: 'udaipur', name: 'Udaipur', state: 'RJ', lat: 24.5854, lng: 73.7125, pins: ['313'], sort: 45 },
  { slug: 'jodhpur', name: 'Jodhpur', state: 'RJ', lat: 26.2389, lng: 73.0243, pins: ['342'], sort: 46 },
  { slug: 'chandigarh', name: 'Chandigarh', state: 'CH', lat: 30.7333, lng: 76.7794, pins: ['160'], sort: 50 },
  { slug: 'mohali', name: 'Mohali', state: 'PB', lat: 30.7046, lng: 76.7179, pins: ['16005', '16006', '16007', '1403'], sort: 51 },
  { slug: 'panchkula', name: 'Panchkula', state: 'HR', lat: 30.6942, lng: 76.8606, pins: ['1341'], sort: 52 },
  { slug: 'ludhiana', name: 'Ludhiana', state: 'PB', lat: 30.9010, lng: 75.8573, pins: ['141'], sort: 53 },
  { slug: 'amritsar', name: 'Amritsar', state: 'PB', lat: 31.6340, lng: 74.8723, pins: ['143'], sort: 54 },
  { slug: 'dehradun', name: 'Dehradun', state: 'UK', lat: 30.3165, lng: 78.0322, pins: ['248'], sort: 55 },
  { slug: 'lucknow', name: 'Lucknow', state: 'UP', lat: 26.8467, lng: 80.9462, pins: ['226'], sort: 60 },
  { slug: 'kanpur', name: 'Kanpur', state: 'UP', lat: 26.4499, lng: 80.3319, pins: ['208'], sort: 61 },
  { slug: 'agra', name: 'Agra', state: 'UP', lat: 27.1767, lng: 78.0081, pins: ['282'], sort: 62 },
  { slug: 'varanasi', name: 'Varanasi', state: 'UP', lat: 25.3176, lng: 82.9739, pins: ['221'], sort: 63 },
  { slug: 'indore', name: 'Indore', state: 'MP', lat: 22.7196, lng: 75.8577, pins: ['452'], sort: 70 },
  { slug: 'bhopal', name: 'Bhopal', state: 'MP', lat: 23.2599, lng: 77.4126, pins: ['462'], sort: 71 },
  { slug: 'raipur', name: 'Raipur', state: 'CG', lat: 21.2514, lng: 81.6296, pins: ['492'], sort: 72 },
  { slug: 'nagpur', name: 'Nagpur', state: 'MH', lat: 21.1458, lng: 79.0882, pins: ['440'], sort: 73 },
  { slug: 'nashik', name: 'Nashik', state: 'MH', lat: 19.9975, lng: 73.7898, pins: ['422'], sort: 74 },
  { slug: 'goa', name: 'Goa', state: 'GA', lat: 15.2993, lng: 74.1240, pins: ['403'], sort: 75 },
  { slug: 'kochi', name: 'Kochi', state: 'KL', lat: 9.9312, lng: 76.2673, pins: ['682'], sort: 80 },
  { slug: 'trivandrum', name: 'Thiruvananthapuram', state: 'KL', lat: 8.5241, lng: 76.9366, pins: ['695'], sort: 81 },
  { slug: 'coimbatore', name: 'Coimbatore', state: 'TN', lat: 11.0168, lng: 76.9558, pins: ['641'], sort: 82 },
  { slug: 'mysore', name: 'Mysuru', state: 'KA', lat: 12.2958, lng: 76.6394, pins: ['570'], sort: 83 },
  { slug: 'visakhapatnam', name: 'Visakhapatnam', state: 'AP', lat: 17.6868, lng: 83.2185, pins: ['530'], sort: 84 },
  { slug: 'vijayawada', name: 'Vijayawada', state: 'AP', lat: 16.5062, lng: 80.6480, pins: ['520'], sort: 85 },
  { slug: 'bhubaneswar', name: 'Bhubaneswar', state: 'OR', lat: 20.2961, lng: 85.8245, pins: ['751'], sort: 90 },
  { slug: 'patna', name: 'Patna', state: 'BR', lat: 25.5941, lng: 85.1376, pins: ['800'], sort: 91 },
  { slug: 'ranchi', name: 'Ranchi', state: 'JH', lat: 23.3441, lng: 85.3096, pins: ['834'], sort: 92 },
  { slug: 'guwahati', name: 'Guwahati', state: 'AS', lat: 26.1445, lng: 91.7362, pins: ['781'], sort: 93 }];
/* outrr near.js — hyperlocal + courier delivery on the storefront (admin 069)
   • "Where should we deliver?" 3 s after landing (once; Skip → a small floating "Set your city" button)
   • the choice (city / pincode / device location, optional mobile) is kept in this browser and sent to
     save_site_location; products are then ordered nearest first everywhere (home strips, categories, search)
   • add to cart of a product that doesn't ship Pan India asks for the pincode first; not deliverable → blocked
   • checkout: lines that don't deliver to the address pincode are flagged and the order can't be placed
   Product fields (from the loader): sp = ships Pan India, sc = local cities, ss = states, oc = city it ships from */
(function(){
'use strict';
var LK = 'outrr_loc', DK = 'outrr_loc_skip';
var LOC = null; try { LOC = JSON.parse(localStorage.getItem(LK) || 'null') } catch (e) {}
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) };
function longest(pin, list){ var best = null, len = 0; if (!/^[1-9][0-9]{5}$/.test(pin || '')) return null;
  list.forEach(function (e) { e[1].forEach(function (x) { if (pin.indexOf(x) === 0 && x.length > len) { best = e[0]; len = x.length } }) }); return best }
var pinState = function (pin) { return longest(pin, STATES.map(function (s) { return [s[0], s[2]] })) };
var pinCity = function (pin) { return longest(pin, CITIES.map(function (c) { return [c.slug, c.pins] })) };
var city = function (slug) { return CITIES.filter(function (c) { return c.slug === slug })[0] };
var stateName = function (code) { var s = STATES.filter(function (x) { return x[0] === code })[0]; return s ? s[1] : code };
function km(a, b){ var r = Math.PI / 180; return 6371 * Math.acos(Math.min(1, Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lng - a.lng) * r) + Math.sin(a.lat * r) * Math.sin(b.lat * r))) }
var NEAR = {};
function near(slug){ if (NEAR[slug]) return NEAR[slug]; var a = city(slug); return NEAR[slug] = a ? CITIES.filter(function (b) { return km(a, b) <= 80 }).map(function (b) { return b.slug }) : [] }
function where(){ return LOC ? (LOC.city ? city(LOC.city).name : LOC.pincode ? LOC.pincode : stateName(LOC.state)) : '' }

/* ---------------------------------------------------------------- delivery rules */
function shipsTo(x, loc){ loc = loc || LOC; if (!x || !loc) return true;
  if (x.sp !== false) return true;
  return (!!loc.city && (x.sc || []).indexOf(loc.city) >= 0) || (!!loc.state && (x.ss || []).indexOf(loc.state) >= 0) }
// 0 same city · 1 nearby · 2 local zone · 3 ships here by courier · 9 doesn't deliver
function rank(id){ var x = PRODS[id]; if (!LOC || !x) return 5; if (!shipsTo(x)) return 9;
  if (LOC.city && x.oc === LOC.city) return 0;
  if (LOC.city && x.oc && near(LOC.city).indexOf(x.oc) >= 0) return 1;
  if (LOC.city && (x.sc || []).indexOf(LOC.city) >= 0) return 2;
  return 3 }
window.nearSort = function (ids){ if (!LOC) return ids; return ids.map(function (id, i) { return [id, rank(id), i] }).sort(function (a, b) { return a[1] - b[1] || a[2] - b[2] }).map(function (a) { return a[0] }) };
window.nearRank = rank;
window.nearShips = function (id, loc){ return shipsTo(PRODS[id], loc) };

/* card label (added to every product card through tbHTML) */
var _tb = window.tbHTML;
if (typeof _tb === 'function') window.tbHTML = tbHTML = function (id){
  var h = _tb(id), r = rank(id), x = PRODS[id] || {};
  if (!LOC) return (x.sp === false ? '<div class="near-lb">Local delivery only</div>' : '') + h;
  if (r === 9) return '<div class="near-lb no">Doesn\'t deliver to ' + esc(where()) + '</div>' + h;
  var d = hasCh(x) ? '<div class="near-lb dlv">+ ' + inr(charge(x, LOC).fee) + ' packaging &amp; delivery</div>' : '<div class="near-lb dlv">Free delivery</div>';   // 076
  if (r <= 2) return '<div class="near-lb ok">⚡ Local delivery in ' + esc(where()) + '</div>' + d + h;
  return d + h };

/* home strips + listings re-ordered when the place changes */
var STRIPS = {};
var _fill = window.fillStrip;
if (typeof _fill === 'function') window.fillStrip = fillStrip = function (el, ids){ STRIPS[el] = ids; return _fill(el, window.nearSort(ids)) };
function refresh(){
  Object.keys(STRIPS).forEach(function (el) { try { _fill(el, window.nearSort(STRIPS[el])) } catch (e) {} });
  try { var plp = document.getElementById('plp'); if (plp && plp.style.display !== 'none' && typeof lastCol !== 'undefined' && lastCol) renderPLP() } catch (e) {}
  try { if (document.getElementById('checkout') && document.getElementById('checkout').style.display === 'block') checkoutCheck() } catch (e) {}
  try { if (typeof curPid !== 'undefined' && curPid && window.pdPaint) pdPaint(curPid) } catch (e) {}
  try { var cb = document.getElementById('cartBody'); if (cb && cb.offsetParent && typeof renderCart === 'function') renderCart() } catch (e) {}
  pill();
}

/* ---------------------------------------------------------------- saving the place */
function sid(){ try { return sessionStorage.getItem('outrr_sid') || '' } catch (e) { return '' } }
function save(loc, phone){
  LOC = loc; try { localStorage.setItem(LK, JSON.stringify(loc)); localStorage.removeItem(DK) } catch (e) {}
  var S = window.OUTRR_SUPA || {};
  if (S.url && S.anon) fetch(S.url + '/rest/v1/rpc/save_site_location', { method: 'POST', headers: { apikey: S.anon, Authorization: 'Bearer ' + S.anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p: { sid: sid(), city: loc.city || null, pincode: loc.pincode || null, phone: phone || null, source: loc.src } }) }).catch(function () {});
  try { if (window.otrack) otrack('set_location', { city: loc.city || loc.state || '' }) } catch (e) {}
  refresh();
}
function fromText(t){ t = String(t || '').trim();
  if (/^[1-9][0-9]{5}$/.test(t)) { var st = pinState(t); return st ? { city: pinCity(t), state: st, pincode: t, src: 'pincode' } : null }
  var q = t.toLowerCase(), c = CITIES.filter(function (c) { return c.name.toLowerCase() === q || c.slug === q })[0] || CITIES.filter(function (c) { return c.name.toLowerCase().indexOf(q) === 0 })[0];
  return c && q ? { city: c.slug, state: c.state, pincode: null, src: 'city' } : null }

/* ---------------------------------------------------------------- the popup */
var css = document.createElement('style');
css.textContent = '.near-ov{position:fixed;inset:0;background:rgba(30,29,27,.45);display:flex;align-items:center;justify-content:center;z-index:9000;padding:16px}'
 + '.near-card{background:#fff;color:#2E2E2E;border-radius:18px;max-width:440px;width:100%;padding:24px 22px 18px;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.25);font-family:Inter,system-ui,sans-serif;max-height:92vh;overflow:auto}'
 + '.near-card h3{margin:2px 0 6px;font-size:20px;font-family:"Plus Jakarta Sans",Inter,sans-serif}.near-card p{margin:0 0 14px;color:#5b5750;font-size:14px;line-height:1.45}'
 + '.near-x{position:absolute;top:10px;right:10px;width:34px;height:34px;border-radius:50%;border:0;background:#f4efe8;font-size:20px;cursor:pointer;line-height:1}'
 + '.near-ic{width:42px;height:42px;border-radius:12px;background:#fbf0ea;display:grid;place-items:center;font-size:22px}'
 + '.near-in{position:relative}.near-in input,.near-ph{width:100%;box-sizing:border-box;border:1.5px solid #e2dbd0;border-radius:12px;padding:12px 13px;font:15px Inter,sans-serif}'
 + '.near-in input:focus,.near-ph:focus{outline:0;border-color:#C26445}'
 + '.near-sug{position:absolute;left:0;right:0;top:100%;background:#fff;border:1px solid #e2dbd0;border-radius:12px;margin-top:4px;box-shadow:0 10px 30px rgba(0,0,0,.12);z-index:2;max-height:220px;overflow:auto}'
 + '.near-sug button{display:block;width:100%;text-align:left;border:0;background:none;padding:10px 13px;font:14px Inter,sans-serif;cursor:pointer}.near-sug button:hover{background:#f7f2ec}'
 + '.near-gps{margin:10px 0 2px;border:0;background:none;color:#a14f33;font:600 14px Inter,sans-serif;cursor:pointer;padding:4px 0}'
 + '.near-chips{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 14px}.near-chips button{border:1px solid #e2dbd0;background:#fff;border-radius:999px;padding:6px 12px;font:500 13px Inter,sans-serif;cursor:pointer}'
 + '.near-chips button:hover{border-color:#C26445;color:#a14f33}.near-lbl{font:600 12px Inter,sans-serif;color:#5b5750;display:block;margin:4px 0 6px}.near-lbl span{font-weight:400}'
 + '.near-note{font-size:12px;color:#7a756c;margin:6px 0 14px;line-height:1.4}.near-note a{color:#a14f33}'
 + '.near-go{width:100%;border:0;border-radius:12px;background:#C26445;color:#fff;font:600 15px Inter,sans-serif;padding:13px;cursor:pointer}.near-go:disabled{opacity:.5}'
 + '.near-skip{display:block;margin:10px auto 0;border:0;background:none;color:#7a756c;font:500 13px Inter,sans-serif;cursor:pointer}'
 + '.near-err{color:#a14f33;font-size:13px;margin:6px 0 0}.near-bad{background:#fdf1ec;border-radius:12px;padding:12px;margin:0 0 12px;font-size:14px}'
 + '.near-pill{position:fixed;left:14px;bottom:16px;z-index:8000;border:0;border-radius:999px;background:#2E2E2E;color:#fff;font:600 13px Inter,sans-serif;padding:10px 14px;box-shadow:0 8px 24px rgba(0,0,0,.2);cursor:pointer;max-width:70vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
 + '.near-pill.set{background:#fff;color:#2E2E2E;border:1px solid #e2dbd0}.near-pill b{color:#a14f33}'
 + '.near-lb{font:600 11.5px Inter,sans-serif;color:#5b5750;margin:4px 0 0}.near-lb.ok{color:#3d5233}.near-lb.no{color:#a14f33}'
 + '.pc.near-off,.mpc.near-off{opacity:.55}'
 + '.co-near{background:#fdf1ec;border:1px solid #f0c9bb;border-radius:12px;padding:12px;margin:0 0 12px;font-size:14px}.co-near b{display:block;margin-bottom:6px}'
 + '.co-near .ln{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:6px 0;border-top:1px solid #f3d9cf}.co-near .ln button{border:1px solid #e2b3a2;background:#fff;border-radius:8px;padding:5px 10px;font:600 12px Inter,sans-serif;cursor:pointer;color:#a14f33}'
 + '@media(max-width:600px){.near-ov{align-items:flex-end;padding:0}.near-card{border-radius:18px 18px 0 0;max-width:none}.near-pill{bottom:76px}}';
document.head.appendChild(css);

var TOP = ['delhi', 'gurgaon', 'noida', 'mumbai', 'bangalore', 'hyderabad', 'pune', 'jaipur', 'chennai', 'kolkata', 'ahmedabad', 'chandigarh'];
var ov = null;
function close(){ if (ov) { ov.remove(); ov = null } document.removeEventListener('keydown', onKey)
  if (window.__offAfterNear && typeof offShow === 'function') { window.__offAfterNear = false; setTimeout(offShow, 1500) } }   // the welcome offer waits for this popup
function onKey(e){ if (e.key === 'Escape') skip() }
function skip(){ close(); if (!LOC) try { localStorage.setItem(DK, String(Date.now())) } catch (e) {} pill() }
// mode: 'welcome' (3 s after landing) · 'change' (the floating button) · 'gate' (add to cart of a local-only product)
function open(mode, opt){
  opt = opt || {}; close();
  ov = document.createElement('div'); ov.className = 'near-ov';
  var gate = mode === 'gate', x = opt.id ? PRODS[opt.id] : null;
  ov.innerHTML = '<div class="near-card" role="dialog" aria-modal="true" aria-labelledby="nearT">'
   + '<button class="near-x" aria-label="Close" data-a="skip">×</button><div class="near-ic">📍</div>'
   + '<h3 id="nearT">' + (gate ? 'Check delivery to your area' : 'Where should we deliver?') + '</h3>'
   + (opt.bad ? '<div class="near-bad">' + opt.bad + '</div>' : '')
   + '<p>' + (gate ? esc(x ? x.n : 'This product') + ' is delivered by a local seller. Enter your city or pincode to check it reaches you.'
     : 'Set your city so we can show you products that deliver to your area, including fast local delivery from sellers near you.') + '</p>'
   + '<div class="near-in"><input id="nearQ" autocomplete="off" placeholder="Your city or 6-digit pincode" value="' + esc(LOC ? (LOC.pincode || (LOC.city ? city(LOC.city).name : '')) : '') + '"><div class="near-sug" id="nearSug" hidden></div></div>'
   + '<button class="near-gps" data-a="gps">◎ Use my current location</button>'
   + '<div class="near-chips">' + TOP.map(function (s) { return '<button data-c="' + s + '">' + esc(city(s).name) + '</button>' }).join('') + '</div>'
   + (gate ? '' : '<label class="near-lbl" for="nearPh">Mobile number <span>(optional)</span></label><input class="near-ph" id="nearPh" inputmode="numeric" maxlength="10" placeholder="10-digit mobile number">'
     + '<div class="near-note">For delivery updates and offers on your area. We never share it. <a href="/privacy/" target="_blank" rel="noopener">Privacy Policy</a></div>')
   + '<div class="near-err" id="nearErr" hidden></div>'
   + '<button class="near-go" data-a="go">' + (gate ? 'Check and add to cart' : 'Show products for my area') + '</button>'
   + '<button class="near-skip" data-a="skip">' + (gate ? 'Cancel' : 'Skip for now') + '</button></div>';
  document.body.appendChild(ov); document.addEventListener('keydown', onKey);
  var q = ov.querySelector('#nearQ'), sug = ov.querySelector('#nearSug'), err = ov.querySelector('#nearErr'), picked = null;
  var fail = function (m) { err.textContent = m; err.hidden = false };
  q.addEventListener('input', function () { picked = null; err.hidden = true; var t = q.value.trim().toLowerCase();
    var list = t && !/^\d+$/.test(t) ? CITIES.filter(function (c) { return c.name.toLowerCase().indexOf(t) >= 0 }).slice(0, 8) : [];
    sug.innerHTML = list.map(function (c) { return '<button data-c="' + c.slug + '">' + esc(c.name) + ', ' + esc(stateName(c.state)) + '</button>' }).join('');
    sug.hidden = !list.length });
  var done = function (loc) {
    var ph = ov.querySelector('#nearPh'), phone = ph ? ph.value.replace(/\D/g, '') : '';
    if (phone && !/^[6-9]\d{9}$/.test(phone)) return fail('Enter a valid 10-digit mobile number, or leave it empty.');
    close(); save(loc, phone || null); if (opt.then) opt.then() };
  ov.addEventListener('click', function (e) {
    var t = e.target.closest('[data-a],[data-c]'); if (!t) { if (e.target === ov) {} return }
    if (t.dataset.c) { var c = city(t.dataset.c); picked = { city: c.slug, state: c.state, pincode: null, src: 'city' }; q.value = c.name; sug.hidden = true; if (t.closest('.near-chips')) done(picked); return }
    var a = t.dataset.a;
    if (a === 'skip') return gate ? close() : skip();
    if (a === 'go') { var loc = picked || fromText(q.value); if (!loc) return fail(/^\d+$/.test(q.value.trim()) ? 'Enter a valid 6-digit pincode.' : 'Pick your city from the list or enter your pincode.'); return done(loc) }
    if (a === 'gps') {
      if (!navigator.geolocation) return fail('Location is not available on this device. Pick your city instead.');
      t.textContent = 'Finding you…';
      navigator.geolocation.getCurrentPosition(function (pos) {
        var me = { lat: pos.coords.latitude, lng: pos.coords.longitude }, best = null, d = 1e9;
        CITIES.forEach(function (c) { var k = km(me, c); if (k < d) { d = k; best = c } });
        t.textContent = '◎ Use my current location';
        if (!best || d > 120) return fail('We couldn\'t match your location to a city we serve yet. Enter your pincode instead.');
        picked = { city: best.slug, state: best.state, pincode: null, src: 'gps' }; q.value = best.name;
      }, function () { t.textContent = '◎ Use my current location'; fail('Location permission was not given. Pick your city or enter your pincode.') }, { timeout: 10000, maximumAge: 600000 });
    }
  });
  if (mode !== 'welcome') setTimeout(function () { try { q.focus() } catch (e) {} }, 50);
}
window.nearOpen = open;

/* the small floating button */
function pill(){
  var b = document.getElementById('nearPill');
  if (!b) { b = document.createElement('button'); b.id = 'nearPill'; b.className = 'near-pill'; b.addEventListener('click', function () { open('change') }); document.body.appendChild(b) }
  var hide = !LOC && !(function () { try { return localStorage.getItem(DK) } catch (e) { return null } })();
  b.hidden = hide && !ov ? true : false;
  b.className = 'near-pill' + (LOC ? ' set' : '');
  b.innerHTML = LOC ? '📍 <b>' + esc(where()) + '</b> · Change' : '📍 Set your city';
}

/* ---------------------------------------------------------------- add to cart / buy now */
function gate(id, then){
  var x = PRODS[id]; if (!x || x.pv) return true;                    // sample (pitch) products: the cart handles them
  if (x.sp !== false) return true;                                    // ships across India
  if (!LOC) { open('gate', { id: id, then: function () { if (shipsTo(x)) then(); else blocked(id) } }); return false }
  if (!shipsTo(x)) { blocked(id); return false }
  return true }
function blocked(id){ var x = PRODS[id];
  open('gate', { id: id, bad: '<b>' + esc(x.n) + '</b> doesn\'t deliver to ' + esc(where()) + '. Try another city or pincode, or <a href="#" onclick="event.preventDefault();document.querySelector(\'.near-ov\').remove();openCol(\'' + esc(x.col) + '\')">see ' + esc((COLS[x.col] || {}).t || 'similar products') + ' that deliver here</a>.',
    then: function () { if (shipsTo(x)) { try { addCart(id) } catch (e) {} } else blocked(id) } }) }
['addCart', 'buyNow'].forEach(function (fn){
  var orig = window[fn]; if (typeof orig !== 'function') return;
  window[fn] = function (id){ var pid = id || (typeof curPid !== 'undefined' ? curPid : null), self = this, args = arguments;
    if (pid && !gate(pid, function () { orig.apply(self, args) })) return; return orig.apply(this, arguments) };
});

/* product page: the real pincode check */
window.checkPin = function (){
  var v = (document.getElementById('pin') || {}).value || '', ok = document.getElementById('pinok'); if (!ok) return;
  ok.style.display = 'block';
  var loc = fromText(v); if (!loc) { ok.textContent = /^\d{6}$/.test(v) ? 'We don\'t recognise this pincode.' : 'Enter a valid 6-digit pincode'; return }
  var x = PRODS[curPid], place = loc.city ? city(loc.city).name : v;
  if (!shipsTo(x, loc)) { ok.textContent = '✗ Doesn\'t deliver to ' + v + ' (' + place + ')'; ok.style.color = '#a14f33' }
  else { ok.style.color = ''; var c = charge(x, loc), id = curPid
    var say = function (c, how) { ok.textContent = '✓ Delivers to ' + v + ' (' + place + ')' + (how ? ' · local delivery by ' + how : loc.city && x && ((x.sc || []).indexOf(loc.city) >= 0) ? ' · local delivery, faster' : '')
      + (hasCh(x) ? ' · Packaging & delivery ' + inr(c.fee) + ' · Total ' + inr(x.p + c.fee) : ' · Free delivery') + (window.etaText ? ' · Delivery by ' + etaText(id, loc) : '') };   // 076 / 081
    say(c);
    if (localVehicle(x, loc)) { var use = function () { var q = quote([{ sku: id, qty: 1 }], loc), ln = q && q.lines && q.lines[0]; if (ln && ln.mode === 'vehicle') say({ fee: +ln.pack + +ln.ship }, String(ln.note || '').split(' · ')[0]) };   // 078
      if (quote([{ sku: id, qty: 1 }], loc, use)) use() } }
  save(loc, null);
};

/* ---------------------------------------------------------------- checkout */
function checkoutCheck(){
  var pinEl = document.getElementById('coPin'), btn = document.getElementById('coPlace'); if (!pinEl) return [];
  var pin = pinEl.value.trim(), box = document.getElementById('coNear');
  var loc = /^[1-9][0-9]{5}$/.test(pin) ? { city: pinCity(pin), state: pinState(pin), pincode: pin } : null;
  var bad = loc ? CART.filter(function (c) { return PRODS[c.id] && !shipsTo(PRODS[c.id], loc) }) : [];
  if (!box) { box = document.createElement('div'); box.id = 'coNear'; var sum = btn && btn.closest('.cobox'); if (sum) sum.insertBefore(box, sum.querySelector('.coline') || sum.children[1]) }
  box.className = bad.length ? 'co-near' : ''; box.innerHTML = bad.length ? '<b>Not available at pincode ' + esc(pin) + '</b>' + bad.map(function (c) {
    return '<div class="ln"><span>' + esc(PRODS[c.id].n) + '</span><button type="button" onclick="cartRm(\'' + c.id + '\');renderCheckout()">Remove</button></div>' }).join('')
    + '<div style="margin-top:6px;font-size:12.5px;color:#7a756c">Remove these, or deliver to another address.</div>' : '';
  if (btn) { btn.disabled = bad.length > 0; btn.style.opacity = bad.length ? .5 : '' }
  return bad }
window.nearBlocked = function (){ var bad = checkoutCheck(); if (bad.length) { toast(bad.length === 1 ? PRODS[bad[0].id].n + ' doesn\'t deliver to this pincode' : bad.length + ' items don\'t deliver to this pincode'); return true } return false };
var _rc = window.renderCheckout;
if (typeof _rc === 'function') window.renderCheckout = renderCheckout = function (){
  var r = _rc.apply(this, arguments);
  var pinEl = document.getElementById('coPin');
  if (pinEl) { if (!pinEl.value && LOC && LOC.pincode) pinEl.value = LOC.pincode; pinEl.addEventListener('input', checkoutCheck); checkoutCheck() }
  return r };

/* ---------------------------------------------------------------- 076: packaging + delivery charges (set by the seller)
   x.ch = { pk: packaging, l: own city & nearby, s: same state, i: rest of India } per piece, incl. GST; x.os = state it ships from.
   Same rule as the database (_ship_rate): empty rate → the next wider one; nothing set → free. The order total comes from the server. */
function num(v){ return v == null || v === '' || isNaN(+v) ? null : +v }
function zoneOf(x, loc){ if (!loc) return null; var c = loc.city, s = loc.state;
  if (c && (c === x.oc || (x.sc || []).indexOf(c) >= 0 || (x.oc && near(x.oc).indexOf(c) >= 0))) return 'local';
  return s && s === x.os ? 'state' : 'india' }
function rateOf(x, z){ var c = x.ch || {}, l = num(c.l), s = num(c.s), i = num(c.i);
  var r = z === 'local' ? (l != null ? l : s != null ? s : i) : z === 'state' ? (s != null ? s : i) : i; return r == null ? 0 : r }
function hasCh(x){ var c = (x && x.ch) || {}; return [c.pk, c.l, c.s, c.i].some(function (v) { return num(v) > 0 }) }
// per piece: { zone, pack, ship, fee }; without a place: the lowest it can be (from: true)
function charge(x, loc){ var pk = num((x.ch || {}).pk) || 0;
  if (!loc) { var lo = Math.min(rateOf(x, 'local'), rateOf(x, 'state'), rateOf(x, 'india')); return { zone: null, pack: pk, ship: lo, fee: pk + lo, from: true } }
  var z = zoneOf(x, loc), sh = rateOf(x, z); return { zone: z, pack: pk, ship: sh, fee: pk + sh } }
window.shipCharge = function (id, loc){ var x = PRODS[id]; return x ? charge(x, loc === undefined ? LOC : loc) : null };
window.hasCharges = function (id){ return hasCh(PRODS[id]) };
window.locFromPin = function (pin){ return /^[1-9][0-9]{5}$/.test(pin || '') ? { city: pinCity(pin), state: pinState(pin), pincode: pin } : null };
window.nearLoc = function (){ return LOC };
window.nearWhere = function (loc){ loc = loc || LOC; return loc ? (loc.city ? city(loc.city).name : loc.pincode || stateName(loc.state)) : '' };
/* 078: local orders of products that deliver locally go by vehicle (bike / auto / mini truck), priced by distance and load:
   the server works that out (delivery_quote, the same plan the order uses). Asked once per place + cart, then cached. */
function localVehicle(x, loc){ return !!loc && zoneOf(x, loc) === 'local' && (x.sp === false || (x.sc || []).length > 0) }
var QC = {};
function qkey(items, loc){ return [loc.pincode || '', loc.city || '', items.map(function (i) { return i.sku + ':' + i.qty }).join(',')].join('|') }
function quote(items, loc, then){
  var S = window.OUTRR_SUPA || {}, k = qkey(items, loc); if (QC[k]) return QC[k] === 'wait' ? null : QC[k];
  if (!S.url || !S.anon) return null;
  QC[k] = 'wait';
  fetch(S.url + '/rest/v1/rpc/delivery_quote', { method: 'POST', headers: { apikey: S.anon, Authorization: 'Bearer ' + S.anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_items: items, p_pin: loc.pincode || null, p_city: loc.pincode ? null : (loc.city || null) }) })
    .then(function (r) { return r.ok ? r.json() : null }).then(function (j) { QC[k] = j && j.lines ? j : { lines: [], failed: true }; then && then() }, function () { QC[k] = { lines: [], failed: true } });
  return null }
function cartRepaint(){
  try { var co = document.getElementById('checkout'); if (co && co.style.display === 'block' && window.coShipPaint) coShipPaint() } catch (e) {}
  try { var cb = document.getElementById('cartBody'); if (cb && cb.offsetParent && typeof renderCart === 'function') renderCart() } catch (e) {} }
// the whole cart to a place (null = place not known and something in the cart has charges)
window.cartShip = function (loc){ loc = loc === undefined ? LOC : loc; var t = 0, unknown = false, local = false;
  CART.forEach(function (c) { var x = PRODS[c.id]; if (!x || !hasCh(x)) return; if (!loc) { unknown = true; return } if (localVehicle(x, loc)) local = true; t += charge(x, loc).fee * c.q });
  if (unknown) return null;
  if (local) { var q = quote(CART.map(function (c) { return { sku: c.id, qty: c.q } }), loc, cartRepaint); if (q && !q.failed) return Math.round((+q.pack + +q.ship) * 100) / 100 }
  return Math.round(t * 100) / 100 };

/* product page: "₹1,500 delivered to Mumbai" + "₹1,000 product + ₹500 packaging & delivery" (MRP only next to the product price) */
function pdPaint(id){
  var x = PRODS[id], el = document.getElementById('pdPrice'); if (!x || !el) return;
  var br = document.getElementById('pdBreak');
  if (!br) { br = document.createElement('div'); br.id = 'pdBreak'; br.className = 'dlv-br'; el.parentNode.insertBefore(br, el.nextSibling) }
  var off = x.m > x.p ? Math.round((1 - x.p / x.m) * 100) : 0;
  var mrp = off ? '<span class="mrplab">MRP</span><span class="mrp">' + inr(x.m) + '</span><span class="off">' + off + '% OFF</span>' : '';
  var chip = document.getElementById('pdDlv'), ships = shipsTo(x), c = charge(x, LOC), check = ' · <a class="dlv-a" onclick="pinFocus()">Check delivery charge</a>', how = '';
  if (LOC && ships && localVehicle(x, LOC)) {   // 078: local delivery by vehicle, 1 piece (the cart adds up the load)
    var q = quote([{ sku: id, qty: 1 }], LOC, function () { if (typeof curPid !== 'undefined' && curPid === id) pdPaint(id) }), ln = q && q.lines && q.lines[0];
    if (ln && ln.mode === 'vehicle') { c = { pack: +ln.pack, ship: +ln.ship, fee: +ln.pack + +ln.ship }; how = ' <span class="dlv-veh">local delivery by ' + esc(String(ln.note || '').split(' · ')[0]) + '</span>' }
  }
  if (!hasCh(x)) { el.innerHTML = inr(x.p) + mrp; br.innerHTML = LOC && ships ? 'Free delivery to ' + esc(where()) : 'Free delivery'; if (chip) chip.textContent = 'Free delivery'; return }
  if (LOC && ships) {
    el.innerHTML = inr(x.p + c.fee) + '<span class="dlv-to">delivered to ' + esc(where()) + '</span>';
    br.innerHTML = '<span class="dlv-pp">' + inr(x.p) + ' product</span>' + mrp + '<span class="dlv-plus"> + ' + inr(c.fee) + ' packaging &amp; delivery</span>'
      + how + ' · <a class="dlv-a" onclick="nearOpen(\'change\')">Change city</a>';
    if (chip) chip.textContent = 'Packaging & delivery ' + inr(c.fee);
  } else {
    el.innerHTML = inr(x.p) + mrp;
    br.innerHTML = (LOC && !ships ? '<b class="dlv-no">Doesn\'t deliver to ' + esc(where()) + '</b>' : '+ packaging &amp; delivery from ' + inr(c.fee)) + check;
    if (chip) chip.textContent = 'Packaging & delivery extra';
  }
}
window.pdPaint = pdPaint;
window.pinFocus = function (){ var i = document.getElementById('pin'); if (!i) return; try { i.scrollIntoView({ block: 'center', behavior: 'smooth' }) } catch (e) {} setTimeout(function () { try { i.focus() } catch (e) {} }, 350) };
var _op = window.openProduct;
if (typeof _op === 'function') window.openProduct = openProduct = function (id){ var r = _op.apply(this, arguments); try { pdPaint(id) } catch (e) {} return r };
window.addEventListener('outrr-loc', function () { try { if (typeof curPid !== 'undefined' && curPid) pdPaint(curPid) } catch (e) {} });
var css2 = document.createElement('style');
css2.textContent = '.dlv-to{font-size:13px;font-weight:600;color:#5b5750;margin-left:8px}.dlv-br{font-size:13px;color:#5b5750;margin:2px 0 4px;line-height:1.5}'
 + '.dlv-br .mrplab{margin-left:6px}.dlv-br .mrp{font-size:12px;color:#8a857c;text-decoration:line-through;margin-left:4px}.dlv-br .off{font-size:11.5px;color:#a14f33;font-weight:800;margin-left:5px}'
 + '.dlv-pp{font-weight:700;color:#2E2E2E}.dlv-a{color:#a14f33;font-weight:600;cursor:pointer;text-decoration:underline;white-space:nowrap}.dlv-no{color:#a14f33}'
 + '.near-lb.dlv{color:#5b5750;font-weight:500}.dlv-veh{font-size:12px;font-weight:600;color:#3d5233;background:#eef3ea;border-radius:999px;padding:1px 8px;margin-left:6px}';
document.head.appendChild(css2);

/* ---------------------------------------------------------------- 081: delivery dates
   Delivery by = order day (next day after the cut-off) + the product's "Ships in" days + transit days for the zone, Sundays skipped.
   Same rule as the database (order_items_eta); the rates and days come from company_rates(). */
var DT = { transit_days: { local: [1, 2], state: [2, 4], india: [4, 7], special: [7, 10], hyperlocal: [0, 1] }, cutoff_hour: 14, special_states: ['AS', 'AR', 'ML', 'MN', 'MZ', 'NL', 'TR', 'SK', 'JK', 'LA', 'AN'] };
(function () { var S = window.OUTRR_SUPA || {}; if (!S.url || !S.anon) return;
  fetch(S.url + '/rest/v1/rpc/company_rates', { method: 'POST', headers: { apikey: S.anon, Authorization: 'Bearer ' + S.anon, 'Content-Type': 'application/json' }, body: '{}' })
    .then(function (r) { return r.ok ? r.json() : null }).then(function (j) { if (j && j.transit_days) { DT = { transit_days: j.transit_days, cutoff_hour: j.cutoff_hour == null ? 14 : j.cutoff_hour, special_states: j.special_states || DT.special_states }; refresh() } }, function () {}) })();
function shipDaysOf(x){ if (+x.dd > 0) return +x.dd; var n = String(x.ship || '').match(/\d+/g); return n ? Math.max.apply(null, n.map(Number)) : 10 }
function wd(d, n){ var r = new Date(d), k = 0; while (k < Math.max(+n || 0, 0)) { r.setDate(r.getDate() + 1); if (r.getDay() !== 0) k++ } while (r.getDay() === 0) r.setDate(r.getDate() + 1); return r }
function etaOf(x, loc){ if (!x || !loc) return null;
  var now = new Date(), ist = new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 60000), start = new Date(ist.getFullYear(), ist.getMonth(), ist.getDate());
  if (ist.getHours() >= DT.cutoff_hour) start.setDate(start.getDate() + 1);
  var z = localVehicle(x, loc) ? 'hyperlocal' : zoneOf(x, loc); if (z === 'india' && DT.special_states.indexOf(loc.state) >= 0) z = 'special';
  var t = DT.transit_days[z] || DT.transit_days.india || [4, 7], disp = wd(start, shipDaysOf(x));
  return { from: wd(disp, t[0]), to: wd(disp, t[1]), zone: z } }
var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function dRange(e){ var a = e.from, b = e.to, f = function (d) { return d.getDate() + ' ' + MON[d.getMonth()] };
  if (+a === +b) return f(a); return a.getMonth() === b.getMonth() ? a.getDate() + '–' + f(b) : f(a) + ' – ' + f(b) }
window.etaText = function (id, loc){ var e = etaOf(PRODS[id], loc === undefined ? LOC : loc); return e ? dRange(e) : '' };
// cart line: "Delivery by 24–27 Oct" (or how long it ships in)
window.etaLine = function (id){ var x = PRODS[id]; if (!x) return '';
  var e = LOC && shipsTo(x) ? etaOf(x, LOC) : null;
  return '<div class="eta-l">' + (e ? '🚚 Delivery by <b>' + dRange(e) + '</b>' : esc(x.ship || '')) + '</div>' };
// checkout lines (by the address pincode)
window.etaFill = function (loc){ loc = loc || LOC;
  [].forEach.call(document.querySelectorAll('.co-eta'), function (el) { var x = PRODS[el.getAttribute('data-id')], e = x && loc && shipsTo(x, loc) ? etaOf(x, loc) : null;
    el.innerHTML = e ? '🚚 Delivery by <b>' + dRange(e) + '</b>' : '<span>' + esc(x ? x.ship : '') + (loc ? '' : ' · enter pincode for the delivery date') + '</span>' }) };
function pdEta(id){ var x = PRODS[id]; if (!x) return;
  var el = document.getElementById('pdEtaLine'), br = document.getElementById('pdBreak');
  if (!el && br) { el = document.createElement('div'); el.id = 'pdEtaLine'; el.className = 'dlv-eta'; br.parentNode.insertBefore(el, br.nextSibling) }
  var e = LOC && shipsTo(x) ? etaOf(x, LOC) : null, big = document.getElementById('pdEta'), lb = big && big.previousElementSibling;
  if (el) el.innerHTML = e ? '🚚 Delivery by <b>' + dRange(e) + '</b> to ' + esc(where()) + ' · <span>' + esc(x.ship) + '</span>'
    : '<span>' + esc(x.ship) + '</span> · <a class="dlv-a" onclick="pinFocus()">Enter pincode for the delivery date</a>';
  if (big) { big.textContent = e ? dRange(e) : String(x.ship || '').replace('Ships in ', '') + ' + delivery'; if (lb) lb.textContent = e ? 'Delivery by' : 'Ships in' } }
var _pp = window.pdPaint; window.pdPaint = pdPaint = function (id){ _pp(id); try { pdEta(id) } catch (e) {} };
var css3 = document.createElement('style');
css3.textContent = '.dlv-eta{font-size:13px;color:#2E2E2E;margin:2px 0 6px}.dlv-eta span{color:#7a756c}.eta-l,.co-eta{font-size:12px;color:#3d5233;margin-top:2px}.co-eta span,.eta-l span{color:#7a756c}';
document.head.appendChild(css3);

/* ---------------------------------------------------------------- start */
pill();
var skipped = null; try { skipped = localStorage.getItem(DK) } catch (e) {}
var quiet = /[?&](preview|pitch)=/.test(location.search) || /^#(review|track)=/.test(location.hash);
if (!LOC && !skipped && !quiet) setTimeout(function () { var off = document.getElementById('offpop'); if (!LOC && !ov && !(off && off.classList.contains('open'))) open('welcome') }, 3000);
if (LOC) setTimeout(refresh, 0);
window.addEventListener('outrr-catalog', refresh);
})();
})();
