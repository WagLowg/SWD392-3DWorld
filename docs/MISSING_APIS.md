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
10. **Redirect URL của ZaloPay nên kèm mã nghiệp vụ.** Backend hiện cấu hình cố định `ZALOPAY_REDIRECT_URL=http://localhost:5173/payment-result`.
    - Frontend đã xử lý: `/payment-result` tự chuyển sang `/marketplace/payment/result` và giữ nguyên tham số. Trang tra `apptransid` → đơn/gói từ dữ liệu frontend lưu lúc tạo liên kết ZaloPay. Cách này **chỉ chạy được trên trình duyệt đã bấm thanh toán**, mở từ thiết bị khác sẽ không biết là đơn nào.
    - Đề xuất: khi tạo đơn ZaloPay, Backend gắn thêm vào `redirecturl` từng giao dịch: `{ZALOPAY_REDIRECT_URL}?sourceType={sourceType}&sourceId={sourceId}` (ZaloPay vẫn tự gắn `status`, `apptransid`, `checksum` phía sau). Frontend đã đọc sẵn `sourceType=PHYSICAL_ORDER|SUBSCRIPTION` và `sourceId`.
    - Hoặc thêm API tra theo mã ZaloPay: `GET /api/payments/by-app-trans/{appTransId}` trả `sourceType`, `sourceId`, `status` (Backend đã gọi ZaloPay query nên có sẵn dữ liệu này).
    - Khi deploy, đổi `ZALOPAY_REDIRECT_URL` sang domain thật và cấu hình hosting trả `index.html` cho đường dẫn `/payment-result`.
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

## 2b. Đăng nhập một lần cho cả web (AI Studio, 3D Studio)

Frontend dùng chung một JWT (`/api/auth/login`) cho mọi module. Từ 28/10/2026 **mọi module** (Marketplace, Portal, POD, Thư viện mô hình, AI Studio `/api/ai-studio/*`, 3D Studio `/api/studio/*`) chỉ gọi backend chính qua proxy `/api` (port `API_PORT`, mặc định 8080). Frontend không còn phụ thuộc `backend/` và `AI/server/` trong repo.
- **Token chỉ sống 30 phút** (`exp − iat = 1800s`) và không có API làm mới. Cần tăng thời hạn hoặc thêm refresh token (`POST /api/auth/refresh`), nếu không mọi module sẽ đăng xuất sau 30 phút.
- Token được lưu ở `sessionStorage` nên mở module ở **tab mới** sẽ phải đăng nhập lại. Nếu Backend chuyển sang cookie httpOnly (hoặc refresh token trong cookie) thì phiên dùng được ở mọi tab.

## 2c. AI Studio — trạng thái theo spec mới (28/10/2026)

**Đã nối** (prefix `/api/ai-studio`): `config-options` (kể cả `pricing` → trang Tín dụng), `estimates`, `wallet`, `wallet/topup`, `uploads` (+ `/file`), **`POST /tasks` (JSON `CreateAiUnifiedTaskRequest`)**, `GET /tasks`, `tasks/{id}` (+ `cancel`, `refresh`), `projects`, `projects/{id}` (GET/PATCH gồm `favorite`, `archived`, `activeVersionId`), `versions/{id}`, `versions/{id}/exports`, `versions/{id}/dimensions`, `assets/{fileId}/file`.

Nhờ `POST /tasks` dạng JSON, frontend đã bật:
- Tạo từ ảnh đã upload (`uploadIds`) **kèm cấu hình** (mô hình AI, texture, remesh, polycount…) — không còn tải lại ảnh để gửi multipart.
- **Multi-View** (2–4 ảnh), **1–3 biến thể**, **Văn bản sang 3D** (`mode: text` + `prompt`).
- **Generate lại trong dự án đang mở** (`projectId`) → thêm phiên bản thay vì tạo dự án mới.
- Khoá giá (`priceVersion` + `quotedCredits`) và header `Idempotency-Key`.
- Khôi phục form tạo từ `config` của tác vụ gần nhất; hiện `errorCode` / `errorMessage`.
- Thư viện: tab **Yêu thích** / **Lưu trữ**, đánh dấu và lưu trữ dự án; trạng thái, số phiên bản, định dạng, thumbnail đọc từ `GET /projects`.

**Lỗi Backend xác nhận từ mã nguồn `3DWorld-SWD-BE` (`AiGenerationServiceImpl`)**
- **Không có job nào tự hỏi Meshy** cho tác vụ AI. Tác vụ chỉ hoàn tất khi có ai gọi `POST /tasks/{id}/refresh`, hoặc khi webhook chạy. Frontend giờ tự gọi `refresh` mỗi 10 giây khi đang ở trang Studio. Rời trang thì tác vụ đứng yên. Nên thêm `@Scheduled` worker quét các tác vụ `PROCESSING`.
- **`GET /projects` ghi cứng các trường mới** (constructor phụ của `AiProjectSummaryResponse`): `thumbnailUrl` = link tải GLB (không phải ảnh), `status` luôn `READY`, `activeVersionId` luôn `null`, `favorite` / `archived` luôn `false`, `sourceMode` luôn `single`, `versionCount` = `latestVersion` (mặc định 1 kể cả khi chưa có phiên bản). Frontend tự chụp ảnh xem trước từ tệp GLB, và dựa vào `primaryFileId` để biết dự án đã có mô hình chưa.
- **`progress` ghi cứng 50** cho mọi tác vụ `PROCESSING` (`mapDetail`), nên thanh tiến độ không phản ánh tiến độ thật của Meshy.
- **Webhook không bật được qua `.env`**: service đọc `app.ai.webhook-secret`, nhưng `application.properties` không có dòng ánh xạ. Cần thêm `app.ai.webhook-secret=${MESHY_WEBHOOK_SECRET:}`.
- **`POST /tasks` trừ tín dụng theo số biến thể nhưng chỉ tạo 1 tác vụ** (`creditCost` = tổng ước tính × `variants`). Frontend tạm giới hạn 1 biến thể.
- **Multi-View chỉ dùng ảnh đầu tiên** (`uploadIds.get(0)`). Frontend tạm ẩn Multi-View.
- **Ảnh nguồn không được lưu** khi tạo tác vụ: có đặt `inputStorageKey` nhưng không ghi tệp, nên `GET /uploads/req-{id}/file` luôn 404. Frontend ẩn các ảnh này khỏi "Ảnh gần đây".
- Ảnh upload chỉ giữ trong bộ nhớ (`stagedUploads`), nên khởi động lại backend thì mất và tạo tác vụ sẽ báo "Uploaded image not found or expired".
- **`MODEL_STORAGE_ROOT` phải là thư mục tuyệt đối mà máy chạy backend có quyền ghi.** Nếu sai (vd. copy `C:/Users/Admin/...` từ máy khác), mọi thao tác lưu mô hình sẽ lỗi 500 "Model storage is unavailable": tạo dự án 3D Studio, upload Thư viện, và hoàn tất tác vụ AI.

**Lỗi Backend phát hiện khi test (28/10/2026)**
1. **`POST /tasks` với `uploadIds: []` tự chuyển sang Text-to-3D và trừ tín dụng**, kể cả khi `consent: false` và không có `prompt` (dùng `name` làm prompt). Cần: từ chối 400 khi `consent != true`; với `mode` ảnh mà thiếu ảnh thì báo lỗi, không đổi chế độ. Frontend đã chặn phía trình duyệt.
2. **`PATCH /projects/{id}` nhận `favorite` / `archived` nhưng không lưu** (`GET /projects` vẫn trả `false`). Nút Yêu thích / Lưu trữ đã nối sẵn, sẽ chạy khi Backend sửa. Response của PATCH (`AiProjectDetailResponse`) cũng chưa có `favorite`, `archived`, `activeVersionId`.
3. **`GET /projects` trả sai tóm tắt**: dự án chỉ có tác vụ thất bại vẫn trả `status: READY`, `versionCount: 1`, `formats: ["glb"]`; dự án Text-to-3D trả `sourceMode: "single"`.
4. **`estimates` bỏ qua `mode`**: Multi-View vẫn tính 30 tín dụng, trong khi `pricing` công bố "Multi-View Detailed" 50.
5. **Chưa công bố giá trị hợp lệ của `mode`** (frontend gửi `image` / `multi-image` / `text`) và enum `status` của tác vụ / dự án.

**Còn thiếu**
6. `AiProjectDetailResponse` thiếu `activeVersionId`, `favorite`, `archived`, `sourceMode`, `thumbnailUrl` → trang Studio chưa biết phiên bản chính thật (đang lấy phiên bản mới nhất).
7. `AiProjectDetailResponse.tasks` (tóm tắt) thiếu `progress`, `errorMessage`, `config`, `imageIds` → frontend vẫn gọi thêm `tasks/{id}` cho tác vụ đang chạy.
8. `GET /projects` chưa có tìm kiếm / lọc / sắp xếp / phân trang → frontend lọc trên trình duyệt.
9. Ảnh xem trước (thumbnail) cho dự án và phiên bản: trường đã có nhưng đang luôn `null`.
10. Công bố khoá trong `stats` (số đỉnh, tam giác, khung bao).
11. `GET versions/{id}` chưa trả lại kích thước in đã lưu bằng `PUT …/dimensions`.
12. Xuất STL / OBJ / FBX / 3MF / USDZ — hiện chỉ GLB.
13. Lịch sử tín dụng (ledger) và mua tín dụng qua ZaloPay (`wallet/topup` chỉ là nạp demo).
14. Tạo yêu cầu in trực tiếp từ phiên bản mô hình (`POST /api/print/requests/from-model-version`), thay vì frontend tải GLB rồi upload lại.
15. URL tải file cần Bearer token → frontend phải tải qua `fetch` rồi tạo `blob:` URL. Có thể thêm URL ký sẵn ngắn hạn.

## 2b-bis. Kết quả test AI Studio + 3D Studio (28/10/2026, spec mới)

> Bản chi tiết request/response gửi Backend: [AI_3D_STUDIO_BACKEND_REQUESTS.md](AI_3D_STUDIO_BACKEND_REQUESTS.md).

- **AI Studio chạy được**: `defaultProvider = MESHY`, nạp demo hoạt động, tạo tác vụ Meshy thành công.
- **Vẫn chặn — lưu trữ tệp mô hình chưa chạy**: `POST /api/studio/projects`, `POST /api/studio/models`, `POST /api/models/create` đều trả **500 "Model storage is unavailable"** (lỗi giờ đã hiện đúng thay vì 401). Kiểm tra `CLOUDINARY_*` / thư mục lưu trữ của Backend. Hệ quả: chưa tạo được dự án 3D Studio (nên chưa test được lưu, snapshot, gửi in), chưa upload được vào Thư viện mô hình.
- Thư viện mẫu 3D Studio vẫn ghi cứng ở frontend; chưa có API mẫu.

## 2c-bis. 3D Studio — trạng thái theo spec mới

**Đã nối** (prefix `/api/studio`): `GET/POST /projects`, `GET/PATCH/DELETE /projects/{id}`, `duplicate`, `PUT /projects/{id}/content`, `GET/POST /projects/{id}/snapshots`, `PATCH /snapshots/{code}`.
- Tạo dự án gửi `unit`, `preset`, `templateId`, `icon`, `thumbnail`; danh sách đọc các trường này từ `GET /projects` (bộ nhớ trình duyệt chỉ còn là dự phòng cho dự án cũ).
- Lưu nội dung gửi `baseRevision` + `name` + `nodes` + `thumbnail` trong một lần gọi; dùng `revision` của Backend.
- **Snapshot upload tệp STL thật** (multipart `meta` JSON + `file`) kèm metadata (`revision`, `meshHash`, `dims`, `parts`, `triangles`, `acknowledgedWarnings`, `consentVersion`) → mở lại / gửi in được từ máy khác.

**Chưa kiểm chứng được** (vì tạo dự án đang lỗi 500): body `PUT content` mới, multipart snapshot, đọc `thumbnail` / `thumbnailUrl`.

**Lỗi Backend xác nhận từ mã nguồn (`StudioModelServiceImpl`, 28/10/2026)**
- **Snapshot làm tăng revision của dự án**: mỗi snapshot là một `ModelVersion` mới (`versionNumber + 1`), nên lần Lưu kế tiếp với `baseRevision` cũ bị 409 "Xung đột revision". Frontend đã sửa: sau khi tạo snapshot thì lấy `versionNumber` trả về làm `baseRevision`. Nên tách snapshot khỏi chuỗi revision của cảnh.
- **Mở lại dự án sau khi tạo snapshot thì cảnh trống**: phiên bản snapshot (multipart) chỉ chứa STL, còn `getProject` chỉ đọc cảnh từ phiên bản mới nhất. Đã sửa tại máy local (đọc cảnh từ phiên bản mới nhất *có* `EDITABLE_SCENE`); cần commit vào repo backend.
- `createSnapshotWithFile` bị `NullPointerException` (500) khi `meta.parts` để trống. Đã sửa tại máy local.
- `thumbnailUrl` của dự án là `/api/studio/projects/{id}/thumbnail` (cần token), nên `<img>` không hiện được. Frontend dùng thumbnail đã lưu ở trình duyệt.

**Còn thiếu**
1. `PATCH /snapshots/{code}` chỉ sửa `note` → trạng thái / đồng ý của snapshot sau khi tạo vẫn phải ghi trong `note` dạng JSON. Nên thêm `state`, `consentVersion` vào `UpdateStudioSnapshotRequest`.
2. **Gửi in từ 3D Studio** và liên kết dự án ↔ yêu cầu in. Hiện frontend tải STL lên `/api/print/requests/create` rồi lưu mã yêu cầu ở `localStorage`.
3. `thumbnailUrl` nên là URL công khai (Cloudinary) hoặc ký sẵn; nếu là `/api/studio/projects/{id}/thumbnail` (cần token) thì `<img>` không hiện được.
4. Có hai bộ đường dẫn trùng nhau (`/models…` và `/projects…`; `POST /versions` + `/save` với `expectedVersion` song song với `PUT /content` với `baseRevision`). Frontend dùng `/projects` + `PUT /content`; cần Backend chốt một bộ.

## 2d. Thay đổi đường dẫn ở spec mới (đã cập nhật frontend)

Spec 28/10/2026 đổi các đường dẫn dưới đây; frontend đã chuyển sang đường dẫn mới:
- POD: `POST …/file/correct` → `…/file/versions/create`; `GET …/file/versions` → `…/file/versions/getAll`.
- Thư viện mô hình (`src/features/models/services/model.service.ts`): `/api/models/my` → `/api/models/getAll`; `/api/models/{id}` → `/api/models/getId/{id}`; `/api/models/{id}/versions` → `/api/models/getId/{id}/versions/getAll`; `/api/models/{id}/versions/{vid}` → `/api/models/getId/{id}/versions/getId/{vid}`; `/api/models/uploads` → `/api/models/create`; lưu phiên bản `…/versions/save` → `…/versions/create`.

## 3. Vấn đề trong OpenAPI cần Backend làm rõ

- **`POST /api/reports` trỏ nhầm schema**: `CreateRequest` (name, description) bị trùng tên với schema tạo gian hàng. Frontend đang gửi `{ productId, reportedUserId, reason, description, evidenceReference }` theo mô tả endpoint. Cần đổi tên schema để Swagger hiện đúng.
- **Enum trạng thái chưa công bố**: trạng thái sản phẩm (`ProductView.status`), trạng thái xác thực người bán (`State.status`), giá trị `status` của `/api/admin/seller-verifications`, trạng thái gói (`SubscriptionResponse.status`). Frontend đang map theo tên phổ biến (PENDING / APPROVED / REJECTED…).
- **Thiếu khai báo bảo mật**: các endpoint `/api/storefronts/me*` và `POST /api/storefronts` không có `security: bearerAuth`.
- **`ItemRequest` bị trùng tên**: cùng một schema `ItemRequest` vừa dùng cho giỏ hàng (`variantId`) vừa dùng cho đóng gói (`orderItemId`). Swagger hiện sai body của `POST /api/cart/items`.
- **Dạng phân trang không thống nhất**: chỗ dùng `{ items, page, size }`, chỗ dùng Spring `{ content, number, … }`.
