import { ScrollArea } from "@openpromo/ui/components/scroll-area";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import type { VideoGenRealtime } from "@shared";
import { createFileRoute } from "@tanstack/react-router";
import { Image as ImageIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { ProductSelectItem } from "@/components/image-generator/product-select";
import type { StyleGalleryItem } from "@/components/image-generator/style-gallery";
import { InputPanel } from "@/components/product-visuals-v2/input-panel";
import { ResultCard } from "@/components/product-visuals-v2/result-card";
import { RunModal } from "@/components/product-visuals-v2/run-modal";
import { useProductVisualsStore } from "@/features/product-visuals-v2/product-visuals-store";
import type { RunFeedItem } from "@/features/product-visuals-v2/product-visuals-types";
import { useVideoGenAgent } from "@/hooks/useVideoGenAgent";
import { useAgentRunsListQuery } from "@/queries/agent-runs";
import { useProductListQuery } from "@/queries/product";
import { useStylesListQuery } from "@/queries/styles-queries";

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

  const { data: stylesData, isPending: isLoadingStyles } = useStylesListQuery({
    page: 1,
    officialOnly: true,
  });

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
  const [selectedStyleId, setSelectedStyleId] = useState<string>("");
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

  const styleGalleryItems: StyleGalleryItem[] = useMemo(
    () =>
      stylesData?.styles.map((style) => ({
        id: style.id,
        name: style.name ?? null,
        description: style.description ?? null,
        imageRefs: style.imageRefs ?? [],
      })) ?? [],
    [stylesData?.styles],
  );

  const handleStyleSelect = (styleId: string) => {
    setSelectedStyleId(styleId);
    const style = styleGalleryItems.find((s) => s.id === styleId);
    if (!style) return;
    // Add style images to reference assets
    const styleImages = style.imageRefs.filter((url): url is string =>
      Boolean(url),
    );
    styleImages.forEach((url) => {
      addReferenceAsset({ id: url, url });
    });
  };

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
    <div className="flex h-full flex-col bg-background">
      <div className="flex-shrink-0 px-6 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Product Visuals
        </h1>
        <p className="text-sm text-muted-foreground">
          Generate ready-to-use product imagery and video concepts with custom
          prompts and assets.
        </p>
      </div>

      <div className="flex-1 min-h-0 px-4 pb-4">
        <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[420px_1fr]">
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
            styles={styleGalleryItems}
            isLoadingStyles={isLoadingStyles}
            selectedStyleId={selectedStyleId}
            onStyleSelect={handleStyleSelect}
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
            <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
              <div>
                <h4 className="text-sm font-medium">Generated Results</h4>
                <p className="text-xs text-muted-foreground">
                  View and manage all generated visuals.
                </p>
              </div>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-4 p-4">
                {isFeedPending && (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="aspect-square w-full rounded-md" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-2 w-3/4" />
                      </div>
                    ))}
                  </div>
                )}
                {!isFeedPending && (feedData?.items.length ?? 0) === 0 && (
                  <div className="flex flex-col items-center justify-center text-center py-16 text-muted-foreground gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium">No results yet</p>
                    <p className="text-xs text-muted-foreground">
                      Generate visuals to see them in one place.
                    </p>
                  </div>
                )}
                {!isFeedPending && (feedData?.items.length ?? 0) > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {feedData?.items.map((run) => (
                      <ResultCard
                        key={run.id}
                        run={run}
                        onSelect={() => setSelectedRun(run)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </section>
        </div>
      </div>

      {selectedRun && (
        <RunModal run={selectedRun} onClose={() => setSelectedRun(null)} />
      )}
    </div>
  );
}
