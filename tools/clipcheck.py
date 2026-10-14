"""Find content cut off by its frame: python tools/clipcheck.py <url> [width ...]

After a full scroll-through (so every reveal has run), for every element that clips (overflow hidden/clip,
or text-overflow ellipsis) report:
  - text whose glyph boxes extend past the clipping frame (vertical or horizontal), and
  - text truncated by ellipsis or line clamp (scrollWidth/scrollHeight larger than the box).
Horizontal scrollers (overflow auto/scroll) are skipped on their scroll axis; .sr-only is skipped.
Exit code 1 when anything is cut."""
import json, sys
from playwright.sync_api import sync_playwright

JS = r"""() => {
  const out = [];
  const name = el => (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') || el.tagName;
  const clips = ax => ['hidden', 'clip'].includes(ax);
  const vis = el => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05; };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => n.textContent.trim() ? 1 : 2 });
  let n;
  while ((n = walker.nextNode())) {
    const host = n.parentElement;
    if (!host || host.closest('.sr-only, [class$="-sr"], [hidden], .skip, #menu, script, style, noscript') || !vis(host)) continue;
    if (getComputedStyle(host).clipPath === 'inset(50%)') continue;  // visually hidden on purpose
    const r = document.createRange(); r.selectNodeContents(n);
    const rects = [...r.getClientRects()].filter(b => b.width > 0.5 && b.height > 0.5);
    if (!rects.length) continue;
    for (let a = host; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (['auto', 'scroll'].includes(cs.overflowX) || ['auto', 'scroll'].includes(cs.overflowY)) break;  // inside a scroller: scrolled-away is not cut
      const cx = clips(cs.overflowX), cy = clips(cs.overflowY);
      if (!cx && !cy) continue;
      const f = a.getBoundingClientRect();
      const bad = rects.find(b => (cy && (b.top < f.top - 1.5 || b.bottom > f.bottom + 1.5)) || (cx && (b.left < f.left - 1.5 || b.right > f.right + 1.5)));
      if (bad) { out.push({ kind: 'cut', frame: name(a), text: n.textContent.trim().slice(0, 50), by: Math.round(Math.max(f.top - bad.top, bad.bottom - f.bottom, f.left - bad.left, bad.right - f.right)) }); break; }
    }
  }
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('.sr-only, [hidden], #menu') || !vis(el) || !el.textContent.trim()) continue;
    const cs = getComputedStyle(el);
    if (['auto', 'scroll'].includes(cs.overflowX) || ['auto', 'scroll'].includes(cs.overflowY)) continue;
    const ell = cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1;
    const clamp = cs.webkitLineClamp && cs.webkitLineClamp !== 'none' && el.scrollHeight > el.clientHeight + 1;
    if (ell || clamp) out.push({ kind: ell ? 'ellipsis' : 'clamp', frame: name(el), text: el.textContent.trim().slice(0, 50) });
  }
  return out;
}"""

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    url = sys.argv[1]
    widths = [int(w) for w in sys.argv[2:]] or [1440, 1024, 390]
    total = 0
    with sync_playwright() as p:
        b = p.chromium.launch()
        for w in widths:
            page = b.new_page(viewport={"width": w, "height": 900})
            page.goto(url, wait_until="networkidle")
            y = 0
            while y < page.evaluate("document.body.scrollHeight"):  # re-measured: lazy blocks grow the page
                page.evaluate(f"window.scrollTo(0,{y})"); page.wait_for_timeout(90); y += 600
            h = page.evaluate("document.body.scrollHeight")
            page.wait_for_timeout(2200)
            # check each part of the page while it is on screen (fixed nav, reveals), then dedupe
            seen = {}
            for y in range(0, h, 800):
                page.evaluate(f"window.scrollTo(0,{y})"); page.wait_for_timeout(150)
                for f in page.evaluate(JS):
                    seen.setdefault((f["kind"], f["frame"], f["text"]), f)
            found = list(seen.values())
            total += len(found)
            print(f"{w}: {len(found)} cut")
            for f in found:
                print("  ", json.dumps(f, ensure_ascii=False))
            page.close()
        b.close()
    sys.exit(1 if total else 0)

if __name__ == "__main__":
    main()
