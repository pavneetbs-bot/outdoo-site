// outrr design studio — feature walls (296, owner): every one of the 68 designs drawn from its parts ("zones"), so it keeps its look
// at any width × height and every part's finish follows the customer's pick (Finish · Wall texture / Fluted panels / Stone-look
// panels / Stacked stone / Jaali / WPC jaali / Garden / Metal trims). Lights (cove / up-lights / backlit parts), extras (planter
// at the foot, house number, water spill) and "Complete the look" pieces (plants, planters, sculptures) are drawn too.
// Setting by the design's place: entrance = a house front with a door beside it, terrace / café = a 10 ft wall on grey tiles,
// garden = free-standing on a lawn, cabin = the wall of a small room. Units: feet, y up, the wall's face looks at +z.
import * as THREE from './vendor/three/three.module.min.js';
import { studioFloor, person } from './studio3d.js?v=3';

const M = {}, T = {};
const mt = (k, o) => M[k] || (M[k] = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.8 }, o)));
function bx(g, w, h, d, x, y, z, m, sh = true) { const b = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.01, w), Math.max(0.01, h), Math.max(0.01, d)), m); b.position.set(x, y, z); b.castShadow = sh; b.receiveShadow = true; g.add(b); return b; }
function cy(g, r1, r2, h, x, y, z, m, seg = 16) { const c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m); c.position.set(x, y, z); c.castShadow = true; c.receiveShadow = true; g.add(c); return c; }
function ctex(k, px, draw) { if (T[k]) return T[k]; const cv = document.createElement('canvas'); cv.width = cv.height = px; draw(cv.getContext('2d'), px); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return (T[k] = t); }
function rnd(s) { let x = s; return () => (x = (x * 16807) % 2147483647) / 2147483647; }
const hex = c => '#' + new THREE.Color(c).getHexString();

// colours of each finish choice (names as in the "Finish · …" groups)
const TEX = { sand: 0xE3D3B6, terracotta: 0xC2643F, charcoal: 0x4A4744, olive: 0x6E7A55, concrete: 0xBDB7AD, white: 0xEEEAE2 };
const TEXN = { 'Sand beige': 'sand', 'Terracotta': 'terracotta', 'Charcoal': 'charcoal', 'Olive green': 'olive', 'Concrete grey': 'concrete', 'Off-white': 'white' };
const FLU = { teak: 0xA86F45, walnut: 0x6B4530, ash: 0xA8A196, charcoal: 0x3A3735 };
const FLUN = { 'Teak': 'teak', 'Walnut': 'walnut', 'Ash grey': 'ash', 'Charcoal': 'charcoal', 'Aluminium fluted, wood-grain finish': null };
const HPLN = { 'White marble': 'wm', 'Beige marble': 'bm', 'Black granite': 'bg', 'Oak wood': 'oak' };
const STON = { 'Sandstone, warm': 'sand', 'Slate grey': 'slate' };
const JAL = { black: 0x1E1E1E, charcoal: 0x2F2F31, corten: 0x8A4A26, gold: 0xC9A45C, bronze: 0x7A5A3A, teak: 0xA86F45, walnut: 0x6B4530, ash: 0xA8A196, ss: 0xC4C7CA };
const JALN = { 'Black': 'black', 'Corten (rust)': 'corten', 'Champagne gold': 'gold', 'Bronze': 'bronze', 'Stainless steel 304 jaali': 'ss' };
const WJN = { 'Teak': 'teak', 'Walnut': 'walnut', 'Ash grey': 'ash' };
const METN = { 'Black': 'black', 'Bronze': 'bronze', 'Champagne gold': 'gold' };

// the 68 designs: zones [kind, x0, x1, y0, y1, colour / type, opts] in fractions of width / height (y from the floor).
// kinds: tex, flute, hpl (wm / bm / bg / oak), stone (sand / slate), jaali (+ glow), wjaali, garden, glow, arch (lit arch niche),
// niche (lit recess), slab (floating marble with a halo), and the line work: fins, tubes, lines (horizontal metal), llines (light
// lines), grid (tube grid), frame (metal frame round a box), cove (top light), up (up-lights at the foot), grid2 (shadow-gap grid), louvre.
const R = {
  'FW-AC': [['stone', 0, 1, 0, 1, 'sand'], ['arch', .12, .32, .1, .78], ['arch', .4, .6, .1, .78], ['arch', .68, .88, .1, .78]],
  'FW-AJ': [['hpl', 0, 1, 0, 1, 'bg'], ['jaali', .28, .72, .05, .88, 'gold', { glow: 1, arch: 1 }], ['frame', .28, .72, .05, .88, 'gold', { arch: 1 }]],
  'FW-AN': [['tex', 0, 1, .3, 1, 'sand'], ['flute', 0, 1, 0, .3, 'walnut'], ['niche', .12, .32, .32, .92], ['niche', .4, .6, .32, .92], ['niche', .68, .88, .32, .92]],
  'FW-AR': [['tex', 0, 1, 0, 1, 'sand'], ['arch', .28, .72, .05, .86, null, { rim: 'wm' }], ['garden', .3, .7, 0, .12]],
  'FW-BF': [['hpl', 0, 1, 0, 1, 'bg'], ['fins', .08, .92, 0, 1, 'gold', { n: 6 }], ['up', .08, .92, 0, 0, null, { n: 6 }]],
  'FW-BG': [['tex', 0, 1, 0, 1, 'white'], ['flute', 0, .2, 0, 1, 'walnut'], ['flute', .8, 1, 0, 1, 'walnut'], ['garden', .24, .76, .06, .9], ['frame', .24, .76, .06, .9, 'bronze', { deep: 1 }], ['cove', .24, .76, .9, .9]],
  'FW-BL': [['tex', 0, 1, 0, 1, 'charcoal'], ['lines', .1, .9, 0, 1, 'gold', { ys: [.22, .46, .5, .78], xs: [[.15, .9], [.05, .95], [.1, .85], [.2, .95]] }]],
  'FW-BM': [['hpl', 0, .495, 0, 1, 'wm'], ['hpl', .505, 1, 0, 1, 'wm'], ['glow', .495, .505, 0, 1], ['cove', 0, 1, 1, 1], ['cove', 0, 1, 0, 0, null, { low: 1 }]],
  'FW-CG': [['tex', 0, 1, 0, 1, 'charcoal'], ['llines', 0, 1, 0, 1, null, { ys: [.3, .55, .8], groove: 1 }]],
  'FW-CJ': [['tex', 0, 1, 0, 1, 'charcoal'], ['jaali', .1, .9, .18, .95, 'corten', { glow: 1, cell: 'arch' }], ['garden', 0, 1, 0, .18, null, { bed: 1 }], ['up', .15, .85, .18, .18, null, { n: 4 }]],
  'FW-CL': [['flute', 0, .38, 0, 1, 'walnut'], ['stone', .38, .75, 0, 1, 'slate'], ['garden', .75, 1, 0, 1], ['lines', .38, .75, 0, 1, 'gold', { ys: [.35, .65] }], ['cove', 0, 1, 1, 1]],
  'FW-CS': [['tex', 0, 1, .55, 1, 'white'], ['hpl', 0, 1, .4, .55, 'bg'], ['flute', 0, 1, 0, .4, 'ash']],
  'FW-ET': [['tex', 0, .38, 0, 1, 'olive'], ['flute', .38, .7, 0, 1, 'walnut'], ['garden', .7, .92, 0, 1], ['tex', .92, 1, 0, 1, 'olive']],
  'FW-FGL': [['flute', 0, .6, 0, 1, 'teak'], ['garden', .62, .85, 0, 1], ['flute', .87, 1, 0, 1, 'teak'], ['llines', 0, 1, 0, 1, null, { xv: [.61, .86] }]],
  'FW-FS': [['flute', 0, .67, 0, 1, 'teak'], ['tex', .67, 1, 0, 1, 'sand']],
  'FW-FS2': [['flute', 0, 1, 0, 1, 'ash'], ['slab', .2, .8, .14, .86, 'bm']],
  'FW-GB': [['flute', 0, 1, .86, 1, 'ash'], ['stone', 0, 1, 0, .86, 'slate'], ['garden', .3, .65, 0, .86]],
  'FW-GE': [['flute', 0, .25, 0, 1, 'walnut'], ['flute', .75, 1, 0, 1, 'walnut'], ['hpl', .25, .75, 0, 1, 'wm'], ['jaali', .36, .64, .25, .75, 'black', { glow: 1 }], ['cove', 0, 1, 1, 1]],
  'FW-GF': [['garden', 0, .5, 0, 1], ['flute', .5, 1, 0, 1, 'teak']],
  'FW-GG': [['garden', 0, 1, 0, 1], ['grid', 0, 1, 0, 1, 'black', { c: 3, r: 3 }]],
  'FW-GP': [['tex', 0, 1, 0, 1, 'concrete'], ['garden', .3, .7, .08, .9]],
  'FW-GW': [['tex', 0, 1, 0, 1, 'sand'], ['garden', .25, .75, .2, .8], ['frame', .25, .75, .2, .8, 'gold', { thin: 1 }], ['cove', .25, .75, .8, .8]],
  'FW-GZ': [['flute', 0, 1, .17, 1, 'walnut'], ['hpl', 0, 1, 0, .17, 'wm'], ['cove', 0, 1, 1, 1], ['llines', 0, 1, 0, 1, null, { ys: [.17] }]],
  'FW-JB': [['tex', 0, 1, .6, 1, 'terracotta'], ['jaali', 0, 1, .38, .6, 'black', { glow: 1 }], ['flute', 0, 1, 0, .38, 'teak']],
  'FW-JBL': [['hpl', 0, 1, 0, 1, 'bg'], ['jaali', .18, .82, .1, .9, 'gold', { glow: 1, cell: 'arch' }], ['frame', .18, .82, .1, .9, 'gold', { thin: 1 }]],
  'FW-JD': [['tex', 0, 1, 0, 1, 'white'], ['wjaali', .1, .9, .1, .9, 'teak', { glow: 1 }], ['jaali', .16, .84, .16, .84, 'charcoal', { front: 1 }]],
  'FW-JF': [['tex', 0, 1, .82, 1, 'sand'], ['flute', 0, .3, 0, .82, 'teak'], ['flute', .7, 1, 0, .82, 'teak'], ['tex', .3, .7, 0, .82, 'terracotta'], ['jaali', .33, .67, .05, .79, 'black']],
  'FW-JGS': [['hpl', 0, 1, 0, .25, 'bg'], ['jaali', .02, .98, .25, 1, 'corten', { cell: 'arch' }], ['tubes', 0, 1, 0, 1.04, 'bronze', { xs: [0, 1], post: 1 }]],
  'FW-JP': [['hpl', 0, 1, 0, 1, 'wm'], ['jaali', .1, .25, .05, .95, 'black', { glow: 1 }], ['jaali', .32, .47, .05, .95, 'black', { glow: 1 }], ['jaali', .53, .68, .05, .95, 'black', { glow: 1 }], ['jaali', .75, .9, .05, .95, 'black', { glow: 1 }], ['up', .1, .9, 0, 0, null, { n: 4 }]],
  'FW-JS': [['tex', 0, 1, 0, 1, 'terracotta'], ['jaali', .12, .88, .08, .92, 'charcoal', { off: 1 }]],
  'FW-JT': [['hpl', 0, 1, .2, 1, 'wm'], ['garden', 0, 1, 0, .2], ['jaali', .15, .35, .3, .9, 'black', { glow: 1 }], ['jaali', .4, .6, .3, .9, 'black', { glow: 1 }], ['jaali', .65, .85, .3, .9, 'black', { glow: 1 }]],
  'FW-JW': [['garden', 0, .72, 0, 1], ['wjaali', 0, .72, 0, 1, 'teak', { front: 1 }], ['flute', .74, 1, 0, 1, 'ash']],
  'FW-LF': [['hpl', 0, 1, 0, .2, 'bg'], ['garden', 0, .45, .2, 1], ['tex', .45, 1, .2, 1, 'charcoal'], ['jaali', .5, .96, .24, .96, 'gold', { glow: 1, cell: 'arch' }]],
  'FW-LS': [['garden', 0, .5, 0, 1], ['flute', .5, 1, 0, 1, 'teak'], ['tubes', 0, 1, 0, 1.03, 'black', { xs: [0, 1], post: 1 }]],
  'FW-LV': [['hpl', 0, 1, 0, .17, 'bg'], ['louvre', 0, 1, .17, 1, 'walnut', { glow: 1 }], ['cove', 0, 1, 1, 1]],
  'FW-MF': [['flute', 0, .25, 0, 1, 'walnut'], ['hpl', .25, .75, 0, 1, 'wm'], ['flute', .75, 1, 0, 1, 'walnut']],
  'FW-MF2': [['hpl', 0, 1, .25, 1, 'bm'], ['flute', 0, 1, 0, .25, 'walnut'], ['fins', .1, .9, .05, .95, 'black', { n: 6 }]],
  'FW-ML': [['hpl', 0, .72, 0, 1, 'bm'], ['flute', .72, 1, 0, 1, 'walnut'], ['llines', 0, .72, 0, 1, null, { ys: [.55, .72, .85] }]],
  'FW-MM': [['tex', 0, .55, .25, 1, 'terracotta'], ['hpl', 0, .55, 0, .25, 'bg'], ['flute', .55, 1, 0, 1, 'teak'], ['llines', 0, 1, 0, 1, null, { xv: [.55] }]],
  'FW-MO': [['hpl', 0, 1, 0, 1, 'bg'], ['glow', .45, .55, .1, .9, null, { bronze: 1 }]],
  'FW-NG': [['garden', 0, 1, .17, 1], ['hpl', 0, 1, 0, .17, 'bg'], ['fins', .08, .92, .17, 1, 'bronze', { n: 6 }], ['up', .08, .92, .17, .17, null, { n: 6 }]],
  'FW-OG': [['tex', 0, 1, 0, 1, 'charcoal'], ['grid2', 0, 1, 0, .97, 'oak', { c: 4, r: 2 }], ['cove', 0, 1, 1, 1]],
  'FW-PN': [['tex', 0, 1, .25, 1, 'terracotta'], ['flute', 0, 1, 0, .25, 'teak'], ['niche', .1, .45, .3, .86, null, { garden: 1 }], ['niche', .55, .9, .3, .86, null, { garden: 1 }]],
  'FW-SB': [['tex', 0, 1, 0, 1, 'sand'], ['hpl', 0, 1, .45, .65, 'bg']],
  'FW-SF': [['stone', 0, .65, 0, 1, 'slate'], ['flute', .65, 1, 0, 1, 'teak'], ['up', .08, .58, 0, 0, null, { n: 4 }]],
  'FW-SG': [['flute', 0, .12, 0, 1, 'walnut'], ['garden', .12, .28, 0, 1], ['hpl', .28, .8, 0, 1, 'wm'], ['jaali', .4, .68, .2, .8, 'black', { glow: 1 }], ['tex', .8, 1, 0, 1, 'charcoal'], ['tubes', .84, .98, 0, 1, 'black', { n: 3 }], ['cove', 0, 1, 1, 1]],
  'FW-SM': [['tex', 0, 1, 0, 1, 'charcoal'], ['grid2', 0, 1, 0, .97, 'wm', { c: 3, r: 3 }], ['cove', 0, 1, 1, 1]],
  'FW-SN': [['stone', 0, 1, 0, 1, 'sand'], ['garden', .1, .5, .12, .88], ['tubes', .6, .9, 0, 1, 'bronze', { n: 4 }]],
  'FW-SP': [['stone', 0, .2, 0, 1, 'slate'], ['stone', .8, 1, 0, 1, 'slate'], ['hpl', .2, .8, 0, 1, 'wm'], ['jaali', .3, .7, .18, .8, 'black', { glow: 1 }], ['llines', .2, .8, 0, 1, null, { ys: [.88] }]],
  'FW-SW': [['tex', 0, 1, .78, 1, 'white'], ['flute', 0, .33, 0, .78, 'teak', { dz: .25 }], ['flute', .33, .67, 0, .78, 'teak', { dz: .1 }], ['flute', .67, 1, 0, .78, 'teak', { dz: .4 }], ['llines', 0, 1, 0, .78, null, { xv: [.33, .67] }]],
  'FW-SX': [['flute', 0, .28, 0, 1, 'walnut'], ['hpl', .28, .7, 0, 1, 'wm'], ['jaali', .35, .62, .2, .8, 'black', { glow: 1 }], ['garden', .7, 1, 0, 1], ['lines', .28, .7, 0, 1, 'gold', { ys: [.1, .9] }], ['cove', 0, 1, 1, 1]],
  'FW-TA': [['garden', 0, .4, 0, 1], ['tex', .4, 1, 0, 1, 'concrete'], ['tubes', .5, .95, 0, 1, 'black', { n: 4 }], ['up', .5, .95, 0, 0, null, { n: 4 }]],
  'FW-TR': [['tex', 0, 1, 0, 1, 'concrete'], ['tubes', .04, .96, 0, 1, 'black', { xs: [.04, .1, .2, .34, .5, .68, .9] }]],
  'FW-TT': [['tex', 0, 1, 0, 1, 'terracotta'], ['flute', .45, .85, .1, .9, 'teak'], ['frame', .45, .85, .1, .9, 'black']],
  'FW-TU': [['tex', 0, 1, 0, 1, 'concrete'], ['tubes', .08, .92, 0, 1, 'black', { n: 5 }], ['up', .08, .92, 0, 0, null, { n: 5 }]],
  'FW-VP': [['hpl', 0, .25, 0, 1, 'bg'], ['hpl', .75, 1, 0, 1, 'bg'], ['hpl', .25, .75, 0, 1, 'wm'], ['jaali', .32, .68, .15, .85, 'black', { glow: 1 }], ['lines', 0, 1, 0, 1, 'gold', { xv: [.25, .75] }]],
  'FW-WG': [['hpl', 0, .42, 0, 1, 'oak'], ['tex', .42, 1, 0, 1, 'sand'], ['garden', .5, .92, .1, .85]],
  'FW-WJ': [['tex', 0, 1, .33, 1, 'white'], ['wjaali', 0, 1, .33, 1, 'teak', { front: 1 }], ['flute', 0, 1, 0, .33, 'ash']],
};
['CJ', 'GG', 'JF', 'JS', 'JW', 'LV', 'NG', 'SN', 'TU', 'WJ'].forEach(k => { R['FW-' + k + '-FS'] = R['FW-' + k]; });
export const FW_RECIPES = R;

// textures
function fluteTex(c) { return ctex('fl' + c, 128, (g, n) => { for (let x = 0; x < n; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0), b = new THREE.Color(c); gr.addColorStop(0, hex(b.clone().multiplyScalar(.6))); gr.addColorStop(.5, hex(b.clone().multiplyScalar(1.12))); gr.addColorStop(1, hex(b.clone().multiplyScalar(.6))); g.fillStyle = gr; g.fillRect(x, 0, 16, n); } }); }
function hplTex(t) {
  if (t === 'oak') return ctex('hpl_oak', 256, (g, n) => { const r = rnd(5); g.fillStyle = '#C49A6C'; g.fillRect(0, 0, n, n); g.strokeStyle = 'rgba(110,70,35,.25)'; for (let i = 0; i < 40; i++) { g.lineWidth = .5 + r() * 2; g.beginPath(); const x = r() * n; g.moveTo(x, 0); g.bezierCurveTo(x + 10, n / 3, x - 10, n * 2 / 3, x + r() * 8, n); g.stroke(); } });
  if (t === 'bg') return ctex('hpl_bg', 256, (g, n) => { const r = rnd(9); g.fillStyle = '#1F1F20'; g.fillRect(0, 0, n, n); for (let i = 0; i < 1600; i++) { g.fillStyle = ['#3A3A3A', '#555', '#111', '#6B6B6B', '#2A2A2A'][Math.floor(r() * 5)]; g.fillRect(r() * n, r() * n, 1 + r() * 2, 1 + r() * 2); } });
  const base = t === 'bm' ? '#E7D7BC' : '#F1EEE8', vein = t === 'bm' ? 'rgba(150,115,70,.35)' : 'rgba(120,120,125,.3)';
  return ctex('hpl_' + t, 256, (g, n) => { const r = rnd(t === 'bm' ? 13 : 17); g.fillStyle = base; g.fillRect(0, 0, n, n); g.strokeStyle = vein; for (let i = 0; i < 9; i++) { g.lineWidth = .6 + r() * 2.2; g.beginPath(); g.moveTo(r() * n, 0); g.bezierCurveTo(r() * n, n / 3, r() * n, n * 2 / 3, r() * n, n); g.stroke(); } });
}
function stoneTex(t) { const P = t === 'slate' ? ['#4E4B48', '#5F5B57', '#3E3B39', '#6E6A65', '#565250'] : ['#C9AE84', '#B89A6E', '#D8C29C', '#A88A60', '#CFB58C']; return ctex('st' + t, 256, (g, n) => { const r = rnd(t === 'slate' ? 3 : 7); g.fillStyle = '#5A5550'; g.fillRect(0, 0, n, n); for (let y = 0; y < n; y += 16) { let x = -r() * 50; while (x < n) { const w = 28 + r() * 70; g.fillStyle = P[Math.floor(r() * P.length)]; g.fillRect(x, y, w - 3, 13); x += w; } } }); }
function jaaliTex(c, cell) { return ctex('ja' + c + (cell || ''), 256, (g, n) => { g.clearRect(0, 0, n, n); g.fillStyle = hex(c); g.fillRect(0, 0, n, n); g.globalCompositeOperation = 'destination-out'; const s = n / 8;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const cx = x * s + s / 2, cy2 = y * s + s / 2; g.beginPath(); if (cell === 'arch') { g.moveTo(cx - s * .28, cy2 + s * .34); g.lineTo(cx - s * .28, cy2 - s * .05); g.quadraticCurveTo(cx, cy2 - s * .5, cx + s * .28, cy2 - s * .05); g.lineTo(cx + s * .28, cy2 + s * .34); } else { g.moveTo(cx, cy2 - s * .36); g.lineTo(cx + s * .36, cy2); g.lineTo(cx, cy2 + s * .36); g.lineTo(cx - s * .36, cy2); } g.closePath(); g.fill(); } }); }
function gridTex(c) { return ctex('wj' + c, 256, (g, n) => { g.clearRect(0, 0, n, n); g.fillStyle = hex(c); const s = n / 6; for (let i = 0; i <= 6; i++) { g.fillRect(i * s - 5, 0, 10, n); g.fillRect(0, i * s - 5, n, 10); } }); }
function gardenTex() { return ctex('garden', 256, (g, n) => { const r = rnd(21); g.fillStyle = '#3F6B2E'; g.fillRect(0, 0, n, n); for (let i = 0; i < 900; i++) { g.fillStyle = ['#4E8236', '#3A6229', '#5E9A42', '#2F5222', '#6FAE4E', '#7A9E3C'][Math.floor(r() * 6)]; g.beginPath(); g.ellipse(r() * n, r() * n, 3 + r() * 7, 2 + r() * 4, r() * 3, 0, 7); g.fill(); } }); }
const repeatOf = (t, w, h, per) => { const c = t.clone(); c.needsUpdate = true; c.repeat.set(Math.max(.2, w / per[0]), Math.max(.2, h / per[1])); return c; };
const GLOW = () => mt('glow', { color: 0xF0B66C, emissive: 0xE59A45, emissiveIntensity: .6, roughness: .5 });

function zoneMat(k, c, w, h, P) {
  if (k === 'tex') return mt('tex' + c, { color: TEX[c] || TEX.sand, roughness: .95 });
  if (k === 'flute') return P.aluFlute ? new THREE.MeshStandardMaterial({ map: repeatOf(fluteTex(FLU[c] || FLU.teak), w, h, [1.4, 4]), metalness: .35, roughness: .4 }) : new THREE.MeshStandardMaterial({ map: repeatOf(fluteTex(FLU[c] || FLU.teak), w, h, [1.4, 4]), roughness: .6 });
  if (k === 'hpl') return new THREE.MeshStandardMaterial({ map: repeatOf(hplTex(c), w, h, c === 'bg' ? [3, 3] : [4, 8]), roughness: P.realStone ? .18 : .3 });
  if (k === 'stone') return new THREE.MeshStandardMaterial({ map: repeatOf(stoneTex(c), w, h, [5, 5]), roughness: .95 });
  if (k === 'garden') return new THREE.MeshStandardMaterial({ map: repeatOf(gardenTex(), w, h, [3, 3]), roughness: .9 });
  return mt('def', { color: 0xCCCCCC });
}

// the picks → which colour every part takes ("As designed" keeps the recipe's own)
export function fwPicks(groups) {
  const g = groups || {}, P = {}, pick = n => g['Finish · ' + n] || '';
  P.tex = TEXN[pick('Wall texture')] || null; P.flute = FLUN[pick('Fluted panels')] || null; P.aluFlute = /Aluminium/.test(pick('Fluted panels'));
  P.hpl = HPLN[pick('Stone-look panels')] || null; P.realStone = /Real granite/.test(pick('Stone-look panels'));
  P.stone = STON[pick('Stacked stone')] || null; P.jaali = JALN[pick('Jaali')] || null; P.wj = WJN[pick('WPC jaali')] || null; P.metal = METN[pick('Metal trims')] || null;
  P.living = /Real plants/.test(pick('Garden'));
  const L = g['Lights'] || ''; P.cove = /cove/i.test(L); P.up = /up-light/i.test(L);
  P.planter = /planter box/i.test(g['Extra · Planter at the foot'] || ''); P.number = /letters/i.test(g['Extra · House number / name'] || '') ? g['Extra · House number / name'] : ''; P.water = /water spill/i.test(g['Extra · Water spill'] || '');
  return P;
}

// the wall itself, W × H ft, its face at z = 0 looking at +z; back = a plain backing (free-standing ones get a texture back + base)
export function fwModel(code, W, H, P, free) {
  const g = new THREE.Group(), Z = R[code] || R['FW-FS'], D = .12, metal = c => mt('met' + c, { color: JAL[P.metal || c] || 0x222222, metalness: .75, roughness: .35 });
  bx(g, W, H, .35, 0, H / 2, -.18, mt('backing', { color: 0xD9D4CB, roughness: .95 }));                         // cement-board skin / frame
  if (free) { bx(g, W + .2, .25, 1.1, 0, .125, -.1, mt('base', { color: 0x2A2A2A, roughness: .6 })); }
  const X = f => -W / 2 + f * W, Y = f => f * H;
  for (const [k, x0, x1, y0, y1, c0, o = {}] of Z) {
    const w = (x1 - x0) * W, h = (y1 - y0) * H, cx = X((x0 + x1) / 2), cy2 = Y((y0 + y1) / 2);
    if (k === 'tex' || k === 'flute' || k === 'hpl' || k === 'stone' || k === 'garden') {
      const c = k === 'tex' ? (P.tex || c0) : k === 'flute' ? (P.flute || c0) : k === 'hpl' ? (P.hpl || c0) : k === 'stone' ? (P.stone || c0) : c0;
      const dz = o.dz || (k === 'garden' ? .25 : k === 'stone' ? .12 : .04) + (o.bed ? .9 : 0);
      bx(g, w, h, dz, cx, cy2, dz / 2, zoneMat(k, c, w, h, P));
      if (k === 'garden' && (P.living || o.bed)) { const r = rnd(Math.round(w * 13 + h * 7)), lm = mt('leaf', { color: 0x4F8A35, roughness: .8 });   // living wall: leaves stand out
        for (let i = 0; i < Math.min(160, w * h * 4); i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.12 + r() * .14, 6, 5), lm); s.scale.z = .5; s.position.set(cx - w / 2 + r() * w, cy2 - h / 2 + r() * h, dz + .02); g.add(s); } }
    } else if (k === 'jaali' || k === 'wjaali') {
      const col = k === 'jaali' ? JAL[P.jaali || c0] : JAL[P.wj || c0], t = k === 'jaali' ? jaaliTex(col, o.cell) : gridTex(col);
      const m = new THREE.MeshStandardMaterial({ map: repeatOf(t, w, h, [2, 2]), transparent: true, alphaTest: .4, side: THREE.DoubleSide, metalness: k === 'jaali' ? .5 : 0, roughness: .45 });
      const z = o.front ? .32 : o.off ? .3 : .16, ah = o.arch ? Math.min(w / 2, h * .4) : 0, rh = h - ah, ry = Y(y0) + rh / 2;   // an arched one = a straight part + a half-round top
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, rh), m); p.position.set(cx, ry, z); p.castShadow = true; g.add(p);
      if (ah) { const tp = new THREE.Mesh(new THREE.CircleGeometry(w / 2, 28, 0, Math.PI), m); tp.position.set(cx, Y(y0) + rh, z); g.add(tp); if (o.glow) { const tg = new THREE.Mesh(new THREE.CircleGeometry(w / 2 * .98, 28, 0, Math.PI), GLOW()); tg.position.set(cx, Y(y0) + rh, .05); g.add(tg); } }
      if (o.glow) bx(g, w * .98, rh * .98, .02, cx, ry, .05, GLOW(), false);
      else if (!o.front) bx(g, w, h, .02, cx, cy2, .05, mt('jback', { color: 0x2A2624, roughness: .9 }), false);
    } else if (k === 'glow') { bx(g, Math.max(w, .06), h, .06, cx, cy2, .04, o.bronze ? mt('bglow', { color: 0xE0A24E, emissive: 0xD98A2E, emissiveIntensity: 1.1 }) : GLOW(), false); if (o.bronze) { bx(g, w + .12, h + .12, .05, cx, cy2, .02, metal('bronze')); } }
    else if (k === 'arch' || k === 'niche') {
      const rim = o.rim ? zoneMat('hpl', o.rim, 1, 1, P) : mt('rim', { color: 0xEFE8DA, roughness: .7 });
      bx(g, w + .3, h + .15, .3, cx, cy2, .15, rim); bx(g, w, h, .02, cx, cy2, .31, o.garden ? GLOW() : GLOW(), false);
      if (k === 'arch') { const a = new THREE.Mesh(new THREE.CircleGeometry(w / 2, 24, 0, Math.PI), GLOW()); a.position.set(cx, cy2 + h / 2, .32); g.add(a); const ar = new THREE.Mesh(new THREE.RingGeometry(w / 2, w / 2 + .15, 24, 1, 0, Math.PI), rim); ar.position.set(cx, cy2 + h / 2, .33); g.add(ar); }
      if (o.garden) bx(g, w * .9, h * .45, .3, cx, cy2 - h * .25, .32, zoneMat('garden', null, w, h * .45, P));
    } else if (k === 'slab') { const m = zoneMat('hpl', P.hpl || c0, w, h, P); bx(g, w, h, .12, cx, cy2, .45, m); bx(g, w + .1, h + .1, .02, cx, cy2, .2, GLOW(), false); }
    else if (k === 'fins' || k === 'tubes') {
      const xs = o.xs || Array.from({ length: o.n || 5 }, (_, i) => x0 + (x1 - x0) * (o.n > 1 ? i / (o.n - 1) : .5));
      xs.forEach(f => { const x = X(f), hh = h; if (k === 'fins') bx(g, .1, hh, .35, x, cy2, .3, metal(c0)); else if (o.post) bx(g, .3, hh, .3, x, cy2, 0, metal(c0)); else cy(g, .09, .09, hh * .95, x, cy2, .3, metal(c0), 12); });
    } else if (k === 'lines') {
      (o.ys || []).forEach((yy, i) => { const sp = (o.xs && o.xs[i]) || [x0, x1]; bx(g, (sp[1] - sp[0]) * W, .05, .06, X((sp[0] + sp[1]) / 2), Y(yy), .1, metal(c0)); });
      (o.xv || []).forEach(xx => bx(g, .05, H, .06, X(xx), H / 2, .1, metal(c0)));
    } else if (k === 'llines') {
      (o.ys || []).forEach(yy => bx(g, w, o.groove ? .14 : .05, .05, cx, Y(yy), o.groove ? .01 : .08, GLOW(), false));
      (o.xv || []).forEach(xx => bx(g, .05, h, .05, X(xx), cy2, .08, GLOW(), false));
    } else if (k === 'frame' && o.arch) { const m = metal(c0), ah = Math.min(w / 2, h * .4), rh = h - ah; bx(g, .1, rh, .2, X(x0) - .05, Y(y0) + rh / 2, .2, m); bx(g, .1, rh, .2, X(x1) + .05, Y(y0) + rh / 2, .2, m); const ar = new THREE.Mesh(new THREE.TorusGeometry(w / 2 + .05, .06, 8, 32, Math.PI), m); ar.position.set(cx, Y(y0) + rh, .22); g.add(ar); }
    else if (k === 'frame') { const t = o.thin ? .08 : .22, m = metal(c0), dz = o.deep ? .55 : .3;
      bx(g, w + t * 2, t, dz, cx, Y(y1) + t / 2, dz / 2, m); bx(g, w + t * 2, t, dz, cx, Y(y0) - t / 2, dz / 2, m); if (!o.arch) { bx(g, t, h, dz, X(x0) - t / 2, cy2, dz / 2, m); bx(g, t, h, dz, X(x1) + t / 2, cy2, dz / 2, m); } else { bx(g, t, h * .7, dz, X(x0) - t / 2, Y(y0) + h * .35, dz / 2, m); bx(g, t, h * .7, dz, X(x1) + t / 2, Y(y0) + h * .35, dz / 2, m); } }
    else if (k === 'grid') { const m = metal(c0); for (let i = 0; i <= o.c; i++) bx(g, .2, h, .3, X(x0) + w * i / o.c, cy2, .35, m); for (let j = 0; j <= o.r; j++) bx(g, w, .2, .3, cx, Y(y0) + h * j / o.r, .35, m); }
    else if (k === 'grid2') { const c = P.hpl || c0; for (let i = 0; i < o.c; i++) for (let j = 0; j < o.r; j++) { const pw = w / o.c - .08, ph = h / o.r - .08; bx(g, pw, ph, .06, X(x0) + w * (i + .5) / o.c, Y(y0) + h * (j + .5) / o.r, .06, zoneMat('hpl', c, pw, ph, P)); } }
    else if (k === 'louvre') { const m = mt('lv' + (P.flute || c0), { color: FLU[P.flute || c0] || FLU.walnut, roughness: .6 }); const n = Math.max(8, Math.round(w / .3)); if (o.glow) bx(g, w, h, .02, cx, cy2, .03, GLOW(), false); for (let i = 0; i < n; i++) bx(g, .14, h, .45, X(x0) + w * (i + .5) / n, cy2, .28, m); }
    else if (k === 'cove') { if (P.coveOff) continue; bx(g, w, .1, .3, cx, o.low ? .05 : H + .05, .15, mt('cvh', { color: 0x2B2B2B })); bx(g, w * .98, .03, .03, cx, o.low ? .12 : H - .02, .28, GLOW(), false); }
    else if (k === 'up') { const n = o.n || 4; for (let i = 0; i < n; i++) { const x = X(x0 + (x1 - x0) * (n > 1 ? i / (n - 1) : .5)); cy(g, .12, .14, .18, x, Y(y0) + .09, .7, mt('upb', { color: 0x1A1A1A })); bx(g, .16, .02, .16, x, Y(y0) + .19, .7, GLOW(), false); } }
  }
  if (P.cove) { bx(g, W, .1, .32, 0, H + .05, .16, mt('cvh', { color: 0x2B2B2B })); bx(g, W * .98, .03, .03, 0, H - .02, .3, GLOW(), false); }
  if (P.up) { const n = Math.max(2, Math.round(W / 2)); for (let i = 0; i < n; i++) { const x = -W / 2 + W * (i + .5) / n; cy(g, .12, .14, .18, x, .09, .8, mt('upb', { color: 0x1A1A1A })); bx(g, .16, .02, .16, x, .19, .8, GLOW(), false); } }
  if (P.planter) { bx(g, W, 1.6, 1.4, 0, .8, .85, mt('frp', { color: 0x3C3C3E, roughness: .5 })); const r = rnd(Math.round(W * 31)), lm = mt('leaf2', { color: 0x4A8A34 }); for (let i = 0; i < W * 4; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.28 + r() * .22, 7, 6), lm); s.position.set(-W / 2 + .3 + r() * (W - .6), 1.7 + r() * .4, .55 + r() * .6); g.add(s); } }
  if (P.water) { bx(g, W, .9, 1.8, 0, .45, 1.1, mt('pool', { color: 0x6E6A64, roughness: .7 })); bx(g, W - .3, .05, 1.5, 0, .86, 1.1, mt('water', { color: 0x3E7D93, roughness: .05, metalness: .2, transparent: true, opacity: .85 }));
    bx(g, W * .6, .05, .25, 0, H * .62, .3, mt('spout', { color: 0x2A2A2A, metalness: .6 })); bx(g, W * .58, H * .62 - .9, .03, 0, (H * .62 + .9) / 2, .42, mt('sheet', { color: 0xBFE3EE, transparent: true, opacity: .45, roughness: .05 }), false); }
  if (P.number) { const gold = /backlit/i.test(P.number); const m = gold ? GLOW() : mt('brass', { color: 0xB08D57, metalness: .85, roughness: .3 }); for (let i = 0; i < 3; i++) bx(g, .32, .5, .05, W * .3 + i * .42 - .42, H * .72, .5, m); }
  return g;
}

// "Complete the look" pieces beside the wall: a plant in a pot, a planter, a sculpture (simple shapes, at their own spots)
function ctlPieces(S, W, items) {
  let left = -W / 2 - 1.4, right = W / 2 + 1.4;
  (items || []).forEach(it => {
    const g = new THREE.Group(), r = rnd(it.sku.length * 97);
    if (it.col === 'sculptures') { cy(g, .55, .65, 1.6, 0, .8, 0, mt('pl', { color: 0xBDB6AA })); const sp = new THREE.Mesh(new THREE.TorusKnotGeometry(.45, .14, 64, 10), mt('scu', { color: 0x8A6A4A, metalness: .5, roughness: .35 })); sp.position.y = 2.25; sp.castShadow = true; g.add(sp); g.position.set(right, 0, 2.4); right += 2.2; }
    else if (it.col === 'planters') { cy(g, .9, .7, 1.8, 0, .9, 0, mt('pot', { color: 0x5A5652, roughness: .6 })); for (let i = 0; i < 14; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.3 + r() * .2, 7, 6), mt('leaf3', { color: 0x4E8A36 })); s.position.set((r() - .5) * 1.3, 2 + r() * .8, (r() - .5) * 1.3); g.add(s); } g.position.set(left, 0, 2); left -= 2.6; }
    else { cy(g, .6, .48, 1.2, 0, .6, 0, mt('tpot', { color: 0xB0603C, roughness: .7 })); const lc = [0x3F7E2E, 0x4E8F36, 0x2F6A26];   // a leafy plant in a terracotta pot
      for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, rr = r() * .75, hh = 1.4 + r() * 2.2, l = new THREE.Mesh(new THREE.SphereGeometry(.22 + r() * .18, 7, 5), mt('lf' + (i % 3), { color: lc[i % 3], roughness: .8 })); l.scale.set(1.5, .5, .9); l.rotation.set(r(), a, r() * .6); l.position.set(Math.cos(a) * rr, hh, Math.sin(a) * rr); l.castShadow = true; g.add(l); }
      g.position.set(i0(), 0, 1.6); }
    S.add(g);
    function i0() { const x = left; left -= 2; return x; }
  });
}

// the setting by place: entrance / terrace / garden (free-standing) / commercial / cabin
export function fwStudio(sp) {
  const S = new THREE.Group(), W = Math.max(2, +sp.W || 8), H = Math.max(2, +sp.H || 9), P = fwPicks(sp.groups), place = sp.place || 'terrace', free = place === 'garden';
  const wall = fwModel(sp.code, W, H, P, free); S.add(wall);
  const wm = mt('bwall', { color: 0xECE8E1, roughness: .95 }), FW = W + 12;
  if (place === 'garden') {
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(FW + 16, 34), mt('lawn', { color: 0x6E9B4A, roughness: 1 })); lawn.rotation.x = -Math.PI / 2; lawn.position.set(0, .002, 3); lawn.receiveShadow = true; S.add(lawn);
  } else {
    studioFloor(S, -FW / 2, -1.5, FW, 15);
    const BH = Math.max(H + 1.5, place === 'entrance' ? 11 : 10);
    bx(S, FW, BH, .7, 0, BH / 2, -.7, wm);                                                              // the wall it is fixed to
    if (place === 'entrance') {                                                                          // a house front: a door beside the feature wall + a slab over it
      const dx = W / 2 + 2.4; bx(S, 3.6, 7.6, .12, dx, 3.8, -.3, mt('door', { color: 0x4A3424, roughness: .55 })); bx(S, 4.1, .3, .4, dx, 7.75, -.2, mt('dfr', { color: 0x2B2B2B }));
      bx(S, .06, .9, .08, dx + 1.3, 3.6, -.2, mt('handle', { color: 0xB08D57, metalness: .8, roughness: .3 })); bx(S, FW, .6, 3, 0, BH + .3, .6, mt('slab', { color: 0xDCD6CC }));
    }
    if (place === 'cabin') { bx(S, FW, .5, 9, 0, BH + .25, -4.6, mt('roof', { color: 0xD5CFC4 })); bx(S, .7, BH, 9, -FW / 2, BH / 2, -4.6, wm); bx(S, .7, BH, 9, FW / 2, BH / 2, -4.6, wm); }
    // commercial (café) walls stand like a terrace wall
  }
  ctlPieces(S, W, sp.ctl);
  person(S, W / 2 + (place === 'entrance' ? 5.2 : 2.6) + ((sp.ctl || []).some(c => c.col === 'sculptures') ? 2.4 : 0), 1.6, -.35);
  const nc = (sp.ctl || []).length; return { g: S, W, H, span: Math.max(W + 8 + nc * 2.6, H * 1.6 + 4, 14) };
}
