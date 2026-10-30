import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/career.js';
import { groundOf, pitchOf, PITCH_TYPES } from '../js/grounds.js';
import { myClub, groundCondition } from '../js/teams.js';

const spec = { name: 'Harbour Kings', short: 'HAR', suit: '#1f5fd6', trim: '#ffd23f', emblem: 'bolt', ground: 'King Park', crest: 'x', chant: 'vipers', pitch: 'turner' };
const fresh = () => { const c = C.newCareer(11); assert.ok(C.createClub(c, spec, { trials: true })); return c; };

test('a new club starts with a worn ground, its chosen pitch and its chosen chant', () => {
  const c = fresh();
  assert.equal(C.groundCond(c), C.CARE.START); assert.equal(groundCondition(), C.CARE.START);
  assert.equal(myClub().chant, 'vipers');
  assert.equal(pitchOf(myClub().id).id, 'turner'); assert.equal(groundOf(myClub().id).pitch, PITCH_TYPES.turner);
  assert.equal(C.hasCaretaker(c), false);
});

test('a caretaker costs a fee and a weekly wage, and the ground gets better every week he is paid', () => {
  const c = fresh(); c.money = 1;
  assert.ok(C.hireCaretaker(c)); assert.equal(c.money, 0.9); assert.ok(!C.hireCaretaker(c), 'he cannot be hired twice');
  let last = C.groundCond(c);
  for (let w = 1; w <= 3; w++) {
    const notes = C.groundWeek(c);
    assert.ok(C.groundCond(c) > last, `week ${w} the ground improves`); last = C.groundCond(c);
    assert.ok(notes.some(n => n.includes('caretaker')));
  }
  assert.equal(c.money, 0.75, 'three weeks of wages');
  assert.ok(C.groundCond(c) >= 0.35, 'after three weeks it is visibly better');
  for (let w = 0; w < 12; w++) C.groundWeek(c);
  assert.equal(C.groundCond(c), 1, 'in the end it is in perfect order');
});

test('a caretaker who cannot be paid leaves, a ground without one goes back, and a club without one cannot hire him with no money', () => {
  const c = fresh(); c.money = 0;
  assert.ok(!C.hireCaretaker(c), 'no money for the fee');
  c.money = C.CARE.HIRE; assert.ok(C.hireCaretaker(c)); assert.equal(c.money, 0);
  const notes = C.groundWeek(c);
  assert.equal(C.hasCaretaker(c), false); assert.ok(notes.some(n => /could not pay/.test(n)));
  c.custom.cond = 0.5; C.groundWeek(c); assert.ok(C.groundCond(c) < 0.5, 'it slowly goes back');
  c.custom.cond = C.CARE.FLOOR; C.groundWeek(c); assert.equal(C.groundCond(c), C.CARE.FLOOR, 'but never below the floor');
  C.dismissCaretaker(c);
});

test('a club saved before the caretaker existed has a ground in full condition, and a week changes nothing', () => {
  const c = fresh(); delete c.custom.cond; delete c.custom.caretaker;
  assert.equal(C.groundCond(c), 1);
  assert.deepEqual(C.groundWeek(c), []);
  assert.equal(C.groundCond(c), 1);
});
