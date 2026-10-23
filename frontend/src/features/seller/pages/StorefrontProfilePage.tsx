import { Eye, EyeOff, Star, Store, Users } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { inputClass } from '../../../shared/ui/form'
import { Btn, DetailLayout, Hero, KeyValues, MockNotice, Section, StatusPill } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import type { Storefront } from '../data/seller.fixtures'
import { useStorefront, useUpdateStorefront } from '../hooks/useSeller'
import { STOREFRONT_STATUS } from '../lib/status'

/** MP 040 · Hồ Sơ Gian Hàng */
export function StorefrontProfilePage() {
  const q = useStorefront()
  useEffect(() => {
    document.title = 'Hồ sơ gian hàng · 3DWorld'
  }, [])
  return (
    <>
      <MockNotice api="/api/seller/storefront" />
      <Hero code="MP 040" eyebrow="Gian hàng" title="Hồ Sơ Gian Hàng" accent="Nhận Diện Xưởng Trên Chợ Đồ Chơi." />
      <QueryState isLoading={q.isLoading} error={q.error}>
        {q.data && <Editor store={q.data} />}
      </QueryState>
    </>
  )
}

function Editor({ store }: { store: Storefront }) {
  const uid = useId()
  const update = useUpdateStorefront()
  const [form, setForm] = useState({ name: store.name, slogan: store.slogan, description: store.description })
  const dirty = form.name !== store.name || form.slogan !== store.slogan || form.description !== store.description

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
                <p className="font-display text-2xl font-bold">{form.name}</p>
                <p className="text-sm text-ink-soft">{form.slogan}</p>
              </div>
              <StatusPill status={store.status} map={STOREFRONT_STATUS} />
            </div>
          </section>
          <Section title="Thông tin hiển thị công khai">
            <div className="grid gap-4">
              <label htmlFor={`${uid}-n`} className="block">
                <span className="mb-1.5 block font-label text-xs font-semibold text-ink-soft">Tên gian hàng công khai *</span>
                <input id={`${uid}-n`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
              </label>
              <label htmlFor={`${uid}-s`} className="block">
                <span className="mb-1.5 block font-label text-xs font-semibold text-ink-soft">Khẩu hiệu / slogan</span>
                <input id={`${uid}-s`} value={form.slogan} onChange={(e) => setForm({ ...form, slogan: e.target.value })} className={inputClass} />
              </label>
              <label htmlFor={`${uid}-d`} className="block">
                <span className="mb-1.5 block font-label text-xs font-semibold text-ink-soft">Giới thiệu chi tiết xưởng</span>
                <textarea id={`${uid}-d`} rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
              </label>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Btn href={`/marketplace/store/${store.id}`} variant="white" icon={Eye}>
                Xem gian hàng công khai
              </Btn>
              <Btn variant="primary" disabled={!dirty || form.name.trim().length < 3 || update.isPending} onClick={() => update.mutate(form)}>
                Lưu hồ sơ gian hàng
              </Btn>
            </div>
          </Section>
        </>
      }
      aside={
        <>
          <Section title="Chỉ số gian hàng">
            <KeyValues
              items={[
                { label: 'Đánh giá', value: <span className="inline-flex items-center gap-1"><Star size={14} className="text-orange" /> {store.rating}</span> },
                { label: 'Lượt đánh giá', value: store.reviewCount },
                { label: 'Người theo dõi', value: <span className="inline-flex items-center gap-1"><Users size={14} /> {store.followers.toLocaleString('vi-VN')}</span> },
                { label: 'Sản phẩm', value: store.productCount },
              ]}
            />
          </Section>
          <Section title="Hiển thị trên chợ">
            <p className="text-sm text-ink-soft">Tạm ẩn khi bảo trì xưởng — đơn đang xử lý không bị ảnh hưởng.</p>
            <div className="mt-3">
              <Btn
                variant={store.hidden ? 'orange' : 'soft'}
                icon={store.hidden ? Eye : EyeOff}
                onClick={() => update.mutate({ hidden: !store.hidden })}
              >
                {store.hidden ? 'Mở lại gian hàng' : 'Tạm ẩn khỏi chợ'}
              </Btn>
            </div>
          </Section>
        </>
      }
    />
  )
}
