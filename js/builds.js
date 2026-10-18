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
