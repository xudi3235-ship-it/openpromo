import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { Label } from "@openpromo/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openpromo/ui/components/select";
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
  additionalAssetUrls: string;
};

const defaultInputForm: InputFormState = {
  prompt: samplePrompt,
  productImages: sampleProductImageUrls.join("\n"),
  avatarImages: sampleAvatarImageUrls.join("\n"),
  additionalAssetUrls: "",
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

      const payload: VideoGenRealtime.EventDataMap["set_input"] = {
        prompt: inputForm.prompt.trim() || samplePrompt,
        productImages,
        avatarImages,
        referenceImages: [],
        brandAssets: [],
      };

      return payload;
    };
  }, [inputForm.avatarImages, inputForm.productImages, inputForm.prompt]);

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

  const handleReset = () => {
    sendEvent("reset_state", {});
  };

  const handleLoadSample = () => {
    setInputForm(defaultInputForm);
  };

  const handleAgentChange = (agentName: VideoGenRealtime.AgentName) => {
    setSelectedAgent(agentName);
    const payload = buildInputPayload();
    lastSentRef.current = JSON.stringify(payload);
    setAgent(agentName, payload);
  };

  const videos = dedupeById([
    ...(serverState.artifacts.videos ?? []),
    ...(serverState.output.output.videos ?? []),
  ]);
  const images = dedupeById([
    ...(serverState.artifacts.images ?? []),
    ...(serverState.output.output.images ?? []),
  ]);

  const {
    data: feedData,
    isPending: isFeedPending,
    refetch: refetchFeed,
  } = useAgentRunsListQuery({ page: 1, pageSize: 24 });

  return (
    <div className="flex h-full flex-col gap-4 bg-background px-4 pb-6 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Product Visuals v2 (Agent)
          </h1>
          <p className="text-sm text-muted-foreground">
            Drive both image and video generations via the agent; live artifacts
            on the left, saved runs on the right.
          </p>
        </div>
        <Badge variant={isConnected ? "success" : "warning"}>
          {isConnected ? "Connected" : "Connecting"}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <section className="space-y-4 rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-base font-semibold">Agent Controls</h4>
              <p className="text-xs text-muted-foreground">
                Configure input, switch agents, and trigger the pipeline.
              </p>
            </div>
            <Select
              value={selectedAgent}
              onValueChange={(value) =>
                handleAgentChange(value as VideoGenRealtime.AgentName)
              }
              disabled={!isConnected}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video_gen_agent">Video</SelectItem>
                <SelectItem value="image_gen_agent">Image</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="prompt">Prompt</Label>
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
              />
            </div>
            <div>
              <Label htmlFor="product-images">
                Product Image URLs (one per line)
              </Label>
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
              />
            </div>
            <div>
              <Label htmlFor="avatar-images">
                Avatar Image URLs (one per line)
              </Label>
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
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleStart} disabled={!isConnected}>
              Start Pipeline
            </Button>
            <Button variant="outline" onClick={handleLoadSample}>
              Load Sample
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={!isConnected}
            >
              Reset
            </Button>
          </div>

          <StatusBanner
            status={serverState.status}
            hasVideo={videos.length > 0}
          />

          <GeneratedAssets
            title="Live artifacts"
            videos={videos}
            images={images}
          />

          {error && (
            <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {error.message}
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-semibold">Saved Runs</h4>
              <p className="text-xs text-muted-foreground">
                Pulls from agent_run; shows both image and video outputs.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => refetchFeed()}>
              Refresh
            </Button>
          </div>
          {isFeedPending && (
            <p className="text-sm text-muted-foreground">Loading runs...</p>
          )}
          {!isFeedPending && (feedData?.items.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">
              No runs yet. Kick off a pipeline to see results here.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {feedData?.items.map((run) => (
              <RunCard key={run.id} run={run} />
            ))}
          </div>
        </section>
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
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
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
        <p className="line-clamp-2 text-sm text-gray-800">{run.input.prompt}</p>
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

function GeneratedAssets({
  title,
  videos,
  images,
}: {
  title: string;
  videos: Array<{ id: string; videoUrl: string }>;
  images: Array<{ id: string; imageUrl: string }>;
}) {
  const hasAssets = videos.length > 0 || images.length > 0;
  return (
    <div className="space-y-2 rounded-lg border bg-gray-50 p-3">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-semibold">{title}</h5>
        {!hasAssets && (
          <span className="text-xs text-muted-foreground">
            Waiting for outputs...
          </span>
        )}
      </div>
      {hasAssets && (
        <div className="grid gap-3 sm:grid-cols-2">
          {videos.map((video) => (
            <div
              key={video.id}
              className="space-y-1 rounded border bg-white p-2 shadow-sm"
            >
              <video
                src={video.videoUrl}
                controls
                className="aspect-video w-full rounded"
              />
              <a
                href={video.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-xs text-blue-600 hover:underline"
              >
                {video.videoUrl}
              </a>
            </div>
          ))}
          {images.map((image) => (
            <div
              key={image.id}
              className="space-y-1 rounded border bg-white p-2 shadow-sm"
            >
              <img
                src={image.imageUrl}
                alt={image.id}
                className="h-32 w-full rounded object-cover"
              />
              <a
                href={image.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-xs text-blue-600 hover:underline"
              >
                {image.imageUrl}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBanner({
  status,
  hasVideo,
}: {
  status: VideoGenRealtime.ServerAppState["status"];
  hasVideo: boolean;
}) {
  const statusVariants: Record<
    typeof status,
    { variant: string; label: string }
  > = {
    not_started: { variant: "default", label: "Not Started" },
    running: { variant: "secondary", label: "Running" },
    succeeded: { variant: "success", label: "Succeeded" },
    failed: { variant: "destructive", label: "Failed" },
    canceled: { variant: "warning", label: "Canceled" },
  };

  const { variant, label } =
    statusVariants[status] || statusVariants.not_started;

  return (
    <div className="mt-3 flex items-center justify-between rounded border bg-gray-50 p-3">
      <div>
        <span className="text-sm font-medium">Status: </span>
        <Badge variant={variant as never}>{label}</Badge>
      </div>
      {hasVideo && (
        <span className="text-xs text-green-600">✓ Media Ready</span>
      )}
    </div>
  );
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

type AgentRunCard = AgentRunsRouterOutputs["list"]["items"][number];
