import { Button } from "@openpromo/ui/components/button";
import { ArrowDown, Check, Copy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface LiveLogsPanelProps {
  logs: string[];
  className?: string;
}

/**
 * Terminal-style logs panel with auto-scroll and copy functionality.
 * Monospace font, auto-scrolls to bottom on new logs.
 */
export function LiveLogsPanel({ logs, className = "" }: LiveLogsPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLogsLengthRef = useRef(logs.length);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [copied, setCopied] = useState(false);

  // Auto-scroll to bottom when new logs arrive (if already at bottom)
  useEffect(() => {
    if (logs.length !== prevLogsLengthRef.current) {
      prevLogsLengthRef.current = logs.length;
      if (isAtBottom && scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  });

  // Track scroll position
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    // Consider "at bottom" if within 50px of bottom
    setIsAtBottom(scrollHeight - scrollTop - clientHeight < 50);
  }, []);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setIsAtBottom(true);
    }
  };

  const copyLogs = async () => {
    try {
      await navigator.clipboard.writeText(logs.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy logs:", err);
    }
  };

  // Parse log line to extract prefix and format
  const formatLogLine = (line: string, index: number) => {
    // Clean up common log prefixes for readability
    let cleanedLine = line;
    let prefix = "";

    // Extract [ClassName] prefix if present
    const prefixMatch = line.match(/^\[([^\]]+)\]\s*/);
    if (prefixMatch) {
      prefix = prefixMatch[1];
      cleanedLine = line.slice(prefixMatch[0].length);
    }

    return (
      <div
        key={`${index}-${line.slice(0, 20)}`}
        className="flex gap-3 py-0.5 hover:bg-muted/30 px-2 -mx-2 rounded"
      >
        <span className="text-muted-foreground/60 shrink-0 select-none">
          {String(index + 1).padStart(3, " ")}
        </span>
        {prefix && (
          <span className="text-blue-500/70 shrink-0">[{prefix}]</span>
        )}
        <span className="text-foreground/90 break-all">{cleanedLine}</span>
      </div>
    );
  };

  return (
    <div className={`flex flex-col border-t bg-card ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Logs
          </span>
          {logs.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({logs.length} lines)
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyLogs}
            disabled={logs.length === 0}
            className="h-7 px-2 text-xs"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span className="ml-1.5 hidden sm:inline">
              {copied ? "Copied" : "Copy"}
            </span>
          </Button>
        </div>
      </div>

      {/* Logs content */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-auto p-3 font-mono text-xs"
        >
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground/60">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <div
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40"
                    style={{ animation: "wave 1.4s ease-in-out infinite" }}
                  />
                  <div
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40"
                    style={{
                      animation: "wave 1.4s ease-in-out infinite",
                      animationDelay: "0.2s",
                    }}
                  />
                  <div
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40"
                    style={{
                      animation: "wave 1.4s ease-in-out infinite",
                      animationDelay: "0.4s",
                    }}
                  />
                </div>
                <span className="text-sm">Waiting for logs</span>
                <style>{`
                  @keyframes wave {
                    0%, 100% { opacity: 0.3; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1); }
                  }
                `}</style>
              </div>
            </div>
          ) : (
            <div className="space-y-0">{logs.map(formatLogLine)}</div>
          )}
        </div>

        {/* Scroll to bottom button */}
        {!isAtBottom && logs.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={scrollToBottom}
            className="absolute bottom-3 right-3 h-8 px-3 shadow-lg"
          >
            <ArrowDown className="h-3.5 w-3.5 mr-1.5" />
            Latest
          </Button>
        )}
      </div>
    </div>
  );
}
