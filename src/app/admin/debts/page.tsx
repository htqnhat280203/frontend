"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type Debt = {
  id: string;
  customer: string;
  phone: string;
  amount: number;
  dueDate: string;
  note: string;
  status: "unpaid" | "paid";
};

const STORAGE_KEY = "huong-anh-debts";
const emptyForm = { customer: "", phone: "", amount: 0, dueDate: "", note: "" };

const readDebts = (): Debt[] => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Debt[];
  } catch {
    return [];
  }
};

const formatCurrency = (value: number) => value.toLocaleString("vi-VN");

export default function DebtAdminPage() {
  const [debts, setDebts] = useState<Debt[]>(readDebts);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");

  const unpaidTotal = useMemo(
    () => debts.filter((debt) => debt.status === "unpaid").reduce((total, debt) => total + debt.amount, 0),
    [debts]
  );

  const saveDebts = (nextDebts: Debt[]) => {
    setDebts(nextDebts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDebts));
  };

  const addDebt = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.customer.trim() || form.amount <= 0) {
      setMessage("Vui lòng nhập tên người nợ và số tiền hợp lệ.");
      return;
    }

    saveDebts([
      { ...form, id: `debt-${Date.now()}`, customer: form.customer.trim(), phone: form.phone.trim(), note: form.note.trim(), status: "unpaid" },
      ...debts,
    ]);
    setForm(emptyForm);
    setMessage("Đã thêm khoản công nợ.");
  };

  const togglePaid = (debt: Debt) => {
    saveDebts(debts.map((item) => (item.id === debt.id ? { ...item, status: item.status === "paid" ? "unpaid" : "paid" } : item)));
  };

  const deleteDebt = (debt: Debt) => {
    if (window.confirm(`Xóa khoản nợ của ${debt.customer}?`)) {
      saveDebts(debts.filter((item) => item.id !== debt.id));
    }
  };

  return (
    <main className="min-h-screen bg-[#ffff] px-4 py-8 text-[#6D341B]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#814C2E]">Kiểm soát dòng tiền</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#6D341B]">Quản lý công nợ</h1>
            <p className="mt-2 text-sm text-[#736D46]">Theo dõi những khoản khách còn thiếu để hạn chế thất thoát.</p>
          </div>
          <Link href="/" className="rounded-full border border-[#CFAE91] bg-[#FAF2E0] px-4 py-2 text-sm font-semibold text-[#814C2E]">Về trang chính</Link>
        </header>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[20px] border border-[#d5d2d263] bg-[#F3DFC1] p-5"><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#6D341B]">Tổng chưa thu</p><p className="mt-2 text-2xl font-black text-[#814C2E]">{formatCurrency(unpaidTotal)} ₫</p></div>
          <div className="rounded-[20px] border border-[#d5d2d263] bg-[#FAF2E0] p-5"><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#736D46]">Khoản chưa thu</p><p className="mt-2 text-2xl font-black text-[#6D341B]">{debts.filter((debt) => debt.status === "unpaid").length}</p></div>
          <div className="rounded-[20px] border border-[#d5d2d263] bg-[#FAF2E0] p-5"><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#736D46]">Đã thu</p><p className="mt-2 text-2xl font-black text-[#814C2E]">{debts.filter((debt) => debt.status === "paid").length}</p></div>
        </div>

        <section className="mb-6 rounded-[24px] border border-[#d5d2d263] bg-[#ffff] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-7">
          <h2 className="text-xl font-black text-[#6D341B]">Thêm khoản công nợ</h2>
          <form onSubmit={addDebt} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm font-semibold">Tên người nợ<input required value={form.customer} onChange={(event) => setForm({ ...form, customer: event.target.value })} className="mt-2 w-full rounded-xl border border-[#CFAE91] px-3 py-3 font-normal outline-none focus:border-[#814C2E]" placeholder="Nguyễn Văn A" /></label>
            <label className="text-sm font-semibold">Số điện thoại<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="mt-2 w-full rounded-xl border border-[#CFAE91] px-3 py-3 font-normal outline-none focus:border-[#814C2E]" placeholder="09xxxxxxxx" /></label>
            <label className="text-sm font-semibold">Số tiền còn thiếu<input required min="1" type="number" value={form.amount || ""} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-[#CFAE91] px-3 py-3 font-normal outline-none focus:border-[#814C2E]" placeholder="100000" /></label>
            <label className="text-sm font-semibold">Hạn thanh toán<input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="mt-2 w-full rounded-xl border border-[#CFAE91] px-3 py-3 font-normal outline-none focus:border-[#814C2E]" /></label>
            <label className="text-sm font-semibold sm:col-span-2">Ghi chú<input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} className="mt-2 w-full rounded-xl border border-[#CFAE91] px-3 py-3 font-normal outline-none focus:border-[#814C2E]" placeholder="Mặt hàng, lần mua, thỏa thuận trả..." /></label>
            <div className="sm:col-span-2 lg:col-span-3">{message ? <p className="mb-3 rounded-xl bg-[#F3DFC1] px-4 py-3 text-sm font-semibold text-[#6D341B]">{message}</p> : null}<button type="submit" className="rounded-full bg-[#814C2E] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#6D341B]">Lưu khoản nợ</button></div>
          </form>
        </section>

        <section className="rounded-[24px] border border-[#CFAE91] bg-[#ffff] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-7">
          <h2 className="text-xl font-black text-[#6D341B]">Sổ công nợ</h2>
          <div className="mt-5 space-y-3">
            {debts.length === 0 ? <p className="rounded-xl border border-dashed border-[#CFAE91] p-8 text-center text-sm text-[#736D46]">Chưa có khoản công nợ nào.</p> : debts.map((debt) => (
              <div key={debt.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#F3DFC1] p-4">
                <div><div className="font-bold text-[#6D341B]">{debt.customer} {debt.phone ? <span className="font-normal text-[#736D46]">· {debt.phone}</span> : null}</div><div className="mt-1 text-xs text-[#736D46]">{debt.note || "Không có ghi chú"}{debt.dueDate ? ` · Hạn ${debt.dueDate}` : ""}</div></div>
                <div className="flex items-center gap-3"><strong className={debt.status === "paid" ? "text-[#814C2E]" : "text-[#CA6941]"}>{formatCurrency(debt.amount)} ₫</strong><button type="button" onClick={() => togglePaid(debt)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${debt.status === "paid" ? "bg-[#F3DFC1] text-[#814C2E]" : "bg-[#F3DFC1] text-[#814C2E]"}`}>{debt.status === "paid" ? "Đã thu" : "Đánh dấu đã thu"}</button><button type="button" onClick={() => deleteDebt(debt)} className="text-xs font-bold text-[#CA6941]">Xóa</button></div>
              </div>
            ))}
          </div>
        </section>
        <p className="mt-4 text-xs leading-5 text-[#736D46]">Dữ liệu công nợ hiện lưu trên trình duyệt này bằng localStorage. Khi vận hành nhiều thiết bị, nên chuyển sang database có tài khoản đăng nhập.</p>
      </div>
    </main>
  );
}
