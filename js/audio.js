// Synthesised sound effects (no audio files to download). Starts on the first user gesture.
let ac = null, master = null, noiseBuf = null;
export const sound = { on: true, haptics: true };

export function unlockAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); musicSync(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain();
  master.gain.value = 0.55;
  master.connect(ac.destination);
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  musicSync();
}

function ready() { return ac && sound.on; }

// ---------- the menu music ----------
// snd/menu-music.mp3 (45 s, tools/build_menu_music.py) plays while a menu screen is up (ui.js says so: musicWanted) and fades away when a match
// starts. Each play fades into the next over MUSIC_XF seconds, so it loops without a seam (and whatever the mp3 decoder does to its ends does
// not matter). It is also off when the sound is.
const MUSIC_VOL = 0.5, MUSIC_XF = 1.8;
let musicWant = false, musicBuf = null, musicLoading = null, musicRun = null;
export function musicWanted(on) { musicWant = !!on; musicSync(); }
export function musicSync() {
  if (musicWant && ready()) startMusic(); else stopMusic(0.8);
}
function loadMusic() {
  if (!musicLoading) {
    musicLoading = fetch('snd/menu-music.mp3').then(r => r.arrayBuffer()).then(b => new Promise((ok, no) => ac.decodeAudioData(b, ok, no)))
      .then(buf => (musicBuf = buf)).catch(() => { musicLoading = null; return null; });
  }
  return musicLoading;
}
function startMusic() {
  if (musicRun) return;
  if (!musicBuf) { loadMusic().then(buf => { if (buf) musicSync(); }); return; }
  const t = ac.currentTime + 0.05, gain = ac.createGain(), run = musicRun = { gain, srcs: [], nextAt: 0, timer: 0 };
  gain.gain.setValueAtTime(0.0001, t); gain.gain.linearRampToValueAtTime(MUSIC_VOL, t + 1.5);
  gain.connect(master);
  const dur = musicBuf.duration;
  const play = (at, first) => {   // one play of the track, fading in over the end of the last one and out over the start of the next
    const src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = musicBuf; src.connect(g).connect(gain);
    if (first) g.gain.setValueAtTime(1, at); else { g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(1, at + MUSIC_XF); }
    g.gain.setValueAtTime(1, at + dur - MUSIC_XF); g.gain.linearRampToValueAtTime(0.0001, at + dur);
    src.start(at); src.stop(at + dur + 0.1);
    run.srcs.push(src); if (run.srcs.length > 3) run.srcs.shift();
    run.nextAt = at + dur - MUSIC_XF;
  };
  play(t, true);
  run.timer = setInterval(() => { if (musicRun === run && ac.currentTime > run.nextAt - 2) play(run.nextAt, false); }, 500);
}
function stopMusic(fade = 0.8) {
  const run = musicRun; if (!run) return;
  musicRun = null; clearInterval(run.timer);
  const t = ac.currentTime;
  run.gain.gain.cancelScheduledValues(t); run.gain.gain.setValueAtTime(Math.max(0.0001, run.gain.gain.value), t); run.gain.gain.linearRampToValueAtTime(0.0001, t + fade);
  setTimeout(() => { for (const s of run.srcs) { try { s.stop(); } catch { /* already over */ } } run.gain.disconnect(); }, (fade + 0.2) * 1000);
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
  crowd(intensity = 1) { if (ac && ac.currentTime < roarUntil) return; /* (the boundary cheer is the crowd) */ noise(1.6 * intensity, { gain: 0.18 * intensity, freq: 900, q: 0.4, attack: 0.25 }); },
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
const CHEER_SOFT = 0.7;   // (the cheers were too loud: every cheer and roar plays at this much of its level)
// sec: seconds until the ball clears the rope. power: how loud (1.1 a four, 1.3 a six, 1.45 a perfect six)
export function cheerStart(sec, power = 1.2) {
  cheerStop(0.15); singDuck(0.4);
  if (!ready()) return;
  if (!cheerBuf) { loadCheer(); return; }
  const t = ac.currentTime, from = Math.max(0, CUE - sec), delay = Math.max(0, sec - CUE);
  const src = ac.createBufferSource(), vol = ac.createGain(), fadeIn = ac.createGain(), stopG = ac.createGain();
  vol.gain.value = power * CHEER_SOFT;
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

// ---------- the home crowd when its side bowls: a build-up, then a groan or a roar ----------
// snd/crowd-ohh.wav (tools/build_bowling_crowd.py) rises as the bowler runs in and fades away once the ball is played
// (it is not held for a catch). When the ball is decided it is faded out under: crowd-hoo.wav (a miss or a block)
// or crowd-wicket.wav (a wicket), each kept whole. A ball that scores just lets the build-up fade away.
const BOWLCROWD = ['ohh', 'hoo', 'wicket'];
let bowlBufs = null, bowlLoading = null, ohhNow = null;
function loadBowlCrowd() {
  if (!bowlLoading) {
    const get = n => fetch(`snd/crowd-${n}.wav`).then(r => r.arrayBuffer()).then(b => new Promise((ok, no) => ac.decodeAudioData(b, ok, no)));
    bowlLoading = Promise.all(BOWLCROWD.map(get)).then(([ohh, hoo, wicket]) => (bowlBufs = { ohh, hoo, wicket })).catch(() => { bowlLoading = null; return null; });
  }
  return bowlLoading;
}
export function crowdOhh() {
  crowdFade(0.15);
  if (!ready()) return;
  if (!bowlBufs) { loadBowlCrowd(); return; }
  const t = ac.currentTime, src = ac.createBufferSource(), vol = ac.createGain(), stopG = ac.createGain();
  vol.gain.value = 1.1 * CHEER_SOFT;
  src.buffer = bowlBufs.ohh; src.connect(vol).connect(stopG).connect(master); src.start(t);
  ohhNow = { src, stopG };
}
// fade the build-up out (a node of its own, so stopping never reads a volume that may be mid-change)
function crowdFade(sec) {
  if (!ohhNow || !ac) return;
  const { src, stopG } = ohhNow; ohhNow = null;
  const t = ac.currentTime;
  stopG.gain.setValueAtTime(1, t); stopG.gain.linearRampToValueAtTime(0.0001, t + sec);
  try { src.stop(t + sec + 0.05); } catch { /* already stopped */ }
  setTimeout(() => stopG.disconnect(), (sec + 0.3) * 1000);
}
// the ball is decided: 'wicket', 'dot' (a miss or a block) or 'runs'/'abort' (only the build-up fading away)
export function crowdResolve(kind) {
  const was = !!ohhNow;
  if (kind === 'wicket' || kind === 'dot') singDuck(0.4);
  crowdFade(kind === 'wicket' ? 0.9 : kind === 'dot' ? 0.3 : 0.6); // (the build-up outlasts the wicket cheer's attack, so there is no dip between them)
  if (!ready() || (kind !== 'wicket' && kind !== 'dot')) return;
  if (!bowlBufs) { loadBowlCrowd(); return; }
  const t = ac.currentTime, src = ac.createBufferSource(), g = ac.createGain(), buf = kind === 'wicket' ? bowlBufs.wicket : bowlBufs.hoo;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(kind === 'wicket' ? 1.1 * CHEER_SOFT : 0.95, t + 0.03);
  const skip = kind === 'wicket' ? 0.1 : 0;                                  // (the wicket recording opens with 0.12 s of near-silence: start past it)
  src.buffer = buf; src.connect(g).connect(master); src.start(t, skip);
  roarUntil = Math.max(roarUntil, t + (buf.duration - skip) * 0.7);                 // (the synthetic crowd stays quiet under it)
  return was;
}
// the ball is in the air with a catch to come: the build-up fades away now (it is not held for the catch)
export function crowdSoften() { crowdFade(0.8); }
export function crowdStop() { crowdFade(0.2); singDuck(0.3); }

// ---------- the crowd's moods: singing and booing ----------
// snd/crowd-boo.wav (an angry crowd, whole) and the applause. The singing (below) ducks away under any of the louder crowd
// sounds that come after it (the roar, a wicket, a groan, a boo). tools/build_crowd_mood.py.
let moodBufs = null, moodLoading = null, singing = [];
function loadMood() {
  if (!moodLoading) {
    const get = n => fetch(`snd/crowd-${n}.wav`).then(r => r.arrayBuffer()).then(b => new Promise((ok, no) => ac.decodeAudioData(b, ok, no)));
    moodLoading = Promise.all([get('boo'), get('boo2'), get('boo3'), get('clap')]).then(([boo, boo2, boo3, clap]) => (moodBufs = { boos: [boo, boo2, boo3], claps: [clap] })).catch(() => { moodLoading = null; return null; });
  }
  return moodLoading;
}

// ---------- the singing: the default one and each club's own song ----------
// snd/crowd-songs.mp3 holds the singing one slot after another (SONG_SLOT seconds apart, SONG_LEN of song in each; tools/build_crowd_songs.py):
// slot 0 is the default (Thunder Strikers, and any club without a song of its own), then the other seven main clubs. A happy crowd singing,
// faded at both ends, plays as much as a moment needs. The home crowd sings its own club's song. Only the slots wanted are kept; the
// whole file is let go once they are cut out.
const SONG_SLOTS = ['default', 'cyclones', 'vipers', 'eagles', 'phoenix', 'titans', 'storm', 'royals'], SONG_SLOT = 10.5, SONG_LEN = 10;
let song = null, songTeam = null, defaultSong = null, songFor = null, songsLoading = null;
function cutSong(all, slot) {
  const sr = all.sampleRate, from = Math.round(slot * SONG_SLOT * sr), n = Math.min(Math.round(SONG_LEN * sr), all.length - from);
  const out = ac.createBuffer(all.numberOfChannels, n, sr);
  for (let c = 0; c < all.numberOfChannels; c++) out.copyToChannel(all.getChannelData(c).subarray(from, from + n), c);
  return out;
}
// Two or three runs for the home side: snd/crowd-runs.mp3 (a cheer that eases off, then swells again), played from the swell (the opening
// cheer is left out: it stops short) with the applause coming in as it builds, so the two sound as one crowd. A four or a six keeps its full roar (cheerStart); one run or
// none is only the quiet clap.
const RUNS_GAIN = 2.5, RUNS_CLAP = 0.55, RUNS_CLAP_AT = 0.4, RUNS_FROM = 1.35;   // (the recording is quiet: it plays up, and the applause is set to the same level)
let runsBuf = null, runsLoading = null;
function loadRuns() {
  if (!runsLoading) runsLoading = fetch('snd/crowd-runs.mp3').then(r => r.arrayBuffer()).then(b => new Promise((ok, no) => ac.decodeAudioData(b, ok, no)))
    .then(b => (runsBuf = b)).catch(() => { runsLoading = null; return null; });
  return runsLoading;
}
export function crowdRuns(delay = 0) {
  if (!ready()) return;
  if (!runsBuf || !moodBufs) { loadRuns(); loadMood(); return; }
  const now = ac.currentTime, t = now + Math.max(0, delay);
  if (t < clapUntil || now < roarUntil) return;
  cheerStop(0.15); singDuck(0.4);
  const d = runsBuf.duration - RUNS_FROM, src = ac.createBufferSource(), g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(RUNS_GAIN, t + 0.04);
  g.gain.setValueAtTime(RUNS_GAIN, t + d - 0.45); g.gain.linearRampToValueAtTime(0.0001, t + d);   // (the recording is cut short: let it fade out)
  src.buffer = runsBuf; src.connect(g).connect(master); src.start(t, RUNS_FROM);
  const clap = moodBufs.claps[clapNext++ % moodBufs.claps.length], cs = ac.createBufferSource(), cg = ac.createGain(), tc = t + RUNS_CLAP_AT;
  cg.gain.setValueAtTime(0.0001, tc); cg.gain.linearRampToValueAtTime(RUNS_CLAP, tc + 0.5);
  cs.buffer = clap; cs.connect(cg).connect(master); cs.start(tc);
  clapUntil = tc + clap.duration;
  roarUntil = Math.max(roarUntil, tc + clap.duration * 0.7);                   // (the synthetic crowd stays quiet under it)
}
// A six for the home side: the stadium's celebration music (snd/six-celebration.mp3), started as the ball clears the rope and riding over the roar.
// The recording is cut short, so it fades out at its end. Says how long it plays (0 if it did not), so the singing can follow it.
const SIX_MUSIC_VOL = 0.5;
let sixBuf = null, sixLoading = null;
function loadSix() {
  if (!sixLoading) sixLoading = fetch('snd/six-celebration.mp3').then(r => r.arrayBuffer()).then(b => new Promise((ok, no) => ac.decodeAudioData(b, ok, no)))
    .then(b => (sixBuf = b)).catch(() => { sixLoading = null; return null; });
  return sixLoading;
}
export function sixMusic(sec = 0) {
  if (!ready()) return 0;
  if (!sixBuf) { loadSix(); return 0; }
  const t = ac.currentTime + Math.max(0, sec), d = sixBuf.duration, src = ac.createBufferSource(), g = ac.createGain();
  singDuck(0.4);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(SIX_MUSIC_VOL, t + 0.05);
  g.gain.setValueAtTime(SIX_MUSIC_VOL, t + d - 0.6); g.gain.linearRampToValueAtTime(0.0001, t + d);
  src.buffer = sixBuf; src.connect(g).connect(master); src.start(t);
  return d;
}
// the crowd of this club sings from now on (called as a match is made: its song is fetched in the background)
export function crowdSong(teamId) {
  if (ac) { loadRuns(); loadMood(); loadSix(); }   // (ready for the first cheer and applause of the match)
  songFor = teamId;
  const slot = Math.max(0, SONG_SLOTS.indexOf(teamId));
  if (slot === 0) song = null;
  if (!ac || (defaultSong && (slot === 0 || (song && songTeam === teamId)))) return;   // (nothing more to fetch)
  if (songTeam !== teamId) song = null;
  songsLoading = fetch('snd/crowd-songs.mp3').then(r => r.arrayBuffer()).then(b => new Promise((ok, no) => ac.decodeAudioData(b, ok, no))).then(all => {
    if (!defaultSong) defaultSong = cutSong(all, 0);
    if (songFor === teamId && slot > 0) { song = cutSong(all, slot); songTeam = teamId; }
  }).catch(() => { /* no singing this time */ }).finally(() => { songsLoading = null; });
}
// sing for `sec` seconds starting `delay` seconds from now, at volume `vol`
export function crowdSing(delay = 0, sec = 5, vol = 0.5) {
  if (!ready()) return;
  const buf = song || defaultSong;
  if (!buf) { if (!songsLoading) crowdSong(songFor || 'thunder'); return; }   // (the singing has not arrived yet: it is fetched now and plays next time)
  const t0 = ac.currentTime + Math.max(0, delay), len = Math.min(sec, buf.duration);
  const src = ac.createBufferSource(), g = ac.createGain(), stopG = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + Math.min(0.6, len * 0.3));
  g.gain.setValueAtTime(vol, t0 + Math.max(0.7, len - 1.3)); g.gain.linearRampToValueAtTime(0.0001, t0 + len);
  src.buffer = buf; src.connect(g).connect(stopG).connect(master); src.start(t0); src.stop(t0 + len + 0.05);
  singing.push({ src, stopG });
  setTimeout(() => { singing = singing.filter(x => x.src !== src); stopG.disconnect(); }, (delay + len + 0.5) * 1000);
}
// fade the singing away (any that is playing or waiting to start)
function singDuck(sec = 0.4) {
  if (!ac) return;
  const t = ac.currentTime;
  for (const { src, stopG } of singing) {
    stopG.gain.setValueAtTime(1, t); stopG.gain.linearRampToValueAtTime(0.0001, t + sec);
    try { src.stop(t + sec + 0.05); } catch { /* already stopped */ }
  }
  singing = [];
}
// Applause for the home side's good moments. The recordings take turns (never two at once, and none while a roar or
// another clap is playing); it ducks any singing.
const CLAP_VOL = 0.15;
let clapNext = 0, clapUntil = 0;
export function crowdClap(delay = 0) {
  if (!ready()) return;
  if (!moodBufs) { loadMood(); return; }
  const now = ac.currentTime, t = now + Math.max(0, delay);
  if (t < clapUntil || now < roarUntil) return;
  const buf = moodBufs.claps[clapNext++ % moodBufs.claps.length], src = ac.createBufferSource(), g = ac.createGain();
  singDuck(0.4);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(CLAP_VOL, t + 0.3);   // (applause sits well under the other crowd sounds, and swells in)
  src.buffer = buf; src.connect(g).connect(master); src.start(t);
  clapUntil = t + buf.duration;
  roarUntil = Math.max(roarUntil, t + buf.duration * 0.7);                 // (the synthetic crowd stays quiet under it)
}
let lastBoo = -1;
// a boo, never the one just heard
export function crowdBoo(delay = 0) {
  if (!ready()) return;
  if (!moodBufs) { loadMood(); return; }
  singDuck(0.4);
  const t = ac.currentTime + Math.max(0, delay), src = ac.createBufferSource(), g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 0.1);   // softer than it was, but in at once
  let pick; do pick = Math.floor(Math.random() * moodBufs.boos.length); while (pick === lastBoo);
  lastBoo = pick;
  src.buffer = moodBufs.boos[pick]; src.connect(g).connect(master); src.start(t);
  roarUntil = Math.max(roarUntil, t + src.buffer.duration * 0.7);        // (the synthetic crowd stays quiet under it)
}

// ---------- the match's crowd bed ----------
// A low crowd murmur under the whole match (snd/crowd-loop.wav, tools/build_crowd_loop.py: made to
// loop with no seam). Two copies play at once, the second a little slower, so the short loop's
// repeats never line up and no pattern is heard. It follows the Sound setting.
const AMBIENCE = [{ rate: 1, gain: 0.5 }, { rate: 0.89, gain: 0.32 }];
let ambBuf = null, ambLoading = null, amb = null, ambRun = 0, ambLevel = 1;
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
  loadCheer(); loadBowlCrowd(); loadMood();
  loadAmbience().then(buf => {
    if (!buf || run !== ambRun || !ready()) return; // (stopped, or muted, while it loaded)
    const bus = ac.createGain(), t = ac.currentTime;
    bus.gain.setValueAtTime(0.0001, t); bus.gain.linearRampToValueAtTime(1, t + 1.5);
    const moodG = ac.createGain(); moodG.gain.value = ambLevel;   // (the murmur follows how the match is going for the home side)
    bus.connect(moodG).connect(master);
    const srcs = AMBIENCE.map(({ rate, gain }, i) => {
      const src = ac.createBufferSource(), g = ac.createGain();
      src.buffer = buf; src.loop = true; src.playbackRate.value = rate; g.gain.value = gain;
      src.connect(g).connect(bus);
      src.start(0, i * buf.duration * 0.37);   // (the copies start at different places in it)
      return src;
    });
    amb = { bus, srcs, moodG };
  });
}
// how the match is going for the home side, -1 (they are being hit apart: restless, a little louder) to 1 (loud, they are on top)
export function ambienceMood(x) {
  ambLevel = x < 0 ? 1 - 0.15 * x : 1 + 0.2 * x;
  if (!amb) return;
  const g = amb.moodG.gain, t = ac.currentTime;
  g.cancelScheduledValues(t); g.setTargetAtTime(ambLevel, t, 0.8);
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
