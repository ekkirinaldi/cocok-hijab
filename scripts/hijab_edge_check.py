"""Measures whether YouCam makeup renders leak onto the hijab.

For each sample shopper it compares the original photo with cached renders and reports the
mean pixel change on hijab-coloured pixels versus skin pixels, then writes a montage of
difference maps to docs/img/hijab-edge.png. Dev-only; needs Pillow (pip install pillow).

    python3 scripts/hijab_edge_check.py
"""
import json
import statistics as st
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
MODELS = {"sari": "#2b2c30", "aisyah": "#b8989b", "maria": "#1b2642", "nisa": "#d0cbc5"}
RENDERS = ["seri-serum__n10", "seri-serum__n60", "kain-matte__merah-cabe"]


def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def dist(p, q):
    return sum((p[i] - q[i]) ** 2 for i in range(3)) ** 0.5


def measure(model, hijab_hex, skin_hex, render):
    a = Image.open(ROOT / "public/models" / f"{model}.jpg").convert("RGB")
    b = Image.open(ROOT / "public/cached" / model / f"{render}.jpg").convert("RGB").resize(a.size)
    W, H = a.size
    pa, pb = a.load(), b.load()
    hij, skin = [], []
    hj, sk = rgb(hijab_hex), rgb(skin_hex)
    for y in range(0, H, 2):
        for x in range(0, W, 2):
            d = sum(abs(pa[x, y][i] - pb[x, y][i]) for i in range(3)) / 3
            # Hijab pixels: near the hijab colour and outside the central face box.
            in_face_box = 0.3 * W < x < 0.7 * W and 0.25 * H < y < 0.75 * H
            if dist(pa[x, y], hj) < 45 and not in_face_box:
                hij.append(d)
            elif dist(pa[x, y], sk) < 40 and in_face_box:
                skin.append(d)
    diff = ImageChops.difference(a, b).convert("L").point(lambda v: min(255, v * 8))
    return {
        "hijab_px": len(hij),
        "hijab_mean": round(st.mean(hij), 2) if hij else None,
        "hijab_p99": round(sorted(hij)[int(len(hij) * 0.99)], 1) if hij else None,
        "skin_mean": round(st.mean(skin), 2) if skin else None,
    }, diff


def main():
    manifest = json.loads((ROOT / "public/cached/manifest.json").read_text())
    tile = (180, 225)
    sheet = Image.new("RGB", (tile[0] * (len(RENDERS) + 1), tile[1] * len(MODELS) + 20), "white")
    draw = ImageDraw.Draw(sheet)
    for col, label in enumerate(["original"] + RENDERS):
        draw.text((col * tile[0] + 6, 4), label, fill="black")
    results = {}
    for row, (model, hijab_hex) in enumerate(MODELS.items()):
        skin_hex = manifest[model]["tone"]["skin_color"]
        sheet.paste(Image.open(ROOT / "public/models" / f"{model}.jpg").resize(tile), (0, 20 + row * tile[1]))
        for col, render in enumerate(RENDERS, start=1):
            if not (ROOT / "public/cached" / model / f"{render}.jpg").exists():
                continue
            stats, diff = measure(model, hijab_hex, skin_hex, render)
            results[f"{model}/{render}"] = stats
            sheet.paste(diff.resize(tile).convert("RGB"), (col * tile[0], 20 + row * tile[1]))
            print(f"{model:7} {render:24} hijab mean {stats['hijab_mean']:>5} (p99 {stats['hijab_p99']:>4}, {stats['hijab_px']} px)  skin mean {stats['skin_mean']}")
    (ROOT / "docs/img").mkdir(parents=True, exist_ok=True)
    sheet.save(ROOT / "docs/img/hijab-edge.png")
    (ROOT / "docs/hijab-edge.json").write_text(json.dumps(results, indent=2) + "\n")


if __name__ == "__main__":
    main()
