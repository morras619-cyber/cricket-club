import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// snd/crowd-{ohh,hoo,wicket}.wav (tools/build_bowling_crowd.py): the build-up rises and is carried on past its 3 s
// recording, fading out; the hoo and the wicket cheer start and end on silence and are not cut off
function readWav(path) {
  const b = readFileSync(path);
  assert.equal(b.toString('ascii', 0, 4), 'RIFF');
  let o = 12, fmt = null, data = null;
  while (o + 8 <= b.length) {
    const id = b.toString('ascii', o, o + 4), len = b.readUInt32LE(o + 4);
    if (id === 'fmt ') fmt = { ch: b.readUInt16LE(o + 10), rate: b.readUInt32LE(o + 12), bits: b.readUInt16LE(o + 22) };
    if (id === 'data') data = b.subarray(o + 8, o + 8 + len);
    o += 8 + len + (len & 1);
  }
  assert.equal(fmt.bits, 16);
  const n = data.length / 2 / fmt.ch, mono = new Float64Array(n);
  for (let i = 0; i < n; i++) { let v = 0; for (let c = 0; c < fmt.ch; c++) v += data.readInt16LE((i * fmt.ch + c) * 2) / 32768; mono[i] = v / fmt.ch; }
  return { ...fmt, mono };
}
const load = n => readWav(new URL(`../snd/crowd-${n}.wav`, import.meta.url));
const rms = (x, a, b) => { let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / (b - a)); };
const at = ({ mono, rate }, t, d = 0.2) => rms(mono, Math.floor(t * rate), Math.floor((t + d) * rate));

test('the build-up rises from near silence and fades away at the end (it is not dragged out)', () => {
  const c = load('ohh'), m = c.mono, rate = c.rate;
  assert.ok(m.length / rate > 3.2 && m.length / rate < 4.6, 'the 3 s recording and a short fade, not a long hold');
  assert.ok(at(c, 0.1) < at(c, 2.6) * 0.15, 'it starts near silence');
  for (let t = 0.2; t <= 2.8; t += 0.2) assert.ok(at(c, t) > at(c, t - 0.2) * 0.8, `rising at ${t.toFixed(1)}s`);
  assert.ok(at(c, m.length / rate - 0.1, 0.09) < at(c, 2.6) * 0.1, 'faded out at the end');
  assert.ok(Math.abs(m[m.length - 1]) < 0.01 && Math.abs(m[0]) < 0.01, 'starts and ends on silence');
});

test('the hoo and the wicket cheer are whole: they start and end on silence', () => {
  for (const n of ['hoo', 'wicket']) {
    const c = load(n), m = c.mono, rate = c.rate;
    assert.ok(m.length / rate > 2.5, `${n} runs its length`);
    assert.ok(at(c, 0.3, 0.3) > 0.08, `${n} is a clear sound`);
    assert.ok(Math.abs(m[0]) < 0.01 && Math.abs(m[m.length - 1]) < 0.01, `${n} starts and ends on silence`);
    assert.ok(at(c, m.length / rate - 0.1, 0.09) < at(c, 0.4, 0.2) * 0.1, `${n} dies away at the end, it is not cut off`);
  }
});
