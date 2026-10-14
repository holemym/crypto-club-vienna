"""Assertions for a round: python tools/check.py <url>
At 390 and 1440: scrollWidth == innerWidth, zero console errors, zero failed requests,
live state set, gallery visible, every in-page anchor resolves."""
import sys
from playwright.sync_api import sync_playwright

def main():
    url = sys.argv[1]
    ok = True
    with sync_playwright() as p:
        b = p.chromium.launch()
        for w in (390, 1440):
            page = b.new_page(viewport={"width": w, "height": 900})
            errors, failed = [], []
            page.on("console", lambda m: m.type == "error" and errors.append(m.text))
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("requestfailed", lambda r: failed.append(r.url))
            page.on("response", lambda r: r.status >= 400 and failed.append(f"{r.status} {r.url}"))
            page.goto(url, wait_until="load")
            y = 0
            while y < page.evaluate("document.body.scrollHeight"):  # re-measured: lazy blocks grow the page
                page.evaluate(f"window.scrollTo(0,{y})"); page.wait_for_timeout(80); y += 700
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)"); page.wait_for_timeout(300)
            page.wait_for_timeout(1600)
            r = page.evaluate("""() => ({
              sw: document.documentElement.scrollWidth, iw: innerWidth,
              state: document.documentElement.dataset.state,
              gallery: !document.getElementById('gallery').hidden,
              deadAnchors: [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href')).filter(h => h.length > 1 && !document.querySelector(h)),
              imgsBroken: [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src),
              motion: document.querySelectorAll('[data-m]').length,
              stuck: [...document.querySelectorAll('[data-m]')].filter(el => !el.closest('[hidden]') && (!el.classList.contains('is-in') || getComputedStyle(el).opacity === '0')).map(el => el.className || el.tagName).slice(0, 8),
            })""")
            line_ok = r["sw"] == r["iw"] and not errors and not failed and not r["deadAnchors"] and not r["imgsBroken"] and not r["stuck"]
            ok &= line_ok
            print(w, "OK" if line_ok else "FAIL", r, "errors:", errors, "failed:", failed)
            page.close()
        b.close()
    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
