# UI Primitives Migration
Task: Migrate dash features to use new application-specific UI primitives
Priority: P2 (not blocking MVP launch)
Status: Primitives scaffolded, ready for adoption
Started: 2025-12-08

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
- [ ] Replace `content/content-error-state.tsx` with `ErrorState`
- [ ] Replace `content/content-table-skeleton.tsx` with `TableSkeleton`
- [ ] Migrate `content/content-filters.tsx` to use Filter primitives
- [ ] Migrate `content/content-page-header.tsx` to use `DataTableHeader`
- [ ] Migrate `content/content-page-footer.tsx` to use `DataTableFooter`

### Products Feature
- [ ] Replace `products/products-loading-state.tsx` with `GridSkeleton`
- [ ] Note: Already using GridCard system - good reference for others

### Insights Feature
- [ ] Replace `insights/InsightsSummaryCards.tsx` inline stats with `StatCard`
- [ ] Refactor dashboard stats to use `StatCardGroup`

### Inbox Feature
- [ ] Replace `inbox/inbox-empty-state.tsx` with `ErrorState` or shared Empty component
- [ ] Migrate `inbox/inbox-filters.tsx` to use `FilterBar` + `FilterButtonGroup`

### Calendar Feature
- [ ] Replace `calendar/calendar-skeleton.tsx` with `CardSkeleton`
- [ ] Consider migrating `calendar-event-card.tsx` to use GridCard composables

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
