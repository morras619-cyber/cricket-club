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

// The scouting card shown the moment a net candidate walks in (js/game.js scoutIntro): his portrait card, then what he is: his ratings as bars, his age and how far he can go, his
// own line, a verdict on how he fits this squad, and two strengths and two weaknesses that come up one after the other.
// d: { kind, i, n, verdict, tone, pros, cons, stars, ageNote, quote } (made by main.js scoutData)
export function scoutCard(p, team, d) {
  const root = mk('div', `scout-card ${d.kind}`);
  root.append(mk('div', 'sc-kick', `${d.kind === 'bat' ? 'BATTER' : 'BOWLER'} ${d.i} OF ${d.n}${p.label ? ` · ${p.label.toUpperCase()}` : ''}`));
  const top = mk('div', 'sc-top');
  const card = cardFor(p, team, d.kind === 'bowl' ? 'bowl' : 'bat');
  if (card) top.append(card);
  const side = mk('div', 'sc-side');
  const bar = (label, v, delay) => {
    const row = mk('div', 'sc-bar'), fill = mk('i'), b = mk('div', 'sc-track');
    fill.style.setProperty('--w', `${Math.max(4, Math.min(100, v))}%`); fill.style.animationDelay = `${delay}ms`;
    b.append(fill); row.append(mk('span', '', label), b, mk('b', '', String(v))); return row;
  };
  side.append(bar('BAT', p.bat || 0, 250));
  if ((p.bowlSkill || 0) > 0) side.append(bar('BOWL', p.bowlSkill, 450));
  const age = mk('div', 'sc-age'); age.append(mk('b', '', `${p.age ?? '?'}`), mk('small', '', 'YEARS'));
  const pot = mk('div', 'sc-pot'); pot.append(mk('small', '', 'POTENTIAL'), mk('b', '', '★'.repeat(d.stars || 1) + '☆'.repeat(5 - (d.stars || 1))));
  const meta = mk('div', 'sc-meta'); meta.append(age, pot); side.append(meta, mk('small', 'sc-note', d.ageNote || ''));
  top.append(side); root.append(top);
  if (p.trait) root.append(mk('p', 'sc-quote', `“${p.trait}”`));
  const chip = mk('div', `sc-verdict ${d.tone || 'ok'}`, d.verdict || '');
  root.append(chip);
  const list = mk('div', 'sc-list');
  const items = [...(d.pros || []).map(t => ['pro', t]), ...(d.cons || []).map(t => ['con', t])];
  items.forEach(([tone, text], k) => { const r = mk('div', `sc-row ${tone}`); r.style.animationDelay = `${900 + k * 420}ms`; r.append(mk('i', '', tone === 'pro' ? '▲' : '▼'), mk('span', '', text)); list.append(r); });
  root.append(list);
  return root;
}
