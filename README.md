# Crypto Club Vienna: website

Static site, no build step. Round 4 of the redesign (brand from cryptoclubvienna.com).

## Run it

    cd site
    python -m http.server 8000

## Edit content

- `site/data/events.json`: events. Set `"status": "upcoming"` with an ISO `start` on the next one; the live state switches on by itself.
- `site/data/gallery.json`: photos. Empty for now (see below).
- `site/js/config.js`: partners, the Ask card answers, the form endpoint.
- Styles: edit `site/css/*.css`, then run `python tools/bundle_css.py`. That writes `site/css/site.css`, the one stylesheet `index.html` loads.

## Checks

    python tools/check.py http://localhost:8000/        # every page, overflow, console, motion
    python tools/clipcheck.py http://localhost:8000/    # nothing cut off by its frame
    python tools/a11ycheck.py http://localhost:8000/    # reduced motion, keyboard
    python tools/interactions.py http://localhost:8000/ # each built interaction, in a real browser

## Not in this copy, on purpose

- **Event photos.** They show identifiable people, and the club has not yet confirmed consent to use them (questions 6 and 16 in `reviews/R1-content.md`). When cleared, add the files to `site/assets/photos/` and list them in `site/data/gallery.json`.
- **Review screenshots** (`reviews/r4/`) for the same reason.
- **Rounds 1 and 2** (frozen copies and their reviews). The decisions that matter are in `reviews/R3-DECISIONS.md` and `reviews/R4-DECISIONS.md`.

## Deploy

Preview and production run on Vercel, project `dvisionh/crypto-club-vienna`, from the `site/` folder. The live link is https://crypto-club-vienna.vercel.app, noindex until launch.

## Earlier history

Rounds 1 to 3 are in `holemym/iroh`, branch `claude/awesome-clarke-4euzjn`, folder `crypto-club-vienna/`.
