import { Box, Eye } from 'lucide-react'
import { lazy, type ReactNode, Suspense, useEffect, useState } from 'react'
import { ApiClientError } from '../../../services/http'
import { modelService } from '../services/model.service'
import type { ModelFile } from '../types/model.types'

// Tải three.js / Viewer3D của AI Studio khi cần (tách chunk).
const Viewer3D = lazy(() => import('../../../ai/components/Viewer3D').then((m) => ({ default: m.Viewer3D })))

/** Xem trước GLB: tải tệp có kiểm tra quyền → blob URL → Viewer3D. Chỉ tải khi người dùng bấm. */
export function ModelPreview({ modelId, files }: { modelId: string; files: ModelFile[] }) {
  const glb =
    files.find((f) => f.fileFormat?.toLowerCase() === 'glb' && f.fileRole === 'VIEWABLE_MODEL') ??
    files.find((f) => f.fileFormat?.toLowerCase() === 'glb')
  const [url, setUrl] = useState<string>()
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState('')

  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url])

  const load = async () => {
    if (!glb) return
    setState('loading')
    try {
      const blob = await modelService.download(modelId, glb.fileId)
      setUrl(URL.createObjectURL(blob))
      setState('idle')
    } catch (e) {
      setState('error')
      setError(e instanceof ApiClientError ? e.message : 'Không tải được mô hình.')
    }
  }

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-soft via-[#f4f0ff] to-peach">
      {url ? (
        <Suspense fallback={<Center>Đang khởi tạo trình xem 3D…</Center>}>
          <div className="absolute inset-0">
            <Viewer3D url={url} mode="textured" grid bbox={false} autoRotate studioLight />
          </div>
        </Suspense>
      ) : (
        <Center>
          <span className="grid h-20 w-20 place-items-center rounded-3xl bg-white/85 text-violet shadow-soft">
            <Box size={36} strokeWidth={1.5} />
          </span>
          {glb ? (
            <button
              type="button"
              onClick={load}
              disabled={state === 'loading'}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-label text-sm font-semibold text-white hover:bg-violet disabled:opacity-60"
            >
              <Eye size={15} /> {state === 'loading' ? 'Đang tải mô hình…' : 'Xem trước 3D (GLB)'}
            </button>
          ) : (
            <p className="mt-4 max-w-xs text-center text-sm text-ink-soft">
              Phiên bản này không có tệp GLB để xem trước. Tải tệp về để mở bằng phần mềm 3D.
            </p>
          )}
          {state === 'error' && <p className="mt-2 text-sm text-danger">{error}</p>}
        </Center>
      )}
    </div>
  )
}

function Center({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-sm text-ink-soft">
      {children}
    </div>
  )
}
