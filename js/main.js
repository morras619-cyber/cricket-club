import { UI } from './ui.js';
import { Game, pickRivals } from './game.js';
import { SPARKS, heroById, heroesFor } from './heroes.js';
import { TEAMS } from './teams.js';
import { loadBowlSprites, spriteStatus } from './bowlsprite.js';
import { batSpriteMissing } from './batsprite.js';
import { squadPool, resolveLineup, batCandidates, bowlCandidates, bowlType, isUnlocked, UNLOCK_COST, ORDER_SIZE, ATTACK_SIZE } from './squads.js';
import { portrait } from './figure.js';
import { randomSeed } from './rng.js';
import { encodeChallenge, decodeChallenge } from './codec.js';
import { renderShareCard } from './sharecard.js';
import { loadProfile, saveProfile, level, dailyAvailable, claimDaily, matchRewards, DAILY, careerStats, recordStats, fmt, unlockHero } from './profile.js';
import { sound, unlockAudio, sfx } from './audio.js';

// framed by another app (e.g. a viewer with its own header): don't add the notch space again
try { if (window.self !== window.top) document.documentElement.classList.add('embedded'); } catch { document.documentElement.classList.add('embedded'); }

const $ = id => document.getElementById(id);
const ui = new UI();
const game = new Game(ui);
const profile = loadProfile();
// heroes already picked before unlocks existed stay unlocked
for (const id of Object.values(profile.squad || {})) if (id && !profile.unlocked.includes(id)) profile.unlocked.push(id);
// start downloading the bowler sheets (pace and spin) while the menus are up
loadBowlSprites(profile.team || 'thunder');
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
$('btnStats').addEventListener('click', () => { unlockAudio(); renderStats(); });
$('statsBack').addEventListener('click', () => renderHome());

// ---------- career stats ----------
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
function statGrid(items) {
  const g = el('div', 'statgrid');
  for (const [label, value] of items) { const d = el('div'); d.append(el('b', '', value), el('span', '', label)); g.append(d); }
  return g;
}
const batItems = t => [['Innings', t.inns], ['Runs', t.runs], ['Balls', t.balls], ['Highest', fmt.hs(t)], ['Average', fmt.avg(t.runs, t.inns - t.notOuts)], ['Strike rate', fmt.sr(t.runs, t.balls)], ['4s / 6s', `${t.fours}/${t.sixes}`], ['Longest six', t.longestSix ? `${t.longestSix}m` : '—'], ['Ducks', t.ducks]];
const bowlItems = t => [['Overs', fmt.overs(t.balls)], ['Wickets', t.wkts], ['Runs against', t.runs], ['Best', fmt.best(t)], ['Economy', fmt.econ(t.runs, t.balls)], ['Average', fmt.avg(t.runs, t.wkts)], ['Dot balls', t.dots], ['Maidens', t.maidens]];

function renderStats() {
  ui.show('stats');
  const s = careerStats(profile);
  const body = $('statsBody');
  body.innerHTML = '';
  body.className = 'statsbody';
  const card = (title, grid) => { const c = el('div', 'panel paper statcard'); c.append(el('h3', '', title), grid); return c; };
  body.append(card('Batting', statGrid(batItems(s.bat))), card('Bowling', statGrid(bowlItems(s.bowl))));
  const table = (title, slot, kind, cols) => {
    const c = el('div', 'panel paper statcard');
    c.append(el('h3', '', title));
    const wrap = el('div', 'tablewrap'), t = el('table', 'herotable'), head = el('tr');
    for (const h of ['Hero', ...cols.map(x => x[0])]) head.append(el('th', '', h));
    t.append(head);
    for (const hero of heroesFor(slot)) {
      const st = s.heroes[hero.id]?.[kind];
      const tr = el('tr');
      tr.append(el('td', '', hero.name));
      for (const [, f] of cols) tr.append(el('td', '', st && st.inns ? f(st) : '—'));
      t.append(tr);
    }
    wrap.append(t); c.append(wrap);
    return c;
  };
  body.append(
    table('Batting heroes', 'bat', 'bat', [['Runs', t => t.runs], ['HS', fmt.hs], ['Avg', t => fmt.avg(t.runs, t.inns - t.notOuts)], ['SR', t => fmt.sr(t.runs, t.balls)], ['Ducks', t => t.ducks]]),
    table('Bowling heroes', 'bowl', 'bowl', [['Wkts', t => t.wkts], ['Best', fmt.best], ['Overs', t => fmt.overs(t.balls)], ['Runs', t => t.runs], ['Econ', t => fmt.econ(t.runs, t.balls)]]),
  );
}
function heroStatLine(hero) {
  const s = careerStats(profile).heroes[hero.id];
  if (hero.slot === 'bat' && s?.bat?.inns) return `${s.bat.runs} runs · HS ${fmt.hs(s.bat)} · Avg ${fmt.avg(s.bat.runs, s.bat.inns - s.bat.notOuts)}`;
  if (hero.slot === 'bowl' && s?.bowl?.inns) return `${s.bowl.wkts} wkts · Best ${fmt.best(s.bowl)} · Econ ${fmt.econ(s.bowl.runs, s.bowl.balls)}`;
  return hero.slot === 'field' ? null : 'No matches yet';
}

// ---------- squad ----------
const SLOTS = [['bat', 'Batting hero'], ['bowl', 'Bowling hero'], ['field', 'Fielding hero']];
function renderSquad() {
  ui.show('squad');
  const rows = $('squadRows');
  rows.innerHTML = '';
  rows.append(teamPicker());
  for (const [slot, label] of SLOTS) {
    const wrap = document.createElement('div');
    wrap.className = 'slot';
    const h = document.createElement('h3');
    h.textContent = `${label} · Spark: ${SPARKS[slot].name}`;
    const row = document.createElement('div');
    row.className = 'slot-row';
    for (const hero of heroesFor(slot)) {
      const b = document.createElement('button');
      const locked = !isUnlocked(profile, hero.id);
      b.className = 'hero' + (profile.squad[slot] === hero.id ? ' on' : '') + (locked ? ' locked' : '');
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
      const statLine = heroStatLine(hero);
      if (statLine) b.append(el('div', 'herostat', statLine));
      const q = document.createElement('div'); q.className = 'quote'; q.textContent = `“${hero.quote}”`;
      b.append(q);
      if (locked) b.append(el('div', 'unlock', `🔒 Unlock · ${UNLOCK_COST} coins`));
      b.addEventListener('click', () => {
        if (!isUnlocked(profile, hero.id)) {
          if (!unlockHero(profile, hero.id, UNLOCK_COST)) { ui.toast(`You need ${UNLOCK_COST - profile.coins} more coins to unlock ${hero.name}`); return; }
          ui.toast(`${hero.name} unlocked!`); sfx.full();
        } else sfx.click();
        profile.squad[slot] = hero.id; saveProfile(profile);
        renderSquad();
      });
      row.append(b);
    }
    wrap.append(h, row);
    rows.append(wrap);
    // keep the chosen star in view after a re-render
    const on = row.querySelector('.on');
    if (on) requestAnimationFrame(() => { row.scrollLeft = on.offsetLeft - 8; });
  }
  rows.append(teamSheet());
  $('squadCoins').textContent = `${profile.coins} coins`;
}

// ---------- team sheet: batting order and bowling attack ----------
function currentLineup() {
  const id = profile.team || 'thunder', heroes = squad();
  const r = resolveLineup(id, heroes, profile.lineups?.[id]);
  return { id, heroes, pool: squadPool(id, heroes), order: r.order, attack: r.attack };
}
function saveLineup(order, attack) {
  const id = profile.team || 'thunder';
  profile.lineups = profile.lineups || {};
  profile.lineups[id] = { order: order.map(p => p.id), attack: attack.map(p => p.id) };
  saveProfile(profile);
}
function teamSheet() {
  const L = currentLineup();
  const wrap = el('div', 'slot teamsheet');
  const pick = (title, list, cands, size, label, onSet) => {
    const box = el('div', 'panel paper sheetbox');
    box.append(el('h3', '', title));
    for (let i = 0; i < size; i++) {
      const row = el('label', 'sheetrow');
      row.append(el('span', 'sheetno', String(i + 1)));
      const sel = document.createElement('select');
      sel.setAttribute('aria-label', `${title} ${i + 1}`);
      for (const p of cands) {
        const o = document.createElement('option');
        o.value = p.id; o.textContent = `${p.hero ? '★ ' : ''}${p.name} · ${label(p)}`;
        sel.append(o);
      }
      sel.value = list[i]?.id || '';
      sel.addEventListener('change', () => {
        const p = cands.find(c => c.id === sel.value);
        const j = list.indexOf(p);
        const next = [...list];
        if (j >= 0) next[j] = list[i]; // already picked: swap places
        next[i] = p;
        onSet(next); sfx.click(); renderSquad();
      });
      row.append(sel);
      box.append(row);
    }
    return box;
  };
  const roleTxt = p => `${p.label} · bat ${p.bat}`;
  wrap.append(
    el('h3', '', `${TEAMS.find(t => t.id === L.id)?.name || 'Your'} team sheet`),
    el('p', 'sheetnote', 'Bat in this order: when a batter is out, the next one walks in. Your three bowlers share the five overs (two each at most), and you pick who bowls each over.'),
    pick('Batting order', L.order, batCandidates(L.pool), ORDER_SIZE, roleTxt, next => saveLineup(next, L.attack)),
    pick('Bowling attack', L.attack, bowlCandidates(L.pool), ATTACK_SIZE, p => `${bowlType(p.bowl).name}${p.bowlSkill ? ` · ${p.bowlSkill}` : ''}`, next => saveLineup(L.order, next)),
  );
  return wrap;
}
$('squadBack').addEventListener('click', renderHome);
$('squadGo').addEventListener('click', () => startMatch(pending || { mode: 'quick' }));

// your team: its kit is what your batter, keeper and fielders wear
function teamPicker() {
  const wrap = el('div', 'slot');
  const h = el('h3', '', 'Your team');
  const row = el('div', 'slot-row teams');
  for (const t of TEAMS) {
    const b = document.createElement('button');
    const on = (profile.team || 'thunder') === t.id;
    b.className = 'team' + (on ? ' on' : '');
    b.setAttribute('aria-pressed', on);
    b.style.setProperty('--suit', t.suit); b.style.setProperty('--trim', t.trim);
    const logo = document.createElement('img'); logo.src = `img/logo-${t.id}.webp`; logo.alt = '';
    b.append(logo, el('b', '', t.name));
    b.addEventListener('click', () => {
      profile.team = t.id; saveProfile(profile); sfx.click();
      renderSquad();
    });
    row.append(b);
  }
  wrap.append(h, row);
  return wrap;
}

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
  const lineup = opts.mode === 'tutorial' ? null : profile.lineups?.[profile.team || 'thunder'] || null;
  const summary = await game.runMatch({ lineup, mode: opts.mode, records: { longestSix: careerStats(profile).bat.longestSix || 0 }, squad: sq, team: opts.mode === 'tutorial' ? 'thunder' : profile.team, seed, order, challenge: opts.challenge, field: opts.mode === 'tutorial' ? null : profile.field });
  if (!summary) return; // quit mid-match
  if (opts.mode === 'tutorial') { profile.tutorialDone = true; saveProfile(profile); }
  showResult(summary);
}

$('btnPause').addEventListener('pointerdown', e => {
  e.stopPropagation(); game.paused = true; ui.show('pause');
  // which hand-drawn sheets are in use: helps tell a slow download from a phone out of memory
  const st = spriteStatus(), miss = [...st.missing, ...batSpriteMissing()];
  $('pauseInfo').textContent = miss.length ? `Drawings missing: ${miss.join(', ')}` : `All ${st.total} drawing sheets loaded`;
});
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
  const rec = summary.mode === 'tutorial' ? null : recordStats(profile, summary);
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
    const who = inn.side === 'player' ? `You · ${summary.myTeam?.name || summary.team.bat.name}` : `${summary.oppTeam?.name || `${summary.rival.bat.name}'s XI`}`;
    c.innerHTML = '<div class="eyebrow"></div><div class="score"></div><div class="sub"></div>';
    c.querySelector('.eyebrow').textContent = who.toUpperCase();
    c.querySelector('.score').textContent = `${inn.runs}/${inn.wkts}`;
    c.querySelector('.sub').textContent = `${inn.overs} overs`;
    cards.append(c);
  }
  $('resRewards').textContent = `+${rewards.xp} XP · +${rewards.coins} coins · Level ${level(profile.xp).lv}`;
  // this match's scorecard for your heroes
  const ms = $('resStats');
  ms.innerHTML = '';
  ms.hidden = !rec || (!rec.batting && !rec.bowling);
  if (rec?.batting) {
    const runs = rec.batting.reduce((a, b) => a + b.runs, 0), balls = rec.batting.reduce((a, b) => a + b.balls, 0);
    for (const st of rec.batting) {
      const r = el('div', 'row');
      r.append(el('b', '', `${st.id === summary.team.bat.id ? '★ ' : ''}${st.name || summary.team.bat.name}`), el('span', '', `${fmt.stint(st)}${st.out && st.how ? ` · ${st.how}` : ''}`));
      ms.append(r);
    }
    const r2 = el('div', 'row');
    r2.append(el('span', '', `${runs} runs off ${balls} · SR ${fmt.sr(runs, balls)} · ${rec.batting.reduce((a, b) => a + b.fours, 0)}×4 ${rec.batting.reduce((a, b) => a + b.sixes, 0)}×6`));
    if (rec.batting.some(st => st.out && st.runs === 0)) r2.append(el('span', 'badge', 'DUCK!'));
    if (rec.newHS) r2.append(el('span', 'badge', 'NEW HIGH SCORE'));
    if (rec.newLongSix) r2.append(el('span', 'badge', `LONGEST SIX · ${summary.stats.longestSix}m`));
    ms.append(r2);
  }
  if (rec?.bowling) {
    const f = rec.bowling;
    for (const b of rec.bowlingCard?.length ? rec.bowlingCard : [{ ...f, name: summary.team.bowl.name, id: summary.team.bowl.id }]) {
      const r = el('div', 'row');
      r.append(el('b', '', `${b.id === summary.team.bowl.id ? '★ ' : ''}${b.name}`), el('span', '', `${fmt.figures(b)}${b.type ? ` · ${bowlType(b.type).short}` : ''}`));
      ms.append(r);
    }
    const r2 = el('div', 'row');
    r2.append(el('span', '', `Econ ${fmt.econ(f.runs, f.balls)} · ${f.dots} dots${f.maidens ? ` · ${f.maidens} maiden${f.maidens > 1 ? 's' : ''}` : ''}`));
    if (rec.newBest) r2.append(el('span', 'badge', 'BEST FIGURES'));
    ms.append(r2);
  }

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
  game.resize(); // redraw the cached stadium now the comic font is ready
  if (!profile.tutorialDone && !challenge && !window.__SIXCHARGE_BOT) showCover();
  else renderHome();
})();

