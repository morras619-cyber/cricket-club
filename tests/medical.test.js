import test from 'node:test';
import assert from 'node:assert/strict';
const S = await import('../js/stamina.js');
const M = await import('../js/match.js');
const C = await import('../js/career.js');
const { MED, HOUR, DAY } = S;

const ids = ['a', 'b', 'c', 'd'];
const ctxOf = (now, o = {}) => ({ now, trusted: o.trusted ?? true, has: id => (o.squad || ids).includes(id), nameOf: id => id.toUpperCase(),
  bank: { money: o.money ?? 5000, spend(k) { const need = Math.ceil(k / 50) * 50; if (this.money < need) return 0; this.money -= need; return need; } } });
const fresh = () => { const m = S.freshMedical(); S.medTick(m, ctxOf(0)); return m; };   // (the first look starts the clock)
const tired = (m, id, to) => { m.fit[id] = to; S.medSeal(m); };

test('a match tires the players who played by 60% of the stamina they used, and nobody else', () => {
  const m = fresh();
  S.medAfterMatch(m, [{ id: 'a', start: 100, drain: 50 }, { id: 'b', start: 100, drain: 10 }], () => 0.99);
  assert.equal(m.fit.a, 70);
  assert.equal(m.fit.b, 94);
  assert.equal(S.fitOf(m, 'c'), 100);
  assert.equal(S.fitOf(null, 'a'), 100, 'no centre yet: everyone is fit');
});

test('resting brings back 3 fitness an hour, and a bed with a physio 12', () => {
  const m = fresh(); S.hirePhysio(m);
  tired(m, 'a', 50); tired(m, 'b', 50);
  assert.ok(S.putInBed(m, 0, 'a', ctxOf(0)).ok);
  S.medTick(m, ctxOf(2 * HOUR));
  assert.ok(Math.abs(m.fit.b - 56) < 0.5, `resting: ${m.fit.b}`);
  assert.ok(Math.abs(m.fit.a - 74) < 0.5, `bed: ${m.fit.a}`);
});

test('a bed does nothing without a physio, and a physio looks after two beds only', () => {
  const m = fresh();
  tired(m, 'a', 50);
  S.putInBed(m, 0, 'a', ctxOf(0));
  S.medTick(m, ctxOf(HOUR));
  assert.ok(Math.abs(m.fit.a - 53) < 0.5, 'no physio: only resting');
  const big = fresh(); big.level = 2; big.beds = [null, null, null, null]; S.hirePhysio(big);
  for (const id of ['a', 'b', 'c']) { tired(big, id, 50); }
  ['a', 'b', 'c'].forEach((id, i) => S.putInBed(big, i, id, ctxOf(0)));
  S.medTick(big, ctxOf(HOUR));
  const fast = ['a', 'b', 'c'].filter(id => big.fit[id] > 60).length;
  assert.equal(fast, 2, 'one physio treats two of the three');
});

test('away time: the beds and the wages count ten hours, resting counts all of it', () => {
  const m = fresh(); S.hirePhysio(m);
  tired(m, 'a', 0); tired(m, 'b', 0);
  S.putInBed(m, 0, 'a', ctxOf(0));
  S.medTick(m, ctxOf(5 * DAY));
  assert.equal(m.fit.a, 100, 'a bed: full');
  assert.equal(m.fit.b, 100, 'five days of rest is more than enough');
  const n = fresh(); tired(n, 'b', 0);
  S.medTick(n, ctxOf(10 * HOUR));
  assert.ok(Math.abs(n.fit.b - 30) < 0.5);
});

test('a player who starts a match unfit risks a knock, and a better centre lowers the chance', () => {
  assert.equal(S.knockChance(40, 1), 0);
  assert.equal(S.knockChance(80, 1), 0);
  assert.ok(Math.abs(S.knockChance(0, 1) - 0.4) < 1e-9);
  assert.ok(Math.abs(S.knockChance(20, 1) - 0.2) < 1e-9);
  assert.ok(Math.abs(S.knockChance(0, 3) - 0.2) < 1e-9);
  const m = fresh();
  const hurt = S.medAfterMatch(m, [{ id: 'a', start: 10, drain: 20 }], () => 0.01);
  assert.deepEqual(hurt, ['a']);
  assert.ok(S.isKnocked(m, 'a'));
  const ok = S.medAfterMatch(m, [{ id: 'b', start: 90, drain: 20 }], () => 0.0001);
  assert.deepEqual(ok, [], 'a fit player is never knocked');
});

test('a knock holds fitness at 50 until he is treated: six hours in a bed, or thirty-six resting', () => {
  const m = fresh(); S.hirePhysio(m);
  S.medAfterMatch(m, [{ id: 'a', start: 10, drain: 0 }], () => 0);
  tired(m, 'a', 30);
  S.medTick(m, ctxOf(20 * HOUR));
  assert.ok(m.fit.a <= 50 && S.isKnocked(m, 'a'), `still knocked at ${m.fit.a}`);
  const b = fresh(); S.hirePhysio(b);
  S.medAfterMatch(b, [{ id: 'a', start: 10, drain: 0 }], () => 0);
  tired(b, 'a', 30);
  S.putInBed(b, 0, 'a', ctxOf(0));
  S.medTick(b, ctxOf(7 * HOUR));
  assert.ok(!S.isKnocked(b, 'a'), 'six hours in a bed heals it');
  const r = fresh();
  S.medAfterMatch(r, [{ id: 'a', start: 10, drain: 0 }], () => 0);
  S.medTick(r, ctxOf(40 * HOUR));
  assert.ok(!S.isKnocked(r, 'a'), 'thirty-six hours of rest heals it');
  assert.equal(r.fit.a, 100);
});

test('a player who is fit again leaves his bed, and one who has left the squad is forgotten', () => {
  const m = fresh(); S.hirePhysio(m);
  tired(m, 'a', 90); S.putInBed(m, 0, 'a', ctxOf(0));
  S.medTick(m, ctxOf(2 * HOUR));
  assert.equal(m.beds[0], null);
  tired(m, 'b', 40); S.medTick(m, ctxOf(3 * HOUR, { squad: ['a', 'c', 'd'] }));
  assert.equal(m.fit.b, undefined);
});

test('wages come from the fund, then the club; unpaid, the beds stop but resting goes on', () => {
  const m = fresh(); S.hirePhysio(m); m.fund = 0; S.medSeal(m);
  tired(m, 'a', 40); S.putInBed(m, 0, 'a', ctxOf(0));
  S.medTick(m, ctxOf(2 * HOUR, { money: 0 }));
  assert.ok(m.unpaidMs > 0);
  assert.ok(Math.abs(m.fit.a - 46) < 0.5, 'no bed, only resting');
  const p = fresh(); S.hirePhysio(p); p.fund = 0; S.medSeal(p);
  const x = ctxOf(HOUR, { money: 500 });
  S.medTick(p, x);
  assert.ok(x.bank.money < 500);
});

test('the clock going back changes nothing, and an edited fund is noticed', () => {
  const m = fresh(); S.medTick(m, ctxOf(5 * HOUR));
  const before = JSON.stringify(m);
  assert.equal(S.medTick(m, ctxOf(2 * HOUR)).skipped, 'clock');
  assert.equal(JSON.stringify(m), before);
  m.fund = 999999;
  assert.equal(S.medTick(m, ctxOf(6 * HOUR)).tampered, true);
});

test('upgrading costs money and opens beds and physios', () => {
  const m = fresh();
  assert.equal(S.medUpgrade(m, ctxOf(0, { money: 0 })).ok, false);
  assert.ok(S.medUpgrade(m, ctxOf(0)).ok);
  assert.equal(m.beds.length, 4);
  assert.ok(S.hirePhysio(m).ok && S.hirePhysio(m).ok);
  assert.equal(S.hirePhysio(m).ok, false);
});

test('a player starts the match on his fitness, and is not full of energy', () => {
  M.setStartEnergy({ a: 60 });
  const inn = new M.Innings('player');
  assert.equal(inn.energyOf('a'), 60);
  assert.equal(inn.energyOf('zzz'), 100);
  inn.tire('a', 10);
  assert.equal(inn.energyOf('a'), 50);
  M.setStartEnergy({});
  assert.equal(new M.Innings('player').energyOf('a'), 100);
});

test('in the career: a match tires the players who played, and the numbers are written to their fitness', () => {
  const c = C.newCareer(51); C.chooseClub(c, c.divisions.d3[0]);
  const mine = C.clubPlayers(c, c.club), a = mine[0];
  const inn = { side: 'player', energy: { [a.id]: 40 }, battingCard: () => [{ id: a.id, runs: 10, balls: 8, fours: 1, sixes: 0, out: false }], bowlingCard: () => [] };
  C.recordPlayerMatch(c, { innings: [inn, { side: 'ai', energy: {}, battingCard: () => [], bowlingCard: () => [] }], result: { outcome: 'win' } });
  assert.ok(c.medical, 'the centre starts when the first match is played');
  assert.equal(C.fitnessOf(c, a.id), 64, '100 - 0.6 x 60');
  assert.equal(C.fitnessOf(c, mine[1].id), 100);
  assert.equal(C.startEnergies(c)[a.id], 64);
});
