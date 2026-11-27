// outrr design studio — gates & doors (309, owner: "baki categories ke 3D models"): all 58 outrr gates (MTO-GT-*) drawn live
// at the customer's width × height in the picked colour. Each leaf's face is drawn from its design (frame, bars, louvres,
// glass, perforated / solid panels, teak / walnut boards, jaali, chevron / V flutes, gold lines…) onto a canvas — colour +
// see-through parts — and set in a steel frame. Setting by family: GL = a glass door in a stairs-room (mumty) wall, MM = a
// terrace gate between parapet walls / a stairs-room doorway, MS / WD = a main gate between boundary walls and pillars on a
// driveway, with the matching wicket door and the top frame (portal) when picked. Units: feet, y up; the street side is +z.
import * as THREE from './vendor/three/three.module.min.js';
import { studioFloor, person } from './studio3d.js?v=7';

const M = {};
const mt = (k, o) => M[k] || (M[k] = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.7 }, o)));
function bx(g, w, h, d, x, y, z, m) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b; }
const MET = { black: '#1E1F21', charcoal: '#3A3C3F', grey: '#6F7377', bronze: '#4E3D2C' };
export function metalOf(name) { const s = name || ''; return /bronze/i.test(s) ? 'bronze' : /charcoal/i.test(s) ? 'charcoal' : /grey|gray/i.test(s) ? 'grey' : 'black'; }

// ---- the leaf face, drawn in feet: c = colour canvas, a = alpha canvas (white = solid, black = open), k = px per ft
function painter(w, h, k, P) {
  const W = Math.round(w * k), H = Math.round(h * k), mk = () => { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; return cv; };
  const C = mk(), A = mk(), c = C.getContext('2d'), a = A.getContext('2d');
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16), r = Math.min(255, Math.max(0, ((n >> 16) & 255) * f)), g = Math.min(255, Math.max(0, ((n >> 8) & 255) * f)), b = Math.min(255, Math.max(0, (n & 255) * f)); return `rgb(${r | 0},${g | 0},${b | 0})`; };
  const D = {
    W: w, H: h, P,
    // a rectangle in feet from the top-left; fill = colour string; alpha 0..1
    r(x, y, rw, rh, fill, al) { c.fillStyle = fill; c.fillRect(x * k, y * k, rw * k, rh * k); const v = Math.round((al == null ? 1 : al) * 255); a.fillStyle = `rgb(${v},${v},${v})`; a.fillRect(x * k, y * k, rw * k, rh * k); },
    met(x, y, rw, rh, f) { this.r(x, y, rw, rh, f ? shade(P.m, f) : P.m, 1); },
    open(x, y, rw, rh) { this.r(x, y, rw, rh, '#000', 0); },
    glass(x, y, rw, rh) { this.r(x, y, rw, rh, '#B9CDD2', 0.32); },
    frost(x, y, rw, rh) { this.r(x, y, rw, rh, '#E9EDEA', 0.85); },
    gold(x, y, rw, rh) { this.r(x, y, rw, rh, '#B58E4C', 1); },
    led(x, y, rw, rh) { this.r(x, y, rw, rh, '#FFD9A0', 1); D.glow.push([x, y, rw, rh]); },
    wood(x, y, rw, rh, dir, tone) { const base = tone || P.w; for (let i = 0, s = 0.35; ; i++) { const p = i * s; if (p >= (dir === 'h' ? rh : rw)) break; const f = 0.9 + ((i * 37) % 7) / 30;
        if (dir === 'h') this.r(x, y + p, rw, Math.min(s, rh - p), shade(base, f)); else this.r(x + p, y, Math.min(s, rw - p), rh, shade(base, f));
        c.fillStyle = 'rgba(30,18,8,.35)'; if (dir === 'h') c.fillRect(x * k, (y + p) * k, rw * k, 1.2); else c.fillRect((x + p) * k, y * k, 1.2, rh * k); }
      c.strokeStyle = 'rgba(60,35,15,.18)'; for (let i = 0; i < rw * rh * 6; i++) { const px = x + ((i * 7919) % 997) / 997 * rw, py = y + ((i * 104729) % 991) / 991 * rh; c.beginPath(); c.moveTo(px * k, py * k); if (dir === 'h') c.lineTo((px + 0.4) * k, py * k); else c.lineTo(px * k, (py + 0.4) * k); c.stroke(); } },
    // bars across a box: dir v (vertical bars) / h; bar + gap in inches; the rest open (or glass)
    bars(x, y, rw, rh, dir, bar, gap, back) { (back === 'glass' ? this.glass : back === 'solid' ? (X, Y, Ww, Hh) => this.met(X, Y, Ww, Hh, 0.8) : this.open).call(this, x, y, rw, rh);
      const b = bar / 12, g2 = gap / 12, len = dir === 'v' ? rw : rh, n = Math.max(1, Math.floor((len + g2) / (b + g2))), s0 = (len - (n * b + (n - 1) * g2)) / 2;
      for (let i = 0; i < n; i++) { const p = s0 + i * (b + g2); if (dir === 'v') this.met(x + p, y, b, rh); else this.met(x, y + p, rw, b); } },
    louvre(x, y, rw, rh, pitch) { const p = (pitch || 4) / 12; this.open(x, y, rw, rh); for (let yy = y; yy < y + rh - 0.02; yy += p) { this.met(x, yy, rw, p * 0.55, 1.15); this.met(x, yy + p * 0.55, rw, p * 0.12, 0.6); } },
    grooves(x, y, rw, rh, dir, n, depth) { this.met(x, y, rw, rh); for (let i = 1; i < n + 1; i++) { const t = i / (n + 1); if (dir === 'h') { this.met(x, y + rh * t, rw, depth || 0.05, 0.45); this.met(x, y + rh * t + (depth || 0.05), rw, 0.02, 1.4); } else { this.met(x + rw * t, y, depth || 0.05, rh, 0.45); this.met(x + rw * t + (depth || 0.05), y, 0.02, rh, 1.4); } } },
    perf(x, y, rw, rh, hole) { this.met(x, y, rw, rh); const s = (hole || 1) / 12 * 2.2, d = (hole || 1) / 12; for (let yy = y + s / 2; yy < y + rh - d; yy += s) for (let xx = x + s / 2 + ((Math.round((yy - y) / s) % 2) ? s / 2 : 0); xx < x + rw - d; xx += s) this.open(xx, yy, d, d); },
    jali(x, y, rw, rh, cell) { const s = (cell || 6) / 12, t = s * 0.22; this.open(x, y, rw, rh); for (let yy = y; yy <= y + rh + 0.01; yy += s) this.met(x, Math.min(yy, y + rh - t), rw, t); for (let xx = x; xx <= x + rw + 0.01; xx += s) this.met(Math.min(xx, x + rw - t), y, t, rh);
      for (let yy = y + s / 2; yy < y + rh; yy += s) for (let xx = x + s / 2; xx < x + rw; xx += s) { c.save(); c.translate(xx * k, yy * k); c.rotate(Math.PI / 4); c.fillStyle = P.m; c.fillRect(-s * 0.22 * k, -s * 0.22 * k, s * 0.44 * k, s * 0.44 * k); c.restore(); a.save(); a.translate(xx * k, yy * k); a.rotate(Math.PI / 4); a.fillStyle = '#fff'; a.fillRect(-s * 0.22 * k, -s * 0.22 * k, s * 0.44 * k, s * 0.44 * k); a.restore(); } },
    diag(x, y, rw, rh, ang, tone) {   // boards at an angle (chevron / V) — clipped to the box
      this.r(x, y, rw, rh, shade(tone || P.w, 0.9)); c.save(); c.beginPath(); c.rect(x * k, y * k, rw * k, rh * k); c.clip(); c.translate((x + rw / 2) * k, (y + rh / 2) * k); c.rotate(ang);
      const L = Math.hypot(rw, rh) * k; for (let i = -L, j = 0; i < L; i += 0.35 * k, j++) { c.fillStyle = shade(tone || P.w, 0.88 + (j * 37 % 7) / 28); c.fillRect(-L, i, 2 * L, 0.35 * k); c.fillStyle = 'rgba(30,18,8,.35)'; c.fillRect(-L, i, 2 * L, 1.2); } c.restore(); },
    frame(t) { t = (t || 2) / 12; this.met(0, 0, w, t); this.met(0, h - t, w, t); this.met(0, 0, t, h); this.met(w - t, 0, t, h); return t; },
    handle(side) { const x = side === 'l' ? 0.35 : w - 0.42; this.met(x, h * 0.42, 0.07, 1.1, 1.5); },
    glow: []
  };
  return { D, C, A, shade };
}

// every design: draw(D, leaf index, leaves) — sizes in feet, D.W × D.H is one leaf
const vb = (D, x, y, w, h, bar, gap, back) => D.bars(x, y, w, h, 'v', bar, gap, back), hb = (D, x, y, w, h, bar, gap, back) => D.bars(x, y, w, h, 'h', bar, gap, back);
const G = {
  // glass doors in a stairs-room wall
  GL01: D => { const t = D.frame(2.5); D.glass(t, t, D.W - 2 * t, D.H - 2 * t); for (let i = 1; i <= 3; i++) D.met(t, D.H * i / 4, D.W - 2 * t, 0.12); D.handle('r'); },
  GL02: D => { const t = D.frame(2.5); D.glass(t, t, D.W - 2 * t, D.H - 2 * t); D.met(t, D.H * 0.5, D.W - 2 * t, 0.14); D.handle('r'); },
  GL03: D => { const t = D.frame(2.5); D.glass(t, t, D.W - 2 * t, D.H - 2 * t); D.handle('r'); },
  GL04: D => { const t = D.frame(2.5); D.glass(t, t, D.W - 2 * t, D.H - 2 * t); D.met(t, D.H * 0.32, D.W - 2 * t, 0.12); D.met(D.W / 2 - 0.06, D.H * 0.32, 0.12, D.H * 0.68 - t); D.handle('r'); },
  GL05: D => { const t = D.frame(2.5); D.glass(t, t, D.W - 2 * t, D.H - 2 * t); const p = 0.45; D.met(t + p, t, 0.08, D.H - 2 * t); D.met(D.W - t - p - 0.08, t, 0.08, D.H - 2 * t); D.met(t, t + p, D.W - 2 * t, 0.08); D.met(t, D.H - t - p - 0.08, D.W - 2 * t, 0.08); D.handle('r'); },
  GL06: D => { const t = D.frame(2.5); D.glass(t, t, D.W - 2 * t, D.H - 2 * t); [0.3, 0.42, 0.54].forEach(u => D.met(D.W * u, t, 0.1, D.H - 2 * t)); D.met(t, D.H * 0.33, D.W - 2 * t, 0.1); D.met(D.W * 0.3, D.H * 0.66, D.W * 0.7 - t, 0.1); D.handle('r'); },
  GL07: D => { const t = D.frame(2); D.open(t, t, D.W - 2 * t, D.H - 2 * t); [0.22, 0.48, 0.62].forEach(u => D.met(D.W * u, t, 0.11, D.H - 2 * t)); D.met(t, D.H * 0.3, D.W * 0.5, 0.11); D.met(D.W * 0.48, D.H * 0.62, D.W * 0.52 - t, 0.11); D.met(t, D.H * 0.8, D.W - 2 * t, 0.11); D.handle('r'); },
  GL08: D => { const t = D.frame(2); D.open(t, t, D.W - 2 * t, D.H - 2 * t); [0.36, 0.46, 0.56].forEach(u => D.met(D.W * u, t, 0.1, D.H - 2 * t)); D.met(t, D.H * 0.55, D.W - 2 * t, 0.1); D.handle('r'); },
  GL09: D => { const t = D.frame(2); D.open(t, t, D.W - 2 * t, D.H - 2 * t); [0.18, 0.34, 0.5, 0.66, 0.82].forEach((u, i) => D.met(D.W * u, t + (i % 2 ? D.H * 0.25 : 0), 0.1, D.H * (i % 2 ? 0.75 : 1) - 2 * t)); D.met(t, D.H * 0.25, D.W - 2 * t, 0.1); D.met(t, D.H * 0.7, D.W - 2 * t, 0.1); D.handle('r'); },
  // terrace gates
  MM01: D => { const t = D.frame(2); vb(D, t, t, D.W - 2 * t, D.H - 2 * t, 0.75, 4); D.met(t, D.H / 2, D.W - 2 * t, 0.12); },
  MM02: D => { const t = D.frame(2); hb(D, t, t, D.W * 0.55, D.H - 2 * t, 1.5, 1.2); D.met(D.W * 0.55, t, 0.12, D.H - 2 * t); vb(D, D.W * 0.55 + 0.12, t, D.W * 0.45 - t - 0.12, D.H - 2 * t, 0.75, 4); D.handle('r'); },
  MM03: D => { const t = D.frame(2); vb(D, t, t, D.W - 2 * t, D.H - 2 * t, 0.75, 4); D.met(t, D.H * 0.5, D.W - 2 * t, 0.15); },
  MM04: D => { const t = D.frame(2); vb(D, t, t, D.W - 2 * t, D.H - 2 * t, 0.75, 3.5); D.met(t, D.H * 0.33, D.W - 2 * t, 0.12); D.met(t, D.H * 0.66, D.W - 2 * t, 0.12); },
  MM05: D => { const t = D.frame(2.5); D.open(t, t, D.W - 2 * t, D.H - 2 * t); const i = 0.35; D.met(t + i, t + i, D.W - 2 * t - 2 * i, 0.1); D.met(t + i, D.H - t - i - 0.1, D.W - 2 * t - 2 * i, 0.1); vb(D, t + i, t + i + 0.1, D.W - 2 * t - 2 * i, D.H - 2 * t - 2 * i - 0.2, 0.75, 4.5); },
  MM06: D => { const t = D.frame(2); D.grooves(t, t, D.W - 2 * t, D.H - 2 * t, 'h', 11, 0.03); },
  MM07: D => { const t = D.frame(2); D.met(t, t, D.W - 2 * t, D.H - 2 * t); for (let x = t + 0.35; x < D.W - t - 0.2; x += 0.42) D.open(x, t + 0.4, 0.05, D.H - 2 * t - 0.8); },
  MM08: D => { const t = D.frame(2); D.met(t, t, D.W - 2 * t, D.H - 2 * t, 0.85); for (let i = 0; i < 3; i++) { const y = t + 0.25 + i * (D.H - 2 * t - 0.25) / 3; D.met(t + 0.25, y, D.W - 2 * t - 0.5, (D.H - 2 * t - 0.25) / 3 - 0.25, 1.15); D.met(t + 0.25, y + (D.H - 2 * t - 0.25) / 3 - 0.3, D.W - 2 * t - 0.5, 0.05, 0.5); } },
  MM09: D => { const t = D.frame(2); D.open(t, t, D.W - 2 * t, D.H - 2 * t); vb(D, t, t, D.W - 2 * t, D.H - 2 * t, 0.75, 5.5); for (let i = 0; i < 5; i++) D.met(t, t + 0.3 + i * 0.32, D.W - 2 * t, 0.07); D.met(t, D.H * 0.62, D.W - 2 * t, 0.1); },
  // main gates (metal)
  MS01: D => { const t = D.frame(2.5); D.louvre(t, D.H * 0.42, D.W * 0.62, D.H * 0.58 - t); D.glass(t, t, D.W * 0.62, D.H * 0.42); D.met(D.W * 0.62, t, 0.16, D.H - 2 * t); D.met(D.W * 0.62 + 0.16, t, D.W * 0.38 - t - 0.16, D.H - 2 * t, 0.92); D.met(t, D.H * 0.42, D.W * 0.62, 0.1); },
  MS02: D => { const t = D.frame(2); D.met(t, t, D.W - 2 * t, D.H - 2 * t); hb(D, t, D.H * 0.32, D.W - 2 * t, D.H * 0.36, 1.5, 1.5); },
  MS03: D => { const t = D.frame(2); D.met(t, t, D.W - 2 * t, D.H - 2 * t); [0.2, 0.25, 0.3, 0.62, 0.67, 0.72].forEach(v => D.open(t + 0.4, D.H * v, D.W - 2 * t - 0.8, 0.05)); },
  MS04: D => { const t = D.frame(2); D.grooves(t, t, D.W - 2 * t, D.H - 2 * t, 'h', 3, 0.04); },
  MS05: D => { const t = D.frame(2.5); D.louvre(t, t, D.W - 2 * t, D.H - 2 * t, 3.5); D.handle(D.i ? 'l' : 'r'); },
  MS06: D => { const t = D.frame(2.5); D.met(t, t, D.W - 2 * t, D.H - 2 * t); const nx = Math.max(2, Math.round(D.W / 2.2)), ny = 3, gw = (D.W - 2 * t) / nx, gh = (D.H - 2 * t) / ny;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) if ((i + j) % 2 === 0) D.wood(t + i * gw + 0.12, t + j * gh + 0.12, gw * 0.55, gh - 0.24, 'v'); },
  MS07: D => { const t = D.frame(2); D.met(t, t, D.W - 2 * t, D.H - 2 * t, 0.9); D.met(t + D.W * 0.08, t + D.H * 0.1, D.W * 0.3, D.H * 0.35, 1.18); D.met(D.W * 0.55, D.H * 0.5, D.W * 0.33, D.H * 0.38, 1.18);
    [0.18, 0.22, 0.26].forEach(v => D.open(D.W * 0.45, D.H * v, D.W * 0.5 - t, 0.04)); [0.62, 0.66, 0.7].forEach(v => D.open(t + 0.3, D.H * v, D.W * 0.45, 0.04)); },
  MS08: D => { const t = D.frame(2); hb(D, t, t, D.W - 2 * t, D.H * 0.5 - t, 2, 1.5); D.met(t, D.H * 0.5, D.W - 2 * t, D.H * 0.5 - t); D.met(t, D.H * 0.5, D.W - 2 * t, 0.12, 0.6); },
  MS09: D => { const t = D.frame(2); D.met(t, t, D.W - 2 * t, D.H - 2 * t); [0.25, 0.5, 0.75].forEach(v => { D.met(t, D.H * v - 0.08, D.W - 2 * t, 0.16, 1.3); D.met(t, D.H * v + 0.08, D.W - 2 * t, 0.03, 0.5); }); },
  MS10: D => { const t = D.frame(2); D.glass(t, t, D.W - 2 * t, D.H * 0.3); D.met(t, D.H * 0.3, D.W - 2 * t, 0.12, 0.7); D.grooves(t, D.H * 0.3 + 0.12, D.W - 2 * t, D.H * 0.7 - t - 0.12, 'h', 4, 0.03); },
  MS11: D => { const t = D.frame(2); D.met(t, t, D.W - 2 * t, D.H - 2 * t, 0.85); [[0.08, 0.15, 0.3, 0.3], [0.45, 0.4, 0.25, 0.35], [0.75, 0.12, 0.18, 0.5]].forEach(([u, v, a, b]) => { D.met(D.W * u, D.H * v, D.W * a, D.H * b, 1.2); D.met(D.W * u, D.H * (v + b), D.W * a, 0.08, 0.45); D.met(D.W * (u + a), D.H * v, 0.08, D.H * b, 0.5); }); },
  MS12: D => { const t = D.frame(2); D.met(t, t, D.W - 2 * t, D.H - 2 * t); [[0.08, 0.15, 0.25, 0.3], [0.5, 0.5, 0.35, 0.35], [0.12, 0.6, 0.2, 0.25]].forEach(([u, v, a, b]) => D.perf(D.W * u, D.H * v, D.W * a, D.H * b, 1)); },
  MS13: D => { const t = D.frame(2.5); const nx = Math.max(3, Math.round(D.W / 2)), ny = 3, gw = (D.W - 2 * t) / nx, gh = (D.H - 2 * t) / ny; D.met(t, t, D.W - 2 * t, D.H - 2 * t);
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) if (j < 2) D.glass(t + i * gw + 0.08, t + j * gh + 0.08, gw - 0.16, gh - 0.16); },
  MS14: D => { const t = D.frame(2); D.met(t, t, D.W - 2 * t, D.H - 2 * t); D.perf(D.W * 0.1, D.H * 0.12, D.W * 0.32, D.H * 0.4, 0.8); D.met(D.W * 0.55, D.H * 0.2, D.W * 0.3, D.H * 0.3, 1.2); D.perf(D.W * 0.45, D.H * 0.6, D.W * 0.42, D.H * 0.28, 0.8); D.met(D.W * 0.42, t, 0.06, D.H - 2 * t, 0.5); },
  MS15: D => { const t = D.frame(2); D.met(t, t, D.W - 2 * t, D.H - 2 * t); D.perf(t, D.H * 0.38, D.W - 2 * t, D.H * 0.22, 0.9); },
  MS16: D => { const t = D.frame(2); D.met(t, t, D.W - 2 * t, D.H - 2 * t); [[0.08, 0.15, 0.28, 0.65], [0.6, 0.2, 0.3, 0.45]].forEach(([u, v, a, b]) => vb(D, D.W * u, D.H * v, D.W * a, D.H * b, 1, 2.5)); },
  MS17: D => { const t = D.frame(2); D.met(t, t, D.W - 2 * t, D.H - 2 * t, 0.85); [0.3, 0.6].forEach(v => D.gold(t, D.H * v, D.W - 2 * t, 0.06)); D.gold(D.W * 0.7, t, 0.06, D.H - 2 * t); D.grooves(t, D.H * 0.64, D.W * 0.7 - t, D.H * 0.36 - t, 'v', Math.round(D.W * 1.6), 0.03); },
  MS18: D => { const t = D.frame(2); D.met(t, t, D.W - 2 * t, D.H - 2 * t, 0.88); const s = D.i ? -1 : 1; [[0.15, 0.12, 0.55, 0.3], [0.3, 0.52, 0.55, 0.32]].forEach(([u, v, a, b]) => { const x = s > 0 ? D.W * u : D.W * (1 - u - a); D.met(x, D.H * v, D.W * a, D.H * b, 1.2); D.met(x, D.H * (v + b), D.W * a, 0.07, 0.45); }); D.handle(D.i ? 'l' : 'r'); },
  MS19: D => { const t = D.frame(2); D.met(t, t, D.W - 2 * t, D.H - 2 * t); const n = Math.max(2, Math.round(D.W / 4)); for (let i = 0; i < n; i++) vb(D, t + (D.W - 2 * t) * (i + 0.2) / n, t + 0.3, (D.W - 2 * t) * 0.35 / n, D.H - 2 * t - 0.6, 0.75, 2.2); },
  MS20: D => { const t = D.frame(2.5); const nx = Math.max(3, Math.round(D.W / 2.5)), gw = (D.W - 2 * t) / nx; D.open(t, t, D.W - 2 * t, D.H - 2 * t);
    for (let i = 0; i <= nx; i++) D.met(t + i * gw - (i === nx ? 0.12 : 0), t, 0.12, D.H - 2 * t); [0.35, 0.7].forEach(v => D.met(t, D.H * v, D.W - 2 * t, 0.12)); for (let i = 0; i < nx; i++) D.met(t + i * gw + 0.12, D.H * 0.7 + 0.12, gw - 0.12, D.H * 0.3 - t - 0.12, 0.95); },
  MS21: D => { const t = D.frame(2); D.met(t, t, D.W - 2 * t, D.H - 2 * t, 0.8); D.met(D.W * 0.06, D.H * 0.1, D.W * 0.6, D.H * 0.55, 0.95); D.met(D.W * 0.35, D.H * 0.35, D.W * 0.58, D.H * 0.55, 1.12); D.met(D.W * 0.35, D.H * 0.9, D.W * 0.58, 0.06, 0.4); },
  MS22: D => { const P = D.P.m; D.P.m = '#5A4632'; const t = D.frame(2); hb(D, t, t, D.W - 2 * t, D.H - 2 * t, 3, 0.8, 'solid'); D.P.m = P; },
  MS23: D => { const t = D.frame(2); D.frost(t, t, D.W - 2 * t, D.H - 2 * t); const nx = Math.max(4, Math.round(D.W / 1.1)), ny = 6; for (let i = 1; i < nx; i++) D.met(t + (D.W - 2 * t) * i / nx, t, 0.06, D.H - 2 * t); for (let j = 1; j < ny; j++) D.met(t, t + (D.H - 2 * t) * j / ny, D.W - 2 * t, 0.06); },
  MS24: D => { const t = D.frame(2); D.perf(t, t, D.W - 2 * t, D.H - 2 * t, 0.5); [0.25, 0.5, 0.75].forEach(v => D.met(t, D.H * v, D.W - 2 * t, 0.14, 1.2)); },
  MS25: D => { const t = D.frame(2); D.grooves(t, t, D.W - 2 * t, D.H - 2 * t, 'v', Math.round(D.W * 1.5), 0.03); [0.2, 0.8].forEach(v => D.met(t, D.H * v - 0.12, D.W - 2 * t, 0.24, 1.25)); D.met(D.W * 0.48, t, 0.1, D.H - 2 * t, 1.25); },
  MS26: D => { const t = D.frame(2); D.met(t, t, D.W - 2 * t, D.H - 2 * t); [[0.08, 0.12, 0.35, 0.3], [0.55, 0.45, 0.35, 0.4], [0.1, 0.6, 0.25, 0.28]].forEach(([u, v, a, b]) => D.louvre(D.W * u, D.H * v, D.W * a, D.H * b, 3)); },
  MS27: D => { const t = D.frame(2); D.met(t, t, D.W - 2 * t, D.H - 2 * t); D.r(t, t, D.W * 0.18, D.H - 2 * t, '#B7B1A6', 1); hb(D, D.W * 0.6, D.H * 0.15, D.W * 0.4 - t, D.H * 0.5, 1.5, 1.5); },
  MS28: D => { const t = D.frame(2); D.met(t, t, D.W - 2 * t, D.H - 2 * t, 0.85); D.perf(D.W * 0.05, D.H * 0.1, D.W * 0.5, D.H * 0.5, 0.8); D.met(D.W * 0.35, D.H * 0.35, D.W * 0.55, D.H * 0.55, 1.15); D.perf(D.W * 0.4, D.H * 0.4, D.W * 0.45, D.H * 0.45, 0.6); },
  // wooden gates (teak / walnut on a steel frame)
  WD01: D => { const t = D.frame(2.5); D.wood(t, t, D.W - 2 * t, D.H - 2 * t, 'v'); D.jali(t, D.H * 0.45, D.W - 2 * t, D.H * 0.14, 5); D.met(t, D.H * 0.45, D.W - 2 * t, 0.06); D.met(t, D.H * 0.59, D.W - 2 * t, 0.06); D.handle(D.i ? 'l' : 'r'); },
  WD02: D => { const t = D.frame(2.5); D.open(t, t, D.W - 2 * t, D.H - 2 * t); const b = 0.42, g2 = 0.12; for (let x = t; x < D.W - t - 0.05; x += b + g2) D.wood(x, t, Math.min(b, D.W - t - x), D.H - 2 * t, 'v'); D.handle(D.i ? 'l' : 'r'); },
  WD03: D => { const t = D.frame(2.5); D.wood(t, t, D.W - 2 * t, D.H - 2 * t, 'h'); const cx = D.i ? t : D.W - t - D.W * 0.25; D.wood(cx, t, D.W * 0.25, D.H - 2 * t, 'v'); D.met(cx + (D.i ? D.W * 0.25 : 0), t, 0.05, D.H - 2 * t, 0.6); D.handle(D.i ? 'l' : 'r'); },
  WD04: D => { const t = D.frame(2.5); D.wood(t, t, D.W - 2 * t, D.H - 2 * t, 'v'); for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) { const pw = (D.W - 2 * t - 0.6) / 2, ph = (D.H - 2 * t - 0.8) / 3, x = t + 0.2 + i * (pw + 0.2), y = t + 0.2 + j * (ph + 0.2); D.wood(x, y, pw, ph, 'h'); D.r(x, y + ph - 0.05, pw, 0.05, 'rgba(30,18,8,.6)'); D.r(x + pw - 0.05, y, 0.05, ph, 'rgba(30,18,8,.5)'); } D.handle(D.i ? 'l' : 'r'); },
  WD05: D => { const t = D.frame(2.5); D.wood(t, t, D.W - 2 * t, D.H - 2 * t, 'v'); for (let x = t + 0.4; x < D.W - t - 0.3; x += 0.7) D.open(x, D.H * 0.3, 0.08, D.H * 0.12); },
  WD06: D => { const t = D.frame(2.5); D.met(t, t, D.W - 2 * t, D.H - 2 * t); [[0.04, 0.06, 0.4, 0.5], [0.46, 0.06, 0.25, 0.3], [0.73, 0.06, 0.23, 0.6], [0.04, 0.6, 0.25, 0.34], [0.31, 0.4, 0.4, 0.54], [0.73, 0.7, 0.23, 0.24]].forEach(([u, v, a, b]) => D.wood(D.W * u, D.H * v, D.W * a, D.H * b, a > b ? 'h' : 'v')); },
  WD08: D => { const t = D.frame(2.5); D.wood(t, t, D.W - 2 * t, D.H - 2 * t, 'v', '#5E3C26'); D.jali(t, D.H * 0.4, D.W - 2 * t, D.H * 0.16, 4.5); D.handle(D.i ? 'l' : 'r'); },
  WD09: D => { const t = D.frame(2.5); D.wood(t, t, D.W - 2 * t, D.H - 2 * t, 'v'); D.wood(t, D.H * 0.4, D.W - 2 * t, D.H * 0.2, 'h'); D.handle(D.i ? 'l' : 'r'); },
  WD10: D => { const t = D.frame(2.5); D.diag(t, t, D.W - 2 * t, (D.H - 2 * t) / 2, D.i ? 0.75 : -0.75); D.diag(t, D.H / 2, D.W - 2 * t, (D.H - 2 * t) / 2, D.i ? -0.75 : 0.75); D.met(t, D.H / 2 - 0.04, D.W - 2 * t, 0.08); D.handle(D.i ? 'l' : 'r'); },
  WD11: D => { const t = D.frame(2.5); D.wood(t, t, D.W - 2 * t, D.H - 2 * t, 'h'); const s = 0.9, x = D.i ? t : D.W - t - s; D.jali(x, t, s, s, 4); D.jali(x, D.H - t - s, s, s, 4); D.handle(D.i ? 'l' : 'r'); },
  WD12: D => { const t = D.frame(2.5); D.diag(t, t, D.W - 2 * t, D.H - 2 * t, D.i ? 0.55 : -0.55); D.handle(D.i ? 'l' : 'r'); },
  WD13: D => { const t = D.frame(2.5); D.wood(t, t, D.W - 2 * t, D.H - 2 * t, 'h'); [0.2, 0.35].forEach(u => D.led(D.i ? D.W * (1 - u) : D.W * u, t + 0.3, 0.05, D.H - 2 * t - 0.6)); D.handle(D.i ? 'l' : 'r'); }
};
export const GATE_CODES = Object.keys(G);
export function gateCode(sku) { const c = String(sku || '').replace(/^MTO-GT-/, ''); return G[c] ? c : null; }
const SWING = /^(MS05|MS18|WD0[1-5]|WD0[89]|WD1[0-3]|MM0[3-9])$/;

// one leaf as a mesh: the drawn face (colour + see-through) on a thin plate, a steel edge round it
function leaf(code, w, h, i, met) {
  const k = Math.min(64, Math.max(24, 1400 / Math.max(w, h))), P = { m: MET[met] || MET.black, w: '#8A5A33' }, { D, C, A } = painter(w, h, k, P); D.i = i;
  (G[code] || G.MS04)(D, i);
  const tc = new THREE.CanvasTexture(C), ta = new THREE.CanvasTexture(A); tc.colorSpace = THREE.SRGBColorSpace; tc.anisotropy = ta.anisotropy = 4;
  const m = new THREE.MeshStandardMaterial({ map: tc, alphaMap: ta, transparent: true, alphaTest: 0.04, roughness: 0.55, metalness: 0.15, side: THREE.DoubleSide, depthWrite: true });
  const g = new THREE.Group(), p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(w / 2, h / 2, 0); p.castShadow = true;
  p.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaMap: ta, alphaTest: 0.5 }); g.add(p);
  const p2 = p.clone(); p2.position.z = -0.12; g.add(p2);   // the back face, a gate's thickness behind
  const em = mt('edge' + met, { color: new THREE.Color(MET[met] || MET.black), roughness: 0.5, metalness: 0.3 }); bx(g, w, 0.12, 0.14, w / 2, h - 0.06, -0.06, em); bx(g, w, 0.12, 0.14, w / 2, 0.06, -0.06, em); bx(g, 0.12, h, 0.14, 0.06, h / 2, -0.06, em); bx(g, 0.12, h, 0.14, w - 0.06, h / 2, -0.06, em);
  D.glow.forEach(([x, y, rw, rh]) => { const s = new THREE.Mesh(new THREE.BoxGeometry(rw, rh, 0.02), mt('gled', { color: 0xFFE2B0, emissive: 0xFFC27A, emissiveIntensity: 1.6 })); s.position.set(x + rw / 2, h - y - rh / 2, 0.02); g.add(s); });
  return g;
}

export function gateSpec(sku, m, o) {
  const code = gateCode(sku), gp = o.groups || {}, g = re => { const k = Object.keys(gp).find(x => re.test(x)); return k ? gp[k] : ''; };
  const fam = (code || 'MS').slice(0, 2), mats = m.materials || [], mat = mats.find(x => x.name === o.material) || mats[0] || {};
  const col = o.colour || ((mat.colours || []).find(c => /as shown/i.test(c.name)) || (mat.colours || [])[0] || {}).name || '';
  const dW = fam === 'GL' ? 3.5 : fam === 'MM' ? (/^MM0[3-9]$/.test(code) ? 5 : 3.5) : 12, dH = fam === 'GL' ? 7 : code === 'MM01' ? 4 : fam === 'MM' ? 7 : 6;
  return { code, fam, W: +o.w || dW, H: +o.h || dH, met: metalOf(col), wicket: /matching wicket/i.test(g(/wicket/i)), portal: /top frame \(portal\)/i.test(g(/top frame/i)) };
}

const PIL = () => mt('pillar', { color: 0xD8D2C8, roughness: 0.92 }), WALL = () => mt('gwall', { color: 0xE6E1D8, roughness: 0.95 }), CAP = () => mt('gcap', { color: 0x8C8880, roughness: 0.8 });
export function gateStudio(sp) {
  const S = new THREE.Group(), code = sp.code || 'MS04', W = sp.W, H = sp.H, fam = sp.fam;
  const nl = SWING.test(code) ? (code === 'WD05' ? 2 : 2) : 1, lw = code === 'WD05' ? [W * 0.62, W * 0.38] : nl === 2 ? [W / 2, W / 2] : [W];
  let x = -W / 2; lw.forEach((w, i) => { const L = leaf(code, w - 0.04, H - (fam === 'MS' || fam === 'WD' ? 0.25 : 0.05), i, sp.met); L.position.set(x + 0.02, fam === 'MS' || fam === 'WD' ? 0.2 : 0.02, 0); S.add(L); x += w; });
  let span, wallH, ex = 0;
  if (fam === 'GL' || (fam === 'MM' && code !== 'MM01')) {   // a doorway in a stairs-room / terrace wall
    wallH = Math.max(H + 2, 9); const side = 3.5;
    bx(S, side, wallH, 0.75, -W / 2 - side / 2 - 0.15, wallH / 2, -0.3, WALL()); bx(S, side, wallH, 0.75, W / 2 + side / 2 + 0.15, wallH / 2, -0.3, WALL()); bx(S, W + 0.3, wallH - H - 0.15, 0.75, 0, H + 0.15 + (wallH - H - 0.15) / 2, -0.3, WALL());
    const fr = mt('dfr' + sp.met, { color: new THREE.Color(MET[sp.met]), roughness: 0.5, metalness: 0.3 }); bx(S, 0.15, H + 0.15, 0.3, -W / 2 - 0.075, (H + 0.15) / 2, -0.05, fr); bx(S, 0.15, H + 0.15, 0.3, W / 2 + 0.075, (H + 0.15) / 2, -0.05, fr); bx(S, W + 0.3, 0.15, 0.3, 0, H + 0.075, -0.05, fr);
    span = W + 2 * side; studioFloor(S, -span / 2 - 2, -0.68, span + 4, 12);
  } else if (code === 'MM01') {   // a low gate in a terrace parapet
    wallH = 3.5; const side = 6; bx(S, side, wallH, 0.75, -W / 2 - side / 2 - 0.3, wallH / 2, -0.06, WALL()); bx(S, side, wallH, 0.75, W / 2 + side / 2 + 0.3, wallH / 2, -0.06, WALL());
    [-1, 1].forEach(s => bx(S, 0.6, H + 0.3, 0.9, s * (W / 2 + 0.3), (H + 0.3) / 2, -0.06, PIL())); span = W + 2 * side; studioFloor(S, -span / 2 - 1, -8, span + 2, 16);
  } else {   // a main gate: pillars, boundary walls, a driveway
    wallH = Math.min(H, 6); const pw = 1.5, side = 7, wk = sp.wicket ? 3.5 : 0;
    const pil = (px, h2) => { bx(S, pw, h2, pw, px, h2 / 2, -0.1, PIL()); bx(S, pw + 0.2, 0.2, pw + 0.2, px, h2 + 0.1, -0.1, CAP()); };
    pil(-W / 2 - pw / 2 - 0.05, H + 1); pil(W / 2 + pw / 2 + 0.05, H + 1);
    if (wk) { const L = leaf(code, wk - 0.04, H - 0.25, 0, sp.met); L.position.set(W / 2 + pw + 0.07, 0.2, 0); S.add(L); pil(W / 2 + pw + wk + pw / 2 + 0.09, H + 1); ex = wk + pw; }
    bx(S, side, wallH, 0.75, -W / 2 - pw - side / 2, wallH / 2, -0.1, WALL()); bx(S, side, wallH, 0.75, W / 2 + pw + ex + side / 2, wallH / 2, -0.1, WALL());
    if (sp.portal) { const pm = mt('ptl' + sp.met, { color: new THREE.Color(MET[sp.met]), roughness: 0.5, metalness: 0.3 }), pt = 0.5, x0 = -W / 2 - pw - 0.6, x1 = W / 2 + pw + ex + 0.6, ph = H + 2.2;
      bx(S, pt, ph, pt, x0, ph / 2, 0.9, pm); bx(S, pt, ph, pt, x1, ph / 2, 0.9, pm); bx(S, x1 - x0 + 0.8, 0.7, 3, (x0 + x1) / 2, ph + 0.35, -0.2, pm); }
    span = W + 2 * pw + ex + 2 * side;
    studioFloor(S, -span / 2 - 1, -10, span + 2 + ex, 20);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(W, 9), mt('drive', { color: 0x9B9790, roughness: 0.95 })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.012, 4.6); road.receiveShadow = true; S.add(road);
  }
  if (code === 'MM01') person(S, W / 2 + 2.5, -2.5, -0.4); else person(S, W / 2 + (fam === 'GL' || fam === 'MM' ? 2.6 : 2.5) + ex, 2.2, -0.5);
  S.position.x = -ex / 2;
  return { g: S, W: W + ex, H, span: Math.max(span || W, H * 1.6) };
}
