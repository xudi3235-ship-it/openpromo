import { query } from "@anthropic-ai/claude-code";

// TODO: prepare env var for either anthropic api key
// or aws bedrock access.
// Simple one-shot query
for await (const message of query({
  prompt: "Explain the authentication flow",
  options: {
    maxTurns: 5,
    allowedTools: ["Read", "Grep"],
  },
})) {
  if (message.type === "assistant") console.log(message.message);
}

// Continue conversation with session management
for await (const message of query({
  prompt: "Now explain the authorization process",
  options: {
    continue: true,
    maxTurns: 1,
  },
})) {
  if (message.type === "assistant") console.log(message.message);
}
