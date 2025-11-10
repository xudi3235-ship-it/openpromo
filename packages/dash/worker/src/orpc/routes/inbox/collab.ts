import { randomUUID } from "node:crypto";
import { getDbClient } from "@core/database/db";
import {
  getNotesCount,
  pruneCollab,
  readCollabMetadata,
  writeCollabMetadata,
} from "@core/domain/inbox/collab-metadata";
import { dispatchWorkspaceEvent } from "@core/domain/workspace/realtime";
import { inboxConversationsTable } from "@core/schemas/inbox-conversations.sql";
import { ErrorCodes, VisibleError } from "@core/utils/error";
import type {
  InboxCollabContact,
  InboxCollabLabel,
  InboxCollabNote,
  InboxCollabStatus,
  InboxConversationCollab,
} from "@shared/inbox";
import {
  InboxCollabLabelSchema,
  InboxCollabNoteSchema,
  InboxCollabStatusSchema,
  InboxConversationCollabSchema,
  InboxRealtimeEventTypes,
} from "@shared/inbox";
import { createWorkspaceEvent } from "@shared/workspace/events";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { loadConversationForWorkspace } from "../../../routes/api/workspaces/inbox/routes/utils/conversation-loader";
import { orpcBuilder } from "../../context";
import { withWorkspaceRole } from "../../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../../shared/workspace-helpers";

const CollabMutationResultSchema = z.object({
  success: z.literal(true),
  collab: InboxConversationCollabSchema.nullable(),
  notesCount: z.number(),
});

type CollabMutationResult = z.infer<typeof CollabMutationResultSchema>;

type ConversationWithContact = NonNullable<
  Awaited<ReturnType<typeof loadConversationForWorkspace>>
>;

async function loadConversation(conversationId: string, workspaceId: string) {
  const db = getDbClient();
  const conversation = await loadConversationForWorkspace(
    db,
    conversationId,
    workspaceId,
  );
  if (!conversation) {
    throw new VisibleError(
      "not_found",
      ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
      "Conversation not found.",
    );
  }
  return { db, conversation };
}

async function persistCollab({
  db,
  conversation,
  workspaceId,
  collab,
}: {
  db: ReturnType<typeof getDbClient>;
  conversation: ConversationWithContact;
  workspaceId: string;
  collab: InboxConversationCollab | null;
}): Promise<CollabMutationResult> {
  const metadata = writeCollabMetadata(conversation.metadata, collab);

  await db
    .update(inboxConversationsTable)
    .set({ metadata })
    .where(eq(inboxConversationsTable.id, conversation.id));

  const notesCount = getNotesCount(collab);
  const event = createWorkspaceEvent(
    InboxRealtimeEventTypes.ConversationUpserted,
    {
      conversationId: conversation.id,
      lastMessageAt: conversation.lastMessageAt,
      platform: conversation.platform,
      contact: {
        id: conversation.contactId,
        name: conversation.contactName,
        profilePicUrl: conversation.contactProfilePicUrl ?? "",
      },
      collab: collab ?? undefined,
      notesCount,
    },
  );

  await dispatchWorkspaceEvent(workspaceId, event);

  return {
    success: true,
    collab,
    notesCount,
  };
}

async function mutateCollab(
  workspaceId: string,
  conversationId: string,
  updater: (
    collab: InboxConversationCollab | null,
  ) => InboxConversationCollab | null,
) {
  const { db, conversation } = await loadConversation(
    conversationId,
    workspaceId,
  );
  const current = readCollabMetadata(conversation.metadata);
  const next = pruneCollab(updater(current));
  return persistCollab({ db, conversation, workspaceId, collab: next });
}

const WorkspaceConversationInput = createWorkspaceInputSchema(
  z.object({
    conversationId: z.string().min(1),
  }),
);

const AssigneeInput = WorkspaceConversationInput.extend({
  assignee: z
    .object({
      userId: z.string().min(1),
      name: z.string().min(1),
      avatarUrl: z.string().url().optional(),
    })
    .nullable()
    .optional(),
});

export const assignConversation = orpcBuilder
  .input(AssigneeInput)
  .output(CollabMutationResultSchema)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input, context }) => {
    const workspace = context.workspace.workspaceID;
    const assignee = input.assignee;
    return mutateCollab(workspace, input.conversationId, (current) => {
      const next: InboxConversationCollab = { ...(current ?? {}) };
      if (assignee) {
        next.assignee = {
          userId: assignee.userId,
          name: assignee.name,
          avatarUrl: assignee.avatarUrl ?? null,
          assignedAt: new Date(),
        };
      } else {
        delete next.assignee;
      }
      return next;
    });
  });

const LabelsInput = WorkspaceConversationInput.extend({
  labels: z.array(
    InboxCollabLabelSchema.pick({ id: true, name: true, color: true }),
  ),
});

export const updateLabels = orpcBuilder
  .input(LabelsInput)
  .output(CollabMutationResultSchema)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input, context }) => {
    const workspace = context.workspace.workspaceID;
    const now = new Date();
    return mutateCollab(workspace, input.conversationId, (current) => {
      const next: InboxConversationCollab = { ...(current ?? {}) };
      if (!input.labels.length) {
        delete next.labels;
        return next;
      }
      const labels = input.labels.map((label) => {
        const existing = current?.labels?.find((l) => l.id === label.id);
        const labelEntry: InboxCollabLabel = {
          id: label.id,
          name: label.name,
          color: label.color,
          appliedAt: existing?.appliedAt ?? now,
        };
        return labelEntry;
      });
      next.labels = labels;
      return next;
    });
  });

const PriorityInput = WorkspaceConversationInput.extend({
  priority: z.enum(["priority", "normal", "low"]).nullable(),
});

export const updatePriority = orpcBuilder
  .input(PriorityInput)
  .output(CollabMutationResultSchema)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input, context }) => {
    const workspace = context.workspace.workspaceID;
    return mutateCollab(workspace, input.conversationId, (current) => {
      const next: InboxConversationCollab = { ...(current ?? {}) };
      if (input.priority) {
        next.priority = input.priority;
      } else {
        delete next.priority;
      }
      return next;
    });
  });

const StatusInput = WorkspaceConversationInput.extend({
  status: InboxCollabStatusSchema.pick({ key: true, label: true }).nullable(),
});

export const updateStatus = orpcBuilder
  .input(StatusInput)
  .output(CollabMutationResultSchema)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input, context }) => {
    const workspace = context.workspace.workspaceID;
    const now = new Date();
    return mutateCollab(workspace, input.conversationId, (current) => {
      const next: InboxConversationCollab = { ...(current ?? {}) };
      if (input.status) {
        const status: InboxCollabStatus = {
          key: input.status.key,
          label: input.status.label,
          updatedAt: now,
        };
        next.status = status;
      } else {
        delete next.status;
      }
      return next;
    });
  });

const ContactInput = WorkspaceConversationInput.extend({
  contact: z
    .object({
      email: z.string().email().nullable().optional(),
      phone: z.string().nullable().optional(),
      orderStatus: z.string().nullable().optional(),
    })
    .nullable(),
});

export const updateContact = orpcBuilder
  .input(ContactInput)
  .output(CollabMutationResultSchema)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input, context }) => {
    const workspace = context.workspace.workspaceID;
    return mutateCollab(workspace, input.conversationId, (current) => {
      const next: InboxConversationCollab = { ...(current ?? {}) };
      if (input.contact) {
        const contact = Object.fromEntries(
          Object.entries(input.contact).filter(
            ([, value]) =>
              value !== undefined && value !== null && value !== "",
          ),
        ) as InboxCollabContact;
        if (Object.keys(contact).length > 0) {
          next.contact = contact;
        } else {
          delete next.contact;
        }
      } else {
        delete next.contact;
      }
      return next;
    });
  });

const NotesListOutput = z.object({
  notes: z.array(InboxCollabNoteSchema),
});

export const listNotes = orpcBuilder
  .input(WorkspaceConversationInput)
  .output(NotesListOutput)
  .use(withWorkspaceRole, workspaceRoleMappers.viewer)
  .handler(async ({ input, context }) => {
    const workspaceId = context.workspace.workspaceID;
    const { conversation } = await loadConversation(
      input.conversationId,
      workspaceId,
    );
    const collab = readCollabMetadata(conversation.metadata);
    const notes = [...(collab?.notes ?? [])].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return { notes };
  });

const NoteCreateInput = WorkspaceConversationInput.extend({
  text: z.string().min(1).max(2000),
});

const NoteCreateOutput = CollabMutationResultSchema.extend({
  note: InboxCollabNoteSchema,
});

export const createNote = orpcBuilder
  .input(NoteCreateInput)
  .output(NoteCreateOutput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input, context }) => {
    const workspaceId = context.workspace.workspaceID;
    const user = context.honoContext.get("user") as
      | { firstName?: string | null; lastName?: string | null }
      | undefined;
    const authorName =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
      context.workspace.email;
    const note: InboxCollabNote = {
      id: randomUUID(),
      authorId: context.workspace.userID,
      authorName,
      text: input.text.trim(),
      createdAt: new Date(),
    };
    const result = await mutateCollab(
      workspaceId,
      input.conversationId,
      (current) => {
        const next: InboxConversationCollab = { ...(current ?? {}) };
        const notes = [...(next.notes ?? [])];
        notes.push(note);
        notes.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        // optional cap
        next.notes = notes.slice(0, 200);
        return next;
      },
    );
    return {
      ...result,
      note,
    };
  });

const NoteDeleteInput = WorkspaceConversationInput.extend({
  noteId: z.string().min(1),
});

export const deleteNote = orpcBuilder
  .input(NoteDeleteInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .output(CollabMutationResultSchema)
  .handler(async ({ input, context }) => {
    const workspaceId = context.workspace.workspaceID;
    return mutateCollab(workspaceId, input.conversationId, (current) => {
      if (!current?.notes?.length) {
        return current ?? null;
      }
      const next: InboxConversationCollab = { ...(current ?? {}) };
      const filtered = current.notes.filter((note) => note.id !== input.noteId);
      if (filtered.length > 0) {
        next.notes = filtered;
      } else {
        delete next.notes;
      }
      return next;
    });
  });
