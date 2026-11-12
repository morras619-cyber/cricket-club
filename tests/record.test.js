import test from 'node:test';
import assert from 'node:assert/strict';
import { matchRecord, recordResult, winRate, avatarOf, careerStats } from '../js/profile.js';

const summary = (mode, outcome, extra = {}) => ({ mode, result: { outcome }, oppTeam: { name: 'Volt Vipers' }, innings: [{ side: 'player', runs: 120, wkts: 4 }, { side: 'ai', runs: 99, wkts: 7 }], ...extra });

test('every finished match is counted once: won, lost, tied, the streak, the form and a line for the mode', () => {
  const p = {};
  const r = matchRecord(p);
  assert.deepEqual([r.played, r.won, r.lost, r.tied, winRate(r)], [0, 0, 0, 0, 0]);
  const a = summary('quick', 'win'); recordResult(p, a); recordResult(p, a);   // (the same match twice: once)
  recordResult(p, summary('quick', 'win')); recordResult(p, summary('career', 'loss')); recordResult(p, summary('cup', 'tie'));
  assert.deepEqual([r.played, r.won, r.lost, r.tied], [4, 2, 1, 1]);
  assert.equal(winRate(r), 50);
  assert.equal(r.streak, 0, 'a tie ends a streak');
  assert.equal(r.bestWinStreak, 2);
  assert.equal(r.last[0].r, 'T'); assert.equal(r.last[3].r, 'W'); assert.equal(r.last[0].opp, 'Volt Vipers');
  assert.deepEqual(r.modes.quick, { p: 2, w: 2, l: 0, t: 0 }); assert.equal(r.modes.career.l, 1);
});

test('streaks run on wins and on losses', () => {
  const p = {}; for (const o of ['win', 'win', 'win']) recordResult(p, summary('quick', o));
  assert.equal(matchRecord(p).streak, 3);
  recordResult(p, summary('quick', 'loss')); recordResult(p, summary('quick', 'loss'));
  assert.equal(matchRecord(p).streak, -2); assert.equal(matchRecord(p).bestWinStreak, 3);
});

test('the tutorial and the warm-up are not counted, nor a match with no result; the daily and the challenge are', () => {
  const p = {};
  recordResult(p, summary('tutorial', 'win')); recordResult(p, summary('warmup', 'win')); recordResult(p, summary('quick', undefined)); recordResult(p, null);
  assert.equal(matchRecord(p).played, 0);
  recordResult(p, summary('daily', 'win')); recordResult(p, summary('challenge', 'loss')); recordResult(p, summary('war', 'win'));
  assert.equal(matchRecord(p).played, 3);
});

test('the list of results keeps the last twenty', () => {
  const p = {}; for (let i = 0; i < 30; i++) recordResult(p, summary('quick', i % 2 ? 'win' : 'loss'));
  assert.equal(matchRecord(p).last.length, 20); assert.equal(matchRecord(p).played, 30);
});

test('a player from before the record had one: his old matches and wins are carried over, once, and nothing else changes', () => {
  const p = { matches: 12, wins: 7, stats: { bat: { inns: 5, runs: 200 } } };
  const r = matchRecord(p);
  assert.deepEqual([r.played, r.won, r.lost, r.carried], [12, 7, 5, 12]);
  recordResult(p, summary('quick', 'win'));
  assert.deepEqual([matchRecord(p).played, matchRecord(p).won, matchRecord(p).carried], [13, 8, 12]);
  assert.equal(careerStats(p).bat.runs, 200, 'his batting figures are untouched');
});

test('the profile picture must be an image data URL; anything else is ignored', () => {
  assert.equal(avatarOf({ avatar: 'data:image/jpeg;base64,AAAA' }), 'data:image/jpeg;base64,AAAA');
  assert.equal(avatarOf({ avatar: 'http://example.com/x.png' }), null);
  assert.equal(avatarOf({ avatar: 'javascript:alert(1)' }), null);
  assert.equal(avatarOf({}), null); assert.equal(avatarOf(null), null);
});

test('a save read from storage gets its record before any match is played, so the first new match is counted once', async () => {
  const store = new Map(); globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) };
  const { loadProfile } = await import('../js/profile.js');
  store.set('sixcharge.profile.v1', JSON.stringify({ name: 'Old', xp: 100, coins: 5, settings: {}, matches: 3, wins: 2 }));
  const p = loadProfile();
  assert.equal(p.stats.record.played, 3);
  p.matches++; p.wins++;   // (what the rewards do when a match finishes, before the record is written)
  recordResult(p, summary('quick', 'win'));
  assert.deepEqual([p.stats.record.played, p.stats.record.won], [4, 3]);
  const fresh = loadProfile.call ? (store.clear(), loadProfile()) : null;
  assert.equal(fresh.stats.record.played, 0);
});
