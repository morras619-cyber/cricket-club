import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// snd/boundary-cheer.wav (tools/build_boundary_cheer.py) is one clip: the build-up running into the cheer. It must
// rise from near silence with no dip, hold, and end faded out (not cut off), and the join must not be a jump
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
  const n = data.length / 2 / fmt.ch, mono = new Float64Array(n), step = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let v = 0, big = 0;
    for (let c = 0; c < fmt.ch; c++) { const x = data.readInt16LE((i * fmt.ch + c) * 2) / 32768; v += x; if (i) big = Math.max(big, Math.abs(x - data.readInt16LE(((i - 1) * fmt.ch + c) * 2) / 32768)); }
    mono[i] = v / fmt.ch; step[i] = big;
  }
  return { ...fmt, mono, step };
}
const rms = (x, a, b) => { let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / (b - a)); };

test('the boundary cheer builds from near silence into a steady roar with no dip', () => {
  const { mono: m, rate } = readWav(new URL('../snd/boundary-cheer.wav', import.meta.url));
  const w = Math.floor(rate * 0.2), at = t => rms(m, Math.floor(t * rate), Math.floor(t * rate) + w);
  const roar = at(4.5);
  assert.ok(roar > 0.15, 'a roar');
  assert.ok(at(0.2) < roar * 0.15, 'it starts near silence');
  // no dip across the join (the build-up ending ~3 s): each 0.2 s is no quieter than 75% of the one before
  for (let t = 0.2; t <= 3.6; t += 0.2) assert.ok(at(t) > at(t - 0.2) * 0.75, `no drop in level at ${t.toFixed(1)}s`);
  assert.ok(at(2.9) > roar * 0.35 && at(2.9) < roar, 'it meets the roar part-way up, not at the top');
  for (const t of [4.0, 5.0, 5.5]) assert.ok(at(t) > roar * 0.7, `still roaring at ${t}s`);
});

test('the join is not a jump, and the clip ends faded out, not cut off', () => {
  const { mono: m, step, rate } = readWav(new URL('../snd/boundary-cheer.wav', import.meta.url));
  assert.ok(m.length / rate > 7, 'the recordings stopped at 3 s each: it now runs on');
  const maxStep = (a, b) => { let x = 0; for (let i = Math.floor(a * rate); i < Math.floor(b * rate); i++) x = Math.max(x, step[i]); return x; };
  assert.ok(maxStep(2.6, 3.4) < maxStep(4, 5) * 1.3, 'the largest sample-to-sample step at the join is no bigger than in the steady roar');
  const w = Math.floor(rate * 0.1);
  assert.ok(rms(m, m.length - w, m.length) < rms(m, Math.floor(4.5 * rate), Math.floor(4.7 * rate)) * 0.1, 'faded out at the end');
  assert.ok(Math.abs(m[m.length - 1]) < 0.01, 'ends on silence');
});
