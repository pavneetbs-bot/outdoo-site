// outrr design studio — sculptures (309b, owner: "unka bhi bana lo"): all 40 outrr sculpture designs (MTO-SC-*, each in FRP and
// stone = 80 SKUs) as smooth carved forms at the picked height (2–6 ft) and finish, on a plinth. Each design = a few signed-distance
// shapes (spheres, ellipsoids, round cones, tori, boxes) blended softly and turned into one mesh with marching cubes — so the
// forms read as one carved / cast piece. Units: feet, y up, the front faces +z.
import * as THREE from './vendor/three/three.module.min.js';
import { MarchingCubes } from './vendor/three/MarchingCubes.js?v=1';
import { studioFloor, person } from './studio3d.js?v=7';

// ---- signed distances (unit space: content y 0…1)
const L3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z), cl = (v, a, b) => v < a ? a : v > b ? b : v;
const sph = (c, r) => p => L3(p[0] - c[0], p[1] - c[1], p[2] - c[2]) - r;
const ell = (c, r) => p => { const x = (p[0] - c[0]) / r[0], y = (p[1] - c[1]) / r[1], z = (p[2] - c[2]) / r[2], k0 = Math.sqrt(x * x + y * y + z * z), k1 = Math.sqrt(x * x / (r[0] * r[0]) + y * y / (r[1] * r[1]) + z * z / (r[2] * r[2])); return k1 ? k0 * (k0 - 1) / k1 : -Math.min(r[0], r[1], r[2]); };
const cap = (a, b, ra, rb) => { rb = rb == null ? ra : rb; const ba = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], bb = ba[0] * ba[0] + ba[1] * ba[1] + ba[2] * ba[2] || 1e-6;
  return p => { const pa = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], h = cl((pa[0] * ba[0] + pa[1] * ba[1] + pa[2] * ba[2]) / bb, 0, 1); return L3(pa[0] - ba[0] * h, pa[1] - ba[1] * h, pa[2] - ba[2] * h) - (ra + (rb - ra) * h); }; };
const tor = (c, n, R, r) => { const l = L3(n[0], n[1], n[2]); n = [n[0] / l, n[1] / l, n[2] / l]; return p => { const q = [p[0] - c[0], p[1] - c[1], p[2] - c[2]], h = q[0] * n[0] + q[1] * n[1] + q[2] * n[2], rx = q[0] - h * n[0], ry = q[1] - h * n[1], rz = q[2] - h * n[2]; return Math.hypot(L3(rx, ry, rz) - R, h) - r; }; };
const box = (c, b, rr, ry, rz) => { rr = rr || 0; const cs = Math.cos(ry || 0), sn = Math.sin(ry || 0), cz = Math.cos(rz || 0), sz = Math.sin(rz || 0); return p => { let x = p[0] - c[0], z = p[2] - c[2]; let y = p[1] - c[1]; const xr = cz * x + sz * y; y = -sz * x + cz * y; x = xr; const x2 = cs * x + sn * z, z2 = -sn * x + cs * z;
  const qx = Math.abs(x2) - b[0] + rr, qy = Math.abs(y) - b[1] + rr, qz = Math.abs(z2) - b[2] + rr; return L3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - rr; }; };
const cyl = (c, r, h) => p => { const dx = Math.hypot(p[0] - c[0], p[2] - c[2]) - r, dy = Math.abs(p[1] - c[1]) - h / 2; return Math.min(Math.max(dx, dy), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0)); };
// a tube through points with radii (a chain of round cones)
const chain = (pts, rs) => { const s = []; for (let i = 0; i < pts.length - 1; i++) s.push(cap(pts[i], pts[i + 1], rs[Math.min(i, rs.length - 1)], rs[Math.min(i + 1, rs.length - 1)])); return p => { let d = 1e9; for (const f of s) d = Math.min(d, f(p)); return d; }; };
const curve = (fn, n, r0, r1) => { const pts = [], rs = []; for (let i = 0; i <= n; i++) { const t = i / n; pts.push(fn(t)); rs.push(r0 + (r1 - r0) * t); } return chain(pts, rs); };
const U = (f, k) => ({ f, k: k == null ? 0.025 : k }), SUB = (f, k) => ({ f, k: k || 0.01, sub: 1 });
function smin(a, b, k) { if (k <= 0) return Math.min(a, b); const h = cl(0.5 + 0.5 * (b - a) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h); }
function smax(a, b, k) { return -smin(-a, -b, k); }

// ---- figure helpers
const mir = (p, s) => [p[0] * s, p[1], p[2]];
function seatedBase(y0) { y0 = y0 || 0; return [U(ell([0, y0 + 0.09, 0.02], [0.42, 0.09, 0.25]), 0.05), U(sph([0.31, y0 + 0.11, 0.13], 0.1)), U(sph([-0.31, y0 + 0.11, 0.13], 0.1)), U(ell([0, y0 + 0.12, 0.17], [0.22, 0.06, 0.08]), 0.05)]; }
function torsoHead(y0, o) { o = o || {}; const hs = o.head || 1, cy = y0, P = [];
  P.push(U(ell([0, cy + 0.3, 0], [0.2, 0.22, 0.13]), 0.06), U(ell([0, cy + 0.47, -0.01], [0.24 * (o.sh || 1), 0.08, 0.12]), 0.06), U(cap([0, cy + 0.5, 0], [0, cy + 0.6, 0.01], 0.055), 0.03));
  P.push(U(ell([0, cy + 0.7, 0.01], [0.105 * hs, 0.125 * hs, 0.11 * hs]), 0.03));
  if (o.bud) { P.push(U(sph([0, cy + 0.7 + 0.125 * hs, -0.005], 0.05 * hs), 0.03)); P.push(U(ell([0.1 * hs, cy + 0.69, 0], [0.018, 0.06 * hs, 0.03]), 0.01), U(ell([-0.1 * hs, cy + 0.69, 0], [0.018, 0.06 * hs, 0.03]), 0.01)); }
  if (o.hair) P.push(U(ell([0, cy + 0.72, -0.04], [0.115 * hs, 0.12 * hs, 0.11 * hs]), 0.02), U(cap([0, cy + 0.7, -0.08], [0, cy + 0.45, -0.1], 0.07, 0.05), 0.04));
  P.push(U(ell([0, cy + 0.68, 0.1 * hs], [0.018, 0.03, 0.02]), 0.01));   // nose
  return P; }
function arm(sh, el, ha, r) { r = r || 0.05; return [U(cap(sh, el, r, r * 0.9), 0.03), U(cap(el, ha, r * 0.85, r * 0.7), 0.02), U(sph(ha, r * 0.95), 0.02)]; }
function robe(top, bot, rt, rb) { return [U(cap(top, bot, rt, rb), 0.05)]; }
function quad(o) {   // a four-legged animal: body, legs, neck, head, tail
  const P = [], bx = o.body, by = o.leg, bl = o.len, bw = o.w;
  P.push(U(ell([0, by + bx[1], 0], [bl, bx[1], bw]), 0.05));
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => P.push(U(cap([sx * bl * 0.7, by + bx[1] * 0.6, sz * bw * 0.55], [sx * bl * (0.72 + (o.lean || 0) * sx), 0.03, sz * bw * 0.55], o.lr, o.lr * 0.7), 0.04)));
  P.push(U(cap([bl * 0.85, by + bx[1] * 1.2, 0], o.neck, o.nr, o.nr * 0.75), 0.05));
  P.push(U(ell(o.head, o.hr), 0.04));
  if (o.tail) P.push(U(curve(o.tail, 6, o.tr || 0.03, 0.015), 0.02));
  return P; }

// ---- the 40 designs: content in unit space (height 1); w × d = how wide / deep the content is; pl = plinth [w, d, h] (in content units)
const R = {
  // abstract (black granite / FRP)
  'ABS-FACE': () => ({ P: [U(box([0, 0.5, 0], [0.16, 0.48, 0.05], 0.03)), U(ell([0.12, 0.6, 0], [0.12, 0.38, 0.05]), 0.05), U(ell([0.27, 0.62, 0], [0.04, 0.06, 0.04]), 0.03), U(ell([0.25, 0.46, 0], [0.035, 0.03, 0.04]), 0.02), U(ell([0.24, 0.38, 0], [0.04, 0.05, 0.045]), 0.03), U(ell([0.2, 0.74, 0], [0.05, 0.025, 0.05]), 0.02)], w: 0.7, d: 0.4, pl: [0.5, 0.35, 0.18] }),
  'ABS-FAMILY': () => ({ P: [U(curve(t => [-0.18 + 0.22 * Math.sin(t * 2.4) * (1 - t * 0.3), t * 0.86, 0.05 * Math.sin(t * 6)], 10, 0.075, 0.05), 0.06), U(sph([-0.02, 0.92, 0.02], 0.07)),
    U(curve(t => [0.2 - 0.2 * Math.sin(t * 2.4) * (1 - t * 0.3), t * 0.8, -0.04 * Math.sin(t * 6)], 10, 0.07, 0.045), 0.06), U(sph([0.05, 0.86, -0.02], 0.065)), U(curve(t => [0.02 + 0.04 * Math.sin(t * 4), 0.15 + t * 0.4, 0.06], 6, 0.045, 0.035), 0.05), U(sph([0.03, 0.6, 0.06], 0.05))], w: 0.7, d: 0.4, pl: [0.45, 0.38, 0.18] }),
  'ABS-FLAME': () => ({ P: [U(curve(t => [0.08 * Math.sin(t * 7) * (1 - t * 0.2), t * 0.98, 0.04 * Math.cos(t * 5)], 16, 0.12, 0.008), 0.05), U(curve(t => [0.1 + 0.1 * t, 0.15 + t * 0.45, 0.02], 8, 0.06, 0.008), 0.06), SUB(ell([0.02, 0.32, 0], [0.04, 0.09, 0.2]), 0.02)], w: 0.5, d: 0.4, pl: [0.3, 0.3, 0.14] }),
  'ABS-KNOT': () => ({ P: [U(curve(t => { const a = t * Math.PI * 2; return [0.18 * (Math.sin(a) + 2 * Math.sin(2 * a)) / 2.5, 0.42 + 0.16 * (Math.cos(a) - 2 * Math.cos(2 * a)) / 2.5 + 0.02, -0.18 * Math.sin(3 * a) / 2]; }, 90, 0.075, 0.075), 0.02), U(cyl([0, 0.06, 0], 0.08, 0.12), 0.06)], w: 0.75, d: 0.5, pl: [0.55, 0.5, 0.18] }),
  'ABS-LOOP': () => ({ P: [U(curve(t => { const a = t * Math.PI * 2; return [0.3 * Math.sin(a), 0.5 + 0.38 * Math.cos(a) * 0.95, 0.12 * Math.sin(2 * a)]; }, 60, 0.06, 0.06), 0.03), U(cap([0, 0.0, 0], [0, 0.14, 0], 0.08, 0.06), 0.06)], w: 0.75, d: 0.45, pl: [0.5, 0.4, 0.16] }),
  'ABS-MOON': () => ({ P: [U(tor([0, 0.5, 0], [0, 0, 1], 0.38, 0.065), 0.02), U(curve(t => { const a = Math.PI * (0.6 + t * 0.8); return [0.25 * Math.cos(a) * 0.9 - 0.05, 0.5 + 0.25 * Math.sin(a), 0]; }, 16, 0.025, 0.06), 0.03), U(box([0, 0.06, 0], [0.18, 0.06, 0.08], 0.02), 0.03)], w: 0.95, d: 0.35, pl: [0.7, 0.35, 0.14] }),
  'ABS-PEBBLES': () => { const P = []; let y = 0; [[0.24, 0.1], [0.2, 0.09], [0.17, 0.08], [0.14, 0.07], [0.11, 0.06], [0.08, 0.05]].forEach(([r, h], i) => { y += h; P.push(U(ell([0.015 * Math.sin(i * 2), y, 0], [r, h, r * 0.85]), 0.012)); y += h * 0.9; }); return { P, w: 0.6, d: 0.5, pl: [0.5, 0.45, 0.12] }; },
  'ABS-RING': () => ({ P: [U(curve(t => { const a = t * Math.PI * 2; return [0.28 * Math.sin(a), 0.5 + 0.4 * Math.cos(a), 0.1 * Math.sin(a * 2)]; }, 60, 0.07, 0.07), 0.03), U(box([0, 0.06, 0], [0.14, 0.06, 0.1], 0.02), 0.04)], w: 0.7, d: 0.4, pl: [0.5, 0.4, 0.16] }),
  'ABS-TOTEM': () => ({ P: [U(box([0, 0.08, 0], [0.12, 0.08, 0.12], 0.01), 0.01), U(box([0, 0.3, 0], [0.1, 0.1, 0.08], 0.01, 0, Math.PI / 4), 0.01), U(sph([0, 0.54, 0], 0.1), 0.01), U(cyl([0, 0.7, 0], 0.1, 0.12), 0.01), U(cap([0, 0.8, 0], [0, 0.92, 0], 0.065), 0.01)], w: 0.4, d: 0.4, pl: [0.32, 0.32, 0.1] }),
  'ABS-WAVE': () => ({ P: [U(curve(t => [0.14 * Math.sin(t * 5.5 + 0.4), t * 0.95, 0.03 * Math.cos(t * 4)], 18, 0.11, 0.03), 0.04)], w: 0.55, d: 0.35, pl: [0.35, 0.3, 0.14] }),
  // animals
  'ANI-DEER': () => ({ P: [...quad({ body: [0, 0.12], leg: 0.38, len: 0.28, w: 0.1, lr: 0.035, neck: [0.45, 0.25, 0], nr: 0.05, head: [0.5, 0.14, 0], hr: [0.08, 0.04, 0.04], tail: t => [-0.3 - 0.04 * t, 0.58 - 0.04 * t, 0] }), U(ell([0.46, 0.2, 0.04], [0.02, 0.04, 0.01])), U(ell([0.46, 0.2, -0.04], [0.02, 0.04, 0.01]))], w: 1.2, d: 0.4, pl: [1.1, 0.4, 0.08] }),
  'ANI-ELEPHANT': () => ({ P: [...quad({ body: [0, 0.24], leg: 0.32, len: 0.36, w: 0.22, lr: 0.09, neck: [0.42, 0.66, 0], nr: 0.13, head: [0.46, 0.7, 0], hr: [0.15, 0.16, 0.15], tail: t => [-0.38, 0.6 - 0.25 * t, 0] }),
    U(curve(t => [0.58 + 0.06 * Math.sin(t * 2), 0.62 - 0.25 * Math.sin(t * 1.6) + 0.35 * t * t, 0], 10, 0.06, 0.025), 0.04), U(ell([0.4, 0.7, 0.16], [0.09, 0.14, 0.03]), 0.03), U(ell([0.4, 0.7, -0.16], [0.09, 0.14, 0.03]), 0.03),
    U(cap([0.56, 0.56, 0.06], [0.68, 0.5, 0.08], 0.022, 0.008), 0.01), U(cap([0.56, 0.56, -0.06], [0.68, 0.5, -0.08], 0.022, 0.008), 0.01)], w: 1.4, d: 0.7, pl: [1.1, 0.65, 0.08] }),
  'ANI-FROG': () => ({ P: [U(cyl([0, 0.42, 0], 0.4, 0.04), 0.03), U(cap([0, 0.0, 0], [0.02, 0.42, 0], 0.06, 0.04), 0.05), U(ell([0, 0.58, 0], [0.18, 0.14, 0.16]), 0.04), U(sph([0.13, 0.7, 0.07], 0.05), 0.02), U(sph([0.13, 0.7, -0.07], 0.05), 0.02),
    U(ell([-0.08, 0.5, 0.16], [0.12, 0.05, 0.07]), 0.04), U(ell([-0.08, 0.5, -0.16], [0.12, 0.05, 0.07]), 0.04), U(cap([0.12, 0.55, 0.1], [0.18, 0.46, 0.14], 0.03), 0.03), U(cap([0.12, 0.55, -0.1], [0.18, 0.46, -0.14], 0.03), 0.03)], w: 0.85, d: 0.85, pl: [0.45, 0.45, 0.1] }),
  'ANI-HORSE': () => ({ P: [...quad({ body: [0, 0.15], leg: 0.42, len: 0.3, w: 0.12, lr: 0.04, neck: [0.44, 0.84, 0], nr: 0.085, head: [0.47, 0.84, 0], hr: [0.06, 0.06, 0.05], tail: t => [-0.34 - 0.06 * t, 0.64 - 0.3 * t, 0] }), U(cap([0.47, 0.86, 0], [0.62, 0.72, 0], 0.06, 0.04), 0.03), U(cap([0.3, 0.74, 0], [0.42, 0.92, 0], 0.03), 0.03), U(ell([0.42, 0.93, 0.03], [0.015, 0.04, 0.01])), U(ell([0.42, 0.93, -0.03], [0.015, 0.04, 0.01]))], w: 1.2, d: 0.4, pl: [1.0, 0.4, 0.08] }),
  'ANI-LION': () => ({ P: [U(ell([-0.1, 0.2, 0], [0.22, 0.2, 0.2]), 0.06), U(ell([0.08, 0.42, 0], [0.15, 0.26, 0.15]), 0.06), U(cap([0.18, 0.35, 0.09], [0.22, 0.03, 0.1], 0.05, 0.045), 0.04), U(cap([0.18, 0.35, -0.09], [0.22, 0.03, -0.1], 0.05, 0.045), 0.04), U(ell([0.25, 0.03, 0.1], [0.06, 0.03, 0.04]), 0.02), U(ell([0.25, 0.03, -0.1], [0.06, 0.03, 0.04]), 0.02),
    U(ell([0.1, 0.68, 0], [0.17, 0.2, 0.2]), 0.05), U(ell([0.2, 0.68, 0], [0.1, 0.1, 0.1]), 0.03), U(ell([0.29, 0.64, 0], [0.05, 0.045, 0.06]), 0.02), U(sph([0.16, 0.8, 0.08], 0.03), 0.01), U(sph([0.16, 0.8, -0.08], 0.03), 0.01), U(curve(t => [-0.3 + 0.35 * t, 0.04, 0.2 + 0.04 * Math.sin(t * 3)], 8, 0.025, 0.02), 0.02)], w: 0.75, d: 0.55, pl: [0.68, 0.5, 0.1] }),
  'ANI-OWL': () => ({ P: [U(cyl([0, 0.17, 0], 0.17, 0.34), 0.05), U(ell([0, 0.55, 0], [0.17, 0.22, 0.15]), 0.05), U(sph([0, 0.82, 0.01], 0.14), 0.05), U(cap([0.08, 0.92, 0], [0.12, 1.0, 0], 0.03, 0.008), 0.02), U(cap([-0.08, 0.92, 0], [-0.12, 1.0, 0], 0.03, 0.008), 0.02),
    SUB(sph([0.055, 0.84, 0.15], 0.04)), SUB(sph([-0.055, 0.84, 0.15], 0.04)), U(ell([0, 0.78, 0.15], [0.02, 0.035, 0.02]), 0.01), U(ell([0.15, 0.55, 0], [0.04, 0.17, 0.1]), 0.03), U(ell([-0.15, 0.55, 0], [0.04, 0.17, 0.1]), 0.03)], w: 0.5, d: 0.45, pl: [0.4, 0.4, 0.08] }),
  'ANI-PANTHER': () => ({ P: [...quad({ body: [0, 0.1], leg: 0.18, len: 0.36, w: 0.1, lr: 0.04, lean: 0.12, neck: [0.48, 0.25, 0], nr: 0.06, head: [0.56, 0.24, 0], hr: [0.08, 0.06, 0.065], tail: t => [-0.38 - 0.2 * t, 0.28 - 0.1 * Math.sin(t * 3), 0.05 * t] })], w: 1.4, d: 0.4, pl: [1.2, 0.4, 0.08] }),
  'ANI-STAG': () => { const P = [U(box([0, 0.12, 0], [0.18, 0.12, 0.14], 0.02), 0.02), U(cap([0, 0.24, -0.02], [0, 0.48, 0.04], 0.13, 0.08), 0.06), U(ell([0, 0.55, 0.12], [0.07, 0.07, 0.14]), 0.05), U(ell([0.08, 0.6, 0.06], [0.05, 0.02, 0.02])), U(ell([-0.08, 0.6, 0.06], [0.05, 0.02, 0.02]))];
    [1, -1].forEach(s => { P.push(U(curve(t => [s * (0.04 + 0.2 * t), 0.6 + 0.38 * t, 0.04 - 0.08 * t], 8, 0.022, 0.012), 0.01)); [0.3, 0.55, 0.8].forEach(u => P.push(U(cap([s * (0.04 + 0.2 * u), 0.6 + 0.38 * u, 0.04 - 0.08 * u], [s * (0.04 + 0.2 * u + 0.03), 0.6 + 0.38 * u + 0.12, 0.1 - 0.08 * u], 0.012, 0.006), 0.01))); });
    return { P, w: 0.6, d: 0.45, pl: [0.45, 0.4, 0.1] }; },
  'ANI-SWANS': () => { const P = [U(box([0, 0.08, 0], [0.4, 0.08, 0.16], 0.03), 0.02)]; [1, -1].forEach(s => { P.push(U(ell([s * 0.24, 0.28, 0], [0.2, 0.13, 0.13]), 0.05), U(ell([s * 0.33, 0.32, 0], [0.1, 0.12, 0.13]), 0.06),
      U(curve(t => [s * (0.12 + 0.14 * Math.sin(t * Math.PI) - 0.1 * t), 0.36 + 0.38 * t, 0], 12, 0.045, 0.028), 0.03), U(ell([s * 0.035, 0.75, 0], [0.045, 0.035, 0.03]), 0.02), U(cap([s * 0.01, 0.74, 0], [s * -0.03, 0.71, 0], 0.012, 0.006), 0.005)); }); return { P, w: 0.95, d: 0.4, pl: [0.9, 0.38, 0.06] }; },
  'ANI-TORTOISE': () => ({ P: [U(ell([0, 0.2, 0], [0.38, 0.22, 0.3]), 0.03), SUB(box([0, -0.05, 0], [0.6, 0.09, 0.5]), 0.01), U(ell([0, 0.06, 0], [0.4, 0.04, 0.31]), 0.03), U(cap([0.36, 0.1, 0], [0.5, 0.18, 0], 0.06, 0.05), 0.04), U(ell([0.52, 0.19, 0], [0.07, 0.05, 0.05]), 0.03),
    ...[[0.24, 0.24], [0.24, -0.24], [-0.24, 0.24], [-0.24, -0.24]].map(([x, z]) => U(cap([x, 0.08, z], [x * 1.15, 0.0, z * 1.2], 0.05, 0.045), 0.03))], w: 1.2, d: 0.8, pl: [0.95, 0.7, 0.06] }),
  // Buddha
  'BUD-DHYAN': () => ({ P: [...seatedBase(), ...torsoHead(0.06, { bud: 1 }), ...arm([0.22, 0.53, 0], [0.25, 0.36, 0.08], [0.07, 0.22, 0.16]), ...arm([-0.22, 0.53, 0], [-0.25, 0.36, 0.08], [-0.07, 0.22, 0.16]), U(ell([0, 0.22, 0.16], [0.1, 0.03, 0.06]), 0.03)], w: 0.95, d: 0.6, pl: [0.85, 0.55, 0.12] }),
  'BUD-ABHAYA': () => ({ P: [...seatedBase(), ...torsoHead(0.06, { bud: 1 }), ...arm([0.22, 0.53, 0], [0.26, 0.35, 0.09], [0.24, 0.56, 0.15]), U(ell([0.24, 0.6, 0.15], [0.045, 0.07, 0.02]), 0.02), ...arm([-0.22, 0.53, 0], [-0.25, 0.36, 0.08], [-0.07, 0.22, 0.16])], w: 0.95, d: 0.6, pl: [0.85, 0.55, 0.12] }),
  'BUD-BHUMI': () => ({ P: [...seatedBase(), ...torsoHead(0.06, { bud: 1 }), ...arm([0.22, 0.53, 0], [0.26, 0.35, 0.08], [0.32, 0.13, 0.22]), ...arm([-0.22, 0.53, 0], [-0.25, 0.36, 0.08], [-0.07, 0.22, 0.16])], w: 0.95, d: 0.6, pl: [0.85, 0.55, 0.12] }),
  'BUD-LOTUS': () => { const P = [U(cyl([0, 0.09, 0], 0.32, 0.18), 0.04)]; for (let i = 0; i < 14; i++) { const a = i * Math.PI * 2 / 14; P.push(U(ell([Math.cos(a) * 0.33, 0.12, Math.sin(a) * 0.33], [0.08, 0.1, 0.05]), 0.03)); }
    return { P: [...P, ...seatedBase(0.18).map(x => x), ...torsoHead(0.24, { bud: 1 }), ...arm([0.22, 0.71, 0], [0.25, 0.54, 0.08], [0.07, 0.4, 0.16]), ...arm([-0.22, 0.71, 0], [-0.25, 0.54, 0.08], [-0.07, 0.4, 0.16])], w: 0.95, d: 0.8, pl: [0.85, 0.75, 0.08], sy: 1.2 }; },
  'BUD-MONK': () => ({ P: [...seatedBase(), ...torsoHead(0.04, { head: 1.35 }), ...arm([0.2, 0.5, 0], [0.22, 0.36, 0.1], [0.02, 0.44, 0.16]), ...arm([-0.2, 0.5, 0], [-0.22, 0.36, 0.1], [-0.02, 0.44, 0.16])], w: 0.95, d: 0.6, pl: [0.8, 0.55, 0.12] }),
  'BUD-BUST': () => ({ P: [U(ell([0, 0.24, 0], [0.3, 0.24, 0.16]), 0.06), U(ell([0, 0.46, 0], [0.34, 0.09, 0.15]), 0.06), U(cap([0, 0.5, 0], [0, 0.62, 0.01], 0.08), 0.03), U(ell([0, 0.76, 0.02], [0.15, 0.18, 0.16]), 0.03), U(sph([0, 0.95, 0], 0.07), 0.03),
    U(ell([0.15, 0.75, 0], [0.025, 0.09, 0.04]), 0.01), U(ell([-0.15, 0.75, 0], [0.025, 0.09, 0.04]), 0.01), U(ell([0, 0.73, 0.17], [0.025, 0.04, 0.03]), 0.01), U(cap([0.18, 0.3, 0.12], [0.02, 0.32, 0.2], 0.04), 0.02), U(cap([-0.18, 0.3, 0.12], [-0.02, 0.32, 0.2], 0.04), 0.02), U(ell([0, 0.36, 0.2], [0.03, 0.08, 0.03]), 0.02)], w: 0.75, d: 0.45, pl: [0.6, 0.42, 0.14] }),
  'BUD-HEAD': () => { const P = [U(box([0, 0.1, 0], [0.18, 0.1, 0.16], 0.02), 0.02), U(cap([0, 0.2, 0], [0, 0.36, 0.01], 0.12, 0.1), 0.04), U(ell([0, 0.56, 0.02], [0.2, 0.25, 0.21]), 0.03), U(sph([0, 0.82, 0], 0.09), 0.04), U(ell([0.2, 0.52, 0], [0.035, 0.13, 0.05]), 0.02), U(ell([-0.2, 0.52, 0], [0.035, 0.13, 0.05]), 0.02), U(ell([0, 0.53, 0.22], [0.035, 0.06, 0.04]), 0.02)];
    for (let i = 0; i < 26; i++) { const a = i * 2.4, b = 0.25 + (i % 6) * 0.12; P.push(U(sph([Math.cos(a) * 0.19 * Math.cos(b), 0.62 + 0.2 * Math.sin(b), Math.sin(a) * 0.19 * Math.cos(b) - 0.02], 0.03), 0.008)); } return { P, w: 0.55, d: 0.55, pl: [0.42, 0.4, 0.1] }; },
  'BUD-FACE': () => ({ P: [U(box([0, 0.5, -0.04], [0.28, 0.5, 0.05], 0.02), 0.01), U(ell([0, 0.66, 0.02], [0.12, 0.15, 0.08]), 0.03), U(sph([0, 0.82, 0.0], 0.05), 0.03), U(ell([0, 0.38, 0.0], [0.2, 0.2, 0.05]), 0.04), U(cap([0.12, 0.3, 0.03], [0.1, 0.5, 0.05], 0.035), 0.02), U(ell([0.1, 0.53, 0.05], [0.04, 0.06, 0.02]), 0.02)], w: 0.65, d: 0.3, pl: [0.65, 0.3, 0.1] }),
  'BUD-RECLINE': () => ({ P: [U(box([0, 0.06, 0], [0.95, 0.06, 0.2], 0.02), 0.02), U(ell([0.05, 0.22, 0], [0.62, 0.12, 0.15]), 0.06), U(ell([-0.5, 0.3, 0.02], [0.2, 0.15, 0.14]), 0.06), U(ell([-0.78, 0.36, 0.02], [0.1, 0.12, 0.1]), 0.03), U(sph([-0.82, 0.46, 0.0], 0.04), 0.02),
    U(cap([-0.72, 0.16, 0.05], [-0.86, 0.3, 0.04], 0.04), 0.03), U(cap([0.4, 0.18, 0.02], [0.88, 0.14, 0], 0.08, 0.05), 0.05)], w: 2.0, d: 0.45, pl: [1.9, 0.4, 0.06] }),
  'BUD-STAND': () => ({ P: [...robe([0, 0.62, 0], [0, 0.03, 0], 0.13, 0.17), ...torsoHead(0.25, { bud: 1, sh: 0.8 }).slice(1), ...arm([0.17, 0.73, 0], [0.2, 0.57, 0.06], [0.18, 0.74, 0.12]), U(ell([0.18, 0.77, 0.12], [0.04, 0.06, 0.02]), 0.02), ...arm([-0.17, 0.73, 0], [-0.2, 0.56, 0.04], [-0.17, 0.43, 0.08])], w: 0.5, d: 0.4, pl: [0.4, 0.35, 0.08], sy: 1.05 }),
  // human (draped)
  'HUM-DANCER': () => ({ P: [...robe([0, 0.6, 0], [0.04, 0.08, 0], 0.11, 0.16), U(cap([0.04, 0.08, 0], [0.04, 0.0, 0.03], 0.04), 0.02), ...torsoHead(0.22, { hair: 1, sh: 0.75 }).slice(1), ...arm([0.16, 0.7, 0], [0.3, 0.8, 0.04], [0.38, 0.95, 0.05], 0.035), ...arm([-0.16, 0.7, 0], [-0.3, 0.62, 0.05], [-0.42, 0.66, 0.08], 0.035), U(curve(t => [-0.42 + 0.2 * t, 0.66 - 0.4 * t, 0.08 - 0.12 * t], 6, 0.02, 0.05), 0.04)], w: 0.95, d: 0.4, pl: [0.3, 0.3, 0.1], sy: 1.05 }),
  'HUM-FLUTE': () => ({ P: [U(box([0, 0.14, -0.04], [0.2, 0.14, 0.16], 0.02), 0.02), U(ell([0, 0.3, 0.1], [0.24, 0.07, 0.18]), 0.05), ...torsoHead(0.24, { hair: 1 }), ...arm([0.2, 0.71, 0], [0.24, 0.6, 0.12], [0.12, 0.72, 0.16]), ...arm([-0.2, 0.71, 0], [-0.22, 0.6, 0.12], [-0.06, 0.72, 0.15]), U(cap([0.2, 0.75, 0.17], [-0.24, 0.83, 0.12], 0.012), 0.005)], w: 0.75, d: 0.6, pl: [0.55, 0.45, 0.08] }),
  'HUM-LOVERS': () => ({ P: [...robe([-0.06, 0.6, 0], [-0.06, 0.03, 0], 0.11, 0.15), ...robe([0.08, 0.62, -0.02], [0.08, 0.03, -0.02], 0.11, 0.14), U(ell([-0.06, 0.88, 0.02], [0.07, 0.08, 0.07]), 0.03), U(ell([0.08, 0.92, -0.01], [0.075, 0.085, 0.075]), 0.03),
    U(ell([-0.02, 0.7, 0], [0.2, 0.12, 0.13]), 0.06), ...arm([0.18, 0.76, 0], [0.12, 0.66, 0.1], [-0.12, 0.7, 0.08]), ...arm([-0.18, 0.74, 0], [-0.14, 0.64, 0.1], [0.1, 0.72, 0.09])], w: 0.5, d: 0.4, pl: [0.38, 0.32, 0.1], sy: 1.05 }),
  'HUM-MEDITATE': () => ({ P: [...seatedBase(), ...torsoHead(0.06, { hair: 1 }), ...arm([0.21, 0.53, 0], [0.26, 0.36, 0.08], [0.3, 0.17, 0.12]), ...arm([-0.21, 0.53, 0], [-0.26, 0.36, 0.08], [-0.3, 0.17, 0.12])], w: 0.95, d: 0.6, pl: [0.85, 0.55, 0.12] }),
  'HUM-MOTHER': () => ({ P: [...robe([0, 0.6, 0], [0, 0.03, 0], 0.12, 0.17), ...torsoHead(0.22, { hair: 1, sh: 0.8 }).slice(1), U(ell([0.04, 0.68, 0.13], [0.1, 0.07, 0.06]), 0.04), U(sph([0.12, 0.74, 0.14], 0.045), 0.02), ...arm([0.16, 0.73, 0], [0.18, 0.6, 0.1], [-0.04, 0.64, 0.17], 0.04), ...arm([-0.16, 0.73, 0], [-0.16, 0.58, 0.1], [0.08, 0.7, 0.17], 0.04)], w: 0.5, d: 0.45, pl: [0.38, 0.34, 0.1], sy: 1.05 }),
  'HUM-PROFILE': () => ({ P: [U(cap([0, 0.05, 0], [0, 0.5, 0], 0.17, 0.13), 0.06), U(ell([0, 0.72, 0.01], [0.13, 0.17, 0.14]), 0.04), U(ell([0, 0.75, -0.03], [0.16, 0.22, 0.16]), 0.06), U(ell([0, 0.7, 0.14], [0.02, 0.035, 0.02]), 0.01), U(curve(t => [0.15 - 0.02 * t, 0.85 - 0.6 * t, -0.02 + 0.06 * t], 6, 0.04, 0.06), 0.06)], w: 0.45, d: 0.45, pl: [0.32, 0.32, 0.1], sy: 1.05 }),
  'HUM-READER': () => ({ P: [U(box([0, 0.14, -0.06], [0.2, 0.14, 0.15], 0.02), 0.02), U(cap([0.08, 0.3, 0], [0.1, 0.32, 0.22], 0.07), 0.04), U(cap([-0.08, 0.3, 0], [-0.06, 0.3, 0.22], 0.07), 0.04), U(cap([0.1, 0.32, 0.22], [0.1, 0.0, 0.26], 0.055), 0.03), U(cap([-0.06, 0.3, 0.22], [-0.06, 0.0, 0.26], 0.055), 0.03),
    ...torsoHead(0.24, { hair: 1, sh: 0.85 }), ...arm([0.18, 0.71, 0], [0.18, 0.56, 0.1], [0.06, 0.52, 0.18], 0.04), ...arm([-0.18, 0.71, 0], [-0.18, 0.56, 0.1], [-0.06, 0.52, 0.18], 0.04), U(box([0, 0.53, 0.2], [0.09, 0.01, 0.06], 0.004, 0), 0.01)], w: 0.6, d: 0.6, pl: [0.5, 0.45, 0.08] }),
  'HUM-THINKER': () => ({ P: [U(box([0, 0.14, -0.06], [0.2, 0.14, 0.15], 0.02), 0.02), U(cap([0.08, 0.3, 0], [0.1, 0.32, 0.22], 0.075), 0.04), U(cap([-0.08, 0.3, 0], [-0.06, 0.3, 0.22], 0.075), 0.04), U(cap([0.1, 0.32, 0.22], [0.1, 0.0, 0.26], 0.06), 0.03), U(cap([-0.06, 0.3, 0.22], [-0.06, 0.0, 0.26], 0.06), 0.03),
    ...torsoHead(0.22, { sh: 0.9 }), ...arm([0.2, 0.69, 0], [0.1, 0.36, 0.2], [0.03, 0.62, 0.12], 0.045), ...arm([-0.2, 0.69, 0], [-0.16, 0.45, 0.12], [0.0, 0.36, 0.22], 0.045)], w: 0.6, d: 0.6, pl: [0.5, 0.45, 0.08] }),
  'HUM-TORSO': () => ({ P: [U(cap([0, 0.05, 0], [0, 0.5, 0], 0.13, 0.15), 0.08), U(ell([0, 0.6, 0], [0.17, 0.2, 0.11]), 0.08), U(ell([0, 0.78, 0], [0.2, 0.07, 0.1]), 0.06), U(cap([0, 0.8, 0], [0, 0.88, 0], 0.05), 0.03), U(curve(t => [0.18 - 0.36 * t, 0.75 - 0.5 * t, 0.1], 8, 0.03, 0.05), 0.05)], w: 0.45, d: 0.35, pl: [0.3, 0.3, 0.14], sy: 1.05 }),
  'HUM-YOGA': () => ({ P: [U(cap([0, 0.03, 0], [0.0, 0.42, 0], 0.045, 0.06), 0.03), U(cap([0.05, 0.4, 0], [0.2, 0.3, 0.04], 0.055, 0.045), 0.03), U(cap([0.2, 0.3, 0.04], [0.03, 0.22, 0.02], 0.045, 0.03), 0.03), ...torsoHead(0.2, { hair: 1, sh: 0.7 }), ...arm([0.15, 0.67, 0], [0.13, 0.84, 0], [0.01, 1.0, 0.01], 0.035), ...arm([-0.15, 0.67, 0], [-0.13, 0.84, 0], [-0.01, 1.0, 0.01], 0.035)], w: 0.5, d: 0.35, pl: [0.3, 0.3, 0.1], sy: 1.12 }),
};
export const SC_CODES = Object.keys(R);
export function scCode(sku) { const c = String(sku || '').replace(/^MTO-SC-/, '').replace(/-(FRP|STN)$/, ''); return R[c] ? c : null; }

// ---- the mesh: sample the field into marching cubes, keep the triangles
const CACHE = {};
function shapeGeo(code, res) {
  const k = code + res; if (CACHE[k]) return CACHE[k];
  const D = R[code](), P = D.P, ext = Math.max(D.w, D.d, (D.sy || 1) * 1.02), half = ext / 2;
  const mc = new MarchingCubes(res, new THREE.MeshBasicMaterial(), false, false, 200000), f = mc.field, n = mc.size, iso = mc.isolation, K = iso / (2 * half / n * 1.6);
  const p = [0, 0, 0], us = P.filter(x => !x.sub), ss = P.filter(x => x.sub);
  for (let z = 0; z < n; z++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    p[0] = (x - n / 2) / (n / 2) * half; p[1] = (y - n / 2) / (n / 2) * half + half; p[2] = (z - n / 2) / (n / 2) * half;
    let d = 1e9; for (const u of us) d = smin(d, u.f(p), u.k); for (const s of ss) d = smax(d, -s.f(p), s.k);
    if (p[1] < 0) d = Math.max(d, -p[1]);   // flat bottom on the plinth
    f[x + y * n + z * n * n] = iso - d * K;
  }
  mc.update();
  const g = new THREE.BufferGeometry(), cnt = mc.count;
  g.setAttribute('position', new THREE.BufferAttribute(mc.positionArray.slice(0, cnt * 3), 3)); g.setAttribute('normal', new THREE.BufferAttribute(mc.normalArray.slice(0, cnt * 3), 3));
  g.scale(half, half, half); g.translate(0, half, 0);
  mc.geometry.dispose();
  return (CACHE[k] = { g, D });
}

// finishes
const FIN = [[/makrana|white marble|marble/i, 0xEFEBE4, 0.35, 0], [/polished/i, 0x18181A, 0.12, 0.05], [/granite|black stone|matte black|black/i, 0x262628, 0.55, 0], [/red/i, 0xA4634C, 0.85, 0],
  [/sandstone|beige/i, 0xCDB48E, 0.85, 0], [/gold/i, 0x6B5232, 0.4, 0.6], [/bronze/i, 0x4E3B28, 0.45, 0.55], [/grey/i, 0x8E8C88, 0.8, 0]];
export function scMat(name) { const s = name || ''; for (const [re, c, r, m] of FIN) if (re.test(s)) return { color: c, roughness: r, metalness: m, gold: /gold/i.test(s) }; return { color: 0x8E8C88, roughness: 0.8, metalness: 0 }; }
export function scSpec(sku, m, o) {
  const code = scCode(sku) || 'ABS-WAVE', sizes = (m.sizes || []).map(s => s.label), sz = o.size || sizes[1] || sizes[0] || '3 ft', H = +(/(\d+(?:\.\d+)?)/.exec(sz) || [0, 3])[1] || 3;
  const mats = m.materials || [], mat = mats.find(x => x.name === o.material) || mats[0] || {}, col = o.colour || ((mat.colours || [])[0] || {}).name || '';
  return { code, H, fin: (mat.name || '') + ' ' + col };
}
export function scModel(sp, res) {
  const { g, D } = shapeGeo(sp.code, res || 64), F = scMat(sp.fin), pl = D.pl, ph = pl[2], s = sp.H / (1 * (D.sy || 1) + ph);
  const G = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: F.color, roughness: F.roughness, metalness: F.metalness, emissive: F.gold ? 0x2A1C08 : 0 });
  const mesh = new THREE.Mesh(g, m); mesh.scale.setScalar(s); mesh.position.y = ph * s; mesh.castShadow = mesh.receiveShadow = true; G.add(mesh);
  const pm = new THREE.MeshStandardMaterial({ color: /marble|white/i.test(sp.fin) ? 0xE6E2DA : /sandstone|beige|red/i.test(sp.fin) ? new THREE.Color(F.color).multiplyScalar(0.92) : 0x232325, roughness: 0.6 });
  const pb = new THREE.Mesh(new THREE.BoxGeometry(pl[0] * s, ph * s, pl[1] * s), pm); pb.position.y = ph * s / 2; pb.castShadow = pb.receiveShadow = true; G.add(pb);
  return { g: G, W: Math.max(D.w, pl[0]) * s, D: Math.max(D.d, pl[1]) * s, H: sp.H };
}
export function scStudio(sp) {
  const S = new THREE.Group(), M = scModel(sp); S.add(M.g);
  const span = Math.max(M.W, M.D, M.H) ;
  studioFloor(S, -span - 5, -span - 4, 2 * span + 10, 2 * span + 10);
  person(S, M.W / 2 + 1.8, -1.6, -0.5);
  return { g: S, L: M.W, D: M.D, H: M.H, span: Math.max(M.H * 2.2, M.W * 1.6 + 2, 5.5) };
}
