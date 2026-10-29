// Comic panels for the story: a full picture per panel with a narrator's box, speech, a sound mark and an on-screen message drawn
// over it by the game (the pictures carry no text), so the writing can change without remaking the art. A tap moves on.
const $ = id => document.getElementById(id);
const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

// the first night: Kabir at the window, the night before the final (still a Thunder player)
export const OPENING = [
  { img: 'img/story/open-1.webp', cap: 'Thirty thousand seats. One night away.', say: { who: 'Kabir', text: "Twenty years I've dreamed about this." } },
  { img: 'img/story/open-2.webp', say: { who: 'Kabir', text: "Every net session. Every ground that said I wasn't good enough." }, cap: 'Tomorrow, they find out.' },
  { img: 'img/story/open-3.webp', sfx: 'BZZT!', cap: 'He knew who it was before he looked.' },
  { img: 'img/story/open-4.webp', msg: { who: 'Raja', text: 'Sleep. Tomorrow we make history.' }, say: { who: 'Kabir', text: "Don't be scared. Not tonight." } },
];

let box = null;
function build() {
  if (box) return box;
  box = mk('div', 'comic'); box.id = 'comic'; box.hidden = true;
  box.innerHTML = '<div class="cm-art"><div class="cm-pic"></div><div class="cm-shade"></div><div class="cm-cap"></div><div class="cm-sfx"></div>'
    + '<div class="cm-msg"><b></b><span></span></div></div><div class="cm-say"><b></b><p></p></div>'
    + '<div class="cm-btns"><button class="cm-skip">Skip</button><span class="cm-dots"></span><button class="cm-next">Next</button></div>';
  $('app').append(box);
  return box;
}

// the panels one after another; resolves when the last has been tapped (or skipped)
export function playComic(panels = OPENING) {
  return new Promise(done => {
    const b = build(), q = s => b.querySelector(s);
    const dots = q('.cm-dots'); dots.innerHTML = '';
    for (let k = 0; k < panels.length; k++) dots.append(mk('i'));
    let i = 0;
    const show = () => {
      const p = panels[i], pic = q('.cm-pic');
      pic.style.backgroundImage = `url(${p.img})`;
      pic.classList.remove('go'); void pic.offsetWidth; pic.classList.add('go');   // (restarts the slow push-in)
      const set = (sel, on, fn) => { const e = q(sel); e.hidden = !on; e.classList.remove('in'); if (on) { fn?.(e); void e.offsetWidth; e.classList.add('in'); } };
      set('.cm-cap', !!p.cap, e => { e.textContent = p.cap; });
      set('.cm-sfx', !!p.sfx, e => { e.textContent = p.sfx; });
      set('.cm-msg', !!p.msg, e => { e.querySelector('b').textContent = p.msg.who; e.querySelector('span').textContent = p.msg.text; });
      set('.cm-say', !!p.say, e => { e.querySelector('b').textContent = p.say.who; e.querySelector('p').textContent = p.say.text; });
      [...dots.children].forEach((d, k) => d.classList.toggle('on', k <= i));
      q('.cm-next').textContent = i < panels.length - 1 ? 'Next' : 'Go on';
      q('.cm-skip').hidden = i >= panels.length - 1;
    };
    const close = () => { b.classList.remove('up'); setTimeout(() => { b.hidden = true; done(); }, 250); };
    q('.cm-next').onclick = e => { e.stopPropagation(); if (++i >= panels.length) close(); else show(); };
    q('.cm-skip').onclick = e => { e.stopPropagation(); close(); };
    b.onclick = () => q('.cm-next').click();
    show();
    b.hidden = false;
    requestAnimationFrame(() => b.classList.add('up'));
  });
}
