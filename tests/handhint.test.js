import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FRAMES } from '../js/handhint.js';

// img/ui/hands.webp: a WEBP's width and height are in its header (VP8X, VP8 or VP8L)
function webpSize(buf) {
  const type = buf.toString('ascii', 12, 16);
  if (type === 'VP8X') return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
  if (type === 'VP8L') { const b = buf.readUInt32LE(21); return [1 + (b & 0x3fff), 1 + ((b >> 14) & 0x3fff)]; }
  return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
}

test('the hand pictures: four frames inside the sheet, each fingertip inside its frame', () => {
  const [W, H] = webpSize(readFileSync(new URL('../img/ui/hands.webp', import.meta.url)));
  assert.equal(FRAMES.length, 4);
  for (const [x, y, w, h, tx, ty] of FRAMES) {
    assert.ok(x >= 0 && y >= 0 && x + w <= W && y + h <= H, `frame ${x},${y} ${w}x${h} outside the ${W}x${H} sheet`);
    assert.ok(tx > 0 && tx < w && ty >= 0 && ty < h, 'the fingertip is inside its frame');
    assert.ok(ty < h / 2, 'the fingertip of a hand pointing up is in its top half');
  }
});

test('the tutorial steps that use a hand give it screen positions as shares of the screen', () => {
  const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  const hands = [...src.matchAll(/hand: \{ kind: '(swipe|tap)'([^}]*)\}/g)];
  assert.ok(hands.length >= 2, 'the swipe and the tap are in the tutorial');
  for (const [, , body] of hands) for (const n of body.match(/[0-9.]+/g)) assert.ok(+n >= 0 && +n <= 1, `${n} is not a share of the screen`);
});
