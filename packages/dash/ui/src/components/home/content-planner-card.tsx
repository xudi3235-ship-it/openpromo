import { Skeleton } from "@openpromo/ui/components/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@openpromo/ui/components/tabs";
import { Link } from "@tanstack/react-router";
import type { MergedContentEntity } from "@worker/shared/content-types";
import { format } from "date-fns";
import { Calendar, FileImage, MoveRight } from "lucide-react";
import { useState } from "react";
import { MomentumCard } from "@/components/momentum/MomentumCard";
import { matchEntity } from "@/lib/hono-client";

type ContentPlannerCardProps = {
  workspaceSlug: string;
  recentContent: MergedContentEntity[];
  scheduledContent: MergedContentEntity[];
  isLoading: boolean;
};

export function ContentPlannerCard({
  workspaceSlug,
  recentContent,
  scheduledContent,
  isLoading,
}: ContentPlannerCardProps) {
  const [activeTab, setActiveTab] = useState("recent");

  if (isLoading) {
    return (
      <MomentumCard className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </MomentumCard>
    );
  }

  return (
    <MomentumCard className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Content Planner</h3>
            <p className="text-xs text-muted-foreground">
              Recent posts and scheduled content
            </p>
          </div>
        </div>
        <Link
          to="/workspaces/$workspaceSlug/content"
          params={{ workspaceSlug }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
          <MoveRight className="h-3 w-3" />
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-8">
          <TabsTrigger value="recent" className="text-xs">
            Posts & Reels
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="text-xs">
            Scheduled
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="mt-4">
          {recentContent.length === 0 ? (
            <EmptyState
              message="No recent posts yet"
              linkTo={`/workspaces/${workspaceSlug}/composer`}
              linkText="Create your first post"
            />
          ) : (
            <ContentGrid
              items={recentContent}
              workspaceSlug={workspaceSlug}
              showScheduledTime={false}
            />
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="mt-4">
          {scheduledContent.length === 0 ? (
            <EmptyState
              message="Nothing scheduled"
              linkTo={`/workspaces/${workspaceSlug}/calendar`}
              linkText="Plan your content"
            />
          ) : (
            <ContentGrid
              items={scheduledContent}
              workspaceSlug={workspaceSlug}
              showScheduledTime
            />
          )}
        </TabsContent>
      </Tabs>
    </MomentumCard>
  );
}

type ContentGridProps = {
  items: MergedContentEntity[];
  workspaceSlug: string;
  showScheduledTime: boolean;
};

function ContentGrid({
  items,
  workspaceSlug,
  showScheduledTime: _showScheduledTime,
}: ContentGridProps) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
      {items.slice(0, 8).map((item) => (
        <ContentThumbnail
          key={getItemKey(item)}
          item={item}
          workspaceSlug={workspaceSlug}
        />
      ))}
    </div>
  );
}

function getItemKey(item: MergedContentEntity): string {
  return matchEntity(item, {
    group: ({ entity }) => `group-${entity.id}`,
    content: ({ entity }) => `content-${entity.id}`,
  });
}

type ContentThumbnailProps = {
  item: MergedContentEntity;
  workspaceSlug: string;
};

function ContentThumbnail({ item, workspaceSlug }: ContentThumbnailProps) {
  const { thumbnailUrl, scheduledAt, linkTo } = matchEntity(item, {
    group: ({ entity, contents }) => ({
      thumbnailUrl:
        entity.pendingContentGroupSpec?.baseAttachments?.[0]?.thumbnailUrl ||
        contents?.[0]?.placementSpec?.thumbnailUrl,
      scheduledAt: entity.pendingContentGroupSpec?.baseSchedulingSpec?.publishAt
        ? new Date(entity.pendingContentGroupSpec.baseSchedulingSpec.publishAt)
        : undefined,
      linkTo: `/workspaces/${workspaceSlug}/content?groupId=${entity.id}`,
    }),
    content: ({ entity }) => ({
      thumbnailUrl: entity.placementSpec?.thumbnailUrl,
      scheduledAt: entity.placementSpec?.schedulingSpec?.publishAt
        ? new Date(entity.placementSpec.schedulingSpec.publishAt)
        : undefined,
      linkTo: `/workspaces/${workspaceSlug}/content/${entity.id}`,
    }),
  });

  return (
    <Link
      to={linkTo}
      className="group relative aspect-square rounded-lg bg-muted/40 overflow-hidden border border-border/40 hover:border-border transition-colors"
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          className="h-full w-full object-cover group-hover:scale-105 transition-transform"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <FileImage className="h-4 w-4 text-muted-foreground/40" />
        </div>
      )}
      {scheduledAt && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
          <p className="text-[9px] text-white/90 truncate">
            {format(scheduledAt, "MMM d")}
          </p>
        </div>
      )}
    </Link>
  );
}

type EmptyStateProps = {
  message: string;
  linkTo: string;
  linkText: string;
};

function EmptyState({ message, linkTo, linkText }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 p-6 text-center">
      <p className="text-sm text-muted-foreground mb-2">{message}</p>
      <Link
        to={linkTo}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        {linkText}
        <MoveRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
