/* outrr — banner placements (2026-11). The template is fixed: slots + sizes below never change; only the ADS list does.
   Slots (desktop / mobile):
     H1 home top slider (index.html #obnHero)          1392×380 / card
     H2 home full-width banner (3 places)              1392×400 / 4:5
     H3 home pair, side by side (seller ads)           680×300 ×2 / stacked
     H4 inside home product strips                     product card / product card
     C1 collection page top, for that category         1392×200 / 16:7
     C2 collection grid, a card after every 8 products product card / product card
     C3 under the filters (desktop only)               260×360
     C4 collection grid, full width every 16 products  1392×220 / 16:7
     P1 product page, offer strip by the price         360×120 / full-width strip
     P2 product page, before "similar items"           1392×220 / 16:7
     S1 search results grid card                       product card / product card
   A banner: { id, slots, cols (categories it belongs to; empty = anywhere), from, to (ISO, IST), img: [file in img/banners or 'p:SKU'],
               eye, h, em, p, btn, act ('col:slug' | 'sub:slug|Sub' | 'p:SKU' | 'url:https…'), bg, fg, ac, sponsor ('' = ours; a seller name = shown as Sponsored) }
   A slot with no banner of its own falls back to an automatic one built from the category (its title + best photos), so no slot is ever empty. */
(function(){
  var FEB = '2027-02-01T00:00:00+05:30';   // vertical gardens & water features: people put them in from February
  var ADS = [
    // ---- in season now (Nov–Jan): fire pits, bar counters, pergolas, furniture, benches, planters (+ glass houses for winter sun)
    { id:'fire', slots:['H2','C1','C4','P2','C2','H4','C3','S1'], cols:['fire-pits'], img:['fp-teardrop','fp-orb'], bg:'#1E1D1B', fg:'#fff', ac:'#F4C76B',
      eye:'Fire pits & BBQ · ready to ship', h:'Gather round', em:'the fire.', p:'Hand-cut steel fire pits and barbecues for long winter evenings.', btn:'Shop fire pits', act:'col:fire-pits' },
    { id:'bar', slots:['H2','H3','C1','C4','P2','C3','C2','H4'], cols:['bar-counters'], img:['mto-bar-subway','mto-bar-arch'], bg:'#262422', fg:'#fff', ac:'#F4C76B',
      eye:'New Year · Outdoor kitchens', h:'Host the New Year', em:'outdoors.', p:'Bar counters, BBQ stations and pizza-oven counters, made to your length.', btn:'Plan your bar', act:'col:bar-counters' },
    { id:'pergola', slots:['H2','C1','C4','P2','C3','C2'], cols:['shade'], img:['mto-pergola','cat-shade-2'], bg:'#55634A', fg:'#fff', ac:'#EADCC8',
      eye:'Build in winter, sit out in summer', h:'Plan your pergola', em:'this season.', p:'Louvre, slatted and gable pergolas, made to your terrace size.', btn:'See pergolas', act:'col:shade' },
    { id:'furn', slots:['H2','C1','C4','P2','C2','H4','C3'], cols:['furniture'], img:['mto-sofa-teak','mto-chair'], bg:'#EADCC8', fg:'#2E2E2E', ac:'#C26445',
      eye:'Made to order', h:'Your frame.', em:'Your finish.', p:'Rope and wicker sofas, chairs and dining sets in MS, aluminium, steel or teak.', btn:'Shop furniture', act:'col:furniture' },
    { id:'bench', slots:['H2','C4','P2','C2','C3'], cols:['furniture'], img:['mto-bench-1','mto-bench-2'], bg:'#2F3A2C', fg:'#fff', ac:'#E9C46A',
      eye:'Benches · made to order', h:'Sit out in', em:'the winter sun.', p:'Garden, tree-surround and planter benches in WPC and steel, made to your length.', btn:'Shop benches', act:'sub:furniture|Benches' },
    { id:'plant', slots:['H2','C1','C4','P2','C2','C3'], cols:['planters'], img:['cat-planters-1','cat-planters-2'], bg:'#F2E9DD', fg:'#2E2E2E', ac:'#55634A',
      eye:'Winter planting season', h:'Planters made', em:'to your size.', p:'WPC, wooden and steel planters for balconies, terraces and entrances.', btn:'Shop planters', act:'col:planters' },
    { id:'glass', slots:['C1','C4','P2','C3'], cols:['cabins'], img:['mto-glasshouse','cat-cabins-2'], bg:'#1F2A24', fg:'#fff', ac:'#E9C46A',
      eye:'Winter build season', h:'A glass room for', em:'winter sun.', p:'Glass houses and garden cabins, designed to your size and built on site.', btn:'Design yours', act:'col:cabins' },
    { id:'sculpt', slots:['C1','C4','P2','C2','C3'], cols:['sculptures','art'], img:['mto-sculpt-knot','mto-sculpt-flame'], bg:'#F6F1E7', fg:'#2E2E2E', ac:'#C26445',
      eye:'Wedding & gifting season', h:'A statement', em:'for the season.', p:'Abstract, Buddha and animal sculptures in FRP or stone, 2 to 6 ft.', btn:'Shop sculptures', act:'col:sculptures' },
    { id:'lights', slots:['C1','C4','P2','C2','H4','C3','S1'], cols:['lighting'], img:['lt-globe','lt-petal'], bg:'#F2E9DD', fg:'#2E2E2E', ac:'#C26445',
      eye:'Handwoven by artisans · ready to ship', h:'Cane & wicker', em:'lights.', p:'Pendants and lanterns with a warm, woven glow.', btn:'Shop the lights', act:'col:lighting' },
    // ---- home pair (H3): privacy screens + feature walls
    { id:'privacy', slots:['H3','C1','C4','P2','C2','C3'], cols:['privacy-screens'], img:['cat-privacy-screens-1','cat-privacy-screens-2'], bg:'#2A2522', fg:'#fff', ac:'#E9A26B',
      eye:'Privacy screens', h:'Your terrace,', em:'your privacy.', p:'Jali, slat and green screens made to your parapet, 1 to 8 ft.', btn:'Shop screens', act:'col:privacy-screens' },
    { id:'fwall', slots:['H3','C1','C4','P2','C2','C3'], cols:['feature-walls'], img:['cat-feature-walls-1','cat-feature-walls-2'], bg:'#1E1D1B', fg:'#fff', ac:'#F4C76B',
      eye:'Feature walls', h:'A wall worth', em:'coming home to.', p:'Backlit jali, fluted and stone feature walls for entrances and terraces.', btn:'Shop feature walls', act:'col:feature-walls' },
    // ---- from February
    { id:'green', from:FEB, slots:['H2','C1','C4','P2','C2','C3'], cols:['vertical-gardens','planters'], img:['mto-greenwall','mto-greenwall2'], bg:'#24352B', fg:'#fff', ac:'#CFE3A8',
      eye:'Vertical gardens', h:'Green walls,', em:'ready for spring.', p:'Living walls in PVC pots, wooden and HPL troughs.', btn:'Shop green walls', act:'col:vertical-gardens' },
    { id:'water', from:FEB, slots:['H2','C1','C4','P2','C2','C3'], cols:['water-features'], img:['mto-cascade'], bg:'#1E1D1B', fg:'#fff', ac:'#9FD3E0',
      eye:'Water features', h:'The sound of water,', em:'lit at night.', p:'Cascades, fountains and water walls for courtyards and terraces.', btn:'Shop water features', act:'col:water-features' },
    // ---- offer (ready-to-ship only)
    { id:'outrr5', slots:['P1','S1','H4'], cols:[], rts:1, img:['ph-terrace-sunset'], bg:'#C26445', fg:'#fff', ac:'#fff',
      eye:'Launch offer', h:'Extra 5% off', em:'with OUTRR5', p:'On ready-to-ship orders. Applied at checkout by itself.', btn:'Shop now', act:'col:fire-pits' },
  ];
  var H4_FOR = { stripTrend:'outrr5', tilesBest:'fire', tilesNew:'lights' };   // the card inside each home strip
  var RTS_COLS = { 'fire-pits':1, 'lighting':1 };   // the OUTRR5 card shows only on ready-to-ship categories
  // 2026-11-18: hand-picked photos per category (lifestyle shots only — no sketches / drawings). Used by banners, the category grid and the menu.
  var PICS = {"bar-counters": ["cat-bar-counters-1", "cat-bar-counters-2", "cat-bar-counters-3", "cat-bar-counters-4"],
    "cabins": ["cat-cabins-1", "cat-cabins-2"],
    "decking": ["cat-decking-1", "cat-decking-2", "cat-decking-3"],
    "feature-walls": ["cat-feature-walls-1", "cat-feature-walls-2", "cat-feature-walls-3"],
    "graffiti": ["cat-graffiti-1", "cat-graffiti-2", "cat-graffiti-3"],
    "gates": ["cat-gates-1", "cat-gates-2", "cat-gates-3"],
    "shade": ["cat-shade-1", "cat-shade-2", "cat-shade-3"],
    "planters": ["cat-planters-1", "cat-planters-2", "cat-planters-3"],
    "privacy-screens": ["cat-privacy-screens-1", "cat-privacy-screens-2", "cat-privacy-screens-3"],
    "railings": ["cat-railings-1", "cat-railings-2", "cat-railings-3"],
    "sculptures": ["cat-sculptures-1", "cat-sculptures-2", "cat-sculptures-3"],
    "water-features": ["cat-water-features-1", "cat-water-features-2", "cat-water-features-3"],
    "vertical-gardens": ["cat-vertical-gardens-1", "cat-vertical-gardens-2", "cat-vertical-gardens-3"],
    "lighting": ["cat-lighting-1", "cat-lighting-2", "cat-lighting-3"],
    "fire-pits": ["cat-fire-pits-1", "cat-fire-pits-2", "cat-fire-pits-3"],
    "art": ["cat-art-1"],
    "furniture": ["mto-sofa-teak", "mto-chair", "mto-sofa-rope"]};
  // what goes well with what: a category page shows these categories' banners (cross-sell), in this order
  var RELATED = {"furniture": ["fire-pits", "lighting", "planters", "shade"],
    "fire-pits": ["lighting", "furniture", "bar-counters"],
    "lighting": ["fire-pits", "furniture", "shade"],
    "planters": ["vertical-gardens", "sculptures", "privacy-screens"],
    "shade": ["furniture", "lighting", "decking"],
    "bar-counters": ["fire-pits", "lighting", "furniture"],
    "cabins": ["decking", "lighting", "furniture"],
    "sculptures": ["planters", "water-features", "vertical-gardens"],
    "water-features": ["vertical-gardens", "sculptures", "lighting"],
    "vertical-gardens": ["planters", "privacy-screens", "water-features"],
    "privacy-screens": ["vertical-gardens", "planters", "feature-walls"],
    "feature-walls": ["lighting", "vertical-gardens", "privacy-screens"],
    "gates": ["railings", "privacy-screens", "feature-walls"],
    "railings": ["gates", "privacy-screens", "decking"],
    "decking": ["shade", "furniture", "planters"],
    "graffiti": ["feature-walls", "lighting", "sculptures"],
    "art": ["sculptures", "feature-walls", "lighting"]};
  var BIG = { H2:1, C1:1, C4:1, P2:1 };

  // ---------------------------------------------------------------- helpers
  var esc = function(t){ return String(t == null ? '' : t).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  var t = function(v){ return v ? new Date(v).getTime() : 0; };
  var live = function(a){ var n = Date.now(); return (!a.from || n >= t(a.from)) && (!a.to || n < t(a.to)); };
  var G = function(n){ try{ return Function('return typeof ' + n + "!=='undefined'?" + n + ':undefined')(); }catch(e){ return undefined; } };
  var src = function(i){ if(/^p:/.test(i)){ var k = i.slice(2), x = G('PRODS') && PRODS[k]; return x ? (IMGS[x.img] || IMGS[k] || '') : ''; } return /^(https?:|\/)/.test(i) ? i : '/img/banners/' + i + '.jpg'; };
  var seen = {}, USED = { home:{}, plp:{}, pdp:{} }, CTX = 'home';   // prefer creatives not yet shown on this page (per page type)
  // which banners may go in a slot. Home: the seasonal ones. A category page: C1 = its own (else an automatic one);
  // the rest = related categories first (cross-sell), then its own, then general offers. Product page: P2 = own, then related.
  function ownAd(slot, col){ return ADS.filter(function(a){ return a.cols[0] === col && a.slots.indexOf(slot) >= 0 && live(a); })[0]; }
  function candidates(slot, col){
    var all = ADS.filter(function(a){ return a.slots.indexOf(slot) >= 0 && live(a); });
    if(!col) return all;
    if(slot === 'C1') return [ownAd('C1', col) || auto(col)].filter(Boolean);
    var later = function(r){ return ADS.some(function(a){ return a.cols[0] === r && a.from && Date.now() < t(a.from); }); };   // its season hasn't started: no banner yet
    var rel = (RELATED[col] || []).filter(function(r){ return !later(r); }).map(function(r){ return ownAd(slot, r) || auto(r); }).filter(Boolean);
    var own = ownAd(slot, col), gen = all.filter(function(a){ return !a.cols.length && (!a.rts || RTS_COLS[col]); });
    return slot === 'P2' ? rel : rel.concat(own ? [own] : [], gen);   // a product page never advertises its own category
  }
  function pick(slot, col, n){
    var pool = candidates(slot, col).filter(function(a, i, l){ return a && l.indexOf(a) === i; });
    if(!pool.length) return [];
    var k = slot + '|' + (col || ''), s = col ? 0 : (seen[k] == null ? (seen[k] = Math.floor(Math.random() * pool.length)) : seen[k]), out = [];   // a category page: fixed order; elsewhere a random start per visit
    var order = pool.map(function(_, i){ return pool[(s + i) % pool.length]; });
    var U = USED[CTX], fresh = order.filter(function(a){ return !U[a.id]; }).concat(order.filter(function(a){ return U[a.id]; }));   // not yet on this page first
    for(var i = 0; i < (n || 1); i++){ var a = fresh[i % fresh.length]; out.push(a); U[a.id] = 1; }
    return out;
  }
  // a category without a banner of its own: its title, tagline and hand-picked photos
  var AUTO = {};
  function auto(col){
    if(AUTO[col]) return AUTO[col];
    var C = G('COLS') && COLS[col]; if(!C || !PICS[col]) return null;
    var P = G('PRODS') || {}, ids = Object.keys(P).filter(function(id){ return P[id].col === col; });
    var mto = ids.filter(function(id){ return P[id].cz; }).length > ids.length / 2;
    return AUTO[col] = { id:'auto-' + col, slots:[], cols:[col], img: PICS[col], bg:'#F6F1E7', fg:'#2E2E2E', ac:'#C26445',
      eye: mto ? 'Made to order' : 'Ready to ship', h: C.t, em: '', p: C.tag || '', btn: 'Explore', act: 'col:' + col };
  }
  window.OUTRR_PICS = PICS;
  window.adGo = function(act){
    try{
      if(!act) return;
      if(act === 'wa') return window.waToggle && waToggle();
      if(act.indexOf('col:') === 0) return openCol(act.slice(4));
      if(act.indexOf('sub:') === 0){ var s = act.slice(4).split('|'); return openSub(s[0], s[1]); }
      if(act.indexOf('p:') === 0) return openProduct(act.slice(2));
      if(act.indexOf('url:') === 0) return window.open(act.slice(4), '_blank', 'noopener');
      return window.obnGo && obnGo(act);
    }catch(e){}
  };
  function html(a, slot, hero){
    var ims = a.img.map(src).filter(Boolean), sp = a.sponsor ? '<span class="ad-sp">Sponsored · ' + esc(a.sponsor) + '</span>' : '';
    var style = 'style="--bg:' + a.bg + ';--fg:' + a.fg + ';--ac:' + a.ac + '"';
    var tx = '<span class="ad-eye">' + esc(a.eye) + '</span><b class="ad-h">' + esc(a.h) + (a.em ? ' <em>' + esc(a.em) + '</em>' : '') + '</b>';
    var cls = BIG[slot] ? 'ad-w' : slot === 'H3' ? 'ad-half' : slot === 'C3' ? 'ad-tall' : slot === 'P1' ? 'ad-strip' : 'ad-card';
    var body;
    if(slot === 'C1' && hero){   // the collection page's one top banner: the category title (h1) + the season's line
      var C = G('COLS') && COLS[hero] || {}, line = a.cols[0] === hero && a.em ? a.h + ' ' + a.em : '';
      return '<div class="ad ad-w ad-hero" data-slot="C1" data-ad="' + esc(a.id) + '" ' + style + '>' + sp + '<div class="ad-tx"><span class="ad-eye">' + esc(a.eye) + '</span><h1 class="ad-h" id="colTitleH">' + esc(C.t || a.h) + '</h1>'
        + (line ? '<b class="ad-line">' + esc(line) + '</b>' : '') + '<p>' + esc(line ? a.p : (C.tag || a.p)) + '</p></div><div class="ad-ims">'
        + ims.slice(0, 3).map(function(u){ return '<img src="' + u + '" alt="" fetchpriority="high">'; }).join('') + '</div></div>';
    }
    if(cls === 'ad-w') body = '<div class="ad-tx">' + tx + '<p>' + esc(a.p) + '</p><span class="ad-btn">' + esc(a.btn) + ' →</span></div><div class="ad-ims">' + ims.slice(0, slot === 'C1' ? 3 : 2).map(function(u){ return '<img src="' + u + '" alt="" loading="lazy">'; }).join('') + '</div>';
    else if(cls === 'ad-strip') body = (ims[0] ? '<img src="' + ims[0] + '" alt="" loading="lazy">' : '') + '<div class="ad-tx">' + tx + '<p>' + esc(a.p) + '</p></div><span class="ad-arr">→</span>';
    else body = (ims[0] ? '<img src="' + ims[0] + '" alt="" loading="lazy">' : '') + '<div class="ad-tx">' + tx + (cls === 'ad-card' ? '' : '<p>' + esc(a.p) + '</p>') + '<span class="ad-btn">' + esc(a.btn) + ' →</span></div>';
    return '<div class="ad ' + cls + '" data-slot="' + slot + '" data-ad="' + esc(a.id) + '" data-act="' + esc(a.act) + '" role="link" tabindex="0" ' + style + ' aria-label="' + esc(a.h + ' ' + (a.em || '') + '. ' + a.btn) + '">' + sp + body + '</div>';
  }
  function fill(el, slot, col, n){ if(!el) return; var list = pick(slot, col, n); el.innerHTML = list.map(function(a){ return html(a, slot, slot === 'C1' ? col : ''); }).join(''); el.hidden = !list.length; }
  document.addEventListener('click', function(e){ var a = e.target.closest && e.target.closest('.ad[data-act]'); if(!a) return; e.preventDefault(); adGo(a.getAttribute('data-act')); });
  document.addEventListener('keydown', function(e){ if(e.key !== 'Enter') return; var a = e.target.closest && e.target.closest('.ad[data-act]'); if(a) adGo(a.getAttribute('data-act')); });

  // ---------------------------------------------------------------- home: H2 / H3 / H4
  function home(){
    USED.home = {}; CTX = 'home';
    ['stripTrend','tilesBest','tilesNew'].forEach(function(id){ var d = document.getElementById(id); if(d) d._ad = null; });
    document.querySelectorAll('#home .adslot[data-slot]').forEach(function(el){ var s = el.getAttribute('data-slot'); fill(el, s, '', s === 'H3' ? 2 : 1); });
    [['stripTrend', 2], ['tilesBest', 3], ['tilesNew', 5]].forEach(function(x){
      var d = document.getElementById(x[0]); if(!d) return;
      var put = function(){ if(d.querySelector('.ad') || d.children.length < 4) return; CTX = 'home';
        var tmp = document.createElement('div'), a = d._ad || (d._ad = ADS.filter(function(z){ return z.id === H4_FOR[x[0]] && live(z); })[0] || pick('H4', '', 1)[0]); if(!a) return; tmp.innerHTML = html(a, 'H4');   // same banner when the strip re-draws
        var el = tmp.firstChild; if(d.classList.contains('hstrip')) el.classList.add('ad-instrip'); else d.removeChild(d.lastElementChild);   // a grid keeps its rows full
        d.insertBefore(el, d.children[x[1]] || null); };
      put(); if(window.MutationObserver) new MutationObserver(put).observe(d, { childList: true });
    });
  }
  // ---------------------------------------------------------------- collection / search: C1, C2, C3, C4, S1
  function plp(){
    USED.plp = {}; CTX = 'plp'; var k = G('lastCol') || '', search = k === '__search', col = /^(sp|bg|md)-|^__/.test(k) ? '' : k;
    var c1 = document.getElementById('adC1'); fill(c1, 'C1', col, 1);
    var cb = document.querySelector('#plp .colban'); if(cb) cb.style.display = c1 && !c1.hidden ? 'none' : '';   // one banner on top, not two
    fill(document.getElementById('adC3'), 'C3', col, 1);
    var g = document.getElementById('plpGrid'); if(!g) return;
    var cards = [].slice.call(g.children).filter(function(c){ return c.classList.contains('pc') || c.classList.contains('bunc'); });
    if(cards.length < 6) return;
    for(var i = cards.length - 1; i >= 0; i--){
      var pos = i + 1, tmp = document.createElement('div'), a;
      if(pos % 16 === 0 && pos < cards.length){ a = pick(search ? 'S1' : 'C4', col, 1)[0]; if(a){ tmp.innerHTML = html(a, search ? 'S1' : 'C4'); cards[i].after(tmp.firstChild); } }
      else if(pos % 8 === 0 && pos < cards.length || pos === 4){ a = pick(search ? 'S1' : 'C2', col, 1)[0]; if(a){ tmp.innerHTML = html(a, search ? 'S1' : 'C2'); cards[i].after(tmp.firstChild); } }
    }
  }
  // ---------------------------------------------------------------- product page: P1, P2
  function pdp(id){ USED.pdp = {}; CTX = 'pdp'; var x = G('PRODS') && PRODS[id], col = x ? x.col : '';
    var p1 = document.getElementById('adP1');   // P1: ready to ship → the OUTRR5 offer
    if(p1){ var a1 = x && !x.cz ? ADS.filter(function(a){ return a.id === 'outrr5' && live(a); })[0] : null; p1.innerHTML = a1 ? html(a1, 'P1') : ''; p1.hidden = !a1; }   // made to order: no strip
    fill(document.getElementById('adP2'), 'P2', col, 1); }

  function wrap(name, after){ var f = window[name]; if(typeof f !== 'function' || f._ad) return; var g = function(){ var r = f.apply(this, arguments); try{ after.apply(this, arguments); }catch(e){} return r; }; g._ad = 1; window[name] = g; }
  function start(){
    wrap('renderPLP', plp); wrap('openProduct', function(id){ setTimeout(function(){ pdp(id); }, 0); });
    home();
    window.adsRefresh = function(){ AUTO = {}; home(); };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.OUTRR_ADS = ADS;
})();
