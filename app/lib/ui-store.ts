import { create } from "zustand";

type UiStore = { activeSection: string; createIntent: string | null; setActiveSection: (section: string) => void; requestCreate: (section: string) => void; clearCreateIntent: () => void };

export const useUiStore = create<UiStore>((set) => ({
  activeSection: "Dashboard",
  createIntent: null,
  setActiveSection: (activeSection) => set({ activeSection }),
  requestCreate: (section) => set({ activeSection: section, createIntent: section }),
  clearCreateIntent: () => set({ createIntent: null }),
}));
