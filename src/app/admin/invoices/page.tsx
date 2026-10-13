"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminNavigation from "@/components/admin/AdminNavigation";
import { formatCurrency } from "@/utils/format-currency";

type PurchaseRecord = {
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

type PaymentFilter = "all" | "unpaid" | "paid";

const paymentMethodNames: Record<string, string> = {
  cash: "Tiền mặt",
  tpbank: "TPBank",
  mb: "MB Bank",
  bank_transfer: "Chuyển khoản",
};

export default function AdminInvoicesPage() {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState("");

  const loadPurchases = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/orders", { cache: "no-store" });
      const result = (await response.json()) as PurchaseRecord[] | { error?: string };
      if (!response.ok) throw new Error((result as { error?: string }).error ?? "Không tải được danh sách mua hàng.");
      setPurchases(result as PurchaseRecord[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không tải được danh sách mua hàng.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadPurchases(); }, [loadPurchases]);

  const visiblePurchases = useMemo(() => {
    const query = search.trim().toLowerCase();
    return purchases.filter((purchase) => {
      const isPaid = purchase.payment_status === "paid";
      const isOutstanding = purchase.payment_status === "unpaid";
      const matchesFilter = filter === "all" || (filter === "paid" ? isPaid : isOutstanding);
      const searchable = [
        purchase.order_number,
        purchase.customer?.full_name,
        purchase.customer?.phone,
        ...purchase.items.map((item) => item.product_name),
      ].join(" ").toLowerCase();
      return matchesFilter && (!query || searchable.includes(query));
    });
  }, [filter, purchases, search]);

  const paidTotal = purchases.filter((purchase) => purchase.payment_status === "paid").reduce((sum, purchase) => sum + purchase.total, 0);
  const debtTotal = purchases.filter((purchase) => purchase.payment_status === "unpaid").reduce((sum, purchase) => sum + purchase.total, 0);

  const confirmPayment = async (purchase: PurchaseRecord) => {
    if (!window.confirm(`Xác nhận đã nhận đủ ${formatCurrency(purchase.total)} ₫ cho đơn ${purchase.order_number}?`)) return;
    setBusyId(purchase.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/orders/${purchase.id}/confirm-payment`, { method: "POST" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Không xác nhận được thanh toán.");
      await loadPurchases();
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "Không xác nhận được thanh toán.");
    } finally {
      setBusyId("");
    }
  };

  const recordDebt = async (purchase: PurchaseRecord) => {
    if (!window.confirm(`Ghi nhận ${formatCurrency(purchase.total)} ₫ là khoản khách còn nợ cho đơn ${purchase.order_number}?`)) return;
    setBusyId(purchase.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/orders/${purchase.id}/debt`, { method: "POST" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Không ghi được công nợ.");
      await loadPurchases();
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
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#814C2E]">Quản trị cửa hàng</p>
            <h1 className="mt-2 text-3xl font-black">Quản lý hóa đơn</h1>
            <p className="mt-2 text-sm text-[#736D46]">Theo dõi sản phẩm đã mua, ngày mua, số tiền và công nợ.</p>
          </div>
          <AdminNavigation />
        </header>

        {error ? <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}{error.includes("unauthorized") ? <Link href="/admin/login" className="ml-2 font-bold underline">Đăng nhập</Link> : null}</div> : null}

        <section className="grid gap-3 border-y border-[#CFAE91] py-4 sm:grid-cols-3">
          <div><p className="text-xs font-bold uppercase tracking-wide text-[#736D46]">Đơn mua</p><p className="mt-1 text-2xl font-black">{purchases.length}</p></div>
          <div><p className="text-xs font-bold uppercase tracking-wide text-[#736D46]">Đã thanh toán</p><p className="mt-1 text-2xl font-black text-green-800">{formatCurrency(paidTotal)} ₫</p></div>
          <div><p className="text-xs font-bold uppercase tracking-wide text-[#736D46]">Còn nợ / chờ thu</p><p className="mt-1 text-2xl font-black text-amber-800">{formatCurrency(debtTotal)} ₫</p></div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc trạng thái thanh toán">
            {(["all", "unpaid", "paid"] as const).map((value) => (
              <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`rounded-full border px-4 py-2 text-sm font-semibold ${filter === value ? "border-[#814C2E] bg-[#814C2E] text-white" : "border-[#CFAE91] bg-white"}`}>
                {value === "all" ? "Tất cả" : value === "paid" ? "Đã thanh toán" : "Còn nợ"}
              </button>
            ))}
          </div>
          <div className="flex gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã, khách, sản phẩm..." className="w-56 rounded-full border border-[#CFAE91] bg-white px-4 py-2 text-sm" /><button type="button" onClick={() => void loadPurchases()} className="rounded-full border border-[#CFAE91] bg-white px-4 py-2 text-sm font-semibold">Tải lại</button></div>
        </section>

        {isLoading ? <p className="py-12 text-center text-sm text-[#736D46]">Đang tải hóa đơn...</p> : visiblePurchases.length === 0 ? <section className="rounded-2xl border border-[#CFAE91] bg-white p-10 text-center text-sm text-[#736D46]">Không có đơn mua phù hợp.</section> : (
          <div className="space-y-4">
            {visiblePurchases.map((purchase) => {
              const isPaid = purchase.payment_status === "paid";
              const paymentMethod = purchase.payments[0]?.method;
              return (
                <article key={purchase.id} className="rounded-2xl border border-[#CFAE91] bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#F3DFC1] pb-4">
                    <div>
                      <p className="text-xs text-[#736D46]">Ngày mua · {new Date(purchase.created_at).toLocaleString("vi-VN")}</p>
                      <h2 className="mt-1 text-lg font-black">{purchase.order_number}</h2>
                      <p className="mt-1 text-sm font-semibold">{purchase.customer?.full_name ?? "Khách mua hàng"}{purchase.customer?.phone?.startsWith("POS-WALKIN") ? " · Mua tại quầy" : purchase.customer?.phone ? ` · ${purchase.customer.phone}` : " · Chưa có số điện thoại"}</p>
                      <p className="mt-1 text-sm text-[#736D46]">{purchase.customer?.address}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${isPaid ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"}`}>{isPaid ? "Đã thanh toán" : "Chưa thanh toán"}</span>
                      {!isPaid && purchase.debt ? <span className="mt-2 inline-flex rounded-full bg-[#F3DFC1] px-3 py-1 text-xs font-bold text-[#814C2E]">Đã ghi nợ</span> : null}
                      <p className="mt-2 text-xs text-[#736D46]">{paymentMethodNames[paymentMethod ?? ""] ?? paymentMethod ?? "Chưa chọn hình thức"}</p>
                      <p className="mt-1 text-xl font-black text-[#814C2E]">{formatCurrency(purchase.total)} ₫</p>
                    </div>
                  </div>

                  <div className="divide-y divide-[#F3DFC1]">
                    {purchase.items.map((item) => (
                      <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                        <div className="flex min-w-0 items-center gap-3"><img src={item.product_image || "/product-placeholder.svg"} alt={item.product_name} className="h-14 w-14 shrink-0 rounded-lg border border-[#F3DFC1] bg-white object-contain p-1" /><div><p className="font-semibold">{item.product_name}</p><p className="mt-1 text-xs text-[#736D46]">{item.variant_label} · {item.quantity} × {formatCurrency(item.unit_price)} ₫</p></div></div>
                        <strong>{formatCurrency(item.line_total)} ₫</strong>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F3DFC1] pt-4">
                    <div className="text-xs text-[#736D46]">{purchase.discount_amount > 0 ? `Giảm ${formatCurrency(purchase.discount_amount)} ₫ · ` : ""}{isPaid ? "Khoản mua đã thanh toán" : purchase.debt ? "Khoản mua đã được ghi vào công nợ" : "Khoản mua chưa thanh toán"}</div>
                    <div className="flex flex-wrap gap-2">{!isPaid ? <><button type="button" disabled={busyId === purchase.id} onClick={() => void confirmPayment(purchase)} className="rounded-full bg-[#814C2E] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busyId === purchase.id ? "Đang xử lý..." : "Xác nhận đã thanh toán"}</button>{purchase.debt ? <span className="rounded-full border border-[#CFAE91] px-4 py-2.5 text-sm font-semibold text-[#814C2E]">Đã ghi nợ</span> : <button type="button" disabled={busyId === purchase.id} onClick={() => void recordDebt(purchase)} className="rounded-full border border-[#CFAE91] px-4 py-2.5 text-sm font-bold text-[#814C2E] disabled:opacity-50">Ghi nợ</button>}</> : <span className="text-sm font-semibold text-green-800">Đã ghi vào sổ hóa đơn</span>}</div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
