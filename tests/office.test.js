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
  assert.equal(C.signSponsor(c, 'form'), false, 'one slot at level 1: one deal at a time');
  for (let i = 0; i < 7; i++) C.recordPlayerMatch(c, win(c, 0, i % 2 === 0));
  assert.equal(C.office(c).deals.shirt, undefined, 'finished after seven');
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

const lastSeason = c => { const p = C.clubPlayers(c, c.club).find(x => x.contract < 50); p.contract = 1; return p; };
const levelUp = (c, level) => { C.office(c).level = level; };

test('a career from before the slots keeps its one deal, as the shirt deal', () => {
  const c = club();
  c.office = { led: {}, deal: { id: 'steady', played: 3, wins: 1, sixes: 0, paid: 0.05 }, pend: 0, objective: null, board: [], log: [] };
  const o = C.office(c);
  assert.equal(o.deal, undefined);
  assert.equal(o.deals.shirt.id, 'steady'); assert.equal(o.deals.shirt.played, 3);
  assert.equal(o.level, 1);
});
test('slots open with the look: one at level 1, two at 5, three at 10; a sponsor is in one slot only', () => {
  const c = club();
  assert.equal(C.officeSlots(c), 1);
  assert.equal(C.signSponsor(c, 'steady', 'ground'), false, 'locked');
  assert.ok(C.signSponsor(c, 'steady', 'shirt'));
  levelUp(c, 4); assert.equal(C.officeSlots(c), 1);
  levelUp(c, 5); assert.equal(C.officeSlots(c), 2);
  assert.equal(C.signSponsor(c, 'steady', 'ground'), false, 'the same sponsor twice');
  assert.ok(C.signSponsor(c, 'form', 'ground'));
  assert.equal(C.signSponsor(c, 'power', 'kit'), false, 'the third slot is locked');
  levelUp(c, 10); assert.equal(C.officeSlots(c), 3);
  assert.ok(C.signSponsor(c, 'power', 'kit'));
});
test('every slot pays on its own, the ground less than the shirt, and the deals end on their own', () => {
  const c = club(); levelUp(c, 10); c.money = 0;
  C.signSponsor(c, 'steady', 'shirt'); C.signSponsor(c, 'form', 'ground');
  const w = C.dealWorth(c, 'steady', 'shirt'), g = C.dealWorth(c, 'steady', 'ground');
  assert.ok(g.top < w.top && g.top > 0);
  for (let i = 0; i < 7; i++) C.recordPlayerMatch(c, win(c, 0, true));
  assert.deepEqual(C.office(c).deals, {}, 'both over after seven');
  assert.equal(C.office(c).log.length, 2);
});
test('a bigger office pays sponsors and the board more, and the board asks for more', () => {
  const lo = club(), hi = club();
  levelUp(hi, 10);
  assert.ok(C.dealWorth(hi, 'form').top > C.dealWorth(lo, 'form').top * 1.4);
  C.finishAuction(lo); C.finishAuction(hi);
  const a = C.objectiveOf(lo), b = C.objectiveOf(hi);
  assert.ok(b.reward > a.reward * 2, 'a bigger board bonus');
  assert.ok(b.target <= a.target, 'a tougher target');
});
test('officers: places by level, one of each kind, wages from the club money by the day, and they quit unpaid', () => {
  const c = club(); c.money = 5;
  const H = 3600000;
  assert.equal(C.officePlaces(c), 1);
  assert.ok(C.hireOfficer(c, 'accountant').ok);
  assert.equal(C.hireOfficer(c, 'agent').ok, false, 'one place at level 1');
  levelUp(c, 5);
  assert.ok(C.hireOfficer(c, 'agent').ok);
  assert.equal(C.hireOfficer(c, 'agent').ok, false, 'one of each');
  C.officeTick(c, { now: 0, trusted: true });
  const before = c.money;
  for (let i = 1; i <= 6; i++) C.officeTick(c, { now: 24 * H * i, trusted: true });   // ten hours of each day count: about a quarter of $0.024M a time, paid in $0.05M lots
  assert.ok(c.money < before && before - c.money > 0.04 && before - c.money < 0.1, `six days' wages for sixty hours: ${before - c.money}`);
  assert.ok(C.seasonBooks(c).out.buildings > 0, 'written in the books');
  c.money = 0; c.office.owed = 0;
  for (let i = 1; i <= 24; i++) C.officeTick(c, { now: (150 + 24 * i) * H, trusted: true });
  assert.equal(C.office(c).staff.length, 0, 'unpaid for days: both walked out');
  assert.equal(C.accountantBonus(c), 0);
});
test('an accountant pays for himself in sponsors and stops while unpaid', () => {
  const c = club(); c.money = 5;
  const base = C.dealWorth(c, 'form').top;
  C.hireOfficer(c, 'accountant');
  assert.ok(Math.abs(C.dealWorth(c, 'form').top - base * 1.1) < 1e-9, 'level 1: 10% more');
  levelUp(c, 5); assert.ok(C.trainOfficer(c, C.office(c).staff[0].id).ok);
  assert.ok(Math.abs(C.accountantBonus(c) - 0.2) < 1e-9);
  C.office(c).unpaidMs = 1;
  assert.equal(C.accountantBonus(c), 0, 'not paid: not working');
});
test('the agent keeps a player in his last season for two more, for a fee, as often as his level allows', () => {
  const c = club(); c.money = 10; levelUp(c, 5);
  const p = lastSeason(c);
  assert.equal(C.extendContract(c, p.id).ok, false, 'no agent');
  C.hireOfficer(c, 'agent');
  assert.equal(C.extensionsLeft(c), 1);
  const money0 = c.money, fee = C.extendFee(c, p);
  assert.ok(fee >= 0.1);
  const r = C.extendContract(c, p.id);
  assert.ok(r.ok); assert.equal(p.contract, 3);
  assert.ok(Math.abs(money0 - c.money - fee) < 0.011, 'the fee left the club');
  assert.equal(C.extendContract(c, p.id).ok, false, 'not in his last season any more');
  const q = C.clubPlayers(c, c.club).filter(x => x.contract < 50 && x.id !== p.id)[0]; q.contract = 1;
  assert.equal(C.extendContract(c, q.id).ok, false, 'one a season at level 1');
  C.trainOfficer(c, C.office(c).staff[0].id);
  assert.ok(C.extendContract(c, q.id).ok, 'a level 2 agent does two');
  c.season++;
  assert.equal(C.extensionsLeft(c), 2, 'a new season');
});
test('the money forecast comes at office level 3, from the season so far', () => {
  const c = club(); C.finishAuction(c);
  assert.equal(C.forecast(c), null, 'level 1: none');
  levelUp(c, 3);
  assert.equal(C.forecast(c), null, 'no match played yet');
  C.book(c, 'in', 'wins', 1.4); c.league.round = 2;
  const f = C.forecast(c);
  assert.equal(f.played, 2);
  assert.ok(Math.abs(f.net - 1.4 * f.per / 2) < 0.01);
});
