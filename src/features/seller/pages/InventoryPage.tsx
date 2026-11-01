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
      {editing && <AdjustPanel key={`${editing.row.id}-${editing.mode}`} editing={{ ...editing, row: rows.find((row) => row.id === editing.row.id) ?? editing.row }} onClose={() => setEditing(null)} />}
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
  const validAmount = Number.isSafeInteger(n) && n > 0
  const nextStock = row.stock + dir * (validAmount ? n : 0)
  const exceedsAvailable = validAmount && nextStock < row.reserved
  const ok = validAmount && (mode === 'price' || (reason.trim().length >= 10 && !exceedsAvailable && Number.isSafeInteger(nextStock)))
  const quantity = (value: number) => value.toLocaleString('vi-VN')

  const confirm = () => {
    if (!ok || adjust.isPending || price.isPending) return
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
          <span className="mb-1 block font-label text-xs font-semibold text-ink-soft">{mode === 'stock' ? dir === 1 ? 'Số lượng muốn cộng thêm' : 'Số lượng muốn trừ đi' : 'Đơn giá mới (₫)'}</span>
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
      {mode === 'stock' && (
        <div className="mt-5 rounded-2xl bg-surface-low p-4" aria-live="polite" aria-atomic="true">
          <dl className="grid gap-4 sm:grid-cols-3">
            <div><dt className="text-xs font-semibold text-ink-soft">Hiện có trong kho</dt><dd className="mt-1 text-2xl font-bold text-ink">{quantity(row.stock)}</dd></div>
            <div><dt className="text-xs font-semibold text-ink-soft">{dir === 1 ? 'Cộng thêm' : 'Trừ đi'}</dt><dd className="mt-1 text-2xl font-bold text-ink">{validAmount ? `${dir === 1 ? '+' : '−'}${quantity(n)}` : '—'}</dd></div>
            <div><dt className="text-xs font-semibold text-ink-soft">Sau điều chỉnh (dự kiến)</dt><dd className={`mt-1 text-2xl font-bold ${exceedsAvailable ? 'text-danger' : 'text-ink'}`}>{amount && !validAmount ? '—' : quantity(nextStock)}</dd></div>
          </dl>
          {validAmount && <p className="mt-3 text-sm font-semibold">{quantity(row.stock)} {dir === 1 ? '+' : '−'} {quantity(n)} = {quantity(nextStock)} sản phẩm</p>}
          <p className="mt-2 text-xs text-ink-soft">Đang giữ chỗ: {quantity(row.reserved)} · Có thể xuất giảm tối đa: {quantity(Math.max(0, row.stock - row.reserved))} sản phẩm.</p>
          {exceedsAvailable && <p role="alert" className="mt-2 text-sm text-danger">Không thể trừ {quantity(n)} sản phẩm. Tồn kho sau điều chỉnh không được thấp hơn số lượng đang giữ chỗ ({quantity(row.reserved)}).</p>}
          {!!amount && !validAmount && <p role="alert" className="mt-2 text-sm text-danger">Nhập số lượng nguyên dương hợp lệ.</p>}
          <p className="mt-2 text-xs text-ink-soft">Số lượng chỉ được lưu khi bạn bấm “Xác nhận cập nhật”.</p>
        </div>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Btn onClick={onClose}>Huỷ</Btn>
        <Btn variant="primary" disabled={!ok || adjust.isPending || price.isPending} onClick={confirm}>
          Xác nhận cập nhật
        </Btn>
      </div>
    </Section>
  )
}
