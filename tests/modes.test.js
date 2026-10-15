import test from 'node:test';
import assert from 'node:assert/strict';
import { TEAMS, teamById } from '../js/teams.js';
import { roster, starSquad, playerSquad, isUnlocked } from '../js/squads.js';
import { roundRobin, newLeague, newCup, nextFixture, advance, table, finish, simMatch } from '../js/tournament.js';
import { dailyScenario, dailyOutcome, updateStreak } from '../js/daily.js';
import { heroLevel, powerDiscount, addHeroXp, checkAchievements, ACHIEVEMENTS } from '../js/progress.js';
import { makeRng } from '../js/rng.js';
import { Innings } from '../js/match.js';

test('every team has its own players and its own star', () => {
  const names = new Set(), stars = new Set();
  for (const t of TEAMS) {
    for (const p of roster(t.id)) { assert.ok(!names.has(p.name), `${p.name} plays for two teams`); names.add(p.name); assert.ok(p.nick && p.trait); }
    stars.add(t.star);
  }
  assert.equal(names.size, TEAMS.length * 10);
  assert.equal(stars.size, TEAMS.length);
});

test('your star always plays; signings fill the other slots but never face their own team', () => {
  assert.deepEqual(Object.keys(starSquad('vipers')).filter(k => starSquad('vipers')[k]), ['bowl']);
  const sq = playerSquad('thunder', { bowl: 'zara', field: 'rani' }, ['zara', 'rani'], 'vipers');
  assert.equal(sq.bat.id, 'raja'); assert.equal(sq.bowl.id, 'zara'); assert.equal(sq.field.id, 'rani');
  assert.equal(playerSquad('thunder', { bowl: 'zara' }, ['zara'], 'cyclones').bowl, null); // Zara is a Cyclone
  assert.equal(playerSquad('thunder', { bowl: 'zara' }, [], 'vipers').bowl, null); // not signed
  assert.ok(isUnlocked({ team: 'storm', unlocked: [] }, 'meher'));
  assert.ok(!isUnlocked({ team: 'storm', unlocked: [] }, 'raja'));
});

test('round robin: everyone plays everyone exactly once', () => {
  const ids = TEAMS.map(t => t.id), seen = new Set();
  const rounds = roundRobin(ids);
  assert.equal(rounds.length, 7);
  for (const r of rounds) {
    assert.equal(new Set(r.flat()).size, 8);
    for (const [a, b] of r) { const k = [a, b].sort().join(); assert.ok(!seen.has(k)); seen.add(k); }
  }
  assert.equal(seen.size, 28);
});

const fake = (state, win) => {
  const f = nextFixture(state);
  const me = { runs: 40, wkts: 1, balls: 30, boundaries: 5 }, them = { runs: 30, wkts: 3, balls: 25, boundaries: 2 };
  return { a: state.team, b: f.opp, ia: win ? me : them, ib: win ? them : me, winner: win ? state.team : f.opp, player: true, mine: me, theirs: them };
};
test('a league runs to a champion, with semis for the top four', () => {
  const s = newLeague('titans', 11);
  for (let i = 0; i < 7; i++) advance(s, fake(s, true));
  const t = table(s);
  assert.equal(t[0].id, 'titans'); assert.equal(t[0].pts, 14);
  assert.equal(t.reduce((n, r) => n + r.p, 0), 56);
  assert.equal(nextFixture(s).stage, 'semi');
  advance(s, fake(s, true)); advance(s, fake(s, true));
  assert.equal(finish(s), 'champion');
  assert.equal(nextFixture(s), null);
});

test('a cup ends when you lose, and still crowns someone', () => {
  const s = newCup('royals', 3);
  assert.equal(nextFixture(s).stage, 'qf');
  advance(s, fake(s, false));
  assert.equal(s.stage, 'done'); assert.ok(s.champion && s.champion !== 'royals');
  assert.equal(finish(s), 'out');
});

test('simulated matches give cricket-like scores', () => {
  const rng = makeRng(5);
  let runs = 0;
  for (let i = 0; i < 200; i++) { const m = simMatch('thunder', 'titans', rng); runs += m.ia.runs; assert.ok(m.ia.balls <= 30 && m.ia.wkts <= 3); }
  assert.ok(runs / 200 > 25 && runs / 200 < 60, `average ${runs / 200}`);
});

test('the daily challenge is the same for everyone and alternates chase and defend', () => {
  const a = dailyScenario('2026-10-20'), b = dailyScenario('2026-10-20'), c = dailyScenario('2026-10-21');
  assert.deepEqual(a, b);
  assert.notEqual(a.kind, c.kind);
  assert.ok(a.team !== a.opp && a.target > a.runsSoFar);
  const inn = new Innings(a.kind === 'chase' ? 'player' : 'ai', a.target);
  inn.balls = 30 - a.ballsLeft; inn.runs = a.runsSoFar; inn.wkts = a.wktsDown;
  inn.ball({ runs: a.target - a.runsSoFar });
  assert.equal(dailyOutcome(a, inn).won, a.kind === 'chase');
  const p = {};
  updateStreak(p, '2026-10-20'); updateStreak(p, '2026-10-21'); assert.equal(p.dailyStreak.count, 2);
  updateStreak(p, '2026-10-23'); assert.equal(p.dailyStreak.count, 1); assert.equal(p.dailyStreak.best, 2);
});

test('heroes level up with XP and their powers get cheaper', () => {
  assert.equal(heroLevel(0), 1); assert.equal(heroLevel(60), 2); assert.equal(heroLevel(1e9), 10);
  assert.equal(powerDiscount(1), 0); assert.equal(powerDiscount(4), 6);
  const p = {};
  assert.deepEqual(addHeroXp(p, { raja: 70 }), [{ id: 'raja', from: 1, to: 2 }]);
  assert.deepEqual(addHeroXp(p, { raja: 10 }), []);
});

test('achievements unlock once and pay their coins', () => {
  const p = { coins: 0, team: 'thunder' };
  const got = checkAchievements(p, { events: ['league', 'sign'] });
  assert.deepEqual(got.map(a => a.id).sort(), ['league', 'signStar']);
  assert.equal(p.coins, ACHIEVEMENTS.find(a => a.id === 'league').coins + ACHIEVEMENTS.find(a => a.id === 'signStar').coins);
  assert.deepEqual(checkAchievements(p, { events: ['league'] }), []);
  assert.ok(teamById('royals').style.field > 1);
});

test('players come from all the cricket nations, and every team is a mix', async () => {
  const { NATIONS } = await import('../js/nations.js');
  const { newCareer } = await import('../js/career.js');
  const seen = new Set();
  for (const t of TEAMS) {
    const ns = new Set(roster(t.id).map(p => p.nation));
    assert.ok(ns.size >= 3, `${t.id} has only ${[...ns]}`);
    for (const n of ns) { assert.ok(NATIONS[n], n); seen.add(n); }
  }
  assert.equal(seen.size, Object.keys(NATIONS).length);
  const c = newCareer(5);
  assert.ok(Object.values(c.players).every(p => NATIONS[p.nation]), 'everyone in the career has a country');
});

test('every club has its own home ground and pitch, and pitches change how the ball behaves', async () => {
  const { GROUNDS, pitchOf, homeFromSeed } = await import('../js/grounds.js');
  const names = new Set(), pitches = new Set();
  for (const t of TEAMS) { const g = GROUNDS[t.id]; assert.ok(g, t.id); names.add(g.name); pitches.add(g.pitch.id); }
  assert.equal(names.size, TEAMS.length); assert.equal(pitches.size, TEAMS.length);
  assert.ok(pitchOf('vipers').turn > 1 && pitchOf('titans').seam > 1 && pitchOf('cyclones').swing > 1 && pitchOf('thunder').bat > 1);
  assert.equal(pitchOf('royals').swing, 1);
  assert.ok(['a', 'b'].includes(homeFromSeed(7, 'a', 'b')));
  const s = newLeague('vipers', 3);
  const f = nextFixture(s);
  assert.ok([s.team, f.opp].includes(f.home));
});

test('every squad player has his own look; youngsters get one that fits their country', async () => {
  const { hasOwnLook, lookOf, randomLook, SKIN, HAIR, BEARDS } = await import('../js/looks.js');
  for (const t of TEAMS) for (const p of roster(t.id)) {
    assert.ok(hasOwnLook(p.id), p.id);
    const l = lookOf(p);
    assert.ok(SKIN[l.skin] && HAIR[l.hair] && BEARDS.includes(l.beard), p.id);
  }
  const looks = new Set(TEAMS.flatMap(t => roster(t.id).map(p => JSON.stringify(lookOf(p)))));
  assert.ok(looks.size > 50, 'plenty of different looks');
  assert.deepEqual(lookOf({ id: 'y3-9', nation: 'ZA' }), lookOf({ id: 'y3-9', nation: 'ZA' }));
  const { makeRng } = await import('../js/rng.js');
  const r = makeRng(1);
  for (let i = 0; i < 50; i++) assert.notEqual(randomLook('EN', r).style, 'bald');
});
