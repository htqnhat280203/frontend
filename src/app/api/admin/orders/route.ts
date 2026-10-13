import { requireAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const access = await requireAdmin();
  if (access.error) {
    const status = access.error === "unauthorized" ? 401 : access.error === "forbidden" ? 403 : 503;
    return Response.json({ error: access.error }, { status });
  }

  const { data, error } = await access.client
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return Response.json({ error: "Không tải được đơn hàng." }, { status: 500 });
  if (!data.length) return Response.json([]);

  const orderIds = data.map((order) => order.id);
  const customerIds = [...new Set(data.map((order) => order.customer_id))];
  const [itemsResult, paymentsResult, customersResult, debtsResult] = await Promise.all([
    access.client.from("order_items").select("*").in("order_id", orderIds),
    access.client.from("payments").select("*").in("order_id", orderIds),
    access.client.from("customers").select("*").in("id", customerIds),
    access.client.from("debts").select("id,order_id,status").in("order_id", orderIds),
  ]);

  if (itemsResult.error || paymentsResult.error || customersResult.error || debtsResult.error) {
    return Response.json({ error: "Không tải được chi tiết đơn hàng." }, { status: 500 });
  }

  const result = data.map((order) => ({
    ...order,
    customer: customersResult.data.find((customer) => customer.id === order.customer_id) ?? null,
    items: itemsResult.data.filter((item) => item.order_id === order.id),
    payments: paymentsResult.data.filter((payment) => payment.order_id === order.id),
    debt: debtsResult.data.find((debt) => debt.order_id === order.id) ?? null,
  }));
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}