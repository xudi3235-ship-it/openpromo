import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@openpromo/ui/components/card";
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
import { cn } from "@openpromo/ui/lib/utils";
import {
  type VideoGenerationUpdatedEvent,
  WorkspaceEventType,
} from "@shared/workspace";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  Film,
  Link2,
  PlayCircle,
  Sparkles,
  VideoIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useWorkspaceEvents } from "@/hooks/useWorkspaceEvents";
import { useProductListQuery } from "@/queries/product";
import { useVideoGenStartMutation } from "@/queries/video-gen";

const DEFAULT_MAX_TURNS = 60;

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/labs/video-gen",
)({
  component: VideoGenerationLab,
});

function VideoGenerationLab() {
  const { workspace } = useWorkspace();
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [productContext, setProductContext] = useState("");
  const [businessContext, setBusinessContext] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [maxTurns, setMaxTurns] = useState(DEFAULT_MAX_TURNS);
  const [selectedProductImages, setSelectedProductImages] = useState<string[]>(
    [],
  );
  const [customProductImageInput, setCustomProductImageInput] = useState("");
  const [avatarImageInput, setAvatarImageInput] = useState("");
  const [activeGenerationId, setActiveGenerationId] = useState<string | null>(
    null,
  );
  const [generationState, setGenerationState] = useState<{
    state: string;
    message?: string;
    outputUrl?: string;
  } | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  // Handle video generation WebSocket events
  const handleVideoGenEvent = useCallback(
    (event: VideoGenerationUpdatedEvent) => {
      if (event.jobId !== activeGenerationId) return;

      setGenerationState({
        state: event.state,
        message: event.message,
        outputUrl: event.outputUrl,
      });

      if (event.state === "completed") {
        toast.success("Video generation complete!");
      } else if (event.state === "failed") {
        toast.error(event.message ?? "Video generation failed");
      }
    },
    [activeGenerationId],
  );

  useWorkspaceEvents(workspace.slug, {
    handlers: {
      [WorkspaceEventType.VideoGenerationUpdated]: handleVideoGenEvent,
    },
  });

  const defaultBusinessContext = workspace.name ?? workspace.slug ?? "";

  useEffect(() => {
    setBusinessContext((prev) =>
      prev.trim().length > 0 ? prev : defaultBusinessContext,
    );
  }, [defaultBusinessContext]);

  const { data: productsData, isPending: isLoadingProducts } =
    useProductListQuery({ pageSize: 50 });
  const products = productsData?.products ?? [];

  useEffect(() => {
    if (!selectedProductId && products.length > 0) {
      setSelectedProductId(products[0]?.id ?? "");
    }
  }, [products, selectedProductId]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId),
    [products, selectedProductId],
  );

  const productImageOptions = useMemo(() => {
    if (!selectedProduct?.attachments?.length) {
      return [] as { id: string; url: string; label: string }[];
    }

    return selectedProduct.attachments
      .filter((attachment) => attachment.type === "photo")
      .map((attachment) => ({
        id: attachment.id,
        label: attachment.id,
        url:
          attachment.thumbnailUrl ||
          attachment.publicUrl ||
          attachment.presignedUrl ||
          "",
      }))
      .filter((item) => item.url.length > 0);
  }, [selectedProduct]);

  useEffect(() => {
    if (!selectedProduct) {
      setSelectedProductImages([]);
      setProductContext("");
      return;
    }

    const fallbackContext =
      selectedProduct.description?.trim() || selectedProduct.name || "";
    setProductContext(fallbackContext);

    const defaults = productImageOptions.slice(0, 2).map((img) => img.url);
    setSelectedProductImages(defaults);
  }, [selectedProduct, productImageOptions]);

  const customProductImageUrls = useMemo(
    () => parseUrlList(customProductImageInput),
    [customProductImageInput],
  );
  const avatarImageUrls = useMemo(
    () => parseUrlList(avatarImageInput),
    [avatarImageInput],
  );

  const productImagesPayload = useMemo(
    () =>
      Array.from(
        new Set([...selectedProductImages, ...customProductImageUrls]),
      ),
    [selectedProductImages, customProductImageUrls],
  );

  const canSubmit =
    productContext.trim().length > 0 &&
    businessContext.trim().length > 0 &&
    userMessage.trim().length > 0 &&
    productImagesPayload.length > 0;

  const startMutation = useVideoGenStartMutation((data) => {
    setActiveGenerationId(data.generationId);
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
  });

  const isProcessing =
    generationState?.state === "processing" ||
    generationState?.state === "not_started";

  // Update elapsed time while processing
  useEffect(() => {
    const startTime = startTimeRef.current;
    if (!isProcessing || !startTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isProcessing]);

  const videoUrl = generationState?.outputUrl ?? null;
  const summary = generationState?.message ?? null;
  const error =
    generationState?.state === "failed" ? generationState.message : null;

  const resetJobState = () => {
    setActiveGenerationId(null);
    setGenerationState(null);
    startTimeRef.current = null;
    setElapsedSeconds(0);
  };

  const handleSubmit = () => {
    if (!canSubmit || startMutation.isPending) {
      if (productImagesPayload.length === 0) {
        toast.error("Select or paste at least one product image URL");
      }
      return;
    }

    startMutation.mutate({
      prompt: `Product: ${productContext.trim()}\n\nBusiness: ${businessContext.trim()}\n\nInstructions: ${userMessage.trim()}\n\nMax turns: ${maxTurns}`,
      productImages: productImagesPayload,
      avatarImages: avatarImageUrls,
    });
  };

  const toggleProductImage = (url: string) => {
    setSelectedProductImages((prev) =>
      prev.includes(url)
        ? prev.filter((existing) => existing !== url)
        : [...prev, url],
    );
  };

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <div className="space-y-1">
        <p className="text-sm font-medium text-primary/80 flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Labs · Internal only
        </p>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Video Generation Lab
            </h1>
            <p className="text-muted-foreground text-sm">
              Prototype the agent-driven video flow by wiring product context,
              media, and custom prompts.
            </p>
          </div>
          {activeGenerationId && (
            <Badge className="bg-secondary text-secondary-foreground border border-border/70">
              Generation · {shortenId(activeGenerationId)}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <section className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
          <header className="space-y-1">
            <h2 className="text-lg font-medium">Input Builder</h2>
            <p className="text-sm text-muted-foreground">
              Provide structured context for the agent. Product media is
              required.
            </p>
          </header>

          {isLoadingProducts ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-5 w-5" />
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No products yet. Create one under{" "}
              <Link
                to="/workspaces/$workspaceSlug/products"
                params={{ workspaceSlug: workspace.slug }}
                className="text-primary underline-offset-2 hover:underline"
              >
                Products
              </Link>{" "}
              to unlock the video generator.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Product</label>
                <Select
                  value={selectedProductId}
                  onValueChange={(value) => {
                    setSelectedProductId(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProduct?.tags?.length ? (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {selectedProduct.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Product Images ({productImagesPayload.length})</span>
                  {productImagesPayload.length > 0 && (
                    <button
                      type="button"
                      className="text-muted-foreground text-xs hover:text-foreground"
                      onClick={() => setSelectedProductImages([])}
                    >
                      Clear selection
                    </button>
                  )}
                </div>
                {productImageOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Upload product photos to use them as agent references.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {productImageOptions.map((image) => (
                      <button
                        type="button"
                        key={image.id}
                        onClick={() => toggleProductImage(image.url)}
                        className={cn(
                          "group relative overflow-hidden rounded-lg border",
                          selectedProductImages.includes(image.url)
                            ? "border-primary ring-2 ring-primary/40"
                            : "border-border hover:border-foreground/40",
                        )}
                      >
                        <img
                          src={image.url}
                          alt={image.label}
                          className="aspect-square w-full object-cover"
                          loading="lazy"
                        />
                        <span
                          className={cn(
                            "pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-medium text-white opacity-0 transition-opacity",
                            selectedProductImages.includes(image.url) &&
                              "opacity-100",
                          )}
                        >
                          Selected
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <Textarea
                  value={customProductImageInput}
                  onChange={(event) =>
                    setCustomProductImageInput(event.target.value)
                  }
                  placeholder="Paste additional product image URLs (comma or newline separated)"
                  className="min-h-[72px] text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Product Context</label>
                <Textarea
                  value={productContext}
                  onChange={(event) => setProductContext(event.target.value)}
                  placeholder="Describe the product, key benefits, and tone."
                  className="min-h-[96px]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Business Context</label>
                <Textarea
                  value={businessContext}
                  onChange={(event) => setBusinessContext(event.target.value)}
                  placeholder="Describe the brand voice, audience, or campaign goals."
                  className="min-h-[72px]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Avatar Image URLs</label>
                <Textarea
                  value={avatarImageInput}
                  onChange={(event) => setAvatarImageInput(event.target.value)}
                  placeholder="Optional talent/avatar references. Comma or newline separated URLs."
                  className="min-h-[72px] text-sm"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Prompt to the agent</span>
                  <span className="text-muted-foreground text-xs">
                    Required
                  </span>
                </div>
                <Textarea
                  value={userMessage}
                  onChange={(event) => setUserMessage(event.target.value)}
                  placeholder="e.g. Generate a 20s vertical ad that highlights the new drop + CTA"
                  className="min-h-[96px]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Max Agent Turns</span>
                  <span className="text-xs text-muted-foreground">
                    {maxTurns} turns
                  </span>
                </div>
                <Slider
                  min={20}
                  max={120}
                  step={5}
                  value={[maxTurns]}
                  onValueChange={([value]) =>
                    setMaxTurns(value ?? DEFAULT_MAX_TURNS)
                  }
                />
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={!canSubmit || startMutation.isPending}
              >
                {startMutation.isPending ? (
                  <Spinner className="mr-2 h-4 w-4" />
                ) : (
                  <PlayCircle className="mr-2 h-4 w-4" />
                )}
                Run video generation
              </Button>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Film className="h-4 w-4" />
                Generation status
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  disabled={!activeGenerationId}
                  onClick={resetJobState}
                >
                  Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!activeGenerationId ? (
                <p className="text-sm text-muted-foreground">
                  Run the generator to see live status and preview outputs.
                </p>
              ) : !generationState ? (
                <div className="flex items-center gap-3 rounded-lg border p-4 text-sm">
                  <Spinner className="h-4 w-4" />
                  Starting workflow...
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        State
                      </p>
                      <p className="text-sm font-medium capitalize">
                        {generationState.state.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isProcessing && elapsedSeconds > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {formatElapsedTime(elapsedSeconds)}
                        </span>
                      )}
                      <Badge
                        className={cn(
                          "border",
                          getStateTone(generationState.state),
                        )}
                      >
                        {getStateBadge(generationState.state)}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Generation ID
                      </span>
                      <code className="rounded bg-muted px-2 py-1 text-xs">
                        {activeGenerationId}
                      </code>
                    </div>
                    {generationState.message && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Message</span>
                        <span className="text-sm">
                          {generationState.message}
                        </span>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <div>
                        <p className="font-medium text-destructive">
                          Generation failed
                        </p>
                        <p className="text-muted-foreground">{error}</p>
                      </div>
                    </div>
                  )}

                  {generationState.state === "completed" && (
                    <div className="rounded-lg border p-3 text-sm">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Video generation complete
                      </div>
                      {summary && (
                        <p className="mt-2 text-muted-foreground">{summary}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {videoUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <VideoIcon className="h-4 w-4" />
                  Output preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="overflow-hidden rounded-lg border bg-black">
                  <video
                    controls
                    playsInline
                    className="aspect-video w-full"
                    src={videoUrl}
                  >
                    Your browser does not support embedded videos.
                  </video>
                </div>
                {summary && (
                  <p className="text-sm text-muted-foreground">{summary}</p>
                )}
                <Button variant="outline" size="sm" asChild className="w-full">
                  <a href={videoUrl} target="_blank" rel="noreferrer">
                    <Link2 className="mr-2 h-4 w-4" /> Open video in new tab
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}

function shortenId(id: string) {
  if (id.length <= 24) return id;
  return `${id.slice(0, 12)}…${id.slice(-8)}`;
}

function getStateTone(state: string) {
  switch (state) {
    case "completed":
      return "bg-emerald-500/15 text-emerald-700 border-emerald-200";
    case "failed":
      return "bg-destructive/10 text-destructive border-destructive/30";
    case "processing":
      return "bg-amber-500/15 text-amber-700 border-amber-200";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function getStateBadge(state: string) {
  switch (state) {
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "processing":
      return "Processing";
    case "not_started":
      return "Starting";
    default:
      return "Unknown";
  }
}

function parseUrlList(value: string) {
  return value
    .split(/[\n,]/)
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
}

function formatElapsedTime(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}
