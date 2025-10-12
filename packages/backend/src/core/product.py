from pydantic import BaseModel  
# -------- product ingestion flow --------
# WIP: right now most of the stuff are in JS, we'll see
# if we wanna migrate to python runtime later
class ProductIngestRequest(BaseModel):
    image_url: str
    title: str
    description: str
    price_cents: int
    currency: str = "USD"
    brand: str | None = None
    category: str | None = None