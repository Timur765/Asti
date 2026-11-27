// Vercel Serverless Function: приём заказа, запись в ASTI Finance и уведомление Telegram.
// Токен бота хранится ТОЛЬКО в переменных окружения сервера и никогда не попадает в браузер.
// Цены берутся из базы данных, а не из браузера — подменить их нельзя.

const { createHmac } = require('node:crypto');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hits = new Map(); // простейший лимит запросов (на экземпляр функции)

const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
// A supplier URL is server-side catalog data, not a buyer-supplied link.
function supplierUrl(value) {
  if (typeof value !== 'string' || value.length > 2048 || /[\s\u0000-\u001f\u007f]/.test(value.trim())) return null;
  try {
    const u = new URL(value.trim());
    return (u.protocol === 'https:' || u.protocol === 'http:') && !u.username && !u.password ? u.href : null;
  } catch { return null; }
}
const escapeAttr = (s) => esc(s).replace(/"/g, '&quot;');
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

async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SUPABASE_URL, SUPABASE_ANON_KEY, ASTI_FINANCE_ORDER_TOKEN } = process.env;
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || !SUPABASE_URL || !SUPABASE_ANON_KEY || !ASTI_FINANCE_ORDER_TOKEN) {
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

  if (body.consent !== true) return res.status(400).json({ error: 'consent_required' });
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

  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 40) return res.status(400).json({ error: 'empty_cart' });
  const items = [];
  const quantities = new Map();
  for (const i of body.items) {
    if (!i || !UUID.test(String(i.id || '')) || !Number.isInteger(i.qty) || i.qty < 1 || i.qty > 99) return res.status(400).json({ error: 'invalid_item' });
    const id = String(i.id).toLowerCase();
    const q = (quantities.get(id) || 0) + i.qty;
    if (q > 99) return res.status(400).json({ error: 'invalid_item' });
    quantities.set(id, q);
    items.push({ id, size: clip(i.size, 100), color: clip(i.color, 100), qty: i.qty });
  }

  // Актуальные данные о товарах из базы
  const ids = [...new Set(items.map((i) => i.id))];
  let products;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&id=in.(${ids.join(',')})&is_published=eq.true`, {
      // новые ключи sb_publishable_… — не JWT, их передают только в apikey; старые anon-ключи (JWT) — ещё и в Authorization
      signal: AbortSignal.timeout(8000),
      headers: SUPABASE_ANON_KEY.startsWith('sb_')
        ? { apikey: SUPABASE_ANON_KEY }
        : { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
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
  const financeItems = [];
  for (const it of items) {
    const p = byId.get(it.id);
    if (!p) return res.status(409).json({ error: 'product_unavailable', id: it.id });
    if (p.status === 'out_of_stock') return res.status(409).json({error:'out_of_stock',id:it.id,name:p.name});
    if (!p.is_external) {
      if (p.status === 'out_of_stock' || (p.status === 'in_stock' && p.stock <= 0)) {
        return res.status(409).json({ error: 'out_of_stock', id: it.id, name: p.name });
      }
      if (p.status === 'in_stock' && quantities.get(it.id) > p.stock) {
        return res.status(409).json({ error: 'not_enough_stock', id: it.id, name: p.name, stock: p.stock });
      }
      if (Array.isArray(p.sizes) && p.sizes.length && !p.sizes.includes(it.size)) {
        return res.status(400).json({ error: 'size_required', name: p.name });
      }
    }
    if (Array.isArray(p.colors) && p.colors.length && !p.colors.some(c => c && c.name === it.color)) return res.status(400).json({error:'color_required',name:p.name});
    if (Array.isArray(p.sizes) && p.sizes.length && !p.sizes.includes(it.size)) return res.status(400).json({error:'size_required',name:p.name});
    let line = `• <b>${esc(p.name)}</b>`;
    const meta = [it.size && `размер ${it.size}`, it.color && it.color].filter(Boolean).join(', ');
    if (meta) line += `\n   ${esc(meta)}`;
    const unitPrice = Number.isSafeInteger(p.price) && p.price > 0 ? p.price : null;
    if (unitPrice == null) {
      unpriced += 1;
      line += `\n   ${it.qty} шт. — цена уточняется`;
    } else {
      total += unitPrice * it.qty;
      line += `\n   ${it.qty} × ${money(unitPrice)} = ${money(unitPrice * it.qty)}`;
    }
    const sourceUrl = supplierUrl(p.external_url);
    line += sourceUrl ? `\n   🔗 <a href="${escapeAttr(sourceUrl)}">Открыть товар у поставщика</a>` : '\n   Ссылка поставщика не сохранена';
    if (p.status === 'preorder') line += '\n   ⏳ ПРЕДЗАКАЗ';
    lines.push(line);
    financeItems.push({ id: p.id, name: clip(p.name, 250), size: it.size, color: it.color, qty: it.qty, unitPriceRub: unitPrice, subtotalRub: unitPrice == null ? null : unitPrice * it.qty, sourcePriceCny: p.source_price_cny == null ? null : Number(p.source_price_cny), supplierUrl: sourceUrl, status: p.status });
  }

  // Same validated cart and customer in a short retry window -> same order ID.
  const fingerprint = JSON.stringify({ customer, items: items.map(i => JSON.stringify(i)).sort(), bucket: Math.floor(Date.now() / 900000) });
  const number = 'A' + createHmac('sha256', ASTI_FINANCE_ORDER_TOKEN).update(fingerprint).digest('hex').slice(0, 12).toUpperCase();
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

  // Telegram counts visible text after parsing HTML, not href attributes.
  if (text.replace(/<[^>]*>/g, '').replace(/&(?:amp|lt|gt|quot);/g, 'x').length > 3900) return res.status(400).json({error:'order_too_large'});
  // Finance is private to authorized members. Retain the minimum contact needed to follow up.
  const note = [
    'Заказ с сайта ASTI №' + number,
    ...financeItems.map(i => [i.name, i.size, i.color, i.qty + ' шт.', i.unitPriceRub == null ? 'цена уточняется' : money(i.subtotalRub), i.supplierUrl || 'Ссылка поставщика не сохранена'].filter(Boolean).join(' · ')),
    unpriced ? 'ВНИМАНИЕ: сумма предварительная; ' + unpriced + ' поз. без подтвержденной цены.' : '',
    'Телефон для связи: ' + customer.phone,
    'Оплата не подтверждена. Адрес и комментарий — в Telegram.'
  ].filter(Boolean).join('\n').slice(0, 12000);
  const payload = JSON.stringify({p_token: ASTI_FINANCE_ORDER_TOKEN,p_number: number,p_client: '№' + number + ' · ' + customer.name,p_total: total,p_note: note,p_items: financeItems,p_unpriced: unpriced});
  const financeHeaders = { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
  if (!SUPABASE_ANON_KEY.startsWith('sb_')) financeHeaders.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
  let saved = false;
  for (let attempt = 0; attempt < 2 && !saved; attempt++) {
    try {
      const fr = await fetch(`${SUPABASE_URL}/rest/v1/rpc/asti_record_web_order`, { method: 'POST', signal: AbortSignal.timeout(5000), headers: financeHeaders, body: payload });
      if (fr.ok) saved = (await fr.json()) === true;
      else if (fr.status < 500 && fr.status !== 429) break;
    } catch (e) { /* retry same order ID */ }
  }
  if (!saved) { console.error('Finance registration failed', number); return res.status(502).json({error:'finance_unavailable'}); }
  // The accepted order is durable even if Telegram is temporarily down.
  try {
    const tg = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      signal: AbortSignal.timeout(8000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    const j = await tg.json().catch(() => ({}));
    if (!tg.ok || !j.ok) {
      console.error('Telegram error', tg.status);
      return res.status(200).json({ ok: true, number, telegramNotified: false });
    }
  } catch (e) {
    console.error('Telegram fetch failed');
    return res.status(200).json({ ok: true, number, telegramNotified: false });
  }

  return res.status(200).json({ ok: true, number });
}

module.exports = async (req, res) => {
  try {
    return await handler(req, res);
  } catch (e) {
    console.error('order handler crashed');
    return res.status(500).json({ error: 'crash' });
  }
};
