# Frontend Team Guide

Tài liệu này giúp team thống nhất: code ở đâu, gọi API qua đâu và tránh tạo folder trùng.

## 1. Cấu trúc chung

```text
frontend/src/
├── app/                         # Điểm khởi động, providers, routing cấp app
│   ├── providers/
│   └── routing/
├── features/                    # Chia code theo nghiệp vụ
│   ├── auth/
│   ├── marketplace/
│   ├── pod/
│   └── portal/
├── shared/                      # Phần thật sự dùng chung
│   ├── api/                     # Axios instance, normalize lỗi, API types chung
│   ├── config/                  # Biến môi trường public
│   ├── lib/                     # Hàm tiện ích không chứa nghiệp vụ
│   └── stores/                  # Zustand store dùng toàn frontend
└── test/                        # Setup test chung
```

Ba ứng dụng đã có không nằm trong `frontend/src`:

```text
landingPage/                     # Landing source chính
Studio/                          # 3D Studio source chính
AI/                              # AI Studio + Meshy source chính
```

Không tạo lại `frontend/src/landing`, `frontend/src/studio` hoặc `frontend/src/ai`.

## 2. Code một chức năng ở đâu?

Ví dụ làm chức năng tạo yêu cầu POD:

```text
features/pod/
├── pages/
│   ├── customer/
│   ├── staff/
│   └── admin/
├── components/
├── hooks/
├── services/
├── schemas/
├── types/
└── routes.tsx
```

Ý nghĩa:

- `pages/`: màn hình gắn với route.
- `components/`: UI chỉ phục vụ feature này.
- `hooks/`: React Query hook hoặc logic React tái sử dụng trong feature.
- `services/`: hàm gọi API của feature.
- `schemas/`: Zod schema cho form/input.
- `types/`: request, response và model TypeScript.
- `routes.tsx`: route của feature nếu feature có nhiều màn hình.

Không cần tạo đủ mọi folder từ đầu. Chỉ tạo khi có file thật.

## 3. Luồng gọi API

```text
Page
  ↓
Hook (TanStack Query / Mutation)
  ↓
Feature Service
  ↓
shared/api/client.ts (Axios)
  ↓
Backend REST API
```

Ví dụ:

```ts
// features/pod/services/pod.service.ts
import { http } from '../../../shared/api'
import type { PrintRequest } from '../types/pod.types'

export const podService = {
  getRequest: (id: string, signal?: AbortSignal) =>
    http.get<PrintRequest>(`/api/pod/requests/${id}`, { signal }),
}
```

Page không gọi `axios` trực tiếp. Toàn bộ frontend dùng chung client trong `shared/api`.

## 4. Dùng state đúng chỗ

| Loại state | Công cụ |
|---|---|
| Dữ liệu từ backend, loading, cache | TanStack Query |
| Form | React Hook Form + Zod |
| UI state dùng nhiều component | Zustand |
| State nhỏ chỉ trong một component | `useState` |

Không copy toàn bộ dữ liệu backend vào Zustand nếu TanStack Query đã quản lý dữ liệu đó.

## 5. Khi nào đưa vào shared?

- Chỉ một feature dùng: để trong `features/<feature>`.
- Từ hai feature trở lên cùng dùng: cân nhắc chuyển sang `shared`.
- Không đưa business logic vào component UI dùng chung.
- Không tạo một Axios instance mới cho từng feature.

## 6. Route và entry hiện tại

| URL | Source |
|---|---|
| `/login/`, `/register/` | `features/auth/` |
| `/marketplace/` | `features/marketplace/` |
| `/pod/` | `features/pod/` |
| `/portal/` | `features/portal/` |

Landing, Studio và AI là package độc lập. Khi deploy chung domain, việc ghép route thực hiện ở reverse proxy/hosting, không copy code qua lại.

## 7. Cách chạy

Frontend nghiệp vụ:

```bash
cd frontend
npm install
npm run dev
```

Kiểm tra trước khi push:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Muốn chạy Landing, Studio hoặc AI thì vào đúng folder của ứng dụng đó và chạy script của package tương ứng.

## 8. Git và file không được push

`.gitignore` ở root áp dụng cho toàn repository:

```text
**/node_modules/
**/dist/
**/target/
**/.env
**/coverage/
```

Được commit `.env.example`, không commit `.env` thật. Sau khi clone, mỗi thành viên chạy `npm install` để tạo lại `node_modules` trên máy.

## 9. Nhớ nhanh

- Code theo nghiệp vụ trong `features`.
- Code dùng chung thật sự trong `shared`.
- Provider và routing cấp app trong `app`.
- Kiểm tra contract backend trước khi viết service/type.
- Không copy Landing, Studio hoặc AI vào frontend.
- Không commit dependency, build output hoặc secret.
