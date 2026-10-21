// Synthesised sound effects (no audio files to download). Starts on the first user gesture.
let ac = null, master = null, noiseBuf = null;
let crowdLoop = null;
const CROWD_LOOP_URL = './assets/audio/low-level-crowd-loop.mp3';
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

// Start the supplied low-level stadium ambience after the game's normal user-gesture unlock.
// Keep it separate from the master SFX bus so the 20% ambience level does not change effects.
export async function startCrowdAmbience() {
  if (!sound.on || typeof Audio === 'undefined') return;
  if (!crowdLoop) {
    crowdLoop = new Audio(CROWD_LOOP_URL);
    crowdLoop.loop = true;
    crowdLoop.preload = 'auto';
    crowdLoop.volume = 0.2;
  }
  crowdLoop.volume = 0.2;
  if (!crowdLoop.paused) return; // already playing; preserve loop position
  try {
    await crowdLoop.play();
  } catch (err) {
    // A later user gesture retries browsers' autoplay-policy rejection.
    if (err?.name !== 'NotAllowedError') console.warn('Crowd ambience could not start:', err);
  }
}

export function stopCrowdAmbience() {
  if (!crowdLoop) return;
  crowdLoop.pause();
  try { crowdLoop.currentTime = 0; } catch { /* ignore if metadata is not loaded yet */ }
}

// File-backed crowd ambience intentionally uses a separate HTMLAudioElement so setting volume
// to 20% does not change the synthesized sound-effects mixer.

  if (!crowdLoop) return;
  crowdLoop.pause();
  try { crowdLoop.currentTime = 0; } catch { /* ignore if metadata is not loaded yet */ }
}

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
  crowd(intensity = 1) { noise(1.6 * intensity, { gain: 0.25 * intensity, freq: 900, q: 0.4, attack: 0.25 }); },
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
export function buzz(pattern) {
  if (!sound.haptics) return;
  try {
    if (navigator.vibrate) { navigator.vibrate(pattern); return; }
    const p = Array.isArray(pattern) ? pattern : [pattern];
    let t = 0;
    p.forEach((ms, i) => { if (i % 2 === 0) setTimeout(iosTick, t); t += ms; });
  } catch { /* not allowed here */ }
}
