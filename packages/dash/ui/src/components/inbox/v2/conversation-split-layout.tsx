import type { ReactNode } from "react";

interface ConversationSplitLayoutProps {
  conversationPanel: ReactNode;
  contextPanel: ReactNode;
}

export function ConversationSplitLayout({
  conversationPanel,
  contextPanel,
}: ConversationSplitLayoutProps) {
  return (
    <div className="flex min-h-0 flex-1">
      <div className="grid min-h-0 w-full flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(320px,1fr)]">
        <div className="flex min-h-0 min-w-0 flex-col">{conversationPanel}</div>
        <div className="hidden min-h-0 min-w-0 flex-col lg:flex">
          {contextPanel}
        </div>
      </div>
    </div>
  );
}
