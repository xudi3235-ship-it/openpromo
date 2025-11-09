import { cn } from "@openpromo/ui/lib/utils";
import { X } from "lucide-react";

interface Comment {
  id: string;
  accountName: string;
  profilePicUrl?: string | null;
  text: string;
  isOwner?: boolean;
}

interface CommentsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  comments: Comment[];
  size?: "thumbnail" | "compact" | "default" | "large";
  platform: "INSTAGRAM" | "TIKTOK" | "FACEBOOK";
}

export function CommentsOverlay({
  isOpen,
  onClose,
  comments,
  size = "default",
  platform,
}: CommentsOverlayProps) {
  if (!isOpen) return null;

  const isCompact = size === "thumbnail" || size === "compact";
  const textSize = isCompact ? "text-xs" : "text-sm";
  const avatarSize = isCompact ? "w-7 h-7" : "w-8 h-8";

  return (
    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className={cn("text-white font-semibold", textSize)}>Comments</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-white/70 hover:text-white transition-colors"
        >
          <X className={cn(isCompact ? "w-5 h-5" : "w-6 h-6")} />
        </button>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-2.5">
            {/* Avatar */}
            <div className="shrink-0">
              {platform === "INSTAGRAM" ? (
                <div
                  className={cn(
                    "rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 p-[1.5px]",
                    avatarSize,
                  )}
                >
                  {comment.profilePicUrl ? (
                    <img
                      src={comment.profilePicUrl}
                      alt={comment.accountName}
                      className="w-full h-full rounded-full object-cover bg-black"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center">
                      <span
                        className={cn(
                          "font-semibold uppercase text-white",
                          isCompact ? "text-[8px]" : "text-xs",
                        )}
                      >
                        {comment.accountName.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
              ) : platform === "TIKTOK" ? (
                <div className="relative">
                  <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-pink-500/40 via-red-400/30 to-cyan-400/40 blur-sm" />
                  <div
                    className={cn(
                      "relative rounded-full overflow-hidden bg-black/60 backdrop-blur flex items-center justify-center",
                      avatarSize,
                    )}
                  >
                    {comment.profilePicUrl ? (
                      <img
                        src={comment.profilePicUrl}
                        alt={comment.accountName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span
                        className={cn(
                          "font-semibold uppercase text-white",
                          isCompact ? "text-[8px]" : "text-xs",
                        )}
                      >
                        {comment.accountName.charAt(0)}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className={cn(
                    "rounded-full bg-blue-600 flex items-center justify-center",
                    avatarSize,
                  )}
                >
                  {comment.profilePicUrl ? (
                    <img
                      src={comment.profilePicUrl}
                      alt={comment.accountName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span
                      className={cn(
                        "font-semibold uppercase text-white",
                        isCompact ? "text-[8px]" : "text-xs",
                      )}
                    >
                      {comment.accountName.charAt(0)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Comment Content */}
            <div className="flex-1 min-w-0">
              <p className={cn("text-white", textSize)}>
                <span className="font-semibold mr-1.5">
                  {comment.accountName}
                  {comment.isOwner && (
                    <span className="ml-1.5 text-[10px] bg-white/20 px-1.5 py-0.5 rounded">
                      You
                    </span>
                  )}
                </span>
                <span className="text-white/90">{comment.text}</span>
              </p>

              {/* Comment Actions */}
              <div
                className={cn(
                  "flex items-center gap-3 mt-1.5 text-white/60",
                  isCompact ? "text-[10px]" : "text-xs",
                )}
              >
                <span>2h</span>
                <button
                  type="button"
                  className="font-semibold hover:text-white/80"
                >
                  Reply
                </button>
                {!comment.isOwner && (
                  <button
                    type="button"
                    className="font-semibold hover:text-white/80"
                  >
                    Like
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <div className="text-center py-8">
            <p className={cn("text-white/50", textSize)}>No comments yet</p>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-white/10 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add a comment..."
            disabled
            className={cn(
              "flex-1 bg-white/10 text-white placeholder:text-white/40 rounded-full px-4 py-2 outline-none",
              textSize,
            )}
          />
        </div>
      </div>
    </div>
  );
}
