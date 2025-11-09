import type { ProductSelectType } from "@core/schemas/product.sql";
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
import { Link2, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Dropzone } from "@/components/dropzone";
import { useStorageUpload } from "@/hooks/useStorageUpload";
import {
  useProductCreateMutation,
  useProductUpdateMutation,
} from "@/queries/product";

const schema = z.object({
  sourceUrl: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

interface CreateProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductSelectType;
  prefilledAttachments?: Array<{
    id: string;
    type: "photo" | "video";
    publicUrl?: string;
    presignedUrl?: string;
  }>;
}

export function CreateProductModal({
  open,
  onOpenChange,
  product,
  prefilledAttachments,
}: CreateProductModalProps) {
  const isEditMode = Boolean(product);
  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<
    ProductSelectType["attachments"]
  >([]);
  const [isUploading, setIsUploading] = useState(false);

  const { uploadFiles, clearUploads } = useStorageUpload();

  const resetForm = () => {
    form.reset();
    setSelectedFiles([]);
    setExistingAttachments([]);
    setActiveTab("upload");
    clearUploads();
    onOpenChange(false);
  };

  const createProduct = useProductCreateMutation(resetForm);
  const updateProduct = useProductUpdateMutation(resetForm);

  const handleFileDrop = (files: File[]) => {
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingAttachment = (index: number) => {
    setExistingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      sourceUrl: "",
    },
  });

  // Populate form when editing or prefilling
  useEffect(() => {
    if (product && open) {
      form.reset({
        sourceUrl: product.sourceUrl || "",
      });
      setExistingAttachments(product.attachments || []);
      if (product.sourceUrl) {
        setActiveTab("url");
      }
    } else if (prefilledAttachments && open && !product) {
      setExistingAttachments(
        prefilledAttachments as ProductSelectType["attachments"],
      );
      setActiveTab("upload");
    } else if (!open) {
      form.reset();
      setSelectedFiles([]);
      setExistingAttachments([]);
      setActiveTab("upload");
    }
  }, [product, prefilledAttachments, open, form]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      setIsUploading(true);

      type ProductData = {
        name: string;
        source: "MANUAL" | "CUSTOM_URL";
        sourceUrl?: string;
        attachments?: Array<{
          id: string;
          type: "photo" | "video";
          publicUrl: string;
          s3Key?: string;
        }>;
        primaryAttachmentId?: string;
      };

      let productData: ProductData;

      if (activeTab === "url" && values.sourceUrl) {
        productData = {
          name: "Product from URL",
          source: "CUSTOM_URL",
          sourceUrl: values.sourceUrl,
        };
      } else {
        let attachments: Array<{
          id: string;
          type: "photo" | "video";
          publicUrl: string;
          s3Key?: string;
        }> = [];

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

        productData = {
          name: "Product",
          source: "MANUAL",
          attachments: allAttachments as Array<{
            id: string;
            type: "photo" | "video";
            publicUrl: string;
            s3Key?: string;
          }>,
          primaryAttachmentId: allAttachments[0]?.id,
        };
      }

      if (isEditMode && product) {
        updateProduct.mutate({ productId: product.id, ...productData });
      } else {
        createProduct.mutate(productData);
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
    }
    onOpenChange(newOpen);
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
                  onDrop={handleFileDrop}
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
