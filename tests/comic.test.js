import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { OPENING, NIGHT, EXIT } from '../js/comic.js';

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

test('the night scene: three pictures, the fans first and the coach\'s message last', () => {
  assert.equal(NIGHT.length, 3);
  for (const p of NIGHT) {
    assert.ok(existsSync(new URL(`../${p.img}`, import.meta.url)), p.img);
    for (const b of p.beats) assert.ok(b.say || b.msg || b.fan, `${p.img} has an empty beat`);
  }
  const fans = NIGHT.flatMap(p => p.beats).filter(b => b.fan);
  assert.ok(fans.length >= 4);
  for (const f of fans) assert.ok(f.fan.name && f.fan.handle && f.fan.text && f.fan.face, 'a fan has a name, a handle, a face and words');
  assert.match(NIGHT[2].beats[0].msg.text, /cut from the team, effective immediately/);
});

test('the way out: ten pictures, each with something said, and every speaker\'s mouth on the picture', () => {
  assert.equal(EXIT.length, 10);
  for (const p of EXIT) {
    assert.ok(existsSync(new URL(`../${p.img}`, import.meta.url)), p.img);
    assert.ok(p.beats.length);
    for (const b of p.beats) {
      assert.ok(b.say || b.fan, `${p.img} has an empty beat`);
      if (b.say) { assert.ok(b.mouth?.length === 2 && b.at, `${p.img}: ${b.say}`); assert.ok(b.mouth.every(v => v > 0 && v < 1)); }
    }
  }
});
