# Crypto Club Vienna: Stage 1 plan

Redesign of cryptoclubvienna.com. Facts and copy come from `RESEARCH.md`; this file holds the direction, the structure and the motion language that rounds 1 and 2 build.

## 1. Who it is for and what the site must do

**The club:** a student-driven Web3 community in Vienna. It runs meetups and learning formats around three tracks (fundamentals, market structure and risk, applied Web3) and says it stands for clarity, transparency and real connections, "beyond the hype".

**Audiences, in order:**
1. **Students in Vienna** (WU, TU, Uni Wien, FH) who are curious about crypto but put off by shilling. They need to see that the club is serious, friendly and free to try, and find the next meetup in one tap.
2. **Builders and founders** looking for people to hire, test with or pitch to.
3. **Partners and sponsors** (exchanges, funds, venues) who need proof of reach and a contact.

**The site's one job:** get a curious student to the next meetup. Everything else (tracks, partners, map) builds trust for that click.

**What it must showcase:**
- The next event, with a countdown, place and a join link.
- The three learning tracks, explained plainly.
- That this is a real room of real people in Vienna (photos, venues, the map).
- Values: clarity, transparency, no hype, no financial advice.
- Partners and the Bybit card offer, with a clear risk note.
- One obvious way in: community chat plus Meetup/Luma.

## 2. Creative direction: "Blocks of Vienna"

Two worlds meet on this site, and the design takes its material from both:

- **Vienna 1900.** Josef Hoffmann and the Wiener Werkstätte built a whole visual language out of the square grid (the *Gitterwerk*). The Secession building carries its motto over the door: *Der Zeit ihre Kunst, der Kunst ihre Freiheit*. Square lattices, gold leaf used sparingly, strict typography.
- **The chain.** A blockchain is literally blocks in a row: each one holds data, a timestamp and the hash of the last.

The Hoffmann square and the block are the same shape. That is the whole idea: **the square lattice is the club's motif**, used as the grid, the loader, the section transitions and the map's texture. No neon, no purple gradients, no stock coins.

**Palette (dark-first, single committed look):**
| Token | Role |
|---|---|
| `--ink` | deep blue-black with a Danube bias; the ground |
| `--paper` | warm off-white for type |
| `--fog` | muted blue-grey for secondary text and hairlines |
| `--gold` | Secession leaf; used only for the live/next-event state and the coin |
| `--u1…u6` | Vienna U-Bahn line colours (red, purple, orange, green, brown); used as the categorical scale for tracks and map routes, nowhere else |

**Type:**
- Display: *Bricolage Grotesque* (variable width and optical size). Set tight and large; width animates on hover.
- Body: *Instrument Sans*.
- Data / terminal: *Martian Mono* for block headers, hashes, coordinates, countdowns and the typing effect.

**Subject details that only this site would have:** block headers that show real data (section index, timestamp of the next event, coordinates), Vienna district numbers (1., 2., 7.) on venue cards, U-Bahn line chips for how to get there, the coordinates 48.2082° N 16.3738° E in the footer.

## 3. Structure (one long page plus anchors)

| # | Block | Job | Signature interaction |
|---|---|---|---|
| 0 | Loader | 0.8 s "syncing" lattice that fills square by square; skipped on repeat visits and reduced motion | lattice fill |
| 1 | Nav | logo, Events, Tracks, Map, Partners, Join; a live chip "Next meetup in 3d 04h" | magnetic Join button, chip counts down |
| 2 | Hero | headline decoded in the terminal-typing style, one-line who-we-are, two CTAs | 3D Vienna: the 23 districts extruded as blocks, venues glowing, transaction arcs between them; tilts with the pointer |
| 3 | Manifesto | "Beyond the hype": the values as one large statement | words light up as you scroll (scrubbed) |
| 4 | Tracks | the three learning tracks | blocks expand on hover/focus (flex-grow), each with a small live visual: node graph, volatility candles, terminal |
| 5 | Formats | what happens at the club: meetups, workshops, talks, socials | horizontal pinned scroll of cards on desktop, swipe on phone |
| 6 | Events | the club's history as a chain of blocks: Kick-off (May 2025), Crypto Summit 360° (sold out, 200), Event Nº2 (Mar 2026), then a pending block "being mined" | real SHA-256 hashes chain the blocks; packets travel along the links; the pending block mines; a countdown switches on when an upcoming event is added |
| 7 | Map | interactive Vienna: districts, universities, venues, where we meet | hover district = number + name; pins open a card; legend filters |
| 8 | Gallery | photos from meetups | drag/scroll strip with parallax inside each frame |
| 9 | Partners | Bybit card offer and partner logos | marquee that slows on hover; offer card with risk note |
| 10 | Join | three steps, FAQ, community links | step blocks "confirm" one after another |
| 11 | Footer | huge wordmark built from lattice squares, links, coordinates, Impressum | wordmark squares react to the pointer |

A thin **chain rail** on the right edge shows one square per block; the current one fills gold. It is the scroll-progress indicator and the section navigation in one.

## 4. Motion language

**Principle:** things move like blocks being confirmed. Short, decisive, square. Nothing floats aimlessly.

- **Easing:** `expo.out` for entrances (fast start, calm landing), `power2.inOut` for scrubbed scroll, `steps()` only for the typing caret.
- **Durations:** micro 160 ms, UI 320 ms, entrances 700–900 ms, the hero sequence 1.6 s total.
- **Entrances:** content is visible at rest; motion only adds a lift (12–24 px) and a clip reveal. Never `opacity:0` waiting on an observer that might not fire.
- **Block transitions:** sections enter with a lattice wipe (a row of squares sweeps across the section top edge as its "block header" confirms).
- **Typing (the Xelantum reference):** research showed Xelantum's effect is a looping fake-AI-chat typewriter, so the hero gets an **Ask the club** card that works the same way: the question types one plain character at a time (65–100 ms, jittered) behind a thin hard-blinking I-beam caret, then "Thinking" with bobbing square dots, then "SCANNING VIENNA NETWORK", then the answer card opens and the answer streams fast (15–29 ms/char). It loops through four questions drawn from the club's own copy. Separately, block-header hashes and the mining nonce use a short hex scramble.
- **Headline:** lines rise out of a clipped mask (1.1 s, 0.09 s stagger), no typing, so the thesis reads instantly.
- **Scroll:** Lenis smooth scroll (lerp 0.1), GSAP ScrollTrigger for pins and scrubs. On phones: native scroll, no pins longer than one screen.
- **3D:** idle motion is slow (district heights breathe on a 6 s cycle); interaction motion is quick (pointer tilt damped at 0.08).
- **Reduced motion:** no smooth scroll, no pins, no scrubs; the 3D renders one still frame; typing shows final text.

## 5. Interaction options considered

| Area | Options | Pick and why |
|---|---|---|
| Hero 3D | (a) Spline coin, (b) particle globe, (c) extruded Vienna districts | **(c)**: only this club could have it; it doubles as the map intro. A Spline slot stays open for a hand-modelled object (see §6). |
| Typing | (a) plain typewriter, (b) decode/scramble, (c) AI-chat typewriter like Xelantum | **(c)** for the hero Ask card (the client's reference), **(b)** only for hashes. |
| Tracks | (a) tabs, (b) cards, (c) expanding blocks | **(c)**: the blocks motif, and all three stay visible at rest. |
| Events | (a) calendar grid, (b) list, (c) chain of blocks | **(c)**: only three public events so far, all past; a chain tells the growth story and makes "next date not announced" an honest, designed state. |
| Map | (a) Google/Mapbox embed, (b) raster image, (c) own SVG from open data | **(c)**: real district shapes, styled to the site, no cookie banner, fast. |
| Section changes | (a) fades, (b) colour shifts per section, (c) lattice wipe | **(c)** plus a subtle ground shift for Partners and Join. |
| Cursor | custom cursor | **No.** It hurts usability and reads as template. Magnetic CTAs only. |

## 6. Spline

Spline scenes are built in the Spline editor, which runs on your machine. The hero loads a Spline scene when `data-spline` on `#hero-3d` holds a `.splinecode` URL; without it, the Three.js Vienna scene renders. Brief for a Spline object if you want one: a single square coin, 12 mm thick, gold leaf rim, face engraved with the Hoffmann lattice and "CCV", slow 20° wobble, reacts to cursor with a 10° tilt.

## 7. Technical plan

- Static site, no build step: `index.html`, `css/`, `js/` as ES modules, `vendor/` for GSAP, Lenis and Three.js (pinned copies, no CDN dependency).
- Data in `data/`: `vienna.json` (district outlines), `events.json`, `venues.json`, `gallery.json`, so content updates are one-file edits.
- Performance budget: LCP under 2.0 s on 4G, JS under 250 KB gzip, 3D pauses when off screen, DPR capped at 1.75.
- Accessibility: semantic landmarks, visible focus, keyboard-reachable map pins, `prefers-reduced-motion`, contrast AA.
- Deploy: Vercel static, root `crypto-club-vienna/site`.

## 8. Rounds

- **Round 1:** full page, all blocks, all interactions, built in parallel by module (core layout, 3D hero, map, typing and tracks).
- **Review:** three reviewers in parallel (art direction from screenshots, motion/performance/accessibility, content and facts).
- **Round 2:** every review finding addressed, polished; round 1 kept in `round-1/` for comparison.
