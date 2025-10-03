import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@openpromo/ui/components/sidebar";
import type { SharedAttachmentSpec } from "@shared/content";
import type { ReactNode } from "react";

type RenderFn = (
  attachment: SharedAttachmentSpec,
  className?: string,
  controls?: boolean,
) => ReactNode;

interface MediaEditDialogProps {
  editing: {
    attachment: SharedAttachmentSpec;
    index: number;
  } | null;
  onClose: () => void;
  renderAttachment: RenderFn;
}

function EditorSidebar() {
  return (
    <Sidebar collapsible="none" className="h-full w-64 rounded-bl-lg">
      <SidebarContent className="flex-1 overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupLabel>Basic Edits</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <span>Crop & Resize</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <span>Rotate</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <span>Flip</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Filters & Effects</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <span>Brightness</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <span>Contrast</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <span>Saturation</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <span>Blur</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export function MediaEditDialog({
  editing,
  onClose,
  renderAttachment,
}: MediaEditDialogProps) {
  return (
    <Dialog open={!!editing} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl h-[80vh] p-0 min-w-[80vw] flex flex-col">
        <DialogHeader className="p-6 pb-4 flex-shrink-0">
          <DialogTitle>Edit media</DialogTitle>
        </DialogHeader>
        <div className="flex flex-1 min-h-0">
          <SidebarProvider className="flex w-64 h-full">
            <EditorSidebar />
          </SidebarProvider>
          <div className="flex-1 p-6 pt-0">
            {editing &&
              renderAttachment(editing.attachment, "max-h-full mx-auto", false)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
