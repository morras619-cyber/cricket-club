import test from 'node:test';
import assert from 'node:assert/strict';
const T = await import('../js/training.js');
const { TRAIN, HOUR, DAY } = T;

const squadOf = o => new Map(Object.entries(o).map(([id, v]) => [id, { name: id, ovr: 60, age: 20, pot: 85, kinds: ['bat'], ...v }]));
const mkCtx = (now, o = {}) => ({ now, trusted: o.trusted ?? true, squad: o.squad || squadOf({ a: {}, b: { kinds: ['pace'] } }),
  bank: { money: o.money ?? 1000, spend(k) { const need = Math.ceil(k / 50) * 50; if (this.money < need) return 0; this.money -= need; return need; }, give(k) { this.money += k; return k; } } });
const ready = () => { const t = T.freshTraining(0); T.hire(t, 'bat'); T.hire(t, 'pace'); T.assign(t, 0, 'a', mkCtx(0)); T.assign(t, 1, 'b', mkCtx(0)); return t; };

test('level 1: two places, two coaches, one point a season', () => {
  const t = T.freshTraining(0);
  assert.equal(t.slots.length, 2);
  assert.ok(T.hire(t, 'bat').ok); assert.ok(T.hire(t, 'spin').ok);
  assert.equal(T.hire(t, 'pace').ok, false);
  assert.equal(T.TRAIN.LEVELS[1].cap, 1);
});
test('a coach earns his player twelve points an hour, and only a coach of his kind', () => {
  const t = ready();
  T.tick(t, mkCtx(HOUR));
  assert.ok(Math.abs(t.tp.a - 12) < 0.5, `a: ${t.tp.a}`);
  assert.ok(Math.abs(t.tp.b - 12) < 0.5);
  const t2 = T.freshTraining(0); T.hire(t2, 'bat'); T.assign(t2, 0, 'b', mkCtx(0));
  T.tick(t2, mkCtx(HOUR));
  assert.equal(t2.tp.b || 0, 0, 'a pace bowler learns nothing from a batting coach');
});
test('a coach teaches two at a time, and a better coach is faster', () => {
  const t = T.freshTraining(0); T.hire(t, 'bat'); t.level = 2; t.slots = [null, null, null, null]; T.seal(t);
  const ctx = mkCtx(0, { squad: squadOf({ a: {}, b: {}, c: {} }) });
  for (const [i, id] of ['a', 'b', 'c'].entries()) T.assign(t, i, id, ctx);
  T.tick(t, { ...ctx, now: HOUR });
  assert.ok(t.tp.a > 11 && t.tp.b > 11);
  assert.equal(t.tp.c || 0, 0, 'the third has no coach free');
  const good = T.freshTraining(0); T.hire(good, 'bat'); good.coaches[0].lvl = 3; T.seal(good); T.assign(good, 0, 'a', ctx);
  T.tick(good, { ...ctx, now: HOUR });
  assert.ok(good.tp.a > 17, `level 3 coach: ${good.tp.a}`);
});
test('away time counts for ten hours at most, and the clock going back gives nothing', () => {
  const t = ready();
  const r = T.tick(t, mkCtx(5 * DAY));
  assert.equal(r.ms, TRAIN.CAP);
  assert.ok(t.tp.a <= 121 && t.tp.a > 115, `ten hours: ${t.tp.a}`);
  const before = JSON.stringify(t);
  assert.equal(T.tick(t, mkCtx(5 * DAY - HOUR)).skipped, 'clock');
  assert.equal(JSON.stringify(t), before);
});
test('wages come from the fund, then the club; with neither the training stops and the coaches walk out', () => {
  const t = ready(); t.fund = 0; T.seal(t);
  T.tick(t, mkCtx(HOUR, { money: 0 }));
  assert.equal(t.tp.a || 0, 0, 'unpaid: no training');
  T.tick(t, mkCtx(HOUR + 6 * DAY, { money: 0 }));
  assert.ok(t.coaches.length < 2, 'a coach walked out');
  const paid = ready(); paid.fund = 0; T.seal(paid);
  const c = mkCtx(2 * HOUR, { money: 500 });
  T.tick(paid, c);
  assert.ok(c.bank.money < 500 && paid.tp.a > 0);
});
test('a number edited in the saved game is noticed', () => {
  const t = ready(); T.tick(t, mkCtx(HOUR));
  t.fund = 999999;
  assert.equal(T.tick(t, mkCtx(2 * HOUR)).tampered, true);
  assert.equal(t.fund, 0);
});
test('points become rating at the season end: at most the cap, never past his potential, never at 33', () => {
  const t = T.freshTraining(0); t.tp.a = 5000; T.seal(t);
  assert.equal(T.seasonGain(t, 'a', { ovr: 60, age: 20, pot: 85 }), 1, 'level 1: one point');
  assert.ok(t.tp.a > 4000, 'the rest is kept');
  t.level = 2; T.seal(t);
  assert.equal(T.seasonGain(t, 'a', { ovr: 60, age: 20, pot: 85 }), 2, 'level 2: two');
  t.tp.a = 5000; T.seal(t);
  assert.equal(T.seasonGain(t, 'a', { ovr: 84, age: 20, pot: 85 }), 1, 'only one point of room');
  assert.equal(T.seasonGain(t, 'a', { ovr: 85, age: 20, pot: 85 }), 0, 'at his potential');
  assert.equal(T.seasonGain(t, 'a', { ovr: 60, age: 33, pot: 85 }), 0, 'too old');
});
test('a point costs more for a better or an older player', () => {
  assert.ok(T.tpCost(80, 20) > T.tpCost(60, 20));
  assert.ok(T.tpCost(60, 26) > T.tpCost(60, 20));
  assert.ok(T.tpCost(60, 30) > T.tpCost(60, 26));
});
test('training takes real time: a prospect needs about a day and a half of coaching for each point', () => {
  const hours = T.tpCost(60, 20) / TRAIN.TP_HOUR;
  assert.ok(hours > 20 && hours < 60, `${hours} hours`);
});
test('upgrading costs money and opens places; a player who leaves loses his place', () => {
  const t = ready();
  assert.equal(T.upgrade(t, mkCtx(0, { money: 0 })).ok, false);
  const c = mkCtx(0, { money: 2000 });
  assert.ok(T.upgrade(t, c).ok);
  assert.equal(t.level, 2); assert.equal(t.slots.length, 4);
  T.tick(t, mkCtx(HOUR, { squad: squadOf({ b: { kinds: ['pace'] } }) }));
  assert.equal(t.slots[0], null, 'a went');
  assert.equal(t.tp.a, undefined);
});

test('net drills: a few a day, points by the runs, a new day opens the nets again', () => {
  const t = T.freshTraining(0), ctx = n => mkCtx(n * HOUR);
  const good = { balls: TRAIN.DRILL_BALLS, runs: 30, outs: 0 }, poor = { balls: TRAIN.DRILL_BALLS, runs: 2, outs: 3 };
  assert.equal(T.drillsLeft(t, 0), TRAIN.DRILLS_DAY);
  assert.equal(T.drillPoints(good), TRAIN.DRILL_MAX, 'a big drill is capped');
  assert.equal(T.drillPoints(poor), TRAIN.DRILL_MIN, 'a poor one still earns a little');
  for (let i = 0; i < TRAIN.DRILLS_DAY; i++) assert.ok(T.finishDrill(t, 'a', good, i * HOUR, ctx(i)).ok);
  assert.equal(t.tp.a, TRAIN.DRILLS_DAY * TRAIN.DRILL_MAX);
  assert.equal(T.finishDrill(t, 'a', good, 5 * HOUR, ctx(5)).ok, false, 'the nets close for the day');
  assert.equal(T.drillsLeft(t, 5 * HOUR), 0);
  assert.equal(T.drillsLeft(t, DAY + HOUR), TRAIN.DRILLS_DAY, 'the next day they open again');
  assert.ok(T.sealed(t), 'the books still add up');
});
test('net drills: unfinished, a player who cannot learn, and edited numbers earn nothing', () => {
  const t = T.freshTraining(0), ctx = mkCtx(0, { squad: squadOf({ a: {}, old: { age: 36 } }) });
  assert.equal(T.finishDrill(t, 'a', { balls: 4, runs: 20, outs: 0 }, 0, ctx).ok, false, 'quit half way');
  assert.equal(T.finishDrill(t, 'old', { balls: TRAIN.DRILL_BALLS, runs: 20, outs: 0 }, 0, ctx).ok, false);
  assert.equal(T.finishDrill(t, 'nobody', { balls: TRAIN.DRILL_BALLS, runs: 20, outs: 0 }, 0, ctx).ok, false);
  assert.ok(T.finishDrill(t, 'a', { balls: TRAIN.DRILL_BALLS, runs: 20, outs: 0 }, 0, ctx).ok);
  t.drills.n = 0;   // somebody rewinds the count
  assert.equal(T.drillsLeft(t, 0), 0, 'edited: closed for today');
  const u = T.freshTraining(0); u.tp.a = 99999;
  assert.equal(T.finishDrill(u, 'a', { balls: TRAIN.DRILL_BALLS, runs: 20, outs: 0 }, 0, ctx).ok, false, 'edited points: refused');
});
test('net drills: a save from before the drills still works', () => {
  const t = T.freshTraining(0); delete t.drills;
  assert.ok(T.finishDrill(t, 'a', { balls: TRAIN.DRILL_BALLS, runs: 10, outs: 0 }, 0, mkCtx(0)).ok);
  assert.ok(T.sealed(t));
});
