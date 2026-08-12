from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, "/private/tmp/public-info-poster-python")

import qrcode
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "presentation" / "public-info-poster-v3.png"
BACKGROUND = ROOT / "public" / "presentation" / "public-info-poster-v3-background.png"
FONT_ROOT = Path(
    "/Users/will/.codex/plugins/cache/claude-cowork/anthropic-skills/1.0.0/skills/"
    "canvas-design/canvas-fonts"
)
TARGET_URL = "https://www.multiverseco.org/public-info"

DEEP = "#080C20"
STAR = "#F5F5F2"
ORANGE = "#E95A0C"


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_ROOT / name), size=size)


def draw_centered(
    draw: ImageDraw.ImageDraw,
    text: str,
    y: int,
    chosen_font: ImageFont.FreeTypeFont,
    fill: str,
    canvas_width: int,
    tracking: int = 0,
) -> None:
    if tracking == 0:
        box = draw.textbbox((0, 0), text, font=chosen_font)
        draw.text(((canvas_width - (box[2] - box[0])) / 2, y), text, font=chosen_font, fill=fill)
        return

    widths = [draw.textlength(character, font=chosen_font) for character in text]
    total = sum(widths) + tracking * max(0, len(text) - 1)
    x = (canvas_width - total) / 2
    for character, character_width in zip(text, widths):
        draw.text((x, y), character, font=chosen_font, fill=fill)
        x += character_width + tracking


def resize_for_visible_width(image: Image.Image, visible_width: int) -> tuple[Image.Image, tuple[int, int, int, int]]:
    bounds = image.getbbox()
    if bounds is None:
        raise ValueError("Logo asset is empty")
    scale = visible_width / (bounds[2] - bounds[0])
    resized = image.resize(
        (round(image.width * scale), round(image.height * scale)),
        Image.Resampling.LANCZOS,
    )
    resized_bounds = tuple(round(value * scale) for value in bounds)
    return resized, resized_bounds


def composite_visible_centered(
    canvas: Image.Image,
    image: Image.Image,
    bounds: tuple[int, int, int, int],
    visible_top: int,
    canvas_width: int,
) -> int:
    visible_width = bounds[2] - bounds[0]
    x = round((canvas_width - visible_width) / 2 - bounds[0])
    y = visible_top - bounds[1]
    canvas.alpha_composite(image, (x, y))
    return visible_top + bounds[3] - bounds[1]


def main() -> None:
    width, height = 1440, 2160
    canvas = Image.open(BACKGROUND).convert("RGBA").resize(
        (width, height), Image.Resampling.LANCZOS
    )

    veil = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    veil_draw = ImageDraw.Draw(veil, "RGBA")
    veil_draw.rectangle((0, 0, width, 400), fill=(5, 9, 25, 148))
    veil_draw.ellipse((260, 585, 1180, 1505), fill=(3, 7, 18, 96))
    veil_draw.rectangle((0, 1530, width, height), fill=(5, 9, 25, 188))
    canvas = Image.alpha_composite(canvas, veil)
    draw = ImageDraw.Draw(canvas, "RGBA")

    organization_font = font("RedHatMono-Bold.ttf", 25)
    phrase_font = font("RedHatMono-Regular.ttf", 39)
    caption_font = font("RedHatMono-Bold.ttf", 25)

    draw_centered(
        draw,
        "PARALLEL WORLD OBSERVATION ORGANIZATION",
        92,
        organization_font,
        STAR,
        width,
        tracking=3,
    )
    draw_centered(
        draw,
        "LIMITED INTELLIGENCE ABOUT US",
        260,
        phrase_font,
        ORANGE,
        width,
        tracking=4,
    )

    # The canonical symbol and wordmark form one oversized, centered vertical totem.
    icon, icon_bounds = resize_for_visible_width(
        Image.open(ROOT / "public" / "assets" / "vi-icon.png").convert("RGBA"),
        650,
    )
    wordmark, wordmark_bounds = resize_for_visible_width(
        Image.open(ROOT / "public" / "assets" / "vi-wordmark.png").convert("RGBA"),
        920,
    )
    icon_bottom = composite_visible_centered(canvas, icon, icon_bounds, 720, width)
    composite_visible_centered(canvas, wordmark, wordmark_bounds, icon_bottom + 54, width)

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=12,
        border=4,
    )
    qr.add_data(TARGET_URL)
    qr.make(fit=True)
    qr_image = qr.make_image(fill_color=DEEP, back_color=STAR).convert("RGBA")
    qr_size = 350
    qr_image = qr_image.resize((qr_size, qr_size), Image.Resampling.NEAREST)
    qr_x, qr_y = (width - qr_size) // 2, 1640

    padding = 18
    draw.rectangle(
        (qr_x - padding, qr_y - padding, qr_x + qr_size + padding, qr_y + qr_size + padding),
        fill=STAR,
    )
    canvas.alpha_composite(qr_image, (qr_x, qr_y))
    draw.rectangle(
        (qr_x - 31, qr_y - 31, qr_x + qr_size + 31, qr_y + qr_size + 31),
        outline=(233, 90, 12, 190),
        width=2,
    )

    draw_centered(
        draw,
        "SCAN TO KNOW MORE ABOUT US",
        2068,
        caption_font,
        STAR,
        width,
        tracking=3,
    )

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(OUTPUT, format="PNG", optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
