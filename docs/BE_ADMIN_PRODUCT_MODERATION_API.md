# API Backend cần bổ sung - lịch sử kiểm duyệt sản phẩm Admin

## Bối cảnh

Frontend Admin đã có đủ ba bộ lọc:

- `PENDING_REVIEW`: Chờ thẩm định
- `PUBLISHED`: Đã duyệt mở bán
- `REJECTED`: Đã từ chối

Hiện Backend chỉ có API danh sách `GET /api/admin/products/pending`. API catalog công khai có thể dùng tạm cho sản phẩm `PUBLISHED`, nhưng không thể lấy danh sách `REJECTED`. Frontend đang có fallback tương thích; khi API dưới đây được thêm, FE sẽ tự ưu tiên dùng API mới mà không cần đổi luồng hoặc giao diện.

## API cần thêm

### Liệt kê sản phẩm theo trạng thái kiểm duyệt

```http
GET /api/admin/products?status=PENDING_REVIEW&page=0&size=100
Authorization: Bearer <admin-jwt>
```

`status` chấp nhận đúng ba giá trị:

- `PENDING_REVIEW`
- `PUBLISHED`
- `REJECTED`

Phân trang bắt đầu từ `0`, `size` từ `1` đến `100`. Sắp xếp mặc định theo `updatedAt DESC`, sau đó `id DESC` để kết quả ổn định.

Frontend gọi riêng ba request song song:

```http
GET /api/admin/products?status=PENDING_REVIEW&page=0&size=100
GET /api/admin/products?status=PUBLISHED&page=0&size=100
GET /api/admin/products?status=REJECTED&page=0&size=100
```

Nếu `totalPages > 1`, FE tự tải các trang tiếp theo.

### Response

Giữ nguyên envelope và DTO `MarketplacePage<ProductView>` đang dùng tại `/api/admin/products/pending`:

```json
{
  "status": 200,
  "message": "Success",
  "data": {
    "items": [
      {
        "id": 23,
        "storefrontId": 12,
        "title": "Đèn ngủ cú mèo đáng yêu",
        "description": "...",
        "category": "DESK_ACCESSORY",
        "specifications": "...",
        "shippingClass": "STANDARD",
        "status": "REJECTED",
        "moderationReason": "Ảnh chưa thể hiện mẫu in thực tế.",
        "revision": "644235c3...",
        "updatedAt": "2026-11-01T10:38:00Z",
        "media": [],
        "variants": []
      }
    ],
    "page": 0,
    "size": 100,
    "totalElements": 1,
    "totalPages": 1
  },
  "timestamp": "2026-11-01T10:38:00Z"
}
```

Không đổi tên field và không trả DTO rút gọn, vì trang danh sách cần giá, biến thể, ảnh; trang detail dùng cùng cấu trúc để tránh lệch dữ liệu.

## API hiện có tiếp tục giữ nguyên

```http
GET  /api/admin/products/{id}/moderation
POST /api/admin/products/{id}/approve
POST /api/admin/products/{id}/reject
```

Body approve/reject:

```json
{
  "revision": "revision lấy từ detail",
  "reason": "Lý do quyết định"
}
```

Không cần luồng `CHANGES_REQUESTED` hoặc "Yêu cầu chỉnh sửa". FE chỉ dùng duyệt mở bán và từ chối.

## Phân quyền và hành vi mong đợi

- Chỉ role `ADMIN` được gọi API list, detail, approve và reject.
- Sản phẩm sau approve chuyển sang `PUBLISHED` và xuất hiện trong filter đã duyệt.
- Sản phẩm sau reject chuyển sang `REJECTED` và xuất hiện trong filter đã từ chối.
- Giữ kiểm tra `revision` để trả `409 Conflict` khi nội dung đã thay đổi.
- `moderationReason` chứa lý do quyết định gần nhất để detail và audit UI hiển thị đúng.

## Tiêu chí nghiệm thu

1. Ba request theo ba status trả đúng `totalElements` và dữ liệu tương ứng.
2. Sau approve hoặc reject, gọi lại API list thấy sản phẩm ở filter mới ngay.
3. `GET /api/admin/products/{id}/moderation` vẫn đọc được sản phẩm đã `PUBLISHED` hoặc `REJECTED`.
4. API không lẫn `DRAFT`, `UNPUBLISHED`, `ARCHIVED` vào ba hàng kiểm duyệt trên.
