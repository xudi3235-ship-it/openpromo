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
import { ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { useProductCreateMutation } from "@/queries/product";
import { useProductAIWorkflowStore } from "@/stores/product-ai-workflow-store";

// ============= Schema =============
const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

// ============= Component =============
export function CreateProductStep() {
  const {
    productFormData,
    prefilledAttachments,
    setProductFormData,
    setCreatedProductId,
    goToNextStep,
    setSkipProduct,
  } = useProductAIWorkflowStore();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: productFormData,
  });

  const createProduct = useProductCreateMutation(() => {
    goToNextStep();
  });

  const handleSubmit = async (values: ProductFormValues) => {
    try {
      // Update store with form data
      setProductFormData(values);

      const result = await createProduct.mutateAsync({
        ...values,
        source: "MANUAL",
        attachments: prefilledAttachments,
        primaryAttachmentId: prefilledAttachments[0]?.id,
      });

      // Store created product ID
      if (result && "id" in result) {
        setCreatedProductId(result.id as string);
      }

      toast.success("Product created!");
    } catch (error) {
      toast.error("Failed to create product");
      throw error;
    }
  };

  const handleSkip = () => {
    setSkipProduct(true);
    goToNextStep();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Media Preview */}
        {prefilledAttachments.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {prefilledAttachments.length} file
              {prefilledAttachments.length > 1 ? "s" : ""} ready
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {prefilledAttachments.slice(0, 8).map((attachment, idx) => {
                const imageUrl =
                  attachment.type === "photo"
                    ? attachment.publicUrl || attachment.presignedUrl
                    : null;
                return (
                  <div
                    key={attachment.id || idx}
                    className="flex-shrink-0 w-20 h-20 rounded-lg border overflow-hidden bg-muted"
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                        Video
                      </div>
                    )}
                  </div>
                );
              })}
              {prefilledAttachments.length > 8 && (
                <div className="flex-shrink-0 w-20 h-20 rounded-lg border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  +{prefilledAttachments.length - 8}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Form Fields */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Summer Beach Towel" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Brief description of your product..."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex justify-between pt-4 gap-2">
          <Button type="button" variant="ghost" onClick={handleSkip}>
            Skip for now
          </Button>
          <Button
            type="submit"
            disabled={createProduct.isPending}
            className="gap-2"
          >
            {createProduct.isPending ? (
              "Creating..."
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
