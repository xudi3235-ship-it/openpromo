import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { Textarea } from "@openpromo/ui/components/textarea";
import { Paperclip, Send } from "lucide-react";

export function InboxMessageInput() {
  return (
    <footer className="border-t border-border/60 bg-muted/15 px-6 py-4">
      <Textarea
        placeholder="Type a reply… (coming soon)"
        disabled
        className="min-h-[90px] resize-none"
      />
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Status: Open</Badge>
          <div className="flex items-center gap-1">
            <Paperclip className="h-3 w-3" />
            Attachments coming soon
          </div>
        </div>
        <Button size="sm" disabled>
          <Send className="mr-2 h-4 w-4" />
          Send
        </Button>
      </div>
    </footer>
  );
}
