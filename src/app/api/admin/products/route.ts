import { requireAdmin } from "@/lib/supabase/admin";
import type { ProductDraft } from "@/types/product";

const validateProduct = (value: unknown): value is ProductDraft => {
  if (!value || typeof value !== "object") return false;
  const product = value as Partial<ProductDraft>;
  return Boolean(
    typeof product.name === "string" && product.name.trim() &&
    typeof product.price === "number" && product.price > 0 &&
    typeof product.image === "string" && product.image.trim() &&
    typeof product.unit === "string" && product.unit.trim() &&
    typeof product.category === "string" && product.category.trim() &&
    typeof product.description === "string"
  );
};

export async function GET() {
  const access = await requireAdmin();
  if (access.error) return Response.json({ error: access.error }, { status: access.error === "unauthorized" ? 401 : access.error === "forbidden" ? 403 : 503 });

  const { data, error } = await access.client
    .from("products")
    .select("id,name,price,image,unit,category,description,badge,variants,is_active,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: "Không tải được hàng hóa." }, { status: 500 });
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const access = await requireAdmin();
  if (access.error) return Response.json({ error: access.error }, { status: access.error === "unauthorized" ? 401 : access.error === "forbidden" ? 403 : 503 });

  const body: unknown = await request.json().catch(() => null);
  if (!validateProduct(body)) return Response.json({ error: "Thông tin sản phẩm không hợp lệ." }, { status: 400 });

  const { data, error } = await access.client
    .from("products")
    .insert({
      ...body,
      id: crypto.randomUUID(),
      badge: body.badge ?? null,
      variants: body.variants ?? [],
      is_active: true,
    })
    .select("id,name,price,image,unit,category,description,badge,variants,is_active,created_at,updated_at")
    .single();

  if (error) return Response.json({ error: "Không lưu được sản phẩm." }, { status: 500 });
  return Response.json(data, { status: 201 });
}