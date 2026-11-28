// outrr design studio — benches (307, owner: "bench ke 3D models bana lo"): all 23 outrr bench designs (MTO-BN-*) drawn live
// from their reference drawings, at the customer's number of seats (each seat ~2 ft). WPC slats, powder-coated MS frames,
// cement-board boxes / planters, granite tops — the same look as the drawings. Units: feet, y up; the sitting side faces +z.
import * as THREE from './vendor/three/three.module.min.js';
import { studioFloor, wall as sWall, person } from './studio3d.js?v=9';
import { plantModel } from './plants3d.js?v=4';

const M = {};
const mt = (k, o) => M[k] || (M[k] = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.75 }, o)));
const WPC = () => mt('wpc', { color: 0x7A4628, roughness: 0.62 }), MS = () => mt('ms', { color: 0x262626, roughness: 0.45, metalness: 0.35 });
const CB = () => mt('cb', { color: 0xCFC8BC, roughness: 0.92 }), GRN = () => mt('grn', { color: 0x2B2B2D, roughness: 0.25, metalness: 0.1 });
const SOIL = () => mt('soil', { color: 0x4A3424, roughness: 1 }), RIM = () => mt('rim', { color: 0x333333, roughness: 0.5 });
const MM = v => v / 304.8, SEAT = 2;   // one seat ≈ 600 mm
function bx(g, w, h, d, x, y, z, m, ry) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); if (ry) b.rotation.y = ry; b.castShadow = b.receiveShadow = true; g.add(b); return b; }
function rod(g, a, b, t, m) { const v = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = v.length(), r = new THREE.Mesh(new THREE.BoxGeometry(t, L, t), m);
  r.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); r.castShadow = true; g.add(r); return r; }
function grp(g, x, z, ry) { const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = ry || 0; g.add(s); return s; }

// a slatted WPC top, `len` along x, `dep` along z, its top at y
function slats(g, len, dep, y, x, z, m) { const n = Math.max(2, Math.round(dep / 0.47)), gap = 0.03, sw = (dep - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) bx(g, len, MM(25), sw, x, y - MM(12.5), z - dep / 2 + sw / 2 + i * (sw + gap), m || WPC()); }
// a box-tube leg frame across the depth: two posts, a top rail under the seat and a foot rail
function legFrame(g, x, z, dep, h, t) { t = t || MM(40); const m = MS(); [-1, 1].forEach(s => bx(g, t, h, t, x, h / 2, z + s * (dep / 2 - t / 2), m)); bx(g, t, t, dep, x, h - t / 2, z, m); bx(g, t, t, dep, x, t / 2, z, m); }
// a slatted backrest: posts behind the seat, 3 slats
function back(g, len, x, z, y0, h, posts) { const m = MS(); (posts || [-len / 2 + 0.1, len / 2 - 0.1]).forEach(px => bx(g, MM(40), h, MM(40), x + px, y0 + h / 2, z, m));
  for (let i = 0; i < 3; i++) bx(g, len, 0.32, MM(25), x, y0 + 0.5 + i * (h - 0.6) / 3 + 0.16, z + MM(30), WPC()); }
// a planter box: cement board, dark rim, soil and plants
function planter(g, w, h, d, x, z, ry, plants) { const s = grp(g, x, z, ry); bx(s, w, h, d, 0, h / 2, 0, CB()); const t = MM(30);
  bx(s, w, t, t, 0, h, -d / 2 + t / 2, RIM()); bx(s, w, t, t, 0, h, d / 2 - t / 2, RIM()); bx(s, t, t, d, -w / 2 + t / 2, h, 0, RIM()); bx(s, t, t, d, w / 2 - t / 2, h, 0, RIM());
  bx(s, w - 2 * t, 0.04, d - 2 * t, 0, h - 0.12, 0, SOIL());
  const n = plants == null ? Math.max(1, Math.round(w / 1.6)) : plants, kinds = ['SYNGONIUM', 'ZZ', 'MONEYPLANT', 'SYNGONIUM'];
  for (let i = 0; i < n; i++) { try { const p = plantModel(THREE, kinds[i % kinds.length], Math.min(1.5, 0.8 + d * 0.4), { seed: i + 3 }); p.position.set(-w / 2 + w * (i + 0.5) / n, h - 0.14, 0); p.scale.setScalar(Math.min(0.75, d / 1.6)); s.add(p); } catch (e) {} }
  return s; }
// a box seat (cement board) with a WPC top
function boxSeat(g, len, dep, h, x, z, ry, top) { const s = grp(g, x, z, ry); bx(s, len, h - MM(25), dep - 0.08, 0, (h - MM(25)) / 2, -0.04, CB()); slats(s, len, dep, h, 0, 0, top); return s; }

// a straight slat bench with box-tube legs (n seats), optional back
function frameBench(g, L, dep, h, opt) { opt = opt || {}; slats(g, L, dep, h, 0, 0); const nl = Math.max(2, Math.round(L / 3) + 1);
  for (let i = 0; i < nl; i++) legFrame(g, -L / 2 + 0.25 + (L - 0.5) * i / (nl - 1), 0, dep - 0.1, h - MM(25)); }
// segments along an arc (centre on +z side = concave towards the sitter when sgn = 1)
function arcBench(g, n, R, span, dep, h, opt) { opt = opt || {}; const a0 = -span / 2, seg = 2 * R * Math.sin(span / n / 2) + 0.02;
  for (let i = 0; i < n; i++) { const a = a0 + span * (i + 0.5) / n, x = Math.sin(a) * R, z = R - Math.cos(a) * R, s = grp(g, x, z, -a);
    if (opt.box) bx(s, seg, h - MM(25), dep - 0.1, 0, (h - MM(25)) / 2, 0, CB());
    slats(s, seg, dep, h, 0, 0); if (!opt.box) legFrame(s, -seg / 2 + 0.08, 0, dep - 0.1, h - MM(25));
    if (opt.back) back(s, seg - 0.02, 0, -dep / 2 - MM(30), h - 0.1, opt.back, [-seg / 2 + 0.06]);
    if (opt.planter) planter(s, seg, opt.planter, MM(450), 0, -dep / 2 - MM(240), 0, 1); }
  if (!opt.box) { const a = a0 + span, s = grp(g, Math.sin(a) * R, R - Math.cos(a) * R, -a); legFrame(s, -0.08, 0, dep - 0.1, h - MM(25)); }
  const xs = Math.sin(span / 2) * (R + dep), zz = R - Math.cos(span / 2) * (R + dep); return { L: 2 * Math.abs(xs) + dep, D: Math.max(dep, Math.abs(zz) + dep) };
}

// every design: build(g, n) → {L, D, H}; numbers from the drawings (mm → ft)
const H45 = MM(450);
const R = {
  'LS': (g, n) => { const L = n * SEAT, d = MM(470); frameBench(g, L, d, H45); return { L, D: d, H: H45 }; },
  'LB': (g, n) => { const L = n * SEAT, d = MM(470); frameBench(g, L, d, H45); back(g, L, 0, -d / 2 + MM(20), H45, MM(370)); return { L, D: d, H: MM(820) }; },
  'JB': (g, n) => { const L = n * SEAT, d = MM(470); frameBench(g, L, d, H45); const m = MS(), jm = jaaliMat(); [-L / 2 + 0.05, L / 2 - 0.05].forEach(x => bx(g, MM(40), MM(400), MM(40), x, H45 + MM(200), -d / 2 + MM(20), m));
    const np = Math.max(1, Math.round(L / 3)); for (let i = 0; i < np; i++) { const pw = (L - 0.15) / np; bx(g, pw - 0.06, MM(380), MM(6), -L / 2 + 0.08 + pw * (i + 0.5), H45 + MM(210), -d / 2 + MM(20), jm); }
    bx(g, L, MM(40), MM(40), 0, H45 + MM(400), -d / 2 + MM(20), m); return { L, D: d, H: MM(850) }; },
  'CF': (g, n) => { const L = n * SEAT, d = MM(470), t = MM(80), m = MS(); slats(g, L, d, H45, 0, 0);
    [-L / 2 + t / 2 + 0.05, L / 2 - t / 2 - 0.05].forEach(x => { bx(g, t, MM(40), d, x, H45 - MM(45), 0, m); bx(g, t, H45 - MM(40), MM(40), x, (H45 - MM(40)) / 2, -d / 2 + MM(20), m); bx(g, t, MM(40), d * 0.7, x, MM(20), -d * 0.15, m); });
    return { L, D: d, H: H45 }; },
  'PC': (g, n) => { const L = n * SEAT, d = MM(600), h = MM(405); bx(g, L * 0.72, h - MM(25), d * 0.55, 0, (h - MM(25)) / 2, 0, GRN()); slats(g, L, d, h, 0, 0); return { L, D: d, H: h }; },
  'GP': (g, n) => { const L = n * SEAT, d = MM(500); bx(g, L - 0.1, H45 - MM(30), d - 0.1, 0, (H45 - MM(30)) / 2, 0, CB()); bx(g, L + 0.1, MM(30), d + 0.1, 0, H45 - MM(15), 0, GRN()); return { L, D: d, H: H45 }; },
  'FW': (g, n) => { const L = n * SEAT, d = MM(450), h = MM(435); bx(g, L, MM(110), d, 0, h - MM(55), 0, CB()); slats(g, L, d, h + MM(25), 0, 0);
    const nb = Math.max(2, Math.round(L / 2.2)); for (let i = 0; i < nb; i++) bx(g, MM(30), MM(100), MM(60), -L / 2 + 0.3 + (L - 0.6) * i / (nb - 1), h + MM(70), -d / 2 + MM(30), MS());
    return { L, D: d, H: MM(470), wall: true }; },
  'WB': (g, n) => { const L = n * SEAT, d = MM(625), h = MM(420), bh = MM(905); boxSeat(g, L, d - MM(150), h, 0, MM(75), 0); bx(g, L, bh, MM(150), 0, bh / 2, -d / 2 + MM(75), CB()); slats(g, L, MM(200), bh + MM(25), 0, -d / 2 + MM(75));
    return { L, D: d, H: bh, wall: true }; },
  'PB': (g, n) => { const L = n * SEAT, d = MM(470), pd = MM(390), ph = MM(818); frameBench(g, L, d, H45); planter(g, L, ph, pd, 0, -d / 2 - pd / 2, 0); return { L, D: d + pd, H: ph, cz: -pd / 2 }; },
  'PE': (g, n) => { const L = n * SEAT, d = MM(450), pw = MM(500), ph = MM(668); frameBench(g, L, d, H45); planter(g, pw, ph, pw, -L / 2 - pw / 2, 0, 0, 1); planter(g, pw, ph, pw, L / 2 + pw / 2, 0, 0, 1); return { L: L + 2 * pw, D: pw, H: ph }; },
  'GR': (g, n) => { const L = n * SEAT, d = MM(520), pw = MM(560), ph = MM(668), m = MS(); bx(g, L, MM(40), d * 0.9, 0, H45 - MM(20), 0, GRN());
    [-L / 2 + 0.6, L / 2 - 0.6].forEach(x => legFrame(g, x, 0, d * 0.8, H45 - MM(40))); planter(g, pw, ph, pw, -L / 2 - pw / 2, 0, 0, 1); planter(g, pw, ph, pw, L / 2 + pw / 2, 0, 0, 1); return { L: L + 2 * pw, D: pw, H: ph }; },
  'CB': (g, n) => { const s = MM(1500) * Math.sqrt(n / 6), h = MM(420); bx(g, s - 0.06, h - MM(25), s - 0.06, 0, (h - MM(25)) / 2, 0, CB()); bx(g, 0.02, h - 0.12, 0.02, 0, (h - 0.12) / 2, s / 2 - 0.02, mt('cbj', { color: 0xB9B1A4 }));
    const np = Math.max(4, Math.round(s / 0.48)), pw = (s - 0.03 * (np - 1)) / np; for (let i = 0; i < np; i++) bx(g, pw, MM(25), s, -s / 2 + pw / 2 + i * (pw + 0.03), h - MM(12), 0, WPC()); return { L: s, D: s, H: h }; },
  'IP': (g, n) => { const L = n * SEAT / 2, sd = MM(450), pd = MM(600), h = MM(425); planter(g, L, MM(668), pd, 0, 0, 0); boxSeat(g, L, sd, h, 0, pd / 2 + sd / 2, 0); boxSeat(g, L, sd, h, 0, -pd / 2 - sd / 2, Math.PI);
    return { L, D: pd + 2 * sd, H: MM(668) }; },
  'LC': (g, n) => { const a = Math.max(2, n / 2) * SEAT, d = MM(470), h = MM(425), pw = MM(520); planter(g, pw, MM(668), pw, -pw / 2, -pw / 2, 0, 1);   // corner planter at (0,0) back-left; arms run +x and +z
    boxSeat(g, a, d, h, a / 2, -pw + d / 2, 0); boxSeat(g, a, d, h, -pw + d / 2, a / 2, -Math.PI / 2); const s = a + pw; g.position.set(-s / 2 + pw, 0, -s / 2 + pw); return { L: s, D: s, H: MM(668), center: true }; },
  'SP': (g, n) => { const L = Math.ceil(n / 2) * SEAT, d = MM(460), pw = MM(560); boxSeat(g, L, d, MM(425), -pw / 2, d / 2, 0); boxSeat(g, L, d, MM(918) - MM(25), -pw / 2, -d / 2, 0);
    planter(g, pw, MM(668), d, L / 2, d / 2, 0, 1); planter(g, pw, MM(918), d, L / 2, -d / 2, 0, 1); return { L: L + pw, D: 2 * d, H: MM(918) }; },
  'PS': (g, n) => { const L = Math.ceil(n / 2) * SEAT, tw = MM(760), sd = MM(300), gap = MM(170), m = MS(), ty = MM(765);
    slats(g, L, tw, ty, 0, 0); [1, -1].forEach(s => slats(g, L, sd, H45, 0, s * (tw / 2 + gap + sd / 2)));
    const za = tw / 2 + gap + sd;   // A-frames at both ends (and one in the middle on long sets)
    const fr = x => { [1, -1].forEach(s => rod(g, [x, 0, s * (za - 0.15)], [x, ty - MM(45), s * tw * 0.3], MM(55), m)); bx(g, MM(60), MM(40), 2 * za - 0.1, x, H45 - MM(45), 0, m); bx(g, MM(60), MM(40), tw, x, ty - MM(45), 0, m); };
    fr(-L / 2 + 0.4); fr(L / 2 - 0.4); if (L > 7) fr(0); return { L, D: 2 * za, H: ty }; },
  'AB': (g, n) => arcB(g, n, { back: MM(370) }, MM(1069) - MM(400), MM(820)),
  'AC': (g, n) => arcB(g, n, {}, MM(470), H45, 0.75),
  'CP': (g, n) => arcB(g, n, { planter: MM(818) }, MM(470), MM(818)),
  'SW': (g, n) => { const h1 = Math.ceil(n / 2), h2 = Math.max(1, n - h1), d = MM(470), sp = 0.95, R0 = h1 * SEAT / sp;
    const a = grp(g, -R0 * Math.sin(sp / 2) * 0.98, 0, 0); arcBench(a, h1, R0, sp, d, H45); const b = grp(g, R0 * Math.sin(sp / 2) * 0.98, (R0 - Math.cos(sp / 2) * R0) * 2, Math.PI); arcBench(b, h2, R0, sp, d, H45);
    return { L: 4 * R0 * Math.sin(sp / 2) + d, D: (R0 - Math.cos(sp / 2) * R0) * 2 + d, H: H45, tree: false }; },
  'HM': (g, n) => { const R0 = MM(1300) * Math.max(0.8, n / 5), span = Math.PI * 1.15, d = MM(500), bh = MM(975), segs = Math.max(4, n + 1);
    for (let i = 0; i < segs; i++) { const a = -span / 2 + span * (i + 0.5) / segs, sg = 2 * R0 * Math.sin(span / segs / 2) + 0.02, s = grp(g, Math.sin(a) * R0, -Math.cos(a) * R0, -a);
      boxSeat(s, sg, d, MM(425), 0, 0, 0); bx(s, sg, bh, MM(120), 0, bh / 2, -d / 2 - MM(60), CB()); bx(s, sg + 0.02, MM(25), MM(170), 0, bh + MM(12), -d / 2 - MM(60), WPC()); }
    return { L: 2 * (R0 + d) * Math.sin(Math.min(span / 2, Math.PI / 2)), D: R0 + d + MM(120), H: bh, cz: -R0 * 0.4 }; },
  'RT': (g, n) => { const Ro = MM(2116) / 2 * Math.max(1, n / 8), d = MM(470), Rm = Ro - d / 2, k = Math.max(6, n), m = MS();
    for (let i = 0; i < k; i++) { const a = (i + 0.5) / k * Math.PI * 2, s = grp(g, Math.sin(a) * Rm, Math.cos(a) * Rm, a + Math.PI), sg = 2 * (Rm + d * 0.25) * Math.tan(Math.PI / k) + 0.04;
      slats(s, sg, d, H45, 0, 0); legFrame(s, -sg / 2 + 0.1, 0, d - 0.1, H45 - MM(25)); }
    tree(g); return { L: 2 * Ro, D: 2 * Ro, H: H45, tree: true }; },
  'TS': (g, n) => { const S = MM(2120) * Math.max(1, n / 8), d = MM(470);
    for (let i = 0; i < 4; i++) { const s = grp(g, 0, 0, i * Math.PI / 2), arm = grp(s, 0, S / 2 - d / 2, 0), len = S - d; slats(arm, len, d, H45, -d / 2 + 0.0, 0); [-len / 2 + 0.2, len / 2 - d - 0.2].forEach(x => legFrame(arm, x, 0, d - 0.1, H45 - MM(25))); }
    tree(g); return { L: S, D: S, H: H45, tree: true }; },
};
function arcB(g, n, opt, d, H, spanK) { const span = Math.min(Math.PI * 0.75, n * 0.2) * (spanK || 1), R0 = (n * SEAT) / span; const s = grp(g, 0, -R0 * 0.5, 0); const r = arcBench(s, n, R0, span, d, H45, opt); return { L: r.L, D: r.D + (opt.planter ? MM(500) : 0), H }; }
function tree(g) { const t = mt('bark', { color: 0x6B5644, roughness: 1 }), c = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 9, 16), t); c.position.y = 4.5; c.castShadow = true; g.add(c);
  const lf = mt('leaf', { color: 0x4E6B3A, roughness: 0.9 }); [[0, 10.5, 0, 3.4], [1.8, 9.6, 0.6, 2.4], [-1.6, 9.8, -0.8, 2.6], [0.4, 9.4, -1.9, 2.2]].forEach(([x, y, z, r]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), lf); s.position.set(x, y, z); s.castShadow = true; g.add(s); }); }
let JM = null;
function jaaliMat() { if (JM) return JM; const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d'); c.fillStyle = '#000'; c.fillRect(0, 0, 128, 128); c.fillStyle = '#fff';
  for (let y = 0; y < 128; y += 32) for (let x = 0; x < 128; x += 32) { c.beginPath(); c.ellipse(x + 16, y + 16, 9, 13, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(x, y, 4, 4, 0, 0, Math.PI * 2); c.fill(); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1);
  JM = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.3, alphaMap: t, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }); return JM; }

export const BN_CODES = Object.keys(R);
export function benchCode(sku) { const m = /^MTO-BN-([A-Z]{2})/.exec(sku || ''); return m && R[m[1]] ? m[1] : null; }
// the bench alone, centred on its footprint (sitting side +z); n = seats
export function benchModel(code, n) {
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner); const f = R[code] || R.LS, r = f(inner, Math.max(1, +n || 3)) || {};
  const b = new THREE.Box3().setFromObject(inner), tr = r.tree;
  if (!r.center && isFinite(b.min.x)) { const cx = tr ? 0 : (b.min.x + b.max.x) / 2, cz = tr ? 0 : (b.min.z + b.max.z) / 2; inner.position.x -= cx; inner.position.z -= cz; }
  const b2 = new THREE.Box3().setFromObject(inner); let L = b2.max.x - b2.min.x, D = b2.max.z - b2.min.z; if (tr) { L = r.L; D = r.D; }
  return { g, L, D, H: r.H || 3, wall: !!r.wall, tree: !!tr };
}
// the studio: grey tiles, a wall behind the wall-fixed ones, a person for scale
export function benchStudio(sp) {
  const S = new THREE.Group(), B = benchModel(sp.code, sp.n); S.add(B.g);
  const W = Math.max(B.L + 8, 14), z0 = -B.D / 2 - (B.wall ? 0 : 4);
  if (B.wall) sWall(S, -W / 2, -B.D / 2 - 0.375, W / 2, -B.D / 2 - 0.375, 6.5, 0.75);
  studioFloor(S, -W / 2, z0 - (B.wall ? 0.4 : 0), W, B.D / 2 + 9 - z0);
  person(S, Math.min(B.L / 2 + 2.2, W / 2 - 1), Math.max(-B.D / 2 + 0.6, -1), -0.4);
  return { g: S, L: B.L, D: B.D, H: Math.max(B.H, B.tree ? 6 : 0), span: Math.max(B.L + 5, B.D + 5, 12) };
}
