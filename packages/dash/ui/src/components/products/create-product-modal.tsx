import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@openpromo/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@openpromo/ui/components/collapsible";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openpromo/ui/components/select";
import { Textarea } from "@openpromo/ui/components/textarea";
import { ChevronDown, Plus, X } from "lucide-react";
import { useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Dropzone } from "@/components/dropzone";
import { useStorageUpload } from "@/hooks/useStorageUpload";
import { useProductCreateMutation } from "@/queries/product";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()),
  source: z.enum(["MANUAL", "AMAZON", "SHOPIFY", "ETSY", "CUSTOM_URL"]),
  sourceUrl: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CreateProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProductModal({
  open,
  onOpenChange,
}: CreateProductModalProps) {
  const [tagInput, setTagInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { uploadFiles, clearUploads } = useStorageUpload();

  const createProduct = useProductCreateMutation(() => {
    form.reset();
    setSelectedFiles([]);
    setDetailsOpen(false);
    clearUploads();
    onOpenChange(false);
  });

  const handleFileDrop = (files: File[]) => {
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      tags: [],
      source: "MANUAL",
      sourceUrl: "",
    },
  });

  const selectedSource = form.watch("source");

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      setIsUploading(true);

      let attachments: Array<{
        id: string;
        type: "photo" | "video";
        publicUrl: string;
      }> = [];

      // Upload files if any
      if (selectedFiles.length > 0) {
        toast.info("Uploading files...");
        const uploadResults = await uploadFiles(selectedFiles);

        // Create attachments from upload results
        attachments = uploadResults.map((result, index) => ({
          id: result.key,
          type: selectedFiles[index].type.startsWith("image/")
            ? ("photo" as const)
            : ("video" as const),
          publicUrl: result.publicUrl,
        }));
      }

      const data = {
        ...values,
        sourceUrl: values.sourceUrl || undefined,
        description: values.description || undefined,
        category: values.category || undefined,
        attachments,
        primaryAttachmentId: attachments[0]?.id,
      };

      createProduct.mutate(data);
    } catch (error) {
      toast.error("Failed to upload files");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
      setTagInput("");
    }
    onOpenChange(newOpen);
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !form.getValues("tags").includes(trimmed)) {
      form.setValue("tags", [...form.getValues("tags"), trimmed]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    form.setValue(
      "tags",
      form.getValues("tags").filter((tag) => tag !== tagToRemove),
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
          <DialogDescription>
            Add a product to your catalog for content generation
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MANUAL">Manual Upload</SelectItem>
                      <SelectItem value="AMAZON">Amazon</SelectItem>
                      <SelectItem value="SHOPIFY">Shopify</SelectItem>
                      <SelectItem value="ETSY">Etsy</SelectItem>
                      <SelectItem value="CUSTOM_URL">Custom URL</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedSource === "MANUAL" ? (
              <div className="space-y-3">
                <FormLabel>Product Assets</FormLabel>
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

                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {selectedFiles.length} file
                      {selectedFiles.length > 1 ? "s" : ""} selected
                    </p>
                    <div className="grid grid-cols-2 gap-2">
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
              </div>
            ) : (
              <FormField
                control={form.control}
                name="sourceUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={`Paste your ${selectedSource.toLowerCase()} product URL`}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-between"
                >
                  <span className="text-sm font-medium">
                    Product Details (Optional)
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      detailsOpen ? "rotate-180" : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
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
                      <FormLabel>Description (Optional)</FormLabel>
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

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Electronics" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tags"
                  render={() => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add a tag"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addTag();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={addTag}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        {form.watch("tags").length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {form.watch("tags").map((tag) => (
                              <div
                                key={tag}
                                className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
                              >
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => removeTag(tag)}
                                  className="hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={createProduct.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createProduct.isPending || isUploading}
              >
                {isUploading
                  ? "Uploading..."
                  : createProduct.isPending
                    ? "Adding..."
                    : "Add Product"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
