import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { Label } from "@openpromo/ui/components/label";
import { Textarea } from "@openpromo/ui/components/textarea";
import type { VideoGenRealtime } from "@shared";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { ProductSelectItem } from "@/components/image-generator/product-select";
import { ProductSelect } from "@/components/image-generator/product-select";
import { AssetInput } from "@/components/product-visuals-v2/asset-input";
import { LiveArtifactsGrid } from "@/components/product-visuals-v2/live-artifacts-grid";
import { ModeToggle } from "@/components/product-visuals-v2/mode-toggle";
import { RunCard } from "@/components/product-visuals-v2/run-card";
import { RunModal } from "@/components/product-visuals-v2/run-modal";
import { StatusPill } from "@/components/product-visuals-v2/status-pill";
import { useProductVisualsStore } from "@/features/product-visuals-v2/product-visuals-store";
import type { RunFeedItem } from "@/features/product-visuals-v2/product-visuals-types";
import { useVideoGenAgent } from "@/hooks/useVideoGenAgent";
import { useAgentRunsListQuery } from "@/queries/agent-runs";
import { useProductListQuery } from "@/queries/product";

const sampleProductImageUrls = [
  "https://i.pinimg.com/1200x/1e/63/b8/1e63b8168a25c2a2a4127971514d97e2.jpg",
];

const samplePrompt =
  "Create an 8s TikTok style UGC ad video. using both avatar and product image";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/product-visuals-v2/",
)({
  component: ProductVisualsV2Page,
});

function ProductVisualsV2Page() {
  const { data: productsData, isPending: isLoadingProducts } =
    useProductListQuery({ pageSize: 50 });

  const {
    mode,
    prompt,
    productId,
    productImageUrls,
    avatarAssets,
    referenceAssets,
    brandAssets,
    setMode,
    setPrompt,
    setProductId,
    setProductImageUrls,
    addAvatarAsset,
    removeAvatarAsset,
    addReferenceAsset,
    removeReferenceAsset,
    addBrandAsset,
    removeBrandAsset,
  } = useProductVisualsStore();

  const {
    isConnected,
    sendEvent,
    setAgent,
    serverState,
    chat: { error },
  } = useVideoGenAgent({
    userId: "product-visuals-v2",
  });

  const [selectedRun, setSelectedRun] = useState<RunFeedItem | null>(null);
  const lastSentRef = useRef<string | null>(null);

  useEffect(() => {
    setMode(serverState.agentName === "image_gen_agent" ? "image" : "video");
  }, [serverState.agentName, setMode]);

  const buildInput = useMemo(
    (): VideoGenRealtime.EventDataMap["set_input"] => ({
      prompt: prompt.trim() || samplePrompt,
      productImages: productImageUrls.filter(Boolean),
      avatarImages: avatarAssets.map((a) => a.url),
      referenceImages: referenceAssets.map((a) => a.url),
      brandAssets: brandAssets.map((a) => a.url),
    }),
    [avatarAssets, brandAssets, productImageUrls, prompt, referenceAssets],
  );

  useEffect(() => {
    if (!isConnected) return;
    const agentName = mode === "image" ? "image_gen_agent" : "video_gen_agent";
    const payload = buildInput;
    lastSentRef.current = JSON.stringify(payload);
    setAgent(agentName, payload);
  }, [buildInput, isConnected, mode, setAgent]);

  useEffect(() => {
    if (!isConnected) return;
    const payload = buildInput;
    const payloadJson = JSON.stringify(payload);
    if (lastSentRef.current === payloadJson) return;
    sendEvent("set_input", payload);
    lastSentRef.current = payloadJson;
  }, [buildInput, isConnected, sendEvent]);

  const handleGenerate = () => {
    if (!isConnected) {
      toast.error("Not connected yet");
      return;
    }
    const agentName = mode === "image" ? "image_gen_agent" : "video_gen_agent";
    const payload = buildInput;
    lastSentRef.current = JSON.stringify(payload);
    setAgent(agentName, payload);
    sendEvent("start_pipeline", {});
  };

  const { data: feedData, isPending: isFeedPending } = useAgentRunsListQuery({
    page: 1,
    pageSize: 24,
  });

  const liveArtifacts = useMemo(
    () => ({
      videos: [
        ...(serverState.artifacts.videos ?? []),
        ...(serverState.output.output.videos ?? []),
      ],
      images: [
        ...(serverState.artifacts.images ?? []),
        ...(serverState.output.output.images ?? []),
      ],
    }),
    [
      serverState.artifacts.images,
      serverState.artifacts.videos,
      serverState.output.output.images,
      serverState.output.output.videos,
    ],
  );

  const generateLabel = mode === "video" ? "Generate Video" : "Generate Image";

  const productSelectItems: ProductSelectItem[] =
    productsData?.products.map((product) => ({
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
    })) ?? [];

  const handleProductSelect = (id: string) => {
    setProductId(id);
    const product = productSelectItems.find((p) => p.id === id);
    if (!product) return;
    const urls: string[] =
      product.attachments
        ?.map((a) => a.publicUrl || a.presignedUrl)
        .filter((v): v is string => Boolean(v)) ?? [];
    setProductImageUrls(urls.length > 0 ? urls : sampleProductImageUrls);
  };

  return (
    <div className="flex h-full flex-col bg-background px-4 pb-6 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Product Visuals
          </h1>
          <p className="text-sm text-muted-foreground">
            Create product imagery or short videos with your assets and prompt.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isConnected ? "success" : "warning"}>
            {isConnected ? "Connected" : "Connecting"}
          </Badge>
          <StatusPill status={serverState.status} />
          <ModeToggle mode={mode} onChange={setMode} />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[420px_1fr]">
        <section className="min-w-0 space-y-4 rounded-lg border bg-white p-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="prompt">Prompt / Instructions</Label>
              <p className="text-xs text-muted-foreground">
                Keep it concise; works for both images and video.
              </p>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="w-full"
              />
            </div>

            <div>
              <Label>Product</Label>
              <p className="text-xs text-muted-foreground">
                Select a product to autofill image URLs, or paste your own.
              </p>
              <ProductSelect
                products={productSelectItems}
                selectedProductId={productId}
                onProductChange={handleProductSelect}
                isLoading={isLoadingProducts}
              />
              <Textarea
                className="mt-2 w-full font-mono text-xs"
                rows={3}
                value={productImageUrls.join("\n")}
                onChange={(e) =>
                  setProductImageUrls(
                    e.target.value
                      .split("\n")
                      .map((v) => v.trim())
                      .filter(Boolean),
                  )
                }
              />
            </div>

            <AssetInput
              label="Avatar assets (optional)"
              helper="Upload or paste URLs for presenters or characters."
              assets={avatarAssets}
              onAdd={addAvatarAsset}
              onRemove={removeAvatarAsset}
            />
            <AssetInput
              label="Reference / style assets (optional)"
              helper="Upload or paste URLs for style cues."
              assets={referenceAssets}
              onAdd={addReferenceAsset}
              onRemove={removeReferenceAsset}
            />
            <AssetInput
              label="Brand assets (optional)"
              helper="Logos or overlays to stay on-brand."
              assets={brandAssets}
              onAdd={addBrandAsset}
              onRemove={removeBrandAsset}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={handleGenerate} disabled={!isConnected}>
              {generateLabel}
            </Button>
            {error && (
              <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                {error.message}
              </div>
            )}
          </div>
        </section>

        <section className="min-w-0 space-y-3 rounded-lg border bg-white p-4">
          <div className="mb-1">
            <h4 className="text-base font-semibold">Outputs</h4>
            <p className="text-xs text-muted-foreground">
              Live artifacts and saved runs.
            </p>
          </div>

          <LiveArtifactsGrid artifacts={liveArtifacts} />

          <div className="space-y-2">
            {isFeedPending && (
              <p className="text-sm text-muted-foreground">Loading…</p>
            )}
            {!isFeedPending && (feedData?.items.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">
                No runs yet. Kick off a generation to see results here.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {feedData?.items.map((run) => (
                <RunCard
                  key={run.id}
                  run={run}
                  onSelect={() => setSelectedRun(run)}
                />
              ))}
            </div>
          </div>
        </section>
      </div>

      {selectedRun && (
        <RunModal run={selectedRun} onClose={() => setSelectedRun(null)} />
      )}
    </div>
  );
}
