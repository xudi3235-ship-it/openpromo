import { toast } from "sonner";
import type { RunFeedItem } from "@/features/instant-ad/instant-ad-types";

export function RunCardActions({ run }: { run: RunFeedItem }) {
  const firstUrl =
    run.output.output?.videos?.[0]?.videoUrl ||
    run.output.output?.images?.[0]?.imageUrl ||
    run.artifacts?.videos?.[0]?.videoUrl ||
    run.artifacts?.images?.[0]?.imageUrl;

  const copyLink = () => {
    if (!firstUrl) return;
    void navigator.clipboard.writeText(firstUrl);
    toast.success("Link copied");
  };

  return (
    <div className="flex items-center gap-2">
      {firstUrl && (
        <a
          className="text-blue-600 hover:underline"
          href={firstUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open
        </a>
      )}
      {firstUrl && (
        <button
          type="button"
          className="text-blue-600 hover:underline"
          onClick={copyLink}
        >
          Copy link
        </button>
      )}
    </div>
  );
}
