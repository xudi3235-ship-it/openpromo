import { Button } from "@openpromo/ui/components/button";
import { Input } from "@openpromo/ui/components/input";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@openpromo/ui/components/toggle-group";
import { useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Clock3, History, Search, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounceCallback } from "usehooks-ts";
import { StylesInfiniteGrid } from "@/components/styles/styles-infinite-grid";
import { useWorkspaceEvents } from "@/hooks/useWorkspaceWebSocket";
import type { StylesListParams } from "@/queries/styles";
import { invalidateStylesListQueries } from "@/queries/styles";
import { StyleComposer } from "./composer";

type SortOption = "latest" | "oldest" | "most_used";

/**
 * StyleListPage - Displays infinite scroll grid of creative styles
 * Route: /workspaces/:workspaceSlug/styles
 */
export function StyleListPage() {
  const queryClient = useQueryClient();
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>();
  const [officialOnly, setOfficialOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>("latest");

  const updateSearch = useDebounceCallback((value: string) => {
    setDebouncedSearch(value.trim() || undefined);
  }, 400);

  // Listen for style component updates via WebSocket
  useWorkspaceEvents({
    handlers: {
      "style_component.updated": (event) => {
        // Invalidate styles list to refetch with updated style
        invalidateStylesListQueries(queryClient);

        // Show toast notification based on state
        if (event.state === "ready") {
          toast.success("Style is ready!", {
            description: "Your style has been processed and is now available.",
          });
        } else if (event.state === "failed") {
          toast.error("Style processing failed", {
            description: event.failureReason || "Unable to process the style.",
          });
        }
      },
    },
  });

  useEffect(() => {
    updateSearch(searchValue);
    return () => updateSearch.cancel();
  }, [searchValue, updateSearch]);

  const gridParams = useMemo<StylesListParams>(() => {
    const params: StylesListParams = {};
    if (debouncedSearch) {
      params.search = debouncedSearch;
    }
    if (officialOnly) {
      params.officialOnly = "true";
    }
    if (sort !== "latest") {
      params.sort = sort;
    }
    return params;
  }, [debouncedSearch, officialOnly, sort]);

  const handleSortChange = (value: string) => {
    if (value === "") {
      setSort("latest");
      return;
    }

    if (value === sort) {
      return;
    }

    if (value === "latest" || value === "oldest" || value === "most_used") {
      setSort(value);
      return;
    }

    setSort("latest");
  };

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header Section */}
      <div className="space-y-4">
        {/* Title and Actions */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            {/* Main Heading */}
            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight">
                Creative Style Marketplace
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Explore curated visual systems and drop 1-3 reference images
                into the composer dock below to spin up a new style instantly.
              </p>
            </div>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-lg">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, description, or aesthetic..."
              value={searchValue}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setSearchValue(event.target.value)
              }
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup
              type="single"
              value={sort}
              onValueChange={(value) => handleSortChange(value ?? "")}
              className="rounded-md border bg-background"
            >
              <ToggleGroupItem
                value="latest"
                aria-label="Sort by latest"
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium data-[state=on]:bg-primary/10 data-[state=on]:text-primary sm:text-sm"
              >
                <Clock3 className="h-4 w-4" />
                Latest
              </ToggleGroupItem>
              <ToggleGroupItem
                value="oldest"
                aria-label="Sort by oldest"
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium data-[state=on]:bg-primary/10 data-[state=on]:text-primary sm:text-sm"
              >
                <History className="h-4 w-4" />
                Oldest
              </ToggleGroupItem>
              <ToggleGroupItem
                value="most_used"
                aria-label="Sort by most used"
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium data-[state=on]:bg-primary/10 data-[state=on]:text-primary sm:text-sm"
              >
                <TrendingUp className="h-4 w-4" />
                Most used
              </ToggleGroupItem>
            </ToggleGroup>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`gap-2 ${
                officialOnly
                  ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                  : ""
              }`}
              onClick={() => setOfficialOnly((prev) => !prev)}
            >
              <BadgeCheck className="h-4 w-4" />
              Official only
            </Button>
          </div>
        </div>
      </div>

      <StylesInfiniteGrid params={gridParams} />

      {/* Style Composer Modal */}
      <StyleComposer
        onSuccess={() => {
          // Refresh will happen automatically via mutation invalidation
        }}
      />
    </div>
  );
}
