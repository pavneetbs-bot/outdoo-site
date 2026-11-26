// 276 (owner): real laid floors — every tile drawn one by one in feet: laying pattern (stack, running bond with mixed
// lengths, herringbone, basketweave, French / Versailles, crazy paving, hex, zellige, encaustic, deck boards, seamless),
// its own shade per tile, grout or grass joints, bevelled edges, and a bump map from the same drawing.
// One recipe per name (SPECS); space3d makes textures from it, plan2d uses a small image of it.

const rnd = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hx = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const shade = (c, f) => { const [r, g, b] = hx(c); const k = v => Math.max(0, Math.min(255, Math.round(v * f))); return `rgb(${k(r)},${k(g)},${k(b)})`; };

// pat: the laying pattern · u / w / d: tile size (ft) · g: joint (ft) · pal: tile colours · v: shade spread · j: joint colour or 'grass'
// m: surface (stone, trav, brick, clay, wood, lime, cement, glaze, terrazzo) · rot: the whole pattern turned (deg)
export const SPECS = {
  // Tropical — mixed-size sandstone, grass in the joints of the paths, teak deck
  trop_field: { pat: 'french', u: 1, g: 0.05, pal: ['#9C9A94', '#8C8A84', '#A6A49E', '#83817B', '#96948E', '#7C7A75'], v: 0.07, j: '#6A6863', m: 'stone' },   // 292 (owner): Tropical = grey stone pavers
  trop_path: { pat: 'flag', n: 16, P: 6, g: 0.13, pal: ['#9A9892', '#8A8882', '#A8A6A0', '#7E7C77'], v: 0.08, j: 'grass', m: 'stone' },
  trop_rug: { pat: 'deck', w: 0.47, lens: [6, 8, 10], g: 0.03, pal: ['#4E3322', '#462E1F', '#553826', '#3F2A1C'], v: 0.06, j: '#1C130C', m: 'wpc' },   // 276: decks are always WPC boards (fabricated, not civil) — teak
  // Turkish — 6" encaustic cement tiles, terracotta hex border, kilims
  turk_field: { pat: 'enc', u: 0.5, g: 0.012, pal: ['#EFE6D4', '#E9DFCB', '#F2EADA'], ink: ['#B08D57'], ink2: '#2F6E73', v: 0.04, j: '#DDD2BF', m: 'cement' },   // 294: beige encaustic, brass + a little teal
  turk_border: { pat: 'hex', u: 0.38, g: 0.04, pal: ['#C9AE86', '#D6BE97', '#BFA27A', '#CDB48E'], v: 0.08, j: '#EFE7D8', m: 'clay' },
  turk_path: { pat: 'zellige', u: 0.33, g: 0.025, pal: ['#E3CFAE', '#D9C39E', '#C9AE86', '#E8D8BC', '#2F6E73'], v: 0.1, j: '#F1E9DA', m: 'glaze' },
  // Santorini — lime-washed stone, grey pebble mosaic paths
  sant_field: { pat: 'flag', n: 18, P: 7, g: 0.2, pal: ['#8E9AA3', '#9AA4AB', '#7F8A93', '#A6AEB3', '#8A9098'], v: 0.07, j: '#F4F2EC', m: 'stone' },   // 296: grey flagstone with thick white joints
  sant_path: { pat: 'pebmosaic', P: 3, pal: ['#1F4FA8', '#2A5CB6', '#1A4592', '#3368C0'], v: 0.08, j: '#F6F5F1', m: 'stone' },   // 296: white floor, painted blue pebbles
  sant_border: { pat: 'stack', w: 0.33, d: 0.33, g: 0.02, pal: ['#2B5DA8', '#2F65B3', '#26549A', '#3470BE'], v: 0.1, j: '#F4F2EC', m: 'glaze' },
  // Modern — 2 × 4 concrete pavers, stack bond, grass strips between the rows
  mod_field: { pat: 'stack', w: 2, d: 4, g: 0.03, gz: 0.35, jz: 'grass', pal: ['#D9D2C5', '#D2CBBE', '#DED8CC', '#CFC8BA'], v: 0.04, j: '#A8A198', m: 'cement' },
  mod_rug: { pat: 'stack', w: 1, d: 3, g: 0.02, pal: ['#4A4A48', '#444442', '#52524F'], v: 0.04, j: '#2E2E2C', m: 'cement' },
  mod_deck: { pat: 'deck', w: 0.47, lens: [6, 8, 10], g: 0.03, pal: ['#9A6A42', '#8F6240', '#A47249', '#8A5D3A'], v: 0.06, j: '#3A2618', m: 'wpc' },   // 298: warm teak WPC
  mod_border: { pat: 'stack', w: 0.75, d: 2, g: 0.02, pal: ['#2F2E2C', '#363431', '#2A2927'], v: 0.06, j: '#1E1D1B', m: 'stone' },
  // Contemporary — travertine French pattern, oak herringbone deck where people sit
  cont_field: { pat: 'french', u: 0.67, g: 0.025, pal: ['#E2D5BE', '#DCCDB3', '#E7DCC7', '#D5C4A7', '#DFD1B8'], v: 0.05, j: '#CBBC9F', m: 'trav' },
  cont_rug: { pat: 'deck', w: 0.47, lens: [6, 8, 10], g: 0.03, pal: ['#B08560', '#A57B56', '#BA8F68', '#9C734F'], v: 0.06, j: '#4A3626', m: 'wpc' },   // WPC oak
  // Minimal — microcement, big faint joints
  min_field: { pat: 'stack', w: 4, d: 4, g: 0.012, pal: ['#E9E6E0', '#E5E2DB', '#ECE9E3'], v: 0.015, j: '#D2CEC6', m: 'micro' },
  min_rug: { pat: 'deck', w: 0.47, lens: [6, 8, 10], g: 0.025, pal: ['#D2B994', '#CDB38D', '#D8C09C'], v: 0.04, j: '#8E7A5E', m: 'wpc' },   // WPC light oak
  studio_grey: { pat: 'stack', w: 2, d: 4, g: 0.02, pal: ['#7E7D79', '#787773', '#84837F', '#73726E'], v: 0.025, j: '#5F5E5A', m: 'cement' },   // design studio: plain grey 2 × 4 ft tiles under every customiser
  wpc_grey: { pat: 'deck', w: 0.47, lens: [6, 8, 10], g: 0.03, pal: ['#8E8A84', '#86827C', '#96928B'], v: 0.04, j: '#3A3835', m: 'wpc' },
  wpc_walnut: { pat: 'deck', w: 0.47, lens: [6, 8, 10], g: 0.03, pal: ['#5E3B26', '#56361F', '#66422B'], v: 0.06, j: '#24170E', m: 'wpc' },
  // Boho / rustic — terracotta brick herringbone, a basketweave "rug" where people sit, brick soldier border
  boho_field: { pat: 'herring', w: 0.33, l: 0.67, g: 0.028, pal: ['#A9583A', '#9A4F33', '#B5623F', '#8E482E', '#B86B47', '#9F5537'], v: 0.1, j: '#9C8566', m: 'brick', rot: 45 },
  boho_rug: { pat: 'basket', w: 0.33, n: 2, g: 0.04, pal: ['#7A3E27', '#86452B', '#713924', '#8E4D31'], v: 0.08, j: '#BFA98A', m: 'brick' },
  boho_border: { pat: 'stack', w: 0.33, d: 0.67, g: 0.04, pal: ['#8E4A2E', '#9A5233', '#84442A'], v: 0.08, j: '#CDB998', m: 'brick' },
  boho_path: { pat: 'flag', n: 14, P: 6, g: 0.12, pal: ['#C9B48E', '#BFA982', '#D3C09C'], v: 0.08, j: 'grass', m: 'stone' } };

// 276c (owner): the floor-layout roles — a calm base, the feature (runners, rugs, hubs), checkers
Object.assign(SPECS, {
  turk_base: { pat: 'oct', u: 2, g: 0.03, pal: ['#EDE4D3', '#E6DBC6', '#F0E8D9'], pal2: ['#C9AE86', '#BFA27A', '#B08D57', '#C9AE86', '#BFA27A', '#2F6E73'], v: 0.04, j: '#D8CCB6', m: 'trav' },   // 294: cream travertine, brass / teal cabochon dots
  mod_plain: { pat: 'stack', w: 2, d: 4, g: 0.02, pal: ['#D9D2C5', '#D2CBBE', '#DED8CC', '#CFC8BA'], v: 0.04, j: '#A8A198', m: 'cement' },
  min_path: { pat: 'stack', w: 1, d: 3, g: 0.015, pal: ['#D9D6D0', '#D3D0C9', '#DEDBD5'], v: 0.02, j: '#BDB8AF', m: 'micro' },
  cont_enc: { pat: 'enc', u: 0.67, g: 0.012, pal: ['#E6DCC9', '#E1D6C2', '#EADFCD'], ink: ['#8E8A84'], ink2: '#B9A487', v: 0.03, j: '#CFC4B0', m: 'cement' },
  boho_enc: { pat: 'enc', u: 0.5, g: 0.012, pal: ['#EFE4D2', '#EADFCB', '#F2E8D8'], ink: ['#B5562F'], ink2: '#6B7A4A', v: 0.04, j: '#D8C6AA', m: 'cement' },
  sant_enc: { pat: 'enc', u: 0.5, g: 0.012, pal: ['#F6F4EF', '#F1EEE7'], ink: ['#2B5DA8'], ink2: '#6FA3D9', v: 0.03, j: '#D9D3C7', m: 'cement' },
  trop_chk: { pat: 'stack', alt: 1, w: 2, d: 2, g: 0.04, pal: ['#A6A49E', '#9C9A94'], pal2: ['#7E7C77', '#75736E'], v: 0.05, j: '#6A6863', m: 'stone' },
  turk_chk: { pat: 'stack', alt: 1, w: 1, d: 1, g: 0.03, pal: ['#D6BE97', '#CDB48E'], pal2: ['#F1E9DA', '#EDE4D3'], v: 0.05, j: '#D9CBB4', m: 'clay' },
  sant_chk: { pat: 'stack', alt: 1, w: 1.5, d: 1.5, g: 0.04, pal: ['#F6F4EF', '#F1EEE7'], pal2: ['#9EA3A8', '#8E949A'], v: 0.04, j: '#D9D3C7', m: 'lime' },
  mod_chk: { pat: 'stack', alt: 1, w: 2, d: 2, g: 0.02, pal: ['#C9C8C4', '#C2C1BD'], pal2: ['#5A5A58', '#626260'], v: 0.04, j: '#8E8C87', m: 'stone' },
  cont_chk: { pat: 'oct', u: 2, g: 0.03, pal: ['#E2D5BE', '#DCCDB3', '#E7DCC7'], pal2: ['#3A3835', '#2F2E2C'], v: 0.04, j: '#CBBC9F', m: 'trav' },
  min_chk: { pat: 'stack', alt: 1, w: 2, d: 2, g: 0.015, pal: ['#ECE9E3', '#E9E6E0'], pal2: ['#D6D2CB', '#D2CEC6'], v: 0.02, j: '#D2CEC6', m: 'micro' },
  boho_chk: { pat: 'stack', alt: 1, w: 1, d: 1, g: 0.035, pal: ['#B8643F', '#AD5D3A'], pal2: ['#EFE4D2', '#E8DCC6'], v: 0.06, j: '#C9B69A', m: 'clay' } });

// tiles of one pattern repeat, anchored inside [0, P) — each { p: [[x, z]…], c: colour index, f: shade, a: grain angle }
function tiles(S, R) { const T = [], add = (p, a) => T.push({ p, c: Math.floor(R() * S.pal.length), f: 1 + (R() * 2 - 1) * (S.v || 0.05), a: a || 0, s: R() });
  const rect = (x, z, w, d, a) => add([[x, z], [x + w, z], [x + w, z + d], [x, z + d]], a);
  let P = S.P ? [S.P, S.P] : [8, 8];
  if (S.pat === 'stack') { let nx = Math.max(1, Math.round(8 / S.w)), nz = Math.max(1, Math.round(8 / S.d)); if (S.alt) { nx += nx % 2; nz += nz % 2; } P = [nx * S.w, nz * S.d]; for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { rect(i * S.w, j * S.d, S.w, S.d); T[T.length - 1].k = (i + j) % 2; } }
  else if (S.pat === 'oct') { const u = S.u, c = u * 0.29, n = Math.max(2, Math.round(6 / u)); P = [n * u, n * u];   // octagons with small diamonds where four meet
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = i * u, z = j * u; add([[x + c, z], [x + u - c, z], [x + u, z + c], [x + u, z + u - c], [x + u - c, z + u], [x + c, z + u], [x, z + u - c], [x, z + c]]); add([[x, z - c], [x + c, z], [x, z + c], [x - c, z]]); T[T.length - 1].k = 1; } }
  else if (S.pat === 'running' || S.pat === 'deck') { const w = S.w, nz = Math.max(2, Math.round(8 / w)); P = [Math.max(...(S.lens || [w * 3])) * 2, nz * w]; P[0] = Math.max(P[0], 8);
    for (let j = 0; j < nz; j++) { let x = R() * 2; const L0 = x; while (x < P[0] + L0 - 0.01) { let L = S.lens ? S.lens[Math.floor(R() * S.lens.length)] : S.l || w * 3; if (x + L > P[0] + L0) L = P[0] + L0 - x; if (L < 0.6 && T.length) { T[T.length - 1].p[1][0] += L; T[T.length - 1].p[2][0] += L; break; } rect(x % P[0], j * w, L, w, 0); x += L; } } }
  else if (S.pat === 'herring') { const w = S.w, l = S.l, k = Math.round(l / w), n = Math.max(1, Math.round(6 / (w * 2 * k))), Pl = n * w * 2 * k, N = Math.ceil(Pl / (w * k)) + 3, M = Math.ceil(Pl / w) + N * k + 3; P = [Pl, Pl];   // 90° herringbone of k:1 bricks (turned 45° by rot); lattice (w, w) and (−k w, k w)
    for (let b = -N; b <= N; b++) for (let t = -M; t <= M; t++) { const ox = (t - b * k) * w, oz = (t + b * k) * w;
      if (ox >= -1e-6 && ox < Pl - 1e-6 && oz >= -1e-6 && oz < Pl - 1e-6) { rect(ox, oz, l, w, 0); rect(ox, oz + w, w, l, 90); } } }
  else if (S.pat === 'basket') { const w = S.w, n = S.n || 2, B = w * n, m = Math.max(2, Math.round(6 / B / 2) * 2); P = [m * B, m * B];
    for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) for (let q = 0; q < n; q++) (i + j) % 2 ? rect(i * B + q * w, j * B, w, B, 90) : rect(i * B, j * B + q * w, B, w, 0); }
  else if (S.pat === 'french') { const u = S.u, M = [[0, 0, 2, 2], [2, 0, 2, 1], [2, 1, 1, 1], [3, 1, 1, 2], [2, 2, 1, 2], [0, 2, 2, 1], [0, 3, 2, 1], [3, 3, 1, 1]], m = Math.max(2, Math.round(8 / (4 * u))); P = [m * 4 * u, m * 4 * u];
    for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) { const fx = R() < 0.5, fz = R() < 0.5, sw = R() < 0.5; M.forEach(([a, b, c, d]) => { let x = fx ? 4 - a - c : a, z = fz ? 4 - b - d : b, w = c, dd = d; if (sw) { [x, z] = [z, x]; [w, dd] = [dd, w]; } rect((i * 4 + x) * u, (j * 4 + z) * u, w * u, dd * u); }); } }
  else if (S.pat === 'hex') { const s = S.u, W = Math.sqrt(3) * s, nx = Math.max(2, Math.round(6 / W)), nz = Math.max(2, Math.round(6 / (3 * s))) * 2; P = [nx * W, nz * 1.5 * s];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const cx = i * W + (j % 2 ? W / 2 : 0), cz = j * 1.5 * s; add([0, 1, 2, 3, 4, 5].map(k => { const a = Math.PI / 6 + k * Math.PI / 3; return [cx + s * Math.cos(a), cz + s * Math.sin(a)]; })); } }
  else if (S.pat === 'zellige' || S.pat === 'enc') { const u = S.u, n = Math.max(2, Math.round((S.pat === 'enc' ? 4 : 5) / u)); P = [n * u, n * u]; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) rect(i * u, j * u, u, u); }
  return { T, P }; }

function surface(x, S, T, P, R, ppf) {   // the material over the tiles: speckles, veins, grain, mottling, glaze
  const W = P[0] * ppf, H = P[1] * ppf, m = S.m;
  if (m === 'stone' || m === 'brick' || m === 'clay' || m === 'terrazzo') { const n = W * H / (m === 'brick' ? 40 : 60); for (let i = 0; i < n; i++) { const d = R(); x.fillStyle = d < 0.5 ? `rgba(60,40,25,${0.05 + R() * 0.08})` : `rgba(255,248,235,${0.05 + R() * 0.08})`; const r = 0.4 + R() * (m === 'brick' ? 1.6 : 1.2); x.fillRect(R() * W, R() * H, r, r); } }
  if (m === 'trav') { for (let i = 0; i < W * H / 260; i++) { x.fillStyle = `rgba(150,128,96,${0.12 + R() * 0.12})`; x.beginPath(); x.ellipse(R() * W, R() * H, 0.6 + R() * 2.4, 0.4 + R() * 0.8, 0, 0, 7); x.fill(); } x.lineWidth = 0.6; for (let i = 0; i < H / 14; i++) { x.strokeStyle = `rgba(175,155,120,${0.05 + R() * 0.07})`; const y = R() * H; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(W / 3, y + 3 * (R() - 0.5), 2 * W / 3, y + 3 * (R() - 0.5), W, y); x.stroke(); } }
  if (m === 'lime' || m === 'micro' || m === 'cement') { for (let i = 0; i < W * H / 120; i++) { x.fillStyle = m === 'lime' ? `rgba(200,190,170,${R() * 0.07})` : `rgba(110,104,96,${R() * 0.05})`; x.beginPath(); x.ellipse(R() * W, R() * H, 2 + R() * 9, 1.5 + R() * 6, R() * 3, 0, 7); x.fill(); } }
  if (m === 'glaze') T.forEach(t => { if (t.s < 0.5) return; const [a, b] = t.p[0]; x.fillStyle = 'rgba(255,255,255,.16)'; x.beginPath(); x.ellipse((a + 0.3 * (t.p[2][0] - a)) * ppf, (b + 0.3 * (t.p[2][1] - b)) * ppf, (t.p[2][0] - a) * ppf * 0.25, (t.p[2][1] - b) * ppf * 0.12, -0.6, 0, 7); x.fill(); });
  if (m === 'wpc') T.forEach(t => { const xs = t.p.map(q => q[0]), zs = t.p.map(q => q[1]), x0 = Math.min(...xs) * ppf, x1 = Math.max(...xs) * ppf, z0 = Math.min(...zs) * ppf, z1 = Math.max(...zs) * ppf, n = 4;   // WPC boards: fine grooves along the length, a light brushed grain
    for (let k = 1; k < n; k++) { const y = z0 + (z1 - z0) * k / n; x.fillStyle = 'rgba(20,12,6,.16)'; x.fillRect(x0 + 1, y - 0.6, x1 - x0 - 2, 1.1); x.fillStyle = 'rgba(255,245,230,.08)'; x.fillRect(x0 + 1, y + 0.6, x1 - x0 - 2, 0.8); }
    for (let k = 0; k < 6; k++) { x.fillStyle = `rgba(40,25,12,${0.03 + R() * 0.05})`; x.fillRect(x0 + (x1 - x0) * R(), z0 + 1 + (z1 - z0 - 2) * R(), (x1 - x0) * (0.2 + R() * 0.5), 0.7); } });
  if (m === 'wood') T.forEach(t => { x.save(); x.beginPath(); t.p.forEach(([a, b], i) => i ? x.lineTo(a * ppf, b * ppf) : x.moveTo(a * ppf, b * ppf)); x.closePath(); x.clip(); const xs = t.p.map(q => q[0]), zs = t.p.map(q => q[1]), x0 = Math.min(...xs) * ppf, x1 = Math.max(...xs) * ppf, z0 = Math.min(...zs) * ppf, z1 = Math.max(...zs) * ppf, v = t.a === 90;
    x.lineWidth = 0.7; for (let k = 0; k < 7; k++) { x.strokeStyle = `rgba(60,35,18,${0.08 + R() * 0.12})`; x.beginPath(); if (v) { const c = x0 + (x1 - x0) * R(); x.moveTo(c, z0); x.bezierCurveTo(c + 2 * (R() - 0.5), z0 + (z1 - z0) / 3, c + 2 * (R() - 0.5), z0 + 2 * (z1 - z0) / 3, c, z1); } else { const c = z0 + (z1 - z0) * R(); x.moveTo(x0, c); x.bezierCurveTo(x0 + (x1 - x0) / 3, c + 2 * (R() - 0.5), x0 + 2 * (x1 - x0) / 3, c + 2 * (R() - 0.5), x1, c); } x.stroke(); }
    if (R() < 0.25) { x.fillStyle = 'rgba(50,30,15,.25)'; x.beginPath(); x.ellipse(x0 + (x1 - x0) * R(), z0 + (z1 - z0) * R(), 1.4, 0.8, v ? 1.57 : 0, 0, 7); x.fill(); } x.restore(); }); }

function grass(x, W, H, R) { x.fillStyle = '#5E8F3E'; x.fillRect(0, 0, W, H); const C = ['#4F8236', '#6FA24A', '#7DB255', '#5A8C3B', '#8BBE5E']; x.lineWidth = 1; for (let i = 0; i < W * H / 6; i++) { x.strokeStyle = C[i % 5]; const a = R() * W, b = R() * H; x.beginPath(); x.moveTo(a, b); x.lineTo(a + (R() - 0.5) * 3, b - 2 - R() * 4); x.stroke(); } }

function encMotif(x, S, t, ppf, bump) {   // a small 6" encaustic cement tile — a four-petal flower in the middle, quarter rings in the corners (they make circles where four tiles meet)
  const [a, b] = t.p[0], u = S.u * ppf, cx = a * ppf + u / 2, cz = b * ppf + u / 2, I = S.ink[0], I2 = S.ink2; x.save(); x.beginPath(); x.rect(a * ppf, b * ppf, u, u); x.clip(); x.translate(cx, cz);
  if (bump) { x.fillStyle = 'rgba(0,0,0,.06)'; x.beginPath(); x.arc(0, 0, u * 0.3, 0, 7); x.fill(); x.restore(); return; }
  x.fillStyle = I; for (let k = 0; k < 4; k++) { x.save(); x.rotate(k * Math.PI / 2); x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(u * 0.16, -u * 0.08, u * 0.14, -u * 0.3, 0, -u * 0.34); x.bezierCurveTo(-u * 0.14, -u * 0.3, -u * 0.16, -u * 0.08, 0, 0); x.fill(); x.restore(); }
  x.fillStyle = I2; x.beginPath(); x.arc(0, 0, u * 0.07, 0, 7); x.fill();
  x.lineWidth = u * 0.07; x.strokeStyle = I2; [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => { x.beginPath(); x.arc(sx * u / 2, sz * u / 2, u * 0.22, 0, 7); x.stroke(); });
  x.fillStyle = I; [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => { x.beginPath(); x.arc(sx * u / 2, sz * u / 2, u * 0.1, 0, 7); x.fill(); });
  x.restore(); }

// the whole repeat on a canvas (colour + bump)
function paint(S, ppf, bump) { const R = rnd(7919), { T, P } = tiles(S, R), W = Math.round(P[0] * ppf), H = Math.round(P[1] * ppf);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
  if (S.pat === 'flag' || S.pat === 'pebmosaic') { voronoi(x, S, W, H, P, ppf, bump); return { cv, P }; }
  const jc = S.j === 'grass' ? null : S.j;
  if (bump) { x.fillStyle = '#3A3A3A'; x.fillRect(0, 0, W, H); } else if (S.j === 'grass') grass(x, W, H, rnd(31)); else { x.fillStyle = jc; x.fillRect(0, 0, W, H); }
  if (S.jz === 'grass' && !bump) { const gc = document.createElement('canvas'); gc.width = W; gc.height = H; grass(gc.getContext('2d'), W, H, rnd(31)); for (let j = 0; j * S.d <= P[1] + 1e-6; j++) { const y0 = Math.max(0, Math.round((j * S.d - S.gz / 2) * ppf)), y1 = Math.min(H, Math.round((j * S.d + S.gz / 2) * ppf)); if (y1 > y0) x.drawImage(gc, 0, y0, W, y1 - y0, 0, y0, W, y1 - y0); } }
  const gx = (S.g || 0.03) / 2, gz = (S.jz ? S.gz : S.g || 0.03) / 2;
  const draw = (t, dx, dz) => { const xs = t.p.map(q => q[0]), zs = t.p.map(q => q[1]), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2;
    const pts = t.p.map(([a, b]) => { const sx = Math.sign(a - cx), sz = Math.sign(b - cz); if (S.pat === 'hex' || S.pat === 'oct') { const L = Math.hypot(a - cx, b - cz), k = (L - gx) / L; return [(cx + (a - cx) * k + dx) * ppf, (cz + (b - cz) * k + dz) * ppf]; } const vx = t.a === 90 ? gz : gx, vz = S.jz ? (t.a === 90 ? gx : gz) : gx; return [(a - sx * vx + dx) * ppf, (b - sz * vz + dz) * ppf]; });
    const path = (o) => { x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a + o, b + o) : x.moveTo(a + o, b + o)); x.closePath(); }; path(0);
    if (bump) { const v = Math.round(185 + (t.f - 1) * 300 + t.s * 25); x.fillStyle = `rgb(${v},${v},${v})`; x.fill(); x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = Math.max(1, ppf * 0.03); x.stroke(); }
    else { const pl = t.k && S.pal2 ? S.pal2 : S.pal; x.fillStyle = shade(pl[t.c % pl.length], t.f); x.fill(); if (S.m !== 'micro') { const o = Math.max(1, ppf * 0.02); x.save(); x.clip(); x.lineWidth = o * 1.6; path(o); x.strokeStyle = 'rgba(255,250,240,.28)'; x.stroke(); path(-o); x.strokeStyle = 'rgba(30,20,10,.26)'; x.stroke(); x.restore(); } }
    if (S.pat === 'enc') { x.save(); x.translate(dx * ppf, dz * ppf); encMotif(x, S, t, ppf, bump); x.restore(); } };
  [-1, 0, 1].forEach(a => [-1, 0, 1].forEach(b => T.forEach(t => draw(t, a * P[0], b * P[1]))));
  if (!bump) surface(x, S, T, P, rnd(101), ppf);
  return { cv, P }; }

function voronoi(x, S, W, H, P0, ppf, bump) { const P = [W / ppf, H / ppf];   // crazy paving (flagstones with grass joints) / pebble mosaic — per pixel, wraps
  const R = rnd(4243), mos = S.pat === 'pebmosaic', n = mos ? Math.round(P[0] * P[1] * 22) : Math.round(S.n * P[0] * P[1] / 36), pts = [];
  for (let i = 0; i < n; i++) pts.push([R() * P[0], R() * P[1], Math.floor(R() * S.pal.length), 1 + (R() * 2 - 1) * (S.v || 0.06), R()]);
  const C = S.pal.map(hx), gw = mos ? 0.05 : S.g / 2, im = x.createImageData(W, H), D = im.data, gR = rnd(55), JC = S.j !== 'grass' && hx(S.j), GC = [[79, 130, 54], [111, 162, 74], [94, 143, 62], [125, 178, 85]];
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) { const fx = px / ppf, fz = py / ppf; let d1 = 1e9, d2 = 1e9, k1 = 0;
    for (let i = 0; i < n; i++) { let dx = Math.abs(fx - pts[i][0]), dz = Math.abs(fz - pts[i][1]); if (dx > P[0] / 2) dx = P[0] - dx; if (dz > P[1] / 2) dz = P[1] - dz; const dd = mos ? Math.hypot(dx, dz * 1.2) : Math.hypot(dx, dz); if (dd < d1) { d2 = d1; d1 = dd; k1 = i; } else if (dd < d2) d2 = dd; }
    const o = (py * W + px) * 4, edge = (d2 - d1) / 2, p = pts[k1]; let r, g, b;
    if (mos ? d1 > 0.13 + p[4] * 0.04 : edge < gw) { if (bump) r = g = b = 40; else if (JC) { const q = 1 + (gR() - 0.5) * 0.1; [r, g, b] = JC.map(v => v * q); } else [r, g, b] = GC[Math.floor(gR() * 4)]; }
    else { const e = mos ? Math.max(0, 1 - d1 / 0.17) : Math.min(1, (edge - gw) / 0.08); if (bump) r = g = b = 120 + e * 110 + p[4] * 20; else { const f = p[3] * (0.86 + 0.14 * e) * (1 + (gR() - 0.5) * 0.06); [r, g, b] = C[p[2]].map(v => v * f); } }
    D[o] = r; D[o + 1] = g; D[o + 2] = b; D[o + 3] = 255; }
  x.putImageData(im, 0, 0); }

const CV = {};
export function layCanvas(name, ppf, bump) { const S = SPECS[name]; if (!S) return null; const k = name + ':' + ppf + ':' + (bump ? 1 : 0); return CV[k] || (CV[k] = paint(S, ppf, bump)); }
export function layPeriod(name) { const S = SPECS[name]; return !S ? [2, 2] : S.P ? [S.P, S.P] : tiles(S, rnd(7919)).P; }
export function layRot(name) { const S = SPECS[name]; return S && S.rot || 0; }
const URL0 = {};
export function layUrl(name) { if (URL0[name]) return URL0[name]; const L = layCanvas(name, 24); if (!L) return ''; try { return (URL0[name] = L.cv.toDataURL('image/jpeg', 0.82)); } catch (e) { return ''; } }
export function layAvg(name) { const S = SPECS[name]; return S ? S.pal[0] : '#DDD'; }
