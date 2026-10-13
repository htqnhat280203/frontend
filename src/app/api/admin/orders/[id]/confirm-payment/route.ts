import { requireAdmin } from "@/lib/supabase/admin";

export async function POST(_request: Request, context: RouteContext<"/api/admin/orders/[id]/confirm-payment">) {
  const access = await requireAdmin();
  if (access.error) {
    const status = access.error === "unauthorized" ? 401 : access.error === "forbidden" ? 403 : 503;
    return Response.json({ error: access.error }, { status });
  }

  const { id } = await context.params;
  const { data, error } = await access.client.rpc("admin_confirm_order_payment", {
    p_order_id: id,
  });

  if (error) {
    if (error.code === "PGRST202") {
      console.error(`[admin-payment] confirmation RPC missing (${error.code}): ${error.message}`);
      return Response.json(
        { error: "Database chưa có hàm xác nhận thanh toán. Hãy chạy migration 20261002000000_paid_invoice_confirmation.sql trên đúng Supabase project." },
        { status: 503 }
      );
    }

    console.error(`[admin-payment] confirmation RPC failed (${error.code ?? "unknown"}): ${error.message}`);
    const message = error.message.includes("Không tìm thấy")
      ? error.message
      : error.message.includes("Không thể") || error.message.includes("không có")
        ? error.message
        : "Không xác nhận được thanh toán.";
    return Response.json({ error: message }, { status: 400 });
  }
  return Response.json(data);
}