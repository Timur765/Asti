document.addEventListener('DOMContentLoaded', async () => {
  const { $, $$, esc, CATEGORIES, getProducts, availability, cardHtml, reveal, configured } = ASTI;
  const grid = $('#grid');
  const params = new URLSearchParams(location.search);
  const S = { q: params.get('q') || '', cat: params.get('cat') || '', min: '', max: '', sizes: new Set(), colors: new Set(), in: false, pre: false, sort: 'new' };
  let all = [];

  const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'];
  const sizeSort = (a, b) => {
    const ia = SIZE_ORDER.indexOf(a), ib = SIZE_ORDER.indexOf(b);
    if (ia > -1 && ib > -1) return ia - ib;
    if (ia > -1) return -1; if (ib > -1) return 1;
    return a.localeCompare(b, 'ru', { numeric: true });
  };

  function syncUrl() {
    const p = new URLSearchParams();
    if (S.q) p.set('q', S.q);
    if (S.cat) p.set('cat', S.cat);
    history.replaceState(null, '', p.toString() ? '?' + p : location.pathname);
  }

  function buildFilters() {
    const counts = {};
    all.forEach((p) => { const k = p.is_external ? 'pinduoduo' : p.category || 'other'; counts[k] = (counts[k] || 0) + 1; });
    const items = [{ slug: '', name: 'Все товары', n: all.length }]
      .concat(CATEGORIES.map((c) => ({ slug: c.slug, name: c.name, n: counts[c.slug] || 0 })))
      .concat([{ slug: 'pinduoduo', name: 'Pinduoduo', n: counts.pinduoduo || 0 }]);
    $('#fCats').innerHTML = items.map((c) => `<label class="opt"><input type="radio" name="cat" value="${c.slug}" ${S.cat === c.slug ? 'checked' : ''}> ${esc(c.name)}<small>${c.n}</small></label>`).join('');

    const sizes = [...new Set(all.flatMap((p) => p.sizes || []))].sort(sizeSort);
    $('#fSizes').innerHTML = sizes.length ? sizes.map((s) => `<button type="button" class="sz" data-s="${esc(s)}">${esc(s)}</button>`).join('') : '<span style="color:#888;font-size:13px">нет данных</span>';

    const colors = new Map();
    all.forEach((p) => (p.colors || []).forEach((c) => { if (c && c.name) colors.set(c.name.toLowerCase(), c); }));
    $('#fColors').innerHTML = colors.size ? [...colors.values()].map((c) => `<button type="button" class="col" data-c="${esc(c.name.toLowerCase())}" title="${esc(c.name)}" aria-label="${esc(c.name)}" style="background:${esc(c.hex || '#ccc')}"></button>`).join('') : '<span style="color:#888;font-size:13px">нет данных</span>';
  }

  function apply() {
    const q = S.q.trim().toLowerCase();
    let list = all.filter((p) => {
      if (S.cat === 'pinduoduo' ? !p.is_external : S.cat && p.category !== S.cat) return false;
      if (q && !(`${p.name} ${p.description || ''} ${p.is_external ? 'pinduoduo' : ''}`.toLowerCase().includes(q) || ASTI.catName(p.category).toLowerCase().includes(q))) return false;
      const price = p.price;
      if (S.min !== '' && (price == null || price < +S.min)) return false;
      if (S.max !== '' && (price == null || price > +S.max)) return false;
      if (S.sizes.size && !(p.sizes || []).some((s) => S.sizes.has(s))) return false;
      if (S.colors.size && !(p.colors || []).some((c) => S.colors.has((c.name || '').toLowerCase()))) return false;
      const av = availability(p);
      if (S.in || S.pre) { if (!((S.in && av === 'in') || (S.pre && av === 'preorder'))) return false; }
      return true;
    });
    const pv = (p, d) => (p.price == null ? d : p.price);
    if (S.sort === 'asc') list.sort((a, b) => pv(a, Infinity) - pv(b, Infinity));
    else if (S.sort === 'desc') list.sort((a, b) => pv(b, -1) - pv(a, -1));
    else if (S.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    else list.sort((a, b) => (a.is_external - b.is_external) || (new Date(b.created_at) - new Date(a.created_at)));

    $('#count').textContent = `Найдено: ${list.length}`;
    $('#title').textContent = S.cat === 'pinduoduo' ? 'Pinduoduo' : (CATEGORIES.find((c) => c.slug === S.cat) || {}).name || 'Каталог';
    grid.innerHTML = list.length ? list.map(cardHtml).join('') : '<div class="empty" style="grid-column:1/-1"><b>Ничего не найдено</b>Измените запрос или сбросьте фильтры.</div>';
    reveal(grid);
    const n = (S.cat ? 1 : 0) + (S.min !== '' || S.max !== '' ? 1 : 0) + S.sizes.size + S.colors.size + (S.in ? 1 : 0) + (S.pre ? 1 : 0);
    $('#fN').textContent = n ? ` (${n})` : '';
    syncUrl();
  }

  // события
  $('#q').value = S.q;
  $('#q').addEventListener('input', (e) => { S.q = e.target.value; apply(); });
  $('#sort').addEventListener('change', (e) => { S.sort = e.target.value; apply(); });
  $('#fCats').addEventListener('change', (e) => { S.cat = e.target.value; apply(); });
  $('#pMin').addEventListener('input', (e) => { S.min = e.target.value; apply(); });
  $('#pMax').addEventListener('input', (e) => { S.max = e.target.value; apply(); });
  $('#avIn').addEventListener('change', (e) => { S.in = e.target.checked; apply(); });
  $('#avPre').addEventListener('change', (e) => { S.pre = e.target.checked; apply(); });
  $('#fSizes').addEventListener('click', (e) => { const b = e.target.closest('.sz'); if (!b) return; const v = b.dataset.s; S.sizes.has(v) ? S.sizes.delete(v) : S.sizes.add(v); b.classList.toggle('on'); apply(); });
  $('#fColors').addEventListener('click', (e) => { const b = e.target.closest('.col'); if (!b) return; const v = b.dataset.c; S.colors.has(v) ? S.colors.delete(v) : S.colors.add(v); b.classList.toggle('on'); apply(); });
  $('#fReset').addEventListener('click', () => {
    Object.assign(S, { cat: '', min: '', max: '', in: false, pre: false }); S.sizes.clear(); S.colors.clear();
    $('#pMin').value = ''; $('#pMax').value = ''; $('#avIn').checked = false; $('#avPre').checked = false;
    $$('.sz.on,.col.on').forEach((b) => b.classList.remove('on'));
    const r = $('#fCats input[value=""]'); if (r) r.checked = true;
    apply();
  });
  const sheet = (open) => { $('#filters').classList.toggle('open', open); document.body.style.overflow = open ? 'hidden' : ''; };
  $('#fOpen').addEventListener('click', () => sheet(true));
  $('#fClose').addEventListener('click', () => sheet(false));
  $('#fApply').addEventListener('click', () => sheet(false));

  if (params.get('focus')) setTimeout(() => $('#q').focus(), 150);

  grid.innerHTML = Array.from({ length: 8 }, () => '<div class="sk"></div>').join('');
  if (!configured) { grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><b>Каталог пока пуст</b>Подключите базу данных (см. README).</div>'; return; }
  try {
    all = await getProducts();
    buildFilters();
    apply();
  } catch (e) {
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><b>Не удалось загрузить каталог</b>Проверьте соединение и обновите страницу.</div>';
  }
});
