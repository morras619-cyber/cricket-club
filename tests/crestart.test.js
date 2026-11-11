import test from 'node:test';
import assert from 'node:assert/strict';
import { ART_IDS, EMBLEM_IDS } from '../js/crest.js';

test('the painted crests: twenty, all different, and the club builder offers them first', () => {
  assert.equal(ART_IDS.length, 20);
  assert.equal(new Set(ART_IDS).size, 20);
  assert.deepEqual(EMBLEM_IDS.slice(0, 20), ART_IDS);
});

test('the older emblems are all still offered: a club that chose one keeps it', () => {
  for (const id of ['wave', 'wing', 'tiger', 'lotus', 'mountain', 'anvil', 'comet', 'claw', 'anchor', 'jaguar', 'crescent', 'bolt', 'kite', 'tusk', 'rocket', 'lantern']) assert.ok(EMBLEM_IDS.includes(id), id);
  assert.equal(new Set(EMBLEM_IDS).size, EMBLEM_IDS.length, 'no emblem twice');
});
