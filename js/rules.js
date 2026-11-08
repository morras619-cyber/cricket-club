import { CFG } from './config.js';

// When does the player get to field a chance themselves? (GDD 5.1)
// chance: { kind: 'edge'|'stumping'|'catch'|'runout'|'save', p }
// state:  { events, lastEventBall, setting: 'off'|'key'|'all' }
export function playerControls(chance, state, ballNo, cfg = CFG.fielding) {
  if (state.setting === 'off') return false;
  // a run out is yours to throw when your fielder is close to the ball; one who'd have a long
  // run to it first is played out for you (no slow-motion wait for him to get there)
  if (chance.kind === 'runout') return chance.near !== false;
  if (state.events >= cfg.cap) return false;
  if (chance.kind !== 'edge' && state.lastEventBall === ballNo - 1) return false;
  if (state.setting === 'all') return true;
  return chance.p >= cfg.minP && chance.p <= cfg.maxP;
}

// Share-card moment score for a ball (GDD 7).
const BASE = { ultimate: 100, lastBallWin: 90, keeper: 80, runout: 75, powerSix: 70, twoWickets: 85, clash: 65, six: 40, catch: 60, wicket: 35, four: 20, save: 45 };
export function momentScore(kind, { ballNo = 1, perfect = false, longThrow = false, fielding = false } = {}) {
  let s = BASE[kind] || 0;
  if (perfect && kind === 'ultimate') s *= 1.5;
  if (fielding) s *= 1.2;
  if (longThrow) s *= 1.3;
  if (kind === 'lastBallWin') s *= 1.5;
  if (ballNo >= 25) s *= 1.2;
  return Math.round(s);
}

// ---------- loading-screen tips (js/game.js warmUp) ----------
// Short, true to the game as it is. They are shown in a shuffled order: each comes up once before any comes back.
export const TIPS = [
  // batting
  'Hold, swipe, then lift your finger the moment the shrinking ring meets the target ring.',
  'A quick tap defends: the ball can\'t be edged or caught, and it is usually a dot.',
  'Don\'t touch the screen and you leave the ball. Let the wide ones go.',
  'The GROUND / LOFT switch stays as you left it, so check it before every ball.',
  'Perfect timing earns the most Charge, and a streak of perfect shots earns extra.',
  'Swing too late and the ball is already past you: you can\'t hit what is behind you.',
  'Every phone has its own touch delay. Measure yours in Settings, Touch timing, and the game takes it off your timing.',
  'Missing a swing costs 5 Charge. A block or a leave keeps the meter level.',
  // bowling
  'How far you swipe sets the length: a short swipe is a bouncer, a long one a yorker.',
  'Curve your swipe to swing or spin the ball, and drag sideways while it flies to bend it late.',
  'Flick speed sets the pace. Stay in the green zone: too fast and it sprays or oversteps for a no-ball.',
  'Before each ball the batter shows the length he expects. Some of them bluff: surprise him.',
  'Set a batter up: a bouncer then a yorker, or an inswinger then an outswinger, beats repeating yourself.',
  'A slower ball after two quick ones fools the batter.',
  'A no-ball costs a run and gives a free hit: only a run out can dismiss the batter.',
  'Talk smack after a wicket and you may rattle the next batter, or fire him up. Leave it and you earn Composure.',
  // fielding
  'Keeper: tap while the ring is green and it is caught. A stumping needs a swipe up.',
  'An edge that flies wide of the keeper needs a slip or a gully to be caught. Set one when you want wickets.',
  'Tap SET FIELD before the delivery and drag fielders into the gaps. Your field is remembered.',
  'In the Power Burst, the first 12 balls, only two fielders may stand outside the ring.',
  'Run out: tap to pick up the ball, then swipe at the stumps you want to hit.',
  // Charge and powers
  'Charge tiers unlock at 30, 60 and 100. Above 60 the meter overheats and drains.',
  'Losing a wicket costs 20 Charge, and a quarter of what you have carries into the next innings.',
  'In the last 6 balls your powers cost 20% less.',
  'Batting powers lock when the ball is bowled. Bowling powers lock when you press BOWL.',
  'Sparks (Focus, Pinpoint, Speed Burst) work for any player in your side.',
  // pitches, stamina and types
  'A dry, dusty pitch grips more as the match goes on: spinners get stronger late.',
  'A damp, green pitch swings and seams early, then settles.',
  'Evening dew helps the chase: in the second innings the ball skids on and swing fades.',
  'Each bowler may bowl at most two overs, never two in a row, so plan your attack.',
  'Express bowlers tire 30% faster than a swing bowler. Spinners tire 40% slower.',
  'A tired batter hits shorter and times it worse. Singles rest him, big hits tire him.',
  'Openers score fast early but risk an early edge. Finishers start slowly and are strongest in the last 6 balls.',
  'Power batters struggle against good swing and left-arm pace.',
  'Touch batters time the ball beautifully but hate the short one.',
  'Anchors hit less hard but are hard to dislodge: good for the middle overs.',
  // your club
  'In the auction, read Squad fit, Price and Cash after before you bid.',
  'Young players with high potential grow. Nobody improves in training after 33.',
  'Your coaches keep training while you are away. Up to ten hours count.',
  'Net drill: face 10 balls yourself for up to 45 XP, three times a day.',
  'A better coach trains faster, and skipping a drill pays 14, 24 or 34 XP for a one, two or three-star coach.',
  'In the nets, the last ball of each trial is a power ball: watch how a player uses it.',
  'Stuck? Ask Uncle Dev: his button is on every career screen.',
  'Back up your save in Settings: you get a code to copy and restore on another phone.',
];
// a feed of tips in a shuffled order: each comes up once before any comes back, and a new round never opens with the tip the last one ended on
export function tipFeed(rand = Math.random) {
  let bag = [], last = -1;
  return () => {
    if (!bag.length) {
      bag = TIPS.map((_, i) => i);
      for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
      if (bag.length > 1 && bag[bag.length - 1] === last) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    last = bag.pop();
    return TIPS[last];
  };
}
