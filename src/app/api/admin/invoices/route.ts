import { requireAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const access = await requireAdmin();
  if (access.error) {
    const status = access.error === "unauthorized" ? 401 : access.error === "forbidden" ? 403 : 503;
    return Response.json({ error: access.error }, { status });
  }

  const { data, error } = await access.client
    .from("invoices")
    .select("id,items,total,paid_at,payment_method,status,created_at")
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(200);

  if (error) return Response.json({ error: "Không tải được hóa đơn đã thanh toán." }, { status: 500 });
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}