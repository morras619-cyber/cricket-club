import test from 'node:test';
import assert from 'node:assert/strict';
import { calibrationOffset, CAL } from '../js/calibrate.js';

const beats = Array.from({ length: 12 }, (_, i) => 1000 + i * 720);
const jitter = [0, 9, -7, 12, -11, 5, -3, 8, -9, 4, 10, -6];

test('taps a steady 80 ms late give an offset of about 80 ms, and are trusted', () => {
  const r = calibrationOffset(beats.map((b, i) => b + 80 + jitter[i]), beats);
  assert.ok(Math.abs(r.offset - 80) <= 4, `${r.offset}`);
  assert.equal(r.n, 12); assert.equal(r.ok, true);
});
test('taps ahead of the beat give a negative offset', () => {
  assert.ok(calibrationOffset(beats.map((b, i) => b - 35 + jitter[i]), beats).offset < -25);
});
test('a stray tap or two does not move the answer, and a double tap counts once', () => {
  const taps = beats.map((b, i) => b + 60 + jitter[i]); taps.splice(3, 0, beats[3] + 400, beats[3] + 70);
  const r = calibrationOffset(taps, beats);
  assert.ok(Math.abs(r.offset - 60) <= 6); assert.equal(r.n, 12);
});
test('uneven or missing taps are not trusted, and the offset is kept within sane bounds', () => {
  const wild = beats.map((b, i) => b + (i % 2 ? 150 : -120));
  assert.equal(calibrationOffset(wild, beats).ok, false);
  assert.equal(calibrationOffset(beats.slice(0, 5).map(b => b + 40), beats).ok, false, 'too few taps');
  assert.equal(calibrationOffset(beats.map(b => b + 330), beats, 400).offset, CAL.maxMs);
});
