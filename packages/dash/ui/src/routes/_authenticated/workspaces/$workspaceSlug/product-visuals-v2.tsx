import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { Label } from "@openpromo/ui/components/label";
import { Textarea } from "@openpromo/ui/components/textarea";
import type { VideoGenRealtime } from "@shared";
import { createFileRoute } from "@tanstack/react-router";
import type { AgentRunsRouterOutputs } from "@worker/orpc";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useVideoGenAgent } from "@/hooks/useVideoGenAgent";
import { useAgentRunsListQuery } from "@/queries/agent-runs";

const sampleProductImageUrls = [
  "https://i.pinimg.com/1200x/1e/63/b8/1e63b8168a25c2a2a4127971514d97e2.jpg",
];

const sampleAvatarImageUrls = [
  "https://i.pinimg.com/1200x/04/9a/65/049a6564d158084703960383df8de897.jpg",
];

const samplePrompt =
  "Create an 8s TikTok style UGC ad video. using both avatar and product image";

type InputFormState = {
  prompt: string;
  productImages: string;
  avatarImages: string;
  referenceImages: string;
  brandAssets: string;
};

const defaultInputForm: InputFormState = {
  prompt: samplePrompt,
  productImages: sampleProductImageUrls.join("\n"),
  avatarImages: sampleAvatarImageUrls.join("\n"),
  referenceImages: "",
  brandAssets: "",
};

const parseMultilineList = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/product-visuals-v2",
)({
  component: ProductVisualsV2Page,
});

function ProductVisualsV2Page() {
  const [inputForm, setInputForm] = useState<InputFormState>(defaultInputForm);
  const [selectedAgent, setSelectedAgent] =
    useState<VideoGenRealtime.AgentName>("video_gen_agent");
  const lastSentRef = useRef<string | null>(null);

  const {
    isConnected,
    sendEvent,
    setAgent,
    serverState,
    chat: { error },
  } = useVideoGenAgent({
    userId: "product-visuals-v2",
  });

  useEffect(() => {
    setSelectedAgent(serverState.agentName);
  }, [serverState.agentName]);

  const buildInputPayload = useMemo(() => {
    return () => {
      const productImages = parseMultilineList(inputForm.productImages);
      const avatarImages = parseMultilineList(inputForm.avatarImages);
      const referenceImages = parseMultilineList(inputForm.referenceImages);
      const brandAssets = parseMultilineList(inputForm.brandAssets);

      const payload: VideoGenRealtime.EventDataMap["set_input"] = {
        prompt: inputForm.prompt.trim() || samplePrompt,
        productImages,
        avatarImages,
        referenceImages,
        brandAssets,
      };

      return payload;
    };
  }, [
    inputForm.avatarImages,
    inputForm.brandAssets,
    inputForm.productImages,
    inputForm.prompt,
    inputForm.referenceImages,
  ]);

  useEffect(() => {
    if (!isConnected) return;
    const payload = buildInputPayload();
    const payloadJson = JSON.stringify(payload);
    if (lastSentRef.current === payloadJson) return;
    sendEvent("set_input", payload);
    lastSentRef.current = payloadJson;
  }, [buildInputPayload, isConnected, sendEvent]);

  const handleStart = () => {
    if (!isConnected) {
      toast.error("Agent not connected yet");
      return;
    }
    sendEvent("start_pipeline", {});
  };

  const handleAgentChange = (agentName: VideoGenRealtime.AgentName) => {
    setSelectedAgent(agentName);
    const payload = buildInputPayload();
    lastSentRef.current = JSON.stringify(payload);
    setAgent(agentName, payload);
  };

  const { data: feedData, isPending: isFeedPending } = useAgentRunsListQuery({
    page: 1,
    pageSize: 24,
  });

  const generateLabel =
    selectedAgent === "video_gen_agent" ? "Generate Video" : "Generate Image";

  return (
    <div className="flex h-full flex-col bg-background px-4 pb-6 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Product Visuals v2 (Agent)
          </h1>
          <p className="text-sm text-muted-foreground">
            Same minimal surface as v1, powered by the agent for video or image
            generation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isConnected ? "success" : "warning"}>
            {isConnected ? "Connected" : "Connecting"}
          </Badge>
          <StatusPill status={serverState.status} />
          <div className="grid h-9 grid-cols-2 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
            <button
              type="button"
              onClick={() => handleAgentChange("image_gen_agent")}
              disabled={!isConnected}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                selectedAgent === "image_gen_agent"
                  ? "bg-background text-foreground shadow"
                  : "hover:bg-background/50"
              }`}
            >
              Images
            </button>
            <button
              type="button"
              onClick={() => handleAgentChange("video_gen_agent")}
              disabled={!isConnected}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                selectedAgent === "video_gen_agent"
                  ? "bg-background text-foreground shadow"
                  : "hover:bg-background/50"
              }`}
            >
              Video
            </button>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[420px_1fr]">
        <div className="min-w-0 flex min-h-0 flex-col gap-4 rounded-lg border bg-white p-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="prompt">Prompt / Instructions</Label>
              <p className="text-xs text-muted-foreground">
                Keep it concise; the agent uses this for either images or video.
              </p>
              <Textarea
                id="prompt"
                value={inputForm.prompt}
                onChange={(e) =>
                  setInputForm((prev) => ({
                    ...prev,
                    prompt: e.target.value,
                  }))
                }
                rows={3}
                className="w-full"
              />
            </div>
            <div className="grid gap-3">
              <div>
                <Label htmlFor="product-images">Product image URLs</Label>
                <p className="text-xs text-muted-foreground">
                  One per line; use high-quality angles.
                </p>
                <Textarea
                  id="product-images"
                  value={inputForm.productImages}
                  onChange={(e) =>
                    setInputForm((prev) => ({
                      ...prev,
                      productImages: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full font-mono text-xs"
                />
              </div>
              <div>
                <Label htmlFor="avatar-images">Avatar image URLs</Label>
                <p className="text-xs text-muted-foreground">
                  Optional; for presenters or characters.
                </p>
                <Textarea
                  id="avatar-images"
                  value={inputForm.avatarImages}
                  onChange={(e) =>
                    setInputForm((prev) => ({
                      ...prev,
                      avatarImages: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full font-mono text-xs"
                />
              </div>
              <div>
                <Label htmlFor="reference-images">
                  Reference / style image URLs
                </Label>
                <p className="text-xs text-muted-foreground">
                  Optional style cues the agent should mimic.
                </p>
                <Textarea
                  id="reference-images"
                  value={inputForm.referenceImages}
                  onChange={(e) =>
                    setInputForm((prev) => ({
                      ...prev,
                      referenceImages: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full font-mono text-xs"
                />
              </div>
              <div>
                <Label htmlFor="brand-assets">Brand asset URLs</Label>
                <p className="text-xs text-muted-foreground">
                  Logos or overlays to keep on-brand.
                </p>
                <Textarea
                  id="brand-assets"
                  value={inputForm.brandAssets}
                  onChange={(e) =>
                    setInputForm((prev) => ({
                      ...prev,
                      brandAssets: e.target.value,
                    }))
                  }
                  rows={2}
                  className="w-full font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleStart}
              disabled={!isConnected}
              className="w-full"
            >
              {generateLabel}
            </Button>
            {error && (
              <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                {error.message}
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-3 rounded-lg border bg-white p-4">
          <div className="mb-1">
            <h4 className="text-base font-semibold">Outputs</h4>
            <p className="text-xs text-muted-foreground">
              Saved runs from the agent.
            </p>
          </div>

          <div className="space-y-2">
            {isFeedPending && (
              <p className="text-sm text-muted-foreground">Loading…</p>
            )}
            {!isFeedPending && (feedData?.items.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">
                No runs yet. Kick off a pipeline to see results here.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {feedData?.items.map((run) => (
                <RunCard key={run.id} run={run} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RunCard({ run }: { run: AgentRunCard }) {
  const firstVideo = run?.output?.output.videos?.[0];
  const firstImage = run?.output?.output.images?.[0];
  const hasArtifacts =
    (run?.artifacts.videos?.length ?? 0) > 0 ||
    (run?.artifacts.images?.length ?? 0) > 0;

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="aspect-video w-full bg-gray-50">
        {firstVideo ? (
          <video
            src={firstVideo.videoUrl}
            controls
            className="h-full w-full object-cover"
          />
        ) : firstImage ? (
          <img
            src={firstImage.imageUrl}
            alt={run.input.prompt}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No media yet
          </div>
        )}
      </div>
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="capitalize">
            {run.agentName.replace("_", " ")}
          </Badge>
          <StatusPill status={run.status} />
        </div>
        <p className="line-clamp-2 break-words text-sm text-gray-800">
          {run.input.prompt}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{formatDistanceToNow(new Date(run.createdAt))} ago</span>
          {hasArtifacts && (
            <span>
              • {run.artifacts.videos?.length ?? 0} vids,{" "}
              {run.artifacts.images?.length ?? 0} imgs
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPill({
  status,
}: {
  status: VideoGenRealtime.ServerAppState["status"];
}) {
  const map: Record<
    VideoGenRealtime.ServerAppState["status"],
    {
      label: string;
      variant: "default" | "secondary" | "success" | "destructive" | "warning";
    }
  > = {
    not_started: { label: "Not started", variant: "default" },
    running: { label: "Running", variant: "secondary" },
    succeeded: { label: "Succeeded", variant: "success" },
    failed: { label: "Failed", variant: "destructive" },
    canceled: { label: "Canceled", variant: "warning" },
  };
  const entry = map[status] ?? map.not_started;
  return <Badge variant={entry.variant as never}>{entry.label}</Badge>;
}

type AgentRunCard = AgentRunsRouterOutputs["list"]["items"][number];
