import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { ListState } from "@openpromo/ui/components/list-state";
import { Page, PageContent, PageHeader } from "@openpromo/ui/components/page";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { Stack } from "@openpromo/ui/components/stack";
import {
  Surface,
  SurfaceBody,
  SurfaceHeader,
} from "@openpromo/ui/components/surface";
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
    className: "bg-gray-500/10 text-gray-500",
  },
  pending: {
    label: "Pending",
    className: "bg-yellow-500/10 text-yellow-500",
  },
  processing: {
    label: "Processing",
    className: "bg-blue-500/10 text-blue-500",
  },
  ready: {
    label: "Ready",
    className: "bg-green-500/10 text-green-500",
  },
  failed: {
    label: "Failed",
    className: "bg-red-500/10 text-red-500",
  },
};

const formatDate = (value: string | Date | null | undefined): string | null => {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getHostname = (url: string): string | null => {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
};

/**
 * ProductDetailPage - Displays detailed product information with image generation
 * Route: /workspaces/:workspaceSlug/products/:productId
 */
export function ProductDetailPage() {
  const params = useParams({
    from: "/_authenticated/workspaces/$workspaceSlug/products/$productId",
  });
  const productId = params.productId;
  const workspaceSlug = params.workspaceSlug;

  const [generatedImage, setGeneratedImage] = React.useState<
    ProductImageGenerateResponse["results"][0] | null
  >(null);
  const { data, isPending, error } = useProductQuery(productId);

  const generateImage = useProductImageGenerateMutation();
  const isGenerating = generateImage.isPending;

  const product = data?.product;
  const productContext = product?.metadata?.productContext;

  const primaryAttachment = product?.attachments.find(
    (att) => att.id === product.primaryAttachmentId,
  );
  const fallbackAttachment = product?.attachments.find(
    (att) => att.type === "photo",
  );
  const heroImage = primaryAttachment ?? fallbackAttachment;

  const createdDate = formatDate(product?.createdAt);
  const attachmentCount = product?.attachments.length ?? 0;

  const infoItems: Array<{ label: string; value: string; href?: string }> = [];

  if (product?.category) {
    infoItems.push({ label: "Category", value: product.category });
  }
  if (createdDate) {
    infoItems.push({ label: "Created", value: createdDate });
  }
  if (attachmentCount > 0) {
    infoItems.push({
      label: "Attachments",
      value: `${attachmentCount}`,
    });
  }
  if (product?.sourceUrl) {
    infoItems.push({
      label: "Source URL",
      value: getHostname(product.sourceUrl) ?? product.sourceUrl,
      href: product.sourceUrl,
    });
  }

  const handleGenerate = () => {
    if (!productId || isGenerating) return;
    generateImage.mutate(
      { productId, batchCount: 1 },
      {
        onSuccess: (result) => {
          // Handle new batch response format - take first result
          if (result.results && result.results.length > 0) {
            setGeneratedImage(result.results[0]);
          }

          // Don't set the image immediately - wait for the event
        },
        onError: () => {},
      },
    );
  };

  const previewContainerClass = generatedImage
    ? "relative overflow-hidden rounded-lg border border-border/60 bg-muted/20"
    : "relative overflow-hidden rounded-lg border border-dashed border-border/70 bg-muted/10";

  if (isPending) {
    return <ProductDetailSkeleton />;
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <ListState
          size="sm"
          className="max-w-sm"
          title="Failed to load product details."
          description={
            error instanceof Error ? error.message : "Please try again."
          }
        />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex h-full items-center justify-center">
        <ListState
          size="sm"
          className="max-w-sm"
          title="Product not found."
          description="The product may have been removed or you don't have access."
        />
      </div>
    );
  }

  return (
    <Page gap="lg">
      <PageHeader className="flex-wrap gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link
            to="/workspaces/$workspaceSlug/products"
            params={{ workspaceSlug }}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to products
          </Link>
        </Button>
        <Stack
          direction="row"
          gap="sm"
          align="center"
          wrap
          className="text-left"
        >
          <h1 className="text-2xl font-semibold text-foreground">
            {product.name}
          </h1>
          {product.state && STATE_CONFIG[product.state] && (
            <Badge
              className={`text-xs font-medium ${STATE_CONFIG[product.state].className}`}
            >
              {STATE_CONFIG[product.state].label}
            </Badge>
          )}
          {product.source && (
            <Badge variant="outline" className="text-xs font-medium">
              {SOURCE_LABELS[product.source] ?? product.source}
            </Badge>
          )}
        </Stack>
      </PageHeader>

      <PageContent>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <Surface tone="subtle" padded="md" shadow="sm">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
                <div className="aspect-square w-full overflow-hidden rounded-lg border border-border/60 bg-muted/30">
                  {heroImage && heroImage.type === "photo" ? (
                    <img
                      src={heroImage.publicUrl ?? heroImage.presignedUrl ?? ""}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl text-muted-foreground/60">
                      📦
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-4">
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {product.description ? (
                      <p>{product.description}</p>
                    ) : (
                      <p className="italic text-muted-foreground/70">
                        No description provided yet.
                      </p>
                    )}
                  </div>

                  {product.tags?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {product.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  {infoItems.length > 0 ? (
                    <dl className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                      {infoItems.map(({ label, value, href }) => (
                        <div key={label} className="space-y-1">
                          <dt className="font-medium text-foreground">
                            {label}
                          </dt>
                          <dd className="truncate">
                            {href ? (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {value}
                              </a>
                            ) : (
                              value
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </div>
              </div>
            </Surface>

            {product.attachments.length > 0 ? (
              <Surface tone="subtle" padded="none" shadow="sm">
                <SurfaceHeader padded="md">
                  <h2 className="text-sm font-medium text-foreground">
                    Media Library
                  </h2>
                </SurfaceHeader>
                <SurfaceBody
                  padded="md"
                  className="grid grid-cols-2 gap-2 pt-0 sm:grid-cols-3"
                >
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
                </SurfaceBody>
              </Surface>
            ) : null}

            {productContext ? (
              <Surface tone="subtle" padded="none" shadow="sm">
                <SurfaceHeader padded="md">
                  <h2 className="text-sm font-medium text-foreground">
                    Identified Context
                  </h2>
                </SurfaceHeader>
                <SurfaceBody
                  padded="md"
                  className="space-y-2 text-sm text-muted-foreground"
                >
                  <p>
                    <span className="font-medium text-foreground">Name:</span>{" "}
                    {productContext.name}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">
                      Description:
                    </span>{" "}
                    {productContext.description}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">
                      Industry:
                    </span>{" "}
                    {productContext.meta.industry}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">
                      Category:
                    </span>{" "}
                    {productContext.meta.category}
                  </p>
                  {productContext.meta.socialMediaTags?.length ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {productContext.meta.socialMediaTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-xs font-normal"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </SurfaceBody>
              </Surface>
            ) : null}
          </div>

          <div className="space-y-4">
            <Surface
              tone="subtle"
              padded="lg"
              shadow="sm"
              className="flex h-full flex-col"
            >
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">
                  Generate Product Image
                </h2>
                <p className="text-sm text-muted-foreground">
                  Use your product context to generate a marketing-ready
                  creative.
                </p>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full justify-center gap-2"
                >
                  {isGenerating ? (
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
              </div>

              <div className="mt-6 flex flex-1 flex-col gap-3">
                <div className={previewContainerClass}>
                  <div className="aspect-square w-full">
                    {generatedImage ? (
                      <img
                        src={generatedImage?.generation?.outputImages?.[0]}
                        alt={`Generated preview for ${product.name}`}
                        className="h-full w-full object-cover"
                      />
                    ) : !isGenerating ? (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
                        <Sparkles className="h-5 w-5" />
                        Click “Generate image” to create a fresh visual using
                        this product&apos;s context.
                      </div>
                    ) : null}
                  </div>
                  {isGenerating ? (
                    <>
                      <div className="absolute inset-0 overflow-hidden rounded-lg">
                        <Skeleton className="h-full w-full animate-pulse" />
                      </div>
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/60 backdrop-blur-sm">
                        <div className="h-12 w-12 rounded-full border border-border/60 bg-gradient-to-br from-primary/10 via-transparent to-transparent animate-pulse" />
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Generating preview
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </Surface>
          </div>
        </div>
      </PageContent>
    </Page>
  );
}

export function ProductDetailSkeleton() {
  const params = useParams({
    from: "/_authenticated/workspaces/$workspaceSlug/products/$productId",
  });
  const workspaceSlug = params.workspaceSlug;

  return (
    <Page gap="lg" className="h-full">
      <PageHeader className="flex-wrap gap-3">
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
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </PageHeader>

      <PageContent>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <Surface tone="subtle" padded="md" shadow="sm">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <div className="flex flex-col gap-4">
                  <Skeleton className="h-16 w-full" />
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              </div>
            </Surface>

            <Surface tone="subtle" padded="none" shadow="sm">
              <SurfaceHeader padded="md">
                <Skeleton className="h-5 w-32" />
              </SurfaceHeader>
              <SurfaceBody
                padded="md"
                className="grid grid-cols-2 gap-2 pt-0 sm:grid-cols-3"
              >
                {Array.from({ length: 6 }).map((_, idx) => (
                  <Skeleton
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton layout
                    key={idx}
                    className="aspect-square w-full rounded-md"
                  />
                ))}
              </SurfaceBody>
            </Surface>

            <Surface tone="subtle" padded="none" shadow="sm">
              <SurfaceHeader padded="md">
                <Skeleton className="h-5 w-36" />
              </SurfaceHeader>
              <SurfaceBody padded="md" className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex flex-wrap gap-2 pt-1">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </SurfaceBody>
            </Surface>
          </div>

          <div className="space-y-4">
            <Surface
              tone="subtle"
              padded="lg"
              shadow="sm"
              className="flex h-full flex-col"
            >
              <div className="space-y-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <SurfaceBody
                padded="md"
                className="mt-4 rounded-lg border border-dashed border-border/70 bg-muted/10"
              >
                <Skeleton className="aspect-square w-full rounded-md" />
                <Skeleton className="mt-3 h-4 w-1/2" />
              </SurfaceBody>
            </Surface>
          </div>
        </div>
      </PageContent>
    </Page>
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
        <div className="relative aspect-square overflow-hidden rounded-md border border-border/60 bg-muted/20">
          <img src={imageSrc} alt="" className="h-full w-full object-cover" />
        </div>
      );
    }
  }

  return (
    <div className="flex aspect-square items-center justify-center rounded-md border border-dashed border-border/60 text-xs text-muted-foreground">
      {attachment.type}
    </div>
  );
}
