import test from 'node:test';
import assert from 'node:assert/strict';
const C = await import('../js/career.js');

const club = () => { const c = C.newCareer(31); C.chooseClub(c, c.divisions.d3[0]); return c; };
const win = (c, sixes = 0, won = true) => {
  const mine = C.clubPlayers(c, c.club)[0];
  const inn = { side: 'player', battingCard: () => [{ id: mine.id, runs: 20, balls: 15, fours: 1, sixes, out: false }], bowlingCard: () => [] };
  return { innings: [inn, { side: 'ai', battingCard: () => [], bowlingCard: () => [] }], result: { outcome: won ? 'win' : 'loss' } };
};

test('the books: a win bonus and a signing are written down in the season', () => {
  const c = club(); c.money = 10;
  C.recordPlayerMatch(c, win(c));
  const b = C.seasonBooks(c);
  assert.ok(b.in.wins > 0, 'the win bonus is in');
  const lot = C.currentLot(c);
  c.divisions.asl.push(c.club); c.divisions.d3 = c.divisions.d3.filter(id => id !== c.club);
  const spent0 = C.totalOf(C.seasonBooks(c).out);
  C.bid(c);
  assert.ok(C.totalOf(C.seasonBooks(c).out) >= spent0, 'a signing is a payment out');
  assert.ok(lot);
});

test('the steady sponsor pays every match for seven matches, then the deal is over', () => {
  const c = club(); c.money = 0;
  assert.ok(C.signSponsor(c, 'steady'));
  assert.equal(C.signSponsor(c, 'form'), false, 'one deal at a time');
  for (let i = 0; i < 7; i++) C.recordPlayerMatch(c, win(c, 0, i % 2 === 0));
  assert.equal(C.office(c).deal, null, 'finished after seven');
  const paid = C.seasonBooks(c).in.sponsors;
  assert.ok(paid >= 0.1 && paid <= 0.2, `division 3 pays about $0.14M: ${paid}`);
});

test('the form sponsor pays its bonus only for four wins in seven', () => {
  const run = wins => { const c = club(); C.signSponsor(c, 'form'); for (let i = 0; i < 7; i++) C.recordPlayerMatch(c, win(c, 0, i < wins)); return C.seasonBooks(c).in.sponsors || 0; };
  assert.ok(run(4) > run(3) + 0.1, 'four wins earn the bonus');
  assert.ok(run(3) < 0.1, 'three wins: only the small per-match pay');
});

test('the risky sponsor pays only when nine sixes are hit, and pays more than the others', () => {
  const run = sixesEach => { const c = club(); C.signSponsor(c, 'power'); for (let i = 0; i < 7; i++) C.recordPlayerMatch(c, win(c, sixesEach, true)); return C.seasonBooks(c).in.sponsors || 0; };
  assert.equal(run(1), 0, 'seven sixes: nothing');
  const got = run(2);
  assert.ok(got > 0.3 && got < 0.5, `fourteen sixes: ${got}`);
  const c = club();
  assert.ok(C.dealWorth(c, 'power').top > C.dealWorth(c, 'steady').top);
});

test('a better division pays sponsors more', () => {
  const lo = club(), hi = club();
  hi.divisions.asl.push(hi.club); hi.divisions.d3 = hi.divisions.d3.filter(id => id !== hi.club);
  assert.ok(C.dealWorth(hi, 'form').top > C.dealWorth(lo, 'form').top * 2);
});

test('the board sets a target at the start of a season and pays a bonus when it is met', () => {
  const c = club();
  C.finishAuction(c);
  const ob = C.objectiveOf(c);
  assert.ok(ob && ob.target >= 2 && ob.target <= 8 && ob.reward > 0);
  const before = c.money;
  const notes = C.settleObjective(c, ob.target);
  assert.ok(c.money >= before + ob.reward - 0.01 && /pleased/.test(notes[0]));
  assert.equal(C.office(c).objective, null);
  assert.equal(C.office(c).board.at(-1).met, true);
  const c2 = club(); C.finishAuction(c2);
  const o2 = C.objectiveOf(c2), b2 = c2.money;
  assert.match(C.settleObjective(c2, 8)[0], /no bonus/);
  assert.equal(c2.money, b2);
  assert.ok(o2.target < 8);
});

test('contracts: the soonest to end first, and a founder signed for good is left out', () => {
  const c = club();
  const list = C.contractList(c);
  for (let i = 1; i < list.length; i++) assert.ok(list[i - 1].contract <= list[i].contract);
  assert.ok(list.every(p => p.contract < 50));
});
