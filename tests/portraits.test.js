import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { PORTRAIT_KEYS, PORTRAIT_AGE, PORTRAIT_ATLAS } from '../js/portraits-list.js';
import { PORTRAIT_FACES } from '../js/portrait-faces.js';
import { PORTRAIT_LOOKS } from '../js/portrait-looks.js';
import { PORTRAIT_STYLES } from '../js/portrait-styles.js';
import { TEAMS, LEAGUE_CLUBS } from '../js/teams.js';
import { roster } from '../js/squads.js';
import { HEROES } from '../js/heroes.js';

// a WEBP's width and height are in its header (VP8X, VP8 or VP8L)
function webpSize(buf) {
  const type = buf.toString('ascii', 12, 16);
  if (type === 'VP8X') return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
  if (type === 'VP8L') { const b = buf.readUInt32LE(21); return [1 + (b & 0x3fff), 1 + ((b >> 14) & 0x3fff)]; }
  return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
}
const keyOf = n => n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const url = p => new URL(`../${p}`, import.meta.url);

test('every painted portrait has its picture, head square, skin and hair, haircut and age', () => {
  for (const k of PORTRAIT_KEYS) {
    assert.ok(existsSync(url(`img/cards/portraits/${k}.webp`)), `${k}: picture`);
    assert.ok(PORTRAIT_FACES[k], `${k}: head square`);
    assert.ok(PORTRAIT_LOOKS[k], `${k}: skin and hair`);
    assert.ok(PORTRAIT_STYLES[k], `${k}: haircut`);
    assert.ok(PORTRAIT_AGE[k] >= 18 && PORTRAIT_AGE[k] <= 40, `${k}: age ${PORTRAIT_AGE[k]}`);
  }
});

test('every portrait belongs to a hero or a player in a squad, and no two players share a picture', () => {
  const names = new Set([...HEROES.map(h => keyOf(h.name)), ...[...TEAMS, ...LEAGUE_CLUBS].flatMap(t => roster(t.id).map(p => keyOf(p.name)))]);
  for (const k of PORTRAIT_KEYS) assert.ok(names.has(k), `${k} is nobody's picture`);
  assert.equal(new Set(PORTRAIT_KEYS).size, PORTRAIT_KEYS.length);
});

test('the pictures that hold the later portraits: each one sits inside its picture', () => {
  const files = ['img/cards/portraits-more.webp', 'img/cards/portraits-more2.webp'].map(f => webpSize(readFileSync(url(f))));
  assert.ok(Object.values(PORTRAIT_ATLAS).some(v => v[4] === 1), 'the second picture is in use');
  for (const [k, [x, y, w, h, n = 0]] of Object.entries(PORTRAIT_ATLAS)) {
    assert.ok(PORTRAIT_KEYS.includes(k), `${k} is listed`);
    const [W, H] = files[n];
    assert.ok(x >= 0 && y >= 0 && x + w <= W && y + h <= H, `${k} sits outside picture ${n}`);
  }
});
