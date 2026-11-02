document.addEventListener('DOMContentLoaded', async () => {
  const { $, $$, esc, money, catName, getProducts, availability, priceHtml, cardHtml, toast, reveal, cartAdd, openDrawer, AV_LABEL, TG, configured } = ASTI;
  const root = $('#pdp');
  const id = new URLSearchParams(location.search).get('id');

  const notFound = (t) => { root.innerHTML = `<div class="empty"><b>${t}</b><a class="btn btn--line" href="catalog.html" style="margin-top:18px">Вернуться в каталог</a></div>`; };
  if (!configured) return notFound('Магазин не подключён к базе данных');
  if (!id) return notFound('Товар не найден');

  let all;
  try { all = await getProducts(); } catch { return notFound('Не удалось загрузить товар'); }
  const p = all.find((x) => x.id === id);
  if (!p) return notFound('Товар не найден или снят с продажи');

  const av = availability(p);
  const imgs = p.images || [];
  const sizes = p.sizes || [];
  const colors = p.colors || [];
  const ext = !!p.is_external;
  let size = '', color = colors[0] ? colors[0].name : '', qty = 1;
  const max = p.status === 'in_stock' && !ext ? Math.max(1, p.stock) : 99;

  document.title = `${p.name} — ASTI`;
  const md = document.querySelector('meta[name=description]');
  if (md) md.content = (p.description || p.name).slice(0, 160);
  $('#crumbs').innerHTML = `<a href="index.html">Главная</a> / <a href="catalog.html">Каталог</a>${!ext && p.category ? ` / <a href="catalog.html?cat=${esc(p.category)}">${esc(catName(p.category))}</a>` : ext ? ' / <a href="catalog.html?cat=pinduoduo">Pinduoduo</a>' : ''}`;

  const gallery = imgs.length
    ? `<div class="gal"><div class="gal__track" id="track">${imgs.map((u, i) => `<img src="${esc(u)}" alt="${esc(p.name)} — фото ${i + 1}" ${i ? 'loading="lazy"' : ''} decoding="async">`).join('')}</div>
       ${imgs.length > 1 ? `<div class="gal__dots" id="dots">${imgs.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>
       <div class="gal__th" id="thumbs">${imgs.map((u, i) => `<button type="button" class="${i ? '' : 'on'}" data-i="${i}" aria-label="Фото ${i + 1}"><img src="${esc(u)}" alt=""></button>`).join('')}</div>` : ''}</div>`
    : `<div class="gal"><div class="gal__track"><div class="gal__ph" style="aspect-ratio:4/5">ASTI</div></div></div>`;

  const stLabel = av === 'in' ? (p.stock > 0 && p.stock <= 3 ? `В наличии · осталось ${p.stock}` : AV_LABEL.in) : AV_LABEL[av];

  root.innerHTML = `<div class="pdp">
    ${gallery}
    <div class="info">
      <p class="eyebrow">${esc(ext ? 'Pinduoduo' : catName(p.category))}</p>
      <h1>${esc(p.name)}</h1>
      ${priceHtml(p)}
      <div class="st st--${av}">${esc(stLabel)}</div>
      ${ext ? '<div class="note"><b>Фото и характеристики уточняются.</b><br>Напишите нам в Telegram — менеджер уточнит наличие, цену, размеры и сроки.</div>' : ''}
      ${p.description && !(ext && /уточняются\.?$/i.test(p.description.trim())) ? `<div class="desc">${esc(p.description)}</div>` : '<div style="height:18px"></div>'}
      ${ext ? '' : `<div class="opts">
        ${colors.length ? `<div class="opt-row"><h4>Цвет <span id="cName">${esc(color)}</span></h4><div class="cols" id="colors">${colors.map((c, i) => `<button type="button" class="col ${i ? '' : 'on'}" data-c="${esc(c.name)}" title="${esc(c.name)}" aria-label="${esc(c.name)}" style="background:${esc(c.hex || '#ccc')}"></button>`).join('')}</div></div>` : ''}
        ${sizes.length ? `<div class="opt-row" id="sizeRow"><h4>Размер <span id="sName">выберите</span></h4><div class="szs" id="sizes">${sizes.map((s) => `<button type="button" class="sz" data-s="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>` : ''}
        <div class="opt-row"><h4>Количество</h4><div class="qty"><button type="button" id="qm" aria-label="Меньше">−</button><output id="qv">1</output><button type="button" id="qp" aria-label="Больше">+</button></div></div>
      </div>`}
      <div class="buy">
        ${ext
          ? `<a class="btn" id="askTg" href="${TG}" target="_blank" rel="noopener">Уточнить в Telegram</a>
             ${p.external_url ? `<a class="btn btn--line" href="${esc(p.external_url)}" target="_blank" rel="noopener nofollow">Открыть на Pinduoduo</a>` : ''}`
          : av === 'out'
            ? `<button class="btn" disabled>Нет в наличии</button><a class="btn btn--line" href="${TG}" target="_blank" rel="noopener">Узнать о поступлении</a>`
            : `<button class="btn" id="buy">${av === 'preorder' ? 'Оформить предзаказ' : 'Заказать'}</button><button class="btn btn--line" id="add">Добавить в корзину</button>`}
      </div>
    </div></div>`;

  // галерея
  const track = $('#track');
  if (track && imgs.length > 1) {
    const th = $$('#thumbs button'), dots = $$('#dots i');
    th.forEach((b) => b.addEventListener('click', () => track.scrollTo({ left: track.clientWidth * +b.dataset.i, behavior: 'smooth' })));
    track.addEventListener('scroll', () => {
      const i = Math.round(track.scrollLeft / track.clientWidth);
      th.forEach((b, k) => b.classList.toggle('on', k === i)); dots.forEach((d, k) => d.classList.toggle('on', k === i));
    }, { passive: true });
  }
  const lb = $('#lb');
  if (track) track.addEventListener('click', (e) => { if (e.target.tagName === 'IMG') { lb.querySelector('img').src = e.target.src; lb.classList.add('on'); } });
  lb.addEventListener('click', () => lb.classList.remove('on'));

  // выбор опций
  const cols = $('#colors');
  if (cols) cols.addEventListener('click', (e) => { const b = e.target.closest('.col'); if (!b) return; $$('.col', cols).forEach((x) => x.classList.remove('on')); b.classList.add('on'); color = b.dataset.c; $('#cName').textContent = color; });
  const szs = $('#sizes');
  if (szs) szs.addEventListener('click', (e) => { const b = e.target.closest('.sz'); if (!b) return; $$('.sz', szs).forEach((x) => x.classList.remove('on')); b.classList.add('on'); size = b.dataset.s; $('#sName').textContent = size; });
  const setQty = (n) => { qty = Math.max(1, Math.min(max, n)); $('#qv').textContent = qty; };
  if ($('#qm')) { $('#qm').onclick = () => setQty(qty - 1); $('#qp').onclick = () => { if (qty >= max) toast('Больше нет в наличии'); setQty(qty + 1); }; }

  function validate() {
    if (sizes.length && !size) {
      const row = $('#sizeRow'); row.classList.remove('shake'); void row.offsetWidth; row.classList.add('shake');
      row.scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('Выберите размер'); return false;
    }
    return true;
  }
  if ($('#add')) $('#add').onclick = () => { if (!validate()) return; cartAdd(p, size, color, qty); toast('Добавлено в корзину'); };
  if ($('#buy')) $('#buy').onclick = () => { if (!validate()) return; cartAdd(p, size, color, qty); openDrawer('checkout'); };
  if ($('#askTg')) $('#askTg').addEventListener('click', () => {
    const t = `Здравствуйте! Интересует «${p.name}». Уточните, пожалуйста, фото, характеристики, цену и сроки.`;
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => toast('Текст сообщения скопирован — вставьте его в чат')).catch(() => {});
  });

  // похожие
  const rel = all.filter((x) => x.id !== p.id && (ext ? x.is_external : x.category === p.category && !x.is_external)).slice(0, 4);
  if (rel.length) { $('#relWrap').hidden = false; $('#rel').innerHTML = rel.map(cardHtml).join(''); }
  reveal();
});
