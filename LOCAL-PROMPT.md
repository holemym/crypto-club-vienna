# Prompt for the local session: Crypto Club Vienna, round 4

Paste everything below the line into a Claude session on your machine (Desktop app or `claude` in a terminal), opened in the folder that holds your projects.

---

You're picking up the Crypto Club Vienna website redesign. Three rounds were built in a cloud session that couldn't open the club's live site, so the brand was never checked. Your job is round 4: bring in the club's real brand, then polish and ship a preview. Work in stages and show me each one before moving on.

## Where things are

- Repo `github.com/holemym/iroh`, branch `claude/awesome-clarke-4euzjn`, folder `crypto-club-vienna/`. Clone or pull it.
- Read first, in this order:
  - `crypto-club-vienna/HANDOVER.md` (status, links, how content is edited)
  - `reviews/R3-DECISIONS.md` (the motion budget and copy rules; these still hold)
  - `PLAN.md` (concept, structure)
  - `RESEARCH.md` (facts tagged verified / loose / unconfirmed)
  - `reviews/R1-content.md` §4 (the 17 open questions for the club)
- Source: `crypto-club-vienna/site/`. It's a static site with no build step; serve it with `python3 -m http.server`. All colours, fonts and corner radii are tokens in `site/css/tokens.css`. The `.paper` block in `site/css/base.css` swaps tokens for the light sections.
- Previews:
  - Round 1: https://claude.ai/artifact/3KfRdPUbXE4RTScTjtR2Yy
  - Round 2: https://claude.ai/artifact/BDTZRxDKvzYS45yeBPYyZ8
  - Round 3: https://claude.ai/artifact/2E875RdqFpek4B8Bzru9LX
- My other projects are on this machine. Use them as the reference for our standards: motion rounds and choreography in KICKS (`wires/kicks-landing`), the WOW Vienna site, and `studio-os/WORKFLOW.md`. Match how those are structured, reviewed and handed over.

## Stage 1: brand audit (no code changes yet)

Open https://cryptoclubvienna.com in the browser and check desktop and phone widths. Also look at Instagram @cryptoclubvienna and the Luma and Eventbrite event pages linked in `site/data/events.json`. Collect:
- Exact colours: read them from the CSS, not by eye. Note background, text, accent, and any gradients.
- Fonts (family, weights), the logo (get the SVG or highest-res file) and the favicon.
- Shape language: corner radii, button and card styles, borders, shadows, icon style, any recurring shapes or patterns.
- Photos we can use: event photos, team, venue. Note who is in them, for consent.
- Site copy that differs from `RESEARCH.md`. Treat the live site as the source of truth.

Write `crypto-club-vienna/reviews/R4-BRAND.md` with screenshots, a token table (their value → our token) and a list of what in round 3 clashes with their brand. The client's rule is that their colours and shapes stay, so where our "Blocks of Vienna" look disagrees with their brand, their brand wins. Keep our ideas only where they fit inside it. Show me this before changing code.

## Stage 2: apply the brand

- Map their palette and radii onto `tokens.css` and the `.paper` overrides. Replace our logo mark with theirs (nav, favicon, footer wordmark if it still fits).
- Use their fonts if they have a recognisable typeface. Self-host them in `site/assets/fonts/` the same way the current fonts are.
- Check that gold-only-when-live still makes sense with their accent colour. If their accent is the brand colour, use it for the primary button and keep a separate "live" signal.
- Put the photos into `site/assets/photos/` and list them in `site/data/gallery.json` with real alt text. The gallery section appears by itself once a photo has a `src`. Consider one cover photo per event card.
- Keep the round 3 motion budget: four moments (3D hero, Ask typewriter, mining block, map) and nothing else that moves on its own. The client said rounds 1–2 were "too loud and slightly sloppy". Calmer and tidier is the bar.
- Copy rules: plain, short, no meta commentary that explains the site to the reader, and no invented facts.

## Stage 3: polish pass in the real browser

- Review every section at 1440, 1024 and 390 in the browser pane on a real GPU; the cloud only had a software renderer. Look for alignment, spacing rhythm, type wraps, focus states and hover states.
- Run Lighthouse (mobile) and fix anything under 90 for performance and accessibility. Budget: JS under 250 KB gzip. three.js is already tree-shaken to 113 KB in `site/vendor/three.hero.min.js`; rebuild steps are in the header of `site/js/hero3d.js`.
- Check `prefers-reduced-motion` and keyboard navigation end to end.
- Spline (optional): `#hero-3d` loads a Spline scene when its `data-spline` attribute holds a `.splinecode` URL. If a Spline object in their brand beats the Three.js district city, build it in Spline (brief in `PLAN.md` §6) and compare both with me.

## Stage 4: ship a preview and hand over

- Give the project its own repo (`holemym/crypto-club-vienna`, private) with the history of `crypto-club-vienna/` if practical. Deploy `site/` as a Vercel preview with `noindex` until launch.
- Make `og-image.png` (1200×630) in their brand.
- Update `HANDOVER.md` and write `reviews/R4-DECISIONS.md`. In iroh, update the `crypto-club-vienna` line in `projects.json`, run `python tools/build.py`, then commit and push.
- Still waiting on the club (don't invent answers): next date, cost, event language, legal entity and Impressum data (`site/impressum.html`, `site/datenschutz.html`), consent to name the founders, partner list and logos, the Telegram bot handle, and the join-form endpoint (`formEndpoint` in `site/js/config.js`). Draft the message to the club from the 17 questions so I can send it.

Ask me before anything that publishes or deletes: creating the repo, deploying, or removing round folders.
