// The match pop-up card: when a player walks out to bat or comes on to bowl, his painted
// portrait cut out softly into the scene (no frame), with his rating, name and role. Players without a painting yet show the drawn face.
import { ovr } from './squads.js';
import { paintedPortrait } from './futcard.js';
import { faceEl } from './looks.js';
import { portrait } from './figure.js';

const ROLE = { bat: 'BAT', bowl: 'BOWL', all: 'ALL-ROUNDER', wk: 'KEEPER' };

const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

// p: the player; team: the side he plays for in this match
// as: what he is shown doing when he has no painted portrait: 'bowl' (the bowler of the over), 'bat' (a batter walking out); by default his role decides
export function cardFor(p, team = null, as = null) {
  if (!p) return null;
  const card = mk('div', 'mcard');
  if (team?.suit) card.style.setProperty('--fc', team.suit);
  const pic = paintedPortrait(p, team);
  if (pic) { pic.className = 'mcard-pic'; card.append(pic); }
  else {
    const hero = p.hero && typeof p.hero === 'object' ? p.hero : null;
    const pose = as === 'bowl' || (!as && p.role === 'bowl') ? 'bowl' : !as && p.role === 'wk' ? 'keeper' : 'celebrate';   // (a bowler does not hold a bat)
    const f = hero ? portrait(hero, 200, pose) : faceEl(p, team, 200, 'mcard-face', true);
    f.classList.add('mcard-pic', 'mcard-drawn'); f.style.width = f.style.height = '';
    card.append(f);
  }
  const name = mk('div', 'mcard-name', (p.name || '').toUpperCase());
  name.style.fontSize = `${Math.min(10, 128 / Math.max(1, (p.name || '').length))}cqw`; // long names shrink to fit
  card.append(mk('div', 'mcard-ovr', String(ovr(p))), name, mk('div', 'mcard-role', ROLE[p.role] || 'BAT'));
  return card;
}
