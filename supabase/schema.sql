-- Ejecutar en Supabase → SQL Editor

create table if not exists public.price_history (
  id uuid primary key default gen_random_uuid(),
  ean text not null,
  store text not null,
  product_name text,
  price numeric not null,
  list_price numeric,
  promotions jsonb default '[]'::jsonb,
  checked_at timestamptz not null default now()
);

create index if not exists price_history_ean_store_checked_idx
  on public.price_history (ean, store, checked_at desc);

create table if not exists public.alerts_sent (
  id uuid primary key default gen_random_uuid(),
  ean text not null,
  store text not null,
  fingerprint text not null,
  alert_day date not null,
  payload jsonb,
  sent_at timestamptz not null default now(),
  constraint alerts_sent_dedup unique (ean, store, fingerprint, alert_day)
);

create index if not exists alerts_sent_day_idx
  on public.alerts_sent (alert_day desc);

-- Productos a trackear (fuente de verdad del panel)
create table if not exists public.tracked_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ean text not null,
  target_price numeric not null check (target_price > 0),
  stores text[] not null default array['carrefour', 'dia', 'jumbo', 'disco', 'vea'],
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tracked_products_ean_unique unique (ean)
);

create index if not exists tracked_products_active_idx
  on public.tracked_products (active)
  where active = true;

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  alert_email text,
  default_stores text[] not null default array['carrefour', 'dia', 'jumbo', 'disco', 'vea'],
  alert_days text[] not null default array['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  alert_hours text[] not null default array['08:00', '20:00'],
  updated_at timestamptz not null default now()
);

alter table public.app_settings
  add column if not exists alert_days text[] not null default array['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

alter table public.app_settings
  add column if not exists alert_hours text[] not null default array['08:00', '20:00'];

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tracked_products_set_updated_at on public.tracked_products;
create trigger tracked_products_set_updated_at
  before update on public.tracked_products
  for each row
  execute function public.set_updated_at();

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row
  execute function public.set_updated_at();

alter table public.price_history enable row level security;
alter table public.alerts_sent enable row level security;
alter table public.tracked_products enable row level security;
alter table public.app_settings enable row level security;
