import { Component, Suspense, forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Grid, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useAuthedUrl } from '../lib/authed';

export type RenderMode = 'textured' | 'clay' | 'wireframe';
export type ViewerHandle = { reset: () => void; screenshot: () => string | null };
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
};

const TARGET_SIZE = 2;
const clayMat = new THREE.MeshStandardMaterial({ color: '#c9ced8', roughness: 0.72, metalness: 0.02 });
const wireMat = new THREE.MeshBasicMaterial({ color: '#72d6f7', wireframe: true, transparent: true, opacity: 0.55 });

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

  useLayoutEffect(() => {
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.material = mode === 'clay' ? clayMat : mode === 'wireframe' ? wireMat : m.userData.original;
    });
  }, [root, mode]);

  const helper = useMemo(() => {
    const b = new THREE.Box3(
      new THREE.Vector3(-fit.size.x / 2, 0, -fit.size.z / 2).multiplyScalar(fit.s),
      new THREE.Vector3(fit.size.x / 2, fit.size.y, fit.size.z / 2).multiplyScalar(fit.s),
    );
    return new THREE.Box3Helper(b, new THREE.Color('#a78bfa'));
  }, [fit]);

  return (
    <group>
      <group scale={fit.s} position={[-fit.center.x * fit.s, -(fit.center.y - fit.size.y / 2) * fit.s, -fit.center.z * fit.s]}>
        <primitive object={root} />
      </group>
      {bbox && <primitive object={helper} />}
    </group>
  );
}

function Env({ on }: { on: boolean }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    if (!on) { scene.environment = null; return; }
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.6;
    return () => { scene.environment = null; env.dispose(); pm.dispose(); };
  }, [gl, scene, on]);
  return null;
}

const CameraRig = forwardRef<ViewerHandle, { height: number }>(function CameraRig({ height }, ref) {
  const { camera, gl } = useThree();
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const reset = () => {
    const h = height || 1.5;
    camera.position.set(3.3, h * 0.7 + 1.1, 4.4);
    controls?.target.set(0, h / 2, 0);
    controls?.update();
  };
  useEffect(reset, [height, controls]); // eslint-disable-line react-hooks/exhaustive-deps
  useImperativeHandle(ref, () => ({
    reset,
    screenshot: () => { try { return gl.domElement.toDataURL('image/png'); } catch { return null; } },
  }));
  return null;
});

function Loading() {
  return (
    <Html center>
      <div className="row" style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}><div className="spinner" /> Đang tải mô hình…</div>
    </Html>
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
        gl={{ preserveDrawingBuffer: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        camera={{ position: [2.6, 2, 3.4], fov: 38, near: 0.01, far: 200 }}
        dpr={[1, 2]}
        style={{ position: 'absolute', inset: 0 }}
      >
        <hemisphereLight intensity={p.studioLight ? 0.25 : 0.55} groundColor="#141a24" />
        <directionalLight position={[3, 5, 4]} intensity={p.studioLight ? 1.0 : 1.5} />
        <directionalLight position={[-4, 2.5, -3]} intensity={0.6} color="#a78bfa" />
        <directionalLight position={[0, 3, -5]} intensity={0.4} color="#72d6f7" />
        <Env on={p.studioLight} />
        <Suspense fallback={<Loading />}>
          <Model
            url={model.src}
            mode={p.mode}
            bbox={p.bbox}
            onStats={p.onStats}
            onReady={setH}
          />
          <ContactShadows position={[0, 0.001, 0]} opacity={0.55} scale={6} blur={2.4} far={3} />
        </Suspense>
        {p.grid && (
          <>
            <Grid position={[0, -0.002, 0]} args={[20, 20]} cellSize={0.25} cellThickness={0.6} cellColor="#243042" sectionSize={1} sectionThickness={1} sectionColor="#2f4156" fadeDistance={14} infiniteGrid />
            <axesHelper args={[0.6]} />
          </>
        )}
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} autoRotate={p.autoRotate} autoRotateSpeed={1.2} minDistance={0.5} maxDistance={20} />
        <CameraRig ref={rigRef} height={h} />
      </Canvas>
    </ViewerBoundary>
  );
});

