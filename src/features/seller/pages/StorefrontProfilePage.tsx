import { CalendarClock, CreditCard, Eye, Pencil, Save, ShieldCheck, Store, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { formatDate } from '../../../shared/lib/format'
import { inputClass } from '../../../shared/ui/form'
import { Btn, DetailLayout, Hero, KeyValues, Section, StatusPill } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import type { Storefront } from '../data/seller.fixtures'
import { useCreateStorefront, useStorefront, useUpdateStorefront } from '../hooks/useSeller'
import { STOREFRONT_STATUS } from '../lib/status'

/** MP 040 · Hồ Sơ Gian Hàng — GET/PATCH /api/storefronts/me, POST /api/storefronts */
export function StorefrontProfilePage() {
  const q = useStorefront()
  useEffect(() => {
    document.title = 'Hồ sơ gian hàng · 3DWorld'
  }, [])
  return (
    <>
      <Hero code="MP 040" eyebrow="Gian hàng" title="Hồ Sơ Gian Hàng" accent="Nhận Diện Xưởng Trên Chợ Đồ Chơi." />
      <QueryState isLoading={q.isLoading} error={q.error}>
        {q.data ? <Editor store={q.data} /> : q.isSuccess && <CreateForm />}
      </QueryState>
    </>
  )
}

function CreateForm() {
  const uid = useId()
  const create = useCreateStorefront()
  const [form, setForm] = useState({ name: '', description: '' })
  return (
    <Section title="Tạo gian hàng" className="mt-6">
      <p className="text-sm text-ink-soft">
        Tài khoản chưa có gian hàng. Bạn cần được duyệt xác thực người bán trước; gian hàng mới tạo ở trạng thái chưa
        kích hoạt cho tới khi thanh toán gói thuê bao.
      </p>
      <div className="mt-4 grid gap-4">
        <label htmlFor={`${uid}-n`} className="block">
          <span className="mb-1.5 block font-label text-xs font-semibold text-ink-soft">Tên gian hàng *</span>
          <input
            id={`${uid}-n`}
            value={form.name}
            maxLength={255}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
          />
        </label>
        <label htmlFor={`${uid}-d`} className="block">
          <span className="mb-1.5 block font-label text-xs font-semibold text-ink-soft">Giới thiệu xưởng</span>
          <textarea
            id={`${uid}-d`}
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass}
          />
        </label>
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Btn to="/seller/register" variant="white">
          Xem hồ sơ xác thực
        </Btn>
        <Btn
          variant="primary"
          disabled={form.name.trim().length < 3 || create.isPending}
          onClick={() => create.mutate({ name: form.name.trim(), description: form.description.trim() || undefined })}
        >
          Tạo gian hàng
        </Btn>
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
