-- ASTI shop: схема базы данных Supabase
-- Выполните целиком в Supabase → SQL Editor → New query → Run.

create extension if not exists pgcrypto;

-- ───────── Администраторы ─────────
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ───────── Товары ─────────
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 200),
  description  text not null default '',
  category     text,                                   -- slug категории, null = без категории
  price        integer check (price is null or price >= 0),   -- рубли, null = «цена уточняется»
  old_price    integer check (old_price is null or old_price >= 0),
  sizes        text[] not null default '{}',
  colors       jsonb  not null default '[]'::jsonb,    -- [{"name":"Чёрный","hex":"#111111"}]
  stock        integer not null default 0 check (stock >= 0),
  status       text not null default 'in_stock'
               check (status in ('in_stock','preorder','out_of_stock')),
  images       text[] not null default '{}',
  is_new       boolean not null default false,
  is_popular   boolean not null default false,
  is_published boolean not null default true,
  is_external  boolean not null default false,         -- карточка Pinduoduo
  external_url text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists products_created_idx on public.products (created_at desc);
create index if not exists products_category_idx on public.products (category);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
for each row execute function public.touch_updated_at();

-- ───────── Row Level Security ─────────
alter table public.admins   enable row level security;
alter table public.products enable row level security;

drop policy if exists "admins read self"      on public.admins;
drop policy if exists "products public read"  on public.products;
drop policy if exists "products admin read"   on public.products;
drop policy if exists "products admin insert" on public.products;
drop policy if exists "products admin update" on public.products;
drop policy if exists "products admin delete" on public.products;

-- пользователь может увидеть только собственную запись в admins (для проверки прав)
create policy "admins read self" on public.admins
  for select to authenticated using (user_id = auth.uid());

-- каталог читают все, но только опубликованные товары
create policy "products public read" on public.products
  for select to anon, authenticated using (is_published = true);

-- администратор видит и меняет всё
create policy "products admin read"   on public.products for select to authenticated using (public.is_admin());
create policy "products admin insert" on public.products for insert to authenticated with check (public.is_admin());
create policy "products admin update" on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "products admin delete" on public.products for delete to authenticated using (public.is_admin());

-- ───────── Хранилище фотографий ─────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('products', 'products', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 8388608,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "product images public read"  on storage.objects;
drop policy if exists "product images admin insert" on storage.objects;
drop policy if exists "product images admin update" on storage.objects;
drop policy if exists "product images admin delete" on storage.objects;

create policy "product images public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'products');
create policy "product images admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'products' and public.is_admin());
create policy "product images admin update" on storage.objects
  for update to authenticated using (bucket_id = 'products' and public.is_admin());
create policy "product images admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'products' and public.is_admin());

-- ───────── 9 карточек Pinduoduo (данные не выдуманы) ─────────
-- Запускать один раз. Фото, цена, размеры и характеристики заполняются позже в админ-панели.
insert into public.products (name, description, category, price, stock, status, is_external, external_url)
select v.name, 'Фото и характеристики уточняются.', null, null, 0, 'preorder', true, v.url
from (values
  ('Товар Pinduoduo №1', 'https://mobile.yangkeduo.com/goods1.html?ps=cZclYmGu6l'),
  ('Товар Pinduoduo №2', 'https://mobile.yangkeduo.com/goods2.html?ps=QS9wpg3zcz'),
  ('Товар Pinduoduo №3', 'https://mobile.yangkeduo.com/goods2.html?ps=j31HEMPHPn'),
  ('Товар Pinduoduo №4', 'https://mobile.yangkeduo.com/goods.html?ps=jXxccWVAzs'),
  ('Товар Pinduoduo №5', 'https://mobile.yangkeduo.com/goods2.html?ps=rFTpEluYm5'),
  ('Товар Pinduoduo №6', 'https://mobile.yangkeduo.com/goods.html?ps=sNkqI20XIO'),
  ('Товар Pinduoduo №7', 'https://mobile.yangkeduo.com/goods.html?ps=A3kdDAVZwG'),
  ('Товар Pinduoduo №8', 'https://mobile.yangkeduo.com/goods.html?ps=4Sk7v6AAN9'),
  ('Товар Pinduoduo №9', 'https://mobile.yangkeduo.com/goods.html?ps=nY5vyjOFUB')
) as v(name, url)
where not exists (select 1 from public.products p where p.external_url = v.url);
