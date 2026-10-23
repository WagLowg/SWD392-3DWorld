# 3DWorld

Repository gồm các ứng dụng độc lập của nền tảng 3DWorld. Mỗi chức năng chỉ có một source chính; không copy Landing, AI hoặc Studio vào `frontend`.

## Cấu trúc thống nhất

```text
SWD392-3DWorld/
├── backend/                 # Spring Boot backend hiện có của AI/Studio
│   ├── src/
│   └── pom.xml
├── frontend/                # Frontend nghiệp vụ mới: Auth, Marketplace, POD, Portal
│   ├── src/
│   │   ├── app/             # Khởi động app, provider và route dùng chung
│   │   ├── features/        # Code chia theo nghiệp vụ
│   │   │   ├── auth/
│   │   │   ├── marketplace/
│   │   │   ├── pod/
│   │   │   └── portal/
│   │   ├── shared/          # API client, config, component, utility, store dùng chung
│   │   └── test/
│   ├── public/
│   └── package.json
├── landingPage/             # Landing Page của team — source chính, giữ độc lập
├── Studio/                  # 3D Studio của team — source chính, giữ độc lập
├── AI/                      # AI Studio + Meshy — source chính, kiểm tra/tích hợp sau
└── docs/
```

Các bản copy cũ `frontend/src/landing`, `frontend/src/studio` và `frontend/src/ai` đã được bỏ để tránh sửa hai nơi rồi lệch code.

## Chạy từng phần

Landing Page:

```bash
cd landingPage
npm install
npm run dev
```

Frontend nghiệp vụ:

```bash
cd frontend
npm install
npm run dev
```

3D Studio:

```bash
cd Studio
npm install
npm run dev
```

AI Studio:

```bash
cd AI
npm install
npm run dev
```

Trong `frontend`, các URL hiện có là `/login/`, `/register/`, `/marketplace/`, `/pod/` và `/portal/`. Truy cập `/` sẽ chuyển đến `/portal/`. Landing Page chạy từ package `landingPage`.

## Quy tắc ngắn

- Nghiệp vụ chỉ dùng trong một module: đặt trong `frontend/src/features/<module>`.
- Axios client, utility hoặc UI dùng từ hai module trở lên: đặt trong `frontend/src/shared`.
- Provider và route cấp ứng dụng: đặt trong `frontend/src/app`.
- Không tạo lại `src/landing`, `src/ai` hay `src/studio` bên trong `frontend`.
- Không commit `.env`, `node_modules`, `dist`, `target` hoặc dữ liệu runtime.

Xem quy trình code tại [docs/FRONTEND_TEAM_GUIDE.md](docs/FRONTEND_TEAM_GUIDE.md).
