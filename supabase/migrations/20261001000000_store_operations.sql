create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  phone text not null unique check (length(trim(phone)) between 7 and 24),
  email text,
  address text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  description text not null default '',
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value bigint not null check (discount_value > 0),
  min_subtotal bigint not null default 0 check (min_subtotal >= 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check (discount_type <> 'percent' or discount_value <= 100)
);

create unique index if not exists promotions_code_unique_idx on public.promotions (upper(code));

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'preparing', 'shipping', 'completed', 'cancelled')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  subtotal bigint not null check (subtotal >= 0),
  discount_amount bigint not null default 0 check (discount_amount >= 0),
  total bigint not null check (total >= 0),
  promotion_id uuid references public.promotions(id) on delete set null,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total = subtotal - discount_amount)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  product_name text not null,
  product_image text not null default '',
  unit text not null,
  variant_id text not null,
  variant_label text not null,
  quantity integer not null check (quantity > 0),
  unit_price bigint not null check (unit_price >= 0),
  line_total bigint not null check (line_total = quantity * unit_price)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  amount bigint not null check (amount >= 0),
  method text not null check (method in ('cash', 'tpbank', 'mb', 'bank_transfer')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  transaction_reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_customer_created_idx on public.orders (customer_id, created_at desc);
create index if not exists orders_status_created_idx on public.orders (status, created_at desc);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists payments_order_idx on public.payments (order_id, created_at desc);
create index if not exists promotions_active_dates_idx on public.promotions (is_active, starts_at, ends_at);

alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.promotions enable row level security;

revoke all on table public.customers, public.orders, public.order_items, public.payments, public.promotions from anon, authenticated;
grant select, insert, update, delete on table public.customers, public.orders, public.order_items, public.payments, public.promotions to authenticated;
grant select on table public.promotions to anon;

drop policy if exists customers_admin_all on public.customers;
create policy customers_admin_all on public.customers for all to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists orders_admin_all on public.orders;
create policy orders_admin_all on public.orders for all to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists order_items_admin_all on public.order_items;
create policy order_items_admin_all on public.order_items for all to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists payments_admin_all on public.payments;
create policy payments_admin_all on public.payments for all to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists promotions_admin_all on public.promotions;
create policy promotions_admin_all on public.promotions for all to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists promotions_public_read_active on public.promotions;
create policy promotions_public_read_active on public.promotions for select to anon, authenticated
  using (is_active and starts_at <= now() and (ends_at is null or ends_at > now()));

create or replace function public.place_order(
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_customer_address text,
  p_items jsonb,
  p_payment_method text,
  p_promotion_code text default null,
  p_note text default ''
)
returns table (
  order_id uuid,
  order_number text,
  subtotal bigint,
  discount_amount bigint,
  total bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer_id uuid;
  v_order_id uuid := gen_random_uuid();
  v_order_number text;
  v_product public.products%rowtype;
  v_item jsonb;
  v_product_id text;
  v_variant_id text;
  v_variant jsonb;
  v_order_item jsonb;
  v_order_items jsonb := '[]'::jsonb;
  v_quantity integer;
  v_unit_price bigint;
  v_variant_label text;
  v_subtotal bigint := 0;
  v_discount_amount bigint := 0;
  v_total bigint;
  v_promotion public.promotions%rowtype;
  v_promotion_id uuid := null;
  v_promotion_code text;
begin
  if length(trim(coalesce(p_customer_name, ''))) not between 2 and 120 then
    raise exception 'Tên khách hàng không hợp lệ';
  end if;
  if length(trim(coalesce(p_customer_phone, ''))) not between 7 and 24 then
    raise exception 'Số điện thoại không hợp lệ';
  end if;
  if length(trim(coalesce(p_customer_address, ''))) < 5 then
    raise exception 'Vui lòng nhập địa chỉ giao hàng';
  end if;
  if p_payment_method not in ('cash', 'tpbank', 'mb', 'bank_transfer') then
    raise exception 'Phương thức thanh toán không hợp lệ';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 100 then
    raise exception 'Đơn hàng cần có từ 1 đến 100 sản phẩm';
  end if;

  insert into public.customers (full_name, phone, email, address)
  values (trim(p_customer_name), trim(p_customer_phone), nullif(trim(coalesce(p_customer_email, '')), ''), trim(p_customer_address))
  on conflict (phone) do update set
    full_name = excluded.full_name,
    email = coalesce(excluded.email, customers.email),
    address = excluded.address,
    updated_at = now()
  returning id into v_customer_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_product_id := nullif(v_item ->> 'product_id', '');
    v_variant_id := nullif(v_item ->> 'variant_id', '');
    if coalesce(v_item ->> 'quantity', '') !~ '^[1-9][0-9]*$' then
      raise exception 'Số lượng sản phẩm không hợp lệ';
    end if;
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity > 99 then
      raise exception 'Mỗi mặt hàng chỉ được đặt tối đa 99 đơn vị';
    end if;

    select * into v_product from public.products where id = v_product_id and is_active = true;
    if not found then
      raise exception 'Sản phẩm không tồn tại hoặc đã ngừng bán';
    end if;

    if v_variant_id = 'base' then
      v_unit_price := v_product.price;
      v_variant_label := v_product.unit;
    else
      select value into v_variant
      from jsonb_array_elements(v_product.variants)
      where value ->> 'id' = v_variant_id
      limit 1;
      if v_variant is null then
        raise exception 'Quy cách sản phẩm không hợp lệ';
      end if;
      v_unit_price := (v_variant ->> 'price')::bigint;
      v_variant_label := v_variant ->> 'label';
    end if;

    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
    v_order_items := v_order_items || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'product_name', v_product.name,
      'product_image', v_product.image,
      'unit', v_product.unit,
      'variant_id', v_variant_id,
      'variant_label', v_variant_label,
      'quantity', v_quantity,
      'unit_price', v_unit_price
    ));
  end loop;

  if nullif(trim(coalesce(p_promotion_code, '')), '') is not null then
    v_promotion_code := upper(trim(p_promotion_code));
    select * into v_promotion from public.promotions
    where upper(code) = v_promotion_code
      and is_active = true
      and starts_at <= now()
      and (ends_at is null or ends_at > now())
    for update;

    if not found then
      raise exception 'Mã khuyến mãi không hợp lệ hoặc đã hết hạn';
    end if;
    if v_subtotal < v_promotion.min_subtotal then
      raise exception 'Đơn hàng chưa đạt giá trị tối thiểu của mã khuyến mãi';
    end if;
    if v_promotion.max_redemptions is not null and v_promotion.redemption_count >= v_promotion.max_redemptions then
      raise exception 'Mã khuyến mãi đã hết lượt sử dụng';
    end if;

    if v_promotion.discount_type = 'percent' then
      v_discount_amount := floor(v_subtotal * v_promotion.discount_value / 100.0);
    else
      v_discount_amount := least(v_subtotal, v_promotion.discount_value);
    end if;
    v_promotion_id := v_promotion.id;
    update public.promotions set redemption_count = redemption_count + 1, updated_at = now()
    where id = v_promotion.id;
  end if;

  v_total := v_subtotal - v_discount_amount;
  v_order_number := 'HA-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(v_order_id::text, '-', ''), 1, 8));

  insert into public.orders (
    id, order_number, customer_id, subtotal, discount_amount, total, promotion_id, note
  ) values (
    v_order_id, v_order_number, v_customer_id, v_subtotal, v_discount_amount, v_total,
    v_promotion_id, left(coalesce(p_note, ''), 1000)
  );

  for v_order_item in select value from jsonb_array_elements(v_order_items) loop
    insert into public.order_items (
      order_id, product_id, product_name, product_image, unit,
      variant_id, variant_label, quantity, unit_price, line_total
    ) values (
      v_order_id,
      v_order_item ->> 'product_id',
      v_order_item ->> 'product_name',
      v_order_item ->> 'product_image',
      v_order_item ->> 'unit',
      v_order_item ->> 'variant_id',
      v_order_item ->> 'variant_label',
      (v_order_item ->> 'quantity')::integer,
      (v_order_item ->> 'unit_price')::bigint,
      (v_order_item ->> 'quantity')::integer * (v_order_item ->> 'unit_price')::bigint
    );
  end loop;

  insert into public.payments (order_id, amount, method, status)
  values (v_order_id, v_total, p_payment_method, 'pending');

  return query select v_order_id, v_order_number, v_subtotal, v_discount_amount, v_total;
end;
$$;

revoke all on function public.place_order(text, text, text, text, jsonb, text, text, text) from public;
grant execute on function public.place_order(text, text, text, text, jsonb, text, text, text) to anon, authenticated;
