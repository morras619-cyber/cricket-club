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
| Field | Before a delivery, tap **SET FIELD** or the field map (top right) to move your nine fielders: drag one, or tap one and then tap where they should stand. Presets are starting points; the Power Burst still allows only 2 outside the circle. Your field is remembered. |
| Their field | While batting, the map in the top right shows the opposition's fielders. Tap it before the ball to see it full size with position names. |
| Coin toss | Quick Match starts with a toss: call heads or tails; win it and choose to bat or bowl first. |
| Banter | After a good ball, **Talk smack** or **Leave it**. Smack talk can rattle a batter (more mistakes) or fire him up (more aggressive, better timing). Leaving it earns Composure, sometimes Respect. When the opposition sledges you, answer with a dot/wicket (bowling) or a boundary (batting) for +10 REVENGE. |
| Keeper Mode | Tap when the ball reaches the gloves, or swipe toward it to dive. A juggle needs a second tap. Stumpings need a swipe up. |
| Outfield Mode | Catch: tap as the ring closes (swipe to dive if it's out of reach). Run-out: tap to pick up, then swipe at the stumps you want to hit. Rope save: swipe to dive. |
| Powers | Tap a hero button when you have the Charge. Batting powers lock when the ball is bowled; bowling powers lock when you press BOWL. |

Fielding control triggers only on chances you can swing (5–90% success), at most 6 per innings, never on consecutive balls (edges excepted). Change it under **Fielding** on the home screen.

## What's in this build

- **Quick Match** vs AI: a coin toss decides who bats first; each side gets 30 balls and 3 wickets, about 5–7 minutes.
- **Challenge links**: the result screen makes a WhatsApp share and a link (`…/#c<token>`). Your friend faces the exact same 30 deliveries and must beat your score.
- **Issue #1 tutorial**: a scripted final over that can't be lost — a timed shot, a hero power, and a keeper catch in about 90 seconds. Shown automatically on first launch.
- **Charge Meter** per the GDD: tiers at 30/60/100, overheat above 60, −20 on losing a wicket, 25% carry-over between innings, 20% discount in the last 6 balls, perfect-timing streaks.
- **8 heroes** with signature powers: Thunderclap Six, Mirror Gap, Meteor Six (ultimate), Tornado Yorker, Maya Ball, Shatter Seam, Elastic Grab + Time-Freeze Stumping (ultimate), Lightning Relay. Plus three Sparks (Focus, Pinpoint, Speed Burst).
- **Share card**: a 1080×1350 comic panel of your biggest moment, generated on the device.
- **Light progression**: XP and levels, coins, a 7-day login calendar that pauses rather than resets. Saved in the browser.

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
| `js/scene.js`, `js/figure.js`, `js/fx.js` | Cameras, comic figures, onomatopoeia and impact effects |
| `js/ui.js`, `js/main.js` | HUD, menus, squad picker, results and sharing |
| `js/sharecard.js`, `js/codec.js`, `js/profile.js` | Share card, challenge links, local progression |

## Tests

```bash
npm test     # unit tests for the game logic (Node 20+)
npm run smoke  # a bot plays the tutorial and a full match in headless Chromium (needs Playwright)
```

Set `window.__SIXCHARGE_BOT = true` before load to let the bot play; `window.__SIXCHARGE_SPEED` speeds the clock up.
