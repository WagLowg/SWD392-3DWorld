import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { fetchAuthed } from './authed';

/**
 * Ảnh xem trước cho thẻ dự án, chụp từ chính tệp GLB (Backend chưa có thumbnail thật).
 * Dùng chung một renderer, chụp lần lượt từng mô hình, nhớ kết quả trong bộ nhớ + localStorage.
 */
const W = 480;
const H = 300;
const BG = '#151a24';
const KEY = (url: string) => `3dw.ai.thumb.${url}`;

const memory = new Map<string, Promise<string>>();
let queue: Promise<unknown> = Promise.resolve();
let renderer: THREE.WebGLRenderer | null = null;
let envMap: THREE.Texture | null = null;

function getRenderer() {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
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
  scene.background = new THREE.Color(BG);
  scene.environment = envMap;
  const sun = new THREE.DirectionalLight('#ffffff', 1.4);
  sun.position.set(3, 5, 4);
  scene.add(sun, new THREE.AmbientLight('#ffffff', 0.35));

  // Đặt mô hình vào khung chuẩn, tâm ở gốc tọa độ
  const root = gltf.scene;
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const s = 2 / Math.max(size.x, size.y, size.z, 1e-6);
  root.scale.setScalar(s);
  root.position.copy(center.multiplyScalar(-s));
  scene.add(root);

  const camera = new THREE.PerspectiveCamera(32, W / H, 0.01, 100);
  camera.position.set(2.2, 1.5, 2.8);
  camera.lookAt(0, 0, 0);
  r.render(scene, camera);
  const data = r.domElement.toDataURL('image/jpeg', 0.82);

  // Giải phóng bộ nhớ GPU của mô hình vừa chụp
  root.traverse((o) => {
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

/** Trả data URL ảnh chụp mô hình, hoặc null khi đang dựng / lỗi. */
export function useGlbThumbnail(url: string | null | undefined) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    setSrc(null);
    if (!url) return;
    let active = true;
    glbThumbnail(url).then((d) => { if (active) setSrc(d); }).catch(() => undefined);
    return () => { active = false; };
  }, [url]);
  return src;
}
