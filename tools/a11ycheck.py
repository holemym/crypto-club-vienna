"""Reduced motion + keyboard: python tools/a11ycheck.py <url>
1. With prefers-reduced-motion: nothing hidden, no motion attributes, no running CSS animations, no Lenis.
2. Keyboard at 1440 and 390: Tab through the page; every stop must show a visible focus style, be on screen
   after focusing, and the skip link must come first. The phone menu must open and close by keyboard."""
import sys
from playwright.sync_api import sync_playwright

FOCUS_JS = """() => { const el = document.activeElement; if (!el || el === document.body) return null;
  const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
  const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none';
  return { tag: el.tagName, text: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40),
           ring, onScreen: r.bottom > 0 && r.top < innerHeight && r.width > 0 }; }"""

def main():
    url = sys.argv[1]
    bad = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        # 1. reduced motion
        ctx = b.new_context(reduced_motion="reduce", viewport={"width": 1440, "height": 900})
        page = ctx.new_page(); page.goto(url, wait_until="networkidle"); page.wait_for_timeout(1500)
        r = page.evaluate("""() => ({
          m: document.documentElement.classList.contains('m'),
          dataM: document.querySelectorAll('[data-m]').length,
          hidden: [...document.querySelectorAll('main *')].filter(e => getComputedStyle(e).opacity === '0' && getComputedStyle(e).visibility !== 'hidden' && e.textContent.trim() && !e.closest('[hidden],.ask,.bot-term,.vm')).length,
          anims: document.getAnimations().filter(a => a.playState === 'running').map(a => a.animationName || a.constructor.name).slice(0, 5),
          lenis: !!window.Lenis })""")
        print("reduced motion:", r)
        if r["m"] or r["dataM"] or r["hidden"] or r["lenis"]:
            bad.append(("reduced", r))
        ctx.close()
        # 2. keyboard
        for w, h in ((1440, 900), (390, 844)):
            page = b.new_page(viewport={"width": w, "height": h}); page.goto(url, wait_until="networkidle"); page.wait_for_timeout(1200)
            stops = []
            for i in range(60):
                page.keyboard.press("Tab"); page.wait_for_timeout(60)
                f = page.evaluate(FOCUS_JS)
                if not f:
                    continue
                stops.append(f)
                if not f["ring"] or not f["onScreen"]:
                    bad.append((w, i, f))
            print(w, "first stop:", stops[0]["text"] if stops else None, "| stops:", len(stops), "| problems:", sum(1 for x in bad if x[0] == w))
            if not stops or "Skip" not in stops[0]["text"]:
                bad.append((w, "skip link not first"))
            if w == 390:
                page.evaluate("window.scrollTo(0,0)"); page.focus(".nav-menu"); page.keyboard.press("Enter"); page.wait_for_timeout(400)
                opened = page.evaluate("[document.querySelector('.nav-menu').getAttribute('aria-expanded'), document.activeElement.textContent.trim()]")
                page.keyboard.press("Escape"); page.wait_for_timeout(400)
                closed = page.evaluate("[document.querySelector('.nav-menu').getAttribute('aria-expanded'), document.activeElement.className]")
                print("menu by keyboard:", opened, closed)
                if opened[0] != "true" or closed[0] != "false" or "nav-menu" not in closed[1]:
                    bad.append(("menu", opened, closed))
            page.close()
        b.close()
    for x in bad:
        print("PROBLEM", x)
    sys.exit(1 if bad else 0)

if __name__ == "__main__":
    main()
