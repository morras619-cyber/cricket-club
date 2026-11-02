import test from 'node:test';
import assert from 'node:assert/strict';
import { HEROES, HUNT, SPARKS } from '../js/heroes.js';
import { Mind } from '../js/heat.js';
import { aiBat } from '../js/ai.js';
import { gapAngle, simulateHit } from '../js/fieldsim.js';
import { makeDelivery } from '../js/physics.js';
import { makeRng } from '../js/rng.js';
import { CFG } from '../js/config.js';

const ring = (angles, r = 30) => angles.map((a, i) => ({ id: 'f' + i, x: Math.sin(a) * r, y: Math.cos(a) * r }));

test('every star carries his other powers; none repeats a kind, and Hat-trick Hunt is cheaper than the Spark it replaces', () => {
  const kinds = HEROES.flatMap(h => [h.power.kind, h.ultimate?.kind, ...(h.alts || []).map(a => a.kind)]).filter(Boolean);
  assert.equal(new Set(kinds).size, kinds.length, 'no kind appears twice');
  for (const h of HEROES) for (const a of h.alts || []) assert.ok(a.name && a.desc && a.word && a.cost > 0, `${a.kind} is complete`);
  assert.deepEqual(HEROES.filter(h => h.slot === 'bat').flatMap(h => h.alts.map(a => a.kind)).sort(), ['gapfinder', 'luckybreak', 'readbowler', 'showdown']);
  assert.deepEqual(HEROES.filter(h => h.slot === 'bowl').flatMap(h => h.alts.map(a => a.kind)).sort(), ['bouncer', 'cutter', 'googly', 'storm']);
  assert.ok(HUNT.cost < SPARKS.bowl.cost);
});

test('Gap Finder heads for the one gap in a ring of fielders', () => {
  const around = [-1.4, -1.1, -0.8, -0.5, -0.2, 0.1, 0.4, 1.0, 1.3];   // (nobody near 0.7)
  const a = gapAngle(ring(around));
  assert.ok(Math.abs(a - 0.7) < 0.2, `aimed at ${a.toFixed(2)}`);
  const noKeeper = [...ring(around), { id: 'keeper', keeper: true, x: 0, y: -3 }, { id: 'bowler', x: 1.5, y: 23 }];
  assert.ok(Math.abs(gapAngle(noKeeper) - a) < 1e-9, 'the keeper and bowler are not a part of the field');
});

test('Bouncer Barrage: a lofted hit always has a catch chance, even where nobody is near', () => {
  const field = ring([-1.4, 1.4], 40);
  const hit = { outcome: 'hit', grade: 'good', angle: 0, loft: true, launchDeg: 60, v: 18 };
  const rng = makeRng(1);
  assert.equal(simulateHit(hit, field, rng).catch, null, 'a lonely skier is a safe single without it');
  const sim = simulateHit({ ...hit, forced: { chance: true } }, field, rng);
  assert.ok(sim.catch && sim.catch.p >= 0.55, 'but with it somebody has to take it');
});

test('Cutter makes the AI swing early; Googly Switch and Swing Storm make it mistime more', () => {
  const d = makeDelivery({ x: 0.1, length: 'good', kmh: 130, swing: 0.1, move: 0.1, rx: 0.3 });
  const ctx = fx => ({ skill: 75, bowlSkill: 75, style: {}, ballNo: 10, need: 40, ballsLeft: 20, wicketsLeft: 3, release: 'good', fx });
  const mean = fx => { const rng = makeRng(11); let s = 0; for (let i = 0; i < 600; i++) s += aiBat(d, ctx(fx), rng).errMs; return s / 600; };
  const spread = fx => { const rng = makeRng(12); let s = 0; for (let i = 0; i < 600; i++) s += Math.abs(aiBat(d, ctx(fx), rng).errMs); return s / 600; };
  assert.ok(mean({ cutter: true }) < mean({}) - 60, 'a cutter arrives late for the swing: early');
  assert.ok(mean({ cutter: true, cutterBrace: true }) > mean({ cutter: true }) + 30, 'braced, he is less early');
  assert.ok(spread({ googly: true }) > spread({}) * 1.2, 'the googly');
  assert.ok(spread({ googly: true, googlyBrace: true }) < spread({ googly: true }), 'braced, it fools him less');
  assert.ok(spread({ storm: true }) > spread({}) * 1.2, 'the storm');
  assert.ok(spread({ hunt: true }) > spread({}) * 1.05, 'a rattled new batter');
  assert.ok(CFG.timing.good < 105 && mean({ cutter: true }) < -CFG.timing.good, 'the cutter is early by more than a Good window');
});

test('the AI never answers a free hit or a look at the ball, but does answer a Showdown or a bouncer', () => {
  const m = new Mind(makeRng(21));
  for (let i = 0; i < 40; i++) { m.charge.value = 100; assert.equal(m.counter('luckybreak'), null); assert.equal(m.counter('readbowler'), null); }
  let showdown = 0, bouncer = 0;
  for (let i = 0; i < 40; i++) { m.charge.value = 100; if (m.counter('showdown')) showdown++; m.charge.value = 100; if (m.counter('bouncer')) bouncer++; }
  assert.ok(showdown > 25 && bouncer > 25, `${showdown} / ${bouncer} of 40`);
});
