import { layUrl, layPeriod, layRot, SPECS as LSPEC } from './floorlay.js?v=8';
// outrr 2D plan (234): the terrace drawn from above as an SVG — roof structures, the things set up on it, floor finishes — and,
// when asked, AutoCAD-style dimensions (extension lines, arrows, the size written inside the line) for the terrace, every structure
// and thing, and the biggest free spaces left. Used by the roof plan (mto.js) and the setup plan (planner.js). Units: ft,
// x = left → right seen from the road, z = back (0) → front (pd, the road).
const E = 0.75;   // parapet
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const f1 = v => (Math.round(v * 2) / 2).toString();
export const ICON = { plant: '🌴', mumty: '🪜', lift: '🛗', room: '🚪', shaft: '⬛', ac: '❄️', cabin: '🏠', pergola: '⛱️', sofa: '🛋️', swing: '🪢', dining: '🍽️', chair: '🪑', bench: '🪵', table: '🟫', bar: '🍸', planter: '🪴',
  water: '⛲', sculpture: '🗿', deck: '🟧', railing: '🚧', privacy: '🎋', feature: '🧱', vgarden: '🌿', graffiti: '🎨', accover: '❄️', gate: '🚪', pathway: '🪨', turf: '🟩', firepit: '🔥', jacuzzi: '🛁', lights: '💡', umbrella: '☂️', fbench: '💺', counter: '🍳', shaftcover: '⬜' };
// 245: line icons (24 × 24, stroke) everywhere instead of emojis — owner: "sare icons line icons banao"
export const NORTHV = { back: [0, -1], front: [0, 1], left: [-1, 0], right: [1, 0], 'back-left': [-0.7071, -0.7071], 'back-right': [0.7071, -0.7071], 'front-left': [-0.7071, 0.7071], 'front-right': [0.7071, 0.7071] };   // 278: 4 sides + 4 corners
export const ICO = {
  stairs: 'M3 20h4v-4h4v-4h4V8h4V4h2 M3 20h18',
  plant: 'M12 21v-9 M12 12c-1-4-5-6-9-5 3 1 6 3 9 5 M12 12c1-4 5-6 9-5-3 1-6 3-9 5 M12 10c-2-3-2-6 0-8 2 2 2 5 0 8 M9 21h6',
  cabin: 'M3 10h18v10H3z M3 10l2-4h14l2 4 M8 20v-6h8v6 M12 14v6', pergola: 'M2 7h20 M3 10h18 M5 7v13 M19 7v13 M8 5v5 M12 5v5 M16 5v5',
  sofa: 'M5 11V8a2 2 0 012-2h10a2 2 0 012 2v3 M3 11a2 2 0 012 2v2h14v-2a2 2 0 014 0v5H1v-5a2 2 0 012-2z M5 18v2 M19 18v2', swing: 'M4 3h16 M7 3v11 M17 3v11 M5 14h14v3H5z',
  dining: 'M5 10h14 M8 10v9 M16 10v9 M2 7v12 M22 7v12 M2 14h3 M19 14h3', chair: 'M8 3v18 M8 12h9v9 M8 3h3',
  bench: 'M3 7h18 M5 7v4 M19 7v4 M3 11h18v3H3z M5 14v5 M19 14v5', fbench: 'M3 7h18 M5 7v4 M19 7v4 M3 11h18v3H3z M5 14v5 M19 14v5', table: 'M3 9h18 M6 9v11 M18 9v11 M3 9l2-3h14l2 3',
  bar: 'M3 12h18v8H3z M3 15h18 M9 3h6l-3 4z M12 7v5', planter: 'M6 13h12l-1.5 8h-9z M12 13V9 M12 9c0-3-3-5-6-5 0 3 2 5 6 5 M12 10c0-3 3-5 6-5 0 3-2 5-6 5',
  water: 'M4 21h16 M6 21v-4h12v4 M12 17V8 M12 8c-2 3-5 3-6 1 M12 8c2 3 5 3 6 1 M12 3v2', sculpture: 'M8 21h8 M9 21v-3h6v3 M12 18c-3 0-4-3-3-6s4-3 3-7c3 2 4 5 3 8s-1 5-3 5',
  deck: 'M3 5h18v14H3z M3 9.7h18 M3 14.3h18 M9 5v4.7 M15 9.7v4.6 M9 14.3V19', railing: 'M3 6h18 M3 18h18 M5 6v12 M9 6v12 M13 6v12 M17 6v12 M21 6v12',
  privacy: 'M4 3v18 M20 3v18 M4 6h16 M4 10h16 M4 14h16 M4 18h16', feature: 'M4 4h16v16H4z M8 4v16 M12 4v16 M16 4v16 M3 21h18',
  vgarden: 'M5 3h14v18H5z M8 8c1-2 3-2 3-2s-1 3-3 2 M16 12c-1-2-3-2-3-2s1 3 3 2 M8 16c1-2 3-2 3-2s-1 3-3 2', graffiti: 'M9 9h6v12H9z M10 9V6h4v3 M12 4v2 M17 5l2-1 M17 8h3 M17 11l2 1',
  accover: 'M3 7h18v10H3z M3 10h18 M3 13h18 M3 16h18', pathway: 'M3 17h5v3H3z M9.5 12h5v3h-5z M16 7h5v3h-5z', turf: 'M3 20h18 M5 20c0-4 1-6 2-8 M8 20c0-3-1-5-2-7 M11 20c0-5 1-8 3-10 M14 20c0-3 1-5 2-6 M18 20c0-4-1-6-2-8',
  counter: 'M3 10h18v10H3z M3 14h18 M8 3c0 2 2 2 2 5 M14 3c0 2 2 2 2 5', shaftcover: 'M4 6h16v12H4z M4 6l16 12 M20 6L4 18',
  firepit: 'M5 18h14l-2 3H7z M12 3c2 3 4 5 4 8a4 4 0 01-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-4 0-7z', jacuzzi: 'M3 11h18v4a5 5 0 01-5 5H8a5 5 0 01-5-5z M6 11V6a2 2 0 014 0 M8 15h.01 M12 16h.01 M16 15h.01',
  lights: 'M9 18h6 M10 21h4 M12 3a6 6 0 00-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0012 3z', umbrella: 'M3 11a9 9 0 0118 0z M12 11v8a2 2 0 01-4 0 M12 2v1',
  gate: 'M3 21V6 M21 21V6 M3 9h18 M3 21h18 M8 9v12 M12 9v12 M16 9v12', mumty: 'M4 20h4v-4h4v-4h4V8h4V4', lift: 'M5 3h14v18H5z M12 3v18 M7.5 10l1.5-2 1.5 2 M13.5 14l1.5 2 1.5-2',
  room: 'M6 21V3h12v18 M3 21h18 M14 12h.01', shaft: 'M5 5h14v14H5z M5 5l14 14', ac: 'M3 6h18v8H3z M6 10h12 M7 18l1-2 M12 19v-3 M17 18l-1-2',
  chill: 'M4 9h12v5a5 5 0 01-5 5H9a5 5 0 01-5-5z M16 11h2a2 2 0 010 4h-2 M8 3v3 M12 3v3', party: 'M6 3h5l-1 6a2 2 0 01-3 0z M8.5 10v9 M6 21h5 M14 3h5l-1 6a2 2 0 01-3 0z M16.5 10v9 M14 21h5',
  work: 'M5 5h14v10H5z M2 19h20l-2-4H4z', green: 'M5 20c0-9 5-15 15-15 0 10-6 15-15 15 M5 20l8-8', yoga: 'M12 3.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3 M12 8v5 M5 11l7 2 7-2 M8 20l4-7 4 7',
  spa: 'M3 11h18v4a5 5 0 01-5 5H8a5 5 0 01-5-5z M8 3c0 2 2 2 2 5 M14 3c0 2 2 2 2 5', family: 'M12 21v-6 M12 15c-4 0-6-3-6-6a6 6 0 0112 0c0 3-2 6-6 6', choose: 'M9 11V5a1.5 1.5 0 013 0v6 M12 10V4a1.5 1.5 0 013 0v7 M15 11V6a1.5 1.5 0 013 0v8a6 6 0 01-6 6h-1a6 6 0 01-5-3l-3-5a1.5 1.5 0 012.5-1.5L9 13V8a1.5 1.5 0 010 0',
  rack: 'M5 3h14v18H5z M5 8h14 M5 13h14 M5 18h14 M8 5v3 M11 5v3 M14 10v3 M9 15v3 M15 15v3', stool: 'M7 5h10 M9 5l-1.5 15 M15 5l1.5 15 M8.3 13h7.4', check: 'M5 12l5 5 9-10', sun: 'M12 7a5 5 0 110 10 5 5 0 010-10 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5L19 19 M5 19l1.5-1.5 M17.5 6.5L19 5', moon: 'M20 14A8 8 0 1110 4a6 6 0 0010 10z',
  sparkle: 'M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z M19 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z', sprout: 'M12 21v-8 M12 13c0-4-3-6-7-6 0 4 3 6 7 6 M12 11c0-3 2-5 6-5 0 3-2 5-6 5',
  lush: 'M4 21h16 M7 21c-1-5 0-9 3-12 M12 21c0-6 1-10 5-14 M17 21c1-4 0-7-2-9 M10 9c-3 0-5-2-5-5 3 0 5 2 5 5 M17 7c2 0 4-1 4-4-2 0-4 1-4 4', brush: 'M18 3l3 3-9 9-3-3z M9 12l-4 4c-1 1-1 3-3 4 3 1 5 0 6-1l4-4',
  roller: 'M4 4h13v5H4z M17 6h3v6h-8v3 M11 15h2v6h-2z', tiles: 'M3 3h18v18H3z M3 12h18 M12 3v18', brick: 'M3 5h18v14H3z M3 9.7h18 M3 14.3h18 M8 5v4.7 M16 5v4.7 M12 9.7v4.6 M8 14.3V19 M16 14.3V19',
  refresh: 'M20 7a8 8 0 10.5 7 M20 3v4h-4', plusbox: 'M4 4h16v16H4z M12 8v8 M8 12h8', door: 'M6 21V3h12v18 M3 21h18 M14 12h.01', straight: 'M3 10h18v4H3z', lshape: 'M4 5h4v11h12v4H4z',
  curve: 'M4 19c0-8 6-14 16-14v4c-7 0-12 4-12 10z', none: 'M5 5l14 14 M19 5L5 19', grass: 'M3 20h18 M5 20c0-4 1-6 2-8 M8 20c0-3-1-5-2-7 M11 20c0-5 1-8 3-10 M14 20c0-3 1-5 2-6 M18 20c0-4-1-6-2-8' };
// 245: small pictures of the four floor looks (setup screen)
export function floorThumb(k) { const pat = { garden: '<rect width="120" height="80" fill="#EFEBE4"/><rect x="10" y="10" width="62" height="60" fill="#8DBB63"/><g fill="#B5ADA0"><rect x="36" y="14" width="10" height="7" rx="1.5"/><rect x="36" y="27" width="10" height="7" rx="1.5"/><rect x="36" y="40" width="10" height="7" rx="1.5"/><rect x="36" y="53" width="10" height="7" rx="1.5"/></g><rect x="80" y="14" width="30" height="30" fill="#2F6F7E" opacity=".75"/><path d="M95 18l9 11-9 11-9-11z" fill="#F3EEE6"/>',
    courtyard: '<rect width="120" height="80" fill="#EFEBE4"/><path d="M0 20H120M0 40H120M0 60H120M20 0V80M40 0V80M60 0V80M80 0V80M100 0V80" stroke="#D4CEC4" stroke-width="1"/><rect x="12" y="12" width="40" height="30" fill="#2F6F7E" opacity=".75"/><path d="M32 15l9 12-9 12-9-12z" fill="#F3EEE6"/><rect x="66" y="40" width="42" height="30" fill="#2F6F7E" opacity=".75"/><path d="M87 43l9 12-9 12-9-12z" fill="#F3EEE6"/>',
    greek: '<rect width="120" height="80" fill="#8FA38A"/><rect x="8" y="8" width="104" height="64" fill="#EFE8DC"/><g fill="#C9B99E"><circle cx="20" cy="20" r="1.5"/><circle cx="50" cy="30" r="1.2"/><circle cx="80" cy="18" r="1.6"/><circle cx="96" cy="50" r="1.3"/><circle cx="35" cy="56" r="1.5"/><circle cx="66" cy="62" r="1.1"/></g><g fill="#9FA89A"><circle cx="28" cy="40" r="1.2"/><circle cx="72" cy="42" r="1.4"/><circle cx="100" cy="28" r="1"/></g>',
    keep: '<rect width="120" height="80" fill="#9AA596"/><path d="M0 20H120M0 40H120M0 60H120M30 0V80M60 0V80M90 0V80" stroke="#7E887A" stroke-width="1"/><path d="M45 40l10 10 20-22" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>',
    geometric: '<rect width="120" height="80" fill="#4A4A48"/><g><rect x="8" y="8" width="104" height="64" fill="#E9E6E0"/>' + [0, 1, 2, 3, 4, 5, 6].map(i => [0, 1, 2, 3].map(j => (i + j) % 2 ? '' : `<rect x="${8 + i * 15}" y="${8 + j * 16}" width="15" height="16" fill="#8F8D88"/>`).join('')).join('') + '</g>' }[k] || '';
  return `<svg viewBox="0 0 120 80" class="flthumb" aria-hidden="true">${pat}</svg>`; }
export const ico = (k, cls) => ICO[k] ? `<svg class="ico${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICO[k]}"/></svg>` : '';
const icoG = (k, x, y, sz, col) => ICO[k] ? `<g transform="translate(${(x - sz / 2).toFixed(2)} ${(y - sz / 2).toFixed(2)}) scale(${(sz / 24).toFixed(4)})" fill="none" stroke="${col || '#5B544B'}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"><path d="${ICO[k]}"/></g>` : '';
const NAME = { mumty: 'Stairs', lift: 'Lift', room: 'Room', shaft: 'Shaft', ac: 'AC', troom: 'Temp room' };
const FILL = { plant: '#CFE3C0', rack: '#6B4A33', stool: '#E3D6C2', deck: 'url(#p2wood)', turf: 'url(#p2turf)', pathway: 'url(#p2path)', cabin: '#E8E1D4', jacuzzi: '#CFE6EF', water: '#D6EAF2', planter: '#DCE8D0', vgarden: '#DCE8D0', feature: '#D8D2C8', bar: '#E9D9CC', lights: '#FFF1C9', firepit: '#F2D5C4', fbench: '#E3D6C2', counter: '#E9D9CC', shaftcover: 'rgba(244,244,242,.85)' };
const foot = it => (+it.rot || 0) % 180 ? [it.d, it.w] : [it.w, it.d];
export const cellFt = (t) => Math.max(t.pw, t.pd);

export function inPolyP(P, x, z) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, zi] = P[i], [xj, zj] = P[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; }
// the plot outline with its corner cuts
export function outline(t) {
  if (Array.isArray(t.outline) && t.outline.length >= 3) return t.outline.map(q => [+q[0], +q[1]]);   // 244: any shape
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
  if (Array.isArray(t.outline) && t.outline.length >= 3) { const O = outline(t); for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (!inPolyP(O, x + 0.5, z + 0.5)) occ[z][x] = 1; }
  const C = t.outline ? {} : t.cuts || {}; Object.keys(C).forEach(k => { const c = C[k]; if (!c || !c.type) return; for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) { const px = k[1] === 'l' ? x + 0.5 : pw - x - 0.5, pz = k[0] === 'b' ? z + 0.5 : pd - z - 0.5;
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
const PEB_SKIP = new Set(['plant', 'deck', 'turf', 'pathway', 'pergola', 'planter', 'lights', 'stool', 'chair', 'umbrella']);
function pOpenSide(t, items, r, c) { const E = 0.75, pw = +t.pw, pd = +t.pd; if (c[2] * c[3] < r[2] * r[3] * 0.6) return false;   // mostly clipped = against the parapet
  if (c[0] <= E + 0.6 && c[2] < 1 || c[1] <= E + 0.6 && c[3] < 1 || c[0] + c[2] >= pw - E - 0.6 && c[2] < 1 || c[1] + c[3] >= pd - E - 0.6 && c[3] < 1) return false;
  const ov = q => Math.max(0, Math.min(c[0] + c[2], q.x + q.w) - Math.max(c[0], q.x)) * Math.max(0, Math.min(c[1] + c[3], q.z + q.d) - Math.max(c[1], q.z)), A = c[2] * c[3];
  if ((t.blocks || []).some(b => ov(b) > A * 0.3)) return false;
  return !(items || []).some(o => o && !o.segs && !PEB_SKIP.has(o.cat) && ov({ x: +o.x, z: +o.z, w: (+o.rot || 0) % 180 ? +o.d : +o.w, d: (+o.rot || 0) % 180 ? +o.w : +o.d }) > A * 0.3); }
function pebNear(t, items) { const out = [], E = 0.75, b = 0.6, cl = r => { const x0 = Math.max(E, r[0]), z0 = Math.max(E, r[1]), x1 = Math.min(+t.pw - E, r[0] + r[2]), z1 = Math.min(+t.pd - E, r[1] + r[3]); return x1 - x0 > 0.3 && z1 - z0 > 0.3 ? [x0, z0, x1 - x0, z1 - z0] : null; };
  (items || []).forEach(it => { if (!it || it.segs) return; const rot = +it.rot || 0, sw = rot % 180 ? it.d : it.w, sd = rot % 180 ? it.w : it.d, x = +it.x, z = +it.z;
    if (it.cat === 'deck' && !it.old) [[x - b, z - b, sw + 2 * b, b], [x - b, z + sd, sw + 2 * b, b], [x - b, z, b, sd], [x + sw, z, b, sd]].forEach(r => { const c = cl(r); if (c && pOpenSide(t, items, r, c)) out.push(c); });   // 255 (owner): only on the open sides — not against the parapet, a wall or a built thing
    else if (it.cat === 'feature') { const f = { 0: [x, z + sd, sw, b], 180: [x, z - b, sw, b], 90: [x - b, z, b, sd], 270: [x + sw, z, b, sd] }[rot % 360]; const c = f && cl(f); if (c) out.push(c); } });
  return out; }
let SVGN = 0;
function layDefs(fl, U) {   // 276: the floor's laid patterns as small images (floorlay.js), one pattern per recipe used
  const N = new Set([fl.border && fl.border.lay].concat((fl.zones || []).filter(z => z.k === 'prug' || z.k === 'path' || z.k === 'circ' || z.k === 'poly').map(z => z.s)).filter(k => k && LSPEC[k]));
  const fd = fl.lay && LSPEC[fl.lay] ? (() => { const P = layPeriod(fl.lay), r = (layRot(fl.lay) || 0) + (fl.lrot || 0), u = layUrl(fl.lay); return u ? `<pattern id="p2LF${U}" width="${P[0]}" height="${P[1]}" patternUnits="userSpaceOnUse"${r ? ` patternTransform="rotate(${r})"` : ''}><image href="${u}" width="${P[0]}" height="${P[1]}" preserveAspectRatio="none"/></pattern>` : ''; })() : '';
  return fd + [...N].map(k => { const P = layPeriod(k), r = layRot(k), u = layUrl(k); return u ? `<pattern id="p2L_${k}${U}" width="${P[0]}" height="${P[1]}" patternUnits="userSpaceOnUse"${r ? ` patternTransform="rotate(${r})"` : ''}><image href="${u}" width="${P[0]}" height="${P[1]}" preserveAspectRatio="none"/></pattern>` : ''; }).join(''); }
export function svg(t, opts) { const U = 'u' + (++SVGN);   // 276c: own pattern ids per drawing (several plans on one page)
  opts = opts || {}; const pw = +t.pw, pd = +t.pd, s = Math.max(0.8, Math.max(pw, pd) / 46), M = opts.measure ? s * 9 : s * 3.2, items = opts.items || [], fl = t.floor || {};
  const O = outline(t), poly = O.map(p => p.join(',')).join(' '), sel = opts.sel || {};
  let h = `<svg xmlns="http://www.w3.org/2000/svg" class="p2svg" viewBox="${-M} ${-M} ${pw + 2 * M} ${pd + 2 * M}" preserveAspectRatio="xMidYMid meet" data-m="${M}">`;
  h += `<defs><marker id="p2a" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="${s * 1.6}" markerHeight="${s * 1.6}" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0 1L10 5L0 9z" fill="#3A3530"/></marker>` +
    `<pattern id="p2tile" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#EFEBE4"/><path d="M0 0H2V2" fill="none" stroke="#D4CEC4" stroke-width="0.06"/></pattern>` +
    `<pattern id="p2moro" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="#F3EEE6"/><path d="M1.5 0.25 Q2.2 0.8 1.5 1.5 Q0.8 0.8 1.5 0.25Z M1.5 1.5 Q2.2 2.2 1.5 2.75 Q0.8 2.2 1.5 1.5Z M0.25 1.5 Q0.8 0.8 1.5 1.5 Q0.8 2.2 0.25 1.5Z M2.75 1.5 Q2.2 0.8 1.5 1.5 Q2.2 2.2 2.75 1.5Z" fill="#2F6F7E" opacity="0.55"/><path d="M0 0H3V3" fill="none" stroke="#C9C1B4" stroke-width="0.05"/></pattern>` +
    `<pattern id="p2grey" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#C9C8C4"/><path d="M0 0H2V2" fill="none" stroke="#A9A7A2" stroke-width="0.06"/></pattern>` +
    `<pattern id="p2stone" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#DCCFB2"/><path d="M0 0H2V2" fill="none" stroke="#BBAA86" stroke-width="0.06"/></pattern>` +
    `<pattern id="p2terra" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#D39A74"/><path d="M0 0H2V2" fill="none" stroke="#A86E4B" stroke-width="0.06"/></pattern>` +
    `<pattern id="p2terz" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#EFE8DC"/><circle cx="0.3" cy="0.4" r="0.07" fill="#C9B99E"/><circle cx="1.2" cy="0.3" r="0.05" fill="#9FA89A"/><circle cx="0.8" cy="1.1" r="0.08" fill="#D2B48F"/><circle cx="1.6" cy="1.5" r="0.06" fill="#B7AE9F"/><circle cx="0.4" cy="1.7" r="0.05" fill="#A9B3A4"/><path d="M0 0H2V2" fill="none" stroke="#DED5C6" stroke-width="0.04"/></pattern>` +
    `<pattern id="p2chk" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#E9E6E0"/><rect width="2" height="2" fill="#8F8D88"/><rect x="2" y="2" width="2" height="2" fill="#8F8D88"/><path d="M0 0H4V4M0 2H4M2 0V4" fill="none" stroke="#C9C5BD" stroke-width="0.05"/></pattern>` +
    `<pattern id="p2kota" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#9AA596"/><rect x="1" y="0" width="1" height="1" fill="#A7B1A2"/><rect x="0" y="1" width="1" height="1" fill="#8F9A8B"/><path d="M0 0H2V2" fill="none" stroke="#7E887A" stroke-width="0.04"/></pattern>` +
    `<pattern id="p2gran" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#3B3936" stroke="#26241F" stroke-width="0.04"/><circle cx=".4" cy=".5" r=".05" fill="#7B7670"/><circle cx="1.3" cy="1.4" r=".05" fill="#9A948C"/><circle cx="1.5" cy=".4" r=".04" fill="#5A5753"/><circle cx=".7" cy="1.6" r=".04" fill="#7B7670"/></pattern>` +
    `<pattern id="p2marb" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#F2F0EC"/><path d="M0 0.4C0.6 0.6 1 1.2 2 1.3" stroke="#C9C4BB" stroke-width="0.04" fill="none"/><path d="M0 0H2V2" fill="none" stroke="#DCD8D0" stroke-width="0.03"/></pattern>` +
    `<pattern id="p2peb" width="1" height="1" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="#D9D3C8"/><circle cx="0.25" cy="0.3" r="0.16" fill="#B8B0A3"/><circle cx="0.7" cy="0.65" r="0.19" fill="#A9A194"/><circle cx="0.2" cy="0.8" r="0.11" fill="#C7BFB2"/></pattern>` +
    `<pattern id="p2turf" width="1" height="1" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="#8DBB63"/><path d="M0.2 0.8l0.1-0.35M0.6 0.5l0.08-0.3M0.8 0.95l0.06-0.28" stroke="#6E9E46" stroke-width="0.07"/></pattern>` +
    `<pattern id="p2wood" width="4" height="0.6" patternUnits="userSpaceOnUse"><rect width="4" height="0.6" fill="#B88A5E"/><path d="M0 0.58H4M2.4 0V0.6" stroke="#8E6640" stroke-width="0.05"/></pattern>` +
    `<pattern id="p2lime" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#F6F4EF" stroke="#D8D2C6" stroke-width="0.04"/></pattern>` +
    `<pattern id="p2trav" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#DCCFB9" stroke="#C3B49C" stroke-width="0.05"/><path d="M0 0.7C0.7 0.8 1.3 0.6 2 0.75M0 1.4C0.8 1.5 1.2 1.3 2 1.45" stroke="#C9B99E" stroke-width="0.03" fill="none"/></pattern>` +
    `<pattern id="p2g24" width="2" height="4" patternUnits="userSpaceOnUse"><rect width="2" height="4" fill="#B9B8B4" stroke="#9E9C97" stroke-width="0.05"/></pattern>` +
    `<pattern id="p2kil" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#9E2B25"/><path d="M1 0.2L1.7 1L1 1.8L0.3 1Z" fill="#E0A33B"/><path d="M1 0.6L1.35 1L1 1.4L0.65 1Z" fill="#1F6F7E"/></pattern>` +
    `<pattern id="p2path" width="2.2" height="2.2" patternUnits="userSpaceOnUse"><rect width="2.2" height="2.2" fill="#D9D3C8"/><rect x="0.2" y="0.2" width="1.8" height="1.8" rx="0.15" fill="#9E978C"/></pattern>` + layDefs(fl, U) + `</defs>`;
  h += `<style>.p2svg{display:block;width:100%;height:100%;overflow:visible;font-family:Inter,system-ui,sans-serif;touch-action:pan-y}.p2svg .p2on{touch-action:none}.p2svg .p2dim{opacity:.28}.p2l,.p2e{stroke:#3A3530;stroke-width:${s * 0.09};fill:none}.p2e{stroke-width:${s * 0.06}}.p2tb{fill:#fff;stroke:none}.p2t{text-anchor:middle;fill:#2E2E2E;font-weight:600}.p2d.fr .p2l{stroke:#2E7D3E}.p2d.fr .p2t{fill:#1F5E2C}.p2old rect,.p2old polygon{stroke-dasharray:.6 .4;opacity:.75}.p2lb{text-anchor:middle;dominant-baseline:central;pointer-events:none;fill:#2E2E2E;font-weight:700}[data-blk],[data-it]{cursor:grab}.p2d,.p2fr{pointer-events:none}</style>`;
  // floor: tiles (plain / Moroccan) or bare, then a pebble border along the parapet
  h += fl.lay && LSPEC[fl.lay] ? `<polygon points="${poly}" fill="url(#p2LF${U})"/>` : `<polygon points="${poly}" fill="${({ moroccan: 'url(#p2moro)', plain: 'url(#p2tile)', grey: 'url(#p2grey)', stone: 'url(#p2stone)', terracotta: 'url(#p2terra)', terrazzo: 'url(#p2terz)', checker: 'url(#p2chk)', kota: 'url(#p2kota)', marble: 'url(#p2marb)', granite: 'url(#p2gran)', cement: '#C9C5BE', lime: 'url(#p2lime)', trav: 'url(#p2trav)' })[fl.tile === 'grey' && Array.isArray(fl.ts) ? 'g24' : fl.tile] || (fl.tile === 'grey' && Array.isArray(fl.ts) ? 'url(#p2g24)' : '#EADCC8')}"/>`;
  if (fl.border) { const BO = typeof fl.border === 'object' ? fl.border : null, bw = BO ? +BO.w || 1 : 1.25, bc = BO && BO.lay && LSPEC[BO.lay] ? `url(#p2L_${BO.lay}${U})` : BO ? ({ pebble: 'url(#p2peb)', terracotta: 'url(#p2terra)', cobble: 'url(#p2peb)', blue: '#2B5DA8', granite: '#2F2E2C' }[BO.c] || '#4A4A48') : fl.preset === 'greek' ? '#8FA38A' : '#4A4A48'; h += `<clipPath id="p2bcl"><polygon points="${poly}"/></clipPath><polygon points="${poly}" fill="none" stroke="${bc}" stroke-width="${(E + bw) * 2}" clip-path="url(#p2bcl)"/>`; }   // 245: the floor look's border band
  (fl.rugs || []).forEach(r => { h += `<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" fill="url(#p2moro)" stroke="#2F6F7E" stroke-width="0.15"/>`; });   // 245: Moroccan-tile 'rugs' where people sit
  (fl.zones || []).forEach(zn => { const { k, x, z, w, d } = zn;   // 274: the open floor landscaped per theme
    if (k === 'turf') h += `<rect x="${x}" y="${z}" width="${w}" height="${d}" fill="url(#p2turf)"/>`;
    else if (k === 'prug' || (k === 'path' && LSPEC[zn.s])) h += (zn.edge ? `<rect x="${x - 0.3}" y="${z - 0.3}" width="${w + 0.6}" height="${d + 0.6}" fill="${zn.edge}"/>` : '') + (zn.eonly ? '' : `<rect x="${x}" y="${z}" width="${w}" height="${d}" fill="url(#p2L_${zn.s}${U})"/>`);   // 276: laid paver rugs / paths (+ trim)
    else if (k === 'circ') h += (zn.edge ? `<circle cx="${zn.cx}" cy="${zn.cz}" r="${zn.r + 0.3}" fill="${zn.edge}"/>` : '') + `<circle cx="${zn.cx}" cy="${zn.cz}" r="${zn.r}" fill="url(#p2L_${zn.s}${U})"/>`;   // 276c
    else if (k === 'poly' && zn.s === '#edge') h += `<polygon points="${zn.pts.map(p => p.join(',')).join(' ')}" fill="${zn.c}"/>`;
    else if (k === 'poly') h += `<polygon points="${zn.pts.map(p => p.join(',')).join(' ')}" fill="${zn.s === 'turf' ? 'url(#p2turf)' : zn.s === 'peb' ? 'url(#p2peb)' : `url(#p2L_${zn.s}${U})`}" stroke="${zn.s === 'turf' ? '#6E9E46' : '#9E978C'}" stroke-width="0.2"/>`;
    else if (k === 'stone') h += `<ellipse cx="${zn.cx}" cy="${zn.cz}" rx="${zn.rx}" ry="${zn.rz}" transform="rotate(${zn.rot || 0} ${zn.cx} ${zn.cz})" fill="${zn.c}" stroke="rgba(0,0,0,.25)" stroke-width="0.1"/>`;
    else if (k === 'bed') h += `<rect x="${x}" y="${z}" width="${w}" height="${d}" fill="url(#p2turf)" stroke="#8E877B" stroke-width="0.25"/>`;
    else if (k === 'rug' && zn.s === 'jute') h += `<circle cx="${x + w / 2}" cy="${z + d / 2}" r="${Math.min(w, d) / 2}" fill="#C9A878" stroke="#8E6E42" stroke-width="0.1"/><circle cx="${x + w / 2}" cy="${z + d / 2}" r="${Math.min(w, d) / 3}" fill="none" stroke="#B8925E" stroke-width="0.08"/>`;
    else if (k === 'path') h += zn.s === 'stones' ? `<ellipse cx="${x + w / 2}" cy="${z + d / 2}" rx="0.75" ry="0.6" fill="#9E978C"/>` : `<rect x="${x + 0.05}" y="${z + 0.05}" width="${w - 0.1}" height="${d - 0.1}" fill="${{ terracotta: 'url(#p2terra)', cobble: 'url(#p2peb)', granite: '#2F2E2C', big: 'url(#p2trav)' }[zn.s] || '#9E978C'}"/>`;
    else if (k === 'inlay') { const r = Math.min(w, d) / 2, cx = x + w / 2, cy = z + d / 2, st = zn.s === 'star'; h += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${st ? '#1F6F7E' : '#2B5DA8'}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.9}" fill="#F6F4EF"/>` + (st ? `<rect x="${cx - r * 0.55}" y="${cy - r * 0.55}" width="${r * 1.1}" height="${r * 1.1}" fill="#9E2B25"/><rect x="${cx - r * 0.55}" y="${cy - r * 0.55}" width="${r * 1.1}" height="${r * 1.1}" fill="#E0A33B" transform="rotate(45 ${cx} ${cy})"/><circle cx="${cx}" cy="${cy}" r="${r * 0.3}" fill="#1F6F7E"/>` : `<circle cx="${cx}" cy="${cy}" r="${r * 0.6}" fill="none" stroke="#2B5DA8" stroke-width="${r * 0.12}" stroke-dasharray="${r * 0.15} ${r * 0.1}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.25}" fill="#2B5DA8"/>`); }
    else if (k === 'rug') h += `<rect x="${x}" y="${z}" width="${w}" height="${d}" fill="${{ sand: '#D8C9A8', boho: '#E2CDB0', berber: '#F1EADD' }[zn.s] || 'url(#p2kil)'}" stroke="${{ sand: '#B9A784', boho: '#B5562F', berber: '#2E2A26' }[zn.s] || '#F3EEE6'}" stroke-width="0.12"/>`;
    else if (k === 'pebble') h += `<rect x="${x}" y="${z}" width="${w}" height="${d}" fill="url(#p2peb)"/>`; });
  if (fl.pebble === 'near') h += pebNear(t, items).map(r => `<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" fill="url(#p2peb)"/>`).join('');   // 241: only round the deck / in front of the feature wall
  else if (fl.pebble) { const b = fl.pebble === true ? 0.6 : +fl.pebble; h += `<clipPath id="p2clip"><polygon points="${poly}"/></clipPath><g clip-path="url(#p2clip)"><path d="M${E} ${E}H${pw - E}V${pd - E}H${E}Z M${E + b} ${E + b}V${pd - E - b}H${pw - E - b}V${E + b}Z" fill="url(#p2peb)" fill-rule="evenodd"/></g>`; }
  // neighbour walls that rise higher
  const hi = t.high || {}, hw = t.hw || {};
  ['left', 'right', 'back'].forEach(sd => { if (!hi[sd]) return; const L = Math.min(sd === 'back' ? pw : pd, +((hw[sd] || {}).l) || (sd === 'back' ? pw : pd));
    h += sd === 'back' ? `<rect x="0" y="${-s * 0.9}" width="${L}" height="${s * 0.9}" fill="#55634A"/>` : `<rect x="${sd === 'left' ? -s * 0.9 : pw}" y="0" width="${s * 0.9}" height="${L}" fill="#55634A"/>`; });
  // floors set up on it (deck, grass, pathway) under everything else
  const GR = opts.grp || (sel.k === 'it' && sel.i != null ? [sel.i] : []), gcl = i => (GR.includes(i) ? ' p2on' : GR.length ? ' p2dim' : '');   // 254: the picked thing (+ what moves with it); the rest faded and locked
  const pgFree = (it, i) => { const a = { x: +it.x, z: +it.z, w: foot(it)[0], d: foot(it)[1] }; return !items.some((o, j) => { if (j === i || !o || o.segs || o.box || o.mode === 'mst') return false; const f = foot(o), b = { x: +o.x, z: +o.z, w: f[0], d: f[1] }; if (o.cat === 'deck' && Math.abs(b.x - a.x) < 0.7 && Math.abs(b.z - a.z) < 0.7) return false; return b.x < a.x + a.w - 0.1 && b.x + b.w > a.x + 0.1 && b.z < a.z + a.d - 0.1 && b.z + b.d > a.z + 0.1; }); };   // 264 (owner): a pergola with nothing under it can be tapped anywhere
  const drawn = (it, i) => { const f = foot(it), x = +it.x, z = +it.z, on = GR.includes(i), pg = it.cat === 'pergola', fs = Math.min(f[0], f[1]) * 0.5, lab = Math.max(s * 0.9, Math.min(s * 2, fs));
    const Cv = (it.cat === 'bar' || it.cat === 'fbench') && it.shape === 'curve', Lb = (it.cat === 'bar' && it.shape === 'L') || Cv;   // 241: an L bar drawn as an L; 247: curves as arcs
    let r = `<g data-it="${i}" class="${(it.old ? 'p2old' : '') + gcl(i)}"><rect x="${x}" y="${z}" width="${f[0]}" height="${f[1]}" rx="${it.cat === 'water' || it.cat === 'firepit' || it.cat === 'umbrella' || it.cat === 'plant' ? Math.min(f[0], f[1]) / 2 : 0.2}" fill="${Lb ? 'rgba(0,0,0,0)' : pg ? 'rgba(46,46,46,.06)' : FILL[it.cat] || '#F1E3D8'}" stroke="${on ? '#C26445' : Lb ? 'none' : pg ? '#2E2E2E' : '#9B8E7E'}" stroke-width="${sel.i === i ? s * 0.3 : on ? s * 0.18 : s * 0.1}"${pg ? ` stroke-dasharray="${s * 0.5} ${s * 0.3}" pointer-events="${pgFree(it, i) ? 'all' : 'stroke'}"` : ''}/>` + (pg ? `<rect x="${x}" y="${z}" width="${f[0]}" height="${f[1]}" fill="none" stroke="rgba(0,0,0,0)" stroke-width="${s * 1.2}" pointer-events="stroke"/>` : '');   // 254: a pergola is picked by its edge — what stands under it stays tappable
    if (it.cat === 'cabin' && it.ex) { const B = cabBody(it); if (B && (Math.abs(B.w - f[0]) > 0.2 || Math.abs(B.d - f[1]) > 0.2)) { r = r.replace(/<rect ([^>]*?)fill="[^"]*"/, '<rect $1fill="rgba(0,0,0,0)" stroke-dasharray="' + s * 0.45 + ' ' + s * 0.3 + '"') + `<rect x="${B.x}" y="${B.z}" width="${B.w}" height="${B.d}" rx="0.2" fill="${FILL.cabin}" stroke="${on ? '#C26445' : '#9B8E7E'}" stroke-width="${on ? s * 0.18 : s * 0.1}"/>`; } }   // 262 (owner): the cabin's floor area solid, its projection as a dotted line
    if (Cv) { const w = +it.w, d = +it.d, th = -(+it.rot || 0) * Math.PI / 180, cx = x + f[0] / 2, cz = z + f[1] / 2, L0 = [];
      if (it.cat === 'bar') { const R = Math.max(w, d) * 0.62, A = Math.PI * 0.75; for (let k = 0; k <= 16; k++) { const a = -A / 2 + A * k / 16; L0.push([Math.sin(a) * R, Math.cos(a) * R - R + d / 2 - 1.2]); } }
      else { const R = Math.min(w, d) - 1.2, ax = -w / 2 + 0.2 + R, az = -d / 2 + 0.2 + R; for (let k = 0; k <= 16; k++) { const a = (Math.PI / 2) * k / 16; L0.push([ax - R * Math.cos(a), az - R * Math.sin(a)]); } }
      const P = L0.map(([lx, lz]) => [cx + lx * Math.cos(th) + lz * Math.sin(th), cz - lx * Math.sin(th) + lz * Math.cos(th)]);
      r += `<polyline points="${P.map(p => p.map(v => +v.toFixed(2)).join(',')).join(' ')}" fill="none" stroke="${on ? '#C26445' : '#9B8E7E'}" stroke-width="${it.cat === 'bar' ? 2.3 : 1.9}" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${P.map(p => p.map(v => +v.toFixed(2)).join(',')).join(' ')}" fill="none" stroke="${FILL[it.cat] || '#E9D9CC'}" stroke-width="${it.cat === 'bar' ? 1.9 : 1.5}" stroke-linecap="round" stroke-linejoin="round"/>`; }
    else if (Lb) { const w = +it.w, d = +it.d, D = 2.2, th = -(+it.rot || 0) * Math.PI / 180, cx = x + f[0] / 2, cz = z + f[1] / 2, P = [[w - D, 0], [w, 0], [w, d], [0, d], [0, d - D], [w - D, d - D]].map(([a, b]) => { const lx = (a - w / 2) * (it.flip ? -1 : 1), lz = b - d / 2; /* 258: main counter at the front (chairs outside), return arm on the right — left when flipped */ return [cx + lx * Math.cos(th) + lz * Math.sin(th), cz - lx * Math.sin(th) + lz * Math.cos(th)]; });
      r += `<polygon points="${P.map(p => p.map(v => +v.toFixed(2)).join(',')).join(' ')}" fill="${FILL.bar || '#F1E3D8'}" stroke="${on ? '#C26445' : '#9B8E7E'}" stroke-width="${on ? s * 0.3 : s * 0.1}"/>`; }
    if (it.cat === 'sofa') { const L = sofaLayout(it.sconf); r += `<g transform="translate(${x + f[0] / 2} ${z + f[1] / 2}) rotate(${+it.rot || 0}) scale(${(+it.w / L.w) || 1} ${(+it.d / L.d) || 1})" fill="none" stroke="${on ? '#C26445' : '#6E6357'}" stroke-width="0.14" stroke-linejoin="round" pointer-events="none">${sofaSvg(it.sconf, 'g')}</g>`; }   // 261: the set's own pieces
    if (pg) for (let u = x + 1; u < x + f[0] - 0.4; u += 1.2) r += `<path d="M${u} ${z}V${z + f[1]}" stroke="#2E2E2E" stroke-width="${s * 0.05}" opacity=".35"/>`;
    if (opts.labels !== false && !['pathway', 'lights', 'sofa'].includes(it.cat)) r += icoG(it.cat, x + f[0] / 2, z + (pg ? lab * 0.9 : f[1] / 2), Math.min(lab * 1.15, Math.min(f[0], f[1]) * 0.8));
    return r + '</g>'; };
  items.forEach((it, i) => { if (it && !it.segs && !it.box && ['deck', 'turf', 'pathway'].includes(it.cat)) h += drawn(it, i); });
  // the parapet
  h += `<polygon points="${poly}" fill="none" stroke="#9B8E7E" stroke-width="${E * 2}" stroke-linejoin="miter" clip-path="url(#p2clipo)"/><clipPath id="p2clipo"><polygon points="${poly}"/></clipPath>`;
  // parapet screens
  items.forEach((it, i) => { if (it && it.segs) h += `<g data-it="${i}" class="${gcl(i)}">` + it.segs.map(g => `<path d="M${g.x0} ${g.z0}L${g.x1} ${g.z1}" stroke="${GR.includes(i) ? '#C26445' : '#8B6A43'}" stroke-width="${s * 0.55}" stroke-linecap="round"/>`).join('') + '</g>'; });
  // roof structures
  (t.blocks || []).forEach((b, i) => { const on = sel.k === 'blk' && sel.i === i; let lab = Math.max(s * 0.9, Math.min(s * 1.7, Math.min(b.w, b.d) * 0.32));
    h += `<g data-blk="${i}"><rect x="${b.x}" y="${b.z}" width="${b.w}" height="${b.d}" rx="0.2" fill="${b.type === 'ac' ? '#BFD9E6' : b.type === 'shaft' ? '#9C958A' : b.type === 'mumty' ? '#CFC7BA' : b.type === 'troom' ? '#DCE9DF' : '#D6D2C7'}" stroke="${on ? '#C26445' : '#6F665A'}" stroke-width="${on ? s * 0.3 : s * 0.12}"${b.type === 'troom' ? ` stroke-dasharray="${s * 0.6} ${s * 0.4}"` : ''}/>`;
    if (b.type === 'mumty' || b.type === 'room' || b.type === 'lift' || b.type === 'troom') { const dr = b.door || 'front', dw = Math.min(3, (dr === 'front' || dr === 'back' ? b.w : b.d) * 0.5);
      h += dr === 'front' || dr === 'back' ? `<rect x="${b.x + (b.w - dw) / 2}" y="${dr === 'front' ? b.z + b.d - 0.25 : b.z - 0.05}" width="${dw}" height="0.3" fill="#8B5A2B"/>` : `<rect x="${dr === 'right' ? b.x + b.w - 0.25 : b.x - 0.05}" y="${b.z + (b.d - dw) / 2}" width="0.3" height="${dw}" fill="#8B5A2B"/>`; }
    if (b.type !== 'ac') { let nm = b.pent ? 'Penthouse' : b.w >= 5 ? NAME[b.type] || '' : ''; if (nm) { lab = Math.min(lab, b.w * 0.86 / (nm.length * 0.58 + 1.3)); if (lab < s * 0.55) nm = ''; } const ix = b.x + b.w / 2 - (nm ? nm.length * lab * 0.29 + lab * 0.1 : 0); h += icoG(b.type === 'room' && b.pent ? 'cabin' : b.type === 'troom' ? 'room' : b.type, ix, b.z + b.d / 2, lab * 1.1) + (nm ? `<text x="${ix + lab * 0.75}" y="${b.z + b.d / 2}" font-size="${lab}" class="p2lb" style="text-anchor:start">${nm}</text>` : ''); }
    h += '</g>'; });
  // the things that stand on it (pergolas last, as an outline over what is under them)
  items.forEach((it, i) => { if (it && !it.segs && !it.box && it.mode !== 'mst' && !['deck', 'turf', 'pathway', 'pergola'].includes(it.cat)) h += drawn(it, i); });
  items.forEach((it, i) => { if (it && !it.segs && !it.box && it.cat === 'pergola') h += drawn(it, i); });
  // road + north
  const rd = opts.road || ['front'], lt = (x, y, tx, r) => `<text x="${x}" y="${y}" font-size="${s * 1.2}" class="p2lb" style="fill:#8a3a1f"${r ? ` transform="rotate(${r} ${x} ${y})"` : ''}>${tx}</text>`;
  rd.forEach(sd => { h += sd === 'front' ? lt(pw / 2, pd + M - s * 1.1, '▼ ROAD') : sd === 'back' ? lt(pw / 2, -M + s * 1.1, '▲ ROAD') : sd === 'left' ? lt(-M + s * 1.1, pd / 2, '◀ ROAD', -90) : lt(pw + M - s * 1.1, pd / 2, 'ROAD ▶', 90); });
  if (opts.north && NORTHV[opts.north]) { const v = NORTHV[opts.north], cx = pw + M - s * 2.2, cy = -M + s * 2.2, r = s * 1.6;
    h += `<g><circle cx="${cx}" cy="${cy}" r="${r * 1.15}" fill="#fff" stroke="#3A3530" stroke-width="${s * 0.08}"/><path d="M${cx + v[0] * r} ${cy + v[1] * r}L${cx - v[1] * r * 0.45 - v[0] * r * 0.5} ${cy + v[0] * r * 0.45 - v[1] * r * 0.5}L${cx + v[1] * r * 0.45 - v[0] * r * 0.5} ${cy - v[0] * r * 0.45 - v[1] * r * 0.5}Z" fill="#C26445"/>` +
      `<text x="${cx + v[0] * r * 1.75}" y="${cy + v[1] * r * 1.75}" font-size="${s * 1.1}" class="p2lb">N</text></g>`; }
  if (opts.measure) h += dims(t, items, s);
  if (opts.wl != null && items[opts.wl] && !items[opts.wl].segs) { const it = items[opts.wl], f = foot(it), x = +it.x, z = +it.z, tw = (+it.rot || 0) % 180 === 0;   // 254: which side is W and which is L, on the plan itself
    const W = opts.wlab ? opts.wlab[0] : 'W ' + f1(+it.w) + "'", L = opts.wlab ? opts.wlab[1] : 'L ' + f1(+it.d) + "'";   // 259: a cabin's arrows say its own L × W (= the size panel)
    h += tw ? dim(x, z, x + f[0], z, s * 2, W, s * 0.95) + dim(x + f[0], z, x + f[0], z + f[1], -s * 2, L, s * 0.95) : dim(x, z, x + f[0], z, s * 2, L, s * 0.95) + dim(x + f[0], z, x + f[0], z + f[1], -s * 2, W, s * 0.95); }
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

// 261 (owner): sofa sets made of the pieces the customer ticks — single / 2 / 3 seater, L (5 seater), U (7 seater); one or more
export const SOFA_OPTS = [['1', 'Single seater'], ['2', '2 seater'], ['3', '3 seater'], ['5', 'L · 5 seater'], ['7', 'U · 7 seater']];
const SEAT = 2.2, SD = 2.6, GAP = 1.4;
const sLen = n => n === 1 ? 2.8 : n * SEAT + 0.5;
export function sofaLayout(conf) {
  const C = (Array.isArray(conf) && conf.length ? conf : ['5']).map(String), mods = [], loose = [];
  const base = C.includes('7') ? '7' : C.includes('5') ? '5' : null; if (base) { mods.push({ n: 3, pos: 'back' }, { n: 2, pos: 'right', att: true }); if (base === '7') mods.push({ n: 2, pos: 'left', att: true }); }
  C.forEach((k, i) => { if (k === base && C.indexOf(k) === i) return; if (k === '5') loose.push(3, 2); else if (k === '7') loose.push(3, 2, 2); else loose.push(+k); });
  loose.sort((a, b) => b - a); const used = new Set(mods.map(m => m.pos)), order = ['back', 'front', 'right', 'left'];
  loose.forEach(n => { const p = order.find(o => !used.has(o)); if (p) { used.add(p); mods.push({ n, pos: p }); } else mods.push({ n, pos: 'extra' }); });
  const back = mods.find(m => m.pos === 'back'), arms = mods.filter(m => m.att).length, td = 2, P = [];
  const tw = Math.max(3, Math.min(5, (back ? sLen(back.n) : 5) * 0.55)), bl = back ? Math.max(sLen(back.n), arms ? arms * SD + tw + 2 * 1.2 : 0) : 0; if (back) back.len = bl;   // an L / U: room for the table between the arms
  const tx = arms === 1 ? -SD / 2 : 0;
  const zb = -(td / 2 + GAP + SD / 2), xr = tw / 2 + GAP + SD / 2;
  let ex = 0; mods.forEach(m => { const L = m.len || sLen(m.n);
    if (m.pos === 'back') P.push({ n: m.n, len: L, x: 0, z: zb, ry: 0 });
    else if (m.pos === 'front') P.push({ n: m.n, len: L, x: 0, z: -zb, ry: Math.PI });
    else if (m.pos === 'right') P.push(m.att ? { n: m.n, len: L, x: bl / 2 - SD / 2, z: zb + SD / 2 + L / 2, ry: -Math.PI / 2 } : { n: m.n, len: L, x: xr, z: 0, ry: -Math.PI / 2 });
    else if (m.pos === 'left') P.push(m.att ? { n: m.n, len: L, x: -bl / 2 + SD / 2, z: zb + SD / 2 + L / 2, ry: Math.PI / 2 } : { n: m.n, len: L, x: -xr, z: 0, ry: Math.PI / 2 });
    else { P.push({ n: m.n, len: L, x: -zb + SD + 0.6 + ex, z: -zb + SD, ry: Math.PI }); ex += L + 0.5; } });
  const bb = P.map(p => { const sw = Math.abs(Math.cos(p.ry)) > 0.5, hw = (sw ? p.len : SD) / 2, hd = (sw ? SD : p.len) / 2; return [p.x - hw, p.z - hd, p.x + hw, p.z + hd]; }).concat([[tx - tw / 2, -td / 2, tx + tw / 2, td / 2]]);
  const x0 = Math.min(...bb.map(b => b[0])), z0 = Math.min(...bb.map(b => b[1])), x1 = Math.max(...bb.map(b => b[2])), z1 = Math.max(...bb.map(b => b[3])), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  return { w: Math.round((x1 - x0) * 2) / 2, d: Math.round((z1 - z0) * 2) / 2, table: { w: tw, d: td, x: tx - cx, z: -cz }, pieces: P.map(p => Object.assign(p, { x: p.x - cx, z: p.z - cz })), seats: P.reduce((a, p) => a + p.n, 0) }; }
export function sofaSvg(conf, opt) {   // a line drawing of the set (top view), for the question screen and the 2D plan
  const L = sofaLayout(conf), m = 0.6, vb = `${-L.w / 2 - m} ${-L.d / 2 - m} ${L.w + 2 * m} ${L.d + 2 * m}`; let g = '';
  L.pieces.forEach(p => { const n = Math.max(1, p.n); let u = `<rect x="${-p.len / 2}" y="${-SD / 2}" width="${p.len}" height="${SD}" rx="0.35"/><line x1="${-p.len / 2 + 0.3}" y1="${-SD / 2 + 0.55}" x2="${p.len / 2 - 0.3}" y2="${-SD / 2 + 0.55}"/>`;
    for (let k = 1; k < n; k++) { const x = -p.len / 2 + 0.25 + (p.len - 0.5) * k / n; u += `<line x1="${x}" y1="${-SD / 2 + 0.55}" x2="${x}" y2="${SD / 2 - 0.15}"/>`; }
    g += `<g transform="translate(${p.x} ${p.z}) rotate(${-p.ry * 180 / Math.PI})">${u}</g>`; });
  g += `<rect x="${L.table.x - L.table.w / 2}" y="${L.table.z - L.table.d / 2}" width="${L.table.w}" height="${L.table.d}" rx="0.2" stroke-dasharray="0.25 0.18"/>`;
  return opt === 'g' ? g : `<svg viewBox="${vb}" class="sofath" fill="none" stroke="currentColor" stroke-width="0.12" stroke-linejoin="round" aria-hidden="true">${g}</svg>`; }
// 262: a cabin's own floor area (its footprint minus the plinth / projections, ex in the cabin's own frame turned to the plan)
export function cabBody(it) { const e = it.ex || {}, r = +it.rot || 0, f = foot(it), w = (s => { const a = r * Math.PI / 180, c = Math.round(Math.cos(a)), n = Math.round(Math.sin(a)); return v => [v[0] * c - v[1] * n, v[0] * n + v[1] * c]; })(), ex = { left: 0, right: 0, back: 0, front: 0 };
  [['l', [-1, 0]], ['r', [1, 0]], ['b', [0, -1]], ['f', [0, 1]]].forEach(([k, v]) => { const q = w(v), sd = q[1] > 0 ? 'front' : q[1] < 0 ? 'back' : q[0] < 0 ? 'left' : 'right'; ex[sd] = +e[k] || 0; });
  return { x: +it.x + ex.left, z: +it.z + ex.back, w: f[0] - ex.left - ex.right, d: f[1] - ex.back - ex.front }; }
