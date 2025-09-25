import { Bookmark, Heart, MessageCircle, Music2, Share2 } from "lucide-react";
import { useMemo } from "react";
import { useAttachmentRenderer } from "@/hooks/useAttachmentRenderer";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useComposerPreview } from "@/stores/composer-preview-store";

const handleFromName = (name?: string) =>
  name ? name.toLowerCase().replace(/[^a-z0-9]+/g, "_") : "openpromo";

export function TikTokPreview() {
  const { workspace } = useWorkspace();
  const previewData = useComposerPreview({ platform: "TIKTOK" });
  const attachments = previewData.attachments;
  const { renderAttachment } = useAttachmentRenderer({ attachments });

  const handle = useMemo(() => {
    if (previewData.username) {
      return previewData.username;
    }
    const display = previewData.getDisplayName(workspace?.name);
    return handleFromName(display);
  }, [previewData, workspace?.name]);

  const displayName = previewData.getDisplayName(workspace?.name);
  const caption = previewData.message;
  const media = attachments[0];

  return (
    <div className="relative w-[280px] rounded-xl overflow-hidden border border-white/5 bg-[#070708] text-white shadow-[0_20px_45px_-20px_rgba(8,8,11,0.85)]">
      <div className="relative aspect-[9/16]">
        <div className="absolute inset-0">
          {media ? (
            renderAttachment(media, "w-full h-full object-cover", true)
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-[#0f172a] via-[#0b1020] to-[#04050b] text-white/70">
              <div className="w-16 h-16 rounded-xl border border-white/10 bg-white/5 backdrop-blur flex items-center justify-center">
                <Music2 className="w-7 h-7" />
              </div>
              <p className="px-8 text-center text-sm leading-relaxed">
                Drop a video to preview your TikTok.
              </p>
            </div>
          )}
        </div>

        <div className="absolute right-2 bottom-20 z-10 flex flex-col items-center gap-4 text-white/85">
          {[
            { icon: Heart, label: "1.2K" },
            { icon: MessageCircle, label: "245" },
            { icon: Share2, label: "Share" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <div className="w-9 h-9 rounded-full border border-white/10 bg-black/45 backdrop-blur flex items-center justify-center">
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </div>
          ))}
          <div className="w-9 h-9 rounded-full border border-white/10 bg-black/45 backdrop-blur flex items-center justify-center">
            <Music2 className="w-4 h-4" />
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-6 pt-12 bg-gradient-to-t from-black via-black/70 to-transparent">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-pink-500/60 via-red-400/50 to-cyan-400/60 blur" />
              <div className="relative w-9 h-9 rounded-full overflow-hidden bg-black/60 backdrop-blur flex items-center justify-center uppercase font-semibold text-sm">
                {previewData.profilePicUrl ? (
                  <img
                    src={previewData.profilePicUrl}
                    alt={displayName || handle}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{displayName?.charAt(0) || "O"}</span>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold">
                @{handle}
                <button
                  type="button"
                  className="ml-1 rounded-full border border-white/15 bg-white text-black text-[10px] font-semibold px-2.5 py-0.5"
                >
                  Follow
                </button>
              </div>
              <div className="text-xs text-white/70 truncate">
                {displayName}
              </div>
            </div>
          </div>

          <p className="mt-3 text-sm text-white/90 leading-relaxed line-clamp-3 break-words">
            {caption || "Add a caption to preview your TikTok copy."}
          </p>
        </div>

        <div className="pointer-events-none absolute inset-0 ring-1 ring-white/5 rounded-xl" />
      </div>

      <div className="px-4 py-3 flex items-center justify-between bg-[#09070b] border-t border-white/5 text-[11px] text-white/70">
        <div className="flex items-center gap-2 truncate">
          <Music2 className="w-4 h-4" />
          <span className="truncate max-w-[160px]">
            Original sound • {displayName}
          </span>
        </div>
        <Bookmark className="w-4 h-4" />
      </div>
    </div>
  );
}
