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
    hpl: S({ color: 0x9C7650, roughness: 0.6 }), wood: S({ color: 0x8B5A2B, roughness: 0.6 }), gutter: S({ color: 0xC4C8CC, roughness: 0.35, metalness: 0.35 }),
    light: S({ color: 0xFFF6D8, emissive: 0xFFE7A8, emissiveIntensity: 1.6 }), cement: S({ color: 0xB3AFA8, roughness: 0.95 }), wpc: S({ color: 0x7A5537, roughness: 0.7 }), ceiling: S({ color: 0xFBFAF7, roughness: 0.9 }),
    white: S({ color: 0xFFFFFF, roughness: 0.3 }), grass: S({ color: 0x8FA86A, roughness: 1 }), pave: S({ color: 0xCFC6B6, roughness: 0.95 }), leaf: S({ color: 0x4F7A3A, roughness: 0.9 }), leaf2: S({ color: 0x6B8F4A, roughness: 0.9 }), bark: S({ color: 0x6B4A2F, roughness: 1 }),
    hit: new THREE.MeshBasicMaterial({ visible: false }), sel: new THREE.MeshBasicMaterial({ color: 0xC26445, transparent: true, opacity: 0.28, depthWrite: false }),
    fab: S({ color: 0xBFAF96, roughness: 0.95 }), fab2: S({ color: 0x55634A, roughness: 0.95 }), terra: S({ color: 0xC26445, roughness: 0.9 }), oak: S({ color: 0x9A6B43, roughness: 0.6 }), blk: S({ color: 0x2B2B2B, roughness: 0.5 }),
    rug: S({ color: 0xD9CCB4, roughness: 1 }), linen: S({ color: 0xF4F1EA, roughness: 0.9 }), desk: S({ color: 0xEDEAE4, roughness: 0.5 }), screen: S({ color: 0x15171A, roughness: 0.2 }), pot: S({ color: 0xC9B8A0, roughness: 0.9 }),
    lamp: S({ color: 0xFFF3D6, emissive: 0xFFD99A, emissiveIntensity: 0.6 }), counter: S({ color: 0x6E6A63, roughness: 0.5 }), steel: S({ color: 0xBFC3C7, roughness: 0.3, metalness: 0.8 }),
  };
  return (M[name] = t[name] || S({ color: name }));
}
function floorTex(kind) {   // 188: planks / vinyl look, drawn once
  const key = 'fl_' + kind; if (M[key]) return M[key];
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256; const x = cv.getContext('2d');
  if (kind === 'wood') { const cs = ['#A87A4E', '#9C6E43', '#B3865A', '#94673F']; for (let r = 0; r < 8; r++) { let px = -((r * 53) % 256); while (px < 256) { const w = 120 + ((r * 31 + px) % 60); x.fillStyle = cs[(r + Math.abs(px)) % 4]; x.fillRect(px, r * 32, w, 32); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(px + w - 2, r * 32, 2, 32); px += w; } x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(0, r * 32 + 31, 256, 1.5); } }
  else { x.fillStyle = '#D6CDBF'; x.fillRect(0, 0, 256, 256); x.strokeStyle = 'rgba(0,0,0,.12)'; x.lineWidth = 2; for (let i = 0; i <= 256; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); } }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4);
  return (M[key] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }));
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
// 188: a big readable label (sprite) and floor symbols (swing arc / slide arrows) drawn on a canvas
function label(text, w = 3.4) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const x = cv.getContext('2d');
  x.fillStyle = 'rgba(255,255,255,0.92)'; const r = 28; x.beginPath(); x.moveTo(r, 4); x.arcTo(508, 4, 508, 124, r); x.arcTo(508, 124, 4, 124, r); x.arcTo(4, 124, 4, 4, r); x.arcTo(4, 4, 508, 4, r); x.fill();
  x.strokeStyle = '#C26445'; x.lineWidth = 5; x.stroke();
  x.fillStyle = '#2E2E2E'; let fs = 58; x.font = `700 ${fs}px Inter, Arial, sans-serif`; while (x.measureText(text).width > 470 && fs > 28) { fs -= 2; x.font = `700 ${fs}px Inter, Arial, sans-serif`; }
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 256, 66);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4 })); sp.renderOrder = 10; return sp;   // flat on the wall, facing out
}
function floorSym(kind, len, dep) {   // a flat symbol inside the room: canvas bottom edge = the wall, up = into the room
  const cv = document.createElement('canvas'), px = 64; cv.width = Math.max(64, Math.round(len * px)); cv.height = Math.max(64, Math.round(dep * px)); const x = cv.getContext('2d'), W2 = cv.width, H2 = cv.height;
  x.strokeStyle = '#C26445'; x.fillStyle = '#C26445'; x.lineWidth = 7; x.setLineDash([]);
  const head = (x0, y0, ang) => { x.beginPath(); x.moveTo(x0, y0); x.lineTo(x0 - 26 * Math.cos(ang - 0.45), y0 - 26 * Math.sin(ang - 0.45)); x.lineTo(x0 - 26 * Math.cos(ang + 0.45), y0 - 26 * Math.sin(ang + 0.45)); x.closePath(); x.fill(); };
  if (kind === 'swing' || kind === 'swing2') {   // door leaf(s) opening into the room: arc from the wall
    const leaves = kind === 'swing2' ? 2 : 1, lw = W2 / leaves;
    for (let i = 0; i < leaves; i++) { const hx = i === 0 ? 0 : W2, dir = i === 0 ? 1 : -1, rad = Math.min(lw, H2);
      x.setLineDash([14, 10]); x.beginPath(); x.arc(hx, H2, rad - 6, dir > 0 ? -Math.PI / 2 : Math.PI, dir > 0 ? 0 : -Math.PI / 2); x.stroke(); x.setLineDash([]);
      x.beginPath(); x.moveTo(hx, H2); x.lineTo(hx, H2 - rad + 6); x.stroke(); head(hx + dir * (rad - 6) * Math.cos(Math.PI / 4) , H2 - (rad - 6) * Math.sin(Math.PI / 4), dir > 0 ? -Math.PI * 0.75 + Math.PI : -Math.PI / 4 - Math.PI / 2); }
  } else {   // sliding / folding: arrows along the wall
    const y0 = H2 * 0.45; x.beginPath(); x.moveTo(40, y0); x.lineTo(W2 - 40, y0); x.stroke(); head(W2 - 14, y0, 0); head(14, y0, Math.PI);
    if (kind === 'fold') { x.beginPath(); for (let i = 0; i <= 6; i++) x.lineTo(40 + (W2 - 80) * i / 6, y0 + (i % 2 ? 22 : -22)); x.stroke(); }
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(len, dep), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; const g = new THREE.Group(); g.add(m); return g;
}
const BAY_LABEL = { puf: 'Wall', window: 'Wall + window', vent: 'Wall + vent', glass: 'Fixed glass', frost: 'Fixed glass (frosted)', door: 'Swing door', gdoor: 'Swing door · glass', pdouble: 'Swing door · double', double: 'Swing door · glass double', slide: 'Sliding door', fold: 'Folding door' };
function shadeHex(c, lay, side) {   // 188: wall finish + shade of one wall → a colour (WPC looks like wood)
  const wf = (lay.wall_fin || {})[side] || {}, fin = String(wf.fin || ''), sh = (c.shades || []).find(x => x.name === wf.shade) || (c.shades || [])[0];
  if (/wpc|laminate|wood/i.test(fin)) return 'wpc';
  return sh && sh.hex ? sh.hex : null;
}
function bayOf(c, k) { return (c.bays || []).find(b => b.key === k) || null; }
function spanOf(c, k) { const b = bayOf(c, k); return b ? Math.max(Math.trunc(+b.span || 1), 1) : 1; }

function build(c, lay, opts) {
  const g = new THREE.Group(), L = +lay.L, W = +lay.W, H = /^10/.test(lay.height || '') ? 10 : 8.5, bay = +(c.bay || 4), FM = frameMat(lay), T = 0.25, DH = lay.full_doors ? H : 8;
  const tracks = Math.max(2, parseInt(lay.tracks || '2', 10) || 2);
  if (opts && opts.bare) {} else if (opts && opts.site && opts.site.kind === 'terrace') terrace(g, L, W, opts.site); else site(g, L, W);   // 192: bare = the cabin alone (space planner)
  box(g, L + 0.6, 0.6, W + 0.6, L / 2, -0.3, W / 2, mat('deck')).userData.under = 1;
  const ff = String(lay.floor || ''), FL = /wood|plank|laminate/i.test(ff) ? floorTex('wood') : /no finish|client/i.test(ff) ? mat('cement') : /vinyl/i.test(ff) ? floorTex('vinyl') : mat('floor');   // 188: floor finish
  box(g, L, 0.05, W, L / 2, 0.02, W / 2, FL, false).userData.under = 1;
  // 188: deck profile lights along the deck edge on the sides picked
  for (const sd of (Array.isArray(lay.deck_lights) ? lay.deck_lights : [])) { if (!SIDES.includes(sd)) continue; const sf = sideFrame(sd, L, W), ln = sd === 'front' || sd === 'back' ? L : W; const st = piece(g, sf, -0.25, ln + 0.25, -0.2, -0.12, mat('light'), 0.05, 0.32); st.castShadow = false; st.name = 'decklight'; }
  const walls = new THREE.Group(); walls.name = 'walls'; g.add(walls);
  const labels = new THREE.Group(); labels.name = 'labels'; g.add(labels);   // 188: "Wall", "Fixed glass", "Swing door"… + door direction on the floor
  const hits = new THREE.Group(); hits.name = 'hits'; g.add(hits);
  const wallOf = {};
  for (const side of SIDES) {
    const wg = new THREE.Group(); wg.name = 'wall-' + side; walls.add(wg); wallOf[side] = wg;
    const ks = (lay.walls || {})[side] || [], len = side === 'front' || side === 'back' ? L : W, sf = sideFrame(side, L, W);
    const sh = shadeHex(c, lay, side), WM = sh === 'wpc' ? mat('wpc') : sh ? mat(sh) : mat('puf');   // 188: wall finish / shade
    let prevSolid = false, prevGl = false; const runs = [], wide = Array.isArray(lay.wide) && lay.wide.includes(side), gRuns = [];   // 269 (owner): a wide side = one long glass run with MS posts every ~10 ft
    for (let i = 0; i < ks.length;) {
      const k = ks[i], b = bayOf(c, k), sp = spanOf(c, k), a = i * bay, e = Math.min((i + sp) * bay, len), solid = !b || (!b.glass && !b.door);
      const post = (u) => piece(wg, sf, u - 0.06, u + 0.06, 0, H, FM, T + 0.04);
      const hb = piece(hits, sf, a + 0.05, e - 0.05, 0, H, mat('hit'), 0.8); hb.userData = { bay: { side, i } }; hb.castShadow = false;
      const gl = !!(b && b.glass && !b.door); if (wide && gl) { const r0 = gRuns[gRuns.length - 1]; if (r0 && prevGl && r0[1] === a) r0[1] = e; else gRuns.push([a, e]); }
      if ((i === 0 || !(prevSolid && solid)) && !(wide && gl && prevGl && i > 0)) post(a);   // 188: no steel posts inside a run of solid wall — only at corners and beside doors / glass
      prevSolid = solid; prevGl = gl;
      { const lt = BAY_LABEL[k] || (b && b.name) || 'Wall', run = runs[runs.length - 1];   // one label per run of the same kind (not one per panel)
        if (run && run.t === lt && run.e === a && !(b && b.door)) run.e = e; else runs.push({ t: lt, a, e });
        if (b && b.door) { const kind = k === 'slide' ? 'slide' : k === 'fold' ? 'fold' : sp > 1 || k === 'double' || k === 'pdouble' ? 'swing2' : 'swing', dep = kind === 'slide' || kind === 'fold' ? 1.6 : Math.min(e - a - 0.2, 3.2);
          const fs = floorSym(kind, e - a - 0.2, dep), [fx, fz] = sf.at((a + e) / 2, -dep / 2 - 0.2); fs.position.set(fx, 0.08, fz); fs.rotation.y = side === 'front' ? 0 : side === 'back' ? Math.PI : side === 'right' ? Math.PI / 2 : -Math.PI / 2; labels.add(fs); } }
      if (!b || (!b.glass && !b.door)) {
        piece(wg, sf, a, e, 0, H, WM, T);
        if (k === 'window') { piece(wg, sf, a + (e - a) * 0.18, e - (e - a) * 0.18, 3, 6.4, mat('glass'), T + 0.06, 0.01); piece(wg, sf, a + (e - a) * 0.18, e - (e - a) * 0.18, 2.94, 3.0, FM, T + 0.1); piece(wg, sf, a + (e - a) * 0.18, e - (e - a) * 0.18, 6.4, 6.46, FM, T + 0.1); piece(wg, sf, (a + e) / 2 - 0.03, (a + e) / 2 + 0.03, 3, 6.4, FM, T + 0.1); }
        if (k === 'vent') piece(wg, sf, a + (e - a) * 0.3, e - (e - a) * 0.3, 6.6, 7.5, mat('glass'), T + 0.06);
      } else if (b.door) {
        const leaves = k === 'fold' ? 6 : k === 'slide' ? tracks : sp > 1 ? 2 : 1, dh = Math.min(DH, H);
        if (dh < H) piece(wg, sf, a, e, dh, H, WM, T);   // PUF above a standard 8 ft door
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
    for (const [ga, ge] of gRuns) { const n = Math.ceil((ge - ga) / 10 - 0.01); for (let j = 1; j < n; j++) { const u = ga + (ge - ga) * j / n; piece(wg, sf, u - 0.08, u + 0.08, 0, H, FM, T + 0.06); } }
    for (const r of runs) { const lb = label(r.t, Math.min(3.8, Math.max(2.8, r.e - r.a - 0.4))), [lx, lz] = sf.at((r.a + r.e) / 2, T / 2 + 0.16); lb.position.set(lx, 4.4, lz);
      lb.rotation.y = side === 'front' ? 0 : side === 'back' ? Math.PI : side === 'right' ? Math.PI / 2 : -Math.PI / 2; labels.add(lb); }
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
  if (ceil) { const cg = new THREE.Group(); cg.name = 'ceiling'; g.add(cg); const ct = String(lay.ceiling_type || '');   // 188: the false ceiling type shows
    const CM = /real wood/i.test(ct) ? mat('oak') : /pvc wooden/i.test(ct) ? mat(0xB08A62) : mat('ceiling');
    box(cg, L - 0.3, 0.1, W - 0.3, L / 2, H - 0.6, W / 2, CM, false);
    if (/grid/i.test(ct)) { for (let x = 2; x < L - 0.3; x += 2) box(cg, 0.06, 0.05, W - 0.3, x, H - 0.66, W / 2, mat(0xBDBDB8), false); for (let z = 2; z < W - 0.3; z += 2) box(cg, L - 0.3, 0.05, 0.06, L / 2, H - 0.66, z, mat(0xBDBDB8), false); }
    else if (/wood/i.test(ct)) for (let z = 0.6; z < W - 0.3; z += 0.6) box(cg, L - 0.3, 0.04, 0.03, L / 2, H - 0.66, z, mat(0x6B4A2F), false);
    else box(cg, L - 2.2, 0.06, W - 2.2, L / 2, H - 0.67, W / 2, mat('light'), false); }
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
    const f0 = FOOT[p.key]; if (!f0) return; const f = [+p.w || f0[0], +p.d || f0[1]];   // 188: rooms can be bigger
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
      const lyp = /hpl/i.test(pj.under || '') ? y - 0.645 : /louver/i.test(pj.under || '') ? y - 0.725 : y - 0.4;   // 188: lights sit on the underside, not in the air
      for (let u = 1.5; u < len; u += 3) { const [lx, lz] = sf.at(u, dep / 2 + 0.1), l = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16), mat('light')); l.position.set(lx, lyp, lz); pg.add(l); }
    }
    // 188: where two projection sides meet, the corner square is built too (fascia, rafters, top, underside, a light)
    const y = H + 0.1, top = /glass/i.test(pj.top || '') ? mat('roofGlass') : mat('poly'), stp = /grid/i.test(design) ? 1.5 : 0.75, D = dep + 0.12;
    for (const [s1, s2] of [['front', 'right'], ['right', 'back'], ['back', 'left'], ['left', 'front']]) {
      if (!pj.sides.includes(s1) || !pj.sides.includes(s2)) continue;
      const sx = [s1, s2].includes('right') ? 1 : -1, sz = [s1, s2].includes('front') ? 1 : -1, x0 = sx > 0 ? L : 0, z0 = sz > 0 ? W : 0, cx = x0 + sx * D / 2, cz = z0 + sz * D / 2;
      box(pg, D + 0.25, 0.5, 0.25, x0 + sx * (D + 0.25) / 2, y - 0.25, z0 + sz * D, FM); box(pg, 0.25, 0.5, D + 0.25, x0 + sx * D, y - 0.25, z0 + sz * (D + 0.25) / 2, FM);
      for (let u = 0.3; u < D; u += stp) box(pg, 0.12, 0.35, D, x0 + sx * u, y - 0.2, cz, RF);
      box(pg, D + 0.2, 0.04, D + 0.2, cx, y + 0.04, cz, top);
      if (/hpl|louver/i.test(pj.under || '')) box(pg, D, 0.07, D, cx, y - 0.585, cz, mat('hpl'));
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16), mat('light')); l.position.set(cx, /hpl/i.test(pj.under || '') ? y - 0.645 : /louver/i.test(pj.under || '') ? y - 0.725 : y - 0.4, cz); pg.add(l);
    }
  }
  // rain gutter with a downpipe at the end
  if (SIDES.includes(lay.gutter)) {
    const side = lay.gutter, len = side === 'front' || side === 'back' ? L : W, sf = sideFrame(side, L, W), off = (pj && pj.sides && pj.sides.includes(side)) ? (+(c.proj && c.proj.depth || 1.5) + 0.45) : 0.45;
    piece(g, sf, -0.2, len + 0.2, H + 0.05, H + 0.4, mat('gutter'), 0.4, off);
    const [px, pz] = sf.at(len + 0.1, off); box(g, 0.3, H + 0.4, 0.3, px, (H + 0.4) / 2, pz, mat('gutter'));
  }
  if (opts && opts.furn && opts.furn !== 'none') { const fg = new THREE.Group(); fg.name = 'furn'; g.add(fg); furnish(fg, c, lay, L, W, H, opts.furn); }
  if (opts && opts.site && opts.site.kind === 'terrace' && opts.site.place) { const hide = new THREE.Group(); hide.name = 'cabhide'; hide.visible = false; g.children.slice().forEach(ch => { if (ch.name !== 'site') hide.add(ch); }); g.add(hide); }   // 193e: while the terrace is set up, the terrace alone — the cabin comes after Next
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

// ---- 2026-11-18 a Delhi builder-floor terrace around it (close, not exact): slab + parapet, blocks already on the roof
// (mumty / lift room / shafts / rooms — userData.st for dragging), water tanks, the building below, neighbours, roads.
// Plot coords: x across the width (0 = left), z front-to-back (0 = back, pd = front / road). t.rot = where the cabin's front
// faces (0 road, 90 right, 180 back, 270 left); (cx, cz) = the back-left corner of the cabin's footprint on the plot.
// 'site' (at the cabin's centre, turned) holds 'plot' (in plot coords), so every drag converts with plot.worldToLocal().
const BH_ = { mumty: 9, lift: 11, shaft: 3, room: 9, ac: 2.4, troom: 8 };
// 193: a terrace may have its corners cut (t.cuts {bl|br|fl|fr: {type: notch | slant, a: ft across, b: ft deep}}; b = back, f = front / road, l / r = left / right)
// 244: or any shape — t.outline [[x, z], …] (ft, plot coords; mid-side cuts, L / U / T / plus, penthouse roofs); it wins over cuts
export function olPts(t) { const O = t && t.outline; if (!Array.isArray(O) || O.length < 3) return null; let P = O.map(q => [+q[0], +q[1]]), a = 0;
  P.forEach((q, i) => { const n = P[(i + 1) % P.length]; a += q[0] * n[1] - n[0] * q[1]; }); return a < 0 ? P.reverse() : P; }   // same turn as the corner walk below
export function inPoly(P, x, z) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, zi] = P[i], [xj, zj] = P[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; }
export function olRectOut(P, r, M) {   // does rect r (grown by M) reach outside polygon P?
  const x0 = r.x - M + 0.02, x1 = r.x + r.w + M - 0.02, z0 = r.z - M + 0.02, z1 = r.z + r.d + M - 0.02;
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) if (!inPoly(P, x0 + (x1 - x0) * i / 4, z0 + (z1 - z0) * j / 4)) return true;
  return P.some(q => q[0] > x0 && q[0] < x1 && q[1] > z0 && q[1] < z1);   // a notch corner poking in
}
export function plotOutline(t) {
  const OP = olPts(t); if (OP) return OP;
  const pw = +t.pw || 30, pd = +t.pd || 60, C = t.cuts || {}, pts = [];
  const cut = k => { const c = C[k]; if (!c || (c.type !== 'notch' && c.type !== 'slant')) return null; const a = Math.max(0.5, Math.min(pw - 2, +c.a || 0)), b = Math.max(0.5, Math.min(pd - 2, +c.b || 0)); return { type: c.type, a, b }; };
  const corner = (k, X, Z, sx, sz, first) => {   // walking round: back-left → back-right → front-right → front-left; (sx, sz) point into the plot
    const c = cut(k); if (!c) { pts.push([X, Z]); return; }
    const pA = [X + sx * c.a, Z], pB = [X, Z + sz * c.b], inn = [X + sx * c.a, Z + sz * c.b], along = first ? [pB, pA] : [pA, pB];   // first = the side we arrive on runs along z
    if (c.type === 'slant') pts.push(along[0], along[1]); else pts.push(along[0], inn, along[1]);
  };
  corner('bl', 0, 0, 1, 1, true); corner('br', pw, 0, -1, 1, false); corner('fr', pw, pd, -1, -1, true); corner('fl', 0, pd, 1, -1, false);
  return pts;
}
export function cutHit(t, r, P) {   // does rect r (x, z, w, d) reach into a cut corner (grown by the parapet P)?
  if (!t || t.kind === 'ground') return false; const OP = olPts(t); if (OP) return olRectOut(OP, r, P);
  const C = t.cuts; if (!C) return false; const pw = +t.pw, pd = +t.pd;
  return ['bl', 'br', 'fl', 'fr'].some(k => { const c = C[k]; if (!c || (c.type !== 'notch' && c.type !== 'slant')) return false; const a = +c.a || 0, b = +c.b || 0; if (!(a > 0 && b > 0)) return false;
    const x0 = k[1] === 'r' ? pw - (r.x + r.w) : r.x, z0 = k[0] === 'f' ? pd - (r.z + r.d) : r.z;
    return c.type === 'notch' ? x0 < a + P - 0.01 && z0 < b + P - 0.01 : x0 / a + z0 / b < 1 + P * Math.hypot(1 / a, 1 / b) - 0.001; });
}
function tsFootDims(t, L, W) { return (+t.rot || 0) % 180 ? [W, L] : [L, W]; }
function terrace(g, L, W, t) {
  const sg = new THREE.Group(); sg.name = 'site'; g.add(sg); sg.position.set(L / 2, 0, W / 2); sg.rotation.y = -(+t.rot || 0) * Math.PI / 180;
  const tg = new THREE.Group(); tg.name = 'plot'; sg.add(tg); const [fw, fd] = tsFootDims(t, L, W); tg.position.set(-(+t.cx + fw / 2), 0, -(+t.cz + fd / 2));
  drawPlot(tg, t);
  if (Array.isArray(t.around) && t.around.some(Boolean)) aroundOn(tg, t, -0.6);   // 193j: the plan's other things on the terrace
  // red when the cabin doesn't fit there; terracotta outline while it is being placed
  if (t.clash || t.place) { const Y = -0.6, col = t.clash ? 0xE0352B : 0xC26445, ln = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(L + 0.8, 0.2, W + 0.8)), new THREE.LineBasicMaterial({ color: col })); ln.position.set(L / 2, Y + 0.15, W / 2); g.add(ln);
    const pl = new THREE.Mesh(new THREE.BoxGeometry(L + 0.8, 0.06, W + 0.8), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.22, depthWrite: false })); pl.position.set(L / 2, Y + 0.1, W / 2); g.add(pl); }
}
// the terrace itself in plot coords (slab surface at y = -0.6): slab, parapet, building below, neighbours, roads, blocks on the roof
let CLAD = null;
function cladMat() { if (CLAD) return CLAD; const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256; const x = cv.getContext('2d'); x.fillStyle = '#8E8174'; x.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) { const off = r % 2 ? 32 : 0, sh = 150 + ((r * 7 + c * 13) % 40); x.fillStyle = `rgb(${sh + 20},${sh + 8},${sh - 10})`; x.fillRect(c * 64 + off - 64 + 3, r * 32 + 3, 58, 26); x.fillRect(c * 64 + off + 3, r * 32 + 3, 58, 26); }
  const tx = new THREE.CanvasTexture(cv); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(3, 2); tx.colorSpace = THREE.SRGBColorSpace; return (CLAD = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.9 })); }
// 245: the tiles already on the walls — brick look / plain 2 × 2 / 2 × 4 ft / stone, in the customer's colour
const TCOL = { red: '#A4553A', beige: '#D8C7A8', grey: '#9A9A96', white: '#ECE9E2', charcoal: '#4A4A48', wood: '#8B6440' }, TMAT = {};
function tileMat(wt) { const k = (wt.k || 'brick') + ':' + (wt.c || 'red'); if (TMAT[k]) return TMAT[k]; if (wt.k === 'stone') return (TMAT[k] = cladMat());
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256; const x = cv.getContext('2d'), base = TCOL[wt.c] || TCOL.red, jt = wt.c === 'white' || wt.c === 'beige' ? '#B9B2A6' : '#E8E2D6';
  x.fillStyle = jt; x.fillRect(0, 0, 256, 256); const sh = (hex, d) => { const n = parseInt(hex.slice(1), 16), c = v => Math.max(0, Math.min(255, v + d)); return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`; };
  let rep = [2, 4];
  if (wt.k === 'brick') { for (let r = 0; r < 8; r++) for (let c = -1; c < 4; c++) { x.fillStyle = sh(base, ((r * 7 + c * 13) % 5 - 2) * 8); x.fillRect(c * 64 + (r % 2 ? 32 : 0) + 2, r * 32 + 2, 60, 28); } rep = [3, 3]; }
  else { const tall = wt.k === 't24'; for (let r = 0; r < (tall ? 2 : 4); r++) for (let c = 0; c < 4; c++) { x.fillStyle = sh(base, ((r * 5 + c * 3) % 3 - 1) * 5); x.fillRect(c * 64 + 1.5, r * (tall ? 128 : 64) + 1.5, 61, (tall ? 128 : 64) - 3); } rep = tall ? [2, 1.5] : [2, 1.5]; }
  const tx = new THREE.CanvasTexture(cv); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(rep[0], rep[1]); tx.colorSpace = THREE.SRGBColorSpace; return (TMAT[k] = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.6 })); }
function drawPlot(tg, t) {
  const pw = +t.pw || 30, pd = +t.pd || 60, Y = -0.6, par = +t.par || 3, PT = 0.75, BH = 50, hi = t.high || {};
  const P = (n, col) => M[n] || (M[n] = new THREE.MeshStandardMaterial({ color: col, roughness: 0.95 }));
  const plaster = P('t_pl', 0xEAE5DC), tile = P('t_tile', 0xC4BDB1), side2 = P('t_side', 0xDCD3C4), dark = P('t_dark', 0x2F3437), road = P('t_road', 0x6E6C68), win = P('t_win', 0x55626B);
  const wallm = t.wallFin === 'tiles' ? (t.wallTile ? tileMat(t.wallTile) : cladMat()) : t.wallFin === 'paint' ? (t.paintC ? P('t_paint_' + t.paintC, +t.paintC) : P('t_paint', 0xF7F2EA)) : plaster;   // 274: the theme's paint colour   // 237: the stairs room, parapet and other walls — paint / tiles / as they are
  const CPM = { cement: [0xDCD3C4, 0.95], kota: [0x9AA596, 0.6], granite: [0x34322F, 0.25], marble: [0xF1EEE8, 0.3], sandstone: [0xD8C9A8, 0.85], tiles: [0xC4BDB1, 0.5] }, cp = t.coping && CPM[t.coping.mat] ? t.coping.mat : null;   // 273 (owner): the coping on the parapet — as it is now, or the new one
  const cop = cp ? M['t_cop_' + cp] || (M['t_cop_' + cp] = new THREE.MeshStandardMaterial({ color: CPM[cp][0], roughness: CPM[cp][1] })) : side2, cw = cp && cp !== 'cement' ? 0.35 : 0.1, ct = cp && cp !== 'cement' ? 0.12 : 0.15;
  const OL = plotOutline(t), shaped = OL.length > 4;
  if (!shaped) {
    box(tg, pw, 0.5, pd, pw / 2, Y - 0.25, pd / 2, tile).userData.under = 1;
    [[pw / 2, PT / 2, pw, PT], [pw / 2, pd - PT / 2, pw, PT], [PT / 2, pd / 2, PT, pd], [pw - PT / 2, pd / 2, PT, pd]].forEach(([x, z, w, d]) => { box(tg, w, par, d, x, Y + par / 2, z, wallm); box(tg, w + cw, ct, d + cw, x, Y + par + ct / 2, z, cop); });
    box(tg, pw, BH, pd, pw / 2, Y - 0.5 - BH / 2, pd / 2, plaster, false).userData.under = 1;
  } else {   // 193: corners cut — slab + building follow the outline, a parapet along every edge
    const sh = new THREE.Shape(); OL.forEach(([x, z], i) => i ? sh.lineTo(x, z) : sh.moveTo(x, z)); sh.closePath();
    const prism = (depth, top, m, cast) => { const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false }); g.rotateX(Math.PI / 2); const me = new THREE.Mesh(g, m); me.position.y = top; me.castShadow = !!cast; me.receiveShadow = true; me.userData.under = 1; tg.add(me); return me; };
    prism(0.5, Y, tile); prism(BH, Y - 0.5, plaster);
    OL.forEach((p0, i) => { const p1 = OL[(i + 1) % OL.length], dx = p1[0] - p0[0], dz = p1[1] - p0[1], L = Math.hypot(dx, dz); if (L < 0.05) return;
      const nx = -dz / L, nz = dx / L, ang = -Math.atan2(dz, dx), mx = (p0[0] + p1[0]) / 2 + nx * PT / 2, mz = (p0[1] + p1[1]) / 2 + nz * PT / 2;
      box(tg, L + PT, par, PT, mx, Y + par / 2, mz, wallm).rotation.y = ang; box(tg, L + PT + cw, ct, PT + cw, mx, Y + par + ct / 2, mz, cop).rotation.y = ang; });
  }
  for (let f = 0; f < 4; f++) { const yb = Y - 0.5 - 10 * f - 5.5; box(tg, pw * 0.7, 4, 0.1, pw / 2, yb, pd + 0.05, win, false); box(tg, pw, 0.4, 3, pw / 2, yb - 2.6, pd + 1.5, side2, false); }
  const gy = Y - 0.5 - BH; const gr = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), P('t_gnd', 0xA9A296)); gr.rotation.x = -Math.PI / 2; gr.position.set(pw / 2, gy, pd / 2); tg.add(gr);
  const rf = t.road_front !== false, rb = !!t.road_back;   // roads in front (the usual) and / or at the back
  if (rf) box(tg, 400, 0.1, 24, pw / 2, gy + 0.05, pd + 15, road, false);
  if (rb) box(tg, 400, 0.1, 24, pw / 2, gy + 0.05, -15, road, false);
  const cs = t.corner === 'left' || t.corner === 'right' ? t.corner : '';   // a corner plot: the road on that side
  if (cs) box(tg, 24, 0.1, 400, cs === 'left' ? -15 : pw + 15, gy + 0.06, pd / 2, road, false);
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const nb = (x, z, w, d) => { const h = BH - 1 - rnd() * 4,   /* 258 (owner): neighbours at about our height, their stairs rooms not towering over us */ m = P('t_nb' + (seed % 3), [0xD9CBB5, 0xE6DDD0, 0xCFC2AE][seed % 3]); box(tg, w, h, d, x, gy + h / 2, z, m, false); box(tg, w, 3, 0.6, x, gy + h + 1.5, z + d / 2 - 0.3, m, false);
    if (rnd() > 0.5) box(tg, 9, 8, 14, x + (rnd() > 0.5 ? w / 2 - 5 : -w / 2 + 5), gy + h + 4, z, m, false); };
  if (cs !== 'left') { nb(-pw / 2 - 0.3, pd / 2, pw, pd); if (!rb) nb(-pw / 2 - 0.3, -pd / 2 - 0.3, pw, pd); }
  if (cs !== 'right') { nb(pw * 1.5 + 0.3, pd / 2, pw, pd); if (!rb) nb(pw * 1.5 + 0.3, -pd / 2 - 0.3, pw, pd); }
  if (rb) nb(pw / 2, -30 - pd / 2, pw * 3, pd); else nb(pw / 2, -pd / 2 - 0.3, pw, pd);
  if (rf) nb(pw / 2, pd + 30 + pd / 2, pw * 3, pd); else nb(pw / 2, pd + pd / 2 + 0.3, pw, pd);
  // a neighbour's wall that rises above our parapet on a side
  const HW = 12, hw = P('t_hw', 0xD4C6B0);
  const hwo = t.hw || {}, hH = sd => Math.max(3, +((hwo[sd] || {}).h) || HW), hL = (sd, full) => Math.max(1, Math.min(full, +((hwo[sd] || {}).l) || full));   // 233: its height + length (from the back / the left)
  if (hi.left && cs !== 'left') { const H = hH('left'), L = hL('left', pd); box(tg, 0.75, H, L, -0.4, Y + H / 2, L / 2, hw); }
  if (hi.right && cs !== 'right') { const H = hH('right'), L = hL('right', pd); box(tg, 0.75, H, L, pw + 0.4, Y + H / 2, L / 2, hw); }
  if (hi.back && !rb) { const H = hH('back'), L = hL('back', pw); box(tg, L, H, 0.75, L / 2, Y + H / 2, -0.4, hw); }
  // what's already on the roof
  if (t.mstair && t.mstair.type) { const M0 = (t.blocks || []).find(b => b.type === 'mumty'); if (M0) {   // 263 (owner): stairs up onto the stairs room's roof — monkey ladder / MS staircase / spiral, on the wall asked
    const sd = t.mstair.side || 'left', H = (+M0.h || 9) + 0.35, ms = P('t_mst', 0x2E2E2E), tr = P('t_mstr', 0x4A4A4A), xs = sd === 'left' || sd === 'right', L = xs ? +M0.d : +M0.w, n = { left: [-1, 0], right: [1, 0], back: [0, -1], front: [0, 1] }[sd];
    const o = xs ? [sd === 'left' ? +M0.x : +M0.x + +M0.w, +M0.z] : [+M0.x, sd === 'back' ? +M0.z : +M0.z + +M0.d], u = xs ? [0, 1] : [1, 0], at = (a, off, y) => [o[0] + u[0] * a + n[0] * off, Y + y, o[1] + u[1] * a + n[1] * off];
    const dr = M0.door === sd, put = (m, a, off, y) => { const p = at(a, off, y); m.position.set(p[0], p[1], p[2]); tg.add(m); m.castShadow = true; return m; }, bx = (w, h, d, a, off, y, mt) => put(new THREE.Mesh(new THREE.BoxGeometry(xs ? d : w, h, xs ? w : d), mt), a, off, y);
    if (t.mstair.type === 'ladder') { const a = dr ? L - 1.2 : L * 0.7; [-0.7, 0.7].forEach(e => bx(0.1, H + 3, 0.1, a + e, 0.45, (H + 3) / 2, ms)); for (let y = 1; y < H + 2.5; y += 1) bx(1.4, 0.06, 0.06, a, 0.45, y, tr); bx(0.1, 0.1, 0.5, a - 0.7, 0.25, H - 0.5, ms); bx(0.1, 0.1, 0.5, a + 0.7, 0.25, H - 0.5, ms); }
    else if (t.mstair.type === 'spiral') { const a = dr ? L - 1.6 : Math.min(L - 1.6, L * 0.75), c = at(a, 2.7, 0), col = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, H + 3, 10), ms); col.position.set(c[0], Y + (H + 3) / 2, c[2]); tg.add(col); const ns = Math.round(H / 0.62);
      for (let k = 0; k < ns; k++) { const ang = k * 0.42 + Math.atan2(n[0], n[1]) + Math.PI, st = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.75), tr); st.position.set(c[0] + Math.cos(ang) * 1.25, Y + (k + 1) * H / ns, c[2] - Math.sin(ang) * 1.25); st.rotation.y = ang; st.castShadow = true; tg.add(st); } }
    else { const run = Math.min(L - 0.6, H * 1.05), a0 = dr ? L - 0.3 - run : 0.3, ns = Math.round(H / 0.6);   // a straight MS flight along the wall, rising away from the start
      for (let k = 0; k < ns; k++) bx(run / ns + 0.05, 0.1, 2.6, a0 + (k + 0.5) * run / ns, 1.35, (k + 1) * H / ns, tr);
      const sl = Math.hypot(run, H), ang = Math.atan2(H, run), mk = off => { const m = new THREE.Mesh(new THREE.BoxGeometry(sl, 0.35, 0.1), ms); const p = at(a0 + run / 2, off, H / 2); m.position.set(p[0], p[1], p[2]); if (xs) { m.rotation.y = Math.PI / 2; m.rotation.x = 0; m.rotateZ(-ang); } else m.rotation.z = ang; m.castShadow = true; tg.add(m); };
      mk(0.1); mk(2.65); const hr = new THREE.Mesh(new THREE.BoxGeometry(sl, 0.06, 0.06), ms), p2 = at(a0 + run / 2, 2.65, H / 2 + 3); hr.position.set(p2[0], p2[1], p2[2]); if (xs) { hr.rotation.y = Math.PI / 2; hr.rotateZ(-ang); } else hr.rotation.z = ang; tg.add(hr); } } }
  if (t.pipes && t.pipes.face) { const M0 = (t.blocks || []).find(b => b.type === 'mumty'); if (M0) { const pv = P('t_pvc', 0x8C8C88), f = t.pipes.face, H0 = +M0.h || 9;   // 246: open plumbing pipes on the stairs-room wall
    const po = +t.pipes.off || 0; [-0.7, 0, 0.7].forEach((u0, k) => { const u = u0 + po, r = k === 1 ? 0.22 : 0.16, cx = f === 'left' ? M0.x - 0.3 : f === 'right' ? M0.x + M0.w + 0.3 : M0.x + M0.w / 2 + u, cz = f === 'back' ? M0.z - 0.3 : f === 'front' ? M0.z + M0.d + 0.3 : M0.z + M0.d / 2 + u;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, H0 + 0.6, 12), pv); c.position.set(cx, Y + (H0 + 0.6) / 2, cz); c.castShadow = true; tg.add(c); }); } }
  (t.blocks || []).forEach((bk, i) => {
    const bg = new THREE.Group(); bg.userData.st = { i }; tg.add(bg); const x = +bk.x + bk.w / 2, z = +bk.z + bk.d / 2, h = bk.type === 'shaft' && bk.h != null && bk.h !== '' && +bk.h >= 0 && +bk.h < 1 ? Math.max(0.08, +bk.h) : (bk.type !== 'ac' && +bk.h > 0 ? +bk.h : 0) || BH_[bk.type] || 9;   // a height the customer typed
    if (bk.type === 'ac') {   // 222: split AC outdoor units of a standard size (~2.75 × 1 × 2 ft) on low stands, one per 3 ft of the block, fans facing the open terrace
      const acm = P('t_ac', 0xD9DCDD), grill = P('t_acg', 0x3A3F44), alongX = bk.w >= bk.d, L = alongX ? bk.w : bk.d, n = Math.max(1, Math.round(L / 3)), ul = Math.min(2.75, L / n - 0.25), ud = Math.min(1.05, alongX ? bk.d : bk.w), uh = Math.min(2, h - 0.4);
      const dx = pw / 2 - x, dz = pd / 2 - z, sx = alongX ? 0 : Math.sign(dx || 1) * ((bk.w - ud) / 2), sz = alongX ? Math.sign(dz || 1) * ((bk.d - ud) / 2) : 0;
      for (let k = 0; k < n; k++) { const off = -L / 2 + (k + 0.5) * (L / n), ux = alongX ? x + off : x + sx, uz = alongX ? z + sz : z + off;
        box(bg, alongX ? ul : ud, uh, alongX ? ud : ul, ux, Y + 0.4 + uh / 2, uz, acm); box(bg, alongX ? ul - 0.2 : 0.2, 0.4, alongX ? 0.2 : ul - 0.2, ux, Y + 0.2, uz, grill, false);
        const fan = new THREE.Mesh(new THREE.CircleGeometry(Math.min(uh, ul) * 0.34, 24), grill);
        if (alongX) { fan.position.set(ux - ul * 0.15, Y + 0.4 + uh / 2, uz + Math.sign(dz || 1) * (ud / 2 + 0.02)); if (dz < 0) fan.rotation.y = Math.PI; }
        else { fan.position.set(ux + Math.sign(dx || 1) * (ud / 2 + 0.02), Y + 0.4 + uh / 2, uz - ul * 0.15); fan.rotation.y = dx > 0 ? Math.PI / 2 : -Math.PI / 2; }
        bg.add(fan); }
      return;
    }
    if (bk.type === 'shaft') { const th = 0.33; box(bg, bk.w, h, th, x, Y + h / 2, z - bk.d / 2 + th / 2, plaster); box(bg, bk.w, h, th, x, Y + h / 2, z + bk.d / 2 - th / 2, plaster);
      box(bg, th, h, bk.d, x - bk.w / 2 + th / 2, Y + h / 2, z, plaster); box(bg, th, h, bk.d, x + bk.w / 2 - th / 2, Y + h / 2, z, plaster); box(bg, bk.w - 0.6, 0.05, bk.d - 0.6, x, Y + 0.3, z, dark, false); return; }
    if (bk.type === 'troom') {   // 273 (owner): a temporary room — MS posts + a sloped sheet roof, walls of net (jaal) or PVC sheet
      const ms = P('t_trms', 0x3A3D40), net = bk.mat === 'pvc', H1 = h, H2 = h + 0.9, wl = new THREE.MeshStandardMaterial(net ? { color: 0x2F5A3A, transparent: true, opacity: 0.45, roughness: 1, side: THREE.DoubleSide } : { color: 0xE3ECF0, transparent: true, opacity: 0.55, roughness: 0.35, side: THREE.DoubleSide });
      const x0 = +bk.x, z0 = +bk.z, nx = Math.max(1, Math.round(bk.w / 5)), nz = Math.max(1, Math.round(bk.d / 5)), post = (px, pz, ph) => box(bg, 0.17, ph, 0.17, px, Y + ph / 2, pz, ms);
      for (let i = 0; i <= nx; i++) { const px = x0 + bk.w * i / nx; post(px, z0, H2); post(px, z0 + bk.d, H1); }
      for (let j = 1; j < nz; j++) { const pz = z0 + bk.d * j / nz, ph = H2 - (H2 - H1) * j / nz; post(x0, pz, ph); post(x0 + bk.w, pz, ph); }
      const wall = (L, ph, px, pz, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(L, ph), wl); m.position.set(px, Y + ph / 2, pz); m.rotation.y = ry; bg.add(m); };
      wall(bk.w, H2, x, z0, 0); wall(bk.w, H1, x, z0 + bk.d, 0); wall(bk.d, (H1 + H2) / 2, x0, z, Math.PI / 2); wall(bk.d, (H1 + H2) / 2, x0 + bk.w, z, Math.PI / 2);
      [z0, z0 + bk.d].forEach((pz, k) => box(bg, bk.w, 0.12, 0.12, x, Y + (k ? H1 : H2), pz, ms, false)); [x0, x0 + bk.w].forEach(px => { const rl = box(bg, 0.12, 0.12, Math.hypot(bk.d, H2 - H1), px, Y + (H1 + H2) / 2, z, ms, false); rl.rotation.x = Math.atan2(H2 - H1, bk.d); });
      const rf = new THREE.Mesh(new THREE.BoxGeometry(bk.w + 0.6, 0.06, Math.hypot(bk.d, H2 - H1) + 0.6), net ? P('t_trrf', 0x8FA0A8) : P('t_trrf2', 0xC9D5DC)); rf.position.set(x, Y + (H1 + H2) / 2 + 0.1, z); rf.rotation.x = Math.atan2(H2 - H1, bk.d); rf.castShadow = true; bg.add(rf);
      for (let i = 0; i < 6; i++) box(bg, 0.04, 0.05, Math.hypot(bk.d, H2 - H1) + 0.5, x0 + bk.w * (i + 0.5) / 6, Y + (H1 + H2) / 2 + 0.15, z, ms, false).rotation.x = Math.atan2(H2 - H1, bk.d);   // roof purlins
      const dm = net ? wl : P('t_trdr', 0xB7C3CA), dz2 = bk.door || (Math.abs(pw / 2 - x) / pw > Math.abs(pd / 2 - z) / pd ? (pw / 2 > x ? 'right' : 'left') : (pd / 2 > z ? 'front' : 'back')); if (dz2 === 'front' || dz2 === 'back') box(bg, 3, 7, 0.06, x, Y + 3.5, dz2 === 'front' ? z0 + bk.d + 0.04 : z0 - 0.04, ms, false) && box(bg, 2.7, 6.7, 0.07, x, Y + 3.45, dz2 === 'front' ? z0 + bk.d + 0.05 : z0 - 0.05, dm, false);
      else { box(bg, 0.06, 7, 3, dz2 === 'left' ? x0 - 0.04 : x0 + bk.w + 0.04, Y + 3.5, z, ms, false); box(bg, 0.07, 6.7, 2.7, dz2 === 'left' ? x0 - 0.05 : x0 + bk.w + 0.05, Y + 3.45, z, dm, false); }
      return; }
    box(bg, bk.w, h, bk.d, x, Y + h / 2, z, wallm);
    if (bk.type === 'mumty') { const e = mumtyProj(t, bk), G = mstGap(t, bk), yS = Y + h + 0.17;   // 266 (owner): the stairs up come through a proper opening in the chajja
      if (!G) box(bg, bk.w + e.l + e.r, 0.35, bk.d + e.b + e.f, x + (e.r - e.l) / 2, yS, z + (e.f - e.b) / 2, side2);
      else { const k = { left: 'l', right: 'r', back: 'b', front: 'f' }[G.sd], e2 = Object.assign({}, e, { [k]: 0 }), X0 = +bk.x - e.l, X1 = +bk.x + +bk.w + e.r, Z0 = +bk.z - e.b, Z1 = +bk.z + +bk.d + e.f, xs = G.sd === 'left' || G.sd === 'right';
        box(bg, bk.w + e2.l + e2.r, 0.35, bk.d + e2.b + e2.f, x + (e2.r - e2.l) / 2, yS, z + (e2.f - e2.b) / 2, side2);
        const s0 = xs ? (G.sd === 'left' ? X0 : +bk.x + +bk.w) : (G.sd === 'back' ? Z0 : +bk.z + +bk.d), sw = e[k], A0 = xs ? Z0 : X0, A1 = xs ? Z1 : X1, o0 = (xs ? +bk.z : +bk.x), g0 = Math.max(A0, o0 + G.g0), g1 = Math.min(A1, o0 + G.g1);
        [[A0, g0], [g1, A1]].forEach(([a, b]) => { if (b - a > 0.1) { if (xs) box(bg, sw, 0.35, b - a, s0 + sw / 2, yS, (a + b) / 2, side2); else box(bg, b - a, 0.35, sw, (a + b) / 2, yS, s0 + sw / 2, side2); } }); } }   // 263 (owner): the usual 2 ft chajja round the stairs room (none where a room joins it)
    else box(bg, bk.w + 0.6, 0.35, bk.d + 0.6, x, Y + h + 0.17, z, side2);
    if (bk.type !== 'lift') {   // a door on the side that faces the open terrace
      const DD = { front: [0, 1], back: [0, -1], left: [-1, 0], right: [1, 0] }[bk.door], dx = DD ? DD[0] * pw : pw / 2 - x, dz = DD ? DD[1] * pd : pd / 2 - z, door = P('t_door', 0x6B4A2F);   // 221: bk.door = the side the door opens to (asked in the wizard)
      const dh = Math.min(7, h - 1); if (dh >= 4) if (Math.abs(dx) / pw > Math.abs(dz) / pd) box(bg, 0.1, dh, Math.min(3.2, bk.d - 1), x + Math.sign(dx) * (bk.w / 2 + 0.05), Y + dh / 2, z, door); else box(bg, Math.min(3.2, bk.w - 1), dh, 0.1, x, Y + dh / 2, z + Math.sign(dz) * (bk.d / 2 + 0.05), door);
    }
    if (bk.type === 'mumty' && t.tanks !== false && t.tankScreen === 'existing') { const sm = P('t_tscr', 0x9C8F80), H = 4.5, y = Y + h + 0.35 + H / 2, ins = 0.4;   // 238: the screen already round the tanks (kept)
      box(bg, bk.w - ins * 2, H, 0.15, x, y, z - bk.d / 2 + ins, sm); box(bg, bk.w - ins * 2, H, 0.15, x, y, z + bk.d / 2 - ins, sm); box(bg, 0.15, H, bk.d - ins * 2, x - bk.w / 2 + ins, y, z, sm); box(bg, 0.15, H, bk.d - ins * 2, x + bk.w / 2 - ins, y, z, sm); }
    if (bk.type === 'mumty' && t.tanks !== false) { const n = Math.max(bk.w, bk.d) >= 12 ? 2 : 1, along = bk.d >= bk.w; for (let j = 0; j < n; j++) { const tk = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 4, 20), P('t_tank', 0x1F2224)); const o = n > 1 ? (j ? 3 : -3) : 0; tk.position.set(x + (along ? 0 : o), Y + h + 2.35, z + (along ? o : 0)); tk.castShadow = true; bg.add(tk); } }
  });
}
// 193j: things around the cabin (sofa, planters, a pergola…) drawn by space3d's own models, loaded the first time they're needed
let AROUND = null, AROUND_LOADING = false;
function aroundOn(tg, t, y) {
  if (!AROUND) { if (!AROUND_LOADING) { AROUND_LOADING = true; import('./space3d.js?v=60').then(m => { AROUND = m.itemsGroup; if (R.last) { R.key = ''; show(...R.last); } }).catch(() => {}); } return; }
  try { const r = AROUND(t.around, { sel: t.asel != null ? t.asel : null, labels: true }); r.g.position.y = y; tg.add(r.g); } catch (e) { if (window.console) console.warn(e); }
}
function itemAt(hits) { const h = hits[0]; if (!h) return null; let o = h.object, hd = null; while (o) { if (hd == null && o.userData && o.userData.it != null) hd = o; if (o.name === 'planitems') return hd; o = o.parent; } return null; }
function plotOf() { return R.group && R.group.getObjectByName('plot'); }
function toPlot(p) { const tg = plotOf(); return tg ? tg.worldToLocal(p.clone()) : p; }

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
    const controls = new OrbitControls(cam, renderer.domElement); controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.49; controls.addEventListener('change', () => { if (R && R.active === cam && cam.position.y < 1) cam.position.y = 1; });   // 266: look up from below, never under the floor
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;border-radius:16px';
    R = { renderer, scene, cam, ortho, controls, sun, hemi, key: '', view: '', group: null, skyD: sky('#BFD8EA', '#F1EEE7'), skyN: sky('#0B1222', '#2B3550'), night: false };
    scene.background = R.skyD;
    const loop = () => { R.raf = requestAnimationFrame(loop); if (!R.el || !R.el.isConnected) return; R.controls.update(); keepNear(); under(); R.renderer.render(R.scene, R.active || R.cam); };
    loop();
    window.addEventListener('resize', () => R.el && size());
    const cv = renderer.domElement;
    cv.addEventListener('pointerdown', pDown, true); cv.addEventListener('pointermove', pMove); cv.addEventListener('pointerup', pUp); cv.addEventListener('pointercancel', () => { if (R.sdrag) { R.sdrag.obj.position.set(0, 0, 0); R.sdrag = null; R.controls.enabled = R.ctlOn; } if (R.cdrag) { R.cdrag = null; R.controls.enabled = R.ctlOn; R.key = ''; } if (R.drag) { R.drag.obj.position.set(0, 0, 0); R.drag = null; R.controls.enabled = R.ctlOn; } });
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
  const t = R.controls.target, m = Math.max(R.L, R.W) * 0.6 + 4 + (R.ts ? Math.max(R.ts.pw, R.ts.pd) : 0), x = Math.min(R.L + m, Math.max(-m, t.x)), y = Math.min(R.H * 1.6, Math.max(-R.H * 0.8, t.y)), z = Math.min(R.W + m, Math.max(-m, t.z))
  if (x !== t.x || y !== t.y || z !== t.z) { const dx = x - t.x, dy = y - t.y, dz = z - t.z; t.set(x, y, z); R.cam.position.x += dx; R.cam.position.y += dy; R.cam.position.z += dz }
}
function under() {   // orbiting below the floor: the ground, deck and floor fade out so the ceiling / false ceiling is seen from under
  if (!R.group) return; const b = (R.active || R.cam) === R.cam && R.view !== 'inside' && R.cam.position.y < -0.2
  if (b === R.below) return; R.below = b
  const st = R.group.getObjectByName('site'); if (st) st.visible = !b && !(['top', 'front', 'right', 'back', 'left'].includes(R.view) && !(R.ts && R.view === 'top'))
  R.group.traverse(o => { if (o.userData && o.userData.under) o.visible = !b })
}
function size() { const w = R.el.clientWidth || 360, h = R.el.clientHeight || 220; R.renderer.setSize(w, h, false); R.cam.aspect = w / h; R.cam.updateProjectionMatrix(); fitOrtho(); }
function fitOrtho() {
  if (!R.group) return; const a = (R.el.clientWidth || 360) / (R.el.clientHeight || 220), v = R.view, L = R.L, W = R.W, H = R.H, pad = 1.18;
  const wide = R.ts && (R.ts.place || R.ts.whole); let w, h; if (v === 'top' && wide) { w = R.ts.pw + 4; h = R.ts.pd + 4; } else if (v === 'top') { w = L + 6; h = W + 6; } else if (v === 'front' || v === 'back') { w = L + 6; h = H + 4; } else { w = W + 6; h = H + 4; }
  if (w / h > a) h = w / a; else w = h * a;
  Object.assign(R.ortho, { left: -w / 2 * pad, right: w / 2 * pad, top: h / 2 * pad, bottom: -h / 2 * pad }); R.ortho.updateProjectionMatrix();
}
const PERSP = ['3d', 'cut', 'inside', '360'];
function visible(v) {   // what each view shows
  const g = R.group, by = (n) => g.getObjectByName(n), top = v === 'top', elev = ['front', 'right', 'back', 'left'].includes(v), open = v === 'cut' || top;
  by('roof').visible = !open; const ce = by('ceiling'); if (ce) ce.visible = !open; by('lights').visible = !open;
  const pj = by('proj'); if (pj) pj.visible = !top; const fu = by('furn'); if (fu) fu.visible = PERSP.includes(v); const st = by('site'); if (st) st.visible = (!top || !!R.ts) && !elev;
  const n = by('night'); if (n) n.visible = R.night && !top;
  const lb = by('labels'); if (lb) lb.visible = !['inside', '360'].includes(v);   // 188: labels and door arrows only when looking at the model
  R.sun.castShadow = !top && !elev; R.below = undefined;
}
function topCam() {   // from above: a terrace is seen whole, road at the bottom; else the cabin
  const tg = R.ts && (R.ts.place || R.ts.whole) && plotOf();   // 192: the whole terrace only while placing / on 'Whole terrace'
  if (tg) { tg.updateWorldMatrix(true, false); const c0 = tg.localToWorld(new THREE.Vector3(R.ts.pw / 2, 0, R.ts.pd / 2)), up = tg.localToWorld(new THREE.Vector3(R.ts.pw / 2, 0, 0)).sub(c0).normalize();
    R.ortho.position.set(c0.x, 100, c0.z + 0.001); R.ortho.up.copy(up); R.ortho.lookAt(c0.x, 0, c0.z); }
  else { R.ortho.position.set(R.L / 2, 100, R.W / 2 + 0.001); R.ortho.up.set(0, 0, -1); R.ortho.lookAt(R.L / 2, 0, R.W / 2); }
}
function setView(v, keepCam) {
  R.view = v; const L = R.L, W = R.W, H = R.H, cx = L / 2, cz = W / 2, d = Math.max(L, W), C = R.controls;
  visible(v);
  C.maxPolarAngle = Math.PI * 0.58; C.minPolarAngle = 0; R.cam.fov = 40; C.enableZoom = true; C.rotateSpeed = 1; C.autoRotate = v === '360'; C.enabled = true; C.enableRotate = true; C.autoRotateSpeed = 1.1; C.enablePan = false;
  if (v === 'top') { R.active = R.ortho; topCam(); C.enabled = false; }
  else if (['front', 'back', 'right', 'left'].includes(v)) {
    R.active = R.ortho; R.ortho.up.set(0, 1, 0);
    const p = { front: [cx, H / 2, W + 100], back: [cx, H / 2, -100], right: [L + 100, H / 2, cz], left: [-100, H / 2, cz] }[v];
    R.ortho.position.set(p[0], p[1], p[2]); R.ortho.lookAt(cx, H / 2, cz); C.enabled = false;
  } else if (v === 'inside') {   // stand just inside the main door, eyes at 5 ft, turn on the spot; tap the floor to walk
    R.active = R.cam; R.cam.fov = 70;
    if (!keepCam) { const st = R.start || [cx, Math.max(1.5, W - 2.5), cx, cz]; R.cam.position.set(st[0], 5, st[1]); const dx = st[2] - st[0], dz = st[3] - st[1], n = Math.hypot(dx, dz) || 1; C.target.set(st[0] + dx / n * 0.4, 4.9, st[1] + dz / n * 0.4); }
    C.minPolarAngle = Math.PI * 0.3; C.maxPolarAngle = Math.PI * 0.7; C.minDistance = C.maxDistance = 0.4; C.enableZoom = false; C.rotateSpeed = -0.45; C.autoRotateSpeed = 0.6;
  } else {   // 3d / roof off / 360
    R.active = R.cam; C.minDistance = 3; C.maxDistance = Math.max(d * 4, R.ts ? Math.max(R.ts.pw, R.ts.pd) * 2.4 : 0); C.maxPolarAngle = Math.PI * 0.93;   // go round and under: see the ceiling from below
    C.enablePan = true; C.screenSpacePanning = true; buttons();   // move the model: right-drag / two fingers, or the ✋ move mode
    if (!keepCam) { const k = Math.max(1.25, 1.5 / R.cam.aspect) * (R.ts && (R.ts.place || R.ts.whole) ? 2.1 : 1), hi = v === 'cut' ? 1.7 : 1;
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
  if (R.ts && ['3d', 'cut', 'top', '360'].includes(R.view)) {   // a terrace: grab a block (mumty, lift, shaft, room) — or, while placing, the whole cabin
    const tg = plotOf(), hits = cast(e, [R.group]), f = floorAt(e);
    const hb = hits.find(h => { let o = h.object; while (o && !o.userData.st) o = o.parent; return o; });
    const ih = !R.ts.place && f ? itemAt(hits) : null, ia = ih && (R.ts.around || [])[ih.userData.it];
    if (ih && ia) { R.down = { x: e.clientX, y: e.clientY, t: Date.now(), tag: null }; R.ctlOn = R.controls.enabled; R.idrag = { obj: ih, i: ih.userData.it, p0: toPlot(f), pos0: ih.position.clone(), x0: +ia.x, z0: +ia.z, can: !ia.lock && !ia.segs && !ia.box, moved: false }; R.controls.enabled = false; e.preventDefault(); return; }
    if (hb && f && R.ts.place) { let o = hb.object; while (!o.userData.st) o = o.parent; const bk = (R.ts.blocks || [])[o.userData.st.i];   // 192: frozen after the Where step
      if (bk && bk.lock) { e.preventDefault(); return; }   // locked: can't be moved by mistake
      if (bk) { R.down = { x: e.clientX, y: e.clientY, t: Date.now(), tag: null }; R.ctlOn = R.controls.enabled; R.sdrag = { obj: o, i: o.userData.st.i, p0: toPlot(f), x0: +bk.x, z0: +bk.z, w: +bk.w, d: +bk.d, side: bk.side || 'free', moved: false }; R.controls.enabled = false; e.preventDefault(); return; } }
    if (R.ts.whole && !R.ts.place && f && hits.some(h => { let o = h.object; while (o && o.name !== 'site') o = o.parent; return !o; })) {   // 193e: on 'Whole terrace' the cabin itself moves on the terrace
      tg.updateWorldMatrix(true, false); R.down = { x: e.clientX, y: e.clientY, t: Date.now(), tag: null }; R.ctlOn = R.controls.enabled;
      R.cdrag = { inv: tg.matrixWorld.clone().invert(), p0: f.clone().applyMatrix4(tg.matrixWorld.clone().invert()), pos0: tg.position.clone(), cx0: +R.ts.cx, cz0: +R.ts.cz, moved: false, shift: new THREE.Vector3() }; R.controls.enabled = false; e.preventDefault(); return; }
    if (R.ts.place) { R.down = { x: e.clientX, y: e.clientY, t: Date.now(), tag: null }; R.ctlOn = R.controls.enabled; return; }   // placing: nothing in the cabin is picked
  }
  const t = pickAt(e); R.down = { x: e.clientX, y: e.clientY, t: Date.now(), tag: t }; R.ctlOn = R.controls.enabled;
  if (t && t.userData.pl != null) {   // grab a room / partition: the view holds still while it moves
    const f = floorAt(e), p = (R.lay.places || [])[t.userData.pl]; if (!f || !p) return;
    R.drag = { obj: t, i: t.userData.pl, f0: f, x0: +p.x, y0: +p.y, moved: false }; R.controls.enabled = false; e.preventDefault();
  }
}
function pMove(e) {
  const id = R.idrag; if (id) { const f = floorAt(e); if (!f || !id.can) return; if (!id.moved && Math.hypot(e.clientX - R.down.x, e.clientY - R.down.y) < 5) return; id.moved = true; const p = toPlot(f);
    id.nx = Math.round((id.x0 + p.x - id.p0.x) * 2) / 2; id.nz = Math.round((id.z0 + p.z - id.p0.z) * 2) / 2; id.obj.position.set(id.pos0.x + id.nx - id.x0, id.pos0.y, id.pos0.z + id.nz - id.z0); return; }
  const sd = R.sdrag; if (sd) { const f = floorAt(e); if (!f) return; if (!sd.moved && Math.hypot(e.clientX - R.down.x, e.clientY - R.down.y) < 5) return; sd.moved = true;
    const t = R.ts, PT = 0.75, p = toPlot(f), x = Math.round(Math.max(PT, Math.min(t.pw - PT - sd.w, sd.x0 + p.x - sd.p0.x)) * 2) / 2, z = Math.round(Math.max(PT, Math.min(t.pd - PT - sd.d, sd.z0 + p.z - sd.p0.z)) * 2) / 2;
    sd.nx = sd.side === 'left' || sd.side === 'right' ? sd.x0 : x; sd.nz = sd.side === 'back' || sd.side === 'front' ? sd.z0 : z;   // on a wall: slides along it only
    sd.obj.position.set(sd.nx - sd.x0, 0, sd.nz - sd.z0); return; }
  const cd = R.cdrag; if (cd) { const f = floorAt(e); if (!f) return; if (!cd.moved && Math.hypot(e.clientX - R.down.x, e.clientY - R.down.y) < 5) return; cd.moved = true;
    const p = f.clone().sub(cd.shift).applyMatrix4(cd.inv), t = R.ts,   // 193e: the camera slid with the terrace — take that out, or the cabin chases itself (flicker)
      [fw, fd] = tsFootDims(t, R.L, R.W);
    const cx = Math.max(-fw / 2, Math.min(t.pw - fw / 2, cd.cx0 + p.x - cd.p0.x)), cz = Math.max(-fd / 2, Math.min(t.pd - fd / 2, cd.cz0 + p.z - cd.p0.z));   // 193e: smooth while dragging, ½ ft on drop
    const tg = plotOf(), sg = tg.parent; tg.position.set(cd.pos0.x - (cx - cd.cx0), 0, cd.pos0.z - (cz - cd.cz0)); cd.ncx = Math.round(cx * 2) / 2; cd.ncz = Math.round(cz * 2) / 2;
    // the terrace slides under the cabin; the camera slides with it, so on screen the cabin is what moves
    const want = new THREE.Vector3(-(cx - cd.cx0), 0, -(cz - cd.cz0)).applyAxisAngle(new THREE.Vector3(0, 1, 0), sg.rotation.y), dv = want.clone().sub(cd.shift); cd.shift.copy(want);
    if (R.active === R.ortho) R.ortho.position.add(dv); else { R.cam.position.add(dv); R.controls.target.add(dv); }
    return; }
  const d = R.drag; if (!d) return; const f = floorAt(e); if (!f) return;
  if (!d.moved && Math.hypot(e.clientX - R.down.x, e.clientY - R.down.y) < 5) return; d.moved = true;
  const s = snap(d.i, d.x0 + f.x - d.f0.x, d.y0 + f.z - d.f0.z); d.nx = s[0]; d.ny = s[1]; d.obj.position.set(s[0] - d.x0, 0, s[1] - d.y0); selBox();
}
function pUp(e) {
  const id = R.idrag; if (id) { R.idrag = null; R.down = null; R.controls.enabled = R.ctlOn; HANDLER(id.moved ? { t: 'moveitem', i: id.i, x: id.nx, z: id.nz } : { t: 'selitem', i: id.i }); return; }
  const sd = R.sdrag; if (sd) { R.sdrag = null; R.down = null; R.controls.enabled = R.ctlOn; if (sd.moved) HANDLER({ t: 'movesite', i: sd.i, x: sd.nx, z: sd.nz }); return; }
  const cd = R.cdrag; if (cd) { R.cdrag = null; R.down = null; R.controls.enabled = R.ctlOn; if (cd.moved) HANDLER({ t: 'movecab', cx: cd.ncx, cz: cd.ncz }); return; }
  if (R.ts && R.ts.place) { R.down = null; return; }
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
function dimsOf(p) { const it = (R.c.items || []).find(x => x.key === p.key); if (it && it.unit === 'rft') return p.rot === 90 ? [0.4, +p.len || 1] : [+p.len || 1, 0.4]; const f0 = FOOT[p.key] || [3, 3], f = [+p.w || f0[0], +p.d || f0[1]]; return p.rot === 90 ? [f[1], f[0]] : [f[0], f[1]]; }
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
  opts = opts || {}; ensure(el); R.last = [el, c, lay, view, opts];
  const ts = opts.site && opts.site.kind === 'terrace' ? opts.site : null;
  const key = JSON.stringify(lay) + '|' + (opts.furn || 'none') + '|' + JSON.stringify(ts), dimKey = [lay.L, lay.W, lay.height, ts ? 't' + (ts.place || ts.whole ? 'W' : 'c') : 'g'].join('x');
  let reset = view !== R.view;
  if (key !== R.key) {
    if (R.group) { R.scene.remove(R.group); R.group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    R.ts = ts; const b = build(c, lay, opts); R.group = b.g; R.L = b.L; R.W = b.W; R.H = b.H; R.scene.add(b.g); R.key = key; R.c = c; R.lay = lay; R.start = startSpot(c, lay, b.L, b.W);
    R.sun.target.position.set(b.L / 2, 0, b.W / 2);
    if (dimKey !== R.dimKey) { R.dimKey = dimKey; reset = true; }
    if (!reset) { visible(R.view); if (R.view === 'top') topCam(); }
  }
  R.lay = lay; R.c = c; R.sel = ts && ts.place ? null : opts.sel || null;
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
// 192: for the space planner — the cabin alone (x 0..L, z 0..W, floor at y 0) and a terrace in plot coords (slab at y -0.6)
export function cabinModel(c, lay) { return build(c, lay, { bare: true }); }
export function plotModel(t) { const tg = new THREE.Group(); tg.name = 'plot'; drawPlot(tg, t); return tg; }
export function sharedMat(n) { return mat(n); }
// 263: the stairs room's roof projection per side (ft) — 2 ft, none on a side touching another room / lift, ≤ the gap to the parapet's inside face
export function mstGap(t, M0) {   // 266: where the stairs onto the stairs room's roof pass its chajja (side + a-range from the wall's start)
  const m = t.mstair; if (!m || !m.type || !M0) return null; const sd = m.side || 'left', xs = sd === 'left' || sd === 'right', L = xs ? +M0.d : +M0.w, dr = M0.door === sd, H = (+M0.h || 9) + 0.35;
  if (m.type === 'ladder') { const a = dr ? L - 1.2 : L * 0.7; return { sd, g0: a - 1, g1: a + 1 }; }
  if (m.type === 'spiral') { const a = dr ? L - 1.6 : Math.min(L - 1.6, L * 0.75); return { sd, g0: a - 2.5, g1: a + 2.5 }; }
  const run = Math.min(L - 0.6, H * 1.05), a0 = dr ? L - 0.3 - run : 0.3; return { sd, g0: a0 + run - 3, g1: a0 + run + 0.4 }; }
export function mumtyProj(t, bk) { const E = 0.75, P2 = 2, o = { l: P2, r: P2, b: P2, f: P2 }, B = (t.blocks || []).filter(b => b !== bk && b.type !== 'shaft' && b.type !== 'ac' && b.type !== 'mumty' || (b !== bk && b.type === 'mumty'));
  const ov = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0) > 0.5, X0 = +bk.x, X1 = +bk.x + +bk.w, Z0 = +bk.z, Z1 = +bk.z + +bk.d;
  B.filter(b => b.type !== 'shaft' && b.type !== 'ac').forEach(b => { const x0 = +b.x, x1 = x0 + +b.w, z0 = +b.z, z1 = z0 + +b.d;
    if (Math.abs(x1 - X0) < 0.7 && ov(z0, z1, Z0, Z1)) o.l = 0; if (Math.abs(x0 - X1) < 0.7 && ov(z0, z1, Z0, Z1)) o.r = 0; if (Math.abs(z1 - Z0) < 0.7 && ov(x0, x1, X0, X1)) o.b = 0; if (Math.abs(z0 - Z1) < 0.7 && ov(x0, x1, X0, X1)) o.f = 0; });
  o.l = Math.max(0.3, Math.min(o.l || 0.3, X0 - E)); o.r = Math.max(0.3, Math.min(o.r || 0.3, (+t.pw || 30) - E - X1)); o.b = Math.max(0.3, Math.min(o.b || 0.3, Z0 - E)); o.f = Math.max(0.3, Math.min(o.f || 0.3, (+t.pd || 60) - E - Z1)); return o; }
