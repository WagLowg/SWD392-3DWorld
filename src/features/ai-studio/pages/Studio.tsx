/**
 * [Giải thích] TRANG CHÍNH: tạo mô hình 3D bằng AI.
 * Luồng: chọn chế độ (1 ảnh / nhiều góc / văn bản) → tải ảnh hoặc nhập mô tả → chỉnh cấu hình
 * → server ước tính chi phí → xác nhận → gửi tác vụ → theo dõi tiến trình (polling) → xem mô hình 3D.
 * Còn có: danh sách biến thể và tác vụ, huỷ tác vụ, so sánh ảnh gốc với mô hình, chụp ảnh và quay video.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  RotateCcw, Grid3x3, Box as BoxIcon, Sun, Camera, Maximize, RefreshCw, Download, Printer, Plus,
  Check, Loader2, Circle, Pencil, AlertTriangle, Sparkles, Cuboid, Play, Video, Columns2, Keyboard, Dices, X, History, ChevronsLeftRight,
} from 'lucide-react';
import { ApiError, newKey, type ConfigOptions, type Estimate, type GenConfig, type ProjectDetail, type SourceImage, type SourceMode, type Task } from '../lib/api';
import { aiStudio } from '../lib/backend';
import { AuthedImg } from '../components/AuthedImg';
import { useAuth, useToast } from '../lib/app-state';
import { bytes, elapsed, isActive, MODEL_LABEL, num, TASK_STATUS, time, dateTime } from '../lib/format';
import { useCrumb } from '../components/AppShell';
import { Badge, Modal, Progress, Segmented, Switch, Empty } from '../components/ui';
import { ImagePicker, useUploader } from '../components/ImagePicker';
import { Inspiration } from '../components/Inspiration';
import { sampleFile, type Sample } from '../lib/sampleImages';
import { DEFAULT_CONFIG, GeneratePanel, type Preset } from '../components/GeneratePanel';
import { Viewer3D, canRecord, type RenderMode, type ViewerHandle, type ViewerStats } from '../components/Viewer3D';
import { confetti } from '../../../shared/ui/confetti';
import { EmptyStage, GeneratingStage, STAGE_SCENES, type StageScene } from '../components/Stage';

const EMPTY_IMGS: (SourceImage | null)[] = [null, null, null, null];

/** Chip phong cách cho chế độ Văn bản: bấm để thêm/bỏ cụm mô tả tiếng Anh vào prompt. */
const STYLE_CHIPS: [string, string][] = [
  ['Chibi', 'cute chibi style'],
  ['Low-poly', 'low-poly'],
  ['Hoạt hình', 'stylized cartoon'],
  ['Tả thực', 'photorealistic, highly detailed'],
  ['Kim loại', 'polished metal'],
  ['Gỗ mộc', 'carved wood'],
  ['Gốm sứ', 'glazed ceramic'],
  ['Pastel', 'soft pastel colors'],
  ['Cyberpunk', 'cyberpunk, neon accents'],
  ['Đồ chơi', 'vinyl toy figure'],
];

/** Ý tưởng ngẫu nhiên cho nút xúc xắc. */
const RANDOM_IDEAS = [
  'A tiny astronaut cat sitting on a crescent moon',
  'A cozy mushroom house with a round wooden door',
  'A steampunk owl with brass gears and goggles',
  'A retro arcade cabinet with glowing buttons',
  'A baby dragon hatching from a cracked egg',
  'A miniature bonsai tree in a ceramic pot',
  'A cute robot barista holding a coffee cup',
  'A treasure chest overflowing with gold coins',
  'A hot air balloon shaped like a strawberry',
  'A knight helmet decorated with feathers',
  'A sleepy panda hugging a bamboo pillow',
  'A vintage camera with leather details',
];

const PROMPT_HISTORY_KEY = '3dw.ai.promptHistory';
const readHistory = (): string[] => {
  try { return (JSON.parse(localStorage.getItem(PROMPT_HISTORY_KEY) || '[]') as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 6); } catch { return []; }
};
const pushHistory = (p: string) => {
  const t = p.trim();
  if (t.length < 3) return;
  try { localStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify([t, ...readHistory().filter((x) => x !== t)].slice(0, 6))); } catch { /* bị chặn */ }
};

const hasPhrase = (prompt: string, phrase: string) => prompt.toLowerCase().includes(phrase.toLowerCase());
function togglePhrase(prompt: string, phrase: string) {
  if (hasPhrase(prompt, phrase)) {
    const i = prompt.toLowerCase().indexOf(phrase.toLowerCase());
    return (prompt.slice(0, i) + prompt.slice(i + phrase.length)).replace(/\s*,\s*,/g, ',').replace(/^[\s,]+|[\s,]+$/g, '');
  }
  const base = prompt.trim().replace(/[\s,]+$/, '');
  return (base ? `${base}, ${phrase}` : phrase).slice(0, 800);
}

/** Phím tắt của khung xem. */
const VIEWER_KEYS: [string, string][] = [
  ['1 · 2 · 3', 'Vật liệu · Đất sét · Khung lưới'],
  ['A', 'Bật/tắt tự xoay'],
  ['R', 'Đặt lại góc nhìn'],
  ['G', 'Lưới & trục'],
  ['B', 'Khung bao'],
  ['L', 'Ánh sáng studio'],
  ['[ · ]', 'Xoay nguồn sáng'],
  ['C', 'So sánh với ảnh gốc'],
  ['P', 'Chụp ảnh'],
  ['V', 'Quay video 360°'],
  ['F', 'Toàn màn hình'],
  ['?', 'Hiện/ẩn bảng này'],
];

function stepsFor(t: Task) {
  const order = ['send', 'queue', 'run', 'save'];
  const cur = { SUBMITTED: 0, NEEDS_RECONCILIATION: 0, QUEUED: 1, RUNNING: 2, SUCCEEDED: 3, INGESTING: 3, ASSET_ERROR: 3 }[t.status as string] ?? 4;
  const labels = ['Gửi tác vụ tới AI', 'Chờ trong hàng đợi', `Dựng hình học${t.config.shouldTexture ? ' & texture' : ''}`, 'Lưu kết quả vào kho 3DWorld'];
  return order.map((k, i) => ({ k, label: labels[i], state: i < cur ? 'done' : i === cur ? 'now' : 'todo' }));
}

export default function Studio() {
  const { projectId } = useParams();
  const nav = useNavigate();
  const location = useLocation();
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
  const [grid, setGrid] = useState(false);
  const [bbox, setBbox] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [light, setLight] = useState(true);
  const [stageScene, setStageScene] = useState<StageScene>(() => {
    try { return (localStorage.getItem('3dw.ai.stageScene') as StageScene) || 'studio'; } catch { return 'studio'; }
  });
  const pickScene = (s: StageScene) => {
    setStageScene(s);
    try { localStorage.setItem('3dw.ai.stageScene', s); } catch { /* bị chặn */ }
  };
  const [stats, setStats] = useState<ViewerStats | null>(null);
  const [lightAngle, setLightAngle] = useState(0);
  const [compare, setCompare] = useState(false);
  const [comparePos, setComparePos] = useState(50);
  const [showKeys, setShowKeys] = useState(false);
  const [recordPct, setRecordPct] = useState<number | null>(null);
  const [history, setHistory] = useState<string[]>(readHistory);
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
  // [GT] Tải lại chi tiết dự án (phiên bản, tác vụ, ảnh) từ server; polling bên dưới gọi hàm này định kỳ.
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
          if (t.status === 'AVAILABLE') {
            toast('success', 'Mô hình đã sẵn sàng', `${d.project.title} · biến thể ${t.variantIndex + 1}`);
            // Khoảnh khắc "xong rồi!": pháo hoa bắn từ giữa khung xem 3D
            const r = vpRef.current?.getBoundingClientRect();
            confetti(r ? { x: r.left + r.width / 2, y: r.top + r.height * 0.55 } : {});
          }
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

  useEffect(() => {
    const wanted = (location.state as { mode?: SourceMode } | null)?.mode;
    if (wanted && !projectId) setMode(wanted);
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- cột Cảm hứng: ảnh mẫu & ý tưởng mô tả ---
  const { upload: uploadSample } = useUploader();
  const [sampleBusy, setSampleBusy] = useState(false);
  const pickSample = async (s: Sample) => {
    setSampleBusy(true);
    try {
      const img = await uploadSample(await sampleFile(s));
      if (img) {
        setMode('single');
        setImages([img, null, null, null]);
        if (!title.trim()) setTitle(s.label);
        loadRecent();
        toast('success', 'Đã dùng ảnh mẫu', `${s.label} — chọn cấu hình rồi bấm Generate.`);
      }
    } catch (e) {
      toast('error', 'Không dùng được ảnh mẫu', (e as Error).message);
    } finally {
      setSampleBusy(false);
    }
  };
  const pickPrompt = (p: string) => { setMode('text'); setPrompt(p); };

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
      // [GT] Đợi 250ms sau lần đổi cấu hình cuối mới gọi API (debounce); AbortController huỷ request cũ còn dang dở.
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
      // [GT] Gửi tác vụ kèm khoá chống trùng (confirm.key): mạng lỗi mà bấm lại cũng không tạo job thứ hai, không trừ tiền hai lần.
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
      if (mode === 'text') { pushHistory(prompt); setHistory(readHistory()); }
      toast('info', 'Đã gửi tác vụ', `${r.tasks.length} tác vụ đang được xử lý. Bạn có thể rời trang, tiến trình vẫn được lưu.`);
      refreshWallet();
      loadRecent();
      if (r.projectId !== projectId) nav(`/studio/${r.projectId}`);
      else load();
      setDockTab('tasks');
    } catch (e) {
      const err = e as ApiError;
      // [GT] Giá đổi giữa lúc ước tính và lúc gửi → server từ chối; hiện giá mới để người dùng xác nhận lại.
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

  const recordVideo = async () => {
    if (recordPct !== null || !viewer.current) return;
    if (!canRecord()) return toast('warning', 'Trình duyệt chưa hỗ trợ quay video', 'Hãy dùng Chrome, Edge hoặc Firefox bản mới.');
    setCompare(false);
    setRecordPct(0);
    const blob = await viewer.current.record(6, setRecordPct);
    setRecordPct(null);
    if (!blob) return toast('error', 'Không quay được video');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${project?.title || 'model'}_360.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('success', 'Đã quay xong video 360°', 'Tệp video đã được tải xuống — sẵn sàng để chia sẻ.');
  };

  // Ảnh gốc của phiên bản đang xem (để so sánh A/B với mô hình)
  const sourceImg = useMemo(() => {
    const v = detail?.versions.find((x) => x.id === selectedId);
    const task = v && detail?.tasks.find((t) => t.id === v.sourceTaskId);
    return (task && detail?.images.find((i) => i.id === task.imageIds[0])) || null;
  }, [detail, selectedId]);
  useEffect(() => { if (!sourceImg) setCompare(false); }, [sourceImg]);

  // [GT] Thanh so sánh: kéo tay cầm ngang để đổi tỉ lệ hiển thị giữa ảnh gốc (bên trái) và mô hình 3D (bên phải).
  const dragCompare = (e: RPointerEvent<HTMLDivElement>) => {
    const r = vpRef.current?.getBoundingClientRect();
    if (!r || !(e.buttons & 1)) return;
    setComparePos(Math.min(98, Math.max(2, ((e.clientX - r.left) / r.width) * 100)));
  };

  // Phím tắt khung xem (chỉ khi đang xem một mô hình và không gõ vào ô nhập)
  const hasModel = !!detail?.versions.find((x) => x.id === selectedId)?.glbUrl;
  const keyActions = useRef<Record<string, () => void>>({});
  keyActions.current = {
    '1': () => setRenderMode('textured'), '2': () => setRenderMode('clay'), '3': () => setRenderMode('wireframe'),
    a: () => setAutoRotate((v) => !v), r: () => viewer.current?.reset(), g: () => setGrid((v) => !v), b: () => setBbox((v) => !v),
    l: () => setLight((v) => !v), '[': () => setLightAngle((x) => Math.max(-180, x - 15)), ']': () => setLightAngle((x) => Math.min(180, x + 15)),
    c: () => { if (sourceImg) setCompare((v) => !v); }, p: () => screenshot(), v: () => void recordVideo(), f: () => fullscreen(),
    '?': () => setShowKeys((v) => !v), escape: () => { setShowKeys(false); setCompare(false); },
  };
  useEffect(() => {
    if (!hasModel) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable))) return;
      if (document.querySelector('.modal, [aria-modal="true"]')) return;
      const fn = keyActions.current[e.key.toLowerCase()];
      if (fn) { e.preventDefault(); fn(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasModel]);

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
              <div className="prompt-tools">
                <span className="prompt-tools-label">Phong cách</span>
                <button type="button" className="prompt-dice" title="Ý tưởng ngẫu nhiên" aria-label="Ý tưởng ngẫu nhiên"
                  onClick={(e) => {
                    const pool = RANDOM_IDEAS.filter((x) => x !== prompt);
                    setPrompt(pool[Math.floor(Math.random() * pool.length)]);
                    const d = e.currentTarget; d.classList.remove('roll'); void d.offsetWidth; d.classList.add('roll');
                  }}><Dices size={15} />Ngẫu nhiên</button>
              </div>
              <div className="chips" role="group" aria-label="Phong cách mô tả">
                {STYLE_CHIPS.map(([label, phrase]) => (
                  <button key={label} type="button" className="chip" aria-pressed={hasPhrase(prompt, phrase)} title={phrase}
                    onClick={() => setPrompt((p) => togglePhrase(p, phrase))}>{label}</button>
                ))}
              </div>
              {history.length > 0 && (
                <>
                  <span className="prompt-tools-label" style={{ marginTop: 6 }}><History size={13} />Đã dùng gần đây</span>
                  <div className="prompt-history">
                    {history.map((h) => (
                      <button key={h} type="button" title={h} onClick={() => setPrompt(h)}>{h}</button>
                    ))}
                  </div>
                </>
              )}
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
        <div className="viewport" ref={vpRef} data-scene={version?.glbUrl ? stageScene : 'studio'}>
          {version?.glbUrl ? (
            <>
              <Viewer3D ref={viewer} url={version.glbUrl} mode={renderMode} grid={grid} bbox={bbox} autoRotate={autoRotate && recordPct === null} studioLight={light}
                fallbackImage={version.thumbnailUrl} onStats={setStats} scene={stageScene} lightAngle={lightAngle} />
              {compare && sourceImg && (
                <div className="vp-compare" style={{ '--x': `${comparePos}%` } as CSSProperties}>
                  <div className="vp-compare-img"><AuthedImg src={sourceImg.url} alt="Ảnh gốc" /></div>
                  <span className="vp-compare-tag l">Ảnh gốc</span>
                  <span className="vp-compare-tag r">Mô hình 3D</span>
                  <div className="vp-compare-handle" role="slider" tabIndex={0} aria-label="Vị trí so sánh" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(comparePos)}
                    onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); dragCompare(e); }}
                    onPointerMove={dragCompare}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowLeft') { e.stopPropagation(); setComparePos((x) => Math.max(2, x - 4)); }
                      if (e.key === 'ArrowRight') { e.stopPropagation(); setComparePos((x) => Math.min(98, x + 4)); }
                    }}>
                    <span><ChevronsLeftRight size={16} /></span>
                  </div>
                </div>
              )}
              {recordPct !== null && (
                <div className="vp-rec" aria-live="polite">
                  <span className="dot" />REC · đang quay 360°
                  <span className="vp-rec-bar"><i style={{ width: `${recordPct}%` }} /></span>
                  <span className="tabular">{recordPct}%</span>
                </div>
              )}
              {showKeys && (
                <div className="vp-keys" aria-label="Phím tắt khung xem">
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                    <b>Phím tắt</b>
                    <button className="icon-btn" aria-label="Đóng" onClick={() => setShowKeys(false)}><X size={14} /></button>
                  </div>
                  <dl>
                    {VIEWER_KEYS.map(([k, d]) => <div key={k}><dt><kbd>{k}</kbd></dt><dd>{d}</dd></div>)}
                  </dl>
                </div>
              )}
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
                {sourceImg && <button className={`icon-btn${compare ? ' on' : ''}`} title="So sánh với ảnh gốc (C)" aria-label="So sánh với ảnh gốc" aria-pressed={compare} onClick={() => setCompare((v) => !v)}><Columns2 size={17} /></button>}
                <button className="icon-btn" title="Chụp ảnh màn hình (P)" aria-label="Chụp ảnh" onClick={screenshot}><Camera size={17} /></button>
                <button className={`icon-btn${recordPct !== null ? ' on rec' : ''}`} title="Quay video xoay 360° (V)" aria-label="Quay video 360°" disabled={recordPct !== null} onClick={() => void recordVideo()}><Video size={17} /></button>
                <button className="icon-btn" title="Toàn màn hình (F)" aria-label="Toàn màn hình" onClick={fullscreen}><Maximize size={17} /></button>
                <button className={`icon-btn${showKeys ? ' on' : ''}`} title="Phím tắt (?)" aria-label="Phím tắt" aria-pressed={showKeys} onClick={() => setShowKeys((v) => !v)}><Keyboard size={17} /></button>
              </div>
              <div className="vp-bottom">
                <div className="vp-left">
                <div className="vp-modes" role="group" aria-label="Chế độ hiển thị">
                  {([['textured', 'Vật liệu'], ['clay', 'Đất sét'], ['wireframe', 'Khung lưới']] as const).map(([k, l]) => (
                    <button key={k} aria-pressed={renderMode === k} onClick={() => setRenderMode(k)}>{l}</button>
                  ))}
                </div>
                <div className="vp-scenes" role="group" aria-label="Bối cảnh trưng bày">
                  {STAGE_SCENES.map((s) => (
                    <button key={s.id} type="button" aria-pressed={stageScene === s.id} aria-label={`Bối cảnh ${s.label}`} title={s.label}
                      style={{ background: s.swatch }} onClick={() => pickScene(s.id)} />
                  ))}
                </div>
                <label className="vp-light" title="Xoay nguồn sáng quanh mô hình ([ ]) · nhấp đúp để đặt lại">
                  <Sun size={14} style={{ transform: `rotate(${lightAngle}deg)` }} />
                  <input type="range" min={-180} max={180} step={5} value={lightAngle} aria-label="Góc nguồn sáng"
                    onChange={(e) => setLightAngle(Number(e.target.value))} onDoubleClick={() => setLightAngle(0)} />
                </label>
                </div>
                <span className="vp-stats tabular">{num(stats?.vertices ?? ms?.vertices)} đỉnh · {num(stats?.triangles ?? ms?.triangles)} tam giác</span>
              </div>
            </>
          ) : version && !version.glbUrl && version.label.includes('3D Studio') ? (
            <div className="vp-overlay">
              <div className="box">
                <Cuboid size={40} color="var(--ai-primary)" style={{ margin: '0 auto' }} />
                <h3>{version.label} được lưu từ 3D Studio</h3>
                <p className="muted">Phiên bản này là cảnh chỉnh sửa trong 3D Studio (không phải tệp GLB), nên mở bằng trình chỉnh sửa để xem và sửa tiếp.</p>
                <a className="btn primary" style={{ marginTop: 12 }} href={`/studio/#/studio/${version.projectId}`}>Mở trong 3D Studio</a>
              </div>
            </div>
          ) : primaryActive ? (
            <>
              {(() => { const src = detail?.images.find((i) => i.id === primaryActive.imageIds[0]); return src ? <AuthedImg className="vp-src-img" src={src.url} alt="" /> : null; })()}
              <GeneratingStage progress={primaryActive.progress} />
              <div className="vp-caption" aria-live="polite">
                <span className="eyebrow">AI đang dựng mô hình</span>
                <h3>{project?.title} đang thành hình</h3>
                <p>{TASK_STATUS[primaryActive.status].label}{primaryActive.status === 'RUNNING' ? ` · ${primaryActive.progress}%` : ''}</p>
                <Progress value={primaryActive.progress} indeterminate={primaryActive.status !== 'RUNNING'} />
              </div>
            </>
          ) : detail && detail.tasks[0] && ['FAILED', 'ASSET_ERROR', 'CANCELLED'].includes(detail.tasks[0].status) ? (
            <div className="vp-overlay">
              <div className="box">
                <AlertTriangle size={36} color="var(--ai-danger)" style={{ margin: '0 auto' }} />
                <h3>{TASK_STATUS[detail.tasks[0].status].label}</h3>
                <p className="muted">{detail.tasks[0].errorMessage || 'Tác vụ đã dừng.'}{detail.tasks[0].status !== 'ASSET_ERROR' && ' Credit đã được hoàn lại.'}</p>
                <p className="muted small">Mã hỗ trợ: {detail.tasks[0].id}</p>
                <p className="small">Điều chỉnh ảnh hoặc cấu hình bên trái rồi Generate lại.</p>
              </div>
            </div>
          ) : projectId && !detail ? (
            <div className="vp-overlay"><div className="box"><span className="spinner" style={{ margin: '0 auto' }} /><p className="muted">Đang mở dự án…</p></div></div>
          ) : (
            <>
            <EmptyStage />
            <div className="vp-caption">
              <div>
                {(mode !== 'text' && images[0]) || (mode === 'text' && prompt.trim().length >= 3) ? (
                  <>
                    <span className="eyebrow">Sẵn sàng tạo</span>
                    <div className="vp-ready">
                      {mode !== 'text' && images[0]
                        ? <AuthedImg className="vp-ready-img" src={images[0].url} alt={images[0].name} />
                        : <span className="vp-ready-quote">“{prompt.trim().slice(0, 90)}{prompt.trim().length > 90 ? '…' : ''}”</span>}
                      <div>
                        <h3>Bấm <span className="grad-text">Generate</span> để dựng</h3>
                        <p>{blocker ?? 'Mọi thứ đã sẵn sàng. Mô hình sẽ hiện hình ngay trên bệ này.'}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="eyebrow">{mode === 'text' ? 'Văn bản' : 'Ảnh'} → Mô hình 3D</span>
                    <h3>Imagine it. <span className="grad-text">Make it 3D.</span></h3>
                    <p>{mode === 'text' ? 'Mô tả vật thể ở bảng bên trái' : 'Tải một ảnh vật thể ở bảng bên trái'}, chọn cấu hình và bấm Generate. Mô hình sẽ hiện hình ngay trên bệ này để bạn xoay, phóng to và kiểm tra.</p>
                  </>
                )}
                {provider === 'unconfigured' && <div className="banner warning" style={{ textAlign: 'left', marginTop: 16 }}><AlertTriangle size={16} style={{ flex: 'none' }} /><span>Máy chủ <b>chưa cấu hình nhà cung cấp AI</b> (Meshy) nên chưa tạo được mô hình mới. Bạn vẫn xem được các mô hình đã có.</span></div>}
                {provider === 'mock' && <div className="banner warning" style={{ textAlign: 'left', marginTop: 16 }}><AlertTriangle size={16} style={{ flex: 'none' }} /><span>Đang ở <b>chế độ mô phỏng</b>: chưa cấu hình <code>MESHY_API_KEY</code> nên kết quả là mô hình mẫu, không gọi Meshy.</span></div>}
              </div>
            </div>
            </>
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
        {detail && <div className="panel-title"><h2>Thuộc tính mô hình</h2></div>}
        {!detail ? (
          projectId ? <div className="skeleton" style={{ height: 240 }} /> : <Inspiration mode={mode} busy={sampleBusy} onSample={pickSample} onPrompt={pickPrompt} />
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
                  <p className="label" style={{ fontWeight: 600, color: 'var(--ai-text)' }}>Hiển thị không gian</p>
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
            <div className="row"><b className="grow">Tổng chi phí</b><b style={{ color: 'var(--ai-primary)' }}>{num(estimate.total)} tín dụng</b></div>
            <div className="row small"><span className="grow muted">Số dư hiện có</span><span>{num(estimate.balance)} tín dụng</span></div>
            {!estimate.sufficient && <div className="banner danger"><span>Không đủ tín dụng. <Link to="/credits">Nạp thêm tín dụng</Link></span></div>}
            <div className="banner info">Tín dụng được giữ khi gửi tác vụ và chỉ bị trừ khi mô hình được lưu thành công. Tác vụ lỗi hoặc bị hủy sẽ được hoàn tín dụng.</div>
          </div>
        </Modal>
      )}
    </div>
  );
}
