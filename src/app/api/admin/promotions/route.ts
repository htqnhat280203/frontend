import { requireAdmin } from "@/lib/supabase/admin";

const validPromotion = (value: unknown) => {
  if (!value || typeof value !== "object") return false;
  const promotion = value as Record<string, unknown>;
  return typeof promotion.code === "string" && /^[A-Za-z0-9_-]{3,32}$/.test(promotion.code.trim())
    && typeof promotion.description === "string"
    && (promotion.discount_type === "percent" || promotion.discount_type === "fixed")
    && Number.isInteger(promotion.discount_value) && Number(promotion.discount_value) > 0
    && (promotion.discount_type !== "percent" || Number(promotion.discount_value) <= 100)
    && Number.isInteger(promotion.min_subtotal) && Number(promotion.min_subtotal) >= 0
    && (promotion.ends_at === null || typeof promotion.ends_at === "string")
    && (promotion.max_redemptions === null || (Number.isInteger(promotion.max_redemptions) && Number(promotion.max_redemptions) > 0));
};

export async function GET() {
  const access = await requireAdmin();
  if (access.error) {
    const status = access.error === "unauthorized" ? 401 : access.error === "forbidden" ? 403 : 503;
    return Response.json({ error: access.error }, { status });
  }

  const { data, error } = await access.client
    .from("promotions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: "Không tải được khuyến mãi." }, { status: 500 });
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const access = await requireAdmin();
  if (access.error) {
    const status = access.error === "unauthorized" ? 401 : access.error === "forbidden" ? 403 : 503;
    return Response.json({ error: access.error }, { status });
  }

  const body: unknown = await request.json().catch(() => null);
  if (!validPromotion(body)) return Response.json({ error: "Thông tin khuyến mãi không hợp lệ." }, { status: 400 });
  const input = body as {
    code: string; description: string; discount_type: "percent" | "fixed";
    discount_value: number; min_subtotal: number; ends_at: string | null; max_redemptions: number | null;
  };

  const { data, error } = await access.client
    .from("promotions")
    .insert({
      code: input.code.trim().toUpperCase(),
      description: input.description.trim(),
      discount_type: input.discount_type,
      discount_value: input.discount_value,
      min_subtotal: input.min_subtotal,
      starts_at: new Date().toISOString(),
      ends_at: input.ends_at,
      max_redemptions: input.max_redemptions,
      redemption_count: 0,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) return Response.json({ error: "Không tạo được mã giảm giá. Mã có thể đã tồn tại." }, { status: 400 });
  return Response.json(data, { status: 201 });
}