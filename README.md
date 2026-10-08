# Hương Anh Market

Cửa hàng tạp hóa xây dựng bằng Next.js App Router, React, TypeScript và Tailwind CSS.

## Cấu trúc dự án

```text
frontend/
├── src/
│   ├── app/                    # Route, page, layout, API và global styles
│   ├── components/
│   ├── data/                   # Catalog sản phẩm mẫu và cấu hình thanh toán
│   ├── lib/                    # Supabase client, validation và helpers
│   ├── store/                  # Cart, checkout, invoice, catalog state local
│   ├── types/                  # Model dữ liệu nghiệp vụ
│   └── utils/                  # Hàm hỗ trợ dùng chung
├── supabase/
│   └── migrations/             # Schema PostgreSQL cho Supabase
├── public/
├── .env.example                # Mẫu biến môi trường
├── .gitignore
├── next.config.ts
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

## Chạy dự án local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Truy cập http://localhost:3000.

> Lưu ý: nếu chưa cấu hình Supabase, app sẽ tự động fallback về dữ liệu mẫu trong `src/data/products` để vẫn chạy được.

## Cấu hình Supabase

Tạo project trên Supabase, sau đó điền các biến sau vào `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Sau đó chạy migration trong Supabase SQL Editor:

```sql
-- xem file trong supabase/migrations/20260930000000_initial_schema.sql
```

## Deploy lên Vercel

1. Push repository lên GitHub.
2. Tạo project trên Vercel và import repo.
3. Cấu hình environment variables với cùng tên như `.env.example`.
4. Chọn framework: Next.js và deploy.
5. Sau khi deploy, set domain production và cập nhật `NEXT_PUBLIC_SITE_URL` cho domain thật.

## Dữ liệu

- Giỏ hàng, checkout, hóa đơn, công nợ và catalog đang có phiên bản localStorage phục vụ demo và testing.
- Khi dùng production, nên chuyển những dữ liệu quản trị và catalog sang Supabase với RLS + admin-only API.
- Các API trong `src/app/api/` đã được scaffold để làm nền cho việc lưu dữ liệu thật trên web.
