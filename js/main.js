import { UI } from './ui.js';
import { Game, pickRivals } from './game.js';
import { SPARKS, heroById, heroesFor } from './heroes.js';
import { portrait } from './figure.js';
import { randomSeed } from './rng.js';
import { encodeChallenge, decodeChallenge } from './codec.js';
import { renderShareCard } from './sharecard.js';
import { loadProfile, saveProfile, level, dailyAvailable, claimDaily, matchRewards, DAILY } from './profile.js';
import { sound, unlockAudio, sfx } from './audio.js';

const $ = id => document.getElementById(id);
const ui = new UI();
const game = new Game(ui);
const profile = loadProfile();
sound.on = profile.settings.sound;
sound.haptics = profile.settings.haptics;
game.settings.fielding = profile.settings.fielding;
window.__sixcharge = { game, ui, profile };
game.onFieldSaved = choice => { profile.field = { preset: choice.field, custom: choice.custom }; saveProfile(profile); };

let challenge = decodeChallenge(location.hash.slice(1));
let pending = null; // { mode, challenge }
let lastSummary = null;

const FIELD_LABEL = { key: 'Fielding: key moments', all: 'Fielding: every chance', off: 'Fielding: auto' };

// ---------- home ----------
function renderHome() {
  ui.show('home');
  $('playerName').value = profile.name;
  const { lv, progress } = level(profile.xp);
  $('lvl').textContent = `Lv ${lv}`;
  $('xpFill').style.width = `${Math.round(progress * 100)}%`;
  $('coins').textContent = `${profile.coins} coins`;
  const daily = $('dailyBtn');
  daily.hidden = !dailyAvailable(profile);
  daily.textContent = `Day ${(profile.daily.day % 7) + 1} reward: +${DAILY[profile.daily.day % 7]} coins — claim`;
  $('setSound').textContent = `Sound: ${sound.on ? 'on' : 'off'}`;
  $('setHaptics').textContent = `Haptics: ${sound.haptics ? 'on' : 'off'}`;
  $('setField').textContent = FIELD_LABEL[game.settings.fielding];
  const card = $('challengeCard');
  if (challenge) {
    card.hidden = false;
    card.innerHTML = '';
    const h = document.createElement('h3'); h.textContent = `${challenge.name} challenged you!`;
    const p = document.createElement('p'); p.textContent = `Beat ${challenge.target} off the same 30 balls they faced (${challenge.wkts} down).`;
    card.append(h, p);
    $('btnChallengeMode').hidden = false;
  } else { card.hidden = true; $('btnChallengeMode').hidden = true; }
}

$('playerName').addEventListener('input', e => { profile.name = e.target.value.trim().slice(0, 14); saveProfile(profile); });
$('dailyBtn').addEventListener('click', () => {
  const r = claimDaily(profile);
  if (r) { saveProfile(profile); ui.toast(`Day ${r.day}: +${r.coins} coins`); sfx.dhol(); }
  renderHome();
});
$('setSound').addEventListener('click', () => { sound.on = !sound.on; profile.settings.sound = sound.on; saveProfile(profile); unlockAudio(); renderHome(); });
$('setHaptics').addEventListener('click', () => { sound.haptics = !sound.haptics; profile.settings.haptics = sound.haptics; saveProfile(profile); renderHome(); });
$('setField').addEventListener('click', () => {
  const order = ['key', 'all', 'off'];
  game.settings.fielding = order[(order.indexOf(game.settings.fielding) + 1) % 3];
  profile.settings.fielding = game.settings.fielding; saveProfile(profile); renderHome();
});

$('btnQuick').addEventListener('click', () => { unlockAudio(); pending = { mode: 'quick' }; renderSquad(); });
$('btnChallengeMode').addEventListener('click', () => { unlockAudio(); pending = { mode: 'challenge', challenge }; renderSquad(); });
$('btnTutorial').addEventListener('click', () => { unlockAudio(); showCover(); });

// ---------- squad ----------
const SLOTS = [['bat', 'Batting hero'], ['bowl', 'Bowling hero'], ['field', 'Fielding hero']];
function renderSquad() {
  ui.show('squad');
  const rows = $('squadRows');
  rows.innerHTML = '';
  for (const [slot, label] of SLOTS) {
    const wrap = document.createElement('div');
    wrap.className = 'slot';
    const h = document.createElement('h3');
    h.textContent = `${label} · Spark: ${SPARKS[slot].name}`;
    const row = document.createElement('div');
    row.className = 'slot-row';
    for (const hero of heroesFor(slot)) {
      const b = document.createElement('button');
      b.className = 'hero' + (profile.squad[slot] === hero.id ? ' on' : '');
      b.setAttribute('aria-pressed', profile.squad[slot] === hero.id);
      const top = document.createElement('div'); top.className = 'htop';
      top.append(portrait(hero, 72, slot === 'bat' ? 'bat' : slot === 'bowl' ? 'bowl' : 'celebrate'));
      const nm = document.createElement('div');
      nm.innerHTML = '<b></b><span class="role"></span>';
      nm.querySelector('b').textContent = hero.name;
      nm.querySelector('.role').textContent = hero.role;
      top.append(nm);
      const pw = document.createElement('div'); pw.className = 'pw';
      pw.textContent = hero.power.name;
      const em = document.createElement('em'); em.textContent = `${hero.power.cost}⚡`; pw.append(em);
      const desc = document.createElement('div'); desc.className = 'desc'; desc.textContent = hero.power.desc;
      b.append(top, pw, desc);
      if (hero.ultimate) {
        const u = document.createElement('div'); u.className = 'desc';
        u.textContent = `Ultimate · ${hero.ultimate.name} (${hero.ultimate.cost}⚡): ${hero.ultimate.desc}`;
        b.append(u);
      }
      const q = document.createElement('div'); q.className = 'quote'; q.textContent = `“${hero.quote}”`;
      b.append(q);
      b.addEventListener('click', () => {
        profile.squad[slot] = hero.id; saveProfile(profile); sfx.click();
        for (const x of row.children) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }
      });
      row.append(b);
    }
    wrap.append(h, row);
    rows.append(wrap);
  }
}
$('squadBack').addEventListener('click', renderHome);
$('squadGo').addEventListener('click', () => startMatch(pending || { mode: 'quick' }));

function squad() {
  return { bat: heroById(profile.squad.bat), bowl: heroById(profile.squad.bowl), field: heroById(profile.squad.field) };
}

// ---------- tutorial cover ----------
function showCover() {
  ui.show('cover');
  const p = $('coverPanel');
  p.innerHTML = '<div class="issue">ISSUE #1</div><h2>THE FINAL OVER</h2>';
  p.append(portrait(heroById('raja'), 140, 'bat'));
  const t = document.createElement('p');
  t.textContent = 'Thunder Raja needs 14 off the last 3 balls. Then you defend the final ball.';
  p.append(t);
}
$('coverGo').addEventListener('click', () => startMatch({ mode: 'tutorial' }));

// ---------- match ----------
async function startMatch(opts) {
  unlockAudio();
  ui.show(null);
  for (const s of ui.screens) $(s).hidden = true;
  const sq = opts.mode === 'tutorial' ? { bat: heroById('raja'), bowl: heroById('zara'), field: heroById('rani') } : squad();
  const seed = opts.mode === 'challenge' ? opts.challenge.seed : randomSeed();
  const order = opts.mode === 'quick' ? await coinToss(pickRivals(seed, sq)) : 'bat';
  for (const s of ui.screens) $(s).hidden = true;
  const summary = await game.runMatch({ mode: opts.mode, squad: sq, seed, order, challenge: opts.challenge, field: opts.mode === 'tutorial' ? null : profile.field });
  if (!summary) return; // quit mid-match
  if (opts.mode === 'tutorial') { profile.tutorialDone = true; saveProfile(profile); }
  showResult(summary);
}

$('btnPause').addEventListener('pointerdown', e => { e.stopPropagation(); game.paused = true; ui.show('pause'); });
$('resumeBtn').addEventListener('click', () => { game.paused = false; $('pause').hidden = true; });
$('quitBtn').addEventListener('click', () => { game.quit(); renderHome(); });

// ---------- coin toss ----------
function coinToss(rival) {
  return new Promise(resolve => {
    ui.show('toss');
    const coin = $('coin'), text = $('tossText');
    coin.className = 'coin';
    $('tossCall').hidden = false; $('tossChoose').hidden = true; $('tossGo').hidden = true;
    text.textContent = `Your captain vs ${rival.bat.name}. Call it in the air!`;
    const call = side => {
      $('tossCall').hidden = true;
      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      coin.style.setProperty('--end', result === 'heads' ? '1800deg' : '1980deg');
      void coin.offsetWidth;
      coin.classList.add('flipping');
      sfx.whoosh();
      text.textContent = 'It\'s in the air…';
      setTimeout(() => {
        coin.style.transition = 'none';
        coin.classList.remove('flipping');
        coin.classList.toggle('show-tails', result === 'tails');
        void coin.offsetWidth;
        coin.style.transition = '';
        sfx.dhol();
        if (side === result) {
          text.textContent = `${result.toUpperCase()}! You won the toss. What will you do?`;
          $('tossChoose').hidden = false;
          if (window.__SIXCHARGE_BOT) setTimeout(() => resolve(Math.random() < 0.5 ? 'bat' : 'bowl'), 100);
        } else {
          const aiBats = Math.random() < 0.4;
          text.textContent = `${result.toUpperCase()}. ${rival.bat.name} won the toss and will ${aiBats ? 'bat' : 'bowl'} first — you ${aiBats ? 'bowl' : 'bat'} first.`;
          $('tossGo').hidden = false;
          $('tossGo').onclick = () => resolve(aiBats ? 'bowl' : 'bat');
          if (window.__SIXCHARGE_BOT) setTimeout(() => resolve(aiBats ? 'bowl' : 'bat'), 100);
        }
      }, window.__SIXCHARGE_BOT ? 300 : 1350);
    };
    for (const b of $('tossCall').querySelectorAll('button')) b.onclick = () => call(b.dataset.call);
    for (const b of $('tossChoose').querySelectorAll('button')) b.onclick = () => resolve(b.dataset.choose);
    if (window.__SIXCHARGE_BOT) setTimeout(() => call(Math.random() < 0.5 ? 'heads' : 'tails'), 100);
  });
}

// ---------- result + sharing ----------
function shareBase() {
  const meta = document.querySelector('meta[name="sixcharge:share-base"]')?.content;
  return meta || location.href.split('#')[0];
}

function showResult(summary) {
  lastSummary = summary;
  const rewards = matchRewards(profile, summary);
  saveProfile(profile);
  ui.show('result');
  const win = summary.result.outcome === 'win';
  $('resTitle').textContent = win ? 'YOU WON!' : summary.result.outcome === 'tie' ? 'TIED!' : 'SO CLOSE!';
  $('resText').textContent = summary.result.text;
  const cards = $('resCards');
  cards.innerHTML = '';
  for (const inn of summary.innings) {
    const c = document.createElement('div');
    c.className = 'panel card';
    const who = inn.side === 'player' ? `You · ${summary.team.bat.name}` : `${summary.rival.bat.name}'s XI`;
    c.innerHTML = '<div class="eyebrow"></div><div class="score"></div><div class="sub"></div>';
    c.querySelector('.eyebrow').textContent = who.toUpperCase();
    c.querySelector('.score').textContent = `${inn.runs}/${inn.wkts}`;
    c.querySelector('.sub').textContent = `${inn.overs} overs`;
    cards.append(c);
  }
  $('resRewards').textContent = `+${rewards.xp} XP · +${rewards.coins} coins · Level ${level(profile.xp).lv}`;

  const name = profile.name || 'A friend';
  const card = renderShareCard(summary, profile.name);
  const img = $('shareImg');
  img.src = card.toDataURL('image/jpeg', 0.86);
  const playerInn = summary.innings.find(i => i.side === 'player');
  let link = shareBase();
  let text;
  const best = summary.moments[0];
  if (summary.mode !== 'tutorial' && playerInn) {
    const token = encodeChallenge({ seed: summary.seed, target: playerInn.runs, wkts: playerInn.wkts, balls: playerInn.balls, name, squad: [summary.team.bat.id, summary.team.bowl.id, summary.team.field.id], moment: best?.kind || '' });
    link = `${link}#${token}`;
    text = `I scored ${playerInn.runs}/${playerInn.wkts} in Sixcharge${best ? ` with a ${best.title.replace(/!$/, '')}` : ''}! Beat my score off the same 30 balls: ${link}`;
  } else {
    text = `I just won Issue #1 of Sixcharge: Superhero Cricket${best ? ` with a ${best.title.replace(/!$/, '')}` : ''}! Play it here: ${link}`;
  }
  $('shareLink').value = link;
  $('shareWa').href = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const nb = $('shareNative');
  nb.hidden = true;
  card.toBlob(blob => {
    if (!blob) return;
    const file = new File([blob], 'sixcharge.jpg', { type: 'image/jpeg' });
    if (navigator.canShare?.({ files: [file] })) {
      nb.hidden = false;
      nb.onclick = async () => {
        try { await navigator.share({ files: [file], text }); } catch { /* cancelled or not allowed */ }
      };
    }
  }, 'image/jpeg', 0.86);
  $('resAgain').textContent = summary.mode === 'tutorial' ? 'Play Quick Match' : 'Play again';
}

$('copyLink').addEventListener('click', async () => {
  const input = $('shareLink');
  try { await navigator.clipboard.writeText(input.value); ui.toast('Challenge link copied'); }
  catch { input.select(); ui.toast('Link selected — copy it from the box'); }
});
$('resHome').addEventListener('click', renderHome);
$('resAgain').addEventListener('click', () => {
  if (lastSummary?.mode === 'challenge') { pending = { mode: 'challenge', challenge }; startMatch(pending); }
  else { pending = { mode: 'quick' }; renderSquad(); }
});

addEventListener('hashchange', () => {
  challenge = decodeChallenge(location.hash.slice(1));
  if (challenge && $('hud').hidden) renderHome();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && !$('hud').hidden && !game.paused) { game.paused = true; ui.show('pause'); }
});

// ---------- boot ----------
(async () => {
  try { await Promise.race([document.fonts.load('40px Bangers'), new Promise(r => setTimeout(r, 1500))]); } catch { /* fallback fonts */ }
  if (!profile.tutorialDone && !challenge && !window.__SIXCHARGE_BOT) showCover();
  else renderHome();
})();

