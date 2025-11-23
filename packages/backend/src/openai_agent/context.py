from pydantic import BaseModel


class ProductContext(BaseModel):
    name: str
    description: str
    images: list[str]
    target_audience: str
    selling_points: str
    extra: dict[str, str]


class UserContext(BaseModel):
    product: ProductContext
    business: str
    extra: dict[str, str]


class StageContext(BaseModel):
    stage_name: str
    stage_description: str
    output: str


# ---------------- Runtime Context ----------------
class RuntimeContext(BaseModel):
    user_context: UserContext
    stage_contexts: list[StageContext]
