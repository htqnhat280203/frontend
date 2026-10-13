import { requireAdmin } from "@/lib/supabase/admin";

export async function PATCH(request: Request, context: RouteContext<"/api/admin/promotions/[id]">) {
  const access = await requireAdmin();
  if (access.error) {
    const status = access.error === "unauthorized" ? 401 : access.error === "forbidden" ? 403 : 503;
    return Response.json({ error: access.error }, { status });
  }

  const { id } = await context.params;
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !("is_active" in body) || typeof body.is_active !== "boolean") {
    return Response.json({ error: "Thông tin cập nhật không hợp lệ." }, { status: 400 });
  }

  const { data, error } = await access.client
    .from("promotions")
    .update({ is_active: body.is_active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) return Response.json({ error: "Không cập nhật được khuyến mãi." }, { status: 500 });
  if (!data) return Response.json({ error: "Không tìm thấy khuyến mãi." }, { status: 404 });
  return Response.json(data);
}