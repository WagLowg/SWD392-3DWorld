import { nowIso } from '../../../shared/mock/mockApi'
import type { AuditEntry } from '../../../shared/ui/kit'

export type DesignStatus = 'SUBMITTED' | 'QUOTED' | 'IN_PROGRESS' | 'REVIEW' | 'REVISION' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED'

export type QuoteLine = { label: string; amount: number }

export type DesignRequest = {
  id: string
  title: string
  purpose: string
  description: string
  size: string
  formats: string[]
  budget: string
  deadline: string
  status: DesignStatus
  createdAt: string
  customer: string
  engineer?: string
  slaAt: string
  revisionsUsed: number
  revisionsFree: number
  quote?: { version: string; lines: QuoteLine[]; expiresAt: string; deposit: number; scope: string[] }
  messages: { at: string; from: 'customer' | 'engineer' | 'staff'; text: string }[]
  deliverables: { name: string; format: string; size: string }[]
  audit: AuditEntry[]
}

const quote = (lines: QuoteLine[], days = 5) => ({
  version: 'v1.0.0',
  lines,
  expiresAt: nowIso(-24 * days),
  deposit: Math.round(lines.reduce((s, l) => s + l.amount, 0) * 0.5),
  scope: ['Điêu khắc high-poly theo brief', 'Remesh watertight sẵn sàng in', 'Tách khớp nam châm Ø6mm', '2 vòng chỉnh sửa miễn phí'],
})

export const requests: DesignRequest[] = [
  {
    id: 'DS-REQ-2041',
    title: 'Tượng Mascot Robot Gấu Phi Hành Gia (Astro Bear)',
    purpose: 'Art toy sưu tầm',
    description: 'Gấu phi hành gia mũ kính trong, khớp đầu & tay gắn nam châm, cao 130mm, phong cách chibi pastel.',
    size: '130 × 90 × 85 mm',
    formats: ['STL', 'GLB'],
    budget: '1.5M – 3.0M ₫',
    deadline: nowIso(-24 * 10),
    status: 'REVIEW',
    createdAt: nowIso(24 * 6),
    customer: 'Nguyễn Văn An',
    engineer: 'KS_LeMinh',
    slaAt: nowIso(-30),
    revisionsUsed: 0,
    revisionsFree: 2,
    quote: quote([
      { label: 'Điêu khắc nhân vật (base sculpt)', amount: 1_600_000 },
      { label: 'Remesh watertight & kiểm tra in', amount: 450_000 },
      { label: 'Tách khớp nam châm (3 phần rời)', amount: 300_000 },
    ]),
    messages: [
      { at: nowIso(24 * 5), from: 'engineer', text: 'Mình đã nhận brief, dự kiến gửi bản thảo trong 3 ngày.' },
      { at: nowIso(20), from: 'engineer', text: 'Bản thảo v1.0 đã sẵn sàng, bạn xem và góp ý nhé!' },
    ],
    deliverables: [
      { name: 'astro-bear-v1.glb', format: 'GLB', size: '12.4 MB' },
      { name: 'astro-bear-print.stl', format: 'STL', size: '38.1 MB' },
    ],
    audit: [
      { at: nowIso(24 * 6), actor: 'Khách hàng', action: 'Tạo yêu cầu thiết kế', tone: 'violet' },
      { at: nowIso(24 * 5.5), actor: 'Staff', action: 'Gửi báo giá v1.0.0', tone: 'orange' },
      { at: nowIso(24 * 5), actor: 'Khách hàng', action: 'Chấp thuận báo giá & đặt cọc 50%', tone: 'green' },
      { at: nowIso(20), actor: 'KS_LeMinh', action: 'Gửi bản thảo v1.0 chờ nghiệm thu' },
    ],
  },
  {
    id: 'DS-REQ-2040',
    title: 'Vỏ Case Bàn Phím Công Thái Học Alice 65%',
    purpose: 'Phụ kiện kỹ thuật',
    description: 'Case Alice layout 65%, góc nghiêng 6°, lỗ USB-C phía trái, in PETG.',
    size: '330 × 120 × 32 mm',
    formats: ['STEP', 'STL'],
    budget: '3.0M – 6.0M ₫',
    deadline: nowIso(-24 * 14),
    status: 'QUOTED',
    createdAt: nowIso(24 * 2),
    customer: 'Nguyễn Văn An',
    slaAt: nowIso(-48),
    revisionsUsed: 0,
    revisionsFree: 2,
    quote: quote([
      { label: 'Dựng CAD tham số (STEP)', amount: 2_800_000 },
      { label: 'Chia mảnh in & kiểm dung sai', amount: 650_000 },
    ]),
    messages: [],
    deliverables: [],
    audit: [
      { at: nowIso(24 * 2), actor: 'Khách hàng', action: 'Tạo yêu cầu thiết kế', tone: 'violet' },
      { at: nowIso(30), actor: 'Staff', action: 'Gửi báo giá v1.0.0', tone: 'orange' },
    ],
  },
  {
    id: 'DS-REQ-2036',
    title: 'Chibi Cyber Samurai Helmet',
    purpose: 'Cosplay mini',
    description: 'Mũ samurai cyberpunk tỉ lệ 1:6, chi tiết đèn LED.',
    size: '80 × 70 × 75 mm',
    formats: ['STL'],
    budget: 'Dưới 1.5M ₫',
    deadline: nowIso(-24 * 6),
    status: 'REVISION',
    createdAt: nowIso(24 * 12),
    customer: 'Nguyễn Văn An',
    engineer: 'KS_PhamHuy',
    slaAt: nowIso(-12),
    revisionsUsed: 1,
    revisionsFree: 2,
    quote: quote([{ label: 'Điêu khắc mũ & chi tiết LED', amount: 1_200_000 }]),
    messages: [{ at: nowIso(30), from: 'customer', text: 'Tăng độ dày thành mũ lên ≥1.5mm và nới rãnh khớp thêm 0.2mm giúp mình.' }],
    deliverables: [{ name: 'samurai-v1.stl', format: 'STL', size: '21.0 MB' }],
    audit: [{ at: nowIso(30), actor: 'Khách hàng', action: 'Gửi yêu cầu chỉnh sửa vòng 1', tone: 'orange' }],
  },
  {
    id: 'DS-REQ-2029',
    title: 'Chậu Bonsai Tối Giản Trúc Chỉ',
    purpose: 'Decor bàn làm việc',
    description: 'Chậu bonsai vân trúc chỉ, có lỗ thoát nước.',
    size: '140 × 140 × 70 mm',
    formats: ['STL', 'OBJ'],
    budget: 'Dưới 1.5M ₫',
    deadline: nowIso(24 * 2),
    status: 'COMPLETED',
    createdAt: nowIso(24 * 30),
    customer: 'Nguyễn Văn An',
    engineer: 'KS_LeMinh',
    slaAt: nowIso(24 * 20),
    revisionsUsed: 1,
    revisionsFree: 2,
    quote: quote([{ label: 'Dựng mô hình & vân trúc', amount: 900_000 }]),
    messages: [],
    deliverables: [
      { name: 'bonsai-final.stl', format: 'STL', size: '9.8 MB' },
      { name: 'bonsai-source.zip', format: 'ZIP', size: '64.2 MB' },
    ],
    audit: [{ at: nowIso(24 * 18), actor: 'Khách hàng', action: 'Nghiệm thu & đóng gói vào Vault', tone: 'green' }],
  },
  {
    id: 'DS-REQ-2044',
    title: 'Mascot Thương Hiệu Cà Phê “Bean Buddy”',
    purpose: 'Mascot thương hiệu',
    description: 'Hạt cà phê nhân hoá, đội mũ barista, dùng làm quà tặng in resin.',
    size: '90 × 60 × 60 mm',
    formats: ['STL', 'GLB'],
    budget: '1.5M – 3.0M ₫',
    deadline: nowIso(-24 * 12),
    status: 'SUBMITTED',
    createdAt: nowIso(5),
    customer: 'Trần Thu Trang',
    slaAt: nowIso(-19),
    revisionsUsed: 0,
    revisionsFree: 2,
    messages: [],
    deliverables: [],
    audit: [{ at: nowIso(5), actor: 'Khách hàng', action: 'Tạo yêu cầu thiết kế', tone: 'violet' }],
  },
]

export const engineers = [
  { id: 'KS_LeMinh', name: 'Lê Minh', load: 3, capacity: 4, specialty: 'Art toy, nhân vật' },
  { id: 'KS_PhamHuy', name: 'Phạm Huy', load: 2, capacity: 4, specialty: 'Cosplay, cơ khí' },
  { id: 'KS_VoLinh', name: 'Võ Linh', load: 4, capacity: 4, specialty: 'CAD kỹ thuật' },
]

export const pricing = { baseSculpt: 1_200_000, remesh: 150_000, rushPercent: 30 }

export const serviceStatus = { accepting: true, reason: '' as '' | 'QUOTA' | 'MAINTENANCE' }
