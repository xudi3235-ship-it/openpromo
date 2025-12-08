# Application-Specific UI Primitives

This directory contains reusable, application-specific UI primitives for the OpenPromo dashboard. These components standardize common patterns across features like content, products, calendar, inbox, and insights.

## Component Categories

### 1. State Components

#### ErrorState
Consistent error display with icon, title, message, and retry action.

```tsx
import { ErrorState } from "@/components/common";

<ErrorState
  error={error}
  onRetry={() => refetch()}
/>

// Custom messaging
<ErrorState
  title="Failed to load posts"
  message="We couldn't fetch your content."
  onRetry={handleRetry}
  variant="minimal"
/>
```

### 2. Skeleton Components

#### TableSkeleton
Configurable table loading state with customizable rows, columns, checkbox, and actions.

```tsx
import { TableSkeleton } from "@/components/common";

<TableSkeleton
  rows={10}
  columns={5}
  showCheckbox
  showActions
/>
```

#### GridSkeleton
Flexible grid loading state with customizable columns and aspect ratios.

```tsx
import { GridSkeleton } from "@/components/common";

<GridSkeleton
  items={8}
  columns={4}
  aspectRatio="square"
  showTitle
  showSubtitle
/>
```

#### CardSkeleton
Generic card loading state with optional header, media, content, and footer.

```tsx
import { CardSkeleton } from "@/components/common";

<CardSkeleton
  showHeader
  showMedia
  mediaAspectRatio="video"
  showFooter
  contentLines={3}
/>
```

### 3. Stat Card

Display metrics, statistics, and KPIs with optional icons, descriptions, and trends.

```tsx
import { StatCard, StatCardGroup } from "@/components/common";

<StatCardGroup columns="auto">
  <StatCard
    label="Total Engagement"
    value={1234}
    description="Across all platforms"
  />
  <StatCard
    label="Revenue"
    value={45678}
    prefix="$"
    icon={DollarSign}
    trend={{ value: 12.5, isPositive: true }}
  />
  <StatCard
    label="Conversion Rate"
    value={0.156}
    suffix="%"
    precision={2}
  />
</StatCardGroup>
```

### 4. DataTable Composables

Standardized table components for consistent table UX across features.

#### DataTableHeader
Header with search input and column visibility controls.

```tsx
import { DataTableHeader } from "@/components/common";

<DataTableHeader
  table={table}
  searchValue={search}
  onSearchChange={setSearch}
  searchPlaceholder="Search content..."
  columnIcons={columnIcons}
/>
```

#### DataTableFooter
Footer with pagination controls and row info.

```tsx
import { DataTableFooter } from "@/components/common";

<DataTableFooter
  table={table}
  pagination={paginationInfo}
  showSelection
  pageSizeOptions={[10, 20, 50, 100]}
/>
```

#### BatchActionBar
Selection toolbar with bulk actions.

```tsx
import { BatchActionBar } from "@/components/common";

<BatchActionBar
  selectedCount={5}
  totalCount={20}
  actions={[
    {
      key: 'delete',
      label: 'Delete',
      onClick: handleDelete,
      variant: 'destructive',
      icon: Trash
    },
    {
      key: 'export',
      label: 'Export',
      onClick: handleExport
    }
  ]}
  showSelectAllToggle
  onSelectAll={handleSelectAll}
  onDeselectAll={handleDeselectAll}
/>
```

### 5. Filter Primitives

Consistent filter components with standardized UX patterns.

#### FilterBar
Container for filter components with auto "Clear filters" button.

```tsx
import { FilterBar } from "@/components/common";

<FilterBar hasActiveFilters={hasFilters} onClearFilters={clearFilters}>
  {/* Filter components */}
</FilterBar>
```

#### FilterSelect
Dropdown filter with optional icons.

```tsx
import { FilterSelect } from "@/components/common";

<FilterSelect
  value={status}
  onValueChange={setStatus}
  options={[
    { value: 'published', label: 'Published', icon: <CheckIcon /> },
    { value: 'draft', label: 'Draft', icon: <CircleIcon /> }
  ]}
  placeholder="Status"
/>
```

#### FilterButtonGroup
Toggle button group for filtering.

```tsx
import { FilterButtonGroup } from "@/components/common";

<FilterButtonGroup
  value={platform}
  onValueChange={setPlatform}
  options={[
    { value: 'facebook', label: 'Facebook', icon: <FbIcon /> },
    { value: 'instagram', label: 'Instagram', icon: <IgIcon /> }
  ]}
  allowDeselect
/>
```

#### FilterSearch
Search input with clear button.

```tsx
import { FilterSearch } from "@/components/common";

<FilterSearch
  value={search}
  onValueChange={setSearch}
  placeholder="Search content..."
/>
```

#### FilterDateRange
Date range picker for filtering.

```tsx
import { FilterDateRange } from "@/components/common";

<FilterDateRange
  value={dateRange}
  onValueChange={setDateRange}
  placeholder="Select date range..."
/>
```

## Complete Example: Data Table with Filters

```tsx
import {
  DataTableHeader,
  DataTableFooter,
  BatchActionBar,
  FilterBar,
  FilterSelect,
  FilterDateRange,
  TableSkeleton,
  ErrorState,
} from "@/components/common";

function ContentTable() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState();
  const [dateRange, setDateRange] = useState();

  const { data, isLoading, error, refetch } = useContent({
    search,
    status,
    dateRange,
  });

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  if (isLoading) {
    return <TableSkeleton rows={10} columns={6} />;
  }

  return (
    <div>
      <DataTableHeader
        table={table}
        searchValue={search}
        onSearchChange={setSearch}
      />

      <FilterBar
        hasActiveFilters={!!(status || dateRange)}
        onClearFilters={() => {
          setStatus(undefined);
          setDateRange(undefined);
        }}
      >
        <FilterSelect
          value={status}
          onValueChange={setStatus}
          options={statusOptions}
        />
        <FilterDateRange
          value={dateRange}
          onValueChange={setDateRange}
        />
      </FilterBar>

      <BatchActionBar
        selectedCount={selectedRows.length}
        totalCount={data.length}
        actions={batchActions}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
      />

      <Table>{/* Table content */}</Table>

      <DataTableFooter table={table} />
    </div>
  );
}
```

## Migration Guide

### Before (Custom Implementation)
```tsx
// Each feature had custom error states
<div className="flex flex-col items-center...">
  <AlertCircle />
  <h3>Error loading content</h3>
  <Button onClick={retry}>Retry</Button>
</div>
```

### After (Using Primitives)
```tsx
<ErrorState error={error} onRetry={retry} />
```

## Design Principles

1. **Consistency** - Same UX patterns across all features
2. **Composability** - Primitives can be combined flexibly
3. **Type Safety** - Full TypeScript support with generics
4. **Customization** - Props for common variations, className for edge cases
5. **Accessibility** - Built on UI package primitives (shadcn/radix)

## File Organization

```
common/
├── error-state.tsx          # Error state component
├── stat-card.tsx            # Stat/metrics card
├── skeleton/                # Loading states
│   ├── table-skeleton.tsx
│   ├── grid-skeleton.tsx
│   └── card-skeleton.tsx
├── data-table/              # Table composables
│   ├── data-table-header.tsx
│   ├── data-table-footer.tsx
│   └── batch-action-bar.tsx
├── filters/                 # Filter components
│   ├── filter-bar.tsx
│   ├── filter-select.tsx
│   ├── filter-button-group.tsx
│   ├── filter-search.tsx
│   └── filter-date-range.tsx
└── index.ts                 # Central exports
```

## Next Steps

1. **Migrate existing features** to use these primitives
2. **Document adoption** in feature-specific READMEs
3. **Add Storybook examples** (if/when Storybook is set up)
4. **Gather feedback** and iterate on API design
