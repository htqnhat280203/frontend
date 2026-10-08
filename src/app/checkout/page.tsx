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
import { savePaidInvoice } from "@/store/invoice-store";
import type { CartItem } from "@/types/cart";
import PaymentQrCarousel from "@/components/common/PaymentQrCarousel";
import { formatCurrency } from "@/utils/format-currency";

const EMPTY_ITEMS: CartItem[] = [];

export default function CheckoutPage() {
  const router = useRouter();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(paymentMethods[0]);
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

  const confirmPaymentReceived = () => {
    if (!order || items.length === 0) return;
    savePaidInvoice({
      id: order.id,
      items,
      total,
      paidAt: new Date().toISOString(),
      paymentMethod: selectedPaymentMethod.type === "cash" ? "Tiền mặt" : `Chuyển khoản ${selectedPaymentMethod.account.bankName}`,
      status: "paid",
    });
    router.push("/checkout/success");
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
              <div className="mt-5 flex items-center justify-between border-t border-[#F3DFC1] pt-5 text-lg font-bold"><span>Tổng thanh toán</span><span className="text-2xl text-[#CA6941]">{formatCurrency(total)} ₫</span></div>
            </section>

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
              {isPaymentConfigured ? <><p className="mt-4 text-xs leading-5 text-[#736D46]">{selectedPaymentMethod.type === "cash" ? "Chỉ xác nhận sau khi nhân viên đã thu đủ tiền mặt." : "Chủ cửa hàng xác nhận sau khi đã kiểm tra tiền vào tài khoản đã chọn."}</p><button type="button" onClick={confirmPaymentReceived} className="mt-4 w-full rounded-full bg-[#814C2E] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#6D341B]">Xác nhận đã nhận tiền</button></> : <p className="mt-4 text-xs leading-5 text-[#736D46]">Vui lòng kiểm tra số tiền trước khi chuyển khoản.</p>}
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}