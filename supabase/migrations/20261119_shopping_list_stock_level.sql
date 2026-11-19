-- Urgencia de compra en la lista: cuánto queda en casa.

alter table public.shopping_list_items
  add column if not exists stock_level text not null default 'low'
  check (stock_level in ('none_left', 'low'));

create index if not exists shopping_list_items_stock_level_idx
  on public.shopping_list_items (stock_level);