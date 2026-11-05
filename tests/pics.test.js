import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/career.js';
import { PORTRAIT_KEYS } from '../js/portraits-list.js';
import { lookOf } from '../js/looks.js';

const keyOf = n => n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const spec = { name: 'Cluba', suit: '#1f3fb0', trim: '#ffd23f', crest: 'bolt', chant: 'vipers', pitch: 'turner' };

test('every made-up player (nets trialists, free agents) borrows a painted face, and a club never shows one face twice', () => {
  const c = C.newCareer(5); C.createClub(c, spec, { trials: true });
  C.ensurePics(c);
  const has = new Set(PORTRAIT_KEYS), ps = Object.values(c.players);
  const made = ps.filter(p => !has.has(keyOf(p.name)));
  assert.ok(made.length >= 12, 'the trialists are made up');
  for (const p of made) assert.ok(has.has(p.pic), `${p.name} has a painted face`);
  const T = c.trial, mine = [...T.bats, ...T.bowls].map(id => c.players[id]);
  const faces = mine.map(p => p.pic || keyOf(p.name));
  assert.equal(new Set(faces).size, faces.length, 'no face twice among the twelve trialists');
  const p = mine[0]; assert.equal(lookOf(p).who, p.name); assert.ok(lookOf(p).skin, 'his pitch figure takes the borrowed face\'s skin');
  const before = made.map(p => p.pic); C.ensurePics(c); assert.deepEqual(made.map(p => p.pic), before, 'chosen once, kept');
});
test('the chosen face suits him: the same country first, and a close age', () => {
  const c = C.newCareer(5); C.createClub(c, spec, { trials: true }); C.ensurePics(c);
  const has = new Set(PORTRAIT_KEYS), made = Object.values(c.players).filter(p => !has.has(keyOf(p.name)));
  const byKey = new Map(Object.values(c.players).map(p => [keyOf(p.name), p]));
  const same = made.filter(p => byKey.get(p.pic)?.nation === p.nation).length;
  assert.ok(same >= made.length / 2, `most borrow a face from their own country (${same} of ${made.length})`);
});
