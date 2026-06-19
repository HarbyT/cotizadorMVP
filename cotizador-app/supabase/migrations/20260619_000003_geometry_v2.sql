-- Geometry v2: optional production metadata for substrates.

alter table if exists public.papers
  add column if not exists grain_direction text,
  add column if not exists purchase_increment numeric;

update public.papers
set grain_direction = 'unknown'
where grain_direction is null;

alter table if exists public.papers
  alter column grain_direction set default 'unknown';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'papers_grain_direction_check'
  ) then
    alter table public.papers
      add constraint papers_grain_direction_check
      check (grain_direction in ('long', 'short', 'unknown'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'papers_purchase_increment_check'
  ) then
    alter table public.papers
      add constraint papers_purchase_increment_check
      check (purchase_increment is null or purchase_increment > 0);
  end if;
end
$$;
