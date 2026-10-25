import { useQuery } from '@tanstack/react-query'
import { FlaskConical, Layers3, Search, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { PageHero, Panel, StateBlock, StatusPill } from '../components/PodUi'
import { screenById } from '../screens'
import { podService } from '../services/pod.service'

export function MaterialsPage() {
  const [tech, setTech] = useState('')
  const [search, setSearch] = useState('')
  const query = useQuery({ queryKey: ['pod', 'materials', tech], queryFn: ({ signal }) => podService.listMaterials(tech, signal) })
  const filtered = (query.data ?? []).filter((item) => item.materialName.toLowerCase().includes(search.toLowerCase()))
  return <div className="pod-page"><PageHero screen={screenById(3)} />
    <div className="pod-filterbar"><label aria-label="Tìm vật liệu"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm vật liệu..." /></label>{['', 'FDM', 'SLA', 'SLS'].map((item) => <button type="button" className={tech === item ? 'active' : ''} key={item || 'all'} onClick={() => setTech(item)}>{item || 'Tất cả'}</button>)}</div>
    {query.isLoading && <StateBlock state="loading" title="Đang tải kho vật liệu" body="Kết nối API /api/print/materials/getAll" />}
    {query.isError && <StateBlock state="error" title="Không tải được vật liệu" body={query.error.message} />}
    {!query.isLoading && !query.isError && filtered.length === 0 && <StateBlock state="empty" title="Chưa có vật liệu phù hợp" body="Hãy đổi từ khóa hoặc bộ lọc công nghệ." />}
    <div className="pod-material-list">{filtered.map((item, index) => <Panel key={item.materialId} className="pod-material-row"><div className={`pod-material-icon v${index % 3 + 1}`}><FlaskConical /></div><div><StatusPill>{item.technologyCode}</StatusPill><h2>{item.materialName}</h2><p>Vật liệu đang được backend công bố cho quy trình tạo yêu cầu in.</p><div className="pod-specs"><span><Layers3 /> Đơn vị: {item.unit}</span><span><ShieldCheck /> ID: MAT-{item.materialId}</span></div></div><a className="pod-secondary" href={`/?material=${item.materialId}`}>Đặt in vật liệu này</a></Panel>)}</div>
  </div>
}
