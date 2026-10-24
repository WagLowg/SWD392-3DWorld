import { create } from 'zustand'

type Toast = { id: number; tone: 'success' | 'error'; message: string; action?: { label: string; to: string } }

type MarketplaceUiState = {
  toast: Toast | null
  showToast: (message: string, tone?: Toast['tone'], action?: Toast['action']) => void
  clearToast: () => void
}

export const useMarketplaceUiStore = create<MarketplaceUiState>((set) => ({
  toast: null,
  showToast: (message, tone = 'success', action) => set({ toast: { id: Date.now(), tone, message, action } }),
  clearToast: () => set({ toast: null }),
}))
