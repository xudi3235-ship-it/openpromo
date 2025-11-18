from typing import Any, cast, override

from agents import (
    Agent,
    AgentHooks,
    ModelResponse,
    RunContextWrapper,
    RunHooks,
    Tool,
    TResponseInputItem,
    Usage,
)
from agents.tool_context import ToolContext


class LoggingHooks(AgentHooks[Any]):
    @override
    async def on_start(
        self,
        context: RunContextWrapper[Any],
        agent: Agent[Any],
    ) -> None:
        print(f"#### {agent.name} is starting.")

    @override
    async def on_end(
        self,
        context: RunContextWrapper[Any],
        agent: Agent[Any],
        output: Any,  # pyright: ignore[reportAny]
    ) -> None:
        print(f"#### {agent.name} produced output: {output}.")


class ExampleHooks(RunHooks):
    event_counter: int

    def __init__(self):
        self.event_counter = 0

    def _usage_to_str(self, usage: Usage) -> str:
        return f"{usage.requests} requests, {usage.input_tokens} input tokens, {usage.output_tokens} output tokens, {usage.total_tokens} total tokens"

    @override
    async def on_agent_start(self, context: RunContextWrapper, agent: Agent) -> None:
        self.event_counter += 1
        print(
            f"### {self.event_counter}: Agent {agent.name} started. Usage: {self._usage_to_str(context.usage)}"
        )

    @override
    async def on_llm_start(
        self,
        context: RunContextWrapper,
        agent: Agent,
        system_prompt: str | None,
        input_items: list[TResponseInputItem],
    ) -> None:
        self.event_counter += 1
        print(
            f"### {self.event_counter}: LLM started. Usage: {self._usage_to_str(context.usage)}"
        )

    @override
    async def on_llm_end(
        self, context: RunContextWrapper, agent: Agent, response: ModelResponse
    ) -> None:
        self.event_counter += 1
        print(
            f"### {self.event_counter}: LLM ended. Usage: {self._usage_to_str(context.usage)}"
        )

    @override
    async def on_agent_end(
        self,
        context: RunContextWrapper,
        agent: Agent,
        output: Any,  # pyright: ignore[reportAny]
    ) -> None:
        self.event_counter += 1
        print(
            f"### {self.event_counter}: Agent {agent.name} ended with output {output}. Usage: {self._usage_to_str(context.usage)}"
        )

    # Note: The on_tool_start and on_tool_end hooks apply only to local tools.
    # They do not include hosted tools that run on the OpenAI server side,
    # such as WebSearchTool, FileSearchTool, CodeInterpreterTool, HostedMCPTool,
    # or other built-in hosted tools.
    @override
    async def on_tool_start(
        self, context: RunContextWrapper, agent: Agent, tool: Tool
    ) -> None:
        self.event_counter += 1
        # While this type cast is not ideal,
        # we don't plan to change the context arg type in the near future for backwards compatibility.
        tool_context = cast(ToolContext[Any], context)
        print(f"### {self.event_counter}: Tool {tool.name} started.")

    @override
    async def on_tool_end(
        self, context: RunContextWrapper, agent: Agent, tool: Tool, result: str
    ) -> None:
        self.event_counter += 1
        # While this type cast is not ideal,
        # we don't plan to change the context arg type in the near future for backwards compatibility.
        tool_context = cast(ToolContext[Any], context)
        print(f"### {self.event_counter}: Tool {tool.name} finished. result={result}.")

    @override
    async def on_handoff(
        self, context: RunContextWrapper, from_agent: Agent, to_agent: Agent
    ) -> None:
        self.event_counter += 1
        print(
            f"### {self.event_counter}: Handoff from {from_agent.name} to {to_agent.name}. Usage: {self._usage_to_str(context.usage)}"
        )


__all__ = ["LoggingHooks", "ExampleHooks"]
