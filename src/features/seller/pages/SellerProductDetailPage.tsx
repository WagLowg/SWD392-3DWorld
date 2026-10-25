import { Archive, EyeOff, Pencil, Play, Send } from 'lucide-react'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { formatDateTime, formatVnd } from '../../../shared/format'
import { AuditTimeline, Btn, DataTable, DetailLayout, Hero, KeyValues, MockNotice, Pill, Section, StatusPill } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import { categoryLabel, resolveMediaUrl } from '../../marketplace/lib/format'
import { useSellerProduct, useSetProductStatus } from '../hooks/useSeller'
import { PRODUCT_STATUS } from '../lib/status'

/** MP 045 · Chi Tiết Sản Phẩm & Lịch Sử */
export function SellerProductDetailPage() {
  const id = Number(useParams().productId)
  const q = useSellerProduct(id)
  const setStatus = useSetProductStatus()

  useEffect(() => {
    document.title = 'Chi tiết sản phẩm · 3DWorld'
  }, [])

  return (
    <>
      <MockNotice partial="Số lượng đã bán" api="salesCount trong ProductView" />
      <QueryState isLoading={q.isLoading} error={q.error}>
        {q.data &&
          (() => {
            const p = q.data
            return (
              <>
                <Hero
                  code="MP 045"
                  eyebrow={`prd_${p.id} · ${categoryLabel(p.category)}`}
                  title={p.title}
                  accent="Giám Sát Tồn Kho & Lịch Sử Audit."
                  actions={
                    <>
                      <Btn to={`/seller/products/${p.id}/edit`} variant="primary" icon={Pencil}>
                        Chỉnh sửa
                      </Btn>
                      {p.status === 'PUBLISHED' ? (
                        <Btn icon={EyeOff} onClick={() => setStatus.mutate({ id: p.id, status: 'HIDDEN', note: 'Tạm dừng bán' })}>
                          Tạm dừng bán
                        </Btn>
                      ) : p.status === 'HIDDEN' ? (
                        <Btn variant="orange" icon={Play} onClick={() => setStatus.mutate({ id: p.id, status: 'PENDING_REVIEW', note: 'Nộp duyệt mở bán lại' })}>
                          Nộp duyệt mở bán lại
                        </Btn>
                      ) : p.status === 'DRAFT' || p.status === 'REJECTED' ? (
                        <Btn variant="orange" icon={Send} onClick={() => setStatus.mutate({ id: p.id, status: 'PENDING_REVIEW', note: 'Gửi duyệt' })}>
                          Gửi duyệt
                        </Btn>
                      ) : null}
                      {p.status !== 'ARCHIVED' && (
                        <Btn icon={Archive} onClick={() => setStatus.mutate({ id: p.id, status: 'ARCHIVED', note: 'Lưu trữ' })}>
                          Lưu trữ
                        </Btn>
                      )}
                    </>
                  }
                />
                <DetailLayout
                  main={
                    <>
                      <Section title="Mô tả & quy cách" aside={<StatusPill status={p.status} map={PRODUCT_STATUS} />}>
                        {p.rejectReason && (
                          <p className="mb-3 rounded-2xl bg-[#ffdad6] p-3 text-sm text-danger">
                            <strong>Lý do từ chối:</strong> {p.rejectReason}
                          </p>
                        )}
                        <p className="text-sm leading-relaxed text-ink-soft">{p.description}</p>
                        {!!p.mediaItems?.length && (
                          <div className="mt-4 flex gap-2 overflow-x-auto">
                            {p.mediaItems.map((m) => (
                              <img key={m.id} src={resolveMediaUrl(m.url)} alt="" className="h-24 w-24 shrink-0 rounded-2xl object-cover" />
                            ))}
                          </div>
                        )}
                        <div className="mt-4">
                          <KeyValues
                            cols={3}
                            items={[
                              { label: 'Vận chuyển', value: p.shippingClass },
                              { label: 'Polygon', value: p.polygonCount.toLocaleString('vi-VN') },
                              { label: 'Lưới kín', value: p.manifold ? <Pill tone="green">Manifold</Pill> : <Pill tone="danger">Chưa kín</Pill> },
                            ]}
                          />
                        </div>
                      </Section>
                      <Section title="Tồn kho biến thể & giữ chỗ">
                        <DataTable
                          rows={p.variants}
                          rowKey={(v) => v.id}
                          columns={[
                            { key: 'sku', header: 'SKU', render: (v) => <code className="text-xs">{v.sku}</code> },
                            { key: 'a', header: 'Thuộc tính', render: (v) => `${v.material} · ${v.color} · ${v.size}` },
                            { key: 'p', header: 'Đơn giá', render: (v) => <strong>{formatVnd(v.price)}</strong> },
                            { key: 's', header: 'Tồn kho', render: (v) => v.stock },
                            { key: 'r', header: 'Giữ chỗ 15p', render: (v) => v.reserved },
                            { key: 'av', header: 'Khả dụng', render: (v) => <strong className={v.stock - v.reserved < 5 ? 'text-danger' : 'text-teal'}>{v.stock - v.reserved}</strong> },
                          ]}
                        />
                        <div className="mt-3">
                          <Btn to="/seller/inventory" size="sm">
                            Điều chỉnh tồn kho
                          </Btn>
                        </div>
                      </Section>
                    </>
                  }
                  aside={
                    <>
                      <Section title="Hiệu suất">
                        <KeyValues
                          items={[
                            { label: 'Đã bán', value: p.sold },
                            { label: 'Ảnh', value: p.media },
                            { label: 'Cập nhật', value: formatDateTime(p.updatedAt) },
                            { label: 'Biến thể', value: p.variants.length },
                          ]}
                        />
                      </Section>
                      <AuditTimeline entries={p.audit} title="Lịch sử kiểm duyệt bất biến" />
                    </>
                  }
                />
              </>
            )
          })()}
      </QueryState>
    </>
  )
}
