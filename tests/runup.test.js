import test from 'node:test';
import assert from 'node:assert/strict';
import { BOWL_TYPES, runUp, PACE_STEPS } from '../js/squads.js';

test('only the quick bowlers start a long way back: the run follows the pace, and a medium-paced seamer takes a short one', () => {
  const m = id => runUp(BOWL_TYPES[id]).m, top = id => BOWL_TYPES[id].kmh[1];
  const byPace = ['seam', 'swing', 'leftpace', 'express'];
  for (let i = 1; i < byPace.length; i++) {
    assert.ok(top(byPace[i]) > top(byPace[i - 1]) && m(byPace[i]) > m(byPace[i - 1]), `${byPace[i]} bowls faster and runs further than ${byPace[i - 1]}`);
  }
  assert.ok(m('seam') <= 9, 'a medium-paced bowler does not run from far');
  assert.ok(m('express') >= 16 && m('express') <= 19);
  assert.ok(m('express') >= 2 * m('seam'));
  assert.ok(m('offspin') >= 2);
});

test('a spinner runs more slowly than a quick, even though his run is shorter', () => {
  const speed = r => r.m / (r.ms / 1000);
  for (const s of ['offspin', 'legspin']) for (const f of ['express', 'swing', 'leftpace', 'seam']) {
    assert.ok(speed(runUp(BOWL_TYPES[s])) < speed(runUp(BOWL_TYPES[f])), `${s} is slower than ${f}`);
  }
  assert.ok(runUp(BOWL_TYPES.offspin).ms >= 800, 'his walk-in is not hurried');
});

test('a fast bowler takes a run you can follow: a long run, no faster than 9 m/s, and more running frames than before', () => {
  const express = runUp(BOWL_TYPES.express);
  assert.ok(express.m >= 16 && express.m <= 19);   // (a fast bowler starts well back)
  assert.ok(express.m / (express.ms / 1000) < 9, 'under 9 m/s');
  assert.ok(express.ms > 850 && express.ms < 2200);   // (a longer run takes a little longer: still under 9 m/s)
  assert.ok(PACE_STEPS > 14, 'more steps than the old 14');
});
