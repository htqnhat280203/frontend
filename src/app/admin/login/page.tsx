"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      if (!supabase) {
        setError("Chưa cấu hình URL và publishable key của Supabase.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        const code = "code" in signInError ? signInError.code : "";
        if (code === "invalid_credentials") {
          setError("Email hoặc mật khẩu không đúng. Hãy kiểm tra tài khoản trong đúng Supabase project.");
        } else if (code === "email_not_confirmed") {
          setError("Email chưa được xác nhận. Xác nhận email hoặc bật xác nhận user trong Supabase Auth.");
        } else if (code === "invalid_api_key") {
          setError("Publishable key không hợp lệ hoặc không thuộc project được cấu hình trong .env.local.");
        } else {
          setError(`${signInError.message}${code ? ` (${code})` : ""}`);
        }
        return;
      }

      router.replace("/admin/orders");
      router.refresh();
    } catch {
      setError("Không kết nối được Supabase. Hãy kiểm tra URL, key và kết nối mạng.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f5ee] px-4 py-10 text-[#6D341B]">
      <section className="w-full max-w-md rounded-2xl border border-[#CFAE91] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#814C2E]">Hương Anh Market</p>
        <h1 className="mt-3 text-2xl font-black">Đăng nhập quản trị</h1>
        <form onSubmit={signIn} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold">Email
            <input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-[#CFAE91] px-3 py-3 font-normal" />
          </label>
          <label className="block text-sm font-semibold">Mật khẩu
            <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-[#CFAE91] px-3 py-3 font-normal" />
          </label>
          {error ? <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-[#814C2E] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
        <Link href="/" className="mt-5 inline-block text-sm font-semibold text-[#814C2E]">Quay lại cửa hàng</Link>
      </section>
    </main>
  );
}