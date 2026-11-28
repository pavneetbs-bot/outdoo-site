// outrr design studio (309, owner: "baki categories ke 3D models"): graffiti murals (MTO-GF-*), vertical gardens (MTO-VG-*)
// and decks (MTO-DK-*) drawn live at the customer's size and picks.
//   Graffiti — the design's own artwork (cut from its photo) painted on a terrace wall W × H.
//   Vertical gardens — HPL / wooden troughs or PVC pots on a wall or on a free-standing frame, planted (medium / big plants or
//   none), drip line + drain tray when picked.
//   Decks — WPC / IPE / thermo pine boards or interlocking tiles, L × W, at the picked height, straight / picture-frame /
//   diagonal / herringbone, with LED edge, a step and fascia when picked.  Units: feet, y up; the viewer is at +z.
import * as THREE from './vendor/three/three.module.min.js';
import { studioFloor, wall as sWall, person } from './studio3d.js?v=9';
import { plantModel } from './plants3d.js?v=4';

const M = {}, T = {};
const mt = (k, o) => M[k] || (M[k] = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.7 }, o)));
function bx(g, w, h, d, x, y, z, m) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b; }
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rnd(s) { let x = s || 1; return () => (x = (x * 16807) % 2147483647) / 2147483647; }

// ---------------- graffiti: where the mural sits in each design's photo (fractions x0, y0, x1, y1)
const GF_BOX = { AS: [0.07, 0.17, 0.95, 0.72], DH: [0.13, 0.14, 0.92, 0.74], FI: [0.17, 0.08, 0.83, 0.79], IG: [0.13, 0.07, 0.97, 0.8], IW: [0.22, 0.12, 0.87, 0.72],
  LH: [0.1, 0.18, 0.89, 0.76], MJ: [0.12, 0.15, 0.88, 0.81], MS: [0.08, 0.13, 0.92, 0.77], PS: [0.13, 0.14, 0.87, 0.81], RB: [0.27, 0.14, 0.83, 0.67] };
export function graffitiStudio(sp, onReady) {
  const S = new THREE.Group(), W = sp.W, H = sp.H, wz = -0.375;
  sWall(S, -W / 2 - 1, wz - 0.375, W / 2 + 1, wz - 0.375, H + 0.5, 0.75);
  const mm = new THREE.MeshStandardMaterial({ color: 0xE9E5DE, roughness: 0.92 }), p = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mm); p.position.set(0, H / 2 + 0.1, wz + 0.01); p.receiveShadow = true; S.add(p);
  const key = sp.code + '|' + sp.img;
  const apply = t => { mm.map = t; mm.color.set(0xFFFFFF); mm.needsUpdate = true; onReady && onReady(); };
  if (T[key]) apply(T[key]); else if (sp.img) { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => { const b = GF_BOX[sp.code] || [0, 0, 1, 1], sx = b[0] * im.width, sy = b[1] * im.height, sw = (b[2] - b[0]) * im.width, sh = (b[3] - b[1]) * im.height;
      const c = cv(1024, Math.round(1024 * sh / sw)); c.getContext('2d').drawImage(im, sx, sy, sw, sh, 0, 0, c.width, c.height); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; T[key] = t; apply(t); }; im.src = sp.img; }
  studioFloor(S, -W / 2 - 4, wz - 0.05, W + 8, 14);
  person(S, W / 2 + 2, 2.5, -0.4);
  return { g: S, L: W, D: 1, H, span: Math.max(W * 1.1, H * 1.6, 10) };
}
export function graffitiSpec(sku, m, o, img) { return { code: String(sku || '').replace(/^MTO-GF-/, ''), W: Math.max(4, +o.w || 12), H: Math.max(4, +o.h || 9), img }; }

// ---------------- vertical gardens
function leafTex(seed, dense) {   // a band of foliage, alpha-edged, tileable sideways
  const k = 'leaf' + seed + dense; if (T[k]) return T[k]; const W = 512, H = 256, c = cv(W, H), x = c.getContext('2d'), r = rnd(seed * 97 + 13), greens = ['#1F3D18', '#29491F', '#335A26', '#3E6A2D', '#4A7834', '#5A8A3A', '#18301A', '#7A5E24', '#7E2F45'];
  for (let i = 0; i < (dense ? 2600 : 1500); i++) { const px = r() * W, py = H * (0.15 + 0.85 * Math.pow(r(), 0.7)), s = 7 + r() * 16, a = r() * Math.PI;
    x.fillStyle = greens[Math.floor(r() * (r() < 0.05 ? 9 : 7))]; x.beginPath(); x.ellipse(px, py, s, s * 0.42, a, 0, Math.PI * 2); x.fill(); x.fillStyle = 'rgba(255,255,255,.05)'; x.beginPath(); x.ellipse(px, py, s * 0.6, s * 0.1, a, 0, Math.PI * 2); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return (T[k] = t); }
const VGC = [[/walnut/i, 0x5E3C26], [/natural/i, 0xC08A4E], [/teak wood|teak/i, 0x8A5A33], [/concrete|grey/i, 0x9A9A96], [/black/i, 0x262626], [/terracotta/i, 0xA9573A]];
export function vgSpec(sku, m, o) {
  const c = String(sku || '').replace(/^MTO-VG-/, ''), gp = o.groups || {}, gv = re => { const k = Object.keys(gp).find(x => re.test(x)); if (k) return gp[k]; const gr = (m.groups || []).find(x => re.test(x.name)); return gr && gr.options && gr.options[0] ? gr.options[0].name : ''; };
  const mats = m.materials || [], mat = mats.find(x => x.name === o.material) || mats[0] || {}, col = o.colour || ((mat.colours || [])[0] || {}).name || mat.name || '';
  let hex = /^PVC/.test(c) ? 0x2B2B2B : 0x8A5A33; for (const [re, h] of VGC) if (re.test(col)) { hex = h; break; }
  const ps = gv(/plant size/i), dr = gv(/drip/i), dn = gv(/drain/i);
  return { code: c, kind: /^PVC/.test(c) ? 'pvc' : /^WOOD/.test(c) ? 'wood' : 'hpl', stand: /STAND/.test(c), W: Math.max(2, +o.w || 8), H: Math.max(2, +o.h || 8), hex,
    plants: /^no plants/i.test(ps) ? 0 : /big/i.test(ps) ? 2 : 1, drip: !/^no drip/i.test(dr || 'no'), drain: /tray|channel/i.test(dn || '') };
}
export function vgStudio(sp) {
  const S = new THREE.Group(), W = sp.W, H = sp.H, stand = sp.stand, y0 = stand ? 0.5 : 0.6, zf = stand ? 0 : -0.3, frm = mt('vgf', { color: 0x262626, roughness: 0.5, metalness: 0.3 });
  if (!stand) sWall(S, -W / 2 - 3, -1.05, W / 2 + 3, -1.05, Math.max(9, H + 1.5), 0.75);
  const g = new THREE.Group(); g.position.set(0, y0, zf); S.add(g);
  if (stand) { [-1, 1].forEach(s => { bx(S, 0.25, H + y0 + 0.3, 0.25, s * (W / 2 + 0.15), (H + y0 + 0.3) / 2, zf, frm); bx(S, 0.4, 0.08, 2.4, s * (W / 2 + 0.15), 0.04, zf, frm); }); bx(g, W + 0.55, 0.15, 0.15, 0, H + 0.2, 0, frm); }
  const tm = mt('vgt' + sp.hex + sp.kind, sp.kind === 'wood' ? { color: sp.hex, roughness: 0.6 } : sp.kind === 'hpl' ? { color: sp.hex, roughness: 0.5 } : { color: 0x2B2B2B, roughness: 0.9 });
  const rows = Math.max(2, Math.round(H / (sp.kind === 'pvc' ? 0.85 : 1.15))), rh = H / rows;
  if (sp.kind === 'pvc') bx(g, W, H, 0.08, 0, H / 2, -0.25, tm);
  for (let i = 0; i < rows; i++) { const y = i * rh;
    if (sp.kind !== 'pvc') { bx(g, W, rh * 0.42, 0.55, 0, y + rh * 0.21, 0, tm); bx(g, W, 0.06, 0.6, 0, y + 0.03, -0.02, tm); if (sp.kind === 'wood') bx(g, W, 0.03, 0.02, 0, y + rh * 0.21, 0.28, mt('vgg', { color: 0x2A1C10 })); }
    else for (let x = -W / 2 + 0.33; x < W / 2; x += 0.66) bx(g, 0.6, rh * 0.5, 0.35, x, y + rh * 0.3, -0.05, tm);
    if (sp.plants) { const t = leafTex(i + 1, sp.plants > 1).clone(); t.needsUpdate = true; t.repeat.set(W / 3, 1); t.offset.x = i * 0.37;
      const fh = rh * (sp.plants > 1 ? 1.25 : 0.95) * (sp.kind === 'pvc' ? 1.25 : 1), pm = new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.45, transparent: false, roughness: 1, side: THREE.DoubleSide });
      [0.32, 0.12].forEach((z, j) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.05, fh), pm); p.position.set(0, y + rh * 0.42 + fh / 2 - fh * 0.32 - j * 0.15, z); p.castShadow = true; g.add(p); });
      if (sp.plants > 1) for (let x = -W / 2 + 0.6; x < W / 2 - 0.3; x += 1.4) { try { const p = plantModel(THREE, ['SYNGONIUM', 'MONEYPLANT', 'CHLOROPHYTUM', 'ZZ'][(i + Math.round(x)) & 3], 1, { seed: i * 7 + Math.round(x * 3) }); p.position.set(x, y + rh * 0.4, 0.15); p.scale.setScalar(0.55); g.add(p); } catch (e) {} } } }
  if (sp.drip) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, W, 8), mt('drip', { color: 0x111111 })); p.rotation.z = Math.PI / 2; p.position.set(0, H + 0.05, 0.05); g.add(p); }
  if (sp.drain) bx(S, W + 0.3, 0.25, 1, 0, 0.12, zf + 0.1, mt('drain', { color: 0x4A4A48, metalness: 0.5, roughness: 0.4 }));
  studioFloor(S, -W / 2 - 5, -1.4, W + 10, 13);
  person(S, W / 2 + 1.8, 2.2, -0.5);
  return { g: S, L: W, D: 1, H: H + y0, span: Math.max(W * 1.15, (H + y0) * 1.6, 10) };
}

// ---------------- decks
const DKC = [[/walnut/i, '#5E3C26'], [/coffee/i, '#4A3326'], [/ash grey|grey-wash/i, '#8C8781'], [/grey/i, '#7F7B76'], [/natural ipe/i, '#6E4228'], [/honey/i, '#B98A55'], [/teak/i, '#8A5A33']];
function deckTex(col, pat, tile, r) {
  const k = 'dk' + col + pat + tile; if (T[k]) return T[k]; const P = 80, Wd = 512, c = cv(Wd, Wd), x = c.getContext('2d'), sh = f => { const n = parseInt(col.slice(1), 16); return `rgb(${(((n >> 16) & 255) * f) | 0},${(((n >> 8) & 255) * f) | 0},${((n & 255) * f) | 0})`; };
  x.fillStyle = '#1B140E'; x.fillRect(0, 0, Wd, Wd); const R = rnd(7), bw = P * 0.48, gap = 3;
  const board = (bx0, by0, w, h) => { x.fillStyle = sh(0.86 + R() * 0.24); x.fillRect(bx0, by0, w, h); x.strokeStyle = 'rgba(40,24,12,.25)'; x.lineWidth = 1; for (let i = 0; i < 3; i++) { x.beginPath(); if (w > h) { const y = by0 + 3 + R() * (h - 6); x.moveTo(bx0, y); x.lineTo(bx0 + w, y + R() * 4 - 2); } else { const xx = bx0 + 3 + R() * (w - 6); x.moveTo(xx, by0); x.lineTo(xx + R() * 4 - 2, by0 + h); } x.stroke(); } };
  if (tile) { const s = P; for (let i = 0; i < Wd / s; i++) for (let j = 0; j < Wd / s; j++) { const v = (i + j) % 2; for (let k2 = 0; k2 < 4; k2++) { if (v) board(i * s + 2 + k2 * s / 4, j * s + 2, s / 4 - 3, s - 4); else board(i * s + 2, j * s + 2 + k2 * s / 4, s - 4, s / 4 - 3); } } }
  else if (pat === 'herring') { const L = P * 2, w = bw; for (let j = -2; j < Wd / w + 2; j++) for (let i = -2; i < Wd / L + 2; i++) { const ox = i * L + (j % 2) * w, oy = j * w; x.save(); x.translate(ox, oy); if ((i + j) % 2) { x.translate(w, 0); x.rotate(Math.PI / 2); } board(0, 0, L - gap, w - gap); x.restore(); } }
  else { for (let y = 0; y < Wd; y += bw) { let xx = -R() * P * 3; while (xx < Wd) { const L = P * (2.5 + R() * 3); board(xx, y, L - gap, bw - gap); xx += L; } } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; T[k] = { t, per: Wd / P }; return T[k];
}
export function deckSpec(sku, m, o) {
  const c = String(sku || '').replace(/^MTO-DK-/, ''), gp = o.groups || {}, gv = re => { const k = Object.keys(gp).find(x => re.test(x)); if (k) return gp[k]; const gr = (m.groups || []).find(x => re.test(x.name)); return gr && gr.options && gr.options[0] ? gr.options[0].name : ''; };
  const mats = m.materials || [], mat = mats.find(x => x.name === o.material) || mats[0] || {}, col = o.colour || ((mat.colours || [])[0] || {}).name || '', ad = (o.addons || []).join(' ');
  let hex = '#8A5A33'; for (const [re, h] of DKC) if (re.test(col)) { hex = h; break; }
  const ht = gv(/height/i), pt = gv(/pattern/i);
  return { code: c, tile: c === 'TILE', L: Math.max(4, +o.l || 12), W: Math.max(3, +o.w || 10), col: hex, h: c === 'TILE' ? 0.08 : /9 to 12/.test(ht) ? 0.9 : /4 to 8/.test(ht) ? 0.5 : 0.22,
    pat: /herring/i.test(pt) ? 'herring' : /diagonal/i.test(pt) ? 'diag' : /frame/i.test(pt) ? 'frame' : 'straight', led: /LED/i.test(ad), step: /step/i.test(ad), fascia: /fascia/i.test(ad) || c !== 'TILE' };
}
export function deckStudio(sp) {
  const S = new THREE.Group(), L = sp.L, W = sp.W, h = sp.h, D = deckTex(sp.col, sp.pat, sp.tile), dark = mt('dkfr', { color: 0x2A2520, roughness: 0.9 });
  const top = (x0, z0, w, d, rot) => { const t = D.t.clone(); t.needsUpdate = true; t.rotation = rot || 0; t.center.set(0.5, 0.5); t.repeat.set(w / D.per, d / D.per);
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.65 }), p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); p.rotation.x = -Math.PI / 2; p.position.set(x0 + w / 2, h + 0.01, z0 + d / 2); p.receiveShadow = true; S.add(p); };
  bx(S, L - 0.1, h - 0.02, W - 0.1, 0, (h - 0.02) / 2, 0, dark);
  if (sp.pat === 'frame') { const b = 0.5; top(-L / 2 + b, -W / 2 + b, L - 2 * b, W - 2 * b); top(-L / 2, -W / 2, L, b, Math.PI / 2); top(-L / 2, W / 2 - b, L, b, Math.PI / 2); top(-L / 2, -W / 2 + b, b, W - 2 * b); top(L / 2 - b, -W / 2 + b, b, W - 2 * b); }
  else top(-L / 2, -W / 2, L, W, sp.pat === 'diag' ? Math.PI / 4 : 0);
  if (sp.fascia && h > 0.15) { const fm = mt('dkf' + sp.col, { color: new THREE.Color(sp.col), roughness: 0.6 }); bx(S, L, h, 0.06, 0, h / 2, W / 2 - 0.03, fm); bx(S, 0.06, h, W, L / 2 - 0.03, h / 2, 0, fm); bx(S, 0.06, h, W, -L / 2 + 0.03, h / 2, 0, fm); }
  if (sp.led) { const s = new THREE.Mesh(new THREE.BoxGeometry(L - 0.2, 0.03, 0.03), mt('dkled', { color: 0xFFD9A0, emissive: 0xFFC27A, emissiveIntensity: 1.5 })); s.position.set(0, Math.max(0.05, h - 0.08), W / 2 + 0.02); S.add(s); }
  if (sp.step && h > 0.3) { const fm = mt('dkf' + sp.col, { color: new THREE.Color(sp.col), roughness: 0.6 }); bx(S, 4, h / 2, 1.1, 0, h / 4, W / 2 + 0.55, fm); }
  if (sp.tile) { bx(S, L + 0.4, 0.03, W + 0.4, 0, 0.015, 0, mt('dkedge', { color: 0x5A5048 })); }
  studioFloor(S, -L / 2 - 6, -W / 2 - 6, L + 12, W + 12);
  sWall(S, -L / 2 - 6, -W / 2 - 1.2, L / 2 + 6, -W / 2 - 1.2, 3, 0.75);
  person(S, L / 2 - 1.5, W / 2 - 1.5, -0.4, h);
  return { g: S, L, D: W, H: h, span: Math.max(L, W) * 1.25 + 6 };
}
