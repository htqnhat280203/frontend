"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  EMPTY_INVOICE,
  getLatestInvoiceSnapshot,
  subscribeToInvoices,
} from "@/store/invoice-store";
import { formatCurrency } from "@/utils/format-currency";

type OrderReceipt = {
  orderNumber: string;
  total: number;
  createdAt: string;
  paymentStatus?: "paid" | "unpaid";
};

export default function CheckoutSuccessPage() {
  const [orderReceipt, setOrderReceipt] = useState<OrderReceipt | null>(null);
  const invoice = useSyncExternalStore(
    subscribeToInvoices,
    getLatestInvoiceSnapshot,
    () => EMPTY_INVOICE
  );

  useEffect(() => {
    const rawReceipt = window.sessionStorage.getItem("huong-anh-last-order");
    if (!rawReceipt) return;
    try {
      setOrderReceipt(JSON.parse(rawReceipt) as OrderReceipt);
    } catch {
      window.sessionStorage.removeItem("huong-anh-last-order");
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#ffff] px-4 py-10 text-[#6D341B]">
      <div className="mx-auto max-w-2xl rounded-[24px] border border-[#CFAE91] bg-[#f8f5ee23] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-9">
        {orderReceipt ? (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F3DFC1] text-2xl font-black text-[#814C2E]">✓</div>
            <p className="mt-4 text-center text-xs font-bold uppercase tracking-[0.2em] text-[#814C2E]">Hương Anh Market</p>
            <h1 className="mt-2 text-center text-3xl font-black text-[#6D341B]">{orderReceipt.paymentStatus === "paid" ? "Đã thanh toán" : "Đã ghi nhận công nợ"}</h1>
            <p className="mt-2 text-center text-sm text-[#736D46]">{orderReceipt.paymentStatus === "paid" ? "Khoản thu và hóa đơn đã được lưu vào hệ thống." : "Khoản chưa thanh toán đã được lưu vào mục còn nợ."}</p>
            <div className="mt-7 rounded-2xl border border-[#F3DFC1] p-4">
              <div className="flex justify-between gap-4 text-sm"><span className="text-[#736D46]">Mã đơn hàng</span><strong>{orderReceipt.orderNumber}</strong></div>
              <div className="mt-2 flex justify-between gap-4 text-sm"><span className="text-[#736D46]">Thời gian đặt</span><strong>{new Date(orderReceipt.createdAt).toLocaleString("vi-VN")}</strong></div>
              <div className="mt-4 flex justify-between border-t border-[#F3DFC1] pt-4 text-lg font-black"><span>Tổng tiền</span><span className="text-[#814C2E]">{formatCurrency(orderReceipt.total)} ₫</span></div>
              <p className="mt-3 text-sm font-semibold text-[#736D46]">Trạng thái: {orderReceipt.paymentStatus === "paid" ? "Đã thanh toán" : "Còn nợ"}</p>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/admin/invoices" className="rounded-full bg-[#814C2E] px-5 py-3 text-sm font-bold text-white">Mở quản lý hóa đơn</Link><Link href="/shop" className="rounded-full border border-[#CFAE91] px-5 py-3 text-sm font-bold text-[#814C2E]">Tiếp tục mua sắm</Link></div>
          </>
        ) : invoice ? (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F3DFC1] text-2xl font-black text-[#814C2E]">✓</div>
            <p className="mt-4 text-center text-xs font-bold uppercase tracking-[0.2em] text-[#814C2E]">Hương Anh Market</p>
            <h1 className="mt-2 text-center text-3xl font-black text-[#6D341B]">Thanh toán thành công</h1>
            <p className="mt-2 text-center text-sm text-[#736D46]">Hóa đơn đã được lưu trên thiết bị này.</p>

            <div className="mt-7 rounded-2xl border border-[#F3DFC1] p-4">
              <div className="flex justify-between gap-4 text-sm"><span className="text-[#736D46]">Mã hóa đơn</span><strong>{invoice.id}</strong></div>
              <div className="mt-2 flex justify-between gap-4 text-sm"><span className="text-[#736D46]">Thời gian xác nhận</span><strong>{new Date(invoice.paidAt).toLocaleString("vi-VN")}</strong></div>
              <div className="mt-2 flex justify-between gap-4 text-sm"><span className="text-[#736D46]">Hình thức</span><strong>{invoice.paymentMethod}</strong></div>
              <div className="mt-4 border-t border-[#F3DFC1] pt-3">
                {invoice.items.map((item) => <div key={item.id} className="flex justify-between gap-4 py-2 text-sm font-extrabold"><span className="text-[#814C2E]">{item.name}{item.variantLabel ? ` (${item.variantLabel})` : ""} × {item.qty}</span><strong>{formatCurrency(item.price * item.qty)} ₫</strong></div>)}
              </div>
              <div className="mt-2 flex justify-between border-t border-[#F3DFC1] pt-4 text-lg font-black"><span>Tổng đã thu</span><span className="text-[#814C2E]">{formatCurrency(invoice.total)} ₫</span></div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3"><button type="button" onClick={() => window.print()} className="rounded-full border border-[#CFAE91] px-5 py-3 text-sm font-bold text-[#814C2E]">In hóa đơn</button><Link href="/shop" className="rounded-full bg-[#814C2E] px-5 py-3 text-sm font-bold text-white">Tiếp tục mua sắm</Link></div>
            <p className="mt-5 text-center text-xs text-[#736D46]">Hóa đơn đang lưu bằng localStorage trên trình duyệt này.</p>
          </>
        ) : (
          <div className="py-8 text-center"><h1 className="text-2xl font-black text-[#6D341B]">Chưa tìm thấy hóa đơn</h1><p className="mt-2 text-sm text-[#736D46]">Hóa đơn có thể đã được tạo trên một trình duyệt hoặc thiết bị khác.</p><Link href="/shop" className="mt-5 inline-flex rounded-full bg-[#814C2E] px-5 py-3 text-sm font-bold text-white">Về cửa hàng</Link></div>
        )}
      </div>
    </main>
  );
}
