// outrr "Plan your space" (192) — phase 1: set up the terrace or lawn, then place things on it.
// Cabins and pergolas are the real models; every other Made to Order category is one common model the customer sizes and
// places; each shows "from ₹" = the cheapest live design of that category at that size (store price engine, window.mtoPrice).
// Rules: nothing goes over the parapet / boundary, nothing sits on another thing or on a block (decking is a floor: things
// stand on it); railings / gates snap to the edge, wall-type things to the parapet or a block when near. Blocks on the roof
// move only in step 1. Undo / redo. Saved in this browser (localStorage outrr_plan). Phase 2: pick the real design per item + cart.
import * as S3 from './space3d.js?v=1';

const KEY = 'outrr_plan', PAR = 0.75;
const PLOTS = [['100', 20, 45], ['125', 25, 45], ['200', 30, 60], ['300', 40, 67], ['500', 50, 90]];
const BLK = { mumty: ['Mumty (stair room)', 10, 18], lift: ['Lift room', 6, 6], shaft: ['Shaft', 3, 4], room: ['Room already built', 10, 12] };
// kind: free (stands anywhere) | floor (decking: things stand on it) | edge (along the parapet / boundary) | wall (a panel; snaps to a wall when near)
// fit: how the size maps to the price engine — l / w / h are taken from the item's length, depth and height
const CATS = [
  { k: 'cabin', t: 'Cabin', e: '🏠', col: 'cabins', kind: 'free' },
  { k: 'pergola', t: 'Pergola', e: '⛱️', col: 'shade', sb: /pergola/i, kind: 'free', w: 12, d: 10, h: 9, min: [6, 6], max: [40, 30], size: 'wd' },
  { k: 'sofa', t: 'Sofa set', e: '🛋️', col: 'furniture', sb: /sofa/i, kind: 'free', w: 8, d: 6, h: 3, size: 'fixed' },
  { k: 'dining', t: 'Dining set', e: '🍽️', col: 'furniture', sb: /dining/i, kind: 'free', w: 7, d: 6, h: 3.2, size: 'fixed' },
  { k: 'chair', t: 'Chairs', e: '🪑', col: 'furniture', sb: /chair/i, kind: 'free', w: 2.5, d: 2.5, h: 3, size: 'fixed' },
  { k: 'bench', t: 'Bench', e: '🪵', col: 'furniture', sb: /bench/i, kind: 'free', w: 5, d: 2, h: 1.6, size: 'fixed' },
  { k: 'table', t: 'Table', e: '🟫', col: 'furniture', sb: /table/i, kind: 'free', w: 3, d: 3, h: 2.5, size: 'fixed' },
  { k: 'bar', t: 'Bar counter', e: '🍸', col: 'bar-counters', kind: 'free', w: 8, d: 2.5, h: 3.6, min: [4, 2.5], max: [24, 2.5], size: 'w' },
  { k: 'planter', t: 'Planter', e: '🪴', col: 'planters', kind: 'free', w: 2, d: 2, h: 3.5, size: 'fixed' },
  { k: 'water', t: 'Water feature', e: '⛲', col: 'water-features', kind: 'free', w: 4, d: 4, h: 3.8, size: 'fixed' },
  { k: 'sculpture', t: 'Sculpture', e: '🗿', col: 'sculptures', kind: 'free', w: 2, d: 2, h: 4, size: 'fixed' },
  { k: 'deck', t: 'Decking', e: '🟧', col: 'decking', kind: 'floor', w: 10, d: 8, h: 0.2, min: [4, 4], max: [80, 80], size: 'wd' },
  { k: 'railing', t: 'Railing', e: '🚧', col: 'railings', kind: 'edge', w: 10, d: 0.4, h: 3.5, min: [3, 0.4], max: [120, 0.4], size: 'w' },
  { k: 'privacy', t: 'Privacy screen', e: '🎋', col: 'privacy-screens', kind: 'wall', w: 8, d: 0.5, h: 6, min: [2, 0.5], max: [60, 0.5], hr: [3, 10], size: 'wh' },
  { k: 'feature', t: 'Feature wall', e: '🧱', col: 'feature-walls', kind: 'wall', w: 10, d: 0.6, h: 8, min: [3, 0.6], max: [40, 0.6], hr: [3, 12], size: 'wh' },
  { k: 'vgarden', t: 'Vertical garden', e: '🌿', col: 'vertical-gardens', kind: 'wall', w: 6, d: 0.6, h: 6, min: [2, 0.6], max: [40, 0.6], hr: [2, 12], size: 'wh' },
  { k: 'graffiti', t: 'Graffiti art', e: '🎨', col: 'graffiti', kind: 'wall', w: 10, d: 0.3, h: 6, min: [3, 0.3], max: [60, 0.3], hr: [3, 12], size: 'wh' },
  { k: 'gate', t: 'Gate', e: '🚪', col: 'gates', kind: 'edge', w: 10, d: 0.4, h: 6, min: [3, 0.4], max: [30, 0.4], hr: [4, 10], size: 'wh', lawn: true },
];
const CAT = Object.fromEntries(CATS.map(c => [c.k, c]));
const PR = () => (typeof PRODS !== 'undefined' ? PRODS : window.PRODS) || {};   // the store's catalogue is a page-level const
const num = v => { const n = parseFloat(v); return isFinite(n) ? n : null; };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const rs = n => '₹' + Math.round(n).toLocaleString('en-IN');
const lakh = v => v >= 100000 ? '₹' + (v / 100000).toFixed(v >= 1000000 ? 1 : 2).replace(/\.?0+$/, '') + ' lakh' : rs(v);
const r2 = v => Math.round(v * 2) / 2;
let S = null, EL = null;

// ---------------------------------------------------------------- state, saving, undo / redo
function fresh() { const t = { kind: 'terrace', plot: '200', pw: 30, pd: 60, par: 3, corner: '', high: {}, tanks: true, blocks: [] }; defBlocks(t); return { v: 1, step: 0, site: t, items: [], sel: null, view: '3d' }; }
function defBlocks(t) { t.blocks = []; const sm = t.pw <= 25; addBlock(t, 'mumty', sm ? 8 : 10, sm ? 16 : 18, 'left'); const m = t.blocks[0]; if (m) addBlock(t, 'lift', 6, 6, 'left', [PAR, Math.max(PAR, m.z - 6)]); addBlock(t, 'shaft', 3, 4, 'right'); }
function load() { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && v.v === 1 && v.site) return Object.assign({ sel: null, view: '3d', step: 0 }, v); } catch (e) {} return fresh(); }
function save() { try { localStorage.setItem(KEY, JSON.stringify({ v: 1, step: S.step, site: S.site, items: S.items })); } catch (e) {} }
function snap() { return JSON.stringify([S.site, S.items]); }
function hist() { const k = snap(); if (S.hist[S.hi] === k) return; S.hist = S.hist.slice(0, S.hi + 1); S.hist.push(k); if (S.hist.length > 80) S.hist.shift(); S.hi = S.hist.length - 1; }
function undo(d) { const j = S.hi + d; if (j < 0 || j >= S.hist.length) return; S.hi = j; const v = JSON.parse(S.hist[j]); S.site = v[0]; S.items = v[1]; S.sel = null; S.msg = ''; draw(true); }

// ---------------------------------------------------------------- geometry: inside the plot, nothing on anything
const P0 = () => S.site.kind === 'terrace' ? PAR : 0;
const foot = it => (+it.rot || 0) % 180 ? [it.d, it.w] : [it.w, it.d];
const rectI = it => { const f = foot(it); return { x: +it.x, z: +it.z, w: f[0], d: f[1] }; };
const hit = (a, b) => a.x < b.x + b.w - 0.01 && a.x + a.w > b.x + 0.01 && a.z < b.z + b.d - 0.01 && a.z + a.d > b.z + 0.01;
function inside(r) { const t = S.site, p = P0(); return r.x >= p - 0.01 && r.z >= p - 0.01 && r.x + r.w <= t.pw - p + 0.01 && r.z + r.d <= t.pd - p + 0.01; }
function clashes(it, i) {   // what it would sit on
  const r = rectI(it), fl = CAT[it.cat] && CAT[it.cat].kind === 'floor';
  if (!inside(r)) return 'edge';
  if ((S.site.kind === 'terrace' ? S.site.blocks : []).some(b => hit(r, b))) return 'block';
  if (!fl && S.items.some((o, j) => j !== i && CAT[o.cat] && CAT[o.cat].kind !== 'floor' && hit(r, rectI(o)))) return 'item';
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
  (t.kind === 'terrace' ? t.blocks : []).forEach(b => { if (cx > b.x && cx < b.x + b.w) { faces.push(['front', b.z, cz - b.z, 1]); faces.push(['back', b.z + b.d, b.z + b.d - cz, 1]); }
    if (cz > b.z && cz < b.z + b.d) { faces.push(['right', b.x, cx - b.x, 1]); faces.push(['left', b.x + b.w, b.x + b.w - cx, 1]); } });
  const near = faces.filter(q => Math.abs(q[2]) <= 3).sort((a, b) => Math.abs(a[2]) - Math.abs(b[2]))[0]; if (!near) return;
  const [sd, at, , blk] = near;   // a parapet side: the panel's back to it; a block: its face
  if (sd === 'back' || sd === 'front') { it.rot = sd === 'back' ? 0 : 180; it.x = r2(cx - it.w / 2); it.z = blk ? (sd === 'front' ? at - it.d : at) : (sd === 'back' ? at : at - it.d); }
  else { it.rot = sd === 'left' ? 270 : 90; it.z = r2(cz - it.w / 2); it.x = blk ? (sd === 'right' ? at - it.d : at) : (sd === 'left' ? at : at - it.d); }
}
function settle(it, i, from) { const c = CAT[it.cat]; if (c && c.kind === 'edge') snapEdge(it); else if (c && c.kind === 'wall') snapWall(it); return placeFree(it, i, from); }

// ---------------------------------------------------------------- blocks on the roof (step 1)
function addBlock(t, type, w, d, side, at) {
  const b = { type, side: side || 'free', w, d, x: at ? at[0] : (t.pw - w) / 2, z: at ? at[1] : (t.pd - d) / 2 }; wallB(t, b, b.side); t.blocks.push(b);
  if (!freeB(t, t.blocks.length - 1)) { t.blocks.pop(); return false; } return true;
}
function wallB(t, b, side) { if (side === 'left') b.x = PAR; else if (side === 'right') b.x = t.pw - PAR - b.w; else if (side === 'back') b.z = PAR; else if (side === 'front') b.z = t.pd - PAR - b.d; b.x = Math.max(PAR, Math.min(t.pw - PAR - b.w, b.x)); b.z = Math.max(PAR, Math.min(t.pd - PAR - b.d, b.z)); }
function freeB(t, i) {
  const b = t.blocks[i], others = t.blocks.filter((o, j) => j !== i); if (!others.some(o => hit(b, o))) return true;
  for (let dd = 0.5; dd < Math.max(t.pw, t.pd); dd += 0.5) for (const s0 of [-dd, dd]) for (const q of [[b.x, b.z + s0], [b.x + s0, b.z]]) {
    if (q[0] < PAR || q[1] < PAR || q[0] > t.pw - PAR - b.w || q[1] > t.pd - PAR - b.d) continue; const c2 = { x: q[0], z: q[1], w: b.w, d: b.d }; if (!others.some(o => hit(c2, o))) { b.x = q[0]; b.z = q[1]; return true; } }
  return false;
}
function setPlot(pw, pd) {   // a new size: blocks and things keep their place in proportion, then settle
  const t = S.site, opw = t.pw, opd = t.pd; t.pw = Math.max(12, Math.min(150, Math.round(pw))); t.pd = Math.max(12, Math.min(200, Math.round(pd)));
  if (t.kind === 'terrace') t.blocks.forEach((b, i) => { b.w = Math.min(b.w, t.pw - 3); b.d = Math.min(b.d, t.pd - 3); b.x = Math.round((b.x + b.w / 2) / opw * t.pw - b.w / 2); b.z = Math.round((b.z + b.d / 2) / opd * t.pd - b.d / 2); wallB(t, b, b.side); freeB(t, i); });
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
    const c = CAT[it.cat], len = it.w, dep = c.kind === 'wall' || c.kind === 'edge' ? it.h : it.d;
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
function fromPrice(it) {   // cheapest orderable design of the category at this size: { price, n, soon }
  const c = CAT[it.cat]; if (!c) return null; const k = [it.cat, it.w, it.d, it.h, it.sku || ''].join('|'); if (PC[k]) return PC[k];
  const ids = designs(c), P = PR(); let best = null, open = 0;
  for (const id of ids) {
    const p = P[id], m = p.cz; if (p.oo === false) continue; open++;
    if (c.k === 'cabin') { if (it.sku && id !== it.sku) continue; const q = window.mtoPrice && window.mtoPrice(m, {}); if (q && q.ok && (best == null || q.product < best)) best = q.product; continue; }
    for (const mt of (m.materials || []).slice(0, 6)) { let q = null; try { q = window.mtoPrice(m, Object.assign(oFor(m, it), { material: mt.name })); } catch (e) {} if (q && q.ok && (best == null || q.product < best)) best = q.product; }
  }
  return (PC[k] = { price: best, n: ids.length, soon: !open });
}
const priceOk = () => !!(window.mtoOk && window.mtoOk());

// ---------------------------------------------------------------- adding / editing
function cabinSkus() { return designs(CAT.cabin).filter(id => (PR()[id].cz || {}).cabin); }
function cabinCfg(it) { return ((PR()[it.sku] || {}).cz || {}).cabin; }
function cabinLay(it) { const c = cabinCfg(it); return it.layout || (c && c.layout) || {}; }
function newItem(k) {
  const c = CAT[k], t = S.site, it = { cat: k, rot: 0, w: c.w || 4, d: c.d || 4, h: c.h || 3, label: c.t };
  if (k === 'cabin') { const sk = cabinSkus().find(s => /PORTA/.test(s)) || cabinSkus()[0]; if (!sk) return null; const L = cabinLay({ sku: sk }); it.sku = sk; it.w = (num(L.L) || 12) + 1.2; it.d = (num(L.W) || 10) + 1.2; it.h = 10; it.label = PR()[sk].n.replace(/ —.*$/, ''); }
  it.x = r2((t.pw - it.w) / 2); it.z = r2(t.pd * 0.55 - it.d / 2); return it;
}
function addItem(k) {
  const it = newItem(k); if (!it) return; const i = S.items.length; S.items.push(it);
  if (!settle(it, i)) { S.items.pop(); S.msg = 'No free room for it — make the space bigger or move things'; return; }
  S.sel = i; S.msg = '';
}
function resizeItem(it, key, d) {
  const c = CAT[it.cat], lo = c.min || [1, 1], hi = c.max || [80, 80], keep = JSON.stringify(it), i = S.items.indexOf(it);
  if (key === 'w') it.w = Math.max(lo[0], Math.min(hi[0], r2(it.w + d))); else if (key === 'd') it.d = Math.max(lo[1], Math.min(hi[1], r2(it.d + d))); else if (key === 'h') { const hr = c.hr || [2, 12]; it.h = Math.max(hr[0], Math.min(hr[1], r2(it.h + d))); }
  if (!settle(it, i)) { Object.assign(it, JSON.parse(keep)); S.msg = 'No room for it that size here'; }
}

// ---------------------------------------------------------------- UI
const CSS = `#plOv{position:fixed;inset:0;z-index:9000;background:#F6F1EA;display:flex;flex-direction:column;font-family:Inter,Poppins,system-ui,sans-serif;color:#2E2E2E}
#plOv .pl-hd{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #E2D6C4;background:#fff}#plOv .pl-hd h2{margin:0;font-size:16px}#plOv .pl-hd small{color:#7A7268}
#plOv .pl-x{margin-left:auto;border:0;background:#F3ECE2;width:38px;height:38px;border-radius:50%;font-size:18px;cursor:pointer}
#plOv .pl-st{display:flex;gap:6px}#plOv .pl-st button{border:1px solid #E2D6C4;background:#fff;border-radius:99px;padding:7px 14px;font:inherit;font-size:13px;cursor:pointer}#plOv .pl-st button.on{background:#C26445;color:#fff;border-color:#C26445;font-weight:700}
#plOv .pl-bd{flex:1;display:flex;min-height:0}#plOv .pl-3d{flex:1;position:relative;min-width:0;background:#E9ECE4}#plOv #pl3d{position:absolute;inset:0}
#plOv .pl-side{width:380px;max-width:42vw;background:#fff;border-left:1px solid #E2D6C4;display:flex;flex-direction:column;min-height:0}#plOv .pl-pn{flex:1;overflow:auto;padding:16px}
#plOv .pl-ft{border-top:1px solid #E2D6C4;padding:12px 16px;display:flex;align-items:center;gap:10px}#plOv .pl-tot b{display:block;font-size:20px}#plOv .pl-tot small{color:#7A7268;font-size:11.5px}
#plOv .pl-go{margin-left:auto;background:#2E2E2E;color:#fff;border:0;border-radius:12px;padding:12px 18px;font:inherit;font-weight:700;cursor:pointer}
#plOv h4{margin:0 0 4px;font-size:17px}#plOv .pl-sub{color:#6A6258;font-size:13px;margin:0 0 12px}#plOv .pl-h{margin:16px 0 8px;font-size:13px;font-weight:700}
#plOv .pl-tabs{display:flex;gap:8px;flex-wrap:wrap}#plOv .pl-tabs button{border:1px solid #E2D6C4;background:#fff;border-radius:99px;padding:8px 14px;min-height:38px;font:inherit;font-size:13px;cursor:pointer}#plOv .pl-tabs button.on{border:2px solid #C26445;font-weight:700}
#plOv .pl-row{display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin:8px 0}#plOv .pl-n{display:flex;flex-direction:column;font-size:11px;color:#6A6258;gap:3px}#plOv .pl-n input{width:76px;height:36px;border:1px solid #D9CDBB;border-radius:8px;padding:0 8px;font:inherit}
#plOv .pl-blk{border:1px solid #E7DDCF;border-radius:12px;padding:10px;margin:0 0 8px;background:#FFFCF8;display:flex;align-items:center;gap:8px;flex-wrap:wrap}#plOv .pl-blk b{flex:1;font-size:13.5px}
#plOv .pl-xx{border:0;background:none;color:#B3261E;font-size:16px;cursor:pointer}
#plOv .pl-pal{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}#plOv .pl-pal button{border:1px solid #E2D6C4;background:#fff;border-radius:12px;padding:10px;text-align:left;cursor:pointer;font:inherit;display:flex;gap:8px;align-items:center}
#plOv .pl-pal button:hover{border-color:#C26445}#plOv .pl-pal i{font-style:normal;font-size:22px}#plOv .pl-pal b{display:block;font-size:13px}#plOv .pl-pal small{color:#7A7268;font-size:11.5px}
#plOv .pl-it{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #F0E8DC;font-size:13px;cursor:pointer}#plOv .pl-it span{flex:1}#plOv .pl-it em{font-style:normal;color:#6A6258}
#plOv .pl-ed{border:2px solid #C26445;border-radius:14px;padding:12px;background:#FFF8F2}#plOv .pl-pm{display:flex;align-items:center;gap:6px;margin:6px 0}#plOv .pl-pm span{min-width:110px;font-size:13px}#plOv .pl-pm b{min-width:56px;text-align:center}
#plOv .pl-pm button{width:34px;height:34px;border-radius:50%;border:1px solid #C9BBA6;background:#fff;font-size:18px;cursor:pointer}
#plOv .pl-act{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}#plOv .pl-act button{border:1px solid #E2D6C4;background:#fff;border-radius:10px;padding:8px 12px;font:inherit;font-size:13px;cursor:pointer}
#plOv .pl-msg{background:#FFF4E5;border:1px solid #F1D3A8;border-radius:10px;padding:8px 10px;font-size:12.5px;margin:8px 0}#plOv .pl-note{background:#EEF3E8;border:1px solid #D3DEC5;border-radius:10px;padding:8px 10px;font-size:12.5px;margin:8px 0}
#plOv .pl-z{position:absolute;right:10px;top:10px;display:flex;flex-direction:column;gap:6px;z-index:2}#plOv .pl-z button{border:0;background:rgba(255,255,255,.95);width:40px;height:40px;border-radius:10px;font-size:18px;font-weight:700;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.15)}
#plOv .pl-z button[disabled]{opacity:.35;cursor:default}#plOv .pl-z button.on{background:#C26445;color:#fff}
#plOv .pl-lock{border:1px solid #E2D6C4;background:#fff;border-radius:10px;padding:8px 12px;font:inherit;font-size:12.5px;cursor:pointer}
@media(max-width:760px){#plOv .pl-bd{flex-direction:column}#plOv .pl-3d{flex:none;height:46vh}#plOv .pl-side{width:auto;max-width:none;border-left:0;border-top:1px solid #E2D6C4;flex:1}#plOv .pl-st button{padding:6px 10px;font-size:12px}#plOv .pl-hd small{display:none}}`;

function shell() {
  if (EL) return; const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  EL = document.createElement('div'); EL.id = 'plOv'; EL.setAttribute('role', 'dialog'); EL.setAttribute('aria-label', 'Plan your space');
  EL.innerHTML = '<div class="pl-hd"><div><h2>Plan your space</h2><small>Set up your terrace or lawn, then place what you\'d like on it</small></div><div class="pl-st" id="plSt"></div><button type="button" class="pl-x" data-pl="close" aria-label="Close">✕</button></div>' +
    '<div class="pl-bd"><div class="pl-3d"><div id="pl3d"></div><div class="pl-z" id="plZ"></div></div><div class="pl-side"><div class="pl-pn" id="plPn"></div><div class="pl-ft" id="plFt"></div></div></div>';
  document.body.appendChild(EL);
  EL.addEventListener('click', onClick); EL.addEventListener('change', onInput);
  document.addEventListener('keydown', e => { if (!EL || EL.style.display === 'none' || !(e.ctrlKey || e.metaKey) || /input|textarea|select/i.test((e.target && e.target.tagName) || '')) return; const k = String(e.key).toLowerCase(); if (k === 'z' || k === 'y') { e.preventDefault(); undo(k === 'y' || e.shiftKey ? 1 : -1); } });
  S3.onEvent(on3d);
}
function btn(attr, on, txt) { return `<button type="button" ${attr} class="${on ? 'on' : ''}" aria-pressed="${!!on}">${txt}</button>`; }
function nIn(key, val, lbl, min, max) { return `<label class="pl-n"><span>${lbl}</span><input type="number" inputmode="decimal" min="${min}" max="${max}" step="0.5" data-plin="${key}" value="${val}"></label>`; }

function stepSite() {
  const t = S.site, terr = t.kind === 'terrace';
  let h = `<h4>Your space</h4><p class="pl-sub">${terr ? 'Close is enough — it only sets the scene. Drag the stair room, lift and shafts on the 3D.' : 'Your lawn or garden — its size.'}</p>`;
  h += '<div class="pl-tabs">' + btn('data-pl="kind:terrace"', terr, '🏙 Terrace') + btn('data-pl="kind:ground"', !terr, '🌳 Lawn / garden') + '</div>';
  h += '<p class="pl-h">Plot</p><div class="pl-tabs">' + PLOTS.map(p => btn(`data-pl="plot:${p[0]}"`, t.plot === p[0], p[0] + ' gaj')).join('') + '</div>';
  h += '<div class="pl-row">' + nIn('pw', t.pw, 'Width (ft)', 12, 150) + nIn('pd', t.pd, 'Depth (ft)', 12, 200) + '</div>';
  if (terr) {
    h += '<p class="pl-h">Parapet</p><div class="pl-tabs">' + btn('data-pl="par:3"', +t.par === 3, '3 ft') + btn('data-pl="par:4"', +t.par === 4, '4 ft') + '</div>';
    h += '<p class="pl-h">Corner plot?</p><div class="pl-tabs">' + btn('data-pl="corner:"', !t.corner, 'No') + btn('data-pl="corner:left"', t.corner === 'left', 'Road on the left') + btn('data-pl="corner:right"', t.corner === 'right', 'Road on the right') + '</div>';
    h += '<p class="pl-h">Already on the roof <small style="font-weight:400;color:#7A7268">drag them on the 3D</small></p>' + t.blocks.map((b, i) => `<div class="pl-blk"><b>${esc(BLK[b.type][0])}</b>${nIn('bw:' + i, b.w, 'Width', 1, 40)}${nIn('bd:' + i, b.d, 'Length', 1, 40)}<button type="button" class="pl-xx" data-pl="bdel:${i}" aria-label="Remove">✕</button></div>`).join('');
    h += '<div class="pl-tabs">' + Object.keys(BLK).map(k => `<button type="button" data-pl="badd:${k}">+ ${esc(BLK[k][0].replace(/ \(.*\)/, ''))}</button>`).join('') + '</div>';
  }
  if (S.msg) h += `<div class="pl-msg">${esc(S.msg)}</div>`;
  return h;
}
function stepPlace() {
  const lock = !priceOk(); let h = '';
  const sel = S.sel != null ? S.items[S.sel] : null;
  if (sel) {
    const c = CAT[sel.cat], fp = fromPrice(sel), pm = (k, lbl, v) => `<div class="pl-pm"><span>${lbl}</span><button type="button" data-pl="rs:${k}:-1" aria-label="Smaller">−</button><b>${v} ft</b><button type="button" data-pl="rs:${k}:1" aria-label="Bigger">+</button></div>`;
    h += `<div class="pl-ed"><h4>${esc(c.e)} ${esc(sel.label || c.t)}</h4>`;
    if (sel.cat === 'cabin') { const sk = cabinSkus(); h += '<div class="pl-tabs">' + sk.map(s => btn(`data-pl="csku:${s}"`, s === sel.sku, esc(PR()[s].n.replace(/ —.*$/, '').replace(/ \(.*$/, '')))).join('') + '</div><p class="pl-sub" style="margin-top:8px">Its own size, walls, rooms and finishes are set in its designer (next phase: right from here).</p>'; }
    else if (c.size === 'fixed') h += `<p class="pl-sub">One standard size here — you'll pick the exact design at the end.</p>`;
    if (c.size === 'wd') h += pm('w', 'Length', sel.w) + pm('d', 'Width', sel.d);
    if (c.size === 'w') h += pm('w', 'Length', sel.w);
    if (c.size === 'wh') h += pm('w', 'Length', sel.w) + pm('h', 'Height', sel.h);
    h += `<p style="margin:10px 0 0;font-size:14px">${fp && fp.price != null ? (lock ? '🔒 Price after sign-in' : 'From <b>' + rs(fp.price) + '</b>') : fp && fp.soon ? 'Coming soon' : 'Our team will price it'} <small style="color:#7A7268">· ${fp ? fp.n : 0} designs</small></p>`;
    h += '<div class="pl-act">' + (c.kind === 'free' || c.kind === 'floor' ? '<button type="button" data-pl="rot">↻ Turn</button>' : '') + '<button type="button" data-pl="dup">⧉ Copy</button><button type="button" data-pl="del">🗑 Remove</button><button type="button" data-pl="done" style="margin-left:auto;background:#2E2E2E;color:#fff;border:0">Done</button></div></div>';
    if (S.msg) h += `<div class="pl-msg">${esc(S.msg)}</div>`;
    return h;
  }
  h += '<h4>Add things</h4><p class="pl-sub">Tap to add, then drag on the 3D. You\'ll pick the exact design of each at the end — here one model stands for all designs of that kind.</p>';
  if (lock) h += '<button type="button" class="pl-lock" data-pl="unlock">🔒 Sign in to see prices</button>';
  if (S.msg) h += `<div class="pl-msg">${esc(S.msg)}</div>`;
  h += '<div class="pl-pal" style="margin-top:10px">' + CATS.filter(c => (!c.lawn || S.site.kind !== 'terrace') && designs(c).length).map(c => {
    const fp = fromPrice(Object.assign({ cat: c.k, w: c.w || 4, d: c.d || 4, h: c.h || 3 }, c.k === 'cabin' ? { sku: (cabinSkus().find(s => /PORTA/.test(s)) || cabinSkus()[0]) } : {}));
    return `<button type="button" data-pl="add:${c.k}"><i>${c.e}</i><span><b>${esc(c.t)}</b><small>${fp.price != null ? (lock ? fp.n + ' designs' : 'from ' + lakh(fp.price)) : fp.soon ? 'Coming soon' : fp.n + ' designs'}</small></span></button>`; }).join('') + '</div>';
  if (S.items.length) h += '<p class="pl-h">On your plan</p>' + S.items.map((it, i) => { const fp = fromPrice(it); return `<div class="pl-it" data-pl="sel:${i}"><i>${CAT[it.cat].e}</i><span>${esc(it.label || CAT[it.cat].t)}${CAT[it.cat].size && CAT[it.cat].size !== 'fixed' ? ' <em>· ' + it.w + (CAT[it.cat].size === 'wh' ? ' × ' + it.h : CAT[it.cat].size === 'wd' ? ' × ' + it.d : '') + ' ft</em>' : ''}</span><em>${fp && fp.price != null && !lock ? 'from ' + rs(fp.price) : ''}</em></div>`; }).join('');
  return h;
}
function total() { let t = 0, n = 0; S.items.forEach(it => { const fp = fromPrice(it); if (fp && fp.price != null) { t += fp.price; n++; } }); return { t, n }; }

function draw(rec) {
  if (rec !== false) hist(); save();
  document.getElementById('plSt').innerHTML = btn('data-pl="step:0"', S.step === 0, '1 · Your space') + btn('data-pl="step:1"', S.step === 1, '2 · Add things');
  document.getElementById('plPn').innerHTML = S.step === 0 ? stepSite() : stepPlace();
  const T = total(), lock = !priceOk();
  document.getElementById('plFt').innerHTML = S.step === 0 ? '<button type="button" class="pl-go" data-pl="step:1">Next: add things →</button>'
    : `<div class="pl-tot">${S.items.length ? (lock ? '<b>🔒</b><small>Sign in to see the estimate</small>' : (T.n ? `<b>${lakh(T.t)}+</b><small>${S.items.length} thing${S.items.length > 1 ? 's' : ''} · starting price${T.n < S.items.length ? ' of ' + T.n : ''}, before delivery & installation</small>` : `<b>—</b><small>Prices open soon for these</small>`)) : '<b>—</b><small>Add something to see the estimate</small>'}</div>`;
  document.getElementById('plZ').innerHTML = `<button type="button" data-pl="undo" aria-label="Undo" title="Undo (Ctrl+Z)"${S.hi > 0 ? '' : ' disabled'}>↶</button><button type="button" data-pl="redo" aria-label="Redo" title="Redo (Ctrl+Y)"${S.hi < S.hist.length - 1 ? '' : ' disabled'}>↷</button>` +
    `<button type="button" data-pl="view" class="${S.view === 'top' ? 'on' : ''}" aria-label="${S.view === 'top' ? '3D view' : 'Top view'}" title="${S.view === 'top' ? '3D view' : 'Top view'}">${S.view === 'top' ? '🧊' : '▦'}</button><button type="button" data-pl="zin" aria-label="Zoom in">+</button><button type="button" data-pl="zout" aria-label="Zoom out">−</button><button type="button" data-pl="home" aria-label="Whole space" title="Whole space">⌖</button>`;
  try { S3.show(document.getElementById('pl3d'), { site: S.site, items: S.items, sel: S.step === 1 ? S.sel : null, cabinCfg, cabinLay, pergolaSku: 'MTO-PG-TW' }, { place: S.step === 0, view: S.view }); } catch (e) { if (window.console) console.warn(e); }
}

function onClick(e) {
  const b = e.target.closest('[data-pl]'); if (!b || b.disabled) return; const a = b.getAttribute('data-pl').split(':'), t = S.site, it = S.sel != null ? S.items[S.sel] : null; S.msg = '';
  switch (a[0]) {
    case 'close': return close();
    case 'undo': return undo(-1);
    case 'redo': return undo(1);
    case 'zin': return S3.zoom(0.8);
    case 'zout': return S3.zoom(1.25);
    case 'home': return S3.home();
    case 'view': S.view = S.view === 'top' ? '3d' : 'top'; return draw(false);
    case 'step': S.step = +a[1]; S.sel = null; for (const k in PC) delete PC[k]; break;
    case 'kind': if (t.kind !== a[1]) { t.kind = a[1]; if (a[1] === 'terrace' && !t.blocks.length) defBlocks(t); S.items = S.items.filter((x, i) => !(CAT[x.cat].lawn && a[1] === 'terrace') && settle(x, i)); } break;
    case 'plot': { const p = PLOTS.find(z => z[0] === a[1]); t.plot = a[1]; setPlot(p[1], p[2]); break; }
    case 'par': t.par = +a[1]; break;
    case 'corner': t.corner = a[1] || ''; break;
    case 'bdel': t.blocks.splice(+a[1], 1); break;
    case 'badd': { const D = BLK[a[1]]; if (!addBlock(t, a[1], D[1], D[2], a[1] === 'room' ? 'back' : 'right')) S.msg = 'No free room for it — make the others smaller or move them'; S.items = S.items.filter((x, i) => settle(x, i)); break; }
    case 'add': addItem(a[1]); break;
    case 'sel': S.sel = +a[1]; break;
    case 'done': S.sel = null; break;
    case 'del': if (it) { S.items.splice(S.sel, 1); S.sel = null; } break;
    case 'dup': if (it) { const c2 = JSON.parse(JSON.stringify(it)); c2.x += 1; c2.z += 1; S.items.push(c2); if (!settle(c2, S.items.length - 1, [it.x + it.w, it.z])) { S.items.pop(); S.msg = 'No free room for a copy'; } else S.sel = S.items.length - 1; } break;
    case 'rot': if (it) { const keep = JSON.stringify(it), f0 = foot(it), cx = it.x + f0[0] / 2, cz = it.z + f0[1] / 2; it.rot = ((+it.rot || 0) + 90) % 360; const f1 = foot(it); it.x = r2(cx - f1[0] / 2); it.z = r2(cz - f1[1] / 2); if (!settle(it, S.sel, [it.x, it.z])) { Object.assign(it, JSON.parse(keep)); S.msg = 'No room to turn it here'; } } break;
    case 'rs': if (it) resizeItem(it, a[1], +a[2]); break;
    case 'csku': if (it) { const keep = JSON.stringify(it); it.sku = a[1] + (a[2] ? ':' + a[2] : ''); const L = cabinLay(it); it.w = (num(L.L) || 12) + 1.2; it.d = (num(L.W) || 10) + 1.2; it.label = PR()[it.sku].n.replace(/ —.*$/, ''); if (!settle(it, S.sel)) { Object.assign(it, JSON.parse(keep)); S.msg = 'That cabin doesn\'t fit here'; } } break;
    case 'unlock': return unlock();
    default: return;
  }
  draw();
}
function onInput(e) {
  const k = e.target.getAttribute && e.target.getAttribute('data-plin'); if (!k) return; const v = parseFloat(e.target.value), t = S.site; if (!(v > 0)) return; S.msg = '';
  if (k === 'pw' || k === 'pd') { t.plot = ''; setPlot(k === 'pw' ? v : t.pw, k === 'pd' ? v : t.pd); }
  else { const [f, i] = k.split(':'), b = t.blocks[+i]; if (!b) return; const keep = JSON.stringify(b); if (f === 'bw') b.w = Math.max(1, Math.min(t.pw - 2, v)); else b.d = Math.max(1, Math.min(t.pd - 2, v)); wallB(t, b, b.side);
    if (!freeB(t, +i)) { Object.assign(b, JSON.parse(keep)); S.msg = 'That would sit on top of another one'; } S.items = S.items.filter((x, j) => settle(x, j)); }
  draw();
}
function on3d(ev) {
  const t = S.site; S.msg = '';
  if (ev.t === 'block') { const b = t.blocks[ev.i]; if (!b) return; const keep = { x: b.x, z: b.z, side: b.side }; b.x = ev.x; b.z = ev.z;
    b.side = b.x <= PAR + 1 ? 'left' : b.x + b.w >= t.pw - PAR - 1 ? 'right' : b.z <= PAR + 1 ? 'back' : b.z + b.d >= t.pd - PAR - 1 ? 'front' : 'free'; wallB(t, b, b.side);
    if (t.blocks.some((o, j) => j !== ev.i && hit(b, o))) { Object.assign(b, keep); S.msg = 'It can\'t go on top of another one'; } }
  else if (ev.t === 'move') { const it = S.items[ev.i]; if (!it) return; const keep = JSON.stringify(it); it.x = ev.x; it.z = ev.z; if (!settle(it, ev.i, [ev.x, ev.z])) { Object.assign(it, JSON.parse(keep)); S.msg = 'It doesn\'t fit there'; } S.sel = ev.i; }
  else if (ev.t === 'sel') S.sel = ev.i;
  draw();
}
function unlock() {
  if (window.mtoUnlock) window.mtoUnlock(() => { Object.keys(PC).forEach(k => delete PC[k]); open(); draw(false); });
}
function close() { if (EL) EL.style.display = 'none'; document.body.style.overflow = ''; try { const u = new URL(location.href); if (u.searchParams.has('plan')) { u.searchParams.delete('plan'); history.replaceState(history.state, '', u.pathname + (u.search || '') + u.hash); } } catch (e) {} }

export function open() {
  for (const k in PC) delete PC[k]; shell(); if (!S) { S = load(); S.hist = []; S.hi = -1; } EL.style.display = 'flex'; document.body.style.overflow = 'hidden';
  draw(); setTimeout(() => { try { S3.resize(); } catch (e) {} }, 60);
}
window.outrrPlanState = () => S; window.outrrPlanPrice = it => fromPrice(it);   // for tests
