import os

import replicate
from openai import OpenAI


def get_env_or_raise(key: str) -> str:
    value = os.environ.get(key)
    if not value:
        raise ValueError(f"{key} not set in environment variables")
    return value


def oai() -> OpenAI:
    key = get_env_or_raise("OPENAI_API_KEY")
    if not key:
        raise ValueError("OPENAI_API_KEY not set in environment variables")
    return OpenAI(api_key=key)


def rep() -> replicate.Client:
    key = get_env_or_raise("REPLICATE_API_TOKEN")
    if not key:
        raise ValueError("REPLICATE_API_TOKEN not set in environment variables")
    return replicate.Client(api_token=key)
