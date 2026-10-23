import test from 'node:test';
import assert from 'node:assert/strict';
import { discoColors } from '../js/disco.js';
import { TEAMS } from '../js/teams.js';

const team = id => TEAMS.find(t => t.id === id);
const hex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');

test('a club\'s disco lights are mostly its own suit colour', () => {
  const [a, b] = discoColors(team('thunder'));
  assert.equal(hex(a), team('thunder').suit);
  assert.equal(hex(b), team('thunder').suit);   // (two beams in three are the suit)
});

test('a dark suit is left out so the lights still show', () => {
  const colors = discoColors(team('vipers'));       // black suit, red trim
  assert.equal(hex(colors[0]), team('vipers').trim);
  assert.equal(hex(colors[1]), team('vipers').trim);   // (the third is a paler shade of it)
});

test('every club gets lights bright enough to see', () => {
  for (const t of TEAMS) {
    const cs = discoColors(t);
    assert.ok(cs.length >= 3);
    for (const [r, g, b] of cs) assert.ok(0.3 * r + 0.59 * g + 0.11 * b >= 70, t.id);
  }
});
