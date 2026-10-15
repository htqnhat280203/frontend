import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getSupabaseConfigurationIssue } from "@/lib/supabase/env";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hương Anh Market",
  description: "Cửa hàng tiện lợi Hương Anh Market",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const supabaseConfigurationIssue = getSupabaseConfigurationIssue();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {supabaseConfigurationIssue ? (
          <aside role="alert" className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">
            Lỗi cấu hình kết nối dữ liệu: {supabaseConfigurationIssue}
          </aside>
        ) : null}
        {children}
      </body>
    </html>
  );
}
