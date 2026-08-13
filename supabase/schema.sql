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

-- Productos a trackear (fuente de verdad del panel admin)
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

-- Uso personal con service_role desde GitHub Actions / Vercel:
alter table public.price_history enable row level security;
alter table public.alerts_sent enable row level security;
alter table public.tracked_products enable row level security;
