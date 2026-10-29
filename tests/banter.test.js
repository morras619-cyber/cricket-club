import test from 'node:test';
import assert from 'node:assert/strict';
import { LINES, line, allLines } from '../js/banter.js';
import { makeRng } from '../js/rng.js';

test('there are at least 800 different things to say', () => {
  assert.ok(allLines().length >= 800, `only ${allLines().length}`);
});

test('every group has plenty, and every line fits a speech bubble', () => {
  for (const [group, g] of Object.entries(LINES)) {
    const list = Array.isArray(g) ? g : Object.values(g).flat();
    assert.ok(list.length >= 20, `${group} has ${list.length}`);
    for (const l of list) {
      assert.equal(typeof l, 'string');
      assert.ok(l.length > 0 && l.length <= 70, `${group}: "${l}" is ${l.length} long`);
      assert.equal(l, l.trim());
    }
  }
});

test('no line is said twice within a group', () => {
  for (const [group, g] of Object.entries(LINES)) {
    const list = Array.isArray(g) ? g : Object.values(g).flat();
    const dup = list.filter((l, i) => list.indexOf(l) !== i);
    assert.deepEqual(dup, [], `${group} repeats ${dup.join(' | ')}`);
  }
});

test('the lines are clean: no swearing, no unkind words', () => {
  const bad = /\b(damn|hell|crap|shit|fuck|bastard|bitch|idiot|stupid|dumb|ugly|fat|loser|hate you)\b/i;
  for (const l of allLines()) assert.ok(!bad.test(l), l);
});

test('the same line does not come round again soon', () => {
  const rng = makeRng(3);
  const seen = [];
  for (let i = 0; i < 30; i++) seen.push(line('sendoff', null, rng));
  assert.equal(new Set(seen).size, 30, 'thirty in a row, all different');
});

test('a hero\'s own lines still come with the general ones', () => {
  const rng = makeRng(5);
  const many = new Set();
  for (let i = 0; i < 400; i++) many.add(line('sledge', 'zara', rng));
  assert.ok([...many].some(l => LINES.sledge.zara.includes(l)));
  assert.ok([...many].some(l => LINES.sledge.generic.includes(l)));
});
