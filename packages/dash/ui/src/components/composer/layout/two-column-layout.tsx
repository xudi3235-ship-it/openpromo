import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@openpromo/ui/components/resizable";
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
    <div className={`relative h-full ${className}`}>
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel
          defaultSize={leftDefaultSize}
          minSize={leftMinSize}
          maxSize={leftMaxSize}
        >
          {left}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={100 - leftDefaultSize}>
          {right}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
