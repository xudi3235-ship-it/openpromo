import { Badge } from "@openpromo/ui/components/badge";
import { ScrollArea } from "@openpromo/ui/components/scroll-area";
import type { VideoGenRealtime } from "@shared";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { ProductSelectItem } from "@/components/image-generator/product-select";
import { InputPanel } from "@/components/product-visuals-v2/input-panel";
import { LiveArtifactsGrid } from "@/components/product-visuals-v2/live-artifacts-grid";
import { RunCard } from "@/components/product-visuals-v2/run-card";
import { RunModal } from "@/components/product-visuals-v2/run-modal";
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
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[420px_1fr] lg:grid-rows-[minmax(0,1fr)]">
        <InputPanel
          mode={mode}
          onModeChange={setMode}
          status={serverState.status}
          prompt={prompt}
          onPromptChange={setPrompt}
          products={productSelectItems}
          selectedProductId={productId}
          onProductChange={handleProductSelect}
          isLoadingProducts={isLoadingProducts}
          productImageUrls={productImageUrls}
          avatarAssets={avatarAssets}
          onAddAvatarAsset={addAvatarAsset}
          onRemoveAvatarAsset={removeAvatarAsset}
          referenceAssets={referenceAssets}
          onAddReferenceAsset={addReferenceAsset}
          onRemoveReferenceAsset={removeReferenceAsset}
          brandAssets={brandAssets}
          onAddBrandAsset={addBrandAsset}
          onRemoveBrandAsset={removeBrandAsset}
          onGenerate={handleGenerate}
          isGenerateDisabled={!isConnected}
          error={error}
        />

        <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border bg-white">
          <ScrollArea className="flex-1">
            <div className="space-y-3 p-4">
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
            </div>
          </ScrollArea>
        </section>
      </div>

      {selectedRun && (
        <RunModal run={selectedRun} onClose={() => setSelectedRun(null)} />
      )}
    </div>
  );
}
