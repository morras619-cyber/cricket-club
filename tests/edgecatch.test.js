import test from 'node:test';
import assert from 'node:assert/strict';
import { edgeCatch, hasSlip, buildField, KEEPER_EDGE_REACH } from '../js/fieldsim.js';

test('the keeper takes an edge that comes within his reach, and with a slip or a gully the wide ones can be caught too', () => {
  const noSlip = buildField('balanced', false), slips = buildField('attack', false);
  assert.equal(hasSlip(noSlip), false);
  assert.equal(hasSlip(slips), true);
  assert.equal(edgeCatch({ x: 0.3, y: 0.7 }, noSlip).by, 'keeper');
  assert.ok(edgeCatch({ x: 0.3, y: 0.7 }, noSlip).p > 0.8);
  assert.equal(edgeCatch({ x: 0.3 + KEEPER_EDGE_REACH, y: 0.7 }, noSlip).by, 'keeper');   // (the edge of his dive)
  const wide = { x: 1.45, y: 0.7 };
  assert.deepEqual(edgeCatch(wide, noSlip), { by: null, p: 0 });          // too wide, no slip: nobody can take it
  assert.equal(edgeCatch(wide, slips).by, 'slip');                          // too wide for him, but the slip is there
  assert.ok(edgeCatch(wide, slips).p > 0 && edgeCatch(wide, slips).p < 1);
});

test('the keeper and the bowler do not count as a slip', () => {
  assert.equal(hasSlip([{ id: 'keeper', keeper: true, x: 0, y: -3 }, { id: 'bowler', x: 0, y: 20 }]), false);
  assert.equal(hasSlip([{ id: 'cover', x: 18, y: 15 }, { id: 'fine', x: -30, y: -40 }]), false);
});
