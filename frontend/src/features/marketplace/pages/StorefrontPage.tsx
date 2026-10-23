import { useQuery } from '@tanstack/react-query'
import { Boxes, Flag, MapPin, MessageSquare, ShieldCheck, Star, Store, Truck, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { formatVnd } from '../../../shared/format'
import { Btn, FilterTabs, MockNotice, Pill, Section } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { useToast } from '../../../shared/ui/toast'
import { sellerService } from '../../seller/services/seller.service'
import { categoryLabel } from '../lib/format'

const REVIEWS = [
  { name: 'Minh T.', rating: 5, text: 'Khớp robot rất chắc, sơn tay tỉ mỉ. Đóng hộp cực kỳ cẩn thận.', product: 'Bolt Mini Robot V1' },
  { name: 'Hà P.', rating: 5, text: 'Giao nhanh, đúng màu như ảnh. Sẽ ủng hộ tiếp.', product: 'Mecha Bear Alpha' },
  { name: 'Khoa N.', rating: 4, text: 'Sản phẩm đẹp, hộp hơi móp nhẹ nhưng bên trong an toàn.', product: 'Astro Bear Explorer' },
]

/** MP 004 · Chi Tiết Gian Hàng (dữ liệu mẫu — chưa có API storefront công khai). */
export function StorefrontPage() {
  const id = Number(useParams().storefrontId)
  const toast = useToast()
  const [tab, setTab] = useState<'products' | 'reviews' | 'policy'>('products')
  const store = useQuery({ queryKey: ['storefront-public', id], queryFn: sellerService.storefront })
  const products = useQuery({ queryKey: ['storefront-public', id, 'products'], queryFn: sellerService.products })
  const [following, setFollowing] = useState(false)

  useEffect(() => {
    document.title = 'Gian hàng · Chợ Đồ Chơi 3DWorld'
  }, [])

  const s = store.data
  const published = (products.data ?? []).filter((p) => p.status === 'PUBLISHED' || p.status === 'HIDDEN')
  const name = s && s.id === id ? s.name : `Xưởng #${id}`

  return (
    <div className="mx-auto max-w-[1320px] px-4 md:px-8">
      <MockNotice api="GET /api/storefronts/{id}" />
      <QueryState isLoading={store.isLoading} error={store.error}>
        {s && (
          <>
            <section className="overflow-hidden rounded-[2.5rem] bg-white/95 shadow-soft">
              <div className="h-40 bg-gradient-to-r from-violet-soft via-peach to-mint sm:h-52" />
              <div className="-mt-12 flex flex-wrap items-end gap-5 px-6 pb-6 sm:px-8">
                <span className="grid h-24 w-24 place-items-center rounded-[1.75rem] bg-violet text-white shadow-lift">
                  <Store size={40} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-label text-xs font-semibold uppercase tracking-widest text-ink-soft">Xưởng chế tác · storefront_{id}</p>
                  <h1 className="font-display text-3xl font-bold sm:text-4xl">{name}</h1>
                  <p className="text-sm text-ink-soft">{s.slogan}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    <span className="inline-flex items-center gap-1">
                      <Star size={14} className="fill-orange text-orange" /> {s.rating} ({s.reviewCount})
                    </span>
                    <span className="inline-flex items-center gap-1 text-ink-soft">
                      <MapPin size={14} /> {s.city}
                    </span>
                    <span className="inline-flex items-center gap-1 text-ink-soft">
                      <Users size={14} /> {(s.followers + (following ? 1 : 0)).toLocaleString('vi-VN')} theo dõi
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Btn variant={following ? 'soft' : 'primary'} onClick={() => setFollowing(!following)}>
                    {following ? 'Đang theo dõi' : 'Theo dõi xưởng'}
                  </Btn>
                  <Btn variant="white" icon={MessageSquare} onClick={() => toast('Tính năng nhắn tin xưởng đang chờ API.')}>
                    Liên hệ / đặt custom
                  </Btn>
                </div>
              </div>
            </section>

            <div className="mt-6">
              <FilterTabs
                value={tab}
                onChange={setTab}
                dark
                options={[
                  { value: 'products', label: 'Sản phẩm đang mở bán', count: published.length },
                  { value: 'reviews', label: 'Đánh giá', count: s.reviewCount },
                  { value: 'policy', label: 'Chính sách & bảo vệ 72h' },
                ]}
              />
            </div>

            {tab === 'products' && (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {published.map((p) => (
                  <article key={p.id} className="rounded-[2rem] bg-white/95 p-3 shadow-soft">
                    <div className="grid aspect-[4/3.4] place-items-center rounded-[1.6rem] bg-gradient-to-br from-violet-soft to-peach">
                      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/85 text-violet">
                        <Boxes size={28} />
                      </span>
                    </div>
                    <div className="px-2 pb-2 pt-4">
                      <Pill tone="violet">{categoryLabel(p.category)}</Pill>
                      <p className="mt-2 font-display text-xl font-bold">{p.title}</p>
                      <p className="mt-1 text-sm text-ink-soft">{p.variants.map((v) => v.material).join(' · ')}</p>
                      <p className="mt-3 font-display text-2xl font-bold">{formatVnd(Math.min(...p.variants.map((v) => v.price)))}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {tab === 'reviews' && (
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {REVIEWS.map((r) => (
                  <article key={r.name} className="rounded-[1.75rem] bg-white/95 p-5 shadow-soft">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => `${r.name}-${i}`).map((k, i) => (
                        <Star key={k} size={15} className={i < r.rating ? 'fill-orange text-orange' : 'text-line'} />
                      ))}
                    </div>
                    <p className="mt-3 text-sm">“{r.text}”</p>
                    <p className="mt-2 text-xs text-ink-soft">
                      {r.name} · {r.product} · <span className="text-teal">Đã nhận hàng</span>
                    </p>
                  </article>
                ))}
              </div>
            )}

            {tab === 'policy' && (
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  { icon: Truck, t: 'Giao hàng', b: 'Đóng gói chống sốc, giao trong 2–4 ngày toàn quốc.' },
                  { icon: ShieldCheck, t: 'Bảo vệ người mua 72h', b: 'Khiếu nại trong 72h sau khi nhận nếu sản phẩm lỗi.' },
                  { icon: Boxes, t: 'Quy trình chế tác', b: 'In resin SLA 8K, sấy UV, sơn tay và kiểm định trước khi gửi.' },
                ].map(({ icon: Icon, t, b }) => (
                  <div key={t} className="rounded-[1.75rem] bg-white/95 p-5 shadow-soft">
                    <Icon size={20} className="text-violet" />
                    <p className="mt-3 font-display text-lg font-bold">{t}</p>
                    <p className="text-sm text-ink-soft">{b}</p>
                  </div>
                ))}
              </div>
            )}

            <Section title="Báo cáo vi phạm gian hàng" className="mt-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-ink-soft">Phát hiện in lậu, sai mô tả hoặc gian lận? Báo cho bộ phận thẩm định.</p>
                <Btn href={`/portal/reports/new?type=STOREFRONT&target=${encodeURIComponent(name)}`} icon={Flag}>
                  Báo cáo vi phạm
                </Btn>
              </div>
            </Section>
          </>
        )}
      </QueryState>
    </div>
  )
}
