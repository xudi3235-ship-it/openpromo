from typing import Any, Iterable, Optional, Type, TypeVar
from google import genai

from pydantic import BaseModel
from google.genai import types
from openai.types.chat import ChatCompletionMessageParam

TSchema = TypeVar("TSchema", bound=BaseModel)


def get_openai_client():
    from openai import OpenAI
    import os

    api_key = os.environ.get("OPENAI_API_KEY")
    assert api_key, "OPENAI_API_KEY not set"
    return OpenAI(api_key=api_key)


def get_gemini_client():
    import os

    key = "GEMINI_API_KEY"
    api_key = os.environ.get(key)
    assert api_key, f"{key} not set"
    client = genai.Client(api_key=api_key)
    return client


def parse_schema_with_llm(
    schema_type: Type[TSchema],
    messages: Iterable[ChatCompletionMessageParam] = [],
    system_prompt: Optional[str] = None,
    model: str = "gpt-4o-mini",
    max_tokens: int = 8_000,
    temperature: float = 0,
    **kwargs: Any,
) -> TSchema:
    assert messages or system_prompt, (
        "Either messages or system_prompt must be provided"
    )
    client = get_openai_client()

    default_prompt = f"Given the unstructued data, parse it into the given schema. The data is: {messages}"
    if system_prompt:
        msgs = [
            {"role": "system", "content": system_prompt},
        ]
    else:
        msgs = messages or [{"role": "system", "content": default_prompt}]

    completion = client.beta.chat.completions.parse(
        model=model,
        messages=msgs,  # type: ignore
        response_format=schema_type,
        max_completion_tokens=max_tokens,
        temperature=temperature,
        **kwargs,
    )

    parsed_data = completion.choices[0].message.parsed
    if not parsed_data:
        raise ValueError(
            f"Failed to parse data {messages} into the specified schema {schema_type}"
        )

    return parsed_data


def parse_schema_with_gemini(
    schema_type: Type[TSchema],
    system_prompt: str | None,
    contents: types.ContentListUnion | None,
    model: str = "gemini-2.5-pro-preview-03-25",
    **kwargs: Any,
) -> TSchema:
    cli = get_gemini_client()

    _contents = contents or system_prompt
    if not _contents:
        raise ValueError("Either contents or system_prompt must be provided")

    r = cli.models.generate_content(
        model=model,
        contents=_contents,
        config={
            "response_mime_type": "application/json",
            "response_schema": schema_type,
        },
        **kwargs,
    )
    p: TSchema = r.parsed  # type: ignore
    return p
