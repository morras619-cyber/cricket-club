import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// snd/crowd-loop.wav (tools/build_crowd_loop.py) is the match's crowd bed: it loops, so its last
// sample must run straight into its first (the source recording faded out, which was heard as a stop)
function readWav(path) {
  const b = readFileSync(path);
  assert.equal(b.toString('ascii', 0, 4), 'RIFF');
  assert.equal(b.toString('ascii', 8, 12), 'WAVE');
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
const rms = (x, a, b) => { let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / (b - a)); };

test('the crowd loop wraps with no jump and no dip in level', () => {
  const { mono: m, rate } = readWav(new URL('../snd/crowd-loop.wav', import.meta.url));
  assert.ok(m.length / rate > 1.5, 'long enough to loop');
  let steps = 0, big = 0;
  for (let i = 1; i < m.length; i++) { const d = Math.abs(m[i] - m[i - 1]); steps += d; big = Math.max(big, d); }
  const typical = steps / (m.length - 1), seam = Math.abs(m[0] - m[m.length - 1]);
  assert.ok(seam < big, `the jump at the wrap (${seam.toFixed(4)}) is no bigger than the loop's own steps (${big.toFixed(4)})`);
  const w = Math.floor(rate * 0.2), before = rms(m, m.length - w, m.length), after = rms(m, 0, w), whole = rms(m, 0, m.length);
  for (const [name, v] of [['before', before], ['after', after]]) assert.ok(Math.abs(v - whole) / whole < 0.25, `the level just ${name} the wrap is the loop's level`);
  assert.ok(typical < 0.05);
});
