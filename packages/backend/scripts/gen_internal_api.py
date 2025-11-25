#!/usr/bin/env python3
"""
Generate Python SDK from OpenAPI spec for internal API.

Usage:
    uv run python scripts/gen_internal_api.py

Prerequisites:
    1. Generate the OpenAPI spec first:
       cd packages/core && pnpm gen:openapi

    2. Run this script to generate Python SDK:
       cd packages/backend && uv run python scripts/gen_internal_api.py
"""

import shutil
import subprocess
import sys
from pathlib import Path


def main():
    backend_dir = Path(__file__).parent.parent
    openapi_spec = backend_dir.parent / "dash" / "worker" / "openapi-internal.json"
    output_dir = backend_dir / "src" / "sdks" / "internal_api"
    temp_dir = backend_dir / "src" / "sdks" / "_internal_api_temp"

    if not openapi_spec.exists():
        print(f"Error: OpenAPI spec not found at {openapi_spec}")
        print("Run 'cd packages/core && pnpm gen:openapi' first")
        sys.exit(1)

    print(f"Generating SDK from {openapi_spec}")

    # Clean temp directory
    if temp_dir.exists():
        shutil.rmtree(temp_dir)

    # Generate SDK to temp directory with custom package name
    result = subprocess.run(
        [
            "uv",
            "run",
            "openapi-python-client",
            "generate",
            "--path",
            str(openapi_spec),
            "--output-path",
            str(temp_dir),
            "--overwrite",
            "--config",
            "/dev/stdin",
        ],
        input=b"package_name_override: internal_api\nproject_name_override: internal-api\n",
        capture_output=True,
    )

    if result.returncode != 0:
        print(f"Error generating SDK: {result.stderr.decode()}")
        sys.exit(1)

    # Move the nested package up
    generated_package = temp_dir / "internal_api"
    if not generated_package.exists():
        print(f"Error: Generated package not found at {generated_package}")
        sys.exit(1)

    # Remove old SDK and replace with new one
    if output_dir.exists():
        shutil.rmtree(output_dir)

    _ = shutil.move(str(generated_package), str(output_dir))

    # Clean up temp directory
    shutil.rmtree(temp_dir)

    print(f"SDK generated successfully at {output_dir}")
    print("\nUsage:")
    print("  from src.sdks.internal_api import AuthenticatedClient")
    print("  from src.sdks.internal_api.api.internal import video_job_update")
    print(
        "  from src.sdks.internal_api.models import VideoJobUpdateBody, VideoJobUpdateBodyEvent"
    )


if __name__ == "__main__":
    main()
