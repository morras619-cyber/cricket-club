import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// snd/boundary-build.wav (the crowd getting to its feet) and snd/boundary-cheer.wav (the roar), built by
// tools/build_boundary_cheer.py, must be long enough to carry a cheer and must end faded out, not cut off
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
const rms = (x, a, b) => { let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / (b - a)); };

test('the boundary build-up starts quiet, rises, runs on past the recording\'s 3 s, and fades out', () => {
  const { mono: m, rate } = readWav(new URL('../snd/boundary-build.wav', import.meta.url));
  assert.ok(m.length / rate > 4, 'the recording stops at 3 s while still rising: it now runs on');
  const w = Math.floor(rate * 0.3), at = t => rms(m, Math.floor(t * rate), Math.floor(t * rate) + w);
  assert.ok(at(2.6) > at(0.4) * 4, 'rising');
  assert.ok(at(3.4) > at(2.6) * 0.6, 'still a crowd after the point the recording stopped');
  assert.ok(rms(m, m.length - Math.floor(rate * 0.1), m.length) < at(3.0) * 0.2, 'faded out at the end');
  assert.ok(Math.abs(m[m.length - 1]) < 0.01, 'ends on silence');
});

test('the boundary roar is long, full for seconds, and fades out before it ends', () => {
  const { mono: m, rate } = readWav(new URL('../snd/boundary-cheer.wav', import.meta.url));
  assert.ok(m.length / rate > 4.5, 'the clip was cut off at 3 s: it now runs on');
  const w = Math.floor(rate * 0.3), at = t => rms(m, Math.floor(t * rate), Math.floor(t * rate) + w);
  const full = at(1.5);
  assert.ok(full > 0.1, 'a roar, not a murmur');
  for (const t of [1.0, 2.0, 2.5, 3.0]) assert.ok(at(t) > full * 0.6, `still roaring at ${t}s`);
  assert.ok(rms(m, m.length - w, m.length) < full * 0.1, 'faded out at the end, not cut off');
  assert.ok(Math.abs(m[m.length - 1]) < 0.01, 'ends on silence');
});
