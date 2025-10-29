# Inbox Revamp Plan

## Overview
Comprehensive redesign of the inbox interface to improve usability, add quick actions, and enable better state management through URL-driven architecture.

## Key Requirements
1. **Quick Reply**: Enable quick replies from list view without opening detail view
2. **Context Panel**: Add right panel for DM metadata (labels, assignee) and comment post previews
3. **URL State**: Move filters and selection state to URL params for shareability and loader optimization

## Architecture

### Route Structure
```
/_authenticated/workspaces/$workspaceSlug/inbox
```

**Search Parameters:**
- `channel`: 'all' | 'dm' | 'post_comment' (default: 'all')
- `platform`: 'all' | 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK' (default: 'all')
- `conversationId`: string | undefined (selected conversation)
- `highlightMessageId`: string | undefined (for deep linking to specific messages)
- `q`: string | undefined (search query)
- `assignee`: string | undefined (future: filter by assignee)
- `label`: string | undefined (future: filter by label)

### Layout Structure
```
┌─────────────────────────────────────────────────────────────────────┐
│  Filters: [All] [DMs] [Comments]  [FB] [IG] [TT]  [Search...]      │
├──────────────┬───────────────────────────────┬──────────────────────┤
│              │                               │                      │
│  List View   │   Message Thread              │   Right Panel        │
│  280-320px   │      flex-1                   │   320-360px          │
│              │                               │                      │
│  • Conv 1    │  • Thread Header              │  DM Context:         │
│  • Conv 2    │  • Messages                   │  - Contact Info      │
│  • Conv 3    │  • Reply Input                │  - Labels            │
│              │                               │  - Assignee          │
│              │                               │  - Notes             │
│              │                               │                      │
│              │                               │  Comment Context:    │
│              │                               │  - Post Preview      │
│              │                               │  - Engagement        │
│              │                               │  - Actions           │
└──────────────┴───────────────────────────────┴──────────────────────┘
```

## Component Architecture

```
inbox/
├── index.tsx                           # Main container with URL state
├── inbox-filters.tsx                   # Top filter bar (channel, platform, search)
├── inbox-list/
│   ├── inbox-list.tsx                  # List container with virtualization
│   ├── inbox-list-item.tsx             # Individual conversation card
│   ├── inbox-quick-reply.tsx           # Quick reply UI (inline/popover)
│   └── inbox-list-actions.tsx          # Action buttons (reply, archive, etc)
├── inbox-thread/
│   ├── inbox-thread.tsx                # Message thread container
│   ├── inbox-thread-header.tsx         # Header with context actions
│   ├── inbox-message-list.tsx          # Messages display with virtualization
│   └── inbox-message-input.tsx         # Reply input (existing)
└── inbox-context-panel/
    ├── inbox-context-panel.tsx         # Container that switches based on channel
    ├── inbox-dm-context.tsx            # DM-specific: labels, assignee, notes
    └── inbox-comment-context.tsx       # Comment-specific: post preview
```

## Implementation Phases

### Phase 1: Route & State Migration ✅ COMPLETED
**Timeline:** Week 1
**Goal:** Move from Zustand state to URL-driven state

**Completed Tasks:**
1. ✅ Add search params validation to route (channel, platform, conversationId, highlightMessageId, q)
2. ✅ Update loader to use search params with loaderDeps
3. ✅ Modify Inbox component to read URL params as source of truth
4. ✅ Zustand scope reduced to caching and optimistic updates only
5. ✅ Conversations query now uses URL params (channel, platform, q)
6. ✅ Selected conversation now from URL conversationId param

**Files modified:**
- `/packages/dash/ui/src/routes/_authenticated/workspaces/$workspaceSlug/inbox.tsx` - Added validateSearch, loaderDeps, updated loader
- `/packages/dash/ui/src/components/inbox/index.tsx` - Reading from searchParams, removed zustand filter state

**What works now:**
- URL params control filters: `?channel=dm&platform=INSTAGRAM&q=search`
- URL params control selection: `?conversationId=conv_123`
- Loader prefetches based on URL params
- State persists on page refresh
- Browser back/forward navigation works

### Phase 2: Layout Restructure ✅ COMPLETED
**Timeline:** Week 2
**Goal:** Implement three-column layout with context panel

**Completed Tasks:**
1. ✅ Created InboxContextPanel component that switches between DM/Comment contexts
2. ✅ Created InboxCommentContext with post preview, engagement metrics, and actions
3. ✅ Created InboxDMContext with placeholders for labels, assignee, notes, activity
4. ✅ Integrated context panel into main Inbox layout (hidden below lg breakpoint)
5. ✅ Context panel receives conversation with postPreview from conversationQuery

**Files created:**
- `/packages/dash/ui/src/components/inbox/inbox-context-panel/inbox-context-panel.tsx` - Main switcher
- `/packages/dash/ui/src/components/inbox/inbox-context-panel/inbox-comment-context.tsx` - Comment-specific context
- `/packages/dash/ui/src/components/inbox/inbox-context-panel/inbox-dm-context.tsx` - DM-specific context
- `/packages/dash/ui/src/components/inbox/inbox-context-panel/index.ts` - Barrel export

**Files modified:**
- `/packages/dash/ui/src/components/inbox/index.tsx` - Added InboxContextPanel to layout

**Layout dimensions:**
- Left sidebar: 320px (lg breakpoint)
- Middle panel: flex-1 (fills space)
- Right context panel: 320px (lg breakpoint, hidden on mobile/tablet)

**What works now:**
- Three-column responsive layout
- Comment conversations show post preview with media, caption, engagement metrics
- DM conversations show placeholders for future features (labels, assignee, notes)
- Context panel hidden on mobile/tablet (<lg)
- Post previews properly display Instagram/Facebook media with refreshed URLs

**Tasks:**
1. ~~Add right context panel container~~
2. Adjust layout widths and responsive behavior
3. Create panel switcher based on conversation type
4. Add placeholder content for DM/Comment contexts

**New components:**
- `inbox-context-panel.tsx`
- `inbox-dm-context.tsx`
- `inbox-comment-context.tsx`

### Phase 3: Quick Reply
**Timeline:** Week 3
**Goal:** Enable quick replies from list view

**Design Decision:** Inline expandable reply
- Click "Reply" button on conversation card
- Expands textarea inline below conversation
- Send/Cancel actions
- Collapses after send

**Tasks:**
1. Add quick reply UI to list items
2. Wire up send mutation
3. Implement keyboard shortcuts (Cmd+Enter to send)
4. Add optimistic updates

**New components:**
- `inbox-quick-reply.tsx`
- `inbox-list-actions.tsx`

### Phase 4: Context Panel Features
**Timeline:** Week 4
**Goal:** Build out context panel content

**For Comments:**
1. Post preview component (using existing `postPreview` data)
2. Engagement stats display
3. Quick actions (View Full Post, Hide, Delete)
4. Comment thread visualization

**For DMs:**
1. Contact details display
2. Labels UI (placeholder for future)
3. Assignee selector (placeholder for future)
4. Internal notes (placeholder for future)

### Phase 5: Polish & Cleanup
**Timeline:** Week 5
**Goal:** Complete migration and optimize

**Tasks:**
1. Message highlighting (when `highlightMessageId` in URL)
2. Deep linking validation and error handling
3. Remove Zustand filter state (URL is source of truth)
4. Performance optimization (virtualization)
5. Accessibility improvements
6. Mobile responsive refinements

## State Management Strategy

### URL Params (Source of Truth)
- Filters (channel, platform, search)
- Selected conversation ID
- Highlighted message ID
- All shareable state

### Zustand (Optimistic UI)
- Conversation cache (for instant display)
- Message cache (for instant display)
- Optimistic message additions
- UI-only state (scroll positions, expanded states)

### React Query (Server State)
- Fetch conversations
- Fetch messages
- Fetch conversation details
- Send messages

## Technical Considerations

### Performance
- Virtualize conversation list (react-window/tanstack-virtual)
- Debounce search input (300ms)
- Lazy load context panel data
- Memoize filtered conversation lists

### Accessibility
- Keyboard navigation (j/k for up/down, Enter to open)
- ARIA labels for screen readers
- Focus management when switching conversations
- Screen reader announcements for new messages

### Responsive Design
- **Mobile (<768px)**: Single column, stack views
- **Tablet (768-1024px)**: Two columns, collapsible context panel
- **Desktop (>1024px)**: Full three-column layout

### Deep Linking
Examples of shareable URLs:
- `/inbox?channel=dm&platform=INSTAGRAM`
- `/inbox?conversationId=conv_123`
- `/inbox?conversationId=conv_123&highlightMessageId=msg_456`
- `/inbox?q=refund&channel=post_comment`

## Migration Strategy

### Backward Compatibility
During Phase 1, maintain both URL and Zustand state:
```typescript
// Read from URL first, fallback to Zustand
const channel = search.channel || zustandChannel;

// Write to both
const setChannel = (newChannel) => {
  navigate({ search: { ...search, channel: newChannel } });
  zustandSetChannel(newChannel); // Remove in Phase 5
};
```

### Testing Strategy
1. Test each phase independently
2. Validate URL state persistence on refresh
3. Test deep links
4. Verify optimistic updates work correctly
5. Test responsive breakpoints
6. Accessibility audit

## Success Metrics
- Quick reply adoption rate
- Time to first reply (should decrease)
- Context panel usage
- Deep link sharing frequency
- Page load performance (should improve with loader prefetch)

## Future Enhancements
- Labels system for conversations
- Assignee management
- Internal notes
- Conversation templates
- Bulk actions
- Advanced search/filters
- Conversation archiving
- Read/unread status
- Desktop notifications
