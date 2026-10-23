import { CheckCircle2, XCircle } from 'lucide-react'
import { useEffect } from 'react'
import { create } from 'zustand'

type Toast = { id: number; tone: 'success' | 'error'; message: string }

type ToastState = {
  toast: Toast | null
  show: (message: string, tone?: Toast['tone']) => void
  clear: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  show: (message, tone = 'success') => set({ toast: { id: Date.now(), tone, message } }),
  clear: () => set({ toast: null }),
}))

export function useToast() {
  return useToastStore((s) => s.show)
}

export function Toaster() {
  const toast = useToastStore((s) => s.toast)
  const clear = useToastStore((s) => s.clear)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(clear, 3600)
    return () => clearTimeout(t)
  }, [toast, clear])

  if (!toast) return null
  return (
    <div role="status" className="fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
      <div
        key={toast.id}
        className="flex items-center gap-2 rounded-full bg-ink px-5 py-3 font-label text-sm font-semibold text-white shadow-lift animate-fade-up"
      >
        {toast.tone === 'success' ? (
          <CheckCircle2 size={17} className="text-mint" />
        ) : (
          <XCircle size={17} className="text-peach" />
        )}
        {toast.message}
      </div>
    </div>
  )
}
