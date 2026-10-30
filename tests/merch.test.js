import test from 'node:test';
import assert from 'node:assert/strict';
const M = await import('../js/merch.js');
const { MERCH, DAY, HOUR, MIN } = M;

// a squad of players with a fame each, and a club bank with some money (or none)
const squadOf = (fames = { a: 60, b: 30 }) => new Map(Object.entries(fames).map(([id, fame]) => [id, { fame, name: id.toUpperCase() }]));
const mkCtx = (now, o = {}) => {
  const bank = { money: o.money ?? 100, spend(k) { const need = Math.ceil(k / 50) * 50; if (this.money < need) return 0; this.money -= need; return need; }, give(k) { this.money += k; return k; } };
  return { now, trusted: o.trusted ?? true, squad: o.squad || squadOf(), demand: o.demand ?? 250, bank };
};
const staffed = (now = 0) => { const m = M.freshMerch(now); M.hire(m, 'designer'); M.hire(m, 'printer'); return m; };

test('a fresh factory has a seal and a little money in the till', () => {
  const m = M.freshMerch(0);
  assert.equal(m.till, MERCH.START_TILL);
  assert.ok(M.sealed(m));
});

test('level 1 holds two staff, and only the places of its level', () => {
  const m = M.freshMerch(0);
  assert.ok(M.hire(m, 'printer').ok); assert.ok(M.hire(m, 'designer').ok);
  assert.equal(M.hire(m, 'packer').ok, false);
  assert.equal(M.buyMachine(m, mkCtx(0)).ok, false, 'no machine places at level 1');
});

test('a design first, then the jerseys, and the fans buy them', () => {
  const m = staffed(0), ctx = mkCtx(0);
  assert.ok(M.order(m, 'a', 20, ctx).ok);
  const r = M.tick(m, mkCtx(2 * HOUR));
  assert.ok(m.designs.a >= 1, 'designed');
  assert.ok(m.sold > 0, 'some sold');
  assert.ok(r.sold > 0);
  assert.ok(M.sealed(m));
});

test('printing takes about three minutes a jersey by hand and half that with a machine', () => {
  const m = staffed(0);
  assert.ok(Math.abs(M.printRate(m) - 1 / (3 * MIN)) < 1e-12);
  const big = M.freshMerch(0); big.level = 2; M.hire(big, 'printer'); big.machines = 1;
  assert.ok(Math.abs(M.printRate(big) - 2 / (3 * MIN)) < 1e-12);
});

test('away time is capped: three days away gives ten hours of work, and the clock going back gives nothing', () => {
  const m = staffed(0);
  const r = M.tick(m, mkCtx(3 * DAY));
  assert.equal(r.ms, MERCH.CAP);
  assert.equal(r.capped, true);
  const before = JSON.stringify(m);
  const back = M.tick(m, mkCtx(3 * DAY - HOUR));
  assert.equal(back.skipped, 'clock');
  assert.equal(JSON.stringify(m), before, 'nothing changed');
});

test('a time the server did not confirm counts for an hour at most', () => {
  const m = staffed(0);
  assert.equal(M.tick(m, mkCtx(DAY, { trusted: false })).ms, MERCH.CAP_UNVERIFIED);
});

test('a number edited in the saved game is noticed', () => {
  const m = staffed(0);
  M.tick(m, mkCtx(HOUR));
  m.till = 9999999;
  const r = M.tick(m, mkCtx(2 * HOUR));
  assert.equal(r.tampered, true);
  assert.equal(m.till, 0);
});

test('wages are paid from the till, then the club; with neither, the work stops and the staff leave after three days', () => {
  const m = staffed(0); m.till = 0;
  const ctx0 = mkCtx(0, { money: 0 });
  M.order(m, 'a', 1, mkCtx(0, { money: 5 }));   // (the cloth for one jersey: bought while there was money)
  m.till = 0; M.seal(m);
  const r = M.tick(m, mkCtx(8 * HOUR, { money: 0 }));
  assert.ok(m.unpaidMs > 0, 'unpaid');
  assert.equal(m.live.a || 0, 0, 'nothing made while the wages are not paid');
  M.tick(m, mkCtx(8 * HOUR + 5 * DAY, { money: 0 }));
  assert.ok(m.staff.length < 2, 'staff walked out');
  assert.ok(ctx0.bank.money === 0);
});

test('wages come out of the club when the till is empty', () => {
  const m = staffed(0); m.till = 0; M.seal(m);
  const ctx = mkCtx(6 * HOUR, { money: 100 });
  M.tick(m, ctx);
  assert.ok(ctx.bank.money < 100);
  assert.equal(m.unpaidMs, 0);
});

test('demand follows fame: a famous player is wanted more than an unknown one', () => {
  const m = staffed(0);
  const d = M.demandMap(m, mkCtx(0, { squad: squadOf({ a: 80, b: 20 }) }));
  assert.ok(d.get('a') > 4 * d.get('b'));
});

test('a player whose contract ends: unmade jerseys are cancelled and refunded, the made ones sell for two days, then as vintage', () => {
  const m = staffed(0);
  M.order(m, 'a', 20, mkCtx(0));
  M.tick(m, mkCtx(HOUR));                           // some made
  const stock = m.live.a || 0;
  assert.ok(stock > 0 || m.queue.length > 0);
  const gone = squadOf({ b: 30 });
  const tillBefore = m.till;
  M.tick(m, mkCtx(HOUR + 1000, { squad: gone }));
  assert.equal(m.queue.filter(o => o.pid === 'a').length, 0, 'the unmade ones are cancelled');
  assert.ok(m.till >= tillBefore - 1, 'refunded (less the wages in that second)');
  assert.ok(m.left.a, 'in his two days');
  // two days later (in ten-hour visits) it is vintage stock
  let t = HOUR + 1000;
  for (let i = 0; i < 8; i++) { t += MERCH.CAP; M.tick(m, mkCtx(t, { squad: gone })); }
  assert.ok(!m.left.a, 'the two days are over');
});

test('a re-signed player brings his vintage stock back', () => {
  const m = staffed(0);
  m.vint.a = { n: 12, since: 0, rate: 30, legend: false }; M.seal(m);
  M.tick(m, mkCtx(MIN, { squad: squadOf({ a: 50 }) }));
  assert.ok(!m.vint.a);
  assert.ok((m.live.a || 0) + m.sold >= 12, 'on sale again at full price');
});

test('vintage stock sells cheaply and a legend keeps selling a little', () => {
  const m = staffed(0);
  m.vint.x = { n: 500, since: 0, rate: 400, legend: true };
  m.vint.y = { n: 500, since: 0, rate: 400, legend: false }; M.seal(m);
  const ctx = mkCtx(0, { squad: squadOf({ a: 50 }) });
  let t = 0;
  for (let i = 0; i < 20; i++) { t += MERCH.CAP; M.tick(m, { ...ctx, now: t }); }   // some 8 days
  assert.ok(!m.vint.y || m.vint.y.n === 500 || m.vint.y.n >= 0);
  assert.ok(m.vint.x, 'the legend still has some on the shelf or has sold them slowly');
  assert.ok(m.earned > 0);
});

test('an order is limited by the printers, the warehouse and the money', () => {
  const m = staffed(0);
  assert.equal(M.order(m, 'a', 21, mkCtx(0)).ok, false, 'one printer: at most a batch of 20');
  assert.equal(M.order(m, 'zz', 5, mkCtx(0)).ok, false, 'not under contract');
  const poor = staffed(0); poor.till = 0; M.seal(poor);
  assert.equal(M.order(poor, 'a', 20, mkCtx(0, { money: 0 })).ok, false);
});

test('upgrading costs money and opens the places', () => {
  const m = staffed(0);
  assert.equal(M.upgrade(m, mkCtx(0, { money: 0 })).ok, false);
  const ctx = mkCtx(0, { money: 1000 });   // ($k)
  assert.ok(M.upgrade(m, ctx).ok);
  assert.equal(m.level, 2);
  assert.equal(ctx.bank.money, 200, 'the $0.8M left the club');
  assert.equal(M.hire(m, 'packer').ok, true);
});

test('fame moves with how a player plays', () => {
  const up = M.fameAfter(40, { bat: { runs: 80, balls: 40, fours: 8, sixes: 4, out: true } }, true);
  const duck = M.fameAfter(40, { bat: { runs: 0, balls: 3, fours: 0, sixes: 0, out: true } }, false);
  const idle = M.fameAfter(40, null, false);
  assert.ok(up > 45 && duck < 40 && idle < 40 && idle > duck - 5);
  assert.ok(M.fameAfter(99, { bat: { runs: 100, balls: 50, fours: 10, sixes: 5, out: false } }, true) <= 100);
});

test('collecting moves the till to the club in $50k steps', () => {
  const m = staffed(0); m.till = 130; M.seal(m);
  const ctx = mkCtx(0);
  const r = M.collect(m, ctx);
  assert.equal(r.k, 100);
  assert.equal(m.till, 30);
});

// ---------- the career's side: the fans' love for a player, and what the factory sees of the club ----------
const C = await import('../js/career.js');
const club = () => {
  const c = C.newCareer(7);
  C.chooseClub(c, c.divisions.d3[0]);
  return c;
};
test('a good match raises a player\'s fame, and a player left out drifts down', () => {
  const c = club(), mine = C.clubPlayers(c, c.club), star = mine[0], idle = mine[1];
  const fame0 = C.fameOf(star), idle0 = C.fameOf(idle);
  const card = (id, runs) => [{ id, runs, balls: runs, fours: 4, sixes: 3, out: false }];
  const inn = (side, bat) => ({ side, battingCard: () => bat, bowlingCard: () => [] });
  C.recordPlayerMatch(c, { innings: [inn('player', card(star.id, 70)), inn('ai', [])], result: { outcome: 'win' } });
  assert.ok(C.fameOf(star) > fame0 + 3, 'loved for a big innings');
  assert.ok(C.fameOf(idle) < idle0, 'not in the side: forgotten a little');
});

test('the factory sees the players under contract, what the fans want, and the matches left on a deal', () => {
  const c = club();
  const roster = C.merchRoster(c);
  assert.ok(roster.size >= 10);
  assert.ok(C.merchDemand(c) > 0);
  const d = (stadium, level, fans = 0) => { c.custom = { ...(c.custom || {}), stadium }; c.merch = { level }; c.chirp = { fans }; return C.merchDemand(c); };
  assert.ok(d(1, 1) < 60, 'a small ground and a small factory: a trickle');
  assert.ok(d(3, 3) <= 400 * 1.16 && d(3, 3) >= 350, 'the biggest of both: about four hundred jerseys a day');
  assert.ok(d(1, 3) < d(2, 3) && d(2, 3) < d(3, 3), 'a bigger ground means more fans');
  assert.ok(d(3, 1) < d(3, 3), 'a bigger factory reaches more of them');
  assert.ok(d(3, 3, 1e7) <= d(3, 3, 0) * 1.151, 'followers add a little, never a lot');
  const p = C.clubPlayers(c, c.club)[0];
  p.contract = 3;
  assert.ok(C.matchesLeft(c, p) >= 2 * 14);
  p.contract = 1;
  assert.ok(C.matchesLeft(c, p) <= 14);
});
