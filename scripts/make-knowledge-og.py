"""Create the deterministic social card used by the knowledge-hub page."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    path = Path("C:/Windows/Fonts/timesbd.ttf" if bold else "C:/Windows/Fonts/times.ttf")
    return ImageFont.truetype(str(path), size=size)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    image = Image.open(args.source).convert("RGB")
    target_ratio = 1200 / 630
    crop_height = round(image.width / target_ratio)
    top = max(0, (image.height - crop_height) // 2)
    image = image.crop((0, top, image.width, top + crop_height)).resize(
        (1200, 630), Image.Resampling.LANCZOS
    )

    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rounded_rectangle((42, 62, 650, 568), radius=28, fill=(247, 246, 239, 236))
    draw.rectangle((42, 62, 54, 568), fill=(18, 60, 54, 255))

    ink = (18, 60, 54, 255)
    muted = (55, 82, 73, 255)
    draw.text((88, 112), "DINH DƯỠNG 2598", font=font(28, True), fill=muted)
    draw.text((88, 183), "TRUNG TÂM", font=font(54, True), fill=ink)
    draw.text((88, 244), "TRI THỨC", font=font(62, True), fill=ink)
    draw.text((88, 315), "DINH DƯỠNG", font=font(56, True), fill=ink)
    draw.line((88, 408, 568, 408), fill=(167, 123, 16, 255), width=4)
    draw.text(
        (88, 438),
        "NGHIÊN CỨU · VĂN BẢN · HƯỚNG DẪN",
        font=font(21, True),
        fill=muted,
    )
    draw.text(
        (88, 492),
        "Tóm tắt có nguồn gốc để kiểm tra lại",
        font=font(22),
        fill=muted,
    )

    output = Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    output.save(args.output, "PNG", optimize=True)


if __name__ == "__main__":
    main()
