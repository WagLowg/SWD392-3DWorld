import { Download, Fingerprint, ShieldCheck, UserPlus } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatDateTime } from '../../../shared/format'
import { inputClass } from '../../../shared/ui/form'
import {
  Btn,
  CellTitle,
  DataTable,
  DetailLayout,
  Hero,
  KeyValues,
  MockNotice,
  Pill,
  RuleBox,
  Section,
} from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { useToast } from '../../../shared/ui/toast'
import { OpsQueue, OpsReview, statusColumn, val } from '../components/OpsScaffold'
import { opsKeys, useAuditEntry, useAuditLogs } from '../hooks/useOps'
import { ACCOUNT_ROLES, type AccountRole, adminUsersApi } from '../services/ops.api'
import { useMockAction } from '../../../shared/mock/useMockAction'

/** MP 074 · Quản Trị Người Dùng & Phân Quyền */
export function UsersAdminPage() {
  const [creating, setCreating] = useState(false)
  return (
    <>
      <OpsQueue
        domain="user"
        code="MP 074"
        eyebrow="Người dùng & phân quyền"
        title="Quản Trị Người Dùng & Phân Quyền"
        accent="Vai Trò, Trạng Thái & eKYC."
        api="GET /api/admin/users"
        search="Tìm theo mã, tên, email"
        columns={[
          {
            key: 'id',
            header: 'Tài khoản',
            render: (c) => <CellTitle title={c.title} sub={`${c.id} · ${c.subtitle}`} to={`/ops/users/${c.id}`} />,
          },
          {
            key: 'r',
            header: 'Vai trò (user_roles)',
            render: (c) => (
              <div className="flex flex-wrap gap-1">
                {String(c.f.roles)
                  .split(', ')
                  .map((r) => (
                    <Pill key={r} tone="violet">
                      {r}
                    </Pill>
                  ))}
              </div>
            ),
          },
          { key: 'k', header: 'eKYC', render: (c) => val(c, 'kyc') },
          statusColumn('user'),
          {
            key: 't',
            header: 'Gia nhập',
            render: (c) => <span className="text-xs">{c.createdAt ? formatDateTime(c.createdAt) : '—'}</span>,
          },
          {
            key: 'x',
            header: '',
            render: (c) => (
              <Btn to={`/ops/users/${c.id}`} size="sm">
                Quản trị
              </Btn>
            ),
          },
        ]}
      />
      <div className="mt-6">
        {creating ? (
          <CreateStaffForm onClose={() => setCreating(false)} />
        ) : (
          <Btn icon={UserPlus} variant="primary" onClick={() => setCreating(true)}>
            Thêm tài khoản chuyên viên
          </Btn>
        )}
      </div>
    </>
  )
}
function CreateStaffForm({ onClose }: { onClose: () => void }) {
  const uid = useId()
  const create = useMockAction(
    (input: Parameters<typeof adminUsersApi.create>[0]) => adminUsersApi.create(input),
    [opsKeys.all],
    (a: { email: string }) => `Đã tạo tài khoản ${a.email} — email xác thực đã được gửi.`,
  )
  const [f, setF] = useState({ name: '', email: '', role: 'PRINT_STAFF' as AccountRole, password: '', phone: '' })
  const ok = f.name.trim().length >= 3 && /^\S+@\S+\.\S+$/.test(f.email) && f.password.length >= 8
  return (
    <Section title="Tạo tài khoản chuyên viên nội bộ">
      <div className="grid gap-3 sm:grid-cols-2">
        <label htmlFor={`${uid}-n`} className="block">
          <span className="mb-1 block font-label text-xs font-semibold text-ink-soft">Họ và tên nhân sự</span>
          <input
            id={`${uid}-n`}
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            className={inputClass}
          />
        </label>
        <label htmlFor={`${uid}-e`} className="block">
          <span className="mb-1 block font-label text-xs font-semibold text-ink-soft">Email</span>
          <input
            id={`${uid}-e`}
            value={f.email}
            onChange={(e) => setF({ ...f, email: e.target.value })}
            className={inputClass}
          />
        </label>
        <label htmlFor={`${uid}-r`} className="block">
          <span className="mb-1 block font-label text-xs font-semibold text-ink-soft">Nhóm quyền</span>
          <select
            id={`${uid}-r`}
            value={f.role}
            onChange={(e) => setF({ ...f, role: e.target.value as AccountRole })}
            className={inputClass}
          >
            {(['PRINT_STAFF', 'DESIGNER'] as const).map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label htmlFor={`${uid}-pw`} className="block">
          <span className="mb-1 block font-label text-xs font-semibold text-ink-soft">Mật khẩu tạm (≥ 8 ký tự)</span>
          <input
            id={`${uid}-pw`}
            type="password"
            autoComplete="new-password"
            value={f.password}
            onChange={(e) => setF({ ...f, password: e.target.value })}
            className={inputClass}
          />
        </label>
        <label htmlFor={`${uid}-ph`} className="block">
          <span className="mb-1 block font-label text-xs font-semibold text-ink-soft">Số điện thoại (tuỳ chọn)</span>
          <input
            id={`${uid}-ph`}
            inputMode="tel"
            value={f.phone}
            onChange={(e) => setF({ ...f, phone: e.target.value })}
            className={inputClass}
          />
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Btn onClick={onClose}>Huỷ</Btn>
        <Btn
          variant="primary"
          disabled={!ok || create.isPending}
          onClick={() =>
            create.mutate(
              {
                email: f.email.trim(),
                fullName: f.name.trim(),
                password: f.password,
                phone: f.phone.trim() || undefined,
                role: f.role,
              },
              { onSuccess: onClose },
            )
          }
        >
          Kích hoạt & cấp mã nhân sự
        </Btn>
      </div>
    </Section>
  )
}

/** Cấp / thu hồi vai trò — PUT /api/admin/users/{id}/roles/{role}. */
function RolePanel({ userId, roles }: { userId: number; roles: string[] }) {
  const [reason, setReason] = useState('')
  const setRole = useMockAction(
    ({ role, active }: { role: AccountRole; active: boolean }) => adminUsersApi.setRole(userId, role, active, reason.trim()),
    [opsKeys.all],
    'Đã cập nhật vai trò — phiên đăng nhập của người dùng bị thu hồi.',
  )
  return (
    <Section n={3} title="Cấp / thu hồi vai trò">
      <input
        aria-label="Lý do thay đổi vai trò"
        placeholder="Lý do (bắt buộc)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className={inputClass}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {ACCOUNT_ROLES.map((r) => {
          const has = roles.includes(r)
          return (
            <Btn
              key={r}
              size="sm"
              variant={has ? 'soft' : 'white'}
              disabled={!reason.trim() || setRole.isPending}
              onClick={() => setRole.mutate({ role: r, active: !has })}
            >
              {has ? `Thu hồi ${r}` : `Cấp ${r}`}
            </Btn>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-ink-soft">SELLER chỉ cấp được khi gian hàng đã trả phí và đang hoạt động.</p>
    </Section>
  )
}

/** Xác thực SĐT thủ công (sandbox) — PATCH /api/admin/users/{id}/phone-verification. */
function PhonePanel({ userId }: { userId: number }) {
  const uid = useId()
  const [f, setF] = useState({ phone: '', evidence: '', reason: '' })
  const review = useMockAction(
    (approved: boolean) =>
      adminUsersApi.reviewPhone(userId, {
        phone: f.phone.trim(),
        approved,
        evidenceReference: f.evidence.trim(),
        reason: f.reason.trim(),
      }),
    [opsKeys.all],
    'Đã ghi nhận kết quả xác thực số điện thoại.',
  )
  const ok = f.phone.trim() && f.evidence.trim() && f.reason.trim()
  return (
    <Section n={4} title="Xác thực số điện thoại (thủ công)">
      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ['phone', 'Số điện thoại hiện tại'],
            ['evidence', 'Minh chứng (vd. ảnh chụp cuộc gọi)'],
            ['reason', 'Lý do'],
          ] as const
        ).map(([k, label]) => (
          <label key={k} htmlFor={`${uid}-${k}`} className="block">
            <span className="mb-1 block font-label text-xs font-semibold text-ink-soft">{label}</span>
            <input
              id={`${uid}-${k}`}
              value={f[k]}
              onChange={(e) => setF({ ...f, [k]: e.target.value })}
              className={inputClass}
            />
          </label>
        ))}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Btn size="sm" disabled={!ok || review.isPending} onClick={() => review.mutate(false)}>
          Không xác thực
        </Btn>
        <Btn size="sm" variant="primary" disabled={!ok || review.isPending} onClick={() => review.mutate(true)}>
          Xác thực số điện thoại
        </Btn>
      </div>
    </Section>
  )
}

/** MP 075 · Chi Tiết Người Dùng & Phân Quyền */
export function UserAdminDetailPage() {
  const id = useParams().caseId ?? ''
  return (
    <OpsReview
      domain="user"
      id={id}
      code="MP 075"
      eyebrow="Hồ sơ người dùng"
      titlePrefix="Người dùng"
      api="PATCH /api/admin/users/{id}/status"
      main={(c) => (
        <>
          <Section n={1} title="Định danh & trạng thái xác thực">
            <KeyValues
              cols={3}
              items={[
                { label: 'Email', value: c.subtitle },
                { label: 'eKYC', value: val(c, 'kyc') },
                { label: 'Mã tài khoản', value: `#${c.id}` },
              ]}
            />
          </Section>
          <Section n={2} title="Vai trò được phân quyền">
            <div className="flex flex-wrap gap-2">
              {String(c.f.roles)
                .split(', ')
                .map((r) => (
                  <Pill key={r} tone="violet">
                    {r}
                  </Pill>
                ))}
            </div>
          </Section>
          <RolePanel userId={Number(c.id)} roles={String(c.f.roles).split(', ')} />
          <PhonePanel userId={Number(c.id)} />
        </>
      )}
      decisions={[
        { value: 'activate', label: 'Mở khoá / kích hoạt', status: 'ACTIVE' },
        { value: 'suspend', label: 'Tạm khoá tài khoản (LOCKED)', status: 'SUSPENDED', tone: 'danger' },
        {
          value: 'ban',
          label: 'Cấm vĩnh viễn',
          status: 'BANNED',
          tone: 'danger',
          hint: 'Thu hồi mọi phiên, đóng băng ví và gỡ niêm yết của tài khoản.',
        },
      ]}
      checklist={['Đã xem lịch sử vi phạm & giao dịch', 'Đã thông báo cho người dùng']}
    />
  )
}

/** MP-093 · Nhật Ký Kiểm Toán */
export function AuditLogPage() {
  const q = useAuditLogs()
  const [term, setTerm] = useState('')
  useEffect(() => {
    document.title = 'Nhật ký kiểm toán · Ops 3DWorld'
  }, [])
  const rows = (q.data ?? []).filter(
    (l) => !term || `${l.actor} ${l.action} ${l.target} ${l.reason}`.toLowerCase().includes(term.toLowerCase()),
  )
  return (
    <>
      <MockNotice api="GET /api/admin/audit-logs" />
      <Hero
        code="MP-093"
        eyebrow="Nhật ký kiểm toán"
        title="Nhật Ký Kiểm Toán"
        accent="Tra Cứu & Minh Bạch Hệ Thống."
        actions={
          <Btn variant="white" icon={Download}>
            Xuất CSV mã hoá
          </Btn>
        }
      />
      <div className="mt-6">
        <input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Lọc theo người thực hiện, hành động, đối tượng, lý do…"
          aria-label="Lọc nhật ký"
          className="h-12 w-full rounded-full bg-white px-5 text-sm shadow-soft outline-none focus:ring-2 focus:ring-violet/40"
        />
      </div>
      <QueryState isLoading={q.isLoading} error={q.error}>
        <DataTable
          rows={rows}
          rowKey={(l) => l.id}
          columns={[
            {
              key: 'id',
              header: 'Mã log & thời gian',
              render: (l) => <CellTitle title={l.id} sub={formatDateTime(l.at)} to={`/ops/audit/${l.id}`} />,
            },
            { key: 'a', header: 'Người thực hiện', render: (l) => <CellTitle title={l.actor} sub={l.role} /> },
            { key: 'ac', header: 'Hành động', render: (l) => <code className="text-xs">{l.action}</code> },
            { key: 't', header: 'Đối tượng', render: (l) => <code className="text-xs">{l.target}</code> },
            {
              key: 'r',
              header: 'Lý do',
              render: (l) => <span className="block max-w-[20rem] text-xs text-ink-soft">{l.reason}</span>,
            },
            {
              key: 'x',
              header: '',
              render: (l) => (
                <Btn to={`/ops/audit/${l.id}`} size="sm">
                  Chi tiết
                </Btn>
              ),
            },
          ]}
        />
      </QueryState>
      <RuleBox
        title="Kiến trúc nhật ký bất biến"
        rules={[
          'Chỉ ghi thêm, không sửa / xoá.',
          'Mỗi bản ghi lưu lý do bắt buộc và metadata trước/sau.',
          'Chuỗi băm SHA-256 phát hiện chỉnh sửa trái phép.',
          'Truy cập nhật ký cũng được ghi log.',
        ]}
      />
    </>
  )
}

/** MP-094 · Chi Tiết Nhật Ký Kiểm Toán */
export function AuditEntryPage() {
  const id = useParams().logId ?? ''
  const q = useAuditEntry(id)
  const toast = useToast()
  return (
    <>
      <MockNotice api="GET /api/admin/audit-logs/{id}" />
      <QueryState isLoading={q.isLoading} error={q.error}>
        {q.data && (
          <>
            <Hero code="MP-094" eyebrow="Bản ghi kiểm toán" title={`#${q.data.id}`} accent={q.data.action} />
            <DetailLayout
              main={
                <>
                  <Section title="Thao tác & người thực hiện">
                    <KeyValues
                      cols={3}
                      items={[
                        { label: 'Người thực hiện', value: `${q.data.actor} (${q.data.role})` },
                        { label: 'Đối tượng', value: q.data.target },
                        { label: 'Thời điểm', value: formatDateTime(q.data.at) },
                      ]}
                    />
                  </Section>
                  <Section title="Lý do & căn cứ">
                    <p className="rounded-2xl bg-surface-low p-4 text-sm">{q.data.reason}</p>
                  </Section>
                  <Section title="So sánh dữ liệu trước & sau">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <pre className="overflow-auto rounded-2xl bg-[#ffdad6]/60 p-4 font-mono text-xs">
                        {JSON.stringify(q.data.before, null, 2)}
                      </pre>
                      <pre className="overflow-auto rounded-2xl bg-mint/70 p-4 font-mono text-xs">
                        {JSON.stringify(q.data.after, null, 2)}
                      </pre>
                    </div>
                  </Section>
                </>
              }
              aside={
                <Section title="Chuỗi khối kiểm toán">
                  <p className="flex items-center gap-2 font-mono text-xs">
                    <Fingerprint size={14} /> sha256:{q.data.id.slice(4)}…
                  </p>
                  <div className="mt-3 grid gap-2">
                    <Btn icon={ShieldCheck} onClick={() => toast('Chữ ký hợp lệ — chuỗi băm khớp (mô phỏng).')}>
                      Xác minh chữ ký SHA-256
                    </Btn>
                    <Link to="/ops/audit" className="text-center font-label text-xs font-semibold text-violet">
                      ← Nhật ký kiểm toán
                    </Link>
                  </div>
                </Section>
              }
            />
          </>
        )}
      </QueryState>
    </>
  )
}
