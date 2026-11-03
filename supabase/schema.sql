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
  emailed_at timestamptz,
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
  stores text[] not null default array['carrefour', 'coto', 'dia', 'jumbo', 'disco', 'vea', 'masonline'],
  active boolean not null default true,
  alerts_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tracked_products_ean_unique unique (ean)
);

create index if not exists tracked_products_active_idx
  on public.tracked_products (active)
  where active = true;

alter table public.tracked_products
  add column if not exists alerts_enabled boolean not null default true;

alter table public.tracked_products
  add column if not exists image_url text;

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  alert_email text,
  default_stores text[] not null default array['carrefour', 'coto', 'dia', 'jumbo', 'disco', 'vea', 'masonline'],
  alert_days text[] not null default array['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  alert_hours text[] not null default array['morning', 'evening'],
  updated_at timestamptz not null default now()
);

alter table public.app_settings
  add column if not exists alert_days text[] not null default array['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

alter table public.app_settings
  add column if not exists alert_hours text[] not null default array['morning', 'evening'];

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

-- Gastos familiares (rubros iniciales: migrations/20261103_expenses.sql)
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  icon text not null default 'shapes',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists expense_categories_name_unique
  on public.expense_categories (lower(name));

create table if not exists public.expense_subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.expense_categories (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists expense_subcategories_name_unique
  on public.expense_subcategories (category_id, lower(name));

-- restrict: un rubro/subrubro con gastos no se borra, se archiva (active = false).
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.expense_categories (id) on delete restrict,
  subcategory_id uuid references public.expense_subcategories (id) on delete restrict,
  amount integer not null check (amount > 0),
  spent_on date not null,
  notes text,
  created_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists expenses_spent_on_idx
  on public.expenses (spent_on desc);

create index if not exists expenses_category_spent_on_idx
  on public.expenses (category_id, spent_on desc);

drop trigger if exists expense_categories_set_updated_at on public.expense_categories;
create trigger expense_categories_set_updated_at
  before update on public.expense_categories
  for each row
  execute function public.set_updated_at();

drop trigger if exists expense_subcategories_set_updated_at on public.expense_subcategories;
create trigger expense_subcategories_set_updated_at
  before update on public.expense_subcategories
  for each row
  execute function public.set_updated_at();

alter table public.expense_categories enable row level security;
alter table public.expense_subcategories enable row level security;
alter table public.expenses enable row level security;
