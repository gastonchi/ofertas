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

-- Uso personal con service_role desde GitHub Actions:
alter table public.price_history enable row level security;
alter table public.alerts_sent enable row level security;
