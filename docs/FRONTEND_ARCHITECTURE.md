# Frontend Architecture

Frontend là một Vite multi-page application: một package và một dev server, nhưng mỗi module lớn có React root riêng để CSS, router và vòng đời Three.js không ảnh hưởng lẫn nhau.


```text
Browser
  ├─ /                    → Landing
  ├─ /login/*             → Auth
  ├─ /ai/*                → AI Studio
  ├─ /studio/*            → 3D Studio
  ├─ /marketplace/*       → Marketplace
  ├─ /pod/*               → POD
  └─ /portal/*            → Portal
             │
             └─ /api/* → Vite proxy → backend:8080
```

## Quy tắc phụ thuộc

- `features/*` có thể dùng `app` và `shared`.
- Một feature có thể dùng public API của feature khác khi luồng nghiệp vụ cần, ví dụ AI Studio và 3D Studio gửi in qua `pod/services`.
- `shared` **không import** từ `features`. Token, `fetchMe` và `goLogin` nằm trong `shared/session`; các màn hình auth vẫn thuộc `features/auth`.
- `src/drafts` có thể import `features`/`shared`, nhưng không nơi nào được import từ `drafts`.
- `entries` chỉ boot module, không chứa component hay nghiệp vụ.

## Backend

- Repository này chỉ chứa frontend. Mọi module gọi backend chính (3DWorld-SWD-BE, repo riêng) qua `/api`; port đặt bằng `API_PORT` (mặc định `8080`).
- `AI/client` đã được đưa vào `src/features/ai-studio`; AI Studio và 3D Studio dùng `/api/ai-studio/*`, `/api/studio/*` của backend chính.

Việc frontend chạy một port không có nghĩa backend phải chung port. Trong môi trường phát triển, trình duyệt chỉ mở port `5173`; Vite proxy che các port backend phía sau `/api`.
