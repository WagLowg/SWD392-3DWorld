import { CheckCircle2, Landmark, Mail, Phone, Upload } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { inputClass } from '../../../shared/ui/form'
import { AuditTimeline, Btn, DetailLayout, Hero, MockNotice, Pill, Section, StatusPill } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import type { SellerApplication } from '../data/seller.fixtures'
import { useApplication, useSubmitApplication } from '../hooks/useSeller'
import { APPLICATION_STATUS } from '../lib/status'

const TECHS = ['Resin SLA', 'Resin DLP', 'FDM PLA', 'FDM PETG', 'Sơn tay thủ công']

/** MP 038 · Đăng Ký & Xác Thực Người Bán */
export function SellerRegisterPage() {
  const app = useApplication()
  useEffect(() => {
    document.title = 'Đăng ký người bán · 3DWorld'
  }, [])
  return (
    <>
      <MockNotice api="/api/seller/applications" />
      <Hero
        code="MP 038"
        eyebrow="Đăng ký người bán"
        title="Đăng Ký Người Bán & Xưởng Chế Tác"
        accent="Xác Thực Danh Tính & Hồ Sơ Gian Hàng."
        description="Hoàn tất xác thực email, số điện thoại, tài khoản ngân hàng và hồ sơ xưởng để được mở gian hàng trên Chợ Đồ Chơi."
      />
      <QueryState isLoading={app.isLoading} error={app.error}>
        {app.data && <ApplicationForm app={app.data} />}
      </QueryState>
    </>
  )
}

function ApplicationForm({ app }: { app: SellerApplication }) {
  const uid = useId()
  const submit = useSubmitApplication()
  const [form, setForm] = useState({
    storefrontName: app.storefrontName,
    description: app.description,
    address: app.address,
    technologies: app.technologies,
  })
  const locked = app.status === 'PENDING' || app.status === 'VERIFIED'
  const valid = form.storefrontName.trim().length >= 3 && form.description.trim().length >= 20 && form.address.trim() && form.technologies.length

  return (
    <DetailLayout
      main={
        <>
          <Section title="Trạng thái hồ sơ" aside={<StatusPill status={app.status} map={APPLICATION_STATUS} />}>
            {app.reviewerNote && app.status === 'NEEDS_INFO' && (
              <p className="rounded-2xl bg-peach/60 p-4 text-sm text-orange-deep">
                <strong>Chuyên viên yêu cầu bổ sung:</strong> {app.reviewerNote}
              </p>
            )}
            {app.status === 'PENDING' && <p className="rounded-2xl bg-violet-soft/50 p-4 text-sm text-violet">Hồ sơ đang chờ chuyên viên xét duyệt (SLA 24–48h).</p>}
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Check icon={Mail} label="Xác thực email" ok={app.emailVerified} />
              <Check icon={Phone} label="Xác thực số điện thoại" ok={app.phoneVerified} />
              <Check icon={Landmark} label="Tài khoản ngân hàng" ok={app.bank?.status === 'APPROVED'} pending={app.bank?.status === 'PENDING'} />
            </div>
          </Section>

          <Section n={1} title="Hồ sơ xưởng & thiết bị chế tác">
            <div className="grid gap-4">
              <label className="block" htmlFor={`${uid}-name`}>
                <span className="mb-1.5 block font-label text-xs font-semibold text-ink-soft">Tên gian hàng / nghệ danh xưởng *</span>
                <input id={`${uid}-name`} disabled={locked} value={form.storefrontName} onChange={(e) => setForm({ ...form, storefrontName: e.target.value })} className={inputClass} />
              </label>
              <label className="block" htmlFor={`${uid}-desc`}>
                <span className="mb-1.5 block font-label text-xs font-semibold text-ink-soft">Giới thiệu năng lực & phong cách chế tác * (≥ 20 ký tự)</span>
                <textarea id={`${uid}-desc`} rows={4} disabled={locked} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
              </label>
              <label className="block" htmlFor={`${uid}-addr`}>
                <span className="mb-1.5 block font-label text-xs font-semibold text-ink-soft">Địa chỉ cơ sở chế tác thực tế *</span>
                <input id={`${uid}-addr`} disabled={locked} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputClass} />
              </label>
              <fieldset>
                <legend className="mb-1.5 font-label text-xs font-semibold text-ink-soft">Công nghệ in chủ đạo *</legend>
                <div className="flex flex-wrap gap-2">
                  {TECHS.map((t) => {
                    const on = form.technologies.includes(t)
                    return (
                      <button
                        key={t}
                        type="button"
                        disabled={locked}
                        aria-pressed={on}
                        onClick={() => setForm({ ...form, technologies: on ? form.technologies.filter((x) => x !== t) : [...form.technologies, t] })}
                        className={`rounded-full px-4 py-2 font-label text-xs font-semibold ${on ? 'bg-violet text-white' : 'bg-surface-low'}`}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            </div>
          </Section>

          <Section n={2} title="Minh chứng xưởng" subtitle="Ảnh khu vực in, máy in, mẫu in thử, giấy phép kinh doanh.">
            <div className="flex flex-wrap gap-2">
              {app.evidence.map((e) => (
                <Pill key={e} tone="teal">
                  {e}
                </Pill>
              ))}
            </div>
            <div className="mt-4 grid place-items-center rounded-2xl border-2 border-dashed border-line p-8 text-sm text-ink-soft">
              <Upload size={22} />
              <span className="mt-2">Tải thêm ảnh minh chứng (chờ API lưu tệp)</span>
            </div>
          </Section>

          {!locked && (
            <div className="flex justify-end">
              <Btn variant="primary" disabled={!valid || submit.isPending} onClick={() => submit.mutate(form)}>
                {app.status === 'NEEDS_INFO' ? 'Nộp lại hồ sơ bổ sung' : 'Nộp hồ sơ xét duyệt'}
              </Btn>
            </div>
          )}
        </>
      }
      aside={
        <>
          <Section title="Quy trình xét duyệt">
            <ol className="space-y-3 text-sm">
              {['Nộp hồ sơ & minh chứng', 'Chuyên viên thẩm định (24–48h)', 'Xác minh tài khoản ngân hàng', 'Mở gian hàng & chọn gói'].map((s, i) => (
                <li key={s} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-soft font-display text-xs font-bold text-violet">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </Section>
          <AuditTimeline entries={app.audit} title="Lịch sử hồ sơ" />
        </>
      }
    />
  )
}

function Check({ icon: Icon, label, ok, pending }: { icon: typeof Mail; label: string; ok: boolean; pending?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-low p-3">
      <span className={`grid h-9 w-9 place-items-center rounded-full ${ok ? 'bg-mint text-[#0f5132]' : 'bg-peach text-orange-deep'}`}>
        {ok ? <CheckCircle2 size={16} /> : <Icon size={16} />}
      </span>
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="text-xs text-ink-soft">{ok ? 'Đã xác thực' : pending ? 'Chờ quản trị duyệt' : 'Chưa xác thực'}</span>
      </span>
    </div>
  )
}
