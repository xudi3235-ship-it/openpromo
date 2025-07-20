"""
Testing hybrid approach of LLMs(w/ Vision) + CUA models.

1. capture state
2. initial visual analysis(optional)
3. DOM Pre-processing and Pruning -> use bs4
4. Multi-modal prompting: goal, visual context, DOM context
5. leverage tool calls for complex actions
"""

from playwright.async_api import async_playwright
import bs4
import openai
from dotenv import load_dotenv
import asyncio

load_dotenv()


async def gen_playwright_locator_llm(user_goal: str, dom_rep: str) -> str:
    sys_prompt = f"""
    You are an expert in playwright api locators.
    You will be given a cleaned-up representation of DOM structure of all interactive elements, and return a playwright locator for the right element based on goal, use the very precise locator
    Return the locators in a structured format suitable for Playwright.
    here is User Goal: {user_goal}
    HTML Content: {dom_rep}
    RULES:
    1. output the locator directly, which will be used in
    page.click("YOUR_LOCATOR_HERE")...
    DO NOT include page.click() or any other function call, just return the locator string.
    2. prefer to use class which is unique to select the elements
    3. return only the locator string without any quotes, backticks, or extra formatting
    4. Use text locators like 'text=Use QR code' for text-based selection
    """
    print("=== SYSTEM PROMPT ===")
    openai_client = openai.AsyncClient()
    response = await openai_client.responses.create(
        model="gpt-4.1-nano",
        input=[
            {"role": "system", "content": sys_prompt},
        ],
        max_output_tokens=50,
        temperature=0,
    )
    locator = response.output_text.strip()
    # Clean up any unwanted formatting from LLM response
    locator = locator.strip("\"`'")
    return locator


def extract_interactive_elements(
    html_content: str,
) -> list[dict[str, str | None]]:
    """
    Extract interactive elements from HTML content for LLM processing.

    Args:
        html_content (str): Raw HTML content

    Returns:
        list: List of interactive element dictionaries with relevant attributes
    """
    soup = bs4.BeautifulSoup(html_content, "html.parser")

    # Define interactive element selectors
    interactive_selectors = [
        "button",
        "input",
        "select",
        "textarea",
        "a",
        '[role="button"]',
        '[role="link"]',
        '[role="textbox"]',
        "[onclick]",
        "[data-testid]",
        "[aria-label]",
    ]

    interactive_elements = []

    for selector in interactive_selectors:
        elements = soup.select(selector)
        for elem in elements:
            # Skip hidden or non-actionable elements
            style = elem.get("style", "")
            if "display:none" in style.replace(
                " ", ""
            ) or "visibility:hidden" in style.replace(" ", ""):
                continue

            element_info = {
                "tag": elem.name,
                "text": elem.get_text(strip=True)[:100],  # Limit text length
                "id": elem.get("id"),
                "class": " ".join(elem.get("class", [])),
                "role": elem.get("role"),
                "aria_label": elem.get("aria-label"),
                "data_testid": elem.get("data-testid"),
                "type": elem.get("type"),
                "href": elem.get("href"),
                "placeholder": elem.get("placeholder"),
            }

            # Only include elements with meaningful attributes
            if any(v for v in element_info.values() if v):
                interactive_elements.append(element_info)

    # Remove duplicates
    seen = set()
    unique_elements = []
    for elem in interactive_elements:
        # Create a simple hash based on key attributes
        elem_hash = (elem["tag"], elem["id"], elem["text"][:50])
        if elem_hash not in seen:
            seen.add(elem_hash)
            unique_elements.append(elem)

    return unique_elements


def print_interactive_elements(elements, limit=20):
    """Print interactive elements in a structured format for LLM consumption."""
    print("=== INTERACTIVE ELEMENTS FOR LLM ===")
    for i, elem in enumerate(elements[:limit]):
        print(f"\n[{i + 1}] {elem['tag'].upper()}")
        if elem["text"]:
            print(f"  Text: {elem['text']}")
        if elem["id"]:
            print(f"  ID: {elem['id']}")
        if elem["class"]:
            print(f"  Class: {elem['class']}")
        if elem["aria_label"]:
            print(f"  Aria-label: {elem['aria_label']}")
        if elem["data_testid"]:
            print(f"  Data-testid: {elem['data_testid']}")
        if elem["type"]:
            print(f"  Type: {elem['type']}")
        if elem["placeholder"]:
            print(f"  Placeholder: {elem['placeholder']}")


async def main():
    async with async_playwright() as p:
        context = await p.chromium.launch_persistent_context(
            user_data_dir="./tmp",
            headless=False,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-web-security",
                "--disable-features=VizDisplayCompositor",
                "--no-first-run",
                "--disable-default-apps",
                "--disable-extensions-file-access-check",
                "--disable-extensions-http-throttling",
                "--disable-ipc-flooding-protection",
            ],
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        )

        page = await context.new_page()

        # Set additional headers to appear more authentic
        await page.set_extra_http_headers(
            {
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "Accept-Encoding": "gzip, deflate, br",
                "Accept-Language": "en-US,en;q=0.9",
                "Cache-Control": "no-cache",
                "Pragma": "no-cache",
                "Sec-Ch-Ua": '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": '"macOS"',
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-User": "?1",
                "Upgrade-Insecure-Requests": "1",
            }
        )

        # Add viewport for realistic screen size
        await page.set_viewport_size({"width": 1280, "height": 720})

        await page.goto("https://www.tiktok.com/tiktokstudio/upload?from=webapp")
        await page.wait_for_load_state("networkidle")

        # load the page content
        content = await page.content()

        # Extract and display interactive elements
        interactive_elements = extract_interactive_elements(content)

        locator = await gen_playwright_locator_llm(
            "Click on the 'Use QR code' button to upload a video",
            str(interactive_elements),
        )
        print(f"Generated Playwright Locator: {locator}")
        print_interactive_elements(interactive_elements)

        try:
            await page.click(locator, timeout=5000)
        except Exception as e:
            print(f"Error clicking element: {e}")

        # Keep the browser open for manual inspection (optional)
        input("Press Enter to close the browser...")
        await context.close()


if __name__ == "__main__":
    asyncio.run(main())
