# Frontend architecture

Skeleton này ghép các phần đã có thành một website đa entry. Mỗi entry có route và CSS riêng để tránh một module làm thay đổi giao diện của module khác.

## Module ownership

| Module | Source chính | Route | Cách sử dụng |
|---|---|---|---|
| Landing Page | `src/landing/` | `/` | Giữ nguyên và dùng làm cửa vào website |
| AI Studio + Meshy | `src/ai/` | `/ai/*` | Giữ nguyên generator, history, result và Viewer3D |
| 3D Studio | `src/studio/` | `/studio/*` | Giữ nguyên editor, dashboard và project flow |
| Marketplace | `src/marketplace/` | `/marketplace/*` | Phát triển mới từ skeleton theo FR-CAT/SEL/CRT/CHK/ORD |
| Print On Demand | `src/pod/` | `/pod/*` | Phát triển mới theo FR-POD và tái sử dụng model/version từ AI/Studio |
| Product Portal | `src/portal/` | `/portal/*` | Shell cho account, seller, buyer, operations và các màn hình nghiệp vụ còn thiếu |

## Quy tắc bảo toàn code hiện có

1. Không copy component từ `landing`, `ai` hoặc `studio` sang Portal.
2. Điều hướng giữa các entry bằng URL tuyệt đối nội bộ (`/ai/studio`, `/ai/models`, `/studio/`).
3. Dữ liệu model truyền giữa module bằng ID/version ID qua route hoặc API, không truyền React state xuyên entry.
4. CSS của feature mới chỉ nằm trong feature đó; không thêm global selector có thể ảnh hưởng Landing, AI hoặc Studio.
5. Nếu cần thay đổi một module hiện có, tách commit riêng và kiểm tra lại đúng luồng của module đó.

## Dependency direction

```text
landing ──────┐
ai ───────────┼──> shared (session + module navigation)
studio ───────┤
marketplace ──┤
pod ──────────┤
portal ───────┘

feature modules ──> core (route/query utilities)
feature modules ──> services (Axios + external adapters)
feature modules ──> stores (Zustand client state)
app providers ────> React Query
core/shared/services/stores ──X──> feature modules
```

`core`, `shared`, `services` và `stores` không import ngược từ feature. Nhờ vậy team có thể phát triển Marketplace, POD và Portal mà không tạo dependency vòng hoặc kéo CSS vào ba module đã hoàn thành.

Phân chia state:

- React Query giữ dữ liệu API, cache, loading và mutation state.
- Zustand giữ client/UI state dùng xuyên component.
- React Hook Form + Zod giữ form state và validation.
- Axios trong `services/http` là HTTP client duy nhất cho code mới.

## Route source of truth

- Route đang chạy của Landing nằm trong `src/landing/config/routes.ts`.
- Route nghiệp vụ/skeleton nằm trong `src/portal/requirements.ts`.
- Helper cho code mới nằm trong `src/core/routing/paths.ts`.
- Multi-page entries và dev fallback nằm trong `vite.config.ts`.

Khi backend contract chưa được duyệt, page giữ trạng thái skeleton và không tự đặt endpoint hoặc field. Design Service tiếp tục ở trạng thái blocked cho tới khi schema riêng được phê duyệt.
