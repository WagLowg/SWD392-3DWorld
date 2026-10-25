import { useMutation, useQuery } from '@tanstack/react-query'
import { Box, FileUp, Layers3, ShieldCheck, Sparkles, Timer, WandSparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Panel, StateBlock } from '../components/PodUi'
import { podService } from '../services/pod.service'
import type { PrintMaterial } from '../types'

const demoMaterials: PrintMaterial[] = [
  { materialId: 1, materialName: 'PLA Matte Mỹ Thuật', technologyCode: 'FDM', unit: 'gram' },
  { materialId: 2, materialName: 'Resin Siêu Chi Tiết 8K', technologyCode: 'SLA', unit: 'gram' },
  { materialId: 3, materialName: 'Nylon PA12 Chịu Lực', technologyCode: 'SLS', unit: 'gram' },
]

export function HomePage() {
  const [file, setFile] = useState<File | null>(null)
  const [materialId, setMaterialId] = useState(0)
  const [rights, setRights] = useState(false)
  const materials = useQuery({ queryKey: ['pod', 'materials'], queryFn: ({ signal }) => podService.listMaterials(undefined, signal) })
  const options = materials.data?.length ? materials.data : demoMaterials
  const selectedId = materialId || options[0]?.materialId || 0
  const validation = useMemo(() => {
    if (!file) return null
    if (file.size > 50 * 1024 * 1024) return 'Tệp vượt quá giới hạn 50MB của backend.'
    if (!/\.(stl|glb|obj)$/i.test(file.name)) return 'Backend hiện chỉ nhận STL, GLB hoặc OBJ.'
    return null
  }, [file])
  const createRequest = useMutation({ mutationFn: () => {
    if (!file) throw new Error('Vui lòng chọn tệp mô hình 3D.')
    return podService.createRequest(file, selectedId, rights)
  } })

  return (
    <>
      <section className="pod-home-hero">
        <div className="pod-home-copy">
          <span className="pod-kicker"><Sparkles size={15} /> Đặt in 3D · Order Print 04</span>
          <h1>Khởi Tạo Ý Tưởng.<br /><em>Chúng Tôi In Hoàn Hảo.</em></h1>
          <p>Tải mô hình 3D, chọn chất liệu và gửi thẳng tới hàng đợi thẩm định của xưởng. Mọi báo giá đều được kỹ thuật viên xác nhận trước khi sản xuất.</p>
          <div className="pod-hero-trust"><span><ShieldCheck /> Tệp mã hóa</span><span><Timer /> Phản hồi &lt; 2 giờ</span><span><Layers3 /> Micro-QC</span></div>
        </div>
        <Panel className="pod-upload-card">
          <div className="pod-stage-head"><span>Cấu hình in · Bản thử nghiệm</span><strong>PREVIEW</strong></div>
          <div className="pod-model-stage"><div className="pod-model-orb"><Box size={86} /></div><span>360° MODEL VIEW</span></div>
          <label className="pod-dropzone">
            <FileUp />
            <strong>{file ? file.name : 'Tải tệp lên (.STL, .GLB, .OBJ)'}</strong>
            <span>{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : 'Dung lượng tối đa 50MB'}</span>
            <input type="file" accept=".stl,.glb,.obj" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </label>
          <label className="pod-field"><span>Vật liệu xưởng</span><select value={selectedId} onChange={(event) => setMaterialId(Number(event.target.value))}>{options.map((item) => <option key={item.materialId} value={item.materialId}>{item.technologyCode} · {item.materialName}</option>)}</select></label>
          <label className="pod-check"><input type="checkbox" checked={rights} onChange={(event) => setRights(event.target.checked)} /><span>Tôi xác nhận có quyền sử dụng và đặt in tệp mô hình này.</span></label>
          {validation && <StateBlock state="error" title="Tệp chưa hợp lệ" body={validation} />}
          {createRequest.isError && <StateBlock state="error" title="Chưa thể gửi yêu cầu" body={createRequest.error.message} />}
          {createRequest.data && <StateBlock state="success" title={`Đã tạo yêu cầu #${createRequest.data.printRequestId}`} body="Tệp đã được chuyển tới hàng đợi kỹ thuật của xưởng." />}
          {createRequest.data ? <Link className="pod-primary pod-wide" to={`/requests/${createRequest.data.printRequestId}`}>Xem yêu cầu vừa tạo</Link> : <button type="button" className="pod-primary pod-wide" disabled={!file || !rights || !!validation || createRequest.isPending || !selectedId} onClick={() => createRequest.mutate()}>{createRequest.isPending ? 'Đang tải lên...' : 'Yêu Cầu Báo Giá Chính Thức'}</button>}
        </Panel>
      </section>

      <section className="pod-section">
        <div className="pod-section-heading"><span>Quy trình chuẩn hóa</span><h2>Từ bản vẽ đến mô hình thật trong 5 bước</h2></div>
        <div className="pod-step-grid">{[
          ['01', 'Tải tệp & kiểm tra', 'STL, GLB, OBJ dưới 50MB. Kiểm tra định dạng và quyền sử dụng.'],
          ['02', 'Đánh giá & báo giá', 'Kỹ thuật viên thẩm định DFM và phát hành báo giá có thời hạn.'],
          ['03', 'Đặt cọc & khóa lệnh', 'Khóa thông số, tệp và lịch máy sau khi giao dịch thành công.'],
          ['04', 'Sản xuất & Micro-QC', 'In, hậu kỳ, đo dung sai và lưu bằng chứng kiểm định.'],
          ['05', 'Tất toán & giao hàng', 'Thanh toán số dư và nhận kiện hàng chống va đập.'],
        ].map(([no, title, body]) => <article key={no}><span>{no}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
      </section>

      <section className="pod-section pod-tint">
        <div className="pod-section-heading row"><div><span>Vật liệu art-toy</span><h2>Chuẩn xưởng, rõ công nghệ</h2></div><Link to="/materials">Xem toàn bộ vật liệu →</Link></div>
        {materials.isError && <StateBlock state="error" title="API vật liệu chưa phản hồi" body="Giao diện đang hiển thị danh mục mẫu để luồng POD không bị gián đoạn." />}
        <div className="pod-material-grid">{options.slice(0, 3).map((item, index) => <article key={item.materialId}><div className={`pod-material-visual v${index + 1}`}><WandSparkles /></div><span>{item.technologyCode}</span><h3>{item.materialName}</h3><p>Phù hợp mô hình sưu tập, nguyên mẫu cơ khí và chi tiết trang trí cao cấp.</p><small>Đơn vị định mức: {item.unit}</small><Link to={`/materials?selected=${item.materialId}`}>Chọn vật liệu này →</Link></article>)}</div>
      </section>
    </>
  )
}
