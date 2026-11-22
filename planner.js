// outrr "Plan your space" (192) — phase 1: set up the terrace or lawn, then place things on it.
// Cabins and pergolas are the real models; every other Made to Order category is one common model the customer sizes and
// places; each shows "from ₹" = the cheapest live design of that category at that size (store price engine, window.mtoPrice).
// Rules: nothing goes over the parapet / boundary, nothing sits on another thing or on a block (decking is a floor: things
// stand on it); railings / gates snap to the edge, wall-type things to the parapet or a block when near. Blocks on the roof
// move only in step 1. Undo / redo. Saved in this browser (localStorage outrr_plan). Phase 2: pick the real design per item + cart.
import * as S3 from './space3d.js?v=23';
import { cutHit } from './cabin3d.js?v=25';
import * as TM from './terrace-match.js?v=3';

const KEY = 'outrr_plan', PAR = 0.75;
const PLOTS = [['100', 20, 45], ['125', 25, 45], ['200', 30, 60], ['300', 40, 67], ['400', 40, 90], ['500', 50, 90]];
const AU = () => { try { return localStorage.getItem('outrr_area_unit') === 'm' ? 'm' : 'yd'; } catch (e) { return 'yd'; } }, plotLab = g => AU() === 'm' ? Math.round(+g * 0.836127) + ' sq m' : g + ' sq yd';   // plot size in sq yd (gaj) or sq m
const BHD = { mumty: 9, lift: 11, shaft: 3, room: 9 };   // = cabin3d.js BH_: a block's height when not typed
const BLK = { mumty: ['Mumty (staircase room)', 10, 18], lift: ['Lift room', 6, 6], shaft: ['Shaft (open duct)', 3, 4], room: ['Room already built', 10, 12], ac: ['AC outdoor unit', 3, 1.2] };
const CUTS = [['bl', 'Back-left'], ['br', 'Back-right'], ['fl', 'Front-left'], ['fr', 'Front-right']];   // front = the road side
// kind: free (stands anywhere) | floor (decking: things stand on it) | edge (along the parapet / boundary) | wall (a panel; snaps to a wall when near)
// fit: how the size maps to the price engine — l / w / h are taken from the item's length, depth and height
const CATS = [
  { k: 'cabin', t: 'Cabin', e: '🏠', col: 'cabins', kind: 'free' },
  { k: 'pergola', t: 'Pergola', e: '⛱️', col: 'shade', sb: /pergola/i, kind: 'free', w: 12, d: 10, h: 8, min: [6, 6], max: [40, 30], hr: [7, 12], size: 'wd' },
  { k: 'sofa', t: 'Sofa set', e: '🛋️', col: 'furniture', sb: /sofa/i, kind: 'free', w: 10, d: 8, h: 3, size: 'fixed' },
  { k: 'swing', t: 'Swing', e: '🪢', col: 'furniture', sb: /swing|jhool|jhul/i, kind: 'free', w: 6, d: 4.5, h: 7, size: 'fixed', always: true },
  { k: 'dining', t: 'Dining set', e: '🍽️', col: 'furniture', sb: /dining/i, kind: 'free', w: 7, d: 6, h: 3.2, size: 'fixed' },
  { k: 'chair', t: 'Chairs', e: '🪑', col: 'furniture', sb: /chair/i, kind: 'free', w: 2.5, d: 2.5, h: 3, size: 'fixed' },
  { k: 'bench', t: 'Bench', e: '🪵', col: 'furniture', sb: /bench/i, kind: 'free', w: 5, d: 2, h: 1.6, size: 'fixed' },
  { k: 'table', t: 'Table', e: '🟫', col: 'furniture', sb: /table/i, kind: 'free', w: 3, d: 3, h: 2.5, size: 'fixed' },
  { k: 'bar', t: 'Bar counter', e: '🍸', col: 'bar-counters', kind: 'free', w: 8, d: 2.5, h: 3.6, min: [4, 2.5], max: [24, 2.5], size: 'w' },
  { k: 'planter', t: 'Planter', e: '🪴', col: 'planters', kind: 'free', w: 2, d: 2, h: 3.5, size: 'wd' },   // 199: outrr planters are made to your length × width
  { k: 'water', t: 'Water feature', e: '⛲', col: 'water-features', kind: 'free', w: 4, d: 4, h: 3.8, size: 'fixed' },
  { k: 'sculpture', t: 'Sculpture', e: '🗿', col: 'sculptures', kind: 'free', w: 2, d: 2, h: 4, size: 'fixed' },
  { k: 'deck', t: 'Decking', e: '🟧', col: 'decking', kind: 'floor', w: 10, d: 8, h: 0.2, min: [4, 4], max: [80, 80], size: 'wd' },
  { k: 'railing', t: 'Railing', e: '🚧', col: 'railings', kind: 'edge', w: 10, d: 0.4, h: 3.5, min: [3, 0.4], max: [120, 0.4], size: 'w' },
  { k: 'privacy', t: 'Privacy screen', e: '🎋', col: 'privacy-screens', kind: 'wall', w: 8, d: 0.5, h: 6, min: [2, 0.5], max: [60, 0.5], hr: [3, 10], size: 'wh' },
  { k: 'feature', t: 'Feature wall', e: '🧱', col: 'feature-walls', kind: 'wall', w: 10, d: 0.6, h: 8, min: [3, 0.6], max: [40, 0.6], hr: [3, 12], size: 'wh' },
  { k: 'vgarden', t: 'Vertical garden', e: '🌿', col: 'vertical-gardens', kind: 'wall', w: 6, d: 0.6, h: 6, min: [2, 0.6], max: [40, 0.6], hr: [2, 12], size: 'wh' },
  { k: 'graffiti', t: 'Graffiti art', e: '🎨', col: 'graffiti', kind: 'wall', w: 10, d: 0.3, h: 6, min: [3, 0.3], max: [60, 0.3], hr: [3, 12], size: 'wh' },
  { k: 'accover', t: 'AC cover', e: '❄️', col: 'ac-covers', sb: /floor|terrace/i, kind: 'free', w: 3.6, d: 1.8, h: 2.9, size: 'fixed' },
  { k: 'pathway', t: 'Pathway', e: '🪨', col: 'pathways', kind: 'floor', w: 3, d: 20, h: 0.15, min: [2, 3], max: [6, 150], size: 'wd', always: true, nolabel: true },   // 224: layout elements (priced by our team until designs are listed)
  { k: 'turf', t: 'Artificial grass', e: '🟩', col: 'turf', kind: 'floor', w: 12, d: 10, h: 0.1, min: [4, 4], max: [80, 80], size: 'wd', always: true, nolabel: true },
  { k: 'firepit', t: 'Fire pit', e: '🔥', col: 'fire-pits', kind: 'free', w: 3.5, d: 3.5, h: 1.5, size: 'fixed', always: true },
  { k: 'jacuzzi', t: 'Jacuzzi', e: '🛁', col: 'jacuzzi', kind: 'free', w: 7, d: 7, h: 3, size: 'fixed', always: true },
  { k: 'lights', t: 'Garden lights', e: '💡', col: 'lighting', kind: 'free', w: 0.8, d: 0.8, h: 3, size: 'fixed', always: true, nolabel: true },
  { k: 'umbrella', t: 'Umbrella', e: '☂️', col: 'umbrellas', kind: 'free', w: 8, d: 8, h: 8, size: 'fixed', always: true },
  { k: 'gate', t: 'Gate', e: '🚪', col: 'gates', kind: 'edge', w: 10, d: 0.4, h: 6, min: [3, 0.4], max: [30, 0.4], hr: [4, 10], size: 'wh', lawn: true },
];
// 193 phase 3: ready-made setups — added to what's already there, each thing at the nearest free spot
const SETUPS = [
  { k: 'chill', t: 'Chill corner', e: '☕', d: 'Pergola with a sofa on a deck, water, planters, lights', items: ['pergola', 'deck', 'sofa', 'water', 'pathway', 'privacy', 'lights', 'lights', 'lights', 'lights', 'planter', 'planter', 'planter', 'planter'] },
  { k: 'party', t: 'Party terrace', e: '🎉', d: 'Bar by the stairs, pergola lounge, dining, fire pit, grass', items: ['bar', 'pergola', 'sofa', 'dining', 'firepit', 'turf', 'pathway', 'privacy', 'lights', 'lights', 'lights', 'lights', 'planter', 'planter', 'planter'] },
  { k: 'work', t: 'Work + relax', e: '💻', d: 'Cabin at the back, deck, sofa, green wall', items: ['cabin', 'deck', 'pergola', 'sofa', 'vgarden', 'pathway', 'privacy', 'planter', 'planter', 'planter'] },
  { k: 'green', t: 'Green retreat', e: '🌿', d: 'Grass, green walls, planters, bench, water', items: ['turf', 'vgarden', 'feature', 'water', 'bench', 'pathway', 'privacy', 'planter', 'planter', 'planter', 'planter', 'planter', 'planter'] },
  { k: 'yoga', t: 'Yoga & wellness', e: '🧘', d: 'Deck under a pergola, water, green wall, screens', items: ['deck', 'pergola', 'water', 'vgarden', 'turf', 'privacy', 'planter', 'planter', 'planter', 'planter'] },
  { k: 'spa', t: 'Spa & lounge', e: '🛁', d: 'Jacuzzi, pergola lounge, feature wall, lights', items: ['jacuzzi', 'pergola', 'deck', 'sofa', 'feature', 'water', 'pathway', 'privacy', 'lights', 'lights', 'lights', 'lights', 'planter', 'planter', 'planter', 'planter'] },
  { k: 'family', t: 'Family lawn', e: '🌳', d: 'Pergola, dining, bench, water, sculpture', items: ['pergola', 'dining', 'bench', 'water', 'sculpture', 'planter'], lawn: true },
];
const CAT = Object.fromEntries(CATS.map(c => [c.k, c]));
const UMB = new Set(['pergola', 'umbrella']), FLX = new Set(['pathway', 'turf', 'deck']);   // things can stand under these; these floors don't overlap each other
const PR = () => (typeof PRODS !== 'undefined' ? PRODS : window.PRODS) || {};   // the store's catalogue is a page-level const
const num = v => { const n = parseFloat(v); return isFinite(n) ? n : null; };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const rs = n => '₹' + Math.round(n).toLocaleString('en-IN');
const lakh = v => v >= 100000 ? '₹' + (v / 100000).toFixed(v >= 1000000 ? 1 : 2).replace(/\.?0+$/, '') + ' lakh' : rs(v);
const r2 = v => Math.round(v * 2) / 2;
let S = null, EL = null, QUIET = false;

// ---------------------------------------------------------------- state, saving, undo / redo
function fresh() { const t = { kind: 'terrace', plot: '200', pw: 30, pd: 60, par: 3, corner: '', high: {}, tanks: true, blocks: [] }; defBlocks(t); return { v: 1, step: 0, site: t, items: [], sel: null, view: '3d' }; }
function defBlocks(t) { t.blocks = []; const sm = t.pw <= 25; addBlock(t, 'mumty', sm ? 8 : 10, sm ? 16 : 18, 'left'); const m = t.blocks[0]; if (m) addBlock(t, 'lift', 6, 6, 'left', [PAR, Math.max(PAR, m.z - 6)]); addBlock(t, 'shaft', 3, 4, 'right'); }
function load() { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && v.v === 1 && v.site) return Object.assign({ sel: null, view: '3d', step: 0 }, v); } catch (e) {} return fresh(); }
function save() { if (QUIET) return; try { localStorage.setItem(KEY, JSON.stringify({ v: 1, step: S.step, site: S.site, items: S.items, pid: S.pid || null, pname: S.pname || '', source: S.source || '' })); } catch (e) {} if (S.dirty !== false) cloudSoon(); }
// ---------------------------------------------------------------- 195: plans saved to the customer's account; sign-in asked 1 minute in
const ev = (k, d) => { try { if (window.otrack) window.otrack(k, d || {}); } catch (e) {} };
async function rpc(fn, args) {
  const C = window.OUTRR_SUPA || {}, t = window.acToken ? await window.acToken() : null; if (!C.url || !t) throw new Error('Please sign in');
  const r = await fetch(C.url + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: C.anon, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify(args || {}) });
  const j = await r.json().catch(() => null); if (!r.ok) throw new Error((j && j.message) || 'Could not save'); return j;
}
const assistTok = () => (window.ASSIST && window.ASSIST.token) || '';   // 196: Sales mode — saved on the CRM lead
async function anonRpc(fn, args) {
  const C = window.OUTRR_SUPA || {}; if (!C.url) throw new Error('Not connected');
  const r = await fetch(C.url + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: C.anon, Authorization: 'Bearer ' + C.anon, 'Content-Type': 'application/json' }, body: JSON.stringify(args || {}) });
  const j = await r.json().catch(() => null); if (!r.ok) throw new Error((j && j.message) || 'Could not save'); return j;
}
const signedIn = () => { try { return !!localStorage.getItem('outrr_session'); } catch (e) { return false; } };
const pinNow = () => { try { return (JSON.parse(localStorage.getItem('outrr_addr') || '{}').pincode) || ''; } catch (e) { return ''; } };
let cloudT = null, cloudBusy = false;
function cloudSoon(extra) { if (!S || (!assistTok() && (!signedIn() || !priceOk()))) return; clearTimeout(cloudT); cloudT = setTimeout(() => cloudSave(extra), extra ? 0 : 3000); }
async function cloudSave(extra) {
  if (cloudBusy || !S) return; cloudBusy = true;
  try {
    const est = S.step === 2 ? exact().t : total().t, first = !S.pid;
    const pl = Object.assign({ id: S.pid || null, name: S.pid ? undefined : S.pname || undefined, kind: S.site.kind === 'terrace' ? 'terrace' : 'lawn', site: S.site, items: S.items, step: S.step,
      est: Math.round(est || 0), pincode: pinNow(), device: innerWidth < 760 ? 'mobile' : 'desktop', source: S.source || 'planner' }, extra || {});
    const r = assistTok() ? await anonRpc('sales_plan_save', { p_token: assistTok(), p: pl }) : await rpc('plan_save', { p: pl });
    if (r && r.id) { S.pid = r.id; S.pname = r.name; S.savedAt = Date.now(); S.dirty = false; save(); S.dirty = true; paintSaved(); if (first) ev('plan_save', {}); }
  } catch (e) { S.saveErr = String(e.message || e); paintSaved(); } finally { cloudBusy = false; }
}
function paintSaved() { const el = document.getElementById('plSv'); if (!el || !S) return;
  el.innerHTML = S.pid ? `<span title="Saved to your account">✓ ${esc(S.pname || 'Saved')}</span><button type="button" data-pl="rename" aria-label="Rename this plan">✎</button><button type="button" data-pl="newplan">＋ New plan</button>` : S.saveErr && signedIn() ? `<span style="color:#9B2C22">${esc(S.saveErr)}</span>` : ''; }
function gateDue() {   // 1 minute after the planner opened: sign in (with name, mobile, city) to keep going — the plan is then kept in the account
  if (priceOk() || S.gateOff) return false; let t0 = 0; try { t0 = +sessionStorage.getItem('outrr_plan_t0') || 0; if (!t0) { t0 = Date.now(); sessionStorage.setItem('outrr_plan_t0', t0); } } catch (e) {}
  return Date.now() - t0 > 60000;
}
let gateT = null;
function gateWatch() { clearInterval(gateT); gateT = setInterval(() => { if (!EL || EL.style.display === 'none') return; if (gateDue() && !S.gate) { S.gate = true; ev('plan_gate', {}); draw(false); } else if (S.gate && priceOk()) { S.gate = false; draw(false); cloudSoon({}); } }, 5000); }
function gateCard() { return '<div class="pl-gate"><b>Keep your plan</b><p>Sign in to save this plan to your account — open it again on any device, and see prices. It takes 30 seconds (email code + your name, mobile and city).</p><button type="button" class="pl-go" data-pl="unlock">Sign in to continue →</button><small>Your plan so far is kept.</small></div>'; }
function snap() { return JSON.stringify([S.site, S.items]); }
function hist() { const k = snap(); if (S.hist[S.hi] === k) return; S.hist = S.hist.slice(0, S.hi + 1); S.hist.push(k); if (S.hist.length > 80) S.hist.shift(); S.hi = S.hist.length - 1; }
function undo(d) { const j = S.hi + d; if (j < 0 || j >= S.hist.length) return; S.hi = j; const v = JSON.parse(S.hist[j]); S.site = v[0]; S.items = v[1]; S.sel = null; S.msg = ''; draw(true); }

// ---------------------------------------------------------------- geometry: inside the plot, nothing on anything
const P0 = () => S.site.kind === 'terrace' ? PAR : 0;
const foot = it => (+it.rot || 0) % 180 ? [it.d, it.w] : [it.w, it.d];
const rectI = it => { const f = foot(it); return { x: +it.x, z: +it.z, w: f[0], d: f[1] }; };
const hit = (a, b) => a.x < b.x + b.w - 0.01 && a.x + a.w > b.x + 0.01 && a.z < b.z + b.d - 0.01 && a.z + a.d > b.z + 0.01;
function inside(r) { const t = S.site, p = P0(); return r.x >= p - 0.01 && r.z >= p - 0.01 && r.x + r.w <= t.pw - p + 0.01 && r.z + r.d <= t.pd - p + 0.01 && !(t.kind === 'terrace' && cutHit(t, r, PAR)); }
const att = it => !!(it && (it.mode === 'par' || it.mode === 'tank' || it.mode === 'ac'));   // 193c: screens fixed on the parapet / on the mumty — no floor footprint
function clashes(it, i) {   // what it would sit on
  if (att(it)) return '';
  const r = rectI(it), fl = CAT[it.cat] && CAT[it.cat].kind === 'floor';
  if (!inside(r)) return 'edge';
  if ((S.site.kind === 'terrace' ? S.site.blocks : []).some(b => hit(r, b))) return 'block';
  const under = (a, b) => (UMB.has(a.cat) && !UMB.has(b.cat) && b.cat !== 'cabin') || (UMB.has(b.cat) && !UMB.has(a.cat) && a.cat !== 'cabin');   // 203: seating, a bar, planters… can stand under a pergola
  if (S.items.some((o, j) => j !== i && !att(o) && CAT[o.cat] && CAT[o.cat].kind !== 'floor' && (!fl || o.cat === 'cabin') && !under(it, o) && hit(r, rectI(o)))) return 'item';
  if (S.items.some((o, j) => j !== i && !att(o) && (fl ? FLX.has(it.cat) && FLX.has(o.cat) && it.cat !== o.cat : o.cat === 'pathway') && hit(r, rectI(o)))) return 'item';   // 224: nothing stands on the pathway; pathway / grass / deck don't overlap   // decking goes under things, never under a cabin
  return '';
}
function placeFree(it, i, from) {   // nearest free spot to where it was dropped (spiral), keeping its turn
  if (!clashes(it, i)) return true; const x0 = from ? from[0] : it.x, z0 = from ? from[1] : it.z, t = S.site;
  for (let r = 0.5; r <= Math.max(t.pw, t.pd); r += 0.5) for (let a = 0; a < 24; a++) { it.x = r2(x0 + r * Math.cos(a * Math.PI / 12)); it.z = r2(z0 + r * Math.sin(a * Math.PI / 12)); if (!clashes(it, i)) return true; }
  return false;
}
function snapEdge(it) {   // railings / gates: run along the nearest edge, against it
  const t = S.site, p = P0(), f = foot(it), cx = it.x + f[0] / 2, cz = it.z + f[1] / 2;
  const ds = [['back', cz - p], ['front', t.pd - p - cz], ['left', cx - p], ['right', t.pw - p - cx]].sort((a, b) => a[1] - b[1]), sd = ds[0][0];
  it.w = Math.min(it.w, sd === 'back' || sd === 'front' ? t.pw - 2 * p : t.pd - 2 * p);
  if (sd === 'back' || sd === 'front') { it.rot = sd === 'back' ? 180 : 0; it.x = r2(Math.max(p, Math.min(t.pw - p - it.w, cx - it.w / 2))); it.z = sd === 'back' ? p : t.pd - p - it.d; }
  else { it.rot = sd === 'left' ? 90 : 270; it.z = r2(Math.max(p, Math.min(t.pd - p - it.w, cz - it.w / 2))); it.x = sd === 'left' ? p : t.pw - p - it.d; }
  it.side = sd;
}
function snapWall(it) {   // a panel near the parapet or a block (within 3 ft): turn to face out from it and stand against it
  const t = S.site, p = P0(), f = foot(it), cx = it.x + f[0] / 2, cz = it.z + f[1] / 2;
  const faces = [['back', p, cz - p], ['front', t.pd - p, t.pd - p - cz], ['left', p, cx - p], ['right', t.pw - p, t.pw - p - cx]];
  (t.kind === 'terrace' ? t.blocks : []).forEach((b, bi) => { if (b.type === 'ac') return; if (cx > b.x && cx < b.x + b.w) { faces.push(['front', b.z, cz - b.z, 1, bi, 'zmin']); faces.push(['back', b.z + b.d, b.z + b.d - cz, 1, bi, 'zmax']); }
    if (cz > b.z && cz < b.z + b.d) { faces.push(['right', b.x, cx - b.x, 1, bi, 'xmin']); faces.push(['left', b.x + b.w, b.x + b.w - cx, 1, bi, 'xmax']); } });
  const near = it.wside ? faces.find(q => q[0] === it.wside && !q[3]) : faces.filter(q => Math.abs(q[2]) <= 3).sort((a, b) => Math.abs(a[2]) - Math.abs(b[2]))[0]; if (!near) { it.on = null; return; }   // a chosen wall wins
  const [sd, at, , blk, bi, face] = near; it.on = blk ? { b: bi, face } : { side: sd };   // a parapet side: the panel's back to it; a block: its face
  if (sd === 'back' || sd === 'front') { it.rot = sd === 'back' ? 0 : 180; it.x = r2(cx - it.w / 2); it.z = blk ? (sd === 'front' ? at - it.d : at) : (sd === 'back' ? at : at - it.d); }
  else { it.rot = sd === 'left' ? 270 : 90; it.z = r2(cz - it.w / 2); it.x = blk ? (sd === 'right' ? at - it.d : at) : (sd === 'left' ? at : at - it.d); }
  if (it.wside) { const f2 = foot(it); it.x = r2(Math.max(p, Math.min(t.pw - p - f2[0], it.x))); it.z = r2(Math.max(p, Math.min(t.pd - p - f2[1], it.z))); }   // kept on the plot along its wall
}
// 193c: a parapet side's free runs (cut corners trimmed; cabins, blocks and tall things standing against it left out)
const SIDE_AX = { back: 'x', front: 'x', left: 'z', right: 'z' };
function parRuns(side, skip, kinds) {
  const t = S.site, p = P0(), C = (t.kind === 'terrace' && t.cuts) || {}, ax = SIDE_AX[side], len = ax === 'x' ? t.pw : t.pd;
  const cutAt = k => { const c = C[k]; return c && (c.type === 'notch' || c.type === 'slant') ? (ax === 'x' ? +c.a : +c.b) || 0 : 0; };
  const ends = { back: ['bl', 'br'], front: ['fl', 'fr'], left: ['bl', 'fl'], right: ['br', 'fr'] }[side];
  let runs = [[p + cutAt(ends[0]) + (cutAt(ends[0]) ? p : 0), len - p - cutAt(ends[1]) - (cutAt(ends[1]) ? p : 0)]];
  const near = r => side === 'back' ? r.z < p + 1.6 : side === 'front' ? r.z + r.d > t.pd - p - 1.6 : side === 'left' ? r.x < p + 1.6 : r.x + r.w > t.pw - p - 1.6;
  const obs = (t.kind === 'terrace' ? t.blocks.filter(b => kinds.blocks.includes(b.type)) : []).concat(S.items.filter((o, j) => j !== skip && !att(o) && kinds.items(o)).map(rectI));
  if (t.kind !== 'terrace' && side === 'front') obs.push({ x: t.pw * 0.38 + 0.3, z: t.pd - 1, w: t.pw * 0.24 - 0.6, d: 1 });   // the lawn's gateway
  obs.filter(near).forEach(r => { const a = (ax === 'x' ? r.x : r.z) - 0.3, b = (ax === 'x' ? r.x + r.w : r.z + r.d) + 0.3; runs = runs.flatMap(([u0, u1]) => [[u0, Math.min(u1, a)], [Math.max(u0, b), u1]]).filter(([u0, u1]) => u1 - u0 >= 1); });
  return runs;
}
const SCREEN_STOP = { blocks: ['mumty', 'lift', 'room'], items: o => o.cat === 'cabin' || o.cat === 'feature' || o.cat === 'water' || (o.cat === 'privacy' && o.w >= 4) };
const WALL_STOP = { blocks: ['mumty', 'lift', 'room', 'shaft'], items: o => !(CAT[o.cat] && CAT[o.cat].kind === 'floor') };
function parTop() { const t = S.site; return t.kind === 'terrace' ? +t.par || 3 : 3; }
function parLine(side, u) { const t = S.site, q = t.kind === 'terrace' ? PAR / 2 : -0.25; return side === 'back' ? [u, q] : side === 'front' ? [u, t.pd - q] : side === 'left' ? [q, u] : [t.pw - q, u]; }
function mumtyTanks() { const t = S.site; if (t.kind !== 'terrace' || t.tanks === false) return null; const b = t.blocks.find(x => x.type === 'mumty'); if (!b) return null;
  const n = Math.max(b.w, b.d) >= 12 ? 2 : 1, along = b.d >= b.w, hx = (along ? 1.9 : (n > 1 ? 4.9 : 1.9)) + 0.75, hz = (along ? (n > 1 ? 4.9 : 1.9) : 1.9) + 0.75, cx = b.x + b.w / 2, cz = b.z + b.d / 2;
  const x0 = Math.max(b.x - 0.25, cx - hx), x1 = Math.min(b.x + b.w + 0.25, cx + hx), z0 = Math.max(b.z - 0.25, cz - hz), z1 = Math.min(b.z + b.d + 0.25, cz + hz);
  return { y: (+b.h > 0 ? +b.h : 9) + 0.35, pts: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] }; }
function attach(it, i) {   // lay a parapet / tank screen out again (things around it may have moved)
  if (it.mode === 'par') { const segs = []; (it.sides || []).forEach(sd => parRuns(sd, i, SCREEN_STOP).forEach(([u0, u1]) => { const a = parLine(sd, u0), b = parLine(sd, u1); segs.push({ x0: a[0], z0: a[1], x1: b[0], z1: b[1], y: parTop(), side: sd }); })); it.segs = segs; }
  else if (it.mode === 'tank') { const m = mumtyTanks(); it.segs = m ? m.pts.map((a, k) => { const b = m.pts[(k + 1) % 4]; return { x0: a[0], z0: a[1], x1: b[0], z1: b[1], y: m.y }; }) : []; }
  else if (it.mode === 'ac') { const b = (S.site.kind === 'terrace' ? S.site.blocks : []).find(x => x.id === it.bid); delete it.segs;
    it.box = b ? { x: b.x - 0.3, z: b.z - 0.3, w: b.w + 0.6, d: b.d + 0.6, h: 2.9 } : null; if (b) { it.x = it.box.x; it.z = it.box.z; it.w = it.box.w; it.d = it.box.d; it.h = 2.9; } return; }
  else { delete it.segs; return; }
  it.w = Math.round(it.segs.reduce((a, g) => a + Math.hypot(g.x1 - g.x0, g.z1 - g.z0), 0) * 2) / 2; it.d = 0.3; it.x = 0; it.z = 0; it.rot = 0;
}
function coverAC() {   // one cover over each AC unit that has none yet
  const t = S.site; if (t.kind !== 'terrace') return 0; t.blocks.forEach(b => { if (!b.id) b.id = 'b' + Math.random().toString(36).slice(2, 8); });
  let n = 0; t.blocks.filter(b => b.type === 'ac' && !S.items.some(o => o.mode === 'ac' && o.bid === b.id)).forEach(b => { const it = { cat: 'accover', mode: 'ac', bid: b.id, label: 'AC cover', rot: 0 }; S.items.push(it); attach(it, S.items.length - 1); n++; });
  return n;
}
function cabinH(it) { const L = cabinLay(it); return /^10/.test(String(L.height || '')) ? 10 : 8.5; }
function pergolaAttach(it, i) {   // a pergola against a cabin / mumty / room: those posts go (zones), and next to a cabin it takes the cabin's height + deck
  const t = S.site, r = rectI(it), zones = []; let cab = null;
  const obs = S.items.filter((o, j) => j !== i && o.cat === 'cabin').map(o => [rectI(o), o]).concat((t.kind === 'terrace' ? t.blocks : []).filter(b => ['mumty', 'room', 'lift'].includes(b.type)).map(b => [b, null]));
  obs.forEach(([o, cb]) => { const oz = [Math.max(r.z, o.z), Math.min(r.z + r.d, o.z + o.d)], ox = [Math.max(r.x, o.x), Math.min(r.x + r.w, o.x + o.x * 0 + o.w)];
    const gR = o.x - (r.x + r.w), gL = r.x - (o.x + o.w), gF = o.z - (r.z + r.d), gB = r.z - (o.z + o.d), ok = g => g > -0.05 && g <= 0.8; let hitz = null;
    if (oz[1] - oz[0] >= 1) { if (ok(gR)) hitz = { x: r.x + r.w - 0.8, z: oz[0], w: 0.8 + Math.max(0, gR), d: oz[1] - oz[0] }; else if (ok(gL)) hitz = { x: o.x + o.w, z: oz[0], w: 0.8 + Math.max(0, gL), d: oz[1] - oz[0] }; }
    if (!hitz && ox[1] - ox[0] >= 1) { if (ok(gF)) hitz = { x: ox[0], z: r.z + r.d - 0.8, w: ox[1] - ox[0], d: 0.8 + Math.max(0, gF) }; else if (ok(gB)) hitz = { x: ox[0], z: o.z + o.d, w: ox[1] - ox[0], d: 0.8 + Math.max(0, gB) }; }
    if (hitz) { zones.push(hitz); if (cb && !cab) cab = cb; } });
  it.att = zones;
  if (cab) { if (it.hAuto !== false) it.h = cabinH(cab); if (it.deckAuto !== false) it.deck = true; }
}
function fitWall(it, i) {   // graffiti takes the whole wall it is on: a free parapet run, or a block's face (its door left open)
  if (it.cat !== 'graffiti' || it.fit === false || !it.on) { if (it.cat === 'graffiti') { delete it.open; delete it.pw; } return; }
  const t = S.site; delete it.open; delete it.pw;
  if (it.on.side) { const sd = it.on.side, ax = SIDE_AX[sd], f = foot(it), u = ax === 'x' ? it.x + f[0] / 2 : it.z + f[1] / 2;
    const runs = parRuns(sd, i, WALL_STOP); if (!runs.length) return; const r = runs.find(([a, b]) => u >= a && u <= b) || runs.sort((A, B) => Math.min(Math.abs(u - A[0]), Math.abs(u - A[1])) - Math.min(Math.abs(u - B[0]), Math.abs(u - B[1])))[0];
    it.w = Math.round((r[1] - r[0]) * 2) / 2; it.h = parTop(); if (ax === 'x') it.x = r[0]; else it.z = r[0]; return; }
  const b = t.blocks[it.on.b]; if (!b) return; const zf = it.on.face[0] === 'z', H = (+b.h > 0 ? +b.h : 0) || { mumty: 9, lift: 11, room: 9, shaft: 3 }[b.type] || 9;
  it.w = zf ? b.w : b.d; it.h = Math.min(12, H); if (zf) it.x = b.x; else it.z = b.z;
  if (b.type === 'mumty' || b.type === 'room') {   // = cabin3d.js: the door is on the face that looks at the middle of the terrace
    const x = b.x + b.w / 2, z = b.z + b.d / 2, dx = t.pw / 2 - x, dz = t.pd / 2 - z, xf = Math.abs(dx) / t.pw > Math.abs(dz) / t.pd;
    const dface = xf ? (dx > 0 ? 'xmax' : 'xmin') : (dz > 0 ? 'zmax' : 'zmin');
    if (dface === it.on.face) { const dw = Math.min(3.2, (xf ? b.d : b.w) - 1), H7 = Math.min(7, it.h); it.open = [{ u0: (it.w - dw) / 2, u1: (it.w + dw) / 2, h: H7 }]; it.pw = Math.round((it.w * it.h - dw * H7) / it.h * 2) / 2; }
  }
}
function flush(it, i) {   // within 1.5 ft of the parapet, a block or another thing → slide up against it
  const t = S.site, p = P0(), fl = CAT[it.cat].kind === 'floor', obs = (t.kind === 'terrace' ? t.blocks : []).map(b => ({ x: b.x, z: b.z, w: b.w, d: b.d }))
    .concat(S.items.filter((o, j) => j !== i && !att(o) && CAT[o.cat] && CAT[o.cat].kind !== 'floor' && (!fl || o.cat === 'cabin')).map(rectI));
  const r = rectI(it), ov = (a0, a1, b0, b1) => a0 < b1 - 0.01 && a1 > b0 + 0.01;
  const gx = [[r.x - p, -1], [t.pw - p - (r.x + r.w), 1]], gz = [[r.z - p, -1], [t.pd - p - (r.z + r.d), 1]];
  obs.forEach(o => { if (ov(r.z, r.z + r.d, o.z, o.z + o.d)) { if (o.x + o.w <= r.x + 0.01) gx.push([r.x - (o.x + o.w), -1]); if (o.x >= r.x + r.w - 0.01) gx.push([o.x - (r.x + r.w), 1]); }
    if (ov(r.x, r.x + r.w, o.x, o.x + o.w)) { if (o.z + o.d <= r.z + 0.01) gz.push([r.z - (o.z + o.d), -1]); if (o.z >= r.z + r.d - 0.01) gz.push([o.z - (r.z + r.d), 1]); } });
  for (const [g, ax] of [[gx, 'x'], [gz, 'z']]) { const m = g.filter(q => q[0] > 0.01 && q[0] <= 1.5).sort((a, b) => a[0] - b[0])[0]; if (!m) continue;
    const keep = it[ax]; it[ax] = Math.round((it[ax] + m[0] * m[1]) * 100) / 100; if (clashes(it, i)) it[ax] = keep; }
}
// a thing set against a wall stays on it: moved / resized only along that wall (it.wside = left | right | back | front)
function pinW(it) { if (!it.wside || (CAT[it.cat] && CAT[it.cat].kind === 'wall')) return; const t = S.site, p = P0(), f = foot(it);
  if (it.wside === 'left') it.x = p; else if (it.wside === 'right') it.x = r2(t.pw - p - f[0]); else if (it.wside === 'back') it.z = p; else if (it.wside === 'front') it.z = r2(t.pd - p - f[1]); }
function undo1(it, keep) { Object.keys(it).forEach(k => delete it[k]); Object.assign(it, JSON.parse(keep)); }
function onW(it) { if (!it.wside) return true; const t = S.site, p = P0(), f = foot(it), e = 0.3;   // positions are kept to ½ ft
  return it.wside === 'left' ? Math.abs(it.x - p) < e : it.wside === 'right' ? Math.abs(it.x + f[0] - (t.pw - p)) < e : it.wside === 'back' ? Math.abs(it.z - p) < e : Math.abs(it.z + f[1] - (t.pd - p)) < e; }
function settle(it, i, from) { if (att(it)) { attach(it, i); return true; } pinW(it); const c = CAT[it.cat]; if (c && c.kind === 'edge') snapEdge(it); else if (c && c.kind === 'wall') { snapWall(it); fitWall(it, i); } const ok = placeFree(it, i, from); if (ok && c && c.kind !== 'edge' && c.kind !== 'wall') flush(it, i); return ok; }

// ---------------------------------------------------------------- blocks on the roof (step 1)
function addBlock(t, type, w, d, side, at) {
  const b = { id: 'b' + Math.random().toString(36).slice(2, 8), type, side: side || 'free', w, d, x: at ? at[0] : (t.pw - w) / 2, z: at ? at[1] : (t.pd - d) / 2 }; wallB(t, b, b.side); t.blocks.push(b);
  if (!freeB(t, t.blocks.length - 1)) { t.blocks.pop(); return false; } return true;
}
function wallB(t, b, side) { if (side === 'left') b.x = PAR; else if (side === 'right') b.x = t.pw - PAR - b.w; else if (side === 'back') b.z = PAR; else if (side === 'front') b.z = t.pd - PAR - b.d; b.x = Math.max(PAR, Math.min(t.pw - PAR - b.w, b.x)); b.z = Math.max(PAR, Math.min(t.pd - PAR - b.d, b.z)); }
function freeB(t, i) {
  const b = t.blocks[i], others = t.blocks.filter((o, j) => j !== i), ok = r => !others.some(o => hit(r, o)) && !cutHit(t, r, PAR); if (ok(b)) return true;
  for (let dd = 0.5; dd < Math.max(t.pw, t.pd); dd += 0.5) for (const s0 of [-dd, dd]) for (const q of (b.side === 'left' || b.side === 'right' ? [[b.x, b.z + s0]] : b.side === 'back' || b.side === 'front' ? [[b.x + s0, b.z]] : [[b.x, b.z + s0], [b.x + s0, b.z]])) {   // on a wall: only along it
    if (q[0] < PAR || q[1] < PAR || q[0] > t.pw - PAR - b.w || q[1] > t.pd - PAR - b.d) continue; const c2 = { x: q[0], z: q[1], w: b.w, d: b.d }; if (ok(c2)) { b.x = q[0]; b.z = q[1]; return true; } }
  return false;
}
function afterCut() {   // a corner cut changed: blocks and things move out of it
  const t = S.site; t.blocks.forEach((b, i) => freeB(t, i)); S.items = S.items.filter((it, i) => { const ok = settle(it, i); if (!ok) S.msg = 'Some things didn\'t fit any more and were taken off'; return ok; });
}
function setPlot(pw, pd) {   // a new size: blocks and things keep their place in proportion, then settle
  const t = S.site, opw = t.pw, opd = t.pd; t.pw = Math.max(12, Math.min(150, Math.round(pw))); t.pd = Math.max(12, Math.min(200, Math.round(pd)));
  if (t.kind === 'terrace') t.blocks.forEach((b, i) => { b.w = Math.min(b.w, t.pw - 3); b.d = Math.min(b.d, t.pd - 3); wallB(t, b, b.side); freeB(t, i); });   // blocks keep their place (mumty + lift stay together), only pulled in to fit
  S.items.forEach((it, i) => { const f = foot(it); it.x = r2((it.x + f[0] / 2) / opw * t.pw - f[0] / 2); it.z = r2((it.z + f[1] / 2) / opd * t.pd - f[1] / 2); });
  S.items = S.items.filter((it, i) => settle(it, i));
}

// ---------------------------------------------------------------- catalogue: designs per category, "from ₹" at a size
function designs(c) {
  const P = PR(), out = [];
  for (const id in P) { const p = P[id]; if (!p || !p.cz || p.col !== c.col) continue; if (c.sb && !c.sb.test(p.sb || p.n || '')) continue; if (c.k !== 'cabin' && p.cz.unit === 'cabin') continue; out.push(id); }
  return out;
}
function oFor(m, it) {   // the item's size in the words of that design's price list (clamped to what it allows)
  const u = m.unit, cl = (v, r) => { const lo = num(r && r.min), hi = num(r && r.max); v = num(v) || lo || 1; if (lo != null) v = Math.max(lo, v); if (hi != null) v = Math.min(hi, v); return v; };
  const o = { pin: '', zone: null };
  if (u === 'fixed') o.size = ((m.sizes || [])[0] || {}).label;
  else if (u === 'seat') o.n = num(m.n && m.n.min);
  else {
    const c = CAT[it.cat], len0 = it.pw != null ? it.pw : it.w, dep = c.kind === 'wall' || c.kind === 'edge' ? it.h : it.d;
    const rL = u === 'face' ? m.w : m.l, mx = num(rL && rL.max), n = mx && len0 > mx ? Math.ceil(len0 / mx - 0.001) : 1, len = Math.round(len0 / n * 2) / 2;   // 193c: longer than one piece → equal pieces
    o._n = n;
    if (u === 'area') { o.l = cl(len, m.l); o.w = cl(dep, m.w); }
    else if (u === 'length') o.l = cl(len, m.l);
    else if (u === 'face') { o.w = cl(len, m.w); }
    const hs = (m.h && m.h.options) || []; if (hs.length) { const tgt = it.h || num(hs[0]); o.h = num(hs.slice().sort((a, b) => Math.abs(num(a) - tgt) - Math.abs(num(b) - tgt))[0]); }
    else if (u === 'face') o.h = cl(it.h, m.h);
  }
  o.groups = {}; (m.groups || []).forEach(g => { const op = (g.options || []).slice().sort((a, b) => ((num(a.fixed) || 0) + (num(a.rate) || 0)) - ((num(b.fixed) || 0) + (num(b.rate) || 0)))[0]; if (op) o.groups[g.name] = op.name; });
  return o;
}
const PC = {};
function priceAt(id, it) {   // one design at this item's size: its cheapest material → { price, o } (o goes to the cart as is)
  const p = PR()[id]; if (!p || !p.cz || !window.mtoPrice) return null; const m = p.cz; let best = null;
  if (m.unit === 'cabin') { let o = {};
    if (it.layout && (it.lsku || it.sku) === id) o = { layout: JSON.parse(JSON.stringify(it.layout)) };
    else if (it.layout && window.mtoCabinSize) { const r = window.mtoCabinSize(id, null, it.layout.L, it.layout.W); if (r && r.lay) o = { layout: r.lay }; }
    let q = null;   // (another cabin above: priced at the same size)
    try { q = window.mtoPrice(m, o); } catch (e) {} return q && q.ok ? { price: q.product, o } : null; }
  if (it.cfg && it.cfgId === id) {   // 193g: set up in the designer — its own finish / colour / roof / add-ons, at the plan's size
    const base = oFor(m, it), n = base._n || 1, o = Object.assign({}, base, JSON.parse(JSON.stringify(it.cfg))); delete o._n; delete o.layout;
    if (['area', 'length', 'face'].includes(m.unit)) ['l', 'w', 'h'].forEach(k => { if (base[k] != null) o[k] = base[k]; });   // the size stays the plan's
    const hg = (m.groups || []).find(g => /height/i.test(g.name || '')); if (hg && it.h) { const op = (hg.options || []).slice().sort((a, b) => Math.abs(parseFloat(a.name) - it.h) - Math.abs(parseFloat(b.name) - it.h))[0]; if (op) o.groups = Object.assign({}, o.groups, { [hg.name]: op.name }); }
    let q = null; try { q = window.mtoPrice(m, o); } catch (e) {} if (q && q.ok) return { price: q.product * n, o, n, own: true };
  }
  const mats = (m.materials || []).length ? m.materials : [{ name: '' }];
  for (const mt of mats.slice(0, 8)) { const o = Object.assign(oFor(m, it), { material: mt.name, colour: ((mt.colours || [])[0] || {}).name || '', addons: (m.addons || []).filter(a => a.on).map(a => a.name) });
    const n = o._n || 1; delete o._n; let q = null; try { q = window.mtoPrice(m, o); } catch (e) {} if (q && q.ok && (!best || q.product * n < best.price)) best = { price: q.product * n, o, n }; }
  return best;
}
function choices(it) {   // the designs the customer can pick for this item, cheapest first
  const c = CAT[it.cat]; if (!c) return []; const P = PR();
  return designs(c).filter(id => P[id].oo !== false && (c.k !== 'cabin' || (P[id].cz || {}).cabin)).map(id => ({ id, q: priceAt(id, it) })).filter(x => x.q).sort((a, b) => a.q.price - b.q.price);
}
// 193h: a design's real size (fixed-size designs: from the size label, e.g. "60 × 60 × 85 cm", "450 cube", "3 ft"; benches: by seats)
function labelDims(lbl) {
  const s = String(lbl || ''), u = /cm/i.test(s) ? 1 / 30.48 : /mm/i.test(s) ? 1 / 304.8 : /\bin(ch)?\b|"/i.test(s) ? 1 / 12 : /ft|feet|'/i.test(s) ? 1 : 0;
  const nums = (s.match(/\d+(\.\d+)?/g) || []).map(Number); if (!nums.length) return null;
  const k = u || (nums[0] > 200 ? 1 / 304.8 : nums[0] > 20 ? 1 / 30.48 : 1), ft = v => Math.round(v * k * 2) / 2;
  if (/cube/i.test(s)) return { w: ft(nums[0]), d: ft(nums[0]), h: ft(nums[0]) };
  if (/[×x]/.test(s) && nums.length >= 2) return { w: ft(nums[0]), d: ft(nums[1]), h: nums[2] ? ft(nums[2]) : null };
  if (/ft/i.test(s) && nums.length === 1) return { h: nums[0] };   // a sculpture's height
  return null;
}
function realSize(it, id, o) {   // the model takes the picked design's own size (when the design gives one and it fits)
  const p = PR()[id], m = p && p.cz; if (!m || it.cat === 'cabin' || it.cat === 'pergola') return; const keep = JSON.stringify(it), i = S.items.indexOf(it);
  if (m.unit === 'fixed') { const lbl = (o && o.size) || ((m.sizes || [])[0] || {}).label, d = labelDims(lbl); if (!d) return;
    if (d.w && d.d && d.w >= 0.5 && d.d >= 0.5) { it.w = Math.max(d.w, 1); it.d = Math.max(d.d, 1); } if (d.h) it.h = d.h; }
  else if (m.unit === 'seat') { const n = num(o && o.n) || num(m.n && m.n.min) || 4; it.w = Math.max(3, Math.round(n * 1.8 * 2) / 2); }
  else return;
  if (!settle(it, i)) { Object.assign(it, JSON.parse(keep)); S.msg = 'Its real size doesn\'t fit there — move things to make room'; }
}
function custSheet() {   // customise one design: finish, colour, options, add-ons, size choice — priced live; "Use in my plan"
  const C2 = S.cust, it = S.items[C2.i], p = PR()[C2.id], m = p.cz, o = C2.o, base = oFor(m, it), n = base._n || 1;
  const chip = (attr, on, txt) => `<button type="button" ${attr} class="${on ? 'on' : ''}" aria-pressed="${!!on}">${txt}</button>`;
  let q = null; try { const oo = Object.assign({}, o); if (['area', 'length', 'face'].includes(m.unit)) ['l', 'w', 'h'].forEach(k => { if (base[k] != null) oo[k] = base[k]; }); delete oo._n; q = window.mtoPrice(m, oo); } catch (e) {}
  let h = `<div class="pl-ed"><div style="display:flex;gap:10px;align-items:center">${IMG(C2.id) ? `<img src="${esc(IMG(C2.id))}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:10px">` : ''}<h4 style="margin:0">${esc(String(p.n).replace(/ — .*$/, ''))}</h4></div>`;
  if (m.unit === 'fixed' && (m.sizes || []).length > 1) h += '<p class="pl-h">Size</p><div class="pl-tabs">' + m.sizes.map(z => chip(`data-pl="cs:size:${esc(z.label)}"`, o.size === z.label, esc(z.label))).join('') + '</div>';
  else if (m.unit === 'seat') h += `<p class="pl-h">Seats</p><div class="pl-pm"><button type="button" data-pl="cs:n:-1">−</button><b>${o.n}</b><button type="button" data-pl="cs:n:1">+</button></div>`;
  else if (['area', 'length', 'face'].includes(m.unit)) h += `<p class="pl-sub" style="margin:8px 0 0">Size from your plan: ${it.w}${CAT[it.cat].size === 'wh' ? ' × ' + it.h : CAT[it.cat].size === 'wd' ? ' × ' + it.d : ''} ft${n > 1 ? ' — as ' + n + ' pieces' : ''} (change it in step 2)</p>`;
  const mats = (m.materials || []).filter(z => z.name), mt = mats.find(z => z.name === o.material) || mats[0];
  if (mats.length > 1) h += `<p class="pl-h">${esc((m.labels && m.labels.material) || 'Finish')}</p><div class="pl-tabs">` + mats.map(z => chip(`data-pl="cs:mat:${esc(z.name)}"`, z === mt, esc(z.name))).join('') + '</div>';
  const cols = (mt && mt.colours) || [];
  if (cols.length) h += `<p class="pl-h">${esc((m.labels && m.labels.colour) || 'Colour')} · ${esc(o.colour || '')}</p><div class="pl-tabs">` + cols.map(c => `<button type="button" data-pl="cs:col:${esc(c.name)}" class="pl-sw${c.name === o.colour ? ' on' : ''}" title="${esc(c.name)}" aria-label="${esc(c.name)}" style="background:${c.hex2 ? 'linear-gradient(135deg,' + c.hex + ' 50%,' + c.hex2 + ' 50%)' : c.hex || '#999'}"></button>`).join('') + '</div>';
  (m.groups || []).filter(g => g.name && (g.options || []).length).forEach(g => { h += `<p class="pl-h">${esc(g.name)}</p><div class="pl-tabs">` + g.options.filter(z => z.name).map(z => chip(`data-pl="cs:grp:${esc(g.name)}::${esc(z.name)}"`, (o.groups || {})[g.name] === z.name, esc(z.name))).join('') + '</div>'; });
  const adds = (m.addons || []).filter(a => a.name); if (adds.length) h += '<p class="pl-h">Add-ons</p><div class="pl-tabs">' + adds.map(a => chip(`data-pl="cs:add:${esc(a.name)}"`, (o.addons || []).includes(a.name), ((o.addons || []).includes(a.name) ? '✓ ' : '+ ') + esc(a.name))).join('') + '</div>';
  h += `<p style="margin:14px 0 0;font-size:15px">${q && q.ok ? 'Price <b>' + rs(q.product * n) + '</b>' : esc((q && q.error) || 'Our team will price it')}</p>`;
  h += '<div class="pl-act"><button type="button" data-pl="cs:cancel">Cancel</button><button type="button" data-pl="cs:use" style="margin-left:auto;background:#2E2E2E;color:#fff;border:0">Use in my plan</button></div></div>';
  return h;
}
function picked(it) { const ch = choices(it); return ch.find(x => x.id === it.pick) || (it.cat === 'cabin' && ch.find(x => x.id === it.sku)) || ch[0] || null; }
const IMG = id => { try { const x = PR()[id]; return (typeof IMGS !== 'undefined' ? IMGS : window.IMGS || {})[x.img] || ''; } catch (e) { return ''; } };
function fromPrice(it) {   // cheapest orderable design of the category at this size: { price, n, soon }
  const c = CAT[it.cat]; if (!c) return null; const k = [it.cat, it.w, it.d, it.h, it.pw || '', it.sku || '', it.cfgId || '', JSON.stringify(it.cfg || '')].join('|'); if (PC[k]) return PC[k];
  if (it.cfg && it.cfgId && c.k !== 'cabin') { const q = priceAt(it.cfgId, it); if (q) return (PC[k] = { price: q.price, n: designs(c).length, soon: false, own: true }); }
  const ids = designs(c), P = PR(); let best = null, open = 0;
  for (const id of ids) {
    const p = P[id], m = p.cz; if (p.oo === false) continue; open++;
    if (c.k === 'cabin') { if (it.sku && id !== it.sku) continue; const q = priceAt(id, it); if (q && (best == null || q.price < best)) best = q.price; continue; }
    for (const mt of (m.materials || []).slice(0, 6)) { const o = Object.assign(oFor(m, it), { material: mt.name }), n = o._n || 1; delete o._n; let q = null; try { q = window.mtoPrice(m, o); } catch (e) {} if (q && q.ok && (best == null || q.product * n < best)) best = q.product * n; }
  }
  return (PC[k] = { price: best, n: ids.length, soon: !open });
}
const priceOk = () => !!(window.mtoOk && window.mtoOk());

// ---------------------------------------------------------------- adding / editing
function cabinSkus() { return designs(CAT.cabin).filter(id => (PR()[id].cz || {}).cabin); }
function cabinCfg(it) { return ((PR()[it.sku] || {}).cz || {}).cabin; }
function cabinFoot(it) {   // the cabin's plot footprint = body + its plinth (0.3 ft) + pergola projections on the sides it has them; it.ex = per side (cabin's own frame)
  const L = cabinLay(it), c = cabinCfg(it) || {}, dep = num(c.proj && c.proj.depth) || 1.5, pj = L.proj && Array.isArray(L.proj.sides) ? L.proj.sides : [];
  const e = { l: 0.3, r: 0.3, b: 0.3, f: 0.3 }; pj.forEach(sd => { const k = { left: 'l', right: 'r', back: 'b', front: 'f' }[sd]; if (k) e[k] = Math.max(e[k], dep); });
  it.ex = e; it.w = (num(L.L) || 12) + e.l + e.r; it.d = (num(L.W) || 10) + e.b + e.f;
}
function cabinLay(it) { const c = cabinCfg(it); return (it.layout && (!it.lsku || it.lsku === it.sku) ? it.layout : null) || (c && c.layout) || {}; }
function newItem(k) {
  const c = CAT[k], t = S.site, it = { cat: k, rot: 0, w: c.w || 4, d: c.d || 4, h: c.h || 3, label: c.t };
  if (k === 'cabin') { const sk = cabinSkus().find(s => /PORTA/.test(s)) || cabinSkus()[0]; if (!sk) return null; it.sku = sk; cabinFoot(it); it.h = 10; it.label = PR()[sk].n.replace(/ —.*$/, ''); }
  it.x = r2((t.pw - it.w) / 2); it.z = r2(t.pd * 0.55 - it.d / 2); return it;
}
function roomy(it, i) {   // a free spot away from what's already there (so a setup spreads out instead of piling up)
  const t = S.site, p = P0(), f = foot(it), others = S.items.filter((o, j) => j !== i && !att(o)).map(o => { const g = foot(o); return [o.x + g[0] / 2, o.z + g[1] / 2]; }).concat((t.kind === 'terrace' ? t.blocks : []).map(b => [b.x + b.w / 2, b.z + b.d / 2]));
  let best = null;
  for (let x = p; x <= t.pw - p - f[0] + 0.01; x += 1) for (let z = p; z <= t.pd - p - f[1] + 0.01; z += 1) {
    it.x = r2(x); it.z = r2(z); if (clashes(it, i)) continue; const cx = x + f[0] / 2, cz = z + f[1] / 2;
    const dmin = others.length ? Math.min(...others.map(o => Math.hypot(o[0] - cx, o[1] - cz))) : 0, score = Math.min(dmin, 14) - Math.hypot(cx - t.pw / 2, cz - t.pd / 2) * 0.08;
    if (!best || score > best[0]) best = [score, it.x, it.z];
  }
  if (best) { it.x = best[1]; it.z = best[2]; } return !!best;
}
function wallSpot(it, i) {   // a new panel goes against the parapet, at the free spot farthest from other things
  const t = S.site, p = P0(), others = S.items.filter((o, j) => j !== i && !att(o)).map(o => { const g = foot(o); return [o.x + g[0] / 2, o.z + g[1] / 2]; }); let best = null;
  for (const sd of ['back', 'left', 'right', 'front']) { const run = sd === 'back' || sd === 'front' ? t.pw : t.pd;
    for (let u = p; u <= run - p - it.w + 0.01; u += 1) {
      if (sd === 'back' || sd === 'front') { it.rot = sd === 'back' ? 0 : 180; it.x = r2(u); it.z = sd === 'back' ? p : t.pd - p - it.d; } else { it.rot = sd === 'left' ? 270 : 90; it.z = r2(u); it.x = sd === 'left' ? p : t.pw - p - it.d; }
      if (clashes(it, i)) continue; const f = foot(it), cx = it.x + f[0] / 2, cz = it.z + f[1] / 2, dmin = others.length ? Math.min(...others.map(o => Math.hypot(o[0] - cx, o[1] - cz))) : 99;
      const sc = Math.min(dmin, 20) + (sd === 'back' ? 0.5 : 0); if (!best || sc > best[0]) best = [sc, it.x, it.z, it.rot]; } }
  if (best) { it.x = best[1]; it.z = best[2]; it.rot = best[3]; }
}
function addItem(k) {
  const it = newItem(k); if (!it) return; const i = S.items.length; S.items.push(it);
  if (CAT[k].kind === 'wall') wallSpot(it, i); else if (CAT[k].kind !== 'edge' && i > 0) roomy(it, i);
  if (!settle(it, i)) { S.items.pop(); S.msg = 'No free room for it — make the space bigger or move things'; return; }
  S.sel = i; S.msg = '';
}
function cabinSize(it, L, W) {   // the cabin's own length × width (the studio's resize); its plot footprint follows
  if (!window.mtoCabinSize) return; const keep = JSON.stringify(it), i = S.items.indexOf(it), f0 = foot(it), cx = it.x + f0[0] / 2, cz = it.z + f0[1] / 2;
  const r = window.mtoCabinSize(it.sku, cabinLay(it), L, W); if (!r || !r.lay) return;
  it.layout = r.lay; it.lsku = it.sku; cabinFoot(it); const f1 = foot(it); it.x = r2(cx - f1[0] / 2); it.z = r2(cz - f1[1] / 2);
  if (!settle(it, i, [it.x, it.z])) { Object.assign(it, JSON.parse(keep)); S.msg = 'No room for it that size here'; }
}
function resizeItem(it, key, d, abs) {
  if (abs != null) { const cur = key === 'w' ? it.w : key === 'd' ? it.d : it.h; d = abs - cur; }
  const c = CAT[it.cat], lo = c.min || [1, 1], hi = c.max || [80, 80], keep = JSON.stringify(it), i = S.items.indexOf(it);
  if (key === 'w') it.w = Math.max(lo[0], Math.min(hi[0], r2(it.w + d))); else if (key === 'd') it.d = Math.max(lo[1], Math.min(hi[1], r2(it.d + d))); else if (key === 'h') { const hr = c.hr || [2, 12]; it.h = Math.max(hr[0], Math.min(hr[1], r2(it.h + d))); }
  if (!settle(it, i)) { Object.assign(it, JSON.parse(keep)); S.msg = 'No room for it that size here'; }
}

// ---------------------------------------------------------------- UI
const CSS = `#plOv{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;position:fixed;inset:0;z-index:9000;background:#F6F1EA;display:flex;flex-direction:column;font-family:Inter,Poppins,system-ui,sans-serif;color:#2E2E2E}
#plOv .pl-hd{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #E2D6C4;background:#fff}#plOv .pl-hd h2{margin:0;font-size:16px}#plOv .pl-hd small{color:#7A7268}
#plOv .pl-x{margin-left:8px;border:0;background:#F3ECE2;width:38px;height:38px;border-radius:50%;font-size:18px;cursor:pointer}
#plOv .pl-st{display:flex;gap:6px}#plOv .pl-st button{border:1px solid #E2D6C4;background:#fff;border-radius:99px;padding:7px 14px;font:inherit;font-size:13px;cursor:pointer}#plOv .pl-st button.on{background:#C26445;color:#fff;border-color:#C26445;font-weight:700}
#plOv .pl-bd{flex:1;display:flex;min-height:0}#plOv .pl-3d{flex:1;position:relative;min-width:0;background:#E9ECE4}#plOv #pl3d{position:absolute;inset:0}
#plOv .pl-side{width:380px;max-width:42vw;background:#fff;border-left:1px solid #E2D6C4;display:flex;flex-direction:column;min-height:0}#plOv .pl-pn{flex:1;overflow:auto;padding:16px}
#plOv .pl-ft{border-top:1px solid #E2D6C4;padding:12px 16px;display:flex;align-items:center;gap:10px}#plOv .pl-tot b{display:block;font-size:20px}#plOv .pl-tot small{color:#7A7268;font-size:11.5px}
#plOv .pl-go{margin-left:auto;background:#2E2E2E;color:#fff;border:0;border-radius:12px;padding:12px 18px;font:inherit;font-weight:700;cursor:pointer}
#plOv h4{margin:0 0 4px;font-size:17px}#plOv .pl-sub{color:#6A6258;font-size:13px;margin:0 0 12px}#plOv .pl-h{margin:16px 0 8px;font-size:13px;font-weight:700}
#plOv .pl-tabs{display:flex;gap:8px;flex-wrap:wrap}#plOv .pl-tabs button{border:1px solid #E2D6C4;background:#fff;border-radius:99px;padding:8px 14px;min-height:38px;font:inherit;font-size:13px;cursor:pointer}#plOv .pl-tabs button.on{border:2px solid #C26445;font-weight:700}
#plOv .pl-row{display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin:8px 0}#plOv .pl-n{display:flex;flex-direction:column;font-size:11px;color:#6A6258;gap:3px}#plOv .pl-n input{width:76px;height:36px;border:1px solid #D9CDBB;border-radius:8px;padding:0 8px;font:inherit}
#plOv .pl-etabs{display:flex;gap:4px;background:#F3EDE4;border-radius:12px;padding:4px;margin:8px 0 10px}#plOv .pl-etabs button{flex:1;border:0;background:none;border-radius:9px;padding:8px 6px;font:600 12.5px inherit;font-family:inherit;color:#6A6258;cursor:pointer}#plOv .pl-etabs button.on{background:#fff;color:#2E2E2E;box-shadow:0 1px 3px rgba(0,0,0,.08)}#plOv .pl-epane{min-height:60px}
#plOv .pl-qh{display:flex;align-items:center;gap:10px;margin:0 0 10px;font-size:11.5px;color:#7A7268;font-weight:600}#plOv .pl-qh i{display:flex;gap:4px;flex:1}#plOv .pl-qh i b{width:18px;height:4px;border-radius:2px;background:#E2D6C4}#plOv .pl-qh i b.on{background:#C26445}#plOv .pl-qh i b.dn{background:#B9C4AE}#plOv .pl-qh .pl-tsq{margin:0}#plOv .pl-col{flex-direction:column;align-items:stretch}#plOv .pl-col button,#plOv .pl-big button{text-align:left;padding:12px 14px;font-size:14px}
#plOv .pl-rq{border:1.5px solid #E7DDCF;border-radius:14px;margin:0 0 8px;background:#fff}#plOv .pl-rq.on{border-color:#C26445;background:#FFF8F2}#plOv .pl-rqh{display:flex;align-items:center;gap:10px;width:100%;border:0;background:none;padding:10px 12px;text-align:left;cursor:pointer;font-family:inherit}#plOv .pl-rqh i{font-style:normal;font-size:22px}#plOv .pl-rqh span{flex:1}#plOv .pl-rqh b{display:block;font-size:14px;color:#2E2E2E}#plOv .pl-rqh small{color:#7A7268;font-size:11.5px}#plOv .pl-rqh em{font-style:normal;font-weight:700;color:#C26445;font-size:18px}
#plOv .pl-rq .pl-pm{padding:0 12px}#plOv .pl-wh{display:flex;flex-direction:column;gap:6px;padding:0 12px 12px}#plOv .pl-wh button{border:1px solid #E2D6C4;background:#fff;border-radius:10px;padding:8px 10px;text-align:left;font:600 13px inherit;font-family:inherit;cursor:pointer;color:#2E2E2E}#plOv .pl-wh button.on{border:2px solid #C26445}#plOv .pl-wh small{display:block;font-weight:500;color:#55634A;font-size:11.5px}#plOv .pl-bgo{position:sticky;bottom:-16px;background:#fff;padding:10px 0;display:flex;gap:10px;align-items:center}#plOv .pl-bgo .pl-tsq{margin:0}
#plOv .pl-setg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));overflow:visible}#plOv .pl-setg button{flex:none}#plOv .pl-els{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}#plOv .pl-els button{display:flex;flex-direction:column;align-items:center;gap:1px;border:1.5px solid #E2D6C4;background:#fff;border-radius:12px;padding:8px 4px;cursor:pointer;font-family:inherit}#plOv .pl-els i{font-style:normal;font-size:20px}#plOv .pl-els b{font-size:12px;color:#2E2E2E}#plOv .pl-els small{font-size:10.5px;color:#7A7268}#plOv .pl-els button.on{border-color:#C26445;background:#FFF8F3;box-shadow:0 0 0 2px #C2644533}#plOv .pl-set button.on{border-color:#C26445;background:#FFF8F3;box-shadow:0 0 0 2px #C2644533}#plOv .pl-tpls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0 0}#plOv .pl-tpl{display:flex;flex-direction:column;align-items:center;gap:2px;border:1.5px solid #E2D6C4;background:#fff;border-radius:12px;padding:8px 6px;cursor:pointer;font-family:inherit;text-align:center}#plOv .pl-tpl svg{max-width:100%;height:auto}#plOv .pl-tpl b{font-size:12.5px;color:#2E2E2E}#plOv .pl-tpl small{font-size:11px;color:#7A7268}#plOv .pl-tpl.on{border-color:#C26445;box-shadow:0 0 0 2px #C2644533;background:#FFF8F3}#plOv .pl-full{display:block;width:100%;text-align:left;border:1px dashed #C9B9A2;background:#FFFCF8;border-radius:12px;padding:10px 12px;font:700 13px inherit;font-family:inherit;color:#2E2E2E;cursor:pointer}#plOv .pl-full small{display:block;font-weight:500;font-size:11.5px;color:#7A7268;margin-top:2px}#plOv .pl-tsq{border:0;background:none;color:#8a3a1f;font:700 12.5px inherit;font-family:inherit;cursor:pointer;padding:0;margin:10px 0 0}
#plOv .pl-blk{border:1px solid #E7DDCF;border-radius:12px;padding:10px;margin:0 0 8px;background:#FFFCF8;display:flex;align-items:center;gap:8px;flex-wrap:wrap}#plOv .pl-blk b{flex:1;font-size:13.5px}
#plOv .pl-xx{border:0;background:none;color:#B3261E;font-size:16px;cursor:pointer}
#plOv .pl-pal{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}#plOv .pl-pal button{border:1px solid #E2D6C4;background:#fff;border-radius:12px;padding:10px;text-align:left;cursor:pointer;font:inherit;display:flex;gap:8px;align-items:center}
#plOv .pl-pal button:hover{border-color:#C26445}#plOv .pl-pal i{font-style:normal;font-size:22px}#plOv .pl-pal b{display:block;font-size:13px}#plOv .pl-pal small{color:#7A7268;font-size:11.5px}
#plOv .pl-it{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #F0E8DC;font-size:13px;cursor:pointer}#plOv .pl-it span{flex:1}#plOv .pl-it em{font-style:normal;color:#6A6258}
#plOv .pl-ed{border:2px solid #C26445;border-radius:14px;padding:12px;background:#FFF8F2}#plOv .pl-pm{display:flex;align-items:center;gap:6px;margin:6px 0}#plOv .pl-pm span{min-width:110px;font-size:13px}#plOv .pl-pm b{min-width:56px;text-align:center}
#plOv input{-webkit-user-select:text;user-select:text}#plOv .pl-sz{display:flex;align-items:center;gap:4px;font-size:12px;color:#6A6258}#plOv .pl-sz input{width:62px;height:34px;border:1px solid #C9BBA6;border-radius:8px;text-align:center;font:inherit;font-size:14px;font-weight:700}
#plOv .pl-pm button{width:34px;height:34px;border-radius:50%;border:1px solid #C9BBA6;background:#fff;font-size:18px;cursor:pointer}
#plOv .pl-act{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}#plOv .pl-act button{border:1px solid #E2D6C4;background:#fff;border-radius:10px;padding:8px 12px;font:inherit;font-size:13px;cursor:pointer}
#plOv .pl-msg{background:#FFF4E5;border:1px solid #F1D3A8;border-radius:10px;padding:8px 10px;font-size:12.5px;margin:8px 0}#plOv .pl-note{background:#EEF3E8;border:1px solid #D3DEC5;border-radius:10px;padding:8px 10px;font-size:12.5px;margin:8px 0}
#plOv .pl-z{position:absolute;right:10px;top:10px;display:flex;flex-direction:column;gap:6px;z-index:2}#plOv .pl-z button{border:0;background:rgba(255,255,255,.95);width:40px;height:40px;border-radius:10px;font-size:18px;font-weight:700;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.15)}
#plOv .pl-z button[disabled]{opacity:.35;cursor:default}#plOv .pl-z button.on{background:#C26445;color:#fff}
#plOv .pl-pk{border:1px solid #E7DDCF;border-radius:14px;padding:10px;margin:0 0 10px}#plOv .pl-pkh{display:flex;justify-content:space-between;font-size:14px;margin-bottom:8px}
#plOv .pl-row2{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scroll-snap-type:x mandatory}#plOv .pl-ds{flex:0 0 112px;scroll-snap-align:start;border:1px solid #E2D6C4;background:#fff;border-radius:10px;padding:5px;text-align:left;font:inherit;cursor:pointer}
#plOv .pl-ds.on{border:2px solid #C26445;padding:4px}#plOv .pl-ds img,#plOv .pl-ds i{display:block;width:100%;height:72px;object-fit:cover;border-radius:7px;background:#F3ECE2}#plOv .pl-ds b{display:block;font-size:11.5px;line-height:1.25;margin:5px 0 2px;max-height:2.5em;overflow:hidden}#plOv .pl-ds small{font-size:12px;color:#55634A;font-weight:700}
#plOv .pl-see{display:inline-block;margin-top:6px;font-size:12.5px;color:#C26445}#plOv .pl-go[disabled]{opacity:.4}
#plOv .pl-set{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px}#plOv .pl-set button{flex:0 0 138px;border:1px solid #E2D6C4;background:#FFFCF8;border-radius:12px;padding:10px;text-align:left;font:inherit;cursor:pointer}#plOv .pl-set button:hover{border-color:#C26445}#plOv .pl-set i{font-style:normal;font-size:20px}#plOv .pl-set b{display:block;font-size:13px;margin:4px 0 2px}#plOv .pl-set small{font-size:11px;color:#7A7268;line-height:1.3;display:block}
#plOv .pl-ask{display:grid;gap:8px;margin-top:8px}#plOv .pl-ask button{border:1px solid #E2D6C4;background:#fff;border-radius:12px;padding:12px;text-align:left;font:inherit;cursor:pointer}#plOv .pl-ask button:hover{border-color:#C26445}#plOv .pl-ask b{display:block;font-size:14px}#plOv .pl-ask small{color:#6A6258;font-size:12px}
#plOv .pl-design{display:block;width:100%;text-align:left;border:1.5px solid #C26445;background:#fff;color:#8a3a1f;border-radius:12px;padding:10px 12px;font:inherit;font-weight:700;font-size:13.5px;cursor:pointer;margin:8px 0}#plOv .pl-design small{display:block;font-weight:500;color:#6A6258;font-size:11.5px;margin-top:2px}
#plOv .pl-cust{display:inline-block;margin:6px 8px 0 0;border:1px solid #C26445;background:#FFF8F2;color:#8a3a1f;border-radius:99px;padding:6px 12px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer}#plOv .pl-sw{width:30px;height:30px;border-radius:50%!important;padding:0!important;border:2px solid #fff!important;box-shadow:0 0 0 1px #ccc;min-height:0!important}#plOv .pl-sw.on{box-shadow:0 0 0 2px #C26445}
#plOv .pl-sv{display:flex;align-items:center;gap:6px;font-size:12px;color:#55634A;margin-left:auto;max-width:34vw;overflow:hidden;white-space:nowrap}#plOv .pl-sv span{overflow:hidden;text-overflow:ellipsis}#plOv .pl-sv button{border:1px solid #E2D6C4;background:#fff;border-radius:99px;padding:4px 9px;font:inherit;font-size:11.5px;cursor:pointer;white-space:nowrap}
#plOv .pl-gate{border:2px solid #C26445;border-radius:16px;padding:18px;background:#FFF8F2}#plOv .pl-gate b{font-size:18px}#plOv .pl-gate p{font-size:13.5px;color:#4A4640;margin:8px 0 14px}#plOv .pl-gate small{display:block;margin-top:8px;color:#7A7268}#plOv .pl-gate .pl-go{margin:0;width:100%}
#plOv.pl-locked .pl-3d{filter:blur(2px);pointer-events:none}#plOv.pl-locked .pl-ft{display:none}
#plOv .pl-est{border:1px solid #E7DDCF;border-radius:14px;padding:12px;margin:6px 0 10px;background:#FFFCF8}
#plOv .pl-lock{border:1px solid #E2D6C4;background:#fff;border-radius:10px;padding:8px 12px;font:inherit;font-size:12.5px;cursor:pointer}
@media(max-width:760px){#plOv .pl-sv{display:none}#plOv .pl-bd{flex-direction:column}#plOv .pl-3d{flex:none;height:46vh}#plOv .pl-side{width:auto;max-width:none;border-left:0;border-top:1px solid #E2D6C4;flex:1}#plOv .pl-st button{padding:6px 10px;font-size:12px}#plOv .pl-hd small{display:none}#plOv .pl-l{display:none}#plOv .pl-hd h2{font-size:14px}}`;

function shell() {
  if (EL) return; const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  EL = document.createElement('div'); EL.id = 'plOv'; EL.setAttribute('role', 'dialog'); EL.setAttribute('aria-label', 'Plan your space');
  EL.innerHTML = '<div class="pl-hd"><div><h2>Plan your space</h2><small>Set up your terrace or lawn, then place what you\'d like on it</small></div><div class="pl-sv" id="plSv"></div><div class="pl-st" id="plSt"></div><button type="button" class="pl-x" data-pl="close" aria-label="Close">✕</button></div>' +
    '<div class="pl-bd"><div class="pl-3d"><div id="pl3d"></div><div class="pl-z" id="plZ"></div></div><div class="pl-side"><div class="pl-pn" id="plPn"></div><div class="pl-ft" id="plFt"></div></div></div>';
  document.body.appendChild(EL);
  EL.addEventListener('click', onClick); EL.addEventListener('change', onInput);
  document.addEventListener('keydown', e => { if (!EL || EL.style.display === 'none' || !(e.ctrlKey || e.metaKey) || /input|textarea|select/i.test((e.target && e.target.tagName) || '')) return; const k = String(e.key).toLowerCase(); if (k === 'z' || k === 'y') { e.preventDefault(); undo(k === 'y' || e.shiftKey ? 1 : -1); } });
  S3.onEvent(on3d);
}
function btn(attr, on, txt) { return `<button type="button" ${attr} class="${on ? 'on' : ''}" aria-pressed="${!!on}">${txt}</button>`; }
function nIn(key, val, lbl, min, max) { return `<label class="pl-n"><span>${lbl}</span><input type="number" inputmode="decimal" min="${min}" max="${max}" step="0.5" data-plin="${key}" value="${val}"></label>`; }

// 202: one kind of question at a time (Space → Road → Staircase room; Detailed: Space → Roads → Boundary wall → Corners → On the roof)
function siteSecs() {
  const t = S.site, terr = t.kind === 'terrace', full = window.tsFull ? window.tsFull() : true, sm = s0 => `<small style="font-weight:400;color:#7A7268">${s0}</small>`, L = [];
  const kind = '<div class="pl-tabs pl-big pl-col">' + btn('data-pl="kind:terrace"', terr, '🏙 Terrace / rooftop') + btn('data-pl="kind:ground"', !terr, '🌳 Lawn / garden') + '</div>';
  L.push(['Terrace or lawn?', 'Where you are planning', kind]);
  if (terr) L.push(['How do you want to start?', 'Your terrace first — then what goes on it', '<div class="pl-tabs pl-big pl-col">' + btn('data-pl="start:tpl"', t.start !== 'own', '🏢 From a real terrace like mine<small style="display:block;font-weight:500;color:#7A7268;margin-top:2px">Answer a few questions — we show the closest of 70+ terraces we have built on, fitted to yours</small>') + btn('data-pl="start:own"', t.start === 'own', '✏️ Set it up myself<small style="display:block;font-weight:500;color:#7A7268;margin-top:2px">Plot size, road, staircase room and the rest, step by step</small>') + '</div>']);
  L.push(['Measure in', 'How you know your plot size', '<div class="pl-tabs pl-col">' + btn('data-pl="unit:yd"', AU() === 'yd', 'Square yards (gaj)') + btn('data-pl="unit:m"', AU() === 'm', 'Square metres') + '</div>']);
  L.push([terr ? 'How big is the plot?' : 'How big is the lawn?', full || !terr ? 'Pick one, or type the exact width and depth' : 'Roughly — close is enough', '<div class="pl-tabs">' + PLOTS.map(p => btn(`data-pl="plot:${p[0]}"`, t.plot === p[0], plotLab(p[0]))).join('') + '</div>' + (!terr || full ? '<div class="pl-row">' + nIn('pw', t.pw, 'Width (ft)', 12, 150) + nIn('pd', t.pd, 'Depth (ft)', 12, 200) + '</div>' : '')]);
  if (!terr) return L;
  const rq = t.road_back ? 'back' : t.corner || 'front', mu = t.blocks.find(b => b.type === 'mumty');
  if (!full) {
    L.push(['Where is the road?', 'The side facing the road is the front', '<div class="pl-tabs pl-col">' + [['front', 'In front'], ['left', 'Front + left (corner plot)'], ['right', 'Front + right (corner plot)'], ['back', 'Front + back']].map(([k, l]) => btn(`data-pl="qroad:${k}"`, rq === k, l)).join('') + '</div>']);
    L.push(['Staircase room (mumty)?', 'Standing at the road, looking in', '<div class="pl-tabs pl-col">' + [['left', 'On the left'], ['right', 'On the right'], ['back', 'At the back'], ['none', 'None on the roof']].map(([k, l]) => btn(`data-pl="qmumty:${k}"`, k === 'none' ? !mu : mu && mu.side === k, l)).join('') + '</div>' +
      '<p class="pl-sub" style="margin:14px 0 8px">We add the usual lift room, water tanks and 3 ft boundary wall — next you can set their sizes.</p>']);
    if (t.start !== 'own') L.push(tplSec());
    if (t.blocks.length) L.push(['Sizes of the rooms', 'Roughly — width × length × height in feet', t.blocks.map((b, i) => b.type === 'ac' ? '' : `<div class="pl-blk"><b>${esc((BLK[b.type] || BLK.room)[0])}</b>${nIn('bw:' + i, b.w, 'Width', 1, 40)}${nIn('bd:' + i, b.d, 'Length', 1, 40)}${nIn('bh:' + i, +b.h || BHD[b.type] || 9, 'Height', 2, 30)}</div>`).join('') +
      '<button type="button" class="pl-full" style="margin-top:12px" data-pl="tsmode:full">⚙ Detailed setup<small>more rooms, shafts, corner cuts, walls, exact plot size</small></button>']);
    else L[L.length - 1][2] += '<button type="button" class="pl-full" style="margin-top:12px" data-pl="tsmode:full">⚙ Detailed setup<small>lift, shafts, heights, corner cuts, exact sizes</small></button>';
    return L;
  }
  L.push(['Roads', 'Which sides of the plot face a road', '<p class="pl-h">Corner plot?</p><div class="pl-tabs">' + btn('data-pl="corner:"', !t.corner, 'No') + btn('data-pl="corner:left"', t.corner === 'left', 'Road on the left') + btn('data-pl="corner:right"', t.corner === 'right', 'Road on the right') + '</div>' +
    '<p class="pl-h">In front / at the back</p><div class="pl-tabs">' + btn('data-pl="rfront"', t.road_front !== false, (t.road_front !== false ? '✓ ' : '') + 'Road in front') + btn('data-pl="rback"', !!t.road_back, (t.road_back ? '✓ ' : '') + 'Road at the back') + '</div>']);
  L.push(['Boundary wall', 'The low wall round the roof (parapet)', '<div class="pl-tabs">' + btn('data-pl="par:3"', +t.par === 3, '3 ft') + btn('data-pl="par:4"', +t.par === 4, '4 ft') + '</div>']);
  const C = t.cuts || {};
  L.push(['Corners cut?', 'Front = the road side', CUTS.map(([k, lbl]) => { const c = C[k] || {}, on = c.type === 'notch' || c.type === 'slant';
    return `<div class="pl-blk"><b>${lbl}</b><div class="pl-tabs" style="gap:5px">${btn(`data-pl="cut:${k}:"`, !on, 'No cut')}${btn(`data-pl="cut:${k}:notch"`, c.type === 'notch', '⌐ Straight')}${btn(`data-pl="cut:${k}:slant"`, c.type === 'slant', '◸ Slant')}</div>` +
      (on ? `<div class="pl-row" style="width:100%;margin:2px 0 0">${nIn('ca:' + k, c.a, 'Across (ft)', 1, t.pw - 4)}${nIn('cb:' + k, c.b, 'Deep (ft)', 1, t.pd - 4)}</div>` : '') + '</div>'; }).join('')]);
  if (t.start !== 'own') L.push(tplSec());
  L.push(['Already on the roof', 'Drag them on the 3D — a wall picked keeps them on it', t.blocks.map((b, i) => `<div class="pl-blk"><b>${esc((BLK[b.type] || BLK.room)[0])}</b>${nIn('bw:' + i, b.w, 'Width', 1, 40)}${nIn('bd:' + i, b.d, 'Length', 1, 40)}${b.type !== 'ac' ? nIn('bh:' + i, +b.h || BHD[b.type] || 9, 'Height', 2, 30) : ''}<button type="button" class="pl-xx" data-pl="bdel:${i}" aria-label="Remove">✕</button><div class="pl-tabs" style="width:100%;gap:5px;margin:0">${[['left', 'Left wall'], ['right', 'Right wall'], ['back', 'Back wall'], ['front', 'Front wall'], ['free', 'Free']].map(([k2, l2]) => btn(`data-pl="bside:${i}:${k2}"`, (b.side || 'free') === k2, l2)).join('')}${btn(`data-pl="block:${i}"`, !!b.lock, b.lock ? '🔒 Locked' : '🔓 Lock')}</div></div>`).join('') +
    '<div class="pl-tabs">' + Object.keys(BLK).map(k => `<button type="button" data-pl="badd:${k}">+ ${esc(BLK[k][0].replace(/ \(.*\)/, '').replace('AC outdoor unit', 'AC unit'))}</button>`).join('') + '</div>']);
  return L;
}
// 216: the closest real terraces (as built, LifeWall zoning plans) for the answers so far — fitted live to the plot size and the staircase side
function tplSec() {
  const t = S.site, ms = TM.mumtySide(t), a = { pw: t.pw, pd: t.pd, mumty: ms === 'mid' || ms === 'front' ? 'back' : ms, lift: S.tplLift == null ? null : S.tplLift };
  let body = '<p class="pl-h">Lift room on the roof?</p><div class="pl-tabs">' + btn('data-pl="tlift:1"', S.tplLift === true, 'Yes') + btn('data-pl="tlift:0"', S.tplLift === false, 'No') + btn('data-pl="tlift:"', S.tplLift == null, 'Not sure') + '</div>';
  if (!TM.ready()) body += '<p class="pl-sub" style="margin-top:12px">Loading real terraces…</p>';
  else { const M = TM.match(a, 4);
    body += '<div class="pl-tpls">' + M.map(m => { const f = TM.fit(m.t, m.mir, t), id = m.t.id + (m.mir ? 'm' : ''), on = t.tpl === id;
      return `<button type="button" class="pl-tpl${on ? ' on' : ''}" data-pl="tpl:${m.t.id}:${m.mir ? 1 : 0}" aria-pressed="${on}">${TM.svg(f, 150, 118)}<b>${esc(m.t.city || 'Real terrace')}</b><small>${on ? '✓ Using this' : 'Was ' + Math.round(m.t.site.pw) + ' × ' + Math.round(m.t.site.pd) + ' ft' + (m.mir ? ', mirrored' : '')}</small></button>`; }).join('') + '</div>' +
      `<p class="pl-sub" style="margin:8px 0 0">${TM.LEGEND}</p><p class="pl-sub" style="margin:6px 0 0">Real terraces we have built on, fitted to your ${Math.round(t.pw)} × ${Math.round(t.pd)} ft plot. Pick the one closest to yours — you can move or resize everything after. Or skip and keep your own.</p>`;
    if (t.tpl) body += btn('data-pl="tpl:"', false, '↺ Back to my own setup');
  }
  return ['Closest real terraces', 'Like yours? Start from it', body];
}
function siteLast() { return (S.tsq || 0) >= siteSecs().length - 1; }
function stepSite() {
  const L = siteSecs(), full = window.tsFull ? window.tsFull() : true, n = L.length; S.tsq = Math.max(0, Math.min(n - 1, S.tsq || 0)); const [ti, sub, body] = L[S.tsq];
  let h = `<div class="pl-qh"><span>${S.tsq + 1} of ${n}</span><i>${L.map((x, i) => `<b class="${i === S.tsq ? 'on' : i < S.tsq ? 'dn' : ''}"></b>`).join('')}</i>${S.site.kind === 'terrace' && full ? '<button type="button" class="pl-tsq" data-pl="tsmode:quick">Quick setup</button>' : ''}</div>`;
  h += `<h4>${ti}</h4><p class="pl-sub">${sub}</p>` + body;
  if (S.tsq > 0) h += '<button type="button" class="pl-tsq" style="margin-top:14px" data-pl="tsq:-1">← Back</button>';
  if (S.msg) h += `<div class="pl-msg">${esc(S.msg)}</div>`;
  return h;
}
function stepPlace() {
  const lock = !priceOk(); let h = '';
  const sel = S.sel != null ? S.items[S.sel] : null;
  if (sel) {
    const c = CAT[sel.cat], fp = fromPrice(sel), pm = (k, lbl, v, ns) => `<div class="pl-pm"><span>${lbl}</span><button type="button" data-pl="${ns || 'rs'}:${k}:-1" aria-label="${lbl} smaller">−</button><label class="pl-sz"><input type="number" inputmode="decimal" step="${ns ? 1 : 0.5}" data-plin="${ns || 'rs'}:${k}" value="${v}" aria-label="${lbl} in feet"> ft</label><button type="button" data-pl="${ns || 'rs'}:${k}:1" aria-label="${lbl} bigger">+</button></div>`;
    h += `<div class="pl-ed"><h4>${esc(c.e)} ${esc(sel.label || c.t)}</h4>`; const T = { size: '', place: '', design: '' };   // 202: one kind at a time — Size · Place · Design tabs
    if (sel.cat === 'cabin') { const sk = cabinSkus(); T.size += '<div class="pl-tabs">' + sk.map(s => btn(`data-pl="csku:${s}"`, s === sel.sku, esc(PR()[s].n.replace(/ —.*$/, '').replace(/ \(.*$/, '')))).join('') + '</div>'; const L = cabinLay(sel); if (!sel.lock && L && L.walls && window.mtoCabinSize) { const lim = window.mtoCabinSize(sel.sku, L, L.L, L.W) || {}; T.size += pm('L', 'Length', num(L.L), 'cz') + pm('W', 'Width', num(L.W), 'cz') + `<p class="pl-sub" style="margin:2px 0 0">${lim.Lmin}–${lim.Lmax} × ${lim.Wmin}–${lim.Wmax} ft. Walls, doors, rooms and finishes: in its designer.</p>`; } }
    else if (c.size === 'fixed') T.size += `<p class="pl-sub">One standard size here — you'll pick the exact design at the end.</p>`;
    if (sel.lock) T.size += '<p class="pl-note" style="margin:6px 0">🔒 Locked — its size and place can\'t change by mistake.</p>';
    else if (c.size === 'wd') T.size += pm('w', 'Length', sel.w) + pm('d', 'Width', sel.d);
    if (!sel.lock && c.size === 'w') T.size += pm('w', 'Length', sel.w);
    if (sel.cat === 'privacy') T.size += '<p class="pl-h" style="margin-top:4px">Where does it go?</p><div class="pl-tabs">' + btn('data-pl="pmode:par"', sel.mode === 'par', S.site.kind === 'terrace' ? 'On the parapet' : 'On the boundary wall') + btn('data-pl="pmode:part"', !att(sel), 'As a partition') + (mumtyTanks() ? btn('data-pl="pmode:tank"', sel.mode === 'tank', 'Hide the water tanks') : '') + '</div>';
    if (sel.mode === 'par') T.size += '<p class="pl-h">On which parapets?</p><div class="pl-tabs">' + [['back', 'Back'], ['left', 'Left'], ['right', 'Right'], ['front', 'Front (road)']].map(([k2, l2]) => btn(`data-pl="pside:${k2}"`, (sel.sides || []).includes(k2), l2)).join('') + `</div><p class="pl-sub" style="margin:6px 0 0">${sel.w} ft in all — left open where a cabin, the mumty, a feature wall, a big partition or a fountain stands against it.</p>` + pm('h', 'Height above parapet', sel.h);
    else if (sel.mode === 'tank') T.size += `<p class="pl-sub" style="margin:6px 0 0">Round the tanks on the mumty roof — ${sel.w} ft.</p>` + pm('h', 'Height', sel.h);
    else if (!sel.lock && c.size === 'wh') T.size += pm('w', 'Length', sel.w) + pm('h', 'Height', sel.h);
    if (sel.cat !== 'cabin' && sel.cat !== 'pergola' && sel.cfgId && window.mtoPropFromPlan) T.design += `<button type="button" class="pl-design" data-pl="prop">📄 Proposal &amp; add to cart<small>${esc(sel.label || 'This design')} as set up here — price, drawings, delivery</small></button>`;   // 199
    if ((sel.cat === 'cabin' || sel.cat === 'pergola') && window.mtoFromPlan) T.design += `<button type="button" class="pl-design" data-pl="design">✎ ${sel.cfg ? 'Change it' : 'Customise it'} in the ${sel.cat === 'cabin' ? 'cabin' : 'pergola'} designer<small>${sel.cat === 'cabin' ? 'walls, doors, rooms, finishes' : 'finish, colour, roof, layout, add-ons'} — on this terrace; "Save to my plan" brings it back</small></button>`;
    if (sel.cat === 'pergola' && !sel.lock) { T.size += pm('h', 'Height', sel.h); T.design += `<label style="display:flex;gap:8px;align-items:center;font-size:13px;margin:6px 0"><input type="checkbox" data-pl="pdeck"${sel.deck ? ' checked' : ''}> Deck floor under it (as high as a porta cabin's)</label>` + (sel.att && sel.att.length ? '<p class="pl-sub" style="margin:2px 0 6px">Fixed to the wall on ' + sel.att.length + ' side' + (sel.att.length > 1 ? 's' : '') + ' — no posts there' + (sel.hAuto !== false && S.items.some(o => o.cat === 'cabin') ? '; height and deck matched to the cabin' : '') + '.</p>' : ''); }
    if (sel.cat === 'graffiti') T.size += `<label class="pl-ck" style="display:flex;gap:8px;align-items:center;font-size:13px;margin:6px 0"><input type="checkbox" data-pl="gfit"${sel.fit !== false ? ' checked' : ''}> Fit the whole wall it's on${sel.open ? ' (door left open)' : ''}</label>`;
    if (!att(sel) && c.kind !== 'edge' && !sel.lock) T.place += '<p class="pl-h" style="margin-top:6px">Against a wall? <small style="font-weight:400;color:#7A7268">it stays on it when moved</small></p><div class="pl-tabs">' + [['free', 'Free'], ['left', 'Left'], ['right', 'Right'], ['back', 'Back'], ['front', 'Front']].map(([k2, l2]) => btn(`data-pl="wside:${k2}"`, (sel.wside || 'free') === k2, l2)).join('') + '</div>';
    T.design += `<p style="margin:10px 0 0;font-size:14px">${fp && fp.price != null ? (lock ? '🔒 Price after sign-in' : 'From <b>' + rs(fp.price) + '</b>') : fp && fp.soon ? 'Coming soon' : 'Our team will price it'} <small style="color:#7A7268">· ${fp ? fp.n : 0} designs</small></p>`;
    { const tabs = [['size', 'Size'], ['place', 'Place'], ['design', 'Design & price']].filter(([k]) => T[k]); if (!T[S.edTab]) S.edTab = tabs.length ? tabs[0][0] : 'size';
      if (tabs.length > 1) h += '<div class="pl-etabs">' + tabs.map(([k, l]) => btn(`data-pl="etab:${k}"`, S.edTab === k, l)).join('') + '</div>'; h += '<div class="pl-epane">' + (T[S.edTab] || '') + '</div>'; }
    h += '<div class="pl-act">' + (att(sel) ? '' : `<button type="button" data-pl="lock">${sel.lock ? '🔓 Unlock' : '🔒 Lock'}</button>`) + (!sel.lock && (c.kind === 'free' || c.kind === 'floor') && sel.mode !== 'ac' ? '<button type="button" data-pl="rot">↻ Turn</button>' : '') + (att(sel) || sel.lock ? '' : '<button type="button" data-pl="dup">⧉ Copy</button>') + (sel.lock ? '' : '<button type="button" data-pl="del">🗑 Remove</button>') + '<button type="button" data-pl="done" style="margin-left:auto;background:#2E2E2E;color:#fff;border:0">Done</button></div></div>';
    if (S.msg) h += `<div class="pl-msg">${esc(S.msg)}</div>`;
    return h;
  }
  if (S.ask === 'privacy') return '<div class="pl-ed"><h4>🎋 Privacy screen — where does it go?</h4><div class="pl-ask">' +
    '<button type="button" data-pl="pmode:par"><b>' + (S.site.kind === 'terrace' ? 'On the parapet' : 'On the boundary wall') + '</b><small>Raised above your parapet on the sides you pick — set round cabins, the mumty and the like</small></button>' +
    '<button type="button" data-pl="pmode:part"><b>As a partition</b><small>A free-standing screen to split the space — drag it where you want</small></button>' +
    (mumtyTanks() ? '<button type="button" data-pl="pmode:tank"><b>Hide the water tanks</b><small>A screen round the tanks on the mumty roof</small></button>' : '') +
    '</div><div class="pl-act"><button type="button" data-pl="askx">Cancel</button></div></div>';
  if (!S.items.length && !S.bskip) return builder();
  if (S.bnote && S.bnote.length) h += '<div class="pl-note"><b>Set up the way our terraces are</b><br>' + S.bnote.map(esc).join(' · ') + '<br><small>Drag anything to move it, tap it to change it.</small></div>';
  h += '<h4>Add things</h4><p class="pl-sub">Tap to add, then drag on the 3D. You\'ll pick the exact design of each at the end — here one model stands for all designs of that kind.</p>';
  if (lock) h += '<button type="button" class="pl-lock" data-pl="unlock">🔒 Sign in to see prices</button>';
  if (S.msg) h += `<div class="pl-msg">${esc(S.msg)}</div>`;
  const sets = SETUPS.filter(x => !x.lawn || S.site.kind !== 'terrace');
  h += '<p class="pl-h">Start from a setup</p><div class="pl-set">' + sets.map(x => `<button type="button" data-pl="setup:${x.k}"><i>${x.e}</i><b>${esc(x.t)}</b><small>${esc(x.d)}</small></button>`).join('') + '</div><p class="pl-h">Or add one by one</p>';
  h += '<div class="pl-pal">' + CATS.filter(c => (!c.lawn || S.site.kind !== 'terrace') && (designs(c).length || c.always) && (c.k !== 'accover' || S.site.kind === 'terrace')).map(c => {
    const fp = fromPrice(Object.assign({ cat: c.k, w: c.w || 4, d: c.d || 4, h: c.h || 3 }, c.k === 'cabin' ? { sku: (cabinSkus().find(s => /PORTA/.test(s)) || cabinSkus()[0]) } : {}));
    return `<button type="button" data-pl="add:${c.k}"><i>${c.e}</i><span><b>${esc(c.t)}</b><small>${fp.price != null ? (lock ? fp.n + ' designs' : 'from ' + lakh(fp.price)) : fp.soon ? 'Coming soon' : fp.n + ' designs'}</small></span></button>`; }).join('') + '</div>';
  if (lwOk()) h = lwCard() + h;
  if (S.items.length) h += '<p class="pl-h">On your plan</p>' + S.items.map((it, i) => { const fp = fromPrice(it); return `<div class="pl-it" data-pl="sel:${i}"><i>${CAT[it.cat].e}</i><span>${esc(it.label || CAT[it.cat].t)}${CAT[it.cat].size && CAT[it.cat].size !== 'fixed' ? ' <em>· ' + it.w + (CAT[it.cat].size === 'wh' ? ' × ' + it.h : CAT[it.cat].size === 'wd' ? ' × ' + it.d : '') + ' ft</em>' : ''}</span><em>${fp && fp.price != null && !lock ? 'from ' + rs(fp.price) : ''}</em></div>`; }).join('');
  return h;
}
// 217: first time in step 2 — what the space is for (a theme ticks its things) + every thing with its icon → "Build my setup" places them all
// 224: what LifeWall's 70 real terraces taught us — how often each thing is there, and where it usually stands (vs the staircase room)
const LEARN = { cabin: 75, pergola: 75, bar: 69, planter: 51, water: 46, feature: 46, pathway: 44, sofa: 42, privacy: 42, turf: 39, deck: 24, jacuzzi: 7 };
function geo() {   // the terrace read for the setup: where the stairs are, which side is the far side, which parapets are open
  const t = S.site, terr = t.kind === 'terrace', M = terr ? (t.blocks.find(b => b.type === 'mumty') || t.blocks.find(b => b.type === 'lift')) : null;
  const mc = M ? M.x + M.w / 2 : t.pw / 2, side = !M ? 'none' : mc < t.pw * 0.4 ? 'left' : mc > t.pw * 0.6 ? 'right' : 'centre';
  const far = side === 'left' ? 'right' : side === 'right' ? 'left' : 'right', road = ['front'].concat(t.road_back ? ['back'] : [], t.corner ? [t.corner] : []).filter(x => t.road_front !== false || x !== 'front');
  const facing = side === 'centre' ? (M.z + M.d / 2 < t.pd / 2 ? 'front' : 'back') : far, hi = t.high || {};
  const open = ['back', 'left', 'right', 'front'].filter(sd => !road.includes(sd) && !hi[sd]);
  let door = M && M.door; if (M && !door) { const dx = t.pw / 2 - mc, dz = t.pd / 2 - (M.z + M.d / 2); door = Math.abs(dx) / t.pw > Math.abs(dz) / t.pd ? (dx > 0 ? 'right' : 'left') : (dz > 0 ? 'front' : 'back'); }   // = cabin3d: the door looks at the middle
  const dz0 = !M ? null : door === 'right' ? { x: M.x + M.w, z: M.z + M.d / 2 - 2.5, w: 4.5, d: 5 } : door === 'left' ? { x: M.x - 4.5, z: M.z + M.d / 2 - 2.5, w: 4.5, d: 5 } : door === 'front' ? { x: M.x + M.w / 2 - 2.5, z: M.z + M.d, w: 5, d: 4.5 } : { x: M.x + M.w / 2 - 2.5, z: M.z - 4.5, w: 5, d: 4.5 };
  const fr = !M ? null : side === 'left' ? { x: M.x + M.w, z: M.z, w: 6, d: M.d } : side === 'right' ? { x: M.x - 6, z: M.z, w: 6, d: M.d } : M.z + M.d / 2 < t.pd / 2 ? { x: M.x, z: M.z + M.d, w: M.w, d: 6 } : { x: M.x, z: M.z - 6, w: M.w, d: 6 };   // big things don't stand right in front of the stairs
  return { t, M, side, far, facing, open, road, door, dz: dz0, fr, P: P0() };
}
const SD = { left: 'left', right: 'right', back: 'back', front: 'front (road side)', none: '' };
function whereOpts(k, g) {   // [key, text, note] — the first is what most of our terraces did
  const st = g.M ? 'the staircase room' : 'the entrance', far = SD[g.far], B = S.bsel || {};
  const o = {
    cabin: [['back', 'At the back, beside ' + st, '54% stand beside it'], ['far', 'On the ' + far + ' side', ''], ['front', 'At the front', '']],
    pergola: [['front', 'At the front, on the ' + far + ' side', '49% at the front · 87% on a side'], ['back', 'At the back', ''], B.cabin ? ['cabin', 'Joined to the cabin', ''] : null],
    sofa: [B.pergola ? ['pergola', 'Under the pergola', 'shaded seating'] : null, ['open', 'In the open, facing the view', '']],
    dining: [B.pergola && !B.sofa ? ['pergola', 'Under the pergola', ''] : null, B.bar ? ['bar', 'Next to the bar', ''] : null, B.pergola && B.sofa ? ['pergola', 'Under the pergola, with the sofa', ''] : null, ['open', 'In the open', '']],
    swing: [B.pergola ? ['pergola', 'Under the pergola', ''] : null, ['far', 'On the ' + far + ' side', '']],
    bar: [['mumty', 'Beside ' + st, '64% beside it — water and power are close'], B.pergola ? ['pergola', 'Under the pergola', ''] : null, ['far', 'On the ' + far + ' side', '']],
    planter: [['far', 'Along the ' + far + ' wall', '74% on the side away from the stairs'], ['edges', 'All round the edges', ''], ['path', 'Along the pathway', '']],
    water: [['facing', 'Facing ' + st + ' (' + SD[g.facing] + ' wall)', '58% opposite the stairs — the first thing you see'], ['seat', 'Next to the seating', '']],
    feature: [['facing', 'On the wall facing ' + st + ' (' + SD[g.facing] + ')', '49% opposite the stairs'], g.M ? ['mumty', 'On the staircase room wall', '43% beside it'] : null],
    vgarden: [['far', 'On the ' + far + ' wall', ''], ['back', 'On the back wall', '']],
    privacy: [['par', 'On the parapet — ' + (g.open.length ? g.open.join(', ') : 'none open'), g.open.length < 4 ? 'road side and higher neighbour walls left out' : ''], ['part', 'A partition between spaces', '']],
    pathway: [['centre', 'From the stairs through the middle', '78% run through the centre']],
    turf: [['front', 'At the front, away from the stairs', '76% on the far side · 95% front / middle'], ['mid', 'In the middle', '']],
    deck: [B.pergola ? ['pergola', 'Under the pergola', ''] : null, B.cabin ? ['cabin', 'In front of the cabin', '65% next to a built room'] : null, ['open', 'An open deck', '']],
    jacuzzi: [['far', 'On the ' + far + ' side, away from the stairs', 'all of ours are on the far side']],
    firepit: [['seat', 'In front of the seating', '']],
    lights: [['path', 'Along the pathway and seating', '']],
    umbrella: [['open', 'In the open, over a table', '']],
  }[k];
  return (o || [['auto', 'We place it', '']]).filter(Boolean);
}
function builder() {
  const terr = S.site.kind === 'terrace', B = S.bsel || {}, lock = !priceOk(), g = geo();
  const sets = SETUPS.filter(x => !x.lawn || !terr), cats = CATS.filter(c => (!c.lawn || !terr) && (designs(c).length || c.always) && (c.k !== 'accover' || terr) && !['railing', 'gate', 'chair', 'table', 'graffiti'].includes(c.k));
  const n = Object.values(B).reduce((p, q) => p + q, 0);
  if (!S.bq) {   // 1 of 2: what is it for
    let h = '<div class="pl-qh"><i><b class="on"></b><b></b></i>1 of 2</div><h4>What is this space for?</h4><p class="pl-sub">Pick a mood — we tick what usually goes in it. Next you choose what and where.</p>';
    h += '<div class="pl-set pl-setg">' + sets.map(x => `<button type="button" class="${S.bth === x.k ? 'on' : ''}" data-pl="theme:${x.k}" aria-pressed="${S.bth === x.k}"><i>${x.e}</i><b>${esc(x.t)}</b><small>${esc(x.d)}</small></button>`).join('') + '</div>';
    h += `<button type="button" class="pl-go" style="width:100%;margin-top:14px" data-pl="bq:1">${S.bth ? 'Next — what and where →' : 'I\'ll choose things myself →'}</button>`;
    h += '<button type="button" class="pl-tsq" style="margin-top:12px" data-pl="bskip">Skip — I\'ll add things one by one</button>';
    return h;
  }
  // 2 of 2: what, how many and where — the usual spot first, with how often our terraces have it
  let h = '<div class="pl-qh"><i><b class="dn"></b><b class="on"></b></i>2 of 2</div><h4>What do you want, and where?</h4><p class="pl-sub">' + (g.M ? 'Your staircase room is on the ' + (g.side === 'centre' ? 'middle' : g.side) + ' — ' : '') + 'the first choice under each is where it stood on most of the 70 terraces we built.</p>';
  const rows = cats.slice().sort((a, b) => (B[b.k] ? 1 : 0) - (B[a.k] ? 1 : 0) || (LEARN[b.k] || 0) - (LEARN[a.k] || 0));
  h += rows.map(c => { const on = B[c.k] || 0, fp = lock || !on ? null : fromPrice(Object.assign({ cat: c.k, w: c.w || 4, d: c.d || 4, h: c.h || 3 }, c.k === 'cabin' ? { sku: (cabinSkus().find(z => /PORTA/.test(z)) || cabinSkus()[0]) } : {})), many = ['planter', 'lights', 'privacy', 'vgarden'].includes(c.k) || c.k === 'chair';
    let r = `<div class="pl-rq${on ? ' on' : ''}"><button type="button" class="pl-rqh" data-pl="bel:${c.k}" aria-pressed="${!!on}"><i>${c.e}</i><span><b>${esc(c.t)}</b><small>${LEARN[c.k] ? LEARN[c.k] + '% of our terraces have one' : c.always ? 'Planned with you by our team' : ''}${fp && fp.price != null ? ' · from ' + lakh(fp.price) : ''}</small></span><em>${on ? '✓' : '+'}</em></button>`;
    if (on) { const W = whereOpts(c.k, g), cur = (S.bwh || {})[c.k] || W[0][0];
      if (many && c.k !== 'privacy') r += `<div class="pl-pm"><span>How many</span><button type="button" data-pl="bcnt:${c.k}:-1">−</button><b>${on}</b><button type="button" data-pl="bcnt:${c.k}:1">+</button></div>`;
      if (W.length > 1 || W[0][0] !== 'auto') r += '<div class="pl-wh">' + W.map((w, j) => `<button type="button" class="${cur === w[0] ? 'on' : ''}" data-pl="bwh:${c.k}:${w[0]}" aria-pressed="${cur === w[0]}">${j === 0 ? '★ ' : ''}${esc(w[1])}${w[2] ? `<small>${esc(w[2])}</small>` : ''}</button>`).join('') + '</div>'; }
    return r + '</div>'; }).join('');
  h += `<div class="pl-bgo"><button type="button" class="pl-tsq" data-pl="bq:0">← Mood</button><button type="button" class="pl-go" data-pl="build"${n ? '' : ' disabled'}>✨ Set it all up${n ? ' (' + n + ')' : ''}</button></div>`;
  if (S.msg) h += `<div class="pl-msg">${esc(S.msg)}</div>`;
  return h;
}
// 224: the setup, placed the way our terraces are — big things first, each at the best free spot for its "where"
const BIG = new Set(['cabin', 'pergola', 'jacuzzi']);
function spotBest(it, i, score, rots, dz) {   // dz: the space in front of the staircase door stays clear
  const t = S.site, p = P0(), keep = { x: it.x, z: it.z, rot: it.rot }, fl = CAT[it.cat].kind === 'floor'; let best = null;
  for (const rot of rots || [0, 90]) { it.rot = rot; const f = foot(it), st = Math.max(f[0], f[1]) > 8 ? 1 : 0.5;
    for (let z = p; z <= t.pd - p - f[1] + 0.01; z += st) for (let x = p; x <= t.pw - p - f[0] + 0.01; x += st) { it.x = r2(x); it.z = r2(z); if (clashes(it, i) || (dz && !fl && hit(rectI(it), dz)) || (dz && dz.fr && BIG.has(it.cat) && hit(rectI(it), dz.fr))) continue;
      const sc = score(it.x + f[0] / 2, it.z + f[1] / 2, f, rot); if (!best || sc > best[0]) best = [sc, it.x, it.z, rot]; } }
  if (!best) { Object.assign(it, keep); return false; } it.x = best[1]; it.z = best[2]; it.rot = best[3]; return true;
}
function compose() {
  const g = geo(), t = g.t, P = g.P, B = S.bsel || {}, WH = S.bwh || {}, M = g.M, wh = k => WH[k] || whereOpts(k, g)[0][0];
  const farX = w => g.far === 'right' ? t.pw - P - w / 2 : P + w / 2, by = k => S.items.find(o => o.cat === k);
  const d2 = (x, z, X, Z) => Math.hypot(x - X, z - Z), wallBonus = (f, cx, cz, sd) => { const e = { left: cx - f[0] / 2 - P, right: t.pw - P - cx - f[0] / 2, back: cz - f[1] / 2 - P, front: t.pd - P - cz - f[1] / 2 }[sd]; return e < 0.6 ? 6 : 0; };
  const inR = (cx, cz, r) => r && cx > r.x && cx < r.x + r.w && cz > r.z && cz < r.z + r.d;
  let miss = 0; const notes = [];
  const put = (k, score, opt) => { opt = opt || {}; const it = newItem(k); if (!it) return null; Object.assign(it, opt.set || {}); const i = S.items.length; S.items.push(it);
    if (CAT[k].kind === 'wall') { it.x = r2(opt.at[0] - it.w / 2); it.z = r2(opt.at[1]); it.rot = opt.rot; if (!settle(it, i, [it.x, it.z])) { S.items.pop(); miss++; return null; } return it; }
    if (!spotBest(it, i, score, opt.rots, g.dz && Object.assign({ fr: g.fr }, g.dz))) { S.items.pop(); miss++; return null; } flush(it, i); if (opt.wside) it.wside = opt.wside; return it; };
  const mumtyFace = () => { if (!M) return [t.pw / 2, P + 2]; return g.door === 'right' ? [M.x + M.w, M.z + M.d / 2] : g.door === 'left' ? [M.x, M.z + M.d / 2] : g.door === 'front' ? [M.x + M.w / 2, M.z + M.d + 1.5] : [M.x + M.w / 2, M.z - 1.5]; };
  // the cabin first (it is the biggest), then the pathway from the stairs, so nothing else sits on it
  if (B.cabin) { const w = wh('cabin'), mf = mumtyFace();
    put('cabin', (cx, cz, f) => w === 'front' ? -d2(cx, cz, t.pw / 2, t.pd) : w === 'far' ? -d2(cx, cz, farX(f[0]), t.pd * 0.4) : -d2(cx, cz, M && g.side !== 'centre' ? (g.side === 'left' ? M.x + M.w + f[0] / 2 + 3.5 : M.x - f[0] / 2 - 3.5) : farX(f[0]), P + f[1] / 2) + wallBonus(f, cx, cz, 'back'), { rots: [0] });
    const cb0 = by('cabin'); if (cb0) { const cz = cb0.z + rectI(cb0).d / 2, dep = cz < t.pd / 3 ? 'at the back' : cz < t.pd * 2 / 3 ? 'in the middle' : 'at the front'; notes.push('Cabin ' + dep + (w === 'back' && g.side !== 'centre' && dep === 'at the back' ? ', beside the stairs (54% of ours)' : '')); } }
  const cab = by('cabin'), cr = cab ? rectI(cab) : null;
  if (B.pathway) { const mf = mumtyFace(), cx0 = g.side === 'left' ? Math.min(t.pw - P - 3, Math.max(mf[0] + 2, t.pw / 2 - 1.5)) : g.side === 'right' ? Math.max(P, Math.min(mf[0] - 5, t.pw / 2 - 1.5)) : r2(t.pw / 2 - 1.5);
    const z0 = r2(g.side === 'centre' ? (M.z + M.d / 2 < t.pd / 2 ? M.z + M.d : P) : Math.max(P, cr ? cr.z + cr.d : Math.min(mf[1] - 1.5, P + 4))), z1 = g.side === 'centre' && M.z + M.d / 2 >= t.pd / 2 ? M.z : t.pd - P;
    const mk = (x, z, w, d) => { const it = newItem('pathway'); const fl2 = v => Math.floor(v * 2) / 2; Object.assign(it, { x: r2(x), z: r2(z), w: fl2(w), d: fl2(d), rot: 0 }); const i = S.items.length; S.items.push(it); const cl = clashes(it, i); if (cl) { S.items.pop(); return null; } return it; };
    let pth = null;   // from where the door is to the front; if something stands in the way, start after it / shift a little
    for (let dx = 0; !pth && dx < 8; dx += 0.5) for (let zs = z0; !pth && z1 - zs >= 8; zs += 0.5) pth = mk(cx0 + dx, zs, 3, z1 - zs) || (dx ? mk(cx0 - dx, zs, 3, z1 - zs) : null);
    if (pth && M) { const ns = g.door === 'front' || g.door === 'back', dpx = mf[0], a = dpx < pth.x ? (ns ? dpx - 1.5 : dpx) : pth.x + 3, b = dpx < pth.x ? pth.x : (ns ? dpx + 1.5 : dpx); if (b - a > 0.5 && (dpx < pth.x || dpx > pth.x + 3)) mk(a, r2(mf[1] - 1.5), b - a, 3); }
    if (pth) notes.push('Pathway from the stairs through the middle'); else miss++; }
  if (B.pergola) { const w = wh('pergola');
    put('pergola', (cx, cz, f) => w === 'cabin' && cr ? -d2(cx, cz, cr.x + cr.w / 2, cr.z + cr.d + f[1] / 2) : w === 'back' ? -d2(cx, cz, farX(f[0]), P + f[1] / 2) : -d2(cx, cz, farX(f[0]), t.pd - P - f[1] / 2) + wallBonus(f, cx, cz, g.far) + wallBonus(f, cx, cz, 'front'));
    if (by('pergola')) notes.push(w === 'cabin' ? 'Pergola joined to the cabin' : 'Pergola on the ' + g.far + (w === 'back' ? ', at the back' : ', at the front') + ' (like 87% of ours)'); }
  const pg = by('pergola'), pr = pg ? rectI(pg) : null;
  if (B.deck) { const w = wh('deck');
    if (w === 'pergola' && pr) { const it = newItem('deck'); Object.assign(it, { x: pr.x, z: pr.z, w: pr.w, d: pr.d, rot: 0 }); S.items.push(it); if (clashes(it, S.items.length - 1)) S.items.pop(); }
    else if (w === 'cabin' && cr) { const it = newItem('deck'); Object.assign(it, { x: cr.x, z: cr.z + cr.d, w: Math.min(cr.w, 14), d: 6, rot: 0 }); S.items.push(it); if (clashes(it, S.items.length - 1)) { S.items.pop(); put('deck', (cx, cz) => -d2(cx, cz, cr.x + cr.w / 2, cr.z + cr.d + 3)); } }
    else put('deck', (cx, cz, f) => -d2(cx, cz, farX(f[0]), t.pd * 0.5)); }
  if (B.jacuzzi) put('jacuzzi', (cx, cz, f) => -d2(cx, cz, farX(f[0]), t.pd * 0.35) + wallBonus(f, cx, cz, g.far));
  if (B.bar) { const w = wh('bar'), mf = mumtyFace();
    put('bar', (cx, cz, f, rot) => (w === 'pergola' && pr ? -d2(cx, cz, pr.x + pr.w / 2, pr.z + 1.5) + (inR(cx, cz, pr) ? 8 : 0) : w === 'far' ? -d2(cx, cz, farX(f[0]), t.pd * 0.4) : -d2(cx, cz, mf[0] + (g.side === 'left' ? 5 : g.side === 'right' ? -5 : 0), mf[1] + (g.side === 'centre' ? 5 : 0)))
      + ((g.side === 'centre' ? rot === 0 : rot === 90) ? 2 : 0));
    if (by('bar') && w === 'mumty') notes.push('Bar beside the stairs (64% of ours)'); }
  const seat = (k, wk) => { const w = wh(k); put(k, (cx, cz, f) => w === 'pergola' && pr ? -d2(cx, cz, pr.x + pr.w / 2, pr.z + pr.d / 2) + (inR(cx, cz, pr) && inR(cx - f[0] / 2 + 0.3, cz - f[1] / 2 + 0.3, pr) && inR(cx + f[0] / 2 - 0.3, cz + f[1] / 2 - 0.3, pr) ? 20 : 0)
    : w === 'bar' && by('bar') ? -d2(cx, cz, rectI(by('bar')).x + rectI(by('bar')).w / 2, rectI(by('bar')).z + rectI(by('bar')).d / 2 + 5) : -d2(cx, cz, farX(f[0]), t.pd * (wk || 0.55))); };
  if (B.sofa) { seat('sofa'); if (by('sofa') && wh('sofa') === 'pergola') notes.push('Sofa under the pergola'); }
  if (B.dining) seat('dining', 0.7);
  if (B.swing) seat('swing', 0.3);
  if (B.bench) put('bench', (cx, cz, f) => -d2(cx, cz, farX(f[0]), t.pd * 0.25) + wallBonus(f, cx, cz, g.far));
  if (B.turf) { const w = wh('turf'); for (const sz of [[14, 12], [12, 10], [10, 8], [8, 6], [6, 5]]) { const it = newItem('turf'); it.w = Math.min(sz[0], t.pw - 2 * P - 4); it.d = sz[1]; const i = S.items.length; S.items.push(it);
      const ok = spotBest(it, i, (cx, cz, f) => -d2(cx, cz, g.far === 'right' ? t.pw * 0.6 : t.pw * 0.4, w === 'mid' ? t.pd / 2 : t.pd - P - f[1] / 2) - S.items.filter((o, j) => j !== i && !att(o) && CAT[o.cat].kind !== 'floor' && hit(rectI(it), rectI(o))).length * 6, [0]);
      if (ok) break; S.items.pop(); } if (!by('turf')) miss++; }
  // walls: the feature wall faces the stairs, the water feature stands in front of it
  const wallAt = (sd, u, k) => { const it = newItem(k), w = it.w, run = sd === 'back' || sd === 'front' ? t.pw : t.pd, uu = Math.max(P, Math.min(run - P - w, u - w / 2));
    return sd === 'back' ? { at: [uu + w / 2, P], rot: 0 } : sd === 'front' ? { at: [uu + w / 2, t.pd - P - it.d], rot: 180 } : sd === 'left' ? { at: [P + w / 2, uu], rot: 270 } : { at: [t.pw - P - it.d + w / 2, uu], rot: 90 }; };
  const mU = M ? (g.facing === 'back' || g.facing === 'front' ? M.x + M.w / 2 : M.z + M.d / 2) : t.pd / 2;
  if (B.feature) { const w = wh('feature');
    if (w === 'mumty' && M) put('feature', null, Object.assign(wallAt(g.side === 'left' ? 'right' : 'left', 0, 'feature'), { at: [g.side === 'left' ? M.x + M.w + 0.6 : M.x - 0.6, M.z + 1], rot: g.side === 'left' ? 90 : 270 }));
    else put('feature', null, wallAt(g.facing, mU, 'feature'));
    if (by('feature')) notes.push('Feature wall on the wall facing the stairs'); }
  if (B.water) { const w = wh('water'), fw = by('feature');
    put('water', (cx, cz, f) => w === 'seat' && (by('sofa') || pr) ? -d2(cx, cz, rectI(by('sofa') || pg).x + rectI(by('sofa') || pg).w + 3, rectI(by('sofa') || pg).z + 3)
      : fw ? -d2(cx, cz, rectI(fw).x + rectI(fw).w / 2 + (g.facing === 'right' ? -3 : g.facing === 'left' ? 3 : 0), rectI(fw).z + rectI(fw).d / 2 + (g.facing === 'back' ? 3 : g.facing === 'front' ? -3 : 0))
      : -d2(cx, cz, g.facing === 'right' ? t.pw - P - 3 : g.facing === 'left' ? P + 3 : t.pw / 2, g.facing === 'back' ? P + 3 : g.facing === 'front' ? t.pd - P - 3 : mU));
    if (by('water')) notes.push('Water feature facing the stairs (58% of ours)'); }
  for (let k = 0; k < (B.vgarden || 0); k++) { const w = wh('vgarden'), sd = w === 'back' ? 'back' : g.far, run = sd === 'back' ? t.pw : t.pd; put('vgarden', null, wallAt(sd, run * (k + 1) / ((B.vgarden || 1) + 1), 'vgarden')); }
  if (B.firepit) { const so = by('sofa') || pg; put('firepit', (cx, cz) => so ? -d2(cx, cz, rectI(so).x + rectI(so).w / 2 + (g.far === 'right' ? -1 : 1) * (rectI(so).w / 2 + 2.5), rectI(so).z + rectI(so).d / 2) : -d2(cx, cz, t.pw / 2, t.pd * 0.6)); }
  if (B.umbrella) { const tf = by('turf'); put('umbrella', (cx, cz) => tf ? -d2(cx, cz, rectI(tf).x + rectI(tf).w / 2, rectI(tf).z + rectI(tf).d / 2) : -d2(cx, cz, t.pw / 2, t.pd * 0.7)); }
  if (B.sculpture) { const pa = by('pathway'); put('sculpture', (cx, cz) => pa ? -d2(cx, cz, pa.x + 4.5, pa.z + pa.d - 1.5) : -d2(cx, cz, t.pw / 2, t.pd - 3)); }
  // planters: along the far wall (74% of ours), round the edges, or both sides of the pathway
  if (B.planter) { const w = wh('planter'), n = B.planter, pa = by('pathway');
    for (let k = 0; k < n; k++) { const u = (k + 0.5) / n;
      const tgt = w === 'path' && pa ? [pa.x + (k % 2 ? 4 : -1), pa.z + pa.d * ((Math.floor(k / 2) + 0.5) / Math.ceil(n / 2))] : w === 'edges' ? (u < 0.34 ? [P + 1 + (t.pw - 2) * u * 3, P + 1] : u < 0.67 ? [g.far === 'right' ? t.pw - P - 1 : P + 1, t.pd * (u - 0.34) * 3] : [P + 1 + (t.pw - 2) * (u - 0.67) * 3, t.pd - P - 1]) : [g.far === 'right' ? t.pw - P - 1 : P + 1, P + 1 + (t.pd - 2 * P - 2) * u];
      put('planter', (cx, cz) => -d2(cx, cz, tgt[0], tgt[1]), { rots: [0] }); }
    if (by('planter') && w === 'far') notes.push(n + ' planters along the ' + g.far + ' wall (74% of ours)'); }
  if (B.lights) { const pa = by('pathway'), n = B.lights;
    for (let k = 0; k < n; k++) { const tgt = pa ? [k % 2 ? pa.x + pa.w + 0.6 : pa.x - 0.6, pa.z + pa.d * ((Math.floor(k / 2) + 0.5) / Math.ceil(n / 2))] : [P + 1 + (t.pw - 2) * ((k + 0.5) / n), t.pd - P - 1]; put('lights', (cx, cz) => -d2(cx, cz, tgt[0], tgt[1]), { rots: [0] }); } }
  if (B.privacy) { const w = wh('privacy');
    if (w === 'part' || !g.open.length || t.kind !== 'terrace') { for (let k = 0; k < B.privacy; k++) { const before = S.items.length; addItem('privacy'); if (S.items.length === before) miss++; } }
    else { const it2 = { cat: 'privacy', mode: 'par', label: 'Screen on the parapet', sides: g.open.slice(), h: 3, w: 0, d: 0.3, x: 0, z: 0, rot: 0 }; S.items.push(it2); attach(it2, S.items.length - 1); if (!it2.w) { S.items.pop(); miss++; } else notes.push('Privacy screens on the ' + g.open.join(', ') + ' parapet'); } }
  if (B.accover && t.kind === 'terrace') coverAC();
  ['chair', 'table', 'graffiti', 'railing', 'gate'].forEach(k => { for (let j = 0; j < (B[k] || 0); j++) { const before = S.items.length; addItem(k); if (S.items.length === before) miss++; } });
  S.items.forEach((it, i) => { if (it.cat === 'pergola') pergolaAttach(it, i); });
  S.bnote = notes; return miss;
}
function stepPick() {
  if (!S.items.length) return '<h4>Pick designs</h4><p class="pl-sub">Add something to your space first.</p>';
  if (!priceOk()) return '<h4>Pick designs</h4><p class="pl-sub">Sign in to see the designs at your sizes and their prices.</p><button type="button" class="pl-lock" data-pl="unlock">🔒 Sign in to see prices</button>';
  if (S.cust && S.items[S.cust.i]) return custSheet();
  let h = '<h4>Pick designs</h4><p class="pl-sub">Each thing at the size you set — tap a design to choose it, then Customise it. Change the size in step 2.</p>';
  S.items.forEach((it, i) => {
    const c = CAT[it.cat], ch = choices(it), pk = picked(it);
    h += `<div class="pl-pk"><div class="pl-pkh"><b>${c.e} ${esc(it.label || c.t)}</b><span>${pk ? rs(pk.q.price) : ''}</span></div>${pk && pk.q.n > 1 ? `<p class="pl-sub" style="margin:-4px 0 8px">${it.w} ft — goes as ${pk.q.n} pieces of ${pk.q.o.l || pk.q.o.w} ft</p>` : ''}`;
    if (!ch.length) { h += '<p class="pl-sub" style="margin:4px 0 0">No design open for orders at this size yet — our team will help.</p></div>'; return; }
    h += '<div class="pl-row2">' + ch.slice(0, 12).map(x => { const p = PR()[x.id], on = pk && pk.id === x.id, im = IMG(x.id);
      return `<button type="button" class="pl-ds${on ? ' on' : ''}" data-pl="pick:${i}:${esc(x.id)}" aria-pressed="${on}">${im ? `<img src="${esc(im)}" alt="" loading="lazy">` : '<i></i>'}<b>${esc(String(p.n).replace(/ — .*$/, ''))}</b><small>${rs(x.q.price)}</small></button>`; }).join('') + '</div>';
    if (pk) h += (c.k === 'cabin' || c.k === 'pergola' ? `<button type="button" class="pl-cust" data-pl="sel2:${i}">✎ Customise in the designer</button>` : `<button type="button" class="pl-cust" data-pl="cust:${i}">✎ Customise${it.cfg && it.cfgId === pk.id ? ' (your choices)' : ''}</button>`) + `<a class="pl-see" href="/?p=${encodeURIComponent(pk.id)}" target="_blank" rel="noopener">See this design ↗</a>`;
    h += '</div>';
  });
  h += estBox();
  if (S.msg) h += `<div class="pl-msg">${esc(S.msg)}</div>`;
  if (lwOk()) h += lwCard();
  return h;
}
function estBox() {   // 193i: delivery + installation for the picked designs at a pincode
  const E2 = S.est || {}, pin = E2.pin || pinNow();
  let h = `<div class="pl-est"><b>Delivery & installation</b><div class="pl-row" style="margin:6px 0 0"><label class="pl-n"><span>Site pincode</span><input type="text" inputmode="numeric" maxlength="6" data-plin="estpin" value="${esc(pin)}" style="width:110px"></label><button type="button" class="pl-cust" data-pl="estgo" style="margin:0">${E2.busy ? 'Working it out…' : 'Estimate'}</button></div>`;
  if (E2.res && E2.res.pin === pin) { const r = E2.res; h += `<p class="pl-sub" style="margin:8px 0 0">Delivery ${r.dlv ? rs(r.dlv) : 'included / on the way'} · Installation ${r.inst ? rs(r.inst) : '—'}${r.na ? ' · ' + r.na + ' not available at this pincode yet' : ''}<br><b>Total about ${lakh(r.total)}</b> <small>(lifting to your floor is added at checkout)</small></p>`; }
  return h + '</div>';
}
async function estimate() {
  const pin = (S.est && S.est.pin) || pinNow(); if (!/^\d{6}$/.test(pin) || !window.mtoEstimate) { S.msg = 'Type the 6-digit pincode of the site'; return draw(false); }
  S.est = { pin, busy: true }; draw(false); let dlv = 0, inst = 0, prod = 0, na = 0;
  for (const it of S.items) { const pk = picked(it); if (!pk) continue; const q = await window.mtoEstimate(pk.id, pk.q.o, pin), n = pk.q.n || 1;
    if (!q || !q.ok) { na++; prod += pk.q.price; continue; } prod += (q.product || 0) * n; dlv += (q.delivery_fee || 0) * n; inst += (q.install_fee || 0) * n; }
  S.est = { pin, res: { pin, dlv, inst, na, total: prod + dlv + inst } }; try { const a = JSON.parse(localStorage.getItem('outrr_addr') || '{}'); if (!a.pincode) { a.pincode = pin; localStorage.setItem('outrr_addr', JSON.stringify(a)); } } catch (e) {}
  draw(false);
}
function lwCard() { return '<div class="pl-note" style="margin:0 0 12px"><b>A big project?</b> For a whole terrace or a large cabin, our group company <b>LifeWall</b> can design and build it all turnkey — one team, one price. <button type="button" class="pl-lock" data-pl="lw" style="margin-top:8px;display:block">Talk to LifeWall (free consultation) →</button></div>'; }
function exact() { let t = 0, n = 0; S.items.forEach(it => { const pk = picked(it); if (pk) { t += pk.q.price; n++; } }); return { t, n }; }
function toCart() {
  if (!priceOk()) return unlock();
  const lines0 = []; S.items.forEach(it => { const pk = picked(it); if (pk) for (let k = 0; k < (pk.q.n || 1); k++) lines0.push({ id: pk.id, o: pk.q.o }); });   // a long screen = its equal pieces
  const lines = []; lines0.forEach(ln => { const mx = +(((PR()[ln.id] || {}).cz || {}).pcs || {}).max || 1, key = ln.id + JSON.stringify(ln.o);   // 199: the same design set up the same way → one line of N pieces
    const hit = mx > 1 && lines.find(z => z.key === key && (z.o.pcs || 1) < mx); if (hit) hit.o = Object.assign({}, hit.o, { pcs: (hit.o.pcs || 1) + 1 }); else lines.push({ id: ln.id, o: Object.assign({}, ln.o), key }); });
  lines.forEach(z => delete z.key);
  if (lines.length > 20) { S.msg = 'That is ' + lines.length + ' designs (long screens go as pieces) — one order takes up to 20. Take some off, or ask our team for one quote.'; return draw(false); }
  if (!lines.length) { S.msg = 'Nothing here can be ordered yet'; return draw(false); }
  if (!window.mtoCartAddMany) { S.msg = 'Please try again in a moment'; return draw(false); }
  const r = window.mtoCartAddMany(lines);
  if (!r.added) { S.msg = 'Couldn\'t add these — ' + (r.skipped.join(', ') || 'please try again'); return draw(false); }
  ev('plan_to_cart', { value: Math.round(exact().t) }); cloudSave({ carted: 'true', cart_value: Math.round(exact().t) });
  close(); if (window.mtoOpenCart) window.mtoOpenCart();
  if (r.skipped.length && window.toast) setTimeout(() => window.toast('Not added: ' + r.skipped.join(', ')), 600);
}
function total() { let t = 0, n = 0; S.items.forEach(it => { const fp = fromPrice(it); if (fp && fp.price != null) { t += fp.price; n++; } }); return { t, n }; }

function draw(rec) {
  if (QUIET) return;
  if (S.items) { S.items.forEach((it, i) => { if (att(it)) attach(it, i); }); S.items = S.items.filter(it => it.mode !== 'ac' || it.box); S.items.forEach((it, i) => { if (it.cat === 'pergola') pergolaAttach(it, i); }); if (S.sel != null && !S.items[S.sel]) S.sel = null; }
  if (rec !== false) hist(); save();
  document.getElementById('plSt').innerHTML = btn('data-pl="step:0"', S.step === 0, '1 · <span class="pl-l">Your </span>space') + btn('data-pl="step:1"', S.step === 1, '2 · Add<span class="pl-l"> things</span>') + btn('data-pl="step:2"', S.step === 2, '3 · Pick<span class="pl-l"> designs</span>');
  if (gateDue() && !priceOk()) S.gate = true;
  document.getElementById('plPn').innerHTML = S.gate && !priceOk() ? gateCard() : S.step === 0 ? stepSite() : S.step === 2 ? stepPick() : stepPlace();
  EL.classList.toggle('pl-locked', !!(S.gate && !priceOk())); paintSaved();
  const T = total(), lock = !priceOk();
  const E = exact();
  document.getElementById('plFt').innerHTML = S.step === 0 ? (siteLast() ? '<button type="button" class="pl-go" data-pl="step:1">Next: add things →</button>' : '<button type="button" class="pl-go" data-pl="tsq:1">Next →</button>')
    : S.step === 2 ? (lock || !S.items.length ? '' : `<div class="pl-tot"><b>${E.n ? lakh(E.t) : '—'}</b><small>${E.n} design${E.n === 1 ? '' : 's'} · before delivery & installation (added at checkout)</small></div><button type="button" class="pl-go" data-pl="cart"${E.n ? '' : ' disabled'}>Add all to cart</button>`)
    : `<div class="pl-tot">${S.items.length ? (lock ? '<b>🔒</b><small>Sign in to see the estimate</small>' : (T.n ? `<b>${lakh(T.t)}+</b><small>${S.items.length} thing${S.items.length > 1 ? 's' : ''} · starting price${T.n < S.items.length ? ' of ' + T.n : ''}, before delivery & installation</small>` : `<b>—</b><small>Prices open soon for these</small>`)) : '<b>—</b><small>Add something to see the estimate</small>'}</div>` + (S.items.length ? '<button type="button" class="pl-go" data-pl="step:2">Pick designs →</button>' : '');
  document.getElementById('plZ').innerHTML = `<button type="button" data-pl="undo" aria-label="Undo" title="Undo (Ctrl+Z)"${S.hi > 0 ? '' : ' disabled'}>↶</button><button type="button" data-pl="redo" aria-label="Redo" title="Redo (Ctrl+Y)"${S.hi < S.hist.length - 1 ? '' : ' disabled'}>↷</button>` +
    `<button type="button" data-pl="view" class="${S.view === 'top' ? 'on' : ''}" aria-label="${S.view === 'top' ? '3D view' : 'Top view'}" title="${S.view === 'top' ? '3D view' : 'Top view'}">${S.view === 'top' ? '🧊' : '▦'}</button><button type="button" data-pl="zin" aria-label="Zoom in">+</button><button type="button" data-pl="zout" aria-label="Zoom out">−</button><button type="button" data-pl="home" aria-label="Whole space" title="Whole space">⌖</button>` + (S.items.length ? '<button type="button" data-pl="share" aria-label="Share this plan" title="Share this plan">🔗</button><button type="button" data-pl="pdf" aria-label="Save as PDF" title="Save as PDF">⎙</button>' : '');
  try { S3.show(document.getElementById('pl3d'), { site: S.site, items: S.items, sel: S.step === 1 ? S.sel : null, cabinCfg, cabinLay, pergolaSku: 'MTO-PG-TW' }, { place: S.step === 0, view: S.view }); } catch (e) { if (window.console) console.warn(e); }
}

function onClick(e) {
  const b = e.target.closest('[data-pl]'); if (!b || b.disabled) return; if (act(b.getAttribute('data-pl').split(':')) === true) draw();
}
function act(a) {   // one button's action on S; true = draw again
  const t = S.site, it = S.sel != null ? S.items[S.sel] : null; S.msg = '';
  switch (a[0]) {
    case 'close': return close();
    case 'undo': return undo(-1);
    case 'redo': return undo(1);
    case 'zin': return S3.zoom(0.8);
    case 'zout': return S3.zoom(1.25);
    case 'home': return S3.home();
    case 'view': S.view = S.view === 'top' ? '3d' : 'top'; return draw(false);
    case 'step': if (S.step !== +a[1]) ev('plan_step', { ref: a[1] }); S.step = +a[1]; S.sel = null; S.ask = null; S.cust = null; for (const k in PC) delete PC[k]; if (S.step >= 1 && S.pend) { putPieces(S.pend); S.pend = null; } break;
    case 'kind': if (t.kind !== a[1]) { t.kind = a[1]; if (a[1] === 'terrace' && !t.blocks.length) defBlocks(t); S.items = S.items.filter((x, i) => !(CAT[x.cat].lawn && a[1] === 'terrace') && settle(x, i)); } break;
    case 'unit': try { localStorage.setItem('outrr_area_unit', a[1] === 'm' ? 'm' : 'yd'); } catch (e) {} break;
    case 'plot': { delete t.tpl; const p = PLOTS.find(z => z[0] === a[1]); t.plot = a[1]; setPlot(p[1], p[2]); break; }
    case 'par': t.par = +a[1]; break;
    case 'cut': { t.cuts = t.cuts || {}; if (!a[2]) delete t.cuts[a[1]]; else t.cuts[a[1]] = Object.assign({ a: Math.min(8, Math.round(t.pw / 4)), b: Math.min(8, Math.round(t.pd / 6)) }, t.cuts[a[1]] || {}, { type: a[2] }); afterCut(); break; }
    case 'corner': t.corner = a[1] || ''; break;
    case 'etab': S.edTab = a[1]; break;
    case 'start': t.start = a[1] === 'own' ? 'own' : 'tpl'; S.tsq = (S.tsq || 0) + 1; ev('plan_start', { ref: t.start }); break;
    case 'theme': { const x = SETUPS.find(z => z.k === a[1]); if (!x) break; S.bth = S.bth === x.k ? null : x.k; S.bsel = {}; S.bwh = {}; if (S.bth) x.items.forEach(k => { if (CAT[k] && (designs(CAT[k]).length || CAT[k].always)) S.bsel[k] = (S.bsel[k] || 0) + 1; }); if (S.bsel.privacy) S.bsel.privacy = 1; if (S.site.kind === 'terrace' && S.site.blocks.some(b => b.type === 'ac') && designs(CAT.accover).length) S.bsel.accover = 1; break; }
    case 'bel': { S.bsel = S.bsel || {}; if (S.bsel[a[1]]) delete S.bsel[a[1]]; else S.bsel[a[1]] = a[1] === 'planter' ? 4 : a[1] === 'lights' ? 4 : 1; break; }
    case 'bq': S.bq = +a[1]; { const pn = document.getElementById('plPn'); if (pn) pn.scrollTop = 0; } break;
    case 'bcnt': { S.bsel = S.bsel || {}; const v = Math.max(1, Math.min(20, (S.bsel[a[1]] || 1) + (+a[2] || 0))); S.bsel[a[1]] = v; break; }
    case 'bwh': S.bwh = S.bwh || {}; S.bwh[a[1]] = a[2]; break;
    case 'bskip': S.bskip = true; break;
    case 'build': { const B = S.bsel || {}; if (!Object.keys(B).length) { S.msg = 'Tick at least one thing'; break; }
      const miss = compose(); ev('plan_build', { ref: S.bth || 'own', n: S.items.length }); S.sel = null; S.bskip = true; S.msg = miss ? `${miss} thing${miss > 1 ? 's' : ''} didn't fit — make the space or them smaller, or add them one by one` : ''; break; }
    case 'tlift': S.tplLift = a[1] === '' ? null : a[1] === '1'; break;
    case 'tpl': if (!a[1]) { if (t.tpl) { S.site = Object.assign({}, S.tplBase || t); delete S.site.tpl; if (!S.tplBase) defBlocks(S.site); S.tplBase = null; } }
      else { const tp = TM.get(a[1]); if (tp) { if (!t.tpl) S.tplBase = JSON.parse(JSON.stringify(t)); S.site = TM.fit(tp, a[2] === '1', t); ev('plan_tpl', { ref: S.site.tpl }); } }
      S.items = S.items.filter((x, j) => settle(x, j)); break;
    case 'tsq': S.tsq = Math.max(0, (S.tsq || 0) + (+a[1] || 0)); { const pn = document.getElementById('plPn'); if (pn) pn.scrollTop = 0; } break;
    case 'tsmode': S.tsq = 0; try { localStorage.setItem('outrr_ts_mode', a[1] === 'full' ? 'full' : 'quick'); } catch (e) {} break;
    case 'qroad': t.road_front = true; t.road_back = a[1] === 'back'; t.corner = a[1] === 'left' || a[1] === 'right' ? a[1] : ''; t.high = t.high || {}; if (t.corner) t.high[t.corner] = false; if (t.road_back) t.high.back = false; break;
    case 'qmumty': { delete t.tpl; const mi = t.blocks.findIndex(b => b.type === 'mumty'), li = t.blocks.findIndex(b => b.type === 'lift');
      if (a[1] === 'none') { if (mi >= 0) t.blocks.splice(mi, 1); S.items = S.items.filter((x, j) => settle(x, j)); break; }
      if (mi < 0) { const sm = t.pw <= 25; if (!addBlock(t, 'mumty', sm ? 8 : 10, sm ? 16 : 18, a[1])) S.msg = 'No free room for it on that side'; S.items = S.items.filter((x, j) => settle(x, j)); break; }
      const mb = t.blocks[mi], keep = JSON.stringify(mb); if ((a[1] === 'back') !== (mb.side === 'back')) { const w0 = mb.w; mb.w = mb.d; mb.d = w0; }   // its long side along the wall
      wallB(t, mb, a[1]); mb.side = a[1]; if (!freeB(t, mi)) { Object.assign(mb, JSON.parse(keep)); S.msg = 'No free room for it on that side'; break; }
      if (li >= 0) { const lb = t.blocks[li]; wallB(t, lb, a[1]); lb.side = a[1]; freeB(t, li); }
      S.items = S.items.filter((x, j) => settle(x, j)); break; }
    case 'rfront': t.road_front = t.road_front === false; break;
    case 'rback': t.road_back = !t.road_back; if (t.road_back && t.high) t.high.back = false; break;
    case 'bdel': t.blocks.splice(+a[1], 1); break;
    case 'block': { const b = t.blocks[+a[1]]; if (b) b.lock = !b.lock; break; }
    case 'bside': { const b = t.blocks[+a[1]]; if (!b) break; const keep = JSON.stringify(b); wallB(t, b, a[2]); b.side = a[2]; if (!freeB(t, +a[1])) { Object.assign(b, JSON.parse(keep)); S.msg = 'No free room on that wall'; } S.items = S.items.filter((x, j) => settle(x, j)); break; }
    case 'wside': if (it && !att(it)) { const keep = JSON.stringify(it); it.wside = a[1] === 'free' ? undefined : a[1]; if (!settle(it, S.sel) || !onW(it)) { undo1(it, keep); S.msg = 'No room for it on that wall'; } } break;
    case 'badd': { const D = BLK[a[1]]; if (!addBlock(t, a[1], D[1], D[2], a[1] === 'room' ? 'back' : 'right')) S.msg = 'No free room for it — make the others smaller or move them'; S.items = S.items.filter((x, i) => settle(x, i)); break; }
    case 'add': ev('plan_add', { ref: a[1] }); if (a[1] === 'privacy') { S.ask = 'privacy'; S.sel = null; break; } if (a[1] === 'accover') { const n = coverAC(); S.msg = n ? '' : (S.site.blocks.some(b => b.type === 'ac') ? 'Every AC unit already has a cover' : 'Add your AC units in step 1 (Your space) first — the covers go over them'); if (n) S.sel = S.items.length - 1; break; } addItem(a[1]); break;
    case 'pmode': { S.ask = null; const m = a[1], t2 = S.site;
      if (S.sel != null && S.items[S.sel] && S.items[S.sel].cat === 'privacy') { const x = S.items[S.sel], keep = JSON.stringify(x); x.mode = m === 'part' ? undefined : m; if (m === 'par') { x.sides = x.sides || ['left', 'right', 'back']; x.h = 3; } else if (m === 'tank') x.h = 4.5; else { x.w = 8; x.d = 0.5; x.h = 6; x.x = r2((t2.pw - 8) / 2); x.z = r2(t2.pd / 2); }
        if (!settle(x, S.sel)) { Object.assign(x, JSON.parse(keep)); S.msg = 'No free room for it'; } break; }
      if (m === 'part') { addItem('privacy'); break; }
      const it2 = { cat: 'privacy', mode: m, label: m === 'par' ? 'Screen on the parapet' : 'Tank screen', sides: m === 'par' ? ['left', 'right', 'back'] : undefined, h: m === 'par' ? 3 : 4.5, w: 0, d: 0.3, x: 0, z: 0, rot: 0 };
      S.items.push(it2); attach(it2, S.items.length - 1); S.sel = S.items.length - 1; if (!it2.w) S.msg = m === 'tank' ? 'Add the mumty (with tanks) in step 1 first' : 'No free parapet on those sides — pick others'; break; }
    case 'askx': S.ask = null; break;
    case 'rename': { const nm = prompt('Name this plan', S.pname || ''); if (nm && nm.trim() && S.pid) { S.pname = nm.trim().slice(0, 120); rpc('plan_rename', { p_id: S.pid, p_name: S.pname }).then(paintSaved).catch(() => {}); save(); } return paintSaved(); }
    case 'newplan': if (!confirm('Start a new plan? This one stays saved in your account.')) return; { const v = S.view; S = fresh(); S.view = v; S.hist = []; S.hi = -1; S.pid = null; S.pname = ''; } break;
    case 'lock': if (it) it.lock = !it.lock; break;
    case 'prop': if (it) { save(); const same = S.items.filter(o => o.cfgId === it.cfgId && JSON.stringify(o.cfg || {}) === JSON.stringify(it.cfg || {}) && o.w === it.w && o.d === it.d).length; const ok = window.mtoPropFromPlan(JSON.parse(JSON.stringify(it)), same); if (ok) { close(); return; } } break;   // 199
    case 'design': if (it) { ev('plan_design', { ref: it.cat }); save(); const ok = window.mtoFromPlan && window.mtoFromPlan(S.sel, JSON.parse(JSON.stringify(it)), JSON.parse(JSON.stringify(S.site))); if (ok) { close(); return; } S.msg = 'Couldn\'t open the designer — try again'; } break;
    case 'pdeck': if (it) { it.deck = !it.deck; it.deckAuto = false; } break;
    case 'pside': if (it && it.mode === 'par') { const sd = a[1], ss = new Set(it.sides || []); ss.has(sd) ? ss.delete(sd) : ss.add(sd); it.sides = ['back', 'left', 'right', 'front'].filter(x => ss.has(x)); attach(it, S.sel); if (!it.w) S.msg = 'No free parapet on those sides'; } break;
    case 'gfit': if (it && it.cat === 'graffiti') { it.fit = it.fit === false; if (!settle(it, S.sel)) S.msg = 'It doesn\'t fit there'; } break;
    case 'sel': S.sel = +a[1]; S.ask = null; break;
    case 'done': S.sel = null; break;
    case 'del': if (it) { S.items.splice(S.sel, 1); S.sel = null; } break;
    case 'dup': if (it) { const c2 = JSON.parse(JSON.stringify(it)); c2.x += 1; c2.z += 1; S.items.push(c2); if (!settle(c2, S.items.length - 1, [it.x + it.w, it.z])) { S.items.pop(); S.msg = 'No free room for a copy'; } else S.sel = S.items.length - 1; } break;
    case 'rot': if (it && !it.lock) { const keep = JSON.stringify(it), f0 = foot(it), cx = it.x + f0[0] / 2, cz = it.z + f0[1] / 2; it.rot = ((+it.rot || 0) + 90) % 360; const f1 = foot(it); it.x = r2(cx - f1[0] / 2); it.z = r2(cz - f1[1] / 2); if (!settle(it, S.sel, [it.x, it.z])) { Object.assign(it, JSON.parse(keep)); S.msg = 'No room to turn it here'; } } break;
    case 'rs': if (it && !it.lock) { if (it.cat === 'pergola' && a[1] === 'h') it.hAuto = false; if (it.cat === 'graffiti' && a[1] === 'w') it.fit = false; resizeItem(it, a[1], +a[2]); } break;
    case 'cz': if (it && !it.lock && it.cat === 'cabin') { const L = cabinLay(it); cabinSize(it, a[1] === 'L' ? num(L.L) + +a[2] : num(L.L), a[1] === 'W' ? num(L.W) + +a[2] : num(L.W)); } break;
    case 'csku': if (it) { const keep = JSON.stringify(it), L0 = it.layout; it.sku = a[1] + (a[2] ? ':' + a[2] : ''); if (L0 && window.mtoCabinSize) { const r = window.mtoCabinSize(it.sku, null, L0.L, L0.W); if (r && r.lay) { it.layout = r.lay; it.lsku = it.sku; } } cabinFoot(it); it.label = PR()[it.sku].n.replace(/ —.*$/, ''); if (!settle(it, S.sel)) { Object.assign(it, JSON.parse(keep)); S.msg = 'That cabin doesn\'t fit here'; } } break;
    case 'unlock': return unlock();
    case 'pick': { const i = +a[1], id = a.slice(2).join(':'), x = S.items[i]; if (x) { x.pick = id; if (x.cfgId && x.cfgId !== id) { delete x.cfg; delete x.cfgId; } realSize(x, id, x.cfg); if (x.cat === 'cabin') { const keep = JSON.stringify(x); x.sku = id; cabinFoot(x); x.label = PR()[id].n.replace(/ —.*$/, ''); if (!settle(x, i)) { Object.assign(x, JSON.parse(keep)); x.pick = x.sku; S.msg = 'That cabin doesn\'t fit there — make room in step 2'; } } } break; }
    case 'cart': return toCart();
    case 'estgo': return estimate();
    case 'sel2': S.step = 1; S.sel = +a[1]; break;
    case 'cust': { const x = S.items[+a[1]], pk = x && picked(x); if (!pk) break; const m = PR()[pk.id].cz, o = JSON.parse(JSON.stringify(x.cfg && x.cfgId === pk.id ? x.cfg : pk.q.o)); delete o._n;
      if (m.unit === 'fixed' && !o.size) o.size = ((m.sizes || [])[0] || {}).label; if (m.unit === 'seat' && !num(o.n)) o.n = num(m.n && m.n.min) || 4; S.cust = { i: +a[1], id: pk.id, o }; break; }
    case 'cs': { const C2 = S.cust; if (!C2) break; const m = PR()[C2.id].cz, o = C2.o, v = a.slice(2).join(':');
      if (a[1] === 'cancel') { S.cust = null; break; }
      if (a[1] === 'use') { const x = S.items[C2.i]; ev('plan_custom', { ref: x && x.cat, sku: C2.id }); if (x) { x.cfg = JSON.parse(JSON.stringify(o)); x.cfgId = C2.id; x.pick = C2.id; realSize(x, C2.id, o); } S.cust = null; break; }
      if (a[1] === 'size') o.size = v; else if (a[1] === 'n') o.n = Math.max(num(m.n && m.n.min) || 1, Math.min(num(m.n && m.n.max) || 99, (num(o.n) || 0) + (+a[2])));
      else if (a[1] === 'mat') { o.material = v; const mt = (m.materials || []).find(z => z.name === v); o.colour = ((mt && mt.colours) || [])[0] ? mt.colours[0].name : ''; }
      else if (a[1] === 'col') o.colour = v; else if (a[1] === 'grp') { const [g, op] = v.split('::'); o.groups = Object.assign({}, o.groups, { [g]: op }); }
      else if (a[1] === 'add') { o.addons = (o.addons || []).includes(v) ? o.addons.filter(z => z !== v) : (o.addons || []).concat(v); }
      return draw(false); }
    case 'setup': { const x = SETUPS.find(z => z.k === a[1]); if (!x) break; x.items.forEach(k => ev('plan_add', { ref: k })); let n = 0, miss = 0; const sel0 = S.sel;
      x.items.forEach(k => { if (!designs(CAT[k]).length) return; const before = S.items.length; addItem(k); if (S.items.length > before) n++; else miss++; });
      S.sel = null; S.msg = n ? (miss ? `Added ${n} — ${miss} didn't fit; make the space bigger or move things` : '') : 'No free room — make the space bigger or move things'; if (!n) S.sel = sel0; break; }
    case 'share': return share();
    case 'pdf': return pdf();
    case 'lw': return lifewall();
    default: return;
  }
  return true;
}
function onInput(e) {
  const k = e.target.getAttribute && e.target.getAttribute('data-plin'); if (!k) return; const v = parseFloat(e.target.value), t = S.site; if (!(v > 0)) return; S.msg = '';
  if (k === 'estpin') { S.est = { pin: String(e.target.value || '').replace(/\D/g, '').slice(0, 6) }; return estimate(); }
  if (/^(rs|cz):/.test(k)) { const it = S.sel != null ? S.items[S.sel] : null, f = k.split(':')[1]; if (!it || it.lock) return; if (it.cat === 'pergola' && f === 'h') it.hAuto = false;
    if (k[0] === 'r') { if (it.cat === 'graffiti' && f === 'w') it.fit = false; resizeItem(it, f, 0, v); } else { const L = cabinLay(it); cabinSize(it, f === 'L' ? v : num(L.L), f === 'W' ? v : num(L.W)); }
    return draw(); }
  if (/^c[ab]:/.test(k)) { const [f, c] = k.split(':'), cu = t.cuts && t.cuts[c]; if (!cu) return; cu[f === 'ca' ? 'a' : 'b'] = Math.max(1, Math.min(f === 'ca' ? t.pw - 4 : t.pd - 4, Math.round(v * 2) / 2)); afterCut(); return draw(); }
  if (k === 'pw' || k === 'pd') { t.plot = ''; setPlot(k === 'pw' ? v : t.pw, k === 'pd' ? v : t.pd); }
  else { const [f, i] = k.split(':'), b = t.blocks[+i]; if (!b) return; if (f === 'bh') { b.h = Math.max(2, Math.min(30, Math.round(v * 2) / 2)); S.items.forEach((x, j) => attach(x, j)); return draw(); } const keep = JSON.stringify(b); if (f === 'bw') b.w = Math.max(1, Math.min(t.pw - 2, v)); else b.d = Math.max(1, Math.min(t.pd - 2, v)); wallB(t, b, b.side);
    if (t.blocks.some((o, j) => j !== +i && hit(b, o)) || cutHit(t, b, PAR)) { Object.assign(b, JSON.parse(keep)); S.msg = 'That would touch another one — move or shrink that first'; } S.items = S.items.filter((x, j) => settle(x, j)); }
  draw();
}
function moveItem(i, x, z) { const it = S.items[i]; if (!it || it.lock || att(it)) return false; const keep = JSON.stringify(it); it.x = x; it.z = z; if (!settle(it, i, [x, z])) { Object.assign(it, JSON.parse(keep)); S.msg = 'It doesn\'t fit there'; }
  else if (!onW(it)) { undo1(it, keep); S.msg = 'No room there on the ' + it.wside + ' wall — or pick "Free" to move it off the wall'; }
  else if (CAT[it.cat] && CAT[it.cat].kind === 'wall' && !it.wside && it.on && it.on.side) it.wside = it.on.side;   // a panel put on a parapet stays on it
  S.sel = i; return true; }
function on3d(ev) {
  const t = S.site; S.msg = '';
  if (ev.t === 'block') { const b = t.blocks[ev.i]; if (!b || b.lock) return; const keep = { x: b.x, z: b.z, side: b.side }; b.x = ev.x; b.z = ev.z;
    if (keep.side && keep.side !== 'free') b.side = keep.side; else b.side = b.x <= PAR + 1 ? 'left' : b.x + b.w >= t.pw - PAR - 1 ? 'right' : b.z <= PAR + 1 ? 'back' : b.z + b.d >= t.pd - PAR - 1 ? 'front' : 'free'; wallB(t, b, b.side);
    if (t.blocks.some((o, j) => j !== ev.i && hit(b, o))) { Object.assign(b, keep); S.msg = 'It can\'t go on top of another one'; } else if (cutHit(t, b, PAR)) { Object.assign(b, keep); S.msg = 'That corner is cut — it can\'t go there'; } }
  else if (ev.t === 'move') { if (!moveItem(ev.i, ev.x, ev.z)) return; }
  else if (ev.t === 'sel') S.sel = ev.i;
  draw();
}
function unlock() {
  if (EL) EL.style.display = 'none'; document.body.style.overflow = '';   // the sign-in sheet opens under the planner otherwise
  save(); try { localStorage.setItem('outrr_resume', JSON.stringify({ k: 'plan', t: Date.now() })); } catch (e) {}   // 218: the page may reload while the customer fetches the email code (mobile) — index.html outrrResume() reopens the plan after sign-in
  if (window.mtoUnlock) window.mtoUnlock(() => { try { localStorage.removeItem('outrr_resume'); } catch (e) {} if (typeof window.showHome === 'function' && document.getElementById('account') && document.getElementById('account').style.display !== 'none') { try { window.showHome(); } catch (e) {} }
    Object.keys(PC).forEach(k => delete PC[k]); S.gate = false; open(); draw(false); cloudSoon({}); });
}
// ---------------------------------------------------------------- phase 3: share link, PDF, LifeWall for big projects
const b64 = t => btoa(unescape(encodeURIComponent(t))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = t => decodeURIComponent(escape(atob(String(t).replace(/-/g, '+').replace(/_/g, '/'))));
function shareUrl() { return location.origin + '/?plan=' + b64(JSON.stringify({ v: 1, site: S.site, items: S.items })); }
async function share() {
  const u = shareUrl(); try { if (window.otrack) otrack('plan_share', { n: S.items.length }); } catch (e) {}
  if (navigator.share) { try { await navigator.share({ title: 'My outdoor plan — outrr', url: u }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(u); S.msg = ''; if (window.toast) window.toast('Link copied ✓'); else alert('Link copied'); } catch (e) { prompt('Copy this link', u); }
}
function fromLink(q) {   // ?plan=<link>: someone shared a plan
  try { const v = JSON.parse(unb64(q)); if (!v || !v.site || !Array.isArray(v.items)) return false;
    if (S.items.length && snap() !== JSON.stringify([v.site, v.items]) && !confirm('Open the shared plan? It replaces the plan saved on this device.')) return false;
    S.site = v.site; S.items = v.items.filter(it => CAT[it.cat]).slice(0, 40); S.step = S.items.length ? 2 : 0; S.sel = null; return true; } catch (e) { return false; }
}
function rowsNow() { return S.items.map(it => { const c = CAT[it.cat], pk = S.step === 2 || it.pick ? picked(it) : null, fp = fromPrice(it);
  return { e: c.e, t: it.label || c.t, size: c.size === 'fixed' || it.cat === 'cabin' ? '' : it.w + (c.size === 'wh' ? ' × ' + it.h : c.size === 'wd' ? ' × ' + it.d : '') + ' ft', design: pk ? String(PR()[pk.id].n).replace(/ — .*$/, '') : '', price: pk ? pk.q.price : fp && fp.price, from: !pk }; }); }
function pdf() {
  const img = S3.snapshot(), rows = rowsNow(), ok = priceOk(), t = S.site, tot = rows.reduce((a, r) => a + (r.price || 0), 0);
  const w = window.open('', '_blank'); if (!w) { S.msg = 'Allow pop-ups to save the PDF'; return draw(false); }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>My outdoor plan — outrr</title><style>body{font-family:Inter,system-ui,sans-serif;color:#2E2E2E;margin:28px}h1{font-size:22px;margin:0 0 4px}p{color:#6A6258;margin:0 0 14px;font-size:13px}img{width:100%;border-radius:12px;border:1px solid #E2D6C4}table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}td,th{padding:8px;border-bottom:1px solid #EEE6DA;text-align:left}td:last-child,th:last-child{text-align:right}tfoot td{font-weight:700;font-size:15px}.n{font-size:11.5px;color:#7A7268;margin-top:14px;word-break:break-all}@media print{body{margin:10mm}}</style></head><body>
<h1>My outdoor plan</h1><p>${t.kind === 'terrace' ? 'Terrace' : 'Lawn / garden'} · ${t.pw} × ${t.pd} ft${t.plot ? ' (' + plotLab(t.plot) + ' plot)' : ''} · made on outrr.in</p>${img ? `<img src="${img}" alt="3D view of the plan">` : ''}
<table><thead><tr><th>Thing</th><th>Size</th><th>Design</th><th>${ok ? 'Price' : ''}</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r.e} ${esc(r.t)}</td><td>${esc(r.size)}</td><td>${esc(r.design || 'to pick')}</td><td>${ok && r.price != null ? (r.from ? 'from ' : '') + rs(r.price) : ''}</td></tr>`).join('')}</tbody>
${ok ? `<tfoot><tr><td colspan="3">Total${rows.some(r => r.from) ? ' (starting)' : ''}</td><td>${rs(tot)}</td></tr></tfoot>` : ''}</table>
<p class="n">Prices incl. GST, before delivery and installation (worked out at checkout for your pincode). Open this plan again: ${esc(shareUrl())}</p><script>setTimeout(function(){print()},400)<\/script></body></html>`);
  w.document.close(); try { if (window.otrack) otrack('plan_pdf', { n: S.items.length }); } catch (e) {}
}
// LifeWall (turnkey design & build) only for big projects: ₹15 lakh+ AND the whole terrace / lawn (6+ things over several kinds) or a big cabin (300 sq ft+)
function bigCabin() { return S.items.some(it => it.cat === 'cabin' && (() => { const L = cabinLay(it); return (num(L.L) || it.w) * (num(L.W) || it.d) >= 300; })()); }
function wholeSpace() { return S.items.length >= 6 && new Set(S.items.map(i => i.cat)).size >= 4; }
function lwOk() { if (!priceOk()) return false; const v = S.step === 2 ? exact().t : total().t; return v >= 1500000 && (wholeSpace() || bigCabin()); }
function lifewall() {
  if (typeof window.enqOpen !== 'function') return; const rows = rowsNow(), v = S.step === 2 ? exact().t : total().t;
  close(); window.enqOpen('db');
  setTimeout(() => { const set = (id, x) => { const e = document.getElementById(id); if (e && x) e.value = x; };
    set('eInt', (S.site.kind === 'terrace' ? 'Whole terrace' : 'Whole lawn / garden') + ' — ' + [...new Set(rows.map(r => r.t))].slice(0, 6).join(', '));
    set('eMsg', `My plan on outrr: ${S.site.pw} × ${S.site.pd} ft ${S.site.kind === 'terrace' ? 'terrace' : 'lawn'}, ${rows.length} things, about ${lakh(v)}. ${rows.map(r => r.t + (r.size ? ' ' + r.size : '')).join('; ')}. Plan: ${shareUrl()}`.slice(0, 1800));
    const b = document.getElementById('eBud'); if (b) { const l = v / 100000, want = l < 20 ? '15L–20L' : l < 25 ? '20L–25L' : l < 50 ? '25L–50L' : '50L & Above'; if ([...b.options].some(o => o.value === want)) b.value = want; } }, 50);
  try { if (window.otrack) otrack('plan_lifewall', { value: Math.round(v) }); } catch (e) {}
}
function close() { if (EL) EL.style.display = 'none'; document.body.style.overflow = ''; try { const u = new URL(location.href); if (u.searchParams.has('plan')) { u.searchParams.delete('plan'); history.replaceState(history.state, '', u.pathname + (u.search || '') + u.hash); } } catch (e) {} }

function putPieces(list) {   // 199: each piece takes a placeholder's spot (same kind, no design yet), else a free spot in a row; things already there stay
  if (list[0] && list[0].cat === 'privacy' && list[0].mode === 'par') {   // 211: a parapet / boundary-wall screen design takes the plan's parapet screen (or goes on the parapet)
    const p0 = list[0], dm = S.items.find(o => o.cat === 'privacy' && o.mode === 'par' && !o.pick && !o.cfgId), it = dm || { cat: 'privacy', mode: 'par', sides: ['left', 'right', 'back'], w: 0, d: 0.3, x: 0, z: 0, rot: 0 };
    Object.assign(it, { pick: p0.pick, cfgId: p0.cfgId, cfg: p0.cfg, label: p0.label, h: p0.h }); if (!dm) S.items.push(it); const i = S.items.indexOf(it); attach(it, i);
    if (it.w) { S.sel = i; return; } S.items.splice(i, 1); list = list.map(o => Object.assign({}, o, { mode: undefined, w: Math.min(+o.w || 8, 12), d: 0.5 }));   // no free parapet: as a partition
  }
  const dummies = S.items.filter(o => o.cat === list[0].cat && !o.pick && !o.cfgId && !o.lock && !att(o)); let last = null, first = -1;
  list.forEach((p0, k) => { const it = Object.assign({}, p0), dm = dummies[k];
    if (dm) { const i = S.items.indexOf(dm); it.x = dm.x; it.z = dm.z; it.rot = dm.rot || 0; S.items.splice(i, 1, it); if (!settle(it, i)) { S.items.splice(i, 1, dm); S.items.push(it); if (!placeFree(it, S.items.length - 1)) S.items.pop(); } }
    else { it.x = last ? r2(last.x + last.w + 0.5) : r2((S.site.pw - it.w) / 2); it.z = last ? last.z : r2(S.site.pd * 0.35 - it.d / 2); S.items.push(it); if (!placeFree(it, S.items.length - 1)) { S.items.pop(); S.msg = 'Not all the pieces fit — make room and add more'; return; } }
    last = it; if (first < 0) first = S.items.indexOf(it); });
  S.sel = first >= 0 ? first : null;
}
export function open(seed) {
  if (seed && seed.load) return openSaved(seed.load);
  if (seed && seed.sload) return openSaved(seed.sload, true);
  for (const k in PC) delete PC[k]; shell(); TM.load().then(() => { try { if (EL && EL.style.display !== 'none' && S && S.step === 0) draw(); } catch (e) {} }); if (!S || (seed && seed.reload)) { const v = S && S.view; S = load(); S.hist = []; S.hi = -1; if (v) S.view = v; }
  S.items.forEach(it => { if (it.cat === 'cabin' && it.bcx != null && cabinCfg(it)) { cabinFoot(it); it.x = r2(it.bcx - foot(it)[0] / 2); it.z = r2(it.bcz - foot(it)[1] / 2); delete it.bcx; delete it.bcz; } });   // 193g: back from the studio
  S.items.forEach(it => { if (it.cat === 'cabin' && !it.ex && cabinCfg(it)) { const f0 = foot(it), cx = it.x + f0[0] / 2, cz = it.z + f0[1] / 2; cabinFoot(it); const f1 = foot(it); it.x = r2(cx - f1[0] / 2); it.z = r2(cz - f1[1] / 2); } });   // plans saved before 193b
  let q = null; try { q = new URLSearchParams(location.search).get('plan'); } catch (e) {}
  if (q && q.length > 10 && !S.linkDone) { S.linkDone = true; fromLink(q); }
  if (seed && seed.fresh) { const v = S && S.view; S = fresh(); S.hist = []; S.hi = -1; S.pid = null; S.pname = ''; if (v) S.view = v; if (seed.kind === 'ground') S.site.kind = 'ground';
    if (seed.site && seed.site.kind === 'terrace' && +seed.site.pw > 0) { S.site = Object.assign({ plot: '', par: 3, corner: '', high: {}, road_front: true, road_back: false, tanks: false, blocks: [] }, JSON.parse(JSON.stringify(seed.site)), { start: 'tpl' }); S.step = 1; S.tsDone = true; }   // 220: set up on the blank screen (wizard + closest real terrace) — straight to what goes on it
  }   // 197: "another project" from the pergola designer — a new plan (the old one stays in the account)
  if (seed && Array.isArray(seed.items) && seed.items.length) {   // 199: pieces of a design set up on its page (planters…) — the space is set up first when it is new
    if (seed.fresh && S.step === 0) S.pend = seed.items; else { S.step = 1; putPieces(seed.items); }
    if (!S.pid) S.source = 'planner';
  } else if (seed && seed.item) {   // 193: from the cabin studio / pergola designer
    if (seed.site && seed.site.kind === 'terrace') { const t = seed.site; S.site = { kind: 'terrace', plot: t.plot || '', pw: +t.pw, pd: +t.pd, par: +t.par || 3, corner: t.corner || '', road_front: t.road_front, road_back: !!t.road_back, high: t.high || {}, tanks: t.tanks !== false, cuts: t.cuts, blocks: (t.blocks || []).map(b => Object.assign({ type: BLK[b.type] ? b.type : 'room', side: b.side || 'free', w: +b.w, d: +b.d, x: +b.x, z: +b.z }, +b.h > 0 ? { h: +b.h } : {})) }; }
    else if (seed.site && seed.site.kind === 'ground' && S.site.kind !== 'ground') { S.site.kind = 'ground'; }
    const it = Object.assign({}, seed.item), same = S.items.findIndex(o => o.cat === it.cat && (o.pick === it.pick || o.sku === it.pick));
    if (same >= 0) S.items.splice(same, 1);
    if (it.cat === 'cabin') { cabinFoot(it); if (it.bcx != null) { it.x = r2(it.bcx - it.w / 2); it.z = r2(it.bcz - it.d / 2); } delete it.bcx; delete it.bcz; }
    if (it.x == null) { it.x = r2((S.site.pw - it.w) / 2); it.z = r2(S.site.pd * 0.35 - it.d / 2); }
    S.items.unshift(it); if (!placeFree(it, 0)) { S.items.shift(); }
    S.items = S.items.filter((o, i) => i === 0 || settle(o, i));   // things already planned move off it
    S.step = 1; S.sel = 0; S.msg = ''; if (!S.pid) S.source = seed.item.cat === 'cabin' ? 'cabin' : seed.item.cat === 'pergola' ? 'pergola' : 'planner';
  } EL.style.display = 'flex'; document.body.style.overflow = 'hidden';
  draw(); setTimeout(() => { try { S3.resize(); } catch (e) {} }, 60); ev('plan_open', { ref: seed && seed.item ? seed.item.cat : '' }); gateWatch(); if (priceOk()) cloudSoon(seed && seed.reload ? {} : undefined);   // 218: back from signing in → saved to the account at once
}
async function openSaved(id, sales) {   // My account → Saved plans → Open; CRM → lead → Plans (Sales mode)
  try { const v = sales ? await anonRpc('sales_plan_get', { p_token: assistTok(), p_id: id }) : await rpc('plan_get', { p_id: id }); if (!v) throw new Error('Plan not found');
    localStorage.setItem(KEY, JSON.stringify({ v: 1, step: v.step || 1, site: v.site, items: v.items || [], pid: v.id, pname: v.name, source: v.source }));
    return open({ reload: true });
  } catch (e) { alert(e.message || 'Could not open the plan'); }
}
window.outrrPlanState = () => S; window.outrrPlanMove = (i, x, z) => on3d({ t: 'move', i, x, z }); window.outrrPlanLW = () => lifewall(); window.outrrPlanPrice = it => fromPrice(it);   // for tests
// 193j: the cabin studio / pergola designer add things around their design with the planner's own rules, on a plan object { site, items, sel }
function withPlan(plan, fn) {
  const keep = S; S = { v: 1, step: 1, site: plan.site, items: plan.items || [], sel: plan.sel != null ? plan.sel : null, ask: plan.ask || null, msg: '', view: '3d', hist: [], hi: -1 }; QUIET = true;
  try { const r = fn(); plan.site = S.site; plan.items = S.items; plan.sel = S.sel; plan.ask = S.ask; plan.msg = S.msg || ''; return r; } finally { QUIET = false; S = keep; }
}
export const api = {
  cats(skip) { return CATS.filter(c => c.k !== skip && !c.lawn && (designs(c).length || c.always)).map(c => ({ k: c.k, t: c.t, e: c.e, size: c.size, kind: c.kind, hr: c.hr })); },
  cat(k) { const c = CAT[k]; return c ? { k: c.k, t: c.t, e: c.e, size: c.size, kind: c.kind, hr: c.hr, min: c.min, max: c.max } : null; },
  act(plan, cmd) { return withPlan(plan, () => act(String(cmd).split(':'))); },
  move(plan, i, x, z) { return withPlan(plan, () => moveItem(i, x, z)); },
  size(plan, i, key, v) { return withPlan(plan, () => { const it = S.items[i]; S.sel = i; if (!it || it.lock) return; if (it.cat === 'pergola' && key === 'h') it.hAuto = false; if (it.cat === 'graffiti' && key === 'w') it.fit = false; resizeItem(it, key, 0, v); }); },
  put(plan, i, item) {   // the designer's own cabin / pergola at index i (−1: first time, put in front); things on it move off
    return withPlan(plan, () => { const it = JSON.parse(JSON.stringify(item));
      if (it.cat === 'cabin') { cabinFoot(it); if (it.bcx != null) { it.x = r2(it.bcx - foot(it)[0] / 2); it.z = r2(it.bcz - foot(it)[1] / 2); } delete it.bcx; delete it.bcz; }
      if (i < 0 || i >= S.items.length) { S.items.unshift(it); i = 0; } else { it.lock = S.items[i] && S.items[i].lock; S.items[i] = it; }
      S.items = S.items.filter((o, j) => j === i || settle(o, j)); return S.items.indexOf(it); }); },
  from(plan) { return withPlan(plan, () => { if (!priceOk()) return null; let t = 0, n = 0; S.items.forEach(it => { if (it._me) return; const q = fromPrice(it); if (q && q.price) { t += q.price; n++; } }); return { t, n }; }); },
};