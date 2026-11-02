// Helpers for the Chirp tests: play a match with real Innings objects, ball by ball, so the moments (a hat-trick missed by one ball, a duck...) are real.
import * as C from '../js/career.js';
import { Innings } from '../js/match.js';
import { makeRng } from '../js/rng.js';

export const career = (seed = 7, club = 'harbour') => { const c = C.newCareer(seed); C.chooseClub(c, club); C.finishAuction(c); return c; };
const top = (c, team, n, pred = () => true) => C.clubPlayers(c, team).filter(pred).sort((a, b) => (b.bat + b.bowlSkill) - (a.bat + a.bowlSkill)).slice(0, n);
export const batters = (c, team) => top(c, team, 8, p => p.role !== 'bowl' || p.bat >= 50);
export const bowlers = (c, team) => top(c, team, 3, p => p.role === 'bowl' || p.role === 'all' || p.bowlSkill >= 60);

// one innings: balls is a list of '0' '1' '2' '4' '6' 'W' (a legal ball each), or a function (i, rng) -> one of them
export function innings(side, bats, bowls, balls, { target = null, seed = 1 } = {}) {
  const inn = new Innings(side, target), rng = makeRng(seed);
  let next = 0;
  inn.setBatter(bats[next++]); inn.setPartner(bats[next++]);
  const total = typeof balls === 'function' ? 30 : balls.length;
  for (let i = 0; i < total && !inn.done(); i++) {
    if (i % 6 === 0) inn.setBowler(bowls[Math.floor(i / 6) % bowls.length]);
    const o = typeof balls === 'function' ? balls(i, rng) : balls[i];
    if (o === 'W') { inn.ball({ wicket: true }); if (!inn.done()) inn.setBatter(bats[next++]); }
    else inn.ball({ runs: +o });
  }
  return inn;
}

// a match of mine against opp: my innings (mineBalls) and theirs, as the career wants it: { innings, result, oppTeam }
export function playMatch(c, opp, mineBalls, theirBalls, { mineFirst = true, seed = 3 } = {}) {
  const mine = batters(c, c.club), mineB = bowlers(c, c.club), theirs = batters(c, opp), theirB = bowlers(c, opp);
  const a = innings('player', mine, theirB, mineBalls, { seed });
  const b = innings('ai', theirs, mineB, theirBalls, { target: a.runs + 1, seed: seed + 1 });
  const won = b.runs <= a.runs;
  return { innings: [a, b], result: { outcome: won ? 'win' : 'loss' }, oppTeam: { id: opp }, mine, mineB, theirs, theirB };
}
export const play = (c, summary) => C.afterLeagueMatch(c, summary);
