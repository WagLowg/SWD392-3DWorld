import { ArrowLeft, Box, LogOut, Shield, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { logout } from '../../auth/services/session'
import { useSession } from '../../../shared/session/useSession'

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
  const { data: user } = useSession()

  return (
    <div className="mb-6 space-y-3">
      {/* Workspace Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/90 px-4 py-3 shadow-soft backdrop-blur sm:px-5">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet to-[#8b6cff] text-white shadow-soft">
            <Box size={18} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-bold tracking-tight text-ink">
                3D<span className="text-violet">World</span>
              </span>
              <span className="rounded-md bg-violet-soft px-1.5 py-0.5 font-label text-[10px] font-bold uppercase text-violet">
                Staff Workspace
              </span>
            </div>
            {title && <p className="font-display text-base font-bold text-ink">{title}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden items-center gap-2 text-right sm:flex">
              <div>
                <p className="font-label text-xs font-bold text-ink">{user.name}</p>
                <p className="font-mono text-[10px] font-semibold text-teal">Role: PRINT_STAFF</p>
              </div>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-orange text-xs font-bold text-white shadow-soft">
                {user.name?.charAt(0).toUpperCase() ?? 'S'}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => logout('/')}
            className="flex items-center gap-1.5 rounded-full bg-surface-low px-3 py-1.5 font-label text-xs font-semibold text-ink-soft transition hover:bg-danger hover:text-white"
            title="Đăng xuất khỏi hệ thống"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-violet/40 bg-violet-soft/40 px-4 py-2 font-label text-xs text-violet">
        <div className="flex items-center gap-2">
          <Shield size={15} className="text-violet" />
          <strong className="font-bold">Khu vực vận hành nội bộ</strong>
          <span className="hidden text-ink-soft sm:inline">— Thao tác được đồng bộ với API thật của hệ thống.</span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-ink shadow-soft">
          <Shield size={12} className="text-orange" /> Staff workspace
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
