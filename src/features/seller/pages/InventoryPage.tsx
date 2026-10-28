import { Minus, Plus, Tag } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { formatVnd } from '../../../shared/lib/format'
import { inputClass } from '../../../shared/ui/form'
import { Btn, CellTitle, DataTable, FilterTabs, Hero, Pill, RuleBox, Section, Toolbar } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import type { SellerVariant } from '../data/seller.fixtures'
import { useAdjustStock, useChangePrice, useSellerProducts } from '../hooks/useSeller'

type Row = SellerVariant & { productTitle: string; productId: number }
type Editing = { row: Row; mode: 'stock' | 'price' } | null

/** MP 046 · Quản Lý Tồn Kho Biến Thể */
export function InventoryPage() {
  const products = useSellerProducts()
  const [tab, setTab] = useState<'' | 'low' | 'reserved' | 'hidden'>('')
  const [editing, setEditing] = useState<Editing>(null)

  useEffect(() => {
    document.title = 'Quản lý tồn kho · 3DWorld'
  }, [])

  const rows: Row[] = (products.data ?? []).flatMap((p) => p.variants.map((v) => ({ ...v, productTitle: p.title, productId: p.id })))
  const filtered = rows.filter((r) =>
    tab === 'low' ? r.stock - r.reserved < 5 : tab === 'reserved' ? r.reserved > 0 : tab === 'hidden' ? !r.active : true,
  )

  return (
    <>
      <Hero code="MP 046" eyebrow="Tồn kho biến thể" title="Quản Lý Tồn Kho Phôi Đúc" accent="Kho Sẵn & Số Lượng Đang Giữ Chỗ." />
      <Toolbar>
        <FilterTabs
          value={tab}
          onChange={setTab}
          dark
          options={[
            { value: '', label: 'Tất cả', count: rows.length },
            { value: 'low', label: 'Sắp hết kho (<5)', count: rows.filter((r) => r.stock - r.reserved < 5).length },
            { value: 'reserved', label: 'Đang giữ chỗ', count: rows.filter((r) => r.reserved > 0).length },
            { value: 'hidden', label: 'Tạm ẩn', count: rows.filter((r) => !r.active).length },
          ]}
        />
      </Toolbar>
      {editing && <AdjustPanel editing={editing} onClose={() => setEditing(null)} />}
      <QueryState isLoading={products.isLoading} error={products.error}>
        <DataTable
          rows={filtered}
          rowKey={(r) => r.id}
          columns={[
            { key: 'p', header: 'Mẫu & SKU', render: (r) => <CellTitle title={r.productTitle} sub={r.sku} to={`/seller/products/${r.productId}`} /> },
            { key: 'a', header: 'Thuộc tính', render: (r) => `${r.material} · ${r.color} · ${r.size}` },
            { key: 'price', header: 'Đơn giá', render: (r) => <strong>{formatVnd(r.price)}</strong> },
            { key: 's', header: 'Tổng kho', render: (r) => r.stock },
            { key: 'r', header: 'Giữ chỗ 15p', render: (r) => r.reserved },
            { key: 'av', header: 'Khả dụng', render: (r) => <Pill tone={r.stock - r.reserved < 5 ? 'danger' : 'green'}>{r.stock - r.reserved}</Pill> },
            { key: 'on', header: 'Mở bán', render: (r) => (r.active ? 'Có' : 'Ẩn') },
            {
              key: 'x',
              header: '',
              render: (r) => (
                <div className="flex justify-end gap-1.5">
                  <Btn size="sm" icon={Tag} onClick={() => setEditing({ row: r, mode: 'price' })}>
                    Sửa giá
                  </Btn>
                  <Btn size="sm" variant="primary" onClick={() => setEditing({ row: r, mode: 'stock' })}>
                    Chỉnh kho
                  </Btn>
                </div>
              ),
            },
          ]}
        />
      </QueryState>

      <Section title="Nhật ký biến động gần nhất (audit trail)" className="mt-6">
        <p className="rounded-2xl bg-peach/60 p-4 text-sm text-orange-deep">
          Backend đã nhận và lưu lý do khi chỉnh số lượng kho nhưng chưa có endpoint đọc lịch sử biến động. Vì vậy frontend không hiển thị dữ liệu mẫu. Cần bổ sung GET /api/seller/inventory-logs để mở phần audit trail này.
        </p>
      </Section>

      <RuleBox
        title="Ràng buộc nghiệp vụ tồn kho"
        rules={[
          'Tồn kho không được giảm xuống dưới số lượng đang giữ chỗ cho đơn chờ thanh toán.',
          'Điều chỉnh số lượng kho bắt buộc gửi lý do cho backend; API sửa giá hiện chưa nhận trường lý do.',
          'Giữ chỗ tự giải phóng sau 15 phút nếu đơn chưa thanh toán.',
          'Đổi giá không ảnh hưởng đơn đã đặt — đơn giá được khoá tại thời điểm đặt.',
        ]}
      />
    </>
  )
}

function AdjustPanel({ editing, onClose }: { editing: NonNullable<Editing>; onClose: () => void }) {
  const uid = useId()
  const adjust = useAdjustStock()
  const price = useChangePrice()
  const { row, mode } = editing
  const [dir, setDir] = useState<1 | -1>(1)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const n = Number(amount)
  const ok = n > 0 && (mode === 'price' || reason.trim().length >= 10)

  const confirm = () => {
    if (mode === 'stock') adjust.mutate({ variantId: row.id, delta: dir * n, reason: reason.trim() }, { onSuccess: onClose })
    else price.mutate({ variantId: row.id, price: n }, { onSuccess: onClose })
  }

  return (
    <Section title={mode === 'stock' ? `Chỉnh kho ${row.sku}` : `Sửa giá ${row.sku}`} className="mt-6 ring-2 ring-orange">
      <div className="grid gap-4 sm:grid-cols-3">
        {mode === 'stock' ? (
          <div className="flex gap-2">
            <Btn variant={dir === 1 ? 'primary' : 'soft'} icon={Plus} onClick={() => setDir(1)}>
              Nạp thêm phôi
            </Btn>
            <Btn variant={dir === -1 ? 'danger' : 'soft'} icon={Minus} onClick={() => setDir(-1)}>
              Xuất giảm / hỏng
            </Btn>
          </div>
        ) : (
          <p className="self-center text-sm text-ink-soft">Giá hiện tại: {formatVnd(row.price)}</p>
        )}
        <label htmlFor={`${uid}-n`} className="block">
          <span className="mb-1 block font-label text-xs font-semibold text-ink-soft">{mode === 'stock' ? 'Số lượng thay đổi' : 'Đơn giá mới (₫)'}</span>
          <input id={`${uid}-n`} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} className={inputClass} />
        </label>
        {mode === 'stock' ? (
          <label htmlFor={`${uid}-r`} className="block">
            <span className="mb-1 block font-label text-xs font-semibold text-ink-soft">Lý do (bắt buộc, ≥ 10 ký tự)</span>
            <input id={`${uid}-r`} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
          </label>
        ) : (
          <p className="self-center text-xs text-ink-soft">API cập nhật giá hiện chưa hỗ trợ lưu lý do thay đổi.</p>
        )}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Btn onClick={onClose}>Huỷ</Btn>
        <Btn variant="primary" disabled={!ok || adjust.isPending || price.isPending} onClick={confirm}>
          Xác nhận cập nhật
        </Btn>
      </div>
    </Section>
  )
}
