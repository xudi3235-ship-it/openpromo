import type { VideoGenRealtime } from "@shared";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import { useVideoGenAgent } from "@/hooks/useVideoGenAgent";

const VideoGenAgentContext = createContext<ReturnType<
  typeof useVideoGenAgent
> | null>(null);

type ProviderProps = {
  children: ReactNode;
  onEvent?: VideoGenRealtime.Handlers;
};

export function VideoGenAgentProvider({ children, onEvent }: ProviderProps) {
  const value = useVideoGenAgent({ onEvent });

  return (
    <VideoGenAgentContext.Provider value={value}>
      {children}
    </VideoGenAgentContext.Provider>
  );
}

export function useVideoGenAgentContext() {
  const context = useContext(VideoGenAgentContext);

  if (!context) {
    throw new Error(
      "useVideoGenAgentContext must be used within a VideoGenAgentProvider",
    );
  }

  return context;
}
