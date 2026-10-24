# 3DWorld Frontend

`SWD392-3DWorld` là một frontend thống nhất dùng React, TypeScript và Vite. Landing Page, đăng nhập, AI Studio, 3D Studio, Marketplace, POD và Portal dùng chung một `package.json`, một thư mục `src` và chạy trên cùng một port.

## Cấu trúc chính

```text
SWD392-3DWorld/
├── src/
│   ├── app/                    # Provider và cấu hình cấp ứng dụng
│   ├── features/               # Code theo từng nghiệp vụ
│   │   ├── landing/
│   │   ├── auth/
│   │   ├── ai-studio/
│   │   ├── studio/
│   │   ├── marketplace/
│   │   ├── pod/
│   │   └── ...
│   ├── shared/                 # API client, UI và tiện ích dùng chung
│   └── test/
├── entries/                    # HTML entry cho từng module
├── public/
├── backend/                    # Spring Boot hiện có, giữ nguyên
├── AI/server/                  # Node AI service hiện có, giữ nguyên
├── docs/
├── package.json
└── vite.config.ts
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

Không commit `.env`, `node_modules`, `dist`, `target` hoặc dữ liệu runtime. Xem cách tổ chức và luồng code ở [Frontend Team Guide](docs/FRONTEND_TEAM_GUIDE.md).
