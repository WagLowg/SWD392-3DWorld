# Yêu cầu Backend cho AI Studio & 3D Studio

Mục tiêu: AI Studio và 3D Studio chạy **đầy đủ như bản cũ** (backend Spring + AI service nằm trong repo frontend, đã xoá ngày 28/10/2026), nhưng dùng backend chính **3DWorld-SWD-BE**.

So sánh dựa trên mã backend cũ (còn trong git history: `git show f6299a6:backend/...`) và OpenAPI của backend chính ngày 28/10/2026. Kết quả test thực tế cùng ngày.

Mức ưu tiên:
- **P0**: thiếu thì luồng chính không chạy.
- **P1**: tính năng của bản cũ đang bị ẩn hoặc chạy tạm.
- **P2**: tốt hơn, không bắt buộc.

---

## 0. Lỗi và cấu hình cần sửa trước (P0)

| # | Vấn đề | Hiện tại | Cần làm |
|---|---|---|---|
| 0.1 | **Lưu tệp mô hình không chạy** | `POST /api/models/create` → 500 `Model storage is unavailable`. `POST /api/studio/projects`, `POST /api/studio/models`, `POST /api/print/requests/create` → 401 (lỗi nội bộ bị che) | Cấu hình Cloudinary hoặc thư mục lưu trữ (`CLOUDINARY_*`). Xem log Backend khi gọi các API trên. Upload ảnh AI (`staging/…`) vẫn chạy. |
| 0.2 | **Lỗi nội bộ bị trả thành 401** | Spring Security chặn `/error`, nên mọi exception chưa bắt thành `401 A valid Bearer token is required.` | `permitAll()` cho `/error`, hoặc trả lỗi qua `@ControllerAdvice`, để frontend nhận đúng 400/409/500 kèm thông điệp. |
| 0.3 | **Chưa có nhà cung cấp AI** | `config-options.defaultProvider = UNCONFIGURED` | Thêm `app.ai.meshy-api-key=${MESHY_API_KEY:}` vào `application.properties`, đặt `MESHY_API_KEY` trong `.env`, rồi khởi động lại. Khi dev chưa có key: `SPRING_PROFILES_ACTIVE=dev` để dùng provider Mock. |
| 0.4 | **Không có tín dụng để test** | `POST /wallet/topup` → 403 `Demo credit top-up is disabled in production environments` | Bật demo top-up ở profile `dev`/`test`, hoặc cấp sẵn tín dụng khi đăng ký. |
| 0.5 | **Phiên đăng nhập 30 phút** | JWT sống 1800 s, không có refresh | Tăng thời hạn hoặc thêm `POST /api/auth/refresh`. Nếu không, AI Studio bị đăng xuất giữa lúc chờ tạo mô hình. |

---

## 1. AI Studio

### Đang dùng được (không cần làm)
`GET config-options`, `POST estimates`, `GET/POST uploads`, `GET uploads/{id}/file`, `POST image-to-3d`, `GET tasks/{id}`, `POST tasks/{id}/refresh`, `POST tasks/{id}/cancel`, `GET projects`, `GET/PATCH projects/{id}`, `GET versions/{id}`, `PUT versions/{id}/dimensions`, `POST versions/{id}/exports`, `GET assets/{fileId}/file`, `GET wallet`, `POST wallet/topup`, `POST /api/webhooks/meshy`.

### A1. Tạo mô hình từ ảnh đã upload, có cấu hình — **P0**
Hiện `image-to-3d` / `tasks` (multipart) chỉ nhận `file`, `name`, `prompt`, nên **mọi tuỳ chọn trên giao diện bị bỏ qua** (mô hình AI, chất lượng, texture, PBR, độ phân giải, remesh, polycount). Frontend phải tải lại ảnh rồi gửi lại.

Bản cũ: `POST /api/ai-studio/tasks` (JSON) + header `Idempotency-Key`
```json
{
  "mode": "single",                 // "single" | "multi"
  "imageIds": ["<uploadId>"],       // single: đúng 1 ảnh; multi: 1–4 ảnh
  "config": { "aiModel": "latest", "shouldTexture": true, "enablePbr": false, "textureResolution": "2k", "...": "..." },
  "variants": 1,                    // 1–4
  "projectId": null,                // có giá trị = tạo phiên bản mới trong dự án cũ
  "title": "Robot thám hiểm",
  "consent": true,                  // xác nhận quyền dùng ảnh
  "priceVersion": "pv-2026-10-22",
  "quotedCredits": 30
}
```
Trả `201 { projectId, tasks: [Task], replay: false }`. Gửi lại cùng `Idempotency-Key` → `200 { …, replay: true }` (không trừ tiền lần 2).

Lỗi:
- `402 INSUFFICIENT_CREDITS { required, balance }`
- `409 PRICE_CHANGED { estimate }`: giá đã đổi so với `quotedCredits`
- `400 CONSENT_REQUIRED`, `400 INVALID_IMAGES`

Đề xuất: thêm `uploadIds`, `projectId`, `consent`, `quotedCredits`, `priceVersion` vào `CreateAiUnifiedTaskRequest` (đã có `config`, `variants`) và nhận header `Idempotency-Key`.

Kèm theo:
- **Multi-View** (2–4 ảnh cùng vật thể). Frontend đang ẩn.
- **Nhiều biến thể** một lần. Frontend đang khoá 1.
- **Kiểm tra tín dụng trước khi lưu ảnh**: hiện `image-to-3d` trả 402 nhưng vẫn lưu ảnh vào uploads, để lại ảnh rác.

### A2. Công bố trạng thái tác vụ — **P0**
Ghi rõ enum `status` của `AiTaskDetailResponse` (bản cũ: `SUBMITTED, QUEUED, IN_PROGRESS, SUCCEEDED, FAILED, CANCELED`). Frontend đang đoán.

Thêm vào task:
- `errorCode`, `errorMessage` (hiện chỉ có `failureReason`)
- `config`, `imageIds` để khôi phục form của dự án cũ
- `variantIndex`

### A3. Danh sách dự án có lọc / sắp xếp / phân trang — **P1**
Bản cũ: `GET /api/ai-studio/projects`

| Tham số | Giá trị |
|---|---|
| `q` | tìm theo tên |
| `tab` | `all` \| `recent` (7 ngày) \| `favorites` \| `archived` |
| `mode` | `single` \| `multi` |
| `status` | `DRAFT` \| `PROCESSING` \| `READY` \| `FAILED` |
| `sort` | `newest` \| `oldest` \| `name` |
| `page`, `pageSize` | mặc định 1, 9; tối đa 48 |

Trả `{ items, total, page, pageSize }`.

Hiện `GET /projects` không có tham số và thiếu các trường sau trong `AiProjectSummaryResponse`:
- `status`, `thumbnailUrl`, `activeVersionId`
- `favorite`, `archived`, `sourceMode`
- `versionCount`, `formats[]`

### A4. Yêu thích, lưu trữ, chọn phiên bản chính — **P1**
`PATCH /api/ai-studio/projects/{id}` cần nhận thêm `favorite: boolean`, `archived: boolean`, `activeVersionId`. Hiện chỉ có `name`, `description`, `visibility`, nên frontend đã ẩn các nút này.

### A5. Chi tiết dự án đủ dữ liệu — **P1**
`GET /projects/{id}` cần thêm:
- `tasks[]` đầy đủ (`progress`, `errorMessage`, `config`, `imageIds`). Hiện là bản tóm tắt nên frontend phải gọi `tasks/{id}` cho từng tác vụ.
- `images[]`: ảnh nguồn của dự án (`id, name, mime, sizeBytes, width, height, url`).
- `activeVersionId`.

### A6. Phiên bản: ảnh xem trước, thống kê, kích thước đã lưu — **P1**
`GET /versions/{id}` cần:
- `thumbnailUrl` (ảnh xem trước). Hiện thư viện chỉ hiện icon.
- `stats` với khoá cố định: `vertices`, `triangles`, `bbox: { x, y, z }` (mm hoặc đơn vị gốc). Dùng để hiển thị và giữ tỉ lệ khi nhập kích thước in.
- `dimensions: { lengthMm, widthMm, heightMm, keepRatio, confirmedAt }`. `PUT dimensions` lưu được nhưng `GET` không trả lại, nên tải lại trang là mất.
- `label` (vd. "V2 · Biến thể 1").

Validate kích thước như bản cũ: mỗi chiều 5–1000 mm.

### A7. Xuất nhiều định dạng — **P1**
`POST /versions/{id}/exports { format }` hiện chỉ có GLB. Bản cũ hỗ trợ:
- `glb`, `stl` (quan trọng cho in 3D), `3mf`, `fbx`, `usdz`
- `obj`: trả ZIP gồm `model.obj`, `model.mtl` và ảnh texture

Trả `{ downloadUrl, format, sizeBytes, packaging?: "zip", files?: [], texturesIncluded? }`.

Lỗi định dạng chưa có: `409 FORMAT_UNAVAILABLE`.

### A8. Sổ cái tín dụng — **P1**
`GET /wallet` cần thêm:
- `held`: đang giữ cho tác vụ chưa xong
- `spent`
- `ledger[]`: `{ id, type: HOLD|SETTLE|REFUND|TOPUP, amount, taskId, note, createdAt }`, 50 dòng gần nhất

Tác vụ lỗi hoặc huỷ phải hoàn tín dụng (REFUND), mỗi tác vụ chỉ giữ / tính / hoàn **một lần**.

### A9. Gửi in từ phiên bản mô hình AI — **P0** (luồng "AI → In 3D")
Bản cũ:
- `GET /api/ai-studio/pod-options`: công nghệ → vật liệu → chất lượng. Ví dụ FDM: PLA/PETG/ABS; 0.28 / 0.20 / 0.12 mm.
- `POST /api/ai-studio/versions/{id}/pod-handoffs` + `Idempotency-Key`:
  ```json
  { "technology": "FDM", "material": "PLA", "quality": "0.20 mm · Tiêu chuẩn", "color": "Trắng", "quantity": 1, "note": "", "confirm": true }
  ```
  Bắt buộc đã xác nhận kích thước (`400 DIMENSIONS_REQUIRED`). Backend tự lấy tệp in được (stl/glb/3mf/obj) của phiên bản, tạo PrintRequest trạng thái chờ thẩm định.
  Trả `{ handoff: { id, printRequestId, versionId, projectId, config, files, status, createdAt } }`.
- `GET /api/ai-studio/pod-handoffs`: danh sách yêu cầu in tạo từ AI Studio.

Hiện frontend phải tải GLB về rồi upload lại qua `POST /api/print/requests/create` (đang lỗi theo 0.1).

Đề xuất trên backend chính: `POST /api/print/requests/from-model-version { modelVersionId, materialId, color, quality, quantity, notes }`, và lọc `GET /api/print/requests/getAll?modelVersionId=`.

### A10. Bảng giá — **P2**
Trang Tín dụng đang ghi cứng bảng giá. Thêm `pricing[]` vào `config-options`: `{ label, aiModel, texture, credits }`.

### A11. Mua tín dụng thật — **P2**
Mua tín dụng AI qua ZaloPay (vd. `sourceType=AI_CREDITS`). Bản cũ cũng chỉ có nạp demo.

---

## 2. 3D Studio

### Đang dùng được (khi 0.1 được sửa)
`GET/POST /api/studio/projects`, `GET/PATCH/DELETE /projects/{id}`, `POST /projects/{id}/duplicate`, `PUT /projects/{id}/content`, `GET/POST /projects/{id}/snapshots`, `PATCH /projects/{id}/snapshots/{code}`, `GET /projects/{id}/thumbnail`, `GET /projects/{id}/files/{fileId}/download`.

Lưu ý: backend chính có cả `PUT /content { baseRevision }` và `POST /save { expectedVersion }` cho cùng một việc. Frontend dùng `/content`. Nên giữ một endpoint.

### S1. Thông tin dự án cho danh sách — **P1**
`StudioProjectSummaryResponse` hiện chỉ có `modelId, name, modelType, originType, latestVersion, createdAt, updatedAt`.

Bản cũ có thêm:
- `status`: `draft` \| `saved`
- `unit`: `mm`
- `preset`, `templateId`
- `icon`: dùng khi chưa có ảnh
- `revision`
- `thumbnail`: URL ảnh xem trước

Frontend đang nhớ ảnh xem trước ở `localStorage`, nên đổi máy là mất.

### S2. Lưu ảnh xem trước khi tạo / lưu — **P1**
Bản cũ: `POST /projects` và `PUT /projects/{id}/content` nhận thêm `thumbnail` (data URL PNG/WebP, ≤ ~300 KB), backend lưu tệp rồi trả lại URL qua `thumbnail` / `GET /thumbnail`.

Hiện chưa có chỗ gửi ảnh lên. Frontend nhét ảnh vào `scene` nên scene JSON phình to.

`POST /projects` cũng nên nhận `preset`, `templateId`, `icon`.

### S3. Lưu nội dung một lần — **P1**
Bản cũ: `PUT /content { baseRevision, name, nodes, thumbnail }` đổi tên + lưu scene + ảnh trong **một** lần gọi.
- Trả `{ revision, savedAt, project }`.
- Xung đột → `409 REVISION_CONFLICT { currentRevision }`.

Hiện `/content` chỉ nhận `scene`, `note`, nên frontend phải gọi thêm `PATCH` để đổi tên (2 lần gọi, không nguyên tử).

### S4. Snapshot có tệp STL do trình duyệt tạo — **P0** (cần cho xuất và gửi in)
Trình dựng 3D tự bake lưới (CSG, chữ nổi, lỗ…) thành STL ở trình duyệt. Backend chính chỉ nhận `{ note, format }` và tự xuất tệp, nên không khớp với cái người dùng thấy.

Bản cũ: `POST /projects/{id}/snapshots` multipart:
- part `meta` (JSON):
  ```json
  { "revision": 5, "meshHash": "sha256…", "dims": [60, 24, 4], "parts": 3, "triangles": 1840,
    "acknowledgedWarnings": ["THIN_WALL"], "consentVersion": "2026-10", "unit": "mm" }
  ```
- part `file`: tệp STL nhị phân

Trả `201 { snapshot: { id, revision, meshHash, dims, parts, triangles, state, createdAt, acknowledgedWarnings, consentVersion, unit, bytes, downloadUrl } }`.

`PATCH /snapshots/{code}` cập nhật `state` / cảnh báo đã xác nhận, `GET /snapshots` trả lại đủ các trường trên.

Hiện frontend giữ STL trong bộ nhớ (mất khi tải lại trang) và nhét metadata vào `note` dạng JSON.

### S5. Gửi in từ snapshot — **P0**
Bản cũ:
- `POST /api/studio/print-requests` + `Idempotency-Key`:
  ```json
  { "projectId": "...", "snapshotId": "SNP-…", "technology": "FDM", "material": "PLA", "color": "Trắng", "quantity": 1, "note": "", "consent": true }
  ```
  Trả `201 { request: { id, snapshotId, projectId, idempotencyKey, quantity, technology, material, note, stage, createdAt } }`.
- `GET /api/studio/print-requests/{code}`: trạng thái (stage) để hiện tiến độ trong Studio.
- Danh sách yêu cầu in của một dự án.

Hiện frontend upload STL qua `/api/print/requests/create` (đang lỗi theo 0.1) và lưu mã yêu cầu ở `localStorage`.

Đề xuất: `POST /api/print/requests/from-studio-snapshot { projectId, snapshotCode, materialId, … }` và lọc `GET /api/print/requests/getAll?studioProjectId=`.

### S6. Mẫu và giới hạn — **P2**
- **Thư viện mẫu** (keychain, khay bút, biển tên…) đang ghi cứng ở frontend. Thêm `GET /api/studio/templates` khi cần quản lý mẫu từ admin.
- **Giới hạn trình dựng** (`src/features/studio/config.ts`: số đối tượng tối đa, kích thước bàn in, độ dày thành tối thiểu…) đang ghi cứng. Thêm `GET /api/studio/capabilities`.

---

## 3. Chung (P2)

- **URL tải tệp ký sẵn ngắn hạn**: hiện mọi tệp (ảnh, GLB, thumbnail) cần Bearer token, nên frontend phải `fetch` rồi tạo `blob:` URL. URL ký sẵn cho phép `<img>` và trình tải GLB dùng trực tiếp, nhanh hơn và có cache.
- **Text-to-3D**: backend đã có `/api/ai-studio/text-to-3d`, frontend chưa có giao diện. Không có trong bản cũ.

---

## Thứ tự đề xuất

1. **0.1 – 0.4**: sửa lưu trữ, `/error`, cấu hình Meshy / tín dụng. Chỉ cần cấu hình và sửa lỗi, mở khoá toàn bộ luồng đang có.
2. **A1, A2, A9, S4, S5**: tạo mô hình đúng cấu hình, gửi in từ AI và từ Studio.
3. **A3 – A8, S1 – S3**: khôi phục các tính năng đang bị ẩn.
4. **Mục P2.**

Khi Backend làm xong mục nào, báo frontend để bỏ phần chạy tạm tương ứng (xem `src/features/ai-studio/lib/backend.ts` và `src/features/studio/services/projects.ts`).
