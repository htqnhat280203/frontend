"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { isPaymentConfigured, paymentMethods } from "@/data/payment";
import type { PaymentMethod } from "@/types/payment";
import {
  EMPTY_CHECKOUT_ORDER,
  getCheckoutOrderSnapshot,
  subscribeToCheckoutOrder,
} from "@/store/checkout-store";
import type { CartItem } from "@/types/cart";
import PaymentQrCarousel from "@/components/common/PaymentQrCarousel";
import { formatCurrency } from "@/utils/format-currency";

const EMPTY_ITEMS: CartItem[] = [];

export default function CheckoutPage() {
  const router = useRouter();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(paymentMethods[0]);
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "", address: "", note: "" });
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [promotionCode, setPromotionCode] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const order = useSyncExternalStore(
    subscribeToCheckoutOrder,
    getCheckoutOrderSnapshot,
    () => EMPTY_CHECKOUT_ORDER
  );
  const items = order?.items ?? EMPTY_ITEMS;
  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.qty, 0),
    [items]
  );

  const placeOrder = async (action: "paid" | "unpaid") => {
    if (!order || items.length === 0) return;

    setIsSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            address: customer.address,
          },
          items: items.map((item) => {
            const separator = item.id.lastIndexOf(":");
            return {
              productId: separator < 0 ? "" : item.id.slice(0, separator),
              variantId: separator < 0 ? "" : item.id.slice(separator + 1),
              quantity: item.qty,
            };
          }),
          paymentMethod: selectedPaymentMethod.id,
          promotionCode,
          note: customer.note,
          action,
        }),
      });
      const result = (await response.json()) as {
        order_number?: string;
        total?: number;
        payment_status?: "paid" | "unpaid";
        error?: string;
      };
      if (!response.ok || !result.order_number || typeof result.total !== "number" || !result.payment_status) {
        throw new Error(result.error ?? "Không tạo được đơn hàng.");
      }

      window.sessionStorage.setItem("huong-anh-last-order", JSON.stringify({
        orderNumber: result.order_number,
        total: result.total,
        paymentStatus: result.payment_status,
        createdAt: new Date().toISOString(),
      }));
      router.push("/checkout/success");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Không tạo được đơn hàng.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleWalkInCustomer = () => {
    if (isWalkIn) {
      setCustomer({ name: "", phone: "", email: "", address: "", note: "" });
      setIsWalkIn(false);
      return;
    }

    setCustomer((current) => ({
      ...current,
      name: "Khách mua tại quầy",
      phone: "POS-WALKIN-STORE",
      address: "Mua trực tiếp tại cửa hàng",
      email: "",
    }));
    setIsWalkIn(true);
  };

  return (
    <main className="min-h-screen bg-[#ffff] px-4 py-8 text-[#6D341B]">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#814C2E]">Hương Anh Market</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#6D341B]">Thanh toán đơn hàng</h1>
          </div>
          <Link href="/shop" className="rounded-full border border-[#CFAE91] bg-[#FAF2E0] px-4 py-2 text-sm font-semibold text-[#814C2E]">Tiếp tục mua sắm</Link>
        </header>

        {!order || items.length === 0 ? (
          <section className="rounded-[24px] border border-[#CFAE91] bg-[#FAF2E0] p-8 text-center shadow-sm">
            <h2 className="text-xl font-black text-[#6D341B]">Chưa có đơn hàng để thanh toán</h2>
            <p className="mt-2 text-sm text-[#736D46]">Chọn sản phẩm và bấm “Mua ngay” để tạo đơn thanh toán.</p>
            <Link href="/shop" className="mt-5 inline-flex rounded-full bg-[#814C2E] px-5 py-3 text-sm font-bold text-white">Đến trang mua sắm</Link>
          </section>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
            <div className="space-y-5">
              <section className="rounded-[24px] border border-[#CFAE91] bg-[#ffff] p-5 shadow-sm sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h2 className="text-xl font-black text-[#6D341B]">Thông tin nhận hàng</h2><p className="mt-1 text-sm text-[#736D46]">Khách mua tại cửa hàng có thể bỏ qua thông tin giao hàng.</p></div>
                  <button type="button" aria-pressed={isWalkIn} onClick={toggleWalkInCustomer} className={`rounded-full border px-4 py-2 text-sm font-bold ${isWalkIn ? "border-[#814C2E] bg-[#814C2E] text-white" : "border-[#CFAE91] bg-white text-[#814C2E]"}`}>{isWalkIn ? "Đang chọn khách tại quầy · Bỏ chọn" : "Khách mua tại quầy"}</button>
                </div>
                {isWalkIn ? <p className="mt-3 rounded-xl bg-[#FAF2E0] px-3 py-2 text-xs text-[#736D46]">Đã tự điền hồ sơ khách mua tại quầy. Bạn vẫn có thể sửa các trường bên dưới nếu muốn lưu thông tin riêng.</p> : null}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-semibold">Họ và tên<input required value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} className="mt-2 w-full rounded-xl border border-[#CFAE91] px-3 py-3 font-normal" autoComplete="name" /></label>
                  <label className="text-sm font-semibold">Số điện thoại<input required type="tel" value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} className="mt-2 w-full rounded-xl border border-[#CFAE91] px-3 py-3 font-normal" autoComplete="tel" /></label>
                  <label className="text-sm font-semibold sm:col-span-2">Địa chỉ giao hàng<input required value={customer.address} onChange={(event) => setCustomer({ ...customer, address: event.target.value })} className="mt-2 w-full rounded-xl border border-[#CFAE91] px-3 py-3 font-normal" autoComplete="street-address" /></label>
                  <label className="text-sm font-semibold">Email (không bắt buộc)<input type="email" value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} className="mt-2 w-full rounded-xl border border-[#CFAE91] px-3 py-3 font-normal" autoComplete="email" /></label>
                  <label className="text-sm font-semibold">Mã khuyến mãi<input value={promotionCode} onChange={(event) => setPromotionCode(event.target.value)} className="mt-2 w-full rounded-xl border border-[#CFAE91] px-3 py-3 font-normal" placeholder="Nếu có" /></label>
                  <label className="text-sm font-semibold sm:col-span-2">Ghi chú<textarea value={customer.note} onChange={(event) => setCustomer({ ...customer, note: event.target.value })} className="mt-2 min-h-20 w-full rounded-xl border border-[#CFAE91] px-3 py-3 font-normal" /></label>
                </div>
              </section>

              <section className="rounded-[24px] border border-[#CFAE91] bg-[#ffff] p-5 shadow-sm sm:p-7">
                <h2 className="text-xl font-black text-[#6D341B]">Sản phẩm đã chọn</h2>
                <div className="mt-5 space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-[#F3DFC1] p-3">
                      <img src={item.image} alt={item.name} className="h-20 w-20 rounded-xl bg-[#ffff] object-contain p-1" />
                      <div className="min-w-0 flex-1"><h3 className="font-semibold text-[#6D341B]">{item.name}</h3>{item.variantLabel ? <p className="mt-1 text-xs text-[#736D46]">Quy cách: {item.variantLabel} ({item.baseQuantity} đơn vị gốc)</p> : null}<p className="mt-1 text-sm text-[#736D46]">Số lượng: {item.qty} × {formatCurrency(item.price)} ₫</p></div>
                      <strong className="text-right text-[#CA6941]">{formatCurrency(item.qty * item.price)} ₫</strong>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-[#F3DFC1] pt-5 text-lg font-bold"><span>Tạm tính</span><span className="text-2xl text-[#CA6941]">{formatCurrency(total)} ₫</span></div>
                <p className="mt-2 text-xs text-[#736D46]">Giá cuối cùng và mức giảm giá sẽ được xác nhận từ cơ sở dữ liệu khi đặt hàng.</p>
              </section>
            </div>

            <aside className="rounded-[24px] border border-[#CFAE91] bg-[#ffff] p-5 text-center shadow-sm sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#814C2E]">Chuyển khoản VietQR</p>
              <h2 className="mt-2 text-xl font-black text-[#6D341B]">Quét mã để thanh toán</h2>
              {isPaymentConfigured ? (
                <>
                  <div className="mt-4">
                    <PaymentQrCarousel amount={total} reference={order.id} onMethodChange={setSelectedPaymentMethod} />
                  </div>
                </>
              ) : (
                <div className="mt-5 rounded-2xl border border-[#CFAE91] bg-[#ffff] p-4 text-left text-sm leading-6 text-[#6D341B]">Chưa cấu hình tài khoản nhận tiền. Hãy cập nhật ngân hàng, số tài khoản và tên chủ tài khoản trong <strong>app/data/payment.ts</strong> để tạo mã QR thanh toán thật.</div>
              )}
              <p className="mt-4 text-xs leading-5 text-[#736D46]">Chỉ chọn “Đã xác nhận thanh toán” sau khi đã kiểm tra nhận đủ tiền. Chọn “Ghi nợ” nếu khách chưa thanh toán.</p>
              {submitError ? <div role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-left text-sm text-red-700">{submitError}{submitError.includes("unauthorized") ? <Link href="/admin/login" className="ml-1 font-bold underline">Đăng nhập quản trị</Link> : null}{submitError.includes("forbidden") ? <span className="ml-1">Email này chưa được cấp quyền admin.</span> : null}</div> : null}
              <div className="mt-4 grid gap-2">
                <button type="button" onClick={() => void placeOrder("paid")} disabled={isSubmitting} className="w-full rounded-full bg-[#814C2E] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#6D341B] disabled:cursor-wait disabled:opacity-60">{isSubmitting ? "Đang lưu giao dịch..." : "Đã xác nhận thanh toán"}</button>
                <button type="button" onClick={() => void placeOrder("unpaid")} disabled={isSubmitting} className="w-full rounded-full border border-[#CFAE91] bg-white px-5 py-3 text-sm font-bold text-[#814C2E] disabled:cursor-wait disabled:opacity-60">Ghi nợ</button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}