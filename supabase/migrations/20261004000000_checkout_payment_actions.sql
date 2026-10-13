create or replace function public.admin_place_order(
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_customer_address text,
  p_items jsonb,
  p_payment_method text,
  p_promotion_code text,
  p_note text,
  p_action text
)
returns table (
  order_id uuid,
  order_number text,
  subtotal bigint,
  discount_amount bigint,
  total bigint,
  payment_status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order record;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Không có quyền chốt đơn tại quầy';
  end if;
  if p_action not in ('paid', 'unpaid') then
    raise exception 'Lựa chọn thanh toán không hợp lệ';
  end if;

  select * into v_order
  from public.place_order(
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    p_customer_address,
    p_items,
    p_payment_method,
    p_promotion_code,
    p_note
  );

  if p_action = 'paid' then
    perform public.admin_confirm_order_payment(v_order.order_id);
  else
    perform public.admin_mark_order_as_debt(v_order.order_id);
  end if;

  return query select
    v_order.order_id,
    v_order.order_number,
    v_order.subtotal,
    v_order.discount_amount,
    v_order.total,
    p_action;
end;
$$;

revoke all on function public.admin_place_order(text, text, text, text, jsonb, text, text, text, text) from public, anon, authenticated;
grant execute on function public.admin_place_order(text, text, text, text, jsonb, text, text, text, text) to service_role;

notify pgrst, 'reload schema';
