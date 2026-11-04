/**
 * [Giải thích] Ảnh xem trước cho thẻ dự án, chụp từ chính file GLB (nhiều góc xoay ghép thành dải ảnh), có cache.
 */
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { fetchAuthed } from './authed';
import { stitchFrames, TURNTABLE_FRAMES } from '../../../shared/ui/TurntableThumb';

/**
 * Ảnh xem trước cho thẻ dự án, chụp từ chính tệp GLB (Backend chưa có thumbnail thật).
 * Mỗi mô hình được chụp ở TURNTABLE_FRAMES góc xoay, ghép thành một dải ảnh nền trong suốt
 * (thẻ hiển thị trên nền gradient; rê chuột để xoay). Dùng chung một renderer, chụp lần lượt,
 * nhớ kết quả trong bộ nhớ + localStorage.
 */
const W = 448; // 16:9 như .mcard .thumb
const H = 252;
const KEY = (url: string) => `3dw.ai.turntable.v1.${url}`;

// Dọn ảnh tĩnh của phiên bản cũ để không chiếm quota localStorage
try {
  for (const k of Object.keys(localStorage)) if (k.startsWith('3dw.ai.thumb.')) localStorage.removeItem(k);
} catch { /* bị chặn */ }

const memory = new Map<string, Promise<string>>();
let queue: Promise<unknown> = Promise.resolve();
let renderer: THREE.WebGLRenderer | null = null;
let envMap: THREE.Texture | null = null;

function getRenderer() {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const pmrem = new THREE.PMREMGenerator(renderer);
    envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  }
  return renderer;
}

const loader = new GLTFLoader();
const draco = new DRACOLoader();
draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.5/');
loader.setDRACOLoader(draco);

async function render(url: string): Promise<string> {
  const buf = await (await fetchAuthed(url)).arrayBuffer();
  const gltf = await loader.parseAsync(buf, '');
  const r = getRenderer();
  const scene = new THREE.Scene();
  scene.environment = envMap;
  scene.environmentIntensity = 0.5;

  // Đặt mô hình vào khung chuẩn: cạnh lớn nhất = 2, đáy chạm mặt đất, tâm XZ ở gốc
  const model = gltf.scene;
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const s = 2 / Math.max(size.x, size.y, size.z, 1e-6);
  model.scale.setScalar(s);
  model.position.set(-center.x * s, -box.min.y * s, -center.z * s);
  model.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  const turn = new THREE.Group();
  turn.add(model);
  scene.add(turn);
  const h = size.y * s;

  // Ánh sáng dịu như Landing: đèn chính có bóng + hai đèn viền tím / xanh
  const key = new THREE.DirectionalLight('#ffffff', 1.4);
  key.position.set(2.5, 5, 3.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 6;
  Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 0.1, far: 15 });
  const rimA = new THREE.DirectionalLight('#b9a7ff', 0.9);
  rimA.position.set(-4, 2.5, -3);
  const rimB = new THREE.DirectionalLight('#98c8ff', 0.7);
  rimB.position.set(3, 1.5, -4);
  scene.add(key, rimA, rimB, new THREE.HemisphereLight('#ffffff', '#d9d0ff', 0.5));
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.2, color: new THREE.Color('#4b33b8') }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Camera đủ xa để mọi góc xoay đều nằm trọn trong khung
  const radius = Math.hypot(size.x * s, h, size.z * s) / 2;
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.01, 100);
  const dist = (radius / Math.sin((camera.fov * Math.PI) / 360)) * 1.02;
  camera.position.copy(new THREE.Vector3(0.85, 0.5, 1.15).normalize().multiplyScalar(dist)).add(new THREE.Vector3(0, h / 2, 0));
  camera.lookAt(0, h * 0.45, 0);

  const data = stitchFrames((i) => {
    turn.rotation.y = (i / TURNTABLE_FRAMES) * Math.PI * 2;
    r.render(scene, camera);
    return r.domElement;
  }, TURNTABLE_FRAMES, W, H);

  // Giải phóng bộ nhớ GPU của mô hình vừa chụp
  ground.geometry.dispose();
  (ground.material as THREE.Material).dispose();
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const mat of mats) {
      for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
      mat.dispose();
    }
  });
  return data;
}

export function glbThumbnail(url: string): Promise<string> {
  const hit = memory.get(url);
  if (hit) return hit;
  let stored: string | null = null;
  try { stored = localStorage.getItem(KEY(url)); } catch { /* bị chặn */ }
  if (stored) {
    const p = Promise.resolve(stored);
    memory.set(url, p);
    return p;
  }
  const p = (queue = queue.catch(() => undefined).then(() => render(url))) as Promise<string>;
  p.then((d) => { try { localStorage.setItem(KEY(url), d); } catch { /* đầy bộ nhớ */ } }).catch(() => memory.delete(url));
  memory.set(url, p);
  return p;
}

/**
 * Dải ảnh bàn xoay của mô hình. `failed` = không chụp được (vd. tệp không phải GLB — bản lưu từ 3D Studio)
 * để thẻ hiện icon thay vì hiệu ứng chờ mãi.
 */
export function useGlbThumbnail(url: string | null | undefined) {
  const [state, setState] = useState<{ src: string | null; failed: boolean }>({ src: null, failed: false });
  useEffect(() => {
    setState({ src: null, failed: false });
    if (!url) return;
    let active = true;
    glbThumbnail(url)
      .then((d) => { if (active) setState({ src: d, failed: false }); })
      .catch(() => { if (active) setState({ src: null, failed: true }); });
    return () => { active = false; };
  }, [url]);
  return state;
}
