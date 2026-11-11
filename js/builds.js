// How each player is built: [height, width] against the drawn figure (1 = as drawn), read by eye
// from his painted portrait (broad shoulders, a big frame, a slight build) and his role (the
// quicks tall, the young keepers and wristy spinners small). Players without a portrait get a
// small variation of their own, fixed by their name.
export const BUILDS = {
  // big and broad
  'nadir-sheikh': [1.0, 1.15], 'hamid-usmani': [1.05, 1.12], 'sameer-javed': [1.01, 1.12], 'saad-ahmed': [0.95, 1.12],
  'farid-jalali': [1.03, 1.1], 'ravi-malik': [1.02, 1.09], 'rafiq-alam': [0.99, 1.09], 'bilawal-gul': [1.04, 1.09],
  'sameer-raza': [1.0, 1.08], 'zain-mirza': [1.06, 1.08], 'james-whitfield': [1.0, 1.08], 'dwayne-hollis': [1.03, 1.08],
  'rocky-van-wyk': [1.05, 1.08], 'kunal-saini': [1.0, 1.07],
  // athletic, tall quicks
  'andre-belgrave': [1.06, 1.05], 'marlon-greaves': [1.05, 1.05], 'tendai-moyo': [1.04, 1.05], 'corbin-hayes': [1.03, 1.05],
  'sipho-nkosi': [1.06, 1.02], 'aamir-lodhi': [1.07, 1.04], 'jaspreet-dhillon': [1.06, 1.02], 'marco-pienaar': [1.07, 1.0],
  'ethan-van-der-berg': [1.06, 1.0], 'mitchell-doyle': [1.05, 1.02], 'thabo-mthembu': [1.04, 1.03], 'jermaine-alleyne': [1.07, 0.94],
  'craig-lockhart': [1.03, 1.0], 'henry-blackwood': [1.02, 1.03], 'dev-rana': [1.0, 1.04], 'faisal-naqvi': [1.0, 1.04],
  'hamid-noorzai': [1.03, 1.02], 'harsh-reddy': [0.99, 1.04], 'sunny-bhatia': [0.98, 1.03], 'zubair-khan': [1.02, 1.03],
  // slight
  'hamza-iqbal': [0.93, 0.92], 'oliver-hartley': [1.01, 0.93], 'rakibul-karim': [0.94, 0.92], 'kashif-lone': [0.96, 0.93],
  'priyank-yadav': [0.97, 0.93], 'rizwan-akram': [0.98, 0.93], 'siddharth-verma': [1.0, 0.94], 'dilan-wijesekara': [0.96, 0.93],
  'dinesh-wickramasinghe': [0.98, 0.93], 'aditya-rao': [0.98, 0.94], 'shoaib-haider': [0.99, 0.94], 'dev-pillai': [0.95, 0.94],
  'liam-buckley': [0.99, 0.94], 'finn-gallagher': [0.98, 0.95], 'tharindu-jayasena': [0.94, 0.93], 'danish-haider': [0.98, 0.95],
  'ehan-rizvi': [0.99, 0.94], 'manish-gupta': [0.96, 0.96], 'mahfuz-rahman': [0.95, 0.96], 'shane-granger': [1.02, 0.94],
  'danish-iqbal': [0.94, 0.97], 'rohan-pillai': [0.95, 0.98], 'aarav-nair': [0.95, 0.97], 'thunder-raja': [1.0, 0.97],
  'arjun-iyer': [0.98, 0.97], 'yasir-abbasi': [0.97, 1.0], 'hamza-nawaz': [0.97, 1.0], 'niroshan-silva': [0.97, 1.02],
};
const slug = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function hashStr(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
// [height, width] for a player's look (look.who: his name)
export function buildOf(look) {
  if (!look?.who) return [1, 1];
  const b = BUILDS[slug(look.who)];
  if (b) return b;
  const h = hashStr(look.who);
  return [0.96 + (h % 9) * 0.01, 0.95 + ((h >>> 8) % 11) * 0.01];
}

// ---------- how each player moves ----------
// Everyone is drawn from the same poses, so what tells two players apart is how they play them: how long
// a batter holds his finish, whether he rocks in his stance or stands like a post, how low he crouches;
// how a bowler's run-up cadence runs, where he leans in his action, how long he gathers and follows through.
// Fixed by his name (the same man every time) and drawing only: no ball, no shot and no result reads it.
const BAT_STYLES = [
  // tempo: share of the usual time each pose of a shot is on screen (>1 = slower, more elegant); hold: ms the finish is held;
  // rock/hz: sway of his stance (metres, per second); lean: shear (+ = to the off side); crouch: height scale
  { id: 'stylist',  tempo: 1.22, hold: 560, rock: 0.012, hz: 0.5,  lean: -0.012, crouch: 1.0 },
  { id: 'slugger',  tempo: 0.82, hold: 300, rock: 0.0,   hz: 0,    lean: 0.01,   crouch: 0.97 },
  { id: 'rocker',   tempo: 1.0,  hold: 420, rock: 0.05,  hz: 0.9,  lean: 0,      crouch: 1.0 },
  { id: 'twitchy',  tempo: 0.92, hold: 360, rock: 0.02,  hz: 2.1,  lean: 0.015,  crouch: 0.985 },
  { id: 'crouched', tempo: 1.05, hold: 440, rock: 0.0,   hz: 0,    lean: 0.03,   crouch: 0.94 },
  { id: 'tall',     tempo: 1.12, hold: 480, rock: 0.008, hz: 0.4,  lean: -0.03,  crouch: 1.02 },
  { id: 'steady',   tempo: 1.0,  hold: 420, rock: 0.0,   hz: 0,    lean: 0,      crouch: 1.0 },
];
const BOWL_STYLES = [
  // cad: run-up stride rate (>1 = quicker feet); load: share of the run-up he spends gathering and coiling (>0 = longer load-up);
  // follow: how slowly he follows through (>1 = slower); lean: shear in the run and delivery (+ = towards the off side); stoop: height scale
  { id: 'smooth',   cad: 1.0,  load: 0,     follow: 1.15, lean: 0,      stoop: 1.0 },
  { id: 'hurried',  cad: 1.3,  load: -0.03, follow: 0.85, lean: 0.015,  stoop: 0.985 },
  { id: 'slinger',  cad: 1.0,  load: 0.02,  follow: 1.0,  lean: 0.075,  stoop: 0.975 },
  { id: 'upright',  cad: 0.85, load: 0.03,  follow: 1.25, lean: -0.035, stoop: 1.02 },
  { id: 'wound-up', cad: 1.1,  load: 0.06,  follow: 0.95, lean: -0.015, stoop: 1.0 },
  { id: 'shuffler', cad: 1.45, load: -0.02, follow: 1.0,  lean: 0.03,   stoop: 0.98 },
];
const NEUTRAL_STYLE = { bat: { id: 'steady', tempo: 1, hold: 420, rock: 0, hz: 0, lean: 0, crouch: 1 }, bowl: { id: 'smooth', cad: 1, load: 0, follow: 1, lean: 0, stoop: 1 } };
const styles = new Map();
// { bat, bowl } for a player's look (look.who: his name); no name, no style
export function styleOf(look) {
  if (!look?.who) return NEUTRAL_STYLE;
  const key = slug(look.who);
  if (styles.has(key)) return styles.get(key);
  const h = hashStr(key + '|style'), at = k => ((h >>> k) & 255) / 255 - 0.5;   // (-0.5..0.5, a different one for each trait)
  const b = BAT_STYLES[h % BAT_STYLES.length], w = BOWL_STYLES[(h >>> 5) % BOWL_STYLES.length];
  const s = {
    bat: { ...b, tempo: b.tempo * (1 + at(8) * 0.12), hold: b.hold * (1 + at(12) * 0.2), rock: b.rock * (1 + at(16) * 0.4), hz: b.hz * (1 + at(20) * 0.3), lean: b.lean + at(24) * 0.01 },
    bowl: { ...w, cad: w.cad * (1 + at(10) * 0.12), load: w.load + at(14) * 0.02, follow: w.follow * (1 + at(18) * 0.16), lean: w.lean + at(22) * 0.02 },
  };
  styles.set(key, s);
  return s;
}
