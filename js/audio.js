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
  crowd(intensity = 1) { if (ac && ac.currentTime < roarUntil) return; /* (the boundary cheer is the crowd) */ noise(1.6 * intensity, { gain: 0.25 * intensity, freq: 900, q: 0.4, attack: 0.25 }); },
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
// ---------- a four or a six: the crowd builds as the ball flies, then roars ----------
// snd/boundary-cheer.wav (tools/build_boundary_cheer.py) is one continuous clip: a crowd rising from near
// silence, running into a full cheer that holds and fades out. CUE is the moment in it that the ball clears
// the rope. It is started CUE seconds before that moment: part-way in for a short flight (faded in from
// silence), late for a long one, so the roar arrives as the ball goes over.
const CUE = 2.9;
let cheerBuf = null, cheerLoading = null, cheerNow = null, roarUntil = 0;
function loadCheer() {
  if (!cheerLoading) {
    cheerLoading = fetch('snd/boundary-cheer.wav').then(r => r.arrayBuffer()).then(b => new Promise((ok, no) => ac.decodeAudioData(b, ok, no)))
      .then(buf => (cheerBuf = buf)).catch(() => { cheerLoading = null; return null; });
  }
  return cheerLoading;
}
// sec: seconds until the ball clears the rope. power: how loud (1.4 a four, 1.6 a six, 1.8 a perfect six)
export function cheerStart(sec, power = 1.5) {
  cheerStop(0.15);
  if (!ready()) return;
  if (!cheerBuf) { loadCheer(); return; }
  const t = ac.currentTime, from = Math.max(0, CUE - sec), delay = Math.max(0, sec - CUE);
  const src = ac.createBufferSource(), vol = ac.createGain(), fadeIn = ac.createGain(), stopG = ac.createGain();
  vol.gain.value = power;
  if (from > 0) { fadeIn.gain.setValueAtTime(0.0001, t); fadeIn.gain.linearRampToValueAtTime(1, t + Math.max(0.3, Math.min(0.8, sec * 0.5))); }
  src.buffer = cheerBuf; src.connect(vol).connect(fadeIn).connect(stopG).connect(master); src.start(t + delay, from);
  cheerNow = { src, stopG };
  roarUntil = t + delay + cheerBuf.duration - from;
}
// (stopG is a node of its own, so stopping never has to read a volume that may be mid-fade)
export function cheerStop(fade = 0.3) {
  if (!cheerNow || !ac) return;
  const { src, stopG } = cheerNow; cheerNow = null;
  const t = ac.currentTime;
  stopG.gain.setValueAtTime(1, t); stopG.gain.linearRampToValueAtTime(0.0001, t + fade);
  try { src.stop(t + fade + 0.05); } catch { /* already stopped */ }
  roarUntil = 0;
  setTimeout(() => stopG.disconnect(), (fade + 0.3) * 1000);
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
