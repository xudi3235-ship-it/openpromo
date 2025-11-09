import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export interface ImageGeneratorState {
  selectedProductId: string;
  selectedStyleId: string;
  batchCount: number;
  prompt: string;
  referenceImageUrl: string;
  isGeneratorDialogOpen: boolean;

  // Actions
  setSelectedProductId: (productId: string) => void;
  setSelectedStyleId: (styleId: string) => void;
  setBatchCount: (count: number) => void;
  setPrompt: (prompt: string) => void;
  setReferenceImageUrl: (url: string) => void;
  setGeneratorDialogOpen: (open: boolean) => void;
  resetForm: () => void;
}

const initialState = {
  selectedProductId: "",
  selectedStyleId: "",
  batchCount: 1,
  prompt: "",
  referenceImageUrl: "",
  isGeneratorDialogOpen: false,
};

export const useImageGeneratorStore = create<ImageGeneratorState>()(
  immer((set) => ({
    ...initialState,

    setSelectedProductId: (productId) =>
      set((state) => {
        state.selectedProductId = productId;
      }),

    setSelectedStyleId: (styleId) =>
      set((state) => {
        state.selectedStyleId = styleId;
      }),

    setBatchCount: (count) =>
      set((state) => {
        state.batchCount = count;
      }),

    setPrompt: (prompt) =>
      set((state) => {
        state.prompt = prompt;
      }),

    setReferenceImageUrl: (url) =>
      set((state) => {
        state.referenceImageUrl = url;
      }),

    setGeneratorDialogOpen: (open) =>
      set((state) => {
        state.isGeneratorDialogOpen = open;
      }),

    resetForm: () =>
      set((state) => {
        state.selectedProductId = initialState.selectedProductId;
        state.selectedStyleId = initialState.selectedStyleId;
        state.batchCount = initialState.batchCount;
        state.prompt = initialState.prompt;
        state.referenceImageUrl = initialState.referenceImageUrl;
        state.isGeneratorDialogOpen = initialState.isGeneratorDialogOpen;
      }),
  })),
);
