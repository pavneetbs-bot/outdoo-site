// 277 (owner): the plan's proposal — an estimate worked out from the planner's own layout (sizes × a Premium / Luxury rate card,
// company_settings.prop_rates, editable in admin → Settings → Proposal rates; these are the defaults), one figure per tier (+ GST as
// applicable), furniture and plants as add-ons, a 3D bird's-eye with numbered labels, Summary + Detailed tabs and a PDF.
// Brand: the Premium total at or above lw_min → a LifeWall proposal (full scope); below → an outrr proposal without civil, tiles,
// electrical, plumbing, paint, waterproofing, dismantling or stone work.
// g: s structures · f floor · li lighting · c civil & services · fu furniture (add-on) · pl plants (add-on); u: sqft / rft / nos / area (per sq ft of terrace)
// lw: LifeWall scope only (left out of an outrr proposal). p / l = Premium / Luxury rate; ps / ls = what each tier is.
export const RATES = { v: 1, design_pct: 5, lw_min: 1000000, valid_days: 7, early_hours: 48, early_pct: 5, early_max: 25000, items: {
  cabin: { n: 'Cabin', g: 's', u: 'sqft', p: 2800, l: 4200, ps: 'Hybrid cabin — MS frame, PUF panels, glass front, standard fit-out', ls: 'All-glass cabin — toughened glass, premium fit-out, false ceiling, AC point' },
  pergola: { n: 'Pergola', g: 's', u: 'sqft', p: 1400, l: 2800, ps: 'MS frame, powder coated, slatted / polycarbonate roof', ls: 'Aluminium frame, motorised louvres or glass roof, profile lights' },
  deck: { n: 'WPC deck', g: 's', u: 'sqft', p: 450, l: 700, ps: 'WPC boards on a fabricated frame (5″)', ls: 'Capped WPC boards, hidden clips, aluminium frame' },
  bar: { n: 'Bar counter', g: 's', u: 'rft', p: 18000, l: 32000, ps: 'MS frame, granite top, laminate front', ls: 'Stone / fluted front, quartz top, cove light, sink point' },
  counter: { n: 'Food counter', g: 's', u: 'rft', p: 15000, l: 26000, ps: 'MS frame, granite top', ls: 'Stone cladding, quartz top, storage' },
  fbench: { n: 'Fixed seating', g: 's', u: 'rft', p: 9000, l: 16000, ps: 'MS / masonry base, outdoor cushions', ls: 'Stone / WPC clad base, quick-dry premium cushions, cove light' },
  water: { n: 'Water feature', g: 's', u: 'rft', p: 15000, l: 30000, ps: 'Cascade / sheet wall, tiled basin, pump', ls: 'Stone / metal face, rain curtain or geyser jets, lights, auto top-up' },
  feature: { n: 'Feature wall', g: 's', u: 'sqft', p: 650, l: 1400, ps: 'Cladding / slats on a frame', ls: 'Natural stone / fluted panels, backlighting' },
  graffiti: { n: 'Graffiti wall', g: 's', u: 'sqft', p: 250, l: 450, ps: 'Hand-painted mural', ls: 'Artist mural, weather coat' },
  vgarden: { n: 'Vertical garden', g: 's', u: 'sqft', p: 900, l: 1500, ps: 'Modular pots, drip line', ls: 'Felt / module system, auto drip + timer, plants' },
  jacuzzi: { n: 'Jacuzzi', g: 's', u: 'nos', p: 350000, l: 700000, ps: 'Outdoor spa, 4–5 seater, WPC skirt', ls: 'Branded spa, 6 seater, lights, heater, cover' },
  privacy: { n: 'Privacy screens', g: 's', u: 'sqft', p: 1100, l: 2200, ps: 'MS / WPC slat screens on posts', ls: 'CNC jaali / aluminium louvres, one-way lights' },
  shaftcover: { n: 'Shaft cover', g: 's', u: 'sqft', p: 900, l: 1800, ps: 'MS frame, polycarbonate', ls: 'Walk-on toughened glass / grating' },
  pipecover: { n: 'Pipe cover', g: 's', u: 'nos', p: 25000, l: 45000, ps: 'Cement board / MS jali, opening door', ls: 'Aluminium louvres / WPC slats' },
  mstair: { n: 'Stairs to the stairs-room roof', g: 's', u: 'nos', p: 60000, l: 120000, ps: 'MS staircase / ladder', ls: 'MS spiral / designer staircase' },
  rack: { n: 'Bottle rack', g: 's', u: 'nos', p: 35000, l: 70000, ps: 'MS rack', ls: 'Designer rack with lights' },
  accover: { n: 'AC unit cover', g: 's', u: 'nos', p: 18000, l: 35000, ps: 'MS + louvres', ls: 'Aluminium / WPC louvres' },
  turf: { n: 'Artificial grass', g: 'f', u: 'sqft', p: 90, l: 150, ps: '25–30 mm grass', ls: '40 mm dense grass, drainage mat' },
  floor_base: { n: 'Main floor', g: 'f', u: 'sqft', p: 180, l: 320, lw: 1, ps: 'Porcelain / paver tiles, laid', ls: 'Natural stone / premium porcelain, laid' },
  floor_feat: { n: 'Feature floor (paths, rugs, borders)', g: 'f', u: 'sqft', p: 280, l: 550, lw: 1, ps: 'Patterned / encaustic tiles', ls: 'Handmade encaustic, zellige, travertine' },
  gravel: { n: 'Pebble / gravel bed', g: 'f', u: 'sqft', p: 60, l: 110, lw: 1, ps: 'Pebbles on a membrane', ls: 'Polished river pebbles, edging' },
  stone: { n: 'Stepping stones', g: 'f', u: 'nos', p: 1800, l: 3000, lw: 1, ps: 'Sandstone / slate', ls: 'Natural stone, cut and set' },
  bed: { n: 'Built planter beds', g: 'f', u: 'rft', p: 2500, l: 4500, lw: 1, ps: 'Masonry, waterproofed, soil + plants', ls: 'Stone / tile clad, drip irrigation' },
  light_soft: { n: 'Lighting (soft & warm)', g: 'li', u: 'area', p: 90, l: 160, lw: 1, ps: 'Profile + spike + cove lights, wiring', ls: 'Branded fittings, warm dim-to-warm, smart switch' },
  light_full: { n: 'Lighting (all lit up)', g: 'li', u: 'area', p: 160, l: 280, lw: 1, ps: 'Profile, spike, cove, wall + screen lights, wiring', ls: 'Branded fittings, scenes on an app, dimmers' },
  waterproof: { n: 'Waterproofing', g: 'c', u: 'area', p: 65, l: 110, lw: 1, ps: 'Cementitious, 2 coats', ls: 'PU / membrane system, warranty' },
  elec: { n: 'Electrical & plumbing points', g: 'c', u: 'area', p: 40, l: 70, lw: 1, ps: 'Points for lights, water, power', ls: 'Concealed, DB, outdoor sockets' },
  paint: { n: 'Painting (parapet & walls)', g: 'c', u: 'sqft', p: 45, l: 80, lw: 1, ps: 'Exterior emulsion', ls: 'Textured / premium exterior' },
  coping: { n: 'Parapet coping', g: 'c', u: 'rft', p: 450, l: 900, lw: 1, ps: 'Granite / kota', ls: 'Marble / sandstone, nosing' },
  dismantle: { n: 'Dismantling & debris', g: 'c', u: 'area', p: 30, l: 30, lw: 1, ps: 'Old floor out, debris removed', ls: 'Same' },
  seep_grout: { n: 'Seepage: grouting the floor joints', g: 'c', u: 'area', p: 25, l: 40, lw: 1, ps: 'Open joints cleaned, epoxy / polymer grout', ls: 'Epoxy grout, joint sealant' },
  seep_redo: { n: 'Seepage: floor out, waterproofing, floor relaid', g: 'c', u: 'area', p: 180, l: 280, lw: 1, ps: 'Old floor removed, cementitious waterproofing, screed', ls: 'PU / membrane system, screed, warranty' },
  seep_slab: { n: 'Seepage: dug to the slab, waterproofed from there', g: 'c', u: 'area', p: 260, l: 380, lw: 1, ps: 'Down to the slab, treatment, new screed', ls: 'Membrane on the slab, protection screed, warranty' },
  heat: { n: 'Heatproofing', g: 'c', u: 'area', p: 55, l: 90, lw: 1, ps: 'Heat-reflective coating / tiles', ls: 'Insulation boards under the floor' },
  refurb: { n: 'Floor refurbishing', g: 'c', u: 'area', p: 35, l: 60, lw: 1, ps: 'Repair, polish', ls: 'Repair, polish, sealant' },
  works: { n: 'Site works', g: 'c', u: 'nos', p: 25000, l: 40000, lw: 1, ps: 'As listed', ls: 'As listed' },
  sofa: { n: 'Sofa set', g: 'fu', u: 'nos', p: 120000, l: 250000, ps: 'Rope / MS frame, outdoor fabric', ls: 'Aluminium / teak, quick-dry premium fabric' },
  dining: { n: 'Dining set', g: 'fu', u: 'nos', p: 90000, l: 180000, ps: '6 seater, MS / rope', ls: '6 seater, teak / aluminium' },
  chair: { n: 'Chairs', g: 'fu', u: 'nos', p: 12000, l: 25000, ps: 'Outdoor chair', ls: 'Designer outdoor chair' },
  table: { n: 'Tables', g: 'fu', u: 'nos', p: 15000, l: 35000, ps: 'Side / coffee table', ls: 'Stone / teak table' },
  stool: { n: 'Bar chairs', g: 'fu', u: 'nos', p: 8000, l: 18000, ps: 'MS bar chair', ls: 'Designer bar chair' },
  swing: { n: 'Swing', g: 'fu', u: 'nos', p: 45000, l: 95000, ps: 'Swing / egg chair on a stand', ls: 'Designer cocoon / swing bed' },
  umbrella: { n: 'Umbrella', g: 'fu', u: 'nos', p: 35000, l: 90000, ps: 'Centre-pole umbrella', ls: 'Cantilever umbrella, LED' },
  firepit: { n: 'Fire pit', g: 'fu', u: 'nos', p: 40000, l: 95000, ps: 'Wood / bio-ethanol fire pit', ls: 'Gas fire pit / table' },
  sculpture: { n: 'Sculpture', g: 'fu', u: 'nos', p: 40000, l: 120000, ps: 'FRP / metal sculpture', ls: 'Stone / bronze-finish sculpture' },
  bench: { n: 'Bench', g: 'fu', u: 'rft', p: 8000, l: 16000, ps: 'Outdoor bench', ls: 'Teak / stone bench' },
  rug: { n: 'Outdoor rugs', g: 'fu', u: 'nos', p: 15000, l: 35000, ps: 'Outdoor rug', ls: 'Handwoven outdoor rug' },
  decor: { n: 'Lanterns, poufs & decor', g: 'fu', u: 'nos', p: 15000, l: 35000, ps: 'Lanterns, string lights, cushions', ls: 'Designer lanterns, poufs, throws' },
  plant: { n: 'Plants', g: 'pl', u: 'nos', p: 2500, l: 5000, ps: '3–5 ft plants, pot + soil', ls: '5–8 ft specimen plants, designer pots' },
  planter_frp: { n: 'FRP planter troughs', g: 'pl', u: 'nos', p: 12000, l: 22000, ps: 'FRP trough with plants', ls: 'Premium FRP / corten trough with plants' },
  planter: { n: 'Planters', g: 'pl', u: 'nos', p: 4000, l: 9000, ps: 'Planter with plant', ls: 'Designer planter with plant' } } };

const G = [['s', 'Structures & features'], ['f', 'Flooring & landscape'], ['li', 'Lighting'], ['c', 'Civil & services'], ['fu', 'Furniture & decor'], ['pl', 'Plants & planters']];
const OUT_SCOPE = 'civil work, tiles, electrical, plumbing, painting, waterproofing, dismantling and stone work';
const r0 = v => Math.round(v), inr = n => '₹' + Math.round(n).toLocaleString('en-IN'), e = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fi = v => { const t = Math.round(v * 12), f = Math.floor(t / 12), i = t % 12; return i ? `${f}′ ${i}″` : `${f}′`; };
const foot = it => { const r = (+it.rot || 0) % 180; return r ? [+it.d, +it.w] : [+it.w, +it.d]; };
const shoe = p => Math.abs(p.reduce((a, q, i) => { const n = p[(i + 1) % p.length]; return a + q[0] * n[1] - n[0] * q[1]; }, 0) / 2);
export function mergeRates(db) { const R = JSON.parse(JSON.stringify(RATES)); if (db && typeof db === 'object') { Object.keys(db).forEach(k => { if (k !== 'items') R[k] = db[k]; }); Object.entries(db.items || {}).forEach(([k, v]) => { R.items[k] = Object.assign({}, R.items[k] || {}, v); }); } return R; }

// the things on the plan, numbered (what the 3D labels and the list show)
export function things(plan) { const out = []; let n = 0;
  (plan.items || []).forEach((it, idx) => { if (!it || it.old) return; const k = key(it); if (!k) return; const rt = RATES.items[k] || {}; const q = qty(it, k);
    const [w, d] = foot(it), big = ['s', 'fu'].includes(rt.g) && !['chair', 'stool', 'table', 'decor'].includes(k);
    out.push({ idx, k, it, q, n: big ? ++n : 0, label: it.label && !/^(Existing|undefined)/.test(it.label) ? it.label.replace(/ —.*$/, '') : rt.n, size: rt.u === 'nos' ? '' : w && d ? `${fi(w)} × ${fi(d)}` : '' }); });
  return out; }
function key(it) { const c = it.cat;
  if (c === 'privacy') return it.pipe ? 'pipecover' : 'privacy';
  if (c === 'planter') return it.frp ? 'planter_frp' : 'planter';
  if (c === 'lights') return null; if (c === 'turf') return 'turf'; if (c === 'pathway') return null;
  if (c === 'works') return 'works';
  return RATES.items[c] ? c : null; }
function qty(it, k) { const [w, d] = foot(it), L = Math.max(w, d), h = +it.h || 0;
  switch (k) {
    case 'cabin': case 'pergola': case 'deck': case 'shaftcover': case 'turf': return w * d;
    case 'bar': return it.shape === 'L' ? w + d : it.shape === 'curve' ? L * 1.3 : L;
    case 'fbench': return it.shape === 'curve' ? L * 1.57 : L;
    case 'counter': case 'water': case 'bench': return L;
    case 'feature': case 'graffiti': case 'vgarden': return L * (h || 8);
    case 'privacy': return (it.zone ? Math.abs(it.zone[1] - it.zone[0]) : L) * (h || (it.mode === 'tank' ? 6 : 3));
    case 'sofa': return Math.min(1.8, Math.max(0.6, (w * d) / 60));
    case 'dining': return Math.min(1.8, Math.max(0.6, L / 8));
    default: return 1; } }

// the estimate for one tier
export function calc(plan, R, tier, brandLW) { const t = plan.site || {}, f = t.floor || {}, T = tier === 'l' ? 'l' : 'p', lines = [];
  const add = (k, q, note, num) => { const rt = R.items[k]; if (!rt || !(q > 0)) return; if (rt.lw && !brandLW) return; const rate = +rt[T] || 0; const ex = lines.find(x => x.k === k && !num && !x.num); if (ex) { ex.q += q; ex.amt += q * rate; return; } lines.push({ k, g: rt.g, n: rt.n, u: rt.u, q, rate, amt: q * rate, spec: rt[T + 's'], note, num }); };
  // terrace area (the outline less the roof's blocks)
  const pw = +t.pw || 0, pd = +t.pd || 0, out = Array.isArray(t.outline) && t.outline.length > 2 ? t.outline : [[0, 0], [pw, 0], [pw, pd], [0, pd]];
  const blocks = (t.blocks || []).filter(b => !(t.gone || []).includes(b.id)), A = Math.max(0, shoe(out) - blocks.reduce((a, b) => a + b.w * b.d, 0));
  const per = out.reduce((a, q, i) => { const n = out[(i + 1) % out.length]; return a + Math.hypot(n[0] - q[0], n[1] - q[1]); }, 0);
  things(plan).forEach(x => add(x.k, x.q, x.size, x.n));
  // floor from the floor layout
  let feat = 0, deck = 0, turf = 0, grav = 0, stones = 0, bed = 0, rugs = 0;
  (f.zones || []).forEach(z => { if (z.eonly || z.s === '#edge') return; const a = z.k === 'prug' ? z.w * z.d : z.k === 'circ' ? Math.PI * z.r * z.r : z.k === 'poly' ? shoe(z.pts) : z.k === 'inlay' ? Math.PI * (z.w / 2) * (z.w / 2) : 0;
    if (z.k === 'stone') stones++; else if (z.k === 'bed') bed += Math.max(z.w, z.d); else if (z.k === 'rug') rugs++; else if (z.k === 'poly' && z.s === 'turf') turf += a; else if (z.k === 'poly' && z.s === 'peb') grav += a; else if (z.wpc) deck += a; else if (z.k !== 'inlay') feat += a; });
  if (f.border && f.border.w) feat += per * f.border.w;
  const base = Math.max(0, A - feat - deck - turf - grav - (things(plan).filter(x => x.k === 'deck').reduce((a, x) => a + x.q, 0)));
  if (f.lay) { add('floor_base', base); add('floor_feat', feat); }
  add('deck', deck); add('turf', turf); add('gravel', grav); add('stone', stones); add('bed', bed);
  if (rugs) add('rug', rugs); if (f.theme && f.theme !== 'minimal') add('decor', 1);
  // lighting, civil & services
  if (t.light === 'soft') add('light_soft', A); else if (t.light === 'full') add('light_full', A);
  const su0 = plan.su || {}, sp = su0.seep || {}, sA = sp.has ? A * ({ little: 0.15, some: 0.4, whole: 1 }[sp.amt || 'some'] || 0.4) : 0;   // 278 (owner): seepage + heatproofing
  if (sA) add('seep_' + (['grout', 'redo', 'slab'].includes(sp.fix) ? sp.fix : 'redo'), sA);
  if (su0.heat === 'want') add('heat', A);
  add('waterproof', sp.has && sp.fix !== 'grout' ? Math.max(0, A - sA) : A); add('elec', A);
  const wallA = per * (+t.par || 3) + blocks.filter(b => b.type !== 'shaft').reduce((a, b) => a + 2 * (b.w + b.d) * (+b.h || 9), 0); add('paint', wallA);
  if (t.coping && t.coping.state && t.coping.state !== 'old') add('coping', per);
  const fa = (plan.su || {}).flAct; if (fa === 'change' || ((plan.su || {}).rm || {}).floor0) add('dismantle', A); else if (fa === 'refurb') add('refurb', A);
  const sum = g => lines.filter(x => x.g === g).reduce((a, x) => a + x.amt, 0), main = ['s', 'f', 'li', 'c'].reduce((a, g) => a + sum(g), 0), design = main * (+R.design_pct || 0) / 100;
  return { lines, sums: Object.fromEntries(G.map(([g]) => [g, sum(g)])), main, design, total: main + design, A, per }; }

export function estimate(plan, R) { const p0 = calc(plan, R, 'p', true), lw = p0.total >= (+R.lw_min || 1000000); return { lw, p: lw ? p0 : calc(plan, R, 'p', false), l: calc(plan, R, 'l', lw) }; }

// the 3D labels: number · name · size, above each priced piece
export function tags(plan) { return things(plan).filter(x => x.n).map(x => { const [w, d] = foot(x.it); return { x: +x.it.x + w / 2, z: +x.it.z + d / 2, y: x.k === 'pergola' || x.k === 'cabin' ? 11 : Math.max(+x.it.h || 3, 3) + 1.6, text: `${x.n} · ${x.label}${x.size ? ' · ' + x.size : ''}` }; }); }

// the page: Summary + Detailed (opt.tab), or both for the PDF (opt.print)
export function page(plan, R, E, opt) { opt = opt || {}; const brand = E.lw ? 'LifeWall' : 'outrr', add = opt.add || {}, TH = plan.themeName || '', LY = plan.layoutName || '', who = plan.who || '';
  const today = new Date(), till = new Date(today.getTime() + (+R.valid_days || 7) * 864e5), dt = d => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const tot = T => E[T].total + (add.fu ? E[T].sums.fu : 0) + (add.pl ? E[T].sums.pl : 0), list = things(plan).filter(x => x.n);
  const head = `<div class="pp-h"><div class="pp-logo ${E.lw ? 'lw' : 'or'}">${E.lw ? 'LifeWall<small>Design &amp; build · 300+ outdoor projects</small>' : 'outrr<small>Every outdoor possibility</small>'}</div><div class="pp-meta"><b>Proposal${who ? ' for ' + e(who) : ''}</b><span>${e(plan.name || 'Terrace plan')} · ${dt(today)}</span><span>${e(TH)} theme · ${e(LY)} floor layout</span><span>Valid till ${dt(till)}</span></div></div>`;
  const tierBox = (T, nm, sub) => `<div class="pp-tier ${T}"><small>${nm}</small><b>${inr(tot(T))}</b><span>+ GST as applicable</span><em>${sub}</em></div>`;
  const offer = `<div class="pp-offer">Book within ${+R.early_hours || 48} hours: extra ${+R.early_pct || 5}% off, up to ${inr(+R.early_max || 25000)}.</div>`;
  const brk = `<table class="pp-t"><thead><tr><th></th><th>Premium</th><th>Luxury</th></tr></thead><tbody>${G.filter(([g]) => g !== 'fu' && g !== 'pl').map(([g, nm]) => E.p.sums[g] || E.l.sums[g] ? `<tr><td>${nm}</td><td>${inr(E.p.sums[g])}</td><td>${inr(E.l.sums[g])}</td></tr>` : '').join('')}<tr><td>Design &amp; drawings (${+R.design_pct || 0}%)</td><td>${inr(E.p.design)}</td><td>${inr(E.l.design)}</td></tr>${['fu', 'pl'].map(g => `<tr class="pp-add${add[g] ? ' on' : ''}"><td><label><input type="checkbox" data-pp="add:${g}"${add[g] ? ' checked' : ''}${opt.print ? ' disabled' : ''}> ${g === 'fu' ? 'Furniture &amp; decor' : 'Plants &amp; planters'} <i>add-on</i></label></td><td>${inr(E.p.sums[g])}</td><td>${inr(E.l.sums[g])}</td></tr>`).join('')}<tr class="pp-tot"><td>Total</td><td>${inr(tot('p'))}</td><td>${inr(tot('l'))}</td></tr></tbody></table>`;
  const scope = E.lw ? `<p>Full design &amp; build by LifeWall: structures, flooring, lighting, civil work, waterproofing, electrical and plumbing points, painting, delivery and installation.</p>` : `<p>Made, delivered and installed by outrr. <b>Not included:</b> ${OUT_SCOPE}. Projects of ${inr(+R.lw_min || 1000000)} and more are done end-to-end by LifeWall.</p>`;
  const notes = `<ul class="pp-n"><li>Prices include delivery and installation. GST extra as applicable.</li><li>This is an estimate from your plan. Final price after the site visit and exact measurements — it changes if the sizes or your requirements change.</li><li>Furniture, decor and plants are optional add-ons.</li><li>Valid for ${+R.valid_days || 7} days.</li></ul>`;
  const terms = `<ol class="pp-pay"><li><b>10%</b> to book (adjusted in the final price)</li><li><b>40%</b> after the site visit, measurements and drawings are approved</li><li><b>40%</b> before material goes to site</li><li><b>10%</b> on handover</li></ol>`;
  const summary = `<section class="pp-sec" data-t="sum"><div class="pp-tiers">${tierBox('p', 'Premium', 'Great materials, smart finishes')}${tierBox('l', 'Luxury', 'Top-end materials, finishes and fittings')}</div>${offer}
    ${opt.img ? `<img class="pp-img" src="${opt.img}" alt="Your terrace, bird's-eye view">` : '<div id="ppv" class="pp-v"></div>'}
    ${opt.before ? `<h3>Before → after</h3><div class="pp-ba"><figure>${opt.before}<figcaption>Your roof today</figcaption></figure>${opt.base ? `<figure>${opt.base}<figcaption>After the take-down — the base</figcaption></figure>` : ''}${opt.after ? `<figure>${opt.after}<figcaption>Your new design</figcaption></figure>` : ''}</div>` : ''}
    <h3>What's in your design</h3><ol class="pp-list">${list.map(x => `<li><b>${e(x.label)}</b>${x.size ? ` <span>${x.size}</span>` : ''}</li>`).join('')}</ol>
    <h3>Estimate</h3>${brk}<h3>Scope</h3>${scope}<h3>Payment</h3>${terms}<h3>Notes</h3>${notes}</section>`;
  const row = (x, y) => `<tr><td>${x.num ? x.num + '. ' : ''}${e(x.n)}${x.note ? `<small>${e(x.note)}</small>` : ''}</td><td class="pp-q">${x.u === 'nos' ? (['sofa', 'dining', 'decor'].includes(x.k) || !Number.isInteger(x.q) ? '1 set' : x.q + ' nos') : r0(x.q).toLocaleString('en-IN') + ' ' + (x.u === 'area' ? 'sq ft' : x.u === 'rft' ? 'running ft' : 'sq ft')}</td><td><small>${e(x.spec || '')}</small>${inr(x.amt)}</td><td><small>${e((y || {}).spec || '')}</small>${y ? inr(y.amt) : '—'}</td></tr>`;
  const grp = g => { const P = E.p.lines.filter(x => x.g === g), L = E.l.lines.filter(x => x.g === g); if (!P.length && !L.length) return ''; const keys = [...new Set(P.concat(L).map(x => x.k + ':' + (x.num || 0)))];
    return `<h3>${G.find(z => z[0] === g)[1]}${g === 'fu' || g === 'pl' ? ' <i>(add-on)</i>' : ''}</h3><table class="pp-t pp-d"><thead><tr><th>Item</th><th>Qty</th><th>Premium</th><th>Luxury</th></tr></thead><tbody>${keys.map(k => { const [kk, nn] = k.split(':'), a = P.find(x => x.k === kk && (x.num || 0) == nn), b = L.find(x => x.k === kk && (x.num || 0) == nn); return a ? row(a, b) : b ? row(Object.assign({}, b, { amt: 0, spec: '' }), b) : ''; }).join('')}</tbody></table>`; };
  const fl = plan.floorDesc || [];
  const detailed = `<section class="pp-sec" data-t="det"><div class="pp-tiers">${tierBox('p', 'Premium', '')}${tierBox('l', 'Luxury', '')}</div>
    ${fl.length ? `<h3>Floor schedule</h3><table class="pp-t"><tbody>${fl.map(([a, b]) => `<tr><td>${e(a)}</td><td>${e(b)}</td></tr>`).join('')}</tbody></table>` : ''}
    ${G.map(([g]) => grp(g)).join('')}<h3>Design &amp; drawings</h3><p>${+R.design_pct || 0}% of the work: ${inr(E.p.design)} (Premium) / ${inr(E.l.design)} (Luxury) — 2D plan, 3D views, working drawings, site supervision.</p>
    <h3>Scope</h3>${scope}<h3>Payment</h3>${terms}<h3>Notes</h3>${notes}</section>`;
  if (opt.print) return `${head}${summary}<div class="pp-br"></div>${detailed}`;
  return `${head}<div class="pp-tabs"><button type="button" data-pp="tab:sum" class="${opt.tab !== 'det' ? 'on' : ''}">Summary</button><button type="button" data-pp="tab:det" class="${opt.tab === 'det' ? 'on' : ''}">Detailed with specs</button><button type="button" data-pp="pdf" class="pp-pdf">Download PDF</button></div>${opt.tab === 'det' ? detailed : summary}`; }

export const CSS = `.pp-ba{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:6px 0 14px}.pp-ba figure{margin:0;border:1px solid #EAE3D8;border-radius:10px;padding:6px;background:#FBF8F3}.pp-ba svg{width:100%;height:auto;max-height:240px;display:block}.pp-ba figcaption{font-size:11.5px;color:#6B645B;text-align:center;margin-top:4px}.pp{font-family:Inter,system-ui,sans-serif;color:#2E2E2E;width:210mm;max-width:100%;box-sizing:border-box;min-height:297mm;margin:18px auto 24px;background:#fff;padding:18mm 17mm 20mm;border:1px solid #E6DDCF;box-shadow:0 6px 28px rgba(60,45,30,.12);border-radius:3px;font-size:13.5px;line-height:1.5}@media(max-width:820px){.pp{width:auto;min-height:0;padding:22px 16px;margin:10px 0}}.pp h3{font-size:15px;letter-spacing:.02em;margin:22px 0 8px;padding-bottom:5px;border-bottom:1px solid #E6DDCF}.pp-h{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;border-bottom:2px solid #2E2E2E;padding:6px 0 12px;margin-bottom:12px}.pp-logo{font:800 28px 'Plus Jakarta Sans',Inter,sans-serif;letter-spacing:-.5px}.pp-logo.lw{color:#1F3B2D}.pp-logo.or{color:#C26445}.pp-logo small{display:block;font:500 11px Inter,sans-serif;color:#7A7268;letter-spacing:0}.pp-meta{text-align:right;font-size:12.5px;color:#5B544B;display:flex;flex-direction:column;gap:2px}.pp-meta b{font-size:15px;color:#2E2E2E}.pp-tabs{display:flex;gap:8px;margin:0 0 12px;flex-wrap:wrap}.pp-tabs button{border:1.5px solid #E2DACD;background:#fff;border-radius:999px;padding:8px 16px;font:600 13.5px Inter,sans-serif;cursor:pointer}.pp-tabs button.on{background:#2E2E2E;color:#fff;border-color:#2E2E2E}.pp-tabs .pp-pdf{margin-left:auto;border-color:#C26445;color:#C26445}.pp-tiers{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:4px 0 10px}.pp-tier{border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:2px}.pp-tier.p{background:#F4EEE4}.pp-tier.l{background:#2E2E2E;color:#fff}.pp-tier small{font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.8}.pp-tier b{font-size:30px;font-weight:800;letter-spacing:-.5px}.pp-tier span{font-size:12px;opacity:.75}.pp-tier em{font-style:normal;font-size:12.5px;margin-top:6px;opacity:.85}.pp-offer{background:#FBEFE9;color:#9A3B22;border-radius:12px;padding:10px 14px;font-weight:600;font-size:13.5px;margin:0 0 12px}.pp-v{height:min(62vh,600px);border-radius:14px;overflow:hidden;background:#EDE7DC;position:relative}.pp-v canvas{width:100%!important;height:100%!important}.pp-img{width:100%;border-radius:12px;display:block}.pp h3{font-size:16px;margin:18px 0 8px}.pp h3 i{font-weight:500;color:#7A7268;font-style:normal;font-size:13px}.pp-list{columns:2;gap:24px;margin:0;padding-left:20px;font-size:14px}.pp-list li{margin:0 0 6px;break-inside:avoid}.pp-list span{color:#7A7268;font-size:12.5px}.pp-t{width:100%;border-collapse:collapse;font-size:13.5px}.pp-t th{text-align:left;font-size:12px;color:#7A7268;font-weight:600;border-bottom:1px solid #E2DACD;padding:6px}.pp-t td{border-bottom:1px solid #EFE7DA;padding:8px 6px;vertical-align:top}.pp-t td:not(:first-child),.pp-t th:not(:first-child){text-align:right}.pp-t small{display:block;color:#7A7268;font-size:11.5px;line-height:1.35;margin-bottom:2px}.pp-q{white-space:nowrap}.pp-d td:nth-child(3),.pp-d td:nth-child(4){width:30%}.pp-tot td{font-weight:800;font-size:15px;border-top:2px solid #2E2E2E}.pp-add td{color:#7A7268}.pp-add.on td{color:#2E2E2E}.pp-add i{font-style:normal;font-size:11px;background:#EFE7DA;border-radius:99px;padding:1px 7px;margin-left:4px}.pp-add label{cursor:pointer}.pp-n,.pp-pay{font-size:13.5px;line-height:1.55;padding-left:20px;margin:0}.pp p{font-size:13.5px;line-height:1.55;margin:0}@media(max-width:640px){.pp-tiers{grid-template-columns:1fr}.pp-list{columns:1}.pp-h{flex-direction:column}.pp-meta{text-align:left}.pp-tier b{font-size:26px}}.pp-br{break-before:page;height:1px}@media print{.pp-tabs{display:none}.pp-tier.l{-webkit-print-color-adjust:exact;print-color-adjust:exact}.pp-tier.p,.pp-offer{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;
