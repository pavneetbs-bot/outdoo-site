// outrr — 287: read a customer's CAD terrace drawing (PDF) the way an architect would: the drawing's own lines give the
// exact scale and the exact wall edges; Claude (Edge Function "layouts") only says WHICH box is what, on a gridded picture.
//   prep(u8, pj)  → { img (JPEG base64 of the drawing area with a % grid), words (labels with % positions), scale info, lines }
//   toFeet(R, P)  → Claude's answer in % of that picture → the layout in feet (same shape the planner already reads),
//                   every edge pulled onto the nearest drawn line, sizes from the drawing's own dimension scale.
// pj = the pdf.js module (the store loads it from jsDelivr).

const MM_FT = 304.8;

function mul(m, n) { return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]]; }
const ap = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

// every straight piece of every path, in viewport pixels (y down)
async function lines(pg, vp, pj) {
  const ol = await pg.getOperatorList(), O = pj.OPS, out = []; let ctm = vp.transform.slice(); const stack = [];
  for (let i = 0; i < ol.fnArray.length; i++) { const fn = ol.fnArray[i], a = ol.argsArray[i];
    if (fn === O.save) stack.push(ctm.slice()); else if (fn === O.restore) ctm = stack.pop() || ctm; else if (fn === O.transform) ctm = mul(ctm, a);
    else if (fn === O.constructPath) { const ops = a[0], c = a[1]; let j = 0, cx = 0, cy = 0, sx = 0, sy = 0; const seg = (x0, y0, x1, y1) => { const p = ap(ctm, x0, y0), q = ap(ctm, x1, y1); out.push([p[0], p[1], q[0], q[1]]); };
      for (const op of ops) {
        if (op === O.rectangle) { const x = c[j++], y = c[j++], w = c[j++], h = c[j++]; seg(x, y, x + w, y); seg(x + w, y, x + w, y + h); seg(x + w, y + h, x, y + h); seg(x, y + h, x, y); cx = x; cy = y; }
        else if (op === O.moveTo) { cx = sx = c[j++]; cy = sy = c[j++]; }
        else if (op === O.lineTo) { const x = c[j++], y = c[j++]; seg(cx, cy, x, y); cx = x; cy = y; }
        else if (op === O.curveTo) { j += 4; cx = c[j++]; cy = c[j++]; }
        else if (op === O.curveTo2 || op === O.curveTo3) { j += 2; cx = c[j++]; cy = c[j++]; }
        else if (op === O.closePath) { seg(cx, cy, sx, sy); cx = sx; cy = sy; } } } }
  // keep the straight horizontal / vertical pieces (walls, dimension lines) longer than a few pixels
  return out.map(s => { const h = Math.abs(s[1] - s[3]) < 0.6, v = Math.abs(s[0] - s[2]) < 0.6; if (h) return s[0] <= s[2] ? [s[0], s[1], s[2], s[1], 'h'] : [s[2], s[1], s[0], s[1], 'h']; if (v) return s[1] <= s[3] ? [s[0], s[1], s[0], s[3], 'v'] : [s[0], s[3], s[0], s[1], 'v']; return null; })
    .filter(s => s && Math.hypot(s[2] - s[0], s[3] - s[1]) >= 4);
}

// the drawing's scale (mm per viewport pixel) from its dimension strings: a number beside a parallel line of about its length
function scaleOf(words, L) {
  const R = [];
  words.forEach(w => { if (!/^\d{3,5}$/.test(w.s)) return; const n = +w.s, vert = w.h > w.w * 1.3, cx = w.x + w.w / 2, cy = w.y + w.h / 2; let best = null;
    for (const s of L) { if ((s[4] === 'v') !== vert) continue; const Ln = s[4] === 'h' ? s[2] - s[0] : s[3] - s[1]; if (Ln < 8) continue;
      const mx = (s[0] + s[2]) / 2, my = (s[1] + s[3]) / 2, dist = s[4] === 'h' ? Math.abs(cy - my) : Math.abs(cx - mx), along = s[4] === 'h' ? Math.abs(cx - mx) : Math.abs(cy - my), tol = Math.max(w.w, w.h) * 0.9 + 4;
      if (dist < tol && along < Ln / 2) { const sc = dist + along * 0.2; if (!best || sc < best[0]) best = [sc, Ln]; } }
    if (best) R.push({ r: n / best[1], w }); });
  if (R.length < 3) return null;
  // the most common ratio (within 3 %) wins
  let top = null; R.forEach(a => { const k = R.filter(b => Math.abs(b.r / a.r - 1) < 0.03); if (!top || k.length > top.length) top = k; });
  if (top.length < 3) return null; const rs = top.map(a => a.r).sort((p, q) => p - q);
  return { mmPx: rs[Math.floor(rs.length / 2)], n: top.length, of: R.length, dims: top.map(a => a.w) };
}

// 345 (owner: "tracing accurate nahi"): the roof's outline straight from the drawing — every filled / stroked path is drawn
// onto a mask, hatching is merged, thin lines (dimensions, text, frames) are dropped, small gaps sealed, and the outer
// edge of the walls is traced and simplified. Claude's outline is used only when this finds nothing that fits.
function morph(M, w, h, r, dil) {   // square dilation (dil) / erosion, separable, running counts — O(n)
  if (r < 1) return M; const T = new Uint8Array(w * h), O = new Uint8Array(w * h), on = dil ? 1 : 0;
  for (let y = 0; y < h; y++) { const o = y * w; let c = 0; for (let x = -r; x < w; x++) { const a = x + r, d = x - r - 1; if (a < w && (M[o + a] === on)) c++; if (d >= 0 && (M[o + d] === on)) c--; if (x >= 0) T[o + x] = c > 0 ? on : 1 - on; } }
  for (let x = 0; x < w; x++) { let c = 0; for (let y = -r; y < h; y++) { const a = y + r, d = y - r - 1; if (a < h && (T[a * w + x] === on)) c++; if (d >= 0 && (T[d * w + x] === on)) c--; if (y >= 0) O[y * w + x] = c > 0 ? on : 1 - on; } }
  return O; }
async function wallOutline(pg, vp, pj, mmPx) {
  const S = Math.min(1, 2200 / Math.max(vp.width, vp.height)), w = Math.round(vp.width * S), h = Math.round(vp.height * S), mpx = mmPx / S, R = v => Math.max(1, Math.round(v / mpx));
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = g.strokeStyle = '#000'; g.lineCap = 'butt';
  const ol = await pg.getOperatorList(), O = pj.OPS; let ctm = vp.transform.slice(), fill = [0, 0, 0], lw = 0, path = null; const st = [];
  const dev = (x, y) => { const q = ap(ctm, x, y); return [q[0] * S, q[1] * S]; }, white = c => c[0] > 235 && c[1] > 235 && c[2] > 235;
  for (let i = 0; i < ol.fnArray.length; i++) { const fn = ol.fnArray[i], a = ol.argsArray[i];
    if (fn === O.save) st.push([ctm.slice(), fill, lw]); else if (fn === O.restore) { const z = st.pop(); if (z) [ctm, fill, lw] = z; } else if (fn === O.transform) ctm = mul(ctm, a);
    else if (fn === O.setFillRGBColor) fill = [a[0], a[1], a[2]]; else if (fn === O.setFillGray) fill = [a[0] * 255, a[0] * 255, a[0] * 255]; else if (fn === O.setLineWidth) lw = +a[0] || 0;
    else if (fn === O.constructPath) { const ops = a[0], c = a[1]; let j = 0, cx = 0, cy = 0; path = new Path2D();
      const mv = (x, y) => { const q = dev(x, y); path.moveTo(q[0], q[1]); }, ln = (x, y) => { const q = dev(x, y); path.lineTo(q[0], q[1]); }, bz = (x1, y1, x2, y2, x3, y3) => { const p1 = dev(x1, y1), p2 = dev(x2, y2), p3 = dev(x3, y3); path.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]); };
      for (const op of ops) {
        if (op === O.rectangle) { const x = c[j++], y = c[j++], ww = c[j++], hh = c[j++]; mv(x, y); ln(x + ww, y); ln(x + ww, y + hh); ln(x, y + hh); path.closePath(); cx = x; cy = y; }
        else if (op === O.moveTo) { cx = c[j++]; cy = c[j++]; mv(cx, cy); } else if (op === O.lineTo) { cx = c[j++]; cy = c[j++]; ln(cx, cy); }
        else if (op === O.curveTo) { const v = c.slice(j, j + 6); j += 6; bz(...v); cx = v[4]; cy = v[5]; }
        else if (op === O.curveTo2) { const v = c.slice(j, j + 4); j += 4; bz(cx, cy, v[0], v[1], v[2], v[3]); cx = v[2]; cy = v[3]; }
        else if (op === O.curveTo3) { const v = c.slice(j, j + 4); j += 4; bz(v[0], v[1], v[2], v[3], v[2], v[3]); cx = v[2]; cy = v[3]; }
        else if (op === O.closePath) path.closePath(); } }
    else if (path && (fn === O.fill || fn === O.eoFill || fn === O.fillStroke || fn === O.eoFillStroke || fn === O.closeFillStroke || fn === O.closeEOFillStroke || fn === O.stroke || fn === O.closeStroke)) {
      const doFill = fn !== O.stroke && fn !== O.closeStroke, doStroke = !(fn === O.fill || fn === O.eoFill);
      if (doFill && !white(fill)) g.fill(path, fn === O.eoFill || fn === O.eoFillStroke || fn === O.closeEOFillStroke ? 'evenodd' : 'nonzero');
      if (doStroke) { const sc = Math.hypot(ctm[0], ctm[1]) * S; g.lineWidth = Math.max(1, lw * sc); g.stroke(path); }
      path = null; }
    else if (fn === O.endPath) path = null; }
  const D = g.getImageData(0, 0, w, h).data; let M = new Uint8Array(w * h); for (let k = 0; k < w * h; k++) M[k] = D[k * 4] < 128 ? 1 : 0;
  M = morph(morph(M, w, h, R(55), true), w, h, R(55), false);    // hatching / double lines → solid walls
  M = morph(morph(M, w, h, R(70), false), w, h, R(70), true);    // thin lines (dimensions, text, frames) gone
  const rg = R(560); let G = morph(M, w, h, rg, true);              // gaps up to ~1.1 m (a door) sealed for the outside flood
  const ext = new Uint8Array(w * h), q = new Int32Array(w * h); let qh = 0, qt = 0; const push = k => { if (!ext[k] && !G[k]) { ext[k] = 1; q[qt++] = k; } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); } for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (qh < qt) { const k = q[qh++], x = k % w; if (x > 0) push(k - 1); if (x < w - 1) push(k + 1); if (k >= w) push(k - w); if (k < w * (h - 1)) push(k + w); }
  let In = new Uint8Array(w * h); for (let k = 0; k < w * h; k++) In[k] = ext[k] ? 0 : 1; In = morph(In, w, h, rg, false);   // back to the wall's real outer face
  // the biggest piece
  const lab = new Int32Array(w * h); let best = 0, bestN = 0, id = 0;
  for (let k0 = 0; k0 < w * h; k0++) { if (!In[k0] || lab[k0]) continue; id++; let n = 0; qh = qt = 0; q[qt++] = k0; lab[k0] = id;
    while (qh < qt) { const k = q[qh++], x = k % w; n++; for (const nb of [x > 0 ? k - 1 : -1, x < w - 1 ? k + 1 : -1, k - w, k + w]) if (nb >= 0 && nb < w * h && In[nb] && !lab[nb]) { lab[nb] = id; q[qt++] = nb; } }
    if (n > bestN) { bestN = n; best = id; } }
  if (!best || bestN < w * h * 0.01) return null;
  const out = simplify(traceOut((x, y) => x >= 0 && y >= 0 && x < w && y < h && lab[y * w + x] === best, w, h), R).map(p => [p[0] / S, p[1] / S]);
  // closed rooms inside the roof (walls all round, doors ≤ ~1.1 m): the open floor (not wall, gaps sealed) splits into pieces — the biggest is the terrace, the rest are rooms
  const fl = new Int32Array(w * h), rooms = [], px2 = (mpx / 304.8) ** 2; let fid = 0, bigN = 0; const comps = [];
  for (let k0 = 0; k0 < w * h; k0++) { if (lab[k0] !== best || G[k0] || fl[k0]) continue; fid++; let n = 0, x0 = w, y0 = h, x1 = 0, y1 = 0; qh = qt = 0; q[qt++] = k0; fl[k0] = fid;
    while (qh < qt) { const k = q[qh++], x = k % w, y = (k / w) | 0; n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const nb of [x > 0 ? k - 1 : -1, x < w - 1 ? k + 1 : -1, k - w, k + w]) if (nb >= 0 && nb < w * h && lab[nb] === best && !G[nb] && !fl[nb]) { fl[nb] = fid; q[qt++] = nb; } }
    comps.push({ n, b: [x0, y0, x1 + 1, y1 + 1] }); if (n > bigN) bigN = n; }
  const wt = rg + R(230);   // back out to the walls' outer face
  comps.forEach(c => { const sq = c.n * px2; if (c.n === bigN || sq < 20 || sq > 700 || c.n > bigN * 0.35) return; rooms.push([(c.b[0] - wt) / S, (c.b[1] - wt) / S, (c.b[2] + wt) / S, (c.b[3] + wt) / S]); });
  out.rooms = rooms; return out; }
// the outer edge of a pixel shape (pixel corners), walking with the shape on the right
function traceOut(at, w, h) { let sx = -1, sy = -1;
  for (let k = 0; k < w * h && sx < 0; k++) if (at(k % w, (k / w) | 0)) { sx = k % w; sy = (k / w) | 0; } if (sx < 0) return [];
  const pts = []; let x = sx, y = sy, dx = 1, dy = 0, guard = 0;   // walk along pixel edges keeping the shape on the right
  do { pts.push([x, y]);
    const L = (a, b) => at(x + a, y + b); let nd;
    // directions: right (1,0) needs the cell below-right (x, y) in, the cell above-right (x, y-1) out …
    const ok = (ddx, ddy) => ddx === 1 ? L(0, 0) && !L(0, -1) : ddx === -1 ? L(-1, -1) && !L(-1, 0) : ddy === 1 ? L(-1, 0) && !L(0, 0) : L(0, -1) && !L(-1, -1);
    const cand = [[-dy, dx], [dx, dy], [dy, -dx], [-dx, -dy]];   // right turn first (shape on the right), straight, left, back
    nd = cand.find(c => ok(c[0], c[1])) || [-dx, -dy]; dx = nd[0]; dy = nd[1]; x += dx; y += dy;
  } while ((x !== sx || y !== sy) && ++guard < 4 * w * h);
  return pts; }
// straight-line a traced edge: Douglas–Peucker, near-straight walls made exact, tiny jogs (columns, a pipe) dropped; R(mm) = pixels
function simplify(pts, R) { if (pts.length < 4) return [];
  const rdp = (P, e) => { if (P.length < 3) return P; const a = P[0], b = P[P.length - 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; let mi = 0, md = 0;
    for (let i = 1; i < P.length - 1; i++) { const d = Math.abs((b[0] - a[0]) * (a[1] - P[i][1]) - (a[0] - P[i][0]) * (b[1] - a[1])) / L; if (d > md) { md = d; mi = i; } }
    return md > e ? rdp(P.slice(0, mi + 1), e).slice(0, -1).concat(rdp(P.slice(mi), e)) : [a, b]; };
  let fi = 0, fd = 0; pts.forEach((p, i) => { const d = Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]); if (d > fd) { fd = d; fi = i; } });   // a closed loop: split at the point farthest from the start
  const eps = Math.max(1.2, R(25)); let P = rdp(pts.slice(0, fi + 1), eps).concat(rdp(pts.slice(fi).concat([pts[0]]), eps).slice(1, -1));
  // straight walls: nearly vertical / horizontal edges made exact
  for (let it = 0; it < 2; it++) for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], ax = Math.abs(b[0] - a[0]), ay = Math.abs(b[1] - a[1]);
    if (ax < ay * 0.04 && ax < R(60)) { const m = (a[0] + b[0]) / 2; a[0] = b[0] = m; } else if (ay < ax * 0.04 && ay < R(60)) { const m = (a[1] + b[1]) / 2; a[1] = b[1] = m; } }
  const tidy = () => { P = P.filter((p, i) => { const a = P[(i - 1 + P.length) % P.length], b = P[(i + 1) % P.length]; return Math.abs((a[0] - p[0]) * (b[1] - p[1]) - (a[1] - p[1]) * (b[0] - p[0])) > 0.5 && Math.hypot(a[0] - p[0], a[1] - p[1]) > 0.01; }); };
  const straight = () => { for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], ax = Math.abs(b[0] - a[0]), ay = Math.abs(b[1] - a[1]);
    if (ax < ay * 0.06 && ax < R(180)) { const m = (a[0] + b[0]) / 2; a[0] = b[0] = m; } else if (ay < ax * 0.06 && ay < R(180)) { const m = (a[1] + b[1]) / 2; a[1] = b[1] = m; } } };
  // walls lined up: x of every near-vertical edge (y of near-horizontal) within ~16 cm become one value (length-weighted) — drops columns / pipes / small jogs
  const axE = i => { const a = P[(i + P.length) % P.length], b = P[(i + 1 + P.length) % P.length], d0 = Math.abs(b[0] - a[0]), d1 = Math.abs(b[1] - a[1]); return d0 < d1 * 0.12 || d1 < d0 * 0.12; };   // an arc's pieces (slanted neighbours) are left alone
  const snapAx = ax => { const E = []; P.forEach((a, i) => { const b = P[(i + 1) % P.length], d0 = Math.abs(b[0] - a[0]), d1 = Math.abs(b[1] - a[1]); if ((ax === 0 ? d0 < d1 * 0.12 : d1 < d0 * 0.12) && axE(i - 1) && axE(i + 1)) E.push({ i, v: (a[ax] + b[ax]) / 2, L: Math.hypot(d0, d1) }); });
    E.sort((p, q) => p.v - q.v); const tol = R(170); let g = [];
    const flush = () => { if (!g.length) return; const m = g.reduce((s0, e) => s0 + e.v * e.L, 0) / g.reduce((s0, e) => s0 + e.L, 0); g.forEach(e => { P[e.i][ax] = m; P[(e.i + 1) % P.length][ax] = m; }); g = []; };
    E.forEach(e => { if (g.length && e.v - g[0].v > tol) flush(); g.push(e); }); flush(); };
  snapAx(0); snapAx(1); tidy();
  tidy(); for (let it = 0; it < 30; it++) { const tiny = R(160); let k = P.findIndex((p, i) => { const q = P[(i + 1) % P.length]; return Math.hypot(q[0] - p[0], q[1] - p[1]) < tiny; }); if (k < 0 || P.length < 5) break;
    P.splice((k + 1) % P.length, 1); straight(); straight(); tidy(); }
  return P; }

export async function prep(u8, pj, pageNo) {
  const doc = await pj.getDocument({ data: u8.slice() }).promise, page = Math.min(doc.numPages, pageNo || 1), pg = await doc.getPage(page);
  const v0 = pg.getViewport({ scale: 1 }), k = Math.min(4, 3000 / Math.max(v0.width, v0.height)), vp = pg.getViewport({ scale: k });
  const L = await lines(pg, vp, pj), tc = await pg.getTextContent(), words = [];
  tc.items.forEach(it => { const s = String(it.str || '').trim(); if (!s) return; const m = mul(vp.transform, it.transform), fh = Math.hypot(m[2], m[3]), rot = Math.abs(m[1]) > Math.abs(m[0]);
    const wpx = (it.width || 0) * k, x = m[4], y = m[5]; words.push(rot ? { s, x: x - fh, y: y - wpx, w: fh, h: wpx } : { s, x, y: y - fh, w: wpx, h: fh }); });
  const sc = scaleOf(words, L);
  // the drawing area = round the dimensions that fit the scale (the plan is ringed by them); else the whole sheet
  let box = [0, 0, vp.width, vp.height];
  if (sc && sc.dims.length >= 3) { const xs = sc.dims.flatMap(w => [w.x, w.x + w.w]), ys = sc.dims.flatMap(w => [w.y, w.y + w.h]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), mx = (x1 - x0) * 0.12 + 24, my = (y1 - y0) * 0.12 + 24;
    box = [Math.max(0, x0 - mx), Math.max(0, y0 - my), Math.min(vp.width, x1 + mx), Math.min(vp.height, y1 + my)]; }
  // the picture Claude sees: that area, long side ≤ 1568 px, a light grid every 5 % with numbers every 10 %
  const full = document.createElement('canvas'); full.width = Math.round(vp.width); full.height = Math.round(vp.height); const fx = full.getContext('2d'); fx.fillStyle = '#fff'; fx.fillRect(0, 0, full.width, full.height); await pg.render({ canvasContext: fx, viewport: vp }).promise;
  const bw = box[2] - box[0], bh = box[3] - box[1], f = Math.min(1, 1568 / Math.max(bw, bh)), c = document.createElement('canvas'); c.width = Math.round(bw * f); c.height = Math.round(bh * f);
  const cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height); cx.drawImage(full, box[0], box[1], bw, bh, 0, 0, c.width, c.height);
  cx.lineWidth = 1; cx.font = '600 13px sans-serif'; for (let p = 5; p < 100; p += 5) { const gx = c.width * p / 100, gy = c.height * p / 100; cx.strokeStyle = p % 10 ? 'rgba(0,140,255,.12)' : 'rgba(0,140,255,.3)';
    cx.beginPath(); cx.moveTo(gx, 0); cx.lineTo(gx, c.height); cx.moveTo(0, gy); cx.lineTo(c.width, gy); cx.stroke(); if (!(p % 10)) { cx.fillStyle = 'rgba(0,110,220,.85)'; cx.fillText(String(p), gx + 2, 13); cx.fillText(String(p), 2, gy - 2); } }
  const img = c.toDataURL('image/jpeg', 0.85).split(',')[1], pct = (x, y) => [+((x - box[0]) / bw * 100).toFixed(1), +((y - box[1]) / bh * 100).toFixed(1)];
  const labels = words.filter(w => /[A-Za-z]{3,}/.test(w.s) && w.x >= box[0] && w.x <= box[2] && w.y >= box[1] && w.y <= box[3]).slice(0, 160).map(w => { const p = pct(w.x + w.w / 2, w.y + w.h / 2); return { t: w.s.slice(0, 40), x: p[0], y: p[1] }; });
  let wall = null, rooms = []; try { if (sc) { wall = await wallOutline(pg, vp, pj, sc.mmPx); rooms = (wall && wall.rooms) || []; } } catch (e) { wall = null; }
  return { page, img, labels, box, wall, rooms, mmPx: sc ? sc.mmPx : null, dimsUsed: sc ? sc.n : 0, lines: L, W: vp.width, H: vp.height, bgFrac: null };
}

// Claude's boxes (% of the picture) → feet from the roof's top-left, each edge pulled onto the nearest drawn line
export function toFeet(R, P) {
  if (!R || !R.ok || !R.plot || !Array.isArray(R.plot.box)) return null;
  const bw = P.box[2] - P.box[0], bh = P.box[3] - P.box[1], X = v => P.box[0] + v / 100 * bw, Y = v => P.box[1] + v / 100 * bh;
  // feet per pixel: the drawing's own dimensions; else Claude's read plot size
  let fpx = P.mmPx ? P.mmPx / MM_FT : null; const pb = R.plot.box.map(Number);
  if (!fpx) { const wf = +R.plot.w_ft, pxw = (pb[2] - pb[0]) / 100 * bw; if (!(wf > 0 && pxw > 0)) return null; fpx = wf / pxw; }
  const tol = 2.2 / fpx;   // pull an edge onto a drawn line within ~2 ft
  const snap = (v, kind, a0, a1) => { let best = null; const span = Math.max(1, a1 - a0);
    for (const s of P.lines) { if (s[4] !== kind) continue; const pos = kind === 'v' ? s[0] : s[1], d = Math.abs(pos - v); if (d > tol) continue; const s0 = kind === 'v' ? s[1] : s[0], s1 = kind === 'v' ? s[3] : s[2], ov = Math.min(s1, a1) - Math.max(s0, a0); if (ov < span * 0.3) continue;
      const sc = d - ov / span * tol * 0.3; if (!best || sc < best[0]) best = [sc, pos]; }
    return best ? best[1] : v; };
  const rect = b => { let x0 = X(+b[0]), y0 = Y(+b[1]), x1 = X(+b[2]), y1 = Y(+b[3]); if (x1 < x0) [x0, x1] = [x1, x0]; if (y1 < y0) [y0, y1] = [y1, y0];
    return [snap(x0, 'v', y0, y1), snap(y0, 'h', x0, x1), snap(x1, 'v', y0, y1), snap(y1, 'h', x0, x1)]; };
  // 345: the walls traced from the drawing give the roof's exact edge — its box replaces Claude's plot box
  let WL = Array.isArray(P.wall) && P.wall.length >= 4 ? P.wall : null, wb = WL ? [Math.min(...WL.map(q => q[0])), Math.min(...WL.map(q => q[1])), Math.max(...WL.map(q => q[0])), Math.max(...WL.map(q => q[1]))] : null;
  if (wb) { const cb = [X(pb[0]), Y(pb[1]), X(pb[2]), Y(pb[3])], ar = r => Math.max(0, r[2] - r[0]) * Math.max(0, r[3] - r[1]), ix = ar([Math.max(wb[0], cb[0]), Math.max(wb[1], cb[1]), Math.min(wb[2], cb[2]), Math.min(wb[3], cb[3])]);
    if (ix < 0.5 * ar(cb) || ar(wb) > 0.85 * P.W * P.H) { WL = null; wb = null; } }   // the traced walls must be the roof Claude saw (not the sheet's frame / another drawing)
  const pr = wb && P.mmPx ? wb : rect(pb), ox = pr[0], oy = pr[1], r5 = v => Math.round(v * 2) / 2, ft = v => r5(v * fpx);
  const W = ft(pr[2] - pr[0]), D = ft(pr[3] - pr[1]); if (!(W >= 8 && D >= 8 && W <= 400 && D <= 400)) return null;
  const blocks = (R.blocks || []).filter(b => Array.isArray(b.box) && b.box.length === 4).map(b => { const q = rect(b.box); let x = ft(q[0] - ox), y = ft(q[1] - oy), w = ft(q[2] - q[0]), d = ft(q[3] - q[1]);
      x = Math.max(0, Math.min(W - 1, x)); y = Math.max(0, Math.min(D - 1, y)); w = Math.max(1, Math.min(W - x, w)); d = Math.max(1, Math.min(D - y, d));
      return { type: b.type, x, y, w, d, door: b.door || null, h: +b.h_ft || null }; }).filter(b => b.w >= 1 && b.d >= 1);
  if (WL && P.mmPx) (P.rooms || []).forEach(rb => { let x = ft(rb[0] - ox), y = ft(rb[1] - oy), w = ft(rb[2] - rb[0]), d = ft(rb[3] - rb[1]);   // 345: rooms found in the drawing's walls that Claude didn't name
    const ov = b => Math.max(0, Math.min(x + w, b.x + b.w) - Math.max(x, b.x)) * Math.max(0, Math.min(y + d, b.y + b.d) - Math.max(y, b.y)); if (blocks.some(b => ov(b) > 0.3 * Math.min(w * d, b.w * b.d))) return;
    x = Math.max(0, x); y = Math.max(0, y); w = Math.min(W - x, w); d = Math.min(D - y, d); if (w >= 3 && d >= 3) blocks.push({ type: 'room', x, y, w, d, door: null, h: null, found: true }); });
  // 347 (owner): floor levels — areas marked LVL+350MM / LVL-420MM. Claude gives the area, the drawing's own LVL text gives / checks the number;
  // a level that is a walled block (a sunken room / area) goes on that block, the rest are raised / sunken floors; the main floor = 0
  const LT = (P.labels || []).map(l => { const m = /LVL\s*([+\-−]?)\s*(\d{1,4}(?:\.\d+)?)\s*(MM|M)?/i.exec(l.t || ''); if (!m) return null; let v = +m[2]; if (/^M$/i.test(m[3] || '') || v < 5 && /\./.test(m[2])) v *= 1000; return { mm: (m[1] === '-' || m[1] === '−' ? -1 : 1) * v, x: ft(X(+l.x) - ox), y: ft(Y(+l.y) - oy) }; }).filter(Boolean);
  let levels = (Array.isArray(R.levels) ? R.levels : []).filter(v => Array.isArray(v.box) && v.box.length === 4 && isFinite(+v.mm)).map(v => { const q = rect(v.box); let x = Math.max(0, ft(q[0] - ox)), y = Math.max(0, ft(q[1] - oy)), w = Math.min(W - x, ft(q[2] - q[0])), d = Math.min(D - y, ft(q[3] - q[1]));
    const lb = LT.find(l => l.x >= x && l.x <= x + w && l.y >= y && l.y <= y + d); return { x, y, w, d, mm: lb ? lb.mm : Math.round(+v.mm) }; }).filter(v => v.w >= 2 && v.d >= 2);
  const big = levels.find(v => v.w * v.d > 0.55 * W * D); if (big) { const b0 = big.mm; levels = levels.filter(v => v !== big).map(v => Object.assign(v, { mm: v.mm - b0 })); LT.forEach(l => { l.mm -= b0; }); }
  blocks.forEach(b => { if (!/room|toilet|penthouse/.test(b.type)) return; const lb = LT.find(l => l.x >= b.x && l.x <= b.x + b.w && l.y >= b.y && l.y <= b.y + b.d); if (lb && lb.mm) b.lvl_mm = lb.mm; });
  for (let i = blocks.length - 1; i >= 0; i--) { const b = blocks[i]; if (b.type === 'room' && b.lvl_mm) { blocks.splice(i, 1); if (!levels.some(v => Math.abs(v.x - b.x) < 2 && Math.abs(v.y - b.y) < 2)) levels.push({ x: b.x, y: b.y, w: b.w, d: b.d, mm: b.lvl_mm }); } }   /* a walled area marked LVL is a lower / higher part of the open roof, not a room with a roof on it */
  levels = levels.filter(v => { const k = blocks.find(b => Math.max(0, Math.min(v.x + v.w, b.x + b.w) - Math.max(v.x, b.x)) * Math.max(0, Math.min(v.y + v.d, b.y + b.d) - Math.max(v.y, b.y)) > 0.5 * Math.min(v.w * v.d, b.w * b.d)); if (k) { if (v.mm && k.lvl_mm == null) k.lvl_mm = v.mm; return false; } return Math.abs(v.mm) >= 20; }).slice(0, 8);
  let outline = null;
  if (WL && P.mmPx) { const i12 = v => Math.round(v * fpx * 12) / 12; outline = WL.map(q => [i12(q[0] - ox), i12(q[1] - oy)]);
    // a stairs room / room / lift on the roof's edge (open on the outside in the drawing) stays part of the roof
    const BK = blocks.filter(b => /mumty|room|lift|penthouse|stair/.test(b.type || '')); if (BK.length) { const G = 4, w = Math.ceil(W * G) + 2, h = Math.ceil(D * G) + 2, cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
      g.fillStyle = '#000'; g.beginPath(); outline.forEach((q, i) => i ? g.lineTo(q[0] * G, q[1] * G) : g.moveTo(q[0] * G, q[1] * G)); g.closePath(); g.fill(); BK.forEach(b => g.fillRect(b.x * G, b.y * G, b.w * G, b.d * G));
      const d = g.getImageData(0, 0, w, h).data, at = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 128, Rg = mm => mm / MM_FT * G, U = simplify(traceOut(at, w, h), Rg);
      if (U.length >= 4) outline = U.map(q => [Math.round(q[0] / G * 12) / 12, Math.round(q[1] / G * 12) / 12]); } }
  else if (Array.isArray(R.outline) && R.outline.length >= 4) { outline = R.outline.map(p => [ft(snap(X(+p[0]), 'v', Y(+p[1]) - tol, Y(+p[1]) + tol) - ox), ft(snap(Y(+p[1]), 'h', X(+p[0]) - tol, X(+p[0]) + tol) - oy)]).map(p => [Math.max(0, Math.min(W, p[0])), Math.max(0, Math.min(D, p[1]))]); }
  return { ok: true, page: P.page, plot: { w_ft: W, d_ft: D, box: [pr[0] / P.W, pr[1] / P.H, pr[2] / P.W, pr[3] / P.H].map(v => +v.toFixed(4)), road: R.plot.road || 'bottom', road2: R.plot.road2 || null, north: R.plot.north || null, parapet_ft: +R.plot.parapet_ft || null },
    outline, traced: !!(WL && P.mmPx), cuts: [], blocks, levels, tanks: !!R.tanks_on_stairs, proposed: R.proposed || [], scale: P.mmPx ? 'dimensions' : 'read' };
}
