import { nowIso } from '../../../shared/mock/mockApi'
import type { AuditEntry } from '../../../shared/ui/kit'

/* ---------------------------------------------------------- notifications */

export type NotificationKind = 'ORDER' | 'FINANCE' | 'SYSTEM'
export type Notification = { id: string; kind: NotificationKind; title: string; body: string; at: string; read: boolean; link?: string }

export const notifications: Notification[] = [
  { id: 'n1', kind: 'ORDER', title: 'Đơn #ORD-88219 (MINI ROBOT Bolt) đã giao thành công', body: 'Kiểm tra sản phẩm và xác nhận đã nhận hàng trong 24h.', at: nowIso(1), read: false, link: '/orders' },
  { id: 'n2', kind: 'FINANCE', title: 'Khoản thu hộ COD 390.000₫ đơn #ORD-88102 đã xác thực', body: 'Bưu cục đã nộp tiền thu hộ, đơn được ghi nhận hoàn tất.', at: nowIso(5), read: false },
  { id: 'n3', kind: 'FINANCE', title: 'Yêu cầu hoàn tiền #REF-042 đã được phê duyệt', body: '540.000₫ sẽ được hoàn về ZaloPay trong 1–3 ngày làm việc.', at: nowIso(20), read: false, link: '/refunds/REF-042' },
  { id: 'n4', kind: 'SYSTEM', title: 'Gói xưởng Storefront Pro sẽ hết hạn sau 5 ngày', body: 'Gia hạn để gian hàng tiếp tục hiển thị trên chợ.', at: nowIso(30), read: true, link: '/seller/subscription' },
  { id: 'n5', kind: 'SYSTEM', title: 'Tác vụ AI Mesh (Bolt Mech Wing) đã hoàn tất', body: 'Mô hình đã sẵn sàng trong Thư viện 3D.', at: nowIso(50), read: true, link: '/models' },
  { id: 'n6', kind: 'ORDER', title: 'Yêu cầu in 3D #POD-3301 hoàn tất cắt lớp', body: 'Xưởng bắt đầu in trong hôm nay.', at: nowIso(80), read: false },
]

/* --------------------------------------------------------------- security */

export type Session = { id: string; device: string; location: string; ip: string; lastActive: string; current: boolean }

export const sessions: Session[] = [
  { id: 's1', device: 'Chrome · Windows 11', location: 'TP. Hồ Chí Minh', ip: '113.161.**.**', lastActive: nowIso(0), current: true },
  { id: 's2', device: 'Safari · iPhone 15', location: 'TP. Hồ Chí Minh', ip: '27.72.**.**', lastActive: nowIso(6), current: false },
  { id: 's3', device: 'Firefox · macOS', location: 'Hà Nội', ip: '14.232.**.**', lastActive: nowIso(70), current: false },
]

/* ----------------------------------------------------------- help content */

export const helpTopics = [
  { slug: 'mua-sam', title: 'Mua sắm & đặt hàng vật lý', icon: 'cart', faqs: 4 },
  { slug: 'hoan-tien', title: 'Ký quỹ & hoàn tiền 72h', icon: 'shield', faqs: 5 },
  { slug: 'giao-van', title: 'Giao vận & thu hộ COD', icon: 'truck', faqs: 3 },
  { slug: 'xuong', title: 'Dành cho xưởng & nghệ nhân', icon: 'store', faqs: 4 },
  { slug: 'ai-pod', title: 'AI Studio & dịch vụ đặt in', icon: 'sparkles', faqs: 3 },
]

export const faqs = [
  { q: 'Vì sao một lần đặt hàng lại tách thành nhiều đơn?', a: 'Mỗi xưởng chế tác xử lý và giao phần hàng của mình như một đơn con độc lập, có vận đơn và phí ship riêng.', topic: 'mua-sam' },
  { q: 'Tôi có bao lâu để yêu cầu hoàn tiền?', a: 'Bạn có 72 giờ kể từ khi xác nhận nhận hàng (hoặc hệ thống tự xác nhận sau 24 giờ giao thành công).', topic: 'hoan-tien' },
  { q: 'Tiền của tôi được giữ ở đâu khi đặt hàng?', a: 'Khoản thanh toán được giữ ký quỹ, chỉ giải ngân cho xưởng khi hết cửa sổ khiếu nại.', topic: 'hoan-tien' },
  { q: 'Đơn COD được xử lý thế nào?', a: 'Bạn trả tiền cho bưu tá; doanh thu xưởng chỉ ghi nhận sau khi bưu cục quyết toán tiền thu hộ.', topic: 'giao-van' },
  { q: 'Có thể huỷ đơn sau khi xưởng bắt đầu in?', a: 'Đơn đang chế tác chỉ huỷ được khi xưởng đồng ý; phôi đã in có thể bị trừ chi phí vật liệu.', topic: 'mua-sam' },
  { q: 'Làm sao để mở gian hàng?', a: 'Đăng ký người bán, xác thực ngân hàng và chọn gói thuê bao xưởng.', topic: 'xuong' },
]

export const policies: Record<string, { title: string; updated: string; sections: { h: string; p: string }[] }> = {
  'escrow-72h': {
    title: 'Chính Sách Ký Quỹ & Bảo Vệ Người Mua 72H',
    updated: '01/10/2026',
    sections: [
      { h: 'Điều 1: Cơ chế ký quỹ độc lập', p: 'Mọi khoản thanh toán đơn hàng vật lý được giữ trong tài khoản ký quỹ của 3DWorld, không chuyển trực tiếp cho xưởng.' },
      { h: 'Điều 2: Mốc giao nhận & nghiệm thu', p: 'Người mua có 24 giờ để xác nhận nhận hàng sau khi bưu tá giao thành công; quá hạn hệ thống tự xác nhận.' },
      { h: 'Điều 3: Hoàn tiền & giới hạn tài chính', p: 'Yêu cầu hoàn tiền gửi trong 72 giờ kể từ khi nhận hàng; số tiền hoàn không vượt quá tổng đã thanh toán của đơn con.' },
      { h: 'Điều 4: Đối soát COD & doanh thu xưởng', p: 'Doanh thu đơn COD chỉ ghi nhận sau khi bưu cục quyết toán tiền thu hộ cho sàn.' },
    ],
  },
  'dieu-khoan': {
    title: 'Điều Khoản Dịch Vụ 3DWorld',
    updated: '15/09/2026',
    sections: [
      { h: 'Phạm vi dịch vụ', p: '3DWorld cung cấp nền tảng tạo mô hình 3D, chợ vật phẩm in 3D và dịch vụ đặt in theo yêu cầu.' },
      { h: 'Quyền sở hữu tệp', p: 'Tệp mô hình thuộc quyền sở hữu của người tạo; chợ chỉ bán vật phẩm vật lý, không bán tệp số.' },
    ],
  },
}

/* ---------------------------------------------------------------- refunds */

export type RefundStatus = 'PENDING_STAFF' | 'NEEDS_EVIDENCE' | 'SUCCEEDED' | 'REJECTED'

export type RefundCase = {
  id: string
  orderId: number
  product: string
  storefront: string
  amount: number
  reason: string
  status: RefundStatus
  createdAt: string
  deadline: string
  buyerNote: string
  evidence: string[]
  resolution?: string
  audit: AuditEntry[]
}

export const refunds: RefundCase[] = [
  {
    id: 'REF-044',
    orderId: 88219,
    product: 'Bolt Mini Robot V1',
    storefront: '0xRoboStudio',
    amount: 390_000,
    reason: 'Sản phẩm bị vỡ khi vận chuyển',
    status: 'NEEDS_EVIDENCE',
    createdAt: nowIso(20),
    deadline: nowIso(-28),
    buyerNote: 'Tay robot gãy rời khi mở hộp.',
    evidence: ['Ảnh tay gãy'],
    audit: [
      { at: nowIso(20), actor: 'Bạn', action: 'Gửi yêu cầu hoàn tiền', tone: 'violet' },
      { at: nowIso(8), actor: 'Trọng tài SWD', action: 'Yêu cầu bổ sung video mở hộp', tone: 'orange' },
    ],
  },
  {
    id: 'REF-043',
    orderId: 88102,
    product: 'Drako Rồng Bỏ Túi',
    storefront: 'WyrmWorks',
    amount: 620_000,
    reason: 'Sai kích thước / vật liệu',
    status: 'PENDING_STAFF',
    createdAt: nowIso(40),
    deadline: nowIso(-10),
    buyerNote: 'Nhận bản PLA thay vì PETG Silk.',
    evidence: ['Ảnh nhãn SKU', 'Video unboxing'],
    audit: [{ at: nowIso(40), actor: 'Bạn', action: 'Gửi yêu cầu hoàn tiền', tone: 'violet' }],
  },
  {
    id: 'REF-042',
    orderId: 87990,
    product: 'Astro Bear Thạch Anh',
    storefront: 'AstralForge',
    amount: 540_000,
    reason: 'Không nhận được hàng',
    status: 'SUCCEEDED',
    createdAt: nowIso(120),
    deadline: nowIso(48),
    buyerNote: 'Vận đơn báo giao nhưng chưa nhận.',
    evidence: ['Ảnh xác nhận bưu cục'],
    resolution: 'Chấp thuận hoàn 100% — bưu cục xác nhận thất lạc kiện.',
    audit: [
      { at: nowIso(120), actor: 'Bạn', action: 'Gửi yêu cầu hoàn tiền', tone: 'violet' },
      { at: nowIso(60), actor: 'Trọng tài SWD', action: 'Chấp thuận hoàn tiền 540.000₫', tone: 'green' },
    ],
  },
]

/* ---------------------------------------------------------------- reports */

export type ReportStatus = 'PENDING' | 'INVESTIGATING' | 'RESOLVED_ACTION_TAKEN' | 'DISMISSED'

export type ViolationReport = {
  id: string
  targetType: 'PRODUCT' | 'STOREFRONT' | 'USER'
  target: string
  targetOwner: string
  reason: string
  description: string
  status: ReportStatus
  createdAt: string
  evidence: string[]
  outcome?: string
  audit: AuditEntry[]
}

export const reports: ViolationReport[] = [
  {
    id: 'REP-2026-081',
    targetType: 'PRODUCT',
    target: 'Mecha Cyber Dragon SLA',
    targetOwner: 'AstralForge',
    reason: 'Vi phạm bản quyền thiết kế',
    description: 'Mẫu này sao chép thiết kế gốc của tôi đăng trên Patreon năm 2025.',
    status: 'INVESTIGATING',
    createdAt: nowIso(48),
    evidence: ['Link Patreon gốc', 'Ảnh so sánh lưới'],
    audit: [
      { at: nowIso(48), actor: 'Bạn', action: 'Gửi báo cáo vi phạm', tone: 'violet' },
      { at: nowIso(30), actor: 'Staff Mod', action: 'Bắt đầu thẩm định, đối soát mã băm lưới', tone: 'orange' },
    ],
  },
  {
    id: 'REP-2026-077',
    targetType: 'PRODUCT',
    target: 'Gundam RX Custom In Lậu',
    targetOwner: 'FakeModelLab',
    reason: 'In lậu mô hình có bản quyền',
    description: 'Sản phẩm in lại mô hình thương mại có bản quyền.',
    status: 'RESOLVED_ACTION_TAKEN',
    createdAt: nowIso(200),
    evidence: ['Ảnh so sánh'],
    outcome: 'Gỡ niêm yết sản phẩm, cảnh cáo gian hàng lần 1.',
    audit: [{ at: nowIso(150), actor: 'Staff Mod', action: 'Xác nhận vi phạm & gỡ niêm yết', tone: 'green' }],
  },
  {
    id: 'REP-2026-070',
    targetType: 'USER',
    target: 'Tài khoản Maker giả danh',
    targetOwner: '—',
    reason: 'Gian lận giao dịch ngoài ký quỹ',
    description: 'Yêu cầu chuyển khoản trực tiếp ngoài sàn.',
    status: 'PENDING',
    createdAt: nowIso(4),
    evidence: ['Ảnh tin nhắn'],
    audit: [{ at: nowIso(4), actor: 'Bạn', action: 'Gửi báo cáo vi phạm', tone: 'violet' }],
  },
]

/* --------------------------------------------------------------- reviews */

export type Review = { orderId: number; product: string; storefront: string; rating: number; comment: string; photos: number; at: string; reply?: string }

export const reviews: Review[] = [
  { orderId: 88102, product: 'Drako Rồng Bỏ Túi', storefront: 'WyrmWorks', rating: 5, comment: 'Khớp xương sống rất mượt, sơn bóng đẹp.', photos: 2, at: nowIso(100), reply: 'Cảm ơn bạn đã ủng hộ xưởng!' },
]

/* ----------------------------------------------------- payment transactions */

export type TxnAttempt = { no: number; method: string; gateway: string; ref: string; status: 'SUCCEEDED' | 'FAILED' | 'UNKNOWN' | 'PENDING'; at: string; note: string }

export type PaymentTxn = {
  id: string
  purpose: string
  orderIds: number[]
  amount: number
  status: 'SUCCEEDED' | 'FAILED' | 'UNKNOWN' | 'REFUNDED'
  createdAt: string
  attempts: TxnAttempt[]
}

export const transactions: PaymentTxn[] = [
  {
    id: 'TXN-PAY-99815',
    purpose: 'Thanh toán đơn vật lý',
    orderIds: [99210, 99211],
    amount: 1_240_000,
    status: 'SUCCEEDED',
    createdAt: nowIso(30),
    attempts: [
      { no: 1, method: 'ZaloPay', gateway: 'zalopay-sandbox', ref: 'ZP-261023-0001', status: 'FAILED', at: nowIso(30), note: 'Người dùng huỷ trên cổng' },
      { no: 2, method: 'ZaloPay', gateway: 'zalopay-sandbox', ref: 'ZP-261023-0002', status: 'SUCCEEDED', at: nowIso(29), note: 'Callback MAC hợp lệ' },
    ],
  },
  {
    id: 'TXN-PAY-99820',
    purpose: 'Nạp ví 3DWorld',
    orderIds: [],
    amount: 1_000_000,
    status: 'UNKNOWN',
    createdAt: nowIso(3),
    attempts: [{ no: 1, method: 'ZaloPay', gateway: 'zalopay-sandbox', ref: 'ZP-261024-0107', status: 'UNKNOWN', at: nowIso(3), note: 'Chưa nhận callback sau 15 phút — đang đối soát' }],
  },
  {
    id: 'TXN-SUB-88219',
    purpose: 'Thuê bao Storefront Pro',
    orderIds: [],
    amount: 250_000,
    status: 'SUCCEEDED',
    createdAt: nowIso(600),
    attempts: [{ no: 1, method: 'Ví 3DWorld', gateway: 'wallet', ref: 'WAL-88219', status: 'SUCCEEDED', at: nowIso(600), note: 'Trừ số dư khả dụng' }],
  },
]
