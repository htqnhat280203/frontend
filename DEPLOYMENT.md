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
3. Chạy migration nền tảng [supabase/migrations/20260930000000_initial_schema.sql](supabase/migrations/20260930000000_initial_schema.sql)
4. Tiếp tục chạy migration nghiệp vụ [supabase/migrations/20261001000000_store_operations.sql](supabase/migrations/20261001000000_store_operations.sql)
5. Chạy migration xác nhận thanh toán [supabase/migrations/20261002000000_paid_invoice_confirmation.sql](supabase/migrations/20261002000000_paid_invoice_confirmation.sql)
6. Chạy migration thanh toán/công nợ [supabase/migrations/20261003000000_paid_unpaid_debts.sql](supabase/migrations/20261003000000_paid_unpaid_debts.sql)
7. Chạy migration chốt checkout [supabase/migrations/20261004000000_checkout_payment_actions.sql](supabase/migrations/20261004000000_checkout_payment_actions.sql)
8. Nhấn Run cho từng migration theo đúng thứ tự

Migration thứ hai tạo `customers`, `orders`, `order_items`, `payments`, `promotions` và hàm `place_order`. Migration thứ ba tạo hàm xác nhận thanh toán và ghi hóa đơn. Migration thứ tư chuẩn hóa `orders.payment_status` thành `paid`/`unpaid` và thêm chức năng ghi nợ có snapshot ảnh sản phẩm. Migration thứ năm thêm RPC chốt đơn tại quầy thành paid hoặc unpaid atomically.

Nếu bấm xác nhận thanh toán báo chưa có hàm `admin_confirm_order_payment` hoặc mã `PGRST202`, chạy lại migration thứ ba trên đúng project và kiểm tra:

```sql
select to_regprocedure('public.admin_confirm_order_payment(uuid)');
```

Kết quả không được là `NULL`. Migration sẽ gửi lệnh reload schema cache cho PostgREST.

Nếu checkout báo `Database chưa có hàm place_order` hoặc mã `PGRST202`, hãy chạy lại migration thứ hai trên SQL Editor của **đúng project có Project URL đang đặt trong `.env.local`**, sau đó vào **Project Settings → API → Reload schema cache** (hoặc chờ Supabase cập nhật schema cache) và khởi động lại dev server. Để kiểm tra hàm đã tồn tại, chạy:

```sql
select to_regprocedure('public.place_order(text,text,text,text,jsonb,text,text,text)');
```

Kết quả không được là `NULL`. Trước khi đặt đơn thật, bảng `products` cũng cần có các sản phẩm đang hoạt động; API sẽ không tự lấy giá mẫu trong frontend để ghi đơn.

Nếu API báo `23503` hoặc “phiên bản cũ”, hãy chạy lại file migration thứ hai từ workspace. Bản hiện tại ghi bản ghi `orders` trước các `order_items` để thỏa mãn khóa ngoại.

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

## 10. Các chức năng đơn hàng mới

Checkout có nút **Khách mua tại quầy** để tự điền hồ sơ khách mua trực tiếp; các trường vẫn có thể sửa tay. Khách cần nhập riêng thông tin thì điền tên, số điện thoại, email tùy chọn, địa chỉ, ghi chú và mã khuyến mãi. Hồ sơ tại quầy được gom chung, không đại diện cho danh tính một cá nhân. Người bán đăng nhập admin rồi chọn **Đã xác nhận thanh toán** hoặc **Ghi nợ**; API gọi hàm database `admin_place_order` để:

- Kiểm tra sản phẩm còn hoạt động và quy cách tồn tại
- Lấy giá từ bảng `products`, không tin giá trình duyệt gửi lên
- Tạo/cập nhật khách hàng theo số điện thoại
- Ghi order cùng snapshot từng mặt hàng, sau đó xác nhận payment + invoice hoặc tạo debt trong cùng transaction
- Áp dụng promotion và tăng số lượt sử dụng có khóa transaction

API hiện có:

- `GET /api/promotions`: đọc khuyến mãi đang hoạt động
- `POST /api/orders`: tạo đơn từ checkout
- `POST /api/orders` với `action: "paid" | "unpaid"`: chỉ admin đăng nhập được chốt đơn thành đã thanh toán hoặc ghi nợ
- `GET /api/admin/orders`: xem tối đa 100 đơn mới nhất kèm khách hàng, items, payment và trạng thái ghi nợ
- `POST /api/admin/orders/{id}/debt`: ghi nhận khoản chưa thanh toán vào sổ công nợ kèm ảnh sản phẩm
- `GET/POST /api/admin/promotions`: liệt kê/tạo mã giảm giá
- `PATCH /api/admin/promotions/{id}`: bật/tắt mã giảm giá
- `POST /api/admin/orders/{id}/confirm-payment`: xác nhận thanh toán và tạo invoice trong cùng transaction
- `GET /api/admin/invoices`: xem tối đa 200 hóa đơn đã thanh toán

Trang `/admin/invoices` là sổ theo dõi tất cả đơn mua, gồm ngày mua, khách hàng, ảnh và giá từng mặt hàng, tổng tiền, cùng đúng hai trạng thái **đã thanh toán/chưa thanh toán**. Có thể xác nhận đã thanh toán hoặc bấm **Ghi nợ**; ghi nợ tạo bản ghi liên kết với đơn và snapshot ảnh sản phẩm trong bảng `debts`.

Chọn **Đã xác nhận thanh toán** chỉ sau khi nhân viên kiểm tra tiền vào tài khoản hoặc đã thu tiền mặt. Hệ thống chưa có webhook đối soát ngân hàng.

### Đăng nhập và xác nhận hóa đơn

1. Tạo user trong Supabase Dashboard → Authentication → Users, đặt email và mật khẩu.
2. Thêm đúng email đó vào `SUPABASE_ADMIN_EMAILS` trong `.env.local` (local) và Vercel (production).
3. Đảm bảo `SUPABASE_SERVICE_ROLE_KEY` được cấu hình ở server environment; tuyệt đối không đặt tên biến có tiền tố `NEXT_PUBLIC_` cho key này.
4. Khởi động lại dev server sau khi đổi env, mở `/admin/login` và đăng nhập.
5. Vào `/admin/invoices`, kiểm tra người mua, ảnh/mặt hàng và số tiền.
6. Nếu đã nhận tiền, bấm **Xác nhận đã thanh toán**. Nếu khách còn nợ, bấm **Ghi nợ**.
7. Hóa đơn được ghi vào bảng `invoices`; đơn và công nợ đều được cập nhật trạng thái paid/unpaid phù hợp.

Gọi xác nhận lại cùng đơn sẽ trả về hóa đơn cũ, không tạo hóa đơn trùng. Hóa đơn cũ chỉ lưu trong localStorage không tự được chuyển sang database; chỉ các đơn được xác nhận qua luồng mới xuất hiện trong trang hóa đơn này.

## 11. Về trường `variants`

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

## 12. Mở rộng sau này

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

## 13. Lưu ý quan trọng

- Không lưu `service_role_key` trên client
- Không gọi Supabase trực tiếp từ component nếu chưa cần
- Luôn đi qua API Route để kiểm soát quyền truy cập
- Nếu cần thêm bảng mới, hãy giữ cấu trúc theo từng feature
- `SUPABASE_ADMIN_EMAILS` chỉ hoạt động sau khi người quản trị đăng nhập bằng Supabase Auth; hiện project chưa có giao diện đăng nhập/quản trị tài khoản
- Không đưa dữ liệu khách hàng ra endpoint công khai; chỉ API admin đã xác thực được đọc danh sách đơn/khách hàng
- API đặt đơn công khai cần được bổ sung rate limit/CAPTCHA trước khi có lưu lượng production lớn

### Thêm mã khuyến mãi mẫu

Sau khi chạy migration, có thể tạo mã thử trong Supabase SQL Editor:

```sql
insert into public.promotions (
  code, description, discount_type, discount_value, min_subtotal,
  starts_at, ends_at, max_redemptions, is_active
)
values (
  'HA10', 'Giảm 10% đơn từ 100.000đ', 'percent', 10, 100000,
  now(), now() + interval '30 days', 100, true
);
```

Nhập `HA10` ở checkout. Database kiểm tra ngày hiệu lực, đơn tối thiểu và giới hạn lượt dùng trước khi áp dụng.
