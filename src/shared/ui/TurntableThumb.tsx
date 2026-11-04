import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/**
 * Ảnh xem trước dạng "bàn xoay": `src` là một dải ảnh ngang gồm `frames` khung, mỗi khung là
 * mô hình ở một góc xoay. Đứng yên hiện khung đầu; rê chuột (hoặc `spinning`) thì quay vòng các khung.
 */
export const TURNTABLE_FRAMES = 12;

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

type Props = {
  src: string | null;
  frames?: number;
  alt: string;
  /** Hiện khi chưa có ảnh (đang chụp) — mặc định là khung shimmer. */
  placeholder?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Ép quay (vd. khi thẻ cha đang được rê chuột). */
  spinning?: boolean;
};

export function TurntableThumb({ src, frames = TURNTABLE_FRAMES, alt, placeholder, className, style, spinning }: Props) {
  const [hover, setHover] = useState(false);
  const [frame, setFrame] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const active = (hover || !!spinning) && !!src && !reduced();
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!active) { setFrame(0); return; }
    timer.current = window.setInterval(() => setFrame((f) => (f + 1) % frames), 85);
    return () => window.clearInterval(timer.current);
  }, [active, frames]);

  // Tải trước dải ảnh để hiệu ứng hiện dần chỉ chạy khi ảnh đã sẵn sàng
  useEffect(() => {
    setLoaded(false);
    if (!src) return;
    let alive = true;
    const img = new Image();
    img.onload = () => { if (alive) setLoaded(true); };
    img.src = src;
    return () => { alive = false; };
  }, [src]);

  return (
    <div
      className={`turntable${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={alt}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', width: '100%', height: '100%', ...style }}
    >
      {src && (
        <div
          style={{
            position: 'absolute', inset: 0, backgroundImage: `url("${src}")`, backgroundRepeat: 'no-repeat',
            backgroundSize: `${frames * 100}% 100%`, backgroundPosition: `${(frame / (frames - 1)) * 100}% 0`,
            opacity: loaded ? 1 : 0, transform: loaded ? 'none' : 'scale(.96)',
            transition: 'opacity .45s ease, transform .6s cubic-bezier(.2,.7,.2,1)',
          }}
        />
      )}
      {!loaded && (placeholder ?? <div className="tt-shimmer" />)}
    </div>
  );
}

let styled = false;
/** CSS nhỏ cho shimmer — chèn một lần, để module nào dùng cũng có (tên lớp có tiền tố riêng). */
function ensureStyles() {
  if (styled || typeof document === 'undefined') return;
  styled = true;
  const el = document.createElement('style');
  el.textContent = `
.tt-shimmer{position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.65) 50%,transparent 70%);background-size:220% 100%;animation:tt-shimmer 1.4s linear infinite}
@keyframes tt-shimmer{from{background-position:120% 0}to{background-position:-120% 0}}
@media (prefers-reduced-motion: reduce){.tt-shimmer{animation:none}}`;
  document.head.appendChild(el);
}
ensureStyles();

/** Ghép các khung thành một dải ngang rồi xuất data URL — WebP nếu trình duyệt hỗ trợ. */
export function stitchFrames(frame: (i: number) => CanvasImageSource, count: number, w: number, h: number): string {
  const strip = document.createElement('canvas');
  strip.width = w * count;
  strip.height = h;
  const ctx = strip.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D không khả dụng');
  for (let i = 0; i < count; i++) ctx.drawImage(frame(i), i * w, 0, w, h);
  const webp = strip.toDataURL('image/webp', 0.82);
  return webp.startsWith('data:image/webp') ? webp : strip.toDataURL('image/png');
}
