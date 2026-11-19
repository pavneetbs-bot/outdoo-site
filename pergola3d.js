// outrr pergola in 3D — the customer's own size, clear height, finish, roof covering and layout, drawn live (three.js).
// One model builder for every design in mto/pergolas: each design (by SKU) is a short recipe — posts, legs, roof — below.
// Units are feet; x runs along the length, z along the width (front = z max), y is up.
import * as THREE from './vendor/three/three.module.min.js';
import { OrbitControls } from './vendor/three/OrbitControls.js';
import { RoomEnvironment } from './vendor/three/RoomEnvironment.js';

const MM = v => v / 304.8;   // mm → ft
// design recipes: post = SHS size (mm); roof: flat | tiers | gable | xgable | hip | barrel | wave | louvre | grid | float;
// leg: straight | aframe | lean | knee | ladder | twin | branch | pillar | mast | portal | gate | sidetwin; raf = rafter (w × h mm), gap = rafter spacing (mm)
const D = {
  'MTO-PG-AF': { leg: 'aframe' },
  'MTO-PG-AL': { roof: 'louvre' },
  'MTO-PG-BR': { leg: 'branch', post: 125 },
  'MTO-PG-CA': { roof: 'barrel' },
  'MTO-PG-EG': { roof: 'grid', post: 125, raf: [50, 200], gap: 600 },
  'MTO-PG-FP': { leg: 'gate' },
  'MTO-PG-FR': { roof: 'float' },
  'MTO-PG-GB': { roof: 'gable' },
  'MTO-PG-HP': { roof: 'hip', post: 125 },
  'MTO-PG-IP': { post: 125, inset: 600, over: 600 },
  'MTO-PG-KB': { leg: 'knee', post: 125, over: 450 },
  'MTO-PG-LD': { leg: 'ladder', post: 80 },
  'MTO-PG-LP': { leg: 'lean' },
  'MTO-PG-OV': { over: 300, bover: 300 },
  'MTO-PG-PA': { post: 200, beam: [200, 200], over: 0, bover: 0, raf: [40, 150], gap: 150, flush: true },
  'MTO-PG-PB': { leg: 'pillar' },
  'MTO-PG-PF': { leg: 'portal', post: 150 },
  'MTO-PG-RH': { groups: 3, gap: 120, raf: [40, 120] },
  'MTO-PG-SO': { leg: 'sidetwin' },
  'MTO-PG-TP': { leg: 'mast' },
  'MTO-PG-TT': { roof: 'tiers' },
  'MTO-PG-TW': { leg: 'twin', post: 75 },
  'MTO-PG-WC': { post: 200, beam: [100, 300], raf: [50, 150], gap: 220, over: 150, clad: true },
  'MTO-PG-WV': { roof: 'wave' },
  'MTO-PG-XG': { roof: 'xgable', post: 125 },
};
const FIN = { black: 0x2a2a2a, grey: 0x7b7e82, white: 0xf1f1ec, brown: 0x5b3c2a, wood: 0xa26a42 };
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
  stone: mat('stone', { color: 0xb9ad99, roughness: 0.95 }), wall: mat('wall', { color: 0xe9e4da, roughness: 0.9 }),
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
    if (leg === 'lean') { const k = Math.tan(10 * Math.PI / 180) * top, dx = x < L / 2 ? 1 : x > L / 2 ? -1 : 0, dz = z < W / 2 ? 1 : -1; rod(g, [x + dx * k, 0, z + dz * k], [x, top, z], P, P, F.frame); continue; }
    if (leg === 'aframe') { if (x !== cols[0] && x !== cols[cols.length - 1]) continue; const dz = z < W / 2 ? -1 : 1; rod(g, [x, 0, z + dz * 1.6], [x, top, z], P, P, F.frame); continue; }   // each end: two legs splayed out like an A
    if (leg === 'ladder') { const s = MM(220) / 2; [-s, s].forEach(d => post(x + d, z)); for (let k = 1; k <= 4; k++) box(g, 2 * s, MM(40), MM(40), x, top * k / 5, z, F.frame); continue; }
    if (leg === 'twin') { const s = MM(75); [-s, s].forEach(d => post(x, z + d)); continue; }
    if (leg === 'branch') continue;
    if (leg === 'pillar') { box(g, 1.6, 3, 1.6, x, 1.5, z, X.stone); box(g, P, top - 3, P, x, 3 + (top - 3) / 2, z, F.frame); continue; }
    if (leg === 'mast') { post(x, z, top + BH + RH + 2.3); box(g, P + 0.15, 0.12, P + 0.15, x, top + BH + RH + 2.36, z, F.frame); continue; }
    if (leg === 'portal' && (x === cols[0] || x === cols[cols.length - 1])) { post(x, z, top + BH + RH + 1.5); continue; }
    post(x, z, r.roof === 'float' ? top - 0.8 : top, r.clad ? P : P);
    if (leg === 'knee') { const b = 2; rod(g, [x, top - b, z], [x + (x < L / 2 ? b : -b), top, z], MM(60), MM(60), F.frame); rod(g, [x, top - b, z], [x, top, z + (z < W / 2 ? b : -b)], MM(60), MM(60), F.frame); }
    if (leg === 'sidetwin' && x === cols[cols.length - 1]) post(x - 1.3, z);
  }
  if (leg === 'branch') [L * 0.27, L * 0.73].forEach(x => { const z = W / 2, y0 = top - 2.6; post(x, z, y0);
    [[x - 1.8, z], [x + 1.8, z], [x, rows[0]], [x, rows[rows.length - 1]]].forEach(([a, b]) => rod(g, [x, y0, z], [a, top, b], P * 0.8, P * 0.8, F.frame)); });
  if (leg === 'portal') [cols[0], cols[cols.length - 1]].forEach(x => box(g, P, P, W - 2 * inset, x, top + BH + RH + 1.5 - P / 2, W / 2, F.frame));
  if (leg === 'gate') { const z = W + 2.6, hh = top + BH + RH + 3, s = MM(200); [L * 0.2, L * 0.8].forEach(x => box(g, s, hh, s, x, hh / 2, z, F.frame)); box(g, L * 0.6 + s, s, s, L / 2, hh - s / 2, z, F.frame);
    [L * 0.2, L * 0.8].forEach(x => box(g, MM(80), MM(120), 2.6, x, top + BH / 2, W + 1.3, F.frame)); }
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
    const zm = W / 2, up = MM(450);
    beamAt(rows[rows.length - 1]); beamAt(zm, y0); beamAt(zm, y0 + up + BH); beamAt(rows[0], y0 + up + BH);
    for (const x of cols) { post(x, zm, y0 + up + BH); box(g, P, up + BH, P, x, y0 + BH + (up + BH) / 2, rows[0], F.frame); }
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
  } else if (roof === 'wave') {
    rows.forEach(z => { beamAt(z); led(z); }); const n = Math.max(3, Math.round(L / 1.2)), seg = 14, amp = 0.6;   // every rafter rises and falls once across the width
    for (let i = 0; i <= n; i++) { const x = eL + (eR - eL) * i / n; for (let k = 0; k < seg; k++) { const t0 = k / seg, t1 = (k + 1) / seg, yy = t => ry + amp + Math.sin(Math.PI * 2 * t - Math.PI / 2) * -amp;
      rod(g, [x, yy(t0), R0 + (R1 - R0) * t0], [x, yy(t1), R0 + (R1 - R0) * t1], RW, RH, F.roof); } }
    coverCurve(t => ry + 0.6 + Math.sin(Math.PI * 2 * t - Math.PI / 2) * -0.6, 20);
  } else if (roof === 'louvre') {
    rows.forEach(z => { beamAt(z); led(z); }); cols.forEach(x => box(g, BW, BH, W - 2 * inset, x, y0 + BH / 2, W / 2, F.frame));
    for (let x = eL + 0.4; x < eR; x += 0.5) louv(x, ry - BH / 2 - MM(90), rows[0], rows[rows.length - 1]);
  } else if (roof === 'grid') {
    rows.forEach(z => { beamAt(z); led(z); }); rafters(() => ry); for (let z = R0; z <= R1 + 0.01; z += gap + RW) box(g, eR - eL, RH, RW, L / 2, ry + RH / 2, z, F.roof); cover(ry + RH);
  } else if (roof === 'float') {
    const fy = top + 0.8 - BH; [R0, R1].forEach(z => box(g, eR - eL, BH, BW, L / 2, fy + BH / 2, z, F.frame)); [eL, eR].forEach(x => box(g, BW, BH, R1 - R0, x, fy + BH / 2, W / 2, F.frame));
    rows.forEach(z => led(z, fy)); rafters(() => fy + BH - RH, R0, R1); cover(fy + BH);
  } else {   // flat (most designs)
    rows.forEach(z => { beamAt(z); led(z); });
    if (r.flush) { [eL, eR].forEach(x => box(g, BW, BH, W - 2 * inset, x, y0 + BH / 2, W / 2, F.frame)); rafters(() => y0 + (BH - RH) / 2, rows[0], rows[rows.length - 1]); cover(y0 + BH, rows[0], rows[rows.length - 1]); }
    else { rafters(() => ry); if (r.clad) [R0, R1].forEach(z => box(g, eR - eL, MM(300), MM(40), L / 2, ry + MM(150), z, F.roof)); cover(ry + RH); }
  }
  if (wall) box(g, eR - eL, BH, BW, (eL + eR) / 2, ry - BH / 2, -P / 2 + BW / 2, F.frame);   // ledger fixed to the wall
  if (lsh) { const ex = Math.min(8, L * 0.5); box(g, P, top, P, L - inset - P / 2, top / 2, W + ex, F.frame); box(g, BW, BH, ex + over, L - inset - P / 2, top + BH / 2, W + ex / 2, F.frame);
    for (let z = W; z < W + ex; z += gap + RW) box(g, Math.min(6, L * 0.4), RH, RW, L - Math.min(6, L * 0.4) / 2, ry + RH / 2, z, F.roof); box(g, P, top, P, L - Math.min(6, L * 0.4), top / 2, W + ex, F.frame); }
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
  controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.49; controls.minDistance = 6; controls.maxDistance = 80; controls.autoRotate = true; controls.autoRotateSpeed = 0.6;
  controls.addEventListener('start', () => { controls.autoRotate = false; });
  const hemi = new THREE.HemisphereLight(0xffffff, 0xb8ad98, 0.7), sun = new THREE.DirectionalLight(0xffffff, 1.9);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, far: 120 });
  scene.add(hemi, sun, sun.target);
  R = { renderer, scene, cam, controls, hemi, sun, el, group: null, key: '', night: false };
  setNight(false); size(); const loop = () => { R.raf = requestAnimationFrame(loop); controls.update(); renderer.render(scene, cam); }; loop();
  window.addEventListener('resize', size);
}
function size() { if (!R || !R.el) return; const w = R.el.clientWidth || 600, h = R.el.clientHeight || 400; R.renderer.setSize(w, h, false); R.renderer.domElement.style.width = '100%'; R.renderer.domElement.style.height = '100%'; R.cam.aspect = w / h; R.cam.updateProjectionMatrix(); }
function setNight(on) {
  R.night = on; R.scene.background = new THREE.Color(on ? 0x16203a : 0xeef0ea); R.renderer.toneMappingExposure = on ? 0.75 : 1;
  R.hemi.intensity = on ? 0.12 : 0.7; R.sun.intensity = on ? 0.08 : 1.9; mat('led', {}).emissiveIntensity = on ? 2.4 : 0; mat('led', {}).color.set(on ? 0xfff3d0 : 0x3a3a3a);
}
export function show(el, sku, o, opts) {
  opts = opts || {}; ensure(el);
  const key = sku + '|' + JSON.stringify(o);
  if (key !== R.key) {
    const first = !R.group, dims = [o.l, o.w, o.height].join('x'), redo = first || dims !== R.dims;
    if (R.group) { R.scene.remove(R.group); R.group.traverse(m => { if (m.geometry) m.geometry.dispose(); }); }
    const b = build(sku, o); R.group = b.g; R.scene.add(b.g); R.key = key; R.dims = dims;
    R.sun.position.set(b.L * 0.5 + 18, 30, b.W * 0.5 + 14); R.sun.target.position.set(b.L / 2, 0, b.W / 2);
    if (redo) { const d = Math.max(b.L, b.W, b.H) * 1.9 + 6; R.controls.target.set(b.L / 2, b.H * 0.45, b.W / 2); R.cam.position.set(b.L / 2 + d * 0.62, b.H * 0.9 + d * 0.32, b.W / 2 + d * 0.78); R.controls.update(); }
  }
  if (!!opts.night !== R.night) setNight(!!opts.night);
}
export function resize() { size(); }
window.Pergola3D = { show, resize };
export function pergolaModel(sku, o) { return build(sku, o, true); }   // 192: x 0..L, z 0..W, ground at y 0
export const PERGOLA_SKUS = Object.keys(D);
