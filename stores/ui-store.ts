import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
  setPrivacyMode: (value: boolean) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (value: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isPrivacyMode: false,
      togglePrivacyMode: () =>
        set((state) => ({ isPrivacyMode: !state.isPrivacyMode })),
      setPrivacyMode: (value: boolean) => set({ isPrivacyMode: value }),
      isSidebarOpen: true,
      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (value: boolean) => set({ isSidebarOpen: value }),
    }),
    {
      name: "wealthovers-ui-state",
    }
  )
);
