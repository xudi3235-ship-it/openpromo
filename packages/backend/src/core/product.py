from pydantic import BaseModel  
# -------- product ingestion flow --------

class ProductIngestRequest(BaseModel):
    image_url: str
    title: str
    description: str
    price_cents: int
    currency: str = "USD"
    brand: str | None = None
    category: str | None = None