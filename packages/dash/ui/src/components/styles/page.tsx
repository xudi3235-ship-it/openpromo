import { Button } from "@openpromo/ui/components/button";
import { Input } from "@openpromo/ui/components/input";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { Plus, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDebounceCallback, useIntersectionObserver } from "usehooks-ts";
import {
  useStyleCreateMutation,
  useStylesInfiniteQuery,
} from "@/queries/styles";
import { useStyleComposerStore } from "@/stores/style-composer-store";
import { StyleComposer } from "./composer";
import { StyleCard } from "./style-card";

export function StylesPage() {
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>();

  const openComposer = useStyleComposerStore((state) => state.openComposer);

  const updateSearch = useDebounceCallback((value: string) => {
    setDebouncedSearch(value.trim() || undefined);
  }, 400);

  const createStyleMutation = useStyleCreateMutation();

  const handleCreateDummyStyles = async () => {
    const timestamp = Date.now();
    const dummyStyles = [
      {
        name: `minimalist-modern-${timestamp}`,
        slug: `minimalist-modern-${timestamp}`,
        description: "Clean lines and simple aesthetics for a modern look",
        imageGenPrompt:
          "minimalist modern aesthetic, clean white background, soft lighting",
        imageRefs: [
          "https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=800&q=80",
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80",
          "https://images.unsplash.com/photo-1595246140625-573b715d11dc?w=800&q=80",
        ],
      },
      {
        name: `vintage-retro-${timestamp}`,
        slug: `vintage-retro-${timestamp}`,
        description: "Nostalgic vibes with warm tones and classic styling",
        imageGenPrompt:
          "vintage retro style, warm sepia tones, classic composition",
        imageRefs: [
          "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
          "https://images.unsplash.com/photo-1452457807411-4979b707c5be?w=800&q=80",
          "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=800&q=80",
          "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&q=80",
        ],
      },
      {
        name: `bold-vibrant-${timestamp}`,
        slug: `bold-vibrant-${timestamp}`,
        description: "Eye-catching colors and dynamic compositions",
        imageGenPrompt: "bold vibrant colors, dynamic energy, high contrast",
        imageRefs: [
          "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800&q=80",
          "https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=800&q=80",
          "https://images.unsplash.com/photo-1525562723836-dca67a71d5f1?w=800&q=80",
          "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&q=80",
          "https://images.unsplash.com/photo-1506443432602-ac2fcd6f54e0?w=800&q=80",
        ],
      },
      {
        name: `natural-organic-${timestamp}`,
        slug: `natural-organic-${timestamp}`,
        description: "Earthy tones with natural textures and materials",
        imageGenPrompt:
          "natural organic materials, earthy tones, soft natural lighting",
        imageRefs: [
          "https://images.unsplash.com/photo-1511688878353-3a2f5be94cd7?w=800&q=80",
          "https://images.unsplash.com/photo-1574169208507-84376144848b?w=800&q=80",
          "https://images.unsplash.com/photo-1600420254571-16e0ae37e68a?w=800&q=80",
        ],
      },
      {
        name: `luxe-elegant-${timestamp}`,
        slug: `luxe-elegant-${timestamp}`,
        description: "Premium feel with sophisticated styling",
        imageGenPrompt:
          "luxury elegant aesthetic, premium materials, sophisticated lighting",
        imageRefs: [
          "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80",
          "https://images.unsplash.com/photo-1528991435120-e73e05a58897?w=800&q=80",
        ],
      },
    ];

    for (const style of dummyStyles) {
      await createStyleMutation.mutateAsync(style);
    }
  };

  useEffect(() => {
    updateSearch(searchValue);
    return () => updateSearch.cancel();
  }, [searchValue, updateSearch]);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useStylesInfiniteQuery({
    search: debouncedSearch,
  });

  const styles = useMemo(
    () => data?.pages.flatMap((page) => page.styles) ?? [],
    [data],
  );

  const hasSearch = Boolean(debouncedSearch);

  // Infinite scroll observer using usehooks-ts
  const { isIntersecting, ref: observerRef } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: "100px",
  });

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

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
                Professionally curated visual styles designed to elevate your
                product ads and maximize performance.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCreateDummyStyles}
              disabled={createStyleMutation.isPending}
              className="hidden lg:flex"
            >
              {createStyleMutation.isPending ? "Creating..." : "Add Dummy Data"}
            </Button>
            <Button onClick={openComposer} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Style
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-lg">
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
      </div>

      {isLoading ? (
        <StylesLoadingState />
      ) : styles.length === 0 ? (
        <StylesEmptyState hasFilters={hasSearch} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {styles.map((style) => (
              <StyleCard key={style.id} style={style} />
            ))}
          </div>

          {/* Infinite scroll trigger */}
          <div ref={observerRef} className="h-4" />

          {/* Loading indicator for next page */}
          {isFetchingNextPage && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: loading skeleton
                <CardSkeleton key={index} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Style Composer Modal */}
      <StyleComposer
        onSuccess={() => {
          // Refresh will happen automatically via mutation invalidation
        }}
      />
    </div>
  );
}

interface StylesEmptyStateProps {
  hasFilters: boolean;
}

function StylesEmptyState({ hasFilters }: StylesEmptyStateProps) {
  const openComposer = useStyleComposerStore((state) => state.openComposer);

  if (hasFilters) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-16 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Search className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">No matching styles found</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Try adjusting your search terms or explore our full collection of
          creative styles.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-16 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10">
        <Sparkles className="h-9 w-9 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-bold">
        Start Building Your Style Collection
      </h2>
      <p className="mt-3 max-w-lg text-base text-muted-foreground leading-relaxed">
        Create your first visual style to transform product imagery. Each style
        can be reused across campaigns to maintain brand consistency.
      </p>
      <Button onClick={openComposer} size="lg" className="mt-8 gap-2">
        <Plus className="h-4 w-4" />
        Create Your First Style
      </Button>
    </div>
  );
}

function StylesLoadingState() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: later
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="group relative aspect-[3/4] overflow-hidden rounded-lg">
      <Skeleton className="h-full w-full" />
    </div>
  );
}
