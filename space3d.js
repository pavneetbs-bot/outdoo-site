// outrr "Plan your space" — the 3D scene (three.js): the customer's terrace or lawn, and everything they place on it.
// Cabins and pergolas are the real models (cabin3d.js / pergola3d.js); every other category is one common model,
// sized to what the customer set. Plot coords: x across the width (0 = left), z front-to-back (0 = back, pd = front),
// feet, y up, floor / slab at y = 0. Items: {cat, x, z, w, d, h, rot} — (x, z) = back-left corner of the footprint.
import * as THREE from './vendor/three/three.module.min.js';
import { OrbitControls } from './vendor/three/OrbitControls.js';
import { RoomEnvironment } from './vendor/three/RoomEnvironment.js';
import { cabinModel, plotModel, mumtyProj } from './cabin3d.js?v=85';
import { pergolaModel } from './pergola3d.js?v=72';
import { outline, sofaLayout } from './plan2d.js?v=36';
import { plantModel } from './plants3d.js?v=4';
import { layCanvas, layPeriod, layRot, SPECS as LSPEC } from './floorlay.js?v=10';
import { studioFloor, wall as sWall, person as sPerson } from './studio3d.js?v=7';   // 294: the design studio setting (planters)
import { railStudio, railSpec } from './rail3d.js?v=1';   // 309
import { gateStudio, gateSpec } from './gate3d.js?v=1';   // 309
import { acStudio, acSpec } from './ac3d.js?v=1';   // 309
import { scStudio, scSpec } from './sculpt3d.js?v=1';   // 309b
import { furnStudio, furnSpec } from './furn3d.js?v=1';   // 310
import { graffitiStudio, graffitiSpec, vgStudio, vgSpec, deckStudio, deckSpec } from './misc3d.js?v=1';   // 309
import { barStudio, barSpec } from './bar3d.js?v=9';   // 295: the bar studio
import { fwStudio } from './fw3d.js?v=4';
import { benchStudio, benchModel, benchCode } from './bench3d.js?v=1';   // 307: the bench studio + bench models for Complete the look   // 296: the feature wall studio   // 295: the bar studio
const LAYK = k => !!LSPEC[k];

let R = null, HANDLER = null;
const M = {};
const mat = (k, c, o) => M[k] || (M[k] = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8 }, o || {})));

// 262 (owner): our water-feature library in 3D — walls (WW), cascades (WC), geyser tanks (TG); face finish + water as each design's drawing
const WLIB = { 'WW-ARCH': ['zellige', 'arch'], 'WW-BUBB': ['wpc', 'bubb'], 'WW-DUO': ['glass', 'spill'], 'WW-GRAN': ['stack', 'weep'], 'WW-GRNF': ['green', 'rain'], 'WW-MIRR': ['mirror', 'rain'], 'WW-RUN': ['granite', 'runnel'], 'WW-SPIL': ['marble', 'spill'], 'WW-SPOUT': ['corten', 'spout'], 'WW-STEP': ['cement', 'step'], 'WW-TILT': ['mirror', 'tilt'],
  'WC-BROAD': ['zellige', 'casc', [[4, 4.75]]], 'WC-ROW5': ['mirror', 'casc', [[1, 4.25], [1, 4.25], [1, 4.25], [1, 4.25], [1, 4.25]]], 'WC-TRIPLE': ['slate', 'casc', [[2, 4.1], [1, 4.9], [1.5, 3.3]]], 'WC-TWIN': ['wpc', 'casc', [[3, 4.9], [1.5, 3.6]]], 'WC-XBROAD': ['granite', 'casc', [[6, 4.9]]],
  'TG-CUBE1': ['corten', 'geyser', [3]], 'TG-LINE5': ['concrete', 'geyser', [2.6, 3.3, 2, 3.3, 2.6]], 'TG-QUINT': ['granite', 'geyser', [4.3, 1.6, 1.6, 1.6, 1.6]], 'TG-TRIO': ['stack', 'geyser', [2.3, 3.6, 2.3]] };
const WMAP = { cascade: 'WC-TRIPLE', wall: 'WW-SPIL', rain: 'WW-MIRR', geyser: 'TG-QUINT' };
function wCode(it) { const id = String(it.wsku || it.pick || it.cfgId || '').replace(/^MTO-/, ''); return WLIB[id] ? id : WMAP[it.mech] || ''; }
let WTX = {};
function finTx(k) { if (WTX[k]) return WTX[k]; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const P = { zellige: ['#1F6F7E', '#2A8494', '#175C69', 16], slate: ['#3B3E42', '#4A4E53', '#2F3236', 32], stack: ['#8C7A64', '#A08B70', '#6F604E', 0], tstone: ['#7A7873', '#8C8A84', '#66645F', 0], cement: ['#9A9893', '#A9A7A2', '#8E8C87', 0], wpc: ['#6B4A33', '#7D5A40', '#5A3D2A', -1], green: ['#2F6B34', '#4C8A3C', '#22552A', 0], gmos: ['#2C8C9A', '#3AA3B0', '#1F6F7E', 8] }[k] || ['#999', '#aaa', '#888', 0];
  x.fillStyle = P[0]; x.fillRect(0, 0, 128, 128);
  if (P[3] > 0) { for (let i = 0; i < 128; i += P[3]) for (let j = 0; j < 128; j += P[3]) { x.fillStyle = (i + j) % (P[3] * 2) ? P[1] : P[2]; x.fillRect(i + 1, j + 1, P[3] - 2, P[3] - 2); } }
  else if (P[3] < 0) { for (let i = 0; i < 128; i += 16) { x.fillStyle = P[1]; x.fillRect(i, 0, 10, 128); x.fillStyle = P[2]; x.fillRect(i + 10, 0, 6, 128); } }
  else { for (let n = 0; n < 90; n++) { x.fillStyle = [P[1], P[2]][n % 2]; const yy = (n * 37) % 128, xx = (n * 53) % 128; x.fillRect(xx, yy, 18 + (n % 3) * 8, 7 + (n % 2) * 4); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 4); if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace; return (WTX[k] = t); }
function finMat(k) { if (k === 'mirror') return mat('c_wmir', 0xD7DCE0, { metalness: 0.95, roughness: 0.12 }); if (k === 'granite') return mat('c_wgran', 0x1D1E20, { roughness: 0.25, metalness: 0.2 }); if (k === 'marble') return mat('c_wmarb', 0xEDEBE6, { roughness: 0.3 }); if (k === 'corten') return mat('c_wcor', 0x8B4A2B, { roughness: 0.85 }); if (k === 'concrete') return mat('c_wconc', 0xB4B1AA, { roughness: 0.9 });
  if (k === 'glass') return mat('c_wglass', 0xCFE6EC, { transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.1 }); if (k === 'slime') return sLime(); if (k === 'ledge') return ledgeMat(); if (k === 'blime') return bLime(); if (k === 'zelb') { if (!M.c_zelb) { const t = zelTex().clone(); t.needsUpdate = true; t.repeat.set(3, 3); M.c_zelb = new THREE.MeshStandardMaterial({ map: t, roughness: 0.35 }); } return M.c_zelb; } return mat('c_wf_' + k, 0xffffff, { map: finTx(k), roughness: 0.85 }); }
// 301: falling water that moves — a streaky sheet whose texture runs down (studio only; the planner keeps the still sheet)
let WSA = null; function wSheetA() { if (WSA) return WSA; const c = document.createElement('canvas'); c.width = 64; c.height = 256; const x = c.getContext('2d'); x.fillStyle = 'rgba(210,240,250,0.35)'; x.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 90; i++) { const xx = (i * 37) % 64, yy = (i * 71) % 256, l = 20 + (i % 5) * 14; x.fillStyle = `rgba(255,255,255,${0.25 + (i % 4) * 0.12})`; x.fillRect(xx, yy, 1 + (i % 2), l); if (yy + l > 256) x.fillRect(xx, 0, 1 + (i % 2), yy + l - 256); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1.5);
  WSA = new THREE.MeshStandardMaterial({ map: t, color: 0xDDF4FB, transparent: true, opacity: 0.62, roughness: 0.05, metalness: 0.05, emissive: 0x2E6F86, emissiveIntensity: 0.22, side: THREE.DoubleSide, depthWrite: false }); return WSA; }
function pvAnim(f) { if (PV) (PV.anim || (PV.anim = [])).push(f); }
const W_FIN = [[/zellige/i, 'zellige'], [/stacked stone/i, 'stack'], [/granite/i, 'granite'], [/slate/i, 'slate'], [/cement/i, 'cement'], [/corten/i, 'corten'], [/mirror/i, 'mirror'], [/wpc/i, 'wpc'], [/marble/i, 'marble'], [/glass mosaic/i, 'gmos'], [/concrete/i, 'concrete'], [/glass/i, 'glass'], [/vertical garden/i, 'green']];
export function wFin(name) { const r = W_FIN.find(p => p[0].test(String(name || ''))); return r ? r[1] : ''; }
function waterLib(g, w, d, code, K, wo) {
  wo = wo || {};
  if (themeKey() === 'modern') K = Object.assign({}, K, { stone: mChar() });   // 298: Modern — charcoal basin under the dark ledge stone
  if (themeKey() === 'santorini') azPlane(g, w - 0.1, 0.7, 0, 0.42, d / 2 + 0.02);   // 296: Santorini — a blue-white tile band on the basin front
  let [fin0, kind, ex] = WLIB[code]; if (wo.fin) fin0 = wo.fin; const fin = !['glass', 'green', 'mirror'].includes(fin0) && themeKey() === 'tropical' ? 'tstone' : !['glass', 'mirror'].includes(fin0) && themeKey() === 'turkish' ? 'zelb' : !['glass', 'mirror'].includes(fin0) && themeKey() === 'santorini' ? 'slime' : !['glass', 'mirror'].includes(fin0) && themeKey() === 'modern' ? 'ledge' : !['glass', 'mirror'].includes(fin0) && themeKey() === 'boho' ? 'blime' : fin0,   /* 294: Turkish = beige zellige */ FM = finMat(fin),   /* 292: tropical = rough grey stone face */ sheet = wo.anim ? wSheetA() : mat('c_wsheet2', 0xCFEFF8, { transparent: true, opacity: 0.42, roughness: 0.05, metalness: 0.05, emissive: 0x2E6F86, emissiveIntensity: 0.2, side: THREE.DoubleSide, depthWrite: false }), wat = mat('c_wpool', 0x5FA9C4, { roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.85 }), ss = mat('c_wss', 0xC9CED2, { metalness: 0.9, roughness: 0.25 }), led = mat('c_wled', 0xFFE2B0, { emissive: 0xFFB866, emissiveIntensity: 1.6 });
  if (wo.anim) pvAnim(tm => { if (sheet.map) sheet.map.offset.y = (tm * 0.9) % 1; });   // 301: the water runs down
  if (wo.rgb) pvAnim(tm => { const c = new THREE.Color().setHSL((tm * 0.06) % 1, 0.85, 0.6); led.emissive.copy(c); washMat().color.copy(c); haloMat('b').color.copy(c); haloMat().color.copy(c); });   // 301: RGB LED — the colours change
  else { led.emissive.setHex(0xFFB866); washMat().color.setHex(0xffffff); haloMat('b').color.setHex(0xffffff); haloMat().color.setHex(0xffffff); }
  const pebbles = (pw, pd, y, z0) => { const pb = mat('c_wpeb', 0xD9D2C6, { roughness: 0.9 }); for (let i = 0; i < Math.min(40, Math.round(pw * 3)); i++) { const r = 0.08 + (i % 3) * 0.03, m0 = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 4), pb); m0.scale.y = 0.5; m0.position.set(-pw / 2 + 0.2 + ((i * 0.6173) % 1) * (pw - 0.4), y, z0 - pd / 2 + 0.15 + ((i * 0.381) % 1) * (pd - 0.3)); g.add(m0); } };
  if (kind === 'geyser') { const H = code === 'TG-CUBE1' ? 2 : 1.5, wall = 0.25; box(g, w, H, d, 0, H / 2, 0, FM); box(g, w - wall * 2, 0.04, d - wall * 2, 0, H + 0.01, 0, wat); [[w + 0.15, 0.2, 0, d / 2], [w + 0.15, 0.2, 0, -d / 2], [0.2, d + 0.15, w / 2, 0], [0.2, d + 0.15, -w / 2, 0]].forEach(([a, b, x, z]) => box(g, a, 0.12, b, x, H + 0.06, z, fin === 'stack' ? K.stone : FM));
    const n = ex.length, pts = code === 'TG-QUINT' ? [[0, 0], [-w / 4, -d / 4], [w / 4, -d / 4], [-w / 4, d / 4], [w / 4, d / 4]] : ex.map((_, k) => [-w / 2 + w * (k + 0.5) / n, 0]), foam = mat('c_wfoam', 0xF7FBFC, { transparent: true, opacity: 0.85, roughness: 0.6, emissive: 0x8FB8C8, emissiveIntensity: 0.15 });
    pts.forEach(([x, z], k) => { const hh = ex[k] || 2; const j = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, hh, 10), foam); j.position.set(x, H + hh / 2, z); g.add(j); const t = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 6), foam); t.position.set(x, H + hh, z); g.add(t);
      if (wo.anim) pvAnim(tm => { const s0 = 0.86 + 0.14 * Math.sin(tm * 5.2 + k * 1.7); j.scale.y = s0; j.position.y = H + hh * s0 / 2; t.position.y = H + hh * s0; t.scale.setScalar(0.9 + 0.2 * Math.sin(tm * 7 + k)); }); const l = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 10), led); l.position.set(x, H - 0.22, z); g.add(l);
      const gj = new THREE.Sprite(haloMat()); gj.scale.set(1.1, hh + 0.9, 1); gj.position.set(x, H + hh / 2, z); nightOnly(gj, g); const gt = new THREE.Sprite(haloMat()); gt.scale.set(1.3, 1.3, 1); gt.position.set(x, H + hh, z); nightOnly(gt, g); }); return; }   // 266 (owner): lit from under, the jets glow at night
  const bd = code.startsWith('WC') ? 2 : 1.5, FH = wo.H ? Math.max(3, Math.min(14, +wo.H)) : 7.5, kH = FH / 7.5, ft = 0.8, fz = -d / 2 + ft / 2, bz = fz + ft / 2 + bd / 2;   // face 10 × 6 ft on an 18 in basin; the basin in front
  const trough = z0 => { box(g, w, 1.3, bd, 0, 0.65, z0, K.stone); const rm = 0.25; box(g, w + 0.1, 0.35, rm, 0, 1.47, z0 + bd / 2 - rm / 2 + 0.05, K.stone); box(g, w + 0.1, 0.35, rm, 0, 1.47, z0 - bd / 2 + rm / 2 - 0.05, K.stone); [-1, 1].forEach(a => box(g, rm, 0.35, bd, a * (w / 2 - rm / 2 + 0.05), 1.47, z0, K.stone));   // 263: an open basin — the water and pebbles show
    box(g, w - 0.5, 0.03, bd - 0.5, 0, 1.45, z0, wat); pebbles(w - 0.6, bd - 0.6, 1.47, z0); box(g, w - 0.6, 0.04, 0.06, 0, 1.5, z0 + bd / 2 - 0.3, led); };
  if (kind === 'rain' && fin === 'green') { [-1, 1].forEach(a => { const c0 = box(g, 2, FH, ft, a * (w / 2 - 1), FH / 2, fz, finMat('green')); }); box(g, w, 0.3, 0.7, 0, FH - 0.15, fz + 0.3, ss); }
  else { const face = box(g, w, FH, ft, 0, FH / 2, fz, FM); if (fin === 'glass') { box(g, w, 0.25, ft + 0.2, 0, 0.12, fz, ss); box(g, w, 0.2, ft + 0.3, 0, FH, fz, ss); } }
  trough(bz); if (code === 'WW-DUO' || wo.duo) trough(fz - ft / 2 - bd / 2);
  if (wo.duo && code !== 'WW-DUO') { const p1 = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, FH - 1.6), sheet); p1.position.set(0, (FH + 1.4) / 2, fz - ft / 2 - 0.03); g.add(p1); }   // 301: free-standing, double-sided — water down the back too
  if (wo.greens) [-1, 1].forEach(a => { box(g, 2, FH, ft + 0.2, a * (w / 2 + 1.05), FH / 2, fz, finMat('green')); box(g, 2.1, 0.5, ft + 0.4, a * (w / 2 + 1.05), 0.25, fz, K.stone); });   // 301: vertical-garden columns both sides
  if (wo.pelmet) { box(g, w + 0.3, 0.32, 1.3, 0, FH + 0.16, fz + 0.3, ss); const nP = Math.max(2, Math.round(w / 3)); for (let k = 0; k < nP; k++) { const wm = new THREE.Mesh(new THREE.PlaneGeometry(2.6, FH - 1.4), washMat()); wm.position.set(-w / 2 + w * (k + 0.5) / nP, FH - (FH - 1.4) / 2, fz + ft / 2 + 0.08); nightOnly(wm, g); } }   // 301: SS pelmet with LED downlights
  const zf = fz + ft / 2 + 0.03, fall = (fw, top, bot, x, z) => { const p0 = new THREE.Mesh(new THREE.PlaneGeometry(fw, Math.max(0.1, top - bot)), sheet); p0.position.set(x || 0, (top + bot) / 2, z == null ? zf : z); g.add(p0); };
  if (kind === 'spill') { box(g, w * 0.92, 0.08, 0.4, 0, FH - 0.3, zf + 0.15, ss); fall(w * 0.9, FH - 0.32, 1.32, 0, zf + 0.3); if (code === 'WW-DUO') { box(g, w * 0.92, 0.08, 0.4, 0, FH - 0.3, fz - ft / 2 - 0.15, ss); fall(w * 0.9, FH - 0.32, 1.32, 0, fz - ft / 2 - 0.3); } }
  else if (kind === 'weep') { fall(w * 0.98, FH - 0.2, 1.32, 0, zf + 0.005); box(g, w, 0.25, 0.4, 0, FH, fz, ss); }
  else if (kind === 'rain') { const cw = fin === 'green' ? w - 4.2 : w * 0.9, hy = fin === 'green' ? FH - 0.3 : FH - 0.4; if (fin !== 'green') box(g, cw + 0.2, 0.2, 0.35, 0, hy, zf + 0.2, ss); const n = Math.round(cw * 3); for (let k = 0; k < n; k++) { const c0 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, hy - 1.35, 3), sheet); c0.position.set(-cw / 2 + cw * (k + 0.5) / n, (hy + 1.35) / 2, zf + 0.3 + ((k * 7) % 3) * 0.04); g.add(c0); } }
  else if (kind === 'arch') { const nm = mat('c_wniche', 0x0F3E47, { roughness: 0.4 }), sh = new THREE.Shape(); sh.moveTo(-1.65, 0); sh.lineTo(1.65, 0); sh.lineTo(1.65, 3.3); sh.absarc(0, 3.3, 1.65, 0, Math.PI, false); sh.lineTo(-1.65, 0); const ni = new THREE.Mesh(new THREE.ShapeGeometry(sh, 16), nm); ni.position.set(0, 1.6, zf + 0.01); ni.scale.y = Math.min(1.6, kH); g.add(ni); const ay = 1.6 + 3.3 * Math.min(1.6, kH); box(g, 3, 0.08, 0.35, 0, ay, zf + 0.15, ss); fall(3, ay - 0.02, 1.32, 0, zf + 0.28); }
  else if (kind === 'runnel') { box(g, 0.6, FH - 1.5, 0.1, 0, (FH + 1.5) / 2, zf - 0.04, mat('c_wrun', 0x111214, { roughness: 0.2 })); fall(0.5, FH - 0.2, 1.4, 0, zf + 0.02); box(g, 0.72, 0.06, 0.46, 0, 1.6, zf + 0.2, ss); }
  else if (kind === 'spout') [-1, 0, 1].forEach(a => { const x = a * w * 0.28; box(g, 0.4, 0.17, 0.72, x, 4.5 * kH, zf + 0.36, finMat('corten')); const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x, 4.45 * kH, zf + 0.72), new THREE.Vector3(x, 4.2 * kH, zf + 1.4), new THREE.Vector3(x, 1.35, bz + 0.1)); const tb = new THREE.Mesh(new THREE.TubeGeometry(c, 12, 0.09, 6, false), sheet); g.add(tb); });
  else if (kind === 'step' || kind === 'tilt') [[0.5, 5.8], [1, 4.3], [1.5, 2.8]].forEach(([pj, y0], k) => { const y = 1.5 + (y0 - 1.5) * kH; const sw = w * (0.7 - k * 0.12); if (kind === 'tilt') { const p0 = box(g, sw, 2, 0.08, 0, y - 0.6, zf + pj / 2 + 0.2, ss); p0.rotation.x = -0.35; } else box(g, sw, 0.18, pj, 0, y, zf + pj / 2, fin === 'cement' ? K.stone : ss); fall(sw * 0.95, y - 0.05, k === 2 ? 1.32 : y - 1.45, 0, zf + pj + 0.03); });
  else if (kind === 'bubb') [-1, 0, 1].forEach(a => { const x = a * w * 0.3; const r0 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.85, 8), ss); r0.position.set(x, 1.6, bz); g.add(r0); const b = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), sheet); b.position.set(x, 2.02, bz); g.add(b); });
  else if (kind === 'casc') { let x0 = -(ex.reduce((a, q) => a + q[0], 0) + (ex.length - 1) * 0.7) / 2; ex.forEach(([nw, ly0]) => { const ly = 1.45 + (ly0 - 1.45) * kH, x = x0 + nw / 2; x0 += nw + 0.7; box(g, nw + 0.1, 0.12, 0.3, x, ly, zf + 0.12, ss); const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.15, 0.22), new THREE.Vector3(0, -(ly - 1.45), 0.4));
      const pts = c.getPoints(10), sg = new THREE.BufferGeometry(), pos = []; for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[i], p1 = pts[i + 1]; [[-nw / 2 + 0.05, p0], [nw / 2 - 0.05, p0], [-nw / 2 + 0.05, p1], [nw / 2 - 0.05, p0], [nw / 2 - 0.05, p1], [-nw / 2 + 0.05, p1]].forEach(([dx, p]) => pos.push(x + dx, ly - 0.06 + p.y, zf + 0.26 + p.z)); }
      sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.computeVertexNormals(); g.add(new THREE.Mesh(sg, sheet)); }); }
  const nU = Math.max(1, Math.round(w / 2.6)), uh = FH - 1.6;   // 266 (owner): underwater lights in the basin wash up the wall at night
  for (let k = 0; k < nU; k++) { const x = -w / 2 + w * (k + 0.5) / nU, wm = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(3, w / nU + 0.6), uh), washMat()); wm.rotation.z = Math.PI; wm.position.set(x, 1.5 + uh / 2, fz + ft / 2 + 0.06); nightOnly(wm, g); const hs = new THREE.Sprite(haloMat('b')); hs.scale.set(1.4, 0.7, 1); hs.position.set(x, 1.55, bz); nightOnly(hs, g); }
}

let BEAM = null; function beamMat() { if (BEAM) return BEAM; const c = document.createElement('canvas'); c.width = 8; c.height = 64; const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(255,210,150,.45)'); gr.addColorStop(0.45, 'rgba(255,200,130,.18)'); gr.addColorStop(1, 'rgba(255,200,130,0)'); x.fillStyle = gr; x.fillRect(0, 0, 8, 64);
  const t = new THREE.CanvasTexture(c); return (BEAM = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); }   // 263: a soft up-light through the plant, no lamp
let WASH = null; function washMat() { if (WASH) return WASH; const c = document.createElement('canvas'); c.width = 128; c.height = 256; const x = c.getContext('2d'), im = x.createImageData(128, 256);   // 263 (owner): a downlight's V; 266: a soft, natural spread (gaussian across, a warm hotspot at the lamp, fading down)
  for (let yy = 0; yy < 256; yy++) { const v = yy / 255, sp = 4 + Math.pow(v, 0.8) * 46, fade = Math.pow(1 - v, 1.3) * (0.75 + 0.25 * Math.exp(-v * 9)), top = yy < 6 ? yy / 6 : 1; for (let xx = 0; xx < 128; xx++) { const u = (xx - 63.5) / sp, a = Math.exp(-u * u * 1.6) * fade * top * 0.85, o2 = (yy * 128 + xx) * 4; im.data[o2] = 255; im.data[o2 + 1] = 186; im.data[o2 + 2] = 112; im.data[o2 + 3] = Math.round(Math.min(1, a) * 255); } } x.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace; return (WASH = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); }
let HALO = null; function haloMat(col) { const k = col || 'w'; HALO = HALO || {}; if (HALO[k]) return HALO[k]; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);   // 266: a soft round glow (plant lit by its spike, water lit from under)
  const rgb = k === 'b' ? '170,215,255' : '255,186,112'; gr.addColorStop(0, `rgba(${rgb},.55)`); gr.addColorStop(0.35, `rgba(${rgb},.25)`); gr.addColorStop(1, `rgba(${rgb},0)`); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); return (HALO[k] = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); }
function nightOnly(o, par) { o.visible = !!(R && R.night); o.userData.nightOnly = 1; if (R) (R.nl || (R.nl = [])).push(o); par.add(o); return o; }
const DECK_H = 5 / 12, deckTop = o => Math.max(DECK_H, +(o && o.lvl) || 0);
const deckUnder = (it, P) => (P.items || []).some(o => o.cat === 'deck' && Math.abs(+o.x - +it.x) < 0.7 && Math.abs(+o.z - +it.z) < 0.7);   // 262: the deck item is drawn instead (same boards, same height as the cabin floor)
let ROPE_TX = null; const ROPE_M = {};
function ropeMat(pw, ph) {   // 261: woven rope (vertical cords with gaps) as a cut-out texture, repeated ~7 cords a foot
  const k = Math.round(pw * 4) + 'x' + Math.round(ph * 4); if (ROPE_M[k]) return ROPE_M[k];
  if (!ROPE_TX) { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d'); x.clearRect(0, 0, 64, 64);
    for (let i = 0; i < 4; i++) { const gr = x.createLinearGradient(i * 16, 0, i * 16 + 11, 0); gr.addColorStop(0, '#9C8464'); gr.addColorStop(0.5, '#D8C6A4'); gr.addColorStop(1, '#9C8464'); x.fillStyle = gr; x.fillRect(i * 16, 0, 11, 64); x.fillStyle = 'rgba(80,60,40,.35)'; for (let j = 0; j < 64; j += 6) x.fillRect(i * 16, j, 11, 1.5); }
    ROPE_TX = new THREE.CanvasTexture(c); ROPE_TX.wrapS = ROPE_TX.wrapT = THREE.RepeatWrapping; if ('colorSpace' in ROPE_TX) ROPE_TX.colorSpace = THREE.SRGBColorSpace; }
  const t = ROPE_TX.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, pw * 7 / 4), Math.max(1, ph * 2)); return (ROPE_M[k] = new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.4, transparent: false, side: THREE.DoubleSide, roughness: 0.9 })); }
function box(g, w, h, d, x, y, z, m, sh = true) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = sh; b.receiveShadow = true; g.add(b); return b; }
// 275 (owner): theme shapes — lanterns, pendants, globes, arches, reed roof, curtains (used by the simple pergola, fire pit, umbrella, swing, fixed seating)
function greyTex() {   // 292: grey textured plaster for the tropical cabin
  if (M['c_greytex']) return M['c_greytex']; const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d'); x.fillStyle = '#6E6C68'; x.fillRect(0, 0, 256, 256);
  let sd = 7; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 4200; i++) { const v = 90 + Math.round(r() * 40); x.fillStyle = `rgba(${v},${v - 2},${v - 6},${0.25 + r() * 0.4})`; x.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 3); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return (M['c_greytex'] = new THREE.MeshStandardMaterial({ map: t, roughness: 1 })); }
function zelTex() {   // 294: beige zellige — 8-point stars in cream / sand / brass, a teal star now and then; one canvas = 2 ft
  if (WTX._zel) return WTX._zel; const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#EFE6D4'; x.fillRect(0, 0, 256, 256);
  const star = (cx, cy, r, col) => { x.fillStyle = col; x.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? r * 0.62 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill(); };
  const cols = ['#D6BE97', '#C9AE86', '#E3CFAE', '#B08D57'];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const cx = 32 + i * 64, cy = 32 + j * 64; star(cx, cy, 30, (i * 3 + j) % 7 === 2 ? '#2F6E73' : cols[(i + j) % 4]); x.fillStyle = '#F4EFE6'; x.beginPath(); x.arc(cx, cy, 7, 0, 7); x.fill(); x.fillStyle = cols[(i + j + 1) % 4]; x.save(); x.translate(cx + 32, cy + 32); x.rotate(Math.PI / 4); x.fillRect(-8, -8, 16, 16); x.restore(); }
  x.strokeStyle = 'rgba(150,130,100,.35)'; x.lineWidth = 1; for (let k = 0; k <= 256; k += 16) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k, 256); x.stroke(); x.beginPath(); x.moveTo(0, k); x.lineTo(256, k); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.5, 0.5); if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace; return (WTX._zel = t); }
function girihTex() {   // 294: open girih lattice for the pergola roof — thin bars, big 8-point star openings (one canvas = 1 unit)
  if (M._girih) return M._girih; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 128, 128); x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000';
  const star = (cx, cy, r) => { x.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2 + Math.PI / 8, rr = k % 2 ? r * 0.72 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill(); };
  star(64, 64, 50); [[0, 0], [128, 0], [0, 128], [128, 128]].forEach(([a, b]) => { x.save(); x.translate(a, b); x.rotate(Math.PI / 4); x.fillRect(-16, -16, 32, 32); x.restore(); });
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return (M._girih = t); }
const zelMat = () => M.c_zel || (M.c_zel = new THREE.MeshStandardMaterial({ map: zelTex(), roughness: 0.35, metalness: 0.05 }));
function zelPlane(g, w, h, x, y, z, ry) { const geo = new THREE.PlaneGeometry(w, h), uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h); const m = new THREE.Mesh(geo, zelMat()); m.position.set(x, y, z); m.rotation.y = ry || 0; m.receiveShadow = true; g.add(m); return m; }
function keyhole(a, c, r) {   // 294: keyhole (horseshoe) arch — opening 2a wide, the circle of radius r centred c up
  const k = Math.sqrt(Math.max(0.01, r * r - a * a)), s = new THREE.Shape(); s.moveTo(-a, 0); s.lineTo(-a, c - k); s.absarc(0, c, r, Math.atan2(-k, -a), Math.atan2(-k, a), true); s.lineTo(a, 0); s.lineTo(-a, 0); return s; }
const khPts = (a, c, r) => { const p = keyhole(a, c, r).getPoints(24); while (p.length > 1 && p[p.length - 1].distanceTo(p[0]) < 1e-4) p.pop(); return p; };   // (-a,0) up, over the arch, down to (a,0)
const khWall = (w, h, a, c, r) => new THREE.Shape([new THREE.Vector2(-w / 2, 0)].concat(khPts(a, c, r), [new THREE.Vector2(w / 2, 0), new THREE.Vector2(w / 2, h), new THREE.Vector2(-w / 2, h)]));   // the wall round a keyhole opening (no holes — one outline)
const khRim = (a, c, r, t) => new THREE.Shape(khPts(a + t, c, r + t).concat(khPts(a, c, r).reverse()));
function turCabin(g) {   // 294 (owner, Turkish guide): lime-white walls, brass frames + fascia, sand plinth / roof edge, a keyhole arch over every glass bay, lanterns by the doors, bougainvillea on a corner
  const lw = mat('c_tk_lime', 0xF4EFE6, { roughness: 0.95 }), wn = mat('c_tk_wal', 0x5A3B26, { roughness: 0.7 }), sd = mat('c_tk_sand', 0xE3CFAE, { roughness: 0.9 }), br = mat('c_tk_brass', 0xC9A86C, { metalness: 0.6, roughness: 0.32 }), pl = mat('c_tk_plinth', 0xC9AE86, { roughness: 0.9 });
  const gl = []; g.traverse(o => { if (!o.isMesh || !o.material || !o.material.color) return; const c = o.material.color.getHex(); if (c === 0xBFDCE6 && o.material.opacity < 0.34) { gl.push(o); return; } if (o.material.map) return;
    if (c === 0xF2F0EB || c === 0x6E6C68) o.material = lw; else if (c === 0xE4E1DA) o.material = sd; else if (c === 0x2B2B2B) o.material = br; else if (c === 0x5A564F) o.material = pl; else if (c === 0x9C7650 || c === 0x8B5A2B || c === 0x7A5537) o.material = wn; });
  g.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), B = new THREE.Box3(), V0 = new THREE.Vector3(), V1 = new THREE.Vector3(), ar = new THREE.Group(); ar.name = 'tk_arches';
  gl.forEach(o => { B.setFromObject(o).applyMatrix4(inv); B.getSize(V0); B.getCenter(V1); const vx = V0.x < 0.3, vz = V0.z < 0.3; if (!(vx || vz) || V0.y < 4.5) return; const w = vx ? V0.z : V0.x, h = V0.y; if (w < 1.6) return;
    const a = w / 2 - 0.28, r = a * 1.12, c0 = Math.max(r * 0.4, h - r - 0.3), sh = khWall(w, h, a, c0, r);
    const geo = new THREE.ShapeGeometry(sh, 20); [-1, 1].forEach(sg => { const m = new THREE.Mesh(geo, lw); m.castShadow = true; m.receiveShadow = true; const t = (vx ? V0.x : V0.z) / 2 + 0.03; if (vx) { m.rotation.y = Math.PI / 2; m.position.set(V1.x + sg * t, B.min.y, V1.z); } else m.position.set(V1.x, B.min.y, V1.z + sg * t); ar.add(m);
      const rim = new THREE.Mesh(new THREE.ShapeGeometry(khRim(a, c0, r, 0.14), 20), sd); rim.position.copy(m.position); rim.rotation.copy(m.rotation); if (vx) rim.position.x += sg * 0.01; else rim.position.z += sg * 0.01; ar.add(rim); }); });
  g.add(ar); }
const SB_ = 0x1F4FA8, sLime = () => mat('c_s_lime', 0xF6F5F1, { roughness: 1 }), sBlue = () => mat('c_s_blue', SB_, { roughness: 0.6 });   // 296: Santorini
function azTex() {   // 296: blue-white azulejo tile (one canvas = one 6" tile, 4-fold flower)
  if (WTX._az) return WTX._az; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#F7F6F2'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#1F4FA8'; x.strokeStyle = '#1F4FA8'; x.lineWidth = 5;
  x.strokeRect(3, 3, 122, 122); for (let k = 0; k < 4; k++) { x.save(); x.translate(64, 64); x.rotate(k * Math.PI / 2); x.beginPath(); x.ellipse(0, -26, 10, 22, 0, 0, 7); x.fill(); x.beginPath(); x.arc(-40, -40, 18, 0, Math.PI / 2); x.lineTo(-58, -58); x.fill(); x.restore(); } x.fillStyle = '#6FA3D9'; x.beginPath(); x.arc(64, 64, 9, 0, 7); x.fill();
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace; return (WTX._az = t); }
const azMat = () => M.c_s_az || (M.c_s_az = new THREE.MeshStandardMaterial({ map: azTex(), roughness: 0.25 }));
function azPlane(g, w, h, x, y, z, ry) { const geo = new THREE.PlaneGeometry(w, h), uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w * 2, uv.getY(i) * h * 2); const m = new THREE.Mesh(geo, azMat()); m.position.set(x, y, z); m.rotation.y = ry || 0; g.add(m); return m; }
function stripeMat() { if (M.c_s_str) return M.c_s_str; const c = document.createElement('canvas'); c.width = 64; c.height = 8; const x = c.getContext('2d'); x.fillStyle = '#F7F6F2'; x.fillRect(0, 0, 64, 8); x.fillStyle = '#1F4FA8'; [4, 22, 40, 50].forEach((a, i) => x.fillRect(a, 0, i % 2 ? 4 : 10, 8));
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 1); if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace; return (M.c_s_str = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 })); }
function plateTex() { if (WTX._pl) return WTX._pl; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#F7F6F2'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill(); x.strokeStyle = '#1F4FA8'; x.lineWidth = 6; x.beginPath(); x.arc(64, 64, 56, 0, 7); x.stroke(); x.lineWidth = 3; x.beginPath(); x.arc(64, 64, 40, 0, 7); x.stroke();
  x.fillStyle = '#1F4FA8'; for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; x.beginPath(); x.ellipse(64 + Math.cos(a) * 22, 64 + Math.sin(a) * 22, 5, 11, a + Math.PI / 2, 0, 7); x.fill(); } x.beginPath(); x.arc(64, 64, 8, 0, 7); x.fill();
  const t = new THREE.CanvasTexture(c); if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace; return (WTX._pl = t); }
function plates(g, cx, cy, z, sc) { const m = M.c_s_plate || (M.c_s_plate = new THREE.MeshStandardMaterial({ map: plateTex(), roughness: 0.25, transparent: true, alphaTest: 0.5 })); [[0, 0.9, 0.62], [-0.85, 0.3, 0.42], [0.85, 0.35, 0.5], [0, -0.35, 0.46], [-0.6, -0.75, 0.32], [0.7, -0.7, 0.36], [-0.55, 1.35, 0.28]].forEach(([dx, dy, r]) => { const p = new THREE.Mesh(new THREE.CircleGeometry(r * sc, 24), m); p.position.set(cx + dx * sc * 1.1, cy + dy * sc * 1.1, z); g.add(p); }); }
function santCabin(g) {   // 296 (owner, Santorini guide): white lime walls + roof edge, Aegean-blue frames / doors, a round arch over every glass bay
  const lw = sLime(), bl = sBlue(); const gl = []; g.traverse(o => { if (!o.isMesh || !o.material || !o.material.color) return; const c = o.material.color.getHex(); if (c === 0xBFDCE6 && o.material.opacity < 0.34) { gl.push(o); return; } if (o.material.map) return;
    if (c === 0xF2F0EB || c === 0x6E6C68 || c === 0xE4E1DA || c === 0x5A564F) o.material = lw; else if (c === 0x2B2B2B || c === 0x9C7650 || c === 0x8B5A2B || c === 0x7A5537) o.material = bl; });
  g.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), B = new THREE.Box3(), V0 = new THREE.Vector3(), V1 = new THREE.Vector3(), ar = new THREE.Group();
  gl.forEach(o => { B.setFromObject(o).applyMatrix4(inv); B.getSize(V0); B.getCenter(V1); const vx = V0.x < 0.3, vz = V0.z < 0.3; if (!(vx || vz) || V0.y < 4.5) return; const w = vx ? V0.z : V0.x, h = V0.y; if (w < 1.6) return;
    const a = w / 2 - 0.25, c0 = Math.max(a * 0.4, h - a - 0.3), sh = khWall(w, h, a, c0, a + 0.001), geo = new THREE.ShapeGeometry(sh, 20);
    [-1, 1].forEach(sg => { const m = new THREE.Mesh(geo, lw); const t = (vx ? V0.x : V0.z) / 2 + 0.03; if (vx) { m.rotation.y = Math.PI / 2; m.position.set(V1.x + sg * t, B.min.y, V1.z); } else m.position.set(V1.x, B.min.y, V1.z + sg * t); ar.add(m);
      const rim = new THREE.Mesh(new THREE.ShapeGeometry(khRim(a, c0, a + 0.001, 0.12), 20), bl); rim.position.copy(m.position); rim.rotation.copy(m.rotation); if (vx) rim.position.x += sg * 0.01; else rim.position.z += sg * 0.01; ar.add(rim); }); });
  g.add(ar); }
function tropCabin(g) {   // 292 (owner, Tropical guide): the cabin's outer walls grey textured, its roof edge / projection dark wood
  const gt = greyTex(), dw = mat('c_tcab_dw', 0x4A3020, { roughness: 0.75 }); g.traverse(o => { if (!o.isMesh || !o.material || !o.material.color || o.material.map) return; const c = o.material.color.getHex(); if (c === 0xF2F0EB || c === 0x6E6C68) o.material = gt; else if (c === 0xE4E1DA || c === 0x9C7650 || c === 0x8B5A2B || c === 0x7A5537 || c === 0x2B2B2B) o.material = dw; }); }
const mLed = () => mat('c_m_led', 0xFFE2B8, { emissive: 0xFFB86B, emissiveIntensity: 1.6 }), mTeak = () => mat('c_m_teak', 0x86583A, { roughness: 0.7 }), mChar = () => mat('c_m_char', 0x2A2A2A, { roughness: 0.55, metalness: 0.25 });   // 298: Modern
function ledgeMat() {   // 298: dark ledge stone — thin stacked strips in charcoal greys
  if (M.c_m_ledge) return M.c_m_ledge; const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#2C2B29'; x.fillRect(0, 0, 256, 256); let sd = 7; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let y = 0; y < 256; y += 9 + Math.round(r() * 6)) { let xx = -r() * 60; const hh = 6 + Math.round(r() * 5); while (xx < 256) { const ww = 30 + r() * 70, v = 52 + Math.round(r() * 34); x.fillStyle = `rgb(${v},${v - 2},${v - 5})`; x.fillRect(xx, y, ww - 2, hh); x.fillStyle = 'rgba(255,255,255,0.06)'; x.fillRect(xx, y, ww - 2, 1); xx += ww; } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace; return (M.c_m_ledge = new THREE.MeshStandardMaterial({ map: t, roughness: 1 })); }
function teakSlatMat() {   // 298: warm teak vertical slats with dark gaps
  if (M.c_m_slat) return M.c_m_slat; const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#2A2A2A'; x.fillRect(0, 0, 128, 64); ['#86583A', '#7C5034', '#905F3E', '#805536'].forEach((col, i) => { x.fillStyle = col; x.fillRect(i * 32 + 3, 0, 26, 64); });
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1); if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace; return (M.c_m_slat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 })); }
function upLight(g, x, z, zf, H) {   // 298: a black up-light at the foot of a wall / screen, a soft warm glow up it at night
  box(g, 0.22, 0.14, 0.22, x, 0.07, z, mChar(), false); const l = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 10), mLed()); l.position.set(x, 0.15, z); g.add(l);
  const s = new THREE.Sprite(haloMat()); s.scale.set(1.2, Math.min(H, 4), 1); s.position.set(x, Math.min(H, 4) / 2 + 0.1, zf); nightOnly(s, g); }
function modCabin(g) {   // 298 (owner, Modern guide): charcoal frames + fascia, solid walls in teak slats, warm white roof, a warm cove line round the roof edge
  const sl = teakSlatMat(), ch = mChar(), ww = mat('c_m_ww', 0xEFE9DF, { roughness: 0.9 }), tk = mTeak(); g.traverse(o => { if (!o.isMesh || !o.material || !o.material.color || o.material.map) return; const c = o.material.color.getHex();
    if (c === 0xF2F0EB || c === 0x6E6C68) o.material = sl; else if (c === 0xE4E1DA) o.material = ww; else if (c === 0x5A564F) o.material = ch; else if (c === 0x9C7650 || c === 0x8B5A2B || c === 0x7A5537) o.material = tk; });
  g.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), B = new THREE.Box3().setFromObject(g).applyMatrix4(inv); let top = -1e9; g.traverse(o => { if (o.isMesh && o.material === ww) { const b = new THREE.Box3().setFromObject(o).applyMatrix4(inv); if (b.max.y > top) top = b.max.y; } }); if (top < 0) top = B.max.y;
  const y = top - 0.45, L = mLed(), cv = new THREE.Group(); cv.name = 'm_cove'; [[B.max.x - B.min.x, (B.min.x + B.max.x) / 2, B.min.z - 0.02, 0], [B.max.x - B.min.x, (B.min.x + B.max.x) / 2, B.max.z + 0.02, 0], [B.max.z - B.min.z, B.min.x - 0.02, (B.min.z + B.max.z) / 2, 1], [B.max.z - B.min.z, B.max.x + 0.02, (B.min.z + B.max.z) / 2, 1]].forEach(([len, x, z, r]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(r ? 0.05 : len - 0.3, 0.05, r ? len - 0.3 : 0.05), L); m.position.set(x, y, z); cv.add(m); });
  g.add(cv); }
const bLime = () => mat('c_b_lime', 0xEFE8DD, { roughness: 1 }), bTim = () => mat('c_b_tim', 0x8A6440, { roughness: 0.85 });   // 299: Boho (Ibiza)
function cvMat(k, fn, rep, op) { if (M[k]) return M[k]; const c = document.createElement('canvas'); c.width = c.height = 256; fn(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace; return (M[k] = new THREE.MeshStandardMaterial(Object.assign({ map: t, roughness: 1, side: THREE.DoubleSide }, op || {}))); }
const reedMat = () => cvMat('c_b_reed', x => { let sd = 3; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647; x.fillStyle = '#6E5236'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 256; i += 3 + Math.round(r() * 2)) { const v = 150 + Math.round(r() * 60); x.fillStyle = `rgb(${v + 20},${v},${v - 50})`; x.fillRect(i, 0, 2 + Math.round(r()), 256); } }, [6, 1]);   // reed / bamboo mat
const rubbleMat = () => cvMat('c_b_rub', x => { let sd = 11; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647; x.fillStyle = '#7A6852'; x.fillRect(0, 0, 256, 256); for (let y = 0; y < 270; y += 22) for (let xx = -10 - r() * 20; xx < 266; ) { const w = 22 + r() * 26, h = 16 + r() * 8, v = 160 + Math.round(r() * 50); x.fillStyle = `rgb(${v},${v - 22},${v - 55})`; x.beginPath(); x.ellipse(xx + w / 2, y + h / 2 + (r() - 0.5) * 4, w / 2 - 1.5, h / 2 - 1.5, (r() - 0.5) * 0.3, 0, 7); x.fill(); xx += w; } }, [0.4, 0.4]);   // dry rubble stone
const caneMat = () => cvMat('c_b_cane', x => { x.fillStyle = '#C9A574'; x.fillRect(0, 0, 256, 256); x.strokeStyle = 'rgba(90,60,30,0.55)'; x.lineWidth = 1.2; for (let i = 0; i < 256; i += 6) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); } x.fillStyle = 'rgba(255,240,210,0.35)'; for (let i = 0; i < 256; i += 12) for (let j = 0; j < 256; j += 12) x.fillRect(i + 1, j + 1, 4, 4); }, [0.7, 0.7]);   // woven cane
function bArch(g, a, c, x, y, z, m, ry) { const ms = new THREE.Mesh(new THREE.ShapeGeometry(keyhole(a, c, a + 0.001), 24), m); ms.position.set(x, y, z); ms.rotation.y = ry || 0; ms.receiveShadow = true; g.add(ms); return ms; }   // a round-headed arch, 2a wide, springing at c
function bPendant(g, x, y, z, s) { s = s || 1; const c = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.3, 4), mat('c_cord', 0x222222)); c.position.set(x, y + 0.65 * s + 0.6, z); g.add(c); const sh = new THREE.Mesh(new THREE.SphereGeometry(0.8 * s, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), caneMat()); sh.scale.y = 1.15; sh.position.set(x, y + 0.4 * s, z); g.add(sh); const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat('c_b_bulb', 0xFFE2B8, { emissive: 0xFFB86B, emissiveIntensity: 1.4 })); b.position.set(x, y + 0.2 * s, z); g.add(b); }   // a big woven rattan pendant
function jar(g, x, z, s, m) { s = s || 1; const j = new THREE.Mesh(new THREE.SphereGeometry(0.55 * s, 16, 12), m || mat('c_b_terra', 0xB8734A, { roughness: 0.9 })); j.scale.set(1, 1.15, 1); j.position.set(x, 0.6 * s, z); j.castShadow = true; g.add(j); cyl(g, 0.22 * s, 0.3 * s, 0.25 * s, x, 1.25 * s, z, j.material, 14); }
function bohoCabin(g) {   // 299 (Ibiza refs): warm white lime walls + roof edge, raw timber frames / doors, a round arch over every glass bay with a timber rim
  const lw = bLime(), tm = bTim(); const gl = []; g.traverse(o => { if (!o.isMesh || !o.material || !o.material.color) return; const c = o.material.color.getHex(); if (c === 0xBFDCE6 && o.material.opacity < 0.34) { gl.push(o); return; } if (o.material.map) return;
    if (c === 0xF2F0EB || c === 0x6E6C68 || c === 0xE4E1DA || c === 0x5A564F) o.material = lw; else if (c === 0x2B2B2B || c === 0x9C7650 || c === 0x8B5A2B || c === 0x7A5537) o.material = tm; });
  g.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), B = new THREE.Box3(), V0 = new THREE.Vector3(), V1 = new THREE.Vector3(), ar = new THREE.Group();
  gl.forEach(o => { B.setFromObject(o).applyMatrix4(inv); B.getSize(V0); B.getCenter(V1); const vx = V0.x < 0.3, vz = V0.z < 0.3; if (!(vx || vz) || V0.y < 4.5) return; const w = vx ? V0.z : V0.x, h = V0.y; if (w < 1.6) return;
    const a = w / 2 - 0.3, c0 = Math.max(a * 0.4, h - a - 0.35), geo = new THREE.ShapeGeometry(khWall(w, h, a, c0, a + 0.001), 20);
    [-1, 1].forEach(sg => { const m = new THREE.Mesh(geo, lw); const t = (vx ? V0.x : V0.z) / 2 + 0.03; if (vx) { m.rotation.y = Math.PI / 2; m.position.set(V1.x + sg * t, B.min.y, V1.z); } else m.position.set(V1.x, B.min.y, V1.z + sg * t); ar.add(m);
      const rim = new THREE.Mesh(new THREE.ShapeGeometry(khRim(a, c0, a + 0.001, 0.1), 20), tm); rim.position.copy(m.position); rim.rotation.copy(m.rotation); if (vx) rim.position.x += sg * 0.01; else rim.position.z += sg * 0.01; ar.add(rim); }); });
  g.add(ar); }
function lantern(g, x, y, z, s) { const br = mat('c_brass', 0xB08D57, { metalness: 0.8, roughness: 0.35 }), gl = mat('c_lglow', 0xFFD9A0, { emissive: 0xFFB050, emissiveIntensity: 0.9, transparent: true, opacity: 0.85 }); s = s || 1;
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * s, 0.22 * s, 0.75 * s, 8), gl); b.position.set(x, y, z); g.add(b);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.32 * s, 0.35 * s, 8), br); cap.position.set(x, y + 0.55 * s, z); g.add(cap); const ft = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * s, 0.3 * s, 0.12 * s, 8), br); ft.position.set(x, y - 0.42 * s, z); g.add(ft);
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, r = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.75 * s, 0.03), br); r.position.set(x + Math.cos(a) * 0.27 * s, y, z + Math.sin(a) * 0.27 * s); g.add(r); } }
function pendant(g, x, y, z, kind) { const cord = mat('c_cord', 0x222222);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 4), cord); c.position.set(x, y + 0.6, z); g.add(c);
  if (kind === 'rattan') { const sh = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), mat('c_rattan', 0xB98A4E, { roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: 0.92 })); sh.position.set(x, y - 0.1, z); g.add(sh); }
  else { const gb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 12), mat('c_globe', 0xFFF3DC, { emissive: 0xFFD08A, emissiveIntensity: 0.6, transparent: true, opacity: 0.9 })); gb.position.set(x, y - 0.2, z); g.add(gb); } }
function themeKey() { return THEMES[THEME] && THEMES[THEME].pot != null ? THEME : ''; }
// 273 (owner): cushions that look real — rounded, puffed in the middle along their thinnest side, soft edges and a few wrinkles (geometry cached per size)
const CUSH = {};
function cushGeo(w, h, d) { const k = [w, h, d].map(v => Math.round(v * 20)).join('x'); if (CUSH[k]) return CUSH[k];
  const g = new THREE.BoxGeometry(w, h, d, 16, 8, 16), P = g.attributes.position, A = [w, h, d], ax = A.indexOf(Math.min(...A)), o = [0, 1, 2].filter(i => i !== ax), t = A[ax];
  for (let i = 0; i < P.count; i++) { const v = [P.getX(i), P.getY(i), P.getZ(i)], n = v.map((c, j) => c / (A[j] / 2)), a = n[o[0]], b = n[o[1]], c = n[ax];
    const bulge = Math.max(0, (1 - a * a) * (1 - b * b));   // most in the middle
    v[ax] = Math.sign(c || 1) * (Math.abs(v[ax]) * (0.4 + 0.6 * Math.pow(bulge, 0.6)) + (c > 0 ? t * 0.38 * bulge : t * 0.1 * bulge));   // pillowy faces, thin at the seams
    const pinch = 1 - 0.09 * c * c; v[o[0]] *= pinch; v[o[1]] *= pinch;   // the sides round in toward the seam
    if (c > 0.999 && Math.abs(a) < 0.999 && Math.abs(b) < 0.999) v[ax] += t * 0.07 * Math.sin(a * 7.3 + b * 3.1) * Math.sin(b * 8.7 - a * 2.3) * bulge + t * 0.05 * Math.sin(a * 13.1 - b * 1.7) * (1 - Math.abs(b)) * bulge;   // wrinkles
    P.setXYZ(i, v[0], v[1], v[2]); }
  g.computeVertexNormals(); return (CUSH[k] = g); }
function cush(g, w, h, d, x, y, z, m) { const c = new THREE.Mesh(cushGeo(w, h, d), m); c.position.set(x, y, z); c.castShadow = true; c.receiveShadow = false; g.add(c); return c; }
function cyl(g, r1, r2, h, x, y, z, m, seg = 20) { const c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m); c.position.set(x, y, z); c.castShadow = c.receiveShadow = true; g.add(c); return c; }

const LITE = (() => { try { return matchMedia('(pointer: coarse)').matches || (window.innerWidth || 1000) < 760; } catch (e) { return false; } })();
function ensure(el) {
  if (R && R.el === el) { R.dirty = true; return; }
  if (R) { el.appendChild(R.renderer.domElement); R.el = el; size(); R.dirty = true; return; }
  const renderer = new THREE.WebGLRenderer({ antialias: !LITE, preserveDrawingBuffer: true });   // 256 (owner: heavy on the phone): lighter on phones — fewer pixels, softer shadows off, frames only when something changes
  renderer.setPixelRatio(Math.min(LITE ? 1.5 : 2, window.devicePixelRatio || 1)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = LITE ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  el.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xeef0ea);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  const cam = new THREE.PerspectiveCamera(40, 1, 0.3, 1500), controls = new OrbitControls(cam, renderer.domElement);
  controls.enableDamping = !LITE; controls.dampingFactor = 0.25; controls.maxPolarAngle = Math.PI * 0.62;   /* 259 (owner): no gliding on after the finger lifts; 266: can look up from below (a pergola's ceiling) */ controls.minDistance = 3; controls.maxDistance = 260; controls.screenSpacePanning = true;
  const hemi = new THREE.HemisphereLight(0xffffff, 0xb8ad98, 0.75), sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.castShadow = true; sun.shadow.mapSize.set(LITE ? 1024 : 2048, LITE ? 1024 : 2048); Object.assign(sun.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, far: 400 });
  scene.add(hemi, sun, sun.target);
  R = { renderer, scene, cam, controls, sun, hemi, el, group: null, key: '', view: '3d', ray: new THREE.Raycaster(), floor: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0) };
  const cv = renderer.domElement; cv.style.touchAction = 'none';
  cv.addEventListener('pointerdown', pDown); window.addEventListener('pointermove', pMove); window.addEventListener('pointerup', pUp);
  controls.addEventListener('change', () => { R.dirty = true; if (cam.position.y < 1.4) cam.position.y = 1.4; });   // 266: never under the floor R.dirty = true; R.t0 = 0;
  size(); const loop = t => { R.raf = requestAnimationFrame(loop); const moved = controls.update(); if (moved || R.dirty || (t || 0) - R.t0 > 700) { R.dirty = false; R.t0 = t || 0; renderer.render(scene, cam); } }; loop();
  window.addEventListener('resize', size);
}
function size() { if (!R || !R.el) return; R.dirty = true; const w = R.el.clientWidth || 600, h = R.el.clientHeight || 400; R.renderer.setSize(w, h, false); R.renderer.domElement.style.width = '100%'; R.renderer.domElement.style.height = '100%'; R.cam.aspect = w / h; R.cam.updateProjectionMatrix(); }

// ---- the plot: a terrace (slab, parapet, building, blocks — from the cabin studio) or a lawn with a low boundary
function lawn(g, t) {
  const pw = +t.pw || 30, pd = +t.pd || 60;
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), mat('grass0', 0x8FA26A)); gr.rotation.x = -Math.PI / 2; gr.position.set(pw / 2, -0.02, pd / 2); gr.receiveShadow = true; g.add(gr);
  const in0 = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd), mat('grass1', 0x9DB377)); in0.rotation.x = -Math.PI / 2; in0.position.set(pw / 2, 0, pd / 2); in0.receiveShadow = true; g.add(in0);
  const wl = mat('bwall', 0xE3DDD2), H = 3, T = 0.5;
  box(g, pw, H, T, pw / 2, H / 2, -T / 2, wl); box(g, T, H, pd, -T / 2, H / 2, pd / 2, wl); box(g, T, H, pd, pw + T / 2, H / 2, pd / 2, wl);
  box(g, pw * 0.38, H, T, pw * 0.19, H / 2, pd + T / 2, wl); box(g, pw * 0.38, H, T, pw * 0.81, H / 2, pd + T / 2, wl);   // an opening on the road side
  const rd = mat('road0', 0x6E6C68); box(g, 400, 0.1, 24, pw / 2, -0.06, pd + 15, rd, false);
}

// ---- one common model per category (sized to the item)
// 235: four looks for the same setup — frames, wood, cushions, accents, stone
const THEMES = { modern: { frame: 0x2E2E2E, wood: 0x8C8C8C, wood2: 0x5E5E5E, cush: 0xEDEDED, cush2: 0x3A4A5A, stone: 0xC9C6C0 }, natural: { frame: 0x6B4A2E, wood: 0xA8784C, wood2: 0x7A5537, cush: 0xE8E1D4, cush2: 0x8A9A5B, stone: 0xC8B89A },
  moroccan: { frame: 0x3A2A22, wood: 0x8E5A3A, wood2: 0x6A3F28, cush: 0xF2E2C8, cush2: 0x1F6F7E, stone: 0xD9B48C },
  // 274 (owner): the six themes of the "Pick a theme" step — frames, wood, cushions, accents, stone, pots
  tropical: { frame: 0x4A3020, wood: 0x5A3A24, wood2: 0x3E2818, cush: 0xEFE8DA, cush2: 0x3E6B3A, stone: 0x8C8A84, pot: 0x8C8A84, acc1: 0xB4532E, acc2: 0x3E6B3A, frp: 0x4A3020 },   // 292 (owner locked the Tropical guide): dark wood, grey stone, green; terracotta only as an accent
  turkish: { frame: 0xEDE3D0, wood: 0x5A3B26, wood2: 0x4A2E1E, cush: 0xEFE4D0, cush2: 0xC9AE86, stone: 0xF4EFE6, pot: 0xB8643F, acc1: 0x2F6E73, acc2: 0xB08D57, frp: 0xB8643F },   // 294 (owner locked the Turkish guide): lime white, beige, brass; teal / magenta only as accents
  santorini: { frame: 0x1F4FA8, wood: 0xD8C6A5, wood2: 0xBFAE8E, cush: 0xF7F7F4, cush2: 0x1F4FA8, stone: 0xF6F5F1, pot: 0xC9774A, acc1: 0x1F4FA8, acc2: 0x6FA3D9, frp: 0xF6F5F1 },   // 296 (owner locked the Santorini guide): rough white lime, Aegean blue timber, terracotta urns
  modern: { frame: 0x2A2A2A, wood: 0x9A6A42, wood2: 0x6E4B2F, cush: 0xEFE9DF, cush2: 0xD9D2C5, stone: 0xB7B2AA, pot: 0x2A2A2A, acc1: 0x55634A, acc2: 0x2A2A2A, frp: 0x2A2A2A },   // 298 (owner locked the Modern guide): charcoal, warm teak, warm white / cream, stone grey, warm LED
  contemporary: { frame: 0x8C6A43, wood: 0xB08560, wood2: 0x8C6A4E, cush: 0xEDE6DA, cush2: 0xD8C9A8, stone: 0xD9CDB8, pot: 0xA89A88, acc1: 0x8FA38A, acc2: 0xC26445, frp: 0xA89A88, metal: 1 },
  fusion: { frame: 0x2A2A2A, wood: 0x86583A, wood2: 0x6E4B2F, cush: 0xEDE6DA, cush2: 0xD9C6AC, stone: 0xD9CDB8, pot: 0x8C8A84, acc1: 0x1F7A72, acc2: 0xC9A86C, frp: 0x2A2A2A },   // 300 (owner): Fusion = the base every element sits on (greige, charcoal, teak); each element takes its own theme — FUSION / P.fmix
  boho: { frame: 0x8A6440, wood: 0x9A7450, wood2: 0x7A5A3C, cush: 0xEDE5D8, cush2: 0xD9C6AC, stone: 0xEFE8DD, pot: 0xB8734A, acc1: 0xC9A574, acc2: 0x6B7A4A, frp: 0xEFE8DD },   // 299 (owner's Ibiza refs, 27 Nov): warm white lime, arches with rubble stone, raw timber + reed roof, rattan, terracotta, olive
};
THEMES.modern0 = THEMES.modern;
let THEME = 'natural';
const C = () => { const T = THEMES[THEME] || THEMES.natural, k = '_' + THEME; return {
  frame: mat('c_frame' + k, T.frame, { metalness: 0.4, roughness: 0.5 }), wood: mat('c_wood' + k, T.wood), wood2: mat('c_wood2' + k, T.wood2),
  cush: mat('c_cush' + k, T.cush), cush2: mat('c_cush2' + k, T.cush2), stone: mat('c_stone' + k, T.stone), dark: mat('c_dark', 0x3A3A3A),
  acc1: mat('c_acc1' + k, T.acc1 || 0xC26445, { roughness: 0.95 }), acc2: mat('c_acc2' + k, T.acc2 || 0x55634A, { roughness: 0.95 }), tpot: T.pot != null ? mat('c_tpot' + k, T.pot, { roughness: 0.6 }) : null, frp: mat('c_frp' + k, T.frp != null ? T.frp : 0x3B3D40, { roughness: 0.35, metalness: 0.1 }), themed: T.pot != null,
  leaf: mat('c_leaf', 0x4F7A3A), leaf2: mat('c_leaf2', 0x6B9A4A), water: mat('c_water', 0x6FA8C7, { roughness: 0.15, metalness: 0.1 }), white: mat('c_white', 0xF2EFE8),
  glass: mat('c_glass', 0xBFD9E6, { transparent: true, opacity: 0.35, roughness: 0.05 }), clay: mat('c_clay', 0xB46A4A), pot: mat('c_pot', 0x3D3F41),
}; };
function art() {
  if (M.c_art) return M.c_art;
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const x = cv.getContext('2d');
  const cs = ['#C26445', '#F2C14E', '#3E7CB1', '#55634A', '#E86A92', '#2E2E2E'];
  x.fillStyle = '#EADCC8'; x.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 14; i++) { x.fillStyle = cs[i % cs.length]; x.beginPath(); x.arc((i * 47) % 256, (i * 29) % 128, 18 + (i * 7) % 26, 0, Math.PI * 2); x.fill(); }
  x.strokeStyle = '#2E2E2E'; x.lineWidth = 6; x.beginPath(); for (let i = 0; i < 256; i += 16) x.lineTo(i, 64 + Math.sin(i / 18) * 30); x.stroke();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return (M.c_art = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
}
function rodA(g, a, b, m) { const v = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = v.length(), r = new THREE.Mesh(new THREE.BoxGeometry(0.2, L, 0.2), m); r.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); r.castShadow = true; g.add(r); return r; }
const PL_HEX = { teak: 0x6E4524, walnut: 0x4A2E1A, 'ash grey': 0x8E8A84, charcoal: 0x3A3A3A, 'oak wood grain': 0x9A7448, 'white marble': 0xECEBE6, 'beige marble': 0xD8C8A8, 'black granite': 0x222222,
  'grey granite': 0x7A7A78, terracotta: 0xC26445, olive: 0x55634A, 'matt white': 0xF2F2EE, 'matt black': 0x1E1E1E, 'marble print': 0xDEDBD4 };
function planterModel(g, w, d, h, it, K) {   // 199b: each outrr planter's own shape (battens, slats, cap, plinth, legs, taper, barrel…) at the customer's size, finish colour, plants, LED glow
  const c = it.cfg || {}, code = String(it.cfgId || it.pick).slice(7), hex = PL_HEX[String(c.colour || '').toLowerCase()] || 0x8B5A2B;
  const H = Math.max(1, +h || 2), skin = mat('pl_' + hex.toString(16), hex, { roughness: 0.65 }), dark = mat('pl_dark', 0x2B2B2B, { roughness: 0.6, metalness: 0.3 }), soil = mat('c_soil', 0x4A3626);
  const led = /LED/i.test(Object.values(c.groups || {}).join(' ')), glow = mat('c_led', 0xFFE2A8, { emissive: 0xFFC870, emissiveIntensity: 1.6 });
  const STY = { VT: 'vbat', VB: 'vbat', LS: 'hslat', SC: 'hslat', CB: 'hslat', TP: 'hslat', SS: 'hslat', SP: 'hslat', OF: 'hslat', RL: 'hslat', WS: 'hslat', RH: 'hslat', TT: 'hslat', TL: 'vbat' }[code] || 'plain';
  const leaf = (x, y, z, r) => { [[0, 0, 0, 1], [-0.45, -0.2, 0.15, 0.75], [0.45, -0.15, -0.1, 0.8], [0.1, 0.35, 0.05, 0.7]].forEach(([a, b, e, k], q) => {
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(r * k, 1), q % 2 ? mat('pl_leaf2', 0x4C7F38) : mat('pl_leaf', 0x2F5E26)); f.position.set(x + a * r, y + r * 0.55 + b * r, z + e * r); f.scale.y = 1.25; f.castShadow = true; g.add(f); }); };
  const plants = (x, z, w2, d2, y) => { box(g, w2 - 0.12, 0.05, d2 - 0.12, x, y - 0.06, z, soil); groundCover(g, w2 - 0.2, d2 - 0.2, x, z, y - 0.03); const n = Math.max(1, Math.round(Math.max(w2, d2) / 1.0)), along = w2 >= d2, r = Math.min(Math.min(w2, d2) * 0.36, 0.55);
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n - 0.5; leaf(x + (along ? t * w2 : 0), y, z + (along ? 0 : t * d2), r); } };
  // one box section of the planter: style plain / vertical battens / horizontal slats (dark core in the gaps)
  const body = (x, z, w2, d2, y0, hh, sty, top) => {
    if (sty === 'plain') box(g, w2, hh, d2, x, y0 + hh / 2, z, skin);
    else { box(g, w2 - 0.08, hh, d2 - 0.08, x, y0 + hh / 2, z, dark);
      if (sty === 'vbat') { const bw = 0.22, gap = 0.07, th = 0.06; [[w2, d2 / 2, 0], [w2, -d2 / 2, 0], [d2, w2 / 2, 1], [d2, -w2 / 2, 1]].forEach(([len, off, side]) => { const n = Math.max(2, Math.floor((len + gap) / (bw + gap))), st = len / n;
        for (let k = 0; k < n; k++) { const u = -len / 2 + st * (k + 0.5); side ? box(g, th, hh, st - gap, x + off, y0 + hh / 2, z + u, skin) : box(g, st - gap, hh, th, x + u, y0 + hh / 2, z + off, skin); } }); }
      else { const sh = 0.24, gap = 0.06, n = Math.max(2, Math.floor((hh + gap) / (sh + gap))), st = hh / n; for (let k = 0; k < n; k++) box(g, w2, st - gap, d2, x, y0 + st * (k + 0.5), z, skin); } }
    if (top !== false) plants(x, z, w2, d2, y0 + hh);
  };
  const kickH = 0.28, kick = (x, z, w2, d2, inset) => { box(g, w2 - inset, kickH, d2 - inset, x, kickH / 2, z, dark); if (led) box(g, w2 - inset + 0.06, 0.03, d2 - inset + 0.06, x, 0.02, z, glow); };
  const legs = (x, z, w2, d2, hh) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(g, 0.12, hh, 0.12, x + a * (w2 / 2 - 0.15), hh / 2, z + b * (d2 / 2 - 0.15), dark));
  if (code === 'OC' || code === 'RB') { const r = Math.min(w, d) / 2;
    cyl(g, r * 0.85, r * 0.85, kickH, 0, kickH / 2, 0, dark, code === 'OC' ? 8 : 28); if (led) cyl(g, r * 0.9, r * 0.9, 0.03, 0, 0.02, 0, glow, 28);
    cyl(g, r, r * 0.94, H - kickH, 0, kickH + (H - kickH) / 2, 0, skin, code === 'OC' ? 8 : 32);
    if (code === 'RB') [0.28, 0.72].forEach(t => cyl(g, r * 1.01, r * 1.01, 0.12, 0, kickH + (H - kickH) * t, 0, dark, 32));
    cyl(g, r * 0.9, r * 0.9, 0.05, 0, H - 0.04, 0, soil, 28); leaf(0, H, 0, r * 0.75); return; }
  if (code === 'CW') { const r = Math.min(w, d), q = new THREE.Mesh(new THREE.CylinderGeometry(r, r, H - kickH, 24, 1, false, 0, Math.PI / 2), skin); q.position.set(-w / 2, kickH + (H - kickH) / 2, -d / 2); q.castShadow = true; g.add(q);
    box(g, w * 0.7, kickH, d * 0.7, -w * 0.15, kickH / 2, -d * 0.15, dark); leaf(-w * 0.1, H, -d * 0.1, r * 0.35); return; }
  if (code === 'LC') { const a = Math.min(d, w * 0.45); kick(0, -d / 2 + a / 2, w, a, 0.1); body(0, -d / 2 + a / 2, w, a, kickH, H - kickH, 'plain'); kick(-w / 2 + a / 2, a / 2, a, d - a, 0.1); body(-w / 2 + a / 2, a / 2, a, d - a, kickH, H - kickH, 'plain'); return; }
  if (code === 'DS') { const w1 = w * 0.55, w2 = w * 0.4; kick(-w / 2 + w1 / 2, 0, w1, d, 0.1); body(-w / 2 + w1 / 2, 0, w1, d, kickH, H - kickH, 'plain'); kick(w / 2 - w2 / 2, 0, w2, d * 0.8, 0.1); body(w / 2 - w2 / 2, 0, w2, d * 0.8, kickH, H * 0.5 - kickH, 'plain'); return; }
  if (code === 'TN') { const s3 = [0.38, 0.32, 0.26]; let x0 = -w / 2; s3.forEach((f, k) => { const ww = w * f - 0.1, hh = H * [1, 0.8, 0.62][k]; kick(x0 + ww / 2, 0, ww, Math.min(d, ww), 0.08); body(x0 + ww / 2, 0, ww, Math.min(d, ww), kickH, hh - kickH, 'plain'); x0 += ww + 0.15; }); return; }
  if (code === 'TT') { kick(0, -d / 4, w, d / 2, 0.1); body(0, -d / 4, w, d / 2, kickH, H - kickH, STY); kick(0, d / 4, w, d / 2, 0.1); body(0, d / 4, w, d / 2, kickH, H * 0.55 - kickH, STY); return; }
  if (code === 'SP') { const n = 3, bh = (H - kickH) / n; kick(0, 0, w, d, 0.1); for (let k = 0; k < n; k++) { const f = 1 - k * 0.16; body(0, 0, w * f, d * f, kickH + bh * k, bh, 'hslat', k === n - 1); } return; }
  if (code === 'SS' || code === 'TL') { const th = Math.max(1.6, H * 0.32); kick(0, 0, w, d, 0.1); body(0, 0, w, d, kickH, th - kickH, STY);
    if (code === 'SS') { const n = Math.max(3, Math.floor(w / 0.35)); for (let k = 0; k < n; k++) box(g, w / n - 0.08, H - th, 0.08, -w / 2 + w / n * (k + 0.5), th + (H - th) / 2, -d / 2 + 0.06, skin); box(g, w, 0.1, 0.12, 0, H - 0.05, -d / 2 + 0.06, skin); }
    else { [-1, 1].forEach(a => box(g, 0.08, H - th, 0.08, a * (w / 2 - 0.05), th + (H - th) / 2, -d / 2 + 0.1, dark)); for (let y = th + 0.5; y < H; y += 0.5) box(g, w, 0.04, 0.04, 0, y, -d / 2 + 0.1, dark); for (let x = -w / 2 + 0.5; x < w / 2; x += 0.5) box(g, 0.04, H - th, 0.04, x, th + (H - th) / 2, -d / 2 + 0.1, dark); } return; }
  if (code === 'LG' || code === 'RL') { const lh = code === 'RL' ? H * 0.55 : H * 0.35; legs(0, 0, w, d, lh); if (led) box(g, w - 0.1, 0.03, d - 0.1, 0, lh - 0.02, 0, glow); body(0, 0, w, d, lh, H - lh, STY); return; }
  if (code === 'LN') { kick(0, 0, w, d, 0.1); body(0, 0, w * 0.86, d * 0.86, kickH, H * 0.6 - kickH, 'plain'); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(g, 0.1, H, 0.1, a * (w / 2 - 0.05), H / 2, b * (d / 2 - 0.05), dark)); box(g, w, 0.1, d, 0, H, 0, dark); return; }
  if (code === 'WS') { [-1, 1].forEach(a => box(g, 0.08, 0.6, d, a * (w / 2 - 0.4), H * 0.35, 0, dark)); body(0, 0, w, d, H * 0.4, H * 0.6, STY); return; }
  if (code === 'RH') { box(g, w, 0.06, 0.3, 0, H, -d / 2 - 0.1, dark); body(0, 0, w, d, 0.1, H - 0.1, STY); return; }
  if (code === 'TK' || code === 'TP') { kick(0, 0, w * 0.82, d * 0.82, 0.1); const geo = new THREE.BoxGeometry(w, H - kickH, d), pos = geo.attributes.position;
    for (let k = 0; k < pos.count; k++) if (pos.getY(k) < 0) { pos.setX(k, pos.getX(k) * 0.8); pos.setZ(k, pos.getZ(k) * 0.8); } geo.computeVertexNormals();
    const m2 = new THREE.Mesh(geo, skin); m2.position.y = kickH + (H - kickH) / 2; m2.castShadow = true; g.add(m2);
    if (code === 'TP') for (let y = kickH + 0.3; y < H - 0.1; y += 0.3) { const f = 0.8 + 0.2 * (y - kickH) / (H - kickH); box(g, w * f + 0.01, 0.04, d * f + 0.01, 0, y, 0, dark); }
    plants(0, 0, w, d, H); return; }
  if (code === 'OF') { kick(0, 0, w, d, 0.1); body(0, 0, w - 0.1, d - 0.1, kickH, H - kickH, 'hslat'); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(g, 0.1, H - kickH, 0.1, a * (w / 2 - 0.05), kickH + (H - kickH) / 2, b * (d / 2 - 0.05), dark)); box(g, w, 0.08, d, 0, H, 0, dark); return; }
  // troughs and cubes: kick plinth (recessed more on the floating plinth), body, cap rim on capped designs
  kick(0, 0, w, d, code === 'FP' ? 0.4 : 0.12);
  const cap = ['CB', 'CT', 'DV'].indexOf(code) >= 0, ch = cap ? 0.12 : 0;
  body(0, 0, w, d, kickH, H - kickH - ch, STY, !cap);
  if (cap) { box(g, w + 0.18, ch, d + 0.18, 0, H - ch / 2, 0, skin); plants(0, 0, w, d, H); }
}
// 211: privacy screens — each outrr screen design's own look (CNC jali pattern, slats / louvres, hedge, rope, cane, glass,
// planter + screen) at the customer's running length × height, panel joints (4 / 3 / 2 ft modules) and finish colour.
const PS_HEX = { 'charcoal black': 0x2A2A2A, 'corten rust': 0x8B4A2B, terracotta: 0xC26445, 'off white': 0xEDE8DE, 'antique gold': 0xA88B4A, teak: 0x8A5A32, walnut: 0x5A3A22,
  'ash grey': 0x8E8A84, charcoal: 0x3A3A3A, 'teak wood grain': 0x9A6A3E, 'concrete grey': 0x8C8A86, black: 0x1E1E1E, 'natural bamboo': 0xC9A86A, 'dark walnut bamboo': 0x5A3E26,
  'jute-colour rope': 0xB89A6A, 'charcoal rope': 0x3A3A3A, 'off-white rope': 0xEDE6D8, 'charcoal grey': 0x45474A, 'teak wood finish': 0x8A5A32 };
const PS_JALI = { 'JALI-MUGHAL': 'star', 'JALI-BACKLIT': 'star', 'JALI-DIAMOND': 'diamond', 'JALI-HEXA': 'hexa', 'JALI-QUATRE': 'quatre', 'JALI-RIPPLE': 'ripple', 'JALI-LEAF': 'leaf',
  'JALI-BANYAN': 'tree', 'JALI-BAMBOO': 'bamboo', 'BAL-CHEVRON': 'chevron', 'BAL-LOTUS': 'lotus', 'BAL-PEBBLE': 'pebble', 'FEA-CASCADE': 'cascade', 'FEA-TREE': 'tree', 'FREE-BASKET': 'basket',
  'FREE-GEOGRID': 'geogrid', 'FREE-KOLAM': 'kolam', 'FREE-MANDALA': 'mandala', 'PER-ARABESQUE': 'arch', 'PER-SUNBURST': 'sun', 'PER-VINE': 'vine', 'POOL-REEDS': 'reeds', 'POOL-SCALES': 'scales',
  'UTL-DOTS': 'dots', 'UTL-OPENDIA': 'opendia', 'PLANTER-CLIMBER': 'diamond', 'PLANTER-RIPPLE': 'ripple' };
const PS_MOTIF = { tree: 1, bamboo: 1, cascade: 1, sun: 1, vine: 1, reeds: 1 };   // drawn once per panel (not tiled per foot)
const PS_HEDGE = { 'HEDGE-BOXWOOD': 'box', 'BAL-BOXWOOD': 'box', 'HEDGE-IVY': 'ivy', 'FREE-IVY': 'ivy', 'FEA-FERN': 'fern', 'PER-TROPICAL': 'trop', 'HEDGE-WINDOW': 'box' };
function jaliTex(kind) {   // white = material, transparent = cut-out; one tile = 1 ft square (motifs: one panel)
  const key = 'ps_tx_' + kind; if (M[key]) return M[key];
  const motif = PS_MOTIF[kind], W = motif ? 256 : 128, Hh = motif ? 512 : kind === 'hexa' ? 148 : 128, cv = document.createElement('canvas'); cv.width = W; cv.height = Hh; const x = cv.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, Hh); x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000'; x.strokeStyle = '#000';
  const P = (pts) => { x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.fill(); };
  const C = (a, b, r) => { x.beginPath(); x.arc(a, b, r, 0, Math.PI * 2); x.fill(); };
  const E = (a, b, rx, ry, rot) => { x.beginPath(); x.ellipse(a, b, rx, ry, rot || 0, 0, Math.PI * 2); x.fill(); };
  const solid = (f) => { x.globalCompositeOperation = 'source-over'; x.fillStyle = '#fff'; x.strokeStyle = '#fff'; f(); x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000'; x.strokeStyle = '#000'; };
  const cutAll = (m) => x.fillRect(m, m, W - 2 * m, Hh - 2 * m);
  if (kind === 'star') { [[32, 32], [96, 96], [96, 32], [32, 96]].forEach(([a, b], k) => { const r1 = k < 2 ? 26 : 13, r2 = k < 2 ? 12 : 6, p = []; for (let i = 0; i < 16; i++) { const r = i % 2 ? r2 : r1, t = i * Math.PI / 8; p.push([a + r * Math.cos(t), b + r * Math.sin(t)]); } P(p); }); }
  else if (kind === 'diamond' || kind === 'opendia') { const s = kind === 'opendia' ? 64 : 32, m = kind === 'opendia' ? 7 : 5; for (let a = 0; a <= 128; a += s) for (let b = 0; b <= 128; b += s) { P([[a, b - s / 2 + m], [a + s / 2 - m, b], [a, b + s / 2 - m], [a - s / 2 + m, b]]); P([[a + s / 2, b + m], [a + s - m, b + s / 2], [a + s / 2, b + s - m], [a + m, b + s / 2]]); } }
  else if (kind === 'hexa') { const r = 128 / 6, h3 = r * Math.sqrt(3); for (let row = -1; row < 10; row++) for (let col = -1; col < 4; col++) { const a = col * r * 3 + (row % 2 ? r * 1.5 : 0), b = row * h3 / 2, p = []; for (let i = 0; i < 6; i++) p.push([a + (r - 3.5) * Math.cos(i * Math.PI / 3), b + (r - 3.5) * Math.sin(i * Math.PI / 3)]); P(p); } }
  else if (kind === 'quatre') { [[32, 32], [96, 96], [96, 32], [32, 96]].forEach(([a, b]) => { [[0, -10], [0, 10], [-10, 0], [10, 0]].forEach(([u, v]) => C(a + u, b + v, 11)); }); }
  else if (kind === 'ripple') { x.lineWidth = 11; x.lineCap = 'round'; for (let b = 12; b < 128; b += 32) { x.beginPath(); for (let a = 0; a <= 128; a += 4) x.lineTo(a, b + Math.sin(a / 128 * Math.PI * 2) * 9); x.stroke(); } }
  else if (kind === 'leaf') { [[30, 30, 0.6], [92, 40, -0.7], [60, 86, 0.3], [20, 100, -0.4], [108, 104, 0.9]].forEach(([a, b, r]) => E(a, b, 22, 9, r)); }
  else if (kind === 'chevron') { x.lineWidth = 10; for (let b = -16; b < 160; b += 32) { x.beginPath(); x.moveTo(0, b); x.lineTo(64, b - 24); x.lineTo(128, b); x.stroke(); } }
  else if (kind === 'lotus') { [[32, 40], [96, 40], [64, 100], [0, 100], [128, 100]].forEach(([a, b]) => { E(a, b, 6, 16); E(a - 10, b + 4, 5, 13, -0.6); E(a + 10, b + 4, 5, 13, 0.6); }); }
  else if (kind === 'pebble') { [[26, 22, 20, 12, 0.2], [86, 26, 24, 13, -0.3], [48, 66, 22, 14, 0.5], [104, 76, 18, 12, 0.1], [24, 104, 18, 11, -0.2], [78, 112, 24, 12, 0.3]].forEach(e => E(...e)); }
  else if (kind === 'basket') { for (let a = 0; a < 128; a += 32) for (let b = 0; b < 128; b += 32) { const v = ((a + b) / 32) % 2; v ? x.fillRect(a + 6, b + 3, 20, 10) : x.fillRect(a + 3, b + 6, 10, 20); v ? x.fillRect(a + 6, b + 19, 20, 10) : x.fillRect(a + 19, b + 6, 10, 20); } }
  else if (kind === 'geogrid') { [[5, 5, 54, 30], [65, 5, 58, 54], [5, 41, 26, 38], [37, 41, 22, 18], [37, 65, 22, 14], [5, 85, 54, 38], [65, 65, 26, 58], [97, 65, 26, 26], [97, 97, 26, 26]].forEach(r => x.fillRect(...r)); }
  else if (kind === 'kolam') { [[32, 32], [96, 96], [96, 32], [32, 96]].forEach(([a, b]) => { C(a, b, 6); x.lineWidth = 6; x.beginPath(); x.arc(a, b, 20, 0, Math.PI * 2); x.stroke(); }); [[64, 64], [0, 64], [64, 0], [128, 64], [64, 128]].forEach(([a, b]) => C(a, b, 7)); }
  else if (kind === 'mandala') { const a = 64, b = 64; C(a, b, 10); for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4; E(a + Math.cos(t) * 28, b + Math.sin(t) * 28, 12, 6, t); E(a + Math.cos(t + 0.39) * 50, b + Math.sin(t + 0.39) * 50, 7, 4, t); } [[0, 0], [128, 0], [0, 128], [128, 128]].forEach(([u, v]) => C(u, v, 12)); }
  else if (kind === 'arch') { [[8, 56], [72, 56]].forEach(([a, b]) => { x.beginPath(); x.moveTo(a, b + 60); x.lineTo(a, b); x.quadraticCurveTo(a, b - 30, a + 24, b - 46); x.quadraticCurveTo(a + 48, b - 30, a + 48, b); x.lineTo(a + 48, b + 60); x.closePath(); x.fill(); }); }
  else if (kind === 'scales') { x.lineWidth = 7; for (let row = 0; row < 7; row++) for (let col = -1; col < 5; col++) { const a = col * 32 + (row % 2 ? 16 : 0), b = row * 21.33; x.beginPath(); x.arc(a + 16, b, 12, 0.15, Math.PI - 0.15); x.stroke(); } }
  else if (kind === 'dots') { for (let a = 10.67; a < 128; a += 21.33) for (let b = 10.67; b < 128; b += 21.33) C(a, b, 7); }
  else if (kind === 'tree') { cutAll(10); solid(() => { x.lineCap = 'round'; x.lineWidth = 22; x.beginPath(); x.moveTo(128, 512); x.lineTo(128, 250); x.stroke();
      const br = (a, b, l, t, w, d) => { if (d > 5) return; const a2 = a + Math.cos(t) * l, b2 = b - Math.sin(t) * l; x.lineWidth = w; x.beginPath(); x.moveTo(a, b); x.lineTo(a2, b2); x.stroke(); br(a2, b2, l * 0.72, t + 0.5, w * 0.68, d + 1); br(a2, b2, l * 0.72, t - 0.5, w * 0.68, d + 1); if (d > 2) { x.beginPath(); x.ellipse(a2, b2, 12, 7, t, 0, 7); x.fill(); } };
      br(128, 260, 90, Math.PI / 2, 16, 0); [[50, 470, 0.3], [206, 470, -0.3]].forEach(([a, b, t]) => { x.lineWidth = 7; x.beginPath(); x.moveTo(128, 470); x.quadraticCurveTo((a + 128) / 2, b - 30, a, b + 30); x.stroke(); }); }); }
  else if (kind === 'bamboo' || kind === 'reeds') { cutAll(8); solid(() => { const n = kind === 'reeds' ? 9 : 6; for (let i = 0; i < n; i++) { const a = 18 + i * (220 / (n - 1)); x.lineWidth = kind === 'reeds' ? 7 : 15; x.beginPath(); x.moveTo(a, 512); x.quadraticCurveTo(a + (i % 2 ? 14 : -14), 256, a + (i % 2 ? -6 : 6), 20); x.stroke();
      if (kind === 'bamboo') { for (let b = 60; b < 500; b += 70) { x.fillRect(a - 10, b, 20, 5); x.beginPath(); x.ellipse(a + (i % 2 ? 24 : -24), b - 12, 22, 6, i % 2 ? -0.5 : 0.5, 0, 7); x.fill(); } } else { x.beginPath(); x.ellipse(a, 30, 6, 26, 0, 0, 7); x.fill(); } } }); }
  else if (kind === 'cascade') { x.lineWidth = 16; x.lineCap = 'round'; for (let a = 28; a < 256; a += 50) { x.beginPath(); for (let b = 16; b <= 496; b += 6) x.lineTo(a + Math.sin(b / 60) * 14, b); x.stroke(); } }
  else if (kind === 'sun') { const a = 128, b = 520; for (let i = 0; i < 9; i++) { const t0 = Math.PI * (0.06 + i * 0.1), t1 = t0 + 0.06; P([[a + Math.cos(t0) * 80, b - Math.sin(t0) * 80], [a + Math.cos(t0) * 560, b - Math.sin(t0) * 560], [a + Math.cos(t1) * 560, b - Math.sin(t1) * 560], [a + Math.cos(t1) * 80, b - Math.sin(t1) * 80]]); } }
  else if (kind === 'vine') { cutAll(8); solid(() => { [70, 186].forEach((a, k) => { x.lineWidth = 9; x.beginPath(); for (let b = 512; b >= 10; b -= 6) x.lineTo(a + Math.sin(b / 50 + k) * 26, b); x.stroke();
      for (let b = 470; b > 30; b -= 38) { const c = a + Math.sin(b / 50 + k) * 26, s = (b / 38) % 2 ? 1 : -1; x.beginPath(); x.ellipse(c + s * 20, b, 18, 8, s * 0.5, 0, 7); x.fill(); } }); }); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData.ar = Hh / W; return (M[key] = t);
}
function hedgeTex(kind) {
  const key = 'ps_hd_' + kind; if (M[key]) return M[key];
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d');
  const base = { box: '#2F5A24', ivy: '#355E2A', fern: '#2C5226', trop: '#2F6230' }[kind] || '#2F5A24', cs = { box: ['#3E7230', '#4C8238', '#2A5020', '#5A9142'], ivy: ['#4C7A36', '#6B9A4A', '#2E5A26', '#7FA85A'], fern: ['#2E5A28', '#4F7F3A', '#6E9A50', '#22461E'], trop: ['#3F8038', '#5FA048', '#2C5E2A', '#8DBA5E'] }[kind] || ['#3E7230', '#4C8238'];
  x.fillStyle = base; x.fillRect(0, 0, 256, 256); let s = 7; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const n = kind === 'trop' ? 90 : 900; for (let i = 0; i < n; i++) { x.fillStyle = cs[i % cs.length]; x.beginPath(); const r = kind === 'trop' ? 14 + rnd() * 18 : kind === 'box' ? 2 + rnd() * 4 : 4 + rnd() * 6; x.ellipse(rnd() * 256, rnd() * 256, r, r * (kind === 'box' ? 1 : 0.5), rnd() * 6, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return (M[key] = t);
}
function canePlane(hex) {   // a woven cane panel
  const key = 'ps_cane'; if (!M[key]) { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 64);
    x.globalCompositeOperation = 'destination-out'; for (let a = 0; a < 64; a += 16) for (let b = 0; b < 64; b += 16) { x.beginPath(); x.arc(a + 8, b + 8, 4.5, 0, 7); x.fill(); x.beginPath(); x.arc(a, b, 2.5, 0, 7); x.fill(); }
    x.globalCompositeOperation = 'source-over'; x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 2.5; for (let a = 0; a < 64; a += 8) { x.beginPath(); x.moveTo(a, 0); x.lineTo(a + 32, 64); x.stroke(); x.beginPath(); x.moveTo(a + 32, 0); x.lineTo(a, 64); x.stroke(); }
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; M[key] = t; }
  return M[key];
}
function texPlane(g, tex, w, h, rx, ry, x0, y0, z, m) {   // a double-sided plane w × h with the texture tiled rx × ry, bottom-left at (x0, y0)
  const geo = new THREE.PlaneGeometry(w, h), uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * rx, uv.getY(i) * ry);
  const p = new THREE.Mesh(geo, m); p.position.set(x0 + w / 2, y0 + h / 2, z); p.castShadow = true; p.receiveShadow = true; g.add(p); return p;
}
function psPanels(L, sizes) {   // 4 / 3 / 2 ft modules for a run, biggest first (the last one takes the rest)
  const sz = (sizes && sizes.length ? sizes : [4]).slice().sort((a, b) => b - a), out = []; let left = Math.max(0.5, L);
  while (left > 0.01 && out.length < 60) { const s = sz.find(v => v <= left + 0.01) || left; out.push(Math.min(s, left)); left -= Math.min(s, left); }
  return out;
}
export function screenModel(g, w, h, it, K) {
  const c = it.cfg || {}, code = String(it.cfgId || it.pick || '').replace(/^MTO-/, '').replace(/^P[ST]-/, ''), col = String(c.colour || '').toLowerCase(), mat0 = String(c.material || '');
  const H = Math.max(0.8, +h || 3), L = Math.max(1, +w || 8), P = (typeof PRODS !== 'undefined' ? PRODS : window.PRODS || {})[it.cfgId || it.pick], cz = (P && P.cz) || {};
  let hex = PS_HEX[col];
  const fam = PS_JALI[code] ? 'jali' : PS_HEDGE[code] ? 'hedge' : /LOUV-VERT|POOL-CLOSEVERT|WPC-VCLOSE|WPC-VSLAT|LOUV-RHYTHM|FREE-RHYTHM|STAGGER-SLAT|PLANTER-SLAT|BAL-FINS|PIVOT/.test(code) ? 'vslat'
    : /LOUV-HORZ|PER-SLAT|UTL-SLAT|WPC-HBOARD|WPC-LOUVRE/.test(code) ? 'hslat' : /WPC-SKYLINE/.test(code) ? 'skyline' : /WPC-PANEL/.test(code) ? 'panel' : /WPC-MIX/.test(code) ? 'wpcmix' : /ROPE/.test(code) ? 'rope' : /CANE/.test(code) ? 'cane' : /GLASS/.test(code) ? 'glass' : /BAMBOO-POLE/.test(code) ? 'poles' : /MIX-PANEL/.test(code) ? 'mix' : 'vslat';
  if (hex == null) hex = /WPC|LOUV|SLAT|FINS|RHYTHM/.test(code) || /WPC/.test(mat0) ? 0x8A5A32 : /corten|rust/i.test(mat0 + col) || /BACKLIT|RIPPLE/.test(code) ? 0x8B4A2B : /cane/i.test(col) ? 0xC8A877 : 0x2A2A2A;
  if (/HPL/.test(mat0) && PS_HEX[col] == null) hex = 0x9A6A3E;
  const skin = mat('ps_' + hex.toString(16), hex, { roughness: 0.6, metalness: /MS|Alumin/i.test(mat0) && !/WPC|HPL/.test(mat0) ? 0.3 : 0.05, side: THREE.DoubleSide });
  const frameHex = /slat|hedge|rope|cane|glass|poles|mix|skyline|panel/.test(fam) || (fam === 'jali' && /WPC|HPL/.test(mat0)) ? 0x262626 : hex;
  const fr = mat('ps_fr_' + frameHex.toString(16), frameHex, { roughness: 0.5, metalness: 0.35 });
  const sizes = cz.panels && cz.panels.sizes, mods = psPanels(L, sizes), T = 0.16;   // ~50 mm posts / rails
  // planter base (planter screens): a trough along the run, the screen rises from it
  let y0 = 0; if (/PLANTER|BAMBOO-POLE/.test(code)) { const ph = Math.min(1.6, H * 0.35), pd = 1.2, pm = /SLAT/.test(code) ? skin : /BAMBOO-POLE/.test(code) ? mat('ps_blk', 0x1E1E1E, { roughness: 0.6 }) : mat('ps_rust', 0x8B4A2B, { roughness: 0.75, metalness: 0.2 });
    box(g, L, ph, pd, 0, ph / 2, 0, pm); box(g, L - 0.15, 0.05, pd - 0.15, 0, ph - 0.03, 0, mat('c_soil', 0x4A3626));
    const n = Math.max(2, Math.round(L / 0.7)); for (let i = 0; i < n; i++) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 0), i % 2 ? K.leaf : K.leaf2); f.position.set(-L / 2 + L * (i + 0.5) / n, ph + 0.22, (i % 3 - 1) * 0.25); f.scale.y = /BAMBOO/.test(code) ? 1.6 : 1.1; g.add(f); }
    y0 = ph; }
  const SH = H - y0;
  // posts at every joint + top / bottom rails (free-standing / parapet)
  let x = -L / 2; const xs = [x]; mods.forEach(m => { x += m; xs.push(x); });
  if (fam !== 'skyline') { xs.forEach(px => box(g, T, SH, T, Math.max(-L / 2 + T / 2, Math.min(L / 2 - T / 2, px)), y0 + SH / 2, 0, fr)); if (!/poles|rope/.test(fam)) { box(g, L, T * 0.8, T, 0, y0 + SH - T * 0.4, 0, fr); box(g, L, T * 0.8, T, 0, y0 + T * 0.4, 0, fr); } }
  const iy = y0 + T * 0.8, ih = SH - T * 1.6;   // the infill between the rails
  const each = (f) => { for (let k = 0; k < mods.length; k++) { const a = xs[k] + T / 2, b = xs[k + 1] - T / 2; if (b - a > 0.05) f(a, b, k); } };
  if (fam === 'jali') {
    const kind = PS_JALI[code], t = jaliTex(kind), key = 'ps_j_' + kind + '_' + hex.toString(16);
    const jm = M[key] || (M[key] = new THREE.MeshStandardMaterial({ color: hex, map: t, alphaTest: 0.5, transparent: false, side: THREE.DoubleSide, roughness: 0.55, metalness: /WPC|HPL/.test(mat0) ? 0.05 : 0.3 }));
    each((a, b, k) => { const pw = b - a; if (code === 'HEDGE-WINDOW') return; texPlane(g, t, pw, ih, PS_MOTIF[kind] ? 1 : pw, PS_MOTIF[kind] ? 1 : ih / (t.userData.ar || 1), a, iy, 0, jm); });
    if (code === 'JALI-BACKLIT') { const gl = mat('c_led', 0xFFE2A8, { emissive: 0xFFC870, emissiveIntensity: 1.6 }); box(g, L - 0.2, ih, 0.04, 0, iy + ih / 2, -0.18, gl); box(g, L, ih + T, 0.06, 0, iy + ih / 2, -0.24, fr); }
    if (code === 'PLANTER-CLIMBER') for (let i = 0; i < Math.round(L / 1.5); i++) { const v = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 0), K.leaf2); v.position.set(-L / 2 + 0.75 + i * 1.5, iy + ih * (0.3 + (i % 3) * 0.2), 0.08); v.scale.set(1, 2.2, 0.5); g.add(v); }
  } else if (fam === 'hedge') {
    const kind = PS_HEDGE[code], t = hedgeTex(kind), hm = M['ps_h_' + kind] || (M['ps_h_' + kind] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }));
    each((a, b, k) => { const pw = b - a, mid = code === 'HEDGE-WINDOW' && k === Math.floor(mods.length / 2);
      if (mid) { const t2 = jaliTex('leaf'), wm = M['ps_jw_' + hex.toString(16)] || (M['ps_jw_' + hex.toString(16)] = new THREE.MeshStandardMaterial({ color: hex, map: t2, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.3 })); texPlane(g, t2, pw, ih, pw, ih, a, iy, 0, wm); return; }
      const bx = new THREE.Mesh(new THREE.BoxGeometry(pw, ih, 0.32), hm), uv = bx.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * pw / 2, uv.getY(i) * ih / 2);
      bx.position.set(a + pw / 2, iy + ih / 2, 0); bx.castShadow = bx.receiveShadow = true; g.add(bx); });
  } else if (fam === 'vslat') {
    const rh = /RHYTHM/.test(code), stag = /STAGGER/.test(code), fin = /FINS/.test(code), piv = /PIVOT/.test(code), close = /CLOSEVERT|VCLOSE/.test(code);
    const sw = piv ? 0.5 : fin ? 0.4 : 0.16, gap = close ? 0.05 : /VSLAT/.test(code) && /Open/.test(JSON.stringify(c.groups || {})) ? 0.13 : 0.13;
    each((a, b) => { let u = a + 0.04, k = 0; while (u < b - 0.05) { const ww = rh ? (k % 3 === 2 ? 0.32 : 0.12) : sw, z = stag && k % 2 ? 0.14 : 0, bb = box(g, Math.min(ww, b - u), ih, piv ? 0.06 : 0.1, u + Math.min(ww, b - u) / 2, iy + ih / 2, z, skin);
      if (fin || piv) bb.rotation.y = piv ? 0.9 : 0.6; u += ww + (fin ? 0.18 : piv ? 0.12 : rh ? 0.1 : gap); k++; } });
    if (stag) box(g, L - 0.2, 0.04, 0.06, 0, y0 + 0.12, 0.12, mat('c_led', 0xFFE2A8, { emissive: 0xFFC870, emissiveIntensity: 1.6 }));
  } else if (fam === 'hslat') {
    const lv = /WPC-LOUVRE/.test(code), bd = /HBOARD/.test(code), wide = /UTL-SLAT/.test(code), sh = lv ? 0.42 : bd ? 0.45 : 0.17, gap = lv ? 0.12 : bd ? 0.04 : wide ? 0.2 : 0.13;
    each((a, b) => { for (let v = iy + 0.03; v < iy + ih - 0.05; v += sh + gap) { const hh = Math.min(sh, iy + ih - v), bb = box(g, b - a, hh, lv ? 0.04 : 0.08, (a + b) / 2, v + hh / 2, 0, skin); if (lv) bb.rotation.x = -0.6; } });
  } else if (fam === 'rope') {
    const rm = mat('ps_rope_' + hex.toString(16), hex, { roughness: 0.95 }); box(g, L, T, T, 0, y0 + SH - T / 2, 0, fr); box(g, L, T, T, 0, y0 + T / 2, 0, fr);
    for (let u = -L / 2 + 0.12; u < L / 2 - 0.05; u += 0.12) cyl(g, 0.03, 0.03, SH - T * 2, u, y0 + SH / 2, 0, rm, 6);
  } else if (fam === 'cane') {
    const caneHex = 0xC8A877, t = canePlane(), cm = M['ps_cane_m'] || (M['ps_cane_m'] = new THREE.MeshStandardMaterial({ color: caneHex, map: t, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }));
    if (/teak/.test(col)) xs.forEach(px => box(g, T + 0.01, SH, T + 0.01, Math.max(-L / 2 + T / 2, Math.min(L / 2 - T / 2, px)), y0 + SH / 2, 0, mat('ps_8a5a32', 0x8A5A32, { roughness: 0.6 })));
    each((a, b) => texPlane(g, t, b - a, ih, (b - a) * 3, ih * 3, a, iy, 0, cm));
  } else if (fam === 'glass') {
    const gm = mat('ps_glass', 0xDCE8EC, { transparent: true, opacity: 0.55, roughness: 0.25, side: THREE.DoubleSide });
    each((a, b, k) => { if (k % 2) for (let u = a + 0.04; u < b - 0.05; u += 0.3) box(g, 0.18, ih, 0.1, u + 0.09, iy + ih / 2, 0, skin); else { box(g, b - a, ih, 0.04, (a + b) / 2, iy + ih / 2, 0, gm); for (let u = a + 0.06; u < b - 0.02; u += 0.1) box(g, 0.012, ih, 0.05, u, iy + ih / 2, 0, mat('ps_flute', 0xC4D4DA, { transparent: true, opacity: 0.6 })); } });
  } else if (fam === 'poles') {
    const pm = mat('ps_bam_' + hex.toString(16), hex === 0x2A2A2A ? 0xC9A86A : hex, { roughness: 0.6 }); for (let u = -L / 2 + 0.12; u < L / 2 - 0.05; u += 0.2) { cyl(g, 0.08, 0.09, SH, u, y0 + SH / 2, 0, pm, 10); for (let v = y0 + 0.8; v < H; v += 1.1) cyl(g, 0.095, 0.095, 0.05, u, v, 0, mat('ps_bamj', 0x8A6A3A), 10); }
  } else if (fam === 'mix') {
    const t = jaliTex('star'), jm = M['ps_j_star_' + hex.toString(16)] || (M['ps_j_star_' + hex.toString(16)] = new THREE.MeshStandardMaterial({ color: hex, map: t, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.3 })), ht = hedgeTex('box'), hm = M.ps_h_box || (M.ps_h_box = new THREE.MeshStandardMaterial({ map: ht, roughness: 0.95 })), wm = mat('ps_8a5a32', 0x8A5A32, { roughness: 0.6 });
    each((a, b, k) => { const z = k % 2 ? 0.2 : 0, pw = b - a; if (k % 3 === 0) { const bx = new THREE.Mesh(new THREE.BoxGeometry(pw, ih, 0.3), hm); bx.position.set(a + pw / 2, iy + ih / 2, z); g.add(bx); } else if (k % 3 === 1) { for (let v = iy + 0.03; v < iy + ih - 0.05; v += 0.3) box(g, pw, 0.17, 0.08, a + pw / 2, v + 0.085, z, wm); } else texPlane(g, t, pw, ih, pw, ih, a, iy, z, jm); });
  } else if (fam === 'skyline') {
    each((a, b, k) => { const hh = SH * [1, 0.78, 0.9, 0.66, 0.84][k % 5]; box(g, b - a + T, hh, 0.12, (a + b) / 2, y0 + hh / 2, 0, skin); box(g, T, hh, T, a - T / 2, y0 + hh / 2, 0.08, fr); });
  } else if (fam === 'wpcmix') {
    const two = /2 : 1/.test(JSON.stringify(c.groups || {}));
    each((a, b, k) => { if (two ? k % 3 !== 2 : k % 2 === 0) box(g, b - a, ih, 0.1, (a + b) / 2, iy + ih / 2, 0, skin); else for (let v = iy + 0.03; v < iy + ih - 0.05; v += 0.3) box(g, b - a, 0.17, 0.08, (a + b) / 2, v + 0.085, 0, skin); });
  } else if (fam === 'panel') {
    each((a, b) => { for (let v = iy + 0.03; v < iy + ih - 0.05; v += 0.3) box(g, b - a, 0.17, 0.08, (a + b) / 2, v + 0.085, 0, skin); });
    xs.forEach(px => box(g, 0.7, 0.04, 0.7, Math.max(-L / 2 + 0.35, Math.min(L / 2 - 0.35, px)), 0.02, 0, fr));
  }
}
const NOLABEL = new Set(['pathway', 'turf', 'lights', 'planter']);   // 224: small or many — no tag over each
// 258: a built-in planter box (masonry + soil + leafy plants) and a warm cove strip glowing on the floor under an edge (night)
let GC = null; function groundCover(g, w, d, x, z, y, seed) {   // 268 (owner): low ground cover over the soil, a little spilling over the edge — no bare soil
  if (!GC) GC = { geo: new THREE.IcosahedronGeometry(0.2, 0), m: [mat('gc_1', 0x4F8A3A, { roughness: 0.8, flatShading: true }), mat('gc_2', 0x6FA44A, { roughness: 0.8, flatShading: true }), mat('gc_3', 0x3C6E2E, { roughness: 0.8, flatShading: true })], f: mat('gc_f', 0xF3E9F5, { roughness: 0.7 }) };
  let sd = Math.abs(Math.round(x * 31 + z * 17 + w * 7 + (seed || 0))) + 3; const rnd = () => (sd = (sd * 9301 + 49297) % 233280) / 233280, area = Math.max(0.5, w * d), n = Math.min(LITE ? 50 : 90, Math.max(6, Math.round(area * (LITE ? 4 : 6)))), per = Math.ceil(n / 3), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), Sc = new THREE.Vector3();
  GC.m.forEach((m, k) => { const im = new THREE.InstancedMesh(GC.geo, m, per); for (let i = 0; i < per; i++) { const edge = rnd() < 0.22, u = edge ? (rnd() < 0.5 ? -0.5 : 0.5) : rnd() - 0.5, v = rnd() - 0.5, sw = rnd() < 0.5; let px = sw ? u * w : (rnd() - 0.5) * w, pz = sw ? v * d : u * d;
      if (edge) { if (sw) px += Math.sign(px) * 0.08; else pz += Math.sign(pz) * 0.08; } const sc = 0.7 + rnd() * 0.8; Sc.set(sc * 1.3, sc * (edge ? 0.9 : 0.55), sc * 1.3); E.set(edge ? (rnd() - 0.5) * 0.8 : 0, rnd() * 6.28, edge ? (rnd() - 0.5) * 0.8 : 0); Q.setFromEuler(E); V.set(x + px, y + (edge ? -0.06 : 0.04), z + pz); M.compose(V, Q, Sc); im.setMatrixAt(i, M); }
    im.castShadow = false; im.receiveShadow = !LITE; g.add(im); });
  { const np = Math.min(LITE ? 6 : 12, Math.max(1, Math.round(area / (LITE ? 2.2 : 1.3)))), cols = Math.max(1, Math.round(Math.sqrt(np * w / Math.max(0.3, d)))), rows = Math.max(1, Math.ceil(np / cols));   // 284 (owner): real ground-cover plants, not only green bits
    for (let i = 0; i < np; i++) { const c = i % cols, r = Math.floor(i / cols), k = GCK[(Math.floor(rnd() * 97) + i) % GCK.length], edge = k === 'MONEYPLANT' || k === 'CHLOROPHYTUM', m = noSh(plantModel(THREE, k, k === 'DRACAENA' || k === 'ZZ' ? 1.5 : 1.2, { pot: 'none', seed: 2 }));
      m.position.set(x + (-w / 2 + w * (c + 0.5) / cols) + (rnd() - 0.5) * 0.25, y - 0.02, z + (-d / 2 + d * (r + 0.5) / rows) + (rnd() - 0.5) * 0.25); m.rotation.y = rnd() * 6.28; m.scale.setScalar(edge ? 0.75 : 0.6); g.add(m); } }
  if (!LITE) { const nf = Math.round(n / 8), fl = new THREE.InstancedMesh(GC.geo, GC.f, Math.max(1, nf)); for (let i = 0; i < Math.max(1, nf); i++) { Sc.set(0.25, 0.25, 0.25); Q.identity(); V.set(x + (rnd() - 0.5) * w, y + 0.14, z + (rnd() - 0.5) * d); M.compose(V, Q, Sc); fl.setMatrixAt(i, M); } g.add(fl); } }
function pbox(g, bw, bd, x, z, ht, pm) { box(g, bw, ht, bd, x, ht / 2, z, pm || C().stone); box(g, bw - 0.2, 0.08, bd - 0.2, x, ht + 0.02, z, mat('pb_soil', 0x4A3A2A)); groundCover(g, bw - 0.25, bd - 0.25, x, z, ht + 0.06);
  let sd = Math.abs(Math.round(x * 7 + z * 13 + bw * 3)) + 1; const rnd = () => (sd = (sd * 9301 + 49297) % 233280) / 233280, lng = Math.max(bw, bd), along = bw >= bd, n = Math.max(1, Math.round(lng / (LITE ? 2.6 : 2)));   // 262 (owner): our real plant models, a tropical mix (few kinds, cached)
  if (themeKey() === 'tropical') { const nb = Math.max(1, Math.round(lng / (LITE ? 2.2 : 1.6))), off = (along ? bd : bw) * 0.22;   // 293 (owner): tropical troughs loaded — tall leaves at the back, colour in front
    for (let i = 0; i < nb; i++) { const u = -lng / 2 + lng * (i + 0.5) / nb, kb = TROP_LB[(i + Math.floor(rnd() * 7)) % TROP_LB.length], kf = TROP_LF[(i * 3 + Math.floor(rnd() * 5)) % TROP_LF.length];
      const mb = noSh(plantModel(THREE, kb, 3.2 + (i % 3) * 0.8, { pot: 'none', seed: 1 })); mb.position.set(x + (along ? u : -off), ht, z + (along ? -off : u)); mb.rotation.y = rnd() * 6.28; g.add(mb);
      const mf = noSh(plantModel(THREE, kf, 1.6 + (i % 2) * 0.5, { pot: 'none', seed: 2 })); mf.position.set(x + (along ? u + lng / nb / 2 : off), ht, z + (along ? off : u + lng / nb / 2)); mf.rotation.y = rnd() * 6.28; g.add(mf); } return; }
  for (let i = 0; i < n; i++) { const k = TROP_S[(Math.floor(rnd() * 97) + i) % TROP_S.length], u = -lng / 2 + lng * (i + 0.5) / n, m = noSh(plantModel(THREE, k, 1.8 + (i % 2) * 1, { pot: 'none', seed: 1 })); m.position.set(x + (along ? u : 0), ht, z + (along ? 0 : u)); m.rotation.y = rnd() * 6.28; g.add(m); } }
const GCK = ['CHLOROPHYTUM', 'SYNGONIUM', 'MONEYPLANT', 'ZZ', 'DRACAENA'];   // 284 (owner): ground cover + living walls
const TROP_LB = ['BIRDPARADISE', 'ARECA', 'BANANA', 'FISHTAIL', 'CORDYLINE'], TROP_LF = ['CROTON', 'SONGOFINDIA', 'SCHEFFLERA', 'IXORA'];   // 293
const TROP_S = ['SNAKEPLANT', 'CROTON', 'RHAPIS', 'FOUNTAINGRASS'], TROP_B = ['ARECA', 'BIRDPARADISE', 'RHAPIS', 'FISHTAIL'];   // 263: few kinds → shared, light
const noSh = m => { if (LITE) m.traverse(o => { o.castShadow = false; }); return m; };
let COVT = null; function coveStrip(g, bw, bd, x, z, y) { if (!R) return;   // 268 (owner): a soft warm line of light on the floor just outside each edge (was a lit square under the whole thing)
  if (!COVT) { const c = document.createElement('canvas'); c.width = 4; c.height = 64; const q = c.getContext('2d'), gr = q.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(255,176,96,.85)'); gr.addColorStop(0.35, 'rgba(255,176,96,.35)'); gr.addColorStop(1, 'rgba(255,176,96,0)'); q.fillStyle = gr; q.fillRect(0, 0, 4, 64); COVT = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }); }
  const W0 = 0.9; [[bw, 0, bd / 2, 0], [bw, 0, -bd / 2, Math.PI], [bd, bw / 2, 0, Math.PI / 2], [bd, -bw / 2, 0, -Math.PI / 2]].forEach(([L, ox, oz, ry]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(L, W0), COVT); m.rotation.order = 'YXZ'; m.rotation.y = ry; m.rotation.x = -Math.PI / 2; m.position.set(x + ox + Math.sin(ry) * W0 / 2, y || 0.03, z + oz + Math.cos(ry) * W0 / 2); m.visible = !!R.night; m.userData.nightOnly = 1; g.add(m); (R.nl || (R.nl = [])).push(m); });
  if (!COVT.c) { const c = document.createElement('canvas'); c.width = c.height = 128; const q = c.getContext('2d'), gr = q.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,176,96,.85)'); gr.addColorStop(0.35, 'rgba(255,176,96,.35)'); gr.addColorStop(1, 'rgba(255,176,96,0)'); q.fillStyle = gr; q.fillRect(0, 0, 128, 128); COVT.c = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }); }
  [[1, 1, -Math.PI / 2], [1, -1, 0], [-1, -1, Math.PI / 2], [-1, 1, Math.PI]].forEach(([sx, sz, t0]) => { const m = new THREE.Mesh(new THREE.CircleGeometry(W0, 12, t0, Math.PI / 2), COVT.c); m.rotation.x = -Math.PI / 2; m.position.set(x + sx * bw / 2, (y || 0.03) - 0.001, z + sz * bd / 2); m.visible = !!R.night; m.userData.nightOnly = 1; g.add(m); R.nl.push(m); }); }   // 302 (owner): the glow turns round each corner instead of stopping square
export function generic(cat, w, d, h, it) {   // centred on (0, 0), on the floor; w along x, d along z (the back is -z)
  const g = new THREE.Group(), K = C();
  if (cat === 'sofa') {   // 261 (owner): a sleek rope sofa set — slim charcoal frame, woven rope back and arms, off-white cushions; pieces as ticked (sofaLayout)
    const L = sofaLayout(it && it.sconf), sx = w / (L.w || w), sz = d / (L.d || d), root = new THREE.Group(); root.scale.set(sx, 1, sz); g.add(root); const SD = 2.6;
    const fr = K.themed ? K.frame : mat('c_ropefr', 0x2B2B2B, { roughness: 0.5, metalness: 0.3 }), cu = K.themed ? K.cush : mat('c_ropecu', 0xEEE9DF, { roughness: 0.95 }), ac1 = K.themed ? K.acc1 : mat('c_ropeac1', 0xC26445, { roughness: 0.95 }), ac2 = K.themed ? K.acc2 : mat('c_ropeac2', 0x55634A, { roughness: 0.95 });   // 274: the theme's frame / cushions / accents
    const panel = (u, pw, ph, x, y, z, ry) => { if (themeKey() === 'contemporary' || themeKey() === 'turkish') { const c = cush(u, pw, ph, 0.55, x, y, z, themeKey() === 'turkish' ? K.cush2 : K.cush); c.rotation.y = ry || 0; return; }   // 275: bouclé / upholstered backs and arms instead of rope
      const m = ropeMat(pw, ph), p = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), m); p.position.set(x, y, z); p.rotation.y = ry || 0; p.castShadow = true; u.add(p); };
    L.pieces.forEach(pc => { const u = new THREE.Group(); u.position.set(pc.x, 0, pc.z); u.rotation.y = pc.ry; root.add(u); const len = pc.len, bz = -SD / 2 + 0.12;
      box(u, len, 0.12, SD, 0, 0.5, 0, fr); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(u, 0.09, 0.45, 0.09, a * (len / 2 - 0.1), 0.23, b * (SD / 2 - 0.1), fr));   // slim seat frame on thin legs
      cush(u, len - 0.3, 0.42, SD - 0.45, 0, 0.8, 0.18, cu);   // seat cushion
      box(u, len, 0.07, 0.07, 0, 2.45, bz, fr); panel(u, len - 0.1, 1.7, 0, 1.6, bz, 0);   // back: top rail + rope weave
      [-1, 1].forEach(a => { box(u, 0.07, 0.07, SD, a * (len / 2 - 0.04), 1.6, 0, fr); panel(u, SD - 0.15, 1.0, a * (len / 2 - 0.04), 1.1, 0, Math.PI / 2); });   // arms: rail + rope
      const n = Math.max(1, pc.n); for (let k = 0; k < n; k++) { const x = -len / 2 + 0.2 + (len - 0.4) * (k + 0.5) / n, bw = Math.min(1.9, (len - 0.4) / n - 0.15); const c = cush(u, bw, 1.15, 0.38, x, 1.58, bz + 0.32, cu); c.rotation.x = -0.12;
        if (n > 1 && (k === 0 || k === n - 1)) { const q = cush(u, 0.95, 0.95, 0.24, x + (k === 0 ? 0.25 : -0.25), 1.47, bz + 0.6, k === 0 ? ac1 : ac2); q.rotation.x = -0.15; q.rotation.z = k === 0 ? 0.08 : -0.08; } } });
    const T = L.table, tg = new THREE.Group(); tg.position.set(T.x, 0, T.z); root.add(tg); box(tg, T.w, 0.1, T.d, 0, 1.2, 0, K.wood); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(tg, 0.08, 1.15, 0.08, a * (T.w / 2 - 0.15), 0.58, b * (T.d / 2 - 0.15), fr));
  } else if (cat === 'swing' && ['tropical', 'contemporary', 'santorini', 'boho'].includes(themeKey())) {   // 275: a hanging egg / cocoon chair on a curved stand
    const TK = themeKey(), H = h || 7, st = K.frame, shell = TK === 'contemporary' ? mat('c_cocoon', 0xE9E2D6, { roughness: 1 }) : TK === 'santorini' ? mat('c_rattanw', 0xF2EFE8, { roughness: 1, side: THREE.DoubleSide }) : TK === 'boho' ? caneMat() : mat('c_rattan', 0xB98A4E, { roughness: 1, side: THREE.DoubleSide });   // 276: Santorini white, boho macramé
    cyl(g, 1.2, 1.3, 0.15, 0, 0.08, 0, st, 20); const arc = new THREE.Mesh(new THREE.TorusGeometry(H * 0.45, 0.1, 6, 24, Math.PI * 0.75), st); arc.position.set(0.3, H * 0.5, 0); arc.rotation.z = Math.PI * 0.25; g.add(arc);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 4), K.dark); c.position.set(0, H - 0.9, 0); g.add(c);
    const egg = new THREE.Mesh(new THREE.SphereGeometry(1.6, 20, 16, -Math.PI * 0.35, Math.PI * 1.7, 0, Math.PI), shell); egg.scale.set(0.95, 1.25, 0.95); egg.position.set(0, H - 3.4, 0); egg.castShadow = true; g.add(egg);
    cush(g, 1.9, 0.35, 1.7, 0, H - 4.6, 0.05, K.cush); cush(g, 1.3, 0.9, 0.3, 0, H - 4, -0.6, TK === 'contemporary' ? K.cush2 : K.acc2);
  } else if (cat === 'swing') {   // a hanging bench swing on an A-frame
    const H = h || 7, sw = Math.min(w - 1.6, 4.5), m = K.frame;
    [-w / 2 + 0.3, w / 2 - 0.3].forEach(x => { rodA(g, [x, 0, -d / 2 + 0.2], [x, H, 0], m); rodA(g, [x, 0, d / 2 - 0.2], [x, H, 0], m); });
    box(g, w - 0.4, 0.25, 0.25, 0, H, 0, m);
    const sy = 1.6; box(g, sw, 0.15, 1.7, 0, sy, 0, K.wood); box(g, sw, 1.4, 0.15, 0, sy + 0.7, -0.8, K.wood); cush(g, sw - 0.3, 0.3, 1.4, 0, sy + 0.24, 0.05, K.cush);
    [-1, 1].forEach(a => [-0.7, 0.6].forEach(z => box(g, 0.05, H - sy, 0.05, a * (sw / 2 - 0.1), sy + (H - sy) / 2, z * 0.4, K.dark)));
  } else if (cat === 'accover') {   // a jali / louver box over an AC outdoor unit
    const H = h || 2.9, m = K.wood2; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(g, 0.15, H, 0.15, a * (w / 2 - 0.08), H / 2, b * (d / 2 - 0.08), m));
    box(g, w, 0.12, d, 0, H - 0.06, 0, m);
    for (let y = 0.35; y < H - 0.2; y += 0.28) { box(g, w - 0.2, 0.08, 0.06, 0, y, d / 2 - 0.05, m); box(g, w - 0.2, 0.08, 0.06, 0, y, -d / 2 + 0.05, m); box(g, 0.06, 0.08, d - 0.2, -w / 2 + 0.05, y, 0, m); box(g, 0.06, 0.08, d - 0.2, w / 2 - 0.05, y, 0, m); }
  } else if (cat === 'dining') {
    const tw = Math.max(2.5, w - 2.6), td = Math.max(2.5, d - 2.6); box(g, tw, 0.15, td, 0, 2.5, 0, K.wood); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(g, 0.2, 2.45, 0.2, a * (tw / 2 - 0.3), 1.22, b * (td / 2 - 0.3), K.frame));
    const ch = (x, z, ry) => { const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; g.add(c); cush(c, 1.45, 0.2, 1.45, 0, 1.58, 0, K.cush); box(c, 1.5, 1.6, 0.15, 0, 2.3, -0.7, K.frame); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(c, 0.12, 1.5, 0.12, a * 0.65, 0.75, b * 0.65, K.frame)); };
    const nx = Math.max(1, Math.floor(tw / 2.2)); for (let i = 0; i < nx; i++) { const x = -tw / 2 + tw * (i + 0.5) / nx; ch(x, -td / 2 - 0.9, 0); ch(x, td / 2 + 0.9, Math.PI); }
  } else if (cat === 'stool') {   // 245: a bar chair — round seat, a slim post, a foot ring
    cyl(g, 0.6, 0.6, 0.15, 0, 2.55, 0, K.cush, 18); cyl(g, 0.07, 0.07, 2.45, 0, 1.25, 0, K.frame, 8); cyl(g, 0.5, 0.55, 0.06, 0, 0.03, 0, K.frame, 18); const r = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 6, 20), K.frame); r.rotation.x = Math.PI / 2; r.position.y = 0.9; g.add(r);
  } else if (cat === 'chair') {
    cush(g, w * 0.8, 0.3, d * 0.8, 0, 1.42, 0, K.cush); box(g, w * 0.8, 1.8, 0.3, 0, 2.4, -d * 0.4 + 0.15, K.frame);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(g, 0.15, 1.3, 0.15, a * w * 0.35, 0.65, b * d * 0.35, K.frame)); box(g, 0.15, 0.6, d * 0.8, -w * 0.4, 1.9, 0, K.frame); box(g, 0.15, 0.6, d * 0.8, w * 0.4, 1.9, 0, K.frame);
  } else if (cat === 'shaftcover') {   // 241: on top of the shaft — an MS tube frame with a white polycarbonate sheet, a little sloped
    const y = Math.max(0.08, (h == null ? 3.4 : h) - 0.4), fm = K.frame;   // 302 (owner): the frame sits right on the shaft's walls (it stood on 0.5 ft legs and looked to float)
    box(g, w, 0.12, 0.12, 0, y + 0.06, -d / 2 + 0.06, fm); box(g, w, 0.12, 0.12, 0, y + 0.06, d / 2 - 0.06, fm); box(g, 0.12, 0.12, d, -w / 2 + 0.06, y + 0.06, 0, fm); box(g, 0.12, 0.12, d, w / 2 - 0.06, y + 0.06, 0, fm);
    box(g, 0.12, 0.14, d, -w / 2 + 0.06, y + 0.19, 0, fm); box(g, 0.12, 0.14, d, w / 2 - 0.06, y + 0.19, 0, fm);
    const sm = (it && it.smat) || 'poly';   // 262 (owner): the cover's material
    if (sm === 'grill') { for (let x = -w / 2 + 0.15; x < w / 2; x += 0.25) box(g, 0.04, 0.08, d, x, y + 0.16, 0, fm); box(g, w, 0.08, 0.04, 0, y + 0.16, 0, fm); }
    else if (sm === 'louvre') { const al = mat('c_alu', 0xB9BCC0, { metalness: 0.5, roughness: 0.4 }); for (let z = -d / 2 + 0.2; z < d / 2; z += 0.35) { const b2 = box(g, w, 0.03, 0.3, 0, y + 0.22, z, al); b2.rotation.x = 0.5; } }
    else { const sh = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, sm === 'glass' ? 0.1 : 0.05, d + 0.3), sm === 'glass' ? mat('c_sglass', 0xBFDDE6, { roughness: 0.05, transparent: true, opacity: 0.45, metalness: 0.1 }) : sm === 'cement' ? mat('c_scem', 0xA7A49E, { roughness: 0.95 }) : mat('c_poly', 0xF4F4F2, { roughness: 0.35, transparent: true, opacity: 0.88 })); sh.position.set(0, y + 0.29, 0); if (sm !== 'glass') sh.rotation.x = Math.atan2(0.1, d); sh.castShadow = true; g.add(sh); }
  } else if (cat === 'fbench' && themeKey() === 'turkish' && !(it && it.shape === 'curve') && !(it && it.plant)) {   // 275 (owner): Turkish majlis — a low base, a thick floor mattress, cushions against the wall, bolsters at the ends
    box(g, w, 0.7, d, 0, 0.35, 0, K.stone); zelPlane(g, w, 0.3, 0, 0.45, d / 2 + 0.01); cush(g, w - 0.1, 0.55, d - 0.4, 0, 0.95, 0.15, K.cush);   // 294: lime base, beige zellige band, beige mattress
    const n = Math.max(2, Math.round(w / 2.2)); for (let k = 0; k < n; k++) { const x = -w / 2 + w * (k + 0.5) / n, c = cush(g, Math.min(2, w / n - 0.15), 1.5, 0.45, x, 1.85, -d / 2 + 0.4, k % 3 === 1 ? K.acc1 : K.cush2); c.rotation.x = -0.18; }
    [-1, 1].forEach(a => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, d - 0.6, 14), K.acc1); b.rotation.x = Math.PI / 2; b.position.set(a * (w / 2 - 0.45), 1.6, 0.1); b.castShadow = true; g.add(b); });
  } else if (cat === 'fbench' && !(it && it.shape === 'curve')) {   // 285 (owner): the curved one has its own arc model below (it was caught here and drawn as a box)   // 239: built-in seating — a masonry seat with a cushion and a backrest against the wall (back = −z); 258: + built-in planters behind / at the open ends
    const pl = (it && it.plant) || '', bk = pl === 'back' || pl === 'both', sd = pl === 'sides' || pl === 'both', pe = (it && it.pend) || { l: true, r: true }, PB = 1.5, zb = bk ? -d / 2 + PB : -d / 2;
    let x0 = -w / 2, x1 = w / 2; if (bk) pbox(g, w, PB, 0, -d / 2 + PB / 2, 2.6);
    if (sd && w > 4) { if (pe.l) { pbox(g, PB, d / 2 - zb, x0 + PB / 2, (zb + d / 2) / 2, 2.2); x0 += PB; } if (pe.r) { pbox(g, PB, d / 2 - zb, x1 - PB / 2, (zb + d / 2) / 2, 2.2); x1 -= PB; } }
    const sw = x1 - x0, sx = (x0 + x1) / 2, sdp = d / 2 - zb - 0.3, sz = zb + 0.3 + sdp / 2;
    const ST = themeKey() === 'santorini', FU = themeKey() === 'fusion', MD = themeKey() === 'modern' || FU, BH = themeKey() === 'boho', SB = themeKey() === 'tropical' ? K.wood2 : ST || BH ? (BH ? bLime() : sLime()) : MD ? mTeak() : K.stone; if (MD) { box(g, sw - 0.3, 0.3, sdp - 0.3, sx, 0.15, sz - 0.1, mChar()); box(g, sw, 1.1, sdp, sx, 0.85, sz, SB); box(g, sw - 0.4, 0.04, 0.05, sx, 0.25, sz + sdp / 2 - 0.12, mLed(), false); if (FU) zelPlane(g, sw - 0.2, 0.5, sx, 1.05, sz + sdp / 2 + 0.01, 0); } else box(g, sw, 1.4, sdp, sx, 0.7, sz, SB); if (themeKey() === 'tropical') for (let x = sx - sw / 2 + 0.25; x < sx + sw / 2; x += 0.35) box(g, 0.05, 1.2, 0.03, x, 0.72, sz + sdp / 2 + 0.01, K.frame, false); cush(g, sw - 0.1, 0.28, sdp - 0.2, sx, 1.54, sz + 0.05, ST ? stripeMat() : K.cush); box(g, sw, 1.5, 0.3, sx, 2.15, zb + 0.15, SB); if (FU) { const n = Math.max(2, Math.round(sw / 1.5)); for (let k = 0; k < n; k++) { const c = cush(g, sw / n - 0.12, 1.2, 0.4, sx - sw / 2 + (k + 0.5) * sw / n, 2.15, zb + 0.5, K.cush); c.rotation.x = -0.15; const bo = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.1, 12), k % 2 ? mat('c_fu_brass', 0xC9A86C, { roughness: 0.8 }) : mat('c_fu_teal', 0x1F7A72, { roughness: 0.9 })); bo.rotation.z = Math.PI / 2; bo.position.set(sx - sw / 2 + (k + 0.5) * sw / n, 1.75, zb + 1.0); g.add(bo); } } else if (BH) { const n = Math.max(2, Math.round(sw / 1.4)); for (let k = 0; k < n; k++) { const c = cush(g, sw / n - 0.12, 1.2, 0.4, sx - sw / 2 + (k + 0.5) * sw / n, 2.25, zb + 0.5, [K.cush, K.cush2, K.cush][k % 3]); c.rotation.x = -0.15; } } else if (ST) { const n = Math.max(2, Math.round(sw / 1.6)); for (let k = 0; k < n; k++) { const c = cush(g, sw / n - 0.15, 1.1, 0.35, sx - sw / 2 + (k + 0.5) * sw / n, 2.2, zb + 0.5, k % 2 ? sBlue() : stripeMat()); c.rotation.x = -0.15; } } else cush(g, sw - 0.2, 1.0, 0.3, sx, 2.15, zb + 0.47, K.cush2);   // 292: tropical = dark-wood slatted seat
  } else if (cat === 'counter') {   // 239: food / buffet counter — base, stone top, a cooktop and a sink on it (back = −z, against the wall)
    box(g, w - 0.1, 0.35, d * 0.9 - 0.25, 0, 0.175, -d * 0.05 - 0.12, K.frame); box(g, w, 2.55, d * 0.9, 0, 1.625, -d * 0.05, K.wood2); box(g, w + 0.2, 0.15, d, 0, 2.97, 0, mat('c_granite', 0x2F2E2D, { roughness: 0.25, metalness: 0.1 }));   // 285: cabinets — plinth, door lines, handles
    { const nd = Math.max(2, Math.round(w / 2)), fz = -d * 0.05 + d * 0.45 + 0.02, hm = mat('c_steel', 0xA8A8A6, { metalness: 0.8, roughness: 0.3 }); for (let i = 1; i < nd; i++) box(g, 0.03, 2.4, 0.03, -w / 2 + i * w / nd, 1.6, fz, K.frame); for (let i = 0; i < nd; i++) box(g, 0.5, 0.05, 0.06, -w / 2 + (i + 0.5) * w / nd, 2.6, fz + 0.02, hm); }   // 258 (owner): no wall behind it, a plain granite top
  } else if (cat === 'bench' && it && benchCode(it.pick || it.sku || it.cfgId)) {   // 307: an outrr bench — its real model at its seats
    const B = benchModel(benchCode(it.pick || it.sku || it.cfgId), (it.cfg && +it.cfg.n) || 3); g.add(B.g);
  } else if (cat === 'bench') {
    box(g, w, 0.2, d * 0.8, 0, 1.5, 0, K.wood); [-w / 2 + 0.4, w / 2 - 0.4].forEach(x => box(g, 0.25, 1.4, d * 0.7, x, 0.7, 0, K.frame));
  } else if (cat === 'table') {
    box(g, w, 0.15, d, 0, 2.4, 0, K.wood); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(g, 0.2, 2.35, 0.2, a * (w / 2 - 0.3), 1.18, b * (d / 2 - 0.3), K.frame));
  } else if (cat === 'rack') {   // 247 (owner): a bottle rack behind the bar — dark frame, shelves of bottles, a glow on top
    const H = h || 7, D0 = Math.max(0.8, d), fr = mat('c_rackw', 0x5B3E2B); box(g, w, H, 0.15, 0, H / 2, -D0 / 2 + 0.08, K.dark); [-1, 1].forEach(a => box(g, 0.15, H, D0, a * (w / 2 - 0.08), H / 2, 0, fr));
    const cols = [0x2E5E3A, 0x7A3B1F, 0xC9A46A, 0x3B3F5C, 0xD9D2C3]; for (let y = 1; y < H - 0.4; y += 1.2) { box(g, w - 0.3, 0.1, D0, 0, y, 0, fr); const n = Math.floor((w - 0.6) / 0.45); for (let k = 0; k < n; k++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.85, 8), mat('c_btl' + (k % 5), cols[(k + Math.round(y)) % 5], { roughness: 0.2, metalness: 0.2 })); b.position.set(-w / 2 + 0.45 + k * 0.45, y + 0.48, 0); g.add(b); } }
    box(g, w - 0.4, 0.06, 0.1, 0, H - 0.15, D0 / 2 - 0.1, mat('c_cove', 0xFFD9A0, { emissive: 0xFFB15E, emissiveIntensity: 1.8 }));
  } else if (cat === 'bar' && it && it.shape === 'curve') {   // 247: a curved bar — an arc of counter, stools outside the curve
    const R = Math.max(w, d) * 0.62, n = 12, A = Math.PI * 0.75; for (let k = 0; k < n; k++) { const a = -A / 2 + A * (k + 0.5) / n, x = Math.sin(a) * R, z = Math.cos(a) * R - R + d / 2 - 1.2, sl = new THREE.Group(); sl.position.set(x, 0, z); sl.rotation.y = a; g.add(sl); box(sl, R * A / n + 0.05, 3.4, 2, 0, 1.7, 0, K.stone); box(sl, R * A / n + 0.12, 0.15, 2.5, 0, 3.5, 0.1, K.wood2); }
  } else if (cat === 'fbench' && it && it.shape === 'curve') {   // 247: curved built-in seating — an arc hugging the corner, facing the terrace
    const R = Math.min(w, d) - 1.2, n = 10, cx = -w / 2 + 0.2 + R, cz = -d / 2 + 0.2 + R, seg = R * (Math.PI / 2) / n + 0.12;
    for (let k = 0; k < n; k++) { const a = (Math.PI / 2) * (k + 0.5) / n, sl = new THREE.Group(); sl.position.set(cx - R * Math.cos(a), 0, cz - R * Math.sin(a)); g.add(sl); sl.lookAt(cx, 0, cz);
      box(sl, seg, 1.4, 1.7, 0, 0.7, 0, K.stone); cush(sl, seg - 0.03, 0.28, 1.5, 0, 1.54, 0.05, K.cush); box(sl, seg, 1.5, 0.3, 0, 2.15, -0.75, K.stone); }
  } else if (cat === 'bar') {   // 241: island bar — free on both sides, stools at the front; L = a return arm on the right
    const L = it && it.shape === 'L', D = L ? 2.2 : d * 0.7, stl = mat('c_steel', 0xA8A8A6, { metalness: 0.8, roughness: 0.3 }), arm = (bw, bd, x, z) => {   // 285 (owner): a real bar, not a box — toe kick, slatted front, top with a front overhang, foot rail
      box(g, bw - 0.1, 0.35, bd - 0.35, x, 0.175, z - 0.1, K.frame); box(g, bw, 3.0, bd, x, 1.85, z, K.stone);
      const n = Math.max(3, Math.round(bw / 0.4)), TB = themeKey() === 'tropical'; if (themeKey() === 'santorini') { const np = Math.max(1, Math.round(bw / 2.2)), pw = bw / np; for (let i = 0; i < np; i++) { azPlane(g, pw - 0.5, 2.0, x - bw / 2 + (i + 0.5) * pw, 1.85, z + bd / 2 + 0.02); } } else if (themeKey() === 'turkish') { zelPlane(g, bw - 0.1, 2.6, x, 1.85, z + bd / 2 + 0.02); box(g, bw, 0.12, 0.06, x, 3.2, z + bd / 2 + 0.03, mat('c_tk_teal', 0x2F6E73, { roughness: 0.3 })); box(g, bw, 0.12, 0.06, x, 0.5, z + bd / 2 + 0.03, mat('c_tk_teal', 0x2F6E73, { roughness: 0.3 })); } else if (themeKey() === 'boho') { box(g, bw + 0.02, 3.0, bd + 0.02, x, 1.85, z, bLime()); const np = Math.max(1, Math.round(bw / 2.2)), pw = bw / np, a = pw / 2 - 0.35; for (let i = 0; i < np; i++) bArch(g, a, 2.2 - a, x - bw / 2 + (i + 0.5) * pw, 0.55, z + bd / 2 + 0.02, caneMat()); } else if (themeKey() === 'modern') { const nf = Math.max(6, Math.round(bw / 0.28)); for (let i = 0; i < nf; i++) { const c0 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.75, 10, 1, false, 0, Math.PI), mTeak()); c0.rotation.y = -Math.PI / 2; c0.position.set(x - bw / 2 + (i + 0.5) * bw / nf, 1.85, z + bd / 2 + 0.01); g.add(c0); } box(g, bw - 0.2, 0.04, 0.05, x, 3.32, z + bd / 2 + 0.45, mLed(), false); } else for (let i = 0; i < n; i++) box(g, bw / n - 0.08, TB ? 2.2 : 2.8, 0.07, x - bw / 2 + (i + 0.5) * bw / n, TB ? 2.2 : 1.85, z + bd / 2 + 0.035, K.wood);   // 292: tropical = dark-wood slats over a grey stone plinth
      box(g, bw + 0.3, 0.16, bd + 0.9, x, 3.43, z + 0.4, themeKey() === 'turkish' ? mat('c_tk_trav', 0xE8DDC8, { roughness: 0.5 }) : themeKey() === 'santorini' ? sLime() : themeKey() === 'modern' ? mat('c_m_top', 0xD9D4CC, { roughness: 0.35 }) : themeKey() === 'boho' ? mat('c_b_top', 0xE6DCCB, { roughness: 0.6 }) : K.wood2); box(g, bw - 0.4, 0.07, 0.07, x, 0.8, z + bd / 2 + 0.45, themeKey() === 'turkish' ? mat('c_brass', 0xB08D57, { metalness: 0.8, roughness: 0.35 }) : stl); [-1, 1].forEach(sg => box(g, 0.06, 0.06, 0.45, x + sg * (bw / 2 - 0.4), 0.8, z + bd / 2 + 0.23, stl)); };
    const fl = it && it.flip ? -1 : 1;   // 258 (owner): main counter at the front, return arm on the right (left when flipped); the bar chairs are their own items, outside
    if (L) { arm(w, D, 0, d / 2 - D / 2); arm(D, d - D, fl * (w / 2 - D / 2), -D / 2); } else arm(w, D, 0, -d * 0.15);
  } else if (cat === 'planter' && it && /^MTO-PL-[A-Z]{2}$/.test(it.cfgId || it.pick || '')) {   // 199: an outrr planter — its own size, finish colour, plinth, plants, LED glow underneath
    planterModel(g, w, d, h, it, K);
  } else if (cat === 'plant') {   // 218b: a real Landscape Plant (its own model at the picked size), in a plain pot on the plan
    const m = plantModel(THREE, (it && it.plant) || 'ARECA', h || 4, { pot: 'pot', seed: 5 }), pq = Math.abs(Math.round((+(it && it.x) || 1) * 7 + (+(it && it.z) || 1) * 13)), tp = themeKey() === 'santorini' && pq % 3 === 1 ? sBlue() : themeKey() === 'turkish' && pq % 3 === 1 ? mat('c_tk_tpot', 0x2F6E73, { roughness: 0.3 }) : themeKey() === 'tropical' && pq % 4 === 0 ? mat('c_pott', 0xB06A47, { roughness: 0.9 }) : themeKey() === 'modern' && pq % 3 === 1 ? mat('c_m_pot', 0xB7B2AA, { roughness: 0.8 }) : themeKey() === 'boho' && pq % 3 === 1 ? bLime() : K.tpot; if (tp) m.traverse(o => { if (o.isMesh && o.material && o.material.color && o.material.color.getHex() === 0x6A6A66) o.material = tp; });   // 274: the pot in the theme's colour
    m.rotation.y = (Math.abs(Math.round((+(it && it.x) || 1) * 7 + (+(it && it.z) || 1) * 13)) % 12) * 0.52; g.add(m);
    if (themeKey() === 'tropical' && pq % 3 !== 1) { const sg = mat('c_tsph', 0x7E7C77, { roughness: 0.95 }), a0 = (pq % 8) * 0.785;   // 293 (owner): grey stone spheres + a low leafy pot beside the plants
      [[1.15, 0.32], [1.5, 0.22]].forEach(([rr, sr], k) => { const sp = new THREE.Mesh(new THREE.SphereGeometry(sr, 14, 10), sg); sp.position.set(Math.cos(a0 + k * 0.7) * rr, sr * 0.9, Math.sin(a0 + k * 0.7) * rr); sp.castShadow = !LITE; g.add(sp); });
      if (pq % 3 === 0) { const lo = noSh(plantModel(THREE, TROP_LF[pq % TROP_LF.length], 1.6, { pot: 'pot', seed: 3 })); lo.position.set(Math.cos(a0 + 2.6) * 1.3, 0, Math.sin(a0 + 2.6) * 1.3); g.add(lo); } }
  } else if (cat === 'planter' && it && it.frp) {   // 258 (owner): a rectangular FRP trough along the parapet, planted
    pbox(g, w, d, 0, 0, 2, K.frp);   // 274: trough in the theme's colour
  } else if (cat === 'planter') {   // 262 (owner): one of our real plant models in a pot — a tropical mix, sizes vary
    const sdp = Math.abs(Math.round((+(it && it.x) || 1) * 13 + (+(it && it.z) || 1) * 7)), k = TROP_B[sdp % TROP_B.length], m = noSh(plantModel(THREE, k, 3 + (sdp % 2) * 1.5, { pot: 'pot', seed: 1 })); m.rotation.y = (sdp % 12) * 0.52; g.add(m);
  } else if (cat === 'water' && it && WLIB[wCode(it)]) { waterLib(g, w, d, wCode(it), K, it.wo);   // 262 (owner): the water features as in our library (MTO-WW / WC / TG)
  } else if (cat === 'water' && it && it.mech) {   // 247 (owner): water feature by its mechanism — cascade / wall fall / rain curtain / geyser jets
    const sheet = mat('c_wsheet', 0xA9DCEB, { transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.1, emissive: 0x2E6F86, emissiveIntensity: 0.15, side: THREE.DoubleSide }), m = it.mech;
    const pool = (pw, pd, z0) => { box(g, pw, 0.9, pd, 0, 0.45, z0, K.stone); box(g, pw - 0.3, 0.06, pd - 0.3, 0, 0.88, z0, K.water); if (themeKey() === 'santorini') { azPlane(g, pw - 0.02, 0.8, 0, 0.45, z0 + pd / 2 + 0.01); } if (themeKey() === 'tropical') { box(g, pw + 0.1, 0.12, 0.3, 0, 0.96, z0 + pd / 2 - 0.1, K.wood2); box(g, pw + 0.1, 0.12, 0.3, 0, 0.96, z0 - pd / 2 + 0.1, K.wood2); box(g, 0.3, 0.12, pd, -pw / 2 + 0.1, 0.96, z0, K.wood2); box(g, 0.3, 0.12, pd, pw / 2 - 0.1, 0.96, z0, K.wood2); } };   // 292: tropical = dark-wood edge
    const fall = (fw, top, bot, z0) => { const p0 = new THREE.Mesh(new THREE.PlaneGeometry(fw, top - bot), sheet); p0.position.set(0, (top + bot) / 2, z0); g.add(p0); };
    if (m === 'cascade') { pool(w, d * 0.45, d / 2 - d * 0.225); [[3.6, 0.32], [2.5, 0.18], [1.5, 0.05]].forEach(([hh, zf], k) => { const tw = w * (0.86 - k * 0.12), tz = -d / 2 + d * (0.18 + k * 0.17); box(g, tw, hh, d * 0.3, 0, hh / 2, tz, K.stone); box(g, tw - 0.3, 0.05, d * 0.3 - 0.3, 0, hh + 0.02, tz, K.water); fall(tw * 0.7, hh, k === 2 ? 0.9 : hh - 1.1, tz + d * 0.15 + 0.04); }); }
    else if (m === 'wall') { const H = 6; box(g, w, H, 0.6, 0, H / 2, -d / 2 + 0.3, K.stone); box(g, w, 0.18, 0.9, 0, H + 0.09, -d / 2 + 0.45, K.dark); fall(w - 0.6, H - 0.1, 0.9, -d / 2 + 0.66); pool(w, d - 0.6, 0.3); }
    else if (m === 'rain') { const H = 7; [-1, 1].forEach(a => box(g, 0.3, H, 0.3, a * (w / 2 - 0.15), H / 2, 0, K.frame)); box(g, w, 0.35, 0.7, 0, H, 0, K.frame); pool(w, d, 0);
      const n = Math.max(12, Math.round(w * 6)); for (let k = 0; k < n; k++) { const c0 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, H - 1.1, 4), sheet); c0.position.set(-w / 2 + 0.4 + (w - 0.8) * k / (n - 1), (H + 0.9) / 2 - 0.1, ((k * 37) % 5 - 2) * 0.06); g.add(c0); } }
    else { const R = Math.min(w, d) / 2; cyl(g, R, R, 0.5, 0, 0.25, 0, K.stone, 36); cyl(g, R - 0.25, R - 0.25, 0.06, 0, 0.5, 0, K.water, 36);
      [[0, 0, 3.2], [R * 0.45, 0, 2.2], [-R * 0.45, 0, 2.2], [0, R * 0.45, 2.4], [0, -R * 0.45, 2.4]].forEach(([x, z, hh]) => { const j = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, hh, 8), sheet); j.position.set(x, 0.5 + hh / 2, z); g.add(j); const top = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), sheet); top.position.set(x, 0.5 + hh, z); g.add(top); }); }
  } else if (cat === 'water') {
    cyl(g, Math.min(w, d) / 2, Math.min(w, d) / 2, 1.2, 0, 0.6, 0, K.stone, 32); cyl(g, Math.min(w, d) / 2 - 0.3, Math.min(w, d) / 2 - 0.3, 0.1, 0, 1.15, 0, K.water, 32);
    cyl(g, 0.5, 0.7, 2.6, 0, 1.3, 0, K.stone); cyl(g, 1.2, 0.9, 0.35, 0, 2.7, 0, K.stone); cyl(g, 1.0, 1.0, 0.06, 0, 2.86, 0, K.water); cyl(g, 0.25, 0.35, 1, 0, 3.3, 0, K.stone);
  } else if (cat === 'sculpture') {
    box(g, w * 0.7, 1.4, d * 0.7, 0, 0.7, 0, K.stone); const k = new THREE.Mesh(new THREE.TorusKnotGeometry(Math.min(w, d) * 0.28, Math.min(w, d) * 0.08, 80, 12), mat('c_bronze', 0x8C6A3F, { metalness: 0.7, roughness: 0.35 })); k.position.y = 1.4 + Math.min(w, d) * 0.5; k.castShadow = true; g.add(k);
  } else if (cat === 'deck') {
    const lv = deckTop(it), n = Math.max(1, Math.round(d / 0.5)); box(g, w, lv - 0.12, d, 0, (lv - 0.12) / 2, 0, K.wood2);   // 259: joined to a cabin → at the cabin floor's level, with a skirting; 268 (owner): every deck stands 5 in (0.42 ft)
    for (let i = 0; i < n; i++) box(g, w, 0.12, d / n - 0.04, 0, lv - 0.06, -d / 2 + d * (i + 0.5) / n, i % 2 ? K.wood : K.wood2, false);   /* 262: a raised deck's top = the cabin floor (0.6 ft) exactly */
  } else if (cat === 'railing' || cat === 'gate') {
    const H = h || 3.5, n = Math.max(2, Math.round(w / 4) + 1);
    for (let i = 0; i < n; i++) box(g, 0.2, H, 0.2, -w / 2 + w * i / (n - 1), H / 2, 0, K.frame);
    box(g, w, 0.18, 0.25, 0, H, 0, K.frame); box(g, w, 0.12, 0.12, 0, 0.4, 0, K.frame);
    if (cat === 'gate') { box(g, w / 2 - 0.2, H - 0.8, 0.12, -w / 4, H / 2, 0, mat('c_gate', 0x55595C, { metalness: 0.5, roughness: 0.4 })); box(g, w / 2 - 0.2, H - 0.8, 0.12, w / 4, H / 2, 0, mat('c_gate', 0x55595C)); }
    else box(g, w - 0.3, H - 0.8, 0.06, 0, H / 2 + 0.1, 0, K.glass);
  } else if (cat === 'privacy' && it && it.pipe) {   // 260 (owner): pipe cover in the picked material, with a door that opens for repairs
    const H = h || 8, m = it.pmat || 'cement', fr = K.frame, T = 0.12; box(g, w, 0.15, T, 0, H - 0.075, 0, fr); box(g, w, 0.15, T, 0, 0.075, 0, fr); box(g, 0.15, H, T, -w / 2 + 0.075, H / 2, 0, fr); box(g, 0.15, H, T, w / 2 - 0.075, H / 2, 0, fr); box(g, 0.08, H - 0.3, T, 0, H / 2, 0, fr);
    const iw = w - 0.3, ih = H - 0.3;
    if (m === 'cement') { const cb = mat('c_cboard', 0xD9D6CF, { roughness: 0.95 }); box(g, iw, ih, 0.05, 0, H / 2, 0.02, cb); box(g, 0.05, 0.4, 0.08, -0.25, H * 0.5, 0.08, fr); box(g, 0.05, 0.4, 0.08, 0.25, H * 0.5, 0.08, fr); }
    else if (m === 'jali') { const n = Math.max(4, Math.round(iw / 0.35)), r = Math.round(ih / 0.35); for (let i = 1; i < n; i++) box(g, 0.04, ih, 0.04, -iw / 2 + iw * i / n, H / 2, 0, fr); for (let j = 1; j < r; j++) box(g, iw, 0.04, 0.04, 0, 0.15 + ih * j / r, 0, fr); }
    else if (m === 'louvre') { const al = mat('c_alu', 0xB9BCC0, { metalness: 0.5, roughness: 0.4 }), r = Math.round(ih / 0.3); for (let j = 0; j < r; j++) { const b2 = box(g, iw, 0.22, 0.03, 0, 0.3 + ih * (j + 0.5) / r, 0, al); b2.rotation.x = -0.6; } }
    else { const n = Math.max(3, Math.round(iw / 0.4)); for (let i = 0; i < n; i++) box(g, 0.28, ih, 0.1, -iw / 2 + iw * (i + 0.5) / n, H / 2, 0, K.wood); }
  } else if (cat === 'privacy') {
    if (it && /^MTO-P[ST]-/.test(String(it.cfgId || it.pick || ''))) { screenModel(g, w, h, it, K); return g; }
    const H = h || 6, n = Math.max(3, Math.round(w / 0.45)); if (!['santorini', 'boho'].includes(themeKey())) { box(g, w, 0.2, 0.3, 0, H, 0, K.frame); box(g, w, 0.2, 0.3, 0, 0.3, 0, K.frame); }
    if (themeKey() === 'santorini') { const lw = sLime(), sh = new THREE.Shape(), steps = Math.max(1, Math.round(w / 6)); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0);   // 296: white plaster wall with a stepped top and round-arched openings
      for (let k = steps; k >= 0; k--) { const xk = -w / 2 + w * k / steps, yk = H - (k % 2 ? 0.6 : 0); sh.lineTo(xk, yk); if (k) sh.lineTo(-w / 2 + w * (k - 1) / steps + 0.001, yk); }
      const na = Math.max(1, Math.floor(w / 3.2)), sp = w / na; for (let k = 0; k < na; k++) { const cx = -w / 2 + (k + 0.5) * sp, a = Math.min(0.9, sp / 2 - 0.4), pts = keyhole(a, Math.min(H - 1.4, 2.6), a + 0.001).getPoints(16).map(p => new THREE.Vector2(p.x + cx, p.y + 0.6)); sh.holes.push(new THREE.Path(THREE.ShapeUtils.isClockWise(pts) === THREE.ShapeUtils.isClockWise(sh.getPoints()) ? pts.reverse() : pts)); }
      const ex = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.35, bevelEnabled: false, curveSegments: 12 }), lw); ex.position.z = -0.175; ex.castShadow = ex.receiveShadow = true; g.add(ex); return g; }
    else if (themeKey() === 'turkish') { const np = Math.max(2, Math.round(w / 4) + 1), t = jaliTex('star'), jm = M.c_tk_jali || (M.c_tk_jali = new THREE.MeshStandardMaterial({ color: 0xEDE3D0, map: t, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 }));   // 294: Turkish = cream girih jaali between slim posts
      for (let i = 0; i < np; i++) box(g, 0.25, H, 0.25, -w / 2 + 0.125 + (w - 0.25) * i / (np - 1), H / 2, 0, K.frame); texPlane(g, t, w - 0.1, H - 0.6, w - 0.1, (H - 0.6) / (t.userData.ar || 1), -w / 2 + 0.05, 0.4, 0, jm); }
    else if (themeKey() === 'tropical') { const np = Math.max(2, Math.round(w / 4) + 1); for (let i = 0; i < np; i++) box(g, 0.3, H, 0.3, -w / 2 + 0.15 + (w - 0.3) * i / (np - 1), H / 2, 0, K.frame); for (let y = 0.6; y < H - 0.2; y += 0.42) box(g, w, 0.26, 0.12, 0, y, 0.05, K.wood); }   // 292: tropical = horizontal dark-wood slats
    else if (themeKey() === 'boho') { box(g, w, H - 0.1, 0.4, 0, (H - 0.1) / 2, 0, bLime()); const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, w, 10), bLime()); cap.rotation.z = Math.PI / 2; cap.position.set(0, H - 0.1, 0); g.add(cap);   // 299: white lime wall, round-headed arches of dry rubble stone (both faces)
      const na = Math.max(1, Math.floor(w / 4)), sp = w / na, a = Math.min(1.2, sp / 2 - 0.5), c0 = Math.min(H - a - 0.7, 3); for (let k = 0; k < na; k++) { const cx = -w / 2 + (k + 0.5) * sp; [1, -1].forEach(sg => bArch(g, a, c0, cx, 0.5, sg * 0.21, rubbleMat(), sg < 0 ? Math.PI : 0)); } }
    else if (themeKey() === 'modern') { const np = Math.max(2, Math.round(w / 6) + 1); for (let i = 0; i < np; i++) box(g, 0.25, H, 0.25, -w / 2 + 0.125 + (w - 0.25) * i / (np - 1), H / 2, 0, K.frame); const ns = Math.max(4, Math.round(w / 0.42)); for (let i = 0; i < ns; i++) box(g, 0.24, H - 0.45, 0.14, -w / 2 + w * (i + 0.5) / ns, H / 2 + 0.05, 0.04, mTeak());   // 298: vertical teak slats in a charcoal frame, up-lights at the foot
      for (let x = -w / 2 + 2; x < w / 2 - 1; x += 4) upLight(g, x, 0.45, 0.2, H); }
    else for (let i = 0; i < n; i++) box(g, 0.28, H - 0.4, 0.15, -w / 2 + w * (i + 0.5) / n, H / 2, 0, K.wood);
  } else if (cat === 'feature' && it && it.fdesign && it.fdesign !== 'stone') {   // 247 (owner): designer feature walls — light and a bit of green
    const H = h || 8, D0 = Math.max(0.4, d), led = mat('c_cove', 0xFFD9A0, { emissive: 0xFFB15E, emissiveIntensity: 1.8 }), fd = it.fdesign;
    if (fd === 'fluted') { box(g, w, H, D0, 0, H / 2, -0.05, mat('c_flbase', 0xD8CFC2)); const n = Math.max(6, Math.round(w / 0.35)); for (let k = 0; k < n; k++) { const c0 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, H - 1.6, 10, 1, false, 0, Math.PI), mat('c_flute', 0xE6DED2)); c0.rotation.y = -Math.PI / 2; c0.position.set(-w / 2 + w * (k + 0.5) / n, H / 2 + 0.4, D0 / 2 - 0.05); g.add(c0); }
      box(g, w - 0.2, 0.06, 0.1, 0, H - 0.35, D0 / 2 + 0.1, led); box(g, w, 1.0, 1.1, 0, 0.5, D0 / 2 + 0.55, K.stone); for (let x = -w / 2 + 0.5; x < w / 2; x += 0.8) { const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), x % 1.6 > 0.8 ? K.leaf : K.leaf2); lf.position.set(x, 1.2, D0 / 2 + 0.55); g.add(lf); } }
    else if (fd === 'slats') { box(g, w, H, D0, 0, H / 2, -0.1, K.dark); box(g, w - 0.4, H - 0.8, 0.05, 0, H / 2, D0 / 2 - 0.05, led); const n = Math.max(6, Math.round(w / 0.45)); for (let k = 0; k < n; k++) box(g, 0.22, H - 0.2, 0.18, -w / 2 + w * (k + 0.5) / n, H / 2, D0 / 2 + 0.1, K.wood);
      for (let y = 1; y < H - 1; y += 1.4) { const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), K.leaf2); lf.position.set(w / 2 - 0.4 - (y % 2.8 > 1.4 ? 0.3 : 0), y, D0 / 2 + 0.3); g.add(lf); } }
    else { box(g, w, H, D0, 0, H / 2, -0.05, mat('c_plast', 0xEDE7DD)); const gw = w * 0.5; box(g, gw, H - 1, 0.3, -w / 2 + gw / 2 + 0.2, H / 2, D0 / 2 + 0.1, K.wood2);
      for (let x = -w / 2 + 0.6; x < -w / 2 + gw; x += 0.75) for (let y = 0.9; y < H - 0.6; y += 0.75) { const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), (x + y) % 1.5 > 0.75 ? K.leaf : K.leaf2); lf.position.set(x, y, D0 / 2 + 0.35); g.add(lf); }
      [0.25, 0.55, 0.85].forEach(f => { box(g, 0.25, 0.25, 0.3, -w / 2 + w * f + gw * 0.5 * (1 - f) + 0.6, 0.4, D0 / 2 + 0.2, K.dark); }); box(g, w - gw - 0.6, 0.06, 0.1, gw / 2 + 0.1, H - 0.4, D0 / 2 + 0.1, led); }
  } else if (cat === 'feature' && themeKey() === 'santorini') {   // 296 (owner, Santorini guide): white lime wall, a round-arched niche, blue-white plates, white lanterns
    const H = h || 8, D0 = Math.max(0.4, d), z0 = D0 / 2, lw = sLime(); box(g, w, H, D0, 0, H / 2, 0, lw); box(g, w + 0.15, 0.2, D0 + 0.15, 0, H + 0.1, 0, lw);
    const a = Math.min(w * 0.28, 2.2), c0 = Math.min(H - a - 0.6, H * 0.55); { const ni = new THREE.Mesh(new THREE.ShapeGeometry(keyhole(a, c0, a + 0.001), 24), mat('c_s_niche', 0xE9ECEF, { roughness: 1 })); ni.position.set(0, 0.6, z0 + 0.01); g.add(ni); box(g, a * 2 + 0.3, 0.15, 0.5, 0, 0.6, z0 + 0.2, lw); }
    plates(g, 0, 0.6 + c0 * 0.75, z0 + 0.02, Math.min(1, a / 1.6));
    [-1, 1].forEach(sg => { const lx = sg * (a + 1.1); if (Math.abs(lx) < w / 2 - 0.3) { const lt = new THREE.Group(); g.add(lt); lantern(lt, lx, c0 + 0.6, z0 + 0.45, 0.65); lt.traverse(o => { if (o.isMesh && o.material && o.material.metalness > 0.5) o.material = mat('c_s_lant', 0xF2F2EE, { roughness: 0.5 }); }); } });
  } else if (cat === 'feature' && themeKey() === 'turkish') {   // 294 (owner, Turkish guide): lime wall, sand-cream keyhole frame, beige zellige inside, brass lantern each side
    const H = h || 8, D0 = Math.max(0.4, d), z0 = D0 / 2; box(g, w, H, D0, 0, H / 2, 0, mat('c_tk_lime', 0xF4EFE6, { roughness: 0.95 })); box(g, w + 0.2, 0.25, D0 + 0.2, 0, H + 0.12, 0, mat('c_tk_sand', 0xE3CFAE, { roughness: 0.9 }));
    const a = Math.min(w * 0.3, 2.4), r = a * 1.18, c = Math.min(H - r - 0.5, H * 0.62), fr = new THREE.Mesh(new THREE.ExtrudeGeometry(keyhole(a + 0.35, c, r + 0.35), { depth: 0.08, bevelEnabled: false }), mat('c_tk_sand', 0xE3CFAE, { roughness: 0.9 })); fr.position.set(0, 0.2, z0); g.add(fr);
    const ins = new THREE.Mesh(new THREE.ShapeGeometry(keyhole(a, c, r), 24), zelMat()); ins.position.set(0, 0.2, z0 + 0.09); ins.receiveShadow = true; g.add(ins);
    const ro = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.55, 24), mat('c_tk_teal', 0x2F6E73, { roughness: 0.3 })); ro.position.set(0, 0.2 + c, z0 + 0.1); g.add(ro);
    [-1, 1].forEach(sg => { const lx = sg * (a + 1.1); if (Math.abs(lx) < w / 2 - 0.3) { box(g, 0.06, 0.06, 0.5, lx, c + 0.4, z0 + 0.25, mat('c_brass', 0xB08D57, { metalness: 0.8, roughness: 0.35 })); lantern(g, lx, c, z0 + 0.5, 0.7); } });
  } else if (cat === 'feature' && themeKey() === 'fusion') {   // 300 (owner: Modern + Boho): a warm lime wall with round-headed niches of dark ledge stone, a warm LED line round each arch, a jar + olive, slim charcoal cap
    const H = h || 8, D0 = Math.max(0.4, d), z0 = D0 / 2, lw = bLime(); box(g, w, H, D0, 0, H / 2, 0, lw); box(g, w + 0.1, 0.12, D0 + 0.1, 0, H + 0.06, 0, mChar());
    const na = Math.max(1, Math.min(3, Math.floor(w / 3.4))), sp = w / na, a = Math.min(1.3, sp / 2 - 0.45), c0 = Math.min(H - a - 1, 4.4); box(g, w, 1.2, 1.1, 0, 0.6, z0 + 0.55, mTeak()); box(g, w - 0.3, 0.04, 0.05, 0, 0.12, z0 + 1.08, mLed(), false);
    for (let k = 0; k < na; k++) { const cx = -w / 2 + (k + 0.5) * sp; bArch(g, a, c0, cx, 1.2, z0 + 0.01, ledgeMat()); const rim = new THREE.Mesh(new THREE.ShapeGeometry(khRim(a, c0, a + 0.001, 0.06), 20), mLed()); rim.position.set(cx, 1.2, z0 + 0.02); g.add(rim);
      const jg = new THREE.Group(); jg.position.y = 1.2; g.add(jg); jar(jg, cx, z0 + 0.6, k % 2 ? 0.6 : 0.85, mat('c_fu_jar', 0x2E2C2A, { roughness: 0.6 })); if (k % 2 === 0) { const ol = noSh(plantModel(THREE, 'OLIVE', Math.min(c0 + a - 1, 4), { pot: 'none', seed: 4 + k })); ol.position.set(cx, 1.2 + 1.2, z0 + 0.6); g.add(ol); }
      const s2 = new THREE.Sprite(haloMat()); s2.scale.set(a * 2, c0 + a, 1); s2.position.set(cx, 1.2 + (c0 + a) / 2, z0 + 0.1); nightOnly(s2, g); }
  } else if (cat === 'feature' && themeKey() === 'boho') {   // 299 (Ibiza refs): warm white lime wall, arched niches of rubble stone, a jar + olive in each, warm glow up the niches, rounded top
    const H = h || 8, D0 = Math.max(0.4, d), z0 = D0 / 2, lw = bLime(); box(g, w, H - 0.3, D0, 0, (H - 0.3) / 2, 0, lw); const cap = new THREE.Mesh(new THREE.CylinderGeometry(D0 / 2 + 0.05, D0 / 2 + 0.05, w, 12), lw); cap.rotation.z = Math.PI / 2; cap.position.set(0, H - 0.3, 0); g.add(cap);
    const na = Math.max(1, Math.min(3, Math.floor(w / 3.4))), sp = w / na, a = Math.min(1.3, sp / 2 - 0.45), c0 = Math.min(H - a - 1, 4.2); box(g, w, 1.4, 1.2, 0, 0.7, z0 + 0.6, lw);   // a lime seat / ledge in front
    for (let k = 0; k < na; k++) { const cx = -w / 2 + (k + 0.5) * sp; bArch(g, a, c0, cx, 1.4, z0 + 0.01, rubbleMat()); const rim = new THREE.Mesh(new THREE.ShapeGeometry(khRim(a, c0, a + 0.001, 0.14), 20), mat('c_b_rim', 0xE6DCCB, { roughness: 1 })); rim.position.set(cx, 1.4, z0 + 0.02); g.add(rim);
      { const jg = new THREE.Group(); jg.position.y = 1.4; g.add(jg); jar(jg, cx, z0 + 0.6, k % 2 ? 0.6 : 0.85); if (k % 2 === 0) { const ol = noSh(plantModel(THREE, 'OLIVE', Math.min(c0 + a - 1, 4), { pot: 'none', seed: 4 + k })); ol.position.set(cx, 1.4 + 1.2, z0 + 0.6); g.add(ol); } }
      const s2 = new THREE.Sprite(haloMat()); s2.scale.set(a * 2, c0 + a, 1); s2.position.set(cx, 1.4 + (c0 + a) / 2, z0 + 0.1); nightOnly(s2, g); }
  } else if (cat === 'feature' && themeKey() === 'modern') {   // 298 (owner, Modern guide): dark ledge stone, a stainless sheet waterfall into a slim pool, a warm wash from the top, up-lights
    const H = h || 8, D0 = Math.max(0.4, d), z0 = D0 / 2; box(g, w, H, D0, 0, H / 2, 0, ledgeMat()); box(g, w + 0.1, 0.12, D0 + 0.1, 0, H + 0.06, 0, mChar());
    const sw = Math.min(w * 0.4, 4), wt = mat('c_wsheet2', 0xCFEFF8, { transparent: true, opacity: 0.42, roughness: 0.05, metalness: 0.05, emissive: 0x2E6F86, emissiveIntensity: 0.2, side: THREE.DoubleSide, depthWrite: false }), ssm = mat('c_wss', 0xC9CED2, { metalness: 0.9, roughness: 0.25 }), sy = Math.min(H - 1.2, 6);
    box(g, sw + 0.2, 0.08, 0.35, 0, sy, z0 + 0.17, ssm); const sh = new THREE.Mesh(new THREE.PlaneGeometry(sw, sy - 1.1), wt); sh.position.set(0, (sy - 1.1) / 2 + 1.1, z0 + 0.32); g.add(sh);
    box(g, Math.min(w - 0.2, sw + 2), 1.1, 1.4, 0, 0.55, z0 + 0.7, mChar()); box(g, Math.min(w - 0.2, sw + 2) - 0.25, 0.04, 1.15, 0, 1.08, z0 + 0.7, mat('c_wpool', 0x5FA9C4, { roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.85 }));
    box(g, sw, 0.04, 0.06, 0, sy - 0.08, z0 + 0.36, mLed(), false); box(g, w - 0.3, 0.05, 0.08, 0, H - 0.1, z0 + 0.05, mLed(), false);
    const wsh = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.4, H * 0.6), washMat()); wsh.position.set(0, H - H * 0.3, z0 + 0.03); wsh.rotation.z = Math.PI; nightOnly(wsh, g);
    [-1, 1].forEach(sg => { const x = sg * (sw / 2 + 1.6); if (Math.abs(x) < w / 2 - 0.3) upLight(g, x, z0 + 0.3, z0 + 0.05, H); });
  } else if (cat === 'feature' && themeKey() === 'tropical') {   // 292 (owner, Tropical guide): rough grey stone, creepers over it, big leaves at the foot
    const H = h || 8, D0 = Math.max(0.4, d), sh = [mat('c_rs1', 0x8C8A84, { roughness: 1 }), mat('c_rs2', 0x7A7873, { roughness: 1 }), mat('c_rs3', 0xA3A19B, { roughness: 1 })]; box(g, w, H, D0, 0, H / 2, -0.04, mat('c_rs0', 0x6E6C68, { roughness: 1 }));
    let r = 0; for (let y = 0.05; y < H - 0.1; y += 0.55, r++) { let x = -w / 2 + (r % 2 ? 0.35 : 0); while (x < w / 2 - 0.05) { const bw = Math.min(w / 2 - x, 0.9 + ((r * 7 + Math.round(x * 3)) % 5) * 0.18); if (bw > 0.08) box(g, bw - 0.06, 0.49, 0.1 + ((r + Math.round(x)) % 3) * 0.03, x + bw / 2, y + 0.25, D0 / 2 - 0.02, sh[(r + Math.round(x * 2)) % 3], false); x += bw; } }
    const cr = C(); for (let k = 0; k < Math.round(w * 2.2); k++) { const x = -w / 2 + 0.2 + ((k * 0.618) % 1) * (w - 0.4), len = 1.5 + ((k * 37) % 10) / 3; for (let j = 0; j < len / 0.35; j++) { const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18 + ((k + j) % 3) * 0.05, 0), (k + j) % 2 ? cr.leaf : cr.leaf2); lf.position.set(x + Math.sin(j * 1.3 + k) * 0.18, H - 0.15 - j * 0.35, D0 / 2 + 0.12); g.add(lf); } }
    [-0.3, 0.25].forEach((f, i) => { const m = noSh(plantModel(THREE, i ? 'BIRDPARADISE' : 'BANANA', 4.5, { pot: 'none', seed: 7 + i })); m.position.set(w * f, 0, D0 / 2 + 0.9); g.add(m); });
  } else if (cat === 'feature') {
    const H = h || 8; box(g, w, H, Math.max(0.4, d), 0, H / 2, 0, K.stone); for (let y = 0.5; y < H; y += 0.8) box(g, w + 0.02, 0.06, Math.max(0.4, d) + 0.02, 0, y, 0, mat('c_joint', 0x9C958A), false);
    if (it && it.fdesign === 'stone') { [-0.35, 0, 0.35].forEach(f => box(g, 0.3, 0.2, 0.3, w * f, 0.1, Math.max(0.4, d) / 2 + 0.25, K.dark)); for (let y = 0.4; y < H - 0.5; y += 0.45) { const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3 + (y % 0.9) * 0.2, 0), y % 0.9 > 0.45 ? K.leaf : K.leaf2); lf.position.set(-w / 2 + 0.35 + Math.sin(y * 3) * 0.25, y, Math.max(0.4, d) / 2 + 0.2); g.add(lf); } }
  } else if (cat === 'vgarden') {
    const H = h || 6; box(g, w, H, 0.3, 0, H / 2, -0.1, K.wood2);
    const sp = LITE ? 1.4 : 1.05, VGK = ['SYNGONIUM', 'MONEYPLANT', 'CHLOROPHYTUM', 'ZZ', 'DRACAENA', 'SYNGONIUM', 'MONEYPLANT'];   // 284 (owner): a living wall of real plants — syngonium, money plant, chlorophytum, ZZ, dracaena
    box(g, w - 0.1, H - 0.2, 0.06, 0, H / 2, 0.08, mat('vg_felt', 0x2C3A24, { roughness: 1 }), false); let vi = 0;
    for (let y = 0.55; y < H - 0.2; y += sp) for (let x = -w / 2 + sp / 2 + ((Math.round(y / sp) % 2) ? sp / 2 : 0); x < w / 2 - 0.15; x += sp) { const k = VGK[(vi * 3 + Math.round(y * 7)) % VGK.length], m = noSh(plantModel(THREE, k, 1.3, { pot: 'none', seed: 3 })); vi++;
      m.position.set(x, y - 0.3, 0.12); m.rotation.x = 1.05; m.rotation.z = ((vi * 37) % 10 - 5) * 0.06; m.scale.setScalar(k === 'MONEYPLANT' || k === 'CHLOROPHYTUM' ? 0.95 : 0.8); g.add(m); }
  } else if (cat === 'graffiti') {
    const H = h || 6, op = (it && it.open) || [], pcs = [];   // painted pieces round any door (u from the left end)
    let u = 0; op.slice().sort((a, b) => a.u0 - b.u0).forEach(o => { if (o.u0 > u) pcs.push([u, o.u0, 0, H]); if (H > o.h) pcs.push([o.u0, o.u1, o.h, H]); u = o.u1; }); if (u < w) pcs.push([u, w, 0, H]);
    pcs.forEach(([a0, a1, y0, y1]) => { const pw = a1 - a0, ph = y1 - y0, cx = -w / 2 + (a0 + a1) / 2; if (pw < 0.05 || ph < 0.05) return; box(g, pw, ph, 0.3, cx, y0 + ph / 2, 0, K.white);
      const a = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(0.1, pw - (pcs.length > 1 ? 0.1 : 0.4)), Math.max(0.1, ph - (pcs.length > 1 ? 0.1 : 0.4))), art()); a.position.set(cx, y0 + ph / 2, 0.16); g.add(a); });
  } else if (cat === 'pathway') {   // 224: grey stone slabs on pebbles, along the long side
    const L = Math.max(w, d), W = Math.min(w, d), al = d >= w; if (!(it && it.onTurf)) box(g, w, 0.05, d, 0, 0.025, 0, mat('c_pebble', 0xCFC8BC), false);   // 241: on the grass = stepping stones only
    const n = Math.max(1, Math.floor(L / 2.2)); for (let k = 0; k < n; k++) { const u = -L / 2 + L * (k + 0.5) / n; box(g, al ? W - 0.5 : 1.8, 0.1, al ? 1.8 : W - 0.5, al ? 0 : u, 0.08, al ? u : 0, mat('c_slab', 0x8F8A82), false); }
  } else if (cat === 'turf') {
    const n = Math.max(1, Math.round(d / 2)); for (let k = 0; k < n; k++) box(g, w, 0.08, d / n, 0, 0.04, -d / 2 + d * (k + 0.5) / n, k % 2 ? mat('c_turf', 0x6FA24A) : mat('c_turf2', 0x63963F), false);
  } else if (cat === 'firepit' && ['turkish', 'modern', 'contemporary'].includes(themeKey())) {   // 275: the theme's fire pit
    const TK = themeKey(), r = Math.min(w, d) / 2, fl = () => [[0, 0, 1.2], [0.4, 0.2, 0.9], [-0.35, 0.25, 1]].forEach(([x, z, hh]) => { const f = new THREE.Mesh(new THREE.ConeGeometry(0.3, hh, 8), mat('c_flame', 0xFF8A2A, { emissive: 0xFF6A00, emissiveIntensity: 1.2, roughness: 1 })); f.position.set(x * r / 2, (TK === 'turkish' ? 2.1 : TK === 'minimal' ? 1.3 : 1.25) + hh / 2, z * r / 2); g.add(f); });
    if (TK === 'turkish') { const cu = mat('c_copper', 0xB26A3C, { metalness: 0.85, roughness: 0.35 }); const bowl = new THREE.Mesh(new THREE.SphereGeometry(r * 0.8, 22, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), cu); bowl.rotation.x = Math.PI; bowl.position.y = 2.1; bowl.scale.y = 0.55; g.add(bowl); [0, 1, 2].forEach(k => { const a = k / 3 * Math.PI * 2; box(g, 0.1, 1.9, 0.1, Math.cos(a) * r * 0.6, 0.95, Math.sin(a) * r * 0.6, cu); }); fl(); }
    else if (TK === 'modern') { box(g, w * 0.9, 1.2, d * 0.9, 0, 0.6, 0, mat('c_fpblk', 0x232323, { roughness: 0.6 })); box(g, w * 0.6, 0.05, d * 0.3, 0, 1.22, 0, mat('c_glassb', 0x111111, { roughness: 0.1 })); fl(); }
    
    else { cyl(g, r, r * 0.75, 1.2, 0, 0.6, 0, mat('c_conc', 0xBDB6AA, { roughness: 0.85 }), 28); cyl(g, r - 0.25, r - 0.25, 0.05, 0, 1.2, 0, mat('c_ember', 0x3A1A0A), 28); fl(); }
  } else if (cat === 'firepit' && ['santorini', 'tropical', 'boho'].includes(themeKey())) {   // 276: Santorini white lime bowl with a blue band, Tropical low lava-rock ring, Boho stacked stone with logs
    const TK = themeKey(), r = Math.min(w, d) / 2, fla = (y0, s0) => [[0, 0, 1.2], [0.4, 0.2, 0.9], [-0.35, 0.25, 1]].forEach(([x, z, hh]) => { const f = new THREE.Mesh(new THREE.ConeGeometry(0.3 * s0, hh * s0, 8), mat('c_flame', 0xFF8A2A, { emissive: 0xFF6A00, emissiveIntensity: 1.2, roughness: 1 })); f.position.set(x * r / 2, y0 + hh * s0 / 2, z * r / 2); g.add(f); });
    if (TK === 'santorini') { cyl(g, r, r * 0.8, 1.3, 0, 0.65, 0, mat('c_limefp', 0xF4F2EC, { roughness: 0.95 }), 28); cyl(g, r * 1.01, r * 0.97, 0.22, 0, 1.05, 0, mat('c_fpblue', 0x2B5DA8, { roughness: 0.4 }), 28); cyl(g, r - 0.25, r - 0.25, 0.05, 0, 1.3, 0, mat('c_ember', 0x3A1A0A), 28); fla(1.3, 1); }
    else if (TK === 'tropical') { const lv = [mat('c_lava1', 0x3A3532, { roughness: 1 }), mat('c_lava2', 0x4A433E, { roughness: 1 })], n = Math.max(9, Math.round(r * 9)); for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42 + (k % 3) * 0.06, 0), lv[k % 2]); st.position.set(Math.cos(a) * (r - 0.35), 0.32, Math.sin(a) * (r - 0.35)); st.rotation.set(k, k * 2, 0); st.scale.y = 0.75; st.castShadow = true; g.add(st); } cyl(g, r - 0.6, r - 0.6, 0.12, 0, 0.1, 0, mat('c_ember', 0x3A1A0A), 20); fla(0.2, 1.1); }
    else { const sm = [mat('c_bst1', 0xA58E72, { roughness: 1 }), mat('c_bst2', 0x8E7A62, { roughness: 1 }), mat('c_bst3', 0xB9A285, { roughness: 1 })]; for (let row = 0; row < 3; row++) { const n = Math.max(10, Math.round(r * 10)); for (let k = 0; k < n; k++) { const a = (k + row * 0.5) / n * Math.PI * 2, b = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, 0.38), sm[(k + row) % 3]); b.position.set(Math.cos(a) * (r - 0.2), 0.16 + row * 0.31, Math.sin(a) * (r - 0.2)); b.rotation.y = -a; b.castShadow = true; g.add(b); } }
      const lg = mat('c_log', 0x5A3C28, { roughness: 1 }); [0, 1, 2].forEach(k => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, r * 1.1, 8), lg); l.rotation.set(Math.PI / 2 - 0.35, k * 2.1, 0); l.position.set(0, 0.9, 0); g.add(l); }); fla(0.9, 1); }
  } else if (cat === 'firepit') {
    const r = Math.min(w, d) / 2; cyl(g, r, r * 0.9, 1.2, 0, 0.6, 0, K.dark, 28); cyl(g, r - 0.3, r - 0.3, 0.05, 0, 1.2, 0, mat('c_ember', 0x3A1A0A), 28);
    [[0, 0, 1.4], [0.5, 0.2, 1], [-0.4, 0.3, 1.1], [0.1, -0.5, 0.9]].forEach(([x, z, hh]) => { const f = new THREE.Mesh(new THREE.ConeGeometry(0.35, hh, 8), mat('c_flame', 0xFF8A2A, { emissive: 0xFF6A00, emissiveIntensity: 1.2, roughness: 1 })); f.position.set(x, 1.2 + hh / 2, z); g.add(f); });
  } else if (cat === 'jacuzzi') {
    // 272 (owner): a real spa — wooden skirting with slats, white acrylic shell with a rim, rounded seats, headrests, water with jets, steps, underwater light at night
    const H = h || 3, rim = 0.55, iw = w - 2 * rim, id = d - 2 * rim, acr = mat('c_jacr', 0xF4F4F2, { roughness: 0.25 }), sk = K.themed ? K.wood2 : mat('c_jsk', 0x6E4B33, { roughness: 0.8 }), sk2 = K.themed ? K.wood : mat('c_jsk2', 0x5A3C28, { roughness: 0.8 });
    const wat = mat('c_jwat', 0x5FC4D9, { roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.82, emissive: 0x0E5B6A, emissiveIntensity: 0.25 });
    const B = H - 1.2; box(g, w - 0.1, B, d - 0.1, 0, B / 2, 0, sk);   // cabinet (the tub's floor at B)
    [[w, 'z', d / 2], [w, 'z', -d / 2], [d, 'x', w / 2], [d, 'x', -w / 2]].forEach(([L, ax, o]) => { if (ax === 'z') box(g, L, 1.0, 0.06, 0, B + 0.5, o, sk, false); else box(g, 0.06, 1.0, L, o, B + 0.5, 0, sk, false);   // skirting up to the rim
      const n = Math.max(3, Math.round(L / 0.45)); for (let k = 1; k < n; k++) { const u = -L / 2 + L * k / n; if (ax === 'z') box(g, 0.04, H - 0.45, 0.04, u, (H - 0.2) / 2, o + Math.sign(o) * 0.04, sk2, false); else box(g, 0.04, H - 0.45, 0.04, o + Math.sign(o) * 0.04, (H - 0.2) / 2, u, sk2, false); } });
    box(g, w, 0.12, d, 0, 0.06, 0, sk2);   // plinth
    [[w - 0.12, rim - 0.06, 0, -d / 2 + rim / 2], [w - 0.12, rim - 0.06, 0, d / 2 - rim / 2], [rim - 0.06, id, -w / 2 + rim / 2, 0], [rim - 0.06, id, w / 2 - rim / 2, 0]].forEach(([a, b, x, z]) => box(g, a, 1.0, b, x, B + 0.5, z, acr, false));   // shell walls
    box(g, w + 0.06, 0.12, rim, 0, H + 0.02, -d / 2 + rim / 2, acr); box(g, w + 0.06, 0.12, rim, 0, H + 0.02, d / 2 - rim / 2, acr); box(g, rim, 0.12, id, -w / 2 + rim / 2, H + 0.02, 0, acr); box(g, rim, 0.12, id, w / 2 - rim / 2, H + 0.02, 0, acr);   // rim
    box(g, iw, 0.04, id, 0, B + 0.02, 0, acr, false);   // shell floor
    const sd = Math.min(1.3, id * 0.3); box(g, iw, 0.45, sd, 0, B + 0.225, -id / 2 + sd / 2, acr, false); box(g, sd, 0.45, id - sd, -iw / 2 + sd / 2, B + 0.225, sd / 2, acr, false); box(g, sd * 1.6, 0.2, sd, iw / 2 - sd * 0.8, B + 0.1, id / 2 - sd / 2, acr, false);   // seats + lounger
    const water = box(g, iw - 0.02, 0.05, id - 0.02, 0, H - 0.42, 0, wat, false); water.castShadow = false;
    const hr = mat('c_jhr', 0x3A3A3A, { roughness: 0.6 }); [[-iw / 4, -d / 2 + rim / 2], [iw / 4, -d / 2 + rim / 2], [-w / 2 + rim / 2, id / 6]].forEach(([x, z], k) => { const b = box(g, k < 2 ? 1 : 0.4, 0.14, k < 2 ? 0.4 : 1, x, H + 0.14, z, hr); b.castShadow = false; });   // headrests
    const fo = mat('c_jfoam', 0xFFFFFF, { roughness: 0.9, transparent: true, opacity: 0.85 }); for (let k = 0; k < 14; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.05 + (k % 3) * 0.03, 8, 6), fo); b.position.set((Math.sin(k * 2.3) * 0.42) * iw, H - 0.38, (Math.cos(k * 1.7) * 0.4) * id); g.add(b); }   // jets bubbling
    const st = mat('c_jchr', 0xC8CCD0, { metalness: 0.9, roughness: 0.2 }); [[-iw / 2 + 0.03, 0], [iw / 2 - 0.03, -id / 4], [0, -id / 2 + 0.03]].forEach(([x, z]) => cyl(g, 0.07, 0.07, 0.05, x, B + 0.7, z, st, 10));   // jet nozzles
    box(g, 0.7, 0.08, 0.35, w / 2 - rim / 2, H + 0.02, d / 2 - rim / 2, mat('c_jpanel', 0x1E1E1E, { roughness: 0.3 }), false);   // control panel
    box(g, Math.min(3, w * 0.5), H * 0.4, 0.8, 0, H * 0.2, d / 2 + 0.4, sk);   // one step up
    const ul = new THREE.Mesh(new THREE.PlaneGeometry(iw * 0.8, id * 0.8), mat('c_julight', 0x6FE3FF, { emissive: 0x3FD0FF, emissiveIntensity: 1.4, transparent: true, opacity: 0.55 })); ul.rotation.x = -Math.PI / 2; ul.position.y = B + 0.05; nightOnly(ul, g);
  } else if (cat === 'lights') {
    cyl(g, 0.15, 0.2, (h || 3) - 0.4, 0, ((h || 3) - 0.4) / 2, 0, K.frame, 10); cyl(g, 0.3, 0.25, 0.4, 0, (h || 3) - 0.2, 0, mat('c_lamp', 0xFFE2A8, { emissive: WARM, emissiveIntensity: 1 }), 12);
  } else if (cat === 'umbrella' && themeKey()) {   // 275: the theme's umbrella
    const TK = themeKey(), H = h || 8, r = Math.min(w, d) / 2; cyl(g, 0.9, 1, 0.4, 0, 0.2, 0, K.dark, 16);
    if (TK === 'tropical') { cyl(g, 0.12, 0.12, H, 0, H / 2, 0, K.wood2, 8); const th = new THREE.Mesh(new THREE.ConeGeometry(r, 2.2, 14, 3), mat('c_thatch', 0xC7A46A, { roughness: 1, side: THREE.DoubleSide })); th.position.y = H - 0.4; th.castShadow = true; g.add(th); for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2; box(g, 0.08, 0.5, 0.02, Math.cos(a) * r * 0.98, H - 1.6, Math.sin(a) * r * 0.98, mat('c_thatch2', 0xB18E56)).rotation.y = -a; } }
    else if (TK === 'modern' || TK === 'minimal') { const col = TK === 'modern' ? 0x8F8F8C : 0xF2F2EE; cyl(g, 0.1, 0.1, H + 0.4, -r * 0.75, (H + 0.4) / 2, 0, K.frame, 8); box(g, r * 0.8, 0.1, 0.1, -r * 0.35, H + 0.3, 0, K.frame); const sq = new THREE.Mesh(new THREE.ConeGeometry(r * 1.35, 0.9, 4, 1, true), mat('c_umb_' + TK, col, { side: THREE.DoubleSide })); sq.rotation.y = Math.PI / 4; sq.position.y = H; sq.castShadow = true; g.add(sq); }
    else { cyl(g, 0.1, 0.1, H, 0, H / 2, 0, K.wood2, 8); const cv = document.createElement('canvas'); cv.width = 256; cv.height = 16; const x2 = cv.getContext('2d'); const cols = TK === 'turkish' ? ['#9E2B25', '#F3EEE6', '#1F6F7E', '#F3EEE6'] : TK === 'santorini' ? ['#2B5DA8', '#F7F7F4'] : TK === 'boho' ? ['#B5562F', '#EFE4D2', '#C98B3A', '#EFE4D2'] : ['#D8C9A8', '#EDE6DA']; for (let k = 0; k < 16; k++) { x2.fillStyle = cols[k % cols.length]; x2.fillRect(k * 16, 0, 16, 16); }
      const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; const c = new THREE.Mesh(new THREE.ConeGeometry(r, 1.6, 16, 1, true), new THREE.MeshStandardMaterial({ map: tx, side: THREE.DoubleSide, roughness: 0.9 })); c.position.y = H - 0.6; c.castShadow = true; g.add(c);
      if (TK === 'turkish' || TK === 'boho') for (let k = 0; k < 32; k++) { const a = k / 32 * Math.PI * 2; const t = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.35, 5), TK === 'boho' ? mat('c_tasselj', 0xD6BA8C) : mat('c_tassel', 0xE0A33B)); t.position.set(Math.cos(a) * r, H - 1.55, Math.sin(a) * r); t.rotation.x = Math.PI; g.add(t); } }
  } else if (cat === 'umbrella') {
    const H = h || 8, r = Math.min(w, d) / 2; cyl(g, 0.9, 1, 0.4, 0, 0.2, 0, K.dark, 16); cyl(g, 0.1, 0.1, H, 0, H / 2, 0, K.wood2, 8);
    const c = new THREE.Mesh(new THREE.ConeGeometry(r, 1.6, 8, 1, true), mat('c_canopy', 0xEADCC8, { side: THREE.DoubleSide })); c.position.y = H - 0.6; c.castShadow = true; g.add(c);
  } else box(g, w, h || 2, d, 0, (h || 2) / 2, 0, K.stone);
  return g;
}
function tag(text) {   // a small label above a placed thing
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 112; const x = cv.getContext('2d');
  x.fillStyle = 'rgba(255,255,255,.94)'; x.beginPath(); x.roundRect ? x.roundRect(4, 4, 504, 104, 40) : x.rect(4, 4, 504, 104); x.fill(); x.strokeStyle = '#C26445'; x.lineWidth = 5; x.stroke();
  x.fillStyle = '#2E2E2E'; let fs = 46; x.font = `700 ${fs}px Inter, Arial, sans-serif`; while (x.measureText(text).width > 470 && fs > 24) { fs -= 2; x.font = `700 ${fs}px Inter, Arial, sans-serif`; }
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 256, 58);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, toneMapped: false })); s.scale.set(4.6, 1, 1); s.renderOrder = 20; return s;
}

function pgO(it) {   // 193g: the pergola as set up in its designer (finish, colour, roof, layout), at the plan's size
  const c = it.cfg || {}, g = c.groups || {}, gv = re => { const k = Object.keys(g).find(n => re.test(n)); return k ? g[k] : ''; };
  return { l: it.w, w: it.d, height: String(+it.h || 8), colour: c.colour || 'Black', material: c.material, cover: gv(/roof|cover/i), layout: gv(/layout/i) };
}
function model(it, P) {   // the inner model, footprint w × d from (0, 0) to (w, d)
  if (it.cat === 'cabin' && P.cabinCfg && P.cabinCfg(it)) { let c0 = P.cabinCfg(it), l0 = P.cabinLay(it); if (themeKey() === 'tropical') { c0 = Object.assign({}, c0, { shades: [{ name: 'TropGrey', hex: '#6E6C68' }].concat(c0.shades || []) }); l0 = Object.assign({}, l0, { wall_fin: { front: { shade: 'TropGrey' }, back: { shade: 'TropGrey' }, right: { shade: 'TropGrey' }, left: { fin: 'wpc' } } }); }   // 292: tropical cabin = grey textured walls + a dark-wood clad side
    const b = cabinModel(c0, l0); { const lb = b.g.getObjectByName('labels'); if (lb) lb.visible = false; } if (themeKey() === 'tropical') tropCabin(b.g); else if (themeKey() === 'turkish') turCabin(b.g); else if (themeKey() === 'santorini') santCabin(b.g); else if (themeKey() === 'modern') modCabin(b.g); else if (themeKey() === 'boho') bohoCabin(b.g); const h = new THREE.Group(); b.g.position.y = 0.6; h.add(b.g); return h; }   // 253: no "Wall / Swing door" tags in the plan
  if (it.cat === 'pergola' && !it.cfgId && !it.pick && !P.fullPergola) {   // 245 (owner): in the plan a light, simple pergola — 4 slim posts, a frame, thin rafters; the chosen design shows in full
    const h = new THREE.Group(), y0 = it.deck ? 0.6 : 0, H = (+it.h || 8), w = +it.w, d = +it.d, TW = themeKey() === 'tropical', fm = (THEMES[THEME] || {}).pot != null ? mat('c_pgs_' + THEME, THEMES[THEME].frame, { metalness: THEMES[THEME].metal ? 0.55 : TW ? 0.02 : 0.3, roughness: TW ? 0.8 : 0.5 }) : mat('c_pgs', 0x2F2F2F, { metalness: 0.35, roughness: 0.5 }), sp = Math.max(w, d) > 16 ? 3 : 2;   // 274: the theme's frame
    if (it.deck && !deckUnder(it, P)) { const dk = mat('c_pdeck', 0x8B6A4A); box(h, w, DECK_H, d, w / 2, DECK_H / 2, d / 2, dk); }
    const px = [0.2, w - 0.2].concat(w > 16 ? [w / 2] : []), pz = [0.2, d - 0.2].concat(d > 16 ? [d / 2] : []);
    const st = P.site || {}, sh = st.kind === 'terrace' ? (st.blocks || []).filter(b => b.type === 'shaft') : [], E = 0.75, par = +st.par || 3, f0 = foot(it), cx0 = +it.x + f0[0] / 2, cz0 = +it.z + f0[1] / 2, ph = -(+it.rot || 0) * Math.PI / 180, cs = Math.cos(ph), sn = Math.sin(ph);
    const toW = (x, z) => { const a = x - w / 2, b = z - d / 2; return [cx0 + a * cs + b * sn, cz0 - a * sn + b * cs]; }, toL = (X, Z) => { const a = X - cx0, b = Z - cz0; return [a * cs - b * sn + w / 2, a * sn + b * cs + d / 2]; };
    const post = (x, z) => { let [X, Z] = toW(x, z), base = y0; const s0 = sh.find(b => X > +b.x - 0.15 && X < +b.x + +b.w + 0.15 && Z > +b.z - 0.15 && Z < +b.z + +b.d + 0.15);   // 259 (owner): a post never stands in a shaft — it goes just outside it, or onto the parapet when the shaft is against it
      if (s0) { const c = [[+s0.x - 0.3, Z], [+s0.x + +s0.w + 0.3, Z], [X, +s0.z - 0.3], [X, +s0.z + +s0.d + 0.3]].map(([a, b]) => { const out = a < E || a > (+st.pw || 30) - E || b < E || b > (+st.pd || 60) - E; return [Math.max(E / 2, Math.min((+st.pw || 30) - E / 2, a)), Math.max(E / 2, Math.min((+st.pd || 60) - E / 2, b)), out]; }).sort((p, q) => Math.hypot(p[0] - X, p[1] - Z) - Math.hypot(q[0] - X, q[1] - Z))[0];
        X = c[0]; Z = c[1]; if (c[2]) base = par; }
      const [lx, lz] = toL(X, Z), hh = Math.max(0.5, y0 + H - base); const BO = themeKey() === 'boho', ps = TW ? 0.5 : themeKey() === 'santorini' ? 0.55 : BO ? 0.7 : 0.3, p0 = box(h, ps, hh, ps, lx, base + hh / 2, lz, themeKey() === 'santorini' ? sLime() : BO ? bLime() : fm); p0.userData.post = 1; };   // 292: tropical = 6" timber posts
    px.forEach(x => pz.forEach(z => { if ((x === w / 2 && z !== 0.2 && z !== d - 0.2) || (z === d / 2 && x !== 0.2 && x !== w - 0.2)) return; post(x, z); }));
    box(h, w, 0.35, 0.18, w / 2, y0 + H - 0.18, 0.2, fm); box(h, w, 0.35, 0.18, w / 2, y0 + H - 0.18, d - 0.2, fm); box(h, 0.18, 0.35, d, 0.2, y0 + H - 0.18, d / 2, fm); box(h, 0.18, 0.35, d, w - 0.2, y0 + H - 0.18, d / 2, fm);
    for (let x = TW ? 0.7 : 1.2; x < w - 0.4; x += TW ? 0.7 : 1.2) box(h, TW ? 0.16 : 0.1, TW ? 0.3 : 0.22, d - 0.2, x, y0 + H + (TW ? 0.1 : 0.05), d / 2, fm, false);
    const TK = themeKey(), yb = y0 + H - 0.4;   // 275 (owner): the simple pergola dressed for the theme
    if (TK === 'turkish') { [[0.2, 0.2, w - 0.2, 0.2], [0.2, d - 0.2, w - 0.2, d - 0.2], [0.2, 0.2, 0.2, d - 0.2], [w - 0.2, 0.2, w - 0.2, d - 0.2]].forEach(([x1, z1, x2, z2]) => { const L = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.round(L / 6)); for (let k = 0; k < n; k++) { const sp = L / n, a = new THREE.Mesh(new THREE.TorusGeometry(sp / 2 - 0.15, 0.09, 6, 24, Math.PI), fm); const u = (k + 0.5) / n; a.position.set(x1 + (x2 - x1) * u, yb - sp / 2 + 0.3, z1 + (z2 - z1) * u); if (x1 === x2) a.rotation.y = Math.PI / 2; a.scale.y = Math.min(1, 1.6 / (sp / 2)); h.add(a); } });
      [[w * 0.35, d * 0.4], [w * 0.65, d * 0.6], [w * 0.5, d * 0.25]].forEach(([x, z]) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.6, 4), mat('c_cord', 0x222222)); c.position.set(x, y0 + H - 0.9, z); h.add(c); lantern(h, x, y0 + H - 2.1, z, 1); });
      { const t = girihTex(), jm = M.c_tk_jroof || (M.c_tk_jroof = new THREE.MeshStandardMaterial({ color: 0xEDE3D0, map: t, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 })), geo = new THREE.PlaneGeometry(w - 0.2, d - 0.2), uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w - 0.2) / 2, uv.getY(i) * (d - 0.2) / 2); const jr = new THREE.Mesh(geo, jm); jr.rotation.x = -Math.PI / 2; jr.position.set(w / 2, y0 + H + 0.32, d / 2); jr.castShadow = true; h.add(jr); }   // 294: girih jaali roof — dappled shade
      { const fl = [mat('c_bgv1', 0xD0207E, { roughness: 0.9 }), mat('c_bgv2', 0xE0308E, { roughness: 0.9 })], lf = C(), geo = new THREE.IcosahedronGeometry(0.14, 1); for (let k = 0; k < Math.round(w * 9); k++) { const u = (k * 0.618) % 1, m = new THREE.Mesh(geo, k % 3 ? fl[k % 2] : lf.leaf); m.position.set(0.3 + u * (w - 0.6), y0 + H + 0.4 + ((k * 7) % 5) * 0.08, 0.15 + ((k * 13) % 9) * 0.14); m.scale.set(1.2, 0.8, 1.2); h.add(m); if (k % 6 === 0) { const dr = new THREE.Mesh(geo, fl[(k + 1) % 2]); dr.position.set(m.position.x, y0 + H - 0.2 - ((k * 3) % 4) * 0.25, 0.25); dr.scale.set(0.9, 1.4, 0.8); h.add(dr); } } } }   // bougainvillea along the front beam
    else if (TK === 'santorini') {   // 296 (owner, Santorini guide): blue timber beams with carved bracket ends over white posts, bougainvillea over the top, a rattan pendant
      const fl = [mat('c_bgv1', 0xD0207E, { roughness: 0.9 }), mat('c_bgv2', 0xE0308E, { roughness: 0.9 }), mat('c_bgvw', 0xF5F2F4, { roughness: 0.9 })], lf = C(), geo = new THREE.IcosahedronGeometry(0.17, 1); let sd = Math.round(w * 13 + d * 7) + 5; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      const nc = Math.max(3, Math.round(w * d / (LITE ? 16 : 10)));   // bougainvillea in clumps — denser at one corner, trailing down the posts' side
      for (let c = 0; c < nc; c++) { const cx = (c === 0 ? 0.15 : rnd()) * w, cz = (c === 0 ? 0.15 : rnd() * 0.85) * d, R0 = 0.8 + rnd() * 1.4, nb = LITE ? 18 : 34; for (let k = 0; k < nb; k++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * R0, m = new THREE.Mesh(geo, rnd() < 0.35 ? (rnd() < 0.5 ? lf.leaf : lf.leaf2) : rnd() < 0.12 ? fl[2] : fl[k % 2]); m.position.set(Math.max(0.1, Math.min(w - 0.1, cx + Math.cos(a) * r)), y0 + H + 0.5 + rnd() * 0.35 * (1 - r / R0), Math.max(0.1, Math.min(d - 0.1, cz + Math.sin(a) * r))); m.scale.set(1.2, 0.85, 1.2); h.add(m); }
        if (rnd() < 0.6) for (let k = 0; k < 7; k++) { const m = new THREE.Mesh(geo, k % 3 ? fl[k % 2] : lf.leaf); m.position.set(cx + (rnd() - 0.5) * 0.6, y0 + H - k * 0.32, cz + (rnd() - 0.5) * 0.6); h.add(m); } }
      pendant(h, w / 2, y0 + H - 1.7, d / 2, 'rattan'); }
    else if (TK === 'tropical') {   // 292 (owner, Tropical guide): close dark-wood rafters under clear polycarbonate, hanging lanterns + hanging planters
      box(h, w - 0.1, 0.04, d - 0.1, w / 2, y0 + H + 0.28, d / 2, mat('c_polyc', 0xDCEBF2, { transparent: true, opacity: 0.18, roughness: 0.15, metalness: 0, depthWrite: false }), false);
      const cord = mat('c_cord', 0x222222), cx = (x, z, L) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, L, 4), cord); c.position.set(x, y0 + H - L / 2, z); h.add(c); };
      const nl = Math.max(1, Math.round(w / 8)); for (let k = 0; k < nl; k++) { const x = w * (k + 0.5) / nl; cx(x, d / 2, 1.4); lantern(h, x, y0 + H - 2.2, d / 2, 1.1); }
      [[0.9, 0.9], [w - 0.9, 0.9], [0.9, d - 0.9], [w - 0.9, d - 0.9]].forEach(([x, z], k) => { cx(x, z, 1.1); const hp = new THREE.Group(); hp.position.set(x, y0 + H - 1.6, z); h.add(hp); cyl(hp, 0.45, 0.32, 0.45, 0, 0, 0, k % 2 ? mat('c_pott', 0xB06A47, { roughness: 0.9 }) : C().stone, 12);
        for (let j = 0; j < 7; j++) { const a = j / 7 * 6.28, v = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.4 + (j % 3) * 0.5, 4), j % 2 ? C().leaf : C().leaf2); v.position.set(Math.cos(a) * 0.35, -0.7 - (j % 3) * 0.25, Math.sin(a) * 0.35); v.rotation.x = Math.PI; hp.add(v); } }); }
    else if (TK === 'contemporary') { const cu = mat('c_sheer', 0xF4EFE6, { transparent: true, opacity: 0.55, side: THREE.DoubleSide, roughness: 1 }); [[0.2, 0.2], [w - 0.2, 0.2], [0.2, d - 0.2], [w - 0.2, d - 0.2]].forEach(([x, z]) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, H - 0.6, 10, 1, true), cu); c.position.set(x + (x < w / 2 ? 0.4 : -0.4), y0 + (H - 0.6) / 2, z + (z < d / 2 ? 0.4 : -0.4)); h.add(c); });
      [[w * 0.35, d * 0.5], [w * 0.65, d * 0.5]].forEach(([x, z]) => pendant(h, x, y0 + H - 1.7, z, 'globe')); }
    else if (TK === 'boho') {   // 299 (Ibiza refs): raw timber beams + rafters under a reed mat roof, big woven rattan pendants
      const rf = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.1, d - 0.1), reedMat()); rf.rotation.x = -Math.PI / 2; rf.position.set(w / 2, y0 + H + 0.32, d / 2); rf.castShadow = true; rf.receiveShadow = true; h.add(rf);
      const np = Math.max(1, Math.round(w / 9)); for (let k = 0; k < np; k++) bPendant(h, w * (k + 0.5) / np, y0 + H - 2.4, d / 2, 1); }
    else if (TK === 'modern') {   // 298 (owner, Modern guide): charcoal frame, warm teak louvres across the top, a warm LED line round the inner edge, down lights
      const tk = mTeak(), L = mLed(); for (let x = 0.65; x < w - 0.4; x += 0.45) { const lv = box(h, 0.08, 0.42, d - 0.5, x, y0 + H + 0.08, d / 2, tk, false); lv.rotation.z = 0.35; }
      [[w - 0.6, 0.06, w / 2, 0.32], [w - 0.6, 0.06, w / 2, d - 0.32], [0.06, d - 0.6, 0.32, d / 2], [0.06, d - 0.6, w - 0.32, d / 2]].forEach(([a, b, x, z]) => box(h, a, 0.05, b, x, y0 + H - 0.37, z, L, false));
      const nx = Math.max(1, Math.round(w / 5)), nz = Math.max(1, Math.round(d / 5)); for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const x = w * (i + 0.5) / nx, z = d * (j + 0.5) / nz; box(h, 0.25, 0.08, 0.25, x, y0 + H - 0.05, z, mChar(), false); const dl = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 10), L); dl.position.set(x, y0 + H - 0.1, z); h.add(dl); } }
    h.userData.pg = { top: H + y0 }; return h; }
  if (it.cat === 'pergola') { try { const b = pergolaModel(/^MTO-PG-/.test(it.cfgId || it.pick || '') ? (it.cfgId || it.pick) : (P.pergolaSku || 'MTO-PG-TW'), pgO(it)), h = new THREE.Group(), y0 = it.deck ? 0.6 : 0;   // 193d: on a deck as high as a porta cabin's
    b.g.position.y = y0; h.add(b.g); if (it.deck && !deckUnder(it, P)) { const dk = mat('c_pdeck', 0x8B6A4A); const n = Math.max(1, Math.round(it.d / 0.5)); for (let k = 0; k < n; k++) box(h, it.w, DECK_H, it.d / n - 0.03, it.w / 2, DECK_H / 2, it.d * (k + 0.5) / n, k % 2 ? dk : mat('c_pdeck2', 0x7A5C40)); }
    h.userData.pg = { top: (+it.h || 8) + y0 }; return h; } catch (e) { /* fall back to a box */ } }
  const g = generic(it.cat, it.w, it.d, it.h, it); g.position.set(it.w / 2, 0, it.d / 2); const h = new THREE.Group(); h.add(g); return h;
}
const foot = it => (+it.rot || 0) % 180 ? [it.d, it.w] : [it.w, it.d];

function build(P) {
  if (R) R.nl = []; const g = new THREE.Group(), t = P.site || {}, terr = t.kind === 'terrace';
  if (terr) { const pg = plotModel(t); pg.position.y = 0.6; g.add(pg); R.plot = pg; if (P.labels !== false) (t.blocks || []).forEach(b => { const nm = b.type === 'mumty' ? 'Stairs' : b.type === 'shaft' ? 'Shaft' : b.type === 'lift' ? 'Lift' : ''; if (!nm) return; const tg = tag(nm); tg.position.set(+b.x + b.w / 2, (b.type === 'shaft' ? Math.max(+b.h || 0, 1) : (+b.h || 9)) + 2, +b.z + b.d / 2); g.add(tg); }); /* 253: what the roof's own blocks are */ if (t.floor) try { floorFin(g, t, P.items || []); cozy(g, t, P.items || []); } catch (e) { console.warn(e); } (P.ptags || []).forEach(q => { const tg = tag(q.text); tg.scale.set(8.5, 1.85, 1); tg.position.set(q.x, q.y, q.z); g.add(tg); }); /* 277: the proposal's numbered labels */ } else { lawn(g, t); R.plot = null; }
  const items = new THREE.Group(); items.name = 'items'; g.add(items); R.holders = [];
  drawItems(items, R.holders, P);
  if (P.measure && terr) { try { g.add(measures(P)); } catch (e) {} }
  if (terr && t.light === 'full') try { wallLights(g, t); } catch (e) {}
  if (terr && t.light && t.light !== 'none') try { mumtyLights(g, t); } catch (e) {}
  { const L = []; g.traverse(o => { if (o.isLight && !o.isDirectionalLight && !o.isHemisphereLight && !o.isAmbientLight) L.push(o); });   // 259 (owner: heavy, keeps moving): lamps only at night, and only so many on a phone
    const mx = LITE ? 14 : 28; L.forEach((o, k) => { if (L.length > mx && k % Math.ceil(L.length / mx)) { o.parent.remove(o); return; } o.intensity *= LITE ? 6 : 4; o.visible = !!R.night; o.userData.nightOnly = 1; (R.nl || (R.nl = [])).push(o); }); }   /* night lamps read as lamps (fewer of them, brighter) */
  return g;
}
// 233: sizes of the roof, every structure and thing, and the biggest free spaces left (1 ft grid, largest empty rectangles first)
function measures(P) {
  const g = new THREE.Group(), t = P.site, pw = +t.pw, pd = +t.pd, E = 0.75, W = Math.floor(pw), D = Math.floor(pd), occ = [], f1 = v => Math.round(v * 2) / 2;
  const K = Math.max(1.2, Math.max(pw, pd) / 22), lab = (txt, x, y, z, s) => { const tg = tag(txt); tg.position.set(x, y, z); tg.scale.multiplyScalar((s || 1) * K); g.add(tg); };
  for (let z = 0; z < D; z++) { occ.push([]); for (let x = 0; x < W; x++) occ[z].push(x < E || z < E || x + 1 > pw - E || z + 1 > pd - E ? 1 : 0); }
  const mark = (r, v) => { for (let z = Math.max(0, Math.floor(r.z)); z < Math.min(D, Math.ceil(r.z + r.d)); z++) for (let x = Math.max(0, Math.floor(r.x)); x < Math.min(W, Math.ceil(r.x + r.w)); x++) occ[z][x] = v; };
  if (Array.isArray(t.outline) && t.outline.length >= 3) { const O = outline(t); for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) { let c = false; for (let i = 0, j = O.length - 1; i < O.length; j = i++) { const [xi, zi] = O[i], [xj, zj] = O[j]; if ((zi > z + 0.5) !== (zj > z + 0.5) && x + 0.5 < (xj - xi) * (z + 0.5 - zi) / (zj - zi) + xi) c = !c; } if (!c) occ[z][x] = 1; } }
  const C = t.outline ? {} : t.cuts || {}; Object.keys(C).forEach(k => { const c = C[k]; if (!c || !c.type) return; for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) { const px = k[1] === 'l' ? x + 0.5 : pw - x - 0.5, pz = k[0] === 'b' ? z + 0.5 : pd - z - 0.5;
    if (px < c.a && pz < c.b && (c.type !== 'slant' || px / c.a + pz / c.b < 1)) occ[z][x] = 1; } });
  (t.blocks || []).forEach(b => { mark(b, 1); lab(f1(b.w) + ' × ' + f1(b.d) + ' ft', b.x + b.w / 2, (+b.h || 9) + 2.2, b.z + b.d / 2, 0.8); });
  (P.items || []).forEach(it => { if (!it || it.segs || it.box) return; const f = foot(it), r = { x: +it.x, z: +it.z, w: f[0], d: f[1] };
    if (!['deck', 'turf'].includes(it.cat)) mark(r, 1); lab(f1(it.w) + ' × ' + f1(it.d) + ' ft', r.x + r.w / 2, Math.max(+it.h || 3, 3) + (it.cat === 'pergola' ? 9 : 3.2), r.z + r.d / 2, 0.7); });
  lab('Terrace ' + f1(pw) + ' × ' + f1(pd) + ' ft', pw / 2, 4.5, pd + 2.5, 1.1);
  const best = () => { let b = null; const hgt = new Array(W).fill(0);   // largest empty rectangle (histogram method)
    for (let z = 0; z < D; z++) { for (let x = 0; x < W; x++) hgt[x] = occ[z][x] ? 0 : hgt[x] + 1; const st = [];
      for (let x = 0; x <= W; x++) { const h = x < W ? hgt[x] : 0; let s0 = x; while (st.length && st[st.length - 1][1] >= h) { const [sx, sh] = st.pop(); const w = x - sx; if (sh >= 3 && w >= 3 && (!b || sh * w > b.a)) b = { a: sh * w, x: sx, z: z - sh + 1, w, d: sh }; s0 = sx; } st.push([s0, h]); } }
    return b; };
  const fm = new THREE.MeshBasicMaterial({ color: 0x55A05A, transparent: true, opacity: 0.18, depthWrite: false }), lm = new THREE.LineBasicMaterial({ color: 0x3D7A44 });
  for (let k = 0; k < 5; k++) { const b = best(); if (!b || b.a < 25) break; mark(b, 2);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(b.w - 0.2, b.d - 0.2), fm); m.rotation.x = -Math.PI / 2; m.position.set(b.x + b.w / 2, 0.66, b.z + b.d / 2); g.add(m);
    const ln = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(b.w - 0.2, b.d - 0.2)), lm); ln.rotation.x = -Math.PI / 2; ln.position.copy(m.position); g.add(ln);
    lab('Free ' + b.w + ' × ' + b.d + ' ft', b.x + b.w / 2, 1.6, b.z + b.d / 2, 0.85); }
  return g;
}

// 235: night view — the lights show
function night(on) { if (!R || R.night === on) return; R.night = on; R.dirty = true; (R.nl || []).forEach(m => { m.visible = on; }); R.scene.background = new THREE.Color(on ? 0x141B2B : 0xeef0ea); R.sun.intensity = on ? 0.08 : 1.8; R.hemi.intensity = on ? 0.2 : 0.75; if ('environmentIntensity' in R.scene) R.scene.environmentIntensity = on ? 0.15 : 1; }
// 241: tropical planting in a pot — areca palm / big-leaf (monstera, bird of paradise) / round bush, size varies from pot to pot
function tropical(g, w, d, it) { const sd = Math.abs(Math.round((+(it && it.x) || 1) * 13 + (+(it && it.z) || 1) * 7)), rnd = (k => () => (k = (k * 16807) % 2147483647) / 2147483647)(sd + 11), r = Math.min(w, d) / 2, sz = 0.8 + rnd() * 0.9, ty = sd % 3;
  const KT = C(), pot = (themeKey() === 'tropical' && sd % 4 === 0 ? mat('c_pott', 0xB06A47, { roughness: 0.9 }) : KT.tpot) || (sd % 2 ? mat('c_potc', 0x3A3836, { roughness: 0.7 }) : mat('c_pott', 0xB06A47, { roughness: 0.9 })); cyl(g, r * 0.92, r * 0.72, r * 1.7, 0, r * 0.85, 0, pot, 20); const y0 = r * 1.7;
  const L1 = mat('c_lf1', 0x2F6B34, { roughness: 0.8, side: THREE.DoubleSide }), L2 = mat('c_lf2', 0x4C8A3C, { roughness: 0.8, side: THREE.DoubleSide }), L3 = mat('c_lf3', 0x22552A, { roughness: 0.85, side: THREE.DoubleSide });
  const leaf = (len, wid, m) => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(wid, len * 0.45, 0, len); sh.quadraticCurveTo(-wid, len * 0.45, 0, 0); const o = new THREE.Mesh(new THREE.ShapeGeometry(sh, 6), m); o.castShadow = true; return o; };
  if (ty === 0) { const n = 5 + Math.floor(rnd() * 4), H = (3.2 + rnd() * 2.5) * sz;   // areca palm: stems with arching fronds
    for (let i = 0; i < n; i++) { const a = i / n * 6.28 + rnd(), tl = 0.12 + rnd() * 0.15, hh = H * (0.6 + rnd() * 0.4); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, hh, 5), L3); st.position.set(Math.cos(a) * r * 0.3, y0 + hh / 2, Math.sin(a) * r * 0.3); st.rotation.z = Math.cos(a) * tl; st.rotation.x = -Math.sin(a) * tl; g.add(st);
      for (let k = 0; k < 7; k++) { const f = leaf(1.4 * sz, 0.12, k % 2 ? L1 : L2), ang = a + (k - 3) * 0.18; f.position.set(Math.cos(a) * (r * 0.3 + hh * tl), y0 + hh, Math.sin(a) * (r * 0.3 + hh * tl)); f.rotation.set(-Math.PI / 2 + 0.9 + rnd() * 0.4, 0, 0); f.rotation.order = 'YXZ'; f.rotation.y = -ang + Math.PI / 2; g.add(f); } } }
  else if (ty === 1) { const n = 7 + Math.floor(rnd() * 5);   // big leaves on long stalks
    for (let i = 0; i < n; i++) { const a = i / n * 6.28 + rnd() * 0.5, hh = (1.2 + rnd() * 2.2) * sz, f = leaf((1.1 + rnd() * 0.8) * sz, (0.45 + rnd() * 0.3) * sz, i % 3 ? L1 : L2);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, hh, 4), L3); st.position.set(Math.cos(a) * 0.3, y0 + hh / 2, Math.sin(a) * 0.3); g.add(st);
      f.position.set(Math.cos(a) * 0.3, y0 + hh, Math.sin(a) * 0.3); f.rotation.order = 'YXZ'; f.rotation.y = -a + Math.PI / 2; f.rotation.x = -0.5 - rnd() * 0.6; g.add(f); } }
  else { const n = 4 + Math.floor(rnd() * 3);   // a full round bush
    for (let i = 0; i < n; i++) { const rr = r * (0.55 + rnd() * 0.5) * sz, b = new THREE.Mesh(new THREE.IcosahedronGeometry(rr, 1), i % 2 ? L1 : L2); b.position.set((rnd() - 0.5) * r, y0 + rr * 0.8 + rnd() * r * 0.6 * sz, (rnd() - 0.5) * r); b.castShadow = true; g.add(b); } }
}
// 239: flowering creepers climbing each pergola post (bougainvillea-like: leaves + magenta flowers)
function creepers(hd, it) {   // 241: bougainvillea on one post (two on a big pergola, on two sides), from a planter at its foot — loose and uneven, not a wedding garland
  hd.updateMatrixWorld(true); const posts = []; hd.traverse(o => { if (o.isMesh && o.userData.post) posts.push(o); }); if (!posts.length) return;
  const inv = new THREE.Matrix4().copy(hd.matrixWorld).invert(), bx = new THREE.Box3(), P = posts.map(o => { bx.setFromObject(o).applyMatrix4(inv); return { cx: (bx.min.x + bx.max.x) / 2, cz: (bx.min.z + bx.max.z) / 2, r: Math.max(bx.max.x - bx.min.x, bx.max.z - bx.min.z) / 2, y0: bx.min.y, y1: bx.max.y }; });
  P.sort((a, b) => (b.cx + b.cz * 0.37) - (a.cx + a.cz * 0.37)); const big = (+(it && it.w) || 10) * (+(it && it.d) || 10) >= 150, pick = [P[0]];
  if (big) { const o = P.filter(p => Math.sign(p.cx) !== Math.sign(P[0].cx) && Math.sign(p.cz) !== Math.sign(P[0].cz))[0] || P[P.length - 1]; if (o !== P[0]) pick.push(o); }
  const rnd = (k => () => (k = (k * 16807) % 2147483647) / 2147483647)(Math.round(Math.abs(P[0].cx * 31 + P[0].cz * 17)) + 7), n = 260, LM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.22, 0), mat('c_leaf', 0x3F7D3A, { roughness: 0.9 }), n), FM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.17, 0), mat('c_bloom', 0xC2187A, { roughness: 0.7 }), n), q = new THREE.Matrix4(), e = new THREE.Euler();
  let li = 0, fi = 0; const put = (M, i, x, y, z, s) => { q.makeRotationFromEuler(e.set(rnd() * 3, rnd() * 3, rnd() * 3)); q.scale(new THREE.Vector3(s, s * (0.6 + rnd() * 0.6), s)); q.setPosition(x, y, z); M.setMatrixAt(i, q); };
  pick.forEach(p => { const pot = generic('planter', 1.6, 1.6, 1.4); pot.children.slice(1).forEach(c => pot.remove(c)); pot.position.set(p.cx + (p.cx > 0 ? 0.9 : -0.9), p.y0, p.cz + (p.cz > 0 ? 0.9 : -0.9)); hd.add(pot);
    let x = p.cx, z = p.cz, a = rnd() * 6.28; for (let y = p.y0 + 1; y < p.y1 && li < n - 2; y += 0.22) { a += 0.5 + rnd() * 0.9; const rr = p.r + 0.08 + rnd() * 0.35; x = p.cx + Math.cos(a) * rr; z = p.cz + Math.sin(a) * rr;
      put(LM, li++, x, y, z, 0.7 + rnd() * 0.9); if (y > p.y0 + 2.5 && rnd() < 0.45 + (y - p.y0) / (p.y1 - p.y0) * 0.4) put(FM, fi++, x + (rnd() - 0.5) * 0.4, y + rnd() * 0.2, z + (rnd() - 0.5) * 0.4, 0.8 + rnd() * 1.2); }
    for (let k = 0; k < 40 && li < n - 1; k++) { const ax = rnd() < 0.5, u = (rnd() - 0.2) * 3.5, x2 = p.cx - Math.sign(p.cx) * (ax ? u : 0) , z2 = p.cz - Math.sign(p.cz) * (ax ? 0 : u), y2 = p.y1 - 0.1 + (rnd() - 0.6) * 0.8;   // spills along the beams at the top
      put(LM, li++, x2, y2, z2, 0.8 + rnd()); if (rnd() < 0.7 && fi < n) put(FM, fi++, x2 + (rnd() - 0.5) * 0.5, y2 - rnd() * 0.5, z2 + (rnd() - 0.5) * 0.5, 0.9 + rnd() * 1.3); } });
  LM.count = li; FM.count = fi; LM.castShadow = true; hd.add(LM, FM); }
// 239: a soft cone of light under a down light — seen only in the night view
function downGlow(par, x, y, z, H) { return; if (!R) return; const h = Math.min(H, 6), m = new THREE.Mesh(new THREE.ConeGeometry(h * 0.32, h, 14, 1, true), mat('g_cone', WARM, { emissive: WARM, emissiveIntensity: 1, transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide }));
  m.position.set(x, y - h / 2, z); m.visible = !!R.night; m.userData.nightOnly = 1; par.add(m); (R.nl || (R.nl = [])).push(m); }
const glow = c => mat('g_' + c.toString(16), c, { emissive: c, emissiveIntensity: 2.2, roughness: 1 });
// wall lights on the structures and the parapet (full lighting)
// 245 (owner): warm white (≈ 2700 K) everywhere; up-down lights = black cylinders on the walls (never by the door), parapet lights = small black step lights; no cones — only the glow they throw
const WARM = 0xFFB86B, LENS = 0xFFD9A0, COVE = 0xFFB060;   // 268 (owner): warm white (≈ 2700 K), was reading as plain white   // 258 (owner): less yellow (≈ 3000 K)
function wallLights(g, t) { const W = WARM, gm = glow(LENS), blk = mat('lt_blk', 0x1E1E1E, { roughness: 0.45, metalness: 0.4 }), E = 0.75;
  const updown = (x, y, z, nx, nz) => { const c = new THREE.Group(); c.position.set(x + nx * 0.16, y, z + nz * 0.16); g.add(c);   // a black cylinder on the wall, light out of both ends
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.75, 16), blk); c.add(body); [-1, 1].forEach(sg => { const ln = new THREE.Mesh(new THREE.CircleGeometry(0.1, 14), gm); ln.rotation.x = sg > 0 ? -Math.PI / 2 : Math.PI / 2; ln.position.y = sg * 0.376; c.add(ln); });
    [-1, 1].forEach(sg => { const l = new THREE.PointLight(W, 1.1, 5.5, 2); l.position.set(x + nx * 0.35, y + sg * 1.4, z + nz * 0.35); g.add(l); }); };
  const step = (x, y, z, nx, nz) => { const b = new THREE.Mesh(new THREE.BoxGeometry(nx ? 0.08 : 0.5, 0.22, nz ? 0.08 : 0.5), blk); b.position.set(x, y, z); g.add(b); const ln = new THREE.Mesh(new THREE.BoxGeometry(nx ? 0.02 : 0.36, 0.05, nz ? 0.02 : 0.36), gm); ln.position.set(x + nx * 0.05, y - 0.06, z + nz * 0.05); g.add(ln);
    const l = new THREE.PointLight(W, 0.9, 5, 2); l.position.set(x + nx * 0.6, y - 0.6, z + nz * 0.6); g.add(l); };
  (t.blocks || []).filter(b => ['room', 'lift'].includes(b.type)).forEach(b => { const cx = b.x + b.w / 2, cz = b.z + b.d / 2, dx = t.pw / 2 - cx, dz = t.pd / 2 - cz;
    const door = b.door || (Math.abs(dx) / t.pw > Math.abs(dz) / t.pd ? (dx > 0 ? 'right' : 'left') : (dz > 0 ? 'front' : 'back')), dw = 2.8;
    if (Math.abs(dx) / t.pw > Math.abs(dz) / t.pd) { const rt = dx > 0, x = rt ? b.x + b.w : b.x, nd = door === (rt ? 'right' : 'left'); for (let z = b.z + 1.5; z < b.z + b.d - 1; z += 5) { if (nd && Math.abs(z - cz) < dw) continue; updown(x, 6, z, rt ? 1 : -1, 0); } }
    else { const fr = dz > 0, z = fr ? b.z + b.d : b.z, nd = door === (fr ? 'front' : 'back'); for (let x = b.x + 1.5; x < b.x + b.w - 1; x += 5) { if (nd && Math.abs(x - cx) < dw) continue; updown(x, 6, z, 0, fr ? 1 : -1); } } });
  const par = (+t.par || 3) - 0.9; for (let x = 4; x < t.pw - 3; x += 9) step(x, par, E + 0.04, 0, 1); for (let z = 4; z < t.pd - 3; z += 9) { step(E + 0.04, par, z, 1, 0); step(t.pw - E - 0.04, par, z, -1, 0); } }
// 263 (owner): down lights in the stairs room's projection by default — a warm V on its walls at night
function mumtyLights(g, t) { const gm = glow(LENS); (t.blocks || []).filter(b => b.type === 'mumty').forEach(b => { const e = mumtyProj(t, b), h = +b.h > 0 ? +b.h : 9, door = b.door;
  const run = (sd, x0, z0, len, ax, nx, nz) => { if ((e[sd[0]] || 0) < 1.2) return; const n = Math.max(1, Math.floor(len / 4)); for (let k = 0; k < n; k++) { const u = (k + 0.5) * len / n, x = x0 + (ax ? u : 0), z = z0 + (ax ? 0 : u);
      const dk = new THREE.Mesh(new THREE.CircleGeometry(0.16, 14), gm); dk.rotation.x = Math.PI / 2; dk.position.set(x + nx * 0.7, h - 0.01, z + nz * 0.7); g.add(dk);
      const wsh = new THREE.Mesh(new THREE.PlaneGeometry(2.8, h - 0.4), washMat()); wsh.position.set(x + nx * 0.06, (h - 0.4) / 2 + 0.2, z + nz * 0.06); wsh.rotation.y = Math.atan2(nx, nz); wsh.visible = !!(R && R.night); if (R) (R.nl || (R.nl = [])).push(wsh); g.add(wsh); } };
  run('left', b.x, b.z, b.d, false, -1, 0); run('right', b.x + b.w, b.z, b.d, false, 1, 0); run('back', b.x, b.z, b.w, true, 0, -1); run('front', b.x, b.z + b.d, b.w, true, 0, 1); }); }
// the setup's own lights: pergola profile, cove under bar / feature wall, spikes in planters, downlights on screens every 4 ft
function itemLights(hd, it, P) { const lv = (P.site || {}).light; if (!lv) return; const W = WARM, gm = glow(LENS), w = it.w, d = it.d, h = +it.h || 3;
  if (['deck', 'bar', 'counter', 'fbench'].includes(it.cat) && it.shape !== 'curve') {   // 258 (owner): cove light under the edge — a warm glow on the floor round it + a soft lamp low down
    coveStrip(hd, w, d, 0, 0, 0.06); const l = new THREE.PointLight(COVE, it.cat === 'deck' ? 1.6 : 1.1, Math.max(w, d) * 0.9 + 3, 2); l.position.set(0, 0.35, 0); hd.add(l); }
  if (it.cat === 'pergola') { const y = (it.deck ? 0.6 : 0) + (+it.h || 8) - 0.45;   /* 259 (owner): on the beams, not in the air */ [[w, 0.12, 0, -d / 2 + 0.3], [w, 0.12, 0, d / 2 - 0.3]].forEach(([a, b, x, z]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(a - 0.6, 0.08, b), gm); m.position.set(x, y, z); hd.add(m); });
    [-w / 2 + 0.3, w / 2 - 0.3].forEach(x => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, d - 0.6), gm); m.position.set(x, y, 0); hd.add(m); }); const l = new THREE.PointLight(W, 4, Math.max(w, d) * 1.2, 2); l.position.set(0, y - 0.5, 0); hd.add(l); }
  else if (it.cat === 'feature' || it.cat === 'bar') { const bL = it.cat === 'bar' && it.shape === 'L', zf = it.cat !== 'bar' ? d / 2 + 0.08 : bL ? d / 2 + 0.18 : -d * 0.15 + d * 0.35 + 0.18; const m = new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, 0.06, 0.1), gm); m.position.set(0, it.cat === 'bar' ? 3.38 : 0.35, zf); hd.add(m);   /* 268 (owner): tucked under the counter top's lip, not in the air */ if (bL) { const fl = it.flip ? -1 : 1, rl = d - 2.2, m2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, rl - 0.3), gm); m2.position.set(fl * (w / 2 + 0.06), 3.38, -2.2 / 2); hd.add(m2); const w2 = new THREE.Mesh(new THREE.PlaneGeometry(rl - 0.4, 3.1), washMat()); w2.position.set(fl * (w / 2 + 0.03), 1.65, -1.1); w2.rotation.y = fl * Math.PI / 2; w2.visible = !!(R && R.night); if (R) (R.nl || (R.nl = [])).push(w2); hd.add(w2); }   /* 263 (owner): the L's return arm lit too */ const l = new THREE.PointLight(W, 2.2, 7, 2); l.position.set(0, it.cat === 'bar' ? 3 : 0.8, d / 2 + 0.8); hd.add(l); }
  else if (it.cat === 'planter' || it.cat === 'vgarden' || it.cat === 'plant') {   // 263 (owner): the spike stands in the planter's soil and the plant glows a little
    const potR = (() => { if (it.frp || it.cat === 'vgarden' || /^MTO-PL-[A-Z]{2}$/.test(it.cfgId || it.pick || '')) return 0; const sdp = Math.abs(Math.round((+it.x || 1) * 13 + (+it.z || 1) * 7)), H = it.cat === 'plant' ? (+it.h || 4) : 3 + (sdp % 2) * 1.5, inch = H <= 3 ? 10 : H <= 5 ? 12 : H <= 7 ? 16 : 18; return inch / 24; })();   // 268 (owner): the pot's own size — the spike stands in its soil
    const sy = it.frp ? 2.05 : it.cat === 'vgarden' ? 0.3 : potR ? potR * 1.5 - 0.06 : 1.1, sx = it.cat === 'vgarden' ? 0 : potR ? potR * 0.5 : w * 0.22, sz = it.cat === 'vgarden' ? d / 2 + 0.3 : potR ? potR * 0.25 : d * 0.15, blk = new THREE.MeshStandardMaterial({ color: 0x1E1E1E, roughness: 0.5, metalness: 0.4 });   // 266 (owner): a real spike — stake in the soil, black head tilted up at the plant, warm lens
    const stk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.015, 0.5, 6), blk); stk.position.set(sx, sy + 0.1, sz); hd.add(stk);
    const hdm = new THREE.Group(); hdm.position.set(sx, sy + 0.38, sz); hdm.rotation.x = it.cat === 'vgarden' ? -0.35 : 0.35; const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.32, 12), blk); hdm.add(cyl); const lens = new THREE.Mesh(new THREE.CircleGeometry(0.095, 12), gm); lens.rotation.x = -Math.PI / 2; lens.position.y = 0.165; hdm.add(lens); hd.add(hdm);
    const bh = it.cat === 'vgarden' ? Math.max(4, h) : Math.max(2.5, h * 0.9), sp = new THREE.Sprite(haloMat()), R0 = Math.max(1.6, Math.min(Math.max(w, d), 6) * 0.9); sp.scale.set(R0, bh * 1.1, 1); sp.position.set(sx * 0.4, sy + bh * 0.5, sz * 0.4); nightOnly(sp, hd);
    const sp2 = new THREE.Sprite(haloMat()); sp2.scale.set(0.9, 0.9, 1); sp2.position.set(sx, sy + 0.5, sz); nightOnly(sp2, hd); }
}
// 234: floor finishes — tiles (plain / Moroccan) over the whole roof, a pebble border along the parapet
const TEX = {};
function finTex(k) { if (TEX[k]) return TEX[k]; const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d');
  const flat = { plain: ['#EFEBE4', '#CFC8BD'], grey: ['#B9B8B4', '#9E9C97'], stone: ['#D8C9A8', '#BBAA86'], terracotta: ['#C98B63', '#A86E4B'] }[k];
  if (flat) { x.fillStyle = flat[0]; x.fillRect(0, 0, 256, 256); if (k === 'stone') for (let i = 0; i < 90; i++) { x.fillStyle = 'rgba(120,100,70,.12)'; x.fillRect(Math.random() * 256, Math.random() * 256, 3 + Math.random() * 10, 2 + Math.random() * 4); } x.strokeStyle = flat[1]; x.lineWidth = 4; x.strokeRect(0, 0, 256, 256); }
  else if (k === 'kota') { x.fillStyle = '#9AA596'; x.fillRect(0, 0, 256, 256); [[128, 0], [0, 128]].forEach(([a, b], j) => { x.fillStyle = j ? '#8F9A8B' : '#A7B1A2'; x.fillRect(a, b, 128, 128); }); x.strokeStyle = '#7E887A'; x.lineWidth = 2; x.strokeRect(0, 0, 256, 256); x.beginPath(); x.moveTo(128, 0); x.lineTo(128, 256); x.moveTo(0, 128); x.lineTo(256, 128); x.stroke(); }
  else if (k === 'marble') { x.fillStyle = '#F2F0EC'; x.fillRect(0, 0, 256, 256); x.strokeStyle = 'rgba(160,150,135,.5)'; x.lineWidth = 2; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(0, 40 + i * 60); x.bezierCurveTo(80, 20 + i * 70, 160, 90 + i * 40, 256, 60 + i * 55); x.stroke(); } x.strokeStyle = '#DCD8D0'; x.strokeRect(0, 0, 256, 256); }
  else if (k === 'lime') { x.fillStyle = '#F6F4EF'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 600; i++) { x.fillStyle = `rgba(190,182,168,${Math.random() * 0.12})`; x.beginPath(); x.ellipse(Math.random() * 256, Math.random() * 256, 4 + Math.random() * 14, 3 + Math.random() * 8, Math.random() * 3, 0, 7); x.fill(); } x.strokeStyle = 'rgba(200,192,178,.7)'; x.lineWidth = 2; x.strokeRect(0, 0, 256, 256); }   // 274: Santorini lime-washed floor
  else if (k === 'trav') { x.fillStyle = '#DCCFB9'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 40; i++) { x.strokeStyle = `rgba(170,150,120,${0.1 + Math.random() * 0.15})`; x.lineWidth = 1 + Math.random() * 2; const y = Math.random() * 256; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(80, y + 6, 170, y - 6, 256, y + Math.random() * 6); x.stroke(); } for (let i = 0; i < 90; i++) { x.fillStyle = 'rgba(150,130,100,.25)'; x.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 6, 1 + Math.random() * 2); } x.strokeStyle = '#C3B49C'; x.lineWidth = 2; x.strokeRect(0, 0, 256, 256); }   // 274: travertine
  else if (k === 'turf') { x.fillStyle = '#4E7F33'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 5200; i++) { x.strokeStyle = ['#46762E', '#5E8F3E', '#6B9C46', '#3D6A28', '#77A64F'][i % 5]; x.lineWidth = 1.2; const px = Math.random() * 256, py = Math.random() * 256; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (Math.random() - 0.5) * 3, py - 3 - Math.random() * 5); x.stroke(); } }
  else if (k === 'cobble') { x.fillStyle = '#F4F2EC'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 160; i++) { x.fillStyle = ['#B9B6AE', '#9EA3A8', '#C9C6BE', '#8E949A'][i % 4]; x.beginPath(); x.ellipse((i % 13) * 20 + 8 + Math.random() * 4, Math.floor(i / 13) * 20 + 8 + Math.random() * 4, 8 + Math.random() * 2, 7 + Math.random() * 2, Math.random() * 3, 0, 7); x.fill(); } }   // 274: white pebble cobbles (Santorini)
  else if (k === 'kilim') { x.fillStyle = '#9E2B25'; x.fillRect(0, 0, 256, 256); const C2 = ['#E0A33B', '#1F6F7E', '#F3EEE6', '#2B2B2B']; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const cx = 32 + c * 64, cy = 32 + r * 64; x.fillStyle = C2[(r + c) % 4]; x.beginPath(); x.moveTo(cx, cy - 26); x.lineTo(cx + 22, cy); x.lineTo(cx, cy + 26); x.lineTo(cx - 22, cy); x.fill(); x.fillStyle = '#9E2B25'; x.beginPath(); x.moveTo(cx, cy - 10); x.lineTo(cx + 8, cy); x.lineTo(cx, cy + 10); x.lineTo(cx - 8, cy); x.fill(); } x.strokeStyle = '#F3EEE6'; x.lineWidth = 6; x.strokeRect(3, 3, 250, 250); }   // 274: Turkish kilim rug
  else if (k === 'jute') { x.fillStyle = '#C9A878'; x.fillRect(0, 0, 256, 256); for (let r = 4; r < 128; r += 5) { x.strokeStyle = ['#B8925E', '#D6BA8C', '#C29E6C', '#A8844F'][r % 4]; x.lineWidth = 4; x.setLineDash([3, 2]); x.beginPath(); x.arc(128, 128, r, 0, 7); x.stroke(); } x.setLineDash([]); x.strokeStyle = '#8E6E42'; x.lineWidth = 3; x.beginPath(); x.arc(128, 128, 125, 0, 7); x.stroke(); }   // 276: a round braided jute rug
  else if (k === 'bohorug') { x.fillStyle = '#E9DCC4'; x.fillRect(0, 0, 256, 256); const C3 = ['#B5562F', '#C98B3A', '#6B7A4A', '#3E3A36']; for (let r = 0; r < 6; r++) { x.fillStyle = C3[r % 4]; for (let c = 0; c < 8; c++) { const cx = 16 + c * 32, cy = 30 + r * 40; x.beginPath(); x.moveTo(cx, cy - 12); x.lineTo(cx + 12, cy); x.lineTo(cx, cy + 12); x.lineTo(cx - 12, cy); x.closePath(); x.fill(); x.fillStyle = '#E9DCC4'; x.fillRect(cx - 3, cy - 3, 6, 6); x.fillStyle = C3[r % 4]; } x.fillRect(0, 48 + r * 40, 256, 2); } x.strokeStyle = '#B5562F'; x.lineWidth = 10; x.strokeRect(5, 5, 246, 246); x.strokeStyle = '#F3EEE6'; x.lineWidth = 2; for (let i = 0; i < 256; i += 6) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 4); x.moveTo(i, 252); x.lineTo(i, 256); x.stroke(); } }   // 276: a boho kilim in rust / mustard / olive
  else if (k === 'berber') { x.fillStyle = '#F1EADD'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 1800; i++) { x.fillStyle = `rgba(160,140,110,${Math.random() * 0.12})`; x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); } x.strokeStyle = '#2E2A26'; x.lineWidth = 3; for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) { const cx = 32 + c * 64, cy = 26 + r * 51; x.beginPath(); x.moveTo(cx, cy - 22); x.lineTo(cx + 26, cy); x.lineTo(cx, cy + 22); x.lineTo(cx - 26, cy); x.closePath(); x.stroke(); } }   // 276: a cream berber with charcoal diamonds
  else if (k === 'sandrug') { x.fillStyle = '#D8C9A8'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(150,130,100,${Math.random() * 0.12})`; x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); } x.strokeStyle = '#B9A784'; x.lineWidth = 8; x.strokeRect(6, 6, 244, 244); }
  else if (k === 'star' || k === 'mosaic') { const tq = k === 'star'; x.fillStyle = tq ? '#F3EEE6' : '#F6F4EF'; x.fillRect(0, 0, 256, 256); x.save(); x.translate(128, 128);   // 274: a round inlay — Turkish 8-point star / Santorini blue-white pebble mosaic
    x.fillStyle = tq ? '#1F6F7E' : '#2B5DA8'; x.beginPath(); x.arc(0, 0, 124, 0, 7); x.fill(); x.fillStyle = tq ? '#F3EEE6' : '#F6F4EF'; x.beginPath(); x.arc(0, 0, 114, 0, 7); x.fill();
    if (tq) { [0, Math.PI / 4].forEach((a, j) => { x.save(); x.rotate(a); x.fillStyle = j ? '#E0A33B' : '#9E2B25'; x.fillRect(-72, -72, 144, 144); x.restore(); }); x.fillStyle = '#1F6F7E'; x.beginPath(); x.arc(0, 0, 40, 0, 7); x.fill(); x.fillStyle = '#F3EEE6'; x.beginPath(); x.arc(0, 0, 14, 0, 7); x.fill(); }
    else { for (let ring = 0; ring < 9; ring++) { const rr = 10 + ring * 12, n = Math.max(6, Math.round(rr * 0.55)); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + ring; x.fillStyle = ring % 2 ? '#2B5DA8' : '#FFFFFF'; x.beginPath(); x.ellipse(Math.cos(a) * rr, Math.sin(a) * rr, 5, 4, a, 0, 7); x.fill(); } } }
    x.restore(); }
  else if (k === 'granite') { x.fillStyle = '#3B3936'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 1400; i++) { x.fillStyle = ['#5A5753', '#26241F', '#7B7670', '#4A4642', '#9A948C'][i % 5]; x.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1 + Math.random() * 3); } x.strokeStyle = 'rgba(20,20,20,.6)'; x.lineWidth = 2; x.strokeRect(0, 0, 256, 256); x.beginPath(); x.moveTo(128, 0); x.lineTo(128, 256); x.moveTo(0, 128); x.lineTo(256, 128); x.stroke(); }   // 272
  else if (k === 'cement') { x.fillStyle = '#C9C5BE'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(90,85,78,${Math.random() * 0.08})`; x.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 6, 2 + Math.random() * 6); } }
  else if (k === 'terrazzo') { x.fillStyle = '#EFE8DC'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 380; i++) { x.fillStyle = ['#C9B99E', '#9FA89A', '#D2B48F', '#B7AE9F', '#A9B3A4'][i % 5]; x.beginPath(); x.ellipse(Math.random() * 256, Math.random() * 256, 1.5 + Math.random() * 4, 1.2 + Math.random() * 3, Math.random() * 3, 0, 7); x.fill(); } x.strokeStyle = '#DED5C6'; x.lineWidth = 2; x.strokeRect(0, 0, 256, 256); }
  else if (k === 'checker') { x.fillStyle = '#E9E6E0'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#8F8D88'; x.fillRect(0, 0, 128, 128); x.fillRect(128, 128, 128, 128); x.strokeStyle = '#C9C5BD'; x.lineWidth = 3; x.strokeRect(0, 0, 256, 256); x.beginPath(); x.moveTo(128, 0); x.lineTo(128, 256); x.moveTo(0, 128); x.lineTo(256, 128); x.stroke(); }
  else if (k === 'moroccan') { x.fillStyle = '#F3EEE6'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#2F6F7E'; x.globalAlpha = 0.75; const c = 128, r = 90;
    x.beginPath(); x.moveTo(c, c - r); x.quadraticCurveTo(c + 60, c - 60, c + r, c); x.quadraticCurveTo(c + 60, c + 60, c, c + r); x.quadraticCurveTo(c - 60, c + 60, c - r, c); x.quadraticCurveTo(c - 60, c - 60, c, c - r); x.fill();
    x.globalAlpha = 1; x.fillStyle = '#F3EEE6'; x.beginPath(); x.arc(c, c, 26, 0, 7); x.fill(); x.strokeStyle = '#C9C1B4'; x.lineWidth = 3; x.strokeRect(0, 0, 256, 256); }
  else { x.fillStyle = '#D9D3C8'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 260; i++) { x.fillStyle = ['#B8B0A3', '#A9A194', '#C7BFB2', '#9E968A'][i % 4]; x.beginPath(); x.ellipse(Math.random() * 256, Math.random() * 256, 6 + Math.random() * 7, 5 + Math.random() * 5, Math.random() * 3, 0, 7); x.fill(); } }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return (TEX[k] = t); }
// 241: pebbles only round the deck and in front of the feature wall (not the whole parapet)
const PEB_SKIP = new Set(['deck', 'turf', 'pathway', 'pergola', 'planter', 'lights', 'stool', 'chair', 'umbrella']);
function pOpenSide(t, items, r, c) { const E = 0.75, pw = +t.pw, pd = +t.pd; if (c[2] * c[3] < r[2] * r[3] * 0.6) return false;   // mostly clipped = against the parapet
  if (c[0] <= E + 0.6 && c[2] < 1 || c[1] <= E + 0.6 && c[3] < 1 || c[0] + c[2] >= pw - E - 0.6 && c[2] < 1 || c[1] + c[3] >= pd - E - 0.6 && c[3] < 1) return false;
  const ov = q => Math.max(0, Math.min(c[0] + c[2], q.x + q.w) - Math.max(c[0], q.x)) * Math.max(0, Math.min(c[1] + c[3], q.z + q.d) - Math.max(c[1], q.z)), A = c[2] * c[3];
  if ((t.blocks || []).some(b => ov(b) > A * 0.3)) return false;
  return !(items || []).some(o => o && !o.segs && !PEB_SKIP.has(o.cat) && ov({ x: +o.x, z: +o.z, w: (+o.rot || 0) % 180 ? +o.d : +o.w, d: (+o.rot || 0) % 180 ? +o.w : +o.d }) > A * 0.3); }
export function pebNear(t, items) { const out = [], E = 0.75, b = 0.6, cl = r => { const x0 = Math.max(E, r[0]), z0 = Math.max(E, r[1]), x1 = Math.min(+t.pw - E, r[0] + r[2]), z1 = Math.min(+t.pd - E, r[1] + r[3]); return x1 - x0 > 0.3 && z1 - z0 > 0.3 ? [x0, z0, x1 - x0, z1 - z0] : null; };
  (items || []).forEach(it => { if (!it || it.segs) return; const rot = +it.rot || 0, sw = rot % 180 ? it.d : it.w, sd = rot % 180 ? it.w : it.d, x = +it.x, z = +it.z;
    if (it.cat === 'deck' && !it.old) [[x - b, z - b, sw + 2 * b, b], [x - b, z + sd, sw + 2 * b, b], [x - b, z, b, sd], [x + sw, z, b, sd]].forEach(r => { const c = cl(r); if (c && pOpenSide(t, items, r, c)) out.push(c); });   // 255 (owner): only on the open sides — not against the parapet, a wall or a built thing
    else if (it.cat === 'feature') { const f = { 0: [x, z + sd, sw, b], 180: [x, z - b, sw, b], 90: [x - b, z, b, sd], 270: [x + sw, z, b, sd] }[rot % 360]; const c = f && cl(f); if (c) out.push(c); } });
  return out; }
// 276 (owner): warmth — string lights over the main seating (hung from the pergola when it stands there, else on four slim poles),
// floor lanterns, and for boho poufs + a pampas vase; bulbs glow at night
function cozy(g, t, items) { const th = (t.floor || {}).theme; if (!th) return; const E = 0.75, pw = +t.pw, pd = +t.pd;
  const R = it => { const r = (+it.rot || 0) % 180; return { x: +it.x, z: +it.z, w: r ? +it.d : +it.w, d: r ? +it.w : +it.d }; };
  const L = (items || []).filter(o => o && !o.segs && !o.old && o.w > 0), seat = ['sofa', 'fbench', 'dining'].map(c => L.find(o => o.cat === c)).find(Boolean); if (!seat) return;
  let c = R(seat); L.forEach(o => { if (!['chair', 'table', 'firepit', 'stool', 'sofa', 'fbench', 'dining'].includes(o.cat)) return; const r = R(o); if (r.x > c.x + c.w + 3 || r.x + r.w < c.x - 3 || r.z > c.z + c.d + 3 || r.z + r.d < c.z - 3) return; const x0 = Math.min(c.x, r.x), z0 = Math.min(c.z, r.z); c = { x: x0, z: z0, w: Math.max(c.x + c.w, r.x + r.w) - x0, d: Math.max(c.z + c.d, r.z + r.d) - z0 }; });
  const solid = L.filter(o => !['pergola', 'deck', 'turf', 'pathway', 'umbrella', 'lights'].includes(o.cat)).map(R).concat((t.blocks || []).map(b => ({ x: +b.x, z: +b.z, w: +b.w, d: +b.d })));
  const free = (x, z, r) => x - r > E && z - r > E && x + r < pw - E && z + r < pd - E && !solid.some(q => x + r > q.x && x - r < q.x + q.w && z + r > q.z && z - r < q.z + q.d);
  const pg = L.filter(o => o.cat === 'pergola').map(o => Object.assign(R(o), { h: +o.h || 9 })).find(q => c.x + c.w / 2 > q.x && c.x + c.w / 2 < q.x + q.w && c.z + c.d / 2 > q.z && c.z + c.d / 2 < q.z + q.d);
  // string lights
  const A = pg ? { x: pg.x + 0.4, z: pg.z + 0.4, w: pg.w - 0.8, d: pg.d - 0.8, y: pg.h - 0.7 } : { x: Math.max(E + 0.3, c.x - 1), z: Math.max(E + 0.3, c.z - 1), w: 0, d: 0, y: 8.2 }; if (!pg) { A.w = Math.min(pw - E - 0.3, c.x + c.w + 1) - A.x; A.d = Math.min(pd - E - 0.3, c.z + c.d + 1) - A.z; }
  if (A.w > 3 && A.d > 3) { const blk = mat('c_pole', 0x1E1E1E, { metalness: 0.5, roughness: 0.5 }); if (!pg) [[A.x, A.z], [A.x + A.w, A.z], [A.x, A.z + A.d], [A.x + A.w, A.z + A.d]].forEach(([x, z]) => cyl(g, 0.05, 0.06, A.y + 0.3, x, (A.y + 0.3) / 2, z, blk, 6));
    const alongX = A.w >= A.d, n = Math.max(2, Math.round((alongX ? A.w : A.d) / 4)), pts = []; for (let k = 0; k <= n; k++) { const u = k / n; pts.push(alongX ? [A.x + A.w * u, k % 2 ? A.z + A.d : A.z] : [k % 2 ? A.x + A.w : A.x, A.z + A.d * u]); }
    const wire = [], bulbs = []; for (let k = 0; k < n; k++) { const [x1, z1] = pts[k], [x2, z2] = pts[k + 1], len = Math.hypot(x2 - x1, z2 - z1), sag = Math.min(1.1, len * 0.08), m = Math.max(2, Math.round(len / 1.1)); for (let q = 0; q <= m; q++) { const u = q / m, y = A.y - sag * 4 * u * (1 - u); const p = new THREE.Vector3(x1 + (x2 - x1) * u, y, z1 + (z2 - z1) * u); wire.push(p); if (q && q < m) bulbs.push(p); } }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(wire), new THREE.LineBasicMaterial({ color: 0x1E1E1E })));
    const bm = mat('c_bulb', 0xFFF1D6, { emissive: 0xFFB45A, emissiveIntensity: 0.55, roughness: 0.2 }), ib = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 8, 6), bm, bulbs.length), M4 = new THREE.Matrix4(); bulbs.forEach((p, i) => { M4.makeTranslation(p.x, p.y - 0.14, p.z); ib.setMatrixAt(i, M4); }); g.add(ib);
    bulbs.forEach((p, i) => { if (i % (LITE ? 3 : 2)) return; const sp = new THREE.Sprite(haloMat()); sp.scale.set(0.9, 0.9, 1); sp.position.set(p.x, p.y - 0.14, p.z); nightOnly(sp, g); }); }
  // floor lanterns by the seating
  if (th !== 'modern') { let k = 0; [[c.x - 0.7, c.z - 0.7], [c.x + c.w + 0.7, c.z + c.d + 0.7], [c.x + c.w + 0.7, c.z - 0.7], [c.x - 0.7, c.z + c.d + 0.7]].forEach(([x, z]) => { if (k >= 2 || !free(x, z, 0.45)) return; k++; lantern(g, x, 0.5, z, 1.25); const sp = new THREE.Sprite(haloMat()); sp.scale.set(2.2, 2.2, 1); sp.position.set(x, 0.55, z); nightOnly(sp, g); }); }
  // boho: poufs, a floor cushion, pampas grass in a tall terracotta vase
  if (th === 'boho') { const pf = [mat('c_pouf1', 0xC9A878, { roughness: 1 }), mat('c_pouf2', 0xB5562F, { roughness: 1 })]; let k = 0;
    [[c.x + c.w / 2 - 1.4, c.z + c.d + 1.1], [c.x + c.w / 2 + 1.4, c.z + c.d + 1.1], [c.x + c.w / 2 - 1.4, c.z - 1.1], [c.x + c.w / 2 + 1.4, c.z - 1.1], [c.x - 1.1, c.z + c.d / 2], [c.x + c.w + 1.1, c.z + c.d / 2]].forEach(([x, z]) => { if (k >= 2 || !free(x, z, 0.75)) return; const p = cyl(g, 0.7, 0.72, 1.1, x, 0.55, z, pf[k % 2], 18); const tp = new THREE.Mesh(new THREE.SphereGeometry(0.7, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), pf[k % 2]); tp.scale.y = 0.25; tp.position.set(x, 1.1, z); g.add(tp); const tr = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 6, 24), mat('c_poufb', 0x8E6E42)); tr.rotation.x = Math.PI / 2; tr.position.set(x, 0.55, z); g.add(tr); k++; });
    const vs = [[c.x - 1.2, c.z - 1.2], [c.x + c.w + 1.2, c.z - 1.2], [c.x - 1.2, c.z + c.d + 1.2], [c.x + c.w + 1.2, c.z + c.d + 1.2]].find(([x, z]) => free(x, z, 0.6));
    if (vs) { const [x, z] = vs, tc = mat('c_tcvase', 0xB8643F, { roughness: 0.9 }); const v = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.45, 0.05], [0.6, 0.8], [0.5, 1.8], [0.28, 2.4], [0.33, 2.6]].map(([a, b]) => new THREE.Vector2(a, b)), 16), tc); v.position.set(x, 0, z); v.castShadow = true; g.add(v);
      const pm = mat('c_pampas', 0xEADBC0, { roughness: 1 }), sm = mat('c_pstem', 0xC9B48E); for (let q = 0; q < 9; q++) { const a = q / 9 * Math.PI * 2, tl = 0.25 + (q % 3) * 0.12, hh = 3.4 + (q % 4) * 0.5; const st = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, hh - 2.4, 4), sm); st.position.set(x + Math.cos(a) * tl * 0.5, 2.4 + (hh - 2.4) / 2, z + Math.sin(a) * tl * 0.5); st.rotation.set(Math.sin(a) * tl, 0, -Math.cos(a) * tl); g.add(st);
        const pl = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.1, 7), pm); pl.position.set(x + Math.cos(a) * tl * 1.5, hh + 0.3, z + Math.sin(a) * tl * 1.5); pl.rotation.set(Math.sin(a) * tl, 0, -Math.cos(a) * tl); pl.scale.set(1, 1, 0.7); g.add(pl); } } } }
// 276 (owner): laid floors — textures drawn tile by tile (floorlay.js), with a bump map; UVs in feet so pieces join up
const LTX = {};
function layMat(name, rough, xr) { const k = name + (rough || '') + ':' + (xr || 0); if (LTX[k]) return LTX[k]; const P = layPeriod(name), ppf = Math.min(LITE ? 72 : 112, Math.floor((LITE ? 640 : 1024) / Math.max(P[0], P[1]))), r = ((layRot(name) || 0) + (xr || 0)) * Math.PI / 180;
  const mk = (cv, srgb) => { const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(1 / P[0], 1 / P[1]); t.rotation = r; t.anisotropy = 4; return t; };
  return (LTX[k] = new THREE.MeshStandardMaterial({ map: mk(layCanvas(name, ppf).cv, true), bumpMap: mk(layCanvas(name, ppf, true).cv), bumpScale: 2.2, roughness: rough || 0.86 })); }
function layPlane(g, name, x, z, w, d, y, rough) { const geo = new THREE.PlaneGeometry(w, d), uv = geo.attributes.uv, ps = geo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, x + w / 2 + ps.getX(i), -(z + d / 2 - ps.getY(i)));
  const m = new THREE.Mesh(geo, layMat(name, rough)); m.rotation.x = -Math.PI / 2; m.position.set(x + w / 2, y, z + d / 2); m.receiveShadow = true; g.add(m); return m; }
function floorFin(g, t, items) {
  const f = t.floor || {}, pw = +t.pw, pd = +t.pd, E = 0.75;
  if (f.lay) { const sh = new THREE.Shape(); outline(t).forEach((p, i) => i ? sh.lineTo(p[0], -p[1]) : sh.moveTo(p[0], -p[1])); const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), layMat(f.lay, 0, f.lrot || 0)); m.rotation.x = -Math.PI / 2; m.position.y = 0.02; m.receiveShadow = true; g.add(m); }
  else if (['plain', 'moroccan', 'stone', 'terracotta', 'grey', 'terrazzo', 'checker', 'kota', 'marble', 'granite', 'cement', 'lime', 'trav'].includes(f.tile)) { const sh = new THREE.Shape(); outline(t).forEach((p, i) => i ? sh.lineTo(p[0], -p[1]) : sh.moveTo(p[0], -p[1]));
    const tx = finTex(f.tile).clone(); tx.needsUpdate = true; const ts = Array.isArray(f.ts) ? f.ts : f.ts ? [f.ts, f.ts] : null, per = f.tile === 'moroccan' ? 3 : f.tile === 'checker' ? 4 : 2; if (ts) tx.repeat.set(1 / ts[0], 1 / ts[1]); else tx.repeat.set(1 / per, 1 / per);   // 274: real tile sizes (one tile per texture)
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.85 })); m.rotation.x = -Math.PI / 2; m.position.y = 0.02; m.receiveShadow = true; g.add(m); }
  if (f.border) { const BO = typeof f.border === 'object' ? f.border : null, bw = BO ? +BO.w || 1 : 1.25, bm = BO ? (['pebble', 'terracotta', 'cobble'].includes(BO.c) ? new THREE.MeshStandardMaterial({ map: (tx0 => { const tx = tx0.clone(); tx.needsUpdate = true; tx.repeat.set(1 / 1.5, 1 / 1.5); return tx; })(finTex(BO.c)), roughness: 0.95 }) : mat('fl_bord_' + BO.c, { blue: 0x2B5DA8, granite: 0x2F2E2C }[BO.c] || 0x4A4A48, { roughness: BO.c === 'granite' ? 0.3 : 0.8 })) : mat('fl_bord' + f.preset, f.preset === 'greek' ? 0x8FA38A : 0x4A4A48, { roughness: 0.8 }), O = outline(t);   // 274: a theme's border band (pebbles, terracotta, blue, black granite)   // 245: the floor look's border band along the parapet
    O.forEach((a, i) => { const b = O[(i + 1) % O.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.5) return; const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L; let nx = -uz, nz = ux; const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
      let c = false; for (let p = 0, q = O.length - 1; p < O.length; q = p++) { const [xi, zi] = O[p], [xj, zj] = O[q]; if ((zi > mz + nz) !== (zj > mz + nz) && mx + nx < (xj - xi) * (mz + nz - zi) / (zj - zi) + xi) c = !c; } if (!c) { nx = -nx; nz = -nz; }
      if (BO && BO.lay) { const geo = new THREE.PlaneGeometry(L, bw), uv = geo.attributes.uv, ps = geo.attributes.position; for (let q = 0; q < uv.count; q++) uv.setXY(q, ps.getX(q) + L / 2, ps.getY(q) + bw / 2); const m = new THREE.Mesh(geo, layMat(BO.lay)); m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(uz, ux); m.position.set(mx + nx * (E + bw / 2), 0.03, mz + nz * (E + bw / 2)); m.receiveShadow = true; g.add(m); return; }   // 276: a laid border (bricks on edge, hex, mosaic)
      const m = new THREE.Mesh(new THREE.PlaneGeometry(L, bw), bm); m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(uz, ux); m.position.set(mx + nx * (E + bw / 2), 0.03, mz + nz * (E + bw / 2)); m.receiveShadow = true; g.add(m); }); }
  (f.rugs || []).forEach(([x, z, w, d]) => { const tx = finTex('moroccan').clone(); tx.needsUpdate = true; tx.repeat.set(w / 3, d / 3); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.8 })); m.rotation.x = -Math.PI / 2; m.position.set(x + w / 2, 0.035, z + d / 2); m.receiveShadow = true; g.add(m); });   // 245: Moroccan 'rugs'
  const shp = (pts, circ) => { const sh = new THREE.Shape(); if (circ) sh.absarc(circ[0], -circ[1], circ[2], 0, Math.PI * 2, false); else pts.forEach((p, i) => i ? sh.lineTo(p[0], -p[1]) : sh.moveTo(p[0], -p[1])); return new THREE.ShapeGeometry(sh, 40); };
  (f.zones || []).forEach(zn => { const y = 0.035 + (zn.y || 0), lay = (geo, m, yy) => { const me = new THREE.Mesh(geo, m); me.rotation.x = -Math.PI / 2; me.position.y = yy; me.receiveShadow = true; g.add(me); return me; };   // 276c: round pods / hubs, curved lawns, stepping stones, planter beds
    if (zn.k === 'circ') { if (zn.edge) lay(shp(null, [zn.cx, zn.cz, zn.r + 0.3]), mat('fl_edge' + zn.edge, parseInt(zn.edge.slice(1), 16), { roughness: 0.5 }), y - 0.001); lay(shp(null, [zn.cx, zn.cz, zn.r]), layMat(zn.s), y); }
    else if (zn.k === 'poly' && zn.s === '#edge') lay(shp(zn.pts), mat('fl_edge' + zn.c, parseInt(zn.c.slice(1), 16), { roughness: 0.5 }), y);
    else if (zn.k === 'poly') { if (zn.s === 'turf' || zn.s === 'peb') { const tx = finTex(zn.s === 'turf' ? 'turf' : 'pebble').clone(); tx.needsUpdate = true; tx.repeat.set(1 / 3, 1 / 3); const ed = zn.pts.map(p => p); lay(shp(ed.map(p => p)), mat('fl_lawned', 0x9E978C), y - 0.001).scale.set(1, 1, 1); lay(shp(zn.pts), new THREE.MeshStandardMaterial({ map: tx, roughness: 1 }), y + 0.03); } else lay(shp(zn.pts), layMat(zn.s), y); }
    else if (zn.k === 'stone') { const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.12, 9), mat('fl_st' + zn.c, parseInt(zn.c.slice(1), 16), { roughness: 0.95 })); m.scale.set(zn.rx, 1, zn.rz); m.rotation.y = -(zn.rot || 0) * Math.PI / 180; m.position.set(zn.cx, 0.1, zn.cz); m.receiveShadow = m.castShadow = true; g.add(m); }
    else if (zn.k === 'bed') { const bx = new THREE.Mesh(new THREE.BoxGeometry(zn.w, 1.2, zn.d), mat('fl_bed', 0xD9D3C7, { roughness: 0.9 })); bx.position.set(zn.x + zn.w / 2, 0.6, zn.z + zn.d / 2); bx.castShadow = bx.receiveShadow = true; g.add(bx); const tx = finTex('turf').clone(); tx.needsUpdate = true; tx.repeat.set(zn.w / 2, zn.d / 2); const tp = new THREE.Mesh(new THREE.PlaneGeometry(zn.w - 0.3, zn.d - 0.3), new THREE.MeshStandardMaterial({ map: tx, roughness: 1 })); tp.rotation.x = -Math.PI / 2; tp.position.set(zn.x + zn.w / 2, 1.18, zn.z + zn.d / 2); g.add(tp);
      const n = Math.max(1, Math.floor(Math.max(zn.w, zn.d) / 2.2)), sm = [mat('fl_sh1', 0x4E7F33, { roughness: 1 }), mat('fl_sh2', 0x3F6B2A, { roughness: 1 }), mat('fl_sh3', 0x5E8F3E, { roughness: 1 })]; for (let q = 0; q < n; q++) { const u = (q + 0.5) / n, sh = new THREE.Mesh(new THREE.SphereGeometry(0.55 + (q % 3) * 0.12, 10, 8), sm[q % 3]); sh.scale.y = 0.8; sh.position.set(zn.w >= zn.d ? zn.x + zn.w * u : zn.x + zn.w / 2, 1.55, zn.w >= zn.d ? zn.z + zn.d / 2 : zn.z + zn.d * u); sh.castShadow = true; g.add(sh); } } });
  (f.zones || []).forEach(zn => { const { k, x, z, w, d } = zn; if (!(w > 0.2 && d > 0.2)) return;   // 274 (owner): the open floor landscaped per theme — lawn, paths, inlay, rugs
    const tex = (key, rx, ry) => { const tx = finTex(key).clone(); tx.needsUpdate = true; tx.repeat.set(rx, ry); return tx; };
    if (k === 'turf') { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), new THREE.MeshStandardMaterial({ map: tex('turf', w / 3, d / 3), roughness: 1 })); m.position.set(x + w / 2, 0.06, z + d / 2); m.receiveShadow = true; g.add(m); return; }
    if (k === 'prug') { const y = 0.035 + (zn.y || 0); if (zn.edge) { const e = 0.3, m = new THREE.Mesh(new THREE.PlaneGeometry(w + 2 * e, d + 2 * e), mat('fl_edge' + zn.edge, parseInt(zn.edge.slice(1), 16), { roughness: 0.5 })); m.rotation.x = -Math.PI / 2; m.position.set(x + w / 2, y - 0.001, z + d / 2); m.receiveShadow = true; g.add(m); } if (!zn.eonly) layPlane(g, zn.s, x, z, w, d, y); return; }   // 276: a paver 'rug' (+ its trim)   // 276: a paver 'rug' — another pattern where people sit / under the pergola
    if (k === 'path' && zn.s && LAYK(zn.s)) { layPlane(g, zn.s, x, z, w, d, 0.04); return; }
    if (k === 'path') { const st = zn.s || 'stones', cx = x + w / 2, cz = z + d / 2;
      if (st === 'stones') { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.08, 18), mat('fl_stone', 0x9E978C, { roughness: 0.9 })); m.scale.set(1, 1, 0.8); m.position.set(cx, 0.12, cz); m.receiveShadow = m.castShadow = true; g.add(m); return; }
      const M = { terracotta: () => new THREE.MeshStandardMaterial({ map: tex('terracotta', 1, 1), roughness: 0.9 }), cobble: () => new THREE.MeshStandardMaterial({ map: tex('cobble', 1, 1), roughness: 1 }), granite: () => mat('fl_gr', 0x2F2E2C, { roughness: 0.3 }), big: () => new THREE.MeshStandardMaterial({ map: tex('trav', 0.5, 0.5), roughness: 0.8 }) }[st];
      const sz = st === 'cobble' || st === 'terracotta' ? 1.98 : 1.8, m = new THREE.Mesh(new THREE.BoxGeometry(Math.min(sz, w), 0.06, Math.min(sz, d)), M ? M() : mat('fl_pv', 0x9E978C)); m.position.set(cx, 0.06, cz); m.receiveShadow = true; g.add(m); return; }
    if (k === 'inlay') { const r = Math.min(w, d) / 2, m = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshStandardMaterial({ map: finTex(zn.s === 'star' ? 'star' : 'mosaic'), roughness: 0.6 })); m.rotation.x = -Math.PI / 2; m.position.set(x + w / 2, 0.045, z + d / 2); m.receiveShadow = true; g.add(m); return; }
    if (k === 'rug' && zn.s === 'jute') { const r = Math.min(w, d) / 2, m = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshStandardMaterial({ map: finTex('jute'), roughness: 1 })); m.rotation.x = -Math.PI / 2; m.position.set(x + w / 2, 0.05 + (zn.y || 0), z + d / 2); m.receiveShadow = true; g.add(m); return; }   // 276: layered rugs (boho) — a round jute rug over a patterned one
    if (k === 'rug') { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tex({ sand: 'sandrug', boho: 'bohorug', berber: 'berber' }[zn.s] || 'kilim', 1, 1), roughness: 0.95 })); if (zn.rot) m.rotation.z = zn.rot; m.rotation.x = -Math.PI / 2; m.position.set(x + w / 2, 0.04 + (zn.y || 0), z + d / 2); m.receiveShadow = true; g.add(m); return; }
    if (k === 'pebble') { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tex(zn.s === 'white' ? 'cobble' : 'pebble', w / 2, d / 2), roughness: 1 })); m.rotation.x = -Math.PI / 2; m.position.set(x + w / 2, 0.045, z + d / 2); m.receiveShadow = true; g.add(m); } });
  if (themeKey() === 'tropical') { const ZS = f.zones || [], lawns = [];   // 293 (owner): tropical landscaping — the lawn edged with clumps of big leaves, grasses and colour
    ZS.forEach(zn => { if (zn.k === 'poly' && zn.s === 'turf' && zn.pts && zn.pts.length > 2) lawns.push(zn.pts); else if (zn.k === 'turf' && zn.w > 3 && zn.d > 3) lawns.push([[zn.x, zn.z], [zn.x + zn.w, zn.z], [zn.x + zn.w, zn.z + zn.d], [zn.x, zn.z + zn.d]]); });
    const SK = new Set(['turf', 'pathway', 'privacy', 'lights', 'accover', 'shaftcover', 'mstair', 'works']), stones = ZS.filter(zn => zn.k === 'stone' || (zn.k === 'path')).map(zn => zn.k === 'stone' ? [zn.cx, zn.cz] : [zn.x + zn.w / 2, zn.z + zn.d / 2]);
    const busy = (x, z) => (items || []).some(o => { if (SK.has(o.cat) || o.segs || o.box) return false; const fo = foot(o); return x > +o.x - 1 && x < +o.x + fo[0] + 1 && z > +o.z - 1 && z < +o.z + fo[1] + 1; }) || (t.blocks || []).some(b2 => x > b2.x - 1 && x < b2.x + b2.w + 1 && z > b2.z - 1 && z < b2.z + b2.d + 1) || stones.some(([a, c]) => Math.hypot(a - x, c - z) < 1.8);
    const TALL = ['BANANA', 'BIRDPARADISE', 'TRAVELLER', 'FISHTAIL'], LOW = ['FOUNTAINGRASS', 'CROTON', 'SONGOFINDIA', 'CORDYLINE', 'IXORA']; let q = 0;
    lawns.forEach(pts => { const cx = pts.reduce((s1, p) => s1 + p[0], 0) / pts.length, cz = pts.reduce((s1, p) => s1 + p[1], 0) / pts.length; let carry = 0;
      for (let i = 0; i < pts.length; i++) { const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % pts.length], L = Math.hypot(x1 - x0, z1 - z0); if (L < 0.01) continue;
        for (let u = carry; u < L; u += 4.2) { const px = x0 + (x1 - x0) * u / L, pz = z0 + (z1 - z0) * u / L, dl = Math.hypot(cx - px, cz - pz) || 1, ix = px + (cx - px) / dl * 1.2, iz = pz + (cz - pz) / dl * 1.2; if (busy(ix, iz)) continue;
          const tall = q % 3 === 0, k = tall ? TALL[(q / 3 | 0) % TALL.length] : LOW[q % LOW.length], m = noSh(plantModel(THREE, k, tall ? 4.5 + (q % 2) : 1.8 + (q % 3) * 0.4, { pot: 'none', seed: 4 + q % 3 })); m.position.set(ix, 0.1, iz); m.rotation.y = q * 1.7; g.add(m);
          if (!LITE && q % 2 === 0) { const sp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), mat('c_tsph', 0x7E7C77, { roughness: 0.95 })); sp.position.set(ix + 0.9, 0.3, iz + 0.5); sp.castShadow = true; g.add(sp); } q++; }
        carry = 0; } }); }
  if (f.pebble) { const b = 0.6, pm = new THREE.MeshStandardMaterial({ map: finTex('pebble'), roughness: 1 });
    (f.pebble === 'near' ? pebNear(t, items) : [[E, E, pw - 2 * E, b], [E, pd - E - b, pw - 2 * E, b], [E, E + b, b, pd - 2 * E - 2 * b], [pw - E - b, E + b, b, pd - 2 * E - 2 * b]]).forEach(([x, z, w, d]) => { const tx = pm.map.clone(); tx.needsUpdate = true; tx.repeat.set(w / 2, d / 2);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tx, roughness: 1 })); m.rotation.x = -Math.PI / 2; m.position.set(x + w / 2, 0.04, z + d / 2); m.receiveShadow = true; g.add(m); }); }
}
export const FUSION = { pergola: 'modern', cabin: 'modern', bar: 'turkish', privacy: 'modern', water: 'modern', feature: 'fusion', fbench: 'fusion', plant: 'tropical', swing: 'boho', firepit: 'modern', umbrella: 'modern', sofa: 'turkish' };   // 300 (owner): pergola Modern, feature wall Modern + Boho, seating Modern + Turkish, floor Tropical + Modern
export const FU_GRP = { counter: 'bar', rack: 'bar', stool: 'bar', planter: 'plant', frp: 'plant', vgarden: 'plant', dining: 'sofa', chair: 'sofa', table: 'sofa' };
function fuOf(it, P) { const g = FU_GRP[it.cat] || it.cat, m = (P && P.fmix) || {}; return m[g] || FUSION[g] || 'fusion'; }
function drawItems(items, H, P) {   // 193j: the plan's things as 3D holders (also drawn by the cabin / pergola designers)
  (P.items || []).forEach((it, i) => { if (!it) return; const T0 = THEME; if (T0 === 'fusion') THEME = fuOf(it, P); try { drawOne(it, i); } finally { THEME = T0; } });   // 300: Fusion — each element in its own theme
  function drawOne(it, i) {
    if (it.mode === 'mst') return;   // 263: the stairs to the stairs-room roof are drawn with the roof
    if (it.box) {   // 193d: an AC cover sitting over its unit
      const hd = new THREE.Group(); hd.userData.it = i; items.add(hd); H[i] = hd; const bx = it.box, gm = generic('accover', bx.w, bx.d, bx.h); gm.position.set(bx.x + bx.w / 2, 0, bx.z + bx.d / 2); hd.add(gm);
      const hb = new THREE.Mesh(new THREE.BoxGeometry(bx.w, bx.h, bx.d), new THREE.MeshBasicMaterial({ visible: false })); hb.position.set(bx.x + bx.w / 2, bx.h / 2, bx.z + bx.d / 2); hb.userData.hit = i; hd.add(hb);
      if (P.sel === i) { const ln = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(bx.w + 0.3, bx.h + 0.2, bx.d + 0.3)), new THREE.LineBasicMaterial({ color: 0xC26445 })); ln.position.set(bx.x + bx.w / 2, bx.h / 2, bx.z + bx.d / 2); hd.add(ln); }
      return;
    }
    if (it.segs) {   // a screen fixed on the parapet / round the tanks: pieces in plot coordinates
      const hd = new THREE.Group(); hd.userData.it = i; items.add(hd); H[i] = hd;
      it.segs.forEach((sg, k) => { const L = Math.hypot(sg.x1 - sg.x0, sg.z1 - sg.z0); if (L < 0.3) return; const p = new THREE.Group(); p.position.set((sg.x0 + sg.x1) / 2, sg.y, (sg.z0 + sg.z1) / 2); p.rotation.y = -Math.atan2(sg.z1 - sg.z0, sg.x1 - sg.x0); hd.add(p);
        p.add(generic('privacy', L, 0.3, +it.h || 3, it));
        if (themeKey() === 'tropical' && it.mode === 'par' && !it.pipe && (P.site || {}).kind !== 'lawn') { const th = p.rotation.y, c0 = Math.cos(th), s0 = Math.sin(th), st = P.site || {}, tw = s0 * ((+st.pw || 30) / 2 - p.position.x) + c0 * ((+st.pd || 60) / 2 - p.position.z) >= 0, sv = tw ? 1 : -1, BD = 1.3, v0 = sv * (0.25 + BD / 2);   // 293 (owner): tropical = a planted bed along every free stretch of screen, tall leaves at the back, colour in front
          const SKIP = new Set(['privacy', 'lights', 'turf', 'pathway', 'accover', 'shaftcover', 'mstair', 'works']), busy = (u) => { const wx = p.position.x + u * c0 + v0 * s0, wz = p.position.z - u * s0 + v0 * c0; return (P.items || []).some(o => { if (SKIP.has(o.cat) || o.segs || o.box) return false; const f = foot(o); return wx > +o.x - 0.8 && wx < +o.x + f[0] + 0.8 && wz > +o.z - 0.8 && wz < +o.z + f[1] + 0.8; }) || (st.blocks || []).some(b2 => wx > b2.x - 0.3 && wx < b2.x + b2.w + 0.3 && wz > b2.z - 0.3 && wz < b2.z + b2.d + 0.3); };
          const runs = []; let r0 = null; for (let u = -L / 2 + 0.5; u <= L / 2 - 0.5 + 1e-6; u += 1) { const f = !busy(u); if (f && r0 == null) r0 = u; if ((!f || u + 1 > L / 2 - 0.5) && r0 != null) { const r1 = f ? u : u - 1; if (r1 - r0 >= 2) runs.push([r0 - 0.4, r1 + 0.4]); r0 = null; } }
          runs.forEach(([a0, a1]) => { const bg = new THREE.Group(); bg.position.set((a0 + a1) / 2, -(+sg.y || 0), v0); p.add(bg); pbox(bg, a1 - a0, BD, 0, 0, 1.4, C().wood2); }); }
        const hb = new THREE.Mesh(new THREE.BoxGeometry(L, +it.h || 3, 0.8), new THREE.MeshBasicMaterial({ visible: false })); hb.position.y = (+it.h || 3) / 2; hb.userData.hit = i; p.add(hb);
        if (P.sel === i) { const ln = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(L + 0.2, (+it.h || 3) + 0.2, 0.6)), new THREE.LineBasicMaterial({ color: 0xC26445 })); ln.position.y = (+it.h || 3) / 2; p.add(ln); }
        if (!k && P.labels !== false) { const tg = tag(it.label || 'Privacy screen'); tg.position.y = (+it.h || 3) + 1.4; p.add(tg); }
        if ((P.site || {}).light !== '') { const gm = glow(LENS), bk = mat('lt_blk', 0x1E1E1E, { roughness: 0.45, metalness: 0.4 }), hh = +it.h || 3; let n = 0;
          const th = p.rotation.y, st = P.site || {}, mb = it.mode === 'tank' ? (st.blocks || []).find(b => b.type === 'mumty') : null, rx = mb ? mb.x + mb.w / 2 : (+st.pw || 30) / 2, rz = mb ? mb.z + mb.d / 2 : (+st.pd || 60) / 2, tw = Math.sin(th) * (rx - p.position.x) + Math.cos(th) * (rz - p.position.z) >= 0, sn = mb ? (tw ? -1 : 1) : (tw ? 1 : -1);   /* 263 (owner): on the stairs room the lights face out, away from the tanks */   // 258 (owner): the lights always on the terrace side of the screen   // 245: one-way lights fixed on the screen's top rail — a black housing, the warm lens facing down, a soft wash on the screen
          for (let u = -L / 2 + 2; u < L / 2 - 0.5; u += 4, n++) { const hs = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.34), bk); hs.position.set(u, hh - 0.02, 0.3 * sn); p.add(hs); const ln = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.2), gm); ln.position.set(u, hh - 0.11, 0.36 * sn); p.add(ln);
            const wsh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, Math.min(3.2, hh + 0.2)), washMat()); wsh.position.set(u, hh - Math.min(3.2, hh + 0.2) / 2, 0.2 * sn); if (sn < 0) wsh.rotation.y = Math.PI; wsh.renderOrder = 3; wsh.visible = !!(R && R.night); if (R) (R.nl || (R.nl = [])).push(wsh); else wsh.visible = false; p.add(wsh); } } });   // 262 (owner: dark at night): a warm wash on the screen under every light — a glow, not a lamp, so it costs nothing
      return;
    }
    const [fw, fd] = foot(it), hd = new THREE.Group(), cxI = +it.x + fw / 2, czI = +it.z + fd / 2, lvI = ['deck', 'pergola', 'cabin', 'turf', 'pathway', 'privacy'].includes(it.cat) ? 0 : (d0 => d0 ? deckTop(d0) : 0)((P.items || []).find(o => o.cat === 'deck' && (q => cxI > +o.x && cxI < +o.x + q[0] && czI > +o.z && czI < +o.z + q[1])(foot(o)))); hd.userData.it = i; hd.position.set(cxI, +lvI || 0, czI);   /* 259: things on a raised deck stand on it */ hd.rotation.y = -(+it.rot || 0) * Math.PI / 180; items.add(hd);
    try { itemLights(hd, it, P); } catch (e) {}
    const m = model(it, P), ex = it.cat === 'cabin' && it.ex ? it.ex : null; m.position.set(-it.w / 2 + (ex ? ex.l : 0), 0, -it.d / 2 + (ex ? ex.b : 0)); hd.add(m);   // a cabin's body sits inside its plinth / projections
    const hit = new THREE.Mesh(new THREE.BoxGeometry(Math.max(it.w, 0.8), Math.max(+it.h || 3, 2), Math.max(it.d, 0.8)), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = Math.max(+it.h || 3, 2) / 2; hit.userData.hit = i; hd.add(hit);
    if (P.labels !== false && it.cat !== 'cabin' && !NOLABEL.has(it.cat)) { const tg = tag(it.label || it.cat); tg.position.y = (it.cat === 'pergola' ? 10 : Math.max(+it.h || 3, 3)) + 1.4; hd.add(tg); }
    if (P.sel === i) { const sz = [it.w + 0.6, Math.max(+it.h || 3, 1) + 0.4, it.d + 0.6], ln = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(...sz)), new THREE.LineBasicMaterial({ color: 0xC26445 })); ln.position.y = sz[1] / 2; hd.add(ln);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(it.w + 0.6, it.d + 0.6), new THREE.MeshBasicMaterial({ color: 0xC26445, transparent: true, opacity: 0.18, depthWrite: false })); pl.rotation.x = -Math.PI / 2; pl.position.y = 0.04; hd.add(pl); }
    if (P.bad === i) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(it.w + 0.4, it.d + 0.4), new THREE.MeshBasicMaterial({ color: 0xE0352B, transparent: true, opacity: 0.3, depthWrite: false })); pl.rotation.x = -Math.PI / 2; pl.position.y = 0.05; hd.add(pl); }
    if (it.cat === 'pergola' && Array.isArray(it.att) && it.att.length) {   // 193d: fixed to a wall on those sides — those posts go, a ledger beam closes the gap
      hd.updateMatrixWorld(true); const gone = [], v = new THREE.Vector3(), inZ = (q, z) => q.x >= z.x - 0.05 && q.x <= z.x + z.w + 0.05 && q.z >= z.z - 0.05 && q.z <= z.z + z.d + 0.05;
      hd.traverse(o => { if (o.isMesh && (o.userData.post || o.userData.plate)) { o.getWorldPosition(v); if (it.att.some(z => inZ(v, z))) gone.push(o); } }); gone.forEach(o => o.parent.remove(o));
      const top = (+it.h || 8) + (it.deck ? 0.6 : 0), fm = mat('c_ledger', 0x2E2E2E, { metalness: 0.4, roughness: 0.5 });
      if (it.cfgId || it.pick || P.fullPergola) it.att.forEach(z => { const lx = z.w >= z.d, b = box(items, lx ? z.w : 0.18, 0.35, lx ? 0.18 : z.d, z.x + z.w / 2, top - 0.18, z.z + z.d / 2, fm); b.userData.it = i; });   /* 265 (owner): no heavy ledger — the simple pergola's own frame meets the wall; a designed one gets a frame-sized beam */
    }
    if (it.cat === 'pergola' && P.creepers && !it.old) try { creepers(hd, it); } catch (e) {}   // 278 (owner): only once plants are added, never on an existing pergola
    H[i] = hd;
  }
}
// 193j: for the designers — the plan's things in plot coordinates (floor at y 0), not interactive except their hit boxes (userData.hit = index)
export function itemsGroup(list, P) {
  const PR = () => (typeof PRODS !== 'undefined' ? PRODS : window.PRODS) || {}, g = new THREE.Group(); g.name = 'planitems'; const H = [];
  const P2 = Object.assign({ cabinCfg: it => ((PR()[it.sku] || {}).cz || {}).cabin, cabinLay: it => { const c = ((PR()[it.sku] || {}).cz || {}).cabin; return (it.layout && (!it.lsku || it.lsku === it.sku) ? it.layout : null) || (c && c.layout) || {}; } }, P || {}, { items: list });
  drawItems(g, H, P2); return { g, holders: H };
}
function camHome(t, view) {
  const pw = +t.pw || 30, pd = +t.pd || 60, d = Math.max(pw, pd), C = R.controls; C.target.set(pw / 2, 0, pd / 2);
  if (view === 'top') { R.cam.position.set(pw / 2, d * 1.3 + 8, pd / 2 + 0.01); C.enableRotate = false; }
  else { const k = R.cam.aspect < 1 ? Math.min(1.7, 1 / R.cam.aspect) : 1;   // 223: a tall phone screen sees the whole terrace
    R.cam.position.set(pw / 2 + d * 0.3 * k, (d * 0.62 + 6) * k, pd / 2 + (pd / 2 + d * 0.32) * k); C.enableRotate = true; }
  C.update();
}
export function show(el, P, opts) {
  opts = opts || {}; ensure(el); R.dirty = true; R.P = P; R.place = !!opts.place; R.on = opts.on || null; THEME = P.theme || 'natural'; night(!!P.night);   // 223: a screen may take the 3D's events for itself (the terrace wizard)
  const t = P.site || {}, key = JSON.stringify([t, P.items, P.sel, P.bad, P.labels, P.measure, P.theme, P.fmix, P.ptags, !!P.creepers]), dims = [t.kind, t.pw, t.pd].join('x');
  if (key !== R.key) {
    if (R.group) { R.scene.remove(R.group); R.group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    R.group = build(P); R.scene.add(R.group); R.key = key;
    const pw = +t.pw || 30, pd = +t.pd || 60; R.sun.position.set(pw / 2 + 40, 80, pd / 2 + 30); R.sun.target.position.set(pw / 2, 0, pd / 2);
  }
  if (dims !== R.dims || (opts.view || '3d') !== R.view) { R.dims = dims; R.view = opts.view || '3d'; camHome(t, R.view); }
}
export function onEvent(f) { HANDLER = f; }
export function zoom(f) { if (!R) return; R.dirty = true; const C = R.controls, v = R.cam.position.clone().sub(C.target); R.cam.position.copy(C.target).add(v.multiplyScalar(f)); C.update(); }
export function panMode(on) { if (!R) return R; R.pan = !!on; const C = R.controls; C.touches.ONE = on ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE; C.mouseButtons.LEFT = on ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE; return R.pan; }   // 259: ✋ move the view instead of turning it
export function nightMode(on) { night(!!on); }
export function busy(fn, msgs) {   // 268 (owner): switching the lights takes a moment — say what is happening on the viewer meanwhile
  const el = R && R.el; if (!el) { fn(); return; } let ov = el.querySelector('.s3-busy'); if (!ov) { ov = document.createElement('div'); ov.className = 's3-busy'; ov.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:5;background:rgba(20,24,34,.82);color:#FFE7C7;padding:12px 18px;border-radius:12px;font:600 14px Inter,system-ui,sans-serif;pointer-events:none;box-shadow:0 6px 24px rgba(0,0,0,.3)'; if (getComputedStyle(el).position === 'static') el.style.position = 'relative'; el.appendChild(ov); }
  const L = msgs || ['Switching on the lights…', 'Setting the mood…', 'Creating the ambience…'], k0 = Date.now(); let k = 0; ov.textContent = L[0]; ov.style.display = ''; const iv = setInterval(() => { k = (k + 1) % L.length; ov.textContent = L[k]; }, 650);
  setTimeout(() => { try { fn(); } catch (e) {} if (R) { R.dirty = true; try { R.renderer.compile(R.scene, R.cam); R.renderer.render(R.scene, R.cam); } catch (e) {} } setTimeout(() => { clearInterval(iv); ov.style.display = 'none'; }, Math.max(300, 900 - (Date.now() - k0))); }, 60); }
export function topView(on) { if (!R || !R.P) return; R.view = on ? 'top' : '3d'; camHome(R.P.site || {}, R.view); R.dirty = true; }
export function look(p, t) { if (!R) return; R.cam.position.set(p[0], p[1], p[2]); R.controls.target.set(t[0], t[1], t[2]); R.controls.update(); R.dirty = true; }   // 294: put the camera somewhere (tests / renders)
export function home() { if (R) R.dirty = true; if (R && R.P) camHome(R.P.site || {}, R.view); }
export function resize() { size(); }
export function azimuth() { try { return R && R.controls ? R.controls.getAzimuthalAngle() : 0; } catch (e) { return 0; } }   // 278: for the planner's compass
export function snapshot() { if (R) R.renderer.render(R.scene, R.cam); return R ? R.renderer.domElement.toDataURL('image/jpeg', 0.85) : null; }

// ---- picking and dragging: items (step 2) or the blocks already on the roof (step 1)
function rayAt(e) { const r = R.renderer.domElement.getBoundingClientRect(); R.ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), R.cam); return R.ray; }
function floorAt(e) { const p = new THREE.Vector3(); return rayAt(e).ray.intersectPlane(R.floor, p) ? p : null; }
function pDown(e) { if (R) R.dirty = true;
  if (!R || !R.group || !(R.on || HANDLER) || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const ray = rayAt(e), f = floorAt(e); R.down = { x: e.clientX, y: e.clientY };
  if (R.place && R.plot) {   // step 1: a block on the roof
    const hits = ray.intersectObject(R.plot, true), h = hits.find(z => { let o = z.object; while (o && !o.userData.st) o = o.parent; return o; });
    if (h && f) { let o = h.object; while (!o.userData.st) o = o.parent; const bk = (R.P.site.blocks || [])[o.userData.st.i]; if (bk) { R.drag = { kind: 'block', i: o.userData.st.i, obj: o, f0: f.clone(), x0: +bk.x, z0: +bk.z, moved: false, fixed: !!bk.lock, side: bk.side || 'free', pos0: o.position.clone() }; R.controls.enabled = false; e.preventDefault(); } }
    return;
  }
  if (R.place) return;
  const hits = ray.intersectObjects(R.holders.filter(Boolean), true), h = hits.find(z => z.object.userData.hit != null) || hits[0];
  let i = null; if (h) { let o = h.object; while (o && o.userData.it == null) o = o.parent; if (o) i = o.userData.it; }
  if (i != null && f && (R.pan || R.P.noDrag || (() => { const q = R.P.items[i] || {}; return q.segs || q.box || q.lock; })())) { R.tapItem = i; return; }   // 259 (owner): a finger on a thing still turns / zooms the view — it is only a tap if it doesn't move
  if (i != null && f) { const it = R.P.items[i]; R.drag = { kind: 'item', i, obj: R.holders[i], f0: f.clone(), x0: +it.x, z0: +it.z, moved: false, fixed: !!(it.segs || it.box || it.lock || R.P.noDrag), pos0: R.holders[i].position.clone() }; R.controls.enabled = false; e.preventDefault(); }
  else R.tapEmpty = true;
}
let HOV = { i: null, t: 0 };
function pHover(e) {   // 248: hovering a pergola / cabin → the planner shows a 'Customise' popover there
  if (!R || !R.group || R.place || R.drag || e.pointerType !== 'mouse' || !R.renderer) return; const now = Date.now(); if (now - HOV.t < 70) return; HOV.t = now;
  const r = R.renderer.domElement.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) { if (HOV.i != null) { HOV.i = null; (R.on || HANDLER || (() => {}))({ t: 'hover', i: null }); } return; }
  const hits = rayAt(e).intersectObjects(R.holders.filter(Boolean), true); let i = null; if (hits[0]) { let o = hits[0].object; while (o && o.userData.it == null) o = o.parent; if (o) i = o.userData.it; }
  const it = i != null && R.P.items ? R.P.items[i] : null; if (!it || !(it.cat === 'pergola' || it.cat === 'cabin') || it.old) i = null;
  if (i !== HOV.i || i != null) { HOV.i = i; (R.on || HANDLER || (() => {}))({ t: 'hover', i, x: e.clientX - r.left, y: e.clientY - r.top }); } }
function pMove(e) { if (R) R.dirty = true;
  pHover(e); const d = R && R.drag; if (!d) return; const f = floorAt(e); if (!f) return;
  if (d.fixed) return; const dx = f.x - d.f0.x, dz = f.z - d.f0.z; if (!d.moved && Math.hypot(e.clientX - R.down.x, e.clientY - R.down.y) < 5) return; d.moved = true;
  d.nx = Math.round((d.x0 + dx) * 2) / 2; d.nz = Math.round((d.z0 + dz) * 2) / 2;
  if (d.side === 'left' || d.side === 'right') d.nx = d.x0; if (d.side === 'back' || d.side === 'front') d.nz = d.z0;   // on a wall: slides along it only d.obj.position.set(d.pos0.x + (d.nx - d.x0), d.pos0.y, d.pos0.z + (d.nz - d.z0));
}
function pUp(e) { if (R) R.dirty = true;
  if (!R) return; const d = R.drag; R.drag = null; R.controls.enabled = true;
  const H = R.on || HANDLER;
  if (d) { if (d.moved) H({ t: d.kind === 'block' ? 'block' : 'move', i: d.i, x: d.nx, z: d.nz }); else if (d.kind === 'item') H({ t: 'sel', i: d.i }); else if (d.kind === 'block') H({ t: 'bsel', i: d.i }); return; }
  const tap = R.down && Math.hypot(e.clientX - R.down.x, e.clientY - R.down.y) < 5;
  if (R.tapItem != null) { const i = R.tapItem; R.tapItem = null; if (tap && H) H({ t: 'sel', i }); R.tapEmpty = false; return; }
  if (R.tapEmpty && tap) H({ t: 'sel', i: null });
  R.tapEmpty = false;
}
window.Space3D = { show, onEvent, zoom, home, resize, snapshot, panMode, nightMode, topView, _r: () => R };

// 199b: a small 3D preview of one design (planters…) on a plain patio — the customiser shows it next to the photo.
// items: [{cat, cfgId, pick, cfg, w, d, h}] — drawn side by side (0.5 ft apart), front to the camera.
let PV = null;
// 294 (owner): the planter studio — grey 2 × 4 ft tiles, a 3 ft parapet in an L (back + left), the pieces along it from the corner
// (back wall first, then the side wall; a round one sits in the corner), real plants in them, a 5 ft 9 in person for scale.
function lookOn(g, look, ox, oz) {   // 299: Complete the look pieces round a studio design (its footprint from (ox, oz)); returns how wide it all is now
  if (!look || !look.items || !look.items.length) return 0;
  try { const gi = itemsGroup(look.items, { labels: false, site: { kind: 'lawn', light: '' } }).g; gi.position.set(ox, 0, oz); g.add(gi); const b = new THREE.Box3().setFromObject(gi); return isFinite(b.max.x) ? Math.max(b.max.x - b.min.x, (b.max.z - b.min.z) * 1.4) : 0; } catch (e) { if (window.console) console.warn(e); return 0; }
}
// 300: the customiser's night view — no sky light, only what glows (LED strips, backlit jaali, lamps)
function pvNight(on) { if (!PV || PV.isNight === on) return; PV.isNight = on; PV.scene.environment = on ? null : PV.env; PV.hemi.intensity = on ? 0.16 : 0.8; PV.sun.intensity = on ? 0.12 : 1.7; PV.renderer.toneMappingExposure = on ? 1.25 : 1; }
function pvGlow(g) { g.traverse(o => { if (o.userData && o.userData.nightOnly) o.visible = true; }); }
// 301: a water feature in its usual setting. Its footprint is centred on 0, the face at the back (-z), the basin in front.
function wtrStudio(it, o) {
  const g = new THREE.Group(), code = wCode(it), geys = /^TG-/.test(code), wo = it.wo || {}, W = Math.max(2, +it.w || 8), D = Math.max(1, +it.d || 2), FH = geys ? 2 : Math.max(3, Math.min(14, +wo.H || 7.5)), ex = wo.greens ? 4.2 : 0, FW = W + ex + 16;
  const M2 = (k, c, x) => mat(k, c, Object.assign({ roughness: 0.9 }, x || {}));
  studioFloor(g, -FW / 2, -D / 2 - (geys || wo.duo ? 6 : 0.6), FW, 18);
  if (geys || wo.duo) { const l = new THREE.Mesh(new THREE.PlaneGeometry(FW + 10, 16), M2('pv_lawn', 0x6E9B4A, { roughness: 1 })); l.rotation.x = -Math.PI / 2; l.position.set(0, 0.002, -D / 2 - 6 - 8); l.receiveShadow = true; g.add(l); }
  else box(g, FW, Math.max(10, FH + 2), 0.6, 0, Math.max(10, FH + 2) / 2, -D / 2 - 0.3, M2('pv_twall', 0xD9D1C4));   // the terrace wall it stands against
  const m = generic('water', W, D, FH, it); g.add(m);
  sPerson(g, W / 2 + ex / 2 + 2.6, geys ? -D / 2 + 0.5 : D / 2 + 1.6, -0.35);
  return { g, L: W + ex, D, H: Math.max(FH + (wo.pelmet ? 0.4 : 0), geys ? 6 : 0), geys, span: Math.max(W + ex + 8, (geys ? 6 : FH) * 1.6 + 4, 12) };
}
// 300: a privacy screen / partition in its usual setting. The screen runs along x centred on 0, its front towards +z.
function scrStudio(it, o) {
  const g = new THREE.Group(), L = Math.max(1, +it.w || 8), H = Math.max(0.8, +it.h || 4), pl = o.place || 'parapet', FW = L + 16, night = !!o.night;
  const M2 = (k, c, x) => mat(k, c, Object.assign({ roughness: 0.9 }, x || {}));
  const pw = (h, c) => { box(g, FW, h, 0.75, 0, h / 2, -0.4, M2('pv_pw' + c, c)); box(g, FW + 0.1, 0.12, 0.87, 0, h + 0.06, -0.4, M2('pv_pwc', 0x9E9586)); };   // a parapet / boundary wall that reads against the sky
  const lawn = (x0, z0, w, d) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M2('pv_lawn', 0x6E9B4A, { roughness: 1 })); m.rotation.x = -Math.PI / 2; m.position.set(x0 + w / 2, 0.004, z0 + d / 2); m.receiveShadow = true; g.add(m); };
  let y = 0, z = 0, z0 = 0.25, top = H;
  if (pl === 'boundary') { lawn(-FW / 2, -2, FW, 20); pw(5, 0xB59F86); y = 5.12; z = -0.4; }
  else if (o.ground === 'lawn' && /free|feature|pool|utility/.test(pl)) lawn(-FW / 2, -10, FW, 26);
  else studioFloor(g, -FW / 2, pl === 'balcony' ? -1.1 : pl === 'pergola' || pl === 'utility' ? -9 : -1.5, FW, pl === 'balcony' ? 9.8 : 18);
  if (pl === 'parapet' || pl === 'face' || pl === 'floor') { pw(3, 0xBDB2A1);
    if (pl === 'parapet') { y = 3.12; z = -0.4; } else if (pl === 'face') { y = 2.2; z = 0.15; } else { y = 0; z = 0.55; } }
  if (pl === 'balcony') {   // a balcony seen from the room: the slab with its edge, a glass railing at the edge — the screen stands just inside it
    box(g, FW, 0.5, 10, 0, -0.25, 3.8, M2('pv_slab', 0xCFC8BC)); const gl = mat('pv_glass', 0xBFD9E2, { transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.1 });
    box(g, FW, 3.4, 0.06, 0, 1.7, -1.05, gl); box(g, FW, 0.12, 0.16, 0, 3.45, -1.05, M2('pv_rail', 0x2B2B2B, { metalness: 0.5 })); for (let x = -FW / 2 + 0.5; x < FW / 2; x += 4) box(g, 0.1, 3.4, 0.1, x, 1.7, -1.05, M2('pv_rail', 0x2B2B2B, { metalness: 0.5 }));
    z = -0.4; z0 = 0.2;
  }
  if (pl === 'pergola') {   // between the front posts of a plain charcoal pergola
    const fr = M2('pv_pgfr', 0x2B2B2B, { metalness: 0.4, roughness: 0.5 }), ph = Math.max(H + 0.6, 8.5), D = 9;
    [[-L / 2 - 0.17, 0], [L / 2 + 0.17, 0], [-L / 2 - 0.17, -D], [L / 2 + 0.17, -D]].forEach(([px, pz]) => box(g, 0.33, ph, 0.33, px, ph / 2, pz, fr));
    box(g, L + 0.7, 0.5, 0.25, 0, ph - 0.25, 0, fr); box(g, L + 0.7, 0.5, 0.25, 0, ph - 0.25, -D, fr); box(g, 0.25, 0.5, D, -L / 2 - 0.17, ph - 0.25, -D / 2, fr); box(g, 0.25, 0.5, D, L / 2 + 0.17, ph - 0.25, -D / 2, fr);
    for (let x = -L / 2 + 0.75; x < L / 2; x += 1.5) box(g, 0.12, 0.35, D, x, ph + 0.17, -D / 2, fr); top = ph + 0.4;
  }
  if (pl === 'pool') {   // the screen at the back of a pool deck, the water in front of it
    const cp = M2('pv_cope', 0xE3DCCF), wt = mat('pv_water', 0x3F9FC0, { roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.88 }), pw = Math.max(8, L), pd = 7;
    box(g, pw + 1.2, 0.18, pd + 1.2, 0, 0.09, 2.2 + pd / 2, cp); const w = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd), wt); w.rotation.x = -Math.PI / 2; w.position.set(0, 0.2, 2.2 + pd / 2); g.add(w);
  }
  if (pl === 'utility') {   // AC outdoor units and a water tank behind it — what the partition hides
    const ac = M2('pv_ac', 0xE6E6E2, { roughness: 0.6 }), fan = M2('pv_fan', 0x3A3A3A);
    for (let i = 0; i < Math.min(3, Math.max(1, Math.floor(L / 3.5))); i++) { const x = -L / 2 + 1.8 + i * 3.3; box(g, 2.6, 2.1, 1.1, x, 1.05 + 0.3, -2.4, ac); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.04, 24), fan); c.rotation.x = Math.PI / 2; c.position.set(x - 0.3, 1.4, -1.83); g.add(c); box(g, 2.7, 0.3, 1.2, x, 0.15, -2.4, M2('pv_stand', 0x555555)); }
    if (L > 6) { const tk = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3.6, 28), M2('pv_tank', 0x2F3A2F, { roughness: 0.7 })); tk.position.set(L / 2 - 2, 1.8, -3.4); tk.castShadow = true; g.add(tk); }
  }
  const s = generic(it.cat || 'privacy', L, 0.5, H, it); s.position.set(0, y, z); g.add(s);
  if (it.led) {   // the LED strip at the base: a warm line, and its wash up the screen at night
    const lm = mat('c_led', 0xFFE2A8, { emissive: 0xFFC870, emissiveIntensity: 1.6 }); box(g, L - 0.2, 0.05, 0.08, 0, y + 0.06, z + 0.32, lm);
    if (night) { const n = Math.min(8, Math.max(2, Math.round(L / 4))); for (let i = 0; i < n; i++) { const p = new THREE.PointLight(0xFFB86B, 6, 7, 1.6); p.position.set(-L / 2 + (i + 0.5) * L / n, y + 0.4, z + 0.7); g.add(p); } }
  }
  if (night && /JALI-BACKLIT|STAGGER/.test(String(it.cfgId || ''))) { const n = Math.min(8, Math.max(2, Math.round(L / 4))); for (let i = 0; i < n; i++) { const p = new THREE.PointLight(0xFFB86B, 5, 8, 1.6); p.position.set(-L / 2 + (i + 0.5) * L / n, y + H / 2, z + 1); g.add(p); } }
  if (night) { const am = new THREE.PointLight(0xFFE6C8, 3, 30, 1.2); am.position.set(L / 2 + 4, 9, 8); g.add(am); }
  sPerson(g, L / 2 + 2.6, Math.max(z0, z + 0.4) + 1.6, -0.35, pl === 'balcony' ? 0 : 0);
  return { g, L, H: top + y, z0: Math.max(z0, z + 0.25), span: Math.max(L + 7, (top + y) * 1.5 + 4, 13) };
}
function cornerStudio(items, first, look) {
  const g = new THREE.Group(), GAP = 0.35, IN = 0.25, PT = 0.75, n = (items || []).length, nb = /-CW$/.test(((items || [])[0] || {}).pick || '') ? n : Math.ceil(n / 2);   // a corner quarter keeps its corner against the back wall
  let bx = IN, sz = 0, H = 0, D0 = 0;
  (items || []).forEach(it => D0 = Math.max(D0, +it.d || 2));
  (items || []).forEach((it, i) => { const w = +it.w || 2, d = +it.d || 2, m = generic(it.cat, w, d, +it.h || 2, it); H = Math.max(H, +it.h || 2);
    if (i < nb) { m.position.set(bx + w / 2, 0, IN + d / 2); bx += w + GAP; }
    else { if (!sz) sz = IN + D0 + GAP; m.rotation.y = Math.PI / 2; m.position.set(IN + d / 2, 0, sz + w / 2); sz += w + GAP; }
    g.add(m); });
  lookOn(g, look, 0, 0); let lx = bx, lz = sz; if (look && look.items) look.items.forEach(i => { lx = Math.max(lx, i.x + Math.max(i.w, i.d)); lz = Math.max(lz, i.z + Math.max(i.w, i.d)); });
  const L1 = Math.max(10, lx + 4), L2 = Math.max(10, lz + 4);
  sWall(g, -PT, -PT / 2, L1, -PT / 2, 3, PT); sWall(g, -PT / 2, 0, -PT / 2, L2, 3, PT);
  studioFloor(g, -PT, -PT, L1 + PT, L2 + PT);
  const px = Math.max(lx, 3) + 1.4; sPerson(g, px, IN + 1.3, -0.35);   // beside the last piece on the back wall, out of the way
  if (PV.group) PV.scene.remove(PV.group); PV.group = g; PV.scene.add(g);
  const cx = (px + 0.6) / 2, cz = Math.max(lz, D0 + 2) / 2, span = Math.max(px + 1, lz, 8) + 4;
  if (first || PV.span !== Math.round(span * 2)) { PV.span = Math.round(span * 2); PV.controls.target.set(cx, 2.2, cz); PV.cam.position.set(cx + span * 0.45, span * 0.55 + 3, cz + span * 1.25); PV.controls.update(); }
}
export function preview(el, items, opts) {
  if (!PV || PV.el !== el) {
    if (PV) { try { PV.renderer.dispose(); PV.ro && PV.ro.disconnect(); } catch (e) {} }
    const renderer = new THREE.WebGLRenderer({ antialias: !LITE, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(LITE ? 1.5 : 2, window.devicePixelRatio || 1)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.innerHTML = ''; el.appendChild(renderer.domElement); renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none';
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0xF1ECE3);
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 400), controls = new OrbitControls(cam, renderer.domElement);
    controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.55; controls.minDistance = 2; controls.maxDistance = 80;
    const hemi = new THREE.HemisphereLight(0xffffff, 0xb8ad98, 0.8), sun = new THREE.DirectionalLight(0xffffff, 1.7); sun.position.set(-12, 22, 14); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, far: 80 }); scene.add(hemi, sun);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), mat('pv_floor', 0xD9CFC0, { roughness: 0.95 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; scene.add(fl);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(120, 12, 0.5), mat('pv_wall', 0xE8E1D6)); wall.position.set(0, 6, -6); wall.receiveShadow = true; scene.add(wall);
    PV = { el, renderer, scene, cam, controls, group: null, key: '', fl, wall, hemi, sun, env: scene.environment };
    const size = () => { const w = el.clientWidth || 600, h = el.clientHeight || 400; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    PV.size = size; size(); try { PV.ro = new ResizeObserver(size); PV.ro.observe(el); } catch (e) {}
    const loop = () => { if (!PV || PV.renderer !== renderer) return; if (el.isConnected && el.offsetParent !== null) { controls.update(); if (PV.anim && PV.anim.length) { const tm = performance.now() / 1000; PV.anim.forEach(f => { try { f(tm); } catch (e) {} }); } renderer.render(scene, cam); } requestAnimationFrame(loop); }; loop();
  }
  const key = JSON.stringify(items) + JSON.stringify((opts && opts.look) || '') + (opts && opts.night ? 'N' : '') + (opts && opts.place || ''); if (key === PV.key) return; const first = !PV.key; PV.key = key;
  pvNight(!!(opts && opts.night)); PV.anim = [];
  if (PV.group) PV.scene.remove(PV.group);
  const corner = opts && opts.studio === 'corner'; PV.fl.visible = PV.wall.visible = !corner; PV.scene.background = new THREE.Color(corner ? 0xF4F2EE : 0xF1ECE3);
  if (corner) return cornerStudio(items, first, opts.look);
  if (opts && opts.studio === 'fw') {   // 296: a feature wall built from its parts, in its place (entrance / terrace / garden / café / cabin)
    PV.fl.visible = PV.wall.visible = false; PV.scene.background = new THREE.Color(0xF4F2EE);
    const B = fwStudio(items[0] || {}); if (PV.group) PV.scene.remove(PV.group); PV.group = B.g; PV.scene.add(B.g);
    const lw = lookOn(B.g, opts.look, -Math.max(2, +(items[0] || {}).W || 8) / 2, 0), bsp = Math.max(B.span, lw ? lw + 4 : 0);
    const nar = PV.cam.aspect < 1 ? Math.min(1.7, 1 / PV.cam.aspect) : 1, vk = 'fw' + Math.round(bsp) + (nar > 1 ? 'n' : ''); if (first || PV.vk !== vk) { PV.vk = vk; const sp = bsp * (lw ? nar : 1); /* 299: a phone sees the pieces at the sides too */ PV.controls.target.set(0, Math.min(B.H * .48, 5), 1); PV.cam.position.set(-sp * 0.22, B.H * .5 + sp * .14, sp * 1.25); PV.controls.update(); }
    return;
  }
  if (opts && opts.studio === 'wtr') {   // 301: a water feature — on a terrace wall (walls / cascades), free-standing on a deck by the lawn (geysers, double-sided)
    PV.fl.visible = PV.wall.visible = false; PV.scene.background = new THREE.Color(opts.night ? 0x141B2B : 0xF4F2EE);
    const B = wtrStudio(items[0] || {}, opts); PV.group = B.g; PV.scene.add(B.g); if (opts.night) pvGlow(B.g);
    const lw = lookOn(B.g, opts.look, -B.L / 2, -B.D / 2), bsp = Math.max(B.span, lw ? lw + 4 : 0);
    if (lw) { const lb = new THREE.Box3().setFromObject(B.g.children[B.g.children.length - 1]); B.g.children.forEach(c => { if (c.userData.person && isFinite(lb.max.x)) c.position.x = Math.max(c.position.x, lb.max.x + 1.4); }); }
    const nar = PV.cam.aspect < 1 ? Math.min(1.7, 1 / PV.cam.aspect) : 1, vk = 'wtr' + Math.round(bsp) + Math.round(B.H) + (nar > 1 ? 'n' : ''); if (first || PV.vk !== vk) { PV.vk = vk; const sp = bsp * nar, ty = Math.min(B.H * 0.45, 4.5);
      PV.controls.target.set(0, ty, 0.5); PV.cam.position.set(-sp * 0.32, ty + sp * (B.geys ? 0.4 : 0.22), sp * 1.3); PV.controls.update(); }
    return;
  }
  if (opts && opts.studio === 'scr') {   // 300: a privacy screen / partition in its usual place (parapet, boundary wall, balcony, between pergola posts, by a pool, hiding AC units…)
    PV.fl.visible = PV.wall.visible = false; PV.scene.background = new THREE.Color(opts.night ? 0x141B2B : 0xF4F2EE);
    const B = scrStudio(items[0] || {}, opts); PV.group = B.g; PV.scene.add(B.g); if (opts.night) pvGlow(B.g);
    const lw = lookOn(B.g, opts.look, -B.L / 2, B.z0), bsp = Math.max(B.span, lw ? lw + 4 : 0);
    if (lw) { const lb = new THREE.Box3().setFromObject(B.g.children[B.g.children.length - 1]); B.g.children.forEach(c => { if (c.userData.person && isFinite(lb.max.x)) c.position.x = Math.max(c.position.x, lb.max.x + 1.4); }); }   // the person stands clear of the pieces
    const nar = PV.cam.aspect < 1 ? Math.min(1.7, 1 / PV.cam.aspect) : 1, vk = 'scr' + (opts.place || '') + Math.round(bsp) + (nar > 1 ? 'n' : ''); if (first || PV.vk !== vk) { PV.vk = vk; const sp = bsp * nar, ty = Math.min(B.H * 0.5, 5);
      PV.controls.target.set(0, ty, 1); const deep = /pergola|utility|balcony|pool/.test(opts.place || ''); PV.cam.position.set(-sp * (deep ? 0.62 : 0.3), ty + sp * (deep ? 0.38 : 0.22), sp * (deep ? 1.2 : 1.35)); PV.controls.update(); }
    return;
  }
  if (opts && opts.studio === 'fn') {   // 310: Made to Order furniture in a terrace corner
    PV.fl.visible = PV.wall.visible = false; PV.scene.background = new THREE.Color(0xF4F2EE);
    const it0 = items[0] || {}, B = furnStudio(furnSpec(it0.sku, it0.m || {}, it0.o || {})); if (PV.group) PV.scene.remove(PV.group); PV.group = B.g; PV.scene.add(B.g);
    const lw = lookOn(B.g, opts.look, -B.L / 2, -B.D / 2), bsp = Math.max(B.span, lw ? lw + 4 : 0);
    const nar = PV.cam.aspect < 1 ? Math.min(1.7, 1 / PV.cam.aspect) : 1, vk = 'fn' + it0.sku + Math.round(bsp) + (nar > 1 ? 'n' : ''); if (first || PV.vk !== vk) { PV.vk = vk; const sp = bsp * nar;
      PV.controls.target.set(0, Math.min(B.H * 0.45, 1.3), -0.4); PV.cam.position.set(sp * 0.42, sp * 0.5 + 1.5, sp * 0.95); PV.controls.update(); }
    return;
  }
  if (opts && opts.studio === 'bench') {   // 307: an outrr bench at the customer's seats, on the studio floor
    PV.fl.visible = PV.wall.visible = false; PV.scene.background = new THREE.Color(0xF4F2EE);
    const B = benchStudio(items[0] || {}); if (PV.group) PV.scene.remove(PV.group); PV.group = B.g; PV.scene.add(B.g);
    const lw = lookOn(B.g, opts.look, -B.L / 2, -B.D / 2), bsp = Math.max(B.span, lw ? lw + 4 : 0);
    const nar = PV.cam.aspect < 1 ? Math.min(1.7, 1 / PV.cam.aspect) : 1, vk = 'bn' + (items[0] || {}).code + Math.round(bsp) + (nar > 1 ? 'n' : ''); if (first || PV.vk !== vk) { PV.vk = vk; const sp = bsp * nar;
      PV.controls.target.set(0, Math.min(B.H * 0.45, 3), 0); PV.cam.position.set(sp * 0.45, sp * 0.42 + 2, sp * 0.95); PV.controls.update(); }
    return;
  }
  if (opts && (opts.studio === 'gf' || opts.studio === 'vg' || opts.studio === 'dk')) {   // 309: graffiti on a wall / a vertical garden / a deck
    PV.fl.visible = PV.wall.visible = false; PV.scene.background = new THREE.Color(0xF4F2EE);
    const it0 = items[0] || {}, k = opts.studio, B = k === 'gf' ? graffitiStudio(graffitiSpec(it0.sku, it0.m || {}, it0.o || {}, it0.img)) : k === 'vg' ? vgStudio(vgSpec(it0.sku, it0.m || {}, it0.o || {})) : deckStudio(deckSpec(it0.sku, it0.m || {}, it0.o || {}));
    if (PV.group) PV.scene.remove(PV.group); PV.group = B.g; PV.scene.add(B.g);
    const lw = lookOn(B.g, opts.look, -B.L / 2, -B.D / 2), bsp = Math.max(B.span, lw ? lw + 4 : 0);
    const nar = PV.cam.aspect < 1 ? Math.min(1.7, 1 / PV.cam.aspect) : 1, vk = k + Math.round(bsp) + (nar > 1 ? 'n' : ''); if (first || PV.vk !== vk) { PV.vk = vk; const sp = bsp * nar;
      if (k === 'dk') { PV.controls.target.set(0, 0.5, 0); PV.cam.position.set(sp * 0.45, sp * 0.55, sp * 0.8); } else { PV.controls.target.set(0, B.H * 0.5, 0); PV.cam.position.set(sp * 0.35, B.H * 0.5 + sp * 0.18, sp * 1.45); } PV.controls.update(); }
    return;
  }
  if (opts && opts.studio === 'sc') {   // 309b: a sculpture at the picked height + finish, on its plinth
    PV.fl.visible = PV.wall.visible = false; PV.scene.background = new THREE.Color(0xF4F2EE);
    const it0 = items[0] || {}, B = scStudio(scSpec(it0.sku, it0.m || {}, it0.o || {})); if (PV.group) PV.scene.remove(PV.group); PV.group = B.g; PV.scene.add(B.g);
    const nar = PV.cam.aspect < 1 ? Math.min(1.7, 1 / PV.cam.aspect) : 1, vk = 'sc' + Math.round(B.span * 2) + (nar > 1 ? 'n' : ''); if (first || PV.vk !== vk) { PV.vk = vk; const sp = B.span * nar;
      PV.controls.target.set(0, B.H * 0.5, 0); PV.cam.position.set(sp * 0.35, B.H * 0.6 + sp * 0.15, sp * 0.95); PV.controls.update(); }
    return;
  }
  if (opts && opts.studio === 'ac') {   // 309: an AC cover round its AC unit, against a terrace wall
    PV.fl.visible = PV.wall.visible = false; PV.scene.background = new THREE.Color(0xF4F2EE);
    const it0 = items[0] || {}, B = acStudio(acSpec(it0.sku, it0.m || {}, it0.o || {})); if (PV.group) PV.scene.remove(PV.group); PV.group = B.g; PV.scene.add(B.g);
    const lw = lookOn(B.g, opts.look, -B.L / 2, -B.D / 2), bsp = Math.max(B.span, lw ? lw + 4 : 0);
    const nar = PV.cam.aspect < 1 ? Math.min(1.7, 1 / PV.cam.aspect) : 1, vk = 'ac' + Math.round(bsp) + (nar > 1 ? 'n' : ''); if (first || PV.vk !== vk) { PV.vk = vk; const sp = bsp * nar;
      PV.controls.target.set(0, B.cy, 0); PV.cam.position.set(sp * 0.42, B.cy + sp * 0.3, sp * 0.95); PV.controls.update(); }
    return;
  }
  if (opts && opts.studio === 'gate') {   // 309: a gate / door at the customer's width × height and colour, in its usual setting
    PV.fl.visible = PV.wall.visible = false; PV.scene.background = new THREE.Color(0xF4F2EE);
    const it0 = items[0] || {}, B = gateStudio(gateSpec(it0.sku, it0.m || {}, it0.o || {})); if (PV.group) PV.scene.remove(PV.group); PV.group = B.g; PV.scene.add(B.g);
    const nar = PV.cam.aspect < 1 ? Math.min(1.7, 1 / PV.cam.aspect) : 1, vk = 'gt' + Math.round(B.W) + '_' + Math.round(B.H) + (nar > 1 ? 'n' : ''); if (first || PV.vk !== vk) { PV.vk = vk; const sp = Math.max(B.W * 1.4, B.H * 1.8, 9) * nar;
      PV.controls.target.set(0, B.H * 0.5, 0); PV.cam.position.set(sp * 0.45, B.H * 0.55 + sp * 0.2, sp * 1.55); PV.controls.update(); }
    return;
  }
  if (opts && opts.studio === 'rail') {   // 309: a railing at the customer's length / height / fixing / corners on a balcony slab
    PV.fl.visible = PV.wall.visible = false; PV.scene.background = new THREE.Color(0xF4F2EE);
    const it0 = items[0] || {}, B = railStudio(railSpec(it0.sku, it0.m || {}, it0.o || {})); if (PV.group) PV.scene.remove(PV.group); PV.group = B.g; PV.scene.add(B.g);
    const nar = PV.cam.aspect < 1 ? Math.min(1.7, 1 / PV.cam.aspect) : 1, vk = 'rl' + Math.round(B.span) + (nar > 1 ? 'n' : ''); if (first || PV.vk !== vk) { PV.vk = vk; const sp = Math.min(B.span, 24) * nar;
      PV.controls.target.set(0, B.H * 0.45, -1); PV.cam.position.set(-sp * 0.3, B.H + sp * 0.32, sp * 0.95); PV.controls.update(); }
    return;
  }
  if (opts && opts.studio === 'bar') {   // 295: one bar frame with the design's look + the customer's picks, a 9 ft wall 3 ft behind it
    PV.fl.visible = PV.wall.visible = false; PV.scene.background = new THREE.Color(0xF4F2EE);
    const it0 = items[0] || {}, B = barStudio(Object.assign(it0.m ? barSpec(it0.sku, it0.m, it0.o || {}) : it0, { view: opts.view })); if (PV.group) PV.scene.remove(PV.group); PV.group = B.g; PV.scene.add(B.g);
    const lw = lookOn(B.g, opts.look, -B.L / 2, -B.D / 2), bsp = Math.max(B.span, lw ? lw + 4 : 0);
    const nar = PV.cam.aspect < 1 ? Math.min(1.7, 1 / PV.cam.aspect) : 1, vk = (opts.view || 'front') + Math.round(bsp) + (nar > 1 ? 'n' : ''); if (first || PV.vk !== vk) { PV.vk = vk; const sp = bsp * (lw ? nar : 1), bk = opts.view === 'back';
      PV.controls.target.set(0, 2.6, bk ? -1 : 0.6); PV.cam.position.set(sp * 0.5, sp * 0.5 + 2.5, (bk ? -1 : 1) * sp * 1.2); PV.controls.update(); }
    return;
  }
  const g = new THREE.Group(); let x = 0, W = 0, D = 0, H = 0;
  (items || []).forEach(it => { const m = generic(it.cat, +it.w || 2, +it.d || 2, +it.h || 2, it), y = it.par ? 3 : 0; m.position.set(x + (+it.w || 2) / 2, y, 0); g.add(m);
    if (it.par) box(g, (+it.w || 2) + 1, 3, 0.75, x + (+it.w || 2) / 2, 1.5, 0, mat('pv_par', 0xE3DDD2));   // 211: a screen that goes on the parapet / boundary wall, shown on one
    x += (+it.w || 2) + 0.5; D = Math.max(D, +it.d || 2, it.par ? 0.75 : 0); H = Math.max(H, (+it.h || 2) + y + 0.9); });
  W = Math.max(0.5, x - 0.5); g.position.x = -W / 2; g.position.z = -6 + 0.25 + D / 2 + 0.6; PV.group = g; PV.scene.add(g);
  const span = Math.max(W, D * 1.6, H * 1.8 + 1.5), tz = g.position.z, ty = Math.min(H * 0.5, 3);
  if (first || PV.span !== Math.round(span * 2)) { PV.span = Math.round(span * 2); PV.controls.target.set(0, ty, tz); PV.cam.position.set(span * 0.55, ty + span * 0.55, tz + span * 1.35); PV.controls.update(); }
}
