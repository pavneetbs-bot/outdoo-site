// outrr "Customise your cabin" — 3D model of the layout (three.js). Views: 3D, top, elevations, inside, 360.
// One renderer is kept and moved into the builder each time it redraws; the scene is rebuilt only when the layout changes.
import * as THREE from './vendor/three/three.module.min.js';
import { OrbitControls } from './vendor/three/OrbitControls.js';

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
    white: S({ color: 0xFFFFFF, roughness: 0.3 }), counter: S({ color: 0x6E6A63, roughness: 0.5 }), steel: S({ color: 0xBFC3C7, roughness: 0.3, metalness: 0.8 }),
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

function build(c, lay) {
  const g = new THREE.Group(), L = +lay.L, W = +lay.W, H = /^10/.test(lay.height || '') ? 10 : 8.5, bay = +(c.bay || 4), FM = frameMat(lay), T = 0.25, DH = lay.full_doors ? H : 8;
  const tracks = Math.max(2, parseInt(lay.tracks || '2', 10) || 2);
  box(g, 400, 0.05, 400, L / 2, -0.62, W / 2, mat('ground'), false);
  box(g, L + 0.6, 0.6, W + 0.6, L / 2, -0.3, W / 2, mat('deck'));
  box(g, L, 0.05, W, L / 2, 0.02, W / 2, mat('floor'), false);
  const walls = new THREE.Group(); walls.name = 'walls'; g.add(walls);
  const wallOf = {};
  for (const side of SIDES) {
    const wg = new THREE.Group(); wg.name = 'wall-' + side; walls.add(wg); wallOf[side] = wg;
    const ks = (lay.walls || {})[side] || [], len = side === 'front' || side === 'back' ? L : W, sf = sideFrame(side, L, W);
    for (let i = 0; i < ks.length;) {
      const k = ks[i], b = bayOf(c, k), sp = spanOf(c, k), a = i * bay, e = Math.min((i + sp) * bay, len);
      const post = (u) => piece(wg, sf, u - 0.06, u + 0.06, 0, H, FM, T + 0.04);
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
  [[-0.25, W / 2, 0.3, W + 0.5], [L + 0.25, W / 2, 0.3, W + 0.5]].forEach(([x, z, w, d]) => box(roof, w, 0.5, d, x, H + 0.25, z, FM));
  [[L / 2, -0.25, L + 0.8, 0.3], [L / 2, W + 0.25, L + 0.8, 0.3]].forEach(([x, z, w, d]) => box(roof, w, 0.5, d, x, H + 0.25, z, FM));
  const items = lay.items || {}, ceil = +items.ceiling > 0, ly = ceil ? H - 0.62 : H - 0.03;
  if (ceil) { const cg = new THREE.Group(); cg.name = 'ceiling'; g.add(cg); box(cg, L - 0.3, 0.1, W - 0.3, L / 2, H - 0.6, W / 2, mat('ceiling'), false); box(cg, L - 2.2, 0.06, W - 2.2, L / 2, H - 0.67, W / 2, mat('light'), false); }
  const lg = new THREE.Group(); lg.name = 'lights'; g.add(lg);
  for (let x = 2; x < L; x += 4) for (let z = 2; z < W; z += 4) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 20), mat('light')); l.position.set(x, ly - 0.03, z); lg.add(l); }
  const pl = new THREE.PointLight(0xFFE9C0, 60, Math.max(L, W) * 1.6, 1.4); pl.position.set(L / 2, ly - 0.5, W / 2); lg.add(pl);
  // things inside
  const FOOT = { toilet: [4, 6], wc: [4, 4], pantry: [6, 2], pdoor: [3, 0.6], gdoorp: [3, 0.6] };
  for (const p of lay.places || []) {
    const it = (c.items || []).find(x => x.key === p.key); if (!it) continue;
    if (it.unit === 'rft') {
      const m = p.key === 'gpart' ? mat('glass') : p.key === 'fpart' ? mat('frost') : mat('pufIn'), len = +p.len || 1;
      if (p.rot === 90) box(g, 0.2, H, len, p.x + 0.1, H / 2, p.y + len / 2, m); else box(g, len, H, 0.2, p.x + len / 2, H / 2, p.y + 0.1, m);
      continue;
    }
    const f = FOOT[p.key]; if (!f) continue;
    const w = p.rot === 90 ? f[1] : f[0], d = p.rot === 90 ? f[0] : f[1], cx = p.x + w / 2, cz = p.y + d / 2;
    if (p.key === 'pantry') { box(g, w, 3, d, cx, 1.5, cz, mat('counter')); box(g, w, 0.1, d, cx, 3.05, cz, mat('white')); box(g, 1.4, 0.15, 1, cx, 3.1, cz, mat('steel')); }
    else if (p.key === 'pdoor' || p.key === 'gdoorp') box(g, w, 7, d, cx, 3.5, cz, p.key === 'gdoorp' ? mat('glass') : mat(0xD9D4CB));
    else {   // toilet / WC room: frosted walls, WC + basin
      const fw = (x0, z0, x1, z1) => box(g, Math.max(Math.abs(x1 - x0), 0.15), 7.5, Math.max(Math.abs(z1 - z0), 0.15), (x0 + x1) / 2, 3.75, (z0 + z1) / 2, mat('frost'));
      const x0 = p.x, z0 = p.y, x1 = p.x + w, z1 = p.y + d;
      if (x0 > 0.3) fw(x0, z0, x0, z1); if (x1 < L - 0.3) fw(x1, z0, x1, z1); if (z0 > 0.3) fw(x0, z0, x1, z0); if (z1 < W - 0.3) fw(x0, z1, x1 - 2.4, z1);
      box(g, 1.2, 1.4, 1.8, x0 + 0.9, 0.7, z0 + 1.2, mat('white')); box(g, 1.6, 0.4, 1.2, x1 - 1.0, 2.8, z0 + 0.8, mat('white'));
    }
  }
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
  return { g, L, W, H };
}

function ensure(el) {
  if (!R) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0xF3EEE6); scene.fog = new THREE.Fog(0xF3EEE6, 120, 260);
    scene.add(new THREE.HemisphereLight(0xFFFFFF, 0xB8AE9C, 1.2));
    const sun = new THREE.DirectionalLight(0xFFF4E0, 2.2); sun.position.set(40, 60, 50); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 200 }); scene.add(sun); scene.add(sun.target);
    const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 1000), ortho = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
    const controls = new OrbitControls(cam, renderer.domElement); controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.49;
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;border-radius:16px';
    R = { renderer, scene, cam, ortho, controls, sun, key: '', view: '', group: null };
    const loop = () => { R.raf = requestAnimationFrame(loop); if (!R.el || !R.el.isConnected) return; if (R.view === '360' || R.view === 'auto') R.controls.autoRotate = true; R.controls.update(); R.renderer.render(R.scene, R.active || R.cam); };
    loop();
    window.addEventListener('resize', () => R.el && size());
  }
  if (R.el !== el) { R.el = el; el.innerHTML = ''; el.appendChild(R.renderer.domElement); }
  size();
}
function size() { const w = R.el.clientWidth || 360, h = R.el.clientHeight || 220; R.renderer.setSize(w, h, false); R.cam.aspect = w / h; R.cam.updateProjectionMatrix(); fitOrtho(); }
function fitOrtho() {
  if (!R.group) return; const a = (R.el.clientWidth || 360) / (R.el.clientHeight || 220), v = R.view, L = R.L, W = R.W, H = R.H, pad = 1.18;
  let w, h; if (v === 'top') { w = L + 6; h = W + 6; } else if (v === 'front' || v === 'back') { w = L + 6; h = H + 4; } else { w = W + 6; h = H + 4; }
  if (w / h > a) h = w / a; else w = h * a;
  Object.assign(R.ortho, { left: -w / 2 * pad, right: w / 2 * pad, top: h / 2 * pad, bottom: -h / 2 * pad }); R.ortho.updateProjectionMatrix();
}
function setView(v) {
  R.view = v; const L = R.L, W = R.W, H = R.H, cx = L / 2, cz = W / 2, d = Math.max(L, W);
  const roof = R.group.getObjectByName('roof'), proj = R.group.getObjectByName('proj'), ceil = R.group.getObjectByName('ceiling');
  const lights = R.group.getObjectByName('lights');
  roof.visible = v !== 'top'; if (proj) proj.visible = true; if (ceil) ceil.visible = v !== 'top'; if (lights) lights.visible = v !== 'top';
  R.controls.maxPolarAngle = Math.PI * 0.49; R.controls.minPolarAngle = 0;
  ['front', 'right', 'back', 'left'].forEach(s => { const w = R.group.getObjectByName('wall-' + s); if (w) w.visible = true; });
  R.cam.fov = 40; R.controls.enableZoom = true; R.controls.rotateSpeed = 1; R.sun.castShadow = v !== 'top' && !['front', 'back', 'right', 'left'].includes(v);
  R.controls.autoRotate = false; R.controls.enabled = true; R.controls.enableRotate = true; R.controls.autoRotateSpeed = 1.2;
  if (v === 'top') { R.active = R.ortho; R.ortho.position.set(cx, 100, cz + 0.001); R.ortho.up.set(0, 0, -1); R.ortho.lookAt(cx, 0, cz); if (proj) proj.visible = false; R.controls.enabled = false; }
  else if (['front', 'back', 'right', 'left'].includes(v)) {
    R.active = R.ortho; R.ortho.up.set(0, 1, 0);
    const p = { front: [cx, H / 2, W + 100], back: [cx, H / 2, -100], right: [L + 100, H / 2, cz], left: [-100, H / 2, cz] }[v];
    R.ortho.position.set(p[0], p[1], p[2]); R.ortho.lookAt(cx, H / 2, cz); R.controls.enabled = false;
  } else if (v === 'inside') {   // stand inside at eye level and look around
    // stand near the front, eyes at 5 ft, and turn on the spot (the target sits just in front of the eye)
    R.active = R.cam; R.cam.fov = 70; R.cam.position.set(cx, 5, Math.max(1.5, W - 2.2)); R.controls.target.set(cx, 4.9, Math.max(1.5, W - 2.2) - 0.4);
    R.controls.minPolarAngle = Math.PI * 0.3; R.controls.maxPolarAngle = Math.PI * 0.7; R.controls.minDistance = R.controls.maxDistance = 0.4; R.controls.enableZoom = false; R.controls.rotateSpeed = -0.5; R.controls.autoRotateSpeed = 0.6;
  } else {   // 3d / 360
    R.active = R.cam; R.controls.maxPolarAngle = Math.PI * 0.49; R.controls.minDistance = 6; R.controls.maxDistance = d * 4;
    const k = Math.max(1, 1.5 / R.cam.aspect);   // narrow / square boxes: step back so it all fits
    R.cam.position.set(cx + d * 0.95 * k, H * 0.4 + (H * 1.2 + d * 0.25) * k, cz + d * 1.35 * k); R.controls.target.set(cx, H * 0.4, cz);
    if (v === '360') R.controls.autoRotate = true;
  }
  R.cam.updateProjectionMatrix(); fitOrtho(); R.controls.update();
}
export function show(el, c, lay, view) {
  ensure(el);
  const key = JSON.stringify(lay);
  if (key !== R.key) {
    if (R.group) { R.scene.remove(R.group); R.group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    const b = build(c, lay); R.group = b.g; R.L = b.L; R.W = b.W; R.H = b.H; R.scene.add(b.g); R.key = key;
    R.sun.target.position.set(b.L / 2, 0, b.W / 2); R.view = '';
  }
  if (view !== R.view) setView(view);
  fitOrtho();
}
export function snapshot() { return R ? R.renderer.domElement.toDataURL('image/png') : null; }
window.Cabin3D = { show, snapshot };
