// The first-time story: Uncle Dev tells you about the Thunder Strikers, then the match against them, where their players
// pop up to taunt you (taunt) and he calms you down (coach.js). Played once, by a brand-new player; the tutorial from
// the menu is the old one.
import { portraitFace } from './futcard.js';
import { portrait } from './figure.js';
import { faceEl } from './looks.js';

const $ = id => document.getElementById(id);
const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

// ---------- the story before the match ----------
// each panel: a picture, the big words, what Uncle Dev says under them
export const PANELS = [
  { bg: 'img/ground/thunder/view-bat.webp', head: 'THE THUNDERDOME', sub: 'Home of the Thunder Strikers',
    dev: "Fifty years I've watched cricket, beta. I've never seen a team like the Thunder Strikers." },
  { bg: 'img/menu/title-bg.webp', crest: 'img/logo-thunder.webp', head: 'UNBEATEN', sub: 'Champions. Again. And again.',
    dev: "They know they're the best. Everyone knows. Nobody has come close to beating them." },
  { bg: 'img/menu/title-bg.webp', head: 'NOBODY... UNTIL NOW?', sub: '',
    dev: "I've been looking for one player who isn't afraid of them. Looking at you, I think I just found them." },
  { bg: 'img/ground/thunder/view-bowl.webp', head: 'YOUR FIRST MATCH', sub: 'Their ground. Their crowd. Their rules.',
    dev: "They'll laugh. The crowd will boo. Let them. Show them what you've got, beta." },
];

let story = null;
function build() {
  if (story) return story;
  const box = mk('div', 'story');
  box.id = 'story'; box.hidden = true;
  box.innerHTML = '<div class="story-bg"></div><div class="story-shade"></div>'
    + '<img class="story-crest" alt="" hidden>'
    + '<div class="story-cap"><h2 class="story-head"></h2><p class="story-sub"></p></div>'
    + '<div class="story-dev"><img class="story-face" src="img/menu/coach-dev.webp" alt=""><div class="story-say"><b>Uncle Dev</b><p class="story-line"></p></div></div>'
    + '<div class="story-btns"><button class="story-skip">Skip</button><button class="story-next go">Next</button></div>';
  $('app').append(box);
  return (story = box);
}

// the panels one after another, a tap on Next moving on; resolves when they are done (or skipped)
export function storyIntro() {
  return new Promise(done => {
    const box = build(), q = s => box.querySelector(s);
    let i = 0;
    const show = () => {
      const p = PANELS[i];
      const bg = q('.story-bg'), cap = q('.story-cap'), dev = q('.story-dev'), crest = q('.story-crest');
      bg.style.backgroundImage = `url(${p.bg})`;
      bg.classList.remove('go'); void bg.offsetWidth; bg.classList.add('go');   // (restarts the slow push-in)
      crest.hidden = !p.crest; if (p.crest) crest.src = p.crest;
      q('.story-head').textContent = p.head; q('.story-sub').textContent = p.sub;
      q('.story-line').textContent = p.dev;
      for (const e of [cap, dev, crest]) { e.classList.remove('in'); void e.offsetWidth; e.classList.add('in'); }
      q('.story-next').textContent = i < PANELS.length - 1 ? 'Next' : "Let's go!";
      q('.story-skip').hidden = i >= PANELS.length - 1;
    };
    const close = () => { box.classList.remove('up'); setTimeout(() => { box.hidden = true; done(); }, 250); };
    q('.story-next').onclick = e => { e.stopPropagation(); if (++i >= PANELS.length) close(); else show(); };
    q('.story-skip').onclick = e => { e.stopPropagation(); close(); };
    show();
    box.hidden = false;
    requestAnimationFrame(() => box.classList.add('up'));
  });
}

// ---------- the Thunder players, popping up in the match ----------
let tauntBox = null, tauntTimer = 0, tauntDone = null;
function buildTaunt() {
  if (tauntBox) return tauntBox;
  tauntBox = mk('div', 'taunt');
  tauntBox.id = 'taunt'; tauntBox.hidden = true;
  tauntBox.innerHTML = '<div class="taunt-pic"></div><div class="taunt-bubble"><b class="taunt-name"></b><p class="taunt-text"></p></div>';
  $('app').append(tauntBox);
  return tauntBox;
}
// the player's face: his painted portrait, else his drawn face
function faceOf(p, team) {
  const pic = portraitFace(p, team, 64);
  if (pic) return pic;
  const hero = p.hero && typeof p.hero === 'object' ? p.hero : null;
  return hero ? portrait(hero, 64, 'celebrate') : faceEl(p, team, 64, 'taunt-face', true);
}
// a line from one of them, on a bubble with his face; it goes after a moment, or on a tap. Resolves when it has gone.
export function taunt(p, team, line, { ms = 2800, side = 'left', quiet = false } = {}) {
  if (!p) return Promise.resolve();
  const box = buildTaunt();
  clearTimeout(tauntTimer);
  tauntDone?.();   // (a line still up makes way for this one)
  return new Promise(res => {
    const pic = box.querySelector('.taunt-pic');
    pic.replaceChildren(faceOf(p, team));
    box.querySelector('.taunt-name').textContent = p.name.toUpperCase();
    box.querySelector('.taunt-text').textContent = line;
    box.classList.toggle('right', side === 'right');
    box.classList.toggle('quiet', quiet);   // (in a match: smaller, lower, and taps go through it)
    box.classList.remove('up'); void box.offsetWidth;
    box.hidden = false;
    requestAnimationFrame(() => box.classList.add('up'));
    const finish = () => {
      clearTimeout(tauntTimer); tauntDone = null;
      box.classList.remove('up');
      setTimeout(() => { if (!tauntDone) box.hidden = true; }, 220);
      res();
    };
    tauntDone = finish;
    tauntTimer = setTimeout(finish, ms);
    box.onpointerdown = quiet ? null : e => { e.stopPropagation(); finish(); };
  });
}

// ---------- what they say ----------
export const TAUNTS = {
  welcome: ['So you think you can beat us? Hahaha!', "Nobody beats the Strikers. Nobody. Ask anyone."],
  bowler: ['Calculated. Chance of you surviving this over: tiny.', 'Hit it if you can, rookie.'],
  mate: ['Somebody tell the kid where he is. This is the Thunderdome!', 'Is he lost? The visitors\' gate is that way.'],
  lucky: ['Lucky. That was pure luck.', 'Enjoy it. It won\'t last.'],
  power: ["Let's see you handle my Shatter Seam!", 'This one has your name on it!'],
  blocked: ["Hm. The rookie has hands. Doesn't matter.", 'You blocked one. Want a medal?'],
  stunned: ["Wait... why is he still in?", "Don't look at me! Get him out!"],
  six: ["No... that's not possible!", "Hang on. Did he just...?"],
  chase: ['Ten off three? We will do it in two.', 'Easy runs, this. Bowl, rookie.'],
  captain: ["Send in the captain. I'll finish this.", 'Move over. Raja is here.'],
  last: ["This is where your fairytale ends, rookie.", 'One ball. Bowl it, if you dare.'],
  out: ['IMPOSSIBLE!', 'No... no, no, no!'],
};
export const pick = list => list[Math.floor(Math.random() * list.length)];
