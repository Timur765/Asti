document.addEventListener('DOMContentLoaded', async () => {
  const { $, esc, CATEGORIES, getProducts, cardHtml, reveal, configured } = ASTI;

  $('#cats').innerHTML = CATEGORIES.map((c) => `<a class="chip" href="catalog.html?cat=${c.slug}">${esc(c.name)}</a>`).join('') +
    '<a class="chip" href="catalog.html?cat=pinduoduo">Pinduoduo</a>';

  const skel = (n) => Array.from({ length: n }, () => '<div class="sk"></div>').join('');
  $('#gridNew').innerHTML = skel(4);

  if (!configured) {
    $('#gridNew').innerHTML = '<div class="empty" style="grid-column:1/-1"><b>Каталог пока пуст</b>Подключите базу данных (см. README).</div>';
    $('#popular').hidden = true;
    return;
  }
  try {
    const all = (await getProducts()).filter((p) => !p.is_external);
    const hasPhoto = all.find((p) => (p.images || []).length);
    if (hasPhoto) {
      const hero = $('#heroImg');
      const img = new Image();
      img.onload = () => { hero.style.backgroundImage = `url("${hasPhoto.images[0]}")`; hero.classList.add('on'); };
      img.src = hasPhoto.images[0];
    }
    let news = all.filter((p) => p.is_new).slice(0, 8);
    if (!news.length) news = all.slice(0, 8);
    const pops = all.filter((p) => p.is_popular).slice(0, 8);

    $('#gridNew').innerHTML = news.length ? news.map(cardHtml).join('')
      : '<div class="empty" style="grid-column:1/-1"><b>Скоро здесь появятся новинки</b>Загляните в каталог или напишите нам в Telegram.</div>';
    if (pops.length) $('#gridPop').innerHTML = pops.map(cardHtml).join('');
    else $('#popular').hidden = true;
    reveal();
  } catch (e) {
    $('#gridNew').innerHTML = '<div class="empty" style="grid-column:1/-1"><b>Не удалось загрузить товары</b>Проверьте соединение и обновите страницу.</div>';
    $('#popular').hidden = true;
  }
});
