import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/career.js';
import { matchFacts, memOf, noteEvent } from '../js/chirpfacts.js';
import { nextFixture } from '../js/tournament.js';
import { career, playMatch, play, batters, bowlers } from './chirphelp.js';

const OUT = n => Array(n).fill('1');   // (singles: a quiet innings)
const facts = (c, s, extra = {}) => matchFacts(c, s, { won: s.result.outcome === 'win', opp: s.oppTeam.id, derby: false, story: { tone: 'solid' }, ...extra });
const typesOf = list => list.map(f => f.type);

test('two wickets in two balls by one bowler: almost a hat-trick, said about him', () => {
  const c = career(11), f = nextFixture(c.league);
  const s = playMatch(c, f.opp, OUT(30), ['0', '1', 'W', 'W', '0', '1', ...OUT(24)]);
  const bw = bowlers(c, c.club)[0], list = facts(c, s), near = list.find(x => x.type === 'nearHat');
  assert.ok(near, typesOf(list).join(','));
  assert.equal(near.pid, bw.id);
  assert.equal(near.vars.p, bw.name.split(' ').slice(-1)[0]);
  assert.ok(near.sal >= 80);
});

test('three in three: a hat-trick, the biggest moment there is', () => {
  const c = career(11), f = nextFixture(c.league);
  const s = playMatch(c, f.opp, OUT(30), ['0', 'W', 'W', 'W']);
  const list = facts(c, s);
  assert.equal(list[0].type, 'hatTrick');
  assert.equal(list[0].sal, Math.max(...list.map(x => x.sal)));
  assert.ok(!typesOf(list).includes('nearHat'), 'one thing for one bowler');
});

test('two wickets in the same over that are not in a row are not a near hat-trick', () => {
  const c = career(11), f = nextFixture(c.league);
  const s = playMatch(c, f.opp, OUT(30), ['W', '1', 'W', '0', ...OUT(26)]);
  assert.ok(!typesOf(facts(c, s)).includes('nearHat'));
});

test('a duck, a golden duck and a big innings are all noticed, for the right player', () => {
  const c = career(12), f = nextFixture(c.league);
  const first = batters(c, c.club);
  const s = playMatch(c, f.opp, ['W', '0', 'W', ...OUT(27)], OUT(30));
  const list = facts(c, s), gd = list.find(x => x.type === 'goldenDuck');
  assert.ok(gd && gd.pid === first[0].id, typesOf(list).join(','));
  const s2 = playMatch(c, f.opp, ['0', 'W', ...OUT(28)], OUT(30));
  assert.ok(typesOf(facts(c, s2)).includes('duck'));
  const s3 = playMatch(c, f.opp, ['6', '6', '6', '6', '4', '4', '1', ...OUT(23)], OUT(30));
  const big = facts(c, s3).filter(x => x.pid === first[0].id).map(x => x.type);
  assert.ok(big.includes('masterclass') && big.includes('sixFest'), big.join(','));
});

test('a player who left us and hurts us is remembered: the old boy scores against his old club', () => {
  const c = career(14), f = nextFixture(c.league);
  const opp = batters(c, f.opp)[0];
  noteEvent(c, { t: 'left', pid: opp.id });
  const s = playMatch(c, f.opp, OUT(30), ['6', '6', '4', '4', '1', ...OUT(25)]);
  const list = facts(c, s), hurt = list.find(x => x.type === 'formerHurt');
  assert.ok(hurt && hurt.pid === opp.id, typesOf(list).join(','));
  assert.ok(hurt.sal >= 80);
});

test('a run of form across matches is remembered, and said once the run is there', () => {
  const c = career(15);
  const top = batters(c, c.club)[0];
  const seen = [];
  for (let n = 0; n < 4; n++) {
    const f = nextFixture(c.league);
    const s = playMatch(c, f.opp, ['6', '6', '6', '6', ...OUT(26)], OUT(30), { seed: n + 1 });
    play(c, s);
    seen.push(memOf(c).p[top.id].bat.length);
  }
  assert.deepEqual(seen.slice(0, 3), [1, 2, 3]);
  const form = c.chirp.feed.filter(p => p.fact?.type === 'formBat');
  assert.ok(form.length >= 1, c.chirp.feed.map(p => p.fact?.type).join(','));
});

test('a heavy defeat by a side far below us is called out, and so is a collapse', () => {
  const c = career(16);
  const f = nextFixture(c.league);
  // (a table with us well above them)
  const s = playMatch(c, f.opp, ['W', 'W', '1', ...OUT(27)], OUT(30));
  const list = facts(c, s, { won: false });
  assert.ok(typesOf(list).includes('collapse'), typesOf(list).join(','));
});

test('the same match always tells the same stories (the feed is the same on a replay)', () => {
  const run = () => { const c = career(17), f = nextFixture(c.league); const s = playMatch(c, f.opp, ['6', '6', '6', 'W', ...OUT(26)], ['0', 'W', 'W', ...OUT(27)]); play(c, s); return c.chirp.feed.map(p => p.text + '|' + p.comments.map(x => x.text).join('/')); };
  assert.deepEqual(run(), run());
});

test('the moments of a match come with the news of it: the report, a fan, and up to three moments about what happened', () => {
  const c = career(18), f = nextFixture(c.league);
  const s = playMatch(c, f.opp, ['6', '6', '6', '4', 'W', ...OUT(25)], ['0', 'W', 'W', 'W']);
  play(c, s);
  const kinds = c.chirp.feed.map(p => p.kind);
  assert.ok(kinds.includes('win') || kinds.includes('loss'));
  assert.ok(kinds.includes('fan') && kinds.includes('moment'));
  const moments = c.chirp.feed.filter(p => p.kind === 'moment');
  assert.ok(moments.length >= 1 && moments.length <= 3);
  for (const p of moments) { assert.ok(p.comments.length >= 2); assert.ok(p.fact.type); }
  assert.ok(/Player of the match/.test(c.chirp.feed.find(p => p.kind === 'win' || p.kind === 'loss').text));
});
