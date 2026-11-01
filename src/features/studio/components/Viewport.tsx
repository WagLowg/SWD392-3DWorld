import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import {
  CameraControls, Edges, GizmoHelper, GizmoViewport, Grid, Html, Line, OrthographicCamera, PerspectiveCamera, TransformControls,
} from '@react-three/drei';
import CameraControlsImpl from 'camera-controls';
import { AlertTriangle, Box as BoxIcon, Plus } from 'lucide-react';
import { useStudio } from '../store';
import { buildGeometry, decompose, worldBox } from '../lib/geometry';
import type { SceneNode } from '../types';

const DEG = Math.PI / 180;
export const objectRegistry = new Map<string, THREE.Object3D>();

function NodeObject({ node, childrenOf }: { node: SceneNode; childrenOf: Map<string | null, SceneNode[]> }) {
  const selection = useStudio((s) => s.selection);
  const tool = useStudio((s) => s.tool);
  const selected = selection.includes(node.id);
  const built = useMemo(() => buildGeometry(node), [node]);
  const kids = childrenOf.get(node.id) ?? [];

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 4) return;
    const s = useStudio.getState();
    if (s.tool === 'measure') { s.addMeasurePoint(e.point.clone()); return; }
    // Click selects the top-most group, unless an ancestor is already selected (drill-down).
    const byId = new Map(s.nodes.map((n) => [n.id, n]));
    let target = node;
    const chain: SceneNode[] = [];
    let cur: SceneNode | undefined = node;
    while (cur) { chain.unshift(cur); cur = cur.parentId ? byId.get(cur.parentId) : undefined; }
    const selIdx = chain.findIndex((c) => s.selection.includes(c.id));
    target = selIdx >= 0 && selIdx < chain.length - 1 ? chain[selIdx + 1] : chain[0];
    s.select(target.id, e.shiftKey || e.ctrlKey || e.metaKey ? 'toggle' : 'replace');
  };

  return (
    <group
      ref={(o) => { if (o) objectRegistry.set(node.id, o); else objectRegistry.delete(node.id); }}
      position={node.position}
      rotation={[node.rotation[0] * DEG, node.rotation[1] * DEG, node.rotation[2] * DEG]}
      scale={node.scale}
      visible={node.visible}
      userData={{ nodeId: node.id }}
    >
      {built && (
        <mesh geometry={built.geometry} onClick={onClick} castShadow receiveShadow>
          <meshStandardMaterial
            color={node.appearance.color}
            roughness={node.appearance.roughness}
            metalness={node.appearance.metalness}
            side={node.kind === 'plane' ? THREE.DoubleSide : THREE.FrontSide}
            emissive={selected ? '#3b2f99' : '#000000'}
            emissiveIntensity={selected ? 0.35 : 0}
            transparent={tool === 'measure'}
            opacity={1}
          />
          {selected && <Edges threshold={20} color="#a59aff" />}
        </mesh>
      )}
      {kids.map((k) => <NodeObject key={k.id} node={k} childrenOf={childrenOf} />)}
    </group>
  );
}

function SceneContent() {
  const nodes = useStudio((s) => s.nodes);
  const childrenOf = useMemo(() => {
    const m = new Map<string | null, SceneNode[]>();
    nodes.forEach((n) => { const k = n.parentId; m.set(k, [...(m.get(k) ?? []), n]); });
    return m;
  }, [nodes]);
  return <>{(childrenOf.get(null) ?? []).map((n) => <NodeObject key={n.id} node={n} childrenOf={childrenOf} />)}</>;
}

function Gizmo() {
  const selection = useStudio((s) => s.selection);
  const nodes = useStudio((s) => s.nodes);
  const tool = useStudio((s) => s.tool);
  const space = useStudio((s) => s.space);
  const grid = useStudio((s) => s.grid);
  const [obj, setObj] = useState<THREE.Object3D | null>(null);
  const node = selection.length === 1 ? nodes.find((n) => n.id === selection[0]) : undefined;
  useEffect(() => {
    // wait one frame so the registry contains freshly mounted objects
    const r = requestAnimationFrame(() => setObj(node ? objectRegistry.get(node.id) ?? null : null));
    return () => cancelAnimationFrame(r);
  }, [node?.id, nodes]);
  if (!node || node.locked || !obj || !['move', 'rotate', 'scale'].includes(tool)) return null;
  const mode = tool === 'move' ? 'translate' : tool === 'rotate' ? 'rotate' : 'scale';
  return (
    <TransformControls
      object={obj}
      mode={mode}
      space={space}
      size={0.8}
      translationSnap={grid.snap ? grid.size : null}
      rotationSnap={grid.snap ? grid.angle * DEG : null}
      scaleSnap={grid.snap ? 0.05 : null}
      onMouseUp={() => {
        const d = decompose(new THREE.Matrix4().compose(obj.position, obj.quaternion, obj.scale));
        if (d.scale.some((v) => Math.abs(v) < 1e-6)) return;
        useStudio.getState().setTransform(node.id, d);
      }}
    />
  );
}

function SelectionBounds() {
  const selection = useStudio((s) => s.selection);
  const nodes = useStudio((s) => s.nodes);
  const box = useMemo(() => (selection.length ? worldBox(selection, nodes) : null), [selection, nodes]);
  if (!box || box.isEmpty()) return null;
  const size = new THREE.Vector3(); box.getSize(size);
  const top = new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2);
  return (
    <>
      <box3Helper args={[box, new THREE.Color('#68d9d0')]} />
      <Html position={top} center style={{ transform: 'translateY(-22px)' }} zIndexRange={[5, 0]}>
        <div className="dim-label">{size.x.toFixed(2)} × {size.y.toFixed(2)} × {size.z.toFixed(2)} mm</div>
      </Html>
    </>
  );
}

function Measure() {
  const pts = useStudio((s) => s.measure);
  const tool = useStudio((s) => s.tool);
  if (tool !== 'measure' || !pts.length) return null;
  const d = pts.length === 2 ? pts[0].distanceTo(pts[1]) : 0;
  const mid = pts.length === 2 ? pts[0].clone().add(pts[1]).multiplyScalar(0.5) : pts[0];
  return (
    <>
      {pts.map((p, i) => (
        <mesh key={i} position={p}><sphereGeometry args={[0.6, 16, 8]} /><meshBasicMaterial color="#68d9d0" depthTest={false} /></mesh>
      ))}
      {pts.length === 2 && (
        <>
          <Line points={[pts[0], pts[1]]} color="#68d9d0" lineWidth={2} depthTest={false} />
          <Html position={mid} center zIndexRange={[5, 0]}>
            <div className="dim-label measure">
              {d.toFixed(2)} mm · Δx {Math.abs(pts[1].x - pts[0].x).toFixed(2)} Δy {Math.abs(pts[1].y - pts[0].y).toFixed(2)} Δz {Math.abs(pts[1].z - pts[0].z).toFixed(2)}
            </div>
          </Html>
        </>
      )}
    </>
  );
}

const HOME = { pos: [90, 80, 110] as const, target: [0, 0, 0] as const };

function CameraRig() {
  const ref = useRef<CameraControlsImpl>(null);
  const viewRequest = useStudio((s) => s.viewRequest);
  const projection = useStudio((s) => s.projection);
  const { camera } = useThree();

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const A = CameraControlsImpl.ACTION;
    c.mouseButtons.left = A.ROTATE;
    c.mouseButtons.right = A.ROTATE;
    c.mouseButtons.middle = A.TRUCK;
    c.mouseButtons.wheel = projection === 'orthographic' ? A.ZOOM : A.DOLLY;
    c.dollyToCursor = true;
    const down = (e: KeyboardEvent) => { if (e.key === 'Shift') c.mouseButtons.left = A.TRUCK; };
    const up = (e: KeyboardEvent) => { if (e.key === 'Shift') c.mouseButtons.left = A.ROTATE; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [projection, camera]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const s = useStudio.getState();
    const preset = viewRequest.preset;
    const tgt = new THREE.Vector3();
    c.getTarget(tgt);
    const dist = Math.max(60, c.distance || 150);
    if (preset === 'home') { void c.setLookAt(...HOME.pos, ...HOME.target, viewRequest.n > 0); if (projection === 'orthographic') void c.zoomTo(4, true); return; }
    if (preset === 'fit') {
      const ids = s.selection.length ? s.selection : s.nodes.filter((n) => !n.parentId && n.visible).map((n) => n.id);
      const box = ids.length ? worldBox(ids, s.nodes) : new THREE.Box3();
      if (box.isEmpty()) { void c.setLookAt(...HOME.pos, ...HOME.target, true); return; }
      void c.fitToBox(box, true, { paddingTop: 8, paddingBottom: 8, paddingLeft: 8, paddingRight: 8 });
      return;
    }
    const dir = preset === 'top' ? [0, 1, 0.0001] : preset === 'front' ? [0, 0, 1] : preset === 'right' ? [1, 0, 0] : [0.55, 0.48, 0.68];
    void c.setLookAt(tgt.x + dir[0] * dist, tgt.y + dir[1] * dist, tgt.z + dir[2] * dist, tgt.x, tgt.y, tgt.z, true);
  }, [viewRequest.n]);

  return <CameraControls ref={ref} makeDefault smoothTime={0.18} minDistance={5} maxDistance={3000} />;
}

function Cameras() {
  const projection = useStudio((s) => s.projection);
  return projection === 'perspective'
    ? <PerspectiveCamera makeDefault position={[...HOME.pos]} fov={40} near={0.5} far={20000} />
    : <OrthographicCamera makeDefault position={[...HOME.pos]} zoom={4} near={-5000} far={20000} />;
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch { return false; }
}

export default function Viewport() {
  const grid = useStudio((s) => s.grid);
  const projection = useStudio((s) => s.projection);
  const nodes = useStudio((s) => s.nodes);
  const tool = useStudio((s) => s.tool);
  const [lost, setLost] = useState(false);
  const supported = useMemo(webglAvailable, []);

  if (!supported) {
    return (
      <div className="empty-scene">
        <div>
          <AlertTriangle size={28} color="var(--warning)" />
          <h3>Thiết bị không hỗ trợ WebGL2</h3>
          <p>Hãy dùng Chrome/Edge bản mới trên desktop và bật tăng tốc phần cứng. Dữ liệu đã lưu không bị ảnh hưởng.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        onPointerMissed={(e) => { if (e.type === 'click' && useStudio.getState().tool !== 'measure') useStudio.getState().select(null); }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (ev) => { ev.preventDefault(); setLost(true); });
          gl.domElement.addEventListener('webglcontextrestored', () => setLost(false));
        }}
        style={{ cursor: tool === 'measure' ? 'crosshair' : 'default' }}
      >
        <color attach="background" args={['#10141d']} />
        <Cameras key={`cam-${projection}`} />
        <CameraRig key={`rig-${projection}`} />
        <hemisphereLight args={['#dfe3ff', '#1a1d29', 0.9]} />
        <directionalLight position={[80, 140, 60]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-150} shadow-camera-right={150} shadow-camera-top={150} shadow-camera-bottom={-150} />
        <directionalLight position={[-90, 60, -80]} intensity={0.5} />
        {grid.show && (
          <Grid
            infiniteGrid
            cellSize={grid.size}
            sectionSize={grid.size * 10}
            cellColor="#262c3a"
            sectionColor="#3a4257"
            fadeDistance={600}
            fadeStrength={1.5}
            cellThickness={0.6}
            sectionThickness={1}
          />
        )}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
          <planeGeometry args={[2000, 2000]} />
          <shadowMaterial opacity={0.25} />
        </mesh>
        <axesHelper args={[20]} />
        <SceneContent />
        <SelectionBounds />
        <Measure />
        <Gizmo />
        <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
          <GizmoViewport axisColors={['#f27681', '#44c997', '#6aa8ff']} labelColor="#0b0e15" />
        </GizmoHelper>
      </Canvas>
      {nodes.length === 0 && (
        <div className="empty-scene">
          <div>
            <BoxIcon size={28} color="var(--secondary)" />
            <h3>Scene đang trống</h3>
            <p>Thêm hình khối đầu tiên, chèn mẫu từ Thư viện hoặc nhập tệp STL.</p>
            <button className="btn primary" onClick={() => useStudio.getState().addNode('box')}><Plus size={14} /> Thêm hộp 20 mm</button>
          </div>
        </div>
      )}
      {lost && (
        <div className="empty-scene">
          <div>
            <AlertTriangle size={28} color="var(--warning)" />
            <h3>Mất kết nối WebGL</h3>
            <p>Đang khôi phục ngữ cảnh đồ hoạ. Scene của bạn vẫn được giữ nguyên.</p>
          </div>
        </div>
      )}
    </>
  );
}
