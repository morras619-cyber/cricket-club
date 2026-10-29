import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { KIT_SHEETS } from '../js/kitsheets.js';

// a WEBP's width and height are in its header (VP8X, VP8 or VP8L)
function webpSize(buf) {
  const type = buf.toString('ascii', 12, 16);
  if (type === 'VP8X') return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
  if (type === 'VP8L') { const b = buf.readUInt32LE(21); return [1 + (b & 0x3fff), 1 + ((b >> 14) & 0x3fff)]; }
  return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
}
const pngSize = buf => [buf.readUInt32BE(16), buf.readUInt32BE(20)];
const read = p => readFileSync(new URL(`../${p}`, import.meta.url));

test('the Pink Royals back view: 10 poses inside his sheet, the mask the same size, a print for each pose', () => {
  const m = KIT_SHEETS['royals-back'], [W, H] = m.size;
  assert.equal(m.frames.length, 10);
  assert.equal(m.place.length, 10);
  assert.deepEqual(webpSize(read('img/kit/royals-back.webp')), [W, H]);
  assert.deepEqual(pngSize(read('img/kit/royals-back-mask.png')), [W, H]);
  for (const [x, y, w, h, fx, fy] of m.frames) {
    assert.ok(x >= 0 && y >= 0 && x + w <= W && y + h <= H, `pose ${x},${y} ${w}x${h} is outside the ${W}x${H} sheet`);
    assert.ok(fx > 0 && fx < w && fy > h * 0.8 && fy < h, 'the feet are inside the pose, low down');
  }
  m.place.forEach(([x, y, w], i) => {
    const [fx, fy, fw, fh] = m.frames[i];
    assert.ok(x > fx && x < fx + fw && y > fy && y < fy + fh * 0.6 && w > 40 && w < 100, `pose ${i}: the print sits on the back`);
  });
  assert.ok(m.skin > 0.2 && m.skin < 0.95 && !m.tones && !m.hair.part, 'plain (no recolour), a skin reference, no hair layers');
});

test('Royals bowlers from behind draw from their own kit view; every other club still from the Thunder sheet', () => {
  const bow = readFileSync(new URL('../js/bowlsprite.js', import.meta.url), 'utf8');
  assert.match(bow, /KIT_VIEW\[view\] === 'back' && team\?\.id === 'royals' \? 'royals-back'/);
  const kit = readFileSync(new URL('../js/kitsprite.js', import.meta.url), 'utf8');
  assert.match(kit, /teamIds\.includes\('royals'\) \? \['royals-back'\]/);
  assert.ok(KIT_SHEETS.back && KIT_SHEETS.front, 'the Thunder sheets are still there');
});
