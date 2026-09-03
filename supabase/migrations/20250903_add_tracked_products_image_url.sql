-- Agrega imagen de producto (thumbs en el panel).
-- Ejecutar en Supabase → SQL Editor si tracked_products no tiene image_url.

alter table public.tracked_products
  add column if not exists image_url text;
