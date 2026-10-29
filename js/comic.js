// Comic panels for the story: a full picture per panel, with the words drawn by the game (the pictures carry no text) in speech bubbles
// whose tail points at the speaker's mouth (or at the phone for a message). Every tap brings the next bubble; when a panel has said
// everything the next tap brings the next panel.
import { FANS, faceStyle } from './chirp.js';

const $ = id => document.getElementById(id);
const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

// where things are in the pictures, as a fraction of the picture (x, y): Kabir's mouth, and the phone on the bedside table
const MOUTH = [0.44, 0.19], PHONE = [0.88, 0.9];

// the first night: Kabir at the window, the night before the final (still a Thunder player)
// a beat: { say: 'words' } from Kabir's mouth, { msg: { who, text } } from the phone, { sfx } a sound mark; one beat per tap
export const OPENING = [
  { img: 'img/story/open-1.webp', beats: [{ say: 'Thirty thousand seats. One night away.' }, { say: "Twenty years I've dreamed about this." }] },
  { img: 'img/story/open-2.webp', beats: [{ say: "Every net session. Every ground that said I wasn't good enough." }, { say: 'Tomorrow, they find out.' }] },
  { img: 'img/story/open-3.webp', beats: [{ sfx: 'BZZT!', say: "That'll be Raja." }] },
  { img: 'img/story/open-4.webp', beats: [{ msg: { who: 'Raja', text: 'Sleep. Tomorrow we make history.' } }] },
  { img: 'img/story/open-1.webp', beats: [{ say: "Don't be scared. Not tonight." }] },   // (the phone is dark again)
];

// four hours later: Kabir in bed, scrolling through Chirp. The angry fans, and then the message from his coach (the coach's name is a placeholder)
const fan = (handle, text) => { const i = FANS.findIndex(f => f[1] === handle), f = FANS[i]; return { fan: { name: f[0], handle: f[1], text, face: faceStyle(i) } }; };
const BED = { mouth: [0.41, 0.43], sayAt: { left: 0.5, width: 0.46, bottom: 0.395 }, phone: [0.56, 0.5], msgBelow: true };
export const NIGHT = [
  { img: 'img/story/night-1.webp', ...BED, beats: [
    { say: "Don't read it, Kabir. Don't read it." },
    fan('imran_ultra', 'CHOKER. Thirty thousand watching and he scored ZERO. 🤡'),
    fan('meera_mad', 'A golden duck in a FINAL? Horrible. Just horrible.'),
  ] },
  { img: 'img/story/night-2.webp', ...BED, beats: [
    fan('jamal_jaffa', 'He needs to be playing in the third division. Send him back down.'),
    fan('zawadi_z', 'Worst signing in Thunder history. #SellKabir'),
    fan('kate_the_crease', "I've seen better batting at a school fete."),
    { say: "Maybe they're right..." },
  ] },
  { img: 'img/story/night-3.webp', ...BED, beats: [
    { msg: { who: 'COACH MERCER', text: 'Kabir, the club has decided. You are cut from the team, effective immediately.' } },
    { say: '...What?' },
  ] },
];

// the next morning: the bag packed, the tunnel out of the Thunderdome, the bus stop, Uncle Dev, and the old ground (the man in the suit is the owner; his name is not said)
const say = (text, at, mouth) => ({ say: text, at: { left: at[0], width: at[1], bottom: at[2] }, mouth });
const fanBeat = h => fan(h, 'Walk away from cricket, Kabir. For everyone\'s sake.');
export const EXIT = [
  { img: 'img/story/exit-1.webp', beats: [say('"Not good enough."', [0.04, 0.46, 0.12], [0.58, 0.19]), say('Twenty years. One night.', [0.04, 0.46, 0.12], [0.58, 0.19])] },
  { img: 'img/story/exit-2.webp', beats: [say('Your pass, please.', [0.2, 0.42, 0.13], [0.1, 0.2]), say('...Here.', [0.46, 0.4, 0.13], [0.46, 0.24])] },
  { img: 'img/story/exit-3.webp', beats: [say('Nothing personal, Anand. The club needs someone to blame.', [0.5, 0.46, 0.2], [0.66, 0.3]), say('I gave you everything.', [0.04, 0.46, 0.2], [0.42, 0.27]), say("And it wasn't enough.", [0.5, 0.46, 0.2], [0.66, 0.3])] },
  { img: 'img/story/exit-4.webp', beats: [say('Twenty years of dreams...', [0.5, 0.46, 0.17], [0.44, 0.29]), say('...and not one of you says a word.', [0.5, 0.46, 0.17], [0.44, 0.29])] },
  { img: 'img/story/exit-5.webp', beats: [say('Fine. Keep your trophy.', [0.4, 0.5, 0.2], [0.33, 0.29])] },
  { img: 'img/story/exit-6.webp', beats: [fanBeat('imran_ultra'), say("Maybe they're right.", [0.45, 0.5, 0.22], [0.4, 0.33])] },
  { img: 'img/story/exit-7.webp', beats: [say('They chased you out, beta.', [0.3, 0.5, 0.15], [0.76, 0.22])] },
  { img: 'img/story/exit-8.webp', beats: [say("Come on. Let's chase them back.", [0.3, 0.5, 0.17], [0.76, 0.27])] },
  { img: 'img/story/exit-9.webp', beats: [say('With what, Dev? A bag and a bat?', [0.04, 0.5, 0.24], [0.25, 0.35]), say('And a ground. Wait until you see it.', [0.5, 0.46, 0.17], [0.66, 0.25])] },
  { img: 'img/story/exit-10.webp', beats: [say('Not much to look at, is it?', [0.5, 0.46, 0.3], [0.66, 0.39]), say('Then I will build my own club. And one day I will beat them.', [0.04, 0.55, 0.3], [0.38, 0.4])] },
];

let box = null;
function build() {
  if (box) return box;
  box = mk('div', 'comic'); box.id = 'comic'; box.hidden = true;
  box.innerHTML = '<div class="cm-art"><div class="cm-pic"></div><div class="cm-shade"></div><div class="cm-sfx"></div><div class="cm-fans"></div>'
    + '<div class="cm-speech"><svg class="cm-tail" aria-hidden="true"><path/></svg><div class="cm-bub"><b></b><p></p></div></div></div>'
    + '<div class="cm-btns"><button class="cm-skip">Skip</button><span class="cm-dots"></span><button class="cm-next">Next</button></div>';
  $('app').append(box);
  return box;
}

// the bubble up, with its tail to the point (fractions of the picture). The bubble and its tail are one outline (one path), so no line
// crosses where the tail joins. A panel may say where the mouth and the phone are, where his bubble sits (sayAt) and whether a message
// bubble goes above the phone (default) or below it (msgBelow).
function place(b, art, beat, p = {}) {
  const sp = b.querySelector('.cm-speech'), bub = b.querySelector('.cm-bub'), tail = b.querySelector('.cm-tail'), sfx = b.querySelector('.cm-sfx'), fans = b.querySelector('.cm-fans');
  const W = art.clientWidth, H = art.clientHeight, msg = !!beat.msg;
  sfx.hidden = !beat.sfx; sfx.textContent = beat.sfx || '';
  // a fan's comment: a small bubble that stays, the next one below it
  if (beat.fan) {
    const n = fans.children.length % 3, f = beat.fan, c = mk('div', 'cm-fan');
    const av = mk('i', 'cm-av'); if (f.face) av.setAttribute('style', f.face);
    const t = mk('div', ''); t.append(mk('b', '', f.name), mk('small', '', ` @${f.handle}`), mk('p', '', f.text));
    c.append(av, t);
    c.style.top = `${H * (0.565 + 0.145 * n)}px`; c.style.left = `${W * (n % 2 ? 0.1 : 0.03)}px`; c.style.width = `${W * 0.87}px`;
    if (!n) fans.innerHTML = '';
    fans.append(c); c.classList.add('in');
  }
  sp.hidden = !beat.say && !msg;
  if (sp.hidden) return;
  sp.classList.toggle('msg', msg);
  bub.querySelector('b').textContent = msg ? beat.msg.who : ''; bub.querySelector('b').hidden = !msg;
  bub.querySelector('p').textContent = msg ? beat.msg.text : beat.say;
  const at = beat.at || p.sayAt || { left: 0.46, width: 0.52, bottom: 0.155 };
  const bw = W * (msg ? 0.62 : at.width), left = msg ? W - bw - W * 0.03 : W * at.left;
  bub.style.width = `${bw}px`; bub.style.left = `${left}px`; bub.style.top = '0px';
  const bh = bub.offsetHeight, below = msg && p.msgBelow;
  const top = below ? H * 0.585 : Math.max(H * 0.015, H * (msg ? 0.8 : at.bottom) - bh), bottom = top + bh;
  bub.style.top = `${top}px`;
  const [tx, ty] = (msg ? (p.phone || PHONE) : (beat.mouth || p.mouth || MOUTH)).map((v, k) => v * (k ? H : W));
  let xa = msg ? left + bw * 0.8 : left + bw * 0.24, xb = msg ? left + bw * 0.62 : left + bw * 0.1;
  const r = 18;
  if (beat.at && !msg) { const cx = Math.min(left + bw * 0.86, Math.max(left + bw * 0.14, tx)); xa = cx + bw * 0.07; xb = cx - bw * 0.07; }   // (a bubble placed by hand: its tail grows from the part of it nearest the mouth)
  // (his tail stops short of his face: it points at the mouth without touching it)
  let tipX = tx, tipY = ty;
  if (!msg) { const mx = (xa + xb) / 2, dx = tx - mx, dy = ty - bottom, len = Math.hypot(dx, dy) || 1, gap = Math.min(W * 0.075, len * 0.6); tipX = tx - dx / len * gap; tipY = ty - dy / len * gap; }
  tail.setAttribute('viewBox', `0 0 ${W} ${H}`); tail.setAttribute('width', W); tail.setAttribute('height', H);
  const d = below
    ? `M${left + r},${top} H${xb} L${tipX},${tipY} L${xa},${top} H${left + bw - r} Q${left + bw},${top} ${left + bw},${top + r} V${bottom - r} Q${left + bw},${bottom} ${left + bw - r},${bottom} H${left + r} Q${left},${bottom} ${left},${bottom - r} V${top + r} Q${left},${top} ${left + r},${top} Z`
    : `M${left + r},${top} H${left + bw - r} Q${left + bw},${top} ${left + bw},${top + r} V${bottom - r} Q${left + bw},${bottom} ${left + bw - r},${bottom} H${xa} L${tipX},${tipY} L${xb},${bottom} H${left + r} Q${left},${bottom} ${left},${bottom - r} V${top + r} Q${left},${top} ${left + r},${top} Z`;
  tail.querySelector('path').setAttribute('d', d);
  sp.style.transformOrigin = `${tipX}px ${tipY}px`;
}

// the panels one after another; resolves when the last bubble has been tapped (or skipped)
export function playComic(panels = OPENING) {
  return new Promise(done => {
    const b = build(), q = s => b.querySelector(s), art = q('.cm-art');
    const dots = q('.cm-dots'); dots.innerHTML = '';
    for (let k = 0; k < panels.length; k++) dots.append(mk('i'));
    let i = 0, j = 0;
    const beat = () => {
      const p = panels[i], bt = p.beats[j];
      place(b, art, bt, p);
      for (const e of [q('.cm-speech'), q('.cm-sfx')]) { e.classList.remove('in'); void e.offsetWidth; e.classList.add('in'); }
      const last = i === panels.length - 1 && j === p.beats.length - 1;
      q('.cm-next').textContent = last ? 'Go on' : 'Next';
      q('.cm-skip').hidden = last;
    };
    const panel = () => {
      const p = panels[i], pic = q('.cm-pic');
      pic.style.backgroundImage = `url(${p.img})`;
      q('.cm-fans').innerHTML = '';
      pic.classList.remove('go'); void pic.offsetWidth; pic.classList.add('go');   // (restarts the slow push-in)
      [...dots.children].forEach((d, k) => d.classList.toggle('on', k <= i));
      beat();
    };
    const close = () => { b.classList.remove('up'); setTimeout(() => { b.hidden = true; done(); }, 250); };
    const next = () => {
      if (++j < panels[i].beats.length) return beat();
      j = 0;
      if (++i >= panels.length) return close();
      panel();
    };
    q('.cm-next').onclick = e => { e.stopPropagation(); next(); };
    q('.cm-skip').onclick = e => { e.stopPropagation(); close(); };
    b.onclick = next;
    b.hidden = false;
    requestAnimationFrame(() => { b.classList.add('up'); panel(); });
  });
}

// a black card with a few words (the story's "16 hours later"); a tap moves on, or it goes by itself
export function titleCard(text, ms = 2800) {
  return new Promise(done => {
    const c = mk('div', 'cm-card'); c.append(mk('p', '', text));
    $('app').append(c);
    let over = false;
    const end = () => { if (over) return; over = true; c.classList.remove('up'); setTimeout(() => { c.remove(); done(); }, 400); };
    requestAnimationFrame(() => c.classList.add('up'));
    c.onclick = end;
    setTimeout(end, ms);
  });
}
