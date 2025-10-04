import type { PlacementSpec } from "@shared/content";
import type { ColumnDef, Row } from "@tanstack/react-table";
import type {
  ContentEntity,
  MergedContentEntity,
} from "@worker/routes/api/workspaces/content";
import { Image } from "lucide-react";
import { matchEntity, matchPlacementSpec } from "@/lib/hono-client";
import { getPlatformIcon } from "../utils/platform-icons";
import { ColumnHeaderWithTooltip } from "./column-header-with-tooltip";

function getThumbnailFromPlacement(
  placementSpec: PlacementSpec,
): string | undefined {
  if (placementSpec?.thumbnailUrl) {
    return placementSpec.thumbnailUrl;
  }

  const attachments = placementSpec?.attachments;
  if (attachments && attachments.length > 0) {
    const fst = attachments.find((att) => att.publicUrl);
    if (fst?.publicUrl) {
      return fst.publicUrl;
    }
  }

  return undefined;
}

// Thumbnail component with fallback
function ThumbnailImage({
  src,
  alt = "Content thumbnail",
  className = "rounded-lg object-cover",
}: {
  src?: string;
  alt?: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={`${className} w-[60px] h-[60px] bg-muted flex items-center justify-center`}
      >
        <Image className="w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      width={60}
      height={60}
      src={src}
      alt={alt}
      className={`${className} w-[60px] h-[60px]`}
    />
  );
}

function renderTitle(row: Row<MergedContentEntity>) {
  const data: MergedContentEntity = row.original;

  return matchEntity(data, {
    content: (entity) => {
      const {
        entity: { placementSpec, placement },
      } = entity as ContentEntity;

      const src = getThumbnailFromPlacement(placementSpec as PlacementSpec);
      const platformIcon = getPlatformIcon(placement);

      const message = matchPlacementSpec(placementSpec as PlacementSpec, {
        FBFeed: (s) => s.postSpec.message,
        IGFeed: (s) => s.caption,
        TTFeed: (s) => s.caption,
      });

      return (
        <div className="flex items-center space-x-3">
          <div className="relative inline-block">
            <ThumbnailImage src={src} />
            {platformIcon && (
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm border">
                {platformIcon}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {message}
            </p>
          </div>
        </div>
      );
    },
    group: (entity) => {
      const { contents } = entity;

      // Get unique platforms from the contents
      const platforms = [
        ...new Set(contents.map((content) => content.placement)),
      ];

      // Get the primary message (use first content's message as representative)
      const primaryMessage =
        contents.length > 0
          ? matchPlacementSpec(contents[0].placementSpec as PlacementSpec, {
              FBFeed: (s) => s.postSpec.message,
              IGFeed: (s) => s.caption,
              TTFeed: (s) => s.caption,
            })
          : "Untitled Group";
      // Get first thumbnail or default
      const contentWithThumbnail = contents.find((c) =>
        getThumbnailFromPlacement(c.placementSpec as PlacementSpec),
      );
      const thumbnailUrl = contentWithThumbnail
        ? getThumbnailFromPlacement(
            contentWithThumbnail.placementSpec as PlacementSpec,
          )
        : undefined;

      return (
        <div className="flex items-center space-x-3">
          <div className="relative inline-block">
            <ThumbnailImage src={thumbnailUrl} />
            {/* Platform stack indicator */}
            <div className="absolute -bottom-1 -right-1 flex">
              {platforms.slice(0, 3).map((platform, index) => {
                const platformIcon = getPlatformIcon(platform);
                return platformIcon ? (
                  <div
                    key={platform}
                    className="bg-white rounded-full p-1 shadow-sm border -ml-1 first:ml-0"
                    style={{ zIndex: platforms.length - index }}
                  >
                    {platformIcon}
                  </div>
                ) : null;
              })}
              {platforms.length > 3 && (
                <div className="bg-gray-100 dark:bg-gray-600 rounded-full p-1 shadow-sm border -ml-1 flex items-center justify-center min-w-6 h-6">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    +{platforms.length - 3}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {primaryMessage}
              </p>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Group
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {contents.length} placement{contents.length !== 1 ? "s" : ""} •{" "}
              {platforms.length} platform{platforms.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      );
    },
  });
}

export const titleColumn: ColumnDef<MergedContentEntity> = {
  accessorKey: "Title",
  header: () => (
    <ColumnHeaderWithTooltip
      tooltip="Content preview with thumbnail and platform indicator"
      className="cursor-help"
    >
      Title
    </ColumnHeaderWithTooltip>
  ),
  cell: ({ row }) => {
    return renderTitle(row);
  },
};
