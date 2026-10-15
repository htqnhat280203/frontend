import { products as fallbackProducts } from "@/data/products";
import { getSupabaseConfigurationIssue, isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/types/product";

export async function GET() {
  const configurationIssue = getSupabaseConfigurationIssue();
  if (configurationIssue) return Response.json({ error: configurationIssue }, { status: 503 });
  if (!isSupabaseConfigured()) return Response.json(fallbackProducts);

  const supabase = await createClient();
  if (!supabase) return Response.json({ error: "Database chưa cấu hình." }, { status: 503 });

  const { data, error } = await supabase
    .from("products")
    .select("id,name,price,image,unit,category,description,badge,variants")
    .eq("is_active", true)
    .order("name");

  if (error) return Response.json({ error: "Không tải được danh sách hàng hóa." }, { status: 500 });

  const result: Product[] = data.map((row) => ({ ...row, badge: row.badge ?? undefined }));
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}