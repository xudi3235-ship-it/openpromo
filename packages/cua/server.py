import shutil
from fastmcp import Client, FastMCP
from openai import AsyncOpenAI
from dotenv import load_dotenv
import asyncio
from agents import Agent, Runner, function_tool, run_demo_loop
from agents.mcp import MCPServer, MCPServerStdio

load_dotenv()


config = {
    "mcpServers": {
        "playwright": {
            "command": "npx",
            "args": [
                "@playwright/mcp@latest",
                # "--isolated",
            ],
        },
    }
}


@function_tool
async def need_user_input(question: str) -> str:
    """Ask the user for input and return the response"""
    print(f"\n🔍 User Input Needed: {question}")
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, input, f"\n{question}\n> ")


client_config = Client(config)

# this is for server
# mcp = FastMCP()


async def run(mcp_server: MCPServer):
    agent = Agent(
        name="Browser Automation Agent",
        instructions="Use tools to automate browser tasks. If you need user input, use the `need_user_input` tool. You will be decompose user irequests into smaller steps and ONLY use tools to complete them.",
        mcp_servers=[mcp_server],
        tools=[need_user_input],
    )
    await run_demo_loop(agent)
    # result = await Runner.run(agent, "What's Google's latest stock price?")
    # print(result.final_output)
    pass


async def main():
    async with MCPServerStdio(
        name="playwright", params=config["mcpServers"]["playwright"]
    ) as mcp_server:
        await mcp_server.connect()
        await run(mcp_server)


if __name__ == "__main__":
    if not shutil.which("npx"):
        raise RuntimeError(
            "npx is not installed. Please install it with `npm install -g npx`."
        )
    asyncio.run(main())
