alter table public.orders
  drop constraint if exists orders_payment_status_check;

update public.orders
set payment_status = case when payment_status = 'paid' then 'paid' else 'unpaid' end;

alter table public.orders
  alter column payment_status set default 'unpaid',
  add constraint orders_payment_status_check check (payment_status in ('paid', 'unpaid'));

alter table public.debts
  add column if not exists order_id uuid references public.orders(id) on delete set null,
  add column if not exists items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array');

create unique index if not exists debts_order_id_unique_idx
  on public.debts (order_id)
  where order_id is not null;

create or replace function public.admin_mark_order_as_debt(p_order_id uuid)
returns public.debts
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_customer public.customers%rowtype;
  v_debt public.debts%rowtype;
  v_items jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Không có quyền ghi nợ';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Không tìm thấy đơn hàng';
  end if;
  if v_order.payment_status = 'paid' then
    raise exception 'Đơn hàng đã thanh toán, không thể ghi nợ';
  end if;

  select * into v_customer from public.customers where id = v_order.customer_id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id::text,
    'name', product_name,
    'image', product_image,
    'variantLabel', variant_label,
    'qty', quantity,
    'price', unit_price,
    'lineTotal', line_total
  ) order by id), '[]'::jsonb)
  into v_items
  from public.order_items
  where order_id = p_order_id;

  if jsonb_array_length(v_items) = 0 then
    raise exception 'Đơn hàng không có mặt hàng';
  end if;

  insert into public.debts (customer, phone, amount, note, status, order_id, items)
  values (
    v_customer.full_name,
    v_customer.phone,
    v_order.total,
    'Công nợ từ đơn ' || v_order.order_number,
    'unpaid',
    p_order_id,
    v_items
  )
  on conflict (order_id) where order_id is not null do update set
    customer = excluded.customer,
    phone = excluded.phone,
    amount = excluded.amount,
    note = excluded.note,
    items = excluded.items,
    status = 'unpaid',
    updated_at = now()
  returning * into v_debt;

  return v_debt;
end;
$$;

revoke all on function public.admin_mark_order_as_debt(uuid) from public, anon, authenticated;
grant execute on function public.admin_mark_order_as_debt(uuid) to service_role;

create or replace function public.sync_order_debt_payment_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.payment_status = 'paid' and old.payment_status is distinct from new.payment_status then
    update public.debts
    set status = 'paid', updated_at = now()
    where order_id = new.id and status = 'unpaid';
  end if;
  return new;
end;
$$;

 drop trigger if exists sync_order_debt_payment_status on public.orders;
create trigger sync_order_debt_payment_status
  after update of payment_status on public.orders
  for each row execute function public.sync_order_debt_payment_status();
