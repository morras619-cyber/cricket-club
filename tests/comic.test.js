import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { OPENING } from '../js/comic.js';

test('the story opening: four panels, each with its picture and something to read', () => {
  assert.equal(OPENING.length, 4);
  for (const p of OPENING) {
    assert.ok(existsSync(new URL(`../${p.img}`, import.meta.url)), p.img);
    assert.ok(p.cap || p.say || p.msg || p.sfx, `${p.img} has no text`);
    for (const k of ['say', 'msg']) if (p[k]) assert.ok(p[k].who && p[k].text, `${p.img} ${k}`);
  }
});
