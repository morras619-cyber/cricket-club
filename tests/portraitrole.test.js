import test from 'node:test';
import assert from 'node:assert/strict';
import { newCareer, ensurePics, youthIntake } from '../js/career.js';
import { makeRng } from '../js/rng.js';
import { PORTRAIT_KEYS } from '../js/portraits-list.js';

const norm = n => n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const kind = p => p.role === 'bowl' ? 'bowl' : p.role === 'bat' || p.role === 'wk' ? 'bat' : 'all';
const clashes = c => {
  const keys = new Set(PORTRAIT_KEYS), ps = Object.values(c.players), owner = new Map();
  for (const q of ps) { const k = norm(q.name || ''); if (keys.has(k)) owner.set(k, q); }
  let lent = 0, bad = 0;
  for (const q of ps) if (q.pic) { lent++; const o = owner.get(q.pic); if (o && ((kind(o) === 'bowl' && kind(q) === 'bat') || (kind(o) === 'bat' && kind(q) === 'bowl'))) bad++; }
  return { lent, bad };
};

test('a made-up bowler never borrows a batter\'s picture (a bat in his hand), nor a batter a bowler\'s', () => {
  for (const seed of [1, 2, 3]) {
    const c = newCareer(seed * 101);
    youthIntake(c, makeRng(seed), 40);
    ensurePics(c);
    const r = clashes(c);
    assert.ok(r.lent > 20, `${r.lent} pictures lent`);
    assert.equal(r.bad, 0, `seed ${seed}: ${r.bad} of ${r.lent} borrowed a picture of the other kind`);
  }
});

test('a career saved with a bowler holding a bat gets a new picture, and the rest keep theirs', () => {
  const c = newCareer(404);
  youthIntake(c, makeRng(9), 40);
  ensurePics(c);
  const ps = Object.values(c.players), bowler = ps.find(p => p.pic && p.role === 'bowl'), keep = ps.filter(p => p.pic && p.id !== bowler?.id).slice(0, 5).map(p => [p.id, p.pic]);
  const keys = new Set(PORTRAIT_KEYS);
  const batterPic = ps.find(p => p.role === 'bat' && keys.has(norm(p.name)));
  assert.ok(bowler && batterPic);
  bowler.pic = norm(batterPic.name);                       // (the old data: a bowler lent a batter's picture)
  c.players = { ...c.players };                            // (the cache is by player count: add one so it runs again)
  c.players['extra-x'] = { ...bowler, id: 'extra-x', name: 'Some Extra', pic: undefined, role: 'bowl' };
  ensurePics(c);
  assert.notEqual(c.players[bowler.id].pic, norm(batterPic.name), 'he is given another picture');
  for (const [id, pic] of keep) assert.equal(c.players[id].pic, pic, 'everyone else keeps theirs');
});
