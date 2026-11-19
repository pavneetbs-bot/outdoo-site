// outrr "Plan your space" — the 3D scene (three.js): the customer's terrace or lawn, and everything they place on it.
// Cabins and pergolas are the real models (cabin3d.js / pergola3d.js); every other category is one common model,
// sized to what the customer set. Plot coords: x across the width (0 = left), z front-to-back (0 = back, pd = front),
// feet, y up, floor / slab at y = 0. Items: {cat, x, z, w, d, h, rot} — (x, z) = back-left corner of the footprint.
import * as THREE from './vendor/three/three.module.min.js';
import { OrbitControls } from './vendor/three/OrbitControls.js';
import { RoomEnvironment } from './vendor/three/RoomEnvironment.js';
import { cabinModel, plotModel } from './cabin3d.js?v=17';
import { pergolaModel } from './pergola3d.js?v=9';

let R = null, HANDLER = null;
const M = {};
const mat = (k, c, o) => M[k] || (M[k] = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8 }, o || {})));
function box(g, w, h, d, x, y, z, m, sh = true) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = sh; b.receiveShadow = true; g.add(b); return b; }
function cyl(g, r1, r2, h, x, y, z, m, seg = 20) { const c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m); c.position.set(x, y, z); c.castShadow = c.receiveShadow = true; g.add(c); return c; }

function ensure(el) {
  if (R && R.el === el) return;
  if (R) { el.appendChild(R.renderer.domElement); R.el = el; size(); return; }
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  el.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xeef0ea);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  const cam = new THREE.PerspectiveCamera(40, 1, 0.3, 1500), controls = new OrbitControls(cam, renderer.domElement);
  controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.47; controls.minDistance = 6; controls.maxDistance = 260; controls.screenSpacePanning = true;
  const hemi = new THREE.HemisphereLight(0xffffff, 0xb8ad98, 0.75), sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, far: 400 });
  scene.add(hemi, sun, sun.target);
  R = { renderer, scene, cam, controls, sun, el, group: null, key: '', view: '3d', ray: new THREE.Raycaster(), floor: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0) };
  const cv = renderer.domElement; cv.style.touchAction = 'none';
  cv.addEventListener('pointerdown', pDown); window.addEventListener('pointermove', pMove); window.addEventListener('pointerup', pUp);
  size(); const loop = () => { R.raf = requestAnimationFrame(loop); controls.update(); renderer.render(scene, cam); }; loop();
  window.addEventListener('resize', size);
}
function size() { if (!R || !R.el) return; const w = R.el.clientWidth || 600, h = R.el.clientHeight || 400; R.renderer.setSize(w, h, false); R.renderer.domElement.style.width = '100%'; R.renderer.domElement.style.height = '100%'; R.cam.aspect = w / h; R.cam.updateProjectionMatrix(); }

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
const C = () => ({
  frame: mat('c_frame', 0x2E2E2E, { metalness: 0.4, roughness: 0.5 }), wood: mat('c_wood', 0x9A6B43), wood2: mat('c_wood2', 0x7A5537),
  cush: mat('c_cush', 0xE8E1D4), cush2: mat('c_cush2', 0xC26445), stone: mat('c_stone', 0xB9B2A5), dark: mat('c_dark', 0x3A3A3A),
  leaf: mat('c_leaf', 0x4F7A3A), leaf2: mat('c_leaf2', 0x6B9A4A), water: mat('c_water', 0x6FA8C7, { roughness: 0.15, metalness: 0.1 }), white: mat('c_white', 0xF2EFE8),
  glass: mat('c_glass', 0xBFD9E6, { transparent: true, opacity: 0.35, roughness: 0.05 }), clay: mat('c_clay', 0xB46A4A), pot: mat('c_pot', 0x3D3F41),
});
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
export function generic(cat, w, d, h, it) {   // centred on (0, 0), on the floor; w along x, d along z (the back is -z)
  const g = new THREE.Group(), K = C();
  if (cat === 'sofa') {   // 193d: a 3-seater along the back, a 2-seater on the right, a coffee table in front
    const seat = (len, x, z, ry) => { const u = new THREE.Group(); u.position.set(x, 0, z); u.rotation.y = ry; g.add(u); const D = 2.7, sh = 1.4;
      box(u, len, sh, D, 0, sh / 2, 0, K.frame); box(u, len - 0.9, 0.45, D - 0.4, 0, sh + 0.2, 0.15, K.cush); box(u, len - 0.5, 1.5, 0.45, 0, sh + 0.75, -D / 2 + 0.25, K.cush);
      [-1, 1].forEach(a => box(u, 0.45, 0.9, D, a * (len / 2 - 0.22), sh + 0.45, 0, K.frame)); const n = Math.max(2, Math.round(len / 2)); for (let k = 0; k < n; k++) box(u, 1.0, 1.0, 0.3, -len / 2 + 0.7 + (len - 1.4) * (k + 0.5) / n, sh + 0.95, -D / 2 + 0.65, k % 2 ? K.cush : K.cush2); };
    const L3 = Math.min(6.5, w - 3), L2 = Math.min(4.6, d - 3.2);
    seat(L3, -w / 2 + L3 / 2, -d / 2 + 1.35, 0);
    if (L2 >= 3) seat(L2, w / 2 - 1.35, -d / 2 + 2.9 + L2 / 2, -Math.PI / 2);
    const tw = Math.min(3.2, L3 * 0.55), td = 1.8; box(g, tw, 0.12, td, -w / 2 + L3 / 2, 1.3, -d / 2 + 2.7 + 0.9 + td / 2, K.wood); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(g, 0.14, 1.25, 0.14, -w / 2 + L3 / 2 + a * (tw / 2 - 0.2), 0.62, -d / 2 + 3.6 + td / 2 + b * (td / 2 - 0.2), K.frame));
  } else if (cat === 'swing') {   // a hanging bench swing on an A-frame
    const H = h || 7, sw = Math.min(w - 1.6, 4.5), m = K.frame;
    [-w / 2 + 0.3, w / 2 - 0.3].forEach(x => { rodA(g, [x, 0, -d / 2 + 0.2], [x, H, 0], m); rodA(g, [x, 0, d / 2 - 0.2], [x, H, 0], m); });
    box(g, w - 0.4, 0.25, 0.25, 0, H, 0, m);
    const sy = 1.6; box(g, sw, 0.15, 1.7, 0, sy, 0, K.wood); box(g, sw, 1.4, 0.15, 0, sy + 0.7, -0.8, K.wood); box(g, sw - 0.3, 0.3, 1.4, 0, sy + 0.22, 0.05, K.cush);
    [-1, 1].forEach(a => [-0.7, 0.6].forEach(z => box(g, 0.05, H - sy, 0.05, a * (sw / 2 - 0.1), sy + (H - sy) / 2, z * 0.4, K.dark)));
  } else if (cat === 'accover') {   // a jali / louver box over an AC outdoor unit
    const H = h || 2.9, m = K.wood2; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(g, 0.15, H, 0.15, a * (w / 2 - 0.08), H / 2, b * (d / 2 - 0.08), m));
    box(g, w, 0.12, d, 0, H - 0.06, 0, m);
    for (let y = 0.35; y < H - 0.2; y += 0.28) { box(g, w - 0.2, 0.08, 0.06, 0, y, d / 2 - 0.05, m); box(g, w - 0.2, 0.08, 0.06, 0, y, -d / 2 + 0.05, m); box(g, 0.06, 0.08, d - 0.2, -w / 2 + 0.05, y, 0, m); box(g, 0.06, 0.08, d - 0.2, w / 2 - 0.05, y, 0, m); }
  } else if (cat === 'dining') {
    const tw = Math.max(2.5, w - 2.6), td = Math.max(2.5, d - 2.6); box(g, tw, 0.15, td, 0, 2.5, 0, K.wood); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(g, 0.2, 2.45, 0.2, a * (tw / 2 - 0.3), 1.22, b * (td / 2 - 0.3), K.frame));
    const ch = (x, z, ry) => { const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; g.add(c); box(c, 1.5, 0.15, 1.5, 0, 1.5, 0, K.cush); box(c, 1.5, 1.6, 0.15, 0, 2.3, -0.7, K.frame); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(c, 0.12, 1.5, 0.12, a * 0.65, 0.75, b * 0.65, K.frame)); };
    const nx = Math.max(1, Math.floor(tw / 2.2)); for (let i = 0; i < nx; i++) { const x = -tw / 2 + tw * (i + 0.5) / nx; ch(x, -td / 2 - 0.9, 0); ch(x, td / 2 + 0.9, Math.PI); }
  } else if (cat === 'chair') {
    box(g, w * 0.8, 0.3, d * 0.8, 0, 1.4, 0, K.cush); box(g, w * 0.8, 1.8, 0.3, 0, 2.4, -d * 0.4 + 0.15, K.frame);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(g, 0.15, 1.3, 0.15, a * w * 0.35, 0.65, b * d * 0.35, K.frame)); box(g, 0.15, 0.6, d * 0.8, -w * 0.4, 1.9, 0, K.frame); box(g, 0.15, 0.6, d * 0.8, w * 0.4, 1.9, 0, K.frame);
  } else if (cat === 'bench') {
    box(g, w, 0.2, d * 0.8, 0, 1.5, 0, K.wood); [-w / 2 + 0.4, w / 2 - 0.4].forEach(x => box(g, 0.25, 1.4, d * 0.7, x, 0.7, 0, K.frame));
  } else if (cat === 'table') {
    box(g, w, 0.15, d, 0, 2.4, 0, K.wood); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(g, 0.2, 2.35, 0.2, a * (w / 2 - 0.3), 1.18, b * (d / 2 - 0.3), K.frame));
  } else if (cat === 'bar') {
    box(g, w, 3.4, d * 0.7, 0, 1.7, -d * 0.15, K.stone); box(g, w + 0.3, 0.15, d * 0.85, 0, 3.5, -d * 0.1, K.wood2); box(g, w - 0.4, 0.1, 0.2, 0, 0.4, d * 0.2 + 0.1, K.frame);
    const n = Math.max(1, Math.floor(w / 2.2)); for (let i = 0; i < n; i++) { const x = -w / 2 + w * (i + 0.5) / n; cyl(g, 0.55, 0.55, 0.15, x, 2.6, d / 2 + 0.6, K.cush2); cyl(g, 0.08, 0.08, 2.5, x, 1.25, d / 2 + 0.6, K.frame, 8); }
  } else if (cat === 'planter') {
    const r = Math.min(w, d) / 2; cyl(g, r * 0.9, r * 0.7, r * 1.6, 0, r * 0.8, 0, K.pot, 24); const f = new THREE.Mesh(new THREE.IcosahedronGeometry(r * 1.05, 1), K.leaf); f.position.y = r * 2.2; f.scale.y = 1.2; f.castShadow = true; g.add(f);
  } else if (cat === 'water') {
    cyl(g, Math.min(w, d) / 2, Math.min(w, d) / 2, 1.2, 0, 0.6, 0, K.stone, 32); cyl(g, Math.min(w, d) / 2 - 0.3, Math.min(w, d) / 2 - 0.3, 0.1, 0, 1.15, 0, K.water, 32);
    cyl(g, 0.5, 0.7, 2.6, 0, 1.3, 0, K.stone); cyl(g, 1.2, 0.9, 0.35, 0, 2.7, 0, K.stone); cyl(g, 1.0, 1.0, 0.06, 0, 2.86, 0, K.water); cyl(g, 0.25, 0.35, 1, 0, 3.3, 0, K.stone);
  } else if (cat === 'sculpture') {
    box(g, w * 0.7, 1.4, d * 0.7, 0, 0.7, 0, K.stone); const k = new THREE.Mesh(new THREE.TorusKnotGeometry(Math.min(w, d) * 0.28, Math.min(w, d) * 0.08, 80, 12), mat('c_bronze', 0x8C6A3F, { metalness: 0.7, roughness: 0.35 })); k.position.y = 1.4 + Math.min(w, d) * 0.5; k.castShadow = true; g.add(k);
  } else if (cat === 'deck') {
    const n = Math.max(1, Math.round(d / 0.5)); for (let i = 0; i < n; i++) box(g, w, 0.12, d / n - 0.04, 0, 0.06, -d / 2 + d * (i + 0.5) / n, i % 2 ? K.wood : K.wood2, false);
  } else if (cat === 'railing' || cat === 'gate') {
    const H = h || 3.5, n = Math.max(2, Math.round(w / 4) + 1);
    for (let i = 0; i < n; i++) box(g, 0.2, H, 0.2, -w / 2 + w * i / (n - 1), H / 2, 0, K.frame);
    box(g, w, 0.18, 0.25, 0, H, 0, K.frame); box(g, w, 0.12, 0.12, 0, 0.4, 0, K.frame);
    if (cat === 'gate') { box(g, w / 2 - 0.2, H - 0.8, 0.12, -w / 4, H / 2, 0, mat('c_gate', 0x55595C, { metalness: 0.5, roughness: 0.4 })); box(g, w / 2 - 0.2, H - 0.8, 0.12, w / 4, H / 2, 0, mat('c_gate', 0x55595C)); }
    else box(g, w - 0.3, H - 0.8, 0.06, 0, H / 2 + 0.1, 0, K.glass);
  } else if (cat === 'privacy') {
    const H = h || 6, n = Math.max(3, Math.round(w / 0.45)); box(g, w, 0.2, 0.3, 0, H, 0, K.frame); box(g, w, 0.2, 0.3, 0, 0.3, 0, K.frame);
    for (let i = 0; i < n; i++) box(g, 0.28, H - 0.4, 0.15, -w / 2 + w * (i + 0.5) / n, H / 2, 0, K.wood);
  } else if (cat === 'feature') {
    const H = h || 8; box(g, w, H, Math.max(0.4, d), 0, H / 2, 0, K.stone); for (let y = 0.5; y < H; y += 0.8) box(g, w + 0.02, 0.06, Math.max(0.4, d) + 0.02, 0, y, 0, mat('c_joint', 0x9C958A), false);
  } else if (cat === 'vgarden') {
    const H = h || 6; box(g, w, H, 0.3, 0, H / 2, -0.1, K.wood2);
    for (let x = -w / 2 + 0.5; x < w / 2; x += 0.9) for (let y = 0.6; y < H; y += 0.9) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), (x + y) % 2 > 1 ? K.leaf : K.leaf2); s.position.set(x, y, 0.2); g.add(s); }
  } else if (cat === 'graffiti') {
    const H = h || 6, op = (it && it.open) || [], pcs = [];   // painted pieces round any door (u from the left end)
    let u = 0; op.slice().sort((a, b) => a.u0 - b.u0).forEach(o => { if (o.u0 > u) pcs.push([u, o.u0, 0, H]); if (H > o.h) pcs.push([o.u0, o.u1, o.h, H]); u = o.u1; }); if (u < w) pcs.push([u, w, 0, H]);
    pcs.forEach(([a0, a1, y0, y1]) => { const pw = a1 - a0, ph = y1 - y0, cx = -w / 2 + (a0 + a1) / 2; if (pw < 0.05 || ph < 0.05) return; box(g, pw, ph, 0.3, cx, y0 + ph / 2, 0, K.white);
      const a = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(0.1, pw - (pcs.length > 1 ? 0.1 : 0.4)), Math.max(0.1, ph - (pcs.length > 1 ? 0.1 : 0.4))), art()); a.position.set(cx, y0 + ph / 2, 0.16); g.add(a); });
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
  if (it.cat === 'cabin' && P.cabinCfg && P.cabinCfg(it)) { const b = cabinModel(P.cabinCfg(it), P.cabinLay(it)); const h = new THREE.Group(); b.g.position.y = 0.6; h.add(b.g); return h; }
  if (it.cat === 'pergola') { try { const b = pergolaModel(/^MTO-PG-/.test(it.cfgId || it.pick || '') ? (it.cfgId || it.pick) : (P.pergolaSku || 'MTO-PG-TW'), pgO(it)), h = new THREE.Group(), y0 = it.deck ? 0.6 : 0;   // 193d: on a deck as high as a porta cabin's
    b.g.position.y = y0; h.add(b.g); if (it.deck) { const dk = mat('c_pdeck', 0x8B6A4A); const n = Math.max(1, Math.round(it.d / 0.5)); for (let k = 0; k < n; k++) box(h, it.w, 0.6, it.d / n - 0.03, it.w / 2, 0.3, it.d * (k + 0.5) / n, k % 2 ? dk : mat('c_pdeck2', 0x7A5C40)); }
    h.userData.pg = { top: (+it.h || 8) + y0 }; return h; } catch (e) { /* fall back to a box */ } }
  const g = generic(it.cat, it.w, it.d, it.h, it); g.position.set(it.w / 2, 0, it.d / 2); const h = new THREE.Group(); h.add(g); return h;
}
const foot = it => (+it.rot || 0) % 180 ? [it.d, it.w] : [it.w, it.d];

function build(P) {
  const g = new THREE.Group(), t = P.site || {}, terr = t.kind === 'terrace';
  if (terr) { const pg = plotModel(t); pg.position.y = 0.6; g.add(pg); R.plot = pg; } else { lawn(g, t); R.plot = null; }
  const items = new THREE.Group(); items.name = 'items'; g.add(items); R.holders = [];
  drawItems(items, R.holders, P);
  return g;
}

function drawItems(items, H, P) {   // 193j: the plan's things as 3D holders (also drawn by the cabin / pergola designers)
  (P.items || []).forEach((it, i) => { if (!it) return;
    if (it.box) {   // 193d: an AC cover sitting over its unit
      const hd = new THREE.Group(); hd.userData.it = i; items.add(hd); H[i] = hd; const bx = it.box, gm = generic('accover', bx.w, bx.d, bx.h); gm.position.set(bx.x + bx.w / 2, 0, bx.z + bx.d / 2); hd.add(gm);
      const hb = new THREE.Mesh(new THREE.BoxGeometry(bx.w, bx.h, bx.d), new THREE.MeshBasicMaterial({ visible: false })); hb.position.set(bx.x + bx.w / 2, bx.h / 2, bx.z + bx.d / 2); hb.userData.hit = i; hd.add(hb);
      if (P.sel === i) { const ln = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(bx.w + 0.3, bx.h + 0.2, bx.d + 0.3)), new THREE.LineBasicMaterial({ color: 0xC26445 })); ln.position.set(bx.x + bx.w / 2, bx.h / 2, bx.z + bx.d / 2); hd.add(ln); }
      return;
    }
    if (it.segs) {   // a screen fixed on the parapet / round the tanks: pieces in plot coordinates
      const hd = new THREE.Group(); hd.userData.it = i; items.add(hd); H[i] = hd;
      it.segs.forEach((sg, k) => { const L = Math.hypot(sg.x1 - sg.x0, sg.z1 - sg.z0); if (L < 0.3) return; const p = new THREE.Group(); p.position.set((sg.x0 + sg.x1) / 2, sg.y, (sg.z0 + sg.z1) / 2); p.rotation.y = -Math.atan2(sg.z1 - sg.z0, sg.x1 - sg.x0); hd.add(p);
        p.add(generic('privacy', L, 0.3, +it.h || 3));
        const hb = new THREE.Mesh(new THREE.BoxGeometry(L, +it.h || 3, 0.8), new THREE.MeshBasicMaterial({ visible: false })); hb.position.y = (+it.h || 3) / 2; hb.userData.hit = i; p.add(hb);
        if (P.sel === i) { const ln = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(L + 0.2, (+it.h || 3) + 0.2, 0.6)), new THREE.LineBasicMaterial({ color: 0xC26445 })); ln.position.y = (+it.h || 3) / 2; p.add(ln); }
        if (!k && P.labels !== false) { const tg = tag(it.label || 'Privacy screen'); tg.position.y = (+it.h || 3) + 1.4; p.add(tg); } });
      return;
    }
    const [fw, fd] = foot(it), hd = new THREE.Group(); hd.userData.it = i; hd.position.set(+it.x + fw / 2, 0, +it.z + fd / 2); hd.rotation.y = -(+it.rot || 0) * Math.PI / 180; items.add(hd);
    const m = model(it, P), ex = it.cat === 'cabin' && it.ex ? it.ex : null; m.position.set(-it.w / 2 + (ex ? ex.l : 0), 0, -it.d / 2 + (ex ? ex.b : 0)); hd.add(m);   // a cabin's body sits inside its plinth / projections
    const hit = new THREE.Mesh(new THREE.BoxGeometry(Math.max(it.w, 0.8), Math.max(+it.h || 3, 2), Math.max(it.d, 0.8)), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = Math.max(+it.h || 3, 2) / 2; hit.userData.hit = i; hd.add(hit);
    if (P.labels !== false && it.cat !== 'cabin') { const tg = tag(it.label || it.cat); tg.position.y = (it.cat === 'pergola' ? 10 : Math.max(+it.h || 3, 3)) + 1.4; hd.add(tg); }
    if (P.sel === i) { const sz = [it.w + 0.6, Math.max(+it.h || 3, 1) + 0.4, it.d + 0.6], ln = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(...sz)), new THREE.LineBasicMaterial({ color: 0xC26445 })); ln.position.y = sz[1] / 2; hd.add(ln);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(it.w + 0.6, it.d + 0.6), new THREE.MeshBasicMaterial({ color: 0xC26445, transparent: true, opacity: 0.18, depthWrite: false })); pl.rotation.x = -Math.PI / 2; pl.position.y = 0.04; hd.add(pl); }
    if (P.bad === i) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(it.w + 0.4, it.d + 0.4), new THREE.MeshBasicMaterial({ color: 0xE0352B, transparent: true, opacity: 0.3, depthWrite: false })); pl.rotation.x = -Math.PI / 2; pl.position.y = 0.05; hd.add(pl); }
    if (it.cat === 'pergola' && Array.isArray(it.att) && it.att.length) {   // 193d: fixed to a wall on those sides — those posts go, a ledger beam closes the gap
      hd.updateMatrixWorld(true); const gone = [], v = new THREE.Vector3(), inZ = (q, z) => q.x >= z.x - 0.05 && q.x <= z.x + z.w + 0.05 && q.z >= z.z - 0.05 && q.z <= z.z + z.d + 0.05;
      hd.traverse(o => { if (o.isMesh && (o.userData.post || o.userData.plate)) { o.getWorldPosition(v); if (it.att.some(z => inZ(v, z))) gone.push(o); } }); gone.forEach(o => o.parent.remove(o));
      const top = (+it.h || 8) + (it.deck ? 0.6 : 0), fm = mat('c_ledger', 0x2E2E2E, { metalness: 0.4, roughness: 0.5 });
      it.att.forEach(z => { const b = box(items, z.w, 0.6, z.d, z.x + z.w / 2, top - 0.3, z.z + z.d / 2, fm); b.userData.it = i; });
    }
    H[i] = hd;
  });
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
  else { R.cam.position.set(pw / 2 + d * 0.3, d * 0.62 + 6, pd + d * 0.32); C.enableRotate = true; }
  C.update();
}
export function show(el, P, opts) {
  opts = opts || {}; ensure(el); R.P = P; R.place = !!opts.place;
  const t = P.site || {}, key = JSON.stringify([t, P.items, P.sel, P.bad, P.labels]), dims = [t.kind, t.pw, t.pd].join('x');
  if (key !== R.key) {
    if (R.group) { R.scene.remove(R.group); R.group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    R.group = build(P); R.scene.add(R.group); R.key = key;
    const pw = +t.pw || 30, pd = +t.pd || 60; R.sun.position.set(pw / 2 + 40, 80, pd / 2 + 30); R.sun.target.position.set(pw / 2, 0, pd / 2);
  }
  if (dims !== R.dims || (opts.view || '3d') !== R.view) { R.dims = dims; R.view = opts.view || '3d'; camHome(t, R.view); }
}
export function onEvent(f) { HANDLER = f; }
export function zoom(f) { if (!R) return; const C = R.controls, v = R.cam.position.clone().sub(C.target); R.cam.position.copy(C.target).add(v.multiplyScalar(f)); C.update(); }
export function home() { if (R && R.P) camHome(R.P.site || {}, R.view); }
export function resize() { size(); }
export function snapshot() { return R ? R.renderer.domElement.toDataURL('image/jpeg', 0.85) : null; }

// ---- picking and dragging: items (step 2) or the blocks already on the roof (step 1)
function rayAt(e) { const r = R.renderer.domElement.getBoundingClientRect(); R.ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), R.cam); return R.ray; }
function floorAt(e) { const p = new THREE.Vector3(); return rayAt(e).ray.intersectPlane(R.floor, p) ? p : null; }
function pDown(e) {
  if (!R || !R.group || !HANDLER || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const ray = rayAt(e), f = floorAt(e); R.down = { x: e.clientX, y: e.clientY };
  if (R.place && R.plot) {   // step 1: a block on the roof
    const hits = ray.intersectObject(R.plot, true), h = hits.find(z => { let o = z.object; while (o && !o.userData.st) o = o.parent; return o; });
    if (h && f) { let o = h.object; while (!o.userData.st) o = o.parent; const bk = (R.P.site.blocks || [])[o.userData.st.i]; if (bk) { R.drag = { kind: 'block', i: o.userData.st.i, obj: o, f0: f.clone(), x0: +bk.x, z0: +bk.z, moved: false, fixed: !!bk.lock, side: bk.side || 'free', pos0: o.position.clone() }; R.controls.enabled = false; e.preventDefault(); } }
    return;
  }
  if (R.place) return;
  const hits = ray.intersectObjects(R.holders.filter(Boolean), true), h = hits.find(z => z.object.userData.hit != null) || hits[0];
  let i = null; if (h) { let o = h.object; while (o && o.userData.it == null) o = o.parent; if (o) i = o.userData.it; }
  if (i != null && f) { const it = R.P.items[i]; R.drag = { kind: 'item', i, obj: R.holders[i], f0: f.clone(), x0: +it.x, z0: +it.z, moved: false, fixed: !!(it.segs || it.box || it.lock), pos0: R.holders[i].position.clone() }; R.controls.enabled = false; e.preventDefault(); }
  else R.tapEmpty = true;
}
function pMove(e) {
  const d = R && R.drag; if (!d) return; const f = floorAt(e); if (!f) return;
  if (d.fixed) return; const dx = f.x - d.f0.x, dz = f.z - d.f0.z; if (!d.moved && Math.hypot(e.clientX - R.down.x, e.clientY - R.down.y) < 5) return; d.moved = true;
  d.nx = Math.round((d.x0 + dx) * 2) / 2; d.nz = Math.round((d.z0 + dz) * 2) / 2;
  if (d.side === 'left' || d.side === 'right') d.nx = d.x0; if (d.side === 'back' || d.side === 'front') d.nz = d.z0;   // on a wall: slides along it only d.obj.position.set(d.pos0.x + (d.nx - d.x0), d.pos0.y, d.pos0.z + (d.nz - d.z0));
}
function pUp(e) {
  if (!R) return; const d = R.drag; R.drag = null; R.controls.enabled = true;
  if (d) { if (d.moved) HANDLER({ t: d.kind === 'block' ? 'block' : 'move', i: d.i, x: d.nx, z: d.nz }); else if (d.kind === 'item') HANDLER({ t: 'sel', i: d.i }); return; }
  if (R.tapEmpty && R.down && Math.hypot(e.clientX - R.down.x, e.clientY - R.down.y) < 5) HANDLER({ t: 'sel', i: null });
  R.tapEmpty = false;
}
window.Space3D = { show, onEvent, zoom, home, resize, snapshot, _r: () => R };
