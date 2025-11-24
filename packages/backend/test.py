import asyncio

from src.openai_agent.testcase import run_batch_tests

if __name__ == "__main__":
    asyncio.run(run_batch_tests())
