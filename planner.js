// outrr "Plan your space" (192) — phase 1: set up the terrace or lawn, then place things on it.
// Cabins and pergolas are the real models; every other Made to Order category is one common model the customer sizes and
// places; each shows "from ₹" = the cheapest live design of that category at that size (store price engine, window.mtoPrice).
// Rules: nothing goes over the parapet / boundary, nothing sits on another thing or on a block (decking is a floor: things
// stand on it); railings / gates snap to the edge, wall-type things to the parapet or a block when near. Blocks on the roof
// move only in step 1. Undo / redo. Saved in this browser (localStorage outrr_plan). Phase 2: pick the real design per item + cart.
import * as S3 from './space3d.js?v=83';
import * as P2 from './plan2d.js?v=36';
import { PLANT_LIGHT, plantSpread } from './plants3d.js?v=4';
import { cutHit, mumtyProj, mstGap, mstGeom } from './cabin3d.js?v=73';
import * as TM from './terrace-match.js?v=5';

const KEY = 'outrr_plan', PAR = 0.75;
const PLOTS = [['100', 20, 45], ['125', 25, 45], ['200', 30, 60], ['300', 40, 67], ['400', 40, 90], ['500', 50, 90]];
const AU = () => { try { return localStorage.getItem('outrr_area_unit') === 'm' ? 'm' : 'yd'; } catch (e) { return 'yd'; } }, plotLab = g => AU() === 'm' ? Math.round(+g * 0.836127) + ' sq m' : g + ' sq yd';   // plot size in sq yd (gaj) or sq m
const BHD = { mumty: 9, lift: 11, shaft: 3, room: 9 };   // = cabin3d.js BH_: a block's height when not typed
const BLK = { mumty: ['Mumty (staircase room)', 10, 18], lift: ['Lift room', 6, 6], shaft: ['Shaft (open duct)', 3, 4], room: ['Room already built', 10, 12], ac: ['AC outdoor unit', 3, 1.2], troom: ['Temporary room (net / PVC)', 10, 10] };
const CUTS = [['bl', 'Back-left'], ['br', 'Back-right'], ['fl', 'Front-left'], ['fr', 'Front-right']];   // front = the road side
// kind: free (stands anywhere) | floor (decking: things stand on it) | edge (along the parapet / boundary) | wall (a panel; snaps to a wall when near)
// fit: how the size maps to the price engine — l / w / h are taken from the item's length, depth and height
const CATS = [
  { k: 'cabin', t: 'Cabin', e: '🏠', col: 'cabins', kind: 'free' },
  { k: 'pergola', t: 'Pergola', e: '⛱️', col: 'shade', sb: /pergola/i, kind: 'free', w: 12, d: 10, h: 8, min: [6, 6], max: [80, 60], hr: [7, 12], size: 'wd' },
  { k: 'sofa', t: 'Sofa set', e: '🛋️', col: 'furniture', sb: /sofa/i, kind: 'free', w: 10, d: 8, h: 3, size: 'fixed' },
  { k: 'swing', t: 'Swing', e: '🪢', col: 'furniture', sb: /swing|jhool|jhul/i, kind: 'free', w: 6, d: 4.5, h: 7, size: 'fixed', always: true },
  { k: 'dining', t: 'Dining set', e: '🍽️', col: 'furniture', sb: /dining/i, kind: 'free', w: 7, d: 6, h: 3.2, size: 'fixed' },
  { k: 'chair', t: 'Chairs', e: '🪑', col: 'furniture', sb: /chair/i, kind: 'free', w: 2.5, d: 2.5, h: 3, size: 'fixed' },
  { k: 'bench', t: 'Bench', e: '🪵', col: 'furniture', sb: /bench/i, kind: 'free', w: 5, d: 2, h: 1.6, size: 'fixed' },
  { k: 'table', t: 'Table', e: '🟫', col: 'furniture', sb: /table/i, kind: 'free', w: 3, d: 3, h: 2.5, size: 'fixed' },
  { k: 'bar', t: 'Bar counter', e: '🍸', col: 'bar-counters', kind: 'free', w: 8, d: 2.5, h: 3.6, min: [4, 2.5], max: [24, 2.5], size: 'w' },
  { k: 'planter', t: 'Planter', e: '🪴', col: 'planters', kind: 'free', w: 2, d: 2, h: 3.5, size: 'wd' },
  { k: 'plant', t: 'Plant', e: '🌴', col: 'plants', kind: 'free', w: 2, d: 2, h: 5, size: 'fixed', always: true, rts: true, nolabel: true },   // 218b: a real Landscape Plant (ready to ship, Delhi NCR) — species + size, its own 3D model   // 199: outrr planters are made to your length × width
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
  { k: 'fbench', t: 'Fixed seating', e: '💺', col: 'benches', kind: 'free', w: 8, d: 3, h: 1.6, min: [3, 3], max: [30, 6], size: 'w', always: true },   // 239: built-in (civil / MS) seating, L-shaped on the walls
  { k: 'counter', t: 'Food counter', e: '🍳', col: 'bar-counters', kind: 'free', w: 8, d: 2.5, h: 3, min: [4, 2.5], max: [20, 2.5], size: 'w', always: true },   // 239: buffet / cooking counter
  { k: 'mstair', t: 'Stairs to the stairs-room roof', e: '🪜', kind: 'free', w: 2, d: 2, h: 9, size: 'fixed', always: true },
  { k: 'works', t: 'Repair & refurbish work', e: '🧰', kind: 'free', w: 2, d: 2, h: 1, size: 'fixed', always: true },   // 273: floor / coping work (not drawn, priced by our team)   // 263: drawn with the roof (site.mstair)
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
function save() { if (QUIET) return; try { localStorage.setItem(KEY, JSON.stringify({ v: 1, step: S.step, site: S.site, items: S.items, su: S.su || null, bsel: S.bsel || null, pid: S.pid || null, pname: S.pname || '', source: S.source || '', ctabs: S.ctabs || [], sh: S.sh || null, link: S.link || null })); } catch (e) {} if (S.dirty !== false) cloudSoon(); }
// ---------------------------------------------------------------- 195: plans saved to the customer's account; sign-in asked 1 minute in
const ev = (k, d) => { if (QUIET) return; try { if (window.otrack) window.otrack(k, d || {}); } catch (e) {} };
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
function cloudSoon(extra) { if (!S || S.ro || (S.sh && S.sh.role !== 'edit') || (!assistTok() && (!signedIn() || !priceOk()))) return; clearTimeout(cloudT); cloudT = setTimeout(() => cloudSave(extra), extra ? 0 : 3000); }
async function cloudSave(extra) {
  if (cloudBusy || !S) return; cloudBusy = true;
  try {
    const est = S.step === 2 ? exact().t : total().t, first = !S.pid;
    const pl = Object.assign({ id: S.pid || null, name: S.pid ? undefined : S.pname || undefined, kind: S.site.kind === 'terrace' ? 'terrace' : 'lawn', site: S.site, items: S.items, step: S.step,
      setup: { su: S.su || null, bsel: S.bsel || null, ctabs: S.ctabs || [] }, est: Math.round(est || 0), pincode: pinNow(), device: innerWidth < 760 ? 'mobile' : 'desktop', source: S.source || 'planner' }, extra || {});
    if (S.ro || (S.sh && S.sh.role !== 'edit')) return;   // 224: view only / someone else is editing
    if (S.sh) { pl.id = S.sh.id; delete pl.name; }
    const r = assistTok() ? await anonRpc('sales_plan_save', { p_token: assistTok(), p: pl }) : S.sh ? await rpc('shared_plan_save', { p: pl }) : await rpc('plan_save', { p: pl });
    if (r && r.id) { S.pid = r.id; if (!S.sh) S.pname = r.name; S.saveErr = ''; S.savedAt = Date.now(); S.dirty = false; save(); S.dirty = true; paintSaved(); if (first) ev('plan_save', {});  markProp(); }
  } catch (e) { S.saveErr = String(e.message || e); paintSaved(); } finally { cloudBusy = false; }
}
function paintSaved() { const el = document.getElementById('plSv'); if (!el || !S) return;
  if (S.sh || S.ro) { const sh = S.sh;   // 224: a plan shared with me / someone else editing my plan
    el.innerHTML = (sh ? `<span title="Shared with you">${esc(S.pname || 'Shared plan')} · shared by ${esc(sh.owner)} · ${sh.role === 'edit' ? 'can edit' : 'view only'}</span>` : `<span>✓ ${esc(S.pname || 'Saved')}</span>`) +
      (S.ro ? `<span style="color:#9B2C22">${esc(S.ro)} is editing right now — you can look, changes here are not saved</span><button type="button" data-pl="shretry">Try again</button>` : sh && sh.role !== 'edit' ? '<span class="mut">Changes here are not saved</span>' : '') +
      (sh ? '<button type="button" data-pl="shcopy">Make my own copy</button>' : ''); return; }
  el.innerHTML = S.pid ? `<span title="Saved to your account">✓ ${esc(S.pname || 'Saved')}</span><button type="button" data-pl="rename" aria-label="Rename this plan">✎</button><button type="button" data-pl="newplan">＋ New plan</button>` : (S.saveErr && signedIn() ? `<span style="color:#9B2C22">${esc(S.saveErr)}</span>` : '') + `<span title="Name of this plan">${esc(S.pname || 'New plan')}</span><button type="button" data-pl="rename" aria-label="Name this plan">✎</button>`; }   // 273 (owner): the plan can be named on every step
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
const att = it => !!(it && (it.mode === 'par' || it.mode === 'tank' || it.mode === 'ac' || it.mode === 'shaft' || it.mode === 'mst'));   // 193c: screens fixed on the parapet / on the mumty — no floor footprint
const OVSH = new Set(['deck', 'pergola', 'cabin']);   // 258
function doorZones(q) {   // 259 (owner): the floor in front of every door (stairs room, room, lift) stays free of things; q = how deep (4′ 6″; a thing placed by hand may come to 3 ft — a clear walkway, 304)
  q = q || 4.5;
  const t = S.site; if (t.kind !== 'terrace') return []; return (t.blocks || []).filter(b => b.type === 'mumty' || b.type === 'room' || b.type === 'lift' || b.type === 'troom').map(M => {
    let door = M.door; if (!door) { const dx = t.pw / 2 - (M.x + M.w / 2), dz = t.pd / 2 - (M.z + M.d / 2); door = Math.abs(dx) / t.pw > Math.abs(dz) / t.pd ? (dx > 0 ? 'right' : 'left') : (dz > 0 ? 'front' : 'back'); }
    return door === 'right' ? { x: M.x + M.w, z: M.z + M.d / 2 - 2.5, w: q, d: 5 } : door === 'left' ? { x: M.x - q, z: M.z + M.d / 2 - 2.5, w: q, d: 5 } : door === 'front' ? { x: M.x + M.w / 2 - 2.5, z: M.z + M.d, w: 5, d: q } : { x: M.x + M.w / 2 - 2.5, z: M.z - q, w: 5, d: q }; }); }
const DZOK = new Set(['pergola', 'umbrella']);
function clashes(it, i) {   // what it would sit on
  if (att(it)) return '';
  const r = rectI(it), fl = CAT[it.cat] && CAT[it.cat].kind === 'floor';
  if (!inside(r)) return 'edge';
  const wk = CAT[it.cat] && CAT[it.cat].kind === 'wall';   // 268 (owner): a wall panel may stand on the door's wall beside the door — only the door opening itself stays clear
  if (!fl && !it.old && !DZOK.has(it.cat) && doorZones(it.hand || S._hand ? 3 : 0).some(z => hit(r, wk ? (z.w === 5 ? { x: z.x + 0.8, z: z.z, w: 3.4, d: z.d } : { x: z.x, z: z.z + 0.8, w: z.w, d: 3.4 }) : z))) return 'door';
  if ((S.site.kind === 'terrace' ? S.site.blocks : []).some(b => hit(r, b) && !(b.type === 'shaft' && OVSH.has(it.cat)))) return 'block';   // 258 (owner): a deck, pergola or cabin can go over a shaft
  const under = (a, b) => (UMB.has(a.cat) && !UMB.has(b.cat) && b.cat !== 'cabin') || (UMB.has(b.cat) && !UMB.has(a.cat) && a.cat !== 'cabin');   // 203: seating, a bar, planters… can stand under a pergola
  const elR = (S.su && S.su.on && SUQ[S.su.q] === 'eplan') || S._igDec;   // 302: S._igDec = a big piece being dropped — furniture / plants make way after   // 266: round 2 — the hidden decor makes way later (decorFit)
  if (S.items.some((o, j) => j !== i && !att(o) && !(elR && isDecor(o)) && CAT[o.cat] && CAT[o.cat].kind !== 'floor' && (!fl || o.cat === 'cabin') && !under(it, o) && hit(r, rectI(o)))) return 'item';
  if (S.items.some((o, j) => j !== i && !att(o) && (fl ? FLX.has(it.cat) && FLX.has(o.cat) && it.cat !== o.cat : false) && hit(r, rectI(o)))) return 'item';   // 224: nothing stands on the pathway; pathway / grass / deck don't overlap   // decking goes under things, never under a cabin
  return '';
}
const BLKN = { mumty: 'stairs room', room: 'room', lift: 'lift', shaft: 'shaft', troom: 'temp room', tank: 'water tank', ac: 'AC units' };
function whyNot(it, i) {   // owner: say why a thing can't go where it was dropped
  const nm = (CAT[it.cat] && CAT[it.cat].t || 'It').replace(/^./, c => c.toUpperCase()), r = rectI(it), t = S.site, why = clashes(it, i);
  if (why === 'edge') return nm + ' doesn\'t fit inside the parapet there.';
  if (why === 'door') { const bs = (t.blocks || []).filter(b => ['mumty', 'room', 'lift', 'troom'].includes(b.type)), zs = doorZones(it.hand || S._hand ? 3 : 0), k = zs.findIndex(z => hit(r, z)), b = bs[k];
    const blk = (t.blocks || []).find(b2 => hit(r, b2)), deep = blk ? ' — and it is ' + fiTxt(Math.max(r.z + r.d - blk.z, 0.01)) + ' too long for the space there' : '';
    return nm + ' would block the ' + (b ? BLKN[b.type] || 'room' : 'room') + '\'s door (keep 3 ft in front of a door free)' + deep + '. Make it smaller with Size, turn it, or put it elsewhere.'; }
  if (why === 'block') { const b = (t.blocks || []).find(b2 => hit(r, b2) && !(b2.type === 'shaft' && OVSH.has(it.cat)));
    if (b) { const ox = Math.min(r.x + r.w, b.x + b.w) - Math.max(r.x, b.x), oz = Math.min(r.z + r.d, b.z + b.d) - Math.max(r.z, b.z); return nm + ' runs ' + fiTxt(Math.min(ox, oz)) + ' into the ' + (BLKN[b.type] || 'block') + '. Make it smaller with Size, or turn it.'; } }
  if (why === 'item') { const o = S.items.find((o2, j) => j !== i && !att(o2) && hit(r, rectI(o2))); if (o) return nm + ' would stand on the ' + ((o.label || (CAT[o.cat] && CAT[o.cat].t) || 'thing').toLowerCase()) + ' there.'; }
  return nm + ' can\'t go there.'; }
function placeFree(it, i, from, maxR) {   // nearest free spot to where it was dropped (spiral), keeping its turn; maxR = how far it may go
  if (!clashes(it, i)) return true; const x0 = from ? from[0] : it.x, z0 = from ? from[1] : it.z, t = S.site;
  for (let r = 0.5; r <= (maxR || Math.max(t.pw, t.pd)); r += 0.5) for (let a = 0; a < 24; a++) { it.x = r2(x0 + r * Math.cos(a * Math.PI / 12)); it.z = r2(z0 + r * Math.sin(a * Math.PI / 12)); if (!clashes(it, i)) return true; }
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
  const obs = (t.kind === 'terrace' ? t.blocks.filter(b => kinds.blocks.includes(b.type)) : []).concat(S.items.filter((o, j) => j !== skip && !att(o) && kinds.items(o)).map(o => o.cat === 'cabin' ? cabBodyR(o) : rectI(o)));   // 302 (owner): a screen runs right up to the cabin's wall (not its plinth / projection)
  if (t.kind !== 'terrace' && side === 'front') obs.push({ x: t.pw * 0.38 + 0.3, z: t.pd - 1, w: t.pw * 0.24 - 0.6, d: 1 });   // the lawn's gateway
  obs.filter(near).forEach(r => { const a = (ax === 'x' ? r.x : r.z), b = (ax === 'x' ? r.x + r.w : r.z + r.d); /* 285 (owner): flush against the wall / element */ runs = runs.flatMap(([u0, u1]) => [[u0, Math.min(u1, a)], [Math.max(u0, b), u1]]).filter(([u0, u1]) => u1 - u0 >= 1); });
  return runs;
}
const SCREEN_STOP = { blocks: ['mumty', 'lift', 'room'], items: o => o.cat === 'cabin' || o.cat === 'feature' || o.cat === 'water' || o.cat === 'graffiti' || o.cat === 'vgarden' || (o.cat === 'privacy' && o.mode !== 'par' && o.w >= 4) };
const WALL_STOP = { blocks: ['mumty', 'lift', 'room', 'shaft'], items: o => !(CAT[o.cat] && CAT[o.cat].kind === 'floor') };
function parTop() { const t = S.site; return t.kind === 'terrace' ? +t.par || 3 : 3; }
function parLine(side, u) { const t = S.site, q = t.kind === 'terrace' ? PAR / 2 : -0.25; return side === 'back' ? [u, q] : side === 'front' ? [u, t.pd - q] : side === 'left' ? [q, u] : [t.pw - q, u]; }
function mumtyTanks() { const t = S.site; if (t.kind !== 'terrace' || t.tanks === false) return null; const b = t.blocks.find(x => x.type === 'mumty'); if (!b) return null;
  const n = Math.max(b.w, b.d) >= 12 ? 2 : 1, along = b.d >= b.w, hx = (along ? 1.9 : (n > 1 ? 4.9 : 1.9)) + 0.75, hz = (along ? (n > 1 ? 4.9 : 1.9) : 1.9) + 0.75, cx = b.x + b.w / 2, cz = b.z + b.d / 2;
  const x0 = Math.max(b.x - 0.25, cx - hx), x1 = Math.min(b.x + b.w + 0.25, cx + hx), z0 = Math.max(b.z - 0.25, cz - hz), z1 = Math.min(b.z + b.d + 0.25, cz + hz);
  return { y: (+b.h > 0 ? +b.h : 9) + 0.35, pts: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] }; }
// 261 (owner): parapet screens one stretch at a time (each wall run its own item) so one can be picked, sized or removed alone
const SNAME = { left: 'left', right: 'right', back: 'back', front: 'front' };
function splitPar() { for (let i = 0; i < S.items.length; i++) { const it = S.items[i]; if (it.cat !== 'privacy' || it.mode !== 'par' || it.zone) continue; const out = [];
    (it.sides || []).forEach(sd => parRuns(sd, i, SCREEN_STOP).filter(([u0, u1]) => u1 - u0 > 1.5).forEach(([u0, u1]) => out.push(Object.assign(JSON.parse(JSON.stringify(it)), { sides: [sd], zone: [r2(u0), r2(u1)], label: (it.pick || it.cfgId ? it.label : 'Screen') + ' · ' + SNAME[sd] + ' parapet' }))));
    if (!out.length) continue; S.items.splice(i, 1, ...out); out.forEach((o, k) => attach(o, i + k)); const bad = out.filter(o => !(+o.w >= 1.5) && !(o.segs || []).length); if (bad.length) S.items = S.items.filter(o => !bad.includes(o)); i += out.length - bad.length - 1; } }   // 268: no 0-ft stretches
const isStop = o => !!o && (SCREEN_STOP.items(o) || o.cat === 'pergola' && false);
function scrAfter(list) { if ((list || []).some(isStop)) try { parResplit(); } catch (e) {} }   // 268 (owner): a cabin / wall taken away → the screen comes back there; put there → the screen makes way
function parResplit() {   // 266 (owner): after the setup, the parapet screens run along every free stretch as things finally stand (beside a pergola too)
  const ps = S.items.filter(o => o.cat === 'privacy' && o.mode === 'par' && !o.old && !o.pick && !o.cfgId); if (!ps.length) return; const sides = [...new Set([].concat(...ps.map(o => o.sides || [])))], h = ps[0].h || 3;
  S.items = S.items.filter(o => !ps.includes(o)); const it = { cat: 'privacy', mode: 'par', label: 'Screen on the parapet', sides, h, w: 0, d: 0.3, x: 0, z: 0, rot: 0 }; S.items.push(it); splitPar(); }
function zoneLen(sd) { const t = S.site; return SIDE_AX[sd] === 'x' ? +t.pw : +t.pd; }
function attach(it, i) {   // lay a parapet / tank screen out again (things around it may have moved)
  if (it.mode === 'par') { const segs = [], zn = it.zone; (it.sides || []).forEach(sd => parRuns(sd, i, SCREEN_STOP).map(([u0, u1]) => zn ? [Math.max(u0, zn[0]), Math.min(u1, zn[1])] : [u0, u1]).filter(([u0, u1]) => u1 - u0 > 0.5).forEach(([u0, u1]) => {   /* 261: a zone = one stretch of one wall */ const F = parRuns(sd, i, { blocks: [], items: () => false }), ex = Math.max(0, P0() - (S.site.kind === 'terrace' ? PAR / 2 : 0)); { const f0 = F.find(f => Math.abs(f[0] - u0) < 0.6), f1 = F.find(f => Math.abs(f[1] - u1) < 0.6); if (f0) u0 = f0[0] - ex; if (f1) u1 = f1[1] + ex; }   /* 285 (owner): at a corner the screen runs to the corner point, so two screens meet */ const a = parLine(sd, u0), b = parLine(sd, u1); segs.push({ x0: a[0], z0: a[1], x1: b[0], z1: b[1], y: parTop(), side: sd }); })); it.segs = segs; }
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
  const away = (x, z, di) => di ? x < P + 1.5 || x > t.pw - P - 1.5 : z < P + 1.5 || z > t.pd - P - 1.5, H2 = {}, V2 = {}; let par = false;   // 271: only the way this side faces — a side running up to the back parapet keeps its screen to the end
  for (let j = J0; j < J1; j++) for (let i = I0; i < I1; i++) { if (!inU(i, j)) continue;
    [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([di, dj]) => { if (inU(i + di, j + dj)) return; const ox = (i + di + 0.5) * q, oz = (j + dj + 0.5) * q;
      if (away(ox, oz, di)) { par = true; return; } if (inB(ox, oz, tall)) return;
      if (dj) { const z = (dj < 0 ? j : j + 1) * q; (H2[z] = H2[z] || []).push([i * q, (i + 1) * q, dj]); } else { const x = (di < 0 ? i : i + 1) * q; (V2[x] = V2[x] || []).push([j * q, (j + 1) * q, di]); } }); }
  const run = (M, hor) => { const out = []; Object.keys(M).forEach(k => { const L = M[k].sort((a, b) => a[0] - b[0]); let cur = null; L.forEach(e => { if (cur && Math.abs(cur[1] - e[0]) < 0.01 && cur[2] === e[2]) cur[1] = e[1]; else { if (cur) out.push([+k, cur]); cur = e.slice(); } }); if (cur) out.push([+k, cur]); });
    return out.filter(([, e]) => e[1] - e[0] >= 1).map(([c, e]) => hor ? { x0: e[0], z0: c, x1: e[1], z1: c, out: [0, e[2]] } : { x0: c, z0: e[0], x1: c, z1: e[1], out: [e[2], 0] }); };
  let segs = run(H2, true).concat(run(V2, false));
  if (!par) { const dx = t.pw / 2 - (m.x + m.w / 2), dz = t.pd / 2 - (m.z + m.d / 2), bo = Math.abs(dx) / t.pw > Math.abs(dz) / t.pd ? [dx > 0 ? -1 : 1, 0] : [0, dz > 0 ? -1 : 1]; segs = segs.filter(sg => !(sg.out[0] === bo[0] && sg.out[1] === bo[1])); }   // no parapet behind it: skip the side away from the terrace
  let e = null; try { e = mumtyProj(t, m); } catch (er) {} const E = e || { l: 0, r: 0, b: 0, f: 0 }, on = (a, b) => Math.abs(a - b) < 0.3, mx0 = m.x, mx1 = m.x + m.w, mz0 = m.z, mz1 = m.z + m.d;   // 266 (owner): on the chajja's edge, not set back on the wall
  return segs.map(sg => { let { x0, z0, x1, z1 } = sg; const hor = on(z0, z1);
    if (hor && (on(z0, mz0) || on(z0, mz1))) { const o = on(z0, mz0) ? -E.b : E.f; z0 = (on(z0, mz0) ? mz0 : mz1) + o; z1 = z0; if (on(x0, mx0)) x0 = mx0 - E.l; if (on(x1, mx1)) x1 = mx1 + E.r; }
    else if (!hor && (on(x0, mx0) || on(x0, mx1))) { const o = on(x0, mx0) ? -E.l : E.r; x0 = (on(x0, mx0) ? mx0 : mx1) + o; x1 = x0; if (on(z0, mz0)) z0 = mz0 - E.b; if (on(z1, mz1)) z1 = mz1 + E.f; }
    const cx = v => Math.max(P, Math.min(t.pw - P, v)), cz = v => Math.max(P, Math.min(t.pd - P, v));   // 271: never into the parapet
    return { x0: cx(x0), z0: cz(z0), x1: cx(x1), z1: cz(z1), y: hm + 0.35 }; }).flatMap(sg => { let G = null; try { G = t.mstair && t.mstair.state !== 'gone' ? mstGap(t, m) : null; } catch (er) {} if (!G) return [sg];   // the stairs up come through it
    const xs = G.sd === 'left' || G.sd === 'right', hor = on(sg.z0, sg.z1), side = xs ? !hor && on(sg.x0, G.sd === 'left' ? mx0 - E.l : mx1 + E.r) : hor && on(sg.z0, G.sd === 'back' ? mz0 - E.b : mz1 + E.f); if (!side) return [sg];
    const o0 = xs ? m.z : m.x, g0 = o0 + G.g0, g1 = o0 + G.g1, a0 = xs ? sg.z0 : sg.x0, a1 = xs ? sg.z1 : sg.x1;
    return [[a0, Math.min(a1, g0)], [Math.max(a0, g1), a1]].filter(([a, b]) => b - a >= 1).map(([a, b]) => xs ? Object.assign({}, sg, { z0: a, z1: b }) : Object.assign({}, sg, { x0: a, x1: b })); }); }
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
// 218b: Landscape Plants — species (SKU LP-<PLANT>-<ft>) and their sizes, from the store catalogue
function plantList() { const P = PR(), G = {}; for (const id in P) { const p = P[id]; if (!p || !/^LP-/.test(id) || p.cz) continue;   /* 222: nursery plants live in Plants now, found by their LP- SKU */ const k = String(id).split('-')[1]; if (k) (G[k] = G[k] || []).push(id); }
  Object.values(G).forEach(a => a.sort((x, y) => plantH(x) - plantH(y))); return G; }
function plantH(id) { const p = PR()[id] || {}, m = String(p.vs || p.n || '').match(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)\s*ft|(\d+(?:\.\d+)?)\s*ft/); return m ? (m[2] ? (+m[1] + +m[2]) / 2 : +m[3]) : 4; }
const plantName = id => String((PR()[id] || {}).n || '').replace(/ — .*$/, '');
const plantP0 = id => { const p = PR()[id]; return p ? (window.baseP ? window.baseP(id) : p.p) : null; };
const NOCAT = new Set(['OLIVE']), NOCAT_N = { OLIVE: 'Olive tree' };   // 294: plants we draw but don't sell yet
function plantSet(it, key, id) {   // species + size (nearest to it.h when no size given); footprint = the plant's spread
  const ids = plantList()[key] || []; if (!id || !ids.includes(id)) id = ids.slice().sort((a, b) => Math.abs(plantH(a) - (it.h || 4)) - Math.abs(plantH(b) - (it.h || 4)))[0] || null;
  it.plant = key; it.pick = id; if (id) it.h = plantH(id); const sp = Math.max(1.5, Math.min(8, plantSpread(key, it.h))); it.w = sp; it.d = sp; it.label = id ? plantName(id) : NOCAT_N[key] || 'Plant'; }
function plantChoices(it) { const G = plantList(); return Object.keys(G).map(k => { const ids = G[k], id = ids.slice().sort((a, b) => Math.abs(plantH(a) - (it.h || 4)) - Math.abs(plantH(b) - (it.h || 4)))[0], soon = (PR()[id] || {}).oo === false;
  return { id: k === it.plant && it.pick ? it.pick : id, q: { price: soon ? 0 : plantP0(k === it.plant && it.pick ? it.pick : id), o: null, soon } }; }).sort((a, b) => (a.id === it.pick ? -1 : b.id === it.pick ? 1 : 0)); }
const LIGHT_T = { S: '☀ Full sun', SS: '◐ Semi-shade', B: '☀ ◐ Sun or semi-shade' };
function plantPicker(it) { const G = plantList(), keys = Object.keys(G); if (!keys.length) return '<p class="pl-sub">The plants are loading…</p>';
  let h = `<p class="pl-sub" style="margin:0 0 6px">${esc(LIGHT_T[PLANT_LIGHT[it.plant]] || '')} · comes in a nursery grow bag · delivered in Delhi NCR</p>`;
  h += '<p class="pl-h" style="margin-top:4px">Size</p><div class="pl-tabs">' + (G[it.plant] || []).map(id => btn(`data-pl="plsz:${id}"`, id === it.pick, esc(String((PR()[id] || {}).vs || plantH(id) + ' ft').split(' · ')[0]))).join('') + '</div>';
  h += '<p class="pl-h">Plant</p><div class="pl-row2">' + keys.sort((a, b) => plantName(G[a][0]).localeCompare(plantName(G[b][0]))).map(k => { const id = G[k][Math.floor((G[k].length - 1) / 2)], im = IMG(id);
    return `<button type="button" class="pl-ds${k === it.plant ? ' on' : ''}" data-pl="plk:${k}" aria-pressed="${k === it.plant}">${im ? `<img src="${esc(im)}" alt="" loading="lazy">` : '<i></i>'}<b>${esc(plantName(id))}</b><small>${esc(LIGHT_T[PLANT_LIGHT[k]] || '')}</small></button>`; }).join('') + '</div>';
  return h; }
function oFor(m, it) {   // the item's size in the words of that design's price list (clamped to what it allows)
  const u = m.unit, cl = (v) => num(v) || 1;   /* 238 (owner): no size limits — the plan's own size, a smaller one is billed as the design's minimum */
  const o = { pin: '', zone: null };
  if (u === 'fixed') o.size = ((m.sizes || [])[0] || {}).label;
  else if (u === 'seat') o.n = Math.max(1, num(m.min_size) || num(m.n && m.n.min) || 1);
  else {
    const c = CAT[it.cat], len0 = it.pw != null ? it.pw : it.w, dep = c.kind === 'wall' || c.kind === 'edge' ? it.h : it.d;
    const n = 1, len = Math.round(len0 * 2) / 2;   /* 238: one piece at any length (was split by the old maximum) */   // 193c: longer than one piece → equal pieces
    o._n = n;
    if (u === 'area') { o.l = cl(len, m.l); o.w = cl(dep, m.w); }
    else if (u === 'length') o.l = cl(len, m.l);
    else if (u === 'face') { o.w = cl(len, m.w); }
    const hs = (m.h && m.h.options) || []; if (u === 'face') o.h = cl(it.h || num(hs[0]));   /* 238: the plan's own height */
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
const thTag = () => { const k = S && S.su && S.su.thm, n = k && (THEMES6.find(z => z[0] === k) || [])[1]; return n ? ('theme: ' + n).toLowerCase() : ''; };
function choices(it) {   // the designs the customer can pick for this item, cheapest first
  const c = CAT[it.cat]; if (!c) return []; const P = PR(); if (c.rts) return plantChoices(it);
  const th = thTag(), fit = id => th && (P[id].tg || []).some(t => String(t).toLowerCase() === th) ? 0 : 1;   // 275: designs of the picked theme first (Theme tag, 225), then cheapest
  return designs(c).filter(id => P[id].oo !== false && (c.k !== 'cabin' || (P[id].cz || {}).cabin)).map(id => ({ id, q: priceAt(id, it), th: !fit(id) })).filter(x => x.q).sort((a, b) => fit(a.id) - fit(b.id) || a.q.price - b.q.price);
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
function picked(it) { if (it.cat === 'plant') { const ch = plantChoices(it); return ch.find(x => x.id === it.pick) || null; } const ch = choices(it); return ch.find(x => x.id === it.pick) || (it.cat === 'cabin' && ch.find(x => x.id === it.sku)) || ch[0] || null; }
const IMG = id => { try { const x = PR()[id]; return (typeof IMGS !== 'undefined' ? IMGS : window.IMGS || {})[x.img] || ''; } catch (e) { return ''; } };
function fromPrice(it) {   // cheapest orderable design of the category at this size: { price, n, soon }
  const c = CAT[it.cat]; if (!c || it.old || it.pipe) return null;
  if (c.rts) { const G = plantList(), ids = it.pick ? [it.pick] : [].concat(...Object.values(G)), open = ids.filter(id => (PR()[id] || {}).oo !== false); return { price: open.length ? Math.min(...open.map(plantP0)) : null, n: Object.keys(G).length, soon: !open.length && ids.length > 0, plants: 1 }; }
  const k = [it.cat, it.w, it.d, it.h, it.pw || '', it.sku || '', it.cfgId || '', JSON.stringify(it.cfg || '')].join('|'); if (PC[k]) return PC[k];
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
  if (k === 'plant') { const G = plantList(), key = G.ARECA ? 'ARECA' : Object.keys(G)[0]; if (!key) return null; plantSet(it, key); }
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
  const r = window.mtoCabinSize(it.sku, (it.lsku === it.sku && it.layBase) || cabinLay(it), L, W, true); if (!r || !r.lay) return;
  it.layout = r.lay; it.lsku = it.sku; it.layBase = JSON.parse(JSON.stringify(r.lay)); cabinFoot(it); const f1 = foot(it); it.x = r2(cx - f1[0] / 2); it.z = r2(cz - f1[1] / 2);
  if (i < 0) return;   // 268: not on the plan yet (being set up) — just the size; placing comes after
  if (!settle(it, i, [it.x, it.z])) { const k0 = JSON.parse(keep); Object.keys(it).forEach(k => { if (!(k in k0)) delete it[k]; }); Object.assign(it, k0); S.msg = 'No room for it that size here'; }   // a full undo (layBase too)
}
// 259 (owner): the part of a cabin side that stands against a wall (parapet, stairs room / room / lift, another cabin) is solid — no glass, no door — even an all-glass cabin; it.ldoors = its own sides that get a door
const rotV = (v, r) => { const a = (r || 0) * Math.PI / 180, c = Math.round(Math.cos(a)), s = Math.round(Math.sin(a)); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c]; };
const LSN = { front: [0, 1], back: [0, -1], left: [-1, 0], right: [1, 0] };
function cabWorld(sd, rot) { const n = rotV(LSN[sd], rot); return n[1] > 0 ? 'front' : n[1] < 0 ? 'back' : n[0] < 0 ? 'left' : 'right'; }
function cabLocal(ws, rot) { return Object.keys(LSN).find(sd => cabWorld(sd, rot) === ws); }
function cabBodyR(o) { const r = Object.assign({}, rectI(o)), e = o.ex || {}, rot = o.rot || 0; ['l', 'r', 'b', 'f'].forEach(k => { const v = Math.max(0, +e[k] || 0), ws = cabWorld({ l: 'left', r: 'right', b: 'back', f: 'front' }[k], rot); if (ws === 'left') { r.x += v; r.w -= v; } else if (ws === 'right') r.w -= v; else if (ws === 'back') { r.z += v; r.d -= v; } else r.d -= v; }); return r; }   // 302: the cabin's walls without plinth / projections
function flushWalls(R, it) {   // 304: the faces round a thing — the parapet, and a stairs room / room / lift face next to it (overlapping it along that side)
  const t = S.site, p = P0(), W = { left: p, right: t.pw - p, back: p, front: t.pd - p }, cx = R.x + R.w / 2, cz = R.z + R.d / 2;
  (t.kind === 'terrace' ? t.blocks || [] : []).forEach(b => { if (b.type === 'ac' || b.type === 'tank' || (b.type === 'shaft' && OVSH.has(it.cat))) return;
    const oz = Math.min(R.z + R.d, b.z + b.d) - Math.max(R.z, b.z), ox = Math.min(R.x + R.w, b.x + b.w) - Math.max(R.x, b.x);
    if (oz > 0.5 && ox < Math.min(R.w, b.w) - 0.5) { if (b.x + b.w / 2 < cx) W.left = Math.max(W.left, b.x + b.w); else W.right = Math.min(W.right, b.x); }
    if (ox > 0.5 && oz < Math.min(R.d, b.d) - 0.5) { if (b.z + b.d / 2 < cz) W.back = Math.max(W.back, b.z + b.d); else W.front = Math.min(W.front, b.z); } });
  return W; }
function cabFlush(it, i) { const R3 = v => Math.round(v * 1000) / 1000;   // 302 / 304 (owner): dropped near the parapet or a stairs room / room / lift → its body sits flush against it, exactly there (the projection on that side goes, cabWalls)
  const e = it.ex || {}, rot = it.rot || 0, R = rectI(it), wE = {}, Wf = flushWalls(R, it); ['l', 'r', 'b', 'f'].forEach(k => { const ws = cabWorld({ l: 'left', r: 'right', b: 'back', f: 'front' }[k], rot); wE[ws] = Math.max(0, (e[k] || 0.3) - 0.3); });
  const near = (d, ex) => d < Math.max(1.6, ex + 0.6) && d > -(ex + 2);
  const D = { left: near(R.x - Wf.left, wE.left), right: near(Wf.right - (R.x + R.w), wE.right), back: near(R.z - Wf.back, wE.back), front: near(Wf.front - (R.z + R.d), wE.front) };   /* both sides of an axis may be walls: it sits between them */
  if (!D.left && !D.right && !D.back && !D.front) return; const ox = it.x, oz = it.z, ex0 = it.ex, w0 = it.w, d0 = it.d;
  const e2 = Object.assign({}, e); ['l', 'r', 'b', 'f'].forEach(k => { const ws = cabWorld({ l: 'left', r: 'right', b: 'back', f: 'front' }[k], rot); if (D[ws]) e2[k] = 0.3; });   /* the projections on the wall sides come off (cabWalls drops them for good after) */
  const L = cabinLay(it), cx0 = R.x + R.w / 2, cz0 = R.z + R.d / 2; it.ex = e2; it.w = (+L.L || 12) + e2.l + e2.r; it.d = (+L.W || 10) + e2.b + e2.f;
  const f = foot(it); it.x = R3(cx0 - f[0] / 2); it.z = R3(cz0 - f[1] / 2); const R2 = rectI(it);   /* keep its middle, then lean on the walls */
  let nx = R2.x, nz = R2.z; if (D.left) nx = Wf.left; else if (D.right) nx = Wf.right - R2.w; if (D.back) nz = Wf.back; else if (D.front) nz = Wf.front - R2.d;
  it.x = R3(it.x + nx - R2.x); it.z = R3(it.z + nz - R2.z);
  const c = clashes(it, i); if (c && c !== 'door') { it.x = ox; it.z = oz; it.ex = ex0; it.w = w0; it.d = d0; } }
function pushFlush(it, i) {   // 304 (owner): a thing dropped a little into the parapet / a block sits flush against it, right there (≤ 1.5 ft)
  const t = S.site, p = P0();
  for (let n = 0; n < 3; n++) { const r = rectI(it); const bs = (t.kind === 'terrace' ? t.blocks || [] : []).filter(b => b.type !== 'ac' && hit(r, b) && !(b.type === 'shaft' && OVSH.has(it.cat))); if (!bs.length) break;
    const b = bs[0], m = [[b.x - (r.x + r.w), 0], [b.x + b.w - r.x, 0], [0, b.z - (r.z + r.d)], [0, b.z + b.d - r.z]].filter(v => Math.abs(v[0] + v[1]) <= 1.5).sort((u, v) => Math.abs(u[0] + u[1]) - Math.abs(v[0] + v[1]));
    const ok = m.find(v => { const x0 = it.x, z0 = it.z; it.x = r2(it.x + v[0]); it.z = r2(it.z + v[1]); const r3 = rectI(it); if (inside(r3) && !bs.some(b2 => hit(r3, b2) && b2 !== b) ? true : false) return true; it.x = x0; it.z = z0; return false; }); if (!ok) break; } }
const DSIDES = ['right', 'left', 'front', 'back'], BLKD = { mumty: 'stairs room', room: 'room', lift: 'lift', troom: 'temp room' };
function doorMove(it, i) {   // 304 (owner): a big thing put in front of a room / lift / stairs door → that door moves to a free side of the room by itself
  const t = S.site; if (t.kind !== 'terrace') return ''; const r = rectI(it), bl = (t.blocks || []).filter(b => BLKD[b.type]), zs = doorZones(3), hitB = bl.filter((b, k) => zs[k] && hit(r, zs[k])); if (!hitB.length) return '';
  const old = hitB.map(b => b.door), moved = [];
  for (const b of hitB) { const cur = zs[bl.indexOf(b)], cs = DSIDES.filter(sd => sd !== b.door).sort((u, v) => { const zz = sd => { b.door = sd; const q = doorZones(3)[bl.indexOf(b)]; return Math.hypot(q.x + q.w / 2 - (r.x + r.w / 2), q.z + q.d / 2 - (r.z + r.d / 2)); }; return zz(v) - zz(u); });
    const free = sd => { b.door = sd; const z = doorZones(3)[bl.indexOf(b)]; if (!inside(z)) return false; if (bl.concat((t.blocks || []).filter(x => !BLKD[x.type] && x.type !== 'ac')).some(o => o !== b && hit(z, o))) return false;
      return !S.items.some((o, j) => !att(o) && !(CAT[o.cat] && CAT[o.cat].kind === 'floor') && !DZOK.has(o.cat) && !isDecor(o) && hit(z, j === i ? r : rectI(o))); };
    const sd = cs.find(free); if (!sd) { hitB.forEach((b2, k) => { b2.door = old[k]; }); void cur; return ''; } moved.push((BLKD[b.type] || 'room') + ' door → ' + sd + ' side'); }
  return moved.join(', '); }
function cabFixAll() { for (let k = 0; k < 2; k++) S.items.forEach(o => { if (o.cat === 'cabin' && o.layBase) try { cabWalls(o); } catch (e) {} }); deckLevels(); try { stoolsFix(); } catch (e) {} const nw = S.items.find(o => o.cat === 'cabin' && (o.cabTouch || []).length && !o.joinAsked); if (nw && S.su && S.su.on) { nw.joinAsked = true; S.msg = 'Two cabins are joined — pick one and tap “Door between?” to add a swing door between them.'; } }   // 268: two passes (both drop their projection where they meet)
function deckLevels() {   // 259 (owner): a deck joined to a cabin is at the cabin's floor level (0.6 ft up), not on the terrace floor
  const cs = S.items.filter(o => o.cat === 'cabin').map(rectI); S.items.forEach(o => { if (o.cat !== 'deck') return; const r = rectI(o);
    const j = cs.some(c => { const ox = Math.min(r.x + r.w, c.x + c.w) - Math.max(r.x, c.x), oz = Math.min(r.z + r.d, c.z + c.d) - Math.max(r.z, c.z); return (ox > 1 && oz > -0.6 && oz < 0.4) || (oz > 1 && ox > -0.6 && ox < 0.4); });
    const pd = S.items.some(p => p.cat === 'pergola' && p.deck && sameR(rectI(p), r));   // under a pergola with a raised deck too
    if (j || pd) o.lvl = 0.6; else delete o.lvl; }); }
function cabWalls(it) {
  if (!it || it.cat !== 'cabin' || it.old || !window.mtoCabinFix) return; const t = S.site, P = P0(), R = rectI(it), L0 = cabinLay(it);
  if (!it.layBase || it.lsku !== it.sku) { it.layBase = JSON.parse(JSON.stringify(L0)); it.exB = null; } const base = it.layBase, L = +base.L || 12, W = +base.W || 10, e = it.ex || { l: 0.3, r: 0.3, b: 0.3, f: 0.3 }, rot = it.rot || 0;
  if (!it.exB) it.exB = Object.assign({}, e); const eT = k => Math.max(e[k] || 0.3, it.exB[k] || 0.3);   // 267: the full projection's reach, so a dropped projection isn't put back on the next pass
  const Cw = [R.x + R.w / 2, R.z + R.d / 2], Lc = [(L + e.r - e.l) / 2, (W + e.f - e.b) / 2], loc = p => { const v = rotV([p[0] - Cw[0], p[1] - Cw[1]], -rot); return [Lc[0] + v[0], Lc[1] + v[1]]; };
  const obs = (t.blocks || []).filter(b => b.type !== 'shaft' && b.type !== 'ac' && (+b.h || 8) >= 4).map(b => ({ x: b.x, z: b.z, w: b.w, d: b.d })).concat(S.items.filter(o => o !== it && o.cat === 'cabin').map(rectI));
  const solid = {}, parOn = {};
  Object.keys(LSN).forEach(sd => { const ws = cabWorld(sd, rot), tol = eT({ front: 'f', back: 'b', left: 'l', right: 'r' }[sd]) + 0.8, iv = [];
    const xs = ws === 'left' || ws === 'right', u0 = xs ? R.z : R.x, u1 = xs ? R.z + R.d : R.x + R.w, edge = ws === 'left' ? R.x : ws === 'right' ? R.x + R.w : ws === 'back' ? R.z : R.z + R.d;
    const par = ws === 'left' ? edge - P : ws === 'right' ? t.pw - P - edge : ws === 'back' ? edge - P : t.pd - P - edge; if (par <= tol) { if ((t.high || {})[ws]) iv.push([u0, u1]); else parOn[sd] = 1; }   // 269 (owner): a low parapet keeps the glass (windows / one long glass run) — only a tall wall makes the side solid
    obs.forEach(o => { const gap = ws === 'left' ? edge - (o.x + o.w) : ws === 'right' ? o.x - edge : ws === 'back' ? edge - (o.z + o.d) : o.z - edge; if (gap < -0.6 || gap > tol) return;
      const a = Math.max(u0, xs ? o.z : o.x), b = Math.min(u1, xs ? o.z + o.d : o.x + o.w); if (b - a > 0.3) iv.push([a, b]); });
    if (!iv.length) return;
    solid[sd] = iv.map(([a, b]) => { const pa = xs ? [edge, a] : [a, edge], pb = xs ? [edge, b] : [b, edge], la = loc(pa), lb = loc(pb), f = q => sd === 'front' || sd === 'back' ? q[0] : W - q[1], v = [f(la), f(lb)].sort((m, n) => m - n); return [Math.max(0, v[0] - 0.2), v[1] + 0.2]; }); });
  it.wallSides = Object.keys(solid).concat(Object.keys(parOn).filter(k => !solid[k]));
  // 262 (owner): no projection on a side against a wall (most of it) or where a pergola joins on — the pergola runs right up to the cabin instead
  const PG = S.items.filter(o => o.cat === 'pergola' && !o.old).map(o => [o, rectI(o)]), pgTouch = {}, sideLen = sd => sd === 'front' || sd === 'back' ? L : W;
  Object.keys(LSN).forEach(sd => { const ws = cabWorld(sd, rot), tol = eT({ front: 'f', back: 'b', left: 'l', right: 'r' }[sd]) + 0.8, xs = ws === 'left' || ws === 'right', u0 = xs ? R.z : R.x, u1 = xs ? R.z + R.d : R.x + R.w, edge = ws === 'left' ? R.x : ws === 'right' ? R.x + R.w : ws === 'back' ? R.z : R.z + R.d;
    PG.forEach(([o, q]) => { const gap = ws === 'left' ? edge - (q.x + q.w) : ws === 'right' ? q.x - edge : ws === 'back' ? edge - (q.z + q.d) : q.z - edge; const ov = Math.min(u1, xs ? q.z + q.d : q.x + q.w) - Math.max(u0, xs ? q.z : q.x); if (gap > -0.6 && gap <= (o.szBy ? 0.15 : tol) && ov > 2) (pgTouch[sd] = pgTouch[sd] || []).push([o, ws]); }); });   // 268: a pergola sized by hand isn't stretched back to the cabin
  const ps = (base.proj && Array.isArray(base.proj.sides)) ? base.proj.sides : [], drop = ps.filter(sd => pgTouch[sd] || parOn[sd] || (solid[sd] || []).reduce((a, r) => a + Math.max(0, Math.min(sideLen(sd), r[1]) - Math.max(0, r[0])), 0) >= sideLen(sd) * 0.5);
  const base2 = drop.length ? Object.assign(JSON.parse(JSON.stringify(base)), { proj: Object.assign({}, base.proj, { sides: ps.filter(sd => !drop.includes(sd)) }) }) : base;
  const parD = {}, touchC = []; Object.keys(LSN).forEach(sd => { const ws = cabWorld(sd, rot), edge = ws === 'left' ? R.x : ws === 'right' ? R.x + R.w : ws === 'back' ? R.z : R.z + R.d; parD[sd] = ws === 'left' ? edge - P : ws === 'right' ? t.pw - P - edge : ws === 'back' ? edge - P : t.pd - P - edge;   // 268: how far each side is from the parapet; which sides touch another cabin
    const xs = ws === 'left' || ws === 'right', u0 = xs ? R.z : R.x, u1 = xs ? R.z + R.d : R.x + R.w, tol = eT({ front: 'f', back: 'b', left: 'l', right: 'r' }[sd]) + 0.8;
    if (S.items.some(o => o !== it && o.cat === 'cabin' && (q => { const gap = ws === 'left' ? edge - (q.x + q.w) : ws === 'right' ? q.x - edge : ws === 'back' ? edge - (q.z + q.d) : q.z - edge, ov = Math.min(u1, xs ? q.z + q.d : q.x + q.w) - Math.max(u0, xs ? q.z : q.x); return gap > -0.6 && gap <= tol && ov > 3; })(rectI(o)))) touchC.push(sd); });
  it.cabTouch = touchC; const isH = /HYBRID/.test(it.sku || ''), solidLen = sd => (solid[sd] || []).reduce((a, r) => a + Math.max(0, Math.min(sideLen(sd), r[1]) - Math.max(0, r[0])), 0);
  const gSides = isH && it.gs ? ['front'].concat(['left', 'right', 'back'].sort((a, b) => (solidLen(a) - solidLen(b)) || (parD[b] - parD[a]))).slice(0, Math.max(1, Math.min(4, +it.gs))) : null;
  const winS = gSides ? Object.keys(LSN).filter(sd => !gSides.includes(sd) && parD[sd] < 8 && solidLen(sd) < sideLen(sd) * 0.5) : null;
  const lay = window.mtoCabinFix(it.sku, base2, { solid, doors: it.ldoors || [], glass: gSides, win: winS, join: (it.joinDoor || []).filter(sd => touchC.includes(sd)), wide: /GLASS/.test(it.sku || '') ? Object.keys(LSN).filter(sd => parD[sd] < 8 && solidLen(sd) < sideLen(sd) * 0.5) : null, nodoor: Object.keys(parOn).filter(sd => !t.rail), sill: (o => { Object.keys(parOn).forEach(sd => { if (!t.rail) o[sd] = Math.max(0, (+t.par || 3) - 0.6); }); return o; })({}) }); if (lay) { it.layout = lay; it.lsku = it.sku; }   // 302 (owner): a side on the low parapet rests on it (wall / glass from its top, no door)
  { const e0 = it.ex || e, bc = (o => [Cw[0] + o[0], Cw[1] + o[1]])(rotV([(e0.l - e0.r) / 2, (e0.b - e0.f) / 2], rot)); cabinFoot(it); const e1 = it.ex, o1 = rotV([(e1.l - e1.r) / 2, (e1.b - e1.f) / 2], rot), f1 = foot(it);
    it.x = Math.round((bc[0] - o1[0] - f1[0] / 2) * 1000) / 1000; it.z = Math.round((bc[1] - o1[1] - f1[1] / 2) * 1000) / 1000; }
  { const R1 = rectI(it); drop.filter(sd => !pgTouch[sd]).forEach(sd => { const ws = cabWorld(sd, rot), xs = ws === 'left' || ws === 'right', edge = ws === 'left' ? R1.x : ws === 'right' ? R1.x + R1.w : ws === 'back' ? R1.z : R1.z + R1.d, u0 = xs ? R1.z : R1.x, u1 = xs ? R1.z + R1.d : R1.x + R1.w;   // 268 (owner): a side whose projection was dropped against a wall moves up flush to it — no gap
    let g = ws === 'left' ? edge - P : ws === 'right' ? t.pw - P - edge : ws === 'back' ? edge - P : t.pd - P - edge; obs.forEach(o => { const ov = Math.min(u1, xs ? o.z + o.d : o.x + o.w) - Math.max(u0, xs ? o.z : o.x); if (ov <= 0.3) return; const gp = ws === 'left' ? edge - (o.x + o.w) : ws === 'right' ? o.x - edge : ws === 'back' ? edge - (o.z + o.d) : o.z - edge; if (gp > -0.05) g = Math.min(g, gp); });
    if (g > 0.02 && g < eT({ front: 'f', back: 'b', left: 'l', right: 'r' }[sd]) + 1) { const v = Math.round(g * 1000) / 1000; if (ws === 'left') it.x -= v; else if (ws === 'right') it.x += v; else if (ws === 'back') it.z -= v; else it.z += v; } }); }
  const R2 = rectI(it); Object.values(pgTouch).forEach(arr => arr.forEach(([o, ws]) => { const q = rectI(o), grp = S.items.filter(d => d !== o && d.cat === 'deck' && sameR(rectI(d), q)), nq = Object.assign({}, q);   // the pergola (and the deck under it) runs up to the cabin
    if (ws === 'left') nq.w = R2.x - q.x; else if (ws === 'right') { nq.x = R2.x + R2.w; nq.w = q.x + q.w - nq.x; } else if (ws === 'back') nq.d = R2.z - q.z; else { nq.z = R2.z + R2.d; nq.d = q.z + q.d - nq.z; }
    if (nq.w < 4 || nq.d < 4) return; const r3 = v => Math.round(v * 1000) / 1000; [o].concat(grp).forEach(d => { const tw = (+d.rot || 0) % 180 === 0; d.x = r3(nq.x); d.z = r3(nq.z); d.w = r3(tw ? nq.w : nq.d); d.d = r3(tw ? nq.d : nq.w); }); }));
}
function resizeItem(it, key, d, abs) {
  if (abs != null) { const cur = key === 'w' ? it.w : key === 'd' ? it.d : it.h; d = abs - cur; }
  const c = CAT[it.cat], lo = c.min || [1, 1], hi = c.max || [80, 80], keep = JSON.stringify(it), i = S.items.indexOf(it);
  if (key === 'w') it.w = Math.max(lo[0], Math.min(hi[0], rIn(it.w + d))); else if (key === 'd') it.d = Math.max(lo[1], Math.min(hi[1], rIn(it.d + d))); else if (key === 'h') { const hr = c.hr || [2, 12]; it.h = Math.max(hr[0], Math.min(hr[1], r2(it.h + d))); }
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
#plOv .pl-subig button i{font-style:normal;font-size:22px}#plOv .pl-col3{flex-direction:column}#plOv .pl-col3 button{flex-direction:row;justify-content:flex-start;gap:14px;text-align:left;padding:14px}#plOv .pl-col3 button b{font-size:16px}#plOv .pl-col3 button small{display:block}
#plOv .pl-cdir{display:grid;grid-template-columns:repeat(3,46px);gap:6px;margin:6px 0 4px}#plOv .pl-cdir button{height:40px;border-radius:10px;border:1.5px solid #E3DCD2;background:#fff;font:700 16px Inter,system-ui,sans-serif;color:#2E2E2E}#plOv .pl-cdir button.on{border-color:#C26445;background:#FBEDE7;color:#C26445}#plOv .pl-cdir button[aria-label=auto]{font-size:11px}#plOv .pl-cdh{display:block;color:#8A8278;font-size:11.5px;margin-bottom:4px}#plOv .pl-cab{background:#fff;border:1px solid #E7DDCF;border-radius:14px;padding:12px;margin:12px 0}#plOv .pl-cab>b{display:block;font-size:14px;margin:4px 0 8px}
#plOv .pl-looks{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:0 0 12px}#plOv .pl-looks button{border:1.5px solid #E2D6C4;background:#fff;border-radius:12px;padding:6px 2px 8px;font:600 11.5px inherit;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px}#plOv .pl-looks button.on{border-color:#C26445;background:#FFF8F2}#plOv .pl-lk{display:block;width:100%;height:28px;border-radius:8px}
#plOv .pl-lk-modern{background:linear-gradient(90deg,#2E2E2E 0 30%,#B9B8B4 30% 75%,#3A4A5A 75%)}#plOv .pl-lk-natural{background:linear-gradient(90deg,#A8784C 0 30%,#D8C9A8 30% 75%,#8A9A5B 75%)}#plOv .pl-lk-moroccan{background:radial-gradient(circle,#1F6F7E 0 4px,transparent 5px) 0 0/10px 10px,#F2E2C8}#plOv .pl-lk-tropical{background:linear-gradient(90deg,#F1EDE4 0 30%,#C98B63 30% 75%,#2E7D5B 75%)}
#plOv .pl-su{position:absolute;inset:0;z-index:20;background:#F7F3EC;overflow:auto;display:none}#plOv .pl-suh{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:10px;padding:10px 14px;background:#fff;border-bottom:1px solid #E2D6C4}#plOv .pl-suh b{flex:1;font-size:15px}#plOv .pl-sunm{flex:none;min-width:90px;border:1px solid #E2D6C4;background:#FFFBF5;border-radius:99px;padding:6px 12px;font:inherit;font-size:13px;font-weight:600;color:#2E2E2E;cursor:pointer;max-width:42vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#plOv .pl-suh button{border:1px solid #ddd;background:#fff;border-radius:50%;width:36px;height:36px;font-size:16px;cursor:pointer}
#plOv .pl-sub2{max-width:640px;margin:0 auto;padding:18px 16px 40px}#plOv .pl-sub2 h2{font-size:24px;margin:6px 0 14px}#plOv .pl-dots{display:flex;gap:5px;margin-bottom:8px}#plOv .pl-dots i{flex:1;height:4px;border-radius:4px;background:#E2D6C4}#plOv .pl-dots i.on{background:#C26445}
.pl-exit{position:fixed;inset:0;z-index:100000;background:rgba(30,26,22,.45);display:flex;align-items:center;justify-content:center;padding:20px;font-family:Inter,system-ui,sans-serif}.pl-exit>div{background:#fff;border-radius:16px;padding:20px;max-width:340px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.25)}.pl-exit b{font-size:16px;color:#2E2E2E}.pl-exit p{margin:8px 0 16px;font-size:14px;color:#6B635A}.pl-exit div div{display:flex;gap:8px;justify-content:flex-end}.pl-exit button{border:1.5px solid #E2D6C4;background:#fff;border-radius:999px;padding:9px 18px;font:600 14px Inter,sans-serif;cursor:pointer}.pl-exit .pl-go{background:#C26445;border-color:#C26445;color:#fff}#plOv .pl-sub2.wide{max-width:1120px}#plOv .pl-2c{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:16px;align-items:start}.pl-2qc{grid-template-columns:minmax(0,1fr) 320px;gap:28px}.pl-2q{max-width:640px;width:100%;justify-self:center}.pl-2t{grid-template-columns:minmax(0,1fr) 360px}.pl-2r{display:flex;flex-direction:column;gap:12px;min-width:0}.pl-opt{background:#fff;border:1px solid #E2D6C4;border-radius:14px;padding:12px}.pl-opt .pl-thm,.pl-opt .pl-fl{grid-template-columns:1fr 1fr}.pl-2r .pl-sel{position:static;max-height:none}.pl-2l .pl-ab3d{width:100%;left:0;transform:none;margin:0}.pl-2t .pl-ab3d.pl-thv{height:min(76vh,820px);margin-bottom:0;position:sticky;top:8px}.pl-selm{border:1px solid #EFE7DA;border-radius:10px;overflow:hidden;margin:0 0 8px;background:#FBF8F3}.pl-sucol{flex-direction:column;align-items:stretch}.pl-sucol>button{text-align:left}.pl-cmp{position:absolute;left:14px;bottom:14px;width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,.92);border:1px solid #D8CDBB;box-shadow:0 2px 8px rgba(0,0,0,.12);display:none;align-items:center;justify-content:center;z-index:4;pointer-events:none}#plOv .pl-sub2.pl-full{max-width:none;margin:0;padding:0}.pl-u{display:grid;grid-template-columns:minmax(0,1fr) 420px;height:calc(100dvh - 57px)}.pl-ul{min-width:0;overflow:auto;background:#EFE9DF;padding:14px;position:relative}.pl-ur{overflow:auto;background:#fff;border-left:1px solid #E2D6C4;padding:14px 14px 0;display:flex;flex-direction:column;gap:8px}.pl-ul .pl-ab3d,.pl-ul .pl-ab3d.pl-thv{width:100%;height:100%;left:0;transform:none;margin:0;position:relative;top:0}.pl-ul .pl-su2d{height:calc(100dvh - 210px)}.pl-ul .pp{margin:0 auto}.pl-ubig{height:100%;display:flex;align-items:center;justify-content:center}.pl-ubig svg{max-width:100%;max-height:calc(100dvh - 90px);width:auto;height:auto}.pl-ur h2{font-size:19px!important;margin:4px 0 8px!important}.pl-cta{border:2px solid #C26445;border-radius:14px;background:#FBEFE9;flex:none}.pl-ctab{display:flex;gap:10px;align-items:center;width:100%;border:0;background:none;padding:11px 12px;cursor:pointer;text-align:left;font:inherit}.pl-ctab i{font-style:normal;font-size:20px}.pl-ctab span{flex:1}.pl-ctab b{display:block;font-size:14.5px;color:#8a3a1f}.pl-ctab small{color:#7A5A4A;font-size:12px}.pl-ctab em{font-style:normal;color:#8a3a1f}.pl-ctao{display:flex;flex-direction:column;gap:6px;padding:0 10px 10px}.pl-ctao button{border:1px solid #E2C9BC;background:#fff;border-radius:10px;padding:8px 10px;text-align:left;cursor:pointer;font:inherit}.pl-ctao b{display:block;font-size:13px}.pl-ctao small{color:#8A8278;font-size:11.5px}.pl-sg{border:1px solid #E8DFD2;border-radius:12px;background:#fff;flex:none}.pl-sg.cur{border:2px solid #C26445;padding:10px 12px 0}.pl-sgt{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#C26445;font-weight:700;margin:0 0 2px}#plOv .pl-sgh{border:0;background:none;min-height:0;margin:0;box-shadow:none;border-radius:12px}.pl-sgh{display:flex;gap:10px;align-items:center;width:100%;border:0;background:none;padding:9px 12px;text-align:left;font:inherit;cursor:pointer}.pl-sgh i{font-style:normal;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;flex:none}.pl-sg.done .pl-sgh i{background:#E7F0DE;color:#3B6D11}.pl-sg.lock .pl-sgh{cursor:default}.pl-sg.lock .pl-sgh i{background:#F2EEE7}.pl-sgh span{flex:1;min-width:0}.pl-sgh b{display:block;font-size:13.5px;color:#2E2E2E}.pl-sg.lock b{color:#A59C90}.pl-sgh small{display:block;font-size:11.5px;color:#8A8278;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pl-sgh em{font-style:normal;color:#8A8278}.pl-sgl{margin:4px 0 8px;border:1px solid #F0E9DE;border-radius:10px;padding:4px 6px;max-height:42vh;overflow:auto}.pl-sgl summary{cursor:pointer;font-size:12.5px;font-weight:600;padding:4px}.pl-sgb{padding:0 8px 8px;border-top:1px solid #F0E9DE}.pl-sg.cur .pl-subar{margin:8px -12px 0;padding:12px;position:sticky;bottom:0;background:#fff;border-top:1px solid #F0E9DE;border-radius:0 0 12px 12px}#plOv .pl-sg.cur .pl-subar{display:flex;gap:8px;align-items:stretch;box-sizing:border-box;margin:10px -12px 0;padding:12px 12px calc(12px + env(safe-area-inset-bottom));background:#fff}#plOv .pl-sg.cur .pl-subar .pl-go{flex:1;width:auto;min-width:0;box-sizing:border-box;margin:0;padding:13px 14px;border-radius:12px}.pl-bk{flex:none;border:1px solid #D6D2C7;background:#fff;color:#2E2E2E;border-radius:12px;padding:12px 14px;font:600 14px inherit;font-family:inherit;cursor:pointer;margin:0}.pl-sg.cur{box-sizing:border-box}.pl-sg.cur .pl-subig button{min-width:96px}.pl-sg.cur .pl-els,.pl-sg.cur .pl-thm,.pl-sg.cur .pl-fl{grid-template-columns:1fr 1fr}.pl-side .pl-cta,.pl-side .pl-sg{margin-bottom:8px}@media(max-width:900px){.pl-u{display:block;height:auto}.pl-ul{height:var(--ulh,64dvh);position:sticky;top:57px;z-index:1;padding:8px}.pl-ul .pl-su2d{height:calc(var(--ulh,64dvh) - 60px)}.pl-ur{border-left:0;border-top:1px solid #E2D6C4;border-radius:18px 18px 0 0;position:relative;z-index:2;margin-top:-14px;min-height:54dvh;box-shadow:0 -6px 18px rgba(0,0,0,.08)}.pl-ur:before{display:none!important}.pl-hdl{display:flex!important;justify-content:center;align-items:center;width:100%;height:26px;border:0;background:none;padding:0;margin:0 0 -6px;touch-action:none;cursor:grab;flex:none}.pl-hdl i{width:44px;height:5px;border-radius:4px;background:#CFC5B6}.pl-ubig svg{max-height:calc(var(--ulh,64dvh) - 20px)}}.pl-selm svg{display:block;width:100%;height:auto;max-height:240px}@media(max-width:900px){#plOv .pl-2qc,#plOv .pl-2t{grid-template-columns:1fr}#plOv .pl-2t .pl-ab3d.pl-thv{position:relative;top:0;height:50vh}#plOv .pl-2qc .pl-sel{position:static;max-height:none}}#plOv .pl-2l{min-width:0}@media(max-width:860px){#plOv .pl-2c{grid-template-columns:1fr}}#plOv .pl-sel{background:#fff;border:1px solid #E2D6C4;border-radius:14px;padding:10px 10px 12px;position:sticky;top:8px;max-height:calc(100vh - 120px);overflow:auto;font-size:13px}#plOv .pl-selh{margin:2px 4px 8px;font:700 14px Inter,sans-serif;color:#2E2E2E}#plOv .pl-seld{border-top:1px solid #EFE7DA;padding:6px 2px}#plOv .pl-seld summary{display:flex;align-items:center;justify-content:space-between;cursor:pointer;list-style:none;padding:6px 4px;font-size:13px}#plOv .pl-seld summary::-webkit-details-marker{display:none}#plOv .pl-seld summary:after{content:'▾';color:#8A8278;margin-left:6px}#plOv .pl-seld:not([open]) summary:after{content:'▸'}#plOv .pl-seld summary em{margin-left:auto;font-style:normal;color:#8A8278;background:#F4EEE4;border-radius:999px;padding:1px 8px;font-size:11px}#plOv .pl-selg{display:flex;align-items:center;justify-content:space-between;margin:8px 4px 2px;color:#8A8278;font-size:11px;text-transform:uppercase;letter-spacing:.04em}#plOv .pl-selg button,#plOv .pl-sela{border:0;background:none;color:#C26445;font:600 12px Inter,sans-serif;cursor:pointer;padding:2px 4px}#plOv .pl-sela{display:block;margin:6px 2px 0}#plOv .pl-selr{display:flex;align-items:center;gap:2px;border-radius:10px;padding:2px}#plOv .pl-selr.on{background:#FBEFE9}#plOv .pl-seln{flex:1;min-width:0;text-align:left;border:0;background:none;padding:5px 6px;cursor:pointer;font-family:inherit}#plOv .pl-seln b{display:block;font-size:13px;font-weight:600;color:#2E2E2E;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#plOv .pl-seln small{display:block;font-size:11px;color:#8A8278}#plOv .pl-selr>button:not(.pl-seln){border:0;background:none;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:14px}#plOv .pl-selr>button:not(.pl-seln):hover{background:#F4EEE4}#plOv .pl-sele,#plOv .pl-selx{margin:4px 6px;color:#8A8278;font-size:12px}#plOv .pl-szt{display:flex;flex-direction:column;gap:8px;margin:4px 0 14px}#plOv .pl-szt button{display:block;text-align:left;border:1.5px solid #E2D6C4;background:#fff;border-radius:12px;padding:10px 14px;cursor:pointer;font-family:inherit}#plOv .pl-szt button.on{border-color:#C26445;background:#FBEFE9}#plOv .pl-szh{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline}#plOv .pl-szh b{font-size:15px;color:#2E2E2E}#plOv .pl-szh em{font-style:normal;font-size:12px;color:#6B635A}#plOv .pl-szt small{display:block;margin-top:4px;font-size:12px;color:#6B635A;line-height:1.4}#plOv .pl-szt small b{color:#2E2E2E;font-weight:600}#plOv .pl-sumood{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}#plOv .pl-sumood button{display:flex;flex-direction:column;align-items:center;gap:6px;border:1.5px solid #E2D6C4;background:#fff;border-radius:16px;padding:18px 8px;cursor:pointer;font-family:inherit}#plOv .pl-sumood i{font-style:normal;font-size:34px}.pl-ab3d{height:min(74vh,820px);width:calc(100vw - 24px);max-width:1400px;border-radius:14px;overflow:hidden;background:#EDE7DC;margin:6px 0 12px;position:relative;left:50%;transform:translateX(-50%)}#plOv .pl-su{overflow-x:hidden}.pl-ab3d canvas{width:100%!important;height:100%!important}#plOv .pl-ask2{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:40;display:none;align-items:flex-end;justify-content:center}#plOv .pl-ask2b{background:#fff;border-radius:18px 18px 0 0;padding:18px 16px 22px;width:100%;max-width:520px}#plOv .pl-ask2b h3{margin:0 0 12px;font-size:17px}#plOv .pl-ask2b button{display:block;width:100%;text-align:left;border:1px solid #E2D6C4;background:#FBF8F3;border-radius:14px;padding:12px 14px;margin:0 0 10px;font-family:inherit;cursor:pointer}#plOv .pl-ask2b button b{display:block;font-size:15px}#plOv .pl-ask2b button small{color:#6B6B6B;font-size:12.5px}#plOv .pl-ask2b button.x{text-align:center;background:none;border:0;color:#6B6B6B}#plOv .pl-z2{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin:4px 0 -2px}#plOv .pl-z2 button{width:34px;height:34px;border-radius:10px;border:1px solid #E2D6C4;background:#fff;font-size:18px;cursor:pointer}#plOv .pl-z2 button:disabled{opacity:.35}.pl-z2s{flex:1}.pl-sgr{display:flex;align-items:center}.pl-scra{display:flex;flex-wrap:wrap;gap:6px;padding:4px 4px 8px}.pl-scra button{border:1px dashed #C26445;background:#fff;color:#C26445;border-radius:14px;padding:5px 10px;font:600 12px inherit;font-family:inherit;cursor:pointer;text-transform:capitalize}.pl-sgr .pl-sgh{flex:1;min-width:0}.pl-sg3{flex:none;margin:0 10px 0 0;border:1px solid #E2D6C4;background:#fff;border-radius:16px;padding:5px 10px;font:600 11.5px inherit;font-family:inherit;color:#C26445;cursor:pointer;white-space:nowrap}.pl-v3s{position:fixed;inset:0;z-index:100050;background:rgba(20,18,15,.55);display:none;align-items:center;justify-content:center;padding:20px}.pl-v3sb{background:#fff;border-radius:16px;width:min(1100px,100%);height:min(760px,100%);display:flex;flex-direction:column;overflow:hidden}.pl-v3sh{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #EEE6DA}.pl-v3sh button{border:0;background:#F3EEE6;border-radius:50%;width:34px;height:34px;cursor:pointer;font-size:16px}.pl-v3sv{flex:1;position:relative;min-height:0}.pl-ubig{position:relative;flex-direction:column}.pl-pvn{font-size:12px;color:#8A8278;margin:6px 0 0;text-align:center}#plOv .pl-z2 span{font-size:12.5px;color:#6B6B6B;min-width:40px;text-align:center}#plOv .pl-su2d.zm{overflow:auto;touch-action:pan-x pan-y;border:1px solid #EDE5DA;border-radius:12px}#plOv .pl-su2d.zm .p2svg{width:calc(100% * var(--z));height:calc(100% * var(--z));touch-action:pan-x pan-y}#plOv .pl-fi{display:inline-flex;align-items:center;gap:4px;margin-left:4px}#plOv .pl-fi button{width:30px;height:30px;border-radius:50%;border:1.5px solid #E3DCD2;background:#fff;font-size:16px;cursor:pointer;padding:0}#plOv .pl-fi em{font-style:normal;font-weight:700;font-size:13px;min-width:38px;text-align:center}#plOv .pl-szr2{flex-wrap:wrap}#plOv .pl-szr2 .pl-szl{flex:1 1 60%}#plOv .pl-szr2 .pl-fi:first-of-type{margin-left:auto}#plOv .pl-sofa{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:6px 0 10px}#plOv .pl-sofa button{border:1.5px solid #E3DCD2;background:#fff;border-radius:12px;padding:8px 6px;display:flex;flex-direction:column;align-items:center;gap:4px;font-family:inherit;cursor:pointer;color:#6E6357}#plOv .pl-sofa button.on{border-color:#C26445;background:#FBEDE7;color:#C26445}#plOv .pl-sofa svg{width:100%;height:56px}#plOv .pl-sofa b{font-size:12px;color:#2E2E2E}#plOv .pl-sofaall{background:#fff;border:1px solid #EDE5DA;border-radius:14px;padding:10px;text-align:center;color:#2E2E2E;margin-bottom:14px}#plOv .pl-sofaall svg{width:100%;max-height:180px}#plOv .pl-sofaall small{display:block;color:#6B6B6B;margin-top:4px}#plOv .pl-wlib{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 12px}#plOv .pl-exd{display:flex;gap:5px;margin:-4px 0 12px}#plOv .pl-exd i{flex:1;height:3px;border-radius:2px;background:#E8DFD3}#plOv .pl-exd i.on{background:#55634A}#plOv .pl-toast{position:fixed;left:50%;bottom:90px;transform:translate(-50%,20px);background:#2E2E2E;color:#fff;padding:10px 16px;border-radius:22px;font-size:13.5px;font-weight:600;opacity:0;pointer-events:none;transition:.25s;z-index:50;max-width:86vw;text-align:center}#plOv .pl-toast.on{opacity:1;transform:translate(-50%,0)}#plOv .pl-toast.bad{background:#9A3B22}#plOv .pl-ab3t{position:absolute;right:8px;top:8px;z-index:3;display:flex;flex-direction:column;gap:6px}#plOv .pl-ab3t button{width:40px;height:40px;border-radius:12px;border:1px solid #E2D6C4;background:#fff;font-size:17px;cursor:pointer;font-family:inherit;box-shadow:0 1px 4px rgba(0,0,0,.08)}#plOv .pl-ab3t button.on{background:#2E2E2E;color:#fff;border-color:#2E2E2E}.pl-3d{position:relative}.pl-tabs3{position:absolute;left:8px;right:60px;top:8px;z-index:6;display:none;gap:6px;overflow-x:auto;scrollbar-width:none}.pl-tabs3 button{flex:none;display:flex;align-items:center;gap:6px;border:1px solid #E2DACD;background:rgba(255,255,255,.95);border-radius:18px;padding:6px 10px;font:600 12.5px Inter,system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.08)}.pl-tabs3 button.on{background:#2E2E2E;color:#fff;border-color:#2E2E2E}.pl-tabs3 .ico{color:currentColor}.pl-tabs3 button i{font-style:normal;margin-left:2px;opacity:.6;padding:0 2px}.pl-pop{position:absolute;z-index:7;display:none;background:#fff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.18);padding:8px 10px;min-width:160px}.pl-pop b{display:block;font-size:12px;color:#7A7268;margin:0 0 6px}.pl-pop button{border:0;background:#C26445;color:#fff;border-radius:16px;padding:7px 12px;font:600 13px Inter,system-ui,sans-serif;cursor:pointer}.pl-pop .pl-popx{position:absolute;right:4px;top:4px;background:none;color:#7A7268;padding:2px 6px}.pl-rmr{display:flex;flex-direction:column;gap:6px;padding:10px 0;border-bottom:1px solid #EEE7DC}.pl-rmr>span{display:flex;align-items:center;gap:8px;font-weight:600;font-size:14px}.pl-rmr>span i{font-size:22px;font-style:normal}.pl-rmr .pl-subig{margin:0}.pl-floors{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pl-ab3d.pl-thv{height:min(52vh,600px)}.pl-thb{display:inline-block;font-style:normal;font-size:10.5px;font-weight:700;color:#fff;background:#55634A;border-radius:99px;padding:2px 7px;margin:2px 0}.pl-fl{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 6px}@media(max-width:700px){.pl-fl{grid-template-columns:1fr 1fr}}.pl-fl button{border:1.5px solid #E2DACD;background:#fff;border-radius:14px;padding:8px;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:3px;font:inherit}.pl-fl button.on{border-color:#C26445;background:#FFF7F2;box-shadow:0 0 0 2px rgba(194,100,69,.25)}.pl-flt{display:block;aspect-ratio:1/1;overflow:hidden;border-radius:8px;background:#F4EFE7;pointer-events:none}.pl-flt svg{width:100%;height:100%}.pl-fl b{font-size:14px}.pl-fl small{font-size:12px;color:#7A7268;line-height:1.3}.pl-fl em{font-style:normal;font-size:10.5px;font-weight:700;color:#fff;background:#55634A;border-radius:99px;padding:2px 7px;align-self:flex-start}.pl-flm{border:0;background:none;color:#C26445;font:600 13px Inter,sans-serif;cursor:pointer;padding:4px 0 10px}.pl-thm{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 4px}.pl-ab3d.pl-thv{margin-bottom:80px}@media(max-width:700px){.pl-thm{grid-template-columns:1fr 1fr}}.pl-thm button{border:1.5px solid #E2DACD;background:#fff;border-radius:14px;padding:10px;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:3px;font:inherit}.pl-thm button.on{border-color:#C26445;background:#FFF7F2;box-shadow:0 0 0 2px rgba(194,100,69,.25)}.pl-thm i{display:flex;gap:3px;margin-bottom:4px}.pl-thm s{flex:1;height:16px;border-radius:4px;border:1px solid rgba(0,0,0,.08)}.pl-thm b{font-size:14px}.pl-thm small{font-size:12px;color:#7A7268;line-height:1.3}.pl-thm + .pl-subar{}.pl-floors button{border:1.5px solid #E2DACD;background:#fff;border-radius:14px;padding:8px 8px 10px;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:4px}.pl-floors button.on{border-color:#C26445;background:#FFF7F2}.pl-floors .flthumb{width:100%;height:auto;border-radius:8px;display:block}.pl-floors b{font-size:14px}.pl-floors small{font-size:11.5px;color:#7A7268;line-height:1.35}.pl-swr{display:flex;flex-wrap:wrap;gap:10px;margin:4px 0 12px}.pl-swr button{border:0;background:none;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;padding:0}.pl-swr i{width:38px;height:38px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #D6D2C7}.pl-swr .on i{box-shadow:0 0 0 2px #C26445}.pl-swr small{font-size:11px;color:#5B544B}.pl-magic{min-height:70vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px}.pl-magic h2{margin:14px 0 6px}.pl-mgo{font-size:46px;color:#C26445;animation:plmg 1.6s ease-in-out infinite}.pl-mgo .ico{color:#C26445}@keyframes plmg{0%,100%{transform:scale(1) rotate(0)}50%{transform:scale(1.15) rotate(12deg)}}.pl-mgl{color:#5B544B;min-height:2.6em;transition:opacity .18s;margin:0 0 14px;max-width:300px}.pl-mgb{width:220px;height:4px;border-radius:4px;background:#EADCC8;overflow:hidden}.pl-mgb i{display:block;height:100%;width:40%;background:#C26445;border-radius:4px;animation:plmgb 1.3s ease-in-out infinite}@keyframes plmgb{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}.ico{width:1em;height:1em;display:inline-block;vertical-align:-.15em;color:#55634A}#plOv .pl-sumood b{font-size:14px}#plOv .pl-sumood button.on{border-color:#C26445;background:#FFF8F2}
#plOv .pl-subig{display:flex;flex-wrap:wrap;gap:10px}#plOv .pl-subig button{flex:1;min-width:120px;border:1.5px solid #E2D6C4;background:#fff;border-radius:14px;padding:12px 10px;font:600 15px inherit;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px}#plOv .pl-subig button b{font-size:15px}#plOv .pl-subig small{color:#7A7268;font-size:12px}#plOv .pl-subig button.on{border-color:#C26445;background:#FFF8F2}
#plOv .pl-sw{display:block;width:44px;height:30px;border-radius:6px;border:1px solid #D4CEC4}#plOv .pl-sw-p{background:#EFEBE4 repeating-linear-gradient(0deg,transparent 0 14px,#D4CEC4 14px 15px),repeating-linear-gradient(90deg,transparent 0 14px,#D4CEC4 14px 15px)}#plOv .pl-sw-m{background:radial-gradient(circle at 50% 50%,#2F6F7E 0 5px,transparent 6px) 0 0/15px 15px,#F3EEE6}
#plOv .pl-sun{position:relative;margin:28px auto 34px;max-width:70%;max-height:42vh;background:#EADCC8;border:4px solid #9B8E7E;border-radius:6px}#plOv .pl-sun span{position:absolute;bottom:-26px;left:0;right:0;text-align:center;font:700 12px inherit;color:#8a3a1f}#plOv .pl-sn{position:absolute;width:42px;height:42px;border-radius:50%;border:2px dashed #9B8E7E;background:#fff;font-weight:800;cursor:pointer}#plOv .pl-sn.on{background:#C26445;color:#fff;border:2px solid #C26445}#plOv .pl-sn-back{top:-22px;left:calc(50% - 21px)}#plOv .pl-sn-front{bottom:-22px;left:calc(50% - 21px)}#plOv .pl-sn-left{left:-22px;top:calc(50% - 21px)}#plOv .pl-sn-right{right:-22px;top:calc(50% - 21px)}.pl-sn-back-left{top:-22px;left:-22px}.pl-sn-back-right{top:-22px;right:-22px}.pl-sn-front-left{bottom:-22px;left:-22px}.pl-sn-front-right{bottom:-22px;right:-22px}
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
@media(max-width:760px){#plOv .pl-sv{display:none}#plOv .pl-bd{flex-direction:column}#plOv .pl-3d{flex:none;height:46vh}#plOv .pl-side{width:auto;max-width:none;border-left:0;border-top:1px solid #E2D6C4;flex:1}#plOv .pl-st button{padding:6px 10px;font-size:12px}#plOv .pl-hd small{display:none}#plOv .pl-l{display:none}#plOv .pl-hd h2{font-size:14px}}/* 289 option A */.pl-hdl{display:none}#plOv .pl-ur .pl-sucs:has(small){display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}#plOv .pl-ur .pl-sucs:has(small) button{height:auto;min-height:64px;border-radius:12px;padding:10px 12px;text-align:left;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:2px;position:relative}#plOv .pl-ur .pl-sucs:has(small) button small{font:400 11.5px/1.35 Inter,sans-serif!important;color:#6B6660!important}#plOv .pl-ur .pl-sucs:has(small) button.on::after{content:'';position:absolute;top:8px;right:8px;width:16px;height:16px;border-radius:50%;background:#C26445 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12l5 5 9-10'/%3E%3C/svg%3E") center/10px no-repeat}#plOv .pl-ur .pl-cab .pl-sucs:not(:has(small)){display:flex;gap:4px;padding:4px;border-radius:10px;background:#F1ECE5}#plOv .pl-ur .pl-cab .pl-sucs:not(:has(small)) button{flex:1;height:38px;border:0;background:transparent;border-radius:8px;color:#6B6660;font-weight:500}#plOv .pl-ur .pl-cab .pl-sucs:not(:has(small)) button.on{background:#fff;color:#2E2E2E;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.12)}#plOv .pl-ur .pl-cnts .ico{font-size:18px;margin-right:6px;color:#C26445}#plOv .pl-ur{padding:0;gap:0;background:#fff}#plOv .pl-ah{padding:20px 22px 0;flex:none}#plOv .pl-ahr{display:flex;align-items:center;justify-content:space-between;gap:10px}#plOv .pl-ahr span{font:700 11.5px Inter,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#C26445}#plOv .pl-ahr button{height:30px;padding:0 10px;border-radius:8px;border:1px solid #E6DFD6;background:#fff;font:500 12px Inter,sans-serif;color:#2E2E2E;cursor:pointer;min-height:0;margin:0}#plOv .pl-ahr button.on{background:#2E2E2E;color:#fff;border-color:#2E2E2E}#plOv .pl-apb{display:flex;gap:4px;margin:12px 0 4px}#plOv .pl-apb i{flex:1;height:4px;border-radius:2px;background:#E6DFD6}#plOv .pl-apb i.d{background:#C26445}#plOv .pl-apb i.c{background:#2E2E2E}#plOv .pl-aall{margin:12px 22px 0;padding:10px;border:1px solid #E6DFD6;border-radius:14px;background:#F7F3EE;display:flex;flex-direction:column;gap:6px;flex:none}#plOv .pl-aall .pl-sg{border-color:#EAE3D9}#plOv .pl-aall .pl-sg.cur0{border:1.5px solid #2E2E2E}#plOv .pl-aall .pl-sg.cur0 i{background:#2E2E2E;color:#fff;font-size:8px}#plOv .pl-aall .pl-sg3{width:32px;height:32px;padding:0;border-radius:8px;border:1px solid #E6DFD6;display:flex;align-items:center;justify-content:center;color:#2E2E2E;font-size:16px}#plOv .pl-aall .pl-sg3 .ico{color:#2E2E2E}#plOv .pl-aq{padding:14px 22px 22px;flex:1 0 auto}#plOv .pl-aq h2{font:700 22px/1.25 'Plus Jakarta Sans',Inter,sans-serif!important;color:#2E2E2E;margin:6px 0 6px!important}#plOv .pl-ur .pl-sub{font:400 13px/1.5 Inter,sans-serif;color:#6B6660;margin:0 0 14px}#plOv .pl-ur .pl-h{font:600 13px Inter,sans-serif;color:#2E2E2E;margin:18px 0 8px}#plOv .pl-asum{position:sticky;bottom:69px;z-index:3;padding:10px 22px;border-top:1px solid #E6DFD6;background:#F7F3EE;font:500 12px/1.45 Inter,sans-serif;color:#6B6660;flex:none}#plOv .pl-ur>.pl-subar{position:sticky;bottom:0;z-index:4;display:flex;gap:10px;margin:0;padding:12px 22px calc(12px + env(safe-area-inset-bottom));background:#fff;border-top:1px solid #E6DFD6;border-radius:0;flex:none}#plOv .pl-ur .pl-subar .pl-bk{height:44px;padding:0 18px;border-radius:10px;border:1px solid #E6DFD6;background:#fff;font:600 14px Inter,sans-serif;color:#2E2E2E}#plOv .pl-ur .pl-subar .pl-go{flex:1;height:44px;padding:0 14px;border-radius:10px;border:0;background:#2E2E2E;color:#fff;font:600 14px Inter,sans-serif;margin:0;width:auto}#plOv .pl-ur .pl-subar .pl-go[disabled]{opacity:.35}#plOv .pl-ur .pl-els{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}#plOv .pl-ur .pl-elw{position:relative;border:1.5px solid #E6DFD6;background:#fff;border-radius:12px;padding:12px;gap:10px;min-height:84px;box-sizing:border-box;justify-content:space-between}#plOv .pl-ur .pl-elw:has(>button.on){border-color:#C26445;background:#FBEFE9}#plOv .pl-ur .pl-elw>button{border:0;background:none;padding:0;min-height:0;margin:0;display:flex;flex-direction:row;align-items:center;justify-content:flex-start;gap:8px;text-align:left;cursor:pointer;box-shadow:none;border-radius:0}#plOv .pl-ur .pl-elw>button i{font-size:20px;line-height:1;color:#2E2E2E}#plOv .pl-ur .pl-elw>button.on i,#plOv .pl-ur .pl-elw>button.on .ico{color:#C26445}#plOv .pl-ur .pl-elw>button .ico{color:#2E2E2E}#plOv .pl-ur .pl-elw>button b{font:600 13px/1.3 Inter,sans-serif;color:#2E2E2E}#plOv .pl-ur .pl-elw>button em{display:none}#plOv .pl-ur .pl-elw>button:not(.on)::after{content:'+ Add';position:absolute;left:12px;bottom:12px;height:28px;line-height:26px;padding:0 10px;border-radius:8px;border:1px solid #E6DFD6;background:#fff;font:500 12px Inter,sans-serif;color:#6B6660;box-sizing:border-box}#plOv .pl-ur .pl-elw>button:not(.on){position:static;flex:1;align-items:flex-start;padding-bottom:36px}#plOv .pl-ur .pl-cnt{justify-content:flex-start;gap:6px}#plOv .pl-ur .pl-cnt button,#plOv .pl-ur .pl-cnts button{width:28px;height:28px;border-radius:8px;border:1px solid #E6DFD6;background:#fff;font:500 15px Inter,sans-serif;color:#2E2E2E;padding:0;min-height:0}#plOv .pl-ur .pl-cnt b{font:600 14px Inter,sans-serif;min-width:18px}#plOv .pl-ur .pl-cnts{display:flex;align-items:center;gap:8px;padding:12px 14px;border:1px solid #E6DFD6;border-radius:12px;margin:0 0 6px}#plOv .pl-ur .pl-cnts span{flex:1;font:600 13px Inter,sans-serif}#plOv .pl-ur .pl-subig{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:8px}#plOv .pl-ur .pl-subig.pl-col{grid-template-columns:1fr}#plOv .pl-ur .pl-subig button{position:relative;min-width:0;min-height:44px;border:1.5px solid #E6DFD6;background:#fff;border-radius:12px;padding:12px;font:600 13px Inter,sans-serif;color:#2E2E2E;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:4px;text-align:left;box-shadow:none;margin:0}#plOv .pl-ur .pl-subig button i{font-size:20px;line-height:1}#plOv .pl-ur .pl-subig button i .ico{color:#2E2E2E}#plOv .pl-ur .pl-subig button b{font:600 13px Inter,sans-serif}#plOv .pl-ur .pl-subig button small{font:400 12px/1.4 Inter,sans-serif;color:#6B6660}#plOv .pl-ur .pl-subig button.on,#plOv .pl-ur .pl-sucs button.on,#plOv .pl-ur .pl-thm button.on,#plOv .pl-ur .pl-fl button.on,#plOv .pl-ur .pl-szt button.on,#plOv .pl-ur .pl-sofa button.on{border-color:#C26445;background:#FBEFE9;box-shadow:none}#plOv .pl-ur .pl-subig button.on i .ico{color:#C26445}#plOv .pl-ur .pl-subig button.on::after,#plOv .pl-ur .pl-thm button.on::after,#plOv .pl-ur .pl-fl button.on::after{content:'';position:absolute;top:9px;right:9px;width:18px;height:18px;border-radius:50%;background:#C26445 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12l5 5 9-10'/%3E%3C/svg%3E") center/11px no-repeat}#plOv .pl-ur .pl-rmr{padding:12px 0;border-bottom:1px solid #F1ECE5;gap:8px}#plOv .pl-ur .pl-rmr>span{font:600 14px Inter,sans-serif}#plOv .pl-ur .pl-rmr>span i{font-size:20px;color:#6B6660}#plOv .pl-ur .pl-rmr .pl-subig{display:flex;gap:4px;padding:4px;border-radius:10px;background:#F1ECE5}#plOv .pl-ur .pl-rmr .pl-subig button{flex:1;min-height:38px;padding:0 10px;align-items:center;border:0;background:transparent;color:#6B6660;font-weight:500;border-radius:8px}#plOv .pl-ur .pl-rmr .pl-subig button.on{background:#fff;color:#2E2E2E;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.12)}#plOv .pl-ur .pl-rmr .pl-subig button.on::after{display:none}#plOv .pl-ur .pl-sucs{gap:8px;margin:4px 0 8px}#plOv .pl-ur .pl-sucs button{height:36px;padding:0 14px;border-radius:18px;border:1.5px solid #E6DFD6;background:#fff;font:600 12.5px Inter,sans-serif;color:#2E2E2E;min-height:0;margin:0}#plOv .pl-ur .pl-thm,#plOv .pl-ur .pl-fl{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}#plOv .pl-ur .pl-thm button,#plOv .pl-ur .pl-fl button{position:relative;border:1.5px solid #E6DFD6;border-radius:12px;padding:12px;gap:4px}#plOv .pl-ur .pl-thm i{gap:0;height:34px;border-radius:8px;overflow:hidden;margin-bottom:6px}#plOv .pl-ur .pl-thm s{height:34px;border:0;border-radius:0}#plOv .pl-ur .pl-thm b,#plOv .pl-ur .pl-fl b{font:600 13px Inter,sans-serif}#plOv .pl-ur .pl-thm small,#plOv .pl-ur .pl-fl small{font:400 12px/1.4 Inter,sans-serif;color:#6B6660}#plOv .pl-ur .pl-fl em{background:#E7ECE2;color:#55634A}#plOv .pl-ur .pl-flt{aspect-ratio:3/2}#plOv .pl-ur .pl-cab{border:0;padding:0;margin:8px 0 0;background:none}#plOv .pl-ur .pl-cab>b{font:600 13px Inter,sans-serif;margin:18px 0 8px}#plOv .pl-ur .pl-cdir{grid-template-columns:repeat(3,minmax(0,92px));gap:8px}#plOv .pl-ur .pl-cdir button{height:44px;border-radius:10px;border:1.5px solid #E6DFD6;font:600 14px Inter,sans-serif;min-height:0;margin:0}#plOv .pl-ur .pl-cdir button.on{border-color:#C26445;background:#FBEFE9;color:#2E2E2E}#plOv .pl-ur .pl-szt button{border-radius:12px;border-width:1.5px}#plOv .pl-ur .pl-exd{margin:0 0 14px}#plOv .pl-ur .pl-exd i.on{background:#C26445}#plOv .pl-ur .pl-sgl{border-color:#E6DFD6;border-radius:12px;margin-top:14px}@media(max-width:900px){#plOv .pl-ah{padding:14px 16px 0}#plOv .pl-aq{padding:12px 16px 18px}#plOv .pl-aall{margin:10px 16px 0}#plOv .pl-asum{padding:10px 16px}#plOv .pl-ur>.pl-subar{padding:12px 16px calc(12px + env(safe-area-inset-bottom))}#plOv .pl-aq h2{font-size:20px!important}#plOv .pl-ur:before{margin:8px auto 0}}`;

function shell() {
  if (EL) return; const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  EL = document.createElement('div'); EL.id = 'plOv'; EL.setAttribute('role', 'dialog'); EL.setAttribute('aria-label', 'Plan your space');
  EL.innerHTML = '<div class="pl-hd"><div><h2>Plan your space</h2><small>Set up your terrace or lawn, then place what you\'d like on it</small></div><div class="pl-sv" id="plSv"></div><div class="pl-st" id="plSt"></div><button type="button" class="pl-x" data-pl="close" aria-label="Close">✕</button></div>' +
    '<div class="pl-bd"><div class="pl-3d"><div class="pl-tabs3" id="plT3"></div><div id="pl3d"></div><div class="pl-pop" id="plPop"></div><div class="pl-z" id="plZ"></div><div class="pl-cmp" id="plCmp" title="North"></div></div><div class="pl-side"><div class="pl-pn" id="plPn"></div><div class="pl-ft" id="plFt"></div></div></div>';
  document.body.appendChild(EL);
  EL.addEventListener('click', onClick); EL.addEventListener('change', onInput);
  document.addEventListener('keydown', e => { if (!EL || EL.style.display === 'none' || (S.su && S.su.on) || !(e.ctrlKey || e.metaKey) || /input|textarea|select/i.test((e.target && e.target.tagName) || '')) return; const k = String(e.key).toLowerCase(); if (k === 'z' || k === 'y') { e.preventDefault(); undo(k === 'y' || e.shiftKey ? 1 : -1); } });
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
    else if (sel.cat === 'plant') T.size += plantPicker(sel);
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
    T.design += `<p style="margin:10px 0 0;font-size:14px">${fp && fp.price != null ? (lock ? '🔒 Price after sign-in' : (fp.plants ? '' : 'From ') + '<b>' + rs(fp.price) + '</b>') : fp && fp.soon ? 'Coming soon' : 'Our team will price it'} <small style="color:#7A7268">· ${fp ? fp.n : 0} ${fp && fp.plants ? 'plants' : 'designs'}</small></p>`;
    const look = !!(S.su && S.su.done && S.site.kind === 'terrace');   // 239: after the setup the 3D only shows — sizes and places change on the 2D plan
    if (look) { T.size = sel.cat === 'plant' ? plantPicker(sel) : ''; T.place = ''; T.design = '<p class="pl-sub" style="margin:0 0 8px">Sizes and places change on the 2D plan.</p>' + T.design; }
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
  if (S.bnote && !(S.su && S.su.done)) h += '<div class="pl-note">✓ Placed where our terraces have them — drag anything to move it.</div>';
  const SD = S.su && S.su.done && S.site.kind === 'terrace';   // 258 (owner): after the setup, adding is done under the 2D plan
  if (SD) return (lwOk() ? lwCard() : '') + (lock ? '<button type="button" class="pl-lock" data-pl="unlock">🔒 Sign in to see prices</button>' : '') + stagePanel(null, '', true);   // 282 (owner): after the setup the same stage-wise panel, no long list
  if (!SD) h += '<h4>Add more</h4><p class="pl-sub">Tap to add · move things on the 2D plan (📐)</p>';
  if (lock) h += '<button type="button" class="pl-lock" data-pl="unlock">🔒 Sign in to see prices</button>';
  if (S.msg) h += `<div class="pl-msg">${esc(S.msg)}</div>`;
  const sets = SETUPS.filter(x => !x.lawn || S.site.kind !== 'terrace');
  if (!S.items.length) h += '<p class="pl-h">Start from a setup</p><div class="pl-set">' + sets.map(x => `<button type="button" data-pl="setup:${x.k}"><i>${x.e}</i><b>${esc(x.t)}</b><small>${esc(x.d)}</small></button>`).join('') + '</div><p class="pl-h">Or add one by one</p>';
  if (!SD) h += '<div class="pl-pal">' + CATS.filter(c => (!c.lawn || S.site.kind !== 'terrace') && (designs(c).length || c.always) && (c.k !== 'accover' || S.site.kind === 'terrace')).map(c => {
    const fp = fromPrice(Object.assign({ cat: c.k, w: c.w || 4, d: c.d || 4, h: c.h || 3 }, c.k === 'cabin' ? { sku: (cabinSkus().find(s => /PORTA/.test(s)) || cabinSkus()[0]) } : {}));
    return `<button type="button" data-pl="add:${c.k}"><i>${c.e}</i><span><b>${esc(c.t)}</b><small>${fp.price != null ? (lock ? fp.n + ' designs' : 'from ' + lakh(fp.price)) : fp.soon ? 'Coming soon' : fp.n + ' designs'}</small></span></button>`; }).join('') + '</div>';
  if (lwOk()) h = lwCard() + h;
  if (S.items.length) h += '<p class="pl-h">On your plan</p>' + S.items.map((it, i) => { const fp = fromPrice(it); return `<div class="pl-it" data-pl="sel:${i}"><i>${CAT[it.cat].e}</i><span>${esc(it.label || CAT[it.cat].t)}${CAT[it.cat].size && CAT[it.cat].size !== 'fixed' ? ' <em>· ' + sizeTxt(it, CAT[it.cat]) + '</em>' : ''}</span><em>${fp && fp.price != null && !lock ? 'from ' + rs(fp.price) : ''}</em></div>`; }).join('');
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
  const n = P2.NORTHV[(S.su || {}).north], sw = n ? [-(-n[1]) - n[0], -(n[0]) - n[1]] : null;   // 234: west = −east, east = (−n.z, n.x); south = −north
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
const SUQ = ['have', 'existing', 'asbuilt', 'ab3d', 'remove', 'base', 'b3d', 'mood', 'want', 'cabin', 'bar', 'fbs', 'wtr', 'ftr', 'gfw', 'roofx', 'seats', 'floor', 'north', 'eplan', 'e3d', 'decor', 'sofa', 'green', 'lights', 'plan', 'theme', 'flay', 'prop'];   // 277: … floor layout → the proposal   // 276c: … theme → floor layout   // 245 (owner): round 1 roof → round 2 the big pieces (eplan) → round 3 furniture, plants, lamps (plan)
// 246 (owner): round 1 also asks what is ALREADY built on the roof (kept as 'Existing' things on the plan, never priced) and what is to be taken down
const HAVE = [['pergola', 'Pergola'], ['bar', 'Bar counter'], ['cabin', 'Cabin / room'], ['planter', 'Built-in planters'], ['fbench', 'Fixed seating'], ['jacuzzi', 'Pool / jacuzzi'], ['water', 'Water feature'], ['deck', 'Deck'], ['privacy', 'Privacy screen'], ['troom', 'Temp room (net / PVC)']], HAVE_T = HAVE.filter(z => z[0] !== 'troom');   // 284 (owner): a temp room is set on the roof plan, not asked here   // 278: a temp room = a roof block
const FLOOR0 = [['cement', 'Cement / PCC', 'raw, plastered'], ['tiles', 'Tiles', 'ceramic / vitrified'], ['kota', 'Kota stone', 'grey-green stone slabs'], ['marble', 'Marble', 'white, polished'], ['granite', 'Granite', 'dark, polished']];
const isDecor = o => !!(o && !o.old && DECOR.has(o.cat));
const DECOR = new Set(['sofa', 'swing', 'dining', 'chair', 'table', 'stool', 'firepit', 'sculpture', 'jacuzzi', 'umbrella', 'lights', 'planter', 'plant']);
// 245: four floor looks (owner) — the tiles, grass and patterned 'rugs' they lay
const FLOORS = [['garden', 'Garden walk', 'Soft grass with stepping stones, a Moroccan-tile patch where you sit, plain tiles around'], ['courtyard', 'Moroccan courtyard', 'Plain tiles with Moroccan pattern under every seating area, like rugs'],
  ['greek', 'Greek terrace', 'Cream terrazzo-look floor with a sage border — calm and airy'], ['geometric', 'Modern geometric', 'Plain tiles laid in a pattern — two-tone checks with a dark border']];
const THEME_T = { modern: ['Modern', 'grey'], natural: ['Natural', 'stone'], moroccan: ['Moroccan', 'moroccan'], tropical: ['Tropical', 'terracotta'] };
const CAB_USE = ['Lounge', 'WFH office', 'Gym', 'Bedroom', 'Guest room', 'Home theatre', 'Yoga studio', 'Kids\' play', 'Bar lounge', 'Store room'];
let SUEL = null;
function suNeed() { return S.step === 1 && (S.site.kind === 'terrace' || S.site.kind === 'ground') && !(S.su && S.su.done) && (!!(S.su && S.su.left) || !S.items.some(o => o && !o.old && !o.att && o.mode !== 'tank' && o.mode !== 'par')); }   // 292 (owner: the phone still showed the old Add / Pick): an old "Skip" (bskip) no longer keeps a terrace with nothing on it in the old flow   // 267: left mid-way → opens again where it was left
function lawnWords(h) { return h.replace(/stairs room, parapet and the rest/g, 'boundary wall and the rest').replace(/([Oo]n|[Tt]he|[Yy]our) roof\b/g, (m, w) => w + ' lawn').replace(/ terrace\b(?![-_])/g, ' lawn').replace(/Terrace\b(?![-_ ]\/)/g, 'Lawn').replace(/parapets?\b/g, 'boundary wall'); }
function suOpen(q) { if (S.site.kind === 'ground' && (S.site.blocks || []).length && !(S.su && S.su.q)) S.site.blocks = [];   // 293: a lawn has no stairs room / lift / shafts — the setup asks only what applies
  S.su = Object.assign({ q: 0, pg: '5-8', cs: '3-4', north: '', turf: null, green: 'balanced', light: 'soft', stairs: 'keep', roomRef: null, cab: [], theme: 'natural', walls: 'paint', tankHas: null, tankScr: true, shaft: 'keep', have: {}, rm: {}, floor0: 'cement', pipes: null, pipeScr: true }, S.su || {}); if (q != null) S.su.q = q; S.su.on = true; fl0Show();
  if (!SUEL) { SUEL = document.createElement('div'); SUEL.className = 'pl-su'; EL.appendChild(SUEL); SUEL.addEventListener('click', suClick); SUEL.addEventListener('toggle', e => { const d = e.target; if (d && d.dataset && d.dataset.sd && S.su && Date.now() - (S._suPT || 0) > 400) (S.su.selOpen = S.su.selOpen || {})[d.dataset.sd] = d.open; }, true); SUEL.addEventListener('pointerdown', suDown); SUEL.addEventListener('wheel', suWheel, { passive: false }); SUEL.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('.pl-su2d')) e.preventDefault(); }); SUEL.addEventListener('pointermove', suMove); SUEL.addEventListener('pointerup', suUp); SUEL.addEventListener('pointercancel', suCancel); SUEL.addEventListener('touchmove', e => { if (SUD && SUD.drag) e.preventDefault(); }, { passive: false }); }
  try { splitPar(); } catch (e) {} SUEL.style.display = 'block'; suPaint(); }
function suClose() { if (SUEL) SUEL.style.display = 'none'; if (S.su) { S.su.on = false; S.su.rev = false; } draw(false); setTimeout(() => { try { S3.resize(); S3.home(); } catch (e) {} }, 60); }
function suSkip(q) { const B = S.bsel || {}; if (q === 'remove') return !suRemList().length;
  if (q === 'mood') { if (!Object.keys(S.bsel || {}).length) S.bsel = { feature: 1 }; return true; }   // 302 (owner): no 'What is it for' — the customer picks the elements straight away
  if ((q === 'base' || q === 'b3d') && !(S.su && S.su.rev && q === 'base') && !rmAny()) return true;   // 284: nothing taken down → the base is the roof as it stands
  if (q === 'seats' || q === 'floor' || q === 'roofx') return true;   // 278 (owner): sizes on the 2D plan; the floor is the theme + floor layout; stairs room / shafts asked in 'What is already there'
  if (S.su && S.su.rev && !['asbuilt', 'base', 'eplan', 'plan', 'theme', 'flay', 'prop'].includes(q)) return true;   // 278 (owner): back from 'Change the layout' — only the 2D plans, the answers stay
  if (q === 'floor') return flAct() !== 'change';   // 258 (owner): the floor look only when the floor is to be changed (273)
  if (q === 'sofa' && !B.sofa) return true;
  if (q === 'roofx' && !((S.su.wantX || {}).mst || (S.su.wantX || {}).shaft)) return true;
  if (q === 'ftr') return true;   // 284 (owner): the feature wall's design comes with the theme
  if (q === 'green' || q === 'lights') { const su = S.su || {}; if (!su.green) su.green = 'balanced'; if (!su.light) su.light = 'soft'; return true; }   // 291 (owner): plants and lights are set by the theme (themeApply), not asked
  if ((q === 'fbs' && !B.fbench) || (q === 'wtr' && !B.water) || (q === 'gfw' && !B.graffiti)) return true;
  return (q === 'cabin' && !B.cabin) || (q === 'bar' && !B.bar) || (q === 'seats' && !B.cabin && !B.pergola); }
function suStep(d) { const su = S.su; let q = su.q + d; while (q > 0 && q < SUQ.length - 1 && suSkip(SUQ[q])) q += d; su.q = Math.max(0, Math.min(SUQ.length - 1, q)); }
const CAB_GLZ = [['solid', 'Solid', 'Porta cabin, windows'], ['mostly', 'Mostly glass', 'Glass front, solid sides'], ['glass', 'All glass', 'Glass house']], CAB_SKU = { solid: /PORTA/, mostly: /HYBRID/, glass: /GLASS/ }, CAB_ROT = { front: 0, left: 90, back: 180, right: 270 };
function prodName(sk, d) { return ((PR()[sk] || {}).n || d || '').replace(/ —.*$/, ''); }   // 256: outside compose (it has its own PR = pergola rects)
function cabSkuFor(g) { const re = CAB_SKU[g] || CAB_SKU.mostly; return cabinSkus().find(s => re.test(s) && !/-TRI?$/.test(s)) || cabinSkus().find(s => re.test(s)) || null; }
function suSofa() { const su = S.su, n = (S.bsel || {}).sofa || 0; su.sofa = (su.sofa || []).slice(0, n); while (su.sofa.length < n) su.sofa.push(['5']); return su.sofa; }
function suCab() { const su = S.su, n = (S.bsel || {}).cabin || 0; su.cab = (su.cab || []).slice(0, n); while (su.cab.length < n) su.cab.push({ use: [], pantry: false, wash: false }); return su.cab; }
function suBars() { const su = S.su, n = (S.bsel || {}).bar || 0; su.bars = (su.bars || []).slice(0, n); while (su.bars.length < n) su.bars.push('straight'); return su.bars; }
const suArr = (key, n, dflt) => { const su = S.su; su[key] = (su[key] || []).slice(0, n); while (su[key].length < n) su[key].push(dflt); return su[key]; };   // 247: one answer per thing
const WSZ = { 'WW-ARCH': [10, 1.9], 'WW-BUBB': [10, 1.9], 'WW-DUO': [10, 3.4], 'WW-GRAN': [10, 1.9], 'WW-GRNF': [10, 1.9], 'WW-MIRR': [10, 1.9], 'WW-RUN': [10, 1.9], 'WW-SPIL': [10, 1.9], 'WW-SPOUT': [10, 1.9], 'WW-STEP': [10, 2.2], 'WW-TILT': [10, 2.2], 'WC-BROAD': [10, 2.4], 'WC-ROW5': [10, 2.4], 'WC-TRIPLE': [10, 2.4], 'WC-TWIN': [10, 2.4], 'WC-XBROAD': [10, 2.4], 'TG-CUBE1': [4, 4], 'TG-LINE5': [10, 2], 'TG-QUINT': [6, 6], 'TG-TRIO': [8, 3] };
const WNAME = { 'WW-ARCH': 'Arch niche', 'WW-BUBB': 'Bubbler basin', 'WW-DUO': 'Glass, both sides', 'WW-GRAN': 'Weeping stone', 'WW-GRNF': 'Rain curtain + garden', 'WW-MIRR': 'Rain curtain', 'WW-RUN': 'Runnel', 'WW-SPIL': 'Sheet fall', 'WW-SPOUT': 'Triple spout', 'WW-STEP': 'Step cascade', 'WW-TILT': 'Tilted panels', 'WC-BROAD': 'Broad cascade', 'WC-ROW5': 'Five-nozzle row', 'WC-TRIPLE': 'Triple cascade', 'WC-TWIN': 'Twin cascade', 'WC-XBROAD': 'Extra-broad cascade', 'TG-CUBE1': 'Corten cube geyser', 'TG-LINE5': 'Five-geyser canal', 'TG-QUINT': 'Five-jet granite square', 'TG-TRIO': 'Triple geyser trough' };
const WGRP = [['WW', 'Water walls'], ['WC', 'Cascade walls'], ['TG', 'Geyser fountains']];
const prAll = () => { try { return PR() || {}; } catch (e) { return {}; } };   // compose() has its own local PR
const wCodeOf = v => WSZ[v] ? v : ({ cascade: 'WC-TRIPLE', wall: 'WW-SPIL', rain: 'WW-MIRR', geyser: 'TG-QUINT' })[v] || 'WW-SPIL';
const wMech = c => c.startsWith('TG') ? 'geyser' : /MIRR|GRNF/.test(c) ? 'rain' : c.startsWith('WC') ? 'cascade' : 'wall';
const WTYPES = [['cascade', 'Cascade', 'Steps of falling water'], ['wall', 'Sheet wall', 'A smooth sheet down a wall'], ['rain', 'Rain curtain', 'Fine drops from above'], ['geyser', 'Geyser jets', 'Jets popping up from the floor']];
const wType = v => { const c = wCodeOf(v); return c.startsWith('WC') ? 'cascade' : c.startsWith('TG') ? 'geyser' : c === 'WW-MIRR' ? 'rain' : 'wall'; };
const WSVG = (() => { const sv = b => `<svg viewBox="0 0 64 48" width="64" height="48" fill="none" stroke="#2E2E2E" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${b}</svg>`;
  return { cascade: sv('<path d="M6 10h16v10h14v10h16v10H6z"/><path d="M22 12c2 3 2 6 0 8M36 22c2 3 2 6 0 8M52 32c2 3 2 5 0 7" stroke="#3E8EC4"/>'),
    wall: sv('<rect x="14" y="6" width="36" height="30" rx="1"/><path d="M18 9v24M24 9v24M30 9v24M36 9v24M42 9v24M46 9v24" stroke="#3E8EC4" stroke-width="1"/><path d="M8 36h48v6H8z"/>'),
    rain: sv('<path d="M8 6h48v4H8z"/><path d="M14 13v4M14 22v4M22 15v4M22 25v4M30 12v4M30 21v4M38 15v4M38 25v4M46 13v4M46 22v4M52 16v4" stroke="#3E8EC4"/><path d="M6 38h52v4H6z"/>'),
    geyser: sv('<path d="M6 38h52v6H6z"/><path d="M14 36V22M26 36V12M38 36V12M50 36V22" stroke="#3E8EC4"/><path d="M11 24c1-3 5-3 6 0M23 14c1-3 5-3 6 0M35 14c1-3 5-3 6 0M47 24c1-3 5-3 6 0" stroke="#3E8EC4"/>') }; })();
function wApply(it, v) { const c = wCodeOf(v), z = WSZ[c]; Object.assign(it, { mech: wMech(c), wsku: 'MTO-' + c, w: z[0], d: z[1], label: WNAME[c] || 'Water feature' }); if ((PR() || {})['MTO-' + c]) it.pick = 'MTO-' + c; }
const WMECH = [['cascade', 'Cascade', 'water steps down stone tiers'], ['wall', 'Wall fall', 'a sheet of water down a wall'], ['rain', 'Rain curtain', 'fine streams from a top bar'], ['geyser', 'Geyser jets', 'jets rising from a pebble pool']];
const FDES = [['fluted', 'Fluted panel', 'fluted wall, warm cove light, a planter strip at its foot'], ['stone', 'Stone & creeper', 'stone cladding, wall washers, a climbing creeper'], ['slats', 'Backlit slats', 'wooden slats with a warm glow behind'], ['green', 'Half green', 'half living wall, half plaster with spot lights']];
function gWalls() {   // 247: walls graffiti can go on — the stairs room's faces (not its door) and the parapets that are not on the road
  const t = S.site, g = geo(), L = [], M = (t.blocks || []).find(b => b.type === 'mumty');
  if (M) [['left', 'left side'], ['right', 'right side'], ['back', 'back'], ['front', 'front']].forEach(([f, nm]) => { if (f === g.door) return; const len = f === 'left' || f === 'right' ? M.d : M.w; if (len < 5) return; L.push(['m:' + f, 'Stairs room — ' + nm]); });
  ['back', 'left', 'right'].filter(sd => !g.road.includes(sd)).forEach(sd => L.push(['p:' + sd, sd[0].toUpperCase() + sd.slice(1) + ' parapet wall'])); return L; }
const PGPPL = { '2-4': [15, 10], '5-8': [20, 15], '9-12': [30, 20], '12+': [32, 25] }, CABPPL = { '1-2': [15, 10], '3-4': [20, 15], '5-8': [30, 20], '9-12': [40, 20] };   // 268 (owner): Small 150 · Medium 300 · Large 600 · Extra large 800 sq ft
const SZT = ['Small', 'Medium', 'Large', 'Extra large'];
const PG_IDEAL = [['4 – 6 people', 'A swing or a 2-seater, a 4-seater dining, tea / reading corner'], ['8 – 12 people', 'Sofa lounge + coffee table, 6-seater dining, a bar corner, hot tub'], ['15 – 25 people', 'Family / party lounge, dining for 10, bar + seating, outdoor kitchen, yoga deck'], ['25 – 35 people', 'Events, lounge + dining + bar together, open-air movie nights, kids’ play area']];
const CAB_IDEAL = [['2 – 4 people', 'WFH office for 1–2, reading / music room, guest bedroom, gym corner, pantry'], ['4 – 8 people', 'Bedroom with washroom, office for 4, home gym, home theatre (6 seats), kids’ room'], ['8 – 15 people', '1 BHK setup, theatre + bar, games room with a pool table, gym + yoga, dining for 10'], ['15 – 20 people', '2 BHK setup, home theatre + bar lounge, pool table + games, office for 8–10, party hall']];
function pplTag(d, n) { return d ? `<small style="display:block;font-weight:400;font-size:11px;color:#8A8278">${SZT[n]} · ~${d[0] * d[1]} sq ft</small>` : ''; }
function szRows(pre, keys, map, ideal, cur) { return '<div class="pl-szt">' + keys.map((k, n) => { const d = map[k]; return `<button type="button" data-su="${pre}${k}" class="${cur === k ? 'on' : ''}"><span class="pl-szh"><b>${SZT[n]}</b><em>~${d[0] * d[1]} sq ft · ${d[0]}′ × ${d[1]}′</em><em>${ideal[n][0]}</em></span><small><b>Ideal for:</b> ${ideal[n][1]}</small></button>`; }).join('') + '</div>'; }
function suPgs() { const su = S.su, n = (S.bsel || {}).pergola || 0; su.pgs = (su.pgs || []).slice(0, n); while (su.pgs.length < n) su.pgs.push(su.pg || '5-8'); return su.pgs; }
// 246: what can be taken down — old things built on the roof, rooms / shafts / lift room, tiles on the walls, the floor
function suRemList() { const su = S.su || {}, L = [], hv = su.have || {}, t = S.site; HAVE.forEach(([k, tt]) => { if (hv[k] && k !== 'troom') L.push({ k: 'old_' + k, t: 'Existing ' + tt.toLowerCase() + (hv[k] > 1 ? ' (' + hv[k] + ')' : ''), ic: k }); });
  (t.blocks || []).concat(t.gone || []).forEach(b => { if (b.type === 'mumty' || b.type === 'ac') return; L.push({ k: 'blk_' + b.id, t: (b.pent ? 'Penthouse' : { room: 'Room', shaft: 'Shaft', lift: 'Lift room', troom: 'Temporary room (' + (b.mat === 'pvc' ? 'PVC sheet' : 'net') + ')' }[b.type] || b.type) + ' ' + Math.round(b.w) + ' × ' + Math.round(b.d) + ' ft', ic: b.type === 'room' || b.type === 'troom' ? 'room' : b.type }); });
  if (hv.pergola && su.pgDeck) L.push({ k: 'old_pgdeck', t: 'Deck under the existing pergola', ic: 'deck' });   // 265 (owner): everything that stands there now can be kept or taken down
  if (false) L.push({ k: 'tankscr', t: 'Screen round the water tanks', ic: 'privacy' });
  if (false) L.push({ k: 'shaftcov', t: 'Shaft cover (' + ((SMAT_NOW.find(z => z[0] === su.shaftNow) || [0, ''])[1]).toLowerCase() + ')', ic: 'shaft' });
  if (false) L.push({ k: 'mstair', t: ((MST.find(z => z[0] === su.mst.has) || [0, 'Stairs'])[1]) + ' to the stairs-room roof', ic: 'mumty' });
  if (false) L.push({ k: 'pipes', t: 'Open plumbing pipes (to be shifted / boxed)', ic: 'mumty' });
  if (false) L.push({ k: 'walltiles', t: 'Tiles on the walls', ic: 'brick' });   // 273: the floor is asked in 'What is already there' (keep / refurbish / change)
  return L; }
function suOld(keepNew) {   // 249: what is already built (and kept) placed once on the plan; placed again only when those answers change
  const su = S.su; suGone(false); if (su.oldPlaced && !su.oldDirty) return suGone(!befQ());
  suTroom(); const OB = {}; HAVE.forEach(([k]) => { const n = (su.have || {})[k]; if (n && k !== 'troom') OB[k] = n; });   // 284: everything that stands there (the take-down comes after)
  const isPD = o => o.old && o.cat === 'deck' && /under the pergola/.test(o.label || ''), mark = o => { o.old = true; o.label = 'Existing ' + (CAT[o.cat] ? CAT[o.cat].t.toLowerCase() : o.cat); };
  if (keepNew && su.oldPlaced) {   // 267 (owner): changed later — keep every existing thing where it was put; take off / add only the difference, into free spots round the layout
    const miss = {}; HAVE.forEach(([k]) => { const gs = []; S.items.forEach(o => { if (o.old && o.cat === k && !isPD(o)) { const g = o.grp ? 'g' + o.grp : o; if (!gs.includes(g)) gs.push(g); } });
      const n = OB[k] || 0; gs.slice(n).forEach(g => { S.items = S.items.filter(o => !(o.old && o.cat === k && (o.grp ? 'g' + o.grp : o) === g)); }); if (gs.length < n) miss[k] = n - gs.length; });
    if (Object.keys(miss).length) { const n0 = S.items.length; compose({ B: miss, phase: 'old', noPlants: false }); let np = 0; const add = S.items.splice(n0).filter(o => o.cat !== 'planter' || ++np <= (miss.planter || 0)); add.forEach(mark); S.items = add.concat(S.items); } }
  else { S.items = S.items.filter(o => !o.old || o.cat === 'mstair');   /* 302: the stairs to the roof are kept by suMst */
    if (Object.keys(OB).length) { const keep = S.items; S.items = []; compose({ B: OB, phase: 'old' }); S.items.forEach(mark); let np = 0; S.items = S.items.filter(o => o.cat !== 'planter' || ++np <= (OB.planter || 0)).concat(keep); } }
  if (!(su.pgDeck && OB.pergola)) S.items = S.items.filter(o => !isPD(o));
  else S.items.filter(o => o.old && o.cat === 'pergola').forEach(p => { if (!S.items.some(o => o.cat === 'deck' && Math.abs(o.x - p.x) < 0.7 && Math.abs(o.z - p.z) < 0.7)) S.items.push({ cat: 'deck', old: true, label: 'Existing deck (under the pergola)', x: p.x, z: p.z, w: p.w, d: p.d, rot: p.rot || 0, h: 0.5 }); });   // 265
  su.oldPlaced = true; su.oldDirty = false; suGone(!befQ()); save(); }
function suTroom() {   // 278 (owner): a temp room said in "Already built" = a roof block (moved on ✎ Roof: doors, AC, temp room)
  const t = S.site, su = S.su; if (t.kind !== 'terrace') return; t.blocks = t.blocks || []; const n = (su.have || {}).troom || 0, mine = t.blocks.filter(b => b.type === 'troom' && b.hv);
  mine.slice(n).forEach(b => t.blocks.splice(t.blocks.indexOf(b), 1));
  for (let k = mine.length; k < n; k++) { let r = null; try { r = (P2.freeRects(t, S.items, 6) || []).find(q => q.w >= 6 && q.d >= 6); } catch (e) {} const w = r ? Math.min(10, r.w) : 8, d = r ? Math.min(10, r.d) : 8;
    t.blocks.push({ id: 'tr' + Date.now().toString(36) + k, type: 'troom', hv: true, w, d, h: 8, x: r ? r.x : 1, z: r ? r.z : 1, mat: su.trMat || 'net', door: 'front' }); }
  t.blocks.forEach(b => { if (b.type === 'troom' && b.hv) b.mat = su.trMat || b.mat || 'net'; }); }
const BEFQ = ['have', 'existing', 'asbuilt', 'ab3d'];
function befQ() { const su = S.su; return !su || !su.on || BEFQ.includes(SUQ[su.q]) && !su.addK; }
function rmAny() { const rm = (S.su || {}).rm || {}; return Object.keys(rm).some(k => rm[k]); }
function suGone(on) {   // 284 (owner): the roof as it stood (before) or with the take-down applied (the base for the design) — what is taken down waits in site.goneIt / site.gone
  const t = S.site, su = S.su; if (!t || !su) return; const so = S.sel != null ? S.items[S.sel] : null;
  t.goneIt = t.goneIt || []; t.gone = t.gone || [];
  if (t.goneIt.length) { S.items = S.items.concat(t.goneIt); t.goneIt = []; }
  if (t.gone.length) { t.blocks = (t.blocks || []).concat(t.gone); t.gone = []; }
  if (on) { const rm = su.rm || {}, pd = o => o.cat === 'deck' && /under the pergola/.test(o.label || ''), out = o => o.old && (pd(o) ? rm.old_pgdeck || rm.old_pergola : rm['old_' + o.cat]);
    t.goneIt = S.items.filter(out); S.items = S.items.filter(o => !out(o)); suRemApply(); }
  S.sel = so ? (S.items.indexOf(so) >= 0 ? S.items.indexOf(so) : null) : null; }
function suExShow(before) {   // 285 (owner): what stands on the roof now — pipes, the shaft cover, stairs to the stairs-room roof, coping, the tank screen — drawn from the answers; the before view shows only what is there today
  const su = S.su, t = S.site; if (!su || t.kind !== 'terrace') return; try { exSync(); } catch (e) {}
  t.tankScreen = su.tankHas === true && (before || !su.tankScr) ? 'existing' : '';
  S.items = S.items.filter(o => !o.pipe); try { suPipes(); suShaftCov(); suMst(); suWorks(); } catch (e) {}
  if (!before) return; S.items = S.items.filter(o => !(o.pipe || o.cat === 'shaftcover' && !o.old || (o.cat === 'mstair' && !o.old) || o.cat === 'works'));   // 302: the stairs that stand there now stay on the 'as it stands' plan — pick, move, size them there
  if (t.pipes) t.pipes.cover = false; if (t.mstair && t.mstair.state === 'new') { const m = su.mst || {}; if (m.has && m.has !== 'none') { t.mstair = { type: m.has, side: m.side || mstSide(), state: 'old' }; ['a0', 'a', 'run', 'w', 'rev'].forEach(k => { if (m[k] != null) t.mstair[k] = m[k]; }); const G = mstGeom(t, (t.blocks || []).find(b => b.type === 'mumty')); if (G) S.items.push({ cat: 'mstair', mode: 'mst', old: true, label: 'Existing: ' + (MST.find(z => z[0] === m.has) || [0, 'Staircase'])[1] + ' to the stairs-room roof', rot: 0, x: G.foot.x, z: G.foot.z, w: G.foot.w, d: G.foot.d }); } else delete t.mstair; }
  if (t.coping && t.coping.state === 'new') { const c = su.cop || {}; if (c.has && c.has !== 'none') t.coping = { mat: c.has, state: 'old' }; else delete t.coping; }
  if (su.tankHas === true) t.tankScreen = 'existing'; else S.items = S.items.filter(o => !(o.mode === 'tank' && !o.old)); }
function suSnap() { const t = S.site; return { blocks: JSON.parse(JSON.stringify(t.blocks || [])), items: JSON.parse(JSON.stringify(S.items.filter(o => o.old))), at: Date.now() }; }   // 284: saved with the plan — su.before / su.base
function suRemApply() {   // blocks marked 'take down' leave the roof (kept aside in site.gone so 'Keep' brings them back)
  const t = S.site, su = S.su; if (t.kind !== 'terrace') return; t.gone = t.gone || []; const all = t.blocks.concat(t.gone);
  t.blocks = all.filter(b => !su.rm['blk_' + b.id]); t.gone = all.filter(b => su.rm['blk_' + b.id]); }
function shV(b) { return b.h != null && b.h !== '' && isFinite(+b.h) ? +b.h : 3; }   // 252: a shaft can be flush (0) or 6 in high
function shH(b) { const v = shV(b); return v === 0 ? '0 in (flush)' : v < 1 ? Math.round(v * 12) + ' in' : v + ' ft'; }
function pOpen(M, f) { const t = S.site, s = 1, r = f === 'left' ? { x: M.x - s, z: M.z, w: s, d: M.d } : f === 'right' ? { x: M.x + M.w, z: M.z, w: s, d: M.d } : f === 'back' ? { x: M.x, z: M.z - s, w: M.w, d: s } : { x: M.x, z: M.z + M.d, w: M.w, d: s };   // 253: a face with open terrace in front (not a wall of the next room)
  return inside(r) && !(t.blocks || []).some(b => b !== M && b.type !== 'ac' && hit(r, b)); }
function pFaces() { const door = geo().door, M = (S.site.blocks || []).find(b => b.type === 'mumty'), OPP = { left: 'right', right: 'left', back: 'front', front: 'back' };   // 266 (owner): door side / back side / front, as seen from the door
  return ['left', 'right', 'back', 'front'].map(f => [f, f === door ? 'Door side' : f === OPP[door] ? 'Back side (opposite the door)' : f === 'front' ? 'Front (towards the road)' : f === 'back' ? 'Side away from the road' : 'Side wall (' + f + ')'])
    .sort((a, b) => (a[0] === door ? 0 : a[1].startsWith('Back side') ? 1 : 2) - (b[0] === door ? 0 : b[1].startsWith('Back side') ? 1 : 2)); }
function pFace() { const su = S.su; if (su.pipeFace) return su.pipeFace; return suPipes(true) || ''; }
function suPipes(dry) {   // 246: the stairs-room face with the open pipes (not the door, facing the terrace) + an openable cover in front if asked
  const t = S.site, su = S.su, M = (t.blocks || []).find(b => b.type === 'mumty'), keepP = t.pipes; t.pipes = null; if (!M || !su.pipes || (!dry && (su.rm || {}).pipes)) { if (dry) t.pipes = keepP; return; }
  const door = geo().door, faces = [['left', M.x, M.z + M.d / 2], ['right', M.x + M.w, M.z + M.d / 2], ['back', M.x + M.w / 2, M.z], ['front', M.x + M.w / 2, M.z + M.d]].filter(f => f[0] !== door && pOpen(M, f[0]) && inside({ x: f[1] - 1, z: f[2] - 1, w: 2, d: 2 }) && (f[0] === 'left' ? M.x > P0() + 2 : f[0] === 'right' ? M.x + M.w < t.pw - P0() - 2 : f[0] === 'back' ? M.z > P0() + 2 : M.z + M.d < t.pd - P0() - 2));
  const all = [['left', M.x, M.z + M.d / 2], ['right', M.x + M.w, M.z + M.d / 2], ['back', M.x + M.w / 2, M.z], ['front', M.x + M.w / 2, M.z + M.d]], f = (su.pipeFace && all.find(x => x[0] === su.pipeFace)) || faces.sort((a, b) => Math.hypot(a[1] - t.pw / 2, a[2] - t.pd / 2) - Math.hypot(b[1] - t.pw / 2, b[2] - t.pd / 2))[0]; if (dry) { t.pipes = keepP; return f ? f[0] : ''; } if (!f) return; const dr = geo().door, L0 = f[0] === 'left' || f[0] === 'right' ? M.d : M.w, off = f[0] === dr ? Math.max(-(L0 / 2 - 0.6), Math.min(L0 / 2 - 0.6, ({ front: -1, back: 1, left: -1, right: 1 }[f[0]]) * (su.pipeLR === 'right' ? -1 : 1) * (Math.min(3.2, L0 - 1) / 2 + 0.9))) : 0;   // 266 (owner): never over the door — left / right of it
  t.pipes = { face: f[0], cover: !!su.pipeScr, off };
  if (!su.pipeScr) return; const pm = su.pipeMat || 'cement', w = 3, d = 0.5, it = { cat: 'privacy', label: (PMAT.find(z => z[0] === pm) || [0, 0, 'Pipe cover'])[2], pmat: pm, pipe: true, h: 8, w, d, rot: { left: 90, right: 270, back: 180, front: 0 }[f[0]] };
  if (f[0] === 'left') { it.x = M.x - d; it.z = M.z + M.d / 2 - w / 2; } else if (f[0] === 'right') { it.x = M.x + M.w; it.z = M.z + M.d / 2 - w / 2; } else if (f[0] === 'back') { it.x = M.x + M.w / 2 - w / 2; it.z = M.z - d; } else { it.x = M.x + M.w / 2 - w / 2; it.z = M.z + M.d; }
  if (it.rot % 180) { it.x = f[0] === 'left' ? M.x - d : M.x + M.w; it.z = M.z + M.d / 2 - w / 2; } if (off) { if (f[0] === 'left' || f[0] === 'right') it.z += off; else it.x += off; } S.items.push(it); }
const FL0T = { tiles: 'plain', kota: 'kota', marble: 'marble', granite: 'granite', cement: 'cement' };
function fl0Tile() { const su = S.su || {}; return FL0T[su.floor0] || 'cement'; }   // 273: the floor as it is now (a change shows once the new look is picked)
function fl0Show() { const su = S.su; if (!su || !su.floor0 || su.thm || (su.flr && su.flr !== 'keep')) return; S.site.floor = Object.assign({}, S.site.floor || {}, { tile: fl0Tile() }); }   // 272 (owner): the floor that is there now, from the first plan / 3D
function suSiteApply() { const su = S.su;
  S.site.floor = { tile: su.flr === 'keep' ? fl0Tile() : su.flr === 'greek' ? 'terrazzo' : su.flr === 'geometric' ? 'checker' : (THEME_T[su.theme] || THEME_T.natural)[1], pebble: 'near', preset: su.flr || 'garden', border: su.flr === 'greek' || su.flr === 'geometric' }; S.site.light = su.light === 'none' ? '' : su.light; S.site.refurb = { stairs: su.stairs, room: su.roomRef }; S.site.wallFin = su.walls === 'tiles' && su.rm.walltiles ? 'paint' : su.walls || 'none'; S.site.floor0 = su.rm.floor0 ? 'cement' : su.floor0 || 'cement'; S.site.remove = Object.keys(su.rm || {}).filter(k => su.rm[k]); S.site.wallTile = su.walls === 'tiles' ? Object.assign({ k: 'brick', c: 'red' }, su.wtile || {}) : undefined; S.site.tankScreen = su.tankHas === true && !su.tankScr && !(su.rm || {}).tankscr ? 'existing' : ''; if (su.thm) try { themeFloor(su.thm); } catch (e) {} }   // 274: a picked theme keeps its floor
function suShaftCov() { exSync(); const su = S.su;
  S.items = S.items.filter(o => o.cat !== 'shaftcover');
  if (su.shaft === 'new' || su.shaft === 'change') (S.site.blocks || []).filter(b => b.type === 'shaft').forEach(b => S.items.push({ cat: 'shaftcover', mode: 'shaft', smat: su.shaftNew || 'poly', label: 'Shaft cover — ' + (SMAT.find(z => z[0] === (su.shaftNew || 'poly')) || [0, 'polycarbonate'])[1].replace(/ \(MS frame\)/, '').toLowerCase() + (su.shaftMS === false ? ' (on the old frame)' : ' + new MS frame'), x: b.x, z: b.z, w: b.w, d: b.d, h: shTop(b) + 0.4, rot: 0 }));
  else if (su.shaft === 'keep' && su.shaftNow && su.shaftNow !== 'none' && !(su.rm || {}).shaftcov) (S.site.blocks || []).filter(b => b.type === 'shaft').forEach(b => S.items.push({ cat: 'shaftcover', mode: 'shaft', old: true, smat: su.shaftNow, label: 'Existing shaft cover', x: b.x, z: b.z, w: b.w, d: b.d, h: shTop(b) + 0.4, rot: 0 }));   // 262: what is on it now, drawn (not priced)
}
// 267 (owner): going back to change an answer never throws the layout away — only what changed is updated (the rest stays where it was put); "↺ Set up again" still starts fresh
const NOMERGE = new Set(['privacy', 'accover', 'shaftcover', 'pathway', 'turf', 'mstair', 'works', 'lights', 'deck', 'planter', 'plant']);
function pfOf(k, n) { const su = S.su; return JSON.stringify(k === 'cabin' ? [(su.cab || [])[n] || null, su.cs || null] : k === 'fbench' ? [(su.fbs || [])[n] || null, (su.fbp || [])[n] || null] : ((su[(PREFK[k] || [])[0]] || [])[n] || null)); }
function suFill() { const B = S.bsel || {}; try { suCab(); suBars(); suPgs(); suSofa(); suArr('fbs', B.fbench || 0, 'L'); suArr('fbp', B.fbench || 0, 'none'); suArr('wm', B.water || 0, 'cascade'); suArr('fd', B.feature || 0, 'fluted'); } catch (e) {} }
function pfAll() { suFill(); const o = {}; Object.keys(PREFK).forEach(k => { o[k] = grpsOf(k).map((g, n) => pfOf(k, n)); }); return o; }
function fitNew() { let mv = 0, gone = 0; for (let i = 0; i < S.items.length; i++) { const it = S.items[i]; if (it.old || att(it) || !clashes(it, i)) continue; const k = JSON.stringify(it); if (settle(it, i, [it.x, it.z])) { if (JSON.stringify(it) !== k) mv++; } else { S.items.splice(i, 1); i--; gone++; } } return [mv, gone]; }
function mergeCat(k, n, phase) { const gs = grpsOf(k); let ch = 0;
  for (let m = gs.length - 1; m >= n; m--) { const G = grpOf(gs[m].ix[0]); S.items = S.items.filter((o, j) => !G.includes(j)); ch++; }
  suFill(); const pf = (S.su.pf || {})[k] || []; for (let m = 0; m < Math.min(gs.length, n); m++) if (PREFK[k] && pf[m] != null && pf[m] !== pfOf(k, m)) { editApply(k, m); ch++; }
  const have = grpsOf(k).length; if (have < n) { if (ADDQ[k] || k === 'sofa') for (let m = have; m < n; m++) { const ok = addWith(k, m); if (ok && k === 'pergola' && (S.bsel || {}).deck) { const p = S.items[S.sel]; if (p) S.items.push({ cat: 'deck', x: p.x, z: p.z, w: p.w, d: p.d, rot: p.rot || 0, h: 0.5, label: 'Decking' }); } ch++; }
    else { compose({ B: { [k]: n - have }, phase, noPlants: true }); ch++; } }
  S.sel = null; S.suMv = false; return ch; }
function suMergeEl(refit) { exSync(); const su = S.su, B = S.bsel || {}; S.sel = null; let ch = 0;
  if (su.oldDirty) { suOld(true); ch++; } suSiteApply();
  const cats = new Set(Object.keys(B).concat(S.items.filter(o => !o.old).map(o => o.cat)).filter(k => CAT[k] && !DECOR.has(k) && !NOMERGE.has(k)));
  cats.forEach(k => { ch += mergeCat(k, B[k] || 0, 'el'); });
  su.turf = false; const turfOn = S.items.some(o => o.cat === 'turf' && !o.old); if (su.turf === true && !turfOn) { compose({ B: { turf: 1, pathway: 1 }, phase: 'el', noPlants: true }); ch++; } else if (su.turf === false && turfOn) { S.items = S.items.filter(o => o.old || (o.cat !== 'turf' && !(o.cat === 'pathway' && o.onTurf))); ch++; }
  S.items = S.items.filter(o => !o.pipe); suPipes();
  if (su.tankScr && mumtyTanks()) { if (!S.items.some(o => o.mode === 'tank')) { const it2 = { cat: 'privacy', mode: 'tank', label: 'Screen on the stairs room', h: 4.5, w: 0, d: 0.3, x: 0, z: 0, rot: 0 }; S.items.push(it2); attach(it2, S.items.length - 1); if (!it2.w) S.items.pop(); } } else S.items = S.items.filter(o => !(o.mode === 'tank' && !o.old));
  suShaftCov(); try { suMst(); suWorks(); } catch (e) {}
  S.items.forEach((o, i) => { if (att(o)) try { attach(o, i); } catch (e) {} });
  const [mv, gone] = fitNew(); deckLevels(); cabFixAll(); su.dirty = false; su.elSig = suSig(); su.pf = pfAll();
  if (su.decorDone) { decorFit(); su.dSig = suSig(); } save(); draw(true);
  return 'Your layout is kept — ' + (ch ? 'only what you changed was updated' : 'nothing to change') + (mv ? ` · ${mv} moved to fit` : '') + (gone ? ` · ${gone} taken off (no room)` : ''); }
function suMergeDec() { const su = S.su, B = S.bsel || {}; S.sel = null; S.site.light = su.light === 'none' ? '' : su.light; let ch = 0;
  const cats = new Set(Object.keys(B).concat(S.items.filter(o => !o.old).map(o => o.cat)).filter(k => CAT[k] && DECOR.has(k) && !NOMERGE.has(k)));
  cats.forEach(k => { ch += mergeCat(k, B[k] || 0, 'decor'); });
  if (su.pfGreen !== undefined && su.pfGreen !== su.green) { S.items = S.items.filter(o => o.old || !['planter', 'plant'].includes(o.cat) || o.pick || o.cfgId); compose({ B: {}, phase: 'decor' }); su.pfGreen = su.green; ch++; }
  const [mv, gone] = fitNew(); floorRugs(); su.ddirty = false; su.decorDone = true; su.dSig = suSig(); save(); draw(true);
  return 'Your layout is kept — ' + (ch ? 'only what you changed was updated' : 'nothing to change') + (mv ? ` · ${mv} moved to fit` : '') + (gone ? ` · ${gone} taken off (no room)` : ''); }
function hasLay() { return S.su && S.su.elSig && S.items.some(o => !o.old); }
function suRefresh(q2) {   // reaching a 2D plan: keep the layout, update only what changed (a first visit still sets it up)
  const su = S.su; let msg = '';
  if (q2 !== 'eplan' && q2 !== 'plan') return false;
  if (suChE()) { if (!hasLay()) { suMagic(q2 === 'plan' ? 'all' : 'el'); return true; } msg = suMergeEl(); }
  if (q2 === 'plan' && suChD()) { if (!su.decorDone) { suMagic('decor'); return true; } msg = suMergeDec(); }
  if (msg) setTimeout(() => suToast(msg), 50); return false; }
function suCompose(ph) { exSync();   // a fresh setup from the answers — 245: ph 'el' = round 2 (the big pieces), 'decor' = round 3 on the kept layout, 'all' / none = both
  ph = ph || 'all'; if (ph === 'all') { suCompose('el'); return suCompose('decor'); }
  const su = S.su; S.sel = null; S.bsel = Object.assign({}, S.bsel || {}); delete S.bsel.pathway; S.bsel.feature = S.bsel.feature || 1; delete S.bsel.planter;
  if (ph === 'decor') { const keep = S.items.filter(o => !DECOR.has(o.cat) || o.old); S.items = keep; const BD = {}; Object.keys(S.bsel).forEach(k => { if (DECOR.has(k) && k !== 'planter') BD[k] = S.bsel[k]; });
    if (!su.flr) su.flr = 'keep';
    let lay = null; try { lay = (TM.layout ? TM.layout(S.site, 14) : [])[0] || null; } catch (e) {} S.site.light = su.light === 'none' ? '' : su.light;
    compose({ lay, B: BD, phase: 'decor' }); floorRugs(); su.ddirty = false; su.decorDone = true; su.dSig = suSig(); su.pfGreen = su.green; su.elPos = suElPos(); S.bskip = true; ev('plan_build', { ref: 'decor', n: S.items.length }); draw(true); return; }
  S.items = S.items.filter(o => o.old); su.decorDone = false;   // 249: the existing things stay where they were put
  delete S.bsel.turf; su.turf = false;   // 268 (owner): no grass / pathway for now, at any stage
  suSiteApply();
  // 241 (owner): ONE setup — the closest LifeWall layout that has the wanted things, then the rules
  const B = S.bsel, want = k => ({ cabin: B.cabin, pergola: B.pergola, turf: B.turf, deck: B.deck, seating: B.sofa || B.fbench || B.dining, fbench: B.fbench || B.sofa, bar: B.bar, counter: B.counter || B.bar, jacuzzi: B.jacuzzi, water: B.water })[k];
  let lay = null; try { lay = (TM.layout ? TM.layout(S.site, 14) : []).map((L, r) => ({ L, n: L.els.filter(e => e.length > 3 && want(e[0])).length, r })).filter(z => z.n).sort((a, b) => b.n - a.n || a.r - b.r).map(z => z.L)[0] || null; } catch (e) { lay = null; }
  const BE = {}; Object.keys(S.bsel).forEach(k => { if (!DECOR.has(k)) BE[k] = S.bsel[k]; });
  suOld(); S.items = S.items.filter(o => o.old);   // 246 / 249: what is already built (and kept) stands first — where the customer put it on 'as it stands'
  suPipes(); compose(Object.assign({ B: BE, phase: 'el' }, lay ? { lay } : {}));
  if (su.tankScr && mumtyTanks() && !S.items.some(o => o.mode === 'tank')) { const it2 = { cat: 'privacy', mode: 'tank', label: 'Screen on the stairs room', h: 4.5, w: 0, d: 0.3, x: 0, z: 0, rot: 0 }; S.items.push(it2); attach(it2, S.items.length - 1); if (!it2.w) S.items.pop(); }
  suShaftCov();
  try { suMst(); suWorks(); } catch (e) {}
  try { parResplit(); } catch (e) {}
  deckLevels(); su.opts = null; su.dirty = false; su.elSig = suSig(); su.dSig = null; su.pf = pfAll(); floorRugs();
 S.bskip = true; ev('plan_build', { ref: S.bth || 'own', n: S.items.length }); draw(true); }
function crOn() { const su = S.su; if (!su) return S.items.some(o => o.cat === 'planter' || o.cat === 'plant');   // 278 (owner): creepers on a pergola only once plants are added
  return !!(su.green && su.green !== 'none' && (su.decorDone || su.done || su.q >= SUQ.indexOf('green'))); }
let CMPT = null;
function cmpTick() {   // 278 (owner): a compass on the 3D once north is known — turns with the view
  const el = document.getElementById('plCmp'); if (!el) return; const v = P2.NORTHV[(S && S.su || {}).north];
  if (!v || !EL || EL.style.display === 'none') { el.style.display = 'none'; return; } el.style.display = 'flex';
  const a = Math.atan2(v[0], -v[1]) + (S3.azimuth ? S3.azimuth() : 0), k = Math.round(a * 100); if (el._a === k) return; el._a = k;
  const x = 23 + Math.sin(a) * 15, y = 23 - Math.cos(a) * 15, d = a * 180 / Math.PI;
  el.innerHTML = `<svg viewBox="0 0 46 46" width="46" height="46"><g transform="rotate(${d.toFixed(1)} 23 23)"><path d="M23 9 L27.5 23 L23 21 L18.5 23 Z" fill="#C26445"/><path d="M23 37 L27.5 23 L23 25 L18.5 23 Z" fill="#B9AE9C"/></g><text x="${x.toFixed(1)}" y="${(y + 3.5).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="800" font-family="Inter,sans-serif" fill="#2E2E2E">N</text></svg>`; }
function suPlan() { const su = S.su, t = S.site, rd = ['front'].concat(t.road_back ? ['back'] : [], t.corner ? [t.corner] : []).filter(x => t.road_front !== false || x !== 'front');
  const el = SUQ[su.q] === 'eplan';   // 266 (owner): round 2 shows only the big pieces
  return P2.svg(t, { items: el ? S.items.map(o => isDecor(o) ? null : o) : S.items, measure: !!su.meas, sel: S.sel != null ? { k: 'it', i: S.sel } : null, grp: S.sel != null ? grpOf(S.sel) : null, wl: S.sel != null && S.suSz ? S.sel : null, wlab: S.sel != null && S.suSz && S.items[S.sel] && S.items[S.sel].cat === 'cabin' ? (L => ['L ' + (+L.L || 12) + "'", 'W ' + (+L.W || 10) + "'"])(cabinLay(S.items[S.sel])) : null, north: su.north, road: rd }); }
function suPaint() { try { fl0Show(); } catch (e) {} if (S.magic) return; try { const su0 = S.su; if (su0 && su0.on && SUQ.indexOf(SUQ[su0.q]) <= SUQ.indexOf('b3d')) { if (su0.oldDirty) suOld(su0.oldPlaced); suExShow(befQ()); } suGone(!befQ()); } catch (e) { console.error(e); }
  const su = S.su, q = SUQ[su.q], B = S.bsel || {}, terr = S.site.kind === 'terrace', chip = (k, on, tx) => `<button type="button" data-su="${k}" class="${on ? 'on' : ''}" aria-pressed="${!!on}">${tx}</button>`;
  const big = (k, on, e, t, sm) => chip(k, on, `<i>${e}</i><b>${t}</b>${sm ? `<small>${sm}</small>` : ''}`), next = (tx, dis) => `<div class="pl-subar"><button type="button" class="pl-go" data-su="next"${dis ? ' disabled' : ''}>${su.addK ? 'Add it to my plan →' : su.edK ? 'Save changes ✓' : tx || 'Next →'}</button></div>`;
  const P2Q = ['asbuilt', 'base', 'eplan', 'plan'].includes(q) && !su.addK && !su.edK;
  let h = `<div class="pl-suh"><button type="button" data-su="back" aria-label="Back">←</button><b>Set up your terrace</b>${S.sh ? '' : `<button type="button" class="pl-sunm" data-su="ren" title="Rename this plan">${esc(S.pname || 'New plan')} ✎</button>`}<button type="button" data-su="x" aria-label="Close">✕</button></div><div class="pl-sub2 pl-full">`;
  if (su.edK) h += `<div class="pl-msg" style="margin:10px 0 0">${su.edK[0] === '@' ? 'Change your answer, then save.' : `Changing ${esc(((CAT[su.edK] || {}).t || su.edK).toLowerCase())} ${(+su.edN || 0) + 1} — only its answers are used. ← cancels.`}</div>`;   // 266
  if (su.addK) h += `<div class="pl-msg" style="margin:10px 0 0">Adding a new ${esc((CAT[su.addK] || {}).t || su.addK).toLowerCase()} — answer for the <b>last one</b> in the list, then add it. ← goes back without adding.</div>`;   // 260
  h += '<!--q-->';
  if (q === 'mood') h += '<h2>What is it for?</h2><div class="pl-sumood">' + SETUPS.filter(x => !x.lawn || !terr).map(x => `<button type="button" data-su="mood:${x.k}" class="${S.bth === x.k ? 'on' : ''}"><i>${x.e}</i><b>${esc(x.t)}</b></button>`).join('') + `<button type="button" data-su="mood:"><i>${P2.ico('choose')}</i><b>I'll choose</b></button></div>` + (Object.keys(B).length ? '<p class="pl-sub" style="margin-top:10px">Picking another mood starts the list again.</p>' + next('Keep my picks →') : '');   // 255: coming back here doesn't force a new mood
  else if (q === 'want') { const LY = S.site && S.site.layout;   // 243: what the architect proposed on the customer's own drawing comes ticked
    if (LY && !su.layTicked) { su.layTicked = true; const M = { seating: 'sofa', planter: null, turf: null }; (LY.proposed || []).forEach(k => { const c = k in M ? M[k] : k; if (k === 'turf') su.turf = true; if (c && CAT[c]) S.bsel[c] = S.bsel[c] || 1; }); if (LY.north && !su.north) su.north = LY.north; } const cats = CATS.filter(c => (!c.lawn || !terr) && (designs(c).length || c.always) && (c.k !== 'accover' || terr) && !['railing', 'gate', 'pathway', 'turf', 'lights', 'planter', 'shaftcover', 'bench', 'mstair', 'works'].includes(c.k) && !DECOR.has(c.k) && (c.k !== 'rack' || B.bar));   // 245: round 2 = the big pieces only (bench = fixed seating)
    h += (LY && (LY.proposed || []).length ? '<p class="pl-sub" style="margin:0 0 6px">📄 Ticked from your drawing — change anything.</p>' : '') + '<h2>What do you want?</h2><div class="pl-els pl-els2">' + cats.map(c => { const v = B[c.k] || 0; return `<div class="pl-elw"><button type="button" data-su="bel:${c.k}" class="${v ? 'on' : ''}"><i>${c.e}</i><b>${esc(c.t)}</b>${v ? '<em>✓</em>' : ''}</button>${v ? `<div class="pl-cnt"><button type="button" data-su="bcnt:${c.k}:-1" aria-label="One less">−</button><b>${v}</b><button type="button" data-su="bcnt:${c.k}:1" aria-label="One more">+</button></div>` : ''}</div>`; }).join('') + '</div>' + '<p class="pl-sub" style="margin-top:12px">Furniture, plants and lamps come after the layout.</p>' + next('', !Object.keys(B).filter(k => !DECOR.has(k)).length && !Object.values(su.wantX || {}).some(Boolean)); }
  else if (q === 'roofx') { const X = su.wantX || {}, bl = S.site.blocks || [], door = geo().door; h += '<h2>Stairs room & shafts</h2>';   // 268 (owner)
    if (X.mst) h += '<p class="pl-h">New stairs up to the stairs-room roof</p><div class="pl-subig">' + MST.filter(z => z[0] !== 'none').map(z => big('mstn:' + z[0], (su.mstNew || 'ms') === z[0], P2.ico('stairs'), z[1])).join('') + '</div><p class="pl-h">On which wall of the stairs room?</p><div class="pl-subig">' + [['left', 'Left'], ['right', 'Right'], ['back', 'Back'], ['front', 'Front']].map(z => chip('mst:side:' + z[0], ((su.mst || {}).side || mstSide()) === z[0], z[1] + (z[0] === door ? ' (door side)' : ''))).join('') + '</div>';
    if (X.shaft) h += '<p class="pl-h">New cover on the shaft' + (bl.filter(b => b.type === 'shaft').length > 1 ? 's' : '') + ' in</p><div class="pl-subig">' + SMAT.map(z => chip('snew:' + z[0], (su.shaftNew || 'poly') === z[0], z[1])).join('') + '</div><p class="pl-h">A new MS frame (fabrication) for it too?</p><div class="pl-subig">' + chip('sms:1', su.shaftMS !== false, 'Yes, new MS frame') + chip('sms:0', su.shaftMS === false, 'No, use the old frame') + '</div>';
    h += next(); }
  else if (q === 'sofa') { const ss = suSofa(); h += '<h2>Your sofa set</h2><p class="pl-sub">Tick one or more pieces — the drawing shows how they sit together.</p>';   // 261 (owner)
    ss.forEach((c, i) => { const L = P2.sofaLayout(c); h += (ss.length > 1 ? `<p class="pl-h">Sofa set ${i + 1}</p>` : '') + `<div class="pl-sofa">${P2.SOFA_OPTS.map(([k, t]) => `<button type="button" data-su="sofa:${i}:${k}" class="${c.includes(k) ? 'on' : ''}">${P2.sofaSvg([k])}<b>${t}</b></button>`).join('')}</div><div class="pl-sofaall">${P2.sofaSvg(c)}<small>${L.seats} seats · about ${fiTxt(L.w)} × ${fiTxt(L.d)} with the table</small></div>`; });
    h += next(); }
  else if (q === 'decor') { const cats = CATS.filter(c => DECOR.has(c.k) && !['planter', 'plant', 'chair', 'table'].includes(c.k) && (designs(c).length || c.always) && (c.k !== 'stool' || B.bar));
    h += '<h2>Furniture & finishing touches</h2><p class="pl-sub">Round 3 — what goes on your layout.</p><div class="pl-els pl-els2">' + cats.map(c => { const v = B[c.k] || 0; return `<div class="pl-elw"><button type="button" data-su="bel:${c.k}" class="${v ? 'on' : ''}"><i>${c.e}</i><b>${esc(c.k === 'lights' ? 'Garden lamps' : c.t)}</b>${v ? '<em>✓</em>' : ''}</button>${v ? `<div class="pl-cnt"><button type="button" data-su="bcnt:${c.k}:-1" aria-label="One less">−</button><b>${v}</b><button type="button" data-su="bcnt:${c.k}:1" aria-label="One more">+</button></div>` : ''}</div>`; }).join('') + '</div>' + next(); }
  else if (q === 'cabin') { const cb = suCab(); h += '<h2>Your cabin' + (cb.length > 1 ? 's' : '') + '</h2><div class="pl-cnts"' + (su.edK ? ' style="display:none"' : '') + '><span>' + P2.ico('cabin') + 'How many cabins</span><button type="button" data-su="ncab:-1">−</button><b>' + cb.length + '</b><button type="button" data-su="ncab:1">+</button></div>';
    cb.forEach((c, i) => { h += `<div class="pl-cab">${cb.length > 1 ? `<b style="font-size:15px">Cabin ${i + 1}</b>` : ''}` +   // 278 (owner): no 'what for' / 'inside it'
      '<b>Walls</b><div class="pl-sucs">' + CAB_GLZ.map(z => chip(`cglz:${i}:${z[0]}`, (c.glaze || 'mostly') === z[0], `${z[1]}<small style="display:block;font-weight:400;font-size:11px;color:#8A8278">${z[2]}</small>`)).join('') + '</div>' +
      ((c.glaze || 'mostly') === 'mostly' ? '<b>How many sides in glass?</b><div class="pl-sucs">' + [1, 2, 3, 4].map(n => chip(`cgs:${i}:${n}`, (+c.gs || 1) === n, n + (n === 1 ? ' side' : ' sides'))).join('') + '</div><small style="display:block;color:#8A8278;margin:-2px 0 8px">The door side first; sides facing the parapet get windows, sides against a wall stay solid.</small>' : '') +   // 268 (owner)
      '<b>Entrance faces</b><div class="pl-cdir">' + [['', ''], ['back', '↑'], ['', ''], ['left', '←'], ['auto', 'Auto'], ['right', '→'], ['', ''], ['front', '↓'], ['', '']].map(z => z[0] ? `<button type="button" data-su="cdoor:${i}:${z[0]}" class="${(z[0] === 'auto' ? !suDoors(c).length : suDoors(c).includes(z[0])) ? 'on' : ''}" aria-label="${z[0]}">${z[1]}</button>` : '<i></i>').join('') + '</div><small class="pl-cdh">↑ back wall · ↓ road side · Auto = facing the open terrace</small></div>'; });   // 256 (owner): solid / mostly glass / all glass + which way the door faces
    h += next(); }
  else if (q === 'bar') { const bs = suBars(); h += '<h2>Your bar counter' + (bs.length > 1 ? 's' : '') + '</h2><p class="pl-sub">Room on both sides — by a wall, the seating or the pergola.</p>';
    bs.forEach((v, i) => { h += `<p class="pl-h">Bar counter${bs.length > 1 ? ' ' + (i + 1) : ''}</p><div class="pl-subig">` + big(`bshape:${i}:straight`, v === 'straight', P2.ico('straight'), 'Straight') + big(`bshape:${i}:L`, v === 'L', P2.ico('lshape'), 'L-shape') + big(`bshape:${i}:curve`, v === 'curve', P2.ico('curve'), 'Curved') + '</div>'; });
    h += next(); }
  else if (q === 'fbs') { const fs = suArr('fbs', B.fbench || 0, 'L'); h += '<h2>Your fixed seating</h2><p class="pl-sub">Built in, against the walls.</p>';
    fs.forEach((v, i) => { h += `<p class="pl-h">Seating${fs.length > 1 ? ' ' + (i + 1) : ''}</p><div class="pl-subig pl-col3">` + big(`fbs:${i}:straight`, v === 'straight', P2.ico('straight'), 'Straight') + big(`fbs:${i}:L`, v === 'L', P2.ico('lshape'), 'L-shape') + big(`fbs:${i}:curve`, v === 'curve', P2.ico('curve'), 'Curved') + '</div>';
      if (v !== 'curve') { const pv = (su.fbp || [])[i] || 'none'; h += '<p class="pl-sub" style="margin:8px 0 4px">Built-in planters with it?</p><div class="pl-sucs">' + [['none', 'Just the seating'], ['back', 'Behind it'], ['sides', v === 'L' ? 'Ends + L corner' : 'At both ends'], ['both', 'Behind + ends']].map(z => chip(`fbp:${i}:${z[0]}`, pv === z[0], z[1])).join('') + '</div>'; } }); h += next(); }   // 258 (owner)
  else if (q === 'wtr') { const ws = suArr('wm', B.water || 0, 'cascade'), on = ws.map(wType); h += '<h2>Your water feature</h2><p class="pl-sub">How should the water move? Pick one or more — each becomes a water feature.</p><div class="pl-subig pl-wty">' +
      WTYPES.map(([k, t, sm]) => chip('wty:' + k, on.includes(k), `${WSVG[k]}<b>${t}</b><small style="display:block;font-weight:400;font-size:11px;color:#8A8278">${sm}</small>`)).join('') + '</div>' + next(null, !ws.length); }   // 266 (owner): line drawings, more than one allowed
  else if (q === 'ftr') { const fs = suArr('fd', B.feature || 0, 'fluted'); h += '<h2>Your feature wall</h2><p class="pl-sub">Each one with warm light and a bit of green.</p>';
    fs.forEach((v, i) => { h += `${fs.length > 1 ? `<p class="pl-h">Feature wall ${i + 1}</p>` : ''}<div class="pl-subig">` + FDES.map(z => big(`fd:${i}:${z[0]}`, v === z[0], P2.ico('feature'), z[1], z[2])).join('') + '</div>'; }); h += next(); }
  else if (q === 'gfw') { const W = gWalls(), gs = suArr('gw', B.graffiti || 0, (W[0] || [''])[0]); h += '<h2>Where does the graffiti go?</h2>';
    gs.forEach((v, i) => { h += `${gs.length > 1 ? `<p class="pl-h">Graffiti ${i + 1}</p>` : ''}<div class="pl-subig pl-col">` + W.map(z => chip(`gw:${i}:${z[0]}`, v === z[0], esc(z[1]))).join('') + '</div>'; }); h += next(); }
  else if (q === 'seats') { h += '<h2>How big?</h2>'; const pgs = suPgs();
    pgs.forEach((v, i) => { h += `<p class="pl-h">Pergola${pgs.length > 1 ? ' ' + (i + 1) : ''} — how big?</p>` + szRows('pg:', ['2-4', '5-8', '9-12', '12+'], PGPPL, PG_IDEAL, v).replace(/data-su="pg:([^"]+)"/g, `data-su="pg:$1:${i}"`); });   // 268 (owner): size first, with who it fits and what it suits
    if (B.cabin) h += '<p class="pl-h">Cabin — how big?</p>' + szRows('cs:', ['1-2', '3-4', '5-8', '9-12'], CABPPL, CAB_IDEAL, su.cs) + '<p class="pl-sub">You can still change the exact size on the plan.</p>';
    h += next(); }
  else if (q === 'have') { const hv = su.have || (su.have = {});
    h += '<h2>Already built on the roof?</h2><p class="pl-sub">Anything that stands there now — you place it on the plan later. Nothing? Just press Next.</p><div class="pl-els pl-els2">' + HAVE_T.map(([k, t]) => { const v = hv[k] || 0; return `<div class="pl-elw"><button type="button" data-su="hv:${k}" class="${v ? 'on' : ''}"><i>${P2.ico(k === 'troom' ? 'cabin' : k)}</i><b>${esc(t)}</b>${v ? '<em>✓</em>' : ''}</button>${v ? `<div class="pl-cnt"><button type="button" data-su="hvc:${k}:-1" aria-label="One less">−</button><b>${v}</b><button type="button" data-su="hvc:${k}:1" aria-label="One more">+</button></div>` : ''}</div>`; }).join('') + '</div>' + (hv.troom ? '<p class="pl-h">The temp room is made of</p><div class="pl-subig">' + chip('trm:net', (su.trMat || 'net') === 'net', 'Net') + chip('trm:pvc', su.trMat === 'pvc', 'PVC sheet') + '</div><p class="pl-sub">Move it to its place on the next screen (✎ Roof: doors, AC, temp room).</p>' : '') + (hv.pergola ? '<p class="pl-h">Is there a deck under the existing pergola?</p><div class="pl-subig">' + chip('pgdk:1', su.pgDeck === true, 'Yes, a deck under it') + chip('pgdk:0', su.pgDeck !== true, 'No deck') + '</div>' : '') + next(); }
  else if (q === 'asbuilt') { suOld();   // 249 (owner): the roof as it stands — 2D (drag the existing things to where they really are), then 3D, before anything new
    h += '<h2>Your roof as it stands — before</h2><p class="pl-sub">' + (S.items.some(o => o.old) ? 'Drag the existing things to where they really are.' : 'What is built on it now — check it before we plan.') + '</p>' + (S.msg ? `<div class="pl-msg">${esc(S.msg)}</div>` : '') + `<!--L-->${z2bar()}<div class="pl-su2d${S.suMv && S.sel != null ? ' mv' : ''}${(S.su2z || 1) > 1 ? ' zm' : ''}" style="--z:${S.su2z || 1}">${suPlan()}${suPopHtml()}</div>` + suSzHtml() +
      '<div class="pl-sucs">' + chip('roof', false, '✎ Roof: doors, AC, temp room') + '</div><!--/L-->' + next(su.rev ? 'Next: the layout →' : 'See it in 3D →'); }
  else if (q === 'e3d') h += '<h2>Your layout in 3D</h2><p class="pl-sub">The big pieces as you set them — next, furniture and plants.</p><!--L--><div id="suab3d" class="pl-ab3d"><div class="pl-ab3t"><button type="button" data-su="v3:zin" aria-label="Zoom in">+</button><button type="button" data-su="v3:zout" aria-label="Zoom out">−</button><button type="button" data-su="v3:pan" aria-label="Move the view" title="Move the view">✋</button><button type="button" data-su="v3:top" aria-label="Top view" title="Top view">▦</button><button type="button" data-su="v3:night" aria-label="Night view" title="Night view">🌙</button><button type="button" data-su="v3:lab" class="' + (S.lab ? 'on' : '') + '" aria-label="Show names" title="Show names">🏷</button><button type="button" data-su="v3:home" aria-label="Whole space" title="Whole space">⌖</button></div></div><!--/L-->' + next('Next: furniture & plants →');   // 251 (owner): see round 2 in 3D before round 3
  else if (q === 'ab3d') { suOld(); h += '<h2>Your roof in 3D — before</h2><p class="pl-sub">As it stands today' + (suRemList().length ? ' — next, what stays and what is taken down.' : ' — next, what you want on it.') + '</p><!--L--><div id="suab3d" class="pl-ab3d"><div class="pl-ab3t"><button type="button" data-su="v3:zin" aria-label="Zoom in">+</button><button type="button" data-su="v3:zout" aria-label="Zoom out">−</button><button type="button" data-su="v3:pan" aria-label="Move the view" title="Move the view">✋</button><button type="button" data-su="v3:top" aria-label="Top view" title="Top view">▦</button><button type="button" data-su="v3:night" aria-label="Night view" title="Night view">🌙</button><button type="button" data-su="v3:lab" class="' + (S.lab ? 'on' : '') + '" aria-label="Show names" title="Show names">🏷</button><button type="button" data-su="v3:home" aria-label="Whole space" title="Whole space">⌖</button></div></div><!--/L-->' + next('Looks right →'); }
  else if (q === 'base') {   // 284 (owner): what stays after the take-down — the new design is built on this (saved as its own stage)
    h += '<h2>Base for your design</h2><p class="pl-sub">What stays after the take-down — your new design is built on this.</p>' + (S.msg ? `<div class="pl-msg">${esc(S.msg)}</div>` : '') + `<!--L-->${z2bar()}<div class="pl-su2d${S.suMv && S.sel != null ? ' mv' : ''}${(S.su2z || 1) > 1 ? ' zm' : ''}" style="--z:${S.su2z || 1}">${suPlan()}${suPopHtml()}</div>` + suSzHtml() + '<!--/L-->' + next(su.rev ? 'Next: the layout →' : 'See it in 3D →'); }
  else if (q === 'b3d') h += '<h2>The base in 3D</h2><p class="pl-sub">After the take-down — next, what you want on it.</p><!--L--><div id="suab3d" class="pl-ab3d">' + V3T() + '</div><!--/L-->' + next('Next: what you want →');
  else if (q === 'remove') { const L = suRemList();
    h += '<h2>Keep or take down?</h2><p class="pl-sub">What we take down is gone from your new design (and our team adds the dismantling).</p>' + L.map(z => `<div class="pl-rmr"><span><i>${P2.ico(z.ic)}</i>${esc(z.t)}</span><div class="pl-subig">${chip('rm:' + z.k + ':0', !su.rm[z.k], 'Keep')}${chip('rm:' + z.k + ':1', !!su.rm[z.k], 'Take down')}</div></div>`).join('') + next(); }
  else if (q === 'existing') { const bl = S.site.blocks || [], h0 = h, SX = {}; h = ''; const cut = k => { SX[k] = (SX[k] || '') + h; h = ''; };   // 264 (owner): one topic per screen
    h += '<p class="pl-h">The floor now</p><div class="pl-subig">' + FLOOR0.map(z => big('fl0:' + z[0], su.floor0 === z[0], P2.ico(z[0] === 'cement' ? 'none' : z[0] === 'tiles' ? 'tiles' : 'brick'), z[1], z[2])).join('') + '</div>' +
      '<p class="pl-h">What to do with the floor?</p><div class="pl-subig">' + big('flact:keep', flAct() === 'keep', P2.ico('check'), 'Keep as is') + big('flact:refurb', flAct() === 'refurb', P2.ico('brush'), 'Refurbish', su.floor0 === 'cement' ? 'repair cracks, re-plaster' : 'polish, repair, re-grout') + big('flact:change', flAct() === 'change', P2.ico('tiles'), 'Change it', 'a new floor — pick the look next') + '</div>'; cut('floor');
    if (S.site.kind === 'terrace') { const sp = su.seep || {}, ch2 = (k, on, t, sm) => chip(k, on, t + (sm ? `<small style="display:block;font-weight:400;font-size:11px;color:#8A8278">${sm}</small>` : ''));   // 278 (owner): seepage — how much, and the treatment
      h += '<p class="pl-h">Any seepage / leakage from the roof?</p><div class="pl-sucs">' + ch2('seep:has:0', sp.has === false, 'No seepage') + ch2('seep:has:1', sp.has === true, 'Yes, there is') + '</div>';
      if (sp.has) h += '<p class="pl-h">How much?</p><div class="pl-sucs">' + SEEP_AMT.map(z => ch2('seep:amt:' + z[0], (sp.amt || 'some') === z[0], z[1], z[2])).join('') + '</div>' +
        '<p class="pl-h">Treatment you want</p><div class="pl-sucs pl-sucol">' + SEEP_FIX.map(z => ch2('seep:fix:' + z[0], (sp.fix || 'redo') === z[0], z[1], z[2])).join('') + '</div>';
      cut('seep');
      h += '<p class="pl-h">Heatproofing on the roof?</p><div class="pl-sucs">' + HEAT.map(z => ch2('heat:' + z[0], (su.heat || '') === z[0], z[1], z[2])).join('') + '</div>'; }
    cut('heat');
    h += (bl.some(b => b.type === 'mumty') ? '<p class="pl-h">Plumbing pipes open on the stairs-room wall?</p><div class="pl-subig">' + chip('pipes:1', su.pipes === true, 'Yes') + chip('pipes:0', su.pipes === false, 'No') + '</div>' + (su.pipes ? '<p class="pl-h">Which wall of the stairs room are they on?</p><div class="pl-subig">' + pFaces().map(f => chip('pface:' + f[0], pFace() === f[0], f[1])).join('') + (pFace() && pFace() === geo().door ? '</div><p class="pl-h">Left or right of the door? (as you face the door)</p><div class="pl-subig">' + chip('plr:left', su.pipeLR !== 'right', 'Left of the door') + chip('plr:right', su.pipeLR === 'right', 'Right of the door') : '') + '</div>' : '') + (su.pipes ? '<p class="pl-h">Hide them behind a cover that opens (for repairs)?</p><div class="pl-subig">' + chip('pscr:1', su.pipeScr === true, 'Yes, cover them') + chip('pscr:0', su.pipeScr === false, 'Leave them') + '</div>' + (su.pipeScr ? '<p class="pl-h">Cover made of</p><div class="pl-subig">' + PMAT.map(z => chip('pmat:' + z[0], (su.pipeMat || 'cement') === z[0], z[1])).join('') + '</div>' : '') : '') : '') ; cut('pipes'); h += (bl.some(b => b.type === 'shaft') ? '<p class="pl-h">Shaft height' + (bl.filter(b => b.type === 'shaft').length > 1 ? 's' : '') + '</p>' + bl.map((b, i) => b.type !== 'shaft' ? '' : `<div class="pl-cnts"><span>${P2.ico('shaft')} Shaft ${bl.filter(x => x.type === 'shaft').indexOf(b) + 1}</span><button type="button" data-su="shh:${i}:-1">−</button><b>${shH(b)}</b><button type="button" data-su="shh:${i}:1">+</button></div>`).join('') : '') ; cut('shafth'); h += '<p class="pl-h">The walls — stairs room, parapet and the rest</p><div class="pl-subig">' + big('walls:paint', su.walls === 'paint', P2.ico('roller'), 'Paint') + big('walls:tiles', su.walls === 'tiles', P2.ico('brick'), 'Tiles / cladding') + big('walls:none', su.walls === 'none', P2.ico('check'), 'Nothing') + '</div>';
    if (su.walls === 'tiles') { const wt = su.wtile || (su.wtile = { k: 'brick', c: 'red' });   // 245 (owner): which tiles are on the walls now, and their colour — the 3D shows them
      h += '<p class="pl-h">Which tiles?</p><div class="pl-subig">' + [['brick', 'Brick look'], ['t22', 'Plain 2 × 2 ft'], ['t24', 'Plain 2 × 4 ft'], ['stone', 'Stone cladding']].map(z => chip('wtk:' + z[0], wt.k === z[0], z[1])).join('') + '</div>' +
        '<p class="pl-h">Keep these tiles?</p><div class="pl-subig">' + chip('wrm:0', !su.rm.walltiles, 'Keep them') + chip('wrm:1', !!su.rm.walltiles, 'Take them off') + '</div>' + '<p class="pl-h">Their colour</p><div class="pl-swr">' + Object.keys(WT_COL).map(c => `<button type="button" data-su="wtc:${c}" class="${wt.c === c ? 'on' : ''}" aria-label="${WT_COL[c][1]}" title="${WT_COL[c][1]}"><i style="background:${WT_COL[c][0]}"></i><small>${WT_COL[c][1]}</small></button>`).join('') + '</div>'; }
    cut('walls');
    if (S.site.kind === 'terrace') { const c = su.cop || {}, has = c.has && c.has !== 'none';   // 273 (owner): coping on the parapet — what is there, then keep / refurbish / change (or add one)
      h += '<p class="pl-h">Coping on top of the parapet now?</p><div class="pl-subig">' + COP0.map(z => chip('cop:has:' + z[0], (c.has || 'none') === z[0], z[1])).join('') + '</div>';
      if (has) h += '<p class="pl-h">What to do with it?</p><div class="pl-subig">' + [['keep', 'Keep as is', 'check'], ['refurb', 'Refurbish', 'brush'], ['change', 'Change it', 'brick']].map(z => big('cop:act:' + z[0], (c.act || 'keep') === z[0], P2.ico(z[2]), z[1], z[0] === 'refurb' ? 'polish, re-fix, fill joints' : '')).join('') + '</div>';
      if ((has && c.act === 'change') || !has) h += '<p class="pl-h">' + (has ? 'New coping in' : 'Add coping?') + '</p><div class="pl-subig">' + (has ? [] : [['', 'No, leave it']]).concat(COPN).map(z => chip('cop:want:' + z[0], (c.want || '') === z[0], z[1])).join('') + '</div>'; }
    cut('coping');
    if (bl.some(b => b.type === 'mumty') && S.site.tanks !== false) h += '<p class="pl-h">Is there a screen round the water tanks now?</p><div class="pl-subig">' + big('thas:0', su.tankHas === false, P2.ico('none'), 'No screen') + big('thas:1', su.tankHas === true, P2.ico('check'), 'Yes, there is one') + '</div>' + (su.tankHas == null ? '' : '<p class="pl-h">' + (su.tankHas ? 'Keep it or put a new one?' : 'Want a screen round them?') + '</p><div class="pl-subig">' + (su.tankHas ? chip('tw:0', !(su.wantX || {}).tank, 'Keep it') + chip('tw:1', !!(su.wantX || {}).tank, 'New screen') : chip('tw:1', !!(su.wantX || {}).tank, 'Yes, add one') + chip('tw:0', !(su.wantX || {}).tank, 'No')) + '</div>');   // 278   // 268 (owner): only what stands here; a new one is asked with the elements
    cut('tank');
    if (bl.some(b => b.type === 'mumty')) h += '<p class="pl-h">The staircase room</p><div class="pl-subig">' + big('stairs:keep', su.stairs === 'keep', P2.ico('check'), 'Keep as is') + big('stairs:door', su.stairs === 'door', P2.ico('door'), 'New door') + big('stairs:refurb', su.stairs === 'refurb', P2.ico('brush'), 'Refurbish', 'door, cladding, paint') + '</div>';
    cut('mumty');   // 284 (owner): one small topic per screen
    if (bl.some(b => b.type === 'mumty')) { const m = su.mst || {}, has = m.has && m.has !== 'none', door = geo().door;   // 263 / 268 (owner): what stands there now, asked like the stairs room; a new one is picked with the main elements
      h += '<p class="pl-h">Stairs up to the stairs-room roof (for the tanks)</p><div class="pl-subig">' + MST.map(z => big('mst:has:' + z[0], (m.has || 'none') === z[0], P2.ico(z[0] === 'none' ? 'none' : 'stairs'), z[0] === 'none' ? 'None' : z[1])).join('') + '</div>';
      if (has) h += '<p class="pl-h">On which wall of the stairs room?</p><div class="pl-subig">' + [['left', 'Left'], ['right', 'Right'], ['back', 'Back'], ['front', 'Front']].map(z => chip('mst:side:' + z[0], (m.side || mstSide()) === z[0], z[1] + (z[0] === door ? ' (door side)' : ''))).join('') + '</div><p class="pl-h">What to do with it?</p><div class="pl-subig">' + [['keep', 'Keep as is', 'check'], ['refurb', 'Refurbish', 'brush'], ['change', 'Change it', 'stairs']].map(z => big('mst:act:' + z[0], ((su.wantX || {}).mst ? 'change' : m.act || 'keep') === z[0], P2.ico(z[2]), z[1])).join('') + '</div>';   // 278 (owner): change / add asked here, not with the elements
      if (!has || (su.wantX || {}).mst) h += '<p class="pl-h">' + (has ? 'New stairs' : 'Want stairs up there?') + '</p><div class="pl-subig">' + (has ? [] : [['no', 'No']]).concat(MST.filter(z => z[0] !== 'none')).map(z => big('mstw:' + z[0], z[0] === 'no' ? !(su.wantX || {}).mst : (su.wantX || {}).mst && (su.mstNew || 'ms') === z[0], P2.ico(z[0] === 'no' ? 'none' : 'stairs'), z[1])).join('') + '</div>' +
        (!has && (su.wantX || {}).mst ? '<p class="pl-h">On which wall of the stairs room?</p><div class="pl-subig">' + [['left', 'Left'], ['right', 'Right'], ['back', 'Back'], ['front', 'Front']].map(z => chip('mst:side:' + z[0], (m.side || mstSide()) === z[0], z[1] + (z[0] === door ? ' (door side)' : ''))).join('') + '</div>' : ''); }
    cut('mstair');
    if (bl.some(b => b.type === 'shaft')) h += '<p class="pl-h">What is on the shaft' + (bl.filter(b => b.type === 'shaft').length > 1 ? 's' : '') + ' now?</p><div class="pl-subig">' + SMAT_NOW.map(z => chip('snow:' + z[0], (su.shaftNow || 'none') === z[0], z[1])).join('') + '</div>' + (() => { const X = su.wantX || {}, now = su.shaftNow && su.shaftNow !== 'none';   // 278 (owner): a new cover asked here
      return '<p class="pl-h">' + (now ? 'Keep the cover or a new one?' : 'Put a cover on it?') + '</p><div class="pl-subig">' + (now ? chip('sw:0', !X.shaft, 'Keep it') + chip('sw:1', !!X.shaft, 'New cover') : chip('sw:1', !!X.shaft, 'Yes, a cover') + chip('sw:0', !X.shaft, 'No')) + '</div>' +
        (X.shaft ? '<p class="pl-h">The new cover in</p><div class="pl-subig">' + SMAT.map(z => chip('snew:' + z[0], (su.shaftNew || 'poly') === z[0], z[1])).join('') + '</div><p class="pl-h">A new MS frame for it too?</p><div class="pl-subig">' + chip('sms:1', su.shaftMS !== false, 'Yes, new MS frame') + chip('sms:0', su.shaftMS === false, 'No, use the old frame') + '</div>' : ''); })();   // 268 (owner)
    cut('shaft');
    if (bl.some(b => b.type === 'room')) h += '<p class="pl-h">The room / washroom on the roof — refurbish it?</p><div class="pl-subig">' + chip('rref:1', su.roomRef === true, 'Yes, refurbish') + chip('rref:0', su.roomRef === false, 'No, keep it') + '</div>';
    cut('room'); const L = EXQ.filter(z => SX[z[0]]); S._exn = L.length; if (su.exK) { const ix = L.findIndex(z => z[0] === su.exK); if (ix >= 0) su.exq = ix; su.exK = null; } su.exq = Math.max(0, Math.min(L.length - 1, su.exq || 0)); const cur = L[su.exq] || ['floor', 'The floor'];
    h = h0 + `<h2>What is already there</h2><p class="pl-sub">${su.exq + 1} of ${L.length} · ${cur[1]}</p><div class="pl-exd">${L.map((z, k) => `<i class="${k <= su.exq ? 'on' : ''}"></i>`).join('')}</div>` + SX[cur[0]];
    h += next(); }
  else if (q === 'green') h += '<h2>How much greenery?</h2><div class="pl-subig pl-col">' + big('green:none', su.green === 'none', P2.ico('none'), 'No plants', 'no planters, no creepers') + big('green:light', su.green === 'light', P2.ico('sprout'), 'A little', 'a few plants in the corners') + big('green:balanced', su.green === 'balanced', P2.ico('planter'), 'Balanced', 'corners, a wall of plants, a green wall') + big('green:lush', su.green === 'lush', P2.ico('lush'), 'Lush', 'thick greenery all round') + '</div>' + next();
  else if (q === 'lights') h += '<h2>Lights for the evenings?</h2><div class="pl-subig pl-col3">' + big('light:none', su.light === 'none', P2.ico('sun'), 'No lights', 'only daytime use') + big('light:soft', su.light === 'soft', P2.ico('moon'), 'Soft & warm', 'pergola profile, cove lights, plant spikes') + big('light:full', su.light === 'full', P2.ico('sparkle'), 'All lit up', '+ wall lights and screen downlights') + '</div>' + next();
  else if (q === 'floor') h += '<h2>The floor</h2><p class="pl-sub">Pick a look — we lay it out round your layout.</p><div class="pl-floors">' + (['tiles', 'kota', 'marble', 'granite'].includes(su.floor0) && !su.rm.floor0 ? [['keep', 'Keep my floor', 'The ' + (FLOOR0.find(z => z[0] === su.floor0) || [0, 'floor'])[1].toLowerCase() + ' stays as it is']] : []).concat(FLOORS).map(z => `<button type="button" data-su="flr:${z[0]}" class="${su.flr === z[0] ? 'on' : ''}">${P2.floorThumb(z[0])}<b>${z[1]}</b><small>${z[2]}</small></button>`).join('') + '</div>' + (su.flr ? next() : '');   // 255: coming back, Next keeps the pick
  else if (q === 'theme') { if (!su.thm) themeApply(({ party: 'modern', spa: 'tropical', green: 'tropical', yoga: 'fusion', work: 'fusion', chill: 'boho' })[S.bth] || 'fusion', true);   // 274 (owner): the last step — same layout, the look changes
    h += '<h2>Pick a theme</h2><p class="pl-sub">Same layout — tap a theme to see your terrace in it. The floor, finishes, fabrics and plants change with it.</p>' +
      '<!--L--><div id="suab3d" class="pl-ab3d pl-thv">' + V3T() + '</div><!--/L--><div class="pl-thm">' + THEMES6.map(([k, n, d, c]) => `<button type="button" data-su="thm:${k}" class="${su.thm === k ? 'on' : ''}"><i>${c.map(x => `<s style="background:${x}"></s>`).join('')}</i><b>${n}</b><small>${d}</small></button>`).join('') + '</div>' + (() => { const F = S.items.filter(o => o.cat === 'feature' && !o.old); if (!F.length) return ''; fdTheme(); return F.map((o, i) => `<p class="pl-h" style="margin:12px 0 4px">Feature wall${F.length > 1 ? ' ' + (i + 1) : ''} <small style="font-weight:400;color:#8A8278">· ${(su.fdU || {})[i] ? 'your pick' : 'goes with the theme'}</small></p><div class="pl-sucs">` + FDES.map(z => chip(`fdt:${i}:${z[0]}`, o.fdesign === z[0], z[1])).join('') + '</div>').join(''); })() + fuHtml() + next('Next: floor layout →'); }   // 278 (owner): the choices in the right panel, the 3D on the left
  else if (q === 'flay') { const k = su.thm || 'fusion', rec = FL_REC[k] || FL_REC.fusion, cur = (S.site.floor || {}).layout || rec[0], nm = (THEMES6.find(z => z[0] === k) || [0, ''])[1];   // 276c (owner): the floor layout, in the picked theme, on their own terrace
    const card = L => { const z = FLAYS.find(q2 => q2[0] === L); return `<button type="button" data-su="flay:${L}" class="${cur === L ? 'on' : ''}"><span class="pl-flt">${flayThumb(k, L)}</span><b>${z[1]}</b><small>${z[2]}</small>${rec.includes(L) ? `<em>Best for ${esc(nm)}</em>` : ''}</button>`; };
    h += '<h2>Floor layout</h2><p class="pl-sub">How the floor is laid round your seating — paths, rugs, pods and borders, in ' + esc(nm) + ' materials.</p><!--L--><div id="suab3d" class="pl-ab3d pl-thv">' + V3T() + '</div><!--/L--><div class="pl-fl">' + rec.map(card).join('') + (S.flMore ? FLAYS.map(z => z[0]).filter(L => !rec.includes(L)).map(card).join('') : '') + '</div>' +
      (S.flMore ? '' : '<button type="button" class="pl-flm" data-su="flmore">More layouts ▾</button>') + (() => { const g = (S.site.floor || {}).grass; return '<p class="pl-h" style="margin:6px 0 4px">Grass in the open areas</p><div class="pl-subig">' + chip('grass:1', !!g, 'Yes — a lawn') + chip('grass:0', !g, 'No grass') + '</div><p class="pl-sub" style="margin:2px 0 8px">Paths cross the grass on stepping stones.</p>'; })() + next('See my proposal →'); }
  else if (q === 'prop') { h += '<!--L--><div class="pp" id="ppRoot"><p class="pl-sub">Working out your proposal…</p></div><!--/L--><h2>Your proposal</h2><p class="pl-sub">Premium and Luxury side by side — tick the add-ons and download the PDF from the proposal.</p><div class="pl-subar"><button type="button" class="pl-go" data-su="done">See my design in 3D →</button></div>'; setTimeout(propPaint, 0); }   // 277 (owner)
  else if (q === 'north') { const t = S.site; h += '<h2>Which side is north?</h2><p class="pl-sub">Tap the side or the corner that faces north — the seating goes where the afternoon sun is softer.</p>' +
      `<div class="pl-sun" style="aspect-ratio:${t.pw}/${t.pd}">${Object.keys(P2.NORTHV).map(sd => `<button type="button" data-su="north:${sd}" class="pl-sn pl-sn-${sd}${su.north === sd ? ' on' : ''}" aria-label="North: ${sd}">N</button>`).join('')}<span>▼ road</span></div>` +
      '<div class="pl-subig">' + chip('north:', false, 'Not sure') + '</div>' + (su.north ? next() : ''); }
  else { const it = S.sel != null ? S.items[S.sel] : null;
    h += q === 'eplan' ? '<h2>Your layout</h2><p class="pl-sub" style="margin:-4px 0 6px">Round 2 of 3 — the big pieces. Furniture and plants come next.</p>' : '<h2>Your setup</h2>';
    h += `<p class="pl-sub">${it ? (S.suMv ? 'Drag it to where you want · ✓ Done when finished' : 'Tap ✥ Move to drag it · ✓ Done when finished') : 'Tap a thing to change it · swipe to scroll'}</p>` + (S.msg ? `<div class="pl-msg">${esc(S.msg)}</div>` : '') + `<!--L-->${z2bar()}<div class="pl-su2d${S.suMv && S.sel != null ? ' mv' : ''}${(S.su2z || 1) > 1 ? ' zm' : ''}" style="--z:${S.su2z || 1}">${suPlan()}${suPopHtml()}</div>` + suSzHtml() + suMvHtml() + suAddHtml(q);   // 254: toolbar over the picked thing
    h += '<div class="pl-sucs">' + chip('meas', !!su.meas, '📏 Measurements') + chip('again', false, '↺ Set up again') + chip('roof', false, '✎ Roof: doors, AC, temp room') + '</div><!--/L-->' +
      (q === 'eplan' ? `<div class="pl-subar"><button type="button" class="pl-go" data-su="next">${su.rev ? 'Next: furniture & plants →' : 'See it in 3D →'}</button></div>` : `<div class="pl-subar"><button type="button" class="pl-go" data-su="next">${su.rev ? 'Done — see it in 3D →' : 'Next: pick a theme →'}</button></div>`); }
  { const b0 = h.indexOf('<!--q-->'); if (b0 >= 0) { let Q = h.slice(b0 + 8), L = ''; const m = Q.match(/<!--L-->([\s\S]*?)<!--\/L-->/); if (m) { L = m[1]; Q = Q.replace(m[0], ''); } else L = bigPlan(q);
    const BK = '<button type="button" class="pl-bk" data-su="back">← Back</button>'; Q = /pl-subar/.test(Q) ? Q.replace(/<div class="pl-subar">/g, '<div class="pl-subar">' + BK) : Q + '<div class="pl-subar">' + BK + '</div>';   // 284 (owner): Back beside Next on every step   // 282 (owner): one layout everywhere — the view on the left, every stage (and this question) in the panel on the right
    h = h.slice(0, b0) + `<div class="pl-u${m ? ' pl-u2' : ''}"><div class="pl-ul">${L}</div><aside class="pl-ur"><button type="button" class="pl-hdl" aria-label="Drag to make the view bigger or smaller"><i></i></button>${stagePanel(q, Q)}</aside></div>`; } }
  if (S.site.kind === 'ground') h = lawnWords(h);   // 293: a lawn goes through the same setup — its words say lawn
  S._suPT = Date.now(); SUEL.innerHTML = h + '</div>'; if (S.sel != null) requestAnimationFrame(suPopPlace); suPreview(q); sheetDrag();
  if (q === 'ab3d' || q === 'b3d' || q === 'e3d' || q === 'theme' || q === 'flay') setTimeout(() => { const el = document.getElementById('suab3d'); if (!el) return; try { S3.show(el, { creepers: crOn(), site: S.site, items: q === 'e3d' ? S.items.filter(o => !isDecor(o)) : S.items, sel: null, cabinCfg, cabinLay, pergolaSku: 'MTO-PG-TW', noDrag: true, labels: !!S.lab, theme: (S.su && S.su.theme) || 'natural', fmix: S.su && S.su.fmix }, { view: '3d', on: () => {} }); S3.panMode(false); /* 255: taps here stay here (the planner's own handler redrew the main 3D and took the canvas away → blank) */ setTimeout(() => { try { S3.resize(); S3.home(); } catch (e) {} }, 80); } catch (e) {} }, 30);
}
// 284 (owner): what is picked on the right shows on the 2D at the left at once — the setup is tried on a copy (nothing saved) and drawn
let PVT = 0;
function suPvPh(q) { const i = SUQ.indexOf(q); return i >= SUQ.indexOf('mood') && i < SUQ.indexOf('eplan') ? 'el' : i >= SUQ.indexOf('decor') && i < SUQ.indexOf('plan') ? 'dec' : ''; }
function suPreview(q) { const ph = suPvPh(q); if (!ph || !SUEL) return; clearTimeout(PVT); PVT = setTimeout(() => { const su0 = S.su; if (!su0 || !su0.on || SUQ[su0.q] !== q) return;
  const key = ph + suSig(); let items = S._pvK === key ? S._pv : null;
  if (!items) { const keep = S, C = JSON.parse(JSON.stringify({ items: S.items, site: S.site, su: S.su, bsel: S.bsel || {}, bth: S.bth || null }));
    S = Object.assign({}, keep, C, { sel: null, hist: [], hi: -1 }); QUIET = true;
    try { const su = S.su; if (ph === 'el') { if (hasLay()) suMergeEl(); else suCompose('el'); } else if (hasLay()) { if (su.decorDone) suMergeDec(); else suCompose('decor'); } items = S.items; } catch (e) { items = null; }
    finally { QUIET = false; S = keep; } S._pvK = key; S._pv = items; }
  const el = SUEL.querySelector('.pl-ul .pl-ubig'); if (!el || !items) return; const t = S.site;
  try { el.innerHTML = P2.svg(t, { items: items.filter(o => ph === 'dec' || !isDecor(o)), north: su0.north, road: ['front'].concat(t.road_back ? ['back'] : []) }) + '<p class="pl-pvn">A first look — you place and size things on the plan after these questions</p>'; } catch (e) {} }, 60); }
const WT_COL = { red: ['#A4553A', 'Brick red'], beige: ['#D8C7A8', 'Beige'], grey: ['#9A9A96', 'Grey'], white: ['#ECE9E2', 'White'], charcoal: ['#4A4A48', 'Charcoal'], wood: ['#8B6440', 'Wood brown'] };
// 245 (owner): while the setup is made, a short "creating" screen instead of a frozen one
const MAGIC = ['Reading your roof…', 'Finding the corner with the softest evening light…', 'Setting the big pieces where they belong…', 'Laying out the walkways…', 'Balancing open space and shade…', 'Adding the finishing touches…'];
function suMagic(ph) { const t0 = Date.now(); let k = 0; S.magic = false;
  SUEL.innerHTML = '<div class="pl-magic"><div class="pl-mgo">' + P2.ico('sparkle') + '</div><h2>Creating your outdoor space</h2><p class="pl-mgl">' + MAGIC[0] + '</p><div class="pl-mgb"><i></i></div></div>';
  S.magic = true; const tk = setInterval(() => { const el = SUEL.querySelector('.pl-mgl'); if (!el) return clearInterval(tk); k = (k + 1) % MAGIC.length; el.style.opacity = 0; setTimeout(() => { el.textContent = MAGIC[k]; el.style.opacity = 1; }, 180); }, 900);
  setTimeout(() => { try { suCompose(ph); } catch (e) { S.magic = false; console.error(e); } setTimeout(() => { clearInterval(tk); S.magic = false; suPaint(); SUEL.scrollTop = 0; }, Math.max(0, 2600 - (Date.now() - t0))); }, 80); }
const SUX = new Set(['exq', 'addK', 'addRet', 'addD', 'elPos', 'q', 'on', 'dirty', 'ddirty', 'decorDone', 'done', 'opts', 'pick', 'meas', 'oldPlaced', 'oldDirty', 'elSig', 'dSig']);
function suSig() { const su = S.su || {}, o = {}; Object.keys(su).sort().forEach(k => { if (!SUX.has(k)) o[k] = su[k]; }); return JSON.stringify([o, S.bsel || {}, (S.site.blocks || []).map(b => [b.type, b.x, b.z, b.w, b.d, b.h]), S.site.pw, S.site.pd]); }
function suChE() { const su = S.su; return !S.items.length || (su.dirty && (su.elSig == null || suSig() !== su.elSig)); }   // 259: back / next with the same answers keeps the 2D edits
function suChD() { const su = S.su; return !su.decorDone || ((su.dirty || su.ddirty) && (su.dSig == null || suSig() !== su.dSig)); }
const suDoors = c => Array.isArray(c && c.door) ? c.door : c && c.door && c.door !== 'auto' ? [c.door] : [];
// 260 (owner): "Add more" asks the same questions as the setup for these, then adds the thing with those answers
const EXQ = [['floor', 'The floor'], ['seep', 'Seepage'], ['heat', 'Heatproofing'], ['pipes', 'Pipes on the stairs room'], ['mumty', 'The stairs room'], ['mstair', 'Stairs up to its roof'], ['tank', 'Water tanks'], ['shafth', 'Shaft heights'], ['shaft', 'Shaft covers'], ['walls', 'The walls'], ['coping', 'The parapet top'], ['room', 'Rooms on the roof']];   // 284: the stairs room / shafts in small steps

// ---------------------------------------------------------------- 274 (owner): "Pick a theme" — the same layout in 6 looks: finishes / fabrics (space3d THEMES), plants, floor + the open floor landscaped
const THEMES6 = [['tropical', 'Tropical', 'dark wood, grey stone, loaded with plants', ['#4A3020', '#3E6B3A', '#8C8A84', '#EFE8DA']],
  ['turkish', 'Turkish', 'keyhole arches, beige zellige, brass lanterns', ['#E3CFAE', '#B08D57', '#2F6E73', '#C2187A']],
  ['santorini', 'Santorini', 'white lime, Aegean blue, bougainvillea, flagstone', ['#F6F5F1', '#1F4FA8', '#C2187A', '#8E9AA3']],
  ['modern', 'Modern', 'charcoal, warm teak, LED', ['#2A2A2A', '#9A6A42', '#EFE9DF', '#B7B2AA']],
  ['fusion', 'Fusion', 'a mix: modern + boho + turkish + tropical', ['#2A2A2A', '#EFE8DD', '#1F7A72', '#86583A']],
  ['boho', 'Boho', 'Ibiza: white lime, arches, reed roof, rattan', ['#EFE8DD', '#C9A574', '#B8734A', '#6B7A4A']]];
// 276 (owner): each theme's floor recipe — the field (laid pattern), a border, a paver 'rug' where people sit and under the pergola,
// the path from the stairs door, lawn, inlay, textile rugs. Patterns: floorlay.js SPECS
const TH_FLOOR = { tropical: { tile: 'stone', lay: 'trop_field', border: { w: 1, c: 'pebble' }, turf: true, path: 'trop_path', pg: 'trop_rug', fire: 'trop_field' },
  turkish: { tile: 'moroccan', lay: 'turk_field', border: { w: 1.3, c: 'terracotta', lay: 'turk_border' }, inlay: 'star', rugs: 'kilim', path: 'turk_path', fire: 'turk_border' },
  santorini: { tile: 'lime', lay: 'sant_field', border: { w: 0.67, c: 'blue', lay: 'sant_border' }, inlay: 'mosaic', path: 'sant_path', rugs: 'berber', fire: 'sant_field' },
  modern: { tile: 'grey', ts: [2, 4], lay: 'mod_field', border: { w: 0.75, c: 'granite', lay: 'mod_border' }, seat: 'mod_rug', pg: 'mod_deck', fire: 'mod_border' },
  fusion: { tile: 'grey', ts: [2, 4], lay: 'mod_field', border: { w: 1, c: 'pebble' }, turf: true, path: 'trop_path', seat: 'trop_field', pg: 'mod_deck', fire: 'mod_border' },   // 300 (owner): floor Tropical + Modern
  boho: { tile: 'stone', lay: 'boho_field', border: { w: 0.67, c: 'stone', lay: 'boho_border' }, path: 'boho_path', seat: 'boho_rug', rugs: 'berber', jute: true, fire: 'boho_rug' } };
// 276 (owner): grass never under a fire pit — it always stands on the theme's stone / Moroccan / tiles; decks are always WPC boards (fabricated, never civil)
const FU_TH = [['modern', 'Modern'], ['boho', 'Boho'], ['turkish', 'Turkish'], ['tropical', 'Tropical'], ['santorini', 'Santorini']], FU_MIXN = { feature: 'Modern + Boho', fbench: 'Modern + Turkish' };   // 300 (owner): Fusion — the customer picks each element's theme
const FU_DEF = { pergola: 'modern', cabin: 'modern', bar: 'turkish', privacy: 'modern', water: 'modern', feature: 'fusion', fbench: 'fusion' }, FU_G = [['pergola', 'Pergola'], ['feature', 'Feature wall'], ['fbench', 'Seating'], ['bar', 'Bar'], ['cabin', 'Cabin'], ['privacy', 'Screens'], ['water', 'Water feature']], FU_IN = { bar: ['bar', 'counter'] };
function fuPick(g) { const m = (S.su || {}).fmix || {}; return m[g] || FU_DEF[g]; }
function fuHtml() { const su = S.su || {}; if (su.thm !== 'fusion') return ''; const has = g => S.items.some(o => !o.old && (FU_IN[g] || [g]).includes(o.cat)), G = FU_G.filter(([g]) => has(g)); if (!G.length) return '';
  return '<p class="pl-h" style="margin:14px 0 2px">Mix your own</p><p class="pl-sub" style="margin:0 0 6px">Pick the look of each element — at most 3 in one theme.</p>' + G.map(([g, n]) => `<p class="pl-h" style="margin:10px 0 4px;font-size:13px">${n}</p><div class="pl-sucs">` + (FU_MIXN[g] ? [['fusion', FU_MIXN[g]]] : []).concat(FU_TH).map(([k, l]) => `<button type="button" class="pl-chip${fuPick(g) === k ? ' on' : ''}" data-su="fmx:${g}:${k}">${l}</button>`).join('') + '</div>').join(''); }
const TH_PAINT = { boho: 0xEFE8DD, tropical: 0xB9B6AF, turkish: 0xF1E8D8, santorini: 0xFAFAF7, modern: 0xEFE9DF, fusion: 0xEFE8DD };   // the walls' paint per theme
const V3T = () => '<div class="pl-ab3t"><button type="button" data-su="v3:zin" aria-label="Zoom in">+</button><button type="button" data-su="v3:zout" aria-label="Zoom out">−</button><button type="button" data-su="v3:pan" aria-label="Move the view" title="Move the view">✋</button><button type="button" data-su="v3:top" aria-label="Top view" title="Top view">▦</button><button type="button" data-su="v3:night" aria-label="Night view" title="Night view">🌙</button><button type="button" data-su="v3:home" aria-label="Whole space" title="Whole space">⌖</button></div>';
const THPOOL = {   // plants per theme (what the 3D catalogue has; sun / semi-shade)
  tropical: { corner: { S: ['BANANA', 'TRAVELLER', 'FISHTAIL', 'FOXTAIL'], SS: ['ARECA', 'FISHTAIL', 'RHAPIS'] }, wall: { S: ['BIRDPARADISE', 'CROTON', 'HIBISCUS', 'IXORA', 'BANANA'], SS: ['SONGOFINDIA', 'CORDYLINE', 'SCHEFFLERA', 'CROTON'] }, accent: { S: ['BIRDPARADISE', 'BANANA', 'CROTON', 'TRAVELLER'], SS: ['SCHEFFLERA', 'BIRDPARADISE', 'CORDYLINE', 'SONGOFINDIA'] } },   // 293 (owner): loaded tropical
  turkish: { corner: { S: ['OLIVE', 'PHOENIX', 'ARECA'], SS: ['ARECA', 'RHAPIS'] }, wall: { S: ['BOUGAINVILLEA', 'MADHUMALTI', 'MOGRA', 'KANER'], SS: ['MOGRA', 'CHANDNI'] }, accent: { S: ['OLIVE', 'ADENIUM', 'CYCAS', 'KANER'], SS: ['CHANDNI', 'MOGRA'] }, olive: { S: ['OLIVE'], SS: ['OLIVE'] } },   // 294 (owner): Turkish — olives in pairs, bougainvillea, palms, jasmine
  santorini: { corner: { S: ['OLIVE', 'PHOENIX', 'BOUGAINVILLEA'], SS: ['OLIVE', 'RHAPIS'] }, wall: { S: ['BOUGAINVILLEA', 'BOUGAINVILLEA', 'KANER', 'AGAVE'], SS: ['CHANDNI', 'MOGRA'] }, accent: { S: ['OLIVE', 'AGAVE', 'BOUGAINVILLEA', 'CYCAS'], SS: ['CHANDNI'] }, olive: { S: ['OLIVE'], SS: ['OLIVE'] } },   // 296: bougainvillea everywhere, olives in pairs
  modern: { corner: { S: ['FOXTAIL', 'ARECA', 'BIRDPARADISE'], SS: ['ARECA', 'RHAPIS'] }, wall: { S: ['FOUNTAINGRASS', 'SNAKEPLANT', 'OLIVE'], SS: ['SNAKEPLANT', 'RHAPIS'] }, accent: { S: ['OLIVE', 'BIRDPARADISE', 'BLACKFICUS'], SS: ['SNAKEPLANT', 'BLACKFICUS'] } },
  fusion: { corner: { S: ['BANANA', 'TRAVELLER', 'FISHTAIL', 'FOXTAIL'], SS: ['ARECA', 'FISHTAIL', 'RHAPIS'] }, wall: { S: ['BIRDPARADISE', 'CROTON', 'HIBISCUS', 'IXORA', 'BANANA'], SS: ['SONGOFINDIA', 'CORDYLINE', 'SCHEFFLERA', 'CROTON'] }, accent: { S: ['BIRDPARADISE', 'BANANA', 'CROTON', 'TRAVELLER'], SS: ['SCHEFFLERA', 'BIRDPARADISE', 'CORDYLINE', 'SONGOFINDIA'] } },   // 293 (owner): loaded tropical,
  boho: { corner: { S: ['OLIVE', 'PHOENIX', 'BOUGAINVILLEA'], SS: ['ARECA', 'RHAPIS'] }, wall: { S: ['FOUNTAINGRASS', 'AGAVE', 'BOUGAINVILLEA', 'OLIVE'], SS: ['SNAKEPLANT', 'RHAPIS'] }, accent: { S: ['OLIVE', 'AGAVE', 'SNAKEPLANT'], SS: ['SNAKEPLANT', 'ARECA'] } } };
const TH_FD = { tropical: 'stone', turkish: 'stone', santorini: 'stone', modern: 'stone', fusion: 'stone', boho: 'stone' };   // 284 (owner): the feature wall follows the theme; changeable on the theme step
function fdTheme() { const su = S.su; if (!su) return; const v = TH_FD[su.thm] || 'fluted', U = su.fdU || {}; su.fd = su.fd || [];
  S.items.filter(o => o.cat === 'feature' && !o.old).forEach((o, i) => { const d = U[i] || v; su.fd[i] = d; o.fdesign = d; o.label = (FDES.find(z => z[0] === d) || [0, 'Feature wall'])[1]; }); }
const TH_GREEN = { tropical: 'lush' }, TH_LIGHT = { santorini: 'soft' };   // 291 (owner): the theme decides greenery + lighting
function themeApply(k, quiet) { const su = S.su; if (!su) return; if (k === 'minimal') k = 'modern'; if (k === 'contemporary') k = 'fusion';   /* 297 (owner): Minimal dropped — old plans open in Modern */ su.thm = k; su.theme = k; try { fdTheme(); } catch (e) {}
  su.green = TH_GREEN[k] || 'balanced'; su.light = TH_LIGHT[k] || 'full'; if (S.site) S.site.light = su.light;
  S.items = S.items.filter(o => o.old || !(o.cat === 'plant' || (o.cat === 'planter' && !o.pick && !o.cfgId)));   // plants to suit the theme (every planted plant is re-picked)
  themeFloor(k);   // the floor first (lawn, path, inlay laid on the open floor), then the plants — they may stand in the lawn
  try { compose({ B: {}, phase: 'decor' }); } catch (e) {}
  flPlantsOff();
  if (!quiet) { save(); draw(true); } }
function flPlantsOff() { const Zs = ((S.site.floor || {}).zones || []).filter(z => z.run || z.k === 'stone' || z.k === 'path'); if (!Zs.length) return; S.items = S.items.filter(o => { if (o.old || !(o.cat === 'plant' || (o.cat === 'planter' && !o.pick && !o.cfgId && !o.frp))) return true; const r = rectI(o); return !Zs.some(z => { const b = z.k === 'stone' ? { x: z.cx - 1.3, z: z.cz - 1.3, w: 2.6, d: 2.6 } : z.pts ? null : z; if (!b) return z.pts.some(([px, pz]) => px > r.x - 0.5 && px < r.x + r.w + 0.5 && pz > r.z - 0.5 && pz < r.z + r.d + 0.5); return r.x < b.x + b.w && b.x < r.x + r.w && r.z < b.z + b.d && b.z < r.z + r.d; }); }); }   // 276c: no plant stands on a path
// 276c (owner): the floor layout — picked after the theme; the same six layouts in every theme, the theme only fills the materials.
// roles: base (calm field), path (runner / spokes), rug (under seating), hub (hub / medallion), band, deck (WPC), hard (fire pit), chk (checker), stone (stepping stones), edge (trim colour), lawn
const TH_ROLE = { tropical: { base: 'trop_field', path: 'trop_rug', rug: 'trop_rug', hub: 'turk_border', band: 'trop_rug', deck: 'trop_rug', hard: 'turk_border', chk: 'trop_chk', stone: ['#8A8882', '#9A9892', '#7E7C77'], lawn: 1 },
  turkish: { base: 'turk_base', path: 'turk_field', rug: 'turk_field', hub: 'turk_field', inlay: 'star', band: 'turk_field', deck: 'wpc_walnut', hard: 'turk_border', chk: 'turk_chk', stone: ['#D6C6A8', '#C9B79A'], edge: '#B08D57' },
  santorini: { base: 'sant_field', path: 'sant_path', rug: 'sant_enc', hub: 'sant_path', inlay: 'mosaic', band: 'sant_border', deck: 'min_rug', hard: 'sant_field', chk: 'sant_chk', stone: ['#8E9AA3', '#A6AEB3', '#7F8A93'], edge: '#1F4FA8' },
  modern: { base: 'mod_plain', path: 'mod_rug', rug: 'mod_rug', hub: 'mod_rug', band: 'mod_border', deck: 'mod_deck', hard: 'mod_border', chk: 'mod_chk', stone: ['#3A3836', '#4A4845'], lawn: 1 },
  fusion: { base: 'mod_field', path: 'trop_path', rug: 'trop_field', hub: 'trop_field', band: 'mod_border', deck: 'mod_deck', hard: 'mod_border', chk: 'mod_chk', stone: ['#8A8882', '#9A9892', '#7E7C77'], lawn: 1 },
  boho: { base: 'boho_field', path: 'boho_enc', rug: 'boho_rug', hub: 'boho_enc', band: 'boho_enc', deck: 'cont_rug', hard: 'boho_border', chk: 'boho_chk', stone: ['#D8C8AC', '#CBB894'], edge: '#C9A574', lawn: 1 } };
const FLAYS = [['runner', 'Runner + rugs', 'a patterned runner from the stairs, rugs under the seating'], ['curve', 'Curved path', 'stepping stones curve to round sitting pods'], ['frame', 'Border frame', 'a band all round, diagonal floor, a medallion'], ['hub', 'Central hub', 'a round centre with paths to every sitting area'], ['deck', 'Deck + green edges', 'a deck for the lounge, planter beds, checker floor'], ['bands', 'Patterned bands', 'a plain floor with tile bands lined up with the seating']];
const FL_REC = { tropical: ['curve', 'deck', 'hub'], turkish: ['runner', 'hub', 'frame'], santorini: ['curve', 'frame', 'runner'], modern: ['bands', 'deck', 'runner'], fusion: ['curve', 'bands', 'deck'], boho: ['hub', 'curve', 'runner'] };
// 277 (owner): the proposal step — estimate from this plan (proposal.js), Premium + Luxury, add-ons, 3D bird's-eye with numbered labels, Summary / Detailed, PDF
const FLN = { trop_field: 'Sandstone, mixed sizes', trop_path: 'Flagstone with grass joints', trop_rug: 'WPC deck boards, teak', turk_base: 'Terracotta tiles 12″', turk_field: 'Encaustic cement tiles 6″', turk_border: 'Terracotta hex border', turk_path: 'Zellige mosaic', sant_field: 'Lime-washed stone, French pattern', sant_path: 'Pebble mosaic', sant_enc: 'Blue & white encaustic tiles', sant_border: 'Blue glazed tiles', mod_plain: 'Concrete pavers 2 × 4 ft', mod_field: 'Concrete pavers with grass strips', mod_rug: 'Charcoal pavers', mod_border: 'Black granite', cont_field: 'Travertine, French pattern', cont_enc: 'Soft-grey encaustic tiles', cont_rug: 'WPC deck boards, oak', min_field: 'Microcement / large terrazzo', min_path: 'Light grey pavers', min_rug: 'WPC deck boards, light oak', boho_field: 'Terracotta brick herringbone', boho_rug: 'Brick basketweave', boho_border: 'Brick soldier course', boho_enc: 'Terracotta encaustic tiles', boho_path: 'Flagstone with grass joints', wpc_grey: 'WPC deck boards, grey', wpc_walnut: 'WPC deck boards, walnut', trop_chk: 'Sandstone checker', turk_chk: 'Terracotta & cream checker', sant_chk: 'White & grey checker', mod_chk: 'Light & charcoal checker', cont_chk: 'Travertine octagon with black inserts', min_chk: 'Two-tone microcement checker', boho_chk: 'Terracotta & cream checker' };
let PPM = null;
async function propRates() { if (S._prates) return S._prates; let db = null; try { const C = window.OUTRR_SUPA || {}; if (C.url) { const r = await fetch(C.url + '/rest/v1/rpc/company_public', { method: 'POST', headers: { apikey: C.anon, 'Content-Type': 'application/json' }, body: '{}' }); const j = await r.json(); db = j && j.prop_rates; } } catch (e) {} return (S._prates = PPM.mergeRates(db)); }
function propPlan() { const t = S.site, f = t.floor || {}, k = (S.su || {}).thm, R = TH_ROLE[k] || {}, Z = f.zones || [], has = fn => Z.some(fn), rows = [];
  if (f.lay) rows.push(['Main floor', FLN[f.lay] || 'Tiles']); if (f.border && f.border.lay) rows.push(['Border', FLN[f.border.lay] || 'Border band']);
  if (has(z => z.run)) rows.push(['Paths', FLN[R.path] || 'Laid path']); if (has(z => z.k === 'prug' && !z.run && !z.wpc && z.s === R.rug)) rows.push(['Under the seating', FLN[R.rug] || 'Tile rug']);
  if (has(z => z.k === 'circ' && !z.wpc && z.s === R.hub)) rows.push(['Hub / medallion', FLN[R.hub] || 'Patterned']); if (has(z => z.wpc)) rows.push(['Decks', FLN[R.deck] || 'WPC deck boards']);
  if (has(z => z.k === 'prug' && z.s === R.band && !z.run)) rows.push(['Bands', FLN[R.band] || 'Tile bands']); if (has(z => z.s === R.hard)) rows.push(['Under the fire pit', FLN[R.hard] || 'Stone']);
  if (has(z => z.k === 'poly' && z.s === 'turf')) rows.push(['Lawn', 'Artificial grass']); if (has(z => z.k === 'stone')) rows.push(['Across the lawn', 'Stepping stones']); if (has(z => z.k === 'bed')) rows.push(['Planter beds', 'Built beds with ground cover and shrubs']);
  return { site: t, items: S.items, su: S.su, name: S.pname, themeName: (THEMES6.find(z => z[0] === k) || [0, ''])[1], layoutName: (FLAYS.find(z => z[0] === f.layout) || [0, ''])[1], floorDesc: rows, who: (window.ACC && window.ACC.name) || '' }; }
async function propPaint() { const el = document.getElementById('ppRoot'); if (!el) return;
  if (!S._ppOk && window.acRequire && !window.ASSIST && !window.outrrPropTest && (window.OUTRR_SUPA || {}).url) return window.acRequire(() => { S._ppOk = 1; propPaint(); }, 'Sign in to see your proposal');
  S._ppOk = 1; PPM = PPM || await import('./proposal.js?v=5'); const R = await propRates(), plan = propPlan(), E = PPM.estimate(plan, R); S.padd = S.padd || {};
  const su = S.su || {}, snapSvg = sn => { try { return sn ? P2.svg(Object.assign({}, S.site, { blocks: sn.blocks, floor: null }), { items: sn.items, road: ['front'] }) : ''; } catch (e) { return ''; } }, bef = snapSvg(su.before), bas = rmAny() ? snapSvg(su.base) : '';   // 284 (owner): before → base → after
  let aft = ''; try { aft = P2.svg(S.site, { items: S.items, north: su.north, road: ['front'] }); } catch (e) {}
  el.innerHTML = `<style>${PPM.CSS}</style>` + PPM.page(plan, R, E, { tab: S.ptab, add: S.padd, before: bef, base: bas, after: bef ? aft : '' });
  el.onclick = ev => { const b = ev.target.closest('[data-pp]'); if (!b) return; const a = b.getAttribute('data-pp').split(':');
    if (a[0] === 'tab') { S.ptab = a[1]; propPaint(); } else if (a[0] === 'pdf') propPdf(plan, R, E); };
  el.onchange = ev => { const b = ev.target.closest('[data-pp]'); if (!b) return; const a = b.getAttribute('data-pp').split(':'); if (a[0] === 'add') { S.padd[a[1]] = b.checked; ev_('plan_prop_add', a[1]); propPaint(); } };
  const v = document.getElementById('ppv'); if (v) { try { S3.show(v, { creepers: crOn(), site: S.site, items: S.items, sel: null, cabinCfg, cabinLay, pergolaSku: 'MTO-PG-TW', noDrag: true, labels: false, ptags: PPM.tags(plan), theme: (S.su && S.su.theme) || 'natural', fmix: S.su && S.su.fmix }, { view: '3d', on: () => {} }); setTimeout(() => { try { S3.resize(); S3.home(); } catch (e) {} }, 80); } catch (e) {} }
  if (!S._ppEv) { S._ppEv = 1; ev_('plan_proposal', E.lw ? 'lifewall' : 'outrr'); }
  markProp(); }
function markProp() { if (!S || !S._ppEv || !S.pid || S._ppSt === S.pid || S.sh) return; S._ppSt = S.pid;   // 250: proposal opened → the plan moves to the Proposal tab (only up from Conceptualisation)
  (assistTok() ? anonRpc('plan_mark_proposal', { p_id: S.pid, p_token: assistTok() }) : rpc('plan_mark_proposal', { p_id: S.pid })).catch(() => { S._ppSt = null; }); }
function ev_(k, r) { try { ev(k, { ref: r }); } catch (e) {} }
function propPdf(plan, R, E) { let img = null; try { img = S3.snapshot(); } catch (e) {} const w = window.open('', '_blank'); if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${(E.lw ? 'LifeWall' : 'outrr')} proposal — ${String(plan.name || (S.site.kind === 'ground' ? 'Lawn plan' : 'Terrace plan')).replace(/[<>]/g, '')}</title><style>body{margin:0;background:#fff}${PPM.CSS}@page{size:A4;margin:14mm}@media print{.pp{width:auto;min-height:0;margin:0;padding:0;border:0;box-shadow:none}}</style></head><body><div class="pp">${PPM.page(plan, R, E, { print: true, add: S.padd, img })}</div><script>setTimeout(function(){print()},400)<\/script></body></html>`); w.document.close(); ev_('plan_prop_pdf', E.lw ? 'lifewall' : 'outrr'); }
function themeFloor(k) { const t = S.site; if (!TH_FLOOR[k]) return; const su = S.su || {}, L = su.flay || (FL_REC[k] || ['runner'])[0];
  t.floor = floorFor(k, L);
  if (su.walls !== 'tiles') { t.wallFin = 'paint'; t.paintC = TH_PAINT[k]; } }
function floorFor(k, L) { const F = TH_FLOOR[k], R = TH_ROLE[k] || TH_ROLE.fusion, f = { tile: F.tile, ts: F.ts, lay: L === 'deck' ? R.chk : R.base, theme: k, layout: L, border: null, pebble: false, zones: [] };
  if (L === 'frame') { f.lrot = 45; f.border = { w: 1.33, c: 'terracotta', lay: R.band }; }
  const su = S.su || {}, gr = su.grass != null ? !!su.grass : !!R.lawn; f.grass = gr;   // 276e (owner): grass in the open areas — an option (on by default where the theme has a lawn)
  try { f.zones = flZones(L, R, F, gr); } catch (e) { console.warn(e); f.zones = []; } return f; }
function flZones(L, R, F, grass) {
  const t = S.site, E = P0(), G = 1, W = Math.floor(t.pw - 2 * E), D = Math.floor(t.pd - 2 * E), Z = [], PW = 3.5;
  const fl = o => ['turf', 'pathway', 'lights', 'pergola', 'umbrella', 'plant', 'deck'].includes(o.cat) || (o.cat === 'planter' && !o.frp && !o.pick) || att(o) || o.segs;
  const solid = S.items.filter(o => !fl(o)).map(rectI).concat((t.kind === 'terrace' ? t.blocks : []).map(b => ({ x: +b.x, z: +b.z, w: +b.w, d: +b.d })));
  const hit = (r, ex) => solid.some(q => q !== ex && r.x < q.x + q.w - 0.05 && q.x < r.x + r.w - 0.05 && r.z < q.z + q.d - 0.05 && q.z < r.z + r.d - 0.05);
  const free = r => inside(r) && !hit(r), cl = r => { const x0 = Math.max(E, r.x), z0 = Math.max(E, r.z), x1 = Math.min(t.pw - E, r.x + r.w), z1 = Math.min(t.pd - E, r.z + r.d); return x1 - x0 > 0.8 && z1 - z0 > 0.8 ? { x: x0, z: z0, w: x1 - x0, d: z1 - z0 } : null; };
  const cc = (i, j) => [E + i + 0.5, E + j + 0.5];
  // groups: seating (sofa / dining / fixed seating + chairs / table / stool / fire pit within 2 ft); targets the paths go to
  const used = new Set(), grp = [];
  S.items.filter(o => ['sofa', 'dining', 'fbench'].includes(o.cat) && !o.old && !att(o)).forEach(o => { if (used.has(o)) return; let r = rectI(o); used.add(o); const mem = [o];
    S.items.forEach(q => { if (used.has(q) || !['chair', 'table', 'stool', 'firepit'].includes(q.cat) || (q.cat === 'firepit' && o.cat === 'dining')) return; const b = rectI(q); if (b.x > r.x + r.w + 2 || b.x + b.w < r.x - 2 || b.z > r.z + r.d + 2 || b.z + b.d < r.z - 2) return; used.add(q); mem.push(q); const x0 = Math.min(r.x, b.x), z0 = Math.min(r.z, b.z); r = { x: x0, z: z0, w: Math.max(r.x + r.w, b.x + b.w) - x0, d: Math.max(r.z + r.d, b.z + b.d) - z0 }; });
    grp.push({ r, mem, k: o.cat }); });
  const tg = grp.map(g => g.r).concat(S.items.filter(o => !used.has(o) && ['firepit', 'jacuzzi', 'bar', 'swing', 'deck', 'cabin'].includes(o.cat) && !o.old).map(rectI)).concat(S.items.filter(o => o.cat === 'pergola' && !o.old && !grp.some(g => { const p = rectI(o); return g.r.x + g.r.w / 2 > p.x && g.r.x + g.r.w / 2 < p.x + p.w && g.r.z + g.r.d / 2 > p.z && g.r.z + g.r.d / 2 < p.z + p.d; })).map(rectI));
  const bl = (t.blocks || []).filter(b => ['mumty', 'room', 'lift', 'troom'].includes(b.type)), dzs = doorZones(), mi = bl.findIndex(b => b.type === 'mumty'), dz = dzs[mi >= 0 ? mi : 0];
  // grid: a cell can carry a PW-wide path when the square round its centre is free
  const ok = [], onP = []; for (let j = 0; j < D; j++) { ok.push([]); onP.push([]); for (let i = 0; i < W; i++) { const [x, z] = cc(i, j); ok[j].push(free({ x: x - PW / 2, z: z - PW / 2, w: PW, d: PW })); onP[j].push(0); } }
  const near = (r, i, j, m) => { const [x, z] = cc(i, j); return x >= r.x - m && x <= r.x + r.w + m && z >= r.z - m && z <= r.z + r.d + m; };
  function route(starts, goal) {   // Dijkstra on (cell, direction), turns cost 3 — few turns, round everything
    const H = [], push = (c, i, j, d, pv) => { H.push([c, i, j, d, pv]); let n = H.length - 1; while (n) { const p = (n - 1) >> 1; if (H[p][0] <= H[n][0]) break; [H[p], H[n]] = [H[n], H[p]]; n = p; } }, pop = () => { const top = H[0], last = H.pop(); if (H.length) { H[0] = last; let n = 0; for (;;) { const l = 2 * n + 1, r = l + 1; let m = n; if (l < H.length && H[l][0] < H[m][0]) m = l; if (r < H.length && H[r][0] < H[m][0]) m = r; if (m === n) break; [H[m], H[n]] = [H[n], H[m]]; n = m; } } return top; };
    const seen = new Map(), DIR = [[1, 0], [-1, 0], [0, 1], [0, -1]]; starts.forEach(([i, j]) => push(0, i, j, -1, null)); let end = null, guard = 0;
    while (H.length && guard++ < 60000) { const cur = pop(), [c, i, j, d] = cur, key = (j * W + i) * 5 + d + 1; if (seen.has(key)) continue; seen.set(key, cur); if (goal(i, j)) { end = cur; break; }
      DIR.forEach(([di, dj], nd) => { const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= D || !ok[nj][ni]) return; push(c + (onP[nj][ni] ? 0.4 : 1) + (d >= 0 && d !== nd ? 3 : 0), ni, nj, nd, cur); }); }
    const out = []; for (let n = end; n; n = n[4]) out.push([n[1], n[2]]); return out.reverse(); }
  const edgeCells = r => { const o = []; for (let m of [0.3, 0.8, 1.3]) { for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) if (ok[j][i] && near(r, i, j, PW / 2 + m) && !near(r, i, j, PW / 2 - 0.2)) o.push([i, j]); if (o.length) break; } return o; };
  let doorC = null; if (dz) { const [x, z] = [dz.x + dz.w / 2, dz.z + dz.d / 2]; let bd = 1e9; for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) if (ok[j][i]) { const [a, b] = cc(i, j), dd = Math.hypot(a - x, b - z); if (dd < bd) { bd = dd; doorC = [i, j]; } } if (bd > 4) doorC = null; }
  const paths = [];   // cell lists, the first from the door
  function network(fromHub) { const T = tg.slice().sort((a, b) => { const o = doorC ? cc(...doorC) : [0, 0]; return Math.hypot(b.x + b.w / 2 - o[0], b.z + b.d / 2 - o[1]) - Math.hypot(a.x + a.w / 2 - o[0], a.z + a.d / 2 - o[1]); });
    if (fromHub) { const hx = fromHub.x + fromHub.w / 2, hz = fromHub.z + fromHub.d / 2, hr2 = fromHub.w / 2, atHub = (i, j) => { const [x, z] = cc(i, j); return Math.hypot(x - hx, z - hz) <= hr2 + 1.3; }; T.concat(doorC ? [{ door: 1 }] : []).forEach(r => { const p = r.door ? route([doorC], atHub) : route(edgeCells(r), atHub); if (p.length) { p.forEach(([i, j]) => onP[j][i] = 1); paths.push(p); } }); return; }
    if (!doorC || !T.length) return; let first = []; for (let ti = 0; ti < T.length && !first.length; ti++) for (const mg of [0.3, 0.8, 1.3, 2]) { first = route([doorC], (i, j) => near(T[ti], i, j, PW / 2 + mg)); if (first.length) break; }   /* 302 (owner): a path runs right up to what it leads to; a target that can't be reached doesn't stop the others */ if (!first.length) return; first.forEach(([i, j]) => onP[j][i] = 1); paths.push(first);
    T.slice(1).forEach(r => { if (paths.some(p => p.some(([i, j]) => near(r, i, j, PW / 2 + 1.3)))) return; const p = route(edgeCells(r), (i, j) => onP[j][i]); if (p.length) { p.forEach(([i, j]) => onP[j][i] = 1); paths.push(p); } }); }
  const runs = (p, w) => { const out = []; let s0 = 0; for (let n = 1; n <= p.length; n++) { const a = p[s0], b = p[n - 1], c = p[n]; const straight = c && (c[0] === a[0] || c[1] === a[1]) && (b[0] === a[0] ? c[0] === a[0] : c[1] === a[1]); if (!straight) { const [x0, z0] = cc(Math.min(a[0], b[0]), Math.min(a[1], b[1])), [x1, z1] = cc(Math.max(a[0], b[0]), Math.max(a[1], b[1])); out.push({ x: x0 - w / 2, z: z0 - w / 2, w: x1 - x0 + w, d: z1 - z0 + w }); s0 = n - 1; } } return out; };
  const PGR = S.items.filter(o => o.cat === 'pergola' && !o.old).map(rectI), underPg = g => PGR.some(p => g.r.x + g.r.w / 2 > p.x && g.r.x + g.r.w / 2 < p.x + p.w && g.r.z + g.r.d / 2 > p.z && g.r.z + g.r.d / 2 < p.z + p.d);
  const rugR = g => underPg(g) ? null : cl({ x: g.r.x - 1.5, z: g.r.z - 1.5, w: g.r.w + 3, d: g.r.d + 3 });   // under a pergola the WPC deck is the 'rug'
  const trimmed = (r, s, y) => { if (R.edge) Z.push(Object.assign({ k: 'prug', s, edge: R.edge, y }, r)); else Z.push(Object.assign({ k: 'prug', s, y }, r)); };
  const fitCircle = (cx, cz, r, own) => { const box = { x: cx - r, z: cz - r, w: 2 * r, d: 2 * r }; if (!inside(box)) return false; return !solid.some(q => !(own || []).some(o => { const b = rectI(o); return Math.abs(b.x - q.x) < 0.01 && Math.abs(b.z - q.z) < 0.01; }) && Math.hypot(Math.max(q.x - cx, 0, cx - q.x - q.w), Math.max(q.z - cz, 0, cz - q.z - q.d)) < r - 0.05); };
  const pgDeck = () => S.items.filter(o => o.cat === 'pergola' && !o.old).forEach(o => { const r = rectI(o); if (S.items.some(q => q.cat === 'deck' && Math.abs(rectI(q).x - r.x) < 1.5 && Math.abs(rectI(q).z - r.z) < 1.5)) return; const c = cl({ x: r.x + 0.2, z: r.z + 0.2, w: r.w - 0.4, d: r.d - 0.4 }); if (c) Z.unshift(Object.assign({ k: 'prug', s: R.deck, wpc: 1 }, c)); });   // decks are WPC boards
  const lawnBlob = (mask, minA) => { let b = null; const hg = new Array(W).fill(0); for (let j = 0; j < D; j++) { for (let i = 0; i < W; i++) hg[i] = mask(i, j) ? hg[i] + 1 : 0; const st = []; for (let i = 0; i <= W; i++) { const hh = i < W ? hg[i] : 0; let s0 = i; while (st.length && st[st.length - 1][1] >= hh) { const [sx, sh] = st.pop(), w = i - sx; if (!b || sh * w > b.a) b = { a: sh * w, i: sx, j: j - sh + 1, w, d: sh }; s0 = sx; } st.push([s0, hh]); } } return b && b.w >= 7 && b.d >= 7 && b.a >= (minA || 60) ? b : null; };
  const ptsRR = (x, z, w, d, rr) => { const o = []; [[x + w - rr, z + rr, -90], [x + w - rr, z + d - rr, 0], [x + rr, z + d - rr, 90], [x + rr, z + rr, 180]].forEach(([cx, cz, a0]) => { for (let k = 0; k <= 6; k++) { const a = (a0 + k * 15) * Math.PI / 180; o.push([cx + rr * Math.cos(a), cz + rr * Math.sin(a)]); } }); return o; };
  const fire = () => S.items.filter(o => o.cat === 'firepit').forEach(o => { const r = rectI(o), cx = r.x + r.w / 2, cz = r.z + r.d / 2, rr = Math.max(r.w, r.d) / 2 + 1.6; if (L === 'curve' && fitCircle(cx, cz, rr, [o])) Z.push({ k: 'circ', s: R.hard, cx, cz, r: rr, y: 0.09, edge: R.edge }); else { const c = cl({ x: r.x - 1.5, z: r.z - 1.5, w: r.w + 3, d: r.d + 3 }); if (c) Z.push(Object.assign({ k: 'prug', s: R.hard, y: 0.09 }, c)); } });   // owner: never grass under a fire pit
  const rugs = () => { if (F.rugs) S.items.filter(o => ['sofa', 'dining'].includes(o.cat) && !o.old).forEach(o => { const r = rectI(o); Z.push({ k: 'rug', s: F.rugs, x: r.x - 0.6, z: r.z - 0.6, w: r.w + 1.2, d: r.d + 1.2, y: 0.03 }); if (F.jute) { const rr = Math.min(Math.max(r.w, r.d) * 0.55, 4.5); Z.push({ k: 'rug', s: 'jute', x: r.x + r.w * 0.62 - rr / 2, z: r.z + r.d * 0.6 - rr / 2, w: rr, d: rr, y: 0.04 }); } }); };
  let LW = null; if (grass && L !== 'deck') { const gc = grp.map(g => [g.r.x + g.r.w / 2, g.r.z + g.r.d / 2, Math.hypot(g.r.w, g.r.d) / 2 + 1.5]), fp = S.items.filter(o => o.cat === 'firepit').map(o => { const r = rectI(o); return [r.x + r.w / 2, r.z + r.d / 2]; });
    const b = lawnBlob((i, j) => { const [x, z] = cc(i, j); return free({ x: x - 0.5, z: z - 0.5, w: 1, d: 1 }) && !(dz && x > dz.x - 1.5 && x < dz.x + dz.w + 1.5 && z > dz.z - 1.5 && z < dz.z + dz.d + 1.5) && !gc.some(([a, b2, r]) => Math.hypot(x - a, z - b2) < r) && !fp.some(([a, b2]) => Math.hypot(x - a, z - b2) < 4.5) && !PGR.some(q => x > q.x - 0.5 && x < q.x + q.w + 0.5 && z > q.z - 0.5 && z < q.z + q.d + 0.5); }, 50);
    if (b) { LW = { x: E + b.i + 0.3, z: E + b.j + 0.3, w: b.w - 0.6, d: b.d - 0.6 }; Z.unshift({ k: 'poly', s: 'turf', pts: ptsRR(LW.x, LW.z, LW.w, LW.d, Math.min(LW.w, LW.d) * 0.3), y: 0.004 }); } }
  const onLawn = (x, z) => !!LW && x > LW.x + 0.6 && x < LW.x + LW.w - 0.6 && z > LW.z + 0.6 && z < LW.z + LW.d - 0.6;
  const splitP = p => { const sg = []; let cur = null; p.forEach(c => { const lw = onLawn(...cc(c[0], c[1])); if (!cur || cur.lw !== lw) { cur = { lw, c: [] }; sg.push(cur); } cur.c.push(c); }); return sg; };
  const stonesOn = cells => { for (let n = 1; n < cells.length; n += 3) { const [x, z] = cc(...cells[n]), [px, pz] = cc(...cells[n - 1]); Z.push({ k: 'stone', cx: x, cz: z, rx: 1.2, rz: 0.9, rot: Math.atan2(z - pz, x - px) * 180 / Math.PI + 90, c: R.stone[n % R.stone.length] }); } };   // owner: stepping stones only across the grass
  const layRuns = (w, y, edge) => { const RS = []; paths.forEach(p => splitP(p).forEach(sg => sg.lw ? stonesOn(sg.c) : RS.push(...runs(sg.c, w)))); if (edge) RS.forEach(r => Z.push(Object.assign({ k: 'prug', s: R.path, edge, y: y - 0.001, run: 1, eonly: 1 }, r))); RS.forEach(r => Z.push(Object.assign({ k: 'prug', s: R.path, y, run: 1 }, r))); };
  pgDeck();
  if (L === 'runner') {   // a runner from the stairs door to every sitting area, a rug of the same tiles under each
    network(); grp.forEach(g => { const c = rugR(g); if (c) trimmed(c, R.rug, 0.005); });
    layRuns(PW, 0.003, R.edge); }
  else if (L === 'curve') {   // stepping stones on a smooth curve, round pods, a curved lawn
    network(); const pods = [];
    grp.forEach(g => { if (underPg(g)) return; const cx = g.r.x + g.r.w / 2, cz = g.r.z + g.r.d / 2; let r = Math.hypot(g.r.w, g.r.d) / 2 + 1.2; while (r > Math.max(g.r.w, g.r.d) / 2 + 0.3 && !fitCircle(cx, cz, r, g.mem)) r -= 0.5; if (fitCircle(cx, cz, r, g.mem)) { pods.push({ cx, cz, r }); Z.push({ k: 'circ', s: g.k === 'dining' ? R.rug : R.deck, cx, cz, r, y: 0.006, edge: R.edge, wpc: g.k !== 'dining' }); } else { const c = rugR(g); if (c) trimmed(c, R.rug, 0.005); } });
    const inPod = (x, z, m) => pods.some(p => Math.hypot(x - p.cx, z - p.cz) < p.r + (m || 0));
    const stoneOk = (x, z) => inside({ x: x - 1.2, z: z - 1.2, w: 2.4, d: 2.4 }) && !hit({ x: x - 1.1, z: z - 0.9, w: 2.2, d: 1.8 }) && !inPod(x, z, 0.4);
    paths.forEach(p => { const all = p.map(([i, j]) => cc(i, j)); if (all.length < 2) return;   // a Catmull-Rom curve through a waypoint every ~7 ft of the route, swung a little side to side
      const wp = [all[0]]; for (let n = 7; n < all.length - 3; n += 7) wp.push(all[n]); wp.push(all[all.length - 1]);
      const sw = wp.map((q, n) => { if (n === 0 || n === wp.length - 1) return q; const a = wp[n - 1], b = wp[n + 1], dx = b[0] - a[0], dz = b[1] - a[1], L2 = Math.hypot(dx, dz) || 1, o = (n % 2 ? 1.2 : -1.2), c = [q[0] - dz / L2 * o, q[1] + dx / L2 * o]; return stoneOk(c[0], c[1]) && !hit({ x: c[0] - 2, z: c[1] - 2, w: 4, d: 4 }) ? c : q; });
      const P4 = [sw[0]].concat(sw, [sw[sw.length - 1]]), pts = []; for (let n = 1; n < P4.length - 2; n++) { const [p0, p1, p2, p3] = [P4[n - 1], P4[n], P4[n + 1], P4[n + 2]]; for (let u = 0; u < 1; u += 0.05) { const u2 = u * u, u3 = u2 * u; pts.push([0, 1].map(c => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * u + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * u2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * u3))); } } pts.push(sw[sw.length - 1]);
      const off = (Q, w) => { const A = [], B = []; Q.forEach((q, n) => { const a = Q[Math.max(0, n - 1)], b = Q[Math.min(Q.length - 1, n + 1)], dx = b[0] - a[0], dz = b[1] - a[1], L2 = Math.hypot(dx, dz) || 1, nx = -dz / L2, nz = dx / L2; A.push([q[0] + nx * w, q[1] + nz * w]); B.push([q[0] - nx * w, q[1] - nz * w]); }); return A.concat(B.reverse()); };
      const spans = []; let cur = null; pts.forEach(q => { const lw = onLawn(q[0], q[1]); if (!cur || cur.lw !== lw) { cur = { lw, q: [] }; spans.push(cur); } cur.q.push(q); });
      spans.forEach(sp => { if (sp.lw) { let acc = 1.3; for (let n = 1; n < sp.q.length; n++) { const [a, b] = [sp.q[n - 1], sp.q[n]]; acc += Math.hypot(b[0] - a[0], b[1] - a[1]); if (acc < 2.6) continue; acc = 0; Z.push({ k: 'stone', cx: b[0], cz: b[1], rx: 1.2, rz: 0.9, rot: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI + 90, c: R.stone[n % R.stone.length] }); } return; }   // stepping stones across the grass
        if (sp.q.length < 2) return; if (R.edge) Z.push({ k: 'poly', s: '#edge', c: R.edge, pts: off(sp.q, 1.8), y: 0.002, run: 1 }); Z.push({ k: 'poly', s: R.path, pts: off(sp.q, 1.5), y: 0.003, run: 1 }); }); });   // owner: never stones over tiles — on the floor a laid strip
    const lb = lawnBlob((i, j) => { const [x, z] = cc(i, j); return free({ x: x - 0.5, z: z - 0.5, w: 1, d: 1 }) && !onP[j][i] && !inPod(x, z, 1.5) && !(dz && x > dz.x - 1 && x < dz.x + dz.w + 1 && z > dz.z - 1 && z < dz.z + dz.d + 1) && !S.items.some(o => o.cat === 'firepit' && Math.hypot(x - (rectI(o).x + rectI(o).w / 2), z - (rectI(o).z + rectI(o).d / 2)) < 4.5); }, 50);
    if (lb && !grass) { const x = E + lb.i + 0.3, z = E + lb.j + 0.3, w = lb.w - 0.6, d = lb.d - 0.6, rr = Math.min(w, d) * 0.42; Z.unshift({ k: 'poly', s: 'peb', pts: ptsRR(x, z, w, d, rr), y: 0.004 }); } }
  else if (L === 'frame') {   // band all round (floor.border), diagonal field, a medallion in the biggest open spot
    const b = lawnBlob((i, j) => { const [x, z] = cc(i, j); return free({ x: x - 0.5, z: z - 0.5, w: 1, d: 1 }) && !(LW && x > LW.x - 1 && x < LW.x + LW.w + 1 && z > LW.z - 1 && z < LW.z + LW.d + 1) && !(dz && x > dz.x - 1 && x < dz.x + dz.w + 1 && z > dz.z - 1 && z < dz.z + dz.d + 1); }, 40);
    if (b) { const r = Math.min(4.5, Math.min(b.w, b.d) / 2 - 1), cx = E + b.i + b.w / 2, cz = E + b.j + b.d / 2; if (r >= 2.5) { Z.push({ k: 'circ', s: R.hub, cx, cz, r, y: 0.006, edge: R.edge || '#3A3835' }); if (R.inlay) Z.push({ k: 'inlay', s: R.inlay, x: cx - r * 0.45, z: cz - r * 0.45, w: r * 0.9, d: r * 0.9 }); } }
    grp.filter(g => g.k === 'dining').forEach(g => { const c = rugR(g); if (c) trimmed(c, R.rug, 0.005); }); }
  else if (L === 'hub') {   // a round hub between the sitting areas, paths out to each and to the stairs
    let cx = 0, cz = 0, n = 0; tg.forEach(r => { cx += r.x + r.w / 2; cz += r.z + r.d / 2; n++; }); if (n) { cx /= n; cz /= n; } else { cx = t.pw / 2; cz = t.pd / 2; }
    let best = null, hr = 5; const ob = lawnBlob((i, j) => { const [x, z] = cc(i, j); return free({ x: x - 0.5, z: z - 0.5, w: 1, d: 1 }) && !onLawn(x, z) && !(dz && x > dz.x - 2 && x < dz.x + dz.w + 2 && z > dz.z - 2 && z < dz.z + dz.d + 2); }, 50); if (ob) { const r0 = Math.min(5.5, Math.min(ob.w, ob.d) / 2 - 0.8); if (r0 >= 3) { cx = E + ob.i + ob.w / 2; cz = E + ob.j + ob.d / 2; } }   // the middle of the biggest open floor
    for (; hr >= 3 && !best; hr -= 0.5) { let bd = 1e9; for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) { const [x, z] = cc(i, j); if (!fitCircle(x, z, hr) || (LW && x + hr > LW.x && x - hr < LW.x + LW.w && z + hr > LW.z && z - hr < LW.z + LW.d) || (dz && Math.hypot(x - dz.x - dz.w / 2, z - dz.z - dz.d / 2) < hr + 2.5)) continue; const dd = Math.hypot(x - cx, z - cz); if (dd < bd) { bd = dd; best = [x, z, hr]; } } }
    if (best) { const [x, z, r] = best, hubR = { x: x - r, z: z - r, w: 2 * r, d: 2 * r }; for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) { const [a, b2] = cc(i, j); if (Math.hypot(a - x, b2 - z) < r - 1) ok[j][i] = false; }
      network(hubR); layRuns(3, 0.003);
      Z.push({ k: 'circ', s: R.hub, cx: x, cz: z, r, y: 0.008, edge: R.edge || '#3A3835' }); if (R.inlay) Z.push({ k: 'inlay', s: R.inlay, x: x - r * 0.4, z: z - r * 0.4, w: r * 0.8, d: r * 0.8 }); }
    else { network(); layRuns(3, 0.003); }
    grp.forEach(g => { const c = rugR(g); if (c) trimmed(c, R.rug, 0.005); }); }
  else if (L === 'deck') {   // planter beds along the open parapets (not the road side), a WPC deck under the lounge, checker floor
    const road = t.road_back ? 'back' : 'front', dzz = doorZones(), bedD = 2;
    ['back', 'left', 'right', 'front'].filter(sd => sd !== road).forEach(sd => { const along = sd === 'back' || sd === 'front', Lx = along ? t.pw : t.pd; let st = null; const seg = [];
      for (let u = E; u <= Lx - E + 0.01; u += 0.5) { const r = along ? { x: u, z: sd === 'back' ? E : t.pd - E - bedD, w: 0.5, d: bedD } : { x: sd === 'left' ? E : t.pw - E - bedD, z: u, w: bedD, d: 0.5 };
        const ok2 = u + 0.5 <= Lx - E + 0.01 && free({ x: r.x - (along ? 0 : 0), z: r.z, w: r.w, d: r.d }) && !dzz.some(q => r.x < q.x + q.w + 1 && q.x - 1 < r.x + r.w && r.z < q.z + q.d + 1 && q.z - 1 < r.z + r.d) && !hit({ x: r.x - (along ? 0 : 1.5), z: r.z - (along ? 1.5 : 0), w: r.w + (along ? 0 : 3), d: r.d + (along ? 3 : 0) });
        if (ok2 && st == null) st = u; if (!ok2 && st != null) { if (u - st >= 4) seg.push([st, u]); st = null; } }
      seg.forEach(([a, b2]) => Z.push(along ? { k: 'bed', x: a + 0.25, z: sd === 'back' ? E : t.pd - E - bedD, w: b2 - a - 0.5, d: bedD } : { k: 'bed', x: sd === 'left' ? E : t.pw - E - bedD, z: a + 0.25, w: bedD, d: b2 - a - 0.5 })); });
    const lg = grp.find(g => g.k === 'sofa' || g.k === 'fbench') || grp[0]; if (lg) { const c = rugR(lg); if (c) Z.push(Object.assign({ k: 'prug', s: R.deck, wpc: 1, y: 0.006 }, c)); } }
  else if (L === 'bands') {   // bands across the short way, one just in front of / behind the main seating, then every ~10 ft
    const across = t.pw <= t.pd, Lx = across ? t.pd : t.pw, bw = 1.33, lg = grp.find(g => g.k === 'sofa' || g.k === 'fbench') || grp[0], at = [];
    if (lg) { const a = across ? lg.r.z : lg.r.x, b2 = across ? lg.r.z + lg.r.d : lg.r.x + lg.r.w; at.push(a - 1.5 - bw, b2 + 1.5); }
    let u = at.length ? at[at.length - 1] + 10 : E + 6; while (u < Lx - E - 3) { if (!at.some(v => Math.abs(v - u) < 7)) at.push(u); u += 10; } u = at.length ? at[0] - 10 : 0; while (u > E + 3) { if (!at.some(v => Math.abs(v - u) < 7)) at.push(u); u -= 10; }
    at.filter(v => v > E + 1 && v < Lx - E - bw - 1).forEach(v => { const blks = (t.blocks || []).map(b => across ? [b.x, b.x + b.w, b.z, b.z + b.d] : [b.z, b.z + b.d, b.x, b.x + b.w]).filter(q => v + bw > q[2] && v < q[3]).sort((a, b2) => a[0] - b2[0]); let s0 = E; blks.concat(LW && (across ? v + bw > LW.z && v < LW.z + LW.d : v + bw > LW.x && v < LW.x + LW.w) ? [across ? [LW.x - 0.3, LW.x + LW.w + 0.3] : [LW.z - 0.3, LW.z + LW.d + 0.3]] : []).sort((a, b2) => a[0] - b2[0]).concat([[(across ? t.pw : t.pd) - E, 0]]).forEach(q => {   // no band across the lawn
       if (q[0] - s0 > 1) Z.push(Object.assign({ k: 'prug', s: R.band, y: 0.003 }, across ? { x: s0, z: v, w: q[0] - s0, d: bw } : { x: v, z: s0, w: bw, d: q[0] - s0 })); s0 = Math.max(s0, q[1]); }); });
    grp.filter(g => g.k === 'dining').forEach(g => { const c = rugR(g); if (c) trimmed(c, R.rug, 0.005); }); }
  fire(); rugs(); return Z; }
function flayThumb(k, L) { const f = floorFor(k, L); try { return P2.svg(Object.assign({}, S.site, { floor: f }), { items: S.items.filter(o => !o.segs), road: [S.site.road_back ? 'back' : 'front'] }); } catch (e) { return ''; } }
const COP0 = [['none', 'No coping (plaster)'], ['cement', 'Cement band'], ['kota', 'Kota stone'], ['granite', 'Granite'], ['marble', 'Marble'], ['sandstone', 'Sandstone'], ['tiles', 'Tiles']], COPN = [['granite', 'Granite'], ['kota', 'Kota stone'], ['marble', 'Marble'], ['sandstone', 'Sandstone']];
const flAct = () => (S.su && S.su.flAct) || ((S.su && S.su.rm && S.su.rm.floor0) ? 'change' : 'keep');
function suWorks() {   // 273 (owner): the coping on the parapet (site.coping, drawn by cabin3d) + floor / coping work as items our team prices
  const su = S.su, t = S.site; if (!su) return; S.items = S.items.filter(o => o.cat !== 'works'); delete t.coping; const c = su.cop || {}, has = c.has && c.has !== 'none', nm = k => ((COP0.concat(COPN).find(z => z[0] === k) || [0, k])[1] || '').toLowerCase(), W = l => S.items.push({ cat: 'works', mode: 'mst', label: l, x: 0, z: 0, w: 0, d: 0, rot: 0 });
  if (t.kind === 'terrace') { if (has && c.act === 'change' && c.want) { t.coping = { mat: c.want, state: 'new' }; W('New coping on the parapet — ' + nm(c.want) + ' (old one removed)'); }
    else if (has) { t.coping = { mat: c.has, state: c.act === 'refurb' ? 'refurb' : 'old' }; if (c.act === 'refurb') W('Refurbish the parapet coping (' + nm(c.has) + ')'); }
    else if (c.want) { t.coping = { mat: c.want, state: 'new' }; W('Coping on the parapet — ' + nm(c.want)); } }
  if (flAct() === 'refurb') W('Refurbish the floor (' + ((FLOOR0.find(z => z[0] === su.floor0) || [0, 'floor'])[1] || '').toLowerCase() + ') — ' + (su.floor0 === 'cement' ? 'repair cracks, re-plaster' : 'polish, repair, re-grout'));
  else if (flAct() === 'change') W('Old floor taken out for the new one'); }
const SEEP_AMT = [['little', 'A little', 'a patch or two', 'water'], ['some', 'Quite a bit', 'several places', 'water'], ['whole', 'The whole roof', 'leaks all over', 'water']];   // 278 (owner)
const SEEP_FIX = [['grout', 'Just grouting', 'fill the open joints of the floor', 'brush'], ['redo', 'Remove the floor, redo waterproofing + new floor', 'the usual fix', 'tiles'], ['slab', 'Dig down to the slab, waterproof from there', 'for old, deep leaks', 'brick']];
const HEAT = [['done', 'Already done', 'it is heatproofed', 'check'], ['no', 'Not done, not needed', '', 'none'], ['want', 'Want it done', 'cooler rooms below', 'sun']];
const MST = [['none', 'None'], ['ladder', 'Monkey ladder'], ['ms', 'MS staircase'], ['spiral', 'Spiral staircase']];
function mstSide() { const M = (S.site.blocks || []).find(b => b.type === 'mumty'), door = geo().door, o = ['left', 'right', 'back', 'front'].filter(f => f !== door && (!M || pOpen(M, f))); return o[0] || 'left'; }
function rxTiles() { const bl = S.site.blocks || [], X = S.su.wantX || {}, L = [];   // 268 (owner): new roof-stairs / tank screen / shaft cover are picked with the main elements
  if (bl.some(b => b.type === 'mumty')) { L.push(['mst', 'Stairs to the tank roof', 'stairs']); if (S.site.tanks !== false) L.push(['tank', (S.su.tankHas ? 'New screen' : 'Screen') + ' round the tanks', 'privacy']); }
  if (bl.some(b => b.type === 'shaft')) L.push(['shaft', 'Shaft cover', 'shaftcover']); if (!L.length) return '';
  return '<p class="pl-h" style="margin-top:14px">On the stairs room & shafts</p><div class="pl-els pl-els2">' + L.map(([k, t, ic]) => `<div class="pl-elw"><button type="button" data-su="rx:${k}" class="${X[k] ? 'on' : ''}"><i>${P2.ico(ic)}</i><b>${esc(t)}</b>${X[k] ? '<em>✓</em>' : ''}</button></div>`).join('') + '</div>'; }
function exSync() { const su = S.su; if (!su) return; const m = su.mst = su.mst || {};   // 268: the old fields the layout code reads, from "what stands" + "what is wanted"
  if (!su.wantX) { su.wantX = { mst: m.act === 'change' || (!(m.has && m.has !== 'none') && !!m.want && m.want !== 'none'), tank: su.tankScr === true, shaft: su.shaft === 'change' || su.shaft === 'new' }; if (m.want && m.want !== 'none') su.mstNew = m.want; if (m.act === 'change') m.act = 'keep'; }
  const X = su.wantX, has = m.has && m.has !== 'none'; m.want = X.mst ? su.mstNew || 'ms' : 'none'; if (X.mst && has) m.act = 'change'; else if (m.act === 'change') m.act = 'keep';
  su.tankScr = !!X.tank; su.shaft = X.shaft ? (su.shaftNow && su.shaftNow !== 'none' ? 'change' : 'new') : 'keep'; }
function suMst() {   // site.mstair = what stands there (drawn by cabin3d); an item when something is to be made (priced by our team)
  exSync(); const su = S.su, m = su.mst || {}, t = S.site; S.items = S.items.filter(o => o.cat !== 'mstair'); delete t.mstair; if (!(t.blocks || []).some(b => b.type === 'mumty')) return;
  const gone = (su.rm || {}).mstair, has = m.has && m.has !== 'none' && !gone, side = m.side || mstSide(), type = has ? (m.act === 'change' ? m.want || 'ms' : m.has) : !gone && m.want && m.want !== 'none' ? m.want : null; if (!type) return;
  const st = has ? (m.act === 'change' ? 'new' : m.act === 'refurb' ? 'refurb' : 'old') : 'new'; t.mstair = { type, side, state: st }; ['a0', 'a', 'run', 'w', 'rev'].forEach(k => { if (m[k] != null) t.mstair[k] = m[k]; });   // 302: moved / sized on the 2D plan
  const G = mstGeom(t, (t.blocks || []).find(b => b.type === 'mumty')), F = G ? G.foot : { x: 0, z: 0, w: 0, d: 0 };   // 302 (owner): drawn on the 2D plan where it stands — pick it to move it along the stairs room, size it, change its kind
  S.items.push(Object.assign({ cat: 'mstair', mode: 'mst', label: (st === 'old' ? 'Existing: ' : '') + (MST.find(z => z[0] === type) || [0, 'Staircase'])[1] + ' to the stairs-room roof' + (st === 'refurb' ? ' (refurbish)' : ''), rot: 0 }, st === 'old' ? { old: true } : {}, { x: F.x, z: F.z, w: F.w, d: F.d })); }
function mstDrop(it) {   // 302: dropped on the 2D plan → the stairs room wall nearest its middle, at that point along it
  const su = S.su, t = S.site, M0 = (t.blocks || []).find(b => b.type === 'mumty'); if (!M0 || !t.mstair) return; const cx = it.x + it.w / 2, cz = it.z + it.d / 2, m = su.mst = su.mst || {};
  const d = { left: Math.abs(cx - M0.x), right: Math.abs(cx - (M0.x + M0.w)), back: Math.abs(cz - M0.z), front: Math.abs(cz - (M0.z + M0.d)) }, door = M0.door;
  const sd = Object.keys(d).filter(k => (k !== door || t.mstair.type !== 'ms') && pOpen(M0, k)).sort((a, b) => d[a] - d[b])[0]; if (!sd) return suMst();   /* only a wall with open terrace in front of it */ const xs = sd === 'left' || sd === 'right', a = xs ? cz - M0.z : cx - M0.x;
  m.side = sd; const G0 = mstGeom(Object.assign({}, t, { mstair: Object.assign({}, t.mstair, { side: sd }) }), M0); if (!G0) return;
  if (G0.type === 'ms') m.a0 = Math.round((a - G0.run / 2) * 2) / 2; else m.a = Math.round(a * 2) / 2; suMst(); }
const SMAT_NOW = [['none', 'Nothing / open'], ['poly', 'Polycarbonate'], ['glass', 'Glass'], ['cement', 'Cement sheet'], ['grill', 'MS grill']];
const SMAT = [['poly', 'Polycarbonate (MS frame)'], ['glass', 'Toughened glass, walk-on'], ['grill', 'MS grating'], ['louvre', 'Aluminium louvres']];
const PMAT = [['cement', 'Cement board (painted)', 'Pipe cover — cement board, opens'], ['jali', 'MS jali', 'Pipe cover — MS jali, opens'], ['louvre', 'Aluminium louvres', 'Pipe cover — louvres, opens'], ['wpc', 'WPC slats', 'Pipe cover — WPC slats, opens']];
const ADDQ = { sofa: 'sofa', cabin: 'cabin', bar: 'bar', fbench: 'fbs', water: 'wtr' };   // 284: the feature wall's design is picked on the theme step   // 278: a pergola has no 'how big' screen any more
function suSigNow() { const su = S.su; if (!su) return; if (!su.dirty) { su.elSig = suSig(); su.pf = pfAll(); } if (!su.dirty && !su.ddirty && su.decorDone) su.dSig = suSig(); }
function suToast(tx, bad) { if (!SUEL || QUIET) return; let d = SUEL.querySelector('.pl-toast'); if (!d) { d = document.createElement('div'); d.className = 'pl-toast'; SUEL.appendChild(d); } d.textContent = tx; d.classList.toggle('bad', !!bad); d.classList.add('on'); clearTimeout(d._t); d._t = setTimeout(() => d.classList.remove('on'), tx.length > 40 ? 3800 : 2200); }
function suElPos() { return JSON.stringify(S.items.filter(o => !DECOR.has(o.cat)).map(o => [o.cat, o.x, o.z, o.w, o.d, o.rot || 0])); }
function decorFit() {   // 260 (owner): the main pieces changed on their 2D plan → furniture / plants that now clash move to the nearest free spot (or come off)
  let mv = 0, gone = 0; for (let i = 0; i < S.items.length; i++) { const it = S.items[i]; if (!DECOR.has(it.cat) || it.old || att(it) || !clashes(it, i)) continue;
    if (settle(it, i, [it.x, it.z])) mv++; else { S.items.splice(i, 1); i--; gone++; } }
  return mv || gone ? (mv ? mv + ' piece' + (mv > 1 ? 's' : '') + ' of furniture / plants moved to fit' : '') + (gone ? (mv ? ', ' : '') + gone + ' taken off (no room)' : '') : ''; }
function addWith(k, n) { const su = S.su;
  if (k === 'fbench') { const sh = (su.fbs || [])[n] || 'L', pl = (su.fbp || [])[n] || 'none';
    if (sh === 'L') { const n0 = S.items.length; if (!lSeat(geo(), [8, 6], null, [], [], pl)) { S.msg = 'No free corner for L seating — move things to make room'; return false; } S.sel = n0; S.suMv = true; return true; }
    const it = newItem('fbench'); if (!it) return false; if (sh === 'curve') Object.assign(it, { w: 6, d: 6, shape: 'curve', label: 'Curved seating' }); else Object.assign(it, { d: pl === 'back' || pl === 'both' ? 4.5 : 3 }); if (pl !== 'none') it.plant = pl; return addPut(it); }
  const it = newItem(k); if (!it) return false;
  if (k === 'sofa') { const c = (suSofa()[n] || ['5']).slice(), L = P2.sofaLayout(c); Object.assign(it, { sconf: c, w: L.w, d: L.d }); }
  if (k === 'bar') { const b = suBars()[n]; if (b === 'L') Object.assign(it, { w: 8, d: 5, shape: 'L', label: 'Bar counter (L)' }); else if (b === 'curve') Object.assign(it, { w: 8, d: 5, shape: 'curve', label: 'Curved bar' }); }
  if (k === 'water') wApply(it, (su.wm || [])[n] || 'cascade');
  if (k === 'feature') { it.fdesign = (su.fd || [])[n] || 'fluted'; it.label = (FDES.find(z => z[0] === it.fdesign) || [0, 'Feature wall'])[1]; }
  if (k === 'pergola') { const z = { '2-4': [10, 9], '5-8': [12, 10], '9-12': [16, 12], '12+': [18, 13] }[suPgs()[n] || su.pg || '5-8']; if (z) Object.assign(it, { w: z[0], d: z[1] }); }
  if (k === 'cabin') { const c = suCab()[n] || {}; it.sku = cabSkuFor(c.glaze || 'mostly'); it.layout = null; it.lsku = null; cabinFoot(it); it.purpose = (c.use || []).slice(); it.label = it.purpose.length ? 'Cabin · ' + it.purpose.join(', ') : prodName(it.sku, 'Cabin'); if (suDoors(c).length) it.rot = CAB_ROT[suDoors(c)[0]]; }
  const ok = addPut(it); if (ok && k === 'cabin') { const c = suCab()[n] || {}; it.gs = c.gs || 1; it.ldoors = suDoors(c).map(ws => cabLocal(ws, it.rot || 0)).filter(Boolean); it.layBase = null; try { cabWalls(it); } catch (e) {} }
  if (ok && k === 'bar' && SUQ[su.q] === 'plan') try { barStools(it); } catch (e) {}
  return ok; }
function addPut(it) { const i = S.items.length; S.items.push(it); const c = CAT[it.cat] || {}; if (c.kind === 'wall') wallSpot(it, i); else if (c.kind !== 'edge' && i > 0) roomy(it, i);
  if (!settle(it, i)) { S.items.pop(); S.msg = 'No free room for it — move things to make room'; return false; } S.sel = i; S.suMv = true; S.msg = ''; return true; }
// 284 (owner): undo / redo on the 2D plans — every move, size, turn, add or remove on a plan step is one step back
const H2Q = ['asbuilt', 'base', 'eplan', 'plan'], HNAV = new Set(['next', 'back', 'x', 'go2', 'stx', 'stall', 'cta', 'jump', 'sedq', 'sedit', 'ren', 'z2', 'undo', 'redo', 'ssel', 'meas', 'v3']);
const HNK = new Set(['q', 'on', 'rev', 'left', 'exq', 'exK', 'addK', 'edK', 'addRet', 'addD', 'edSnap', 'selOpen', 'before', 'base']);
function hKey() { const su = S.su || {}, A = {}; Object.keys(su).forEach(k => { if (!HNK.has(k)) A[k] = su[k]; }); return JSON.stringify([S.items, (S.site || {}).blocks || [], (S.site || {}).goneIt || [], S.bsel || {}, A]); }
function hOn() { const su = S.su; return !!(su && su.on && H2Q.includes(SUQ[su.q]) && !su.addK && !su.edK); }
function hReset() { const su = S.su; if (!S.h2 || S.h2.q !== (su && su.q)) S.h2 = { q: su && su.q, u: [], r: [] }; return S.h2; }
function hPush(pre) { const H = hReset(); if (pre == null || pre === hKey()) return; H.u.push(pre); if (H.u.length > 40) H.u.shift(); H.r = []; }
function hGo(dir) { const H = hReset(), from = dir === 'undo' ? H.u : H.r, to = dir === 'undo' ? H.r : H.u; if (!from.length) return; to.push(hKey()); const [it, bl, gi, bs, A] = JSON.parse(from.pop()), su = S.su;
  S.items = it; S.site.blocks = bl; S.site.goneIt = gi; S.bsel = bs; Object.keys(su).forEach(k => { if (!HNK.has(k) && !(k in A)) delete su[k]; }); Object.assign(su, A); S.sel = null; S.suMv = false; S.suSz = false; try { cabFixAll(); } catch (e) {} save(); draw(true); suPaint(); suToast(dir === 'undo' ? 'Undone ↶' : 'Redone ↷'); }
function suClick(e) { const b = e.target.closest('[data-su]'); if (!b || b.disabled) return; const k0 = b.getAttribute('data-su').split(':')[0];
  if (k0 === 'undo' || k0 === 'redo') return hGo(k0);
  const rec = hOn() && !HNAV.has(k0), q0 = S.su && S.su.q, pre = rec ? hKey() : null; suClick0(e); if (rec && S.su && S.su.q === q0) { hPush(pre); const z = SUEL && SUEL.querySelector('.pl-z2'); if (z) z.outerHTML = z2bar(); } }
function suClick0(e) { const b = e.target.closest('[data-su]'); if (!b || b.disabled) return; const a = b.getAttribute('data-su').split(':'), su = S.su, adv = () => { su.dirty = true; suStep(1); };
  const toPlan = () => { if (SUQ[su.q] === 'plan' && suChE()) suCompose(); };
  switch (a[0]) {
    case 'x': return exitAsk(() => { if (su.edK) { edRestore(); su.q = su.addRet; } if (su.addK) { S.bsel[su.addK] = Math.max(0, (S.bsel[su.addK] || 1) - 1); su.q = su.addRet; } su.edK = null; su.addK = null; su.edSnap = null; if (su.decorDone) su.done = true; else su.left = true; save(); suClose(); close(); });   // 267: exit mid-way keeps the step; next time it opens there
    case 'back': if (su.edK) { edRestore(); su.q = su.addRet; su.edK = null; su.edSnap = null; [su.dirty, su.ddirty] = su.addD || [false, false]; if (su.edMain) { su.edMain = false; return edDone(); } break; }   // 266: ← cancels the change
      if (su.addK) { const k = su.addK; S.bsel[k] = Math.max(0, (S.bsel[k] || 1) - 1); su.q = su.addRet; su.addK = null; [su.dirty, su.ddirty] = su.addD || [false, false]; suSigNow(); break; }
      if (SUQ[su.q] === 'existing' && (su.exq || 0) > 0) { su.exq--; break; }
      if (su.rev && SUQ[su.q] === 'asbuilt') { su.done = true; return suClose(); }   // 278: back from the first stage of a change → the 3D
      if (su.q > 0) { suStep(-1); if (SUQ[su.q] === 'existing') su.exq = 99; } else return suRoof(); break;
    case 'next': if (su.edK) { const k = su.edK, n = +su.edN || 0, ret = su.addRet, ch = su.edSnap !== edSnap(), em = su.edMain; su.edMain = false; su.edK = null; su.edSnap = null; su.q = ret; const q2 = SUQ[ret];   // 302: em = opened from the 3D's side panel → saved, straight back to the 3D
        if (k[0] !== '@') { [su.dirty, su.ddirty] = su.addD || [false, false]; const ok = ch ? editApply(k, n) : true; suSigNow(); cabFixAll(); if (em && ok) { if (ch) suToast('Changed ✓'); return edDone(); } draw(true); suPaint(); suToast(ok ? (ch ? 'Changed ✓' : 'No change') : (S.msg || 'It doesn\'t fit there'), !ok); return; }
        if (!ch) { if (em) return edDone(); break; } su.dirty = true; if (k === '@have') { su.oldDirty = true; if (q2 === 'asbuilt' || em) suOld(true); }
        if (q2 === 'asbuilt') { draw(true); break; } if (suRefresh(q2)) { if (em) su.edDoneAfter = true; return; } if (em) return edDone(); break; }
      if (su.addK) { const k = su.addK, n = Math.max(0, (S.bsel[k] || 1) - 1); su.addK = null; su.q = su.addRet; [su.dirty, su.ddirty] = su.addD || [false, false]; const ok = addWith(k, n); if (!ok) S.bsel[k] = n; suSigNow(); cabFixAll(); draw(true); suPaint(); suToast(ok ? 'Added ✓ — move it where you want it' : (S.msg || 'No free room for it'), !ok); return; }
      if (SUQ[su.q] === 'existing' && (su.exq || 0) < (S._exn || 1) - 1) { su.exq = (su.exq || 0) + 1; break; }
      if (su.rev && SUQ[su.q] === 'plan') { su.rev = false; try { if (su.thm) themeFloor(su.thm); flPlantsOff(); } catch (e) {} su.done = true; save(); return suClose(); }   // 278: back from 'Change the layout' — floor laid again round the new layout, then the 3D
      { const from = SUQ[su.q]; if (from === 'ab3d' || from === 'asbuilt' && su.rev) su.before = suSnap(); if (['remove', 'base', 'b3d'].includes(from) || from === 'ab3d' && !suRemList().length) { suGone(true); su.base = suSnap(); } suStep(1); const q2 = SUQ[su.q]; if (q2 === 'existing') su.exq = 0;
      if (suRefresh(q2)) return;
      if (q2 === 'plan' && su.elPos && su.elPos !== suElPos()) { const m = decorFit(); su.elPos = suElPos(); if (m) setTimeout(() => suToast(m), 50); } break; }
    case 'mood': { const x = SETUPS.find(z => z.k === a[1]); if (x && S.bth === x.k && Object.keys(S.bsel || {}).length) { suStep(1); break; }   // 255: the same mood again (coming back) keeps what was picked
      su.dirty = true; S.bth = x ? x.k : null; S.bsel = {}; if (x) x.items.forEach(k => { if (CAT[k] && (designs(CAT[k]).length || CAT[k].always)) S.bsel[k] = 1; }); S.bsel.feature = 1; if (S.bsel.pergola) S.bsel.deck = 1; if (S.site.blocks.some(b2 => b2.type === 'ac') && designs(CAT.accover).length) S.bsel.accover = 1; if (S.bsel.turf) su.turf = true; delete S.bsel.dining; delete S.bsel.firepit; if (S.bsel.bar) S.bsel.stool = 1; delete S.bsel.bench;
      su.theme = { party: 'modern', spa: 'tropical', green: 'natural', yoga: 'natural', work: 'modern', chill: 'natural' }[S.bth] || su.theme; adv(); break; }
    case 'bel': S.bsel = S.bsel || {}; if (S.bsel[a[1]]) delete S.bsel[a[1]]; else { S.bsel[a[1]] = 1; if (a[1] === 'pergola') S.bsel.deck = 1; } if (DECOR.has(a[1])) su.ddirty = true; else su.dirty = true; break;   // a pergola comes with a deck (untick it if not wanted)
    case 'bcnt': { const k = a[1], mx = { cabin: 3, pergola: 3, bar: 3, jacuzzi: 2 }[k] || 6, v = (S.bsel[k] || 0) + (+a[2] || 0); if (v <= 0) delete S.bsel[k]; else S.bsel[k] = Math.min(mx, v); if (k === 'cabin') suCab(); if (DECOR.has(k)) su.ddirty = true; else su.dirty = true; break; }
    case 'bshape': suBars()[+a[1]] = a[2]; su.dirty = true; break;
    case 'fbp': (su.fbp = su.fbp || [])[+a[1]] = a[2]; su.dirty = true; break;
    case 'wty': { const ws = suArr('wm', (S.bsel || {}).water || 0, 'cascade'), tys = ws.map(wType), k = a[1], n = tys.indexOf(k);
      if (su.edK === 'water') { const en = +su.edN || 0; if (ws[en] != null) ws[en] = k; su.wm = ws.slice(); su.dirty = true; break; }
      if (su.addK === 'water') { if (ws.length) ws[ws.length - 1] = k; su.wm = ws.slice(); su.dirty = true; break; }   // adding one: pick its type
      if (n >= 0) ws.splice(n, 1); else ws.push(k); su.wm = ws.slice(); S.bsel.water = ws.length; if (!ws.length) delete S.bsel.water; su.dirty = true; break; }
    case 'fbs': case 'wm': case 'fd': case 'gw': { const key = a[0] === 'fbs' ? 'fbs' : a[0]; (su[key] = su[key] || [])[+a[1]] = a.slice(2).join(':'); su.dirty = true; break; }
    case 'ncab': S.bsel.cabin = Math.max(1, Math.min(3, (S.bsel.cabin || 1) + (+a[1] || 0))); suCab(); su.dirty = true; break;
    case 'cuse': { const c = suCab()[+a[1]]; if (c) { const u = a.slice(2).join(':'); c.use = c.use.includes(u) ? c.use.filter(z => z !== u) : c.use.concat(u); } su.dirty = true; break; }
    case 'cin': { const c = suCab()[+a[1]]; if (c) c[a[2]] = !c[a[2]]; su.dirty = true; break; }
    case 'cglz': { const c = suCab()[+a[1]]; if (c) c.glaze = a[2]; su.dirty = true; break; }
    case 'cjd': { const it = S.sel != null ? S.items[S.sel] : null; if (!it || it.cat !== 'cabin') break; it.joinDoor = (it.joinDoor || []).length ? [] : (it.cabTouch || []).slice(); it.joinAsked = true; try { cabWalls(it); } catch (e) {} suToast((it.joinDoor || []).length ? 'Swing door added between the cabins' : 'No door between the cabins'); draw(true); break; }
    case 'cgs': { const c = suCab()[+a[1]]; if (c) c.gs = +a[2]; su.dirty = true; break; }
    case 'cdoor': { const c = suCab()[+a[1]]; if (c) { const d0 = suDoors(c); c.door = a[2] === 'auto' ? [] : d0.includes(a[2]) ? d0.filter(z => z !== a[2]) : d0.concat(a[2]); } su.dirty = true; break; }   // 259: more than one entrance
    case 'pg': { const ps = suPgs(); ps[+a[2] || 0] = a[1]; su.pg = ps[0]; su.dirty = true; break; }
    case 'cs': su.cs = a[1]; su.dirty = true; break;
    case 'stairs': su.stairs = a[1]; su.dirty = true; break;
    case 'rref': su.roomRef = a[1] === '1'; su.dirty = true; break;
    case 'walls': su.walls = a[1]; su.dirty = true; break;
    case 'hv': { su.oldDirty = true; const hv = su.have = su.have || {}; if (hv[a[1]]) { delete hv[a[1]]; delete su.rm['old_' + a[1]]; } else hv[a[1]] = 1; su.dirty = true; break; }
    case 'pgdk': { const v = a[1] === '1'; if (su.pgDeck !== v) { su.pgDeck = v; su.oldDirty = true; su.dirty = true; } break; }
    case 'hvc': { su.oldDirty = true; const hv = su.have = su.have || {}, v = (hv[a[1]] || 0) + (+a[2] || 0); if (v <= 0) delete hv[a[1]]; else hv[a[1]] = Math.min(6, v); su.dirty = true; break; }
    case 'rm': { su.rm = su.rm || {}; if (a[2] === '1') su.rm[a[1]] = true; else delete su.rm[a[1]]; suGone(true); su.dirty = true; break; }   // 284: the things stay where they were put — only shown / hidden
    case 'wrm': su.rm = su.rm || {}; if (a[1] === '1') su.rm.walltiles = true; else delete su.rm.walltiles; su.dirty = true; break;
    case 'fl0': su.floor0 = a[1]; su.dirty = true; fl0Show(); break;
    case 'ren': act(['rename']); return;   // 273
    case 'fmx': { const g = a[1], k = a[2], cur = Object.assign({}, FU_DEF, su.fmix || {}); if (cur[g] === k) break; if (k !== 'fusion' && FU_G.filter(([x]) => x !== g && cur[x] === k).length >= 3) { suToast('At most 3 elements in one theme — that is what keeps it a mix'); break; } su.fmix = Object.assign({}, su.fmix || {}, { [g]: k }); save(); draw(true); ev('plan_fmix', { ref: g + ':' + k }); break; }   // 300
    case 'thm': if (su.thm !== a[1]) { themeApply(a[1]); ev('plan_theme', { ref: a[1] }); } break;   // 274
    case 'fdt': { su.fdU = su.fdU || {}; if (a[2] === (TH_FD[su.thm] || 'fluted')) delete su.fdU[+a[1]]; else su.fdU[+a[1]] = a[2]; fdTheme(); save(); draw(true); break; }   // 284
    case 'flay': if (((S.site.floor || {}).layout) !== a[1]) { su.flay = a[1]; themeApply(su.thm || 'fusion'); ev('plan_flay', { ref: a[1] }); } break;   // 276c
    case 'flmore': S.flMore = true; break;
    case 'grass': su.grass = a[1] === '1'; themeApply(su.thm || 'fusion'); ev('plan_grass', { ref: a[1] }); break;   // 276e
    case 'flact': su.flAct = a[1]; su.rm = su.rm || {}; su.rm.floor0 = a[1] === 'change'; if (a[1] === 'change') { if (su.flr === 'keep') su.flr = null; } else su.flr = 'keep'; su.dirty = true; fl0Show(); try { suWorks(); } catch (e) {} break;   // 273
    case 'cop': { const c = su.cop = su.cop || {}; c[a[1]] = a[2] || ''; if (a[1] === 'has' && a[2] === 'none') c.act = null; su.dirty = true; try { suWorks(); } catch (e) {} break; }
    case 'pipes': su.pipes = a[1] === '1'; su.dirty = true; break;
    case 'pscr': su.pipeScr = a[1] === '1'; su.dirty = true; break;
    case 'pmat': if (su.pipeMat !== a[1]) { su.pipeMat = a[1]; S.items.forEach(o2 => { if (o2.pipe) { o2.pmat = a[1]; o2.label = (PMAT.find(z => z[0] === a[1]) || [0, 0, 'Pipe cover'])[2]; } }); } break;   // 260: changes the cover in place, no new setup
    case 'shh': { const b = (S.site.blocks || [])[+a[1]]; if (b) { const c = shV(b), dd = +a[2] || 0; b.h = Math.max(0, Math.min(14, c + dd * (c < 1 || (c === 1 && dd < 0) ? 0.5 : 1))); } su.dirty = true; break; }   // 252: 0 in / 6 in below 1 ft
    case 'pface': su.pipeFace = a[1]; su.dirty = true; break;
    case 'plr': su.pipeLR = a[1]; su.dirty = true; break;
    case 'wtk': (su.wtile = su.wtile || { c: 'red' }).k = a[1]; su.dirty = true; break;
    case 'wtc': (su.wtile = su.wtile || { k: 'brick' }).c = a[1]; su.dirty = true; break;
    case 'shaft': su.shaft = a[1]; su.dirty = true; break;
    case 'rx': { su.wantX = su.wantX || {}; su.wantX[a[1]] = !su.wantX[a[1]]; su.dirty = true; break; }
    case 'mstn': if (su.mstNew !== a[1]) { su.mstNew = a[1]; su.dirty = true; } break;
    case 'sms': su.shaftMS = a[1] === '1'; su.dirty = true; break;
    case 'mst': { const m = su.mst = su.mst || {}; if (a[1] === 'act') { su.wantX = su.wantX || {}; su.wantX.mst = a[2] === 'change'; if (a[2] === 'change') { su.dirty = true; break; } } if (m[a[1]] !== a[2]) { m[a[1]] = a[2]; if (a[1] === 'has' && a[2] === 'none') { m.act = null; } su.dirty = true; } break; }
    case 'snow': if (su.shaftNow !== a[1]) { su.shaftNow = a[1]; su.dirty = true; } break;
    case 'snew': if (su.shaftNew !== a[1]) { su.shaftNew = a[1]; S.items.forEach(o2 => { if (o2.cat === 'shaftcover' && !o2.old) { o2.smat = a[1]; o2.label = 'Shaft cover — ' + (SMAT.find(z => z[0] === a[1]) || [0, ''])[1].toLowerCase(); } }); } break;
    case 'tscr': su.tankScr = a[1] === '1'; su.dirty = true; break;
    case 'seep': { const sp = su.seep = su.seep || {}; sp[a[1]] = a[1] === 'has' ? a[2] === '1' : a[2]; if (sp.has && !sp.amt) sp.amt = 'some'; if (sp.has && !sp.fix) sp.fix = 'redo'; su.dirty = true; break; }   // 278
    case 'heat': su.heat = a[1]; su.dirty = true; break;
    case 'mstw': { su.wantX = su.wantX || {}; if (a[1] === 'no') su.wantX.mst = false; else { su.wantX.mst = true; su.mstNew = a[1]; } su.dirty = true; break; }
    case 'tw': su.wantX = su.wantX || {}; su.wantX.tank = a[1] === '1'; su.dirty = true; break;
    case 'sw': su.wantX = su.wantX || {}; su.wantX.shaft = a[1] === '1'; su.dirty = true; break;
    case 'trm': su.trMat = a[1]; su.oldDirty = true; su.dirty = true; break;
    case 'thas': su.tankHas = a[1] === '1'; su.dirty = true; break;
    case 'green': su.green = a[1]; su.ddirty = true; break;
    case 'light': su.light = a[1]; su.ddirty = true; break;
    case 'turf': su.turf = a[1] === '1'; adv(); break;
    case 'flr': if (su.flr === a[1]) { suStep(1); if (suRefresh(SUQ[su.q])) return; break; } su.flr = a[1]; su.turf = a[1] === 'garden'; adv(); break;
    case 'north': if (su.north === a[1] && a[1]) suStep(1); else { su.north = a[1]; adv(); } if (suRefresh(SUQ[su.q])) return; break;
    case 'v3': {   // 259 (owner): the setup's 3D can be looked round — zoom, move, top view, night — but nothing is edited there
      const k = a[1]; if (k === 'zin') S3.zoom(0.8); else if (k === 'zout') S3.zoom(1.25); else if (k === 'home') { S3.home(); }
      else if (k === 'pan') b.classList.toggle('on', !!S3.panMode(!b.classList.contains('on'))); else if (k === 'night') { const on = !b.classList.contains('on'); b.classList.toggle('on', on); b.textContent = on ? '☀️' : '🌙'; S3.busy(() => S3.nightMode(on), on ? null : ['Back to daylight…']); }
      else if (k === 'lab') { S.lab = !S.lab; return suPaint(); }
      else if (k === 'top') { const on = !b.classList.contains('on'); S3.topView(on); b.classList.toggle('on', on); } return; }
    case 'zl': case 'zs': { const it = S.sel != null ? S.items[S.sel] : null; if (!it || !it.zone) break; const mx = zoneLen(it.sides[0]), z = it.zone.slice(), keep = JSON.stringify(it);
      if (a[0] === 'zl') { const L = z[1] - z[0], L2 = Math.max(1, rIn(L + fiStep(L, a[1]))); z[1] = Math.min(mx, z[0] + L2); } else { const L = z[1] - z[0], s2 = Math.max(0, rIn(z[0] + fiStep(z[0], a[1]))); z[0] = Math.min(mx - 1, s2); z[1] = Math.min(mx, z[0] + L); }
      it.zone = z; attach(it, S.sel); if (!it.w) { Object.assign(it, JSON.parse(keep)); attach(it, S.sel); S.msg = 'No parapet free there'; } else S.msg = ''; draw(true); break; }
    case 'sofa': { const c = suSofa()[+a[1]]; if (!c) break; const k = a[2], i0 = c.indexOf(k); if (i0 >= 0) { if (c.length > 1) c.splice(i0, 1); } else c.push(k); su.ddirty = true; break; }
    case 'z2': { const i0 = Math.max(0, Z2.indexOf(S.su2z || 1)); S.su2z = Z2[Math.max(0, Math.min(Z2.length - 1, i0 + (+a[1] || 0)))]; break; }
    case 'mvp': if (S.sel != null) { const G = grpOf(S.sel), R = G.map(j => rectI(S.items[j])), P = P0(), k = a[1], v0 = (k === 'x' ? Math.min(...R.map(r => r.x)) : Math.min(...R.map(r => r.z))) - P, dv = rIn(v0 + fiStep(v0, a[2])) - v0, keep = G.map(j => JSON.stringify(S.items[j]));
      G.forEach(j => { S.items[j][k] = rIn(+S.items[j][k] + dv); }); if (G.some(j => !inside(rectI(S.items[j])) || clashes(S.items[j], j))) { G.forEach((j, n) => Object.assign(S.items[j], JSON.parse(keep[n]))); S.msg = 'Something is in the way there'; } else S.msg = ''; cabFixAll(); draw(true); } break;
    case 'meas': su.meas = !su.meas; break;
    case 'lay': { const o = (su.opts || [])[+a[1]]; if (o) { su.pick = +a[1]; S.items = JSON.parse(JSON.stringify(o.items)); S.bnote = o.note; S.sel = null; ev('plan_step', { ref: 'layout' + (+a[1] + 1) }); draw(true); } break; }
    case 'again': return suMagic(SUQ[su.q] === 'eplan' ? 'el' : 'all');
    case 'roof': return suRoof();
    case 'unsel': S.sel = null; S.suSz = false; S.suMv = false; S.msg = ''; break;
    case 'sz': S.suSz = !S.suSz; if (S.suSz) S.suMv = false; break;
    case 'mv': S.suMv = !S.suMv; if (S.suMv) S.suSz = false; break;
    case 'ssel': { const i = +a[1]; if (!S.items[i]) break; S.sel = i; S.suSz = false; S.suMv = false; break; }
    case 'ssz': { const i = +a[1]; if (!S.items[i]) break; S.sel = i; S.suSz = true; S.suMv = false; break; }   // 302
    case 'sdel': { const i = +a[1]; if (!S.items[i]) break; const G = grpOf(i), it = S.items[i]; if (it.old && su.have && su.have[it.cat]) { su.have[it.cat]--; if (!su.have[it.cat]) delete su.have[it.cat]; } prefDrop(G); const gone = G.map(j => S.items[j]); S.items = S.items.filter((o, j) => !G.includes(j)); scrAfter(gone); S.sel = null; S.suSz = false; suSigNow(); cabFixAll(); draw(true); suToast('Removed'); break; }
    case 'sedit': case 'sedq': { const k = a[1], scr = a[0] === 'sedq' ? k : ADDQ[k]; if (!scr || !SUQ.includes(scr)) break; S.sel = null; su.edK = a[0] === 'sedq' ? '@' + k : k; su.edN = +a[2] || 0; su.edSnap = edSnap(); su.addRet = su.q; su.addD = [!!su.dirty, !!su.ddirty]; su.q = SUQ.indexOf(scr); if (scr === 'existing') { su.exq = 0; su.exK = a[2] || null; su.edN = 0; } break; }
    case 'cta': S.ctaOpen = !S.ctaOpen; break;   // 282
    case 'go2': { const i = SUQ.indexOf(a[1]); if (i < 0) break; S.ctaOpen = false; S.sel = null; if (su.done) su.rev = true; su.q = i; if (suRefresh(a[1])) return; break; }
    case 'stx': { const o = S.stOpen || (S.stOpen = {}); o[a[1]] = !o[a[1]]; break; }
    case 'stall': S.stAll = !S.stAll; break;   // 289: the other stages, behind "All steps"
    case 'v3s': return stage3D(a[1]);
    case 'scradd': { const ex = S.items.find(o => o.cat === 'privacy' && o.mode === 'par'), it = { cat: 'privacy', mode: 'par', label: 'Screen on the parapet', sides: [a[1]], h: (ex && ex.h) || 3, w: 0, d: 0.3, x: 0, z: 0, rot: 0 }; S.items.push(it); splitPar();
      const ok = S.items.some(o => o.cat === 'privacy' && o.mode === 'par' && o.zone && (o.sides || [])[0] === a[1]); if (!ok) S.items = S.items.filter(o => o !== it); suSigNow(); draw(true); suPaint(); return suToast(ok ? 'Screen added on the ' + a[1] + ' wall ✓' : 'No free stretch on that wall', !ok); }
    case 'jump': { const i = SUQ.indexOf(a[1]); if (i >= 0) { S.sel = null; su.q = i; } break; }   // 278: theme / floor layout from the panel
    case 'sadd': { const k = a[1]; S.bsel = S.bsel || {};
      if (ADDQ[k] && SUQ.includes(ADDQ[k])) { S.bsel[k] = (S.bsel[k] || 0) + 1; if (k === 'bar') S.bsel.stool = S.bsel.stool || 1; su.addK = k; su.addRet = su.q; su.addD = [!!su.dirty, !!su.ddirty]; su.q = SUQ.indexOf(ADDQ[k]); break; }   // 260 (owner): the same questions as in the setup, then it is added
      const n0 = S.items.length; addItem(k); if (S.sel != null) { S.suMv = true; S.bsel[k] = (S.bsel[k] || 0) + 1; suToast('Added — move it where you want it'); } else suToast(S.msg || 'No free room for it', 1); suSigNow(); cabFixAll(); draw(true); break; }
    case 'csz': { const it = S.sel != null ? S.items[S.sel] : null; if (!it || it.cat !== 'cabin') break; const L = cabinLay(it), l0 = +L.L || 12, w0 = +L.W || 10, d = /^[FI]/.test(a[2] || '') ? fiStep(a[1] === 'L' ? l0 : w0, a[2]) : +a[2] || 0; S.msg = ''; cabinSize(it, a[1] === 'L' ? l0 + d : l0, a[1] === 'W' ? w0 + d : w0); draw(true); break; }
    case 'mstt': { const it = S.sel != null ? S.items[S.sel] : null; if (!it || it.cat !== 'mstair' || !S.site.mstair) break; const ty = ['ms', 'spiral', 'ladder'], nx = ty[(ty.indexOf(S.site.mstair.type) + 1) % 3], m = su.mst = su.mst || {};   // 302 (owner): its kind, from the plan
      su.wantX = su.wantX || {}; su.wantX.mst = true; su.mstNew = nx; ['a0', 'a', 'rev'].forEach(k => delete m[k]); exSync(); suMst(); S.sel = S.items.findIndex(o => o.cat === 'mstair'); suToast((MST.find(z => z[0] === nx) || [0, nx])[1]); draw(true); break; }
    case 'msw': case 'msl': { const it = S.sel != null ? S.items[S.sel] : null, G = S.site.mstair && mstGeom(S.site, (S.site.blocks || []).find(b => b.type === 'mumty')); if (!it || it.cat !== 'mstair' || !G || G.type !== 'ms') break; const m = su.mst = su.mst || {};
      if (a[0] === 'msw') m.w = Math.max(2, Math.min(4, rIn(G.w + fiStep(G.w, a[1])))); else { m.run = Math.max(4, Math.min(G.L - 0.3, rIn(G.run + fiStep(G.run, a[1])))); m.a0 = Math.max(0, Math.min(G.L - m.run, G.a0)); m.rev = G.rev; }
      suMst(); S.sel = S.items.findIndex(o => o.cat === 'mstair'); S.suSz = true; draw(true); break; }
    case 'rs': case 'rot': case 'del': case 'flip': if (S.sel == null) break; if (a[0] === 'del' && S.items[S.sel] && S.items[S.sel].cat === 'mstair') { const it = S.items[S.sel]; if (it.old) (su.rm = su.rm || {}).mstair = true; else { su.wantX = su.wantX || {}; su.wantX.mst = false; exSync(); } S.sel = null; suMst(); draw(true); break; }   // 302: the stairs to the roof come off (an existing one = taken down)
    { const G = grpOf(S.sel), it = S.items[S.sel];   // 254: Remove takes the whole group; a deck under the pergola follows its turn / size
      if (a[0] === 'del') { prefDrop(G); const gone = G.map(j => S.items[j]); S.items = S.items.filter((o, j) => !G.includes(j)); scrAfter(gone); suSigNow(); S.sel = null; S.suSz = false; draw(true); break; }
      if (a[0] === 'flip') {   // 258 (owner): mirror an L — the bar's return arm / the seating's short arm goes to the other end
        if (it.cat === 'bar') { it.flip = !it.flip; const br = rectI(it), had = S.items.filter(o => o.cat === 'stool' && rGap2(rectI(o), br) < 2.5); if (had.length) { S.items = S.items.filter(o => !had.includes(o)); S.sel = S.items.indexOf(it); barStools(it); } draw(true); break; }
        const R0 = G.map(j => rectI(S.items[j])), x0 = Math.min(...R0.map(r => r.x)), x1 = Math.max(...R0.map(r => r.x + r.w)), z0 = Math.min(...R0.map(r => r.z)), z1 = Math.max(...R0.map(r => r.z + r.d)), keep = G.map(j => JSON.stringify(S.items[j]));
        const hz = R0.some(r => r.w > r.d && Math.abs(r.w - (x1 - x0)) < 0.3);   // the long arm runs across → mirror left-right, else top-bottom
        G.forEach((j, k) => { const o = S.items[j], r = R0[k], rt = (+o.rot || 0) % 360; if (hz) { o.x = r2(x0 + x1 - r.x - r.w); if (rt === 90 || rt === 270) o.rot = (rt + 180) % 360; } else { o.z = r2(z0 + z1 - r.z - r.d); if (rt === 0 || rt === 180) o.rot = (rt + 180) % 360; } });
        if (G.length === 2 && S.items[G[0]].plant) lEnds(S.items[G[0]], S.items[G[1]]);
        if (G.some(j => !inside(rectI(S.items[j])) || clashes(S.items[j], j))) { G.forEach((j, k) => Object.assign(S.items[j], JSON.parse(keep[k]))); S.msg = 'No room to flip it here — move it first'; } else S.msg = '';
        draw(true); break; }
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
        it[k] = Math.max(k === 'w' ? lo[0] : lo[1], Math.min(k === 'w' ? hi[0] : hi[1], rIn(+it[k] + fiStep(+it[k], a[2])))); const b1 = rectI(it);
        if (b1.w !== b0.w) it.x = Math.abs(b0.x - (mt.x + mt.w)) < 0.3 || Math.abs(b0.x - mt.x) < 0.3 ? b0.x : rIn(b0.x + b0.w - b1.w);
        if (b1.d !== b0.d) it.z = Math.abs(b0.z - (mt.z + mt.d)) < 0.3 || Math.abs(b0.z - mt.z) < 0.3 ? b0.z : rIn(b0.z + b0.d - b1.d);
        if ((b1.w > b0.w || b1.d > b0.d) && clashes(it, S.sel)) { Object.assign(it, JSON.parse(keep)); S.msg = 'No room for it that size here'; } else S.msg = ''; draw(true); break; }
      const mo = G.filter(j => j !== S.sel && sameR(rectI(S.items[j]), rectI(it))).map(j => S.items[j]);
      if (a[0] === 'rs' && !it.lock && (a[1] === 'w' || a[1] === 'd') && !att(it)) {   // 255 (owner): a resize keeps the thing where it is — grows from its corner; refused rather than moved
        if (it.cat === 'pergola') it.szBy = true; const keep = JSON.stringify(it), b0 = rectI(it), c = CAT[it.cat] || {}, [lo, hi] = szLim(it, c), k = a[1], j = k === 'w' ? 0 : 1;
        it[k] = Math.max(lo[j], Math.min(hi[j], rIn(+it[k] + fiStep(+it[k], a[2])))); const b1 = rectI(it), dw = b0.w - b1.w, dd = b0.d - b1.d;
        const ok = (dw >= 0 && dd >= 0 && (it.x = b0.x, it.z = b0.z, true)) || [[0, 0], [dw, dd], [dw / 2, dd / 2], [dw, 0], [0, dd]].some(([ox, oz]) => { it.x = rIn(b0.x + ox); it.z = rIn(b0.z + oz); return !clashes(it, S.sel); });   // 285 (owner): smaller always fits (it stays inside where it was)
        if (!ok) { Object.assign(it, JSON.parse(keep)); S.msg = 'No room for it that size here'; } else S.msg = '';
        mo.forEach(o => Object.assign(o, { x: it.x, z: it.z, w: it.w, d: it.d, rot: it.rot })); draw(true); break; }
      if (a[0] === 'rs' && /^[FI]/.test(a[2] || '')) a[2] = String(fiStep(+it[a[1]] || 0, a[2]));
      act(a); mo.forEach(o => Object.assign(o, { x: it.x, z: it.z, w: it.w, d: it.d, rot: it.rot })); draw(true); } break;
    case 'done': su.done = true; ev('plan_step', { ref: '3d' }); return suClose();
  }
  if ((SUQ[su.q] === 'plan' || SUQ[su.q] === 'eplan') && !S.items.length) suCompose(SUQ[su.q] === 'eplan' ? 'el' : 'all');
  if (['rs', 'rot', 'csz', 'flip', 'del', 'sadd'].includes(a[0])) cabFixAll();
  suPaint(); if (a[0] === 'next' || a[0] === 'back' || a[0] === 'mood' || a[0] === 'turf' || a[0] === 'north') SUEL.scrollTop = 0;
}
function suRoof() {   // back to the roof plan; a changed roof sets the terrace up again
  if (!window.mtoSpaceAsk) return; if (!SUEL) suOpen(SUQ.length - 1); SUEL.style.display = 'none'; EL.style.display = 'none'; save();
  window.mtoSpaceAsk('planner', r => { EL.style.display = 'flex'; if (r && r.site) { S.site = Object.assign({}, S.site, r.site); S.su.dirty = true; S.su.oldDirty = true; if (S.su.q >= SUQ.indexOf('eplan')) { if (hasLay()) { const m = suMergeEl(); setTimeout(() => suToast(m), 80); } else suCompose(SUQ[S.su.q] === 'eplan' ? 'el' : 'all'); } } SUEL.style.display = 'block'; suPaint(); setTimeout(() => { try { S3.resize(); } catch (e) {} }, 60); }, { site: S.site });
}
let SUD = null;
// 254 (owner): tap a thing to pick it (a small toolbar over it, like Google Sheets); only the picked thing — and what moves with it — can be dragged; the rest is faded and can't be picked until ✓ Done / a tap on empty floor; a swipe anywhere else scrolls the page
const sameR = (a, b) => Math.abs(a.x - b.x) < 0.6 && Math.abs(a.z - b.z) < 0.6 && Math.abs(a.w - b.w) < 0.6 && Math.abs(a.d - b.d) < 0.6;
const touchR = (a, b) => a.x <= b.x + b.w + 0.15 && a.x + a.w >= b.x - 0.15 && a.z <= b.z + b.d + 0.15 && a.z + a.d >= b.z - 0.15;
const PREFK = { cabin: ['cab'], bar: ['bars'], fbench: ['fbs', 'fbp'], water: ['wm'], feature: ['fd'], pergola: ['pgs'], sofa: ['sofa'], graffiti: ['gw'] };   // 266 (owner): removing a thing drops its answers too
function prefDrop(G) { const su = S.su; if (!su || !S.bsel) return; const seen = new Set();
  G.map(j => S.items[j]).filter(o => o && !o.old).forEach(it => { const k = it.cat, key = it.grp ? 'g' + it.grp : it; if (seen.has(key)) return; seen.add(key);
    const gs = []; S.items.forEach(o => { if (o && o.cat === k && !o.old) { const g = o.grp ? 'g' + o.grp : o; if (!gs.includes(g)) gs.push(g); } });
    const n = gs.indexOf(key); if (S.bsel[k]) { S.bsel[k]--; if (!S.bsel[k]) delete S.bsel[k]; }
    (PREFK[k] || []).forEach(a => { if (Array.isArray(su[a]) && n >= 0 && n < su[a].length) su[a].splice(n, 1); });
    if (k === 'cabin' && !S.bsel.cabin) delete su.cs; }); }
function grpOf(i) { const it = S.items[i]; if (!it) return []; const out = [i];   // L seating = its two arms; a pergola = + the deck under it
  if (it.grp) S.items.forEach((o, j) => { if (j !== i && o.grp === it.grp) out.push(j); });
  else if (it.cat === 'fbench' && it.shape !== 'curve' && !it.segs) S.items.forEach((o, j) => { if (j !== i && o.cat === 'fbench' && o.shape !== 'curve' && !o.grp && (+o.rot || 0) % 180 !== (+it.rot || 0) % 180 && touchR(rectI(it), rectI(o))) out.push(j); });
  const pg = it.cat === 'pergola' ? it : it.cat === 'deck' ? S.items.find(o => o.cat === 'pergola' && sameR(rectI(o), rectI(it))) : null;
  if (pg) S.items.forEach((o, j) => { if (!out.includes(j) && (o === pg || (o.cat === 'deck' && sameR(rectI(o), rectI(pg))))) out.push(j); });
  return out; }
function suDo(code) { const b = document.createElement('button'); b.setAttribute('data-su', code); suClick({ target: b }); }
function suWheel(e) {   // 268 (owner): the mouse wheel zooms the 2D plan at the cursor
  const sc = e.target.closest && e.target.closest('.pl-su2d'); if (!sc || !S.su || !S.su.on) return; e.preventDefault(); const i0 = Math.max(0, Z2.indexOf(S.su2z || 1)), i1 = Math.max(0, Math.min(Z2.length - 1, i0 + (e.deltaY < 0 ? 1 : -1))); if (i1 === i0) return;
  const r = sc.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, fx = (px + sc.scrollLeft) / Math.max(1, sc.scrollWidth), fy = (py + sc.scrollTop) / Math.max(1, sc.scrollHeight), y0 = SUEL.scrollTop;
  S.su2z = Z2[i1]; suPaint(); const s2 = SUEL.querySelector('.pl-su2d'); SUEL.scrollTop = y0; if (s2) { s2.scrollLeft = fx * s2.scrollWidth - px; s2.scrollTop = fy * s2.scrollHeight - py; } }
let SUPAN = null;
function suPanDown(e) { const sc = e.target.closest && e.target.closest('.pl-su2d'); if (!sc || (e.button !== 2 && e.button !== 1)) return false; SUPAN = { sc, x: e.clientX, y: e.clientY, l: sc.scrollLeft, t: sc.scrollTop }; e.preventDefault(); return true; }   // right / middle drag pans the zoomed plan
document.addEventListener('pointermove', e => { if (!SUPAN) return; SUPAN.sc.scrollLeft = SUPAN.l - (e.clientX - SUPAN.x); SUPAN.sc.scrollTop = SUPAN.t - (e.clientY - SUPAN.y); });
document.addEventListener('pointerup', () => { SUPAN = null; });
document.addEventListener('keydown', e => { if (!(e.ctrlKey || e.metaKey) || !hOn()) return; const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) return; const k = e.key.toLowerCase();   // 284: Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z)
  if (k === 'z' && !e.shiftKey) { e.preventDefault(); hGo('undo'); } else if (k === 'y' || k === 'z' && e.shiftKey) { e.preventDefault(); hGo('redo'); } });
document.addEventListener('keydown', e => {   // 268 (owner): arrow keys nudge the picked thing (1 in; Shift = 6 in), like PowerPoint
  if (!S.su || !S.su.on || S.sel == null || !['asbuilt', 'base', 'eplan', 'plan'].includes(SUQ[S.su.q]) || S.su.addK || S.su.edK) return; const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
  const k = { ArrowLeft: ['x', -1], ArrowRight: ['x', 1], ArrowUp: ['z', -1], ArrowDown: ['z', 1] }[e.key]; if (!k) return; e.preventDefault(); const it = S.items[S.sel]; if (!it || it.lock || att(it)) return; suDo(`mvp:${k[0]}:I${k[1] * (e.shiftKey ? 6 : 1)}`); });
function suDown(e) { if (hOn()) S._hpre = hKey(); if (suPanDown(e)) return; const svg = SUEL.querySelector('.pl-su2d svg'); if (!svg || !svg.contains(e.target)) return; const g = e.target.closest && e.target.closest('[data-it]'), i = g ? +g.getAttribute('data-it') : null;
  SUD = { i, sx: e.clientX, sy: e.clientY, svg, mv: false };
  if (S.sel == null || i == null || !S.suMv) return; const G = grpOf(S.sel); if (!G.includes(i)) return;   // 255: only in Move mode, only the picked thing (or its group) drags
  const it = S.items[i]; if (!it || it.segs || it.box || it.lock) return; const p = P2.toFt(svg, e); if (!p) return; e.preventDefault();
  Object.assign(SUD, { drag: true, G, p0: p, xs: G.map(j => [+S.items[j].x, +S.items[j].z]), gs: G.map(j => svg.querySelector(`[data-it="${j}"]`)).filter(Boolean) }); try { svg.setPointerCapture(e.pointerId); } catch (er) {}
  const pop = SUEL.querySelector('.pl-tb'); if (pop) pop.style.visibility = 'hidden'; }
function suMove(e) { const D = SUD; if (!D) return; if (!D.mv && Math.hypot(e.clientX - D.sx, e.clientY - D.sy) < 6) return; D.mv = true; if (!D.drag) return; const p = P2.toFt(D.svg, e); if (!p) return; D.dx = r2(p.x - D.p0.x); D.dz = r2(p.z - D.p0.z); D.gs.forEach(g => g.setAttribute('transform', `translate(${D.dx} ${D.dz})`)); }
function suCancel() { const D = SUD; SUD = null; if (D && D.drag) suPaint(); }
function suUp() { const pre = S._hpre; S._hpre = null; suUp0(); if (pre && hOn()) { hPush(pre); const z = SUEL && SUEL.querySelector('.pl-z2'); if (z) z.outerHTML = z2bar(); } }
function suUp0() { const D = SUD; SUD = null; if (!D) return;
  if (!D.mv) {   // a tap
    if (S.sel == null) { if (D.i != null) { S.sel = D.i; S.suSz = false; S.suMv = false; S.msg = ''; suPaint(); } return; }
    if (D.i == null) { if (S.suMv) return; S.sel = null; S.suSz = false; S.msg = ''; return suPaint(); }   // in Move mode a slip onto the floor doesn't drop the pick   // empty floor = done
    if (grpOf(S.sel).includes(D.i)) { if (D.i !== S.sel) { S.sel = D.i; suPaint(); } else { const pop = SUEL.querySelector('.pl-tb'); if (pop) pop.style.visibility = ''; } return; }   // the other arm of an L: size it on its own
    S.msg = 'Tap ✓ Done first, then pick the next thing'; return suPaint(); }
  if (!D.drag) return; S.msg = '';
  const keep = D.G.map(j => JSON.stringify(S.items[j])); D.G.forEach((j, k) => { const o = S.items[j]; o.x = r2(D.xs[k][0] + (D.dx || 0)); o.z = r2(D.xs[k][1] + (D.dz || 0)); delete o.wside; });
  { const R1 = D.G.map(j => rectI(S.items[j])), p = P0(), t = S.site, x0 = Math.min(...R1.map(r => r.x)), x1 = Math.max(...R1.map(r => r.x + r.w)), z0 = Math.min(...R1.map(r => r.z)), z1 = Math.max(...R1.map(r => r.z + r.d));   // 258: dragged past the parapet → sits flush inside it (the border band included)
    const dx = x0 < p ? p - x0 : x1 > +t.pw - p ? +t.pw - p - x1 : 0, dz = z0 < p ? p - z0 : z1 > +t.pd - p ? +t.pd - p - z1 : 0; if (dx || dz) D.G.forEach(j => { S.items[j].x = r2(S.items[j].x + dx); S.items[j].z = r2(S.items[j].z + dz); }); }
  if (D.G.length === 1 && S.items[D.G[0]].cat === 'mstair') { mstDrop(S.items[D.G[0]]); S.sel = S.items.findIndex(o => o.cat === 'mstair'); S.suMv = true; draw(true); return suPaint(); }   // 302: slides along the stairs room (or onto another of its walls)
  if (D.G.length === 1) { const i = D.G[0], it = S.items[i];
    if (CAT[it.cat] && CAT[it.cat].kind === 'wall') { delete it.wside; snapWall(it, true); }   // 268 (owner): dragged by hand → the wall it is dropped on wins over the wall picked before   // 242: a wall panel dropped anywhere goes onto the nearest wall at that spot
    const big = !isDecor(it) && !it.old; let dmv = ''; if (big) { S._igDec = true; S._hand = true; if (it.cat === 'cabin') cabFlush(it, i); pushFlush(it, i); if (clashes(it, i) === 'door') { (S.site.blocks || []).forEach(b => { b._d0 = b.door; }); dmv = doorMove(it, i); } }   // 302 / 304 (owner): a big thing stays exactly where it is dropped — flush against the parapet / block next to it (a cabin drops its projection there), and a room / lift / stairs door in its way moves to a free side
    const wl = CAT[it.cat] && CAT[it.cat].kind === 'wall';
    if (clashes(it, i)) { const why = whyNot(it, i), x1 = it.x, z1 = it.z;   // owner (video 27 Nov): a dropped thing never jumps to a far spot — a small nudge (≤ 2 ft) or back where it was, saying why
      const ok = wl ? settle(it, i, [it.x, it.z]) && Math.hypot(it.x - x1, it.z - z1) <= 2.5 : placeFree(it, i, [x1, z1], 2);
      if (!ok) { Object.assign(it, JSON.parse(keep[0])); S.msg = why; suToast(why, true); dmv = dmv ? 'x' : ''; } } else if (wl) settle(it, i, [it.x, it.z]);
    S._hand = false; if (big && !clashes(it, i) && JSON.stringify(it) !== keep[0]) it.hand = true;   /* 304: placed by hand — keeps a 3 ft walkway at doors from now on */
    if (dmv) { if (dmv === 'x' || clashes(it, i)) (S.site.blocks || []).forEach(b => { if (b._d0 !== undefined) b.door = b._d0; }); else { S.msg = 'Moved the ' + dmv + ' so it stays free'; suToast(S.msg); } } (S.site.blocks || []).forEach(b => { delete b._d0; });
    S._igDec = false; if (big) { const m = decorFit(); if (m) S.msg = m; } }
  else if (D.G.some(j => clashes(S.items[j], j))) { D.G.forEach((j, k) => Object.assign(S.items[j], JSON.parse(keep[k]))); S.msg = 'It can\'t go there'; }   // a group moves together or not at all
  cabFixAll(); const sel0 = S.sel != null ? S.items[S.sel] : null; scrAfter(D.G.map(j => S.items[j])); if (sel0) S.sel = S.items.indexOf(sel0); draw(true); suPaint(); }
function suPopHtml() { const it = S.sel != null ? S.items[S.sel] : null; if (!it) return ''; const c = CAT[it.cat] || {}, G = grpOf(S.sel), Lg = G.length > 1 && it.cat === 'fbench';
  return `<div class="pl-tb" style="visibility:hidden"><span class="pl-tbn">${esc(G.length > 1 && G.some(j => S.items[j].cat === 'pergola') ? 'Pergola + deck' : Lg ? 'L seating · 1 arm' : it.cat === 'feature' ? 'Feature wall' + (it.label && it.label !== c.t ? ' · ' + it.label : '') : it.label || c.t || '')}</span>` +
    (!it.segs && !it.box && !it.lock ? `<button type="button" data-su="mv" class="${S.suMv ? 'on' : ''}"><i>✥</i>Move</button>` : '') + (!att(it) && !it.segs && !it.lock ? '<button type="button" data-su="rot"><i>↻</i>Turn</button>' : '') + ((Lg || (it.cat === 'bar' && it.shape === 'L')) && !it.lock ? '<button type="button" data-su="flip"><i>⇋</i>Flip</button>' : '') + (it.cat === 'mstair' && !it.old ? '<button type="button" data-su="mstt"><i>⇄</i>Kind</button>' : '') + ((c.size && c.size !== 'fixed' || it.cat === 'cabin' || it.cat === 'mstair' || SZOK.has(it.cat)) && !it.lock ? `<button type="button" data-su="sz" class="${S.suSz ? 'on' : ''}"><i>⤢</i>Size</button>` : '') +
    (it.cat === 'cabin' && (it.cabTouch || []).length ? `<button type="button" data-su="cjd" class="${(it.joinDoor || []).length ? 'on' : ''}" title="A door into the cabin it touches"><i>🚪</i>${(it.joinDoor || []).length ? 'Door ✓' : 'Door between?'}</button>` : '') + '<button type="button" data-su="del"><i>🗑</i>Remove</button><button type="button" class="ok" data-su="unsel"><i>✓</i>Done</button></div>'; }
const SZOK = new Set(['sofa', 'swing', 'dining', 'bench', 'table', 'water', 'sculpture', 'jacuzzi', 'umbrella', 'firepit', 'rack']);   // 257 (owner): every thing can be sized in the 2D setup
const szLim = (it, c) => SZOK.has(it.cat) ? [[r2(c.w * 0.5), r2(c.d * 0.5)], [r2(c.w * 2.5), r2(c.d * 2.5)]] : [c.min || [1, 1], c.max || [80, 80]];
// 258 (owner): add more right under the 2D plan — only what this round is for (round 2: the big pieces; round 3: + furniture, decor and plants)
const NOADD = new Set(['mstair', 'works', 'privacy', 'accover', 'shaftcover', 'pathway', 'railing', 'gate', 'bench']);
// 266 (owner): every 2D stage has the same side panel — what is picked so far, stage-wise, each one can be removed / changed / added to
function grpsOf(k) { const out = []; S.items.forEach((o, j) => { if (!o || o.cat !== k || o.old) return; const g = o.grp ? 'g' + o.grp : null, f = g && out.find(x => x.g === g); if (f) f.ix.push(j); else out.push({ g, ix: [j] }); }); return out; }
function itSpec(it) { const f = foot(it), sz = `${fiTxt(f[0])} × ${fiTxt(f[1])}`;
  if (it.cat === 'cabin') { const L = cabinLay(it), g = (CAB_GLZ.find(z => CAB_SKU[z[0]].test(it.sku || '')) || [0, ''])[1]; return [g, fiTxt(+L.L || 12) + ' × ' + fiTxt(+L.W || 10), (it.purpose || []).join(', ')].filter(Boolean).join(' · '); }
  if (it.cat === 'pergola') return sz + ' · ~' + Math.round(f[0] * f[1]) + ' sq ft';
  if (it.cat === 'bar') return (it.shape === 'L' ? 'L-shape' : it.shape === 'curve' ? 'Curved' : 'Straight') + ' · ' + sz;
  if (it.cat === 'fbench') return (it.shape === 'curve' ? 'Curved' : it.grp ? 'L-shape' : 'Straight') + (it.plant && it.plant !== 'none' ? ' · with planters' : '');
  if (it.cat === 'sofa' && it.sconf) { const L = P2.sofaLayout(it.sconf); return L.seats + ' seats · ' + sz; }
  return sz; }
const SELQ = [['floor', 'Floor look', () => (S.su || {}).flr || ''], ['north', 'North', () => (S.su || {}).north ? 'towards the ' + S.su.north.replace('-', ' ') : 'Not sure']];
const nm0 = (L, k, d) => ((L.find(z => z[0] === k) || [0, d || ''])[1]);
function roofRows() {   // 278 (owner): what stands on the roof now — the answers, each with ✎
  const su = S.su || {}, t = S.site, bl = t.blocks || [], R = [], hv = su.have || {}, m = su.mst || {}, X = su.wantX || {};
  const hvs = HAVE.filter(([k]) => hv[k]).map(([k, n]) => n + (hv[k] > 1 ? ' × ' + hv[k] : ''));
  R.push(['Already built', hvs.length ? hvs.join(', ') : 'Nothing', 'have']);
  R.push(['Floor', nm0(FLOOR0, su.floor0, 'Cement') + ' · ' + ({ keep: 'keep', refurb: 'refurbish', change: 'change it' }[flAct()] || 'keep'), 'existing:floor']);
  if (t.kind === 'terrace') { const sp = su.seep || {}; R.push(['Seepage', sp.has ? nm0(SEEP_AMT, sp.amt || 'some') + ' · ' + nm0(SEEP_FIX, sp.fix || 'redo').replace(/,.*$/, '') : sp.has === false ? 'None' : '—', 'existing:seep']);
    R.push(['Heatproofing', su.heat ? nm0(HEAT, su.heat) : '—', 'existing:heat']); }
  if (bl.some(b => b.type === 'mumty')) { R.push(['Stairs room', { keep: 'Keep as is', door: 'New door', refurb: 'Refurbish' }[su.stairs || 'keep'], 'existing:mumty']);
    R.push(['Stairs to its roof', (m.has && m.has !== 'none' ? nm0(MST, m.has) : 'None') + (X.mst ? ' → new ' + nm0(MST, su.mstNew || 'ms').toLowerCase() : ''), 'existing:mstair']);
    R.push(['Pipes on its wall', su.pipes ? (su.pipeScr ? 'Yes · cover them' : 'Yes · leave them') : su.pipes === false ? 'None' : '—', 'existing:pipes']);
    if (t.tanks !== false) R.push(['Tank screen', (su.tankHas ? 'There is one' : su.tankHas === false ? 'None' : '—') + (X.tank ? ' → new screen' : ''), 'existing:tank']); }
  if (bl.some(b => b.type === 'shaft')) R.push(['Shaft cover', nm0(SMAT_NOW, su.shaftNow || 'none') + (X.shaft ? ' → new ' + nm0(SMAT, su.shaftNew || 'poly').replace(/ \(.*$/, '').toLowerCase() : ''), 'existing:shaft']);
  R.push(['Walls', { paint: 'Painted', tiles: 'Tiles', none: 'Plain plaster' }[su.walls || 'paint'] || su.walls, 'existing:walls']);
  if (t.kind === 'terrace') { const c = su.cop || {}; R.push(['Parapet top', nm0(COP0, c.has || 'none') + (c.want ? ' → ' + nm0(COPN, c.want, c.want).toLowerCase() : c.act && c.act !== 'keep' ? ' · ' + c.act : ''), 'existing:coping']); }
  return R; }
function wantRows() {   // before the layout is made: what was asked for, from the answers
  const su = S.su || {}, B = S.bsel || {}, R = []; Object.keys(B).filter(k => B[k] && !DECOR.has(k) && CAT[k]).forEach(k => { const n = B[k]; let v = n > 1 ? n + ' nos' : '';
    if (k === 'cabin') v = suCab().map(c => nm0(CAB_GLZ, c.glaze || 'mostly')).join(', ');
    else if (k === 'bar') v = suBars().map(b => ({ L: 'L-shape', curve: 'Curved' }[b] || 'Straight')).join(', ');
    else if (k === 'fbench') v = suArr('fbs', n, 'L').map(b => ({ L: 'L-shape', curve: 'Curved' }[b] || 'Straight')).join(', ');
    else if (k === 'water') v = suArr('wm', n, 'cascade').map(w => nm0(WTYPES, wType(w), 'Water')).join(', ');
    else if (k === 'feature') v = suArr('fd', n, 'fluted').map(f => nm0(FDES, f, f)).join(', ');
    R.push([(CAT[k] || {}).t + (n > 1 ? ' × ' + n : ''), v || '1', ({ cabin: 'cabin', bar: 'bar', fbench: 'fbs', water: 'wtr', graffiti: 'gfw' })[k] || 'want']); });
  return R; }
// 282 (owner): one layout on every step — the view on the left, a Canva-like panel on the right with every stage (done ones collapsed + editable, this one open with its question, later ones locked)
const STG = [['roof', 'Your roof', []], ['ex', 'Already there · before', ['have', 'existing', 'asbuilt', 'ab3d']], ['base', 'Base for the design', ['remove', 'base', 'b3d']], ['el', 'Main elements', ['mood', 'want', 'cabin', 'bar', 'fbs', 'wtr', 'ftr', 'gfw', 'roofx', 'seats', 'floor', 'north', 'eplan', 'e3d']],
  ['dec', 'Furniture & plants', ['decor', 'sofa', 'green', 'lights', 'plan']], ['thm', 'Theme', ['theme']], ['fl', 'Floor layout', ['flay']], ['prop', 'Proposal', ['prop']]];
const stageOf = q => (STG.find(z => z[2].includes(q)) || [null])[0];
function stDone(k) { const su = S.su || {}; if (k === 'roof' || su.done) return true; const z = STG.find(x => x[0] === k); return su.q > Math.max(...z[2].map(q => SUQ.indexOf(q))); }
function stSum(k) { const su = S.su || {}, t = S.site, cnt = {}, nm = (L, n) => L.slice(0, n).join(', ') + (L.length > n ? ' +' + (L.length - n) : '');
  if (k === 'roof') { (t.blocks || []).concat(t.gone || []).forEach(b => { const n = b.pent ? 'penthouse' : { mumty: 'stairs', lift: 'lift', room: 'room', shaft: 'shaft', ac: 'AC', troom: 'temp room' }[b.type]; if (n) cnt[n] = (cnt[n] || 0) + 1; });
    return fiTxt(+t.pw) + ' × ' + fiTxt(+t.pd) + (Object.keys(cnt).length ? ' · ' + Object.keys(cnt).map(n => (cnt[n] > 1 ? cnt[n] + ' ' : '') + n + (cnt[n] > 1 && !/s$/.test(n) ? 's' : '')).join(', ') : ''); }
  if (k === 'ex') { const R = roofRows(); return [R[0][1] === 'Nothing' ? 'Nothing built' : R[0][1]].concat(R.filter(r => /Seepage|Heat/.test(r[0]) && r[1] !== '—' && r[1] !== 'None').map(r => r[0].toLowerCase() + ': ' + r[1].toLowerCase())).join(' · '); }
  if (k === 'base') { const L = suRemList().filter(z => (su.rm || {})[z.k]).map(z => z.t); return L.length ? 'Taking down: ' + nm(L, 3) : 'Nothing taken down'; }
  const names = f => [...new Set(S.items.filter(o => !o.old && f(o)).map(o => ((CAT[o.cat] || {}).t || o.cat)))];
  if (k === 'el') { const L = names(o => !isDecor(o) && !att(o) && o.mode !== 'tank'); return L.length ? nm(L, 4) : wantRows().map(r => r[0]).join(', '); }
  if (k === 'dec') { const L = names(o => isDecor(o) && o.cat !== 'plant' && o.cat !== 'planter'); return (L.length ? nm(L, 3) : Object.keys(S.bsel || {}).filter(x => DECOR.has(x) && CAT[x]).map(x => CAT[x].t).join(', ')) + (su.green ? (Object.keys(S.bsel || {}).some(x => DECOR.has(x)) || S.items.some(o => isDecor(o) && o.cat !== 'plant' && o.cat !== 'planter') ? ' · ' : '') + ({ none: 'no plants', light: 'a little green', balanced: 'balanced greenery', lush: 'lush greenery' })[su.green] : ''); }
  if (k === 'thm') return nm0(THEMES6, su.thm, '');
  if (k === 'fl') { const f = t.floor || {}; return f.layout ? nm0(FLAYS, f.layout) + (f.grass ? ' · with a lawn' : '') : ''; }
  return ''; }
function stBody(k, A) { const su = S.su || {}, row = ([t, v, ed]) => `<div class="pl-selr"><span class="pl-seln"><b>${esc(t)}</b><small>${esc(String(v || '—'))}</small></span>${ed ? `<button type="button" data-${A}="${A === 'pl' ? 'stq:' + ed : (/^(theme|flay)$/.test(ed) ? 'jump:' : 'sedq:') + ed}" aria-label="Change" title="Change">✎</button>` : ''}</div>`;
  if (k === 'roof') return `<button type="button" class="pl-sela" data-${A}="${A === 'pl' ? 'stq:roof' : 'roof'}">✎ Roof — doors, AC units, temp room (🔒 rest is confirmed)</button>`;
  if (k === 'ex') return (A === 'su' ? stItems('ex') : '') + roofRows().map(row).join('');
  if (k === 'base') { const L = suRemList(); return (L.length ? L.map(z => row([z.t, (su.rm || {})[z.k] ? 'Take down' : 'Keep', 'remove'])).join('') : row(['Take down', 'Nothing', ''])); }
  const items = f => { const by = {}; S.items.forEach(o => { if (o.old || !f(o) || att(o) || o.mode === 'tank') return; const n = o.label || (CAT[o.cat] || {}).t || o.cat; (by[n] = by[n] || []).push(o); }); return Object.keys(by).map(n => [n + (by[n].length > 1 ? ' × ' + by[n].length : ''), itSpec(by[n][0])]); };
  if (k === 'el') { const L = items(o => !isDecor(o)), SI = A === 'su' ? stItems('el') : ''; return (SI || (A === 'pl' && L.length ? stMain(false) : L.length ? L.map(r => row(r)).join('') : wantRows().map(row).join(''))) + [['north', 'North', su.north ? 'towards the ' + su.north.replace('-', ' ') : 'Not sure']].map(z => row([z[1], z[2], z[0]])).join('') + `<button type="button" class="pl-sela" data-${A}="${A === 'pl' ? 'stq:want' : 'sedq:want'}">✎ Change what you want</button>`; }
  if (k === 'dec') { const L = items(o => isDecor(o) && o.cat !== 'plant' && o.cat !== 'planter'); return (A === 'su' ? stItems('dec') : stMain(true)) + row(['Greenery', (({ none: 'No plants', light: 'A little', balanced: 'Balanced', lush: 'Lush' })[su.green] || '—') + ' · set by the theme', '']) + row(['Lighting', (({ none: 'No lights', soft: 'Soft & warm', full: 'All lit up' })[su.light] || '—') + ' · set by the theme', '']) + `<button type="button" class="pl-sela" data-${A}="${A === 'pl' ? 'stq:decor' : 'sedq:decor'}">✎ Change furniture</button>`; }
  if (k === 'thm') return row(['Theme', stSum('thm'), 'theme']);
  if (k === 'fl') return row(['Floor layout', stSum('fl'), 'flay']);
  return ''; }
const shTop = b => b.h != null && b.h !== '' && +b.h >= 0 ? (+b.h < 1 ? Math.max(0.08, +b.h) : +b.h) : 3;   // 302: the shaft's real height (a flush shaft is 0, not 3 ft)
function edDone() { const su = S.su; su.rev = false; su.edMain = false; su.edDoneAfter = false; try { if (su.thm) themeFloor(su.thm); flPlantsOff(); } catch (e) {} su.done = true; save(); suClose(); }   // 302
function stMain(dec) {   // 302 (owner): after the setup every thing has its own ✎ — its answers (cabin walls, glass sides, entrance…) or, with no answers, its size / place on the 2D plan
  let h = ''; CATS.filter(c => dec ? DECOR.has(c.k) && c.k !== 'plant' && c.k !== 'planter' : !DECOR.has(c.k)).map(c => c.k).filter(c => S.items.some(o => o.cat === c && !o.old && !att(o) && o.mode !== 'tank')).forEach(c => grpsOf(c).forEach((g, m) => { const i = g.ix[0], it = S.items[i]; if (att(it) || it.mode === 'tank') return; const n = it.cat === 'feature' ? 'Feature wall' + (it.label && it.label !== CAT.feature.t ? ' · ' + it.label : '') : it.label || (CAT[it.cat] || {}).t || it.cat;
    h += `<div class="pl-selr"><span class="pl-seln"><b>${esc(n)}</b><small>${esc(itSpec(it))}</small></span><button type="button" data-pl="${ADDQ[c] ? 'sted:' + c + ':' + m : 'stpk:' + i}" title="Change it" aria-label="Change">✎</button></div>`; }));
  return h; }
function stItems(k, q) {   // the current stage's things — tap to pick on the plan, ✎ its answers, 🗑 remove (like the old side list)
  const row = (i, it, ed) => { const n = it.cat === 'feature' ? 'Feature wall' + (it.label && it.label !== CAT.feature.t ? ' · ' + it.label : '') : it.label || (CAT[it.cat] || {}).t || it.cat; return `<div class="pl-selr${S.sel === i ? ' on' : ''}"><button type="button" class="pl-seln" data-su="ssel:${i}"><b>${esc(n)}</b><small>${esc(itSpec(it))}</small></button>${ed ? `<button type="button" data-su="sedit:${ed}" title="Change its choices" aria-label="Change">✎</button>` : it.old ? '' : `<button type="button" data-su="ssz:${i}" title="Size / place it on the plan" aria-label="Change">✎</button>`}<button type="button" data-su="sdel:${i}" title="Remove" aria-label="Remove">🗑</button></div>`; };
  if (k === 'ex') { const seen = new Set(); return S.items.map((o, j) => [o, j]).filter(([o, j]) => { if (!o.old) return false; const g = o.grp ? 'g' + o.grp : 'i' + j; if (seen.has(g)) return false; seen.add(g); return true; }).map(([o, j]) => row(j, o)).join(''); }   // 285: an L seating = one row
  const dec = k === 'dec', cats = CATS.filter(c => dec ? DECOR.has(c.k) : !DECOR.has(c.k)).map(c => c.k).filter(c => S.items.some(o => o.cat === c && !o.old)); let h = '';
  cats.forEach(c => { const gs = grpsOf(c); h += `<div class="pl-selg"><span>${esc((CAT[c] || {}).t || c)}${gs.length > 1 ? ' × ' + gs.length : ''}</span>${(dec ? !NOADD.has(c) : ADDQ[c] && !NOADD.has(c)) ? `<button type="button" data-su="sadd:${c}">+ Add</button>` : ''}</div>` + gs.map((g, m) => row(g.ix[0], S.items[g.ix[0]], dec ? (c === 'sofa' ? 'sofa:' + m : '') : ADDQ[c] ? c + ':' + m : '')).join(''); });
  if (!dec && S.site.kind === 'terrace') { const rd = geo().road || [], has = sd => S.items.some(o => o.cat === 'privacy' && o.mode === 'par' && (o.sides || []).includes(sd)), free = ['back', 'left', 'right', 'front'].filter(sd => !rd.includes(sd) && !has(sd));   // 285 (owner): a parapet screen can be added later on any wall without one
    if (free.length) h += `<div class="pl-selg"><span>Parapet screens</span></div><div class="pl-scra">${free.map(sd => `<button type="button" data-su="scradd:${sd}">+ ${sd} wall</button>`).join('')}</div>`; }
  return h; }
function stagePanel(q, Q, main) { const su = S.su || {}, A = main ? 'pl' : 'su', cur = q ? stageOf(q) : null; if ((q || main) && S._stCur !== cur) { S._stCur = cur; S.stOpen = {}; S.stAll = false; }   /* the guided panel's own call (no q, not main) only borrows the 2D-layout shortcut */ const open = S.stOpen;   // 285 (owner): moving on closes the stages before
  if (!main && cur) return guidedPanel(q, Q, cur);   // 289 (owner picked mockup A): one guided card — step N of 8 + progress, the question, what is picked, Back / Next; the other stages behind "All steps"
  let h = '';
  if (su.elSig && S.items.some(o => !o.old)) h += `<div class="pl-cta${S.ctaOpen ? ' on' : ''}"><button type="button" class="pl-ctab" data-${A}="cta"><i>📐</i><span><b>Change the 2D layout</b><small>Move, resize, add or remove things</small></span><em>${S.ctaOpen ? '▾' : '▸'}</em></button>` +
    (S.ctaOpen ? '<div class="pl-ctao">' + [['asbuilt', 'Before — as it stands', 'what is built there now']].concat(rmAny() ? [['base', 'Base for the design', 'after the take-down']] : []).concat([ ['eplan', 'Main elements', 'cabin, pergola, bar, seating…'], ['plan', 'Furniture, plants & decor', 'sofas, dining, plants, lights…']]).map(z => `<button type="button" data-${A}="go2:${z[0]}"><b>${z[1]}</b><small>${z[2]}</small></button>`).join('') + '</div>' : '') + '</div>';
  STG.forEach(([k, n]) => { if (k === 'prop' && !(cur === 'prop' || su.done)) return;
    if (cur === k) { const L = !main && ['asbuilt', 'base', 'eplan', 'plan'].includes(q) ? stItems(k === 'base' ? 'ex' : k, q) : ''; const D = L ? `<details class="pl-sgl" open><summary>On the plan</summary>${L}</details>` : '', i0 = Q.lastIndexOf('<div class="pl-subar">'); h += `<div class="pl-sg cur"><div class="pl-sgt"><b>${n}</b></div>${i0 >= 0 ? Q.slice(0, i0) + D + Q.slice(i0) : Q + D}</div>`; return; }
    if (k === 'prop') { if (main) h += ''; return; }
    if (stDone(k)) { const o = !!open[k]; h += `<div class="pl-sg done${o ? ' open' : ''}"><div class="pl-sgr"><button type="button" class="pl-sgh" data-${A}="stx:${k}"><i>✓</i><span><b>${n}</b><small>${esc(stSum(k) || '')}</small></span><em>${o ? '▾' : '▸'}</em></button>${['thm', 'fl'].includes(k) ? '' : `<button type="button" class="pl-sg3" data-${A}="v3s:${k}" title="See this stage in 3D">See it in 3D</button>`}</div>${o ? '<div class="pl-sgb">' + stBody(k, A) + '</div>' : ''}</div>`; return; }
    h += `<div class="pl-sg lock"><div class="pl-sgh"><i>🔒</i><span><b>${n}</b></span></div></div>`; });
  return h; }
function sheetDrag() {   // 290 (owner): phones — the panel sits low (the view 64 % of the screen); drag its handle down = bigger view, up = bigger panel; a tap swaps big view / big panel
  const u = SUEL && SUEL.querySelector('.pl-u'), hd = u && u.querySelector('.pl-hdl'); if (!u || !hd) return; if (S.ulh) u.style.setProperty('--ulh', S.ulh + 'dvh');
  const set = v => { S.ulh = Math.max(26, Math.min(84, v)); u.style.setProperty('--ulh', S.ulh + 'dvh'); }, fit = () => { try { S3.resize(); } catch (e) {} };
  hd.onpointerdown = e => { e.preventDefault(); const y0 = e.clientY, h0 = S.ulh || 64, H = innerHeight / 100; let moved = false; try { hd.setPointerCapture(e.pointerId); } catch (x) {}
    hd.onpointermove = ev => { const d = (ev.clientY - y0) / H; if (Math.abs(d) > 1.5) moved = true; if (moved) set(h0 + d); };
    hd.onpointerup = hd.onpointercancel = () => { hd.onpointermove = hd.onpointerup = hd.onpointercancel = null; if (!moved) set((S.ulh || 64) >= 70 ? 40 : 82); fit(); setTimeout(fit, 120); }; }; }
function guidedPanel(q, Q, cur) { const su = S.su || {}, vis = STG.filter(z => z[0] !== 'prop' || cur === 'prop' || su.done), ix = vis.findIndex(z => z[0] === cur), nm = (vis[ix] || [0, ''])[1].replace(' · before', '');
  const i0 = Q.lastIndexOf('<div class="pl-subar">'), body = i0 >= 0 ? Q.slice(0, i0) : Q, bar = i0 >= 0 ? Q.slice(i0) : '';
  const L = ['asbuilt', 'base', 'eplan', 'plan'].includes(q) ? stItems(cur === 'base' ? 'ex' : cur, q) : '', D = L ? `<details class="pl-sgl" open><summary>On the plan</summary>${L}</details>` : '';
  const sum = (() => { try { return stSum(cur) || ''; } catch (e) { return ''; } })();
  let all = ''; if (S.stAll) { all = '<div class="pl-aall">'; const sp = stagePanel(null, '', false); vis.forEach(([k, n]) => { if (k === cur) { all += `<div class="pl-sg cur0"><div class="pl-sgh"><i>●</i><span><b>${n}</b><small>You are here</small></span></div></div>`; return; }
      if (stDone(k)) { const o = !!(S.stOpen || {})[k]; all += `<div class="pl-sg done${o ? ' open' : ''}"><div class="pl-sgr"><button type="button" class="pl-sgh" data-su="stx:${k}"><i>✓</i><span><b>${n}</b><small>${esc(stSum(k) || '')}</small></span><em>${o ? '▾' : '▸'}</em></button>${['thm', 'fl'].includes(k) ? '' : `<button type="button" class="pl-sg3" data-su="v3s:${k}" title="See this stage in 3D" aria-label="See ${esc(n)} in 3D"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></svg></button>`}</div>${o ? '<div class="pl-sgb">' + stBody(k, 'su') + '</div>' : ''}</div>`; }
      else all += `<div class="pl-sg lock"><div class="pl-sgh"><i>🔒</i><span><b>${n}</b></span></div></div>`; });
    all = (su.elSig && S.items.some(o => !o.old) ? sp.slice(0, sp.indexOf('<div class="pl-sg')) : '') + all + '</div>'; }   // the 2D-layout shortcut, when there is a layout
  return `<div class="pl-ah"><div class="pl-ahr"><span>Step ${ix + 1} of ${vis.length} · ${esc(nm)}</span><button type="button" data-su="stall" class="${S.stAll ? 'on' : ''}" aria-expanded="${!!S.stAll}">All steps ${S.stAll ? '▴' : '▾'}</button></div><div class="pl-apb">${vis.map((z, k) => `<i class="${k < ix ? 'd' : k === ix ? 'c' : ''}"></i>`).join('')}</div></div>${all}<div class="pl-aq">${body}${D}</div>${sum && !/^(have|existing|asbuilt|ab3d)$/.test(q) ? `<div class="pl-asum">${esc(sum)}</div>` : ''}${bar}`; }
function stage3D(k) {   // 285 (owner): every finished stage can be seen in 3D as it was at that stage
  const su = S.su || {}, t = S.site, nm = (STG.find(z => z[0] === k) || [0, ''])[1]; let site = t, items = S.items;
  const snap = sn => sn ? [Object.assign({}, t, { blocks: sn.blocks, floor: null, goneIt: [] }), sn.items] : null;
  if (k === 'roof') { site = Object.assign({}, t, { blocks: (su.before && su.before.blocks) || (t.blocks || []).concat(t.gone || []), floor: null }); items = []; }
  else if (k === 'ex') { const z = snap(su.before); if (z) [site, items] = z; else items = S.items.filter(o => o.old); }
  else if (k === 'base') { const z = snap(su.base); if (z) [site, items] = z; else items = S.items.filter(o => o.old); }
  else if (k === 'el') items = S.items.filter(o => !isDecor(o));
  let m = document.getElementById('plv3s'); if (!m) { m = document.createElement('div'); m.id = 'plv3s'; m.className = 'pl-v3s'; (EL || document.body).appendChild(m); }
  m.innerHTML = `<div class="pl-v3sb"><div class="pl-v3sh"><b>${esc(nm)} — in 3D</b><button type="button" data-x aria-label="Close">✕</button></div><div id="plv3sv" class="pl-v3sv"></div></div>`; m.style.display = 'flex';
  const done = () => { m.style.display = 'none'; m.innerHTML = ''; if (S.su && S.su.on) suPaint(); else draw(true); };
  m.querySelector('[data-x]').onclick = done; m.onclick = e => { if (e.target === m) done(); };
  try { S3.show(document.getElementById('plv3sv'), { creepers: crOn(), site, items, sel: null, cabinCfg, cabinLay, pergolaSku: 'MTO-PG-TW', noDrag: true, labels: !!S.lab, theme: k === 'roof' || k === 'ex' || k === 'base' ? 'natural' : su.theme || 'natural', fmix: su.fmix }, { view: '3d', on: () => {} }); setTimeout(() => { try { S3.resize(); S3.home(); } catch (e) {} }, 80); } catch (e) {} }
function bigPlan(q) { const su = S.su || {}, t = S.site, dec = SUQ.indexOf(q) >= SUQ.indexOf('decor'); let svg = '';
  try { svg = P2.svg(t, { items: S.items.filter(o => dec || !isDecor(o)), north: su.north, road: ['front'].concat(t.road_back ? ['back'] : []) }); } catch (e) {}
  return `<div class="pl-ubig">${svg}</div>`; }
function selPanel(q) { const su = S.su, qi = SUQ.indexOf(q), P2Q = ['asbuilt', 'base', 'eplan', 'plan'].includes(q), row = (i, it, ed) => { const n = it.cat === 'feature' ? 'Feature wall' + (it.label && it.label !== CAT.feature.t ? ' · ' + it.label : '') : it.label || (CAT[it.cat] || {}).t || it.cat; return `<div class="pl-selr${S.sel === i ? ' on' : ''}"><button type="button" class="pl-seln" data-su="ssel:${i}"><b>${esc(n)}</b><small>${esc(itSpec(it))}</small></button>${ed ? `<button type="button" data-su="sedit:${ed}" title="Change its choices" aria-label="Change">✎</button>` : ''}<button type="button" data-su="sdel:${i}" title="Remove" aria-label="Remove">🗑</button></div>`; };
  const arow = ([t, v, ed]) => `<div class="pl-selr"><span class="pl-seln"><b>${esc(t)}</b><small>${esc(String(v || '—'))}</small></span>${ed && ed.split(':')[0] !== q ? `<button type="button" data-su="${/^(theme|flay)$/.test(ed) ? 'jump:' + ed : 'sedq:' + ed}" aria-label="Change" title="Change">✎</button>` : ''}</div>`;
  const sec = (id, t, n, body, open) => `<details class="pl-seld" data-sd="${id}"${(su.selOpen || {})[id] != null ? (su.selOpen[id] ? ' open' : '') : open ? ' open' : ''}><summary><b>${t}</b><em>${n}</em></summary>${body || '<p class="pl-sele">Nothing yet</p>'}</details>`;
  const old = S.items.map((o, j) => [o, j]).filter(([o]) => o.old), rm = suRemList().filter(z => su.rm[z.k]), at = k => qi >= SUQ.indexOf(k);
  let h = '<aside class="pl-sel"><p class="pl-selh">Your selections</p>';
  if (!P2Q && S.site.kind === 'terrace') { try { h += '<div class="pl-selm">' + P2.svg(S.site, { items: S.items.filter(o => q !== 'eplan' || !isDecor(o)), north: su.north, road: ['front'] }) + '</div>'; } catch (e) {} }   // 278 (owner): the plan in 2D while answering
  h += sec('old', 'On your roof now', old.length || '', (old.length ? old.map(([o, j]) => row(j, o)).join('') : '') + roofRows().map(arow).join('') + (rm.length ? '<p class="pl-selx">Taken down: ' + rm.map(z => esc(z.t)).join(', ') + '</p>' : ''), ['have', 'existing', 'remove', 'asbuilt', 'ab3d'].includes(q));
  if (at('mood')) { const cats = CATS.filter(c => !DECOR.has(c.k)).map(c => c.k).filter(k => S.items.some(o => o.cat === k && !o.old)); let n = 0, b = '';
    cats.forEach(k => { const gs = grpsOf(k); n += gs.length; b += `<div class="pl-selg"><span>${esc((CAT[k] || {}).t || k)}${gs.length > 1 ? ' × ' + gs.length : ''}</span>${P2Q && ADDQ[k] && !NOADD.has(k) ? `<button type="button" data-su="sadd:${k}">+ Add</button>` : ''}</div>` + gs.map((g, m) => row(g.ix[0], S.items[g.ix[0]], ADDQ[k] ? k + ':' + m : '')).join(''); });
    if (!n) { const W = wantRows(); n = W.length; b = W.map(arow).join(''); }
    h += sec('el', 'Main elements', n || '', b + (q !== 'want' ? '<button type="button" class="pl-sela" data-su="sedq:want">✎ Change what you want</button>' : ''), at('mood') && !at('decor') || q === 'eplan'); }
  if (at('decor')) { const cats = CATS.filter(c => DECOR.has(c.k)).map(c => c.k).filter(k => S.items.some(o => o.cat === k && !o.old)); let n = 0, b = '';
    cats.forEach(k => { const gs = grpsOf(k); n += gs.length; b += `<div class="pl-selg"><span>${esc((CAT[k] || {}).t || k)}${gs.length > 1 ? ' × ' + gs.length : ''}</span>${q === 'plan' && !NOADD.has(k) ? `<button type="button" data-su="sadd:${k}">+ Add</button>` : ''}</div>` + gs.map((g, m) => row(g.ix[0], S.items[g.ix[0]], k === 'sofa' ? 'sofa:' + m : '')).join(''); });
    if (!n) { const B = S.bsel || {}, D = Object.keys(B).filter(k => B[k] && DECOR.has(k) && CAT[k]); n = D.length; b = D.map(k => arow([(k === 'lights' ? 'Garden lamps' : CAT[k].t) + (B[k] > 1 ? ' × ' + B[k] : ''), '', 'decor'])).join(''); }
    h += sec('dec', 'Furniture, plants & decor', n || '', b, at('decor') && !at('theme')); }
  const CH = [['north', 'North', () => su.north ? 'towards the ' + su.north.replace('-', ' ') : 'Not sure', 'north'],
    ['theme', 'Theme', () => nm0(THEMES6, su.thm, ''), 'theme'], ['flay', 'Floor layout', () => { const f = S.site.floor || {}; return f.layout ? nm0(FLAYS, f.layout) + (f.grass ? ' · with a lawn' : '') : ''; }, 'flay']].filter(z => at(z[0]) || (z[0] === 'theme' && su.thm) || (z[0] === 'flay' && (S.site.floor || {}).layout));
  if (CH.length) h += sec('ch', 'Your choices', '', CH.map(([k, t, v, e]) => arow([t, v(), e])).join(''), ['theme', 'flay', 'prop', 'north', 'green', 'lights', 'mood'].includes(q));
  return h + '</aside>'; }
function edSnap() { const su = S.su, o = {}; ['cab', 'bars', 'fbs', 'fbp', 'wm', 'fd', 'pgs', 'sofa', 'gw', 'cs', 'pg', 'have', 'pgDeck', 'flr', 'green', 'light', 'north', 'theme'].forEach(k => { o[k] = su[k] === undefined ? undefined : JSON.parse(JSON.stringify(su[k])); }); return JSON.stringify([o, S.bsel || {}, S.bth || null]); }
function edRestore() { const su = S.su; if (!su.edSnap) return; const [o, b, th] = JSON.parse(su.edSnap); Object.keys(o).forEach(k => { if (o[k] === undefined) delete su[k]; else su[k] = o[k]; }); S.bsel = b; S.bth = th; }
function editApply(k, n) {   // the new answers on that one thing — kept where it stands, in its place in the list
  const gs = grpsOf(k), G = gs[n] && gs[n].ix; if (!G) return false; const keep = S.items.slice(), o0 = S.items[G[0]], at = G[0], x = o0.x, z = o0.z;
  S.items = S.items.filter((o, j) => !G.includes(j)); const n0 = S.items.length, sel0 = S.sel; S.sel = null; const ok = addWith(k, n);
  if (!ok) { S.items = keep; S.sel = sel0; return false; } const add = S.items.splice(n0); S.items.splice(Math.min(at, S.items.length), 0, ...add); const it = add[0], i = S.items.indexOf(it);
  if (k === 'cabin') { const L0 = cabinLay(o0); if (+L0.L && +L0.W && window.mtoCabinSize) try { const r = window.mtoCabinSize(it.sku, cabinLay(it), +L0.L, +L0.W, true); if (r && r.lay) { it.layout = r.lay; it.lsku = it.sku; it.layBase = JSON.parse(JSON.stringify(r.lay)); } } catch (e) {}   // 302 (owner): solid ↔ glass keeps the cabin's own L × W — sized first, then put back where it stood (it used to be sized at the new spot, refused there and left small)
    if (!suDoors(suCab()[n] || {}).length && o0.rot != null) { it.rot = o0.rot; it.ldoors = []; }   // 267: Auto entrance keeps the cabin's turn
    cabinFoot(it); it.exB = null; const f0 = foot(o0), f1 = foot(it); it.x = Math.round((x + (f0[0] - f1[0]) / 2) * 1000) / 1000; it.z = Math.round((z + (f0[1] - f1[1]) / 2) * 1000) / 1000; if (clashes(it, i)) { S._igDec = true; const ok2 = !clashes(it, i) || settle(it, i, [it.x, it.z]); S._igDec = false; if (!ok2) settle(it, i, [it.x, it.z]); else decorFit(); } }
  if (add.length === 1 && k !== 'fbench' && k !== 'cabin') { const px = it.x, pz = it.z; it.x = x; it.z = z; if (clashes(it, i)) { it.x = px; it.z = pz; } }
  if (k === 'cabin') try { cabWalls(it); } catch (e) {}
  S.sel = i; S.suMv = false; return true; }
function suAddHtml(q) { if (S.sel != null || (q !== 'eplan' && q !== 'plan')) return ''; const L = CATS.filter(c => !NOADD.has(c.k) && (!c.lawn || S.site.kind !== 'terrace') && (designs(c).length || c.always) && (q === 'plan' || !DECOR.has(c.k)));
  return '<p class="pl-h" style="margin-top:14px">Add more</p><div class="pl-sucs">' + L.map(c => `<button type="button" class="pl-chip" data-su="sadd:${c.k}">${P2.ico(c.k)} ${esc(c.t)}${S.items.some(o => o.cat === c.k) ? ' <small>+1</small>' : ''}</button>`).join('') + '</div>'; }
// 261 (owner): zoom on every 2D plan; sizes and moves in feet + inches (the feet buttons jump to the next whole foot: 11′ 7″ → 12′)
const Z2 = [1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];   // 268 (owner): 25 % steps
function z2bar() { const z = S.su2z || 1, H = hReset(); return `<div class="pl-z2"><button type="button" data-su="undo" aria-label="Undo" title="Undo (Ctrl+Z)"${H.u.length ? '' : ' disabled'}>↶</button><button type="button" data-su="redo" aria-label="Redo" title="Redo (Ctrl+Y)"${H.r.length ? '' : ' disabled'}>↷</button><i class="pl-z2s"></i><button type="button" data-su="z2:-1" aria-label="Zoom out"${z <= 1 ? ' disabled' : ''}>−</button><span>${Math.round(z * 100)}%</span><button type="button" data-su="z2:1" aria-label="Zoom in"${z >= 4 ? ' disabled' : ''}>+</button></div>`; }
const rIn = v => Math.round(v * 12) / 12;
function fiL(v) { const [f, i] = ftIn(+v || 0); return i ? f + '′ ' + i + '″' : f + ''; }   // 273: sizes shown as 15′ 1″ (never 15.0833…)
function sizeTxt(it, c) { const ins = [it.w, c.size === 'wh' ? it.h : c.size === 'wd' ? it.d : null].filter(v => v != null).some(v => Math.abs(v * 12 - Math.round(v)) > 0.01 * 12 && Math.abs((+v) % 1) > 0.01); return fiL(it.w) + (c.size === 'wh' ? ' × ' + fiL(it.h) : c.size === 'wd' ? ' × ' + fiL(it.d) : '') + (ins ? '' : ' ft'); }
function ftIn(v) { let f = Math.floor(v + 1e-6), i = Math.round((v - f) * 12); if (i === 12) { f++; i = 0; } return [f, i]; }
function fiTxt(v) { const [f, i] = ftIn(v); return f + '′' + (i ? ' ' + i + '″' : ''); }
function fiStep(v, code) { const c = String(code || ''); if (c[0] === 'F') { const up = +c.slice(1) > 0; return (up ? Math.floor(v + 1e-6) + 1 : Math.ceil(v - 1e-6) - 1) - v; } if (c[0] === 'I') return (+c.slice(1) || 0) / 12; return +c || 0; }
const fiCtl = (pre, v) => `<span class="pl-fi"><button type="button" data-su="${pre}:F-1" aria-label="Minus a foot">−</button><em>${ftIn(v)[0]} ft</em><button type="button" data-su="${pre}:F1" aria-label="Plus a foot">+</button></span><span class="pl-fi"><button type="button" data-su="${pre}:I-1" aria-label="Minus an inch">−</button><em>${ftIn(v)[1]} in</em><button type="button" data-su="${pre}:I1" aria-label="Plus an inch">+</button></span>`;
function suMvHtml() { const it = S.sel != null ? S.items[S.sel] : null; if (!it || !S.suMv || att(it) || it.segs || it.lock) return ''; const G = grpOf(S.sel), R = G.map(j => rectI(S.items[j])), P = P0(), x0 = Math.min(...R.map(r => r.x)), z0 = Math.min(...R.map(r => r.z));
  const row = (k, nm, sm, v) => `<div class="pl-szr pl-szr2"><span class="pl-szl">${nm}<small>${sm}</small></span>${fiCtl('mvp:' + k, Math.max(0, v))}</div>`;
  return '<div class="pl-szp">' + row('x', 'From the left wall', 'left edge of it, ' + fiTxt(Math.max(0, x0 - P)), x0 - P) + row('z', 'From the back wall', 'top edge on the plan, ' + fiTxt(Math.max(0, z0 - P)), z0 - P) + '</div>'; }
function suSzHtml() { const it = S.sel != null ? S.items[S.sel] : null; if (!it || !S.suSz) return ''; const c = CAT[it.cat] || {};
  if (it.cat === 'mstair') { const G = S.site.mstair && mstGeom(S.site, (S.site.blocks || []).find(b => b.type === 'mumty')); if (!G || G.type !== 'ms') return '<div class="pl-szp"><small>A ladder / spiral is one size — move it along the wall, or change its kind.</small></div>'; const row = (k, nm, v) => `<div class="pl-szr pl-szr2"><span class="pl-szl">${nm}</span>${fiCtl(k, v)}</div>`; return '<div class="pl-szp">' + row('msw', 'Width', G.w) + row('msl', 'Length', G.run) + '</div>'; }   // 302
  if (it.mode === 'par' && it.zone) { const L = it.zone[1] - it.zone[0], sd = it.sides[0], fromW = SIDE_AX[sd] === 'x' ? 'from the left end' : 'from the back end';
    return '<div class="pl-szp">' + `<div class="pl-szr pl-szr2"><span class="pl-sza">↔</span><span class="pl-szl">Length · ${fiTxt(L)}<small>along the ${sd} parapet</small></span>${fiCtl('zl', L)}</div>` + `<div class="pl-szr pl-szr2"><span class="pl-sza">⇥</span><span class="pl-szl">Starts · ${fiTxt(it.zone[0])}<small>${fromW} of that wall</small></span>${fiCtl('zs', it.zone[0])}</div>` + '</div>'; }
  if (it.cat === 'cabin') { const L = cabinLay(it), tw = (+it.rot || 0) % 180 === 0, r = (k, ar, nm, sm, v) => `<div class="pl-szr pl-szr2"><span class="pl-sza">${ar}</span><span class="pl-szl">${nm} · ${fiTxt(+v)}<small>${sm}</small></span>${fiCtl('csz:' + k, +v)}</div>`;   // 256: the cabin's own length × width; 269 (owner): feet + inches
    return '<div class="pl-szp">' + r('L', tw ? '↔' : '↕', 'Length — L', 'along the door wall', +L.L || 12) + r('W', tw ? '↕' : '↔', 'Width — W', 'door wall to back wall', +L.W || 10) + '</div>'; } if ((!c.size || c.size === 'fixed') && !SZOK.has(it.cat) && !(it.cat === 'bar' && it.shape === 'L')) return ''; const tw = (+it.rot || 0) % 180 === 0;
  const row = (k, ar, nm, sm, v) => `<div class="pl-szr pl-szr2"><span class="pl-sza">${ar}</span><span class="pl-szl">${nm} · ${fiTxt(+v)}<small>${sm}</small></span>${fiCtl('rs:' + k, +v)}</div>`;
  return '<div class="pl-szp">' + row('w', tw ? '↔' : '↕', 'Width — W', tw ? 'left to right on the plan' : 'top to bottom on the plan', it.w) + (c.size === 'wd' || SZOK.has(it.cat) || (it.cat === 'bar' && it.shape === 'L') ? row('d', tw ? '↕' : '↔', 'Length — L', tw ? 'top to bottom on the plan' : 'left to right on the plan', it.d) : '') + '</div>'; }
function suPopPlace() { const pop = SUEL && SUEL.querySelector('.pl-tb'), box = SUEL && SUEL.querySelector('.pl-su2d'); if (!pop || !box || S.sel == null) return;
  const gs = grpOf(S.sel).map(j => box.querySelector(`[data-it="${j}"]`)).filter(Boolean); if (!gs.length) return; const R = gs.map(g => g.getBoundingClientRect()), cb = box.getBoundingClientRect();
  const top = Math.min(...R.map(r => r.top)) - cb.top, bot = Math.max(...R.map(r => r.bottom)) - cb.top, mid = (Math.min(...R.map(r => r.left)) + Math.max(...R.map(r => r.right))) / 2 - cb.left, pw = pop.offsetWidth, ph = pop.offsetHeight;
  let y = top - ph - 8; if (y < 0) y = Math.min(cb.height - ph, bot + 8); pop.style.left = (box.scrollLeft + Math.max(0, Math.min(cb.width - pw, mid - pw / 2))) + 'px'; pop.style.top = (box.scrollTop + Math.max(0, y)) + 'px'; pop.style.visibility = ''; }
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
  const ppl = (S.su || {}).pg || (S.su || {}).people || '5-8', SZF = k => ({ '2-4': { sofa: [8, 7], dining: [5, 5], pergola: [15, 10], L: [8, 5] }, '5-8': { sofa: [10, 8], dining: [7, 6], pergola: [20, 15], L: [10, 6] }, '9-12': { sofa: [12, 9], dining: [10, 6], pergola: [30, 20], L: [12, 8] }, '12+': { sofa: [14, 10], dining: [12, 7], pergola: [32, 25], L: [14, 10] } }[k] || {}), SZ = SZF(ppl);
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
    if (!ok && !['cabin', 'pergola', 'deck'].includes(k) && CAT[k].kind !== 'floor') {   // 266 (owner): no open spot → under a pergola, else beside a shaft
      const C = all('pergola').map(p => { const r = rectI(p); return [r.x + r.w / 2 - it.w / 2, r.z + r.d / 2 - it.d / 2]; }).concat((t.kind === 'terrace' ? t.blocks : []).filter(b => b.type === 'shaft').map(b => [b.x + b.w + 0.5, b.z]));
      for (const c of C) { const x0 = it.x, z0 = it.z; if (placeFree(it, i, c) && d2(it.x, it.z, c[0], c[1]) < 12) { ok = true; break; } it.x = x0; it.z = z0; } }
    if (!ok) { S.items.pop(); miss++; return null; } if (!opt.noFlush) flush(it, i); if (opt.wside) it.wside = opt.wside; if (tg) it.learned = true; return it; };
  const mumtyFace = () => { if (!M) return [t.pw / 2, P + 2]; return g.door === 'right' ? [M.x + M.w, M.z + M.d / 2] : g.door === 'left' ? [M.x, M.z + M.d / 2] : g.door === 'front' ? [M.x + M.w / 2, M.z + M.d + 1.5] : [M.x + M.w / 2, M.z - 1.5]; };
  // 1) the cabin: in a corner (two walls — parapet, the stairs room or another cabin), at the back, away from the road (owner: "mostly in corners or at the back or joining the pergola")
  let J = null;   // 258 (owner): cabin + pergola joined in one band across the terrace — the cabin behind the stairs room / room, the pergola on the open side
  if (B.cabin) { const w = wh('cabin'), CS = CABPPL[(S.su || {}).cs], cabs = (S.su || {}).cab || [];
    if (B.pergola && opt.phase !== 'old') try { const cq = cabs[0] || {}, drot0 = suDoors(cq).length ? CAB_ROT[suDoors(cq)[0]] : null, csk0 = cabSkuFor(cq.glaze || 'mostly');
      const c0 = newItem('cabin'); if (csk0 && c0.sku !== csk0) { c0.sku = csk0; delete c0.layout; delete c0.lsku; cabinFoot(c0); } try { if (CS) cabinSize(c0, CS[0], CS[1]); } catch (e) {} c0.rot = 0;
      const L = rectI(c0).w, D = rectI(c0).d, BLK = (t.blocks || []).filter(b => b.type !== 'shaft'), BM = BLK.filter(b => b.type === 'mumty' || b.type === 'room'), pz = (SZF((S.su || {}).pgs && (S.su || {}).pgs[0] || ppl).pergola || [12, 10]);
      const zs = [P, r2(t.pd - P - D)]; BM.forEach(b => zs.push(r2(b.z), r2(b.z + b.d - D)));
      let best = null;
      zs.map(z => Math.max(P, Math.min(z, t.pd - P - D))).filter((z, k, A) => A.indexOf(z) === k).forEach(z => {   // a band D deep at this z: its free stretches across the width
        const cut = BLK.filter(b => b.z < z + D - 0.01 && b.z + b.d > z + 0.01).map(b => [b.x, b.x + b.w]).sort((a, b) => a[0] - b[0]), iv = []; let x = P;
        cut.forEach(([a, b]) => { if (a - x > 0.5) iv.push([x, a]); x = Math.max(x, b); }); if (t.pw - P - x > 0.5) iv.push([x, t.pw - P]);
        iv.forEach(([a, b]) => { if (b - a < L + 8) return; const touch = e => BM.some(k => Math.abs((e === 'l' ? a : b) - (e === 'l' ? k.x + k.w : k.x)) < 0.3 && k.z < z + D && k.z + k.d > z);
          ['l', 'r'].forEach(e => { const back = z <= P + 0.1, front = z + D >= t.pd - P - 0.1, rot = back ? 0 : front ? 180 : (z + D / 2 < t.pd / 2 ? 0 : 180); const mid = !back && !front;   // 259 (owner): at the back first — never the middle of the terrace when the back works
            const sc = (drot0 != null && drot0 !== rot ? -15 : 0) + (touch(e) ? 10 : 0) + (back ? 60 : 0) + (mid ? -30 : 0) + (g.road.includes(front ? 'front' : back ? 'back' : '') ? -40 : 0) - Math.abs(Math.min(30, b - a - L) * D - pz[0] * pz[1] * 1.6) * 0.05;
            if (!best || sc > best.sc) best = { sc, z, a, b, e, rot }; }); }); });
      if (best) { const { z, a, b, e, rot } = best, c = c0; c.rot = rot; c.x = e === 'l' ? a : r2(b - L); c.z = z; S.items.push(c);
        if (!clashes(c, S.items.length - 1)) { const p = newItem('pergola'); S.items.push(p);
          for (let pw = Math.min(30, r2(b - a - L)); pw >= 8; pw -= 1) { Object.assign(p, { w: pw, d: D, rot: 0, x: e === 'l' ? r2(a + L) : r2(b - L - pw), z }); if (!clashes(p, S.items.length - 1)) { J = { c, p }; break; } }
          if (!J) S.items.pop(); }
        if (!J) S.items.pop(); else notes.push('Cabin and pergola joined across the terrace'); } } catch (e) { J = null; }
    for (let ci = J ? 1 : 0; ci < Math.min(3, B.cabin || 1); ci++) { const rc = takeR('cabin'), lt = rc ? [rc[1], rc[2]] : learned('cabin'), cq = cabs[ci] || {}, csk = cabSkuFor(cq.glaze || 'mostly'), drot = suDoors(cq).length ? CAB_ROT[suDoors(cq)[0]] : null;   // 256: the walls picked + which way the door faces
      const skuPre = sz => o => { if (csk && o.sku !== csk) { o.sku = csk; delete o.layout; delete o.lsku; cabinFoot(o); o.label = prodName(csk, 'Cabin'); } if (sz) cabinSize(o, sz[0], sz[1]); };
      if (rc) { const sz = rsz(rc), wide = sz[0] >= sz[1], Lc = Math.max(sz[0], sz[1]) - 0.6, Wc = Math.min(sz[0], sz[1]) - 0.6;   // 240: where and how big LifeWall drew it; the glass front looks at the terrace
        put('cabin', (cx, cz, f, rot) => { const c = tch(cx, cz, f); return -1.2 * d2(cx, cz, lt[0], lt[1]) + 12 * faceTo(cx, cz, rot, ctr[0], ctr[1]) + frontClear(cx, cz, f, rot) + (c.n === 2 ? 26 : c.n * 12); }, { rots: drot != null ? [drot] : wide ? [0, 180] : [90, 270], keepRule: true, pre: skuPre([CS ? CS[0] : cl(Lc, 10, 20), CS ? CS[1] : cl(Wc, 8, 14)]) }); continue; }
      put('cabin', (cx, cz, f, rot) => { const c = tch(cx, cz, f); return (c.n === 2 ? 40 : c.n * 12) + 16 * (w === 'front' ? 1 - backness(cz) : backness(cz)) + (w === 'far' ? -0.4 * Math.abs(cx - farX(f[0])) : 0) - (lt ? 0.12 * d2(cx, cz, lt[0], lt[1]) : 0) - ((backZ > 0 ? c.F : c.Bk) && g.road.length ? 8 : 0) + 14 * faceTo(cx, cz, rot, ctr[0], ctr[1]) + frontClear(cx, cz, f, rot); },
        { rots: drot != null ? [drot] : [0, 90, 180, 270], keepRule: true, pre: skuPre(CS ? [CS[0], CS[1]] : null) }); }
    S.items.forEach(o => { if (o.cat !== 'cabin') return; const k = all('cabin').indexOf(o), c = cabs[k] || {};
      o.purpose = (c.use || []).slice(); o.inside = { pantry: !!c.pantry, wash: !!c.wash }; o.label = o.purpose.length ? 'Cabin · ' + o.purpose.join(', ') : prodName(o.sku, 'Cabin');
      if (c.pantry || c.wash) try { const lay = JSON.parse(JSON.stringify(cabinLay(o))), L = +lay.L || 12, pl = (lay.places || []).filter(p => !['toilet', 'wc', 'pantry'].includes(p.key));
        if (c.wash) pl.push({ key: 'toilet', x: 0, y: 0, rot: 0, len: null }); if (c.pantry) pl.push({ key: 'pantry', x: Math.max(c.wash ? 4.5 : 0, L - 6), y: 0, rot: 0, len: null }); lay.places = pl; o.layout = lay; o.lsku = o.sku; } catch (e) {} });
    S.items.forEach(o => { if (o.cat !== 'cabin' || o.old) return; const c = cabs[all('cabin').indexOf(o)] || {}; o.gs = c.gs || 1; o.ldoors = suDoors(c).map(ws => cabLocal(ws, o.rot || 0)).filter(Boolean); o.layBase = null; try { cabWalls(o); } catch (e) {} });
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
      + (face ? 9 * faceTo(cx, cz, rot, gc[0], gc[1]) : 0), { set: k === 'sofa' ? (L => ({ w: L.w, d: L.d, sconf: L.c }))(Object.assign(P2.sofaLayout(suSofa()[n || 0]), { c: (suSofa()[n || 0] || ['5']).slice() })) : zz ? { w: zz[0], d: zz[1] } : {}, rots: face ? [0, 90, 180, 270] : [0, 90] }); };
  for (let n = 0; n < (B.sofa || 0); n++) seat('sofa', 0.55, n); if (by('sofa') && wh('sofa') === 'pergola') notes.push('Sofa under the pergola, facing the garden');
  // 258 (owner): corners — the road side and the stairs door side / its opposite first; open space = the biggest free patch
  const CNR = olOn() ? olCorners() : [['bl', P, P], ['br', t.pw - P, P], ['fl', P, t.pd - P], ['fr', t.pw - P, t.pd - P]], OPP = { left: 'right', right: 'left', front: 'back', back: 'front' };
  const PREF = new Set(g.road.length ? g.road : [g.door ? OPP[g.door] : 'front']);   // 259 (owner): the front corners = the road side only
  const cornerPull = (cx, cz, f, only) => { let b = -99; CNR.forEach(([k, X, Z]) => { const pf = PREF.has(k[0] === 'b' ? 'back' : 'front') || PREF.has(k[1] === 'l' ? 'left' : 'right'); if (only && !pf) return;
    const qx = k[1] === 'l' ? cx - f[0] / 2 : cx + f[0] / 2, qz = k[0] === 'b' ? cz - f[1] / 2 : cz + f[1] / 2; b = Math.max(b, (pf ? 30 : 18) - 1.5 * Math.hypot(qx - X, qz - Z)); }); return b; };
  const crowd = (cx, cz, f, m) => { const r = { x: cx - f[0] / 2 - m, z: cz - f[1] / 2 - m, w: f[0] + 2 * m, d: f[1] + 2 * m }; return S.items.filter(o => !att(o) && CAT[o.cat] && CAT[o.cat].kind !== 'floor' && !UMB.has(o.cat) && hit(r, rectI(o))).length; };   // things within m ft (a walkway round it)
  const openC = () => { try { const fr = (P2.freeRects(t, S.items, 3) || [])[0]; if (fr && fr.w) return [fr.x + fr.w / 2, fr.z + fr.d / 2]; } catch (e) {} return gc; };
  const fbq = (S.su || {}).fbs || [];
  for (let n = 0; n < (B.fbench || 0); n++) { const sh = fbq[n] || 'L', lt = learned('fbench');   // 247: straight along a wall / L in a corner / curved in a corner
    const fpl = ((S.su || {}).fbp || [])[n] || 'none', fbk = fpl === 'back' || fpl === 'both';
    if (sh === 'L') { lSeat(g, SZ.L || [10, 6], lt, PR, notes, fpl) || miss++; continue; }
    if (sh === 'straight') { put('fbench', (cx, cz, f, rot) => (backTo(cx, cz, f, rot) ? 40 : -30) - (PR.some(r => inR(cx, cz, r)) ? 30 : 0) + cornerPull(cx, cz, f, true) - (lt ? 0.1 * d2(cx, cz, lt[0], lt[1]) : 0), { rots: [0, 90, 180, 270], set: { w: (SZ.L || [10])[0], d: fbk ? 4.5 : 3, label: 'Fixed seating', plant: fpl } }) || miss++; continue; }
    const cs = Math.max(7, Math.min(10, (SZ.L || [10])[0] - 1)), CN = olOn() ? olCorners() : [['bl', P, P], ['br', t.pw - P, P], ['fl', P, t.pd - P], ['fr', t.pw - P, t.pd - P]], ROT = { bl: 0, br: 90, fr: 180, fl: 270 };
    let best = null; CN.forEach(([k, X, Z]) => { const it = newItem('fbench'); Object.assign(it, { w: cs, d: cs, shape: 'curve', label: 'Curved seating', rot: ROT[k], x: k[1] === 'l' ? X : X - cs, z: k[0] === 'b' ? Z : Z - cs });   // a quarter arc hugging that corner
      const i = S.items.length; S.items.push(it); const ok = !clashes(it, i) && !PR.some(r => hit(rectI(it), r)); S.items.pop(); if (!ok) return;
      const sc = (g.road.includes(k[0] === 'b' ? 'back' : 'front') ? 20 : 0) - (g.dz ? (d2(it.x + cs / 2, it.z + cs / 2, g.dz.x + g.dz.w / 2, g.dz.z + g.dz.d / 2) < 10 ? 15 : 0) : 0) - (lt ? 0.2 * d2(it.x + cs / 2, it.z + cs / 2, lt[0], lt[1]) : 0); if (!best || sc > best[0]) best = [sc, it]; });
    if (best) { S.items.push(best[1]); if (n === 0) notes.push('Curved seating hugging a corner'); } else miss++; }
  for (let n = 0; n < (B.dining || 0); n++) seat('dining', 0.7, n);
  for (let n = 0; n < (B.swing || 0); n++) { const oc = openC(); put('swing', (cx, cz, f, rot) => Math.max(cornerPull(cx, cz, f), 25 - 1.2 * d2(cx, cz, oc[0], oc[1])) + 9 * faceTo(cx, cz, rot, gc[0], gc[1]) - 25 * crowd(cx, cz, f, 2.5), { rots: [0, 90, 180, 270] }); }   // 258: a corner or the open space
  for (let n = 0; n < (B.bench || 0); n++) put('bench', (cx, cz, f) => -d2(cx, cz, farX(f[0]), t.pd * 0.25) + wallBonus(f, cx, cz, g.far));
  for (let n = 0; n < (B.counter || 0); n++) { const nr = by('dining') || pg || by('fbench'), lt = learned('counter');   // food counter: its back to a wall, near where people eat
    put('counter', (cx, cz, f, rot) => (backTo(cx, cz, f, rot) ? 40 : -90) + 2.2 * cornerPull(cx, cz, f, true) - 40 * backness(cz) - (nr ? 0.2 * d2(cx, cz, rectI(nr).x + rectI(nr).w / 2, rectI(nr).z + rectI(nr).d / 2) : lt ? 0.15 * d2(cx, cz, lt[0], lt[1]) : 0), { rots: [0, 90, 180, 270] });   // 258: always against a wall, in a front corner
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
    const wv = ((S.su || {}).wm || [])[n] || 'cascade', wc = wCodeOf(wv), mech = wMech(wc), wsz = WSZ[wc];
    put('water', (cx, cz, f, rot) => (mech !== 'geyser' ? (backTo(cx, cz, f, rot) ? 30 : -20) : 0) + (w === 'seat' && (by('sofa') || pr) ? -d2(cx, cz, rectI(by('sofa') || pg).x + rectI(by('sofa') || pg).w + 3, rectI(by('sofa') || pg).z + 3)
      : fw ? -d2(cx, cz, rectI(fw).x + rectI(fw).w / 2 + (g.facing === 'right' ? -3 : g.facing === 'left' ? 3 : 0), rectI(fw).z + rectI(fw).d / 2 + (g.facing === 'back' ? 3 : g.facing === 'front' ? -3 : 0))
      : -d2(cx, cz, g.facing === 'right' ? t.pw - P - 3 : g.facing === 'left' ? P + 3 : t.pw / 2, g.facing === 'back' ? P + 3 : g.facing === 'front' ? t.pd - P - 3 : mU)), { rots: mech !== 'geyser' ? [0, 90, 180, 270] : [0], set: Object.assign({ mech, w: wsz[0], d: wsz[1], wsku: 'MTO-' + wc, label: WNAME[wc] || 'Water feature' }, prAll()['MTO-' + wc] ? { pick: 'MTO-' + wc } : {}) });
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
    else { const it2 = { cat: 'privacy', mode: 'par', label: 'Screen on the parapet', sides: g.open.slice(), h: 3, w: 0, d: 0.3, x: 0, z: 0, rot: 0 }; S.items.push(it2); attach(it2, S.items.length - 1); if (!it2.w) { S.items.pop(); miss++; } else { splitPar(); notes.push('Privacy screens on the ' + g.open.join(', ') + ' parapet'); } } }
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
  // 218b: real Landscape Plants (each its own 3D model) — a palm in every corner, accent plants by the pergola / cabin and at the layouts' spots; the FRP troughs (258) stay along the parapets;
  // sun plants in the open, semi-shade ones within 3 ft of a wall / block / pergola / cabin. One palm for every corner, three plants taking turns.
  const PG = plantList(), real = PH !== 'old' && Object.keys(PG).length > 0, seed = Math.round(t.pw * 7 + t.pd * 3);
  const POOL = THPOOL[(S.su || {}).thm] || {
    corner: { S: ['ARECA', 'PHOENIX', 'FOXTAIL', 'LIVISTONA', 'BAMBOO'], SS: ['RHAPIS', 'ARECA', 'BAMBOO', 'LIVISTONA'] },
    wall: { S: ['KAMINI', 'HIBISCUS', 'TECOMA', 'IXORA', 'CROTON', 'MORPANKHI', 'FOUNTAINGRASS', 'DURANTA', 'KANER'], SS: ['SONGOFINDIA', 'CORDYLINE', 'SCHEFFLERA', 'CHANDNI', 'SNAKEPLANT', 'CROTON'] },
    accent: { S: ['BIRDPARADISE', 'MOGRA', 'CHAMPA', 'ADENIUM', 'AGAVE', 'BANANA'], SS: ['RHAPIS', 'SCHEFFLERA', 'SNAKEPLANT', 'BIRDPARADISE'] } }, HT = { corner: 6, wall: 4, accent: 4.5, olive: 5 }, rN = {};
  const shadeAt = (x, z) => (t.blocks || []).some(b => x > b.x - 3 && x < b.x + b.w + 3 && z > b.z - 3 && z < b.z + b.d + 3) || S.items.some(o => (o.cat === 'pergola' || o.cat === 'cabin') && (f => x > o.x - 3 && x < o.x + f[0] + 3 && z > o.z - 3 && z < o.z + f[1] + 3)(foot(o)));
  const species = (role, tg) => { const lt = shadeAt(tg[0], tg[1]) ? 'SS' : 'S', ok = k => (PG[k] || NOCAT.has(k)) && (PLANT_LIGHT[k] === lt || PLANT_LIGHT[k] === 'B'), pool = POOL[role][lt].filter(ok); if (!pool.length) return Object.keys(PG)[0];
    if (role === 'corner') return pool[seed % pool.length]; const n = rN[role + lt] = (rN[role + lt] || 0) + 1; return pool[(seed + (n % 3)) % pool.length]; };
  const TKM = ['turkish', 'santorini', 'boho'].includes((S.su || {}).thm);   // 296: Santorini plants like Turkish — urns, olive pairs   // 294 (owner): Turkish = fewer plants, in pairs — urns along the walls (no FRP troughs), an olive each side of the fountain / feature wall
  const plants = (lv, n0) => { const LOAD = lv === 'lush' && (S.su || {}).thm === 'tropical', C1 = P + 1.2, gap = LOAD ? 2.4 : lv === 'lush' ? 3.5 : 4.5;   // 293 (owner): tropical = loaded — corner clusters, plants by every main piece, troughs closer
    const NOFZ = new Set(['planter', 'deck', 'turf', 'pathway', 'privacy', 'accover', 'shaftcover', 'railing', 'gate', 'lights', 'plant']);
    const inFront = (r, i) => S.items.some((o, j) => { if (j === i || att(o) || NOFZ.has(o.cat) || !CAT[o.cat] || CAT[o.cat].kind === 'floor') return false; const q = rectI(o), F = FACE[((+o.rot || 0) % 360 + 360) % 360] || [0, 1], m = 4;   // 259 / 273 (owner): a planter never stands in front of any thing (feature walls, water, bar… too) — 4 ft clear in front, 1.5 ft all round
      if (hit(r, { x: q.x - 1.5, z: q.z - 1.5, w: q.w + 3, d: q.d + 3 }) && !['cabin', 'pergola'].includes(o.cat)) return true;
      const z = F[1] > 0 ? { x: q.x, z: q.z + q.d, w: q.w, d: m } : F[1] < 0 ? { x: q.x, z: q.z - m, w: q.w, d: m } : F[0] < 0 ? { x: q.x - m, z: q.z, w: m, d: q.d } : { x: q.x + q.w, z: q.z, w: m, d: q.d }; return hit(r, z); });
    const quiet = (tg, far, frp, role) => { const pl = real && !frp, it = newItem(pl ? 'plant' : 'planter'); if (!it) return; if (frp) Object.assign(it, { w: 5, d: 1.6, frp: true, label: 'FRP planter' }); if (pl) { it.h = HT[role || 'accent']; plantSet(it, species(role || 'accent', tg)); } const i = S.items.length; S.items.push(it); /* 258 (owner): rectangular FRP planters along the parapets */ const ctrI = o => { const r = rectI(o); return [r.x + r.w / 2, r.z + r.d / 2]; }, near = (x, z) => S.items.some((o, j) => j !== i && (o.cat === 'planter' || o.cat === 'plant') && d2(x, z, ...ctrI(o)) < gap);
      const ok = spotBest(it, i, (cx, cz) => -d2(cx, cz, tg[0], tg[1]) - (near(cx, cz) ? 50 : 0), frp ? [frp === 'v' ? 90 : 0] : [0], g.dz && Object.assign({ fr: g.fr }, g.dz));
      if (!ok || near(...ctrI(it)) || d2(...ctrI(it), tg[0], tg[1]) > (LOAD ? Math.max(far || 4, 6.5) : far || 4) || all('pergola').some(o => hit(rectI(it), rectI(o))) || inFront(rectI(it), i)) { S.items.pop(); return; } flush(it, i); };   // never under the pergola
    const CRN = olOn() ? olCorners().map(([k, X, Z]) => [X + (k[1] === 'l' ? 1.2 : -1.2), Z + (k[0] === 'b' ? 1.2 : -1.2)]) : [[C1, C1], [t.pw - C1, C1], [C1, t.pd - C1], [t.pw - C1, t.pd - C1]]; CRN.forEach(tg => quiet(tg, null, null, 'corner'));
    if (LOAD && n0 == null) CRN.forEach(tg => { const sx = tg[0] < t.pw / 2 ? 1 : -1, sz = tg[1] < t.pd / 2 ? 1 : -1; quiet([tg[0] + sx * 3, tg[1]], 2.5, null, 'wall'); quiet([tg[0], tg[1] + sz * 3], 2.5, null, 'wall'); quiet([tg[0] + sx * 2.6, tg[1] + sz * 2.6], 2.5, null, 'accent'); });
    if (n0 != null) { for (let k = 0, u = 0; k < n0; k++, u++) { const s2 = [P + 1, P + 1 + (t.pd - 2 * P - 2) * (u + 0.5) / n0]; quiet(g.far === 'right' ? [t.pw - P - 1, s2[1]] : s2, 5); } return; }
    if (lv === 'light') return;
    { const pts = []; LAY.slice(0, lv === 'lush' ? 3 : 2).forEach(L => L.els.forEach(e => { if (e[0] === 'planter') pts.push([e[1], e[2]]); })); pts.slice(0, lv === 'lush' ? 10 : 5).forEach(tg => quiet(tg, 5)); }
    const step = TKM ? 9.5 : LOAD ? 5 : lv === 'lush' ? 6.5 : 7.5, fx = g.far === 'right' ? t.pw - C1 : C1, nx = g.far === 'right' ? C1 : t.pw - C1;   // 241: along the parapets; 258: FRP troughs, a few more
    if (olOn()) olWalls().forEach(w => { if (w.hi - w.lo < 6) return; const sd = w.vert ? (w.dir > 0 ? 'left' : 'right') : (w.dir > 0 ? 'back' : 'front'); if (g.road.includes(sd) && !(w.vert ? false : w.dir < 0 && w.at < t.pd - P - 2)) return;   // 244: along every wall of the shape (not the road side)
      for (let u = w.lo + P + 4; u < w.hi - P - 3; u += step) quiet(w.vert ? [w.at + w.dir * 1.2, u] : [u, w.at + w.dir * 1.2], 3, TKM ? null : w.vert ? 'v' : 'h', TKM ? 'wall' : undefined); });
    else { const fv = TKM ? null : 'v', fh = TKM ? null : 'h', rl = TKM ? 'wall' : undefined; for (let z = P + 5; z < t.pd - 5; z += step) { quiet([fx, z], 3, fv, rl); quiet([nx, z + step / 2], 3, fv, rl); }
    for (let x = P + 5; x < t.pw - 5; x += step) { if (!g.road.includes('back')) quiet([x, C1], 3, fh, rl); } }
    if (lv === 'lush') { const nx = g.far === 'right' ? C1 : t.pw - C1; const sp = LOAD ? 6 : 9; for (let z = P + 8; z < t.pd - 6; z += sp) quiet([nx, z], 3, null, 'wall'); for (let x = P + 8; x < t.pw - 6; x += sp) { quiet([x, C1], 3, null, 'wall'); quiet([x, t.pd - C1], 3, null, 'wall'); } }
    if (pr) { const r = pr; [[r.x - 1, r.z - 1], [r.x + r.w + 1, r.z - 1], [r.x - 1, r.z + r.d + 1], [r.x + r.w + 1, r.z + r.d + 1]].forEach(tg => quiet(tg, 2.5)); }
    const cbs = all('cabin'); cbs.forEach(c => { const r = rectI(c); quiet([r.x - 1.2, r.z + r.d + 1], 2.5); quiet([r.x + r.w + 1.2, r.z + r.d + 1], 2.5); });
    if (TKM) S.items.filter(o => !o.old && ['feature', 'water'].includes(o.cat)).forEach(o => { const r = rectI(o), v = r.w >= r.d; (v ? [[r.x - 2.8, r.z + r.d / 2], [r.x + r.w + 2.8, r.z + r.d / 2]] : [[r.x + r.w / 2, r.z - 2.8], [r.x + r.w / 2, r.z + r.d + 2.8]]).forEach(tg => quiet(tg, 3.5, null, 'olive')); });
    if (LOAD) S.items.filter(o => !o.old && ['feature', 'water', 'bar', 'fbench', 'counter', 'sofa', 'vgarden', 'graffiti', 'swing'].includes(o.cat)).forEach(o => { const r = rectI(o); quiet([r.x - 1.4, r.z + r.d / 2], 2.5, null, 'accent'); quiet([r.x + r.w + 1.4, r.z + r.d / 2], 2.5, null, 'accent'); quiet([r.x + r.w / 2, r.z - 1.4], 2.5, null, 'wall'); }); };
  if (B.turf && false && PH !== 'decor') grassFill(g, B.pathway, notes, mumtyFace());   // 245: the grass fills the open space left once the big pieces stand
  if (PH === 'old') { if (B.planter) plants('light', B.planter); } else if (PH !== 'el' && !(opt && opt.noPlants)) { if (S.su && S.su.green) { plants(S.su.green); notes.push('Plants in the corners and along the walls, spaced out'); } else if (B.planter) plants('light', B.planter); }
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
const rGap2 = (a, b) => Math.hypot(Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w)), Math.max(0, a.z - (b.z + b.d), b.z - (a.z + a.d)));
function stoolsFix() {   // 268 (owner): a bar moved / turned / flipped → its bar chairs go back to its outside
  S.items.filter(o => o.cat === 'bar').forEach(b => { const k = JSON.stringify([b.x, b.z, b.w, b.d, b.rot || 0, !!b.flip, b.shape || '']); if (b._sk === k) return; const had = b._sk != null; b._sk = k; if (!had) return; const r = rectI(b);
    const near = S.items.filter(o => o.cat === 'stool' && !o.pick && (q => q.x + q.w > r.x - 3 && q.x < r.x + r.w + 3 && q.z + q.d > r.z - 3 && q.z < r.z + r.d + 3)(rectI(o))); if (!near.length) return; const so = S.sel != null ? S.items[S.sel] : null; S.items = S.items.filter(o => !near.includes(o)); barStools(b); if (so) S.sel = S.items.indexOf(so) >= 0 ? S.items.indexOf(so) : null; }); }
function barStools(b) {   // 258 (owner): chairs on the outside — the front of the bar, and the outer side of an L's return arm
  const r = rectI(b), a = (+b.rot || 0) * Math.PI / 180, u = [Math.cos(a), Math.sin(a)], v = [-Math.sin(a), Math.cos(a)], cx = r.x + r.w / 2, cz = r.z + r.d / 2, w = +b.w, d = +b.d, L = b.shape === 'L', fl = b.flip ? -1 : 1, D = 2.2, pts = [];
  const nF = Math.max(1, Math.min(5, Math.floor((w - 0.5) / 2.2))); for (let k = 0; k < nF; k++) pts.push([-w / 2 + w * (k + 0.5) / nF, d / 2 + 1.1]);
  if (L) { const run = d - D, nS = Math.max(0, Math.min(4, Math.floor((run - 0.3) / 2.2))); for (let k = 0; k < nS; k++) pts.push([fl * (w / 2 + 1.1), -d / 2 + run * (k + 0.5) / nS]); }
  pts.forEach(([lx, lz]) => { const it = newItem('stool'); if (!it) return; it.rot = (+b.rot || 0) % 360; const X = cx + lx * u[0] + lz * v[0], Z = cz + lx * u[1] + lz * v[1];
    it.x = r2(X - 0.75); it.z = r2(Z - 0.75); const i = S.items.length; S.items.push(it); if (clashes(it, i)) S.items.pop(); }); }
// 245: the floor look's patterned 'rugs' — Moroccan tiles under the open seating (garden walk) or under every seating area (courtyard)
function floorRugs() { const t = S.site, f = t.floor || (t.floor = {}), pr = f.preset; f.rugs = []; return;   // 268 (owner): no rug / Moroccan patches by the seating
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
// 258: which ends of each L arm are open (planter there with "sides") — the arm along the corner wall gets the corner planter, the other arm's corner end stays a seat
function lEnds(A, Bb) { const ends = o => { const r = rectI(o), a = (+o.rot || 0) * Math.PI / 180, ux = Math.cos(a), uz = Math.sin(a), cx = r.x + r.w / 2, cz = r.z + r.d / 2; return [[cx - ux * o.w / 2, cz - uz * o.w / 2], [cx + ux * o.w / 2, cz + uz * o.w / 2]]; };
  const rb = rectI(Bb), ra = rectI(A), near = (p, r) => p[0] >= r.x - 0.6 && p[0] <= r.x + r.w + 0.6 && p[1] >= r.z - 0.6 && p[1] <= r.z + r.d + 0.6;
  const ea = ends(A), eb = ends(Bb); A.pend = { l: true, r: true }; Bb.pend = { l: !near(eb[0], ra), r: !near(eb[1], ra) }; }
function lSeat(g, sz, lt, PRS, notes, pl) {   // 241: open to the sky (never under a pergola), best in a corner on the road side
  const t = S.site, P = g.P, D = pl === 'back' || pl === 'both' ? 4.5 : 3, cn =   /* 259 (owner): the seat itself ≥ 2 ft deep */ olOn() ? olCorners() : [['bl', P, P], ['br', t.pw - P, P], ['fl', P, t.pd - P], ['fr', t.pw - P, t.pd - P]];
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
  if (!best) return false; { const gid = 'L' + Math.random().toString(36).slice(2, 7); best[1].grp = gid; best[2].grp = gid; if (pl && pl !== 'none') { best[1].plant = pl; best[2].plant = pl; lEnds(best[1], best[2]); } } S.items.push(best[1], best[2]); notes.push('Built-in L seating in the open corner on the road side'); return true;
}
const inR2 = (cx, cz, r) => cx > r.x - 1 && cx < r.x + r.w + 1 && cz > r.z - 1 && cz < r.z + r.d + 1;
function stepPick() {
  if (!S.items.length) return '<h4>Pick designs</h4><p class="pl-sub">Add something to your space first.</p>';
  if (!priceOk()) return '<h4>Pick designs</h4><p class="pl-sub">Sign in to see the designs at your sizes and their prices.</p><button type="button" class="pl-lock" data-pl="unlock">🔒 Sign in to see prices</button>';
  if (S.cust && S.items[S.cust.i]) return custSheet();
  let h = '<h4>Pick designs</h4><p class="pl-sub">Each thing at the size you set — tap a design to choose it, then Customise it. Change the size in step 2.</p>';
  S.items.forEach((it, i) => { if (it.old) return;
    const c = CAT[it.cat], ch = choices(it), pk = picked(it);
    h += `<div class="pl-pk"><div class="pl-pkh"><b>${c.e} ${esc(it.label || c.t)}</b><span>${pk ? (pk.q.soon ? 'Coming soon' : rs(pk.q.price)) : ''}</span></div>${pk && pk.q.n > 1 ? `<p class="pl-sub" style="margin:-4px 0 8px">${it.w} ft — goes as ${pk.q.n} pieces of ${pk.q.o.l || pk.q.o.w} ft</p>` : ''}`;
    if (!ch.length) { h += '<p class="pl-sub" style="margin:4px 0 0">No design open for orders at this size yet — our team will help.</p></div>'; return; }
    h += '<div class="pl-row2">' + ch.slice(0, 12).map(x => { const p = PR()[x.id], on = pk && pk.id === x.id, im = IMG(x.id);
      return `<button type="button" class="pl-ds${on ? ' on' : ''}" data-pl="pick:${i}:${esc(x.id)}" aria-pressed="${on}">${im ? `<img src="${esc(im)}" alt="" loading="lazy">` : '<i></i>'}<b>${esc(String(p.n).replace(/ — .*$/, ''))}</b>${x.th ? '<em class="pl-thb">Your theme</em>' : ''}<small>${x.q.soon ? 'Coming soon' : rs(x.q.price)}</small></button>`; }).join('') + '</div>';
    if (pk && c.rts) { h += '<div class="pl-tabs" style="margin-top:6px">' + (plantList()[it.plant] || []).map(id => btn(`data-pl="plsz3:${i}:${id}"`, id === it.pick, esc(String((PR()[id] || {}).vs || '').split(' · ')[0]))).join('') + `</div><a class="pl-see" href="/?p=${encodeURIComponent(pk.id)}" target="_blank" rel="noopener">See this plant ↗</a></div>`; return; }
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
  for (const it of S.items) { const pk = picked(it); if (!pk || it.cat === 'plant') continue; const q = await window.mtoEstimate(pk.id, pk.q.o, pin), n = pk.q.n || 1;
    if (!q || !q.ok) { na++; prod += pk.q.price; continue; } prod += (q.product || 0) * n; dlv += (q.delivery_fee || 0) * n; inst += (q.install_fee || 0) * n; }
  S.est = { pin, res: { pin, dlv, inst, na, total: prod + dlv + inst } }; try { const a = JSON.parse(localStorage.getItem('outrr_addr') || '{}'); if (!a.pincode) { a.pincode = pin; localStorage.setItem('outrr_addr', JSON.stringify(a)); } } catch (e) {}
  draw(false);
}
function lwCard() { return '<div class="pl-note" style="margin:0 0 12px"><b>A big project?</b> For a whole terrace or a large cabin, our group company <b>LifeWall</b> can design and build it all turnkey — one team, one price. <button type="button" class="pl-lock" data-pl="lw" style="margin-top:8px;display:block">Talk to LifeWall (free consultation) →</button></div>'; }
function exact() { let t = 0, n = 0; S.items.forEach(it => { const pk = picked(it); if (pk) { t += pk.q.price; n++; } }); return { t, n }; }
function toCart() {
  if (!priceOk()) return unlock();
  const pl = {}; let plSoon = 0; S.items.forEach(it => { if (it.cat !== 'plant') return; const pk = picked(it); if (!pk) return; if (pk.q.soon) plSoon++; else pl[pk.id] = (pl[pk.id] || 0) + 1; });   // 218b: plants go to the ready-to-ship cart
  const lines0 = []; S.items.forEach(it => { const pk = it.cat === 'plant' ? null : picked(it); if (pk) for (let k = 0; k < (pk.q.n || 1); k++) lines0.push({ id: pk.id, o: pk.q.o }); });   // a long screen = its equal pieces
  const lines = []; lines0.forEach(ln => { const mx = +(((PR()[ln.id] || {}).cz || {}).pcs || {}).max || 1, key = ln.id + JSON.stringify(ln.o);   // 199: the same design set up the same way → one line of N pieces
    const hit = mx > 1 && lines.find(z => z.key === key && (z.o.pcs || 1) < mx); if (hit) hit.o = Object.assign({}, hit.o, { pcs: (hit.o.pcs || 1) + 1 }); else lines.push({ id: ln.id, o: Object.assign({}, ln.o), key }); });
  lines.forEach(z => delete z.key);
  if (lines.length > 20) { S.msg = 'That is ' + lines.length + ' designs (long screens go as pieces) — one order takes up to 20. Take some off, or ask our team for one quote.'; return draw(false); }
  const plIds = Object.keys(pl);
  if (!lines.length && !plIds.length) { S.msg = plSoon ? 'The plants open for orders soon — they stay on your plan' : 'Nothing here can be ordered yet'; return draw(false); }
  if (plIds.length && typeof window.addCart === 'function') plIds.forEach(id => { for (let k = 0; k < Math.min(pl[id], 10); k++) window.addCart(id); });
  if (!lines.length) { ev('plan_to_cart', { value: Math.round(exact().t) }); close(); if (window.openCart) window.openCart(); if (plSoon && window.toast) setTimeout(() => window.toast(plSoon + ' plant(s) open for orders soon — not added'), 600); return; }
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
function draw(rec) { if (QUIET) return; if (S.su && (S.su.thm === 'minimal' || S.su.thm === 'contemporary')) { try { themeApply(S.su.thm === 'minimal' ? 'modern' : 'fusion', true); } catch (e) {} }   /* 300: Contemporary → Fusion */   /* 297: Minimal dropped */ if (suMig()) return;
  if (QUIET) return;
  if (S.items) { S.items.forEach((it, i) => { if (att(it)) attach(it, i); }); S.items = S.items.filter(it => it.mode !== 'ac' || it.box); S.items.forEach((it, i) => { if (it.cat === 'pergola') pergolaAttach(it, i); }); if (S.sel != null && !S.items[S.sel]) S.sel = null; }
  if (rec !== false) hist(); save();
  if (S.step === 2 && S.su && S.su.done) S.step = 1;   // 279: before the header too
  document.getElementById('plSt').innerHTML = S.su && S.su.done ? (S.step === 2 ? btn('data-pl="step:1"', false, '← Back to my plan') : '') : btn('data-pl="step:0"', S.step === 0, '1 · <span class="pl-l">Your </span>space') + btn('data-pl="step:1"', S.step === 1, '2 · Add<span class="pl-l"> things</span>') + btn('data-pl="step:2"', S.step === 2, '3 · Pick<span class="pl-l"> designs</span>');
  if (gateDue() && !priceOk()) S.gate = true;
  if (suNeed() && !(S.su && S.su.on)) setTimeout(() => { const q = S.su && S.su.left ? S.su.q : 0; if (S.su) S.su.left = false; suOpen(q); }, 0);
  if (S.step === 2 && S.su && S.su.done) S.step = 1;
  document.getElementById('plPn').innerHTML = S.gate && !priceOk() ? gateCard() : S.step === 0 ? stepSite() : S.step === 2 ? stepPick() : stepPlace();
  EL.classList.toggle('pl-locked', !!(S.gate && !priceOk())); paintSaved();
  const T = total(), lock = !priceOk();
  const E = exact();
  document.getElementById('plFt').innerHTML = S.step === 0 ? (siteLast() ? '<button type="button" class="pl-go" data-pl="step:1">Next: add things →</button>' : '<button type="button" class="pl-go" data-pl="tsq:1">Next →</button>')
    : S.step === 2 ? (lock || !S.items.length ? '' : `<div class="pl-tot"><b>${E.n ? lakh(E.t) : '—'}</b><small>${E.n} design${E.n === 1 ? '' : 's'} · before delivery & installation (added at checkout)</small></div><button type="button" class="pl-go" data-pl="cart"${E.n ? '' : ' disabled'}>Add all to cart</button>`)
    : `<div class="pl-tot">${S.items.length ? (lock ? '<b>🔒</b><small>Sign in to see the estimate</small>' : (T.n ? `<b>${lakh(T.t)}+</b><small>${S.items.length} thing${S.items.length > 1 ? 's' : ''} · starting price${T.n < S.items.length ? ' of ' + T.n : ''}, before delivery & installation</small>` : `<b>—</b><small>Prices open soon for these</small>`)) : '<b>—</b><small>Add something to see the estimate</small>'}</div>` + (S.items.length ? '<button type="button" class="pl-go" data-pl="step:2">' + (S.su && S.su.done ? 'See my proposal →' : 'Pick designs →') + '</button>' : '');
  document.getElementById('plZ').innerHTML = (S.su && S.su.done ? '' : `<button type="button" data-pl="undo" aria-label="Undo" title="Undo (Ctrl+Z)"${S.hi > 0 ? '' : ' disabled'}>↶</button><button type="button" data-pl="redo" aria-label="Redo" title="Redo (Ctrl+Y)"${S.hi < S.hist.length - 1 ? '' : ' disabled'}>↷</button>`) +
    `<button type="button" data-pl="view" class="${S.view === 'top' ? 'on' : ''}" aria-label="${S.view === 'top' ? '3D view' : 'Top view'}" title="${S.view === 'top' ? '3D view' : 'Top view'}">${S.view === 'top' ? '🧊' : '▦'}</button><button type="button" data-pl="zin" aria-label="Zoom in">+</button><button type="button" data-pl="zout" aria-label="Zoom out">−</button><button type="button" data-pl="home" aria-label="Whole space" title="Whole space">⌖</button><button type="button" data-pl="pan" class="${S.pan ? 'on' : ''}" aria-label="Move the view" title="Move the view">✋</button><button type="button" data-pl="lab" class="${S.lab ? 'on' : ''}" aria-label="Show names" title="Show names">🏷</button>${S.su && S.su.done ? '<button type="button" data-pl="plan2d" aria-label="Edit the 2D plan" title="Edit the 2D plan">📐</button>' : ''}<button type="button" data-pl="night" class="${S.night ? 'on' : ''}" aria-label="${S.night ? 'Day view' : 'Night view'}" title="${S.night ? 'Day view' : 'Night view'}">${S.night ? '☀️' : '🌙'}</button>` + (S.items.length ? '<button type="button" data-pl="share" aria-label="Share this plan" title="Share this plan">🔗</button><button type="button" data-pl="pdf" aria-label="Save as PDF" title="Save as PDF">⎙</button>' : '');
  try { tabs3(); } catch (e) {}
  try { S3.show(document.getElementById('pl3d'), { creepers: crOn(), site: S.site, items: S.items, sel: S.step === 1 ? S.sel : null, cabinCfg, cabinLay, pergolaSku: 'MTO-PG-TW', noDrag: !!(S.su && S.su.done), theme: (S.su && S.su.theme) || 'natural', fmix: S.su && S.su.fmix, night: !!S.night, labels: !!S.lab }, { place: S.step === 0, view: S.view }); } catch (e) { if (window.console) console.warn(e); }
}

function onClick(e) {
  const b = e.target.closest('[data-pl]'); if (!b || b.disabled) return; if (act(b.getAttribute('data-pl').split(':')) === true) draw();
}
function act(a) {   // one button's action on S; true = draw again
  const t = S.site, it = S.sel != null ? S.items[S.sel] : null; S.msg = '';
  switch (a[0]) {
    case 'close': return exitAsk(close);
    case 'undo': return undo(-1);
    case 'redo': return undo(1);
    case 'zin': return S3.zoom(0.8);
    case 'zout': return S3.zoom(1.25);
    case 'home': return S3.home();
    case 'cta': S.ctaOpen = !S.ctaOpen; return draw(false);   // 282: the stage panel after the setup
    case 'go2': { S.ctaOpen = false; if (S.su) S.su.rev = true; suOpen(SUQ.indexOf(a[1])); return; }
    case 'stx': { const o = S.stOpen || (S.stOpen = {}); o[a[1]] = !o[a[1]]; return draw(false); }
    case 'v3s': return stage3D(a[1]);
    case 'sted': case 'stpk': { if (!S.su) return; const it = a[0] === 'stpk' ? S.items[+a[1]] : null, dec = a[0] === 'stpk' ? isDecor(it) : DECOR.has(a[1]); S.su.rev = true; S.sel = null; suOpen(SUQ.indexOf(dec ? 'plan' : 'eplan'));   // 302 (owner): ✎ on a thing after the setup → straight to its own editor
      if (a[0] === 'sted') { S.su.edMain = true; suDo('sedit:' + a[1] + ':' + (+a[2] || 0)); } else if (it) { S.sel = S.items.indexOf(it); S.suSz = true; S.suMv = false; suPaint(); } return; }
    case 'stq': { if (a[1] === 'roof') return suRoof(); const i = SUQ.indexOf(a[1]); if (i < 0 || !S.su) return;
      if (S.su.done && !['asbuilt', 'base', 'eplan', 'plan', 'theme', 'flay', 'prop'].includes(a[1])) { S.su.rev = true; S.sel = null; suOpen(SUQ.indexOf('eplan')); S.su.edMain = true; suDo('sedq:' + a[1] + (a[2] ? ':' + a[2] : '')); return; }   /* 302 (owner): an answer changed from the 3D's panel opens right there and saving goes back to the 3D (no next, next…) */ S.su.rev = true; S.sel = null; suOpen(i); if (a[1] === 'existing') { S.su.exq = 0; S.su.exK = a[2] || null; suPaint(); } return; }
    case 'plan2d': { if (!(S.su && S.su.decorDone)) { suOpen(S.su && S.su.done ? SUQ.indexOf('plan') : S.su ? S.su.q : 0); return; } let m = EL.querySelector('.pl-ask2'); if (!m) { m = document.createElement('div'); m.className = 'pl-ask2'; EL.appendChild(m); }   // 260 (owner): which round to change
      m.innerHTML = '<div class="pl-ask2b"><h3>What do you want to change?</h3><button type="button" data-pl="p2:ab"><b>Roof as it stands</b><small>What is built there now, its size and shape, things to take down…</small></button><button type="button" data-pl="p2:el"><b>Main elements</b><small>Cabin, pergola, deck, bar, seating, feature wall, water…</small></button><button type="button" data-pl="p2:dec"><b>Furniture, plants &amp; decor</b><small>Sofas, dining, chairs, plants, lights…</small></button><button type="button" class="x" data-pl="p2:x">Cancel</button></div>'; m.style.display = 'flex'; return; }
    case 'p2': { const m = EL.querySelector('.pl-ask2'); if (m) m.style.display = 'none'; if (S.su) S.su.rev = true;   // 278 (owner): back to a stage — later steps only show their 2D plans, every answer kept
      if (a[1] === 'ab') suOpen(SUQ.indexOf('asbuilt')); else if (a[1] === 'el') suOpen(SUQ.indexOf('eplan')); else if (a[1] === 'dec') suOpen(SUQ.indexOf('plan')); return; }
    case 'night': S.night = !S.night; return S3.busy(() => draw(false), S.night ? null : ['Back to daylight…']);   // 268
    case 'lab': S.lab = !S.lab; return draw(false);   // 263 (owner): names only when asked
    case 'pan': S.pan = !S.pan; S3.panMode(S.pan); return draw(false);
    case 'look': { S.su = S.su || {}; S.su.theme = a[1]; S.site.floor = Object.assign({ pebble: true }, S.site.floor || {}); if (!['greek', 'geometric', 'keep'].includes(S.site.floor.preset)) S.site.floor.tile = (THEME_T[a[1]] || THEME_T.natural)[1]; S.site.floor.theme = a[1]; ev('plan_theme', { ref: a[1] }); break; }
    case 'view': S.view = S.view === 'top' ? '3d' : 'top'; return draw(false);
    case 'step': if (a[1] === '0' && S.site.kind === 'terrace' && S.su && S.su.done && window.mtoSpaceAsk) { suRoof(); return; }
      if (a[1] === '2' && S.su && S.su.done) { S.step = 1; suOpen(SUQ.indexOf('prop')); return; }   // 277 (owner): after the setup there is no Pick designs — the proposal opens
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
    case 'rename': { if (S.sh) return; const nm = prompt('Name this plan', S.pname || ''); if (nm && nm.trim()) { S.pname = nm.trim().slice(0, 120); if (S.pid && !assistTok()) rpc('plan_rename', { p_id: S.pid, p_name: S.pname }).then(paintSaved).catch(() => {}); save(); } paintSaved(); try { if (S.su && S.su.on) suPaint(); } catch (e) {} return; }   // 273: own plans only (a shared plan is renamed by its owner)
    case 'newplan': if (!confirm('Start a new plan? This one stays saved in your account.')) return; lockGo(false); { const v = S.view; S = fresh(); S.view = v; S.hist = []; S.hi = -1; S.pid = null; S.pname = ''; } break;
    case 'shretry': lockGo(true); return;
    case 'shcopy': rpc('shared_plan_copy', { p_id: S.sh.id }).then(r => { if (r && r.id) { lockGo(false); openSaved(r.id); } }).catch(e => alert(e.message)); return;
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
    case 'del': if (it) { prefDrop([S.sel]); S.items.splice(S.sel, 1); S.sel = null; } break;
    case 'dup': if (it) { const c2 = JSON.parse(JSON.stringify(it)); c2.x += 1; c2.z += 1; S.items.push(c2); if (!settle(c2, S.items.length - 1, [it.x + it.w, it.z])) { S.items.pop(); S.msg = 'No free room for a copy'; } else S.sel = S.items.length - 1; } break;
    case 'rot': if (it && !it.lock) { const keep = JSON.stringify(it), f0 = foot(it), cx = it.x + f0[0] / 2, cz = it.z + f0[1] / 2; it.rot = ((+it.rot || 0) + 90) % 360; const f1 = foot(it); it.x = r2(cx - f1[0] / 2); it.z = r2(cz - f1[1] / 2); if (!settle(it, S.sel, [it.x, it.z])) { Object.assign(it, JSON.parse(keep)); S.msg = 'No room to turn it here'; } } break;
    case 'rs': if (it && !it.lock) { if (it.cat === 'pergola' && a[1] === 'h') it.hAuto = false; if (it.cat === 'graffiti' && a[1] === 'w') it.fit = false; resizeItem(it, a[1], +a[2]); } break;
    case 'cz': if (it && !it.lock && it.cat === 'cabin') { const L = cabinLay(it); cabinSize(it, a[1] === 'L' ? num(L.L) + +a[2] : num(L.L), a[1] === 'W' ? num(L.W) + +a[2] : num(L.W)); } break;
    case 'csku': if (it) { const keep = JSON.stringify(it), L0 = it.layout; it.sku = a[1] + (a[2] ? ':' + a[2] : ''); if (L0 && window.mtoCabinSize) { const r = window.mtoCabinSize(it.sku, null, L0.L, L0.W); if (r && r.lay) { it.layout = r.lay; it.lsku = it.sku; } } cabinFoot(it); it.label = PR()[it.sku].n.replace(/ —.*$/, ''); if (!settle(it, S.sel)) { Object.assign(it, JSON.parse(keep)); S.msg = 'That cabin doesn\'t fit here'; } } break;
    case 'unlock': return unlock();
    case 'plk': case 'plsz': case 'plsz3': { const i = a[0] === 'plsz3' ? +a[1] : S.sel, id = a[0] === 'plsz3' ? a[2] : a[1], x = S.items[i]; if (!x || x.cat !== 'plant') break; const keep = JSON.stringify(x), f0 = foot(x), cx = x.x + f0[0] / 2, cz = x.z + f0[1] / 2;
      if (a[0] === 'plk') plantSet(x, id); else plantSet(x, String(id).split('-')[1], id); const f1 = foot(x); x.x = r2(cx - f1[0] / 2); x.z = r2(cz - f1[1] / 2);
      if (!settle(x, i, [x.x, x.z])) { Object.assign(x, JSON.parse(keep)); S.msg = 'No room for it that size here'; } break; }
    case 'pick': { const i = +a[1], id = a.slice(2).join(':'), x = S.items[i]; if (x && x.cat === 'plant') { const keep = JSON.stringify(x); plantSet(x, String(id).split('-')[1], id); if (!settle(x, i)) { Object.assign(x, JSON.parse(keep)); S.msg = 'That plant doesn\'t fit there'; } break; } if (x) { x.pick = id; if (x.cfgId && x.cfgId !== id) { delete x.cfg; delete x.cfgId; } realSize(x, id, x.cfg); if (x.cat === 'cabin') { const keep = JSON.stringify(x); x.sku = id; cabinFoot(x); x.label = PR()[id].n.replace(/ —.*$/, ''); if (!settle(x, i)) { Object.assign(x, JSON.parse(keep)); x.pick = x.sku; S.msg = 'That cabin doesn\'t fit there — make room in step 2'; } } } break; }
    case 'cart': return toCart();
    case 'estgo': return estimate();
    case 'sel2': S.step = 1; S.sel = +a[1]; break;
    case 'cust': { const x = S.items[+a[1]], pk = x && picked(x); if (!pk) break; const m = PR()[pk.id].cz, o = JSON.parse(JSON.stringify(x.cfg && x.cfgId === pk.id ? x.cfg : pk.q.o)); delete o._n;
      if (m.unit === 'fixed' && !o.size) o.size = ((m.sizes || [])[0] || {}).label; if (m.unit === 'seat' && !num(o.n)) o.n = num(m.n && m.n.min) || 4; S.cust = { i: +a[1], id: pk.id, o }; break; }
    case 'cs': { const C2 = S.cust; if (!C2) break; const m = PR()[C2.id].cz, o = C2.o, v = a.slice(2).join(':');
      if (a[1] === 'cancel') { S.cust = null; break; }
      if (a[1] === 'use') { const x = S.items[C2.i]; ev('plan_custom', { ref: x && x.cat, sku: C2.id }); if (x) { x.cfg = JSON.parse(JSON.stringify(o)); x.cfgId = C2.id; x.pick = C2.id; realSize(x, C2.id, o); } S.cust = null; break; }
      if (a[1] === 'size') o.size = v; else if (a[1] === 'n') o.n = Math.max(num(m.min_size) || num(m.n && m.n.min) || 1, (num(o.n) || 0) + (+a[2]));
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
function shareUrl() { return S && S.link && S.link.pid === S.pid ? location.origin + '/?p=' + S.link.t : location.origin + '/?plan=' + b64(JSON.stringify({ v: 1, site: S.site, items: S.items })); }
async function linkGet() {   // 231: outrr.in/?p=<token> — the plan is saved first (setup, theme, floor… go with it); the old ?plan=<whole plan> links got too long and lost the setup
  if (S.link && S.link.pid === S.pid && S.pid) return location.origin + '/?p=' + S.link.t;
  if (!assistTok() && !signedIn()) { await new Promise((ok, no) => { if (!window.acRequire) return no(new Error('Please sign in to share')); window.acRequire(ok, 'Sign in to share your plan'); }); }
  clearTimeout(cloudT); S.dirty = true; for (let k = 0; k < 20 && cloudBusy; k++) await new Promise(r => setTimeout(r, 250));
  await cloudSave(); if (!S.pid) throw new Error(S.saveErr || 'Could not save the plan — try again');
  const t = assistTok() ? await anonRpc('sales_plan_link', { p_token: assistTok(), p_id: S.pid }) : await rpc('plan_link', { p_id: S.pid });
  if (!t) throw new Error('Could not make the link'); S.link = { pid: S.pid, t: String(t) }; save(); return location.origin + '/?p=' + S.link.t;
}
async function share() {
  let u; try { u = await linkGet(); } catch (e) { if (window.toast) window.toast(e.message || 'Could not share'); else alert(e.message || 'Could not share'); return; }
  try { if (window.otrack) otrack('plan_share', { n: S.items.length }); } catch (e) {}
  if (navigator.share) { try { await navigator.share({ title: 'My outdoor plan — outrr', text: (S.pname || 'My outdoor plan') + ' — see it in 3D on outrr', url: u }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(u); S.msg = ''; if (window.toast) window.toast('Link copied ✓'); else alert('Link copied'); } catch (e) { prompt('Copy this link', u); }
}
async function openLink(t) {   // someone opened outrr.in/?p=<token>: a copy of that plan on this device (saving it makes their own plan)
  let v = null; try { v = await anonRpc('plan_link_get', { p_token: t }); } catch (e) {}
  try { const u = new URL(location.href); u.searchParams.delete('p'); history.replaceState(history.state, '', u.pathname + (u.search || '') + u.hash); } catch (e) {}
  if (!v || !v.site) { alert('This plan link is not valid any more'); return open(null); }
  const cur = load(); if (cur && cur.items && cur.items.length && JSON.stringify([cur.site, cur.items]) !== JSON.stringify([v.site, v.items]) && !confirm('Open the shared plan? It replaces the plan open on this device (your saved plans stay in your account).')) return open(null);
  const SF = setupFor(Object.assign({}, v, { id: 'link' })), su = SF.su ? Object.assign({}, SF.su, { on: false }) : null; if (!(v.setup && v.setup.bsel)) v.setup = Object.assign({}, v.setup, { bsel: SF.bsel });
  localStorage.setItem(KEY, JSON.stringify({ v: 1, step: su && su.done ? 1 : Math.min(v.step || 1, 1), site: v.site, items: v.items || [], su, bsel: (v.setup && v.setup.bsel) || null, ctabs: [], pid: null, pname: (v.name || 'Shared plan') + ' (shared)', source: 'planner' }));
  ev('plan_link_open', {}); open({ reload: true });
}
function fromLink(q) {   // ?plan=<link>: someone shared a plan
  try { const v = JSON.parse(unb64(q)); if (!v || !v.site || !Array.isArray(v.items)) return false;
    if (S.items.length && snap() !== JSON.stringify([v.site, v.items]) && !confirm('Open the shared plan? It replaces the plan saved on this device.')) return false;
    S.site = v.site; S.items = v.items.filter(it => CAT[it.cat]).slice(0, 40); S.step = S.items.length ? 1 : 0; S.sel = null; return true; } catch (e) { return false; }
}
function rowsNow() { return S.items.map(it => { const c = CAT[it.cat], pk = S.step === 2 || it.pick ? picked(it) : null, fp = fromPrice(it);
  return { e: c.e, t: it.label || c.t, size: c.size === 'fixed' || it.cat === 'cabin' ? '' : sizeTxt(it, c), design: pk ? String(PR()[pk.id].n).replace(/ — .*$/, '') : '', price: pk ? pk.q.price : fp && fp.price, from: !pk }; }); }
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
function exitAsk(go) {   // 266 (owner): ✕ asks first
  const old = document.getElementById('plExit'); if (old) old.remove(); const d = document.createElement('div'); d.id = 'plExit'; d.className = 'pl-exit';
  d.innerHTML = '<div><b>Are you sure you want to exit?</b><p>Your progress is saved — you can come back to it later.</p><div><button type="button" data-x="0">Stay</button><button type="button" class="pl-go" data-x="1">Exit</button></div></div>';
  d.addEventListener('click', e => { const b = e.target.closest('[data-x]'); if (e.target === d || b) { d.remove(); if (b && b.dataset.x === '1') { try { save(); } catch (er) {} go(); } } }); document.body.appendChild(d); }
function close() { lockGo(false); if (EL) EL.style.display = 'none'; document.body.style.overflow = ''; try { const u = new URL(location.href); if (u.searchParams.has('plan')) { u.searchParams.delete('plan'); history.replaceState(history.state, '', u.pathname + (u.search || '') + u.hash); } } catch (e) {} }

function putPieces(list) {   // 199: each piece takes a placeholder's spot (same kind, no design yet), else a free spot in a row; things already there stay
  if (list[0] && list[0].cat === 'privacy' && list[0].mode === 'par') {   // 211: a parapet / boundary-wall screen design takes the plan's parapet screen (or goes on the parapet)
    const p0 = list[0], dm = S.items.find(o => o.cat === 'privacy' && o.mode === 'par' && !o.pick && !o.cfgId), it = dm || { cat: 'privacy', mode: 'par', sides: ['left', 'right', 'back'], w: 0, d: 0.3, x: 0, z: 0, rot: 0 };
    S.items.filter(o => o !== it && o.cat === 'privacy' && o.mode === 'par' && !o.pick && !o.cfgId).forEach(o => Object.assign(o, { pick: p0.pick, cfgId: p0.cfgId, cfg: p0.cfg, label: p0.label + (o.sides && o.zone ? ' · ' + o.sides[0] + ' parapet' : ''), h: p0.h }));
    Object.assign(it, { pick: p0.pick, cfgId: p0.cfgId, cfg: p0.cfg, label: p0.label + (it.zone ? ' · ' + it.sides[0] + ' parapet' : ''), h: p0.h }); if (!dm) S.items.push(it); const i = S.items.indexOf(it); attach(it, i);
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
  if (!CMPT) CMPT = setInterval(() => { try { cmpTick(); } catch (e) {} }, 250);
  if (seed && seed.load) return openSaved(seed.load);
  if (seed && seed.sload) return openSaved(seed.sload, true);
  if (seed && seed.shared) return openShared(seed.shared);
  if (seed && seed.link) return openLink(seed.link);   // 231
  const hid0 = !EL || EL.style.display === 'none';
  for (const k in PC) delete PC[k]; shell(); TM.load().then(() => { try { if (EL && EL.style.display !== 'none' && S && S.step === 0) draw(); } catch (e) {} }); if (!S || (seed && seed.reload)) { const v = S && S.view; S = load(); S.hist = []; S.hi = -1; if (v) S.view = v; }
  if (S && S.su && S.su.on && hid0) { S.su.on = false; if (!S.su.done) S.su.left = true; if (SUEL) SUEL.style.display = 'none'; }   // 293 (owner: phone still on Add / Pick): a page closed mid-setup saved su.on = true — nothing opened the setup again
  if (S && !S.su && S.site && S.site.kind === 'terrace' && (S.items || []).some(o => o && !o.old)) { const f = setupFor({ id: S.pid, site: S.site, items: S.items }); if (f.su) { S.su = f.su; S.bsel = S.bsel && Object.keys(S.bsel).length ? S.bsel : f.bsel; if (S.step === 2) S.step = 1; } }
  else if (S && S.su && !S.su.done && !S.su.left && !S.su.on && S.site && S.site.kind === 'terrace' && (S.items || []).some(o => o && !o.old)) { const f = setupFor({ id: 'x', site: S.site, items: S.items }); S.su = Object.assign({}, f.su || {}, S.su, { done: true, decorDone: true, oldPlaced: true, cv: SUV }); if (!S.bsel || !Object.keys(S.bsel).length) S.bsel = f.bsel; if (S.step === 2) S.step = 1; }   // 282: a setup that was left half-way in the old flow (su without done / left) — same as set up, never the old tabs   // 281 (owner): any laid-out terrace without a setup (saved before 231, or loaded by the space picker) opens in the new flow — no old tabs / Add more / dragging in 3D
  if (S && !(S.su && S.su.done) && S.site && S.site.kind === 'terrace' && S.step === 0 && S.tsDone) S.step = 1;   // 293: a terrace set up on the roof wizard never shows the old Your space step
  if (S && !(S.su && S.su.done) && S.site && S.site.kind === 'terrace' && S.step === 2 && !(S.items || []).some(o => o && !o.old && !o.att && o.mode !== 'tank' && o.mode !== 'par')) S.step = 1;   // 292: an old plan parked on Pick with nothing placed → the setup
  S.items.forEach(it => { if (it.cat === 'cabin' && it.bcx != null && cabinCfg(it)) { cabinFoot(it); it.x = r2(it.bcx - foot(it)[0] / 2); it.z = r2(it.bcz - foot(it)[1] / 2); delete it.bcx; delete it.bcz; } });   // 193g: back from the studio
  S.items.forEach(it => { if (it.cat === 'cabin' && !it.ex && cabinCfg(it)) { const f0 = foot(it), cx = it.x + f0[0] / 2, cz = it.z + f0[1] / 2; cabinFoot(it); const f1 = foot(it); it.x = r2(cx - f1[0] / 2); it.z = r2(cz - f1[1] / 2); } });   // plans saved before 193b
  try { S.items.forEach((it, i) => { if (it.mode === 'tank') attach(it, i); }); } catch (e) {}   // 271: the stairs-room screen runs to the parapet (plans saved before)
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
function setupFor(v) {   // 279 (owner): a plan saved before 231 has no setup in the account — keep the one on this device, else treat a laid-out terrace as set up (3D + proposal, not the old steps)
  if (v.setup && v.setup.su) return v.setup; let cur = null; try { cur = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (cur && cur.pid === v.id && cur.su) return { su: cur.su, bsel: cur.bsel || null, ctabs: cur.ctabs || [] };
  const its = v.items || []; if (!(v.site && v.site.kind === 'terrace' && its.some(o => o && !o.old))) return { su: null, bsel: null, ctabs: [] };
  const B = {}; its.forEach(o => { if (o && !o.old && CAT[o.cat] && !o.att && o.cat !== 'pathway' && o.mode !== 'tank' && o.mode !== 'par') B[o.cat] = (B[o.cat] || 0) + 1; });
  return { su: { done: true, decorDone: true, oldPlaced: true, cv: SUV, q: SUQ.indexOf('plan'), have: {}, rm: {}, green: 'balanced', light: v.site.light || 'soft', on: false }, bsel: B, ctabs: [] }; }
async function openSaved(id, sales) {   // My account → Saved plans → Open; CRM → lead → Plans (Sales mode)
  try { const v = sales ? await anonRpc('sales_plan_get', { p_token: assistTok(), p_id: id }) : await rpc('plan_get', { p_id: id }); if (!v) throw new Error('Plan not found');
    localStorage.setItem(KEY, JSON.stringify({ v: 1, step: v.step || 1, site: v.site, items: v.items || [], ...(x => ({ su: x.su || null, bsel: x.bsel || null, ctabs: x.ctabs || [] }))(setupFor(v)), pid: v.id, pname: v.name, source: v.source }));
    open({ reload: true }); if (!sales) lockGo(true);
  } catch (e) { alert(e.message || 'Could not open the plan'); }
}
// 224: a plan someone shared with me (My account → Shared with me) — view, or edit when nobody else is editing; one editor at a time
async function openShared(id) {
  try { const v = await rpc('shared_plan_get', { p_id: id }); if (!v) throw new Error('Plan not found');
    if (v.role === 'owner') return openSaved(id);
    localStorage.setItem(KEY, JSON.stringify({ v: 1, step: v.step || 1, site: v.site, items: v.items || [], ...(x => ({ su: x.su || null, bsel: x.bsel || null, ctabs: x.ctabs || [] }))(setupFor(v)), pid: v.id, pname: v.name, source: v.source, sh: { id: v.id, role: v.role, owner: v.owner } }));
    open({ reload: true }); S.ro = v.role === 'edit' && v.editing ? v.editing : null; paintSaved(); if (v.role === 'edit') lockGo(true);
  } catch (e) { alert(e.message || 'Could not open the plan'); }
}
let lockT = null, lockId = null;
function lockGo(take) {   // hold the edit lock while the plan is open (renewed every minute; it lapses after 2 minutes)
  clearInterval(lockT); lockT = null;
  if (!take) { if (lockId) { const id = lockId; lockId = null; rpc('plan_lock', { p_id: id, p_take: false }).catch(() => {}); } return; }
  if (!S || !S.pid || assistTok() || (S.sh && S.sh.role !== 'edit') || !signedIn()) return;
  const tick = () => { if (!S || !S.pid || (EL && EL.style.display === 'none')) return lockGo(false);
    rpc('plan_lock', { p_id: S.pid, p_take: true }).then(r => { const was = S.ro; S.ro = r && r.ok === false && r.by ? r.by : null; if (r && r.ok) lockId = S.pid; if (was !== S.ro) paintSaved(); if (was && !S.ro) cloudSoon(); }).catch(() => {}); };
  tick(); lockT = setInterval(tick, 60000);
}
addEventListener('pagehide', () => lockGo(false));
window.outrrPlanFloor = (k, L) => { S.su = S.su || { green: 'balanced', have: {}, rm: {} }; S.su.flay = L; themeApply(k); };   // for tests
window.outrrPlanProp = () => { window.outrrPropTest = 1; S.su = S.su || { green: 'balanced', have: {}, rm: {} }; suOpen(SUQ.indexOf('prop')); };   // for tests
window.outrrPlanTheme = k => { S.su = S.su || { green: 'balanced', have: {}, rm: {} }; themeApply(k); };   // for tests
window.outrrPlanSu = q => { S.su = S.su || { green: 'balanced', have: {}, rm: {} }; suOpen(SUQ.indexOf(q)); };   // for tests
window.outrrPlanState = () => S; window.outrrSuPaint = () => suPaint(); window.outrrPlanMove = (i, x, z) => on3d({ t: 'move', i, x, z }); window.outrrPlanLW = () => lifewall(); window.outrrPlanPrice = it => fromPrice(it);   // for tests
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
