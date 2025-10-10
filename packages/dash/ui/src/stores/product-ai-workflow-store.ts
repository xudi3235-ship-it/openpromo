import type { SharedAttachmentSpec } from "@shared/content";
import { create } from "zustand";

// ============= Types =============
export type WorkflowStep = "create-product" | "generate-ai";

export interface ProductFormData {
  name: string;
  description: string;
}

export interface AIGenerationFormData {
  prompt: string;
  style: "lifestyle" | "product-shot" | "studio" | "creative";
  aspectRatio: "1:1" | "4:5" | "16:9";
  variants: number;
}

interface ProductAIWorkflowState {
  // Workflow state
  currentStep: WorkflowStep;
  isOpen: boolean;

  // Product data
  productFormData: ProductFormData;
  createdProductId: string | null;
  skipProduct: boolean;

  // AI generation data
  aiGenerationFormData: AIGenerationFormData;

  // Media
  prefilledAttachments: SharedAttachmentSpec[];

  // Actions
  setCurrentStep: (step: WorkflowStep) => void;
  setIsOpen: (open: boolean) => void;
  setProductFormData: (data: Partial<ProductFormData>) => void;
  setCreatedProductId: (id: string | null) => void;
  setSkipProduct: (skip: boolean) => void;
  setAIGenerationFormData: (data: Partial<AIGenerationFormData>) => void;
  setPrefilledAttachments: (attachments: SharedAttachmentSpec[]) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  resetWorkflow: () => void;
}

// ============= Initial State =============
const initialProductFormData: ProductFormData = {
  name: "",
  description: "",
};

const initialAIGenerationFormData: AIGenerationFormData = {
  prompt: "",
  style: "lifestyle",
  aspectRatio: "1:1",
  variants: 2,
};

// ============= Store =============
export const useProductAIWorkflowStore = create<ProductAIWorkflowState>(
  (set, get) => ({
    // Initial state
    currentStep: "create-product",
    isOpen: false,
    productFormData: initialProductFormData,
    createdProductId: null,
    skipProduct: false,
    aiGenerationFormData: initialAIGenerationFormData,
    prefilledAttachments: [],

    // Actions
    setCurrentStep: (step) => set({ currentStep: step }),

    setIsOpen: (open) => {
      set({ isOpen: open });
      // Reset workflow when closing
      if (!open) {
        get().resetWorkflow();
      }
    },

    setProductFormData: (data) =>
      set((state) => ({
        productFormData: { ...state.productFormData, ...data },
      })),

    setCreatedProductId: (id) => set({ createdProductId: id }),

    setSkipProduct: (skip) => set({ skipProduct: skip }),

    setAIGenerationFormData: (data) =>
      set((state) => ({
        aiGenerationFormData: { ...state.aiGenerationFormData, ...data },
      })),

    setPrefilledAttachments: (attachments) =>
      set({ prefilledAttachments: attachments }),

    goToNextStep: () => {
      const { currentStep } = get();
      if (currentStep === "create-product") {
        set({ currentStep: "generate-ai" });
      }
    },

    goToPreviousStep: () => {
      const { currentStep } = get();
      if (currentStep === "generate-ai") {
        set({ currentStep: "create-product" });
      }
    },

    resetWorkflow: () =>
      set({
        currentStep: "create-product",
        productFormData: initialProductFormData,
        createdProductId: null,
        skipProduct: false,
        aiGenerationFormData: initialAIGenerationFormData,
        prefilledAttachments: [],
      }),
  }),
);
