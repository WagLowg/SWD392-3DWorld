# API còn thiếu so với Frontend

So sánh OpenAPI "3DWorld Backend API v1" (25/10/2026) với các màn hình đang có.
Màn nào chưa có API vẫn chạy bằng dữ liệu mẫu và hiện banner "Dữ liệu mẫu" kèm tên API cần có.

## 1. Đã nối API thật

| Khu vực | API |
|---|---|
| Catalog | `GET /api/catalog` (keyword, category, minPrice, maxPrice, sort), `/featured`, `/{id}`, `/{id}/reviews` |
| Gian hàng công khai | `GET /api/storefronts/{id}`, `/{id}/products` → route mới `/marketplace/shop/:id` |
| Giỏ hàng | `GET/POST/PATCH/DELETE /api/cart…`, `revalidate`, `acknowledge-price` (dùng `storefrontId`, `productId`, `thumbnailUrl` mới) |
| Đặt hàng & thanh toán | `POST /api/orders/checkout`, `POST /api/payments/zalopay`, `POST /api/payments/{id}/refund` · trang kết quả `/marketplace/payment/result` |
| Đơn người mua | `GET /api/orders/mine`, `/{id}`, `/{id}/history`, `/{id}/packages`, `/{id}/shipments`, `POST /{id}/cancel`, `POST /{id}/confirm-received` |
| Đơn người bán | `GET /api/orders/seller`, `PATCH /{id}/status`, `POST /{id}/shipment`, `POST /{id}/packages`, `GET /api/shipping/packaging-profiles`, `PATCH /api/shipments/{id}/event` |
| Sản phẩm người bán | `GET/POST/PATCH /api/seller/products…`, variants (thêm/sửa/xoá/tồn kho), media (tải/gỡ), submit, unpublish, archive |
| Gian hàng & gói | `GET/PATCH /api/storefronts/me`, `POST /api/storefronts`, `GET /me/subscription`, `POST /me/subscriptions[/renew]` + ZaloPay `SUBSCRIPTION` |
| Xác thực người bán | `GET/POST /api/users/me/seller-verification` |
| Báo cáo vi phạm | `POST /api/reports` |
| Admin | `GET /api/admin/products/pending`, `/{id}/moderation`, `approve`/`reject` · `GET /api/admin/reports`, `PATCH /{id}` · `GET /api/admin/seller-verifications`, `GET/PATCH /api/admin/users/{id}/seller-verification` · `GET/POST /api/admin/users`, `PATCH /{id}/status`, `PUT /{id}/roles/{role}`, `PATCH /{id}/phone-verification` |

## 2. API còn thiếu

### Chợ / Catalog
1. Danh sách danh mục kèm số lượng, vd. `GET /api/catalog/categories`. Hiện frontend tự đếm từ 100 sản phẩm đầu.
2. Lọc còn hàng (`available=true`) trên `/api/catalog`. Hiện chỉ lọc trên trang đang xem.
3. Lọc theo thuộc tính variant (chất liệu, màu). Bộ lọc chất liệu đã gỡ vì không có API.
4. File mô hình 3D để xem trên trang chi tiết sản phẩm.
5. Chỉ số gian hàng (điểm đánh giá, lượt đánh giá, người theo dõi), đánh giá theo gian hàng, theo dõi gian hàng.

### Đặt hàng
6. Ước tính phí ship và chọn đơn vị vận chuyển **trước** khi đặt. `CheckoutRequest` chưa có trường này.
7. Phương thức thanh toán trong `CheckoutRequest` (COD / ZaloPay / ví) và thanh toán bằng ví.
8. Mã giảm giá / voucher.
9. Yêu cầu huỷ đơn **đã thanh toán**. `/cancel` chỉ nhận đơn chưa thanh toán.

### Thanh toán ZaloPay
Frontend đã có trang kết quả `/marketplace/payment/result` (đang xác nhận / thành công / thất bại / chưa nhận được xác nhận). Trang hỏi lại trạng thái mỗi 3 giây, tối đa 90 giây.
10. **Redirect URL của ZaloPay** (`redirecturl` trong `embed_data` khi tạo đơn ZaloPay) phải trỏ về trang này và kèm loại + mã nghiệp vụ:
    - Đơn hàng: `{FRONTEND_URL}/marketplace/payment/result?type=order&id={sourceId}`
    - Gói thuê bao: `{FRONTEND_URL}/marketplace/payment/result?type=subscription&id={sourceId}`
    - Trang cũng đọc được `?sourceType=PHYSICAL_ORDER&sourceId=…`. ZaloPay tự gắn thêm `status`, `apptransid`, `checksum`; frontend chỉ dùng `status` làm gợi ý, trạng thái thật lấy từ API.
    - Nên cho cấu hình `FRONTEND_URL` theo môi trường (local / staging).
11. **API tra cứu trạng thái giao dịch**: `GET /api/payments/{transactionId}` trả `status`, `amount`, `sourceType`, `sourceId`, `paidAt`, mã lỗi gateway. Nếu callback chậm hoặc hỏng thì Backend nên tự gọi API query của ZaloPay để cập nhật. Hiện frontend phải suy ra từ trạng thái đơn (`GET /api/orders/{id}`) hoặc gói (`GET /api/storefronts/me/subscription`), và **không xác nhận được nạp ví**.
12. Lấy giao dịch của một đơn, vd. `GET /api/orders/{id}/payments`, hoặc trả `transactionId` / `paymentStatus` trong `OrderResponse`. Hoàn tiền cần `transactionId`, hiện frontend chỉ nhớ được ở trình duyệt nơi đã bấm thanh toán.
13. Callback chạy local: ZaloPay sandbox không gọi được `localhost:8080`, cần URL public (vd. ngrok) đặt làm `callback_url` để đơn tự chuyển sang PAID khi test.

### Người mua
14. Thông báo: `GET /api/notifications`, đánh dấu đã đọc.
15. Phiên đăng nhập: danh sách / thu hồi thiết bị; đổi mật khẩu khi đang đăng nhập.
16. Hoàn tiền: danh sách, chi tiết hồ sơ hoàn tiền, nộp thêm bằng chứng.
17. Báo cáo của tôi: `GET /api/reports/mine`, `GET /api/reports/{id}`. Hiện báo cáo vừa gửi chỉ lưu tạm trên trình duyệt.
18. Đánh giá sản phẩm sau khi nhận hàng (tạo/sửa), danh sách đánh giá của tôi.
19. Lịch sử giao dịch thanh toán của tôi: `GET /api/payments/mine`.
20. Trung tâm trợ giúp, trang chính sách, phiếu hỗ trợ.

### Người bán
21. Dashboard: thống kê tổng quan.
22. Doanh thu / earnings / giải ngân ký quỹ: `/api/seller/earnings`.
23. Tranh chấp: `/api/seller/disputes`, phản hồi tranh chấp.
24. Nhật ký biến động tồn kho: `GET`. Hiện chỉ hiện thay đổi trong phiên đang mở.
25. `VariantPatch` chưa có `reason` cho thay đổi giá.
26. `salesCount` (đã bán) trong `ProductView`.
27. Mở bán lại sau khi `unpublish` mà không cần duyệt lại. Hiện frontend dùng `submit`, tức là sản phẩm phải duyệt lại.
28. Gian hàng: slogan, logo/ảnh bìa, tạm ẩn gian hàng.
29. Lịch sử thanh toán gói đầy đủ. `SubscriptionOverview` chỉ có `latest` và `pending`.
30. Xác thực người bán: tải file minh chứng, trạng thái "cần bổ sung" (NEEDS_INFO), trường địa chỉ xưởng / công nghệ in. Hiện các trường này được ghép vào `evidenceReference`.

### Ví
31. `GET /api/wallets/me` (số dư, **walletId** cần cho nạp tiền), sổ cái ví, rút tiền (`/api/payouts`).

### Admin / vận hành
32. Hàng chờ đơn hàng, vận đơn, COD, hoàn tiền, trọng tài/leo thang, tài chính, đối soát, chi trả, hoa hồng, audit log, cấu hình nền tảng.
33. Kiểm duyệt sản phẩm: lịch sử đã duyệt/từ chối (chỉ có `pending`), trạng thái "yêu cầu chỉnh sửa".
34. Báo cáo: `GET /api/admin/reports/{id}`, thông tin người báo cáo, trạng thái "cần bổ sung bằng chứng", báo cáo theo gian hàng (`storefrontId`).
35. Người dùng: `GET /api/admin/users/{id}` (chi tiết, ngày tạo, ví, địa chỉ, ngân hàng); trường `reason` trong `PATCH /status`.

## 3. Vấn đề trong OpenAPI cần Backend làm rõ

- **`POST /api/reports` trỏ nhầm schema**: `CreateRequest` (name, description) bị trùng tên với schema tạo gian hàng. Frontend đang gửi `{ productId, reportedUserId, reason, description, evidenceReference }` theo mô tả endpoint. Cần đổi tên schema để Swagger hiện đúng.
- **Enum trạng thái chưa công bố**: trạng thái sản phẩm (`ProductView.status`), trạng thái xác thực người bán (`State.status`), giá trị `status` của `/api/admin/seller-verifications`, trạng thái gói (`SubscriptionResponse.status`). Frontend đang map theo tên phổ biến (PENDING / APPROVED / REJECTED…).
- **Thiếu khai báo bảo mật**: các endpoint `/api/storefronts/me*` và `POST /api/storefronts` không có `security: bearerAuth`.
- **`ItemRequest` bị trùng tên**: cùng một schema `ItemRequest` vừa dùng cho giỏ hàng (`variantId`) vừa dùng cho đóng gói (`orderItemId`). Swagger hiện sai body của `POST /api/cart/items`.
- **Dạng phân trang không thống nhất**: chỗ dùng `{ items, page, size }`, chỗ dùng Spring `{ content, number, … }`.
