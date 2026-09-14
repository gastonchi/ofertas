alter table public.alerts_sent
  add column if not exists emailed_at timestamptz;

update public.alerts_sent
set emailed_at = sent_at
where emailed_at is null;
