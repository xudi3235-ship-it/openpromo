import { Input } from "@openpromo/ui/components/input";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { Search } from "lucide-react";
import * as React from "react";
import { useDebounceCallback } from "usehooks-ts";
import { useStylesListQuery } from "@/queries/styles";
import { StyleCard } from "./style-card";

export function StylesPage() {
  const [searchValue, setSearchValue] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState<string>();

  const updateSearch = useDebounceCallback((value: string) => {
    setDebouncedSearch(value.trim() || undefined);
  }, 400);

  React.useEffect(() => {
    updateSearch(searchValue);
    return () => updateSearch.cancel();
  }, [searchValue, updateSearch]);

  const { data, isLoading, error } = useStylesListQuery({
    search: debouncedSearch,
  });
  const styles = data?.styles ?? [];

  const hasSearch = Boolean(debouncedSearch);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Failed to load styles.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Styles</h1>
          <p className="text-sm text-muted-foreground">
            Browse reusable visual styles for generated product imagery.
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search styles..."
          value={searchValue}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            setSearchValue(event.target.value)
          }
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <StylesLoadingState />
      ) : styles.length === 0 ? (
        <StylesEmptyState hasFilters={hasSearch} />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {styles.map((style) => (
            <StyleCard key={style.id} style={style} />
          ))}
        </div>
      )}
    </div>
  );
}

interface StylesEmptyStateProps {
  hasFilters: boolean;
}

function StylesEmptyState({ hasFilters }: StylesEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/10 p-10 text-center">
      <div className="text-5xl mb-4">🖌️</div>
      <h2 className="text-lg font-semibold">
        {hasFilters ? "No styles match your search" : "No styles yet"}
      </h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {hasFilters
          ? "Try a different search term or clear your filters."
          : "Once styles are created they will appear here. In the meantime, explore available presets in the feed below."}
      </p>
    </div>
  );
}

function StylesLoadingState() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: later
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="flex items-start gap-4 rounded-2xl bg-background/60 p-4 shadow-sm ring-1 ring-border/10">
      <Skeleton className="h-28 w-28 rounded-xl" />
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-full rounded-full" />
        <Skeleton className="h-3 w-5/6 rounded-full" />
        <Skeleton className="h-3 w-3/4 rounded-full" />
        <div className="flex gap-2">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <Skeleton className="h-12 w-12 rounded-lg" />
          <Skeleton className="h-12 w-12 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
