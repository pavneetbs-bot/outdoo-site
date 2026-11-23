// outrr "Plan your space" — the 3D scene (three.js): the customer's terrace or lawn, and everything they place on it.
// Cabins and pergolas are the real models (cabin3d.js / pergola3d.js); every other category is one common model,
// sized to what the customer set. Plot coords: x across the width (0 = left), z front-to-back (0 = back, pd = front),
// feet, y up, floor / slab at y = 0. Items: {cat, x, z, w, d, h, rot} — (x, z) = back-left corner of the footprint.
import * as THREE from './vendor/three/three.module.min.js';
import { OrbitControls } from './vendor/three/OrbitControls.js';
import { RoomEnvironment } from './vendor/three/RoomEnvironment.js';
import { cabinModel, plotModel } from './cabin3d.js?v=33';
import { pergolaModel } from './pergola3d.js?v=22';
import { outline } from './plan2d.js?v=9';

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
  R = { renderer, scene, cam, controls, sun, hemi, el, group: null, key: '', view: '3d', ray: new THREE.Raycaster(), floor: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0) };
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
// 235: four looks for the same setup — frames, wood, cushions, accents, stone
const THEMES = { modern: { frame: 0x2E2E2E, wood: 0x8C8C8C, wood2: 0x5E5E5E, cush: 0xEDEDED, cush2: 0x3A4A5A, stone: 0xC9C6C0 }, natural: { frame: 0x6B4A2E, wood: 0xA8784C, wood2: 0x7A5537, cush: 0xE8E1D4, cush2: 0x8A9A5B, stone: 0xC8B89A },
  moroccan: { frame: 0x3A2A22, wood: 0x8E5A3A, wood2: 0x6A3F28, cush: 0xF2E2C8, cush2: 0x1F6F7E, stone: 0xD9B48C }, tropical: { frame: 0xF1EDE4, wood: 0xC49A6C, wood2: 0x9C7650, cush: 0xF7F4EC, cush2: 0x2E7D5B, stone: 0xE2D8C4 } };
let THEME = 'natural';
const C = () => { const T = THEMES[THEME] || THEMES.natural, k = '_' + THEME; return {
  frame: mat('c_frame' + k, T.frame, { metalness: 0.4, roughness: 0.5 }), wood: mat('c_wood' + k, T.wood), wood2: mat('c_wood2' + k, T.wood2),
  cush: mat('c_cush' + k, T.cush), cush2: mat('c_cush2' + k, T.cush2), stone: mat('c_stone' + k, T.stone), dark: mat('c_dark', 0x3A3A3A),
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
  const plants = (x, z, w2, d2, y) => { box(g, w2 - 0.12, 0.05, d2 - 0.12, x, y - 0.06, z, soil); const n = Math.max(1, Math.round(Math.max(w2, d2) / 1.0)), along = w2 >= d2, r = Math.min(Math.min(w2, d2) * 0.36, 0.55);
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
  } else if (cat === 'stool') {   // 245: a bar chair — round seat, a slim post, a foot ring
    cyl(g, 0.6, 0.6, 0.15, 0, 2.55, 0, K.cush, 18); cyl(g, 0.07, 0.07, 2.45, 0, 1.25, 0, K.frame, 8); cyl(g, 0.5, 0.55, 0.06, 0, 0.03, 0, K.frame, 18); const r = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 6, 20), K.frame); r.rotation.x = Math.PI / 2; r.position.y = 0.9; g.add(r);
  } else if (cat === 'chair') {
    box(g, w * 0.8, 0.3, d * 0.8, 0, 1.4, 0, K.cush); box(g, w * 0.8, 1.8, 0.3, 0, 2.4, -d * 0.4 + 0.15, K.frame);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(g, 0.15, 1.3, 0.15, a * w * 0.35, 0.65, b * d * 0.35, K.frame)); box(g, 0.15, 0.6, d * 0.8, -w * 0.4, 1.9, 0, K.frame); box(g, 0.15, 0.6, d * 0.8, w * 0.4, 1.9, 0, K.frame);
  } else if (cat === 'shaftcover') {   // 241: on top of the shaft — an MS tube frame with a white polycarbonate sheet, a little sloped
    const y = (h || 3.4) - 0.4, fm = K.frame; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(g, 0.15, 0.5, 0.15, a * (w / 2 - 0.08), y + 0.25, b * (d / 2 - 0.08), fm));
    box(g, w, 0.12, 0.12, 0, y + 0.5, -d / 2 + 0.06, fm); box(g, w, 0.12, 0.12, 0, y + 0.62, d / 2 - 0.06, fm); box(g, 0.12, 0.12, d, -w / 2 + 0.06, y + 0.56, 0, fm); box(g, 0.12, 0.12, d, w / 2 - 0.06, y + 0.56, 0, fm);
    const sh = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.05, d + 0.3), mat('c_poly', 0xF4F4F2, { roughness: 0.35, transparent: true, opacity: 0.88 })); sh.position.set(0, y + 0.66, 0); sh.rotation.x = Math.atan2(0.12, d); sh.castShadow = true; g.add(sh);
  } else if (cat === 'fbench') {   // 239: built-in seating — a masonry seat with a cushion and a backrest against the wall (back = −z)
    box(g, w, 1.4, d - 0.3, 0, 0.7, 0.15, K.stone); box(g, w - 0.1, 0.25, d - 0.5, 0, 1.52, 0.2, K.cush); box(g, w, 1.5, 0.3, 0, 2.15, -d / 2 + 0.15, K.stone); box(g, w - 0.2, 1.0, 0.25, 0, 2.15, -d / 2 + 0.45, K.cush2);
  } else if (cat === 'counter') {   // 239: food / buffet counter — base, stone top, a cooktop and a sink on it (back = −z, against the wall)
    box(g, w, 2.9, d * 0.9, 0, 1.45, -d * 0.05, K.wood2); box(g, w + 0.2, 0.15, d, 0, 2.97, 0, K.stone); box(g, Math.min(2, w / 3), 0.06, 1.4, -w / 4, 3.07, 0, K.dark); box(g, 1.6, 0.06, 1.2, w / 4, 3.07, 0, mat('c_sink', 0xB8BCC0, { metalness: 0.7, roughness: 0.3 }));
    box(g, w, 1.6, 0.15, 0, 3.8, -d / 2 + 0.08, K.stone);
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
      box(sl, seg, 1.4, 1.7, 0, 0.7, 0, K.stone); box(sl, seg - 0.03, 0.25, 1.5, 0, 1.52, 0.05, K.cush); box(sl, seg, 1.5, 0.3, 0, 2.15, -0.75, K.stone); }
  } else if (cat === 'bar') {   // 241: island bar — free on both sides, stools at the front; L = a return arm on the right
    const L = it && it.shape === 'L', D = L ? 2.2 : d * 0.7, arm = (bw, bd, x, z, st) => { box(g, bw, 3.4, bd, x, 1.7, z, K.stone); box(g, bw + 0.3, 0.15, bd + 0.5, x, 3.5, z + 0.1, K.wood2); };
    if (L) { arm(w, D, 0, -d / 2 + D / 2); arm(D, d - D, w / 2 - D / 2, D / 2); } else arm(w, D, 0, -d * 0.15);
    const fz = L ? -d / 2 + D + 0.6 : d / 2 + 0.6, run = L ? w - D : w, x0 = -w / 2, n = Math.max(1, Math.floor(run / 2.2));
    for (let i = 0; i < n; i++) { const x = x0 + run * (i + 0.5) / n; cyl(g, 0.55, 0.55, 0.15, x, 2.6, fz, K.cush2); cyl(g, 0.08, 0.08, 2.5, x, 1.25, fz, K.frame, 8); }
  } else if (cat === 'planter' && it && /^MTO-PL-[A-Z]{2}$/.test(it.cfgId || it.pick || '')) {   // 199: an outrr planter — its own size, finish colour, plinth, plants, LED glow underneath
    planterModel(g, w, d, h, it, K);
  } else if (cat === 'planter') {
    tropical(g, w, d, it);   // 241: a mix of tropical plants — palms, big leaves, bushes — big and small
  } else if (cat === 'water' && it && it.mech) {   // 247 (owner): water feature by its mechanism — cascade / wall fall / rain curtain / geyser jets
    const sheet = mat('c_wsheet', 0xA9DCEB, { transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.1, emissive: 0x2E6F86, emissiveIntensity: 0.15, side: THREE.DoubleSide }), m = it.mech;
    const pool = (pw, pd, z0) => { box(g, pw, 0.9, pd, 0, 0.45, z0, K.stone); box(g, pw - 0.3, 0.06, pd - 0.3, 0, 0.88, z0, K.water); };
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
    const n = Math.max(1, Math.round(d / 0.5)); for (let i = 0; i < n; i++) box(g, w, 0.12, d / n - 0.04, 0, 0.06, -d / 2 + d * (i + 0.5) / n, i % 2 ? K.wood : K.wood2, false);
  } else if (cat === 'railing' || cat === 'gate') {
    const H = h || 3.5, n = Math.max(2, Math.round(w / 4) + 1);
    for (let i = 0; i < n; i++) box(g, 0.2, H, 0.2, -w / 2 + w * i / (n - 1), H / 2, 0, K.frame);
    box(g, w, 0.18, 0.25, 0, H, 0, K.frame); box(g, w, 0.12, 0.12, 0, 0.4, 0, K.frame);
    if (cat === 'gate') { box(g, w / 2 - 0.2, H - 0.8, 0.12, -w / 4, H / 2, 0, mat('c_gate', 0x55595C, { metalness: 0.5, roughness: 0.4 })); box(g, w / 2 - 0.2, H - 0.8, 0.12, w / 4, H / 2, 0, mat('c_gate', 0x55595C)); }
    else box(g, w - 0.3, H - 0.8, 0.06, 0, H / 2 + 0.1, 0, K.glass);
  } else if (cat === 'privacy') {
    if (it && /^MTO-P[ST]-/.test(String(it.cfgId || it.pick || ''))) { screenModel(g, w, h, it, K); return g; }
    const H = h || 6, n = Math.max(3, Math.round(w / 0.45)); box(g, w, 0.2, 0.3, 0, H, 0, K.frame); box(g, w, 0.2, 0.3, 0, 0.3, 0, K.frame);
    for (let i = 0; i < n; i++) box(g, 0.28, H - 0.4, 0.15, -w / 2 + w * (i + 0.5) / n, H / 2, 0, K.wood);
  } else if (cat === 'feature' && it && it.fdesign && it.fdesign !== 'stone') {   // 247 (owner): designer feature walls — light and a bit of green
    const H = h || 8, D0 = Math.max(0.4, d), led = mat('c_cove', 0xFFD9A0, { emissive: 0xFFB15E, emissiveIntensity: 1.8 }), fd = it.fdesign;
    if (fd === 'fluted') { box(g, w, H, D0, 0, H / 2, -0.05, mat('c_flbase', 0xD8CFC2)); const n = Math.max(6, Math.round(w / 0.35)); for (let k = 0; k < n; k++) { const c0 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, H - 1.6, 10, 1, false, 0, Math.PI), mat('c_flute', 0xE6DED2)); c0.rotation.y = -Math.PI / 2; c0.position.set(-w / 2 + w * (k + 0.5) / n, H / 2 + 0.4, D0 / 2 - 0.05); g.add(c0); }
      box(g, w - 0.2, 0.06, 0.1, 0, H - 0.35, D0 / 2 + 0.1, led); box(g, w, 1.0, 1.1, 0, 0.5, D0 / 2 + 0.55, K.stone); for (let x = -w / 2 + 0.5; x < w / 2; x += 0.8) { const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), x % 1.6 > 0.8 ? K.leaf : K.leaf2); lf.position.set(x, 1.2, D0 / 2 + 0.55); g.add(lf); } }
    else if (fd === 'slats') { box(g, w, H, D0, 0, H / 2, -0.1, K.dark); box(g, w - 0.4, H - 0.8, 0.05, 0, H / 2, D0 / 2 - 0.05, led); const n = Math.max(6, Math.round(w / 0.45)); for (let k = 0; k < n; k++) box(g, 0.22, H - 0.2, 0.18, -w / 2 + w * (k + 0.5) / n, H / 2, D0 / 2 + 0.1, K.wood);
      for (let y = 1; y < H - 1; y += 1.4) { const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), K.leaf2); lf.position.set(w / 2 - 0.4 - (y % 2.8 > 1.4 ? 0.3 : 0), y, D0 / 2 + 0.3); g.add(lf); } }
    else { box(g, w, H, D0, 0, H / 2, -0.05, mat('c_plast', 0xEDE7DD)); const gw = w * 0.5; box(g, gw, H - 1, 0.3, -w / 2 + gw / 2 + 0.2, H / 2, D0 / 2 + 0.1, K.wood2);
      for (let x = -w / 2 + 0.6; x < -w / 2 + gw; x += 0.75) for (let y = 0.9; y < H - 0.6; y += 0.75) { const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), (x + y) % 1.5 > 0.75 ? K.leaf : K.leaf2); lf.position.set(x, y, D0 / 2 + 0.35); g.add(lf); }
      [0.25, 0.55, 0.85].forEach(f => { box(g, 0.25, 0.25, 0.3, -w / 2 + w * f + gw * 0.5 * (1 - f) + 0.6, 0.4, D0 / 2 + 0.2, K.dark); }); box(g, w - gw - 0.6, 0.06, 0.1, gw / 2 + 0.1, H - 0.4, D0 / 2 + 0.1, led); }
  } else if (cat === 'feature') {
    const H = h || 8; box(g, w, H, Math.max(0.4, d), 0, H / 2, 0, K.stone); for (let y = 0.5; y < H; y += 0.8) box(g, w + 0.02, 0.06, Math.max(0.4, d) + 0.02, 0, y, 0, mat('c_joint', 0x9C958A), false);
    if (it && it.fdesign === 'stone') { [-0.35, 0, 0.35].forEach(f => box(g, 0.3, 0.2, 0.3, w * f, 0.1, Math.max(0.4, d) / 2 + 0.25, K.dark)); for (let y = 0.4; y < H - 0.5; y += 0.45) { const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3 + (y % 0.9) * 0.2, 0), y % 0.9 > 0.45 ? K.leaf : K.leaf2); lf.position.set(-w / 2 + 0.35 + Math.sin(y * 3) * 0.25, y, Math.max(0.4, d) / 2 + 0.2); g.add(lf); } }
  } else if (cat === 'vgarden') {
    const H = h || 6; box(g, w, H, 0.3, 0, H / 2, -0.1, K.wood2);
    for (let x = -w / 2 + 0.5; x < w / 2; x += 0.9) for (let y = 0.6; y < H; y += 0.9) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), (x + y) % 2 > 1 ? K.leaf : K.leaf2); s.position.set(x, y, 0.2); g.add(s); }
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
  } else if (cat === 'firepit') {
    const r = Math.min(w, d) / 2; cyl(g, r, r * 0.9, 1.2, 0, 0.6, 0, K.dark, 28); cyl(g, r - 0.3, r - 0.3, 0.05, 0, 1.2, 0, mat('c_ember', 0x3A1A0A), 28);
    [[0, 0, 1.4], [0.5, 0.2, 1], [-0.4, 0.3, 1.1], [0.1, -0.5, 0.9]].forEach(([x, z, hh]) => { const f = new THREE.Mesh(new THREE.ConeGeometry(0.35, hh, 8), mat('c_flame', 0xFF8A2A, { emissive: 0xFF6A00, emissiveIntensity: 1.2, roughness: 1 })); f.position.set(x, 1.2 + hh / 2, z); g.add(f); });
  } else if (cat === 'jacuzzi') {
    const H = h || 3; box(g, w, H, d, 0, H / 2, 0, K.white); box(g, w - 0.8, 0.08, d - 0.8, 0, H - 0.25, 0, K.water); box(g, w + 0.4, 0.15, d + 0.4, 0, H, 0, K.wood2);
    box(g, 2, 0.8, 1.2, 0, 0.4, d / 2 + 0.6, K.wood2);
  } else if (cat === 'lights') {
    cyl(g, 0.15, 0.2, (h || 3) - 0.4, 0, ((h || 3) - 0.4) / 2, 0, K.frame, 10); cyl(g, 0.3, 0.25, 0.4, 0, (h || 3) - 0.2, 0, mat('c_lamp', 0xFFE2A8, { emissive: WARM, emissiveIntensity: 1 }), 12);
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
  if (it.cat === 'cabin' && P.cabinCfg && P.cabinCfg(it)) { const b = cabinModel(P.cabinCfg(it), P.cabinLay(it)); const h = new THREE.Group(); b.g.position.y = 0.6; h.add(b.g); return h; }
  if (it.cat === 'pergola' && !it.cfgId && !it.pick && !P.fullPergola) {   // 245 (owner): in the plan a light, simple pergola — 4 slim posts, a frame, thin rafters; the chosen design shows in full
    const h = new THREE.Group(), y0 = it.deck ? 0.6 : 0, H = (+it.h || 8), w = +it.w, d = +it.d, fm = mat('c_pgs', 0x2F2F2F, { metalness: 0.35, roughness: 0.5 }), sp = Math.max(w, d) > 16 ? 3 : 2;
    if (it.deck) { const dk = mat('c_pdeck', 0x8B6A4A); box(h, w, 0.6, d, w / 2, 0.3, d / 2, dk); }
    const px = [0.2, w - 0.2].concat(w > 16 ? [w / 2] : []), pz = [0.2, d - 0.2].concat(d > 16 ? [d / 2] : []);
    px.forEach(x => pz.forEach(z => { if ((x === w / 2 && z !== 0.2 && z !== d - 0.2) || (z === d / 2 && x !== 0.2 && x !== w - 0.2)) return; const p0 = box(h, 0.3, H, 0.3, x, y0 + H / 2, z, fm); p0.userData.post = 1; }));
    box(h, w, 0.35, 0.18, w / 2, y0 + H - 0.18, 0.2, fm); box(h, w, 0.35, 0.18, w / 2, y0 + H - 0.18, d - 0.2, fm); box(h, 0.18, 0.35, d, 0.2, y0 + H - 0.18, d / 2, fm); box(h, 0.18, 0.35, d, w - 0.2, y0 + H - 0.18, d / 2, fm);
    for (let x = 1.2; x < w - 0.6; x += 1.2) box(h, 0.1, 0.22, d - 0.2, x, y0 + H + 0.05, d / 2, fm, false);
    h.userData.pg = { top: H + y0 }; return h; }
  if (it.cat === 'pergola') { try { const b = pergolaModel(/^MTO-PG-/.test(it.cfgId || it.pick || '') ? (it.cfgId || it.pick) : (P.pergolaSku || 'MTO-PG-TW'), pgO(it)), h = new THREE.Group(), y0 = it.deck ? 0.6 : 0;   // 193d: on a deck as high as a porta cabin's
    b.g.position.y = y0; h.add(b.g); if (it.deck) { const dk = mat('c_pdeck', 0x8B6A4A); const n = Math.max(1, Math.round(it.d / 0.5)); for (let k = 0; k < n; k++) box(h, it.w, 0.6, it.d / n - 0.03, it.w / 2, 0.3, it.d * (k + 0.5) / n, k % 2 ? dk : mat('c_pdeck2', 0x7A5C40)); }
    h.userData.pg = { top: (+it.h || 8) + y0 }; return h; } catch (e) { /* fall back to a box */ } }
  const g = generic(it.cat, it.w, it.d, it.h, it); g.position.set(it.w / 2, 0, it.d / 2); const h = new THREE.Group(); h.add(g); return h;
}
const foot = it => (+it.rot || 0) % 180 ? [it.d, it.w] : [it.w, it.d];

function build(P) {
  if (R) R.nl = []; const g = new THREE.Group(), t = P.site || {}, terr = t.kind === 'terrace';
  if (terr) { const pg = plotModel(t); pg.position.y = 0.6; g.add(pg); R.plot = pg; if (t.floor) try { floorFin(g, t, P.items || []); } catch (e) {} } else { lawn(g, t); R.plot = null; }
  const items = new THREE.Group(); items.name = 'items'; g.add(items); R.holders = [];
  drawItems(items, R.holders, P);
  if (P.measure && terr) { try { g.add(measures(P)); } catch (e) {} }
  if (terr && t.light === 'full') try { wallLights(g, t); } catch (e) {}
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
function night(on) { if (!R || R.night === on) return; R.night = on; (R.nl || []).forEach(m => { m.visible = on; }); R.scene.background = new THREE.Color(on ? 0x141B2B : 0xeef0ea); R.sun.intensity = on ? 0.08 : 1.8; R.hemi.intensity = on ? 0.12 : 0.75; if ('environmentIntensity' in R.scene) R.scene.environmentIntensity = on ? 0.15 : 1; }
// 241: tropical planting in a pot — areca palm / big-leaf (monstera, bird of paradise) / round bush, size varies from pot to pot
function tropical(g, w, d, it) { const sd = Math.abs(Math.round((+(it && it.x) || 1) * 13 + (+(it && it.z) || 1) * 7)), rnd = (k => () => (k = (k * 16807) % 2147483647) / 2147483647)(sd + 11), r = Math.min(w, d) / 2, sz = 0.8 + rnd() * 0.9, ty = sd % 3;
  const pot = sd % 2 ? mat('c_potc', 0x3A3836, { roughness: 0.7 }) : mat('c_pott', 0xB06A47, { roughness: 0.9 }); cyl(g, r * 0.92, r * 0.72, r * 1.7, 0, r * 0.85, 0, pot, 20); const y0 = r * 1.7;
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
const WARM = 0xFFB15E, LENS = 0xFFC98A;
function wallLights(g, t) { const W = WARM, gm = glow(LENS), blk = mat('lt_blk', 0x1E1E1E, { roughness: 0.45, metalness: 0.4 }), E = 0.75;
  const updown = (x, y, z, nx, nz) => { const c = new THREE.Group(); c.position.set(x + nx * 0.16, y, z + nz * 0.16); g.add(c);   // a black cylinder on the wall, light out of both ends
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.75, 16), blk); c.add(body); [-1, 1].forEach(sg => { const ln = new THREE.Mesh(new THREE.CircleGeometry(0.1, 14), gm); ln.rotation.x = sg > 0 ? -Math.PI / 2 : Math.PI / 2; ln.position.y = sg * 0.376; c.add(ln); });
    [-1, 1].forEach(sg => { const l = new THREE.PointLight(W, 1.1, 5.5, 2); l.position.set(x + nx * 0.35, y + sg * 1.4, z + nz * 0.35); g.add(l); }); };
  const step = (x, y, z, nx, nz) => { const b = new THREE.Mesh(new THREE.BoxGeometry(nx ? 0.08 : 0.5, 0.22, nz ? 0.08 : 0.5), blk); b.position.set(x, y, z); g.add(b); const ln = new THREE.Mesh(new THREE.BoxGeometry(nx ? 0.02 : 0.36, 0.05, nz ? 0.02 : 0.36), gm); ln.position.set(x + nx * 0.05, y - 0.06, z + nz * 0.05); g.add(ln);
    const l = new THREE.PointLight(W, 0.9, 5, 2); l.position.set(x + nx * 0.6, y - 0.6, z + nz * 0.6); g.add(l); };
  (t.blocks || []).filter(b => ['mumty', 'room', 'lift'].includes(b.type)).forEach(b => { const cx = b.x + b.w / 2, cz = b.z + b.d / 2, dx = t.pw / 2 - cx, dz = t.pd / 2 - cz;
    const door = b.door || (Math.abs(dx) / t.pw > Math.abs(dz) / t.pd ? (dx > 0 ? 'right' : 'left') : (dz > 0 ? 'front' : 'back')), dw = 2.8;
    if (Math.abs(dx) / t.pw > Math.abs(dz) / t.pd) { const rt = dx > 0, x = rt ? b.x + b.w : b.x, nd = door === (rt ? 'right' : 'left'); for (let z = b.z + 1.5; z < b.z + b.d - 1; z += 5) { if (nd && Math.abs(z - cz) < dw) continue; updown(x, 6, z, rt ? 1 : -1, 0); } }
    else { const fr = dz > 0, z = fr ? b.z + b.d : b.z, nd = door === (fr ? 'front' : 'back'); for (let x = b.x + 1.5; x < b.x + b.w - 1; x += 5) { if (nd && Math.abs(x - cx) < dw) continue; updown(x, 6, z, 0, fr ? 1 : -1); } } });
  const par = (+t.par || 3) - 0.9; for (let x = 4; x < t.pw - 3; x += 9) step(x, par, E + 0.04, 0, 1); for (let z = 4; z < t.pd - 3; z += 9) { step(E + 0.04, par, z, 1, 0); step(t.pw - E - 0.04, par, z, -1, 0); } }
// the setup's own lights: pergola profile, cove under bar / feature wall, spikes in planters, downlights on screens every 4 ft
function itemLights(hd, it, P) { const lv = (P.site || {}).light; if (!lv) return; const W = WARM, gm = glow(LENS), w = it.w, d = it.d, h = +it.h || 3;
  if (it.cat === 'pergola') { const y = Math.max(7, h) - 0.35; [[w, 0.12, 0, -d / 2 + 0.3], [w, 0.12, 0, d / 2 - 0.3]].forEach(([a, b, x, z]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(a - 0.6, 0.08, b), gm); m.position.set(x, y, z); hd.add(m); });
    [-w / 2 + 0.3, w / 2 - 0.3].forEach(x => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, d - 0.6), gm); m.position.set(x, y, 0); hd.add(m); }); const l = new THREE.PointLight(W, 4, Math.max(w, d) * 1.2, 2); l.position.set(0, y - 0.5, 0); hd.add(l); }
  else if (it.cat === 'feature' || it.cat === 'bar') { const m = new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, 0.06, 0.1), gm); m.position.set(0, it.cat === 'bar' ? 3.3 : 0.35, d / 2 + 0.08); hd.add(m); const l = new THREE.PointLight(W, 2.2, 7, 2); l.position.set(0, it.cat === 'bar' ? 3 : 0.8, d / 2 + 0.8); hd.add(l); }
  else if (it.cat === 'planter' || it.cat === 'vgarden') { const m = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 8), gm); m.position.set(w / 2 - 0.3, 0.3, d / 2 + 0.15); hd.add(m); const l = new THREE.SpotLight(W, 3, 7, 0.6, 0.6); l.position.set(w / 2 - 0.3, 0.4, d / 2 + 0.3); l.target.position.set(0, h, 0); hd.add(l, l.target); }
}
// 234: floor finishes — tiles (plain / Moroccan) over the whole roof, a pebble border along the parapet
const TEX = {};
function finTex(k) { if (TEX[k]) return TEX[k]; const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d');
  const flat = { plain: ['#EFEBE4', '#CFC8BD'], grey: ['#B9B8B4', '#9E9C97'], stone: ['#D8C9A8', '#BBAA86'], terracotta: ['#C98B63', '#A86E4B'] }[k];
  if (flat) { x.fillStyle = flat[0]; x.fillRect(0, 0, 256, 256); if (k === 'stone') for (let i = 0; i < 90; i++) { x.fillStyle = 'rgba(120,100,70,.12)'; x.fillRect(Math.random() * 256, Math.random() * 256, 3 + Math.random() * 10, 2 + Math.random() * 4); } x.strokeStyle = flat[1]; x.lineWidth = 4; x.strokeRect(0, 0, 256, 256); }
  else if (k === 'kota') { x.fillStyle = '#9AA596'; x.fillRect(0, 0, 256, 256); [[128, 0], [0, 128]].forEach(([a, b], j) => { x.fillStyle = j ? '#8F9A8B' : '#A7B1A2'; x.fillRect(a, b, 128, 128); }); x.strokeStyle = '#7E887A'; x.lineWidth = 2; x.strokeRect(0, 0, 256, 256); x.beginPath(); x.moveTo(128, 0); x.lineTo(128, 256); x.moveTo(0, 128); x.lineTo(256, 128); x.stroke(); }
  else if (k === 'marble') { x.fillStyle = '#F2F0EC'; x.fillRect(0, 0, 256, 256); x.strokeStyle = 'rgba(160,150,135,.5)'; x.lineWidth = 2; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(0, 40 + i * 60); x.bezierCurveTo(80, 20 + i * 70, 160, 90 + i * 40, 256, 60 + i * 55); x.stroke(); } x.strokeStyle = '#DCD8D0'; x.strokeRect(0, 0, 256, 256); }
  else if (k === 'cement') { x.fillStyle = '#C9C5BE'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(90,85,78,${Math.random() * 0.08})`; x.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 6, 2 + Math.random() * 6); } }
  else if (k === 'terrazzo') { x.fillStyle = '#EFE8DC'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 380; i++) { x.fillStyle = ['#C9B99E', '#9FA89A', '#D2B48F', '#B7AE9F', '#A9B3A4'][i % 5]; x.beginPath(); x.ellipse(Math.random() * 256, Math.random() * 256, 1.5 + Math.random() * 4, 1.2 + Math.random() * 3, Math.random() * 3, 0, 7); x.fill(); } x.strokeStyle = '#DED5C6'; x.lineWidth = 2; x.strokeRect(0, 0, 256, 256); }
  else if (k === 'checker') { x.fillStyle = '#E9E6E0'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#8F8D88'; x.fillRect(0, 0, 128, 128); x.fillRect(128, 128, 128, 128); x.strokeStyle = '#C9C5BD'; x.lineWidth = 3; x.strokeRect(0, 0, 256, 256); x.beginPath(); x.moveTo(128, 0); x.lineTo(128, 256); x.moveTo(0, 128); x.lineTo(256, 128); x.stroke(); }
  else if (k === 'moroccan') { x.fillStyle = '#F3EEE6'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#2F6F7E'; x.globalAlpha = 0.75; const c = 128, r = 90;
    x.beginPath(); x.moveTo(c, c - r); x.quadraticCurveTo(c + 60, c - 60, c + r, c); x.quadraticCurveTo(c + 60, c + 60, c, c + r); x.quadraticCurveTo(c - 60, c + 60, c - r, c); x.quadraticCurveTo(c - 60, c - 60, c, c - r); x.fill();
    x.globalAlpha = 1; x.fillStyle = '#F3EEE6'; x.beginPath(); x.arc(c, c, 26, 0, 7); x.fill(); x.strokeStyle = '#C9C1B4'; x.lineWidth = 3; x.strokeRect(0, 0, 256, 256); }
  else { x.fillStyle = '#D9D3C8'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 260; i++) { x.fillStyle = ['#B8B0A3', '#A9A194', '#C7BFB2', '#9E968A'][i % 4]; x.beginPath(); x.ellipse(Math.random() * 256, Math.random() * 256, 6 + Math.random() * 7, 5 + Math.random() * 5, Math.random() * 3, 0, 7); x.fill(); } }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return (TEX[k] = t); }
// 241: pebbles only round the deck and in front of the feature wall (not the whole parapet)
export function pebNear(t, items) { const out = [], E = 0.75, b = 0.6, cl = r => { const x0 = Math.max(E, r[0]), z0 = Math.max(E, r[1]), x1 = Math.min(+t.pw - E, r[0] + r[2]), z1 = Math.min(+t.pd - E, r[1] + r[3]); return x1 - x0 > 0.3 && z1 - z0 > 0.3 ? [x0, z0, x1 - x0, z1 - z0] : null; };
  (items || []).forEach(it => { if (!it || it.segs) return; const rot = +it.rot || 0, sw = rot % 180 ? it.d : it.w, sd = rot % 180 ? it.w : it.d, x = +it.x, z = +it.z;
    if (it.cat === 'deck') [[x - b, z - b, sw + 2 * b, b], [x - b, z + sd, sw + 2 * b, b], [x - b, z, b, sd], [x + sw, z, b, sd]].forEach(r => { const c = cl(r); if (c) out.push(c); });
    else if (it.cat === 'feature') { const f = { 0: [x, z + sd, sw, b], 180: [x, z - b, sw, b], 90: [x - b, z, b, sd], 270: [x + sw, z, b, sd] }[rot % 360]; const c = f && cl(f); if (c) out.push(c); } });
  return out; }
function floorFin(g, t, items) {
  const f = t.floor || {}, pw = +t.pw, pd = +t.pd, E = 0.75;
  if (['plain', 'moroccan', 'stone', 'terracotta', 'grey', 'terrazzo', 'checker', 'kota', 'marble', 'cement'].includes(f.tile)) { const sh = new THREE.Shape(); outline(t).forEach((p, i) => i ? sh.lineTo(p[0], -p[1]) : sh.moveTo(p[0], -p[1]));
    const tx = finTex(f.tile).clone(); tx.needsUpdate = true; const per = f.tile === 'moroccan' ? 3 : f.tile === 'checker' ? 4 : 2; tx.repeat.set(1 / per, 1 / per);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.85 })); m.rotation.x = -Math.PI / 2; m.position.y = 0.02; m.receiveShadow = true; g.add(m); }
  if (f.border) { const bw = 1.25, bm = mat('fl_bord' + f.preset, f.preset === 'greek' ? 0x8FA38A : 0x4A4A48, { roughness: 0.8 }), O = outline(t);   // 245: the floor look's border band along the parapet
    O.forEach((a, i) => { const b = O[(i + 1) % O.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.5) return; const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L; let nx = -uz, nz = ux; const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
      let c = false; for (let p = 0, q = O.length - 1; p < O.length; q = p++) { const [xi, zi] = O[p], [xj, zj] = O[q]; if ((zi > mz + nz) !== (zj > mz + nz) && mx + nx < (xj - xi) * (mz + nz - zi) / (zj - zi) + xi) c = !c; } if (!c) { nx = -nx; nz = -nz; }
      const m = new THREE.Mesh(new THREE.PlaneGeometry(L, bw), bm); m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(uz, ux); m.position.set(mx + nx * (E + bw / 2), 0.03, mz + nz * (E + bw / 2)); m.receiveShadow = true; g.add(m); }); }
  (f.rugs || []).forEach(([x, z, w, d]) => { const tx = finTex('moroccan').clone(); tx.needsUpdate = true; tx.repeat.set(w / 3, d / 3); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.8 })); m.rotation.x = -Math.PI / 2; m.position.set(x + w / 2, 0.035, z + d / 2); m.receiveShadow = true; g.add(m); });   // 245: Moroccan 'rugs'
  if (f.pebble) { const b = 0.6, pm = new THREE.MeshStandardMaterial({ map: finTex('pebble'), roughness: 1 });
    (f.pebble === 'near' ? pebNear(t, items) : [[E, E, pw - 2 * E, b], [E, pd - E - b, pw - 2 * E, b], [E, E + b, b, pd - 2 * E - 2 * b], [pw - E - b, E + b, b, pd - 2 * E - 2 * b]]).forEach(([x, z, w, d]) => { const tx = pm.map.clone(); tx.needsUpdate = true; tx.repeat.set(w / 2, d / 2);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tx, roughness: 1 })); m.rotation.x = -Math.PI / 2; m.position.set(x + w / 2, 0.04, z + d / 2); m.receiveShadow = true; g.add(m); }); }
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
        p.add(generic('privacy', L, 0.3, +it.h || 3, it));
        const hb = new THREE.Mesh(new THREE.BoxGeometry(L, +it.h || 3, 0.8), new THREE.MeshBasicMaterial({ visible: false })); hb.position.y = (+it.h || 3) / 2; hb.userData.hit = i; p.add(hb);
        if (P.sel === i) { const ln = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(L + 0.2, (+it.h || 3) + 0.2, 0.6)), new THREE.LineBasicMaterial({ color: 0xC26445 })); ln.position.y = (+it.h || 3) / 2; p.add(ln); }
        if (!k && P.labels !== false) { const tg = tag(it.label || 'Privacy screen'); tg.position.y = (+it.h || 3) + 1.4; p.add(tg); }
        if ((P.site || {}).light !== '') { const gm = glow(LENS), bk = mat('lt_blk', 0x1E1E1E, { roughness: 0.45, metalness: 0.4 }), hh = +it.h || 3; let n = 0;   // 245: one-way lights fixed on the screen's top rail — a black housing, the warm lens facing down, a soft wash on the screen
          for (let u = -L / 2 + 2; u < L / 2 - 0.5; u += 4, n++) { const hs = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.34), bk); hs.position.set(u, hh - 0.02, 0.3); p.add(hs); const ln = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.2), gm); ln.position.set(u, hh - 0.11, 0.36); p.add(ln);
            if (n % 2 === 0) { const l = new THREE.PointLight(WARM, 0.9, 5, 2); l.position.set(u, hh - 0.9, 0.7); p.add(l); } } } });   // 239: one-way down lights on every screen by default
      return;
    }
    const [fw, fd] = foot(it), hd = new THREE.Group(); hd.userData.it = i; hd.position.set(+it.x + fw / 2, 0, +it.z + fd / 2); hd.rotation.y = -(+it.rot || 0) * Math.PI / 180; items.add(hd);
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
      it.att.forEach(z => { const b = box(items, z.w, 0.6, z.d, z.x + z.w / 2, top - 0.3, z.z + z.d / 2, fm); b.userData.it = i; });
    }
    if (it.cat === 'pergola') try { creepers(hd, it); } catch (e) {}
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
  else { const k = R.cam.aspect < 1 ? Math.min(1.7, 1 / R.cam.aspect) : 1;   // 223: a tall phone screen sees the whole terrace
    R.cam.position.set(pw / 2 + d * 0.3 * k, (d * 0.62 + 6) * k, pd / 2 + (pd / 2 + d * 0.32) * k); C.enableRotate = true; }
  C.update();
}
export function show(el, P, opts) {
  opts = opts || {}; ensure(el); R.P = P; R.place = !!opts.place; R.on = opts.on || null; THEME = P.theme || 'natural'; night(!!P.night);   // 223: a screen may take the 3D's events for itself (the terrace wizard)
  const t = P.site || {}, key = JSON.stringify([t, P.items, P.sel, P.bad, P.labels, P.measure, P.theme]), dims = [t.kind, t.pw, t.pd].join('x');
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
function pMove(e) {
  pHover(e); const d = R && R.drag; if (!d) return; const f = floorAt(e); if (!f) return;
  if (d.fixed) return; const dx = f.x - d.f0.x, dz = f.z - d.f0.z; if (!d.moved && Math.hypot(e.clientX - R.down.x, e.clientY - R.down.y) < 5) return; d.moved = true;
  d.nx = Math.round((d.x0 + dx) * 2) / 2; d.nz = Math.round((d.z0 + dz) * 2) / 2;
  if (d.side === 'left' || d.side === 'right') d.nx = d.x0; if (d.side === 'back' || d.side === 'front') d.nz = d.z0;   // on a wall: slides along it only d.obj.position.set(d.pos0.x + (d.nx - d.x0), d.pos0.y, d.pos0.z + (d.nz - d.z0));
}
function pUp(e) {
  if (!R) return; const d = R.drag; R.drag = null; R.controls.enabled = true;
  const H = R.on || HANDLER;
  if (d) { if (d.moved) H({ t: d.kind === 'block' ? 'block' : 'move', i: d.i, x: d.nx, z: d.nz }); else if (d.kind === 'item') H({ t: 'sel', i: d.i }); else if (d.kind === 'block') H({ t: 'bsel', i: d.i }); return; }
  if (R.tapEmpty && R.down && Math.hypot(e.clientX - R.down.x, e.clientY - R.down.y) < 5) H({ t: 'sel', i: null });
  R.tapEmpty = false;
}
window.Space3D = { show, onEvent, zoom, home, resize, snapshot, _r: () => R };

// 199b: a small 3D preview of one design (planters…) on a plain patio — the customiser shows it next to the photo.
// items: [{cat, cfgId, pick, cfg, w, d, h}] — drawn side by side (0.5 ft apart), front to the camera.
let PV = null;
export function preview(el, items) {
  if (!PV || PV.el !== el) {
    if (PV) { try { PV.renderer.dispose(); PV.ro && PV.ro.disconnect(); } catch (e) {} }
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.innerHTML = ''; el.appendChild(renderer.domElement); renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none';
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0xF1ECE3);
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 400), controls = new OrbitControls(cam, renderer.domElement);
    controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.49; controls.minDistance = 2; controls.maxDistance = 80;
    const hemi = new THREE.HemisphereLight(0xffffff, 0xb8ad98, 0.8), sun = new THREE.DirectionalLight(0xffffff, 1.7); sun.position.set(-12, 22, 14); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, far: 80 }); scene.add(hemi, sun);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), mat('pv_floor', 0xD9CFC0, { roughness: 0.95 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; scene.add(fl);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(120, 12, 0.5), mat('pv_wall', 0xE8E1D6)); wall.position.set(0, 6, -6); wall.receiveShadow = true; scene.add(wall);
    PV = { el, renderer, scene, cam, controls, group: null, key: '' };
    const size = () => { const w = el.clientWidth || 600, h = el.clientHeight || 400; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    PV.size = size; size(); try { PV.ro = new ResizeObserver(size); PV.ro.observe(el); } catch (e) {}
    const loop = () => { if (!PV || PV.renderer !== renderer) return; if (el.isConnected && el.offsetParent !== null) { controls.update(); renderer.render(scene, cam); } requestAnimationFrame(loop); }; loop();
  }
  const key = JSON.stringify(items); if (key === PV.key) return; const first = !PV.key; PV.key = key;
  if (PV.group) PV.scene.remove(PV.group);
  const g = new THREE.Group(); let x = 0, W = 0, D = 0, H = 0;
  (items || []).forEach(it => { const m = generic(it.cat, +it.w || 2, +it.d || 2, +it.h || 2, it), y = it.par ? 3 : 0; m.position.set(x + (+it.w || 2) / 2, y, 0); g.add(m);
    if (it.par) box(g, (+it.w || 2) + 1, 3, 0.75, x + (+it.w || 2) / 2, 1.5, 0, mat('pv_par', 0xE3DDD2));   // 211: a screen that goes on the parapet / boundary wall, shown on one
    x += (+it.w || 2) + 0.5; D = Math.max(D, +it.d || 2, it.par ? 0.75 : 0); H = Math.max(H, (+it.h || 2) + y + 0.9); });
  W = Math.max(0.5, x - 0.5); g.position.x = -W / 2; g.position.z = -6 + 0.25 + D / 2 + 0.6; PV.group = g; PV.scene.add(g);
  const span = Math.max(W, D * 1.6, H * 1.8 + 1.5), tz = g.position.z, ty = Math.min(H * 0.5, 3);
  if (first || PV.span !== Math.round(span * 2)) { PV.span = Math.round(span * 2); PV.controls.target.set(0, ty, tz); PV.cam.position.set(span * 0.55, ty + span * 0.55, tz + span * 1.35); PV.controls.update(); }
}
