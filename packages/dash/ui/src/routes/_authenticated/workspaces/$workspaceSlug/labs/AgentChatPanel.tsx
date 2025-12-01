import { Button } from "@openpromo/ui/components/button";
import type { UIMessage } from "ai";
import { useState } from "react";
import { useVideoGenAgent } from "@/hooks/useVideoGenAgent";

export function AgentChatPanel({ userId }: { userId: string | undefined }) {
  const [input, setInput] = useState("");
  const [_msgs, setMsgs] = useState<MessageEvent[]>([]);

  const {
    isConnected,
    sendEvent,
    chat: { messages, sendMessage, status, error, clearHistory },
  } = useVideoGenAgent({
    userId: userId || "guest",
    onEvent: {
      echo: (data) => {
        alert(`Echo received: ${data.message}`);
      },
      status_update: () => {
        // Status update received; handle as needed
      },
    },
    // debugging
    _onMessage: async (evt) => {
      setMsgs((prev) => [...prev, evt.data]);
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  if (!userId) {
    return (
      <div className="p-4 text-gray-500">
        Please sign in to use the agent chat.
      </div>
    );
  }

  const productImageUrls = [
    "https://i.pinimg.com/1200x/1e/63/b8/1e63b8168a25c2a2a4127971514d97e2.jpg",
  ];
  const avatarImageUrls = [
    "https://i.pinimg.com/1200x/04/9a/65/049a6564d158084703960383df8de897.jpg",
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold">Agent Chat</h4>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              sendEvent("echo", {
                message: `Hello from client at ${new Date().toISOString()}`,
              });
            }}
            disabled={!isConnected}
          >
            Test Echo
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              sendEvent("set_input", {
                productImages: productImageUrls,
                avatarImages: avatarImageUrls,
                prompt:
                  "create a 8s tiktok ugc video. first create a image first!! do not create video!!",
              });
            }}
            disabled={!isConnected}
          >
            set input
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              sendEvent("start_image_gen", {
                input: {
                  productImages: productImageUrls,
                  avatarImages: avatarImageUrls,
                  prompt:
                    "create a 8s tiktok ugc video. first create a image first!! do not create video!!",
                },
              });
            }}
            disabled={!isConnected}
          >
            Start Image Gen
          </Button>
          <span
            className={`px-2 py-1 rounded text-sm ${
              isConnected
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {isConnected ? "Connected" : "Connecting..."}
          </span>
        </div>
      </div>

      <div className="border rounded-lg p-4 h-96 overflow-y-auto bg-gray-50 space-y-4">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-sm">Start a conversation...</p>
        ) : (
          messages.map((message: UIMessage, index: number) => (
            <div
              key={message.id || `${message.role}-${index}`}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-900"
                }`}
              >
                <p className="text-sm">
                  {message.parts
                    ?.filter((part) => part.type === "text")
                    .map((part) => (part.type === "text" ? part.text : ""))
                    .join("") || ""}
                </p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-900 rounded-lg p-3">
              <p className="text-sm">Agent is typing...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="bg-red-100 text-red-800 rounded-lg p-3">
            <p className="text-sm">Error: {error.message}</p>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({
              role: "user",
              parts: [{ type: "text", text: input }],
            });
            setInput("");
          }
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading || !isConnected}
          className="flex-1 border rounded-lg px-4 py-2"
        />
        <Button
          type="submit"
          disabled={isLoading || !input.trim() || !isConnected}
        >
          {isLoading ? "Sending..." : "Send"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            clearHistory();
            setInput("");
          }}
          disabled={!isConnected}
        >
          Clear Chat
        </Button>
      </form>
      <div>Events: {JSON.stringify(_msgs)}</div>
    </div>
  );
}
