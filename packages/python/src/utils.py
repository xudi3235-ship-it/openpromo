from pathlib import Path
import logging
import modal
from os import PathLike

# --- types ---
StrPath = str | bytes | PathLike[str]


# --- functions ---
def translate_path(vol: modal.Volume, path: Path) -> Path:
    raise NotImplementedError


def sync_modal_vol(
    local_dir: StrPath = "./tmp",
    remote_dir: StrPath = "/inputs",
):
    import modal

    logger = get_logger(__name__)
    vol = modal.Volume.from_name("cache", create_if_missing=True)
    with vol.batch_upload(force=True) as batch:
        batch.put_directory(local_dir, remote_dir)
    logger.info(f"files synced from {local_dir} to {remote_dir}")


def fetch_remote_file_to_local(
    vol: modal.Volume,
    remote_path: str,
    local_path: str,
):
    """downloads single file"""
    logger = get_logger(__name__)

    try:
        buf = b""
        for chunk in vol.read_file(remote_path):
            buf += chunk
        with open(local_path, "wb") as f:
            f.write(buf)
        logger.info(f"Fetched {remote_path} to {local_path}")
    except Exception as e:
        logger.error(f"Failed to fetch {remote_path} to {local_path}: {e}")
        raise e


def fetch_remote_dir_to_local(
    vol: modal.Volume,
    remote_dir: str,
    local_dir: str,
):
    from modal.volume import FileEntryType

    """downloads directory"""
    logger = get_logger(__name__)
    for file in vol.listdir(remote_dir):
        _fname = Path(file.path).name
        _remote_path = file.path
        _local_path = str(Path(local_dir) / _fname)
        logger.info(f"Fetching {_remote_path} to {_local_path}")
        if file.type == FileEntryType.FILE:
            fetch_remote_file_to_local(vol, _remote_path, _local_path)
        elif file.type == FileEntryType.DIRECTORY:
            # Recursively fetch the directory
            fetch_remote_dir_to_local(vol, _remote_path, _local_path)
        else:
            err = f"Unknown file type for {_remote_path} of type {file.type}"
            raise ValueError(err)


def create_symlinks_recursive(src_dir: Path, dst_dir: Path):
    import os

    # Create the destination directory if it doesn't exist
    dst_dir.mkdir(parents=True, exist_ok=True)

    # Process all files and directories in the source directory
    for src_path in src_dir.iterdir():
        dst_path = dst_dir / src_path.name

        # If it's a file, create a symlink
        if src_path.is_file():
            # Remove existing symlink or file if any
            if dst_path.exists() or dst_path.is_symlink():
                dst_path.unlink()
            os.symlink(src_path, dst_path)
            print(f"Created symlink from {src_path} to {dst_path}")

        # If it's a directory, recursively process it
        elif src_path.is_dir():
            create_symlinks_recursive(src_path, dst_path)


def get_logger(name, level=logging.INFO):
    logger = logging.getLogger(name)
    handler = logging.StreamHandler()
    handler.setFormatter(
        logging.Formatter("%(levelname)s: %(asctime)s: %(name)s  %(message)s")
    )
    logger.addHandler(handler)
    logger.setLevel(level)
    return logger


def fetch_html_and_clean(url, timeout=10) -> str:
    """
    Fetches the HTML content at `url` and returns a plain‑text version.

    Steps:
     1. GET the page.
     2. Remove <script>…</script> and <style>…</style> blocks.
     3. Strip all other HTML tags.
     4. Decode HTML entities (e.g. &amp; → &).
     5. Collapse whitespace to single spaces.
    """
    import requests
    import re
    import html

    # 1. Fetch
    resp = requests.get(url, timeout=timeout)
    resp.raise_for_status()
    html_text = resp.text

    # 2. Remove script/style blocks
    no_scripts = re.sub(r"<script.*?>.*?</script>", "", html_text, flags=re.S | re.I)
    no_styles = re.sub(r"<style.*?>.*?</style>", "", no_scripts, flags=re.S | re.I)

    # 3. Strip all remaining tags
    no_tags = re.sub(r"<[^>]+>", "", no_styles)

    # 4. Decode HTML entities
    unescaped = html.unescape(no_tags)

    # 5. Collapse whitespace
    cleaned = re.sub(r"\s+", " ", unescaped).strip()

    return cleaned
