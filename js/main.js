import { UI } from './ui.js';
import { Game } from './game.js';
import { SPARKS, HEROES, heroById, heroesFor } from './heroes.js';
import { TEAMS, teamById, rivalTeam, teamOfHero } from './teams.js';
import { loadBowlSprites, spriteStatus } from './bowlsprite.js';
import { batSpriteMissing } from './batsprite.js';
import { squadPool, resolveLineup, batCandidates, bowlCandidates, bowlType, isUnlocked, UNLOCK_COST, ORDER_SIZE, ATTACK_SIZE, roster, fullName, starSquad, playerSquad } from './squads.js';
import { newLeague, newCup, nextFixture, advance, playerResult, table, finish, unbeaten, LEAGUE_PRIZE, CUP_PRIZE } from './tournament.js';
import { dailyScenario, updateStreak } from './daily.js';
import { heroXpFromMatch, addHeroXp, heroLevels, levelProgress, levelPerks, powerDiscount, checkAchievements, ACHIEVEMENTS } from './progress.js';
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
// heroes already picked before unlocks existed stay unlocked (signed)
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
let tourNotes = []; // what happened in the tournament after the last match

const FIELD_LABEL = { key: 'Fielding: key moments', all: 'Fielding: every chance', off: 'Fielding: auto' };

// ---------- home: the hub ----------
const myTeam = () => teamById(profile.team || 'thunder');
function renderHome() {
  ui.show('home');
  $('playerName').value = profile.name;
  const { lv, progress } = level(profile.xp);
  $('lvl').textContent = `Lv ${lv}`;
  $('xpFill').style.width = `${Math.round(progress * 100)}%`;
  $('coins').textContent = `${profile.coins} coins`;
  const t = myTeam();
  $('badgeLogo').src = `img/logo-${t.id}.webp`;
  $('badgeName').textContent = t.name;
  $('badgeStyle').textContent = `${t.style.tag} · ★ ${heroById(t.star).name}`;
  const daily = $('dailyBtn');
  daily.hidden = !dailyAvailable(profile);
  daily.textContent = `Day ${(profile.daily.day % 7) + 1} reward: +${DAILY[profile.daily.day % 7]} coins — claim`;
  $('setSound').textContent = `Sound: ${sound.on ? 'on' : 'off'}`;
  $('setHaptics').textContent = `Haptics: ${sound.haptics ? 'on' : 'off'}`;
  $('setField').textContent = FIELD_LABEL[game.settings.fielding];
  // what each mode is doing right now
  const tour = profile.tournament;
  const status = kind => {
    if (tour?.kind !== kind) return null;
    const f = nextFixture(tour);
    return f ? `${teamById(tour.team).name} · ${f.label} v ${teamById(f.opp).name}` : 'Finished — see the results';
  };
  $('leagueSub').textContent = status('league') || '8 teams · table · semis · final';
  $('cupSub').textContent = status('cup') || 'Quarter, semi, final: 3 wins for the cup';
  const sc = dailyScenario(), done = profile.dailyChallenge?.key === sc.key;
  $('dailySub').textContent = done ? `Done today: ${profile.dailyChallenge.line} ${profile.dailyChallenge.won ? '✅' : '❌'}` : `#${sc.no} · ${sc.title}`;
  $('btnDaily').classList.toggle('done', done);
  $('btnTrophies').textContent = `Trophies ${Object.keys(profile.achievements || {}).length}/${ACHIEVEMENTS.length}`;
  const card = $('challengeCard');
  if (challenge) {
    card.hidden = false;
    card.innerHTML = '';
    const h = document.createElement('h3'); h.textContent = `${challenge.name} challenged you!`;
    const p = document.createElement('p'); p.textContent = `Beat ${challenge.target} off the same 30 balls they faced (${challenge.wkts} down)${challenge.opp ? ` against ${teamById(challenge.opp).name}` : ''}.`;
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
$('btnLeague').addEventListener('click', () => { unlockAudio(); openTournament('league'); });
$('btnCup').addEventListener('click', () => { unlockAudio(); openTournament('cup'); });
$('btnDaily').addEventListener('click', () => { unlockAudio(); renderDaily(); });
$('btnTeam').addEventListener('click', () => { unlockAudio(); pending = null; renderSquad(); });
$('teamBadge').addEventListener('click', () => { unlockAudio(); pending = null; renderSquad(); });
$('btnTrophies').addEventListener('click', () => { unlockAudio(); renderTrophies(); });
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

// ---------- My Team: the team, its star, signings and the team sheet ----------
const SLOTS = [['bat', 'Batting hero'], ['bowl', 'Bowling hero'], ['field', 'Fielding hero']];
function heroCard(hero, { on, locked, note, onTap }) {
  const b = document.createElement('button');
  b.className = 'hero' + (on ? ' on' : '') + (locked ? ' locked' : '');
  b.setAttribute('aria-pressed', !!on);
  const top = el('div', 'htop');
  top.append(portrait(hero, 72, hero.slot === 'bat' ? 'bat' : hero.slot === 'bowl' ? 'bowl' : 'celebrate'));
  const nm = el('div');
  nm.append(el('b', '', hero.name), el('span', 'role', `${hero.role} · ${teamOfHero(hero.id)?.name || ''}`));
  top.append(nm);
  const lv = levelProgress(profile.heroXp?.[hero.id] || 0);
  const pw = el('div', 'pw', hero.power.name);
  pw.append(el('em', '', `${hero.power.cost - powerDiscount(lv.lv)}⚡`));
  b.append(top, el('div', 'herolv', `Level ${lv.lv}${lv.next ? ` · ${lv.next} XP to next` : ' · max'} · ${levelPerks(lv.lv)}`), pw, el('div', 'desc', hero.power.desc));
  if (hero.ultimate) b.append(el('div', 'desc', `Ultimate · ${hero.ultimate.name} (${hero.ultimate.cost}⚡): ${hero.ultimate.desc}`));
  const statLine = heroStatLine(hero);
  if (statLine) b.append(el('div', 'herostat', statLine));
  if (note) b.append(el('div', 'herostat', note));
  if (locked) b.append(el('div', 'unlock', `🔒 Sign · ${UNLOCK_COST} coins`));
  if (onTap) b.addEventListener('click', onTap);
  return b;
}
function renderSquad() {
  ui.show('squad');
  $('squadGo').textContent = pending ? 'Start match' : 'Done';
  const rows = $('squadRows');
  rows.innerHTML = '';
  rows.append(teamPicker());
  const t = myTeam(), star = heroById(t.star);
  // the team's own star always plays
  const starWrap = el('div', 'slot');
  starWrap.append(el('h3', '', `${t.name} · ${t.style.tag}`), el('p', 'sheetnote', t.style.desc));
  const starRow = el('div', 'slot-row');
  starRow.append(heroCard(star, { on: true, note: `★ Your star · plays every match` }));
  starWrap.append(starRow);
  rows.append(starWrap);
  for (const [slot, label] of SLOTS) {
    if (slot === star.slot) continue;
    const wrap = el('div', 'slot');
    wrap.append(el('h3', '', `${label} · signing (optional)`));
    const row = el('div', 'slot-row');
    for (const hero of heroesFor(slot)) {
      if (hero === star) continue;
      const locked = !isUnlocked(profile, hero.id);
      const on = profile.squad[slot] === hero.id && !locked;
      row.append(heroCard(hero, {
        on, locked, note: on ? 'Signed · plays for you (not against his own team)' : null,
        onTap: () => {
          if (!isUnlocked(profile, hero.id)) {
            if (!unlockHero(profile, hero.id, UNLOCK_COST)) { ui.toast(`You need ${UNLOCK_COST - profile.coins} more coins to sign ${hero.name}`); return; }
            ui.toast(`${hero.name} signed!`); sfx.full();
            awardAchievements({ events: ['sign'] });
          } else sfx.click();
          profile.squad[slot] = on ? null : hero.id; // tap your signing again to leave the slot empty
          saveProfile(profile);
          renderSquad();
        },
      }));
    }
    wrap.append(row);
    if (!profile.squad[slot] || !isUnlocked(profile, profile.squad[slot])) wrap.append(el('p', 'sheetnote', `No ${label.toLowerCase()} signed: your ${SPARKS[slot].name} still works.`));
    rows.append(wrap);
    const onCard = row.querySelector('.on');
    if (onCard) requestAnimationFrame(() => { row.scrollLeft = onCard.offsetLeft - 8; });
  }
  rows.append(teamSheet());
  $('squadCoins').textContent = `${profile.coins} coins`;
}

// ---------- team sheet: batting order and bowling attack ----------
function currentLineup() {
  const id = profile.team || 'thunder', heroes = squad();
  const levels = heroLevels(profile);
  const r = resolveLineup(id, heroes, profile.lineups?.[id], levels);
  return { id, heroes, pool: squadPool(id, heroes, levels), order: r.order, attack: r.attack };
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
        o.value = p.id; o.textContent = `${p.hero ? '★ ' : ''}${fullName(p)} · ${label(p)}`;
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
  // the whole squad, with what each player is known for
  const squadList = el('div', 'panel paper sheetbox');
  squadList.append(el('h3', '', 'The squad'));
  for (const p of roster(L.id)) {
    const r = el('div', 'squadrow');
    r.append(el('b', '', fullName(p)), el('span', '', `${p.label}${p.bowl ? ` · ${bowlType(p.bowl).short}` : ''} · ${p.trait}`));
    squadList.append(r);
  }
  wrap.append(
    el('h3', '', `${TEAMS.find(t => t.id === L.id)?.name || 'Your'} team sheet`),
    el('p', 'sheetnote', 'Bat in this order: when a batter is out, the next one walks in. Your three bowlers share the five overs (two each at most), and you pick who bowls each over.'),
    pick('Batting order', L.order, batCandidates(L.pool), ORDER_SIZE, roleTxt, next => saveLineup(next, L.attack)),
    pick('Bowling attack', L.attack, bowlCandidates(L.pool), ATTACK_SIZE, p => `${bowlType(p.bowl).name}${p.bowlSkill ? ` · ${p.bowlSkill}` : ''}`, next => saveLineup(L.order, next)),
    squadList,
  );
  return wrap;
}
$('squadBack').addEventListener('click', renderHome);
$('squadGo').addEventListener('click', () => (pending ? startMatch(pending) : renderHome()));

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
    b.append(logo, el('b', '', t.name), el('small', '', t.style.tag));
    b.addEventListener('click', () => {
      profile.team = t.id; saveProfile(profile); sfx.click();
      loadBowlSprites(t.id);
      renderSquad();
    });
    row.append(b);
  }
  wrap.append(h, row);
  const on = row.querySelector('.on');
  if (on) requestAnimationFrame(() => { row.scrollLeft = on.offsetLeft - 8; });
  return wrap;
}

// your side for a match: your team's star plus your signings (who sit out against their own team)
function squad(teamId = profile.team || 'thunder', oppId = null) {
  return playerSquad(teamId, profile.squad, profile.unlocked || [], oppId);
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
// opts.mode: 'quick' | 'challenge' | 'tutorial' | 'league' | 'cup' | 'daily'
async function startMatch(opts) {
  unlockAudio();
  ui.show(null);
  for (const s of ui.screens) $(s).hidden = true;
  const mode = opts.mode;
  const seed = mode === 'challenge' ? opts.challenge.seed : mode === 'daily' ? opts.scenario.seed : randomSeed();
  let team = profile.team || 'thunder', opp = null, sq, lineup = null, levels = heroLevels(profile);
  if (mode === 'tutorial') {
    team = 'thunder'; sq = { bat: heroById('raja'), bowl: heroById('zara'), field: heroById('rani') }; levels = {};
  } else if (mode === 'daily') {
    // the same for everyone: the day's two teams, their own stars, default line-ups, no levels
    team = opts.scenario.team; opp = opts.scenario.opp; sq = starSquad(team); levels = {};
  } else {
    if (mode === 'league' || mode === 'cup') { team = profile.tournament.team; opp = nextFixture(profile.tournament).opp; }
    if (mode === 'challenge') {
      opp = opts.challenge.opp || null;
      if (opp === team) team = opts.challenge.team || TEAMS.find(t => t.id !== opp).id;
    }
    if (!opp) opp = rivalTeam(seed, team).id;
    sq = squad(team, opp);
    lineup = profile.lineups?.[team] || null;
  }
  const order = mode === 'quick' || mode === 'league' || mode === 'cup' ? await coinToss(teamById(opp)) : 'bat';
  for (const s of ui.screens) $(s).hidden = true;
  const summary = await game.runMatch({
    mode, seed, order, team, opp, squad: sq, lineup, levels, scenario: opts.scenario, challenge: opts.challenge,
    records: { longestSix: careerStats(profile).bat.longestSix || 0 }, field: mode === 'tutorial' ? null : profile.field,
  });
  if (!summary) return; // quit mid-match
  if (mode === 'tutorial') { profile.tutorialDone = true; saveProfile(profile); }
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

// ---------- tournaments ----------
function openTournament(kind) {
  const t = profile.tournament;
  if (t && t.kind !== kind && t.stage !== 'done') {
    ui.toast(`Finish (or abandon) your ${t.kind === 'league' ? 'Super League' : 'Knockout Cup'} first`);
    renderTournament();
    return;
  }
  if (!t || t.kind !== kind || t.stage === 'done') {
    profile.tournament = kind === 'league' ? newLeague(profile.team || 'thunder', randomSeed()) : newCup(profile.team || 'thunder', randomSeed());
    saveProfile(profile);
  }
  renderTournament();
}
function renderTournament(notes = []) {
  const t = profile.tournament;
  if (!t) return renderHome();
  ui.show('league');
  const league = t.kind === 'league';
  $('leagueTitle').textContent = league ? 'Super League' : 'Knockout Cup';
  const f = nextFixture(t);
  const me = teamById(t.team);
  const place = finish(t);
  $('leagueLede').textContent = f ? `${me.name} · ${f.label}: v ${teamById(f.opp).name}`
    : place === 'champion' ? `${me.name} are CHAMPIONS!` : `Over: ${teamById(t.champion).name} won it.`;
  const body = $('leagueBody');
  body.innerHTML = '';
  for (const n of notes) body.append(el('div', 'panel paper notecard', n));
  if (f) {
    const o = teamById(f.opp), card = el('div', 'panel paper fixture');
    const logos = el('div', 'fixlogos');
    const la = document.createElement('img'); la.src = `img/logo-${me.id}.webp`; la.alt = me.name;
    const lb = document.createElement('img'); lb.src = `img/logo-${o.id}.webp`; lb.alt = o.name;
    logos.append(la, el('b', '', 'V'), lb);
    card.append(el('div', 'eyebrow', f.label.toUpperCase()), logos,
      el('p', '', `${o.name} · ${o.style.tag}: ${o.style.desc} Their star: ${heroById(o.star).name}.`));
    body.append(card);
  } else if (place) {
    const prize = (league ? LEAGUE_PRIZE : CUP_PRIZE)[place];
    body.append(el('div', 'panel paper notecard big', place === 'champion' ? `🏆 Champions! +${prize} coins` : place === 'runnerUp' ? `🥈 Runners-up · +${prize} coins` : place === 'semi' ? `Semi-finalists · +${prize} coins` : 'Better luck next time'));
  }
  if (league) {
    const tb = el('div', 'panel paper statcard');
    tb.append(el('h3', '', t.stage === 'group' ? `Table · after ${t.round} of ${t.rounds.length}` : 'Final table'));
    const wrap = el('div', 'tablewrap'), tab = el('table', 'herotable leaguetable'), head = el('tr');
    for (const h of ['#', 'Team', 'P', 'W', 'L', 'Pts', 'NRR']) head.append(el('th', '', h));
    tab.append(head);
    table(t).forEach((r, i) => {
      const tr = el('tr', r.id === t.team ? 'mine' : i < 4 ? 'top4' : '');
      const team = teamById(r.id);
      for (const v of [i + 1, team.name, r.p, r.w, r.l, r.pts, (r.nrr >= 0 ? '+' : '') + r.nrr.toFixed(2)]) tr.append(el('td', '', String(v)));
      tab.append(tr);
    });
    wrap.append(tab); tb.append(wrap, el('p', 'sheetnote', 'Top four go through: 1st v 4th and 2nd v 3rd in the semi-finals. Win 2 points, tie 1.'));
    body.append(tb);
  }
  // the knockout bracket so far
  if (t.ko.length) {
    const kb = el('div', 'panel paper statcard');
    kb.append(el('h3', '', 'Knockouts'));
    for (const k of t.ko) {
      const label = { qf: 'Quarter-finals', semi: 'Semi-finals', final: 'Final' }[k.stage];
      kb.append(el('b', 'kostage', label));
      k.ties.forEach(([a, b2], i) => {
        const w = k.winners?.[i];
        const row = el('div', 'kotie' + (a === t.team || b2 === t.team ? ' mine' : ''));
        row.append(el('span', w === a ? 'won' : '', teamById(a).name), el('i', '', 'v'), el('span', w === b2 ? 'won' : '', teamById(b2).name));
        kb.append(row);
      });
    }
    body.append(kb);
  }
  // your results
  const mine = t.results.filter(r => r.player);
  if (mine.length) {
    const rb = el('div', 'panel paper statcard');
    rb.append(el('h3', '', 'Your results'));
    for (const r of mine) {
      const o = r.a === t.team ? r.b : r.a;
      rb.append(el('div', 'kotie', `${r.winner === t.team ? 'W' : r.winner ? 'L' : 'T'} · v ${teamById(o).name} · ${r.mine.runs}/${r.mine.wkts} v ${r.theirs.runs}/${r.theirs.wkts}`));
    }
    body.append(rb);
  }
  $('leagueGo').hidden = !f;
  $('leagueGo').textContent = f ? `Play ${f.label.split(' ')[0] === 'Matchday' ? 'match' : f.label.toLowerCase()}` : 'Play';
  $('leagueQuit').hidden = !f;
}
$('leagueBack').addEventListener('click', renderHome);
$('leagueGo').addEventListener('click', () => { const t = profile.tournament; if (t) startMatch({ mode: t.kind }); });
$('leagueQuit').addEventListener('click', () => {
  if (!confirm('Abandon this tournament? Your progress in it will be lost.')) return;
  profile.tournament = null; saveProfile(profile); renderHome();
});

// After a tournament match: record it, play the rest of the round, pay out at the end.
function tournamentAfterMatch(summary) {
  const t = profile.tournament;
  const notes = advance(t, playerResult(t, summary));
  const events = [];
  const place = finish(t);
  if (place) {
    const prize = (t.kind === 'league' ? LEAGUE_PRIZE : CUP_PRIZE)[place] || 0;
    profile.coins += prize;
    if (place === 'champion') {
      profile.trophies = [...(profile.trophies || []), { kind: t.kind, team: t.team, date: new Date().toISOString().slice(0, 10), unbeaten: unbeaten(t) }];
      events.push(t.kind);
      if (t.kind === 'league' && unbeaten(t)) events.push('unbeaten');
      notes.push(`🏆 ${teamById(t.team).name} win the ${t.kind === 'league' ? 'Super League' : 'Knockout Cup'}! +${prize} coins`);
    } else if (prize) notes.push(`${place === 'runnerUp' ? 'Runners-up' : 'Semi-finalists'}: +${prize} coins`);
  }
  return { notes, events };
}

// ---------- the daily challenge ----------
function renderDaily() {
  ui.show('daily');
  const sc = dailyScenario(), done = profile.dailyChallenge?.key === sc.key ? profile.dailyChallenge : null;
  $('dailyTitle').textContent = `Daily #${sc.no}`;
  const c = $('dailyCard');
  c.innerHTML = '';
  const logos = el('div', 'fixlogos');
  const la = document.createElement('img'); la.src = `img/logo-${sc.team}.webp`; la.alt = '';
  const lb = document.createElement('img'); lb.src = `img/logo-${sc.opp}.webp`; lb.alt = '';
  logos.append(la, el('b', '', 'V'), lb);
  c.append(el('div', 'eyebrow', sc.kind === 'chase' ? 'THE CHASE' : 'THE DEFENCE'), el('h3', '', sc.title), logos, el('p', '', sc.text),
    el('p', 'sheetnote', `Everyone plays the same scenario today, with the same teams and their own stars. One attempt. You start with 60 charge. Streak: ${profile.dailyStreak?.count || 0} day${profile.dailyStreak?.count === 1 ? '' : 's'}.`));
  if (done) {
    c.append(el('div', 'notecard big', `${done.won ? '✅' : '❌'} ${done.line}`), el('div', 'dailyballs', done.balls));
    const share = el('button', 'bigbtn whatsapp', 'Share your result');
    share.addEventListener('click', () => { location.href = `https://wa.me/?text=${encodeURIComponent(dailyShareText(sc, done))}`; });
    c.append(share, el('p', 'sheetnote', 'A new challenge arrives at midnight (UTC).'));
  }
  $('dailyGo').hidden = !!done;
}
const dailyShareText = (sc, d) => `Sixcharge Daily #${sc.no}: ${sc.title} ${d.won ? '✅' : '❌'}\n${d.line}\n${d.balls}\n${shareBase()}`;
$('dailyBack').addEventListener('click', renderHome);
$('dailyGo').addEventListener('click', () => {
  const sc = dailyScenario();
  if (profile.dailyChallenge?.key === sc.key) return renderDaily();
  // the attempt counts as soon as it starts: quitting doesn't give a second go
  profile.dailyChallenge = { key: sc.key, won: false, line: 'Gave up', balls: '' };
  updateStreak(profile, sc.key);
  saveProfile(profile);
  startMatch({ mode: 'daily', scenario: sc });
});

// ---------- trophies: cabinet, hero levels, achievements ----------
function renderTrophies() {
  ui.show('trophies');
  const body = $('trophyBody');
  body.innerHTML = '';
  const cab = el('div', 'panel paper statcard');
  cab.append(el('h3', '', 'Trophy cabinet'));
  const tr = profile.trophies || [];
  if (!tr.length) cab.append(el('p', 'sheetnote', 'Empty for now. Win the Super League or the Knockout Cup to fill it.'));
  const shelf = el('div', 'shelf');
  for (const x of tr) shelf.append(el('div', 'cup' + (x.kind === 'league' ? ' gold' : ''), `🏆 ${x.kind === 'league' ? 'Super League' : 'Knockout Cup'}${x.unbeaten ? ' · unbeaten' : ''} · ${teamById(x.team).name} · ${x.date}`));
  cab.append(shelf);
  const heroes = el('div', 'panel paper statcard');
  heroes.append(el('h3', '', 'Hero levels'));
  heroes.append(el('p', 'sheetnote', 'Heroes earn XP when they play: runs, wickets, catches and wins. Each level makes their signature power 2 charge cheaper and their batting or bowling a point better.'));
  for (const h of HEROES) {
    const p = levelProgress(profile.heroXp?.[h.id] || 0);
    const row = el('div', 'lvrow');
    const bar = el('div', 'xpbar'); const fill = el('div'); fill.style.width = `${Math.round(p.progress * 100)}%`; bar.append(fill);
    row.append(el('b', '', `${h.name}`), el('span', '', `Lv ${p.lv}`), bar);
    heroes.append(row);
  }
  const ach = el('div', 'panel paper statcard');
  const got = profile.achievements || {};
  ach.append(el('h3', '', `Achievements · ${Object.keys(got).length}/${ACHIEVEMENTS.length}`));
  for (const a of ACHIEVEMENTS) {
    const row = el('div', 'achrow' + (got[a.id] ? ' got' : ''));
    row.append(el('b', '', `${got[a.id] ? '★' : '☆'} ${a.name}`), el('span', '', `${a.desc} · ${a.coins} coins${got[a.id] ? ` · ${got[a.id]}` : ''}`));
    ach.append(row);
  }
  body.append(cab, heroes, ach);
}
$('trophiesBack').addEventListener('click', renderHome);

// unlock achievements and tell the player
function awardAchievements(ctx) {
  const got = checkAchievements(profile, ctx);
  saveProfile(profile);
  for (const a of got) ui.toast(`🏅 ${a.name}! +${a.coins} coins`, 2600);
  return got;
}

// ---------- coin toss ----------
function coinToss(opp) {
  return new Promise(resolve => {
    ui.show('toss');
    const coin = $('coin'), text = $('tossText');
    coin.className = 'coin';
    $('tossCall').hidden = false; $('tossChoose').hidden = true; $('tossGo').hidden = true;
    text.textContent = `You v ${opp.name}. Call it in the air!`;
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
          text.textContent = `${result.toUpperCase()}. ${opp.name} won the toss and will ${aiBats ? 'bat' : 'bowl'} first — you ${aiBats ? 'bowl' : 'bat'} first.`;
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
  const mode = summary.mode;
  const rewards = matchRewards(profile, summary);
  const counts = mode !== 'tutorial' && mode !== 'daily'; // full matches go in the career record
  const rec = counts ? recordStats(profile, summary) : null;
  const win = summary.result.outcome === 'win';
  // heroes level up by playing
  const ups = counts ? addHeroXp(profile, heroXpFromMatch(summary)) : [];
  if (counts && win) profile.beaten = [...new Set([...(profile.beaten || []), summary.oppTeam.id])];
  const events = [];
  let notes = [];
  if (mode === 'league' || mode === 'cup') { const r = tournamentAfterMatch(summary); notes = r.notes; tourNotes = notes; events.push(...r.events); }
  if (mode === 'daily') {
    const o = summary.result.daily;
    profile.dailyChallenge = { key: summary.scenario.key, won: o.won, line: o.line, balls: o.balls };
    events.push('daily');
  }
  const got = mode === 'tutorial' ? [] : checkAchievements(profile, { summary, rec, events });
  saveProfile(profile);
  ui.show('result');
  $('resTitle').textContent = win ? 'YOU WON!' : summary.result.outcome === 'tie' ? 'TIED!' : 'SO CLOSE!';
  $('resText').textContent = summary.result.text;
  const cards = $('resCards');
  cards.innerHTML = '';
  for (const inn of summary.innings) {
    const c = el('div', 'panel card');
    const who = inn.side === 'player' ? `You · ${summary.myTeam?.name || ''}` : `${summary.oppTeam?.name || 'Opponents'}`;
    c.append(el('div', 'eyebrow', who.toUpperCase()), el('div', 'score', `${inn.runs}/${inn.wkts}`), el('div', 'sub', `${inn.overs} overs`));
    cards.append(c);
  }
  const extra = [];
  if (got.length) extra.push(...got.map(a => `🏅 ${a.name} +${a.coins}`));
  if (ups.length) extra.push(...ups.map(u => `⬆ ${heroById(u.id).name} level ${u.to}`));
  $('resRewards').textContent = [`+${rewards.xp} XP · +${rewards.coins} coins · Level ${level(profile.xp).lv}`, ...extra].join(' · ');
  // this match's scorecard
  const ms = $('resStats');
  ms.innerHTML = '';
  for (const n of notes) ms.append(el('div', 'row notes', n));
  for (const a of got) { const r = el('div', 'row'); r.append(el('span', 'badge', 'ACHIEVEMENT'), el('b', '', a.name), el('span', '', `${a.desc} · +${a.coins} coins`)); ms.append(r); }
  for (const u of ups) { const r = el('div', 'row'); r.append(el('span', 'badge', 'LEVEL UP'), el('b', '', heroById(u.id).name), el('span', '', `Level ${u.to} · ${levelPerks(u.to)}`)); ms.append(r); }
  ms.hidden = !rec?.batting && !rec?.bowling && !notes.length && !got.length && !ups.length;
  const isHero = (id, slot) => id && id === summary.team?.[slot]?.id;
  if (rec?.batting) {
    const runs = rec.batting.reduce((a, b) => a + b.runs, 0), balls = rec.batting.reduce((a, b) => a + b.balls, 0);
    for (const st of rec.batting) {
      const r = el('div', 'row');
      r.append(el('b', '', `${heroById(st.id) ? '★ ' : ''}${st.name || ''}`), el('span', '', `${fmt.stint(st)}${st.out && st.how ? ` · ${st.how}` : ''}`));
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
    for (const b of rec.bowlingCard || []) {
      const r = el('div', 'row');
      r.append(el('b', '', `${isHero(b.id, 'bowl') || heroById(b.id) ? '★ ' : ''}${b.name}`), el('span', '', `${fmt.figures(b)}${b.type ? ` · ${bowlType(b.type).short}` : ''}`));
      ms.append(r);
    }
    const r2 = el('div', 'row');
    r2.append(el('span', '', `Econ ${fmt.econ(f.runs, f.balls)} · ${f.dots} dots${f.maidens ? ` · ${f.maidens} maiden${f.maidens > 1 ? 's' : ''}` : ''}`));
    if (rec.newBest) r2.append(el('span', 'badge', 'BEST FIGURES'));
    ms.append(r2);
  }

  const name = profile.name || 'A friend';
  const card = renderShareCard(summary, profile.name);
  $('shareImg').src = card.toDataURL('image/jpeg', 0.86);
  const playerInn = summary.innings.find(i => i.side === 'player');
  let link = shareBase();
  let text;
  const best = summary.moments[0];
  if (mode === 'daily') {
    text = dailyShareText(summary.scenario, profile.dailyChallenge);
  } else if (mode !== 'tutorial' && playerInn) {
    const sq = summary.team || {};
    const token = encodeChallenge({ seed: summary.seed, target: playerInn.runs, wkts: playerInn.wkts, balls: playerInn.balls, name, squad: [sq.bat?.id || '', sq.bowl?.id || '', sq.field?.id || ''], moment: best?.kind || '', team: summary.myTeam.id, opp: summary.oppTeam.id });
    link = `${link}#${token}`;
    text = `I scored ${playerInn.runs}/${playerInn.wkts} for ${summary.myTeam.name} v ${summary.oppTeam.name} in Sixcharge${best ? ` with a ${best.title.replace(/!$/, '')}` : ''}! Beat my score off the same 30 balls: ${link}`;
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
  $('resAgain').textContent = { tutorial: 'Play Quick Match', league: 'Back to the league', cup: 'Back to the cup', daily: 'Daily results' }[mode] || 'Play again';
}

$('copyLink').addEventListener('click', async () => {
  const input = $('shareLink');
  try { await navigator.clipboard.writeText(input.value); ui.toast('Challenge link copied'); }
  catch { input.select(); ui.toast('Link selected — copy it from the box'); }
});
$('resHome').addEventListener('click', renderHome);
$('resAgain').addEventListener('click', () => {
  const m = lastSummary?.mode;
  if (m === 'challenge') { pending = { mode: 'challenge', challenge }; startMatch(pending); }
  else if (m === 'league' || m === 'cup') renderTournament(tourNotes);
  else if (m === 'daily') renderDaily();
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

