-- Semilla opcional (productos del MVP en products.json)
-- Ejecutar después de schema.sql

insert into public.tracked_products (name, ean, target_price, stores)
values
  (
    'Leche UAT Zero lactosa La Serenísima 1L',
    '7790742333605',
    2200,
    array['carrefour', 'coto', 'dia', 'jumbo', 'disco', 'vea']
  ),
  (
    'Café Torrado molido La Planta de Café Cabrales 500 g',
    '7790550000164',
    10000,
    array['carrefour', 'coto', 'dia', 'jumbo', 'disco', 'vea']
  ),
  (
    'Aceite de girasol Cañuelas 1.5 L',
    '7792180001665',
    4500,
    array['carrefour', 'coto', 'dia', 'jumbo', 'disco', 'vea']
  ),
  (
    'Yerba mate Playadito suave con palo 1 kg',
    '7793704000928',
    4000,
    array['carrefour', 'coto', 'dia', 'jumbo', 'disco', 'vea']
  )
on conflict (ean) do update set
  name = excluded.name,
  target_price = excluded.target_price,
  stores = excluded.stores,
  active = true,
  updated_at = now();
