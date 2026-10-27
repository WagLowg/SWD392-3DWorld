import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Box, CalendarClock, FileUp, Layers3, LockKeyhole, PackageCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Metric, PageHero, Panel, StateBlock, StatusPill } from '../components/PodUi'
import { screenById } from '../screens'
import { podService } from '../services/pod.service'
import type { PrintRequest } from '../types'

const demoRequests: PrintRequest[] = [
  { printRequestId: 981, status: 'QUOTED', customerNotes: 'Mini Robot Toy Articulated v3', createdAt: '2026-10-20T09:15:00+07:00', items: [{ printRequestItemId: 1, materialId: 2, quality: '0.05mm', quantity: 2, productionStatus: 'READY_TO_QUOTE' }] },
  { printRequestId: 975, status: 'NEEDS_REVISION', customerNotes: 'Vỏ Drone FPV Carbon', createdAt: '2026-10-19T11:20:00+07:00', items: [{ printRequestItemId: 2, materialId: 3, quality: '0.12mm', quantity: 1, productionStatus: 'REVIEW' }] },
  { printRequestId: 960, status: 'IN_PRODUCTION', customerNotes: 'Khớp cầu cơ khí chịu lực', lockedAt: '2026-10-18T10:30:00+07:00', items: [{ printRequestItemId: 3, materialId: 3, quality: '0.08mm', quantity: 1, productionStatus: 'PRINTING' }] },
]

const date = (value?: string | null) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Chưa cập nhật'

export function RequestListPage() {
  const query = useQuery({ queryKey: ['pod', 'requests'], queryFn: ({ signal }) => podService.listRequests(signal) })
  const rows = query.data?.length ? query.data : query.isError ? demoRequests : query.data ?? []
  return <div className="pod-page"><PageHero screen={screenById(16)} action={<Link className="pod-primary" to="/">+ Tạo yêu cầu in mới</Link>} />
    <div className="pod-metrics"><Metric value={String(rows.length)} label="Tổng yêu cầu" note="Theo tài khoản hiện tại" /><Metric value={String(rows.filter((item) => item.status === 'NEEDS_REVISION').length)} label="Cần điều chỉnh" note="Cập nhật tệp mới" /><Metric value={String(rows.filter((item) => item.lockedAt).length)} label="Đã khóa" note="Trong sản xuất" /></div>
    {query.isLoading && <StateBlock state="loading" title="Đang tải yêu cầu in" body="Kết nối API khách hàng..." />}
    {query.isError && <StateBlock state="error" title="API yêu cầu in chưa phản hồi" body={`${query.error.message}. Giao diện bên dưới dùng dữ liệu trình diễn.`} />}
    {!query.isLoading && !query.isError && rows.length === 0 && <StateBlock state="empty" title="Bạn chưa có yêu cầu in" body="Tải tệp 3D đầu tiên để kỹ thuật viên thẩm định." />}
    <div className="pod-request-list">{rows.map((item) => <Panel key={item.printRequestId} className="pod-request-card"><div className="pod-request-model"><Box /></div><div className="pod-request-main"><div><span>REQ-{item.printRequestId}</span><StatusPill tone={item.status === 'NEEDS_REVISION' ? 'red' : item.lockedAt ? 'green' : 'blue'}>{item.status}</StatusPill></div><h2>{item.customerNotes || `Yêu cầu in #${item.printRequestId}`}</h2><p><CalendarClock /> {date(item.createdAt ?? item.updatedAt)} · {item.items?.length ?? 0} cấu hình/phôi</p><div className="pod-specs"><span><Layers3 /> {item.items?.[0]?.quality || 'Đang thẩm định'}</span><span><PackageCheck /> SL {item.items?.[0]?.quantity ?? 1}</span>{item.lockedAt && <span><LockKeyhole /> Đã khóa</span>}</div></div><Link className="pod-secondary" to={`/requests/${item.printRequestId}`}>Xem chi tiết</Link></Panel>)}</div>
  </div>
}

export function RequestDetailPage() {
  const { requestId = '' } = useParams()
  const query = useQuery({ queryKey: ['pod', 'requests', requestId], queryFn: ({ signal }) => podService.getRequest(requestId, signal), enabled: !!requestId })
  const item = query.data
  return <div className="pod-page"><PageHero screen={screenById(17)} action={<Link className="pod-secondary" to="/requests">← Danh sách yêu cầu</Link>} />
    {query.isLoading && <StateBlock state="loading" title="Đang tải hồ sơ" body={`Yêu cầu #${requestId}`} />}
    {query.isError && <StateBlock state="error" title="Không tải được yêu cầu" body={query.error.message} />}
    {item && <><div className="pod-context"><StatusPill>{item.status}</StatusPill><strong>REQ-{item.printRequestId}</strong>{item.lockedAt ? <span><LockKeyhole /> Khóa lúc {date(item.lockedAt)}</span> : <span>Cho phép cập nhật tệp</span>}</div><div className="pod-content-grid"><Panel title="Cấu hình mô hình & tệp 3D" hint={item.customerNotes || 'Không có ghi chú'}><div className="pod-record-list">{(item.items ?? []).map((part) => <article key={part.printRequestItemId}><span className="pod-record-icon"><Box /></span><div><small>ITEM-{part.printRequestItemId}</small><strong>{part.sourceType || 'UPLOADED_FILE'} · Material #{part.materialId ?? '—'}</strong><p>{part.widthMm ?? '—'} × {part.depthMm ?? '—'} × {part.heightMm ?? '—'}mm · {part.quality || 'Chưa chọn chất lượng'}</p></div><StatusPill>{part.productionStatus || item.status}</StatusPill></article>)}</div>{!item.items?.length && <StateBlock state="empty" title="Chưa có cấu hình chi tiết" body="Backend chưa trả print_request_items cho hồ sơ này." />}</Panel><aside className="pod-side-stack"><Panel title="Dữ liệu hồ sơ"><dl className="pod-dl"><div><dt>Ngày tạo</dt><dd>{date(item.createdAt)}</dd></div><div><dt>Cập nhật</dt><dd>{date(item.updatedAt)}</dd></div><div><dt>locked_at</dt><dd>{item.lockedAt || 'null'}</dd></div></dl></Panel>{!item.lockedAt && <Link className="pod-primary pod-wide" to={`/requests/${requestId}/revise`}>Chỉnh sửa tệp yêu cầu</Link>}</aside></div></>}
  </div>
}

export function RequestRevisePage() {
  const { requestId = '' } = useParams()
  const [file, setFile] = useState<File | null>(null)
  const navigate = useNavigate()
  const client = useQueryClient()
  const request = useQuery({ queryKey: ['pod', 'requests', requestId], queryFn: ({ signal }) => podService.getRequest(requestId, signal), enabled: !!requestId })
  const mutation = useMutation({ mutationFn: () => {
    if (!file) throw new Error('Vui lòng chọn tệp thay thế.')
    const version = request.data?.workflow?.currentFileVersion
    if (!version) throw new Error('Không xác định được phiên bản file hiện tại.')
    return podService.replaceRequestFile(requestId, version, file)
  }, onSuccess: async () => { await client.invalidateQueries({ queryKey: ['pod', 'requests'] }); navigate(`/print/preview?id=${requestId}`) } })
  return <div className="pod-page"><PageHero screen={screenById(18)} />
    <div className="pod-content-grid"><Panel title="Tệp 3D thay thế" hint="Backend kiểm tra version để tránh ghi đè đồng thời"><form className="pod-form" onSubmit={(event) => { event.preventDefault(); mutation.mutate() }}><label className="pod-dropzone"><FileUp /><strong>{file?.name ?? 'Chọn tệp STL, GLB, OBJ hoặc 3MF mới'}</strong><span>Tệp cũ vẫn được giữ trong lịch sử phiên bản</span><input required type="file" accept=".stl,.glb,.obj,.3mf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label><div className="pod-context">Phiên bản hiện tại: <strong>v{request.data?.workflow?.currentFileVersion ?? '...'}</strong></div>{mutation.isError && <StateBlock state="error" title="Không thể cập nhật tệp" body={mutation.error.message} />}<button type="submit" className="pod-primary" disabled={!file || mutation.isPending || !request.data?.workflow?.allowedActions.editFile}>{mutation.isPending ? 'Đang tải phiên bản mới...' : 'Tải lên & xem trước lại'}</button></form></Panel><Panel title="Ý kiến kỹ thuật từ xưởng"><div className="pod-warning"><strong>Revision giữ nguyên request ID</strong><p>File mới tạo một version mới. Sau đó Customer phải preview, cấu hình và resubmit theo cùng workflow.</p></div></Panel></div>
  </div>
}
