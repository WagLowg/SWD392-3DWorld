/**
 * Pháo hoa giấy nhẹ (canvas, không thư viện) cho khoảnh khắc "xong rồi!" — vd. AI dựng xong mô hình.
 * Tự dọn sau ~2 giây; không chạy khi người dùng bật giảm chuyển động.
 */
const COLORS = ['#7955ff', '#5a8dff', '#b9a7ff', '#ff9a52', '#16a37b', '#ffe58f', '#ff9db4'];

type Piece = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; w: number; h: number; color: string; shape: 0 | 1 };

export function confetti(opts: { x?: number; y?: number; count?: number } = {}) {
  if (typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: '3000' });
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return; }
  ctx.scale(dpr, dpr);

  const ox = opts.x ?? innerWidth / 2;
  const oy = opts.y ?? innerHeight * 0.45;
  const pieces: Piece[] = Array.from({ length: opts.count ?? 140 }, () => {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
    const speed = 7 + Math.random() * 9;
    return {
      x: ox, y: oy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
      w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
      color: COLORS[(Math.random() * COLORS.length) | 0], shape: Math.random() < 0.3 ? 1 : 0,
    };
  });

  const start = performance.now();
  const DURATION = 2200;
  const frame = (now: number) => {
    const t = now - start;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const fade = Math.max(0, 1 - Math.max(0, t - DURATION * 0.6) / (DURATION * 0.4));
    for (const p of pieces) {
      p.vy += 0.32; // trọng lực
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)) + 2);
      ctx.restore();
    }
    if (t < DURATION) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
