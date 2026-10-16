// Painted player cards: shown in place of the small face when a player with a card walks out
// or comes on to bowl, with his overall rating in a badge in the top-right corner.
import { CARD_KEYS } from './cards-list.js';
import { ovr } from './squads.js';

const HAVE = new Set(CARD_KEYS);
export const cardKey = p => (p?.name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// load them up front, so a card is ready the moment it's needed
const loaded = new Map();
for (const k of HAVE) { const im = new Image(); im.decoding = 'async'; im.src = `img/cards/${k}.webp`; loaded.set(k, im); }

export function cardFor(p) {
  const k = cardKey(p);
  if (!HAVE.has(k)) return null;
  const card = document.createElement('div');
  card.className = 'pcard';
  const im = loaded.get(k).cloneNode();
  im.alt = p.name;
  const badge = document.createElement('div');
  badge.className = 'pcard-ovr';
  const n = document.createElement('b'); n.textContent = ovr(p);
  const l = document.createElement('small'); l.textContent = 'OVR';
  badge.append(n, l);
  card.append(im, badge);
  return card;
}
