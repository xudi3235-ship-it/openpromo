import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { Checkbox } from "@openpromo/ui/components/checkbox";
import { Input } from "@openpromo/ui/components/input";
import { Label } from "@openpromo/ui/components/label";
import { Textarea } from "@openpromo/ui/components/textarea";
import type { VideoGenMessageEvent } from "@shared";
import type { UIMessage } from "ai";
import { useEffect, useMemo, useState } from "react";
import { useVideoGenAgent } from "@/hooks/useVideoGenAgent";

const sampleProductImageUrls = [
  "https://i.pinimg.com/1200x/1e/63/b8/1e63b8168a25c2a2a4127971514d97e2.jpg",
];

const sampleAvatarImageUrls = [
  "https://i.pinimg.com/1200x/04/9a/65/049a6564d158084703960383df8de897.jpg",
];

const samplePrompt =
  "Create an 8s TikTok-style UGC video. Start by generating multiple hero keyframes before attempting video.";

type InputFormState = {
  prompt: string;
  productImages: string;
  avatarImages: string;
  additionalAssetUrls: string;
  motionPrompt: string;
};

const defaultInputForm: InputFormState = {
  prompt: samplePrompt,
  productImages: sampleProductImageUrls.join("\n"),
  avatarImages: sampleAvatarImageUrls.join("\n"),
  additionalAssetUrls: "",
  motionPrompt: "",
};

const parseMultilineList = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

type ButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive";

export function AgentChatPanel({ userId }: { userId: string | undefined }) {
  const [chatInput, setChatInput] = useState("");
  const [inputForm, setInputForm] = useState<InputFormState>(defaultInputForm);
  const [_msgs, setMsgs] = useState<unknown[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [actionFeedback, setActionFeedback] = useState("");

  const {
    isConnected,
    sendEvent,
    submitAction,
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

  const isLoading = status === "streaming" || status === "submitted";
  const galleryAssets = useMemo(
    () => serverState.assets ?? [],
    [serverState.assets],
  );
  const pendingAction = serverState.pendingAction;

  useEffect(() => {
    setSelectedAssetIds((prev) =>
      prev.filter((id) => serverState.assets.some((asset) => asset.id === id)),
    );
  }, [serverState.assets]);

  useEffect(() => {
    if (!pendingAction) {
      setActionFeedback("");
    }
  }, [pendingAction]);

  const selectedAssets = useMemo(
    () =>
      serverState.assets.filter((asset) => selectedAssetIds.includes(asset.id)),
    [serverState.assets, selectedAssetIds],
  );
  const selectedKeyframe = selectedAssets.find(
    (asset) => asset.kind === "image" && Boolean(asset.url),
  );
  const canStartVideo = Boolean(selectedKeyframe?.url);

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

  const handleApplyInputs = () => {
    if (!isConnected) return;
    const productImages = parseMultilineList(inputForm.productImages);
    const avatarImages = parseMultilineList(inputForm.avatarImages);
    const additionalAssetUrls = parseMultilineList(
      inputForm.additionalAssetUrls,
    );
    const payload: VideoGenMessageEvent.EventDataMap["set_input"] = {
      prompt: inputForm.prompt.trim() || samplePrompt,
      productImages,
      avatarImages,
    };
    if (additionalAssetUrls.length) {
      payload.additionalAssetUrls = additionalAssetUrls;
    }
    const motionPromptValue = inputForm.motionPrompt.trim();
    if (motionPromptValue) {
      payload.motionPrompt = motionPromptValue;
    }
    sendEvent("set_input", payload);
  };

  const handleStartPipeline = () => {
    if (!isConnected) return;
    sendEvent("start_pipeline", {});
  };

  const handleStartVideoStage = () => {
    if (!isConnected || !selectedKeyframe?.url) return;
    const motionPromptValue = inputForm.motionPrompt.trim();
    sendEvent("start_video", {
      selectedKeyframeUrl: selectedKeyframe.url,
      motionPrompt: motionPromptValue || undefined,
    });
  };

  const handleEcho = () => {
    sendEvent("echo", {
      message: `Hello from client at ${new Date().toISOString()}`,
    });
  };

  const handleCancelRun = () => {
    sendEvent("cancel_run", { reason: "user_reset" });
  };

  const handleRequestHistory = () => {
    sendEvent("request_history", { limit: 15 });
  };

  const handleLoadSample = () => {
    setInputForm(defaultInputForm);
  };

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(assetId)
        ? prev.filter((id) => id !== assetId)
        : [...prev, assetId],
    );
  };

  const clearSelection = () => setSelectedAssetIds([]);

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
                Configure inputs, approvals, and manual resumes for testing.
              </p>
            </div>
            <Badge variant={isConnected ? "success" : "warning"}>
              {isConnected ? "Connected" : "Connecting"}
            </Badge>
          </div>

          <div className="grid gap-3">
            <div>
              <Label htmlFor="agent-prompt">Product prompt</Label>
              <Textarea
                id="agent-prompt"
                value={inputForm.prompt}
                onChange={(event) =>
                  handleFormChange("prompt", event.target.value)
                }
                rows={3}
                placeholder="Describe the video you need..."
              />
            </div>
            <div>
              <Label htmlFor="agent-product-images">Product image URLs</Label>
              <Textarea
                id="agent-product-images"
                value={inputForm.productImages}
                onChange={(event) =>
                  handleFormChange("productImages", event.target.value)
                }
                rows={2}
                placeholder="One URL per line"
              />
            </div>
            <div>
              <Label htmlFor="agent-avatar-images">
                Avatar / talent references
              </Label>
              <Textarea
                id="agent-avatar-images"
                value={inputForm.avatarImages}
                onChange={(event) =>
                  handleFormChange("avatarImages", event.target.value)
                }
                rows={2}
                placeholder="One URL per line"
              />
            </div>
            <div>
              <Label htmlFor="agent-additional-assets">Additional assets</Label>
              <Textarea
                id="agent-additional-assets"
                value={inputForm.additionalAssetUrls}
                onChange={(event) =>
                  handleFormChange("additionalAssetUrls", event.target.value)
                }
                rows={2}
                placeholder="Optional supporting references"
              />
            </div>
            <div>
              <Label htmlFor="agent-motion-prompt">Motion prompt</Label>
              <Input
                id="agent-motion-prompt"
                value={inputForm.motionPrompt}
                onChange={(event) =>
                  handleFormChange("motionPrompt", event.target.value)
                }
                placeholder="Camera or pacing instructions"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={handleApplyInputs}
              disabled={!isConnected}
            >
              Save Inputs
            </Button>
            <Button size="sm" variant="secondary" onClick={handleLoadSample}>
              Load Sample Inputs
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleStartPipeline}
              disabled={!isConnected}
            >
              Start Keyframes
            </Button>
            <Button
              size="sm"
              onClick={handleStartVideoStage}
              disabled={!isConnected || !canStartVideo}
            >
              Start Video From Selection
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRequestHistory}
              disabled={!isConnected}
            >
              History Snapshot
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleEcho}
              disabled={!isConnected}
            >
              Test Echo
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleCancelRun}
              disabled={!isConnected}
            >
              Reset Run
            </Button>
          </div>

          <p className="text-xs text-gray-500">
            Selected keyframes: {selectedAssetIds.length || 0} • Total assets:{" "}
            {galleryAssets.length}
          </p>

          <StatusBanner
            status={serverState.status}
            currentStep={serverState.currentStep}
            pendingAction={pendingAction}
          />
        </section>

        <section className="space-y-4 rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold">Agent Chat</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              disabled={!isConnected}
            >
              Clear Remote History
            </Button>
          </div>

          <div className="h-96 space-y-4 overflow-y-auto rounded-lg border bg-gray-50 p-4">
            {messages.length === 0 ? (
              <p className="text-sm text-gray-500">Start a conversation...</p>
            ) : (
              messages.map((message: UIMessage, index: number) => (
                <div
                  key={message.id || `${message.role}-${index}`}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs rounded-lg p-3 ${
                      message.role === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-900"
                    }`}
                  >
                    <p className="text-sm">
                      {message.parts
                        ?.filter((part) => part.type === "text")
                        .map((part) => (part.type === "text" ? part.text : ""))
                        .join("") || ""}
                    </p>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-gray-200 p-3 text-sm text-gray-900">
                  Agent is typing...
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-lg bg-red-100 p-3 text-sm text-red-800">
                Error: {error.message}
              </div>
            )}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!chatInput.trim()) return;
              sendMessage({
                role: "user",
                parts: [{ type: "text", text: chatInput }],
              });
              setChatInput("");
            }}
            className="flex gap-2"
          >
            <Input
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Type your message..."
              disabled={isLoading || !isConnected}
            />
            <Button
              type="submit"
              disabled={isLoading || !chatInput.trim() || !isConnected}
            >
              {isLoading ? "Sending..." : "Send"}
            </Button>
          </form>
        </section>

        <section className="space-y-4 rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h5 className="text-sm font-semibold">Generated Assets</h5>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span>Selected: {selectedAssetIds.length}</span>
              {selectedAssetIds.length > 0 && (
                <Button variant="link" size="sm" onClick={clearSelection}>
                  Clear selection
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRequestHistory}
                disabled={!isConnected}
              >
                Refresh
              </Button>
            </div>
          </div>

          <PendingActionPanel
            pendingAction={pendingAction}
            disabled={!isConnected}
            selectedAssetIds={selectedAssetIds}
            onSubmit={(payload) => submitAction(payload)}
            feedback={actionFeedback}
            onFeedbackChange={setActionFeedback}
          />

          <AssetGallery
            assets={galleryAssets}
            disabled={!isConnected}
            onAction={(payload) => submitAction(payload)}
            selectedAssetIds={selectedAssetIds}
            onToggleSelection={toggleAssetSelection}
          />
        </section>
      </div>

      <aside className="lg:w-1/3">
        <div className="h-full space-y-4 rounded-lg border bg-white p-4 shadow-sm">
          <h5 className="text-sm font-semibold">Server State</h5>
          <pre className="max-h-64 overflow-auto rounded bg-gray-50 p-2 text-xs">
            {JSON.stringify(serverState, null, 2)}
          </pre>

          <h5 className="text-sm font-semibold">Events</h5>
          <pre className="max-h-64 overflow-auto rounded bg-gray-50 p-2 text-xs">
            {JSON.stringify(_msgs, null, 2)}
          </pre>
        </div>
      </aside>
    </div>
  );
}

type AssetGalleryProps = {
  assets: VideoGenMessageEvent.GeneratedAsset[];
  disabled: boolean;
  onAction: (payload: VideoGenMessageEvent.SubmitActionPayload) => void;
  selectedAssetIds: string[];
  onToggleSelection: (assetId: string) => void;
};

function AssetGallery({
  assets,
  disabled,
  onAction,
  selectedAssetIds,
  onToggleSelection,
}: AssetGalleryProps) {
  if (!assets.length) {
    return (
      <p className="text-sm text-gray-500">
        Run the pipeline to see generated keyframes and videos here.
      </p>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          onAction={onAction}
          disabled={disabled}
          isSelected={selectedAssetIds.includes(asset.id)}
          onToggleSelect={onToggleSelection}
        />
      ))}
    </div>
  );
}

type AssetCardProps = {
  asset: VideoGenMessageEvent.GeneratedAsset;
  onAction: (payload: VideoGenMessageEvent.SubmitActionPayload) => void;
  disabled: boolean;
  isSelected: boolean;
  onToggleSelect: (assetId: string) => void;
};

function AssetCard({
  asset,
  onAction,
  disabled,
  isSelected,
  onToggleSelect,
}: AssetCardProps) {
  const isImage = asset.kind === "image";
  const isReady = asset.status === "ready";
  const statusLabel = asset.status.replace(/_/g, " ");

  const decisionBadgeVariant = (() => {
    switch (asset.decision) {
      case "approved":
        return "success";
      case "rejected":
        return "destructive";
      case "regenerate":
        return "secondary";
      default:
        return undefined;
    }
  })();

  const quickSubmit = (
    action: VideoGenMessageEvent.SubmitActionPayload["action"],
  ) => {
    onAction({ action, assetIds: [asset.id] });
  };

  return (
    <div className="space-y-3 rounded-lg border bg-gray-50 p-3">
      <div className="flex aspect-video items-center justify-center overflow-hidden rounded bg-white">
        {isImage ? (
          asset.url ? (
            <img
              src={asset.url}
              alt={asset.label ?? "Generated keyframe"}
              className="h-full w-full object-cover"
            />
          ) : (
            <p className="text-xs text-gray-500">Awaiting preview...</p>
          )
        ) : asset.url ? (
          <video
            controls
            className="h-full w-full object-cover"
            poster={asset.thumbnailUrl ?? undefined}
          >
            <source src={asset.url} />
          </video>
        ) : (
          <p className="text-xs text-gray-500">Awaiting video...</p>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span className="uppercase tracking-wide">
          {isImage ? "Keyframe" : "Video"}
        </span>
        <div className="flex items-center gap-2">
          <span className="capitalize">{statusLabel}</span>
          {decisionBadgeVariant && (
            <Badge variant={decisionBadgeVariant}>{asset.decision}</Badge>
          )}
        </div>
      </div>
      {isImage && isReady && asset.url && (
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(asset.id)}
            disabled={disabled}
          />
          <span>Select for video stage</span>
        </label>
      )}
      {isReady && (
        <div className="flex flex-wrap gap-2">
          {isImage ? (
            <>
              <Button
                size="sm"
                onClick={() => quickSubmit("approve_keyframe")}
                disabled={disabled}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => quickSubmit("continue_with_asset")}
                disabled={disabled}
              >
                Continue With Asset
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => quickSubmit("reject_keyframe")}
                disabled={disabled}
              >
                Reject
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => quickSubmit("regenerate_keyframe")}
                disabled={disabled}
              >
                Regenerate
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                onClick={() => quickSubmit("approve_video")}
                disabled={disabled}
              >
                Approve Video
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => quickSubmit("reject_video")}
                disabled={disabled}
              >
                Reject
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => quickSubmit("retry_video_generation")}
                disabled={disabled}
              >
                Retry
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

type PendingActionPanelProps = {
  pendingAction: VideoGenMessageEvent.PendingAction | null;
  disabled: boolean;
  selectedAssetIds: string[];
  onSubmit: (payload: VideoGenMessageEvent.SubmitActionPayload) => void;
  feedback: string;
  onFeedbackChange: (value: string) => void;
};

function PendingActionPanel({
  pendingAction,
  disabled,
  selectedAssetIds,
  onSubmit,
  feedback,
  onFeedbackChange,
}: PendingActionPanelProps) {
  if (!pendingAction) return null;

  type ActionButton = {
    label: string;
    action: VideoGenMessageEvent.SubmitActionPayload["action"];
    variant?: ButtonVariant;
  };

  const targetIds =
    selectedAssetIds.length > 0 ? selectedAssetIds : pendingAction.assetIds;

  const baseButtons: ActionButton[] = (() => {
    switch (pendingAction.type) {
      case "confirm_keyframes":
        return [
          { label: "Approve Keyframes", action: "approve_keyframe" },
          {
            label: "Continue With Selection",
            action: "continue_with_asset",
            variant: "secondary",
          },
          {
            label: "Reject Selection",
            action: "reject_keyframe",
            variant: "outline",
          },
          {
            label: "Regenerate",
            action: "regenerate_keyframe",
            variant: "outline",
          },
        ];
      case "confirm_video":
        return [
          { label: "Approve Video", action: "approve_video" },
          { label: "Reject Video", action: "reject_video", variant: "outline" },
          {
            label: "Retry Video Generation",
            action: "retry_video_generation",
            variant: "secondary",
          },
        ];
      case "retry_required":
        return [
          {
            label: "Retry Video Generation",
            action: "retry_video_generation",
          },
        ];
      default:
        return [];
    }
  })();

  const buttons: ActionButton[] = [
    ...baseButtons,
    { label: "Dismiss", action: "dismiss_action", variant: "ghost" },
  ];

  const handleSubmit = (
    action: VideoGenMessageEvent.SubmitActionPayload["action"],
  ) => {
    onSubmit({
      action,
      assetIds: targetIds,
      feedback: feedback.trim() || undefined,
    });
  };

  return (
    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
      <div>
        <p className="font-semibold">{pendingAction.title}</p>
        {pendingAction.description && (
          <p className="text-xs text-amber-800">{pendingAction.description}</p>
        )}
      </div>
      <Textarea
        rows={2}
        value={feedback}
        onChange={(event) => onFeedbackChange(event.target.value)}
        placeholder="Optional feedback for the agent"
      />
      <div className="flex flex-wrap gap-2">
        {buttons.map((button) => (
          <Button
            key={button.action}
            size="sm"
            variant={button.variant}
            disabled={disabled || targetIds.length === 0}
            onClick={() => handleSubmit(button.action)}
          >
            {button.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

type StatusBannerProps = {
  status: VideoGenMessageEvent.EventDataMap["status_update"]["status"];
  currentStep: string;
  pendingAction: VideoGenMessageEvent.PendingAction | null;
};

function StatusBanner({
  status,
  currentStep,
  pendingAction,
}: StatusBannerProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-white p-3">
      <div className="flex items-center justify-between text-sm font-medium">
        <span className="uppercase tracking-wide">Pipeline Status</span>
        <span className="font-semibold capitalize text-blue-600">
          {status.replace(/_/g, " ")}
        </span>
      </div>
      <p className="text-xs text-gray-600">Current step: {currentStep}</p>
      {pendingAction && (
        <p className="text-xs text-amber-600">
          Awaiting action: {pendingAction.title}
        </p>
      )}
    </div>
  );
}
