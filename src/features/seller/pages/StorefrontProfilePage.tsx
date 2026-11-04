import { ArrowRight, CalendarClock, CreditCard, Eye, Pencil, Save, ShieldCheck, Sparkles, Store, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../../account/hooks/useAccount'
import { getRegisteredStorefront } from '../services/sellerSubmissionStorage'
import { formatDate } from '../../../shared/lib/format'
import { inputClass } from '../../../shared/ui/form'
import { Btn, DetailLayout, Hero, KeyValues, Section, StatusPill } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import type { Storefront } from '../data/seller.fixtures'
import { useApplication, useCreateStorefront, useStorefront, useUpdateStorefront } from '../hooks/useSeller'
import { STOREFRONT_STATUS } from '../lib/status'

/** MP 040 · Hồ Sơ Gian Hàng — GET/PATCH /api/storefronts/me, POST /api/storefronts */
export function StorefrontProfilePage() {
  const q = useStorefront()
  const app = useApplication()
  const profile = useProfile()
  useEffect(() => {
    document.title = 'Hồ sơ gian hàng · 3DWorld'
  }, [])
  return (
    <>
      <Hero code="MP 040" eyebrow="Gian hàng" title="Hồ Sơ Gian Hàng" accent="Nhận Diện Xưởng Trên Chợ Đồ Chơi." />
      <QueryState isLoading={q.isLoading || app.isLoading} error={q.error}>
        {q.data ? (
          <Editor store={q.data} />
        ) : (
          q.isSuccess && <CreateForm application={app.data} profileName={profile.data?.fullName} />
        )}
      </QueryState>
    </>
  )
}

function CreateForm({
  application,
  profileName,
}: {
  application?: import('../data/seller.fixtures').SellerApplication
  profileName?: string
}) {
  const uid = useId()
  const navigate = useNavigate()
  const create = useCreateStorefront()

  const userId =
    application?.userId ??
    (application?.id ? Number(application.id.replace(/\D/g, '')) : undefined)
  const saved = getRegisteredStorefront(userId)

  const candidateName =
    application?.storefrontName?.trim() ||
    saved?.name?.trim() ||
    (profileName ? `Xưởng ${profileName.trim()}` : '') ||
    ''

  const candidateDescription =
    application?.description?.trim() ||
    saved?.description?.trim() ||
    'Chuyên chế tác mô hình đồ chơi và sản phẩm in 3D cá nhân hóa chất lượng cao.'

  const [form, setForm] = useState({
    name: candidateName,
    description: candidateDescription,
  })

  // Đồng bộ tức thời khi application hoặc profile hoàn tất tải
  useEffect(() => {
    if (!form.name && candidateName) {
      setForm((prev) => ({ ...prev, name: candidateName }))
    }
    if (!form.description && candidateDescription) {
      setForm((prev) => ({ ...prev, description: candidateDescription }))
    }
  }, [candidateName, candidateDescription, form.name, form.description])

  const handleCreate = (redirectToSubscription = true) => {
    const trimmedName = form.name.trim()
    const trimmedDesc = form.description.trim() || undefined
    create.mutate(
      { name: trimmedName, description: trimmedDesc },
      {
        onSuccess: () => {
          if (redirectToSubscription) {
            navigate('/seller/subscription')
          }
        },
      },
    )
  }

  const isAutoPrefilled = Boolean(candidateName && candidateName === form.name)

  return (
    <Section
      title="Tạo gian hàng"
      className="mt-6"
      aside={
        isAutoPrefilled ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3 py-1 font-label text-xs font-semibold text-[#0f5132]">
            <Sparkles size={13} /> Đã điền từ hồ sơ đăng ký
          </span>
        ) : null
      }
    >
      {isAutoPrefilled ? (
        <div className="mb-4 rounded-2xl border border-mint bg-mint/30 p-4 text-sm text-[#0f5132]">
          <div className="flex items-start gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-emerald-600 shadow-sm">
              <Sparkles size={16} />
            </span>
            <div>
              <p className="font-semibold">Hồ sơ xưởng đã được lưu tự động từ đơn đăng ký của bạn</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[#0f5132]/85">
                Tên gian hàng và phần giới thiệu năng lực chế tác đã được hệ thống giữ lại nguyên vẹn sau khi Admin duyệt hồ sơ.
                Bạn có thể giữ nguyên hoặc chỉnh sửa nhanh, sau đó bấm <strong>Tạo gian hàng & Đến mua gói</strong> để kích hoạt kinh doanh ngay.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink-soft">
          Tài khoản chưa có gian hàng. Bạn cần được duyệt xác thực người bán trước; gian hàng mới tạo ở trạng thái chưa
          kích hoạt cho tới khi thanh toán gói thuê bao.
        </p>
      )}

      <div className="mt-4 grid gap-4">
        <label htmlFor={`${uid}-n`} className="block">
          <span className="mb-1.5 block font-label text-xs font-semibold text-ink-soft">
            Tên gian hàng *
          </span>
          <input
            id={`${uid}-n`}
            value={form.name}
            maxLength={255}
            placeholder="vd. Xưởng In 3D Chế Tác..."
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
          />
          <span className="mt-1 block text-right font-label text-[11px] text-ink-soft">
            {form.name.length}/255 ký tự
          </span>
        </label>
        <label htmlFor={`${uid}-d`} className="block">
          <span className="mb-1.5 block font-label text-xs font-semibold text-ink-soft">
            Giới thiệu xưởng & phong cách chế tác
          </span>
          <textarea
            id={`${uid}-d`}
            rows={4}
            value={form.description}
            placeholder="Giới thiệu phong cách sản phẩm, công nghệ in nổi bật và cam kết chất lượng..."
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass}
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-4">
        <Btn to="/seller/register" variant="white">
          Xem hồ sơ xác thực
        </Btn>
        <div className="flex flex-wrap gap-2">
          <Btn
            variant="white"
            disabled={form.name.trim().length < 3 || create.isPending}
            onClick={() => handleCreate(false)}
          >
            Chỉ tạo gian hàng
          </Btn>
          <Btn
            variant="primary"
            icon={ArrowRight}
            disabled={form.name.trim().length < 3 || create.isPending}
            onClick={() => handleCreate(true)}
          >
            {create.isPending ? 'Đang tạo...' : 'Tạo gian hàng & Đến mua gói'}
          </Btn>
        </div>
      </div>
    </Section>
  )
}

function Editor({ store }: { store: Storefront }) {
  const uid = useId()
  const update = useUpdateStorefront()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: store.name, description: store.description })
  const dirty = form.name !== store.name || form.description !== store.description
  const display = editing ? form : store

  const cancel = () => {
    setForm({ name: store.name, description: store.description })
    setEditing(false)
  }

  const save = () => {
    const patch = { name: form.name.trim(), description: form.description.trim() }
    update.mutate(patch, {
      onSuccess: () => {
        setForm(patch)
        setEditing(false)
      },
    })
  }

  return (
    <DetailLayout
      main={
        <>
          <section className="overflow-hidden rounded-[2rem] bg-white/95 shadow-soft">
            <div className="h-36 bg-gradient-to-r from-violet-soft via-peach to-mint" />
            <div className="-mt-10 flex flex-wrap items-end gap-4 px-6 pb-6">
              <span className="grid h-20 w-20 place-items-center rounded-3xl bg-violet text-white shadow-lift">
                <Store size={32} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-2xl font-bold">{display.name}</p>
                <p className="line-clamp-1 text-sm text-ink-soft">
                  {display.description || 'Chưa có giới thiệu gian hàng'}
                </p>
              </div>
              <StatusPill status={store.status} map={STOREFRONT_STATUS} />
            </div>
          </section>
          <Section
            title="Thông tin hiển thị công khai"
            aside={
              !editing ? (
                <Btn variant="soft" size="sm" icon={Pencil} onClick={() => setEditing(true)}>
                  Chỉnh sửa gian hàng
                </Btn>
              ) : (
                <span className="rounded-full bg-violet-soft px-3 py-1.5 font-label text-xs font-bold text-violet">
                  Đang chỉnh sửa
                </span>
              )
            }
          >
            {editing ? (
              <div className="grid gap-4">
                <label htmlFor={`${uid}-n`} className="block">
                  <span className="mb-1.5 block font-label text-xs font-semibold text-ink-soft">
                    Tên gian hàng công khai *
                  </span>
                  <input
                    id={`${uid}-n`}
                    value={form.name}
                    maxLength={255}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inputClass}
                  />
                  <span className="mt-1 block text-right font-label text-[11px] text-ink-soft">
                    {form.name.length}/255
                  </span>
                </label>
                <label htmlFor={`${uid}-d`} className="block">
                  <span className="mb-1.5 block font-label text-xs font-semibold text-ink-soft">
                    Giới thiệu chi tiết xưởng
                  </span>
                  <textarea
                    id={`${uid}-d`}
                    rows={5}
                    maxLength={10000}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className={inputClass}
                  />
                  <span className="mt-1 block text-right font-label text-[11px] text-ink-soft">
                    {form.description.length}/10.000
                  </span>
                </label>
              </div>
            ) : (
              <dl className="grid gap-4">
                <div className="rounded-2xl bg-surface-low px-5 py-4">
                  <dt className="font-label text-xs font-bold uppercase tracking-wide text-ink-soft">
                    Tên gian hàng công khai
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-ink">{store.name}</dd>
                </div>
                <div className="rounded-2xl bg-surface-low px-5 py-4">
                  <dt className="font-label text-xs font-bold uppercase tracking-wide text-ink-soft">
                    Giới thiệu chi tiết xưởng
                  </dt>
                  <dd className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">
                    {store.description || 'Chưa cập nhật giới thiệu gian hàng.'}
                  </dd>
                </div>
              </dl>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Btn href={`/marketplace/shop/${store.id}`} variant="white" icon={Eye}>
                Xem gian hàng công khai
              </Btn>
              {editing && (
                <>
                  <Btn variant="white" icon={X} disabled={update.isPending} onClick={cancel}>
                    Hủy thay đổi
                  </Btn>
                  <Btn
                    variant="primary"
                    icon={Save}
                    disabled={!dirty || form.name.trim().length < 3 || update.isPending}
                    onClick={save}
                  >
                    {update.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
                  </Btn>
                </>
              )}
            </div>
          </Section>
        </>
      }
      aside={
        <Section title="Trạng thái gian hàng">
          <KeyValues
            items={[
              { label: 'Mã gian hàng', value: `storefront_${store.id}` },
              {
                label: 'Xác thực',
                value: (
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck size={14} className="text-violet" /> {store.verificationStatus ?? '—'}
                  </span>
                ),
              },
              {
                label: 'Gói đến',
                value: (
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock size={14} /> {store.expiresAt ? formatDate(store.expiresAt) : 'Chưa kích hoạt'}
                  </span>
                ),
              },
              { label: 'Nhận đơn', value: store.available ? 'Đang mở' : 'Tạm ngừng' },
            ]}
          />
          <div className="mt-4">
            <Btn to="/seller/subscription" icon={CreditCard} variant={store.available ? 'soft' : 'primary'}>
              {store.expiresAt ? 'Gia hạn gói' : 'Thanh toán để kích hoạt'}
            </Btn>
          </div>
        </Section>
      }
    />
  )
}
