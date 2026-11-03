-- Lista de compras: ítems vinculados a tracked_products.

create table if not exists public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.tracked_products (id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0 and quantity <= 999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopping_list_items_product_unique unique (product_id)
);

create index if not exists shopping_list_items_updated_idx
  on public.shopping_list_items (updated_at desc);

drop trigger if exists shopping_list_items_set_updated_at on public.shopping_list_items;
create trigger shopping_list_items_set_updated_at
  before update on public.shopping_list_items
  for each row
  execute function public.set_updated_at();

alter table public.shopping_list_items enable row level security;
