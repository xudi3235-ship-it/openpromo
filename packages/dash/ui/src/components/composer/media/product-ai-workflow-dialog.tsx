import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import type { SharedAttachmentSpec } from "@shared/content";
import { Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useProductAIWorkflowStore } from "@/stores/product-ai-workflow-store";
import { CreateProductStep } from "./workflow-steps/create-product-step";
import { GenerateAIStep } from "./workflow-steps/generate-ai-step";

// ============= Props =============
interface ProductAIWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefilledAttachments?: SharedAttachmentSpec[];
}

// ============= Main Component =============
export function ProductAIWorkflowDialog({
  open,
  onOpenChange,
  prefilledAttachments = [],
}: ProductAIWorkflowDialogProps) {
  const { currentStep, setIsOpen, setPrefilledAttachments, resetWorkflow } =
    useProductAIWorkflowStore();

  // Sync props with store
  useEffect(() => {
    if (open) {
      setIsOpen(true);
      setPrefilledAttachments(prefilledAttachments);
    }
  }, [open, prefilledAttachments, setIsOpen, setPrefilledAttachments]);

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange(newOpen);
    if (!newOpen) {
      resetWorkflow();
    }
  };

  const handleComplete = () => {
    handleOpenChange(false);
  };

  // Step metadata
  const stepInfo = {
    "create-product": {
      title: "Create Product",
      description: "Add your product details to get started with AI generation",
    },
    "generate-ai": {
      title: "Generate AI Images",
      description: "Describe the images you want to generate",
    },
  };

  const currentStepInfo = stepInfo[currentStep];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle>{currentStepInfo.title}</DialogTitle>
          </div>
          <DialogDescription>{currentStepInfo.description}</DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          <div
            className={`h-2 w-2 rounded-full transition-colors ${
              currentStep === "create-product"
                ? "bg-primary"
                : "bg-muted-foreground"
            }`}
          />
          <div className="h-px w-12 bg-border" />
          <div
            className={`h-2 w-2 rounded-full transition-colors ${
              currentStep === "generate-ai"
                ? "bg-primary"
                : "bg-muted-foreground"
            }`}
          />
        </div>

        {/* Step Content */}
        <div className="py-2">
          {currentStep === "create-product" && <CreateProductStep />}
          {currentStep === "generate-ai" && (
            <GenerateAIStep onComplete={handleComplete} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
