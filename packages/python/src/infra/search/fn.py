from __future__ import annotations
import http.client
import json
from typing import Literal

from typing import List, Optional

from pydantic import BaseModel, Field


class SearchParameters(BaseModel):
    q: str
    type: str
    num: int
    tbs: Optional[str]  # Changed to Optional[str]
    engine: str


class Sitelink(BaseModel):
    title: Optional[str]
    link: Optional[str]


class OrganicItem(BaseModel):
    title: Optional[str]
    link: Optional[str]
    snippet: Optional[str]
    date: Optional[str] = None  # Explicitly default to None
    position: Optional[int]
    sitelinks: Optional[List[Sitelink]] = None
    rating: Optional[float] = None
    ratingCount: Optional[int] = None


class RelatedSearch(BaseModel):
    query: str


class SearchResponse(BaseModel):
    searchParameters: Optional[SearchParameters]
    # Add knowledgeGraph if you want to parse it, otherwise Pydantic ignores extra fields by default
    knowledgeGraph: Optional[dict] = (
        None  # Example if you just want to capture it as a dict
    )
    organic: Optional[List[OrganicItem]]
    relatedSearches: Optional[List[RelatedSearch]]
    credits: int
    ...


class Metadata(BaseModel):
    title: str
    description: str
    og_title: str = Field(..., alias="og:title")
    og_description: str = Field(..., alias="og:description")
    og_locale: str = Field(..., alias="og:locale")
    og_image: str = Field(..., alias="og:image")
    og_image_width: str = Field(..., alias="og:image:width")
    og_image_height: str = Field(..., alias="og:image:height")
    og_type: str = Field(..., alias="og:type")
    twitter_title: str = Field(..., alias="twitter:title")
    twitter_description: str = Field(..., alias="twitter:description")
    ...


class WebpageResponse(BaseModel):
    text: str
    markdown: str
    metadata: Metadata
    credits: int


class SerperDevApi:
    """wrapper for https://serper.dev/"""

    def __init__(self, api_key: str):
        assert api_key, "api_key is required"
        self.conn = http.client.HTTPSConnection("google.serper.dev")
        self.headers = {
            "X-API-KEY": api_key,
            "Content-Type": "application/json",
        }

    def query(
        self,
        endpoint: Literal["search", "images", "videos", "news"],
        q: str,
        num: int = 10,
        tbs: str | None = None,  # "qdr:m", # "qdr:d", "qdr:w", "qdr:m", "qdr:y"
        page: int = 1,
    ) -> SearchResponse:
        """search, image, video, news"""

        payload = json.dumps({"q": q, "num": num, "tbs": tbs, "page": page})
        self.conn.request("POST", "/" + endpoint, payload, self.headers)
        res = self.conn.getresponse()
        if res.status != 200:
            raise Exception(f"Error: {res.status} {res.reason}")
        data = res.read().decode("utf-8")
        print(data)

        return SearchResponse.model_validate_json(data)

    def webpages(
        self,
        url: str,
        include_mark_down: bool = False,
    ) -> WebpageResponse:
        import re

        if not re.match(r"^https?://", url):
            raise ValueError(
                "Invalid URL format. URL must start with http:// or https://"
            )
        payload = json.dumps({"url": url, "include_mark_down": include_mark_down})
        self.conn.request("POST", "/webpages", payload, self.headers)
        res = self.conn.getresponse()
        data = res.read()
        return WebpageResponse.model_validate_json(data.decode("utf-8"))


if __name__ == "__main__":
    import os
    from dotenv import load_dotenv

    load_dotenv()
    api_key = os.environ.get("SERPER_DEV_API_KEY")
    assert api_key, "SERPER_DEV_API_KEY not set"
    serper = SerperDevApi(api_key)
    print(serper.query("search", "trump"))
