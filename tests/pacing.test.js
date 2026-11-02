import test from 'node:test';
import assert from 'node:assert/strict';
const P = await import('../js/pacing.js');
const { PACE, HOUR } = P;

test('you start with four matches, and spending one starts the clock', () => {
  const p = P.freshPace(0);
  assert.equal(p.tokens, 4);
  assert.ok(P.spend(p, 0));
  assert.equal(p.tokens, 3);
  assert.equal(P.nextIn(p, 0), PACE.EVERY);
});
test('a match every four hours, and the bank holds four', () => {
  const p = P.freshPace(0);
  for (let i = 0; i < 4; i++) assert.ok(P.spend(p, 0));
  assert.equal(P.spend(p, 0), false, 'none left');
  P.refill(p, 4 * HOUR);
  assert.equal(p.tokens, 1);
  P.refill(p, 10 * HOUR);
  assert.equal(p.tokens, 2, 'the two hours are kept');
  P.refill(p, 10 * HOUR + 2 * HOUR);
  assert.equal(p.tokens, 3);
  P.refill(p, 10 * HOUR + 100 * HOUR);
  assert.equal(p.tokens, 4, 'four at most');
});
test('a full meter does not save up: spending one from full starts a fresh four hours', () => {
  const p = P.freshPace(0);
  P.refill(p, 50 * HOUR);
  assert.ok(P.spend(p, 50 * HOUR));
  assert.equal(P.nextIn(p, 50 * HOUR), PACE.EVERY);
});
test('the clock going back changes nothing, and a number edited in the save is noticed', () => {
  const p = P.freshPace(10 * HOUR);
  P.spend(p, 10 * HOUR);
  const before = JSON.stringify(p);
  P.refill(p, 5 * HOUR);
  assert.equal(JSON.stringify(p), before);
  p.tokens = 4;
  P.refill(p, 10 * HOUR + 1);
  assert.equal(p.tokens, 0, 'edited: it starts empty');
});
test('without a confirmed time at most one token comes back a visit', () => {
  const p = P.freshPace(0);
  for (let i = 0; i < 4; i++) P.spend(p, 0);
  P.refill(p, 20 * HOUR, false);
  assert.equal(p.tokens, 1);
});
test('ten seasons of fourteen matches cannot be played in a day or a week', () => {
  // the fastest play: the four banked at once, then one every four hours
  const hoursFor = n => Math.max(0, n - PACE.BANK) * (PACE.EVERY / HOUR);
  assert.ok(hoursFor(14) >= 40, 'a season takes nearly two days of constant play at the very least');
  assert.ok(hoursFor(140) >= 540, 'ten seasons take over three weeks of constant play');
});

// ---------- the club's level, the builders and the diamonds ----------
const mkBuildCtx = (c, o = {}) => {
  const levels = { training: 1, merch: 1, ...o.levels }, applied = [];
  const bank = { money: o.money ?? 100000, spend(k) { if (this.money < k) return 0; this.money -= k; return k; } };
  return { now: o.now ?? 0, trusted: o.trusted ?? true, level: id => levels[id], apply: (id, lv) => { levels[id] = lv; applied.push([id, lv]); }, bank, blocked: o.blocked, levels, applied };
};
test('the club levels up on XP, ten at most, and slowly', () => {
  assert.equal(P.clubLevel(0), 1);
  assert.equal(P.clubLevel(149), 1);
  assert.equal(P.clubLevel(150), 2);
  assert.equal(P.clubLevel(1400), 5);
  assert.equal(P.clubLevel(7000), 10);
  assert.equal(P.clubLevel(1e9), 10);
  assert.equal(P.levelShare(0), 0); assert.equal(P.levelShare(1e9), 1);
  assert.ok(P.levelShare(275) > 0.49 && P.levelShare(275) < 0.51, 'half way from level 2 to 3');
  // a season's worth of wins and losses (14 matches) is nowhere near enough for the next level at the top
  assert.ok(7000 / ((P.XP.MATCH + P.XP.WIN) * 6) > 70, 'a player who wins every one of six matches a day needs over ten weeks for level 10');
});
test('XP is added to the club and says when the level went up; a number edited by hand empties it', () => {
  const c = {};
  assert.equal(P.addXp(c, 100), 0);
  assert.equal(P.addXp(c, 60), 2, 'level 2');
  assert.equal(c.build.xp, 160);
  c.build.xp = 99999;
  assert.equal(P.buildOf(c).xp, 0, 'edited: the XP is gone');
});
test('the strength of a building comes from its rows at level 1, 5 and 10; whole numbers stay whole', () => {
  const rows = [null, { slots: 2, prevent: 1 }, { slots: 4, prevent: 0.7 }, { slots: 6, prevent: 0.5 }];
  assert.deepEqual(P.levelRow(rows, 1), { slots: 2, prevent: 1 });
  assert.deepEqual(P.levelRow(rows, 5), { slots: 4, prevent: 0.7 });
  assert.deepEqual(P.levelRow(rows, 10), { slots: 6, prevent: 0.5 });
  assert.equal(P.levelRow(rows, 3).slots, 3);
  assert.ok(Number.isInteger(P.levelRow(rows, 7).slots));
  const s = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(l => P.levelRow(rows, l).slots);
  assert.ok(s.every((v, i) => i === 0 || v >= s[i - 1]), 'never goes down');
  assert.equal(P.levelRow(rows, 99).slots, 6, 'ten at most');
  assert.deepEqual([1, 4, 5, 9, 10].map(P.lookOf), [1, 1, 2, 2, 3], 'the picture changes at 5 and 10');
});
test('every level costs more and takes longer than the one before, and it is far dearer than before', () => {
  for (let to = 3; to <= 10; to++) { assert.ok(P.costOf('training', to) > P.costOf('training', to - 1)); assert.ok(P.hoursOf(to) >= P.hoursOf(to - 1)); }
  const upTo = (id, n) => { let t = 0; for (let l = 2; l <= n; l++) t += P.costOf(id, l); return t; };
  assert.ok(upTo('training', 5) > 3 * 1.2, 'level 5 costs several times the old second level');
  assert.ok(upTo('training', 10) > 10 * 3.5, 'level 10 costs many times the old third level');
  assert.ok(P.costOf('stadium', 5) > P.costOf('training', 5) && P.costOf('medical', 5) < P.costOf('training', 5));
  assert.ok(P.hoursOf(2) >= 1 && P.hoursOf(10) <= 24, 'a couple of hours, and never days');
});
test('a build takes the money, one builder, the time, and the club must be high enough', () => {
  const c = {}; P.addXp(c, 150);   // club level 2
  const ctx = mkBuildCtx(c);
  assert.equal(P.whyNot(c, 'training', ctx), null);
  assert.equal(P.whyNot(c, 'bank', ctx), 'Not built');
  const r = P.startBuild(c, 'training', ctx);
  assert.ok(r.ok);
  assert.equal(ctx.bank.money, 100000 - P.costOf('training', 2) * 1000, 'the money left the club');
  assert.equal(P.whyNot(c, 'training', ctx), 'Being built already');
  assert.equal(P.whyNot(c, 'merch', ctx), 'All your builders are busy', 'one builder, one job');
  assert.deepEqual(P.settleBuilds(c, mkBuildCtx(c, { now: 1 * HOUR })), [], 'not yet');
  const later = P.settleBuilds(c, Object.assign(ctx, { now: 2 * HOUR }));
  assert.equal(later.length, 1);
  assert.deepEqual(ctx.applied, [['training', 2]]);
  assert.equal(P.whyNot(c, 'training', ctx), 'Needs club level 3', 'the club is level 2: the building may not pass it');
  P.addXp(c, 250);
  assert.equal(P.whyNot(c, 'training', ctx), null);
});
test('no money, no builder time: nothing is taken; and only a server-confirmed time finishes a building', () => {
  const c = {}; P.addXp(c, 1400);
  assert.equal(P.startBuild(c, 'training', mkBuildCtx(c, { money: 10 })).ok, false);
  assert.equal(P.buildOf(c).jobs.length, 0);
  assert.equal(P.startBuild(c, 'training', mkBuildCtx(c, { trusted: false })).ok, false, 'no server time: no new build');
  const ctx = mkBuildCtx(c); P.startBuild(c, 'training', ctx);
  assert.deepEqual(P.settleBuilds(c, mkBuildCtx(c, { now: 100 * HOUR, trusted: false })), [], 'the phone clock jumping forward gets nothing');
  assert.equal(P.settleBuilds(c, mkBuildCtx(c, { now: 100 * HOUR })).length, 1);
});
test('the arena rule and the top level: other reasons can block a level', () => {
  const c = {}; P.addXp(c, 7000);
  const ctx = mkBuildCtx(c, { levels: { training: 9 }, blocked: (id, to) => (to >= 10 ? 'The Arena is for clubs out of Division 3' : null) });
  assert.equal(P.whyNot(c, 'training', ctx), 'The Arena is for clubs out of Division 3');
  assert.equal(P.whyNot(c, 'training', mkBuildCtx(c, { levels: { training: 10 } })), 'As big as it gets');
});
test('a second builder costs diamonds and builds a second thing at once; a book edited by hand loses them', () => {
  const c = {}; P.addXp(c, 400);   // club level 3
  assert.equal(P.buyBuilder(c).ok, false, 'no diamonds');
  P.addDiamonds(c, P.BUILD.BUILDER2);
  assert.ok(P.buyBuilder(c).ok);
  assert.equal(c.build.diamonds, 0); assert.equal(c.build.builders, 2);
  assert.equal(P.buyBuilder(c).ok, false, 'two at most');
  const ctx = mkBuildCtx(c);
  assert.ok(P.startBuild(c, 'training', ctx).ok && P.startBuild(c, 'merch', ctx).ok, 'two builds at once');
  assert.equal(P.whyNot(c, 'training', ctx), 'Being built already');
  P.skipBuild(c, 5 * HOUR);
  assert.equal(P.settleBuilds(c, mkBuildCtx(c, { now: 0 })).length, 2, 'testing: time skipped');
  c.build.diamonds = 9999;
  assert.equal(P.buildOf(c).diamonds, 0, 'edited: the diamonds are gone');
});
