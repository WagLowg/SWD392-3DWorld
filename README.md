# 3DWorld Frontend

`SWD392-3DWorld` là một frontend thống nhất dùng React, TypeScript và Vite. Landing Page, đăng nhập, AI Studio, 3D Studio, Marketplace, POD và Portal dùng chung một `package.json`, một thư mục `src` và chạy trên cùng một port.

## Cấu trúc chính

```text
SWD392-3DWorld/
├── entries/                    # HTML khởi động cho từng module (ai, studio, marketplace, pod, login, portal)
├── index.html                  # Trang Landing
├── public/                     # Tệp tĩnh (favicon…)
├── docs/                       # Tài liệu kiến trúc, hướng dẫn nhóm, danh sách API còn thiếu
├── src/
│   ├── app/providers/          # Provider dùng chung (React Query, router…)
│   ├── features/               # Mỗi thư mục là một nghiệp vụ, tự chứa pages/components/hooks/services/lib
│   │   ├── landing/            # Trang giới thiệu 3D
│   │   ├── auth/               # Đăng nhập, đăng ký, quên mật khẩu
│   │   ├── ai-studio/          # Ảnh → mô hình 3D (/api/ai-studio)
│   │   ├── studio/             # Trình dựng 3D (/api/studio)
│   │   ├── marketplace/        # Danh mục, giỏ hàng, thanh toán
│   │   ├── pod/                # Đặt in theo yêu cầu
│   │   ├── portal/             # Khung Portal: người mua, người bán, quản trị
│   │   └── account, buyer, models, ops, orders, seller
│   ├── shared/                 # Không phụ thuộc feature nào
│   │   ├── api/                # HTTP client, kiểu envelope, lỗi
│   │   ├── config/             # Biến môi trường, danh sách module
│   │   ├── lib/                # Hàm tiện ích (format, query string)
│   │   ├── mock/               # Dữ liệu mẫu cho màn chưa có API
│   │   ├── session/            # Token, người dùng hiện tại
│   │   ├── stores/             # State UI dùng chung
│   │   └── ui/                 # Component và theme dùng chung
│   ├── drafts/                 # Màn đã dựng nhưng chưa có route vì Backend chưa có API (ví, thiết kế, khiếu nại…)
│   └── test/                   # Cấu hình test
├── package.json
├── vite.config.ts
└── vitest.config.ts
```

`entries/` chỉ chứa HTML khởi động. Toàn bộ code React nằm trong `src/`; không tạo thêm project Vite hay `package.json` bên trong từng feature.

## Chạy frontend

Từ root repository:

```bash
npm install
npm run dev
```

Mở `http://localhost:5173`. Các module cùng dùng port này:

- `/` — Landing Page
- `/login/` — đăng nhập; đăng ký ở `/login/register`
- `/ai/` — AI Studio
- `/studio/` — 3D Studio
- `/marketplace/` — Marketplace
- `/pod/` — Print on Demand
- `/portal/` — Portal nghiệp vụ

Vite chuyển tiếp request `/api` đến Spring Boot ở port `8080` theo mặc định. Có thể đổi port backend bằng biến môi trường `API_PORT`.

## Kiểm tra trước khi push

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Không commit `.env`, `node_modules`, `dist`, `target` hoặc dữ liệu runtime. Xem cách tổ chức và luồng code ở [Frontend Team Guide](docs/FRONTEND_TEAM_GUIDE.md), API Backend còn thiếu ở [MISSING_APIS](docs/MISSING_APIS.md).

`src/drafts/` vẫn được typecheck và lint nhưng không được import từ module nào. Khi Backend có API, chuyển màn tương ứng về `src/features/<module>/pages` và khai báo route.
