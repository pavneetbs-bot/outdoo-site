// 186 Sales mode — an inside sales / CSP team member orders on outrr.in for a CRM lead (opened from the admin CRM with
// ?assist=<token>, 12 hours). Same pages, customiser and checkout; Made to Order prices open; contact details from the
// lead; "Place order" makes the order for the customer (sales_place_order) and gives the payment link to send them.
(function () {
  var KEY = 'outrr_assist', q = null;
  try { q = new URLSearchParams(location.search).get('assist'); } catch (e) {}
  if (q && /^[0-9a-f]{48}$/.test(q)) { try { sessionStorage.setItem(KEY, q); } catch (e) {} try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {} }
  var tok = null; try { tok = sessionStorage.getItem(KEY); } catch (e) {}
  if (!tok) return;
  window.ASSIST = { token: tok };
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  function exit(why) { try { sessionStorage.removeItem(KEY); } catch (e) {} window.ASSIST = null; var b = document.getElementById('asBar'); if (b) b.remove(); document.body.classList.remove('assist');
    if (why) alert(why); }
  window.assistExit = function () { exit(); location.href = location.pathname; };
  function bar(d) {
    var css = document.createElement('style');
    css.textContent = '#asBar{position:sticky;top:0;z-index:9999;background:#2E2E2E;color:#fff;font:13px/1.4 Inter,system-ui,sans-serif;padding:8px 14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}' +
      '#asBar b{color:#F2B49C}#asBar button{margin-left:auto;background:#BE5633;color:#fff;border:0;border-radius:8px;padding:6px 12px;font:inherit;cursor:pointer}' +
      '#asDone{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px}' +
      '#asDone .bx{background:#fff;border-radius:16px;max-width:520px;width:100%;padding:22px;font:14px/1.5 Inter,system-ui,sans-serif}#asDone input{width:100%;padding:10px;border:1px solid #DDD5C8;border-radius:10px;font:inherit}' +
      '#asDone .ac{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}#asDone .ac a,#asDone .ac button{border:0;border-radius:10px;padding:10px 14px;font:inherit;cursor:pointer;text-decoration:none}' +
      '#asDone .p{background:#BE5633;color:#fff}#asDone .g{background:#F6F1E7;color:#2E2E2E}';
    document.head.appendChild(css);
    var b = document.createElement('div'); b.id = 'asBar';
    b.innerHTML = '<span>SALES MODE</span><span>Ordering for <b>' + esc(d.name || d.phone) + '</b> · ' + esc(d.phone) + (d.city ? ' · ' + esc(d.city) : '') + ' · ' + esc(d.lead_no) + '</span>' +
      '<span>by ' + esc(d.staff) + ' (' + (d.role === 'csp' ? 'CSP' : 'inside sales') + ')</span><button type="button" onclick="assistExit()">Exit sales mode</button>';
    document.body.insertBefore(b, document.body.firstChild); document.body.classList.add('assist');
  }
  function prefill() {
    var d = window.ASSIST, set = function (id, v) { var e = document.getElementById(id); if (e && !e.value && v) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } };
    set('coName', d.name); set('coPh', String(d.phone || '').replace(/\D/g, '').slice(-10)); set('coEm', d.email); set('coCity', d.city);
  }
  var start = function () {
    if (!window._supaRpc) return setTimeout(start, 200);
    window._supaRpc('sales_session', { p_token: tok }).then(function (d) {
      if (!d || !d.phone) return exit('This sales link has expired. Open it again from the CRM lead.');
      window.ASSIST = Object.assign({ token: tok }, d); bar(d);
      var rc = window.renderCheckout; window.renderCheckout = function () { var r = rc.apply(this, arguments); try { prefill(); } catch (e) {} return r; };
    }, function () { exit('Sales mode could not start (no connection to outrr). Try again from the CRM.'); });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  // after "Place order": the payment link for the customer (the order waits 72 hours)
  window.assistDone = function (res, c) {
    var d = window.ASSIST || {}, url = location.origin + '/#payfirst=' + res.id, amt = res.pay_now != null ? '₹' + Math.round(+res.pay_now).toLocaleString('en-IN') : '';
    var msg = 'Hi ' + (c.name || d.name || '') + ', your outrr order ' + (res.order_no || '') + ' is ready. Please pay ' + (amt ? amt + ' ' : '') + 'here to confirm it: ' + url + ' — Team outrr';
    var ph = String(c.phone || d.phone || '').replace(/\D/g, '').slice(-10);
    var w = document.createElement('div'); w.id = 'asDone';
    w.innerHTML = '<div class="bx"><h3 style="margin:0 0 6px">Order ' + esc(res.order_no || '') + ' placed for ' + esc(c.name || d.name) + '</h3>' +
      '<p style="margin:0 0 10px">Send this payment link to the customer' + (amt ? ' — they pay <b>' + amt + '</b> now' : '') + '. It works for 72 hours; the order is confirmed when they pay. It is logged on the CRM lead.</p>' +
      '<input readonly value="' + esc(url) + '" onclick="this.select()">' +
      '<div class="ac"><a class="p" target="_blank" rel="noopener" href="https://wa.me/91' + ph + '?text=' + encodeURIComponent(msg) + '">Send on WhatsApp</a>' +
      '<button type="button" class="g" id="asCopy">Copy link</button><button type="button" class="g" id="asNew">New order for this customer</button></div></div>';
    document.body.appendChild(w);
    document.getElementById('asCopy').onclick = function () { try { navigator.clipboard.writeText(url); this.textContent = 'Copied'; } catch (e) {} };
    document.getElementById('asNew').onclick = function () { w.remove(); try { showHome(); } catch (e) { location.href = location.pathname; } };
  };
})();
