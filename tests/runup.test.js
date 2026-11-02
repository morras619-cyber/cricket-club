import test from 'node:test';
import assert from 'node:assert/strict';
import { BOWL_TYPES, runUp, PACE_STEPS } from '../js/squads.js';

test('a fast bowler starts a long way back; a spinner takes a short run', () => {
  const fast = ['express', 'swing', 'leftpace', 'seam'].map(id => runUp(BOWL_TYPES[id]));
  const spin = ['offspin', 'legspin'].map(id => runUp(BOWL_TYPES[id]));
  assert.ok(Math.min(...fast.map(r => r.m)) > 2 * Math.max(...spin.map(r => r.m)));
  assert.ok(runUp(BOWL_TYPES.express).m > runUp(BOWL_TYPES.seam).m);
  assert.ok(runUp(BOWL_TYPES.express).m <= 10 && runUp(BOWL_TYPES.offspin).m >= 2);
});

test('a spinner runs more slowly than a quick, even though his run is shorter', () => {
  const speed = r => r.m / (r.ms / 1000);
  for (const s of ['offspin', 'legspin']) for (const f of ['express', 'swing', 'leftpace', 'seam']) {
    assert.ok(speed(runUp(BOWL_TYPES[s])) < speed(runUp(BOWL_TYPES[f])), `${s} is slower than ${f}`);
  }
  assert.ok(runUp(BOWL_TYPES.offspin).ms >= 800, 'his walk-in is not hurried');
});

test('a fast bowler takes a run you can follow: a longer run, no faster than 9 m/s, and more running frames than before', () => {
  const express = runUp(BOWL_TYPES.express);
  assert.ok(express.m >= 9 && express.m <= 10);
  assert.ok(express.m / (express.ms / 1000) < 9, 'under 9 m/s');
  assert.ok(express.ms > 850 && express.ms < 1300);
  assert.ok(PACE_STEPS > 14, 'more steps than the old 14');
});
