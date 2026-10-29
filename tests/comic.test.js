import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { OPENING } from '../js/comic.js';

test('the story opening: five panels, each with its picture and something to read', () => {
  assert.equal(OPENING.length, 5);
  for (const p of OPENING) {
    assert.ok(existsSync(new URL(`../${p.img}`, import.meta.url)), p.img);
    assert.ok(p.beats.length, `${p.img} has no beats`);
    for (const b of p.beats) {
      assert.ok(b.say || b.msg || b.sfx, `${p.img} has an empty beat`);
      if (b.msg) assert.ok(b.msg.who && b.msg.text, `${p.img} message`);
    }
  }
});
