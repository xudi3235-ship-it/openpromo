import { Skeleton } from "@openpromo/ui/components/skeleton";
import { Link } from "@tanstack/react-router";
import type { MergedContentEntity } from "@worker/shared/content-types";
import { formatDistanceToNow } from "date-fns";
import { FileText, MoveRight } from "lucide-react";
import { MomentumCard } from "@/components/momentum/MomentumCard";
import { matchEntity } from "@/lib/hono-client";

type DraftsStripProps = {
  workspaceSlug: string;
  drafts: MergedContentEntity[];
  isLoading: boolean;
};

export function DraftsStrip({
  workspaceSlug,
  drafts,
  isLoading,
}: DraftsStripProps) {
  if (isLoading) {
    return (
      <MomentumCard className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex gap-3 overflow-x-auto">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-32 shrink-0 rounded-xl" />
          ))}
        </div>
      </MomentumCard>
    );
  }

  if (drafts.length === 0) {
    return null;
  }

  return (
    <MomentumCard className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Drafts</h3>
            <p className="text-xs text-muted-foreground">
              Continue where you left off
            </p>
          </div>
        </div>
        <Link
          to="/workspaces/$workspaceSlug/content"
          params={{ workspaceSlug }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          See all
          <MoveRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {drafts.map((draft) => (
          <DraftThumbnail
            key={getDraftKey(draft)}
            draft={draft}
            workspaceSlug={workspaceSlug}
          />
        ))}
      </div>
    </MomentumCard>
  );
}

function getDraftKey(draft: MergedContentEntity): string {
  return matchEntity(draft, {
    group: ({ entity }) => `group-${entity.id}`,
    content: ({ entity }) => `content-${entity.id}`,
  });
}

type DraftThumbnailProps = {
  draft: MergedContentEntity;
  workspaceSlug: string;
};

function DraftThumbnail({ draft, workspaceSlug }: DraftThumbnailProps) {
  const { title, thumbnailUrl, createdAt, linkTo } = matchEntity(draft, {
    group: ({ entity, contents }) => ({
      title:
        entity.pendingContentGroupSpec?.baseMessage?.slice(0, 50) ||
        "Untitled draft",
      thumbnailUrl:
        entity.pendingContentGroupSpec?.baseAttachments?.[0]?.thumbnailUrl ||
        contents?.[0]?.placementSpec?.thumbnailUrl,
      createdAt: entity.createdAt ? new Date(entity.createdAt) : undefined,
      linkTo: `/workspaces/${workspaceSlug}/composer?groupId=${entity.id}`,
    }),
    content: ({ entity }) => {
      // Get caption from placement spec based on placement type
      const caption =
        entity.placementSpec &&
        "caption" in entity.placementSpec &&
        typeof entity.placementSpec.caption === "string"
          ? entity.placementSpec.caption
          : entity.placementSpec &&
              "postSpec" in entity.placementSpec &&
              entity.placementSpec.postSpec?.message
            ? entity.placementSpec.postSpec.message
            : undefined;
      return {
        title: caption?.slice(0, 50) || "Untitled",
        thumbnailUrl: entity.placementSpec?.thumbnailUrl,
        createdAt: entity.createdAt ? new Date(entity.createdAt) : undefined,
        linkTo: `/workspaces/${workspaceSlug}/content/${entity.id}`,
      };
    },
  });

  return (
    <Link
      to={linkTo}
      className="group flex w-32 shrink-0 flex-col rounded-xl border border-border/60 bg-muted/20 overflow-hidden hover:border-border transition-colors"
    >
      <div className="h-20 w-full bg-muted/40 flex items-center justify-center overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <FileText className="h-6 w-6 text-muted-foreground/50" />
        )}
      </div>
      <div className="p-2 space-y-0.5">
        <p className="text-xs font-medium truncate">{title}</p>
        {createdAt && (
          <p className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(createdAt, { addSuffix: true })}
          </p>
        )}
      </div>
    </Link>
  );
}
