"""Headless captures for reviews: python tools/capture.py <url> <out-prefix> [width ...]

Writes <out-prefix>-<width>.jpg (full page) per width. Scrolls through first so lazy content and
scroll-triggered reveals have run, then returns to the top.
"""
import sys
from playwright.sync_api import sync_playwright

def main():
    url, prefix = sys.argv[1], sys.argv[2]
    widths = [int(w) for w in sys.argv[3:]] or [1920, 500]
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for w in widths:
            page = browser.new_page(viewport={"width": w, "height": 900 if w > 800 else 900},
                                    device_scale_factor=1)
            page.goto(url, wait_until="networkidle", timeout=60000)
            # Decline cookie banners if present (privacy-preserving default)
            y = 0
            while y < page.evaluate("document.body.scrollHeight"):  # re-measured: lazy blocks grow the page
                page.evaluate(f"window.scrollTo(0,{y})"); page.wait_for_timeout(120); y += 600
            # full-page shots cannot scroll content-visibility sections into rendering; render them all
            page.add_style_tag(content=".map-sec,.bot-band,.partners,.join{content-visibility:visible!important}")
            page.evaluate("window.scrollTo(0,0)"); page.wait_for_timeout(1500)
            page.screenshot(path=f"{prefix}-{w}.jpg", full_page=True, type="jpeg", quality=72)
            print(f"{prefix}-{w}.jpg", page.evaluate("[document.documentElement.scrollWidth, innerWidth]"))
            page.close()
        browser.close()

if __name__ == "__main__":
    main()
