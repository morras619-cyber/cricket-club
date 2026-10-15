import { CFG, phaseFor } from './config.js';
import { makeRng } from './rng.js';
import { Charge } from './charge.js';
import { SPARKS, heroesFor, AI_LOOK } from './heroes.js';
import { teamById, rivalTeam, teamLook } from './teams.js';
import { makeDelivery } from './physics.js';
import { gradeTiming, swipeToShot, resolveContact } from './shots.js';
import { simulateHit, buildField, buildFieldFrom, presetPositions, outsideRing, runsAfterCollect, runOutMargins, keeperEdgeP, ENDS } from './fieldsim.js';
import { aiBowlingScript, aiBat, aiStance } from './ai.js';
import { gestureToDelivery, planExpectation, deliveryMods, laneFor, lengthForBounce, heightForBounce, positionName, LENGTH_LABEL, BOUNCE_RANGES, LANE_RANGES, PACE } from './tactics.js';
import { line, sledgeOutcome } from './banter.js';
import { Innings, matchResult } from './match.js';
import { playerControls, momentScore } from './rules.js';
import { FX, INK } from './fx.js';
import { Cam3D, OutfieldView, drawBackground, drawBoard, drawStumps, drawBall3D, drawFigure3D, POSES } from './scene.js';
import { sfx, buzz, unlockAudio } from './audio.js';
import { CutIn } from './cutin.js';
import { loadBatSprites, drawBatSprite, shotAnim, batFrame } from './batsprite.js';
import { loadBowlSprites, drawBowlSprite, bowlFrame } from './bowlsprite.js';

const F = CFG.fielding;
class Cancel extends Error {}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const SHOT_WORDS = ['THWACK!', 'DHOOM!', 'KRAK!', 'BLAM!', 'SMASH!'];

// The rival XI's star batter and bowler, fixed by the seed so a challenge faces the same opponents.
export function pickRivals(seed, team) {
  const r = makeRng(seed ^ 0x5eed);
  return {
    bat: r.pick(heroesFor('bat').filter(h => h !== team.bat)),
    bowl: r.pick(heroesFor('bowl').filter(h => h !== team.bowl)),
  };
}

const FISH = 0.65;
function fisheyeTo(L, x, y) {
  const dy = y - CFG.ground.centerY, r = Math.hypot(x, dy);
  if (r < 1e-6) return { x: L.cx, y: L.cy };
  const s = L.R * Math.pow(Math.min(r / CFG.ground.boundaryR, 1.2), FISH);
  return { x: L.cx + (x / r) * s, y: L.cy - (dy / r) * s };
}
function fisheyeFrom(L, sx, sy) {
  const dx = sx - L.cx, dy = L.cy - sy, d = Math.hypot(dx, dy);
  if (d < 1e-6) return { x: 0, y: CFG.ground.centerY };
  const r = Math.pow(d / L.R, 1 / FISH) * CFG.ground.boundaryR;
  return { x: (dx / d) * r, y: CFG.ground.centerY + (dy / d) * r };
}
const fishRadius = (L, r) => L.R * Math.pow(r / CFG.ground.boundaryR, FISH);

// Short labels for fielder tokens.
const ABBR = { 'Slip': 'SL', 'Leg slip': 'LS', 'Gully': 'GU', 'Leg gully': 'LG', 'Point': 'PT', 'Deep point': 'DP', 'Backward point': 'BP', 'Cover': 'CV', 'Deep cover': 'DC', 'Mid-off': 'MO', 'Long-off': 'LO', 'Mid-on': 'MN', 'Long-on': 'LN', 'Mid-wicket': 'MW', 'Deep mid-wicket': 'DM', 'Square leg': 'SQ', 'Deep square leg': 'DS', 'Backward square': 'BS', 'Fine leg': 'FL', 'Third man': 'TM' };
const abbrev = name => ABBR[name] || name.split(/[ -]/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

export class Game {
  constructor(ui) {
    this.ui = ui;
    this.cv = document.getElementById('cv');
    this.ctx = this.cv.getContext('2d');
    this.cams = { bat: new Cam3D('bat'), bowl: new Cam3D('bowl'), keeper: new Cam3D('keeper') };
    this.of = new OutfieldView();
    this.fx = new FX();
    this.cutin = new CutIn();
    this.timers = []; this.waiters = [];
    this.gameTime = 0; this.realTime = 0; this.lastNow = performance.now();
    this.powerFxUntil = 0; this.mapBig = false;
    this.timeScale = 1; this.hitStopUntil = 0;
    this.view = 'idle'; this.paused = false;
    this.S = this.freshScene(); this.O = null;
    this.onInput = null;
    this.bot = !!window.__SIXCHARGE_BOT;
    this.speed = window.__SIXCHARGE_SPEED || 1;
    this.settings = { fielding: 'key' };
    this.armed = {};
    this.charge = new Charge();
    this.resize();
    addEventListener('resize', () => this.resize());
    this.bindInput();
    requestAnimationFrame(t => this.frame(t));
  }

  // ---------- plumbing ----------
  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = this.cv.clientWidth || innerWidth; this.H = this.cv.clientHeight || innerHeight;
    this.cv.width = Math.round(this.W * dpr); this.cv.height = Math.round(this.H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const c of Object.values(this.cams)) c.resize(this.W, this.H);
    this.of.resize(this.W, this.H);
    this.loftPx = Math.max(90, Math.min(140, this.H * 0.14));
  }

  frame(now) {
    const raw = Math.min(50, now - this.lastNow);
    this.lastNow = now;
    if (!this.paused) {
      const dt = raw * this.speed;
      this.realTime += dt;
      const scale = this.realTime < this.hitStopUntil ? 0 : this.timeScale;
      this.gameTime += (dt * scale) / 1000;
      this.tick();
      this.fx.update(dt);
      this.of.update(dt);
    }
    try { this.render(); } catch (e) { console.error(e); }
    requestAnimationFrame(t => this.frame(t));
  }

  tick() {
    const due = [];
    this.timers = this.timers.filter(tm => {
      const ok = tm.real ? this.realTime >= tm.at : this.gameTime >= tm.at;
      if (ok) due.push(tm);
      return !ok;
    });
    for (const tm of due) tm.res();
    const ws = this.waiters; this.waiters = [];
    for (const w of ws) {
      let ok = false;
      try { ok = w.fn(); } catch (e) { w.rej(e); continue; }
      if (ok) w.res(); else this.waiters.push(w);
    }
  }

  sleep(ms) { return new Promise((res, rej) => this.timers.push({ at: this.gameTime + ms / 1000, res, rej, real: false })); }
  sleepReal(ms) { return new Promise((res, rej) => this.timers.push({ at: this.realTime + ms, res, rej, real: true })); }
  until(fn) { return new Promise((res, rej) => this.waiters.push({ fn, res, rej })); }
  async animate(ms, fn, real = false) {
    const t0 = real ? this.realTime : this.gameTime;
    await this.until(() => {
      const e = real ? this.realTime - t0 : (this.gameTime - t0) * 1000;
      const p = Math.min(1, e / ms);
      fn(p);
      return p >= 1;
    });
  }
  cancelAll() {
    for (const t of this.timers) t.rej(new Cancel());
    for (const w of this.waiters) w.rej(new Cancel());
    this.timers = []; this.waiters = [];
    this.onInput = null;
  }
  hitStop(ms) { this.hitStopUntil = this.realTime + ms; }
  board(msg, ms = 4000) { this.boardMsg = msg; this.boardUntil = this.realTime + ms; }
  // full-screen comic panel; render() hides DOM banners and hints while it plays
  showCutIn(hero, def) { this.cutin.start(hero, def, this.realTime); }
  powerPause() { return this.until(() => this.realTime >= this.powerFxUntil); }

  bindInput() {
    const cv = this.cv;
    const evReal = e => this.realTime + (e.timeStamp - this.lastNow) * this.speed;
    cv.addEventListener('pointerdown', e => {
      e.preventDefault(); unlockAudio();
      this.g = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: evReal(e) };
      try { cv.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      this.emit('down', { ...this.g, t: this.g.t0 });
    });
    cv.addEventListener('pointermove', e => {
      if (!this.g || e.pointerId !== this.g.id) return;
      this.g.x = e.clientX; this.g.y = e.clientY;
      this.emit('move', { ...this.g, t: evReal(e) });
    });
    cv.addEventListener('pointerup', e => {
      if (!this.g || e.pointerId !== this.g.id) return;
      const g = this.g; this.g = null;
      g.x = e.clientX; g.y = e.clientY;
      this.emit('up', { ...g, dx: g.x - g.x0, dy: g.y - g.y0, t: evReal(e) });
    });
    cv.addEventListener('pointercancel', () => { this.g = null; });

  }
  emit(type, data) { if (this.onInput) this.onInput(type, data); }
  realToGame(tr) { return this.gameTime + ((tr - this.realTime) / 1000) * this.timeScale; }

  // Synthetic input for the automated playtest bot.
  botInput(type, data = {}) {
    const g = { x0: this.W / 2, y0: this.H * 0.7, dx: 0, dy: 0, t: this.realTime, t0: this.realTime - 120, ...data };
    g.x = g.x0 + g.dx; g.y = g.y0 + g.dy;
    this.emit(type, g);
  }

  // ---------- scene state ----------
  freshScene() {
    return {
      ball: null, trail: [], maya: null, ring: null, delivery: null, ballT0: 0, flight: null, kball: null,
      batter: { x: -0.5, z: 0.95, angle: -0.4, swingT0: null, shot: null, look: null, emblem: null, glow: null },
      bowler: { x: 0.6, z: 27.5, pose: POSES.stand(), look: null },
      keeper: { x: 0, z: -2.4, pose: POSES.keeper(), look: AI_LOOK },
      stumps: { 0: null, 20: null }, stumpGlow: false, reticle: null, stance: null,
    };
  }

  // ---------- match entry ----------
  async runMatch(opts) {
    this.cancelAll();
    const mode = opts.mode;
    this.mode = mode;
    this.seed = opts.seed;
    this.team = opts.squad; // { bat, bowl, field } heroes
    this.rival = pickRivals(this.seed, this.team);
    // kits: the heroes play for the player's chosen team against a seeded rival team
    this.myTeam = teamById(opts.team);
    this.oppTeam = rivalTeam(this.seed, this.myTeam.id);
    loadBatSprites(this.myTeam.id, this.oppTeam.id);
    loadBowlSprites(this.myTeam.id);
    this.charge = new Charge(0);
    this.charge.on(ev => this.onCharge(ev));
    this.ui.charge(0);
    this.armed = { mirror: 0, elastic: 0 };
    this.fieldState = { events: 0, lastEventBall: -9, setting: this.settings.fielding };
    this.moments = [];
    this.rebowls = 0;
    this.stats = { fieldingWins: 0, perfects: 0, powers: 0 };
    this.bowlChoice = { field: opts.field?.preset || 'balanced', custom: opts.field?.custom || null };
    this.bowlHistory = []; this.batterMood = { state: 'calm', balls: 0 };
    this.scouted = false; this.revenge = false; this.playerRevenge = false;
    this.bowlHints = 3; this.afterHints = 3;
    this.ui.hud(true);
    this.innings = [];
    try {
      if (mode === 'tutorial') return await this.runTutorial();
      const script = aiBowlingScript(this.seed, this.rival.bowl.bowls, this.rival.bowl.power.kind);
      if (mode === 'challenge') {
        const inn = new Innings('player', opts.challenge.target + 1);
        this.innings.push(inn);
        await this.introBanner('CHALLENGE!', `Beat ${opts.challenge.name}'s ${opts.challenge.target} off the same 30 balls`);
        await this.battingInnings(inn, script);
      } else if (opts.order === 'bowl') {
        const first = new Innings('ai');
        this.innings.push(first);
        await this.bowlingInnings(first);
        const carry = this.charge.carryOver();
        await this.inningsBreak(first, carry);
        const second = new Innings('player', first.runs + 1);
        this.innings.push(second);
        this.newCharge(carry);
        await this.introBanner('YOUR CHASE', `${first.runs + 1} to win · ${this.rival.bowl.name} has the ball`);
        await this.battingInnings(second, script);
      } else {
        const first = new Innings('player');
        this.innings.push(first);
        await this.introBanner('YOU BAT FIRST', `${this.myTeam.name} v ${this.oppTeam.name} · ${this.rival.bowl.name} has the ball`);
        await this.battingInnings(first, script);
        const carry = this.charge.carryOver();
        await this.inningsBreak(first, carry);
        const second = new Innings('ai', first.runs + 1);
        this.innings.push(second);
        this.newCharge(carry);
        await this.bowlingInnings(second);
      }
      return this.summary();
    } catch (e) {
      if (e instanceof Cancel) return null;
      throw e;
    } finally {
      this.ui.hud(false); this.clearBowlUI(); this.ui.hint(null);
    }
  }

  newCharge(value) {
    this.charge = new Charge(value);
    this.charge.on(ev => this.onCharge(ev));
    this.ui.charge(value);
  }

  quit() { this.cancelAll(); this.ui.hud(false); this.clearBowlUI(); this.view = 'idle'; this.paused = false; }
  clearBowlUI() { this.ui.fieldButton(false); this.ui.fieldEditor(false); this.ui.editing(false); this.ui.banter(false); }

  async introBanner(head, sub) {
    this.view = 'bat';
    this.S = this.freshScene();
    this.ui.banner(head, sub, 1800);
    sfx.crowd(0.8);
    await this.sleepReal(this.bot ? 200 : 1700);
  }

  async inningsBreak(first, carry) {
    this.clearBowlUI();
    const task = first.side === 'player' ? `Defend ${first.runs}` : `Chase ${first.runs + 1}`;
    this.ui.banner('INNINGS BREAK', `${task}. ${carry} charge carries over.`, 2200);
    await this.sleepReal(this.bot ? 200 : 2300);
  }

  summary() {
    const [a, b] = this.innings;
    let result;
    if (this.mode === 'challenge') {
      const won = a.runs >= a.target;
      const short = a.target - a.runs;
      result = { outcome: won ? 'win' : short === 1 ? 'tie' : 'loss', text: won ? `Challenge beaten with ${a.ballsLeft} balls to spare` : short === 1 ? `Level on ${a.runs}. One more run would have won it!` : `Fell ${short - 1} short of their ${a.target - 1}` };
    } else result = matchResult(a, b);
    const sorted = [...this.moments].sort((x, y) => y.score - x.score);
    return { mode: this.mode, innings: this.innings, result, moments: sorted, team: this.team, rival: this.rival, seed: this.seed, stats: this.stats };
  }

  addMoment(kind, title, word, hero, opts = {}) {
    this.moments.push({ kind, title, word, heroId: hero?.id, score: momentScore(kind, opts), ball: opts.ballNo, detail: opts.detail || '' });
  }

  // ---------- charge + powers ----------
  onCharge(ev) {
    this.ui.charge(ev.value);
    if (ev.type === 'gain' && ev.amount > 0) {
      sfx.zing(ev.value);
      this.fx.word(`+${ev.amount}${ev.label ? ' ' + ev.label : ''}`, this.W * 0.5, this.H - 150 - Math.random() * 30, { size: 22, color: '#fff4da', stroke: '#141018', dur: 900, rot: 0 });
      if (ev.crossed) {
        sfx[ev.crossed === 100 ? 'full' : 'dhol']();
        buzz(ev.crossed === 100 ? 120 : [30, 40, 30]);
        if (ev.crossed === 100) this.fx.bubble(`${this.team.bat.quote}`, this.W * 0.3, this.H * 0.55, { dur: 1400 });
      }
    } else if (ev.type === 'loss') {
      if (ev.label === 'OVERHEAT') sfx.sizzle();
    }
    this.refreshPowers();
  }

  ballNo() { const inn = this.innings[this.innings.length - 1]; return inn ? inn.balls + 1 : 1; }

  powerList() {
    const ball = this.ballNo();
    const mk = (key, def, hero, pose, armed, extraOk = true) => {
      const cost = this.charge.cost(def.cost, ball);
      const state = armed ? 'armed' : this.powerLock || !extraOk || this.charge.value < cost ? 'off' : 'ready';
      return { key, name: def.name, cost, hero, pose, state, onTap: () => this.activate(key) };
    };
    const A = this.armed;
    if (this.phase === 'bat') {
      return [
        mk('focus', SPARKS.bat, this.team.bat, 'bat', A.focus),
        mk('bat', this.team.bat.power, this.team.bat, 'bat', A.thunder || A.meteor || A.mirror > 0),
      ];
    }
    if (this.phase === 'bowl') {
      const list = [
        mk('pinpoint', SPARKS.bowl, this.team.bowl, 'bowl', A.pinpoint),
        mk('bowlpower', this.team.bowl.power, this.team.bowl, 'bowl', A.tornado || A.maya || A.shatter),
        mk('fieldpower', this.team.field.power, this.team.field, 'keeper', A.elastic > 0 || A.relay),
      ];
      const ult = this.team.field.ultimate;
      if (ult && (A.freeze || this.charge.value >= this.charge.cost(ult.cost, ball))) list.push(mk('fieldult', ult, this.team.field, 'keeper', A.freeze));
      return list;
    }
    if (this.phase === 'event') return [mk('burst', SPARKS.field, this.team.field, 'keeper', A.burst, this.eventAllowsBurst)];
    return [];
  }

  refreshPowers() { this.ui.powers(this.powerList()); }

  activate(key) {
    const ball = this.ballNo();
    const A = this.armed;
    let def, hero, color;
    switch (key) {
      case 'focus': def = SPARKS.bat; hero = this.team.bat; break;
      case 'bat': def = this.team.bat.power; hero = this.team.bat; break;
      case 'pinpoint': def = SPARKS.bowl; hero = this.team.bowl; break;
      case 'bowlpower': def = this.team.bowl.power; hero = this.team.bowl; break;
      case 'fieldpower': def = this.team.field.power; hero = this.team.field; break;
      case 'fieldult': def = this.team.field.ultimate; hero = this.team.field; break;
      case 'burst': def = SPARKS.field; hero = this.team.field; break;
      default: return;
    }
    if (this.powerLock && key !== 'burst') return;
    if (!this.charge.spend(def.cost, ball, def.name)) return;
    color = hero.look.trim;
    const kindMap = { focus: 'focus', pinpoint: 'pinpoint', burst: 'burst' };
    const kind = kindMap[key] || def.kind;
    if (kind === 'mirror') A.mirror = 3;
    else if (kind === 'elastic') A.elastic = 2;
    else A[kind] = true;
    this.stats.powers++;
    if (def.cost >= 60 && !this.bot) {
      // signature powers get a full comic cut-in panel
      this.showCutIn(hero, def);
    } else {
      this.fx.flash(color, 0.45);
      this.fx.burst(this.W / 2, this.H * 0.42, { color, r: Math.max(this.W, this.H) * 0.6 });
      this.fx.word(def.word, this.W / 2, this.H * 0.42, { size: def.ultimate ? 76 : 60, color, stroke: INK, dur: 1300 });
      this.fx.bubble(hero.quote, this.W * 0.5, this.H * 0.56, { dur: 1300 });
      this.ui.banner(def.name.toUpperCase(), def.desc, 1300);
    }
    this.powerFxUntil = this.realTime + (this.bot ? 0 : 1400);
    if (def.ultimate || def.cost >= 100) sfx.boom(); else sfx.full();
    buzz([40, 30, 80]);
    if (this.phase === 'bowl' && this.aiBatPower && (key === 'bowlpower' || key === 'pinpoint')) {
      this.fx.word('POWER CLASH!', this.W / 2, this.H * 0.3, { size: 54, color: '#3ec6ff', stroke: INK, dur: 1400 });
      this.clash = true;
    }
    if (this.phase === 'event' && kind === 'burst') this.fx.word('ZOOM!', this.W / 2, this.H * 0.3, { size: 50 });
    this.refreshPowers();
  }

  // ---------- HUD ----------
  hud(inn) {
    const ball = Math.min(CFG.balls, inn.balls + 1);
    let need;
    if (inn.target != null) {
      const n = inn.target - inn.runs;
      need = inn.side === 'player'
        ? (n > 0 ? `Need ${n} off ${inn.ballsLeft}` : 'Target reached!')
        : (n > 0 ? `They need ${n} off ${inn.ballsLeft}` : 'They got there');
    } else need = inn.side === 'player' ? 'Set a target' : 'They\'re setting a target';
    const short = h => h.name.split(' ').slice(-1)[0];
    let heroLine;
    if (inn.side === 'player') heroLine = `${short(this.team.bat)} ${inn.cur.runs}* (${inn.cur.balls})`;
    else { const b = inn.bowler; heroLine = `${short(this.team.bowl)} ${b.wkts}/${b.runs} · ${Math.floor(b.balls / 6)}.${b.balls % 6} ov`; }
    this.ui.score(inn, { label: inn.side === 'player' ? `YOU BAT · ${this.team.bat.name.toUpperCase()}` : `YOU BOWL · ${this.team.bowl.name.toUpperCase()}`, need, phase: phaseFor(ball).name, heroLine });
  }

  phaseBanner(ballNo) {
    if (ballNo === 13) this.ui.banner('MIDDLE BATTLE', 'Full field is back. Bank or spend?', 1600);
    if (ballNo === 25) this.ui.banner('SUPER OVER FINALE', 'Every power costs 20% less', 1800);
  }

  ballRng(ballNo) { return makeRng((this.seed * 31 + ballNo * 7919 + this.innings.length * 104729 + (this.rebowls || 0) * 15485863) >>> 0); }

  // ---------- batting innings ----------
  async battingInnings(inn, script) {
    this.phase = 'bat';
    this.hud(inn);
    while (!inn.done()) {
      const ballNo = inn.balls + 1;
      this.phaseBanner(ballNo);
      await this.batBall(inn, ballNo, script[ballNo - 1]);
      this.hud(inn);
      if (inn.balls % 6 === 0 && !inn.done()) {
        const runs = inn.log.slice(-6).reduce((s, r) => s + (r === 'W' ? 0 : Number(r)), 0);
        this.ui.banner(`END OF OVER ${inn.balls / 6}`, `${runs} off the over · ${inn.runs}/${inn.wkts}`, 1300);
        await this.sleepReal(this.bot ? 100 : 1300);
      } else await this.sleepReal(this.bot ? 80 : 450);
    }
  }

  aiFieldPreset(ballNo) { return ballNo <= 12 ? 'attack' : ballNo <= 24 ? 'balanced' : 'defend'; }

  consumeBatEffects() {
    const A = this.armed;
    const fx = { focus: !!A.focus, thunder: !!A.thunder, meteor: !!A.meteor, mirror: A.mirror > 0 };
    A.focus = false; A.thunder = false; A.meteor = false;
    if (A.mirror > 0) A.mirror--;
    return fx;
  }

  windowsFor(fx, extra = 0, tornado = false) {
    const w = { ...CFG.timing };
    for (const k in w) w[k] += CFG.touchSlackMs + extra + (fx.mirror ? 40 : 0);
    if (fx.focus) w.perfect += 30;
    if (tornado) w.perfect /= 2;
    w.good = Math.max(w.good, w.perfect + 20);
    return w;
  }

  // opt (tutorial): { slow, extra, waitPower, assist(res, grade), hint, fieldFixed }
  async batBall(inn, ballNo, spec, opt = {}) {
    const S = this.S = this.freshScene();
    this.view = 'bat';
    this.timeScale = 1;
    const before = { runs: inn.runs, wkts: inn.wkts };
    S.batter.look = teamLook(this.myTeam); S.batter.team = this.myTeam.id; S.batter.emblem = this.team.bat.emblem;
    S.bowler.look = this.rival.bowl.look;
    const rng = this.ballRng(ballNo);
    const aiField = buildField(this.aiFieldPreset(ballNo), ballNo <= 12);
    S.field3d = aiField.filter(f => !f.keeper && f.id !== 'bowler');
    const aiPower = spec.power;
    this.powerLock = false;
    this.refreshPowers();

    if (aiPower) {
      const pw = this.rival.bowl.power;
      if (this.bot) this.ui.banner(`${pw.name.toUpperCase()}!`, `${this.rival.bowl.name} powers up`, 1600);
      else { this.showCutIn(this.rival.bowl, pw); this.powerFxUntil = this.realTime + 1400; }
      sfx.whoosh();
    }
    if (opt.hint !== undefined) this.ui.hint(opt.hint);
    else if (ballNo === 1 && this.mode !== 'challenge') this.ui.hint('HOLD · SWIPE · LIFT ON THE RING');
    // before the delivery a tap on the field map enlarges it
    this.onInput = (type, g) => { if (type === 'down' && this.inMap(g)) this.mapBig = !this.mapBig; };
    if (opt.waitPower) await opt.waitPower();
    await this.sleepReal(this.bot ? 150 : aiPower ? 1700 : 650);
    await this.powerPause();

    // run-up: freezes mid-stride while a power's comic panel is on screen
    let prog = 0, last = this.gameTime;
    await this.until(() => {
      const dt = this.gameTime - last; last = this.gameTime;
      if (this.realTime >= this.powerFxUntil) prog += (dt * 1000) / 850;
      const p = Math.min(1, prog);
      S.bowler.z = 27.5 - 6.9 * p; S.bowler.pose = POSES.run(p * 13); S.bowler.spr = { anim: 'run', p };
      return p >= 1;
    });
    this.onInput = null;
    this.mapBig = false;
    this.powerLock = true;
    this.refreshPowers();
    const fx = this.consumeBatEffects();
    if (fx.thunder) S.batter.glow = '#5fc8ff';
    if (fx.meteor) S.batter.glow = '#ff7a1a';
    if (fx.mirror) this.fx.flash('#7a3fe0', 0.25);
    this.timeScale = (opt.slow ?? 1) * (fx.focus ? 0.7 : 1);
    if (fx.focus) this.fx.speed = 0.6;

    const d = makeDelivery(spec);
    S.delivery = d; S.ballT0 = this.gameTime; S.ring = { meteor: fx.meteor };
    S.bowler.pose = POSES.bowl(1); S.bowler.spr = { anim: 'deliver', t0: this.gameTime };
    if (aiPower === 'maya') S.maya = { real: rng.chance(0.5) ? 1 : -1, picked: 0 };
    sfx.whoosh();

    let swing = null, tap = null;
    this.onInput = (type, g) => {
      const tb = this.gameTime - S.ballT0;
      if (type === 'down') {
        if (S.maya && !S.maya.picked && S.mayaScreen?.[-1] && S.mayaScreen?.[1] && tb > (d.bounceT ?? 0.3) * 0.6) {
          const dl = Math.hypot(g.x - S.mayaScreen[-1].x, g.y - S.mayaScreen[-1].y);
          const dr = Math.hypot(g.x - S.mayaScreen[1].x, g.y - S.mayaScreen[1].y);
          if (Math.min(dl, dr) < 80) { S.maya.picked = dl < dr ? -1 : 1; sfx.click(); return; }
        }
        if (fx.meteor) { if (!tap && tb > 0) tap = { t: this.realToGame(g.t) }; return; }
        if (!swing) S.batter.angle = -2.2;
      } else if (type === 'up' && !fx.meteor && !swing) {
        const tg = this.realToGame(g.t);
        if (tg < S.ballT0 + 0.15) { S.batter.angle = -0.4; return; }
        swing = { t: tg, dx: g.dx, dy: g.dy };
        S.batter.swingT0 = this.realTime;
        S.batter.shot = { anim: shotAnim(swipeToShot(g.dx, g.dy, this.loftPx)), t0: this.realTime, from: S.batter.shot ? 'leave1' : 'backlift' };
      }
    };
    if (this.bot) this.botBat(d, S, fx, rng);

    const deadline = d.tContact + (CFG.timing.edge + 60) / 1000;
    await this.until(() => {
      const tb = this.gameTime - S.ballT0;
      if (fx.meteor && tb > d.tContact - 0.45) { this.timeScale = 0.35; this.fx.speed = 1; }
      // no shot offered: shoulder arms as the ball arrives
      if (!fx.meteor && !swing && !S.batter.shot && S.batter.angle > -2 && tb > d.tContact - 0.12) S.batter.shot = { anim: 'leave', t0: this.realTime, from: 'ready' };
      if (S.maya && this.bot && !S.maya.picked && tb > (d.bounceT ?? 0.3)) S.maya.picked = rng.chance(0.6) ? S.maya.real : -S.maya.real;
      return fx.meteor ? tap || tb > d.tContact + 0.25 : swing || tb > deadline;
    });
    this.onInput = null;
    this.ui.hint(null);
    this.fx.speed = 0;

    // ----- resolve -----
    const w = this.windowsFor(fx, opt.extra || 0, aiPower === 'tornado');
    const err = swing ? (swing.t - (S.ballT0 + d.tContact)) * 1000 : null;
    let grade = swing ? gradeTiming(err, w, d.xt > 0.08) : 'leave';
    this.lastTiming = { err, grade };
    let res;
    if (fx.meteor) {
      const e = tap ? Math.abs((tap.t - (S.ballT0 + d.tContact)) * 1000) / this.timeScale : 999;
      const runs = e <= 60 ? 8 : e <= 130 ? 6 : 4;
      grade = e <= 60 ? 'perfect' : e <= 130 ? 'good' : 'late';
      res = { outcome: 'hit', grade, meteorRuns: runs, angle: rng.range(-0.3, 0.3), loft: true, launchDeg: 36, v: 40, forced: { six: true } };
      S.batter.swingT0 = this.realTime;
      S.batter.shot = { anim: 'drive', t0: this.realTime };
    } else if (S.maya && S.maya.picked !== S.maya.real) {
      res = { outcome: 'bowled', grade: 'miss', mayaFooled: true };
    } else {
      const shot = swing ? swipeToShot(swing.dx, swing.dy, this.loftPx) : null;
      res = resolveContact({ grade, errMs: err ?? 0, shot, d, fx: { thunder: fx.thunder, mirror: fx.mirror, tornado: aiPower === 'tornado', shatter: aiPower === 'shatter' }, rng });
      if (aiPower === 'tornado' && grade === 'miss') res.outcome = 'bowled';
    }
    if (opt.assist) res = opt.assist(res, grade) || res;
    this.timeScale = 1;

    const contact = d.pos(d.tContact);
    const cs = this.cams.bat.project(contact.x, contact.y, contact.z) || { x: this.W / 2, y: this.H / 2 };
    if (res.outcome === 'hit' || res.outcome === 'edge') {
      this.contactFeedback(grade, cs, err);
      if (res.outcome === 'hit' && (grade === 'perfect' || grade === 'good')) {
        this.charge.award(grade === 'perfect' ? 'perfectBat' : 'goodBat', grade.toUpperCase());
        if (grade === 'perfect') this.stats.perfects++;
      }
      this.charge.timingStreak(grade === 'perfect');
      S.delivery = null;
      S.ball = { ...contact };
      const v = res.v || 30, ang = res.outcome === 'edge' ? Math.PI - 0.3 : res.angle;
      const vl = (res.launchDeg || 4) * Math.PI / 180;
      S.flight = { p0: contact, t0: this.gameTime, vx: Math.sin(ang) * v * Math.cos(vl), vz: Math.cos(ang) * v * Math.cos(vl), vy: v * Math.sin(vl) };
      await this.sleep(res.outcome === 'edge' ? 350 : 520);
    } else {
      if (swing) { sfx.thin(); this.timingBar(err, grade); }
      this.charge.timingStreak(false);
      // let the ball carry on to the stumps or the keeper
      await this.until(() => this.gameTime - S.ballT0 >= (res.outcome === 'bowled' ? d.tStumps : d.tKeeper));
      S.delivery = null;
      // beaten or bowled: he turns to look back at the stumps
      if (res.outcome === 'bowled' || res.outcome === 'beaten') S.batter.shot = { anim: 'bowled', t0: this.realTime, from: batFrame(S.batter, this.realTime).f };
      S.bowler.spr = { anim: res.outcome === 'bowled' ? 'celebrate' : 'react', t0: this.realTime };
    }

    // ----- outcomes -----
    if (res.outcome === 'bowled') {
      S.stumps[0] = { dir: rng.range(-1, 1) };
      this.wicketFx(res.mayaFooled ? 'FOOLED!' : 'BOWLED!', cs);
      inn.ball({ wicket: true });
      this.charge.wicketLost();
      if (opt.onOut) opt.onOut();
    } else if (res.outcome === 'leave' || res.outcome === 'beaten') {
      this.fx.word(res.outcome === 'leave' ? 'LEFT' : 'BEATEN!', this.W / 2, this.H * 0.4, { size: 46, color: '#fff4da', stroke: '#3ec6ff' });
      inn.ball({ runs: 0 });
      this.charge.dot();
    } else if (res.outcome === 'edge') {
      const caught = rng.chance(keeperEdgeP(res.offset));
      if (caught) {
        sfx.glove(); this.wicketFx('CAUGHT BEHIND!', cs);
        S.bowler.spr = { anim: 'celebrate', t0: this.realTime };
        inn.ball({ wicket: true }); this.charge.wicketLost();
      } else {
        const four = res.offset.x > 1.0 && rng.chance(0.5);
        this.fx.word(four ? 'EDGED FOR FOUR!' : 'LUCKY EDGE!', this.W / 2, this.H * 0.4, { size: 40 });
        inn.ball({ runs: four ? 4 : rng.chance(0.4) ? 1 : 0 });
        this.charge.award('edgeSurvived', 'LUCKY');
      }
    } else {
      await this.battingHit(inn, ballNo, res, grade, aiField, rng, fx);
    }
    this.hud(inn);
    if (!opt.assist) await this.battingBanter({ runs: inn.runs - before.runs, wicketFell: inn.wkts > before.wkts, beaten: res.outcome === 'beaten' || (res.outcome === 'edge' && inn.wkts === before.wkts), rng, inn });
    await this.sleepReal(this.bot ? 50 : 650);
  }

  // The AI bowler talks while you bat. Answer a sledge with a boundary for REVENGE.
  async battingBanter({ runs, wicketFell, beaten, rng, inn }) {
    if (inn.done()) return;
    const p = this.cams.bat.project(this.S.bowler.x, 1.9, this.S.bowler.z);
    const bowl = p ? { x: p.x, y: p.y } : { x: this.W / 2, y: this.H * 0.4 };
    const me = { x: this.W * 0.3, y: this.H * 0.55 };
    if (this.playerRevenge) {
      this.playerRevenge = false;
      if (runs >= 4) {
        this.charge.add(10, 'REVENGE');
        this.fx.word('REVENGE!', this.W / 2, this.H * 0.28, { size: 60, color: '#ffd23f', stroke: '#e8343b' });
        this.fx.bubble(line('batterRevenge', this.team.bat.id, rng), me.x, me.y, { dur: 1800 });
        await this.sleepReal(this.bot ? 50 : 900);
        return;
      }
    }
    if (runs >= 4 && rng.chance(0.4)) {
      this.fx.bubble(line(rng.chance(0.5) ? 'bowlerCompliment' : 'bowlerAfterBoundary', this.rival.bowl.id, rng), bowl.x, bowl.y, { dur: 1700 });
      await this.sleepReal(this.bot ? 50 : 700);
    } else if ((beaten || wicketFell) && rng.chance(0.45)) {
      this.fx.bubble(line('bowlerSledge', this.rival.bowl.id, rng), bowl.x, bowl.y, { dur: 1800 });
      if (!wicketFell || inn.wkts < CFG.wickets) {
        this.playerRevenge = true;
        this.ui.banner('HE\'S TALKING', 'Hit a boundary next ball for +10 REVENGE', 1700);
      }
      await this.sleepReal(this.bot ? 50 : 900);
    }
  }

  botBat(d, S, fx, rng) {
    const target = d.tContact * 1000 + rng.normal() * 60;
    this.sleep(Math.max(0, target - 120)).then(() => this.botInput('down')).catch(() => {});
    this.sleep(Math.max(0, target)).then(() => {
      const a = rng.range(-1.2, 1.2), len = rng.chance(0.4) ? 160 : 70;
      this.botInput('up', { dx: Math.sin(a) * len, dy: -Math.cos(a) * len });
    }).catch(() => {});
  }

  contactFeedback(grade, at, err) {
    if (grade === 'perfect') {
      this.hitStop(80); this.fx.flash('#fff', 0.55); this.fx.burst(at.x, at.y, { color: '#ffd23f' });
      this.fx.word('PERFECT!', this.W / 2, this.H * 0.3, { size: 54 });
      this.fx.word(SHOT_WORDS[Math.floor(Math.random() * SHOT_WORDS.length)], at.x, at.y - 30, { size: 64, color: '#fff4da', stroke: '#e8343b' });
      this.fx.shake(10); sfx.bat('perfect'); buzz(35);
    } else if (grade === 'good') {
      this.hitStop(40); this.fx.word('NICE!', this.W / 2, this.H * 0.3, { size: 46, color: '#3ec6ff', stroke: INK });
      this.fx.sparks(at.x, at.y, 10); sfx.bat('good'); buzz(15);
    } else {
      sfx.thin(); this.fx.bubble('Oops!', at.x, at.y - 10, { dur: 900 });
      this.timingBar(err, grade);
    }
  }

  timingBar(err, grade) {
    if (err == null) return;
    const label = grade === 'perfect' ? 'PERFECT' : `${err < 0 ? 'EARLY' : 'LATE'} ${Math.round(Math.abs(err))}ms`;
    this.fx.word(label, this.W / 2, this.H * 0.62, { size: 24, color: '#fff4da', stroke: INK, dur: 1300, rot: 0 });
  }

  wicketFx(text, at) {
    this.board(text.replace('!', '') + '!');
    this.fx.flash('#e8343b', 0.4); this.fx.shake(12);
    this.fx.word(text, this.W / 2, this.H * 0.36, { size: 62, color: '#fff4da', stroke: '#e8343b', dur: 1500 });
    this.fx.sparks(at.x, at.y, 20, ['#fff4da', '#e8343b', '#f0c27a'], 9);
    sfx.wicket(); buzz([60, 40, 60]);
  }

  async battingHit(inn, ballNo, res, grade, aiField, rng, fx) {
    if (res.meteorRuns) {
      const runs = res.meteorRuns;
      this.fx.word('BOOOOM!', this.W / 2, this.H * 0.3, { size: 84, color: '#ff7a1a', stroke: INK, dur: 1600 });
      this.fx.flash('#ff7a1a', 0.7); this.fx.shake(16); sfx.boom(); sfx.crowd(1.2); buzz([80, 40, 120]);
      await this.showAutoPlay(simulateHit({ ...res }, aiField, rng), aiField, { side: 'ai' });
      inn.ball({ runs });
      this.charge.award('six', `${runs} RUNS`);
      this.addMoment('ultimate', `METEOR ${runs}!`, 'BOOOOM!', this.team.bat, { ballNo, perfect: runs === 8, detail: `${runs} runs off one ball` });
      return;
    }
    const sim = simulateHit(res, aiField, rng, { aiBatting: false });
    let caught = false, saved = false, dropped = false;
    if (sim.catch) {
      caught = rng.chance(sim.catch.p * 0.92);
      dropped = !caught && sim.catch.p >= 0.3;
    }
    if (!caught && sim.save) saved = rng.chance(sim.save.p * 0.5);
    await this.showAutoPlay(sim, aiField, { side: 'ai', caught, saved, dropped });

    if (caught) {
      this.wicketFx('CAUGHT!', { x: this.W / 2, y: this.H / 2 });
      inn.ball({ wicket: true }); this.charge.wicketLost();
      return;
    }
    let runs = saved ? 2 : sim.runs;
    if (dropped) runs = Math.max(runs, runsAfterCollect(sim.catch.t + 1.0, sim.catch.point));
    if (saved) this.fx.word('SAVED!', this.W / 2, this.H * 0.35, { size: 48, color: '#fff4da', stroke: '#3ec6ff' });
    inn.ball({ runs });
    if (runs === 6) {
      this.board('SIX!');
      this.charge.award('six', 'SIX');
      sfx.crowd(1.2);
      const powered = fx.thunder;
      if (powered) this.fx.word('KRAKOOOM!', this.W / 2, this.H * 0.3, { size: 76, color: '#5fc8ff', stroke: INK });
      this.addMoment(powered ? 'powerSix' : 'six', powered ? 'THUNDERCLAP SIX!' : `${Math.round(sim.path.carry || 80)}m SIX!`, powered ? 'KRAKOOOM!' : 'SIX!', this.team.bat, { ballNo, detail: 'into the stands' });
    } else if (runs === 4) {
      this.board('FOUR!');
      this.charge.award('four', 'FOUR');
      sfx.crowd(0.8);
      this.addMoment('four', 'FOUR!', 'FOUR!', this.team.bat, { ballNo });
    } else if (runs === 0) this.charge.dot();
    if (inn.target != null && inn.runs >= inn.target) {
      this.addMoment('lastBallWin', 'WINNING HIT!', runs >= 4 ? 'DHOOM!' : 'YES!', this.team.bat, { ballNo, detail: `chased it with ${inn.ballsLeft} balls left` });
    }
  }

  // ---------- outfield replay (auto) ----------
  fieldLooks(list, side) {
    return list.map((f, i) => ({
      ...f,
      look: side === 'ai'
        ? (f.id === 'bowler' ? this.rival.bowl.look : teamLook(this.oppTeam, i))
        : (f.keeper && this.team.field.id === 'rani' ? this.team.field.look : f.id === 'bowler' ? this.team.bowl.look : teamLook(this.myTeam, i)),
      emblem: side === 'ai' ? (f.id === 'bowler' ? this.rival.bowl.emblem : null) : (f.keeper && this.team.field.id === 'rani' ? this.team.field.emblem : f.id === 'bowler' ? this.team.bowl.emblem : null),
      pose: f.keeper ? POSES.keeper() : POSES.crouch(),
    }));
  }

  setupOutfield(fielders, side) {
    const fs = this.fieldLooks(fielders, side);
    this.O = {
      fielders: fs,
      batters: [{ x: -0.6, y: 1.2, look: teamLook(side === 'ai' ? this.myTeam : this.oppTeam) }, { x: 0.8, y: 19, look: teamLook(side === 'ai' ? this.myTeam : this.oppTeam, 1) }],
      ball: { x: 0, y: 1, h: 1 }, marks: [], ring: null, ends: null, throwLine: null, labels: [],
    };
    this.view = 'outfield';
    this.of.focus([{ x: -30, y: -20 }, { x: 30, y: 45 }], true);
    return fs;
  }

  runBatters(t, runs) {
    // both batters run `runs` lengths over time t (s since contact)
    const { first, next } = CFG.running;
    const total = first + next * Math.max(0, runs - 1);
    const done = runs ? Math.min(runs, t < first ? t / first : 1 + (t - first) / next) : 0;
    const k = Math.min(done, runs);
    const leg = Math.floor(k), frac = k - leg;
    const pos = (start) => {
      const atEnd = (start + leg) % 2;
      const from = atEnd ? 19 : 1.2, to = atEnd ? 1.2 : 19;
      return leg >= runs ? (atEnd ? 19 : 1.2) : lerp(from, to, frac);
    };
    if (this.O) { this.O.batters[0].y = pos(0); this.O.batters[1].y = pos(1); this.O.running = t < total && runs > 0; }
  }

  async showAutoPlay(sim, fielders, o = {}) {
    const fs = this.setupOutfield(fielders, o.side || 'ai');
    const path = sim.path;
    let actor = null, target = null, tArrive = 0;
    if (sim.catch && (o.caught || o.dropped)) { actor = sim.catch.fielder; target = sim.catch.point; tArrive = sim.catch.t; }
    else if (sim.intercept) { actor = sim.intercept.fielder; target = sim.intercept.point; tArrive = sim.intercept.t; }
    else if (sim.save) { actor = sim.save.fielder; target = sim.save.point; tArrive = sim.save.t; }
    const A = actor && fs.find(f => f.id === actor.id);
    const start = A ? { x: A.x, y: A.y } : null;
    const end = o.caught ? sim.catch.t : o.saved ? sim.save.t : sim.kind === 'field' && sim.intercept ? sim.intercept.t : Math.min(sim.duration, 3);
    const runs = o.caught ? 0 : sim.runs;
    const dur = Math.max(0.8, end + 0.6);
    this.timeScale = 1.6;
    const t0 = this.gameTime;
    let said = false;
    await this.until(() => {
      const t = this.gameTime - t0;
      const b = path.ballAt(Math.min(t, end));
      if (A && target) {
        const p = Math.min(1, Math.max(0, (t - 0.25) / Math.max(0.3, tArrive - 0.25)));
        A.x = lerp(start.x, target.x, p); A.y = lerp(start.y, target.y, p);
        A.pose = p < 1 ? POSES.run(t * 14) : o.caught ? POSES.celebrate() : POSES.crouch();
      }
      if (t >= end && A && (o.caught || sim.intercept)) { b.x = A.x; b.y = A.y; b.h = o.caught ? 1.6 : 0.3; }
      this.O.ball = b;
      this.runBatters(t, runs);
      this.of.focus([b, { x: 0, y: 10 }, ...(A ? [A] : [])]);
      if (!said && t >= end) {
        said = true;
        const p = this.of.to(b.x, b.y, b.h);
        if (sim.kind === 'six' && !o.caught) { this.fx.word('SIX!', p.x, p.y - 40, { size: 80 }); this.fx.burst(p.x, p.y); this.fx.flash('#ffd23f', 0.3); }
        else if (sim.kind === 'four' && !o.saved) { this.fx.word('FOUR!', p.x, p.y - 40, { size: 70, color: '#3ec6ff', stroke: INK }); }
        else if (o.dropped) { this.fx.word('DROPPED!', p.x, p.y - 30, { size: 50 }); sfx.trombone(); }
        else if (!o.caught) this.fx.word(`${runs} RUN${runs === 1 ? '' : 'S'}`, this.W / 2, this.H * 0.3, { size: 44, color: '#fff4da', stroke: INK });
      }
      return t >= dur;
    });
    this.timeScale = 1;
  }

  // ---------- bowling innings ----------
  async bowlingInnings(inn) {
    this.phase = 'bowl';
    this.freeHit = false;
    this.aiPowerBalls = new Set([16, 26]);
    this.hud(inn);
    await this.introBanner(inn.target == null ? 'YOU BOWL FIRST' : 'YOUR TURN TO BOWL', inn.target == null ? `${this.myTeam.name} v ${this.oppTeam.name} · keep them quiet with ${this.team.bowl.name}` : `Defend ${inn.target - 1} with ${this.team.bowl.name}`);
    while (!inn.done()) {
      const ballNo = inn.balls + 1;
      this.phaseBanner(ballNo);
      if (ballNo === 7 && !this.scouted) {
        this.scouted = true;
        const p = this.rival.bat.ai;
        this.ui.banner('SCOUTING REPORT', `${this.rival.bat.name} ${p.label}. Their weak spot is now marked on the pitch.`, 2600);
        await this.sleepReal(this.bot ? 100 : 2200);
      }
      const r = await this.bowlBall(inn, ballNo);
      this.hud(inn);
      if (r?.rebowl) { this.rebowls = (this.rebowls || 0) + 1; continue; }
      if (inn.balls % 6 === 0 && !inn.done()) {
        const runs = inn.log.slice(-6).reduce((s, x) => s + (x === 'W' ? 0 : Number(x)), 0);
        this.ui.banner(`END OF OVER ${inn.balls / 6}`, inn.target == null ? `${runs} off the over · ${inn.runs}/${inn.wkts}` : `${runs} off the over · they need ${Math.max(0, inn.target - inn.runs)}`, 1300);
        await this.sleepReal(this.bot ? 100 : 1300);
      } else await this.sleepReal(this.bot ? 80 : 300);
    }
    this.ui.fieldButton(false);
  }

  currentField(ballNo) {
    const pp = ballNo <= 12;
    return this.bowlChoice.custom ? buildFieldFrom(this.bowlChoice.custom, pp) : buildField(this.bowlChoice.field, pp);
  }

  batterHead() {
    const p = this.cams.bowl.project(this.S.batter.x, 1.9, this.S.batter.z);
    return p ? { x: p.x, y: p.y } : { x: this.W / 2, y: this.H * 0.4 };
  }
  bowlerSpot() { return { x: this.W * 0.72, y: this.H * 0.56 }; }

  async bowlBall(inn, ballNo, opt = {}) {
    const S = this.S = this.freshScene();
    this.view = 'bowl';
    this.timeScale = 1;
    const rng = this.ballRng(ballNo);
    S.batter.look = teamLook(this.oppTeam); S.batter.team = this.oppTeam.id; S.batter.emblem = null; S.batter.x = -0.5;
    S.bowler.look = this.team.bowl.look; S.bowler.emblem = this.team.bowl.emblem; S.bowler.z = 26; S.bowler.x = 1.05; // right-arm over, a little wide of the stumps so the ball leaves his hand
    S.keeper.look = this.team.field.id === 'rani' ? this.team.field.look : teamLook(this.myTeam, 1);
    const kind = this.team.bowl.bowls;
    const profile = this.rival.bat.ai;
    let field = this.currentField(ballNo);
    S.field3d = field.filter(f => !f.keeper && f.id !== 'bowler');
    S.weak = this.scouted && !opt.scripted ? profile.weak : null;
    S.glowZone = opt.glow || null;

    // the AI batter may power up
    this.aiBatPower = null; this.clash = false;
    const need = inn.target != null ? inn.target - inn.runs : Math.max(12, 48 - inn.runs); // batting first, the AI paces itself to a par score
    if (!opt.scripted && this.aiPowerBalls.has(ballNo) && need / Math.max(1, inn.ballsLeft) > 1.0) {
      this.aiPowerBalls.delete(ballNo);
      const k = this.rival.bat.power.kind;
      this.aiBatPower = k === 'meteor' ? 'thunder' : k;
      const pw = this.rival.bat.power;
      if (!this.bot) { this.showCutIn(this.rival.bat, pw); this.powerFxUntil = this.realTime + 1400; }
      this.ui.banner(`${this.rival.bat.name.toUpperCase()}: ${pw.name.toUpperCase()}!`, 'Answer with a power of your own', 2000);
      if (this.aiBatPower === 'mirror') this.aiMirror = 3;
      sfx.whoosh();
    }
    const aiPower = this.aiBatPower || (this.aiMirror > 0 ? 'mirror' : null);
    const stance = opt.stance || aiStance(kind, rng);
    S.stance = stance;

    // what the batter is thinking
    const mood = this.batterMood;
    const exp = opt.scripted ? null : planExpectation(this.bowlHistory, profile, rng);
    if (exp && !this.bot) {
      const moodTxt = mood.state === 'rattled' ? ' (rattled)' : mood.state === 'fired' ? ' (fired up)' : '';
      const h = this.batterHead();
      this.fx.bubble(`Thinks: ${LENGTH_LABEL[exp.shown].toLowerCase()} one coming…${moodTxt}`, h.x, h.y, { dur: 2800 });
    }

    this.powerLock = false;
    this.refreshPowers();
    if (this.freeHit) this.ui.banner('FREE HIT', 'They can only be run out', 1400);
    const hint = opt.hint || (this.bowlHints-- > 0 ? 'SWIPE FROM YOUR BOWLER UP THE PITCH' : null);
    if (hint) this.ui.hint(hint);

    // the swipe (the FIELD button may interrupt it)
    let G;
    for (;;) {
      G = await this.captureBowlGesture(S, kind);
      if (G !== 'field') break;
      await this.editField(ballNo);
      field = this.currentField(ballNo);
      S.field3d = field.filter(f => !f.keeper && f.id !== 'bowler');
      this.view = 'bowl';
      if (hint) this.ui.hint(hint);
    }
    this.powerLock = true;
    this.refreshPowers();
    this.ui.hint(null);
    if (stance === 'charge') this.fx.bubble('Charging down!', this.batterHead().x, this.batterHead().y, { dur: 1100 });

    let rg = G.hesitated ? 'loose' : G.grade;
    if (this.armed.pinpoint) { rg = 'perfect'; this.armed.pinpoint = false; }
    if (opt.forceRelease) rg = opt.forceRelease(rg);
    // finish the run-up
    const left = Math.max(0, 700 - (this.realTime - S.runStart));
    const z0 = S.bowler.z;
    await this.animate(left, p => { S.bowler.z = lerp(z0, 20.7, p); S.bowler.pose = POSES.run(p * 8 + 6); S.bowler.spr = { anim: 'run', p: (26 - S.bowler.z) / 5.3 }; }, true);
    S.aim = null; S.trail = []; this.bowlTrail = null;

    const words = { perfect: '#ffd23f', good: '#fff4da', loose: '#ff8a8a', bad: '#e8343b' };
    const label = rg === 'bad' ? 'OVERSTEPPED!' : rg === 'loose' ? (G.hesitated ? 'HESITATED…' : 'SPRAYED IT!') : `${G.type.toUpperCase()}${rg === 'perfect' ? ' · PERFECT' : ''}`;
    this.fx.word(label, this.W / 2, this.H * 0.55, { size: rg === 'perfect' ? 38 : 30, color: words[rg], stroke: INK, rot: 0, dur: 1000 });
    if (rg === 'perfect') this.charge.award('perfectRelease', 'RELEASE');
    this.charge.timingStreak(rg === 'perfect');

    if (rg === 'bad') {
      S.bowler.pose = POSES.bowl(1); S.bowler.spr = { anim: 'deliver', t0: this.gameTime };
      inn.extra(1);
      this.freeHit = true;
      this.ui.banner('NO BALL!', 'Too fast — you overstepped. +1 run, free hit next', 1700);
      sfx.trombone();
      await this.sleepReal(this.bot ? 100 : 1500);
      return { rebowl: true };
    }

    // the delivery the swipe describes
    const spec = { x: G.x, length: G.length, bounce: G.bounce, h: G.h, kmh: G.kmh, swing: G.swing, move: G.move, loop: G.loop };
    if (rg === 'loose') {
      spec.x = clamp(spec.x + rng.range(-0.18, 0.18), -0.8, 0.8);
      if (spec.bounce != null) { spec.bounce = clamp(spec.bounce + rng.range(-1.2, 1.2), 0.7, 11.5); spec.length = lengthForBounce(spec.bounce); spec.h = heightForBounce(spec.bounce); }
    }
    if (rg === 'perfect') { spec.swing *= 1.15; spec.move *= 1.15; }
    const fxFlags = {};
    const A = this.armed;
    let usedPower = null;
    if (A.tornado) { Object.assign(spec, { length: 'yorker', bounce: 0.9, h: 0.12, x: 0, kmh: 160, swing: 0.05, move: 0 }); fxFlags.tornado = true; A.tornado = false; usedPower = 'tornado'; }
    if (A.maya) { fxFlags.maya = true; A.maya = false; usedPower = 'maya'; }
    if (A.shatter) { spec.move = 0.3; fxFlags.shatter = true; A.shatter = false; usedPower = 'shatter'; }
    if (opt.spec) Object.assign(spec, opt.spec);

    // release, then aftertouch: drag sideways while the ball is in the air to bend it late
    const d0 = makeDelivery(spec);
    S.delivery = d0; S.ballT0 = this.gameTime; S.afterOff = 0;
    S.bowler.pose = POSES.bowl(1); S.bowler.followT0 = this.realTime; S.bowler.spr = { anim: 'deliver', t0: this.gameTime };
    if (fxFlags.maya) S.maya = { real: 1, picked: 0 };
    sfx.whoosh();
    const budget = rg === 'perfect' ? 0.32 : rg === 'good' ? 0.24 : 0.14;
    const winEnd = d0.bounceT != null ? d0.bounceT : d0.tContact * 0.55;
    const scale = this.H / 844;
    let lastX = null;
    this.onInput = (type, g) => {
      if (type === 'down') lastX = g.x;
      else if (type === 'move' && lastX != null) {
        const dx = g.x - lastX; lastX = g.x;
        if (this.gameTime - S.ballT0 < winEnd) { S.afterOff = clamp(S.afterOff - (dx / scale) * 0.0022, -budget, budget); S.bendT = this.realTime; }
      } else if (type === 'up') lastX = null;
    };
    if (this.afterHints-- > 0 && !opt.scripted) this.ui.hint('DRAG SIDEWAYS TO BEND IT!');
    if (this.bot && Math.random() < 0.5) this.botAftertouch(winEnd);
    S.afterBudget = budget;
    await this.until(() => this.gameTime - S.ballT0 >= winEnd);
    this.onInput = null;
    this.ui.hint(null);
    const off = S.afterOff;
    const d = Math.abs(off) > 0.005 ? makeDelivery({ ...spec, x: spec.x + off }) : d0;
    if (Math.abs(off) > 0.08) this.fx.word('LATE MOVEMENT!', this.W / 2, this.H * 0.5, { size: 32, color: '#3ec6ff', stroke: INK, rot: 0, dur: 900 });

    // read the batter: expectation, weak spot, setups, mood
    const shape = { length: spec.length, lane: laneFor(d.xt), lateWorld: G.lateWorld, mag: G.mag, slower: G.slower, after: off };
    const mods = opt.scripted ? null : deliveryMods(shape, this.bowlHistory, exp?.expect, profile, mood);
    shape.combo = mods?.combo || null;
    shape.weak = !!mods?.weak;
    this.bowlHistory.push(shape);
    if (mods) {
      let y = this.H * 0.24;
      for (const t of mods.tags) {
        const meh = !t.charge;
        this.fx.word(t.label, this.W / 2, y, { size: meh ? 34 : 44, color: meh ? '#fff4da' : '#ffd23f', stroke: meh ? INK : '#e8343b', dur: 1200 });
        if (t.charge) this.charge.add(t.charge, t.label.replace('!', ''));
        if (t.id === 'weak' && !this.scouted) this.scouted = true;
        y += 46;
      }
      if (mods.tags.some(t => t.id === 'setup' || t.id === 'swingtrap' || t.id === 'changeup')) sfx.dhol();
    }
    if (mood.balls > 0 && --mood.balls === 0) mood.state = 'calm';

    let ai = aiBat(d, { ballNo, need, ballsLeft: inn.ballsLeft, wicketsLeft: CFG.wickets - inn.wkts, release: rg === 'loose' ? 'loose' : rg, fx: fxFlags, stance, power: aiPower === 'thunder' ? 'thunder' : null, mods }, rng);
    if (aiPower === 'mirror' && ai.res.outcome === 'hit' && !ai.res.loft && (ai.grade === 'perfect' || ai.grade === 'good')) ai.res.forced = { four: true, uncatchable: true };
    if (this.aiMirror > 0) this.aiMirror--;
    if (opt.forceAi) ai = opt.forceAi(d, ai) || ai;

    await this.until(() => this.gameTime - S.ballT0 >= d.tContact);
    if (ai.res.outcome !== 'leave') S.batter.swingT0 = this.realTime;
    S.batter.shot = { anim: ai.res.outcome === 'leave' ? 'leave' : shotAnim({ kind: 'drive', angle: ai.res.angle ?? 0 }), t0: this.realTime, from: 'ready' };
    const res = ai.res;
    const contact = d.pos(d.tContact);
    const cs = this.cams.bowl.project(contact.x, contact.y, contact.z) || { x: this.W / 2, y: this.H / 3 };
    const outFree = () => { this.fx.word('FREE HIT · NOT OUT', this.W / 2, this.H * 0.4, { size: 40 }); };
    const freeHit = this.freeHit; this.freeHit = false;
    const bowlerHero = this.team.bowl;
    const before = { runs: inn.runs, wkts: inn.wkts };

    if (res.outcome === 'hit' || res.outcome === 'edge') {
      if (ai.grade === 'perfect') { sfx.bat('perfect'); this.fx.burst(cs.x, cs.y, { r: 140 }); } else sfx.bat('good');
      S.delivery = null; S.ball = { ...contact };
      const v = res.v || 25, ang = res.outcome === 'edge' ? Math.PI - 0.3 : res.angle, vl = (res.launchDeg || 4) * Math.PI / 180;
      S.flight = { p0: contact, t0: this.gameTime, vx: Math.sin(ang) * v * Math.cos(vl), vz: Math.cos(ang) * v * Math.cos(vl), vy: v * Math.sin(vl) };
      await this.sleep(res.outcome === 'edge' ? 160 : 450);
    } else {
      await this.until(() => this.gameTime - S.ballT0 >= (res.outcome === 'bowled' ? d.tStumps : d.tKeeper - 0.05));
      S.delivery = null;
    }

    const wicket = (text, kind2, hero, extra = {}) => {
      if (freeHit) { outFree(); inn.ball({ runs: 0 }); return; }
      inn.ball({ wicket: true });
      this.charge.award('wicket', 'WICKET');
      this.wicketFx(text, cs);
      S.bowler.spr = { anim: 'celebrate', t0: this.realTime };
      this.addMoment(kind2, text, extra.word || text, hero, { ballNo, ...extra });
    };

    if (res.outcome === 'bowled') {
      S.stumps[0] = { dir: rng.range(-1, 1) };
      const comboTag = mods?.tags.find(t => t.id === 'setup' || t.id === 'swingtrap' || t.id === 'changeup');
      const powerWord = usedPower ? { tornado: 'TORNADO YORKER!', maya: 'MAYA BALL!', shatter: 'SHATTERED!' }[usedPower] : comboTag ? comboTag.label : null;
      wicket(res.mayaFooled ? 'FOOLED BY MAYA!' : 'BOWLED!', usedPower || comboTag ? 'twoWickets' : 'wicket', bowlerHero, { word: powerWord || 'BOWLED!', detail: powerWord ? `${powerWord.replace('!', '').toLowerCase()} wicket` : 'stumps cartwheeling' });
    } else if (res.outcome === 'leave' || res.outcome === 'beaten') {
      this.fx.word(res.outcome === 'leave' ? 'LEFT ALONE' : 'BEATEN!', this.W / 2, this.H * 0.4, { size: 44, color: '#fff4da', stroke: '#3ec6ff' });
      inn.ball({ runs: 0 });
      this.charge.award('dot', 'DOT'); this.charge.dot();
    } else if (res.outcome === 'stumping-chance') {
      const chance = { kind: 'stumping', p: 0.6 };
      const offset = { x: rng.range(-0.3, 0.5), y: rng.range(0.4, 0.9) };
      let r;
      if (playerControls(chance, this.fieldState, ballNo)) {
        this.noteEvent(ballNo);
        r = await this.keeperEvent('stumping', d, offset);
      } else r = rng.chance(chance.p) ? 'stumped' : 'missed';
      this.view = 'bowl';
      if (r === 'stumped') {
        this.charge.award('keeperDismissal', 'STUMPING');
        wicket('STUMPED!', 'keeper', this.team.field, { fielding: true, word: 'STUMPED!', detail: 'lightning-fast stumping' });
      } else { inn.ball({ runs: 0 }); this.charge.dot(); }
    } else if (res.outcome === 'edge') {
      const chance = { kind: 'edge', p: keeperEdgeP(res.offset) };
      let r;
      if (playerControls(chance, this.fieldState, ballNo)) {
        this.noteEvent(ballNo);
        r = await this.keeperEvent('edge', d, res.offset, { shatter: fxFlags.shatter });
      } else r = rng.chance(chance.p) ? 'caught' : 'dropped';
      this.view = 'bowl';
      if (r === 'caught') {
        this.charge.award('keeperDismissal', 'KEEPER');
        wicket('CAUGHT BEHIND!', 'keeper', this.team.field, { fielding: true, word: 'SNAFFLED!', detail: 'edge taken behind the stumps' });
      } else {
        const four = res.offset.x > 1.0 && rng.chance(0.5);
        inn.ball({ runs: four ? 4 : rng.chance(0.4) ? 1 : 0 });
        if (four) this.fx.word('EDGED FOR FOUR', this.W / 2, this.H * 0.4, { size: 40 });
      }
    } else {
      await this.bowlingHit(inn, ballNo, res, field, rng, wicket, freeHit);
    }
    this.view = 'bowl';
    this.hud(inn);

    const runs = inn.runs - before.runs, wicketFell = inn.wkts > before.wkts;
    const goodBall = wicketFell || (runs === 0 && (res.outcome !== 'hit' || rg === 'perfect' || (mods?.tags.some(t => t.charge > 0) ?? false)));
    await this.bowlingBanter({ runs, wicketFell, goodBall, rng, inn });
    await this.sleepReal(this.bot ? 50 : 400);
  }

  // Waits for the delivery swipe. Touch down starts the run-up; lift to bowl.
  async captureBowlGesture(S, kind) {
    const scale = this.H / 844;
    let pts = null, done = null;
    this.fieldEditRequested = false;
    this.ui.fieldButton(true, () => { if (!pts) this.fieldEditRequested = true; });
    this.onInput = (type, g) => {
      if (type === 'down') {
        if (this.inMap(g)) { this.fieldEditRequested = true; return; }
        if (g.y < this.H * 0.28 || this.realTime < this.powerFxUntil) return;
        pts = [{ x: g.x, y: g.y, t: g.t }];
        S.runStart = this.realTime;
        this.ui.hint(null);
        this.bowlTrail = pts;
      } else if (type === 'move' && pts) {
        pts.push({ x: g.x, y: g.y, t: g.t });
        const r = gestureToDelivery(pts, kind, scale);
        S.aim = r ? { ...r, pts } : null;
      } else if (type === 'up' && pts) {
        pts.push({ x: g.x, y: g.y, t: g.t });
        const r = gestureToDelivery(pts, kind, scale);
        if (!r) {
          this.fx.word('SWIPE FURTHER UP THE PITCH', this.W / 2, this.H * 0.5, { size: 26, color: '#fff4da', stroke: INK, rot: 0, dur: 1000 });
          pts = null; S.aim = null; S.runStart = null; this.bowlTrail = null;
          S.bowler.z = 26; S.bowler.pose = POSES.stand(); S.bowler.spr = null;
          return;
        }
        done = r;
      }
    };
    if (this.bot) this.botBowl();
    await this.until(() => {
      if (this.fieldEditRequested) return true;
      if (pts && S.runStart != null && !done) {
        const e = this.realTime - S.runStart;
        const p = Math.min(1, e / 1100);
        S.bowler.z = lerp(26, 21.4, p); S.bowler.pose = POSES.run(p * 10); S.bowler.spr = { anim: 'run', p: (26 - S.bowler.z) / 5.3 };
        if (e > 2600) {
          done = gestureToDelivery(pts, kind, scale) || { x: 0.2, length: 'good', bounce: 5.5, h: 0.8, kmh: 120, swing: 0, move: 0, loop: 0.6, type: 'Seam up', grade: 'loose', lateWorld: 0, mag: 0, slower: false, speedP: 0.3 };
          done.hesitated = true;
        }
      }
      return done;
    });
    this.onInput = null;
    this.ui.fieldButton(false);
    if (this.fieldEditRequested && !done) return 'field';
    return done;
  }

  botBowl() {
    const sc = this.H / 844, x0 = this.W * 0.62, y0 = this.H * 0.8;
    const up = 150 + Math.random() * 230, dx = (Math.random() - 0.5) * 220, bend = (Math.random() - 0.5) * 90;
    const steps = 5, dur = 100 + Math.random() * 250;
    const run = async () => {
      await this.sleepReal(300);
      this.emit('down', { x: x0, y: y0, t: this.realTime });
      for (let i = 1; i <= steps; i++) {
        await this.sleepReal(dur / steps);
        const k = i / steps;
        this.emit('move', { x: x0 + dx * k + bend * Math.sin(Math.PI * k), y: y0 - up * sc * k, t: this.realTime });
      }
      this.emit('up', { x: x0 + dx, y: y0 - up * sc, t: this.realTime });
    };
    run().catch(() => {});
  }

  botAftertouch(winEnd) {
    const dir = Math.random() < 0.5 ? -1 : 1;
    const run = async () => {
      await this.sleep(winEnd * 300);
      this.emit('down', { x: this.W / 2, y: this.H * 0.6, t: this.realTime });
      for (let i = 1; i <= 4; i++) { await this.sleep(winEnd * 100); this.emit('move', { x: this.W / 2 + dir * 30 * i, y: this.H * 0.6, t: this.realTime }); }
      this.emit('up', { x: this.W / 2 + dir * 120, y: this.H * 0.6, t: this.realTime });
    };
    run().catch(() => {});
  }

  // ---------- field editor ----------
  async editField(ballNo) {
    this.fieldEditRequested = false;
    const pp = ballNo <= 12;
    // start from the field as it will actually stand (Power Burst limits already applied)
    const asPlayed = list => buildFieldFrom(list, pp).filter(f => !f.keeper && f.id !== 'bowler').map(f => ({ id: f.id, name: f.name, x: f.x, y: f.y }));
    const start = this.bowlChoice.custom || presetPositions(this.bowlChoice.field);
    const E = this.E = { draft: asPlayed(start), pp, drag: null, selected: null, done: false, preset: this.bowlChoice.custom ? null : this.bowlChoice.field, moved: false, touched: false, t0: this.realTime, lift: 0 };
    this.view = 'fieldedit';
    this.fx.bubbles = []; this.fx.words = [];
    this.phase = 'edit';
    this.refreshPowers();
    this.ui.hint(null);
    this.ui.editing(true);
    this.ui.fieldEditor(true, {
      presets: [['attack', 'Attack'], ['balanced', 'Balanced'], ['defend', 'Defend']],
      current: this.bowlChoice.custom ? null : this.bowlChoice.field,
      onPreset: id => { E.draft = asPlayed(presetPositions(id)); E.preset = id; E.moved = false; E.selected = null; sfx.click(); },
      onDone: () => { E.done = true; },
    });
    const place = (f, sx, sy) => {
      const c = this.edFrom(sx, sy);
      const r = Math.hypot(c.x, c.y - CFG.ground.centerY), max = CFG.ground.boundaryR - 2;
      if (r > max) { c.x *= max / r; c.y = CFG.ground.centerY + (c.y - CFG.ground.centerY) * max / r; }
      if (Math.abs(c.x) < 3 && c.y > -5 && c.y < 23.5) c.x = c.x < 0 ? -3 : 3; // keep off the pitch
      f.x = c.x; f.y = c.y; f.name = positionName(c.x, c.y);
      E.moved = true; E.preset = null; E.touched = true;
      this.ui.fieldPreset(null);
    };
    // Drag a token (it lifts above your thumb), or tap one and then tap where it should go.
    this.onInput = (type, g) => {
      const L = this.edLayout();
      if (type === 'down') {
        let best = null, bd = L.tok + 20;
        for (const f of E.draft) {
          const p = this.edTo(f.x, f.y);
          const dd = Math.hypot(p.x - g.x, p.y - g.y);
          if (dd < bd) { bd = dd; best = f; }
        }
        if (best) {
          const p = this.edTo(best.x, best.y);
          E.drag = best; E.dragMoved = false; E.touched = true;
          E.grab = { dx: p.x - g.x, dy: p.y - g.y, x0: g.x, y0: g.y };
          sfx.click();
        } else if (E.selected && this.edInside(g.x, g.y)) {
          place(E.selected, g.x, g.y); E.selected = null; sfx.click();
        } else E.selected = null;
      } else if (type === 'move' && E.drag) {
        if (!E.dragMoved && Math.hypot(g.x - E.grab.x0, g.y - E.grab.y0) > 6) { E.dragMoved = true; E.liftT = this.realTime; }
        if (E.dragMoved) {
          E.lift = Math.min(1, (this.realTime - E.liftT) / 120) * (L.tok + 22);
          place(E.drag, g.x + E.grab.dx, g.y + E.grab.dy - E.lift);
        }
      } else if (type === 'up' && E.drag) {
        E.selected = E.dragMoved ? null : (E.selected === E.drag ? null : E.drag);
        E.drag = null; E.lift = 0;
      }
    };
    if (this.bot) this.sleepReal(400).then(() => { E.done = true; }).catch(() => {});
    await this.until(() => {
      const out = E.draft.filter(outsideRing).length;
      if (E.pp && out > 2) this.ui.fieldNote(`${out} outside the circle — Power Burst allows 2. Extras move in when you're done.`, true);
      else if (E.selected) this.ui.fieldNote(`Tap where ${E.selected.name} should go.`, false);
      else this.ui.fieldNote(`Drag a fielder, or tap one then tap a spot.${E.pp ? ` ${out}/2 outside the circle.` : ''}`, false);
      return E.done;
    });
    this.onInput = null;
    if (E.preset && !E.moved) { this.bowlChoice.field = E.preset; this.bowlChoice.custom = null; }
    else this.bowlChoice.custom = E.draft.map(f => ({ id: f.id, name: positionName(f.x, f.y), x: f.x, y: f.y }));
    if (E.pp && E.draft.filter(outsideRing).length > 2) this.ui.toast('Power Burst: extra fielders moved inside the circle');
    else this.ui.toast('Field set');
    this.onFieldSaved?.(this.bowlChoice);
    this.ui.fieldEditor(false);
    this.ui.editing(false);
    this.E = null;
    this.phase = 'bowl';
    this.refreshPowers();
  }

  // Field editor board: a flat top-down circle filling the space above the bottom bar.
  edLayout() {
    const sheet = document.getElementById('fieldSheet');
    const bottom = sheet && !sheet.hidden ? sheet.getBoundingClientRect().top - 10 : this.H - 140;
    const top = 80;
    const R = Math.max(80, Math.min((this.W - 24) / 2, (bottom - top - 30) / 2));
    const k = R / CFG.ground.boundaryR;
    return { cx: this.W / 2, cy: top + (bottom - top - 30) / 2, k, R, tok: Math.max(15, Math.min(21, k * 2.4)) };
  }
  // A gentle fisheye (radius^0.65) gives the crowded infield more room on a small screen.
  edTo(x, y) { return fisheyeTo(this.edLayout(), x, y); }
  edFrom(sx, sy) { return fisheyeFrom(this.edLayout(), sx, sy); }
  edInside(sx, sy) { const L = this.edLayout(); return Math.hypot(sx - L.cx, sy - L.cy) <= L.R + 10; }

  // ---------- banter ----------
  async banterChoice() {
    let pick = null;
    this.ui.banter(true, c => { pick = c; sfx.click(); });
    if (this.bot) this.sleepReal(250).then(() => { pick = pick || (Math.random() < 0.5 ? 'smack' : 'cool'); }).catch(() => {});
    const t0 = this.realTime, limit = 2600;
    await this.until(() => {
      this.ui.banterTimer(1 - (this.realTime - t0) / limit);
      return pick || this.realTime - t0 > limit;
    });
    this.ui.banter(false);
    return pick || 'cool';
  }

  async bowlingBanter({ runs, wicketFell, goodBall, rng, inn }) {
    if (inn.done() && !wicketFell) return;
    const me = this.team.bowl, them = this.rival.bat;
    const bat = () => this.batterHead(), bowl = () => this.bowlerSpot();
    if (this.revenge) {
      if (wicketFell || runs === 0) {
        this.charge.add(10, 'REVENGE');
        this.fx.word('REVENGE!', this.W / 2, this.H * 0.3, { size: 60, color: '#ffd23f', stroke: '#e8343b' });
        this.fx.bubble(line('revenge', me.id, rng), bowl().x, bowl().y, { dur: 1800 });
        this.revenge = false;
        await this.sleepReal(this.bot ? 50 : 900);
      } else if (runs >= 4) this.revenge = false;
    }
    if (runs >= 4 && rng.chance(0.45)) {
      this.fx.bubble(line('batterSledge', them.id, rng), bat().x, bat().y, { dur: 2000 });
      this.revenge = true;
      this.ui.banner('THEY\'RE TALKING', 'Dot ball or wicket next = +10 REVENGE', 1800);
      await this.sleepReal(this.bot ? 50 : 1300);
      return;
    }
    if (!goodBall) return;
    const choice = await this.banterChoice();
    if (choice === 'smack') {
      if (wicketFell) {
        this.fx.bubble(line('sendoff', me.id, rng), bowl().x, bowl().y, { dur: 1800 });
        this.charge.add(5, 'SEND-OFF');
        sfx.crowd(0.7);
        await this.sleepReal(this.bot ? 50 : 700);
        this.fx.bubble(line('departing', them.id, rng), bat().x, bat().y, { dur: 1500 });
        this.batterMood = { state: 'calm', balls: 0 };
        await this.sleepReal(this.bot ? 50 : 900);
        return;
      }
      this.fx.bubble(line('sledge', me.id, rng), bowl().x, bowl().y, { dur: 1800 });
      await this.sleepReal(this.bot ? 50 : 750);
      const r = sledgeOutcome(them.ai, rng);
      const h = bat();
      if (r === 'fired') {
        this.batterMood = { state: 'fired', balls: 2 };
        this.fx.bubble(line('fired', them.id, rng), h.x, h.y, { dur: 1800 });
        this.fx.word('FIRED UP!', this.W / 2, this.H * 0.3, { size: 48, color: '#ff9f1c', stroke: INK });
      } else if (r === 'rattled') {
        this.batterMood = { state: 'rattled', balls: 2 };
        this.fx.bubble(line('rattled', them.id, rng), h.x, h.y, { dur: 1800 });
        this.fx.word('RATTLED!', this.W / 2, this.H * 0.3, { size: 48, color: '#3ec6ff', stroke: INK });
      } else {
        this.batterMood = { state: 'calm', balls: 0 };
        this.fx.bubble(line('unfazed', them.id, rng), h.x, h.y, { dur: 1800 });
        this.fx.word('UNFAZED', this.W / 2, this.H * 0.3, { size: 40, color: '#fff4da', stroke: INK });
      }
      await this.sleepReal(this.bot ? 50 : 1000);
    } else {
      this.charge.add(3, 'COMPOSURE');
      if (rng.chance(0.35)) {
        await this.sleepReal(this.bot ? 50 : 300);
        this.fx.bubble(line('compliment', them.id, rng), bat().x, bat().y, { dur: 1700 });
        this.charge.add(3, 'RESPECT');
        await this.sleepReal(this.bot ? 50 : 800);
      }
    }
  }

  noteEvent(ballNo) { this.fieldState.events++; this.fieldState.lastEventBall = ballNo; }

  async bowlingHit(inn, ballNo, res, field, rng, wicket, freeHit) {
    const sim = simulateHit(res, field, rng, { aiBatting: true });
    const ctl = ch => playerControls(ch, this.fieldState, ballNo);

    if (sim.catch) {
      const ch = { kind: 'catch', p: sim.catch.p };
      let r;
      if (ctl(ch)) { this.noteEvent(ballNo); r = await this.catchEvent(sim, field); }
      else {
        r = rng.chance(sim.catch.p) ? 'caught' : sim.catch.p >= 0.3 ? 'dropped' : 'safe';
        await this.showAutoPlay(sim, field, { side: 'player', caught: r === 'caught', dropped: r === 'dropped' });
      }
      if (r === 'caught' || r === 'dive') {
        this.charge.award('catch', 'CATCH');
        if (r === 'dive') this.charge.award('diveBonus', 'DIVE');
        if (freeHit) { inn.ball({ runs: 0 }); this.fx.word('FREE HIT · NOT OUT', this.W / 2, this.H * 0.4, { size: 40 }); return; }
        inn.ball({ wicket: true });
        this.charge.award('wicket', 'WICKET');
        this.addMoment('catch', r === 'dive' ? 'DIVING CATCH!' : 'CAUGHT!', r === 'dive' ? 'GOTCHA!' : 'CAUGHT!', this.team.field, { ballNo, fielding: true, detail: `held at ${sim.catch.fielder.name.toLowerCase()}` });
        this.stats.fieldingWins++;
        sfx.crowd(1);
        return;
      }
      const runs = r === 'safe' ? sim.runs : Math.max(sim.runs, runsAfterCollect(sim.catch.t + 1.0, sim.catch.point));
      inn.ball({ runs });
      if (runs === 0) this.charge.award('dot', 'DOT');
      return;
    }

    if (sim.runOut) {
      const best = Math.min(sim.runOut.margins.striker, sim.runOut.margins.bowler);
      const ch = { kind: 'runout', p: 1 / (1 + Math.exp(best * 5)) };
      let r;
      if (ctl(ch)) { this.noteEvent(ballNo); r = await this.runOutEvent(sim, field); }
      else {
        const out = rng.chance(ch.p * 0.8);
        await this.showAutoPlay(sim, field, { side: 'player' });
        r = { out, runs: out ? sim.runOut.attempt - 1 : sim.runOut.attempt };
      }
      if (r.out) {
        inn.ball({ runs: r.runs, wicket: true, runOut: true });
        this.charge.award('directHit', 'DIRECT HIT');
        if (r.long) this.charge.award('longThrowBonus', 'LONG THROW');
        this.charge.award('wicket', 'WICKET');
        this.addMoment('runout', 'RUN OUT!', 'ZZZAP!', this.team.field, { ballNo, fielding: true, longThrow: r.long, detail: r.margin != null ? `out by ${Math.abs(r.margin).toFixed(2)}s` : 'direct hit' });
        this.stats.fieldingWins++;
      } else inn.ball({ runs: r.runs });
      return;
    }

    if (sim.save) {
      const ch = { kind: 'save', p: sim.save.p };
      let saved;
      if (ctl(ch)) { this.noteEvent(ballNo); saved = await this.saveEvent(sim, field); }
      else { saved = rng.chance(sim.save.p * 0.5); await this.showAutoPlay(sim, field, { side: 'player', saved }); }
      if (saved) {
        inn.ball({ runs: 2 });
        this.charge.award('boundarySave', 'SAVE');
        this.addMoment('save', 'BOUNDARY SAVE!', 'SAVED!', this.team.field, { ballNo, fielding: true });
        this.stats.fieldingWins++;
      } else { inn.ball({ runs: sim.runs }); this.fx.word('FOUR!', this.W / 2, this.H * 0.35, { size: 60, color: '#3ec6ff', stroke: INK }); }
      return;
    }

    await this.showAutoPlay(sim, field, { side: 'player' });
    inn.ball({ runs: sim.runs });
    if (sim.runs === 0) { this.charge.award('dot', 'DOT'); this.charge.dot(); }
  }

  // ---------- Wicket-Keeper Mode ----------
  async keeperEvent(kind, d, offset, opt = {}) {
    const S = this.S;
    this.view = 'keeper';
    this.phase = 'keeper';
    this.refreshPowers();
    const cam = this.cams.keeper;
    const A = this.armed;
    const elastic = A.elastic > 0;
    if (elastic) A.elastic--;
    const freeze = kind === 'stumping' && A.freeze;
    if (freeze) A.freeze = false;
    const tut = this.tutorialKeeper || {};
    const windowMs = (opt.window ?? tut.window ?? (elastic ? F.elasticWindow : F.keeperWindow)) * (opt.shatter ? 1.3 : 1);
    const approach = opt.approach ?? tut.approach ?? (kind === 'edge' ? 1050 : 1150);
    const to = { x: clamp(offset.x * 0.8, -1.05, 1.05), y: clamp(offset.y, 0.25, 1.3), z: -2.0 };
    const from = kind === 'edge' ? { x: S.batter.x + 0.35, y: 0.75, z: 1.1 } : { x: d.xt * 0.6, y: 0.5, z: 1.3 };
    const tapReach = elastic ? 0.95 : 0.45;
    const needSwipe = Math.abs(to.x - 0.3) > tapReach || to.y > 1.15;
    S.delivery = null; S.ball = null; S.flight = null;
    S.kball = { from, to, t0: this.realTime, dur: approach, done: false };
    S.reticle = { ...to, needSwipe, elastic, t0: this.realTime, dur: approach };
    S.keeper = { x: 0.3, z: -2.4, pose: POSES.keeper(), look: this.team.field.id === 'rani' ? this.team.field.look : teamLook(this.myTeam, 1), emblem: this.team.field.id === 'rani' ? this.team.field.emblem : null };
    // clear leftover delivery text so nothing covers the target
    this.fx.words = []; this.fx.bubbles = []; this.ui.clearBanner();
    this.fx.word(kind === 'edge' ? 'EDGE!' : 'BEATEN!', this.W / 2, this.H * 0.18, { size: 50, dur: 900 });
    this.fx.speed = 1;
    if (elastic) this.fx.word('BOING!', this.W * 0.5, this.H * 0.3, { size: 40, color: '#ffe14d', stroke: INK });
    this.ui.hint(needSwipe ? 'SWIPE ALONG THE ARROW AS THE RING CLOSES!' : 'TAP WHEN THE RING CLOSES!');
    sfx.whoosh();

    const arrive = S.kball.t0 + approach;
    let input = null;
    this.onInput = (type, g) => {
      if (input || type !== 'up') return;
      const isSwipe = Math.hypot(g.dx, g.dy) > 28;
      const t = isSwipe ? g.t : g.t0;
      if (t < arrive - windowMs / 2 - 300) return; // ignore accidental early touches
      input = { t, isSwipe, dx: g.dx, dy: g.dy };
    };
    if (this.bot) {
      const err = makeRng(Math.floor(this.realTime)).normal() * 90;
      this.sleepReal(approach + err).then(() => {
        const hs = cam.project(0.3, 0.55, -2.4), rs = cam.project(to.x, to.y, to.z);
        const dx = needSwipe ? (rs.x - hs.x) : 0, dy = needSwipe ? (rs.y - hs.y) : 0;
        this.botInput('up', { dx, dy, t0: this.realTime - 60 });
      }).catch(() => {});
    }
    await this.until(() => input || this.realTime > arrive + windowMs / 2 + 40);
    this.onInput = null;
    this.ui.hint(null);

    let result = 'dropped';
    if (input) {
      const err = input.t - arrive;
      let dirOk = true;
      if (needSwipe) {
        if (!input.isSwipe) dirOk = false;
        else {
          const hs = cam.project(0.3, 0.55, -2.4), rs = cam.project(to.x, to.y, to.z);
          const want = Math.atan2(rs.y - hs.y, rs.x - hs.x), got = Math.atan2(input.dy, input.dx);
          dirOk = angDiff(want, got) <= (elastic ? 60 : 45) * Math.PI / 180;
        }
      }
      if (input.isSwipe) S.keeper.pose = POSES.dive(Math.sign(input.dx || to.x || 1));
      else S.keeper.pose = POSES.keeper([to.x * 30, -to.y * 20]);
      if (dirOk && Math.abs(err) <= F.keeperClean) result = 'caught';
      else if (dirOk && Math.abs(err) <= windowMs / 2) result = 'juggle';
      if (!dirOk) this.fx.word('WRONG WAY!', this.W / 2, this.H * 0.3, { size: 40 });
      else if (result === 'dropped') this.fx.word(err < 0 ? 'TOO EARLY!' : 'TOO LATE!', this.W / 2, this.H * 0.3, { size: 40 });
    }
    await this.until(() => this.realTime >= arrive);
    S.kball.done = result !== 'dropped';
    const hs = cam.project(to.x, to.y, to.z) || { x: this.W / 2, y: this.H / 2 };

    if (result === 'juggle') {
      sfx.glove();
      this.fx.word('JUGGLE! TAP AGAIN!', this.W / 2, this.H * 0.3, { size: 48, dur: F.rejuggleMs + 200 });
      this.ui.hint('TAP ANYWHERE!');
      let tap = null;
      this.onInput = (type, g) => { if (type === 'down') tap = g; };
      if (this.bot) this.sleepReal(200).then(() => this.botInput('down')).catch(() => {});
      const t0 = this.realTime;
      await this.until(() => tap || this.realTime - t0 > F.rejuggleMs);
      this.onInput = null;
      this.ui.hint(null);
      result = tap ? 'caught' : 'dropped';
    }
    this.fx.speed = 0;
    if (result === 'caught') {
      this.hitStop(120); sfx.glove(); buzz(60);
      this.fx.burst(hs.x, hs.y, { color: '#ffe14d', r: 220 });
      this.fx.word('SNAFFLED!', hs.x, hs.y - 40, { size: 60 });
      this.fx.bubble(this.team.field.id === 'rani' ? 'Arre, try harder!' : 'Got it!', this.W * 0.55, this.H * 0.55);
    } else {
      S.kball.done = false; S.kball.miss = true;
      this.fx.word('BUTTERFINGERS!', this.W / 2, this.H * 0.32, { size: 52 });
      sfx.trombone();
      await this.sleepReal(this.bot ? 100 : 900);
      this.phase = 'bowl';
      return 'dropped';
    }

    if (kind !== 'stumping') { await this.sleepReal(this.bot ? 100 : 800); this.phase = 'bowl'; return 'caught'; }

    // stumping: swipe up toward the stumps
    S.stumpGlow = true;
    const windowSt = freeze ? 1500 : F.stumpWindow;
    if (freeze) { this.fx.word('FREEZE!', this.W / 2, this.H * 0.25, { size: 64, color: '#3ec6ff', stroke: INK }); this.fx.flash('#3ec6ff', 0.35); S.frozen = true; }
    this.ui.hint('SWIPE UP TO STUMP HIM!');
    let sw = null;
    const t0 = this.realTime;
    this.onInput = (type, g) => { if (type === 'up' && !sw) sw = g; };
    if (this.bot) this.sleepReal(180).then(() => this.botInput('up', { dx: 0, dy: -120 })).catch(() => {});
    await this.until(() => sw || this.realTime - t0 > windowSt);
    this.onInput = null; this.ui.hint(null); S.stumpGlow = false; S.frozen = false;
    const ok = sw && sw.dy < -30 && Math.abs(sw.dx) < Math.abs(sw.dy) * 1.2;
    if (ok) {
      const fast = sw.t - t0 < 200;
      S.stumps[0] = { dir: 0.3 };
      sfx.stumps(); this.hitStop(fast ? 160 : 80);
      this.fx.word('STUMPED!', this.W / 2, this.H * 0.3, { size: fast ? 80 : 66, color: '#fff4da', stroke: '#e8343b' });
      await this.sleepReal(this.bot ? 100 : 1000);
      this.phase = 'bowl';
      return 'stumped';
    }
    this.fx.word('MADE HIS GROUND', this.W / 2, this.H * 0.3, { size: 40 });
    await this.sleepReal(this.bot ? 100 : 800);
    this.phase = 'bowl';
    return 'missed';
  }

  // ---------- Outfield Mode ----------
  controlledLook() { return this.team.field.id === 'bilal' ? this.team.field.look : teamLook(this.myTeam); }

  startEvent(field, fielderId) {
    const fs = this.setupOutfield(field, 'player');
    const me = fs.find(f => f.id === fielderId);
    me.look = this.controlledLook(); me.emblem = this.team.field.id === 'bilal' ? this.team.field.emblem : null; me.ctrl = true;
    this.phase = 'event';
    this.powerLock = false;
    this.eventAllowsBurst = true;
    this.refreshPowers();
    return me;
  }

  endEvent() { this.phase = 'bowl'; this.eventAllowsBurst = false; this.armed.burst = false; this.timeScale = 1; this.O.ring = null; this.refreshPowers(); }

  moveFielder(me, target, dt, speed) {
    const d = dist(me, target);
    const step = Math.min(d, speed * dt);
    if (d > 0.01) { me.x += (target.x - me.x) / d * step; me.y += (target.y - me.y) / d * step; }
    me.pose = d > 0.3 ? POSES.run(this.gameTime * 14) : POSES.crouch();
    return d - step;
  }

  async catchEvent(sim, field) {
    const c = sim.catch, path = sim.path, L = c.point, T = path.T;
    const me = this.startEvent(field, c.fielder.id);
    this.fx.word('CATCH IT!', this.W / 2, this.H * 0.2, { size: 50, dur: 1000 });
    this.timeScale = 0.6;
    const t0 = this.gameTime;
    let last = this.gameTime, input = null, prompted = false;
    this.onInput = (type, g) => {
      if (input || type !== 'up') return;
      const isSwipe = Math.hypot(g.dx, g.dy) > 28;
      input = { tg: this.realToGame(isSwipe ? g.t : g.t0), isSwipe, dx: g.dx, dy: g.dy };
    };
    if (this.bot) this.sleep((T + makeRng(T * 1000).normal() * 0.05) * 1000).then(() => this.botInput('up', { dx: 0, dy: 0 })).catch(() => {});
    let gap = 99;
    await this.until(() => {
      const t = this.gameTime - t0, dt = this.gameTime - last; last = this.gameTime;
      const speed = F.catchRun * (this.armed.burst ? 2 : 1);
      if (t > F.catchReact && t <= T) gap = this.moveFielder(me, L, dt, speed);
      else if (t <= F.catchReact) gap = dist(me, L);
      const b = path.ballAt(Math.min(t, T));
      this.O.ball = b;
      const k = clamp((T - t) / T, 0, 1);
      this.O.ring = { x: L.x, y: L.y, r: 0.5 + 6 * k, color: Math.abs(T - t) < 0.12 ? '#2ecc71' : '#fff4da' };
      this.O.marks = [{ x: L.x, y: L.y }];
      this.of.focus([b, me, L]);
      if (!prompted && t > T - 1.1) {
        prompted = true;
        const predicted = Math.max(0, dist(me, L) - speed * Math.max(0, T - t));
        this.ui.hint(predicted <= F.reach ? 'TAP AS THE RING CLOSES!' : predicted <= F.reach + F.diveReach ? 'SWIPE TO DIVE!' : 'TOO FAR — DIVE!');
      }
      return t >= T && (input || t >= T + 0.2);
    });
    this.onInput = null; this.ui.hint(null);
    gap = dist(me, L);
    let result = 'dropped';
    if (input) {
      const errReal = ((input.tg - (t0 + T)) * 1000) / 0.6;
      let reachOk = gap <= F.reach + (input.isSwipe ? F.diveReach : 0);
      if (input.isSwipe) {
        const ms = this.of.to(me.x, me.y), ls = this.of.to(L.x, L.y);
        if (gap > 0.6 && angDiff(Math.atan2(ls.y - ms.y, ls.x - ms.x), Math.atan2(input.dy, input.dx)) > 50 * Math.PI / 180) reachOk = false;
        me.pose = POSES.dive(Math.sign(L.x - me.x) || 1);
      }
      if (reachOk && Math.abs(errReal) <= F.catchPerfect) result = input.isSwipe ? 'dive' : 'caught';
      else if (reachOk && Math.abs(errReal) <= F.catchGood) result = 'juggle';
      else if (!reachOk) this.fx.word('NEEDED A DIVE!', this.W / 2, this.H * 0.3, { size: 40 });
      else this.fx.word(errReal < 0 ? 'TOO EARLY!' : 'TOO LATE!', this.W / 2, this.H * 0.3, { size: 40 });
      if (result === 'juggle') {
        sfx.glove();
        this.fx.word('JUGGLE! TAP!', this.W / 2, this.H * 0.3, { size: 48, dur: 600 });
        let tap = null;
        this.onInput = (type, g) => { if (type === 'down') tap = g; };
        if (this.bot) this.sleepReal(150).then(() => this.botInput('down')).catch(() => {});
        const tj = this.realTime;
        await this.until(() => tap || this.realTime - tj > F.rejuggleMs);
        this.onInput = null;
        result = tap ? (input.isSwipe ? 'dive' : 'caught') : 'dropped';
      }
    }
    const p = this.of.to(me.x, me.y);
    if (result !== 'dropped') {
      this.O.ball = { x: me.x, y: me.y, h: 1.4 };
      me.pose = POSES.celebrate();
      this.hitStop(120); sfx.glove(); buzz(60);
      this.fx.burst(p.x, p.y - 30, { color: '#ffd23f' });
      this.fx.word(result === 'dive' ? 'GOTCHA!' : 'CAUGHT!', p.x, p.y - 60, { size: 64 });
    } else {
      this.O.ball = { x: L.x, y: L.y, h: 0 };
      this.fx.word('BUTTERFINGERS!', p.x, p.y - 50, { size: 52 });
      sfx.trombone();
    }
    await this.sleepReal(this.bot ? 100 : 1000);
    this.endEvent();
    return result;
  }

  async runOutEvent(sim, field) {
    const ro = sim.runOut, path = sim.path;
    const me = this.startEvent(field, ro.fielder.id);
    this.fx.word('RUN OUT CHANCE!', this.W / 2, this.H * 0.2, { size: 46, dur: 1000 });
    this.timeScale = 0.7;
    const t0 = this.gameTime, P = ro.point;
    let last = this.gameTime;
    let pick = null;
    this.onInput = (type, g) => { if (type === 'down' && !pick) pick = { tg: this.realToGame(g.t) }; };
    if (this.bot) this.sleep(ro.t * 1000).then(() => this.botInput('down')).catch(() => {});
    this.ui.hint('TAP TO PICK UP');
    await this.until(() => {
      const t = this.gameTime - t0, dt = this.gameTime - last; last = this.gameTime;
      const speed = F.runSpeed * (this.armed.burst ? 2 : 1);
      if (t > F.react) this.moveFielder(me, P, dt, speed);
      this.O.ball = path.ballAt(Math.min(t, ro.t));
      this.O.ring = { x: P.x, y: P.y, r: 0.6 + 4 * clamp((ro.t - t) / ro.t, 0, 1), color: Math.abs(ro.t - t) < 0.14 ? '#2ecc71' : '#fff4da' };
      this.runBatters(t, ro.attempt);
      this.of.focus([this.O.ball, me, { x: 0, y: 0 }, { x: 0, y: 20 }]);
      return t >= ro.t + 0.25 || (pick && t >= ro.t);
    });
    this.onInput = null; this.ui.hint(null);
    let fumble = 0;
    const pickErr = pick ? Math.abs((pick.tg - (t0 + ro.t)) * 1000) / 0.7 : 999;
    if (pickErr > F.collectWindow) { fumble = 0.6; this.fx.word('FUMBLE!', this.W / 2, this.H * 0.3, { size: 44 }); }
    else this.fx.word('CLEAN PICK-UP', this.W / 2, this.H * 0.25, { size: 32, color: '#fff4da', stroke: INK });
    me.x = P.x; me.y = P.y; this.O.ball = { x: P.x, y: P.y, h: 0.8 };

    // throw
    const margins = runOutMargins(ro.t + fumble, P, ro.attempt - 1);
    const pOut = m => Math.round(100 / (1 + Math.exp(m * 5)));
    this.O.ends = [{ id: 'striker', ...ENDS.striker, pct: pOut(margins.striker) }, { id: 'bowler', ...ENDS.bowler, pct: pOut(margins.bowler) }];
    this.O.ring = null;
    this.timeScale = 0.25;
    this.fx.speed = 0.8;
    this.ui.hint('SWIPE AT THE STUMPS!');
    let sw = null;
    const ts = this.realTime;
    this.onInput = (type, g) => { if (type === 'up' && !sw && Math.hypot(g.dx, g.dy) > 30) sw = g; };
    if (this.bot) this.sleepReal(400).then(() => {
      const end = margins.striker < margins.bowler ? ENDS.striker : ENDS.bowler;
      const a = this.of.to(me.x, me.y), b = this.of.to(end.x, end.y);
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1, e = makeRng(ts).normal() * 0.08;
      const ang = Math.atan2(b.y - a.y, b.x - a.x) + e;
      this.botInput('up', { dx: Math.cos(ang) * 150, dy: Math.sin(ang) * 150, t0: this.realTime - 120 });
      return len;
    }).catch(() => {});
    const tCollect = this.gameTime;
    await this.until(() => {
      const t = ro.t + fumble + (this.gameTime - tCollect);
      this.runBatters(t, ro.attempt);
      return sw || this.realTime - ts > 2500;
    });
    this.onInput = null; this.ui.hint(null); this.fx.speed = 0;
    const relay = !!this.armed.relay;
    const ms = this.of.to(me.x, me.y);
    let endId = margins.striker < margins.bowler ? 'striker' : 'bowler', direct = false, extra = 0.8, wild = false;
    if (sw) {
      const got = Math.atan2(sw.dy, sw.dx);
      const errs = ['striker', 'bowler'].map(id => { const s = this.of.to(ENDS[id].x, ENDS[id].y); return { id, e: angDiff(Math.atan2(s.y - ms.y, s.x - ms.x), got) }; }).sort((a, b) => a.e - b.e);
      endId = errs[0].id;
      const inner = (relay ? 15 : 6) * Math.PI / 180, outer = (relay ? 32 : 16) * Math.PI / 180;
      const speedPx = Math.hypot(sw.dx, sw.dy) / Math.max(40, sw.t - sw.t0);
      const d = dist(P, ENDS[endId]);
      if (errs[0].e <= inner) { direct = true; extra = 0; }
      else if (errs[0].e <= outer) extra = 0.3;
      else wild = true;
      if (d > 35 && speedPx < 0.5) extra += 0.4;
      if (d < 15 && speedPx > 3) wild = true;
    }
    if (relay) { this.armed.relay = false; this.fx.word('ZZZAP!', ms.x, ms.y - 40, { size: 60, color: '#ffd23f', stroke: INK }); sfx.zap(); }
    const throwDist = dist(P, ENDS[endId]);
    const margin = margins[endId] + extra; // + = batter safe
    const out = !wild && margin < 0;
    // animate the throw
    this.timeScale = 0.5;
    const flight = throwDist / F.throwSpeed;
    const tf0 = this.gameTime;
    const E = ENDS[endId];
    await this.until(() => {
      const p = Math.min(1, (this.gameTime - tf0) / Math.max(0.15, flight));
      this.O.ball = wild ? { x: lerp(P.x, E.x + 8, p), y: lerp(P.y, E.y - 6, p), h: 1.2 } : { x: lerp(P.x, E.x, p), y: lerp(P.y, E.y, p), h: 1.2 * Math.sin(p * Math.PI) * 0.6 + 0.4 };
      this.runBatters(ro.t + fumble + 0.5 + (this.gameTime - tf0), ro.attempt);
      this.of.focus([this.O.ball, E, me]);
      return p >= 1;
    });
    this.timeScale = 1;
    this.O.ends = null;
    const es = this.of.to(E.x, E.y);
    if (out) {
      this.hitStop(150); sfx.stumps(); this.fx.shake(12);
      this.fx.burst(es.x, es.y, { color: '#ffd23f' });
      this.fx.word(direct ? 'DIRECT HIT!' : 'RUN OUT!', es.x, es.y - 50, { size: 62 });
      this.ui.banner('OUT!', `by ${Math.abs(margin).toFixed(2)}s`, 1500);
    } else {
      this.fx.word(wild ? 'WILD THROW!' : 'SAFE!', es.x, es.y - 40, { size: 52, color: '#fff4da', stroke: INK });
      this.ui.banner('NOT OUT', wild ? 'Overthrow: +1 run' : `by ${margin.toFixed(2)}s`, 1400);
    }
    await this.sleepReal(this.bot ? 100 : 1200);
    this.endEvent();
    return { out, runs: out ? ro.attempt - 1 : ro.attempt + (wild ? 1 : 0), long: throwDist > 40 && direct, margin };
  }

  async saveEvent(sim, field) {
    const s = sim.save, path = sim.path;
    const me = this.startEvent(field, s.fielder.id);
    this.fx.word('SAVE IT!', this.W / 2, this.H * 0.2, { size: 50, dur: 900 });
    this.timeScale = 0.6;
    const t0 = this.gameTime, P = s.point;
    let last = this.gameTime, input = null;
    this.ui.hint('SWIPE TO DIVE AT THE ROPE!');
    this.onInput = (type, g) => { if (type === 'up' && !input) input = { tg: this.realToGame(g.t), len: Math.hypot(g.dx, g.dy) }; };
    if (this.bot) this.sleep(s.t * 1000).then(() => this.botInput('up', { dx: 60, dy: -60 })).catch(() => {});
    await this.until(() => {
      const t = this.gameTime - t0, dt = this.gameTime - last; last = this.gameTime;
      if (t > F.react) this.moveFielder(me, P, dt, F.runSpeed * (this.armed.burst ? 2 : 1));
      this.O.ball = path.ballAt(Math.min(t, s.t));
      this.O.ring = { x: P.x, y: P.y, r: 0.6 + 5 * clamp((s.t - t) / s.t, 0, 1), color: Math.abs(s.t - t) < 0.15 ? '#2ecc71' : '#fff4da' };
      this.of.focus([this.O.ball, me, P]);
      return t >= s.t && (input || t >= s.t + 0.2);
    });
    this.onInput = null; this.ui.hint(null);
    const reachOk = dist(me, P) <= F.reach + F.diveReach;
    const err = input ? Math.abs((input.tg - (t0 + s.t)) * 1000) / 0.6 : 999;
    const saved = reachOk && input && input.len > 28 && err <= 150;
    me.pose = POSES.dive(Math.sign(P.x - me.x) || 1);
    const p = this.of.to(P.x, P.y);
    if (saved) { this.O.ball = { x: me.x, y: me.y, h: 0.2 }; this.fx.word('SAVED!', p.x, p.y - 50, { size: 60 }); sfx.glove(); this.hitStop(100); }
    else { this.fx.word('FOUR!', p.x, p.y - 50, { size: 60, color: '#3ec6ff', stroke: INK }); sfx.crowd(0.6); }
    await this.sleepReal(this.bot ? 100 : 1000);
    this.endEvent();
    return saved;
  }

  // ---------- Issue #1: the tutorial over ----------
  async runTutorial() {
    const inn = new Innings('player', 14);
    inn.balls = 27; inn.runs = 0; inn.log = [];
    this.innings.push(inn);
    this.phase = 'bat';
    this.charge.value = 40; this.ui.charge(40);
    this.hud(inn);
    this.ui.banner('ISSUE #1', `${this.team.bat.name} needs 14 off the last 3 balls`, 2200);
    await this.sleepReal(this.bot ? 100 : 2200);
    const straight = { x: 0.02, length: 'full', kmh: 128, swing: 0.02, move: 0, type: 'Half-volley' };
    const assistHit = (res, grade) => {
      if (res.outcome === 'hit' || grade === 'perfect' || grade === 'good' || grade === 'early' || grade === 'late') {
        const six = grade === 'perfect' && res.loft;
        return { ...res, outcome: 'hit', angle: res.angle ?? 0, loft: six, launchDeg: six ? 34 : 0, v: 34, forced: six ? { six: true } : { four: true, uncatchable: true } };
      }
      return null;
    };
    // balls 1 and 2: assisted, replayed once if missed
    for (const [i, slow, extra] of [[1, 0.5, 120], [2, 1, 60]]) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const before = inn.balls;
        const runsBefore = inn.runs;
        const curBefore = { ...inn.cur }, stintsBefore = [...inn.stints];
        const out = { v: false };
        await this.batBall(inn, inn.balls + 1, straight, {
          slow, extra, assist: assistHit, onOut: () => { out.v = true; },
          hint: i === 1 ? 'HOLD · SWIPE UP · LIFT ON THE RING' : 'SAME AGAIN — TIME IT!',
        });
        if (inn.runs > runsBefore || attempt === 1) break;
        // can't be lost: undo the miss and replay once
        inn.balls = before; inn.runs = runsBefore; inn.log.pop(); if (out.v) inn.wkts--;
        inn.cur = curBefore; inn.stints = stintsBefore;
        this.ui.banner(`${this.team.bat.name.toUpperCase()} GOT LUCKY!`, 'Try that one again', 1400);
        await this.sleepReal(this.bot ? 100 : 1400);
      }
      this.hud(inn);
    }
    // ball 3: the power
    if (this.charge.value < 60) this.charge.add(60 - this.charge.value, 'CROWD ROAR');
    this.ui.banner('THE METER IS FULL ENOUGH!', `Tap ${this.team.bat.name} to fire ${this.team.bat.power.name}`, 0);
    await this.batBall(inn, inn.balls + 1, straight, {
      extra: 120,
      hint: `TAP ${this.team.bat.name.split(' ')[0].toUpperCase()}!`,
      waitPower: async () => {
        if (this.bot) this.sleepReal(200).then(() => this.activate('bat')).catch(() => {});
        await this.until(() => this.armed.thunder || this.armed.meteor || this.armed.mirror > 0);
        this.ui.clearBanner();
        this.ui.hint('NOW SWIPE UP AND LIFT!');
      },
      assist: (res, grade) => (res.outcome === 'hit' ? null : assistHit(res, grade === 'miss' ? 'late' : grade)),
    });
    this.hud(inn);

    // the defence: one ball, they need 4
    this.phase = 'bowl';
    const def = new Innings('ai', 5);
    def.balls = 29; def.runs = 1; def.log = [];
    this.innings.push(def);
    this.bowlHistory = []; this.aiPowerBalls = new Set(); this.freeHit = false;
    this.fieldState.setting = 'all';
    this.tutorialKeeper = { window: 600, approach: 1100 };
    this.hud(def);
    this.ui.banner('NOW DEFEND IT!', 'They need 4 off the last ball', 2000);
    await this.sleepReal(this.bot ? 100 : 2000);
    for (let attempt = 0; attempt < 3; attempt++) {
      const before = { balls: def.balls, runs: def.runs, wkts: def.wkts };
      const r = await this.bowlBall(def, 30, {
        scripted: true, stance: 'normal', glow: { lane: 'stumps', length: 'yorker' },
        hint: attempt ? 'SWIPE UP TO THE GLOWING ZONE' : 'SWIPE FROM YOUR BOWLER UP TO THE GLOWING ZONE',
        forceRelease: rg => (rg === 'bad' ? 'loose' : rg),
        spec: { length: 'yorker', bounce: 1.1, h: 0.14, x: 0 },
        forceAi: (d, ai) => (attempt < 2
          ? { ...ai, res: { outcome: 'edge', grade: 'edge', offset: { x: attempt ? 0.3 : 1.0, y: 0.7 } } }
          : { ...ai, res: { outcome: 'bowled', grade: 'miss' } }),
      });
      if (r?.rebowl) continue;
      if (def.wkts > before.wkts) break;
      Object.assign(def, before); def.log = [];
      this.ui.banner(attempt ? 'ONE LAST CHANCE' : `${this.team.field.id === 'rani' ? 'RANI' : 'THE KEEPER'} GETS ANOTHER GO!`, 'Same ball again', 1500);
      await this.sleepReal(this.bot ? 100 : 1500);
    }
    this.tutorialKeeper = null;
    this.ui.banner('YOU WON ISSUE #1!', 'Your first superhero win', 2000);
    sfx.crowd(1.4);
    await this.sleepReal(this.bot ? 100 : 1800);
    const sorted = [...this.moments].sort((x, y) => y.score - x.score);
    if (!sorted.length) sorted.push({ kind: 'powerSix', title: `YOUR FIRST ${this.team.bat.power.name.toUpperCase()}!`, word: this.team.bat.power.word, heroId: this.team.bat.id, score: 70 });
    return { mode: 'tutorial', innings: this.innings, result: { outcome: 'win', text: 'Issue #1 complete — the over is won!' }, moments: sorted, team: this.team, rival: this.rival, seed: this.seed, stats: this.stats };
  }

  // ---------- rendering ----------
  render() {
    const { ctx, W, H } = this;
    const [ox, oy] = this.fx.offset();
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.translate(ox, oy);
    if (this.view === 'fieldedit' && this.E) this.renderFieldEditor();
    else if (this.view === 'outfield' && this.O) this.renderOutfield();
    else if (this.view === 'bat' || this.view === 'bowl' || this.view === 'keeper') this.render3D(this.view);
    else this.renderIdle();
    ctx.restore();
    this.fx.draw(ctx, W, H);
    this.cutin.draw(ctx, W, H, this.realTime);
    if (this.cutin.busy !== this.cutinShown) { this.cutinShown = this.cutin.busy; document.getElementById('hud').classList.toggle('cutin-on', this.cutinShown); }
  }

  renderIdle() {
    const cam = this.cams.bat;
    drawBackground(this.ctx, cam);
    drawBoard(this.ctx, cam, this.realTime);
  }

  ballPos() {
    const S = this.S;
    if (S.delivery) {
      const t = this.gameTime - S.ballT0;
      if (t < 0) return null;
      const p = S.delivery.pos(t);
      if (S.afterOff) p.x += S.afterOff;
      return p;
    }
    if (S.flight) {
      const t = this.gameTime - S.flight.t0, f = S.flight;
      const y = f.p0.y + f.vy * t - 4.9 * t * t;
      return { x: f.p0.x + f.vx * t, y: Math.max(0.03, y), z: f.p0.z + f.vz * t };
    }
    if (S.kball) {
      const k = S.kball;
      const p = clamp((this.realTime - k.t0) / k.dur, 0, k.miss ? 1.6 : 1);
      if (k.done && p >= 1) return null;
      return { x: lerp(k.from.x, k.to.x, p), y: lerp(k.from.y, k.to.y, p) + Math.sin(Math.min(p, 1) * Math.PI) * 0.15, z: lerp(k.from.z, k.to.z, p) };
    }
    return null;
  }

  render3D(kind) {
    const ctx = this.ctx, S = this.S, cam = this.cams[kind];
    drawBackground(ctx, cam);
    drawBoard(ctx, cam, this.realTime, this.realTime < this.boardUntil ? this.boardMsg : null);
    const items = [];
    const push = (z, fn) => items.push({ d: cam.depth(z), fn });

    for (const f of S.field3d || []) {
      push(f.y, () => {
        const p = kind !== 'keeper' && cam.project(f.x, 0, f.y);
        if (p && drawBowlSprite(ctx, p.x, p.y, p.k, 'field', kind === 'bat' ? this.oppTeam : this.myTeam, f.x > 0, kind === 'bat' ? 'front' : 'back')) return;
        drawFigure3D(ctx, cam, f.x, f.y, teamLook(kind === 'bat' ? this.oppTeam : this.myTeam, f.x > 0 ? 1 : 0), POSES.crouch(), { noShadow: false });
      });
    }
    push(20, () => drawStumps(ctx, cam, 20, S.stumps[20]));
    push(0, () => drawStumps(ctx, cam, 0, S.stumps[0], S.stumpGlow ? '#e8343b' : null));

    // bowler
    if (kind !== 'keeper') {
      let bx = S.bowler.x, bz = S.bowler.z;
      if (kind === 'bowl' && S.bowler.followT0 != null) {
        const p = clamp((this.realTime - S.bowler.followT0) / 600, 0, 1);
        bx += 0.45 * p; bz -= 1.6 * p; // carries on down the pitch, veering away from the stumps
      }
      // facing the batting camera the bowler is the hand-drawn sprite, carrying on a stride after release
      if (kind === 'bat' && S.bowler.spr?.anim === 'deliver') bz -= 0.9 * clamp((this.gameTime - S.bowler.spr.t0) / 0.6, 0, 1);
      push(bz, () => {
        const view = kind === 'bat' ? 'front' : 'back', p = cam.project(bx, 0, bz);
        if (p && drawBowlSprite(ctx, p.x, p.y, p.k, bowlFrame(S.bowler.spr, this.gameTime, this.realTime, view), kind === 'bat' ? this.oppTeam : this.myTeam, false, view)) return;
        drawFigure3D(ctx, cam, bx, bz, S.bowler.look || AI_LOOK, S.bowler.pose, { back: kind === 'bowl', emblem: S.bowler.emblem });
      });
    }
    // batter with swing animation
    const b = S.batter;
    let angle = b.angle;
    if (b.swingT0 != null) {
      const p = clamp((this.realTime - b.swingT0) / 260, 0, 1);
      angle = lerp(-2.5, 2.4, p);
    }
    const batterBack = kind !== 'bowl';
    if (b.anim === 'celebrate' && !batterBack) push(b.z, () => drawFigure3D(ctx, cam, b.x, b.z, b.look || AI_LOOK, POSES.celebrate(), { back: batterBack, emblem: b.emblem, helmet: true }));
    else push(b.z, () => {
      // seen from behind, the batter is the hand-drawn sprite; from the front (bowling view) the drawn figure
      const p = batterBack && cam.project(b.x, 0, b.z);
      if (p && drawBatSprite(ctx, p.x, p.y, p.k, { ...b, look: b.look || AI_LOOK }, this.realTime, { glow: b.glow })) return;
      // from the bowling camera, the opposing batter's hand-drawn front view
      const q = !batterBack && cam.project(b.x, 0, b.z);
      if (q && drawBowlSprite(ctx, q.x, q.y, q.k, batFrame(b, this.realTime).f, this.oppTeam, false, 'batfront')) return;
      drawFigure3D(ctx, cam, b.x, b.z, b.look || AI_LOOK, POSES.bat(angle), { back: batterBack, flip: !batterBack, emblem: b.emblem, batGlow: b.glow, helmet: true });
    });
    // keeper
    if (kind !== 'bat') {
      const k = S.keeper;
      push(k.z, () => drawFigure3D(ctx, cam, k.x, k.z, k.look || AI_LOOK, k.pose, { back: kind === 'keeper', emblem: k.emblem }, 1.75));
    }
    // ball(s)
    const bp = this.ballPos();
    if (bp) {
      S.trail.push(bp); if (S.trail.length > 7) S.trail.shift();
      if (S.maya && S.delivery) {
        const t = this.gameTime - S.ballT0, d = S.delivery;
        const split = d.bounceT != null ? clamp((t - d.bounceT * 0.6) / 0.25, 0, 1) : clamp(t / 0.4, 0, 1);
        const shimmer = t > d.tContact - 0.45;
        S.mayaScreen = {};
        for (const side of [-1, 1]) {
          const p = { ...bp, x: bp.x + side * 0.45 * split };
          const real = side === S.maya.real;
          push(p.z - 0.001 * side, () => {
            const s = drawBall3D(ctx, cam, p, { glow: real && shimmer ? '#ffd23f' : S.maya.picked === side ? '#3ec6ff' : null, ghost: !real });
            if (s) S.mayaScreen[side] = s;
          });
        }
        if (split > 0.5 && !S.maya.picked && kind === 'bat') this.ui.hint('TAP THE REAL BALL!');
      } else {
        const bending = S.bendT && this.realTime - S.bendT < 150;
        push(bp.z, () => drawBall3D(ctx, cam, bp, { trail: S.trail, glow: bending ? '#3ec6ff' : S.batter.glow && S.flight ? S.batter.glow : null }));
      }
    } else S.trail = [];

    if (kind === 'bowl') this.drawPitchOverlays(cam);
    items.sort((a, b2) => b2.d - a.d);
    for (const it of items) it.fn();
    if (kind === 'bowl') this.drawBowlOverlay(cam);

    // timing ring (batting)
    if (kind === 'bat' && S.ring && S.delivery) this.drawTimingRing(cam);
    if ((kind === 'bat' || kind === 'bowl') && S.field3d && !S.delivery && !S.flight) this.drawFieldMap(S.field3d, kind);
    if (kind === 'keeper' && S.reticle) this.drawReticle(cam);
    if (S.frozen) { ctx.fillStyle = 'rgba(62,198,255,0.15)'; ctx.fillRect(0, 0, this.W, this.H); }
  }

  // Top-down field map. Batting: their field (tap to enlarge). Bowling: yours (tap to move fielders).
  mapRect() {
    const big = this.mapBig && this.view === 'bat';
    const w = big ? Math.min(this.W - 32, 320) : 92, h = w * 1.12;
    const x = big ? (this.W - w) / 2 : this.W - w - Math.max(12, this.W * 0.03);
    const y = big ? this.H * 0.18 : 128;
    return { x, y, w, h };
  }
  inMap(g) {
    const r = this.mapRect();
    return (this.view === 'bat' || this.view === 'bowl') && g.x >= r.x - 6 && g.x <= r.x + r.w + 6 && g.y >= r.y - 6 && g.y <= r.y + r.h + 22;
  }

  drawFieldMap(fielders, kind) {
    const ctx = this.ctx, { x, y, w, h } = this.mapRect();
    const big = w > 150;
    const R0 = CFG.ground.boundaryR, k = (w / 2 - 6) / R0;
    const cx = x + w / 2, cy = y + h / 2;
    const ML = { cx, cy, R: R0 * k };
    const P = (fx, fy) => fisheyeTo(ML, fx, fy);
    ctx.save();
    ctx.fillStyle = 'rgba(16,22,50,0.9)'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#23853f'; ctx.strokeStyle = '#fff4da'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, R0 * k, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(cx, cy, fishRadius(ML, 27), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    const a = P(-1.5, 21), b = P(1.5, -1);
    ctx.fillStyle = '#d8b878'; ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    const color = kind === 'bat' ? '#e8343b' : '#3ec6ff';
    ctx.font = `600 ${big ? 10 : 8}px "Baloo 2", system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (const f of fielders) {
      const p = P(f.x, f.y);
      ctx.fillStyle = color; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, big ? 5 : 3.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (big) { ctx.fillStyle = '#fff4da'; ctx.fillText(f.name, p.x, p.y + 6); }
    }
    const bat = P(0, 0);
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(bat.x, bat.y, big ? 4 : 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.font = `${big ? 15 : 11}px "Bangers", Impact, sans-serif`; ctx.textBaseline = 'top'; ctx.fillStyle = '#fff4da';
    ctx.fillText(kind === 'bat' ? (big ? 'THEIR FIELD · TAP TO CLOSE' : 'THEIR FIELD') : 'TAP TO SET', cx, y + h + 3);
    if (big) {
      ctx.font = `600 10px "Baloo 2", system-ui, sans-serif`; ctx.fillStyle = 'rgba(255,244,218,0.8)';
      ctx.textBaseline = 'bottom';
      ctx.fillText('OFF SIDE →', x + w - 34, y + h - 4);
      ctx.fillText('← LEG SIDE', x + 34, y + h - 4);
    }
    ctx.restore();
  }

  drawTimingRing(cam) {
    const ctx = this.ctx, S = this.S, d = S.delivery;
    const t = this.gameTime - S.ballT0;
    const c = d.atContact;
    const s = cam.project(c.x, c.y, c.z);
    if (!s) return;
    const r0 = Math.max(16, 0.22 * s.k);
    const left = d.tContact - t;
    if (left < -0.3) return;
    const r = r0 * (1 + Math.max(0, left) / 0.45);
    const near = Math.abs(left) < (CFG.timing.perfect + CFG.touchSlackMs) / 1000;
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(20,16,24,0.6)';
    ctx.beginPath(); ctx.arc(s.x, s.y, r0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = S.ring.meteor ? '#ff7a1a' : near ? '#2ecc71' : '#fff4da';
    ctx.lineWidth = near ? 5 : 3;
    ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  drawReticle(cam) {
    const ctx = this.ctx, R = this.S.reticle;
    const s = cam.project(R.x, R.y, R.z);
    if (!s) return;
    const pulse = 1 + Math.sin(this.realTime / 80) * 0.08;
    ctx.save();
    ctx.strokeStyle = R.elastic ? '#ffe14d' : '#fff4da'; ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.arc(s.x, s.y, 30 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(s.x - 12, s.y); ctx.lineTo(s.x + 12, s.y); ctx.moveTo(s.x, s.y - 12); ctx.lineTo(s.x, s.y + 12); ctx.stroke();
    // closing ring: act when it meets the target
    const p = (this.realTime - R.t0) / R.dur;
    if (p < 1.15) {
      const near = Math.abs(1 - p) * R.dur <= F.keeperClean;
      ctx.strokeStyle = near ? '#5dff8a' : '#ffd23f'; ctx.lineWidth = near ? 5 : 4;
      ctx.beginPath(); ctx.arc(s.x, s.y, 30 + Math.max(0, 1 - p) * 110, 0, Math.PI * 2); ctx.stroke();
    }
    if (R.needSwipe) {
      const h = cam.project(0.3, 0.55, -2.4);
      if (h) {
        ctx.strokeStyle = 'rgba(255,210,63,0.8)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        const a = Math.atan2(s.y - h.y, s.x - h.x);
        const ex = h.x + Math.cos(a) * 70, ey = h.y + Math.sin(a) * 70;
        ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - Math.cos(a - 0.5) * 16, ey - Math.sin(a - 0.5) * 16);
        ctx.moveTo(ex, ey); ctx.lineTo(ex - Math.cos(a + 0.5) * 16, ey - Math.sin(a + 0.5) * 16); ctx.stroke();
      }
    }
    ctx.restore();
  }

  groundQuad(cam, x0, x1, z0, z1, fill, stroke) {
    const ctx = this.ctx;
    const pts = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => cam.project(x, 0, z));
    if (pts.some(p => !p)) return;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }

  // Length bands while aiming, the scouted weak spot and the tutorial target, drawn on the pitch.
  drawPitchOverlays(cam) {
    const S = this.S;
    if (S.aim) {
      const colors = { bouncer: 'rgba(255,138,138,0.28)', short: 'rgba(255,179,122,0.26)', good: 'rgba(155,229,155,0.26)', full: 'rgba(255,226,122,0.28)', yorker: 'rgba(184,224,255,0.3)' };
      for (const [id, [b0, b1]] of Object.entries(BOUNCE_RANGES)) this.groundQuad(cam, -1.5, 1.5, b0, b1, S.aim.length === id ? colors[id].replace(/0\.\d+\)$/, '0.55)') : colors[id]);
    }
    if (S.weak) {
      const lanes = S.weak.lanes || ['wideoff', 'off', 'stumps', 'leg', 'wideleg'];
      const pulse = 0.22 + 0.1 * Math.sin(this.realTime / 200);
      for (const len of S.weak.lengths) {
        const zr = BOUNCE_RANGES[len];
        if (!zr) continue;
        for (const l of lanes) { const xr = LANE_RANGES[l]; this.groundQuad(cam, xr[0], xr[1], zr[0], zr[1], `rgba(232,52,59,${pulse.toFixed(2)})`); }
      }
    }
    if (S.glowZone) {
      const zr = BOUNCE_RANGES[S.glowZone.length], xr = LANE_RANGES[S.glowZone.lane];
      this.groundQuad(cam, xr[0], xr[1], zr[0], zr[1], `rgba(255,210,63,${(0.45 + 0.25 * Math.sin(this.realTime / 150)).toFixed(2)})`, '#ffd23f');
      const c = cam.project((xr[0] + xr[1]) / 2, 0, (zr[0] + zr[1]) / 2);
      if (c && !S.delivery) {
        const ctx = this.ctx, bob = Math.sin(this.realTime / 160) * 4;
        ctx.save();
        ctx.font = `22px ${'"Bangers", Impact, sans-serif'}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.strokeText('AIM HERE', c.x + 70, c.y - 30 + bob);
        ctx.fillStyle = '#ffd23f'; ctx.fillText('AIM HERE', c.x + 70, c.y - 30 + bob);
        ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(c.x + 50, c.y - 28 + bob); ctx.lineTo(c.x + 8, c.y - 4); ctx.stroke();
        ctx.restore();
      }
    }
    if (S.aim) {
      const b = S.aim.bounce ?? 0.4;
      const p = cam.project(S.aim.x, 0, b);
      if (p) {
        const ctx = this.ctx;
        const r = Math.max(7, 0.22 * p.k);
        ctx.strokeStyle = INK; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#fff4da'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }

  drawBowlOverlay() {
    const ctx = this.ctx, S = this.S;
    // the swipe trail, coloured by pace
    if (this.bowlTrail && this.bowlTrail.length > 1 && S.aim) {
      const band = S.aim.speedP < PACE.slower ? '#b8e0ff' : S.aim.speedP < PACE.good ? '#fff4da' : S.aim.speedP <= PACE.perfect ? '#2ecc71' : S.aim.speedP <= PACE.spray ? '#ff9f1c' : '#e8343b';
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const [w, c] of [[11, INK], [6, band]]) {
        ctx.strokeStyle = c; ctx.lineWidth = w;
        ctx.beginPath(); this.bowlTrail.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
      }
      ctx.restore();
      // read-out next to the finger
      const last = this.bowlTrail[this.bowlTrail.length - 1];
      const weak = S.weak && S.weak.lengths.includes(S.aim.length) && (!S.weak.lanes || S.weak.lanes.includes(laneFor(S.aim.x)));
      const txt = `${LENGTH_LABEL[S.aim.length]} · ${S.aim.slower ? S.aim.type : S.aim.type}${weak ? ' · WEAK SPOT' : ''}`;
      ctx.font = `600 14px ${'"Baloo 2", system-ui, sans-serif'}`;
      const w = ctx.measureText(txt).width + 16;
      const x = clamp(last.x - w / 2, 8, this.W - w - 8), y = Math.max(this.H * 0.3, last.y - 64);
      ctx.fillStyle = weak ? '#e8343b' : '#fff4da'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(x, y, w, 24, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = weak ? '#fff4da' : INK; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.fillText(txt, x + 8, y + 12.5);
      this.drawPaceBar(S.aim.speedP);
    }
    // aftertouch budget while the ball is in the air
    if (S.delivery && S.afterBudget && this.gameTime - S.ballT0 < (S.delivery.bounceT ?? S.delivery.tContact * 0.55)) {
      const w = 160, x = this.W / 2 - w / 2, y = this.H - 205;
      const used = Math.abs(S.afterOff || 0) / S.afterBudget;
      ctx.fillStyle = 'rgba(16,22,50,0.85)'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(x, y, w, 12, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3ec6ff'; ctx.fillRect(x + 2, y + 2, (w - 4) * (1 - used), 8);
    }
  }

  drawPaceBar(p) {
    const ctx = this.ctx;
    const w = Math.min(300, this.W - 40), x = (this.W - w) / 2, y = this.H - 215, h = 14;
    const max = 1.6, X = v => x + (Math.min(v, max) / max) * w;
    const zones = [[0, PACE.slower, '#b8e0ff', 'SLOWER'], [PACE.slower, PACE.good, '#fff4da', ''], [PACE.good, PACE.perfect, '#2ecc71', 'PERFECT'], [PACE.perfect, PACE.spray, '#ff9f1c', 'SPRAY'], [PACE.spray, max, '#e8343b', 'NO BALL']];
    ctx.save();
    for (const [a, b, c] of zones) { ctx.fillStyle = c; ctx.fillRect(X(a), y, X(b) - X(a), h); }
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.strokeRect(x, y, w, h);
    ctx.font = `12px ${'"Bangers", Impact, sans-serif'}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    for (const [a, b, , label] of zones) { if (!label) continue; ctx.fillStyle = '#fff4da'; ctx.fillText(label, (X(a) + X(b)) / 2, y - 2); }
    const px = X(p);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(px, y + h + 2); ctx.lineTo(px - 7, y + h + 12); ctx.lineTo(px + 7, y + h + 12); ctx.fill();
    ctx.fillStyle = '#fff4da'; ctx.fillRect(px - 1.5, y - 3, 3, h + 6);
    ctx.restore();
  }

  renderFieldEditor() {
    const ctx = this.ctx, E = this.E, L = this.edLayout();
    const { cx, cy, R, k, tok } = L;
    ctx.fillStyle = '#101632'; ctx.fillRect(0, 0, this.W, this.H);
    // ground
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(cx, cy, R + 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#23853f'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let x = cx - R; x < cx + R; x += 9 * k * 2) ctx.fillRect(x, cy - R, 9 * k, 2 * R);
    ctx.restore();
    ctx.strokeStyle = '#fff4da'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, fishRadius(L, 27), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    const pt = this.edTo(0, 21), pb = this.edTo(0, -1);
    ctx.fillStyle = '#d8b878'; ctx.fillRect(cx - tok * 0.45, pt.y, tok * 0.9, pb.y - pt.y);
    // side labels, outside the circle
    ctx.font = `15px "Bangers", Impact, sans-serif`; ctx.fillStyle = 'rgba(255,244,218,0.8)'; ctx.textBaseline = 'middle';
    ctx.textAlign = 'left'; ctx.fillText('← LEG SIDE', Math.max(8, cx - R), cy + R + 20);
    ctx.textAlign = 'right'; ctx.fillText('OFF SIDE →', Math.min(this.W - 8, cx + R), cy + R + 20);
    ctx.textAlign = 'center'; ctx.fillText('BOWLER\'S END', cx, cy - R - 16);
    const token = (x, y, fill, text, r, opts = {}) => {
      if (opts.ring) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r + 6 + Math.sin(this.realTime / 120) * 2, 0, Math.PI * 2); ctx.stroke(); }
      if (opts.shadow) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + r + 8, r, r * 0.4, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = fill; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK; ctx.font = `${Math.round(r * 0.85)}px "Bangers", Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y + 1);
    };
    // fixed players
    const wk = this.edTo(0, -3), bat = this.edTo(0, 0.6), bw = this.edTo(1.2, 22.5);
    token(bat.x, bat.y, '#fff4da', 'BAT', tok * 0.7);
    token(wk.x, wk.y + tok * 0.4, '#b9b3d6', 'WK', tok * 0.7);
    token(bw.x, bw.y, '#b9b3d6', 'BWL', tok * 0.7);
    // fielders, the one in your hand drawn last
    const out = E.draft.filter(outsideRing).length;
    const list = [...E.draft].sort((p, q) => (p === E.drag) - (q === E.drag));
    for (const f of list) {
      const p = this.edTo(f.x, f.y);
      const warn = E.pp && out > 2 && outsideRing(f);
      const hot = E.drag === f || E.selected === f;
      token(p.x, p.y, warn ? '#ff8a8a' : hot ? '#ffd23f' : '#3ec6ff', abbrev(f.name), tok, { ring: E.selected === f, shadow: E.drag === f && E.lift > 0 });
    }
    // name of the fielder you're moving, clear of your thumb
    const focus = E.drag || E.selected;
    if (focus) {
      const txt = `${focus.name}${E.pp && outsideRing(focus) ? ' · outside the circle' : ''}`;
      ctx.font = `20px "Bangers", Impact, sans-serif`;
      const w = ctx.measureText(txt).width + 28;
      ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.roundRect(cx - w / 2, 14, w, 34, 17); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, cx, 32);
    } else {
      ctx.font = `22px "Bangers", Impact, sans-serif`; ctx.fillStyle = '#ffd23f'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('SET YOUR FIELD', cx, 32);
    }
    if (!E.touched) {
      // a hand showing the drag until the player touches a fielder
      const f = E.draft.find(q => q.id === 'cover') || E.draft[0];
      const p = this.edTo(f.x, f.y);
      const t = ((this.realTime - E.t0) % 1600) / 1600;
      const m = t < 0.2 ? 0 : t > 0.8 ? 1 : (t - 0.2) / 0.6;
      const hx = p.x + 6 + m * 46, hy = p.y + 10 - m * 40;
      ctx.save();
      ctx.globalAlpha = t > 0.9 ? (1 - t) * 10 : 1;
      ctx.fillStyle = '#fff4da'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.roundRect(hx - 8, hy + 4, 16, 24, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(hx - 4.5, hy - 12, 9, 20, 4.5); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  renderOutfield() {
    const ctx = this.ctx, O = this.O, V = this.of;
    V.drawGround(ctx);
    if (O.ring) {
      const p = V.to(O.ring.x, O.ring.y);
      ctx.strokeStyle = O.ring.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, O.ring.r * V.k, O.ring.r * V.k * 0.78, 0, 0, Math.PI * 2); ctx.stroke();
    }
    for (const m of O.marks) {
      const p = V.to(m.x, m.y);
      ctx.strokeStyle = '#e8343b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(p.x - 7, p.y - 5); ctx.lineTo(p.x + 7, p.y + 5); ctx.moveTo(p.x + 7, p.y - 5); ctx.lineTo(p.x - 7, p.y + 5); ctx.stroke();
    }
    const figs = [
      ...O.fielders.map(f => ({ y: f.y, draw: () => { V.figure(ctx, f.x, f.y, f.look, f.pose, { emblem: f.emblem, glow: f.ctrl ? '#ffd23f' : null, scale: f.ctrl ? 1.25 : 1 }); } })),
      ...O.batters.map(b => ({ y: b.y, draw: () => V.figure(ctx, b.x, b.y, b.look, O.running ? POSES.run(this.gameTime * 12) : POSES.bat(-0.4), { helmet: true, pads: true }) })),
    ].sort((a, b) => b.y - a.y);
    for (const f of figs) f.draw();
    const me = O.fielders.find(f => f.ctrl);
    if (me) V.label(ctx, me.x, me.y, 'YOU', '#ffd23f');
    if (O.ends) {
      for (const e of O.ends) {
        const p = V.to(e.x, e.y);
        ctx.strokeStyle = '#e8343b'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(p.x, p.y - 8, 18 + Math.sin(this.realTime / 90) * 3, 0, Math.PI * 2); ctx.stroke();
        V.label(ctx, e.x, e.y + 3.5, `${e.id === 'striker' ? "Keeper's end" : "Bowler's end"} ${e.pct}%`, e.pct >= 50 ? '#2ecc71' : '#fff4da');
      }
    }
    if (O.ball) V.ball(ctx, O.ball);
  }
}

