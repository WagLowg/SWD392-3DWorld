import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

type UiState = {
  mobileNavigationOpen: boolean
  setMobileNavigationOpen: (open: boolean) => void
  toggleMobileNavigation: () => void
}

export const useUiStore = create<UiState>()(
  devtools(
    (set) => ({
      mobileNavigationOpen: false,
      setMobileNavigationOpen: (open) => set({ mobileNavigationOpen: open }, false, 'ui/setMobileNavigationOpen'),
      toggleMobileNavigation: () =>
        set((state) => ({ mobileNavigationOpen: !state.mobileNavigationOpen }), false, 'ui/toggleMobileNavigation'),
    }),
    { name: '3DWorld UI' },
  ),
)
