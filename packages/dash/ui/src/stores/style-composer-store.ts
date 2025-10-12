import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export interface ImagePreview {
  id: string;
  url: string;
  file: File;
}

export interface StyleComposerState {
  // Form data
  name: string;
  description: string;
  imageGenPrompt: string;
  images: File[];
  imagePreviews: ImagePreview[];

  // UI state
  isDragging: boolean;
  isUploading: boolean;
  isOpen: boolean;

  // Actions
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setImageGenPrompt: (prompt: string) => void;
  addImages: (files: File[]) => void;
  removeImage: (id: string) => void;
  setIsDragging: (isDragging: boolean) => void;
  setIsUploading: (isUploading: boolean) => void;
  openComposer: () => void;
  closeComposer: () => void;
  resetComposer: () => void;
}

const initialState = {
  name: "",
  description: "",
  imageGenPrompt: "",
  images: [],
  imagePreviews: [],
  isDragging: false,
  isUploading: false,
  isOpen: false,
};

export const useStyleComposerStore = create<StyleComposerState>()(
  immer((set) => ({
    ...initialState,

    setName: (name) =>
      set((state) => {
        state.name = name;
      }),

    setDescription: (description) =>
      set((state) => {
        state.description = description;
      }),

    setImageGenPrompt: (prompt) =>
      set((state) => {
        state.imageGenPrompt = prompt;
      }),

    addImages: (files) =>
      set((state) => {
        state.images.push(...files);

        // Create preview URLs
        files.forEach((file) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            set((innerState) => {
              innerState.imagePreviews.push({
                id: `${Date.now()}-${Math.random()}`,
                url: reader.result as string,
                file,
              });
            });
          };
          reader.readAsDataURL(file);
        });
      }),

    removeImage: (id) =>
      set((state) => {
        const index = state.imagePreviews.findIndex((p) => p.id === id);
        if (index !== -1) {
          state.images.splice(index, 1);
          state.imagePreviews.splice(
            state.imagePreviews.findIndex((p) => p.id === id),
            1,
          );
        }
      }),

    setIsDragging: (isDragging) =>
      set((state) => {
        state.isDragging = isDragging;
      }),

    setIsUploading: (isUploading) =>
      set((state) => {
        state.isUploading = isUploading;
      }),

    openComposer: () =>
      set((state) => {
        state.isOpen = true;
      }),

    closeComposer: () =>
      set((state) => {
        state.isOpen = false;
      }),

    resetComposer: () =>
      set(() => ({
        ...initialState,
      })),
  })),
);
