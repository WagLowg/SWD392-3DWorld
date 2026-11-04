import { useEffect, useState } from 'react';
import { fetchProject, type ProjectMeta } from '../services/projects';
import { renderTurntable } from './thumbnail';

/**
 * Ảnh bàn xoay cho thẻ dự án. API danh sách không trả scene, nên mỗi thẻ tải scene của dự án
 * (tối đa 4 request cùng lúc) rồi chụp trên trình duyệt. Khóa cache gồm `updatedAt`
 * → dự án vừa sửa sẽ tự chụp lại; bản cũ bị xóa để không chiếm quota localStorage.
 */
const PREFIX = '3dw.studio.turntable.v1.';
const keyOf = (p: ProjectMeta) => `${PREFIX}${p.id}.${p.updatedAt}`;

const memory = new Map<string, Promise<string | null>>();
let renderQueue: Promise<unknown> = Promise.resolve();

const FETCH_LIMIT = 4;
let running = 0;
const waiting: (() => void)[] = [];
async function limited<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= FETCH_LIMIT) await new Promise<void>((r) => waiting.push(r));
  running++;
  try { return await fn(); } finally { running--; waiting.shift()?.(); }
}

function dropStale(p: ProjectMeta, keep: string) {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(`${PREFIX}${p.id}.`) && k !== keep) localStorage.removeItem(k);
  } catch { /* bị chặn */ }
}

export function projectTurntable(p: ProjectMeta): Promise<string | null> {
  const key = keyOf(p);
  const hit = memory.get(key);
  if (hit) return hit;
  let stored: string | null = null;
  try { stored = localStorage.getItem(key); } catch { /* bị chặn */ }
  if (stored) {
    const done = Promise.resolve(stored);
    memory.set(key, done);
    return done;
  }
  // Tải scene song song (tối đa FETCH_LIMIT), còn render thì lần lượt trên một renderer chung.
  const job = limited(() => fetchProject(p.id)).then((proj) => {
    if (!proj?.nodes.length) return null;
    const run = renderQueue.catch(() => undefined).then(async () => {
      await new Promise((r) => requestAnimationFrame(r)); // nhường một khung hình cho giao diện
      return renderTurntable(proj.nodes);
    });
    renderQueue = run;
    return run;
  });
  job
    .then((d) => {
      if (!d) return;
      dropStale(p, key);
      try { localStorage.setItem(key, d); } catch { /* đầy bộ nhớ: vẫn giữ trong RAM */ }
    })
    .catch(() => memory.delete(key));
  memory.set(key, job);
  return job;
}

/** `src` = dải ảnh bàn xoay; `done` = đã thử xong (kể cả khi dự án rỗng / lỗi). */
export function useProjectTurntable(p: ProjectMeta) {
  const [state, setState] = useState<{ src: string | null; done: boolean }>({ src: null, done: false });
  useEffect(() => {
    let active = true;
    setState({ src: null, done: false });
    projectTurntable(p)
      .then((src) => { if (active) setState({ src, done: true }); })
      .catch(() => { if (active) setState({ src: null, done: true }); });
    return () => { active = false; };
  }, [p.id, p.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}
