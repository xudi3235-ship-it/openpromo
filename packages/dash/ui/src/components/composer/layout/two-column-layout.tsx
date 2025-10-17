import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@openpromo/ui/components/resizable";
import { cn } from "@openpromo/ui/lib/utils";
import type { ReactNode } from "react";

interface TwoColumnLayoutProps {
  left: ReactNode;
  right: ReactNode;
  leftDefaultSize?: number;
  leftMinSize?: number;
  leftMaxSize?: number;
  className?: string;
}

export function TwoColumnLayout({
  left,
  right,
  leftDefaultSize = 40,
  leftMinSize = 30,
  leftMaxSize = 60,
  className = "",
}: TwoColumnLayoutProps) {
  return (
    <div className={cn("relative h-full w-full", className)}>
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        <ResizablePanel
          defaultSize={leftDefaultSize}
          minSize={leftMinSize}
          maxSize={leftMaxSize}
        >
          {left}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={100 - leftDefaultSize} minSize={40}>
          {right}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
