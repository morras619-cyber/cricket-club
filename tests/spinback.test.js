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

test('the spinner from behind: 12 poses inside his sheet, the mask the same size, a standing height', () => {
  const m = KIT_SHEETS['spin-back'], [W, H] = m.size;
  assert.equal(m.frames.length, 12);
  assert.deepEqual(webpSize(readFileSync(new URL('../img/kit/spin-back.webp', import.meta.url))), [W, H]);
  assert.deepEqual(pngSize(readFileSync(new URL('../img/kit/spin-back-mask.png', import.meta.url))), [W, H]);
  for (const [x, y, w, h, fx, fy] of m.frames) {
    assert.ok(x >= 0 && y >= 0 && x + w <= W && y + h <= H, `pose ${x},${y} ${w}x${h} is outside the ${W}x${H} sheet`);
    assert.ok(fx > 0 && fx < w && fy > h / 2 && fy < h, 'the feet are inside the pose, low down');
  }
  // refPx is the standing pose's height: about the figure's own height, not a stray number
  assert.ok(Math.abs(m.refPx - m.frames[10][3]) < 20, 'refPx matches the standing pose');
  // a plain kit (the club's colours come from the suit and trim shading), no hair or print yet
  assert.ok(!m.tones && m.suit.length === 3 && m.trim.length === 3 && m.skin > 0);
  assert.deepEqual(m.place, []);
});

test('every game frame the spinner can show maps to a pose in his sheet', () => {
  const src = readFileSync(new URL('../js/kitsprite.js', import.meta.url), 'utf8');
  const body = src.match(/const POSE_SPIN_BACK = \{([^}]*)\}/)[1];
  const map = Object.fromEntries([...body.matchAll(/(\w+):\s*(\d+)/g)].map(([, k, v]) => [k, +v]));
  const need = ['start', 'run1', 'run2', 'run3', 'gather', 'coil', 'frontarm', 'release', 'follow1', 'follow2', 'follow3', 'finish', 'field', 'react', 'celebrate1', 'celebrate2'];
  for (const f of need) assert.ok(map[f] >= 0 && map[f] < KIT_SHEETS['spin-back'].frames.length, `${f} has no pose`);
  const bow = readFileSync(new URL('../js/bowlsprite.js', import.meta.url), 'utf8');
  assert.match(bow, /'spin-back': 'spin-back'/, 'the spinner from behind draws from his own kit sheet');
});

test('the standing poses (start, finish, field) are standing: as tall as the figure, not a stride', () => {
  const m = KIT_SHEETS['spin-back'];
  for (const i of [10, 11]) assert.ok(m.frames[i][3] >= m.refPx, `pose ${i} is a standing height`);
});
