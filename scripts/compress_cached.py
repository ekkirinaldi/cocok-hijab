"""YouCam returns try-on results as full-size PNGs (~850 KB). prerender.mjs saves them under
.jpg names; this re-encodes them as real JPEGs (~130 KB) so the repo and deploy stay small.
Dev-only; needs Pillow.

    python3 scripts/compress_cached.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
converted = 0
for f in (ROOT / "public/cached").glob("*/*.jpg"):
    im = Image.open(f)
    if im.format != "JPEG":
        im.convert("RGB").save(f, "JPEG", quality=85, optimize=True, progressive=True)
        converted += 1
print(f"converted {converted} renders")
