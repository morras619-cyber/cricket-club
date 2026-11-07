import test from 'node:test';
import assert from 'node:assert/strict';
import { lookOf } from '../js/looks.js';
import { PORTRAIT_LOOKS } from '../js/portrait-looks.js';
import { HEROES } from '../js/heroes.js';

const key = name => name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const lum = hex => 0.3 * parseInt(hex.slice(1, 3), 16) + 0.59 * parseInt(hex.slice(3, 5), 16) + 0.11 * parseInt(hex.slice(5, 7), 16);

test('a hero who plays under another name has his own portrait\'s skin on the pitch, as his card shows (the same key as the card)', () => {
  const h = HEROES.find(x => PORTRAIT_LOOKS[key(x.name)]);
  assert.ok(h, 'a hero with a painted portrait');
  const l = lookOf({ id: 'x-1', name: 'Somebody Else', heroId: h.id });
  assert.equal(l.skin, PORTRAIT_LOOKS[key(h.name)].skin);
  assert.equal(lookOf({ id: 'x-2', name: h.name }).skin, PORTRAIT_LOOKS[key(h.name)].skin, 'and the same by name');
});

test('the black players\' portraits give them dark skin on the pitch, and no portrait is a bright orange', () => {
  for (const k of ['dwayne-hollis', 'jermaine-alleyne', 'mpho-ndlovu', 'ruan-mokoena', 'tevin-baptiste', 'thabo-botha', 'sipho-nkosi']) assert.ok(lum(PORTRAIT_LOOKS[k].skin) < 100, k);
  for (const [k, v] of Object.entries(PORTRAIT_LOOKS)) {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(v.skin.slice(i, i + 2), 16));
    assert.ok(r - b < 150 && g > 0.45 * r, `${k} ${v.skin}: a natural complexion, not an orange`);
  }
});
