"""Every built interaction, exercised in a real browser: python tools/interactions.py <url>
Prints one PASS/FAIL line per interaction with the measured evidence."""
import json, sys
from playwright.sync_api import sync_playwright

def main():
    url = sys.argv[1].rstrip("/") + "/"
    res = []
    ok = lambda name, cond, ev: res.append((name, bool(cond), ev))
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-gl=angle", "--ignore-gpu-blocklist"])
        pg = b.new_page(viewport={"width": 1440, "height": 900})
        pg.goto(url, wait_until="load"); pg.wait_for_timeout(3500)

        # 1. hero 3D renders and moves
        import hashlib
        # the 3D starts at idle time on purpose, so wait for its canvas; compare an area clear of the Ask card
        try: pg.wait_for_selector("#hero-3d canvas", timeout=12000, state="attached"); pg.wait_for_timeout(2500)
        except Exception: pass
        c = pg.evaluate("!!document.querySelector('#hero-3d canvas')")
        shot = lambda: hashlib.md5(pg.screenshot(clip={"x": 560, "y": 80, "width": 820, "height": 380})).hexdigest()[:8]
        a1 = shot(); pg.wait_for_timeout(1500); a2 = shot()
        ok("Hero 3D city (canvas, animating)", c and a1 != a2, f"canvas={c}, frame sizes {a1}->{a2}")

        # 2. Ask typewriter types and loops
        # answers hold 9 s, so sample across a whole cycle and count distinct typed question states
        seen = []
        for _ in range(24):
            seen.append(pg.evaluate("document.querySelector('.ask-q')?.textContent || ''")); pg.wait_for_timeout(700)
        qs = sorted({x for x in seen if x})
        ok("Ask card typewriter (hero)", len(qs) >= 3, f"{len(qs)} distinct typed states in 17 s, e.g. {qs[:3]}")

        # 3. events: featured card + countdown ticking text present
        cd = pg.evaluate("document.querySelector('#next-event .countdown')?.innerText.replace(/\\s+/g,' ')")
        ok("Next-event card + countdown", cd and "days" in cd, cd)

        # 4. tracks switcher + only active visual animates
        pg.evaluate("document.getElementById('tracks').scrollIntoView()"); pg.wait_for_timeout(2500)
        v1 = pg.evaluate("document.querySelector('.track.is-active canvas').toDataURL().length"); pg.wait_for_timeout(1200)
        v2 = pg.evaluate("document.querySelector('.track.is-active canvas').toDataURL().length")
        pg.click("#tr-2"); pg.wait_for_timeout(800)
        act = pg.evaluate("[...document.querySelectorAll('.track')].findIndex(t=>t.classList.contains('is-active'))")
        ok("Tracks switcher (click) + live visual", act == 1 and v1 != v2, f"active index={act}, visual frames {v1}->{v2}")

        # 5. bot terminal plays messages
        pg.evaluate("document.getElementById('bot').scrollIntoView({block:'center'})"); pg.wait_for_timeout(2000)
        m1 = pg.evaluate("document.querySelector('#bot-term')?.innerText.length || 0"); pg.wait_for_timeout(4000)
        m2 = pg.evaluate("document.querySelector('#bot-term')?.innerText.length || 0")
        ok("Telegram terminal (plays messages)", m1 > 0 and m1 != m2, f"text length {m1}->{m2}")

        # 6. map: pins, click a pin -> card updates
        pg.evaluate("document.getElementById('map').scrollIntoView()"); pg.wait_for_timeout(3000)
        pins = pg.evaluate("document.querySelectorAll('.vm-pin').length")
        before = pg.evaluate("document.querySelector('.vm-card-name')?.textContent")
        pg.evaluate("[...document.querySelectorAll('.vm-pin')].find(p=>!p.hidden && !p.classList.contains('is-sel'))?.click()"); pg.wait_for_timeout(800)
        after = pg.evaluate("document.querySelector('.vm-card-name')?.textContent")
        ok("Vienna map (pins, card follows the pin)", pins > 5 and before != after, f"{pins} pins, card {before!r} -> {after!r}")

        # 7. manifesto words light with scroll
        pg.evaluate("document.getElementById('manifesto').scrollIntoView({block:'end'})"); pg.wait_for_timeout(800)
        lit = pg.evaluate("[document.querySelectorAll('.manifesto-text .w.lit').length, document.querySelectorAll('.manifesto-text .w').length]")
        ok("Manifesto words light on scroll", lit[0] > 0, f"{lit[0]} of {lit[1]} words lit")

        # 8. gallery strip drag (skipped when the copy has no photos: the section is hidden)
        if pg.evaluate("document.getElementById('gallery').hidden"):
            res.append(("Photo strip drag (skipped: no photos in this copy)", True, "section hidden"))
        else:
          pg.evaluate("document.getElementById('strip').scrollIntoView({block:'center'})"); pg.wait_for_timeout(1500)
          box = pg.locator("#strip").bounding_box()

          x0 = pg.evaluate("document.getElementById('strip').scrollLeft")
          pg.mouse.move(box["x"] + box["width"] * .7, box["y"] + 100); pg.mouse.down(); pg.mouse.move(box["x"] + box["width"] * .2, box["y"] + 100, steps=8); pg.mouse.up()
          x1 = pg.evaluate("document.getElementById('strip').scrollLeft")
          ok("Photo strip drag", x1 > x0, f"scrollLeft {x0}->{x1}")

        # 9. join: steps confirm, form mint confirmation
        pg.evaluate("document.getElementById('join').scrollIntoView()"); pg.wait_for_timeout(2200)
        steps = pg.evaluate("document.querySelectorAll('.step.is-confirmed').length")
        pg.fill("#jf-name", "Test Person"); pg.fill("#jf-email", "test@example.com"); pg.click("#join-form button[type=submit]"); pg.wait_for_timeout(1500)
        minted = pg.evaluate("!document.getElementById('minted').hidden && document.querySelector('#minted h3')?.textContent")
        ok("Join steps confirm + 'mint' confirmation", steps == 3 and minted, f"{steps} steps confirmed, card: {minted!r}")
        pg.close()

        # 10. mining block when no event is announced (events.json without the upcoming event)
        pg = b.new_page(viewport={"width": 1440, "height": 900})
        def strip_upcoming(route):
            r = route.fetch(); d = r.json(); d["events"] = [e for e in d["events"] if e.get("status") != "upcoming"]
            route.fulfill(response=r, body=json.dumps(d), headers={**r.headers, "content-type": "application/json", "content-encoding": "identity"})
        pg.route("**/data/events.json", strip_upcoming)
        pg.goto(url, wait_until="load"); pg.evaluate("document.getElementById('events').scrollIntoView()"); pg.wait_for_timeout(1500)
        g1 = pg.evaluate("[...document.querySelectorAll('.mine-grid i.on')].map(i=>[...i.parentNode.children].indexOf(i)).join()"); pg.wait_for_timeout(2000)
        g2 = pg.evaluate("[...document.querySelectorAll('.mine-grid i.on')].map(i=>[...i.parentNode.children].indexOf(i)).join()")
        st = pg.evaluate("document.documentElement.dataset.state")
        ok("Mining block (when no event is set)", st == "idle" and g1 != g2, f"state={st}, cells {g1!r} -> {g2!r}")
        pg.unroute_all(behavior="ignoreErrors"); pg.close()

        # 11. phone menu
        pg = b.new_page(viewport={"width": 390, "height": 844}); pg.goto(url, wait_until="load"); pg.wait_for_timeout(1500)
        pg.click(".nav-menu"); pg.wait_for_timeout(500)
        o = pg.evaluate("document.querySelector('.nav-menu').getAttribute('aria-expanded')")
        pg.click(".menu-links a[href='#map']"); pg.wait_for_timeout(1500)
        c2 = pg.evaluate("[document.querySelector('.nav-menu').getAttribute('aria-expanded'), Math.round(document.getElementById('map').getBoundingClientRect().top)]")
        ok("Phone menu (open, jump, close)", o == "true" and c2[0] == "false" and abs(c2[1]) < 200, f"open={o}, after link: expanded={c2[0]}, map top={c2[1]}px")
        b.close()

    sys.stdout.reconfigure(encoding="utf-8")
    for name, good, ev in res:
        print(("PASS " if good else "FAIL ") + name + "  |  " + str(ev))
    sys.exit(0 if all(g for _, g, _ in res) else 1)

if __name__ == "__main__":
    main()
