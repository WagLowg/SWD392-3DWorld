import * as THREE from 'three';
import type { SceneNode } from '../types';
import { buildGeometry, worldMatrix } from './geometry';

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

  const scene = new THREE.Scene();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const hidden = (n: SceneNode): boolean => !n.visible || (!!n.parentId && hidden(byId.get(n.parentId)!));
  const box = new THREE.Box3();
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
    scene.add(mesh);
    box.union(new THREE.Box3().setFromObject(mesh));
  }
  if (box.isEmpty()) return null;

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.length() / 2, 1);

  scene.add(new THREE.HemisphereLight('#e9e6ff', '#1b1d2b', 1.3));
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(center.x + radius * 1.5, center.y + radius * 4, center.z + radius * 2);
  key.target.position.copy(center);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  const sc = key.shadow.camera as THREE.OrthographicCamera;
  sc.left = sc.bottom = -radius * 2; sc.right = sc.top = radius * 2; sc.near = 0.1; sc.far = radius * 10;
  key.shadow.radius = 6;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight('#b7b0ff', 0.6);
  fill.position.set(center.x - radius * 2, center.y + radius, center.z - radius);
  scene.add(fill);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(radius * 20, radius * 20), new THREE.ShadowMaterial({ opacity: 0.35 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = box.min.y - 0.01;
  ground.receiveShadow = true;
  scene.add(ground);

  const cam = new THREE.PerspectiveCamera(30, width / height, radius / 50, radius * 50);
  const dir = new THREE.Vector3(...view).normalize();
  const fitH = radius / Math.sin((cam.fov * Math.PI) / 360);
  const fitW = fitH / Math.min(1, cam.aspect);
  cam.position.copy(center).addScaledVector(dir, Math.max(fitH, fitW / 1.6) * padding);
  cam.lookAt(center);

  r.setClearColor(background ?? '#000000', background ? 1 : 0);
  r.render(scene, cam);
  const url = background ? r.domElement.toDataURL('image/jpeg', 0.86) : r.domElement.toDataURL('image/png');
  scene.traverse((o) => { if (o instanceof THREE.Mesh) (o.material as THREE.Material).dispose(); });
  return url;
}

// cache for previews that do not change (templates, hero)
const cache = new Map<string, string | null>();
export function cachedThumbnail(key: string, build: () => SceneNode[], opts: ThumbOptions) {
  if (!cache.has(key)) cache.set(key, renderThumbnail(build(), opts));
  return cache.get(key)!;
}
