#!/usr/bin/env python3
"""Generate placeholder magazine covers (A4 ratio), PWA icons and splash mark."""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = "/home/z/my-project/work/assets"
os.makedirs(f"{OUT}/covers", exist_ok=True)
os.makedirs("/home/z/my-project/public/icons", exist_ok=True)

GREEN = (39, 69, 64)        # #274540
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_R = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

# A4 ratio 210:297 -> 620 x 876
CW, CH = 620, 876

covers = [
    ("african-business-review", "AFRICAN", "BUSINESS", "REVIEW", (39, 69, 64), (222, 184, 91)),
    ("tech-frontier", "TECH", "FRONTIER", "AFRICA", (24, 34, 44), (86, 198, 172)),
    ("cape-lifestyle", "CAPE", "LIFE &", "STYLE", (196, 94, 66), (247, 232, 218)),
    ("health-wellness", "HEALTH &", "WELLNESS", "JOURNAL", (46, 104, 86), (232, 244, 236)),
    ("wander-travel", "WANDER", "TRAVEL", "SOUTH AFRICA", (23, 66, 102), (240, 214, 160)),
    ("design-build", "DESIGN &", "BUILD", "QUARTERLY", (58, 58, 58), (214, 178, 94)),
    ("karoo-stories", "KAROO", "STORIES", "MAGAZINE", (110, 76, 55), (238, 224, 205)),
]

def rounded(draw, xy, r, fill):
    draw.rounded_rectangle(xy, radius=r, fill=fill)

for slug, l1, l2, l3, bg, accent in covers:
    im = Image.new("RGB", (CW, CH), bg)
    d = ImageDraw.Draw(im)
    # subtle vertical band blocks (editorial look)
    d.rectangle([0, 0, CW, 14], fill=accent)
    d.rectangle([0, CH-160, CW, CH], fill=tuple(max(0, c-28) for c in bg))
    # big ghost circle
    ghost = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    gd = ImageDraw.Draw(ghost)
    gd.ellipse([CW-330, 60, CW+180, 570], fill=accent + (38,))
    im = Image.alpha_composite(im.convert("RGBA"), ghost).convert("RGB")
    d = ImageDraw.Draw(im)
    # masthead
    f_big = ImageFont.truetype(FONT_B, 84)
    f_mid = ImageFont.truetype(FONT_B, 62)
    f_small = ImageFont.truetype(FONT_R, 26)
    x = 48
    y = 120
    for line, fnt in ((l1, f_mid), (l2, f_big), (l3, f_mid)):
        d.text((x, y), line, font=fnt, fill=(255, 255, 255) if sum(bg) < 400 else bg)
        w = d.textlength(line, font=fnt)
        d.rectangle([x, y + 102, x + max(w, 220), y + 110], fill=accent)
        y += 140
    # demo stamp + rule lines
    d.text((x, CH - 240), "DEMO ISSUE  ·  VOL. 1", font=f_small, fill=accent)
    d.line([x, CH - 200, CW - x, CH - 200], fill=accent, width=2)
    d.text((x, CH - 180), "pigeon press", font=ImageFont.truetype(FONT_R, 22), fill=(255, 255, 255))
    im.save(f"{OUT}/covers/{slug}.png")
    print("cover", slug, im.size, f"ratio {CW/CH:.4f} (A4=0.7071)")

# ---- PWA icons: 512, 192, apple-touch 180, favicon source 64 ----
def make_icon(size):
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    r = int(size * 0.22)
    d.rounded_rectangle([0, 0, size, size], radius=r, fill=GREEN)
    # soft accent ring
    pad = int(size * 0.10)
    d.ellipse([pad, pad, size - pad, size - pad], outline=(255, 255, 255, 40), width=max(2, size // 64))
    # white "P" mark
    f = ImageFont.truetype(FONT_B, int(size * 0.52))
    t = "P"
    w = d.textlength(t, font=f)
    bbox = f.getbbox(t)
    d.text(((size - w) / 2, (size - bbox[1] - bbox[3]) / 2 - size * 0.02), t,
           font=f, fill=(255, 255, 255, 255))
    return im

for s in (512, 192, 180, 64):
    make_icon(s).save(f"/home/z/my-project/public/icons/icon-{s}.png")
    print("icon", s)

# favicon via Next convention: src/app/icon.png
make_icon(64).save("/home/z/my-project/src/app/icon.png")

# white splash mark on transparent (for splash + glass header)
mark = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
d = ImageDraw.Draw(mark)
f = ImageFont.truetype(FONT_B, 300)
w = d.textlength("P", font=f)
bbox = f.getbbox("P")
d.text(((512 - w) / 2, (512 - bbox[1] - bbox[3]) / 2), "P", font=f, fill=(255, 255, 255, 255))
mark.save("/home/z/my-project/public/icons/logo-mark.png")
print("mark ok")
