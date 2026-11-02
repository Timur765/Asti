/* ASTI — админ-панель. Доступ защищён Supabase Auth + политиками RLS:
   даже если кто-то подделает интерфейс, база разрешит запись только пользователям из таблицы admins. */
document.addEventListener('DOMContentLoaded', async () => {
  const { sb, $, $$, esc, money, CATEGORIES, catName, toast, configured } = ASTI;
  const root = $('#adm');
  const BUCKET = 'products';
  const STATUSES = [['in_stock', 'В наличии'], ['preorder', 'Предзаказ'], ['out_of_stock', 'Нет в наличии']];

  if (!configured || !sb) {
    root.innerHTML = '<div class="login"><a class="logo" href="index.html">ASTI</a><p class="s">Подключите базу данных: заполните <b>js/config.js</b> (см. README).</p></div>';
    return;
  }

  let products = [];
  let filter = { q: '', cat: '' };

  /* ───── Вход ───── */
  function showLogin(msg) {
    root.innerHTML = `<form class="login" id="lf" novalidate>
      <a class="logo" href="index.html">ASTI</a><p class="s">Вход в админ-панель</p>
      <label class="fld"><span>Email</span><input name="email" type="email" autocomplete="username" required></label>
      <label class="fld"><span>Пароль</span><input name="password" type="password" autocomplete="current-password" required></label>
      <p class="err" id="lerr" role="alert">${esc(msg || '')}</p>
      <button class="btn btn--block" style="margin-top:14px">Войти</button></form>`;
    $('#lf').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target), btn = e.target.querySelector('button');
      btn.disabled = true;
      const { error } = await sb.auth.signInWithPassword({ email: String(f.get('email')).trim(), password: String(f.get('password')) });
      if (error) { $('#lerr').textContent = 'Неверный email или пароль.'; btn.disabled = false; return; }
      boot();
    });
  }
  async function isAdmin() {
    const { data, error } = await sb.from('admins').select('user_id').maybeSingle();
    return !error && !!data;
  }
  async function boot() {
    const { data } = await sb.auth.getSession();
    if (!data.session) return showLogin();
    if (!(await isAdmin())) { await sb.auth.signOut(); return showLogin('У этой учётной записи нет прав администратора.'); }
    await loadProducts();
    showApp(data.session.user.email);
  }
  sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') showLogin(); });

  /* ───── Список товаров ───── */
  async function loadProducts() {
    const { data, error } = await sb.from('products').select('*').order('created_at', { ascending: false }).order('name');
    if (error) { toast('Ошибка загрузки: ' + error.message); return; }
    products = data || [];
  }
  function showApp(email) {
    root.innerHTML = `
      <div class="adm__top"><div><h1>Товары</h1><small>${esc(email || '')}</small></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn--line btn--sm" href="index.html" target="_blank">Открыть магазин</a><button class="btn btn--line btn--sm" id="out">Выйти</button></div></div>
      <div class="tools">
        <label class="search"><span class="sr">Поиск</span><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><input id="aq" type="search" placeholder="Поиск товара"></label>
        <select class="sel" id="acat"><option value="">Все категории</option>${CATEGORIES.map((c) => `<option value="${c.slug}">${esc(c.name)}</option>`).join('')}<option value="__ext">Pinduoduo</option><option value="__none">Без категории</option></select>
        <button class="btn btn--sm" id="addp">+ Добавить товар</button></div>
      <div class="plist" id="plist"></div>`;
    $('#out').onclick = () => sb.auth.signOut();
    $('#aq').oninput = (e) => { filter.q = e.target.value.toLowerCase(); renderList(); };
    $('#acat').onchange = (e) => { filter.cat = e.target.value; renderList(); };
    $('#addp').onclick = () => openEditor(null);
    renderList();
  }
  function renderList() {
    const list = products.filter((p) => {
      if (filter.q && !p.name.toLowerCase().includes(filter.q)) return false;
      if (filter.cat === '__ext') return p.is_external;
      if (filter.cat === '__none') return !p.category && !p.is_external;
      return !filter.cat || p.category === filter.cat;
    });
    $('#plist').innerHTML = `<div class="prow prow--hd"><span></span><span>Товар</span><span>Цена, ₽</span><span>Остаток</span><span>Статус</span><span>Показ</span><span></span></div>` +
      (list.length ? list.map((p) => `<div class="prow" data-id="${p.id}">
        ${p.images && p.images[0] ? `<img src="${esc(p.images[0])}" alt="">` : '<div class="th"></div>'}
        <div class="nm"><b>${esc(p.name)}</b><small>${esc(p.is_external ? 'Pinduoduo' : p.category ? catName(p.category) : 'Без категории')}${p.is_new ? ' · Новинка' : ''}${p.is_popular ? ' · Популярное' : ''}</small></div>
        <div class="cells">
          <label><small>Цена, ₽</small><input type="number" min="0" step="1" data-f="price" value="${p.price ?? ''}" placeholder="—"></label>
          <label><small>Остаток</small><input type="number" min="0" step="1" data-f="stock" value="${p.stock}"></label>
          <label><small>Статус</small><select data-f="status">${STATUSES.map(([v, l]) => `<option value="${v}" ${p.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label class="pub"><input type="checkbox" data-f="is_published" ${p.is_published ? 'checked' : ''}> на сайте</label>
        </div>
        <div class="act"><button data-edit>Изменить</button><button class="del" data-del>Удалить</button></div></div>`).join('')
        : '<div class="empty"><b>Товаров нет</b>Нажмите «Добавить товар».</div>');
  }
  root.addEventListener('change', async (e) => {
    const f = e.target.dataset && e.target.dataset.f; if (!f) return;
    const row = e.target.closest('.prow'), id = row.dataset.id;
    let v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (f === 'price') { v = v === '' ? null : Math.max(0, Math.round(+v)); }
    if (f === 'stock') { v = Math.max(0, Math.round(+v) || 0); e.target.value = v; }
    const { error } = await sb.from('products').update({ [f]: v }).eq('id', id);
    if (error) { toast('Ошибка: ' + error.message); await loadProducts(); renderList(); return; }
    const p = products.find((x) => x.id === id); if (p) p[f] = v;
    toast('Сохранено');
  });
  root.addEventListener('click', async (e) => {
    const row = e.target.closest('.prow'); if (!row || !row.dataset.id) return;
    const p = products.find((x) => x.id === row.dataset.id);
    if (e.target.closest('[data-edit]')) openEditor(p);
    if (e.target.closest('[data-del]')) {
      if (!confirm(`Удалить «${p.name}»? Это действие нельзя отменить.`)) return;
      const { error } = await sb.from('products').delete().eq('id', p.id);
      if (error) return toast('Ошибка: ' + error.message);
      await removeFiles(p.images || []);
      products = products.filter((x) => x.id !== p.id); renderList(); toast('Товар удалён');
    }
  });

  /* ───── Хранилище изображений ───── */
  const pathFromUrl = (u) => { const m = String(u).split(`/storage/v1/object/public/${BUCKET}/`)[1]; return m ? decodeURIComponent(m.split('?')[0]) : null; };
  async function removeFiles(urls) {
    const paths = urls.map(pathFromUrl).filter(Boolean);
    if (paths.length) await sb.storage.from(BUCKET).remove(paths);
  }
  async function compress(file) {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const max = 1800, k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(bmp, 0, 0, c.width, c.height);
    return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('compress'))), 'image/jpeg', 0.86));
  }
  async function uploadImage(file) {
    const blob = await compress(file);
    const path = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.jpg`;
    const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
    if (error) throw error;
    return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  /* ───── Редактор товара ───── */
  const dlg = $('#ed');
  let E = null;
  function openEditor(p) {
    E = {
      id: p ? p.id : null,
      images: p ? [...(p.images || [])] : [],
      colors: p ? (p.colors || []).map((c) => ({ ...c })) : [],
      original: p ? [...(p.images || [])] : [],
      uploaded: [], busy: 0,
    };
    const v = p || { name: '', description: '', category: '', price: '', old_price: '', stock: 0, status: 'in_stock', sizes: [], is_new: false, is_popular: false, is_published: true, is_external: false, external_url: '' };
    dlg.innerHTML = `<form id="ef" novalidate>
      <div class="ed__hd"><h3>${p ? 'Редактирование' : 'Новый товар'}</h3><button type="button" class="ib" data-x aria-label="Закрыть"><svg viewBox="0 0 24 24"><path d="m5 5 14 14M19 5 5 19"/></svg></button></div>
      <div class="ed__bd">
        <label class="fld"><span>Название *</span><input name="name" required maxlength="200" value="${esc(v.name)}"></label>
        <div class="row2">
          <label class="fld"><span>Категория</span><select name="category"><option value="">— без категории —</option>${CATEGORIES.map((c) => `<option value="${c.slug}" ${v.category === c.slug ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
          <label class="fld"><span>Статус</span><select name="status">${STATUSES.map(([k, l]) => `<option value="${k}" ${v.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        </div>
        <div class="row2">
          <label class="fld"><span>Цена, ₽</span><input name="price" type="number" min="0" step="1" inputmode="numeric" value="${v.price ?? ''}" placeholder="пусто = цена уточняется"></label>
          <label class="fld"><span>Старая цена, ₽</span><input name="old_price" type="number" min="0" step="1" inputmode="numeric" value="${v.old_price ?? ''}"><small>Показывается зачёркнутой, если больше цены</small></label>
        </div>
        <label class="fld"><span>Остаток, шт.</span><input name="stock" type="number" min="0" step="1" inputmode="numeric" value="${v.stock}"></label>
        <label class="fld"><span>Описание</span><textarea name="description" rows="4">${esc(v.description)}</textarea></label>
        <label class="fld"><span>Размеры</span><input name="sizes" value="${esc((v.sizes || []).join(', '))}" placeholder="S, M, L, XL"><small>Через запятую или пробел</small></label>
        <div class="presets"><button type="button" data-preset="XS,S,M,L,XL,XXL">Одежда XS–XXL</button><button type="button" data-preset="36,37,38,39,40,41,42,43,44,45,46">Обувь 36–46</button><button type="button" data-preset="ONE SIZE">One size</button><button type="button" data-preset="">Очистить</button></div>
        <h5>Цвета</h5><div id="crows"></div><button type="button" class="btn btn--line btn--sm" data-addcolor>+ Цвет</button>
        <h5>Фотографии</h5>
        <div class="imgs" id="imgs"></div>
        <label class="drop">Нажмите, чтобы выбрать фото (JPG, PNG, WebP)<input id="file" type="file" accept="image/*" multiple hidden></label>
        <div class="checks">
          <label class="opt"><input type="checkbox" name="is_new" ${v.is_new ? 'checked' : ''}> Новинка</label>
          <label class="opt"><input type="checkbox" name="is_popular" ${v.is_popular ? 'checked' : ''}> Популярный</label>
          <label class="opt"><input type="checkbox" name="is_published" ${v.is_published ? 'checked' : ''}> Показывать на сайте</label>
        </div>
        <label class="opt"><input type="checkbox" name="is_external" ${v.is_external ? 'checked' : ''}> Карточка Pinduoduo («Фото и характеристики уточняются»)</label>
        <label class="fld" id="extUrl" ${v.is_external ? '' : 'hidden'}><span>Ссылка Pinduoduo</span><input name="external_url" type="url" value="${esc(v.external_url || '')}"></label>
        <p class="err" id="eerr" role="alert"></p>
      </div>
      <div class="ed__ft"><button type="button" class="btn btn--line" data-x>Отмена</button><button class="btn" id="esave">Сохранить</button></div></form>`;
    renderColors(); renderImgs();
    if (!dlg.open) dlg.showModal();
  }
  function renderColors() {
    $('#crows').innerHTML = E.colors.map((c, i) => `<div class="crow"><input type="text" data-cn="${i}" value="${esc(c.name)}" placeholder="Название цвета"><input type="color" data-ch="${i}" value="${/^#[0-9a-f]{6}$/i.test(c.hex) ? c.hex : '#111111'}"><button type="button" data-cx="${i}" aria-label="Удалить">×</button></div>`).join('');
  }
  function renderImgs() {
    $('#imgs').innerHTML = E.images.map((u, i) => `<div><img src="${esc(u)}" alt="">${i === 0 ? '<b>Главное</b>' : ''}<span class="ctl">${i > 0 ? `<button type="button" data-main="${i}" title="Сделать главным">★</button>` : ''}<button type="button" data-ix="${i}" title="Убрать">×</button></span></div>`).join('') +
      (E.busy ? `<div class="up">Загрузка… ${E.busy}</div>` : '');
  }
  async function closeEditor(saved) {
    if (!saved && E && E.uploaded.length) await removeFiles(E.uploaded); // убираем загруженное, но не сохранённое
    dlg.close();
  }
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeEditor(false); });
  dlg.addEventListener('click', async (e) => {
    if (e.target.closest('[data-x]')) return closeEditor(false);
    const t = e.target;
    if (t.dataset.preset !== undefined && t.closest('.presets')) { dlg.querySelector('[name=sizes]').value = t.dataset.preset.split(',').filter(Boolean).join(', '); }
    if (t.closest('[data-addcolor]')) { E.colors.push({ name: '', hex: '#111111' }); renderColors(); }
    const cx = t.closest('[data-cx]'); if (cx) { E.colors.splice(+cx.dataset.cx, 1); renderColors(); }
    const ix = t.closest('[data-ix]'); if (ix) { E.images.splice(+ix.dataset.ix, 1); renderImgs(); }
    const mn = t.closest('[data-main]'); if (mn) { const [im] = E.images.splice(+mn.dataset.main, 1); E.images.unshift(im); renderImgs(); }
  });
  dlg.addEventListener('input', (e) => {
    if (e.target.dataset.cn !== undefined) E.colors[+e.target.dataset.cn].name = e.target.value;
    if (e.target.dataset.ch !== undefined) E.colors[+e.target.dataset.ch].hex = e.target.value;
  });
  dlg.addEventListener('change', async (e) => {
    if (e.target.name === 'is_external') $('#extUrl').hidden = !e.target.checked;
    if (e.target.id === 'file') {
      const files = [...e.target.files]; e.target.value = '';
      for (const f of files) {
        E.busy++; renderImgs();
        try { const url = await uploadImage(f); E.images.push(url); E.uploaded.push(url); }
        catch (err) { $('#eerr').textContent = 'Не удалось загрузить фото: ' + (err.message || err); }
        E.busy--; renderImgs();
      }
    }
  });
  dlg.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target), err = $('#eerr'), btn = $('#esave');
    err.textContent = '';
    const name = String(f.get('name')).trim();
    if (!name) return (err.textContent = 'Укажите название.');
    if (E.busy) return (err.textContent = 'Дождитесь окончания загрузки фото.');
    const num = (k) => { const s = String(f.get(k) ?? '').trim(); return s === '' ? null : Math.max(0, Math.round(+s)); };
    const sizes = [...new Set(String(f.get('sizes')).split(/[\s,;]+/).map((s) => s.trim().toUpperCase()).filter(Boolean))];
    const colors = E.colors.map((c) => ({ name: c.name.trim(), hex: c.hex })).filter((c) => c.name);
    const isExt = f.get('is_external') === 'on';
    const payload = {
      name, description: String(f.get('description')).trim(), category: String(f.get('category')) || null,
      price: num('price'), old_price: num('old_price'), stock: num('stock') ?? 0, status: String(f.get('status')),
      sizes, colors, images: E.images,
      is_new: f.get('is_new') === 'on', is_popular: f.get('is_popular') === 'on', is_published: f.get('is_published') === 'on',
      is_external: isExt, external_url: isExt ? String(f.get('external_url')).trim() || null : null,
    };
    btn.disabled = true;
    const q = E.id ? sb.from('products').update(payload).eq('id', E.id) : sb.from('products').insert(payload);
    const { error } = await q;
    btn.disabled = false;
    if (error) return (err.textContent = 'Ошибка сохранения: ' + error.message);
    // удаляем из хранилища фото, которые убрали из товара
    await removeFiles(E.original.filter((u) => !E.images.includes(u)));
    await closeEditor(true);
    await loadProducts(); renderList(); toast('Товар сохранён');
  });

  boot();
});
