import type { SharedAttachmentSpec } from "@core/domain/content/schema/placement";

export function cloneAttachments(list: SharedAttachmentSpec[] = []) {
  return list.map((a) => ({ ...a }));
}

export function ids(list: SharedAttachmentSpec[] = []) {
  return list.map((a) => a.id).join("|");
}

export function wasSynced(
  previousIds: string,
  current?: SharedAttachmentSpec[],
) {
  if (!current) return true;
  return current.map((a) => a.id).join("|") === previousIds;
}

export function shouldSyncAfterAdd(
  oldBaseIds: string,
  current?: SharedAttachmentSpec[],
) {
  if (!current) return true;
  return ids(current) === oldBaseIds;
}

export function buildNewAttachment(file: File, index: number) {
  return {
    id: `attachment-${Date.now()}-${index}`,
    type: file.type.startsWith("image/")
      ? ("photo" as const)
      : ("video" as const),
    file,
    mimeType: file.type,
  };
}
