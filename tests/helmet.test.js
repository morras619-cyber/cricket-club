import test from 'node:test';
import assert from 'node:assert/strict';
import { gearBonus, SHOP } from '../js/career.js';
import { lookOf } from '../js/looks.js';

test('the helmet a player carries is drawn on him: it goes with his gear bonus, and into his look', () => {
  const c = { club: 'x', players: { p1: { id: 'p1', team: 'x' }, p2: { id: 'p2', team: 'x' } }, shop: { gear: [
    { id: 1, item: 'helm3', uses: 5, on: 'p1' }, { id: 2, item: 'blaster', uses: 5, on: 'p2' }, { id: 3, item: 'helm2', uses: 0, on: 'p2' }] } };
  const b = gearBonus(c);
  assert.equal(b.get('p1').helmet, 'helm3');
  assert.equal(b.get('p1').bat, SHOP.GEAR.helm3.bat);
  assert.equal(b.get('p2').helmet, undefined, 'a bat is not a helmet, and a worn-out helmet is gone');
  assert.equal(lookOf({ id: 'p1', name: 'Test One', helmet: 'helm3' }).helmet, 'helm3');
  assert.equal(lookOf({ id: 'p2', name: 'Test Two' }).helmet, null);
});
