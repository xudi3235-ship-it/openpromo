---
name: ui-design
description: instructions for OpenPromo's design principles when desigining user flows/product surfaces on OpenPromo dashboard or www.
---

# OpenPromo UI Design Principles

Decision-making framework for building UI on OpenPromo dashboard and www.

## Core Principles

1. **Plain, minimal, flat** - no heavy shadows, no clustered cards
2. **Progressive disclosure** - start simple, expand for complexity
3. **Usability over minimalism** - function wins when there's conflict

## Component Selection

### Containers
- **Card**: standalone content blocks, stats, settings sections
- **Dialog**: confirmations, quick forms (< 5 fields), focused tasks
- **Drawer**: side panels, detail views, forms with context needed
- **Sheet**: mobile-first overlays, filters on small screens

### Data Display
- **Table**: structured data, sortable columns, bulk actions needed
- **Grid (DataGrid)**: visual content (images, cards), gallery views
- **List**: simple items, sequential data, timeline-like content

### Forms
- **Inline**: single field edits, toggles, quick settings
- **Modal (Dialog)**: short forms, confirmations, focused input
- **Page/Section**: complex forms, multi-step flows, settings pages

### Feedback
- **Toast (sonner)**: transient success/info messages
- **Alert**: persistent warnings, important info in context
- **ErrorState**: full component failure, with retry option

### icons 
- we have lucide icons and react-icons installed, react-icons is way more complete, so prefer to use them.

## Layout Patterns

### Page Structure
```
Header (fixed, blur on scroll)
  SidebarTrigger | Breadcrumb | Actions
Main
  PageHeader (title + actions)
  Content (max-w-7xl centered)
```

### Spacing Scale
- `gap-1` / `gap-1.5`: tight, related items
- `gap-2` / `gap-3`: form fields, list items
- `gap-4`: section content
- `gap-6`: major sections, page padding

### Responsive
- Mobile-first approach
- Breakpoints: `sm:` (640), `md:` (768), `lg:` (1024), `xl:` (1280)
- Grid columns: 1 -> 2 (sm) -> 3 (lg) -> 4 (xl)

## State Handling

### Loading
- Use skeleton components from `@/components/common`
- Match skeleton shape to expected content
- `TableSkeleton`, `GridSkeleton`, `CardSkeleton`

### Error
- Use `ErrorState` component
- Always provide retry action when possible
- Use `variant="minimal"` for inline contexts

### Empty
- Center in container
- Icon + heading + description
- Primary CTA to resolve (e.g., "Create first item")

## Common Patterns

### Filter Bar
```tsx
<FilterBar hasActiveFilters={hasFilters} onClearFilters={clear}>
  <FilterSelect ... />
  <FilterDateRange ... />
  <FilterSearch ... />
</FilterBar>
```

### Data Table with Selection
```tsx
<DataTableHeader table={table} searchValue={search} onSearchChange={setSearch} />
<BatchActionBar selectedCount={n} actions={[...]} />
<Table>...</Table>
<DataTableFooter table={table} />
```

### Stats Display
```tsx
<StatCardGroup columns="auto">
  <StatCard label="..." value={n} trend={{...}} />
</StatCardGroup>
```

## Avoid

- `shadow-md` or larger (use `shadow-sm` max)
- Nested cards within cards
- Multiple CTAs competing for attention
- Custom components when primitives exist in `@/components/common`
- Inline styles or arbitrary Tailwind values

## Decision Checklist

Before building new UI:
1. Does a primitive exist in `packages/ui` or `dash/ui/components/common`?
2. Does similar UI exist elsewhere in the app? Follow that pattern.
3. Is this the simplest solution that meets the requirement?
4. Would a user understand this without explanation?
