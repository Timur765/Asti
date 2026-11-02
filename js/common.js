/* ASTI — общая логика витрины: данные, шапка, подвал, корзина, оформление заказа */
(function () {
  'use strict';
  const cfg = window.ASTI_CONFIG || {};
  const TG = cfg.TELEGRAM_URL || 'https://t.me/ast1_shop';

  const CATEGORIES = [
    { slug: 'jackets', name: 'Куртки и пуховики' },
    { slug: 'tshirts', name: 'Футболки' },
    { slug: 'polo', name: 'Поло' },
    { slug: 'zip', name: 'Зипки' },
    { slug: 'hoodies', name: 'Худи' },
    { slug: 'sweaters', name: 'Свитера' },
    { slug: 'jeans', name: 'Джинсы' },
    { slug: 'pants', name: 'Брюки' },
    { slug: 'shorts', name: 'Шорты' },
    { slug: 'shirts', name: 'Рубашки' },
    { slug: 'suits', name: 'Костюмы' },
    { slug: 'shoes', name: 'Обувь' },
    { slug: 'hats', name: 'Головные уборы' },
    { slug: 'bags', name: 'Сумки и аксессуары' },
  ];
  const AV_LABEL = { in: 'В наличии', preorder: 'Предзаказ', out: 'Нет в наличии', pending: 'Уточняется' };
  const PH = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><rect width="300" height="400" fill="#ece6db"/><text x="150" y="210" text-anchor="middle" font-family="Arial" font-weight="600" font-size="30" letter-spacing="10" fill="#c5bfb2">ASTI</text></svg>');

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
  const catName = (slug) => (CATEGORIES.find((c) => c.slug === slug) || {}).name || 'Pinduoduo';

  /* ───── Supabase ───── */
  const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !/YOUR-/.test(cfg.SUPABASE_URL + cfg.SUPABASE_ANON_KEY);
  let sb = null;
  if (configured && window.supabase) {
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  }
  let cache = null;
  async function getProducts(force) {
    if (cache && !force) return cache;
    if (!sb) throw new Error('not_configured');
    const { data, error } = await sb.from('products').select('*').eq('is_published', true)
      .order('created_at', { ascending: false }).order('name', { ascending: true });
    if (error) throw error;
    cache = data || [];
    return cache;
  }

  /* ───── Вспомогательные функции товара ───── */
  function availability(p) {
    if (p.is_external) return 'pending';
    if (p.status === 'preorder') return 'preorder';
    if (p.status === 'out_of_stock' || !(p.stock > 0)) return 'out';
    return 'in';
  }
  function priceHtml(p) {
    if (p.price == null) return '<span class="price price--na">Цена уточняется</span>';
    const old = p.old_price && p.old_price > p.price ? `<s>${money(p.old_price)}</s>` : '';
    return `<span class="price">${money(p.price)}${old}</span>`;
  }
  function cardHtml(p) {
    const av = availability(p);
    const imgs = p.images || [];
    const tags = [];
    if (p.is_new && !p.is_external) tags.push('<span class="tag tag--dark">Новинка</span>');
    if (av === 'preorder') tags.push('<span class="tag tag--pre">Предзаказ</span>');
    if (av === 'out') tags.push('<span class="tag tag--out">Нет в наличии</span>');
    if (av === 'pending') tags.push('<span class="tag tag--pdd">Фото и характеристики уточняются</span>');
    const media = imgs.length
      ? `<div class="card__img"><img src="${esc(imgs[0])}" alt="${esc(p.name)}" loading="lazy" decoding="async">${imgs[1] ? `<img src="${esc(imgs[1])}" alt="" loading="lazy" decoding="async">` : ''}</div>`
      : `<div class="card__img ph"><span>ASTI</span></div>`;
    return `<a class="card reveal ${av === 'out' ? 'is-out' : ''}" href="product.html?id=${encodeURIComponent(p.id)}">
      ${media}<div class="card__tags">${tags.join('')}</div>
      <div class="card__body"><div class="card__cat">${esc(p.is_external ? 'Pinduoduo' : catName(p.category))}</div>
      <h3 class="card__name">${esc(p.name)}</h3>${priceHtml(p)}</div></a>`;
  }

  /* ───── Toast ───── */
  let toastT;
  function toast(msg) {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg;
    requestAnimationFrame(() => t.classList.add('on'));
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('on'), 2600);
  }

  /* ───── Появление при прокрутке ───── */
  let io;
  function reveal(root = document) {
    const els = $$('.reveal:not(.in)', root);
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    io = io || new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    els.forEach((e) => io.observe(e));
  }

  /* ───── Корзина ───── */
  const CART_KEY = 'asti_cart_v1';
  const cartGet = () => { try { const c = JSON.parse(localStorage.getItem(CART_KEY)); return Array.isArray(c) ? c : []; } catch { return []; } };
  function cartSet(c) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(c)); } catch {}
    badge();
    if (drawerOpen) renderDrawer();
  }
  function badge() {
    const n = cartGet().reduce((s, i) => s + i.qty, 0);
    $$('.cnt').forEach((b) => { b.textContent = n; b.classList.toggle('on', n > 0); });
  }
  function maxQty(p) { return p.status === 'in_stock' && !p.is_external ? Math.max(1, p.stock) : 99; }
  function cartAdd(p, size, color, qty) {
    const c = cartGet();
    const hit = c.find((i) => i.id === p.id && (i.size || '') === (size || '') && (i.color || '') === (color || ''));
    if (hit) hit.qty = Math.min(maxQty(p), hit.qty + qty);
    else c.push({ id: p.id, size: size || '', color: color || '', qty: Math.min(maxQty(p), qty), name: p.name, price: p.price, image: (p.images || [])[0] || '', ext: !!p.is_external, max: maxQty(p) });
    cartSet(c);
  }

  /* ───── Шапка, меню, подвал, корзина ───── */
  const ICON = {
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>',
    bag: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>',
    menu: '<svg viewBox="0 0 24 24"><path d="M3 8h18M3 16h18"/></svg>',
  };
  function shell() {
    const page = document.body.dataset.page || '';
    const h = $('#site-header');
    if (h) h.innerHTML = `
      ${configured ? '' : '<div class="setup">Магазин ещё не подключён к базе данных: заполните <b>js/config.js</b> (см. README).</div>'}
      <header class="hdr"><div class="wrap hdr__in">
        <button class="ib burger" aria-label="Меню" data-menu>${ICON.menu}</button>
        <a class="logo" href="index.html" aria-label="ASTI — главная">ASTI</a>
        <nav class="nav" aria-label="Основная навигация">
          <a href="catalog.html">Каталог</a><a href="index.html#new">Новинки</a><a href="index.html#about">О магазине</a><a href="${TG}" target="_blank" rel="noopener">Telegram</a>
        </nav>
        <div class="hdr__act">
          <a class="ib" href="catalog.html?focus=1" aria-label="Поиск">${ICON.search}</a>
          <button class="ib" aria-label="Корзина" data-cart>${ICON.bag}<span class="cnt">0</span></button>
        </div></div></header>
      <div class="mnav" id="mnav" aria-hidden="true">
        <div class="mnav__top"><a class="logo" href="index.html">ASTI</a><button class="ib" data-menu aria-label="Закрыть"><svg viewBox="0 0 24 24" style="width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:1.5"><path d="m5 5 14 14M19 5 5 19"/></svg></button></div>
        <a class="big" href="catalog.html">Каталог</a><a class="big" href="index.html#new">Новинки</a><a class="big" href="index.html#about">О магазине</a>
        <a class="big" href="${TG}" target="_blank" rel="noopener">Telegram</a>
        <div class="cats">${CATEGORIES.map((c) => `<a href="catalog.html?cat=${c.slug}">${esc(c.name)}</a>`).join('')}</div>
      </div>`;
    const f = $('#site-footer');
    if (f) f.innerHTML = `<footer class="ftr"><div class="wrap">
      <div class="ftr__g">
        <div><a class="logo" href="index.html">ASTI</a><p style="margin-top:14px;color:#666;max-width:300px;font-size:14px">Интернет-магазин одежды, обуви и аксессуаров.</p></div>
        <div><h4>Магазин</h4><ul><li><a href="catalog.html">Каталог</a></li><li><a href="index.html#new">Новинки</a></li><li><a href="index.html#about">О магазине</a></li></ul></div>
        <div><h4>Связаться</h4><ul><li><a href="${TG}" target="_blank" rel="noopener">Telegram: @ast1_shop</a></li></ul></div>
      </div><small>© ${new Date().getFullYear()} ASTI. Все права защищены.</small></div></footer>`;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="ovl" id="ovl"></div>
      <aside class="drawer" id="drawer" aria-hidden="true" aria-label="Корзина">
        <div class="drawer__hd"><h3 id="dTitle">Корзина</h3><button class="ib" data-close aria-label="Закрыть"><svg viewBox="0 0 24 24"><path d="m5 5 14 14M19 5 5 19"/></svg></button></div>
        <div class="drawer__body" id="dBody"></div><div class="drawer__ft" id="dFt"></div>
      </aside>`);
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-menu]');
      if (t) { const m = $('#mnav'); const open = !m.classList.contains('open'); m.classList.toggle('open', open); document.body.style.overflow = open ? 'hidden' : ''; return; }
      if (e.target.closest('[data-cart]')) { openDrawer('cart'); return; }
      if (e.target.closest('[data-close]') || e.target.id === 'ovl') closeDrawer();
      if (e.target.closest('.mnav a')) { $('#mnav').classList.remove('open'); document.body.style.overflow = ''; }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
    badge();
    window.addEventListener('storage', badge);
  }

  /* ───── Drawer: корзина → оформление → готово ───── */
  let drawerOpen = false, view = 'cart', lastOrderText = '', doneNumber = '';
  function openDrawer(v) {
    view = v || 'cart';
    drawerOpen = true;
    $('#drawer').classList.add('open'); $('#drawer').setAttribute('aria-hidden', 'false'); $('#ovl').classList.add('on');
    document.body.style.overflow = 'hidden';
    renderDrawer();
    syncCart();
  }
  function closeDrawer() {
    if (!drawerOpen) return;
    drawerOpen = false;
    $('#drawer').classList.remove('open'); $('#drawer').setAttribute('aria-hidden', 'true'); $('#ovl').classList.remove('on');
    document.body.style.overflow = '';
  }
  // подтягиваем актуальные цены/наличие из базы
  async function syncCart() {
    if (!sb) return;
    try {
      const prods = await getProducts(true);
      const map = new Map(prods.map((p) => [p.id, p]));
      let removed = 0;
      const next = [];
      for (const i of cartGet()) {
        const p = map.get(i.id);
        if (!p || availability(p) === 'out') { removed++; continue; }
        next.push({ ...i, name: p.name, price: p.price, image: (p.images || [])[0] || '', ext: !!p.is_external, max: maxQty(p), qty: Math.min(i.qty, maxQty(p)) });
      }
      if (JSON.stringify(next) !== JSON.stringify(cartGet())) cartSet(next);
      if (removed) toast('Часть товаров больше недоступна и удалена из корзины');
    } catch {}
  }
  function totals(c) {
    let sum = 0, unpriced = 0;
    c.forEach((i) => { if (i.price == null || i.ext) unpriced += 1; else sum += i.price * i.qty; });
    return { sum, unpriced };
  }
  function renderDrawer() {
    const body = $('#dBody'), ft = $('#dFt'), title = $('#dTitle');
    const c = cartGet();
    if (view === 'cart') {
      title.textContent = 'Корзина';
      if (!c.length) {
        body.innerHTML = '<div class="msg"><b>Корзина пуста</b><p>Добавьте что-нибудь из каталога.</p><a class="btn btn--line" href="catalog.html" data-close>Перейти в каталог</a></div>';
        ft.innerHTML = ''; ft.style.display = 'none'; return;
      }
      ft.style.display = '';
      body.innerHTML = c.map((i, idx) => `<div class="ci">
        ${i.image ? `<img src="${esc(i.image)}" alt="">` : '<div class="ph"></div>'}
        <div><div class="ci__n">${esc(i.name)}</div>
        <div class="ci__m">${[i.size && 'Размер ' + esc(i.size), esc(i.color)].filter(Boolean).join(' · ') || '&nbsp;'}</div>
        <div class="ci__r"><div class="qty"><button data-q="${idx}:-1" aria-label="Меньше">−</button><output>${i.qty}</output><button data-q="${idx}:1" aria-label="Больше">+</button></div>
        <span class="price">${i.price == null || i.ext ? '<span class="price--na">уточняется</span>' : money(i.price * i.qty)}</span></div>
        <button class="ci__x" data-rm="${idx}" style="margin-top:10px">Удалить</button></div></div>`).join('');
      const t = totals(c);
      ft.innerHTML = `<div class="sum"><span>Итого</span><span>${money(t.sum)}${t.unpriced ? `<small>+ ${t.unpriced} поз. с уточняемой ценой</small>` : ''}</span></div>
        <button class="btn btn--block" data-go="checkout">Оформить заказ</button>`;
    } else if (view === 'checkout') {
      title.textContent = 'Оформление';
      const saved = (() => { try { return JSON.parse(localStorage.getItem('asti_cust')) || {}; } catch { return {}; } })();
      body.innerHTML = `<button class="back" data-go="cart">← В корзину</button>
        <form id="coForm" novalidate>
          <label class="fld"><span>Имя *</span><input name="name" autocomplete="name" required maxlength="80" value="${esc(saved.name)}"></label>
          <label class="fld"><span>Телефон *</span><input name="phone" type="tel" autocomplete="tel" inputmode="tel" required maxlength="30" placeholder="+7" value="${esc(saved.phone)}"></label>
          <label class="fld"><span>Telegram (необязательно)</span><input name="telegram" maxlength="40" placeholder="@username" value="${esc(saved.telegram)}"></label>
          <label class="fld"><span>Город и адрес доставки *</span><textarea name="address" rows="2" required maxlength="300" autocomplete="street-address">${esc(saved.address)}</textarea></label>
          <label class="fld"><span>Комментарий</span><textarea name="comment" rows="2" maxlength="500"></textarea></label>
          <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
          <p class="err" id="coErr" role="alert"></p>
        </form>
        <p style="font-size:12px;color:#777;margin:6px 0 14px">Нажимая «Отправить заказ», вы соглашаетесь на обработку указанных данных для связи по заказу. Менеджер свяжется с вами в Telegram или по телефону для подтверждения наличия, оплаты и доставки.</p>`;
      const t = totals(c);
      ft.innerHTML = `<div class="sum"><span>Итого</span><span>${money(t.sum)}${t.unpriced ? `<small>+ ${t.unpriced} поз. с уточняемой ценой</small>` : ''}</span></div>
        <button class="btn btn--block" id="coSend">Отправить заказ</button>`;
    } else if (view === 'done') {
      title.textContent = 'Заказ отправлен';
      body.innerHTML = `<div class="msg"><b>Спасибо!</b><p>Заказ №${esc(doneNumber)} отправлен в Telegram магазина. Мы свяжемся с вами для подтверждения.</p><button class="btn btn--line" data-close>Продолжить покупки</button></div>`;
      ft.innerHTML = ''; ft.style.display = 'none';
    } else if (view === 'fail') {
      title.textContent = 'Заказ';
      body.innerHTML = `<div class="msg"><b>Не удалось отправить автоматически</b><p>Нажмите кнопку ниже: текст заказа будет скопирован, а Telegram магазина откроется — просто вставьте сообщение в чат.</p>
        <button class="btn btn--block" id="coFallback">Скопировать и открыть Telegram</button><p class="back" style="margin-top:18px"><a href="#" data-go="checkout">← Назад к форме</a></p></div>`;
      ft.innerHTML = ''; ft.style.display = 'none';
    }
  }
  function orderText(c, f) {
    const t = totals(c);
    const lines = c.map((i) => `• ${i.name}${i.size ? ', размер ' + i.size : ''}${i.color ? ', ' + i.color : ''} — ${i.qty} шт.` + (i.price != null && !i.ext ? ` × ${money(i.price)}` : ' (цена уточняется)'));
    return ['Новый заказ ASTI', '', ...lines, '', 'Итого: ' + money(t.sum) + (t.unpriced ? ` (+ ${t.unpriced} поз. с уточняемой ценой)` : ''), '',
      'Имя: ' + f.name, 'Телефон: ' + f.phone, f.telegram ? 'Telegram: ' + f.telegram : '', 'Адрес: ' + f.address, f.comment ? 'Комментарий: ' + f.comment : ''].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
  }
  async function submitOrder() {
    const form = $('#coForm'), err = $('#coErr'), btn = $('#coSend');
    const fd = Object.fromEntries(new FormData(form).entries());
    const f = { name: (fd.name || '').trim(), phone: (fd.phone || '').trim(), telegram: (fd.telegram || '').trim(), address: (fd.address || '').trim(), comment: (fd.comment || '').trim() };
    err.textContent = '';
    if (!f.name) return (err.textContent = 'Укажите имя.');
    if (f.phone.replace(/\D/g, '').length < 7) return (err.textContent = 'Укажите корректный телефон.');
    if (!f.address) return (err.textContent = 'Укажите город и адрес доставки.');
    const c = cartGet();
    lastOrderText = orderText(c, f);
    try { localStorage.setItem('asti_cust', JSON.stringify({ name: f.name, phone: f.phone, telegram: f.telegram, address: f.address })); } catch {}
    btn.disabled = true; btn.textContent = 'Отправляем…';
    try {
      const r = await fetch('/api/order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: c.map(({ id, size, color, qty }) => ({ id, size, color, qty })), customer: f, website: fd.website || '' }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { doneNumber = j.number; cartSet([]); view = 'done'; renderDrawer(); return; }
      if (r.status === 409 || r.status === 400) {
        btn.disabled = false; btn.textContent = 'Отправить заказ';
        const m = { out_of_stock: `«${j.name || 'Товар'}» закончился.`, not_enough_stock: `Для «${j.name || 'товара'}» доступно только ${j.stock} шт.`, product_unavailable: 'Один из товаров больше недоступен.', size_required: `Выберите размер для «${j.name || 'товара'}».` };
        err.textContent = m[j.error] || 'Проверьте данные заказа.';
        syncCart(); return;
      }
      throw new Error('send_failed');
    } catch (e) { view = 'fail'; renderDrawer(); }
  }
  document.addEventListener('click', (e) => {
    if (!drawerOpen) return;
    const q = e.target.closest('[data-q]'), rm = e.target.closest('[data-rm]'), go = e.target.closest('[data-go]');
    if (q) {
      const [idx, d] = q.dataset.q.split(':').map(Number); const c = cartGet();
      if (c[idx]) { c[idx].qty = Math.max(1, Math.min(c[idx].max || 99, c[idx].qty + d)); if (d > 0 && c[idx].qty === (c[idx].max || 99)) toast('Больше нет в наличии'); cartSet(c); }
    } else if (rm) { const c = cartGet(); c.splice(+rm.dataset.rm, 1); cartSet(c); }
    else if (go) { e.preventDefault(); view = go.dataset.go; renderDrawer(); }
    else if (e.target.id === 'coSend') submitOrder();
    else if (e.target.id === 'coFallback') {
      (navigator.clipboard ? navigator.clipboard.writeText(lastOrderText) : Promise.reject()).catch(() => {}).finally(() => { toast('Текст заказа скопирован'); window.open(TG, '_blank', 'noopener'); });
    }
  });

  /* ───── Подсказка «Добавить на главный экран» для iPhone ───── */
  function iosHint() {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
    let seen = false; try { seen = localStorage.getItem('asti_a2hs') === '1'; } catch {}
    if (!ios || standalone || seen || document.body.dataset.page === 'admin') return;
    setTimeout(() => {
      const d = document.createElement('div'); d.className = 'a2hs';
      d.innerHTML = '<span>Установите ASTI на экран «Домой»: нажмите <b>«Поделиться»</b> → <b>«На экран “Домой”»</b></span><button aria-label="Закрыть">×</button>';
      d.querySelector('button').onclick = () => { d.remove(); try { localStorage.setItem('asti_a2hs', '1'); } catch {} };
      document.body.appendChild(d);
    }, 4000);
  }

  /* ───── Service Worker ───── */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  window.ASTI = { cfg, sb, configured, CATEGORIES, AV_LABEL, PH, TG, $, $$, esc, money, catName, getProducts, availability, priceHtml, cardHtml, toast, reveal, cartAdd, cartGet, openDrawer, closeDrawer, badge };
  document.addEventListener('DOMContentLoaded', () => { shell(); iosHint(); reveal(); });
})();
