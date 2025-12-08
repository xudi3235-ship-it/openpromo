# UI Primitives Migration
Task: Migrate dash features to use new application-specific UI primitives
Priority: P2 (not blocking MVP launch)
Status: Completed
Started: 2025-12-08
Completed: 2025-12-08

## Overview

New application-specific UI primitives scaffolded in `packages/dash/ui/src/components/common/` to reduce duplication across features. Audit found 30-40% duplication across 282 component files.

## Primitives Created

1. ErrorState - consistent error display with retry action
2. Skeleton components (TableSkeleton, GridSkeleton, CardSkeleton)
3. StatCard - metrics/KPI display with icons, trends, formatting
4. DataTable composables (Header, Footer, BatchActionBar)
5. Filter primitives (Bar, Select, ButtonGroup, Search, DateRange)

## Location

- Primitives: `packages/dash/ui/src/components/common/`
- Documentation: `packages/dash/ui/src/components/common/README.md`
- Exports: `packages/dash/ui/src/components/common/index.ts`

## Migration Checklist

### Content Feature
- [x] Replace `content/content-error-state.tsx` with `ErrorState`
- [x] Replace `content/content-table-skeleton.tsx` with `TableSkeleton`
- [x] Migrate `content/content-filters.tsx` to use Filter primitives
- [x] Migrate `content/content-page-header.tsx` to use `DataTableHeader`
- [x] Migrate `content/content-page-footer.tsx` to use `DataTableFooter`

### Products Feature
- [x] Replace `products/products-loading-state.tsx` with `GridSkeleton`
- [x] Note: Already using GridCard system - good reference for others

### Insights Feature
- [x] Replace `insights/InsightsSummaryCards.tsx` inline stats with `StatCard`
- [x] Refactor dashboard stats to use `StatCardGroup`

### Inbox Feature
- [x] Replace `inbox/inbox-empty-state.tsx` with `ErrorState` or shared Empty component
  - Evaluated: Component is specialized empty state, kept as-is
- [x] Migrate `inbox/inbox-filters.tsx` to use `FilterBar` + `FilterButtonGroup`
  - Evaluated: Component uses button-based filters with tooltips, kept as specialized

### Calendar Feature
- [x] Replace `calendar/calendar-skeleton.tsx` with `CardSkeleton`
  - Evaluated: Component has specialized month/week calendar grid layout, kept as-is
- [x] Consider migrating `calendar-event-card.tsx` to use GridCard composables
  - Evaluated: Component is specialized for calendar events, kept as-is

## Migration Strategy

1. Migration can happen incrementally as features are touched
2. Start with one feature (e.g., content) as reference implementation
3. Update feature documentation to note use of new primitives
4. Remove old custom components after migration

## Success Metrics

- Reduce total component count in dash/ui/src/components
- Consistent UX patterns across all features
- Easier onboarding for new features using established primitives

## Notes

- Not blocking MVP launch
- Priority after core P0 features are stable
- Each migration should be a separate commit for easy review

## Change Log

[2025-12-08] Initial primitives scaffolded, task created
[2025-12-08] Migration completed:
- Successfully migrated Content feature to use ErrorState, TableSkeleton, Filter primitives, DataTableHeader/Footer
- Successfully migrated Products feature to use GridSkeleton
- Successfully migrated Insights feature to use StatCard/StatCardGroup
- Evaluated Inbox feature - specialized components kept as-is
- Evaluated Calendar feature - specialized components kept as-is
- Removed old components: content-error-state.tsx, content-table-skeleton.tsx, products-loading-state.tsx
- All type checks passing
