from __future__ import annotations

import random
import sys
from pathlib import Path

sys.path.insert(0, "/private/tmp/public-info-poster-python")

import qrcode
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "presentation" / "public-info-poster.png"
FONT_ROOT = Path("/Users/will/.codex/plugins/cache/claude-cowork/anthropic-skills/1.0.0/skills/canvas-design/canvas-fonts")
TARGET_URL = "https://www.multiverseco.org/public-info"

DEEP = "#080C20"
VOID = "#10162D"
STAR = "#F5F5F5"
ORANGE = "#E35205"
ORANGE_LIGHT = "#F2783E"


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_ROOT / name), size=size)


def fit_image(image: Image.Image, width: int) -> Image.Image:
    height = round(image.height * width / image.width)
    return image.resize((width, height), Image.Resampling.LANCZOS)


def centered_text(draw: ImageDraw.ImageDraw, text: str, y: int, chosen_font: ImageFont.FreeTypeFont, fill: str, canvas_width: int) -> None:
    box = draw.textbbox((0, 0), text, font=chosen_font)
    draw.text(((canvas_width - (box[2] - box[0])) / 2, y), text, font=chosen_font, fill=fill)


def main() -> None:
    width, height = 1440, 2160
    canvas = Image.new("RGB", (width, height), DEEP)
    draw = ImageDraw.Draw(canvas, "RGBA")

    random.seed(2026)
    for _ in range(190):
        x = random.randrange(72, width - 72)
        y = random.randrange(72, height - 72)
        radius = random.choice((1, 1, 1, 2))
        alpha = random.randrange(18, 58)
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(245, 245, 245, alpha))

    for y in range(88, height - 88, 7):
        draw.line((72, y, width - 72, y), fill=(245, 245, 245, 4), width=1)

    draw.rectangle((72, 72, width - 72, height - 72), outline=(245, 245, 245, 26), width=2)
    draw.line((72, 282, width - 72, 282), fill=(227, 82, 5, 130), width=2)

    icon = fit_image(Image.open(ROOT / "public" / "assets" / "vi-icon.png").convert("RGBA"), 142)
    wordmark = fit_image(Image.open(ROOT / "public" / "assets" / "vi-wordmark.png").convert("RGBA"), 445)
    canvas.paste(icon, (98, 105), icon)
    canvas.paste(wordmark, (266, 126), wordmark)

    label_font = font("RedHatMono-Bold.ttf", 24)
    body_font = font("RedHatMono-Regular.ttf", 31)
    title_font = font("RedHatMono-Bold.ttf", 50)
    statement_font = font("RedHatMono-Regular.ttf", 53)
    statement_bold = font("RedHatMono-Bold.ttf", 67)

    draw.text((98, 345), "PARALLEL WORLD", font=title_font, fill=STAR)
    draw.text((98, 405), "OBSERVATION ORGANIZATION", font=title_font, fill=STAR)
    draw.text((102, 492), "PUBLIC INTELLIGENCE FILE  /  LIMITED ACCESS", font=label_font, fill=ORANGE_LIGHT)

    center_x, center_y = width // 2, 930
    for radius, alpha, stroke in ((344, 78, 2), (292, 52, 2), (226, 80, 2), (144, 42, 1)):
        draw.ellipse((center_x - radius, center_y - radius, center_x + radius, center_y + radius), outline=(227, 82, 5, alpha), width=stroke)
    draw.arc((center_x - 325, center_y - 325, center_x + 325, center_y + 325), 214, 334, fill=(242, 120, 62, 230), width=8)
    draw.arc((center_x - 264, center_y - 264, center_x + 264, center_y + 264), 22, 142, fill=(245, 245, 245, 108), width=2)
    draw.line((center_x - 402, center_y, center_x + 402, center_y), fill=(245, 245, 245, 42), width=1)
    draw.line((center_x, center_y - 402, center_x, center_y + 402), fill=(245, 245, 245, 42), width=1)
    draw.ellipse((center_x - 8, center_y - 8, center_x + 8, center_y + 8), fill=ORANGE_LIGHT)

    centered_text(draw, "LIMITED", 812, statement_font, STAR, width)
    centered_text(draw, "INTELLIGENCE", 884, statement_bold, ORANGE_LIGHT, width)
    centered_text(draw, "ABOUT US", 976, statement_font, STAR, width)

    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=13, border=4)
    qr.add_data(TARGET_URL)
    qr.make(fit=True)
    qr_image = qr.make_image(fill_color=DEEP, back_color=STAR).convert("RGB")
    qr_size = 468
    qr_image = qr_image.resize((qr_size, qr_size), Image.Resampling.NEAREST)
    qr_x, qr_y = (width - qr_size) // 2, 1354
    draw.rectangle((qr_x - 20, qr_y - 20, qr_x + qr_size + 20, qr_y + qr_size + 20), fill=STAR)
    canvas.paste(qr_image, (qr_x, qr_y))

    mark = 38
    offset = 34
    for x, y, sx, sy in (
        (qr_x - offset, qr_y - offset, 1, 1),
        (qr_x + qr_size + offset, qr_y - offset, -1, 1),
        (qr_x - offset, qr_y + qr_size + offset, 1, -1),
        (qr_x + qr_size + offset, qr_y + qr_size + offset, -1, -1),
    ):
        draw.line((x, y, x + sx * mark, y), fill=ORANGE, width=5)
        draw.line((x, y, x, y + sy * mark), fill=ORANGE, width=5)

    centered_text(draw, "SCAN TO KNOW MORE ABOUT US", 1902, body_font, STAR, width)
    centered_text(draw, "WWW.MULTIVERSECO.ORG/PUBLIC-INFO", 1963, label_font, ORANGE_LIGHT, width)
    centered_text(draw, "SIGNAL ACQUIRED  ·  ACCESS POINT 01", 2050, label_font, (245, 245, 245, 120), width)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUTPUT, format="PNG", optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
