// The voice of Chirp: turns a fact (js/chirpfacts.js) into what a certain kind of person would say, in his own words.
// Every fan has a persona (from his face and handle): hype, loyal, nerd, old, joker, grumpy, doubter, and the rival fans. A persona likes a kind of
// line (js/chirpwords-*.js: hype, stat, wry, warm, old, rage, rival), says it with his own openers and closers now and then, and replies to
// other people's posts in his own words. Lines are never repeated soon (the career remembers the last ones said).
import { BAT } from './chirpwords-bat.js';
import { BOWL } from './chirpwords-bowl.js';
import { TEAM, OPP, MEM, TABLE } from './chirpwords-team.js';
import { STORY, JOURNEY } from './chirpwords-story.js';
import { EXTRA, EXTRA_TYPES } from './chirpwords-extra.js';
import { REGISTER, OPENERS, CLOSERS, REPLY, REPLY_TEAM, REPLY_STORY, CALLBACK, PERSONA_OF, SHOUT } from './chirpwords-voice.js';

export const WORDS = { ...BAT, ...BOWL, ...TEAM, ...OPP, ...MEM, ...TABLE, ...STORY, ...EXTRA_TYPES };
// the other ways of saying the same things (chirpwords-extra.js): added to what is there
for (const [type, regs] of Object.entries(EXTRA)) for (const [reg, lines] of Object.entries(regs)) WORDS[type][reg] = [...(WORDS[type][reg] || []), ...lines];
export const PERSONAS = Object.keys(REGISTER);
const hash = s => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };

// a fan's persona: from the list, else from his mood (the face) and handle
const FAMILY = { cheer: ['hype', 'loyal', 'joker', 'hype'], calm: ['nerd', 'old', 'loyal', 'nerd'], angry: ['grumpy', 'doubter', 'grumpy'], shocked: ['joker', 'hype', 'doubter'] };
export const personaOfFan = fan => PERSONA_OF[fan[1]] || (FAMILY[fan[2]] || FAMILY.calm)[hash(fan[1]) % (FAMILY[fan[2]] || FAMILY.calm).length];
// the moods that suit a persona, to find a face for it
export const MOODS = { hype: ['cheer', 'shocked'], loyal: ['cheer', 'calm'], nerd: ['calm'], old: ['calm'], joker: ['cheer', 'shocked'], grumpy: ['angry'], doubter: ['angry', 'shocked', 'calm'], rival: ['cheer', 'angry'] };

// {slot} -> value. With strict, a slot with no value is an error (the tests use that to find a line asking for something a fact does not have).
export function fill(s, vars, strict = false) {
  return s.replace(/\{(\w+)\}/g, (m, k) => {
    const v = vars[k];
    if (v == null || v === '') { if (strict) throw new Error(`no value for {${k}} in "${s}"`); return ''; }
    return String(v);
  }).replace(/\s+([.,!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}

// the lines that can be said: every {slot} in them has a value (a line about a player needs a player, one about a score needs the score)
export const usable = (pool, vars) => pool.filter(l => [...l.matchAll(/\{(\w+)\}/g)].every(m => vars[m[1]] != null && vars[m[1]] !== ''));

// a line nobody has heard lately: the career remembers the last ones (the same list the older Chirp lines use)
export function fresh(c, pool, rng) {
  const recent = c.chirp.recent || (c.chirp.recent = []);
  let cand = pool.filter(l => !recent.includes(l));
  if (!cand.length) cand = [pool.reduce((best, l) => (recent.indexOf(l) < recent.indexOf(best) ? l : best))];
  const line = cand[rng.int(0, cand.length - 1)];
  const at = recent.indexOf(line); if (at >= 0) recent.splice(at, 1);
  recent.push(line);
  if (recent.length > 260) recent.shift();
  return line;
}

// the pool of a moment for a persona: what he likes, else something near it
const FALLBACK = ['warm', 'stat', 'wry', 'old', 'hype', 'rage', 'rival'];
export function poolOf(type, persona, good) {
  const W = WORDS[type];
  if (!W) return [];
  const want = (REGISTER[persona] || REGISTER.nerd)[good ? 'good' : 'bad'];
  for (const k of [want, ...FALLBACK]) if (W[k]?.length) return W[k];
  return Object.values(W).flat();
}
const has = (type, reg) => !!WORDS[type]?.[reg]?.length;

// his own words around a line
// his own words around a line: an opener before it (the line's first letter drops to lower case after a comma, unless it starts with a name) and a closer after it
const decorate = (text, persona, vars, rng, odds = 0.3, raw = '', good = true) => {
  let out = text;
  const side = good ? 'good' : 'bad', o = OPENERS[persona]?.[side], c2 = CLOSERS[persona]?.[side];
  if (o && rng.chance(odds)) {
    const op = fill(o[rng.int(0, o.length - 1)], vars), keep = raw.startsWith('{') || /^I[\s']/.test(raw) || /^[A-Z]{2,}/.test(raw) || /^[0-9]/.test(raw);
    out = `${op} ${/[,:]$/.test(op) && !keep ? out[0].toLowerCase() + out.slice(1) : out}`;
  }
  if (c2 && rng.chance(odds)) out = `${out} ${fill(c2[rng.int(0, c2.length - 1)], vars)}`;
  return out.replace(/\s{2,}/g, ' ').trim();
};
const tagOf = name => `#${String(name).replace(/[^A-Za-z0-9]+/g, '')}`;
export const baseVars = (c, fact, extra = {}) => ({ ...fact.vars, ...extra });

// a post about a fact, by a persona
export function compose(c, fact, persona, rng, vars, { decorated = true, odds = 0.3 } = {}) {
  const all = poolOf(fact.type, persona, fact.good), pool = usable(all, vars);
  const line = fresh(c, pool.length ? pool : all, rng), text = fill(line, vars);
  return decorated && fact.group !== 'story' ? decorate(text, persona, vars, rng, odds, line, fact.good) : text;
}

// the replies under a post about a fact: who speaks (a persona each) and what kind of thing he says
export function replyPlan(fact, rng, n = 3) {
  const good = fact.good;
  const crowd = good ? ['hype', 'nerd', 'loyal', 'joker', 'old'] : ['grumpy', 'loyal', 'joker', 'old', 'doubter'];
  const rivalOk = fact.group !== 'mem' && fact.group !== 'table' && has(fact.type, 'rival');
  const pool = [...crowd];
  for (let i = pool.length - 1; i > 0; i--) { const j = rng.int(0, i); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const picks = pool.slice(0, Math.max(0, n - (rivalOk && n >= 3 ? 1 : 0)));
  if (rivalOk && n >= 3) picks.push('rival');
  // what each says: the first, about the thing itself; then a general reaction; then a number from memory when there is one
  const kinds = ['fact', 'reply', 'callback', 'fact', 'reply'];
  return picks.map((persona, i) => ({ persona, kind: persona === 'rival' ? 'fact' : kinds[i % kinds.length] }));
}

// the memory, spoken: a line with a number in it, if there is something to say. Null when there is nothing worth remembering.
export function callbackFor(c, fact, rng, vars) {
  const v = fact.vars, opts = [];
  if (fact.type === 'duck' || fact.type === 'goldenDuck' || fact.type === 'duckCount') { if (v.ducks >= 2) opts.push('ducks'); }
  if (v.sruns >= 30 && ['bigKnock', 'masterclass', 'blitz', 'sixFest', 'finisher', 'notOutHero', 'seasonRuns', 'capRace'].includes(fact.type)) opts.push('seasonRuns');
  if (v.swk >= 2 && ['twoWickets', 'cleanSweep', 'wicketMaiden', 'tight', 'hatTrick', 'nearHat', 'seasonWkts', 'formBowl'].includes(fact.type)) opts.push('seasonWkts');
  if (v.cruns >= 100 && ['careerRuns', 'bigKnock', 'masterclass'].includes(fact.type)) opts.push('careerRuns');
  if (v.last) opts.push('lastScores');
  if (v.k >= 3 && ['formBat', 'formBowl', 'slumpBat', 'dryBowl'].includes(fact.type)) opts.push('streak');
  if (!opts.length) return null;
  const key = opts[rng.int(0, opts.length - 1)];
  const all = CALLBACK[key], pool = usable(all, { ...vars, p: v.p });
  return pool.length ? fill(fresh(c, pool, rng), { ...vars, p: v.p }) : null;
}

// a general reaction to a moment (good or bad), in a persona's register
export function reactionFor(c, fact, persona, rng, vars) {
  const reg = (REGISTER[persona] || REGISTER.nerd)[fact.good ? 'good' : 'bad'];
  const set = (fact.group === 'story' ? REPLY_STORY : vars.p ? REPLY : REPLY_TEAM)[fact.good ? 'good' : 'bad'];
  const all = set[reg] || set.warm || Object.values(set).flat(), pool = usable(all, vars);
  const line = fresh(c, pool.length ? pool : all, rng);
  return decorate(fill(line, vars), persona, vars, rng, 0.2, line, fact.good);
}

// the club's journey, said when something big happens: from where it started (c.history). Null when the club has not changed division.
export function journeyLine(c, rng, vars) {
  const v = vars;
  if (!v.from || !v.div || v.from === v.div) return null;
  const pool = usable(JOURNEY, v);
  return pool.length ? fill(fresh(c, pool, rng), v) : null;
}
// a shout-out for one player at the end of a post about the match
export function shoutFor(c, fact, persona, rng, vars) {
  const reg = (REGISTER[persona] || REGISTER.nerd)[fact.good ? 'good' : 'bad'], set = SHOUT[fact.good ? 'good' : 'bad'];
  const pool = usable(set[reg] || set.warm, vars);
  return pool.length ? fill(fresh(c, pool, rng), vars) : null;
}
export { tagOf };
