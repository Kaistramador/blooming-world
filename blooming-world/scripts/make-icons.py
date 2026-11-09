#!/usr/bin/env python3
"""Wave 5: generate PWA icons for Blooming World.

Original artwork (§5.3): a stylized six-petal flower on a deep-green
gradient — no third-party assets. Outputs:
  public/icons/icon-192.png, icon-512.png, icon-maskable-512.png
  scripts/standalone/parts/icons/* (same set for the standalone build)
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path("/home/z/my-project")
PUBLIC = ROOT / "public" / "icons"
PARTS = ROOT / "scripts" / "standalone" / "parts" / "icons"

BG_TOP = (30, 92, 70)      # #1e5c46
BG_BOTTOM = (17, 58, 44)   # #113a2c
PETAL = (255, 138, 176)    # #ff8ab0
PETAL_DEEP = (233, 100, 145)  # #e96491
CENTER = (246, 224, 75)    # #f6e04b
CENTER_DEEP = (239, 143, 42)  # #ef8f2a


def vertical_gradient(size: int) -> Image.Image:
    img = Image.new("RGB", (size, size))
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = y / (size - 1)
        r = round(BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * t)
        g = round(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * t)
        b = round(BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * t)
        d.line([(0, y), (size, y)], fill=(r, g, b))
    return img


def draw_flower(canvas: Image.Image, cx: float, cy: float, scale: float) -> None:
    """Six petals + golden core, scale 1.0 = flower radius 0.42 * canvas."""
    size = canvas.size[0]
    petal_len = size * 0.42 * scale
    petal_w = size * 0.30 * scale
    dist = size * 0.26 * scale

    for angle in range(0, 360, 60):
        petal = Image.new("RGBA", (size * 2, size * 2), (0, 0, 0, 0))
        pd = ImageDraw.Draw(petal)
        px, py = size, size  # flower center inside the petal layer
        top = py - dist - petal_len / 2
        bottom = py - dist + petal_len / 2
        # deep outline petal (slightly larger) for depth
        pd.ellipse([px - petal_w / 2 * 1.12, top - petal_len * 0.04,
                    px + petal_w / 2 * 1.12, bottom + petal_len * 0.04],
                   fill=(*PETAL_DEEP, 255))
        pd.ellipse([px - petal_w / 2, top, px + petal_w / 2, bottom],
                   fill=(*PETAL, 255))
        # top gloss on the petal (opaque light pink, at the outer tip)
        pd.ellipse([px - petal_w * 0.30, top + petal_len * 0.06,
                    px + petal_w * 0.02, top + petal_len * 0.26],
                   fill=(255, 183, 208, 255))
        petal = petal.rotate(angle, center=(px, py), resample=Image.BICUBIC)
        # crop so that petal-layer point (px,py) maps to canvas point (cx,cy)
        ox, oy = int(px - cx), int(py - cy)
        canvas.alpha_composite(petal.crop((ox, oy, ox + size, oy + size)), dest=(0, 0))

    core_r = size * 0.15 * scale
    d = ImageDraw.Draw(canvas)
    d.ellipse([cx - core_r * 1.08, cy - core_r * 1.08, cx + core_r * 1.08, cy + core_r * 1.08],
              fill=(*CENTER_DEEP, 255))
    d.ellipse([cx - core_r, cy - core_r, cx + core_r, cy + core_r], fill=(*CENTER, 255))
    d.ellipse([cx - core_r * 0.42, cy - core_r * 0.52, cx - core_r * 0.02, cy - core_r * 0.12],
              fill=(255, 255, 255, 170))


def rounded_icon(size: int, radius_ratio: float = 0.22) -> Image.Image:
    bg = vertical_gradient(size).convert("RGBA")
    draw_flower(bg, size / 2, size / 2, 1.0)
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * radius_ratio), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(bg, (0, 0), mask)
    return out


def maskable_icon(size: int) -> Image.Image:
    """Full-bleed square; flower shrunk into the 80% safe zone."""
    bg = vertical_gradient(size).convert("RGBA")
    draw_flower(bg, size / 2, size / 2, 0.66)
    return bg


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    PARTS.mkdir(parents=True, exist_ok=True)
    outputs = {
        "icon-192.png": rounded_icon(192),
        "icon-512.png": rounded_icon(512),
        "icon-maskable-512.png": maskable_icon(512),
    }
    for name, img in outputs.items():
        for dst in (PUBLIC / name, PARTS / name):
            img.save(dst, "PNG", optimize=True)
            print(f"OK {dst} ({dst.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
