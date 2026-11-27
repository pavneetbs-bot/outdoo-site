// 249: "🛰 See my roof from above" — the customer's own roof as Google satellite view, beside the terrace setup.
// Shown live from Google Maps (with Google's attribution); nothing from the map is saved or traced. The customer reads
// sizes / where the stairs room and tanks are and sets them on our plan themselves. Optional 📏: tap points to see a
// length (and the area for 3+ points). Key = company_settings.gmaps_key via company_public (window.OUTRR_GMK).
(function () {
  if (window.outrrRoofMap) return;
  var LS = 'outrr_roof_ll', box = null, map = null, pts = [], marks = [], line = null, poly = null, meas = false, loading = null;
  function css() {
    if (document.getElementById('rm-css')) return;
    var s = document.createElement('style'); s.id = 'rm-css';
    s.textContent = '.rm-p{position:fixed;z-index:10050;right:12px;bottom:12px;width:min(440px,calc(100vw - 24px));height:min(560px,calc(100vh - 90px));background:#fff;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.28);display:flex;flex-direction:column;overflow:hidden;font:14px Inter,system-ui,sans-serif;color:#2E2E2E}' +
      '@media(max-width:760px){.rm-p{left:0;right:0;bottom:0;width:100%;height:58vh;border-radius:14px 14px 0 0}}' +
      '.rm-h{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #eee}.rm-h b{flex:1;font-size:15px}.rm-x{border:0;background:#f3f1ec;border-radius:50%;width:32px;height:32px;font-size:16px;cursor:pointer}' +
      '.rm-s{display:flex;gap:6px;padding:8px 12px}.rm-s input{flex:1;min-width:0;border:1px solid #ddd;border-radius:8px;padding:8px 10px;font-size:14px}.rm-s button,.rm-t button{border:1px solid #ddd;background:#fff;border-radius:8px;padding:7px 10px;font-size:13px;cursor:pointer;white-space:nowrap;touch-action:manipulation}' +
      '.rm-t{display:flex;gap:6px;flex-wrap:wrap;padding:0 12px 8px}.rm-t button.on{background:#C26445;border-color:#C26445;color:#fff}' +
      '.rm-m{flex:1;min-height:0;background:#e9e6df}.rm-r{padding:6px 12px;font-size:13px;min-height:20px}.rm-n{padding:0 12px 10px;font-size:11.5px;color:#777}';
    document.head.appendChild(s);
  }
  function load(key) {
    if (window.google && google.maps && google.maps.Map) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise(function (ok, no) {
      window.__rmReady = function () { ok(); };
      var sc = document.createElement('script');
      sc.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(key) + '&v=weekly&libraries=geometry&loading=async&callback=__rmReady';
      sc.async = true; sc.onerror = function () { loading = null; no(new Error('map')); }; document.head.appendChild(sc);
    });
    return loading;
  }
  function say(t) { var r = box && box.querySelector('.rm-r'); if (r) r.textContent = t || ''; }
  function ft(m) { return Math.round(m * 3.28084 * 2) / 2; }
  function clear() { marks.forEach(function (m) { m.setMap(null); }); marks = []; pts = []; if (line) line.setMap(null); if (poly) poly.setMap(null); line = poly = null; say(meas ? 'Tap the corners of your roof, one by one.' : ''); }
  function drawMeas() {
    var G = google.maps, sp = G.geometry.spherical;
    if (line) line.setMap(null); if (poly) poly.setMap(null); line = poly = null;
    if (pts.length >= 2) line = new G.Polyline({ map: map, path: pts.length >= 3 ? pts.concat([pts[0]]) : pts, strokeColor: '#FFD54A', strokeWeight: 3, clickable: false });
    if (pts.length >= 3) poly = new G.Polygon({ map: map, paths: pts, fillColor: '#FFD54A', fillOpacity: 0.15, strokeOpacity: 0, clickable: false });
    var sides = []; for (var i = 1; i < pts.length; i++) sides.push(ft(sp.computeDistanceBetween(pts[i - 1], pts[i])));
    if (pts.length >= 3) sides.push(ft(sp.computeDistanceBetween(pts[pts.length - 1], pts[0])));
    var t = sides.length ? 'Sides: ' + sides.map(function (s) { return s + ' ft'; }).join(' · ') : 'Tap the next corner.';
    if (pts.length >= 3) t += ' — about ' + Math.round(sp.computeArea(pts) * 10.7639) + ' sq ft';
    say(t + ' (from the satellite photo — roughly ±1–2 ft)');
  }
  function remember() { try { var c = map.getCenter(); localStorage.setItem(LS, JSON.stringify({ lat: c.lat(), lng: c.lng(), z: map.getZoom() })); } catch (e) {} }
  function find(q) {
    if (!q) return; say('Finding…');
    new google.maps.Geocoder().geocode({ address: q, region: 'in', componentRestrictions: { country: 'IN' } }, function (r, st) {
      if (st !== 'OK' || !r || !r[0]) return say('Couldn\'t find that — try the locality and city, or a pincode.');
      map.setCenter(r[0].geometry.location); map.setZoom(20); say('Drag the map so your roof is in the middle. Zoom in for detail.'); remember();
    });
  }
  function here() {
    if (!navigator.geolocation) return say('This phone doesn\'t share its location — search instead.');
    say('Finding you…');
    navigator.geolocation.getCurrentPosition(function (p) { map.setCenter({ lat: p.coords.latitude, lng: p.coords.longitude }); map.setZoom(20); say('Is your roof in the middle? Drag to fine-tune.'); remember(); },
      function () { say('Location not allowed — search by your locality or pincode.'); }, { enableHighAccuracy: true, timeout: 12000 });
  }
  window.outrrRoofMap = function (o) {
    o = o || {}; var key = window.OUTRR_GMK || '';
    if (!key) return;
    if (box) { box.remove(); box = null; map = null; pts = []; marks = []; return; }   // the same button closes it
    css();
    box = document.createElement('div'); box.className = 'rm-p'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Your roof from above');
    box.innerHTML = '<div class="rm-h"><b>🛰 Your roof from above</b><button class="rm-x" aria-label="Close">✕</button></div>' +
      '<form class="rm-s"><input type="search" placeholder="Locality, society or pincode" aria-label="Find your home"><button type="submit">Find</button><button type="button" class="rm-me">📍 Me</button></form>' +
      '<div class="rm-t"><button type="button" class="rm-ms">📏 Measure</button><button type="button" class="rm-cl">Clear</button></div>' +
      '<div class="rm-m"></div><div class="rm-r"></div><p class="rm-n">Satellite photo from Google, shown live — not saved. Use it to check your roof\'s size and where the stairs room and tanks are, then set them on the plan.</p>';
    document.body.appendChild(box);
    box.querySelector('.rm-x').onclick = function () { remember(); box.remove(); box = null; map = null; };
    box.querySelector('.rm-s').onsubmit = function (e) { e.preventDefault(); find(this.querySelector('input').value.trim()); };
    box.querySelector('.rm-me').onclick = here;
    box.querySelector('.rm-ms').onclick = function () { meas = !meas; this.classList.toggle('on', meas); if (map) map.setOptions({ draggableCursor: meas ? 'crosshair' : null }); clear(); };
    box.querySelector('.rm-cl').onclick = clear;
    say('Loading the map…');
    try { window.otrack && window.otrack('plan_roofmap', {}); } catch (e) {}
    load(key).then(function () {
      if (!box) return;
      var last = null; try { last = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) {}
      map = new google.maps.Map(box.querySelector('.rm-m'), { center: last ? { lat: last.lat, lng: last.lng } : { lat: 28.6139, lng: 77.209 }, zoom: last ? Math.max(18, last.z || 20) : 12,
        mapTypeId: 'satellite', tilt: 0, gestureHandling: 'greedy', disableDefaultUI: true, zoomControl: true, rotateControl: true, clickableIcons: false });
      map.addListener('idle', remember);
      map.addListener('click', function (e) {
        if (!meas) return;
        if (pts.length >= 8) clear();
        pts.push(e.latLng);
        marks.push(new google.maps.Marker({ map: map, position: e.latLng, clickable: false, icon: { path: google.maps.SymbolPath.CIRCLE, scale: 5, fillColor: '#FFD54A', fillOpacity: 1, strokeColor: '#2E2E2E', strokeWeight: 1 } }));
        drawMeas();
      });
      if (!last) { say('Find your home: search, or tap 📍 Me if you are at home now.'); if (o.city) find(o.city); }
      else say('Your roof from last time. Search to look somewhere else.');
    }).catch(function () { say('The map couldn\'t load right now. Please try again in a bit.'); });
  };
})();
