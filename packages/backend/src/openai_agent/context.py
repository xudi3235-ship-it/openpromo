from pydantic import BaseModel


# ---------------- Runtime Context ----------------
class RuntimeContext(BaseModel):
    product: str
    business: str
    avatar_reference_image_url: str | None = None
