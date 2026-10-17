# Sixcharge: Superhero Cricket

A comic-book superhero cricket game for mobile browsers: 30-ball innings, a Charge Meter that powers eight original heroes, swipe batting, line-and-length bowling, and hands-on fielding (Wicket-Keeper Mode and Outfield Mode). Built as a playable vertical slice of the game design document.

Plain HTML5 canvas and ES modules — no framework, no build step, no downloads beyond two Google Fonts. Aimed at mid- and low-end Android phones.

## Run it

```bash
npm start            # serves the folder on http://localhost:8080
```

Open it on a phone on the same network, or use desktop Chrome's device toolbar. ES modules don't load from `file://`, so use a local server (any static server works).

## How to play

| Moment | Control |
| --- | --- |
| Batting | Touch and hold as the ball comes, swipe in the shot direction, **lift your finger when the shrinking ring meets the target ring**. Every direction is a shot: swipe up to drive straight, sideways to play square, **down-left to glance to fine leg, down-right to late-cut to third man, straight down to scoop over the keeper** (needs good timing, or it's gloved or skied). **The GROUND / LOFT switch** (bottom left while batting) picks the shot: along the ground, or in the air. It stays as you left it until you tap it again. (The tutorial still lofts on a long swipe.) Don't touch = leave. **Quick tap = defend**: a dead bat with a wide timing window, timed from your touch; usually a dot, can't be caught or edged, and it keeps out Tornado Yorker and Shatter Seam. |
| Bowling | **One swipe from your bowler up the pitch.** How far you swipe sets the length (short swipe = bouncer, long = yorker), sideways sets the line, a curve in the swipe adds swing or spin, and flick speed sets pace (green zone = perfect; too slow = slower ball; too fast sprays it or oversteps for a no-ball). While the ball is in the air, **drag sideways to bend it late**. |
| Reading the batter | Before each ball the batter shows what length he expects (some bluff). Surprise him, hit his weak spot (scouted after the first over), or chain setups: bouncer → yorker, inswinger ↔ outswinger, or a slower ball after two quick ones. Repeat yourself and he reads you. |
| Field | Before a delivery, tap **SET FIELD** or the field map (top right) to open a top-down board. Drag a fielder token (it lifts above your thumb), or tap one and then tap where it should stand. Presets are starting points; the Power Burst still allows only 2 outside the circle. Your field is remembered. |
| Their field | While batting, the map in the top right shows the opposition's fielders. Tap it before the ball to see it full size with position names. |
| Coin toss | Quick Match starts with a toss: call heads or tails; win it and choose to bat or bowl first. |
| Banter | After a wicket (and now and then after a dot ball, at most once an over), **Talk smack** or **Leave it**. Smack talk can rattle a batter (more mistakes) or fire him up (more aggressive, better timing). Leaving it earns Composure, sometimes Respect. When the opposition sledges you, answer with a dot/wicket (bowling) or a boundary (batting) for +10 REVENGE. |
| Keeper Mode | A ring closes on the ball. **Tap while it's green and it's caught**; if the ball is wide he dives for it himself. A tap just outside green juggles it (tap again). Stumpings need a swipe up. |
| Outfield Mode | Catch: **tap while the ring is green and it's caught**; out of reach, your fielder dives for it himself. Run-out: tap to pick up, then swipe at the stumps you want to hit. Rope save: swipe to dive. |
| Powers | Tap a hero button when you have the Charge. Batting powers lock when the ball is bowled; bowling powers lock when you press BOWL. |

Fielding control triggers only on chances you can swing (5–90% success), at most 6 per innings, never on consecutive balls (edges excepted). Change it under **Fielding** on the home screen.

## What's in this build

- **Quick Match** vs AI: a coin toss decides who bats first; each side gets 30 balls and 3 wickets, about 5–7 minutes.
- **Challenge links**: the result screen makes a WhatsApp share and a link (`…/#c<token>`). Your friend faces the exact same 30 deliveries and must beat your score.
- **Issue #1 tutorial**: a scripted final over that can't be lost — a timed shot, a hero power, and a keeper catch in about 90 seconds. Shown automatically on first launch.
- **Charge Meter** per the GDD: tiers at 30/60/100, overheat above 60, −20 on losing a wicket, 25% carry-over between innings, 20% discount in the last 6 balls, perfect-timing streaks.
- **8 heroes** with signature powers: Thunderclap Six, Mirror Gap, Meteor Six (ultimate), Tornado Yorker, Maya Ball, Shatter Seam, Elastic Grab + Time-Freeze Stumping (ultimate), Lightning Relay. Plus three Sparks (Focus, Pinpoint, Speed Burst).
- **Night-stadium look**: floodlit ground with a skyline, two crowd tiers, flags, a scrolling LED board that reacts to sixes, fours and wickets, a textured pitch with footmarks, and cel-shaded heroes (each with their own hair, emblem and helmet) drawn to true scale against the stumps. Signature powers fire a full-screen comic cut-in panel for you and the AI. Budget phones (≤2 GB RAM or ≤2 cores) get a lighter mode automatically.
- **Eight real teams**: each has its own ten hand-picked players (with nicknames, a trait and a country each: India, Pakistan, England, Australia, New Zealand, South Africa, West Indies, Bangladesh, Sri Lanka, Afghanistan, Ireland, Zimbabwe; all names are made up), its own star hero and its own style: Thunder slog, Titans block and grind, Vipers spin you out, Phoenix finish late, Royals and Eagles field faster. Your team's star always plays for you; sign stars from other teams (250 coins) for the other hero slots, though a signing never plays against his own team. Set your batting order (four bat; when one is out the next walks in) and a three-man attack on the team sheet. Signature powers only work while that hero bats or bowls; Sparks work for anyone.
- **Player looks**: every player has his own skin tone, hair colour and style (crops, curls, afros, dreads, a patka…) and facial hair, set by hand for the squads and generated to fit the country for academy graduates. A comic face for each player shows in squad lists, the auction, the NEW BATTER and over banners, and the records; in matches the hand-drawn batter and bowler sprites are repainted in that player's skin and hair.
- **Home grounds**: every club has its own stadium, painted in code: The Thunderdome (lightning-bolt floodlights, storms), Cyclone Park (wind turbines, grey skies), The Snakepit (a giant red snake on the roof, dusk), Eagle's Nest (golden eagle statue, mountains, sunshine), The Furnace (fire cauldrons that flare on sixes, sunset), The Foundry (girders, crane, smokestacks), Eye of the Storm (a swirling vortex, rain, lightning) and Royal Palace Oval (domes, bunting, fireworks). The crowd, flags, rope, roof and outfield crest are in the home colours, and the board says whose ground it is. Each pitch plays differently: a flat road, an overcast swinger, a dusty turner, fast and bouncy, evening dew that helps the chase, a green seamer, slow and low, and a lightning-fast outfield. A pitch report comes before the toss; the home side gets a louder crowd and a little extra charge for boundaries. League fixtures alternate home and away.
- **Home hub**: Quick Match, Super League, Knockout Cup and the Daily Challenge, with your team badge, coins and current tournament position up front; My Team, Trophies, Stats and the tutorial below.
- **Super League career**: seasons that carry on. Pick a club before each season (stay or move; clubs have ratings, and the giants unlock in later seasons: tier 1 in season 1, Thunder in season 4). Before every season there's an auction: bid against the seven AI clubs for the heroes, players whose contracts ended and this year's academy graduates. You start with $3M, so the rich clubs get the stars at first; prize money by final position ($10M for the champions down to $2M), a sponsor's $1M and $0.4M a win let you grow. Players have ages and a potential: they improve with good performances until 33, decline from 34 and retire from 36; seven teenagers join each season, and a regular who reaches 86 becomes a star with an ability (Eagle Eye, Finisher, Swing Master, Death King, Mystery Ball). The other matches are simulated ball by ball, so everyone has a scorecard, and the league records (most runs, wickets, sixes, highest scores, best bowling, titles by club, season by season) never reset. **Knockout Cup**: quarter-final, semi-final, final with the standard squads.
- **Daily Challenge**: one scenario a day, the same for everyone (chase or defend, set from the date), one attempt, a shareable emoji scorecard and a streak.
- **Hero levels and achievements**: heroes earn XP when they play; each level makes their signature power 2 charge cheaper and their batting or bowling a point better. 19 achievements (hat-trick, last-ball win, 100 m six, Invincibles…) pay coins and fill the Trophies screen.
- **Bowler types**: express pace (142-153 km/h, slower bouncer), swing (outswinger/inswinger, slower ball), seam and cutters (leg-cutter, off-cutter, knuckle ball), left-arm pace (angled across, from the other side of the stumps), off-spin (off-break, arm ball) and leg-spin (leg-break, googly). Each over you pick who bowls (two overs each at most, never two in a row); the AI rotates its own attack. The speed and type show as each ball is bowled. Better batters get slightly wider timing windows; tail-enders get less.
- **8 teams**: pick yours on the squad screen (Thunder Strikers, Green Cyclones, Volt Vipers, Golden Eagles, Phoenix Blaze, Steel Titans, Purple Storm, Pink Royals). Your batter, keeper and fielders wear your kit; the opposition is another team.
- **Share card**: a 1080×1350 comic panel of your biggest moment, generated on the device.
- **Light progression**: XP and levels, coins, a 7-day login calendar that pauses rather than resets. Saved in the browser.
- **Stats**: a live hero line during play, a scorecard after each match, and Career stats (runs, balls, highest score, average, strike rate, ducks, longest six with NEW RECORD! when you beat it; overs, wickets, runs against, best figures, economy, maidens), overall and per hero. Each dismissal ends a batter's innings; run-outs aren't bowler wickets. The match scorecard lists every batter and every bowler.

Not built yet: real-money store and cosmetics, online accounts and group leaderboards (they need a server), Hindi/Urdu text, licensed audio. Sound effects are synthesised in the browser.

## Project layout

| File | What it does |
| --- | --- |
| `js/config.js` | Every tuning number (timing windows, charge values, fielding, running) |
| `js/charge.js` | Charge Meter rules |
| `js/physics.js` | Delivery trajectories (line, length, swing, spin) |
| `js/shots.js` | Timing grades, swipe → shot, contact resolution, power effects |
| `js/fieldsim.js` | Where the ball goes; catch, run-out and boundary-save chances; runs |
| `js/ai.js` | Seeded AI bowling scripts and the AI batter |
| `js/rules.js` | When the player gets fielding control; share-card moment scoring |
| `js/tactics.js` | The bowling swipe, batter expectations, weak spots, setup combos, fielding position names |
| `js/banter.js` | Sledges, comebacks and compliments |
| `js/game.js` | Match flow, ball sequences, fielding events, tutorial, rendering |
| `js/scene.js`, `js/figure.js`, `js/fx.js` | Cameras, night stadium, cel-shaded figures, onomatopoeia and impact effects |
| `js/batsprite.js`, `img/batter-*.webp` | Hand-drawn batter frames seen from behind, one sheet per team: an animation per swipe (drive, pull, cut, block, leave, bowled) |
| `js/bowlsprite.js`, `img/bowler.webp`, `img/bowler-back-*.webp` | Hand-drawn bowler and fielders: front view for the batting camera, back view (one sheet per team) for the bowling camera (run-up, gather, coil, release, follow-through, celebrations), repainted in the fielding team's kit |
| `img/spinner-front.webp`, `img/spinner-back-thunder.webp`, `tools/build_spinner_sprites.py` | The spin bowler (off-spin and leg-spin): a short walk-up, gather, coil and high-arm delivery, front view for the batting camera and back view for the bowling camera; other teams get it repainted in their kit |
| `tools/build_bowler_sprites.py` | Cuts a labelled bowler sheet into an atlas (`--back` mirrors the back-view sheet into a right-arm action) |
| `img/batter-front.webp`, `tools/build_front_batter.py` | The opposing batter seen from the bowling camera, same shots as the back view, repainted in his team's kit |
| `img/keeper-back.webp`, `img/keeper-front.webp`, `tools/build_keeper_sprites.py` | Hand-drawn wicket-keeper: back view in Keeper Mode (crouch, rise, takes, dives, juggle, stumping, celebration), front view behind the batter when bowling; in the fielding team's kit |
| `img/field-top.webp`, `img/field-front.webp`, `tools/build_field_sprites.py` | Outfield Mode players seen from above, drawn upright: back view for players looking up the screen, face view for those looking down it, so everyone watches the pitch |
| `img/burst.webp`, `tools/build_burst.py` | Hand-drawn 8-frame impact burst on powered hits (gold Thunderclap, orange Meteor, purple Mirror) and, smaller, on perfect timing |
| `img/logo-*.webp`, `tools/build_logos.py` | Team logos: team picker, scoreboard, and the team-v-team match intro |
| `js/looks.js` | Players' appearance, comic face portraits, and repainting skin and hair on the match sprites |
| `js/grounds.js` | The eight home grounds: their look and how each pitch plays |
| `js/nations.js` | The cricket nations, their flags and name pools for academy graduates |
| `js/teams.js` | The eight teams: kit colours, star hero and playing style |
| `js/squads.js` | Bowler types and their deliveries, each team's hand-written squad, whose heroes play, signings, batting orders, bowling attacks and the over-by-over bowling plan |
| `js/career.js` | The Super League career: clubs and ratings, players' ages, potential and value, the auction, simulated matches, prize money, the off-season and the records |
| `js/tournament.js` | Super League and Knockout Cup: fixtures, simulated matches, the table with net run rate, knockouts |
| `js/daily.js` | The daily challenge scenario, its result and the streak |
| `js/progress.js` | Hero levels and achievements |
| `tools/build_batter_sprites.py` | Cuts labelled batting sprite sheets into the per-team images |
| `js/cutin.js` | The comic cut-in panel for signature powers |
| `js/quality.js` | High/low graphics setting, picked from the device |
| `js/ui.js`, `js/main.js` | HUD, menus, squad picker and team sheet, the over-by-over bowler picker, results and sharing |
| `js/sharecard.js`, `js/codec.js`, `js/profile.js` | Share card, challenge links, local progression |

## Tests

```bash
npm test     # unit tests for the game logic (Node 20+)
npm run smoke  # a bot plays the tutorial and a full match in headless Chromium (needs Playwright)
```

Set `window.__SIXCHARGE_BOT = true` before load to let the bot play; `window.__SIXCHARGE_SPEED` speeds the clock up.

## Ideas for later

- **The negotiator (Super League).** An agent character (portrait: `img/people/negotiator.webp`, the
  chubby, friendly, greying man holding the ball in both hands) who pops up between matches and
  seasons: asks you questions, brings news, and offers to sell you players as the seasons go on.
