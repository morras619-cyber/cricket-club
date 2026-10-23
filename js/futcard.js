// Super League player cards (only the Super League uses these): the tier frame by overall rating,
// the player's portrait in his club kit, his real league numbers and his ability.
import { ovr, bowlType } from './squads.js';
import { flag, nationName } from './nations.js';
import { faceEl } from './looks.js';
import { portrait } from './figure.js';
import { heroById } from './heroes.js';
import { teamById } from './teams.js';
import { ABILITIES, potentialStars, money, value } from './career.js';
import { PORTRAIT_KEYS } from './portraits-list.js';
import { PORTRAIT_FACES } from './portrait-faces.js';

// ---------- painted portraits ----------
// Painted in Thunder's blue and yellow; on a player at another club the shirt is recoloured to that
// club's kit (blue to its main colour, yellow to its trim), skin, hair and face untouched.
const HAS_PORTRAIT = new Set(PORTRAIT_KEYS);
const keyOf = p => (p.heroId ? heroById(p.heroId).name : p.name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const srcs = new Map(), kits = new Map();
function portraitSrc(key) {
  if (!srcs.has(key)) { const im = new Image(); im.src = `img/cards/portraits/${key}.webp`; srcs.set(key, im); }
  return srcs.get(key);
}
const rgbOf = hex => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
function recolour(im, team) {
  const c = document.createElement('canvas');
  c.width = im.naturalWidth; c.height = im.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(im, 0, 0);
  if (!team || team.id === 'thunder') return c;
  const d = g.getImageData(0, 0, c.width, c.height), px = d.data;
  const suit = rgbOf(team.suit), trim = rgbOf(team.trim);
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 8) continue;
    const r = px[i], gg = px[i + 1], b = px[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), sat = mx ? (mx - mn) / mx : 0;
    if (sat < 0.45) continue;
    let h = 0;
    if (mx === r) h = ((gg - b) / (mx - mn)) % 6; else if (mx === gg) h = (b - r) / (mx - mn) + 2; else h = (r - gg) / (mx - mn) + 4;
    h = (h * 60 + 360) % 360;
    let to = null, ref = 1;
    if (h > 205 && h < 255) { to = suit; ref = 200; } // the blue shirt
    else if (h > 42 && h < 66 && mx > 150) { to = trim; ref = 245; } // the yellow trim and flashes
    if (!to) continue;
    const k = Math.min(1.25, mx / ref);
    px[i] = Math.min(255, to[0] * k); px[i + 1] = Math.min(255, to[1] * k); px[i + 2] = Math.min(255, to[2] * k);
  }
  g.putImageData(d, 0, 0);
  return c;
}
// the painted portrait for a player (in his club's kit), or null if he hasn't one
export function paintedPortrait(p, kitTeam = null) {
  const key = keyOf(p);
  if (!HAS_PORTRAIT.has(key)) return null;
  const team = kitTeam || (p.team ? teamById(p.team) : null), ck = `${key}|${team?.id || ''}`;
  const holder = document.createElement('div');
  holder.className = 'fut-pic fut-paint';
  const put = () => { if (!kits.has(ck)) kits.set(ck, recolour(srcs.get(key), team)); const src = kits.get(ck), c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0); holder.append(c); };
  const im = portraitSrc(key);
  if (im.complete && im.naturalWidth) put(); else im.addEventListener('load', put, { once: true });
  return holder;
}

// The painted portrait's head and shoulders as a small square picture (squad lists and the like),
// on a backdrop in the club's colour and with the shirt in its kit; null if he has no portrait.
export function portraitFace(p, kitTeam = null, size = 44) {
  const key = keyOf(p), crop = PORTRAIT_FACES[key];
  if (!HAS_PORTRAIT.has(key) || !crop) return null;
  const team = kitTeam || (p.team ? teamById(p.team) : null), ck = `${key}|${team?.id || ''}`;
  const px = Math.round(size * Math.min(3, window.devicePixelRatio || 2));
  const c = document.createElement('canvas');
  c.width = c.height = px; c.className = 'face';
  c.style.width = c.style.height = `${size}px`;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, px), col = rgbOf(team?.suit || '#f2711c');
  const tone = f => `rgb(${col.map(v => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)).join(',')})`;
  bg.addColorStop(0, tone(0.35)); bg.addColorStop(1, tone(-0.25));
  g.fillStyle = bg; g.fillRect(0, 0, px, px);
  const put = () => {
    if (!kits.has(ck)) kits.set(ck, recolour(srcs.get(key), team));
    const [x, y, s] = crop;
    g.drawImage(kits.get(ck), x, y, s, s, 0, 0, px, px);
  };
  const im = portraitSrc(key);
  if (im.complete && im.naturalWidth) put(); else im.addEventListener('load', put, { once: true });
  return c;
}

// tiers by overall rating, best first
export const TIERS = [
  { id: 'legendary', name: 'Legendary', min: 90 },
  { id: 'epic', name: 'Epic', min: 85 },
  { id: 'rare', name: 'Rare', min: 80 },
  { id: 'gold', name: 'Gold', min: 75 },
  { id: 'prospect', name: 'Silver', min: 65 },
  { id: 'common', name: 'Common', min: 55 },
  { id: 'bronze', name: 'Bronze', min: 0 },
];
export const tierOf = o => TIERS.find(t => o >= t.min);
// a young player who could become much better
export const risingStar = p => !p.heroId && p.age <= 22 && (p.pot || 0) - ovr(p) >= 10;

const ROLE = { bat: 'BAT', bowl: 'BOWL', all: 'AR', wk: 'WK' };
const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const icon = name => { const i = new Image(); i.src = `img/cards/icons/${name}.webp`; i.alt = ''; return i; };

// size: the card's width in px (everything inside scales with it)
export function futCard(p, { size = 220, frame = null } = {}) {
  const o = ovr(p), tier = tierOf(o);
  const card = mk('div', `fut fut-${frame || tier.id}`);
  card.style.setProperty('--w', `${size}px`);
  const bg = new Image(); bg.className = 'fut-frame'; bg.alt = ''; bg.src = `img/cards/frames/${frame || tier.id}.webp`;
  card.append(bg);
  // the portrait: heroes their drawn figure, everyone else their face in his club's kit
  const kit = p.team ? teamById(p.team) : { suit: '#f3efe2', trim: '#3a3a4a' };
  const painted = paintedPortrait(p);
  if (painted) card.append(painted);
  else {
    const pic = p.heroId ? portrait(heroById(p.heroId), 220, 'celebrate') : faceEl(p, kit, 220, 'fut-face', true);
    pic.classList.add('fut-pic'); if (p.heroId) pic.classList.add('fut-hero'); pic.style.width = pic.style.height = '';
    card.append(pic);
  }
  card.append(mk('div', 'fut-name', p.name.toUpperCase()));
  const rate = mk('div', 'fut-rate'); rate.append(mk('b', '', String(o)), mk('small', '', ROLE[p.role] || 'BAT'));
  card.append(rate);
  // what he is
  const info = mk('div', 'fut-info');
  info.append(mk('span', 'fut-flag', `${flag(p)} ${nationName(p)}`), ...(p.age != null ? [mk('span', '', `Age ${p.age}`)] : []), mk('span', '', p.label));
  if (p.bowl) info.append(mk('span', '', bowlType(p.bowl).short || bowlType(p.bowl).name));
  info.append(mk('span', 'fut-pot', '★★★★★'.slice(0, potentialStars(p)) + '☆☆☆☆☆'.slice(0, 5 - potentialStars(p))));
  card.append(info);
  if (risingStar(p)) { const r = mk('div', 'fut-rising'); r.append(icon('risingStar'), mk('span', '', 'RISING STAR')); card.append(r); }
  // his ability (or hero power), else his trait
  const ab = mk('div', 'fut-ability');
  if (p.heroId) {
    const pw = heroById(p.heroId).power;
    ab.append(icon('hero'), mkText(pw.name, 'Hero power'));
  } else if (p.ability) {
    ab.append(icon(p.ability), mkText(ABILITIES[p.ability].name, ABILITIES[p.ability].desc));
  } else ab.append(mkText(p.trait || p.label, `Worth ${money(value(p))}`, true));
  card.append(ab);
  // real Super League numbers
  const s = p.stats?.all || { m: 0, runs: 0, wkts: 0, hs: 0, bb: null };
  const bowler = p.role === 'bowl' || (p.role === 'all' && s.wkts > s.runs / 20);
  const best = bowler ? (s.bb ? `${s.bb.w}/${s.bb.r}` : '—') : s.m ? String(s.hs) : '—';
  const stats = mk('div', 'fut-stats');
  for (const [k, v] of [['M', s.m], ['RUNS', s.runs], ['WKTS', s.wkts], ['BEST', best]]) { const d = mk('div'); d.append(mk('b', '', String(v)), mk('small', '', k)); stats.append(d); }
  card.append(stats);
  return card;
}
function mkText(head, sub, plain = false) {
  const t = mk('div', 'fut-abtext' + (plain ? ' plain' : ''));
  t.append(mk('b', '', head), mk('small', '', sub));
  return t;
}
