import { create } from "zustand";
import type { ProductSelectItem } from "@/components/image-generator/product-select";
import type { StyleGalleryItem } from "@/components/image-generator/style-gallery";
import type { AssetItem, GenerationMode } from "./instant-ad-types";

type InstantAdState = {
  mode: GenerationMode;
  prompt: string;
  productId: string;
  productImageUrls: string[];
  avatarAssets: AssetItem[];
  referenceAssets: AssetItem[];
  brandAssets: AssetItem[];
  selectedStyleId: string;
  selectedVideoPresetId: string | undefined;
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
  setSelectedStyleId: (id: string) => void;
  setSelectedVideoPresetId: (id: string) => void;
  selectStyle: (styleId: string, styles: StyleGalleryItem[]) => void;
  selectVideoPreset: (presetId: string | undefined) => void;
  selectProduct: (id: string, products: ProductSelectItem[]) => void;
};

export const useInstantAdStore = create<InstantAdState>((set, get) => ({
  mode: "video",
  prompt: "",
  productId: "",
  productImageUrls: [],
  avatarAssets: [],
  referenceAssets: [],
  brandAssets: [],
  selectedStyleId: "",
  selectedVideoPresetId: "",
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
  setSelectedStyleId: (id) => set({ selectedStyleId: id }),
  setSelectedVideoPresetId: (id) => set({ selectedVideoPresetId: id }),
  selectStyle: (styleId, styles) => {
    const style = styles.find((s) => s.id === styleId);
    if (!style) return;
    const styleImages = style.imageRefs.filter((url): url is string =>
      Boolean(url),
    );
    set({ selectedStyleId: styleId });
    styleImages.forEach((url) => {
      get().addReferenceAsset({ id: url, url });
    });
  },
  selectVideoPreset: (presetId) => set({ selectedVideoPresetId: presetId }),
  selectProduct: (id, products) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    const urls: string[] =
      product.attachments
        ?.map((a) => a.publicUrl || a.presignedUrl)
        .filter((v): v is string => Boolean(v)) ?? [];
    set({ productId: id, productImageUrls: urls.length > 0 ? urls : [] });
  },
}));
