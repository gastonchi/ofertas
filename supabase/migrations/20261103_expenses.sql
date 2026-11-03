-- Gastos del grupo familiar: rubros, subrubros y gastos.
-- Ejecutar una sola vez en Supabase → SQL Editor (crea las tablas y carga los rubros iniciales).

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

-- Rubros y subrubros iniciales (se pueden editar desde el panel → Rubros).
with seed (name, icon, sort_order, subs) as (
  values
    ('Alimentos', 'shopping-cart', 1, array['Carnicería', 'Panadería', 'Pescadería', 'Verdulería', 'Fáb. Pastas', 'Varios Súper']),
    ('Educación', 'graduation-cap', 2, array['Cuota', 'Matrícula', 'Útiles', 'Salidas', 'Otros']),
    ('Auto', 'car', 3, array['Nafta', 'Seguro', 'Patente', 'Otros']),
    ('Ropa', 'shirt', 4, array[]::text[]),
    ('Salud', 'heart-pulse', 5, array[]::text[]),
    ('Perfumería', 'spray-can', 6, array[]::text[]),
    ('Hogar', 'house', 7, array['Limpieza', 'Mantenimiento', 'Decoración', 'Otros']),
    ('Servicios', 'lightbulb', 8, array['Luz', 'Gas', 'Agua', 'Celular', 'Internet', 'Municipal', 'ARBA']),
    ('Suscripciones', 'tv', 9, array['Cursor', 'Apple', 'Netflix', 'Prime', 'Disney', 'MELI+', 'Otros']),
    ('Transporte', 'bus', 10, array[]::text[]),
    ('Salidas', 'coffee', 11, array['Café', 'Almuerzo', 'Juntada', 'Otros']),
    ('Otros', 'shapes', 12, array['Actividades', 'Regalos'])
),
inserted as (
  insert into public.expense_categories (name, icon, sort_order)
  select name, icon, sort_order from seed
  on conflict (lower(name)) do nothing
  returning id, name
)
insert into public.expense_subcategories (category_id, name, sort_order)
select inserted.id, sub.name, sub.ord
from inserted
join seed on seed.name = inserted.name
cross join lateral unnest(seed.subs) with ordinality as sub (name, ord);
