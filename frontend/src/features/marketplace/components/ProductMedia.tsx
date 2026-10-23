import { Box } from 'lucide-react'
import { useState } from 'react'
import { accentFor, resolveMediaUrl } from '../lib/format'

type Props = {
  src?: string
  alt: string
  seed: number
  className?: string
}

/** Ảnh sản phẩm trên "bục trưng bày" pastel; bục luôn hiển thị khi ảnh đang tải, lỗi hoặc không có media. */
export function ProductMedia({ src, alt, seed, className = '' }: Props) {
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>('loading')
  const accent = accentFor(seed)
  const url = resolveMediaUrl(src)

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${accent.stage} ${className}`}>
      {state !== 'loaded' && (
        <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
          <div className="grid place-items-center">
            <div className="grid h-20 w-20 place-items-center rounded-3xl bg-white/80 text-ink-soft shadow-soft backdrop-blur transition-transform duration-500 group-hover:-translate-y-1">
              <Box size={36} strokeWidth={1.5} />
            </div>
            <div className="mt-3 h-4 w-28 rounded-[50%] bg-ink/10 blur-[2px]" />
          </div>
        </div>
      )}
      {url && state !== 'failed' && (
        <img
          key={url}
          src={url}
          alt={alt}
          loading="lazy"
          onLoad={() => setState('loaded')}
          onError={() => setState('failed')}
          className={`relative h-full w-full object-cover transition duration-500 group-hover:scale-105 ${state === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  )
}
