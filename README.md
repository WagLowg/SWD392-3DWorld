# 3DWorld

Monorepo cho nền tảng 3DWorld, gồm Landing Page, AI Studio, 3D Studio, Marketplace, Print On Demand và backend Spring Boot.

## Cấu trúc hiện tại

```text
SWD392-3DWorld/
├─ frontend/                 # Web app hợp nhất (Vite + React + TypeScript)
│  ├─ src/landing/           # Landing Page hiện có
│  ├─ src/ai/                # AI Generator + luồng Meshy hiện có
│  ├─ src/studio/            # 3D Studio hiện có
│  ├─ src/marketplace/       # Entry Marketplace
│  ├─ src/pod/               # Entry Print On Demand
│  ├─ src/portal/            # Skeleton nghiệp vụ theo FRD v1.2
│  ├─ src/core/              # API/routing foundation dùng chung cho code mới
│  └─ portal/index.html      # Entry độc lập tại /portal/
├─ backend/                  # Spring Boot REST API
├─ Landing page/             # Nguồn Landing ban đầu, giữ để đối chiếu
├─ AI/                       # Nguồn AI ban đầu, giữ để đối chiếu
└─ Studio/                   # Nguồn Studio ban đầu, giữ để đối chiếu
```

## Chạy frontend

```bash
cd frontend
npm ci
npm run dev
```

Kiểm tra code trước khi tạo PR:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

- Landing: `http://localhost:5173/`
- AI Studio: `http://localhost:5173/ai/`
- 3D Studio: `http://localhost:5173/studio/`
- Marketplace: `http://localhost:5173/marketplace/`
- Print On Demand: `http://localhost:5173/pod/`
- FRD Product Portal: `http://localhost:5173/portal/`

## Nguyên tắc phát triển skeleton

- `src/portal/requirements.ts` là route map và traceability map từ màn hình sang mã FR.
- Landing, AI Studio/Meshy và 3D Studio hiện tại là source chính thức, được dùng trực tiếp; Portal không copy hoặc dựng lại ba module này.
- Feature mới gọi Axios qua `src/services/http`; không tự quyết định amount, owner, role, approval hay payment status ở frontend.
- React Query quản lý server state; Zustand chỉ quản lý client/UI state; form dùng React Hook Form + Zod.
- Mỗi màn hình phải xử lý loading, empty, error/retry, permission denied, expired/stale và success.
- Landing, AI Generator và 3D Studio hiện tại là module độc lập; không import CSS chéo sang Portal.
- Không mở route/API mua bán, chuyển nhượng hoặc cho thuê file số trong Version 1.
- Design Service (`SCR-36` đến `SCR-38`) đang blocked cho tới khi migration và transaction source riêng được duyệt. Không dùng bảng POD để thay thế.

## Thứ tự triển khai theo FRD

1. **W0** — Account, capability, policy và audit nền.
2. **W1** — Storefront, catalog vật lý, Seller Products, moderation, Model Library và Viewer.
3. **W2** — Cart, checkout, physical orders, payment/wallet, AI và Editor save/reopen.
4. **W3** — Fulfillment tài chính, POD, refund/review và operations.
5. **W4** — Design Service sau khi schema gap được phê duyệt.

Tài liệu nguồn: `3DWorld_SWD_FRD_V1_ERD_Aligned.docx`, Version 1.2 ngày 23/10/2026.

Xem thêm ranh giới tích hợp tại [`frontend/ARCHITECTURE.md`](frontend/ARCHITECTURE.md).

Quy trình và quy ước code chung cho team: [`docs/FRONTEND_TEAM_GUIDE.md`](docs/FRONTEND_TEAM_GUIDE.md).
