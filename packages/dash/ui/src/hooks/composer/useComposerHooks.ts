import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { useDialogComposerStore } from "@/stores/dialog-composer-store";
import { useWorkspace } from "../useWorkspace";

export function useComposerPublishHandlers() {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const { mode, closeComposer } = useDialogComposerStore();

  return useCallback(async () => {
    if (mode !== "closed") {
      closeComposer();
    }
    await navigate({
      to: "/workspaces/$workspaceSlug/content",
      params: { workspaceSlug: ws.workspace.slug },
    });
  }, [navigate, ws.workspace.slug, closeComposer, mode]);
}
