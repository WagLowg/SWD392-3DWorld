/**
 * [Giải thích] Hero tương tác: gõ tên → biển tên 3D đổi ngay, chọn màu, kéo xoay; bấm nút để tạo dự án đó.
 */
import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Edges, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ArrowRight, Loader2 } from 'lucide-react';
import { buildGeometry, worldMatrix } from '../lib/geometry';
import { makeNode } from '../lib/scene';
import { createProject } from '../services/projects';
import { navigate } from '../router';
import type { SceneNode } from '../types';

/**
 * Hero tương tác của 3D Studio: gõ tên → biển tên 3D đổi ngay (đế tự giãn theo độ dài chữ),
 * chọn màu đế, kéo để xoay; bấm nút là tạo dự án với đúng thiết kế đó và mở trình chỉnh sửa.
 * Dùng chính bộ dựng hình học của editor nên thứ người dùng thấy đúng là thứ sẽ được in.
 */
const COLORS = [
  { name: 'Bạc hà', base: '#68D9D0' },
  { name: 'Oải hương', base: '#AA9BEA' },
  { name: 'Cam đào', base: '#FFB27A' },
  { name: 'Vàng bơ', base: '#F5D36B' },
  { name: 'Than chì', base: '#303746' },
];
const MAX_CHARS = 16;

/** Biển tên: đế bo góc + chữ nổi. Chiều rộng đế = bề rộng chữ + lề, tối thiểu 50 mm. */
function nameplateNodes(text: string, baseColor: string): SceneNode[] {
  const g = makeNode('group', { name: 'Biển tên' });
  const t = makeNode('text', {
    name: `Tên · ${text}`, parentId: g.id, position: [0, 3, 0], params: { text, fontSize: 14, depth: 1.5 },
    appearance: { color: baseColor === '#303746' ? '#F5D36B' : '#FFFFFF', roughness: 0.4, metalness: 0 },
  });
  const tg = buildGeometry(t)?.geometry;
  tg?.computeBoundingBox();
  const textW = tg?.boundingBox ? tg.boundingBox.max.x - tg.boundingBox.min.x : 40;
  const width = Math.round(Math.max(50, textW + 20));
  const b = makeNode('extrude', {
    name: 'Đế biển', parentId: g.id, params: { profile: 'rectangle', width, height: 30, depth: 3, cornerRadius: 4 },
    appearance: { color: baseColor, roughness: 0.55, metalness: 0 },
  });
  return [g, b, t];
}

function Plate({ nodes }: { nodes: SceneNode[] }) {
  const group = useRef<THREE.Group>(null);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const parts = useMemo(() => nodes.filter((n) => n.kind !== 'group').map((n) => {
    const built = buildGeometry(n);
    return built ? { id: n.id, geometry: built.geometry, matrix: worldMatrix(n.id, byId), color: n.appearance.color } : null;
  }).filter(Boolean) as { id: string; geometry: THREE.BufferGeometry; matrix: THREE.Matrix4; color: string }[], [nodes, byId]);
  // Lắc lư nhẹ như đồ vật trưng bày (dừng khi người dùng bật giảm chuyển động)
  const still = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // Tên dài → đế rộng: thu nhỏ cả biển để luôn nằm trọn trong khung
  const plateWidth = nodes.find((n) => n.kind === 'extrude')?.params.width ?? 60;
  const scale = Math.min(1, 74 / plateWidth);
  useFrame(({ clock }) => {
    if (!group.current || still) return;
    const t = clock.elapsedTime;
    group.current.rotation.y = Math.sin(t * 0.6) * 0.35;
    group.current.position.y = 4 + Math.sin(t * 1.2) * 1.2;
  });
  return (
    <group ref={group} position={[0, 4, 0]} rotation={[0.55, 0, 0]} scale={scale}>
      {parts.map((p) => (
        <mesh key={p.id} geometry={p.geometry} matrixAutoUpdate={false} matrix={p.matrix} castShadow>
          <meshStandardMaterial color={p.color} roughness={0.45} metalness={0.02} />
          <Edges threshold={30} color="#3b4a45" />
        </mesh>
      ))}
    </group>
  );
}

export function HeroNameplate({ defaultName }: { defaultName: string }) {
  const [text, setText] = useState(() => (defaultName || 'STUDIO').toUpperCase().slice(0, MAX_CHARS));
  const [color, setColor] = useState(COLORS[0].base);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shown = text.trim() || 'TÊN BẠN';
  const nodes = useMemo(() => nameplateNodes(shown, color), [shown, color]);

  const create = async () => {
    if (!text.trim()) { setError('Nhập một cái tên trước đã.'); return; }
    setBusy(true);
    setError(null);
    try {
      const p = await createProject({ name: `Biển tên ${text.trim()}`, templateId: 'tpl-nameplate', nodes: nameplateNodes(text.trim(), color) });
      navigate({ name: 'studio', id: p.id });
    } catch (e) {
      setError((e as Error).message || 'Không tạo được dự án.');
      setBusy(false);
    }
  };

  return (
    <div className="hero-live">
      <div className="hero-live-canvas" aria-label={`Xem trước biển tên 3D “${shown}”`} role="img">
        <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 64, 128], fov: 32 }} gl={{ antialias: true, alpha: true }}>
          <hemisphereLight args={['#ffffff', '#cfeee0', 0.9]} />
          <directionalLight position={[60, 120, 80]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
          <directionalLight position={[-80, 40, -40]} intensity={0.5} color="#b9a7ff" />
          <Plate nodes={nodes} />
          <ContactShadows position={[0, -2, 0]} opacity={0.3} scale={160} blur={2.6} far={40} color="#0f6b52" />
          <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={0.6} maxPolarAngle={1.35} target={[0, 2, 0]} />
        </Canvas>
        <span className="hero-live-hint">Kéo để xoay</span>
      </div>
      <div className="hero-live-form">
        <label className="hero-live-input">
          <span>Tên trên biển</span>
          <input value={text} maxLength={MAX_CHARS} onChange={(e) => { setText(e.target.value.toUpperCase()); setError(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') void create(); }} placeholder="Gõ tên của bạn" aria-label="Tên trên biển" />
          <small>{text.length}/{MAX_CHARS}</small>
        </label>
        <div className="hero-live-colors" role="radiogroup" aria-label="Màu đế">
          {COLORS.map((c) => (
            <button key={c.base} type="button" role="radio" aria-checked={color === c.base} title={c.name} aria-label={`Màu đế ${c.name}`}
              style={{ background: c.base }} onClick={() => setColor(c.base)} />
          ))}
        </div>
        <button type="button" className="btn primary lg hero-live-cta" onClick={() => void create()} disabled={busy}>
          {busy ? <Loader2 size={15} className="spin" /> : null}{busy ? 'Đang tạo…' : 'Tạo biển tên này'}{!busy && <span className="hero-live-arrow"><ArrowRight size={14} /></span>}
        </button>
        {error && <p className="err-text" role="alert">{error}</p>}
      </div>
    </div>
  );
}
