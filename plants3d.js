// outrr — 3D models of the Landscape Plants (218) for the planner: one model per plant, drawn in code (no model files),
// at the size the customer picks. plantModel(THREE, key, hFt, opts) → THREE.Group, base at y = 0, centred on (0, 0), feet.
// Leaves / flowers are InstancedMesh (a few draw calls per plant) so a terrace full of plants stays light on phones.
// key = the product's variant group without "LP-" (ARECA, HIBISCUS…); opts: { seed, pot: 'bag' | 'pot' | 'none', bag: inches }.

const SP = {
  // family, colours, shape numbers — heights come from the size picked
  ARECA:        { f: 'clump', stems: 12, frond: 'feather', leaf: [0x6E9E3A, 0x5E8E32, 0x7EAA44], stem: 0x9C9E44, lean: 0.5, spread: 0.85, nf: 3, fl: 0.72, a0: 0.95, lw: 0.12, droop: 0.6, hmin: 0.35 },
  RHAPIS:       { f: 'clump', stems: 10, frond: 'fan', leaf: [0x2F5E2A, 0x3B6E31, 0x285424], stem: 0x5B4632, lean: 0.22, spread: 0.65, fans: 4 },
  FISHTAIL:     { f: 'clump', stems: 7, frond: 'fish', leaf: [0x4E7F34, 0x3E6E2C, 0x5A8A3A], stem: 0x6B7A45, lean: 0.3, spread: 0.7, nf: 4, fl: 0.6 },
  BAMBOO:       { f: 'bamboo', leaf: [0x5E8F35, 0x4A7A2C], stem: 0x7E9B3E, spread: 0.45 },
  PHOENIX:      { f: 'trunk', frond: 'feather', lw: 0.2, trunk: 0x6A5440, tH: 0.42, leaf: [0x3E6A2C, 0x4C7A33], n: 22, flen: 0.55, spread: 0.85 },
  LIVISTONA:    { f: 'trunk', frond: 'bigfan', trunk: 0x6E5E48, tH: 0.1, tr: 0.55, leaf: [0x4F8A36, 0x5E9A3E], n: 12, flen: 0.5, spread: 0.95 },
  CYCAS:        { f: 'cycad', trunk: 0x4E3E2C, leaf: [0x1E3E1A, 0x264A20], spread: 1.1 },
  HIBISCUS:     { f: 'bush', leaf: [0x2F6A2A, 0x3D7A33], fl: [0xD8202A], flS: 0.22, flN: 26, shape: [0.5, 0.62], spread: 0.65 },
  IXORA:        { f: 'bush', leaf: [0x2B5E27, 0x356B2D], fl: [0xF0501E, 0xE2381C], flS: 0.2, flN: 30, cluster: 1, shape: [0.55, 0.6], spread: 0.75 },
  MOGRA:        { f: 'bush', leaf: [0x3C7A30, 0x4A8836], fl: [0xFFFFFF], flS: 0.17, flN: 46, shape: [0.55, 0.62], spread: 0.75, loose: 1 },
  CHANDNI:      { f: 'bush', leaf: [0x1F5A24, 0x2A6A2C], fl: [0xFFFFFF], flS: 0.22, flN: 40, shape: [0.55, 0.6], spread: 0.8 },
  RAATKIRANI:   { f: 'bush', leaf: [0x4A7E2E, 0x5A8E36], fl: [0xE8F0C8], flS: 0.1, flN: 36, cluster: 1, shape: [0.38, 0.7], spread: 0.6, loose: 1 },
  TECOMA:       { f: 'bush', leaf: [0x3F7F2E, 0x4E8E36], fl: [0xF5C518, 0xFFD42A], flS: 0.18, flN: 34, cluster: 1, shape: [0.4, 0.68], spread: 0.6, loose: 1 },
  KANER:        { f: 'bush', leaf: [0x2E5A2C, 0x3A6A33], fl: [0xF07AA8, 0xE8609A], flS: 0.17, flN: 34, cluster: 1, shape: [0.42, 0.66], spread: 0.65, narrow: 1 },
  ADENIUM:      { f: 'adenium', trunk: 0x8E7E6A, leaf: [0x2E6A2E, 0x3A7A36], fl: [0xE0306A, 0xF06090], spread: 0.8 },
  BIRDPARADISE: { f: 'paddle', leaf: [0x4E7A5A, 0x5A8866], fl: [0xF08A1E], spread: 0.75 },
  CROTON:       { f: 'bush', core: 0x2A4A20, leaf: [0xD8B020, 0xC2461E, 0x2E5E26, 0xE0791E, 0x8A1E1E], big: 1, flN: 0, shape: [0.5, 0.62], spread: 0.65 },
  CORDYLINE:    { f: 'strap', leaf: [0x8A1E3A, 0xB02A4E, 0x5A1530], canes: 2, top: 1, spread: 0.55 },
  SCHEFFLERA:   { f: 'umbrella', leaf: [0x3A7A2E, 0x4C8A36], stem: 0x6B5A3C, spread: 0.65 },
  SONGOFINDIA:  { f: 'strap', leaf: [0x8AA83A, 0xC8C850, 0x5E8A30], canes: 4, whorls: 1, spread: 0.6 },
  KAMINI:       { f: 'bush', leaf: [0x1F4E22, 0x2A5E28], fl: [0xFFFFF4], flS: 0.08, flN: 30, cluster: 1, shape: [0.48, 0.62], spread: 0.75, dense: 1 },
  DURANTA:      { f: 'bush', core: 0x7E9A28, leaf: [0xC2D63A, 0xA8C430, 0xB6CE36], flN: 0, shape: [0.55, 0.62], spread: 0.95, dense: 1 },
  FICUSPANDA:   { f: 'topiary', leaf: [0x2E6A2A, 0x3C7A32], trunk: 0x8A7A62, spread: 0.6 },
  MORPANKHI:    { f: 'cone', leaf: [0x6C9A34, 0x5C8A2E], spread: 0.48 },
  FOUNTAINGRASS:{ f: 'grass', leaf: [0x6E2238, 0x7E2C44, 0x5A1C2E], plume: 0xC890A8, spread: 1.0 },
  AGAVE:        { f: 'agave', leaf: [0x7E9EA0, 0x6E8E92], spread: 1.2 },
  SNAKEPLANT:   { f: 'snake', leaf: [0x2E5A2E, 0x3E6A34], edge: 0xD8C84A, spread: 0.45 },
  BOUGAINVILLEA:{ f: 'climber', leaf: [0x3F7D3A, 0x4E8A40], fl: [0xD0207E, 0xE0308E], flF: 0.55, spread: 0.6 },
  MADHUMALTI:   { f: 'climber', leaf: [0x3A7A30, 0x4A8A38], fl: [0xFFFFFF, 0xF2A0B8, 0xD83A58], flF: 0.35, spread: 0.6 },
  FOXTAIL:      { f: 'trunk', frond: 'fox', trunk: 0x9A968C, smooth: 1, crown: 0x6E8A3A, tH: 0.4, tr: 0.75, leaf: [0x4E8A34, 0x5E9A3C, 0x427A2E], n: 9, flen: 0.55, spread: 0.85 },
  TRAVELLER:    { f: 'ravenala', trunk: 0x8A8478, leaf: [0x4E7A3A, 0x5A8A42], spread: 0.95 },
  BANANA:       { f: 'banana', stem: 0x7E8E44, leaf: [0x5E9A3A, 0x6EAA44, 0x4E8A32], spread: 0.85 },
  BLACKFICUS:   { f: 'bush', tree: 0.32, trunk: 0x8A8478, core: 0x14280F, leaf: [0x1A3418, 0x22401E, 0x2A4A24], flN: 0, dense: 1, shape: [0.5, 0.6], spread: 0.7 },
  OLIVE:        { f: 'bush', tree: 0.42, trunk: 0x7A6A58, core: 0x4A5A3A, leaf: [0x8A9878, 0x9AA886, 0x7A8A68, 0xA8B496], flN: 0, loose: 1, shape: [0.5, 0.5], spread: 0.4 },   // 294: olive tree — silvery grey-green, airy crown on a grey trunk (Turkish theme)
  PACHIRA:      { f: 'pachira', trunk: 0x8E8A6A, leaf: [0x3A7A2E, 0x478A36, 0x326E28], spread: 0.6 },
  // 284 (owner): ground cover / living-wall plants — under the bigger plants in planters and on vertical gardens
  DRACAENA:     { f: 'strap', leaf: [0x2E5A2A, 0x6A1E2E, 0x3A6A30], canes: 3, top: 1, spread: 0.45 },
  ZZ:           { f: 'bush', core: 0x14300F, leaf: [0x1E4A1A, 0x25561F, 0x2C6224], big: 1, narrow: 0, shape: [0.38, 0.7], spread: 0.45, flN: 0, dense: 1 },
  CHLOROPHYTUM: { f: 'grass', arch: 1, bw: 0.09, leaf: [0x8CC04E, 0xEEF2D6, 0x6FA83E], spread: 0.6 },
  MONEYPLANT:   { f: 'bush', core: 0x3A6A22, leaf: [0x6AA83A, 0xC8D46A, 0x5A9630], big: 1, loose: 1, shape: [0.62, 0.38], spread: 0.8, flN: 0 },
  SYNGONIUM:    { f: 'bush', core: 0x5E8A50, leaf: [0xA6C88E, 0xD8B6AE, 0x86B070], big: 1, shape: [0.5, 0.55], spread: 0.6, flN: 0 },
  CHAMPA:       { f: 'champa', trunk: 0x7A7268, leaf: [0x3C7A2E, 0x4A8A36, 0x356E2A], fl: [0xFFF8F0, 0xFFF8F0, 0xF4B8C8], spread: 1.0 },
};
export const PLANT_KEYS = Object.keys(SP);
// light each plant wants (S = full sun, SS = semi-shade, B = either) — the planner's auto setup puts sun plants in the open, semi-shade ones by walls / under shade
export const PLANT_LIGHT = { OLIVE: 'B', BLACKFICUS: 'B', PACHIRA: 'B', ARECA: 'B', RHAPIS: 'SS', FISHTAIL: 'B', BAMBOO: 'B', PHOENIX: 'B', LIVISTONA: 'B', CYCAS: 'B', FOXTAIL: 'S', TRAVELLER: 'S', BANANA: 'S', HIBISCUS: 'S', IXORA: 'B', MOGRA: 'S', CHANDNI: 'B', RAATKIRANI: 'B', TECOMA: 'S', KANER: 'S', ADENIUM: 'S', BIRDPARADISE: 'B', CROTON: 'B', CORDYLINE: 'SS', SCHEFFLERA: 'B', SONGOFINDIA: 'SS', KAMINI: 'B', DURANTA: 'S', FICUSPANDA: 'B', MORPANKHI: 'S', FOUNTAINGRASS: 'S', AGAVE: 'S', SNAKEPLANT: 'B', BOUGAINVILLEA: 'S', MADHUMALTI: 'S', CHAMPA: 'S' };
export const hasPlant = k => !!SP[String(k || '').replace(/^LP-/, '').toUpperCase()];
// how wide the plant is (ft) at this height — the planner uses it for the footprint
export function plantSpread(key, h) { const s = SP[String(key).replace(/^LP-/, '').toUpperCase()]; return Math.max(1, Math.round((s ? s.spread : 0.7) * (+h || 3) * 2) / 2); }

let T = null; const GEO = {}, MAT = {};
const mat = (c, o) => { const k = c + '|' + JSON.stringify(o || {}); return MAT[k] || (MAT[k] = new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85, side: T.DoubleSide }, o || {}))); };
// a leaf lying along +x (length 1, width 1), flat in the x-y plane
function leafGeo(kind) { if (GEO[kind]) return GEO[kind]; const s = new T.Shape();
  if (kind === 'wedge') { s.moveTo(0, 0); s.lineTo(1, 0.5); s.lineTo(0.92, 0.2); s.lineTo(1, 0.05); s.lineTo(0.9, -0.15); s.lineTo(0.98, -0.45); s.lineTo(0, 0); }
  else if (kind === 'paddle') { s.moveTo(0, 0); s.quadraticCurveTo(0.15, 0.5, 0.55, 0.5); s.quadraticCurveTo(1, 0.45, 1, 0); s.quadraticCurveTo(1, -0.45, 0.55, -0.5); s.quadraticCurveTo(0.15, -0.5, 0, 0); }
  else { s.moveTo(0, 0); s.quadraticCurveTo(0.45, 0.5, 1, 0); s.quadraticCurveTo(0.45, -0.5, 0, 0); }
  return (GEO[kind] = new T.ShapeGeometry(s, 4)); }
// a long strap / blade (along +y), bent forward (+z) along its length — instanced and rotated round the stem
function strapGeo(kind) { if (GEO[kind]) return GEO[kind]; const g = new T.PlaneGeometry(1, 1, 1, 8), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 0.5, x = p.getX(i); const taper = kind === 'bleaf' ? Math.min(1, y * 8, (1 - y) * 6) : kind === 'sword' ? (1 - y * 0.85) : kind === 'blade' ? (1 - y * 0.9) : kind === 'agave' ? (1 - y) : (y < 0.15 ? 0.5 + y * 3.3 : 1 - (y - 0.15) * 0.6);
    const bend = kind === 'sword' ? 0.08 : kind === 'agave' ? 0.12 : kind === 'blade' ? 0.9 : kind === 'bleaf' ? 0.55 : 0.45; p.setXYZ(i, x * taper, y, bend * y * y); }
  g.computeVertexNormals(); return (GEO[kind] = g); }
const blobGeo = () => GEO.blob || (GEO.blob = new T.IcosahedronGeometry(1, 1));
const ballGeo = () => GEO.ball || (GEO.ball = new T.IcosahedronGeometry(1, 0));

// instanced batches: one InstancedMesh per (geometry, material) with a colour per instance
function Batch() { this.b = {}; }
Batch.prototype.add = function (geo, key, m4, col, mo) { const b = this.b[key] || (this.b[key] = { geo, mo, list: [] }); b.list.push([m4.clone(), col]); };
Batch.prototype.build = function (g) { Object.values(this.b).forEach(b => { if (!b.list.length) return; const im = new T.InstancedMesh(b.geo, mat(0xffffff, b.mo), b.list.length);
  const c = new T.Color(); b.list.forEach(([m, col], i) => { im.setMatrixAt(i, m); im.setColorAt(i, c.setHex(col)); }); im.castShadow = true; im.receiveShadow = true; g.add(im); }); };

const V = (x, y, z) => new T.Vector3(x, y, z), UP = () => V(0, 1, 0);
// matrix for a leaf: lies along dir, its width along wdir, size len × wid
function leafM(pos, dir, wdir, len, wid) { const x = dir.clone().normalize(), y = wdir.clone().sub(x.clone().multiplyScalar(x.dot(wdir))).normalize(), z = new T.Vector3().crossVectors(x, y);
  const m = new T.Matrix4().makeBasis(x, y, z); m.scale(V(len, wid, 1)); m.setPosition(pos); return m; }
function blobM(pos, r, sy) { return new T.Matrix4().compose(pos, new T.Quaternion(), V(r, r * (sy || 1), r)); }
function strapM(pos, yaw, tilt, len, wid, roll) { const q = new T.Quaternion().setFromEuler(new T.Euler(tilt, yaw, roll || 0, 'YXZ')); return new T.Matrix4().compose(pos, q, V(wid, len, 1)); }
function stick(g, a, b, r1, r2, c, seg) { const d = b.clone().sub(a), L = d.length(); const m = new T.Mesh(new T.CylinderGeometry(r2, r1, L, seg || 6), mat(c, { side: T.FrontSide }));
  m.position.copy(a.clone().add(b).multiplyScalar(0.5)); m.quaternion.setFromUnitVectors(UP(), d.normalize()); m.castShadow = true; g.add(m); return m; }
const pick = (rnd, a) => a[Math.floor(rnd() * a.length) % a.length];

// ---- fronds -----------------------------------------------------------------------------------------------
// a palm frond from p0 heading out along `out` (horizontal unit) at angle a0 above horizontal, arching down
function frond(B, rnd, sp, p0, out, a0, L, kind) { const up = UP(), N = kind === 'fish' ? 10 : 18, cols = sp.leaf;
  const dr = sp.droop || 0.55, at = t => p0.clone().add(out.clone().multiplyScalar(L * t * Math.cos(a0))).add(up.clone().multiplyScalar(L * t * Math.sin(a0) - L * dr * t * t));
  const side = new T.Vector3().crossVectors(out, up).normalize();
  for (let i = 1; i <= N; i++) { const t = 0.12 + (i / N) * 0.88, p = at(t), tg = at(Math.min(1, t + 0.03)).sub(p).normalize();
    const ll = L * (kind === 'fish' ? 0.2 : 0.34) * (1 - Math.abs(t - 0.45) * 0.9);
    if (kind === 'fox') { for (let j = 0; j < 6; j++) { const b = j / 6 * 6.283 + i, nrm = new T.Vector3().crossVectors(tg, side).normalize(), dir = side.clone().multiplyScalar(Math.cos(b)).add(nrm.multiplyScalar(Math.sin(b))).add(tg.clone().multiplyScalar(0.5)).add(V(0, -0.2, 0));
      B.add(leafGeo('leaf'), 'leaf', leafM(p, dir, tg, ll * 0.85, ll * 0.1), pick(rnd, cols), {}); } continue; }
    [-1, 1].forEach(sd => { const dir = side.clone().multiplyScalar(sd).add(tg.clone().multiplyScalar(0.45)).add(V(0, kind === 'fish' ? -0.15 : -(sp.droop ? 0.6 : 0.35) - t * 0.3, 0));
      if (kind === 'fish') { B.add(leafGeo('wedge'), 'wedge', leafM(p, dir, tg, ll, ll * 0.8), pick(rnd, cols), {}); B.add(leafGeo('wedge'), 'wedge', leafM(p.clone().add(dir.clone().normalize().multiplyScalar(ll * 0.5)), dir.clone().add(tg.clone().multiplyScalar(0.6)), tg, ll * 0.7, ll * 0.6), pick(rnd, cols), {}); }
      else B.add(leafGeo('leaf'), 'leaf', leafM(p, dir, tg, ll, ll * (sp.lw || 0.14)), pick(rnd, cols), {}); }); }
  return at; }
// a fan leaf (rhapis small / livistona big with drooping tips) at p, facing out
function fan(B, rnd, sp, p, out, r, segs, droop) { const up = UP(), side = new T.Vector3().crossVectors(out, up).normalize();
  for (let i = 0; i < segs; i++) { const a = -1.4 + (i / (segs - 1)) * 2.8, dir = out.clone().multiplyScalar(Math.cos(a)).add(side.clone().multiplyScalar(Math.sin(a))).add(V(0, 0.35, 0)).normalize();
    const wd = up.clone(); B.add(leafGeo('leaf'), 'leaf', leafM(p, dir, wd, r * (droop ? 0.6 : 1), r * (droop ? 0.12 : 0.3)), pick(rnd, sp.leaf), {});
    if (droop) { const q = p.clone().add(dir.clone().multiplyScalar(r * 0.58)); B.add(leafGeo('leaf'), 'leaf', leafM(q, dir.clone().add(V(0, -1.3, 0)), wd, r * 0.45, r * 0.07), pick(rnd, sp.leaf), {}); } } }

// ---- families -------------------------------------------------------------------------------------------
const FAM = {
  clump(g, B, rnd, sp, H, y0) { const n = sp.stems;
    for (let i = 0; i < n; i++) { const a = i / n * 6.283 + rnd() * 0.6, ht = (H - y0) * (sp.hmin != null ? sp.hmin + rnd() * (0.62 - sp.hmin * 0.4) : 0.45 + rnd() * 0.45), lean = sp.lean * (0.4 + rnd());
      const base = V(Math.cos(a) * 0.12, y0, Math.sin(a) * 0.12), top = base.clone().add(V(Math.cos(a) * ht * lean * 0.5, ht, Math.sin(a) * ht * lean * 0.5));
      stick(g, base, top, 0.045 * (H / 5 + 0.6), 0.03 * (H / 5 + 0.6), sp.stem, 5);
      const out = V(Math.cos(a), 0, Math.sin(a));
      if (sp.frond === 'fan') { for (let k = 0; k < sp.fans; k++) { const yy = top.y - k * ht * 0.22, aa = rnd() * 6.283, o = V(Math.cos(aa), 0, Math.sin(aa)), p = V(top.x, yy, top.z).add(o.clone().multiplyScalar(0.35)).add(V(0, 0.25, 0));
          stick(g, V(top.x, yy - 0.05, top.z), p, 0.015, 0.012, sp.stem, 4); fan(B, rnd, sp, p, o, 0.65 + H * 0.08, 8, false); } }
      else { const L = (H - y0) * (sp.fl || 0.5) * (0.8 + rnd() * 0.3), nf = sp.nf || 3;
        for (let k = 0; k < nf; k++) { const aa = a + (k - (nf - 1) / 2) * (sp.a0 ? 1.3 : 0.9) + rnd() * 0.4; frond(B, rnd, sp, top, V(Math.cos(aa), 0, Math.sin(aa)), (sp.a0 || 0.75) + rnd() * 0.4 - k * 0.12, L, sp.frond); } } } },
  bamboo(g, B, rnd, sp, H, y0) { const n = 16;
    for (let i = 0; i < n; i++) { const a = rnd() * 6.283, r = rnd() * 0.28, ht = (H - y0) * (0.7 + rnd() * 0.3), lean = 0.08 + rnd() * 0.1, base = V(Math.cos(a) * r, y0, Math.sin(a) * r), top = base.clone().add(V(Math.cos(a) * ht * lean, ht, Math.sin(a) * ht * lean));
      stick(g, base, top, 0.03, 0.022, sp.stem, 5);
      for (let k = 0; k < 9; k++) { const t = 0.35 + rnd() * 0.65, p = base.clone().lerp(top, t), aa = rnd() * 6.283, o = V(Math.cos(aa), 0, Math.sin(aa));
        for (let j = 0; j < 4; j++) { const d = o.clone().add(V((rnd() - 0.5) * 0.8, -0.3 - rnd() * 0.4, (rnd() - 0.5) * 0.8)); B.add(leafGeo('leaf'), 'leaf', leafM(p.clone().add(o.clone().multiplyScalar(0.05)), d, UP(), 0.45 + rnd() * 0.2, 0.08), pick(rnd, sp.leaf), {}); } } } },
  trunk(g, B, rnd, sp, H, y0) { const tr = sp.tr || 1, tH = (H - y0) * sp.tH; let top = V(0.05, y0 + tH, 0); stick(g, V(0, y0, 0), top, (0.14 + H * 0.02) * tr, (0.11 + H * 0.015) * tr, sp.trunk, 9);
    if (!sp.smooth) for (let k = 0; k < 6; k++) { const yy = y0 + tH * (0.2 + k * 0.14); B.add(ballGeo(), 'bark', blobM(V(0.02, yy, 0), (0.15 + H * 0.02) * tr, 0.4), sp.trunk, { roughness: 1 }); }   // the rough trunk
    else for (let k = 1; k < 8; k++) B.add(blobGeo(), 'ring', blobM(V(0.05 * k / 8, y0 + tH * k / 8, 0), (0.12 + H * 0.017) * tr, 0.04), 0x7A766C, { side: T.FrontSide });   // rings on a smooth trunk
    if (sp.crown) { const c2 = top.clone().add(V(0, (H - y0) * 0.14, 0)); stick(g, top, c2, (0.11 + H * 0.015) * tr * 0.95, (0.09 + H * 0.012) * tr, sp.crown, 9); top = c2; }
    const L = (H - y0) * sp.flen;
    for (let i = 0; i < sp.n; i++) { const a = i * 2.4 + rnd() * 0.3, tier = i / sp.n, out = V(Math.cos(a), 0, Math.sin(a)), a0 = 1.1 - tier * 1.2 + rnd() * 0.2;
      if (sp.frond === 'bigfan') { const p = top.clone().add(out.clone().multiplyScalar(L * 0.45 * Math.cos(a0))).add(V(0, L * 0.45 * Math.sin(a0), 0)); stick(g, top, p, 0.025, 0.018, sp.trunk, 4); fan(B, rnd, sp, p, out, L * 0.55, 13, true); }
      else frond(B, rnd, sp, top, out, sp.frond === 'fox' ? 0.95 - tier * 0.9 + rnd() * 0.2 : a0, L, sp.frond === 'fox' ? 'fox' : 'feather'); } },
  cycad(g, B, rnd, sp, H, y0) { const tH = (H - y0) * 0.3, top = V(0, y0 + tH, 0); stick(g, V(0, y0, 0), top, 0.2 + H * 0.05, 0.17 + H * 0.04, sp.trunk, 10);
    for (let k = 0; k < 5; k++) B.add(ballGeo(), 'bark', blobM(V(0, y0 + tH * (0.15 + k * 0.18), 0), 0.22 + H * 0.05, 0.35), sp.trunk, { roughness: 1 });
    const L = (H - y0) * 0.95;
    for (let i = 0; i < 22; i++) { const a = i * 2.4, out = V(Math.cos(a), 0, Math.sin(a)), a0 = 0.95 - (i / 22) * 0.6 + rnd() * 0.15, up = UP(), side = new T.Vector3().crossVectors(out, up);
      for (let t = 0.08; t <= 1; t += 0.035) { const p = top.clone().add(out.clone().multiplyScalar(L * t * Math.cos(a0))).add(V(0, L * t * Math.sin(a0) - L * 0.18 * t * t, 0)), ll = L * 0.14 * (1 - t * 0.6);
        [-1, 1].forEach(sd => B.add(leafGeo('leaf'), 'leaf', leafM(p, side.clone().multiplyScalar(sd).add(out.clone().multiplyScalar(0.8)).add(V(0, 0.25, 0)), out, ll, ll * 0.32), pick(rnd, sp.leaf), {})); } } },
  bush(g, B, rnd, sp, H, y0, W) { const [rx0, ry0] = sp.shape, h = H - y0, rx = Math.max(0.5, W / 2), ry = sp.tree ? h * (1 - sp.tree) / 2 : h * ry0, cy = y0 + h - ry, n = Math.round((sp.dense ? 620 : 480) * Math.min(1.8, 0.6 + h / 4));
    if (sp.tree) { stick(g, V(0, y0, 0), V(0, cy, 0), 0.07 + h * 0.012, 0.05 + h * 0.008, sp.trunk, 7); for (let k = 0; k < 4; k++) stick(g, V(0, cy - ry * 0.5, 0), V((rnd() - 0.5) * rx, cy + ry * 0.2, (rnd() - 0.5) * rx), 0.03, 0.02, sp.trunk, 4); }
    else for (let k = 0; k < 4; k++) stick(g, V(0, y0, 0), V((rnd() - 0.5) * rx * 0.6, cy, (rnd() - 0.5) * rx * 0.6), 0.04, 0.025, 0x5A4A36, 4);
    for (let k = 0; k < 7; k++) B.add(blobGeo(), 'core', blobM(V((rnd() - 0.5) * rx * 0.7, cy + (rnd() - 0.5) * ry * 0.7, (rnd() - 0.5) * rx * 0.7), rx * 0.45, ry / rx), sp.core || 0x22461E, { side: T.FrontSide, roughness: 1 });
    const ls = (sp.big ? 0.42 : sp.dense ? 0.2 : 0.28) * Math.min(1.4, 0.7 + h / 6);
    for (let i = 0; i < n; i++) { const u = rnd() * 6.283, v = Math.acos(2 * rnd() - 1), s = sp.loose ? 0.6 + rnd() * 0.5 : 0.72 + rnd() * 0.32, d = V(Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u));
      if (d.y < -0.55) continue; const p = V(d.x * rx * s, cy + d.y * ry * s, d.z * rx * s); const dir = d.clone().add(V(rnd() - 0.5, 0.2, rnd() - 0.5));
      B.add(leafGeo('leaf'), 'leaf', leafM(p, dir, UP(), ls * (0.8 + rnd() * 0.5), ls * (sp.narrow ? 0.18 : sp.big ? 0.55 : 0.5)), pick(rnd, sp.leaf), {}); }
    const fN = Math.round((sp.flN || 0) * Math.min(1.8, 0.6 + h / 4));
    for (let i = 0; i < fN; i++) { const u = rnd() * 6.283, v = Math.acos(1 - rnd() * 1.3), d = V(Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u)), p = V(d.x * rx * 1.02, cy + d.y * ry * 1.02, d.z * rx * 1.02);
      const c = pick(rnd, sp.fl), fs = sp.flS * (0.8 + rnd() * 0.4) * Math.min(1.3, 0.8 + h / 8);
      if (sp.cluster) for (let j = 0; j < 5; j++) B.add(ballGeo(), 'fl', blobM(p.clone().add(V((rnd() - 0.5) * fs * 1.6, (rnd() - 0.5) * fs, (rnd() - 0.5) * fs * 1.6)), fs * 0.55), c, { emissive: c, emissiveIntensity: 0.08, side: T.FrontSide });
      else B.add(ballGeo(), 'fl', blobM(p, fs, 0.6), c, { emissive: c, emissiveIntensity: 0.08, side: T.FrontSide }); } },
  strap(g, B, rnd, sp, H, y0) { const h = H - y0, n = sp.canes;
    for (let i = 0; i < n; i++) { const a = i / n * 6.283 + rnd(), ht = h * (0.45 + rnd() * 0.4) - (sp.top ? 0.5 : 0), base = V(Math.cos(a) * 0.08, y0, Math.sin(a) * 0.08), top = base.clone().add(V(Math.cos(a) * ht * 0.15, Math.max(0.3, ht), Math.sin(a) * ht * 0.15));
      stick(g, base, top, 0.04, 0.03, 0x6A5A44, 5);
      const whorls = sp.whorls ? 3 : 1;
      for (let w = 0; w < whorls; w++) { const p = base.clone().lerp(top, 1 - w * 0.3), nl = sp.whorls ? 24 : 34, len = (sp.whorls ? 0.55 : 0.85) * Math.min(1.5, 0.6 + h / 5);
        for (let k = 0; k < nl; k++) { const yaw = rnd() * 6.283, tilt = 0.2 + rnd() * 1.1; B.add(strapGeo('strap'), 'strap', strapM(p, yaw, tilt, len * (0.7 + rnd() * 0.4), len * (sp.whorls ? 0.09 : 0.13)), pick(rnd, sp.leaf), {}); } } }
    if (sp.top) for (let k = 0; k < 10; k++) B.add(strapGeo('strap'), 'strap', strapM(V(0, y0 + 0.1, 0), rnd() * 6.283, 0.5 + rnd() * 0.7, 0.7, 0.12), pick(rnd, sp.leaf), {}); },
  umbrella(g, B, rnd, sp, H, y0) { const h = H - y0;
    for (let i = 0; i < 8; i++) { const a = rnd() * 6.283, ht = h * (0.4 + rnd() * 0.55), top = V(Math.cos(a) * ht * 0.18, y0 + ht, Math.sin(a) * ht * 0.18); stick(g, V(0, y0, 0), top, 0.04, 0.025, sp.stem, 5);
      for (let j = 0; j < 6; j++) { const aa = rnd() * 6.283, o = V(Math.cos(aa), 0, Math.sin(aa)), r = 0.25 + rnd() * h * 0.1, p = top.clone().add(o.clone().multiplyScalar(r)).add(V(0, -rnd() * 0.3, 0)); stick(g, top, p, 0.01, 0.01, 0x5E7A3A, 3);
        for (let k = 0; k < 7; k++) { const b = k / 7 * 6.283, d = V(Math.cos(b), 0.15, Math.sin(b)); B.add(leafGeo('leaf'), 'leaf', leafM(p, d, V(0, 1, 0).cross(d).cross(d).negate(), 0.42 + h * 0.04, 0.17), pick(rnd, sp.leaf), {}); } } } },
  topiary(g, B, rnd, sp, H, y0) { const h = H - y0, ball = h > 3.2, r = ball ? h * 0.24 : h * 0.4, cy = y0 + h - r; if (ball) stick(g, V(0, y0, 0), V(0, cy, 0), 0.07, 0.05, sp.trunk, 6);
    B.add(blobGeo(), 'core', blobM(V(0, cy, 0), r * 0.92), sp.leaf[0], { side: T.FrontSide });
    for (let i = 0; i < 260; i++) { const u = rnd() * 6.283, v = Math.acos(2 * rnd() - 1), d = V(Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u)); if (!ball && d.y < -0.5) continue;
      B.add(leafGeo('leaf'), 'leaf', leafM(V(0, cy, 0).add(d.clone().multiplyScalar(r * 0.98)), d.clone().add(V(rnd() - 0.5, 0.3, rnd() - 0.5)), UP(), 0.16, 0.11), pick(rnd, sp.leaf), {}); } },
  cone(g, B, rnd, sp, H, y0, W) { const h = H - y0, R = W / 2;
    for (let i = 0; i < 420; i++) { const t = rnd(), y = y0 + 0.2 + t * (h - 0.2), r = R * (1 - t) * (0.85 + rnd() * 0.2), a = rnd() * 6.283, p = V(Math.cos(a) * r, y, Math.sin(a) * r);
      B.add(ballGeo(), 'tuft', new T.Matrix4().compose(p, new T.Quaternion().setFromEuler(new T.Euler(0, -a, 0.9 + rnd() * 0.4)), V(0.08, 0.32, 0.18)), pick(rnd, sp.leaf), { side: T.FrontSide }); }
    B.add(blobGeo(), 'core', new T.Matrix4().compose(V(0, y0 + h * 0.4, 0), new T.Quaternion(), V(R * 0.75, h * 0.42, R * 0.75)), sp.leaf[1], { side: T.FrontSide }); },
  grass(g, B, rnd, sp, H, y0) { const h = H - y0;
    for (let i = 0; i < 90; i++) B.add(strapGeo('blade'), 'blade', strapM(V((rnd() - 0.5) * 0.25, y0, (rnd() - 0.5) * 0.25), rnd() * 6.283, sp.arch ? 0.5 + rnd() * 0.9 : 0.15 + rnd() * 0.75, h * (sp.arch ? 0.9 + rnd() * 0.5 : 0.6 + rnd() * 0.35), sp.bw || 0.06), pick(rnd, sp.leaf), {});
    if (sp.plume) for (let i = 0; i < 14; i++) { const yaw = rnd() * 6.283, tilt = 0.25 + rnd() * 0.45, L = h * (0.85 + rnd() * 0.2), d = V(Math.sin(yaw) * Math.sin(tilt), Math.cos(tilt), Math.cos(yaw) * Math.sin(tilt)), tip = V(0, y0, 0).add(d.clone().multiplyScalar(L));
      stick(g, V(0, y0, 0), tip, 0.008, 0.006, 0x7E5A3A, 3);
      B.add(ballGeo(), 'plume', new T.Matrix4().compose(tip.clone().add(d.clone().multiplyScalar(-0.25)).add(V(Math.sin(yaw) * 0.12, -0.1, Math.cos(yaw) * 0.12)), new T.Quaternion().setFromUnitVectors(UP(), d.clone().add(V(Math.sin(yaw) * 0.8, -0.6, Math.cos(yaw) * 0.8)).normalize()), V(0.07, 0.45, 0.07)), sp.plume, { roughness: 1, side: T.FrontSide }); } },
  agave(g, B, rnd, sp, H, y0) { const h = H - y0;
    for (let i = 0; i < 26; i++) { const tier = i / 26, yaw = i * 2.4, tilt = 0.2 + tier * 1.05 + rnd() * 0.1, L = h * (1.25 - tier * 0.45);
      const m = new T.Mesh(new T.ConeGeometry(0.16 + h * 0.03, L, 4, 1), mat(pick(rnd, sp.leaf), { roughness: 0.55, side: T.FrontSide })); m.scale.z = 0.35; const d = V(Math.sin(yaw) * Math.sin(tilt), Math.cos(tilt), Math.cos(yaw) * Math.sin(tilt));
      m.quaternion.setFromUnitVectors(UP(), d); m.position.copy(V(0, y0 + 0.05, 0).add(d.clone().multiplyScalar(L / 2))); m.castShadow = true; g.add(m); } },
  snake(g, B, rnd, sp, H, y0) { const h = H - y0;
    for (let i = 0; i < 24; i++) { const p = V((rnd() - 0.5) * 0.45, y0, (rnd() - 0.5) * 0.45), L = h * (0.55 + rnd() * 0.45); B.add(strapGeo('sword'), 'sword', strapM(p, rnd() * 6.283, (rnd() - 0.5) * 0.25, L, 0.2), pick(rnd, sp.leaf), { roughness: 0.5 });
      B.add(strapGeo('sword'), 'edge', strapM(p.clone().add(V(0, 0.01, 0)), rnd() * 6.283, (rnd() - 0.5) * 0.2, L * 0.98, 0.06), sp.edge, { roughness: 0.5 }); } },
  paddle(g, B, rnd, sp, H, y0) { const h = H - y0;
    for (let i = 0; i < 19; i++) { const a = rnd() * 6.283, L = h * (0.4 + rnd() * 0.4), d = V(Math.cos(a) * 0.25, 1, Math.sin(a) * 0.25).normalize(), tip = V(0, y0, 0).add(d.clone().multiplyScalar(L)); stick(g, V(0, y0, 0), tip, 0.025, 0.02, 0x6E8A6E, 4);
      B.add(leafGeo('paddle'), 'paddle', leafM(tip, d.clone().add(V(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3)), V(-Math.sin(a), 0, Math.cos(a)), h * 0.34, h * 0.2), pick(rnd, sp.leaf), {}); }
    for (let i = 0; i < 3; i++) { const a = rnd() * 6.283, tip = V(Math.cos(a) * 0.25, y0 + h * (0.55 + rnd() * 0.2), Math.sin(a) * 0.25); stick(g, V(0, y0, 0), tip, 0.02, 0.018, 0x6E8A6E, 4);
      const o = V(Math.cos(a), 0.15, Math.sin(a)).normalize(); B.add(leafGeo('leaf'), 'beak', leafM(tip, o, UP(), 0.45, 0.12), 0x3E6A6A, {});
      for (let k = 0; k < 4; k++) B.add(leafGeo('leaf'), 'crest', leafM(tip.clone().add(o.clone().multiplyScalar(0.1)), V(o.x * 0.4, 1, o.z * 0.4).add(V((rnd() - 0.5) * 0.6, 0, (rnd() - 0.5) * 0.6)), o, 0.32, 0.07), k === 3 ? 0x3A5ABE : pick(rnd, sp.fl), { emissive: 0x401800, emissiveIntensity: 0.1 }); } },
  adenium(g, B, rnd, sp, H, y0) { const h = H - y0, cr = 0.18 + h * 0.09; B.add(blobGeo(), 'bark', blobM(V(0, y0 + cr * 0.8, 0), cr, 0.85), sp.trunk, { roughness: 0.9, side: T.FrontSide });
    for (let i = 0; i < 6; i++) { const a = rnd() * 6.283, top = V(Math.cos(a) * h * 0.22, y0 + h * (0.6 + rnd() * 0.3), Math.sin(a) * h * 0.22); stick(g, V(0, y0 + cr * 1.2, 0), top, 0.07, 0.04, sp.trunk, 6);
      for (let k = 0; k < 20; k++) B.add(leafGeo('leaf'), 'leaf', leafM(top.clone().add(V((rnd() - 0.5) * 0.15, -rnd() * 0.15, (rnd() - 0.5) * 0.15)), V(rnd() - 0.5, 0.5, rnd() - 0.5), UP(), 0.38, 0.15), pick(rnd, sp.leaf), {});
      for (let k = 0; k < 3; k++) { const c = pick(rnd, sp.fl), p = top.clone().add(V((rnd() - 0.5) * 0.3, 0.05 + rnd() * 0.1, (rnd() - 0.5) * 0.3)); for (let j = 0; j < 5; j++) { const b = j / 5 * 6.283; B.add(leafGeo('paddle'), 'petal', leafM(p, V(Math.cos(b), 0.5, Math.sin(b)), UP(), 0.13, 0.11), c, { emissive: c, emissiveIntensity: 0.08 }); } } } },
  champa(g, B, rnd, sp, H, y0) { const h = H - y0, t0 = V(0, y0 + h * 0.3, 0); stick(g, V(0, y0, 0), t0, 0.12 + h * 0.014, 0.1 + h * 0.012, sp.trunk, 8);
    const tips = []; for (let i = 0; i < 5; i++) { const a = i * 1.257 + rnd() * 0.5, b1 = t0.clone().add(V(Math.cos(a) * h * 0.16, h * 0.2, Math.sin(a) * h * 0.16)); stick(g, t0, b1, 0.085, 0.07, sp.trunk, 6);
      for (let j = 0; j < 2; j++) { const aa = a + (j - 0.5) * 1.0, b2 = b1.clone().add(V(Math.cos(aa) * h * 0.13, h * (0.16 + rnd() * 0.08), Math.sin(aa) * h * 0.13)); stick(g, b1, b2, 0.065, 0.05, sp.trunk, 6);
        for (let m = 0; m < 2; m++) { const ab = aa + (m - 0.5) * 0.8, b3 = b2.clone().add(V(Math.cos(ab) * h * 0.08, h * (0.1 + rnd() * 0.08), Math.sin(ab) * h * 0.08)); stick(g, b2, b3, 0.045, 0.038, sp.trunk, 5); tips.push(b3); } } }
    tips.forEach(p => { for (let k = 0; k < 24; k++) { const b = k / 24 * 6.283 + rnd() * 0.3; B.add(leafGeo('leaf'), 'leaf', leafM(p, V(Math.cos(b), 0.3 + rnd() * 0.7, Math.sin(b)), UP(), 0.9 + h * 0.06, 0.42), pick(rnd, sp.leaf), {}); }
      const c = pick(rnd, sp.fl); for (let k = 0; k < 7; k++) { const q = p.clone().add(V((rnd() - 0.5) * 0.5, 0.5 + rnd() * 0.3, (rnd() - 0.5) * 0.5)); for (let j = 0; j < 5; j++) { const b = j / 5 * 6.283 + k; B.add(leafGeo('paddle'), 'petal', leafM(q, V(Math.cos(b), 0.35, Math.sin(b)), UP(), 0.3, 0.24), c, { emissive: c, emissiveIntensity: 0.08 }); }
        B.add(ballGeo(), 'eye', blobM(q.clone().add(V(0, 0.03, 0)), 0.06), 0xF5C518, { side: T.FrontSide }); } }); },
  pachira(g, B, rnd, sp, H, y0) { const h = H - y0, tH = h * 0.5, n = 3;
    for (let j = 0; j < n; j++) { let prev = V(Math.cos(j * 2.09) * 0.07, y0, Math.sin(j * 2.09) * 0.07); for (let k = 1; k <= 8; k++) { const a = j * 2.09 + k * 0.9, p = V(Math.cos(a) * 0.07, y0 + tH * k / 8, Math.sin(a) * 0.07); stick(g, prev, p, 0.045, 0.04, sp.trunk, 6); prev = p; } }   // the braided trunk
    const top = V(0, y0 + tH, 0);
    for (let i = 0; i < 26; i++) { const a = i * 2.4 + rnd() * 0.3, up = 0.25 + rnd() * 1.0, L = h * (0.14 + rnd() * 0.14), d = V(Math.cos(a) * Math.cos(up), Math.sin(up), Math.sin(a) * Math.cos(up)), p = top.clone().add(V(0, rnd() * h * 0.12, 0)).add(d.clone().multiplyScalar(L)); stick(g, top, p, 0.015, 0.012, 0x6E8A3A, 4);
      for (let k = 0; k < 5; k++) { const b = (k - 2) * 0.45, lf = d.clone().applyAxisAngle(V(0, 1, 0), b).add(V(0, -0.15, 0)); B.add(leafGeo('leaf'), 'leaf', leafM(p, lf, UP(), (0.6 + h * 0.05) * (k === 2 ? 1 : 0.85), 0.28 + h * 0.02), pick(rnd, sp.leaf), {}); } } },
  banana(g, B, rnd, sp, H, y0) { const h = H - y0, top = V(0, y0 + h * 0.45, 0); stick(g, V(0, y0, 0), top, 0.16 + h * 0.02, 0.12 + h * 0.015, sp.stem, 10);
    for (let i = 0; i < 8; i++) { const yaw = i * 2.4 + rnd() * 0.3, tilt = 0.2 + (i / 8) * 0.9 + rnd() * 0.15, L = h * (0.55 + rnd() * 0.15), d = V(Math.sin(yaw) * Math.sin(tilt * 0.6), Math.cos(tilt * 0.6), Math.cos(yaw) * Math.sin(tilt * 0.6)), b = top.clone().add(d.clone().multiplyScalar(h * 0.12));
      stick(g, top, b, 0.03, 0.025, sp.stem, 4); B.add(strapGeo('bleaf'), 'bleaf', strapM(b, yaw, tilt, L, L * 0.34, (rnd() - 0.5) * 0.6), pick(rnd, sp.leaf), {}); } },
  ravenala(g, B, rnd, sp, H, y0) { const h = H - y0, yaw = (+rnd() * 6.283), top = V(0, y0 + h * 0.22, 0); stick(g, V(0, y0, 0), top, 0.16 + h * 0.02, 0.14 + h * 0.018, sp.trunk, 9);
    const ax = V(Math.cos(yaw), 0, Math.sin(yaw));   // the fan stands in one plane
    for (let i = 0; i < 13; i++) { const a = -1.25 + (i / 12) * 2.5, d = ax.clone().multiplyScalar(Math.sin(a)).add(V(0, Math.cos(a), 0)).normalize(), pl = h * (0.38 - Math.abs(a) * 0.06), b = top.clone().add(d.clone().multiplyScalar(pl));
      stick(g, top, b, 0.035, 0.03, 0x7E8A5A, 4); const dd = ax.clone().multiplyScalar(Math.sin(a * 1.15)).add(V(0, Math.cos(a * 1.15), 0)).normalize(), wd = new T.Vector3().crossVectors(new T.Vector3().crossVectors(ax, UP()), dd);
      B.add(leafGeo('paddle'), 'paddle', leafM(b, dd, wd, h * 0.42, h * 0.15), pick(rnd, sp.leaf), {}); } },
  climber(g, B, rnd, sp, H, y0) { const h = H - y0;   // in its bag with a tall bamboo support, climbing and spilling
    [-1, 1].forEach(s => stick(g, V(s * 0.15, y0, 0), V(s * 0.08, H, 0), 0.02, 0.018, 0xB89A62, 4));
    for (let i = 0; i < 420; i++) { const t = Math.sqrt(rnd()), a = t * 14 + rnd() * 6, r = 0.2 + rnd() * 0.45 + (t > 0.75 ? (t - 0.75) * 3 : 0), p = V(Math.cos(a) * r, y0 + 0.2 + t * (h - 0.1) - (t > 0.85 ? rnd() * 0.6 : 0), Math.sin(a) * r);
      B.add(leafGeo('leaf'), 'leaf', leafM(p, V(Math.cos(a), rnd() - 0.3, Math.sin(a)), UP(), 0.3, 0.18), pick(rnd, sp.leaf), {});
      if (t > 0.25 && rnd() < sp.flF) { const c = pick(rnd, sp.fl); B.add(ballGeo(), 'fl', blobM(p.clone().add(V(Math.cos(a) * 0.08, 0, Math.sin(a) * 0.08)), 0.09 + rnd() * 0.05), c, { emissive: c, emissiveIntensity: 0.08, side: T.FrontSide }); } } },
};

// the grow bag / pot: black nursery bag (bag inches = its diameter) or a grey ceramic pot
function container(g, kind, inch, H) { if (kind === 'none') { const s = new T.Mesh(new T.CylinderGeometry(0.5, 0.55, 0.05, 16), mat(0x4A3A2A, { side: T.FrontSide })); s.position.y = 0.025; g.add(s); return 0.05; }
  const r = Math.max(0.3, (inch || 12) / 24), h = kind === 'pot' ? r * 1.5 : r * 1.6;
  const m = new T.Mesh(new T.CylinderGeometry(r, r * (kind === 'pot' ? 0.75 : 0.95), h, 18), mat(kind === 'pot' ? 0x6A6A66 : 0x1C1C1C, { roughness: kind === 'pot' ? 0.55 : 0.95, side: T.FrontSide }));
  m.position.y = h / 2; m.castShadow = m.receiveShadow = true; g.add(m);
  const soil = new T.Mesh(new T.CircleGeometry(r * 0.95, 18), mat(0x3E2E20, { side: T.FrontSide })); soil.rotation.x = -Math.PI / 2; soil.position.y = h - 0.04; g.add(soil); return h - 0.04; }

const POT = { ADENIUM: 'pot', AGAVE: 'pot', SNAKEPLANT: 'pot' };
const CACHE = {};   // one build per plant + size + pot; every copy on the plan is a clone (turned for variety by the caller)
export function plantModel(THREE, key, hFt, opts) { const ck = [key, Math.round((+hFt || 3) * 2) / 2, (opts || {}).pot || '', (opts || {}).seed || ''].join('|'); if (!CACHE[ck]) CACHE[ck] = build(THREE, key, hFt, opts); return CACHE[ck].clone(); }
function build(THREE, key, hFt, opts) { T = THREE; const k = String(key || '').replace(/^LP-/, '').toUpperCase(), sp = SP[k] || SP.HIBISCUS, o = opts || {};
  const H = Math.max(1.2, +hFt || 3), g = new T.Group(); g.userData.plant = k;
  const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)((Math.abs(Math.round(+o.seed || 7)) % 2147483000) + 13);
  const y0 = container(g, o.pot || POT[k] || 'bag', o.bag || (H <= 3 ? 10 : H <= 5 ? 12 : H <= 7 ? 16 : 18), H);
  const B = new Batch(); (FAM[sp.f] || FAM.bush)(g, B, rnd, sp, H, y0, plantSpread(k, H) * 0.9); B.build(g); return g; }
