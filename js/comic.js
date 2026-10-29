// Comic panels for the story: a full picture per panel, with the words drawn by the game (the pictures carry no text) in speech bubbles
// whose tail points at the speaker's mouth (or at the phone for a message). Every tap brings the next bubble; when a panel has said
// everything the next tap brings the next panel.
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

let box = null;
function build() {
  if (box) return box;
  box = mk('div', 'comic'); box.id = 'comic'; box.hidden = true;
  box.innerHTML = '<div class="cm-art"><div class="cm-pic"></div><div class="cm-shade"></div><div class="cm-sfx"></div>'
    + '<div class="cm-speech"><svg class="cm-tail" aria-hidden="true"><path/></svg><div class="cm-bub"><b></b><p></p></div></div></div>'
    + '<div class="cm-btns"><button class="cm-skip">Skip</button><span class="cm-dots"></span><button class="cm-next">Next</button></div>';
  $('app').append(box);
  return box;
}

// the bubble up, with its tail to the point (fractions of the picture): the speech sits above-right of the head, a message above the phone.
// The bubble and its tail are one outline (one path), so no line crosses where the tail joins.
function place(b, art, beat) {
  const sp = b.querySelector('.cm-speech'), bub = b.querySelector('.cm-bub'), tail = b.querySelector('.cm-tail'), sfx = b.querySelector('.cm-sfx');
  const W = art.clientWidth, H = art.clientHeight, msg = !!beat.msg;
  sfx.hidden = !beat.sfx; sfx.textContent = beat.sfx || '';
  sp.hidden = !beat.say && !msg;
  if (sp.hidden) return;
  sp.classList.toggle('msg', msg);
  bub.querySelector('b').textContent = msg ? beat.msg.who : ''; bub.querySelector('b').hidden = !msg;
  bub.querySelector('p').textContent = msg ? beat.msg.text : beat.say;
  const bw = W * (msg ? 0.62 : 0.52), left = msg ? W - bw - W * 0.03 : W * 0.46;
  bub.style.width = `${bw}px`; bub.style.left = `${left}px`; bub.style.top = '0px';
  const bh = bub.offsetHeight, top = Math.max(H * 0.015, H * (msg ? 0.8 : 0.155) - bh), bottom = top + bh;
  bub.style.top = `${top}px`;
  const [tx, ty] = (msg ? PHONE : MOUTH).map((v, k) => v * (k ? H : W));
  const xa = msg ? left + bw * 0.8 : left + bw * 0.24, xb = msg ? left + bw * 0.62 : left + bw * 0.1, r = 18;
  tail.setAttribute('viewBox', `0 0 ${W} ${H}`); tail.setAttribute('width', W); tail.setAttribute('height', H);
  tail.querySelector('path').setAttribute('d',
    `M${left + r},${top} H${left + bw - r} Q${left + bw},${top} ${left + bw},${top + r} V${bottom - r} Q${left + bw},${bottom} ${left + bw - r},${bottom}`
    + ` H${xa} L${tx},${ty} L${xb},${bottom} H${left + r} Q${left},${bottom} ${left},${bottom - r} V${top + r} Q${left},${top} ${left + r},${top} Z`);
  sp.style.transformOrigin = `${tx}px ${ty}px`;
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
      place(b, art, bt);
      for (const e of [q('.cm-speech'), q('.cm-sfx')]) { e.classList.remove('in'); void e.offsetWidth; e.classList.add('in'); }
      const last = i === panels.length - 1 && j === p.beats.length - 1;
      q('.cm-next').textContent = last ? 'Go on' : 'Next';
      q('.cm-skip').hidden = last;
    };
    const panel = () => {
      const p = panels[i], pic = q('.cm-pic');
      pic.style.backgroundImage = `url(${p.img})`;
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
