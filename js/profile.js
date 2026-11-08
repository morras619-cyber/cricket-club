// Light progression stored on this device: XP, level, coins, daily login calendar.
const KEY = 'sixcharge.profile.v1';
export const DAILY = [50, 60, 70, 80, 90, 100, 250];

const fresh = () => ({
  name: '', xp: 0, coins: 0, gems: 0, matches: 0, wins: 0, best: 0, tutorialDone: false, tutorialOffered: false,
  team: 'thunder',
  unlocked: [], // signed heroes (your own team's star is always yours)
  lineups: {}, // per team id: { order: [player ids], attack: [player ids] }
  squad: { bat: null, bowl: null, field: null }, // signings by slot
  tournament: null, trophies: [], heroXp: {}, achievements: {}, beaten: [],
  dailyChallenge: null, dailyStreak: { last: '', count: 0, best: 0 },
  daily: { day: 0, last: '' },
  pass: { season: 1, xp: 0, claimed: 0 }, // the season pass: tiers reached by playing, rewards claimed
  skill: { est: 50, n: 0 }, // how well you play, as the AI has learned it (js/adapt.js)
  settings: { sound: true, haptics: true, fielding: 'key', units: 'kmh', inputOffsetMs: 0 },   // (inputOffsetMs: this phone's touch delay, measured by the touch timing screen: js/profile.js)
});

// ---------- saving: a versioned save, a rolling backup copy, a failed write that is noticed, and a code to carry a save to another phone ----------
// The save is one key in the browser's storage. SCHEMA counts the shape of the save (MIGRATIONS[n] takes a save from n - 1 to n), so a later change to the shape can bring
// an old save along instead of breaking it. Before a save overwrites the last one that was good, the last one is kept as a backup (at most one a minute).
export const SCHEMA = 2;
const MIGRATIONS = { 2: p => p };   // (1 had no version number and no settings.inputOffsetMs: nothing to change but the number)
const BAK = KEY + '.bak', MAGIC = 'SIXCHARGE1:';
export const saveState = { ok: true, error: '', bytes: 0, backup: false, fails: 0, listeners: [] };
let lastBak = 0;
const note = () => { for (const f of saveState.listeners) { try { f(saveState); } catch { /* a listener's own trouble is not the save's */ } } };

export function migrate(p) {
  let v = Number.isInteger(p?.v) ? p.v : 1;
  while (v < SCHEMA) { v++; if (MIGRATIONS[v]) p = MIGRATIONS[v](p) || p; }
  p.v = SCHEMA;
  return p;
}
// what a good save looks like, enough that a code pasted in or a copy read back is not rubbish
export const looksLikeSave = p => !!p && typeof p === 'object' && !Array.isArray(p) && typeof p.xp === 'number' && typeof p.coins === 'number' && typeof p.settings === 'object' && p.settings !== null;
const mergeSave = raw => { const f = fresh(); return migrate({ ...f, ...raw, settings: { ...f.settings, ...(raw.settings || {}) } }); };

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try { const p = JSON.parse(raw); if (looksLikeSave(p)) return mergeSave(p); } catch { /* damaged: the backup below */ }
      const bak = localStorage.getItem(BAK);
      if (bak) { const p = JSON.parse(bak); if (looksLikeSave(p)) { saveState.backup = true; return mergeSave(p); } }
    }
  } catch { /* storage unavailable: play without saving */ }
  return migrate(fresh());
}

export function saveProfile(p) {
  try {
    p.v = SCHEMA;
    const json = JSON.stringify(p);
    const prev = localStorage.getItem(KEY);
    if (prev && prev !== json && Date.now() - lastBak > 60000) { try { localStorage.setItem(BAK, prev); lastBak = Date.now(); } catch { /* no room for a backup: the save itself matters more */ } }
    localStorage.setItem(KEY, json);
    const was = saveState.ok;
    saveState.ok = true; saveState.error = ''; saveState.bytes = json.length;
    if (!was) note();
  } catch (e) {
    saveState.ok = false; saveState.error = e?.name || 'error'; saveState.fails++;
    note();
  }
}

// the save as a code to copy (and the other way): MAGIC then the save, as text a phone can carry (base64 of its UTF-8)
const b64 = {
  enc: str => btoa(unescape(encodeURIComponent(str))),
  dec: str => decodeURIComponent(escape(atob(str))),
};
export function exportSave(p) { return MAGIC + b64.enc(JSON.stringify({ ...p, v: SCHEMA })); }
export function parseSaveCode(text) {
  try {
    const t = String(text || '').trim();
    if (!t.startsWith(MAGIC)) return { ok: false, why: 'That is not a Sixcharge backup code.' };
    const p = JSON.parse(b64.dec(t.slice(MAGIC.length).replace(/\s+/g, '')));
    if (!looksLikeSave(p)) return { ok: false, why: 'The code is damaged.' };
    return { ok: true, profile: mergeSave(p) };
  } catch { return { ok: false, why: 'The code is damaged or incomplete.' }; }
}
// replace the save on this device with a restored one (the one it replaces becomes the backup)
export function restoreSave(profile) {
  try {
    const cur = localStorage.getItem(KEY);
    if (cur) localStorage.setItem(BAK, cur);
    localStorage.setItem(KEY, JSON.stringify(profile));
    return true;
  } catch { return false; }
}

export function level(xp) {
  const lv = Math.min(50, 1 + Math.floor(Math.sqrt(xp / 120)));
  const cur = 120 * (lv - 1) ** 2, next = 120 * lv ** 2;
  return { lv, progress: lv >= 50 ? 1 : (xp - cur) / (next - cur) };
}

const today = () => new Date().toISOString().slice(0, 10);

export function dailyAvailable(p) { return p.daily.last !== today(); }

// Missing a day pauses the calendar instead of resetting it.
export function claimDaily(p) {
  if (!dailyAvailable(p)) return 0;
  const day = (p.daily.day % 7) + 1;
  const coins = DAILY[day - 1];
  p.daily = { day, last: today() };
  p.coins += coins;
  return { day, coins };
}

export function matchRewards(p, summary) {
  const win = summary.result.outcome === 'win';
  const daily = summary.mode === 'daily';
  const xp = (daily ? (win ? 60 : 30) : win ? 100 : 50) + 10 * (summary.stats.fieldingWins || 0);
  const coins = daily ? (win ? 60 : 20) : win ? 40 : 20;
  p.xp += xp; p.coins += coins;
  const gems = win ? 1 : 0;
  p.gems = (p.gems || 0) + gems;
  const pass = addPassXp(p, win ? 100 : 50);
  if (daily) return { xp, coins, gems, pass };
  p.matches++;
  if (win) p.wins++;
  const inn = summary.innings.find(i => i.side === 'player');
  if (inn) p.best = Math.max(p.best, inn.runs);
  return { xp, coins, gems, pass };
}

// ---------- season pass ----------
// 30 tiers of 100 pass XP (a win is a tier, a loss half of one). Every tier pays coins, every
// fifth tier gems too; once the last one is claimed the next season starts.
export const PASS_TIERS = 30;
export const PASS_TIER_XP = 100;
export const passReward = n => ({ coins: 40 + 10 * n, gems: n === PASS_TIERS ? 25 : n % 5 === 0 ? 5 : 0 });
export function passState(p) {
  const ps = { season: 1, xp: 0, claimed: 0, ...(p.pass || {}) };
  const tier = Math.min(PASS_TIERS, Math.floor(ps.xp / PASS_TIER_XP));
  const progress = tier >= PASS_TIERS ? 1 : (ps.xp % PASS_TIER_XP) / PASS_TIER_XP;
  return { ...ps, tier, progress, ready: tier - ps.claimed };
}
// adds pass XP; returns the tier reached if it went up, else 0
function addPassXp(p, n) {
  const before = passState(p).tier;
  p.pass = { ...passState(p), xp: Math.min(PASS_TIERS * PASS_TIER_XP, (p.pass?.xp || 0) + n) };
  const after = passState(p).tier;
  p.pass = { season: p.pass.season, xp: p.pass.xp, claimed: p.pass.claimed };
  return after > before ? after : 0;
}
// claims every reached tier; returns the total paid, and starts the next season after the last tier
export function claimPass(p) {
  const st = passState(p);
  const got = { coins: 0, gems: 0, tiers: 0, newSeason: false };
  for (let n = st.claimed + 1; n <= st.tier; n++) {
    const r = passReward(n);
    got.coins += r.coins; got.gems += r.gems; got.tiers++;
  }
  p.coins += got.coins; p.gems = (p.gems || 0) + got.gems;
  p.pass = { season: st.season, xp: st.xp, claimed: st.tier };
  if (st.tier >= PASS_TIERS) { p.pass = { season: st.season + 1, xp: 0, claimed: 0 }; got.newSeason = true; }
  return got;
}

// ---------- shop: gems for coins ----------
export const GEM_DEALS = [{ gems: 5, coins: 300 }, { gems: 12, coins: 800 }, { gems: 25, coins: 1800 }];
export function buyCoins(p, i) {
  const d = GEM_DEALS[i];
  if (!d || (p.gems || 0) < d.gems) return false;
  p.gems -= d.gems; p.coins += d.coins;
  return true;
}

// Spend coins to unlock a star hero. Returns false if it can't be afforded.
export function unlockHero(p, id, cost) {
  p.unlocked = p.unlocked || ['raja', 'zara', 'rani'];
  if (p.unlocked.includes(id)) return true;
  if (p.coins < cost) return false;
  p.coins -= cost; p.unlocked.push(id);
  return true;
}

// ---------- career stats ----------
const batBlank = () => ({ inns: 0, notOuts: 0, runs: 0, balls: 0, hs: 0, hsNotOut: false, ducks: 0, fours: 0, sixes: 0, longestSix: 0 });
const bowlBlank = () => ({ inns: 0, balls: 0, runs: 0, wkts: 0, dots: 0, maidens: 0, best: null });

export function careerStats(p) {
  p.stats = p.stats || {};
  p.stats.bat = { ...batBlank(), ...(p.stats.bat || {}) };
  p.stats.bowl = { ...bowlBlank(), ...(p.stats.bowl || {}) };
  p.stats.heroes = p.stats.heroes || {};
  return p.stats;
}

function heroStats(stats, id, kind) {
  const h = (stats.heroes[id] = stats.heroes[id] || {});
  h[kind] = { ...(kind === 'bat' ? batBlank() : bowlBlank()), ...(h[kind] || {}) };
  return h[kind];
}

const betterFigures = (a, b) => !b || a.w > b.w || (a.w === b.w && a.r < b.r);

function addBatting(t, card) {
  for (const st of card) {
    t.inns++; t.runs += st.runs; t.balls += st.balls; t.fours += st.fours; t.sixes += st.sixes;
    if (!st.out) t.notOuts++;
    if (st.out && st.runs === 0) t.ducks++;
    if (st.runs > t.hs || (st.runs === t.hs && !st.out && !t.hsNotOut)) { t.hs = st.runs; t.hsNotOut = !st.out; }
  }
}

function addBowling(t, f) {
  t.inns++; t.balls += f.balls; t.runs += f.runs; t.wkts += f.wkts; t.dots += f.dots; t.maidens += f.maidens;
  const fig = { w: f.wkts, r: f.runs };
  if (betterFigures(fig, t.best)) t.best = fig;
}

// Adds a finished match to the career and per-hero records. Returns what's new.
export function recordStats(p, summary) {
  const stats = careerStats(p);
  const out = { batting: null, bowling: null, newHS: false, newBest: false, newLongSix: false };
  const six = summary.stats?.longestSix || 0;
  if (six) {
    out.newLongSix = six > (stats.bat.longestSix || 0) && stats.bat.longestSix > 0;
    stats.bat.longestSix = Math.max(stats.bat.longestSix || 0, six);
  }
  const batInn = summary.innings.find(i => i.side === 'player');
  if (batInn && batInn.balls > 0) {
    const card = batInn.battingCard();
    const prevHS = stats.bat.inns ? stats.bat.hs : -1;
    addBatting(stats.bat, card);
    // the hero's own stints (older records had no ids: the hero batted throughout)
    const heroId = summary.team.bat?.id;
    const mine = card.filter(c => heroId && (!c.id || c.id === heroId));
    if (heroId && mine.length) addBatting(heroStats(stats, heroId, 'bat'), mine);
    out.batting = card;
    out.newHS = Math.max(...card.map(c => c.runs)) > prevHS && prevHS >= 0;
  }
  const bowlInn = summary.innings.find(i => i.side === 'ai');
  if (bowlInn && bowlInn.balls > 0) {
    const f = bowlInn.bowlingFigures();
    const prevBest = stats.bowl.best;
    addBowling(stats.bowl, f);
    const heroId = summary.team.bowl?.id;
    const hf = !heroId ? null : bowlInn.figs && Object.keys(bowlInn.figs).length ? bowlInn.figs[heroId] : f;
    if (hf && hf.balls > 0) addBowling(heroStats(stats, heroId, 'bowl'), { maidens: 0, ...hf });
    out.bowling = f;
    out.bowlingCard = bowlInn.bowlingCard ? bowlInn.bowlingCard() : [];
    out.newBest = !!prevBest && betterFigures({ w: f.wkts, r: f.runs }, prevBest);
  }
  return out;
}

// Display helpers
export const fmt = {
  avg: (runs, outs) => (outs ? (runs / outs).toFixed(1) : '—'),
  sr: (runs, balls) => (balls ? ((runs / balls) * 100).toFixed(0) : '—'),
  econ: (runs, balls) => (balls ? ((runs / balls) * 6).toFixed(1) : '—'),
  overs: balls => `${Math.floor(balls / 6)}.${balls % 6}`,
  hs: t => (t.inns ? `${t.hs}${t.hsNotOut ? '*' : ''}` : '—'),
  best: t => (t.best ? `${t.best.w}/${t.best.r}` : '—'),
  stint: st => `${st.runs}${st.out ? '' : '*'} (${st.balls})`,
  figures: f => `${f.wkts}/${f.runs} (${Math.floor(f.balls / 6)}.${f.balls % 6} ov)`,
};

// ===== touch timing (the touch timing screen) =====
// Touch calibration. Every phone has its own delay between a finger touching the screen and the game seeing it, and between the game drawing something and the screen showing it
// (a budget Android phone can add 40 to 100 ms). The batting windows are tight, so the game measures it: a ring closes on a ball on a steady beat, the player taps as it
// closes (the same thing as meeting the ball), and the median distance between the taps and the beats is that phone's offset. The batting timing then takes it off.
// Pure maths here (calibrationOffset); the screen and the loop are runCalibration.
export const CAL = { warm: 4, beats: 12, gapMs: 720, windowMs: 340, minMs: -120, maxMs: 250, minTaps: 8, steadyMs: 60 };

const medianOf = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; };

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
  const m = medianOf(diffs), mad = medianOf(diffs.map(d => Math.abs(d - m))), spread = 1.4826 * mad;
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

// ===== error log =====
// A record of what went wrong on this phone. Errors the game catches itself (a frame that failed to draw, a sheet that did not load) and errors nobody caught are kept in a
// short list in storage (the last 20, the same one only counted again), so that a player can send a problem report that says what happened, and so that a bug the game swallows
// is no longer invisible. Nothing leaves the phone by itself: a report is text the player copies (and, once the game has a server, window.__SIXCHARGE_REPORT_URL sends it).
const ERR_KEY = 'sixcharge.errors', ERR_MAX = 20, ERR_VERSION = '0.1.0';
let errList = [], errInstalled = false;
const loadErrors = () => { try { const j = JSON.parse(localStorage.getItem(ERR_KEY) || '[]'); if (Array.isArray(j)) errList = j.slice(-ERR_MAX); } catch { errList = []; } };
const saveErrors = () => { try { localStorage.setItem(ERR_KEY, JSON.stringify(errList)); } catch { /* the log is not worth a quota error */ } };

export function record(kind, err, extra = {}) {
  const msg = String(err?.message || err || 'unknown').slice(0, 300), stack = String(err?.stack || '').split('\n').slice(0, 4).join(' | ').slice(0, 400);
  const sig = `${kind}|${msg}|${stack.slice(0, 80)}`, hit = errList.find(e => e.sig === sig);
  if (hit) { hit.n++; hit.last = Date.now(); }
  else errList.push({ sig, kind, msg, stack, n: 1, first: Date.now(), last: Date.now(), ...extra });
  if (errList.length > ERR_MAX) errList.splice(0, errList.length - ERR_MAX);
  saveErrors();
}
export const errorList = () => errList.slice();
export const errorCount = () => errList.reduce((a, e) => a + e.n, 0);
export function clearErrors() { errList = []; saveErrors(); }

export function installErrorLog(context = () => ({})) {
  if (errInstalled || typeof window === 'undefined') return;
  errInstalled = true; loadErrors();
  window.addEventListener('error', e => record('error', e.error || e.message, { at: `${(e.filename || '').replace(/^.*\//, '')}:${e.lineno || 0}`, ...context() }));
  window.addEventListener('unhandledrejection', e => record('promise', e.reason, context()));
  const orig = console.error;
  console.error = (...a) => { try { record('caught', a.find(x => x instanceof Error) || a.map(x => (typeof x === 'string' ? x : x?.message || '')).join(' '), context()); } catch { /* never let the log break logging */ } orig.apply(console, a); };
}

// the report a player can send: the phone, the game, and what went wrong
export function errorReport(extra = {}) {
  const nav = typeof navigator !== 'undefined' ? navigator : {}, win = typeof window !== 'undefined' ? window : {};
  const head = { game: 'Sixcharge', version: ERR_VERSION, time: new Date().toISOString(), ua: nav.userAgent, screen: win.innerWidth ? `${win.innerWidth}x${win.innerHeight}@${win.devicePixelRatio || 1}` : '', ...extra };
  return JSON.stringify({ ...head, errors: errList.map(({ sig, ...e }) => e) }, null, 1);
}
export async function sendReport(text) {
  const url = typeof window !== 'undefined' && window.__SIXCHARGE_REPORT_URL;
  if (!url) return false;
  try { return !!navigator.sendBeacon?.(url, text) || (await fetch(url, { method: 'POST', body: text, keepalive: true })).ok; } catch { return false; }
}

// A second copy of the saves in the phone's own storage, for the Android app. The game keeps its saves in the web view's localStorage, which Android can clear on its own
// (low storage, a web view update); the app's native preferences (Capacitor's Preferences plugin) are not cleared that way and are part of the phone's backup.
// On the web (and in tests) there is no Capacitor and none of this does anything. Everything the game keeps under "sixcharge." is covered.
// nativeReady: settles once anything missing from localStorage has been put back from the native copy; main.js waits for it before it reads the profile.
const NATIVE_PREFIX = 'sixcharge.', NATIVE_WAIT_MS = 400;
const nativeCap = globalThis.Capacitor;
const nativePrefs = nativeCap?.isNativePlatform?.() ? nativeCap.registerPlugin?.('Preferences') : null;
const nativeMine = k => typeof k === 'string' && k.startsWith(NATIVE_PREFIX);

const nativePending = new Set();
let nativeTimer = 0;
async function nativeFlush() {
  nativeTimer = 0;
  const keys = [...nativePending]; nativePending.clear();
  for (const key of keys) {
    try {
      const value = localStorage.getItem(key);
      if (value === null) await nativePrefs.remove({ key }); else await nativePrefs.set({ key, value });
    } catch { /* the web view's copy is still there */ }
  }
}
const nativeQueue = key => { if (!nativeMine(key)) return; nativePending.add(key); if (!nativeTimer) nativeTimer = setTimeout(nativeFlush, NATIVE_WAIT_MS); };

async function nativeHydrate() {
  const { keys } = await nativePrefs.keys();
  for (const key of keys.filter(nativeMine)) {
    if (localStorage.getItem(key) !== null) continue;
    const { value } = await nativePrefs.get({ key });
    if (value !== null && value !== undefined) localStorage.setItem(key, value);   // (the web view lost it: the native copy comes back)
  }
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (nativeMine(k) && !keys.includes(k)) nativePending.add(k); }   // (what the web view has and the native copy has not)
  if (nativePending.size) nativeFlush();
}

function nativeMirror() {
  const set = Storage.prototype.setItem, remove = Storage.prototype.removeItem, clear = Storage.prototype.clear;
  Storage.prototype.setItem = function (k, v) { set.call(this, k, v); if (this === localStorage) nativeQueue(String(k)); };
  Storage.prototype.removeItem = function (k) { remove.call(this, k); if (this === localStorage) nativeQueue(String(k)); };
  Storage.prototype.clear = function () { const keys = this === localStorage ? Object.keys(localStorage) : []; clear.call(this); keys.forEach(nativeQueue); };
  const now = () => { if (nativeTimer) { clearTimeout(nativeTimer); nativeFlush(); } };
  addEventListener('pagehide', now);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') now(); });
}

export const nativeReady = nativePrefs ? nativeHydrate().catch(() => {}).then(nativeMirror) : Promise.resolve();
