export type DeliveryWave = 'W0' | 'W1' | 'W2' | 'W3' | 'W4'
export type ScreenStatus = 'existing' | 'skeleton' | 'blocked'

export type ScreenDefinition = {
  id: `SCR-${string}`
  title: string
  route: string
  status: ScreenStatus
  requirements: `FR-${string}`[]
  description: string
}

export type FeatureDefinition = {
  id: string
  title: string
  wave: DeliveryWave | `${DeliveryWave}–${DeliveryWave}`
  screens: ScreenDefinition[]
}

const screen = (
  id: ScreenDefinition['id'],
  title: string,
  route: string,
  status: ScreenStatus,
  requirements: ScreenDefinition['requirements'],
  description: string,
): ScreenDefinition => ({ id, title, route, status, requirements, description })

/**
 * Route map bám FRD 3DWorld SWD Version 1.2 (23/10/2026).
 * FRD không định nghĩa SCR-20; vì vậy skeleton cũng không tự tạo màn hình này.
 */
export const features: FeatureDefinition[] = [
  {
    id: 'account',
    title: 'Tài khoản & quyền truy cập',
    wave: 'W0',
    screens: [
      screen(
        'SCR-01',
        'Đăng ký & đăng nhập',
        '/login/',
        'existing',
        ['FR-ACC-01', 'FR-ACC-02'],
        'Đăng ký, xác minh email, đăng nhập, đăng xuất và khôi phục truy cập.',
      ),
      screen(
        'SCR-02',
        'Hồ sơ & địa chỉ',
        '/portal/profile',
        'existing',
        ['FR-ACC-03'],
        'Quản lý hồ sơ, địa chỉ giao hàng và tài khoản ngân hàng.',
      ),
      screen(
        'SCR-03',
        'Seller verification',
        '/portal/seller-verification',
        'skeleton',
        ['FR-ACC-04', 'FR-ACC-05'],
        'Theo dõi và bổ sung điều kiện xác minh để kích hoạt quyền Seller.',
      ),
    ],
  },
  {
    id: 'storefront',
    title: 'Storefront & subscription',
    wave: 'W1',
    screens: [
      screen(
        'SCR-04',
        'Đăng ký & gia hạn gian hàng',
        '/portal/storefront/subscription',
        'skeleton',
        ['FR-STR-01', 'FR-STR-02', 'FR-STR-03'],
        'Kích hoạt, gia hạn và theo dõi trạng thái subscription.',
      ),
      screen(
        'SCR-05',
        'Storefront công khai',
        '/portal/storefront/demo-store',
        'skeleton',
        ['FR-CAT-04'],
        'Hồ sơ gian hàng, rating và danh sách sản phẩm đang được phép giao dịch.',
      ),
    ],
  },
  {
    id: 'catalog',
    title: 'Landing & Marketplace',
    wave: 'W1',
    screens: [
      screen('SCR-06', 'Landing Page', '/', 'existing', ['FR-CAT-01'], 'Landing page hiện có được giữ nguyên.'),
      screen(
        'SCR-07',
        'Marketplace',
        '/marketplace/',
        'existing',
        ['FR-CAT-02'],
        'Search, filter, sort và phân trang sản phẩm vật lý.',
      ),
      screen(
        'SCR-08',
        'Product Detail',
        '/marketplace/',
        'existing',
        ['FR-CAT-03'],
        'Chi tiết sản phẩm, media, variant, stock, shipping và review.',
      ),
    ],
  },
  {
    id: 'seller-products',
    title: 'Seller Products',
    wave: 'W1',
    screens: [
      screen(
        'SCR-09',
        'Danh sách sản phẩm Seller',
        '/portal/seller/products',
        'skeleton',
        ['FR-SEL-01', 'FR-SEL-02', 'FR-SEL-03', 'FR-SEL-04'],
        'Quản lý draft, trạng thái moderation, giá và tồn kho.',
      ),
      screen(
        'SCR-10',
        'Product Form',
        '/portal/seller/products/new',
        'skeleton',
        ['FR-SEL-01', 'FR-SEL-02'],
        'Form sản phẩm vật lý, variants, media và thông tin giao hàng.',
      ),
    ],
  },
  {
    id: 'moderation',
    title: 'Moderation & Report',
    wave: 'W1–W3',
    screens: [
      screen(
        'SCR-11',
        'Moderation Queue',
        '/portal/ops/moderation',
        'skeleton',
        ['FR-MOD-01', 'FR-MOD-02'],
        'Hàng đợi review, bằng chứng và quyết định kiểm duyệt.',
      ),
      screen(
        'SCR-12',
        'Report & Investigation',
        '/portal/reports',
        'skeleton',
        ['FR-MOD-03'],
        'Gửi report và workspace điều tra cho Staff.',
      ),
    ],
  },
  {
    id: 'cart-checkout',
    title: 'Cart & Checkout',
    wave: 'W2',
    screens: [
      screen(
        'SCR-13',
        'Giỏ hàng',
        '/marketplace/cart',
        'existing',
        ['FR-CRT-01', 'FR-CRT-02'],
        'Giỏ hàng revalidate giá, stock và trạng thái Storefront.',
      ),
      screen(
        'SCR-14',
        'Checkout & Payment Result',
        '/marketplace/checkout',
        'existing',
        ['FR-CHK-01', 'FR-CHK-02', 'FR-CHK-03', 'FR-PAY-01', 'FR-PAY-02', 'FR-PAY-03', 'FR-PAY-04'],
        'Tách đơn theo Seller, snapshot tổng tiền và theo dõi transaction.',
      ),
    ],
  },
  {
    id: 'orders',
    title: 'Đơn hàng & vận chuyển',
    wave: 'W2',
    screens: [
      screen(
        'SCR-15',
        'Buyer Orders',
        '/portal/orders',
        'existing',
        ['FR-ORD-01', 'FR-ORD-02', 'FR-ORD-04'],
        'Tra cứu, hủy hợp lệ và xác nhận đã nhận hàng.',
      ),
      screen(
        'SCR-16',
        'Seller Orders',
        '/portal/seller/orders',
        'existing',
        ['FR-ORD-01', 'FR-ORD-02'],
        'Xử lý các đơn vật lý thuộc Storefront.',
      ),
      screen(
        'SCR-17',
        'Shipping & COD',
        '/portal/ops/shipping',
        'skeleton',
        ['FR-ORD-03', 'FR-ORD-05'],
        'Theo dõi shipment, COD collection và settlement.',
      ),
    ],
  },
  {
    id: 'finance',
    title: 'Wallet & Seller Revenue',
    wave: 'W2–W3',
    screens: [
      screen(
        'SCR-18',
        'Wallet',
        '/portal/wallet',
        'skeleton',
        ['FR-WAL-01', 'FR-PAY-03'],
        'Số dư và ledger truy vết được theo transaction.',
      ),
      screen(
        'SCR-19',
        'Seller Revenue',
        '/portal/seller/revenue',
        'skeleton',
        ['FR-WAL-02', 'FR-WAL-03'],
        'Pending earning, commission snapshot và điều kiện release.',
      ),
    ],
  },
  {
    id: 'models',
    title: 'Model Library & Viewer',
    wave: 'W1–W2',
    screens: [
      screen(
        'SCR-23',
        'My Models',
        '/ai/models',
        'existing',
        ['FR-LIB-01', 'FR-LIB-02'],
        'Dùng trực tiếp thư viện model hiện có trong AI Studio.',
      ),
      screen(
        'SCR-24',
        'Model Detail',
        '/portal/models',
        'existing',
        ['FR-LIB-03'],
        'Metadata, quyền truy cập, file và version history bất biến.',
      ),
      screen(
        'SCR-25',
        '3D Viewer dùng chung',
        '/ai/models',
        'existing',
        ['FR-VIW-01', 'FR-VIW-02'],
        'Dùng trực tiếp Viewer3D hiện có trong AI Studio và viewport của 3D Studio.',
      ),
      screen(
        'SCR-26',
        'Web 3D Editor',
        '/studio/',
        'existing',
        ['FR-EDT-01', 'FR-EDT-02', 'FR-EDT-03', 'FR-EDT-04', 'FR-EDT-05', 'FR-EDT-06'],
        '3D Studio hiện có được giữ nguyên.',
      ),
    ],
  },
  {
    id: 'ai',
    title: 'AI Generation',
    wave: 'W2',
    screens: [
      screen(
        'SCR-28',
        'AI Generator',
        '/ai/studio',
        'existing',
        ['FR-AIG-01', 'FR-AIG-02', 'FR-AIG-03'],
        'Dùng trực tiếp luồng gọi Meshy hiện có trong AI Studio.',
      ),
      screen(
        'SCR-29',
        'AI History & Result',
        '/ai/models',
        'existing',
        ['FR-AIG-04', 'FR-AIG-05', 'FR-AIG-06'],
        'Dùng trực tiếp trang models/history và result hiện có của AI Studio.',
      ),
    ],
  },
  {
    id: 'pod',
    title: 'Print On Demand',
    wave: 'W3',
    screens: [
      screen(
        'SCR-27',
        'POD Request',
        '/pod/new',
        'skeleton',
        ['FR-POD-01'],
        'Chọn model/version, units và cấu hình in.',
      ),
      screen(
        'SCR-30',
        'POD Quote',
        '/pod/quotes/demo-quote',
        'skeleton',
        ['FR-POD-02', 'FR-POD-03', 'FR-POD-04'],
        'Review file, quote có hạn, deposit và khóa specification.',
      ),
      screen(
        'SCR-31',
        'POD Tracking',
        '/pod/requests/demo-request',
        'skeleton',
        ['FR-POD-05', 'FR-POD-06', 'FR-POD-07'],
        'Theo dõi sản xuất, thanh toán còn lại, giao hàng và defect.',
      ),
      screen(
        'SCR-32',
        'Staff Production',
        '/portal/ops/production',
        'skeleton',
        ['FR-POD-02', 'FR-POD-05', 'FR-POD-06'],
        'Workspace review, production và post-processing.',
      ),
    ],
  },
  {
    id: 'cases',
    title: 'Refund & Review',
    wave: 'W3',
    screens: [
      screen(
        'SCR-33',
        'Refund Dispute',
        '/portal/refunds',
        'existing',
        ['FR-CAS-01', 'FR-CAS-02'],
        'Mở case, cung cấp bằng chứng và theo dõi quyết định.',
      ),
      screen(
        'SCR-34',
        'Review Form',
        '/portal/reviews/new',
        'skeleton',
        ['FR-CAS-03'],
        'Review từ giao dịch vật lý đủ điều kiện.',
      ),
    ],
  },
  {
    id: 'operations',
    title: 'Operations',
    wave: 'W0–W3',
    screens: [
      screen(
        'SCR-21',
        'Admin Config',
        '/portal/ops/config',
        'skeleton',
        ['FR-OPS-01'],
        'Cấu hình policy, provider và snapshot có hiệu lực.',
      ),
      screen(
        'SCR-22',
        'Operations Dashboard',
        '/portal/ops',
        'skeleton',
        ['FR-OPS-03', 'FR-OPS-04', 'FR-OPS-05'],
        'Dashboard theo quyền, audit, finance và quản lý account.',
      ),
      screen(
        'SCR-35',
        'Notifications',
        '/portal/notifications',
        'skeleton',
        ['FR-OPS-02'],
        'Notification center với business deep link an toàn.',
      ),
    ],
  },
  {
    id: 'design-service',
    title: 'Dịch vụ thiết kế nội bộ',
    wave: 'W4',
    screens: [
      screen(
        'SCR-36',
        'Design Request',
        '/portal/design/new',
        'blocked',
        ['FR-DES-01'],
        'Chỉ dựng UI sau khi chốt contract; persistence đang bị chặn bởi schema gap.',
      ),
      screen(
        'SCR-37',
        'Designer Workspace',
        '/portal/design/workspace',
        'blocked',
        ['FR-DES-01', 'FR-DES-03'],
        'Không dùng print_requests để giả lập Design Service.',
      ),
      screen(
        'SCR-38',
        'Design Tracking',
        '/portal/design/requests/demo-request',
        'blocked',
        ['FR-DES-02', 'FR-DES-03', 'FR-DES-04'],
        'Chờ schema Design và transaction source được phê duyệt.',
      ),
    ],
  },
]

export const screens = features.flatMap((feature) =>
  feature.screens.map((item) => ({ ...item, featureId: feature.id, featureTitle: feature.title, wave: feature.wave })),
)

export const internalScreens = screens.filter((item) => item.route.startsWith('/portal/'))

export function relativePortalRoute(route: string) {
  return route.replace(/^\/portal\/?/, '') || '/'
}
