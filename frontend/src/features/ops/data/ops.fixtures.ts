import { nowIso } from '../../../shared/mock/mockApi'
import type { AuditEntry } from '../../../shared/ui/kit'

export type OpsDomain =
  | 'storefront'
  | 'product'
  | 'report'
  | 'order'
  | 'shipment'
  | 'cod'
  | 'refund'
  | 'finance'
  | 'inquiry'
  | 'user'
  | 'escalation'
  | 'transaction'
  | 'codSettlement'
  | 'refundLedger'
  | 'payout'
  | 'walletLedger'
  | 'earning'
  | 'revenue'
  | 'audit'

/** Hồ sơ vận hành chung cho mọi hàng chờ quản trị. `f` chứa trường riêng của từng nghiệp vụ. */
export type OpsCase = {
  id: string
  domain: OpsDomain
  status: string
  title: string
  subtitle?: string
  createdAt: string
  deadline?: string
  assignee?: string
  amount?: number
  risk?: number
  f: Record<string, string | number>
  evidence?: string[]
  audit: AuditEntry[]
}

const A = (h: number, actor: string, action: string, tone?: AuditEntry['tone'], note?: string): AuditEntry => ({ at: nowIso(h), actor, action, tone, note })

const STAFF = ['KDV_NguyenSWD', 'KDV_PhamAudit', 'KDV_TranLegal']

export const cases: OpsCase[] = [
  /* ---------------------------------------------- 056/057 storefront verify */
  {
    id: 'VER-8820',
    domain: 'storefront',
    status: 'PENDING',
    title: '0xRoboStudio',
    subtitle: 'store_0xrobo_992',
    createdAt: nowIso(36),
    deadline: nowIso(-12),
    assignee: STAFF[0],
    risk: 22,
    f: { owner: 'Nguyễn Văn An', ownerId: 'USR-99214', bank: 'Vietcombank ****6789', bankStatus: 'PENDING', location: 'Q.1, TP.HCM', equipment: 'Formlabs 3 · Bambu X1C', tech: 'Resin SLA, FDM PLA', email: 'Đã xác thực', phone: 'Đã xác thực' },
    evidence: ['Ảnh xưởng in', 'Máy in Formlabs 3', 'Mẫu in thử', 'Giấy phép hộ kinh doanh (PDF)'],
    audit: [A(36, 'Người bán', 'Nộp hồ sơ xưởng', 'violet'), A(20, STAFF[0], 'Nhận hồ sơ thẩm định')],
  },
  {
    id: 'VER-8814',
    domain: 'storefront',
    status: 'NEEDS_INFO',
    title: 'MossyMakers',
    subtitle: 'store_mossy_310',
    createdAt: nowIso(70),
    assignee: STAFF[1],
    risk: 41,
    f: { owner: 'Lê Thu Hà', ownerId: 'USR-88120', bank: 'Techcombank ****1122', bankStatus: 'REJECTED', location: 'Cầu Giấy, Hà Nội', equipment: 'Elegoo Saturn 3', tech: 'Resin DLP', email: 'Đã xác thực', phone: 'Chưa xác thực' },
    evidence: ['Ảnh xưởng in'],
    audit: [A(70, 'Người bán', 'Nộp hồ sơ xưởng', 'violet'), A(50, STAFF[1], 'Yêu cầu bổ sung', 'orange', 'Thiếu xác thực SĐT & sao kê ngân hàng')],
  },
  {
    id: 'VER-8790',
    domain: 'storefront',
    status: 'VERIFIED',
    title: 'AstralForge',
    subtitle: 'store_astral_009',
    createdAt: nowIso(300),
    risk: 8,
    f: { owner: 'Trần Minh Trí', ownerId: 'USR-77002', bank: 'MB Bank ****4410', bankStatus: 'APPROVED', location: 'Nam Từ Liêm, Hà Nội', equipment: 'Formlabs Form 4', tech: 'Resin SLA', email: 'Đã xác thực', phone: 'Đã xác thực' },
    evidence: ['Ảnh xưởng', 'Mẫu in'],
    audit: [A(300, 'Người bán', 'Nộp hồ sơ xưởng', 'violet'), A(280, STAFF[0], 'Phê duyệt hồ sơ', 'green')],
  },
  {
    id: 'VER-8771',
    domain: 'storefront',
    status: 'REJECTED',
    title: 'FakeModelLab',
    subtitle: 'store_fake_404',
    createdAt: nowIso(400),
    risk: 88,
    f: { owner: 'Ẩn danh', ownerId: 'USR-66001', bank: '—', bankStatus: 'REJECTED', location: 'Không xác minh được', equipment: '—', tech: 'FDM', email: 'Chưa xác thực', phone: 'Chưa xác thực' },
    audit: [A(390, STAFF[2], 'Từ chối hồ sơ', 'danger', 'Ảnh xưởng lấy từ internet')],
  },

  /* ------------------------------------------------- 058/059 product review */
  {
    id: 'PRD-9943',
    domain: 'product',
    status: 'PENDING',
    title: 'Cyber Neko V2 (Pink Edition)',
    subtitle: 'Art toy · Resin UV · 100mm',
    createdAt: nowIso(6),
    deadline: nowIso(-18),
    assignee: STAFF[0],
    risk: 18,
    f: { store: '0xRoboStudio', category: 'ART_TOY', variants: 1, price: 680000, poly: '330.000', manifold: 'Kín', aiRisk: 'Thấp — không trùng mã băm', media: 3 },
    evidence: ['Góc 45°', 'Cận sấy UV', 'Lưới 3D mesh'],
    audit: [A(6, 'Người bán', 'Gửi duyệt sản phẩm', 'violet')],
  },
  {
    id: 'PRD-9941',
    domain: 'product',
    status: 'PENDING',
    title: 'Mecha Bear Alpha — SLA 8K',
    subtitle: 'Figure · Resin SLA · 120mm',
    createdAt: nowIso(18),
    assignee: STAFF[0],
    risk: 64,
    f: { store: 'StudioK', category: 'FIGURINE', variants: 2, price: 1450000, poly: '482.000', manifold: 'Kín', aiRisk: 'Cao — 87% trùng lưới với tác phẩm Patreon', media: 5 },
    evidence: ['Ảnh mẫu in', 'Thước caliper', 'Hộp xốp định hình'],
    audit: [A(18, 'Người bán', 'Gửi duyệt sản phẩm', 'violet'), A(10, 'AI Risk', 'Gắn cờ trùng lưới 87%', 'danger')],
  },
  {
    id: 'PRD-9945',
    domain: 'product',
    status: 'REJECTED',
    title: 'Drako Dragon Baby',
    subtitle: 'Figure · PETG Silk',
    createdAt: nowIso(70),
    risk: 35,
    f: { store: '0xRoboStudio', category: 'FIGURINE', variants: 1, price: 620000, poly: '640.000', manifold: 'Chưa kín', aiRisk: 'Trung bình', media: 2 },
    audit: [A(20, STAFF[2], 'Từ chối niêm yết', 'danger', 'Ảnh render, lưới non-manifold')],
  },

  /* ------------------------------------------------- 060/061 report review */
  {
    id: 'REP-IP-9901',
    domain: 'report',
    status: 'PENDING',
    title: 'Mecha Cyber Dragon SLA',
    subtitle: 'Vi phạm bản quyền IP',
    createdAt: nowIso(4),
    deadline: nowIso(-20),
    assignee: STAFF[2],
    risk: 82,
    f: { target: 'PRD-9922 · AstralForge', reporter: 'Tác giả gốc (Patreon)', reason: 'Vi phạm bản quyền IP', hash: 'SHA-256 trùng 94%', orders: 3, escrow: 2850000 },
    evidence: ['Link Patreon gốc', 'Ảnh so sánh lưới', 'Chứng nhận bản quyền'],
    audit: [A(4, 'Người dùng', 'Gửi báo cáo vi phạm', 'violet')],
  },
  {
    id: 'REP-SC-9888',
    domain: 'report',
    status: 'NEEDS_EVIDENCE',
    title: 'Neon Golem Mini',
    subtitle: 'Sai lệch phôi in POD',
    createdAt: nowIso(30),
    assignee: STAFF[1],
    risk: 40,
    f: { target: 'PRD-9944 · 0xRoboStudio', reporter: 'Người mua #USR-1203', reason: 'Sai lệch phôi in POD', hash: '—', orders: 1, escrow: 290000 },
    audit: [A(30, 'Người mua', 'Gửi báo cáo', 'violet'), A(20, STAFF[1], 'Yêu cầu bổ sung bằng chứng', 'orange')],
  },
  {
    id: 'REP-WP-9870',
    domain: 'report',
    status: 'LOCKED',
    title: 'Súng đồ chơi mô phỏng',
    subtitle: 'Nội dung vũ khí cấm',
    createdAt: nowIso(60),
    risk: 95,
    f: { target: 'PRD-9870 · ToyArms', reporter: 'Auto-scan', reason: 'Nội dung vũ khí cấm', hash: '—', orders: 0, escrow: 0 },
    audit: [A(60, 'Auto-scan', 'Tạm khoá niêm yết', 'danger')],
  },

  /* ------------------------------------------------- 062/063 platform order */
  {
    id: 'ORD-88192',
    domain: 'order',
    status: 'CANCEL_REQUESTED',
    title: 'Mecha Bear Alpha ×1',
    subtitle: 'Nhóm checkout #CHK-99184',
    createdAt: nowIso(26),
    assignee: STAFF[0],
    amount: 1485000,
    f: { store: 'StudioK', buyer: 'Vũ Hoàng Minh', orderStatus: 'PROCESSING', payment: 'ZaloPay · SUCCEEDED', shipping: 'GHN Express', reason: 'Người mua đổi ý, xưởng đã in 60%' },
    audit: [A(26, 'Người mua', 'Đặt hàng', 'violet'), A(6, 'Người mua', 'Yêu cầu huỷ đơn', 'orange')],
  },
  {
    id: 'ORD-88219',
    domain: 'order',
    status: 'COUNTDOWN_72H',
    title: 'AstroDino Space Kid V2 ×1',
    subtitle: 'Nhóm checkout #CHK-99180',
    createdAt: nowIso(90),
    amount: 920000,
    f: { store: 'VinylCraft', buyer: 'Trần Vũ Minh Trang', orderStatus: 'DELIVERED', payment: 'ZaloPay · SUCCEEDED', shipping: 'GHN Express', reason: '—' },
    audit: [A(90, 'Người mua', 'Đặt hàng', 'violet'), A(30, 'GHN', 'Giao thành công', 'green')],
  },
  {
    id: 'ORD-88188',
    domain: 'order',
    status: 'DISPUTE',
    title: 'Glitch Bunny Neon Edition ×1',
    subtitle: 'Nhóm checkout #CHK-99092',
    createdAt: nowIso(120),
    amount: 820000,
    f: { store: '0xRoboStudio', buyer: 'Phạm Đình Khôi', orderStatus: 'DELIVERED', payment: 'ZaloPay · SUCCEEDED', shipping: 'GHN Express', reason: 'Khiếu nại hàng vỡ' },
    audit: [A(30, 'Người mua', 'Mở khiếu nại', 'danger')],
  },
  {
    id: 'ORD-88250',
    domain: 'order',
    status: 'MAKING',
    title: 'NeoBear Capsule #01 ×2',
    subtitle: 'Nhóm checkout #CHK-99201',
    createdAt: nowIso(8),
    amount: 4240000,
    f: { store: 'VinylCraft', buyer: 'Lê Gia Huy', orderStatus: 'PROCESSING', payment: 'COD', shipping: '—', reason: '—' },
    audit: [A(8, 'Người mua', 'Đặt hàng COD', 'violet')],
  },

  /* ------------------------------------------------ 064/065 platform shipment */
  {
    id: 'SHP-99210',
    domain: 'shipment',
    status: 'FAILED_DELIVERY',
    title: 'GHN880112VN',
    subtitle: 'Đơn #ORD-99210 · Mecha Bear Alpha',
    createdAt: nowIso(40),
    assignee: STAFF[1],
    amount: 1485000,
    f: { carrier: 'GHN Express', order: 'ORD-99210', store: 'StudioK', receiver: 'Nguyễn Hoàng Long · Q.7', weight: '450g', attempts: 2, lastEvent: 'Không liên lạc được người nhận' },
    evidence: ['Ảnh bưu tá tại địa chỉ', 'Log cuộc gọi'],
    audit: [A(40, 'GHN', 'Lấy hàng'), A(16, 'GHN', 'Giao thất bại lần 2', 'danger')],
  },
  {
    id: 'SHP-99188',
    domain: 'shipment',
    status: 'IN_TRANSIT',
    title: 'VTP77120045',
    subtitle: 'Đơn #ORD-88250',
    createdAt: nowIso(20),
    f: { carrier: 'Viettel Post', order: 'ORD-88250', store: 'VinylCraft', receiver: 'Lê Gia Huy · Q.10', weight: '600g', attempts: 0, lastEvent: 'Đang trung chuyển liên tỉnh' },
    audit: [A(20, 'VTP', 'Lấy hàng')],
  },
  {
    id: 'SHP-99150',
    domain: 'shipment',
    status: 'DELIVERED',
    title: 'GHN880050VN',
    subtitle: 'Đơn #ORD-88219',
    createdAt: nowIso(60),
    f: { carrier: 'GHN Express', order: 'ORD-88219', store: 'VinylCraft', receiver: 'Trần Vũ Minh Trang', weight: '300g', attempts: 1, lastEvent: 'Giao thành công, ký nhận' },
    evidence: ['Biên lai chữ ký'],
    audit: [A(30, 'GHN', 'Giao thành công', 'green')],
  },

  /* --------------------------------------------------------- 066/067 COD */
  {
    id: 'ATT-COD-99812',
    domain: 'cod',
    status: 'MISMATCH',
    title: 'Đơn #ORD-88102 · Drako Rồng Bỏ Túi',
    subtitle: 'GHN · tham chiếu COD-GHN-552',
    createdAt: nowIso(50),
    assignee: STAFF[1],
    amount: 652000,
    f: { declared: 652000, settled: 620000, carrier: 'GHN Express', store: 'WyrmWorks', delivered: 'Đã giao', collected: 'Bưu tá thu', settledAt: 'Chưa quyết toán', fee: 32600 },
    evidence: ['Sao kê bưu cục kỳ 10/2026', 'Webhook GHN'],
    audit: [A(50, 'GHN', 'Ghi nhận thu hộ'), A(10, 'Auto-reconcile', 'Phát hiện lệch 32.000₫', 'danger')],
  },
  {
    id: 'ATT-COD-99790',
    domain: 'cod',
    status: 'IN_WINDOW',
    title: 'Đơn #ORD-88250 · NeoBear Capsule',
    subtitle: 'VTP · tham chiếu COD-VTP-118',
    createdAt: nowIso(20),
    amount: 4240000,
    f: { declared: 4240000, settled: 0, carrier: 'Viettel Post', store: 'VinylCraft', delivered: 'Đang giao', collected: '—', settledAt: 'Chưa', fee: 212000 },
    audit: [A(20, 'VTP', 'Tạo vận đơn COD')],
  },
  {
    id: 'ATT-COD-99701',
    domain: 'cod',
    status: 'SETTLED',
    title: 'Đơn #ORD-88010 · Bolt Mini Robot',
    subtitle: 'GHN · tham chiếu COD-GHN-498',
    createdAt: nowIso(200),
    amount: 390000,
    f: { declared: 390000, settled: 390000, carrier: 'GHN Express', store: '0xRoboStudio', delivered: 'Đã giao', collected: 'Bưu tá thu', settledAt: 'Đã quyết toán', fee: 19500 },
    audit: [A(150, 'Auto-reconcile', 'Khớp & quyết toán', 'green')],
  },

  /* ------------------------------------------- 068/069 refund arbitration */
  {
    id: 'TXN-REF-99882',
    domain: 'refund',
    status: 'PENDING',
    title: 'Mecha Bear Alpha — vỡ khớp vai',
    subtitle: 'Đơn #ORD-88192 · StudioK',
    createdAt: nowIso(26),
    deadline: nowIso(-46),
    assignee: STAFF[0],
    amount: 1485000,
    f: { reason: 'Hàng vỡ gãy phôi in', buyer: 'Vũ Hoàng Minh', store: 'StudioK', paid: 1485000, refunded: 0, carrier: 'GHN Express · bảo hiểm 100%', storeReply: 'Xưởng xác nhận đóng gói đủ 3 lớp, đề nghị kích hoạt bảo hiểm GHN' },
    evidence: ['Video unboxing 4K', 'Ảnh vết gãy', 'Ảnh hộp móp'],
    audit: [A(30, 'Người mua', 'Xác nhận nhận hàng'), A(26, 'Người mua', 'Nộp yêu cầu hoàn tiền', 'orange'), A(25, 'Hệ thống', 'Khoá ký quỹ HELD_DISPUTE', 'danger')],
  },
  {
    id: 'TXN-REF-99870',
    domain: 'refund',
    status: 'NEEDS_VIDEO',
    title: 'Bolt Mini Robot — sai màu',
    subtitle: 'Đơn #ORD-88219',
    createdAt: nowIso(40),
    assignee: STAFF[1],
    amount: 390000,
    f: { reason: 'Sai kích thước/vật liệu', buyer: 'Hà Phương', store: '0xRoboStudio', paid: 390000, refunded: 0, carrier: 'GHN Express', storeReply: 'Chưa phản hồi' },
    evidence: ['Ảnh sản phẩm'],
    audit: [A(40, 'Người mua', 'Nộp yêu cầu hoàn tiền', 'orange'), A(20, STAFF[1], 'Yêu cầu video unboxing', 'orange')],
  },
  {
    id: 'TXN-REF-99701',
    domain: 'refund',
    status: 'APPROVED',
    title: 'Astro Bear — thất lạc',
    subtitle: 'Đơn #ORD-87990',
    createdAt: nowIso(200),
    amount: 540000,
    f: { reason: 'Không nhận được hàng', buyer: 'Khoa N.', store: 'AstralForge', paid: 540000, refunded: 540000, carrier: 'GHN Express', storeReply: 'Đồng ý' },
    audit: [A(150, STAFF[0], 'Chấp thuận hoàn tiền', 'green')],
  },

  /* ---------------------------------------------- 070/071 finance recon */
  {
    id: 'TXN-PAY-99820',
    domain: 'finance',
    status: 'UNKNOWN',
    title: 'Nạp ví 1.000.000₫',
    subtitle: 'idem-7c1a-…-f20',
    createdAt: nowIso(3),
    assignee: STAFF[1],
    amount: 1000000,
    f: { gateway: 'ZaloPay', ref: 'ZP-261024-0107', declared: 1000000, received: 0, cause: 'Webhook trễ > 15 phút', order: '—', attempts: 1 },
    audit: [A(3, 'ZaloPay', 'Tạo lệnh'), A(2, 'Watchdog', 'Đánh dấu UNKNOWN', 'orange')],
  },
  {
    id: 'TXN-PAY-99815',
    domain: 'finance',
    status: 'MISMATCH',
    title: 'Đơn #ORD-99210 + #ORD-99211',
    subtitle: 'idem-55b2-…-a01',
    createdAt: nowIso(30),
    assignee: STAFF[1],
    amount: 1240000,
    f: { gateway: 'ZaloPay', ref: 'ZP-261023-0002', declared: 1240000, received: 1200000, cause: 'Lệch số tiền 40.000₫', order: 'ORD-99210', attempts: 2 },
    evidence: ['Sao kê ngân hàng', 'Webhook raw JSON'],
    audit: [A(29, 'ZaloPay', 'Callback SUCCEEDED'), A(5, 'Đối soát', 'Phát hiện lệch số tiền', 'danger')],
  },

  /* ------------------------------------------------------ 072 inquiry */
  {
    id: 'INQ-88192-DISP',
    domain: 'inquiry',
    status: 'OPEN',
    title: 'Thẩm tra tranh chấp đơn #ORD-88192',
    subtitle: 'Đa bên: người mua · xưởng · GHN',
    createdAt: nowIso(20),
    deadline: nowIso(-28),
    assignee: STAFF[0],
    amount: 1485000,
    f: { entity: 'Đơn #ORD-88192', buyer: 'Vũ Hoàng Minh', store: 'StudioK', carrier: 'GHN Express', statements: 3 },
    evidence: ['Lời khai người mua', 'Lời khai xưởng', 'Biên bản GHN'],
    audit: [A(20, STAFF[0], 'Mở hồ sơ thẩm tra', 'violet')],
  },

  /* --------------------------------------------------- 074/075 users */
  {
    id: 'USR-99214',
    domain: 'user',
    status: 'ACTIVE',
    title: '0xRoboStudio · Nguyễn Văn An',
    subtitle: 'an.nguyen@0xrobo.vn',
    createdAt: nowIso(24 * 400),
    f: { roles: 'CUSTOMER, SELLER', kyc: 'Đã xác thực', credits: 350, wallet: 4790000, addresses: 2, banks: 1 },
    audit: [A(24 * 400, 'Hệ thống', 'Tạo tài khoản'), A(24 * 300, STAFF[0], 'Cấp vai trò SELLER', 'violet')],
  },
  {
    id: 'USR-88120',
    domain: 'user',
    status: 'SUSPENDED',
    title: 'MossyMakers · Lê Thu Hà',
    subtitle: 'ha.le@mossy.vn',
    createdAt: nowIso(24 * 200),
    f: { roles: 'CUSTOMER, SELLER', kyc: 'Thiếu SĐT', credits: 40, wallet: 0, addresses: 1, banks: 1 },
    audit: [A(48, STAFF[2], 'Tạm khoá 7 ngày', 'danger', 'Nghi vấn giao dịch ngoài sàn')],
  },
  {
    id: 'USR-77001',
    domain: 'user',
    status: 'ACTIVE',
    title: 'Vũ Hoàng Minh',
    subtitle: 'khachhang_pod_92@gmail.com',
    createdAt: nowIso(24 * 90),
    f: { roles: 'CUSTOMER', kyc: 'Email', credits: 120, wallet: 0, addresses: 1, banks: 0 },
    audit: [A(24 * 90, 'Hệ thống', 'Tạo tài khoản')],
  },
  {
    id: 'USR-66001',
    domain: 'user',
    status: 'BANNED',
    title: 'FakeModelLab',
    subtitle: 'fake@lab.io',
    createdAt: nowIso(24 * 60),
    f: { roles: 'CUSTOMER', kyc: 'Không', credits: 0, wallet: 0, addresses: 0, banks: 0 },
    audit: [A(24 * 10, STAFF[2], 'Cấm vĩnh viễn', 'danger', 'In lậu tái phạm 3 lần')],
  },

  /* ------------------------------------------------ 078/079 escalations */
  {
    id: 'REP-ESC-99401',
    domain: 'escalation',
    status: 'ESCALATED',
    title: 'StudioK — tái phạm bản quyền',
    subtitle: 'Leo thang từ REP-IP-9901',
    createdAt: nowIso(10),
    deadline: nowIso(-14),
    assignee: STAFF[2],
    risk: 91,
    amount: 2850000,
    f: { entity: 'Gian hàng StudioK', level: 'Nghiêm trọng', source: 'Kiểm duyệt viên cấp 1', history: '2 vi phạm trước', orders: 3, listings: 12 },
    evidence: ['Đối soát lưới 94%', 'Lịch sử vi phạm'],
    audit: [A(10, STAFF[0], 'Leo thang hồ sơ', 'danger')],
  },
  {
    id: 'REP-ESC-99380',
    domain: 'escalation',
    status: 'ESCALATED',
    title: 'Tài khoản rửa tiền nghi vấn',
    subtitle: 'Nạp/rút vòng tròn',
    createdAt: nowIso(30),
    risk: 76,
    amount: 15000000,
    f: { entity: 'USR-55120', level: 'Cao', source: 'Watchdog tài chính', history: '0', orders: 0, listings: 0 },
    audit: [A(30, 'Watchdog', 'Gắn cờ giao dịch bất thường', 'danger')],
  },

  /* --------------------------------------------- 080/081 transactions */
  {
    id: 'TXN-PAY-99815',
    domain: 'transaction',
    status: 'NEEDS_REVIEW',
    title: 'Thanh toán đơn vật lý',
    subtitle: 'idem-55b2 · CHK-99184',
    createdAt: nowIso(30),
    amount: 1240000,
    f: { gateway: 'ZaloPay', ref: 'ZP-261023-0002', attempts: 2, purpose: 'PHYSICAL_ORDER', bank: 'Napas · VCB', expected: 1240000, received: 1200000 },
    evidence: ['Sao kê số phụ ngân hàng'],
    audit: [A(29, 'ZaloPay', 'Callback SUCCEEDED'), A(5, 'Đối soát', 'Lệch 40.000₫', 'danger')],
  },
  {
    id: 'TXN-PAY-99790',
    domain: 'transaction',
    status: 'MATCHED',
    title: 'Thuê bao Storefront Pro',
    subtitle: 'idem-90aa',
    createdAt: nowIso(100),
    amount: 250000,
    f: { gateway: 'Ví 3DWorld', ref: 'WAL-88219', attempts: 1, purpose: 'SUBSCRIPTION', bank: '—', expected: 250000, received: 250000 },
    audit: [A(100, 'Đối soát', 'Khớp hoàn toàn', 'green')],
  },

  /* ------------------------------------- 082/083 COD settlement high-level */
  {
    id: 'GHN-VN-992104',
    domain: 'codSettlement',
    status: 'MISMATCH',
    title: 'Vận đơn GHN-VN-992104',
    subtitle: 'Kỳ 01/10–15/10/2026',
    createdAt: nowIso(40),
    assignee: STAFF[1],
    amount: 1450000,
    f: { carrier: 'GHN Express', order: 'ORD-88225', store: 'VinylCraft', declared: 1450000, remitted: 1418000, remittedAt: 'Đã nộp 1 phần' },
    evidence: ['Biên bản GHN (API payload)', 'Sao kê số phụ'],
    audit: [A(40, 'GHN', 'Nộp tiền thu hộ'), A(8, 'Đối soát', 'Lệch 32.000₫', 'danger')],
  },
  {
    id: 'JNT-VN-771203',
    domain: 'codSettlement',
    status: 'AWAITING_REMIT',
    title: 'Vận đơn JNT-VN-771203',
    subtitle: 'Kỳ 01/10–15/10/2026',
    createdAt: nowIso(30),
    amount: 890000,
    f: { carrier: 'J&T Express', order: 'ORD-88219', store: 'VinylCraft', declared: 890000, remitted: 0, remittedAt: 'Chưa nộp' },
    audit: [A(30, 'J&T', 'Giao thành công, thu hộ')],
  },

  /* ---------------------------------------------- 084/085 refund ledger */
  {
    id: 'RFL-99882',
    domain: 'refundLedger',
    status: 'UNKNOWN',
    title: 'Hoàn TXN-REF-99882',
    subtitle: 'Đơn #ORD-88192',
    createdAt: nowIso(6),
    assignee: STAFF[0],
    amount: 1485000,
    f: { customer: 'Vũ Hoàng Minh', store: 'StudioK', reason: 'Hàng vỡ — trọng tài chấp thuận', source: 'Ký quỹ đơn + bảo hiểm GHN', gateway: 'ZaloPay refund', paid: 1485000, refundedBefore: 0 },
    audit: [A(6, STAFF[0], 'Phát lệnh hoàn', 'violet'), A(5, 'ZaloPay', 'Timeout — UNKNOWN', 'orange')],
  },
  {
    id: 'RFL-99701',
    domain: 'refundLedger',
    status: 'SUCCEEDED',
    title: 'Hoàn TXN-REF-99701',
    subtitle: 'Đơn #ORD-87990',
    createdAt: nowIso(150),
    amount: 540000,
    f: { customer: 'Khoa N.', store: 'AstralForge', reason: 'Thất lạc kiện', source: 'Ký quỹ đơn', gateway: 'ZaloPay refund', paid: 540000, refundedBefore: 0 },
    audit: [A(149, 'ZaloPay', 'Hoàn thành công', 'green')],
  },

  /* --------------------------------------------------- 086/087 payouts */
  {
    id: 'TXN-PO-99920',
    domain: 'payout',
    status: 'PENDING_APPROVAL',
    title: 'VinylCraft Studio VN',
    subtitle: 'Ví xưởng WAL-S-0091',
    createdAt: nowIso(5),
    assignee: STAFF[1],
    amount: 12500000,
    f: { bank: 'Vietcombank ****8890 · LE GIA HUY', bankStatus: 'APPROVED', available: 15200000, held: 12500000, gateway: 'Napas' },
    audit: [A(5, 'Xưởng', 'Tạo lệnh rút', 'violet'), A(5, 'Hệ thống', 'Khoá held_balance 12.500.000₫', 'orange')],
  },
  {
    id: 'TXN-PO-99901',
    domain: 'payout',
    status: 'UNKNOWN',
    title: '0xRoboStudio',
    subtitle: 'Ví xưởng WAL-S-0002',
    createdAt: nowIso(30),
    amount: 800000,
    f: { bank: 'Vietcombank ****6789 · NGUYEN VAN AN', bankStatus: 'APPROVED', available: 4790000, held: 800000, gateway: 'Napas' },
    audit: [A(30, 'Napas', 'Timeout', 'orange')],
  },
  {
    id: 'TXN-PO-99850',
    domain: 'payout',
    status: 'COMPLETED',
    title: 'AstralForge',
    subtitle: 'Ví xưởng WAL-S-0009',
    createdAt: nowIso(120),
    amount: 3200000,
    f: { bank: 'MB Bank ****4410 · TRAN MINH TRI', bankStatus: 'APPROVED', available: 900000, held: 0, gateway: 'Napas' },
    audit: [A(118, 'Napas', 'Ghi có thành công', 'green')],
  },
]

/* ------------------------------------- 088/089/090 ledgers & reports */

export const platformLedger = Array.from({ length: 8 }, (_, i) => ({
  id: `led_p_${4500 + i}`,
  wallet: ['WAL-S-0002', 'WAL-S-0091', 'WAL-B-1203', 'WAL-S-0009'][i % 4],
  bucket: (['available', 'pending', 'held', 'available'] as const)[i % 4],
  type: ['Giải ngân doanh thu', 'Ghi nhận doanh thu chờ', 'Tạm giữ tranh chấp', 'Rút tiền', 'Nạp ví', 'Hoàn tiền', 'Phí thuê bao', 'Bù trừ lệch COD'][i],
  amount: [2033000, 874000, 779000, -1500000, 1000000, -540000, -250000, -32000][i],
  balanceAfter: [4790000, 874000, 779000, 2757000, 3790000, 0, 3540000, 618000][i],
  idem: `idem-${(0x7c1a + i * 97).toString(16)}`,
  hash: `sha256:${(0xa91f7c + i * 7919).toString(16)}…`,
  at: nowIso(i * 7 + 1),
}))

export const platformEarnings = Array.from({ length: 7 }, (_, i) => {
  const gross = [920000, 2140000, 820000, 658000, 1450000, 390000, 540000][i]
  return {
    id: `ERN-${88219 - i * 17}`,
    order: `ORD-${88219 - i * 17}`,
    store: ['VinylCraft', 'VinylCraft', '0xRoboStudio', 'WyrmWorks', 'StudioK', '0xRoboStudio', 'AstralForge'][i],
    gross,
    fee: gross * 0.05,
    net: gross * 0.95,
    status: ['LOCKED_72H', 'RELEASED', 'FROZEN', 'RELEASED', 'ELIGIBLE', 'AWAIT_FUNDS', 'RELEASED'][i],
    releaseAt: nowIso(-42 + i * 10),
  }
})

export const commissionRows = Array.from({ length: 8 }, (_, i) => {
  const sub = i >= 6
  const gmv = sub ? 250000 : [920000, 2140000, 658000, 1450000, 390000, 540000][i]
  return {
    id: sub ? `SUB-${88219 - i}` : `COM-${88219 - i * 17}`,
    source: sub ? 'Thuê bao Maker Pro' : 'Hoa hồng đơn POD',
    store: ['VinylCraft', 'VinylCraft', 'WyrmWorks', 'StudioK', '0xRoboStudio', 'AstralForge', '0xRoboStudio', 'VinylCraft'][i],
    gmv,
    rate: sub ? '—' : '5%',
    revenue: sub ? gmv : gmv * 0.05,
    status: ['RECOGNIZED', 'RECOGNIZED', 'DEFERRED', 'RECOGNIZED', 'RECOGNIZED', 'REVERSED', 'RECOGNIZED', 'RECOGNIZED'][i],
  }
})

export const auditLogs = [
  { id: 'log_8923a1ef', at: nowIso(1), actor: 'KDV_NguyenSWD', role: 'STAFF', action: 'REFUND_DECISION', target: 'TXN-REF-99701', reason: 'Bưu cục xác nhận thất lạc kiện, chấp thuận hoàn 100%.', before: { status: 'PENDING' }, after: { status: 'APPROVED', amount: 540000 } },
  { id: 'log_8923a1e0', at: nowIso(3), actor: 'KDV_TranLegal', role: 'STAFF', action: 'PRODUCT_REJECT', target: 'PRD-9945', reason: 'Ảnh render, lưới non-manifold.', before: { status: 'PENDING' }, after: { status: 'REJECTED' } },
  { id: 'log_8923a1d4', at: nowIso(6), actor: 'admin_root', role: 'ADMIN', action: 'ROLE_GRANT', target: 'USR-99214', reason: 'Hồ sơ xưởng VER-8790 đã duyệt.', before: { roles: ['CUSTOMER'] }, after: { roles: ['CUSTOMER', 'SELLER'] } },
  { id: 'log_8923a1c2', at: nowIso(10), actor: 'KDV_PhamAudit', role: 'STAFF', action: 'COD_SETTLE', target: 'ATT-COD-99701', reason: 'Khớp sao kê bưu cục kỳ 10/2026.', before: { settled: false }, after: { settled: true } },
  { id: 'log_8923a1b9', at: nowIso(48), actor: 'KDV_TranLegal', role: 'STAFF', action: 'USER_SUSPEND', target: 'USR-88120', reason: 'Nghi vấn giao dịch ngoài sàn, khoá 7 ngày chờ thẩm tra.', before: { status: 'ACTIVE' }, after: { status: 'SUSPENDED', until: '+7d' } },
  { id: 'log_8923a1a0', at: nowIso(70), actor: 'admin_root', role: 'ADMIN', action: 'CONFIG_UPDATE', target: 'platform_configs.hold_ttl', reason: 'Tăng thời gian giữ chỗ tồn kho lên 15 phút.', before: { hold_ttl: 10 }, after: { hold_ttl: 15 } },
]
