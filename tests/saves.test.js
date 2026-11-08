import test from 'node:test';
import assert from 'node:assert/strict';

// a browser's storage, in memory (and one that can run out of room)
const store = new Map(); let full = false;
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { if (full) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } store.set(k, String(v)); }, removeItem: k => store.delete(k) };
globalThis.btoa ??= s => Buffer.from(s, 'binary').toString('base64'); globalThis.atob ??= s => Buffer.from(s, 'base64').toString('binary');
const { loadProfile, saveProfile, saveState, exportSave, parseSaveCode, restoreSave, migrate, SCHEMA, looksLikeSave } = await import('../js/profile.js');

test('a new player gets a fresh, versioned save; an old unversioned save is brought along, with its settings filled in', () => {
  store.clear();
  assert.equal(loadProfile().v, SCHEMA);
  store.set('sixcharge.profile.v1', JSON.stringify({ name: 'Asha', xp: 500, coins: 70, settings: { sound: false } }));
  const p = loadProfile();
  assert.equal(p.name, 'Asha'); assert.equal(p.v, SCHEMA); assert.equal(p.settings.sound, false);
  assert.equal(p.settings.haptics, true, 'a setting the old save did not have is filled in');
  assert.equal(migrate({ v: 1, xp: 1 }).v, SCHEMA);
});

test('a save that is damaged is read from the backup, and saving keeps the last good copy as the backup', () => {
  store.clear();
  const p = loadProfile(); p.name = 'First'; saveProfile(p);
  p.name = 'Second'; saveProfile(p);   // (the first copy is now the backup, if a minute has gone by: forced here)
  store.set('sixcharge.profile.v1.bak', JSON.stringify({ ...p, name: 'Backup' }));
  store.set('sixcharge.profile.v1', '{not json');
  const r = loadProfile();
  assert.equal(r.name, 'Backup'); assert.equal(saveState.backup, true);
});

test('a save that cannot be written (storage full) is noticed, and noticed again as fixed', () => {
  store.clear(); const p = loadProfile(); let seen = [];
  saveState.listeners.push(s => seen.push(s.ok));
  full = true; saveProfile(p); full = false;
  assert.equal(saveState.ok, false); assert.equal(saveState.error, 'QuotaExceededError');
  saveProfile(p);
  assert.equal(saveState.ok, true); assert.deepEqual(seen, [false, true]);
});

test('a backup code carries a save to another phone, and a wrong one is refused', () => {
  store.clear(); const p = loadProfile(); p.name = 'Zoë ✓'; p.xp = 1234; p.career = { club: 'x', players: { a: { name: 'Éric' } } };
  const code = exportSave(p), back = parseSaveCode(code);
  assert.equal(back.ok, true); assert.equal(back.profile.name, 'Zoë ✓'); assert.equal(back.profile.xp, 1234); assert.equal(back.profile.career.players.a.name, 'Éric');
  assert.equal(parseSaveCode('hello').ok, false); assert.equal(parseSaveCode(code.slice(0, 40)).ok, false); assert.equal(parseSaveCode('SIXCHARGE1:' + Buffer.from('{"x":1}').toString('base64')).ok, false);
  assert.equal(restoreSave(back.profile), true); assert.equal(loadProfile().name, 'Zoë ✓');
  assert.equal(looksLikeSave({ xp: 1, coins: 1, settings: {} }), true);
});
