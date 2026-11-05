/**
 * [Giải thích] Ảnh mẫu đầu vào, chụp từ các nhân vật 3D của trang Landing (không cần file ảnh có sẵn).
 */
import { createRoot, events } from '@react-three/fiber';
import * as THREE from 'three';
import { FIGURE_HEIGHT, FIGURES } from '../../landing/three/figures';
import type { FigureKind } from '../../landing/config/content';

/**
 * Ảnh mẫu cho AI Studio, chụp từ chính các nhân vật 3D của trang Landing (project không có sẵn ảnh).
 * Nền sáng trơn + một vật thể ở giữa — đúng kiểu ảnh đầu vào mà mô hình Ảnh → 3D cho kết quả tốt.
 * Mỗi ảnh chụp một lần rồi nhớ trong bộ nhớ (data URL PNG).
 */
export type Sample = { kind: FigureKind; label: string; hint: string; bg: string };

export const SAMPLES: Sample[] = [
  { kind: 'bear', label: 'Gấu phi hành gia', hint: 'Đồ chơi vinyl', bg: '#f3eeff' },
  { kind: 'robot', label: 'Robot tí hon', hint: 'Figure để bàn', bg: '#e8f4ff' },
  { kind: 'creature', label: 'Sinh vật mochi', hint: 'Nhân vật dễ thương', bg: '#e7f8ef' },
  { kind: 'mushroom', label: 'Nhà nấm', hint: 'Đồ trang trí', bg: '#fff3e3' },
];

const SIZE = 640;
const cache = new Map<FigureKind, Promise<string>>();
let queue: Promise<unknown> = Promise.resolve();

async function render(sample: Sample): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const root = createRoot(canvas);
  const C = FIGURES[sample.kind];
  const h = FIGURE_HEIGHT[sample.kind];
  await root.configure({
    events,
    size: { width: SIZE, height: SIZE, top: 0, left: 0 },
    dpr: 1,
    frameloop: 'never',
    gl: { antialias: true, preserveDrawingBuffer: true },
    camera: { fov: 30, position: [h * 0.75, h * 0.7, h * 2.15], near: 0.1, far: 100 },
    onCreated: ({ camera }) => camera.lookAt(0, h * 0.5, 0),
  });
  const store = root.render(
    <>
      <color attach="background" args={[sample.bg]} />
      <hemisphereLight args={['#ffffff', '#d9d0ff', 1.1]} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <directionalLight position={[-4, 2, -3]} intensity={0.6} color="#b9a7ff" />
      <group rotation={[0, -0.35, 0]}><C /></group>
    </>,
  );
  // Cho React dựng cây cảnh xong rồi tự vẽ một khung hình (frameloop 'never')
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const { gl, scene, camera } = store.getState();
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.render(scene, camera);
  const url = canvas.toDataURL('image/png');
  root.unmount();
  return url;
}

/** Data URL PNG của ảnh mẫu (chụp lần lượt trên một hàng đợi để không giành GPU với trình xem). */
export function sampleImage(sample: Sample): Promise<string> {
  let hit = cache.get(sample.kind);
  if (!hit) {
    hit = (queue = queue.catch(() => undefined).then(() => render(sample))) as Promise<string>;
    hit.catch(() => cache.delete(sample.kind));
    cache.set(sample.kind, hit);
  }
  return hit;
}

/** Ảnh mẫu dưới dạng File để tải lên như ảnh người dùng chọn. */
export async function sampleFile(sample: Sample): Promise<File> {
  const url = await sampleImage(sample);
  const blob = await (await fetch(url)).blob();
  return new File([blob], `mau-${sample.kind}.png`, { type: 'image/png' });
}
