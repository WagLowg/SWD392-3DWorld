/**
 * [Giải thích] Cột "Cảm hứng" khi chưa có dự án: ảnh mẫu bấm là dùng, câu mô tả gợi ý, mẹo chụp ảnh.
 */
import { useEffect, useState } from 'react';
import { Camera, Lightbulb, Sun, Wand2, Type } from 'lucide-react';
import { SAMPLES, sampleImage, type Sample } from '../lib/sampleImages';

/**
 * Cột "Cảm hứng" khi chưa có dự án: ảnh mẫu bấm là dùng, gợi ý câu mô tả cho chế độ văn bản, mẹo chụp ảnh.
 * Thay cho dòng chữ "Thông tin sẽ hiển thị sau khi tạo" — đúng lúc người dùng cần gợi ý nhất.
 */
export const PROMPT_IDEAS: { label: string; prompt: string }[] = [
  { label: 'Gấu phi hành gia', prompt: 'A cute astronaut teddy bear toy, glossy helmet, smooth vinyl, pastel colors' },
  { label: 'Rồng chibi', prompt: 'A chibi baby dragon figurine holding a tiny sword, big eyes, stylized' },
  { label: 'Rương kho báu', prompt: 'A vintage wooden treasure chest with brass lock and carved floral details' },
  { label: 'Chậu cây hình mèo', prompt: 'A ceramic succulent pot shaped like a sleeping cat, matte glaze' },
  { label: 'Mũ phi công sci-fi', prompt: 'A sci-fi pilot helmet with glowing visor and panel details' },
  { label: 'Cáo low-poly', prompt: 'A low-poly fox figurine sitting with its tail wrapped around' },
];

function SampleTile({ sample, busy, onPick }: { sample: Sample; busy: boolean; onPick: (s: Sample) => void }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    sampleImage(sample).then((u) => { if (alive) setSrc(u); }).catch(() => undefined);
    return () => { alive = false; };
  }, [sample]);
  return (
    <button type="button" className="insp-sample" onClick={() => onPick(sample)} disabled={busy || !src} title={`Dùng ảnh mẫu “${sample.label}”`}>
      <span className="insp-img" style={{ background: sample.bg }}>
        {src ? <img src={src} alt="" /> : <span className="skeleton" style={{ position: 'absolute', inset: 0 }} />}
      </span>
      <b>{sample.label}</b>
      <small>{sample.hint}</small>
    </button>
  );
}

export function Inspiration({ mode, busy, onSample, onPrompt }: {
  mode: 'single' | 'multi' | 'text';
  busy: boolean;
  onSample: (s: Sample) => void;
  onPrompt: (prompt: string) => void;
}) {
  return (
    <div className="stack lg insp">
      <div>
        <span className="eyebrow">Cảm hứng</span>
        <h3 className="insp-title">Chưa biết bắt đầu từ đâu?</h3>
        <p className="muted small" style={{ margin: 0 }}>
          {mode === 'text' ? 'Chọn một ý tưởng bên dưới, chỉnh lại theo ý bạn rồi bấm Generate.' : 'Thử ngay với một ảnh mẫu — bấm là dùng, không cần tải gì lên.'}
        </p>
      </div>

      {mode !== 'text' && (
        <div>
          <div className="label-up insp-head"><Wand2 size={13} /> Ảnh mẫu</div>
          <div className="insp-samples">
            {SAMPLES.map((s) => <SampleTile key={s.kind} sample={s} busy={busy} onPick={onSample} />)}
          </div>
        </div>
      )}

      <div>
        <div className="label-up insp-head"><Type size={13} /> Ý tưởng mô tả</div>
        <div className="insp-chips">
          {PROMPT_IDEAS.map((p) => (
            <button key={p.label} type="button" className="insp-chip" onClick={() => onPrompt(p.prompt)} title={p.prompt}>{p.label}</button>
          ))}
        </div>
      </div>

      <div className="insp-tips">
        <div className="label-up insp-head"><Lightbulb size={13} /> Mẹo cho kết quả đẹp</div>
        <p><Camera size={15} /> Một vật thể duy nhất, chụp thẳng, chiếm phần lớn khung hình.</p>
        <p><Sun size={15} /> Nền trơn, ánh sáng đều — tránh bóng gắt và vật phản chiếu.</p>
        <p><Type size={15} /> Mô tả bằng tiếng Anh: chất liệu, màu sắc, phong cách.</p>
      </div>
    </div>
  );
}
