create or replace function public.admin_confirm_order_payment(p_order_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_invoice public.invoices%rowtype;
  v_items jsonb;
  v_paid_at timestamptz := now();
  v_payment_method text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Không có quyền xác nhận thanh toán';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Không tìm thấy đơn hàng';
  end if;
  if v_order.status = 'cancelled' then
    raise exception 'Không thể xác nhận thanh toán cho đơn đã hủy';
  end if;

  select * into v_invoice from public.invoices where id = v_order.order_number;
  if found then
    return v_invoice;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id::text,
    'name', product_name,
    'qty', quantity,
    'price', unit_price,
    'image', product_image,
    'variantLabel', variant_label
  ) order by id), '[]'::jsonb)
  into v_items
  from public.order_items
  where order_id = p_order_id;

  if jsonb_array_length(v_items) = 0 then
    raise exception 'Đơn hàng không có mặt hàng';
  end if;

  select case method
    when 'cash' then 'Tiền mặt'
    when 'tpbank' then 'Chuyển khoản TPBank'
    when 'mb' then 'Chuyển khoản MB Bank'
    else 'Chuyển khoản'
  end into v_payment_method
  from public.payments
  where order_id = p_order_id
  order by created_at desc
  limit 1;

  if v_payment_method is null then
    raise exception 'Không tìm thấy phương thức thanh toán';
  end if;

  update public.orders
  set payment_status = 'paid',
      status = case when status = 'pending' then 'confirmed' else status end,
      updated_at = v_paid_at
  where id = p_order_id;

  update public.payments
  set status = 'paid', paid_at = v_paid_at, updated_at = v_paid_at
  where order_id = p_order_id and status in ('pending', 'failed');

  insert into public.invoices (id, items, total, paid_at, payment_method, status)
  values (v_order.order_number, v_items, v_order.total, v_paid_at, v_payment_method, 'paid')
  returning * into v_invoice;

  return v_invoice;
end;
$$;

revoke all on function public.admin_confirm_order_payment(uuid) from public, anon, authenticated;
grant execute on function public.admin_confirm_order_payment(uuid) to service_role;

notify pgrst, 'reload schema';
