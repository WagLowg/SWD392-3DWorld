import { ArrowRight, Boxes, CreditCard, PackageCheck, Printer, Sparkles, Store, Truck } from 'lucide-react'

const ECOSYSTEM = [
  {
    tag: 'Generative',
    title: 'AI Studio',
    body: 'Tạo mô hình 3D từ ảnh hoặc mô tả bằng AI, sẵn sàng để in.',
    href: '/ai/studio',
    cta: 'Mở AI Studio',
    icon: Sparkles,
    tone: 'bg-violet-soft/70 text-violet',
  },
  {
    tag: 'Workbench',
    title: '3D Studio',
    body: 'Tự dựng và chỉnh sửa mô hình với bộ công cụ 3D trực quan trên trình duyệt.',
    href: '/studio/',
    cta: 'Mở 3D Studio',
    icon: Boxes,
    tone: 'bg-mint/80 text-[#0f5132]',
  },
  {
    tag: 'Fulfillment',
    title: 'Đặt In 3D',
    body: 'Gửi mô hình của bạn, chọn vật liệu và nhận sản phẩm in hoàn thiện tại nhà.',
    href: '/pod/',
    cta: 'Đặt in ngay',
    icon: Printer,
    tone: 'bg-teal-soft/70 text-teal',
  },
] as const

export function EcosystemSection() {
  return (
    <section className="mx-auto mt-24 max-w-[1320px] px-4 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="flex items-center gap-3 font-display text-3xl font-bold tracking-tight">
          <span className="h-2.5 w-2.5 rounded-full bg-violet" /> Hệ Sinh Thái Sáng Tạo & Chế Tác
        </h2>
        <p className="font-label text-xs font-semibold uppercase tracking-widest text-ink-soft">
          Một tài khoản · nhiều công cụ
        </p>
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {ECOSYSTEM.map(({ tag, title, body, href, cta, icon: Icon, tone }) => (
          <a
            key={title}
            href={href}
            className={`group flex flex-col rounded-[2rem] p-7 transition hover:-translate-y-1 hover:shadow-lift ${tone}`}
          >
            <div className="flex items-start justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-white shadow-sm">
                <Icon size={22} />
              </span>
              <span className="rounded-full bg-white/80 px-3 py-1 font-label text-[11px] font-semibold">{tag}</span>
            </div>
            <h3 className="mt-8 font-display text-2xl font-bold text-ink">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
            <span className="mt-6 inline-flex items-center gap-1.5 font-label text-sm font-semibold">
              {cta} <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </span>
          </a>
        ))}
      </div>
    </section>
  )
}

const POLICIES = [
  {
    rule: '01',
    title: 'Chỉ Vật Phẩm Vật Lý',
    body: 'Mọi sản phẩm trên Marketplace là vật thể in 3D thật, không bán file số.',
    icon: PackageCheck,
    tone: 'text-orange',
  },
  {
    rule: '02',
    title: 'Phân Tách Đơn Đa Xưởng',
    body: 'Mỗi cửa hàng tự xử lý và giao phần đơn của mình, bạn theo dõi riêng từng kiện.',
    icon: Store,
    tone: 'text-violet',
  },
  {
    rule: '03',
    title: 'Thanh Toán An Toàn',
    body: 'Thanh toán qua ZaloPay, hỗ trợ yêu cầu hoàn tiền khi đơn có vấn đề.',
    icon: CreditCard,
    tone: 'text-teal',
  },
  {
    rule: '04',
    title: 'Theo Dõi Từng Kiện',
    body: 'Cập nhật hành trình vận chuyển của từng kiện hàng ngay trong tài khoản.',
    icon: Truck,
    tone: 'text-orange',
  },
] as const

export function PolicySection() {
  return (
    <section className="mx-auto mt-16 max-w-[1320px] px-4 md:px-8">
      <div className="rounded-[2.5rem] bg-white p-6 shadow-soft md:p-10">
        <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-violet">
          Kiến trúc giao thức · bảo chứng vật lý
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-tight md:text-3xl">
          Bảo Chứng Vật Phẩm & Giao Nhận 3DWorld
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {POLICIES.map(({ rule, title, body, icon: Icon, tone }) => (
            <div key={rule} className="rounded-[1.75rem] bg-surface-low p-5">
              <div className="flex items-center justify-between">
                <Icon size={20} className={tone} />
                <span className={`font-label text-[11px] font-semibold ${tone}`}>{rule}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
