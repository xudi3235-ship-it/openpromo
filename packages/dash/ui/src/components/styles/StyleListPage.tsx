import { Button } from "@openpromo/ui/components/button";
import { Input } from "@openpromo/ui/components/input";
import { Page, PageContent, PageHeader } from "@openpromo/ui/components/page";
import { Stack } from "@openpromo/ui/components/stack";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@openpromo/ui/components/toggle-group";
import { cn } from "@openpromo/ui/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Clock3, History, Search, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounceCallback } from "usehooks-ts";
import { StylesInfiniteGrid } from "@/components/styles/styles-infinite-grid";
import { useWorkspaceEvents } from "@/hooks/useWorkspaceWebSocket";
import type { StylesListParams } from "@/queries/styles-queries";
import { invalidateStylesListQueries } from "@/queries/styles-queries";
import { BulkStyleComposer } from "./bulk-style-composer";
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
      params.officialOnly = true;
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
    <Page gap="lg" className="h-full">
      <PageHeader align="start" className="flex-col gap-3 text-left">
        <Stack gap="xs">
          <h1 className="text-xl font-bold tracking-tight">Style References</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Browse and use style references to create stunning product visuals
            for your posts
          </p>
        </Stack>
      </PageHeader>

      <div className="flex items-center justify-start gap-3 flex-nowrap overflow-x-auto">
        <div className="relative w-64 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search styles by name or description..."
            value={searchValue}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setSearchValue(event.target.value)
            }
            className="pl-9"
          />
        </div>

        <ToggleGroup
          type="single"
          value={sort}
          onValueChange={(value) => handleSortChange(value ?? "")}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="latest" aria-label="Sort by latest">
            <Clock3 className="h-4 w-4" />
            Latest
          </ToggleGroupItem>
          <ToggleGroupItem value="oldest" aria-label="Sort by oldest">
            <History className="h-4 w-4" />
            Oldest
          </ToggleGroupItem>
          <ToggleGroupItem value="most_used" aria-label="Sort by most used">
            <TrendingUp className="h-4 w-4" />
            Most used
          </ToggleGroupItem>
        </ToggleGroup>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 whitespace-nowrap",
            officialOnly &&
              "border-emerald-500/60 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20",
          )}
          onClick={() => setOfficialOnly((prev) => !prev)}
        >
          <BadgeCheck className="h-4 w-4" />
          Official only
        </Button>

        <BulkStyleComposer
          onSuccess={() => {
            invalidateStylesListQueries(queryClient);
          }}
        />
      </div>

      <PageContent>
        <StylesInfiniteGrid params={gridParams} />
      </PageContent>

      <StyleComposer
        onSuccess={() => {
          // Refresh via websocket + invalidation
        }}
      />
    </Page>
  );
}
