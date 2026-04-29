-- Geometry engine support: sheet/roll substrate fields

alter table if exists public.papers
  add column if not exists substrate_kind text,
  add column if not exists roll_width_cm numeric,
  add column if not exists pricing_mode text,
  add column if not exists cost_per_linear_meter numeric,
  add column if not exists cost_per_square_meter numeric;

update public.papers
set substrate_kind = 'sheet'
where substrate_kind is null;

alter table if exists public.papers
  alter column substrate_kind set default 'sheet';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'papers_substrate_kind_check'
  ) then
    alter table public.papers
      add constraint papers_substrate_kind_check
      check (substrate_kind in ('sheet', 'roll'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'papers_pricing_mode_check'
  ) then
    alter table public.papers
      add constraint papers_pricing_mode_check
      check (pricing_mode is null or pricing_mode in ('linear_meter', 'square_meter'));
  end if;
end
$$;
