# Hướng dẫn cấu hình Supabase và deploy

## 1. Tạo project Supabase

1. Truy cập https://supabase.com
2. Đăng nhập / tạo tài khoản
3. Tạo project mới
4. Chờ project được tạo xong

## 2. Lấy credential

Vào Project Settings > API, copy các giá trị sau:

- Project URL
- anon/public key
- service_role key

## 3. Cập nhật file .env.local

Mở file `.env.local` và thay các giá trị mẫu bằng dữ liệu thật:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Lưu ý:
- `NEXT_PUBLIC_*` được dùng ở frontend
- `SUPABASE_SERVICE_ROLE_KEY` chỉ dùng ở server-side / API route
- Không commit file `.env.local` lên Git

## 4. Chạy migration SQL

1. Mở Supabase Dashboard
2. Vào SQL Editor
3. Paste nội dung từ [supabase/migrations/20260930000000_initial_schema.sql](supabase/migrations/20260930000000_initial_schema.sql)
4. Nhấn Run

Nếu bạn chưa có migration, hãy tạo nó trước khi chạy.

## 5. Kiểm tra dữ liệu

Sau khi migration chạy xong:

- Vào Table Editor
- Kiểm tra bảng `products`
- Nếu chưa có dữ liệu, chèn vài dòng mẫu để kiểm tra

## 6. Khởi động project local

```bash
cd "/Users/winwin/Documents/HA Market/frontend"
npm install
npm run dev
```

Mở `http://localhost:3000`

## 7. Build kiểm tra

```bash
cd "/Users/winwin/Documents/HA Market/frontend"
npm run build
```

Nếu build thành công, app đang ổn theo code.

## 8. Deploy lên Vercel

1. Push repo lên GitHub
2. Vào https://vercel.com
3. Import project
4. Add Environment Variables theo file `.env.local`
5. Chọn framework `Next.js`
6. Deploy

## 9. Tạo admin permissions

Sau khi có auth user:

- Tạo user admin trong Supabase Auth
- Thêm email của user đó vào biến `SUPABASE_ADMIN_EMAILS`
- Ví dụ:

```bash
SUPABASE_ADMIN_EMAILS=admin@huonganhmarket.vn,owner@huonganhmarket.vn
```

- Sau đó, app sẽ cho phép người có email đó truy cập API admin
- Dùng API route trong [src/app/api/admin](src/app/api/admin) để khóa quyền trước khi lưu

Nếu bạn muốn dùng role metadata, hãy chắc chắn `app_metadata.role = admin` khi user được tạo. Nhưng email-based fallback sẽ dễ thao tác hơn với shop nhỏ.

## 10. Về trường `variants`

Trong schema hiện tại, `variants` không phải là cột riêng lẻ, mà là JSON array. nghĩa là bạn không thêm nhiều cột `variant_1`, `variant_2`... mà phải lưu như ví dụ sau:

```json
[
  {
    "id": "variant-1",
    "label": "Lốc 6",
    "baseQuantity": 6,
    "price": 90000
  }
]
```

Điều này đúng vì trong code, `ProductDraft` dùng `variants?: ProductVariant[]` và API route `insert({ ..., variants: body.variants ?? [] })`.

Nếu bạn dùng Supabase Table Editor để insert thủ công, bạn phải nhập giá trị cho `variants` dưới dạng JSON, không phải các cột riêng lẻ.

## 11. Mở rộng sau này

Bạn có thể thêm các bảng mới như:

- `customers`
- `orders`
- `order_items`
- `payments`
- `promotions`

Mỗi bảng mới thì làm theo:

1. Tạo migration SQL
2. Tạo type trong `src/types`
3. Tạo API route trong `src/app/api`
4. Gọi API từ page hoặc component

## 11. Lưu ý quan trọng

- Không lưu `service_role_key` trên client
- Không gọi Supabase trực tiếp từ component nếu chưa cần
- Luôn đi qua API Route để kiểm soát quyền truy cập
- Nếu cần thêm bảng mới, hãy giữ cấu trúc theo từng feature
