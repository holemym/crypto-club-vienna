"""Still frames of the hero scene for phones and reduced motion: python tools/hero_poster.py [url]
Renders the live scene with the text hidden at a phone-like and a desktop aspect, then writes
site/assets/brand/hero-poster-800.webp (phone, 4:5) and hero-poster-1600.webp (desktop, 16:9)."""
import pathlib, sys
from playwright.sync_api import sync_playwright

OUT = pathlib.Path(__file__).resolve().parent.parent / "site" / "assets" / "brand"
HIDE = ".nav,.hero-inner,.ask,.hero::after,#menu{visibility:hidden!important}.hero::after{display:none!important}"

def main():
    url = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8417/") + "?force3d=1"
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-gl=angle", "--enable-webgl", "--ignore-gpu-blocklist"])
        for w, h, scale, name in [(400, 500, 2, "hero-poster-800"), (1600, 900, 1, "hero-poster-1600")]:
            page = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=scale)
            page.goto(url, wait_until="networkidle")
            page.add_style_tag(content=HIDE)
            page.wait_for_timeout(6000)  # let the scene finish its intro and settle
            png = OUT / f"{name}.png"
            page.locator("#hero-3d").screenshot(path=str(png))
            from PIL import Image
            Image.open(png).convert("RGB").save(OUT / f"{name}.webp", quality=80, method=6)
            png.unlink()
            print(name, (OUT / f"{name}.webp").stat().st_size // 1024, "KB")
            page.close()
        b.close()

if __name__ == "__main__":
    main()
