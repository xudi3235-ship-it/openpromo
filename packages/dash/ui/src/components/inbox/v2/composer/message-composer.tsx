import { Button } from "@openpromo/ui/components/button";
import { Textarea } from "@openpromo/ui/components/textarea";
import { cn } from "@openpromo/ui/lib/utils";
import { CornerUpLeft, Loader2, Send, Square, X } from "lucide-react";
import type {
  ComponentProps,
  FormHTMLAttributes,
  HTMLAttributes,
  KeyboardEvent,
} from "react";
import type { InboxMessage } from "@/stores/inbox/types";

export interface MessageComposerRootProps
  extends FormHTMLAttributes<HTMLFormElement> {}

export function MessageComposerRoot({
  className,
  ...props
}: MessageComposerRootProps) {
  return (
    <form
      className={cn(
        "flex w-full flex-col gap-2 overflow-hidden rounded-xl border border-border/50 bg-background",
        className,
      )}
      {...props}
    />
  );
}

export interface MessageComposerTextareaProps
  extends ComponentProps<typeof Textarea> {
  minHeight?: number;
  maxHeight?: number;
  submitOnEnter?: boolean;
}

export function MessageComposerTextarea({
  className,
  minHeight = 56,
  maxHeight = 180,
  submitOnEnter = true,
  onKeyDown,
  ...props
}: MessageComposerTextareaProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (submitOnEnter && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
      return;
    }
    onKeyDown?.(event);
  };

  return (
    <Textarea
      className={cn(
        "min-h-[56px] w-full resize-none rounded-none border-none px-3 pb-2 pt-3 text-sm shadow-none outline-none ring-0",
        "field-sizing-content max-h-[12lh] bg-transparent focus-visible:ring-0",
        className,
      )}
      style={{
        minHeight,
        maxHeight,
      }}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
}

export interface MessageComposerToolbarProps
  extends HTMLAttributes<HTMLDivElement> {}

export function MessageComposerToolbar({
  className,
  ...props
}: MessageComposerToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-t border-border/40 bg-transparent px-3 py-2",
        className,
      )}
      {...props}
    />
  );
}

export interface MessageComposerSectionProps
  extends HTMLAttributes<HTMLDivElement> {}

export function MessageComposerTools({
  className,
  ...props
}: MessageComposerSectionProps) {
  return (
    <div className={cn("flex items-center gap-1", className)} {...props} />
  );
}

export function MessageComposerActions({
  className,
  ...props
}: MessageComposerSectionProps) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props} />
  );
}

export interface MessageComposerButtonProps
  extends ComponentProps<typeof Button> {}

export function MessageComposerButton({
  className,
  size,
  variant = "ghost",
  ...props
}: MessageComposerButtonProps) {
  const derivedSize = size ?? "icon";
  return (
    <Button
      className={cn(
        "h-8 w-8 shrink-0 rounded-lg text-muted-foreground",
        variant === "ghost" && "hover:bg-muted",
        className,
      )}
      size={derivedSize}
      variant={variant}
      {...props}
    />
  );
}

export type MessageComposerStatus =
  | "idle"
  | "submitting"
  | "streaming"
  | "error";

export interface MessageComposerSubmitButtonProps
  extends MessageComposerButtonProps {
  status?: MessageComposerStatus;
}

export function MessageComposerSubmitButton({
  status = "idle",
  children,
  className,
  disabled,
  ...props
}: MessageComposerSubmitButtonProps) {
  let Icon = Send;
  if (status === "submitting") {
    Icon = Loader2;
  } else if (status === "streaming") {
    Icon = Square;
  } else if (status === "error") {
    Icon = X;
  }

  const iconClass = cn("h-4 w-4", status === "submitting" && "animate-spin");

  return (
    <Button
      className={cn("gap-2 rounded-lg", className)}
      size="sm"
      type="submit"
      disabled={disabled}
      {...props}
    >
      {children ?? <Icon className={iconClass} />}
    </Button>
  );
}

export interface MessageComposerReplyPreviewProps
  extends HTMLAttributes<HTMLDivElement> {
  message: InboxMessage;
  onCancel?: () => void;
}

export function MessageComposerReplyPreview({
  message,
  onCancel,
  className,
  ...props
}: MessageComposerReplyPreviewProps) {
  const authorLabel = message.sender === "self" ? "You" : "Customer";
  const previewText = message.text?.trim() || "Attachment";

  return (
    <div
      className={cn(
        "flex items-start gap-2 border-b border-border/60 bg-muted/20 px-3 py-2 text-sm",
        className,
      )}
      {...props}
    >
      <span className="mt-1 text-muted-foreground">
        <CornerUpLeft className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Replying to {authorLabel}
        </div>
        <div className="line-clamp-2 text-sm text-foreground">
          {previewText}
        </div>
      </div>
      {onCancel ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

export const MessageComposer = {
  Root: MessageComposerRoot,
  Textarea: MessageComposerTextarea,
  Toolbar: MessageComposerToolbar,
  Tools: MessageComposerTools,
  Actions: MessageComposerActions,
  Button: MessageComposerButton,
  Submit: MessageComposerSubmitButton,
  ReplyPreview: MessageComposerReplyPreview,
};
