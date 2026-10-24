// The Super League career's rivals: your nemesis (Thunder Strikers, the dynasty at the top) and, in every division, the club that
// is your rival there. They talk to you: before you meet, after you meet, and as you climb. Pure data and functions; the state
// lives in the career (c.rivals). career.js and main.js call in; nothing here imports them.
import { makeRng } from './rng.js';
import { teamById } from './teams.js';
import { ovr } from './squads.js';
import { heroById } from './heroes.js';
import { postFromMessage } from './chirp.js';

export const NEMESIS = 'thunder';
const FALLBACK = 'cyclones';          // (the nemesis when you ARE Thunder)
const INBOX_MAX = 30;

const hash = s => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };

// ---------- who is who ----------
export const nemesisOf = c => (c.club === NEMESIS ? FALLBACK : NEMESIS);
export const freshRivals = () => ({ div: null, since: 0, h2h: {}, inbox: [], said: {} });
// a club's star speaks for it (the same face every time); a lower club has no star, so its best player does
export function speakerOf(c, clubId) {
  const star = teamById(clubId).star && heroById(teamById(clubId).star);
  if (star) return star.name;
  const best = Object.values(c.players || {}).filter(p => p.team === clubId && !p.retired).sort((a, b) => ovr(b) - ovr(a))[0];
  return best ? best.name : teamById(clubId).name;
}

// the club in your division that is your rival: it stays your rival while you share a division; a new one is picked when you move.
// Closer in strength counts, and a club that has beaten you counts more.
export function pickDivisionRival(c, ratingOf, divisionIds) {
  const me = ratingOf(c.club);
  const nem = nemesisOf(c), mine = divisionIds.filter(id => id !== c.club);
  const pool = mine.filter(id => id !== nem).length ? mine.filter(id => id !== nem) : mine;
  const score = id => {
    const h = c.rivals.h2h[id] || { w: 0, l: 0 };
    return -Math.abs(ratingOf(id) - me) + 4 * h.l + (hash(`${c.seed}-${id}`) % 100) / 100;
  };
  return [...pool].sort((a, b) => score(b) - score(a))[0] || null;
}

// make sure the career has rivals, and that the division rival is in your division. Returns the new division rival if it changed.
export function ensureRivals(c, ratingOf, divisionIds) {
  if (!c.club) return null;
  if (!c.rivals) c.rivals = freshRivals();
  const R = c.rivals;
  if (R.div && divisionIds.includes(R.div) && R.div !== c.club) return null;
  const next = pickDivisionRival(c, ratingOf, divisionIds);
  if (!next || next === R.div) return null;
  R.div = next; R.since = c.season;
  return next;
}

// 'nemesis', 'division' or null
export function rivalKind(c, id) {
  if (!c.rivals || !id) return null;
  return id === nemesisOf(c) ? 'nemesis' : id === c.rivals.div ? 'division' : null;
}

// ---------- the record between you and a club ----------
export function recordMeeting(c, oppId, won) {
  if (!c.rivals) c.rivals = freshRivals();
  const h = c.rivals.h2h[oppId] || (c.rivals.h2h[oppId] = { w: 0, l: 0, run: 0, last: null });
  if (won) { h.w++; h.run = h.run > 0 ? h.run + 1 : 1; } else { h.l++; h.run = h.run < 0 ? h.run - 1 : -1; }
  h.last = won ? 'W' : 'L';
  return h;
}
export const meetings = (c, id) => c.rivals?.h2h?.[id] || { w: 0, l: 0, run: 0, last: null };

// ---------- the voices ----------
// {me}: your club, {they}: the rival's club. Playful comic-book trash talk, nothing worse.
export const LINES = {
  nemesis: {
    intro: [
      'Division 3, is it? Cute. Come and find us at the top, {me}.',
      'We heard a new club had turned up. Do try to make it interesting.',
      'The Thunderdome has a seat for you in the stands. It is the only seat you will get.',
    ],
    watch: [
      'Another win, {me}? We saw. We were not worried.',
      'Keep winning. It makes the day we meet more fun.',
      'Nice run. The table does not scare us. Neither do you.',
      'Someone has been busy. We are still the ones with the trophies.',
      'Enjoy the view from down there. It is a long way up.',
    ],
    top: [
      'Top of the table? Hold on to it, {me}. Nobody keeps it from us for long.',
      'Top already? Then you will be hungry. We like hungry. We eat it.',
      'Lovely. A league leader who has never seen a real crowd.',
    ],
    promoted: [
      'Welcome up, {me}. The air is thinner, and we are the reason.',
      'You made it. Now the real match begins.',
      'Promoted? Well done. Now stand where we can see you.',
      'New division, same old story: it ends with us.',
    ],
    relegated: [
      'Down again? The Thunderdome sends its regards, {me}.',
      'We would say sorry, but we are not.',
      'Come back when you have learned to finish.',
    ],
    champion: [
      'A trophy in your division? Impressive. Now do it where it counts.',
      'Champions, are you? Of that? Send us a photo.',
      'Fine. You won something. Come and try to win it from us.',
    ],
    pre: [
      'Tonight the Thunderdome roars. Bring a brave face, {me}.',
      'Four seasons of trophies say we win. Your move.',
      'We have been waiting for you, {me}. Do not disappoint us.',
      'You wanted a shot at the champions. Here it is. Do not waste it.',
      'Lightning does not ask permission. See you out there.',
    ],
    theyWon: [
      'That is how it is done, {me}. Take notes.',
      'Close? Not really. Come back when it is.',
      'Thunder strikes twice. Ask anyone.',
      'Better luck next time. Or the time after.',
      'The gap is where it was. Mind it.',
    ],
    youWon: [
      'Enjoy it, {me}. It is the only one you will get.',
      'A fluke. We will fix it next time.',
      'Fine. You earned that one. Do not get used to it.',
      'Do not frame the scorecard. It will not happen twice.',
      'Well played. Rematch. Now.',
    ],
  },
  division: {
    new: [
      'This division is not big enough for both of us, {me}.',
      'We have marked you as the club to beat. We say so loudly.',
      'Everyone says you are the one to watch. We will see about that.',
    ],
    pre: [
      'We have been waiting for this one, {me}. Bring your best.',
      'Last time was luck. This time is a lesson.',
      'Our fans have circled this date. Do not disappoint them.',
      'You talk a good game. Let us see you play it.',
      '{they} do not lose this fixture. Remember that.',
    ],
    theyWon: [
      'Better luck next time, {me}. Or the time after.',
      'That is the gap, {me}. Mind it.',
      'We told you. Nobody listens until it is too late.',
      'Good effort. Not good enough.',
      'Was that your best? Truly?',
    ],
    youWon: [
      'All right, you won. Enjoy it for a day.',
      'We will see you in the return. Properly this time.',
      'Lucky bounce, {me}. Do not frame the scorecard.',
      'Fine. Now it is personal.',
      'You beat us. You did not beat us twice.',
    ],
    streak: [
      'Again? Fine, {me}. We are not laughing anymore.',
      'Three in a row. Someone call the groundsman. This is rigged.',
    ],
  },
};
const fill = (s, c, they) => s.replaceAll('{me}', teamById(c.club).name).replaceAll('{they}', teamById(they).name);

// a line for an event ('intro', 'watch', ...) spoken by a club of the given kind. The same career, the same event, the same
// moment always give the same line (so a screen drawn twice shows the same words), and the last line used is not repeated at once.
export function line(c, kind, event, clubId, salt = '') {
  const pool = LINES[kind]?.[event];
  if (!pool) return null;
  const rng = makeRng(hash(`${c.seed}|${c.season}|${event}|${clubId}|${salt}`));
  const last = c.rivals?.said?.[`${kind}.${event}`];
  const idxs = pool.map((_, i) => i).filter(i => pool.length < 2 || i !== last);
  const i = idxs[rng.int(0, idxs.length - 1)];
  return { text: fill(pool[i], c, clubId), index: i };
}

// the message in the inbox: from a club, spoken by its best player
export function say(c, kind, event, clubId, salt = '') {
  const l = line(c, kind, event, clubId, salt);
  if (!l) return null;
  if (!c.rivals) c.rivals = freshRivals();
  c.rivals.said[`${kind}.${event}`] = l.index;
  const msg = { from: clubId, who: speakerOf(c, clubId), text: l.text, event, season: c.season };
  c.rivals.inbox = [msg, ...c.rivals.inbox].slice(0, INBOX_MAX);
  postFromMessage(c, msg, event === 'youWon' ? 'win' : 'taunt');   // (it is on Chirp too, with the fans replying)
  return msg;
}
export const messageNote = m => `📣 ${m.who} (${teamById(m.from).name}): "${m.text}"`;

// before the match: the rival's word on the fixture card (not stored: it is the same every time the card is drawn)
export function preMatch(c, oppId) {
  const kind = rivalKind(c, oppId);
  if (!kind) return null;
  const l = line(c, kind === 'nemesis' ? 'nemesis' : 'division', 'pre', oppId, `${meetings(c, oppId).w}-${meetings(c, oppId).l}`);
  return l && { kind, who: speakerOf(c, oppId), text: l.text, record: meetings(c, oppId) };
}

// the match is over: the record, and what the rival (or your nemesis, watching) has to say. Returns the messages added.
export function afterMatch(c, oppId, won, ratingOf, standing) {
  if (!c.rivals) c.rivals = freshRivals();
  const out = [];
  const h = recordMeeting(c, oppId, won);
  const kind = rivalKind(c, oppId);
  if (kind) {
    const k = kind === 'nemesis' ? 'nemesis' : 'division';
    out.push(say(c, k, won ? 'youWon' : 'theyWon', oppId, `${h.w}-${h.l}`));
    if (kind === 'division' && won && h.run >= 3) out.push(say(c, 'division', 'streak', oppId, `${h.w}`));
  } else {
    // your nemesis is watching: now and then, when you win, and when you go top
    const nem = nemesisOf(c), key = c.rivals.watchN = (c.rivals.watchN || 0) + (won ? 1 : 0);
    if (standing === 1 && c.rivals.topSeason !== c.season) { c.rivals.topSeason = c.season; out.push(say(c, 'nemesis', 'top', nem)); }
    else if (won && key % 3 === 0) out.push(say(c, 'nemesis', 'watch', nem, String(key)));
  }
  return out.filter(Boolean);
}
