// The Weekend War: India v Pakistan over four weekends. Each player picks a country once, then
// plays one match a weekend against the other side; a win is a point for his country, a loss
// gives nothing. Every player's results live in one shared table (the artifact's database, when
// the page is opened on claude.ai), and the country totals are counted from it live.
//
// war/<player id>: { country: 'india'|'pakistan', r: { '1': { win, at, line }, ... }, at }

export const SIDES = ['india', 'pakistan'];
export const WEEKENDS = 4;
// weekend 1: Saturday 24 October 2026, from midnight Saturday to midnight Monday, local time
const FIRST = [2026, 9, 24];
const DAY = 864e5;

// the start and end (ms) of weekend k (1-4), in the player's own time zone
export function weekendSpan(k) {
  const start = new Date(FIRST[0], FIRST[1], FIRST[2] + (k - 1) * 7).getTime();
  return [start, new Date(FIRST[0], FIRST[1], FIRST[2] + (k - 1) * 7 + 2).getTime()];
}

// Where the war stands at time `now`:
//   { phase: 'before', next: 1, opensAt }  ·  { phase: 'open', weekend, closesAt }
//   { phase: 'between', next, opensAt }    ·  { phase: 'over' }
export function warClock(now = Date.now()) {
  for (let k = 1; k <= WEEKENDS; k++) {
    const [s, e] = weekendSpan(k);
    if (now < s) return { phase: k === 1 ? 'before' : 'between', next: k, opensAt: s };
    if (now < e) return { phase: 'open', weekend: k, closesAt: e };
  }
  return { phase: 'over' };
}

// "3d 12h", "5h 20m", "12m"
export function countdown(ms) {
  const m = Math.max(0, Math.round(ms / 6e4)), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m % 60}m` : `${m % 60}m`;
}

// The country totals from every player's results: { india, pakistan, players: { india, pakistan },
// weeks: [{ india, pakistan } x4] } (a point per win; a loss counts nothing)
export function totals(docs) {
  const t = { india: 0, pakistan: 0, players: { india: 0, pakistan: 0 }, weeks: Array.from({ length: WEEKENDS }, () => ({ india: 0, pakistan: 0 })) };
  for (const d of docs) {
    if (!SIDES.includes(d?.country)) continue;
    t.players[d.country]++;
    for (let k = 1; k <= WEEKENDS; k++) {
      if (d.r?.[k]?.win) { t[d.country]++; t.weeks[k - 1][d.country]++; }
    }
  }
  return t;
}

// The latest results, newest first: [{ id, country, weekend, win, at, line }]
export function feed(entries, n = 12) {
  const out = [];
  for (const [id, d] of entries) {
    if (!SIDES.includes(d?.country)) continue;
    for (const [k, r] of Object.entries(d.r || {})) {
      if (r && r.at && !r.pending) out.push({ id, country: d.country, weekend: +k, win: !!r.win, at: r.at, line: r.line || '' });
    }
  }
  return out.sort((a, b) => b.at - a.at).slice(0, n);
}

// The leader: 'india' | 'pakistan' | null (level)
export const leader = t => (t.india > t.pakistan ? 'india' : t.pakistan > t.india ? 'pakistan' : null);

// ---------- the shared table ----------
// The artifact's database when the page runs on claude.ai; otherwise this device only (the
// player's own results, so the screen still works; the totals are then his own).
const LOCAL = 'sixcharge.war.v1';
function localRead() { try { return JSON.parse(localStorage.getItem(LOCAL)) || null; } catch { return null; } }
function localWrite(doc) { try { localStorage.setItem(LOCAL, JSON.stringify(doc)); } catch { /* private mode */ } }

let db = null, user = null, me = null, connecting = null;
export const warOnline = () => !!(db && me);
async function connect() {
  if (connecting) return connecting;
  connecting = (async () => {
    const c = typeof window !== 'undefined' && window.claude;
    if (!c?.use) return;
    try {
      [db, user] = await Promise.all([c.use('db'), c.use('user')]);
      me = db && user ? await user.id() : null;
    } catch { db = null; me = null; }
  })();
  return connecting;
}

// Subscribe to the whole table: onChange({ mine, entries, online }). Returns an unsubscribe.
export function watchWar(onChange) {
  let stop = null, dead = false;
  const local = () => onChange({ mine: localRead(), entries: localRead() ? [['me', localRead()]] : [], online: false });
  local();
  connect().then(() => {
    if (dead || !warOnline()) return;
    stop = db.collection('war').onSnapshot(snap => {
      const entries = snap.docs.filter(d => d.exists).map(d => [d.id, d.data()]);
      const mineDoc = entries.find(([id]) => id === me)?.[1] || null;
      // this device's record fills in for a write still on its way
      onChange({ mine: mineDoc || localRead(), entries, online: true });
    }, () => local());
  });
  return () => { dead = true; stop?.(); };
}

// Save the player's record (here, and to the shared table when there is one).
export async function saveMine(doc) {
  localWrite(doc);
  await connect();
  if (!warOnline()) return false;
  try { await db.collection('war').doc(me).set(doc); return true; } catch { return false; }
}
export const myRecord = () => localRead();

// names for the feed (never stored: looked up each time from the ids)
export async function namesOf(ids) {
  await connect();
  if (!user?.profiles || !ids.length) return {};
  try {
    const ps = await user.profiles(ids);
    return Object.fromEntries(ids.map(id => [id, ps?.[id]?.name || '']));
  } catch { return {}; }
}
export const myId = () => me;
