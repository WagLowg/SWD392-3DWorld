# Frontend architecture

`frontend` chỉ chứa các nghiệp vụ mới. Ba ứng dụng đã có của team giữ source riêng ở cấp repository:

| Ứng dụng | Source chính | Ghi chú |
|---|---|---|
| Landing Page | `../landingPage/` | Giữ nguyên, không copy vào frontend |
| AI Studio + Meshy | `../AI/` | Giữ nguyên, kiểm tra tích hợp sau |
| 3D Studio | `../Studio/` | Giữ nguyên, không copy vào frontend |
| Auth | `src/features/auth/` | Login, register và các màn hình account tiếp theo |
| Marketplace | `src/features/marketplace/` | Nghiệp vụ catalog/marketplace |
| POD | `src/features/pod/` | Nghiệp vụ in 3D theo yêu cầu |
| Product Portal | `src/features/portal/` | Skeleton và traceability theo FRD |

## Hướng phụ thuộc

```text
feature page/component
        ↓
feature hook
        ↓
feature service
        ↓
shared/api (Axios)
        ↓
backend REST API
```

```text
app      → features, shared
features → shared
shared   ✕ features
```

- React Query giữ server state.
- Zustand giữ client/UI state dùng chung.
- React Hook Form + Zod xử lý form và validation.
- Component không gọi Axios trực tiếp.

## Cấu trúc một feature

Chỉ tạo folder khi có code thật:

```text
src/features/pod/
├── pages/
├── components/
├── hooks/
├── services/
├── types/
├── schemas/
└── routes.tsx
```

Không bắt buộc mọi feature phải có đủ tất cả folder.

## Source of truth

- Route/path dùng chung: `src/app/routing/paths.ts`.
- API client và kiểu lỗi: `src/shared/api/`.
- Environment public: `src/shared/config/env.ts`.
- Global UI state: `src/shared/stores/`.
- Requirement map: `src/features/portal/requirements.ts`.
- Entry build/dev: `vite.config.ts` và các file `<feature>/index.html`.

Mỗi module chỉ có một source chính. Nếu cần tích hợp Landing, AI hoặc Studio vào cùng domain, dùng reverse proxy/deployment routing hoặc API contract; không copy source vào `frontend`.
