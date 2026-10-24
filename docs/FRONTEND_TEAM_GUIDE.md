# Frontend Team Guide

Tài liệu này giúp team biết nên đặt code ở đâu và các phần kết nối với nhau như thế nào. Đây là quy ước chung để tránh trùng code, không bắt buộc một feature nhỏ phải tạo đủ mọi folder.

## 1. Nhìn nhanh cấu trúc

```text
src/
├── app/                         # Provider, routing và cấu hình cấp app
├── features/                    # Mỗi nghiệp vụ có một source chính
│   ├── landing/
│   ├── auth/
│   ├── ai-studio/
│   ├── studio/
│   ├── marketplace/
│   ├── pod/
│   ├── account/
│   ├── orders/
│   ├── models/
│   ├── buyer/
│   ├── seller/
│   ├── wallet/
│   ├── design/
│   ├── ops/
│   └── portal/
├── shared/
│   ├── api/                     # Axios client, lỗi và type API chung
│   ├── config/                  # Biến môi trường public
│   ├── session/                 # Hook phiên đăng nhập dùng chung
│   └── ui/                      # Component dùng ở nhiều feature
└── test/                        # Setup test chung

entries/                         # HTML entry, không chứa business logic
public/                          # File tĩnh
```

Landing, AI Studio và 3D Studio đã nằm trong `src/features`. Không tạo lại project riêng như `landingPage`, `Studio`, `AI/client` hoặc một thư mục `frontend` lồng bên trong repo.

## 2. Một feature thường có gì?

Ví dụ với POD:

```text
src/features/pod/
├── pages/                       # Màn hình gắn với route
├── components/                  # UI chỉ dùng trong POD
├── hooks/                       # React Query hook hoặc logic React
├── services/                    # Hàm gọi API POD
├── schemas/                     # Zod schema cho form/input
├── types/                       # Request, response và model TypeScript
└── main.tsx                     # Entry nếu POD là một module riêng
```

Chỉ tạo folder khi thật sự có file thuộc loại đó. Component chỉ dùng trong một page có thể đặt gần page; khi nhiều nơi dùng mới tách ra.

## 3. Luồng code và gọi API

```text
Page / Component
    ↓
Hook (TanStack Query hoặc mutation)
    ↓
Feature service
    ↓
shared/api (Axios)
    ↓
Backend REST API
```

Ví dụ:

```ts
// src/features/pod/services/pod.service.ts
import { http } from '../../../shared/api'
import type { PrintRequest } from '../types/pod.types'

export const podService = {
  getRequest: (id: string, signal?: AbortSignal) =>
    http.get<PrintRequest>(`/api/pod/requests/${id}`, { signal }),
}
```

Ưu tiên gọi API qua service của feature. Không tạo Axios instance mới cho từng module; client chung đã xử lý base URL, cookie, JWT và chuẩn hóa lỗi.

## 4. Chọn nơi lưu state

| Loại state | Nên dùng |
|---|---|
| Dữ liệu backend, loading, cache | TanStack Query |
| Form và validate | React Hook Form + Zod |
| UI state dùng qua nhiều component | Zustand |
| State nhỏ trong một component | `useState` |

Không cần đưa dữ liệu backend vào Zustand nếu TanStack Query đã quản lý dữ liệu đó.

## 5. Khi nào dùng `shared`?

- Một feature dùng: để trong `src/features/<feature>`.
- Nhiều feature dùng: cân nhắc chuyển sang `src/shared`.
- Auth/session nằm ở `features/auth`; các feature khác import lại, không tự lưu token riêng.
- Business logic vẫn ở feature, không đưa vào component UI chung.

## 6. Route và entry

| URL | Source chính |
|---|---|
| `/` | `src/features/landing` |
| `/login/*` | `src/features/auth` |
| `/ai/*` | `src/features/ai-studio` |
| `/studio/*` | `src/features/studio` |
| `/marketplace/*` | `src/features/marketplace` |
| `/pod/*` | `src/features/pod` |
| `/portal/*` | `src/features/portal` và các feature nghiệp vụ |

`vite.config.ts` ánh xạ URL đến file trong `entries/`. Khi thêm một module độc lập mới, tạo một HTML entry nhỏ và thêm tên module vào cấu hình Vite; code thật vẫn đặt trong `src/features`.

## 7. Cách làm một task mới

1. Xác định task thuộc feature nào.
2. Đọc contract API backend và type response trước.
3. Thêm type/schema, sau đó viết service gọi API.
4. Viết hook nếu màn hình cần cache hoặc mutation.
5. Ghép page/component và route.
6. Chạy typecheck, test liên quan và build trước khi push.

## 8. Chạy dự án

Tất cả lệnh frontend chạy tại root `SWD392-3DWorld`:

```bash
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

`.gitignore` ở root áp dụng cho toàn repo. Commit `.env.example`, không commit `.env`, `node_modules`, `dist`, `target`, coverage hoặc dữ liệu runtime.
