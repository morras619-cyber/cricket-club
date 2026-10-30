// How fast a season can go: a league match costs a token. A token comes every two real hours, up to three are kept (they never run out),
// and you start with three. It is a recharging meter, and waiting costs you nothing: only time you could not have used is lost.
// The time is the server's (main.js), never the phone's clock. Pure data and functions (career.pace is the state).
export const HOUR = 3600000;
export const PACE = { EVERY: 2 * HOUR, BANK: 3 };

function mark(p) {
  let h = 2166136261;
  const s = `${p.tokens}|${p.at}|pc3`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const seal = p => { p.seal = mark(p); return p; };
export const freshPace = now => seal({ tokens: PACE.BANK, at: now, seal: 0 });

// bring the meter up to date: now (ms, the server's); trusted: false when the server gave no time (then one token a visit at most)
export function refill(p, now, trusted = true) {
  if (p.seal !== mark(p)) { p.tokens = 0; p.at = now; return seal(p); }   // somebody has been at the numbers: it starts empty
  if (now < p.at) return p;                                              // the clock went back: nothing happens
  if (p.tokens >= PACE.BANK) { p.at = now; return seal(p); }             // full: it does not fill while full
  let gained = Math.floor((now - p.at) / PACE.EVERY);
  if (!trusted) gained = Math.min(1, gained);
  if (gained > 0) { p.tokens = Math.min(PACE.BANK, p.tokens + gained); p.at += gained * PACE.EVERY; }
  if (p.tokens >= PACE.BANK) p.at = now;
  return seal(p);
}
export function spend(p, now, trusted = true) {
  refill(p, now, trusted);
  if (p.tokens < 1) return false;
  if (p.tokens >= PACE.BANK) p.at = now;   // (the next one starts counting from now)
  p.tokens--;
  seal(p); return true;
}
// ms until the next token (0 when full)
export const nextIn = (p, now) => (p.tokens >= PACE.BANK ? 0 : Math.max(0, p.at + PACE.EVERY - now));
export const fmtWait = ms => { const m = Math.ceil(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${Math.max(1, m)} min`; };
