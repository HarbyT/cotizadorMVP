-- Initial schema for CotiHuellas cloud mode (Supabase/Postgres)

create extension if not exists pgcrypto;

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce((select role from public.users where id = auth.uid()), 'seller');
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null check (role in ('admin', 'seller')),
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id text primary key,
  name text not null,
  company text,
  email text,
  phone text,
  document_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.papers (
  id text primary key,
  name text not null,
  weight_grams numeric,
  format_width numeric not null,
  format_height numeric not null,
  cost_per_sheet numeric not null,
  provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.machines (
  id text primary key,
  name text not null,
  technology text not null check (technology in ('Offset', 'Digital', 'Gran Formato', 'Plotter', 'Flexo')),
  charge_type text check (charge_type in ('Policromia', 'Color')),
  max_width numeric not null,
  max_height numeric not null,
  min_width numeric not null,
  min_height numeric not null,
  gripper_margin numeric not null,
  setup_cost numeric not null,
  plates_cost numeric,
  variable_cost numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inks (
  id text primary key,
  type text not null,
  base_cost numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plates (
  id text primary key,
  name text not null,
  base_cost numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finishes (
  id text primary key,
  name text not null,
  charge_type text not null check (charge_type in ('Pliego', 'Millar', 'Unidad', 'Global')),
  setup_cost numeric not null,
  variable_cost numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pop_items (
  id text primary key,
  name text not null,
  description text not null,
  unit_cost numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_config (
  id text primary key,
  name text not null,
  document_id text not null,
  phone text not null,
  address text not null,
  email text not null,
  terms_and_conditions text,
  presentation_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotes (
  id text primary key,
  date timestamptz not null,
  client_name text not null,
  subtotal numeric not null,
  status text not null check (status in ('Aprobada', 'En Seguimiento')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_items (
  quote_id text not null references public.quotes(id) on delete cascade,
  id text not null,
  reference text not null,
  product_name text not null,
  description text not null,
  quantity integer not null,
  unit_price numeric not null,
  subtotal numeric not null,
  specs jsonb not null,
  created_at timestamptz not null default now(),
  primary key (quote_id, id)
);

create table if not exists public.audit_events (
  id bigserial primary key,
  actor_user_id uuid references auth.users(id),
  event_type text not null,
  entity_type text not null,
  entity_id text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_quotes_date on public.quotes(date desc);
create index if not exists idx_quote_items_quote_id on public.quote_items(quote_id);
create index if not exists idx_audit_events_created_at on public.audit_events(created_at desc);

create trigger trg_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create trigger trg_papers_updated_at
before update on public.papers
for each row execute function public.set_updated_at();

create trigger trg_machines_updated_at
before update on public.machines
for each row execute function public.set_updated_at();

create trigger trg_inks_updated_at
before update on public.inks
for each row execute function public.set_updated_at();

create trigger trg_plates_updated_at
before update on public.plates
for each row execute function public.set_updated_at();

create trigger trg_finishes_updated_at
before update on public.finishes
for each row execute function public.set_updated_at();

create trigger trg_pop_items_updated_at
before update on public.pop_items
for each row execute function public.set_updated_at();

create trigger trg_company_config_updated_at
before update on public.company_config
for each row execute function public.set_updated_at();

create trigger trg_quotes_updated_at
before update on public.quotes
for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.papers enable row level security;
alter table public.machines enable row level security;
alter table public.inks enable row level security;
alter table public.plates enable row level security;
alter table public.finishes enable row level security;
alter table public.pop_items enable row level security;
alter table public.company_config enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.audit_events enable row level security;

-- Read access for all authenticated users
create policy if not exists users_read on public.users for select to authenticated using (true);
create policy if not exists clients_read on public.clients for select to authenticated using (true);
create policy if not exists papers_read on public.papers for select to authenticated using (true);
create policy if not exists machines_read on public.machines for select to authenticated using (true);
create policy if not exists inks_read on public.inks for select to authenticated using (true);
create policy if not exists plates_read on public.plates for select to authenticated using (true);
create policy if not exists finishes_read on public.finishes for select to authenticated using (true);
create policy if not exists pop_items_read on public.pop_items for select to authenticated using (true);
create policy if not exists company_config_read on public.company_config for select to authenticated using (true);
create policy if not exists quotes_read on public.quotes for select to authenticated using (true);
create policy if not exists quote_items_read on public.quote_items for select to authenticated using (true);
create policy if not exists audit_events_read on public.audit_events for select to authenticated using (true);

-- Admin writes for catalog + configuration
create policy if not exists users_admin_write on public.users for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy if not exists clients_admin_write on public.clients for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy if not exists papers_admin_write on public.papers for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy if not exists machines_admin_write on public.machines for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy if not exists inks_admin_write on public.inks for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy if not exists plates_admin_write on public.plates for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy if not exists finishes_admin_write on public.finishes for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy if not exists pop_items_admin_write on public.pop_items for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy if not exists company_config_admin_write on public.company_config for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- Sellers and admins can write quotes
create policy if not exists quotes_write on public.quotes for all to authenticated
using (public.current_app_role() in ('admin', 'seller'))
with check (public.current_app_role() in ('admin', 'seller'));

create policy if not exists quote_items_write on public.quote_items for all to authenticated
using (public.current_app_role() in ('admin', 'seller'))
with check (public.current_app_role() in ('admin', 'seller'));

create policy if not exists audit_events_write on public.audit_events for insert to authenticated
with check (public.current_app_role() in ('admin', 'seller'));

insert into public.company_config (id, name, document_id, phone, address, email, terms_and_conditions, presentation_message)
values (
  'default',
  'HUELLAS LITOGRAFICAS',
  '900.123.456-7',
  '+57 300 123 4567',
  'Calle Falsa 123, Bogota D.C.',
  'comercial@huellaslitograficas.com',
  '- Validez: 30 dias calendario.\n- Pago: 50% anticipo al aprobar, 50% contra entrega.',
  'Es un placer para nuestra compania presentar a su consideracion la siguiente oferta comercial.'
)
on conflict (id) do nothing;