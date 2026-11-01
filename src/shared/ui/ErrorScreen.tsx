import {
  ArrowLeft,
  Clock,
  CloudOff,
  Compass,
  Home,
  LifeBuoy,
  LogIn,
  RefreshCw,
  ShieldX,
  Store,
  User,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { ApiClientError } from '../api'
import { goLogin } from '../session/session'

export type ErrorKind = '403' | '404' | '503' | 'session'

type Config = {
  code: string
  eyebrow: string
  title: string
  accent: string
  body: string
  icon: typeof ShieldX
  tone: string
}

const CONFIG: Record<ErrorKind, Config> = {
  '403': {
    code: 'ERR_403_FORBIDDEN',
    eyebrow: 'Mã truy cập 403',
    title: 'Truy Cập Bị Từ Chối —',
    accent: 'Quyền Hạn Không Khả Dụng.',
    body: 'Tài khoản của bạn không có quyền truy cập khu vực này. Khu vực người bán, kiểm duyệt và quản trị yêu cầu được cấp quyền chính thức.',
    icon: ShieldX,
    tone: 'bg-[#ffdad6] text-danger',
  },
  '404': {
    code: 'HTTP 404 Not Found',
    eyebrow: 'Mã lỗi 404',
    title: 'Trang Không Tồn Tại',
    accent: 'Lạc Bước Giữa Thế Giới 3D.',
    body: 'Đường dẫn bạn tìm không tồn tại, đã được chuyển hoặc không còn hoạt động. Đừng lo, giỏ hàng và đơn hàng của bạn vẫn an toàn.',
    icon: Compass,
    tone: 'bg-violet-soft text-violet',
  },
  '503': {
    code: 'ERR_503_SERVICE_UNAVAILABLE',
    eyebrow: 'Dịch vụ tạm gián đoạn',
    title: 'Hệ Thống Đang Bảo Trì',
    accent: 'Quay Lại Trong Ít Phút.',
    body: 'Máy chủ 3DWorld đang tạm thời không phản hồi. Giỏ hàng được lưu theo tài khoản và các giao dịch dùng khoá chống gửi lặp, nên bạn sẽ không bị trừ tiền hai lần.',
    icon: CloudOff,
    tone: 'bg-peach text-orange-deep',
  },
  session: {
    code: 'ERR_401_SESSION_EXPIRED',
    eyebrow: 'Phiên làm việc hết hạn',
    title: 'Phiên Đăng Nhập Đã Hết Hạn',
    accent: 'Đăng Nhập Lại Để Tiếp Tục.',
    body: 'Để bảo vệ tài khoản, phiên đăng nhập đã kết thúc. Đăng nhập lại để quay về đúng trang bạn đang làm việc.',
    icon: Clock,
    tone: 'bg-teal-soft text-teal',
  },
}

/** MP 017 (403) · MP 018 (404) · MP-103 (503) · MP-104 (phiên hết hạn). */
export function ErrorScreen({ kind, detail, onRetry }: { kind: ErrorKind; detail?: string; onRetry?: () => void }) {
  const c = CONFIG[kind]
  const Icon = c.icon
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6 md:px-8">
      <div className="grid items-center gap-10 rounded-[2.5rem] bg-white/90 p-6 shadow-soft md:grid-cols-[1.2fr_1fr] md:p-12">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-surface-low px-3 py-1.5 font-label text-[11px] font-semibold uppercase tracking-widest">
            <span className="h-2 w-2 rounded-full bg-orange" /> {c.eyebrow}
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl">
            {c.title}
            <span className="mt-1 block text-orange">{c.accent}</span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">{detail || c.body}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <PrimaryActions kind={kind} onRetry={onRetry} />
          </div>
        </div>
        <div className="flex flex-col items-center gap-5">
          <div className={`grid h-44 w-44 place-items-center rounded-[3rem] ${c.tone} shadow-lift`}>
            <Icon size={72} strokeWidth={1.4} />
          </div>
          <div className="w-full rounded-2xl bg-surface-low p-4 font-mono text-[11px] text-ink-soft">
            <p>
              Mã: <span className="text-ink">{c.code}</span>
            </p>
            <p className="truncate">URL: {typeof location !== 'undefined' ? location.pathname : ''}</p>
            <p>Múi giờ: Asia/Ho_Chi_Minh (UTC+7)</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {[
          { href: '/marketplace/', label: 'Chợ Đồ Chơi', icon: Store },
          { href: '/portal/profile', label: 'Hồ Sơ Của Tôi', icon: User },
          { href: '/pod/', label: 'Đặt In 3D', icon: LifeBuoy },
          { href: '/', label: 'Trang chủ 3DWorld', icon: Home },
        ].map(({ href, label, icon: I }) => (
          <a
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-2xl bg-white/80 p-4 font-label text-sm font-semibold shadow-soft hover:bg-white"
          >
            <I size={18} className="text-violet" /> {label}
          </a>
        ))}
      </div>
    </div>
  )
}

function PrimaryActions({ kind, onRetry }: { kind: ErrorKind; onRetry?: () => void }) {
  const btn = 'inline-flex items-center gap-2 rounded-full px-5 py-3 font-label text-sm font-semibold'
  const back = (
    <button type="button" onClick={() => history.back()} className={`${btn} bg-surface-low hover:bg-surface-high`}>
      <ArrowLeft size={16} /> Quay lại trang trước
    </button>
  )
  const actions: Record<ErrorKind, ReactNode> = {
    '403': (
      <>
        {back}
        <a href="/portal/profile" className={`${btn} bg-ink text-white hover:bg-violet`}>
          Xem quyền tài khoản
        </a>
      </>
    ),
    '404': (
      <>
        <a href="/" className={`${btn} bg-ink text-white hover:bg-violet`}>
          <Home size={16} /> Về trang chủ
        </a>
        {back}
      </>
    ),
    '503': (
      <>
        <button
          type="button"
          onClick={() => (onRetry ? onRetry() : location.reload())}
          className={`${btn} bg-ink text-white hover:bg-violet`}
        >
          <RefreshCw size={16} /> Thử tải lại
        </button>
        <a href="/marketplace/" className={`${btn} bg-surface-low hover:bg-surface-high`}>
          Quay lại Chợ Đồ Chơi
        </a>
      </>
    ),
    session: (
      <>
        <button type="button" onClick={() => goLogin()} className={`${btn} bg-ink text-white hover:bg-violet`}>
          <LogIn size={16} /> Đăng nhập lại & tiếp tục
        </button>
        <a href="/" className={`${btn} bg-surface-low hover:bg-surface-high`}>
          Huỷ & về trang chủ
        </a>
      </>
    ),
  }
  return <>{actions[kind]}</>
}

/** Đổi lỗi API thành loại màn hình lỗi phù hợp. */
export function errorKindOf(error: unknown): ErrorKind | null {
  if (!(error instanceof ApiClientError)) return null
  if (error.status === 401) return 'session'
  if (error.status === 403 || /do not own|permission/i.test(error.message)) return '403'
  if (error.status === 404) return '404'
  if (error.status === 0 || error.status >= 500) return '503'
  return null
}
