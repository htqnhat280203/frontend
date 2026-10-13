import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";

type OrderRequest = {
  customer?: { name?: unknown; phone?: unknown; email?: unknown; address?: unknown };
  items?: unknown;
  paymentMethod?: unknown;
  promotionCode?: unknown;
  note?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const orderErrorResponse = (code: string, message: string, adminAction = false) => {
  console.error(`[orders] order RPC failed (${code}): ${message}`);

  if (code === "PGRST202") {
    return Response.json(
      { error: adminAction
        ? "Database chưa có hàm chốt đơn tại quầy. Hãy chạy migration 20261004000000_checkout_payment_actions.sql."
        : "Database chưa có hàm place_order. Hãy chạy migration 20261001000000_store_operations.sql." },
      { status: 503 }
    );
  }
  if (code === "42P01" || code === "42703") {
    return Response.json({ error: "Schema database chưa cập nhật. Hãy chạy các migration theo đúng thứ tự." }, { status: 503 });
  }
  if (code === "23503") {
    return Response.json(
      { error: "Hàm đặt hàng trên database đang dùng phiên bản cũ. Hãy chạy lại migration 20261001000000_store_operations.sql." },
      { status: 503 }
    );
  }

  const clientError = /không hợp lệ|chưa đạt|hết hạn|hết lượt|không tồn tại|tối đa|cần có|vui lòng|đã thanh toán/i.test(message);
  return Response.json(
    { error: clientError ? message : "Không tạo được đơn hàng. Vui lòng thử lại." },
    { status: clientError ? 400 : 500 }
  );
};

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return Response.json({ error: "Database chưa được cấu hình." }, { status: 503 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body) || !isRecord(body.customer) || !Array.isArray(body.items)) {
    return Response.json({ error: "Thông tin đặt hàng không hợp lệ." }, { status: 400 });
  }

  const customer = body.customer;
  const name = typeof customer.name === "string" ? customer.name.trim() : "";
  const phone = typeof customer.phone === "string" ? customer.phone.trim() : "";
  const email = typeof customer.email === "string" ? customer.email.trim() : "";
  const address = typeof customer.address === "string" ? customer.address.trim() : "";
  const paymentMethod = typeof body.paymentMethod === "string" ? body.paymentMethod : "";
  const promotionCode = typeof body.promotionCode === "string" ? body.promotionCode.trim() : null;
  const note = typeof body.note === "string" ? body.note.trim() : "";
  const action = body.action;

  if (action !== undefined && action !== "paid" && action !== "unpaid") {
    return Response.json({ error: "Lựa chọn thanh toán không hợp lệ." }, { status: 400 });
  }

  if (name.length < 2 || name.length > 120 || phone.length < 7 || phone.length > 24 || address.length < 5) {
    return Response.json({ error: "Vui lòng nhập tên, số điện thoại và địa chỉ hợp lệ." }, { status: 400 });
  }
  if (!body.items.length || body.items.length > 100) {
    return Response.json({ error: "Đơn hàng cần có từ 1 đến 100 mặt hàng." }, { status: 400 });
  }

  const items = body.items.map((item) => {
    if (!isRecord(item)) return null;
    const productId = typeof item.productId === "string" ? item.productId : "";
    const variantId = typeof item.variantId === "string" ? item.variantId : "";
    const quantity = item.quantity;
    if (!productId || !variantId || !Number.isInteger(quantity) || Number(quantity) < 1 || Number(quantity) > 99) {
      return null;
    }
    return { product_id: productId, variant_id: variantId, quantity: Number(quantity) };
  });

  if (items.some((item) => item === null)) {
    return Response.json({ error: "Có mặt hàng hoặc số lượng không hợp lệ." }, { status: 400 });
  }

  const rpcArgs = {
    p_customer_name: name,
    p_customer_phone: phone,
    p_customer_email: email || null,
    p_customer_address: address,
    p_items: items,
    p_payment_method: paymentMethod,
    p_promotion_code: promotionCode,
    p_note: note,
  };

  if (action === "paid" || action === "unpaid") {
    const access = await requireAdmin();
    if (access.error) {
      const status = access.error === "unauthorized" ? 401 : access.error === "forbidden" ? 403 : 503;
      return Response.json({ error: access.error }, { status });
    }

    const { data, error } = await access.client.rpc("admin_place_order", {
      ...rpcArgs,
      p_action: action,
    });
    if (error) return orderErrorResponse(error.code, error.message, true);
    return Response.json(data[0], { status: 201, headers: { "Cache-Control": "no-store" } });
  }

  const { data, error } = await supabase.rpc("place_order", rpcArgs);

  if (error) return orderErrorResponse(error.code, error.message);

  const order = data[0];
  return Response.json(order, { status: 201, headers: { "Cache-Control": "no-store" } });
}