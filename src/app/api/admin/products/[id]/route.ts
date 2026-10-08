import { requireAdmin } from "@/lib/supabase/admin";
import type { ProductDraft } from "@/types/product";

export async function PATCH(request: Request, context: RouteContext<"/api/admin/products/[id]">) {
  const access = await requireAdmin();
  if (access.error) return Response.json({ error: access.error }, { status: access.error === "unauthorized" ? 401 : access.error === "forbidden" ? 403 : 503 });

  const { id } = await context.params;
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Thông tin sản phẩm không hợp lệ." }, { status: 400 });

  const { data, error } = await access.client
    .from("products")
    .update({ ...(body as Partial<ProductDraft>), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id,name,price,image,unit,category,description,badge,variants,is_active,created_at,updated_at")
    .single();

  if (error) return Response.json({ error: "Không cập nhật được sản phẩm." }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(_request: Request, context: RouteContext<"/api/admin/products/[id]">) {
  const access = await requireAdmin();
  if (access.error) return Response.json({ error: access.error }, { status: access.error === "unauthorized" ? 401 : access.error === "forbidden" ? 403 : 503 });

  const { id } = await context.params;
  const { error } = await access.client.from("products").delete().eq("id", id);
  if (error) return Response.json({ error: "Không xóa được sản phẩm." }, { status: 500 });
  return new Response(null, { status: 204 });
}