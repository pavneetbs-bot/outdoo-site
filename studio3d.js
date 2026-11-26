// outrr design studio (283): the basic setting every "Customise & check price" designer opens in — shared by the pergola,
// cabin, bar, feature wall… designers. Plain grey 2 × 4 ft tiles, a soft ground beyond, a 3 ft parapet / wall where the
// element usually stands against one, and a 5 ft 9 in person for scale (no furniture / planters). Units: feet, y up.
import * as THREE from './vendor/three/three.module.min.js';
import { layCanvas, layPeriod } from './floorlay.js?v=5';
const M = {}, mat = (k, o) => M[k] || (M[k] = new THREE.MeshStandardMaterial(o));
let STX = null;
export function studioFloor(g, x0, z0, w, d, y) {
  y = y || 0;
  if (!STX) { const P = layPeriod('studio_grey'), L = layCanvas('studio_grey', 96), t = new THREE.CanvasTexture(L.cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; STX = { t, P }; }
  const geo = new THREE.PlaneGeometry(w, d), uv = geo.attributes.uv, ps = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (x0 + w / 2 + ps.getX(i)) / STX.P[0], (z0 + d / 2 - ps.getY(i)) / STX.P[1]);
  const m = new THREE.Mesh(geo, mat('floor', { map: STX.t, roughness: 0.9 })); m.rotation.x = -Math.PI / 2; m.position.set(x0 + w / 2, y + 0.005, z0 + d / 2); m.receiveShadow = true; m.userData.studio = 1; g.add(m);
  const far = new THREE.Mesh(new THREE.CircleGeometry(Math.max(w, d) * 2.2, 48), mat('ground', { color: 0xE4E1DA, roughness: 1 })); far.rotation.x = -Math.PI / 2; far.position.set(x0 + w / 2, y - 0.01, z0 + d / 2); far.receiveShadow = true; g.add(far);
  return m;
}
// a wall / parapet from (x0, z0) to (x1, z1) on the floor, h high, t thick (the face on the left of the run is the inside)
export function wall(g, x0, z0, x1, z1, h, t, y) {
  y = y || 0; t = t || 0.75; const L = Math.hypot(x1 - x0, z1 - z0), b = new THREE.Mesh(new THREE.BoxGeometry(L, h, t), mat('wall', { color: 0xE9E5DE, roughness: 0.95 }));
  b.position.set((x0 + x1) / 2, y + h / 2, (z0 + z1) / 2); b.rotation.y = -Math.atan2(z1 - z0, x1 - x0); b.castShadow = b.receiveShadow = true; g.add(b);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(L + 0.1, 0.12, t + 0.12), mat('cap', { color: 0xD9D4CB, roughness: 0.9 })); cap.position.set(b.position.x, y + h + 0.06, b.position.z); cap.rotation.y = b.rotation.y; cap.castShadow = true; g.add(cap);
  return b;
}
export function person(g, x, z, ry, y) {   // a plain grey figure, 5 ft 9 in
  const p = new THREE.Group(), sk = mat('pSkin', { color: 0xC9B8A6, roughness: 0.8 }), cl = mat('pCloth', { color: 0x5B6068, roughness: 0.9 }), pt = mat('pPant', { color: 0x3A3D42, roughness: 0.9 });
  const cyl = (rt, rb, h, m, px, py, pz) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 14), m); c.position.set(px, py, pz); c.castShadow = true; p.add(c); return c; };
  cyl(0.2, 0.17, 2.85, pt, -0.24, 1.43, 0); cyl(0.2, 0.17, 2.85, pt, 0.24, 1.43, 0);
  const sh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.62), pt); sh.position.set(-0.24, 0.08, 0.12); p.add(sh); const sh2 = sh.clone(); sh2.position.x = 0.24; p.add(sh2);
  const tor = cyl(0.62, 0.5, 2.0, cl, 0, 3.85, 0); tor.scale.z = 0.62;
  const a1 = cyl(0.13, 0.11, 2.2, cl, -0.72, 3.75, 0); a1.rotation.z = 0.06; const a2 = cyl(0.13, 0.11, 2.2, cl, 0.72, 3.75, 0); a2.rotation.z = -0.06;
  cyl(0.15, 0.17, 0.3, sk, 0, 4.98, 0);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 16), sk); hd.scale.set(0.95, 1.12, 1); hd.position.set(0, 5.32, 0); hd.castShadow = true; p.add(hd);
  p.position.set(x, y || 0, z); p.rotation.y = ry || 0; p.userData.person = 1; g.add(p); return p;
}
