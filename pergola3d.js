// outrr pergola in 3D — the customer's own size, clear height, finish, roof covering and layout, drawn live (three.js).
// One model builder for every design in mto/pergolas: each design (by SKU) is a short recipe — posts, legs, roof — below.
// Units are feet; x runs along the length, z along the width (front = z max), y is up.
import * as THREE from './vendor/three/three.module.min.js';
import { OrbitControls } from './vendor/three/OrbitControls.js';
import { RoomEnvironment } from './vendor/three/RoomEnvironment.js';
import { plotModel } from './cabin3d.js?v=104';
import { studioFloor, person } from './studio3d.js?v=7';   // 283: the design studio setting (shared with every designer)

const MM = v => v / 304.8;   // mm → ft
// design recipes: post = SHS size (mm); roof: flat | tiers | gable | xgable | hip | barrel | wave | louvre | grid | float;
// leg: straight | aframe | lean | knee | ladder | twin | branch | pillar | mast | portal | gate | sidetwin; raf = rafter (w × h mm), gap = rafter spacing (mm)
const D = {
  'MTO-PG-AF': { leg: 'aframe', flush: true, over: 0, bover: 0, raf: [40, 120], gap: 200 },
  'MTO-PG-AL': { roof: 'louvre', over: 150 },
  'MTO-PG-BR': { leg: 'branch', post: 125, flush: true, over: 0, bover: 0, raf: [40, 100], gap: 120 },
  'MTO-PG-CA': { roof: 'barrel' },
  'MTO-PG-EG': { roof: 'grid', post: 125, flush: true, over: 0, bover: 0, raf: [40, 150], gap: 400 },
  'MTO-PG-FP': { leg: 'gate', flush: true, over: 0, bover: 0, raf: [40, 100], gap: 120 },
  'MTO-PG-FR': { roof: 'float', raf: [40, 100], gap: 120 },
  'MTO-PG-GB': { roof: 'gable' },
  'MTO-PG-HP': { roof: 'hip', post: 125 },
  'MTO-PG-IP': { post: 125, inset: 600, over: 600 },
  'MTO-PG-KB': { leg: 'knee', post: 125, over: 450, raf: [40, 120], gap: 150 },
  'MTO-PG-LD': { leg: 'ladder', post: 80, raf: [40, 120], gap: 130 },
  'MTO-PG-LP': { leg: 'lean', flush: true, over: 0, bover: 0, raf: [40, 100], gap: 120 },
  'MTO-PG-OV': { over: 300, bover: 300, raf: [40, 120], gap: 150 },
  'MTO-PG-PA': { post: 200, beam: [200, 200], over: 0, bover: 0, raf: [40, 150], gap: 150, flush: true },
  'MTO-PG-PB': { leg: 'pillar', raf: [40, 120], gap: 150 },
  'MTO-PG-PF': { leg: 'portal', post: 150, flush: true, over: 0, bover: 0, raf: [40, 100], gap: 120 },
  'MTO-PG-RH': { groups: 3, gap: 120, raf: [40, 120] },
  'MTO-PG-SO': { leg: 'sidetwin', flush: true, over: 0, bover: 0, beam: [100, 250], raf: [40, 100], gap: 150 },   // box frame, close slats inside it; the right end on twin posts with a double end beam
  'MTO-PG-TP': { leg: 'mast', flush: true, over: 0, bover: 0, raf: [40, 100], gap: 120 },
  'MTO-PG-TT': { roof: 'tiers', raf: [40, 120], gap: 150 },
  'MTO-PG-TW': { leg: 'twin', post: 90, raf: [50, 150], gap: 280 },
  'MTO-PG-WC': { post: 200, beam: [100, 300], flush: true, over: 0, bover: 0, raf: [40, 100], gap: 150, clad: true },
  'MTO-PG-WV': { roof: 'wave' },
  'MTO-PG-XG': { roof: 'xgable', post: 125 },
};
const FIN = { black: 0x2a2a2a, grey: 0x7b7e82, white: 0xf1f1ec, brown: 0x5b3c2a, wood: 0x5e3a22 };
const M = {};
function mat(key, o) { if (M[key]) return M[key]; return (M[key] = o.phys ? new THREE.MeshPhysicalMaterial(o.phys) : new THREE.MeshStandardMaterial(o)); }
function finish(o) {   // frame + roof members from the chosen finish ("Black + Wood" = black frame, wood rafters; "Wooden" = all wood)
  const c = String(o.colour || '').toLowerCase(), mtl = String(o.material || '').toLowerCase();
  const base = /grey|gray/.test(c) ? 'grey' : /white/.test(c) ? 'white' : /brown/.test(c) ? 'brown' : /black/.test(c) ? 'black' : 'black';
  const allWood = /^wood|wooden|teak/.test(c) || /full wood|wpc clad/.test(mtl), mix = /\+\s*wood/.test(c) || /wood-look roof/.test(mtl);
  const m = n => mat('f' + n, { color: FIN[n], roughness: n === 'wood' ? 0.65 : 0.45, metalness: n === 'wood' ? 0 : 0.25 });
  return { frame: allWood ? m('wood') : m(base), roof: allWood || mix ? m('wood') : m(base) };
}
const S = () => ({
  ground: mat('ground', { color: 0xdcd6c8, roughness: 1 }), grass: mat('grass', { color: 0x93ab70, roughness: 1 }), deck: mat('deck', { color: 0xbcae98, roughness: 0.9 }),
  stone: mat('stone', { color: 0x9c968c, roughness: 0.95 }), wall: mat('wall', { color: 0xe9e4da, roughness: 0.9 }),
  poly: mat('poly', { phys: { color: 0xe7c48f, roughness: 0.35, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false } }),
  glass: mat('glass', { phys: { color: 0xbfdce6, roughness: 0.05, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false } }),
  led: mat('led', { color: 0x3a3a3a, emissive: 0xffd99a, emissiveIntensity: 0 }),
});

function box(g, w, h, d, x, y, z, m) { const b = new THREE.Mesh(new THREE.BoxGeometry(Math.max(w, 0.01), Math.max(h, 0.01), Math.max(d, 0.01)), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; g.add(b); return b; }
function rod(g, a, b, w, d, m) {   // a square member from point a to point b
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B), mesh = new THREE.Mesh(new THREE.BoxGeometry(w, len, d), m);
  mesh.position.copy(A).add(B).multiplyScalar(0.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh;
}

function build(sku, o, bare) {   // 192: bare = the pergola alone (space planner)
  const r = D[sku] || {}, F = finish(o), X = S(), g = new THREE.Group();
  const L = Math.max(6, +o.l || 12), W = Math.max(6, +o.w || 10), H = Math.max(7, parseFloat(o.height) || 8);
  const P = MM(r.post || 100), BH = MM((r.beam || [100, 200])[1]), BW = MM((r.beam || [100, 200])[0]), RW = MM((r.raf || [50, 150])[0]), RH = MM((r.raf || [50, 150])[1]);
  const over = MM(r.over ?? 450), bover = MM(r.bover ?? 300), inset = MM(r.inset || 0), gap = MM(r.gap || 450);
  const lay = String(o.layout || '').toLowerCase(), wall = /wall/.test(lay), dbl = /double/.test(lay), lsh = /l-shape/.test(lay);
  // ground, a terrace floor, a back wall when wall-mounted
  if (!bare) { box(g, L + 16, 0.1, W + 16, L / 2, -0.05, W / 2, X.ground); box(g, L + 4, 0.12, W + 4, L / 2, 0.01, W / 2, X.deck); }
  if (wall && !bare) box(g, L + 4, H + 3, 0.6, L / 2, (H + 3) / 2, -0.3 - P / 2, X.wall);
  // 193d: posts no more than 14 ft apart — a long side gets posts in between so the main frame doesn't sag
  const SPAN = 14, spread = (a, b, minN) => { const n = Math.max(minN, Math.ceil((b - a) / SPAN - 0.001)); return Array.from({ length: n + 1 }, (_, k) => a + (b - a) * k / n); };
  const top = H, rows = wall ? [W - inset - P / 2] : spread(inset + P / 2, W - inset - P / 2, 1);
  const cols = spread(inset + P / 2, L - inset - P / 2, dbl ? 2 : 1);
  const edge = (x, z) => x === cols[0] || x === cols[cols.length - 1] || z === rows[0] || z === rows[rows.length - 1] || W > 20;   // inner posts only on a deep pergola
  const post = (x, z, h = top, s = P) => { const m = box(g, s, h, s, x, h / 2, z, F.frame); m.userData.post = 1; return m; };
  const leg = r.leg || 'straight';
  // ---- posts / legs
  for (const x of cols) for (const z of rows) {
    if (!edge(x, z)) continue;
    if (leg === 'lean') { const k = Math.tan(10 * Math.PI / 180) * top, dx = x < L / 2 ? 1 : x > L / 2 ? -1 : 0, dz = z < W / 2 ? 1 : -1; rod(g, [x - dx * k, 0, z - dz * k], [x, top, z], P, P, F.frame); continue; }   // feet splay out
    if (leg === 'aframe') { if (z !== rows[0] && z !== rows[rows.length - 1]) continue; const dz = z < W / 2 ? -1 : 1; rod(g, [x, 0, z + dz * 1.8], [x, top, z], P, P, F.frame); continue; }   // each leg splays out to the front / back: the side faces read as an A
    if (leg === 'ladder') { const s = MM(220) / 2; [-s, s].forEach(d => post(x + d, z)); for (let k = 1; k <= 4; k++) box(g, 2 * s, MM(40), MM(40), x, top * k / 5, z, F.frame); continue; }
    if (leg === 'twin') { const s = MM(130); [-s, s].forEach(d => post(x + d, z)); continue; }   // two posts side by side with a gap, along the front / back face
    if (leg === 'branch') continue;
    if (leg === 'pillar') { box(g, 1.6, 3, 1.6, x, 1.5, z, X.stone); box(g, P, top - 3, P, x, 3 + (top - 3) / 2, z, F.frame); continue; }
    if (leg === 'mast') { post(x, z, top + BH + RH + 2.3); box(g, P + 0.15, 0.12, P + 0.15, x, top + BH + RH + 2.36, z, F.frame); continue; }
    if (leg === 'portal' && (x === cols[0] || x === cols[cols.length - 1])) { post(x, z, top + BH + RH + 1.5); continue; }
    if (leg === 'gate' && x === cols[cols.length - 1]) { post(x, z, top + BH + 2.5, MM(150)); continue; }
    if (r.clad) { box(g, P, top, P, x, top / 2, z, mat('fwood', { color: FIN.wood, roughness: 0.65, metalness: 0 })).userData.post = 1; continue; }   // wood-clad posts (the frame finish stays on the beams)
    post(x, z, r.roof === 'float' ? top - 0.8 : top);
    if (leg === 'knee') { const b = 2; rod(g, [x, top - b, z], [x + (x < L / 2 ? b : -b), top, z], MM(60), MM(60), F.frame); rod(g, [x, top - b, z], [x, top, z + (z < W / 2 ? b : -b)], MM(60), MM(60), F.frame); }
    if (leg === 'sidetwin' && x === cols[cols.length - 1]) post(x - 1.4, z);   // the right end only: a second post 1.4 ft in from each corner
  }
  if (leg === 'branch') [L * 0.27, L * 0.73].forEach(x => { const z = W / 2, y0 = top - 3.2; post(x, z, y0);
    [[x - 2.6, z], [x + 2.6, z], [x, rows[0]], [x, rows[rows.length - 1]]].forEach(([a, b]) => rod(g, [x, y0, z], [a, top, b], P * 0.8, P * 0.8, F.frame)); });
  if (leg === 'aframe' && rows.length > 1) cols.forEach(x => box(g, MM(60), MM(60), rows[rows.length - 1] - rows[0] + 2 * 1.8 * (1 - 2.6 / top), x, 2.6, W / 2, F.frame));   // tie bar on each side
  if (leg === 'portal') [cols[0], cols[cols.length - 1]].forEach(x => box(g, P, P, W - 2 * inset, x, top + BH + RH + 1.5 - P / 2, W / 2, F.frame));
  if (leg === 'gate') { const s = MM(150), x = cols[cols.length - 1]; box(g, s, s, rows[rows.length - 1] - rows[0] + s, x, top + BH + 2.5 - s / 2, W / 2, F.frame); }
  if (r.roof === 'float') for (const x of cols) for (const z of rows) box(g, MM(50), 0.8, MM(50), x, top - 0.4, z, F.frame);
  // ---- main beams along the length (front / back), a ledger on the wall
  const y0 = top, eL = -bover + inset, eR = L + bover - inset;
  const beamAt = (z, y = y0) => box(g, eR - eL, BH, BW, (eL + eR) / 2, y + BH / 2, z, F.frame);
  // LED profile under the inside face of each beam
  const led = (z, y = y0) => box(g, eR - eL - 1, MM(20), MM(30), L / 2, y - MM(10), z + (z < W / 2 ? BW / 2 : -BW / 2), X.led);
  const ry = y0 + BH, R0 = wall ? -P / 2 : -over + inset, R1 = W + over - inset;
  const rafters = (yAt, z0 = R0, z1 = R1, m = F.roof) => {   // rafters across the width, spaced along the length
    const n = Math.max(2, Math.round((L + 2 * bover) / (gap + RW))), list = [];
    for (let i = 0; i <= n; i++) { if (r.groups && i % (r.groups + 1) === r.groups) continue; const x = eL + (eR - eL) * i / n; list.push(x); }
    list.forEach(x => box(g, RW, RH, z1 - z0, x, yAt(x) + RH / 2, (z0 + z1) / 2, m));
    return list;
  };
  const cover = (y, z0 = R0, z1 = R1, x0 = eL, x1 = eR) => {   // the roof covering the customer picked
    const c = String(o.cover || '').toLowerCase();
    if (/poly/.test(c)) box(g, x1 - x0, MM(6), z1 - z0, (x0 + x1) / 2, y + MM(3), (z0 + z1) / 2, X.poly);
    else if (/glass/.test(c)) box(g, x1 - x0, MM(12), z1 - z0, (x0 + x1) / 2, y + MM(6), (z0 + z1) / 2, X.glass);
    else if (/louv/.test(c)) for (let x = x0 + 0.3; x < x1; x += 0.55) louv(x, y, z0, z1);
  };
  const coverCurve = (yy, seg) => {   // glass / polycarbonate follows a curved roof, strip by strip
    const c = String(o.cover || '').toLowerCase(), m = /poly/.test(c) ? X.poly : /glass/.test(c) ? X.glass : null; if (!m) return;
    for (let k = 0; k < seg; k++) { const t0 = k / seg, t1 = (k + 1) / seg, a = [L / 2, yy(t0) + RH, R0 + (R1 - R0) * t0], b = [L / 2, yy(t1) + RH, R0 + (R1 - R0) * t1];
      const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), mesh = new THREE.Mesh(new THREE.BoxGeometry(eR - eL, MM(10), A.distanceTo(B)), m);
      mesh.position.copy(A).add(B).multiplyScalar(0.5); mesh.rotation.x = -Math.atan2(B.y - A.y, B.z - A.z); g.add(mesh); }
  };
  const louv = (x, y, z0, z1) => { const s = new THREE.Mesh(new THREE.BoxGeometry(MM(180), MM(10), z1 - z0), F.roof); s.position.set(x, y + MM(90), (z0 + z1) / 2); s.rotation.z = Math.PI / 4; s.castShadow = true; g.add(s); return false; };
  const roof = r.roof || 'flat';
  if (roof === 'tiers') {   // front half low, back half 450 higher
    const zm = W / 2, up = MM(600);
    beamAt(rows[rows.length - 1]); beamAt(zm, y0); beamAt(zm, y0 + up + BH); beamAt(rows[0], y0 + up + BH);
    for (const x of cols) { post(x, zm, y0 + up + BH); box(g, P, up + BH, P, x, y0 + (up + BH) / 2, rows[0], F.frame); }
    led(rows[rows.length - 1]); led(rows[0], y0 + up + BH);
    rafters(() => ry, zm - 0.6, R1); rafters(() => ry + up + BH, R0, zm + 0.6); cover(ry + RH, zm, R1); cover(ry + up + BH + RH, R0, zm);
  } else if (roof === 'gable' || roof === 'xgable' || roof === 'hip') {
    rows.forEach(z => beamAt(z)); cols.forEach(x => box(g, BW, BH, W - 2 * inset, x, y0 + BH / 2, W / 2, F.frame)); rows.forEach(z => led(z));
    const rise = W * 0.32, ridge = [ry + rise, W / 2], n = Math.max(3, Math.round(L / 1.6));
    box(g, (roof === 'hip' ? L - W : L + 2 * bover) || 0.3, BH, BW, L / 2, ridge[0] + BH / 2, W / 2, F.frame);
    for (let i = 0; i <= n; i++) { const x = eL + (eR - eL) * i / n, inn = roof === 'hip' ? Math.max(W / 2, Math.min(L - W / 2, x)) : x;
      rod(g, [x, ry, R0], [inn, ridge[0], W / 2], RW, RH, F.roof); rod(g, [x, ry, R1], [inn, ridge[0], W / 2], RW, RH, F.roof); }
    { const c = String(o.cover || '').toLowerCase(), m = /poly/.test(c) ? X.poly : /glass/.test(c) ? X.glass : null;
      if (m && roof !== 'hip') [[R0, W / 2], [R1, W / 2]].forEach(([za, zb]) => { const A = new THREE.Vector3(L / 2, ry + RH, za), B = new THREE.Vector3(L / 2, ridge[0] + RH, zb), mesh = new THREE.Mesh(new THREE.BoxGeometry(eR - eL, MM(10), A.distanceTo(B)), m);
        mesh.position.copy(A).add(B).multiplyScalar(0.5); mesh.rotation.x = -Math.atan2(B.y - A.y, B.z - A.z); g.add(mesh); }); }
    if (roof === 'hip') { const m2 = Math.max(3, Math.round(W / 1.6)); for (let i = 0; i <= m2; i++) { const z = R0 + (R1 - R0) * i / m2; rod(g, [eL, ry, z], [W / 2, ridge[0], W / 2], RW, RH, F.roof); rod(g, [eR, ry, z], [L - W / 2, ridge[0], W / 2], RW, RH, F.roof); } }
    if (roof === 'xgable') { const m2 = Math.max(3, Math.round(W / 1.6)); box(g, BW, BH, W + 2 * over, L / 2, ridge[0] + BH / 2, W / 2, F.frame);
      for (let i = 0; i <= m2; i++) { const z = R0 + (R1 - R0) * i / m2; rod(g, [L / 2 - rise * 1.6, ry, z], [L / 2, ridge[0], z], RW, RH, F.roof); rod(g, [L / 2 + rise * 1.6, ry, z], [L / 2, ridge[0], z], RW, RH, F.roof); } }
  } else if (roof === 'barrel') {
    rows.forEach(z => { beamAt(z); led(z); }); const n = Math.max(3, Math.round(L / 1.4)), rise = W * 0.22, seg = 10;
    for (let i = 0; i <= n; i++) { const x = eL + (eR - eL) * i / n; for (let k = 0; k < seg; k++) { const t0 = k / seg, t1 = (k + 1) / seg, z0 = R0 + (R1 - R0) * t0, z1 = R0 + (R1 - R0) * t1;
      rod(g, [x, ry + Math.sin(Math.PI * t0) * rise, z0], [x, ry + Math.sin(Math.PI * t1) * rise, z1], RW, RH, F.roof); } }
    for (let k = 1; k < 4; k++) { const t = k / 4, z = R0 + (R1 - R0) * t; box(g, eR - eL, MM(40), MM(40), L / 2, ry + Math.sin(Math.PI * t) * rise + RH, z, F.roof); }
    coverCurve(t => ry + Math.sin(Math.PI * t) * rise, 16);
  } else if (roof === 'wave') {   // wave members run along the length, rising and falling ~2½ times (the front face shows the waves), on cross rafters
    rows.forEach(z => { beamAt(z); led(z); }); const amp = 0.75, nw = Math.max(1.5, Math.round(L / 5) + 0.5), seg = 40, yy = t => ry + RH + amp * (1 - Math.cos(Math.PI * 2 * nw * t)) / 2;
    [eL + 0.2, (eL + eR) / 2, eR - 0.2].forEach(x => box(g, RW, RH, R1 - R0, x, ry + RH / 2, (R0 + R1) / 2, F.roof));
    const nz = Math.max(4, Math.round((R1 - R0) / 1.1)); for (let j = 0; j <= nz; j++) { const z = R0 + (R1 - R0) * j / nz;
      for (let k = 0; k < seg; k++) { const t0 = k / seg, t1 = (k + 1) / seg; rod(g, [eL + (eR - eL) * t0, yy(t0), z], [eL + (eR - eL) * t1, yy(t1), z], MM(40), MM(40), F.roof); } }
    { const c = String(o.cover || '').toLowerCase(), m = /poly/.test(c) ? X.poly : /glass/.test(c) ? X.glass : null; if (m) for (let k = 0; k < seg; k++) { const t0 = k / seg, t1 = (k + 1) / seg, A = new THREE.Vector3(eL + (eR - eL) * t0, yy(t0) + MM(25), (R0 + R1) / 2), B = new THREE.Vector3(eL + (eR - eL) * t1, yy(t1) + MM(25), (R0 + R1) / 2), mesh = new THREE.Mesh(new THREE.BoxGeometry(A.distanceTo(B), MM(10), R1 - R0), m);
      mesh.position.copy(A).add(B).multiplyScalar(0.5); mesh.rotation.z = Math.atan2(B.y - A.y, B.x - A.x); g.add(mesh); } }
  } else if (roof === 'louvre') {
    rows.forEach(z => { beamAt(z); led(z); }); cols.forEach(x => box(g, BW, BH, W - 2 * inset, x, y0 + BH / 2, W / 2, F.frame));
    for (let x = eL + 0.35; x < eR; x += 0.62) { const s2 = new THREE.Mesh(new THREE.BoxGeometry(MM(230), MM(14), R1 - R0), F.roof); s2.position.set(x, ry + MM(60), (R0 + R1) / 2); s2.rotation.z = 0.62; s2.castShadow = true; g.add(s2); }
  } else if (roof === 'grid' && r.flush) {   // an egg-crate grid set inside a box frame, flush
    rows.forEach(z => { beamAt(z); led(z); }); [eL, eR].forEach(x => box(g, BW, BH, W - 2 * inset, x, y0 + BH / 2, W / 2, F.frame));
    const yy = y0 + (BH - RH) / 2, z0 = wall ? -P / 2 + BW : rows[0], z1 = rows[rows.length - 1]; rafters(() => yy, z0, z1);
    for (let z = z0 + gap; z < z1 - 0.1; z += gap + RW) box(g, eR - eL, RH, RW, L / 2, yy + RH / 2, z, F.roof); cover(y0 + BH, z0, z1);
  } else if (roof === 'grid') {
    rows.forEach(z => { beamAt(z); led(z); }); rafters(() => ry); for (let z = R0; z <= R1 + 0.01; z += gap + RW) box(g, eR - eL, RH, RW, L / 2, ry + RH / 2, z, F.roof); cover(ry + RH);
  } else if (roof === 'float') {
    const fy = top + 0.8 - BH; [R0, R1].forEach(z => box(g, eR - eL, BH, BW, L / 2, fy + BH / 2, z, F.frame)); [eL, eR].forEach(x => box(g, BW, BH, R1 - R0, x, fy + BH / 2, W / 2, F.frame));
    rows.forEach(z => led(z, fy)); rafters(() => fy + BH - RH, R0, R1); cover(fy + BH);
  } else {   // flat (most designs)
    rows.forEach(z => { if (leg === 'twin' && !wall) [-1, 1].forEach(sg => beamAt(z + sg * (P / 2 + BW / 2))); else beamAt(z); led(z); });
    if (r.flush) { const fz0 = wall ? -P / 2 + BW : rows[0]; [eL, eR].forEach(x => box(g, BW, BH, W - 2 * inset + (wall ? P / 2 : 0), x, y0 + BH / 2, W / 2 - (wall ? P / 4 : 0), F.frame)); rafters(() => y0 + (BH - RH) / 2, fz0, rows[rows.length - 1]); cover(y0 + BH, fz0, rows[rows.length - 1]); }
    else { rafters(() => ry); if (r.clad) [R0, R1].forEach(z => box(g, eR - eL, MM(300), MM(40), L / 2, ry + MM(150), z, F.roof)); cover(ry + RH); }
  }
  if (leg === 'sidetwin') box(g, BW, BH, W - 2 * inset, cols[cols.length - 1] - 1.4, y0 + BH / 2, W / 2, F.frame);   // the double end beam over the twin posts
  if (wall) box(g, eR - eL, BH, BW, (eL + eR) / 2, y0 + BH / 2, -P / 2 + BW / 2, F.frame);   // ledger fixed to the wall
  if (lsh) {   // L-shape: a second bay in front of the right part, its own posts + frame, the same roof
    const ex = Math.min(8, W * 0.8), ew = Math.min(8, L * 0.6), xa = L - inset - ew, xb = L - inset, zf = W + ex - P / 2, yb = r.flush ? y0 : y0;
    [[xa + P / 2, zf], [xb - P / 2, zf]].forEach(([x, z]) => post(x, z));
    box(g, ew, BH, BW, (xa + xb) / 2, yb + BH / 2, zf, F.frame);   // front beam
    [xa + P / 2, xb - P / 2].forEach(x => box(g, BW, BH, ex, x, yb + BH / 2, W + ex / 2 - P / 2, F.frame));   // side beams back to the main frame
    const n = Math.max(2, Math.round(ew / (gap + RW))), ys = r.flush ? y0 + (BH - RH) / 2 : ry, z0 = W - P / 2, z1 = r.flush ? zf : zf + (r.over === 0 ? 0 : over);
    for (let i = 0; i <= n; i++) { const x = xa + P / 2 + (ew - P) * i / n; box(g, RW, RH, z1 - z0, x, ys + RH / 2, (z0 + z1) / 2, F.roof); }
    cover(r.flush ? y0 + BH : ry + RH, z0, z1, xa, xb);
  }
  // add-ons the customer picked (o.addons: names; o.aside: {name: [sides]} for gutter / curtains / hooks)
  const ADN = (o.addons || []).map(String), zF = rows[rows.length - 1], zB = wall ? -P / 2 : rows[0], xL = cols[0], xR = cols[cols.length - 1];
  const sidesOf = (re, def) => { const n = ADN.find(x => re.test(x.toLowerCase())); if (!n) return []; const s0 = ((o.aside || {})[n] || def).filter(sd => !(wall && sd === 'back')); return s0.length ? s0 : def; };
  const EDGE = { front: { ax: 'x', at: zF + BW / 2, a0: eL, a1: eR, out: 1 }, back: { ax: 'x', at: zB - BW / 2, a0: eL, a1: eR, out: -1 }, left: { ax: 'z', at: xL - P / 2, a0: zB, a1: zF, out: -1 }, right: { ax: 'z', at: xR + P / 2, a0: zB, a1: zF, out: 1 } };
  const along = (e, len, h, thick, u, y, off, m) => e.ax === 'x' ? box(g, len, h, thick, u, y, e.at + e.out * off, m) : box(g, thick, h, len, e.at + e.out * off, y, u, m);
  const metal = mat('steel', { color: 0xb9bcc0, roughness: 0.35, metalness: 0.8 });
  sidesOf(/gutter/, ['front']).forEach(sd => { const e = EDGE[sd], mid = (e.a0 + e.a1) / 2, ln = e.a1 - e.a0; along(e, ln, MM(110), MM(120), mid, y0 + BH - MM(55), MM(60), F.frame);
    along(e, MM(75), y0 + BH, MM(75), e.a1 - MM(40), (y0 + BH) / 2, MM(60), F.frame); });   // gutter + downpipe at one end
  const cs = sidesOf(/curtain/, wall ? ['front', 'left'] : ['front', 'back']);
  if (cs.length) { const cm = mat('curt', { color: 0xEDE4D3, roughness: 1, side: THREE.DoubleSide }), hh = y0 - 0.1;
    cs.forEach(sd => { const e = EDGE[sd], ln = e.a1 - e.a0; along(e, ln, MM(25), MM(25), (e.a0 + e.a1) / 2, hh, MM(40), metal);   // rod
      [e.a0 + 0.9, e.a1 - 0.9].forEach(u => { for (let k = 0; k < 5; k++) along(e, 0.28, hh - 0.1, MM(20), u + (k - 2) * 0.27, (hh - 0.1) / 2 + 0.1, MM(40) + (k % 2) * 0.12, cm); }); }); }   // gathered at the posts
  sidesOf(/swing/, ['front']).forEach(sd => { const e = EDGE[sd], mid = (e.a0 + e.a1) / 2; [mid - 1.6, mid + 1.6].forEach(u => { const p0 = e.ax === 'x' ? [u, e.at - e.out * BW] : [e.at - e.out * BW, u];
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 8, 20), metal); t.position.set(p0[0], y0 - 0.2, p0[1]); if (e.ax === 'z') t.rotation.y = Math.PI / 2; g.add(t); box(g, MM(30), 0.12, MM(30), p0[0], y0 - 0.06, p0[1], metal); }); });
  const ph = sidesOf(/planter hook/, ['front']);
  if (ph.length) { const pot = mat('pot', { color: 0xB0603E, roughness: 0.9 }), leaf = mat('leaf', { color: 0x4E7A3A, roughness: 1 }), per = Math.max(1, Math.round(4 / ph.length));
    ph.forEach(sd => { const e = EDGE[sd]; for (let k = 0; k < per; k++) { const u = e.a0 + (e.a1 - e.a0) * (k + 0.5) / per, p0 = e.ax === 'x' ? [u, e.at - e.out * BW / 2] : [e.at - e.out * BW / 2, u];
      box(g, MM(12), 1.4, MM(12), p0[0], y0 - 0.7, p0[1], metal); const pt = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 0.55, 16), pot); pt.position.set(p0[0], y0 - 1.65, p0[1]); pt.castShadow = true; g.add(pt);
      const lf = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), leaf); lf.scale.set(1, 0.75, 1); lf.position.set(p0[0], y0 - 1.15, p0[1]); g.add(lf); } }); }
  // base plates
  g.children.filter(m => m.isMesh && m.material === F.frame && m.rotation.x === 0 && m.rotation.z === 0 && Math.abs(m.position.y - m.geometry.parameters.height / 2) < 0.01 && m.geometry.parameters.height >= top - 1)
    .forEach(m => { box(g, m.geometry.parameters.width + 0.25, 0.04, m.geometry.parameters.depth + 0.25, m.position.x, 0.14, m.position.z, F.frame).userData.plate = 1; });
  return { g, L, W, H, top: ry + 2 };
}

let R = null;
function ensure(el) {
  if (R) { if (R.renderer.domElement.parentNode !== el) el.appendChild(R.renderer.domElement); R.el = el; size(); return; }
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; el.appendChild(renderer.domElement);
  const scene = new THREE.Scene(), pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 400), controls = new OrbitControls(cam, renderer.domElement);
  controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.6; controls.minDistance = 4; controls.addEventListener('change', () => { if (cam.position.y < 1.2) cam.position.y = 1.2; });   // 266: look up at the roof from below
  controls.maxDistance = 80; controls.autoRotate = true; controls.autoRotateSpeed = 0.6;
  controls.addEventListener('start', () => { controls.autoRotate = false; });
  const hemi = new THREE.HemisphereLight(0xffffff, 0xb8ad98, 0.7), sun = new THREE.DirectionalLight(0xffffff, 1.9);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, far: 120 });
  scene.add(hemi, sun, sun.target);
  R = { renderer, scene, cam, controls, hemi, sun, el, group: null, key: '', night: false };
  setNight(false); size(); const loop = () => { R.raf = requestAnimationFrame(loop); if (!R.el || !R.el.isConnected || R.el.offsetParent === null) return; controls.update(); renderer.render(scene, cam); }; loop();   /* 305: nothing drawn while the designer is closed (the page froze on a second open) */
  window.addEventListener('resize', size);
}
function size() { if (!R || !R.el) return; const w = R.el.clientWidth || 600, h = R.el.clientHeight || 400; R.renderer.setSize(w, h, false); R.renderer.domElement.style.width = '100%'; R.renderer.domElement.style.height = '100%'; R.cam.aspect = w / h; R.cam.updateProjectionMatrix(); }
function setNight(on) {
  R.night = on; R.scene.traverse(o => { if (o.userData && o.userData.nightOnly) o.visible = on; });   /* 311: glows of the look pieces (fire pits, lamps) */
  R.scene.background = new THREE.Color(on ? 0x16203a : 0xeef0ea); R.renderer.toneMappingExposure = on ? 0.75 : 1;
  R.hemi.intensity = on ? 0.12 : 0.7; R.sun.intensity = on ? 0.08 : 1.9; mat('led', {}).emissiveIntensity = on ? 2.4 : 0; mat('led', {}).color.set(on ? 0xfff3d0 : 0x3a3a3a); if (M.spot) M.spot.emissiveIntensity = on ? 3 : 0.4; if (M.cove) M.cove.emissiveIntensity = on ? 2.5 : 0.25;
}
// 193f: on a terrace (opts.site: the studio's terrace — cx / cz = the pergola's corner, rot = where its front faces), with an optional deck and furniture to see it
let FURN = null, FURN_LOADING = false, ITEMS = null, LAMP = null, LAST = null;
function extras(g, L, W, opts, wall) {   // deck under it (fits the pergola unless sized) + a furniture set, both to see it; returns the pergola's lift
  const dk = opts.deck, y0 = dk ? 0.6 : 0;
  if (dk) { const dl = +dk.l || L + 1, dw = +dk.w || W + 1, x0 = L / 2 - dl / 2, z0 = wall ? -0.25 : W / 2 - dw / 2, nose = 0.15, th = 0.12, op = { front: 1, left: 1, right: 1, back: wall ? 0 : 1 };
    const ix0 = x0 + op.left * nose, ix1 = x0 + dl - op.right * nose, iz0 = z0 + op.back * nose, iz1 = z0 + dw - op.front * nose;
    box(g, ix1 - ix0, y0 - th, iz1 - iz0, (ix0 + ix1) / 2, (y0 - th) / 2, (iz0 + iz1) / 2, mat('dkb', { color: 0x3E3127, roughness: 0.95 }));   // the frame, set back under the nosing
    const n = Math.max(1, Math.round(dw / 0.47)); for (let k = 0; k < n; k++) box(g, dl, th, dw / n - 0.025, x0 + dl / 2, y0 - th / 2, z0 + dw * (k + 0.5) / n, mat(k % 2 ? 'dk1' : 'dk2', { color: k % 2 ? 0x8B6A4A : 0x7A5C40, roughness: 0.85 }));
    const cv = mat('cove', { color: 0xfff2d0, emissive: 0xffd89a, emissiveIntensity: R && R.night ? 2.5 : 0.25 }), yc = y0 - th - 0.05;   // cove light under the nosing
    if (op.front) box(g, ix1 - ix0, 0.05, 0.05, (ix0 + ix1) / 2, yc, iz1 + 0.04, cv); if (op.back) box(g, ix1 - ix0, 0.05, 0.05, (ix0 + ix1) / 2, yc, iz0 - 0.04, cv);
    if (op.left) box(g, 0.05, 0.05, iz1 - iz0, ix0 - 0.04, yc, (iz0 + iz1) / 2, cv); if (op.right) box(g, 0.05, 0.05, iz1 - iz0, ix1 + 0.04, yc, (iz0 + iz1) / 2, cv); }
  const f = opts.furn; if (f && FURN) { const set = f === 'dining' ? [['dining', 7, 6, 3]] : f === 'swing' ? [['swing', 6, 4.5, 7]] : [['sofa', Math.min(10, L - 1), Math.min(8, W - 1), 3]];
    set.forEach(([c, w, d, h]) => { const m = FURN(c, Math.min(w, L - 1), Math.min(d, W - 1), h); m.position.set(L / 2, y0, W / 2); g.add(m); }); }
  return y0;
}
function pendants(g, L, W, top, sku, cnt) {   // 296: cane pendant lights hanging from the pergola (Complete the look)
  if (sku && LAMP) { const n = Math.max(1, Math.min(4, cnt || 2)); for (let k = 0; k < n; k++) { const m = LAMP(sku); m.position.set(L * (k + 0.5) / n, top - 1.0, W / 2); (m.userData.nl || []).forEach(o => { o.visible = !!(R && R.night); o.userData.nightOnly = 1; }); g.add(m); } return; }   // 311: the picked lamp itself
  const cord = mat('pd_cord', { color: 0x222222 }), cane = mat('pd_cane', { color: 0xB08A5A, roughness: 0.9, wireframe: true }), shell = mat('pd_shell', { color: 0x9C7448, roughness: 0.95, transparent: true, opacity: 0.45 }), bulb = mat('pd_bulb', { color: 0xFFF2D0, emissive: 0xFFC97A, emissiveIntensity: 1.6 });
  const n = L > 14 ? 3 : 2; for (let k = 0; k < n; k++) { const x = L * (k + 0.5) / n, z = W / 2, y = top - 2.3;
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.6, 4), cord); c.position.set(x, top - 0.8, z); g.add(c);
    const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.72, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.82), cane); s1.position.set(x, y, z); g.add(s1);
    const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.69, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.82), shell); s2.position.set(x, y, z); g.add(s2);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), bulb); bl.position.set(x, y - 0.1, z); g.add(bl); }
}
let HANDLER = null; export function onEvent(fn) { HANDLER = fn; }
export function view(v) {   // 203: 'top' looks straight down on the terrace; '3d' back to the usual view
  if (!R || !R.cam) return; const t = R.site, b = R.b, L = b ? b.L : 12, W = b ? b.W : 10, H = b ? b.H : 8;
  const c = t ? (t.place ? [t.pw / 2, t.pd / 2] : [+t.cx + dims(t, L, W)[0] / 2, +t.cz + dims(t, L, W)[1] / 2]) : [L / 2, W / 2];
  R.controls.autoRotate = false;
  R.controls.maxDistance = v === 'top' ? 260 : 80;
  if (v === 'top') { const span = (t ? Math.max(t.pw, t.pd) : Math.max(L, W)) + 10; R.controls.target.set(c[0], 0, c[1]); R.cam.position.set(c[0], span * 1.9, c[1] + 0.01); R.controls.update(); }
  else frame(c[0], c[1], Math.max(L, W, H) * 2.2 + 10, H * 0.4);
}
function dims(t, L, W) { return (+t.rot || 0) % 180 ? [W, L] : [L, W]; }
function frame(cx, cz, d, h) { R.controls.target.set(cx, h, cz); R.cam.position.set(cx + d * 0.55, h + d * 0.55, cz + d * 0.75); R.controls.update(); }
export function show(el, sku, o, opts) {
  opts = opts || {}; LAST = [el, sku, o, opts]; ensure(el); ptr();   /* 307: the late space3d load redraws with the latest choices (night stayed on) */
  const t = opts.site && opts.site.kind === 'terrace' ? opts.site : null;
  const wantAr = t && Array.isArray(t.around) && t.around.some(Boolean);   // 193j: the plan's other things around it
  const LK = !t && opts.studio && opts.look && (opts.look.items.length || opts.look.pend) ? opts.look : null;   // 296: Complete the look
  if ((opts.furn || wantAr || (LK && (LK.items.length || LK.ps))) && !FURN && !FURN_LOADING) { FURN_LOADING = true; import('./space3d.js?v=114').then(m => { FURN = m.generic; ITEMS = m.itemsGroup; LAMP = m.lampShade; R.key = ''; show.apply(null, LAST); }).catch(() => {}); }
  const key = sku + '|' + JSON.stringify(o) + '|' + JSON.stringify(t) + '|' + (opts.deck ? 'd' + JSON.stringify(opts.deck) : '') + (opts.furn || '') + (FURN ? 'F' : '') + (LK ? JSON.stringify(LK) : '');
  if (key !== R.key) {
    const L0 = Math.max(6, +o.l || 12), W0 = Math.max(6, +o.w || 10), mode = t ? (t.place ? 'place' : 'site') : 'lawn';
    const dimsK = [o.l, o.w, o.height, mode, t ? [t.pw, t.pd].join('x') : ''].join('x'), redo = !R.group || dimsK !== R.dims;
    if (R.group) { R.scene.remove(R.group); R.group.traverse(m => { if (m.geometry) m.geometry.dispose(); }); }
    let root, b;
    if (!t && !opts.deck && !opts.furn && !opts.studio) { b = build(sku, o); root = b.g; }
    else if (!t && opts.studio) {   // 283: the design studio — grey 2 × 4 tiles all round, the wall behind when it is fixed to one, a person for scale
      b = build(sku, o, true); root = new THREE.Group(); const L = b.L, W = b.W, wl = /wall/i.test(String(o.layout || ''));
      const M8 = LK ? 13 : 8; studioFloor(root, -M8, wl ? -1.05 : -M8, L + 2 * M8, W + (wl ? M8 + 1.05 : 2 * M8));
      if (wl) box(root, L + 10, Math.max(10, b.H + 2), 0.75, L / 2, Math.max(10, b.H + 2) / 2, -0.43, mat('studioWall', { color: 0xE9E5DE, roughness: 0.95 }));
      const y0 = extras(root, L, W, opts, wl); b.g.position.y = y0; root.add(b.g); if (LK) person(root, LK.person ? LK.person.x : L / 2 + 2.5, LK.person ? LK.person.z : W + 4, -0.3); else person(root, L + 2.6, W * 0.7, -0.5);
      if (LK && ITEMS) { [false, true].forEach(ins => { const li = LK.items.filter(i => !!i.in === ins); if (!li.length) return; try { const gi = ITEMS(li, { labels: false, site: { kind: 'lawn', light: '' } }).g; if (ins) gi.position.y = y0; gi.traverse(o => { if (o.userData && o.userData.nightOnly) o.visible = !!R.night; }); root.add(gi); } catch (e) { if (window.console) console.warn(e); } }); }
      if (LK && LK.pend) pendants(root, L, W, y0 + b.H, LK.ps, LK.pend); }
    else if (!t) {   // a lawn with a deck / furniture: the ground drawn here, the pergola lifted onto the deck
      b = build(sku, o, true); root = new THREE.Group(); const X = S(), L = b.L, W = b.W; box(root, L + 16, 0.1, W + 16, L / 2, -0.05, W / 2, X.ground);
      if (/wall/i.test(String(o.layout || ''))) box(root, L + 4, b.H + 3, 0.6, L / 2, (b.H + 3) / 2, -0.45, X.wall);
      const y0 = extras(root, L, W, opts, /wall/i.test(String(o.layout || ''))); b.g.position.y = y0; root.add(b.g); }
    else {
      root = new THREE.Group(); const plot = plotModel(t); plot.position.y = 0.6; root.add(plot);   // slab surface at y 0
      if (wantAr && ITEMS) { try { root.add(ITEMS(t.around, { sel: t.asel != null ? t.asel : null }).g); } catch (e) { if (window.console) console.warn(e); } }
      if (!t.place) { b = build(sku, o, true); const [fw, fd] = dims(t, b.L, b.W), hold = new THREE.Group(); hold.userData.pg = 1;
        hold.position.set(+t.cx + fw / 2, 0, +t.cz + fd / 2); hold.rotation.y = (+t.rot || 0) * Math.PI / 180; root.add(hold);
        const inner = new THREE.Group(); inner.position.set(-b.L / 2, 0, -b.W / 2); hold.add(inner); const y0 = extras(inner, b.L, b.W, opts, /wall/i.test(String(o.layout || ''))); b.g.position.y = y0; inner.add(b.g);
        const hit = new THREE.Mesh(new THREE.BoxGeometry(b.L, b.H + 1, b.W), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(b.L / 2, (b.H + 1) / 2, b.W / 2); hit.userData.pghit = 1; inner.add(hit);
        if (t.clash) { const ln = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(fw + 0.4, 0.2, fd + 0.4)), new THREE.LineBasicMaterial({ color: 0xE0352B })); ln.position.set(+t.cx + fw / 2, 0.1, +t.cz + fd / 2); root.add(ln); } }
    }
    R.group = root; R.scene.add(root); R.key = key; R.dims = dimsK; R.site = t; R.sku = sku; R.o = o; R.b = b;
    const L = b ? b.L : 12, W = b ? b.W : 10, H = b ? b.H : 8;
    if (t) { const c = t.place ? [t.pw / 2, t.pd / 2] : [+t.cx + dims(t, L, W)[0] / 2, +t.cz + dims(t, L, W)[1] / 2]; R.sun.position.set(c[0] + 18, 40, c[1] + 14); R.sun.target.position.set(c[0], 0, c[1]);
      Object.assign(R.sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60 }); R.sun.shadow.camera.updateProjectionMatrix();
      if (redo) { R.controls.autoRotate = false; if (t.place) frame(c[0], c[1], Math.max(t.pw, t.pd) * 1.15 + 10, 0); else frame(c[0], c[1], Math.max(L, W, H) * 2.2 + 10, H * 0.4); }
      else if (!t.place && R.pc) { const dx = c[0] - R.pc[0], dz = c[1] - R.pc[1]; R.cam.position.x += dx; R.cam.position.z += dz; R.controls.target.x += dx; R.controls.target.z += dz; R.controls.update(); }   // moved: the view follows it
      R.pc = t.place ? null : c; }
    else { R.sun.position.set(L * 0.5 + 18, 30, W * 0.5 + 14); R.sun.target.position.set(L / 2, 0, W / 2);
      if (redo) { const d = Math.max(L, W, H) * 1.9 + 6; R.controls.target.set(L / 2, H * 0.45, W / 2); R.cam.position.set(L / 2 + d * 0.62, H * 0.9 + d * 0.32, W / 2 + d * 0.78); R.controls.update(); } }
  }
  if (!!opts.night !== R.night) setNight(!!opts.night);
}
// dragging on a terrace: the mumty / lift / shafts / AC units while it is set up, the pergola after
const RAY = new THREE.Raycaster(), FLOOR = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function cast(e, objs) { const r = R.renderer.domElement.getBoundingClientRect(); RAY.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), R.cam); return objs ? RAY.intersectObjects(objs, true) : null; }
function floorAt(e) { cast(e); const p = new THREE.Vector3(); return RAY.ray.intersectPlane(FLOOR, p) ? p : null; }
function ptr() {
  if (R.ptr) return; R.ptr = 1; const cv = R.renderer.domElement; cv.style.touchAction = 'none';
  cv.addEventListener('pointerdown', e => {
    const t = R.site; if (!t || !R.group || (e.pointerType === 'mouse' && e.button !== 0)) return; const hits = cast(e, [R.group]), f = floorAt(e); if (!f || !hits.length) return;
    if (t.place) { const h = hits.find(x => { let o = x.object; while (o && !o.userData.st) o = o.parent; return o; }); if (!h) return; let o = h.object; while (!o.userData.st) o = o.parent; const bk = (t.blocks || [])[o.userData.st.i]; if (!bk || bk.lock) return;
      R.drag = { kind: 'blk', obj: o, i: o.userData.st.i, f0: f.clone(), x0: +bk.x, z0: +bk.z, w: +bk.w, d: +bk.d, side: bk.side || 'free', sx: e.clientX, sy: e.clientY, moved: false }; }
    else { let ih = hits[0].object, hd = null; while (ih) { if (hd == null && ih.userData && ih.userData.it != null) hd = ih; if (ih.name === 'planitems') break; ih = ih.parent; }
      const ia = ih && hd && (t.around || [])[hd.userData.it];
      if (ia) { R.drag = { kind: 'it', obj: hd, i: hd.userData.it, f0: f.clone(), x0: +ia.x, z0: +ia.z, p0: hd.position.clone(), can: !ia.lock && !ia.segs && !ia.box, sx: e.clientX, sy: e.clientY, moved: false }; R.controls.enabled = false; e.preventDefault(); e.stopPropagation(); try { cv.setPointerCapture(e.pointerId); } catch (er) {} return; }
      const h = hits.find(x => x.object.userData.pghit); if (!h) return; let o = h.object; while (o && !o.userData.pg) o = o.parent;
      R.drag = { kind: 'pg', obj: o, f0: f.clone(), x0: +t.cx, z0: +t.cz, p0: o.position.clone(), sx: e.clientX, sy: e.clientY, moved: false }; }
    R.controls.enabled = false; e.preventDefault(); e.stopPropagation(); try { cv.setPointerCapture(e.pointerId); } catch (er) {}
  }, true);
  cv.addEventListener('pointermove', e => {
    const d = R.drag; if (!d) return; const f = floorAt(e); if (!f) return; if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 5) return; d.moved = true; const t = R.site, dx = f.x - d.f0.x, dz = f.z - d.f0.z;
    if (d.kind === 'it') { if (!d.can) return; d.nx = Math.round((d.x0 + dx) * 2) / 2; d.nz = Math.round((d.z0 + dz) * 2) / 2; d.obj.position.set(d.p0.x + d.nx - d.x0, d.p0.y, d.p0.z + d.nz - d.z0); }
    else if (d.kind === 'blk') { d.nx = Math.round(Math.max(0.75, Math.min(t.pw - 0.75 - d.w, d.x0 + dx)) * 2) / 2; d.nz = Math.round(Math.max(0.75, Math.min(t.pd - 0.75 - d.d, d.z0 + dz)) * 2) / 2; if (d.side === 'left' || d.side === 'right') d.nx = d.x0; if (d.side === 'back' || d.side === 'front') d.nz = d.z0; d.obj.position.set(d.nx - d.x0, 0, d.nz - d.z0); }
    else { d.nx = Math.round((d.x0 + dx) * 2) / 2; d.nz = Math.round((d.z0 + dz) * 2) / 2; d.obj.position.set(d.p0.x + dx, 0, d.p0.z + dz); }
  });
  const up = () => { const d = R.drag; if (!d) return; R.drag = null; R.controls.enabled = true; if (d.kind === 'it' && HANDLER) return HANDLER(d.moved ? { t: 'moveitem', i: d.i, x: d.nx, z: d.nz } : { t: 'selitem', i: d.i }); if (!d.moved || !HANDLER) return;
    if (d.kind === 'blk') HANDLER({ t: 'movesite', i: d.i, x: d.nx, z: d.nz }); else HANDLER({ t: 'movecab', cx: d.nx, cz: d.nz }); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
}
export function resize() { size(); }
window.Pergola3D = { show, resize, onEvent, view, _r: () => R };
export function pergolaModel(sku, o) { return build(sku, o, true); }   // 192: x 0..L, z 0..W, ground at y 0
export const PERGOLA_SKUS = Object.keys(D);
