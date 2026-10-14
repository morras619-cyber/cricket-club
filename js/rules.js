import { CFG } from './config.js';

// When does the player get to field a chance themselves? (GDD 5.1)
// chance: { kind: 'edge'|'stumping'|'catch'|'runout'|'save', p }
// state:  { events, lastEventBall, setting: 'off'|'key'|'all' }
export function playerControls(chance, state, ballNo, cfg = CFG.fielding) {
  if (state.setting === 'off') return false;
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
