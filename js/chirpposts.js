// Chirp's posts about what really happened: after a match (the moments found in js/chirpfacts.js) and after the big events of the club's story
// (a signing, a departure, a promotion). The words come from js/chirpvoice.js. career.js calls in; js/chirp.js keeps the feed.
import { makeRng } from './rng.js';
import { teamById } from './teams.js';
import { addPost, postMatch, postFan, commentsFor, FANS, PRESS, faceOfFan, faceOfPress, handleOf } from './chirp.js';
import { matchFacts, remember, noteEvent, make, memOf } from './chirpfacts.js';
import { compose, replyPlan, callbackFor, reactionFor, journeyLine, personaOfFan, shoutFor, tagOf, MOODS, WORDS } from './chirpvoice.js';

const hash = s => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
const pick = (a, rng) => a[rng.int(0, a.length - 1)];

// the club's names and numbers, for the words ({me}, {they}, {tag}, {mine}, {theirs}, {by})
const varsFor = (c, fact, ctx = {}) => ({
  me: teamById(c.club).name, they: ctx.opp ? teamById(ctx.opp).name : (fact.vars.they || ''), tag: tagOf(teamById(c.club).name),
  mine: ctx.mine, theirs: ctx.theirs, by: ctx.story?.by, n: ctx.story?.streak?.n, ...ctx.journey, ...fact.vars,
});

// a fan whose persona is this one (or whose face suits it), not one already in the thread
function fanFor(persona, used, rng) {
  const idx = FANS.map((f, i) => i).filter(i => !used.has(i));
  const exact = idx.filter(i => personaOfFan(FANS[i]) === persona), mood = idx.filter(i => (MOODS[persona] || []).includes(FANS[i][2]));
  const i = pick(exact.length ? exact : mood.length ? mood : idx, rng);
  used.add(i);
  return i;
}
const fanBy = i => ({ type: 'fan', name: FANS[i][0], handle: '@' + FANS[i][1], face: faceOfFan(i) });
const pressBy = rng => { const pi = rng.int(0, PRESS.length - 1), [name, outlet] = PRESS[pi]; return { type: 'press', name, handle: handleOf(name), outlet, verified: true, face: faceOfPress(pi) }; };

// who posts about a fact: the press for the big ones, a fan with the voice for it otherwise
const POSTERS = {
  good: { bat: ['hype', 'nerd', 'loyal', 'joker', 'old'], bowl: ['hype', 'nerd', 'loyal', 'joker', 'old'], team: ['hype', 'loyal', 'joker', 'nerd'], mem: ['nerd', 'hype', 'old', 'loyal'], table: ['hype', 'joker', 'old', 'loyal'], opp: ['nerd', 'old'], story: ['hype', 'loyal', 'joker', 'old'] },
  bad: { bat: ['grumpy', 'doubter', 'joker', 'nerd', 'old'], bowl: ['grumpy', 'doubter', 'joker', 'nerd'], team: ['grumpy', 'doubter', 'loyal', 'joker', 'old'], mem: ['grumpy', 'nerd', 'doubter', 'old'], table: ['grumpy', 'joker', 'old', 'loyal'], opp: ['grumpy', 'nerd', 'old', 'doubter'], story: ['grumpy', 'loyal', 'old', 'joker'] },
};

// the replies: each in his own voice, about the thing itself, a general reaction, a number from memory
function momentComments(c, post, fact, vars, rng, n) {
  const used = new Set(post.by?.type === 'fan' ? [FANS.findIndex(f => '@' + f[1] === post.by.handle)] : []);
  const plan = replyPlan(fact, rng, n), out = [];
  let journeyDone = false;
  for (const { persona, kind } of plan) {
    const i = fanFor(persona, used, rng), f = FANS[i];
    let text = null;
    if (!journeyDone && (persona === 'old' || persona === 'loyal') && ['promoted', 'champion', 'topSpot', 'beatTop', 'derbyWin', 'survivedPlayoff'].includes(fact.type) && rng.chance(0.7)) {
      text = journeyLine(c, rng, vars); journeyDone = !!text;
    }
    if (!text && kind === 'callback') text = callbackFor(c, fact, rng, vars);
    if (!text && kind === 'reply') {
      text = reactionFor(c, fact, persona, rng, vars);
      if (rng.chance(0.25) && post.by?.handle) text = `${post.by.handle} ${text}`;
    }
    if (!text) for (let t = 0; t < 3 && (!text || text === post.text); t++) text = compose(c, fact, persona, rng, vars, { odds: 0.2 });
    out.push({ face: faceOfFan(i), name: f[0], handle: '@' + f[1], text, side: persona });
  }
  return out;
}

// one post about one fact
function factPost(c, fact, rng, ctx, { press = false } = {}) {
  const good = fact.good, kind = fact.group;
  const vars = varsFor(c, fact, ctx);
  let by, persona;
  if (press) { by = pressBy(rng); persona = 'nerd'; }
  else {
    persona = pick((POSTERS[good ? 'good' : 'bad'][kind] || POSTERS[good ? 'good' : 'bad'].bat), rng);
    const used = new Set(), i = fanFor(persona, used, rng);
    by = fanBy(i);
  }
  let text = compose(c, fact, persona, rng, vars, { decorated: !press, odds: 0.3 });
  if (press) text = `${pick(['ANALYSIS:', 'MATCH REPORT:', 'TALKING POINT:', 'THE MOMENT:', 'FROM THE GROUND:'], rng)} ${text}`;
  return addPost(c, { by, text, kind: 'moment', n: 3, salt: `mom${c.season}${fact.type}${fact.pid || ''}`, fact, ctx: ctx.opp ? { they: ctx.opp, mine: ctx.mine, theirs: ctx.theirs, won: ctx.won } : null, comments: (post, r) => momentComments(c, post, fact, vars, r, 3) });
}

// "Player of the match" for the press report: the best good moment of one of mine
const potmLine = f => {
  const v = f.vars;
  if (f.group === 'bowl') return `Player of the match: ${v.pf} (${v.w}/${v.r}).`;
  if (f.type === 'finisher' || f.type === 'notOutHero') return `Player of the match: ${v.pf} (${v.runs}* off ${v.balls}).`;
  return `Player of the match: ${v.pf} (${v.runs} off ${v.balls}).`;
};

// the best of the day for the press report, from the scorecards: the top scorer and the best bowling of mine
function topLine(c, summary) {
  const mineIn = summary.innings.find(i => i.side === 'player'), theirIn = summary.innings.find(i => i.side === 'ai');
  const sur = id => String(c.players[id]?.name || '').split(' ').slice(-1)[0];
  const bat = [...(mineIn?.battingCard?.() || [])].filter(b => b.id && b.runs >= 12).sort((a, b) => b.runs - a.runs)[0];
  const bowl = [...(theirIn?.bowlingCard?.() || [])].filter(b => b.id && b.wkts >= 1).sort((a, b) => b.wkts - a.wkts || a.runs - b.runs)[0];
  const parts = [];
  if (bat) parts.push(`Top scorer: ${sur(bat.id)} ${bat.runs}${bat.out ? '' : '*'} (${bat.balls}).`);
  if (bowl) parts.push(`Best bowling: ${sur(bowl.id)} ${bowl.wkts}/${bowl.runs}.`);
  return parts.join(' ');
}

// after a match in the league: the press report, a fan's post, and the moments worth talking about. ctx: { won, opp, derby, mine, theirs, story, journey }
export function chirpAfterMatch(c, summary, ctx) {
  const mem = memOf(c), facts = matchFacts(c, summary, ctx);
  const me = c.club, rng = makeRng(hash(`${c.seed}|${c.season}|mom|${ctx.opp}|${ctx.mine}|${ctx.theirs}`));
  const potm = facts.find(f => f.good && f.side === 'mine' && f.pid && (f.group === 'bat' || f.group === 'bowl') && f.sal >= 60 && f.type !== 'nearHat');
  // what the fans talk about when they talk about the match: the best of the day, and (in defeat, or a bad day) the worst
  const worst = facts.find(f => !f.good && f.side === 'mine' && f.pid && (f.group === 'bat' || f.group === 'bowl') && f.sal >= 60);
  const talk = [potm, worst].filter(Boolean);
  const withFacts = (post, r) => {
    const base = commentsFor(c, post, r, 3);
    talk.slice(0, 2).forEach((f, i) => {
      const k = 1 + i, m = base[k], fan = m && FANS[m.face];
      if (!m || !fan) return;
      const persona = m.side === 'rival' ? 'rival' : personaOfFan(fan);
      if (!WORDS[f.type]) return;
      m.text = compose(c, f, persona, r, varsFor(c, f, ctx), { odds: 0.2 });
    });
    return base;
  };
  postMatch(c, { me, they: ctx.opp, mine: ctx.mine, theirs: ctx.theirs, won: ctx.won, story: ctx.story, extra: potm ? potmLine(potm) : topLine(c, summary), comments: withFacts });
  const fan = postFan(c, { won: ctx.won, they: ctx.opp, mine: ctx.mine, theirs: ctx.theirs, story: ctx.story, comments: withFacts }, rng);
  // (and the fan's own post ends with a shout-out)
  const shout = ctx.won ? potm : worst && rng.chance(0.7) ? worst : potm && rng.chance(0.4) ? potm : null;
  if (shout && fan?.by?.handle && rng.chance(0.75)) {
    const fi = FANS.findIndex(f => '@' + f[1] === fan.by.handle), line = fi >= 0 ? shoutFor(c, shout, personaOfFan(FANS[fi]), rng, varsFor(c, shout, ctx)) : null;
    if (line) fan.text = `${fan.text} ${line}`;
  }
  // up to three moments: the best ones, not the same player or the same thing twice, and not the same thing again so soon
  const done = mem.matches.length, chosen = [], players = new Set(), groups = {};
  for (const f of facts) {
    if (f.sal < 50 || chosen.length >= 3) continue;
    const key = `${f.type}:${f.pid || ''}`, last = mem.said[key];
    if (last != null && done - last < 3) continue;
    if (f.pid && players.has(f.pid)) continue;
    if ((groups[f.group] || 0) >= (f.group === 'team' ? 1 : 2)) continue;
    chosen.push(f); if (f.pid) players.add(f.pid); groups[f.group] = (groups[f.group] || 0) + 1;
    mem.said[key] = done;
  }
  chosen.forEach(f => factPost(c, f, rng, ctx, { press: f.sal >= 80 && rng.chance(0.55) }));
  const keys = Object.keys(mem.said); if (keys.length > 60) for (const k of keys.slice(0, keys.length - 60)) delete mem.said[k];
  remember(c, summary, ctx, facts);
  return chosen;
}

// ---------- the club's story ----------
const STORY_GOOD = new Set(['signedStar', 'signedBargain', 'signedBig', 'signedYoung', 'scouted', 'academy', 'promoted', 'champion', 'survivedPlayoff']);
const STORY_PRESS = new Set(['signedStar', 'signedBig', 'signedOverpay', 'promoted', 'champion', 'relegated', 'retired', 'survivedPlayoff']);
// an event of the club: { t: type, pid, price, they, pos, div, journey }. The player, if any, is c.players[ev.pid].
export function chirpStory(c, ev) {
  const mem = memOf(c);
  noteEvent(c, { t: ev.t, pid: ev.pid, price: ev.price, they: ev.they });
  const p = ev.pid ? c.players[ev.pid] : null;
  const fact = { ...make(ev.t, p, { left: ev.left, price: ev.price, they: ev.they ? teamById(ev.they).name : '', pos: ev.pos, div: ev.div, from: ev.journey?.from, yrs: ev.journey?.yrs }, mem, { noStar: true }), type: ev.t, group: 'story', good: STORY_GOOD.has(ev.t) };
  if (!WORDS[ev.t]) return null;
  const rng = makeRng(hash(`${c.seed}|${c.season}|story|${ev.t}|${ev.pid || ''}`));
  const press = STORY_PRESS.has(ev.t) && rng.chance(0.7);
  const vars = { ...varsFor(c, fact, {}), ...(ev.journey || {}), div: ev.div || ev.journey?.div, price: ev.price > 0 ? `$${(Math.round(ev.price * 100) / 100).toFixed(2).replace(/\.?0+$/, '')}M` : '' };
  const post = (() => {
    let by, persona;
    if (press) { by = pressBy(rng); persona = 'nerd'; }
    else { persona = pick(POSTERS[fact.good ? 'good' : 'bad'].story, rng); by = fanBy(fanFor(persona, new Set(), rng)); }
    let text = compose(c, fact, persona, rng, vars, { decorated: !press });
    if (press) text = `${ev.t.startsWith('signed') || ev.t === 'scouted' ? (ev.t === 'signedOverpay' ? 'SIGNING: ' : 'NEW SIGNING: ') : ev.t === 'retired' ? 'RETIRES: ' : ev.t === 'promoted' ? 'PROMOTED: ' : ''}${text}`;
    return addPost(c, { by, text, kind: 'moment', n: 3, salt: `story${c.season}${ev.t}${ev.pid || ''}`, fact, comments: (po, r) => momentComments(c, po, fact, vars, r, 3) });
  })();
  return post;
}

// the season's big moments, from the press, with the fans' memory of the journey in the replies
export function chirpMilestone(c, text, ev, extra = {}) {
  const mem = memOf(c);
  const fact = { type: ev, group: 'story', good: STORY_GOOD.has(ev), pid: null, vars: { pos: extra.pos, div: extra.div, from: extra.journey?.from, yrs: extra.journey?.yrs } };
  const rng = makeRng(hash(`${c.seed}|ms|${c.season}|${text}`));
  const vars = { ...varsFor(c, fact, {}), ...(extra.journey || {}), div: extra.div || extra.journey?.div, pos: extra.pos };
  noteEvent(c, { t: ev });
  void mem;
  return addPost(c, { by: pressBy(rng), text, kind: 'milestone', n: 4, salt: `ms${c.season}${ev}`, fact, comments: (po, r) => momentComments(c, po, fact, vars, r, 4) });
}
