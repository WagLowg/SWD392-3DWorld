import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Circle, Lock, Download, AlertTriangle, Cuboid } from 'lucide-react';
import { ApiError } from '../lib/api';
import { aiStudio } from '../lib/backend';
import { downloadAuthed } from '../lib/authed';
import { AuthedImg } from '../components/AuthedImg';
import { bytes, num } from '../lib/format';
import { useToast } from '../lib/app-state';
import { useCrumb } from '../components/AppShell';
import { Badge, Empty, Progress, SelectField } from '../components/ui';
import { ProjectPicker, useVersion } from '../components/ProjectPicker';

type ExportResult = { downloadUrl: string; sizeBytes: number; fileName?: string | null; checksum?: string | null; packaging?: 'zip'; files?: { name: string; sizeBytes: number | null }[]; texturesIncluded?: boolean };

/** Định dạng Backend xuất được (chuyển đổi từ GLB khi chưa có sẵn). */
const EXPORTABLE = new Set(['glb', 'stl', 'obj', 'fbx']);

const FORMATS = [
  { id: 'glb', use: 'Web & trình xem 3D', desc: 'Gói Mesh và Texture trong một tệp.' },
  { id: 'stl', use: 'In 3D', desc: 'Chỉ hình học, không chứa vật liệu.' },
  { id: 'obj', use: 'Chỉnh sửa mô hình', desc: 'OBJ, hoặc gói ZIP gồm OBJ + MTL + ảnh texture khi có.' },
  { id: 'fbx', use: 'Nhân vật & trò chơi', desc: 'Dùng cho Unity, Unreal, Maya.' },
  { id: '3mf', use: 'In tương thích', desc: 'Chưa hỗ trợ: Backend chưa xuất 3MF.', unsupported: true },
  { id: 'usdz', use: 'AR & thiết bị Apple', desc: 'Chưa hỗ trợ: Backend chưa xuất USDZ.', unsupported: true },
  { id: 'gltf', use: 'Web · tài nguyên tách rời', desc: 'Chưa hỗ trợ: chưa có bộ chuyển đổi.', unsupported: true },
  { id: 'blend', use: 'Blender', desc: 'Chưa hỗ trợ: không có bộ chuyển đổi Blender.', unsupported: true },
];

export default function ExportPage() {
  const { versionId } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { version, detail, error } = useVersion(versionId);
  const [fmt, setFmt] = useState('glb');
  const [job, setJob] = useState<{ format: string; state: 'running' | 'done' | 'error'; msg?: string; result?: ExportResult } | null>(null);
  useCrumb(detail ? <><span>{detail.project.title}</span><span>/</span><b>Xuất · {version?.label.split(' ')[0]}</b></> : <b>Xuất mô hình</b>, [detail?.project.title, version?.label]);

  const available = new Map(version?.assets.filter((a) => a.kind === 'model').map((a) => [a.format, a]) || []);
  // Có GLB là xuất được STL/OBJ/FBX (Backend tự chuyển đổi); tệp sẵn có thì luôn xuất được.
  const canExport = (id: string) => available.has(id) || (EXPORTABLE.has(id) && available.has('glb'));
  useEffect(() => { if (version && !canExport(fmt)) setFmt('glb'); }, [version]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!versionId) {
    return (
      <div className="page">
        <div className="page-head"><div><h1>Xuất mô hình</h1><p>Chọn định dạng phù hợp cho web, chỉnh sửa hoặc in 3D.</p></div></div>
        <ProjectPicker title="Chọn mô hình cần xuất:" hrefFor={(v) => `/export/${v}`} />
      </div>
    );
  }
  if (error) return <div className="page"><Empty icon={<AlertTriangle />} title="Không mở được phiên bản" text={error} action={<Link className="btn primary" to="/export">Chọn mô hình khác</Link>} /></div>;
  if (!version || !detail) return <div className="page"><div className="skeleton" style={{ height: 400 }} /></div>;

  const asset = available.get(fmt);
  const download = async () => {
    setJob({ format: fmt, state: 'running' });
    try {
      const r: ExportResult = await aiStudio.exportVersion(version.id, fmt);
      // URL tải cần Bearer token → tải qua fetch rồi lưu file
      const ext = r.packaging === 'zip' ? 'zip' : fmt;
      await downloadAuthed(r.downloadUrl, r.fileName || `${detail.project.title}_${version.label}.${ext}`);
      setJob({ format: fmt, state: 'done', result: r });
      toast('success', `Đã bắt đầu tải ${fmt.toUpperCase()}${r.packaging === 'zip' ? ' (ZIP)' : ''}`);
    } catch (e) {
      const raw = e instanceof ApiError ? e.message : 'Xuất thất bại';
      // Backend chỉ chuyển đổi GLB → STL/OBJ/FBX khi có Blender (CONVERSION_ENABLED=true).
      const msg = /FORMAT_UNAVAILABLE/.test(raw)
        ? `Meshy không có sẵn ${fmt.toUpperCase()} cho phiên bản này và máy chủ chưa bật chuyển đổi định dạng. Hãy dùng GLB, hoặc nhờ quản trị bật chuyển đổi (cần cài Blender).`
        : raw;
      setJob({ format: fmt, state: 'error', msg });
    }
  };

  const stats = version.metadata.stats;
  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Xuất mô hình</h1><p>Chọn định dạng phù hợp cho web, chỉnh sửa hoặc in 3D.</p></div>
        {detail.versions.length > 1 && (
          <div style={{ width: 240 }}>
            <SelectField label="Phiên bản" value={version.id} onChange={(e) => nav(`/export/${e.target.value}`)}>
              {detail.versions.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </SelectField>
          </div>
        )}
      </div>
      <div className="two-col">
        <div className="stack lg">
          <div className="card summary-card">
            {version.thumbnailUrl ? <AuthedImg src={version.thumbnailUrl} alt="" /> : <span className="ph" style={{ display: 'grid', placeItems: 'center' }}><Cuboid /></span>}
            <div className="grow">
              <h3 style={{ fontSize: 18 }}>{detail.project.title}</h3>
              <p className="muted small" style={{ margin: '4px 0 8px' }}>{version.label} · {num(stats?.triangles)} tam giác · {version.metadata.texture ? `Texture ${version.metadata.texture}` : 'Không texture'}</p>
              <Badge tone="info">{available.size} định dạng sẵn có · GLB {bytes(available.get('glb')?.sizeBytes)}</Badge>
            </div>
            <Link className="btn sm" to="/export">Đổi mô hình</Link>
          </div>
          <div className="fmt-grid" role="radiogroup" aria-label="Định dạng xuất">
            {FORMATS.map((f) => {
              const disabled = f.unsupported || !canExport(f.id);
              return (
                <button key={f.id} className="fmt" role="radio" aria-checked={fmt === f.id} disabled={disabled} onClick={() => setFmt(f.id)}>
                  <span className="radio">{disabled ? <Lock size={18} /> : fmt === f.id ? <CheckCircle2 size={20} /> : <Circle size={20} />}</span>
                  <h3>{f.id === 'gltf' ? 'glTF' : f.id.toUpperCase()}</h3>
                  <p className="use">{f.use}</p>
                  <p>{f.unsupported || canExport(f.id) ? f.desc : 'Phiên bản chưa có tệp GLB để chuyển đổi.'}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="stack lg">
          <div className="card">
            <h3>Tệp {fmt.toUpperCase()}</h3>
            <p className="sub">Tệp được lưu trong kho riêng của bạn tại 3DWorld.</p>
            <dl className="kv">
              <dt>Dung lượng</dt><dd>{asset ? bytes(asset.sizeBytes) : <span className="muted">Tạo khi xuất (chuyển đổi từ GLB)</span>}</dd>
              {fmt === 'obj' && <><dt>Đóng gói</dt><dd>OBJ, hoặc ZIP (OBJ + MTL + texture) nếu mô hình có texture</dd></>}
              <dt>Kích thước in</dt><dd>{version.dimensions ? `${version.dimensions.lengthMm} × ${version.dimensions.widthMm} × ${version.dimensions.heightMm} mm` : <span className="muted">Chưa xác nhận</span>}</dd>
              <dt>Texture</dt><dd>{fmt === 'stl' ? 'Không (chỉ hình học)' : version.metadata.texture || 'Không'}</dd>
              {!!asset?.checksum && <><dt>SHA-256</dt><dd style={{ fontSize: 11, wordBreak: 'break-all' }} className="muted">{asset.checksum.slice(0, 24)}…</dd></>}
            </dl>
            {fmt === 'stl' && !version.dimensions && (
              <div className="banner warning" style={{ marginTop: 16 }}>STL không lưu đơn vị. Hãy <Link to={`/print/${version.id}`}>xác nhận kích thước thật</Link> trước khi in.</div>
            )}
            <hr className="divider" />
            <button className="btn primary block" onClick={download} disabled={!canExport(fmt) || job?.state === 'running'}>
              {job?.state === 'running' ? <span className="spinner" /> : <Download size={17} />}Xuất {fmt.toUpperCase()}
            </button>
          </div>
          {job && (
            <div className="card">
              <h3>Tác vụ xuất</h3>
              <div className="row small" style={{ margin: '10px 0' }}>
                <span className="grow">{job.result?.fileName || `${detail.project.title}.${job.result?.packaging === 'zip' ? 'zip' : job.format}`}</span>{job.result && <span className="muted">{bytes(job.result.sizeBytes)}</span>}
                {job.state === 'running' && <span style={{ color: 'var(--primary)' }}>Đang chuẩn bị…</span>}
              </div>
              <Progress value={job.state === 'running' ? 40 : 100} indeterminate={job.state === 'running'} />
              {job.state === 'done' && <p className="badge success" style={{ marginTop: 12 }}><i className="dot" />Xuất hoàn tất · tệp đang được tải xuống</p>}
              {job.state === 'done' && job.result?.files && (
                <div style={{ marginTop: 12 }}>
                  <p className="label" style={{ marginBottom: 6 }}>Nội dung gói ZIP</p>
                  <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
                    {job.result.files.map((f) => <li key={f.name}>{f.name}{f.sizeBytes ? <span className="muted"> · {bytes(f.sizeBytes)}</span> : null}</li>)}
                  </ul>
                  {!job.result.texturesIncluded && <div className="banner warning" style={{ marginTop: 12 }}>Gói không có ảnh texture: phiên bản này không có texture hoặc liên kết texture của nhà cung cấp đã hết hạn. Dùng GLB/FBX/USDZ để giữ màu sắc.</div>}
                </div>
              )}
              {job.state === 'error' && (
                <>
                  <p className="badge danger" style={{ marginTop: 12 }}><i className="dot" />{job.msg}</p>
                  <button className="btn block" style={{ marginTop: 12 }} onClick={download}>Thử xuất lại</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
