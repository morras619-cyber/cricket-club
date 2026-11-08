// Touch calibration. Every phone has its own delay between a finger touching the screen and the game seeing it, and between the game drawing something and the screen showing it
// (a budget Android phone can add 40 to 100 ms). The batting windows are tight, so the game measures it: a ring closes on a ball on a steady beat, the player taps as it
// closes (the same thing as meeting the ball), and the median distance between the taps and the beats is that phone's offset. The batting timing then takes it off.
// Pure maths here (calibrationOffset); the screen and the loop are runCalibration.
export const CAL = { warm: 4, beats: 12, gapMs: 720, windowMs: 340, minMs: -120, maxMs: 250, minTaps: 8, steadyMs: 60 };

const median = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; };

// taps, beats: times in ms on one clock. Each beat takes the first tap within windowMs of it; the offset is the median of tap - beat (positive: the taps land late),
// its spread the robust standard deviation of those. ok: enough taps and steady enough to trust.
export function calibrationOffset(taps, beats, windowMs = CAL.windowMs) {
  const diffs = [];
  const used = new Set();
  for (const b of beats) {
    let best = null;
    taps.forEach((t, i) => { if (!used.has(i) && Math.abs(t - b) <= windowMs && (best === null || Math.abs(t - b) < Math.abs(taps[best] - b))) best = i; });
    if (best !== null) { used.add(best); diffs.push(taps[best] - b); }
  }
  const m = median(diffs), mad = median(diffs.map(d => Math.abs(d - m))), spread = 1.4826 * mad;
  const offset = Math.round(Math.max(CAL.minMs, Math.min(CAL.maxMs, m)));
  return { offset, spread: Math.round(spread), n: diffs.length, ok: diffs.length >= CAL.minTaps && spread <= CAL.steadyMs, raw: Math.round(m) };
}

// Runs the screen: el = { stage, ring, ball, count, say } (elements); done(result) at the end. Returns { stop }.
export function runCalibration(el, done) {
  const total = CAL.warm + CAL.beats, start = performance.now() + 1100, beats = Array.from({ length: total }, (_, i) => start + i * CAL.gapMs), taps = [];
  let raf = 0, stopped = false, finished = false;
  const onTap = e => { e.preventDefault(); if (!finished) taps.push(e.timeStamp); };
  el.stage.addEventListener('pointerdown', onTap);
  el.say.textContent = 'Tap the ball just as the ring closes on it';
  const frame = () => {
    if (stopped) return;
    const now = performance.now();
    const k = (now - start) / CAL.gapMs, i = Math.floor(k);       // i: the beat that has just gone, k - i how far to the next
    if (i >= total) {
      if (!finished && now > beats[total - 1] + 600) {
        finished = true;
        const res = calibrationOffset(taps.filter(t => t >= beats[CAL.warm] - CAL.windowMs), beats.slice(CAL.warm));
        el.stage.removeEventListener('pointerdown', onTap);
        el.ring.style.opacity = '0';
        done(res);
        return;
      }
    } else if (now >= start - CAL.gapMs) {
      const f = k < 0 ? 1 + k : k - i;               // 0 just after a beat, nearing 1 at the next one
      el.ring.style.opacity = i < total - 1 || k < 0 ? '1' : '0';
      el.ring.style.transform = `scale(${(2.6 - 1.6 * f).toFixed(3)})`;
      el.ball.style.transform = f < 0.12 ? 'scale(1.12)' : 'scale(1)';
      el.count.textContent = i >= CAL.warm ? `${Math.min(CAL.beats, i - CAL.warm + 1)} / ${CAL.beats}` : 'warm up';
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return { beats, stop() { stopped = true; cancelAnimationFrame(raf); el.stage.removeEventListener('pointerdown', onTap); } };
}
