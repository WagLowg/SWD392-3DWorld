# POD Buyer Flow & API Guide

> Cập nhật: 27/10/2026. Tài liệu này mô tả **luồng Customer/Buyer đang được frontend sử dụng** và đối chiếu trực tiếp với controller/DTO trong `3DWorld-SWD-BE`. Backend là nguồn quyết định cuối cùng về trạng thái, quyền thao tác, version, giá và deadline.

## 1. Kết luận khi kiểm tra bộ 44 màn hình

Bộ Stitch POD 001–044 ban đầu không hoàn toàn là 44 màn Buyer: POD 034–044 mang nội dung Staff/Workshop. Phần Customer trước khi bổ sung mới chủ yếu có upload, danh sách và chi tiết cơ bản; chưa thể hiện đầy đủ wizard, version, quote 24 giờ, tối đa 3 lần revision và payment 100%.

Frontend hiện giữ nguyên các route cũ để không làm hỏng link đã có, đồng thời bổ sung luồng Buyer chính:

| Route trong module `/pod` | Vai trò |
|---|---|
| `/` hoặc `/print` | Upload và tạo Print Request `DRAFT` |
| `/print/preview?id={requestId}` | Kiểm tra file/version và xác nhận preview |
| `/print/configure?id={requestId}` | Chọn vật liệu, quality, infill, kích thước, số lượng và notes |
| `/print/review?id={requestId}` | Review + submit; sau submit trở thành trang detail trung tâm |
| `/print/model?id={requestId}&version={n}` | Màn file/model chỉ đọc, không đổi workflow |
| `/orders` | Lịch sử POD, filter và tách Active/Closed/Draft |
| `/requests` | Lối vào cũ dạng danh sách rút gọn |

## 2. Luồng Buyer chuẩn

```text
Upload file
  → DRAFT + file version 1 + spec version 1
  → Preview confirmation
  → Configure (mỗi lần lưu tạo spec version mới)
  → Review & Submit
  → SUBMITTED
  → Staff technical review
      ├─ REQUIRES_REVISION → Buyer sửa file/config → preview → resubmit
      ├─ REJECTED          → đóng yêu cầu
      └─ READY_FOR_QUOTE   → Staff phát hành Official Quote
  → QUOTED (deadline cố định 24 giờ từ quote đầu tiên)
      ├─ Buyer yêu cầu đổi quote (tối đa 3 lần) → REQUIRES_REVISION
      └─ Buyer accept quote → QUOTE_ACCEPTED
  → Thanh toán đủ 100% qua ZaloPay
  → IN_QUEUE / QUEUED
  → PRINTING → QA → SHIPPING → COMPLETED
```

### Quy tắc quan trọng

- Preliminary estimate không phải Official Quote. Frontend không tự dựng giá cuối khi Backend chưa có estimate endpoint.
- Quote đầu tiên tạo deadline 24 giờ; quote sau không được kéo dài deadline.
- Buyer có tối đa 3 post-quote revisions. Mỗi lần revision làm quote hiện tại thành `SUPERSEDED`.
- Chỉ quote mới nhất, trạng thái `ISSUED`, đúng file/spec snapshot và còn hạn mới được accept.
- V1 thanh toán đủ 100%: `depositAmount = totalAmount`, `remainingAmount = 0`.
- Sau `QUOTE_ACCEPTED`, Buyer không được sửa file/config, requote hoặc tự hủy.
- Từ `IN_QUEUE` trở đi request bị khóa cho sản xuất.
- UI phải dùng `workflow.allowedActions` Backend trả về, không tự suy đoán quyền thao tác chỉ từ tên status.

## 3. API tạo và cấu hình yêu cầu

### 3.1 Danh mục vật liệu

```http
GET /api/print/materials/getAll?page=0&size=50&technologyCode={optional}
GET /api/print/materials/getId/{materialId}
```

Mỗi material trả về:

```ts
type PrintMaterial = {
  materialId: number
  materialName: string
  technologyCode: string
  unit: string
}
```

### 3.2 Upload và tạo Draft

```http
POST /api/print/requests/create?materialId={id}&rightsDeclarationAccepted=true
Content-Type: multipart/form-data
file: STL | OBJ | GLB | 3MF, tối đa 50 MB
```

Backend thực hiện trong một transaction nghiệp vụ:

1. Tạo model và model version.
2. Tạo `PrintRequest` ở `DRAFT`.
3. Tạo file version 1.
4. Tạo specification version 1.

### 3.3 Đọc request và workflow

```http
GET /api/print/requests/getAll?page=0&size=50
GET /api/print/requests/getId/{printRequestId}
```

Chi tiết request trả thêm:

```ts
workflow: {
  displayStatus: string
  quoteDeadline: string | null
  paymentExpiresAt: string | null
  remainingRevisions: number | null
  currentFileVersion: number
  currentSpecVersion: number
  allowedActions: {
    editFile: boolean
    editSpecification: boolean
    confirmPreview: boolean
    submit: boolean
    requestRevision: boolean
    acceptQuote: boolean
    pay: boolean
    cancel: boolean
  }
}
```

Ngoài ra response có `production` và `shipping` để UI hiển thị tiến độ và mức sẵn sàng giao hàng.

### 3.4 File version

```http
GET  /api/print/requests/getId/{id}/file/versions/getAll
GET  /api/print/requests/getId/{id}/file/versions/{version}/download
POST /api/print/requests/getId/{id}/file/versions/create
```

Upload revision gửi `expectedCurrentFileVersion`. Backend trả `409` nếu Customer đang dùng version cũ, request đã khóa hoặc không ở trạng thái cho sửa.

### 3.5 Preview

```http
POST /api/print/requests/getId/{id}/preview/confirm
```

Body:

```json
{
  "expectedFileVersion": 1,
  "expectedSpecVersion": 1
}
```

Preview chỉ xác nhận Customer đã kiểm tra đúng file. Nó không xác nhận model in được và không thay thế Technical Review/Slicer của Staff.

### 3.6 Specification version

```http
PATCH /api/print/requests/getId/{id}/updateSpecification
GET   /api/print/requests/getId/{id}/specifications/versions/getAll
```

Body update phải chứa `expectedCurrentSpecVersion` và **đủ toàn bộ item đang tồn tại**. Mỗi lần lưu thành công tạo spec version mới; không ghi đè snapshot cũ.

Backend hiện hỗ trợ các field item:

- `materialId`, `color`, `quality`;
- `infillPercent` (không áp dụng cho SLA);
- `widthMm`, `heightMm`, `depthMm`;
- `quantity`, `notes`.

## 4. Submit, revision và cancel

### Submit/resubmit

```http
POST /api/print/requests/getId/{id}/submit
```

Body gồm current file/spec version. Backend chỉ nhận khi copyright và preview đã xác nhận, material còn active và file/model source còn hợp lệ.

### Cancel

```http
POST /api/print/requests/getId/{id}/cancel
{ "reason": "..." }
```

Frontend chỉ hiển thị nút khi `workflow.allowedActions.cancel = true`.

### Lịch sử trạng thái

```http
GET /api/print/requests/getId/{id}/status-history/getAll
```

Response cung cấp `fromStatus`, `toStatus`, `changedAt`, `reason` để dựng timeline và hiển thị lý do Staff yêu cầu sửa.

## 5. Official Quote và 3 lần revision

```http
GET  /api/print/requests/getId/{id}/quotes/getAll
POST /api/print/requests/getId/{id}/quotes/{quoteId}/accept
POST /api/print/requests/getId/{id}/quotes/{quoteId}/request-revision
```

Body request revision:

```json
{
  "expectedFileVersion": 1,
  "expectedSpecVersion": 2,
  "reason": "Đổi quality và kích thước"
}
```

`PrintQuoteResponse` có version, file/spec snapshot, line items, total, issued/expires time, status và remaining revisions. Frontend hiển thị line-item breakdown nhưng không cho sửa quote.

## 6. POD payment 100%

Sau khi accept quote, tạo ZaloPay payment:

```http
POST /api/payments/zalopay
```

```json
{
  "sourceType": "PRINT_REQUEST",
  "sourceId": 123,
  "stage": "FULL",
  "description": "Thanh toán 100% yêu cầu in POD-123",
  "idempotencyKey": "uuid-mỗi-lần-tạo-giao-dịch"
}
```

Backend tự lấy số tiền từ accepted current quote; frontend không gửi amount. Response trả `orderUrl` để mở ZaloPay.

```http
GET /api/payments/print-requests/{printRequestId}
GET /api/payments/{transactionId}/status
```

Frontend poll payment pending mỗi 5 giây. Callback thành công được Backend xử lý idempotent và chuyển request vào production queue.

## 7. Polling và countdown

| Khu vực | Chu kỳ |
|---|---:|
| Request Detail | 5 giây khi chưa terminal |
| Quotes | 5 giây |
| POD payment pending | 5 giây |
| Orders/POD History | 15 giây |
| Countdown trên detail | 1 giây |

Khi countdown về 0, frontend chỉ refresh dữ liệu. Backend mới là bên chuyển trạng thái expire/cancel; client không tự sửa status.

## 8. Phần Backend chưa có hoặc chưa đủ cho Buyer UI

- API preliminary estimate/config catalog nâng cao (`quality preset`, màu theo material, post-processing, printer limit, workload).
- Chat/attachment giữa Buyer và Staff.
- Phân tích mesh trả triangle count, bounding box, watertight và viewer metadata.
- Shipment detail/carrier tracking trực tiếp theo `printRequestId`; hiện request mới trả shipping readiness.
- Notification realtime cho các transition POD.
- Claims, evidence, nghiệm thu và rating riêng cho POD.

Các phần này chỉ hiển thị trạng thái thông tin hoặc placeholder có ghi chú rõ; frontend không gọi endpoint giả.

## 9. Checklist nghiệm thu Buyer

- [ ] Upload đúng STL/OBJ/GLB/3MF và chặn file trên 50 MB.
- [ ] Draft xuất hiện riêng, không trộn Active.
- [ ] Preview gửi đúng current file/spec version.
- [ ] Configure SLA không gửi `infillPercent`.
- [ ] Mỗi lần save tạo spec version mới.
- [ ] Submit/resubmit giữ nguyên request ID.
- [ ] Staff revision hiển thị reason và cho chọn sửa file hoặc config.
- [ ] Quote hiển thị snapshot và deadline 24 giờ.
- [ ] Requote bắt buộc reason, không quá 3 lần và không reset deadline.
- [ ] Accept chỉ áp dụng current active quote.
- [ ] Payment dùng `PRINT_REQUEST + FULL`, không gửi amount từ client.
- [ ] Sau accept/payment/queue, UI không còn nút edit/requote/cancel.
- [ ] Production và shipping lấy từ response Backend, không tự suy diễn.
