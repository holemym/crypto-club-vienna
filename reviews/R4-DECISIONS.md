# Round 4: decisions

Brief: bring in the club's real brand (audit in `R4-BRAND.md`), keep the round 3 motion budget, calmer and tidier. David's calls on 2026-10-06: drop the cream sections, light = live, transparent logo from their PNG until they send an SVG.

## Stage 2: brand applied

| Area | Decision |
|---|---|
| Palette | Their CSS values in `site/css/tokens.css`: ground `#000001`, band `#0a131f`, lines `#434366`, text `#f8fbff` / `#b6b9c2`, violet `#af00ff`. Gold is gone. |
| Violet vs live | Violet = the club: Join, Send, accent bars, step numbers, our venues on map and 3D. Light `#eaedf2` = live: the nav chip, the hero date, the event button, the next block's border. Same split as their site (violet "Join the Community", light "Join the Event"). |
| Small violet text | `--accent-text: #c766ff` for violet text under 24 px; the brand violet is 4.3:1 on black, under AA. |
| Grounds | No light sections. The manifesto sits on their navy band; the photo band (full-bleed) is the second break. `.paper` is replaced by `.band`. |
| Shapes | Cards and photos 15 px, buttons 6 px, small chips 6 px, 1 px `#434366` lines, no shadows. Partners became a ledger of rows instead of a tile grid. |
| Type | Syne 700 (display), Inter (body, buttons), Quicksand 500 for `/labels/` in their slash style. Martian Mono stays for data only: block numbers, hashes, countdown, bot terminal, coordinates. `.mono` now means the label voice; `.data` is the monospace. |
| Logo | Their lockup in the nav and at full width in the footer (replaces the lattice wordmark canvas); their mark as the bot avatar; their site icon as favicon. Files from `tools/make_brand.py` (luminance → alpha, drawing unchanged). |
| Tracks | All three use the violet tab; no U-Bahn colours. Equal columns: the hover flex-grow is gone, so titles are never cut and the ~0.07 hover CLS from round 3 is gone too. |
| Map | Venue kinds differ by glyph and grey; violet only for our venues. U-Bahn colours only on the U-Bahn layer. Prisma by Lumia added (Summit 360°, placed ±300 m). |
| Events | Order fixed (Kick-off → Nº2 → Summit 360° → Going Onchain). Going Onchain is `upcoming`, so the live state is on for real. Its block carries the poster and a light "Register on Luma" button. Phones open the chain on that block. Hero "last event" and the Ask "next meetup" answer now come from `events.json`. |
| Event covers | Considered and limited to the upcoming block. Only the Kick-off photo is certainly from a known event; the Summit poster names a different venue than Luma. Photos live in the gallery instead until the club confirms (question 23). |
| Gallery | On: one full-bleed frame plus a strip of six. Colour photos, no greyscale, no parallax, no drift. Caption only on the Kick-off photo. |
| Copy | "Gold marks our events", "Drag or scroll through the strip" and the "Proof of attendance" pun cut. WU now named ("built by WU students and open to everyone", their Instagram wording). Their "profit tomorrow" line not carried over. |
| Motion | Unchanged budget: 3D hero, Ask typewriter, mining block (only when no event is announced), map. Removed: gallery parallax and entrance drift, button sweep fills, logo hover shuffle, live-dot ping. |

Verified 2026-10-06 (`tools/check.py`): 390 and 1440, `scrollWidth == innerWidth`, zero console errors, zero failed requests, no dead anchors, no broken images.

Deleted on David's OK (2026-10-06): `js/wordmark.js`, `assets/favicon.svg`, the Bricolage Grotesque and Instrument Sans fonts.

## Stage 3: polish, navigation, motion on every block

David, 2026-10-06: "motion language should be felt on every block", "cleaner and easy to use and navigate", "nowhere a frame cutting off its content". **Overrules the round 3 budget in one point:** every block now has entrance and state motion. What stays from round 3: nothing loops on its own beyond the four moments (3D hero, Ask typewriter, mining block when no event is set, map).

| Area | Decision |
|---|---|
| Motion pack "confirm" | Three primitives in `css/motion.css`, assigned per block in `js/motion.js` (`SPEC`): **rise** (20 px + fade, 0.8 s expo.out, 70 ms stagger per batch), **mask** (headings rise out of their own line box, clip released at rest), **draw** (rules, bars, chain links and the footer lockup draw open; the photo frame opens). Scroll-linked and lerped: hero 3D, manifesto words, gallery lead. States: 160 ms colour and border, tabs extend, press = scale .97. Gated on `html.m`, set in `<head>` only without reduced motion and dropped if `motion.js` never runs. |
| Hero load | Pure CSS keyframes from first paint (title lines, lede, actions, Ask card), so the headline counts as painted at once. |
| Navigation | Events moved directly under the hero (the site's job). Nav follows page order: Events, Learn, Map, Bot. Phone menu (≤900 px): a sheet with every section, Join and Instagram; Esc, a link or the button closes it; page behind is inert; focus moves in and back. The hidden scroll-away bar returns instantly on keyboard focus. |
| Hero fact row | Removed: it showed the next date a third time on the first screen (nav chip, event button). |
| Event chain | Phones and tablets open the chain on the upcoming block; the counter reads the real position. Poster crop 10:7 stops above the coins. Cards: hover border. |
| Clipping | `tools/clipcheck.py` (text past any clipping frame, ellipsis, line clamp) at 1440/1024/390: 0. Fixed: mask clips released at rest, track titles and copy no longer clipped, Ask field no vertical clip, bot command line wraps on phones, poster crop. |
| Performance | Heavy blocks (tracks, map, bot) build when the reader is 1.5 screens away. Live 3D only on ≥800 px with 4+ cores and no data saver, started at idle; phones and reduced motion get a still (`hero-poster-*.webp`, `tools/hero_poster.py`). Lenis only for mouse/trackpad. One stylesheet `css/site.css` (built by `tools/bundle_css.py`, edit the sources then rerun). Vendor scripts deferred. Far blocks use `content-visibility: auto`. |
| Lighthouse mobile | Through `tools/serve.py` (gzip, like Vercel): Performance 95 and 88 on two runs (FCP 1.5 s, LCP 2.6–2.8 s, TBT 80–90 ms, CLS 0; the spread is Speed Index, which the typing Ask card moves), Accessibility 100, Best practices 100, SEO 100. |
| Reduced motion, keyboard | `tools/a11ycheck.py`: no hidden content, no running animations, no Lenis under reduced motion; skip link first; every Tab stop visible and on screen at 1440 and 390; menu opens and closes by keyboard. |

### Hero 3D: Spline

The hero is still the Three.js district city (`js/hero3d.js`). The Spline version is planned in their own 3D language: the chrome-violet CCV coin with one orbit ring from the Going Onchain poster, slow idle turn, pointer tilt, transparent ground. Blocked: the Spline editor was not connected to this session (AI bridge off). Once built: export the `.splinecode` URL into `data-spline` on `#hero-3d`, rerun `tools/hero_poster.py` for the phone still, compare with the city.

## Preview deploy (2026-10-06, David: "deploy to a vercel link")

https://crypto-club-vienna-57hxbhwmk-dvisionh.vercel.app · project `dvisionh/crypto-club-vienna`, preview (not production), behind Vercel login. noindex twice: `<meta name="robots">` on all three pages (remove at launch) and `X-Robots-Tag` in `site/vercel.json`. `.vercelignore` keeps `.env*` (the CLI writes a token file into `site/`) and `.vercel` out of the upload; checked: `/.env.local` is 404 on the deployment. Verified through `vercel curl`: `/`, `/impressum.html`, `/datenschutz.html` 200, junk path 404, round 4 content present.

Shareable link (David, 2026-10-06: "give me a link i can share", production deploy approved in chat): **https://crypto-club-vienna.vercel.app**, the project's production alias, opens without login. Checked without login: `/`, `/impressum.html`, `/datenschutz.html`, `/data/events.json` 200; junk path and `/.env.local` 404; `X-Robots-Tag: noindex, nofollow` and the robots meta present. The club's own domain is untouched.

## Declutter pass (David, 2026-10-06: "most of the UI still looks cluttered", "I don't like the quality of interactions on track A/B/C", "cleaner and more modern")

| Area | Decision |
|---|---|
| Tracks | Rebuilt as a switcher: list of three large rows left (number, title, arrow on the selected row), one panel right (description, topics, one visual). A violet bar slides between rows; panels crossfade and rise in one shared grid cell, so the block never changes height. Hover previews after 140 ms, click, Enter/Space select, Up/Down/Home/End move. Phone: accordion, one area open, height eased with grid rows; tapping the open area closes it. Only the selected visual animates. Visuals lost the "FIG." captions, the dot lattice and the invented readouts (block height, peers, "volatility 24h"). The "How we meet" row is gone (the events show the formats). |
| Events | The upcoming event is a featured card above the chain: the full poster left, date line, large title, summary, countdown, venue with address, light "Register on Luma" button. The chain below holds only past events, equal height: date, title, summary, one line "venue · time" and the event page link. Block numbers, hashes and the four-row data table are gone (the hash still exists as `data-hash` for the join confirmation). |
| Numbers band | No vertical rules. |
| Map | Flat districts (no lattice fill), no coordinate grid, no chip counts, filters without a box, venue list collapsed to six with "Show all" at every width. |
| Bot | No dot grid behind the messages. |

Verified: `check.py` and `clipcheck.py` (0 cut at 1440/1024/390), `a11ycheck.py` (keyboard, reduced motion), switcher exercised by click, keyboard, hover and phone taps. Lighthouse mobile (gzip server): Performance 89, Accessibility 100, Best practices 100, SEO 66 (only `is-crawlable`, the preview noindex).

Deployed 2026-10-06 (David: "yes deploy all new changes") to https://crypto-club-vienna.vercel.app (deployment `crypto-club-vienna-6hekjv6ry`). Live check without login: `/`, Impressum, Datenschutz 200; junk path and `/.env.local` 404; `X-Robots-Tag: noindex, nofollow`; new switcher and featured event present; `check.py` against the live URL green at 390 and 1440.

## Simplify pass (David, 2026-10-06: "i dont see much change", then "yes do all 5")

| # | Decision |
|---|---|
| 1 Hero | The Ask card left the hero (now in Join under the steps, without the glass effect). The 3D keeps districts, the violet first district and venue pins; ground grid, light beams and travelling transactions are hidden (`hero3d.js`, "calmer hero"). Phone still re-rendered. |
| 2+5 Bot | The terminal section is gone; Learn ends with a short bot band: heading, three lines (sentiment, volatility, structure, from their site copy), one button, "Not financial advice." Nav and footer: Events, Learn, Map (+ Partners in the footer and phone menu). `bot.js` and `bot.css` are no longer loaded (files still on disk). |
| 3 Manifesto | One sentence ("We explain crypto plainly, talk openly about risk and meet in person.") and the four values as a plain two-column list with one short line each. |
| 4 Frames | Surfaces instead of outlines: event cards, the featured event, the offer, the bot band and the form card are filled `--ink-2` without borders; step dividers, footer rules, nav and numbers-band rules and the visual's border are gone. Outlines stay where they mean something: the next event (light) and form fields. |

Verified: `check.py`, `clipcheck.py` (0 cut at 1440/1024/390), `a11ycheck.py`. Render-skipping (`content-visibility`) now only on the map; on Partners and Join it froze the entrance at its first frame while off screen.

Deployed 2026-10-06 (David: "deploy") to https://crypto-club-vienna.vercel.app (deployment `crypto-club-vienna-pdt0qdtw3`), simplify pass live. Live check without login: pages 200, junk path and `/.env.local` 404, noindex header present, bot band and Ask-in-Join present, `check.py` against the live URL green at 390 and 1440.

## Every interaction kept (David, 2026-10-06: "make sure we didn't lose all those interactions, if they moved that's okay")

- Ask card: back in the hero, near-solid surface without blur.
- Telegram terminal: back, live, inside the Learn bot band (copy left, terminal right; stacked on phones). Older messages fade out at the top edge instead of being sliced.
- 3D hero: the travelling transaction is back; ground grid and static beams stay off.
- `tools/interactions.py` exercises every built interaction in a real browser; all 11 pass: hero 3D animating, Ask typewriter cycling, next-event countdown, tracks switcher + live visual, Telegram terminal playing, map pins drive the card, manifesto words light on scroll, photo strip drag, Join steps confirm + "mint" confirmation, mining block when no event is set (tested with the upcoming event removed), phone menu.

Deployed 2026-10-06 (David: "yes") to https://crypto-club-vienna.vercel.app: Ask card in the hero, terminal in Learn, transaction arcs back. Verification on the live URL found one real bug: the head script's 3-second safety timer switched all motion off when the first load was slow (motion count 0 at 390). The timer is removed; it was never needed, because only elements `motion.js` has marked start hidden. Redeployed (`crypto-club-vienna-b8cjzksga`). Live: `check.py` green at 390 and 1440 (59 motion elements at both), `tools/interactions.py` 11 of 11 PASS, `/.env.local` 404, noindex header present. Note: the first deploy attempt returned "Not authorized" once (the CLI login file had been rewritten at 19:56); the retry with the same command went through.
