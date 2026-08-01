import { create } from "zustand";

type UiStore = { activeSection: string; setActiveSection: (section: string) => void };

export const useUiStore = create<UiStore>((set) => ({
  activeSection: "Dashboard",
  setActiveSection: (activeSection) => set({ activeSection }),
}));
