import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return Response.json({ error: "Database chưa được cấu hình." }, { status: 503 });

  const { data, error } = await supabase
    .from("promotions")
    .select("id,code,description,discount_type,discount_value,min_subtotal,starts_at,ends_at")
    .eq("is_active", true)
    .lte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: false });

  if (error) return Response.json({ error: "Không tải được khuyến mãi." }, { status: 500 });
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}