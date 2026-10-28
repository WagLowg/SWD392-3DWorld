# Đối chiếu API cho các màn Sidebar

Tài liệu này ghi nhận trạng thái tích hợp giữa frontend `SWD392-3DWorld` và backend `3DWorld-SWD-BE`. Frontend không dùng dữ liệu mẫu để thay thế cho dữ liệu nghiệp vụ chưa có API.

## Tài khoản người mua

| Màn hình | API đang dùng | Trạng thái |
|---|---|---|
| Hồ sơ | `GET/PATCH /api/users/me`, `POST /api/users/me/avatar` | Đã nối đầy đủ các trường backend cho phép cập nhật |
| Sổ địa chỉ | `GET/POST /api/users/me/addresses`, `PATCH/DELETE /api/users/me/addresses/{id}`, `POST .../{id}/default` | Đã nối |
| Tài khoản ngân hàng | `GET/POST /api/users/me/bank-accounts`, `PATCH/DELETE .../{id}`, `POST .../{id}/default` | Đã nối; trạng thái xác minh do Admin xử lý |
| Đơn hàng của tôi | `GET /api/orders/mine`, chi tiết, lịch sử, kiện hàng và vận chuyển | Đã nối |
| Hoàn tiền | `POST /api/payments/{transactionId}/refund` | Đã nối chức năng gửi; còn thiếu API danh sách yêu cầu hoàn tiền và tra transaction theo order |
| Thư viện 3D | `/api/models/getAll`, `/getId/{id}`, lịch sử phiên bản, tải file | Đã sửa theo đúng controller BE |
| Tải mô hình | `POST /api/models/create` với multipart part `file` | Đã nối; BE lấy tên từ filename và chưa nhận mô tả/metadata |
| Báo cáo vi phạm | `POST /api/reports` | Đã nối chức năng gửi; không hiển thị fixture. Còn thiếu `GET /api/reports/mine` và `GET /api/reports/{id}` cho người gửi |

## Kênh người bán

Các route vận hành seller dùng chung một access gate dựa trên dữ liệu backend, không dựa riêng vào role đang lưu ở frontend:

1. Hồ sơ seller chưa được duyệt: chỉ mở màn xác thực người bán.
2. Đã duyệt nhưng chưa có storefront: mở màn tạo gian hàng.
3. Đã có storefront nhưng chưa có gói còn hiệu lực: mở màn đăng ký/gia hạn gói.
4. Chỉ storefront `ACTIVE` hoặc `EXPIRING` mới được tải API sản phẩm, tồn kho, đơn chế tác, vận chuyển và doanh thu.

Địa chỉ mặc định của chủ gian hàng là điểm lấy hàng GHTK theo backend. FE yêu cầu và gửi đủ `recipientName`, `phone`, `addressLine`, `province`, `district` (tuỳ địa giới) và `ward`; seller không thể nộp hồ sơ hoặc vào khu vực vận hành khi địa chỉ mặc định chưa sẵn sàng cho GHTK.

Màn xác thực seller cho phép hoàn tất điều kiện ngay tại chỗ: gửi lại email xác thực, nhập/cập nhật số điện thoại qua `PATCH /api/users/me`, và thêm/sửa tài khoản ngân hàng qua `/api/users/me/bank-accounts`. Phone và bank chỉ chuyển sang trạng thái đã xác thực sau khi Admin duyệt; backend hiện chưa có OTP/SMS tự xác minh số điện thoại.

| Màn hình | API đang dùng | Trạng thái |
|---|---|---|
| Tổng quan | Đơn seller, sản phẩm, storefront, subscription và `GET /api/users/me/wallet` | Đã bỏ thống kê tranh chấp/doanh thu mẫu |
| Sản phẩm | `/api/seller/products` và các endpoint media, variant, submit, unpublish, archive | Đã nối; bỏ cột “đã bán” vì ProductView chưa trả sales count |
| Tồn kho | `PATCH /api/seller/products/{id}/variants/{variantId}/stock` | Đã nối. Không hiển thị log giả; còn thiếu API đọc audit tồn kho |
| Đơn chế tác | `GET /api/orders/seller`, cập nhật trạng thái và đóng gói | Đã nối |
| Vận chuyển | shipment, package và packaging profile API | Đã nối |
| Gian hàng | `GET/POST/PATCH /api/storefronts` | Đã nối |
| Gói thuê gian hàng | subscription API và ZaloPay | Đã nối; giá lấy từ cấu hình backend |
| Xác thực người bán | `/api/users/me/seller-verification` và tài khoản ngân hàng | Đã nối |
| Doanh thu & ví | `GET /api/users/me/wallet` | Đã nối, dữ liệu earnings lấy từ response thật |
| Rút tiền | `POST /api/users/me/payouts` | Đã bổ sung màn FE; chỉ dùng tài khoản ngân hàng VERIFIED |

## API Backend còn thiếu để hoàn thiện UI

1. `GET /api/reports/mine` và `GET /api/reports/{id}` dành cho người gửi báo cáo.
2. `GET /api/seller/inventory-logs` hoặc API audit product/variant có phân trang.
3. API danh sách/chi tiết yêu cầu hoàn tiền của người mua.
4. API tìm payment transaction theo `orderId`, tránh yêu cầu người dùng nhập transaction ID.
5. Endpoint cập nhật tên/mô tả model sau khi upload, hoặc cho `POST /api/models/create` nhận metadata.
6. `salesCount` trong seller ProductView nếu cần hiển thị số lượng đã bán.
7. API tranh chấp seller nếu muốn mở lại các màn phản hồi tranh chấp; hiện backend chưa có controller tương ứng.
8. API lịch sử giao dịch ví và lịch sử yêu cầu rút tiền nếu cần màn đối soát chi tiết; `GET /api/users/me/wallet` hiện chỉ trả số dư và các khoản thu tổng hợp.
