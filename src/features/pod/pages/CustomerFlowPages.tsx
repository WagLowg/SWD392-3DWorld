import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Check,
  Clock3,
  CreditCard,
  Download,
  Eye,
  FileCheck2,
  FileUp,
  Layers3,
  PackageCheck,
  RefreshCw,
  Rotate3d,
  Search,
  ShieldCheck,
  Truck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Panel, StateBlock, StatusPill } from '../components/PodUi'
import { podService } from '../services/pod.service'
import type { PrintQuote, PrintRequest, PrintRequestItem } from '../types'

const steps = ['Tải tệp', 'Xem trước', 'Cấu hình', 'Kiểm tra']
const terminalStatuses = new Set(['COMPLETED', 'DELIVERED', 'REJECTED', 'CANCELLED', 'EXPIRED'])
const productionStatuses = new Set([
  'IN_QUEUE',
  'QUEUED',
  'PREPARING',
  'PRINTING',
  'POST_PROCESSING',
  'QA',
  'READY_TO_SHIP',
  'SHIPPING',
])

function dateTime(value?: string | null) {
  if (!value) return 'Chưa cập nhật'
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function money(value?: number | null) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value ?? 0)
}

function fileSize(value?: number | null) {
  if (!value) return '—'
  return `${(value / 1024 / 1024).toFixed(2)} MB`
}

function statusTone(status: string): 'blue' | 'green' | 'orange' | 'red' | 'slate' {
  if (/COMPLETED|DELIVERED|SUCCEEDED|ACCEPTED/i.test(status)) return 'green'
  if (/REVISION|REJECTED|CANCELLED|EXPIRED|FAILED/i.test(status)) return 'red'
  if (/QUOTED|PAYMENT|QA|SHIPPING/i.test(status)) return 'orange'
  if (/DRAFT/i.test(status)) return 'slate'
  return 'blue'
}

function useRequestId() {
  const [params] = useSearchParams()
  return params.get('id') ?? ''
}

function WizardHeader({ active, requestId }: { active: number; requestId?: string }) {
  return (
    <section className="pod-wizard-head">
      <div>
        <span>Yêu cầu in 3D {requestId ? `· POD-${requestId}` : ''}</span>
        <h1>Tạo yêu cầu Print on Demand</h1>
        <p>Giá trong quá trình cấu hình chỉ là tham khảo. Báo giá chính thức do kỹ thuật viên phát hành sau khi kiểm tra file.</p>
      </div>
      <ol className="pod-stepper">
        {steps.map((step, index) => (
          <li className={index < active ? 'done' : index === active ? 'active' : ''} key={step}>
            <span>{index < active ? <Check size={15} /> : index + 1}</span>
            <strong>{step}</strong>
          </li>
        ))}
      </ol>
    </section>
  )
}

function MissingId() {
  return <StateBlock state="error" title="Thiếu mã yêu cầu" body="Hãy mở màn hình này từ luồng tạo yêu cầu hoặc lịch sử POD." />
}

export function PreviewPage() {
  const requestId = useRequestId()
  const navigate = useNavigate()
  const client = useQueryClient()
  const [confirmed, setConfirmed] = useState(false)
  const request = useQuery({
    queryKey: ['pod', 'requests', requestId],
    queryFn: ({ signal }) => podService.getRequest(requestId, signal),
    enabled: !!requestId,
  })
  const versions = useQuery({
    queryKey: ['pod', 'requests', requestId, 'files'],
    queryFn: ({ signal }) => podService.listFileVersions(requestId, signal),
    enabled: !!requestId,
  })
  const current = versions.data?.find((item) => item.current) ?? versions.data?.[0]
  const workflow = request.data?.workflow
  const confirm = useMutation({
    mutationFn: () => podService.confirmPreview(
      requestId,
      workflow?.currentFileVersion ?? current?.version ?? 1,
      workflow?.currentSpecVersion ?? 1,
    ),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['pod', 'requests', requestId] })
      navigate(`/print/configure?id=${requestId}`)
    },
  })
  const download = useMutation({
    mutationFn: () => podService.downloadFileVersion(requestId, current?.version ?? 1),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    },
  })

  if (!requestId) return <div className="pod-page"><MissingId /></div>
  return (
    <div className="pod-page">
      <WizardHeader active={1} requestId={requestId} />
      {request.isLoading || versions.isLoading ? <StateBlock state="loading" title="Đang chuẩn bị bản xem trước" body="Đọc phiên bản file và thông số hiện tại..." /> : null}
      {request.isError ? <StateBlock state="error" title="Không tải được yêu cầu" body={request.error.message} /> : null}
      <div className="pod-content-grid pod-preview-layout">
        <Panel className="pod-viewer-panel">
          <div className="pod-preview-stage">
            <div className="pod-preview-object"><Box size={104} /></div>
            <div className="pod-preview-controls"><Rotate3d size={18} /> Preview bảo mật · Staff sẽ kiểm tra khả năng in</div>
          </div>
        </Panel>
        <aside className="pod-side-stack">
          <Panel title="Thông tin file" hint="Preview không thay thế bước slicing kỹ thuật">
            <dl className="pod-dl">
              <div><dt>Tên file</dt><dd>{current?.fileName ?? 'Chưa có dữ liệu'}</dd></div>
              <div><dt>Định dạng</dt><dd>{current?.fileType ?? '—'}</dd></div>
              <div><dt>Kích thước</dt><dd>{fileSize(current?.fileSize)}</dd></div>
              <div><dt>Phiên bản</dt><dd>v{current?.version ?? workflow?.currentFileVersion ?? 1}</dd></div>
            </dl>
            <button type="button" className="pod-secondary pod-wide" disabled={!current || download.isPending} onClick={() => download.mutate()}>
              <Download size={16} /> {download.isPending ? 'Đang mở file...' : 'Mở file mô hình'}
            </button>
          </Panel>
          <Panel title="Xác nhận trực quan">
            <label className="pod-check"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>Tôi đã kiểm tra đúng file và đồng ý để kỹ thuật viên thẩm định khả năng in.</span></label>
            {confirm.isError ? <StateBlock state="error" title="Không thể xác nhận preview" body={confirm.error.message} /> : null}
            <button type="button" className="pod-primary pod-wide" disabled={!confirmed || confirm.isPending || !workflow?.allowedActions.confirmPreview} onClick={() => confirm.mutate()}>
              <Eye size={16} /> {confirm.isPending ? 'Đang xác nhận...' : 'Tiếp tục cấu hình'}
            </button>
            {!workflow?.allowedActions.confirmPreview && request.data ? <p className="pod-muted">Preview đã xác nhận hoặc yêu cầu không còn ở trạng thái cho phép. Bạn có thể tiếp tục tới bước cấu hình.</p> : null}
            {!workflow?.allowedActions.confirmPreview && request.data ? <Link className="pod-secondary pod-wide" to={`/print/configure?id=${requestId}`}>Mở cấu hình</Link> : null}
          </Panel>
        </aside>
      </div>
    </div>
  )
}

type ConfigState = {
  materialId: number
  color: string
  quality: string
  infillPercent: number
  widthMm: string
  heightMm: string
  depthMm: string
  quantity: number
  notes: string
}

function initialConfig(item?: PrintRequestItem): ConfigState {
  return {
    materialId: item?.materialId ?? 0,
    color: item?.color ?? '',
    quality: item?.quality ?? 'STANDARD',
    infillPercent: item?.infillPercent ?? 20,
    widthMm: item?.widthMm?.toString() ?? '',
    heightMm: item?.heightMm?.toString() ?? '',
    depthMm: item?.depthMm?.toString() ?? '',
    quantity: item?.quantity ?? 1,
    notes: item?.notes ?? '',
  }
}

export function ConfigurePage() {
  const requestId = useRequestId()
  const navigate = useNavigate()
  const client = useQueryClient()
  const [form, setForm] = useState<ConfigState>(initialConfig())
  const request = useQuery({
    queryKey: ['pod', 'requests', requestId],
    queryFn: ({ signal }) => podService.getRequest(requestId, signal),
    enabled: !!requestId,
  })
  const materials = useQuery({ queryKey: ['pod', 'materials'], queryFn: ({ signal }) => podService.listMaterials(undefined, signal) })
  const item = request.data?.items?.[0]
  useEffect(() => {
    if (item) setForm(initialConfig(item))
  }, [item])
  const material = materials.data?.find((value) => value.materialId === form.materialId)
  const isResin = material?.technologyCode === 'SLA'
  const save = useMutation({
    mutationFn: () => {
      if (!item || !request.data?.workflow?.currentSpecVersion) throw new Error('Thiếu phiên bản thông số hiện tại.')
      return podService.updateSpecification(requestId, {
        expectedCurrentSpecVersion: request.data.workflow.currentSpecVersion,
        items: request.data.items?.map((value) => value.printRequestItemId === item.printRequestItemId ? {
          printRequestItemId: value.printRequestItemId,
          materialId: form.materialId,
          color: form.color || null,
          quality: form.quality,
          infillPercent: isResin ? null : form.infillPercent,
          widthMm: form.widthMm ? Number(form.widthMm) : null,
          heightMm: form.heightMm ? Number(form.heightMm) : null,
          depthMm: form.depthMm ? Number(form.depthMm) : null,
          quantity: form.quantity,
          notes: form.notes || null,
        } : {
          printRequestItemId: value.printRequestItemId,
          materialId: value.materialId ?? form.materialId,
          color: value.color,
          quality: value.quality,
          infillPercent: value.infillPercent,
          widthMm: value.widthMm,
          heightMm: value.heightMm,
          depthMm: value.depthMm,
          quantity: value.quantity ?? 1,
          notes: value.notes,
        }) ?? [],
      })
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['pod', 'requests', requestId] })
      navigate(`/print/review?id=${requestId}`)
    },
  })

  if (!requestId) return <div className="pod-page"><MissingId /></div>
  return (
    <div className="pod-page">
      <WizardHeader active={2} requestId={requestId} />
      {request.isLoading || materials.isLoading ? <StateBlock state="loading" title="Đang tải cấu hình" body="Đọc vật liệu được công bố và thông số hiện tại..." /> : null}
      {request.isError ? <StateBlock state="error" title="Không tải được yêu cầu" body={request.error.message} /> : null}
      <div className="pod-content-grid">
        <Panel title="Cấu hình sản xuất" hint="Technology được xác định bởi vật liệu đang active trong catalog">
          <form className="pod-form" onSubmit={(event) => { event.preventDefault(); save.mutate() }}>
            <div className="pod-form-section"><h3>Technology & Material</h3><div className="pod-form-row">
              <label><span>Vật liệu</span><select required value={form.materialId} onChange={(event) => setForm({ ...form, materialId: Number(event.target.value) })}><option value={0}>Chọn vật liệu</option>{materials.data?.map((value) => <option value={value.materialId} key={value.materialId}>{value.technologyCode} · {value.materialName}</option>)}</select></label>
              <label><span>Màu sắc</span><input maxLength={100} value={form.color} placeholder="Ví dụ: Trắng, Đen, Mint" onChange={(event) => setForm({ ...form, color: event.target.value })} /></label>
            </div></div>
            <div className="pod-form-section"><h3>Quality & Technology settings</h3><div className="pod-form-row">
              <label><span>Chất lượng</span><select value={form.quality} onChange={(event) => setForm({ ...form, quality: event.target.value })}><option value="DRAFT">Draft</option><option value="STANDARD">Standard</option><option value="FINE">Fine</option></select></label>
              {!isResin ? <label><span>Infill (%)</span><input type="number" min={0} max={100} value={form.infillPercent} onChange={(event) => setForm({ ...form, infillPercent: Number(event.target.value) })} /></label> : <div className="pod-inline-note"><ShieldCheck size={18} /> SLA không sử dụng thông số infill. Staff sẽ kiểm tra solid/hollow bằng slicer phù hợp.</div>}
            </div></div>
            <div className="pod-form-section"><h3>Size & Quantity</h3><div className="pod-form-grid-4">
              <label><span>Rộng (mm)</span><input type="number" min="0.01" step="0.01" value={form.widthMm} onChange={(event) => setForm({ ...form, widthMm: event.target.value })} /></label>
              <label><span>Cao (mm)</span><input type="number" min="0.01" step="0.01" value={form.heightMm} onChange={(event) => setForm({ ...form, heightMm: event.target.value })} /></label>
              <label><span>Sâu (mm)</span><input type="number" min="0.01" step="0.01" value={form.depthMm} onChange={(event) => setForm({ ...form, depthMm: event.target.value })} /></label>
              <label><span>Số lượng</span><input required type="number" min={1} max={10000} value={form.quantity} onChange={(event) => setForm({ ...form, quantity: Number(event.target.value) })} /></label>
            </div></div>
            <label><span>Ghi chú kỹ thuật</span><textarea maxLength={10000} value={form.notes} placeholder="Dung sai, bề mặt, cách lắp ráp hoặc yêu cầu hậu kỳ..." onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
            {save.isError ? <StateBlock state="error" title="Không lưu được cấu hình" body={save.error.message} /> : null}
            <button className="pod-primary" type="submit" disabled={!form.materialId || !request.data?.workflow?.allowedActions.editSpecification || save.isPending}><FileCheck2 size={17} /> {save.isPending ? 'Đang lưu phiên bản...' : 'Lưu & kiểm tra yêu cầu'}</button>
          </form>
        </Panel>
        <aside className="pod-side-stack">
          <Panel title="Tóm tắt model"><dl className="pod-dl"><div><dt>Request</dt><dd>POD-{requestId}</dd></div><div><dt>File version</dt><dd>v{request.data?.workflow?.currentFileVersion ?? 1}</dd></div><div><dt>Spec version</dt><dd>v{request.data?.workflow?.currentSpecVersion ?? 1}</dd></div><div><dt>Technology</dt><dd>{material?.technologyCode ?? 'Chưa chọn'}</dd></div></dl></Panel>
          <Panel title="Giá tham khảo"><div className="pod-estimate"><strong>Chờ Staff slicing</strong><p>Backend hiện chưa có estimate endpoint. Machine time, labor và vật liệu thực tế chỉ xuất hiện trong Official Quote.</p></div></Panel>
        </aside>
      </div>
    </div>
  )
}

function Countdown({ deadline }: { deadline?: string | null }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  if (!deadline) return <span>Chưa có thời hạn</span>
  const remaining = Math.max(0, new Date(deadline).getTime() - now)
  const hours = Math.floor(remaining / 3_600_000)
  const minutes = Math.floor((remaining % 3_600_000) / 60_000)
  const seconds = Math.floor((remaining % 60_000) / 1000)
  return <span>{remaining === 0 ? 'Đã hết hạn' : `${hours}g ${minutes}p ${seconds}s`}</span>
}

function QuotePanel({ quote }: { quote: PrintQuote }) {
  return (
    <Panel title={`Official Quote v${quote.versionNumber}`} hint={`Phát hành ${dateTime(quote.issuedAt)} · snapshot file v${quote.fileVersionSnapshot}/spec v${quote.specificationVersionSnapshot}`}>
      <div className="pod-quote-table">
        <div className="head"><span>Hạng mục</span><span>Vật liệu</span><span>Nhân công</span><span>Tùy chọn</span><span>Thành tiền</span></div>
        {quote.items.map((line) => <div key={line.printQuoteItemId}><span>Item #{line.printRequestItemId} · SL {line.quantitySnapshot}</span><span>{money(line.materialCostSnapshot)}</span><span>{money(line.laborCostSnapshot)}</span><span>{money(line.optionFeeSnapshot)}</span><strong>{money(line.lineTotal)}</strong></div>)}
        <div className="total"><span>Tổng thanh toán 100%</span><strong>{money(quote.totalAmount)}</strong></div>
      </div>
    </Panel>
  )
}

export function ReviewPage() {
  const requestId = useRequestId()
  const navigate = useNavigate()
  const client = useQueryClient()
  const [confirmed, setConfirmed] = useState(false)
  const [revisionReason, setRevisionReason] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const request = useQuery({
    queryKey: ['pod', 'requests', requestId],
    queryFn: ({ signal }) => podService.getRequest(requestId, signal),
    enabled: !!requestId,
    refetchInterval: (query) => terminalStatuses.has(query.state.data?.status ?? '') ? false : 5000,
  })
  const quotes = useQuery({
    queryKey: ['pod', 'requests', requestId, 'quotes'],
    queryFn: ({ signal }) => podService.listQuotes(requestId, signal),
    enabled: !!requestId && !!request.data && !['DRAFT'].includes(request.data.status),
    refetchInterval: 5000,
  })
  const history = useQuery({
    queryKey: ['pod', 'requests', requestId, 'history'],
    queryFn: ({ signal }) => podService.listStatusHistory(requestId, signal),
    enabled: !!requestId && !!request.data,
  })
  const paymentEnabled = ['QUOTE_ACCEPTED', 'IN_QUEUE', 'PRINTING', 'COMPLETED'].includes(request.data?.status ?? '')
  const payment = useQuery({
    queryKey: ['pod', 'requests', requestId, 'payment'],
    queryFn: ({ signal }) => podService.getPodPaymentStatus(requestId, signal),
    enabled: !!requestId && paymentEnabled,
    refetchInterval: (query) => query.state.data?.financialStatus === 'PENDING' ? 5000 : false,
    retry: false,
  })
  const invalidate = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['pod', 'requests', requestId] }),
      client.invalidateQueries({ queryKey: ['pod', 'requests', requestId, 'quotes'] }),
      client.invalidateQueries({ queryKey: ['pod', 'requests', requestId, 'history'] }),
    ])
  }
  const workflow = request.data?.workflow
  const currentQuote = quotes.data?.find((quote) => quote.current) ?? quotes.data?.at(-1)
  const submit = useMutation({
    mutationFn: () => podService.submitRequest(requestId, workflow?.currentFileVersion ?? 1, workflow?.currentSpecVersion ?? 1),
    onSuccess: invalidate,
  })
  const accept = useMutation({
    mutationFn: () => {
      if (!currentQuote) throw new Error('Chưa có báo giá đang hiệu lực.')
      return podService.acceptQuote(requestId, currentQuote.printQuoteId)
    },
    onSuccess: invalidate,
  })
  const revise = useMutation({
    mutationFn: () => {
      if (!currentQuote) throw new Error('Chưa có báo giá đang hiệu lực.')
      return podService.requestQuoteRevision(requestId, currentQuote.printQuoteId, {
        expectedFileVersion: workflow?.currentFileVersion ?? 1,
        expectedSpecVersion: workflow?.currentSpecVersion ?? 1,
        reason: revisionReason,
      })
    },
    onSuccess: async () => { await invalidate(); navigate(`/print/configure?id=${requestId}&mode=revision`) },
  })
  const cancel = useMutation({ mutationFn: () => podService.cancelRequest(requestId, cancelReason), onSuccess: invalidate })
  const pay = useMutation({
    mutationFn: () => podService.createPodPayment(Number(requestId)),
    onSuccess: (result) => window.location.assign(result.orderUrl),
  })

  if (!requestId) return <div className="pod-page"><MissingId /></div>
  if (request.isLoading) return <div className="pod-page"><StateBlock state="loading" title="Đang tải yêu cầu" body={`POD-${requestId}`} /></div>
  if (request.isError || !request.data) return <div className="pod-page"><StateBlock state="error" title="Không tải được yêu cầu" body={request.error?.message ?? 'Không tìm thấy dữ liệu.'} /></div>
  const data = request.data
  const isWizard = workflow?.allowedActions.submit && ['DRAFT', 'REQUIRES_REVISION'].includes(data.status)

  return (
    <div className="pod-page">
      {isWizard ? <WizardHeader active={3} requestId={requestId} /> : <section className="pod-detail-head"><div><Link to="/orders">← Đơn in của tôi</Link><span>POD-{requestId}</span><h1>Chi tiết yêu cầu in</h1><p>Tạo {dateTime(data.createdAt)} · cập nhật {dateTime(data.updatedAt)}</p></div><StatusPill tone={statusTone(workflow?.displayStatus ?? data.status)}>{workflow?.displayStatus ?? data.status}</StatusPill></section>}
      {data.status === 'REQUIRES_REVISION' ? <div className="pod-revision-banner"><RefreshCw /><div><strong>Cần cập nhật yêu cầu</strong><p>{history.data?.at(-1)?.reason ?? 'Kỹ thuật viên hoặc Buyer đã mở một vòng chỉnh sửa.'}</p></div></div> : null}
      <div className="pod-content-grid">
        <div className="pod-side-stack">
          <Panel title="File & Printing Specification" hint={`File v${workflow?.currentFileVersion ?? '—'} · Spec v${workflow?.currentSpecVersion ?? '—'}`}>
            <div className="pod-record-list">{data.items?.map((item) => <article key={item.printRequestItemId}><span className="pod-record-icon"><Layers3 /></span><div><small>ITEM-{item.printRequestItemId}</small><strong>Material #{item.materialId} · {item.quality ?? 'Chưa chọn quality'}</strong><p>{item.widthMm ?? '—'} × {item.heightMm ?? '—'} × {item.depthMm ?? '—'} mm · SL {item.quantity ?? 1} · {item.infillPercent == null ? 'Không áp dụng infill' : `Infill ${item.infillPercent}%`}</p></div><StatusPill>{item.productionStatus ?? 'PENDING'}</StatusPill></article>)}</div>
            {isWizard ? <Link className="pod-secondary" to={`/print/configure?id=${requestId}`}>Chỉnh cấu hình</Link> : <Link className="pod-secondary" to={`/print/model?id=${requestId}&version=${workflow?.currentFileVersion ?? 1}`}>Xem file 3D</Link>}
          </Panel>
          {currentQuote ? <QuotePanel quote={currentQuote} /> : <Panel title="Technical Review & Official Quote"><StateBlock state="empty" title="Chưa có báo giá chính thức" body="Staff sẽ kiểm tra file và phát hành quote. Giá cuối cùng chỉ lấy từ quote còn hiệu lực." /></Panel>}
          {data.production ? <Panel title="Production Timeline" hint={data.production.productionDisplayStatus}><div className="pod-production-progress"><span style={{ width: `${data.production.totalItems ? data.production.completedItems / data.production.totalItems * 100 : 0}%` }} /></div><div className="pod-mini-stats"><span><b>{data.production.queuedItems}</b>Chờ in</span><span><b>{data.production.printingItems}</b>Đang in</span><span><b>{data.production.completedItems}/{data.production.totalItems}</b>Hoàn tất</span></div></Panel> : null}
          {history.data?.length ? <Panel title="Lịch sử trạng thái"><div className="pod-timeline">{history.data.map((entry) => <div key={entry.historyId}><span /><div><strong>{entry.fromStatus ?? 'START'} → {entry.toStatus}</strong><p>{entry.reason ?? 'Cập nhật bởi hệ thống'} · {dateTime(entry.changedAt)}</p></div></div>)}</div></Panel> : null}
        </div>
        <aside className="pod-side-stack">
          <Panel title={isWizard ? 'Submission Summary' : 'Next best action'}>
            <dl className="pod-dl"><div><dt>Trạng thái</dt><dd>{workflow?.displayStatus ?? data.status}</dd></div><div><dt>{payment.data?.attemptExpiresAt ? 'Payment deadline' : 'Quote deadline'}</dt><dd><Countdown deadline={payment.data?.attemptExpiresAt ?? workflow?.quoteDeadline} /></dd></div><div><dt>Lượt đổi quote còn lại</dt><dd>{workflow?.remainingRevisions ?? 'Chưa bắt đầu'}</dd></div><div><dt>Thanh toán</dt><dd>{payment.data ? `${payment.data.financialStatus} · ${money(payment.data.amount)}` : 'Chưa phát sinh'}</dd></div></dl>
            {isWizard ? <><label className="pod-check"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>Tôi xác nhận đúng file, cấu hình và quyền sử dụng mô hình.</span></label><button type="button" className="pod-primary pod-wide" disabled={!confirmed || submit.isPending} onClick={() => submit.mutate()}><FileCheck2 size={17} /> {submit.isPending ? 'Đang gửi...' : data.status === 'REQUIRES_REVISION' ? 'Gửi lại bản chỉnh sửa' : 'Gửi Staff thẩm định'}</button></> : null}
            {workflow?.allowedActions.acceptQuote && currentQuote ? <button type="button" className="pod-primary pod-wide" disabled={accept.isPending} onClick={() => accept.mutate()}><Check size={17} /> Chấp nhận quote {money(currentQuote.totalAmount)}</button> : null}
            {workflow?.allowedActions.pay ? <button type="button" className="pod-primary pod-wide" disabled={pay.isPending} onClick={() => pay.mutate()}><CreditCard size={17} /> Thanh toán đủ 100% qua ZaloPay</button> : null}
            {workflow?.allowedActions.requestRevision ? <form className="pod-form pod-compact-form" onSubmit={(event) => { event.preventDefault(); revise.mutate() }}><label><span>Lý do đổi cấu hình / yêu cầu báo giá lại</span><textarea required minLength={3} maxLength={10000} value={revisionReason} onChange={(event) => setRevisionReason(event.target.value)} /></label><button className="pod-secondary" type="submit" disabled={revise.isPending || !revisionReason.trim()}><RefreshCw size={15} /> Yêu cầu báo giá lại</button></form> : null}
            {data.status === 'REQUIRES_REVISION' && workflow?.allowedActions.editFile ? <Link className="pod-secondary pod-wide" to={`/requests/${requestId}/revise`}><FileUp size={16} /> Upload file sửa</Link> : null}
          </Panel>
          {workflow?.allowedActions.cancel ? <Panel title="Hủy trước sản xuất"><form className="pod-form pod-compact-form" onSubmit={(event) => { event.preventDefault(); cancel.mutate() }}><label><span>Lý do hủy</span><textarea required minLength={3} maxLength={10000} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} /></label><button type="submit" className="pod-danger" disabled={cancel.isPending || !cancelReason.trim()}>Hủy yêu cầu</button></form></Panel> : null}
          {data.shipping ? <Panel title="Shipping readiness"><div className="pod-protection">{data.shipping.shippingReady ? <Truck /> : <PackageCheck />}<strong>{data.shipping.shippingReady ? 'Sẵn sàng tạo shipment' : 'Chưa sẵn sàng giao'}</strong><p>{data.shipping.shippingBlockers.join(', ') || `${data.shipping.completedItems}/${data.shipping.totalItems} item hoàn tất`}</p></div></Panel> : null}
          {[submit, accept, revise, cancel, pay].map((mutation, index) => mutation.isError ? <StateBlock key={String(index)} state="error" title="Thao tác chưa hoàn tất" body={mutation.error.message} /> : null)}
        </aside>
      </div>
    </div>
  )
}

type HistoryFilter = 'ALL' | 'REVIEW' | 'QUOTE_PAY' | 'PRODUCTION' | 'CLOSED' | 'DRAFT'

function inFilter(item: PrintRequest, filter: HistoryFilter) {
  if (filter === 'ALL') return true
  if (filter === 'DRAFT') return item.status === 'DRAFT'
  if (filter === 'CLOSED') return terminalStatuses.has(item.status)
  if (filter === 'PRODUCTION') return productionStatuses.has(item.status)
  if (filter === 'QUOTE_PAY') return ['QUOTED', 'QUOTE_ACCEPTED', 'AWAITING_FULL_PAYMENT'].includes(item.status)
  return ['SUBMITTED', 'REVIEWING', 'REQUIRES_REVISION', 'PRINTABLE', 'READY_FOR_QUOTE'].includes(item.status)
}

export function OrdersPage() {
  const [filter, setFilter] = useState<HistoryFilter>('ALL')
  const [search, setSearch] = useState('')
  const query = useQuery({
    queryKey: ['pod', 'requests'],
    queryFn: ({ signal }) => podService.listRequests(signal),
    refetchInterval: 15_000,
  })
  const rows = useMemo(() => (query.data ?? []).filter((item) => inFilter(item, filter)).filter((item) => `${item.printRequestId} ${item.customerNotes ?? ''}`.toLowerCase().includes(search.toLowerCase())), [filter, query.data, search])
  const sections = [
    ['Yêu cầu đang xử lý', rows.filter((item) => item.status !== 'DRAFT' && !terminalStatuses.has(item.status))],
    ['Lịch sử đã đóng', rows.filter((item) => terminalStatuses.has(item.status))],
    ['Bản nháp', rows.filter((item) => item.status === 'DRAFT')],
  ] as const
  return (
    <div className="pod-page">
      <section className="pod-detail-head"><div><span>Orders · Print 3D / POD</span><h1>Đơn in của tôi</h1><p>Draft, yêu cầu đang xử lý và lịch sử đóng được tách riêng theo đúng vòng đời POD.</p></div><Link className="pod-primary" to="/">+ Tạo yêu cầu mới</Link></section>
      <div className="pod-history-toolbar"><div className="pod-history-search"><Search size={17} /><input aria-label="Tìm kiếm yêu cầu POD" value={search} placeholder="Tìm request ID hoặc ghi chú" onChange={(event) => setSearch(event.target.value)} /></div>{(['ALL', 'REVIEW', 'QUOTE_PAY', 'PRODUCTION', 'CLOSED', 'DRAFT'] as const).map((value) => <button type="button" className={filter === value ? 'active' : ''} onClick={() => setFilter(value)} key={value}>{value.replace('_', ' & ')}</button>)}<button type="button" onClick={() => query.refetch()}><RefreshCw size={15} /> Refresh</button></div>
      {query.isLoading ? <StateBlock state="loading" title="Đang tải lịch sử POD" body="Dữ liệu tự cập nhật mỗi 15 giây." /> : null}
      {query.isError ? <StateBlock state="error" title="Không tải được lịch sử" body={query.error.message} /> : null}
      {!query.isLoading && rows.length === 0 ? <StateBlock state="empty" title="Không có yêu cầu phù hợp" body="Thử đổi bộ lọc hoặc tạo yêu cầu in mới." /> : null}
      {sections.map(([title, items]) => items.length ? <section className="pod-history-section" key={title}><h2>{title} <span>{items.length}</span></h2><div className="pod-table-wrap"><table className="pod-history-table"><thead><tr><th>Request</th><th>Cấu hình</th><th>Số lượng</th><th>Trạng thái</th><th>Cập nhật</th><th /></tr></thead><tbody>{items.map((item) => <tr key={item.printRequestId}><td><strong>POD-{item.printRequestId}</strong><small>{item.customerNotes ?? 'Yêu cầu in 3D'}</small></td><td>{item.items?.[0] ? `Material #${item.items[0].materialId} · ${item.items[0].quality ?? 'Chưa chọn quality'}` : 'Chưa có item'}</td><td>{item.items?.reduce((sum, value) => sum + (value.quantity ?? 0), 0) ?? 0}</td><td><StatusPill tone={statusTone(item.status)}>{item.status}</StatusPill></td><td>{dateTime(item.updatedAt ?? item.createdAt)}</td><td><Link className="pod-secondary" to={item.status === 'DRAFT' ? `/print/preview?id=${item.printRequestId}` : `/print/review?id=${item.printRequestId}`}>{item.status === 'DRAFT' ? 'Tiếp tục' : 'Chi tiết'}</Link></td></tr>)}</tbody></table></div></section> : null)}
    </div>
  )
}

export function ModelViewerPage() {
  const requestId = useRequestId()
  const [params] = useSearchParams()
  const requestedVersion = Number(params.get('version') ?? 0)
  const files = useQuery({ queryKey: ['pod', 'requests', requestId, 'files'], queryFn: ({ signal }) => podService.listFileVersions(requestId, signal), enabled: !!requestId })
  const selected = files.data?.find((file) => file.version === requestedVersion) ?? files.data?.find((file) => file.current) ?? files.data?.[0]
  const download = useMutation({
    mutationFn: () => podService.downloadFileVersion(requestId, selected?.version ?? 1),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = selected?.fileName ?? `POD-${requestId}-model`
      anchor.click()
      URL.revokeObjectURL(url)
    },
  })
  return <div className="pod-page"><section className="pod-detail-head"><div><Link to={`/print/review?id=${requestId}`}>← Chi tiết yêu cầu</Link><span>Read-only model viewer</span><h1>{selected?.fileName ?? `POD-${requestId}`}</h1><p>Viewer này không thay đổi preview confirmation hoặc trạng thái nghiệp vụ.</p></div><StatusPill>v{selected?.version ?? requestedVersion}</StatusPill></section><Panel className="pod-viewer-panel"><div className="pod-preview-stage pod-model-readonly"><div className="pod-preview-object"><Box size={140} /></div><div className="pod-preview-controls"><Rotate3d size={18} /> Preview bảo mật · {selected?.fileType ?? '3D model'}</div></div><div className="pod-model-actions"><div><strong>{selected?.fileName}</strong><p>{fileSize(selected?.fileSize)} · upload {dateTime(selected?.uploadedAt)}</p></div><button type="button" className="pod-primary" disabled={!selected || download.isPending} onClick={() => download.mutate()}><Download size={17} /> Tải file</button></div></Panel></div>
}
