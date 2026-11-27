// 311 (owner): ready-to-ship pieces in 3D for Complete the look — every listed fire pit, BBQ grill / stove, log holder and
// cane / rattan light, one recipe per SKU (read off its photo). Models are centred on (0, 0), stand on y = 0, front = +z.
// A pendant (`hang`) has its hanging point at y = 0 and the shade below it; lampModel() puts it on a black stand when there is
// nothing to hang it from. Glows that should only show at night are listed in g.userData.nl (space3d's nightOnly takes them).
// Sizes (ft) are in DIM — mto.js RTS_DIM keeps the same numbers for the 2D layout / clash checks.
import * as THREE from './vendor/three/three.module.min.js';

const M = {}, T = {};
const mt = (k, o) => M[k] || (M[k] = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.6 }, o)));
const STEEL = () => mt('r_steel', { color: 0x1E1D1C, metalness: 0.55, roughness: 0.55, side: THREE.DoubleSide });
const SS = () => mt('r_ss', { color: 0xC4C8CC, metalness: 0.85, roughness: 0.3 });
const BLUE = () => mt('r_blue', { color: 0x2E6A8E, metalness: 0.4, roughness: 0.5 });
const LOG = () => mt('r_log', { color: 0x5A3C28, roughness: 1 });
const EMB = () => mt('r_emb', { color: 0x3A1406, emissive: 0xFF4A00, emissiveIntensity: 0.9, roughness: 1 });
const FL1 = () => mt('r_fl1', { color: 0xFF7A1A, emissive: 0xFF5A00, emissiveIntensity: 1.4, roughness: 1, transparent: true, opacity: 0.92 });
const FL2 = () => mt('r_fl2', { color: 0xFFD27A, emissive: 0xFFB030, emissiveIntensity: 1.6, roughness: 1, transparent: true, opacity: 0.9 });

function bx(g, w, h, d, x, y, z, m) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; }
function cy(g, rt, rb, h, x, y, z, m, s, open) { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, s || 16, 1, !!open), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; }
function rod(g, a, b, r, m) { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B), o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 6), m);
  o.position.copy(A).add(B).multiplyScalar(0.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); o.castShadow = true; g.add(o); return o; }

// ---------- laser-cut panels: a canvas where the metal is opaque and the cut-outs are holes (alphaMap) ----------
function cutTex(kind) {
  if (T[kind]) return T[kind];
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 256); x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000'; x.strokeStyle = '#000'; x.lineCap = 'round';
  const tri = (a, b, cc) => { x.beginPath(); x.moveTo(...a); x.lineTo(...b); x.lineTo(...cc); x.closePath(); x.fill(); };
  const flame = (cx, by, s) => { x.beginPath(); x.moveTo(cx, by); x.bezierCurveTo(cx - 34 * s, by - 30 * s, cx - 10 * s, by - 70 * s, cx + 4 * s, by - 110 * s); x.bezierCurveTo(cx + 8 * s, by - 70 * s, cx + 36 * s, by - 46 * s, cx, by); x.fill(); };
  const deer = (cx, by, s) => { x.beginPath(); x.ellipse(cx, by - 70 * s, 38 * s, 20 * s, 0, 0, 7); x.fill(); x.fillRect(cx + 20 * s, by - 112 * s, 12 * s, 40 * s); x.beginPath(); x.ellipse(cx + 32 * s, by - 116 * s, 13 * s, 8 * s, 0.4, 0, 7); x.fill();
    [-28, -14, 16, 30].forEach(dx => x.fillRect(cx + dx * s, by - 62 * s, 6 * s, 62 * s)); x.lineWidth = 5 * s;
    [[0, -1], [1, 1]].forEach(([k, d]) => { x.beginPath(); x.moveTo(cx + 26 * s + k * 10 * s, by - 122 * s); x.lineTo(cx + 18 * s + k * 24 * s, by - 160 * s); x.stroke(); x.beginPath(); x.moveTo(cx + 22 * s + k * 16 * s, by - 140 * s); x.lineTo(cx + 6 * s + k * 34 * s + d * 4, by - 150 * s); x.stroke(); }); };
  const pine = (cx, by, s) => { for (let k = 0; k < 3; k++) tri([cx - (26 - k * 6) * s, by - k * 26 * s], [cx + (26 - k * 6) * s, by - k * 26 * s], [cx, by - (k * 26 + 40) * s]); x.fillRect(cx - 3 * s, by, 6 * s, 10 * s); };
  if (kind === 'mount') { x.beginPath(); x.moveTo(16, 200); [[60, 110], [95, 160], [140, 70], [185, 150], [215, 105], [240, 200]].forEach(p => x.lineTo(...p)); x.closePath(); x.fill(); x.beginPath(); x.arc(190, 60, 18, 0, 7); x.fill(); }
  else if (kind === 'trees') { [40, 90, 130, 175, 220].forEach((cx, i) => pine(cx, 210, i % 2 ? 1.1 : 0.85)); x.fillRect(14, 222, 228, 10); }
  else if (kind === 'deer') { deer(110, 225, 1.1); pine(214, 215, 0.8); pine(30, 215, 0.6); }
  else if (kind === 'deerf') { deer(128, 200, 1.0); pine(36, 200, 1.1); pine(222, 200, 1.1); x.fillRect(10, 214, 236, 14); for (let k = 0; k < 6; k++) { x.beginPath(); x.arc(24 + k * 42, 30, 9, 0, 7); x.fill(); } }
  else if (kind === 'antler') { x.lineWidth = 9; [[78, -1], [178, 1]].forEach(([cx, d]) => { x.beginPath(); x.moveTo(cx, 200); x.quadraticCurveTo(cx + d * 10, 110, cx - d * 20, 50); x.stroke(); [70, 110, 150].forEach(y => { x.beginPath(); x.moveTo(cx + d * 4, y + 20); x.lineTo(cx + d * 40, y - 6); x.stroke(); }); }); }
  else if (kind === 'flame') { flame(70, 220, 0.9); flame(128, 228, 1.3); flame(188, 220, 0.9); }
  else if (kind === 'geo') { for (let r = 0; r < 4; r++) for (let k = 0; k < 5; k++) { const x0 = 18 + k * 46 + (r % 2) * 23, y0 = 22 + r * 56; if (x0 > 220) continue; (k + r) % 2 ? tri([x0, y0], [x0 + 40, y0], [x0 + 20, y0 + 46]) : tri([x0, y0 + 46], [x0 + 40, y0 + 46], [x0 + 20, y0]); } }
  else if (kind === 'brick') { for (let r = 0; r < 9; r++) for (let k = 0; k < 5; k++) { const x0 = 16 + k * 48 + (r % 2 ? 24 : 0); if (x0 + 36 > 244) continue; x.fillRect(x0, 18 + r * 25, 36, 9); } }
  else if (kind === 'slots') { for (let k = 0; k < 8; k++) x.fillRect(20 + k * 29, 18, 14, 220); }
  else if (kind === 'wide') { for (let k = 0; k < 4; k++) x.fillRect(22 + k * 58, 0, 34, 256); }   // wide bars (cages, slatted spheres)
  else if (kind === 'hslots') { for (let k = 0; k < 7; k++) x.fillRect(18, 22 + k * 32, 220, 14); }
  else if (kind === 'dots') { for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { x.beginPath(); x.arc(40 + k * 58, 40 + r * 58, 17, 0, 7); x.fill(); } }
  else if (kind === 'text') { x.fillRect(20, 30, 216, 16); for (let k = 0; k < 9; k++) { x.fillRect(26 + k * 24, 120, 14, 48); if (k % 2) x.fillRect(26 + k * 24, 120, 22, 10); } x.fillRect(20, 214, 216, 16); }
  else if (kind === 'diag') { x.lineWidth = 14; for (let k = -256; k < 512; k += 44) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + 256, 256); x.stroke(); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return (T[kind] = t);
}
function cutMat(kind, rep, base) { const k = 'cut_' + kind + '_' + rep + '_' + (base || 's'); if (M[k]) return M[k];
  const t = cutTex(kind).clone(); t.needsUpdate = true; t.repeat.set(rep || 1, 1);
  return (M[k] = new THREE.MeshStandardMaterial({ color: base === 'ss' ? 0xC4C8CC : base === 'blue' ? 0x2E6A8E : 0x1E1D1C, metalness: base === 'ss' ? 0.85 : 0.55, roughness: base === 'ss' ? 0.3 : 0.55, alphaMap: t, alphaTest: 0.5, side: THREE.DoubleSide })); }
// an n-sided ring of panels (n = 0 → round), radius r at the bottom, rt at the top
function ring(g, n, r, rt, h, y0, kind, base) { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, r, h, n || 32, 1, true), kind ? cutMat(kind, n || 6, base) : base === 'ss' ? SS() : STEEL());
  if (n) o.rotation.y = Math.PI / n; o.position.y = y0 + h / 2; o.castShadow = true; g.add(o); return o; }
function lathe(g, pts, kind, rep, base, y0, a0, al) { const o = new THREE.Mesh(new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 40, a0 || 0, al || Math.PI * 2), kind ? cutMat(kind, rep || 8, base) : STEEL());
  o.position.y = y0 || 0; o.castShadow = true; g.add(o); return o; }

// ---------- fire, logs, grates ----------
function fire(g, x, y, z, s, nl) { s = s || 1; cy(g, 0.42 * s, 0.42 * s, 0.05, x, y + 0.03, z, EMB(), 14);
  [[0, 0, 1.0], [0.22, 0.1, 0.75], [-0.2, 0.12, 0.8], [0.05, -0.2, 0.7]].forEach(([dx, dz, hh], i) => { const f = new THREE.Mesh(new THREE.ConeGeometry(0.17 * s, hh * s, 7), i ? FL1() : FL2()); f.position.set(x + dx * s, y + hh * s / 2 + 0.04, z + dz * s); g.add(f); });
  [0, 1.9, 3.8].forEach(a => { const l = cy(g, 0.07 * s, 0.07 * s, 0.75 * s, x, y + 0.12 * s, z, LOG(), 7); l.rotation.set(Math.PI / 2, 0, a); });
  if (nl) { const h = halo(); h.scale.set(3.2 * s, 3.2 * s, 1); h.position.set(x, y + 0.6 * s, z); g.add(h); nl.push(h); } }
function logs(g, x, y, z, w, n, rows) { for (let r = 0; r < (rows || 2); r++) for (let k = 0; k < n; k++) { const l = cy(g, 0.11, 0.11, w, x - (n - 1) * 0.12 + k * 0.24 + (r % 2) * 0.12, y + 0.11 + r * 0.2, z, LOG(), 8); l.rotation.z = Math.PI / 2; l.rotation.y = Math.PI / 2; } }
function grate(g, w, d, y, base) { const m = base === 'ss' ? SS() : STEEL(); bx(g, w, 0.04, 0.04, 0, y, -d / 2, m); bx(g, w, 0.04, 0.04, 0, y, d / 2, m); const n = Math.max(5, Math.round(w / 0.12)); for (let k = 0; k <= n; k++) bx(g, 0.025, 0.025, d, -w / 2 + w * k / n, y, 0, m); }
function legs(g, n, r, h, y, m, splay) { for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + Math.PI / n; rod(g, [Math.cos(a) * r, y, Math.sin(a) * r], [Math.cos(a) * (r + (splay || 0)), y - h, Math.sin(a) * (r + (splay || 0))], 0.035, m || STEEL()); } }
function boxLegs(g, w, d, h, m) { [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => bx(g, 0.07, h, 0.07, a * (w / 2 - 0.04), h / 2, b * (d / 2 - 0.04), m || STEEL())); }
// an open box made of 4 cut panels + a floor
function cbox(g, w, d, h, y0, kind, base, kind2) { const m1 = kind ? cutMat(kind, 1, base) : base === 'ss' ? SS() : base === 'blue' ? BLUE() : STEEL(), m2 = kind2 ? cutMat(kind2, 1, base) : m1;
  const P = (pw, ph, x, z, ry, m) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), m); p.position.set(x, y0 + ph / 2, z); p.rotation.y = ry; p.castShadow = true; g.add(p); };
  P(w, h, 0, d / 2, 0, m1); P(w, h, 0, -d / 2, Math.PI, m1); P(d, h, w / 2, 0, Math.PI / 2, m2); P(d, h, -w / 2, 0, -Math.PI / 2, m2); bx(g, w, 0.04, d, 0, y0 + 0.02, 0, base === 'ss' ? SS() : base === 'blue' ? BLUE() : STEEL()); }
let HT = null; function halo() { if (!HT) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,190,110,.9)'); gr.addColorStop(0.4, 'rgba(255,160,80,.35)'); gr.addColorStop(1, 'rgba(255,150,70,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  HT = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }); } return new THREE.Sprite(HT); }

// ---------- fire pits / log holders (sizes: w, d, h in ft) ----------
export const DIM = {
  'S9-BBQ10': [2.2, 1.3, 2], 'S9-BBQ20': [1.5, 1.5, 1.6], 'S9-BBQ30': [2.6, 2.6, 1.3], 'S9-BP1000': [1.8, 1.8, 3.2], 'S9-BP100D': [2.6, 2.6, 1.7], 'S9-BP1100': [2.8, 2.8, 1.2],
  'S9-BP1100-HD': [2.4, 2.4, 1.3], 'S9-BP1200': [2.6, 2.6, 1.4], 'S9-BP1300': [1.8, 1.8, 2.8], 'S9-BP1400': [1.4, 1.4, 2.5], 'S9-BP1500': [2.2, 2.2, 2.4], 'S9-BP1600': [2.6, 2.6, 1.4],
  'S9-BP1700': [1.4, 1.4, 2.5], 'S9-BP1800': [3, 3, 1.3], 'S9-BP1900': [1.4, 1.2, 2.6], 'S9-BP200': [2.2, 2.2, 1.3], 'S9-BP2000': [1.8, 1.8, 3.4], 'S9-BP2200': [1.9, 1.9, 2.8],
  'S9-BP2300': [1.5, 0.9, 3.6], 'S9-BP300': [2.6, 2.6, 1.8], 'S9-BP400': [2.2, 2.2, 2.4], 'S9-BP500': [2.6, 2.6, 1], 'S9-BP700': [1.9, 1.9, 2.7], 'S9-BP800': [2.8, 2.8, 1.2],
  'S9-BP900': [1.8, 1.8, 3.1], 'S9-BPA1': [2.2, 1.1, 1],
  // BBQ grills / stoves
  'S9-BBQ120-KABAB': [2.8, 1.3, 2.9], 'S9-BBQ120-PRO': [2.6, 1.6, 3.2], 'S9-BBQ130': [2.2, 1.6, 1.1], 'S9-BBQ140': [2.6, 1.6, 3.3], 'S9-BBQ150': [3, 1.6, 3.3], 'S9-BBQ40': [2.2, 1.4, 1.4],
  'S9-BBQ50': [2.2, 1.3, 1.3], 'S9-BBQ60': [2.4, 1.1, 1.7], 'S9-BBQ70': [2.2, 1.2, 1.2], 'S9-BBQ80': [3.2, 1.7, 1.8], 'S9-BP600': [2.6, 2.6, 1.8], 'S9-RS1': [1.5, 1, 2.5] };

const FP = {
  'S9-BBQ10': (g, n) => { const ring0 = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.05, 6, 32), STEEL()); ring0.position.set(0, 1.0, -0.45); g.add(ring0); [0.95, -0.95].forEach(x => rod(g, [x * 0.0, 0.05, -0.45], [0, 1.95, -0.45], 0.03, STEEL()));
    rod(g, [-0.95, 1.0, -0.45], [0.95, 1.0, -0.45], 0.03, STEEL()); cbox(g, 2.1, 1.0, 0.8, 0.1, 'text', 0, 'slots'); boxLegs(g, 2.1, 1.0, 0.12); fire(g, 0, 0.2, 0, 1, n); },
  'S9-BBQ20': (g, n) => { cbox(g, 1.4, 1.4, 1.5, 0.05, 'brick'); fire(g, 0, 0.12, 0, 0.9, n); },
  'S9-BBQ30': (g, n) => { ring(g, 6, 0.65, 1.3, 0.95, 0.35, 'geo'); legs(g, 3, 0.6, 0.35, 0.35, STEEL(), 0.25); fire(g, 0, 0.4, 0, 1, n); },
  'S9-BP1000': (g, n) => { ring(g, 6, 0.55, 0.9, 1.4, 0.1, 'geo'); ring(g, 6, 0.9, 0.3, 1.4, 1.5, 'geo'); cy(g, 0.3, 0.3, 0.3, 0, 3.05, 0, STEEL(), 6); cy(g, 0.6, 0.6, 0.1, 0, 0.05, 0, STEEL(), 6); fire(g, 0, 0.15, 0, 0.8, n); },
  'S9-BP100D': (g, n) => { lathe(g, [[1.05, 0.15], [1.25, 0.55], [1.3, 0.85], [1.25, 1.15], [1.05, 1.6]], 'wide', 14); [0.15, 1.6].forEach(y => { const t = new THREE.Mesh(new THREE.TorusGeometry(y > 1 ? 1.05 : 1.05, 0.04, 6, 36), STEEL()); t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t); }); cy(g, 1.05, 1.05, 0.04, 0, 0.15, 0, STEEL(), 32); fire(g, 0, 0.2, 0, 1.2, n); },
  'S9-BP1100': (g, n) => { ring(g, 6, 1.4, 1.4, 1.1, 0.05, 'mount'); fire(g, 0, 0.1, 0, 1.2, n); },
  'S9-BP1100-HD': (g, n) => { ring(g, 4, 0.75, 1.2, 1.15, 0.12, 'flame'); boxLegs(g, 1.0, 1.0, 0.14); fire(g, 0, 0.2, 0, 1, n); },
  'S9-BP1200': (g, n) => { ring(g, 4, 0.5, 1.3, 1.25, 0.1, 'slots'); cy(g, 0.55, 0.55, 0.1, 0, 0.05, 0, STEEL(), 4); fire(g, 0, 0.2, 0, 0.9, n); },
  'S9-BP1300': (g, n) => { cbox(g, 1.4, 1.4, 1.5, 0.45, 'hslots'); legs(g, 4, 0.75, 0.45, 0.45, STEEL()); const r = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.7, 4, 1, true), STEEL()); r.rotation.y = Math.PI / 4; r.position.y = 2.3; g.add(r); cy(g, 0.12, 0.12, 0.3, 0, 2.75, 0, STEEL(), 8); fire(g, 0, 0.5, 0, 0.8, n); },
  'S9-BP1400': (g, n) => { ring(g, 4, 0.5, 0.7, 2.0, 0.35, 'slots'); bx(g, 1.4, 0.06, 1.4, 0, 0.06, 0, STEEL()); legs(g, 4, 0.55, 0.3, 0.35, STEEL()); logs(g, 0, 0.4, 0, 0.6, 2, 2); fire(g, 0, 0.9, 0, 0.8, n); },
  'S9-BP1500': (g, n) => { lathe(g, sph(1.05, 0.35), 'deerf', 3); cy(g, 0.35, 0.5, 0.35, 0, 0.17, 0, STEEL(), 16); fire(g, 0, 0.7, 0, 0.9, n); },
  'S9-BP1600': (g, n) => { ring(g, 6, 0.95, 1.3, 1.1, 0.25, 'deer'); ring(g, 6, 0.95, 0.95, 0.25, 0, 0); fire(g, 0, 0.3, 0, 1.1, n); },
  'S9-BP1700': (g, n) => { ring(g, 0, 0.55, 0.65, 2.1, 0.3, 'wide'); bx(g, 1.3, 0.06, 1.3, 0, 0.05, 0, STEEL()); legs(g, 4, 0.6, 0.3, 0.33, STEEL()); logs(g, 0, 0.35, 0, 0.6, 2, 3); fire(g, 0, 1.0, 0, 0.8, n); },
  'S9-BP1800': (g, n) => { ring(g, 6, 0.8, 1.5, 0.95, 0.3, 'flame'); legs(g, 3, 0.75, 0.3, 0.3, STEEL(), 0.2); fire(g, 0, 0.35, 0, 1.2, n); },
  'S9-BP1900': (g) => { lathe(g, [[0.02, 0], [0.55, 0.5], [0.65, 1.3], [0.45, 2.1], [0.02, 2.6]], 'wide', 6, 0, 0, Math.PI * 0.8, Math.PI * 1.4); legs(g, 3, 0.35, 0.15, 0.15, STEEL(), 0.15); logs(g, 0, 0.2, 0, 0.9, 2, 4); },
  'S9-BP200': (g, n) => { for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, p = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.95, 1.25, 8, 1, true, a, Math.PI / 3.4), STEEL()); p.position.y = 0.63; p.rotation.y = 0.1 * k; p.castShadow = true; g.add(p); } fire(g, 0, 0.15, 0, 1, n); },
  'S9-BP2000': (g, n) => { lathe(g, [[0.02, 3.4], [0.2, 2.7], [0.55, 1.9], [0.85, 1.2], [0.8, 0.75], [0.4, 0.45], [0.02, 0.42]], 0, 0, 0, 0, Math.PI * 0.35, Math.PI * 1.3); legs(g, 3, 0.25, 0.45, 0.45, STEEL(), 0.45); fire(g, 0, 0.5, 0.1, 0.8, n); },
  'S9-BP2200': (g, n) => { lathe(g, [[0.25, 0.25], [0.75, 0.55], [0.92, 1.2], [0.85, 1.8], [0.5, 2.3], [0.25, 2.4]], 'wide', 12, 0); cy(g, 0.6, 0.65, 0.25, 0, 0.12, 0, STEEL(), 20); cy(g, 0.3, 0.3, 0.3, 0, 2.55, 0, STEEL(), 12);
    rod(g, [0.15, 2.6, 0], [0.55, 2.55, 0.0], 0.05, STEEL()); rod(g, [0.55, 2.55, 0], [0.75, 1.9, 0], 0.05, STEEL()); const t = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 16), STEEL()); t.position.set(-0.4, 2.6, 0); g.add(t); fire(g, 0, 0.3, 0, 0.9, n); },
  'S9-BP2300': (g, n) => { const s = new THREE.Shape(); s.absarc(0, 0.8, 0.72, 0, Math.PI * 2, false); const b = new THREE.Shape(); b.absarc(0, 1.75, 0.55, 0, Math.PI * 2, false);
    const ex = o => { const m = new THREE.Mesh(new THREE.ExtrudeGeometry(o, { depth: 0.7, bevelEnabled: false, curveSegments: 24 }), STEEL()); m.position.set(0, 0.15, -0.35); m.castShadow = true; g.add(m); }; ex(s); ex(b);
    bx(g, 0.22, 1.4, 0.18, 0, 2.95, 0, STEEL()); bx(g, 0.34, 0.4, 0.2, 0, 3.75, 0, STEEL()); bx(g, 0.75, 0.6, 0.72, 0, 0.9, 0.02, mt('r_win', { color: 0x120A04 })); fire(g, 0, 0.62, 0.15, 0.6, n); bx(g, 1.2, 0.12, 0.7, 0, 0.06, 0, STEEL()); },
  'S9-BP300': (g, n) => { for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, h = 1.1 + ((k * 7) % 5) * 0.16, sp = new THREE.Mesh(new THREE.ConeGeometry(0.25, h, 3), STEEL()); sp.position.set(Math.cos(a) * 1.0, h / 2, Math.sin(a) * 1.0); sp.rotation.y = -a; sp.castShadow = true; g.add(sp); } cy(g, 1.05, 1.05, 0.05, 0, 0.03, 0, STEEL(), 28); fire(g, 0, 0.08, 0, 1.2, n); },
  'S9-BP400': (g, n) => { lathe(g, sph(1.05, 0.3), 'wide', 18); cy(g, 0.3, 0.45, 0.3, 0, 0.15, 0, STEEL(), 16); fire(g, 0, 0.65, 0, 0.9, n); },
  'S9-BP500': (g, n) => { ring(g, 0, 1.25, 1.25, 0.95, 0, 'trees'); const t = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.04, 6, 40), STEEL()); t.rotation.x = Math.PI / 2; t.position.y = 0.95; g.add(t); fire(g, 0, 0.05, 0, 1.2, n); },
  'S9-BP700': (g, n) => { lathe(g, [[0.02, 2.7], [0.18, 2.3], [0.55, 1.5], [0.9, 0.8], [0.85, 0.35], [0.5, 0.15]], 'wide', 14); cy(g, 0.5, 0.55, 0.15, 0, 0.08, 0, STEEL(), 20); fire(g, 0, 0.2, 0, 1, n); },
  'S9-BP800': (g, n) => { const pts = []; for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 - Math.PI / 2, r = k % 2 ? 0.75 : 1.4; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
    pts.forEach((p, k) => { const q = pts[(k + 1) % 10], L = Math.hypot(q[0] - p[0], q[1] - p[1]), pl = new THREE.Mesh(new THREE.PlaneGeometry(L, 1.05), cutMat('slots', 1)); pl.position.set((p[0] + q[0]) / 2, 0.6, (p[1] + q[1]) / 2); pl.rotation.y = -Math.atan2(q[1] - p[1], q[0] - p[0]); pl.castShadow = true; g.add(pl); });
    cy(g, 0.75, 0.75, 0.06, 0, 0.08, 0, STEEL(), 10); fire(g, 0, 0.1, 0, 1.1, n); },
  'S9-BP900': (g, n) => { lathe(g, [[0.25, 1.35], [0.72, 1.55], [0.9, 2.1], [0.85, 2.7], [0.72, 3.05]], 'dots', 6); cy(g, 0.08, 0.08, 1.2, 0, 0.8, 0, STEEL(), 8); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; rod(g, [0, 0.4, 0], [Math.cos(a) * 0.6, 0.03, Math.sin(a) * 0.6], 0.035, STEEL()); } cy(g, 0.25, 0.25, 0.05, 0, 1.35, 0, STEEL(), 16); fire(g, 0, 1.4, 0, 0.75, n); },
  'S9-BPA1': (g) => { [-0.45, 0.45].forEach(z => { const t = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.05, 6, 24, Math.PI), STEEL()); t.rotation.z = Math.PI; t.position.set(0, 0.95, z); g.add(t); }); for (let k = 0; k < 5; k++) { const a = Math.PI + k / 4 * Math.PI; rod(g, [Math.cos(a) * 0.85, 0.95 + Math.sin(a) * 0.85, -0.45], [Math.cos(a) * 0.85, 0.95 + Math.sin(a) * 0.85, 0.45], 0.03, STEEL()); } logs(g, 0, 0.12, 0, 0.95, 3, 2); },
  // BBQ grills / stoves
  'S9-BBQ120-KABAB': (g, n) => { boxLegs(g, 2.6, 1.0, 2.2); cbox(g, 2.6, 1.0, 0.55, 2.2, 0); grate(g, 2.5, 0.95, 2.72); bx(g, 2.6, 0.04, 0.9, 0, 0.6, 0, STEEL()); for (let k = 0; k < 9; k++) rod(g, [-1.2 + k * 0.3, 2.95, -0.6], [-1.2 + k * 0.3, 2.95, 0.6], 0.012, SS()); fire(g, 0, 2.25, 0, 0.7, n); },
  'S9-BBQ120-PRO': (g, n) => { [[-1, 1], [1, -1]].forEach(([a, b]) => { rod(g, [-1.1, 0, a * 0.7], [-1.1, 2.2, b * 0.7], 0.04, STEEL()); rod(g, [1.1, 0, a * 0.7], [1.1, 2.2, b * 0.7], 0.04, STEEL()); }); cbox(g, 2.4, 1.2, 0.5, 2.1, 0); grate(g, 2.3, 1.1, 2.55);
    [-1.15, 1.15].forEach(x => rod(g, [x, 2.55, 0], [x, 3.2, 0], 0.04, STEEL())); rod(g, [-1.15, 3.2, 0], [1.15, 3.2, 0], 0.035, STEEL()); bx(g, 2.2, 0.05, 0.8, 0, 0.7, 0, STEEL()); fire(g, 0, 2.15, 0, 0.65, n); },
  'S9-BBQ130': (g, n) => { cbox(g, 2.0, 1.4, 0.7, 0.35, 'geo', 'ss'); bx(g, 2.2, 0.35, 1.6, 0, 0.17, 0, SS()); grate(g, 1.9, 1.3, 1.07, 'ss'); fire(g, 0, 0.4, 0, 0.8, n); },
  'S9-BBQ140': (g, n) => { boxLegs(g, 2.4, 1.3, 2.3, SS()); cbox(g, 2.4, 1.3, 0.6, 2.3, 0, 'ss'); grate(g, 2.3, 1.25, 2.86, 'ss'); bx(g, 2.3, 0.04, 1.2, 0, 0.6, 0, SS()); [-1.15, 1.15].forEach(x => rod(g, [x, 2.9, 0], [x, 3.3, 0], 0.03, SS())); rod(g, [-1.15, 3.3, 0], [1.15, 3.3, 0], 0.025, SS()); fire(g, 0, 2.35, 0, 0.7, n); },
  'S9-BBQ150': (g, n) => { boxLegs(g, 2.8, 1.3, 2.2, BLUE()); cbox(g, 2.8, 1.3, 0.6, 2.2, 'hslots', 'blue'); grate(g, 2.7, 1.25, 2.76); bx(g, 2.7, 0.04, 1.2, 0, 0.55, 0, BLUE()); [-1.3, 1.3].forEach(x => rod(g, [x, 2.8, -0.65], [x, 3.3, -0.65], 0.04, STEEL())); rod(g, [-1.3, 3.3, -0.65], [1.3, 3.3, -0.65], 0.035, STEEL()); fire(g, 0, 2.25, 0, 0.7, n); },
  'S9-BBQ40': (g, n) => { cbox(g, 2.1, 1.3, 1.1, 0.2, 'hslots', 0, 'antler'); bx(g, 2.2, 0.08, 1.4, 0, 0.12, 0, STEEL()); boxLegs(g, 2.1, 1.3, 0.14); grate(g, 2.0, 1.2, 1.0); fire(g, 0, 0.3, 0, 0.8, n); },
  'S9-BBQ50': (g, n) => { [[-1, 1], [1, -1]].forEach(([a, b]) => { rod(g, [-0.9, 0, a * 0.55], [-0.9, 0.7, b * 0.55], 0.04, STEEL()); rod(g, [0.9, 0, a * 0.55], [0.9, 0.7, b * 0.55], 0.04, STEEL()); });
    ring(g, 4, 0.45, 0.95, 0.55, 0.7, 'slots').scale.set(1.3, 1, 0.75); fire(g, 0, 0.75, 0, 0.8, n); },
  'S9-BBQ60': (g, n) => { cbox(g, 1.6, 1.0, 0.6, 0.05, 0); grate(g, 1.5, 0.95, 0.62); bx(g, 0.8, 1.6, 1.0, -1.15, 0.8, 0, STEEL()); const f = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.2), cutMat('flame', 1)); f.position.set(-1.15, 0.9, 0.51); g.add(f); fire(g, 0.2, 0.08, 0, 0.6, n); },
  'S9-BBQ70': (g, n) => { [-0.8, 0.8].forEach(x => { const t = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.045, 6, 18, Math.PI), STEEL()); t.rotation.set(0, Math.PI / 2, Math.PI); t.position.set(x, 0.55, 0); g.add(t); }); ring(g, 4, 0.45, 0.85, 0.5, 0.55, 'slots').scale.set(1.3, 1, 0.7); fire(g, 0, 0.6, 0, 0.75, n); },
  'S9-BBQ80': (g, n) => { cbox(g, 2.8, 1.4, 0.9, 0.55, 'hslots', 0, 'text'); [[-1.0, 1], [1.0, 1], [-1.0, -1], [1.0, -1]].forEach(([x, s]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.25, 18), STEEL()); w.rotation.x = Math.PI / 2; w.position.set(x, 0.4, s * 0.75); w.castShadow = true; g.add(w); });
    bx(g, 0.08, 0.7, 1.4, 1.4, 0.9, 0, cutMat('hslots', 1)); rod(g, [-0.6, 1.45, -0.7], [-0.8, 1.8, -0.7], 0.04, STEEL()); rod(g, [-0.6, 1.45, 0.7], [-0.8, 1.8, 0.7], 0.04, STEEL()); rod(g, [-0.8, 1.8, -0.7], [-0.8, 1.8, 0.7], 0.04, STEEL()); grate(g, 2.6, 1.3, 1.45); fire(g, 0, 0.6, 0, 0.9, n); },
  'S9-BP600': (g, n) => { ring(g, 6, 0.7, 1.3, 0.65, 0.95, 'geo'); grate(g, 1.8, 1.8, 1.62); legs(g, 3, 0.65, 0.95, 0.95, STEEL(), 0.35); fire(g, 0, 1.0, 0, 0.9, n); },
  'S9-RS1': (g, n) => { bx(g, 0.75, 1.9, 0.75, 0.3, 1.25, 0, STEEL()); bx(g, 0.9, 0.55, 0.65, -0.45, 0.95, 0, STEEL()); bx(g, 0.5, 0.3, 0.02, 0.3, 1.1, 0.38, mt('r_win', { color: 0x120A04 })); legs(g, 4, 0.4, 0.3, 0.3, STEEL()); for (let k = 0; k < 3; k++) rod(g, [0.05 + k * 0.25, 2.22, -0.3], [0.05 + k * 0.25, 2.22, 0.3], 0.025, STEEL()); fire(g, 0.3, 2.2, 0, 0.35, n); }
};
function sph(r, y0) { const p = []; for (let k = 0; k <= 12; k++) { const a = -Math.PI / 2 + k / 12 * Math.PI; p.push([Math.max(0.02, Math.cos(a) * r), y0 + r + Math.sin(a) * r]); } return p; }

// ---------- cane / rattan lights ----------
function weave(kind) { const k = 'wv_' + kind; if (T[k]) return T[k]; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.clearRect(0, 0, 128, 128); x.strokeStyle = '#fff';
  if (kind === 'tight') { x.fillStyle = '#fff'; x.fillRect(0, 0, 128, 128); x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 128; i += 16) for (let j = 0; j < 128; j += 16) { x.beginPath(); x.arc(i + 8, j + 8, 3, 0, 7); x.fill(); } }
  else if (kind === 'open') { x.lineWidth = 4; for (let i = -128; i < 256; i += 22) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 128, 128); x.stroke(); x.beginPath(); x.moveTo(i + 128, 0); x.lineTo(i, 128); x.stroke(); } }
  else if (kind === 'vert') { x.lineWidth = 5; for (let i = 4; i < 128; i += 14) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.stroke(); } x.lineWidth = 3; for (let j = 8; j < 128; j += 42) { x.beginPath(); x.moveTo(0, j); x.lineTo(128, j); x.stroke(); } }
  else { x.lineWidth = 5; for (let i = -128; i < 256; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 128, 128); x.stroke(); x.beginPath(); x.moveTo(i + 128, 0); x.lineTo(i, 128); x.stroke(); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return (T[k] = t); }
function caneMat(kind, rep, col) { const k = 'cm_' + kind + rep + (col || ''); if (M[k]) return M[k]; const t = weave(kind).clone(); t.needsUpdate = true; t.repeat.set(rep, rep * 0.5);
  return (M[k] = new THREE.MeshStandardMaterial({ color: col || 0xD9B27A, roughness: 0.95, alphaMap: t, alphaTest: 0.35, side: THREE.DoubleSide, emissive: col === 0xEFE6D6 ? 0x5A4630 : 0x3A2410, emissiveIntensity: 0.35 })); }
const BULB = () => mt('r_bulb', { color: 0xFFF2D6, emissive: 0xFFC27A, emissiveIntensity: 1.8 });
const GLOW = () => mt('r_lglow', { color: 0xFFD9A0, emissive: 0xFFB060, emissiveIntensity: 2.2, transparent: true, opacity: 0.75, depthWrite: false });   // inside the shade, night only
// shade profiles: [r, y] from the top (y = 0) down; 'p' = petals, 'f' = on the floor
const LT = {
  S4_01: { p: 'lotus', d: 1.9 }, S4_38: { p: 'leaf', d: 1.8 }, S4_15: { p: 'cut', d: 2 }, S4_37: { pr: [[0.12, 0], [0.4, -0.15], [0.62, -0.55], [0.75, -0.85]], sc: 6 }, S4_23: { p: 'ginkgo', d: 2 },
  S4_02: { pr: [[0.3, 0], [0.3, -0.35], [0.42, -0.35], [0.42, -0.75], [0.55, -0.75], [0.55, -1.2]], w: 'tight' }, S4_03: { pr: [[0.18, 0], [0.18, -0.25], [0.3, -0.25], [0.3, -0.5], [0.45, -0.5], [0.85, -1.0]], w: 'open' },
  S4_09: { pr: [[0.55, 0], [0.55, -0.55], [0.45, -0.55], [0.45, -0.95]], w: 'vert', col: 0xA4512E },
  S4_07: { pr: [[0.08, 0], [0.32, -0.3], [0.22, -0.55], [0.55, -0.85], [0.6, -1.2], [0.35, -1.45]], w: 'tight' },
  S4_08: { pr: gourd(0.6, 1.35) }, S4_13: { pr: [[0.1, 0], [0.35, -0.25], [0.45, -0.55], [0.8, -0.95], [0.75, -1.1], [0.4, -1.15]] }, S4_25: { pr: [[0.08, 0], [0.45, -0.3], [0.7, -0.75], [0.45, -1.15], [0.2, -1.3]] },
  S4_26: { pr: gourd(0.62, 1.4) }, S4_33: { pr: [[0.1, 0], [0.4, -0.3], [0.75, -0.9], [0.7, -1.25], [0.35, -1.4]] }, S4_41: { pr: [[0.1, 0], [0.45, -0.35], [0.62, -0.9], [0.5, -1.5], [0.25, -1.8]], w: 'vert' },
  S4_10: { pr: glob(0.7) }, S4_24: { pr: glob(0.75) }, S4_47: { pr: glob(0.9), w: 'vert' }, S4_49: { pr: glob(0.65), w: 'vert' },
  S4_11: { pr: egg(0.55, 1.6) }, S4_21: { pr: egg(0.5, 1.6) }, S4_29: { pr: egg(0.7, 1.9) },
  S4_12: { pr: [[0.1, 0], [0.35, -0.4], [0.8, -1.3]], w: 'open' }, S4_19: { pr: [[0.06, 0], [0.25, -0.6], [0.8, -1.3]] }, S4_28: { pr: [[0.12, 0], [0.4, -0.3], [0.6, -1.3]], w: 'vert' },
  S4_20: { pr: squat(0.95, 0.75), inner: 0.4 }, S4_34: { pr: squat(0.85, 0.7), w: 'open' }, S4_40: { pr: squat(0.85, 0.85), w: 'vert' }, S4_43: { pr: squat(0.9, 0.6) },
  S4_36: { pr: [[0.55, 0], [0.55, -0.9]], w: 'tight' },
  S4_04: { f: 1, pr: [[0.45, 0.75], [0.45, 0]], w: 'tight' }, S4_14: { pr: [[0.08, 0], [0.6, -0.08], [0.85, -0.25], [0.7, -0.42], [0.1, -0.48]], w: 'open' }, S4_18: { f: 1, pr: [[0.45, 2.0], [0.38, 0]], w: 'tight', col: 0xEFE6D6 }
};
function gourd(r, h) { return [[0.1, 0], [r * 0.6, -h * 0.2], [r, -h * 0.55], [r * 0.85, -h * 0.85], [r * 0.4, -h]]; }
function glob(r) { const p = []; for (let k = 1; k <= 11; k++) { const a = Math.PI / 2 - k / 12 * Math.PI; p.push([Math.max(0.06, Math.cos(a) * r), -r + Math.sin(a) * r]); } return [[0.06, 0]].concat(p); }
function egg(r, h) { const p = [[0.06, 0]]; for (let k = 1; k <= 10; k++) { const t = k / 11, a = Math.PI / 2 - t * Math.PI; p.push([Math.max(0.06, Math.cos(a) * r * (1 - 0.15 * Math.sin(a))), -h / 2 + Math.sin(a) * h / 2]); } return p; }
function squat(r, h) { const p = [[0.1, 0]]; for (let k = 1; k <= 9; k++) { const a = Math.PI / 2 - k / 10 * Math.PI; p.push([Math.max(0.1, Math.cos(a) * r), -h / 2 + Math.sin(a) * h / 2]); } p.push([0.3, -h]); return p; }
function ltKey(sku) { const m = /^S4-PRODUCT_(\d+)$/.exec(sku || ''); return m ? 'S4_' + m[1] : ''; }
function petals(g, kind, d) { const R = d / 2, mC = caneMat('fine', 2), mF = mt('r_cutfr', { color: 0x1E1D1C, metalness: 0.4 });
  const n = kind === 'leaf' ? 12 : kind === 'cut' ? 6 : 8, tiers = kind === 'leaf' ? 2 : 1;
  for (let t = 0; t < tiers; t++) for (let k = 0; k < n; k++) { const a = (k + t * 0.5) / n * Math.PI * 2, s = new THREE.Shape(), L = R * (t ? 0.75 : 1), Wp = L * (kind === 'leaf' ? 0.28 : 0.45);
    s.moveTo(0, 0); s.quadraticCurveTo(Wp, L * 0.45, 0, L); s.quadraticCurveTo(-Wp, L * 0.45, 0, 0);
    const p = new THREE.Mesh(new THREE.ShapeGeometry(s, 10), kind === 'cut' ? cutMat('dots', 1) : mC); const h = new THREE.Group(); h.rotation.y = -a; g.add(h); h.add(p);
    p.rotation.x = -(kind === 'lotus' ? 2.0 : kind === 'leaf' ? 2.1 - t * 0.3 : 1.85); p.position.y = -0.25 - t * 0.15; p.castShadow = true;
    if (kind === 'cut') { const e = new THREE.Mesh(new THREE.ShapeGeometry(s, 10), mC); e.scale.set(0.8, 0.8, 1); e.position.z = 0.01; p.add(e); } }
  const cone = new THREE.Mesh(new THREE.LatheGeometry([[0.12, 0], [0.28, -0.25], [0.32, -0.45]].map(q => new THREE.Vector2(q[0], q[1])), 20), caneMat('tight', 2)); g.add(cone); if (kind === 'cut') void mF; }
function ginkgo(g, d) { const R = d / 2, pts = []; for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push(new THREE.Vector2(0.1 + t * (R - 0.1), -0.1 - t * 0.35)); }
  const geo = new THREE.LatheGeometry(pts, 48), pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z), a = Math.atan2(z, x); pos.setY(i, pos.getY(i) + Math.sin(a * 6) * 0.12 * (r / R)); } geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, caneMat('fine', 3)); m.castShadow = true; g.add(m); }
// the shade alone (hanging point at y = 0) or a floor / table lamp (on y = 0)
export function lampShade(sku) {
  const g = new THREE.Group(), r = LT[ltKey(sku)] || LT.S4_10, nl = []; g.userData.nl = nl;
  if (r.p === 'ginkgo') ginkgo(g, r.d); else if (r.p) petals(g, r.p, r.d);
  else { const m = new THREE.Mesh(new THREE.LatheGeometry(r.pr.map(q => new THREE.Vector2(q[0], q[1])), 40), caneMat(r.w || 'fine', r.w === 'open' ? 3 : 5, r.col)); m.castShadow = true; g.add(m);
    if (r.sc) { for (let k = 0; k < r.sc; k++) { const a = k / r.sc * Math.PI * 2, s = new THREE.Mesh(new THREE.CircleGeometry(0.28, 14, 0, Math.PI), caneMat('fine', 2)); s.position.set(Math.cos(a) * 0.68, -0.85, Math.sin(a) * 0.68); s.rotation.set(Math.PI, -a + Math.PI / 2, 0); g.add(s); } }
    const ys = r.pr.map(q => q[1]), mid = (Math.max(...ys) + Math.min(...ys)) / 2, rm = Math.max(...r.pr.map(q => q[0]));
    if (r.inner) cy(g, r.inner, r.inner, 0.35, 0, mid, 0, mt('r_inner', { color: 0xFFF4E2, emissive: 0xFFC27A, emissiveIntensity: 0.8 }), 20);
    const gl = new THREE.Mesh(new THREE.SphereGeometry(rm * 0.82, 16, 10), GLOW()); gl.position.y = mid; gl.scale.y = Math.min(1.4, Math.abs(Math.max(...ys) - Math.min(...ys)) / (rm * 1.6)); g.add(gl); nl.push(gl); }
  const yb = r.f ? Math.max(...r.pr.map(q => q[1])) * 0.45 : r.p ? -0.35 : -0.45; const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), BULB()); b.position.y = yb; g.add(b);
  const h = halo(); h.scale.set(3, 3, 1); h.position.y = yb; g.add(h); nl.push(h);
  if (!r.f) cy(g, 0.012, 0.012, 0.9, 0, 0.45, 0, STEEL(), 4);   // the cord above it
  g.userData.floor = !!r.f; return g;
}
export const isLamp = sku => !!LT[ltKey(sku)];
// a lamp for Complete the look: a floor / table lamp as it is; a pendant on a black lamp stand (arm out to the front)
export function lampModel(sku, h) {
  const s = lampShade(sku), g = new THREE.Group(); g.userData.nl = s.userData.nl;
  if (s.userData.floor) { g.add(s); return g; }
  const H = Math.max(6, h || 7.5), m = STEEL(); cy(g, 0.6, 0.65, 0.08, 0, 0.04, -0.5, m, 24); cy(g, 0.05, 0.05, H, 0, H / 2, -0.5, m, 8); rod(g, [0, H - 0.05, -0.5], [0, H - 0.05, 0.6], 0.04, m);
  s.position.set(0, H - 0.95, 0.6); g.add(s); return g;
}
// ---------- the entry point ----------
export function rtsHas(sku) { return !!(FP[sku] || isLamp(sku)); }
export function rtsModel(sku, w, d, h) {
  if (isLamp(sku)) return lampModel(sku, h);
  const f = FP[sku]; if (!f) return null; const g = new THREE.Group(), nl = []; g.userData.nl = nl; f(g, nl);
  const D = DIM[sku]; if (D && w && d && h) g.scale.set(w / D[0], h / D[2], d / D[1]);
  g.traverse(o => { if (o.isMesh && o.material && o.material.emissive && o.material.emissiveIntensity > 1) o.castShadow = false; });
  return g;
}
