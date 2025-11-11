import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@openpromo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import { Form } from "@openpromo/ui/components/form";
import { Tabs, TabsList, TabsTrigger } from "@openpromo/ui/components/tabs";
import { Link2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { useStorageUpload } from "@/hooks/useStorageUpload";
import { toCreateInput, toUpdateInput } from "@/lib/product-form-helpers";
import {
  type ProductCreateInput,
  useProductCreateMutation,
  useProductUpdateMutation,
} from "@/queries/product";
import { useProductModalStore } from "@/stores/product-modal-store";
import { LoadingOverlay } from "./loading-overlay";
import { ProductDetailsSection } from "./product-details-section";
import { ProductUploadTab } from "./product-upload-tab";
import { ProductUrlTab } from "./product-url-tab";

// Simple validation schema for form fields only
// The actual API types come from ORPC
const formSchema = z.object({
  sourceUrl: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  name: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateProductModal() {
  const {
    open,
    isEditMode,
    product,
    activeTab,
    selectedFiles,
    existingAttachments,
    isUploading,
    closeModal,
    setActiveTab,
    addFiles,
    removeFile,
    removeExistingAttachment,
    setIsUploading,
    reset,
  } = useProductModalStore();

  const { uploadFiles, clearUploads } = useStorageUpload();

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const resetForm = () => {
    form.reset();
    clearUploads();
    reset();
  };

  const createProduct = useProductCreateMutation(resetForm);
  const updateProduct = useProductUpdateMutation(resetForm);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sourceUrl: "",
      name: "",
      description: "",
      category: "",
      tags: "",
    },
  });

  // Watch form values to determine if details section should be shown
  const sourceUrl = form.watch("sourceUrl");

  // Auto-expand details section when user has content
  useEffect(() => {
    if (!isEditMode) {
      const hasContent =
        selectedFiles.length > 0 ||
        existingAttachments.length > 0 ||
        (sourceUrl && sourceUrl.length > 0);

      if (hasContent && !isDetailsOpen) {
        setIsDetailsOpen(true);
      }
    }
  }, [
    selectedFiles.length,
    existingAttachments.length,
    sourceUrl,
    isEditMode,
    isDetailsOpen,
  ]);

  // Populate form when editing and auto-expand details
  useEffect(() => {
    if (product && open) {
      form.reset({
        sourceUrl: product.sourceUrl || "",
        name: product.name || "",
        description: product.description || "",
        category: product.category || "",
        tags: product.tags?.join(", ") || "",
      });
      // Always expand details in edit mode
      setIsDetailsOpen(true);
    } else if (!open) {
      form.reset();
      setIsDetailsOpen(false);
    }
  }, [product, open, form]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      setIsUploading(true);

      if (isEditMode && product) {
        // Edit mode: only update provided fields
        const updateData = toUpdateInput(product.id, {
          name: values.name,
          description: values.description,
          category: values.category,
          tags: values.tags,
          sourceUrl: activeTab === "url" ? values.sourceUrl : undefined,
        });

        // Handle attachment uploads
        if (activeTab === "upload" && selectedFiles.length > 0) {
          toast.info("Uploading files...");
          const uploadResults = await uploadFiles(selectedFiles);

          const newAttachments = uploadResults.map((result, index) => ({
            id: result.key,
            type: selectedFiles[index].type.startsWith("image/")
              ? ("photo" as const)
              : ("video" as const),
            publicUrl: result.publicUrl,
            s3Key: result.key,
          }));

          const allAttachments = [...existingAttachments, ...newAttachments];
          updateData.attachments = allAttachments;
          updateData.primaryAttachmentId =
            allAttachments[0]?.id || product.primaryAttachmentId || undefined;
        } else if (existingAttachments.length !== product.attachments.length) {
          // Attachments were removed
          updateData.attachments = existingAttachments;
          updateData.primaryAttachmentId =
            existingAttachments[0]?.id || undefined;
        }

        updateProduct.mutate(updateData);
      } else {
        // Create mode: require attachments or sourceUrl
        if (activeTab === "url" && values.sourceUrl) {
          const createData = toCreateInput({
            name: values.name || "Product from URL",
            description: values.description,
            category: values.category,
            tags: values.tags,
            source: "CUSTOM_URL",
            sourceUrl: values.sourceUrl,
          });
          createProduct.mutate(createData);
        } else {
          // Upload files if any
          let attachments: ProductCreateInput["attachments"] = [];

          if (selectedFiles.length > 0) {
            toast.info("Uploading files...");
            const uploadResults = await uploadFiles(selectedFiles);

            attachments = uploadResults.map((result, index) => ({
              id: result.key,
              type: selectedFiles[index].type.startsWith("image/")
                ? ("photo" as const)
                : ("video" as const),
              publicUrl: result.publicUrl,
              s3Key: result.key,
            }));
          }

          const allAttachments = [...existingAttachments, ...attachments];

          if (allAttachments.length === 0) {
            toast.error("Please upload at least one image or video");
            setIsUploading(false);
            return;
          }

          const createData = toCreateInput({
            name: values.name || "Product",
            description: values.description,
            category: values.category,
            tags: values.tags,
            source: "MANUAL",
            attachments: allAttachments,
            primaryAttachmentId: allAttachments[0]?.id,
          });
          createProduct.mutate(createData);
        }
      }
    } catch (error) {
      toast.error("Failed to process product");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
      closeModal();
    }
  };

  const isPending = createProduct.isPending || updateProduct.isPending;
  const isProcessing = isPending || isUploading;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <LoadingOverlay
          isVisible={isProcessing}
          isUploading={isUploading}
          isEditMode={isEditMode}
        />

        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Product" : "Add Product"}
          </DialogTitle>
          <DialogDescription>
            Upload product images or provide a URL. We'll handle the rest with
            AI.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as "upload" | "url")}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger
                    value="upload"
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Files
                  </TabsTrigger>
                  <TabsTrigger value="url" className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    From URL
                  </TabsTrigger>
                </TabsList>

                <ProductUploadTab
                  existingAttachments={existingAttachments}
                  selectedFiles={selectedFiles}
                  isEditMode={isEditMode}
                  onAddFiles={addFiles}
                  onRemoveExisting={removeExistingAttachment}
                  onRemoveFile={removeFile}
                />

                <ProductUrlTab control={form.control} />
              </Tabs>

              <ProductDetailsSection
                control={form.control}
                isOpen={isDetailsOpen}
                onOpenChange={setIsDetailsOpen}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending || isUploading}>
                  {isUploading
                    ? "Uploading..."
                    : isPending
                      ? isEditMode
                        ? "Updating..."
                        : "Adding..."
                      : isEditMode
                        ? "Update Product"
                        : "Add Product"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
