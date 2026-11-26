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
  return { page, img, labels, box, mmPx: sc ? sc.mmPx : null, dimsUsed: sc ? sc.n : 0, lines: L, W: vp.width, H: vp.height, bgFrac: null };
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
  const pr = rect(pb), ox = pr[0], oy = pr[1], r5 = v => Math.round(v * 2) / 2, ft = v => r5(v * fpx);
  const W = ft(pr[2] - pr[0]), D = ft(pr[3] - pr[1]); if (!(W >= 8 && D >= 8 && W <= 400 && D <= 400)) return null;
  const blocks = (R.blocks || []).filter(b => Array.isArray(b.box) && b.box.length === 4).map(b => { const q = rect(b.box); let x = ft(q[0] - ox), y = ft(q[1] - oy), w = ft(q[2] - q[0]), d = ft(q[3] - q[1]);
      x = Math.max(0, Math.min(W - 1, x)); y = Math.max(0, Math.min(D - 1, y)); w = Math.max(1, Math.min(W - x, w)); d = Math.max(1, Math.min(D - y, d));
      return { type: b.type, x, y, w, d, door: b.door || null, h: +b.h_ft || null }; }).filter(b => b.w >= 1 && b.d >= 1);
  let outline = null; if (Array.isArray(R.outline) && R.outline.length >= 4) { outline = R.outline.map(p => [ft(snap(X(+p[0]), 'v', Y(+p[1]) - tol, Y(+p[1]) + tol) - ox), ft(snap(Y(+p[1]), 'h', X(+p[0]) - tol, X(+p[0]) + tol) - oy)]).map(p => [Math.max(0, Math.min(W, p[0])), Math.max(0, Math.min(D, p[1]))]); }
  return { ok: true, page: P.page, plot: { w_ft: W, d_ft: D, box: [pr[0] / P.W, pr[1] / P.H, pr[2] / P.W, pr[3] / P.H].map(v => +v.toFixed(4)), road: R.plot.road || 'bottom', road2: R.plot.road2 || null, north: R.plot.north || null, parapet_ft: +R.plot.parapet_ft || null },
    outline, cuts: [], blocks, tanks: !!R.tanks_on_stairs, proposed: R.proposed || [], scale: P.mmPx ? 'dimensions' : 'read' };
}
