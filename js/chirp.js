// Chirp: the feed of the Super League career. Your rivals, the press and the fans post about your club, and the fans of every club reply.
// Also your club's popularity: followers (how big the club is) and buzz (how hot it is right now). Pure data and functions; the state
// lives in the career (c.chirp), js/career.js calls in and js/main.js draws the feed. Always PG.
import { makeRng } from './rng.js';
import { teamById } from './teams.js';
import { PORTRAIT_KEYS, PORTRAIT_ATLAS } from './portraits-list.js';
import { ovr } from './squads.js';

// ---------- the faces (img/chirp/avatars.webp: one atlas, 160 px a face, 8 to a row: the fans first, then the press) ----------
export const ATLAS = { cols: 8, size: 160 };
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

// the painted portrait (a cut-out with no background) of the best player of a club who has one, for the club's own posts; null if there is none
const FILE_PORTRAITS = new Set(PORTRAIT_KEYS.filter(k => !PORTRAIT_ATLAS[k]));
const kebab = n => String(n).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export function bannerFace(c, clubId) {
  const best = Object.values(c.players || {}).filter(p => p.team === clubId && !p.retired && FILE_PORTRAITS.has(kebab(p.name))).sort((a, b) => ovr(b) - ovr(a))[0];
  return best ? `img/cards/portraits/${kebab(best.name)}.webp` : null;
}

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
// {me}: your club, {they}: the other club, {sp}: who posted, {mine} {theirs}: the scores, {margin}: runs between them (only in lines about a match)
// Replies and posts are different pools, so the same words are not heard twice; the last 90 lines said are not chosen again.
const SAY = {
  mine: {
    win: ['WHAT A WIN! {me} are on fire 🔥', 'Told you! Never doubted them. 👏', 'That is why I pay for the season ticket!', 'Pinch me. Are we really playing this well?', 'Pure class from the lads today.',
      'I have not stopped smiling since the last ball.', 'Take a bow, {me}!', '{mine} to {theirs}. Say it again, slowly. 😍', 'Our bowlers were unplayable. Unplayable!', 'The dressing room must be bouncing right now.',
      'Saved my whole week, that did.', 'My neighbours heard me shouting at the telly. Worth it. 😂', 'Back-to-back wins incoming, I can feel it.', 'That is how you play under pressure!', 'Class, courage and a bit of cheek. Love it.',
      'Cannot wait for the next one!', 'Give the whole squad a medal. 🏅', 'I will be telling my grandkids about this one.', 'Proper cricket. {they} never got into it.', 'A {margin}-run gap and not one nervous moment. Lovely.',
      'The way we closed that out. Ice in the veins. 🧊', 'Somebody turn the volume up on the celebrations!'],
    loss: ['We go again. Heads up, lads.', 'Still proud of this team. Next one is ours.', 'Bowlers need to find their lines. Fix it and we fly.', 'Bad day. Not a bad team.', 'Sleep on it, then come back stronger.',
      'That hurt. But we are not done.', 'Pressure builds diamonds. Let us get on with it.', '{theirs} was gettable. We will get it right next time.', 'So close. Painfully close.', 'Credit to {they}, but we will be ready for the rematch.',
      'The top order has to give us more. Hope they read this. 😅', 'Tough, tough night at the ground.', 'Losses like this make the wins sweeter. Chin up!', 'I am not giving up on this squad. Not ever.', 'Needed a few more runs and one lucky bounce.',
      'Fielding let us down. Easy fix.', 'Put the kettle on and watch the highlights. We learn and move on.', 'Heartbreak today, fireworks next week. 🔥', 'Nobody panic. It is a long season.', 'We have the squad. We just need one more spark.',
      'A {margin}-run gap. We can close that.', 'I will be back in the stands next week, louder than ever. 📣'],
    taunt: ['Bold words from {they}. Wait until we meet at full strength.', 'Say it again after the scoreboard says so. 😤', 'Careful, {sp}. Talk is cheap and we are listening.', 'We will see who is laughing in the table, {they}.',
      'The nerve! {me}, show them. 💪', 'Enjoy the talk while it lasts, {they}.', 'Funny how loud {they} get when they are nervous.', '{sp} loves a microphone. Hit them where it hurts, lads.', 'Receipts will be kept. See you on the pitch.',
      'We have heard it all before. We will answer on the field.', 'Bring it, {they}. We are not going anywhere.', 'Somebody frame this post. We will show it to {they} after the game.', 'Big talk. Small scoreboard.', 'Let them talk. {me} do the walking.',
      'Noted, {sp}. Noted. 📝', 'Keep posting, {sp}. We keep winning.', 'That is a lot of words for a team we have not even played yet.'],
    star: ['Our captain, everybody. Love this club. ❤️', 'Heart of the team, that one.', 'Give him the armband forever.', 'We are lucky to have him.', 'The kind of player you build a club around.', 'Class on and off the field.'],
    milestone: ['WE DID IT!! {me} forever! 🎉', 'Cannot believe I am watching this live. What a season.', 'Years of waiting. Worth every minute. 😭', 'Pop the confetti, we have earned this!', 'My whole street is up. Unreal scenes.',
      'Every early morning at the ground just paid off.', 'I am in tears. Happy ones!', 'Someone wake the neighbours. 🎺', 'Best day of my cricket life. No question.', 'This club deserves every bit of this.'],
  },
  rival: {
    taunt: ['Tell them, {sp}! ⚡', 'Nobody does it like {they}.', 'Savage. I love this club. 😂', 'Rent free in their heads.', '{they} until I die!', 'Respect the champions, {me}.',
      'Somebody call {me} an ambulance. 😂', 'This is why we are number one.', '{sp} never misses.', 'And that is why we sell out every home game.', 'Class is permanent.', 'The master has spoken. 🎤'],
    win: ['Lucky bounce, {me}. See you in the return. 😂', 'Do not frame the scorecard.', 'Okay, fair play. This time.', 'Enjoy it for a day, {me}.', 'We will be back. Count on it.',
      '{theirs} is no total to be proud of, {me}.', 'Wait for the rematch, {me}.', 'One win and the whole feed is shouting? Easy.', 'Fine, you earned it. Do not get used to it.', 'We will bring a better bowling plan next time.'],
    loss: ['Better luck next time, {me}!', 'Class is permanent. 😎', 'Not even close today.', 'That is a gap, {me}. Mind it.', '{mine} v {theirs}. That says everything. 😏',
      'Come back when you have learned to bowl.', 'Somebody check on the {me} fans. 😂', 'We hardly broke a sweat.', 'Thanks for the practice, {me}!', 'See you in the return fixture. Bring tissues.'],
  },
  neutral: {
    funny: ['The banter in this league is elite. 😂', 'I came for the cricket, staying for the drama.', 'This rivalry is better than my soap opera.', 'Grabbing popcorn for the next one. 🍿', 'This feed is unreal today.',
      'I am only here for the replies.', 'Somebody get these two a boxing ring. 🥊', 'Who writes this stuff? I love it.', 'My group chat is going wild over this.', 'Pass the snacks. This is going to be a long season. 🍪',
      'Never mute this feed. Ever.', 'The tension, you can taste it.'],
    shock: ['WAIT, WHAT?!', 'Did that just happen?!', 'I need to sit down. 😳', 'No way. No way!', 'Unbelievable scenes.', 'I just spilled my tea. 🫖', 'Rewind that. Rewind it now.', 'Wow. Just wow.'],
    praise: ['Great cricket from {me} today. Credit where it is due.', 'The standard in this league keeps climbing.', 'Fair play, {me}. That was a proper performance.', 'Match of the week, easily.', 'That is why I love this game.',
      'Some of the best batting I have seen all season.', '{mine} v {theirs}: neutral fans, you are welcome. 🍿', 'A proper contest from both sides.', 'The bowling plans on both sides were top class.', 'You cannot ask for more than that.', 'Cricket needed this.'],
    sad: ['Tough one. Respect to both sides.', 'Cricket can be cruel sometimes.', 'Hard luck, {me}. Hold your heads high.', 'Nobody deserves to lose like that.', 'Stay strong, {me}. Seasons are long.', 'It is only one match. Breathe. 🌬️', 'Gutting. Proper gutting.'],
  },
  // a fan's own posts after your match (not replies)
  post: {
    win: ['Is it too early to say we are winning the league? 🏆', 'That {margin}-run win has made my whole weekend.', 'Can someone pinch me? {me} are flying right now.', 'Full time and I am still shaking. 🙌', 'My voice is gone and I do not care. {me}!!',
      'Standing ovation for the lads in {me} colours. 👏', 'Nobody told me today would be this good.', 'Walked home on air after that one. 😄', 'Rate that win a 10/10. No arguments.', 'Showing the highlights to everyone I know tonight.', 'The lads delivered. Simple as that.'],
    loss: ['A hard one to take, but I am still a {me} fan till the end.', 'Walked home slowly after that one. 😞', 'We will bounce back, I just know it.', 'Our turn will come. Patience.', 'Even in defeat, this club makes me proud.',
      'Losing hurts. It also makes us who we are.', 'We needed a tiny bit more luck. Soon.', 'Cried a bit, laughed a bit. Typical cricket.', 'Coaches, please fix the middle overs. Love, a fan. 💙', 'See you all at the next one. Same seat. Same noise.'],
  },
};
const fill = (s, v) => s.replace(/\{me\}/g, v.me).replace(/\{they\}/g, v.they || 'the other side').replace(/\{sp\}/g, v.sp || 'them').replace(/\{mine\}/g, v.mine ?? '').replace(/\{theirs\}/g, v.theirs ?? '').replace(/\{margin\}/g, v.margin ?? '');
const NEEDS_MATCH = /\{(mine|theirs|margin)\}/;
// a line nobody has heard lately: the last 90 are remembered in the career, and a line about a match is only used when there is a match
function pickFresh(c, pool, rng, hasMatch) {
  const P = ensureChirp(c);
  P.recent = P.recent || [];
  const ok = hasMatch ? pool : pool.filter(l => !NEEDS_MATCH.test(l));
  let cand = ok.filter(l => !P.recent.includes(l));
  if (!cand.length) cand = [ok.reduce((best, l) => (P.recent.indexOf(l) < P.recent.indexOf(best) ? l : best))];   // (all heard lately: the one heard longest ago)
  const line = cand[rng.int(0, cand.length - 1)];
  const at = P.recent.indexOf(line); if (at >= 0) P.recent.splice(at, 1);   // (said again: it moves to the newest place, so the list stays in order of when each was last heard)
  P.recent.push(line);
  if (P.recent.length > 90) P.recent.shift();
  return line;
}
const pickFrom = (arr, rng) => arr[rng.int(0, arr.length - 1)];

// n comments for a post. kind: 'taunt' (a rival at you), 'win', 'loss', 'milestone', 'star', 'fan'. Who answers, and in what mood, follows the face.
export function commentsFor(c, post, rng, n = 3) {
  const x = post.ctx || null;
  const me = teamById(c.club).name, theySrc = x?.they || post.by?.club || '', they = theySrc ? teamById(theySrc).name : '', sp = post.by?.name || '';
  const v = { me, they, sp, mine: x?.mine, theirs: x?.theirs, margin: x?.margin };
  const used = new Set(post.by?.type === 'fan' ? [post.by.face] : []), out = [];   // (a fan does not reply to himself)
  const take = (pred, group, key) => {
    const pool = FANS.map((f, i) => [f, i]).filter(([f, i]) => !used.has(i) && pred(f));
    const [f, i] = pool.length ? pickFrom(pool, rng) : FANS.map((f2, i2) => [f2, i2]).filter(([, i2]) => !used.has(i2))[0];
    used.add(i);
    out.push({ face: faceOfFan(i), name: f[0], handle: '@' + f[1], text: fill(pickFresh(c, SAY[group][key], rng, !!x), v), side: group });
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
export function addPost(c, { by, text, kind, salt, n = 3, pic = null, ctx = null }) {
  const P = ensureChirp(c);
  P.posts++;
  const rng = makeRng(hash(`${c.seed}|${c.season}|${P.posts}|${kind}|${text}`));
  const post = { id: P.posts, season: c.season, kind, by, text, pic, ctx, ...engagement(c, by, salt || `${kind}${P.posts}`) };
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
  const pi = rng.int(0, PRESS.length - 1), [name, outlet] = PRESS[pi];
  const margin = Math.abs(parseInt(mine, 10) - parseInt(theirs, 10)) || 0, close = margin <= 6;
  const tail = won ? (close ? 'A thriller to the last ball! 🔥' : 'A statement win. 💪') : (close ? 'So close. Heartbreak. 💔' : 'Not their day.');
  const text = `FT: ${teamById(me).name} ${mine} ${won ? 'beat' : tie ? 'tie with' : 'lose to'} ${teamById(they).name} ${theirs}. ${tail}`;
  return addPost(c, { by: { type: 'press', name, handle: handleOf(name), outlet, verified: true, face: faceOfPress(pi) }, text, kind: won ? 'win' : 'loss', salt: `ft${c.season}${they}`, ctx: { they, mine, theirs, margin, won } });
}
// a fan of your club, after the match: his own post, not a reply
export function postFan(c, { won, they = null, mine = null, theirs = null }, rng) {
  const i = rng.int(0, FANS.length - 1), f = FANS[i];
  const margin = mine != null ? Math.abs(parseInt(mine, 10) - parseInt(theirs, 10)) || 0 : null;
  const ctx = they ? { they, mine, theirs, margin, won } : null;
  const line = pickFresh(c, won ? SAY.post.win : SAY.post.loss, rng, !!ctx);
  return addPost(c, { by: { type: 'fan', name: f[0], handle: '@' + f[1], face: faceOfFan(i) }, text: fill(line, { me: teamById(c.club).name, they: they ? teamById(they).name : '', mine, theirs, margin }), kind: 'fan', n: 2, salt: `fan${c.season}${i}`, ctx });
}
// the season's big moments, from the press
export function postMilestone(c, text) {
  const rng = makeRng(hash(`${c.seed}|ms|${c.season}|${text}`));
  const pi = rng.int(0, PRESS.length - 1), [name, outlet] = PRESS[pi];
  return addPost(c, { by: { type: 'press', name, handle: handleOf(name), outlet, verified: true, face: faceOfPress(pi) }, text, kind: 'milestone', salt: `ms${c.season}` });
}
