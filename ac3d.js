// outrr design studio — AC covers (309, owner: "baki categories ke 3D models"): all 26 outrr AC outdoor-unit covers
// (MTO-AC-*) drawn live at the picked unit size and colour, round an AC unit, against a terrace wall with its copper pipes.
// Floor covers stand on 4 feet with a lid; wall covers hang on brackets; the long ones cover 2–3 units; planter tops hold
// plants. Each face (front + both ends) is its design — CNC-cut jali (art deco fans, bamboo, stars, lotus mandala, monstera,
// quatrefoil, Mughal stars, paisley, peacocks, tree of life, arches, hexagons, leaves), louvres or WPC slats, or a green wall.
// Units: feet, y up; the wall is behind (−z).
import * as THREE from './vendor/three/three.module.min.js';
import { studioFloor, wall as sWall, person } from './studio3d.js?v=7';
import { plantModel } from './plants3d.js?v=4';

const M = {};
const mt = (k, o) => M[k] || (M[k] = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.6 }, o)));
function bx(g, w, h, d, x, y, z, m) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b; }
const COLS = [[/champagne/i, '#B9A27A'], [/charcoal grey/i, '#3C3D3F'], [/charcoal/i, '#232325'], [/ivory/i, '#EFE9DA'], [/off.?white/i, '#ECE8DF'], [/beige/i, '#C9B79A'], [/antique bronze/i, '#6E604E'],
  [/bronze/i, '#5A4030'], [/sage/i, '#9DAE8F'], [/terracotta/i, '#B5553A'], [/corten|rust/i, '#7A4128'], [/walnut/i, '#5E3C26'], [/ash/i, '#8E8A84'], [/teak/i, '#8A5A33']];
const colOf = s => { for (const [re, c] of COLS) if (re.test(s || '')) return c; return '#232325'; };
const TAU = Math.PI * 2;
const perfBg = F => { F.cut(shape(c => c.rect(0, 0, F.W, F.H))); F.add(shape(c => { c.rect(0, 0, F.W, F.H); const s = F.k * 0.11; for (let y = s / 2, j = 0; y < F.H; y += s * 0.87, j++) for (let x = s / 2 + (j % 2 ? s / 2 : 0); x < F.W; x += s) { c.moveTo(x + s * 0.33, y); c.arc(x, y, s * 0.33, 0, TAU); } })); };

// a face drawn on canvases: colour + see-through (white = metal, black = cut)
function face(w, h, draw, col, k) {
  k = k || 110; const W = Math.round(w * k), H = Math.round(h * k), mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const C = mk(), A = mk(), c = C.getContext('2d'), a = A.getContext('2d');
  c.fillStyle = col; c.fillRect(0, 0, W, H); a.fillStyle = '#fff'; a.fillRect(0, 0, W, H);
  const both = f => { f(c, '#000'); f(a, '#000'); };   // cut a shape out of the sheet
  const fillBoth = (f, cc) => { f(c, cc || col); f(a, '#fff'); };   // add metal back
  draw({ c, a, W, H, k, col, cut: both, add: fillBoth });
  const bd = Math.round(k * 0.1); fillBoth(shape(cc => { cc.rect(0, 0, W, H); cc.rect(bd, bd, W - 2 * bd, H - 2 * bd); }));   // a solid edge all round
  const tc = new THREE.CanvasTexture(C), ta = new THREE.CanvasTexture(A); tc.colorSpace = THREE.SRGBColorSpace; tc.anisotropy = ta.anisotropy = 4;
  const m = new THREE.MeshStandardMaterial({ map: tc, alphaMap: ta, alphaTest: 0.5, roughness: 0.55, metalness: 0.2, side: THREE.DoubleSide });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.castShadow = true; p.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaMap: ta, alphaTest: 0.5 }); return p;
}
const shape = (fn) => (ctx, fill) => { ctx.fillStyle = fill; ctx.beginPath(); fn(ctx); ctx.fill('evenodd'); };
// patterns: f(F) draws cuts over the whole face
const grid = (F, sx, sy, fn, stag) => { for (let j = -1, y = 0; y < F.H + sy; j++, y = j * sy) for (let i = -1, x = 0; x < F.W + sx; i++, x = i * sx) fn(x + (stag && j % 2 ? sx / 2 : 0), y, i, j); };
const P = {
  fans: F => { const s = F.k * 0.42; grid(F, s, s * 0.62, (x, y) => { for (let r = 0; r < 7; r++) { const a0 = Math.PI + r * Math.PI / 7 + 0.05, a1 = a0 + Math.PI / 7 - 0.1; F.cut(shape(c => { c.moveTo(x, y + s * 0.5); c.arc(x, y + s * 0.5, s * 0.46, a0, a1); c.closePath(); })); } }, true); },
  bamboo: F => { perfBg(F); F.cut(shape(c => c.rect(0, 0, 0, 0.06, F.W * 0.92, F.H * 0.9))); for (let i = 0; i < 9; i++) { const x = F.W * (0.08 + i * 0.105), w = F.k * 0.06;
      F.add(shape(c => c.rect(x, F.H * 0.06, w, F.H * 0.9))); for (let y = F.H * 0.15; y < F.H * 0.95; y += F.k * 0.45) { F.add(shape(c => c.rect(x - 2, y, w + 4, 4)));
        F.add(shape(c => { c.ellipse(x + w * 2.4 * (i % 2 ? 1 : -1), y - 8, F.k * 0.14, F.k * 0.035, (i % 2 ? -0.5 : 0.5), 0, TAU); })); } } },
  stars: F => { const s = F.k * 0.38; grid(F, s, s, (x, y) => F.cut(shape(c => { for (let p = 0; p < 16; p++) { const r = p % 2 ? s * 0.2 : s * 0.42, an = p * TAU / 16; c.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r); } c.closePath(); }))); },
  lotus: F => { F.cut(shape(c => c.rect(0, 0, F.W, F.H))); const cx = F.W / 2, cy = F.H / 2, R = Math.min(F.W, F.H) * 0.47;
    F.add(shape(c => { c.rect(0, 0, F.W, F.H); c.arc(cx, cy, R, 0, TAU, true); }));
    for (let ring = 0; ring < 4; ring++) { const n = 8 + ring * 6, r0 = R * (0.12 + ring * 0.22), r1 = r0 + R * 0.2; for (let i = 0; i < n; i++) { const an = i * TAU / n; F.add(shape(c => { c.moveTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0); c.quadraticCurveTo(cx + Math.cos(an + 0.5 / (ring + 1)) * r1, cy + Math.sin(an + 0.5 / (ring + 1)) * r1, cx + Math.cos(an) * (r1 + 6), cy + Math.sin(an) * (r1 + 6)); c.quadraticCurveTo(cx + Math.cos(an - 0.5 / (ring + 1)) * r1, cy + Math.sin(an - 0.5 / (ring + 1)) * r1, cx + Math.cos(an) * r0, cy + Math.sin(an) * r0); })); }
      F.add(shape(c => { c.arc(cx, cy, r0, 0, TAU); c.arc(cx, cy, r0 - 3, 0, TAU, true); })); }
    grid(F, F.k * 0.22, F.k * 0.22, (x, y) => { if (Math.hypot(x - cx, y - cy) > R + 6) F.cut(shape(c => c.arc(x, y, F.k * 0.06, 0, TAU))); }); },
  monstera: F => { perfBg(F); F.cut(shape(c => c.rect(0, 0, 0, 0.05, F.W * 0.92, F.H * 0.9))); [[0.3, 0.45, 0.32, 0.4], [0.7, 0.35, 0.28, -0.6], [0.6, 0.78, 0.22, 0.9], [0.15, 0.8, 0.18, -1.2]].forEach(([u, v, r, rot]) => {
      const x = F.W * u, y = F.H * v, R = Math.min(F.W, F.H) * r; F.add(shape(c => { c.ellipse(x, y, R, R * 0.8, rot, 0, TAU); }));
      for (let i = 0; i < 7; i++) { const an = rot + (i - 3) * 0.38; F.cut(shape(c => { c.ellipse(x + Math.cos(an) * R * 0.62, y + Math.sin(an) * R * 0.5, R * 0.28, R * 0.05, an, 0, TAU); })); } F.cut(shape(c => c.rect(x - 2, y - R * 0.1, R * 0.9, 4))); }); },
  quatre: F => { const s = F.k * 0.42; grid(F, s, s, (x, y) => F.cut(shape(c => { const r = s * 0.17; c.arc(x - r, y, r, 0, TAU); c.moveTo(x + 2 * r, y); c.arc(x + r, y, r, 0, TAU); c.moveTo(x + r, y - r); c.arc(x, y - r, r, 0, TAU); c.moveTo(x + r, y + r); c.arc(x, y + r, r, 0, TAU); c.rect(x - r, y - r, 2 * r, 2 * r); })), true); },
  mughal: F => { const s = F.k * 0.4; grid(F, s, s, (x, y) => { F.cut(shape(c => { for (let p = 0; p < 16; p++) { const r = p % 2 ? s * 0.16 : s * 0.3, an = p * TAU / 16 + TAU / 32; c.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r); } c.closePath(); }));
      F.cut(shape(c => c.rect(x + s * 0.38, y + s * 0.38, s * 0.24, s * 0.24))); }); },
  paisley: F => { const s = F.k * 0.45; grid(F, s, s * 0.8, (x, y, i, j) => F.cut(shape(c => { const r = s * 0.16, f = (i + j) % 2 ? 1 : -1; c.arc(x, y, r, 0, TAU); c.moveTo(x - r * f, y); c.quadraticCurveTo(x - r * 1.4 * f, y - r * 2.4, x + r * 0.9 * f, y - r * 2.2); c.quadraticCurveTo(x + r * 0.2 * f, y - r * 1.2, x + r * f, y); })), true); },
  peacock: F => { perfBg(F); F.cut(shape(c => c.rect(0, 0, 0, 0.05, F.W * 0.92, F.H * 0.9))); for (const sgn of [-1, 1]) { const x = F.W / 2 + sgn * F.W * 0.17, y = F.H * 0.55;
      F.add(shape(c => c.ellipse(x, y, F.W * 0.06, F.H * 0.15, sgn * 0.25, 0, TAU))); F.add(shape(c => { c.ellipse(x - sgn * F.W * 0.03, y - F.H * 0.24, F.W * 0.02, F.H * 0.1, 0, 0, TAU); }));
      for (let i = 0; i < 11; i++) { const an = Math.PI / 2 + sgn * (0.2 + i * 0.17), L = F.H * 0.42; F.add(shape(c => { c.moveTo(x, y + F.H * 0.1); c.lineTo(x + Math.cos(an) * L * sgn * 0 + sgn * Math.sin(i * 0.17 + 0.2) * L, y + F.H * 0.1 + Math.cos(i * 0.17 + 0.2) * L * 0.6); c.lineTo(x + sgn * Math.sin(i * 0.17 + 0.25) * L, y + F.H * 0.1 + Math.cos(i * 0.17 + 0.25) * L * 0.6); c.closePath(); }));
        F.add(shape(c => c.ellipse(x + sgn * Math.sin(i * 0.17 + 0.22) * L * 0.95, y + F.H * 0.1 + Math.cos(i * 0.17 + 0.22) * L * 0.57, 7, 10, 0, 0, TAU))); } } },
  tree: F => { perfBg(F); F.cut(shape(c => c.rect(0, 0, 0, 0.05, F.W * 0.92, F.H * 0.9))); const cx = F.W / 2, by = F.H * 0.92; F.add(shape(c => c.rect(cx - F.k * 0.08, F.H * 0.45, F.k * 0.16, by - F.H * 0.45)));
    const br = (x, y, an, len, d) => { if (d > 5) return; const x2 = x + Math.cos(an) * len, y2 = y + Math.sin(an) * len; F.add((ctx, fill) => { ctx.strokeStyle = fill; ctx.lineWidth = Math.max(2, 14 - d * 2.6); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke(); });
      if (d > 2) F.add(shape(c => c.ellipse(x2, y2, 9, 5, an, 0, TAU))); br(x2, y2, an - 0.45, len * 0.72, d + 1); br(x2, y2, an + 0.45, len * 0.72, d + 1); };
    br(cx, F.H * 0.47, -Math.PI / 2 - 0.5, F.H * 0.17, 0); br(cx, F.H * 0.47, -Math.PI / 2 + 0.5, F.H * 0.17, 0); br(cx, F.H * 0.45, -Math.PI / 2, F.H * 0.15, 1); },
  arch: F => { const sx = F.k * 0.3, sy = F.k * 0.45; grid(F, sx, sy, (x, y) => F.cut(shape(c => { c.moveTo(x - sx * 0.32, y + sy * 0.36); c.lineTo(x - sx * 0.32, y); c.quadraticCurveTo(x - sx * 0.32, y - sy * 0.3, x, y - sy * 0.4); c.quadraticCurveTo(x + sx * 0.32, y - sy * 0.3, x + sx * 0.32, y); c.lineTo(x + sx * 0.32, y + sy * 0.36); c.closePath(); })), true); },
  hex: F => { const s = F.k * 0.2; grid(F, s * 1.73, s * 1.5, (x, y) => F.cut(shape(c => { for (let p = 0; p < 6; p++) { const an = p * TAU / 6 + TAU / 12; c.lineTo(x + Math.cos(an) * s * 0.82, y + Math.sin(an) * s * 0.82); } c.closePath(); })), true); },
  leaf: F => { const s = F.k * 0.36; grid(F, s, s, (x, y, i, j) => F.cut(shape(c => c.ellipse(x, y, s * 0.4, s * 0.12, ((i + j) % 4) * Math.PI / 4, 0, TAU))), true); }
};
const D = {   // design → { look, kind: floor | wall | run, top: lid | planter }
  'CNC-ARTDECO': ['fans'], 'CNC-BAMBOO': ['bamboo'], 'CNC-GEOMETRIC': ['stars'], 'CNC-LOTUS': ['lotus'], 'CNC-MONSTERA': ['monstera'], 'CNC-MOROCCAN': ['quatre'], 'CNC-MUGHAL': ['mughal'],
  'CNC-PAISLEY': ['paisley'], 'CNC-PEACOCK': ['peacock'], 'CNC-TREE': ['tree'], 'GREEN': ['green'], 'JALI-ARCH': ['arch'], 'JALI-GEO': ['hex'], 'JALI-LEAF': ['leaf'],
  'LOUVER-H': ['louvH'], 'LOUVER-V': ['louvV'], 'LOUVER-PLANTER': ['louvH', 'floor', 'planter'], 'RUN-JALI': ['hex', 'run'], 'RUN-LOUVER': ['louvH', 'run'], 'RUN-SLAT': ['slatH', 'run', 'shelf'],
  'SLAT-H': ['slatH'], 'SLAT-V': ['slatV'], 'SLAT-PLANTER': ['slatV', 'floor', 'planter'], 'WALL-JALI': ['hex', 'wall'], 'WALL-LOUVER': ['louvH', 'wall'], 'WALL-SLAT': ['slatV', 'wall']
};
export const AC_CODES = Object.keys(D);
export function acCode(sku) { const c = String(sku || '').replace(/^MTO-AC-/, ''); return D[c] ? c : null; }

// the AC outdoor unit inside: grey box, round fan grille
function acUnit(g, w, h, d, x, y, z) { const u = new THREE.Group(); u.position.set(x, y, z); g.add(u); bx(u, w, h, d, 0, h / 2, 0, mt('acu', { color: 0xDCDCD8, roughness: 0.5 }));
  const r = Math.min(w * 0.3, h * 0.38), fan = new THREE.Mesh(new THREE.CircleGeometry(r, 30), mt('acf', { color: 0x4A4C4E, roughness: 0.7 })); fan.position.set(-w * 0.12, h / 2, d / 2 + 0.01); u.add(fan);
  for (let i = 1; i < 5; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(r * i / 4.5, 0.012, 4, 30), mt('acg', { color: 0xBDBDB8 })); t.position.copy(fan.position); t.position.z += 0.01; u.add(t); } return u; }

// a slatted / louvred face as 3D strips
function strips(g, w, h, dir, kind, fm, ox, oy, oz, ry) {
  const s = new THREE.Group(); s.position.set(ox, oy, oz); s.rotation.y = ry || 0; g.add(s);
  if (dir === 'h') { const p = kind === 'louv' ? 0.28 : 0.27, sh = kind === 'louv' ? 0.2 : 0.17; for (let y = 0.08; y < h - 0.05; y += p) { const b = bx(s, w, sh, kind === 'louv' ? 0.03 : 0.07, 0, y + sh / 2, 0, fm); if (kind === 'louv') b.rotation.x = -0.6; } }
  else { const p = kind === 'louv' ? 0.24 : 0.25, sw = kind === 'louv' ? 0.18 : 0.17; for (let x = -w / 2 + 0.06; x < w / 2 - 0.05; x += p) { const b = bx(s, sw, h, kind === 'louv' ? 0.03 : 0.07, x + sw / 2, h / 2, 0, fm); if (kind === 'louv') b.rotation.y = 0.6; } }
}
function faceMesh(look, w, h, col) {
  if (look === 'green') { const t = face(w, h, F => { const c = F.c; for (let i = 0; i < w * h * 900; i++) { c.fillStyle = ['#3E6B2F', '#4F7F38', '#2F5626', '#6A9445'][i % 4]; c.beginPath(); c.ellipse(Math.random() * F.W, Math.random() * F.H, 5 + Math.random() * 6, 3 + Math.random() * 3, Math.random() * 3, 0, TAU); c.fill(); } }, '#355E2A', 80); return t; }
  return face(w, h, F => (P[look] || P.hex)(F), col);
}
export function acSpec(sku, m, o) {
  const code = acCode(sku) || 'JALI-GEO', mats = m.materials || [], mat = mats.find(x => x.name === o.material) || mats[0] || {};
  const colN = o.colour || ((mat.colours || [])[0] || {}).name || '', p = (m.pieces || [])[0] || {}, sizes = (m.sizes || []).map(s => s.label), si = Math.max(0, sizes.indexOf(o.size));
  const f = [0.9, 1, 1.08, 1.22][o.size ? si : 1] || 1;
  return { code, col: colOf(colN), green: /green/i.test(colN), frame: /off.?white/i.test(colN) ? '#ECE8DF' : '#2A2A2B', L: (+p.l || 3.6) * f, D: (+p.w || 1.9) * f, H: (+p.h || 2.8) * f };
}
export function acStudio(sp) {
  const S = new THREE.Group(), d = D[sp.code] || D['JALI-GEO'], look = d[0], kind = d[1] || 'floor', top = d[2] || (kind === 'run' ? 'lid' : 'lid');
  const run = kind === 'run', wallK = kind === 'wall', n = run ? 2 : 1, L = run ? Math.max(sp.L * 1.9, 6.5) : sp.L, Dp = sp.D, H = run ? Math.min(sp.H, 2.6) : sp.H;
  const wood = /^slat/.test(look), col = wood ? sp.col : sp.col, fm = wood ? mt('acw' + col, { color: new THREE.Color(col), roughness: 0.6 }) : mt('acm' + col, { color: new THREE.Color(col), roughness: 0.5, metalness: 0.25 });
  const frm = mt('acfr' + (wood ? 'b' : col), { color: new THREE.Color(wood ? '#2A2A2B' : col), roughness: 0.5, metalness: 0.3 });
  const wz = -Dp / 2 - 0.4, y0 = wallK ? 3.3 : 0.25, g = new THREE.Group(); g.position.y = y0; S.add(g);
  // the wall + copper pipes
  sWall(S, -L / 2 - 5, wz - 0.4, L / 2 + 5, wz - 0.4, 9, 0.75);
  const cu = mt('copper', { color: 0xB36A3C, metalness: 0.7, roughness: 0.35 }); for (const px of [L / 2 + 0.6, L / 2 + 0.75]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 9, 8), cu); p.position.set(px, 4.5, wz + 0.05); S.add(p); }
  // AC units inside
  const uw = (run ? L / n : L) - 0.9, uh = H - 0.7, ud = Dp - 0.8; for (let i = 0; i < n; i++) acUnit(g, Math.min(uw, 2.8), Math.min(uh, 2.1), Math.min(ud, 1.1), -L / 2 + (L / n) * (i + 0.5), wallK ? 0.15 : 0.05, -0.1);
  // frame: 4 posts + top ring + legs / brackets
  const t = 0.08; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { bx(g, t, H, t, sx * (L / 2 - t / 2), H / 2, sz * (Dp / 2 - t / 2), frm); if (!wallK) bx(g, 0.14, 0.25, 0.14, sx * (L / 2 - 0.1), -0.125, sz * (Dp / 2 - 0.1), frm); });
  if (wallK) { const wf = wz - 0.03; [-1, 1].forEach(sx => { const x = sx * (L / 2 - 0.3), za = wf, zb = Dp / 2 - 0.05; bx(S, 0.1, 0.1, zb - za, x, y0 - 0.05, (za + zb) / 2, frm);
    const a = new THREE.Vector3(x, y0 - 1.3, za), b = new THREE.Vector3(x, y0 - 0.1, zb - 0.2), v = b.clone().sub(a), r = new THREE.Mesh(new THREE.BoxGeometry(0.07, v.length(), 0.07), frm); r.position.copy(a.clone().add(b).multiplyScalar(0.5)); r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); r.castShadow = true; S.add(r);
    bx(S, 0.25, 0.3, 0.04, x, y0 - 1.25, wf + 0.02, frm); }); }
  // the faces: front, both ends
  const fh = H - 0.1;
  const put = (w, x, z, ry) => { if (look === 'louvH' || look === 'slatH') strips(g, w - 0.16, fh, 'h', look === 'louvH' ? 'louv' : 'slat', fm, x, 0.05, z, ry);
    else if (look === 'louvV' || look === 'slatV') strips(g, w - 0.16, fh, 'v', look === 'louvV' ? 'louv' : 'slat', fm, x, 0.05, z, ry);
    else { const f = faceMesh(look, w - 0.12, fh, sp.col); f.position.set(x, fh / 2 + 0.05, z); f.rotation.y = ry || 0; g.add(f); } };
  if (run) { put(L / 2, -L / 4, Dp / 2 - 0.02, 0); put(L / 2, L / 4, Dp / 2 - 0.02, 0); bx(g, t, H, t, 0, H / 2, Dp / 2 - t / 2, frm); } else put(L, 0, Dp / 2 - 0.02, 0);
  put(Dp, -L / 2 + 0.02, 0, -Math.PI / 2); put(Dp, L / 2 - 0.02, 0, Math.PI / 2);
  // top: lid, shelf or planter tray
  const lidM = wood ? mt('acw' + col, {}) : fm;
  if (top === 'planter') { bx(g, L + 0.1, 0.65, Dp + 0.1, 0, H + 0.33, 0, wood ? fm : frm); bx(g, L - 0.1, 0.05, Dp - 0.1, 0, H + 0.62, 0, mt('soil', { color: 0x4A3424, roughness: 1 }));
    const nP = Math.max(3, Math.round(L / 0.8)); for (let i = 0; i < nP; i++) { try { const p = plantModel(THREE, ['SYNGONIUM', 'ZZ', 'CHLOROPHYTUM'][i % 3], 1.2, { seed: i + 2 }); p.position.set(-L / 2 + L * (i + 0.5) / nP, H + 0.6, 0); p.scale.setScalar(0.6); g.add(p); } catch (e) {} } }
  else { bx(g, L + 0.12, 0.08, Dp + 0.12, 0, H + 0.04, 0, kind === 'run' && wood ? fm : (wood ? fm : lidM));
    const pots = [[-L * 0.2, 'ZZ'], [L * 0.05, 'SYNGONIUM']]; pots.forEach(([px, k], i) => { const pm = mt('pot' + i, { color: i ? 0xEDEAE3 : 0xCFC6B8, roughness: 0.8 }), pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.5, 18), pm); pot.position.set(px, H + 0.33, 0); pot.castShadow = true; g.add(pot);
      try { const p = plantModel(THREE, k, 1, { seed: i + 5 }); p.position.set(px, H + 0.55, 0); p.scale.setScalar(0.5); g.add(p); } catch (e) {} }); }
  studioFloor(S, -L / 2 - 5, wz - 0.05, L + 10, 12);
  person(S, L / 2 + 2.3, 1.6, -0.5);
  return { g: S, L, D: Dp, H: H + y0, cy: y0 + H / 2 + 0.4, span: Math.max(L + 5, 9) };
}
