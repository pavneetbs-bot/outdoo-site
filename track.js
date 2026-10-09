/* outrr site tracking
 * - Our own analytics: every event goes to Supabase track_event() → admin Marketing → Overview.
 *   Only random visitor/session ids are kept, never names, phones or emails.
 * - Ad tags: Meta Pixel, Google Analytics 4 and Google Ads load only when their IDs are
 *   filled in admin → Marketing → Connections (read via site_tracking()).
 * - UTM tags / ad clicks are remembered for the visit, so an order is credited to the
 *   campaign that brought the visitor.
 * Use: otrack('view_item', { sku, value }) · 'add_to_cart' · 'begin_checkout' · 'purchase' { value, ref, skus }
 */
(function () {
  if (window.otrack) return
  var S = window.OUTRR_SUPA || {}
  var store = function (st, k, v) { try { if (v === undefined) return window[st].getItem(k); window[st].setItem(k, v) } catch (e) { return null } }
  var rid = function () { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36) }
  var vid = store('localStorage', 'outrr_vid'); if (!vid) { vid = rid(); store('localStorage', 'outrr_vid', vid) }
  var sid = store('sessionStorage', 'outrr_sid'); if (!sid) { sid = rid(); store('sessionStorage', 'outrr_sid', sid) }

  // where this visit came from (first landing of the session wins, a new ad click replaces it)
  var qs = new URLSearchParams(location.search), attr = {}
  try { attr = JSON.parse(store('sessionStorage', 'outrr_attr') || '{}') } catch (e) {}
  var click = qs.get('fbclid') ? 'fb' : qs.get('gclid') || qs.get('gbraid') || qs.get('wbraid') ? 'g' : null
  if (qs.get('utm_source') || click) {
    attr = { utm_source: qs.get('utm_source'), utm_medium: qs.get('utm_medium'), utm_campaign: qs.get('utm_campaign'), click_id: click }
    store('sessionStorage', 'outrr_attr', JSON.stringify(attr))
  }
  if (!store('sessionStorage', 'outrr_ref')) {
    var ref = ''; try { ref = document.referrer ? new URL(document.referrer).hostname : '' } catch (e) {}
    store('sessionStorage', 'outrr_ref', /(^|\.)outrr\.in$/.test(ref) ? '-' : (ref || '-'))
  }
  var referrer = store('sessionStorage', 'outrr_ref'); if (referrer === '-') referrer = null
  var device = /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop'

  // ---------------------------------------------------------------- ad tags
  var tags = null, queue = []
  function loadTags(t) {
    tags = t || {}
    if (tags.pixel) {
      /* Meta Pixel base code */
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) }
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0
        t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s) }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
      fbq('init', tags.pixel); fbq('track', 'PageView')
    }
    var gid = tags.ga4 || tags.ads
    if (gid) {
      var g = document.createElement('script'); g.async = true; g.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gid); document.head.appendChild(g)
      window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments) }
      gtag('js', new Date()); if (tags.ga4) gtag('config', tags.ga4); if (tags.ads) gtag('config', tags.ads)
    }
    queue.forEach(function (a) { toTags(a[0], a[1]) }); queue = []
  }
  var cached = store('sessionStorage', 'outrr_tags')
  if (cached) { try { loadTags(JSON.parse(cached)) } catch (e) { cached = null } }
  if (!cached && S.url && S.anon) {
    fetch(S.url + '/rest/v1/rpc/site_tracking', { method: 'POST', headers: { apikey: S.anon, Authorization: 'Bearer ' + S.anon, 'Content-Type': 'application/json' }, body: '{}' })
      .then(function (r) { return r.ok ? r.json() : {} }).then(function (t) { store('sessionStorage', 'outrr_tags', JSON.stringify(t || {})); loadTags(t) })
      .catch(function () { loadTags({}) })
  }

  var FB = { view_item: 'ViewContent', add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', purchase: 'Purchase' }
  function toTags(kind, d) {
    if (!tags) { queue.push([kind, d]); return }
    var skus = d.skus || (d.sku ? [d.sku] : []), value = +d.value || 0
    if (window.fbq && FB[kind]) fbq('track', FB[kind], { content_ids: skus, content_type: 'product', value: value, currency: 'INR' }, d.ref ? { eventID: d.ref } : undefined)
    if (window.gtag && kind !== 'page_view') {
      var ev = { currency: 'INR', value: value, items: skus.map(function (s) { return { item_id: s } }) }
      if (d.ref) ev.transaction_id = d.ref
      if (tags.ga4) gtag('event', kind, ev)
      if (kind === 'purchase' && tags.ads && tags.ads_purchase) gtag('event', 'conversion', { send_to: tags.ads + '/' + tags.ads_purchase, value: value, currency: 'INR', transaction_id: d.ref || '' })
    }
  }

  // ---------------------------------------------------------------- public
  window.otrack = function (kind, d) {
    d = d || {}
    try { toTags(kind, d) } catch (e) {}
    if (!S.url || !S.anon) return
    var p = { kind: kind, sid: sid, vid: vid, path: (location.pathname + location.search).slice(0, 200), sku: d.sku || (d.skus && d.skus[0]) || null,
      value: d.value != null ? String(Math.round(+d.value || 0)) : null, ref: d.ref || null,
      utm_source: attr.utm_source || null, utm_medium: attr.utm_medium || null, utm_campaign: attr.utm_campaign || null, click_id: attr.click_id || null,
      referrer: referrer, device: device }
    try {
      fetch(S.url + '/rest/v1/rpc/track_event', { method: 'POST', keepalive: true, headers: { apikey: S.anon, Authorization: 'Bearer ' + S.anon, 'Content-Type': 'application/json' }, body: JSON.stringify({ p: p }) }).catch(function () {})
    } catch (e) {}
  }
  window.otrack('page_view')
})()
