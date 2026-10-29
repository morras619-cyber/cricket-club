import test from 'node:test';
import assert from 'node:assert/strict';
import { BOWL_TYPES, runUp } from '../js/squads.js';

test('a fast bowler starts a long way back; a spinner takes a short run', () => {
  const fast = ['express', 'swing', 'leftpace', 'seam'].map(id => runUp(BOWL_TYPES[id]));
  const spin = ['offspin', 'legspin'].map(id => runUp(BOWL_TYPES[id]));
  assert.ok(Math.min(...fast.map(r => r.m)) > 2 * Math.max(...spin.map(r => r.m)));
  assert.ok(runUp(BOWL_TYPES.express).m > runUp(BOWL_TYPES.seam).m);
  assert.ok(runUp(BOWL_TYPES.express).m <= 9 && runUp(BOWL_TYPES.offspin).m >= 2);
});

test('a spinner runs more slowly than a quick, even though his run is shorter', () => {
  const speed = r => r.m / (r.ms / 1000);
  for (const s of ['offspin', 'legspin']) for (const f of ['express', 'swing', 'leftpace', 'seam']) {
    assert.ok(speed(runUp(BOWL_TYPES[s])) < speed(runUp(BOWL_TYPES[f])), `${s} is slower than ${f}`);
  }
  assert.ok(runUp(BOWL_TYPES.offspin).ms > runUp(BOWL_TYPES.express).ms * 0.9, 'his walk-in is not hurried');
});

test('a fast bowler reaches the crease no later than before (about 0.85 s for express)', () => {
  assert.ok(Math.abs(runUp(BOWL_TYPES.express).ms - 850) < 1);
  assert.ok(runUp(BOWL_TYPES.seam).ms <= 850);
});
