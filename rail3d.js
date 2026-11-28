// outrr design studio — railings (309, owner: "baki categories ke 3D models"): all 19 outrr railing designs (MTO-RL-*) drawn
// live at the customer's running length, height (3 / 3.5 / 4 ft), fixing (on the floor or on the slab edge), corners and
// finish — on a balcony slab with its open edge in front. Each design = posts + rails + its infill (bars, horizontal bars,
// cast-iron balusters / floral panels, glass, laser-cut jali, cables, rods, wooden pickets / boards). Units: feet, y up;
// the open side (outside) is +z, the balcony floor −z.
import * as THREE from './vendor/three/three.module.min.js';
import { studioFloor, person } from './studio3d.js?v=9';

const M = {}, T = {};
const mt = (k, o) => M[k] || (M[k] = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.6 }, o)));
function bx(g, w, h, d, x, y, z, m) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b; }
function cy(g, r, h, x, y, z, m, ax) { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 12), m); c.position.set(x, y, z); if (ax === 'x') c.rotation.z = Math.PI / 2; if (ax === 'z') c.rotation.x = Math.PI / 2; c.castShadow = true; g.add(c); return c; }
const IN = v => v / 12;

// finish names → colour
const COL = [[/gold pvd/i, 0xB8954E, 1], [/black pvd/i, 0x2A2A2C, 1], [/mirror/i, 0xDADDE0, 2], [/satin|silver|ss 3/i, 0xB9BCBF, 1], [/antique gold/i, 0x1C1C1C], [/copper/i, 0x6E4330],
  [/corten|rust/i, 0x8B4A2B], [/bronze/i, 0x5A4632], [/white/i, 0xEDEDEA], [/charcoal/i, 0x3A3B3D], [/grey|gray/i, 0x7C7F82], [/wood-grain|wood grain/i, 0x8A5A36],
  [/natural honey/i, 0xC08A4E], [/natural teak/i, 0x84552F], [/walnut/i, 0x5E3C26], [/coffee/i, 0x4A3326], [/ash grey/i, 0x8E8A84], [/teak/i, 0x7E4E2A], [/black/i, 0x1C1C1C]];
export function finish(name, dflt) { const s = name || dflt || ''; for (const [re, c, met] of COL) if (re.test(s)) return mt('rf' + c + (met || 0), met ? { color: c, metalness: 0.9, roughness: met === 2 ? 0.12 : 0.3 } : { color: c, roughness: /teak|walnut|coffee|honey|ash/i.test(s) ? 0.55 : 0.45 }); return mt('rf_def', { color: 0x1C1C1C, roughness: 0.45 }); }
const SSM = () => mt('ss', { color: 0xB9BCBF, metalness: 0.9, roughness: 0.3 }), GOLD = () => mt('gold', { color: 0xA88A4A, metalness: 0.8, roughness: 0.35 });
const GLASS = () => mt('glass', { color: 0xCFE3E6, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false });
function jaliTex() { if (T.j) return T.j; const n = 128, cv = document.createElement('canvas'); cv.width = cv.height = n; const c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, n, n);
  c.fillStyle = '#000'; const dia = (x, y, r) => { c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r * 0.7, y); c.lineTo(x, y + r); c.lineTo(x - r * 0.7, y); c.closePath(); c.fill(); };
  dia(32, 32, 24); dia(96, 32, 24); dia(64, 96, 24); dia(0, 96, 24); dia(128, 96, 24); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; return (T.j = t); }

// every design: posts (square / round / wood / none), spacing, top rail, bottom rail, infill
const R = {
  'AL-BOLD':     { post: 'sq', pw: 2.5, ps: 4.5, plate: 1, top: 'flat', tw: 2, bot: 1, inf: 'vbar', bw: 1, gap: 4 },
  'AL-HBAR':     { post: 'sq', pw: 2.5, ps: 5, plate: 1, top: 'flat', tw: 2, inf: 'hbar', n: 4, bw: 1.5 },
  'AL-SLIM':     { post: 'sq', pw: 2, ps: 5, plate: 1, top: 'flat', tw: 1.6, bot: 1, inf: 'vbar', bw: 0.6, gap: 3.5 },
  'AL-TOP':      { post: 'sq', pw: 2, ps: 5, plate: 1, top: 'cap', tw: 3, bot: 1, inf: 'vbar', bw: 0.6, gap: 3.5 },
  'CI-BALUSTER': { post: 'sq', pw: 2.5, ps: 5, plate: 1, top: 'flat', tw: 2, bot: 1, inf: 'baluster', gap: 4.5, accent: 1 },
  'CI-FLORAL':   { post: 'sq', pw: 2.5, ps: 4, plate: 1, top: 'flat', tw: 2, bot: 1, inf: 'floral', accent: 1 },
  'GLS-BLACK':   { post: 'sq', pw: 2, ps: 4, plate: 1, top: 'wood', tw: 3, inf: 'glass', rail: 1, fixed: 0x1C1C1C },
  'GLS-CHANNEL': { post: 'none', top: 'slot', tw: 1.2, inf: 'glass', channel: 1, frame: 1 },
  'GLS-SPIGOT':  { post: 'none', top: 'none', inf: 'glass', spigot: 1, frame: 1 },
  'GLS-SSPOST':  { post: 'rnd', pw: 2, ps: 4, plate: 1, top: 'round', tw: 2, inf: 'glass', clamps: 1 },
  'MS-BARS':     { post: 'sq', pw: 2, ps: 5, plate: 1, top: 'flat', tw: 2, bot: 1, inf: 'vbar', bw: 0.75, gap: 4 },
  'MS-JALI':     { post: 'sq', pw: 2, ps: 4, plate: 1, top: 'flat', tw: 1.6, bot: 1, inf: 'jali' },
  'SS-CABLE':    { post: 'rnd', pw: 1.7, ps: 4.5, plate: 1, top: 'round', tw: 1.7, inf: 'cable', n: 9 },
  'SS-RODS':     { post: 'sq', pw: 1.6, ps: 4.5, plate: 1, top: 'round', tw: 1.7, inf: 'rod', n: 5 },
  'WD-CAP':      { post: 'wood', pw: 3.5, ps: 5, top: 'wcap', tw: 5.5, bot: 1, inf: 'picket', bw: 1.6, gap: 4, wood: 1 },
  'WD-HAND':     { post: 'wood', pw: 3, ps: 5, top: 'wround', tw: 2.6, bot: 1, inf: 'picket', bw: 1.4, gap: 4, wood: 1 },
  'WD-PICKET':   { post: 'wood', pw: 3, ps: 5, top: 'wflat', tw: 3.5, bot: 1, inf: 'picket', bw: 1.8, gap: 3.5, wood: 1 },
  'WD-RANCH':    { post: 'wood', pw: 3.5, ps: 5, top: 'wflat', tw: 4.5, inf: 'board', n: 3, wood: 1 },
  'WD-SPIGOT':   { post: 'wood', pw: 3, ps: 5, shoe: 1, top: 'wflat', tw: 4, inf: 'board', n: 4, wood: 1 }
};
export const RAIL_CODES = Object.keys(R);
export function railCode(sku) { const c = String(sku || '').replace(/^MTO-RL-/, '').replace(/-(BAL|STR)$/, ''); return R[c] ? c : null; }

// one straight run along +x from 0 to L at z = 0, posts at both ends. fm = finish, sm = second finish (SS / black parts)
function run(g, L, h, d, fm, side) {
  const pw = IN(d.pw || 2), np = d.post === 'none' ? 0 : Math.max(1, Math.round(L / d.ps)), sp = np ? L / np : L, y0 = side ? -0.6 : 0;
  const wood = d.wood, pm = d.fixed ? mt('blk', { color: d.fixed, roughness: 0.45 }) : fm, posts = [];
  for (let i = 0; i <= np && np; i++) { const x = Math.min(L - pw / 2, Math.max(pw / 2, i * sp)); posts.push(x);
    if (d.post === 'rnd') cy(g, pw / 2, h - y0, x, (h + y0) / 2, 0, d.inf === 'glass' ? SSM() : pm); else bx(g, pw, h - y0 - (d.shoe ? 0.5 : 0), pw, x, (h + y0 + (d.shoe ? 0.5 : 0)) / 2, 0, pm);
    if (d.shoe) bx(g, pw + 0.06, 0.55, pw + 0.06, x, 0.27, 0, SSM());
    if (d.plate && !side) bx(g, pw + 0.25, 0.03, pw + 0.25, x, 0.015, 0, d.post === 'rnd' ? SSM() : pm);
    if (side) { bx(g, pw + 0.1, 0.5, 0.04, x, -0.35, -pw / 2 - 0.02, pm); } }
  // top rail
  const tw = IN(d.tw || 2);
  if (d.top === 'flat') bx(g, L, IN(1.6), tw, L / 2, h - IN(0.8), 0, fm);
  else if (d.top === 'cap') bx(g, L, IN(1.2), tw, L / 2, h - IN(0.6), 0, fm);
  else if (d.top === 'round') cy(g, tw / 2, L, L / 2, h - tw / 2, 0, d.inf === 'glass' || /SS/.test(d.k) ? SSM() : fm, 'x');
  else if (d.top === 'wood') bx(g, L + 0.1, IN(2), tw, L / 2, h - IN(1), 0, fm);
  else if (d.top === 'slot') bx(g, L, IN(1.6), tw, L / 2, h + IN(0.4), 0, SSM());
  else if (d.top === 'wcap') { bx(g, L + 0.2, IN(1.2), tw, L / 2, h - IN(0.6), 0, fm); bx(g, L, IN(3), IN(1.6), L / 2, h - IN(2.6), 0, fm); }
  else if (d.top === 'wround') { cy(g, tw / 2, L, L / 2, h - tw / 2, IN(0.5), fm, 'x'); bx(g, L, IN(2.5), IN(1.5), L / 2, h - tw - IN(1.2), 0, fm); }
  else if (d.top === 'wflat') bx(g, L + 0.15, IN(1.4), tw, L / 2, h - IN(0.7), 0, fm);
  const top = d.top === 'none' ? h : d.top === 'slot' ? h : h - (d.top === 'wcap' ? IN(4.2) : d.top === 'wround' ? tw + IN(2.4) : IN(1.6));
  const yb = side ? 0.25 : IN(3), bot = d.bot ? yb + IN(0.8) : yb;
  if (d.bot) bx(g, L, IN(1.6), IN(d.wood ? 2.6 : 1.6), L / 2, yb, 0, fm);
  // infill, bay by bay
  const bays = []; if (posts.length) for (let i = 0; i < posts.length - 1; i++) bays.push([posts[i] + pw / 2, posts[i + 1] - pw / 2]); else bays.push([0, L]);
  bays.forEach(([a, b]) => {
    const w = b - a, mid = (a + b) / 2, H0 = bot + IN(0.8), H1 = top;
    switch (d.inf) {
      case 'vbar': case 'picket': case 'baluster': { const bw = IN(d.bw || 0.75), g2 = IN(d.gap || 4), n = Math.max(1, Math.floor((w + g2) / (bw + g2))), s0 = a + (w - (n * bw + (n - 1) * g2)) / 2 + bw / 2;
        for (let i = 0; i < n; i++) { const x = s0 + i * (bw + g2);
          if (d.inf === 'baluster') { cy(g, IN(0.4), H1 - H0, x, (H0 + H1) / 2, 0, fm); const k = new THREE.Mesh(new THREE.OctahedronGeometry(IN(1.6)), fm); k.scale.set(0.7, 1.9, 0.7); k.position.set(x, (H0 + H1) / 2, 0); g.add(k);
            cy(g, IN(0.9), IN(0.8), x, (H0 + H1) / 2 + IN(4), 0, d.accent && /gold/i.test(d.fin) ? GOLD() : fm); cy(g, IN(0.9), IN(0.8), x, (H0 + H1) / 2 - IN(4), 0, d.accent && /gold/i.test(d.fin) ? GOLD() : fm); }
          else bx(g, bw, H1 - H0, d.inf === 'picket' ? IN(1.2) : bw, x, (H0 + H1) / 2, 0, fm); } break; }
      case 'hbar': { for (let i = 1; i <= d.n; i++) bx(g, w, IN(d.bw || 1.5), IN(0.8), mid, H0 + (H1 - H0) * i / (d.n + 1), 0, fm); bx(g, w, IN(1.5), IN(0.8), mid, H0, 0, fm); break; }
      case 'cable': for (let i = 0; i < d.n; i++) cy(g, IN(0.1), w, mid, H0 + (H1 - H0 - IN(1)) * i / (d.n - 1), 0, SSM(), 'x'); break;
      case 'rod': for (let i = 0; i < d.n; i++) cy(g, IN(0.3), w, mid, H0 + (H1 - H0 - IN(1.5)) * (i + 0.5) / d.n, 0, SSM(), 'x'); break;
      case 'board': { const bh = IN(5.5), n = d.n; for (let i = 0; i < n; i++) bx(g, w + IN(1), bh, IN(1), mid, H0 + (H1 - H0 - bh) * (i + 0.4) / n, IN(1.6), fm); break; }
      case 'floral': { bx(g, w, IN(1), IN(0.8), mid, H0 + IN(6), 0, fm); const n = Math.max(1, Math.round(w / 0.9)), sw = w / n;
        for (let i = 0; i < n; i++) { const x = a + sw * (i + 0.5); bx(g, IN(0.6), H1 - H0, IN(0.6), a + sw * i, (H0 + H1) / 2, 0, fm);
          const r1 = new THREE.Mesh(new THREE.TorusGeometry(sw * 0.36, IN(0.35), 6, 24), fm); r1.position.set(x, H0 + (H1 - H0) * 0.58, 0); g.add(r1);
          const r2 = new THREE.Mesh(new THREE.TorusGeometry(sw * 0.16, IN(0.35), 6, 18), d.accent && /gold/i.test(d.fin) ? GOLD() : fm); r2.position.copy(r1.position); g.add(r2);
          const c2 = new THREE.Mesh(new THREE.SphereGeometry(IN(0.8), 10, 8), d.accent && /gold/i.test(d.fin) ? GOLD() : fm); c2.position.copy(r1.position); g.add(c2);
          for (const s of [-1, 1]) { const cu = new THREE.Mesh(new THREE.TorusGeometry(sw * 0.2, IN(0.3), 6, 16, Math.PI), fm); cu.position.set(x + s * sw * 0.2, H0 + (H1 - H0) * 0.22, 0); cu.rotation.z = s > 0 ? 0 : Math.PI; g.add(cu); } } break; }
      case 'jali': { const t = jaliTex().clone(); t.needsUpdate = true; t.repeat.set(w / 0.6, (H1 - H0) / 0.6); const jm = new THREE.MeshStandardMaterial({ color: fm.color, roughness: 0.5, alphaMap: t, alphaTest: 0.5, side: THREE.DoubleSide });
        const p = new THREE.Mesh(new THREE.PlaneGeometry(w, H1 - H0), jm); p.position.set(mid, (H0 + H1) / 2, 0); p.castShadow = true; g.add(p); bx(g, IN(0.8), H1 - H0, IN(0.8), a + IN(0.4), (H0 + H1) / 2, 0, fm); bx(g, IN(0.8), H1 - H0, IN(0.8), b - IN(0.4), (H0 + H1) / 2, 0, fm); break; }
      case 'glass': { const gy0 = d.channel ? 0.25 : d.spigot ? IN(4) : H0, gy1 = d.channel ? h : d.spigot ? h : H1 - IN(0.5);
        const panes = d.frame ? Math.max(1, Math.round(w / 4)) : 1, pw2 = w / panes;
        for (let i = 0; i < panes; i++) { const x = a + pw2 * (i + 0.5), p = new THREE.Mesh(new THREE.BoxGeometry(pw2 - IN(0.6), gy1 - gy0, IN(0.5)), GLASS()); p.position.set(x, (gy0 + gy1) / 2, 0); g.add(p);
          if (d.spigot) for (const s of [-0.3, 0.3]) { cy(g, IN(1), IN(8), x + s * pw2, IN(4), 0, SSM()); }
          if (d.clamps) for (const s of [-1, 1]) for (const yy of [gy0 + 0.4, gy1 - 0.4]) bx(g, IN(1.6), IN(1.6), IN(1.4), x + s * (pw2 / 2 - IN(1.5)), yy, 0, SSM()); }
        if (d.channel) bx(g, w, IN(4), IN(3), mid, IN(2), 0, finish(d.fin, 'Silver anodised'));
        if (d.rail) { bx(g, w, IN(1), IN(1.2), mid, H0 - IN(0.5), 0, mt('blk', { color: 0x1C1C1C, roughness: 0.45 })); }
        break; }
    }
  });
  return posts;
}

// the spec from a design + the picks
export function railSpec(sku, m, o) {
  const code = railCode(sku), gp = o.groups || {}, gv = re => { const k = Object.keys(gp).find(x => re.test(x)); if (k) return gp[k]; const gr = (m.groups || []).find(x => re.test(x.name)); return gr && gr.options && gr.options[0] ? gr.options[0].name : ''; };
  const hs = gv(/^height/i), hm = /(\d(?:\.\d)?)\s*ft/.exec(hs || ''), cs = gv(/corner/i), cn = /(\d)\s*corner/.exec(cs || '');
  const mats = (m.materials || []), mat = mats.find(x => x.name === o.material) || mats[0] || {}, col = o.colour || ((mat.colours || [])[0] || {}).name || mat.name || '';
  return { code, L: Math.max(4, +o.l || 12), h: hm ? +hm[1] : 3.5, side: /side mount/i.test(gv(/fixing/i)), corners: cn ? +cn[1] : 0, fin: col, cap: (o.addons || []).some(a => /top cap/i.test(a)) };
}

// the balcony: a slab with its open edge at z = 0, the railing along it (and back along the sides for corners), a person behind it
export function railStudio(sp) {
  const S = new THREE.Group(), d = Object.assign({ k: sp.code, fin: sp.fin }, R[sp.code] || R['MS-BARS']), fm = finish(sp.fin, d.wood ? 'Teak' : d.inf === 'glass' ? 'Satin' : 'Black');
  if (sp.cap && d.top === 'none') d.top = 'slot';
  const nc = Math.min(2, sp.corners || 0), ret = nc ? Math.max(3, Math.min(8, sp.L * 0.25)) : 0, F = Math.max(4, sp.L - ret * nc), h = sp.h, dep = Math.max(8, ret + 3);
  const slab = mt('slab', { color: 0xCFCBC3, roughness: 0.92 });
  bx(S, F + 0.4, 0.6, dep, 0, -0.3, -dep / 2 + (sp.side ? 0 : 0.35), slab);                                     // the slab + its edge
  const n0 = S.children.length; studioFloor(S, -F / 2 - 0.2, -dep + (sp.side ? 0 : 0.35), F + 0.4, dep - 0.05); S.children.slice(n0).forEach(c => { if (!c.userData.studio) S.remove(c); });   // tiles only — the ground is far below
  const front = new THREE.Group(); front.position.set(-F / 2, 0, sp.side ? 0.05 : 0); S.add(front); run(front, F, h, d, fm, sp.side);
  for (let i = 0; i < nc; i++) { const s = i ? 1 : -1, r = new THREE.Group(); r.rotation.y = s * Math.PI / 2; r.position.set(s * (F / 2 - IN(1)), 0, s < 0 ? -ret : 0); S.add(r);
    if (s > 0) { r.rotation.y = Math.PI / 2; r.position.set(F / 2 - IN(1), 0, 0); } else { r.rotation.y = -Math.PI / 2; r.position.set(-F / 2 + IN(1), 0, -ret); }
    run(r, ret, h, d, fm, false);
    bx(S, 0.4, 0.6, ret, s * (F / 2 - 0.2), -0.3, -ret / 2, slab); }
  const far = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), mt('void', { color: 0xDCE3E6, roughness: 1 })); far.rotation.x = -Math.PI / 2; far.position.y = -14; S.add(far);
  person(S, F / 2 - 1.6 - (nc > 1 ? 0.6 : 0), -4, -0.4);
  return { g: S, L: F, D: dep, H: h, span: Math.max(F + 4, 12) };
}
