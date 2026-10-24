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
- Một feature có thể dùng public API của feature khác khi luồng nghiệp vụ cần, ví dụ Studio dùng session của Auth.
- `shared` không phụ thuộc vào UI cụ thể của feature. Token dùng cho Axios nằm trong `shared/session`; các màn hình auth vẫn thuộc `features/auth`.
- `entries` chỉ boot module, không chứa component hay nghiệp vụ.

## Backend trong repository

- `backend/` là Spring Boot service chính, được giữ nguyên trong đợt hợp nhất frontend.
- `AI/server/` là Node AI service cũ/độc lập, cũng được giữ nguyên. `AI/client` đã được đưa vào `src/features/ai-studio`.

Việc frontend chạy một port không có nghĩa backend phải chung port. Trong môi trường phát triển, trình duyệt chỉ mở port `5173`; Vite proxy che các port backend phía sau `/api`.
