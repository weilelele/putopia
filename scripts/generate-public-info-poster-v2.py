from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, "/private/tmp/public-info-poster-python")

import qrcode
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "presentation" / "public-info-poster-v2.png"
BACKGROUND = ROOT / "public" / "presentation" / "public-info-poster-v2-background.png"
FONT_ROOT = Path("/Users/will/.codex/plugins/cache/claude-cowork/anthropic-skills/1.0.0/skills/canvas-design/canvas-fonts")
TARGET_URL = "https://www.multiverseco.org/public-info"

DEEP = "#080C20"
STAR = "#F5F5F5"
ORANGE = "#E35205"
ORANGE_LIGHT = "#F2783E"


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_ROOT / name), size=size)


def fit_width(image: Image.Image, width: int) -> Image.Image:
    height = round(image.height * width / image.width)
    return image.resize((width, height), Image.Resampling.LANCZOS)


def draw_centered(draw: ImageDraw.ImageDraw, text: str, y: int, chosen_font: ImageFont.FreeTypeFont, fill: str, canvas_width: int) -> None:
    box = draw.textbbox((0, 0), text, font=chosen_font)
    draw.text(((canvas_width - (box[2] - box[0])) / 2, y), text, font=chosen_font, fill=fill)


def main() -> None:
    width, height = 1440, 2160
    background = Image.open(BACKGROUND).convert("RGB").resize((width, height), Image.Resampling.LANCZOS)
    canvas = background.convert("RGBA")

    veil = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    veil_draw = ImageDraw.Draw(veil, "RGBA")
    veil_draw.rectangle((0, 0, width, 470), fill=(8, 12, 32, 164))
    veil_draw.rectangle((0, 1490, width, height), fill=(8, 12, 32, 182))
    canvas = Image.alpha_composite(canvas, veil)
    draw = ImageDraw.Draw(canvas, "RGBA")

    organization_font = font("RedHatMono-Bold.ttf", 27)
    phrase_font = font("RedHatMono-Regular.ttf", 37)
    caption_font = font("RedHatMono-Bold.ttf", 25)

    draw_centered(draw, "PARALLEL WORLD OBSERVATION ORGANIZATION", 88, organization_font, STAR, width)

    icon = fit_width(Image.open(ROOT / "public" / "assets" / "vi-icon.png").convert("RGBA"), 126)
    wordmark = fit_width(Image.open(ROOT / "public" / "assets" / "vi-wordmark.png").convert("RGBA"), 444)
    gap = 32
    group_width = icon.width + gap + wordmark.width
    group_x = (width - group_width) // 2
    icon_y = 164
    wordmark_y = icon_y + (icon.height - wordmark.height) // 2
    canvas.alpha_composite(icon, (group_x, icon_y))
    canvas.alpha_composite(wordmark, (group_x + icon.width + gap, wordmark_y))

    draw_centered(draw, "LIMITED INTELLIGENCE ABOUT US", 350, phrase_font, ORANGE_LIGHT, width)

    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=12, border=4)
    qr.add_data(TARGET_URL)
    qr.make(fit=True)
    qr_image = qr.make_image(fill_color=DEEP, back_color=STAR).convert("RGBA")
    qr_size = 390
    qr_image = qr_image.resize((qr_size, qr_size), Image.Resampling.NEAREST)
    qr_x, qr_y = (width - qr_size) // 2, 1600

    padding = 18
    draw.rectangle((qr_x - padding, qr_y - padding, qr_x + qr_size + padding, qr_y + qr_size + padding), fill=STAR)
    canvas.alpha_composite(qr_image, (qr_x, qr_y))
    draw.rectangle((qr_x - 33, qr_y - 33, qr_x + qr_size + 33, qr_y + qr_size + 33), outline=(227, 82, 5, 180), width=2)

    draw_centered(draw, "SCAN TO KNOW MORE ABOUT US", 2070, caption_font, STAR, width)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(OUTPUT, format="PNG", optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
