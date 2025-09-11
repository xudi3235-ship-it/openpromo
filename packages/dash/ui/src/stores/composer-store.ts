import { create } from "zustand";

interface ComposerState {
  bears: number;
  increase: (by: number) => void;
}

export const useComposerStore = create<ComposerState>()((set) => ({
  bears: 0,
  increase: (by) => set((state) => ({ bears: state.bears + by })),
}));
