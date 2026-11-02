// Vercel Serverless Function: приём заказа и отправка в Telegram.
// Токен бота хранится ТОЛЬКО в переменных окружения сервера и никогда не попадает в браузер.
// Цены берутся из базы данных, а не из браузера — подменить их нельзя.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hits = new Map(); // простейший лимит запросов (на экземпляр функции)

const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const clip = (s, n) => String(s ?? '').trim().slice(0, n);
const money = (n) => new Intl.NumberFormat('ru-RU').format(n) + ' ₽';

function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 8;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'server_not_configured' });
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) return res.status(429).json({ error: 'too_many_requests' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'bad_request' });
  if (body.website) return res.status(200).json({ ok: true, number: 'OK' }); // honeypot для ботов

  const c = body.customer || {};
  const customer = {
    name: clip(c.name, 80),
    phone: clip(c.phone, 30),
    telegram: clip(c.telegram, 40),
    address: clip(c.address, 300),
    comment: clip(c.comment, 500),
  };
  if (!customer.name || customer.phone.replace(/\D/g, '').length < 7 || !customer.address) {
    return res.status(400).json({ error: 'invalid_customer' });
  }

  const rawItems = Array.isArray(body.items) ? body.items.slice(0, 40) : [];
  const items = rawItems
    .map((i) => ({
      id: String(i.id || ''),
      size: clip(i.size, 20),
      color: clip(i.color, 40),
      qty: Math.max(1, Math.min(99, parseInt(i.qty, 10) || 1)),
    }))
    .filter((i) => UUID.test(i.id));
  if (!items.length) return res.status(400).json({ error: 'empty_cart' });

  // Актуальные данные о товарах из базы
  const ids = [...new Set(items.map((i) => i.id))];
  let products;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&id=in.(${ids.join(',')})&is_published=eq.true`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!r.ok) throw new Error('db ' + r.status);
    products = await r.json();
  } catch (e) {
    return res.status(502).json({ error: 'db_unavailable' });
  }
  const byId = new Map(products.map((p) => [p.id, p]));

  let total = 0;
  let unpriced = 0;
  const lines = [];
  for (const it of items) {
    const p = byId.get(it.id);
    if (!p) return res.status(409).json({ error: 'product_unavailable', id: it.id });
    if (!p.is_external) {
      if (p.status === 'out_of_stock' || (p.status === 'in_stock' && p.stock <= 0)) {
        return res.status(409).json({ error: 'out_of_stock', id: it.id, name: p.name });
      }
      if (p.status === 'in_stock' && it.qty > p.stock) {
        return res.status(409).json({ error: 'not_enough_stock', id: it.id, name: p.name, stock: p.stock });
      }
      if (Array.isArray(p.sizes) && p.sizes.length && !p.sizes.includes(it.size)) {
        return res.status(400).json({ error: 'size_required', name: p.name });
      }
    }
    let line = `• <b>${esc(p.name)}</b>`;
    const meta = [it.size && `размер ${it.size}`, it.color && it.color].filter(Boolean).join(', ');
    if (meta) line += `\n   ${esc(meta)}`;
    if (p.is_external) {
      unpriced += 1;
      line += `\n   ${it.qty} шт. — цена уточняется (Pinduoduo)`;
      if (p.external_url) line += `\n   ${esc(p.external_url)}`;
    } else if (p.price == null) {
      unpriced += 1;
      line += `\n   ${it.qty} шт. — цена уточняется`;
    } else {
      total += p.price * it.qty;
      line += `\n   ${it.qty} × ${money(p.price)} = ${money(p.price * it.qty)}`;
    }
    if (p.status === 'preorder') line += '\n   ⏳ ПРЕДЗАКАЗ';
    lines.push(line);
  }

  const number = 'A' + Date.now().toString(36).toUpperCase().slice(-6);
  const text = [
    `🛍 <b>Новый заказ ASTI №${number}</b>`,
    '',
    lines.join('\n\n'),
    '',
    `<b>Итого:</b> ${money(total)}${unpriced ? ` (+ ${unpriced} поз. с уточняемой ценой)` : ''}`,
    '',
    `👤 ${esc(customer.name)}`,
    `📞 ${esc(customer.phone)}`,
    customer.telegram ? `✈️ ${esc(customer.telegram)}` : '',
    `📍 ${esc(customer.address)}`,
    customer.comment ? `💬 ${esc(customer.comment)}` : '',
  ].filter((l) => l !== '').join('\n');

  try {
    const tg = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text.slice(0, 4000),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    const j = await tg.json().catch(() => ({}));
    if (!tg.ok || !j.ok) {
      console.error('Telegram error', tg.status, j.description);
      return res.status(502).json({ error: 'telegram_failed' });
    }
  } catch (e) {
    console.error('Telegram fetch failed', e.message);
    return res.status(502).json({ error: 'telegram_failed' });
  }

  return res.status(200).json({ ok: true, number });
};
