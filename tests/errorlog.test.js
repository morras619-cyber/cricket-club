import test from 'node:test';
import assert from 'node:assert/strict';
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
const { record, errorList, errorCount, errorReport, clearErrors } = await import('../js/errorlog.js');

test('the same error is counted, not listed again; the list keeps the last 20; the report says what happened', () => {
  clearErrors();
  for (let i = 0; i < 5; i++) record('caught', new Error('render failed'));
  assert.equal(errorList().length, 1); assert.equal(errorCount(), 5);
  for (let i = 0; i < 30; i++) record('error', new Error('other ' + i));
  assert.equal(errorList().length, 20);
  const r = JSON.parse(errorReport({ schema: 2 }));
  assert.equal(r.game, 'Sixcharge'); assert.equal(r.schema, 2); assert.equal(r.errors.length, 20); assert.ok(!('sig' in r.errors[0]));
  assert.ok(JSON.parse(store.get('sixcharge.errors')).length === 20, 'kept in storage');
});
