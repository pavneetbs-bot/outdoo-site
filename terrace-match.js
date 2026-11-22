// outrr terrace templates (as built) — 216: the terrace setup answers pick the closest real terraces (LifeWall zoning plans,
// /terrace-templates.json: city + size only, no client details) and fit each to the answers: mirrored so the staircase room is on
// the side asked, stretched to the plot size typed (rooms keep roughly their real size). Used by the planner (planner.js) and the
// cabin / pergola designers (mto.js). Units ft; x = left → right seen from the road, z = back (0) → front (pd, the road).
const PAR = 0.75;
let LIST = null, LOADING = null;
export function load() {
  if (LIST) return Promise.resolve(LIST);
  if (!LOADING) LOADING = fetch('/terrace-templates.json?v=2', { cache: 'no-cache' }).then(r => r.json()).then(j => (LIST = (j.templates || []).filter(t => t.site && t.site.pw && t.site.pd))).catch(() => (LIST = []));
  return LOADING;
}
export const ready = () => !!LIST;
export const get = id => (LIST || []).find(t => t.id === id) || null;

// where the staircase room is: left | right | back | front | mid | none
export function mumtySide(site) {
  const m = (site.blocks || []).find(b => b.type === 'mumty'); if (!m) return 'none';
  if (m.side && m.side !== 'free') return m.side;
  const cx = (m.x + m.w / 2) / site.pw, cz = (m.z + m.d / 2) / site.pd, e = 2;
  if (m.x <= PAR + e && cx < 0.45) return 'left'; if (m.x + m.w >= site.pw - PAR - e && cx > 0.55) return 'right';
  if (m.z <= PAR + e) return 'back'; if (m.z + m.d >= site.pd - PAR - e) return 'front';
  return cx < 0.34 ? 'left' : cx > 0.66 ? 'right' : cz < 0.4 ? 'back' : 'mid';
}
const MIR = { left: 'right', right: 'left' };
const hasLift = s => (s.blocks || []).some(b => b.type === 'lift');

// a = { pw, pd, mumty: left|right|back|none, lift: true|false|null (not sure) }
export function match(a, n) {
  if (!LIST) return [];
  const out = [];
  for (const t of LIST) {
    const s = t.site, ms = mumtySide(s);
    for (const mir of [false, true]) {
      const side = mir ? (MIR[ms] || ms) : ms;
      if (mir && !MIR[ms] && !(s.cuts && Object.keys(s.cuts).length)) continue;   // mirroring changes nothing
      let sc = 0;
      sc += 3 * Math.abs(Math.log((s.pw / s.pd) / (a.pw / a.pd)));                 // shape (wide / deep / squarish)
      sc += 1.2 * Math.abs(Math.log((s.pw * s.pd) / (a.pw * a.pd)));               // size
      if (a.mumty) { if (a.mumty === 'none') sc += ms === 'none' ? 0 : 2.5; else sc += side === a.mumty ? 0 : ms === 'none' ? 2 : (side === 'mid' || side === 'front') && a.mumty === 'back' ? 0.8 : 1.6; }
      if (a.lift === true || a.lift === false) sc += hasLift(s) === a.lift ? 0 : 0.9;
      for (const ty of ['room', 'shaft']) if (a[ty] === true || a[ty] === false) sc += (s.blocks || []).some(b => b.type === ty) === a[ty] ? 0 : 0.5;
      if (a.shape === 'L') sc += s.cuts && Object.keys(s.cuts).length ? 0 : 0.8; else if (a.shape === 'rect') sc += s.cuts && Object.keys(s.cuts).length ? 0.4 : 0;
      sc += mir ? 0.02 : 0;
      out.push({ t, mir, sc });
    }
  }
  out.sort((p, q) => p.sc - q.sc);
  const seen = new Set(), res = [];
  for (const o of out) { if (seen.has(o.t.id)) continue; seen.add(o.t.id); res.push(o); if (res.length >= (n || 4)) break; }
  return res;
}

const r2 = v => Math.round(v * 2) / 2;
const hit = (a, b) => a.x < b.x + b.w - 0.01 && b.x < a.x + a.w - 0.01 && a.z < b.z + b.d - 0.01 && b.z < a.z + a.d - 0.01;
// the template as a site of the asked size: road settings, parapet and kind are kept from `base`
export function fit(t, mir, base) {
  const s = t.site, pw = +base.pw || s.pw, pd = +base.pd || s.pd, sx = pw / s.pw, sz = pd / s.pd;
  const damp = k => Math.min(1.25, Math.max(0.8, Math.sqrt(k)));                  // rooms keep roughly their real size
  const cuts = {};
  for (const k in (s.cuts || {})) { const c = s.cuts[k], k2 = mir ? k[0] + (k[1] === 'l' ? 'r' : 'l') : k; cuts[k2] = { type: c.type || 'notch', a: r2(Math.min(pw - 6, c.a * sx)), b: r2(Math.min(pd - 6, c.b * sz)) }; }
  const blocks = [], order = ['mumty', 'lift', 'room', 'shaft', 'ac'];
  const src = (s.blocks || []).slice().sort((p, q) => order.indexOf(p.type) - order.indexOf(q.type));
  for (const b of src) {
    const w = r2(Math.max(1, Math.min(pw - 2 * PAR, b.w * damp(sx)))), d = r2(Math.max(1, Math.min(pd - 2 * PAR, b.d * damp(sz))));
    let cx = (b.x + b.w / 2) * sx; if (mir) cx = pw - cx; const cz = (b.z + b.d / 2) * sz;
    const lw = b.x <= 1.2, rw = b.x + b.w >= s.pw - 1.2, bw = b.z <= 1.2, fw = b.z + b.d >= s.pd - 1.2;   // on a wall in the drawing → stays on it
    let x = cx - w / 2, z = cz - d / 2;
    if ((lw && !mir) || (rw && mir)) x = PAR; else if ((rw && !mir) || (lw && mir)) x = pw - PAR - w;
    if (bw) z = PAR; else if (fw) z = pd - PAR - d;
    x = r2(Math.max(PAR, Math.min(pw - PAR - w, x))); z = r2(Math.max(PAR, Math.min(pd - PAR - d, z)));
    const nb = { id: 'b' + Math.random().toString(36).slice(2, 8), type: b.type, w, d, x, z, side: 'free' };
    if (b.h) nb.h = b.h;
    if (blocks.some(o => hit(o, nb))) continue;                                      // squeezed into a smaller plot: leave it out
    blocks.push(nb);
  }
  for (const nb of blocks) {   // a block against one wall is tied to it (its long side along it), so the setup screens keep it there
    const e = 0.3, L = nb.x <= PAR + e, R = nb.x + nb.w >= pw - PAR - e, B = nb.z <= PAR + e, F = nb.z + nb.d >= pd - PAR - e;
    if (L) nb.x = PAR; if (R) nb.x = pw - PAR - nb.w; if (B) nb.z = PAR; if (F) nb.z = pd - PAR - nb.d;
    nb.side = (L || R) && !(B || F) ? (L ? 'left' : 'right') : (B || F) && !(L || R) ? (B ? 'back' : 'front') : L || R ? (nb.d >= nb.w ? (L ? 'left' : 'right') : (B ? 'back' : 'front')) : 'free';
  }
  const site = Object.assign({}, base, { kind: 'terrace', pw, pd, par: base.par || s.par || 3, blocks, tpl: t.id + (mir ? 'm' : '') });
  if (Object.keys(cuts).length) site.cuts = cuts; else delete site.cuts;
  if (s.tanks) site.tanks = true;
  return site;
}

// a small top view (road at the bottom) for the picker cards
const COL = { mumty: '#C26445', lift: '#55634A', shaft: '#8C8C8C', room: '#8E6BB0', ac: '#4A78B8' };
export function svg(site, W, H) {
  W = W || 150; H = H || 120; const pw = site.pw, pd = site.pd, k = Math.min((W - 8) / pw, (H - 18) / pd), ox = (W - pw * k) / 2, oz = 4;
  const R = (x, z, w, d, f, extra) => `<rect x="${(ox + x * k).toFixed(1)}" y="${(oz + z * k).toFixed(1)}" width="${Math.max(1, w * k).toFixed(1)}" height="${Math.max(1, d * k).toFixed(1)}" fill="${f}"${extra || ''}/>`;
  let h = R(0, 0, pw, pd, '#EADCC8', ' stroke="#7A7268" stroke-width="1"');
  for (const key in (site.cuts || {})) { const c = site.cuts[key]; h += R(key[1] === 'l' ? 0 : pw - c.a, key[0] === 'b' ? 0 : pd - c.b, c.a, c.b, '#fff'); }
  for (const b of site.blocks || []) h += R(b.x, b.z, b.w, b.d, COL[b.type] || '#999', ' rx="1"');
  const y = oz + pd * k + 11;
  h += `<text x="${W / 2}" y="${y}" text-anchor="middle" font-size="9" fill="#8a3a1f" font-family="inherit">▼ road</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Top view, road at the bottom">${h}</svg>`;
}
export const LEGEND = '<span style="color:#C26445">■</span> staircase &nbsp;<span style="color:#55634A">■</span> lift &nbsp;<span style="color:#8E6BB0">■</span> room &nbsp;<span style="color:#8C8C8C">■</span> shaft';

// 220: how close, as a percentage (for the cards)
export const pct = sc => Math.max(40, Math.min(99, Math.round(100 * Math.exp(-sc / 3.2))));

// 220: the template fitted to the size AND then changed to the answers — lift / tanks / rooms / shaft / AC added or taken out, L-shape cut, corner road
export function fitAnswers(t, mir, a, base) {
  const site = fit(t, mir, Object.assign({ kind: 'terrace', road_front: true, road_back: false, corner: '', high: {}, par: 3 }, base || {}, { pw: a.pw, pd: a.pd }));
  const pw = site.pw, pd = site.pd, B = site.blocks, id = () => 'b' + Math.random().toString(36).slice(2, 8);
  const m = B.find(b => b.type === 'mumty');
  const free = nb => nb.x >= PAR - 0.01 && nb.z >= PAR - 0.01 && nb.x + nb.w <= pw - PAR + 0.01 && nb.z + nb.d <= pd - PAR + 0.01 && !B.some(o => hit(o, nb)) && !cutIn(site, nb);
  const tryPut = (nb, spots) => { for (const [x, z] of spots) { const c = Object.assign({}, nb, { x: r2(x), z: r2(z) }); if (free(c)) { B.push(c); return true; } } return false; };
  const near = (w, d) => m ? [[m.x + m.w, m.z], [m.x - w, m.z], [m.x, m.z + m.d], [m.x + m.w, m.z + m.d - d], [m.x - w, m.z + m.d - d], [m.x, m.z - d]] : [[PAR, PAR], [pw - PAR - w, PAR]];
  const drop = ty => { for (let i = B.length - 1; i >= 0; i--) if (B[i].type === ty) B.splice(i, 1); };
  if (a.lift === false) drop('lift'); else if (a.lift === true && !B.some(b => b.type === 'lift')) tryPut({ id: id(), type: 'lift', w: 6, d: 7, h: 11, side: 'free' }, near(6, 7));
  if (a.room === false) drop('room'); else if (a.room === true && !B.some(b => b.type === 'room')) { const w = Math.min(12, r2(pw * 0.3)), d = 10, far = m && (m.x + m.w / 2) < pw / 2; tryPut({ id: id(), type: 'room', w, d, h: 9, side: 'back' }, [[far ? pw - PAR - w : PAR, PAR], [far ? PAR : pw - PAR - w, PAR]].concat(near(w, d))); }
  if (a.shaft === false) drop('shaft'); else if (a.shaft === true && !B.some(b => b.type === 'shaft')) tryPut({ id: id(), type: 'shaft', w: 4, d: 4, h: 3, side: 'free' }, near(4, 4));
  if (a.ac === false) drop('ac'); else if (a.ac === true && !B.some(b => b.type === 'ac')) { const sd = m && (m.x + m.w / 2) < pw / 2 ? 'right' : 'left'; tryPut({ id: id(), type: 'ac', w: 3, d: 8, h: 3, side: sd }, [[sd === 'left' ? PAR : pw - PAR - 3, r2(pd * 0.25)], [sd === 'left' ? PAR : pw - PAR - 3, r2(pd * 0.5)]]); }
  site.tanks = a.tanks === false ? false : a.tanks === true ? true : !!site.tanks;
  if (a.shape === 'rect') delete site.cuts;
  else if (a.shape === 'L' && !(site.cuts && Object.keys(site.cuts).length)) { const k = m && (m.x + m.w / 2) < pw / 2 ? 'fr' : 'fl'; site.cuts = { [k]: { type: 'notch', a: r2(pw * 0.4), b: r2(pd * 0.3) } }; for (let i = B.length - 1; i >= 0; i--) if (cutIn(site, B[i])) B.splice(i, 1); }
  site.road_front = true; site.road_back = a.road === 'both'; site.corner = a.road === 'cl' ? 'left' : a.road === 'cr' ? 'right' : '';
  return site;
}
function cutIn(site, b) { for (const k in (site.cuts || {})) { const c = site.cuts[k], x0 = k[1] === 'l' ? 0 : site.pw - c.a, z0 = k[0] === 'b' ? 0 : site.pd - c.b; if (b.x < x0 + c.a && x0 < b.x + b.w && b.z < z0 + c.b && z0 < b.z + b.d) return true; } return false; }

// 227: what the real terraces say for the wizard — with the staircase room in this cell (3×3, 'b-l' … 'f-r'), how often there is a lift /
// rooms / shafts, how many, their usual size, and the cells they usually stand in (mirrored to this side). pct = share of the terraces looked at.
const cellOf = (b, s) => 'bmf'[Math.min(2, Math.floor((b.z + b.d / 2) / s.pd * 3))] + '-' + 'lcr'[Math.min(2, Math.floor((b.x + b.w / 2) / s.pw * 3))];
const mirC = c => c[0] + '-' + ({ l: 'r', r: 'l', c: 'c' })[c[2]];
const med = a => { if (!a.length) return null; const s = a.slice().sort((p, q) => p - q); return s[Math.floor(s.length / 2)]; };
export function suggest(mcell) {
  if (!LIST) return null;
  const all = LIST.map(t => { const s = t.site, m = (s.blocks || []).find(b => b.type === 'mumty'); return m ? { s, mc: cellOf(m, s) } : null; }).filter(Boolean);
  const mumty = {}; all.forEach(r => { mumty[r.mc] = (mumty[r.mc] || 0) + 1; });
  const top = Object.keys(mumty).sort((p, q) => mumty[q] - mumty[p])[0], out = { n: all.length, mumty: { cell: top, pct: Math.round(mumty[top] / all.length * 100) } };
  if (!mcell || mcell === 'none') return out;
  const flip = mcell[2] === 'r', norm = c => (flip ? mirC(c) : c), want = norm(mcell);
  const nrm = r => (r.mc[2] === 'r' ? mirC(r.mc) : r.mc), mir = r => r.mc[2] === 'r';
  let pool = all.filter(r => nrm(r) === want); if (pool.length < 6) pool = all.filter(r => (nrm(r)[2] === 'c') === (want[2] === 'c'));   // too few → same kind (side / middle)
  out.similar = pool.length;
  ['lift', 'room', 'shaft'].forEach(ty => {
    let has = 0; const cnt = [], ws = [], ds = [], cells = {};
    pool.forEach(r => { const bs = (r.s.blocks || []).filter(b => b.type === ty); if (bs.length) has++; cnt.push(bs.length);
      bs.forEach(b => { ws.push(b.w); ds.push(b.d); let c = cellOf(b, r.s); if (mir(r)) c = mirC(c); c = norm(c); if (c !== mcell) cells[c] = (cells[c] || 0) + 1; }); });
    const tot = Object.values(cells).reduce((p, q) => p + q, 0) || 1;
    out[ty] = { pct: Math.round(has / pool.length * 100), n: Math.max(1, med(cnt.filter(x => x > 0)) || 1), w: Math.round((med(ws) || 0) * 2) / 2, d: Math.round((med(ds) || 0) * 2) / 2,
      cells: Object.keys(cells).sort((p, q) => cells[q] - cells[p]).map(c => [c, Math.round(cells[c] / tot * 100)]) };
  });
  return out;
}
