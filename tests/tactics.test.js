import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gestureToDelivery, deliveryMods, planExpectation, positionName, lengthForBounce, heightForBounce, laneFor, paceGrade } from '../js/tactics.js';
import { buildFieldFrom, presetPositions, outsideRing } from '../js/fieldsim.js';
import { sledgeOutcome, line } from '../js/banter.js';
import { makeRng } from '../js/rng.js';
import { makeDelivery } from '../js/physics.js';
import { heroById } from '../js/heroes.js';

// a straight-ish swipe: `up` px up the screen, `dx` px sideways, `bend` px bulge, over `ms`
function swipe(up, dx = 0, bend = 0, ms = 200) {
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const k = i / 10;
    pts.push({ x: 200 + dx * k + bend * Math.sin(Math.PI * k), y: 700 - up * k, t: 1000 + ms * k });
  }
  return pts;
}

test('swipe length picks the length band', () => {
  assert.equal(gestureToDelivery(swipe(40), 'pace'), null); // too short to be a delivery
  assert.equal(gestureToDelivery(swipe(100), 'pace').length, 'bouncer');
  assert.equal(gestureToDelivery(swipe(160), 'pace').length, 'short');
  assert.equal(gestureToDelivery(swipe(220), 'pace').length, 'good');
  assert.equal(gestureToDelivery(swipe(290), 'pace').length, 'full');
  assert.equal(gestureToDelivery(swipe(345), 'pace').length, 'yorker');
  const ft = gestureToDelivery(swipe(420), 'pace');
  assert.equal(ft.length, 'fulltoss');
  assert.equal(ft.bounce, null);
});

test('screen-left is the off side and the curve sets swing or spin', () => {
  assert.ok(gestureToDelivery(swipe(220, -120), 'pace').x > 0.3); // swipe left → wide of off
  assert.ok(gestureToDelivery(swipe(220, 120), 'pace').x < -0.3);
  assert.equal(gestureToDelivery(swipe(220, 0, 60), 'pace').type, 'Outswinger');
  assert.equal(gestureToDelivery(swipe(220, 0, -60), 'pace').type, 'Inswinger');
  assert.equal(gestureToDelivery(swipe(220), 'pace').type, 'Seam up');
  assert.equal(gestureToDelivery(swipe(220, 0, 60), 'spin').type, 'Leg-break');
  assert.ok(gestureToDelivery(swipe(220, 0, 60), 'spin').move > 0.1);
  assert.equal(gestureToDelivery(swipe(220, 0, -60), 'spin').type, 'Off-break');
});

test('flick speed sets pace and release grade', () => {
  const slow = gestureToDelivery(swipe(220, 0, 0, 900), 'pace');
  assert.equal(slow.slower, true);
  assert.equal(slow.type, 'Slower ball');
  assert.ok(slow.kmh < 105);
  assert.equal(gestureToDelivery(swipe(220, 0, 0, 300), 'pace').grade, 'good');
  assert.equal(gestureToDelivery(swipe(220, 0, 0, 180), 'pace').grade, 'perfect');
  assert.equal(gestureToDelivery(swipe(220, 0, 0, 130), 'pace').grade, 'loose');
  assert.equal(gestureToDelivery(swipe(300, 0, 0, 40), 'pace').grade, 'bad');
  assert.equal(paceGrade(0.8), 'perfect');
});

test('swipe deliveries feed the physics', () => {
  const g = gestureToDelivery(swipe(345), 'pace');
  const d = makeDelivery({ x: g.x, length: g.length, bounce: g.bounce, h: g.h, kmh: g.kmh, swing: g.swing, move: g.move });
  assert.ok(d.onStumps);
  assert.ok(Math.abs(d.bounce.z - g.bounce) < 1e-9);
  assert.equal(lengthForBounce(5), 'good');
  assert.ok(heightForBounce(10.5) > heightForBounce(2.8));
  assert.equal(laneFor(0), 'stumps');
  assert.equal(laneFor(0.6), 'wideoff');
});

test('setups, weak spots and the batter read change the AI', () => {
  const raja = heroById('raja').ai;
  const base = deliveryMods({ length: 'good', lane: 'off' }, [], null, raja, null);
  assert.equal(base.sigmaMul, 1);
  const setup = deliveryMods({ length: 'yorker', lane: 'stumps' }, [{ length: 'bouncer' }], null, raja, null);
  assert.ok(setup.tags.some(t => t.id === 'setup'));
  assert.ok(setup.tags.some(t => t.id === 'weak'));
  assert.ok(setup.sigmaMul > 1.9);
  const read = deliveryMods({ length: 'short', lane: 'off' }, [], 'short', raja, null);
  assert.ok(read.sigmaMul < 1);
  const surprise = deliveryMods({ length: 'yorker', lane: 'off' }, [], 'short', raja, null);
  assert.ok(surprise.tags.some(t => t.id === 'surprise'));
  const change = deliveryMods({ length: 'good', lane: 'off', slower: true }, [{ length: 'good' }, { length: 'good' }], null, raja, null);
  assert.ok(change.tags.some(t => t.id === 'changeup'));
  assert.ok(change.bias < 0);
  const trap = deliveryMods({ length: 'good', lane: 'off', lateWorld: -1, mag: 0.6 }, [{ length: 'full', lateWorld: 1, mag: 0.6 }], null, raja, null);
  assert.ok(trap.tags.some(t => t.id === 'swingtrap'));
  const late = deliveryMods({ length: 'good', lane: 'off', after: 0.3 }, [], null, raja, null);
  assert.ok(late.sigmaMul > 1.3 && late.edgeBoost > 0.1);
  // combos and weak spots stop working if you lean on them
  const again = deliveryMods({ length: 'yorker', lane: 'stumps' }, [{ length: 'yorker', combo: 'setup', weak: true }, { length: 'bouncer' }], null, raja, null);
  assert.ok(!again.tags.some(t => t.id === 'setup' || t.id === 'weak'));
  assert.ok(again.tags.some(t => t.id === 'waiting'));
  const pattern = deliveryMods({ length: 'good', lane: 'off' }, [{ length: 'good' }, { length: 'short' }], null, raja, null);
  assert.ok(pattern.tags.some(t => t.id === 'pattern') && pattern.sigmaMul < 1);
  assert.ok(deliveryMods({ length: 'good', lane: 'off' }, [], null, raja, { state: 'rattled' }).sigmaMul > 1.2);
  assert.ok(deliveryMods({ length: 'good', lane: 'off' }, [], null, raja, { state: 'fired' }).sigmaMul < 1);
  const all = deliveryMods({ length: 'yorker', lane: 'stumps', after: 0.32 }, [{ length: 'bouncer' }], 'bouncer', raja, { state: 'rattled' });
  assert.ok(all.sigmaMul <= 2.6);
});

test('batters mostly expect a repeat, and bluffers sometimes lie', () => {
  const rng = makeRng(4);
  let repeats = 0, lies = 0;
  for (let i = 0; i < 400; i++) {
    const e = planExpectation([{ length: 'bouncer' }, { length: 'short' }], heroById('meher').ai, rng);
    if (e.expect === 'short') repeats++;
    if (e.shown !== e.expect) lies++;
  }
  assert.ok(repeats > 150 && repeats < 260, `repeats ${repeats}`);
  assert.ok(lies > 140 && lies < 260, `lies ${lies}`);
});

test('custom fields: names follow position and the powerplay pulls extras in', () => {
  assert.equal(positionName(2.5, -4.5), 'Slip');
  assert.equal(positionName(-40, 45), 'Deep mid-wicket');
  assert.equal(positionName(18, 60), 'Long-off');
  assert.equal(positionName(50, 0), 'Deep point');
  const deep = presetPositions('defend');
  assert.ok(deep.filter(outsideRing).length > 2);
  const pp = buildFieldFrom(deep, true).filter(f => !f.keeper && f.id !== 'bowler');
  assert.equal(pp.filter(outsideRing).length, 2);
  assert.ok(pp.some(f => f.pulledIn));
});

test('banter picks lines and reactions', () => {
  const rng = makeRng(9);
  assert.equal(typeof line('sledge', 'zara', rng), 'string');
  assert.equal(typeof line('sledge', 'unknown', rng), 'string');
  const counts = { fired: 0, rattled: 0, unfazed: 0 };
  for (let i = 0; i < 1000; i++) counts[sledgeOutcome(heroById('raja').ai, rng)]++;
  assert.ok(counts.fired > 480 && counts.fired < 620, JSON.stringify(counts));
  assert.ok(counts.unfazed > 100);
});
