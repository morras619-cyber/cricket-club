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
| Batting | Touch and hold as the ball comes, swipe in the shot direction, **lift your finger when the shrinking ring meets the target ring**. Short swipe = along the ground, long swipe = lofted. Don't touch = leave. |
| Bowling | **One swipe from your bowler up the pitch.** How far you swipe sets the length (short swipe = bouncer, long = yorker), sideways sets the line, a curve in the swipe adds swing or spin, and flick speed sets pace (green zone = perfect; too slow = slower ball; too fast sprays it or oversteps for a no-ball). While the ball is in the air, **drag sideways to bend it late**. |
| Reading the batter | Before each ball the batter shows what length he expects (some bluff). Surprise him, hit his weak spot (scouted after the first over), or chain setups: bouncer → yorker, inswinger ↔ outswinger, or a slower ball after two quick ones. Repeat yourself and he reads you. |
| Field | Before a delivery, tap **SET FIELD** or the field map (top right) to open a top-down board. Drag a fielder token (it lifts above your thumb), or tap one and then tap where it should stand. Presets are starting points; the Power Burst still allows only 2 outside the circle. Your field is remembered. |
| Their field | While batting, the map in the top right shows the opposition's fielders. Tap it before the ball to see it full size with position names. |
| Coin toss | Quick Match starts with a toss: call heads or tails; win it and choose to bat or bowl first. |
| Banter | After a good ball, **Talk smack** or **Leave it**. Smack talk can rattle a batter (more mistakes) or fire him up (more aggressive, better timing). Leaving it earns Composure, sometimes Respect. When the opposition sledges you, answer with a dot/wicket (bowling) or a boundary (batting) for +10 REVENGE. |
| Keeper Mode | A yellow ring closes on the target (it turns green at the perfect moment): tap as it closes, or if an arrow shows, swipe along the arrow to dive. If you juggle it, tap again quickly. Stumpings need a swipe up. |
| Outfield Mode | Catch: tap as the ring closes (swipe to dive if it's out of reach). Run-out: tap to pick up, then swipe at the stumps you want to hit. Rope save: swipe to dive. |
| Powers | Tap a hero button when you have the Charge. Batting powers lock when the ball is bowled; bowling powers lock when you press BOWL. |

Fielding control triggers only on chances you can swing (5–90% success), at most 6 per innings, never on consecutive balls (edges excepted). Change it under **Fielding** on the home screen.

## What's in this build

- **Quick Match** vs AI: a coin toss decides who bats first; each side gets 30 balls and 3 wickets, about 5–7 minutes.
- **Challenge links**: the result screen makes a WhatsApp share and a link (`…/#c<token>`). Your friend faces the exact same 30 deliveries and must beat your score.
- **Issue #1 tutorial**: a scripted final over that can't be lost — a timed shot, a hero power, and a keeper catch in about 90 seconds. Shown automatically on first launch.
- **Charge Meter** per the GDD: tiers at 30/60/100, overheat above 60, −20 on losing a wicket, 25% carry-over between innings, 20% discount in the last 6 balls, perfect-timing streaks.
- **8 heroes** with signature powers: Thunderclap Six, Mirror Gap, Meteor Six (ultimate), Tornado Yorker, Maya Ball, Shatter Seam, Elastic Grab + Time-Freeze Stumping (ultimate), Lightning Relay. Plus three Sparks (Focus, Pinpoint, Speed Burst).
- **Night-stadium look**: floodlit ground with a skyline, two crowd tiers, flags, a scrolling LED board that reacts to sixes, fours and wickets, a textured pitch with footmarks, and cel-shaded heroes (each with their own hair, emblem and helmet) drawn to true scale against the stumps. Signature powers fire a full-screen comic cut-in panel for you and the AI. Budget phones (≤2 GB RAM or ≤2 cores) get a lighter mode automatically.
- **8 teams**: pick yours on the squad screen (Thunder Strikers, Green Cyclones, Volt Vipers, Golden Eagles, Phoenix Blaze, Steel Titans, Purple Storm, Pink Royals). Your batter, keeper and fielders wear your kit; the opposition is another team.
- **Share card**: a 1080×1350 comic panel of your biggest moment, generated on the device.
- **Light progression**: XP and levels, coins, a 7-day login calendar that pauses rather than resets. Saved in the browser.
- **Stats**: a live hero line during play, a scorecard after each match, and Career stats (runs, balls, highest score, average, strike rate, ducks; overs, wickets, runs against, best figures, economy, maidens), overall and per hero. Each dismissal ends a batting innings; run-outs aren't bowler wickets.

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
| `tools/build_bowler_sprites.py` | Cuts a labelled bowler sheet into an atlas (`--back` mirrors the back-view sheet into a right-arm action) |
| `img/batter-front.webp`, `tools/build_front_batter.py` | The opposing batter seen from the bowling camera, same shots as the back view, repainted in his team's kit |
| `img/keeper-back.webp`, `img/keeper-front.webp`, `tools/build_keeper_sprites.py` | Hand-drawn wicket-keeper: back view in Keeper Mode (crouch, rise, takes, dives, juggle, stumping, celebration), front view behind the batter when bowling; in the fielding team's kit |
| `img/field-top.webp`, `img/field-front.webp`, `tools/build_field_sprites.py` | Outfield Mode players seen from above, drawn upright: back view for players looking up the screen, face view for those looking down it, so everyone watches the pitch |
| `js/teams.js` | The eight teams and their kit colours |
| `tools/build_batter_sprites.py` | Cuts labelled batting sprite sheets into the per-team images |
| `js/cutin.js` | The comic cut-in panel for signature powers |
| `js/quality.js` | High/low graphics setting, picked from the device |
| `js/ui.js`, `js/main.js` | HUD, menus, squad picker, results and sharing |
| `js/sharecard.js`, `js/codec.js`, `js/profile.js` | Share card, challenge links, local progression |

## Tests

```bash
npm test     # unit tests for the game logic (Node 20+)
npm run smoke  # a bot plays the tutorial and a full match in headless Chromium (needs Playwright)
```

Set `window.__SIXCHARGE_BOT = true` before load to let the bot play; `window.__SIXCHARGE_SPEED` speeds the clock up.
