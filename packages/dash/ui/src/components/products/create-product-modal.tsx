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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@openpromo/ui/components/form";
import { Input } from "@openpromo/ui/components/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@openpromo/ui/components/tabs";
import { Textarea } from "@openpromo/ui/components/textarea";
import { Link2, Upload, X } from "lucide-react";
import { useEffect } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Dropzone } from "@/components/dropzone";
import { useStorageUpload } from "@/hooks/useStorageUpload";
import { toCreateInput, toUpdateInput } from "@/lib/product-form-helpers";
import {
  type ProductCreateInput,
  useProductCreateMutation,
  useProductUpdateMutation,
} from "@/queries/product";
import { useProductModalStore } from "@/stores/product-modal-store";

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

  // Populate form when editing
  useEffect(() => {
    if (product && open) {
      form.reset({
        sourceUrl: product.sourceUrl || "",
        name: product.name || "",
        description: product.description || "",
        category: product.category || "",
        tags: product.tags?.join(", ") || "",
      });
    } else if (!open) {
      form.reset();
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {isProcessing && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 dark:bg-black/70 backdrop-blur-[2px] rounded-lg pointer-events-none">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-12 min-w-80">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-gray-100 dark:border-gray-800" />
                  <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-gray-900 dark:border-t-gray-100 animate-spin" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {isUploading
                      ? "Uploading files"
                      : isEditMode
                        ? "Updating product"
                        : "Creating product"}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isUploading
                      ? "This may take a moment..."
                      : "Processing your product..."}
                  </p>
                </div>

                <div className="flex space-x-1.5">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Product" : "Add Product"}
          </DialogTitle>
          <DialogDescription>
            Upload product images or provide a URL. We'll handle the rest with
            AI.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "upload" | "url")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Files
                </TabsTrigger>
                <TabsTrigger value="url" className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  From URL
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-3 mt-4">
                <Dropzone
                  accept={{ "image/*": [], "video/*": [] }}
                  maxFiles={10}
                  maxSize={50 * 1024 * 1024}
                  onDrop={addFiles}
                  className="h-32"
                >
                  <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
                    <div className="text-center">
                      <p className="text-sm font-medium mb-1">
                        Upload product images or videos
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Drag and drop or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Max 10 files • Up to 50MB each
                      </p>
                    </div>
                  </div>
                </Dropzone>

                {(existingAttachments.length > 0 ||
                  selectedFiles.length > 0) && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {existingAttachments.length + selectedFiles.length} file
                      {existingAttachments.length + selectedFiles.length > 1
                        ? "s"
                        : ""}{" "}
                      {isEditMode && existingAttachments.length > 0
                        ? `(${existingAttachments.length} existing${selectedFiles.length > 0 ? `, ${selectedFiles.length} new` : ""})`
                        : "selected"}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {existingAttachments.map((attachment, index) => {
                        const imageUrl =
                          attachment.type === "photo"
                            ? attachment.publicUrl || attachment.presignedUrl
                            : null;
                        return (
                          <div
                            key={attachment.id || `existing-${index}`}
                            className="relative group rounded-lg border overflow-hidden"
                          >
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={`Attachment ${index + 1}`}
                                className="w-full aspect-square object-cover"
                              />
                            ) : (
                              <div className="w-full aspect-square bg-muted flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">
                                  Video
                                </span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => removeExistingAttachment(index)}
                              className="absolute top-1 right-1 p-1 bg-background/80 hover:bg-destructive hover:text-destructive-foreground rounded-md transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/80 to-transparent p-2">
                              <p className="text-xs truncate">Existing</p>
                            </div>
                          </div>
                        );
                      })}

                      {selectedFiles.map((file, index) => (
                        <div
                          key={`${file.name}-${file.size}-${index}`}
                          className="relative group rounded-lg border overflow-hidden"
                        >
                          {file.type.startsWith("image/") ? (
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="w-full aspect-square object-cover"
                            />
                          ) : (
                            <div className="w-full aspect-square bg-muted flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">
                                Video
                              </span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute top-1 right-1 p-1 bg-background/80 hover:bg-destructive hover:text-destructive-foreground rounded-md transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/80 to-transparent p-2">
                            <p className="text-xs truncate">{file.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="url" className="space-y-3 mt-4">
                <FormField
                  control={form.control}
                  name="sourceUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://amazon.com/product/... or any product page"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Paste any product URL (Amazon, Shopify, Etsy, or your
                        own site). We'll automatically extract product info and
                        images.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            {/* Product Details Section */}
            <div className="space-y-3 pt-2 border-t">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter product name" {...field} />
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter product description"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Electronics" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <Input placeholder="tag1, tag2, tag3" {...field} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Comma-separated
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

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
      </DialogContent>
    </Dialog>
  );
}
