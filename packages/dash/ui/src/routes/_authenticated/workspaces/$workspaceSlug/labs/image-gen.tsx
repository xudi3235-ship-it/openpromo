import { Button } from "@openpromo/ui/components/button";
import { Checkbox } from "@openpromo/ui/components/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openpromo/ui/components/select";
import { Slider } from "@openpromo/ui/components/slider";
import { Spinner } from "@openpromo/ui/components/spinner";
import { Textarea } from "@openpromo/ui/components/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import {
  useImageGenDeleteBatchMutation,
  useImageGenListQuery,
} from "@/queries/image-gen";
import {
  useProductImageGenerateMutation,
  useProductListQuery,
} from "@/queries/product";
import { useStylesListQuery } from "@/queries/styles";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/labs/image-gen",
)({
  component: ImageGenPage,
});

function ImageGenPage() {
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedStyleId, setSelectedStyleId] = useState<string>("");
  const [generationMode, setGenerationMode] = useState<"studio" | "style">(
    "studio",
  );
  const [batchCount, setBatchCount] = useState<number>(1);
  const [prompt, setPrompt] = useState<string>("");
  const [referenceImageUrl, setReferenceImageUrl] = useState<string>("");
  const [selectedGenerations, setSelectedGenerations] = useState<Set<string>>(
    new Set(),
  );

  const queryClient = useQueryClient();

  const { data: productsData, isLoading: isLoadingProducts } =
    useProductListQuery({});

  const { data: stylesData, isLoading: isLoadingStyles } = useStylesListQuery({
    page: "1",
  });

  const { data: generationsData, isLoading: isLoadingGenerations } =
    useImageGenListQuery({ page: "1", pageSize: "50" });

  const generateMutation = useProductImageGenerateMutation(() => {
    // Invalidate the generations list to refetch
    queryClient.invalidateQueries({ queryKey: ["image-gen-list"] });
  });

  const deleteBatchMutation = useImageGenDeleteBatchMutation(() => {
    setSelectedGenerations(new Set());
  });

  const handleGenerate = () => {
    if (!selectedProductId) return;

    if (generationMode === "style" && !referenceImageUrl.trim()) {
      return;
    }

    generateMutation.mutate({
      productId: selectedProductId,
      styleId: generationMode === "style" ? selectedStyleId : undefined,
      mode: generationMode,
      batchCount,
      prompt: prompt.trim() || undefined,
      referenceImageUrl:
        generationMode === "style" && referenceImageUrl.trim()
          ? referenceImageUrl.trim()
          : undefined,
    });
  };

  const handleToggleSelection = (id: string) => {
    setSelectedGenerations((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedGenerations.size === generations.length) {
      setSelectedGenerations(new Set());
    } else {
      setSelectedGenerations(new Set(generations.map((g) => g.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedGenerations.size === 0) return;
    deleteBatchMutation.mutate({ ids: Array.from(selectedGenerations) });
  };

  const products = productsData?.products || [];
  const styles = stylesData?.styles || [];
  const generations = generationsData?.generations || [];

  const isLoading = isLoadingProducts || isLoadingStyles;

  // Helper to get primary product image
  const getProductImage = (product: (typeof products)[number]) => {
    if (!product.attachments?.length) return null;
    const primaryAttachment = product.attachments.find(
      (a) => a.id === product.primaryAttachmentId,
    );
    const attachment = primaryAttachment || product.attachments[0];
    if (attachment?.type !== "photo") return null;
    return (
      attachment.thumbnailUrl ||
      attachment.publicUrl ||
      attachment.presignedUrl ||
      null
    );
  };

  // Helper to get style image
  const getStyleImage = (style: (typeof styles)[number]) => {
    return style.imageRefs?.[0] || null;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          Image Generation
        </h1>
        <p className="text-sm text-muted-foreground">
          Create studio shots or styled product images
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Left Panel - Inputs & Controls */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 border rounded-lg">
              <div className="text-center space-y-3">
                <Spinner className="h-6 w-6 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Loading resources...
                </p>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-4 space-y-4">
              {/* Mode Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGenerationMode("studio")}
                    className={`p-2.5 rounded-md border text-left transition-colors ${
                      generationMode === "studio"
                        ? "border-foreground bg-muted"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="text-sm font-medium">Studio</div>
                    <div className="text-xs text-muted-foreground">
                      Clean bg
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenerationMode("style")}
                    className={`p-2.5 rounded-md border text-left transition-colors ${
                      generationMode === "style"
                        ? "border-foreground bg-muted"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="text-sm font-medium">Styled</div>
                    <div className="text-xs text-muted-foreground">
                      With ref
                    </div>
                  </button>
                </div>
              </div>

              {/* Product Selection */}
              <div className="space-y-2">
                <label htmlFor="product-select" className="text-sm font-medium">
                  Product
                </label>
                <Select
                  value={selectedProductId}
                  onValueChange={setSelectedProductId}
                  disabled={isLoadingProducts}
                >
                  <SelectTrigger id="product-select" className="w-full">
                    <SelectValue placeholder="Select product...">
                      {selectedProductId &&
                        (() => {
                          const product = products.find(
                            (p) => p.id === selectedProductId,
                          );
                          if (!product) return null;
                          const imageUrl = getProductImage(product);
                          return (
                            <div className="flex items-center gap-2">
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={product.name || product.id}
                                  className="w-5 h-5 object-cover rounded"
                                />
                              ) : (
                                <div className="w-5 h-5 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                                  ?
                                </div>
                              )}
                              <span className="text-sm truncate">
                                {product.name || product.id}
                              </span>
                            </div>
                          );
                        })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => {
                      const imageUrl = getProductImage(product);
                      return (
                        <SelectItem key={product.id} value={product.id}>
                          <div className="flex items-center gap-2">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={product.name || product.id}
                                className="w-6 h-6 object-cover rounded"
                              />
                            ) : (
                              <div className="w-6 h-6 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                                ?
                              </div>
                            )}
                            <span className="text-sm">
                              {product.name || product.id}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Style Selection - Conditional */}
              {generationMode === "style" && (
                <div className="space-y-2">
                  <label htmlFor="style-select" className="text-sm font-medium">
                    Style
                  </label>
                  <Select
                    value={selectedStyleId}
                    onValueChange={setSelectedStyleId}
                    disabled={isLoadingStyles}
                  >
                    <SelectTrigger id="style-select" className="w-full">
                      <SelectValue placeholder="Select style...">
                        {selectedStyleId &&
                          (() => {
                            const style = styles.find(
                              (s) => s.id === selectedStyleId,
                            );
                            if (!style) return null;
                            const imageUrl = getStyleImage(style);
                            return (
                              <div className="flex items-center gap-2">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={style.name || style.id}
                                    className="w-5 h-5 object-cover rounded"
                                  />
                                ) : (
                                  <div className="w-5 h-5 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                                    ?
                                  </div>
                                )}
                                <span className="text-sm truncate">
                                  {style.name || style.id}
                                </span>
                              </div>
                            );
                          })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {styles.map((style) => {
                        const imageUrl = getStyleImage(style);
                        return (
                          <SelectItem key={style.id} value={style.id}>
                            <div className="flex items-center gap-2">
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={style.name || style.id}
                                  className="w-6 h-6 object-cover rounded"
                                />
                              ) : (
                                <div className="w-6 h-6 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                                  ?
                                </div>
                              )}
                              <span className="text-sm">
                                {style.name || style.id}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Reference Image URL Input - Conditional for style mode */}
              {generationMode === "style" && (
                <div className="space-y-2">
                  <label
                    htmlFor="reference-url-input"
                    className="text-sm font-medium"
                  >
                    Reference Image URL
                    <span className="text-muted-foreground font-normal ml-1">
                      (required)
                    </span>
                  </label>
                  <Textarea
                    id="reference-url-input"
                    value={referenceImageUrl}
                    onChange={(e) => setReferenceImageUrl(e.target.value)}
                    placeholder="Paste reference image URL here..."
                    rows={2}
                    className="resize-none font-mono text-xs"
                  />
                </div>
              )}

              {/* Batch Count Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Batch Count</label>
                  <span className="text-sm text-muted-foreground">
                    {batchCount}
                  </span>
                </div>
                <Slider
                  value={[batchCount]}
                  onValueChange={(value) => setBatchCount(value[0] || 1)}
                  min={1}
                  max={4}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Custom Prompt */}
              <div className="space-y-2">
                <label htmlFor="prompt-input" className="text-sm font-medium">
                  Custom Prompt
                  <span className="text-muted-foreground font-normal ml-1">
                    (optional)
                  </span>
                </label>
                <Textarea
                  id="prompt-input"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Add custom instructions for the generation..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={
                  !selectedProductId ||
                  (generationMode === "style" && !referenceImageUrl.trim()) ||
                  generateMutation.isPending
                }
                className="w-full"
                size="default"
              >
                {generateMutation.isPending ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Generating...
                  </>
                ) : (
                  "Generate"
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Right Panel - Grid of Generations */}
        <div className="space-y-4">
          {/* Selection Toolbar */}
          {generations.length > 0 && (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={
                    selectedGenerations.size === generations.length &&
                    generations.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
                <span className="text-sm text-muted-foreground">
                  {selectedGenerations.size > 0
                    ? `${selectedGenerations.size} selected`
                    : "Select all"}
                </span>
              </div>
              {selectedGenerations.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={deleteBatchMutation.isPending}
                >
                  {deleteBatchMutation.isPending ? (
                    <>
                      <Spinner className="mr-2 h-3 w-3" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-3 w-3" />
                      Delete
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {isLoadingGenerations ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {/* Loading skeletons when generating - show based on batch count */}
              {generateMutation.isPending &&
                Array.from({ length: batchCount }).map((_, index) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton loaders are temporary UI elements
                    key={`skeleton-${index}`}
                    className="border rounded-lg overflow-hidden bg-muted/50 animate-pulse"
                  >
                    <div className="aspect-square bg-muted" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-muted rounded w-3/4" />
                      <div className="h-2 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))}

              {generations.length === 0 && !generateMutation.isPending ? (
                <div className="col-span-full flex items-center justify-center py-16">
                  <div className="text-center space-y-2">
                    <div className="text-3xl mb-2">✨</div>
                    <p className="text-sm text-muted-foreground">
                      No generations yet
                    </p>
                  </div>
                </div>
              ) : (
                generations.map((generation) => (
                  <div
                    key={generation.id}
                    className="border rounded-lg overflow-hidden hover:border-foreground/50 transition-colors group relative"
                  >
                    {/* Checkbox overlay */}
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={selectedGenerations.has(generation.id)}
                        onCheckedChange={() =>
                          handleToggleSelection(generation.id)
                        }
                        className="bg-background border-2"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    <a
                      href={generation.outputImages?.[0] || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <div className="aspect-square bg-muted relative overflow-hidden">
                        {generation.outputImages?.[0] ? (
                          <img
                            src={generation.outputImages[0]}
                            alt="Generated"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">
                              No image
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 bg-background">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <span className="px-1.5 py-0.5 rounded border bg-muted">
                            {generation.styleComponentId ? "Styled" : "Studio"}
                          </span>
                          <span>
                            {new Date(generation.createdAt).toLocaleDateString(
                              [],
                              {
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          ID: {generation.id.slice(0, 8)}
                        </p>
                      </div>
                    </a>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
