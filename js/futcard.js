// Super League player cards (only the Super League uses these): the tier frame by overall rating,
// the player's portrait in his club kit, his real league numbers and his ability.
import { ovr, bowlType } from './squads.js';
import { flag, nationName } from './nations.js';
import { faceEl } from './looks.js';
import { portrait } from './figure.js';
import { heroById } from './heroes.js';
import { teamById } from './teams.js';
import { ABILITIES, potentialStars, money, value } from './career.js';

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
  const pic = p.heroId ? portrait(heroById(p.heroId), 220, 'celebrate') : faceEl(p, kit, 220, 'fut-face', true);
  pic.classList.add('fut-pic'); if (p.heroId) pic.classList.add('fut-hero'); pic.style.width = pic.style.height = '';
  card.append(pic);
  card.append(mk('div', 'fut-name', p.name.toUpperCase()));
  const rate = mk('div', 'fut-rate'); rate.append(mk('b', '', String(o)), mk('small', '', ROLE[p.role] || 'BAT'));
  card.append(rate);
  // what he is
  const info = mk('div', 'fut-info');
  info.append(mk('span', 'fut-flag', `${flag(p)} ${nationName(p)}`), mk('span', '', `Age ${p.age}`), mk('span', '', p.label));
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
