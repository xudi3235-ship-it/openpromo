# Design System Primitives Refresh – Typography & Surfaces

**Date:** January 7, 2025  
**Status:** ✅ Completed  
**Owner:** Frontend Platform / DX  
**Related PRs:** _tbd_  

## Summary

We introduced the first wave of reusable design system primitives to tame repeated Tailwind snippets and speed up feature work. Focus was on surfaces, layout scaffolding, list states, toolbars, and typography. The work spanned both `@openpromo/ui` and consuming apps (`dash`, `www`).

## What Shipped

### UI Package (`packages/ui`)
- **`Text` primitive:** single polymorphic typography component with `variant/size/tone/weight/align/transform`. Thin helpers (`H1`, `BodySm`, `FeatureTag`, etc.) now delegate to `Text`. Feature tags support accent colors (`color="blue" | "orange" | "purple" | "green"`).
- **Surfaces & layout:** added `Surface`, `Page`, `Stack`, `Toolbar`, `ListState` components plus resizable helpers used by dash.
- **Cleaned exports:** removed the legacy `Typography` namespace export. Consumers import `Text` (or the light wrappers) directly.

### Dash App
- **Inbox:** refactored conversation layout panels to use `Surface`, `Page`, `Stack`, `ListState`, removing ad-hoc `rounded-xl border` divs.
- **Products & Styles:** product list/detail screens and styles marketplace now use `Page`, `Toolbar`, `Surface` and shared loading/empty states.
- **Composer:** composer columns moved to shared surfaces/stacks; scroll containers corrected (`min-h-0`) to remove stray body scrollbars.
- **Connected Accounts:** swapped typography wrappers for `Text`, ensuring headings/copies consistently use the new variants.

### WWW Marketing Site
- Landing sections (hero, features, FAQ, testimonials), pricing pages, and shared page layout now consume `Text` and align with tone/size tokens.

## Migration Checklist
- [x] Introduce `Text` primitive & wrappers in `@openpromo/ui`
- [x] Add layout primitives (`Surface`, `Stack`, `Page`, `Toolbar`, `ListState`)
- [x] Migrate dash inbox, composer, product, styles, connected accounts screens
- [x] Migrate www marketing sections & shared layout
- [x] Remove `Typography` namespace export
- [ ] Update documentation/examples to reference `Text` (TODO)
- [ ] Encourage adoption in remaining areas (see next steps)

## Dependencies / Notes
- No breaking API changes for consumers until wrappers are removed, but new work should prefer `Text` to avoid importing deprecated helpers.
- `FeatureTag` now controls accent color via `color` prop; other `Text` tone variants map to semantic palette.
- Surfaces default to flat design (aligns with design principles) but accept tone/interactive variants for future use.

## Next Steps
1. **Docs & tooling**
   - Update or create docs under `docs/design-principles.md` or a dedicated “UI primitives” page explaining `Text`, `Surface`, `Toolbar`, etc.
   - Provide Storybook / examples (if we revive Storybook) or add MDX snippets in docs.

2. **Adoption**
   - Migrate remaining dash/www typography usages (e.g., legacy pages, docs) to `Text`.
   - Replace bespoke cards/panels with `Surface` in composer sub-sections, analytics, etc.
   - Adopt `Toolbar` and `ListState` across other list/table screens (content, inbox v2).

3. **Cleanup**
   - Mark old typography wrappers as deprecated (console warning) until removed.
   - Add lint rule or codemod to prevent reintroduction of `Typography.*`.
   - Evaluate need for additional primitives (e.g., `FormSection`, `PageHeader` variants).

4. **Design alignment**
   - Sync with design to lock typography scale and palette names.
   - Confirm accent color tokens (`text-sky-600`, etc.) align with brand guidelines and define via CSS variables if needed.

## Open Questions
- Do we need a formal tokens file (JSON/Tailwind plugin) to mirror the typography scale?
- Should `FeatureTag` move under a dedicated badge/tag component now that we have more surfaces?
- Do we need a `Text` storybook playground to help teams choose combinations?
- How do we want to communicate deprecation timeline for legacy wrappers to the broader team?

## Links
- _Follow-up PRs / issues to be added after filing_
