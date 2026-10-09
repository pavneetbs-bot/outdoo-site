/* outrr — My account, order tracking, cancel / return, address book, GST details.
   Sign-in: 6-digit code sent to email (Supabase Auth OTP). Every rule is checked again in the
   database (025_customer_accounts.sql); this file only draws the screens. */
(function () {
  const S = () => window.OUTRR_SUPA || {}
  const KEY = 'outrr_session'
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
  const rs = n => '₹' + Math.round(+n || 0).toLocaleString('en-IN')
  const d8 = (t, time) => t ? new Date(t).toLocaleString('en-IN', time ? { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' }) : ''
  const $ = id => document.getElementById(id)
  const say = m => (window.toast ? toast(m) : alert(m))
  const STATES = (typeof CO_STATES !== 'undefined' && CO_STATES) || ['Delhi', 'Haryana', 'Uttar Pradesh', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Telangana', 'West Bengal', 'Gujarat', 'Rajasthan', 'Punjab']

  // ---------------------------------------------------------------- session (Supabase Auth REST)
  let sess = null; try { sess = JSON.parse(localStorage.getItem(KEY) || 'null') } catch (e) {}
  const saveSess = s => { sess = s; try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY) } catch (e) {} ; paintIcon() }
  async function auth(path, body, token) {
    const r = await fetch(S().url + '/auth/v1/' + path, { method: 'POST', headers: { apikey: S().anon, 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body || {}) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j.msg || j.error_description || j.message || 'Something went wrong')
    return j
  }
  const keep = j => saveSess({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in || 3600) * 1000, email: j.user?.email || sess?.email })
  async function token() {
    if (!sess) return null
    if (Date.now() > sess.expires_at - 60000) {
      try { keep(await auth('token?grant_type=refresh_token', { refresh_token: sess.refresh_token })) } catch (e) { saveSess(null); return null }
    }
    return sess.access_token
  }
  window.acToken = token
  async function rpc(fn, args, needLogin = true) {
    const t = await token()
    if (needLogin && !t) { acOpen(); throw new Error('Please sign in') }
    const r = await fetch(S().url + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: S().anon, Authorization: 'Bearer ' + (t || S().anon), 'Content-Type': 'application/json' }, body: JSON.stringify(args || {}) })
    const j = await r.json().catch(() => null)
    if (!r.ok) { if (r.status === 401) saveSess(null); throw new Error(j?.message || 'Something went wrong') }
    return j
  }

  // ---------------------------------------------------------------- page shell
  let me = null, orders = null, tab = 'orders'
  function view(html) {
    let el = $('account')
    if (!el) { el = document.createElement('div'); el.id = 'account'; el.style.display = 'none'; ($('checkout') || document.body).insertAdjacentElement('afterend', el) }
    el.innerHTML = `<div class="wrap ac">${html}</div>`
    if (typeof showView === 'function') showView('account'); else el.style.display = 'block'
  }
  function paintIcon() {
    document.querySelectorAll('.acicon').forEach(b => b.classList.toggle('in', !!sess))
  }

  window.acOpen = async function (t) {
    if (t) tab = t
    if (!S().url) return say('Accounts are unavailable right now')
    if (!(await token())) return signIn()
    view('<div class="ac-load">Loading your account…</div>')
    try { me = await rpc('customer_me'); orders = await rpc('customer_orders') } catch (e) { return view(`<div class="ac-card"><b>Couldn't load your account.</b><p>${esc(e.message)}</p><button class="btn" onclick="acOpen()">Try again</button></div>`) }
    draw()
  }

  // ---------------------------------------------------------------- sign in with an email code
  let pendingNext = null, pendingWhy = ''
  window.acRequire = async function (next, why) {
    if (!S().url) return say('Accounts are unavailable right now')
    if (await token()) return next()
    pendingNext = next; pendingWhy = why || ''; signIn()
  }
  function signIn(email = '', sent = false, err = '') {
    view(`<div class="ac-sign">
      <div class="ac-card">
        <h2>${sent ? 'Enter the code' : (pendingWhy || 'Sign in or create your account')}</h2>
        <p class="mut">${sent ? `We sent a 6-digit code to <b>${esc(email)}</b>. It works for 10 minutes.` : 'Track orders, cancel, return, save addresses and get GST invoices. No password needed: we email you a code.'}</p>
        ${sent ? `<div class="fld"><label>6-DIGIT CODE</label><input id="acCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" class="ac-code"></div>
          <button class="btn ac-wide" id="acGo" onclick="acVerify('${esc(email)}')">Sign in</button>
          <div class="ac-row"><a onclick="acSend('${esc(email)}')">Send a new code</a><a onclick="acSignIn()">Use another email</a></div>`
        : `<div class="fld"><label>EMAIL</label><input id="acEmail" type="email" autocomplete="email" placeholder="you@email.com" value="${esc(email)}"></div>
          <button class="btn ac-wide" id="acGo" onclick="acSend()">Send code</button>`}
        ${err ? `<div class="ac-err">${esc(err)}</div>` : ''}
        <p class="mut sm">Orders you placed earlier with this email show up in your account.</p>
      </div>
      <div class="ac-card ac-side"><h3>Track without signing in</h3><p class="mut">Use the order number and mobile number from your order.</p><button class="btn ghost ac-wide" onclick="acTrack()">Track an order</button></div>
    </div>`)
    setTimeout(() => { const i = $(sent ? 'acCode' : 'acEmail'); if (i) { i.focus(); i.onkeydown = e => { if (e.key === 'Enter') $('acGo').click() } } }, 50)
  }
  window.acSignIn = () => { pendingNext = null; pendingWhy = ''; signIn() }
  window.acSend = async function (email) {
    email = (email || $('acEmail')?.value || '').trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return signIn(email, false, 'Enter a valid email')
    const b = $('acGo'); if (b) { b.disabled = true; b.textContent = 'Sending…' }
    try { await auth('otp', { email, create_user: true }); signIn(email, true) }
    catch (e) { signIn(email, false, /rate|seconds/i.test(e.message) ? 'Please wait a minute before asking for another code.' : e.message) }
  }
  window.acVerify = async function (email) {
    const code = ($('acCode')?.value || '').replace(/\D/g, '')
    if (code.length !== 6) return signIn(email, true, 'Enter the 6-digit code from the email')
    const b = $('acGo'); if (b) { b.disabled = true; b.textContent = 'Signing in…' }
    try {
      keep({ ...(await auth('verify', { type: 'email', email, token: code })), user: { email } })
      if (pendingNext) { const n = pendingNext; pendingNext = null; pendingWhy = ''; return n() }
      acOpen('orders')
    }
    catch (e) { signIn(email, true, /expired|invalid/i.test(e.message) ? 'That code is wrong or has expired. Try again or send a new code.' : e.message) }
  }
  window.acSignOut = async function () {
    try { if (sess) await auth('logout', {}, sess.access_token) } catch (e) {}
    saveSess(null); me = null; orders = null; wl = null; wlPaint(); if (typeof showHome === 'function') showHome()
    say('Signed out')
  }


  // ---------------------------------------------------------------- wishlist (saved in the customer's account)
  let wl = null
  async function wlLoad() {
    if (wl) return wl
    const t = await token(); if (!t) return (wl = [])
    try { const r = await fetch(S().url + '/auth/v1/user', { headers: { apikey: S().anon, Authorization: 'Bearer ' + t } }); const j = await r.json(); wl = Array.isArray(j.user_metadata?.wishlist) ? j.user_metadata.wishlist : [] } catch (e) { wl = wl || [] }
    return wl
  }
  async function wlSave(list) {
    const t = await token(); if (!t) throw new Error('Please sign in again')
    const r = await fetch(S().url + '/auth/v1/user', { method: 'PUT', headers: { apikey: S().anon, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { wishlist: list.slice(0, 200) } }) })
    if (!r.ok) throw new Error('Could not save your wishlist. Please try again.')
    wl = list; wlPaint()
  }
  function wlPaint() {
    const n = (wl || []).length
    document.querySelectorAll('.wlcount').forEach(el => { el.textContent = n || ''; el.hidden = !n })
    const id = typeof curPid !== 'undefined' ? curPid : null, b = $('pdWish')
    if (b) { const on = !!id && (wl || []).includes(id); b.classList.toggle('on', on); const l = b.querySelector('.wl-l'); if (l) l.textContent = on ? 'Saved' : 'Save' }
  }
  window.acWishToggle = function (id) {
    id = id || (typeof curPid !== 'undefined' ? curPid : null); if (!id) return
    acRequire(async () => {
      const list = [...await wlLoad()], i = list.indexOf(id)
      i >= 0 ? list.splice(i, 1) : list.unshift(id)
      try { await wlSave(list); say(i >= 0 ? 'Removed from wishlist' : 'Saved to wishlist') } catch (e) { say(e.message) }
      if ($('account')?.style.display === 'block' && $('wlGrid')) acWishlist()
      else if (typeof openProduct === 'function' && typeof PRODS !== 'undefined' && PRODS[id] && $('pdp')?.style.display !== 'block') openProduct(id)
    }, 'Sign in to save your wishlist')
  }
  window.acWishlist = function () {
    acRequire(async () => {
      view('<div class="ac-load">Loading your wishlist…</div>')
      const list = (await wlLoad()).filter(id => typeof PRODS !== 'undefined' && PRODS[id])
      const inr0 = n => typeof inr === 'function' ? inr(n) : rs(n)
      view(`<div class="ac-card"><h2>My wishlist</h2>${list.length ? `<p class="mut">${list.length} saved item${list.length > 1 ? 's' : ''}</p>
        <div id="wlGrid" class="wl-grid">${list.map(id => { const x = PRODS[id]; return `<div class="wl-item">
          <div class="wl-img" onclick="openProduct('${esc(id)}')"><img src="${esc((typeof IMGS !== 'undefined' && IMGS[x.img]) || '')}" alt=""></div>
          <div class="wl-n" onclick="openProduct('${esc(id)}')">${esc(x.n)}</div><div class="wl-p">${inr0(x.p)}</div>
          <div class="wl-a"><button class="btn" onclick="addCart('${esc(id)}')">Add to cart</button><button class="btn ghost" onclick="acWishToggle('${esc(id)}')">Remove</button></div></div>` }).join('')}</div>`
        : `<p class="mut" id="wlGrid">Nothing saved yet. Tap <b>Save</b> on any product to keep it here.</p><button class="btn" onclick="showHome()">Browse products</button>`}</div>`)
    }, 'Sign in to see your wishlist')
  }
  window.acWlPaint = wlPaint
  setTimeout(() => { if (sess) wlLoad().then(wlPaint) }, 500)

  // ---------------------------------------------------------------- account
  function draw() {
    const T = (k, l) => `<button class="${tab === k ? 'on' : ''}" onclick="acTab('${k}')">${l}</button>`
    view(`<div class="pagetop"><span class="bk" onclick="showHome()">←</span><h2>My account</h2></div>
      <div class="ac-hello"><div><b>Hi${me.name ? ', ' + esc(me.name.split(' ')[0]) : ''}</b><span>${esc(me.email)}</span></div><a onclick="acSignOut()">Sign out</a></div>
      <div class="ac-tabs">${T('orders', 'Orders')}${T('addresses', 'Addresses')}${T('profile', 'Profile & GST')}</div>
      <div id="acBody"></div>`)
    tab === 'orders' ? drawOrders() : tab === 'addresses' ? drawAddresses() : drawProfile()
  }
  window.acTab = t => { tab = t; draw() }

  // ---------------------------------------------------------------- orders
  const STEPS = [['placed', 'Placed'], ['confirmed', 'Confirmed'], ['packed', 'Packed'], ['shipped', 'Shipped'], ['delivered', 'Delivered']]
  const LABEL = { placed: 'Order placed', confirmed: 'Confirmed', packed: 'Packed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled', rto: 'Returned to seller', returned: 'Returned' }
  const RET = { requested: 'Return requested', approved: 'Return approved · pickup soon', rejected: 'Return not approved', picked_up: 'Picked up', received: 'Received · refund on the way', refunded: 'Refunded', cancelled: 'Return withdrawn' }
  const DEAD = ['cancelled', 'rto', 'returned']
  const stageOf = o => {
    const live = o.items.filter(i => !DEAD.includes(i.status))
    if (!live.length) return o.items.some(i => i.status === 'returned') ? 'returned' : 'cancelled'
    const idx = Math.min(...live.map(i => STEPS.findIndex(s => s[0] === i.status)))
    return STEPS[Math.max(0, idx)][0]
  }
  function orderCard(o, full) {
    const st = stageOf(o), k = STEPS.findIndex(s => s[0] === st), dead = DEAD.includes(st)
    const ship = o.items.find(i => i.awb)
    const invSellers = full ? [...new Set(o.items.filter(i => i.invoice_no && i.seller_id).map(i => i.seller_id))] : []
    const canCancel = full && o.items.some(i => i.can_cancel)
    return `<div class="ac-order" id="ord-${o.id}">
      <div class="ao-top"><div><b>${esc(o.order_no)}</b><span>${d8(o.created_at)} · ${rs(o.total)} · ${o.payment_method === 'cod' ? 'Cash on delivery' : 'Paid online'}</span></div>
        <span class="ao-st ${dead ? 'x' : st === 'delivered' ? 'ok' : ''}">${LABEL[st]}</span></div>
      ${dead ? '' : `<div class="ao-bar">${STEPS.map((s, i) => `<div class="${i <= k ? 'on' : ''}"><i></i><span>${s[1]}</span></div>`).join('')}</div>`}
      ${ship ? `<div class="ao-ship">🚚 ${esc(ship.courier || 'Courier')} · AWB <b>${esc(ship.awb)}</b>${ship.tracking_url ? ` · <a href="${esc(ship.tracking_url)}" target="_blank" rel="noopener">Track shipment</a>` : ''}</div>` : ''}
      <div class="ao-items">${o.items.map(i => `<div class="ao-it">
          <div class="im">${i.image_url ? `<img src="${esc(i.image_url)}" alt="" loading="lazy">` : ''}</div>
          <div class="tx"><div class="nm">${esc(i.name)}</div><div class="mut sm">Qty ${i.qty} · ${rs(i.gross)} · <b class="${DEAD.includes(i.status) ? 'red' : ''}">${LABEL[i.status]}</b>${i.status === 'delivered' && i.delivered_at ? ' ' + d8(i.delivered_at) : ''}</div>
            ${i.return ? `<div class="ao-ret ${i.return.status}">${RET[i.return.status]}${i.return.status === 'refunded' ? ` · ${rs(i.return.refund_amount)}` : ''}${i.return.seller_note && i.return.status === 'rejected' ? ` · ${esc(i.return.seller_note)}` : ''}${i.return.team_note && ['rejected', 'approved'].includes(i.return.status) ? ` · ${esc(i.return.team_note)}` : ''}
              ${full && ['requested', 'approved'].includes(i.return.status) ? ` <a onclick="acCancelReturn('${i.return.id}')">Withdraw</a>` : ''}</div>` : ''}
            ${full && i.can_return ? `<div class="sm"><a class="ao-act" onclick="acReturn('${o.id}','${i.id}')">Return this item</a> <span class="mut">until ${d8(i.return_until)}</span></div>` : ''}
            ${i.status === 'delivered' && !i.can_return && !i.return && i.return_until ? `<div class="mut sm">Return window closed ${d8(i.return_until)}</div>` : ''}
          </div></div>`).join('')}</div>
      ${full ? `<div class="ao-addr mut sm"><b>Deliver to</b> ${esc(o.customer_name)}, ${esc(o.address)}, ${esc(o.city)}, ${esc(o.state)} ${esc(o.pincode)} · ${esc(o.phone)}
        ${o.gstin ? `<br><b>GST invoice</b> ${esc(o.company_name)} · ${esc(o.gstin)}` : ''}</div>` : `<div class="ao-addr mut sm">Delivering to ${esc(o.city)}, ${esc(o.state)} ${esc(o.pincode)}</div>`}
      <div class="ao-acts">
        ${canCancel ? `<button class="btn ghost sm" onclick="acCancel('${o.id}')">Cancel</button>` : ''}
        ${full && o.can_edit ? `<button class="btn ghost sm" onclick="acEdit('${o.id}','address')">Change address</button><button class="btn ghost sm" onclick="acEdit('${o.id}','gst')">${o.gstin ? 'Change' : 'Add'} GST details</button>` : ''}
        ${invSellers.map((sid, n) => `<button class="btn ghost sm" onclick="acInvoice('${o.id}','${sid}')">Invoice${invSellers.length > 1 ? ' ' + (n + 1) : ''}</button>`).join('')}
        <button class="btn ghost sm" onclick="acTimeline('${o.id}')">Order history</button>
        <a class="sm" onclick="typeof waToggle==='function'?waToggle():0">Need help?</a>
      </div>
      ${full && !o.can_edit && !dead && o.invoiced && o.items.some(i => ['confirmed', 'packed'].includes(i.status)) ? `<div class="mut sm ao-note">The seller has made the tax invoice, so the address and GST details can't be changed now.</div>` : ''}
      <div class="ao-tl" id="tl-${o.id}" hidden>${timeline(o)}</div>
    </div>`
  }
  const EVL = { placed: 'Order placed', confirmed: 'Confirmed by the seller', packed: 'Packed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled', rto: 'Returned to the seller',
    returned: 'Item returned', changed: 'You changed the order', return_requested: 'Return requested', return_approved: 'Return approved', return_rejected: 'Return not approved',
    return_picked_up: 'Return picked up', return_received: 'Return received', return_refunded: 'Refund sent', return_cancelled: 'Return withdrawn' }
  function timeline(o) {
    const seen = new Set(), ev = (o.events || []).filter(e => { const k = e.action + '|' + String(e.at).slice(0, 16); if (seen.has(k)) return false; seen.add(k); return true })
    return `<ul>${ev.map(e => `<li><span>${d8(e.at, true)}</span><b>${EVL[e.action] || e.action}</b>${e.note ? `<em>${esc(e.note)}</em>` : ''}</li>`).join('')}</ul>`
  }
  window.acTimeline = id => { const el = $('tl-' + id); if (el) el.hidden = !el.hidden }
  function drawOrders() {
    const b = $('acBody')
    if (!orders.length) { b.innerHTML = `<div class="ac-card ac-empty"><b>No orders yet</b><p class="mut">Orders you place while signed in, or earlier with ${esc(me.email)}, show up here.</p><button class="btn" onclick="showHome()">Start shopping</button></div>`; return }
    b.innerHTML = orders.map(o => orderCard(o, true)).join('')
  }
  const swap = o => { const i = orders.findIndex(x => x.id === o.id); if (i >= 0) orders[i] = o; draw() }

  // ---------------------------------------------------------------- modal
  function modal(title, body, foot) {
    acClose()
    const m = document.createElement('div'); m.className = 'acm'; m.id = 'acm'
    m.innerHTML = `<div class="acm-bg" onclick="acClose()"></div><div class="acm-box"><div class="acm-h"><b>${title}</b><span onclick="acClose()">✕</span></div><div class="acm-b">${body}</div><div class="acm-f">${foot}</div></div>`
    document.body.appendChild(m); document.body.classList.add('flt-open')
  }
  window.acClose = () => { $('acm')?.remove(); document.body.classList.remove('flt-open') }
  const busy = (id, on, txt) => { const b = $(id); if (b) { b.disabled = on; if (txt) b.textContent = txt } }
  const errIn = (msg) => { const e = document.querySelector('#acm .ac-err'); if (e) { e.textContent = msg; e.hidden = false } else say(msg) }

  // cancel
  const CANCEL_WHY = ['Ordered by mistake', 'Found a better price', 'Delivery is taking too long', 'Want to change the product', 'Other']
  window.acCancel = function (oid) {
    const o = orders.find(x => x.id === oid), can = o.items.filter(i => i.can_cancel)
    modal('Cancel items', `<p class="mut sm">Items that haven't shipped yet can be cancelled. Cash on delivery: nothing to refund.</p>
      ${can.map(i => `<label class="ac-chk"><input type="checkbox" value="${i.id}" checked> ${esc(i.name)} <span class="mut">× ${i.qty}</span></label>`).join('')}
      <div class="fld"><label>REASON</label><select id="acWhy">${CANCEL_WHY.map(w => `<option>${w}</option>`).join('')}</select></div>
      <div class="ac-err" hidden></div>`,
      `<button class="btn ghost" onclick="acClose()">Keep order</button><button class="btn" id="acDo" onclick="acDoCancel('${oid}')">Cancel selected</button>`)
  }
  window.acDoCancel = async function (oid) {
    const ids = [...document.querySelectorAll('#acm .ac-chk input:checked')].map(x => x.value)
    if (!ids.length) return errIn('Select at least one item')
    busy('acDo', true, 'Cancelling…')
    try { swap(await rpc('customer_cancel', { p_order_id: oid, p_item_ids: ids, p_reason: $('acWhy').value })); acClose(); say('Cancelled') }
    catch (e) { busy('acDo', false, 'Cancel selected'); errIn(e.message) }
  }

  // change address / GST (only before the tax invoice — checked again in the database)
  const addrForm = (a = {}, pre = 'aa') => `
    ${(me?.addresses || []).length ? `<div class="fld"><label>SAVED ADDRESSES</label><select onchange="acFill(this.value,'${pre}')"><option value="">Choose…</option>${me.addresses.map(x => `<option value="${x.id}">${esc(x.label || x.name)} · ${esc(x.address.slice(0, 40))}, ${esc(x.city)}</option>`).join('')}</select></div>` : ''}
    <div class="f2"><div class="fld"><label>NAME</label><input id="${pre}N" value="${esc(a.name || a.customer_name || '')}"></div><div class="fld"><label>MOBILE</label><input id="${pre}P" maxlength="10" inputmode="numeric" value="${esc(a.phone || '')}"></div></div>
    <div class="fld"><label>ADDRESS</label><textarea id="${pre}A" rows="2">${esc(a.address || '')}</textarea></div>
    <div class="f2"><div class="fld"><label>CITY</label><input id="${pre}C" value="${esc(a.city || '')}"></div><div class="fld"><label>PINCODE</label><input id="${pre}Z" maxlength="6" inputmode="numeric" value="${esc(a.pincode || '')}"></div></div>
    <div class="fld"><label>STATE</label><select id="${pre}S"><option value="">Select state</option>${STATES.map(x => `<option${x === a.state ? ' selected' : ''}>${x}</option>`).join('')}</select></div>`
  const readAddr = pre => ({ name: $(pre + 'N').value.trim(), phone: $(pre + 'P').value.trim(), address: $(pre + 'A').value.trim(), city: $(pre + 'C').value.trim(), pincode: $(pre + 'Z').value.trim(), state: $(pre + 'S').value })
  window.acFill = function (id, pre) {
    const a = (me?.addresses || []).find(x => x.id === id); if (!a) return
    $(pre + 'N').value = a.name; $(pre + 'P').value = a.phone; $(pre + 'A').value = a.address; $(pre + 'C').value = a.city; $(pre + 'Z').value = a.pincode; $(pre + 'S').value = a.state
  }
  const gstForm = (co = '', g = '') => `<div class="fld"><label>BUSINESS NAME (as on GST)</label><input id="acCo" value="${esc(co)}"></div>
    <div class="fld"><label>GSTIN</label><input id="acGst" maxlength="15" style="text-transform:uppercase" value="${esc(g)}" placeholder="07ABCDE1234F1Z5"></div>`
  window.acEdit = function (oid, what) {
    const o = orders.find(x => x.id === oid)
    if (what === 'address') modal('Change delivery address', `<p class="mut sm">You can change this until the seller confirms the order and makes the tax invoice.</p>${addrForm(o)}<div class="ac-err" hidden></div>`,
      `<button class="btn ghost" onclick="acClose()">Close</button><button class="btn" id="acDo" onclick="acDoEdit('${oid}','address')">Save address</button>`)
    else modal('GST invoice details', `<p class="mut sm">Get a GST invoice in your business name to claim input tax credit. Leave both empty to remove.</p>${gstForm(o.company_name || me.company_name || '', o.gstin || me.gstin || '')}<div class="ac-err" hidden></div>`,
      `<button class="btn ghost" onclick="acClose()">Close</button><button class="btn" id="acDo" onclick="acDoEdit('${oid}','gst')">Save</button>`)
  }
  window.acDoEdit = async function (oid, what) {
    const p = what === 'address' ? { address: readAddr('aa') } : { business: { company: $('acCo').value.trim(), gstin: $('acGst').value.trim().toUpperCase() } }
    busy('acDo', true, 'Saving…')
    try { swap(await rpc('customer_update_order', { p_order_id: oid, p })); acClose(); say('Order updated') }
    catch (e) { busy('acDo', false, 'Save'); errIn(e.message) }
  }

  // returns
  const RET_WHY = ['Damaged or broken', 'Wrong item or colour', 'Not as described / poor quality', 'Missing parts', 'Doesn\'t fit my space', 'Changed my mind']
  let retFiles = []
  window.acReturn = function (oid, iid) {
    const o = orders.find(x => x.id === oid), i = o.items.find(x => x.id === iid); retFiles = []
    modal('Return item', `<div class="ac-ri"><div class="im">${i.image_url ? `<img src="${esc(i.image_url)}" alt="">` : ''}</div><div><b>${esc(i.name)}</b><div class="mut sm">Return by ${d8(i.return_until)}</div></div></div>
      <div class="fld"><label>REASON</label><select id="acRw">${RET_WHY.map(w => `<option>${w}</option>`).join('')}</select></div>
      <div class="fld"><label>DETAILS (optional)</label><textarea id="acRd" rows="2" placeholder="What's wrong? This helps us approve faster."></textarea></div>
      <div class="fld"><label>PHOTOS (up to 4, helps for damage)</label><input type="file" accept="image/*" multiple onchange="acPick(this)"><div id="acPh" class="ac-ph"></div></div>
      ${o.payment_method === 'cod' ? `<div class="fld"><label>YOUR UPI ID FOR THE REFUND</label><input id="acUpi" placeholder="name@okicici"></div>` : ''}
      <p class="mut sm">Refund: about ${rs(i.gross - (o.subtotal > 0 ? o.discount * i.gross / o.subtotal : 0))} once the item is picked up and checked. The seller replies within 48 hours.</p>
      <div class="ac-err" hidden></div>`,
      `<button class="btn ghost" onclick="acClose()">Close</button><button class="btn" id="acDo" onclick="acDoReturn('${oid}','${iid}')">Request return</button>`)
  }
  window.acPick = function (inp) {
    retFiles = [...inp.files].filter(f => /^image\//.test(f.type)).slice(0, 4)
    $('acPh').innerHTML = retFiles.map(f => `<img src="${URL.createObjectURL(f)}" alt="">`).join('')
  }
  async function shrink(file) {
    try {
      const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = URL.createObjectURL(file) })
      const k = Math.min(1, 1400 / Math.max(img.width, img.height)), c = document.createElement('canvas')
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      return await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.8))
    } catch (e) { return file }
  }
  window.acDoReturn = async function (oid, iid) {
    if ($('acUpi') && !/^[A-Za-z0-9._-]{2,}@[A-Za-z]{2,}$/.test($('acUpi').value.trim())) return errIn('Enter your UPI ID for the refund (e.g. name@okicici)')
    busy('acDo', true, 'Uploading…')
    try {
      const t = await token(), uid = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub, photos = []
      for (const f of retFiles) {
        const path = `${uid}/${iid}-${Date.now()}-${photos.length}.jpg`
        const r = await fetch(`${S().url}/storage/v1/object/returns/${path}`, { method: 'POST', headers: { apikey: S().anon, Authorization: 'Bearer ' + t, 'Content-Type': 'image/jpeg' }, body: await shrink(f) })
        if (!r.ok) throw new Error('Photo upload failed. Try smaller photos or skip them.')
        photos.push(path)
      }
      busy('acDo', true, 'Sending…')
      swap(await rpc('customer_request_return', { p_item_id: iid, p: { reason: $('acRw').value, details: $('acRd').value, photos, refund_upi: $('acUpi')?.value || null } }))
      acClose(); say('Return requested. We\'ll update you here.')
    } catch (e) { busy('acDo', false, 'Request return'); errIn(e.message) }
  }
  window.acCancelReturn = async function (rid) {
    if (!confirm('Withdraw this return request?')) return
    try { swap(await rpc('customer_cancel_return', { p_return_id: rid })) } catch (e) { say(e.message) }
  }

  // tax invoice (opens a printable page; "Save as PDF" from the print dialog)
  window.acInvoice = async function (oid, sid) {
    const w = window.open('', '_blank'); if (w) w.document.write('<p style="font-family:sans-serif;padding:20px">Loading invoice…</p>')
    try {
      const d = await rpc('customer_invoice', { p_order_id: oid, p_seller_id: sid }), o = d.order, s = d.seller, co = d.company || {}
      const live = d.lines.filter(l => !DEAD.includes(l.status)), lines = live.length ? live : d.lines
      const SC = { 'Jammu and Kashmir': '01', 'Himachal Pradesh': '02', 'Punjab': '03', 'Chandigarh': '04', 'Uttarakhand': '05', 'Haryana': '06', 'Delhi': '07', 'Rajasthan': '08', 'Uttar Pradesh': '09', 'Bihar': '10', 'Sikkim': '11', 'Arunachal Pradesh': '12', 'Nagaland': '13', 'Manipur': '14', 'Mizoram': '15', 'Tripura': '16', 'Meghalaya': '17', 'Assam': '18', 'West Bengal': '19', 'Jharkhand': '20', 'Odisha': '21', 'Chhattisgarh': '22', 'Madhya Pradesh': '23', 'Gujarat': '24', 'Dadra and Nagar Haveli and Daman and Diu': '26', 'Maharashtra': '27', 'Karnataka': '29', 'Goa': '30', 'Lakshadweep': '31', 'Kerala': '32', 'Tamil Nadu': '33', 'Puducherry': '34', 'Andaman and Nicobar Islands': '35', 'Telangana': '36', 'Andhra Pradesh': '37', 'Ladakh': '38' }
      const intra = (s.gstin || '').slice(0, 2) && (s.gstin || '').slice(0, 2) === SC[o.state]
      const m = n => (+n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      let tx = 0, gs = 0, tt = 0
      const rows = lines.map((l, i) => { const g = +l.gross - +l.taxable; tx += +l.taxable; gs += g; tt += +l.gross
        return `<tr><td>${i + 1}</td><td>${esc(l.name)}<br><small>${esc(l.sku)}</small></td><td>${esc(l.hsn || '—')}</td><td class=n>${l.qty}</td><td class=n>${m(l.taxable)}</td><td class=n>${+l.gst_pct}%</td>${intra ? `<td class=n>${m(g / 2)}</td><td class=n>${m(g / 2)}</td>` : `<td class=n>${m(g)}</td>`}<td class=n>${m(l.gross)}</td></tr>` }).join('')
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${esc(lines[0].invoice_no)}</title><style>
        body{font:13px/1.45 Arial,sans-serif;color:#222;max-width:820px;margin:24px auto;padding:0 16px}h1{font-size:20px;margin:0}small,.mut{color:#777}
        .top{display:flex;justify-content:space-between;gap:20px;margin-bottom:16px}.g{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}.box{border:1px solid #ddd;border-radius:8px;padding:10px}
        table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border-bottom:1px solid #e5e5e5;padding:6px;text-align:left;vertical-align:top}th{background:#F6F1E7}.n{text-align:right}.tot td{font-weight:700}
        .p{margin:16px 0}@media print{.p{display:none}}</style></head><body>
        <div class="p"><button onclick="print()">Print / Save as PDF</button></div>
        <div class="top"><div><img src="${location.origin}/img/outrr-logo.png?v=3" alt="outrr" style="height:28px;width:auto;display:block;margin-bottom:10px"><h1>Tax invoice</h1><span class="mut">Original for recipient</span></div><div style="text-align:right">Invoice <b>${esc(lines[0].invoice_no)}</b><br>Date ${d8(lines[0].confirmed_at || o.created_at)}<br>Order ${esc(o.order_no)}</div></div>
        <div class="g"><div class="box"><b>Sold by</b><br><b>${esc(s.legal_name || s.name)}</b><br>${esc(s.pickup_address || '')} ${esc(s.pickup_pincode || '')}<br>${s.gstin ? 'GSTIN ' + esc(s.gstin) : ''}${s.pan ? '<br>PAN ' + esc(s.pan) : ''}</div>
          <div class="box"><b>Bill to / ship to</b><br>${o.company_name ? `<b>${esc(o.company_name)}</b><br>` : ''}${esc(o.customer_name)}<br>${esc(o.address)}<br>${esc(o.city)}, ${esc(o.state)} ${esc(o.pincode)}${o.gstin ? `<br>GSTIN <b>${esc(o.gstin)}</b>` : ''}<br>Place of supply: ${esc(o.state)}${SC[o.state] ? ' (' + SC[o.state] + ')' : ''}</div></div>
        <table><thead><tr><th>#</th><th>Item</th><th>HSN</th><th class=n>Qty</th><th class=n>Taxable</th><th class=n>GST</th>${intra ? '<th class=n>CGST</th><th class=n>SGST</th>' : '<th class=n>IGST</th>'}<th class=n>Total</th></tr></thead>
        <tbody>${rows}<tr class="tot"><td colspan="4">Total</td><td class=n>${m(tx)}</td><td></td>${intra ? `<td class=n>${m(gs / 2)}</td><td class=n>${m(gs / 2)}</td>` : `<td class=n>${m(gs)}</td>`}<td class=n>${m(tt)}</td></tr></tbody></table>
        <p class="mut">Amounts include GST. Payment: ${o.payment_method === 'cod' ? 'Cash on delivery' : 'Prepaid'}.${+o.discount ? ' Coupon discounts are given by the marketplace and do not reduce this invoice.' : ''}</p>
        <p style="margin-top:30px">For ${esc(s.legal_name || s.name)}<br><small>Authorised signatory</small></p>
        <p class="mut" style="border-top:1px solid #eee;padding-top:8px">Sold through ${esc(co.brand_name || 'outrr')} (${esc(co.legal_name || '')}${co.gstin && !co.gstin_is_dummy ? ', GSTIN ' + esc(co.gstin) : ''}), an e-commerce operator. Computer-generated invoice.</p></body></html>`
      if (w) { w.document.open(); w.document.write(html); w.document.close() }
    } catch (e) { if (w) w.close(); say(e.message) }
  }

  // ---------------------------------------------------------------- addresses
  function drawAddresses() {
    const list = me.addresses || []
    $('acBody').innerHTML = `<div class="ac-grid">${list.map(a => `<div class="ac-card ac-addr">${a.is_default ? '<span class="ac-def">Default</span>' : ''}<b>${esc(a.label || a.name)}</b>
        <p>${esc(a.name)} · ${esc(a.phone)}<br>${esc(a.address)}<br>${esc(a.city)}, ${esc(a.state)} ${esc(a.pincode)}</p>
        <div class="ac-row"><a onclick="acAddr('${a.id}')">Edit</a>${a.is_default ? '' : `<a onclick="acAddrDefault('${a.id}')">Make default</a>`}<a class="red" onclick="acAddrDel('${a.id}')">Remove</a></div></div>`).join('')}
      <button class="ac-card ac-new" onclick="acAddr()">＋ Add an address</button></div>`
  }
  window.acAddr = function (id) {
    const a = (me.addresses || []).find(x => x.id === id) || { name: me.name || '', phone: me.phone || '' }
    modal(id ? 'Edit address' : 'New address', `<div class="fld"><label>LABEL (optional)</label><input id="adL" placeholder="Home, Office, Farmhouse…" value="${esc(a.label || '')}"></div>
      ${addrForm(a, 'ad').replace(/<div class="fld"><label>SAVED ADDRESSES[\s\S]*?<\/select><\/div>/, '')}
      <label class="ac-chk"><input type="checkbox" id="adD"${a.is_default ? ' checked' : ''}> Use as my default address</label><div class="ac-err" hidden></div>`,
      `<button class="btn ghost" onclick="acClose()">Close</button><button class="btn" id="acDo" onclick="acSaveAddr('${id || ''}')">Save</button>`)
  }
  window.acSaveAddr = async function (id) {
    busy('acDo', true, 'Saving…')
    try { me = await rpc('customer_save_address', { p: { id: id || null, label: $('adL').value, is_default: $('adD').checked, ...readAddr('ad') } }); acClose(); draw() }
    catch (e) { busy('acDo', false, 'Save'); errIn(e.message) }
  }
  window.acAddrDefault = async id => { const a = me.addresses.find(x => x.id === id); try { me = await rpc('customer_save_address', { p: { ...a, is_default: true } }); draw() } catch (e) { say(e.message) } }
  window.acAddrDel = async id => { if (!confirm('Remove this address?')) return; try { me = await rpc('customer_delete_address', { p_id: id }); draw() } catch (e) { say(e.message) } }

  // ---------------------------------------------------------------- profile + business details
  function drawProfile() {
    $('acBody').innerHTML = `<div class="ac-card ac-prof">
      <div class="f2"><div class="fld"><label>NAME</label><input id="prN" value="${esc(me.name || '')}"></div><div class="fld"><label>MOBILE</label><input id="prP" maxlength="10" inputmode="numeric" value="${esc(me.phone || '')}"></div></div>
      <div class="fld"><label>EMAIL (sign-in)</label><input value="${esc(me.email)}" disabled></div>
      <h3>Business / GST details</h3><p class="mut sm">Buying for a business, hotel, café or project? Add your GSTIN and we'll fill it in at checkout so your tax invoice carries it (input tax credit). You can change it on an order until the seller makes the invoice.</p>
      <div class="f2"><div class="fld"><label>BUSINESS NAME</label><input id="prC" value="${esc(me.company_name || '')}"></div><div class="fld"><label>GSTIN</label><input id="prG" maxlength="15" style="text-transform:uppercase" value="${esc(me.gstin || '')}"></div></div>
      <label class="ac-chk"><input type="checkbox" id="prW"${me.whatsapp_updates ? ' checked' : ''}> Order updates on WhatsApp</label>
      <div class="ac-err" hidden></div>
      <button class="btn" id="acDo" onclick="acSaveProfile()">Save</button></div>`
  }
  window.acSaveProfile = async function () {
    busy('acDo', true, 'Saving…')
    try { me = await rpc('customer_save_profile', { p: { name: $('prN').value, phone: $('prP').value, company_name: $('prC').value, gstin: $('prG').value.trim().toUpperCase(), whatsapp_updates: $('prW').checked } }); draw(); say('Saved') }
    catch (e) { busy('acDo', false, 'Save'); const x = document.querySelector('.ac-prof .ac-err'); x.textContent = e.message; x.hidden = false }
  }

  // ---------------------------------------------------------------- track without signing in
  window.acTrack = function (no = '', ph = '', err = '', res = null) {
    view(`<div class="pagetop"><span class="bk" onclick="showHome()">←</span><h2>Track your order</h2></div>
      <div class="ac-card ac-trk"><div class="f2"><div class="fld"><label>ORDER NUMBER</label><input id="tkO" placeholder="OR10002" value="${esc(no)}"></div>
        <div class="fld"><label>MOBILE USED FOR THE ORDER</label><input id="tkP" maxlength="10" inputmode="numeric" value="${esc(ph)}"></div></div>
        <button class="btn" id="tkGo" onclick="acDoTrack()">Track</button> ${sess ? '' : '<a class="sm" onclick="acOpen()">Sign in to cancel or return</a>'}
        ${err ? `<div class="ac-err">${esc(err)}</div>` : ''}</div>
      ${res ? orderCard(res, false) : ''}`)
  }
  window.acDoTrack = async function () {
    const no = $('tkO').value.trim(), ph = $('tkP').value.replace(/\D/g, '')
    if (!no || ph.length !== 10) return acTrack(no, ph, 'Enter the order number and the 10-digit mobile number')
    try { acTrack(no, ph, '', await rpc('track_order', { p_order_no: no, p_phone: ph }, false)) } catch (e) { acTrack(no, ph, e.message) }
  }

  // ---------------------------------------------------------------- checkout: saved address + GST invoice
  window.acCheckoutExtras = async function () {
    const box = $('coAcct'); if (!box) return
    if (!(await token())) { box.innerHTML = `<div class="secline"><a onclick="acOpen()">Sign in</a> to use saved addresses and track this order in My account.</div>`; return }
    try { me = me || await rpc('customer_me') } catch (e) { return }
    const list = me.addresses || []
    box.innerHTML = `${list.length ? `<div class="fld"><label>SAVED ADDRESSES</label><select onchange="acCoFill(this.value)"><option value="">Choose a saved address…</option>${list.map(a => `<option value="${a.id}">${esc(a.label || a.name)} · ${esc(a.address.slice(0, 40))}, ${esc(a.city)}</option>`).join('')}</select></div>` : ''}
      <div class="secline">Signed in as ${esc(me.email)} · this order will be in <a onclick="acOpen()">My account</a></div>`
    const em = $('coEm'); if (em && !em.value) em.value = me.email || ''
    const def = list.find(a => a.is_default); if (def && !$('coAd').value.trim()) acCoFill(def.id)
    if (me.gstin && $('coGstOn') && !$('coGstOn').checked) { $('coGstOn').checked = true; $('coCo').value = me.company_name || ''; $('coGst').value = me.gstin; acGstToggle() }
  }
  window.acCoFill = function (id) {
    const a = (me?.addresses || []).find(x => x.id === id); if (!a) return
    $('coName').value = a.name; $('coPh').value = a.phone; $('coAd').value = a.address; $('coCity').value = a.city; $('coPin').value = a.pincode; $('coState').value = a.state
  }
  window.acGstToggle = () => { const on = $('coGstOn').checked; $('coGstF').hidden = !on }

  // ---------------------------------------------------------------- entry points
  function paintHeader() {
    const svg = '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20 c1.5 -4 5 -5.5 8 -5.5 s6.5 1.5 8 5.5"/></svg>'
    document.querySelectorAll('.hd-right, .deskicons').forEach(h => {
      if (h.querySelector('.acicon')) return
      const b = document.createElement('div'); b.className = 'icobtn acicon'; b.title = 'My account'; b.innerHTML = svg; b.onclick = () => acOpen()
      h.insertBefore(b, h.firstChild)
    })
    paintIcon()
  }
  document.addEventListener('DOMContentLoaded', paintHeader); if (document.readyState !== 'loading') paintHeader()
  const qs = new URLSearchParams(location.search)
  if (qs.has('account') || location.hash === '#account') setTimeout(() => acOpen(), 300)
  if (qs.has('wishlist')) setTimeout(() => acWishlist(), 400)
  if (qs.has('track') || location.hash === '#track') setTimeout(() => acTrack(qs.get('track') || ''), 300)
})()
