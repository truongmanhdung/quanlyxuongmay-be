"""One-off script to generate the app icon assets (brand square + adaptive foreground).
Draws a simple clothes-hanger mark (garment workshop) in white on the brand color.
Run: python3 assets/icon/generate_icon.py
"""
from PIL import Image, ImageDraw

BRAND = (70, 95, 255, 255)  # #465FFF
WHITE = (255, 255, 255, 255)

SUPERSAMPLE = 4
CANVAS = 1024 * SUPERSAMPLE

# Hanger path in a 100x100 unit box: hook loop center + shoulder + two arms + bowed bar
HOOK_CENTER = (50, 14)
HOOK_RADIUS = 6
SHOULDER = (50, 24)
LEFT_TIP = (14, 62)
RIGHT_TIP = (86, 62)
BAR_MID = (50, 68)


def stroke_path(draw, points, width, fill):
    for a, b in zip(points, points[1:]):
        draw.line([a, b], fill=fill, width=width)
    r = width / 2
    for x, y in points:
        draw.ellipse([x - r, y - r, x + r, y + r], fill=fill)


def to_px(pt, box_size, scale, offset):
    x, y = pt
    return (offset + x / 100 * box_size * scale, offset + y / 100 * box_size * scale)


def draw_hanger(draw, box_size, scale):
    offset = box_size * (1 - scale) / 2
    width = int(box_size * scale * 0.07)

    hook_center_px = to_px(HOOK_CENTER, box_size, scale, offset)
    hook_r_px = HOOK_RADIUS / 100 * box_size * scale
    draw.ellipse(
        [hook_center_px[0] - hook_r_px, hook_center_px[1] - hook_r_px,
         hook_center_px[0] + hook_r_px, hook_center_px[1] + hook_r_px],
        outline=WHITE, width=width,
    )

    shoulder = to_px(SHOULDER, box_size, scale, offset)
    left_tip = to_px(LEFT_TIP, box_size, scale, offset)
    right_tip = to_px(RIGHT_TIP, box_size, scale, offset)
    bar_mid = to_px(BAR_MID, box_size, scale, offset)

    stroke_path(draw, [shoulder, left_tip], width, WHITE)
    stroke_path(draw, [shoulder, right_tip], width, WHITE)
    stroke_path(draw, [left_tip, bar_mid, right_tip], width, WHITE)


def make_square_icon(path):
    img = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    radius = int(CANVAS * 0.22)
    draw.rounded_rectangle([0, 0, CANVAS, CANVAS], radius=radius, fill=BRAND)
    draw_hanger(draw, CANVAS, scale=0.62)
    img = img.resize((1024, 1024), Image.LANCZOS)
    img.save(path)


def make_foreground_icon(path):
    img = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_hanger(draw, CANVAS, scale=0.42)
    img = img.resize((1024, 1024), Image.LANCZOS)
    img.save(path)


if __name__ == "__main__":
    make_square_icon("assets/icon/icon.png")
    make_foreground_icon("assets/icon/icon_foreground.png")
    print("Generated icon.png and icon_foreground.png")
