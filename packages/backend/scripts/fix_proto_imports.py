#!/usr/bin/env python3
"""
Post-process buf generated code to fix imports for the src/gen directory structure.
Run this after `buf generate proto`.
"""

import re
from pathlib import Path

GEN_DIR = Path(__file__).parent.parent / "src" / "gen"

# Pyright ignore comment to add at top of generated files
PYRIGHT_IGNORE = "# pyright: reportMissingTypeArgument=false\n"


def fix_imports(file_path: Path) -> None:
    """Fix absolute imports to relative imports in generated connect files."""
    content = file_path.read_text()
    original_content = content

    # Pattern: import <package>.v1.<name>_pb2 as <alias>
    # Replace with: from . import <name>_pb2 as <alias>
    pattern = r"^import \S+\.(\w+_pb2) as (\S+)$"
    replacement = r"from . import \1 as \2"

    content = re.sub(pattern, replacement, content, flags=re.MULTILINE)

    # Add pyright ignore at top if not already present
    if PYRIGHT_IGNORE not in content:
        # Insert after the first comment block (the "DO NOT EDIT" header)
        lines = content.split("\n")
        insert_idx = 0
        for i, line in enumerate(lines):
            if line.startswith("#"):
                insert_idx = i + 1
            else:
                break
        lines.insert(insert_idx, PYRIGHT_IGNORE.strip())
        content = "\n".join(lines)

    if content != original_content:
        file_path.write_text(content)
        print(f"Fixed {file_path}")


def main():
    if not GEN_DIR.exists():
        print(f"Gen directory not found: {GEN_DIR}")
        return

    # Find all *_connect.py files
    for connect_file in GEN_DIR.rglob("*_connect.py"):
        fix_imports(connect_file)

    # Create __init__.py files if missing
    for dir_path in GEN_DIR.rglob("*"):
        if dir_path.is_dir():
            init_file = dir_path / "__init__.py"
            if not init_file.exists():
                init_file.write_text("# Generated package\n")
                print(f"Created {init_file}")

    # Also check the gen dir itself
    gen_init = GEN_DIR / "__init__.py"
    if not gen_init.exists():
        gen_init.write_text("# Generated proto code package\n")
        print(f"Created {gen_init}")


if __name__ == "__main__":
    main()
