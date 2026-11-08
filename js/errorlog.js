// A record of what went wrong on this phone. Errors the game catches itself (a frame that failed to draw, a sheet that did not load) and errors nobody caught are kept in a
// short list in storage (the last 20, the same one only counted again), so that a player can send a problem report that says what happened, and so that a bug the game swallows
// is no longer invisible. Nothing leaves the phone by itself: a report is text the player copies (and, once the game has a server, window.__SIXCHARGE_REPORT_URL sends it).
const KEY = 'sixcharge.errors', MAX = 20, VERSION = '0.1.0';
let list = [], installed = false;
const load = () => { try { const j = JSON.parse(localStorage.getItem(KEY) || '[]'); if (Array.isArray(j)) list = j.slice(-MAX); } catch { list = []; } };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* the log is not worth a quota error */ } };

export function record(kind, err, extra = {}) {
  const msg = String(err?.message || err || 'unknown').slice(0, 300), stack = String(err?.stack || '').split('\n').slice(0, 4).join(' | ').slice(0, 400);
  const sig = `${kind}|${msg}|${stack.slice(0, 80)}`, hit = list.find(e => e.sig === sig);
  if (hit) { hit.n++; hit.last = Date.now(); }
  else list.push({ sig, kind, msg, stack, n: 1, first: Date.now(), last: Date.now(), ...extra });
  if (list.length > MAX) list.splice(0, list.length - MAX);
  save();
}
export const errorList = () => list.slice();
export const errorCount = () => list.reduce((a, e) => a + e.n, 0);
export function clearErrors() { list = []; save(); }

export function installErrorLog(context = () => ({})) {
  if (installed || typeof window === 'undefined') return;
  installed = true; load();
  window.addEventListener('error', e => record('error', e.error || e.message, { at: `${(e.filename || '').replace(/^.*\//, '')}:${e.lineno || 0}`, ...context() }));
  window.addEventListener('unhandledrejection', e => record('promise', e.reason, context()));
  const orig = console.error;
  console.error = (...a) => { try { record('caught', a.find(x => x instanceof Error) || a.map(x => (typeof x === 'string' ? x : x?.message || '')).join(' '), context()); } catch { /* never let the log break logging */ } orig.apply(console, a); };
}

// the report a player can send: the phone, the game, and what went wrong
export function errorReport(extra = {}) {
  const nav = typeof navigator !== 'undefined' ? navigator : {}, win = typeof window !== 'undefined' ? window : {};
  const head = { game: 'Sixcharge', version: VERSION, time: new Date().toISOString(), ua: nav.userAgent, screen: win.innerWidth ? `${win.innerWidth}x${win.innerHeight}@${win.devicePixelRatio || 1}` : '', ...extra };
  return JSON.stringify({ ...head, errors: list.map(({ sig, ...e }) => e) }, null, 1);
}
export async function sendReport(text) {
  const url = typeof window !== 'undefined' && window.__SIXCHARGE_REPORT_URL;
  if (!url) return false;
  try { return !!navigator.sendBeacon?.(url, text) || (await fetch(url, { method: 'POST', body: text, keepalive: true })).ok; } catch { return false; }
}
