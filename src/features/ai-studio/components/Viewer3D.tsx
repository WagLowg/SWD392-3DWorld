import { Component, Suspense, forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Grid, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useAuthedUrl } from '../lib/authed';
import { Pedestal, StageLights, StudioEnv, VIOLET, fitDistance, reducedMotion, type StageScene } from './Stage';

export type RenderMode = 'textured' | 'clay' | 'wireframe';
export type ViewerHandle = {
  reset: () => void;
  screenshot: () => string | null;
  /** Quay video mô hình xoay 360° (WebM). Trả null nếu trình duyệt không hỗ trợ. */
  record: (seconds: number, onProgress?: (pct: number) => void) => Promise<Blob | null>;
};

/** Trình duyệt có quay được video từ canvas không. */
export const canRecord = () =>
  typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function';
export type ViewerStats = { vertices: number; triangles: number; size: [number, number, number] };

type Props = {
  url: string;
  mode: RenderMode;
  grid: boolean;
  bbox: boolean;
  autoRotate: boolean;
  studioLight: boolean;
  fallbackImage?: string | null;
  onStats?: (s: ViewerStats) => void;
  /** Bối cảnh trưng bày (màu ánh sáng); nền do CSS [data-scene] của .viewport */
  scene?: StageScene;
  /** Góc xoay của nguồn sáng quanh mô hình (độ). */
  lightAngle?: number;
};

/** Nền vẽ kèm khi chụp ảnh / quay video (canvas trong suốt, nền thật nằm ở CSS). */
const BG: Record<StageScene, [string, string, string]> = {
  studio: ['#eee8ff', '#d4e2ff', 'rgba(255,255,255,.75)'],
  sunset: ['#fff1e2', '#ffbd8a', 'rgba(255,255,255,.6)'],
  night: ['#2b2a55', '#121329', 'rgba(121,85,255,.38)'],
  paper: ['#ffffff', '#eceaf2', 'rgba(255,255,255,.8)'],
};

function composite(src: HTMLCanvasElement, scene: StageScene, out: HTMLCanvasElement) {
  if (out.width !== src.width) out.width = src.width;
  if (out.height !== src.height) out.height = src.height;
  const ctx = out.getContext('2d');
  if (!ctx) return out;
  const { width: w, height: h } = out;
  const [a, b, glow] = BG[scene];
  const lin = ctx.createLinearGradient(0, 0, 0, h);
  lin.addColorStop(0, a);
  lin.addColorStop(1, b);
  ctx.fillStyle = lin;
  ctx.fillRect(0, 0, w, h);
  const rad = ctx.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h * 0.4, Math.max(w, h) * 0.55);
  rad.addColorStop(0, glow);
  rad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(src, 0, 0);
  // Dấu nhỏ ở góc: ảnh/video chia sẻ ra ngoài vẫn nhận ra từ 3DWorld
  const fs = Math.max(12, Math.round(h * 0.022));
  ctx.font = `600 ${fs}px "Space Grotesk", system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillStyle = scene === 'night' ? 'rgba(255,255,255,.6)' : 'rgba(32,32,39,.45)';
  ctx.fillText('3DWorld · AI Studio', w - fs, h - fs);
  return out;
}

const TARGET_SIZE = 2;
const clayMat = new THREE.MeshStandardMaterial({ color: '#e4defa', roughness: 0.62, metalness: 0.02 });
const wireMat = new THREE.MeshBasicMaterial({ color: VIOLET, wireframe: true, transparent: true, opacity: 0.5 });

/** Hiệu ứng "hiện hình" mỗi khi mở một mô hình: khung lưới mọc từ dưới lên → đất sét → vật liệu thật. */
type Phase = 'build' | 'clay' | 'done';
const BUILD_MS = 1400;
const CLAY_MS = 900;
const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
const ease = (x: number) => 1 - (1 - x) ** 3;

function Model({ url, mode, bbox, onStats, onReady }: { url: string; mode: RenderMode; bbox: boolean; onStats?: Props['onStats']; onReady: (h: number) => void }) {
  const { scene } = useGLTF(url);
  const root = useMemo(() => scene.clone(true), [scene]);

  // Chuẩn hóa: đặt mô hình vào khung TARGET_SIZE, tâm XZ = 0, đáy chạm mặt đất
  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = TARGET_SIZE / Math.max(size.x, size.y, size.z, 1e-6);
    let vertices = 0;
    let triangles = 0;
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        const g = m.geometry;
        vertices += g.attributes.position?.count || 0;
        triangles += (g.index ? g.index.count : g.attributes.position?.count || 0) / 3;
        m.userData.original ??= m.material;
      }
    });
    return { s, center, size, vertices, triangles: Math.round(triangles) };
  }, [root]);

  // Gọi callback qua ref để effect chỉ chạy khi mô hình đổi (tránh vòng lặp render)
  const cb = useRef({ onStats, onReady });
  cb.current = { onStats, onReady };
  useEffect(() => {
    cb.current.onStats?.({ vertices: fit.vertices, triangles: fit.triangles, size: [fit.size.x, fit.size.y, fit.size.z] });
    cb.current.onReady(fit.size.y * fit.s);
  }, [fit]);

  const [phase, setPhase] = useState<Phase>(() => (reducedMotion() ? 'done' : 'build'));
  const startedAt = useRef(0);
  const gl = useThree((s) => s.gl);
  // Đồng hồ bắt đầu ở khung hình đầu tiên được vẽ (không phải lúc mount), để máy chậm
  // — biên dịch shader, parse GLB lớn — không làm người xem lỡ mất đoạn đầu hiệu ứng.
  useEffect(() => {
    startedAt.current = 0;
    clipPlane.constant = 0;
    setPhase(reducedMotion() ? 'done' : 'build');
  }, [root]);

  useLayoutEffect(() => {
    const show = phase === 'build' ? 'wireframe' : phase === 'clay' ? 'clay' : mode;
    gl.localClippingEnabled = true;
    wireMat.clippingPlanes = phase === 'build' ? [clipPlane] : null;
    wireMat.needsUpdate = true;
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.material = show === 'clay' ? clayMat : show === 'wireframe' ? wireMat : m.userData.original;
    });
  }, [root, mode, phase, gl]);

  // Vòng quét sáng chạy dọc mô hình trong lúc hiện hình
  const height = fit.size.y * fit.s;
  const scanR = Math.max(fit.size.x, fit.size.z) * fit.s * 0.62 + 0.12;
  const scan = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (phase === 'done') { if (scan.current) scan.current.visible = false; return; }
    if (!startedAt.current) startedAt.current = performance.now();
    const ms = performance.now() - startedAt.current;
    if (phase === 'build' && ms >= BUILD_MS) setPhase('clay');
    else if (phase === 'clay' && ms >= BUILD_MS + CLAY_MS) setPhase('done');
    const el = ms / 1000;
    if (phase === 'build') clipPlane.constant = ease(Math.min(1, el / (BUILD_MS / 1000))) * height * 1.02;
    if (!scan.current) return;
    scan.current.visible = true;
    scan.current.position.y = phase === 'build' ? clipPlane.constant : ease(Math.min(1, (el - BUILD_MS / 1000) / (CLAY_MS / 1000))) * height;
  });

  const helper = useMemo(() => {
    const b = new THREE.Box3(
      new THREE.Vector3(-fit.size.x / 2, 0, -fit.size.z / 2).multiplyScalar(fit.s),
      new THREE.Vector3(fit.size.x / 2, fit.size.y, fit.size.z / 2).multiplyScalar(fit.s),
    );
    return new THREE.Box3Helper(b, new THREE.Color(VIOLET));
  }, [fit]);

  return (
    <group>
      <group scale={fit.s} position={[-fit.center.x * fit.s, -(fit.center.y - fit.size.y / 2) * fit.s, -fit.center.z * fit.s]}>
        <primitive object={root} />
      </group>
      {bbox && <primitive object={helper} />}
      <mesh ref={scan} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[scanR * 0.92, scanR, 96]} />
        <meshBasicMaterial color={VIOLET} transparent opacity={0.85} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

type Recording = {
  out: HTMLCanvasElement; rec: MediaRecorder; start: number; ms: number;
  tgt: THREE.Vector3; offset: THREE.Vector3; pct: number; done: boolean; onProgress?: (pct: number) => void;
};
const Y_AXIS = new THREE.Vector3(0, 1, 0);

const CameraRig = forwardRef<ViewerHandle, { height: number; scene: StageScene }>(function CameraRig({ height, scene }, ref) {
  const { camera, gl } = useThree();
  const recording = useRef<Recording | null>(null);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const aspect = useThree((s) => s.size.width / Math.max(s.size.height, 1));
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const reset = () => {
    const h = height || 1.5;
    const k = fitDistance(1, aspect); // khung hẹp → lùi camera để mô hình nằm trọn
    camera.position.set(3.3 * k, h / 2 + (h * 0.2 + 0.85) * k, 4.4 * k);
    controls?.target.set(0, h / 2, 0);
    controls?.update();
  };
  useEffect(reset, [height, controls, aspect]); // eslint-disable-line react-hooks/exhaustive-deps
  useImperativeHandle(ref, () => ({
    reset,
    screenshot: () => {
      try { return composite(gl.domElement, sceneRef.current, document.createElement('canvas')).toDataURL('image/png'); } catch { return null; }
    },
    record: (seconds, onProgress) => new Promise<Blob | null>((resolve) => {
      if (!canRecord() || recording.current) return resolve(null);
      const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find((m) => MediaRecorder.isTypeSupported(m));
      if (!mime) return resolve(null);
      const out = composite(gl.domElement, sceneRef.current, document.createElement('canvas'));
      const rec = new MediaRecorder(out.captureStream(30), { mimeType: mime, videoBitsPerSecond: 6_000_000 });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => { recording.current = null; resolve(chunks.length ? new Blob(chunks, { type: mime.split(';')[0] }) : null); };
      const tgt = controls?.target.clone() ?? new THREE.Vector3(0, height / 2, 0);
      recording.current = { out, rec, start: performance.now(), ms: seconds * 1000, tgt, offset: camera.position.clone().sub(tgt), pct: -1, done: false, onProgress };
      rec.start(250);
    }),
  }));

  // Khi quay: tự xoay camera đúng một vòng rồi chép khung hình (kèm nền) sang canvas ghi hình.
  useFrame(() => {
    const r = recording.current;
    if (!r || r.done) return;
    const t = Math.min(1, (performance.now() - r.start) / r.ms);
    camera.position.copy(r.offset).applyAxisAngle(Y_AXIS, t * Math.PI * 2).add(r.tgt);
    camera.lookAt(r.tgt);
    composite(gl.domElement, sceneRef.current, r.out);
    const pct = Math.round(t * 100);
    if (pct !== r.pct) { r.pct = pct; r.onProgress?.(pct); }
    if (t >= 1) { r.done = true; setTimeout(() => r.rec.stop(), 120); }
  });
  return null;
});

/**
 * Chỉ báo đang tải vẽ ngay trong cảnh 3D (vòng cung xoay trên bệ).
 * Không dùng <Html> của drei: nó tạo một React root riêng, và khi Suspense xong React 19 gỡ root đó
 * giữa lúc đang render → lỗi "removeChild … not a child of this node" khi mở dự án.
 */
function Loading() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.z -= dt * 4; });
  return (
    <mesh ref={ref} position={[0, 0.9, 0]}>
      <torusGeometry args={[0.32, 0.035, 12, 64, Math.PI * 1.4]} />
      <meshBasicMaterial color={VIOLET} toneMapped={false} />
    </mesh>
  );
}

class ViewerBoundary extends Component<{ fallback: ReactNode; children: ReactNode; resetKey: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false });
  }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

const webglOk = (() => {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
})();

export const Viewer3D = forwardRef<ViewerHandle, Props>(function Viewer3D(p, ref) {
  const rigRef = useRef<ViewerHandle>(null);
  const model = useAuthedUrl(p.url);
  const preview = useAuthedUrl(p.fallbackImage);
  const [h, setH] = useState(1.5);
  useImperativeHandle(ref, () => ({
    reset: () => rigRef.current?.reset(),
    screenshot: () => rigRef.current?.screenshot() ?? null,
    record: (sec, cb) => rigRef.current?.record(sec, cb) ?? Promise.resolve(null),
  }));

  const fallback = (
    <div className="vp-overlay">
      <div className="box">
        {preview.src && <img src={preview.src} alt="Ảnh xem trước" style={{ maxHeight: 220, margin: '0 auto 12px', borderRadius: 12 }} />}
        <h3>Không hiển thị được mô hình 3D</h3>
        <p className="muted">{webglOk ? 'Tệp GLB không tải được hoặc bị lỗi. Bạn vẫn có thể xuất tệp ở trang Xuất mô hình.' : 'Trình duyệt/thiết bị không hỗ trợ WebGL. Bạn vẫn có thể tải tệp mô hình.'}</p>
      </div>
    </div>
  );
  if (!webglOk || model.error) return fallback;
  if (!model.src) return <div className="vp-overlay"><div className="box"><span className="spinner" /><p className="muted">Đang tải mô hình…</p></div></div>;

  return (
    <ViewerBoundary fallback={fallback} resetKey={model.src}>
      <Canvas
        gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
        camera={{ position: [2.6, 2, 3.4], fov: 38, near: 0.01, far: 200 }}
        dpr={[1, 2]}
        style={{ position: 'absolute', inset: 0 }}
      >
        <group rotation={[0, ((p.lightAngle ?? 0) * Math.PI) / 180, 0]}>
          <StageLights soft={p.studioLight} scene={p.scene} />
        </group>
        <StudioEnv on={p.studioLight} />
        <Pedestal />
        <Suspense fallback={<Loading />}>
          <Model
            url={model.src}
            mode={p.mode}
            bbox={p.bbox}
            onStats={p.onStats}
            onReady={setH}
          />
          <ContactShadows position={[0, 0.003, 0]} opacity={0.35} scale={6} blur={2.4} far={3} color="#4b33b8" />
        </Suspense>
        {p.grid && (
          <>
            <Grid position={[0, -0.185, 0]} args={[20, 20]} cellSize={0.25} cellThickness={0.6} cellColor="#d6cdf7" sectionSize={1} sectionThickness={1} sectionColor="#b9a7ff" fadeDistance={14} infiniteGrid />
            <axesHelper args={[0.6]} position={[0, 0.004, 0]} />
          </>
        )}
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} autoRotate={p.autoRotate} autoRotateSpeed={1.2} minDistance={0.5} maxDistance={20} />
        <CameraRig ref={rigRef} height={h} scene={p.scene ?? 'studio'} />
      </Canvas>
    </ViewerBoundary>
  );
});

