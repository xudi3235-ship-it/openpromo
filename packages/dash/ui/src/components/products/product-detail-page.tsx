import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@openpromo/ui/components/card";
import { Separator } from "@openpromo/ui/components/separator";
import { Link, useParams } from "@tanstack/react-router";
import { ChevronLeft, Loader2, Sparkles } from "lucide-react";
import * as React from "react";
import {
  type ProductImageGenerateResponse,
  useProductImageGenerateMutation,
  useProductQuery,
} from "@/queries/product";

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: "Manual",
  AMAZON: "Amazon",
  SHOPIFY: "Shopify",
  ETSY: "Etsy",
  CUSTOM_URL: "Custom URL",
};

const STATE_CONFIG: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  not_started: {
    label: "New",
    className: "bg-gray-500/20 text-gray-100",
  },
  pending: {
    label: "Pending",
    className: "bg-yellow-500/20 text-yellow-100",
  },
  processing: {
    label: "Processing",
    className: "bg-blue-500/20 text-blue-100",
  },
  ready: {
    label: "Ready",
    className: "bg-green-500/20 text-green-100",
  },
  failed: {
    label: "Failed",
    className: "bg-red-500/20 text-red-100",
  },
};

export function ProductDetailPage() {
  const params = useParams({
    from: "/_authenticated/workspaces/$workspaceSlug/products/$productId",
  });
  const productId = params.productId;
  const workspaceSlug = params.workspaceSlug;

  const [generatedImage, setGeneratedImage] =
    React.useState<ProductImageGenerateResponse | null>(null);

  const { data, isLoading, error } = useProductQuery(productId);

  const generateImage = useProductImageGenerateMutation();

  const product = data?.product;
  const productContext = product?.metadata?.productContext;

  const primaryAttachment = product?.attachments.find(
    (att) => att.id === product.primaryAttachmentId,
  );
  const fallbackAttachment = product?.attachments.find(
    (att) => att.type === "photo",
  );
  const heroImage = primaryAttachment ?? fallbackAttachment;

  const handleGenerate = () => {
    if (!productId) return;
    generateImage.mutate(
      { productId },
      {
        onSuccess: (result) => {
          setGeneratedImage(result);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading product…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-sm text-muted-foreground">
          Failed to load product details.
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-sm text-muted-foreground">
          Product not found.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link
              to="/workspaces/$workspaceSlug/products"
              params={{ workspaceSlug }}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to products
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{product.name}</h1>
            {product.state && STATE_CONFIG[product.state] && (
              <Badge
                className={`text-xs ${STATE_CONFIG[product.state].className}`}
              >
                {STATE_CONFIG[product.state].label}
              </Badge>
            )}
            {product.source && (
              <Badge variant="outline" className="text-xs">
                {SOURCE_LABELS[product.source] ?? product.source}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          {heroImage && heroImage.type === "photo" ? (
            <div className="relative h-80 w-full bg-muted">
              <img
                src={heroImage.publicUrl ?? heroImage.presignedUrl ?? ""}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-80 items-center justify-center bg-muted">
              <span className="text-5xl opacity-20">📦</span>
            </div>
          )}
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl">{product.name}</CardTitle>
            {product.description && (
              <p className="text-sm text-muted-foreground">
                {product.description}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {product.tags?.length ? (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}

            {product.attachments.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Attachments</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {product.attachments.map((att, index) => (
                    <AttachmentPreview
                      key={
                        att.id ??
                        att.publicUrl ??
                        att.presignedUrl ??
                        `attachment-${index}`
                      }
                      attachment={att}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {productContext ? (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Identified Context</h3>
                <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground space-y-1.5">
                  <div>
                    <span className="font-medium text-foreground">Name:</span>{" "}
                    {productContext.name}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      Description:
                    </span>{" "}
                    {productContext.description}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      Industry:
                    </span>{" "}
                    {productContext.meta.industry}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      Category:
                    </span>{" "}
                    {productContext.meta.category}
                  </div>
                  {productContext.meta.socialMediaTags?.length ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {productContext.meta.socialMediaTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-xs font-normal"
                        >
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Generate Product Image</CardTitle>
            <p className="text-sm text-muted-foreground">
              Generate a marketing-ready image using the latest product context.
            </p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <Button
              onClick={handleGenerate}
              disabled={generateImage.isPending}
              className="w-full justify-center gap-2"
            >
              {generateImage.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate image
                </>
              )}
            </Button>

            <Separator />

            {generatedImage ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">Latest result</h3>
                  <p className="text-xs text-muted-foreground">
                    Style: {generatedImage.style?.name ?? "N/A"}
                  </p>
                </div>
                <div className="overflow-hidden rounded-md border border-border bg-muted/30">
                  <img
                    src={generatedImage.imageUrl}
                    alt={`Generated preview for ${product.name}`}
                    className="w-full object-cover"
                  />
                </div>
                {generatedImage.style?.description ? (
                  <p className="text-xs text-muted-foreground">
                    {generatedImage.style.description}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                <Sparkles className="mb-2 h-5 w-5" />
                Click “Generate image” to create a new visual for this product.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface AttachmentPreviewProps {
  attachment: {
    id?: string;
    type: string;
    publicUrl?: string | null;
    presignedUrl?: string | null;
    url?: string | null;
  };
}

function AttachmentPreview({ attachment }: AttachmentPreviewProps) {
  if (attachment.type === "photo") {
    const imageSrc =
      attachment.publicUrl ??
      attachment.presignedUrl ??
      attachment.url ??
      undefined;

    if (imageSrc) {
      return (
        <div className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted">
          <img src={imageSrc} alt="" className="h-full w-full object-cover" />
        </div>
      );
    }
  }

  return (
    <div className="flex aspect-square items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
      {attachment.type}
    </div>
  );
}
