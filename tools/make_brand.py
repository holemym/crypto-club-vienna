"""Round 4: web files from the club's own logo and photos (sources in _brand/, see fetch_brand.py).

Logo: the club has no SVG or transparent file, only white-on-black PNGs. Alpha is taken from
luminance, so the drawing itself is unchanged; saturated pixels (the violet chart behind the
lockup in CCV-2) are dropped. Replace with their SVG when it arrives.
Photos: resized to 1600 and 800 wide webp for srcset, metadata stripped.
"""
import pathlib, urllib.request
from PIL import Image, ImageOps

HERE = pathlib.Path(__file__).resolve().parent.parent
SRC = HERE / "_brand"
BRAND = HERE / "site" / "assets" / "brand"
PHOTOS = HERE / "site" / "assets" / "photos"

def src(fragment):
    return next(p for p in SRC.iterdir() if fragment in p.name)

def white_on_alpha(path, floor=0.10):
    im = Image.open(path).convert("RGB")
    hsv = im.convert("HSV")
    L = im.convert("L")
    S = hsv.getchannel("S")
    # luminance → alpha, then knock out coloured pixels (chart bars) and the black floor
    a = L.point(lambda v: 0 if v < floor * 255 else min(255, int((v - floor * 255) / (1 - floor))))
    mask = S.point(lambda s: 255 if s < 70 else 0)
    a = Image.composite(a, Image.new("L", im.size, 0), mask)
    out = Image.new("RGBA", im.size, (255, 255, 255, 0))
    out.putalpha(a)
    bbox = a.point(lambda v: 255 if v > 24 else 0).getbbox()
    return out.crop(bbox)

def save_logo(img, name, widths):
    for w in widths:
        h = round(img.height * w / img.width)
        r = img.resize((w, h), Image.LANCZOS)
        r.save(BRAND / f"{name}-{w}.png", optimize=True)
        r.save(BRAND / f"{name}-{w}.webp", quality=92, method=6)
        print(f"{name}-{w}", r.size)

def main():
    BRAND.mkdir(parents=True, exist_ok=True)
    PHOTOS.mkdir(parents=True, exist_ok=True)

    lockup = white_on_alpha(src("CCV-2-scaled"))
    save_logo(lockup, "ccv-lockup", [320, 1200])
    mark = white_on_alpha(src("назви-28"))
    save_logo(mark, "ccv-mark", [160, 512])

    # favicon: the club's own cropped site icon (on black)
    fav = HERE / "_brand" / "cropped-CCV-2-scaled-1.png"
    if not fav.exists():
        url = "https://cryptoclubvienna.com/wp-content/uploads/2026/02/cropped-CCV-2-scaled-1.png"
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})) as r:
            fav.write_bytes(r.read())
    f = Image.open(fav).convert("RGB")
    for s, name in [(32, "favicon-32.png"), (180, "apple-touch-icon.png"), (512, "icon-512.png")]:
        f.resize((s, s), Image.LANCZOS).save(BRAND / name, optimize=True)

    photos = {
        "kickoff-stage": "IMG_9271-scaled",
        "stage-thanks": "IMG_9231-scaled",
        "networking": "IMG_0890-scaled",
        "seated-group": "IMG_0917-scaled",
        "crowd": "IMG_0933-scaled",
        "audience": "IMG_2184-scaled",
        "crowd-above": "IMG_2427-scaled",
        "poster-going-onchain": "2026_09_64-scaled",
        "poster-summit-360": "What-your-asset",
    }
    for name, frag in photos.items():
        im = ImageOps.exif_transpose(Image.open(src(frag))).convert("RGB")
        for w in (1600, 800):
            if im.width < w and w != 800:
                continue
            h = round(im.height * w / im.width)
            im.resize((w, h), Image.LANCZOS).save(PHOTOS / f"{name}-{w}.webp", quality=78, method=6)
        print(name, im.size, round(im.width / im.height, 3))

if __name__ == "__main__":
    main()
