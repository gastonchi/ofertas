-- Regalos y Actividades pasan de subrubros de "Otros" a rubros principales.

insert into public.expense_categories (name, icon, sort_order)
select v.name, v.icon, v.sort_order
from (
  values
    ('Regalos', 'gift', 13),
    ('Actividades', 'dumbbell', 14)
) as v(name, icon, sort_order)
where not exists (
  select 1
  from public.expense_categories ec
  where lower(ec.name) = lower(v.name)
);

update public.expenses e
set
  category_id = reg.id,
  subcategory_id = null
from public.expense_subcategories s
join public.expense_categories otros
  on otros.id = s.category_id and lower(otros.name) = 'otros'
join public.expense_categories reg
  on lower(reg.name) = 'regalos'
where e.subcategory_id = s.id
  and lower(s.name) = 'regalos';

update public.expenses e
set
  category_id = act.id,
  subcategory_id = null
from public.expense_subcategories s
join public.expense_categories otros
  on otros.id = s.category_id and lower(otros.name) = 'otros'
join public.expense_categories act
  on lower(act.name) = 'actividades'
where e.subcategory_id = s.id
  and lower(s.name) = 'actividades';

delete from public.expense_subcategories s
using public.expense_categories c
where s.category_id = c.id
  and lower(c.name) = 'otros'
  and lower(s.name) in ('actividades', 'regalos');
