import { Boxes } from 'lucide-react'
import { useState } from 'react'
import { ApiClientError } from '../../../shared/api'
import { useOrderPackages, usePackagingProfiles, useSavePackages } from '../hooks/useOrders'
import type { Order } from '../types/order.types'

/** Trạng thái còn được đóng gói lại (trước khi tạo vận đơn). */
const PACKABLE = ['PAID', 'PROCESSING']

type Mode = 'single' | 'perItem'

/**
 * Đóng gói đơn trước khi tạo vận đơn — GET/POST /api/orders/{id}/packages, GET /api/shipping/packaging-profiles.
 * Hai cách phân bổ nhanh: tất cả vào 1 kiện, hoặc mỗi dòng hàng 1 kiện. Backend kiểm tra kích thước / khối lượng.
 */
export function PackagesPanel({ order }: { order: Order }) {
  const packages = useOrderPackages(order.id)
  const canPack = PACKABLE.includes(order.status)
  const profiles = usePackagingProfiles(canPack)
  const save = useSavePackages()
  const [profileId, setProfileId] = useState<number>()
  const [mode, setMode] = useState<Mode>('single')
  const [error, setError] = useState('')
  const chosen = profileId ?? profiles.data?.[0]?.id

  const submit = () => {
    if (!chosen) return
    setError('')
    const items = order.items.map((i) => ({ orderItemId: i.id, quantity: i.quantity }))
    save.mutate(
      {
        orderId: order.id,
        input: {
          packages:
            mode === 'single'
              ? [{ packagingProfileId: chosen, items }]
              : items.map((it) => ({ packagingProfileId: chosen, items: [it] })),
        },
      },
      { onError: (e) => setError(e instanceof ApiClientError ? e.message : 'Không lưu được kiện hàng.') },
    )
  }

  return (
    <section className="rounded-[2rem] bg-white/95 p-6 shadow-soft">
      <h2 className="inline-flex items-center gap-2 font-display text-xl font-bold">
        <Boxes size={19} className="text-violet" /> Đóng gói kiện hàng
      </h2>

      {packages.data?.length ? (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {packages.data.map((p) => (
            <li key={p.id} className="rounded-2xl bg-surface-low p-4 text-sm">
              <p className="font-semibold">
                Kiện {p.index} · <span className="font-mono text-xs text-violet">{p.code}</span>
              </p>
              <p className="text-xs text-ink-soft">
                Hộp {p.profileCode} · {p.productWeightGrams} g hàng + {p.packagingWeightGrams} g bao bì ={' '}
                <strong>{p.packageWeightGrams} g</strong>
              </p>
              <p className="text-xs text-ink-soft">
                {p.items.reduce((s, i) => s + i.quantity, 0)} món · chi phí bao bì {p.packagingCost.toLocaleString('vi-VN')}₫
              </p>
            </li>
          ))}
        </ul>
      ) : (
        !packages.isLoading && <p className="mt-4 text-sm text-ink-soft">Chưa đóng gói kiện nào.</p>
      )}

      {canPack && (
        <div className="mt-5 space-y-3 rounded-2xl border border-dashed border-line p-4">
          <p className="text-sm font-semibold">{packages.data?.length ? 'Đóng gói lại' : 'Chuẩn bị kiện hàng'}</p>
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Loại hộp"
              value={chosen ?? ''}
              onChange={(e) => setProfileId(Number(e.target.value))}
              className="rounded-full bg-surface-low px-4 py-2 text-sm outline-none"
            >
              {(profiles.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.lengthCm}×{p.widthCm}×{p.heightCm} cm, ≤ {p.maxProductWeightGrams} g
                  {p.supportsFragile ? ', hàng dễ vỡ' : ''})
                </option>
              ))}
            </select>
            <select
              aria-label="Cách phân bổ"
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              className="rounded-full bg-surface-low px-4 py-2 text-sm outline-none"
            >
              <option value="single">Tất cả vào 1 kiện</option>
              <option value="perItem">Mỗi dòng hàng 1 kiện</option>
            </select>
            <button
              type="button"
              onClick={submit}
              disabled={!chosen || save.isPending}
              className="rounded-full bg-ink px-5 py-2 font-label text-sm font-semibold text-white hover:bg-violet disabled:opacity-40"
            >
              {save.isPending ? 'Đang lưu…' : 'Lưu kiện hàng'}
            </button>
          </div>
          {profiles.isSuccess && !profiles.data.length && (
            <p className="text-xs text-danger">Chưa có loại hộp nào đang hoạt động.</p>
          )}
          {error && <p className="rounded-xl bg-[#ffdad6] px-3 py-2 text-xs text-danger">{error}</p>}
          <p className="text-[11px] text-ink-soft">
            Tổng tiền đơn đã thanh toán không thay đổi khi đóng gói lại. Mỗi món phải nằm trong đúng một kiện.
          </p>
        </div>
      )}
    </section>
  )
}
