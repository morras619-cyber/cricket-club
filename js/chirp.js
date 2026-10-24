// Chirp: the feed of the Super League career. Your rivals, the press and the fans post about your club, and the fans of every club reply.
// Also your club's popularity: followers (how big the club is) and buzz (how hot it is right now). Pure data and functions; the state
// lives in the career (c.chirp), js/career.js calls in and js/main.js draws the feed. Always PG.
import { makeRng } from './rng.js';
import { teamById } from './teams.js';

// ---------- the faces (img/chirp/avatars.webp: one atlas, 128 px a face, 8 to a row: the fans first, then the press) ----------
export const ATLAS = { cols: 8, size: 128 };
// [name, handle, mood, gender]: mood is the face (cheer, calm, angry, shocked), so the words can match it
export const FANS = [
  ['Arjun Mehta', 'arjun_sixes', 'cheer', 'm'], ['Winston Clarke', 'oldwinston', 'calm', 'm'], ['Ravi Kumar', 'ravi_roars', 'cheer', 'm'], ['Priya Nair', 'priya_pavilion', 'cheer', 'f'],
  ['Aisha Khan', 'aisha_inswing', 'calm', 'f'], ['Kenji Tan', 'kenji_cricket', 'cheer', 'm'], ['Meera Joshi', 'meera_mad', 'angry', 'f'], ['Dev Patel', 'dev_in_the_stands', 'calm', 'm'],
  ['Imran Siddiqui', 'imran_ultra', 'angry', 'm'], ['Sana Mirza', 'sana_shouts', 'cheer', 'f'], ['Lakshmi Rao', 'lakshmi_laughs', 'cheer', 'f'], ['Graham Hill', 'graham_googly', 'calm', 'm'],
  ['Tom Fletcher', 'tomfletcher_', 'calm', 'm'], ['Jack Rowe', 'jackrowe9', 'cheer', 'm'], ['Luca Bell', 'luca_late_cut', 'calm', 'm'], ['Ollie Park', 'ollie_omg', 'shocked', 'm'],
  ['Kofi Mensah', 'kofi_k6', 'cheer', 'm'], ['Marcus Dean', 'marcus_mid_on', 'calm', 'm'], ['Jamal Reid', 'jamal_jaffa', 'angry', 'm'], ['Andre Lewis', 'andre_covers', 'calm', 'm'],
  ['Omar Farooq', 'omar_oval', 'cheer', 'm'], ['Sam Perera', 'sam_slog', 'cheer', 'm'], ['Ali Raza', 'ali_astonished', 'shocked', 'm'], ['Camila Ortiz', 'cami_catches', 'cheer', 'f'],
  ['Imani Brooks', 'imani_in_form', 'calm', 'f'], ['Mei Lin', 'meilin_matchday', 'cheer', 'f'], ['Zawadi Okoro', 'zawadi_z', 'angry', 'f'], ['Anjali Verma', 'anjali_batting', 'cheer', 'f'],
  ['Sofia Alvarez', 'sofia_scoreboard', 'cheer', 'f'], ['Nia Thompson', 'nia_never_out', 'cheer', 'f'], ['Kavita Iyer', 'kavita_keeper', 'calm', 'f'], ['Yuki Sato', 'yuki_yorker', 'shocked', 'f'],
  ['Amara Diallo', 'amara_arc', 'cheer', 'f'], ['Tayla Brown', 'tayla_third_man', 'calm', 'f'], ['Leila Haddad', 'leila_long_on', 'cheer', 'f'], ['Chloe Grant', 'chloe_cover_drive', 'cheer', 'f'],
  ['Emma Walsh', 'emma_extra_cover', 'cheer', 'f'], ['Kate Morgan', 'kate_the_crease', 'angry', 'f'],
];
// [name, outlet]: the press, after the fans in the atlas
export const PRESS = [
  ['Neha Kapoor', 'Cricket Daily'], ['Richard Hale', 'The Pavilion Post'], ['Daniel Cole', 'Crease Weekly'], ['Marcus Bell', 'Boundary TV'], ['Peter Lang', 'The Pavilion Post'],
  ['Adrian Shaw', 'Stumps Radio'], ['Zainab Qureshi', 'Boundary TV'], ['Mina Cho', 'Cricket Daily'], ['Rani Das', 'Crease Weekly'], ['Abena Owusu', 'Boundary TV'],
  ['Helen Marsh', 'Stumps Radio'], ['Carol Weston', 'The Pavilion Post'], ['Naomi Carter', 'Boundary TV'],
];
export const faceOfFan = i => i;
export const faceOfPress = i => FANS.length + i;
// the CSS for a face (a div with the atlas as its background): the position of face n
export const ATLAS_ROWS = Math.ceil((FANS.length + PRESS.length) / ATLAS.cols);
export const faceStyle = n => `background-position: ${(n % ATLAS.cols) / (ATLAS.cols - 1) * 100}% ${Math.floor(n / ATLAS.cols) / (ATLAS_ROWS - 1) * 100}%`;

const hash = s => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
export const handleOf = name => '@' + String(name).replace(/[^A-Za-z0-9]+/g, '');

// 12400 -> 12.4K, 3200000 -> 3.2M
export function compact(n) {
  n = Math.max(0, Math.round(n));
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (n >= 1e4) return `${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '')}K`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

// ---------- popularity ----------
export const START_FANS = 900;
export const freshChirp = () => ({ fans: START_FANS, buzz: 0.25, feed: [], posts: 0 });
export const ensureChirp = c => (c.chirp || (c.chirp = freshChirp()));
// how many follow a club: the giants have millions, a Division 3 side a few thousand (your own club's number is the one that grows)
export function followersOf(c, id) {
  if (c.club && id === c.club) return ensureChirp(c).fans;
  const t = teamById(id), base = t.div === 'd3' ? 26000 : t.div === 'd2' ? 140000 : ({ 4: 3400000, 3: 1700000, 2: 900000, 1: 450000 }[t.tier] || 450000);
  return Math.round(base * (1 + 0.1 * (c.titles?.[id] || 0)));
}
// the buzz around the club, 0 (silent) to 1 (the talk of the league), as a word
export const buzzWord = b => (b > 0.8 ? 'On fire' : b > 0.6 ? 'Hot' : b > 0.4 ? 'Warm' : b > 0.2 ? 'Quiet' : 'Cold');
// the match is over: the club's followers and buzz move. Returns how many followers it gained (negative: lost).
export function afterMatchPopularity(c, { won, derby = false, bigWin = false, upset = false }) {
  const P = ensureChirp(c), before = P.fans;
  if (won) {
    P.fans += Math.round(P.fans * 0.012 * (derby ? 2 : 1) * (upset ? 1.6 : 1) + 40);
    P.buzz = Math.min(1, P.buzz + 0.12 + (derby ? 0.08 : 0) + (bigWin ? 0.05 : 0));
  } else {
    P.fans = Math.max(100, P.fans - Math.round(P.fans * 0.004));
    P.buzz = Math.max(0, P.buzz - 0.1);
  }
  P.buzz += (0.3 - P.buzz) * 0.04;   // (it cools towards the middle, slowly)
  return P.fans - before;
}
// a promotion, a title or a relegation moves the whole club
export function seasonPopularity(c, ev) {
  const P = ensureChirp(c);
  const k = { promoted: 1.25, champion: 1.4, relegated: 0.85, playoffWon: 1.08 }[ev];
  if (k) P.fans = Math.round(P.fans * k);
  if (ev === 'promoted' || ev === 'champion') P.buzz = Math.min(1, P.buzz + 0.3);
  if (ev === 'relegated') P.buzz = Math.max(0, P.buzz - 0.3);
}
// what a big club is worth to its sponsors: extra money every season ($M), up to a cap
export const SPONSOR_PER_100K = 0.5, SPONSOR_CAP = 6;
export const sponsorBonus = c => Math.min(SPONSOR_CAP, Math.round((ensureChirp(c).fans / 100000) * SPONSOR_PER_100K * 20) / 20);
// the home crowd: 0 (a few hundred) to 1 (a stadium roaring), from the fans and the buzz. It lifts your timing a little at home.
export const crowdOf = c => {
  const P = ensureChirp(c);
  return Math.max(0, Math.min(1, Math.log10(Math.max(P.fans, 1000) / 1000) / 3 * 0.7 + P.buzz * 0.3));
};
export const CROWD_TIMING = 0.08;   // (a full house widens your timing windows by this much)

// ---------- the words of the fans ----------
// {me}: your club, {they}: the other club, {sp}: who posted
const SAY = {
  mine: {
    win: ['WHAT A WIN! {me} are on fire 🔥', 'Told you! Never doubted them. 👏', 'That is why I pay for the season ticket!', 'Pinch me. Are we really playing this well?', 'Pure class from the lads today.', 'Top of my feed all night. 😍', 'I have not stopped smiling since the last ball.', 'Take a bow, {me}!'],
    loss: ['We go again. Heads up, lads.', 'Still proud of this team. Next one is ours.', 'Bowlers need to find their lines. Fix it and we fly.', 'Bad day. Not a bad team.', 'Sleep on it, then come back stronger.', 'That hurt. But we are not done.', 'Pressure builds diamonds. Let us get on with it.'],
    taunt: ['Bold words from {they}. Wait until we meet at full strength.', 'Say it again after the scoreboard says so. 😤', 'Careful, {sp}. Talk is cheap and we are listening.', 'We will see who is laughing in the table, {they}.', 'The nerve! {me}, show them. 💪', 'Enjoy the talk while it lasts, {they}.'],
    star: ['Our captain, everybody. Love this club. ❤️', 'Heart of the team, that one.', 'Give him the armband forever.'],
    milestone: ['WE DID IT!! {me} forever! 🎉', 'Cannot believe I am watching this live. What a season.', 'Years of waiting. Worth every minute. 😭', 'Pop the confetti, we have earned this!', 'My whole street is up. Unreal scenes.'],
  },
  rival: {
    taunt: ['Tell them, {sp}! ⚡', 'Nobody does it like {they}.', 'Savage. I love this club. 😂', 'Rent free in their heads.', '{they} until I die!', 'Respect the champions, {me}.'],
    win: ['Lucky bounce, {me}. See you in the return. 😂', 'Do not frame the scorecard.', 'Okay, fair play. This time.', 'Enjoy it for a day, {me}.', 'We will be back. Count on it.'],
    loss: ['Better luck next time, {me}!', 'Class is permanent. 😎', 'Not even close today.', 'That is a gap, {me}. Mind it.'],
  },
  neutral: {
    funny: ['The banter in this league is elite. 😂', 'I came for the cricket, staying for the drama.', 'This rivalry is better than my soap opera.', 'Grabbing popcorn for the next one. 🍿', 'This feed is unreal today.'],
    shock: ['WAIT, WHAT?!', 'Did that just happen?!', 'I need to sit down. 😳', 'No way. No way!', 'Unbelievable scenes.'],
    praise: ['Great cricket from {me} today. Credit where it is due.', 'The standard in this league keeps climbing.', 'Fair play, {me}. That was a proper performance.', 'Match of the week, easily.', 'That is why I love this game.'],
    sad: ['Tough one. Respect to both sides.', 'Cricket can be cruel sometimes.', 'Hard luck, {me}. Hold your heads high.'],
  },
};
const fill = (s, v) => s.replace(/\{me\}/g, v.me).replace(/\{they\}/g, v.they).replace(/\{sp\}/g, v.sp);
const pickFrom = (arr, rng) => arr[rng.int(0, arr.length - 1)];

// n comments for a post. kind: 'taunt' (a rival at you), 'win', 'loss', 'milestone', 'star', 'fan'. Who answers, and in what mood, follows the face.
export function commentsFor(c, post, rng, n = 3) {
  const me = teamById(c.club).name, they = post.by?.club ? teamById(post.by.club).name : '', sp = post.by?.name || '';
  const v = { me, they, sp };
  const used = new Set(post.by?.type === 'fan' ? [post.by.face] : []), out = [];   // (a fan does not reply to himself)
  const take = (pred, group, key) => {
    const pool = FANS.map((f, i) => [f, i]).filter(([f, i]) => !used.has(i) && pred(f));
    const [f, i] = pool.length ? pickFrom(pool, rng) : FANS.map((f2, i2) => [f2, i2]).filter(([, i2]) => !used.has(i2))[0];
    used.add(i);
    const lines = SAY[group][key];
    out.push({ face: faceOfFan(i), name: f[0], handle: '@' + f[1], text: fill(pickFrom(lines, rng), v), side: group });
  };
  const mood = (...m) => f => m.includes(f[2]);
  const any = () => true;
  switch (post.kind) {
    case 'taunt':
      take(mood('angry', 'shocked'), 'mine', 'taunt'); take(mood('cheer'), 'rival', 'taunt'); take(any, 'neutral', 'funny'); if (n > 3) take(mood('shocked', 'cheer'), 'neutral', 'shock');
      break;
    case 'win':
      take(mood('cheer'), 'mine', 'win'); take(mood('cheer', 'calm'), 'mine', 'win'); take(mood('angry', 'calm'), 'rival', 'win'); if (n > 3) take(any, 'neutral', 'praise');
      break;
    case 'loss':
      take(mood('calm', 'angry'), 'mine', 'loss'); take(mood('cheer'), 'rival', 'loss'); take(mood('calm'), 'neutral', 'sad'); if (n > 3) take(mood('calm', 'cheer'), 'mine', 'loss');
      break;
    case 'milestone':
      take(mood('cheer'), 'mine', 'milestone'); take(mood('cheer'), 'mine', 'milestone'); take(mood('shocked', 'cheer'), 'neutral', 'praise');
      break;
    case 'star':
      take(mood('cheer'), 'mine', 'star'); take(mood('cheer', 'calm'), 'neutral', 'praise');
      break;
    default:
      take(any, 'neutral', 'funny'); take(any, 'neutral', 'praise');
  }
  return out.slice(0, n);
}

// ---------- posts ----------
// a post: who, what, how loved. Likes follow the poster's reach and the buzz; the same post always has the same numbers.
function reachOf(c, by) {
  if (by.type === 'press') return 380000;
  if (by.type === 'fan') return 600 + (hash(by.name) % 2500);
  return Math.round(followersOf(c, by.club) * (by.type === 'star' ? 0.35 : 0.8));
}
export function engagement(c, by, salt) {
  const rng = makeRng(hash(`${c.seed}|${salt}|${by.name}`));
  const buzz = ensureChirp(c).buzz;
  const likes = Math.max(3, Math.round(reachOf(c, by) * rng.range(0.018, 0.06) * (0.65 + buzz * 0.7)));
  return { likes, shares: Math.max(0, Math.round(likes * rng.range(0.06, 0.16))), replies: Math.max(1, Math.round(likes * rng.range(0.02, 0.07))) };
}
export function addPost(c, { by, text, kind, salt, n = 3, pic = null }) {
  const P = ensureChirp(c);
  P.posts++;
  const rng = makeRng(hash(`${c.seed}|${c.season}|${P.posts}|${kind}|${text}`));
  const post = { id: P.posts, season: c.season, kind, by, text, pic, ...engagement(c, by, salt || `${kind}${P.posts}`) };
  post.comments = commentsFor(c, post, rng, n);
  P.feed = [post, ...P.feed].slice(0, 40);
  return post;
}

// the rival's message (js/rivals.js) as a post on Chirp
export function postFromMessage(c, msg, kind = 'taunt') {
  const t = teamById(msg.from);
  return addPost(c, { by: { type: 'star', club: msg.from, name: msg.who, handle: handleOf(msg.who), verified: true }, text: msg.text, kind, salt: `msg${msg.event}` });
}

// the press, after your match: the score, and a line on how it went
export function postMatch(c, { me, they, mine, theirs, won, tie = false }) {
  const rng = makeRng(hash(`${c.seed}|${c.season}|${me}|${they}|${mine}|${theirs}`));
  const [name, outlet] = PRESS[rng.int(0, PRESS.length - 1)];
  const close = Math.abs(parseInt(mine, 10) - parseInt(theirs, 10)) <= 6;
  const tail = won ? (close ? 'A thriller to the last ball! 🔥' : 'A statement win. 💪') : (close ? 'So close. Heartbreak. 💔' : 'Not their day.');
  const text = `FT: ${teamById(me).name} ${mine} ${won ? 'beat' : tie ? 'tie with' : 'lose to'} ${teamById(they).name} ${theirs}. ${tail}`;
  const pi = PRESS.findIndex(p => p[0] === name);
  return addPost(c, { by: { type: 'press', name, handle: handleOf(name), outlet, verified: true, face: faceOfPress(pi) }, text, kind: won ? 'win' : 'loss', salt: `ft${c.season}${they}` });
}
// a fan of your club, after the match
export function postFan(c, { won }, rng) {
  const i = rng.int(0, FANS.length - 1), f = FANS[i];
  const line = pickFrom(won ? SAY.mine.win : SAY.mine.loss, rng);
  return addPost(c, { by: { type: 'fan', name: f[0], handle: '@' + f[1], face: faceOfFan(i) }, text: fill(line, { me: teamById(c.club).name, they: '', sp: '' }), kind: 'fan', n: 2, salt: `fan${c.season}${i}` });
}
// the season's big moments, from the press
export function postMilestone(c, text) {
  const rng = makeRng(hash(`${c.seed}|ms|${c.season}|${text}`));
  const pi = rng.int(0, PRESS.length - 1), [name, outlet] = PRESS[pi];
  return addPost(c, { by: { type: 'press', name, handle: handleOf(name), outlet, verified: true, face: faceOfPress(pi) }, text, kind: 'milestone', salt: `ms${c.season}` });
}
