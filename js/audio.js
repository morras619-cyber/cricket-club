// Synthesised sound effects (no audio files to download). Starts on the first user gesture.
let ac = null, master = null, noiseBuf = null;
export const sound = { on: true, haptics: true };

export function unlockAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain();
  master.gain.value = 0.55;
  master.connect(ac.destination);
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
}

function ready() { return ac && sound.on; }

function tone(freq, dur, { type = 'sine', gain = 0.3, to = null, delay = 0 } = {}) {
  if (!ready()) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur, { gain = 0.3, freq = 1200, q = 0.8, type = 'bandpass', delay = 0, attack = 0.002 } = {}) {
  if (!ready()) return;
  const t = ac.currentTime + delay;
  const src = ac.createBufferSource(); src.buffer = noiseBuf;
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
}

export const sfx = {
  bat(grade) {
    const strong = grade === 'perfect';
    noise(0.09, { gain: strong ? 0.9 : 0.5, freq: strong ? 1800 : 2600, q: 2 });
    tone(strong ? 90 : 140, strong ? 0.25 : 0.12, { type: 'sine', gain: strong ? 0.7 : 0.3, to: 50 });
  },
  thin() { noise(0.05, { gain: 0.35, freq: 3800, q: 4 }); },
  zing(level) { tone(500 + level * 9, 0.12, { type: 'triangle', gain: 0.18, to: 900 + level * 12 }); },
  dhol() { tone(120, 0.35, { gain: 0.8, to: 60 }); noise(0.12, { gain: 0.4, freq: 300, q: 1 }); },
  full() { this.dhol(); [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, { type: 'sawtooth', gain: 0.1, delay: 0.08 * i })); },
  stumps() { noise(0.25, { gain: 0.8, freq: 900, q: 1.2 }); tone(220, 0.2, { type: 'square', gain: 0.15, to: 80 }); },
  glove() { noise(0.12, { gain: 0.7, freq: 400, q: 1 }); tone(110, 0.15, { gain: 0.6, to: 60 }); },
  trombone() { [392, 370, 349, 262].forEach((f, i) => tone(f, i === 3 ? 0.6 : 0.22, { type: 'sawtooth', gain: 0.12, delay: i * 0.22, to: i === 3 ? 220 : null })); },
  crowd(intensity = 1) { if (ac && ac.currentTime < roarUntil) return; /* (the boundary roar is the crowd) */ noise(1.6 * intensity, { gain: 0.25 * intensity, freq: 900, q: 0.4, attack: 0.25 }); },
  whoosh() { noise(0.35, { gain: 0.4, freq: 600, q: 0.6, type: 'lowpass', attack: 0.1 }); },
  boom() { tone(70, 0.8, { gain: 0.9, to: 30 }); noise(0.6, { gain: 0.6, freq: 200, q: 0.5, type: 'lowpass' }); },
  zap() { tone(1400, 0.18, { type: 'sawtooth', gain: 0.18, to: 200 }); noise(0.15, { gain: 0.3, freq: 4000, q: 3 }); },
  click() { tone(800, 0.04, { type: 'square', gain: 0.08 }); },
  sizzle() { noise(0.3, { gain: 0.15, freq: 5000, q: 2 }); },
  wicket() { this.stumps(); [659, 784, 988].forEach((f, i) => tone(f, 0.18, { type: 'square', gain: 0.1, delay: 0.15 + i * 0.1 })); },
};

// A buzz: pattern is ms (or [on, off, on, ...]). iPhones have no navigator.vibrate, but Safari
// (iOS 18 on) gives a haptic tick when a switch is toggled: one tick for each 'on' in the pattern.
let iosSwitch = null;
function iosTick() {
  if (!iosSwitch) {
    const label = document.createElement('label'), box = document.createElement('input');
    box.type = 'checkbox'; box.setAttribute('switch', ''); box.tabIndex = -1;
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;left:-99px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden';
    label.append(box); document.body.append(label);
    iosSwitch = label;
  }
  iosSwitch.click();
}
// ---------- a four or a six: the crowd's build-up and roar ----------
// snd/boundary-build.wav (a crowd getting to its feet) plays from the moment the ball is struck, timed to
// reach its height as the ball clears the rope; snd/boundary-cheer.wav (tools/build_boundary_cheer.py: the
// roar, carried on and faded out so it no longer stops mid-cheer) plays when the ball clears the rope.
let cheerBufs = null, cheerLoading = null, building = null, roarUntil = 0;
function loadCheer() {
  if (!cheerLoading) {
    const get = n => fetch(`snd/${n}.wav`).then(r => r.arrayBuffer()).then(b => new Promise((ok, no) => ac.decodeAudioData(b, ok, no)));
    cheerLoading = Promise.all([get('boundary-build'), get('boundary-cheer')]).then(([build, cheer]) => (cheerBufs = { build, cheer })).catch(() => { cheerLoading = null; return null; });
  }
  return cheerLoading;
}
// the crowd rises as the ball flies: the recording (3 s, rising to its end, then carried on) is started part-way
// in, so that its rise ends just as the ball clears the rope, `sec` seconds on (a flight over 3 s starts it at the beginning).
const BUILD_RISE = 3.0;
export function cheerBuild(sec) {
  cheerStop(0.15);
  if (!ready()) return;
  if (!cheerBufs) { loadCheer(); return; }
  const t = ac.currentTime, buf = cheerBufs.build, from = Math.min(BUILD_RISE - 0.3, Math.max(0, BUILD_RISE - sec));
  const bus = ac.createGain(), src = ac.createBufferSource();
  bus.gain.setValueAtTime(0.0001, t); bus.gain.linearRampToValueAtTime(2, t + 0.12);
  src.buffer = buf; src.connect(bus).connect(master); src.start(t, from); // (it ends itself, faded out, if the ball never clears)
  building = { bus, srcs: [src] };
}
export function cheerStop(fade = 0.3) {
  if (!building || !ac) return;
  const { bus, srcs } = building; building = null;
  const t = ac.currentTime;
  bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.linearRampToValueAtTime(0.0001, t + fade);
  for (const s of srcs) { try { s.stop(t + fade + 0.05); } catch { /* already stopped */ } }
  setTimeout(() => bus.disconnect(), (fade + 0.3) * 1000);
}
// the roar: the ball is over the rope (power: 1 a four, 1.25 a six, 1.4 a perfect six)
export function cheerFull(power = 1.25) {
  cheerStop(0.3);
  if (!ready()) return;
  if (!cheerBufs) { loadCheer(); return; }
  const t = ac.currentTime, src = ac.createBufferSource(), g = ac.createGain();
  src.buffer = cheerBufs.cheer; g.gain.value = power; src.connect(g).connect(master); src.start(t);
  roarUntil = t + cheerBufs.cheer.duration;
}
// a short burst of music under the roar: brass-like notes up to a held chord (a six: longer, with drums)
const STING = {
  four: { notes: [196, 247, 294, 392], gap: 0.13, chord: [196, 247, 294], hold: 0.6, drums: [] },
  six: { notes: [262, 330, 392, 523, 392, 523, 659], gap: 0.11, chord: [262, 330, 392, 523], hold: 1.0, drums: [0, 0.44, 0.88] },
};
export function sting(kind = 'four') {
  if (!ready()) return;
  const k = STING[kind] || STING.four;
  k.drums.forEach(d => { tone(110, 0.3, { gain: 0.4, to: 55, delay: d }); noise(0.1, { gain: 0.18, freq: 300, q: 1, delay: d }); });
  k.notes.forEach((f, i) => tone(f, 0.22, { type: 'triangle', gain: 0.1, delay: i * k.gap })); // (low and soft: a high sawtooth reads as a whistle)
  const at = k.notes.length * k.gap;
  k.chord.forEach(f => { tone(f, k.hold, { type: 'triangle', gain: 0.07, delay: at }); tone(f / 2, k.hold, { type: 'sine', gain: 0.08, delay: at }); });
}

// ---------- the match's crowd bed ----------
// A low crowd murmur under the whole match (snd/crowd-loop.wav, tools/build_crowd_loop.py: made to
// loop with no seam). Two copies play at once, the second a little slower, so the short loop's
// repeats never line up and no pattern is heard. It follows the Sound setting.
const AMBIENCE = [{ rate: 1, gain: 0.8 }, { rate: 0.89, gain: 0.5 }];
let ambBuf = null, ambLoading = null, amb = null, ambRun = 0;
function loadAmbience() {
  if (!ambLoading) {
    ambLoading = fetch('snd/crowd-loop.wav').then(r => r.arrayBuffer()).then(b => new Promise((ok, no) => ac.decodeAudioData(b, ok, no)))
      .then(buf => (ambBuf = buf)).catch(() => { ambLoading = null; return null; });
  }
  return ambLoading;
}
export function startAmbience() {
  stopAmbience();
  if (!ready()) return;
  const run = ++ambRun;
  loadCheer();
  loadAmbience().then(buf => {
    if (!buf || run !== ambRun || !ready()) return; // (stopped, or muted, while it loaded)
    const bus = ac.createGain(), t = ac.currentTime;
    bus.gain.setValueAtTime(0.0001, t); bus.gain.linearRampToValueAtTime(1, t + 1.5);
    bus.connect(master);
    const srcs = AMBIENCE.map(({ rate, gain }, i) => {
      const src = ac.createBufferSource(), g = ac.createGain();
      src.buffer = buf; src.loop = true; src.playbackRate.value = rate; g.gain.value = gain;
      src.connect(g).connect(bus);
      src.start(0, i * buf.duration * 0.37);   // (the copies start at different places in it)
      return src;
    });
    amb = { bus, srcs };
  });
}
export function stopAmbience() {
  ambRun++;
  if (!amb) return;
  const { bus, srcs } = amb; amb = null;
  const t = ac.currentTime;
  bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.linearRampToValueAtTime(0.0001, t + 0.5);
  for (const s of srcs) s.stop(t + 0.55);
  setTimeout(() => bus.disconnect(), 700);
}

export function buzz(pattern) {
  if (!sound.haptics) return;
  try {
    if (navigator.vibrate) { navigator.vibrate(pattern); return; }
    const p = Array.isArray(pattern) ? pattern : [pattern];
    let t = 0;
    p.forEach((ms, i) => { if (i % 2 === 0) setTimeout(iosTick, t); t += ms; });
  } catch { /* not allowed here */ }
}
