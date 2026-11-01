import { Boxes, Eye, EyeOff, Pencil, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatDateTime, formatVnd } from '../../../shared/lib/format'
import { Btn, CellTitle, DataTable, FilterTabs, Hero, SearchInput, StatusPill, Toolbar } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { categoryLabel, resolveMediaUrl } from '../../marketplace/lib/format'
import type { ProductStatus } from '../data/seller.fixtures'
import { useSellerProducts, useSetProductStatus } from '../hooks/useSeller'
import { PRODUCT_STATUS } from '../lib/status'

/** MP 042 · Quản Lý Sản Phẩm Người Bán */
export function SellerProductsPage() {
  const q = useSellerProducts()
  const setStatus = useSetProductStatus()
  const [tab, setTab] = useState<ProductStatus | ''>('')
  const [term, setTerm] = useState('')

  useEffect(() => {
    document.title = 'Quản lý sản phẩm · 3DWorld'
  }, [])

  const all = q.data ?? []
  const rows = all.filter((p) => (!tab || p.status === tab) && (!term || p.title.toLowerCase().includes(term.toLowerCase())))
  const count = (s: ProductStatus) => all.filter((p) => p.status === s).length

  return (
    <>
      <Hero
        code="MP 042"
        eyebrow="Kho hàng chế tác"
        title="Quản Lý Sản Phẩm Vật Lý"
        accent="Đăng Bán, Thẩm Định & Tạm Ẩn."
        actions={
          <Btn to="/seller/products/new" variant="primary" icon={Plus}>
            Tạo sản phẩm mới
          </Btn>
        }
      />
      <Toolbar>
        <SearchInput value={term} onChange={setTerm} placeholder="Tìm theo tên sản phẩm" />
        <FilterTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: '', label: 'Tất cả', count: all.length },
            ...(['PUBLISHED', 'PENDING_REVIEW', 'DRAFT', 'REJECTED', 'HIDDEN', 'ARCHIVED'] as const).map((s) => ({
              value: s,
              label: PRODUCT_STATUS[s].label,
              count: count(s),
            })),
          ]}
        />
      </Toolbar>
      <QueryState isLoading={q.isLoading} error={q.error}>
        <DataTable
          rows={rows}
          rowKey={(p) => p.id}
          empty="Không tìm thấy sản phẩm phù hợp."
          columns={[
            {
              key: 'title',
              header: 'Sản phẩm',
              render: (p) => (
                <div className="flex items-center gap-3">
                  {p.mediaItems?.[0] ? (
                    <img src={resolveMediaUrl(p.mediaItems[0].url)} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-soft to-peach text-violet">
                      <Boxes size={20} />
                    </span>
                  )}
                  <CellTitle title={p.title} sub={`prd_${p.id} · ${categoryLabel(p.category)}`} to={`/seller/products/${p.id}`} />
                </div>
              ),
            },
            { key: 'var', header: 'Biến thể', render: (p) => `${p.variants.length} SKU` },
            {
              key: 'price',
              header: 'Giá',
              render: (p) => {
                const prices = p.variants.filter((v) => v.active).map((v) => v.price)
                return prices.length ? <strong>{formatVnd(Math.min(...prices))}</strong> : '—'
              },
            },
            { key: 'stock', header: 'Kho khả dụng', render: (p) => p.variants.reduce((s, v) => s + v.stock - v.reserved, 0) },
            {
              key: 'status',
              header: 'Trạng thái',
              render: (p) => (
                <div className="space-y-1">
                  <StatusPill status={p.status} map={PRODUCT_STATUS} />
                  {p.rejectReason && <p className="max-w-[16rem] text-xs text-danger">{p.rejectReason}</p>}
                </div>
              ),
            },
            { key: 'upd', header: 'Cập nhật', render: (p) => <span className="text-xs text-ink-soft">{formatDateTime(p.updatedAt)}</span> },
            {
              key: 'act',
              header: '',
              render: (p) => (
                <div className="flex justify-end gap-1.5">
                  <Btn to={`/seller/products/${p.id}/edit`} size="sm" icon={Pencil}>
                    Sửa
                  </Btn>
                  {p.status === 'PUBLISHED' && (
                    <Btn size="sm" icon={EyeOff} onClick={() => setStatus.mutate({ id: p.id, status: 'HIDDEN', note: 'Tạm ẩn khỏi chợ' })}>
                      Ẩn
                    </Btn>
                  )}
                  {p.status === 'HIDDEN' && (
                    <Btn size="sm" variant="orange" icon={Eye} onClick={() => setStatus.mutate({ id: p.id, status: 'PENDING_REVIEW', note: 'Nộp duyệt để mở bán lại' })}>
                      Nộp duyệt lại
                    </Btn>
                  )}
                </div>
              ),
            },
          ]}
        />
      </QueryState>
    </>
  )
}
