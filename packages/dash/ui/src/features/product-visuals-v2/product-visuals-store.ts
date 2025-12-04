import { create } from "zustand";
import type { AssetItem, GenerationMode } from "./product-visuals-types";

type ProductVisualsState = {
  mode: GenerationMode;
  prompt: string;
  productId: string;
  productImageUrls: string[];
  avatarAssets: AssetItem[];
  referenceAssets: AssetItem[];
  brandAssets: AssetItem[];
  setMode: (mode: GenerationMode) => void;
  setPrompt: (value: string) => void;
  setProductId: (id: string) => void;
  setProductImageUrls: (urls: string[]) => void;
  addAvatarAsset: (asset: AssetItem) => void;
  removeAvatarAsset: (id: string) => void;
  addReferenceAsset: (asset: AssetItem) => void;
  removeReferenceAsset: (id: string) => void;
  addBrandAsset: (asset: AssetItem) => void;
  removeBrandAsset: (id: string) => void;
};

export const useProductVisualsStore = create<ProductVisualsState>((set) => ({
  mode: "video",
  prompt: "",
  productId: "",
  productImageUrls: [],
  avatarAssets: [],
  referenceAssets: [],
  brandAssets: [],
  setMode: (mode) => set({ mode }),
  setPrompt: (value) => set({ prompt: value }),
  setProductId: (productId) => set({ productId }),
  setProductImageUrls: (productImageUrls) => set({ productImageUrls }),
  addAvatarAsset: (asset) =>
    set((state) => ({ avatarAssets: [...state.avatarAssets, asset] })),
  removeAvatarAsset: (id) =>
    set((state) => ({
      avatarAssets: state.avatarAssets.filter((item) => item.id !== id),
    })),
  addReferenceAsset: (asset) =>
    set((state) => ({
      referenceAssets: [...state.referenceAssets, asset],
    })),
  removeReferenceAsset: (id) =>
    set((state) => ({
      referenceAssets: state.referenceAssets.filter((item) => item.id !== id),
    })),
  addBrandAsset: (asset) =>
    set((state) => ({ brandAssets: [...state.brandAssets, asset] })),
  removeBrandAsset: (id) =>
    set((state) => ({
      brandAssets: state.brandAssets.filter((item) => item.id !== id),
    })),
}));
