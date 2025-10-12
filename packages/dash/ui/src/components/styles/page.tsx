import { Button } from "@openpromo/ui/components/button";
import { Input } from "@openpromo/ui/components/input";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@openpromo/ui/components/toggle-group";
import {
  BadgeCheck,
  Clock3,
  History,
  Plus,
  Search,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDebounceCallback } from "usehooks-ts";
import { StylesInfiniteGrid } from "@/components/styles/styles-infinite-grid";
import type { StylesListParams } from "@/queries/styles";
import { useStyleCreateMutation } from "@/queries/styles";
import { useStyleComposerStore } from "@/stores/style-composer-store";
import { StyleComposer } from "./composer";

type SortOption = "latest" | "oldest" | "most_used";

export function StylesPage() {
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>();
  const [officialOnly, setOfficialOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>("latest");

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
