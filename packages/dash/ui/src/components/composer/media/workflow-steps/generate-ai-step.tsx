import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@openpromo/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@openpromo/ui/components/form";
import { Input } from "@openpromo/ui/components/input";
import { Textarea } from "@openpromo/ui/components/textarea";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { useProductAIWorkflowStore } from "@/stores/product-ai-workflow-store";

// ============= Schema =============
const aiGenerationSchema = z.object({
  prompt: z.string().min(10, "Please provide a more detailed prompt"),
  style: z.enum(["lifestyle", "product-shot", "studio", "creative"]),
  aspectRatio: z.enum(["1:1", "4:5", "16:9"]),
  variants: z.number().min(1).max(4),
});

type AIGenerationFormValues = z.infer<typeof aiGenerationSchema>;

// ============= Props =============
interface GenerateAIStepProps {
  onComplete: () => void;
}

// ============= Component =============
export function GenerateAIStep({ onComplete }: GenerateAIStepProps) {
  const {
    aiGenerationFormData,
    productFormData,
    skipProduct,
    createdProductId: _,
    prefilledAttachments: __,
    setAIGenerationFormData,
    goToPreviousStep,
  } = useProductAIWorkflowStore();

  const form = useForm<AIGenerationFormValues>({
    resolver: zodResolver(aiGenerationSchema),
    defaultValues: aiGenerationFormData,
  });

  const handleSubmit = async (values: AIGenerationFormValues) => {
    try {
      // Update store with form data
      setAIGenerationFormData(values);
      toast.info("AI generation started...");

      // Simulate generation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast.success("AI images generated!");
      onComplete();
    } catch (error) {
      toast.error("Failed to generate images");
      throw error;
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="h-full flex flex-col"
      >
        <div className="flex-1 space-y-6 pb-4">
          {/* Product Context Card */}
          {!skipProduct && productFormData.name && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Generating for:
              </p>
              <p className="text-sm font-semibold">{productFormData.name}</p>
              {productFormData.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {productFormData.description}
                </p>
              )}
            </div>
          )}

          {/* Prompt Field */}
          <FormField
            control={form.control}
            name="prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Generation Prompt *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe the scene or style... e.g. 'Product floating on water with sunset background, professional product photography'"
                    rows={8}
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Be specific about lighting, background, and composition
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Style and Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="style"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Style</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full h-11 px-3 rounded-md border bg-background text-sm"
                    >
                      <option value="lifestyle">Lifestyle</option>
                      <option value="product-shot">Product Shot</option>
                      <option value="studio">Studio</option>
                      <option value="creative">Creative</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="aspectRatio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aspect Ratio</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full h-11 px-3 rounded-md border bg-background text-sm"
                    >
                      <option value="1:1">1:1 (Square)</option>
                      <option value="4:5">4:5 (Portrait)</option>
                      <option value="16:9">16:9 (Landscape)</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="variants"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variants</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={4}
                      className="h-11"
                      {...field}
                      onChange={(e) =>
                        field.onChange(Number.parseInt(e.target.value, 10))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Actions - Fixed at bottom */}
        <div className="flex justify-between pt-4 border-t gap-2 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={goToPreviousStep}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button type="submit" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Generate Images
          </Button>
        </div>
      </form>
    </Form>
  );
}
