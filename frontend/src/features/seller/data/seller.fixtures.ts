import { nowIso } from '../../../shared/mock/mockApi'
import type { AuditEntry } from '../../../shared/ui/kit'

/* ---------------------------------------------------------- application */

export type ApplicationStatus = 'DRAFT' | 'PENDING' | 'NEEDS_INFO' | 'VERIFIED' | 'REJECTED'

export type SellerApplication = {
  id: string
  status: ApplicationStatus
  storefrontName: string
  description: string
  address: string
  technologies: string[]
  emailVerified: boolean
  phoneVerified: boolean
  bank: { bankName: string; accountMasked: string; holder: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' } | null
  evidence: string[]
  reviewerNote?: string
  submittedAt?: string
  audit: AuditEntry[]
}

export const application: SellerApplication = {
  id: 'VER-8820',
  status: 'NEEDS_INFO',
  storefrontName: 'Xưởng Robot Cơ Khí 0xRoboStudio',
  description: 'Chuyên đồ chơi robot khớp động in resin SLA 8K, hoàn thiện sơn tay và đóng hộp collector.',
  address: '142/8 Nguyễn Thị Minh Khai, Quận 1, TP.HCM',
  technologies: ['Resin SLA', 'FDM PLA'],
  emailVerified: true,
  phoneVerified: true,
  bank: { bankName: 'Vietcombank', accountMasked: '****6789', holder: 'NGUYEN VAN AN', status: 'PENDING' },
  evidence: ['Ảnh xưởng in', 'Máy in Formlabs 3', 'Mẫu in thử'],
  reviewerNote: 'Cần bổ sung ảnh thực tế khu vực sấy UV và giấy phép kinh doanh hộ cá thể.',
  submittedAt: nowIso(30),
  audit: [
    { at: nowIso(30), actor: 'Bạn', action: 'Nộp hồ sơ xưởng', tone: 'violet' },
    { at: nowIso(12), actor: 'KDV_NguyenSWD', action: 'Yêu cầu bổ sung hồ sơ', note: 'Thiếu ảnh khu sấy UV', tone: 'orange' },
  ],
}

/* --------------------------------------------------------- subscription */

export type Plan = { id: string; name: string; price: number; period: string; perks: string[]; commission: number; highlight?: boolean }

export const plans: Plan[] = [
  { id: 'basic', name: 'Maker Basic', price: 150_000, period: 'tháng', commission: 8, perks: ['Tối đa 20 sản phẩm', 'Hỗ trợ email', 'Báo cáo doanh thu cơ bản'] },
  {
    id: 'pro',
    name: 'Maker Pro',
    price: 250_000,
    period: 'tháng',
    commission: 5,
    highlight: true,
    perks: ['Không giới hạn sản phẩm', 'Ưu tiên kiểm duyệt < 12h', 'Huy hiệu xưởng uy tín', 'Thống kê nâng cao'],
  },
  { id: 'studio', name: 'Studio Partner', price: 690_000, period: 'tháng', commission: 3, perks: ['Mọi quyền Pro', 'Quản lý đa nhân sự', 'Chuyên viên hỗ trợ riêng'] },
]

export type Subscription = {
  planId: string
  status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'SUSPENDED'
  startedAt: string
  expiresAt: string
  autoRenew: boolean
  history: { period: string; txnId: string; amount: number; status: 'SUCCEEDED' | 'FAILED' | 'PENDING'; paidAt: string }[]
}

export const subscription: Subscription = {
  planId: 'pro',
  status: 'EXPIRING',
  startedAt: nowIso(24 * 25),
  expiresAt: nowIso(-24 * 5),
  autoRenew: false,
  history: [
    { period: 'Tháng 10/2026', txnId: 'txn_sub_88219', amount: 250_000, status: 'SUCCEEDED', paidAt: nowIso(24 * 25) },
    { period: 'Tháng 09/2026', txnId: 'txn_sub_77140', amount: 250_000, status: 'SUCCEEDED', paidAt: nowIso(24 * 55) },
    { period: 'Tháng 08/2026', txnId: 'txn_sub_66021', amount: 250_000, status: 'FAILED', paidAt: nowIso(24 * 86) },
  ],
}

/* ----------------------------------------------------------- storefront */

export type Storefront = {
  id: number
  name: string
  slogan: string
  description: string
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED'
  city: string
  rating: number
  reviewCount: number
  followers: number
  productCount: number
  hidden: boolean
}

export const storefront: Storefront = {
  id: 2,
  name: '0xRoboStudio',
  slogan: 'Robot khớp động & Art Toy in resin thủ công',
  description:
    'Xưởng chế tác đồ chơi robot khớp động tại TP.HCM. Mỗi mẫu được in resin SLA 8K, sấy UV, chà nhám và sơn tay trước khi đóng hộp collector chống va đập.',
  status: 'ACTIVE',
  city: 'TP. Hồ Chí Minh',
  rating: 4.9,
  reviewCount: 142,
  followers: 2400,
  productCount: 6,
  hidden: false,
}

/* -------------------------------------------------------------- products */

export type ProductStatus = 'PUBLISHED' | 'PENDING_REVIEW' | 'DRAFT' | 'REJECTED' | 'HIDDEN'

export type SellerVariant = {
  id: number
  sku: string
  material: string
  color: string
  size: string
  price: number
  stock: number
  reserved: number
  active: boolean
}

export type SellerProduct = {
  id: number
  title: string
  category: string
  status: ProductStatus
  description: string
  shippingClass: string
  polygonCount: number
  manifold: boolean
  media: number
  variants: SellerVariant[]
  rejectReason?: string
  updatedAt: string
  sold: number
  audit: AuditEntry[]
}

const v = (id: number, sku: string, material: string, color: string, size: string, price: number, stock: number, reserved = 0, active = true): SellerVariant => ({
  id,
  sku,
  material,
  color,
  size,
  price,
  stock,
  reserved,
  active,
})

export const products: SellerProduct[] = [
  {
    id: 9941,
    title: 'Mecha Bear Alpha',
    category: 'FIGURINE',
    status: 'PUBLISHED',
    description: 'Gấu cơ khí khớp động, in resin SLA 8K, sơn tay 4 lớp.',
    shippingClass: 'Hộp collector chống sốc',
    polygonCount: 482_000,
    manifold: true,
    media: 5,
    variants: [v(1, 'MBA-RES-WHT', 'Resin SLA', 'Trắng', '120mm', 1_450_000, 12, 2), v(2, 'MBA-RES-BLK', 'Resin SLA', 'Đen', '120mm', 1_490_000, 4, 1)],
    updatedAt: nowIso(30),
    sold: 38,
    audit: [
      { at: nowIso(400), actor: 'Bạn', action: 'Tạo sản phẩm', tone: 'violet' },
      { at: nowIso(380), actor: 'KDV_NguyenSWD', action: 'Duyệt mở bán', tone: 'green' },
      { at: nowIso(30), actor: 'Bạn', action: 'Cập nhật giá MBA-RES-BLK', note: '1.450.000₫ → 1.490.000₫' },
    ],
  },
  {
    id: 9942,
    title: 'Bolt Mini Robot V1',
    category: 'FIGURINE',
    status: 'PUBLISHED',
    description: 'Robot mini khớp cổ bi kép, ăng-ten đàn hồi.',
    shippingClass: 'Hộp tiêu chuẩn',
    polygonCount: 210_000,
    manifold: true,
    media: 4,
    variants: [v(3, 'BOT-MINT-01', 'PLA Matte', 'Mint', '85mm', 390_000, 12), v(4, 'BOT-ORG-01', 'PLA Matte', 'Cam', '85mm', 390_000, 3, 1)],
    updatedAt: nowIso(80),
    sold: 126,
    audit: [{ at: nowIso(900), actor: 'Bạn', action: 'Tạo sản phẩm', tone: 'violet' }],
  },
  {
    id: 9943,
    title: 'Cyber Neko V2 (Pink Edition)',
    category: 'ART_TOY',
    status: 'PENDING_REVIEW',
    description: 'Mèo cyberpunk phiên bản hồng pastel.',
    shippingClass: 'Hộp tiêu chuẩn',
    polygonCount: 330_000,
    manifold: true,
    media: 3,
    variants: [v(5, 'NEKO-PNK-01', 'Resin UV', 'Hồng', '100mm', 680_000, 20)],
    updatedAt: nowIso(6),
    sold: 0,
    audit: [{ at: nowIso(6), actor: 'Bạn', action: 'Gửi duyệt sản phẩm', tone: 'violet' }],
  },
  {
    id: 9944,
    title: 'Neon Golem Mini',
    category: 'MINIATURE',
    status: 'DRAFT',
    description: 'Golem đá phát sáng neon, bản nháp.',
    shippingClass: 'Hộp tiêu chuẩn',
    polygonCount: 150_000,
    manifold: false,
    media: 1,
    variants: [v(6, 'GLM-NEO-01', 'PETG', 'Xanh neon', '70mm', 290_000, 0)],
    updatedAt: nowIso(48),
    sold: 0,
    audit: [{ at: nowIso(48), actor: 'Bạn', action: 'Lưu bản nháp' }],
  },
  {
    id: 9945,
    title: 'Drako Dragon Baby',
    category: 'FIGURINE',
    status: 'REJECTED',
    description: 'Rồng con khớp nối xương sống.',
    shippingClass: 'Hộp collector chống sốc',
    polygonCount: 640_000,
    manifold: false,
    media: 2,
    rejectReason: 'Ảnh sản phẩm là render 3D, cần ảnh chụp mẫu in thực tế. Lưới chưa kín (non-manifold) ở phần cánh.',
    variants: [v(7, 'DRK-PETG-01', 'PETG Silk', 'Hồng ngọc', '110mm', 620_000, 5)],
    updatedAt: nowIso(20),
    sold: 0,
    audit: [
      { at: nowIso(70), actor: 'Bạn', action: 'Gửi duyệt sản phẩm', tone: 'violet' },
      { at: nowIso(20), actor: 'KDV_TranLegal', action: 'Từ chối niêm yết', note: 'Ảnh render, lưới non-manifold', tone: 'danger' },
    ],
  },
  {
    id: 9946,
    title: 'Astro Bear Explorer',
    category: 'ART_TOY',
    status: 'HIDDEN',
    description: 'Gấu phi hành gia mũ kính trong suốt.',
    shippingClass: 'Hộp collector chống sốc',
    polygonCount: 520_000,
    manifold: true,
    media: 6,
    variants: [v(8, 'AST-RES-01', 'Resin UV', 'Trắng tím', '120mm', 540_000, 7, 0, false)],
    updatedAt: nowIso(200),
    sold: 54,
    audit: [{ at: nowIso(200), actor: 'Bạn', action: 'Tạm ẩn khỏi chợ', note: 'Bảo trì khuôn in' }],
  },
]

export type InventoryLog = { at: string; sku: string; change: number; reason: string; actor: string; kind: 'IN' | 'OUT' | 'PRICE' | 'RESERVE' }

export const inventoryLogs: InventoryLog[] = [
  { at: nowIso(3), sku: 'MBA-RES-WHT', change: 10, reason: 'Nạp thêm phôi lô #L-1024', actor: 'Bạn', kind: 'IN' },
  { at: nowIso(9), sku: 'BOT-ORG-01', change: -1, reason: 'Phôi lỗi nứt lớp, loại bỏ', actor: 'Bạn', kind: 'OUT' },
  { at: nowIso(20), sku: 'MBA-RES-BLK', change: 1, reason: 'Giữ chỗ đơn #ORD-00201 (15 phút)', actor: 'Hệ thống', kind: 'RESERVE' },
  { at: nowIso(30), sku: 'MBA-RES-BLK', change: 40_000, reason: 'Điều chỉnh giá theo chi phí resin', actor: 'Bạn', kind: 'PRICE' },
]

/* -------------------------------------------------------------- disputes */

export type DisputeStatus = 'NEEDS_RESPONSE' | 'ARBITRATION' | 'REFUNDED' | 'REJECTED'

export type Dispute = {
  id: string
  orderId: number
  product: string
  sku: string
  reason: string
  buyerClaim: string
  amount: number
  status: DisputeStatus
  deadline: string
  sellerResponse?: string
  evidence: string[]
  audit: AuditEntry[]
}

export const disputes: Dispute[] = [
  {
    id: 'TXN-RFD-88188',
    orderId: 88188,
    product: 'Glitch Bunny Neon Edition',
    sku: 'GB-RESIN-NEON-02',
    reason: 'Hàng vỡ gãy khi vận chuyển',
    buyerClaim: 'Mô hình gãy tai trái trong quá trình vận chuyển, phôi in có bọt khí. Đã quay video mở hộp.',
    amount: 820_000,
    status: 'NEEDS_RESPONSE',
    deadline: nowIso(-18),
    evidence: ['Video unboxing 4K', 'Ảnh vết gãy tai', 'Ảnh hộp móp'],
    audit: [
      { at: nowIso(30), actor: 'Người mua', action: 'Mở khiếu nại hoàn tiền', tone: 'orange' },
      { at: nowIso(29), actor: 'Hệ thống', action: 'Phong toả ký quỹ 820.000₫', tone: 'danger' },
    ],
  },
  {
    id: 'TXN-RFD-88120',
    orderId: 88120,
    product: 'Mecha Bear Alpha',
    sku: 'MBA-RES-WHT',
    reason: 'Sai kích thước / vật liệu',
    buyerClaim: 'Nhận bản 100mm thay vì 120mm như đơn đặt.',
    amount: 1_450_000,
    status: 'ARBITRATION',
    deadline: nowIso(-30),
    sellerResponse: 'Xưởng đã gửi nhầm lô, đề nghị in bù bản 120mm miễn phí.',
    evidence: ['Ảnh thước đo'],
    audit: [{ at: nowIso(50), actor: 'Người mua', action: 'Mở khiếu nại hoàn tiền', tone: 'orange' }],
  },
  { id: 'TXN-RFD-87990', orderId: 87990, product: 'Bolt Mini Robot V1', sku: 'BOT-MINT-01', reason: 'Không nhận được hàng', buyerClaim: 'Bưu tá báo giao nhưng không nhận được.', amount: 390_000, status: 'REFUNDED', deadline: nowIso(100), evidence: [], audit: [] },
  { id: 'TXN-RFD-87801', orderId: 87801, product: 'Astro Bear Explorer', sku: 'AST-RES-01', reason: 'Không đúng mô tả', buyerClaim: 'Màu tím đậm hơn ảnh.', amount: 540_000, status: 'REJECTED', deadline: nowIso(300), evidence: [], audit: [] },
]

/* -------------------------------------------------------------- earnings */

export type EarningStatus = 'PENDING' | 'RELEASED' | 'HELD'

export type Earning = {
  id: string
  orderId: number
  product: string
  sku: string
  gross: number
  feeRate: number
  status: EarningStatus
  receivedAt?: string
  releaseAt?: string
  blocker?: string
  ledger: { id: string; at: string; type: string; amount: number; bucket: 'pending' | 'available' | 'held'; status: 'POSTED' | 'PENDING' }[]
}

export const earnings: Earning[] = [
  {
    id: 'ERN-88219',
    orderId: 88219,
    product: 'AstroDino Space Kid V2',
    sku: 'ASTRO-FDM-LAV',
    gross: 920_000,
    feeRate: 0.05,
    status: 'PENDING',
    receivedAt: nowIso(30),
    releaseAt: nowIso(-42),
    blocker: 'Đang trong cửa sổ khiếu nại 72h kể từ khi người mua nhận hàng.',
    ledger: [
      { id: 'led_9012a1', at: nowIso(60), type: 'Ghi nhận doanh thu chờ (pending)', amount: 874_000, bucket: 'pending', status: 'POSTED' },
      { id: 'led_9012a4', at: nowIso(-42), type: 'Giải ngân vào khả dụng', amount: 874_000, bucket: 'available', status: 'PENDING' },
    ],
  },
  {
    id: 'ERN-88204',
    orderId: 88204,
    product: 'NeoBear Capsule #01',
    sku: 'NB-RESIN-MINT',
    gross: 2_140_000,
    feeRate: 0.05,
    status: 'RELEASED',
    receivedAt: nowIso(120),
    releaseAt: nowIso(48),
    ledger: [
      { id: 'led_8810b1', at: nowIso(150), type: 'Ghi nhận doanh thu chờ (pending)', amount: 2_033_000, bucket: 'pending', status: 'POSTED' },
      { id: 'led_8810b2', at: nowIso(48), type: 'Giải ngân vào khả dụng', amount: 2_033_000, bucket: 'available', status: 'POSTED' },
    ],
  },
  {
    id: 'ERN-88188',
    orderId: 88188,
    product: 'Glitch Bunny Neon Edition',
    sku: 'GB-RESIN-NEON-02',
    gross: 820_000,
    feeRate: 0.05,
    status: 'HELD',
    receivedAt: nowIso(32),
    blocker: 'Phong toả do tranh chấp TXN-RFD-88188 đang chờ phản hồi.',
    ledger: [
      { id: 'led_8818c1', at: nowIso(40), type: 'Ghi nhận doanh thu chờ (pending)', amount: 779_000, bucket: 'pending', status: 'POSTED' },
      { id: 'led_8818c2', at: nowIso(29), type: 'Chuyển sang tạm giữ (held)', amount: 779_000, bucket: 'held', status: 'POSTED' },
    ],
  },
  {
    id: 'ERN-88102',
    orderId: 88102,
    product: 'Drako Rồng Bỏ Túi',
    sku: 'DRK-PETG-01',
    gross: 658_000,
    feeRate: 0.05,
    status: 'RELEASED',
    receivedAt: nowIso(240),
    releaseAt: nowIso(168),
    ledger: [{ id: 'led_8810d2', at: nowIso(168), type: 'Giải ngân vào khả dụng', amount: 625_100, bucket: 'available', status: 'POSTED' }],
  },
]

export const wallet = { available: 4_790_000, pending: 874_000, held: 779_000 }
