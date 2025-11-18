from google.adk.apps.app import App
from google.adk.runners import InMemoryRunner

from video_agent.agent import root_agent

app = App(
    name="agents",
    root_agent=root_agent,
    # Optionally include App-level features:
    # plugins, context_cache_config, resumability_config
)

runner = InMemoryRunner(app=app)


async def main():
    try:  # run_debug() requires ADK Python 1.18 or higher:
        response = await runner.run_debug("Hello there!")
        print("Agent response:", response)

    except Exception as e:
        print(f"An error occurred during agent execution: {e}")


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
