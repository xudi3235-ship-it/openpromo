import type { InboxConversationCollab } from "@shared/inbox";
import { InboxConversationCollabSchema } from "@shared/inbox";

type RawMetadata = Record<string, unknown> | null | undefined;

function ensureRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

export function readCollabMetadata(
  metadata: RawMetadata,
): InboxConversationCollab | null {
  const wrapper = ensureRecord(metadata);
  if (!wrapper) return null;
  const collab = ensureRecord(wrapper["collab"]);
  if (!collab) return null;

  const parsed = InboxConversationCollabSchema.safeParse(collab);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}

export function getNotesCount(collab: InboxConversationCollab | null): number {
  if (!collab?.notes) return 0;
  return collab.notes.length;
}

export function pruneCollab(
  collab: InboxConversationCollab | null,
): InboxConversationCollab | null {
  if (!collab) return null;

  const next: InboxConversationCollab = { ...collab };

  if (!next.assignee) delete next.assignee;
  if (!next.labels || next.labels.length === 0) delete next.labels;
  if (!next.notes || next.notes.length === 0) delete next.notes;
  if (
    !next.contact ||
    Object.values(next.contact).every(
      (value) => value === undefined || value === null || value === "",
    )
  ) {
    delete next.contact;
  }
  if (!next.priority) delete next.priority;
  if (!next.status) delete next.status;
  if (!next.reminder) delete next.reminder;

  const hasValues =
    !!next.assignee ||
    !!next.labels ||
    !!next.notes ||
    !!next.contact ||
    !!next.priority ||
    !!next.status ||
    !!next.reminder;

  return hasValues ? next : null;
}

export function writeCollabMetadata(
  metadata: RawMetadata,
  collab: InboxConversationCollab | null,
): Record<string, unknown> {
  const next = { ...(metadata ?? {}) };
  if (collab) {
    next.collab = collab;
  } else if ("collab" in next) {
    delete next.collab;
  }
  return next;
}
