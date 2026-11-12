import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/career.js';
import { lookOf, SKIN } from '../js/looks.js';
import { PORTRAIT_LOOKS } from '../js/portrait-looks.js';
import { PORTRAIT_KEYS } from '../js/portraits-list.js';

const keys = new Set(PORTRAIT_KEYS);
const step = hex => { const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; let best = 0, d0 = 1e9; SKIN.forEach((h, i) => { const m = parseInt(h.slice(1), 16), d = (c[0] - ((m >> 16) & 255)) ** 2 + (c[1] - ((m >> 8) & 255)) ** 2 + (c[2] - (m & 255)) ** 2; if (d < d0) { d0 = d; best = i; } }); return best; };
const make = seed => { const c = C.newCareer(seed); C.createClub(c, { name: 'Harbour Kings', short: 'HAR', suit: '#1f3fb0', trim: '#ffd23f', crest: 'bolt', chant: 'vipers', pitch: 'turner' }, { trials: true }); C.ensurePics(c); return c; };

test('the man on the pitch has the skin of the man on his card: every player with a portrait', () => {
  for (const seed of [5, 23, 101, 404]) {
    const c = make(seed);
    for (const p of Object.values(c.players)) {
      const key = p.pic || (p.name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      assert.ok(keys.has(key), `${p.name} has a portrait`);
      assert.equal(lookOf(p).skin, PORTRAIT_LOOKS[key].skin, `${p.name}: sprite and card skin`);
      assert.equal(lookOf(p).hair, PORTRAIT_LOOKS[key].hair, `${p.name}: sprite and card hair`);
    }
  }
});

test('a borrowed face is never far from the skin tone the player is made with (no pale face on a dark player, nor the other way)', () => {
  for (const seed of [5, 11, 23, 77, 101, 202]) {
    const c = make(seed);
    for (const p of Object.values(c.players)) if (p.pic && p.app && typeof p.app.skin === 'number') {
      assert.ok(Math.abs(step(PORTRAIT_LOOKS[p.pic].skin) - p.app.skin) <= 1, `${p.name} (own tone ${p.app.skin}) has ${p.pic} (tone ${step(PORTRAIT_LOOKS[p.pic].skin)})`);
    }
  }
});

test('a career saved with a mismatched borrowed face has it changed once, and only that one', () => {
  const c0 = make(23);
  const keyOf = q => (q.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const batterFaces = new Set(Object.values(c0.players).filter(q => q.role === 'bat' || q.role === 'wk').map(keyOf));   // (a face painted for a batter: the kind rule leaves it alone)
  // (the careers' made-up players have no look of their own now, his look follows his face; an older save's players did: give a candidate the look his own face has, as such a save would)
  c0.players[c0.trial.bats[0]].app = { skin: 5 };   // (a dark tone: the careers' painted faces are mostly lighter, so a face three or more steps off is easy to find)
  let id = null, wrong = null;
  for (const cand of c0.trial.bats) {
    if (!c0.players[cand].app) continue;
    const w = PORTRAIT_KEYS.filter(k => batterFaces.has(k) && Math.abs(step(PORTRAIT_LOOKS[k].skin) - c0.players[cand].app.skin) >= 3).sort((x, y) => step(PORTRAIT_LOOKS[x].skin) - step(PORTRAIT_LOOKS[y].skin))[0];   // (the lightest: the furthest from his tone)
    if (w) { id = cand; wrong = w; break; }
  }
  assert.ok(id, 'a batter with a face three steps from his own tone exists');
  const saved = structuredClone(c0);   // (a save loaded in a new session: the pictures are looked at again)
  saved.players[id].pic = wrong; delete saved.picsMatched;
  const before = Object.fromEntries(Object.values(saved.players).map(q => [q.id, q.pic]));
  C.ensurePics(saved);
  const p = saved.players[id];
  assert.notEqual(p.pic, wrong);
  assert.ok(Math.abs(step(PORTRAIT_LOOKS[p.pic].skin) - p.app.skin) < Math.abs(step(PORTRAIT_LOOKS[wrong].skin) - p.app.skin), 'the new face is nearer his skin than the one taken away (there are few dark faces to choose from)');
  for (const q of Object.values(saved.players)) if (q.id !== id) assert.equal(q.pic, before[q.id], `${q.name} keeps his face`);
  const again = structuredClone(saved); again.players[id].pic = wrong;
  C.ensurePics(again);
  assert.equal(again.players[id].pic, wrong, 'it does not run again on a career that has been matched');
});
