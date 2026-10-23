import { useState } from 'react';
import { ChevronDown, SlidersHorizontal, Sparkles } from 'lucide-react';
import type { ConfigOptions, Estimate, GenConfig } from '../lib/api';
import { num } from '../lib/format';
import { Segmented, SelectField, Switch, TextField } from './ui';

export type Preset = 'fast' | 'balanced' | 'high' | 'custom';

export const DEFAULT_CONFIG: GenConfig = {
  aiModel: 'latest',
  shouldTexture: true,
  enablePbr: true,
  textureResolution: '2k',
  texturePrompt: '',
  geometryResolution: 'standard',
  shouldRemesh: false,
  topology: 'triangle',
  targetPolycount: 30000,
  poseMode: '',
  imageEnhancement: true,
  removeLighting: true,
  moderation: false,
  targetFormats: ['glb', 'stl', 'obj', 'fbx', 'usdz'],
};

const POLY = [
  { value: '10000', label: 'Thấp' },
  { value: '30000', label: 'Vừa' },
  { value: '100000', label: 'Cao' },
  { value: 'custom', label: 'Tùy chỉnh' },
];
const FORMATS = ['glb', 'stl', 'obj', 'fbx', 'usdz', '3mf'];

type Props = {
  options: ConfigOptions | null;
  mode: 'single' | 'multi';
  cfg: GenConfig;
  setCfg: (c: GenConfig) => void;
  preset: Preset;
  setPreset: (p: Preset) => void;
  variants: number;
  setVariants: (n: number) => void;
  title: string;
  setTitle: (t: string) => void;
  showTitle: boolean;
  consent: boolean;
  setConsent: (v: boolean) => void;
  estimate: Estimate | null;
  estimateError: string | null;
  blocker: string | null;
  busy: boolean;
  onGenerate: () => void;
};

export function GeneratePanel(p: Props) {
  const [advanced, setAdvanced] = useState(false);
  const model = p.options?.models.find((m) => m.id === p.cfg.aiModel);
  const set = (patch: Partial<GenConfig>) => { p.setCfg({ ...p.cfg, ...patch }); p.setPreset('custom'); };
  const applyPreset = (k: Preset) => {
    p.setPreset(k);
    if (k !== 'custom' && p.options) {
      const pr = p.options.presets[k];
      let geo = pr.geometryResolution;
      if (p.mode === 'multi' && geo === '4k') geo = '2k';
      p.setCfg({ ...p.cfg, ...pr, geometryResolution: geo, enablePbr: k === 'fast' ? false : p.cfg.enablePbr });
    }
  };
  const genKind = !p.cfg.shouldTexture ? 'mesh' : p.cfg.enablePbr ? 'pbr' : 'tex';
  const polyValue = POLY.some((x) => x.value === String(p.cfg.targetPolycount)) ? String(p.cfg.targetPolycount) : 'custom';
  const [customPoly, setCustomPoly] = useState(polyValue === 'custom');
  const geoOptions = (model?.geometryResolutions || ['standard']).filter((g) => !(p.mode === 'multi' && g === '4k'));

  return (
    <div className="stack lg">
      <SelectField label="Mô hình AI" value={p.cfg.aiModel} onChange={(e) => {
        const m = p.options?.models.find((x) => x.id === e.target.value);
        const tex = m?.textureResolutions.includes(p.cfg.textureResolution) ? p.cfg.textureResolution : '2k';
        const geo = m?.geometryResolutions.includes(p.cfg.geometryResolution) ? p.cfg.geometryResolution : 'standard';
        set({ aiModel: e.target.value, textureResolution: tex, geometryResolution: geo });
      }}>
        {p.options?.models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
      </SelectField>

      <div>
        <p className="label">Chất lượng</p>
        <Segmented<Preset> value={p.preset} onChange={applyPreset} label="Chất lượng" options={[
          { value: 'fast', label: 'Nhanh' }, { value: 'balanced', label: 'Cân bằng' }, { value: 'high', label: 'Cao' },
        ]} />
        {p.preset === 'custom' && <div className="field-hint">Đang dùng cấu hình tùy chỉnh.</div>}
      </div>

      <SelectField label="Kiểu tạo" value={genKind} onChange={(e) => {
        const v = e.target.value;
        set({ shouldTexture: v !== 'mesh', enablePbr: v === 'pbr' });
      }}>
        <option value="mesh">Chỉ Mesh (không texture)</option>
        <option value="tex">Mesh + Texture</option>
        <option value="pbr">Mesh + Texture · PBR</option>
      </SelectField>

      {p.cfg.shouldTexture && (
        <div>
          <p className="label">Độ phân giải Texture</p>
          <Segmented value={p.cfg.textureResolution} onChange={(v) => set({ textureResolution: v })} label="Độ phân giải texture"
            options={['2k', '4k', '8k'].map((r) => ({
              value: r, label: r.toUpperCase(),
              disabled: !model?.textureResolutions.includes(r),
              title: !model?.textureResolutions.includes(r) ? `${model?.label} không hỗ trợ ${r.toUpperCase()}` : undefined,
            }))} />
          {model && model.textureResolutions.length < 3 && <div className="field-hint warn">* Một số mức không được {model.label} hỗ trợ nên bị vô hiệu hóa.</div>}
        </div>
      )}

      <div>
        <button className="btn ghost block" style={{ justifyContent: 'space-between', padding: '0 4px' }} onClick={() => setAdvanced((a) => !a)} aria-expanded={advanced}>
          <span className="row" style={{ gap: 10, fontWeight: 500 }}><SlidersHorizontal size={16} />Cài đặt nâng cao</span>
          <ChevronDown size={16} style={{ transform: advanced ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
        </button>
        {advanced && (
          <div className="stack" style={{ marginTop: 12 }}>
            <div>
              <p className="label">Độ phân giải hình học</p>
              <Segmented value={p.cfg.geometryResolution} onChange={(v) => set({ geometryResolution: v })} label="Hình học"
                options={['standard', '2k', '4k'].map((g) => ({ value: g, label: g === 'standard' ? 'Chuẩn' : g.toUpperCase(), disabled: !geoOptions.includes(g) }))} />
              {p.cfg.geometryResolution !== 'standard' && <div className="field-hint">+5 tín dụng cho hình học chi tiết cao.</div>}
            </div>
            <Switch label="Tối ưu lưới (Remesh)" desc="Kiểm soát số đa giác và cấu trúc lưới" checked={p.cfg.shouldRemesh} onChange={(v) => set({ shouldRemesh: v })} />
            {p.cfg.shouldRemesh && (
              <>
                <div>
                  <p className="label">Mức đa giác mục tiêu</p>
                  <Segmented value={customPoly ? 'custom' : polyValue} label="Mức đa giác" options={POLY} onChange={(v) => {
                    if (v === 'custom') setCustomPoly(true);
                    else { setCustomPoly(false); set({ targetPolycount: Number(v) }); }
                  }} />
                </div>
                {customPoly && (
                  <TextField label="Số đa giác" type="number" min={100} max={300000} step={1000} suffix="mặt"
                    value={p.cfg.targetPolycount} onChange={(e) => set({ targetPolycount: Number(e.target.value) })}
                    error={p.cfg.targetPolycount < 100 || p.cfg.targetPolycount > 300000 ? 'Trong khoảng 100 – 300.000' : undefined} />
                )}
                <SelectField label="Cấu trúc Mesh" value={p.cfg.topology} onChange={(e) => set({ topology: e.target.value as GenConfig['topology'] })}>
                  <option value="triangle">Tam giác</option>
                  <option value="quad">Tứ giác (Quad)</option>
                </SelectField>
              </>
            )}
            <SelectField label="Tư thế" value={p.cfg.poseMode} onChange={(e) => set({ poseMode: e.target.value as GenConfig['poseMode'] })}>
              <option value="">Giữ tư thế gốc</option>
              <option value="a-pose">A-pose (nhân vật)</option>
              <option value="t-pose">T-pose (nhân vật)</option>
            </SelectField>
            {p.cfg.shouldTexture && (
              <label className="field">
                <span>Mô tả texture (không bắt buộc)</span>
                <textarea maxLength={800} placeholder="VD: kim loại xước, sơn trắng mờ, chi tiết cam" value={p.cfg.texturePrompt} onChange={(e) => set({ texturePrompt: e.target.value })} />
              </label>
            )}
            {p.cfg.aiModel !== 'meshy-6-lite' && (
              <>
                <Switch label="Tăng cường ảnh" desc="Tối ưu ảnh đầu vào trước khi dựng" checked={p.cfg.imageEnhancement} onChange={(v) => set({ imageEnhancement: v })} />
                <Switch label="Loại bỏ ánh sáng trên texture" checked={p.cfg.removeLighting} onChange={(v) => set({ removeLighting: v })} />
              </>
            )}
            <div>
              <p className="label">Định dạng đầu ra</p>
              <div className="row wrap" style={{ gap: 14 }}>
                {FORMATS.map((f) => (
                  <label key={f} className="check">
                    <input type="checkbox" checked={p.cfg.targetFormats.includes(f)} disabled={f === 'glb'}
                      onChange={(e) => set({ targetFormats: e.target.checked ? [...p.cfg.targetFormats, f] : p.cfg.targetFormats.filter((x) => x !== f) })} />
                    {f.toUpperCase()}
                  </label>
                ))}
              </div>
              <div className="field-hint">GLB luôn được tạo để hiển thị trong trình xem 3D.</div>
            </div>
            <Switch label="Kiểm duyệt nội dung" desc="Từ chối ảnh vi phạm chính sách" checked={p.cfg.moderation} onChange={(v) => set({ moderation: v })} />
          </div>
        )}
      </div>

      <div>
        <p className="label">Số biến thể</p>
        <Segmented value={String(p.variants)} onChange={(v) => p.setVariants(Number(v))} label="Số biến thể" options={['1', '2', '3'].map((v) => ({ value: v, label: v }))} />
        <div className="field-hint">Mỗi biến thể là một lần tạo riêng, lưu thành một phiên bản.</div>
      </div>

      {p.showTitle && <TextField label="Tên dự án" placeholder="VD: Robot thám hiểm Atlas" value={p.title} maxLength={80} onChange={(e) => p.setTitle(e.target.value)} />}

      <label className="check">
        <input type="checkbox" checked={p.consent} onChange={(e) => p.setConsent(e.target.checked)} />
        <span>Tôi xác nhận có quyền sử dụng ảnh này và tuân thủ chính sách nội dung của 3DWorld.</span>
      </label>

      <div className="stack" style={{ gap: 10 }}>
        <div className="row small">
          <span className="muted grow">Chi phí dự kiến</span>
          {p.estimate ? (
            <b style={{ color: p.estimate.sufficient ? 'var(--primary)' : 'var(--danger)' }}>{num(p.estimate.total)} tín dụng</b>
          ) : <span className="muted">—</span>}
        </div>
        {p.estimateError && <div className="field-hint err">{p.estimateError}</div>}
        <button className="btn grad block" onClick={p.onGenerate} disabled={!!p.blocker || p.busy || !p.estimate}>
          {p.busy ? <span className="spinner" /> : <Sparkles size={18} />}
          {p.variants > 1 ? `Generate ${p.variants} biến thể` : 'Generate mô hình'}
        </button>
        <div className="small muted" style={{ textAlign: 'center', minHeight: 18 }}>{p.blocker || 'Credit chỉ bị trừ khi mô hình tạo thành công.'}</div>
      </div>
    </div>
  );
}
