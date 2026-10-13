"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function AdminNavigation() {
  const router = useRouter();

  const signOut = async () => {
    await createClient()?.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <nav className="flex flex-wrap items-center gap-2">
      <Link href="/admin/orders" className="rounded-full border border-[#CFAE91] px-4 py-2 text-sm font-semibold">Đơn hàng</Link>
      <Link href="/admin/invoices" className="rounded-full border border-[#CFAE91] px-4 py-2 text-sm font-semibold">Hóa đơn</Link>
      <Link href="/admin/products" className="rounded-full border border-[#CFAE91] px-4 py-2 text-sm font-semibold">Sản phẩm</Link>
      <button type="button" onClick={signOut} className="rounded-full bg-[#814C2E] px-4 py-2 text-sm font-bold text-white">Đăng xuất</button>
    </nav>
  );
}