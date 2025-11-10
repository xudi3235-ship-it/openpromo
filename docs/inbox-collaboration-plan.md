# Inbox Collaboration Plan

_Last updated: 2025-02-14_

## Goals

Enable OpenPromo inbox to reach feature parity with Meta Business Suite for high‑traffic workspaces by introducing collaboration primitives:

1. **Assignment** – designate a workspace member responsible for a conversation.
2. **Labels & Priority** – organize conversations with tags and priority states; support filtering.
3. **Notes & Reminders** – capture internal context (notes) and future follow‑ups (reminders).
4. **Status / Lead Stage** – track workflow state such as “Intake”, “Qualified”, etc.
5. **Contact enrichment** – store lightweight CRM fields (email, phone, order status).

## Constraints

- **Reuse existing tables**. We cannot introduce new tables right now; everything must live in `inbox_conversations.metadata` (per conversation) and optionally `inbox_messages` (for notes via a separate channel).
- **ORPC first**. All new mutations/query endpoints must be defined in the ORPC router (`packages/dash/worker/src/orpc`), not the legacy Hono routes.
- **Backwards compatible**. Frontend should continue working even if the new metadata is absent.
- **Incremental rollout**. Ship features progressively (assignee → labels → notes) guarded via workspace feature flags when necessary.

## Metadata Shape

We will add a `collab` block under `inbox_conversations.metadata`:

```ts
type InboxConversationCollabMeta = {
  assignee?: {
    userId: string;
    name: string;
    avatarUrl?: string | null;
    assignedAt: string; // ISO timestamp
  };
  labels?: Array<{
    id: string;
    name: string;
    color?: string;
    appliedAt: string;
  }>;
  priority?: "priority" | "normal" | "low";
  status?: {
    key: string; // e.g. "intake", "qualified"
    label: string;
    updatedAt: string;
  };
  notes?: Array<{
    id: string;
    authorId: string;
    authorName: string;
    text: string;
    createdAt: string;
  }>;
  reminder?: {
    remindAt: string;
    createdBy: string;
  };
  contact?: {
    email?: string;
    phone?: string;
    orderStatus?: string;
  };
};
```

Notes array should be capped client‑side (e.g. latest 200 entries) until we decide whether to move them into `inbox_messages`.

## Backend Work

1. **Collab metadata helpers**
   - Create `packages/core/src/domain/inbox/collab-metadata.ts` to parse/mutate the `collab` block safely.
   - Expose derived types via `packages/shared/src/inbox/index.ts` so UI and worker share shapes.

2. **ORPC endpoints**
   - `inbox.assignConversation`: set/unset assignee.
   - `inbox.updateLabels`: apply/remove labels.
   - `inbox.updatePriority`: set priority enum.
   - `inbox.updateStatus`: update workflow stage.
   - `inbox.notes.list` & `inbox.notes.create/delete`: manage internal notes (simple array mutation for now).
   - `inbox.contact.update`: upsert contact enrichment fields.

3. **Conversation read APIs**
   - Extend `inboxGetConversationsRoute` / ORPC loaders to include collab data in the JSON payload so frontend can show badges without additional calls.
   - Ensure realtime conversation events include collab fields when they change.

4. **Validation & security**
   - Every mutation should validate that the acting user belongs to the workspace and has editor rights.
   - Assignee/labels/stage inputs should be sanitized (length constraints, allowed colors).

5. **Feature flags & migrations**
   - Introduce `workspaceFeatureFlags.includes("inbox_collab_tools")` gate so we can enable per workspace.
   - No DB migrations required beyond optional enum expansion if we move notes into `inbox_messages` later.

## Frontend Dependencies (for later phases)

- Update `InboxConversationSummary` to surface `assignee`, `labels`, `priority`, `status`, `notesCount`.
- Build context panel components (assignee picker, labels manager, notes timeline) that call new ORPC endpoints.
- Extend filters (URL params, Zustand) to support `assignee`, `label`, `priority`.

## Rollout Steps

1. Land metadata helpers + schema changes in shared types.
2. Add ORPC assign/label endpoints and wire realtime updates.
3. Build minimal UI toggles under feature flag.
4. Iterate on notes/reminder UX once metadata path is stable.

## Open Questions

- Long term, should notes live in `inbox_messages` (new channel) for pagination + search?
- Do we need server‑side filtering by labels/assignee immediately, or is client filtering acceptable for v1?
- Should reminders trigger workspace notifications or just serve as metadata for now?

---

**Next actions:** implement collab metadata helpers and expose new fields in conversation responses, then add the assign/label ORPC mutations.
