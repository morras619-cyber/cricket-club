import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// snd/crowd-sing.wav and crowd-boo.wav (tools/build_crowd_mood.py): the singing is long enough to carry a moment and is
// faded in and out (the recording was cut off at both ends); the boo is whole, ending on silence
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

test('the singing fades in, holds a steady level for seconds, and fades out', () => {
  const c = load('sing'), m = c.mono, rate = c.rate, mid = at(c, 4, 0.5);
  assert.ok(m.length / rate > 8, 'long enough for a victory song');
  assert.ok(mid > 0.08, 'a clear crowd');
  assert.ok(at(c, 0, 0.05) < mid * 0.3, 'it fades in, not a sudden start');
  for (const t of [1.5, 3, 5, 7]) assert.ok(at(c, t) > mid * 0.7 && at(c, t) < mid * 1.4, `a steady level at ${t}s`);
  assert.ok(at(c, m.length / rate - 0.1, 0.09) < mid * 0.1, 'it fades out, not cut off');
  assert.ok(Math.abs(m[0]) < 0.01 && Math.abs(m[m.length - 1]) < 0.01, 'starts and ends on silence');
});

test('the boo is whole: a clear boo that dies away to silence', () => {
  const c = load('boo'), m = c.mono, rate = c.rate;
  assert.ok(at(c, 0.2, 0.3) > 0.08, 'a clear boo');
  assert.ok(at(c, m.length / rate - 0.1, 0.09) < at(c, 0.3, 0.3) * 0.1, 'it dies away, not cut off');
  assert.ok(Math.abs(m[0]) < 0.01 && Math.abs(m[m.length - 1]) < 0.01, 'starts and ends on silence');
});

import { heat, RUNAWAY } from '../js/crowdheat.js';
test('the crowd heat: hit apart is a runaway for the home side, wickets hurt the home batters, an even start is neutral', () => {
  assert.equal(heat(['1', '0', '1'], false), 0, 'too early to judge');
  const hit = ['4', '4', '6', '4', '1', '6', '4', '4', '1', '6', '4', '4'];
  assert.ok(heat(hit, false) <= RUNAWAY, 'the visitors hitting them apart is a runaway');
  assert.ok(heat(hit, true) > 0.5, 'the same innings is the home side on top when they are the batters');
  assert.ok(heat(['1', 'W', '0', 'W', '1', '0', '0', '1'], true) < -0.3, 'the home batters losing wickets');
  assert.ok(heat(['1', 'W', '0', 'W', '1', '0', '0', '1'], false) > 0.3, 'and the home bowlers on top');
  assert.ok(Math.abs(heat(['1', '0', '2', '1', '1', '0', '2', '1'], false)) < 0.4, 'an ordinary spell is near neutral');

});

test('the extra boos are whole and match the first boo in loudness', () => {
  const peakRms = c => { let m = 0; for (let t = 0; t + 0.25 < c.mono.length / c.rate; t += 0.1) m = Math.max(m, at(c, t, 0.25)); return m; };
  const ref = peakRms(load('boo'));
  for (const n of ['boo2', 'boo3']) {
    const c = load(n), m = c.mono;
    assert.ok(Math.abs(peakRms(c) / ref - 1) < 0.15, `${n} is as loud as the first boo`);
    assert.ok(Math.abs(m[0]) < 0.01 && Math.abs(m[m.length - 1]) < 0.01, `${n} starts and ends on silence`);
    assert.ok(at(c, m.length / c.rate - 0.1, 0.09) < ref * 0.1, `${n} dies away, not cut off`);
  }
});
