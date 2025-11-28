import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { Slider } from "@openpromo/ui/components/slider";
import { Spinner } from "@openpromo/ui/components/spinner";
import { Textarea } from "@openpromo/ui/components/textarea";
import { cn } from "@openpromo/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  Film,
  Link2,
  PlayCircle,
  VideoIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ProductSelect,
  type ProductSelectItem,
} from "@/components/image-generator/product-select";
import { useVideoGenerationJob } from "@/hooks/useVideoGenerationJob";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  formatElapsedTime,
  getStateBadge,
  getStateTone,
  shortenId,
} from "@/lib/video-generation";
import type { ProductListResponse } from "@/queries/product";
import { useProductVisualsVideoStartMutation } from "@/queries/video-gen";

type Product = NonNullable<ProductListResponse["products"]>[number];

type ProductVideoGeneratorExperienceProps = {
  products: Product[];
  isLoadingProducts: boolean;
  selectedProductId: string;
  onSelectProductId: (productId: string) => void;
  styleComponentId?: string;
  layout?: "split" | "panel";
};

const DEFAULT_MAX_TURNS = 60;

export function ProductVideoGeneratorExperience({
  products,
  isLoadingProducts,
  selectedProductId,
  onSelectProductId,
  styleComponentId,
  layout = "split",
}: ProductVideoGeneratorExperienceProps) {
  const { workspace } = useWorkspace();
  const [instructions, setInstructions] = useState("");
  const [maxTurns, setMaxTurns] = useState(DEFAULT_MAX_TURNS);

  const {
    activeGenerationId,
    generationState,
    isProcessing,
    elapsedSeconds,
    startJob,
    resetJobState,
    videoUrl,
    summary,
    error,
  } = useVideoGenerationJob(workspace.slug);

  useEffect(() => {
    if (!selectedProductId && products.length > 0) {
      onSelectProductId(products[0]?.id ?? "");
    }
  }, [selectedProductId, products, onSelectProductId]);

  const productSelectItems = useMemo<ProductSelectItem[]>(
    () =>
      products.map((product) => ({
        id: product.id,
        name: product.name ?? null,
        primaryAttachmentId: product.primaryAttachmentId ?? null,
        attachments:
          product.attachments?.map((attachment) => ({
            id: attachment.id,
            type: attachment.type,
            thumbnailUrl: attachment.thumbnailUrl ?? undefined,
            publicUrl: attachment.publicUrl ?? undefined,
            presignedUrl: attachment.presignedUrl ?? undefined,
          })) ?? [],
      })),
    [products],
  );

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId),
    [products, selectedProductId],
  );

  const productPhotoUrls = useMemo(() => {
    if (!selectedProduct?.attachments?.length) return [] as string[];

    return selectedProduct.attachments
      .filter((attachment) => attachment.type === "photo")
      .map(
        (attachment) =>
          attachment.thumbnailUrl ||
          attachment.publicUrl ||
          attachment.presignedUrl ||
          "",
      )
      .filter((url): url is string => url.length > 0);
  }, [selectedProduct]);

  const hasProductMedia = productPhotoUrls.length > 0;

  const startMutation = useProductVisualsVideoStartMutation((data) => {
    startJob(data.generationId);
  });

  useEffect(() => {
    if (!generationState) return;
    if (generationState.state === "completed") {
      toast.success("Video generation complete");
    } else if (generationState.state === "failed") {
      toast.error(generationState.message ?? "Video generation failed");
    }
  }, [generationState]);

  const isSubmitting = startMutation.isPending || isProcessing;
  const trimmedInstructions = instructions.trim();

  const canSubmit =
    Boolean(selectedProductId) &&
    trimmedInstructions.length > 0 &&
    hasProductMedia;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) {
      if (!selectedProductId) {
        toast.error("Select a product before running video generation");
      } else if (!hasProductMedia) {
        toast.error("Add at least one photo to the selected product first");
      } else if (!trimmedInstructions.length) {
        toast.error("Add a prompt to guide the video agent");
      }
      return;
    }

    startMutation.mutate({
      productId: selectedProductId,
      instructions: trimmedInstructions,
      maxTurns,
      styleComponentId: styleComponentId || undefined,
    });
  }, [
    canSubmit,
    hasProductMedia,
    maxTurns,
    selectedProductId,
    startMutation,
    styleComponentId,
    trimmedInstructions,
  ]);

  const configurationCard = (
    <section className="space-y-5 rounded-lg border bg-card p-5">
      <header className="space-y-1">
        <p className="text-sm font-medium text-primary/80">Video concepts</p>
        <h2 className="text-xl font-semibold tracking-tight">
          Product video builder
        </h2>
        <p className="text-sm text-muted-foreground">
          Select a product and craft a prompt—the workflow will re-use the
          product imagery automatically.
        </p>
      </header>

      {!isLoadingProducts && products.length === 0 ? (
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
            <ProductSelect
              products={productSelectItems}
              selectedProductId={selectedProductId}
              onProductChange={onSelectProductId}
              isLoading={isLoadingProducts}
            />
            {selectedProduct?.tags?.length ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {selectedProduct.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
            {selectedProduct && !hasProductMedia && (
              <div className="rounded-md border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
                Add at least one product photo to generate video concepts.
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Prompt to the agent</label>
            <Textarea
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              placeholder="e.g. Generate a 20s vertical ad that highlights the hero benefit + CTA"
              className="min-h-[96px]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Max agent turns</span>
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
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? (
              <Spinner className="mr-2 h-4 w-4" />
            ) : (
              <PlayCircle className="mr-2 h-4 w-4" />
            )}
            Run video generation
          </Button>
        </div>
      )}
    </section>
  );

  const statusCard = (
    <section
      className={cn(
        "border rounded-lg bg-card flex flex-col overflow-hidden",
        layout === "split" ? "h-full" : "min-h-[300px]",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Film className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">Generated videos</p>
            <p className="text-xs text-muted-foreground">
              Track workflow progress and previews
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeGenerationId && (
            <Badge className="border border-border/70 bg-secondary text-secondary-foreground">
              {shortenId(activeGenerationId)}
            </Badge>
          )}
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
      </div>
      <div className="flex-1 min-h-0 px-4 pb-4">
        {!(activeGenerationId || videoUrl) ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Run the generator to see live status and preview outputs.
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-4",
              videoUrl ? "xl:grid-cols-2" : "grid-cols-1",
            )}
          >
            <div className="rounded-lg border bg-background p-4 space-y-4">
              {!activeGenerationId ? (
                <p className="text-sm text-muted-foreground">
                  Start a generation to view progress.
                </p>
              ) : !generationState ? (
                <div className="flex items-center gap-3 rounded-md border p-3 text-sm">
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
            </div>

            {videoUrl && (
              <div className="rounded-lg border bg-background p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <VideoIcon className="h-4 w-4" />
                  Output preview
                </div>
                <div className="overflow-hidden rounded-md border bg-black">
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
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );

  if (layout === "panel") {
    return <div className="h-full">{configurationCard}</div>;
  }

  return (
    <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
      {configurationCard}
      {statusCard}
    </div>
  );
}
