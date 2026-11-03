import * as THREE from 'three';
import type { SceneNode } from '../types';
import { buildGeometry, worldMatrix } from './geometry';
import { stitchFrames, TURNTABLE_FRAMES } from '../../../shared/ui/TurntableThumb';

let renderer: THREE.WebGLRenderer | null = null;

function getRenderer() {
  if (renderer) return renderer;
  const canvas = document.createElement('canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

/** Viền mảnh: giúp chi tiết sáng màu (vd. chữ trắng) không hòa vào nền sáng. */
const edgeLine = new THREE.LineBasicMaterial({ color: '#4d5a56' });

/** Dựng cảnh (mesh + viền + đèn dịu + bóng) từ các node đang hiện; null nếu không có gì để vẽ. */
function buildScene(nodes: SceneNode[]) {
  const scene = new THREE.Scene();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const hidden = (n: SceneNode): boolean => !n.visible || (!!n.parentId && hidden(byId.get(n.parentId)!));
  const box = new THREE.Box3();
  const meshes: THREE.Mesh[] = [];
  for (const n of nodes) {
    if (n.kind === 'group' || hidden(n)) continue;
    const b = buildGeometry(n);
    if (!b) continue;
    const mesh = new THREE.Mesh(
      b.geometry,
      new THREE.MeshStandardMaterial({ color: n.appearance.color, roughness: n.appearance.roughness, metalness: n.appearance.metalness, side: n.kind === 'plane' ? THREE.DoubleSide : THREE.FrontSide }),
    );
    mesh.applyMatrix4(worldMatrix(n.id, byId));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(b.geometry, 30), edgeLine));
    meshes.push(mesh);
    box.union(new THREE.Box3().setFromObject(mesh));
  }
  if (box.isEmpty()) return null;

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.length() / 2, 1);

  // Ánh sáng ban ngày dịu như Landing (đèn quá mạnh làm vật trắng và nền nhạt bị "cháy" vào nhau)
  scene.add(new THREE.HemisphereLight('#ffffff', '#cfeee0', 0.85));
  const key = new THREE.DirectionalLight('#ffffff', 1.7);
  key.position.set(center.x + radius * 1.5, center.y + radius * 4, center.z + radius * 2);
  key.target.position.copy(center);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  const sc = key.shadow.camera as THREE.OrthographicCamera;
  sc.left = sc.bottom = -radius * 2; sc.right = sc.top = radius * 2; sc.near = 0.1; sc.far = radius * 10;
  key.shadow.radius = 6;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight('#b9a7ff', 0.5);
  fill.position.set(center.x - radius * 2, center.y + radius, center.z - radius);
  const rim = new THREE.DirectionalLight('#98dfff', 0.5);
  rim.position.set(center.x + radius * 2, center.y + radius * 0.5, center.z - radius * 2);
  scene.add(fill, rim);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(radius * 20, radius * 20), new THREE.ShadowMaterial({ opacity: 0.2, color: new THREE.Color('#0f6b52') }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = box.min.y - 0.01;
  ground.receiveShadow = true;
  scene.add(ground);
  return { scene, meshes, box, center, size, radius };
}

/** Geometry của mesh nằm trong cache của buildGeometry nên chỉ giải phóng material và viền vừa tạo. */
function disposeScene(scene: THREE.Object3D) {
  scene.traverse((o) => {
    if (o instanceof THREE.LineSegments) o.geometry.dispose();
    else if (o instanceof THREE.Mesh) (o.material as THREE.Material).dispose();
  });
}

export interface ThumbOptions {
  width?: number;
  height?: number;
  /** transparent PNG when omitted, otherwise JPEG on this background */
  background?: string;
  /** camera direction (from target) */
  view?: [number, number, number];
  padding?: number;
}

/** Renders visible nodes to an image (used for project cards and template previews). */
export function renderThumbnail(nodes: SceneNode[], opts: ThumbOptions = {}): string | null {
  const { width = 640, height = 400, background, view = [0.35, 1.0, 0.75], padding = 0.95 } = opts;
  let r: THREE.WebGLRenderer;
  try { r = getRenderer(); } catch { return null; }
  r.setPixelRatio(1);
  r.setSize(width, height, false);

  const built = buildScene(nodes);
  if (!built) return null;
  const { scene, meshes, center, radius } = built;
  for (const m of meshes) scene.add(m);

  const cam = new THREE.PerspectiveCamera(30, width / height, radius / 50, radius * 50);
  const dir = new THREE.Vector3(...view).normalize();
  const fitH = radius / Math.sin((cam.fov * Math.PI) / 360);
  const fitW = fitH / Math.min(1, cam.aspect);
  cam.position.copy(center).addScaledVector(dir, Math.max(fitH, fitW / 1.6) * padding);
  cam.lookAt(center);

  r.setClearColor(background ?? '#000000', background ? 1 : 0);
  r.render(scene, cam);
  const url = background ? r.domElement.toDataURL('image/jpeg', 0.86) : r.domElement.toDataURL('image/png');
  disposeScene(scene);
  return url;
}

// cache for previews that do not change (templates, hero)
const cache = new Map<string, string | null>();
export function cachedThumbnail(key: string, build: () => SceneNode[], opts: ThumbOptions) {
  if (!cache.has(key)) cache.set(key, renderThumbnail(build(), opts));
  return cache.get(key)!;
}

/**
 * Ảnh bàn xoay cho thẻ dự án: chụp `frames` góc quanh trục đứng, nền trong suốt,
 * ghép thành một dải ngang (xem shared/ui/TurntableThumb).
 */
export function renderTurntable(nodes: SceneNode[], opts: { width?: number; height?: number; frames?: number } = {}): string | null {
  const { width = 384, height = 252, frames = TURNTABLE_FRAMES } = opts; // ≈ tỉ lệ .p-thumb
  let r: THREE.WebGLRenderer;
  try { r = getRenderer(); } catch { return null; }
  r.setPixelRatio(1);
  r.setSize(width, height, false);
  r.setClearColor('#000000', 0);

  const built = buildScene(nodes);
  if (!built) return null;
  const { scene, meshes, box, center, size, radius } = built;
  // Xoay quanh tâm khối, đáy chạm mặt đất y = 0
  const turn = new THREE.Group();
  scene.add(turn);
  for (const m of meshes) { m.position.sub(new THREE.Vector3(center.x, box.min.y, center.z)); turn.add(m); }
  scene.children.forEach((o) => { if (o instanceof THREE.Mesh && o.material instanceof THREE.ShadowMaterial) o.position.y = -0.01; });

  const cam = new THREE.PerspectiveCamera(30, width / height, radius / 50, radius * 50);
  const target = new THREE.Vector3(0, size.y / 2, 0);
  const fit = radius / Math.sin((cam.fov * Math.PI) / 360);
  cam.position.copy(target).addScaledVector(new THREE.Vector3(0.35, 0.75, 0.9).normalize(), fit * 1.2);
  cam.lookAt(target);

  r.toneMapping = THREE.ACESFilmicToneMapping;
  let url: string | null = null;
  try {
    url = stitchFrames((i) => {
      turn.rotation.y = (i / frames) * Math.PI * 2;
      r.render(scene, cam);
      return r.domElement;
    }, frames, width, height);
  } finally {
    r.toneMapping = THREE.NoToneMapping;
    disposeScene(scene);
  }
  return url;
}
