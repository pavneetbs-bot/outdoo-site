// outrr design studio — bar counters (295, owner): ONE bar frame (plinth, counter body, overhanging top) and every
// design's look on it from what the customer picks: the front finish (= the design's material), the top, a raised serving
// ledge (designs that have one), sink / grill cut-outs and fridge bays on the bartender's side, back storage shutters
// (open / HDHMR / HPL / steel), bar stools in front, SS foot rail, LED under the top, a back-bar bottle shelf on the wall.
// L-shaped designs get a return arm. Units: feet, y up; the customer's side faces +z, the bartender's side −z.
import * as THREE from './vendor/three/three.module.min.js';
import { studioFloor, wall as sWall, person } from './studio3d.js?v=7';

const M = {}, T = {};
const mt = (k, o) => M[k] || (M[k] = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.75 }, o)));
function bx(g, w, h, d, x, y, z, m, sh = true) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = sh; b.receiveShadow = true; g.add(b); return b; }
function cy(g, r1, r2, h, x, y, z, m, seg = 18) { const c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m); c.position.set(x, y, z); c.castShadow = c.receiveShadow = true; g.add(c); return c; }
// a canvas texture, cached, repeating every `per` feet
function ctex(k, px, draw) { if (T[k]) return T[k]; const cv = document.createElement('canvas'); cv.width = cv.height = px; draw(cv.getContext('2d'), px); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return (T[k] = t); }
function rnd(s) { let x = s; return () => (x = (x * 16807) % 2147483647) / 2147483647; }

// the front finishes — matched on the design's material name
const FRONTS = [
  [/onyx/i, 'onyx'], [/mosaic.*(emerald|green)|emerald/i, 'mosaicG'], [/smoke/i, 'mosaicS'], [/pearl|penny/i, 'penny'], [/mosaic/i, 'mosaic'],
  [/subway.*black|black.*subway/i, 'subwayB'], [/subway|tile/i, 'subway'], [/fluted.*charcoal/i, 'flutedC'], [/fluted/i, 'fluted'],
  [/louv/i, 'louver'], [/slat/i, 'slats'], [/terrazzo/i, 'terrazzo'], [/ledge stone|stone cladding/i, 'ledge'], [/pu stone|stone look/i, 'pustone'],
  [/mirror/i, 'mirror'], [/designer|inlay|brass/i, 'designer'], [/hpl|wpc|wood/i, 'wood'], [/cement board/i, 'cement'],
  [/paint|microcement|plaster/i, 'paint']];
export function frontKind(name) { for (const [re, k] of FRONTS) if (re.test(name || '')) return k; return 'paint'; }
function frontMat(k) {
  const tile = (key, bg, jc, cw, ch, pal) => ctex(key, 256, (c, n) => { const r = rnd(7); c.fillStyle = jc; c.fillRect(0, 0, n, n); for (let y = 0; y < n; y += ch) for (let x = ((y / ch) % 2 ? cw / 2 : 0) - cw; x < n; x += cw) { c.fillStyle = pal ? pal[Math.floor(r() * pal.length)] : bg; c.fillRect(x + 2, y + 2, cw - 4, ch - 4); } });
  switch (k) {
    case 'onyx': return mt('f_onyx', { map: ctex('onyx', 256, (c, n) => { const g = c.createLinearGradient(0, 0, n, n); g.addColorStop(0, '#F6E2B8'); g.addColorStop(0.5, '#E9C487'); g.addColorStop(1, '#F7E6C4'); c.fillStyle = g; c.fillRect(0, 0, n, n); const r = rnd(3); c.strokeStyle = 'rgba(150,95,40,.35)'; for (let i = 0; i < 18; i++) { c.lineWidth = 1 + r() * 3; c.beginPath(); c.moveTo(0, r() * n); c.bezierCurveTo(n * 0.3, r() * n, n * 0.6, r() * n, n, r() * n); c.stroke(); } }), emissive: 0xE9B870, emissiveIntensity: 0.35, roughness: 0.3 });
    case 'mosaic': case 'mosaicG': case 'mosaicS': { const P = { mosaic: ['#2F6F86', '#3C8DA4', '#E3E7E5', '#1F4F63', '#7FB6C4'], mosaicG: ['#1E5E45', '#2B7A57', '#14432F', '#3E9068', '#0E3324'], mosaicS: ['#3A3D42', '#55585E', '#2A2C30', '#6D7076', '#46494F'] }[k];
      return mt('f_' + k, { map: tile('t_' + k, '#fff', '#D8D4CC', 32, 32, P), roughness: 0.25, metalness: 0.05 }); }
    case 'penny': return mt('f_penny', { map: ctex('penny', 256, (c, n) => { c.fillStyle = '#CFC9BF'; c.fillRect(0, 0, n, n); for (let y = 0; y < n + 20; y += 22) for (let x = (y / 22) % 2 ? 11 : 0; x < n + 20; x += 22) { c.fillStyle = ['#F4F0E8', '#EDE6DA', '#F9F6F0'][(x + y) % 3]; c.beginPath(); c.arc(x, y, 9.5, 0, 7); c.fill(); } }), roughness: 0.2 });
    case 'subway': return mt('f_subway', { map: tile('t_sub', '#EFEDE6', '#B9B4AA', 96, 48, ['#F2F0EA', '#ECE9E1', '#F6F4EF']), roughness: 0.2 });
    case 'subwayB': return mt('f_subwayB', { map: tile('t_subB', '#222', '#B08D57', 96, 48, ['#1E1E1F', '#262628', '#1A1A1B']), roughness: 0.2 });
    case 'fluted': case 'flutedC': { const dk = k === 'flutedC'; return mt('f_' + k, { map: ctex('t_' + k, 256, (c, n) => { for (let x = 0; x < n; x += 32) { const g = c.createLinearGradient(x, 0, x + 32, 0); g.addColorStop(0, dk ? '#262422' : '#6E4A2E'); g.addColorStop(0.5, dk ? '#4A4743' : '#A87A52'); g.addColorStop(1, dk ? '#262422' : '#6E4A2E'); c.fillStyle = g; c.fillRect(x, 0, 32, n); } }), roughness: 0.55 }); }
    case 'slats': case 'louver': return mt('f_' + k, { map: ctex('t_' + k, 256, (c, n) => { c.fillStyle = '#2E2B28'; c.fillRect(0, 0, n, n); for (let x = 4; x < n; x += 32) { c.fillStyle = k === 'louver' ? '#8C6A4A' : '#9A6F48'; c.fillRect(x, 0, 22, n); } }), roughness: 0.6 });
    case 'terrazzo': return mt('f_terrazzo', { map: ctex('t_terr', 256, (c, n) => { c.fillStyle = '#E8E2D8'; c.fillRect(0, 0, n, n); const r = rnd(11); for (let i = 0; i < 420; i++) { c.fillStyle = ['#B8AFA2', '#7E766B', '#C9A37A', '#5E5A54', '#D9D2C6'][Math.floor(r() * 5)]; c.beginPath(); c.ellipse(r() * n, r() * n, 2 + r() * 7, 2 + r() * 5, r() * 3, 0, 7); c.fill(); } }), roughness: 0.35 });
    case 'ledge': return mt('f_ledge', { map: ctex('t_ledge', 256, (c, n) => { const r = rnd(5); for (let y = 0; y < n; y += 12) { let x = -r() * 40; while (x < n) { const w = 24 + r() * 60; c.fillStyle = ['#8A8279', '#9C948A', '#6F6861', '#B0A79B', '#7C756D'][Math.floor(r() * 5)]; c.fillRect(x, y, w - 2, 10); x += w; } } }), roughness: 0.95 });
    case 'pustone': return mt('f_pustone', { map: ctex('t_pus', 256, (c, n) => { const r = rnd(9); c.fillStyle = '#A59B8E'; c.fillRect(0, 0, n, n); for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(${90 + r() * 60},${85 + r() * 55},${75 + r() * 50},.5)`; c.fillRect(r() * n, r() * n, 20 + r() * 70, 10 + r() * 30); } }), roughness: 0.9 });
    case 'mirror': return mt('f_mirror', { color: 0xC9CED3, metalness: 0.9, roughness: 0.08 });
    case 'designer': return mt('f_designer', { map: ctex('t_des', 256, (c, n) => { c.fillStyle = '#2C2A28'; c.fillRect(0, 0, n, n); c.fillStyle = '#B08D57'; for (let x = 0; x < n; x += 64) c.fillRect(x, 0, 4, n); c.fillStyle = '#3B3835'; for (let x = 10; x < n; x += 64) c.fillRect(x, 10, 48, n - 20); c.strokeStyle = '#B08D57'; c.lineWidth = 2; c.strokeRect(18, 30, 32, 60); }), roughness: 0.4, metalness: 0.15 });
    case 'wood': return mt('f_wood', { map: ctex('t_wood', 256, (c, n) => { const r = rnd(13); for (let x = 0; x < n; x += 32) { c.fillStyle = ['#8A5A36', '#94633D', '#7E5230'][Math.floor(r() * 3)]; c.fillRect(x, 0, 31, n); c.strokeStyle = 'rgba(60,35,18,.25)'; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(x + r() * 30, 0); c.lineTo(x + r() * 30, n); c.stroke(); } } }), roughness: 0.6 });
    case 'cement': return mt('f_cement', { map: ctex('t_cem', 256, (c, n) => { const r = rnd(17); c.fillStyle = '#9C9890'; c.fillRect(0, 0, n, n); for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(60,58,54,${r() * 0.12})`; c.fillRect(r() * n, r() * n, 2, 2); } c.fillStyle = '#7E7A73'; c.fillRect(0, n / 2 - 1, n, 2); c.fillRect(n / 2 - 1, 0, 2, n); }), roughness: 0.9 });
    default: return mt('f_paint', { color: 0xD8CFC2, roughness: 0.85 });
  }
}
const TOPS = [[/onyx/i, () => mt('t_onyx', { color: 0xF2D7A6, emissive: 0xE7B66C, emissiveIntensity: 0.45, roughness: 0.25 })],
  [/brass/i, () => mt('t_brass', { color: 0xB08D57, metalness: 0.85, roughness: 0.3 })], [/stainless|\bss\b|steel/i, () => mt('t_ss', { color: 0xC9CBCD, metalness: 0.9, roughness: 0.28 })],
  [/teak|wood/i, () => mt('t_teak', { color: 0x8A5530, roughness: 0.5 })], [/marble|nero/i, () => mt('t_nero', { color: 0x141414, roughness: 0.12 })],
  [/quartz|sintered/i, () => mt('t_quartz', { color: 0xEDEAE4, roughness: 0.18 })], [/terrazzo/i, () => mt('t_terr', { map: frontMat('terrazzo').map, roughness: 0.3 })],
  [/kota/i, () => mt('t_kota', { color: 0x6F7F72, roughness: 0.5 })], [/microcement|cement/i, () => mt('t_mc', { color: 0xB7B0A4, roughness: 0.7 })],
  [/granite/i, () => mt('t_gran', { map: ctex('t_gran', 128, (c, n) => { const r = rnd(21); c.fillStyle = '#232323'; c.fillRect(0, 0, n, n); for (let i = 0; i < 700; i++) { c.fillStyle = ['#3A3A3A', '#555', '#111', '#6B6B6B'][Math.floor(r() * 4)]; c.fillRect(r() * n, r() * n, 1 + r() * 2, 1 + r() * 2); } }), roughness: 0.22 })]];
function topMat(name) { for (const [re, f] of TOPS) if (re.test(name || '')) return f(); return TOPS[TOPS.length - 1][1](); }
const count = s => { const m = /(\d+)\s*[×x]/.exec(s || ''); return m ? +m[1] : /^no\b/i.test(s || '') ? 0 : 0; };
const SS = () => mt('ss', { color: 0xC4C7CA, metalness: 0.9, roughness: 0.3 }), BLK = () => mt('blk', { color: 0x1A1A1A, roughness: 0.6 });

// one straight run of counter, `L` long, centred on x = 0, customer side +z. spec = the picks.
function run(g, L, D, sp, ends) {
  const H = sp.ledge ? 3 : 3.4, fm = frontMat(sp.front), tm = topMat(sp.top), lm = topMat(sp.ledgeTop || sp.top), body = mt('body', { color: 0x3A3836, roughness: 0.8 });
  bx(g, L - 0.3, 0.35, D - 0.4, 0, 0.175, -0.05, BLK());                                   // toe kick, set back
  const f = bx(g, L, H - 0.35 - 0.12, 0.12, 0, 0.35 + (H - 0.47) / 2, D / 2 - 0.06, fm);      // the front face
  if (fm.map) { fm.map.repeat.set(L / 2, (H - 0.47) / 2); }
  bx(g, L, H - 0.47, D - 0.25, 0, 0.35 + (H - 0.47) / 2, -0.06, body);                      // the carcass
  if (ends.l) bx(g, 0.12, H - 0.47, D, -L / 2 + 0.06, 0.35 + (H - 0.47) / 2, 0, fm);         // finished ends
  if (ends.r) bx(g, 0.12, H - 0.47, D, L / 2 - 0.06, 0.35 + (H - 0.47) / 2, 0, fm);
  const ov = sp.ledge ? 0.15 : 0.75; bx(g, L + 0.1, 0.12, D + ov, 0, H - 0.06, ov / 2, tm);   // the top, overhanging the front
  if (sp.ledge) {                                                                               // a raised serving ledge on the customer's side
    bx(g, L, 0.55, 0.3, 0, H + 0.27, D / 2 - 0.15, fm); bx(g, L + 0.1, 0.1, 1.15, 0, H + 0.6, D / 2 + 0.2, lm);
  }
  const topY = sp.ledge ? H + 0.65 : H;
  if (sp.led) { const s = new THREE.Mesh(new THREE.BoxGeometry(L - 0.2, 0.03, 0.03), mt('led', { color: 0xFFD9A0, emissive: 0xFFC27A, emissiveIntensity: 1.4 })); s.position.set(0, (sp.ledge ? H + 0.5 : H - 0.14), D / 2 + (sp.ledge ? 0.7 : 0.7)); g.add(s); }
  if (sp.rail) { const r = cy(g, 0.05, 0.05, L - 0.6, 0, 0.75, D / 2 + 0.5, SS(), 10); r.rotation.z = Math.PI / 2; for (let x = -L / 2 + 0.6; x <= L / 2 - 0.5; x += Math.max(2, (L - 1.2) / Math.max(1, Math.round((L - 1.2) / 3)))) { bx(g, 0.06, 0.06, 0.5, x, 0.75, D / 2 + 0.25, SS()); } }
  return { H, topY };
}

// the whole bar for a spec: { L, D, front, top, ledgeTop, ledge, lshape, sinks, grills, fridges, stools, storage, led, rail, shelf }
export function barModel(sp) {
  const g = new THREE.Group(), D = sp.D || 2, A = sp.lshape ? Math.max(3, Math.min(sp.L * 0.38, sp.L - 4)) : 0, L = sp.L - A;
  const main = new THREE.Group(); g.add(main); const R = run(main, L, D, sp, { l: true, r: !A });
  if (A) { const ret = new THREE.Group(); ret.rotation.y = Math.PI / 2; ret.position.set(L / 2 - D / 2, 0, -A / 2 - D / 2 + 0.06); g.add(ret); run(ret, A, D, sp, { l: true, r: false }); }
  // the bartender's side (−z): sinks + grills cut into the top, fridge bays + storage under it
  const back = -D / 2, wy = R.H, prep = sp.ledge ? R.H : R.H;
  let x = -L / 2 + 1.1;
  for (let i = 0; i < sp.sinks; i++) { bx(main, 1.5, 0.02, 1.1, x + 0.5, wy + 0.005, back + 0.75, mt('sinkb', { color: 0x8E9296, metalness: 0.8, roughness: 0.35 })); bx(main, 1.3, 0.03, 0.9, x + 0.5, wy + 0.01, back + 0.75, mt('sinkd', { color: 0x4C5054, metalness: 0.7, roughness: 0.4 }));
    const t = cy(main, 0.04, 0.04, 0.9, x + 0.5, wy + 0.45, back + 0.2, SS(), 10); const sp2 = cy(main, 0.035, 0.035, 0.5, x + 0.5, wy + 0.88, back + 0.42, SS(), 10); sp2.rotation.x = Math.PI / 2; x += 1.9; }
  for (let i = 0; i < sp.grills; i++) { bx(main, 1.9, 0.03, 1.3, x + 0.8, wy + 0.01, back + 0.8, SS()); bx(main, 1.6, 0.04, 1.0, x + 0.8, wy + 0.02, back + 0.8, BLK()); for (let k = 0; k < 4; k++) bx(main, 1.5, 0.05, 0.05, x + 0.8, wy + 0.05, back + 0.45 + k * 0.23, mt('grate', { color: 0x2A2A2A, metalness: 0.6, roughness: 0.5 })); x += 2.2; }
  const ch = R.H - 0.47 - 0.15;                                                                  // under-counter height
  let ux = -L / 2 + 0.25; const ue = L / 2 - 0.25;
  for (let i = 0; i < sp.fridges && ux + 2 <= ue; i++) { bx(main, 1.9, ch, 0.06, ux + 0.95, 0.35 + 0.08 + ch / 2, back - 0.03, SS()); for (let k = 0; k < 5; k++) bx(main, 1.5, 0.04, 0.02, ux + 0.95, 0.55 + k * 0.12, back - 0.07, BLK()); bx(main, 0.06, ch * 0.5, 0.06, ux + 1.75, 0.35 + ch * 0.55, back - 0.09, BLK()); ux += 2.05; }
  const sm = { hdhmr: mt('sh_hd', { map: frontMat('wood').map, color: 0xB9B2A8, roughness: 0.55 }), hpl: mt('sh_hpl', { map: frontMat('wood').map, roughness: 0.45 }), steel: SS() }[sp.storage];
  while (ux + 1.4 <= ue) { const w = Math.min(2, ue - ux);
    if (sm) { bx(main, w - 0.04, ch, 0.06, ux + w / 2, 0.35 + 0.08 + ch / 2, back - 0.03, sm); bx(main, 0.05, 0.5, 0.05, ux + w - 0.2, 0.35 + ch * 0.6, back - 0.08, sp.storage === 'steel' ? BLK() : SS()); }
    else { const sh = mt('shelf', { color: 0x6A645D, roughness: 0.7 }); bx(main, w - 0.04, ch, 0.02, ux + w / 2, 0.35 + 0.08 + ch / 2, D / 2 - 0.2, mt('cav', { color: 0x3A3632 }));   // open shelves: two shelves + a divider
      bx(main, w - 0.1, 0.06, D - 0.45, ux + w / 2, 0.35 + ch * 0.5, -0.05, sh); bx(main, w - 0.1, 0.06, D - 0.45, ux + w / 2, 0.45, -0.05, sh); bx(main, 0.06, ch, D - 0.45, ux + w - 0.03, 0.35 + 0.08 + ch / 2, -0.05, sh); }
    ux += w; }
  // bar stools in front, along the main run
  if (sp.stools > 0) { const n = sp.stools, gap = Math.max(1.55, Math.min(2.3, (L - 0.8) / n)), sy = sp.ledge ? 2.55 + 0.6 : 2.55, cs = mt('stseat', { color: 0x3B2A20, roughness: 0.6 }), fr = mt('stfr', { color: 0x1E1E1E, metalness: 0.4, roughness: 0.5 });
    for (let i = 0; i < n; i++) { const s = new THREE.Group(); s.position.set(-((n - 1) * gap) / 2 + i * gap, 0, D / 2 + 1.25); g.add(s);
      cy(s, 0.62, 0.6, 0.14, 0, sy, 0, cs); cy(s, 0.07, 0.07, sy - 0.1, 0, sy / 2, 0, fr, 8); cy(s, 0.55, 0.6, 0.05, 0, 0.03, 0, fr); const r = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 20), fr); r.rotation.x = Math.PI / 2; r.position.y = sy * 0.36; s.add(r);
    } }
  return { g, L, A, D, H: R.topY };
}

// the studio: grey tiles, a 9 ft wall 3 ft behind the bar (the bartender's space), a back-bar shelf on it when picked, a person in front
export function barStudio(sp) {
  const S = new THREE.Group(), B = barModel(sp); S.add(B.g);
  const D = B.D, wz = -D / 2 - 3 - 0.375, W = B.L + 8;
  const bk = sp.view === 'back';   // seen from the bartender's side: the wall is left out so the storage shows
  if (!bk) sWall(S, -W / 2, wz, W / 2, wz, 9, 0.75);
  if (sp.shelf && !bk) { const sw = Math.min(B.L, W - 1), wood = mt('shw', { color: 0x5A3B24, roughness: 0.6 }), bot = [0x2F5D3A, 0x6B2E1F, 0xC9A45C, 0x1F3B5A, 0x8C8C8C];
    for (let k = 0; k < 3; k++) { const y = 4.2 + k * 1.3; bx(S, sw, 0.1, 0.8, 0, y, wz + 0.8, wood); const led = new THREE.Mesh(new THREE.BoxGeometry(sw - 0.2, 0.02, 0.02), mt('led', { color: 0xFFD9A0, emissive: 0xFFC27A, emissiveIntensity: 1.4 })); led.position.set(0, y - 0.06, wz + 1.1); S.add(led);
      for (let x = -sw / 2 + 0.35; x < sw / 2 - 0.2; x += 0.42) { const c = bot[Math.floor(Math.abs(Math.sin(x * 7 + k)) * bot.length)]; cy(S, 0.12, 0.13, 0.75, x, y + 0.42, wz + 0.75, mt('bt' + c, { color: c, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.88 }), 10); cy(S, 0.04, 0.05, 0.22, x, y + 0.9, wz + 0.75, mt('bt' + c, { color: c }), 8); } } }
  const fz0 = wz - 0.4, fz1 = D / 2 + 9;
  studioFloor(S, -W / 2 - 2, fz0, W + 4, fz1 - fz0);
  person(S, B.L / 2 + 2.2, D / 2 + 2.6, -0.6);
  return { g: S, L: B.L, D, H: B.H, span: Math.max(B.L + 6, 14) };
}

// the spec from a design + the customer's picks (mto = the design's price list, o = the picks)
export function barSpec(sku, m, o) {
  const gp = Object.assign({}, o.groups || {}), ad = o.addons || [], has = re => ad.some(a => re.test(a));
  const mats = (m.materials || []).filter(x => x && x.name), mat = mats.find(x => x.name === o.material) || mats[0] || {};
  const gname = re => Object.keys(gp).find(k => re.test(k));
  const first = re => { const gr = (m.groups || []).find(x => re.test(x.name)); return gr && gr.options && gr.options[0] ? gr.options[0].name : ''; };
  const pick = re => gp[gname(re)] || first(re);
  const st = pick(/storage/i);
  return {
    L: Math.max(3, +o.l || +(m.min_size) || 6), D: 2, front: frontKind(mat.name), top: pick(/^top$/i), ledgeTop: pick(/serving ledge/i),
    ledge: (m.groups || []).some(x => /serving ledge/i.test(x.name)), lshape: /-L$/.test(sku || ''),
    sinks: count(pick(/sink/i)), grills: count(pick(/grill|burner/i)), fridges: count(pick(/fridge|cooler/i)), stools: count(pick(/stool/i)),
    storage: /hdhmr/i.test(st) ? 'hdhmr' : /hpl/i.test(st) ? 'hpl' : /steel|ss\b/i.test(st) ? 'steel' : 'open',
    led: has(/LED strip/i), rail: has(/foot rail/i), shelf: has(/back bar|bottle shelf/i) };
}

// 309: outdoor kitchens / BBQ / pizza counters (MTO-OK-*, MTO-BBQ-*, MTO-PZ-*): a 3 ft high, 2 ft deep counter against a wall
// (islands stand free with stools in front). Shape from the design: straight, L (return arm forward on the right), U, island.
// On the top, left to right: pizza oven / hearth, sinks, grills (SS with a raised back panel, knobs on the front); fridge bays and
// storage doors on the front. The cook faces the wall (−z); the customer looks at the cladded front (+z).
const KSHAPE = { 'OK-L': 'L', 'OK-COMBO': 'L', 'BBQ-CORNER': 'L', 'OK-FARM': 'L', 'PZ-BBQ': 'L', 'OK-U': 'U', 'OK-ISLAND': 'I', 'PZ-ISLAND': 'I' };
const KLEN = { 'BBQ-6': 6, 'BBQ-MINI': 4, 'BBQ-SINK': 8, 'BBQ-CORNER': 9, 'OK-COMBO': 13, 'OK-COMPACT': 7, 'OK-FARM': 14, 'OK-GARDEN': 9, 'OK-ISLAND': 10, 'OK-L': 14, 'OK-SS': 10, 'OK-U': 18, 'PZ-BASE': 5, 'PZ-BBQ': 13, 'PZ-ISLAND': 10, 'PZ-PREP': 8 };
export const isKitchen = sku => /^MTO-(OK|BBQ|PZ)-/.test(sku || '');
function krun(g, L, D, H, sp, ends) {
  const fm = frontMat(sp.front), tm = topMat(sp.top), body = mt('body', { color: 0x3A3836, roughness: 0.8 });
  bx(g, L - 0.2, 0.3, D - 0.3, 0, 0.15, -0.08, BLK());
  bx(g, L, H - 0.42, D - 0.1, 0, 0.3 + (H - 0.42) / 2, -0.05, body);
  const f = bx(g, L, H - 0.42, 0.1, 0, 0.3 + (H - 0.42) / 2, D / 2 - 0.05, fm); if (fm.map) fm.map.repeat.set(Math.max(1, L / 2), (H - 0.42) / 2);
  if (ends.l) bx(g, 0.1, H - 0.42, D, -L / 2 + 0.05, 0.3 + (H - 0.42) / 2, 0, fm);
  if (ends.r) bx(g, 0.1, H - 0.42, D, L / 2 - 0.05, 0.3 + (H - 0.42) / 2, 0, fm);
  if (ends.b) bx(g, L, H - 0.42, 0.1, 0, 0.3 + (H - 0.42) / 2, -D / 2 + 0.05, fm);   // a back that shows (L / U arms, islands)
  bx(g, L + (ends.l ? 0.08 : 0) + (ends.r ? 0.08 : 0), 0.1, D + 0.08, ((ends.r ? 0.08 : 0) - (ends.l ? 0.08 : 0)) / 2, H - 0.05, 0.04, tm);
  return f;
}
function kGrill(g, x, D, H) {
  bx(g, 2.2, 0.06, 1.5, x, H + 0.02, -0.05, SS()); bx(g, 1.9, 0.05, 1.2, x, H + 0.05, -0.05, BLK());
  const gr = mt('grate', { color: 0x2A2A2A, metalness: 0.6, roughness: 0.5 }); for (let k = 0; k < 7; k++) bx(g, 0.05, 0.05, 1.1, x - 0.8 + k * 0.27, H + 0.09, -0.05, gr);
  bx(g, 2.2, 0.75, 0.08, x, H + 0.4, -0.8, SS()); bx(g, 2.2, 0.08, 0.3, x, H + 0.78, -0.68, SS());
  for (let k = 0; k < 4; k++) { const c = cy(g, 0.07, 0.07, 0.08, x - 0.6 + k * 0.4, H - 0.3, D / 2 + 0.04, BLK(), 12); c.rotation.x = Math.PI / 2; }
}
function kSink(g, x, D, H) {
  bx(g, 1.7, 0.02, 1.25, x, H + 0.005, 0, mt('sinkb', { color: 0x8E9296, metalness: 0.8, roughness: 0.35 })); bx(g, 1.45, 0.03, 1.0, x, H + 0.01, 0, mt('sinkd', { color: 0x4C5054, metalness: 0.7, roughness: 0.4 }));
  cy(g, 0.045, 0.045, 1.1, x, H + 0.55, -0.72, SS(), 10); const a = cy(g, 0.035, 0.035, 0.55, x, H + 1.08, -0.47, SS(), 10); a.rotation.x = Math.PI / 2; cy(g, 0.03, 0.03, 0.2, x, H + 1.0, -0.22, SS(), 8);
}
function kPizza(g, x, D, H, kind, fm) {
  if (kind === 'oven') { const tc = mt('pz_tc', { color: 0xD2723F, roughness: 0.8 }); bx(g, 2.8, 0.3, 2.3, x, H + 0.15, -0.05, BLK());
    const d = new THREE.Mesh(new THREE.SphereGeometry(1.15, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), tc); d.position.set(x, H + 0.3, -0.15); d.castShadow = true; g.add(d);
    bx(g, 0.9, 0.6, 0.5, x, H + 0.6, 0.85, tc); bx(g, 0.62, 0.42, 0.06, x, H + 0.52, 1.11, mt('pz_mouth', { color: 0x120C08, emissive: 0x7A2A08, emissiveIntensity: 0.5 }));
    cy(g, 0.17, 0.17, 1.6, x, H + 1.9, -0.45, BLK(), 14); return 2.9; }
  bx(g, 3, 0.35, D + 0.1, x, H + 0.17, 0, BLK()); bx(g, 3.1, 0.12, D + 0.2, x, H + 0.4, 0.02, topMat('granite'));
  bx(g, 1.5, 1.1, 0.06, x, 0.3 + 1.1 / 2 + 0.35, D / 2 + 0.02, mt('pz_wood', { color: 0x15110D })); return 3.1;
}
function kFridge(g, x, D) { bx(g, 1.9, 2.0, 0.06, x, 0.3 + 0.1 + 1.0, D / 2 + 0.03, SS()); for (let k = 0; k < 5; k++) bx(g, 1.5, 0.04, 0.02, x, 0.6 + k * 0.12, D / 2 + 0.07, BLK()); bx(g, 0.06, 0.9, 0.06, x + 0.8, 1.45, D / 2 + 0.09, BLK()); }
function kDoors(g, x0, x1, D, H) { const n = Math.max(1, Math.round((x1 - x0) / 1.7)), w = (x1 - x0) / n, ln = mt('kdl', { color: 0x1E1C1A, roughness: 0.9 });
  for (let i = 0; i <= n; i++) bx(g, 0.025, H - 0.55, 0.02, x0 + i * w, 0.3 + (H - 0.42) / 2, D / 2 + 0.005, ln);
  for (let i = 0; i < n; i++) bx(g, 0.05, 0.6, 0.06, x0 + i * w + (i % 2 ? 0.18 : w - 0.18), H - 0.75, D / 2 + 0.04, SS()); }
export function kitchenModel(sp) {
  const g = new THREE.Group(), D = 2, H = 3, Lt = sp.L, sh = sp.shape;
  const A = sh === 'L' ? Math.max(3, Math.min(Lt * 0.38, Lt - 4)) : sh === 'U' ? Math.max(3, Lt * 0.25) : 0, Lm = Math.max(3, Lt - A * (sh === 'U' ? 2 : 1));
  const runs = [];
  const mg = new THREE.Group(); g.add(mg); krun(mg, Lm, D, H, sp, { l: sh !== 'U', r: !A, b: sh === 'I' }); runs.push({ g: mg, x0: -Lm / 2 + (sh === 'U' ? D : 0), x1: Lm / 2 - (A ? D : 0), L: Lm });
  const arm = (sgn) => { const r = new THREE.Group(); r.rotation.y = -sgn * Math.PI / 2; r.position.set(sgn * (Lm / 2 - D / 2), 0, D / 2 + A / 2); g.add(r); krun(r, A, D, H, sp, { l: true, r: true, b: true });
    runs.push({ g: r, x0: -A / 2 + 0.1, x1: A / 2 - 0.2, L: A }); };
  if (A) arm(1); if (sh === 'U') arm(-1);
  // the top: pizza first, then sinks, then grills — along the main run, then the arms
  const tops = []; if (sp.pizza) tops.push('pizza'); for (let i = 0; i < sp.sinks; i++) tops.push('sink'); for (let i = 0; i < sp.grills; i++) tops.push('grill');
  const W = { pizza: sp.pizza === 'oven' ? 3 : 3.2, sink: 2.1, grill: 2.5 };
  let ri = 0, cx = runs[0].x0 + 0.3; const used = runs.map(() => []);
  tops.forEach(t => { while (ri < runs.length && cx + W[t] > runs[ri].x1 + 0.05) { ri++; if (ri < runs.length) cx = runs[ri].x0 + 0.2; } if (ri >= runs.length) return;
    const R = runs[ri], x = cx + W[t] / 2; if (t === 'pizza') kPizza(R.g, x, D, H, sp.pizza); else if (t === 'sink') kSink(R.g, x, D, H); else kGrill(R.g, x, D, H); used[ri].push([cx, cx + W[t], t]); cx += W[t] + 0.15; });
  // the front: fridge bays from the left of the main run, then storage doors
  let fx = runs[0].x0 + 0.2; for (let i = 0; i < sp.fridges && fx + 2 < runs[0].x1; i++) { kFridge(runs[0].g, fx + 1, D); fx += 2.1; }
  if (sp.doors) { runs.forEach((R, i) => { const pz = used[i].find(u => u[2] === 'pizza' && sp.pizza === 'base'); let a = i ? R.x0 : fx, b = R.x1 + (i ? 0.1 : 0);
      if (pz) { if (pz[0] - a > 1.2) kDoors(R.g, a, pz[0], D, H); a = pz[1]; } if (b - a > 1.2) kDoors(R.g, a, b, D, H); }); }
  if (sp.led) { const s = new THREE.Mesh(new THREE.BoxGeometry(Lm - 0.3, 0.03, 0.03), mt('led', { color: 0xFFD9A0, emissive: 0xFFC27A, emissiveIntensity: 1.4 })); s.position.set(0, H - 0.14, D / 2 + 0.07); mg.add(s); }
  // islands: a raised ledge on the customer's side; stools in front
  let topY = H;
  if (sp.ledge) { const fm = frontMat(sp.front), lm = topMat(sp.top); bx(mg, Lm, 0.5, 0.25, 0, H + 0.25, D / 2 + 0.0, fm); bx(mg, Lm + 0.1, 0.1, 1.2, 0, H + 0.55, D / 2 + 0.35, lm); topY = H + 0.6; }
  if (sp.stools > 0) { const n = sp.stools, gap = Math.max(1.55, Math.min(2.3, (Lm - 0.8) / n)), sy = sp.ledge ? 2.9 : 2.3, cs = mt('stseat', { color: 0x3B2A20, roughness: 0.6 }), fr = mt('stfr', { color: 0x1E1E1E, metalness: 0.4, roughness: 0.5 });
    for (let i = 0; i < n; i++) { const s = new THREE.Group(); s.position.set(-((n - 1) * gap) / 2 + i * gap - (A ? A * 0.3 : 0), 0, D / 2 + (sp.ledge ? 1.6 : 1.3)); g.add(s);
      cy(s, 0.62, 0.6, 0.14, 0, sy, 0, cs); cy(s, 0.07, 0.07, sy - 0.1, 0, sy / 2, 0, fr, 8); cy(s, 0.55, 0.6, 0.05, 0, 0.03, 0, fr); const r = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 20), fr); r.rotation.x = Math.PI / 2; r.position.y = sy * 0.36; s.add(r); } }
  return { g, L: Lm, A, D: D + A, H: topY };
}
export function kitchenStudio(sp) {
  const S = new THREE.Group(), K = kitchenModel(sp); S.add(K.g);
  const isl = sp.shape === 'I', wz = isl ? -1 - 3 - 0.375 : -1 - 0.375, W = K.L + 8;
  if (!(isl && sp.view === 'back')) sWall(S, -W / 2, wz, W / 2, wz, 9, 0.75);
  if (sp.shelf) { const sw = Math.min(K.L, W - 1), wood = mt('shw', { color: 0x5A3B24, roughness: 0.6 }); for (let k = 0; k < 2; k++) { const y = 4.6 + k * 1.3; bx(S, sw, 0.1, 0.8, 0, y, wz + 0.8, wood); } }
  studioFloor(S, -W / 2 - 2, wz - 0.4, W + 4, 1 + K.A + 11);
  person(S, K.A ? -K.L / 2 - 1.6 : K.L / 2 + 2.2, 1 + K.A + (K.A ? 1 : 2.4), K.A ? 0.6 : -0.6);
  return { g: S, L: K.L, D: K.D, H: K.H, span: Math.max(K.L + 6, 14) };
}
export function kitchenSpec(sku, m, o) {
  const b = barSpec(sku, m, o), code = String(sku || '').replace(/^MTO-/, ''), gp = o.groups || {}, ad = o.addons || [], has = re => ad.some(a => re.test(a));
  const pk = Object.keys(gp).find(k => /pizza/i.test(k)), first = ((m.groups || []).find(x => /pizza/i.test(x.name)) || {}).options, pz = pk ? gp[pk] : first && first[0] ? first[0].name : '';
  const shape = KSHAPE[code] || 'S';
  return Object.assign(b, { kitchen: true, shape, L: Math.max(3, +o.l || KLEN[code] || 8), pizza: /wood-fired|oven 80/i.test(pz) ? 'oven' : /base|hearth/i.test(pz) ? 'base' : '',
    doors: has(/doors on the storage/i), ledge: shape === 'I' || has(/raised bar ledge/i), shelf: has(/back bar|bottle shelf/i) });
}
