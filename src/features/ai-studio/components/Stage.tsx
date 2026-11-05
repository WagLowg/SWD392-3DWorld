/**
 * [Giải thích] "Sân khấu" 3D: bệ, ánh sáng, môi trường, các kiểu nền.
 * ParticleForge: màn chờ khi AI đang tạo, các hạt tụ dần thành khối theo % tiến độ.
 * Còn có màn trống với chú gấu của trang Landing.
 */
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Bear, FIGURE_HEIGHT } from '../../landing/three/figures';

/**
 * "Sân khấu" 3D của AI Studio theo phong cách Landing (thế giới AI Studio: tím oải hương → xanh dừa).
 * Gồm bệ trắng bóng, ánh sáng dịu, màn chờ khi AI đang dựng (đám hạt tụ thành khối)
 * và màn trống có chú gấu phi hành gia — cùng nhân vật với trang Landing.
 */

export const VIOLET = '#7955ff';
export const SKY = '#5a8dff';
export const LAVENDER = '#b9a7ff';

export const reducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Bệ tròn trắng bóng (giống đế cổng trên Landing), mặt trên ở y = 0, viền tím nhấp nháy nhẹ. */
export function Pedestal({ radius = 1.6 }: { radius?: number }) {
  const ring = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (ring.current) ring.current.opacity = 0.7 + Math.sin(clock.elapsedTime * 1.6) * 0.2;
  });
  return (
    <group>
      <mesh position={[0, -0.09, 0]} receiveShadow>
        <cylinderGeometry args={[radius, radius * 1.05, 0.18, 96]} />
        <meshPhysicalMaterial color="#f7f5ff" roughness={0.28} metalness={0} clearcoat={1} clearcoatRoughness={0.25} />
      </mesh>
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.9, radius * 0.95, 128]} />
        <meshBasicMaterial ref={ring} color={VIOLET} transparent opacity={0.8} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.181, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 1.45, 96]} />
        <meshBasicMaterial color={VIOLET} transparent opacity={0.07} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Môi trường phản chiếu (RoomEnvironment) cho vật liệu PBR. */
export function StudioEnv({ on = true, intensity = 0.6 }: { on?: boolean; intensity?: number }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    if (!on) { scene.environment = null; return; }
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = intensity;
    return () => { scene.environment = null; env.dispose(); pm.dispose(); };
  }, [gl, scene, on, intensity]);
  return null;
}

/** Bối cảnh trưng bày của trình xem: đổi nền (CSS theo data-scene trên .viewport) và màu ánh sáng. */
export type StageScene = 'studio' | 'sunset' | 'night' | 'paper';

export const STAGE_SCENES: { id: StageScene; label: string; swatch: string }[] = [
  { id: 'studio', label: 'Studio', swatch: 'linear-gradient(135deg,#eee8ff,#d4e2ff)' },
  { id: 'sunset', label: 'Hoàng hôn', swatch: 'linear-gradient(135deg,#ffe2cc,#ffb27a)' },
  { id: 'night', label: 'Ban đêm', swatch: 'linear-gradient(135deg,#2b2a55,#121329)' },
  { id: 'paper', label: 'Giấy trắng', swatch: 'linear-gradient(135deg,#ffffff,#eceaf2)' },
];

const LIGHTS: Record<StageScene, { sky: string; ground: string; hemi: number; key: string; keyI: number; rimA: string; rimAI: number; rimB: string; rimBI: number }> = {
  studio: { sky: '#ffffff', ground: '#d9d0ff', hemi: 0.95, key: '#ffffff', keyI: 1.45, rimA: LAVENDER, rimAI: 0.7, rimB: '#98c8ff', rimBI: 0.5 },
  sunset: { sky: '#fff1e2', ground: '#ffcfb0', hemi: 0.85, key: '#ffd2a8', keyI: 1.7, rimA: '#ff9a52', rimAI: 0.9, rimB: '#b9a7ff', rimBI: 0.5 },
  night: { sky: '#8fa0ff', ground: '#1b1840', hemi: 0.55, key: '#dfe6ff', keyI: 1.25, rimA: '#7955ff', rimAI: 1.4, rimB: '#3fd0ff', rimBI: 1.1 },
  paper: { sky: '#ffffff', ground: '#e9e7ef', hemi: 1.05, key: '#ffffff', keyI: 1.3, rimA: '#ffffff', rimAI: 0.4, rimB: '#ffffff', rimBI: 0.3 },
};

/** Ánh sáng dịu như Landing: trời, nền, đèn chính + hai đèn viền; màu theo bối cảnh trưng bày. */
export function StageLights({ soft = false, scene = 'studio' }: { soft?: boolean; scene?: StageScene }) {
  const l = LIGHTS[scene];
  return (
    <>
      <hemisphereLight intensity={soft ? l.hemi * 0.85 : l.hemi} color={l.sky} groundColor={l.ground} />
      <directionalLight position={[3, 5, 4]} intensity={soft ? l.keyI * 0.83 : l.keyI} color={l.key} />
      <directionalLight position={[-4, 2.5, -3]} intensity={l.rimAI} color={l.rimA} />
      <directionalLight position={[2, 1.5, -5]} intensity={l.rimBI} color={l.rimB} />
    </>
  );
}

/** Khoảng cách camera: tự lùi xa khi khung hẹp (dọc) để vật thể luôn nằm trọn trong khung. */
export function fitDistance(dist: number, aspect: number) {
  return dist * Math.max(1, 1.35 / Math.max(aspect, 0.2));
}

type View = { dir: [number, number, number]; dist: number; target: [number, number, number] };

function FitCamera({ dir, dist, target }: View) {
  const { camera, size } = useThree();
  useEffect(() => {
    const d = fitDistance(dist, size.width / Math.max(size.height, 1));
    camera.position.copy(new THREE.Vector3(...dir).normalize().multiplyScalar(d).add(new THREE.Vector3(...target)));
    camera.lookAt(...target);
  }, [camera, size.width, size.height, dir, dist, target]);
  return null;
}

const GEN_VIEW: View = { dir: [0.6, 0.38, 0.8], dist: 5.4, target: [0, 0.55, 0] };
const EMPTY_VIEW: View = { dir: [0.55, 0.32, 0.85], dist: 5.6, target: [0, 0.75, 0] };

/* ------------------------------------------------------------ màn chờ AI */

const N = 2600;

/** Điểm trên bề mặt một khối bo tròn (superellipsoid) — hình "đang thành hình". */
// [GT] Vị trí đích của các hạt: phân bố đều trên một khối hộp bo tròn (dùng xoắn ốc vàng để rải đều).
function targetShape(): Float32Array {
  const out = new Float32Array(N * 3);
  const sgnPow = (v: number, p: number) => Math.sign(v) * Math.abs(v) ** p;
  for (let i = 0; i < N; i++) {
    const u = Math.acos(1 - 2 * ((i + 0.5) / N)) - Math.PI / 2; // vĩ độ đều, từ đáy lên đỉnh
    const v = i * Math.PI * (3 - Math.sqrt(5)); // xoắn ốc vàng
    const e = 0.45;
    const x = sgnPow(Math.cos(u), e) * sgnPow(Math.cos(v), e);
    const y = sgnPow(Math.sin(u), e);
    const z = sgnPow(Math.cos(u), e) * sgnPow(Math.sin(v), e);
    out.set([x * 0.75, y * 0.75 + 0.95, z * 0.75], i * 3);
  }
  return out;
}

// [GT] Vị trí xuất phát của các hạt: rải ngẫu nhiên quanh bệ.
function scattered(): Float32Array {
  const out = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 1.8 + Math.random() * 1.8;
    const a = Math.random() * Math.PI * 2;
    out.set([Math.cos(a) * r, Math.random() * 3.2 - 0.4, Math.sin(a) * r], i * 3);
  }
  return out;
}

function ParticleForge({ progress }: { progress: number }) {
  const ref = useRef<THREE.Points>(null);
  const scan = useRef<THREE.Mesh>(null);
  const { from, to, geo } = useMemo(() => {
    const from = scattered();
    const to = targetShape();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(from.slice(), 3));
    // Màu đặc (không cộng sáng) để nổi trên nền sáng: tím ở đáy → xanh ở đỉnh, như chữ "Make it 3D."
    const colors = new Float32Array(N * 3);
    const a = new THREE.Color(VIOLET);
    const b = new THREE.Color(SKY);
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      c.copy(a).lerp(b, to[i * 3 + 1] / 1.8);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return { from, to, geo };
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);

  const shown = useRef(0);
  const still = reducedMotion();
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    // Mỗi hạt có "ngưỡng" riêng: tiến độ càng cao, càng nhiều hạt về đúng vị trí trên khối.
    const goal = 0.12 + Math.min(1, Math.max(0, progress / 100)) * 0.8;
    shown.current += (goal - shown.current) * Math.min(1, dt * 1.5);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < N; i++) {
      const settled = Math.min(1, Math.max(0, (shown.current - (i / N) * 0.9) * 6));
      const wobble = still ? 0 : (1 - settled) * 0.08;
      for (let j = 0; j < 3; j++) {
        const idx = i * 3 + j;
        // [GT] Mỗi hạt đi từ vị trí rải → vị trí đích theo mức "settled" (lerp), cộng thêm chút lắc lư cho sinh động.
        arr[idx] = from[idx] + (to[idx] - from[idx]) * settled + Math.sin(t * 1.3 + i * 0.37 + j) * wobble;
      }
    }
    pos.needsUpdate = true;
    if (ref.current && !still) ref.current.rotation.y = t * 0.35;
    if (scan.current) {
      const y = 0.15 + ((t * 0.45) % 1) * 1.65;
      scan.current.position.y = y;
      (scan.current.material as THREE.MeshBasicMaterial).opacity = 0.85 * Math.sin(((y - 0.15) / 1.65) * Math.PI);
    }
  });

  return (
    <group>
      <points ref={ref} geometry={geo}>
        <pointsMaterial size={0.034} vertexColors transparent opacity={0.9} sizeAttenuation depthWrite={false} toneMapped={false} />
      </points>
      <mesh ref={scan} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.95, 1.04, 96]} />
        <meshBasicMaterial color={VIOLET} transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Màn chờ khi AI đang dựng mô hình. */
export function GeneratingStage({ progress }: { progress: number }) {
  return (
    <Canvas camera={{ fov: 38 }} dpr={[1, 2]} style={{ position: 'absolute', inset: 0 }}>
      <FitCamera {...GEN_VIEW} />
      <StageLights soft />
      <Pedestal />
      <ParticleForge progress={progress} />
      <Sparkles count={36} scale={[4, 3, 4]} position={[0, 1.2, 0]} size={3} speed={0.3} color={LAVENDER} opacity={0.7} />
    </Canvas>
  );
}

/* ------------------------------------------------------------ màn trống */

/** Chú gấu phi hành gia của Landing, lơ lửng và xoay chậm trên bệ. */
function Mascot() {
  const ref = useRef<THREE.Group>(null);
  const still = reducedMotion();
  const scale = 1.95 / FIGURE_HEIGHT.bear;
  useFrame(({ clock }) => {
    if (ref.current && !still) ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.5) * 0.6;
  });
  return (
    <Float speed={still ? 0 : 1.4} rotationIntensity={0.15} floatIntensity={0.35} floatingRange={[0.05, 0.18]}>
      <group ref={ref} position={[0, 0.08, 0]} scale={scale}>
        <Bear />
      </group>
    </Float>
  );
}

/** Màn trống: nhân vật mẫu trên bệ, cùng phong cách với Landing. */
export function EmptyStage() {
  return (
    <Canvas camera={{ fov: 36 }} dpr={[1, 2]} style={{ position: 'absolute', inset: 0 }} gl={{ toneMapping: THREE.ACESFilmicToneMapping }}>
      <FitCamera {...EMPTY_VIEW} />
      <StageLights />
      <StudioEnv intensity={0.55} />
      <Pedestal />
      <Mascot />
      <ContactShadows position={[0, 0.004, 0]} opacity={0.3} scale={4} blur={2.4} far={2.5} color="#5b3fd6" />
      <Sparkles count={28} scale={[4, 2.6, 4]} position={[0, 1.3, 0]} size={3} speed={0.25} color={LAVENDER} opacity={0.75} />
    </Canvas>
  );
}
