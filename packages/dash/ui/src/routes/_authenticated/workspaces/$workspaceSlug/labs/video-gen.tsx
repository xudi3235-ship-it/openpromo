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
import { JobStatus } from "@shared/gen/jobs/v1/jobs_pb";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  Film,
  Link2,
  PlayCircle,
  RefreshCw,
  Sparkles,
  VideoIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useProductListQuery } from "@/queries/product";
import type { VideoGenStatusResponse } from "@/queries/video-gen";
import {
  useVideoGenStatusQuery,
  useVideoGenSubmitMutation,
} from "@/queries/video-gen";

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
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const pollingStartRef = useRef<number | null>(null);

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

  const submitMutation = useVideoGenSubmitMutation((data) => {
    setActiveCallId(data.callId);
    pollingStartRef.current = Date.now();
    setElapsedSeconds(0);
  });

  const statusQuery = useVideoGenStatusQuery(
    activeCallId ? { callId: activeCallId } : null,
    {
      enabled: Boolean(activeCallId),
      refetchInterval: (query) => {
        if (!activeCallId) return false;
        const data = query.state.data as VideoGenStatusResponse | undefined;
        return data?.status === JobStatus.PENDING ? 5_000 : false;
      },
    },
  );

  const statusData = statusQuery.data;
  const isPolling = statusData?.status === JobStatus.PENDING;

  // Update elapsed time while polling
  useEffect(() => {
    const startTime = pollingStartRef.current;
    if (!isPolling || !startTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPolling]);

  const agentResult = statusData?.videoGen;
  const videoUrl =
    agentResult?.kind === "success" ? agentResult.videoUrl : null;
  const agentSummary =
    agentResult?.kind === "success" ? agentResult.summary : null;
  const agentError =
    agentResult?.kind === "error" ? agentResult.error.message : null;

  const resetJobState = () => {
    setActiveCallId(null);
    pollingStartRef.current = null;
    setElapsedSeconds(0);
  };

  const handleSubmit = () => {
    if (!canSubmit || submitMutation.isPending) {
      if (productImagesPayload.length === 0) {
        toast.error("Select or paste at least one product image URL");
      }
      return;
    }

    submitMutation.mutate({
      product: productContext.trim(),
      business: businessContext.trim(),
      userMessage: userMessage.trim(),
      productImages: productImagesPayload,
      avatarImages: avatarImageUrls,
      maxTurns,
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
          {activeCallId && (
            <Badge className="bg-secondary text-secondary-foreground border border-border/70">
              Active Call · {shortenCallId(activeCallId)}
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
                disabled={!canSubmit || submitMutation.isPending}
              >
                {submitMutation.isPending ? (
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
                Job status
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  disabled={!activeCallId || statusQuery.isFetching}
                  onClick={() => statusQuery.refetch()}
                >
                  <RefreshCw className="mr-1 h-3.5 w-3.5" />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  disabled={!activeCallId}
                  onClick={resetJobState}
                >
                  Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!activeCallId ? (
                <p className="text-sm text-muted-foreground">
                  Run the generator to see live status and preview outputs.
                </p>
              ) : statusQuery.isPending ? (
                <div className="flex items-center gap-3 rounded-lg border p-4 text-sm">
                  <Spinner className="h-4 w-4" />
                  Polling Modal job...
                </div>
              ) : statusData ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        Status
                      </p>
                      <p className="text-sm font-medium">
                        {formatEnumLabel(statusData.statusLabel)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPolling && elapsedSeconds > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {formatElapsedTime(elapsedSeconds)}
                        </span>
                      )}
                      <Badge
                        className={cn(
                          "border",
                          getJobStatusTone(statusData.status),
                        )}
                      >
                        {statusBadgeCopy(statusData.status)}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Function</span>
                      <span className="font-medium">
                        {formatEnumLabel(statusData.fnLabel)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Call ID</span>
                      <code className="rounded bg-muted px-2 py-1 text-xs">
                        {statusData.callId}
                      </code>
                    </div>
                  </div>

                  {agentError && (
                    <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <div>
                        <p className="font-medium text-destructive">
                          Generation failed
                        </p>
                        <p className="text-muted-foreground">{agentError}</p>
                      </div>
                    </div>
                  )}

                  {agentResult && agentResult.kind === "success" && (
                    <div className="rounded-lg border p-3 text-sm">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Agent output ready
                      </div>
                      <p className="mt-2 text-muted-foreground">
                        {agentSummary || "Video generated successfully."}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Unable to fetch status.
                </p>
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
                {agentSummary && (
                  <p className="text-sm text-muted-foreground">
                    {agentSummary}
                  </p>
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

function shortenCallId(callId: string) {
  if (callId.length <= 24) return callId;
  return `${callId.slice(0, 12)}…${callId.slice(-8)}`;
}

function formatEnumLabel(label?: string | null) {
  if (!label) return "Unknown";
  return label
    .replace(/(JOB_STATUS_|JOB_FUNCTION_|AGENT_OUTPUT_STATUS_)/g, "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/(?:^|\s)\w/g, (segment) => segment.toUpperCase());
}

function getJobStatusTone(status?: JobStatus) {
  switch (status) {
    case JobStatus.SUCCEEDED:
      return "bg-emerald-500/15 text-emerald-700 border-emerald-200";
    case JobStatus.FAILED:
      return "bg-destructive/10 text-destructive border-destructive/30";
    case JobStatus.PENDING:
      return "bg-amber-500/15 text-amber-700 border-amber-200";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function statusBadgeCopy(status?: JobStatus) {
  switch (status) {
    case JobStatus.SUCCEEDED:
      return "Succeeded";
    case JobStatus.FAILED:
      return "Failed";
    case JobStatus.PENDING:
      return "In progress";
    default:
      return "Queued";
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
