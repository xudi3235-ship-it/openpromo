import { Button } from "@openpromo/ui/components/button";
import { Card, CardContent, CardHeader } from "@openpromo/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openpromo/ui/components/select";
import { Spinner } from "@openpromo/ui/components/spinner";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  type ProductImageGenerateResponse,
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
  const [generatedImage, setGeneratedImage] =
    useState<ProductImageGenerateResponse | null>(null);

  const { data: productsData, isLoading: isLoadingProducts } =
    useProductListQuery({});

  const { data: stylesData, isLoading: isLoadingStyles } = useStylesListQuery({
    page: "1",
  });

  const generateMutation = useProductImageGenerateMutation((data) => {
    setGeneratedImage(data);
  });

  const handleGenerate = () => {
    if (!selectedProductId) return;

    generateMutation.mutate({
      productId: selectedProductId,
      styleId:
        selectedStyleId && selectedStyleId !== "__none__"
          ? selectedStyleId
          : undefined,
    });
  };

  const products = productsData?.products || [];
  const styles = stylesData?.styles || [];

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
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Image Generation Lab</h1>

      {isLoading ? (
        <Card className="mb-6">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Spinner className="h-8 w-8 mx-auto" />
              <p className="text-muted-foreground">
                Loading products and styles...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-semibold">Generate Product Image</h2>
            <p className="text-sm text-muted-foreground">
              Select a product and optionally a style to generate an image
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="product-select" className="text-sm font-medium">
                Product *
              </label>
              <Select
                value={selectedProductId}
                onValueChange={setSelectedProductId}
                disabled={isLoadingProducts}
              >
                <SelectTrigger id="product-select" className="w-full">
                  <SelectValue placeholder="Select a product...">
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
                                className="w-6 h-6 object-cover rounded"
                              />
                            ) : (
                              <div className="w-6 h-6 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                                ?
                              </div>
                            )}
                            <span>{product.name || product.id}</span>
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
                              className="w-8 h-8 object-cover rounded"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                              ?
                            </div>
                          )}
                          <span>{product.name || product.id}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="style-select" className="text-sm font-medium">
                Style (Optional)
              </label>
              <Select
                value={selectedStyleId}
                onValueChange={setSelectedStyleId}
                disabled={isLoadingStyles}
              >
                <SelectTrigger id="style-select" className="w-full">
                  <SelectValue placeholder="Select a style (optional)...">
                    {selectedStyleId &&
                      selectedStyleId !== "__none__" &&
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
                                className="w-6 h-6 object-cover rounded"
                              />
                            ) : (
                              <div className="w-6 h-6 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                                ?
                              </div>
                            )}
                            <span>{style.name || style.id}</span>
                          </div>
                        );
                      })()}
                    {selectedStyleId === "__none__" && "None"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {styles.map((style) => {
                    const imageUrl = getStyleImage(style);
                    return (
                      <SelectItem key={style.id} value={style.id}>
                        <div className="flex items-center gap-2">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={style.name || style.id}
                              className="w-8 h-8 object-cover rounded"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                              ?
                            </div>
                          )}
                          <span>{style.name || style.id}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!selectedProductId || generateMutation.isPending}
              className="w-full"
            >
              {generateMutation.isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Generating...
                </>
              ) : (
                "Generate Image"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {generateMutation.isPending && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Spinner className="h-8 w-8 mx-auto" />
              <p className="text-muted-foreground">Generating your image...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {generatedImage && !generateMutation.isPending && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Generated Image</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border overflow-hidden bg-muted">
              <img
                src={generatedImage.imageUrl}
                alt="Generated product"
                className="w-full h-auto"
              />
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <span className="font-medium">Generation ID:</span>{" "}
                {generatedImage.generation.id}
              </p>
              <p>
                <span className="font-medium">Image URL:</span>{" "}
                <a
                  href={generatedImage.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {generatedImage.imageUrl}
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
