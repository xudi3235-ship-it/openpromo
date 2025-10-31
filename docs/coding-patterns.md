# Coding Patterns & Best Practices

This document outlines common coding patterns and best practices used throughout the OpenPromo codebase.

## TanStack Router Hooks

### Use Route-Specific Hooks for Navigation and Search Params

When working with TanStack Router, **always use route-specific hooks** instead of generic router hooks for type safety and better navigation handling.

❌ **Don't do this:**
```typescript
import { useRouter } from "@tanstack/react-router";

export function useMyFilters() {
  const router = useRouter();
  const searchParams = router.latestLocation.search;
  
  const updateFilters = (updates) => {
    router.navigate({
      to: ".",
      search: { ...searchParams, ...updates },
      replace: true,
    });
  };
}
```

✅ **Do this:**
```typescript
import { Route as MyRoute } from "@/routes/_authenticated/my-route/index";

export function useMyFilters() {
  const navigate = MyRoute.useNavigate();
  const searchParams = MyRoute.useSearch();
  
  const updateFilters = (updates) => {
    navigate({
      search: { ...searchParams, ...updates },
      replace: true,
    });
  };
}
```

**Benefits:**
- Full TypeScript type safety for search params
- Automatic type inference from route validation schema
- No need to specify `to` when navigating within same route
- Compile-time errors if route structure changes

**Example from codebase:**
- `packages/dash/ui/src/components/workspace-switcher.tsx` - Uses `WorkspacesRoute.useNavigate()`
- `packages/dash/ui/src/components/products/use-product-filters.ts` - Uses `ProductsRoute.useNavigate()` and `ProductsRoute.useSearch()`

## Shared Schemas Pattern

### Define Validation Schemas in `@shared/` Package

For any data that crosses frontend/backend boundaries, define Zod schemas in the `packages/shared` package to ensure consistency.

**Structure:**
```
packages/
  shared/
    src/
      product/
        index.ts       # Product-related schemas
      content/
        index.ts       # Content-related schemas
```

**Pattern:**

```typescript
// packages/shared/src/product/index.ts
import * as z from "zod";

/**
 * URL search params schema (frontend only)
 * Used for route validation in TanStack Router
 */
export const ProductListFiltersSchema = z.object({
  view: z.enum(["grid", "table"]).optional(),
  category: z.string().optional(),
  state: ProductStateZod.optional(),
});

export type ProductListFilters = z.infer<typeof ProductListFiltersSchema>;

/**
 * API query schema (backend/API)
 * Extends or differs from filters to include API-specific fields
 */
export const ProductListQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  state: ProductStateZod.optional(),
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().max(100).default(20),
  source: ProductSourceZod.optional(),
});

export type ProductListQuery = z.infer<typeof ProductListQuerySchema>;
```

**Usage:**

Frontend route validation:
```typescript
// packages/dash/ui/src/routes/.../products/index.tsx
import { ProductListFiltersSchema } from "@shared/product";

export const Route = createFileRoute("/.../products/")({
  validateSearch: (search) => ProductListFiltersSchema.parse(search),
});
```

Backend API validation:
```typescript
// packages/dash/worker/src/routes/.../list-products.ts
import { ProductListQuerySchema } from "@shared/product";

export const listProductsRoute = new Hono().get(
  "/",
  zValidator("query", ProductListQuerySchema),
  async (c) => {
    const queryParams = c.req.valid("query");
    // ...
  }
);
```

**Benefits:**
- Single source of truth for validation
- Prevents schema drift between frontend and backend
- TypeScript types automatically generated and shared
- Changes propagate to both sides automatically

## Search State Management Pattern

### Local State for Search Input, URL Params for Filters

Use **local state with debouncing** for search inputs to avoid triggering navigation loaders, while keeping other filters in URL params for shareability.

**Pattern:**

```typescript
// In your page component
export function MyListPage() {
  const { filters, setCategory, setState } = useMyFilters(); // URL params
  
  // Local state for search (not in URL)
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const updateDebouncedSearch = useDebounceCallback((value: string) => {
    setDebouncedSearch(value.trim());
  }, 400);

  return (
    <div>
      <Input
        placeholder="Search..."
        value={searchValue}
        onChange={(e) => {
          setSearchValue(e.target.value);
          updateDebouncedSearch(e.target.value);
        }}
      />
      
      <MyTableView searchQuery={debouncedSearch} />
    </div>
  );
}

// In your table/grid view component
export function MyTableView({ searchQuery }: { searchQuery: string }) {
  const { data } = useMyListQuery({
    search: searchQuery || undefined,
  });
  
  // ...
}
```

**Benefits:**
- Search input feels instantly responsive (no navigation delay)
- No navigation loader flashing while typing
- Search still triggers API refetch after debounce
- Other filters (category, state) remain in URL for shareability
- Back button works for other filters but not search

**Example from codebase:**
- `packages/dash/ui/src/components/products/ProductListPage.tsx`

## Route Loaders and Prefetching

### Include All Filter Dependencies in Loader

When using route loaders with prefetching, ensure all filter parameters that affect the query are included in `loaderDeps`.

```typescript
export const Route = createFileRoute("/.../products/")({
  validateSearch: (search) => ProductListFiltersSchema.parse(search),
  
  // Include ALL params that affect the query
  loaderDeps: ({ search }) => ({
    category: search.category,
    state: search.state,
    // Note: search is local state, not included here
  }),
  
  loader: async ({ params, context, deps }) => {
    await prefetchProductList(context.queryClient, params.workspaceSlug, {
      category: deps.category,
      state: deps.state,
    });
  },
  
  component: MyListPage,
});
```

**Why this matters:**
- `loaderDeps` determines when the loader re-runs
- If you miss a dependency, cache won't invalidate when that param changes
- Prefetch should receive the same params that affect the actual query

## Summary Checklist

When creating new features with routing and filters:

- [ ] Use route-specific `Route.useNavigate()` and `Route.useSearch()` hooks
- [ ] Define shared Zod schemas in `packages/shared/src/`
- [ ] Use both schemas in frontend route validation and backend API validation
- [ ] Keep search as local state with debouncing (not in URL)
- [ ] Keep other filters in URL params for shareability
- [ ] Include all query-affecting params in route `loaderDeps`
- [ ] Pass all relevant params to prefetch functions



## General patterns
1. when a state mgmt is getting complex, > 5 states, create a zustand store. refer to composer store for example.
