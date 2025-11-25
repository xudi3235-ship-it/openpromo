import asyncio
import hashlib
import os
from dataclasses import dataclass, field
from pathlib import Path

import requests
from agents import Runner, TResponseInputItem, trace
from dotenv import load_dotenv

from src.openai_agent.agents.main_agent import main_agent
from src.openai_agent.context import RuntimeContext
from src.openai_agent.helpers import to_img_inputs

load_dotenv()


@dataclass
class TestCase:
    name: str
    product_name: str
    product_description: str
    product_images_urls: list[str]
    goal: str
    reference_images_urls: list[str] = field(default_factory=list)
    target_audience: str = "General audience"
    selling_points: str = ""


@dataclass
class VideoGenTestSuite:
    test_cases: list[TestCase]

    async def run(self):
        results = []
        for idx, test_case in enumerate(self.test_cases):
            print(f"\n>>> Running test case: {test_case.name}")

            # Construct initial input
            user_msg = f"""
            here's the product: {test_case.product_name}
            {test_case.product_description}

            Goal: {test_case.goal}

            Output: name the final output video properly with index {test_case.name} {idx}.mp4
            """

            init_input: list[TResponseInputItem] = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": user_msg,
                        },
                        *to_img_inputs(test_case.product_images_urls),
                    ],
                }
            ]

            runtime_context = RuntimeContext(
                product=test_case.product_name,
                business="ecommerce",
            )

            with trace(f"Test Case: {test_case.name}"):
                result = await Runner.run(
                    main_agent,
                    max_turns=30,
                    input=init_input,
                    context=runtime_context,
                )
                results.append((test_case, result))
                print(f">>> Finished test case: {test_case.name}")

        return results


class TestSuiteBuilder:
    def __init__(self):
        self.test_cases: list[TestCase] = []

    def add(
        self,
        name: str,
        product_name: str,
        product_description: str,
        product_images_urls: list[str],
        goal: str,
        reference_images_urls: list[str] | None = None,
        target_audience: str = "General audience",
        selling_points: str = "",
    ) -> "TestSuiteBuilder":
        self.test_cases.append(
            TestCase(
                name=name,
                product_name=product_name,
                product_description=product_description,
                product_images_urls=product_images_urls,
                goal=goal,
                reference_images_urls=reference_images_urls or [],
                target_audience=target_audience,
                selling_points=selling_points,
            )
        )
        return self

    def _download_image(self, url: str) -> str:
        if not url.startswith(("http://", "https://")):
            return url

        try:
            # Create directory if not exists
            download_dir = Path("./tmp/downloads")
            download_dir.mkdir(parents=True, exist_ok=True)

            # Generate filename from URL hash to avoid collisions/invalid chars
            url_hash = hashlib.md5(url.encode()).hexdigest()
            ext = os.path.splitext(url)[1]
            if not ext:
                ext = ".jpg"  # Default fallback

            filename = f"{url_hash}{ext}"
            file_path = download_dir / filename

            if file_path.exists():
                return str(file_path)

            print(f"Downloading image from {url}...")
            response = requests.get(url, timeout=10)
            response.raise_for_status()

            with open(file_path, "wb") as f:
                f.write(response.content)

            return str(file_path)
        except Exception as e:
            print(f"Failed to download image from {url}: {e}")
            return url  # Fallback to original URL if download fails

    def add_test_case(self, test_case: TestCase) -> "TestSuiteBuilder":
        # Process images and download if necessary
        test_case.product_images_urls = [
            self._download_image(url) for url in test_case.product_images_urls
        ]
        test_case.reference_images_urls = [
            self._download_image(url) for url in test_case.reference_images_urls
        ]
        self.test_cases.append(test_case)
        return self

    @staticmethod
    def water_bottle_ugc() -> TestCase:
        return TestCase(
            name="Water Bottle UGC",
            product_name="Hydration Water Bottle",
            product_description="A sleek, insulated water bottle that keeps drinks cold for 24 hours and hot for 12 hours.",
            product_images_urls=["./tmp/products/bottle.jpg"],
            goal="Create a tiktok style ugc video. Feature a 28yo mixed race female. No extension. Create a keyframe first, edit that image, use the two image to create separate videos, then stitch.",
            target_audience="Active individuals, athletes, and outdoor enthusiasts.",
            selling_points="Durable stainless steel construction, leak-proof lid, and eco-friendly design.",
        )

    @staticmethod
    def cleaning_kit_howto() -> TestCase:
        return TestCase(
            name="Cleaning Kit How-to",
            product_name="Eco-Friendly Cleaning Kit",
            product_description="A sustainable cleaning solution featuring a reusable glass spray bottle and concentrated cleaning tablets. Zero plastic waste.",
            product_images_urls=[
                "https://m.media-amazon.com/images/I/51EWTFRP1WL._AC_UF350,350_QL80_.jpg"
            ],
            goal="Create a step-by-step 'how-to' video. Show filling the bottle with water, dropping in the tablet, the fizzing action, and then spraying/wiping a surface. Clear, educational, and satisfying.",
            target_audience="Eco-conscious homeowners and parents.",
            selling_points="Zero waste, non-toxic ingredients, effective cleaning power, space-saving.",
        )

    @staticmethod
    def coffee_sale_promo() -> TestCase:
        return TestCase(
            name="Coffee Blend Winter Sale",
            product_name="Morning Mist Artisan Coffee",
            product_description="A premium dark roast coffee blend with rich notes of dark chocolate and cherry. Ethically sourced and small-batch roasted.",
            product_images_urls=[
                "https://i.etsystatic.com/18985863/r/il/d60c5a/3173879789/il_1080xN.3173879789_2p7u.jpg"
            ],
            goal="Create a high-energy 15-second promo video for a Winter Sale. Feature close-ups of coffee beans, slow-motion pouring, and steam rising. Add text overlay '20% OFF' and 'Limited Time Only'.",
            target_audience="Coffee enthusiasts, young professionals.",
            selling_points="Ethically sourced, fresh roasted, rich flavor profile, perfect for winter mornings.",
        )

    @staticmethod
    def skincare_routine() -> TestCase:
        return TestCase(
            name="Skincare Morning Routine",
            product_name="Radiance Vitamin C Serum",
            product_description="A lightweight, brightening serum packed with Vitamin C and Hyaluronic Acid for a natural glow.",
            product_images_urls=["https://m.media-amazon.com/images/I/71HPmlzlfdL.jpg"],
            goal="Create a 'Get Ready With Me' style video. Show the bottle texture, a dropper applying serum to skin, and a happy face with glowing skin. Soft, natural lighting, calming morning vibe.",
            target_audience="Skincare enthusiasts, women 20-40.",
            selling_points="Brightens skin, hydrates, natural ingredients, cruelty-free.",
        )

    @staticmethod
    def headphones_lifestyle() -> TestCase:
        return TestCase(
            name="Headphones Urban Lifestyle",
            product_name="SonicFlow Noise Cancelling Headphones",
            product_description="Over-ear wireless headphones with premium active noise cancellation and 30-hour battery life. Matte black finish.",
            product_images_urls=[
                "https://www.cowinaudio.com/cdn/shop/files/1602x1602-1_1b3dfa46-0a30-46a4-afe1-49f5ecadc6e0_2048x.jpg?v=1713951266"
            ],
            goal="Create a lifestyle video featuring a young creative in a busy city. Show them putting on headphones, the world going silent (visual cue), and them walking confidently. Modern, urban, cool aesthetic.",
            target_audience="Commuters, students, remote workers.",
            selling_points="Active Noise Cancellation, long battery life, comfortable fit, premium sound.",
        )

    def build(self) -> VideoGenTestSuite:
        return VideoGenTestSuite(test_cases=self.test_cases)


async def run_batch_tests():
    suite = (
        TestSuiteBuilder()
        .add_test_case(TestSuiteBuilder.water_bottle_ugc())
        .add_test_case(TestSuiteBuilder.cleaning_kit_howto())
        .add_test_case(TestSuiteBuilder.coffee_sale_promo())
        .add_test_case(TestSuiteBuilder.skincare_routine())
        .add_test_case(TestSuiteBuilder.headphones_lifestyle())
        .build()
    )
    await suite.run()


if __name__ == "__main__":
    asyncio.run(run_batch_tests())
