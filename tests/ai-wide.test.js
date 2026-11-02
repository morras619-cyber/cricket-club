import test from 'node:test';
import assert from 'node:assert/strict';
import { correctAfterWide } from '../js/ai.js';

test('AI moves a leg-side wide back towards the stumps', () => {
  const original = { x: -0.5, length: 'good', lane: 'wideleg' };
  const next = correctAfterWide(original);
  assert.equal(next.x, -0.15);
  assert.equal(next.length, 'good');
  assert.equal(next.lane, 'wideleg');
  assert.equal(original.x, -0.5);
});

test('AI correction never pushes the line beyond the off-side cap', () => {
  assert.equal(correctAfterWide({ x: 0.4 }).x, 0.15);
});

test('repeated wide corrections continue moving the line inwards', () => {
  const first = correctAfterWide({ x: -0.9 });
  const second = correctAfterWide(first);
  assert.ok(second.x > first.x);
  assert.equal(second.x, -0.2);
});
