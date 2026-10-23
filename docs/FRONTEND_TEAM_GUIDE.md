# Frontend Guide

Tài liệu này giúp thành viên biết **code ở đâu** và **dữ liệu chạy như thế nào** trong Frontend 3DWorld.

## Đọc nhanh: code đi từ folder nào đến folder nào?

Khi lấy hoặc cập nhật dữ liệu Backend:

```text
pages/ hoặc màn hình module
  ↓
hooks/ (TanStack Query, nếu cần tách hook)
  ↓
services/ (hàm gọi API)
  ↓
services/http/client.ts (Axios dùng chung)
  ↓
Spring Boot Backend → PostgreSQL
```

Dữ liệu trả về được TanStack Query quản lý, sau đó Page truyền xuống `components/` để hiển thị.

`stores/` là một luồng riêng dành cho **global client state**:

```text
pages/ hoặc components/
  ↕
stores/ (Zustand)
```

- Dữ liệu Backend dùng TanStack Query.
- State giao diện hoặc state dùng chung phía browser mới dùng Zustand.
- State chỉ dùng trong một component có thể dùng `useState`.
- Form dùng React Hook Form; validation dùng Zod.

## 1. Tech stack

**Frontend:** React, Vite, TypeScript/TSX, React Router, Axios, TanStack Query, Zustand, React Hook Form, Zod, Tailwind CSS, Three.js và React Three Fiber.

**Backend:** Spring Boot, REST JSON và PostgreSQL.

**Kiểm tra code:** Biome, Vitest và Testing Library.

## 2. Quy tắc file

| Extension | Dùng cho | Ví dụ |
|---|---|---|
| `.tsx` | React component, Page, Provider, Router có JSX | `ProductCard.tsx`, `MarketplacePage.tsx` |
| `.ts` | Service, store, schema, type và logic không có JSX | `product.service.ts`, `cart.store.ts` |
| `.css` | Style riêng của module hoặc feature | `marketplace.css` |

Code frontend mới dùng TypeScript. Không tạo thêm file `.js` nếu công cụ không bắt buộc.

## 3. Các folder chính

```text
frontend/src/
├─ app/                         # Provider dùng chung cho app mới
├─ config/                      # Environment/config public
├─ core/                        # Route helper và utility hạ tầng
├─ services/                    # Axios và service dùng chung
├─ stores/                      # Zustand global client state
├─ shared/                      # Session/navigation/UI dùng ở nhiều module
├─ features/                    # Nghiệp vụ mới chia theo module khi cần
│
├─ landing/                     # Landing Page hiện có
├─ ai/                          # AI Studio + Meshy hiện có
├─ studio/                      # 3D Studio hiện có
├─ marketplace/                # Entry Marketplace
├─ pod/                        # Entry Print On Demand
├─ login/                      # Entry Login
└─ portal/                     # Shell cho nghiệp vụ còn thiếu
```

| Folder | Trách nhiệm |
|---|---|
| `app/` | QueryClient và các Provider dùng chung cho app mới |
| `config/` | Đọc biến môi trường public của Vite |
| `core/` | Helper kỹ thuật như route và query string |
| `services/` | Axios client, Auth service và service xuyên module |
| `stores/` | Zustand state dùng ở nhiều màn hình |
| `shared/` | Component/session/navigation thật sự dùng chung |
| `features/` | Component, hook, service, schema và type của từng nghiệp vụ mới |
| `landing/` | Landing Page của team đã làm |
| `ai/` | AI Generator, history, model library và Viewer3D đã có |
| `studio/` | 3D Editor, dashboard và project flow đã có |
| `marketplace/` | Điểm vào của Marketplace |
| `pod/` | Điểm vào của Print On Demand |
| `portal/` | Route và layout cho Account, Seller, Orders, Wallet, Operations... |

Không bắt buộc feature nào cũng phải có tất cả folder. Chỉ tạo khi thật sự cần.

## 4. Luồng gọi API

```text
Page
  ↓
TanStack Query / Mutation
  ↓
Feature Service
  ↓
Axios Instance
  ↓
Spring Boot REST API
  ↓
PostgreSQL
```

Page không gọi Axios trực tiếp. Page dùng Query/Mutation; `queryFn` hoặc `mutationFn` gọi Service.

Ví dụ minh họa:

```text
MarketplacePage
  ↓
useQuery(...)
  ↓
product.service.ts
  ↓
services/http/client.ts
  ↓
GET /api/products
  ↓
Spring Boot Backend
```

Luôn kiểm tra route và response thật của Backend trước khi nối API.

## 5. Axios dùng để làm gì?

File chính:

```text
src/services/http/client.ts
```

Axios instance dùng chung chịu trách nhiệm:

- API base URL;
- timeout;
- gửi cookie phiên bằng `withCredentials`;
- XSRF header nếu Backend cung cấp cookie;
- response interceptor;
- chuẩn hóa lỗi API và network;
- `Idempotency-Key` cho mutation cần chống gửi lặp.

Không tạo `axios.create()` riêng trong từng feature.

Ví dụ service:

```ts
import { http } from '../../../services/http'
import type { ProductListResponse } from '../types/product.types'

export const productService = {
  getProducts: (signal?: AbortSignal) =>
    http.get<ProductListResponse>('/api/products', { signal }),
}
```

Service chỉ gọi API và trả dữ liệu. Toast, modal và navigation để Page hoặc hook xử lý.

## 6. TanStack Query và Zustand

| Công cụ | Dùng cho | Ví dụ |
|---|---|---|
| TanStack Query | Dữ liệu đến từ Backend | Products, Cart, Orders, Models, Print Requests |
| Zustand | State phía browser/client | Menu mở/đóng, filter tạm, selected item, UI state |
| `useState` | State nhỏ trong một component | Modal local, tab local |

Không copy toàn bộ dữ liệu Backend sang Zustand nếu không có lý do rõ ràng.

Ví dụ Query hook:

```ts
import { useQuery } from '@tanstack/react-query'
import { productService } from '../services/product.service'

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: ({ signal }) => productService.getProducts(signal),
  })
}
```

Ví dụ Zustand store:

```ts
import { create } from 'zustand'

type MarketplaceUiState = {
  filterOpen: boolean
  setFilterOpen: (open: boolean) => void
}

export const useMarketplaceUiStore = create<MarketplaceUiState>((set) => ({
  filterOpen: false,
  setFilterOpen: (filterOpen) => set({ filterOpen }),
}))
```

Khi dùng store trong component, nên lấy đúng field cần dùng:

```ts
const filterOpen = useMarketplaceUiStore((state) => state.filterOpen)
```

## 7. Form và validation

- **React Hook Form:** quản lý trạng thái form và submit.
- **Zod:** kiểm tra dữ liệu form.
- **`@hookform/resolvers`:** nối Zod với React Hook Form.

```text
Page / Form Component
  ↓
React Hook Form
  ↓
Zod validation
  ↓
Mutation
  ↓
Service
  ↓
Backend
```

Ví dụ: `RegisterPage` → `register.schema.ts` → `auth.service.ts` → Spring Boot.

Không bắt buộc form nhỏ nào cũng phải tạo schema riêng. Tách schema khi form có nhiều field, cần tái sử dụng hoặc có validation nghiệp vụ rõ ràng.

## 8. Authentication

Backend hiện dùng phiên đăng nhập qua cookie. Axios đã được cấu hình:

```ts
withCredentials: true
```

Các API dùng chung nằm tại:

```text
src/services/auth/auth.service.ts
```

Không lưu password, secret, Meshy API key hoặc dữ liệu nhạy cảm trong Zustand/localStorage.

Frontend có thể ẩn action theo quyền để giao diện dễ dùng, nhưng Backend vẫn phải kiểm tra role, owner và capability.

## 9. Implement một feature mới

Ví dụ làm **Product List**:

1. Kiểm tra Backend Product API.
2. Tạo type response.
3. Tạo `product.service.ts`.
4. Dùng TanStack Query trong hook hoặc Page.
5. Truyền data xuống component để hiển thị.

```text
MarketplacePage
  ↓
useProducts
  ↓
product.service.ts
  ↓
services/http/client.ts
  ↓
Spring Boot Backend
```

Structure tham khảo:

```text
features/marketplace/
├─ components/
│  ├─ ProductCard.tsx
│  └─ ProductList.tsx
├─ hooks/
│  └─ useProducts.ts
├─ services/
│  └─ product.service.ts
├─ schemas/
│  └─ product-filter.schema.ts
├─ stores/
│  └─ marketplace-ui.store.ts
├─ types/
│  └─ product.types.ts
└─ pages/
   └─ MarketplacePage.tsx
```

Không cần tạo toàn bộ folder trên nếu feature không dùng tới.

## 10. Code dùng chung và code riêng của module

- Chỉ một module sử dụng: đặt trong `features/<module>/`.
- Nhiều module cùng sử dụng: cân nhắc đặt trong `shared/`.
- Axios và lỗi HTTP dùng chung: `services/http/`.
- Auth dùng xuyên module: `services/auth/`.
- Zustand dùng toàn app: `stores/`.
- Zustand chỉ dùng trong một feature: `features/<module>/stores/`.
- Không đặt business logic trong component UI dùng chung.

Không vội chuyển mọi thứ vào `shared`. Component nên ở trong feature trước; khi có module thứ hai thật sự dùng chung thì mới tách.

## 11. Các module hiện có

Ba phần sau tiếp tục được dùng và phát triển, không viết lại từ đầu:

| Module | Folder | Route |
|---|---|---|
| Landing Page | `src/landing/` | `/` |
| AI Studio + Meshy | `src/ai/` | `/ai/*` |
| 3D Studio | `src/studio/` | `/studio/*` |

Các route chính:

```text
/                         Landing Page
/login/                   Đăng nhập/đăng ký
/ai/studio                AI Generator
/ai/models                AI Models/History/Viewer
/studio/                  3D Studio
/marketplace/             Marketplace
/pod/                     Print On Demand
/portal/                  Các màn hình nghiệp vụ còn thiếu
```

Khi sửa Landing, AI hoặc Studio, chỉ sửa phần liên quan chức năng đang làm. Không cần refactor toàn bộ module để ép theo structure mới.

## 12. Điều hướng giữa các module

Mỗi module là một Vite entry riêng.

- Trong cùng một entry: dùng React Router `Link` hoặc `navigate`.
- Sang entry khác: dùng `<a href="...">`.

Ví dụ từ Landing sang AI:

```tsx
<a href="/ai/studio">Try AI Studio</a>
```

Ví dụ AI/Studio chuyển model sang POD:

```text
/pod/new?versionId=<model-version-id>
```

Module nhận ID rồi tải lại dữ liệu từ Backend. Không truyền model lớn qua React state giữa hai entry.

## 13. Environment

File mẫu:

```text
frontend/.env.example
```

```env
VITE_API_BASE_URL=
```

Để trống khi dùng cùng origin và Vite proxy `/api` sang Spring Boot.

Nếu cần URL riêng trong môi trường phát triển:

```env
VITE_API_BASE_URL=http://localhost:8080
```

Không commit `.env`, secret, database password hoặc Meshy API key.

## 14. Quick start

```bash
cd frontend
npm install
npm run dev
```

Mở:

```text
http://localhost:5173/
```

Route `/` luôn là Landing Page hiện có.

Kiểm tra trước khi bàn giao:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## 15. Nhớ nhanh

### Nên làm

- Page dùng Query/Mutation để gọi Service.
- Service dùng Axios client chung.
- API data dùng TanStack Query.
- Client global state dùng Zustand.
- Form phức tạp dùng React Hook Form + Zod.
- Component dùng `.tsx`; logic dùng `.ts`.
- Tạo folder khi thật sự cần.

### Tránh

- Gọi Axios trực tiếp trong Page hoặc component trình bày.
- Tạo Axios instance riêng cho từng feature.
- Copy server data vào Zustand.
- Hardcode API URL.
- Đưa secret/provider key vào frontend.
- Tạo quá nhiều abstraction hoặc file rỗng khi feature còn đơn giản.
- Viết lại Landing, AI hoặc Studio chỉ để giống structure mới.
