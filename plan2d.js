// outrr 2D plan (234): the terrace drawn from above as an SVG — roof structures, the things set up on it, floor finishes — and,
// when asked, AutoCAD-style dimensions (extension lines, arrows, the size written inside the line) for the terrace, every structure
// and thing, and the biggest free spaces left. Used by the roof plan (mto.js) and the setup plan (planner.js). Units: ft,
// x = left → right seen from the road, z = back (0) → front (pd, the road).
const E = 0.75;   // parapet
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const f1 = v => (Math.round(v * 2) / 2).toString();
export const ICON = { mumty: '🪜', lift: '🛗', room: '🚪', shaft: '⬛', ac: '❄️', cabin: '🏠', pergola: '⛱️', sofa: '🛋️', swing: '🪢', dining: '🍽️', chair: '🪑', bench: '🪵', table: '🟫', bar: '🍸', planter: '🪴',
  water: '⛲', sculpture: '🗿', deck: '🟧', railing: '🚧', privacy: '🎋', feature: '🧱', vgarden: '🌿', graffiti: '🎨', accover: '❄️', gate: '🚪', pathway: '🪨', turf: '🟩', firepit: '🔥', jacuzzi: '🛁', lights: '💡', umbrella: '☂️', fbench: '💺', counter: '🍳' };
const NAME = { mumty: 'Stairs', lift: 'Lift', room: 'Room', shaft: 'Shaft', ac: 'AC' };
const FILL = { deck: 'url(#p2wood)', turf: 'url(#p2turf)', pathway: 'url(#p2path)', cabin: '#E8E1D4', jacuzzi: '#CFE6EF', water: '#D6EAF2', planter: '#DCE8D0', vgarden: '#DCE8D0', feature: '#D8D2C8', bar: '#E9D9CC', lights: '#FFF1C9', firepit: '#F2D5C4', fbench: '#E3D6C2', counter: '#E9D9CC' };
const foot = it => (+it.rot || 0) % 180 ? [it.d, it.w] : [it.w, it.d];
export const cellFt = (t) => Math.max(t.pw, t.pd);

// the plot outline with its corner cuts
export function outline(t) {
  const C = t.cuts || {}, pw = t.pw, pd = t.pd, c = k => { const q = C[k]; return q && (q.type === 'notch' || q.type === 'slant') ? q : null; }; let P = [], q;
  q = c('bl'); P = P.concat(!q ? [[0, 0]] : q.type === 'notch' ? [[0, q.b], [q.a, q.b], [q.a, 0]] : [[0, q.b], [q.a, 0]]);
  q = c('br'); P = P.concat(!q ? [[pw, 0]] : q.type === 'notch' ? [[pw - q.a, 0], [pw - q.a, q.b], [pw, q.b]] : [[pw - q.a, 0], [pw, q.b]]);
  q = c('fr'); P = P.concat(!q ? [[pw, pd]] : q.type === 'notch' ? [[pw, pd - q.b], [pw - q.a, pd - q.b], [pw - q.a, pd]] : [[pw, pd - q.b], [pw - q.a, pd]]);
  q = c('fl'); P = P.concat(!q ? [[0, pd]] : q.type === 'notch' ? [[q.a, pd], [q.a, pd - q.b], [0, pd - q.b]] : [[q.a, pd], [0, pd - q.b]]);
  return P;
}

// the biggest empty rectangles (1 ft grid; structures and standing things are used, decks / grass / tiles are free)
export function freeRects(t, items, n) {
  const pw = +t.pw, pd = +t.pd, W = Math.floor(pw), D = Math.floor(pd), occ = [], out = [];
  for (let z = 0; z < D; z++) { occ.push([]); for (let x = 0; x < W; x++) occ[z].push(x < E || z < E || x + 1 > pw - E || z + 1 > pd - E ? 1 : 0); }
  const mark = r => { for (let z = Math.max(0, Math.floor(r.z)); z < Math.min(D, Math.ceil(r.z + r.d)); z++) for (let x = Math.max(0, Math.floor(r.x)); x < Math.min(W, Math.ceil(r.x + r.w)); x++) occ[z][x] = 1; };
  const C = t.cuts || {}; Object.keys(C).forEach(k => { const c = C[k]; if (!c || !c.type) return; for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) { const px = k[1] === 'l' ? x + 0.5 : pw - x - 0.5, pz = k[0] === 'b' ? z + 0.5 : pd - z - 0.5;
    if (px < c.a && pz < c.b && (c.type !== 'slant' || px / c.a + pz / c.b < 1)) occ[z][x] = 1; } });
  (t.blocks || []).forEach(mark);
  (items || []).forEach(it => { if (!it || it.segs || it.box || ['deck', 'turf'].includes(it.cat)) return; const f = foot(it); mark({ x: +it.x, z: +it.z, w: f[0], d: f[1] }); });
  for (let k = 0; k < (n || 5); k++) { let b = null; const hgt = new Array(W).fill(0);
    for (let z = 0; z < D; z++) { for (let x = 0; x < W; x++) hgt[x] = occ[z][x] ? 0 : hgt[x] + 1; const st = [];
      for (let x = 0; x <= W; x++) { const h = x < W ? hgt[x] : 0; let s0 = x; while (st.length && st[st.length - 1][1] >= h) { const [sx, sh] = st.pop(), w = x - sx; if (sh >= 3 && w >= 3 && (!b || sh * w > b.a)) b = { a: sh * w, x: sx, z: z - sh + 1, w, d: sh }; s0 = sx; } st.push([s0, h]); } }
    if (!b || b.a < 25) break; out.push(b); for (let z = b.z; z < b.z + b.d; z++) for (let x = b.x; x < b.x + b.w; x++) occ[z][x] = 2; }
  return out;
}

// one dimension: extension lines from the measured edge, a line with arrows at `off` from it, the size written inside the line
function dim(x1, y1, x2, y2, off, txt, s, cls) {
  const L = Math.hypot(x2 - x1, y2 - y1); if (L < 0.8) return '';
  const ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = -uy * off, ny = ux * off, a = [x1 + nx, y1 + ny], b = [x2 + nx, y2 + ny], ex = Math.sign(off) * s * 0.5;
  const fs = s * 1.15, tw = txt.length * fs * 0.56 + s * 0.8, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, ang = Math.atan2(uy, ux) * 180 / Math.PI, rot = Math.abs(ang) > 90 ? ang + 180 : ang;
  const fits = tw < L - s * 2.2;
  return `<g class="p2d ${cls || ''}"><path d="M${x1} ${y1}L${x1 + nx + (off ? -uy * ex : 0)} ${y1 + ny + (off ? ux * ex : 0)}M${x2} ${y2}L${x2 + nx + (off ? -uy * ex : 0)} ${y2 + ny + (off ? ux * ex : 0)}" class="p2e"/>` +
    `<path d="M${a[0]} ${a[1]}L${b[0]} ${b[1]}" class="p2l" marker-start="url(#p2a)" marker-end="url(#p2a)"/>` +
    `<g transform="translate(${mx} ${my}) rotate(${rot})"><rect x="${-tw / 2}" y="${-fs * 0.72}" width="${tw}" height="${fs * 1.3}" class="p2tb"${fits ? '' : ' transform="translate(0 ' + (-fs * 1.2) + ')"'}/>` +
    `<text x="0" y="${fs * 0.36 - (fits ? 0 : fs * 1.2)}" font-size="${fs}" class="p2t">${esc(txt)}</text></g></g>`;
}

// the whole plan. opts: { measure, sel: {k: 'blk'|'it', i}, north: 'back'|'front'|'left'|'right', road: [...sides], items, labels }
export function svg(t, opts) {
  opts = opts || {}; const pw = +t.pw, pd = +t.pd, s = Math.max(0.8, Math.max(pw, pd) / 46), M = opts.measure ? s * 9 : s * 3.2, items = opts.items || [], fl = t.floor || {};
  const O = outline(t), poly = O.map(p => p.join(',')).join(' '), sel = opts.sel || {};
  let h = `<svg xmlns="http://www.w3.org/2000/svg" class="p2svg" viewBox="${-M} ${-M} ${pw + 2 * M} ${pd + 2 * M}" preserveAspectRatio="xMidYMid meet" data-m="${M}">`;
  h += `<defs><marker id="p2a" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="${s * 1.6}" markerHeight="${s * 1.6}" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0 1L10 5L0 9z" fill="#3A3530"/></marker>` +
    `<pattern id="p2tile" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#EFEBE4"/><path d="M0 0H2V2" fill="none" stroke="#D4CEC4" stroke-width="0.06"/></pattern>` +
    `<pattern id="p2moro" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="#F3EEE6"/><path d="M1.5 0.25 Q2.2 0.8 1.5 1.5 Q0.8 0.8 1.5 0.25Z M1.5 1.5 Q2.2 2.2 1.5 2.75 Q0.8 2.2 1.5 1.5Z M0.25 1.5 Q0.8 0.8 1.5 1.5 Q0.8 2.2 0.25 1.5Z M2.75 1.5 Q2.2 0.8 1.5 1.5 Q2.2 2.2 2.75 1.5Z" fill="#2F6F7E" opacity="0.55"/><path d="M0 0H3V3" fill="none" stroke="#C9C1B4" stroke-width="0.05"/></pattern>` +
    `<pattern id="p2grey" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#C9C8C4"/><path d="M0 0H2V2" fill="none" stroke="#A9A7A2" stroke-width="0.06"/></pattern>` +
    `<pattern id="p2stone" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#DCCFB2"/><path d="M0 0H2V2" fill="none" stroke="#BBAA86" stroke-width="0.06"/></pattern>` +
    `<pattern id="p2terra" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#D39A74"/><path d="M0 0H2V2" fill="none" stroke="#A86E4B" stroke-width="0.06"/></pattern>` +
    `<pattern id="p2peb" width="1" height="1" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="#D9D3C8"/><circle cx="0.25" cy="0.3" r="0.16" fill="#B8B0A3"/><circle cx="0.7" cy="0.65" r="0.19" fill="#A9A194"/><circle cx="0.2" cy="0.8" r="0.11" fill="#C7BFB2"/></pattern>` +
    `<pattern id="p2turf" width="1" height="1" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="#8DBB63"/><path d="M0.2 0.8l0.1-0.35M0.6 0.5l0.08-0.3M0.8 0.95l0.06-0.28" stroke="#6E9E46" stroke-width="0.07"/></pattern>` +
    `<pattern id="p2wood" width="4" height="0.6" patternUnits="userSpaceOnUse"><rect width="4" height="0.6" fill="#B88A5E"/><path d="M0 0.58H4M2.4 0V0.6" stroke="#8E6640" stroke-width="0.05"/></pattern>` +
    `<pattern id="p2path" width="2.2" height="2.2" patternUnits="userSpaceOnUse"><rect width="2.2" height="2.2" fill="#D9D3C8"/><rect x="0.2" y="0.2" width="1.8" height="1.8" rx="0.15" fill="#9E978C"/></pattern></defs>`;
  h += `<style>.p2svg{display:block;width:100%;height:100%;overflow:visible;font-family:Inter,system-ui,sans-serif;touch-action:none}.p2l,.p2e{stroke:#3A3530;stroke-width:${s * 0.09};fill:none}.p2e{stroke-width:${s * 0.06}}.p2tb{fill:#fff;stroke:none}.p2t{text-anchor:middle;fill:#2E2E2E;font-weight:600}.p2d.fr .p2l{stroke:#2E7D3E}.p2d.fr .p2t{fill:#1F5E2C}.p2lb{text-anchor:middle;dominant-baseline:central;pointer-events:none;fill:#2E2E2E;font-weight:700}[data-blk],[data-it]{cursor:grab}.p2d,.p2fr{pointer-events:none}</style>`;
  // floor: tiles (plain / Moroccan) or bare, then a pebble border along the parapet
  h += `<polygon points="${poly}" fill="${({ moroccan: 'url(#p2moro)', plain: 'url(#p2tile)', grey: 'url(#p2grey)', stone: 'url(#p2stone)', terracotta: 'url(#p2terra)' })[fl.tile] || '#EADCC8'}"/>`;
  if (fl.pebble) { const b = fl.pebble === true ? 1.25 : +fl.pebble; h += `<clipPath id="p2clip"><polygon points="${poly}"/></clipPath><g clip-path="url(#p2clip)"><path d="M${E} ${E}H${pw - E}V${pd - E}H${E}Z M${E + b} ${E + b}V${pd - E - b}H${pw - E - b}V${E + b}Z" fill="url(#p2peb)" fill-rule="evenodd"/></g>`; }
  // neighbour walls that rise higher
  const hi = t.high || {}, hw = t.hw || {};
  ['left', 'right', 'back'].forEach(sd => { if (!hi[sd]) return; const L = Math.min(sd === 'back' ? pw : pd, +((hw[sd] || {}).l) || (sd === 'back' ? pw : pd));
    h += sd === 'back' ? `<rect x="0" y="${-s * 0.9}" width="${L}" height="${s * 0.9}" fill="#55634A"/>` : `<rect x="${sd === 'left' ? -s * 0.9 : pw}" y="0" width="${s * 0.9}" height="${L}" fill="#55634A"/>`; });
  // floors set up on it (deck, grass, pathway) under everything else
  const drawn = (it, i) => { const f = foot(it), x = +it.x, z = +it.z, on = sel.k === 'it' && sel.i === i, pg = it.cat === 'pergola', fs = Math.min(f[0], f[1]) * 0.5, lab = Math.max(s * 0.9, Math.min(s * 2, fs));
    let r = `<g data-it="${i}"><rect x="${x}" y="${z}" width="${f[0]}" height="${f[1]}" rx="${it.cat === 'water' || it.cat === 'firepit' || it.cat === 'umbrella' ? Math.min(f[0], f[1]) / 2 : 0.2}" fill="${pg ? 'rgba(46,46,46,.06)' : FILL[it.cat] || '#F1E3D8'}" stroke="${on ? '#C26445' : pg ? '#2E2E2E' : '#9B8E7E'}" stroke-width="${on ? s * 0.3 : s * 0.1}"${pg ? ` stroke-dasharray="${s * 0.5} ${s * 0.3}"` : ''}/>`;
    if (pg) for (let u = x + 1; u < x + f[0] - 0.4; u += 1.2) r += `<path d="M${u} ${z}V${z + f[1]}" stroke="#2E2E2E" stroke-width="${s * 0.05}" opacity=".35"/>`;
    if (opts.labels !== false && !['pathway', 'lights'].includes(it.cat)) r += `<text x="${x + f[0] / 2}" y="${z + (pg ? lab * 0.9 : f[1] / 2)}" font-size="${lab}" class="p2lb">${ICON[it.cat] || ''}</text>`;
    return r + '</g>'; };
  items.forEach((it, i) => { if (it && !it.segs && !it.box && ['deck', 'turf', 'pathway'].includes(it.cat)) h += drawn(it, i); });
  // the parapet
  h += `<polygon points="${poly}" fill="none" stroke="#9B8E7E" stroke-width="${E * 2}" stroke-linejoin="miter" clip-path="url(#p2clipo)"/><clipPath id="p2clipo"><polygon points="${poly}"/></clipPath>`;
  // parapet screens
  items.forEach((it, i) => { if (it && it.segs) h += `<g data-it="${i}">` + it.segs.map(g => `<path d="M${g.x0} ${g.z0}L${g.x1} ${g.z1}" stroke="${sel.k === 'it' && sel.i === i ? '#C26445' : '#8B6A43'}" stroke-width="${s * 0.55}" stroke-linecap="round"/>`).join('') + '</g>'; });
  // roof structures
  (t.blocks || []).forEach((b, i) => { const on = sel.k === 'blk' && sel.i === i, lab = Math.max(s * 0.9, Math.min(s * 1.7, Math.min(b.w, b.d) * 0.32));
    h += `<g data-blk="${i}"><rect x="${b.x}" y="${b.z}" width="${b.w}" height="${b.d}" rx="0.2" fill="${b.type === 'ac' ? '#BFD9E6' : b.type === 'shaft' ? '#9C958A' : b.type === 'mumty' ? '#CFC7BA' : '#D6D2C7'}" stroke="${on ? '#C26445' : '#6F665A'}" stroke-width="${on ? s * 0.3 : s * 0.12}"/>`;
    if (b.type === 'mumty' || b.type === 'room' || b.type === 'lift') { const dr = b.door || 'front', dw = Math.min(3, (dr === 'front' || dr === 'back' ? b.w : b.d) * 0.5);
      h += dr === 'front' || dr === 'back' ? `<rect x="${b.x + (b.w - dw) / 2}" y="${dr === 'front' ? b.z + b.d - 0.25 : b.z - 0.05}" width="${dw}" height="0.3" fill="#8B5A2B"/>` : `<rect x="${dr === 'right' ? b.x + b.w - 0.25 : b.x - 0.05}" y="${b.z + (b.d - dw) / 2}" width="0.3" height="${dw}" fill="#8B5A2B"/>`; }
    if (b.type !== 'ac') h += `<text x="${b.x + b.w / 2}" y="${b.z + b.d / 2}" font-size="${lab}" class="p2lb">${ICON[b.type] || ''} ${b.w >= 5 ? NAME[b.type] || '' : ''}</text>`;
    h += '</g>'; });
  // the things that stand on it (pergolas last, as an outline over what is under them)
  items.forEach((it, i) => { if (it && !it.segs && !it.box && !['deck', 'turf', 'pathway', 'pergola'].includes(it.cat)) h += drawn(it, i); });
  items.forEach((it, i) => { if (it && !it.segs && !it.box && it.cat === 'pergola') h += drawn(it, i); });
  // road + north
  const rd = opts.road || ['front'], lt = (x, y, tx, r) => `<text x="${x}" y="${y}" font-size="${s * 1.2}" class="p2lb" style="fill:#8a3a1f"${r ? ` transform="rotate(${r} ${x} ${y})"` : ''}>${tx}</text>`;
  rd.forEach(sd => { h += sd === 'front' ? lt(pw / 2, pd + M - s * 1.1, '▼ ROAD') : sd === 'back' ? lt(pw / 2, -M + s * 1.1, '▲ ROAD') : sd === 'left' ? lt(-M + s * 1.1, pd / 2, '◀ ROAD', -90) : lt(pw + M - s * 1.1, pd / 2, 'ROAD ▶', 90); });
  if (opts.north) { const v = { back: [0, -1], front: [0, 1], left: [-1, 0], right: [1, 0] }[opts.north], cx = pw + M - s * 2.2, cy = -M + s * 2.2, r = s * 1.6;
    h += `<g><circle cx="${cx}" cy="${cy}" r="${r * 1.15}" fill="#fff" stroke="#3A3530" stroke-width="${s * 0.08}"/><path d="M${cx + v[0] * r} ${cy + v[1] * r}L${cx - v[1] * r * 0.45 - v[0] * r * 0.5} ${cy + v[0] * r * 0.45 - v[1] * r * 0.5}L${cx + v[1] * r * 0.45 - v[0] * r * 0.5} ${cy - v[0] * r * 0.45 - v[1] * r * 0.5}Z" fill="#C26445"/>` +
      `<text x="${cx + v[0] * r * 1.75}" y="${cy + v[1] * r * 1.75}" font-size="${s * 1.1}" class="p2lb">N</text></g>`; }
  if (opts.measure) h += dims(t, items, s);
  return h + '</svg>';
}
function dims(t, items, s) {
  const pw = +t.pw, pd = +t.pd; let h = '';
  {
    h += dim(0, 0, pw, 0, -s * 5.5, f1(pw) + "'", s) + dim(0, 0, 0, pd, s * 5.5, f1(pd) + "'", s);
    const big = (t.blocks || []).filter(b => b.type !== 'ac').map(b => ({ x: b.x, z: b.z, w: b.w, d: b.d }))
      .concat(items.filter(it => it && !it.segs && !it.box && !['lights', 'planter', 'pathway'].includes(it.cat)).map(it => { const f = foot(it); return { x: +it.x, z: +it.z, w: f[0], d: f[1], c: it.cat }; }).filter(r => r.w * r.d >= 9));
    const pgs = big.filter(r => r.c === 'pergola'), under = r => r.c !== 'pergola' && pgs.some(p => r.x >= p.x - 0.1 && r.z >= p.z - 0.1 && r.x + r.w <= p.x + p.w + 0.1 && r.z + r.d <= p.z + p.d + 0.1);
    big.splice(0, big.length, ...big.filter(r => !under(r)));
    big.forEach(r => { h += dim(r.x, r.z, r.x + r.w, r.z, s * 1.4, f1(r.w) + "'", s * 0.8) + dim(r.x + r.w, r.z, r.x + r.w, r.z + r.d, -s * 1.4, f1(r.d) + "'", s * 0.8); });
    freeRects(t, items, 4).forEach(b => { h += `<rect class="p2fr" x="${b.x + 0.15}" y="${b.z + 0.15}" width="${b.w - 0.3}" height="${b.d - 0.3}" fill="rgba(46,125,62,.07)" stroke="#2E7D3E" stroke-width="${s * 0.08}" stroke-dasharray="${s * 0.6} ${s * 0.35}"/>` +
      dim(b.x, b.z + Math.min(b.d * 0.3, 3), b.x + b.w, b.z + Math.min(b.d * 0.3, 3), 0, 'free ' + b.w + "'", s * 0.85, 'fr') + dim(b.x + b.w - Math.min(b.w * 0.25, 2), b.z, b.x + b.w - Math.min(b.w * 0.25, 2), b.z + b.d, 0, b.d + "'", s * 0.85, 'fr'); });
  }
  return h;
}
// only the dimensions, laid exactly over a plan box of pw × pd (the roof plan in mto.js)
export function dimsSvg(t, items) { const pw = +t.pw, pd = +t.pd, s = Math.max(0.8, Math.max(pw, pd) / 46);
  return `<svg xmlns="http://www.w3.org/2000/svg" class="p2svg p2dims" viewBox="0 0 ${pw} ${pd}" preserveAspectRatio="none"><defs><marker id="p2a" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="${s * 1.6}" markerHeight="${s * 1.6}" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0 1L10 5L0 9z" fill="#3A3530"/></marker></defs>` +
    `<style>.p2dims{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;font-family:Inter,system-ui,sans-serif}.p2l,.p2e{stroke:#3A3530;stroke-width:${s * 0.09};fill:none}.p2e{stroke-width:${s * 0.06}}.p2tb{fill:#fff}.p2t{text-anchor:middle;fill:#2E2E2E;font-weight:600}.p2d.fr .p2l{stroke:#2E7D3E}.p2d.fr .p2t{fill:#1F5E2C}</style>` + dims(t, items || [], s) + '</svg>'; }

// pointer position → plan feet (for dragging on the SVG)
export function toFt(svgEl, e) { const p = svgEl.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const m = svgEl.getScreenCTM(); if (!m) return null; const q = p.matrixTransform(m.inverse()); return { x: q.x, z: q.y }; }
window.Plan2D = { svg, dimsSvg, freeRects, outline, toFt };
