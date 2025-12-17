import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@openpromo/ui/components/dialog";
import type { InboxAttachment } from "@shared/inbox";
import { File, Music, Paperclip, Share2, Video } from "lucide-react";

interface InboxMessageAttachmentsProps {
  attachments: InboxAttachment[];
}

export function InboxMessageAttachments({
  attachments,
}: InboxMessageAttachmentsProps) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {attachments.map((attachment, index) => {
        const key = `${attachment.type}-${index}-${attachment.url}`;

        if (attachment.type === "image") {
          return (
            <Dialog key={key}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="relative overflow-hidden rounded-lg border border-border/50 transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <img
                    src={attachment.url}
                    alt="Attachment"
                    className="h-32 w-32 object-cover"
                  />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none">
                <img
                  src={attachment.url}
                  alt="Attachment preview"
                  className="max-h-[85vh] w-full object-contain"
                />
              </DialogContent>
            </Dialog>
          );
        }

        if (attachment.type === "video") {
          return (
            <Dialog key={key}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="relative overflow-hidden rounded-lg border border-border/50 transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <video
                    src={attachment.url}
                    className="h-32 w-32 object-cover"
                    muted
                    playsInline
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
                    <Video className="h-6 w-6 text-white" />
                  </div>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none">
                <video
                  src={attachment.url}
                  className="max-h-[85vh] w-full object-contain"
                  controls
                  playsInline
                />
              </DialogContent>
            </Dialog>
          );
        }

        const icon = getAttachmentIcon(attachment.type);
        const fileName = getFileNameFromUrl(attachment.url) || "Attachment";

        return (
          <a
            key={key}
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="flex max-w-[200px] items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs transition-colors hover:bg-muted hover:text-foreground"
          >
            {icon}
            <span className="truncate">{fileName}</span>
          </a>
        );
      })}
    </div>
  );
}

function getAttachmentIcon(type: string) {
  switch (type) {
    case "video":
    case "reel":
    case "ig_reel":
      return <Video className="h-4 w-4 text-blue-500" />;
    case "audio":
      return <Music className="h-4 w-4 text-purple-500" />;
    case "file":
      return <File className="h-4 w-4 text-orange-500" />;
    case "share":
    case "story_mention":
      return <Share2 className="h-4 w-4 text-green-500" />;
    default:
      return <Paperclip className="h-4 w-4 text-muted-foreground" />;
  }
}

function getFileNameFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const parts = pathname.split("/");
    const lastPart = parts[parts.length - 1];
    if (lastPart) {
      return decodeURIComponent(lastPart);
    }
    return null;
  } catch {
    return null;
  }
}
