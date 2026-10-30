import test from 'node:test';
import assert from 'node:assert/strict';
const C = await import('../js/career.js');
const { CLUB } = C;
const HOUR = 3600000;

const club = () => { const c = C.newCareer(41); C.chooseClub(c, c.divisions.d3[0]); C.finishAuction(c); return c; };
const squadIds = c => C.clubPlayers(c, c.club).map(p => p.id);

test('two players of one nation are linked from the start; matches together link the rest', () => {
  const c = club(), [a, b, d] = squadIds(c);
  c.players[a].nation = 'IN'; c.players[b].nation = 'IN'; c.players[d].nation = 'PK';
  assert.equal(C.linkKind(C.linkPoints(c, a, b)), 1, 'a shared nation: a link');
  assert.equal(C.linkKind(C.linkPoints(c, a, d)), 0, 'strangers');
  for (let i = 0; i < 9; i++) C.chemAfterMatch(c, [a, d]);
  assert.equal(C.linkKind(C.linkPoints(c, a, d)), 0, 'nine matches: not yet');
  C.chemAfterMatch(c, [a, d]);
  assert.equal(C.linkKind(C.linkPoints(c, a, d)), 1, 'ten matches together');
  for (let i = 0; i < 15; i++) C.chemAfterMatch(c, [a, b]);
  assert.equal(C.linkKind(C.linkPoints(c, a, b)), 2, 'a shared nation and fifteen matches: strong');
  for (let i = 0; i < 100; i++) C.chemAfterMatch(c, [a, b]);
  assert.ok(C.linkPoints(c, a, b) <= CLUB.NATION + CLUB.GAMES_MAX, 'the games count has a ceiling');
});
test('only your own players gain chemistry from a match', () => {
  const c = club(), [a] = squadIds(c), foe = Object.values(c.players).find(p => p.team && p.team !== c.club);
  C.chemAfterMatch(c, [a, foe.id, foe.id]);
  assert.deepEqual(C.clubhouse(c).together, {});
});
test('chemistry gives a little rating, never past the cap, and the match copies carry it', () => {
  const c = club(), ids = squadIds(c);
  for (const id of ids) c.players[id].nation = 'IN';   // everybody linked with everybody
  const b = C.chemBonus(c);
  assert.ok(b.size >= 8);
  assert.ok([...b.values()].every(v => v === 1), 'level 1: one point at most');
  C.clubhouse(c).level = 5;
  assert.ok([...C.chemBonus(c).values()].every(v => v <= 2) && [...C.chemBonus(c).values()].some(v => v === 2), 'level 5: up to two');
  const pool = C.clubPool(c, c.club), mine = C.chemPool(c, pool);
  const p = pool.find(x => C.chemBonus(c).get(x.id)), q = mine.find(x => x.id === p.id);
  assert.equal(q.bat, Math.min(99, p.bat + C.chemBonus(c).get(p.id)));
  assert.equal(c.players[p.id].bat, p.bat, 'the saved player is not changed');
});
test('a squad of strangers has no chemistry, and the rating of the club in the tables is untouched', () => {
  const c = club();
  const nations = new Set(C.clubPlayers(c, c.club).map(p => p.nation));
  C.clubPlayers(c, c.club).forEach((p, i) => { p.nation = `N${i}`; });
  assert.equal(C.chemBonus(c).size, 0);
  const r0 = C.clubRating(c, c.club);
  C.clubPlayers(c, c.club).forEach(p => { p.nation = 'IN'; });
  assert.equal(C.clubRating(c, c.club), r0, 'only the match copies carry the bonus');
  assert.ok(nations.size > 0);
});
test('the rivalry board lists the nemesis and the division rival with the record', () => {
  const c = club();
  assert.deepEqual(C.rivalBoard({ ...c, rivals: null }), []);
  const board = C.rivalBoard(c);
  assert.ok(board.length >= 1 && board.length <= 2);
  assert.ok(board.every(r => r.id && r.who && typeof r.w === 'number' && typeof r.l === 'number'));
  assert.ok(board.some(r => r.kind === 'nemesis'));
});
const ctx = (now, trusted = true) => ({ now, trusted });
test('a supporter event costs money, takes hours, and wins followers and buzz when it ends', () => {
  const c = club(); c.money = 5;
  const before = c.chirp?.fans ?? 900, cost = C.eventCost(c, 'fanday');
  assert.ok(cost >= 0.05 && cost <= 0.15);
  assert.equal(C.startEvent(c, 'fanday', ctx(0, false)).ok, false, 'no server time: no event');
  const r = C.startEvent(c, 'fanday', ctx(0));
  assert.ok(r.ok); assert.ok(Math.abs(5 - c.money - cost) < 0.011, 'the money left the club');
  assert.ok(C.seasonBooks(c).out.buildings >= cost - 0.001, 'written in the books');
  assert.equal(C.whyNoEvent(c, 'fanday', ctx(1)), 'Already on');
  assert.equal(C.whyNoEvent(c, 'charity', ctx(1)), 'All your places are busy', 'one place at level 1');
  assert.deepEqual(C.settleEvents(c, ctx(2 * HOUR)), [], 'not yet');
  assert.deepEqual(C.settleEvents(c, ctx(100 * HOUR, false)), [], 'a phone clock jump gets nothing');
  const done = C.settleEvents(c, ctx(5 * HOUR));
  assert.equal(done.length, 1);
  assert.ok(done[0].gain >= 150);
  assert.ok(c.chirp.fans >= before + 150);
  assert.equal(C.whyNoEvent(c, 'fanday', ctx(6 * HOUR)), 'Wait a little before the next one', 'a rest between the same event');
  assert.equal(C.whyNoEvent(c, 'fanday', ctx(20 * HOUR)), null);
});
test('a bigger clubhouse has more places and wins more followers', () => {
  const c = club(); c.money = 20; C.clubhouse(c).level = 5;
  assert.equal(C.eventSlots(c), 2);
  assert.ok(C.startEvent(c, 'fanday', ctx(0)).ok && C.startEvent(c, 'charity', ctx(0)).ok, 'two at once');
  const small = club(); small.money = 20;
  C.startEvent(small, 'fanday', ctx(0));
  const g = C.settleEvents(c, ctx(10 * HOUR)).find(x => x.kind === 'fanday').gain, g1 = C.settleEvents(small, ctx(10 * HOUR))[0].gain;
  assert.ok(g > g1, `level 5 wins more: ${g} against ${g1}`);
});
test('the victory parade is only for a title or a promotion, once for each', () => {
  const c = club(); c.money = 5;
  assert.equal(C.whyNoEvent(c, 'parade', ctx(0)), 'Needs a title or a promotion');
  c.history.push({ season: 1, pos: 1, div: 'd3' });
  assert.equal(C.paradeDue(c), true);
  assert.equal(C.whyNoEvent(c, 'parade', ctx(0)), null);
  assert.ok(C.startEvent(c, 'parade', ctx(0)).ok);
  C.settleEvents(c, ctx(10 * HOUR));
  assert.equal(C.paradeDue(c), false, 'the same title is not paraded twice');
  c.history.push({ season: 2, pos: 3, div: 'd2', promoted: 'd2' });
  assert.equal(C.paradeDue(c), true, 'a promotion');
});
