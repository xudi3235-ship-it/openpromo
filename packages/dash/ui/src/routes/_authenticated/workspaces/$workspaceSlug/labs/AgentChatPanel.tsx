import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { Input } from "@openpromo/ui/components/input";
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
import type { UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { useVideoGenAgent } from "@/hooks/useVideoGenAgent";

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

export function AgentChatPanel({ userId }: { userId: string | undefined }) {
  const [chatInput, setChatInput] = useState("");
  const [inputForm, setInputForm] = useState<InputFormState>(defaultInputForm);
  const [_msgs, setMsgs] = useState<unknown[]>([]);
  const [selectedAgent, setSelectedAgent] =
    useState<VideoGenRealtime.AgentName>("video_gen_agent");

  const {
    isConnected,
    sendEvent,
    setAgent,
    chat: { messages, sendMessage, status, error, clearHistory },
    serverState,
  } = useVideoGenAgent({
    userId: userId || "guest",
    onEvent: {
      echo: (data) => {
        alert(`Echo received: ${data.message}`);
      },
    },
    _onMessage: async (evt) => {
      setMsgs((prev) => [...prev, evt.data]);
    },
  });
  const lastSentRef = useRef<string | null>(null);

  const buildInputPayload = useMemo(() => {
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
  }, [inputForm]);

  useEffect(() => {
    setSelectedAgent(serverState.agent);
  }, [serverState.agent]);

  useEffect(() => {
    if (!isConnected) return;

    const payload = buildInputPayload;

    const payloadJson = JSON.stringify(payload);
    if (lastSentRef.current === payloadJson) return;

    sendEvent("set_input", payload);
    lastSentRef.current = payloadJson;
  }, [isConnected, sendEvent, buildInputPayload]);
  const isLoading = status === "streaming" || status === "submitted";

  if (!userId) {
    return (
      <div className="p-4 text-gray-500">
        Please sign in to use the agent chat.
      </div>
    );
  }

  const handleFormChange = (field: keyof InputFormState, value: string) => {
    setInputForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleStartPipeline = () => {
    if (!isConnected) return;
    sendEvent("start_pipeline", {});
  };

  const handleEcho = () => {
    sendEvent("echo", {
      message: `Hello from client at ${new Date().toISOString()}`,
    });
  };

  const handleLoadSample = () => {
    setInputForm(defaultInputForm);
  };

  const handleHardReset = () => {
    clearHistory();
    sendEvent("reset_state", {});
  };

  const handleAgentChange = (agentName: VideoGenRealtime.AgentName) => {
    setSelectedAgent(agentName);
    const payload = buildInputPayload;
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

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="space-y-4 lg:w-2/3">
        <section className="space-y-4 rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-base font-semibold">
                Video Pipeline Controls
              </h4>
              <p className="text-xs text-gray-500">
                Configure inputs and run the simplified video generation
                pipeline.
              </p>
            </div>
            <Badge variant={isConnected ? "success" : "warning"}>
              {isConnected ? "Connected" : "Connecting"}
            </Badge>
          </div>

          <div className="grid gap-3">
            <div>
              <Label htmlFor="agent">Agent</Label>
              <Select
                value={selectedAgent}
                onValueChange={(value) =>
                  handleAgentChange(value as VideoGenRealtime.AgentName)
                }
                disabled={!isConnected}
              >
                <SelectTrigger id="agent" className="w-full">
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video_gen_agent">
                    Video Generation
                  </SelectItem>
                  <SelectItem value="image_gen_agent">
                    Image Generation
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                value={inputForm.prompt}
                onChange={(e) => handleFormChange("prompt", e.target.value)}
                placeholder="Describe the video you want..."
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
                  handleFormChange("productImages", e.target.value)
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
                  handleFormChange("avatarImages", e.target.value)
                }
                rows={3}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleStartPipeline}
              variant="default"
              disabled={!isConnected}
            >
              Start Pipeline
            </Button>
            <Button onClick={handleLoadSample} variant="outline">
              Load Sample
            </Button>
            <Button onClick={handleEcho} variant="outline" size="sm">
              Test Echo
            </Button>
            <Button
              onClick={handleHardReset}
              variant="destructive"
              size="sm"
              disabled={!isConnected}
            >
              Hard Reset
            </Button>
          </div>

          <StatusBanner
            status={serverState.status}
            hasVideo={videos.length > 0}
          />

          <GeneratedAssets videos={videos} images={images} />
        </section>

        {/* Chat Section */}
        <section className="rounded-lg border bg-white p-4 shadow-sm">
          <h4 className="mb-3 font-semibold">Agent Chat</h4>
          <div className="mb-4 max-h-96 overflow-y-auto space-y-2 rounded border p-3">
            {messages.length === 0 && (
              <p className="text-sm text-gray-500">No messages yet...</p>
            )}
            {messages.map((msg: UIMessage, index: number) => (
              <div
                key={`msg-${msg.id || index}`}
                className={`rounded p-2 text-sm ${
                  msg.role === "user" ? "bg-blue-50" : "bg-gray-50"
                }`}
              >
                <strong className="text-xs uppercase text-gray-600">
                  {msg.role}:
                </strong>
                <div className="mt-1">{JSON.stringify(msg)}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message to the agent..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (chatInput.trim()) {
                    sendMessage({
                      role: "user",
                      parts: [{ type: "text", text: chatInput.trim() }],
                    });
                    setChatInput("");
                  }
                }
              }}
            />
            <Button
              onClick={() => {
                if (chatInput.trim()) {
                  sendMessage({
                    role: "user",
                    parts: [{ type: "text", text: chatInput.trim() }],
                  });
                  setChatInput("");
                }
              }}
              disabled={isLoading || !chatInput.trim()}
            >
              Send
            </Button>
            <Button onClick={clearHistory} variant="outline" size="sm">
              Clear
            </Button>
          </div>
          {error && (
            <div className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              Error: {error.message}
            </div>
          )}
        </section>
      </div>

      {/* Sidebar */}
      <aside className="space-y-4 lg:w-1/3">
        <section className="rounded-lg border bg-white p-4 shadow-sm">
          <h4 className="mb-2 font-semibold">Server State</h4>
          <pre className="max-h-96 overflow-auto rounded bg-gray-50 p-3 text-xs">
            {JSON.stringify(serverState, null, 2)}
          </pre>
        </section>
      </aside>
    </div>
  );
}

function GeneratedAssets({
  videos,
  images,
}: {
  videos: Array<{ id: string; videoUrl: string }>;
  images: Array<{ id: string; imageUrl: string }>;
}) {
  const hasAssets = videos.length > 0 || images.length > 0;

  return (
    <section className="space-y-3 rounded-lg border bg-gray-50 p-3">
      <h5 className="text-sm font-semibold">Generated Assets</h5>
      {!hasAssets && (
        <p className="text-xs text-gray-500">
          No assets yet — run the pipeline to see outputs.
        </p>
      )}

      {videos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700">Videos</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {videos.map((video) => (
              <div
                key={video.id}
                className="space-y-2 rounded border bg-white p-2 shadow-sm"
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
                  className="block truncate text-xs text-blue-600 hover:underline"
                >
                  {video.videoUrl}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {images.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700">Images</p>
          <div className="grid gap-3 sm:grid-cols-3">
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
                  className="block truncate text-xs text-blue-600 hover:underline"
                >
                  {image.imageUrl}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
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
        <span className="text-xs text-green-600">✓ Video Ready</span>
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
