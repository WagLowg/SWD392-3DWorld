import { useEffect, useState } from 'react';
import { tokenStore } from '../../../shared/session/token';

/**
 * File của Backend (/api/ai-studio/assets/…, /api/ai-studio/uploads/…/file) cần Bearer token,
 * nhưng <img>, <a download> và GLTFLoader không tự gửi header. Ta tải bằng fetch rồi dùng blob: URL.
 * Kết quả được nhớ theo URL để không tải lại khi đổi qua lại giữa các phiên bản.
 */
const cache = new Map<string, Promise<string>>();

const needsAuth = (url: string) => url.startsWith('/api/');

export async function fetchAuthed(url: string): Promise<Blob> {
  const token = tokenStore.get();
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: 'same-origin' });
  if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? 'Không có quyền tải tệp.' : `Tải tệp thất bại (HTTP ${res.status}).`);
  return res.blob();
}

/** blob: URL dùng được cho <img>, useGLTF… (URL không thuộc /api/ được trả nguyên). */
export function authedObjectUrl(url: string): Promise<string> {
  if (!needsAuth(url)) return Promise.resolve(url);
  let hit = cache.get(url);
  if (!hit) {
    hit = fetchAuthed(url).then((b) => URL.createObjectURL(b));
    hit.catch(() => cache.delete(url));
    cache.set(url, hit);
  }
  return hit;
}

export function useAuthedUrl(url: string | null | undefined) {
  const [state, setState] = useState<{ src: string | null; error: string | null }>({ src: null, error: null });
  useEffect(() => {
    if (!url) { setState({ src: null, error: null }); return; }
    let active = true;
    setState({ src: needsAuth(url) ? null : url, error: null });
    authedObjectUrl(url)
      .then((src) => { if (active) setState({ src, error: null }); })
      .catch((e: Error) => { if (active) setState({ src: null, error: e.message }); });
    return () => { active = false; };
  }, [url]);
  return state;
}

/** Tải tệp có xác thực và lưu về máy với tên cho trước. */
export async function downloadAuthed(url: string, fileName: string) {
  const blob = await fetchAuthed(url);
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
  return blob;
}
