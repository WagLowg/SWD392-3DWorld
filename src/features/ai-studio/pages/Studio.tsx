import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  RotateCcw, Grid3x3, Box as BoxIcon, Sun, Camera, Maximize, RefreshCw, Download, Printer, Plus,
  Check, Loader2, Circle, Pencil, AlertTriangle, Sparkles, Cuboid, Play,
} from 'lucide-react';
import { ApiError, newKey, type ConfigOptions, type Estimate, type GenConfig, type ProjectDetail, type SourceImage, type SourceMode, type Task } from '../lib/api';
import { aiStudio } from '../lib/backend';
import { AuthedImg } from '../components/AuthedImg';
import { useAuth, useToast } from '../lib/app-state';
import { bytes, elapsed, isActive, MODEL_LABEL, num, TASK_STATUS, time, dateTime } from '../lib/format';
import { useCrumb } from '../components/AppShell';
import { Badge, Modal, Progress, Segmented, Switch, Empty } from '../components/ui';
import { ImagePicker } from '../components/ImagePicker';
import { DEFAULT_CONFIG, GeneratePanel, type Preset } from '../components/GeneratePanel';
import { Viewer3D, type RenderMode, type ViewerHandle, type ViewerStats } from '../components/Viewer3D';

const EMPTY_IMGS: (SourceImage | null)[] = [null, null, null, null];

function stepsFor(t: Task) {
  const order = ['send', 'queue', 'run', 'save'];
  const cur = { SUBMITTED: 0, NEEDS_RECONCILIATION: 0, QUEUED: 1, RUNNING: 2, SUCCEEDED: 3, INGESTING: 3, ASSET_ERROR: 3 }[t.status as string] ?? 4;
  const labels = ['Gửi tác vụ tới AI', 'Chờ trong hàng đợi', `Dựng hình học${t.config.shouldTexture ? ' & texture' : ''}`, 'Lưu kết quả vào kho 3DWorld'];
  return order.map((k, i) => ({ k, label: labels[i], state: i < cur ? 'done' : i === cur ? 'now' : 'todo' }));
}

export default function Studio() {
  const { projectId } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { refreshWallet, provider } = useAuth();

  // --- dữ liệu ---
  const [options, setOptions] = useState<ConfigOptions | null>(null);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recent, setRecent] = useState<SourceImage[]>([]);

  // --- cấu hình tạo ---
  const [mode, setMode] = useState<SourceMode>('single');
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState<(SourceImage | null)[]>(EMPTY_IMGS);
  const [cfg, setCfg] = useState<GenConfig>(DEFAULT_CONFIG);
  const [preset, setPreset] = useState<Preset>('balanced');
  const [variants, setVariants] = useState(1);
  const [title, setTitle] = useState('');
  const [consent, setConsent] = useState(false);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ key: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // --- viewer ---
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renderMode, setRenderMode] = useState<RenderMode>('textured');
  const [grid, setGrid] = useState(true);
  const [bbox, setBbox] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [light, setLight] = useState(true);
  const [stats, setStats] = useState<ViewerStats | null>(null);
  const [dockTab, setDockTab] = useState<'variants' | 'tasks'>('variants');
  const [editingTitle, setEditingTitle] = useState(false);
  const viewer = useRef<ViewerHandle>(null);
  const vpRef = useRef<HTMLDivElement>(null);
  const [, tick] = useState(0);

  useEffect(() => { aiStudio.configOptions().then(setOptions).catch(() => {}); }, []);
  const loadRecent = useCallback(() => aiStudio.uploads().then(setRecent).catch(() => {}), []);
  useEffect(() => { loadRecent(); }, [loadRecent]);

  // --- tải dự án ---
  const prevStatuses = useRef<Record<string, string>>({});
  const load = useCallback(async (initial = false) => {
    if (!projectId) return;
    try {
      const d = await aiStudio.project(projectId);
      setDetail(d);
      setLoadError(null);
      // Thông báo khi task đổi trạng thái cuối (FRD-AI-017)
      for (const t of d.tasks) {
        const before = prevStatuses.current[t.id];
        if (!initial && before && before !== t.status) {
          if (t.status === 'AVAILABLE') toast('success', 'Mô hình đã sẵn sàng', `${d.project.title} · biến thể ${t.variantIndex + 1}`);
          if (t.status === 'FAILED') toast('error', 'Tạo mô hình thất bại', t.errorMessage || 'Credit đã được hoàn lại.');
          if (t.status === 'ASSET_ERROR') toast('warning', 'Lưu kết quả gặp lỗi', 'Hệ thống sẽ tự thử lại.');
          if (['AVAILABLE', 'FAILED', 'CANCELLED'].includes(t.status)) refreshWallet();
        }
        prevStatuses.current[t.id] = t.status;
      }
      // Khôi phục form tạo từ tác vụ gần nhất (cấu hình + chế độ) để Generate lại trong cùng dự án.
      if (initial && d.tasks[0]) {
        const last = d.tasks[0];
        setConsent(true);
        if (last.config.aiModel) { setCfg(last.config); setPreset('custom'); }
        setMode(last.type.includes('text') ? 'text' : 'single');
      }
      setSelectedId((cur) => (cur && d.versions.some((v) => v.id === cur) ? cur : d.project.activeVersionId || d.versions[d.versions.length - 1]?.id || null));
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : 'Không tải được dự án.');
    }
  }, [projectId, toast, refreshWallet]);

  useEffect(() => {
    prevStatuses.current = {};
    setDetail(null);
    setSelectedId(null);
    setStats(null);
    if (projectId) load(true);
    else {
      setImages(EMPTY_IMGS); setCfg(DEFAULT_CONFIG); setPreset('balanced'); setConsent(false); setTitle(''); setVariants(1); setMode('single'); setPrompt('');
    }
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeTasks = useMemo(() => detail?.tasks.filter((t) => isActive(t.status)) || [], [detail]);
  // Polling khi còn task đang chạy: đọc trạng thái mỗi 2 giây.
  useEffect(() => {
    if (!activeTasks.length) return;
    const iv = setInterval(() => { load(); tick((x) => x + 1); }, 2000);
    return () => clearInterval(iv);
  }, [activeTasks.length, load]);

  // Backend chỉ tự cập nhật khi Meshy gọi webhook — chạy local thì Meshy không gọi tới được,
  // tác vụ kẹt ở 50%. Nên mỗi 10 giây nhờ Backend hỏi lại Meshy (POST /tasks/{id}/refresh).
  const activeIds = activeTasks.map((t) => t.id).join(',');
  useEffect(() => {
    if (!activeIds) return;
    const ids = activeIds.split(',');
    const sync = () => Promise.all(ids.map((id) => aiStudio.refreshTask(id).catch(() => undefined))).then(() => load());
    const first = setTimeout(sync, 3000);
    const iv = setInterval(sync, 10_000);
    return () => { clearTimeout(first); clearInterval(iv); };
  }, [activeIds, load]);

  // --- ước tính chi phí (server tính) ---
  const imageCount = images.filter(Boolean).length;
  useEffect(() => {
    const ctl = new AbortController();
    const t = setTimeout(() => {
      aiStudio.estimate({ mode, config: cfg, variants }, ctl.signal)
        .then((e) => { setEstimate(e); setEstimateError(null); })
        .catch((e) => { if (e.name !== 'AbortError') { setEstimate(null); setEstimateError(e.message); } });
    }, 250);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [mode, cfg, variants]);

  const blocker = !options ? 'Đang tải cấu hình…'
    : mode === 'text' && prompt.trim().length < 3 ? 'Nhập mô tả mô hình để bắt đầu.'
    : mode === 'single' && !images[0] ? 'Tải ảnh tham chiếu để bắt đầu.'
    : mode === 'multi' && !images[0] ? 'Multi-View cần ảnh góc Trước.'
    : mode === 'multi' && imageCount < 2 ? 'Multi-View cần ít nhất 2 ảnh.'
    : !consent ? (mode === 'text' ? 'Xác nhận chính sách nội dung để tiếp tục.' : 'Xác nhận quyền sử dụng ảnh để tiếp tục.')
    : estimate && !estimate.sufficient ? 'Không đủ tín dụng cho lần tạo này.'
    : options.provider === 'unconfigured' ? 'Máy chủ chưa cấu hình nhà cung cấp AI (Meshy) nên chưa tạo được mô hình.'
    : null;

  const startGenerate = () => {
    if (blocker) return;
    setConfirm({ key: newKey() }); // key cố định cho một lần xác nhận → bấm 2 lần không tạo 2 job
  };

  const submit = async () => {
    if (!confirm || !estimate) return;
    setSubmitting(true);
    try {
      const name = title.trim() || project?.title || (mode === 'text' ? prompt.trim().slice(0, 60) : images[0]!.name.replace(/\.\w+$/, ''));
      const r = await aiStudio.createTask({
        mode,
        name,
        prompt,
        images: mode === 'single' ? [images[0]!] : images.filter((x): x is SourceImage => !!x),
        config: cfg,
        variants,
        projectId,
        estimate,
        key: confirm.key,
      });
      setConfirm(null);
      toast('info', 'Đã gửi tác vụ', `${r.tasks.length} tác vụ đang được xử lý. Bạn có thể rời trang, tiến trình vẫn được lưu.`);
      refreshWallet();
      loadRecent();
      if (r.projectId !== projectId) nav(`/studio/${r.projectId}`);
      else load();
      setDockTab('tasks');
    } catch (e) {
      const err = e as ApiError;
      if (err.code === 'PRICE_CHANGED' && err.data?.estimate) {
        setEstimate({ ...estimate, ...(err.data.estimate as Estimate) });
        toast('warning', 'Chi phí đã thay đổi', 'Vui lòng xem lại và xác nhận.');
      } else if (err.code === 'NETWORK') {
        toast('warning', 'Mất kết nối', 'Bấm Xác nhận lại để thử — hệ thống sẽ không tạo trùng tác vụ.');
      } else {
        toast('error', 'Không tạo được tác vụ', err.message);
        setConfirm(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async (t: Task) => {
    try {
      await aiStudio.cancelTask(t.id);
      toast('info', 'Đã hủy tác vụ', 'Credit đã được hoàn lại.');
      refreshWallet();
      load();
    } catch (e) {
      toast('warning', 'Không thể hủy', (e as Error).message);
    }
  };
  const refreshTask = async (t: Task) => {
    try { await aiStudio.refreshTask(t.id); load(); } catch (e) { toast('error', 'Không làm mới được', (e as Error).message); }
  };

  const patchProject = async (body: Record<string, unknown>) => {
    if (!detail) return;
    try {
      await aiStudio.patchProject(detail.project.id, body);
      load();
    } catch (e) { toast('error', 'Không lưu được', (e as Error).message); }
  };

  const version = detail?.versions.find((v) => v.id === selectedId) || null;
  const primaryActive = activeTasks[0];
  const project = detail?.project;

  useCrumb(
    project ? <><span>{project.title}</span><span>/</span><b>{version?.label || 'Đang tạo'}</b></> : <><span>AI Studio</span><span>/</span><b>Dự án mới</b></>,
    [project?.title, version?.label],
  );

  const screenshot = () => {
    const url = viewer.current?.screenshot();
    if (!url) return toast('error', 'Không chụp được ảnh');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project?.title || 'model'}_${version?.label.split(' ')[0] || ''}.png`;
    a.click();
  };
  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else vpRef.current?.requestFullscreen?.();
  };

  if (projectId && loadError && !detail) {
    return <div className="page"><Empty icon={<AlertTriangle />} title="Không mở được dự án" text={loadError} action={<Link className="btn primary" to="/studio">Tạo dự án mới</Link>} /></div>;
  }

  const ms = version?.metadata.stats;
  const sizeTxt = (s?: number[] | null) => (s ? s.map((x) => x.toFixed(2).replace('.', ',')).join(' × ') : '—');
  const modelAsset = version?.assets.filter((a) => a.kind === 'model' && a.format !== 'mtl') || [];

  return (
    <div className="studio">
      {/* ---------------- Trái: nguồn & cấu hình ---------------- */}
      <aside className="studio-left" aria-label="Cấu hình tạo mô hình">
        <div className="panel-title">
          <h2>{mode === 'text' ? 'Văn bản sang 3D' : 'Ảnh sang 3D'}</h2>
          {projectId && <button className="btn sm outline" onClick={() => nav('/studio')} title="Bắt đầu dự án mới"><Plus size={14} />Mới</button>}
        </div>
        <div className="stack lg">
          {/* Multi-View tạm ẩn: Backend (createUnifiedTask) chỉ dùng ảnh đầu tiên. */}
          <Segmented value={mode} onChange={(m) => setMode(m)} label="Nguồn"
            options={[{ value: 'single', label: 'Một ảnh' }, { value: 'text', label: 'Văn bản' }]} />
          {mode === 'text' ? (
            <label className="field">
              <span>Mô tả mô hình</span>
              <textarea rows={5} maxLength={800} value={prompt} onChange={(e) => setPrompt(e.target.value)}
                placeholder="VD: Rương gỗ cổ điển có khoá đồng, chạm khắc hoa văn" style={{ resize: 'vertical' }} />
              <small className="muted">{prompt.length}/800 ký tự · mô tả bằng tiếng Anh thường cho kết quả tốt hơn.</small>
            </label>
          ) : (
            <ImagePicker mode={mode} images={images} onChange={(imgs) => { setImages(imgs); loadRecent(); }} recent={recent} />
          )}
          <GeneratePanel
            options={options} mode={mode} cfg={cfg} setCfg={setCfg} preset={preset} setPreset={setPreset}
            // Backend trừ tín dụng theo số biến thể nhưng chỉ tạo 1 tác vụ → giữ 1 biến thể.
            variants={variants} setVariants={setVariants} maxVariants={1} title={title} setTitle={setTitle} showTitle={!projectId}
            consent={consent} setConsent={setConsent} estimate={estimate} estimateError={estimateError}
            blocker={blocker} busy={submitting} onGenerate={startGenerate}
          />
        </div>
      </aside>

      {/* ---------------- Giữa: viewport ---------------- */}
      <section className="studio-center">
        <div className="viewport" ref={vpRef}>
          {version?.glbUrl ? (
            <>
              <Viewer3D ref={viewer} url={version.glbUrl} mode={renderMode} grid={grid} bbox={bbox} autoRotate={autoRotate} studioLight={light}
                fallbackImage={version.thumbnailUrl} onStats={setStats} />
              <div className="vp-label">
                <b>{project?.title} · {version.label.split(' ')[0]}</b>
                {version.metadata.texture ? <Badge tone="success">Có Texture</Badge> : <Badge tone="warning">Chưa có Texture</Badge>}
              </div>
              <div className="vp-toolbar" role="toolbar" aria-label="Điều khiển viewer">
                <button className="icon-btn" title="Đặt lại góc nhìn" aria-label="Đặt lại góc nhìn" onClick={() => viewer.current?.reset()}><RotateCcw size={17} /></button>
                <button className={`icon-btn${autoRotate ? ' on' : ''}`} title="Tự động xoay" aria-label="Tự động xoay" aria-pressed={autoRotate} onClick={() => setAutoRotate((v) => !v)}><Play size={17} /></button>
                <span className="sep" />
                <button className={`icon-btn${grid ? ' on' : ''}`} title="Lưới & trục tọa độ" aria-label="Lưới" aria-pressed={grid} onClick={() => setGrid((v) => !v)}><Grid3x3 size={17} /></button>
                <button className={`icon-btn${bbox ? ' on' : ''}`} title="Khung bao" aria-label="Khung bao" aria-pressed={bbox} onClick={() => setBbox((v) => !v)}><BoxIcon size={17} /></button>
                <button className={`icon-btn${light ? ' on' : ''}`} title="Ánh sáng studio" aria-label="Ánh sáng studio" aria-pressed={light} onClick={() => setLight((v) => !v)}><Sun size={17} /></button>
                <span className="sep" />
                <button className="icon-btn" title="Chụp ảnh màn hình" aria-label="Chụp ảnh" onClick={screenshot}><Camera size={17} /></button>
                <button className="icon-btn" title="Toàn màn hình" aria-label="Toàn màn hình" onClick={fullscreen}><Maximize size={17} /></button>
              </div>
              <div className="vp-bottom">
                <div className="vp-modes" role="group" aria-label="Chế độ hiển thị">
                  {([['textured', 'Vật liệu'], ['clay', 'Đất sét'], ['wireframe', 'Khung lưới']] as const).map(([k, l]) => (
                    <button key={k} aria-pressed={renderMode === k} onClick={() => setRenderMode(k)}>{l}</button>
                  ))}
                </div>
                <span className="vp-stats tabular">{num(stats?.vertices ?? ms?.vertices)} đỉnh · {num(stats?.triangles ?? ms?.triangles)} tam giác</span>
              </div>
            </>
          ) : primaryActive ? (
            <div className="vp-overlay">
              {(() => { const src = detail?.images.find((i) => i.id === primaryActive.imageIds[0]); return src ? <AuthedImg className="vp-src-img" src={src.url} alt="" /> : null; })()}
              <div className="box" style={{ position: 'relative' }}>
                <Cuboid size={40} color="var(--primary)" style={{ margin: '0 auto' }} />
                <h3>{project?.title} đang thành hình</h3>
                <p className="muted" style={{ margin: '0 0 16px' }}>{TASK_STATUS[primaryActive.status].label}{primaryActive.status === 'RUNNING' ? ` · ${primaryActive.progress}%` : ''}</p>
                <Progress value={primaryActive.progress} indeterminate={primaryActive.status !== 'RUNNING'} />
              </div>
            </div>
          ) : detail && detail.tasks[0] && ['FAILED', 'ASSET_ERROR', 'CANCELLED'].includes(detail.tasks[0].status) ? (
            <div className="vp-overlay">
              <div className="box">
                <AlertTriangle size={36} color="var(--danger)" style={{ margin: '0 auto' }} />
                <h3>{TASK_STATUS[detail.tasks[0].status].label}</h3>
                <p className="muted">{detail.tasks[0].errorMessage || 'Tác vụ đã dừng.'}{detail.tasks[0].status !== 'ASSET_ERROR' && ' Credit đã được hoàn lại.'}</p>
                <p className="muted small">Mã hỗ trợ: {detail.tasks[0].id}</p>
                <p className="small">Điều chỉnh ảnh hoặc cấu hình bên trái rồi Generate lại.</p>
              </div>
            </div>
          ) : (
            <div className="vp-overlay">
              <div className="box">
                <Sparkles size={40} color="var(--primary)" style={{ margin: '0 auto' }} />
                <h3>Biến ảnh thành mô hình 3D</h3>
                <p className="muted">Tải một ảnh vật thể ở bảng bên trái, chọn cấu hình và bấm Generate. Kết quả sẽ hiển thị tại đây để xoay, phóng to và kiểm tra.</p>
                {provider === 'unconfigured' && <div className="banner warning" style={{ textAlign: 'left', marginTop: 16 }}><AlertTriangle size={16} style={{ flex: 'none' }} /><span>Máy chủ <b>chưa cấu hình nhà cung cấp AI</b> (Meshy) nên chưa tạo được mô hình mới. Bạn vẫn xem được các mô hình đã có.</span></div>}
                {provider === 'mock' && <div className="banner warning" style={{ textAlign: 'left', marginTop: 16 }}><AlertTriangle size={16} style={{ flex: 'none' }} /><span>Đang ở <b>chế độ mô phỏng</b>: chưa cấu hình <code>MESHY_API_KEY</code> nên kết quả là mô hình mẫu, không gọi Meshy.</span></div>}
              </div>
            </div>
          )}
        </div>

        {detail && (
          <div className="dock">
            <div className="tabs" role="tablist">
              <button role="tab" aria-selected={dockTab === 'variants'} onClick={() => setDockTab('variants')}>Biến thể ({detail.versions.length})</button>
              <button role="tab" aria-selected={dockTab === 'tasks'} onClick={() => setDockTab('tasks')}>Tác vụ ({detail.tasks.length}){activeTasks.length ? ' ●' : ''}</button>
            </div>
            {dockTab === 'variants' ? (
              detail.versions.length ? (
                <div className="variant-list">
                  {detail.versions.map((v) => (
                    <button key={v.id} className="variant" aria-current={v.id === selectedId} onClick={() => { setSelectedId(v.id); setStats(null); }}>
                      {v.thumbnailUrl ? <AuthedImg src={v.thumbnailUrl} alt="" /> : <span className="ph"><Cuboid size={18} /></span>}
                      <div>
                        <b>{v.label}{v.id === project?.activeVersionId && <span className="badge info" style={{ marginLeft: 6 }}>Chính</span>}</b>
                        <span>{MODEL_LABEL[v.metadata.aiModel || ''] || v.metadata.aiModel} · {time(v.createdAt)}</span>
                      </div>
                    </button>
                  ))}
                  {activeTasks.map((t) => (
                    <div key={t.id} className="variant" style={{ cursor: 'default' }}>
                      <span className="ph"><Loader2 size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} /></span>
                      <div><b>Biến thể {t.variantIndex + 1}</b><span>{TASK_STATUS[t.status].label}{t.status === 'RUNNING' ? ` · ${t.progress}%` : ''}</span></div>
                    </div>
                  ))}
                </div>
              ) : <p className="muted small" style={{ margin: 0 }}>{activeTasks.length ? 'Các biến thể sẽ xuất hiện ở đây khi hoàn tất.' : 'Chưa có phiên bản nào.'}</p>
            ) : (
              <div className="stack" style={{ gap: 8, maxHeight: 180, overflow: 'auto' }}>
                {detail.tasks.map((t) => (
                  <div key={t.id} className="row small" style={{ gap: 10 }}>
                    <Badge tone={TASK_STATUS[t.status].tone}>{TASK_STATUS[t.status].label}</Badge>
                    <span className="grow muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {dateTime(t.createdAt)} · {MODEL_LABEL[t.config.aiModel]} · biến thể {t.variantIndex + 1} · {t.credits} tín dụng{t.errorMessage ? ` · ${t.errorMessage}` : ''}
                    </span>
                    {['QUEUED', 'SUBMITTED'].includes(t.status) && <button className="btn sm outline" onClick={() => cancel(t)}>Hủy</button>}
                    {['NEEDS_RECONCILIATION', 'ASSET_ERROR', 'RUNNING', 'QUEUED'].includes(t.status) && <button className="icon-btn" title="Làm mới trạng thái" onClick={() => refreshTask(t)}><RefreshCw size={14} /></button>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ---------------- Phải: inspector ---------------- */}
      <aside className="studio-right" aria-label="Thuộc tính mô hình">
        <div className="panel-title"><h2>Thuộc tính mô hình</h2></div>
        {!detail ? (
          <p className="muted small">Thông tin mô hình, kích thước và các thao tác xuất/in sẽ hiển thị sau khi tạo.</p>
        ) : (
          <div className="stack lg">
            <div>
              {editingTitle ? (
                <input className="field" style={{ width: '100%', fontSize: 18, fontWeight: 600 }} autoFocus defaultValue={project!.title} maxLength={80}
                  onBlur={(e) => { setEditingTitle(false); if (e.target.value.trim() && e.target.value !== project!.title) patchProject({ title: e.target.value }); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingTitle(false); }} />
              ) : (
                <div className="row" style={{ gap: 6 }}>
                  <h3 style={{ margin: 0, fontSize: 18 }} className="grow">{project!.title}</h3>
                  <button className="icon-btn" aria-label="Đổi tên" onClick={() => setEditingTitle(true)}><Pencil size={15} /></button>
                </div>
              )}
              {version && (
                <div className="row small" style={{ marginTop: 6 }}>
                  <Badge tone="info">{version.label}</Badge>
                </div>
              )}
              <p className="muted small" style={{ margin: '6px 0 0' }}>Tạo lúc {dateTime(project!.createdAt)} · Riêng tư</p>
            </div>

            {primaryActive && (
              <div className="card" style={{ padding: 16 }}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                  <b>{TASK_STATUS[primaryActive.status].label}</b>
                  <span className="small muted tabular">{elapsed(primaryActive.createdAt)}</span>
                </div>
                <div style={{ fontSize: 30, fontWeight: 600, marginBottom: 8 }} className="tabular">{primaryActive.progress}%</div>
                <Progress value={primaryActive.progress} indeterminate={primaryActive.status !== 'RUNNING'} />
                <dl className="kv" style={{ marginTop: 14 }}>
                  <dt>Mã tác vụ</dt><dd style={{ fontSize: 12, wordBreak: 'break-all' }}>{primaryActive.id}</dd>
                  {activeTasks.length > 1 && <><dt>Đang chạy</dt><dd>{activeTasks.length} biến thể</dd></>}
                  <dt>Thời gian còn lại</dt><dd className="muted">Chưa có ETA từ nhà cung cấp</dd>
                </dl>
                <hr className="divider" />
                <ul className="steps">
                  {stepsFor(primaryActive).map((s) => (
                    <li key={s.k} className={s.state}>
                      <span className="st">{s.state === 'done' ? <Check size={14} /> : s.state === 'now' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Circle size={6} />}</span>
                      {s.label}
                    </li>
                  ))}
                </ul>
                {primaryActive.status === 'NEEDS_RECONCILIATION' && (
                  <div className="banner warning" style={{ marginTop: 12 }}>Đang xác minh trạng thái với nhà cung cấp. Không cần bấm Generate lại — hệ thống không tạo trùng hay tính phí lặp.</div>
                )}
                <div className="row" style={{ marginTop: 14 }}>
                  <button className="btn sm outline grow" onClick={() => nav('/models')}>Chạy nền</button>
                  <button className="btn sm outline grow" disabled={!['QUEUED', 'SUBMITTED'].includes(primaryActive.status)} title="Chỉ hủy được khi còn trong hàng đợi" onClick={() => cancel(primaryActive)}>Hủy tác vụ</button>
                </div>
              </div>
            )}

            {version && (
              <>
                <dl className="kv">
                  <dt>Đỉnh</dt><dd>{num(stats?.vertices ?? ms?.vertices)}</dd>
                  <dt>Tam giác</dt><dd>{num(stats?.triangles ?? ms?.triangles)}</dd>
                  <dt>Khung bao</dt><dd>{sizeTxt(stats?.size ?? ms?.size)} <span className="muted small">đv</span></dd>
                  {version.dimensions && <><dt>Kích thước in</dt><dd>{version.dimensions.lengthMm} × {version.dimensions.widthMm} × {version.dimensions.heightMm} mm</dd></>}
                  <dt>Dung lượng GLB</dt><dd>{bytes(modelAsset.find((a) => a.format === 'glb')?.sizeBytes)}</dd>
                  <dt>Texture</dt><dd>{version.metadata.texture || 'Không'}</dd>
                  <dt>Mô hình AI</dt><dd>{MODEL_LABEL[version.metadata.aiModel || ''] || version.metadata.aiModel}{version.metadata.provider === 'mock' ? ' (mô phỏng)' : ''}</dd>
                  <dt>Định dạng</dt><dd>{modelAsset.map((a) => a.format.toUpperCase()).join(' · ')}</dd>
                </dl>
                <div>
                  <p className="label" style={{ fontWeight: 600, color: 'var(--text)' }}>Hiển thị không gian</p>
                  <Switch label="Lưới & trục tọa độ" checked={grid} onChange={setGrid} />
                  <Switch label="Khung bao & kích thước" checked={bbox} onChange={setBbox} />
                  <Switch label="Tự động xoay" checked={autoRotate} onChange={setAutoRotate} />
                </div>
                <div className="stack" style={{ gap: 10 }}>
                  <Link className="btn primary block" to={`/export/${version.id}`}><Download size={17} />Xuất mô hình</Link>
                  <Link className="btn outline block" to={`/print/${version.id}`}><Printer size={17} />Gửi yêu cầu in</Link>
                </div>
                <p className="small muted" style={{ margin: 0 }}>Kích thước khung bao tính theo đơn vị của mô hình; kích thước in thật do bạn xác nhận ở bước In 3D.</p>
              </>
            )}
          </div>
        )}
      </aside>

      {confirm && estimate && (
        <Modal title="Xác nhận tạo mô hình" onClose={() => !submitting && setConfirm(null)} footer={
          <>
            <button className="btn outline" onClick={() => setConfirm(null)} disabled={submitting}>Hủy</button>
            <button className="btn primary" onClick={submit} disabled={submitting || !estimate.sufficient}>
              {submitting ? <span className="spinner" /> : <Sparkles size={16} />}Xác nhận · {num(estimate.total)} tín dụng
            </button>
          </>
        }>
          <div className="stack">
            <dl className="kv">
              <dt>Nguồn</dt><dd>{mode === 'single' ? 'Một ảnh' : mode === 'text' ? 'Văn bản' : `Multi-View · ${imageCount} ảnh`}</dd>
              <dt>Mô hình AI</dt><dd>{MODEL_LABEL[cfg.aiModel]}</dd>
              <dt>Đầu ra</dt><dd>{cfg.shouldTexture ? `Mesh + Texture ${cfg.textureResolution.toUpperCase()}${cfg.enablePbr ? ' · PBR' : ''}` : 'Chỉ Mesh'}{cfg.shouldRemesh ? ` · ${num(cfg.targetPolycount)} mặt` : ''}</dd>
              <dt>Số biến thể</dt><dd>{variants}</dd>
              {projectId && <><dt>Lưu vào</dt><dd>Phiên bản mới của dự án này</dd></>}
            </dl>
            <hr className="divider" style={{ margin: '4px 0' }} />
            {estimate.breakdown.map((b) => (
              <div key={b.label} className="row small"><span className="grow muted">{b.label}</span><span>{b.credits} × {variants}</span></div>
            ))}
            <div className="row"><b className="grow">Tổng chi phí</b><b style={{ color: 'var(--primary)' }}>{num(estimate.total)} tín dụng</b></div>
            <div className="row small"><span className="grow muted">Số dư hiện có</span><span>{num(estimate.balance)} tín dụng</span></div>
            {!estimate.sufficient && <div className="banner danger">Không đủ tín dụng. <Link to="/credits">Nạp thêm tín dụng</Link></div>}
            <div className="banner info">Tín dụng được giữ khi gửi tác vụ và chỉ bị trừ khi mô hình được lưu thành công. Tác vụ lỗi hoặc bị hủy sẽ được hoàn tín dụng.</div>
          </div>
        </Modal>
      )}
    </div>
  );
}
