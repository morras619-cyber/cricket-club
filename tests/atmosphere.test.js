import test from 'node:test';
import assert from 'node:assert/strict';
import { ATMOSPHERE, DIV_ORDER } from '../js/career.js';
import { atmosphere, lively, sixMusic, crowdSing } from '../js/audio.js';

test('the Super League has the full atmosphere; each division below is quieter', () => {
  assert.deepEqual(DIV_ORDER, ['asl', 'd2', 'd3']);
  assert.equal(ATMOSPHERE.asl, 1);
  assert.ok(ATMOSPHERE.asl > ATMOSPHERE.d2 && ATMOSPHERE.d2 > ATMOSPHERE.d3 && ATMOSPHERE.d3 > 0);
});

test('only the top division has the music, singing and disco lights', () => {
  for (const [d, lv] of Object.entries(ATMOSPHERE)) { atmosphere.level = lv; assert.equal(lively(), d === 'asl', d); }
  atmosphere.level = 1;
  assert.equal(lively(), true);   // (every other mode, and a fresh start)
});

test('the music and singing do nothing in a lower division, and need no audio to say so', () => {
  atmosphere.level = ATMOSPHERE.d2;
  assert.equal(sixMusic(1), 0);
  assert.equal(crowdSing(0, 5, 0.5), undefined);
  atmosphere.level = 1;
});
