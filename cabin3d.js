// outrr "Customise your cabin" — 3D model of the layout (three.js). Views: 3D, roof off, top, elevations, inside, 360.
// Tap a wall panel or a room to change it, drag rooms / partitions to move them (they snap to walls, corners and each other).
// Furniture (for ideas only) and day / evening lighting for the inside and 360 views.
// One renderer is kept and moved into the builder each time it redraws; the scene is rebuilt only when the layout changes.
import * as THREE from './vendor/three/three.module.min.js';
import { OrbitControls } from './vendor/three/OrbitControls.js';
import { RoomEnvironment } from './vendor/three/RoomEnvironment.js';

const SIDES = ['front', 'right', 'back', 'left'];
let R = null;   // { renderer, scene, cam, ortho, controls, key, view, group, L, W, H, raf, el }

const M = {};
function mat(name) {
  if (M[name]) return M[name];
  const S = (o) => new THREE.MeshStandardMaterial(o);
  const t = {
    puf: S({ color: 0xF2F0EB, roughness: 0.85 }), pufIn: S({ color: 0xF7F5F0, roughness: 0.9 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xBFDCE6, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }),
    frost: new THREE.MeshPhysicalMaterial({ color: 0xE3ECEF, roughness: 0.6, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }),
    deck: S({ color: 0x5A564F, roughness: 0.9 }), floor: S({ color: 0xC9B79C, roughness: 0.7 }), ground: S({ color: 0xDCD5C6, roughness: 1 }),
    roofPuf: S({ color: 0xE4E1DA, roughness: 0.8 }), roofMetal: S({ color: 0xA9AAA6, roughness: 0.5, metalness: 0.4 }),
    roofGlass: new THREE.MeshPhysicalMaterial({ color: 0xBFDCE6, roughness: 0.05, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
    poly: new THREE.MeshPhysicalMaterial({ color: 0xF4F6F2, roughness: 0.4, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }),
    hpl: S({ color: 0x9C7650, roughness: 0.6 }), wood: S({ color: 0x8B5A2B, roughness: 0.6 }), gutter: S({ color: 0x3C3C3C, roughness: 0.4, metalness: 0.5 }),
    light: S({ color: 0xFFF6D8, emissive: 0xFFE7A8, emissiveIntensity: 1.6 }), ceiling: S({ color: 0xFBFAF7, roughness: 0.9 }),
    white: S({ color: 0xFFFFFF, roughness: 0.3 }), grass: S({ color: 0x8FA86A, roughness: 1 }), pave: S({ color: 0xCFC6B6, roughness: 0.95 }), leaf: S({ color: 0x4F7A3A, roughness: 0.9 }), leaf2: S({ color: 0x6B8F4A, roughness: 0.9 }), bark: S({ color: 0x6B4A2F, roughness: 1 }),
    hit: new THREE.MeshBasicMaterial({ visible: false }), sel: new THREE.MeshBasicMaterial({ color: 0xC26445, transparent: true, opacity: 0.28, depthWrite: false }),
    fab: S({ color: 0xBFAF96, roughness: 0.95 }), fab2: S({ color: 0x55634A, roughness: 0.95 }), terra: S({ color: 0xC26445, roughness: 0.9 }), oak: S({ color: 0x9A6B43, roughness: 0.6 }), blk: S({ color: 0x2B2B2B, roughness: 0.5 }),
    rug: S({ color: 0xD9CCB4, roughness: 1 }), linen: S({ color: 0xF4F1EA, roughness: 0.9 }), desk: S({ color: 0xEDEAE4, roughness: 0.5 }), screen: S({ color: 0x15171A, roughness: 0.2 }), pot: S({ color: 0xC9B8A0, roughness: 0.9 }),
    lamp: S({ color: 0xFFF3D6, emissive: 0xFFD99A, emissiveIntensity: 0.6 }), counter: S({ color: 0x6E6A63, roughness: 0.5 }), steel: S({ color: 0xBFC3C7, roughness: 0.3, metalness: 0.8 }),
  };
  return (M[name] = t[name] || S({ color: name }));
}
function frameMat(lay) { const f = (lay.frame || '').toLowerCase(); return mat(/grey/.test(f) ? 0x8A8A8A : /white/.test(f) ? 0xE8E8E8 : /wood/.test(f) ? 0x8B5A2B : 0x2B2B2B); }
function box(g, w, h, d, x, y, z, m, cast = true) { const b = new THREE.Mesh(new THREE.BoxGeometry(Math.max(w, 0.01), Math.max(h, 0.01), Math.max(d, 0.01)), m); b.position.set(x, y, z); b.castShadow = cast; b.receiveShadow = true; g.add(b); return b; }
// a wall piece on one side: u runs along the wall (0..len), returns world position for (u, y, depth offset)
function sideFrame(side, L, W) {
  // front: z = W, x = u (left → right); back: z = 0, x = u; right: x = L, z = W - u (front → back); left: x = 0, z = W - u
  if (side === 'front') return { at: (u, o) => [u, W + o], along: 'x' };
  if (side === 'back') return { at: (u, o) => [u, -o], along: 'x' };
  if (side === 'right') return { at: (u, o) => [L + o, W - u], along: 'z' };
  return { at: (u, o) => [-o, W - u], along: 'z' };
}
function piece(g, sf, a, e, y0, y1, m, t, off = 0) {   // a panel between u = a..e and height y0..y1, thickness t
  const [x0, z0] = sf.at(a, off), [x1, z1] = sf.at(e, off), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, len = Math.abs(e - a);
  return sf.along === 'x' ? box(g, len, y1 - y0, t, cx, (y0 + y1) / 2, cz, m) : box(g, t, y1 - y0, len, cx, (y0 + y1) / 2, cz, m);
}
function bayOf(c, k) { return (c.bays || []).find(b => b.key === k) || null; }
function spanOf(c, k) { const b = bayOf(c, k); return b ? Math.max(Math.trunc(+b.span || 1), 1) : 1; }

function build(c, lay, opts) {
  const g = new THREE.Group(), L = +lay.L, W = +lay.W, H = /^10/.test(lay.height || '') ? 10 : 8.5, bay = +(c.bay || 4), FM = frameMat(lay), T = 0.25, DH = lay.full_doors ? H : 8;
  const tracks = Math.max(2, parseInt(lay.tracks || '2', 10) || 2);
  site(g, L, W);
  box(g, L + 0.6, 0.6, W + 0.6, L / 2, -0.3, W / 2, mat('deck')).userData.under = 1;
  box(g, L, 0.05, W, L / 2, 0.02, W / 2, mat('floor'), false).userData.under = 1;
  const walls = new THREE.Group(); walls.name = 'walls'; g.add(walls);
  const hits = new THREE.Group(); hits.name = 'hits'; g.add(hits);
  const wallOf = {};
  for (const side of SIDES) {
    const wg = new THREE.Group(); wg.name = 'wall-' + side; walls.add(wg); wallOf[side] = wg;
    const ks = (lay.walls || {})[side] || [], len = side === 'front' || side === 'back' ? L : W, sf = sideFrame(side, L, W);
    for (let i = 0; i < ks.length;) {
      const k = ks[i], b = bayOf(c, k), sp = spanOf(c, k), a = i * bay, e = Math.min((i + sp) * bay, len);
      const post = (u) => piece(wg, sf, u - 0.06, u + 0.06, 0, H, FM, T + 0.04);
      const hb = piece(hits, sf, a + 0.05, e - 0.05, 0, H, mat('hit'), 0.8); hb.userData = { bay: { side, i } }; hb.castShadow = false;
      post(a);
      if (!b || (!b.glass && !b.door)) {
        piece(wg, sf, a, e, 0, H, mat('puf'), T);
        if (k === 'window') { piece(wg, sf, a + (e - a) * 0.18, e - (e - a) * 0.18, 3, 6.4, mat('glass'), T + 0.06, 0.01); piece(wg, sf, a + (e - a) * 0.18, e - (e - a) * 0.18, 2.94, 3.0, FM, T + 0.1); piece(wg, sf, a + (e - a) * 0.18, e - (e - a) * 0.18, 6.4, 6.46, FM, T + 0.1); piece(wg, sf, (a + e) / 2 - 0.03, (a + e) / 2 + 0.03, 3, 6.4, FM, T + 0.1); }
        if (k === 'vent') piece(wg, sf, a + (e - a) * 0.3, e - (e - a) * 0.3, 6.6, 7.5, mat('glass'), T + 0.06);
      } else if (b.door) {
        const leaves = k === 'fold' ? 6 : k === 'slide' ? tracks : sp > 1 ? 2 : 1, dh = Math.min(DH, H);
        if (dh < H) piece(wg, sf, a, e, dh, H, mat('puf'), T);   // PUF above a standard 8 ft door
        piece(wg, sf, a, e, dh - 0.08, dh, FM, T + 0.06);
        for (let j = 0; j < leaves; j++) {
          const la = a + 0.08 + j * (e - a - 0.16) / leaves, le = a + 0.08 + (j + 1) * (e - a - 0.16) / leaves, off = k === 'slide' ? (j % 2 ? 0.06 : -0.06) : 0;
          piece(wg, sf, la, le, 0.05, dh - 0.1, b.glass ? mat('glass') : mat('pufIn'), 0.12, off);
          piece(wg, sf, la, la + 0.08, 0.05, dh - 0.1, FM, 0.16, off); piece(wg, sf, le - 0.08, le, 0.05, dh - 0.1, FM, 0.16, off);
          piece(wg, sf, la, le, 0.05, 0.15, FM, 0.16, off); piece(wg, sf, la, le, dh - 0.2, dh - 0.1, FM, 0.16, off);
        }
        piece(wg, sf, (a + e) / 2 - 0.02, (a + e) / 2 + 0.02, 3.3, 4.2, mat('steel'), 0.3);   // handle
      } else {
        piece(wg, sf, a, e, 0, H, k === 'frost' ? mat('frost') : mat('glass'), 0.1);
        piece(wg, sf, a, e, 0, 0.12, FM, T); piece(wg, sf, a, e, H - 0.12, H, FM, T);
      }
      i += sp;
    }
    piece(wg, sf, len - 0.06, len + 0.06, 0, H, FM, T + 0.04);
  }
  // roof (+ lights on the ceiling: always included) and false ceiling
  const roof = new THREE.Group(); roof.name = 'roof'; g.add(roof);
  const rm = /glass/i.test(lay.roof || '') ? mat('roofGlass') : /metal/i.test(lay.roof || '') ? mat('roofMetal') : mat('roofPuf');
  box(roof, L + 0.5, 0.45, W + 0.5, L / 2, H + 0.22, W / 2, rm);
  if (/glass/i.test(lay.roof || '')) {   // a glass roof sits on MS members: purlins every ~2 ft across, a ridge beam along — never one big sheet of glass
    const n = Math.max(2, Math.round(L / 2)); for (let i = 1; i < n; i++) box(roof, 0.16, 0.32, W + 0.3, i * L / n, H + 0.02, W / 2, FM, false)
    const m = Math.max(1, Math.round(W / 5)); for (let j = 1; j <= m; j++) box(roof, L + 0.3, 0.2, 0.14, L / 2, H + 0.08, j * W / (m + 1), FM, false)
  }
  [[-0.25, W / 2, 0.3, W + 0.5], [L + 0.25, W / 2, 0.3, W + 0.5]].forEach(([x, z, w, d]) => box(roof, w, 0.5, d, x, H + 0.25, z, FM));
  [[L / 2, -0.25, L + 0.8, 0.3], [L / 2, W + 0.25, L + 0.8, 0.3]].forEach(([x, z, w, d]) => box(roof, w, 0.5, d, x, H + 0.25, z, FM));
  const items = lay.items || {}, ceil = +items.ceiling > 0, ly = ceil ? H - 0.62 : H - 0.03;
  if (ceil) { const cg = new THREE.Group(); cg.name = 'ceiling'; g.add(cg); box(cg, L - 0.3, 0.1, W - 0.3, L / 2, H - 0.6, W / 2, mat('ceiling'), false); box(cg, L - 2.2, 0.06, W - 2.2, L / 2, H - 0.67, W / 2, mat('light'), false); }
  const lg = new THREE.Group(); lg.name = 'lights'; g.add(lg);
  for (let x = 2; x < L; x += 4) for (let z = 2; z < W; z += 4) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 20), mat('light')); l.position.set(x, ly - 0.03, z); lg.add(l); }
  const pl = new THREE.PointLight(0xFFE9C0, 60, Math.max(L, W) * 1.6, 1.4); pl.position.set(L / 2, ly - 0.5, W / 2); lg.add(pl);
  const nl = new THREE.Group(); nl.name = 'night'; g.add(nl); nl.visible = false;   // evening: warm light from every ceiling light (max 6) and under the projection
  const spots = []; for (let x = 2; x < L; x += 4) for (let z = 2; z < W; z += 4) spots.push([x, z]);
  spots.filter((_, j) => spots.length <= 6 || j % Math.ceil(spots.length / 6) === 0).slice(0, 6).forEach(([x, z]) => { const p = new THREE.PointLight(0xFFD9A0, 26, 16, 1.6); p.position.set(x, ly - 0.6, z); nl.add(p); });
  // things inside
  const FOOT = { toilet: [4, 6], wc: [4, 4], pantry: [6, 2], pdoor: [3, 0.6], gdoorp: [3, 0.6] };
  const placesG = new THREE.Group(); placesG.name = 'places'; g.add(placesG);
  (lay.places || []).forEach((p, n) => {
    const it = (c.items || []).find(x => x.key === p.key); if (!it) return;
    const pgp = new THREE.Group(); pgp.userData = { pl: n }; placesG.add(pgp); const g0 = g; { const g = pgp;   // eslint-disable-line no-shadow
    if (it.unit === 'rft') {
      const m = p.key === 'gpart' ? mat('glass') : p.key === 'fpart' ? mat('frost') : mat('pufIn'), len = +p.len || 1;
      if (p.rot === 90) box(g, 0.2, H, len, p.x + 0.1, H / 2, p.y + len / 2, m); else box(g, len, H, 0.2, p.x + len / 2, H / 2, p.y + 0.1, m);
      if (p.rot === 90) box(g, 0.2, 0.1, len, p.x + 0.1, H - 0.05, p.y + len / 2, FM); else box(g, len, 0.1, 0.2, p.x + len / 2, H - 0.05, p.y + 0.1, FM);
      return;
    }
    const f = FOOT[p.key]; if (!f) return;
    const w = p.rot === 90 ? f[1] : f[0], d = p.rot === 90 ? f[0] : f[1], cx = p.x + w / 2, cz = p.y + d / 2;
    if (p.key === 'pantry') { box(g, w, 3, d, cx, 1.5, cz, mat('counter')); box(g, w, 0.1, d, cx, 3.05, cz, mat('white')); box(g, 1.4, 0.15, 1, cx, 3.1, cz, mat('steel')); }
    else if (p.key === 'pdoor' || p.key === 'gdoorp') box(g, w, 7, d, cx, 3.5, cz, p.key === 'gdoorp' ? mat('glass') : mat(0xD9D4CB));
    else {   // toilet / WC room: frosted walls, WC + basin
      const fw = (x0, z0, x1, z1) => box(g, Math.max(Math.abs(x1 - x0), 0.15), 7.5, Math.max(Math.abs(z1 - z0), 0.15), (x0 + x1) / 2, 3.75, (z0 + z1) / 2, mat('frost'));
      const x0 = p.x, z0 = p.y, x1 = p.x + w, z1 = p.y + d;
      if (x0 > 0.3) fw(x0, z0, x0, z1); if (x1 < L - 0.3) fw(x1, z0, x1, z1); if (z0 > 0.3) fw(x0, z0, x1, z0); if (z1 < W - 0.3) fw(x0, z1, x1 - 2.4, z1);
      box(g, 1.2, 1.4, 1.8, x0 + 0.9, 0.7, z0 + 1.2, mat('white')); box(g, 1.6, 0.4, 1.2, x1 - 1.0, 2.8, z0 + 0.8, mat('white'));
    }
    void g0; }
  });
  // exhaust fans: one in each wet area, on the wall behind it
  let ex = +items.exhaust || 0;
  for (const p of lay.places || []) { if (ex <= 0 || !['toilet', 'wc', 'pantry'].includes(p.key)) continue; const ef = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 24), mat(0x6E6E6E)); ef.rotation.x = Math.PI / 2; ef.position.set(p.x + 1.5, 7.2, Math.max(0.2, p.y + 0.15)); g.add(ef); ex--; }
  // pergola projection (1.5 ft), top, underside, soffit lights
  const pj = lay.proj; if (pj && Array.isArray(pj.sides)) {
    const dep = +(c.proj && c.proj.depth || 1.5), pg = new THREE.Group(); pg.name = 'proj'; g.add(pg);
    const design = pj.design || '', RF = /wood/i.test(design) ? mat('wood') : FM;
    for (const side of pj.sides) {
      const len = side === 'front' || side === 'back' ? L : W, sf = sideFrame(side, L, W), y = H + 0.1;
      piece(pg, sf, -0.1, len + 0.1, y - 0.5, y, FM, 0.25, dep + 0.12);   // fascia beam
      const slat = (u, rot) => { const [xa, za] = sf.at(u, 0.2), [xb, zb] = sf.at(u, dep + 0.1), m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 1), RF);
        m.scale.z = Math.hypot(xb - xa, zb - za); m.position.set((xa + xb) / 2, y - 0.2, (za + zb) / 2); m.lookAt(xb, y - 0.2, zb); if (rot) m.rotateZ(rot); m.castShadow = true; pg.add(m); };
      const stp = /grid/i.test(design) ? 1.5 : 0.75;
      for (let u = 0.3; u < len; u += stp) slat(u, /slanted/i.test(design) ? 0.6 : 0);
      if (/grid/i.test(design)) for (let o = 0.6; o < dep; o += 0.6) piece(pg, sf, 0, len, y - 0.35, y - 0.05, RF, 0.1, o);
      piece(pg, sf, -0.1, len + 0.1, y + 0.02, y + 0.06, /glass/i.test(pj.top || '') ? mat('roofGlass') : mat('poly'), dep + 0.2, dep / 2);
      if (/hpl/i.test(pj.under || '')) piece(pg, sf, 0, len, y - 0.62, y - 0.55, mat('hpl'), dep, dep / 2 + 0.1);
      if (/louver/i.test(pj.under || '')) for (let u = 0.25; u < len; u += 0.5) piece(pg, sf, u, u + 0.15, y - 0.7, y - 0.55, mat('hpl'), dep, dep / 2 + 0.1);
      for (let u = 1.5; u < len; u += 3) { const [lx, lz] = sf.at(u, dep / 2 + 0.1), l = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16), mat('light')); l.position.set(lx, y - 0.74, lz); pg.add(l); }
    }
  }
  // rain gutter with a downpipe at the end
  if (SIDES.includes(lay.gutter)) {
    const side = lay.gutter, len = side === 'front' || side === 'back' ? L : W, sf = sideFrame(side, L, W), off = (pj && pj.sides && pj.sides.includes(side)) ? (+(c.proj && c.proj.depth || 1.5) + 0.45) : 0.45;
    piece(g, sf, -0.2, len + 0.2, H + 0.05, H + 0.4, mat('gutter'), 0.4, off);
    const [px, pz] = sf.at(len + 0.1, off); box(g, 0.3, H + 0.4, 0.3, px, (H + 0.4) / 2, pz, mat('gutter'));
  }
  if (opts && opts.furn && opts.furn !== 'none') { const fg = new THREE.Group(); fg.name = 'furn'; g.add(fg); furnish(fg, c, lay, L, W, H, opts.furn); }
  return { g, L, W, H };
}

// ---- the garden around it: grass, a paved apron, a few trees and shrubs (same every time: seeded)
function site(g, L, W) {
  const sg = new THREE.Group(); sg.name = 'site'; g.add(sg);
  const gr = new THREE.Mesh(new THREE.CircleGeometry(140, 64), mat('grass')); gr.rotation.x = -Math.PI / 2; gr.position.set(L / 2, -0.63, W / 2); gr.receiveShadow = true; sg.add(gr);
  box(sg, L + 9, 0.06, W + 9, L / 2, -0.6, W / 2, mat('pave'), false);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const tree = (x, z, s) => { const t = new THREE.Group(); t.position.set(x, -0.6, z); sg.add(t);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * s, 0.35 * s, 5 * s, 8), mat('bark')); tr.position.y = 2.5 * s; tr.castShadow = true; t.add(tr);
    [[0, 6.5, 0, 2.6], [1.2, 5.6, 0.6, 1.9], [-1.1, 5.8, -0.5, 2], [0.2, 7.6, -0.3, 1.8]].forEach(([a, b, c2, r], j) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 1), mat(j % 2 ? 'leaf2' : 'leaf')); m.position.set(a * s, b * s, c2 * s); m.castShadow = true; t.add(m); }); };
  const R0 = Math.max(L, W) / 2 + 14;
  for (let j = 0; j < 9; j++) { const a = -Math.PI * 0.95 + j * (Math.PI * 1.9 / 8) + rnd() * 0.25, r = R0 + rnd() * 14; tree(L / 2 + Math.cos(a) * r, W / 2 - Math.sin(a) * r * 0.9 - 4, 0.8 + rnd() * 0.6); }
  const shrub = (x, z) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 + rnd() * 0.5, 1), mat(rnd() > 0.5 ? 'leaf' : 'leaf2')); m.scale.y = 0.75; m.position.set(x, 0, z); m.castShadow = true; sg.add(m); };
  for (let x = -3; x <= L + 3; x += 3.2 + rnd()) { if (x > L * 0.3 && x < L * 0.7) continue; shrub(x, W + 5.3); }
  for (let z = 0; z <= W; z += 3.4 + rnd()) { shrub(-5.3, z); shrub(L + 5.3, z); }
}

// ---- furniture (shown for ideas only): built from simple shapes; local origin = centre of its footprint, back towards -z
function F() { return new THREE.Group(); }
function legs(g, w, d, h, m, t = 0.16) { [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(g, t, h, t, a * (w / 2 - t), h / 2, b * (d / 2 - t), m)); }
function table(w, d, h = 2.5, top = 'oak', leg = 'blk') { const g = F(); box(g, w, 0.12, d, 0, h, 0, mat(top)); legs(g, w, d, h, mat(leg)); return g; }
function chair(m = 'blk') { const g = F(); box(g, 1.5, 0.15, 1.5, 0, 1.5, 0, mat(m)); box(g, 1.5, 1.5, 0.15, 0, 2.3, -0.68, mat(m)); legs(g, 1.5, 1.5, 1.45, mat('blk'), 0.1); return g; }
function at(parent, child, x, z, ry = 0) { child.position.set(x, 0, z); child.rotation.y = ry; parent.add(child); return child; }
function sofa(w = 7) { const g = F(), d = 3; box(g, w, 1.1, d, 0, 0.75, 0, mat('fab')); box(g, w, 1.5, 0.6, 0, 1.9, -d / 2 + 0.3, mat('fab')); box(g, 0.5, 1.0, d, -w / 2 + 0.25, 1.6, 0, mat('fab')); box(g, 0.5, 1.0, d, w / 2 - 0.25, 1.6, 0, mat('fab'));
  for (let j = 0; j < 3; j++) box(g, 1.1, 1.0, 0.35, -w / 3 + j * w / 3, 1.9, -d / 2 + 0.75, mat(j === 1 ? 'terra' : 'fab2')); legs(g, w, d, 0.2, mat('blk'), 0.12); return g; }
function armchair() { const g = F(); box(g, 2.6, 1.0, 2.6, 0, 0.8, 0, mat('fab2')); box(g, 2.6, 1.3, 0.5, 0, 1.9, -1.05, mat('fab2')); box(g, 0.4, 0.8, 2.6, -1.1, 1.6, 0, mat('fab2')); box(g, 0.4, 0.8, 2.6, 1.1, 1.6, 0, mat('fab2')); return g; }
function rug(w, d) { const g = F(); box(g, w, 0.04, d, 0, 0.06, 0, mat('rug'), false); return g; }
function plant() { const g = F(); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.42, 1.4, 16), mat('pot')); p.position.y = 0.7; p.castShadow = true; g.add(p);
  [[0, 2.3, 0, 0.9], [0.4, 2.9, 0.2, 0.7], [-0.35, 3.2, -0.2, 0.65], [0.1, 3.7, 0, 0.55]].forEach(([x, y, z, r], j) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat(j % 2 ? 'leaf' : 'leaf2')); m.position.set(x, y, z); m.castShadow = true; g.add(m); }); return g; }
function floorLamp() { const g = F(); box(g, 0.08, 5, 0.08, 0, 2.5, 0, mat('blk')); const s = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.65, 0.8, 20, 1, true), mat('lamp')); s.position.y = 5.2; g.add(s); box(g, 0.9, 0.06, 0.9, 0, 0.03, 0, mat('blk')); return g; }
function deskSet() { const g = F(); at(g, table(5, 2.4, 2.5, 'desk'), 0, -1.05); box(g, 1.9, 1.2, 0.08, 0, 3.25, -1.8, mat('screen')); box(g, 0.2, 0.6, 0.2, 0, 2.85, -1.8, mat('blk')); at(g, chair(), 0, 0.9, Math.PI); return g; }
function meetSet(w = 6) { const g = F(); at(g, table(w, 3, 2.5, 'oak'), 0, 0); const n = Math.max(2, Math.floor(w / 2.2)); for (let j = 0; j < n; j++) { const x = -w / 2 + w / n * (j + 0.5); at(g, chair(), x, -2.1); at(g, chair(), x, 2.1, Math.PI); } return g; }
function cafeSet() { const g = F(); const t = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.1, 28), mat('oak')); t.position.y = 2.5; t.castShadow = true; g.add(t); box(g, 0.15, 2.5, 0.15, 0, 1.25, 0, mat('blk')); at(g, chair('terra'), 0, -1.7); at(g, chair('terra'), 0, 1.7, Math.PI); return g; }
function diningSet() { const g = F(); at(g, table(5, 3, 2.5, 'oak'), 0, 0); [-1.6, 0, 1.6].forEach(x => { at(g, chair('fab2'), x, -2.1); at(g, chair('fab2'), x, 2.1, Math.PI); }); return g; }
function bedSet() { const g = F(); box(g, 5.2, 1.0, 6.6, 0, 0.6, 0.4, mat('oak')); box(g, 5.0, 0.7, 6.3, 0, 1.4, 0.45, mat('linen')); box(g, 5.05, 0.25, 3.2, 0, 1.8, 1.9, mat('fab2'));
  box(g, 1.8, 0.45, 1.0, -1.2, 1.95, -2.2, mat('linen')); box(g, 1.8, 0.45, 1.0, 1.2, 1.95, -2.2, mat('linen')); box(g, 5.6, 3.6, 0.35, 0, 1.8, -2.95, mat('fab'));
  [-3.5, 3.5].forEach(x => { box(g, 1.4, 1.8, 1.4, x, 0.9, -2.3, mat('oak')); const l = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.6, 16), mat('lamp')); l.position.set(x, 2.3, -2.3); g.add(l); }); return g; }
function bedSmall() { const g = F(); box(g, 4.2, 1.0, 6.6, 0, 0.6, 0.3, mat('oak')); box(g, 4.0, 0.7, 6.3, 0, 1.4, 0.35, mat('linen')); box(g, 4.05, 0.25, 3, 0, 1.8, 1.8, mat('fab2')); box(g, 2.6, 0.45, 1.0, 0, 1.95, -2.3, mat('linen')); box(g, 4.6, 3.4, 0.35, 0, 1.7, -3.05, mat('fab')); return g; }
function wardrobe() { const g = F(); box(g, 4, 7, 2, 0, 3.5, 0, mat('oak')); box(g, 0.05, 6.6, 0.05, 0, 3.5, 1.02, mat('blk')); return g; }
function shelf() { const g = F(); box(g, 4, 6.5, 1.2, 0, 3.25, 0, mat('oak')); for (let y = 1.2; y < 6.4; y += 1.3) { box(g, 3.8, 0.08, 1.1, 0, y, 0.05, mat('desk')); for (let x = -1.6; x < 1.5; x += 0.45) box(g, 0.25, 0.9, 0.8, x + Math.sin(x * 9) * 0.05, y + 0.5, 0.1, mat((x * 7 | 0) % 3 === 0 ? 'terra' : (x * 7 | 0) % 3 === 1 ? 'fab2' : 'linen')); } return g; }
function counter() { const g = F(); box(g, 6, 3.4, 2, 0, 1.7, 0, mat('oak')); box(g, 6.2, 0.12, 2.2, 0, 3.45, 0, mat('desk')); [-2, 0, 2].forEach(x => { box(g, 0.9, 0.12, 0.9, x, 2.6, 1.9, mat('terra')); box(g, 0.1, 2.6, 0.1, x, 1.3, 1.9, mat('blk')); }); return g; }
function lounge(sm) { const g = F(), w = sm ? 6 : 7; at(g, rug(w + 1.5, 5.5), 0, 0.2); at(g, sofa(w), 0, -2.1); at(g, table(3.2, 1.8, 1.3, 'oak'), 0, 0.3); if (!sm) { at(g, armchair(), -w / 2 + 0.6, 2.4, Math.PI * 0.85); at(g, armchair(), w / 2 - 0.6, 2.4, -Math.PI * 0.85); } return g; }
// what each use gets: [maker, width, depth, where: wall | centre | corner, how many]
const SETS = {
  lounge: (A) => [[() => lounge(A < 110), A < 110 ? 7.5 : 9, A < 110 ? 6 : 7.6, 'wall', 1, [[() => lounge(true), 7.5, 6], [() => sofa(6), 6, 3.1], [armchair, 2.6, 2.6]]], [diningSet, 7, 6.6, 'centre', A >= 200 ? 1 : 0], [plant, 1.4, 1.4, 'corner', 2], [floorLamp, 1.2, 1.2, 'corner', 1]],
  office: (A) => [[deskSet, 5, 4.4, 'wall', Math.max(1, Math.min(4, Math.round(A / 70))), [[deskSet, 5, 4.4, 'centre']]], [() => meetSet(A >= 260 ? 8 : 6), A >= 260 ? 8 : 6, 6.4, 'centre', A >= 170 ? 1 : 0], [shelf, 4, 1.2, 'wall', A >= 120 ? 1 : 0], [plant, 1.4, 1.4, 'corner', 2]],
  cafe: (A) => [[counter, 6, 3.8, 'wall', A >= 90 ? 1 : 0], [cafeSet, 3.6, 4.6, 'centre', Math.max(1, Math.min(8, Math.floor(A / 38)))], [plant, 1.4, 1.4, 'corner', 3]],
  stay: (A) => [[bedSet, 8.6, 7.4, 'wall', 1, [[bedSmall, 4.8, 7], [bedSmall, 4.8, 7, 'centre']]], [wardrobe, 4, 2, 'wall', A >= 110 ? 1 : 0], [armchair, 2.6, 2.6, 'corner', A >= 130 ? 1 : 0], [plant, 1.4, 1.4, 'corner', 1], [() => lounge(true), 7.5, 6, 'wall', A >= 240 ? 1 : 0]],
};
function furnish(fg, c, lay, L, W, H, style) {
  const S2 = 0.5, nx = Math.round(L / S2), nz = Math.round(W / S2), occ = new Uint8Array(nx * nz), bay = +(c.bay || 4);
  const mark = (x0, z0, x1, z1) => { for (let i = Math.max(0, Math.floor(x0 / S2)); i < Math.min(nx, Math.ceil(x1 / S2)); i++) for (let j = Math.max(0, Math.floor(z0 / S2)); j < Math.min(nz, Math.ceil(z1 / S2)); j++) occ[j * nx + i] = 1; };
  const free = (x0, z0, x1, z1) => { if (x0 < 0.25 || z0 < 0.25 || x1 > L - 0.25 || z1 > W - 0.25) return false; for (let i = Math.floor(x0 / S2); i < Math.ceil(x1 / S2); i++) for (let j = Math.floor(z0 / S2); j < Math.ceil(z1 / S2); j++) if (occ[j * nx + i]) return false; return true; };
  const FOOT = { toilet: [4, 6], wc: [4, 4], pantry: [6, 2], pdoor: [3, 0.6], gdoorp: [3, 0.6] };
  for (const p of lay.places || []) {   // rooms, partitions (with room to walk past) and doors in them
    const it = (c.items || []).find(x => x.key === p.key); if (!it) continue;
    if (it.unit === 'rft') { const len = +p.len || 1; if (p.rot === 90) mark(p.x - 1, p.y, p.x + 1.2, p.y + len); else mark(p.x, p.y - 1, p.x + len, p.y + 1.2); continue; }
    const f = FOOT[p.key] || [3, 3], w = p.rot === 90 ? f[1] : f[0], d = p.rot === 90 ? f[0] : f[1];
    if (p.key === 'pdoor' || p.key === 'gdoorp') mark(p.x - 3, p.y - 3, p.x + w + 3, p.y + d + 3); else mark(p.x - 0.4, p.y - 0.4, p.x + w + 0.4, p.y + d + 0.4);
  }
  for (const side of SIDES) {   // keep the way in clear in front of every door
    const ks = (lay.walls || {})[side] || [];
    for (let i = 0; i < ks.length; i++) { const b = bayOf(c, ks[i]); if (!b || !b.door) continue; const a = i * bay - 0.5, e = (i + spanOf(c, ks[i])) * bay + 0.5;
      if (side === 'front') mark(a, W - 4.5, e, W); else if (side === 'back') mark(a, 0, e, 4.5); else if (side === 'right') mark(L - 4.5, W - e, L, W - a); else mark(0, W - e, 4.5, W - a); }
  }
  let fx = 0, fz = 0, fn = 0; for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) if (!occ[j * nx + i]) { fx += i; fz += j; fn++; }
  const cx = fn ? (fx / fn + 0.5) * S2 : L / 2, cz = fn ? (fz / fn + 0.5) * S2 : W / 2, A = fn * S2 * S2;
  const put = (mk, w, d, x0, z0, ry) => { const o = mk(); o.position.set(x0, 0, z0); o.rotation.y = ry; o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); fg.add(o); };
  const ROT = { back: 0, front: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 };
  const find = (w, d, where) => {
      let best = null;
      if (where === 'centre') {
        for (let x = w / 2; x <= L - w / 2; x += S2) for (let z = d / 2; z <= W - d / 2; z += S2) { if (!free(x - w / 2 - 0.9, z - d / 2 - 0.9, x + w / 2 + 0.9, z + d / 2 + 0.9)) continue; const s = Math.hypot(x - cx, z - cz); if (!best || s < best.s) best = { x, z, ry: 0, s, w, d }; }
      } else {
        for (const side of ['back', 'left', 'right', 'front']) {
          const along = side === 'back' || side === 'front', len = along ? L : W, fw = w, fd = d;
          for (let u = fw / 2 + 0.3; u <= len - fw / 2 - 0.3; u += S2) {
            const x = along ? u : side === 'left' ? 0.3 + fd / 2 : L - 0.3 - fd / 2, z = along ? (side === 'back' ? 0.3 + fd / 2 : W - 0.3 - fd / 2) : u;
            const ww = along ? fw : fd, dd = along ? fd : fw; if (!free(x - ww / 2, z - dd / 2, x + ww / 2, z + dd / 2)) continue;
            const s = (where === 'corner' ? Math.min(u, len - u) : Math.abs(u - len / 2)) + (side === 'back' ? 0 : side === 'front' ? 6 : 3);
            if (!best || s < best.s) best = { x, z, ry: ROT[side], s, w: ww, d: dd };
          }
        }
      }
      return best;
  };
  for (const [mk0, w0, d0, where0, n, alts] of (SETS[style] || SETS.lounge)(A)) {
    for (let k = 0; k < n; k++) {
      let mk = mk0, best = find(w0, d0, where0);
      for (const [m2, w2, d2, wh2] of (k === 0 && !best ? alts || [] : [])) { best = find(w2, d2, wh2 || where0); if (best) { mk = m2; break; } }
      if (!best) break;
      put(mk, best.w, best.d, best.x, best.z, best.ry); mark(best.x - best.w / 2 - 0.4, best.z - best.d / 2 - 0.4, best.x + best.w / 2 + 0.4, best.z + best.d / 2 + 0.4);
    }
  }
}

// ---- sky, day / evening
function sky(top, bottom) { const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256; const x = cv.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, top); gr.addColorStop(0.62, bottom); gr.addColorStop(1, bottom); x.fillStyle = gr; x.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }
function setNight(on) {
  R.night = on; const S0 = R.scene;
  S0.background = on ? R.skyN : R.skyD; S0.fog.color.set(on ? 0x1D2638 : 0xEFEDE6);
  R.hemi.intensity = on ? 0.1 : 1.1; R.sun.intensity = on ? 0.25 : 2.2; R.sun.color.set(on ? 0x9DB4FF : 0xFFF4E0); S0.environmentIntensity = on ? 0.04 : 0.45;
  mat('light').emissiveIntensity = on ? 5 : 1.6; mat('lamp').emissiveIntensity = on ? 4 : 0.6; R.renderer.toneMappingExposure = on ? 1.3 : 1.05;
  const n = R.group && R.group.getObjectByName('night'); if (n) n.visible = on && R.view !== 'top';
}

function ensure(el) {
  if (!R) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xEFEDE6, 140, 300);
    try { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.45; } catch (e) { /* no environment: plain lights only */ }
    const hemi = new THREE.HemisphereLight(0xFFFFFF, 0xB8AE9C, 1.1); scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xFFF4E0, 2.2); sun.position.set(40, 60, 50); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004;
    Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 200 }); scene.add(sun); scene.add(sun.target);
    const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 1000), ortho = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
    const controls = new OrbitControls(cam, renderer.domElement); controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.49;
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;border-radius:16px';
    R = { renderer, scene, cam, ortho, controls, sun, hemi, key: '', view: '', group: null, skyD: sky('#BFD8EA', '#F1EEE7'), skyN: sky('#0B1222', '#2B3550'), night: false };
    scene.background = R.skyD;
    const loop = () => { R.raf = requestAnimationFrame(loop); if (!R.el || !R.el.isConnected) return; R.controls.update(); keepNear(); under(); R.renderer.render(R.scene, R.active || R.cam); };
    loop();
    window.addEventListener('resize', () => R.el && size());
    const cv = renderer.domElement;
    cv.addEventListener('pointerdown', pDown, true); cv.addEventListener('pointermove', pMove); cv.addEventListener('pointerup', pUp); cv.addEventListener('pointercancel', () => { if (R.drag) { R.drag.obj.position.set(0, 0, 0); R.drag = null; R.controls.enabled = R.ctlOn; } });
  }
  if (R.el !== el) { R.el = el; el.innerHTML = ''; el.appendChild(R.renderer.domElement); }
  size();
}
function buttons() {   // ✋ move mode: one finger / left drag moves the model, right drag turns it
  const C = R.controls, p = !!R.pan
  C.mouseButtons = { LEFT: p ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: p ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN }
  C.touches = { ONE: p ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }
}
function keepNear() {   // the model can be moved, but never lost: the point it turns around stays near the cabin
  if (!R.group || R.active !== R.cam || !['3d', 'cut', '360'].includes(R.view)) return
  const t = R.controls.target, m = Math.max(R.L, R.W) * 0.6 + 4, x = Math.min(R.L + m, Math.max(-m, t.x)), y = Math.min(R.H * 1.6, Math.max(-R.H * 0.8, t.y)), z = Math.min(R.W + m, Math.max(-m, t.z))
  if (x !== t.x || y !== t.y || z !== t.z) { const dx = x - t.x, dy = y - t.y, dz = z - t.z; t.set(x, y, z); R.cam.position.x += dx; R.cam.position.y += dy; R.cam.position.z += dz }
}
function under() {   // orbiting below the floor: the ground, deck and floor fade out so the ceiling / false ceiling is seen from under
  if (!R.group) return; const b = (R.active || R.cam) === R.cam && R.view !== 'inside' && R.cam.position.y < -0.2
  if (b === R.below) return; R.below = b
  const st = R.group.getObjectByName('site'); if (st) st.visible = !b && !['top', 'front', 'right', 'back', 'left'].includes(R.view)
  R.group.traverse(o => { if (o.userData && o.userData.under) o.visible = !b })
}
function size() { const w = R.el.clientWidth || 360, h = R.el.clientHeight || 220; R.renderer.setSize(w, h, false); R.cam.aspect = w / h; R.cam.updateProjectionMatrix(); fitOrtho(); }
function fitOrtho() {
  if (!R.group) return; const a = (R.el.clientWidth || 360) / (R.el.clientHeight || 220), v = R.view, L = R.L, W = R.W, H = R.H, pad = 1.18;
  let w, h; if (v === 'top') { w = L + 6; h = W + 6; } else if (v === 'front' || v === 'back') { w = L + 6; h = H + 4; } else { w = W + 6; h = H + 4; }
  if (w / h > a) h = w / a; else w = h * a;
  Object.assign(R.ortho, { left: -w / 2 * pad, right: w / 2 * pad, top: h / 2 * pad, bottom: -h / 2 * pad }); R.ortho.updateProjectionMatrix();
}
const PERSP = ['3d', 'cut', 'inside', '360'];
function visible(v) {   // what each view shows
  const g = R.group, by = (n) => g.getObjectByName(n), top = v === 'top', elev = ['front', 'right', 'back', 'left'].includes(v), open = v === 'cut' || top;
  by('roof').visible = !open; const ce = by('ceiling'); if (ce) ce.visible = !open; by('lights').visible = !open;
  const pj = by('proj'); if (pj) pj.visible = !top; const fu = by('furn'); if (fu) fu.visible = PERSP.includes(v); const st = by('site'); if (st) st.visible = !top && !elev;
  const n = by('night'); if (n) n.visible = R.night && !top;
  R.sun.castShadow = !top && !elev; R.below = undefined;
}
function setView(v, keepCam) {
  R.view = v; const L = R.L, W = R.W, H = R.H, cx = L / 2, cz = W / 2, d = Math.max(L, W), C = R.controls;
  visible(v);
  C.maxPolarAngle = Math.PI * 0.49; C.minPolarAngle = 0; R.cam.fov = 40; C.enableZoom = true; C.rotateSpeed = 1; C.autoRotate = v === '360'; C.enabled = true; C.enableRotate = true; C.autoRotateSpeed = 1.1; C.enablePan = false;
  if (v === 'top') { R.active = R.ortho; R.ortho.position.set(cx, 100, cz + 0.001); R.ortho.up.set(0, 0, -1); R.ortho.lookAt(cx, 0, cz); C.enabled = false; }
  else if (['front', 'back', 'right', 'left'].includes(v)) {
    R.active = R.ortho; R.ortho.up.set(0, 1, 0);
    const p = { front: [cx, H / 2, W + 100], back: [cx, H / 2, -100], right: [L + 100, H / 2, cz], left: [-100, H / 2, cz] }[v];
    R.ortho.position.set(p[0], p[1], p[2]); R.ortho.lookAt(cx, H / 2, cz); C.enabled = false;
  } else if (v === 'inside') {   // stand just inside the main door, eyes at 5 ft, turn on the spot; tap the floor to walk
    R.active = R.cam; R.cam.fov = 70;
    if (!keepCam) { const st = R.start || [cx, Math.max(1.5, W - 2.5), cx, cz]; R.cam.position.set(st[0], 5, st[1]); const dx = st[2] - st[0], dz = st[3] - st[1], n = Math.hypot(dx, dz) || 1; C.target.set(st[0] + dx / n * 0.4, 4.9, st[1] + dz / n * 0.4); }
    C.minPolarAngle = Math.PI * 0.3; C.maxPolarAngle = Math.PI * 0.7; C.minDistance = C.maxDistance = 0.4; C.enableZoom = false; C.rotateSpeed = -0.45; C.autoRotateSpeed = 0.6;
  } else {   // 3d / roof off / 360
    R.active = R.cam; C.minDistance = 3; C.maxDistance = d * 4; C.maxPolarAngle = Math.PI * 0.93;   // go round and under: see the ceiling from below
    C.enablePan = true; C.screenSpacePanning = true; buttons();   // move the model: right-drag / two fingers, or the ✋ move mode
    if (!keepCam) { const k = Math.max(1.25, 1.5 / R.cam.aspect), hi = v === 'cut' ? 1.7 : 1;
      R.cam.position.set(cx + d * 0.95 * k, H * 0.4 + (H * 1.2 + d * 0.25) * k * hi, cz + d * 1.35 * k / (v === 'cut' ? 1.15 : 1)); C.target.set(cx, H * 0.3, cz); }
  }
  R.cam.updateProjectionMatrix(); fitOrtho(); C.update(); selBox();
}

// ---- tap / drag
let HANDLER = null;
export function onEvent(fn) { HANDLER = fn; }
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), FLOOR = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function cast(e, objs) { const r = R.renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, R.active || R.cam); return objs ? ray.intersectObjects(objs, true) : null; }
function floorAt(e) { cast(e); const p = new THREE.Vector3(); return ray.ray.intersectPlane(FLOOR, p) ? p : null; }
function tagOf(o) { while (o && !o.userData.pl && o.userData.pl !== 0 && !o.userData.bay) o = o.parent; return o; }
function pickAt(e) {
  const v = R.view, g = R.group; if (!g) return null;   // things inside first (only when the roof is off), then the wall panels
  const sets = []; if (v === 'cut' || v === 'top') sets.push(g.getObjectByName('places')); if (v !== 'inside' && v !== '360') sets.push(g.getObjectByName('hits'));
  for (const s of sets) { if (!s) continue; for (const h of cast(e, [s])) { const tg = tagOf(h.object); if (tg) return tg; } }
  return null;
}
function pDown(e) {
  if (!R.group || !HANDLER || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const t = pickAt(e); R.down = { x: e.clientX, y: e.clientY, t: Date.now(), tag: t }; R.ctlOn = R.controls.enabled;
  if (t && t.userData.pl != null) {   // grab a room / partition: the view holds still while it moves
    const f = floorAt(e), p = (R.lay.places || [])[t.userData.pl]; if (!f || !p) return;
    R.drag = { obj: t, i: t.userData.pl, f0: f, x0: +p.x, y0: +p.y, moved: false }; R.controls.enabled = false; e.preventDefault();
  }
}
function pMove(e) {
  const d = R.drag; if (!d) return; const f = floorAt(e); if (!f) return;
  if (!d.moved && Math.hypot(e.clientX - R.down.x, e.clientY - R.down.y) < 5) return; d.moved = true;
  const s = snap(d.i, d.x0 + f.x - d.f0.x, d.y0 + f.z - d.f0.z); d.nx = s[0]; d.ny = s[1]; d.obj.position.set(s[0] - d.x0, 0, s[1] - d.y0); selBox();
}
function pUp(e) {
  const d = R.drag, dn = R.down; R.drag = null; R.down = null;
  if (d) { R.controls.enabled = R.ctlOn; if (d.moved) { HANDLER({ t: 'movepl', i: d.i, x: d.nx, y: d.ny }); return; } }
  if (!dn || Math.hypot(e.clientX - dn.x, e.clientY - dn.y) > 6 || Date.now() - dn.t > 700) return;   // that was a turn of the view, not a tap
  if (R.view === 'inside') { const f = floorAt(e); if (f) walk(f); return; }
  const t = dn.tag; if (!t) return HANDLER({ t: 'none' });
  if (t.userData.pl != null) HANDLER({ t: 'selpl', i: t.userData.pl }); else HANDLER({ t: 'selbay', side: t.userData.bay.side, i: t.userData.bay.i });
}
function walk(f) {   // move to where the floor was tapped, keep looking the same way
  const x = Math.max(0.8, Math.min(R.L - 0.8, f.x)), z = Math.max(0.8, Math.min(R.W - 0.8, f.z)), C = R.controls, dir = C.target.clone().sub(R.cam.position);
  R.cam.position.set(x, 5, z); C.target.copy(R.cam.position).add(dir); C.update();
}
const FOOT = { toilet: [4, 6], wc: [4, 4], pantry: [6, 2], pdoor: [3, 0.6], gdoorp: [3, 0.6] };
function dimsOf(p) { const it = (R.c.items || []).find(x => x.key === p.key); if (it && it.unit === 'rft') return p.rot === 90 ? [0.4, +p.len || 1] : [+p.len || 1, 0.4]; const f = FOOT[p.key] || [3, 3]; return p.rot === 90 ? [f[1], f[0]] : [f[0], f[1]]; }
function snap(i, x, y) {   // to the walls, the corners and the edges of the other things inside (within 0.75 ft), else to ½ ft
  const ps = R.lay.places || [], p = ps[i], [w, d] = dimsOf(p), L = R.L, W = R.W, T = 0.75;
  const xs = [0, L - w], ys = [0, W - d];
  ps.forEach((o, j) => { if (j === i) return; const [ow, od] = dimsOf(o); xs.push(+o.x, +o.x + ow - w, +o.x + ow, +o.x - w); ys.push(+o.y, +o.y + od - d, +o.y + od, +o.y - d); });
  const best = (v, list) => { let b = null; for (const c2 of list) if (Math.abs(c2 - v) <= T && (b == null || Math.abs(c2 - v) < Math.abs(b - v))) b = c2; return b == null ? Math.round(v * 2) / 2 : Math.round(b * 2) / 2; };
  let nx = Math.max(0, Math.min(L - w, best(x, xs))), ny = Math.max(0, Math.min(W - d, best(y, ys)));
  const solid = (o) => { const it = (R.c.items || []).find(z => z.key === o.key); return !(it && it.unit === 'rft') && o.key !== 'pdoor' && o.key !== 'gdoorp'; };
  if (solid(p)) ps.forEach((o, j) => {   // rooms don't sit on top of each other: slide to the nearest free side
    if (j === i || !solid(o)) return; const [ow, od] = dimsOf(o), ox = +o.x, oy = +o.y;
    if (nx < ox + ow && nx + w > ox && ny < oy + od && ny + d > oy) {
      const c2 = [[ox - w, ny], [ox + ow, ny], [nx, oy - d], [nx, oy + od]].filter(([a2, b2]) => a2 >= 0 && b2 >= 0 && a2 <= L - w && b2 <= W - d);
      c2.sort((u, v) => Math.hypot(u[0] - x, u[1] - y) - Math.hypot(v[0] - x, v[1] - y)); if (c2.length) [nx, ny] = c2[0];
    } });
  return [nx, ny];
}
function selBox() {   // the selected panel / room glows terracotta
  const g = R.group; if (!g) return; const old = g.getObjectByName('selbox'); if (old) { g.remove(old); old.traverse(o => o.geometry && o.geometry.dispose()); }
  const s = R.sel; if (!s) return; let src = null;
  if (s.bay) g.getObjectByName('hits').children.forEach(h => { if (h.userData.bay.side === s.bay.side && h.userData.bay.i === s.bay.i) src = h; });
  if (s.pl != null) g.getObjectByName('places').children.forEach(h => { if (h.userData.pl === s.pl) src = h; });
  if (!src || (s.pl != null && !['cut', 'top'].includes(R.view))) return;
  const bb = new THREE.Box3().setFromObject(src, true); if (bb.isEmpty()) return; const sz = bb.getSize(new THREE.Vector3()), ct = bb.getCenter(new THREE.Vector3());
  const sg = new THREE.Group(); sg.name = 'selbox'; g.add(sg);
  const m = new THREE.Mesh(new THREE.BoxGeometry(sz.x + 0.15, sz.y + 0.15, sz.z + 0.15), mat('sel')); m.position.copy(ct); m.renderOrder = 5; sg.add(m);
  const ln = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0xC26445 })); ln.position.copy(ct); sg.add(ln);
}
function startSpot(c, lay, L, W) {   // where "Inside" starts: 2½ ft in from the main door, looking into the room
  const bay = +(c.bay || 4);
  for (const side of SIDES) { const ks = (lay.walls || {})[side] || []; for (let i = 0; i < ks.length; i++) { const b = bayOf(c, ks[i]); if (!b || !b.door) continue; const u = (i + spanOf(c, ks[i]) / 2) * bay;
    const p = side === 'front' ? [u, W - 2.5] : side === 'back' ? [u, 2.5] : side === 'right' ? [L - 2.5, W - u] : [2.5, W - u]; return [p[0], p[1], L / 2 + (L / 2 - p[0]) * 0.2, W / 2 + (W / 2 - p[1]) * 0.2]; } }
  return null;
}

export function show(el, c, lay, view, opts) {
  opts = opts || {}; ensure(el);
  const key = JSON.stringify(lay) + '|' + (opts.furn || 'none'), dimKey = [lay.L, lay.W, lay.height].join('x');
  let reset = view !== R.view;
  if (key !== R.key) {
    if (R.group) { R.scene.remove(R.group); R.group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    const b = build(c, lay, opts); R.group = b.g; R.L = b.L; R.W = b.W; R.H = b.H; R.scene.add(b.g); R.key = key; R.c = c; R.lay = lay; R.start = startSpot(c, lay, b.L, b.W);
    R.sun.target.position.set(b.L / 2, 0, b.W / 2);
    if (dimKey !== R.dimKey) { R.dimKey = dimKey; reset = true; }
    if (!reset) { visible(R.view); }
  }
  R.lay = lay; R.c = c; R.sel = opts.sel || null;
  if (!!opts.night !== R.night) setNight(!!opts.night);
  if (reset) setView(view, false); else selBox();
  fitOrtho();
}
export function zoom(f) { if (!R || R.active !== R.cam) return; const C = R.controls, v = R.cam.position.clone().sub(C.target), len = Math.max(C.minDistance, Math.min(C.maxDistance, v.length() * f)); R.cam.position.copy(C.target).add(v.setLength(len)); C.update(); }
export function panMode(on) { if (!R) return; R.pan = !!on; buttons(); }
export function home() { if (R && R.group) setView(R.view, false); }
export function resize() { if (R && R.el) size(); }
export function snapshot() { return R ? R.renderer.domElement.toDataURL('image/png') : null; }
window.Cabin3D = { show, snapshot, onEvent, zoom, resize, panMode, home, _r: () => R };
