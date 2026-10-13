"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminNavigation from "@/components/admin/AdminNavigation";
import { formatCurrency } from "@/utils/format-currency";

type ManagedOrder = {
  id: string;
  order_number: string;
  payment_status: "unpaid" | "paid";
  subtotal: number;
  discount_amount: number;
  total: number;
  note: string;
  created_at: string;
  customer: { full_name: string; phone: string; email: string | null; address: string } | null;
  items: { id: string; product_name: string; product_image: string; variant_label: string; quantity: number; unit_price: number; line_total: number }[];
  payments: { method: string; status: string }[];
  debt: { id: string; status: "unpaid" | "paid" } | null;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<ManagedOrder[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState("");

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/orders", { cache: "no-store" });
      const result = (await response.json()) as ManagedOrder[] | { error?: string };
      if (!response.ok) throw new Error((result as { error?: string }).error ?? "Không tải được đơn hàng.");
      setOrders(result as ManagedOrder[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không tải được đơn hàng.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadOrders(); }, [loadOrders]);

  const confirmPayment = async (order: ManagedOrder) => {
    if (!window.confirm(`Xác nhận đã nhận đủ ${formatCurrency(order.total)} ₫ cho đơn ${order.order_number}?`)) return;
    setBusyId(order.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/confirm-payment`, { method: "POST" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Không xác nhận được thanh toán.");
      await loadOrders();
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "Không xác nhận được thanh toán.");
    } finally {
      setBusyId("");
    }
  };

  const recordDebt = async (order: ManagedOrder) => {
    if (!window.confirm(`Ghi nhận ${formatCurrency(order.total)} ₫ là khoản chưa thanh toán của đơn ${order.order_number}?`)) return;
    setBusyId(order.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/debt`, { method: "POST" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Không ghi được công nợ.");
      await loadOrders();
    } catch (debtError) {
      setError(debtError instanceof Error ? debtError.message : "Không ghi được công nợ.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <main className="min-h-screen bg-[#f8f5ee] px-4 py-8 text-[#6D341B]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#814C2E]">Quản trị cửa hàng</p><h1 className="mt-2 text-3xl font-black">Đơn hàng</h1><p className="mt-2 text-sm text-[#736D46]">Xác nhận tiền đã nhận để tạo hóa đơn thanh toán.</p></div>
          <AdminNavigation />
        </header>
        {error ? <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}{error.includes("unauthorized") ? <Link href="/admin/login" className="ml-2 font-bold underline">Đăng nhập</Link> : null}</div> : null}
        <div className="mb-4 flex items-center justify-between"><p className="text-sm font-semibold">{orders.length} đơn gần đây</p><button type="button" onClick={() => void loadOrders()} className="rounded-full border border-[#CFAE91] bg-white px-4 py-2 text-sm font-semibold">Tải lại</button></div>
        {isLoading ? <p className="py-12 text-center text-sm text-[#736D46]">Đang tải đơn hàng...</p> : orders.length === 0 ? <section className="rounded-2xl border border-[#CFAE91] bg-white p-10 text-center text-sm text-[#736D46]">Chưa có đơn hàng.</section> : (
          <div className="space-y-4">
            {orders.map((order) => (
              <article key={order.id} className="rounded-2xl border border-[#CFAE91] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><p className="text-xs text-[#736D46]">{new Date(order.created_at).toLocaleString("vi-VN")}</p><h2 className="mt-1 text-lg font-black">{order.order_number}</h2><p className="mt-1 text-sm font-semibold">{order.customer?.full_name ?? "Khách hàng"}{order.customer?.phone?.startsWith("POS-WALKIN") ? " · Mua tại quầy" : order.customer?.phone ? ` · ${order.customer.phone}` : " · Chưa có số điện thoại"}</p><p className="mt-1 text-sm text-[#736D46]">{order.customer?.address}</p></div>
                  <div className="text-right"><p className={`mt-1 text-sm font-bold ${order.payment_status === "paid" ? "text-green-700" : "text-amber-700"}`}>{order.payment_status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}</p>{order.debt && order.payment_status === "unpaid" ? <p className="mt-1 text-xs font-bold text-[#814C2E]">Đã ghi nợ</p> : null}<p className="mt-1 text-xl font-black text-[#CA6941]">{formatCurrency(order.total)} ₫</p></div>
                </div>
                <div className="mt-4 divide-y divide-[#F3DFC1] border-y border-[#F3DFC1]">
                  {order.items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div className="flex items-center gap-3"><img src={item.product_image || "/product-placeholder.svg"} alt={item.product_name} className="h-14 w-14 rounded-lg border border-[#F3DFC1] object-contain p-1" /><span>{item.product_name} · {item.variant_label} × {item.quantity}<span className="mt-1 block text-xs text-[#736D46]">{formatCurrency(item.unit_price)} ₫ / món</span></span></div><strong>{formatCurrency(item.line_total)} ₫</strong></div>)}
                </div>
                {order.note ? <p className="mt-3 text-sm text-[#736D46]">Ghi chú: {order.note}</p> : null}
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  {order.payment_status === "unpaid" ? <><button type="button" disabled={busyId === order.id} onClick={() => void confirmPayment(order)} className="rounded-full bg-[#814C2E] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busyId === order.id ? "Đang xử lý..." : "Xác nhận đã thanh toán"}</button>{order.debt ? <span className="rounded-full border border-[#CFAE91] px-4 py-2.5 text-sm font-semibold text-[#814C2E]">Đã ghi nợ</span> : <button type="button" disabled={busyId === order.id} onClick={() => void recordDebt(order)} className="rounded-full border border-[#CFAE91] px-5 py-2.5 text-sm font-bold text-[#814C2E] disabled:opacity-50">Ghi nợ</button>}</> : <Link href="/admin/invoices" className="rounded-full border border-[#CFAE91] px-4 py-2 text-sm font-bold">Xem hóa đơn</Link>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}