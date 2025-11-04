import { Surface, SurfaceBody } from "@openpromo/ui/components/surface";
import type { InboxConversationSummary } from "@shared/inbox";
import { InboxCommentContext } from "./inbox-comment-context";
import { InboxDMContext } from "./inbox-dm-context";

interface InboxContextPanelProps {
  conversation: InboxConversationSummary | null;
}

export function InboxContextPanel({ conversation }: InboxContextPanelProps) {
  if (!conversation) {
    return (
      <Surface
        asChild
        padded="none"
        className="hidden w-80 flex-col overflow-hidden lg:flex"
      >
        <aside>
          <SurfaceBody
            padded="lg"
            className="items-center justify-center text-center"
          >
            <div className="text-sm text-muted-foreground">
              Select a conversation to view details
            </div>
          </SurfaceBody>
        </aside>
      </Surface>
    );
  }

  return (
    <Surface
      asChild
      padded="none"
      className="hidden w-80 flex-col overflow-hidden lg:flex"
    >
      <aside>
        <SurfaceBody padded="none" className="flex-1 overflow-y-auto">
          {conversation.channel === "post_comment" ? (
            <InboxCommentContext conversation={conversation} />
          ) : (
            <InboxDMContext conversation={conversation} />
          )}
        </SurfaceBody>
      </aside>
    </Surface>
  );
}
