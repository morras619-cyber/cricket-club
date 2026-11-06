import test from 'node:test';
import assert from 'node:assert/strict';
import { batNewSize, batNewZone, rhythmStage, rhythmFx, rhythmNext, RHYTHM_NAMES } from '../js/shots.js';

test('swipe length is the risk: short is safe and weak, long is strong and hard to time', () => {
  const push = batNewSize(0.4), drive = batNewSize(0.8), big = batNewSize(1.5);
  assert.equal(push.band, 'push'); assert.equal(drive.band, 'drive'); assert.equal(big.band, 'big');
  assert.ok(push.win > drive.win && drive.win > big.win, 'the timing window narrows as the swipe lengthens');
  assert.ok(push.power < drive.power && drive.power < big.power, 'the power grows with it');
  assert.ok(batNewSize(1).win === 1 && batNewSize(1).power === 1, 'the lofting length is the neutral point');
  assert.ok(batNewSize(5).win >= 0.8 && batNewSize(5).power <= 1.45, 'it is capped');
});

test('the finger on the ball\'s line is worth a full window; reaching costs window and power', () => {
  const on = batNewZone(0.3), close = batNewZone(1), reach = batNewZone(2.5);
  assert.ok(on.win >= 1 && on.power === 1 && on.near === 'on the line');
  assert.ok(close.win < on.win && reach.win < close.win);
  assert.ok(reach.power < on.power && reach.near === 'reaching');
  assert.ok(reach.win >= 0.85 && reach.power >= 0.7, 'never worse than a floor: a bad read is punished, not made impossible');
});

test('confidence builds on good shots and breaks on bad ones', () => {
  assert.equal(rhythmStage(0), 0); assert.equal(rhythmStage(25), 1); assert.equal(rhythmStage(60), 2);
  let v = 0;
  v = rhythmNext(v, 'perfect');                                       // 40: Confident
  assert.equal(rhythmStage(v), 1);
  v = rhythmNext(v, 'good');                                          // 65: Unstoppable
  assert.equal(RHYTHM_NAMES[rhythmStage(v)], 'UNSTOPPABLE');
  assert.ok(rhythmFx(v).win > rhythmFx(0).win && rhythmFx(v).power > rhythmFx(0).power);
  assert.equal(rhythmNext(v, 'defend'), v);                            // (a defensive tap leaves it)
  assert.ok(rhythmNext(v, 'late') < v);
  assert.equal(rhythmNext(20, 'edge'), 0);                             // (a miss or an edge breaks it)
  assert.equal(rhythmNext(100, 'perfect'), 100);                       // (capped)
});
