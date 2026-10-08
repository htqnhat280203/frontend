create table if not exists public.products (
  id text primary key,
  name text not null,
  price bigint not null check (price >= 0),
  image text not null default '',
  unit text not null,
  category text not null,
  description text not null default '',
  badge text,
  variants jsonb not null default '[]'::jsonb check (jsonb_typeof(variants) = 'array'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  customer text not null,
  phone text not null default '',
  amount bigint not null check (amount > 0),
  due_date date,
  note text not null default '',
  status text not null default 'unpaid' check (status in ('unpaid', 'paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id text primary key,
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  total bigint not null check (total >= 0),
  paid_at timestamptz not null,
  payment_method text not null,
  status text not null default 'paid' check (status = 'paid'),
  created_at timestamptz not null default now()
);

create index if not exists products_active_category_idx on public.products (is_active, category);
create index if not exists debts_status_created_at_idx on public.debts (status, created_at desc);
create index if not exists invoices_created_at_idx on public.invoices (created_at desc);

alter table public.products enable row level security;
alter table public.debts enable row level security;
alter table public.invoices enable row level security;

revoke all on table public.products, public.debts, public.invoices from anon, authenticated;
grant select on table public.products to anon, authenticated;
grant select, insert, update, delete on table public.products, public.debts, public.invoices to authenticated;

create policy products_public_read_active
  on public.products for select to anon, authenticated
  using (is_active or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy products_admin_insert
  on public.products for insert to authenticated
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy products_admin_update
  on public.products for update to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy products_admin_delete
  on public.products for delete to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy debts_admin_select
  on public.debts for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy debts_admin_insert
  on public.debts for insert to authenticated
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy debts_admin_update
  on public.debts for update to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy debts_admin_delete
  on public.debts for delete to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy invoices_admin_select
  on public.invoices for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy invoices_admin_insert
  on public.invoices for insert to authenticated
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy invoices_admin_update
  on public.invoices for update to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy invoices_admin_delete
  on public.invoices for delete to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');