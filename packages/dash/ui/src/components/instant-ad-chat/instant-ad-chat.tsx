/** biome-ignore-all lint/suspicious/noArrayIndexKey: test */
import {
  Conversation,
  ConversationContent,
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@openpromo/ui/components/ai-elements";
import type { PromptInputMessage } from "@openpromo/ui/components/ai-elements/prompt-input";
import { Button } from "@openpromo/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@openpromo/ui/components/tooltip";
import { cn } from "@openpromo/ui/lib/utils";
import { Mic, Paperclip, Send, Sparkles } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import type { ProductSelectItem } from "@/components/image-generator/product-select";
import type { StyleGalleryItem } from "@/components/image-generator/style-gallery";
import type { Preset } from "@/components/instant-ad/video-presets";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  productPicker?: ProductSelectItem[];
  presetPicker?: Preset[];
}

interface InstantAdChatProps {
  products?: ProductSelectItem[];
  presets?: Preset[];
  styles?: StyleGalleryItem[];
  onGenerate?: (request: {
    prompt: string;
    productId?: string;
    presetId?: string;
    styleId?: string;
  }) => void;
}

export function InstantAdChat({
  products = [],
  presets: _presets = [],
  styles: _styles = [],
  onGenerate: _onGenerate,
}: InstantAdChatProps) {
  const [selectedProductId, setSelectedProductId] = useState<
    string | undefined
  >(products.at(0)?.id);
  const [selectedPresetId, setSelectedPresetId] = useState<string | undefined>(
    _presets.at(0)?.id,
  );
  const [selectedStyleId, setSelectedStyleId] = useState<string | undefined>(
    _styles.at(0)?.id,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content:
        '👋 Welcome to Instant Ad Creator!\n\nI can help you create stunning social media ads in seconds. Just tell me what you\'d like to create!\n\nTry: "Create a TikTok ad for my product"',
      timestamp: new Date(),
    },
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const hasConversationStarted = useMemo(
    () => messages.some((message) => message.role === "user"),
    [messages],
  );

  const handleSubmit = async (
    { text }: PromptInputMessage,
    _event?: FormEvent<HTMLFormElement>,
  ) => {
    if (!text.trim()) {
      setSubmitError("Add a short direction for the ad.");
      return;
    }

    if (!selectedProductId || !selectedPresetId) {
      setSubmitError("Pick a product and preset to generate.");
      return;
    }

    setSubmitError(null);

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Simple logic to detect intent
    const lowerText = text.toLowerCase();

    // Check if user is asking to create an ad without specifying product
    if (
      (lowerText.includes("create") ||
        lowerText.includes("make") ||
        lowerText.includes("generate")) &&
      (lowerText.includes("ad") ||
        lowerText.includes("video") ||
        lowerText.includes("content")) &&
      !lowerText.includes("for my") &&
      products.length > 0
    ) {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'd love to help! Which product would you like to feature?",
        timestamp: new Date(),
        productPicker: products.slice(0, 4),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      return;
    }

    // Simulate generation for demo
    setIsGenerating(true);
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "✨ Creating your ad...\n\nThis is a demo - in the real version, I'd generate actual ad content based on your request!",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsGenerating(false);
    }, 2000);

    _onGenerate?.({
      prompt: text,
      productId: selectedProductId,
      presetId: selectedPresetId,
      styleId: selectedStyleId,
    });
  };

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-r from-primary/10 via-background to-secondary/10 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-[0_10px_40px_-12px_rgba(0,0,0,0.18)]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Instant Ad Studio</h2>
              <p className="text-xs text-muted-foreground">
                Pick product + preset, then hit generate.
              </p>
            </div>
          </div>
          <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            Ready in seconds
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {hasConversationStarted ? (
          <Conversation>
            <ConversationContent>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onProductSelect={(productId) =>
                    setSelectedProductId(productId)
                  }
                  onPresetSelect={(presetId) => setSelectedPresetId(presetId)}
                />
              ))}

              {isGenerating && (
                <div className="flex gap-3 p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/60">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                      <span className="text-sm text-muted-foreground">
                        Generating your ad...
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {["s", "e", "c", "o", "n", "d", "s"].map((_char, i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-1 w-1 rounded-full bg-muted-foreground/30",
                            i < 3 && "animate-pulse bg-foreground",
                          )}
                          style={{ animationDelay: `${i * 0.2}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </ConversationContent>
          </Conversation>
        ) : (
          <CenteredHero
            products={products}
            presets={_presets}
            styles={_styles}
            selectedProductId={selectedProductId}
            selectedPresetId={selectedPresetId}
            selectedStyleId={selectedStyleId}
            onProductSelect={setSelectedProductId}
            onPresetSelect={setSelectedPresetId}
            onStyleSelect={setSelectedStyleId}
          />
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card/80 px-4 pb-4 pt-3 backdrop-blur">
        <SelectionTray
          products={products}
          presets={_presets}
          styles={_styles}
          selectedProductId={selectedProductId}
          selectedPresetId={selectedPresetId}
          selectedStyleId={selectedStyleId}
          onProductSelect={setSelectedProductId}
          onPresetSelect={setSelectedPresetId}
          onStyleSelect={setSelectedStyleId}
        />

        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea
              placeholder="Ask for a TikTok, Stories, or Reels ad..."
              className="min-h-[62px] resize-none bg-muted/50 text-foreground placeholder:text-muted-foreground"
            />
          </PromptInputBody>

          <PromptInputFooter>
            <PromptInputTools>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PromptInputButton
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:bg-muted/70"
                    >
                      <Paperclip className="h-4 w-4" />
                    </PromptInputButton>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Attach files</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PromptInputButton
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:bg-muted/70"
                    >
                      <Mic className="h-4 w-4" />
                    </PromptInputButton>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Voice input</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PromptInputButton
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:bg-muted/70"
                    >
                      <Sparkles className="h-4 w-4" />
                    </PromptInputButton>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Quick actions</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </PromptInputTools>

            <PromptInputSubmit
              disabled={isGenerating}
              variant="default"
              className="bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90"
            >
              <Send className="h-4 w-4" />
            </PromptInputSubmit>
          </PromptInputFooter>
        </PromptInput>

        {submitError && (
          <p className="mt-2 text-xs text-rose-300">{submitError}</p>
        )}
      </div>
    </div>
  );
}

function CenteredHero({
  products,
  presets,
  styles,
  selectedProductId,
  selectedPresetId,
  selectedStyleId,
  onProductSelect,
  onPresetSelect,
  onStyleSelect,
}: {
  products: ProductSelectItem[];
  presets: Preset[];
  styles: StyleGalleryItem[];
  selectedProductId?: string;
  selectedPresetId?: string;
  selectedStyleId?: string;
  onProductSelect: (value: string | undefined) => void;
  onPresetSelect: (value: string | undefined) => void;
  onStyleSelect: (value: string | undefined) => void;
}) {
  return (
    <div className="flex h-full items-center justify-center bg-gradient-to-b from-primary/5 via-background to-secondary/5 px-6 py-10">
      <div className="w-full max-w-4xl rounded-3xl border border-border bg-card/70 p-8 shadow-[0_30px_120px_-50px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="flex items-center gap-3 text-foreground/80">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-[0_15px_40px_-18px_rgba(0,0,0,0.25)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.08em] text-muted-foreground">
              Instant Ad Creator
            </p>
            <h1 className="text-3xl font-semibold text-foreground">
              Where should we start?
            </h1>
          </div>
        </div>

        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
          Choose a product and preset, then drop a short direction. We’ll create
          platform-ready ads without a long back-and-forth.
        </p>

        <div className="mt-6 space-y-4">
          <SelectionTray
            products={products}
            presets={presets}
            styles={styles}
            selectedProductId={selectedProductId}
            selectedPresetId={selectedPresetId}
            selectedStyleId={selectedStyleId}
            onProductSelect={onProductSelect}
            onPresetSelect={onPresetSelect}
            onStyleSelect={onStyleSelect}
            condensed={false}
          />

          <div className="rounded-2xl border border-border bg-muted/60 p-4">
            <div className="rounded-xl border border-border bg-card/80 px-4 py-3">
              <div className="text-xs text-muted-foreground">Prompt</div>
              <p className="mt-1 text-sm text-foreground">
                “Create a 15s vertical TikTok ad featuring {"{"}selected product
                {"}"} with upbeat, hook-first copy.”
              </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {[
                "TikTok hooks",
                "UGC style",
                "Carousel for Stories",
                "Summer promo",
                "Holiday promo",
              ].map((chip) => (
                <span
                  key={chip}
                  className="cursor-default rounded-full border border-border bg-card/70 px-3 py-1"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectionTray({
  products,
  presets,
  styles,
  selectedProductId,
  selectedPresetId,
  selectedStyleId,
  onProductSelect,
  onPresetSelect,
  onStyleSelect,
  condensed = true,
}: {
  products: ProductSelectItem[];
  presets: Preset[];
  styles: StyleGalleryItem[];
  selectedProductId?: string;
  selectedPresetId?: string;
  selectedStyleId?: string;
  onProductSelect: (value: string | undefined) => void;
  onPresetSelect: (value: string | undefined) => void;
  onStyleSelect: (value: string | undefined) => void;
  condensed?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid w-full items-start gap-3 rounded-2xl border border-border bg-card/70 px-3 py-3",
        condensed ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 lg:grid-cols-3",
      )}
    >
      <SelectionColumn
        title="Product"
        description="Required"
        emptyLabel="Add a product"
        items={products.map((product) => ({
          id: product.id,
          label: product.name ?? "Unnamed",
          thumbnail: product.primaryAttachmentId
            ? (product.attachments?.find(
                (a) => a.id === product.primaryAttachmentId,
              )?.thumbnailUrl ?? undefined)
            : undefined,
        }))}
        selectedId={selectedProductId}
        onSelect={onProductSelect}
      />

      <SelectionColumn
        title="Preset"
        description="Required"
        emptyLabel="Add presets"
        items={presets.map((preset) => ({ id: preset.id, label: preset.name }))}
        selectedId={selectedPresetId}
        onSelect={onPresetSelect}
      />

      <SelectionColumn
        title="Style"
        description="Optional"
        emptyLabel="Add styles"
        items={styles.map((style) => ({
          id: style.id,
          label: style.name ?? "Style",
        }))}
        selectedId={selectedStyleId}
        onSelect={onStyleSelect}
      />
    </div>
  );
}

function SelectionColumn({
  title,
  description,
  emptyLabel,
  items,
  selectedId,
  onSelect,
}: {
  title: string;
  description: string;
  emptyLabel: string;
  items: { id?: string; label: string; thumbnail?: string }[];
  selectedId?: string;
  onSelect: (value: string | undefined) => void;
}) {
  const hasItems = items.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium text-foreground/80">{title}</span>
        <span>{description}</span>
      </div>
      {hasItems ? (
        <div className="flex flex-wrap gap-2">
          {items.slice(0, 6).map((item) => (
            <Button
              key={item.id ?? item.label}
              variant={selectedId === item.id ? "default" : "outline"}
              size="sm"
              onClick={() => onSelect(item.id)}
              className={cn(
                "h-auto rounded-xl border-border bg-card/80 px-3 py-2 text-xs hover:border-foreground/30 hover:bg-muted",
                selectedId === item.id &&
                  "border-transparent bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90",
              )}
            >
              {item.thumbnail && (
                <img
                  src={item.thumbnail}
                  alt={item.label}
                  className="mr-2 h-6 w-6 rounded object-cover"
                />
              )}
              {item.label}
            </Button>
          ))}

          {items.length > 6 && (
            <span className="text-[11px] text-muted-foreground">
              +{items.length - 6} more
            </span>
          )}
        </div>
      ) : (
        <div className="flex h-[60px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 text-xs text-muted-foreground">
          {emptyLabel}
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  onProductSelect,
  onPresetSelect,
}: {
  message: ChatMessage;
  onProductSelect?: (productId: string) => void;
  onPresetSelect?: (presetId: string) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3 p-4", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {isUser ? (
          <span className="text-sm font-medium">U</span>
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
      </div>

      {/* Message */}
      <div
        className={cn("flex flex-col gap-2 max-w-[80%]", isUser && "items-end")}
      >
        <div
          className={cn(
            "rounded-lg px-4 py-3 text-sm",
            isUser ? "bg-primary text-primary-foreground" : "bg-muted",
          )}
        >
          {message.content.split("\n").map((paragraph, i) => (
            <p key={i} className={i > 0 ? "mt-2" : ""}>
              {paragraph}
            </p>
          ))}
        </div>

        {/* Product Picker */}
        {message.productPicker && message.productPicker.length > 0 && (
          <ProductPicker
            products={message.productPicker}
            onSelect={onProductSelect}
          />
        )}

        {/* Preset Picker */}
        {message.presetPicker && message.presetPicker.length > 0 && (
          <PresetPicker
            presets={message.presetPicker}
            onSelect={onPresetSelect}
          />
        )}

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground">
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}

function ProductPicker({
  products,
  onSelect,
}: {
  products: ProductSelectItem[];
  onSelect?: (productId: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {products.map((product) => (
        <Button
          key={product.id}
          variant="outline"
          className="h-auto p-3 flex flex-col items-center gap-2"
          onClick={() => onSelect?.(product.id)}
        >
          {product.primaryAttachmentId &&
            product.attachments?.find(
              (a) => a.id === product.primaryAttachmentId,
            )?.thumbnailUrl && (
              <img
                src={
                  product.attachments.find(
                    (a) => a.id === product.primaryAttachmentId,
                  )?.thumbnailUrl ?? undefined
                }
                alt={product.name ?? "Product"}
                className="h-12 w-12 rounded object-cover"
              />
            )}
          <span className="text-xs text-center truncate">
            {product.name ?? "Unnamed Product"}
          </span>
        </Button>
      ))}
    </div>
  );
}

function PresetPicker({
  presets,
  onSelect,
}: {
  presets: Preset[];
  onSelect?: (presetId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((preset) => (
        <Button
          key={preset.id}
          variant="outline"
          size="sm"
          onClick={() => onSelect?.(preset.id)}
          className="text-xs"
        >
          {preset.name}
        </Button>
      ))}
    </div>
  );
}
