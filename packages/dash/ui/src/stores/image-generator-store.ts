// Re-export from the new store for backward compatibility
export {
  type GenerationType,
  type GeneratorMode as ImageGeneratorMode,
  type ProductVisualGeneratorState as ImageGeneratorState,
  useProductVisualGeneratorStore as useImageGeneratorStore,
  useProductVisualGeneratorStore,
} from "./product-visual-generator-store";
