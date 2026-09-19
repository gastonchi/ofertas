-- Opcional: convertir horarios HH:MM legados a turnos morning/afternoon/evening.
-- La app ya interpreta HH:MM al leer; esto solo limpia los valores guardados.

update public.app_settings
set alert_hours = (
  select coalesce(
    array_agg(distinct shift order by shift),
    array['morning', 'evening']::text[]
  )
  from (
    select case
      when h in ('morning', 'afternoon', 'evening') then h
      when h ~ '^\d{1,2}:\d{2}$' and (split_part(h, ':', 1))::int < 6 then null
      when h ~ '^\d{1,2}:\d{2}$' and (split_part(h, ':', 1))::int < 12 then 'morning'
      when h ~ '^\d{1,2}:\d{2}$' and (split_part(h, ':', 1))::int < 18 then 'afternoon'
      when h ~ '^\d{1,2}:\d{2}$' then 'evening'
      else null
    end as shift
    from unnest(alert_hours) as h
  ) mapped
  where shift is not null
)
where exists (
  select 1
  from unnest(alert_hours) as h
  where h ~ '^\d{1,2}:\d{2}$'
);
