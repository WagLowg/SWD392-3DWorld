import {
  AlertTriangle,
  ArrowUpDown,
  Ban,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Key,
  Lock,
  Mail,
  Phone,
  Printer,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
  X,
  XCircle,
} from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { inputClass } from '../../../shared/ui/form'
import { QueryState } from '../../../shared/ui/QueryState'
import { useToast } from '../../../shared/ui/toast'
import { type AccountRole, type ApiAccount, adminUsersApi } from '../../ops/services/ops.api'

export type PrimaryRole = 'ADMIN' | 'PRINT_STAFF' | 'SELLER' | 'CUSTOMER'

const ROLE_META: Record<
  PrimaryRole,
  { label: string; icon: typeof Users; color: string; bg: string; border: string; desc: string }
> = {
  ADMIN: {
    label: 'Quản trị viên',
    icon: Shield,
    color: 'text-[#991b1b]',
    bg: 'bg-[#fee2e2]',
    border: 'border-[#fca5a5]',
    desc: 'Quản trị toàn bộ hệ thống & kiểm duyệt',
  },
  PRINT_STAFF: {
    label: 'Nhân viên (Staff)',
    icon: Printer,
    color: 'text-[#92400e]',
    bg: 'bg-[#fef3c7]',
    border: 'border-[#fcd34d]',
    desc: 'Vận hành in 3D, giao nhận & hoàn tiền',
  },
  SELLER: {
    label: 'Chủ xưởng (Seller)',
    icon: UsersRound,
    color: 'text-[#065f46]',
    bg: 'bg-[#d1fae5]',
    border: 'border-[#6ee7b7]',
    desc: 'Gian hàng chế tác 3D kinh doanh trên sàn',
  },
  CUSTOMER: {
    label: 'Khách hàng',
    icon: Users,
    color: 'text-[#374151]',
    bg: 'bg-[#f3f4f6]',
    border: 'border-[#d1d5db]',
    desc: 'Người dùng mua sắm và trải nghiệm dịch vụ',
  },
}

/** Bóc tách vai trò từ grant dạng "ROLE:STATUS" */
function parseGrant(grant: string) {
  const parts = grant.split(':')
  const role = (parts[0] || '').toUpperCase()
  const status = (parts[1] || 'ACTIVE').toUpperCase()
  return { role, status, raw: grant }
}

/** Xác định 1 vai trò chính duy nhất theo thứ tự ưu tiên: ADMIN > PRINT_STAFF > SELLER > CUSTOMER */
export function getPrimaryRole(grants: string[] = []): PrimaryRole {
  const activeRoles = grants
    .map((g) => parseGrant(g))
    .filter((p) => p.status === 'ACTIVE')
    .map((p) => p.role)

  if (activeRoles.includes('ADMIN')) return 'ADMIN'
  if (activeRoles.includes('PRINT_STAFF')) return 'PRINT_STAFF'
  if (activeRoles.includes('SELLER')) return 'SELLER'
  return 'CUSTOMER'
}

export function AdminUsersPage() {
  const qc = useQueryClient()
  const toast = useToast()

  const [term, setTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'' | PrimaryRole>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [verifiedFilter, setVerifiedFilter] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Modals
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [detailUser, setDetailUser] = useState<ApiAccount | null>(null)
  const [statusChangeUser, setStatusChangeUser] = useState<ApiAccount | null>(null)

  useEffect(() => {
    document.title = 'Quản lý tài khoản & Cấp quyền nhân sự · Admin 3DWorld'
  }, [])

  const query = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminUsersApi.list(),
  })

  const users = query.data ?? []

  // Stats calculation based on 1 primary role
  const totalUsers = users.length
  const staffCount = users.filter((u) => getPrimaryRole(u.grants) === 'PRINT_STAFF').length
  const sellerCount = users.filter((u) => getPrimaryRole(u.grants) === 'SELLER').length
  const adminCount = users.filter((u) => getPrimaryRole(u.grants) === 'ADMIN').length
  const activeCount = users.filter((u) => u.status === 'ACTIVE').length
  const lockedCount = users.filter((u) => u.status !== 'ACTIVE').length

  const filteredUsers = useMemo(() => {
    const q = term.trim().toLowerCase()
    return users
      .filter((u) => {
        const primary = getPrimaryRole(u.grants)
        if (roleFilter && primary !== roleFilter) return false
        if (statusFilter && u.status !== statusFilter) return false
        if (verifiedFilter === 'VERIFIED' && !u.emailVerified) return false
        if (verifiedFilter === 'UNVERIFIED' && u.emailVerified) return false
        if (q) {
          const matchId = String(u.id).includes(q) || `usr-${u.id}`.includes(q)
          const matchName = u.fullName.toLowerCase().includes(q)
          const matchEmail = u.email.toLowerCase().includes(q)
          if (!matchId && !matchName && !matchEmail) return false
        }
        return true
      })
      .sort((a, b) => {
        return sortOrder === 'newest' ? b.id - a.id : a.id - b.id
      })
  }, [users, term, roleFilter, statusFilter, verifiedFilter, sortOrder])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pagedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const firstRow = filteredUsers.length ? (currentPage - 1) * pageSize + 1 : 0
  const lastRow = Math.min(currentPage * pageSize, filteredUsers.length)

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-soft px-3 py-1 font-label text-xs font-bold text-violet">
              <UsersRound size={13} /> Quản trị tài khoản & nhân sự
            </span>
            <span className="text-xs text-ink-soft">Danh sách tài khoản toàn hệ thống</span>
          </div>
          <h1 className="mt-2.5 font-display text-3xl font-bold tracking-tight sm:text-4xl text-ink">
            Quản lý tài khoản & Cấp quyền nhân sự
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-soft sm:text-base">
            Cấp tài khoản cho nhân viên và quản trị viên, theo dõi danh sách người dùng toàn sàn và quản lý trạng thái
            hoạt động.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-2.5 font-label text-sm font-semibold shadow-sm transition hover:border-violet disabled:opacity-60"
          >
            <RefreshCw size={15} className={query.isFetching ? 'animate-spin' : ''} />
            Làm mới danh sách
          </button>
          <button
            type="button"
            onClick={() => setCreatingAccount(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet to-[#8069f3] px-5 py-2.5 font-label text-sm font-bold text-white shadow-lift transition hover:opacity-95"
          >
            <UserPlus size={16} />
            Cấp tài khoản mới
          </button>
        </div>
      </header>

      {/* KPI Stats: 4 core roles */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-3xl border border-line bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="font-label text-xs font-bold uppercase tracking-wider text-ink-soft">Tổng người dùng</p>
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-violet-soft text-violet">
              <Users size={17} />
            </span>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-ink">{totalUsers}</p>
          <p className="mt-1 text-xs text-[#0f7050]">
            <strong>{activeCount}</strong> đang hoạt động · {lockedCount} tạm dừng/cấm
          </p>
        </article>

        <article className="rounded-3xl border border-[#fcd34d] bg-[#fffbeb] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="font-label text-xs font-bold uppercase tracking-wider text-[#92400e]">Nhân viên (Staff)</p>
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-[#fef3c7] text-[#92400e]">
              <Printer size={17} />
            </span>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-[#92400e]">{staffCount}</p>
          <p className="mt-1 text-xs text-[#b45309]">Vận hành in & vận chuyển đơn hàng</p>
        </article>

        <article className="rounded-3xl border border-[#6ee7b7] bg-[#ecfdf5] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="font-label text-xs font-bold uppercase tracking-wider text-[#065f46]">Chủ xưởng (Seller)</p>
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-[#d1fae5] text-[#065f46]">
              <UsersRound size={17} />
            </span>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-[#065f46]">{sellerCount}</p>
          <p className="mt-1 text-xs text-[#047857]">Gian hàng chế tác 3D trên sàn</p>
        </article>

        <article className="rounded-3xl border border-[#fca5a5] bg-[#fff1f2] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="font-label text-xs font-bold uppercase tracking-wider text-[#991b1b]">Quản trị viên</p>
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-[#fee2e2] text-[#991b1b]">
              <Shield size={17} />
            </span>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-[#991b1b]">{adminCount}</p>
          <p className="mt-1 text-xs text-[#be123c]">Toàn quyền quản trị hệ thống</p>
        </article>
      </div>

      {/* Friendly Overview Banner */}
      <div className="rounded-3xl border border-violet/20 bg-gradient-to-r from-violet-soft/40 via-peach/20 to-mint/30 p-5">
        <div className="flex items-start gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-violet shadow-sm">
            <UserCheck size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-bold text-ink">Quy định cấp tài khoản nội bộ</h3>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              Quản trị viên có quyền cấp tài khoản trực tiếp cho <strong>Nhân viên (Staff)</strong> để vận hành xưởng
              in hoặc <strong>Quản trị viên (Admin)</strong> mới. Tài khoản được cấp sẽ tự động được ghi nhận vào nhật
              ký kiểm toán (Audit Log) và hệ thống sẽ gửi email kích hoạt đến hộp thư nhân sự.
            </p>
          </div>
        </div>
      </div>

      {/* Main content table container */}
      <section className="rounded-[1.75rem] border border-line bg-white p-5 shadow-sm sm:p-6">
        {/* Filters and search bar */}
        <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(240px,1.5fr)_repeat(3,minmax(160px,1fr))_auto]">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              value={term}
              onChange={(e) => {
                setTerm(e.target.value)
                setPage(1)
              }}
              placeholder="Tìm theo mã (#36), họ tên, email…"
              className="w-full rounded-2xl border border-line bg-[#faf9ff] py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-violet focus:ring-2 focus:ring-violet/10"
            />
          </div>

          <select
            aria-label="Lọc theo vai trò"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as '' | PrimaryRole)
              setPage(1)
            }}
            className="rounded-2xl border border-line bg-[#faf9ff] px-3.5 py-2.5 text-sm font-semibold outline-none transition focus:border-violet"
          >
            <option value="">Tất cả vai trò</option>
            <option value="PRINT_STAFF">🖨️ Nhân viên (Staff)</option>
            <option value="SELLER">🏪 Chủ xưởng (Seller)</option>
            <option value="ADMIN">🛡️ Quản trị viên (Admin)</option>
            <option value="CUSTOMER">👤 Khách hàng (Customer)</option>
          </select>

          <select
            aria-label="Lọc theo trạng thái tài khoản"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="rounded-2xl border border-line bg-[#faf9ff] px-3.5 py-2.5 text-sm font-semibold outline-none transition focus:border-violet"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="LOCKED">Tạm dừng</option>
            <option value="BANNED">Đã cấm</option>
          </select>

          <select
            aria-label="Lọc theo xác thực email"
            value={verifiedFilter}
            onChange={(e) => {
              setVerifiedFilter(e.target.value)
              setPage(1)
            }}
            className="rounded-2xl border border-line bg-[#faf9ff] px-3.5 py-2.5 text-sm font-semibold outline-none transition focus:border-violet"
          >
            <option value="">Tất cả trạng thái email</option>
            <option value="VERIFIED">Đã xác thực email</option>
            <option value="UNVERIFIED">Chưa xác thực email</option>
          </select>

          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-line bg-[#faf9ff] px-4 py-2.5 text-xs font-bold text-ink hover:border-violet"
          >
            <ArrowUpDown size={14} />
            {sortOrder === 'newest' ? 'Mới nhất trước' : 'Cũ nhất trước'}
          </button>
        </div>

        {/* Data Table */}
        <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line/80 font-label text-xs font-bold uppercase tracking-wider text-ink-soft">
                  <th className="pb-3.5 pl-3">Tài khoản</th>
                  <th className="pb-3.5">Vai trò chính</th>
                  <th className="pb-3.5">Trạng thái</th>
                  <th className="pb-3.5">Xác thực email</th>
                  <th className="pb-3.5 text-center">Chi tiết</th>
                  <th className="pb-3.5 pr-3 text-right">Đổi trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {pagedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-ink-soft">
                      Không tìm thấy tài khoản nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  pagedUsers.map((user) => {
                    const primaryRole = getPrimaryRole(user.grants)
                    const meta = ROLE_META[primaryRole]
                    const Icon = meta.icon

                    return (
                      <tr key={user.id} className="transition hover:bg-surface-low/50">
                        <td className="py-3.5 pl-3">
                          <div className="flex items-center gap-3">
                            <span
                              className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl font-display text-sm font-bold text-white shadow-sm ${
                                primaryRole === 'ADMIN'
                                  ? 'bg-[#b91c1c]'
                                  : primaryRole === 'PRINT_STAFF'
                                    ? 'bg-[#d97706]'
                                    : primaryRole === 'SELLER'
                                      ? 'bg-[#059669]'
                                      : 'bg-violet'
                              }`}
                            >
                              {user.fullName.charAt(0).toUpperCase() || 'U'}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-ink">{user.fullName}</span>
                                <span className="rounded-md bg-surface-high px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink-soft">
                                  #{user.id}
                                </span>
                              </div>
                              <p className="text-xs text-ink-soft">{user.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Chỉ 1 vai trò chính duy nhất */}
                        <td className="py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-label text-xs font-bold border ${meta.bg} ${meta.color} ${meta.border}`}
                          >
                            <Icon size={13} />
                            <span>{meta.label}</span>
                          </span>
                        </td>

                        <td className="py-3.5">
                          {user.status === 'ACTIVE' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-[#0f5132]">
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              Hoạt động
                            </span>
                          ) : user.status === 'LOCKED' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-peach px-2.5 py-1 text-xs font-semibold text-orange-deep">
                              <Lock size={12} />
                              Tạm dừng
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffdad6] px-2.5 py-1 text-xs font-semibold text-danger">
                              <Ban size={12} />
                              Đã cấm
                            </span>
                          )}
                        </td>

                        <td className="py-3.5">
                          {user.emailVerified ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0f7050]">
                              <CheckCircle2 size={14} />
                              Đã xác thực
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
                              <XCircle size={14} className="text-orange" />
                              Chưa kích hoạt
                            </span>
                          )}
                        </td>

                        {/* Cột Xem Chi tiết */}
                        <td className="py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => setDetailUser(user)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 font-label text-xs font-bold text-ink transition hover:border-violet hover:text-violet"
                          >
                            <Eye size={13} />
                            Xem chi tiết
                          </button>
                        </td>

                        {/* Cột Đổi trạng thái nhanh */}
                        <td className="py-3.5 pr-3 text-right">
                          <button
                            type="button"
                            onClick={() => setStatusChangeUser(user)}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-label text-xs font-bold transition shadow-sm ${
                              user.status === 'ACTIVE'
                                ? 'bg-surface-low text-ink hover:bg-peach/60 hover:text-orange-deep border border-line'
                                : 'bg-mint text-[#0f5132] border border-mint hover:bg-mint/80'
                            }`}
                          >
                            {user.status === 'ACTIVE' ? <Lock size={13} /> : <Unlock size={13} />}
                            {user.status === 'ACTIVE' ? 'Tạm dừng' : 'Kích hoạt'}
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-4 text-xs text-ink-soft">
            <p>
              Hiển thị <strong>{firstRow}</strong> – <strong>{lastRow}</strong> trên tổng số{' '}
              <strong>{filteredUsers.length}</strong> tài khoản
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-xl border border-line bg-white px-3 py-1.5 font-bold hover:border-violet disabled:opacity-40"
              >
                Trước
              </button>
              <span className="px-2 font-bold text-ink">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-xl border border-line bg-white px-3 py-1.5 font-bold hover:border-violet disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        </QueryState>
      </section>

      {/* Modal Cấp tài khoản mới (Staff hoặc Admin) */}
      {creatingAccount && (
        <CreateAccountModal
          onClose={() => setCreatingAccount(false)}
          onSuccess={() => {
            setCreatingAccount(false)
            qc.invalidateQueries({ queryKey: ['admin', 'users'] })
            toast('Đã cấp tài khoản nội bộ mới thành công và ghi nhận nhật ký kiểm toán!', 'success')
          }}
        />
      )}

      {/* Modal Xem chi tiết tài khoản (Có sẵn bộ đổi trạng thái) */}
      {detailUser && (
        <UserDetailModal
          user={detailUser}
          onClose={() => setDetailUser(null)}
          onSuccess={() => {
            setDetailUser(null)
            qc.invalidateQueries({ queryKey: ['admin', 'users'] })
          }}
        />
      )}

      {/* Modal Thay đổi trạng thái nhanh */}
      {statusChangeUser && (
        <QuickStatusModal
          user={statusChangeUser}
          onClose={() => setStatusChangeUser(null)}
          onSuccess={() => {
            setStatusChangeUser(null)
            qc.invalidateQueries({ queryKey: ['admin', 'users'] })
          }}
        />
      )}
    </div>
  )
}

/** Modal Cấp tài khoản mới: Hỗ trợ cấp Staff hoặc Admin */
function CreateAccountModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const uid = useId()
  const toast = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<'PRINT_STAFF' | 'ADMIN'>('PRINT_STAFF')
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
  })
  const [errorMsg, setErrorMsg] = useState('')

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof adminUsersApi.create>[0]) => adminUsersApi.create(data),
    onSuccess: () => {
      onSuccess()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Không thể tạo tài khoản. Vui lòng kiểm tra lại.'
      setErrorMsg(msg)
      toast(msg, 'error')
    },
  })

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*'
    let pwd = '3DW@'
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setForm((f) => ({ ...f, password: pwd }))
    setShowPassword(true)
  }

  const isValid =
    form.fullName.trim().length >= 3 &&
    /^\S+@\S+\.\S+$/.test(form.email.trim()) &&
    form.password.length >= 8

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || createMutation.isPending) return
    setErrorMsg('')
    createMutation.mutate({
      email: form.email.trim(),
      fullName: form.fullName.trim(),
      password: form.password,
      phone: form.phone.trim() || undefined,
      role: role as AccountRole,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-line sm:p-7 animate-scale-up">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-surface-low text-ink-soft hover:bg-surface-high hover:text-ink"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet to-[#8069f3] text-white shadow-lift">
            <UserPlus size={22} />
          </span>
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Cấp tài khoản nội bộ</h2>
            <p className="text-xs text-ink-soft">Tạo tài khoản Nhân viên (Staff) hoặc Quản trị viên (Admin)</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#ffdad6] p-3 text-xs text-danger font-semibold">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Lựa chọn vai trò cấp: Staff hoặc Admin */}
          <div>
            <label className="block font-label text-xs font-semibold text-ink-soft mb-1.5">
              Chọn vai trò tài khoản *
            </label>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition ${
                  role === 'PRINT_STAFF'
                    ? 'border-[#f59e0b] bg-[#fffbeb] ring-2 ring-[#f59e0b]/20'
                    : 'border-line hover:border-violet/40 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="assignRole"
                  value="PRINT_STAFF"
                  checked={role === 'PRINT_STAFF'}
                  onChange={() => setRole('PRINT_STAFF')}
                  className="mt-0.5 text-violet"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-sm text-[#92400e]">
                    <Printer size={15} />
                    Nhân viên (Staff)
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-ink-soft">
                    Vận hành in 3D, theo dõi đơn xưởng và duyệt hoàn tiền.
                  </p>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition ${
                  role === 'ADMIN'
                    ? 'border-[#f87171] bg-[#fff1f2] ring-2 ring-[#f87171]/20'
                    : 'border-line hover:border-violet/40 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="assignRole"
                  value="ADMIN"
                  checked={role === 'ADMIN'}
                  onChange={() => setRole('ADMIN')}
                  className="mt-0.5 text-violet"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-sm text-[#991b1b]">
                    <Shield size={15} />
                    Quản trị viên (Admin)
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-ink-soft">
                    Toàn quyền quản trị hệ thống, duyệt xưởng & đối soát.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor={`${uid}-name`} className="block font-label text-xs font-semibold text-ink-soft mb-1.5">
              Họ và tên nhân sự *
            </label>
            <input
              id={`${uid}-name`}
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="vd. Hoàng Văn Nam"
              maxLength={255}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor={`${uid}-email`} className="block font-label text-xs font-semibold text-ink-soft mb-1.5">
              Email công vụ nhận thông tin *
            </label>
            <input
              id={`${uid}-email`}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder={role === 'ADMIN' ? 'vd. admin.nam@3dworld.vn' : 'vd. nam.staff@3dworld.vn'}
              maxLength={320}
              required
              className={inputClass}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor={`${uid}-pwd`} className="font-label text-xs font-semibold text-ink-soft">
                  Mật khẩu khởi tạo *
                </label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[11px] font-bold text-violet hover:underline"
                >
                  Tạo ngẫu nhiên
                </button>
              </div>
              <div className="relative">
                <input
                  id={`${uid}-pwd`}
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Tối thiểu 8 ký tự"
                  minLength={8}
                  required
                  className={`${inputClass} pr-9`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor={`${uid}-phone`} className="block font-label text-xs font-semibold text-ink-soft mb-1.5">
                Số điện thoại (tùy chọn)
              </label>
              <input
                id={`${uid}-phone`}
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="vd. 0901234567"
                className={inputClass}
              />
            </div>
          </div>

          <div className="rounded-2xl bg-surface-low p-3.5 text-xs text-ink-soft leading-relaxed border border-line/60">
            Hệ thống sẽ tự động kích hoạt tài khoản, ghi nhận vào nhật ký kiểm toán (Audit Log) và gửi email hướng dẫn đăng nhập đến nhân sự.
          </div>

          <div className="mt-6 flex justify-end gap-2.5 border-t border-line/60 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="rounded-2xl border border-line bg-white px-4 py-2.5 font-label text-sm font-semibold text-ink hover:bg-surface-low"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!isValid || createMutation.isPending}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet to-[#8069f3] px-5 py-2.5 font-label text-sm font-bold text-white shadow-lift transition hover:opacity-95 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Đang cấp tài khoản…' : 'Xác nhận cấp tài khoản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/** Modal Xem chi tiết tài khoản: Hiển thị đầy đủ thông tin + Tích hợp điều chỉnh trạng thái */
function UserDetailModal({ user, onClose, onSuccess }: { user: ApiAccount; onClose: () => void; onSuccess: () => void }) {
  const toast = useToast()
  const primaryRole = getPrimaryRole(user.grants)
  const meta = ROLE_META[primaryRole]
  const Icon = meta.icon

  const [targetStatus, setTargetStatus] = useState<'ACTIVE' | 'LOCKED' | 'BANNED'>(user.status)
  const [statusReason, setStatusReason] = useState('')

  const statusMutation = useMutation({
    mutationFn: ({ status, reason }: { status: 'ACTIVE' | 'LOCKED' | 'BANNED'; reason: string }) =>
      adminUsersApi.setStatus(user.id, status, reason),
    onSuccess: (_, vars) => {
      toast(`Đã chuyển trạng thái tài khoản sang ${vars.status === 'ACTIVE' ? 'Hoạt động' : vars.status === 'LOCKED' ? 'Tạm dừng' : 'Đã cấm'}!`, 'success')
      onSuccess()
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Lỗi khi cập nhật trạng thái', 'error')
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl border border-line sm:p-7 animate-scale-up">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-surface-low text-ink-soft hover:bg-surface-high hover:text-ink"
        >
          <X size={18} />
        </button>

        {/* User Card Header */}
        <div className="flex items-start gap-4 border-b border-line pb-5">
          <span
            className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl font-display text-xl font-bold text-white shadow-sm ${
              primaryRole === 'ADMIN'
                ? 'bg-[#b91c1c]'
                : primaryRole === 'PRINT_STAFF'
                  ? 'bg-[#d97706]'
                  : primaryRole === 'SELLER'
                    ? 'bg-[#059669]'
                    : 'bg-violet'
            }`}
          >
            {user.fullName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-xl font-bold text-ink">{user.fullName}</h3>
              <span className="rounded-md bg-surface-high px-2 py-0.5 font-mono text-xs font-bold text-ink-soft">
                USR-{user.id}
              </span>
            </div>
            <p className="text-xs text-ink-soft mt-0.5">{user.email}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-label text-xs font-bold border ${meta.bg} ${meta.color} ${meta.border}`}
              >
                <Icon size={13} />
                <span>{meta.label}</span>
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  user.status === 'ACTIVE'
                    ? 'bg-mint text-[#0f5132]'
                    : user.status === 'LOCKED'
                      ? 'bg-peach text-orange-deep'
                      : 'bg-[#ffdad6] text-danger'
                }`}
              >
                {user.status === 'ACTIVE' ? 'Đang hoạt động' : user.status === 'LOCKED' ? 'Tạm dừng' : 'Đã cấm'}
              </span>
            </div>
          </div>
        </div>

        {/* Thông tin chi tiết */}
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <div className="rounded-2xl bg-surface-low p-3.5 border border-line/60">
              <span className="font-semibold text-ink-soft block mb-1">Mã định danh người dùng:</span>
              <span className="font-mono font-bold text-sm text-ink">#{user.id}</span>
            </div>
            <div className="rounded-2xl bg-surface-low p-3.5 border border-line/60">
              <span className="font-semibold text-ink-soft block mb-1">Tình trạng xác thực email:</span>
              <span className={user.emailVerified ? 'font-bold text-[#0f7050]' : 'font-bold text-orange'}>
                {user.emailVerified ? '✓ Đã xác thực thành công' : '⚠ Chưa kích hoạt email'}
              </span>
            </div>
          </div>

          {/* Khu vực thay đổi trạng thái tài khoản */}
          <div className="rounded-2xl border border-line bg-[#faf9ff] p-4 space-y-3">
            <h4 className="font-display text-sm font-bold text-ink flex items-center gap-1.5">
              <Lock size={15} className="text-violet" />
              Điều chỉnh trạng thái tài khoản
            </h4>

            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { value: 'ACTIVE' as const, label: 'Hoạt động', desc: 'Đầy đủ quyền truy cập', icon: CheckCircle2, color: 'text-[#0f5132]' },
                { value: 'LOCKED' as const, label: 'Tạm dừng', desc: 'Khóa đăng nhập tạm thời', icon: Lock, color: 'text-orange-deep' },
                { value: 'BANNED' as const, label: 'Cấm tài khoản', desc: 'Chặn hoàn toàn', icon: Ban, color: 'text-danger' },
              ].map((s) => (
                <label
                  key={s.value}
                  className={`flex cursor-pointer flex-col rounded-xl border p-3 transition ${
                    targetStatus === s.value
                      ? 'border-violet bg-white ring-2 ring-violet/20 shadow-sm'
                      : 'border-line/70 hover:border-violet/40 bg-white/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <s.icon size={15} className={s.color} />
                    <input
                      type="radio"
                      name="detailAccountStatus"
                      value={s.value}
                      checked={targetStatus === s.value}
                      onChange={() => setTargetStatus(s.value)}
                      className="text-violet"
                    />
                  </div>
                  <span className="mt-1.5 font-bold text-xs text-ink">{s.label}</span>
                  <span className="text-[10px] text-ink-soft">{s.desc}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="block font-label text-xs font-semibold text-ink-soft mb-1">
                Lý do thay đổi trạng thái (bắt buộc ghi nhận kiểm toán) *
              </label>
              <input
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="vd. Nghi vấn vi phạm bảo mật / Đã xác minh giải quyết xong khiếu nại..."
                className={inputClass}
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                disabled={!statusReason.trim() || targetStatus === user.status || statusMutation.isPending}
                onClick={() => statusMutation.mutate({ status: targetStatus, reason: statusReason.trim() })}
                className="rounded-xl bg-ink px-4 py-2 font-label text-xs font-bold text-white hover:bg-violet disabled:opacity-40 transition"
              >
                {statusMutation.isPending ? 'Đang lưu…' : 'Lưu trạng thái mới'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-line/60 pt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-line bg-white px-5 py-2 font-label text-xs font-bold text-ink hover:bg-surface-low"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

/** Modal Đổi trạng thái nhanh từ nút bấm ngoài bảng */
function QuickStatusModal({ user, onClose, onSuccess }: { user: ApiAccount; onClose: () => void; onSuccess: () => void }) {
  const toast = useToast()
  const [targetStatus, setTargetStatus] = useState<'ACTIVE' | 'LOCKED' | 'BANNED'>(
    user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE',
  )
  const [statusReason, setStatusReason] = useState('')

  const statusMutation = useMutation({
    mutationFn: ({ status, reason }: { status: 'ACTIVE' | 'LOCKED' | 'BANNED'; reason: string }) =>
      adminUsersApi.setStatus(user.id, status, reason),
    onSuccess: (_, vars) => {
      toast(`Đã cập nhật trạng thái tài khoản sang ${vars.status === 'ACTIVE' ? 'Hoạt động' : vars.status === 'LOCKED' ? 'Tạm dừng' : 'Đã cấm'}!`, 'success')
      onSuccess()
    },
    onError: (err: unknown) => {
      toast(err instanceof Error ? err.message : 'Lỗi khi cập nhật trạng thái', 'error')
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-line sm:p-7 animate-scale-up">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-surface-low text-ink-soft hover:bg-surface-high hover:text-ink"
        >
          <X size={18} />
        </button>

        <h3 className="font-display text-lg font-bold text-ink">Thay đổi trạng thái tài khoản</h3>
        <p className="mt-1 text-xs text-ink-soft">
          Người dùng: <strong>{user.fullName}</strong> (#{user.id})
        </p>

        <div className="mt-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { value: 'ACTIVE' as const, label: 'Hoạt động', color: 'text-[#0f5132]' },
              { value: 'LOCKED' as const, label: 'Tạm dừng', color: 'text-orange-deep' },
              { value: 'BANNED' as const, label: 'Đã cấm', color: 'text-danger' },
            ].map((s) => (
              <label
                key={s.value}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border p-2.5 text-center transition ${
                  targetStatus === s.value
                    ? 'border-violet bg-violet-soft/30 ring-2 ring-violet/20 font-bold'
                    : 'border-line hover:border-violet/40 bg-white text-ink-soft'
                }`}
              >
                <input
                  type="radio"
                  name="quickStatus"
                  value={s.value}
                  checked={targetStatus === s.value}
                  onChange={() => setTargetStatus(s.value)}
                  className="sr-only"
                />
                <span className={`text-xs ${s.color}`}>{s.label}</span>
              </label>
            ))}
          </div>

          <div>
            <label className="block font-label text-xs font-semibold text-ink-soft mb-1">
              Lý do thay đổi (bắt buộc) *
            </label>
            <input
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="Nhập lý do thay đổi trạng thái..."
              className={inputClass}
            />
          </div>

          <div className="mt-5 flex justify-end gap-2 border-t border-line/60 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line bg-white px-4 py-2 font-label text-xs font-semibold text-ink hover:bg-surface-low"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={!statusReason.trim() || targetStatus === user.status || statusMutation.isPending}
              onClick={() => statusMutation.mutate({ status: targetStatus, reason: statusReason.trim() })}
              className="rounded-xl bg-ink px-4 py-2 font-label text-xs font-bold text-white hover:bg-violet disabled:opacity-40 transition"
            >
              {statusMutation.isPending ? 'Đang lưu…' : 'Xác nhận thay đổi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
