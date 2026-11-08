import test from 'node:test';
import assert from 'node:assert/strict';

// a localStorage and a Capacitor Preferences that behave like the real ones
class Storage { constructor() { this.m = new Map(); } getItem(k) { return this.m.has(k) ? this.m.get(k) : null; } setItem(k, v) { this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } clear() { this.m.clear(); } key(i) { return [...this.m.keys()][i] ?? null; } get length() { return this.m.size; } }
const native = new Map(), calls = [];
globalThis.Storage = Storage;
globalThis.localStorage = new Storage();
globalThis.addEventListener = () => {};
globalThis.document = { addEventListener() {}, visibilityState: 'visible' };
globalThis.Capacitor = {
  isNativePlatform: () => true,
  registerPlugin: () => ({
    keys: async () => ({ keys: [...native.keys()] }),
    get: async ({ key }) => ({ value: native.has(key) ? native.get(key) : null }),
    set: async ({ key, value }) => { calls.push(['set', key]); native.set(key, value); },
    remove: async ({ key }) => { calls.push(['remove', key]); native.delete(key); },
  }),
};
native.set('sixcharge.profile.v1', '{"xp":5}');          // the phone has a save; the web view was wiped
native.set('other.thing', 'x');
localStorage.setItem('sixcharge.errors', '[]');          // the web view has something the phone does not
const { nativeReady } = await import('../js/profile.js');
await nativeReady;
const wait = ms => new Promise(r => setTimeout(r, ms));

test('what the web view lost comes back from the native copy; other keys are left alone', () => {
  assert.equal(localStorage.getItem('sixcharge.profile.v1'), '{"xp":5}');
  assert.equal(localStorage.getItem('other.thing'), null);
});
test('what the web view has and the phone has not is copied across', async () => {
  await wait(50);
  assert.equal(native.get('sixcharge.errors'), '[]');
});
test('later saves and removals are mirrored (one write per key, after a short wait), and only the game\'s own keys', async () => {
  calls.length = 0;
  localStorage.setItem('sixcharge.profile.v1', '{"xp":6}');
  localStorage.setItem('sixcharge.profile.v1', '{"xp":7}');
  localStorage.setItem('unrelated', '1');
  localStorage.removeItem('sixcharge.errors');
  assert.equal(native.get('sixcharge.profile.v1'), '{"xp":5}');   // (not yet: it waits to batch)
  await wait(700);
  assert.equal(native.get('sixcharge.profile.v1'), '{"xp":7}');
  assert.equal(native.has('sixcharge.errors'), false);
  assert.equal(native.has('unrelated'), false);
  assert.equal(calls.filter(c => c[1] === 'sixcharge.profile.v1').length, 1);
});
