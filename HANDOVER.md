# Crypto Club Vienna: handover

Redesign of cryptoclubvienna.com, built in two rounds with a review between them.

| | |
|---|---|
| Round 1 preview | https://claude.ai/artifact/3KfRdPUbXE4RTScTjtR2Yy (frozen copy in `round-1/`) |
| Round 2 preview | https://claude.ai/artifact/BDTZRxDKvzYS45yeBPYyZ8 (frozen copy in `round-2/`) |
| Round 3 preview | https://claude.ai/artifact/2E875RdqFpek4B8Bzru9LX |
| Round 4 preview | **https://crypto-club-vienna.vercel.app** (shareable, no login; noindex). Vercel `dvisionh/crypto-club-vienna`, production alias of the project, deployed 2026-10-06 from `site/` with `npx vercel deploy --prod --yes --scope dvisionh`. Not the club's domain. |
| Research | `RESEARCH.md` (facts tagged verified / loose / unconfirmed) |
| Plan | `PLAN.md` (direction "Blocks of Vienna", motion language, options) |
| Reviews | `reviews/R1-art-direction.md`, `R1-engineering.md`, `R1-content.md`, `R2-PLAN.md`, `R3-DECISIONS.md` |
| Next session | `LOCAL-PROMPT.md` (paste into a local session with browser and web access) |

## Run it

```bash
cd crypto-club-vienna/site && python3 -m http.server 8000   # static, no build step
```
Deploy: Vercel static project with root directory `crypto-club-vienna/site`.

## Edit content (no code)

- `site/data/events.json`: add an event at the end with `"status": "upcoming"` and an ISO `start`. The whole site goes "live": gold appears, the nav and hero show the date, the pending block shows a countdown.
- `site/data/venues.json`: map pins (`ccv: true` = gold, the club has held an event there).
- `site/data/gallery.json`: add photos (`src` in `assets/photos/`, plus `alt`). The gallery section appears once at least one photo has a `src`.
- `site/js/config.js`: Instagram link, form endpoint, partners, the Ask card Q&As.

## What round 2 changed (from the reviews)

- New order: hero, proof band, manifesto (paper), learn, events chain, Telegram bot, map, partners, join (paper).
- Cut the pinned Formats section (CLS 1.9, resize jump, hidden cards under reduced motion) and the placeholder gallery.
- Gold only means "live" (`<html data-state>`); paper grounds break the navy; type relaxed (hero wdth 84, H2 wdth 90).
- Tracks fixed (they never ran in R1); ScrollTrigger refreshed after every module; skip link and anchors move focus.
- three.js tree-shaken (189 KB → 113 KB gz); fonts self-hosted; JSON fetched once.
- Content: unconfirmed founders and backers removed, Bybit offer rewritten with a Werbung label and full risk note, Impressum and Datenschutz templates, GDPR line and opt-in on the form, meta and JSON-LD.
- Signature moments: skyline-to-plan 3D scroll, FAQ typewriter in the Xelantum style, lattice sweep per block with real counts, headings that unfold on the width axis, "mint" confirmation on the join form.

## Round 3 (calmer, tidier)

Client feedback on round 2: interactions liked, but too loud and slightly sloppy; cut meta commentary; keep their brand colours and shapes. Done: motion budget of four moments (3D hero, Ask typewriter, mining block, map), loader/rail/magnetic/scramble/count-up/lattice sweeps removed, section headers reduced to one label, meta copy cut, track and event card layouts tidied. Not done: brand colours and shapes, because the cloud sandbox could not open cryptoclubvienna.com. Everything brand-related is in `site/css/tokens.css` plus `--radius`.

## Open before launch

0. Brand audit of cryptoclubvienna.com: colours, fonts, logo, shape language → tokens.css (see `LOCAL-PROMPT.md`).
1. Answers from the club: the 17 questions in `reviews/R1-content.md` §4 (next date, cost, language, legal entity, founders' consent, partners and logos, bot handle, photos).
2. Fill `impressum.html` and `datenschutz.html` (marked fields) and have them checked.
3. Connect the join form (`formEndpoint` in `config.js`).
4. Photos and logo: the sandbox could not reach the old site or Instagram. Allow `cryptoclubvienna.com` in the environment's network settings, or drop files into `site/assets/photos/`.
5. Spline: `#hero-3d` loads a Spline scene when `data-spline` holds a `.splinecode` URL; otherwise the Three.js city runs.
6. og-image.png (1200×630) is referenced but not made yet.
7. Known: hovering a track grows it (flex-grow), which registers a small layout shift (~0.07 per hover).
