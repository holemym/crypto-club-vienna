# Round 4: brand audit

Checked 2026-10-05 in a real browser: cryptoclubvienna.com at 1440 and 390, the WordPress media library (`/wp-json/wp/v2/media`), Luma (`oybpqfqn`, `7qmuups4`, organiser page), Eventbrite (Event Nº2) and Instagram @cryptoclubvienna (visible without login: header, highlights and the first two rows of posts). Colours come from computed CSS, not from screenshots.

The club's rule holds: **their colours and shapes win.** Round 3 ideas stay only where they fit inside them.

## Screenshots

| | |
|---|---|
| Live site, desktop | [r4/live-1440.jpg](r4/live-1440.jpg) |
| Live site, phone | [r4/live-390.jpg](r4/live-390.jpg) |
| Round 3, desktop | [r4/r3-1440.jpg](r4/r3-1440.jpg) |
| Round 3, phone | [r4/r3-390.jpg](r4/r3-390.jpg) |
| Every brand file and photo pulled from their media library | [r4/brand-files.jpg](r4/brand-files.jpg) |

Raw files are in `_brand/` (git-ignored: they show identifiable people and iroh is public). `tools/fetch_brand.py` downloads them again.

## What their brand is

- **Ground:** near-pure black everywhere. The site has no light sections.
- **One accent:** violet `#AF00FF`. It's on the primary button, the 56 px icon tiles, the short accent bars on the focus areas and the second line of poster headlines ("GOING / **ONCHAIN**"). The posters sample at `#AE00FC`, so web and print match.
- **Second button:** light grey `#EAEDF2` with near-black text. They use it for the event CTA ("Join the Event") and secondary actions.
- **Shapes:** soft. Cards and photos have a 15 px radius, buttons 6 px, and icon tiles are violet rounded squares. Cards are a 1 px `#434366` line on black with no fill and no shadow.
- **Type:** Syne 700 for every heading. Inter for body text and buttons. Section labels are set in slashes, `/Event/`, in Quicksand 500 at 18 px, grey.
- **Motifs:** the logo mark (Stephansdom spire, a ₿ coin, a hexagon node chain). Posters add a chrome-violet coin with a "ccv" ring, four-point sparkles ✦ and violet light streaks on black. The site hero has violet horizontal light streaks behind the title.
- **People:** the team wears black tees with a small white CCV logo. Photos are flash-lit event shots: stage, crowd, networking.

## Token table: their value → our token

| Their value | Where they use it | Our token (stage 2) | Round 3 value |
|---|---|---|---|
| `#000001` | page ground (`--e-global-color-836e38f`) | `--ink` | `#0a0e14` |
| `#0A131F` | raised band (`dc33a68`) | `--ink-2` | `#111723` |
| `#0A0A19` | text on light buttons (`a12e156`) | `--on-light` (new) | none |
| `#434366` | card and divider lines (`35d1f12`) | `--line` | `#232c3b` |
| `#F8FBFF` | headings, primary text (`30b120c`) | `--paper` | `#ece8df` |
| `#EAEDF2` | light button fill, outline buttons, light card lines (`9449819`) | `--light` (new) | none |
| `#B6B9C2` | body copy, `/labels/` (`6ed9ff5`) | `--fog` | `#8a97ab` |
| `#AF00FF` | primary button, icon tiles, accent bars (`fa87ae2`) | `--violet` (new, replaces `--gold`) | gold `#d4ae5c` |
| `#7704DB` | kit accent, deeper violet (`accent`) | `--violet-deep` (hover, pressed) | gold-dim `#8c7440` |
| `#FFFFFF` | text on violet | `--on-violet` | `--on-gold` `#0a0e14` |
| 15 px | cards, photos, form submit | `--radius` (cards, media) | 2 px |
| 6 px | buttons | `--radius-btn` (new) | 2 px |
| ≈ 6 px on 56 px | icon tiles (`10%`) | `--radius-tile` (new) | none |
| 1 px solid `#434366` | card border | `--bd-card` | 1 px `--line`, square |
| none | shadows (one 10 % black shadow, invisible on black) | no shadows | none |
| Syne 700 (54–59 / 38 / 28 / 21 px) | H1, H2, H3 | `--f-display` | Bricolage Grotesque |
| Inter 400/500 (14–18 px; buttons 16/500, padding 14 × 20) | body, buttons | `--f-body` | Instrument Sans |
| Quicksand 500 18 px, `/Label/` | section labels | `--f-label` (new), replaces mono labels | Martian Mono uppercase |
| Poppins 400, Montserrat 700, Cabin | form, nav, unused kit entry | dropped: five families is the sloppy part | none |

Elementor's default kit colours (`#3D5A80`, `#8699B2`, `#2B415D`, `#121E2E`, `#22354D`) are defined but nothing on the page renders them. They're left out.

## Logo

- Lockup: a wide geometric "CCV" wordmark plus the mark (spire, ₿ coin, node chain), white on black.
- Files found: `CCV-2-scaled.png` (1600², lockup on black with a faint violet candlestick chart), the mark alone (`Дизайн-без-назви-28`, 1600²), the header crop (814 × 242) and the favicon (512²).
- **No SVG and no transparent file exists.** Every file is white on solid black. Stage 2 options: (a) ask the club for the SVG (question added below), (b) meanwhile, turn the 1600 px PNG into a white-on-transparent PNG by mapping luminance to alpha. That changes no pixels of the drawing; it is not a redraw. On black grounds it's identical.
- The wordmark's typeface isn't confirmed. It looks like Syne ExtraBold, but that's unverified.

## Photos (from their own site)

| File | What it shows | People |
|---|---|---|
| `IMG_9271` (3 crops) | Kick-off: three people on stage under "CRYPTO CLUB VIENNA: KICK-OFF" | 3 identifiable, likely the founders° |
| `IMG_9231`, `IMG_9239` | three on stage under a "THANK U!" screen | same 3° |
| `IMG_0890`, `IMG_0917`, `IMG_0933` | networking, a seated group, a crowd, uploaded Feb 2026, so probably the Kick-off° | 10+ identifiable |
| `IMG_2184` | seated audience of about 40 in a white room with pendant lamps, uploaded 23 Jun 2026, so probably Event Nº2 at Startup House° | about 40 identifiable |
| `IMG_2427` | crowd from above, same upload | 30+ identifiable |
| `64-scaled.jpg` | "Going Onchain" poster | none |
| `What-your-asset-says-about-you.-9` | Crypto Summit 360° poster | none |
| `Дизайн-без-назви-25/26/27` | Telegram bot mock-ups ("CryptoClubVienna Bot #1") | none |
| partner tiles | Bybit, Startup House by Lumia, Webskill, "Supported by WU Vienna" | none |

The club already publishes all of these. Reusing them still needs their OK, and their consent from the people shown (question 6 and 16). Instagram shows team photos in CCV tees that aren't on the site; originals are behind the login wall, so they have to come from the club.

## Facts that differ from RESEARCH.md and round 3

1. **A new event is announced:** *Going Onchain*, Friday 23 October 2026, doors 17:00, Startup House by Lumia, Stella-Klein-Löw-Weg 8, 1020 Wien. Three speakers, then an afterparty with networking and a DJ. Registration is on luma.com/oybpqfqn, with 49 registered on 5 Oct. Luma shows no price, so the site must not say "free" until the club confirms.
2. **Crypto Summit 360° now has a date and a venue:** Friday 26 June 2026, 17:00–24:00, Prisma by Lumia, Am Grünen Prater 2/Tribüne 2, 1020 Wien. Free entrance. Sold out, 200 attended. It came **after** Event Nº2, so round 3's chain order is wrong. The correct order is Kick-off (30 May 2025) → Nº2 (20 Mar 2026) → Summit 360° (26 Jun 2026) → Going Onchain (23 Oct 2026).
3. **The Summit speakers are public on Luma:** Sabina Liu (KuCoin EU), Ibrahim Abed (Bybit EU), Alina Shekurova (Bitpanda), plus a secret guest. Names stay off our site until the club agrees.
4. **WU is now verified.** The Instagram bio reads "Built by @wuvienna students for everyone", and the partner row shows "Supported by WU Vienna". At 5 Oct: 399 followers, 72 posts. Highlights: Summit 360, Bybit x CCV, Numero 2, WU Clubs Fair, Kick-Off.
5. **Partners on the site ("Brands Who Work With Us"):** Bybit, Startup House by Lumia, Webskill, WU Vienna. Webskill seems to be the agency that built the current site (a media alt text reads "Killer Web Marketing SEO y Desarrollo SL"). Ask whether it belongs in the partner row.
6. The Bybit "Win 300 USDC" giveaway graphic is in the media library but no longer on the homepage.
7. The bot is still promoted with three steps but has no link or handle. The mock-ups name it "CryptoClubVienna Bot #1".
8. **The site has no community link anywhere.** "Join the Community" opens a form (name, message, email, Subscribe).
9. **One live line we won't carry over:** "Join the community today, profit tomorrow." It reads as a promise of returns, which conflicts with the no-advice stance and the risk note. Their other copy matches RESEARCH.md word for word.
10. The site is English only.

## Where round 3 clashes with their brand

| # | Round 3 | Their brand | Stage 2 proposal |
|---|---|---|---|
| 1 | navy-black ground `#0a0e14` | black `#000001` | swap tokens |
| 2 | gold as the "live" colour, gold coin, gold pins | no gold anywhere; violet is the only accent | violet for the primary button, icon tiles and our pins. **Live signal:** their light `#EAEDF2` button, which they already use for the event CTA. When an event is upcoming, the nav chip and hero date turn light-filled. No new colour, no pulse. |
| 3 | cream `.paper` sections (manifesto, join) | no light grounds | drop the paper grounds. The rhythm comes from the `#0A131F` band and a full-bleed event photo instead. **Your call.** |
| 4 | 2 px corners everywhere | 15 px cards and photos, 6 px buttons | swap `--radius`, add `--radius-btn` |
| 5 | Bricolage Grotesque, Instrument Sans, Martian Mono | Syne, Inter, Quicksand labels | self-host Syne 700 and Inter 400/500; Quicksand 500 only for `/labels/`; keep mono only for hashes and the countdown inside the events chain. Inter is the body face here, so it carries no personality; Syne does. |
| 6 | 2 × 2 square logo mark + "Crypto Club Vienna" in Bricolage | CCV + spire lockup | their lockup in the nav, their favicon |
| 7 | footer wordmark built from lattice squares | not theirs, and it competes with their logo | replace it with their lockup at size, or a large Syne "Crypto Club Vienna" |
| 8 | Hoffmann square lattice as the motif | spire, node chain, ✦, violet streaks | the lattice stays only where it is the content: the events chain (blocks) and the map grid. The node chain from their mark can link the chain blocks. |
| 9 | U-Bahn colours as the scale for tracks and map | single-accent violet; U2 purple would read as brand violet | tracks: their violet accent bar, no rainbow. Map: greys plus violet for club venues; U-Bahn lines only when toggled on, since they're wayfinding facts. |
| 10 | gold button with a sweep fill | violet fill, 6 px, Inter 500, 14 × 20, no border; light secondary; outline 1 px `#EAEDF2` | rebuild `.btn-*` to their three styles; drop the sweep |
| 11 | square hairline cards | 1 px `#434366`, 15 px, transparent | apply to event cards and tracks only, so it doesn't become a bordered tile grid everywhere |
| 12 | 3D city in navy and gold | black, grey, violet | recolour: grey blocks, violet venue. A Spline object of their poster coin (chrome-violet, "ccv" ring) is the natural Spline candidate for stage 3. |
| 13 | no photos; gallery hidden | strong event photography | gallery on, one cover photo per past event card, the Going Onchain poster on its card |
| 14 | events: Summit undated and placed before Nº2; no upcoming event | 4 events, one upcoming | fix order and data; add Going Onchain as `upcoming`. That switches the live state on for real. |
| 15 | proof band "200 / 3 / 3" | 4 events now | recount from events.json |

Kept from round 3 because it fits inside their brand: the four-moment motion budget, the Ask typewriter, the events chain ("Going Onchain" is literally the chain), the map, the plain copy rules.

## New questions for the club (added to the 17)

18. Can you send the logo as SVG, or at least as a transparent PNG?
19. Which typeface is the CCV wordmark and the poster headlines ("GOING ONCHAIN") set in?
20. Is Going Onchain free? Who are the three speakers, and may we name them?
21. May we name the Summit 360° speakers listed on Luma?
22. Is Webskill a partner, or the agency that built the site?
23. Which event are the February photos from (`IMG_0890/0917/0933`, the "THANK U!" stage), and the June ones (`IMG_2184/2427`)?
