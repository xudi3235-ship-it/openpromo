# Dash Content Detail View

## Metadata
- area: dash
- feature: content detail view for published posts
- status: pending design alignment
- owner: @ruizeli
- references: docs/mvp_progress.md [p0], current table requires nightly metrics refresh

## Task description
Capture full information for a published post when a user clicks it in the content table. The view should surface the post thumbnail, platform, status/placement details, and metric snapshot so teams can inspect performance without leaving Dash.

## Milestones
1. Align on data/UX for the detail view.
2. Add orpc/loader for fetching content detail.
3. Introduce client-side route/layout (modal/drawer/route) to render the view.
4. Ensure metrics section references the nightly refresh timestamp and highlights impressions/reach/engagement/etc.
5. Add instrumentation/analytics if needed.

## Notes
- Need to confirm whether the detail view should be a dedicated route (e.g., `/content/:contentId`) or a drawer/modal overlay.
- Need to decide which metrics beyond the table columns (impressions/reach/likes/comments/shares) should be shown, and whether attachments/first comment data appear there.
- Need to show when metrics last refreshed to validate nightly job.

## Design sketch (ASCII)
```
+---------------------------------------------------------------+
| Content Detail                                                 |
+---------------------------------------------------------------+
| [Thumbnail]   Title / placement / status + platform badges     |
|               Published time • Source link                     |
+---------------------------------------------------------------+
| Metrics snapshot (impressions / reach / likes / comments)      |
| Metrics updated: 12h ago (from nightly refresh)               |
+---------------------------------------------------------------+
| Tabbed panel: Description | Attachments (assets) | Comments     |
| - Attachment list with preview / link to post                 |
+---------------------------------------------------------------+
| Actions: View source | Reschedule | Duplicate | Delete (if draft) |
+---------------------------------------------------------------+
```
