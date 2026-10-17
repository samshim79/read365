"""Build the PWA icons from icons/source.png (rounded green book tile on a cream border).
any: the tile with transparent rounded corners. maskable: full-bleed, tile scaled into the safe zone."""
from PIL import Image, ImageDraw, ImageFilter

src = Image.open("icons/source.png").convert("RGBA")
tile = src.crop((40, 26, 588, 574))  # square well inside the tile edge, so no cream border survives
n = tile.width

def rounded(img, radius, blur=0):
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, img.width - 1, img.height - 1), radius, fill=255)
    if blur:
        mask = mask.filter(ImageFilter.GaussianBlur(blur))
    out = img.copy()
    out.putalpha(mask)
    return out

for size in (192, 512):
    rounded(tile, int(n * 0.18)).resize((size, size), Image.LANCZOS).save(f"icons/icon-{size}.png")

# maskable: background = the tile's left/right edge colours blended across, so it matches the tile gradient;
# the tile sits in the 80% safe zone with a feathered edge so no seam shows
S = 512
band = (int(n * .2), int(n * .8))  # skip the corners, which still hold cream
left = tile.crop((0, band[0], 12, band[1])).convert("RGB").resize((1, S)).resize((S, S))
right = tile.crop((n - 12, band[0], n, band[1])).convert("RGB").resize((1, S)).resize((S, S))
ramp = Image.linear_gradient("L").rotate(90).resize((S, S))  # 0..255 left to right
bg = Image.composite(right, left, ramp)
fg = tile.convert("RGB").resize((int(S * .72), int(S * .72)), Image.LANCZOS)
mask = rounded(fg.convert("RGBA"), int(fg.width * .20), blur=6).getchannel("A")
bg.paste(fg, ((S - fg.width) // 2, (S - fg.height) // 2), mask)
bg.save("icons/icon-maskable-512.png")
