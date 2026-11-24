// outrr "Plan your space" (192) — phase 1: set up the terrace or lawn, then place things on it.
// Cabins and pergolas are the real models; every other Made to Order category is one common model the customer sizes and
// places; each shows "from ₹" = the cheapest live design of that category at that size (store price engine, window.mtoPrice).
// Rules: nothing goes over the parapet / boundary, nothing sits on another thing or on a block (decking is a floor: things
// stand on it); railings / gates snap to the edge, wall-type things to the parapet or a block when near. Blocks on the roof
// move only in step 1. Undo / redo. Saved in this browser (localStorage outrr_plan). Phase 2: pick the real design per item + cart.
import * as S3 from './space3d.js?v=41';
import * as P2 from './plan2d.js?v=11';
import { cutHit } from './cabin3d.js?v=37';
import * as TM from './terrace-match.js?v=5';

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
  { k: 'fbench', t: 'Fixed seating', e: '💺', col: 'benches', kind: 'free', w: 8, d: 2, h: 1.6, min: [3, 2], max: [30, 2], size: 'w', always: true },   // 239: built-in (civil / MS) seating, L-shaped on the walls
  { k: 'counter', t: 'Food counter', e: '🍳', col: 'bar-counters', kind: 'free', w: 8, d: 2.5, h: 3, min: [4, 2.5], max: [20, 2.5], size: 'w', always: true },   // 239: buffet / cooking counter
  { k: 'shaftcover', t: 'Shaft cover', e: '⬜', kind: 'free', w: 4, d: 4, h: 3.4, size: 'fixed', always: true },   // 241: MS frame + white polycarbonate on a shaft (made by the setup)
  { k: 'rack', t: 'Bottle rack', e: '', col: 'bar-counters', sb: /rack|bottle/i, kind: 'free', w: 5, d: 1.2, h: 7, size: 'fixed', always: true },   // 247: behind the bar only
  { k: 'stool', t: 'Bar chairs', e: '', col: 'furniture', sb: /bar (chair|stool)|stool/i, kind: 'free', w: 1.5, d: 1.5, h: 2.6, size: 'fixed', always: true },   // 245: round 3, on the customer's side of a bar
  { k: 'firepit', t: 'Fire pit', e: '🔥', col: 'fire-pits', kind: 'free', w: 3.5, d: 3.5, h: 1.5, size: 'fixed', always: true },
  { k: 'jacuzzi', t: 'Jacuzzi', e: '🛁', col: 'jacuzzi', kind: 'free', w: 7, d: 7, h: 3, size: 'fixed', always: true },
  { k: 'lights', t: 'Garden lights', e: '💡', col: 'lighting', kind: 'free', w: 0.8, d: 0.8, h: 3, size: 'fixed', always: true, nolabel: true },
  { k: 'umbrella', t: 'Umbrella', e: '☂️', col: 'umbrellas', kind: 'free', w: 8, d: 8, h: 8, size: 'fixed', always: true },
  { k: 'gate', t: 'Gate', e: '🚪', col: 'gates', kind: 'edge', w: 10, d: 0.4, h: 6, min: [3, 0.4], max: [30, 0.4], hr: [4, 10], size: 'wh', lawn: true },
];
// 193 phase 3: ready-made setups — added to what's already there, each thing at the nearest free spot
const SETUPS = [
  { k: 'chill', t: 'Chill corner', e: '☕', d: 'Pergola with a sofa on a deck, water, planters, lights', items: ['pergola', 'deck', 'sofa', 'water', 'pathway', 'privacy', 'lights', 'lights', 'lights', 'lights', 'planter', 'planter', 'planter', 'planter'] },
  { k: 'party', t: 'Party terrace', e: '🎉', d: 'Bar by the stairs, pergola lounge, dining, fire pit, grass', items: ['bar', 'pergola', 'fbench', 'dining', 'counter', 'turf', 'pathway', 'privacy', 'lights', 'lights', 'lights', 'lights', 'planter', 'planter', 'planter'] },
  { k: 'work', t: 'Work + relax', e: '💻', d: 'Cabin at the back, deck, sofa, green wall', items: ['cabin', 'deck', 'pergola', 'sofa', 'vgarden', 'pathway', 'privacy', 'planter', 'planter', 'planter'] },
  { k: 'green', t: 'Green retreat', e: '🌿', d: 'Grass, green walls, planters, bench, water', items: ['turf', 'vgarden', 'feature', 'water', 'fbench', 'pathway', 'privacy', 'planter', 'planter', 'planter', 'planter', 'planter', 'planter'] },
  { k: 'yoga', t: 'Yoga & wellness', e: '🧘', d: 'Deck under a pergola, water, green wall, screens', items: ['deck', 'pergola', 'water', 'vgarden', 'turf', 'privacy', 'planter', 'planter', 'planter', 'planter'] },
  { k: 'spa', t: 'Spa & lounge', e: '🛁', d: 'Jacuzzi, pergola lounge, feature wall, lights', items: ['jacuzzi', 'pergola', 'deck', 'sofa', 'feature', 'water', 'pathway', 'privacy', 'lights', 'lights', 'lights', 'lights', 'planter', 'planter', 'planter', 'planter'] },
  { k: 'family', t: 'Family lawn', e: '🌳', d: 'Pergola, dining, bench, water, sculpture', items: ['pergola', 'dining', 'bench', 'water', 'sculpture', 'planter'], lawn: true },
];
CATS.forEach(c => { c.e = P2.ico(c.k) || c.e; }); SETUPS.forEach(x => { x.e = P2.ico(x.k) || x.e; });   // 245: line icons
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
function save() { if (QUIET) return; try { localStorage.setItem(KEY, JSON.stringify({ v: 1, step: S.step, site: S.site, items: S.items, su: S.su || null, bsel: S.bsel || null, pid: S.pid || null, pname: S.pname || '', source: S.source || '', ctabs: S.ctabs || [] })); } catch (e) {} if (S.dirty !== false) cloudSoon(); }
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
const att = it => !!(it && (it.mode === 'par' || it.mode === 'tank' || it.mode === 'ac' || it.mode === 'shaft'));   // 193c: screens fixed on the parapet / on the mumty — no floor footprint
const OVSH = new Set(['deck', 'pergola', 'cabin']);   // 258
function clashes(it, i) {   // what it would sit on
  if (att(it)) return '';
  const r = rectI(it), fl = CAT[it.cat] && CAT[it.cat].kind === 'floor';
  if (!inside(r)) return 'edge';
  if ((S.site.kind === 'terrace' ? S.site.blocks : []).some(b => hit(r, b) && !(b.type === 'shaft' && OVSH.has(it.cat)))) return 'block';   // 258 (owner): a deck, pergola or cabin can go over a shaft
  const under = (a, b) => (UMB.has(a.cat) && !UMB.has(b.cat) && b.cat !== 'cabin') || (UMB.has(b.cat) && !UMB.has(a.cat) && a.cat !== 'cabin');   // 203: seating, a bar, planters… can stand under a pergola
  if (S.items.some((o, j) => j !== i && !att(o) && CAT[o.cat] && CAT[o.cat].kind !== 'floor' && (!fl || o.cat === 'cabin') && !under(it, o) && hit(r, rectI(o)))) return 'item';
  if (S.items.some((o, j) => j !== i && !att(o) && (fl ? FLX.has(it.cat) && FLX.has(o.cat) && it.cat !== o.cat : false) && hit(r, rectI(o)))) return 'item';   // 224: nothing stands on the pathway; pathway / grass / deck don't overlap   // decking goes under things, never under a cabin
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
function snapWall(it, far) {   // a panel near the parapet or a block (within 3 ft): turn to face out from it and stand against it
  const t = S.site, p = P0(), f = foot(it), cx = it.x + f[0] / 2, cz = it.z + f[1] / 2;
  const faces = olOn() ? olWalls().filter(w => w.vert ? cz > w.lo + p && cz < w.hi - p : cx > w.lo + p && cx < w.hi - p).map(w => w.vert ? (w.dir > 0 ? ['left', w.at, cx - w.at] : ['right', w.at, w.at - cx]) : (w.dir > 0 ? ['back', w.at, cz - w.at] : ['front', w.at, w.at - cz]))   // 244: any shape
    : [['back', p, cz - p], ['front', t.pd - p, t.pd - p - cz], ['left', p, cx - p], ['right', t.pw - p, t.pw - p - cx]];
  (t.kind === 'terrace' ? t.blocks : []).forEach((b, bi) => { if (b.type === 'ac') return; if (cx > b.x && cx < b.x + b.w) { faces.push(['front', b.z, cz - b.z, 1, bi, 'zmin']); faces.push(['back', b.z + b.d, b.z + b.d - cz, 1, bi, 'zmax']); }
    if (cz > b.z && cz < b.z + b.d) { faces.push(['right', b.x, cx - b.x, 1, bi, 'xmin']); faces.push(['left', b.x + b.w, b.x + b.w - cx, 1, bi, 'xmax']); } });
  const near = it.wside ? faces.find(q => q[0] === it.wside && !q[3]) : faces.filter(q => (far ? q[2] > -0.5 : Math.abs(q[2]) <= 3)).sort((a, b) => Math.abs(a[2]) - Math.abs(b[2]))[0]; if (!near) { it.on = null; return; }   // a chosen wall wins
  const [sd, at, , blk, bi, face] = near; it.on = blk ? { b: bi, face } : { side: sd };   // a parapet side: the panel's back to it; a block: its face
  if (sd === 'back' || sd === 'front') { it.rot = sd === 'back' ? 0 : 180; it.x = r2(cx - it.w / 2); it.z = blk ? (sd === 'front' ? at - it.d : at) : (sd === 'back' ? at : at - it.d); }
  else { it.rot = sd === 'left' ? 270 : 90; it.z = r2(cz - it.w / 2); it.x = blk ? (sd === 'right' ? at - it.d : at) : (sd === 'left' ? at : at - it.d); }
  if (it.wside) { const f2 = foot(it); it.x = r2(Math.max(p, Math.min(t.pw - p - f2[0], it.x))); it.z = r2(Math.max(p, Math.min(t.pd - p - f2[1], it.z))); }   // kept on the plot along its wall
}
// 244 phase 2: a roof of any shape — its walls (straight outline edges, the parapet's inside face) and its inner corners, for the setup rules
function olOn() { const t = S.site; return t.kind === 'terrace' && Array.isArray(t.outline) && t.outline.length >= 3; }
function olWalls() { if (!olOn()) return null; const t = S.site, O = P2.outline(t), p = P0(), W = [];
  O.forEach((a, i) => { const b = O[(i + 1) % O.length], vert = Math.abs(a[0] - b[0]) < 0.05, hor = Math.abs(a[1] - b[1]) < 0.05; if (!vert && !hor) return; const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    const dir = vert ? (P2.inPolyP(O, mx + 0.3, mz) ? 1 : -1) : (P2.inPolyP(O, mx, mz + 0.3) ? 1 : -1);   // which way the terrace is
    W.push({ vert, dir, at: (vert ? a[0] : a[1]) + dir * p, lo: Math.min(vert ? a[1] : a[0], vert ? b[1] : b[0]), hi: Math.max(vert ? a[1] : a[0], vert ? b[1] : b[0]) }); });
  return W; }
function olTouch(r, e) {   // which sides of rect r stand against a wall of the outline
  const W = olWalls(), ov = (a0, a1, b0, b1) => a0 < b1 - 0.5 && a1 > b0 + 0.5, o = { L: false, R: false, Bk: false, F: false };
  W.forEach(w => { if (w.vert) { if (!ov(r.z, r.z + r.d, w.lo, w.hi)) return; if (w.dir > 0 && Math.abs(r.x - w.at) < e) o.L = true; if (w.dir < 0 && Math.abs(r.x + r.w - w.at) < e) o.R = true; }
    else { if (!ov(r.x, r.x + r.w, w.lo, w.hi)) return; if (w.dir > 0 && Math.abs(r.z - w.at) < e) o.Bk = true; if (w.dir < 0 && Math.abs(r.z + r.d - w.at) < e) o.F = true; } });
  return o; }
function olCorners() {   // inner corners of two walls (convex, 90°): [key, X, Z] at the parapet's inside face; key bl / br / fl / fr = which way the terrace opens
  const t = S.site, O = P2.outline(t), p = P0(), out = [];
  O.forEach((q, i) => { const a = O[(i + O.length - 1) % O.length], b = O[(i + 1) % O.length]; if (!((Math.abs(a[0] - q[0]) < 0.05 || Math.abs(a[1] - q[1]) < 0.05) && (Math.abs(b[0] - q[0]) < 0.05 || Math.abs(b[1] - q[1]) < 0.05))) return;
    const ins = [[1, 1], [-1, 1], [1, -1], [-1, -1]].filter(([sx, sz]) => P2.inPolyP(O, q[0] + sx * 0.3, q[1] + sz * 0.3)); if (ins.length !== 1) return;
    const [sx, sz] = ins[0]; out.push([(sz > 0 ? 'b' : 'f') + (sx > 0 ? 'l' : 'r'), q[0] + sx * p, q[1] + sz * p]); });
  return out; }
// 193c: a parapet side's free runs (cut corners trimmed; cabins, blocks and tall things standing against it left out)
const SIDE_AX = { back: 'x', front: 'x', left: 'z', right: 'z' };
function parRuns(side, skip, kinds) {
  const t = S.site, p = P0(), C = (t.kind === 'terrace' && t.cuts) || {}, ax = SIDE_AX[side], len = ax === 'x' ? t.pw : t.pd;
  const cutAt = k => { const c = C[k]; return c && (c.type === 'notch' || c.type === 'slant') ? (ax === 'x' ? +c.a : +c.b) || 0 : 0; };
  const ends = { back: ['bl', 'br'], front: ['fl', 'fr'], left: ['bl', 'fl'], right: ['br', 'fr'] }[side];
  let runs = [[p + cutAt(ends[0]) + (cutAt(ends[0]) ? p : 0), len - p - cutAt(ends[1]) - (cutAt(ends[1]) ? p : 0)]];
  if (t.kind === 'terrace' && Array.isArray(t.outline) && t.outline.length >= 3) {   // 244: any shape — the side's wall = the outline edges lying on it (a cut breaks it)
    const O = P2.outline(t), lv = { back: 0, front: t.pd, left: 0, right: t.pw }[side], cz = ax === 'x' ? 1 : 0, ca = ax === 'x' ? 0 : 1;
    runs = O.map((q, i) => [q, O[(i + 1) % O.length]]).filter(([a, b]) => Math.abs(a[cz] - lv) < 0.05 && Math.abs(b[cz] - lv) < 0.05).map(([a, b]) => [Math.min(a[ca], b[ca]) + p, Math.max(a[ca], b[ca]) - p]).filter(([u0, u1]) => u1 - u0 >= 1); }
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
  else if (it.mode === 'tank') it.segs = roofScreen();   // 241: along the stairs room's roof edge (projection), over same-height rooms next to it
  else if (it.mode === 'ac') { const b = (S.site.kind === 'terrace' ? S.site.blocks : []).find(x => x.id === it.bid); delete it.segs;
    it.box = b ? { x: b.x - 0.3, z: b.z - 0.3, w: b.w + 0.6, d: b.d + 0.6, h: 2.9 } : null; if (b) { it.x = it.box.x; it.z = it.box.z; it.w = it.box.w; it.d = it.box.d; it.h = 2.9; } return; }
  else { delete it.segs; return; }
  it.w = Math.round(it.segs.reduce((a, g) => a + Math.hypot(g.x1 - g.x0, g.z1 - g.z0), 0) * 2) / 2; it.d = 0.3; it.x = 0; it.z = 0; it.rot = 0;
}
// 241: the screen on the stairs room runs along its roof edge (not just round the tanks). A room of the same height next to it is roofed together, so the screen
// carries on over it; a lower room → the screen turns at the edge; a taller one → it stops at that wall. Nothing on the side against the parapet (the back).
function roofScreen() { const t = S.site; if (t.kind !== 'terrace') return []; const m = t.blocks.find(b => b.type === 'mumty'); if (!m) return [];
  const H = b => +b.h > 0 ? +b.h : ({ mumty: 9, lift: 11, shaft: 3, room: 9 }[b.type] || 9), hm = H(m), P = P0(), q = 0.5;
  const tou = (a, b) => a.x <= b.x + b.w + 0.3 && b.x <= a.x + a.w + 0.3 && a.z <= b.z + b.d + 0.3 && b.z <= a.z + a.d + 0.3;
  const U = [m]; for (let gr = true; gr;) { gr = false; t.blocks.forEach(b => { if (U.includes(b) || !['room', 'lift', 'mumty'].includes(b.type) || Math.abs(H(b) - hm) > 0.5) return; if (U.some(u => tou(u, b))) { U.push(b); gr = true; } }); }
  const inB = (x, z, bs) => bs.some(b => x > b.x - 0.01 && x < b.x + b.w + 0.01 && z > b.z - 0.01 && z < b.z + b.d + 0.01), tall = t.blocks.filter(b => !U.includes(b) && H(b) > hm + 0.5 && b.type !== 'ac');
  const x0 = Math.min(...U.map(b => b.x)), x1 = Math.max(...U.map(b => b.x + b.w)), z0 = Math.min(...U.map(b => b.z)), z1 = Math.max(...U.map(b => b.z + b.d));
  const I0 = Math.floor(x0 / q), I1 = Math.ceil(x1 / q), J0 = Math.floor(z0 / q), J1 = Math.ceil(z1 / q), inU = (i, j) => inB((i + 0.5) * q, (j + 0.5) * q, U);
  const away = (x, z) => x < P + 1.5 || x > t.pw - P - 1.5 || z < P + 1.5 || z > t.pd - P - 1.5, H2 = {}, V2 = {}; let par = false;
  for (let j = J0; j < J1; j++) for (let i = I0; i < I1; i++) { if (!inU(i, j)) continue;
    [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([di, dj]) => { if (inU(i + di, j + dj)) return; const ox = (i + di + 0.5) * q, oz = (j + dj + 0.5) * q;
      if (away(ox, oz)) { par = true; return; } if (inB(ox, oz, tall)) return;
      if (dj) { const z = (dj < 0 ? j : j + 1) * q; (H2[z] = H2[z] || []).push([i * q, (i + 1) * q, dj]); } else { const x = (di < 0 ? i : i + 1) * q; (V2[x] = V2[x] || []).push([j * q, (j + 1) * q, di]); } }); }
  const run = (M, hor) => { const out = []; Object.keys(M).forEach(k => { const L = M[k].sort((a, b) => a[0] - b[0]); let cur = null; L.forEach(e => { if (cur && Math.abs(cur[1] - e[0]) < 0.01 && cur[2] === e[2]) cur[1] = e[1]; else { if (cur) out.push([+k, cur]); cur = e.slice(); } }); if (cur) out.push([+k, cur]); });
    return out.filter(([, e]) => e[1] - e[0] >= 1).map(([c, e]) => hor ? { x0: e[0], z0: c, x1: e[1], z1: c, out: [0, e[2]] } : { x0: c, z0: e[0], x1: c, z1: e[1], out: [e[2], 0] }); };
  let segs = run(H2, true).concat(run(V2, false));
  if (!par) { const dx = t.pw / 2 - (m.x + m.w / 2), dz = t.pd / 2 - (m.z + m.d / 2), bo = Math.abs(dx) / t.pw > Math.abs(dz) / t.pd ? [dx > 0 ? -1 : 1, 0] : [0, dz > 0 ? -1 : 1]; segs = segs.filter(sg => !(sg.out[0] === bo[0] && sg.out[1] === bo[1])); }   // no parapet behind it: skip the side away from the terrace
  return segs.map(sg => ({ x0: sg.x0, z0: sg.z0, x1: sg.x1, z1: sg.z1, y: hm + 0.35 })); }
function tankBack() {   // 239: sides of the tank screen nobody sees: 0 back (z min), 1 right, 2 front, 3 left — those against the parapet, else the one facing away from the terrace
  const t = S.site, b = t.kind === 'terrace' && t.blocks.find(x => x.type === 'mumty'); if (!b) return []; const p = P0(), e = 1.5;
  const near = [b.z - p < e ? 0 : -1, t.pw - p - (b.x + b.w) < e ? 1 : -1, t.pd - p - (b.z + b.d) < e ? 2 : -1, b.x - p < e ? 3 : -1].filter(k => k >= 0);
  if (near.length) return near.slice(0, 2);
  const dx = t.pw / 2 - (b.x + b.w / 2), dz = t.pd / 2 - (b.z + b.d / 2); return [Math.abs(dx) / t.pw > Math.abs(dz) / t.pd ? (dx > 0 ? 3 : 1) : (dz > 0 ? 0 : 2)]; }
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
  const gx = olOn() ? [] : [[r.x - p, -1], [t.pw - p - (r.x + r.w), 1]], gz = olOn() ? [] : [[r.z - p, -1], [t.pd - p - (r.z + r.d), 1]];
  if (olOn()) olWalls().forEach(w => { if (w.vert) { if (!ov(r.z, r.z + r.d, w.lo, w.hi)) return; if (w.dir > 0 && w.at <= r.x + 0.01) gx.push([r.x - w.at, -1]); if (w.dir < 0 && w.at >= r.x + r.w - 0.01) gx.push([w.at - (r.x + r.w), 1]); }
    else { if (!ov(r.x, r.x + r.w, w.lo, w.hi)) return; if (w.dir > 0 && w.at <= r.z + 0.01) gz.push([r.z - w.at, -1]); if (w.dir < 0 && w.at >= r.z + r.d - 0.01) gz.push([w.at - (r.z + r.d), 1]); } });   // 244: the walls of any shape
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
  const c = CAT[it.cat]; if (!c || it.old || it.pipe) return null; const k = [it.cat, it.w, it.d, it.h, it.pw || '', it.sku || '', it.cfgId || '', JSON.stringify(it.cfg || '')].join('|'); if (PC[k]) return PC[k];
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
#plOv .pl-subar{position:sticky;bottom:0;z-index:3;background:linear-gradient(transparent,#F7F3EC 35%);padding:16px 0 calc(8px + env(safe-area-inset-bottom));margin-top:10px}#plOv .pl-subar .pl-go{width:100%;padding:15px;margin:0}
#plOv .pl-subig button i{font-style:normal;font-size:28px}#plOv .pl-col3{flex-direction:column}#plOv .pl-col3 button{flex-direction:row;justify-content:flex-start;gap:14px;text-align:left;padding:14px}#plOv .pl-col3 button b{font-size:16px}#plOv .pl-col3 button small{display:block}
#plOv .pl-cdir{display:grid;grid-template-columns:repeat(3,46px);gap:6px;margin:6px 0 4px}#plOv .pl-cdir button{height:40px;border-radius:10px;border:1.5px solid #E3DCD2;background:#fff;font:700 16px Inter,system-ui,sans-serif;color:#2E2E2E}#plOv .pl-cdir button.on{border-color:#C26445;background:#FBEDE7;color:#C26445}#plOv .pl-cdir button[aria-label=auto]{font-size:11px}#plOv .pl-cdh{display:block;color:#8A8278;font-size:11.5px;margin-bottom:4px}#plOv .pl-cab{background:#fff;border:1px solid #E7DDCF;border-radius:14px;padding:12px;margin:12px 0}#plOv .pl-cab>b{display:block;font-size:14px;margin:4px 0 8px}
#plOv .pl-looks{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:0 0 12px}#plOv .pl-looks button{border:1.5px solid #E2D6C4;background:#fff;border-radius:12px;padding:6px 2px 8px;font:600 11.5px inherit;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px}#plOv .pl-looks button.on{border-color:#C26445;background:#FFF8F2}#plOv .pl-lk{display:block;width:100%;height:28px;border-radius:8px}
#plOv .pl-lk-modern{background:linear-gradient(90deg,#2E2E2E 0 30%,#B9B8B4 30% 75%,#3A4A5A 75%)}#plOv .pl-lk-natural{background:linear-gradient(90deg,#A8784C 0 30%,#D8C9A8 30% 75%,#8A9A5B 75%)}#plOv .pl-lk-moroccan{background:radial-gradient(circle,#1F6F7E 0 4px,transparent 5px) 0 0/10px 10px,#F2E2C8}#plOv .pl-lk-tropical{background:linear-gradient(90deg,#F1EDE4 0 30%,#C98B63 30% 75%,#2E7D5B 75%)}
#plOv .pl-su{position:absolute;inset:0;z-index:20;background:#F7F3EC;overflow:auto;display:none}#plOv .pl-suh{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:10px;padding:10px 14px;background:#fff;border-bottom:1px solid #E2D6C4}#plOv .pl-suh b{flex:1;font-size:15px}#plOv .pl-suh button{border:1px solid #ddd;background:#fff;border-radius:50%;width:36px;height:36px;font-size:16px;cursor:pointer}
#plOv .pl-sub2{max-width:640px;margin:0 auto;padding:18px 16px 40px}#plOv .pl-sub2 h2{font-size:24px;margin:6px 0 14px}#plOv .pl-dots{display:flex;gap:5px;margin-bottom:8px}#plOv .pl-dots i{flex:1;height:4px;border-radius:4px;background:#E2D6C4}#plOv .pl-dots i.on{background:#C26445}
#plOv .pl-sumood{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}#plOv .pl-sumood button{display:flex;flex-direction:column;align-items:center;gap:6px;border:1.5px solid #E2D6C4;background:#fff;border-radius:16px;padding:18px 8px;cursor:pointer;font-family:inherit}#plOv .pl-sumood i{font-style:normal;font-size:34px}.pl-ab3d{height:min(58vh,520px);border-radius:14px;overflow:hidden;background:#EDE7DC;margin:6px 0 12px;position:relative}.pl-ab3d canvas{width:100%!important;height:100%!important}.pl-3d{position:relative}.pl-tabs3{position:absolute;left:8px;right:60px;top:8px;z-index:6;display:none;gap:6px;overflow-x:auto;scrollbar-width:none}.pl-tabs3 button{flex:none;display:flex;align-items:center;gap:6px;border:1px solid #E2DACD;background:rgba(255,255,255,.95);border-radius:18px;padding:6px 10px;font:600 12.5px Inter,system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.08)}.pl-tabs3 button.on{background:#2E2E2E;color:#fff;border-color:#2E2E2E}.pl-tabs3 .ico{color:currentColor}.pl-tabs3 button i{font-style:normal;margin-left:2px;opacity:.6;padding:0 2px}.pl-pop{position:absolute;z-index:7;display:none;background:#fff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.18);padding:8px 10px;min-width:160px}.pl-pop b{display:block;font-size:12px;color:#7A7268;margin:0 0 6px}.pl-pop button{border:0;background:#C26445;color:#fff;border-radius:16px;padding:7px 12px;font:600 13px Inter,system-ui,sans-serif;cursor:pointer}.pl-pop .pl-popx{position:absolute;right:4px;top:4px;background:none;color:#7A7268;padding:2px 6px}.pl-rmr{display:flex;flex-direction:column;gap:6px;padding:10px 0;border-bottom:1px solid #EEE7DC}.pl-rmr>span{display:flex;align-items:center;gap:8px;font-weight:600;font-size:14px}.pl-rmr>span i{font-size:22px;font-style:normal}.pl-rmr .pl-subig{margin:0}.pl-floors{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pl-floors button{border:1.5px solid #E2DACD;background:#fff;border-radius:14px;padding:8px 8px 10px;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:4px}.pl-floors button.on{border-color:#C26445;background:#FFF7F2}.pl-floors .flthumb{width:100%;height:auto;border-radius:8px;display:block}.pl-floors b{font-size:14px}.pl-floors small{font-size:11.5px;color:#7A7268;line-height:1.35}.pl-swr{display:flex;flex-wrap:wrap;gap:10px;margin:4px 0 12px}.pl-swr button{border:0;background:none;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;padding:0}.pl-swr i{width:38px;height:38px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #D6D2C7}.pl-swr .on i{box-shadow:0 0 0 2px #C26445}.pl-swr small{font-size:11px;color:#5B544B}.pl-magic{min-height:70vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px}.pl-magic h2{margin:14px 0 6px}.pl-mgo{font-size:46px;color:#C26445;animation:plmg 1.6s ease-in-out infinite}.pl-mgo .ico{color:#C26445}@keyframes plmg{0%,100%{transform:scale(1) rotate(0)}50%{transform:scale(1.15) rotate(12deg)}}.pl-mgl{color:#5B544B;min-height:2.6em;transition:opacity .18s;margin:0 0 14px;max-width:300px}.pl-mgb{width:220px;height:4px;border-radius:4px;background:#EADCC8;overflow:hidden}.pl-mgb i{display:block;height:100%;width:40%;background:#C26445;border-radius:4px;animation:plmgb 1.3s ease-in-out infinite}@keyframes plmgb{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}.ico{width:1em;height:1em;display:inline-block;vertical-align:-.15em;color:#55634A}#plOv .pl-sumood b{font-size:14px}#plOv .pl-sumood button.on{border-color:#C26445;background:#FFF8F2}
#plOv .pl-subig{display:flex;flex-wrap:wrap;gap:10px}#plOv .pl-subig button{flex:1;min-width:120px;border:1.5px solid #E2D6C4;background:#fff;border-radius:14px;padding:16px 10px;font:600 15px inherit;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px}#plOv .pl-subig button b{font-size:22px}#plOv .pl-subig small{color:#7A7268;font-size:12px}#plOv .pl-subig button.on{border-color:#C26445;background:#FFF8F2}
#plOv .pl-sw{display:block;width:44px;height:30px;border-radius:6px;border:1px solid #D4CEC4}#plOv .pl-sw-p{background:#EFEBE4 repeating-linear-gradient(0deg,transparent 0 14px,#D4CEC4 14px 15px),repeating-linear-gradient(90deg,transparent 0 14px,#D4CEC4 14px 15px)}#plOv .pl-sw-m{background:radial-gradient(circle at 50% 50%,#2F6F7E 0 5px,transparent 6px) 0 0/15px 15px,#F3EEE6}
#plOv .pl-sun{position:relative;margin:28px auto 34px;max-width:70%;max-height:42vh;background:#EADCC8;border:4px solid #9B8E7E;border-radius:6px}#plOv .pl-sun span{position:absolute;bottom:-26px;left:0;right:0;text-align:center;font:700 12px inherit;color:#8a3a1f}#plOv .pl-sn{position:absolute;width:42px;height:42px;border-radius:50%;border:2px dashed #9B8E7E;background:#fff;font-weight:800;cursor:pointer}#plOv .pl-sn.on{background:#C26445;color:#fff;border:2px solid #C26445}#plOv .pl-sn-back{top:-22px;left:calc(50% - 21px)}#plOv .pl-sn-front{bottom:-22px;left:calc(50% - 21px)}#plOv .pl-sn-left{left:-22px;top:calc(50% - 21px)}#plOv .pl-sn-right{right:-22px;top:calc(50% - 21px)}
#plOv .pl-elw{display:flex;flex-direction:column;gap:4px}#plOv .pl-elw>button{width:100%}#plOv .pl-cnt{display:flex;align-items:center;justify-content:center;gap:10px}#plOv .pl-els2 .pl-cnt button{padding:0;width:30px;height:30px;border-radius:50%;border:1.5px solid #E3DCD2;background:#fff;font:inherit;font-size:16px;cursor:pointer}#plOv .pl-cnt b{min-width:14px;text-align:center}#plOv .pl-lays{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 12px}#plOv .pl-lays button{border:1.5px solid #E3DCD2;background:#fff;border-radius:12px;padding:6px;display:flex;flex-direction:column;align-items:center;gap:2px;font:inherit;cursor:pointer}#plOv .pl-lays button.on{border-color:#C26445;box-shadow:0 0 0 2px #C2644533}#plOv .pl-lays span{display:block;width:100%;height:120px}#plOv .pl-lays svg{width:100%;height:100%;pointer-events:none}#plOv .pl-lays b{font-size:13px}#plOv .pl-lays small{font-size:10.5px;color:#7A7268;text-align:center;line-height:1.2}#plOv .pl-su2d{height:min(62vh,640px);margin:4px 0 10px;touch-action:pan-y;position:relative}#plOv .pl-su2d.mv,#plOv .pl-su2d.mv *{touch-action:none}#plOv .pl-su2d.mv{outline:2px dashed #C26445;outline-offset:2px;border-radius:6px}#plOv .pl-tb{position:absolute;z-index:6;display:flex;gap:2px;align-items:stretch;background:#2E2E2E;border-radius:12px;padding:4px;box-shadow:0 6px 18px rgba(0,0,0,.28);touch-action:manipulation}#plOv .pl-tb button{background:none;border:0;color:#fff;font:600 11px Inter,system-ui,sans-serif;padding:6px 8px;border-radius:8px;display:flex;flex-direction:column;align-items:center;gap:1px;min-width:44px;cursor:pointer}#plOv .pl-tb button i{font-style:normal;font-size:16px;line-height:1.1}#plOv .pl-tb button.on{background:#C26445}#plOv .pl-tb button.ok{background:#55634A}#plOv .pl-tb .pl-tbn{color:#EADCC8;font:700 11px Inter,system-ui,sans-serif;padding:0 6px 0 4px;display:flex;align-items:center;max-width:92px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#plOv .pl-szp{background:#fff;border:1.5px solid #C26445;border-radius:14px;padding:6px 12px;margin:0 0 10px}#plOv .pl-szr{display:flex;align-items:center;gap:10px;padding:8px 0}#plOv .pl-szr+.pl-szr{border-top:1px solid #F0EAE0}#plOv .pl-szr .pl-sza{width:30px;height:30px;border-radius:8px;background:#FBEDE7;color:#C26445;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex:none}#plOv .pl-szr .pl-szl{flex:1;font-weight:700;font-size:14px;line-height:1.2}#plOv .pl-szr .pl-szl small{display:block;font-weight:400;color:#8A8278;font-size:11.5px}#plOv .pl-szr button{width:40px;height:40px;border-radius:12px;border:1.5px solid #E3DCD2;background:#fff;font-size:20px;flex:none;touch-action:manipulation}#plOv .pl-szr em{font-style:normal;font-weight:800;font-size:15px;min-width:58px;text-align:center}#plOv .pl-sued{display:flex;align-items:center;gap:6px;flex-wrap:wrap;background:#fff;border:1.5px solid #C26445;border-radius:14px;padding:8px 10px;margin:0 0 10px}#plOv .pl-sued b{font-size:13px;margin-right:4px}#plOv .pl-sued span{font-size:12px;color:#7A7268}#plOv .pl-sued em{font-style:normal;font-weight:700;min-width:22px;text-align:center}#plOv .pl-sued button{width:36px;height:36px;border-radius:50%;border:1.5px solid #E2D6C4;background:#fff;font-size:16px;cursor:pointer}
#plOv .pl-sucs{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 12px}#plOv .pl-sucs button{border:1.5px solid #E2D6C4;background:#fff;border-radius:999px;padding:8px 12px;font:600 13px inherit;font-family:inherit;cursor:pointer}#plOv .pl-sucs button.on{border-color:#C26445;background:#FFF8F2}#plOv .pl-sunext{width:100%;margin-top:14px;padding:14px}#plOv .pl-sucs{flex-wrap:wrap}
#plOv .pl-moods{display:flex;gap:8px;overflow-x:auto;padding:2px 0 12px;margin:0 0 4px;scrollbar-width:none}#plOv .pl-moods button{flex:none;display:flex;align-items:center;gap:6px;border:1.5px solid #E2D6C4;background:#fff;border-radius:999px;padding:8px 14px;font:600 13px inherit;font-family:inherit;cursor:pointer;white-space:nowrap}#plOv .pl-moods button.on{border-color:#C26445;background:#C26445;color:#fff}#plOv .pl-moods i{font-style:normal}
#plOv .pl-els2 button{position:relative;padding:12px 4px 10px}#plOv .pl-els2 i{font-size:26px}#plOv .pl-els2 em{position:absolute;top:4px;right:6px;font-style:normal;font-size:11px;font-weight:700;color:#C26445}
#plOv .pl-cnts{display:grid;grid-template-columns:1fr auto auto auto;align-items:center;gap:6px 8px;margin:12px 0 0;font-size:13px}#plOv .pl-cnts button{width:34px;height:34px;border-radius:50%;border:1px solid #C9BBA6;background:#fff;font-size:17px;cursor:pointer}#plOv .pl-cnts b{min-width:22px;text-align:center}
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
    '<div class="pl-bd"><div class="pl-3d"><div class="pl-tabs3" id="plT3"></div><div id="pl3d"></div><div class="pl-pop" id="plPop"></div><div class="pl-z" id="plZ"></div></div><div class="pl-side"><div class="pl-pn" id="plPn"></div><div class="pl-ft" id="plFt"></div></div></div>';
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
  if (Array.isArray(t.outline) && t.outline.length >= 3) L.push(['Shape', 'Your roof\'s outline', '<p class="pl-h">' + t.outline.length + ' corners — change it on the roof plan (✏ Shape)</p>']); else
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
    h += `<div class="pl-ed"><h4>${c.e} ${esc(sel.label || c.t)}</h4>`; const T = { size: '', place: '', design: '' };   // 202: one kind at a time — Size · Place · Design tabs
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
    if ((sel.cat === 'cabin' || sel.cat === 'pergola') && window.mtoFromPlan && !(S.su && S.su.done)) T.design += `<button type="button" class="pl-design" data-pl="design">✎ ${sel.cfg ? 'Change it' : 'Customise it'} in the ${sel.cat === 'cabin' ? 'cabin' : 'pergola'} designer<small>${sel.cat === 'cabin' ? 'walls, doors, rooms, finishes' : 'finish, colour, roof, layout, add-ons'} — on this terrace; "Save to my plan" brings it back</small></button>`;
    if (sel.cat === 'pergola' && !sel.lock) { T.size += pm('h', 'Height', sel.h); T.design += `<label style="display:flex;gap:8px;align-items:center;font-size:13px;margin:6px 0"><input type="checkbox" data-pl="pdeck"${sel.deck ? ' checked' : ''}> Deck floor under it (as high as a porta cabin's)</label>` + (sel.att && sel.att.length ? '<p class="pl-sub" style="margin:2px 0 6px">Fixed to the wall on ' + sel.att.length + ' side' + (sel.att.length > 1 ? 's' : '') + ' — no posts there' + (sel.hAuto !== false && S.items.some(o => o.cat === 'cabin') ? '; height and deck matched to the cabin' : '') + '.</p>' : ''); }
    if (sel.cat === 'graffiti') T.size += `<label class="pl-ck" style="display:flex;gap:8px;align-items:center;font-size:13px;margin:6px 0"><input type="checkbox" data-pl="gfit"${sel.fit !== false ? ' checked' : ''}> Fit the whole wall it's on${sel.open ? ' (door left open)' : ''}</label>`;
    if (!att(sel) && c.kind !== 'edge' && !sel.lock) T.place += '<p class="pl-h" style="margin-top:6px">Against a wall? <small style="font-weight:400;color:#7A7268">it stays on it when moved</small></p><div class="pl-tabs">' + [['free', 'Free'], ['left', 'Left'], ['right', 'Right'], ['back', 'Back'], ['front', 'Front']].map(([k2, l2]) => btn(`data-pl="wside:${k2}"`, (sel.wside || 'free') === k2, l2)).join('') + '</div>';
    T.design += `<p style="margin:10px 0 0;font-size:14px">${fp && fp.price != null ? (lock ? '🔒 Price after sign-in' : 'From <b>' + rs(fp.price) + '</b>') : fp && fp.soon ? 'Coming soon' : 'Our team will price it'} <small style="color:#7A7268">· ${fp ? fp.n : 0} designs</small></p>`;
    const look = !!(S.su && S.su.done && S.site.kind === 'terrace');   // 239: after the setup the 3D only shows — sizes and places change on the 2D plan
    if (look) { T.size = ''; T.place = ''; T.design = '<p class="pl-sub" style="margin:0 0 8px">Sizes and places change on the 2D plan.</p>' + T.design; }
    { const tabs = [['size', 'Size'], ['place', 'Place'], ['design', 'Design & price']].filter(([k]) => T[k]); if (!T[S.edTab]) S.edTab = tabs.length ? tabs[0][0] : 'size';
      if (tabs.length > 1) h += '<div class="pl-etabs">' + tabs.map(([k, l]) => btn(`data-pl="etab:${k}"`, S.edTab === k, l)).join('') + '</div>'; h += '<div class="pl-epane">' + (T[S.edTab] || '') + '</div>'; }
    if (look) h += '<div class="pl-act"><button type="button" data-pl="plan2d">📐 Change on the 2D plan</button><button type="button" data-pl="done" style="margin-left:auto;background:#2E2E2E;color:#fff;border:0">Done</button></div></div>';
    else h += '<div class="pl-act">' + (att(sel) ? '' : `<button type="button" data-pl="lock">${sel.lock ? '🔓 Unlock' : '🔒 Lock'}</button>`) + (!sel.lock && (c.kind === 'free' || c.kind === 'floor') && sel.mode !== 'ac' ? '<button type="button" data-pl="rot">↻ Turn</button>' : '') + (att(sel) || sel.lock ? '' : '<button type="button" data-pl="dup">⧉ Copy</button>') + (sel.lock ? '' : '<button type="button" data-pl="del">🗑 Remove</button>') + '<button type="button" data-pl="done" style="margin-left:auto;background:#2E2E2E;color:#fff;border:0">Done</button></div></div>';
    if (S.msg) h += `<div class="pl-msg">${esc(S.msg)}</div>`;
    return h;
  }
  if (S.ask === 'privacy') return '<div class="pl-ed"><h4>🎋 Privacy screen — where does it go?</h4><div class="pl-ask">' +
    '<button type="button" data-pl="pmode:par"><b>' + (S.site.kind === 'terrace' ? 'On the parapet' : 'On the boundary wall') + '</b><small>Raised above your parapet on the sides you pick — set round cabins, the mumty and the like</small></button>' +
    '<button type="button" data-pl="pmode:part"><b>As a partition</b><small>A free-standing screen to split the space — drag it where you want</small></button>' +
    (mumtyTanks() ? '<button type="button" data-pl="pmode:tank"><b>Hide the water tanks</b><small>A screen round the tanks on the mumty roof</small></button>' : '') +
    '</div><div class="pl-act"><button type="button" data-pl="askx">Cancel</button></div></div>';
  if (!S.items.length && !S.bskip) return builder();
  if (S.su && S.su.done && S.site.kind === 'terrace') h += '<p class="pl-h" style="margin-top:0">The look</p><div class="pl-looks">' + Object.keys(THEME_T).map(k => `<button type="button" data-pl="look:${k}" class="${(S.su.theme || 'natural') === k ? 'on' : ''}"><i class="pl-lk pl-lk-${k}"></i>${THEME_T[k][0]}</button>`).join('') + '</div>' + '<button type="button" class="pl-design" data-pl="plan2d">📐 Change the layout<small>Move, resize or remove things on the 2D plan — or answer the questions again</small></button>';
  else if (S.bnote) h += '<div class="pl-note">✓ Placed where our terraces have them — drag anything to move it.</div>';
  h += '<h4>Add more</h4><p class="pl-sub">Tap to add · move things on the 2D plan (📐)</p>';
  if (lock) h += '<button type="button" class="pl-lock" data-pl="unlock">🔒 Sign in to see prices</button>';
  if (S.msg) h += `<div class="pl-msg">${esc(S.msg)}</div>`;
  const sets = SETUPS.filter(x => !x.lawn || S.site.kind !== 'terrace');
  if (!S.items.length) h += '<p class="pl-h">Start from a setup</p><div class="pl-set">' + sets.map(x => `<button type="button" data-pl="setup:${x.k}"><i>${x.e}</i><b>${esc(x.t)}</b><small>${esc(x.d)}</small></button>`).join('') + '</div><p class="pl-h">Or add one by one</p>';
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
  const n = { back: [0, -1], front: [0, 1], left: [-1, 0], right: [1, 0] }[(S.su || {}).north], sw = n ? [-(-n[1]) - n[0], -(n[0]) - n[1]] : null;   // 234: west = −east, east = (−n.z, n.x); south = −north
  return { t, M, side, far, facing, open, road, door, dz: dz0, fr, P: P0(), sw: sw ? [sw[0] / Math.SQRT2, sw[1] / Math.SQRT2] : null };
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
function builder() {   // 231: one screen — a mood ticks things, tap tiles to change, "Set it up" places them where our terraces have them
  const terr = S.site.kind === 'terrace', B = S.bsel || {};
  const sets = SETUPS.filter(x => !x.lawn || !terr), cats = CATS.filter(c => (!c.lawn || !terr) && (designs(c).length || c.always) && (c.k !== 'accover' || terr) && !['railing', 'gate', 'chair', 'table', 'graffiti', 'bench', 'sculpture'].includes(c.k));
  const n = Object.values(B).reduce((p, q) => p + q, 0), many = k => k === 'planter' || k === 'lights';
  let h = '<h4>What do you want on it?</h4>';
  h += '<div class="pl-moods">' + sets.map(x => `<button type="button" class="${S.bth === x.k ? 'on' : ''}" data-pl="theme:${x.k}" aria-pressed="${S.bth === x.k}"><i>${x.e}</i>${esc(x.t)}</button>`).join('') + '</div>';
  h += '<div class="pl-els pl-els2">' + cats.map(c => { const v = B[c.k] || 0;
    return `<button type="button" class="${v ? 'on' : ''}" data-pl="bel:${c.k}" aria-pressed="${!!v}"><i>${c.e}</i><b>${esc(c.t)}</b>${v ? `<em>✓${many(c.k) ? ' ' + v : ''}</em>` : ''}</button>`; }).join('') + '</div>';
  const mk = Object.keys(B).filter(many); if (mk.length) h += '<div class="pl-cnts">' + mk.map(k => `<span>${CAT[k].e} ${esc(CAT[k].t)}</span><button type="button" data-pl="bcnt:${k}:-1">−</button><b>${B[k]}</b><button type="button" data-pl="bcnt:${k}:1">+</button>`).join('') + '</div>';
  h += `<div class="pl-bgo"><button type="button" class="pl-tsq" data-pl="bskip">Skip</button><button type="button" class="pl-go" data-pl="build"${n ? '' : ' disabled'}>✨ Set it up${n ? ' (' + n + ')' : ''}</button></div>`;
  if (S.msg) h += `<div class="pl-msg">${esc(S.msg)}</div>`;
  return h;
}
// 234: terrace setup on a blank screen — mood → what → how many people → north → floor (grass / tiles) → the 2D plan (drag, size, 📏) → See it in 3D.
// Structures stay locked; things move only on the 2D plan (the 3D only shows). Changing an answer sets it all up again.
const SUQ = ['have', 'existing', 'remove', 'asbuilt', 'ab3d', 'mood', 'want', 'cabin', 'bar', 'fbs', 'wtr', 'ftr', 'gfw', 'seats', 'floor', 'north', 'eplan', 'e3d', 'decor', 'green', 'lights', 'plan'];   // 245 (owner): round 1 roof → round 2 the big pieces (eplan) → round 3 furniture, plants, lamps (plan)
// 246 (owner): round 1 also asks what is ALREADY built on the roof (kept as 'Existing' things on the plan, never priced) and what is to be taken down
const HAVE = [['pergola', 'Pergola'], ['bar', 'Bar counter'], ['cabin', 'Cabin / room'], ['planter', 'Built-in planters'], ['fbench', 'Fixed seating'], ['jacuzzi', 'Pool / jacuzzi'], ['water', 'Water feature'], ['deck', 'Deck'], ['privacy', 'Privacy screen']];
const FLOOR0 = [['cement', 'Cement / PCC', 'raw, plastered'], ['tiles', 'Tiles', 'ceramic / vitrified'], ['kota', 'Kota stone', 'grey-green stone slabs'], ['marble', 'Marble / granite', 'polished stone']];
const DECOR = new Set(['sofa', 'swing', 'dining', 'chair', 'table', 'stool', 'firepit', 'sculpture', 'jacuzzi', 'umbrella', 'lights', 'planter']);
// 245: four floor looks (owner) — the tiles, grass and patterned 'rugs' they lay
const FLOORS = [['garden', 'Garden walk', 'Soft grass with stepping stones, a Moroccan-tile patch where you sit, plain tiles around'], ['courtyard', 'Moroccan courtyard', 'Plain tiles with Moroccan pattern under every seating area, like rugs'],
  ['greek', 'Greek terrace', 'Cream terrazzo-look floor with a sage border — calm and airy'], ['geometric', 'Modern geometric', 'Plain tiles laid in a pattern — two-tone checks with a dark border']];
const THEME_T = { modern: ['Modern', 'grey'], natural: ['Natural', 'stone'], moroccan: ['Moroccan', 'moroccan'], tropical: ['Tropical', 'terracotta'] };
const CAB_USE = ['Lounge', 'WFH office', 'Gym', 'Bedroom', 'Guest room', 'Home theatre', 'Yoga studio', 'Kids\' play', 'Bar lounge', 'Store room'];
let SUEL = null;
function suNeed() { return S.step === 1 && S.site.kind === 'terrace' && !S.items.length && !S.bskip && !(S.su && S.su.done); }
function suOpen(q) { S.su = Object.assign({ q: 0, pg: '5-8', cs: '3-4', north: '', turf: null, green: 'balanced', light: 'soft', stairs: 'keep', roomRef: null, cab: [], theme: 'natural', walls: 'paint', tankHas: null, tankScr: true, shaft: 'keep', have: {}, rm: {}, floor0: 'cement', pipes: null, pipeScr: true }, S.su || {}); if (q != null) S.su.q = q; S.su.on = true;
  if (!SUEL) { SUEL = document.createElement('div'); SUEL.className = 'pl-su'; EL.appendChild(SUEL); SUEL.addEventListener('click', suClick); SUEL.addEventListener('pointerdown', suDown); SUEL.addEventListener('pointermove', suMove); SUEL.addEventListener('pointerup', suUp); SUEL.addEventListener('pointercancel', suCancel); SUEL.addEventListener('touchmove', e => { if (SUD && SUD.drag) e.preventDefault(); }, { passive: false }); }
  SUEL.style.display = 'block'; suPaint(); }
function suClose() { if (SUEL) SUEL.style.display = 'none'; if (S.su) S.su.on = false; draw(false); setTimeout(() => { try { S3.resize(); S3.home(); } catch (e) {} }, 60); }
function suSkip(q) { const B = S.bsel || {}; if (q === 'remove') return !suRemList().length;
  if ((q === 'fbs' && !B.fbench) || (q === 'wtr' && !B.water) || (q === 'ftr' && !B.feature) || (q === 'gfw' && !B.graffiti)) return true;
  return (q === 'cabin' && !B.cabin) || (q === 'bar' && !B.bar) || (q === 'seats' && !B.cabin && !B.pergola); }
function suStep(d) { const su = S.su; let q = su.q + d; while (q > 0 && q < SUQ.length - 1 && suSkip(SUQ[q])) q += d; su.q = Math.max(0, Math.min(SUQ.length - 1, q)); }
const CAB_GLZ = [['solid', 'Solid', 'Porta cabin, windows'], ['mostly', 'Mostly glass', 'Glass front, solid sides'], ['glass', 'All glass', 'Glass house']], CAB_SKU = { solid: /PORTA/, mostly: /HYBRID/, glass: /GLASS/ }, CAB_ROT = { front: 0, left: 90, back: 180, right: 270 };
function prodName(sk, d) { return ((PR()[sk] || {}).n || d || '').replace(/ —.*$/, ''); }   // 256: outside compose (it has its own PR = pergola rects)
function cabSkuFor(g) { const re = CAB_SKU[g] || CAB_SKU.mostly; return cabinSkus().find(s => re.test(s) && !/-TRI?$/.test(s)) || cabinSkus().find(s => re.test(s)) || null; }
function suCab() { const su = S.su, n = (S.bsel || {}).cabin || 0; su.cab = (su.cab || []).slice(0, n); while (su.cab.length < n) su.cab.push({ use: [], pantry: false, wash: false }); return su.cab; }
function suBars() { const su = S.su, n = (S.bsel || {}).bar || 0; su.bars = (su.bars || []).slice(0, n); while (su.bars.length < n) su.bars.push('straight'); return su.bars; }
const suArr = (key, n, dflt) => { const su = S.su; su[key] = (su[key] || []).slice(0, n); while (su[key].length < n) su[key].push(dflt); return su[key]; };   // 247: one answer per thing
const WMECH = [['cascade', 'Cascade', 'water steps down stone tiers'], ['wall', 'Wall fall', 'a sheet of water down a wall'], ['rain', 'Rain curtain', 'fine streams from a top bar'], ['geyser', 'Geyser jets', 'jets rising from a pebble pool']];
const FDES = [['fluted', 'Fluted panel', 'fluted wall, warm cove light, a planter strip at its foot'], ['stone', 'Stone & creeper', 'stone cladding, wall washers, a climbing creeper'], ['slats', 'Backlit slats', 'wooden slats with a warm glow behind'], ['green', 'Half green', 'half living wall, half plaster with spot lights']];
function gWalls() {   // 247: walls graffiti can go on — the stairs room's faces (not its door) and the parapets that are not on the road
  const t = S.site, g = geo(), L = [], M = (t.blocks || []).find(b => b.type === 'mumty');
  if (M) [['left', 'left side'], ['right', 'right side'], ['back', 'back'], ['front', 'front']].forEach(([f, nm]) => { if (f === g.door) return; const len = f === 'left' || f === 'right' ? M.d : M.w; if (len < 5) return; L.push(['m:' + f, 'Stairs room — ' + nm]); });
  ['back', 'left', 'right'].filter(sd => !g.road.includes(sd)).forEach(sd => L.push(['p:' + sd, sd[0].toUpperCase() + sd.slice(1) + ' parapet wall'])); return L; }
function suPgs() { const su = S.su, n = (S.bsel || {}).pergola || 0; su.pgs = (su.pgs || []).slice(0, n); while (su.pgs.length < n) su.pgs.push(su.pg || '5-8'); return su.pgs; }
// 246: what can be taken down — old things built on the roof, rooms / shafts / lift room, tiles on the walls, the floor
function suRemList() { const su = S.su || {}, L = [], hv = su.have || {}, t = S.site; HAVE.forEach(([k, tt]) => { if (hv[k]) L.push({ k: 'old_' + k, t: 'Existing ' + tt.toLowerCase() + (hv[k] > 1 ? ' (' + hv[k] + ')' : ''), ic: k }); });
  (t.blocks || []).concat(t.gone || []).forEach(b => { if (b.type === 'mumty' || b.type === 'ac') return; L.push({ k: 'blk_' + b.id, t: (b.pent ? 'Penthouse' : { room: 'Room', shaft: 'Shaft', lift: 'Lift room' }[b.type] || b.type) + ' ' + Math.round(b.w) + ' × ' + Math.round(b.d) + ' ft', ic: b.type === 'room' ? 'room' : b.type }); });
  if (su.walls === 'tiles') L.push({ k: 'walltiles', t: 'Tiles on the walls', ic: 'brick' }); if (['tiles', 'kota', 'marble'].includes(su.floor0)) L.push({ k: 'floor0', t: 'The floor (' + (FLOOR0.find(z => z[0] === su.floor0) || [0, ''])[1] + ')', ic: 'tiles' });
  return L; }
function suOld() {   // 249: what is already built (and kept) placed once on the plan; placed again only when those answers change
  const su = S.su; suRemApply(); if (su.oldPlaced && !su.oldDirty) return; S.items = S.items.filter(o => !o.old);
  const OB = {}; HAVE.forEach(([k]) => { const n = (su.have || {})[k]; if (n && !su.rm['old_' + k]) OB[k] = n; });
  if (Object.keys(OB).length) { const keep = S.items; S.items = []; compose({ B: OB, phase: 'old' }); S.items.forEach(o => { o.old = true; o.label = 'Existing ' + (CAT[o.cat] ? CAT[o.cat].t.toLowerCase() : o.cat); }); let np = 0; S.items = S.items.filter(o => o.cat !== 'planter' || ++np <= (OB.planter || 0)).concat(keep); }
  su.oldPlaced = true; su.oldDirty = false; save(); }
function suRemApply() {   // blocks marked 'take down' leave the roof (kept aside in site.gone so 'Keep' brings them back)
  const t = S.site, su = S.su; if (t.kind !== 'terrace') return; t.gone = t.gone || []; const all = t.blocks.concat(t.gone);
  t.blocks = all.filter(b => !su.rm['blk_' + b.id]); t.gone = all.filter(b => su.rm['blk_' + b.id]); }
function shV(b) { return b.h != null && b.h !== '' && isFinite(+b.h) ? +b.h : 3; }   // 252: a shaft can be flush (0) or 6 in high
function shH(b) { const v = shV(b); return v === 0 ? '0 in (flush)' : v < 1 ? Math.round(v * 12) + ' in' : v + ' ft'; }
function pOpen(M, f) { const t = S.site, s = 1, r = f === 'left' ? { x: M.x - s, z: M.z, w: s, d: M.d } : f === 'right' ? { x: M.x + M.w, z: M.z, w: s, d: M.d } : f === 'back' ? { x: M.x, z: M.z - s, w: M.w, d: s } : { x: M.x, z: M.z + M.d, w: M.w, d: s };   // 253: a face with open terrace in front (not a wall of the next room)
  return inside(r) && !(t.blocks || []).some(b => b !== M && b.type !== 'ac' && hit(r, b)); }
function pFaces() { const door = geo().door, M = (S.site.blocks || []).find(b => b.type === 'mumty'); return [['left', 'Left'], ['right', 'Right'], ['back', 'Back (away from road)'], ['front', 'Front (road side)']].filter(f => !M || pOpen(M, f[0])).map(f => f[0] === door ? [f[0], f[1] + ' — door side'] : f); }
function pFace() { const su = S.su; if (su.pipeFace) return su.pipeFace; return suPipes(true) || ''; }
function suPipes(dry) {   // 246: the stairs-room face with the open pipes (not the door, facing the terrace) + an openable cover in front if asked
  const t = S.site, su = S.su, M = (t.blocks || []).find(b => b.type === 'mumty'), keepP = t.pipes; t.pipes = null; if (!M || !su.pipes) { if (dry) t.pipes = keepP; return; }
  const door = geo().door, faces = [['left', M.x, M.z + M.d / 2], ['right', M.x + M.w, M.z + M.d / 2], ['back', M.x + M.w / 2, M.z], ['front', M.x + M.w / 2, M.z + M.d]].filter(f => f[0] !== door && pOpen(M, f[0]) && inside({ x: f[1] - 1, z: f[2] - 1, w: 2, d: 2 }) && (f[0] === 'left' ? M.x > P0() + 2 : f[0] === 'right' ? M.x + M.w < t.pw - P0() - 2 : f[0] === 'back' ? M.z > P0() + 2 : M.z + M.d < t.pd - P0() - 2));
  const all = [['left', M.x, M.z + M.d / 2], ['right', M.x + M.w, M.z + M.d / 2], ['back', M.x + M.w / 2, M.z], ['front', M.x + M.w / 2, M.z + M.d]], f = (su.pipeFace && pOpen(M, su.pipeFace) && all.find(x => x[0] === su.pipeFace)) || faces.sort((a, b) => Math.hypot(a[1] - t.pw / 2, a[2] - t.pd / 2) - Math.hypot(b[1] - t.pw / 2, b[2] - t.pd / 2))[0]; if (dry) { t.pipes = keepP; return f ? f[0] : ''; } if (!f) return; t.pipes = { face: f[0], cover: !!su.pipeScr };
  if (!su.pipeScr) return; const w = 3, d = 0.5, it = { cat: 'privacy', label: 'Pipe cover (opens)', pipe: true, h: 8, w, d, rot: { left: 90, right: 270, back: 180, front: 0 }[f[0]] };
  if (f[0] === 'left') { it.x = M.x - d; it.z = M.z + M.d / 2 - w / 2; } else if (f[0] === 'right') { it.x = M.x + M.w; it.z = M.z + M.d / 2 - w / 2; } else if (f[0] === 'back') { it.x = M.x + M.w / 2 - w / 2; it.z = M.z - d; } else { it.x = M.x + M.w / 2 - w / 2; it.z = M.z + M.d; }
  if (it.rot % 180) { it.x = f[0] === 'left' ? M.x - d : M.x + M.w; it.z = M.z + M.d / 2 - w / 2; } S.items.push(it); }
function suCompose(ph) {   // a fresh setup from the answers — 245: ph 'el' = round 2 (the big pieces), 'decor' = round 3 on the kept layout, 'all' / none = both
  ph = ph || 'all'; if (ph === 'all') { suCompose('el'); return suCompose('decor'); }
  const su = S.su; S.sel = null; S.bsel = Object.assign({}, S.bsel || {}); S.bsel.pathway = 1; S.bsel.feature = S.bsel.feature || 1; delete S.bsel.planter;
  if (ph === 'decor') { const keep = S.items.filter(o => !DECOR.has(o.cat) || o.old); S.items = keep; const BD = {}; Object.keys(S.bsel).forEach(k => { if (DECOR.has(k) && k !== 'planter') BD[k] = S.bsel[k]; });
    let lay = null; try { lay = (TM.layout ? TM.layout(S.site, 14) : [])[0] || null; } catch (e) {} S.site.light = su.light === 'none' ? '' : su.light;
    compose({ lay, B: BD, phase: 'decor' }); floorRugs(); su.ddirty = false; su.decorDone = true; S.bskip = true; ev('plan_build', { ref: 'decor', n: S.items.length }); draw(true); return; }
  S.items = S.items.filter(o => o.old); su.decorDone = false;   // 249: the existing things stay where they were put
  if (su.turf === true) S.bsel.turf = 1; else if (su.turf === false) delete S.bsel.turf;
  S.site.floor = { tile: su.flr === 'keep' ? ({ tiles: 'plain', kota: 'kota', marble: 'marble' }[su.floor0] || 'cement') : su.flr === 'greek' ? 'terrazzo' : su.flr === 'geometric' ? 'checker' : (THEME_T[su.theme] || THEME_T.natural)[1], pebble: 'near', preset: su.flr || 'garden', border: su.flr === 'greek' || su.flr === 'geometric' }; S.site.light = su.light === 'none' ? '' : su.light; S.site.refurb = { stairs: su.stairs, room: su.roomRef }; S.site.wallFin = su.walls === 'tiles' && su.rm.walltiles ? 'paint' : su.walls || 'none'; S.site.floor0 = su.rm.floor0 ? 'cement' : su.floor0 || 'cement'; S.site.remove = Object.keys(su.rm || {}).filter(k => su.rm[k]); S.site.wallTile = su.walls === 'tiles' ? Object.assign({ k: 'brick', c: 'red' }, su.wtile || {}) : undefined; S.site.tankScreen = su.tankHas === true && !su.tankScr ? 'existing' : '';
  // 241 (owner): ONE setup — the closest LifeWall layout that has the wanted things, then the rules
  const B = S.bsel, want = k => ({ cabin: B.cabin, pergola: B.pergola, turf: B.turf, deck: B.deck, seating: B.sofa || B.fbench || B.dining, fbench: B.fbench || B.sofa, bar: B.bar, counter: B.counter || B.bar, jacuzzi: B.jacuzzi, water: B.water })[k];
  let lay = null; try { lay = (TM.layout ? TM.layout(S.site, 14) : []).map((L, r) => ({ L, n: L.els.filter(e => e.length > 3 && want(e[0])).length, r })).filter(z => z.n).sort((a, b) => b.n - a.n || a.r - b.r).map(z => z.L)[0] || null; } catch (e) { lay = null; }
  const BE = {}; Object.keys(S.bsel).forEach(k => { if (!DECOR.has(k)) BE[k] = S.bsel[k]; });
  suOld(); S.items = S.items.filter(o => o.old);   // 246 / 249: what is already built (and kept) stands first — where the customer put it on 'as it stands'
  suPipes(); compose(Object.assign({ B: BE, phase: 'el' }, lay ? { lay } : {}));
  if (su.tankScr && mumtyTanks() && !S.items.some(o => o.mode === 'tank')) { const it2 = { cat: 'privacy', mode: 'tank', label: 'Screen on the stairs room', h: 4.5, w: 0, d: 0.3, x: 0, z: 0, rot: 0 }; S.items.push(it2); attach(it2, S.items.length - 1); if (!it2.w) S.items.pop(); }
  if (su.shaft === 'new' || su.shaft === 'change') (S.site.blocks || []).filter(b => b.type === 'shaft').forEach(b => S.items.push({ cat: 'shaftcover', mode: 'shaft', label: 'Shaft cover', x: b.x, z: b.z, w: b.w, d: b.d, h: (+b.h || 3) + 0.4, rot: 0 }));
  su.opts = null; su.dirty = false; floorRugs();
 S.bskip = true; ev('plan_build', { ref: S.bth || 'own', n: S.items.length }); draw(true); }
function suPlan() { const su = S.su, t = S.site, rd = ['front'].concat(t.road_back ? ['back'] : [], t.corner ? [t.corner] : []).filter(x => t.road_front !== false || x !== 'front');
  return P2.svg(t, { items: S.items, measure: !!su.meas, sel: S.sel != null ? { k: 'it', i: S.sel } : null, grp: S.sel != null ? grpOf(S.sel) : null, wl: S.sel != null && S.suSz ? S.sel : null, north: su.north, road: rd }); }
function suPaint() { if (S.magic) return;
  const su = S.su, q = SUQ[su.q], B = S.bsel || {}, terr = S.site.kind === 'terrace', chip = (k, on, tx) => `<button type="button" data-su="${k}" class="${on ? 'on' : ''}" aria-pressed="${!!on}">${tx}</button>`;
  const big = (k, on, e, t, sm) => chip(k, on, `<i>${e}</i><b>${t}</b>${sm ? `<small>${sm}</small>` : ''}`), next = (tx, dis) => `<div class="pl-subar"><button type="button" class="pl-go" data-su="next"${dis ? ' disabled' : ''}>${tx || 'Next →'}</button></div>`;
  let h = `<div class="pl-suh"><button type="button" data-su="back" aria-label="Back">←</button><b>Set up your terrace</b><button type="button" data-su="x" aria-label="Close">✕</button></div><div class="pl-sub2"><div class="pl-dots">${SUQ.filter(z => !suSkip(z)).map(z => `<i class="${SUQ.indexOf(z) <= su.q ? 'on' : ''}"></i>`).join('')}</div>`;
  if (q === 'mood') h += '<h2>What is it for?</h2><div class="pl-sumood">' + SETUPS.filter(x => !x.lawn || !terr).map(x => `<button type="button" data-su="mood:${x.k}" class="${S.bth === x.k ? 'on' : ''}"><i>${x.e}</i><b>${esc(x.t)}</b></button>`).join('') + `<button type="button" data-su="mood:"><i>${P2.ico('choose')}</i><b>I'll choose</b></button></div>` + (Object.keys(B).length ? '<p class="pl-sub" style="margin-top:10px">Picking another mood starts the list again.</p>' + next('Keep my picks →') : '');   // 255: coming back here doesn't force a new mood
  else if (q === 'want') { const LY = S.site && S.site.layout;   // 243: what the architect proposed on the customer's own drawing comes ticked
    if (LY && !su.layTicked) { su.layTicked = true; const M = { seating: 'sofa', planter: null, turf: null }; (LY.proposed || []).forEach(k => { const c = k in M ? M[k] : k; if (k === 'turf') su.turf = true; if (c && CAT[c]) S.bsel[c] = S.bsel[c] || 1; }); if (LY.north && !su.north) su.north = LY.north; } const cats = CATS.filter(c => (!c.lawn || !terr) && (designs(c).length || c.always) && (c.k !== 'accover' || terr) && !['railing', 'gate', 'pathway', 'turf', 'lights', 'planter', 'shaftcover', 'bench'].includes(c.k) && !DECOR.has(c.k) && (c.k !== 'rack' || B.bar));   // 245: round 2 = the big pieces only (bench = fixed seating)
    h += (LY && (LY.proposed || []).length ? '<p class="pl-sub" style="margin:0 0 6px">📄 Ticked from your drawing — change anything.</p>' : '') + '<h2>What do you want?</h2><div class="pl-els pl-els2">' + cats.map(c => { const v = B[c.k] || 0; return `<div class="pl-elw"><button type="button" data-su="bel:${c.k}" class="${v ? 'on' : ''}"><i>${c.e}</i><b>${esc(c.t)}</b>${v ? '<em>✓</em>' : ''}</button>${v ? `<div class="pl-cnt"><button type="button" data-su="bcnt:${c.k}:-1" aria-label="One less">−</button><b>${v}</b><button type="button" data-su="bcnt:${c.k}:1" aria-label="One more">+</button></div>` : ''}</div>`; }).join('') + '</div><p class="pl-sub" style="margin-top:12px">Furniture, plants and lamps come after the layout.</p>' + next('', !Object.keys(B).filter(k => !DECOR.has(k)).length); }
  else if (q === 'decor') { const cats = CATS.filter(c => DECOR.has(c.k) && !['planter', 'chair', 'table'].includes(c.k) && (designs(c).length || c.always) && (c.k !== 'stool' || B.bar));
    h += '<h2>Furniture & finishing touches</h2><p class="pl-sub">Round 3 — what goes on your layout.</p><div class="pl-els pl-els2">' + cats.map(c => { const v = B[c.k] || 0; return `<div class="pl-elw"><button type="button" data-su="bel:${c.k}" class="${v ? 'on' : ''}"><i>${c.e}</i><b>${esc(c.k === 'lights' ? 'Garden lamps' : c.t)}</b>${v ? '<em>✓</em>' : ''}</button>${v ? `<div class="pl-cnt"><button type="button" data-su="bcnt:${c.k}:-1" aria-label="One less">−</button><b>${v}</b><button type="button" data-su="bcnt:${c.k}:1" aria-label="One more">+</button></div>` : ''}</div>`; }).join('') + '</div>' + next(); }
  else if (q === 'cabin') { const cb = suCab(); h += '<h2>Your cabin' + (cb.length > 1 ? 's' : '') + '</h2><div class="pl-cnts"><span>🏠 How many cabins</span><button type="button" data-su="ncab:-1">−</button><b>' + cb.length + '</b><button type="button" data-su="ncab:1">+</button></div>';
    cb.forEach((c, i) => { h += `<div class="pl-cab"><b>Cabin ${cb.length > 1 ? i + 1 : ''} — what for?</b><div class="pl-sucs">` + CAB_USE.map(u => chip(`cuse:${i}:${u}`, c.use.includes(u), esc(u))).join('') + `</div><b>Inside it</b><div class="pl-sucs">` + chip(`cin:${i}:pantry`, c.pantry, '🍳 Pantry') + chip(`cin:${i}:wash`, c.wash, '🚿 Washroom') + '</div>' +
      '<b>Walls</b><div class="pl-sucs">' + CAB_GLZ.map(z => chip(`cglz:${i}:${z[0]}`, (c.glaze || 'mostly') === z[0], `${z[1]}<small style="display:block;font-weight:400;font-size:11px;color:#8A8278">${z[2]}</small>`)).join('') + '</div>' +
      '<b>Entrance faces</b><div class="pl-cdir">' + [['', ''], ['back', '↑'], ['', ''], ['left', '←'], ['auto', 'Auto'], ['right', '→'], ['', ''], ['front', '↓'], ['', '']].map(z => z[0] ? `<button type="button" data-su="cdoor:${i}:${z[0]}" class="${(c.door || 'auto') === z[0] ? 'on' : ''}" aria-label="${z[0]}">${z[1]}</button>` : '<i></i>').join('') + '</div><small class="pl-cdh">↑ back wall · ↓ road side · Auto = facing the open terrace</small></div>'; });   // 256 (owner): solid / mostly glass / all glass + which way the door faces
    h += next(); }
  else if (q === 'bar') { const bs = suBars(); h += '<h2>Your bar counter' + (bs.length > 1 ? 's' : '') + '</h2><p class="pl-sub">Room on both sides — by a wall, the seating or the pergola.</p>';
    bs.forEach((v, i) => { h += `<p class="pl-h">Bar counter${bs.length > 1 ? ' ' + (i + 1) : ''}</p><div class="pl-subig">` + big(`bshape:${i}:straight`, v === 'straight', P2.ico('straight'), 'Straight') + big(`bshape:${i}:L`, v === 'L', P2.ico('lshape'), 'L-shape') + big(`bshape:${i}:curve`, v === 'curve', P2.ico('curve'), 'Curved') + '</div>'; });
    h += next(); }
  else if (q === 'fbs') { const fs = suArr('fbs', B.fbench || 0, 'L'); h += '<h2>Your fixed seating</h2><p class="pl-sub">Built in, against the walls.</p>';
    fs.forEach((v, i) => { h += `<p class="pl-h">Seating${fs.length > 1 ? ' ' + (i + 1) : ''}</p><div class="pl-subig pl-col3">` + big(`fbs:${i}:straight`, v === 'straight', P2.ico('straight'), 'Straight') + big(`fbs:${i}:L`, v === 'L', P2.ico('lshape'), 'L-shape') + big(`fbs:${i}:curve`, v === 'curve', P2.ico('curve'), 'Curved') + '</div>'; }); h += next(); }
  else if (q === 'wtr') { const ws = suArr('wm', B.water || 0, 'cascade'); h += '<h2>Your water feature</h2><p class="pl-sub">How should the water move?</p>';
    ws.forEach((v, i) => { h += `${ws.length > 1 ? `<p class="pl-h">Water feature ${i + 1}</p>` : ''}<div class="pl-subig">` + WMECH.map(z => big(`wm:${i}:${z[0]}`, v === z[0], P2.ico('water'), z[1], z[2])).join('') + '</div>'; }); h += next(); }
  else if (q === 'ftr') { const fs = suArr('fd', B.feature || 0, 'fluted'); h += '<h2>Your feature wall</h2><p class="pl-sub">Each one with warm light and a bit of green.</p>';
    fs.forEach((v, i) => { h += `${fs.length > 1 ? `<p class="pl-h">Feature wall ${i + 1}</p>` : ''}<div class="pl-subig">` + FDES.map(z => big(`fd:${i}:${z[0]}`, v === z[0], P2.ico('feature'), z[1], z[2])).join('') + '</div>'; }); h += next(); }
  else if (q === 'gfw') { const W = gWalls(), gs = suArr('gw', B.graffiti || 0, (W[0] || [''])[0]); h += '<h2>Where does the graffiti go?</h2>';
    gs.forEach((v, i) => { h += `${gs.length > 1 ? `<p class="pl-h">Graffiti ${i + 1}</p>` : ''}<div class="pl-subig pl-col">` + W.map(z => chip(`gw:${i}:${z[0]}`, v === z[0], esc(z[1]))).join('') + '</div>'; }); h += next(); }
  else if (q === 'seats') { h += '<h2>How many people?</h2>'; const pgs = suPgs();
    pgs.forEach((v, i) => { h += `<p class="pl-h">Sitting under the pergola${pgs.length > 1 ? ' ' + (i + 1) : ''}</p><div class="pl-subig">` + [['2-4', '2 – 4'], ['5-8', '5 – 8'], ['9-12', '9 – 12'], ['12+', '12 +']].map(z => chip(`pg:${z[0]}:${i}`, v === z[0], `<b>${z[1]}</b>`)).join('') + '</div>'; });
    if (B.cabin) h += '<p class="pl-h">In the cabin</p><div class="pl-subig">' + [['1-2', '1 – 2'], ['3-4', '3 – 4'], ['5-8', '5 – 8']].map(z => chip('cs:' + z[0], su.cs === z[0], `<b>${z[1]}</b>`)).join('') + '</div>';
    h += next(); }
  else if (q === 'have') { const hv = su.have || (su.have = {});
    h += '<h2>Already built on the roof?</h2><p class="pl-sub">Anything that stands there now — you place it on the plan later. Nothing? Just press Next.</p><div class="pl-els pl-els2">' + HAVE.map(([k, t]) => { const v = hv[k] || 0; return `<div class="pl-elw"><button type="button" data-su="hv:${k}" class="${v ? 'on' : ''}"><i>${P2.ico(k)}</i><b>${esc(t)}</b>${v ? '<em>✓</em>' : ''}</button>${v ? `<div class="pl-cnt"><button type="button" data-su="hvc:${k}:-1" aria-label="One less">−</button><b>${v}</b><button type="button" data-su="hvc:${k}:1" aria-label="One more">+</button></div>` : ''}</div>`; }).join('') + '</div>' + next(); }
  else if (q === 'asbuilt') { suOld();   // 249 (owner): the roof as it stands — 2D (drag the existing things to where they really are), then 3D, before anything new
    h += '<h2>Your roof as it stands</h2><p class="pl-sub">' + (S.items.some(o => o.old) ? 'Drag the existing things to where they really are.' : 'What is built on it now — check it before we plan.') + '</p>' + (S.msg ? `<div class="pl-msg">${esc(S.msg)}</div>` : '') + `<div class="pl-su2d${S.suMv && S.sel != null ? ' mv' : ''}">${suPlan()}${suPopHtml()}</div>` + suSzHtml() +
      '<div class="pl-sucs">' + chip('roof', false, '✎ Change the roof') + '</div>' + next('See it in 3D →'); }
  else if (q === 'e3d') h += '<h2>Your layout in 3D</h2><p class="pl-sub">The big pieces as you set them — next, furniture and plants.</p><div id="suab3d" class="pl-ab3d"></div>' + next('Next: furniture & plants →');   // 251 (owner): see round 2 in 3D before round 3
  else if (q === 'ab3d') { suOld(); h += '<h2>Your roof in 3D</h2><p class="pl-sub">As it stands today — next, what you want on it.</p><div id="suab3d" class="pl-ab3d"></div>' + next('Looks right →'); }
  else if (q === 'remove') { const L = suRemList();
    h += '<h2>Keep or take down?</h2><p class="pl-sub">What we take down is gone from your new design (and our team adds the dismantling).</p>' + L.map(z => `<div class="pl-rmr"><span><i>${P2.ico(z.ic)}</i>${esc(z.t)}</span><div class="pl-subig">${chip('rm:' + z.k + ':0', !su.rm[z.k], 'Keep')}${chip('rm:' + z.k + ':1', !!su.rm[z.k], 'Take down')}</div></div>`).join('') + next(); }
  else if (q === 'existing') { const bl = S.site.blocks || [];
    h += '<h2>What is already there</h2><p class="pl-h">The floor now</p><div class="pl-subig">' + FLOOR0.map(z => big('fl0:' + z[0], su.floor0 === z[0], P2.ico(z[0] === 'cement' ? 'none' : z[0] === 'tiles' ? 'tiles' : 'brick'), z[1], z[2])).join('') + '</div>' +
      (bl.some(b => b.type === 'mumty') ? '<p class="pl-h">Plumbing pipes open on the stairs-room wall?</p><div class="pl-subig">' + chip('pipes:1', su.pipes === true, 'Yes') + chip('pipes:0', su.pipes === false, 'No') + '</div>' + (su.pipes ? '<p class="pl-h">Which wall of the stairs room are they on?</p><div class="pl-subig">' + pFaces().map(f => chip('pface:' + f[0], pFace() === f[0], f[1])).join('') + '</div>' : '') + (su.pipes ? '<p class="pl-h">Hide them behind a cover that opens (for repairs)?</p><div class="pl-subig">' + chip('pscr:1', su.pipeScr === true, 'Yes, cover them') + chip('pscr:0', su.pipeScr === false, 'Leave them') + '</div>' : '') : '') +
      (bl.some(b => b.type === 'shaft') ? '<p class="pl-h">Shaft height' + (bl.filter(b => b.type === 'shaft').length > 1 ? 's' : '') + '</p>' + bl.map((b, i) => b.type !== 'shaft' ? '' : `<div class="pl-cnts"><span>${P2.ico('shaft')} Shaft ${bl.filter(x => x.type === 'shaft').indexOf(b) + 1}</span><button type="button" data-su="shh:${i}:-1">−</button><b>${shH(b)}</b><button type="button" data-su="shh:${i}:1">+</button></div>`).join('') : '') +
      '<p class="pl-h">The walls — stairs room, parapet and the rest</p><div class="pl-subig">' + big('walls:paint', su.walls === 'paint', P2.ico('roller'), 'Paint') + big('walls:tiles', su.walls === 'tiles', P2.ico('brick'), 'Tiles / cladding') + big('walls:none', su.walls === 'none', P2.ico('check'), 'Nothing') + '</div>';
    if (su.walls === 'tiles') { const wt = su.wtile || (su.wtile = { k: 'brick', c: 'red' });   // 245 (owner): which tiles are on the walls now, and their colour — the 3D shows them
      h += '<p class="pl-h">Which tiles?</p><div class="pl-subig">' + [['brick', 'Brick look'], ['t22', 'Plain 2 × 2 ft'], ['t24', 'Plain 2 × 4 ft'], ['stone', 'Stone cladding']].map(z => chip('wtk:' + z[0], wt.k === z[0], z[1])).join('') + '</div>' +
        '<p class="pl-h">Keep these tiles?</p><div class="pl-subig">' + chip('wrm:0', !su.rm.walltiles, 'Keep them') + chip('wrm:1', !!su.rm.walltiles, 'Take them off') + '</div>' + '<p class="pl-h">Their colour</p><div class="pl-swr">' + Object.keys(WT_COL).map(c => `<button type="button" data-su="wtc:${c}" class="${wt.c === c ? 'on' : ''}" aria-label="${WT_COL[c][1]}" title="${WT_COL[c][1]}"><i style="background:${WT_COL[c][0]}"></i><small>${WT_COL[c][1]}</small></button>`).join('') + '</div>'; }
    if (bl.some(b => b.type === 'mumty') && S.site.tanks !== false) { h += '<p class="pl-h">Is there a screen round the water tanks now?</p><div class="pl-subig">' + chip('thas:0', su.tankHas === false, 'No screen') + chip('thas:1', su.tankHas === true, 'Yes, there is one') + '</div>';   // 238
      if (su.tankHas === false) h += '<p class="pl-h">Add a screen to hide them?</p><div class="pl-subig">' + chip('tscr:1', su.tankScr === true, 'Yes, add one') + chip('tscr:0', su.tankScr === false, 'No') + '</div>';
      else if (su.tankHas === true) h += '<p class="pl-h">Change it?</p><div class="pl-subig">' + chip('tscr:0', su.tankScr === false, 'Keep it') + chip('tscr:1', su.tankScr === true, 'Replace with a new one') + '</div>'; }
    if (bl.some(b => b.type === 'mumty')) h += '<p class="pl-h">The staircase room</p><div class="pl-subig">' + big('stairs:keep', su.stairs === 'keep', P2.ico('check'), 'Keep as is') + big('stairs:door', su.stairs === 'door', P2.ico('door'), 'New door') + big('stairs:refurb', su.stairs === 'refurb', P2.ico('brush'), 'Refurbish', 'door, cladding, paint') + '</div>';
    if (bl.some(b => b.type === 'shaft')) h += '<p class="pl-h">The shaft' + (bl.filter(b => b.type === 'shaft').length > 1 ? 's' : '') + ' — a cover on top?</p><div class="pl-subig">' + big('shaft:keep', su.shaft === 'keep', P2.ico('check'), 'Keep as is') + big('shaft:change', su.shaft === 'change', P2.ico('refresh'), 'Change the cover') + big('shaft:new', su.shaft === 'new', P2.ico('plusbox'), 'New cover', 'MS frame + white polycarbonate') + '</div>';   // 241
    if (bl.some(b => b.type === 'room')) h += '<p class="pl-h">The room / washroom on the roof — refurbish it?</p><div class="pl-subig">' + chip('rref:1', su.roomRef === true, 'Yes, refurbish') + chip('rref:0', su.roomRef === false, 'No, keep it') + '</div>';
    h += next(); }
  else if (q === 'green') h += '<h2>How much greenery?</h2><div class="pl-subig pl-col3">' + big('green:light', su.green === 'light', P2.ico('sprout'), 'A little', 'a few plants in the corners') + big('green:balanced', su.green === 'balanced', P2.ico('planter'), 'Balanced', 'corners, a wall of plants, a green wall') + big('green:lush', su.green === 'lush', P2.ico('lush'), 'Lush', 'thick greenery all round') + '</div>' + next();
  else if (q === 'lights') h += '<h2>Lights for the evenings?</h2><div class="pl-subig pl-col3">' + big('light:none', su.light === 'none', P2.ico('sun'), 'No lights', 'only daytime use') + big('light:soft', su.light === 'soft', P2.ico('moon'), 'Soft & warm', 'pergola profile, cove lights, plant spikes') + big('light:full', su.light === 'full', P2.ico('sparkle'), 'All lit up', '+ wall lights and screen downlights') + '</div>' + next();
  else if (q === 'floor') h += '<h2>The floor</h2><p class="pl-sub">Pick a look — we lay it out round your layout.</p><div class="pl-floors">' + (['tiles', 'kota', 'marble'].includes(su.floor0) && !su.rm.floor0 ? [['keep', 'Keep my floor', 'The ' + (FLOOR0.find(z => z[0] === su.floor0) || [0, 'floor'])[1].toLowerCase() + ' stays as it is']] : []).concat(FLOORS).map(z => `<button type="button" data-su="flr:${z[0]}" class="${su.flr === z[0] ? 'on' : ''}">${P2.floorThumb(z[0])}<b>${z[1]}</b><small>${z[2]}</small></button>`).join('') + '</div>' + (su.flr ? next() : '');   // 255: coming back, Next keeps the pick
  else if (q === 'north') { const t = S.site; h += '<h2>Which side is north?</h2><p class="pl-sub">Tap the side — the seating goes where the afternoon sun is softer.</p>' +
      `<div class="pl-sun" style="aspect-ratio:${t.pw}/${t.pd}">${['back', 'left', 'right', 'front'].map(sd => `<button type="button" data-su="north:${sd}" class="pl-sn pl-sn-${sd}${su.north === sd ? ' on' : ''}">N</button>`).join('')}<span>▼ road</span></div>` +
      '<div class="pl-subig">' + chip('north:', false, 'Not sure') + '</div>' + (su.north ? next() : ''); }
  else { const it = S.sel != null ? S.items[S.sel] : null;
    h += q === 'eplan' ? '<h2>Your layout</h2><p class="pl-sub" style="margin:-4px 0 6px">Round 2 of 3 — the big pieces. Furniture and plants come next.</p>' : '<h2>Your setup</h2>';
    h += `<p class="pl-sub">${it ? (S.suMv ? 'Drag it to where you want · ✓ Done when finished' : 'Tap ✥ Move to drag it · ✓ Done when finished') : 'Tap a thing to change it · swipe to scroll'}</p>` + (S.msg ? `<div class="pl-msg">${esc(S.msg)}</div>` : '') + `<div class="pl-su2d${S.suMv && S.sel != null ? ' mv' : ''}">${suPlan()}${suPopHtml()}</div>` + suSzHtml();   // 254: toolbar over the picked thing
    h += '<div class="pl-sucs">' + chip('meas', !!su.meas, '📏 Measurements') + chip('again', false, '↺ Set up again') + chip('roof', false, '✎ Change the roof') + '</div>' +
      (q === 'eplan' ? `<div class="pl-subar"><button type="button" class="pl-go" data-su="next">See it in 3D →</button></div>` : `<div class="pl-subar"><button type="button" class="pl-go" data-su="done">See my design in 3D →</button></div>`); }
  SUEL.innerHTML = h + '</div>'; if (S.sel != null) requestAnimationFrame(suPopPlace);
  if (q === 'ab3d' || q === 'e3d') setTimeout(() => { const el = document.getElementById('suab3d'); if (!el) return; try { S3.show(el, { site: S.site, items: S.items, sel: null, cabinCfg, cabinLay, pergolaSku: 'MTO-PG-TW', noDrag: true, theme: (S.su && S.su.theme) || 'natural' }, { view: '3d', on: () => {} }); /* 255: taps here stay here (the planner's own handler redrew the main 3D and took the canvas away → blank) */ setTimeout(() => { try { S3.resize(); S3.home(); } catch (e) {} }, 80); } catch (e) {} }, 30);
}
const WT_COL = { red: ['#A4553A', 'Brick red'], beige: ['#D8C7A8', 'Beige'], grey: ['#9A9A96', 'Grey'], white: ['#ECE9E2', 'White'], charcoal: ['#4A4A48', 'Charcoal'], wood: ['#8B6440', 'Wood brown'] };
// 245 (owner): while the setup is made, a short "creating" screen instead of a frozen one
const MAGIC = ['Reading your roof…', 'Finding the corner with the softest evening light…', 'Setting the big pieces where they belong…', 'Laying out the walkways…', 'Balancing open space and shade…', 'Adding the finishing touches…'];
function suMagic(ph) { const t0 = Date.now(); let k = 0; S.magic = false;
  SUEL.innerHTML = '<div class="pl-magic"><div class="pl-mgo">' + P2.ico('sparkle') + '</div><h2>Creating your outdoor space</h2><p class="pl-mgl">' + MAGIC[0] + '</p><div class="pl-mgb"><i></i></div></div>';
  S.magic = true; const tk = setInterval(() => { const el = SUEL.querySelector('.pl-mgl'); if (!el) return clearInterval(tk); k = (k + 1) % MAGIC.length; el.style.opacity = 0; setTimeout(() => { el.textContent = MAGIC[k]; el.style.opacity = 1; }, 180); }, 900);
  setTimeout(() => { try { suCompose(ph); } catch (e) { S.magic = false; console.error(e); } setTimeout(() => { clearInterval(tk); S.magic = false; suPaint(); SUEL.scrollTop = 0; }, Math.max(0, 2600 - (Date.now() - t0))); }, 80); }
function suClick(e) { const b = e.target.closest('[data-su]'); if (!b || b.disabled) return; const a = b.getAttribute('data-su').split(':'), su = S.su, adv = () => { su.dirty = true; suStep(1); };
  const toPlan = () => { if (SUQ[su.q] === 'plan' && (su.dirty || !S.items.length)) suCompose(); };
  switch (a[0]) {
    case 'x': su.done = true; return suClose();
    case 'back': if (su.q > 0) suStep(-1); else return suRoof(); break;
    case 'next': { const from = SUQ[su.q]; suStep(1); const q2 = SUQ[su.q];
      if (q2 === 'eplan' && (su.dirty || !S.items.length)) return suMagic('el');
      if (q2 === 'plan' && (su.dirty || su.ddirty || !su.decorDone)) return suMagic(su.dirty ? 'all' : 'decor'); break; }
    case 'mood': { const x = SETUPS.find(z => z.k === a[1]); if (x && S.bth === x.k && Object.keys(S.bsel || {}).length) { suStep(1); break; }   // 255: the same mood again (coming back) keeps what was picked
      su.dirty = true; S.bth = x ? x.k : null; S.bsel = {}; if (x) x.items.forEach(k => { if (CAT[k] && (designs(CAT[k]).length || CAT[k].always)) S.bsel[k] = 1; }); S.bsel.feature = 1; if (S.bsel.pergola) S.bsel.deck = 1; if (S.site.blocks.some(b2 => b2.type === 'ac') && designs(CAT.accover).length) S.bsel.accover = 1; if (S.bsel.turf) su.turf = true; delete S.bsel.dining; delete S.bsel.firepit; if (S.bsel.bar) S.bsel.stool = 1; delete S.bsel.bench;
      su.theme = { party: 'modern', spa: 'tropical', green: 'natural', yoga: 'natural', work: 'modern', chill: 'natural' }[S.bth] || su.theme; adv(); break; }
    case 'bel': S.bsel = S.bsel || {}; if (S.bsel[a[1]]) delete S.bsel[a[1]]; else { S.bsel[a[1]] = 1; if (a[1] === 'pergola') S.bsel.deck = 1; } if (DECOR.has(a[1])) su.ddirty = true; else su.dirty = true; break;   // a pergola comes with a deck (untick it if not wanted)
    case 'bcnt': { const k = a[1], mx = { cabin: 3, pergola: 3, bar: 3, jacuzzi: 2 }[k] || 6, v = (S.bsel[k] || 0) + (+a[2] || 0); if (v <= 0) delete S.bsel[k]; else S.bsel[k] = Math.min(mx, v); if (k === 'cabin') suCab(); if (DECOR.has(k)) su.ddirty = true; else su.dirty = true; break; }
    case 'bshape': suBars()[+a[1]] = a[2]; su.dirty = true; break;
    case 'fbs': case 'wm': case 'fd': case 'gw': { const key = a[0] === 'fbs' ? 'fbs' : a[0]; (su[key] = su[key] || [])[+a[1]] = a.slice(2).join(':'); su.dirty = true; break; }
    case 'ncab': S.bsel.cabin = Math.max(1, Math.min(3, (S.bsel.cabin || 1) + (+a[1] || 0))); suCab(); su.dirty = true; break;
    case 'cuse': { const c = suCab()[+a[1]]; if (c) { const u = a.slice(2).join(':'); c.use = c.use.includes(u) ? c.use.filter(z => z !== u) : c.use.concat(u); } su.dirty = true; break; }
    case 'cin': { const c = suCab()[+a[1]]; if (c) c[a[2]] = !c[a[2]]; su.dirty = true; break; }
    case 'cglz': case 'cdoor': { const c = suCab()[+a[1]]; if (c) c[a[0] === 'cglz' ? 'glaze' : 'door'] = a[2]; su.dirty = true; break; }
    case 'pg': { const ps = suPgs(); ps[+a[2] || 0] = a[1]; su.pg = ps[0]; su.dirty = true; break; }
    case 'cs': su.cs = a[1]; su.dirty = true; break;
    case 'stairs': su.stairs = a[1]; su.dirty = true; break;
    case 'rref': su.roomRef = a[1] === '1'; su.dirty = true; break;
    case 'walls': su.walls = a[1]; su.dirty = true; break;
    case 'hv': { su.oldDirty = true; const hv = su.have = su.have || {}; if (hv[a[1]]) { delete hv[a[1]]; delete su.rm['old_' + a[1]]; } else hv[a[1]] = 1; su.dirty = true; break; }
    case 'hvc': { su.oldDirty = true; const hv = su.have = su.have || {}, v = (hv[a[1]] || 0) + (+a[2] || 0); if (v <= 0) delete hv[a[1]]; else hv[a[1]] = Math.min(6, v); su.dirty = true; break; }
    case 'rm': { su.oldDirty = true; su.rm = su.rm || {}; if (a[2] === '1') su.rm[a[1]] = true; else delete su.rm[a[1]]; suRemApply(); su.dirty = true; break; }
    case 'wrm': su.rm = su.rm || {}; if (a[1] === '1') su.rm.walltiles = true; else delete su.rm.walltiles; su.dirty = true; break;
    case 'fl0': su.floor0 = a[1]; su.dirty = true; break;
    case 'pipes': su.pipes = a[1] === '1'; su.dirty = true; break;
    case 'pscr': su.pipeScr = a[1] === '1'; su.dirty = true; break;
    case 'shh': { const b = (S.site.blocks || [])[+a[1]]; if (b) { const c = shV(b), dd = +a[2] || 0; b.h = Math.max(0, Math.min(14, c + dd * (c < 1 || (c === 1 && dd < 0) ? 0.5 : 1))); } su.dirty = true; break; }   // 252: 0 in / 6 in below 1 ft
    case 'pface': su.pipeFace = a[1]; su.dirty = true; break;
    case 'wtk': (su.wtile = su.wtile || { c: 'red' }).k = a[1]; su.dirty = true; break;
    case 'wtc': (su.wtile = su.wtile || { k: 'brick' }).c = a[1]; su.dirty = true; break;
    case 'shaft': su.shaft = a[1]; su.dirty = true; break;
    case 'tscr': su.tankScr = a[1] === '1'; su.dirty = true; break;
    case 'thas': su.tankHas = a[1] === '1'; su.tankScr = !su.tankHas; su.dirty = true; break;
    case 'green': su.green = a[1]; su.ddirty = true; break;
    case 'light': su.light = a[1]; su.ddirty = true; break;
    case 'turf': su.turf = a[1] === '1'; adv(); break;
    case 'flr': if (su.flr === a[1]) { suStep(1); if (SUQ[su.q] === 'eplan' && (su.dirty || !S.items.length)) return suMagic('el'); break; } su.flr = a[1]; su.turf = a[1] === 'garden'; adv(); break;
    case 'north': if (su.north === a[1] && a[1]) suStep(1); else { su.north = a[1]; adv(); } if (SUQ[su.q] === 'eplan' && (su.dirty || !S.items.length)) return suMagic('el'); break;
    case 'meas': su.meas = !su.meas; break;
    case 'lay': { const o = (su.opts || [])[+a[1]]; if (o) { su.pick = +a[1]; S.items = JSON.parse(JSON.stringify(o.items)); S.bnote = o.note; S.sel = null; ev('plan_step', { ref: 'layout' + (+a[1] + 1) }); draw(true); } break; }
    case 'again': return suMagic(SUQ[su.q] === 'eplan' ? 'el' : 'all');
    case 'roof': return suRoof();
    case 'unsel': S.sel = null; S.suSz = false; S.suMv = false; S.msg = ''; break;
    case 'sz': S.suSz = !S.suSz; if (S.suSz) S.suMv = false; break;
    case 'mv': S.suMv = !S.suMv; if (S.suMv) S.suSz = false; break;
    case 'csz': { const it = S.sel != null ? S.items[S.sel] : null; if (!it || it.cat !== 'cabin') break; const L = cabinLay(it), l0 = +L.L || 12, w0 = +L.W || 10, d = +a[2] || 0; S.msg = ''; cabinSize(it, a[1] === 'L' ? l0 + d : l0, a[1] === 'W' ? w0 + d : w0); draw(true); break; }
    case 'rs': case 'rot': case 'del': if (S.sel == null) break; { const G = grpOf(S.sel), it = S.items[S.sel];   // 254: Remove takes the whole group; a deck under the pergola follows its turn / size
      if (a[0] === 'del') { S.items = S.items.filter((o, j) => !G.includes(j)); S.sel = null; S.suSz = false; draw(true); break; }
      if (a[0] === 'rot' && it.cat === 'fbench' && G.length > 1) {   // 257 (owner): the L turns as one, round its middle
        const keep = G.map(j => JSON.stringify(S.items[j])), R0 = G.map(j => rectI(S.items[j])), gx = (Math.min(...R0.map(r => r.x)) + Math.max(...R0.map(r => r.x + r.w))) / 2, gz = (Math.min(...R0.map(r => r.z)) + Math.max(...R0.map(r => r.z + r.d))) / 2;
        G.forEach((j, k) => { const o = S.items[j], r = R0[k], cx = r.x + r.w / 2 - gx, cz = r.z + r.d / 2 - gz, nx = gx - cz, nz = gz + cx; o.rot = ((+o.rot || 0) + 90) % 360; const f = rectI(o); o.x = r2(o.x + (nx - (f.x + f.w / 2))); o.z = r2(o.z + (nz - (f.z + f.d / 2))); });
        { const R1 = G.map(j => rectI(S.items[j])), P = P0(), t = S.site, x0 = Math.min(...R1.map(r => r.x)), x1 = Math.max(...R1.map(r => r.x + r.w)), z0 = Math.min(...R1.map(r => r.z)), z1 = Math.max(...R1.map(r => r.z + r.d));   // pushed back inside the parapet if the turn poked out
          const dx = x0 < P ? P - x0 : x1 > +t.pw - P ? +t.pw - P - x1 : 0, dz = z0 < P ? P - z0 : z1 > +t.pd - P ? +t.pd - P - z1 : 0; G.forEach(j => { S.items[j].x = r2(S.items[j].x + dx); S.items[j].z = r2(S.items[j].z + dz); }); }
        const bad = () => G.some(j => !inside(rectI(S.items[j])) || clashes(S.items[j], j));
        if (bad()) { const base = G.map(j => [S.items[j].x, S.items[j].z]), offs = []; for (let r = 1; r <= 10; r++) for (let ox = -r; ox <= r; ox++) for (let oz = -r; oz <= r; oz++) if (Math.max(Math.abs(ox), Math.abs(oz)) === r) offs.push([ox, oz]);   // nearest free spot for the turned L
          offs.sort((p, q) => Math.hypot(p[0], p[1]) - Math.hypot(q[0], q[1])); for (const [ox, oz] of offs) { G.forEach((j, k) => { S.items[j].x = r2(base[k][0] + ox); S.items[j].z = r2(base[k][1] + oz); }); if (!bad()) break; } }
        if (bad()) { G.forEach((j, k) => Object.assign(S.items[j], JSON.parse(keep[k]))); S.msg = 'No room to turn it here — move it first'; } else S.msg = '';
        draw(true); break; }
      if (a[0] === 'rs' && it.cat === 'fbench' && G.length > 1) {   // an arm of the L grows / shrinks away from the corner, the other arm stays
        const keep = JSON.stringify(it), b0 = rectI(it), mt = rectI(S.items[G.find(j => j !== S.sel)]), c = CAT[it.cat], lo = c.min || [1, 1], hi = c.max || [80, 80], k = a[1] === 'd' ? 'd' : 'w';
        it[k] = Math.max(k === 'w' ? lo[0] : lo[1], Math.min(k === 'w' ? hi[0] : hi[1], r2(+it[k] + (+a[2] || 0)))); const b1 = rectI(it);
        if (b1.w !== b0.w) it.x = Math.abs(b0.x - (mt.x + mt.w)) < 0.3 || Math.abs(b0.x - mt.x) < 0.3 ? b0.x : r2(b0.x + b0.w - b1.w);
        if (b1.d !== b0.d) it.z = Math.abs(b0.z - (mt.z + mt.d)) < 0.3 || Math.abs(b0.z - mt.z) < 0.3 ? b0.z : r2(b0.z + b0.d - b1.d);
        if (clashes(it, S.sel)) { Object.assign(it, JSON.parse(keep)); S.msg = 'No room for it that size here'; } else S.msg = ''; draw(true); break; }
      const mo = G.filter(j => j !== S.sel && sameR(rectI(S.items[j]), rectI(it))).map(j => S.items[j]);
      if (a[0] === 'rs' && !it.lock && (a[1] === 'w' || a[1] === 'd') && !att(it)) {   // 255 (owner): a resize keeps the thing where it is — grows from its corner; refused rather than moved
        const keep = JSON.stringify(it), b0 = rectI(it), c = CAT[it.cat] || {}, [lo, hi] = szLim(it, c), k = a[1], j = k === 'w' ? 0 : 1;
        it[k] = Math.max(lo[j], Math.min(hi[j], r2(+it[k] + (+a[2] || 0)))); const b1 = rectI(it), dw = b0.w - b1.w, dd = b0.d - b1.d;
        const ok = [[0, 0], [dw, dd], [dw / 2, dd / 2], [dw, 0], [0, dd]].some(([ox, oz]) => { it.x = r2(b0.x + ox); it.z = r2(b0.z + oz); return !clashes(it, S.sel); });
        if (!ok) { Object.assign(it, JSON.parse(keep)); S.msg = 'No room for it that size here'; } else S.msg = '';
        mo.forEach(o => Object.assign(o, { x: it.x, z: it.z, w: it.w, d: it.d, rot: it.rot })); draw(true); break; }
      act(a); mo.forEach(o => Object.assign(o, { x: it.x, z: it.z, w: it.w, d: it.d, rot: it.rot })); draw(true); } break;
    case 'done': su.done = true; ev('plan_step', { ref: '3d' }); return suClose();
  }
  if ((SUQ[su.q] === 'plan' || SUQ[su.q] === 'eplan') && !S.items.length) suCompose(SUQ[su.q] === 'eplan' ? 'el' : 'all');
  suPaint(); if (a[0] === 'next' || a[0] === 'back' || a[0] === 'mood' || a[0] === 'turf' || a[0] === 'north') SUEL.scrollTop = 0;
}
function suRoof() {   // back to the roof plan; a changed roof sets the terrace up again
  if (!window.mtoSpaceAsk) return; if (!SUEL) suOpen(SUQ.length - 1); SUEL.style.display = 'none'; EL.style.display = 'none'; save();
  window.mtoSpaceAsk('planner', r => { EL.style.display = 'flex'; if (r && r.site) { S.site = Object.assign({}, S.site, r.site); S.su.dirty = true; S.su.oldDirty = true; if (S.su.q >= SUQ.indexOf('eplan')) suCompose(SUQ[S.su.q] === 'eplan' ? 'el' : 'all'); } SUEL.style.display = 'block'; suPaint(); setTimeout(() => { try { S3.resize(); } catch (e) {} }, 60); }, { site: S.site });
}
let SUD = null;
// 254 (owner): tap a thing to pick it (a small toolbar over it, like Google Sheets); only the picked thing — and what moves with it — can be dragged; the rest is faded and can't be picked until ✓ Done / a tap on empty floor; a swipe anywhere else scrolls the page
const sameR = (a, b) => Math.abs(a.x - b.x) < 0.6 && Math.abs(a.z - b.z) < 0.6 && Math.abs(a.w - b.w) < 0.6 && Math.abs(a.d - b.d) < 0.6;
const touchR = (a, b) => a.x <= b.x + b.w + 0.15 && a.x + a.w >= b.x - 0.15 && a.z <= b.z + b.d + 0.15 && a.z + a.d >= b.z - 0.15;
function grpOf(i) { const it = S.items[i]; if (!it) return []; const out = [i];   // L seating = its two arms; a pergola = + the deck under it
  if (it.grp) S.items.forEach((o, j) => { if (j !== i && o.grp === it.grp) out.push(j); });
  else if (it.cat === 'fbench' && it.shape !== 'curve' && !it.segs) S.items.forEach((o, j) => { if (j !== i && o.cat === 'fbench' && o.shape !== 'curve' && !o.grp && (+o.rot || 0) % 180 !== (+it.rot || 0) % 180 && touchR(rectI(it), rectI(o))) out.push(j); });
  const pg = it.cat === 'pergola' ? it : it.cat === 'deck' ? S.items.find(o => o.cat === 'pergola' && sameR(rectI(o), rectI(it))) : null;
  if (pg) S.items.forEach((o, j) => { if (!out.includes(j) && (o === pg || (o.cat === 'deck' && sameR(rectI(o), rectI(pg))))) out.push(j); });
  return out; }
function suDown(e) { const svg = SUEL.querySelector('.pl-su2d svg'); if (!svg || !svg.contains(e.target)) return; const g = e.target.closest && e.target.closest('[data-it]'), i = g ? +g.getAttribute('data-it') : null;
  SUD = { i, sx: e.clientX, sy: e.clientY, svg, mv: false };
  if (S.sel == null || i == null || !S.suMv) return; const G = grpOf(S.sel); if (!G.includes(i)) return;   // 255: only in Move mode, only the picked thing (or its group) drags
  const it = S.items[i]; if (!it || it.segs || it.box || it.lock) return; const p = P2.toFt(svg, e); if (!p) return; e.preventDefault();
  Object.assign(SUD, { drag: true, G, p0: p, xs: G.map(j => [+S.items[j].x, +S.items[j].z]), gs: G.map(j => svg.querySelector(`[data-it="${j}"]`)).filter(Boolean) }); try { svg.setPointerCapture(e.pointerId); } catch (er) {}
  const pop = SUEL.querySelector('.pl-tb'); if (pop) pop.style.visibility = 'hidden'; }
function suMove(e) { const D = SUD; if (!D) return; if (!D.mv && Math.hypot(e.clientX - D.sx, e.clientY - D.sy) < 6) return; D.mv = true; if (!D.drag) return; const p = P2.toFt(D.svg, e); if (!p) return; D.dx = r2(p.x - D.p0.x); D.dz = r2(p.z - D.p0.z); D.gs.forEach(g => g.setAttribute('transform', `translate(${D.dx} ${D.dz})`)); }
function suCancel() { const D = SUD; SUD = null; if (D && D.drag) suPaint(); }
function suUp() { const D = SUD; SUD = null; if (!D) return;
  if (!D.mv) {   // a tap
    if (S.sel == null) { if (D.i != null) { S.sel = D.i; S.suSz = false; S.suMv = false; S.msg = ''; suPaint(); } return; }
    if (D.i == null) { if (S.suMv) return; S.sel = null; S.suSz = false; S.msg = ''; return suPaint(); }   // in Move mode a slip onto the floor doesn't drop the pick   // empty floor = done
    if (grpOf(S.sel).includes(D.i)) { if (D.i !== S.sel) { S.sel = D.i; suPaint(); } else { const pop = SUEL.querySelector('.pl-tb'); if (pop) pop.style.visibility = ''; } return; }   // the other arm of an L: size it on its own
    S.msg = 'Tap ✓ Done first, then pick the next thing'; return suPaint(); }
  if (!D.drag) return; S.msg = '';
  const keep = D.G.map(j => JSON.stringify(S.items[j])); D.G.forEach((j, k) => { const o = S.items[j]; o.x = r2(D.xs[k][0] + (D.dx || 0)); o.z = r2(D.xs[k][1] + (D.dz || 0)); delete o.wside; });
  { const R1 = D.G.map(j => rectI(S.items[j])), p = P0(), t = S.site, x0 = Math.min(...R1.map(r => r.x)), x1 = Math.max(...R1.map(r => r.x + r.w)), z0 = Math.min(...R1.map(r => r.z)), z1 = Math.max(...R1.map(r => r.z + r.d));   // 258: dragged past the parapet → sits flush inside it (the border band included)
    const dx = x0 < p ? p - x0 : x1 > +t.pw - p ? +t.pw - p - x1 : 0, dz = z0 < p ? p - z0 : z1 > +t.pd - p ? +t.pd - p - z1 : 0; if (dx || dz) D.G.forEach(j => { S.items[j].x = r2(S.items[j].x + dx); S.items[j].z = r2(S.items[j].z + dz); }); }
  if (D.G.length === 1) { const i = D.G[0], it = S.items[i];
    if (CAT[it.cat] && CAT[it.cat].kind === 'wall') snapWall(it, true);   // 242: a wall panel dropped anywhere goes onto the nearest wall at that spot
    if (clashes(it, i)) { if (!settle(it, i, [it.x, it.z])) { Object.assign(it, JSON.parse(keep[0])); S.msg = 'It can\'t go there'; } } else if (CAT[it.cat] && CAT[it.cat].kind === 'wall') settle(it, i, [it.x, it.z]); }
  else if (D.G.some(j => clashes(S.items[j], j))) { D.G.forEach((j, k) => Object.assign(S.items[j], JSON.parse(keep[k]))); S.msg = 'It can\'t go there'; }   // a group moves together or not at all
  draw(true); suPaint(); }
function suPopHtml() { const it = S.sel != null ? S.items[S.sel] : null; if (!it) return ''; const c = CAT[it.cat] || {}, G = grpOf(S.sel), Lg = G.length > 1 && it.cat === 'fbench';
  return `<div class="pl-tb" style="visibility:hidden"><span class="pl-tbn">${esc(G.length > 1 && G.some(j => S.items[j].cat === 'pergola') ? 'Pergola + deck' : Lg ? 'L seating · 1 arm' : it.label || c.t || '')}</span>` +
    (!it.segs && !it.box && !it.lock ? `<button type="button" data-su="mv" class="${S.suMv ? 'on' : ''}"><i>✥</i>Move</button>` : '') + (!att(it) && !it.segs && !it.lock ? '<button type="button" data-su="rot"><i>↻</i>Turn</button>' : '') + ((c.size && c.size !== 'fixed' || it.cat === 'cabin' || SZOK.has(it.cat)) && !it.lock ? `<button type="button" data-su="sz" class="${S.suSz ? 'on' : ''}"><i>⤢</i>Size</button>` : '') +
    '<button type="button" data-su="del"><i>🗑</i>Remove</button><button type="button" class="ok" data-su="unsel"><i>✓</i>Done</button></div>'; }
const SZOK = new Set(['sofa', 'swing', 'dining', 'bench', 'table', 'water', 'sculpture', 'jacuzzi', 'umbrella', 'firepit', 'rack']);   // 257 (owner): every thing can be sized in the 2D setup
const szLim = (it, c) => SZOK.has(it.cat) ? [[r2(c.w * 0.5), r2(c.d * 0.5)], [r2(c.w * 2.5), r2(c.d * 2.5)]] : [c.min || [1, 1], c.max || [80, 80]];
function suSzHtml() { const it = S.sel != null ? S.items[S.sel] : null; if (!it || !S.suSz) return ''; const c = CAT[it.cat] || {};
  if (it.cat === 'cabin') { const L = cabinLay(it), tw = (+it.rot || 0) % 180 === 0, r = (k, ar, nm, sm, v) => `<div class="pl-szr"><span class="pl-sza">${ar}</span><span class="pl-szl">${nm}<small>${sm}</small></span><button type="button" data-su="csz:${k}:-1" aria-label="Smaller">−</button><em>${v} ft</em><button type="button" data-su="csz:${k}:1" aria-label="Bigger">+</button></div>`;   // 256: the cabin's own length × width
    return '<div class="pl-szp">' + r('L', tw ? '↔' : '↕', 'Length — L', 'along the door wall', +L.L || 12) + r('W', tw ? '↕' : '↔', 'Width — W', 'door wall to back wall', +L.W || 10) + '</div>'; } if ((!c.size || c.size === 'fixed') && !SZOK.has(it.cat)) return ''; const tw = (+it.rot || 0) % 180 === 0;
  const row = (k, ar, nm, sm, v) => `<div class="pl-szr"><span class="pl-sza">${ar}</span><span class="pl-szl">${nm}<small>${sm}</small></span><button type="button" data-su="rs:${k}:-1" aria-label="Smaller">−</button><em>${v} ft</em><button type="button" data-su="rs:${k}:1" aria-label="Bigger">+</button></div>`;
  return '<div class="pl-szp">' + row('w', tw ? '↔' : '↕', 'Width — W', tw ? 'left to right on the plan' : 'top to bottom on the plan', it.w) + (c.size === 'wd' || SZOK.has(it.cat) ? row('d', tw ? '↕' : '↔', 'Length — L', tw ? 'top to bottom on the plan' : 'left to right on the plan', it.d) : '') + '</div>'; }
function suPopPlace() { const pop = SUEL && SUEL.querySelector('.pl-tb'), box = SUEL && SUEL.querySelector('.pl-su2d'); if (!pop || !box || S.sel == null) return;
  const gs = grpOf(S.sel).map(j => box.querySelector(`[data-it="${j}"]`)).filter(Boolean); if (!gs.length) return; const R = gs.map(g => g.getBoundingClientRect()), cb = box.getBoundingClientRect();
  const top = Math.min(...R.map(r => r.top)) - cb.top, bot = Math.max(...R.map(r => r.bottom)) - cb.top, mid = (Math.min(...R.map(r => r.left)) + Math.max(...R.map(r => r.right))) / 2 - cb.left, pw = pop.offsetWidth, ph = pop.offsetHeight;
  let y = top - ph - 8; if (y < 0) y = Math.min(cb.height - ph, bot + 8); pop.style.left = Math.max(0, Math.min(cb.width - pw, mid - pw / 2)) + 'px'; pop.style.top = Math.max(0, y) + 'px'; pop.style.visibility = ''; }
// 224: the setup, placed the way our terraces are — big things first, each at the best free spot for its "where"
const BIG = new Set(['cabin', 'pergola', 'jacuzzi', 'water', 'bar', 'counter', 'sculpture', 'fbench']);   // 241: nothing big in front of the stairs door
function spotBest(it, i, score, rots, dz) {   // dz: the space in front of the staircase door stays clear
  const t = S.site, p = P0(), keep = { x: it.x, z: it.z, rot: it.rot }, fl = CAT[it.cat].kind === 'floor'; let best = null;
  for (const rot of rots || [0, 90]) { it.rot = rot; const f = foot(it), st = Math.max(f[0], f[1]) > 8 ? 1 : 0.5;
    for (let z = p; z <= t.pd - p - f[1] + 0.01; z += st) for (let x = p; x <= t.pw - p - f[0] + 0.01; x += st) { it.x = r2(x); it.z = r2(z); if (clashes(it, i) || (dz && !fl && hit(rectI(it), dz)) || (dz && dz.fr && BIG.has(it.cat) && hit(rectI(it), dz.fr))) continue;
      const sc = score(it.x + f[0] / 2, it.z + f[1] / 2, f, rot); if (!best || sc > best[0]) best = [sc, it.x, it.z, rot]; } }
  if (!best) { Object.assign(it, keep); return false; } it.x = best[1]; it.z = best[2]; it.rot = best[3]; return true;
}
function compose(opt) {   // 240: opt.lay = one of LifeWall's real layouts (things at its drawn spots and sizes); 239: big things first (cabin in a corner / at the back), then the pathway that reaches them, seats facing the garden, built-in seating in an L, plants last and spread out
  const g = geo(), t = g.t, P = g.P, B = (opt && opt.B) || S.bsel || {}, PH = (opt && opt.phase) || 'all', WH = S.bwh || {}, M = g.M, wh = k => WH[k] || whereOpts(k, g)[0][0];
  const ppl = (S.su || {}).pg || (S.su || {}).people || '5-8', SZF = k => ({ '2-4': { sofa: [8, 7], dining: [5, 5], pergola: [10, 9], L: [8, 5] }, '5-8': { sofa: [10, 8], dining: [7, 6], pergola: [12, 10], L: [10, 6] }, '9-12': { sofa: [12, 9], dining: [10, 6], pergola: [16, 12], L: [12, 8] }, '12+': { sofa: [14, 10], dining: [12, 7], pergola: [18, 13], L: [14, 10] } }[k] || {}), SZ = SZF(ppl);
  const sun = (cx, cz, k) => g.sw ? k * ((cx - t.pw / 2) * g.sw[0] + (cz - t.pd / 2) * g.sw[1]) : 0;   // + toward the afternoon sun (south-west)
  const farX = w => g.far === 'right' ? t.pw - P - w / 2 : P + w / 2, by = k => S.items.find(o => o.cat === k), all = k => S.items.filter(o => o.cat === k);
  const d2 = (x, z, X, Z) => Math.hypot(x - X, z - Z), wallBonus = (f, cx, cz, sd) => { if (olOn()) return olTouch({ x: cx - f[0] / 2, z: cz - f[1] / 2, w: f[0], d: f[1] }, 0.6)[{ left: 'L', right: 'R', back: 'Bk', front: 'F' }[sd]] ? 6 : 0; const e = { left: cx - f[0] / 2 - P, right: t.pw - P - cx - f[0] / 2, back: cz - f[1] / 2 - P, front: t.pd - P - cz - f[1] / 2 }[sd]; return e < 0.6 ? 6 : 0; };
  const inR = (cx, cz, r) => r && cx > r.x && cx < r.x + r.w && cz > r.z && cz < r.z + r.d;
  const ov = (a0, a1, b0, b1) => a0 < b1 - 0.5 && a1 > b0 + 0.5;
  const tch = (cx, cz, f) => { const r = { x: cx - f[0] / 2, z: cz - f[1] / 2, w: f[0], d: f[1] }, e = 0.6, ob = (t.kind === 'terrace' ? t.blocks.filter(b => b.type !== 'ac') : []).concat(all('cabin').map(rectI)).filter(o => !(Math.abs(o.x - r.x) < 0.01 && Math.abs(o.z - r.z) < 0.01));
    const L = r.x - P < e || ob.some(o => Math.abs(o.x + o.w - r.x) < e && ov(r.z, r.z + r.d, o.z, o.z + o.d)), R = t.pw - P - (r.x + r.w) < e || ob.some(o => Math.abs(o.x - (r.x + r.w)) < e && ov(r.z, r.z + r.d, o.z, o.z + o.d));
    const Bk = r.z - P < e || ob.some(o => Math.abs(o.z + o.d - r.z) < e && ov(r.x, r.x + r.w, o.x, o.x + o.w)), F = t.pd - P - (r.z + r.d) < e || ob.some(o => Math.abs(o.z - (r.z + r.d)) < e && ov(r.x, r.x + r.w, o.x, o.x + o.w));
    if (olOn()) { const w = olTouch(r, e); return { L: w.L || ob.some(o => Math.abs(o.x + o.w - r.x) < e && ov(r.z, r.z + r.d, o.z, o.z + o.d)), R: w.R || ob.some(o => Math.abs(o.x - (r.x + r.w)) < e && ov(r.z, r.z + r.d, o.z, o.z + o.d)),
      Bk: w.Bk || ob.some(o => Math.abs(o.z + o.d - r.z) < e && ov(r.x, r.x + r.w, o.x, o.x + o.w)), F: w.F || ob.some(o => Math.abs(o.z - (r.z + r.d)) < e && ov(r.x, r.x + r.w, o.x, o.x + o.w)), get n() { return (this.L || this.R ? 1 : 0) + (this.Bk || this.F ? 1 : 0); } }; }   // 244: walls of any shape
    return { L, R, Bk, F, n: (L || R ? 1 : 0) + (Bk || F ? 1 : 0) }; };
  const backTo = (cx, cz, f, rot) => { const c = tch(cx, cz, f); return [c.Bk, c.L, c.F, c.R][[0, 270, 180, 90].indexOf(+rot % 360)] || false; };   // its back (−z of the model) against a wall
  const FACE = { 0: [0, 1], 90: [-1, 0], 180: [0, -1], 270: [1, 0] }, faceTo = (cx, cz, rot, X, Z) => { const v = FACE[+rot % 360] || [0, 1], dx = X - cx, dz = Z - cz, n = Math.hypot(dx, dz) || 1; return (v[0] * dx + v[1] * dz) / n; };
  const backZ = g.road.includes('front') && !g.road.includes('back') ? 1 : g.road.includes('back') && !g.road.includes('front') ? -1 : 1;   // the back = away from the road
  const backness = cz => backZ > 0 ? 1 - cz / t.pd : cz / t.pd;
  let miss = 0; const notes = [];
  // 236: the closest real terraces (stairs at the same spot, same shape / size) say where each thing goes — their spots are the targets, the rules only break ties
  const LAY = opt && opt.lay ? [opt.lay] : (() => { try { return TM.layout ? TM.layout(t, 6) : []; } catch (e) { return []; } })(), LMAP = { sofa: ['seating', 'fbench'], dining: ['seating'], fbench: ['fbench', 'seating'], swing: ['swing'], counter: ['counter', 'bar'] }, used = {};
  const learned = k => { const tys = LMAP[k] || [k], pts = []; tys.forEach(ty => LAY.forEach(L => L.els.forEach(e => { if (e[0] === ty) pts.push([e[1], e[2]]); }))); const n = used[k] || 0; used[k] = n + 1; return pts[n] || null; };
  const RECT = {}; if (opt && opt.lay) opt.lay.els.forEach(e => { if (e.length > 3) (RECT[e[0]] = RECT[e[0]] || []).push(e); });   // 240: as drawn — [type, cx, cz, w, d fitted, w, d drawn]
  const cl = (v, a, b) => Math.max(a, Math.min(b, v)), takeR = k => (RECT[k] || []).shift(), rsz = e => [r2(e[5] * cl(e[3] / e[5], 0.85, 1.15)), r2(e[6] * cl(e[4] / e[6], 0.85, 1.15))];
  const ctr = [t.pw / 2, t.pd / 2];
  const frontClear = (cx, cz, f, rot) => { const v = FACE[+rot % 360] || [0, 1], r = { x: cx - f[0] / 2, z: cz - f[1] / 2, w: f[0], d: f[1] }, D = 5, sr = v[1] > 0 ? { x: r.x, z: r.z + r.d, w: r.w, d: D } : v[1] < 0 ? { x: r.x, z: r.z - D, w: r.w, d: D } : v[0] > 0 ? { x: r.x + r.w, z: r.z, w: D, d: r.d } : { x: r.x - D, z: r.z, w: D, d: r.d };
    return !inside(sr) || (t.kind === 'terrace' ? t.blocks : []).some(b => hit(sr, b)) || S.items.some(o => !att(o) && o.cat !== 'pathway' && CAT[o.cat] && CAT[o.cat].kind !== 'floor' && !UMB.has(o.cat) && hit(sr, rectI(o))) ? -30 : 0; };   // the cabin's glass front keeps 5 ft open
  const LEARNED = new Set(['pergola', 'bar', 'water', 'jacuzzi', 'turf']);
  const SHRINK = { pergola: [8, 8], deck: [6, 6], turf: [6, 5], sofa: [6, 5], dining: [4, 4], jacuzzi: [6, 6], counter: [4, 2.5] };
  // 253 (owner's screenshot): nothing stands in the 5 ft in front of a cabin's glass front; bars / counters / fixed seating / racks / water never straddle a pergola's edge or hit its posts (fixed seating never under it)
  const cabZ = () => all('cabin').map(o => { const r = rectI(o), v = FACE[(+o.rot || 0) % 360] || [0, 1], D = 5; return v[1] > 0 ? { x: r.x, z: r.z + r.d, w: r.w, d: D } : v[1] < 0 ? { x: r.x, z: r.z - D, w: r.w, d: D } : v[0] > 0 ? { x: r.x + r.w, z: r.z, w: D, d: r.d } : { x: r.x - D, z: r.z, w: D, d: r.d }; });
  const STRAD = new Set(['bar', 'counter', 'fbench', 'rack', 'water', 'firepit', 'sculpture']);
  const pgPosts = R => { const xs = [R.x + 0.2, R.x + R.w - 0.2].concat(R.w > 16 ? [R.x + R.w / 2] : []), zs = [R.z + 0.2, R.z + R.d - 0.2].concat(R.d > 16 ? [R.z + R.d / 2] : []), out = []; xs.forEach(x => zs.forEach(z => { const midx = Math.abs(x - (R.x + R.w / 2)) < 0.01, midz = Math.abs(z - (R.z + R.d / 2)) < 0.01; if (midx && midz) return; out.push([x, z]); })); return out; };
  const pgPen = (r, R, k) => { const ix = Math.max(0, Math.min(r.x + r.w, R.x + R.w) - Math.max(r.x, R.x)) * Math.max(0, Math.min(r.z + r.d, R.z + R.d) - Math.max(r.z, R.z)); if (ix <= 0.01) return 0;
    if (k === 'fbench') return 70; if (ix < r.w * r.d - 0.05) return 60; return pgPosts(R).some(([x, z]) => x > r.x - 1 && x < r.x + r.w + 1 && z > r.z - 1 && z < r.z + r.d + 1) ? 45 : 0; };
  const rGap = (a, b) => Math.hypot(Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w)), Math.max(0, a.z - (b.z + b.d), b.z - (a.z + a.d)));
  const capA = (sz, z) => { const a = sz[0] * sz[1], m = z[0] * z[1] * 1.3; if (a <= m) return sz; const q = Math.sqrt(m / a); return [r2(sz[0] * q), r2(sz[1] * q)]; };
  const put = (k, score, opt) => { opt = opt || {}; const it = newItem(k); if (!it) return null; Object.assign(it, opt.set || {}); if (opt.pre) try { opt.pre(it); } catch (e) {} if (k === 'cabin' || k === 'pergola') it.label = it.label || CAT[k].t; const i = S.items.length; S.items.push(it);
    const tg = LEARNED.has(k) && !opt.keepRule ? learned(k) : null, sc0 = tg && score ? (cx, cz, f, rot) => -1.6 * d2(cx, cz, tg[0], tg[1]) + 0.25 * score(cx, cz, f, rot) : score, sc1 = opt.bonus && sc0 ? (cx, cz, f, rot) => sc0(cx, cz, f, rot) + opt.bonus(cx, cz, f, rot) : sc0;
    const KZ = k !== 'cabin' && CAT[k].kind !== 'floor' && k !== 'deck' ? cabZ() : [], PGs = STRAD.has(k) ? all('pergola').map(rectI) : [];
    const sc = sc1 && (KZ.length || PGs.length) ? (cx, cz, f, rot) => { const r = { x: cx - f[0] / 2, z: cz - f[1] / 2, w: f[0], d: f[1] }; return sc1(cx, cz, f, rot) - (KZ.some(z => hit(r, z)) ? 90 : 0) - PGs.reduce((a, R) => a + pgPen(r, R, k), 0); } : sc1;
    if (CAT[k].kind === 'wall') {   // 253: a wall panel stays on its wall — slides along it to a free stretch, else the next wall; never left standing in the open
      const KW = cabZ(), dzw = g.dz, tries = [opt].concat(opt.alt === false ? [] : ['back', 'left', 'right', 'front'].filter(sd => !g.road.includes(sd)).map(sd => wallAt(sd, sd === 'back' || sd === 'front' ? t.pw / 2 : t.pd / 2, k)));
      for (const o of tries) { const x0 = r2(o.at[0] - it.w / 2), z0 = r2(o.at[1]), vert = (+o.rot || 0) % 180 !== 0, run = vert ? t.pd : t.pw;
        for (let s2 = 0; s2 <= run; s2 += 0.5) for (const sg of s2 ? [1, -1] : [1]) { it.rot = o.rot; it.x = vert ? x0 : r2(x0 + sg * s2); it.z = vert ? r2(z0 + sg * s2) : z0; const r = rectI(it);
          if (!inside(r) || clashes(it, i) || KW.some(z => hit(r, z)) || (dzw && hit(r, dzw))) continue; return it; } }
      S.items.pop(); miss++; return null; }
    const dz = g.dz && Object.assign({ fr: g.fr }, g.dz); let ok = spotBest(it, i, sc, opt.rots, dz);
    for (let tr = 0; !ok && tr < 5 && SHRINK[k]; tr++) { it.w = Math.max(SHRINK[k][0], r2(it.w * 0.85)); it.d = Math.max(SHRINK[k][1], r2(it.d * 0.85)); ok = spotBest(it, i, sc, opt.rots, dz); if (it.w === SHRINK[k][0] && it.d === SHRINK[k][1]) break; }   // too big → a little smaller, not left out
    if (!ok && k === 'cabin') { try { cabinSize(it, 10, 8); } catch (e) {} ok = spotBest(it, i, sc, opt.rots, dz); }
    if (!ok) { S.items.pop(); miss++; return null; } if (!opt.noFlush) flush(it, i); if (opt.wside) it.wside = opt.wside; if (tg) it.learned = true; return it; };
  const mumtyFace = () => { if (!M) return [t.pw / 2, P + 2]; return g.door === 'right' ? [M.x + M.w, M.z + M.d / 2] : g.door === 'left' ? [M.x, M.z + M.d / 2] : g.door === 'front' ? [M.x + M.w / 2, M.z + M.d + 1.5] : [M.x + M.w / 2, M.z - 1.5]; };
  // 1) the cabin: in a corner (two walls — parapet, the stairs room or another cabin), at the back, away from the road (owner: "mostly in corners or at the back or joining the pergola")
  let J = null;   // 258 (owner): cabin + pergola joined in one band across the terrace — the cabin behind the stairs room / room, the pergola on the open side
  if (B.cabin) { const w = wh('cabin'), CS = { '1-2': [10, 8], '3-4': [12, 10], '5-8': [16, 10] }[(S.su || {}).cs], cabs = (S.su || {}).cab || [];
    if (B.pergola && opt.phase !== 'old') try { const cq = cabs[0] || {}, drot0 = cq.door && cq.door !== 'auto' ? CAB_ROT[cq.door] : null, csk0 = cabSkuFor(cq.glaze || 'mostly');
      const c0 = newItem('cabin'); if (csk0 && c0.sku !== csk0) { c0.sku = csk0; delete c0.layout; delete c0.lsku; cabinFoot(c0); } try { if (CS) cabinSize(c0, CS[0], CS[1]); } catch (e) {} c0.rot = 0;
      const L = rectI(c0).w, D = rectI(c0).d, BLK = (t.blocks || []).filter(b => b.type !== 'shaft'), BM = BLK.filter(b => b.type === 'mumty' || b.type === 'room'), pz = (SZF((S.su || {}).pgs && (S.su || {}).pgs[0] || ppl).pergola || [12, 10]);
      const zs = [P, r2(t.pd - P - D)]; BM.forEach(b => zs.push(r2(b.z), r2(b.z + b.d - D)));
      let best = null;
      zs.map(z => Math.max(P, Math.min(z, t.pd - P - D))).filter((z, k, A) => A.indexOf(z) === k).forEach(z => {   // a band D deep at this z: its free stretches across the width
        const cut = BLK.filter(b => b.z < z + D - 0.01 && b.z + b.d > z + 0.01).map(b => [b.x, b.x + b.w]).sort((a, b) => a[0] - b[0]), iv = []; let x = P;
        cut.forEach(([a, b]) => { if (a - x > 0.5) iv.push([x, a]); x = Math.max(x, b); }); if (t.pw - P - x > 0.5) iv.push([x, t.pw - P]);
        iv.forEach(([a, b]) => { if (b - a < L + 8) return; const touch = e => BM.some(k => Math.abs((e === 'l' ? a : b) - (e === 'l' ? k.x + k.w : k.x)) < 0.3 && k.z < z + D && k.z + k.d > z);
          ['l', 'r'].forEach(e => { const back = z <= P + 0.1, front = z + D >= t.pd - P - 0.1, rot = back ? 0 : front ? 180 : (z + D / 2 < t.pd / 2 ? 0 : 180); if (drot0 != null && drot0 !== rot) return;
            const sc = (touch(e) ? 30 : 0) + (back ? 20 : 0) + (g.road.includes(front ? 'front' : back ? 'back' : '') ? -25 : 0) - Math.abs(Math.min(30, b - a - L) * D - pz[0] * pz[1] * 1.6) * 0.05;
            if (!best || sc > best.sc) best = { sc, z, a, b, e, rot }; }); }); });
      if (best) { const { z, a, b, e, rot } = best, c = c0; c.rot = rot; c.x = e === 'l' ? a : r2(b - L); c.z = z; S.items.push(c);
        if (!clashes(c, S.items.length - 1)) { const p = newItem('pergola'); S.items.push(p);
          for (let pw = Math.min(30, r2(b - a - L)); pw >= 8; pw -= 1) { Object.assign(p, { w: pw, d: D, rot: 0, x: e === 'l' ? r2(a + L) : r2(b - L - pw), z }); if (!clashes(p, S.items.length - 1)) { J = { c, p }; break; } }
          if (!J) S.items.pop(); }
        if (!J) S.items.pop(); else notes.push('Cabin and pergola joined across the terrace'); } } catch (e) { J = null; }
    for (let ci = J ? 1 : 0; ci < Math.min(3, B.cabin || 1); ci++) { const rc = takeR('cabin'), lt = rc ? [rc[1], rc[2]] : learned('cabin'), cq = cabs[ci] || {}, csk = cabSkuFor(cq.glaze || 'mostly'), drot = cq.door && cq.door !== 'auto' ? CAB_ROT[cq.door] : null;   // 256: the walls picked + which way the door faces
      const skuPre = sz => o => { if (csk && o.sku !== csk) { o.sku = csk; delete o.layout; delete o.lsku; cabinFoot(o); o.label = prodName(csk, 'Cabin'); } if (sz) cabinSize(o, sz[0], sz[1]); };
      if (rc) { const sz = rsz(rc), wide = sz[0] >= sz[1], Lc = Math.max(sz[0], sz[1]) - 0.6, Wc = Math.min(sz[0], sz[1]) - 0.6;   // 240: where and how big LifeWall drew it; the glass front looks at the terrace
        put('cabin', (cx, cz, f, rot) => { const c = tch(cx, cz, f); return -1.2 * d2(cx, cz, lt[0], lt[1]) + 12 * faceTo(cx, cz, rot, ctr[0], ctr[1]) + frontClear(cx, cz, f, rot) + (c.n === 2 ? 26 : c.n * 12); }, { rots: drot != null ? [drot] : wide ? [0, 180] : [90, 270], keepRule: true, pre: skuPre([CS ? CS[0] : cl(Lc, 10, 20), CS ? CS[1] : cl(Wc, 8, 14)]) }); continue; }
      put('cabin', (cx, cz, f, rot) => { const c = tch(cx, cz, f); return (c.n === 2 ? 40 : c.n * 12) + 16 * (w === 'front' ? 1 - backness(cz) : backness(cz)) + (w === 'far' ? -0.4 * Math.abs(cx - farX(f[0])) : 0) - (lt ? 0.12 * d2(cx, cz, lt[0], lt[1]) : 0) - ((backZ > 0 ? c.F : c.Bk) && g.road.length ? 8 : 0) + 14 * faceTo(cx, cz, rot, ctr[0], ctr[1]) + frontClear(cx, cz, f, rot); },
        { rots: drot != null ? [drot] : [0, 90, 180, 270], keepRule: true, pre: skuPre(CS ? [CS[0], CS[1]] : null) }); }
    S.items.forEach(o => { if (o.cat !== 'cabin') return; const k = all('cabin').indexOf(o), c = cabs[k] || {};
      o.purpose = (c.use || []).slice(); o.inside = { pantry: !!c.pantry, wash: !!c.wash }; o.label = o.purpose.length ? 'Cabin · ' + o.purpose.join(', ') : prodName(o.sku, 'Cabin');
      if (c.pantry || c.wash) try { const lay = JSON.parse(JSON.stringify(cabinLay(o))), L = +lay.L || 12, pl = (lay.places || []).filter(p => !['toilet', 'wc', 'pantry'].includes(p.key));
        if (c.wash) pl.push({ key: 'toilet', x: 0, y: 0, rot: 0, len: null }); if (c.pantry) pl.push({ key: 'pantry', x: Math.max(c.wash ? 4.5 : 0, L - 6), y: 0, rot: 0, len: null }); lay.places = pl; o.layout = lay; o.lsku = o.sku; } catch (e) {} });
    const cb0 = by('cabin'); if (cb0) { const r = rectI(cb0), c = tch(r.x + r.w / 2, r.z + r.d / 2, [r.w, r.d]); notes.push('Cabin ' + (c.n === 2 ? 'in the corner' : 'against the wall') + (backness(r.z + r.d / 2) > 0.6 ? ' at the back' : '')); } }
  const cab = by('cabin'), cr = cab ? rectI(cab) : null;
  // 2) pergolas (+ a deck under each) — 241: as many as asked, each sized for its own people
  const pgq = (S.su || {}).pgs || [], PR = [];
  for (let pi = 0; pi < Math.min(3, B.pergola || 0); pi++) { if (J && pi === 0) { PR.push(rectI(J.p)); continue; } const zz = SZF(pgq[pi] || ppl).pergola || [12, 10], rp = takeR('pergola'), others = (cx, cz) => PR.reduce((a, r) => a + 0.4 * Math.min(25, d2(cx, cz, r.x + r.w / 2, r.z + r.d / 2)), 0), n0 = all('pergola').length;
    if (rp) { const sz = pi ? zz : capA(rsz(rp), zz);   // 253: as drawn, but never far bigger than the people asked for
      put('pergola', (cx, cz, f) => -1.5 * d2(cx, cz, rp[1], rp[2]) + 9 * tch(cx, cz, f).n, { set: { w: cl(sz[0], 8, 30), d: cl(sz[1], 8, 30) }, rots: [0], keepRule: true }); if (!pi && all('pergola').length > n0) notes.push('Pergola where LifeWall placed it'); }
    if (all('pergola').length === n0) { const w = wh('pergola');
      put('pergola', (cx, cz, f) => sun(cx, cz, 0.35) + others(cx, cz) + (w === 'cabin' && cr && !pi ? -d2(cx, cz, cr.x + cr.w / 2, cr.z + cr.d + f[1] / 2) : w === 'back' ? -d2(cx, cz, farX(f[0]), P + f[1] / 2) : -d2(cx, cz, farX(f[0]), t.pd - P - f[1] / 2) + wallBonus(f, cx, cz, g.far) + wallBonus(f, cx, cz, 'front')), { set: { w: zz[0], d: zz[1] }, keepRule: w === 'cabin', bonus: (cx, cz, f) => tch(cx, cz, f).n * 14 }); }
    const np = all('pergola')[n0]; if (np) PR.push(rectI(np)); }
  if (!PR.length) all('pergola').forEach(o => PR.push(rectI(o)));   // 245: round 3 keeps the layout's pergolas
  const pg = by('pergola'), pr = PR[0] || null;
  if (B.deck && wh('deck') === 'pergola') PR.forEach(r => { const it = newItem('deck'); Object.assign(it, { x: r.x, z: r.z, w: r.w, d: r.d, rot: 0 }); S.items.push(it); if (clashes(it, S.items.length - 1)) S.items.pop(); });
  const rdk = B.deck && wh('deck') !== 'pergola' ? takeR('deck') : null; if (rdk) { const sz = rsz(rdk); put('deck', (cx, cz) => -3 * d2(cx, cz, rdk[1], rdk[2]), { set: { w: sz[0], d: sz[1] }, rots: [0], keepRule: true }); }
  if (B.deck && !by('deck')) { const w = wh('deck');
    if (w === 'pergola' && pr) { /* placed above, one under each pergola */ }
    else if (w === 'cabin' && cr) { const it = newItem('deck'); Object.assign(it, { x: cr.x, z: cr.z + cr.d, w: Math.min(cr.w, 14), d: 6, rot: 0 }); S.items.push(it); if (clashes(it, S.items.length - 1)) { S.items.pop(); put('deck', (cx, cz) => -d2(cx, cz, cr.x + cr.w / 2, cr.z + cr.d + 3)); } }
    else put('deck', (cx, cz, f) => -d2(cx, cz, farX(f[0]), t.pd * 0.5)); }
  for (let n = 0; n < (B.jacuzzi || 0); n++) put('jacuzzi', (cx, cz, f) => -d2(cx, cz, farX(f[0]), t.pd * 0.35) + wallBonus(f, cx, cz, g.far) - sun(cx, cz, 0.2));
  const rtf = B.turf && false ? takeR('turf') : null; if (rtf) { const sz = rsz(rtf); put('turf', (cx, cz) => -3 * d2(cx, cz, rtf[1], rtf[2]), { set: { w: cl(sz[0], 4, t.pw - 2 * P - 4), d: cl(sz[1], 4, t.pd - 2 * P - 4) }, rots: [0], keepRule: true }); }
  if (B.turf && false) { const w = wh('turf'); for (const sz of [[14, 12], [12, 10], [10, 8], [8, 6], [6, 5]]) { const it = newItem('turf'); it.w = Math.min(sz[0], t.pw - 2 * P - 4); it.d = sz[1]; const i = S.items.length; S.items.push(it);
      const ok = spotBest(it, i, (cx, cz, f) => -d2(cx, cz, g.far === 'right' ? t.pw * 0.6 : t.pw * 0.4, w === 'mid' ? t.pd / 2 : t.pd - P - f[1] / 2) - S.items.filter((o, j) => j !== i && !att(o) && CAT[o.cat].kind !== 'floor' && hit(rectI(it), rectI(o))).length * 6, [0]);
      if (ok) break; S.items.pop(); } if (!by('turf')) miss++; }
  // 3) the pathway — 241: only as stepping stones across the grass (no pathway over tiles)
  if (false) pathTo(g, M && g.door === 'front' ? [M.x + M.w / 2, M.z + M.d] : M && g.door === 'back' ? [M.x + M.w / 2, M.z] : mumtyFace(), [cab, pg, by('jacuzzi'), by('bar')].filter(Boolean), notes, all('turf').map(rectI));
  const tf = by('turf'), gc = tf ? [rectI(tf).x + rectI(tf).w / 2, rectI(tf).z + rectI(tf).d / 2] : [t.pw / 2, t.pd / 2];   // "the garden" seats look at
  // 4) seats — under the pergola they face the garden, never the parapet
  const seat = (k, wk, n) => { const w = wh(k), zz = SZF((pgq[n || 0]) || ppl)[k] || SZ[k], face = k === 'sofa' || k === 'swing', pr = PR[n || 0] || PR[0] || null;
    put(k, (cx, cz, f, rot) => (w === 'pergola' && pr ? -d2(cx, cz, pr.x + pr.w / 2, pr.z + pr.d / 2) + (inR(cx, cz, pr) && inR(cx - f[0] / 2 + 0.3, cz - f[1] / 2 + 0.3, pr) && inR(cx + f[0] / 2 - 0.3, cz + f[1] / 2 - 0.3, pr) ? 20 : 0)
      : w === 'bar' && by('bar') ? -d2(cx, cz, rectI(by('bar')).x + rectI(by('bar')).w / 2, rectI(by('bar')).z + rectI(by('bar')).d / 2 + 5) : -d2(cx, cz, farX(f[0]), t.pd * (wk || 0.55)))
      + (face ? 9 * faceTo(cx, cz, rot, gc[0], gc[1]) : 0), { set: zz ? { w: zz[0], d: zz[1] } : {}, rots: face ? [0, 90, 180, 270] : [0, 90] }); };
  for (let n = 0; n < (B.sofa || 0); n++) seat('sofa', 0.55, n); if (by('sofa') && wh('sofa') === 'pergola') notes.push('Sofa under the pergola, facing the garden');
  // 258 (owner): corners — the road side and the stairs door side / its opposite first; open space = the biggest free patch
  const CNR = olOn() ? olCorners() : [['bl', P, P], ['br', t.pw - P, P], ['fl', P, t.pd - P], ['fr', t.pw - P, t.pd - P]], OPP = { left: 'right', right: 'left', front: 'back', back: 'front' };
  const PREF = new Set(g.road.concat(g.door ? [g.door, OPP[g.door]] : []));
  const cornerPull = (cx, cz, f, only) => { let b = -99; CNR.forEach(([k, X, Z]) => { const pf = PREF.has(k[0] === 'b' ? 'back' : 'front') || PREF.has(k[1] === 'l' ? 'left' : 'right'); if (only && !pf) return;
    const qx = k[1] === 'l' ? cx - f[0] / 2 : cx + f[0] / 2, qz = k[0] === 'b' ? cz - f[1] / 2 : cz + f[1] / 2; b = Math.max(b, (pf ? 30 : 18) - 1.5 * Math.hypot(qx - X, qz - Z)); }); return b; };
  const crowd = (cx, cz, f, m) => { const r = { x: cx - f[0] / 2 - m, z: cz - f[1] / 2 - m, w: f[0] + 2 * m, d: f[1] + 2 * m }; return S.items.filter(o => !att(o) && CAT[o.cat] && CAT[o.cat].kind !== 'floor' && !UMB.has(o.cat) && hit(r, rectI(o))).length; };   // things within m ft (a walkway round it)
  const openC = () => { try { const fr = (P2.freeRects(t, S.items, 3) || [])[0]; if (fr && fr.w) return [fr.x + fr.w / 2, fr.z + fr.d / 2]; } catch (e) {} return gc; };
  const fbq = (S.su || {}).fbs || [];
  for (let n = 0; n < (B.fbench || 0); n++) { const sh = fbq[n] || 'L', lt = learned('fbench');   // 247: straight along a wall / L in a corner / curved in a corner
    if (sh === 'L') { lSeat(g, SZ.L || [10, 6], lt, PR, notes) || miss++; continue; }
    if (sh === 'straight') { put('fbench', (cx, cz, f, rot) => (backTo(cx, cz, f, rot) ? 40 : -30) - (PR.some(r => inR(cx, cz, r)) ? 30 : 0) + cornerPull(cx, cz, f, true) - (lt ? 0.1 * d2(cx, cz, lt[0], lt[1]) : 0), { rots: [0, 90, 180, 270], set: { w: (SZ.L || [10])[0], d: 2.5, label: 'Fixed seating' } }) || miss++; continue; }
    const cs = Math.max(7, Math.min(10, (SZ.L || [10])[0] - 1)), CN = olOn() ? olCorners() : [['bl', P, P], ['br', t.pw - P, P], ['fl', P, t.pd - P], ['fr', t.pw - P, t.pd - P]], ROT = { bl: 0, br: 90, fr: 180, fl: 270 };
    let best = null; CN.forEach(([k, X, Z]) => { const it = newItem('fbench'); Object.assign(it, { w: cs, d: cs, shape: 'curve', label: 'Curved seating', rot: ROT[k], x: k[1] === 'l' ? X : X - cs, z: k[0] === 'b' ? Z : Z - cs });   // a quarter arc hugging that corner
      const i = S.items.length; S.items.push(it); const ok = !clashes(it, i) && !PR.some(r => hit(rectI(it), r)); S.items.pop(); if (!ok) return;
      const sc = (g.road.includes(k[0] === 'b' ? 'back' : 'front') ? 20 : 0) - (g.dz ? (d2(it.x + cs / 2, it.z + cs / 2, g.dz.x + g.dz.w / 2, g.dz.z + g.dz.d / 2) < 10 ? 15 : 0) : 0) - (lt ? 0.2 * d2(it.x + cs / 2, it.z + cs / 2, lt[0], lt[1]) : 0); if (!best || sc > best[0]) best = [sc, it]; });
    if (best) { S.items.push(best[1]); if (n === 0) notes.push('Curved seating hugging a corner'); } else miss++; }
  for (let n = 0; n < (B.dining || 0); n++) seat('dining', 0.7, n);
  for (let n = 0; n < (B.swing || 0); n++) { const oc = openC(); put('swing', (cx, cz, f, rot) => Math.max(cornerPull(cx, cz, f), 25 - 1.2 * d2(cx, cz, oc[0], oc[1])) + 9 * faceTo(cx, cz, rot, gc[0], gc[1]) - 25 * crowd(cx, cz, f, 2.5), { rots: [0, 90, 180, 270] }); }   // 258: a corner or the open space
  for (let n = 0; n < (B.bench || 0); n++) put('bench', (cx, cz, f) => -d2(cx, cz, farX(f[0]), t.pd * 0.25) + wallBonus(f, cx, cz, g.far));
  for (let n = 0; n < (B.counter || 0); n++) { const nr = by('dining') || pg || by('fbench'), lt = learned('counter');   // food counter: its back to a wall, near where people eat
    put('counter', (cx, cz, f, rot) => (backTo(cx, cz, f, rot) ? 40 : -90) + cornerPull(cx, cz, f, true) - (nr ? 0.2 * d2(cx, cz, rectI(nr).x + rectI(nr).w / 2, rectI(nr).z + rectI(nr).d / 2) : lt ? 0.15 * d2(cx, cz, lt[0], lt[1]) : 0), { rots: [0, 90, 180, 270] });   // 258: always against a wall, in a front corner
    if (!n && by('counter')) notes.push('Food counter against the wall, near the seating'); }
  // walls: the feature wall faces the stairs, the water feature stands in front of it
  const wallAt = (sd, u, k) => { const it = newItem(k), w = it.w, run = sd === 'back' || sd === 'front' ? t.pw : t.pd, uu = Math.max(P, Math.min(run - P - w, u - w / 2));
    return sd === 'back' ? { at: [uu + w / 2, P], rot: 0 } : sd === 'front' ? { at: [uu + w / 2, t.pd - P - it.d], rot: 180 } : sd === 'left' ? { at: [P + w / 2, uu], rot: 270 } : { at: [t.pw - P - it.d + w / 2, uu], rot: 90 }; };
  const mU = M ? (g.facing === 'back' || g.facing === 'front' ? M.x + M.w / 2 : M.z + M.d / 2) : t.pd / 2;
  for (let n = 0; n < (B.feature || 0); n++) { const n0 = all('feature').length;   // 241: the first one on the wall you see as you step out of the stairs door
    if (!n && M) { const dsd = { right: 'right', left: 'left', front: 'front', back: 'back' }[g.door] || g.facing, u = dsd === 'back' || dsd === 'front' ? M.x + M.w / 2 : M.z + M.d / 2; put('feature', null, wallAt(dsd, u, 'feature')); }
    if (all('feature').length === n0) { const tf2 = learned('feature'); if (tf2) { const ds = [['back', tf2[1]], ['left', tf2[0]], ['right', t.pw - tf2[0]], ['front', t.pd - tf2[1]]].filter(z => !g.road.includes(z[0])).sort((p, q) => p[1] - q[1])[0];
        put('feature', null, wallAt(ds[0], ds[0] === 'back' || ds[0] === 'front' ? tf2[0] : tf2[1], 'feature')); } }
    if (all('feature').length === n0) put('feature', null, wallAt(g.facing, mU + n * 8, 'feature'));
    if (!n && by('feature')) notes.push('Feature wall facing the stairs door'); }
  { const fdq = (S.su || {}).fd || []; all('feature').forEach((o, i) => { o.fdesign = fdq[i] || 'fluted'; o.label = (FDES.find(z => z[0] === o.fdesign) || [0, 'Feature wall'])[1]; }); }   // 247: the design picked for each
  for (let n = 0; n < (B.water || 0); n++) { const w = wh('water'), fw = all('feature')[n] || by('feature');
    const mech = ((S.su || {}).wm || [])[n] || 'cascade', wsz = { cascade: [4, 4], wall: [6, 2.2], rain: [6, 2.5], geyser: [5, 5] }[mech];
    put('water', (cx, cz, f, rot) => (mech === 'wall' ? (backTo(cx, cz, f, rot) ? 30 : -20) : 0) + (w === 'seat' && (by('sofa') || pr) ? -d2(cx, cz, rectI(by('sofa') || pg).x + rectI(by('sofa') || pg).w + 3, rectI(by('sofa') || pg).z + 3)
      : fw ? -d2(cx, cz, rectI(fw).x + rectI(fw).w / 2 + (g.facing === 'right' ? -3 : g.facing === 'left' ? 3 : 0), rectI(fw).z + rectI(fw).d / 2 + (g.facing === 'back' ? 3 : g.facing === 'front' ? -3 : 0))
      : -d2(cx, cz, g.facing === 'right' ? t.pw - P - 3 : g.facing === 'left' ? P + 3 : t.pw / 2, g.facing === 'back' ? P + 3 : g.facing === 'front' ? t.pd - P - 3 : mU)), { rots: mech === 'wall' || mech === 'rain' ? [0, 90, 180, 270] : [0], set: { mech, w: wsz[0], d: wsz[1], label: (WMECH.find(z => z[0] === mech) || [0, 'Water feature'])[1] } });
    if (!n && by('water')) notes.push('Water feature facing the stairs'); }
  for (let k = 0; k < (B.vgarden || 0); k++) { const w = wh('vgarden'), sd = w === 'back' ? 'back' : g.far, run = sd === 'back' ? t.pw : t.pd; put('vgarden', null, wallAt(sd, run * (k + 1) / ((B.vgarden || 1) + 1), 'vgarden')); }   // 239: only when picked
  for (let n = 0; n < (B.firepit || 0); n++) { const fb = all('fbench').slice(n * 2, n * 2 + 2), so = all('sofa')[n] || by('sofa') || pg;   // in the middle of the L seating, else in front of the sofa
    const tg = fb.length === 2 ? (() => { const a = rectI(fb[0]), b = rectI(fb[1]), x0 = Math.min(a.x, b.x), x1 = Math.max(a.x + a.w, b.x + b.w), z0 = Math.min(a.z, b.z), z1 = Math.max(a.z + a.d, b.z + b.d), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;   // 258: off the L's corner by seat + 2.5 ft walkway + half the pit
      const inn = (r, X, Z) => X >= r.x - 0.2 && X <= r.x + r.w + 0.2 && Z >= r.z - 0.2 && Z <= r.z + r.d + 0.2, oc = [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].find(([X, Z]) => inn(a, X, Z) && inn(b, X, Z)) || [x0, z0], k = 2.5 + 2.5 + 1.75;
      return [oc[0] + Math.sign(cx - oc[0]) * Math.min(k, (x1 - x0) - 1.75), oc[1] + Math.sign(cz - oc[1]) * Math.min(k, (z1 - z0) - 1.75)]; })()
      : fb.length ? [rectI(fb[0]).x + rectI(fb[0]).w / 2, rectI(fb[0]).z + rectI(fb[0]).d / 2] : so ? [rectI(so).x + rectI(so).w / 2 + (g.far === 'right' ? -1 : 1) * (rectI(so).w / 2 + 2.5), rectI(so).z + rectI(so).d / 2] : [t.pw / 2, t.pd * 0.6];
    put('firepit', (cx, cz) => -d2(cx, cz, tg[0], tg[1])); }
  for (let n = 0; n < (B.umbrella || 0); n++) { const oc = openC(); put('umbrella', (cx, cz, f) => Math.max(cornerPull(cx, cz, f), 25 - 1.2 * d2(cx, cz, oc[0], oc[1])) - 25 * crowd(cx, cz, f, 0.5)); }   // 258: a corner or the open space
  // 241: bar counters are islands — open on both sides (stools in front, the bartender behind), straight or L as asked; never against a wall
  const brq = (S.su || {}).bars || [], gc0 = [t.pw / 2, t.pd / 2];
  const clearBoth = (cx, cz, f, rot) => { const r = { x: cx - f[0] / 2, z: cz - f[1] / 2, w: f[0], d: f[1] }, D = 3, al = +rot % 180 === 0, strips = al ? [{ x: r.x, z: r.z - D, w: r.w, d: D }, { x: r.x, z: r.z + r.d, w: r.w, d: D }] : [{ x: r.x - D, z: r.z, w: D, d: r.d }, { x: r.x + r.w, z: r.z, w: D, d: r.d }];
    return strips.reduce((a, sr) => a + (!inside(sr) || (t.kind === 'terrace' ? t.blocks : []).some(b => hit(sr, b)) || S.items.some(o => !att(o) && CAT[o.cat] && CAT[o.cat].kind !== 'floor' && hit(sr, rectI(o))) ? -35 : 0), 0); };
  // 245 (owner): a bar is never left in the middle of nowhere — in front of the stairs-room wall (its back to it, 3 ft for the bartender), inside a big pergola, or beside the fixed seating / pergola
  const barT = (L0) => { const T = [], d0 = L0 ? 5 : 2.5;
    (t.kind === 'terrace' ? t.blocks : []).filter(b => b.type === 'mumty' || b.type === 'room' || b.type === 'lift').forEach(b => [['back', [0, -1]], ['front', [0, 1]], ['left', [-1, 0]], ['right', [1, 0]]].forEach(([sd, n]) => {
      if (b.type === 'mumty' && sd === g.door) return; const len = n[0] ? b.d : b.w; if (len < 6) return; const off = 3 + d0 / 2, cx = n[0] ? (n[0] > 0 ? b.x + b.w + off : b.x - off) : b.x + b.w / 2, cz = n[1] ? (n[1] > 0 ? b.z + b.d + off : b.z - off) : b.z + b.d / 2;
      T.push({ x: cx, z: cz, rot: { '0,1': 0, '-1,0': 90, '0,-1': 180, '1,0': 270 }[n.join(',')], w: 30 }); }));
    PR.forEach(r => { if (r.w * r.d >= 150) T.push({ x: r.x + r.w / 2, z: r.z + r.d / 2, w: 34 }); else T.push({ x: r.x + r.w / 2, z: r.z + r.d + 4, w: 18 }); });
    all('fbench').forEach(o => { const r = rectI(o); T.push({ x: r.x + r.w / 2 + (r.x + r.w / 2 < t.pw / 2 ? 6 : -6), z: r.z + r.d / 2 + (r.z + r.d / 2 < t.pd / 2 ? 5 : -5), w: 20 }); });
    return T; };
  for (let n = 0; n < (B.bar || 0); n++) { const L = brq[n] === 'L', TT = barT(L);
    put('bar', (cx, cz, f, rot) => clearBoth(cx, cz, f, rot) - (tch(cx, cz, f).n ? 25 : 0) + (TT.length ? Math.max(...TT.map(T2 => T2.w - 1.4 * d2(cx, cz, T2.x, T2.z) + (T2.rot != null && +rot % 360 === T2.rot ? 12 : 0))) : -d2(cx, cz, gc0[0], gc0[1])) + 3 * faceTo(cx, cz, rot, gc[0], gc[1]),
      { rots: [0, 90, 180, 270], set: L ? { w: 8, d: 5, shape: 'L', label: 'Bar counter (L)' } : brq[n] === 'curve' ? { w: 8, d: 5, shape: 'curve', label: 'Curved bar' } : { label: 'Bar counter' }, keepRule: true });
    if (n === 0 && by('bar')) notes.push('Bar counter with room on both sides — by a wall, the seating or the pergola'); }
  all('bar').slice(0, B.rack || 0).forEach(b => {   // 247 (owner): a bottle rack only behind a bar — on the wall behind it when there is one, else standing behind it
    const r = rectI(b), FACE = { 0: [0, 1], 90: [-1, 0], 180: [0, -1], 270: [1, 0] }, v = FACE[(+b.rot || 0) % 360] || [0, 1], bx = -v[0], bz = -v[1], cx = r.x + r.w / 2, cz = r.z + r.d / 2, hw = v[1] ? r.d / 2 : r.w / 2;
    const tx = cx + bx * (hw + 3.6), tz = cz + bz * (hw + 3.6); let rk = put('rack', (x, z) => -d2(x, z, tx, tz) * 2, { rots: [(+b.rot || 0) % 360], set: { label: 'Bottle rack' }, noFlush: false });
    if (rk && rGap(rectI(rk), r) > 2.5) { S.items.splice(S.items.indexOf(rk), 1); rk = put('rack', (x, z, f, rot) => -2 * d2(x, z, tx, tz) + 6 * faceTo(x, z, rot, cx, cz), { rots: [0, 90, 180, 270], set: { label: 'Bottle rack' } }); }   // 253: right behind the bar, else beside it — never away from it
    if (rk && rGap(rectI(rk), r) > 2.5) { S.items.splice(S.items.indexOf(rk), 1); rk = null; notes.push('No room for the bottle rack by the bar — move the bar to make room'); }
    if (rk) notes.push('Bottle rack behind the bar'); });
  for (let n = 0; n < (B.sculpture || 0); n++) { const fw = all('feature')[n] || by('feature'), pa = by('pathway');   // 258: in front of the feature wall
    const tg = fw ? (() => { const r = rectI(fw), v = FACE[(+fw.rot || 0) % 360] || [0, 1], dep = v[0] ? r.w : r.d; return [r.x + r.w / 2 + v[0] * (dep / 2 + 2.5), r.z + r.d / 2 + v[1] * (dep / 2 + 2.5)]; })() : pa ? [pa.x + 4.5, pa.z + pa.d - 1.5] : [t.pw / 2, t.pd - 3];
    put('sculpture', (cx, cz, f) => -2 * d2(cx, cz, tg[0], tg[1]) - 10 * crowd(cx, cz, f, 1.5)); }
  if (B.lights && !(S.su && S.su.light)) { const pa = by('pathway'), n = B.lights;
    for (let k = 0; k < n; k++) { const tgt = pa ? [k % 2 ? pa.x + pa.w + 0.6 : pa.x - 0.6, pa.z + pa.d * ((Math.floor(k / 2) + 0.5) / Math.ceil(n / 2))] : [P + 1 + (t.pw - 2) * ((k + 0.5) / n), t.pd - P - 1]; put('lights', (cx, cz) => -d2(cx, cz, tgt[0], tgt[1]), { rots: [0] }); } }
  if (B.privacy) { const w = wh('privacy');
    if (w === 'part' || !g.open.length || t.kind !== 'terrace') { for (let k = 0; k < B.privacy; k++) { const before = S.items.length; addItem('privacy'); if (S.items.length === before) miss++; } }
    else { const it2 = { cat: 'privacy', mode: 'par', label: 'Screen on the parapet', sides: g.open.slice(), h: 3, w: 0, d: 0.3, x: 0, z: 0, rot: 0 }; S.items.push(it2); attach(it2, S.items.length - 1); if (!it2.w) { S.items.pop(); miss++; } else notes.push('Privacy screens on the ' + g.open.join(', ') + ' parapet'); } }
  if (B.accover && t.kind === 'terrace') coverAC();
  { const gq = (S.su || {}).gw || [], Mb = M && M.type === 'mumty' ? M : (t.blocks || []).find(b => b.type === 'mumty');   // 247 (owner): graffiti only on the wall the customer picked
    for (let n = 0; n < (B.graffiti || 0); n++) { const wv = gq[n] || (gWalls()[0] || [''])[0], [kd, sd] = wv.split(':'); if (!sd) { miss++; continue; } const it0 = newItem('graffiti');
      if (kd === 'p') { const run = sd === 'back' ? t.pw : t.pd; put('graffiti', null, Object.assign(wallAt(sd, run / 2 + (n ? 6 : 0), 'graffiti'), { set: { wsel: wv }, alt: false })); continue; }
      if (!Mb) { miss++; continue; } const len = sd === 'left' || sd === 'right' ? Mb.d : Mb.w, w = Math.max(3, Math.min(+it0.w || 10, len - 1)), d = +it0.d || 0.3;
      const at = sd === 'right' ? [Mb.x + Mb.w + w / 2, Mb.z + (Mb.d - w) / 2, 270] : sd === 'left' ? [Mb.x - d + w / 2, Mb.z + (Mb.d - w) / 2, 90] : sd === 'back' ? [Mb.x + Mb.w / 2, Mb.z - d, 180] : [Mb.x + Mb.w / 2, Mb.z + Mb.d, 0];
      const gi = Object.assign(it0, { w, d, h: Math.min(+Mb.h || 9, 8) - 0.5, rot: at[2], wsel: wv, x: r2(at[0] - w / 2), z: r2(at[1]), on: { b: t.blocks.indexOf(Mb), face: { left: 'xmin', right: 'xmax', back: 'zmin', front: 'zmax' }[sd] } });
      if (sd === 'left' || sd === 'right') { gi.x = sd === 'left' ? Mb.x - d : Mb.x + Mb.w; gi.z = r2(Mb.z + (Mb.d - w) / 2); } S.items.push(gi); if (n === 0) notes.push('Graffiti on the stairs-room wall you picked'); } }
  ['chair', 'table', 'railing', 'gate'].forEach(k => { for (let j = 0; j < (B[k] || 0); j++) { const before = S.items.length; addItem(k); if (S.items.length === before) miss++; } });
  // 5) plants LAST, once the big things stand — one in each free corner, then along the walls and round the pergola, never bunched (4 ft apart at least)
  const plants = (lv, n0) => { const C1 = P + 1.2, gap = lv === 'lush' ? 3.5 : 4.5;
    const quiet = (tg, far) => { const it = newItem('planter'); if (!it) return; const i = S.items.length; S.items.push(it); const near = (x, z) => S.items.some((o, j) => j !== i && o.cat === 'planter' && d2(x, z, o.x + 1, o.z + 1) < gap);
      const ok = spotBest(it, i, (cx, cz) => -d2(cx, cz, tg[0], tg[1]) - (near(cx, cz) ? 50 : 0), [0], g.dz && Object.assign({ fr: g.fr }, g.dz));
      if (!ok || near(it.x + 1, it.z + 1) || d2(it.x + 1, it.z + 1, tg[0], tg[1]) > (far || 4) || all('pergola').some(o => hit(rectI(it), rectI(o)))) { S.items.pop(); return; } flush(it, i); };   // never under the pergola
    (olOn() ? olCorners().map(([k, X, Z]) => [X + (k[1] === 'l' ? 1.2 : -1.2), Z + (k[0] === 'b' ? 1.2 : -1.2)]) : [[C1, C1], [t.pw - C1, C1], [C1, t.pd - C1], [t.pw - C1, t.pd - C1]]).forEach(tg => quiet(tg));
    if (n0 != null) { for (let k = 0, u = 0; k < n0; k++, u++) { const s2 = [P + 1, P + 1 + (t.pd - 2 * P - 2) * (u + 0.5) / n0]; quiet(g.far === 'right' ? [t.pw - P - 1, s2[1]] : s2, 5); } return; }
    if (lv === 'light') return;
    { const pts = []; LAY.slice(0, lv === 'lush' ? 3 : 2).forEach(L => L.els.forEach(e => { if (e[0] === 'planter') pts.push([e[1], e[2]]); })); pts.slice(0, lv === 'lush' ? 10 : 5).forEach(tg => quiet(tg, 5)); }
    const step = lv === 'lush' ? 5 : 7, fx = g.far === 'right' ? t.pw - C1 : C1, nx = g.far === 'right' ? C1 : t.pw - C1;   // 241: along the parapets
    if (olOn()) olWalls().forEach(w => { if (w.hi - w.lo < 6) return; const sd = w.vert ? (w.dir > 0 ? 'left' : 'right') : (w.dir > 0 ? 'back' : 'front'); if (g.road.includes(sd) && !(w.vert ? false : w.dir < 0 && w.at < t.pd - P - 2)) return;   // 244: along every wall of the shape (not the road side)
      for (let u = w.lo + P + 4; u < w.hi - P - 3; u += step) quiet(w.vert ? [w.at + w.dir * 1.2, u] : [u, w.at + w.dir * 1.2], 2.5); });
    else { for (let z = P + 5; z < t.pd - 5; z += step) { quiet([fx, z], 2.5); quiet([nx, z + step / 2], 2.5); }
    for (let x = P + 5; x < t.pw - 5; x += step) { if (!g.road.includes('back')) quiet([x, C1], 2.5); } }
    if (lv === 'lush') { const nx = g.far === 'right' ? C1 : t.pw - C1; for (let z = P + 8; z < t.pd - 6; z += 9) quiet([nx, z], 3); for (let x = P + 8; x < t.pw - 6; x += 9) { quiet([x, C1], 3); quiet([x, t.pd - C1], 3); } }
    if (pr) { const r = pr; [[r.x - 1, r.z - 1], [r.x + r.w + 1, r.z - 1], [r.x - 1, r.z + r.d + 1], [r.x + r.w + 1, r.z + r.d + 1]].forEach(tg => quiet(tg, 2.5)); }
    const cbs = all('cabin'); cbs.forEach(c => { const r = rectI(c); quiet([r.x - 1.2, r.z + r.d + 1], 2.5); quiet([r.x + r.w + 1.2, r.z + r.d + 1], 2.5); }); };
  if (B.turf && PH !== 'decor') grassFill(g, B.pathway, notes, mumtyFace());   // 245: the grass fills the open space left once the big pieces stand
  if (PH === 'old') { if (B.planter) plants('light', B.planter); } else if (PH !== 'el') { if (S.su && S.su.green) { plants(S.su.green); notes.push('Plants in the corners and along the walls, spaced out'); } else if (B.planter) plants('light', B.planter); }
  if (B.stool) all('bar').forEach(b => barStools(b));
  S.items.forEach((it, i) => { if (it.cat === 'pergola') pergolaAttach(it, i); });
  S.bnote = notes; return miss;
}
// 245 (owner): grass = the biggest open space left once the big pieces stand (it meets the walls / pieces round it — never a box in the middle); the stairs door and the space in front of it stay paved; stepping stones run straight across it from the side nearest the stairs
function grassFill(g, path, notes, door) {
  const t = S.site, W = Math.floor(t.pw), D = Math.floor(t.pd), occ = [], keep = [g.dz, g.fr].filter(Boolean);
  const obs = (t.kind === 'terrace' ? t.blocks : []).map(b => ({ x: b.x - 0.5, z: b.z - 0.5, w: b.w + 1, d: b.d + 1 })).concat(S.items.filter(o => !att(o) && !o.segs && o.cat !== 'pathway').map(o => { const r = rectI(o); return o.cat === 'deck' || o.cat === 'pergola' ? { x: r.x - 0.6, z: r.z - 0.6, w: r.w + 1.2, d: r.d + 1.2 } : r; }), keep);
  for (let z = 0; z < D; z++) { occ.push([]); for (let x = 0; x < W; x++) { const c = { x: x + 0.02, z: z + 0.02, w: 0.96, d: 0.96 }; occ[z].push(!inside(c) || obs.some(o => hit(c, o)) ? 1 : 0); } }
  let best = null; const hg = new Array(W).fill(0);
  for (let z = 0; z < D; z++) { for (let x = 0; x < W; x++) hg[x] = occ[z][x] ? 0 : hg[x] + 1; const st = [];
    for (let x = 0; x <= W; x++) { const hh = x < W ? hg[x] : 0; let s0 = x; while (st.length && st[st.length - 1][1] >= hh) { const [sx, sh] = st.pop(), w = x - sx; if (w >= 5 && sh >= 5 && (!best || w * sh > best.w * best.d)) best = { x: sx, z: z - sh + 1, w, d: sh }; s0 = sx; } st.push([s0, hh]); } }
  if (!best || best.w * best.d < 36) { notes.push('No open patch big enough for grass — tiles there instead'); return; }
  const it = newItem('turf'); Object.assign(it, { x: best.x, z: best.z, w: best.w, d: best.d, rot: 0 }); S.items.push(it); notes.push('Grass on the open space between the pieces');
  if (!path) return; const r = best, dx = Math.max(r.x - door[0], 0, door[0] - (r.x + r.w)), dz = Math.max(r.z - door[1], 0, door[1] - (r.z + r.d)), SW = 2;
  let pa;   // the stones line up with the stairs door when it faces the grass, else run down the middle of its long side
  if (dz >= dx && dx < 1 && r.d >= 6) pa = { x: Math.max(r.x + 0.5, Math.min(r.x + r.w - SW - 0.5, door[0] - SW / 2)), z: r.z, w: SW, d: r.d };
  else if (dx > dz && dz < 1 && r.w >= 6) pa = { x: r.x, z: Math.max(r.z + 0.5, Math.min(r.z + r.d - SW - 0.5, door[1] - SW / 2)), w: r.w, d: SW };
  else pa = r.d >= r.w ? { x: r.x + r.w / 2 - SW / 2, z: r.z, w: SW, d: r.d } : { x: r.x, z: r.z + r.d / 2 - SW / 2, w: r.w, d: SW };
  const pi = newItem('pathway'); Object.assign(pi, { x: r2(pa.x), z: r2(pa.z), w: r2(pa.w), d: r2(pa.d), rot: 0, onTurf: true, label: 'Stepping stones' }); S.items.push(pi); notes.push('Stepping stones across the grass from the stairs side');
}
// 245 (owner): bar chairs on the customer's side of each bar (away from the wall / bartender), 2 ft apart
function barStools(b) { const r = rectI(b), FACE = { 0: [0, 1], 90: [-1, 0], 180: [0, -1], 270: [1, 0] }, v = FACE[(+b.rot || 0) % 360] || [0, 1], along = v[1] ? r.w : r.d, n = Math.max(1, Math.min(5, Math.floor((along - 0.5) / 2.2)));
  for (let k = 0; k < n; k++) { const u = (k + 0.5) / n, it = newItem('stool'); if (!it) return; it.rot = (+b.rot || 0) % 360; const cx = v[1] ? r.x + r.w * u : (v[0] > 0 ? r.x + r.w + 1.1 : r.x - 1.1), cz = v[1] ? (v[1] > 0 ? r.z + r.d + 1.1 : r.z - 1.1) : r.z + r.d * u;
    it.x = r2(cx - 0.75); it.z = r2(cz - 0.75); const i = S.items.length; S.items.push(it); if (clashes(it, i)) S.items.pop(); } }
// 245: the floor look's patterned 'rugs' — Moroccan tiles under the open seating (garden walk) or under every seating area (courtyard)
function floorRugs() { const t = S.site, f = t.floor || (t.floor = {}), pr = f.preset; f.rugs = [];
  if (pr !== 'garden' && pr !== 'courtyard') return; const seat = S.items.filter(o => ['sofa', 'dining', 'fbench', 'firepit', 'swing'].includes(o.cat) || (pr === 'courtyard' && o.cat === 'pergola' && !S.items.some(d => d.cat === 'deck' && hit(rectI(d), rectI(o)))));
  const grp = []; seat.forEach(o => { const r = rectI(o), m = { x: r.x - 1, z: r.z - 1, w: r.w + 2, d: r.d + 2 }, gg = grp.find(G => hit(G, m)); if (gg) { const x0 = Math.min(gg.x, m.x), z0 = Math.min(gg.z, m.z); gg.w = Math.max(gg.x + gg.w, m.x + m.w) - x0; gg.d = Math.max(gg.z + gg.d, m.z + m.d) - z0; gg.x = x0; gg.z = z0; } else grp.push(m); });
  grp.forEach(G => { if (S.items.some(o => (o.cat === 'deck' || (o.cat === 'turf' && pr === 'garden')) && hit(rectI(o), G))) return; const x0 = Math.max(P0(), G.x), z0 = Math.max(P0(), G.z), x1 = Math.min(t.pw - P0(), G.x + G.w), z1 = Math.min(t.pd - P0(), G.z + G.d); if (x1 - x0 > 3 && z1 - z0 > 3) f.rugs.push([r2(x0), r2(z0), r2(x1 - x0), r2(z1 - z0)]); });
  if (pr === 'garden') f.rugs = f.rugs.slice(0, 1); }
// 239: the pathway reaches the stairs door and the big things (cabin, pergola…) — a spine through the middle, only as long as it needs, + short stubs to each
function pathTo(g, door, tgs, notes, turfs) {   // 241: turfs → the path is kept only where it crosses the grass (stepping stones), else one line across it   // a 3 ft path routed on a ½-ft grid round what stands there (fewest turns), from the stairs door to each big thing's edge
  const t = S.site, P = g.P, W = 3, H = W / 2, q = 0.5, NX = Math.floor(t.pw / q), NZ = Math.floor(t.pd / q), occ = new Uint8Array(NX * NZ);
  const obs = (t.kind === 'terrace' ? t.blocks : []).map(b => ({ x: b.x, z: b.z, w: b.w, d: b.d })).concat(S.items.filter(o => !att(o) && CAT[o.cat] && !['pergola', 'deck'].includes(o.cat) && CAT[o.cat].kind !== 'floor').map(rectI)), soft = S.items.filter(o => o.cat === 'pergola' || o.cat === 'deck').map(rectI);   // you walk through a pergola / over a deck: passable, not paved
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const x = (i + 0.5) * q, z = (j + 0.5) * q, r = { x: x - q / 2 + 0.01, z: z - q / 2 + 0.01, w: q - 0.02, d: q - 0.02 };
    occ[j * NX + i] = !inside(r) || obs.some(o => x > o.x && x < o.x + o.w && z > o.z && z < o.z + o.d) ? 1 : 0; }
  const ps = new Int32Array((NX + 1) * (NZ + 1)); for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) ps[(j + 1) * (NX + 1) + i + 1] = occ[j * NX + i] + ps[j * (NX + 1) + i + 1] + ps[(j + 1) * (NX + 1) + i] - ps[j * (NX + 1) + i];
  const SO = new Uint8Array((NX + 1) * (NZ + 1)); for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) { const x = i * q, z = j * q; if (soft.some(o => x > o.x - H && x < o.x + o.w + H && z > o.z - H && z < o.z + o.d + H)) SO[j * (NX + 1) + i] = 1; }
  const k = H / q, free = (i, j) => { const i0 = i - k, j0 = j - k, i1 = i + k, j1 = j + k; if (i0 < 0 || j0 < 0 || i1 > NX || j1 > NZ) return false; return ps[j1 * (NX + 1) + i1] - ps[j0 * (NX + 1) + i1] - ps[j1 * (NX + 1) + i0] + ps[j0 * (NX + 1) + i0] === 0; };   // the 3 × 3 ft square round grid point (i, j) is clear
  const pt = (x, z) => [Math.round(x / q), Math.round(z / q)], id = (i, j) => j * (NX + 1) + i;
  const tree = new Set(), segs = [];
  const route = (starts, goal) => {   // Dijkstra over (point, heading); a turn costs 6 ft
    const N = (NX + 1) * (NZ + 1), dist = new Float64Array(N * 4).fill(1e9), prev = new Int32Array(N * 4).fill(-1), hp = [], push = (c, v) => { hp.push([c, v]); let n = hp.length - 1; while (n) { const pp = (n - 1) >> 1; if (hp[pp][0] <= hp[n][0]) break; [hp[pp], hp[n]] = [hp[n], hp[pp]]; n = pp; } },
      pop = () => { const top = hp[0], last = hp.pop(); if (hp.length) { hp[0] = last; let n = 0; for (;;) { const l = 2 * n + 1, r = l + 1; let m = n; if (l < hp.length && hp[l][0] < hp[m][0]) m = l; if (r < hp.length && hp[r][0] < hp[m][0]) m = r; if (m === n) break; [hp[m], hp[n]] = [hp[n], hp[m]]; n = m; } } return top; };
    const D = [[1, 0], [-1, 0], [0, 1], [0, -1]]; starts.forEach(([i, j, c0]) => { if (!free(i, j)) return; for (let h = 0; h < 4; h++) { dist[id(i, j) * 4 + h] = c0 || 0; push(c0 || 0, id(i, j) * 4 + h); } });
    while (hp.length) { const [c, v] = pop(); if (c > dist[v]) continue; const n = v >> 2, h = v & 3, i = n % (NX + 1), j = (n / (NX + 1)) | 0;
      if (goal(i, j)) { const out = []; let u = v; while (u >= 0) { const nn = u >> 2; out.push([nn % (NX + 1), (nn / (NX + 1)) | 0]); u = prev[u]; } return out.reverse(); }
      for (let h2 = 0; h2 < 4; h2++) { const i2 = i + D[h2][0], j2 = j + D[h2][1]; if (i2 < 0 || j2 < 0 || i2 > NX || j2 > NZ || !free(i2, j2)) continue; const v2 = id(i2, j2) * 4 + h2, c2 = c + q * (SO[id(i2, j2)] ? 3 : 1) + (h2 === h ? 0 : 6);
        if (c2 < dist[v2]) { dist[v2] = c2; prev[v2] = v; push(c2, v2); } } }
    return null; };
  // start: just outside the stairs door
  const st = []; { const [di, dj] = pt(door[0], door[1]); for (let r = k; r <= k + 4; r++) for (const [a2, b2] of [[0, r], [0, -r], [r, 0], [-r, 0]]) if (free(di + a2, dj + b2)) st.push([di + a2, dj + b2]); st.splice(4);
    const M = g.M; if (M) { const out = [];   // a door that opens into a dead end: the path may also start at another face of the stairs room (costs more)
      for (let x = M.x + H; x <= M.x + M.w - H; x += 1) { out.push([x, M.z - H - 0.1], [x, M.z + M.d + H + 0.1]); } for (let z = M.z + H; z <= M.z + M.d - H; z += 1) { out.push([M.x - H - 0.1, z], [M.x + M.w + H + 0.1, z]); }
      out.forEach(([x, z]) => { const [i, j] = pt(x, z); if (free(i, j)) st.push([i, j, 25 + Math.hypot(x - door[0], z - door[1])]); }); }
    if (!st.length) { notes.push('No room for a pathway from the stairs — add one on the plan'); return false; } }
  let n = 0, S0 = null; const R = tgs.map(rectI).sort((a2, b2) => Math.hypot(a2.x + a2.w / 2 - door[0], a2.z + a2.d / 2 - door[1]) - Math.hypot(b2.x + b2.w / 2 - door[0], b2.z + b2.d / 2 - door[1]));
  R.forEach(r => { const touch = (i, j) => { const x = i * q, z = j * q; return (x > r.x + 0.5 && x < r.x + r.w - 0.5 && (Math.abs(z + H - r.z) < 0.3 || Math.abs(z - H - (r.z + r.d)) < 0.3)) || (z > r.z + 0.5 && z < r.z + r.d - 0.5 && (Math.abs(x + H - r.x) < 0.3 || Math.abs(x - H - (r.x + r.w)) < 0.3)); };
    const from = tree.size ? [...tree].map(v => [v % (NX + 1), (v / (NX + 1)) | 0]) : st, path = route(from, touch); if (!path) return; n++; if (!S0) S0 = st.find(z => z[0] === path[0][0] && z[1] === path[0][1]) || path[0];
    path.forEach(([i, j]) => tree.add(id(i, j)));
    const cn = [path[0]]; for (let m = 1; m < path.length - 1; m++) { const A = path[m - 1], Bq = path[m], Cq = path[m + 1]; if ((Bq[0] - A[0]) !== (Cq[0] - Bq[0]) || (Bq[1] - A[1]) !== (Cq[1] - Bq[1])) cn.push(Bq); } cn.push(path[path.length - 1]);
    for (let m = 1; m < cn.length; m++) segs.push([cn[m - 1], cn[m]]); });
    if (!n && !turfs) { notes.push('No room for a pathway — add one on the plan'); return false; }
  const rects = [];
  if (S0 && !S0[2]) { const f0 = S0, fx = f0[0] * q, fz = f0[1] * q;   // the door end: from the door face to the first point (nothing inside the stairs room)
    if (Math.abs(fx - door[0]) > Math.abs(fz - door[1])) rects.push({ x0: Math.min(door[0], fx - H), x1: Math.max(door[0], fx + H), z0: fz - H, z1: fz + H }); else rects.push({ x0: fx - H, x1: fx + H, z0: Math.min(door[1], fz - H), z1: Math.max(door[1], fz + H) }); }
  segs.forEach(([A, Bp]) => rects.push({ x0: Math.min(A[0], Bp[0]) * q - H, x1: Math.max(A[0], Bp[0]) * q + H, z0: Math.min(A[1], Bp[1]) * q - H, z1: Math.max(A[1], Bp[1]) * q + H }));
  const cut = (r, o) => { if (!(r.x0 < o.x + o.w && r.x1 > o.x && r.z0 < o.z + o.d && r.z1 > o.z)) return [r]; const out = [];   // the paving stops at a pergola / deck
    if (r.x1 - r.x0 >= r.z1 - r.z0) { if (r.x0 < o.x) out.push(Object.assign({}, r, { x1: o.x })); if (r.x1 > o.x + o.w) out.push(Object.assign({}, r, { x0: o.x + o.w })); }
    else { if (r.z0 < o.z) out.push(Object.assign({}, r, { z1: o.z })); if (r.z1 > o.z + o.d) out.push(Object.assign({}, r, { z0: o.z + o.d })); } return out; };
  let pv = rects; soft.forEach(o => { pv = pv.flatMap(r => cut(r, o)); });
  if (turfs) { const on = [];   // stepping stones through the middle of the grass, along its long side
    turfs.forEach(o => { if (o.w >= o.d) on.push({ x0: o.x + 0.75, x1: o.x + o.w - 0.75, z0: o.z + o.d / 2 - 1.25, z1: o.z + o.d / 2 + 1.25 }); else on.push({ x0: o.x + o.w / 2 - 1.25, x1: o.x + o.w / 2 + 1.25, z0: o.z + 0.75, z1: o.z + o.d - 0.75 }); });
    pv = on; }
  pv.forEach(({ x0, x1, z0, z1 }) => { if (x1 - x0 < 0.9 || z1 - z0 < 0.9) return;
    const it = newItem('pathway'); Object.assign(it, { x: Math.max(P, x0), z: Math.max(P, z0), w: Math.min(t.pw - P, x1) - Math.max(P, x0), d: Math.min(t.pd - P, z1) - Math.max(P, z0), rot: 0 }, turfs ? { onTurf: true } : {}); S.items.push(it); });
  notes.push(turfs ? 'Stepping stones across the grass' : 'Pathway from the stairs to ' + (tgs.some(o => o.cat === 'cabin') ? 'the cabin' : 'the seating')); return true;
}
// 239: built-in seating as an L in a corner of two walls (parapet / the stairs room) — under the pergola when it stands in a corner
function lSeat(g, sz, lt, PRS, notes) {   // 241: open to the sky (never under a pergola), best in a corner on the road side
  const t = S.site, P = g.P, D = 2, cn = olOn() ? olCorners() : [['bl', P, P], ['br', t.pw - P, P], ['fl', P, t.pd - P], ['fr', t.pw - P, t.pd - P]];
  let best = null;
  for (const [k, X, Z] of cn) { const left = k[1] === 'l', back = k[0] === 'b';
    for (let s0 = 0; s0 < 4; s0++) { const La = Math.max(4, sz[0] - s0 * 2), Lb = Math.max(3, sz[1] - s0 * 1.5);
      const A = { cat: 'fbench', w: La, d: D, h: 1.6, rot: back ? 0 : 180, x: left ? X : X - La, z: back ? Z : Z - D, label: 'Fixed seating' };
      const Bb = { cat: 'fbench', w: Lb, d: D, h: 1.6, rot: left ? 270 : 90, x: left ? X : X - D, z: back ? Z + D : Z - D - Lb, label: 'Fixed seating' };
      S.items.push(A); const okA = !clashes(A, S.items.length - 1); S.items.push(Bb); const okB = okA && !clashes(Bb, S.items.length - 1); S.items.pop(); S.items.pop();
      if (!okB || (PRS || []).some(r => hit(rectI(A), r) || hit(rectI(Bb), r))) continue;
      const cx = left ? X + La / 3 : X - La / 3, cz = back ? Z + Lb / 3 : Z - Lb / 3, roadSide = g.road.includes(back ? 'back' : 'front') ? 1 : 0;
      const sc = roadSide * 30 - (lt ? 0.15 * Math.hypot(cx - lt[0], cz - lt[1]) : 0) - (g.dz ? (Math.hypot(cx - (g.dz.x + g.dz.w / 2), cz - (g.dz.z + g.dz.d / 2)) < 10 ? 12 : 0) : 0) - s0 * 3;
      if (!best || sc > best[0]) best = [sc, A, Bb]; break; } }
  if (!best) return false; { const gid = 'L' + Math.random().toString(36).slice(2, 7); best[1].grp = gid; best[2].grp = gid; } S.items.push(best[1], best[2]); notes.push('Built-in L seating in the open corner on the road side'); return true;
}
const inR2 = (cx, cz, r) => cx > r.x - 1 && cx < r.x + r.w + 1 && cz > r.z - 1 && cz < r.z + r.d + 1;
function stepPick() {
  if (!S.items.length) return '<h4>Pick designs</h4><p class="pl-sub">Add something to your space first.</p>';
  if (!priceOk()) return '<h4>Pick designs</h4><p class="pl-sub">Sign in to see the designs at your sizes and their prices.</p><button type="button" class="pl-lock" data-pl="unlock">🔒 Sign in to see prices</button>';
  if (S.cust && S.items[S.cust.i]) return custSheet();
  let h = '<h4>Pick designs</h4><p class="pl-sub">Each thing at the size you set — tap a design to choose it, then Customise it. Change the size in step 2.</p>';
  S.items.forEach((it, i) => { if (it.old) return;
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

const SUV = 253;   // 253: a setup made before the placement fixes is set up again once (same answers, existing things kept where they were put)
function suMig() { const su = S.su; if (!su || su.cv === SUV) return false; su.cv = SUV; if (!(su.q >= SUQ.indexOf('eplan') || su.done) || !S.items.some(o => !o.old)) return false;
  if (!S.bsel || !Object.keys(S.bsel).length) { const B = {}; S.items.forEach(o => { if (!o.old && CAT[o.cat] && !att(o) && o.cat !== 'pathway') B[o.cat] = (B[o.cat] || 0) + 1; }); if (S.items.some(o => o.cat === 'privacy' && o.mode === 'par')) B.privacy = 1; if (S.items.some(o => o.cat === 'accover')) B.accover = 1; S.bsel = B; }
  try { suCompose(su.decorDone ? 'all' : 'el'); } catch (e) { return false; } return true; }
function draw(rec) { if (suMig()) return;
  if (QUIET) return;
  if (S.items) { S.items.forEach((it, i) => { if (att(it)) attach(it, i); }); S.items = S.items.filter(it => it.mode !== 'ac' || it.box); S.items.forEach((it, i) => { if (it.cat === 'pergola') pergolaAttach(it, i); }); if (S.sel != null && !S.items[S.sel]) S.sel = null; }
  if (rec !== false) hist(); save();
  document.getElementById('plSt').innerHTML = btn('data-pl="step:0"', S.step === 0, '1 · <span class="pl-l">Your </span>space') + btn('data-pl="step:1"', S.step === 1, '2 · Add<span class="pl-l"> things</span>') + btn('data-pl="step:2"', S.step === 2, '3 · Pick<span class="pl-l"> designs</span>');
  if (gateDue() && !priceOk()) S.gate = true;
  if (suNeed() && !(S.su && S.su.on)) setTimeout(() => suOpen(0), 0);
  document.getElementById('plPn').innerHTML = S.gate && !priceOk() ? gateCard() : S.step === 0 ? stepSite() : S.step === 2 ? stepPick() : stepPlace();
  EL.classList.toggle('pl-locked', !!(S.gate && !priceOk())); paintSaved();
  const T = total(), lock = !priceOk();
  const E = exact();
  document.getElementById('plFt').innerHTML = S.step === 0 ? (siteLast() ? '<button type="button" class="pl-go" data-pl="step:1">Next: add things →</button>' : '<button type="button" class="pl-go" data-pl="tsq:1">Next →</button>')
    : S.step === 2 ? (lock || !S.items.length ? '' : `<div class="pl-tot"><b>${E.n ? lakh(E.t) : '—'}</b><small>${E.n} design${E.n === 1 ? '' : 's'} · before delivery & installation (added at checkout)</small></div><button type="button" class="pl-go" data-pl="cart"${E.n ? '' : ' disabled'}>Add all to cart</button>`)
    : `<div class="pl-tot">${S.items.length ? (lock ? '<b>🔒</b><small>Sign in to see the estimate</small>' : (T.n ? `<b>${lakh(T.t)}+</b><small>${S.items.length} thing${S.items.length > 1 ? 's' : ''} · starting price${T.n < S.items.length ? ' of ' + T.n : ''}, before delivery & installation</small>` : `<b>—</b><small>Prices open soon for these</small>`)) : '<b>—</b><small>Add something to see the estimate</small>'}</div>` + (S.items.length ? '<button type="button" class="pl-go" data-pl="step:2">Pick designs →</button>' : '');
  document.getElementById('plZ').innerHTML = `<button type="button" data-pl="undo" aria-label="Undo" title="Undo (Ctrl+Z)"${S.hi > 0 ? '' : ' disabled'}>↶</button><button type="button" data-pl="redo" aria-label="Redo" title="Redo (Ctrl+Y)"${S.hi < S.hist.length - 1 ? '' : ' disabled'}>↷</button>` +
    `<button type="button" data-pl="view" class="${S.view === 'top' ? 'on' : ''}" aria-label="${S.view === 'top' ? '3D view' : 'Top view'}" title="${S.view === 'top' ? '3D view' : 'Top view'}">${S.view === 'top' ? '🧊' : '▦'}</button><button type="button" data-pl="zin" aria-label="Zoom in">+</button><button type="button" data-pl="zout" aria-label="Zoom out">−</button><button type="button" data-pl="home" aria-label="Whole space" title="Whole space">⌖</button>${S.su && S.su.done ? '<button type="button" data-pl="plan2d" aria-label="Edit the 2D plan" title="Edit the 2D plan">📐</button>' : ''}<button type="button" data-pl="night" class="${S.night ? 'on' : ''}" aria-label="${S.night ? 'Day view' : 'Night view'}" title="${S.night ? 'Day view' : 'Night view'}">${S.night ? '☀️' : '🌙'}</button>` + (S.items.length ? '<button type="button" data-pl="share" aria-label="Share this plan" title="Share this plan">🔗</button><button type="button" data-pl="pdf" aria-label="Save as PDF" title="Save as PDF">⎙</button>' : '');
  try { tabs3(); } catch (e) {}
  try { S3.show(document.getElementById('pl3d'), { site: S.site, items: S.items, sel: S.step === 1 ? S.sel : null, cabinCfg, cabinLay, pergolaSku: 'MTO-PG-TW', noDrag: !!(S.su && S.su.done), theme: (S.su && S.su.theme) || 'natural', night: !!S.night }, { place: S.step === 0, view: S.view }); } catch (e) { if (window.console) console.warn(e); }
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
    case 'plan2d': suOpen(SUQ.length - 1); return;
    case 'night': S.night = !S.night; return draw(false);
    case 'look': { S.su = S.su || {}; S.su.theme = a[1]; S.site.floor = Object.assign({ pebble: true }, S.site.floor || {}); if (!['greek', 'geometric', 'keep'].includes(S.site.floor.preset)) S.site.floor.tile = (THEME_T[a[1]] || THEME_T.natural)[1]; S.site.floor.theme = a[1]; ev('plan_theme', { ref: a[1] }); break; }
    case 'view': S.view = S.view === 'top' ? '3d' : 'top'; return draw(false);
    case 'step': if (a[1] === '0' && S.site.kind === 'terrace' && S.su && S.su.done && window.mtoSpaceAsk) { suRoof(); return; }
      if (S.step !== +a[1]) ev('plan_step', { ref: a[1] }); S.step = +a[1]; S.sel = null; S.ask = null; S.cust = null; for (const k in PC) delete PC[k]; if (S.step >= 1 && S.pend) { putPieces(S.pend); S.pend = null; } break;
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
    case 'ctab': popAt(null); { const el = document.getElementById('plPop'); if (el) { el.dataset.stick = ''; el.style.display = 'none'; } } openTab(+a[1]); return;
    case 'ctx': S.ctabs = (S.ctabs || []).filter(j => j !== +a[1]); tabs3(); return;
    case 'popx': { const el = document.getElementById('plPop'); if (el) { el.dataset.stick = ''; el.style.display = 'none'; } return; }
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
  else if (ev.t === 'hover') return;   // 256 (owner): no Customise popover on the 3D — cabins / pergolas are customised in step 3 (Pick designs), after furniture & decor
  else if (ev.t === 'sel') { S.sel = ev.i; popAt(null); }
  draw();
}
// 248 (owner): a pergola / cabin in the plan — hover (or tap) → 'Customise' popover; each one customised opens as its own tab over the viewer; 'View in plan' brings it back updated
function cName(i) { const it = S.items[i]; if (!it) return ''; const same = S.items.filter(o => o.cat === it.cat && !o.old); return (it.cat === 'cabin' ? 'Cabin' : 'Pergola') + (same.length > 1 ? ' ' + (same.indexOf(it) + 1) : ''); }
function popAt(i, x, y, stick) { const el = document.getElementById('plPop'); if (!el) return; if (i == null) { if (!el.dataset.stick) el.style.display = 'none'; return; }
  el.dataset.stick = stick ? '1' : ''; el.style.display = 'block'; el.style.left = Math.max(8, x - 80) + 'px'; el.style.top = Math.max(8, y - 64) + 'px';
  el.innerHTML = `<b>${esc(cName(i))}</b><button type="button" data-pl="ctab:${i}">✎ Customise ${S.items[i].cat === 'cabin' ? 'cabin' : 'pergola'}</button>${stick ? '<button type="button" class="pl-popx" data-pl="popx" aria-label="Close">✕</button>' : ''}`; }
function tabs3() { const el = document.getElementById('plT3'); if (!el) return; el.innerHTML = ''; el.style.display = 'none'; return;   // 256: tabs moved out of the 3D (customise in step 3) const T = (S.ctabs || []).filter(i => S.items[i] && (S.items[i].cat === 'pergola' || S.items[i].cat === 'cabin')); S.ctabs = T;
  el.style.display = T.length ? 'flex' : 'none'; el.innerHTML = `<button type="button" class="on">${P2.ico('tiles')} Plan</button>` + T.map(i => `<button type="button" data-pl="ctab:${i}">${P2.ico(S.items[i].cat)} ${esc(cName(i))}<i data-pl="ctx:${i}" aria-label="Close tab">✕</i></button>`).join(''); }
function openTab(i) { const it = S.items[i]; if (!it) return; S.ctabs = (S.ctabs || []).filter(j => j !== i).concat(i); S.sel = i; ev('plan_design', { ref: it.cat + '_tab' });
  const c = JSON.parse(JSON.stringify(it)); if (it.cat === 'pergola' && !c.cfgId && !c.pick) c.pick = 'MTO-PG-TW'; if (it.cat === 'cabin' && !c.sku) { const d0 = designs(CAT.cabin)[0]; if (d0) c.sku = d0.id || d0.sku || d0; }
  save(); const ok = window.mtoFromPlan && window.mtoFromPlan(i, c, JSON.parse(JSON.stringify(S.site))); if (ok) { close(); return; } S.msg = 'Couldn\'t open the designer — try again'; draw(); }
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
    if (seed.site && seed.site.kind === 'terrace') { const t = seed.site; S.site = { kind: 'terrace', plot: t.plot || '', pw: +t.pw, pd: +t.pd, par: +t.par || 3, corner: t.corner || '', road_front: t.road_front, road_back: !!t.road_back, high: t.high || {}, tanks: t.tanks !== false, cuts: t.cuts, outline: t.outline, blocks: (t.blocks || []).map(b => Object.assign({ type: BLK[b.type] ? b.type : 'room', side: b.side || 'free', w: +b.w, d: +b.d, x: +b.x, z: +b.z }, +b.h > 0 ? { h: +b.h } : {})) }; }
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