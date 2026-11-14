-- =====================================================================
-- Angkor Printing — wholesale product catalogue
-- Run this once in Supabase: Dashboard → SQL Editor → New query → Run.
-- It is safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS).
--
-- No prices are stored anywhere in this schema by design.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Admins: only users listed here can edit. Signing up alone grants nothing.
-- Add a team member after creating their login in Authentication → Users:
--   insert into public.admins (user_id) select id from auth.users where email = 'staff@example.com';
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Products
--   specifications: JSON array of {"label": "...", "value": "..."}
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  sku               text unique,
  name              text not null,
  category_id       uuid references public.categories (id) on delete set null,
  description       text not null default '',
  specifications    jsonb not null default '[]'::jsonb,
  materials         text[] not null default '{}',
  sizes             text[] not null default '{}',
  finishing_options text[] not null default '{}',
  images            text[] not null default '{}',
  in_stock          boolean not null default true,
  is_published      boolean not null default true,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint specifications_is_array check (jsonb_typeof(specifications) = 'array')
);

create index if not exists products_category_idx on public.products (category_id);

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

-- ---------------------------------------------------------------------
-- Branding (always shown) and contact details (hideable) live in
-- separate single-row tables, so a page with contacts hidden never
-- even downloads them.
-- ---------------------------------------------------------------------
create table if not exists public.brand_settings (
  id         integer primary key default 1 check (id = 1),
  brand_name text not null default 'Angkor Printing',
  tagline    text not null default 'Product Catalogue',
  logo_url   text,
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_settings (
  id         integer primary key default 1 check (id = 1),
  phone      text not null default '',
  whatsapp   text not null default '',
  telegram   text not null default '',
  email      text not null default '',
  address    text not null default '',
  facebook   text not null default '',
  website    text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.brand_settings (id) values (1) on conflict (id) do nothing;
insert into public.contact_settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists brand_touch on public.brand_settings;
create trigger brand_touch before update on public.brand_settings
  for each row execute function public.touch_updated_at();
drop trigger if exists contact_touch on public.contact_settings;
create trigger contact_touch before update on public.contact_settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Row-Level Security
-- Public (anon): read-only. Admins: full write access.
-- ---------------------------------------------------------------------
alter table public.admins           enable row level security;
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.brand_settings   enable row level security;
alter table public.contact_settings enable row level security;

-- admins: a signed-in user may only check their own membership; no client writes.
drop policy if exists "admins read own row" on public.admins;
create policy "admins read own row" on public.admins
  for select to authenticated using (user_id = auth.uid());

-- categories
drop policy if exists "categories public read" on public.categories;
create policy "categories public read" on public.categories
  for select to anon, authenticated using (true);
drop policy if exists "categories admin write" on public.categories;
create policy "categories admin write" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- products: the public sees published products only; admins see everything.
drop policy if exists "products public read" on public.products;
create policy "products public read" on public.products
  for select to anon, authenticated using (is_published or public.is_admin());
drop policy if exists "products admin write" on public.products;
create policy "products admin write" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- brand settings
drop policy if exists "brand public read" on public.brand_settings;
create policy "brand public read" on public.brand_settings
  for select to anon, authenticated using (true);
drop policy if exists "brand admin update" on public.brand_settings;
create policy "brand admin update" on public.brand_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- contact settings
drop policy if exists "contact public read" on public.contact_settings;
create policy "contact public read" on public.contact_settings
  for select to anon, authenticated using (true);
drop policy if exists "contact admin update" on public.contact_settings;
create policy "contact admin update" on public.contact_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Storage: public bucket for product photos and the logo.
-- Anyone can view; only admins can upload, replace or delete.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
on conflict (id) do update set public = true;

drop policy if exists "product-images public read" on storage.objects;
create policy "product-images public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'product-images');

drop policy if exists "product-images admin insert" on storage.objects;
create policy "product-images admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product-images admin update" on storage.objects;
create policy "product-images admin update" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product-images admin delete" on storage.objects;
create policy "product-images admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());
