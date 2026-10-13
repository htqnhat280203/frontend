import { requireAdmin } from "@/lib/supabase/admin";

export async function POST(_request: Request, context: RouteContext<"/api/admin/orders/[id]/debt">) {
  const access = await requireAdmin();
  if (access.error) {
    const status = access.error === "unauthorized" ? 401 : access.error === "forbidden" ? 403 : 503;
    return Response.json({ error: access.error }, { status });
  }

  const { id } = await context.params;
  const { data, error } = await access.client.rpc("admin_mark_order_as_debt", {
    p_order_id: id,
  });

  if (error) {
    const message = error.message.includes("Không tìm thấy") || error.message.includes("đã thanh toán")
      ? error.message
      : error.code === "PGRST202"
        ? "Database chưa có chức năng ghi nợ. Hãy chạy migration 20261003000000_paid_unpaid_debts.sql."
        : "Không ghi được công nợ. Hãy kiểm tra migration và thử lại.";
    return Response.json({ error: message }, { status: error.code === "PGRST202" ? 503 : 400 });
  }

  return Response.json(data, { status: 201 });
}