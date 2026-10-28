import { ArrowLeft, FlaskConical, Shield, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { STAFF_DEMO_NOTICE } from '../mocks/staffMockData'

export function StaffHeader({
  title,
  subtitle,
  backTo,
  backLabel,
}: {
  title?: string
  subtitle?: string
  backTo?: string
  backLabel?: string
}) {
  return (
    <div className="mb-6 space-y-3">
      {/* Prototype Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-violet/40 bg-violet-soft/40 px-4 py-2.5 font-label text-xs text-violet">
        <div className="flex items-center gap-2">
          <FlaskConical size={15} className="text-violet" />
          <strong className="font-bold">{STAFF_DEMO_NOTICE}</strong>
          <span className="hidden text-ink-soft sm:inline">
            — Không ghi đè cơ sở dữ liệu thật; thao tác mô phỏng trên bộ nhớ trình duyệt.
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 font-mono text-[11px] font-semibold text-ink shadow-soft">
          <Shield size={12} className="text-orange" /> Role: STAFF / OPERATOR
        </span>
      </div>

      {backTo && (
        <div className="pt-1">
          <Link
            to={backTo}
            className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 font-label text-xs font-semibold text-ink shadow-soft transition hover:bg-white hover:text-violet"
          >
            <ArrowLeft size={14} />
            <span>{backLabel ?? 'Quay lại'}</span>
          </Link>
        </div>
      )}
    </div>
  )
}

