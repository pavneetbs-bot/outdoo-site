// outrr design studio — Made to Order furniture (310, owner: "one model per design"): every chair, sofa, dining table and
// coffee table (S7-WPC-* / S7-WPS-*) drawn from its photo — one recipe per design: plan shape of the woven shell (tub,
// rounded U, box, back only), back / arm heights, the weave (canvas pattern, the photo's colour), legs / base, cushions.
// The customer's picks change the frame (MS / aluminium in White / Black / Charcoal / Bronze, or teak / acacia) and the
// cushion fabric. Units: feet, y up; the sitting side faces +z. Setting: a terrace corner (grey tiles, parapets behind and
// on the left, a person for scale).
import * as THREE from './vendor/three/three.module.min.js';
import { studioFloor, wall as sWall, person } from './studio3d.js?v=9';

const CM = v => v / 30.48;
const M = {}, mt = (k, o) => M[k] || (M[k] = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.7 }, o)));
const FRAME = { white: 0xE6E3DC, black: 0x1F1F1F, charcoal: 0x3A3B3C, bronze: 0x5A4634, teak: 0xA8743F, acacia: 0x8C5A33, natural: 0xA8743F };
const FAB = { beige: 0xCFC3AE, grey: 0xA7A6A1, charcoal: 0x4B4B4C, sand: 0xD3BF9E, 'off-white': 0xEEEAE0, olive: 0x7B7E58 };
const WC = { beige: 0xCDBEA2, charcoal: 0x3C3C3D, black: 0x232323, green: 0x9DAE9C, 'dark green': 0x24443A, 'off-white': 0xE6E0D2, grey: 0x8F8D88, taupe: 0xA59684,
  natural: 0xC6A06C, honey: 0xC58B47, brown: 0x6A4A32, 'dark brown': 0x45311F, blue: 0x2F5592, white: 0xE9E6DF };

// ---------- weaves: a seamless 256 px tile per pattern + colour; open weaves are cut out (alphaTest) ----------
const WV = {};
function shade(c, k) { const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255, f = v => Math.max(0, Math.min(255, Math.round(v * k))); return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')'; }
function rope(x, path, w, c) { x.lineCap = 'round'; x.lineJoin = 'round'; [[w + 4, 0.55], [w, 1], [w * 0.35, 1.28]].forEach(([lw, k], i) => { x.strokeStyle = shade(c, k); x.lineWidth = lw; x.beginPath(); path(x, i === 2 ? -w * 0.15 : 0); x.stroke(); }); }
function line(x0, y0, x1, y1) { return (x, o) => { for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) { x.moveTo(x0 + dx + o, y0 + dy + o); x.lineTo(x1 + dx + o, y1 + dy + o); } }; }
function wvTile(p, c) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d'); let open = true;
  const solid = k => { open = false; x.fillStyle = shade(c, k || 0.55); x.fillRect(0, 0, 256, 256); };
  const diag = (s, w) => { for (let i = -256; i < 512; i += s) { rope(x, line(i, 0, i + 256, 256), w, c); rope(x, line(i, 256, i + 256, 0), w, c); } };
  const vert = (s, w) => { for (let i = s / 2; i < 256; i += s) rope(x, line(i, -10, i, 266), w, c); };
  const hor = (s, w) => { for (let i = s / 2; i < 256; i += s) rope(x, line(-10, i, 266, i), w, c); };
  switch (p) {
    case 'lattice': diag(64, 13); break;
    case 'net': diag(46, 7); hor(128, 5); break;
    case 'diamond': solid(0.45); diag(30, 13); break;
    case 'nest': diag(52, 15); for (let i = 0; i < 256; i += 52) for (let j = 0; j < 256; j += 52) { x.fillStyle = shade(c, 0.9); x.beginPath(); x.arc(i + 26, j, 10, 0, 7); x.fill(); } break;
    case 'trellis': vert(42, 11); diag(84, 10); break;
    case 'fan': vert(24, 12); break;
    case 'vert': vert(32, 13); break;
    case 'vdense': solid(0.4); vert(16, 13); break;
    case 'slat': vert(64, 34); break;
    case 'grid': vert(32, 8); hor(32, 8); break;
    case 'cane': vert(28, 5); hor(28, 5); diag(56, 4); break;
    case 'tri': hor(64, 10); diag(74, 10); break;
    case 'diag': for (let i = -256; i < 512; i += 40) rope(x, line(i, 0, i + 256, 256), 11, c); hor(64, 9); break;
    case 'serp': for (let i = 16; i < 256; i += 32) rope(x, (q, o) => { for (const dy of [-256, 0]) { q.moveTo(i + o, dy + o); for (let y = 0; y <= 256; y += 8) q.lineTo(i + 10 * Math.sin(y / 256 * Math.PI * 4 + (i / 32) * Math.PI) + o, y + dy + 256 * 0 + o); } }, 12, c); break;
    case 'chevron': solid(0.45); for (let i = -256; i < 512; i += 26) rope(x, (q, o) => { for (const dy of [-256, 0, 256]) { q.moveTo(o, i + dy); q.lineTo(128 + o, i + 60 + dy); q.lineTo(256 + o, i + dy); } }, 11, c); break;
    case 'basket': case 'marled': case 'strap': { solid(0.5); const s = p === 'strap' ? 64 : 32;
      for (let i = 0; i < 256; i += s) for (let j = 0; j < 256; j += s) { const hz = ((i + j) / s) % 2 === 0, k = p === 'marled' ? (0.75 + 0.5 * ((i * 7 + j * 13) % 5) / 4) : 1;
        for (let t = 0; t < 2; t++) { x.fillStyle = shade(c, k * (t ? 1.08 : 0.92)); if (hz) x.fillRect(i + 2, j + 2 + t * s / 2, s - 4, s / 2 - 3); else x.fillRect(i + 2 + t * s / 2, j + 2, s / 2 - 3, s - 4); } }
      if (p === 'basket' || p === 'marled') open = p === 'marled'; if (p === 'marled') { x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 256; i += 32) for (let j = 0; j < 256; j += 32) { x.fillRect(i - 2, j - 2, 4, 4); } x.globalCompositeOperation = 'source-over'; } break; }
    case 'rattan': solid(0.45); hor(14, 11); for (let i = 0; i < 256; i += 36) { x.fillStyle = shade(c, 0.6); x.fillRect(i, 0, 3, 256); } break;
    case 'coil': solid(0.5); for (let j = 8; j < 256; j += 16) rope(x, (q, o) => { q.moveTo(-4, j + o); for (let i = 0; i <= 264; i += 8) q.lineTo(i, j + 3 * Math.sin(i / 256 * Math.PI * 8) + o); }, 12, c); break;
    case 'pleat': solid(0.45); for (let i = -256; i < 512; i += 22) rope(x, line(i, 0, i + 128, 256), 16, c); break;
    case 'scale': solid(0.35); for (let r = -1; r < 5; r++) for (let k = -1; k < 5; k++) { const cx = k * 64 + (r % 2 ? 32 : 0), cy = r * 52; const gr = x.createRadialGradient(cx, cy + 18, 4, cx, cy + 22, 40);
      gr.addColorStop(0, shade(c, 1.3)); gr.addColorStop(0.7, shade(c, 0.95)); gr.addColorStop(1, shade(c, 0.55)); x.fillStyle = gr; x.beginPath(); x.ellipse(cx, cy + 24, 31, 34, 0, 0, 7); x.fill(); } break;
    case 'petal': solid(0.4); for (let i = 0; i < 256; i += 64) for (let j = 0; j < 256; j += 64) for (let a = 0; a < 4; a++) { x.save(); x.translate(i + 32, j + 32); x.rotate(a * Math.PI / 2 + Math.PI / 4); x.fillStyle = shade(c, 0.85 + a * 0.08); x.beginPath(); x.ellipse(0, -16, 10, 18, 0, 0, 7); x.fill(); x.restore(); } break;
    case 'floral': solid(0.7); vert(16, 6); hor(16, 6); x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 256; i += 64) for (let j = 0; j < 256; j += 64) for (let a = 0; a < 6; a++) { x.beginPath(); x.arc(i + 32 + 14 * Math.cos(a), j + 32 + 14 * Math.sin(a), 7, 0, 7); x.fill(); } x.globalCompositeOperation = 'source-over'; break;
    case 'wicker': solid(0.55); vert(20, 7); hor(10, 7); break;
    default: solid(0.6); vert(20, 10);
  }
  return { cv, open };
}
function weave(p, c, tile) {
  const k = p + c + '|' + tile; if (WV[k]) return WV[k];
  const T = wvTile(p, c), t = new THREE.CanvasTexture(T.cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.88, side: THREE.DoubleSide, alphaTest: T.open ? 0.5 : 0, transparent: false });
  m.userData.tile = tile || 0.55; if (T.open) m.userData.depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: t, alphaTest: 0.5 });
  return (WV[k] = m);
}

// ---------- small helpers ----------
function bx(g, w, h, d, x, y, z, m, ry) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); if (ry) b.rotation.y = ry; b.castShadow = b.receiveShadow = true; g.add(b); return b; }
function cy(g, r1, r2, h, x, y, z, m, seg) { const c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg || 18), m); c.position.set(x, y, z); c.castShadow = c.receiveShadow = true; g.add(c); return c; }
function rod(g, a, b, r, m, sq) { const v = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = v.length(), o = new THREE.Mesh(sq ? new THREE.BoxGeometry(r * 2, L, r * 2) : new THREE.CylinderGeometry(r, r, L, 10), m);
  o.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); o.castShadow = true; g.add(o); return o; }
function tube(g, pts, r, m, closed) { if (pts.length < 2) return; const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])), !!closed), o = new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(8, pts.length * 3), r, 8, !!closed), m); o.castShadow = true; g.add(o); return o; }
const CUSH = {};
function cushGeo(w, h, d) { const k = [w, h, d].map(v => Math.round(v * 20)).join('x'); if (CUSH[k]) return CUSH[k];
  const g = new THREE.BoxGeometry(w, h, d, 12, 6, 12), P = g.attributes.position, A = [w, h, d], ax = A.indexOf(Math.min(...A)), o = [0, 1, 2].filter(i => i !== ax), t = A[ax];
  for (let i = 0; i < P.count; i++) { const v = [P.getX(i), P.getY(i), P.getZ(i)], n = v.map((c, j) => c / (A[j] / 2)), a = n[o[0]], b = n[o[1]], c = n[ax], bulge = Math.max(0, (1 - a * a) * (1 - b * b));
    v[ax] = Math.sign(c || 1) * (Math.abs(v[ax]) * (0.45 + 0.55 * Math.pow(bulge, 0.6)) + t * 0.18 * bulge); const pinch = 1 - 0.08 * c * c; v[o[0]] *= pinch; v[o[1]] *= pinch; P.setXYZ(i, v[0], v[1], v[2]); }
  g.computeVertexNormals(); return (CUSH[k] = g); }
function cush(g, w, h, d, x, y, z, m, rx) { const c = new THREE.Mesh(cushGeo(w, h, d), m); c.position.set(x, y, z); if (rx) c.rotation.x = rx; c.castShadow = true; g.add(c); return c; }
function setDepth(o) { o.traverse(c => { if (c.isMesh && c.material && c.material.userData && c.material.userData.depth) c.customDepthMaterial = c.material.userData.depth; }); }

// ---------- the woven shell: a plan path (front-left → round the back → front-right) pulled up to a height profile ----------
function planPath(sp, W, D) {
  const P = [], e = 0.06, zf = D / 2 - (sp.armIn != null ? sp.armIn : 0.15), zb = -D / 2 + e;
  if (sp.sh === 'tub') { const a = W / 2 - e, b = Math.max(0.6, (D - 2 * e) * (sp.deep || 0.62)), zc = zb + b, t0 = Math.max(-0.35, -Math.asin(Math.max(-1, Math.min(1, (zf - zc) / b)))), n = 40;
    for (let i = 0; i <= n; i++) { const t = t0 + (Math.PI - 2 * t0) * i / n; P.push([-a * Math.cos(t), zc - b * Math.sin(t), Math.max(0, Math.sin(t))]); } return P; }
  if (sp.sh === 'back') { const a = W / 2 - e, bow = sp.bow || 0.15, n = 16; for (let i = 0; i <= n; i++) { const u = i / n * 2 - 1; P.push([a * u, zb + bow * u * u + 0.02, 1]); } return P; }
  const r = Math.min(sp.sh === 'u' ? (sp.r || 0.45) : 0.06, W / 2 - e - 0.01, (zf - zb) * 0.9), xl = -W / 2 + e, xr = W / 2 - e;
  const add = (x, z, k) => P.push([x, z, k]);
  for (let i = 0; i <= 6; i++) add(xl, zf - (zf - zb - r) * i / 6, 0);
  for (let i = 1; i <= 8; i++) { const t = Math.PI / 2 * i / 8; add(xl + r - r * Math.cos(t), zb + r - r * Math.sin(t), Math.sin(t)); }
  for (let i = 1; i < 8; i++) add(xl + r + (xr - xl - 2 * r) * i / 8, zb, 1);
  for (let i = 0; i <= 8; i++) { const t = Math.PI / 2 * i / 8; add(xr - r + r * Math.sin(t), zb + r - r * Math.cos(t), Math.cos(t)); }
  for (let i = 1; i <= 6; i++) add(xr, zb + r + (zf - zb - r) * i / 6, 0);
  return P;
}
function shell(g, sp, W, D, y0, m, rimM) {
  const P = planPath(sp, W, D), n = P.length, ha = sp.ha, hb = sp.hb, T = sp.T || 0, tile = m.userData.tile || 0.55;
  const top = P.map(p => sp.sh === 'back' ? hb : ha + (hb - ha) * Math.pow(p[2], sp.pw || 1.6));
  // inward normals of the path (toward the seat)
  const N = P.map((p, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1; return [dz / L, -dx / L]; });
  const layer = (off, dir) => { const pos = [], uv = [], idx = []; let s = 0;
    for (let i = 0; i < n; i++) { if (i) s += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); const x = P[i][0] + N[i][0] * off, z = P[i][1] + N[i][1] * off;
      pos.push(x, y0, z, x, top[i] - (off ? 0.02 : 0), z); uv.push(s / tile, y0 / tile, s / tile, top[i] / tile); }
    for (let i = 0; i < n - 1; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; if (dir) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const o = new THREE.Mesh(geo, m); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  layer(0, 0); if (T) { layer(T, 1); const cap = []; for (let i = 0; i < n; i++) cap.push([P[i][0] + N[i][0] * T / 2, top[i] - 0.005, P[i][1] + N[i][1] * T / 2]); tube(g, cap, T / 2 + 0.01, sp.rimSame === false && rimM ? rimM : m); }
  if (rimM && (!T || sp.rimSame === false)) tube(g, P.map((p, i) => [p[0], top[i], p[1]]), sp.rimR || 0.035, rimM);
  return { P, top, N };
}

// ---------- seats ----------
function legs(g, k, W, D, yS, fm, wood, o) {
  const r = wood ? 0.07 : 0.04, ix = W / 2 - (o.legIn || 0.12), iz = D / 2 - (o.legIn || 0.12), C = [[-ix, -iz], [ix, -iz], [-ix, iz], [ix, iz]];
  if (k === 'm' || k === 'w' || k === 'ws' || k === 'mt' || k === 'plinth') { const sp = k === 'ws' ? 0.22 : k === 'mt' ? 0.08 : 0.03, extra = W > 4.5 ? [[0, -iz], [0, iz]] : [];
    C.concat(extra).forEach(([x, z]) => rod(g, [x * (1 + sp / W), 0, z * (1 + sp / D)], [x, yS, z], k === 'w' || k === 'plinth' ? r : r * 0.85, fm, k === 'w' || k === 'plinth'));
    if (o.str) { const h = yS * 0.32; bx(g, W - 0.24, 0.07, 0.07, 0, h, iz, fm); bx(g, 0.07, 0.07, D - 0.24, -ix, h, 0, fm); bx(g, 0.07, 0.07, D - 0.24, ix, h, 0, fm); }
    if (k === 'plinth') { bx(g, W, 0.22, D, 0, yS - 0.11, 0, fm); } return; }
  if (k === 'sled' || k === 'loop') { [-ix, ix].forEach(x => { const P = [[x, yS, -iz], [x, 0.03, -iz], [x, 0.03, iz], [x, yS, iz]]; for (let i = 0; i < 3; i++) rod(g, P[i], P[i + 1], k === 'loop' ? 0.06 : 0.035, fm, k === 'loop'); }); return; }
  if (k === 'xsled') { const h = yS; [[-ix, -iz, ix, iz], [ix, -iz, -ix, iz]].forEach(([a, b, c, d]) => { rod(g, [a, 0.03, b], [c * 0.3, h, d * 0.3], 0.03, fm); rod(g, [c, 0.03, d], [a * 0.3, h, b * 0.3], 0.03, fm); });
    [-ix, ix].forEach(x => rod(g, [x, 0.03, -iz], [x, 0.03, iz], 0.03, fm)); return; }
  if (k === 'hair') { C.forEach(([x, z]) => { rod(g, [x, yS, z - 0.12], [x, 0.03, z], 0.025, fm); rod(g, [x, yS, z + 0.12 * Math.sign(-z || 1)], [x, 0.03, z], 0.025, fm); }); return; }
  if (k === 'ring' || k === 'disc') { const rr = Math.min(W, D) * (k === 'disc' ? 0.36 : 0.42); cy(g, rr, rr, 0.06, 0, 0.03, 0, fm, 40); if (k === 'disc') cy(g, 0.15, 0.2, yS, 0, yS / 2, 0, fm); else C.forEach(([x, z]) => rod(g, [x * 0.7, 0.05, z * 0.7], [x * 0.8, yS, z * 0.8], 0.03, fm)); return; }
  if (k === 'ringm') { const wd = mt('teakfix', { color: FRAME.teak, roughness: 0.6 }), rr = Math.min(W, D) * 0.38; const tr = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.08, 10, 40), wd); tr.rotation.x = Math.PI / 2; tr.position.y = yS - 0.08; g.add(tr);
    C.forEach(([x, z]) => rod(g, [x * 1.05, 0, z * 1.05], [x * 0.6, yS - 0.1, z * 0.6], 0.035, fm)); return; }
  if (k === 'skirt') { C.forEach(([x, z]) => bx(g, 0.12, 0.08, 0.12, x * 0.95, 0.04, z * 0.95, fm)); return; }
}
function seat(sp, pick) {
  const g = new THREE.Group(), W = sp.W, D = sp.D, H = sp.H, wood = pick.wood, fm = pick.frame, wm = weave(sp.wv, sp.wc, sp.tile), sofa = /^s/.test(sp.t);
  const yS = sp.yS || (sofa ? 0.85 : 1.38), skirt = sp.leg === 'skirt', base = skirt ? 0.12 : yS;
  const hb = sp.hb != null ? sp.hb : H, ha = sp.ha != null ? sp.ha : (sofa ? H * 0.82 : H * 0.84);
  const sh = shell(g, Object.assign({}, sp, { hb, ha }), W, D, skirt ? 0.12 : yS - 0.02, wm, sp.rim === 'n' ? null : sp.rim === 'w' ? wm : sp.rim === 'r' ? weave('vdense', sp.wc, 0.4) : fm);
  // seat deck
  const tub = sp.sh === 'tub', inX = sp.sh === 'back' ? W - 0.1 : tub ? W * 0.8 - 2 * (sp.T || 0.05) : W - 2 * (sp.T || 0.1) - 0.12, inZ = D - (sp.sh === 'back' ? 0.2 : tub ? D * 0.22 + (sp.T || 0) : (sp.T || 0.1) + 0.1), sz = sp.sh === 'back' ? 0.06 : tub ? D * 0.1 + (sp.T || 0) / 2 : ((sp.T || 0.1) + 0.06) / 2;
  const deckM = sp.deck === 'w' ? wm : sp.deck === 't' ? mt('teakfix', { color: FRAME.teak, roughness: 0.6 }) : fm, deck = (w, d, y, h) => { if (!tub) return bx(g, w, h, d, 0, y, 0, deckM); const o = new THREE.Mesh(topGeo('tub', w, d, h), deckM); o.position.y = y - h / 2; o.castShadow = true; g.add(o); return o; };
  if (skirt) { /* the woven body closes down to the floor; deck on top */ bx(g, inX, 0.08, inZ, 0, yS - 0.04, sz, fm); }
  else { deck(W - (tub ? 0.14 : 0.1), D - (tub ? 0.14 : 0.12), yS - 0.06, 0.12); legs(g, sp.leg || 'm', tub ? W * 0.8 : W - 0.1, tub ? D * 0.8 : D - 0.12, yS - 0.1, fm, wood, sp); }
  if (sp.front || (skirt && !tub)) { const fw = tub ? inX + 0.1 : W - 0.1; bx(g, fw, yS - 0.12, 0.06, 0, (yS - 0.12) / 2 + 0.12, tub ? sz + inZ / 2 : D / 2 - 0.08, sp.T ? wm : weave('vdense', sp.wc, 0.4)); }   // woven front apron
  // posts at the arm ends (frame) for open shells
  if (sp.sh !== 'back' && !sp.T && sp.rim !== 'n' && !skirt) { const a = sh.P[0], b = sh.P[sh.P.length - 1]; [[a, sh.top[0]], [b, sh.top[sh.top.length - 1]]].forEach(([p, t]) => rod(g, [p[0], yS - 0.1, p[1]], [p[0], t, p[1]], 0.035, fm)); }
  if (sp.sh === 'back' && !sp.T) { const a = sh.P[0], b = sh.P[sh.P.length - 1]; [a, b].forEach(p => rod(g, [p[0], yS - 0.1, p[1]], [p[0], hb, p[1]], 0.035, fm)); }
  // cushions
  const n = sp.n || 1, cw = (inX - 0.04) / n, cm = pick.fab, seatD = inZ - (sp.sh === 'back' ? 0.05 : 0.1), ch = sp.ch || (sofa ? 0.42 : 0.2);
  if (sp.cush !== 0) for (let i = 0; i < n; i++) cush(g, cw - 0.02, ch, seatD, -inX / 2 + cw * (i + 0.5) + 0.02, yS + ch / 2, sz + 0.05, cm);
  else bx(g, inX, 0.04, inZ, 0, yS + 0.02, sz, weave(sp.wv === 'lattice' || sp.wv === 'net' || sp.wv === 'fan' || sp.wv === 'vert' ? 'vdense' : sp.wv, sp.wc, 0.4));
  const bc = sp.bc != null ? sp.bc : (sofa ? n : 0);
  if (bc) { const bw = (inX - 0.06) / bc, bh = sp.bch || Math.min(1.6, hb - yS - ch + 0.35), zb0 = sh.P[Math.floor(sh.P.length / 2)][1] + (sp.T || 0) + 0.3;
    for (let i = 0; i < bc; i++) cush(g, bw - 0.04, bh, 0.45, -inX / 2 + bw * (i + 0.5) + 0.03, yS + ch + bh / 2 - 0.05, zb0, cm, -0.16); }
  if (sp.pil) for (let i = 0; i < sp.pil; i++) { const pw = Math.min(1.4, inX / Math.max(2, sp.pil + 0.5)); cush(g, pw, pw * 0.95, 0.3, (sp.pil === 1 ? 0 : -inX / 2 + inX * (i + 0.5) / sp.pil), yS + ch + pw * 0.45, sh.P[Math.floor(sh.P.length / 2)][1] + (sp.T || 0) + 0.75, pick.acc || cm, -0.2); }
  return g;
}

// ---------- tables ----------
const STONE = { light: 0xD9D3C8, white: 0xEEEDEA, dark: 0x3A3A3B, grey: 0x9E9D99, marble: 0xEDEBE6, black: 0x1E1E1F, beige: 0xCDBFAA };
function topGeo(k, W, D, t) {
  if (k === 'round' || k === 'oval') { const c = new THREE.CylinderGeometry(0.5, 0.5, t, 56); c.scale(W, 1, D); return c; }
  const r = k === 'tub' ? Math.min(W, D) * 0.42 : k === 'soft' ? Math.min(W, D) * 0.18 : k === 'pill' ? Math.min(W, D) / 2 - 0.01 : 0.02, s = new THREE.Shape(), w = W / 2, d = D / 2;
  s.moveTo(-w + r, -d); s.lineTo(w - r, -d); s.quadraticCurveTo(w, -d, w, -d + r); s.lineTo(w, d - r); s.quadraticCurveTo(w, d, w - r, d); s.lineTo(-w + r, d); s.quadraticCurveTo(-w, d, -w, d - r); s.lineTo(-w, -d + r); s.quadraticCurveTo(-w, -d, -w + r, -d);
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 16 }); g.rotateX(Math.PI / 2); g.translate(0, t / 2, 0); return g;
}
function slatTop(g, W, D, y, t, m, along) { const n = Math.max(3, Math.round((along ? D : W) / 0.32)), gap = 0.03, s = ((along ? D : W) - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) { const c = -(along ? D : W) / 2 + s / 2 + i * (s + gap); if (along) bx(g, W, t, s, 0, y + t / 2, c, m); else bx(g, s, t, D, c, y + t / 2, 0, m); } }
function table(sp, pick) {
  const g = new THREE.Group(), W = sp.W, D = sp.D, H = sp.H, fm = pick.frame, t = sp.tt || (sp.ct ? 0.12 : 0.1), yT = H - t, tk = mt('teakfix', { color: FRAME.teak, roughness: 0.6 });
  const tm = sp.tm === 'teak' ? tk : sp.tm === 'frame' ? fm : sp.tm === 'weave' ? weave(sp.wv || 'wicker', sp.wc || WC.natural, 0.5) : mt('st' + sp.tm, { color: STONE[sp.tm] || STONE.light, roughness: sp.tm === 'marble' || sp.tm === 'white' ? 0.35 : 0.55 });
  if (sp.tm === 'slat' || sp.tm === 'slatf') slatTop(g, W, D, yT, t, sp.tm === 'slatf' ? fm : tk, sp.along);
  else if (sp.tm === 'strap') { bx(g, W, t * 0.6, D, 0, yT + t * 0.3, 0, weave('strap', 0x6B3D24, 0.7)); }
  else { const o = new THREE.Mesh(topGeo(sp.top || 'sq', W, D, t), tm); o.position.y = yT; o.castShadow = o.receiveShadow = true; g.add(o); if (sp.edge) { const e = new THREE.Mesh(topGeo(sp.top, W + 0.12, D + 0.12, t * 0.8), sp.edge === 'w' ? tk : sp.edge === 'r' ? weave('vdense', sp.wc || WC.beige, 0.3) : fm); e.position.y = yT - 0.03; g.add(e); } }
  const b = sp.base || '4m', lr = b === '4w' || b === 'block' ? (b === 'block' ? 0.2 : 0.09) : 0.05, ix = W / 2 - (sp.inset || 0.15), iz = D / 2 - (sp.inset || 0.15), wood = b === '4w' || b === 'block' || b === 'xw' || b === '4ws';
  const lm = wood ? (pick.wood ? fm : tk) : fm, C = sp.top === 'round' || sp.top === 'oval' ? [[-ix * 0.72, -iz * 0.72], [ix * 0.72, -iz * 0.72], [-ix * 0.72, iz * 0.72], [ix * 0.72, iz * 0.72]] : [[-ix, -iz], [ix, -iz], [-ix, iz], [ix, iz]];
  if (b === '4m' || b === '4w' || b === 'block' || b === '4ms' || b === '4ws') { const sp2 = b === '4ms' || b === '4ws' ? 0.25 : 0; C.forEach(([x, z]) => rod(g, [x * (1 + sp2), 0, z * (1 + sp2)], [x, yT, z], lr * (sp.thick || 1), lm, b !== '4ms'));
    if (!sp.ct && b !== 'block' && sp.apron !== 0) { bx(g, W - 0.3, 0.12, 0.05, 0, yT - 0.06, -iz, lm); bx(g, W - 0.3, 0.12, 0.05, 0, yT - 0.06, iz, lm); }
    if (sp.shelf) slatTop(g, W - 0.3, D - 0.3, 0.35, 0.06, tk, false); }
  else if (b === '3l') { for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3 + Math.PI / 2, r = Math.min(W, D) * 0.3; rod(g, [Math.cos(a) * r * 1.35, 0, Math.sin(a) * r * 1.35], [Math.cos(a) * r * 0.8, yT, Math.sin(a) * r * 0.8], 0.045, fm); } }
  else if (b === 'spider') { const r = Math.min(W, D) * 0.42; for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3 + Math.PI / 2, x = Math.cos(a) * r * W / Math.min(W, D), z = Math.sin(a) * r * D / Math.min(W, D); rod(g, [x, 0, z], [x * 0.95, yT, z * 0.95], 0.035, fm); rod(g, [x * 0.9, yT * 0.45, z * 0.9], [0, yT * 0.25, 0], 0.025, fm); } }
  else if (b === 'ped') { cy(g, 0.12, 0.12, yT, 0, yT / 2, 0, fm); cy(g, Math.min(W, D) * 0.33, Math.min(W, D) * 0.35, 0.06, 0, 0.03, 0, fm, 40); }
  else if (b === 'oped') { const o = new THREE.Mesh(topGeo('pill', W * 0.72, D * 0.55, yT), fm); o.position.y = yT / 2; o.castShadow = true; g.add(o); }
  else if (b === 'xstar') { cy(g, 0.1, 0.1, yT * 0.9, 0, yT * 0.55, 0, fm); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, r = Math.min(W, D) * 0.45; rod(g, [Math.cos(a) * r, 0.05, Math.sin(a) * r], [0, yT * 0.18, 0], 0.05, fm); } }
  else if (b === 'xslab') { [0, Math.PI / 2].forEach(a => { const s = new THREE.Shape(), L = Math.min(W, D) * 0.8, h = yT, hw = 0.12; s.moveTo(-L / 2, 0); s.lineTo(-L / 2, h); s.lineTo(L / 2, h); s.lineTo(L / 2, 0); s.lineTo(L / 2 - 0.35, 0); s.absarc(0, 0, L / 2 - 0.35, 0, Math.PI, false); s.lineTo(-L / 2, 0);
      const geo = new THREE.ExtrudeGeometry(s, { depth: hw, bevelEnabled: false, curveSegments: 20 }); geo.translate(0, 0, -hw / 2); const o = new THREE.Mesh(geo, fm); o.rotation.y = a; o.castShadow = true; g.add(o); }); }
  else if (b === 'xw') { const r = Math.min(W, D) * 0.48; [0, Math.PI / 2].forEach(a => { rod(g, [Math.cos(a) * r, 0, Math.sin(a) * r], [-Math.cos(a) * r * 0.25, yT, -Math.sin(a) * r * 0.25], 0.08, lm, true); rod(g, [-Math.cos(a) * r, 0, -Math.sin(a) * r], [Math.cos(a) * r * 0.25, yT, Math.sin(a) * r * 0.25], 0.08, lm, true); }); }
  else if (b === 'cone') { const o = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(W, D) * 0.2, Math.min(W, D) * 0.36, yT, 32, 1, true), weave('wicker', sp.wc || WC.grey, 0.4)); o.position.y = yT / 2; o.castShadow = true; g.add(o); }
  else if (b === 'drum' || b === 'pod') { const r = Math.min(W, D) / 2 - 0.05, o = new THREE.Mesh(b === 'pod' ? new THREE.SphereGeometry(r, 40, 20) : new THREE.CylinderGeometry(r, r * 0.97, yT - 0.15, 48), weave(sp.wv || 'scale', sp.wc || WC.charcoal, b === 'pod' ? 0.45 : 0.9));
    if (b === 'pod') { o.scale.set(1, (yT - 0.1) / (2 * r), 1); o.position.y = yT / 2 + 0.02; } else o.position.y = (yT - 0.15) / 2 + 0.15; o.castShadow = true; g.add(o); if (b === 'drum') C.forEach(([x, z]) => cy(g, 0.04, 0.04, 0.15, x * 0.6, 0.075, z * 0.6, fm)); }
  else if (b === 'wf') { const m = weave('basket', sp.wc || WC['off-white'], 0.5); bx(g, 0.12, yT, D, -W / 2 + 0.06, yT / 2, 0, m); bx(g, 0.12, yT, D, W / 2 - 0.06, yT / 2, 0, m); }
  else if (b === 'box') { const m = weave(sp.wv || 'wicker', sp.wc || WC.natural, 0.5), h = yT - 0.25; [[W, 0.06, 0, D / 2 - 0.03], [W, 0.06, 0, -D / 2 + 0.03]].forEach(([a, c, x, z]) => bx(g, a, h, c, x, 0.25 + h / 2, z, m)); [[-1], [1]].forEach(([s]) => bx(g, 0.06, h, D, s * (W / 2 - 0.03), 0.25 + h / 2, 0, m));
    bx(g, W - 0.1, 0.05, D - 0.1, 0, 0.27, 0, m); C.forEach(([x, z]) => bx(g, 0.12, 0.25, 0.12, x, 0.125, z, fm)); }
  else if (b === 'hair') { C.forEach(([x, z]) => { rod(g, [x - 0.15, yT, z], [x, 0.02, z], 0.025, fm); rod(g, [x + 0.15, yT, z], [x, 0.02, z], 0.025, fm); }); }
  else if (b === 'xsled' || b === 'loop') { if (b === 'loop') [-ix, ix].forEach(x => { const P = [[x, yT, -iz], [x, 0.03, -iz], [x, 0.03, iz], [x, yT, iz]]; for (let i = 0; i < 3; i++) rod(g, P[i], P[i + 1], 0.035, fm); });
    else { [[-ix, -iz, ix, iz], [ix, -iz, -ix, iz]].forEach(([a, c2, d2, e]) => { rod(g, [a, 0.03, c2], [d2 * 0.2, yT, e * 0.2], 0.03, fm); rod(g, [d2, 0.03, e], [a * 0.2, yT, c2 * 0.2], 0.03, fm); }); [-ix, ix].forEach(x => rod(g, [x, 0.03, -iz], [x, 0.03, iz], 0.03, fm)); } }
  if (sp.cushTop) { cush(g, W - 0.15, 0.4, D - 0.15, 0, H + 0.12, 0, pick.fab); }
  return g;
}

// ---------- every design (photo-read): t ch | s1 s2 s3 | dt | ct ----------
const R = {
  // dining chairs: sh, hb / ha (ft from the floor), weave, legs
  'WPC-2502-C': { sh: 'tub', wv: 'lattice', hb: 2.35, ha: 2.3, bc: 1, bch: 1.05 },
  'WPC-2503-C': { sh: 'tub', wv: 'diamond', hb: 2.75, ha: 2.25, T: 0.05, pil: 0 },
  'WPC-2504-C': { sh: 'tub', wv: 'nest', hb: 2.6, ha: 2.25, leg: 'ringm', bc: 1, bch: 1.1 },
  'WPC-2505-C': { sh: 'tub', wv: 'fan', hb: 2.75, ha: 2.25 },
  'WPC-2506-C': { sh: 'back', wv: 'lattice', hb: 2.8, bow: 0.05, tile: 0.7 },
  'WPC-2507-C': { sh: 'back', wv: 'basket', hb: 2.8, bow: 0.12, cush: 0, tile: 0.45 },
  'WPC-2508-C': { sh: 'u', wv: 'chevron', hb: 2.8, ha: 2.15, leg: 'w', str: 1, r: 0.35 },
  'WPC-2510-C': { sh: 'tub', wv: 'vert', hb: 2.85, ha: 2.6, leg: 'skirt', bc: 1, bch: 1.1, deck: 't' },
  'WPC-2511-C': { sh: 'tub', wv: 'cane', hb: 2.5, ha: 2.3, tile: 0.4 },
  'WPC-2512-C': { sh: 'back', wv: 'basket', hb: 2.85, bow: 0.3, cush: 0, tile: 0.4 },
  'WPC-2513-C': { sh: 'tub', wv: 'diamond', hb: 2.6, ha: 2.4, deck: 't' },
  'WPC-2514-C': { sh: 'u', wv: 'vert', hb: 2.65, ha: 2.25, leg: 'w', bc: 1, bch: 1.1, r: 0.5 },
  'WPC-2515-C': { sh: 'tub', wv: 'floral', hb: 2.6, ha: 1.95, T: 0.06, deep: 0.5 },
  'WPC-2516-C': { sh: 'tub', wv: 'diamond', hb: 2.55, ha: 2.25, bc: 1, bch: 0.95 },
  'WPC-2517-C': { acc: 0xE2DCCF, sh: 'tub', wv: 'vert', hb: 2.79, ha: 2.0, bc: 1, bch: 1.05, pil: 1 },
  'WPC-2518-C': { sh: 'tub', wv: 'diamond', hb: 2.55, ha: 2.45, T: 0.12, leg: 'ring' },
  'WPC-2519-C': { sh: 'tub', wv: 'vdense', hb: 2.6, ha: 2.3, leg: 'w', str: 1, cush: 0, deep: 0.5 },
  'WPC-2520-C': { sh: 'tub', wv: 'vdense', hb: 2.75, ha: 2.15, leg: 'w', cush: 0, deep: 0.45, pw: 0.8 },
  'WPC-2521-C': { sh: 'tub', wv: 'vert', hb: 2.9, ha: 2.7, leg: 'skirt', bc: 1, bch: 1.15, tile: 0.5, deck: 't' },
  // dining tables: top shape, top material, base
  'WPC-2502-T': { top: 'sq', tm: 'light', base: '4m' },
  'WPC-2503-T': { top: 'round', tm: 'white', base: 'ped' },
  'WPC-2504-T': { top: 'soft', tm: 'dark', base: 'xslab' },
  'WPC-2506-T': { top: 'oval', tm: 'marble', base: '4ms', inset: 0.3, apron: 0 },
  'WPC-2507-T': { top: 'sq', tm: 'light', base: 'xstar' },
  'WPC-2508-T': { top: 'round', tm: 'teak', base: 'xw' },
  'WPC-2509-T': { top: 'sq', tm: 'white', base: '4m', thick: 1.6 },
  'WPC-2510-T': { top: 'sq', tm: 'slat', base: '4w' },
  'WPC-2511-T': { top: 'round', tm: 'weave', wv: 'cane', wc: WC.charcoal, base: '4m', edge: 'r', wc2: 1 },
  'WPC-2515-T': { top: 'round', tm: 'grey', base: 'cone', wc: WC.grey },
  'WPC-2516-T': { top: 'round', tm: 'dark', base: '3l' },
  'WPC-2518-T': { top: 'pill', tm: 'frame', base: 'oped' },
  'WPC-2519-T': { top: 'sq', tm: 'slat', base: '4m', along: 1 },
  'WPC-2521-T': { top: 'sq', tm: 'teak', tt: 0.22, base: 'block', apron: 0 },
  // sofas / lounge chairs
  'WPS-2501': { sh: 'tub', wv: 'fan', hb: 2.62, ha: 1.95, deep: 0.55, yS: 0.75 },
  'WPS-2502': { sh: 'u', wv: 'trellis', hb: 2.05, ha: 2.05, r: 0.55 },
  'WPS-2503-1S': { sh: 'box', wv: 'diag', hb: 2.3, ha: 2.3, leg: 'skirt', T: 0.12, wc: 'brown' },
  'WPS-2503': { sh: 'box', wv: 'diag', hb: 2.1, ha: 2.1, leg: 'skirt', armIn: 0.05 },
  'WPS-2504-1S': { sh: 'tub', wv: 'tri', hb: 2.62, ha: 2.15, leg: 'ws', yS: 1.05 },
  'WPS-2504': { sh: 'u', wv: 'tri', hb: 2.3, ha: 2.15, leg: 'plinth', r: 0.5, pil: 2 },
  'WPS-2504-3S': { sh: 'u', wv: 'diamond', hb: 2.3, ha: 2.15, leg: 'plinth', r: 0.5, T: 0.05 },
  'WPS-2505': { sh: 'tub', wv: 'vdense', hb: 2.3, ha: 2.1, leg: 'disc', T: 0.08 },
  'WPS-2506': { sh: 'box', wv: 'grid', hb: 2.1, ha: 2.1, T: 0.22, leg: 'm', rimSame: false, front: 1 },
  'WPS-2507': { sh: 'box', wv: 'vdense', hb: 1.75, ha: 2.0, leg: 'm', rimR: 0.04 },
  'WPS-2508': { sh: 'u', wv: 'serp', hb: 2.2, ha: 2.0, leg: 'ws', r: 0.6, yS: 1.05 },
  'WPS-2509': { acc: 0xB0603E, sh: 'tub', wv: 'diamond', hb: 2.62, ha: 2.25, leg: 'ws', T: 0.06, deep: 0.55, yS: 1.0, bc: 1, pil: 1 },
  'WPS-2509-2S': { sh: 'tub', wv: 'diamond', hb: 2.3, ha: 2.05, leg: 'ws', T: 0.06, deep: 0.4, yS: 1.0, bc: 0 },
  'WPS-2510': { sh: 'box', wv: 'rattan', hb: 2.3, ha: 2.15, T: 0.42, leg: 'skirt', tile: 0.5, front: 1 },
  'WPS-2511': { acc: 0xC0663F, sh: 'box', wv: 'net', hb: 2.62, ha: 2.0, leg: 'm', pil: 1 },
  'WPS-2512': { sh: 'tub', wv: 'scale', hb: 2.55, ha: 2.0, T: 0.4, leg: 'skirt', tile: 1.0, deep: 0.5, pil: 1 },
  'WPS-2513': { sh: 'tub', wv: 'vdense', hb: 2.3, ha: 2.15, T: 0.35, leg: 'skirt', deep: 0.42, pil: 1 },
  'WPS-2514': { sh: 'box', wv: 'marled', hb: 2.4, ha: 2.05, T: 0.08, leg: 'm', tile: 0.6, front: 1 },
  'WPS-2515': { sh: 'box', wv: 'vdense', hb: 2.0, ha: 2.0, leg: 'm', rimR: 0.05 },
  'WPS-2516': { sh: 'box', wv: 'vdense', hb: 2.1, ha: 2.1, leg: 'w', rim: 'n' },
  'WPS-2517': { sh: 'u', wv: 'petal', hb: 2.3, ha: 2.15, leg: 'ws', r: 0.5, T: 0.05, yS: 1.05, pil: 0 },
  'WPS-2517-3S': { sh: 'u', wv: 'pleat', hb: 2.1, ha: 2.05, leg: 'ws', r: 0.5, T: 0.05, yS: 1.05 },
  'WPS-2518': { sh: 'u', wv: 'pleat', hb: 2.4, ha: 2.15, leg: 'plinth', r: 0.4, T: 0.05, pil: 0 },
  'WPS-2519-1S': { sh: 'u', wv: 'slat', hb: 2.4, ha: 2.15, leg: 'sled', r: 0.35, deck: 't', tile: 0.6 },
  'WPS-2519-3S': { sh: 'u', wv: 'coil', hb: 2.2, ha: 2.05, leg: 'sled', r: 0.35, T: 0.05 },
  'WPS-2520': { sh: 'box', wv: 'vdense', hb: 2.4, ha: 2.0, T: 0.3, leg: 'm', rimSame: false },
  'WPS-2521': { sh: 'tub', wv: 'diamond', hb: 2.62, ha: 2.0, leg: 'm', bc: 1, deep: 0.55 },
  'WPS-2522': { sh: 'tub', wv: 'lattice', hb: 2.45, ha: 2.15, leg: 'xsled', deck: 't', deep: 0.5, tile: 0.4 },
  'WPS-2522-3S': { sh: 'u', wv: 'lattice', hb: 2.3, ha: 2.1, leg: 'xsled', deck: 't', r: 0.6, tile: 0.4, pil: 3 },
  'WPS-2523': { sh: 'box', wv: 'vdense', hb: 2.3, ha: 2.15, leg: 'loop', rimR: 0.05 },
  'WPS-2523-3S': { sh: 'box', wv: 'vdense', hb: 2.0, ha: 2.0, leg: 'loop', rimR: 0.05, pil: 3 },
  // coffee tables
  'WPS-2501-T': { top: 'round', tm: 'dark', base: 'spider' },
  'WPS-2504-T': { top: 'oval', tm: 'black', base: '4ws' },
  'WPS-2505-T': { top: 'pill', tm: 'slat', base: 'oped' },
  'WPS-2506-T': { top: 'sq', tm: 'weave', wv: 'wicker', base: 'box' },
  'WPS-2509-T': { top: 'sq', tm: 'slat', base: '4w', shelf: 1 },
  'WPS-2510-T': { top: 'sq', tm: 'weave', wv: 'basket', wc: WC['off-white'], base: 'wf' },
  'WPS-2511-T': { top: 'sq', tm: 'white', base: '4m', tt: 0.06 },
  'WPS-2512-T': { top: 'round', tm: 'grey', base: 'drum', wv: 'scale', wc: WC.charcoal },
  'WPS-2513-T': { top: 'round', tm: 'white', base: 'pod', wv: 'vdense', wc: WC.beige },
  'WPS-2514-T': { top: 'sq', tm: 'weave', wv: 'marled', wc: WC.grey, base: 'box', cushTop: 1 },
  'WPS-2515-T': { top: 'sq', tm: 'slatf', base: '4m' },
  'WPS-2518-T': { top: 'sq', tm: 'slat', base: 'block', tt: 0.12 },
  'WPS-2519-T': { top: 'sq', tm: 'white', base: 'loop', edge: 'r', wc: WC.natural },
  'WPS-2521-T': { top: 'sq', tm: 'strap', base: 'hair' },
  'WPS-2522-T': { top: 'pill', tm: 'grey', base: 'xsled', edge: 'w' },
};
export const FURN_CODES = Object.keys(R);
function recipe(sku) { const s = String(sku || '').replace(/^S7-/, ''), m = /^(WP[CS]-\d+)(?:-(\w+))?$/.exec(s); if (!m) return null; return R[s] || R[m[1]] || null; }
function sizeOf(label) { const s = String(label || ''), d = /dia\s*([\d.]+)\s*x\s*h\s*([\d.]+)/i.exec(s); if (d) return { W: CM(+d[1]), D: CM(+d[1]), H: CM(+d[2]), round: 1 };
  const n = s.match(/[\d.]+/g) || []; return n.length >= 3 ? { a: CM(+n[0]), b: CM(+n[1]), H: CM(+n[2]) } : null; }
function colWord(t) { t = String(t || '').toLowerCase(); for (const k of ['dark green', 'dark brown', 'off-white', 'charcoal', 'black', 'green', 'beige', 'grey', 'taupe', 'natural', 'honey', 'brown', 'blue', 'white']) if (t.indexOf(k) >= 0) return k; return 'beige'; }
export function furnSpec(sku, m, o) {
  m = m || {}; o = o || {}; const s = String(sku || ''), tail = (/-(\w+)$/.exec(s) || [])[1] || '', r = Object.assign({}, recipe(s) || {}), seatK = /^[123]S$/.test(tail) ? 's' + tail[0] : tail === 'C' ? 'ch' : tail === 'T' ? (/WPS/.test(s) ? 'ct' : 'dt') : 'ch';
  const sz = sizeOf(((m.sizes || [])[0] || {}).label) || (seatK === 'ch' ? { a: 2, b: 2, H: 2.8 } : { a: 3, b: 3, H: 2.5 });
  const spec = (m.specs || []).reduce((a, x) => (a[x.label] = x.value, a), {});
  if (seatK === 'dt' || seatK === 'ct') { r.t = seatK; r.ct = seatK === 'ct'; if (sz.round) { r.W = sz.W; r.D = sz.D; if (!r.top || r.top === 'sq') r.top = 'round'; } else { r.W = Math.max(sz.a, sz.b); r.D = Math.min(sz.a, sz.b); } r.H = sz.H; }
  else { r.t = seatK; r.n = seatK === 'ch' ? 1 : +seatK[1]; r.W = sz.a; r.D = sz.b; r.H = sz.H; r.sh = r.sh || 'u'; r.wv = r.wv || 'vdense'; }
  const wcol = typeof r.wc === 'number' ? r.wc : WC[r.wc || colWord(spec.Weave)] || WC.beige; r.wc = wcol; r.tile = r.tile || 0.55;
  const mat = String(o.material || ((m.materials || [])[0] || {}).name || ''), wood = /teak|acacia|wood/i.test(mat), col = String(o.colour || '').toLowerCase();
  const fc = wood ? (/acacia/i.test(mat) ? FRAME.acacia : FRAME.teak) : FRAME[col] || FRAME[String((((m.materials || [])[0] || {}).colours || [])[0] && (((m.materials || [])[0].colours[0].name) || m.materials[0].colours[0]) || '').toLowerCase()] || FRAME.charcoal;
  const fab = String(((o.groups || {})['Cushion fabric']) || '').toLowerCase(), fk = Object.keys(FAB).filter(k => fab.indexOf(k) >= 0).sort((a, b) => b.length - a.length)[0];
  return { sku: s, r, wood, frameC: fc, alu: /alumin/i.test(mat), fabC: FAB[fk || 'beige'] };
}
export function furnModel(sp) {
  const r = sp.r, pick = { wood: sp.wood, frame: mt('fr' + sp.frameC + (sp.wood ? 'w' : 'm'), sp.wood ? { color: sp.frameC, roughness: 0.62 } : { color: sp.frameC, roughness: 0.42, metalness: sp.alu ? 0.25 : 0.35 }), fab: mt('fab' + sp.fabC, { color: sp.fabC, roughness: 0.95 }), acc: mt('acc' + (r.acc || 0xE9E5DC), { color: r.acc || 0xE9E5DC, roughness: 0.95 }) };
  const g = /t$/.test(r.t) ? table(r, pick) : seat(r, pick); setDepth(g); return { g, L: r.W, D: r.D, H: r.H };
}
// the terrace corner: tiles, a 3 ft parapet behind and on the left, a person beside it
export function furnStudio(sp) {
  const S = new THREE.Group(), B = furnModel(sp); S.add(B.g); const PT = 0.75, gb = /t$/.test(sp.r.t) ? 2.2 : 1.3, x0 = -B.L / 2 - 2.6, z0 = -B.D / 2 - gb, L1 = Math.max(B.L + 9, 13), L2 = Math.max(B.D + 8, 11);
  sWall(S, x0 - PT, z0 - PT / 2, x0 + L1, z0 - PT / 2, 3, PT); sWall(S, x0 - PT / 2, z0, x0 - PT / 2, z0 + L2, 3, PT); studioFloor(S, x0 - PT, z0 - PT, L1 + PT, L2 + PT);
  S.children.forEach(c => { if (c.geometry && c.geometry.type === 'CircleGeometry') c.visible = false; });
  person(S, x0 + 1.2, z0 + 0.9, 0.5);
  return { g: S, L: B.L, D: B.D, H: B.H, span: Math.max(B.L + 7, 12) };
}
