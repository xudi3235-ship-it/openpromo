"use client";

import { Button } from "@openpromo/ui/components/button";
import { Dialog, DialogContent } from "@openpromo/ui/components/dialog";
import { cn } from "@openpromo/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { GenerationResultStep } from "./steps/generation-result-step";
import { RoleSelectionStep } from "./steps/role-selection-step";
import { UploadStep } from "./steps/upload-step";

export type OnboardingStep = 1 | 2 | 3;
export type UserRole = "ecommerce" | "creator" | "agency" | "exploring" | null;

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSkip: () => void;
}

export function OnboardingDialog({
  open,
  onOpenChange,
  onSkip,
}: OnboardingDialogProps) {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(
    null,
  );

  const handleRoleSelect = (role: UserRole) => {
    setUserRole(role);
  };

  const handleUpload = (imageUrl: string) => {
    setUploadedImageUrl(imageUrl);
  };

  const handlePresetSelect = (presetId: string) => {
    setSelectedPresetId(presetId);
  };

  const handleGenerate = () => {
    if (!uploadedImageUrl) return;
    setIsGenerating(true);
    // Simulate generation (placeholder for actual API call)
    setTimeout(() => {
      setGeneratedImageUrl(uploadedImageUrl);
      setIsGenerating(false);
      setStep(3);
    }, 2500);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as OnboardingStep);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2 && uploadedImageUrl) {
      handleGenerate();
    }
  };

  const handleTryAnother = () => {
    setGeneratedImageUrl(null);
    setUploadedImageUrl(null);
    setStep(2);
  };

  const handleSkip = () => {
    onOpenChange(false);
    onSkip();
  };

  const canProceed =
    step === 1 ? true : step === 2 ? !!uploadedImageUrl : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl w-full p-0 overflow-hidden gap-0"
        overlayClassName="backdrop-blur-md bg-black/70"
        showCloseButton={false}
      >
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 pt-6 pb-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                s === step
                  ? "w-8 bg-foreground"
                  : s < step
                    ? "w-4 bg-foreground/60"
                    : "w-4 bg-muted-foreground/30",
              )}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[400px] relative">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="p-8"
              >
                <RoleSelectionStep
                  selectedRole={userRole}
                  onRoleSelect={handleRoleSelect}
                />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="p-8"
              >
                <UploadStep
                  uploadedImageUrl={uploadedImageUrl}
                  selectedPresetId={selectedPresetId}
                  onUpload={handleUpload}
                  onPresetSelect={handlePresetSelect}
                  isGenerating={isGenerating}
                />
              </motion.div>
            )}

            {step === 3 && generatedImageUrl && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="p-8"
              >
                <GenerationResultStep
                  generatedImageUrl={generatedImageUrl}
                  onTryAnother={handleTryAnother}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between border-t bg-muted/30 px-6 py-4">
          <div>
            {step > 1 && step < 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                disabled={isGenerating}
              >
                <ArrowLeft className="mr-1 size-4" />
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Skip
            </Button>

            {step < 3 && (
              <Button
                onClick={handleNext}
                disabled={!canProceed || isGenerating}
                size="sm"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Generating...
                  </>
                ) : step === 2 && uploadedImageUrl ? (
                  <>
                    Generate Ad
                    <ArrowRight className="ml-1 size-4" />
                  </>
                ) : (
                  <>
                    {step === 1 ? "Continue" : "Next"}
                    <ArrowRight className="ml-1 size-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
