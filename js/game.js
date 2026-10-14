import { CFG, phaseFor } from './config.js';
import { makeRng } from './rng.js';
import { Charge } from './charge.js';
import { SPARKS, heroesFor, SIDEKICK_LOOKS, AI_LOOK } from './heroes.js';
import { makeDelivery, LANES } from './physics.js';
import { gradeTiming, swipeToShot, resolveContact } from './shots.js';
import { simulateHit, buildField, runsAfterCollect, runOutMargins, keeperEdgeP, ENDS } from './fieldsim.js';
import { aiBowlingScript, aiBat, aiStance, deliveryTypes, typeParams } from './ai.js';
import { Innings, matchResult } from './match.js';
import { playerControls, momentScore } from './rules.js';
import { FX, INK } from './fx.js';
import { Cam3D, OutfieldView, drawBackground, drawStumps, drawBall3D, drawFigure3D, POSES } from './scene.js';
import { sfx, buzz, unlockAudio } from './audio.js';

const F = CFG.fielding;
class Cancel extends Error {}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const SHOT_WORDS = ['THWACK!', 'DHOOM!', 'KRAK!', 'BLAM!', 'SMASH!'];

export class Game {
  constructor(ui) {
    this.ui = ui;
    this.cv = document.getElementById('cv');
    this.ctx = this.cv.getContext('2d');
    this.cams = { bat: new Cam3D('bat'), bowl: new Cam3D('bowl'), keeper: new Cam3D('keeper') };
    this.of = new OutfieldView();
    this.fx = new FX();
    this.timers = []; this.waiters = [];
    this.gameTime = 0; this.realTime = 0; this.lastNow = performance.now();
    this.timeScale = 1; this.hitStopUntil = 0;
    this.view = 'idle'; this.paused = false;
    this.S = this.freshScene(); this.O = null;
    this.onInput = null; this.press = null; this.release = null;
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
    });
    cv.addEventListener('pointerup', e => {
      if (!this.g || e.pointerId !== this.g.id) return;
      const g = this.g; this.g = null;
      g.x = e.clientX; g.y = e.clientY;
      this.emit('up', { ...g, dx: g.x - g.x0, dy: g.y - g.y0, t: evReal(e) });
    });
    cv.addEventListener('pointercancel', () => { this.g = null; });

    const btn = document.getElementById('bowlBtn');
    btn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); unlockAudio(); if (!this.press && this.awaitingBowl) this.press = { t: evReal(e) }; try { btn.setPointerCapture(e.pointerId); } catch { /* ignore */ } });
    btn.addEventListener('pointerup', e => { e.preventDefault(); if (this.press && !this.release) this.release = { t: evReal(e) }; });
    btn.addEventListener('pointercancel', e => { if (this.press && !this.release) this.release = { t: evReal(e) }; });
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
      batter: { x: -0.5, z: 0.95, angle: -0.4, swingT0: null, look: null, emblem: null, glow: null },
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
    const r = makeRng(this.seed ^ 0x5eed);
    this.rival = {
      bat: r.pick(heroesFor('bat').filter(h => h !== this.team.bat)),
      bowl: r.pick(heroesFor('bowl').filter(h => h !== this.team.bowl)),
    };
    this.charge = new Charge(0);
    this.charge.on(ev => this.onCharge(ev));
    this.ui.charge(0);
    this.armed = { mirror: 0, elastic: 0 };
    this.fieldState = { events: 0, lastEventBall: -9, setting: this.settings.fielding };
    this.moments = [];
    this.rebowls = 0;
    this.stats = { fieldingWins: 0, perfects: 0, powers: 0 };
    this.bowlChoice = { type: deliveryTypes(this.team.bowl.bowls)[0], field: 'balanced' };
    this.ui.pitch.lane = 1; this.ui.pitch.length = 3; this.ui.pitch.glow = null;
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
      } else {
        const first = new Innings('player');
        this.innings.push(first);
        await this.introBanner('YOU BAT FIRST', `${this.rival.bowl.name} has the ball`);
        await this.battingInnings(first, script);
        const carry = this.charge.carryOver();
        await this.inningsBreak(first, carry);
        const second = new Innings('ai', first.runs + 1);
        this.innings.push(second);
        this.charge = new Charge(carry);
        this.charge.on(ev => this.onCharge(ev));
        this.ui.charge(carry);
        await this.bowlingInnings(second);
      }
      return this.summary();
    } catch (e) {
      if (e instanceof Cancel) return null;
      throw e;
    } finally {
      this.ui.hud(false); this.ui.bowlPanel(false); this.ui.hint(null);
    }
  }

  quit() { this.cancelAll(); this.ui.hud(false); this.ui.bowlPanel(false); this.view = 'idle'; this.paused = false; }

  async introBanner(head, sub) {
    this.view = 'bat';
    this.S = this.freshScene();
    this.ui.banner(head, sub, 1800);
    sfx.crowd(0.8);
    await this.sleepReal(this.bot ? 200 : 1700);
  }

  async inningsBreak(first, carry) {
    this.ui.bowlPanel(false);
    this.ui.banner('INNINGS BREAK', `Defend ${first.runs}. ${carry} charge carries over.`, 2200);
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
    this.fx.flash(color, 0.45);
    this.fx.burst(this.W / 2, this.H * 0.42, { color, r: Math.max(this.W, this.H) * 0.6 });
    this.fx.word(def.word, this.W / 2, this.H * 0.42, { size: def.ultimate ? 76 : 60, color, stroke: INK, dur: 1300 });
    this.fx.bubble(hero.quote, this.W * 0.5, this.H * 0.56, { dur: 1500 });
    this.ui.banner(def.name.toUpperCase(), def.desc, 1600);
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
    } else need = 'Set a target';
    this.ui.score(inn, { label: inn.side === 'player' ? 'YOU BAT' : 'YOU BOWL', need, phase: phaseFor(ball).name });
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
    S.batter.look = this.team.bat.look; S.batter.emblem = this.team.bat.emblem;
    S.bowler.look = this.rival.bowl.look;
    const rng = this.ballRng(ballNo);
    const aiField = buildField(this.aiFieldPreset(ballNo), ballNo <= 12);
    S.field3d = aiField.filter(f => !f.keeper && f.id !== 'bowler');
    const aiPower = spec.power;
    this.powerLock = false;
    this.refreshPowers();

    if (aiPower) {
      const pw = this.rival.bowl.power;
      this.ui.banner(`${pw.name.toUpperCase()}!`, `${this.rival.bowl.name} powers up`, 1600);
      this.fx.word(pw.word, this.W / 2, this.H * 0.35, { size: 52, color: this.rival.bowl.look.trim, stroke: INK });
      sfx.whoosh();
    }
    if (opt.hint !== undefined) this.ui.hint(opt.hint);
    else if (ballNo === 1 && this.mode !== 'challenge') this.ui.hint('HOLD · SWIPE · LIFT ON THE RING');
    if (opt.waitPower) await opt.waitPower();
    await this.sleepReal(this.bot ? 150 : aiPower ? 1300 : 650);

    // run-up
    await this.animate(850, p => { S.bowler.z = 27.5 - 6.9 * p; S.bowler.pose = POSES.run(p * 13); });
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
    S.bowler.pose = POSES.bowl(1);
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
      }
    };
    if (this.bot) this.botBat(d, S, fx, rng);

    const deadline = d.tContact + (CFG.timing.edge + 60) / 1000;
    await this.until(() => {
      const tb = this.gameTime - S.ballT0;
      if (fx.meteor && tb > d.tContact - 0.45) { this.timeScale = 0.35; this.fx.speed = 1; }
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
    await this.sleepReal(this.bot ? 50 : 650);
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
      this.charge.award('six', 'SIX');
      sfx.crowd(1.2);
      const powered = fx.thunder;
      if (powered) this.fx.word('KRAKOOOM!', this.W / 2, this.H * 0.3, { size: 76, color: '#5fc8ff', stroke: INK });
      this.addMoment(powered ? 'powerSix' : 'six', powered ? 'THUNDERCLAP SIX!' : `${Math.round(sim.path.carry || 80)}m SIX!`, powered ? 'KRAKOOOM!' : 'SIX!', this.team.bat, { ballNo, detail: 'into the stands' });
    } else if (runs === 4) {
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
        ? (f.id === 'bowler' ? this.rival.bowl.look : AI_LOOK)
        : (f.keeper && this.team.field.id === 'rani' ? this.team.field.look : f.id === 'bowler' ? this.team.bowl.look : SIDEKICK_LOOKS[i % 2]),
      emblem: side === 'ai' ? (f.id === 'bowler' ? this.rival.bowl.emblem : null) : (f.keeper && this.team.field.id === 'rani' ? 'R' : f.id === 'bowler' ? this.team.bowl.emblem : null),
      pose: f.keeper ? POSES.keeper() : POSES.crouch(),
    }));
  }

  setupOutfield(fielders, side) {
    const fs = this.fieldLooks(fielders, side);
    this.O = {
      fielders: fs,
      batters: [{ x: -0.6, y: 1.2, look: side === 'ai' ? this.team.bat.look : this.rival.bat.look }, { x: 0.8, y: 19, look: side === 'ai' ? SIDEKICK_LOOKS[0] : AI_LOOK }],
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
    this.lengths = [];
    this.aiPowerBalls = new Set([16, 26]);
    this.hud(inn);
    await this.introBanner('YOUR TURN TO BOWL', `Defend ${inn.target - 1} with ${this.team.bowl.name}`);
    while (!inn.done()) {
      const ballNo = inn.balls + 1;
      this.phaseBanner(ballNo);
      const r = await this.bowlBall(inn, ballNo);
      this.hud(inn);
      if (r?.rebowl) { this.rebowls = (this.rebowls || 0) + 1; continue; }
      if (inn.balls % 6 === 0 && !inn.done()) {
        const runs = inn.log.slice(-6).reduce((s, x) => s + (x === 'W' ? 0 : Number(x)), 0);
        this.ui.banner(`END OF OVER ${inn.balls / 6}`, `${runs} off the over · they need ${Math.max(0, inn.target - inn.runs)}`, 1300);
        await this.sleepReal(this.bot ? 100 : 1300);
      } else await this.sleepReal(this.bot ? 80 : 400);
    }
    this.ui.bowlPanel(false);
  }

  showBowlPanel(opt = {}) {
    this.ui.bowlPanel(true, {
      types: deliveryTypes(this.team.bowl.bowls), type: this.bowlChoice.type, field: this.bowlChoice.field,
      onType: t => { this.bowlChoice.type = t; sfx.click(); },
      onField: f => { this.bowlChoice.field = f; sfx.click(); },
      pitch: { glow: opt.glow || null, onChange: () => sfx.click() },
    });
    this.ui.bowlRing(1, 'idle');
    this.ui.bowlText('HOLD<br>TO BOWL');
  }

  async bowlBall(inn, ballNo, opt = {}) {
    const S = this.S = this.freshScene();
    this.view = 'bowl';
    this.timeScale = 1;
    const rng = this.ballRng(ballNo);
    S.batter.look = this.rival.bat.look; S.batter.emblem = this.rival.bat.emblem; S.batter.x = -0.5;
    S.bowler.look = this.team.bowl.look; S.bowler.emblem = this.team.bowl.emblem; S.bowler.z = 26; S.bowler.x = -0.55;
    S.keeper.look = this.team.field.id === 'rani' ? this.team.field.look : SIDEKICK_LOOKS[1];
    const kind = this.team.bowl.bowls;
    const field = buildField(this.bowlChoice.field, ballNo <= 12);
    S.field3d = field.filter(f => !f.keeper && f.id !== 'bowler');

    // the AI batter may power up
    this.aiBatPower = null; this.clash = false;
    const need = inn.target - inn.runs;
    if (!opt.scripted && this.aiPowerBalls.has(ballNo) && need / Math.max(1, inn.ballsLeft) > 1.0) {
      this.aiPowerBalls.delete(ballNo);
      const k = this.rival.bat.power.kind;
      this.aiBatPower = k === 'meteor' ? 'thunder' : k;
      const pw = this.rival.bat.power;
      this.ui.banner(`${this.rival.bat.name.toUpperCase()}: ${pw.name.toUpperCase()}!`, 'Answer with a power of your own', 2000);
      this.fx.word(pw.word, this.W / 2, this.H * 0.32, { size: 54, color: this.rival.bat.look.trim, stroke: INK });
      if (this.aiBatPower === 'mirror') this.aiMirror = 3;
      sfx.whoosh();
    }
    const aiPower = this.aiBatPower || (this.aiMirror > 0 ? 'mirror' : null);
    const stance = opt.stance || aiStance(kind, rng);
    S.stance = stance;

    this.powerLock = false;
    this.showBowlPanel(opt);
    this.refreshPowers();
    if (this.freeHit) this.ui.banner('FREE HIT', 'They can only be run out', 1400);
    if (opt.hint) this.ui.hint(opt.hint);

    // wait for the press
    this.press = null; this.release = null; this.awaitingBowl = true;
    if (this.bot) this.botBowl(rng);
    await this.until(() => this.press);
    this.awaitingBowl = false;
    this.powerLock = true;
    this.refreshPowers();
    this.ui.hint(null);
    if (stance === 'charge') this.fx.bubble('Charging down!', this.W * 0.5, this.H * 0.42, { dur: 1100 });
    if (stance === 'back') this.fx.bubble('Backing away…', this.W * 0.5, this.H * 0.42, { dur: 1100 });

    const runup = CFG.bowling.runupMs, B = CFG.bowling;
    await this.until(() => {
      const e = this.realTime - this.press.t;
      const p = Math.min(1, e / runup);
      S.bowler.z = lerp(26, 20.7, p); S.bowler.pose = POSES.run(p * 12);
      const state = Math.abs(e - runup) <= B.good ? 'green' : e > runup + B.good ? 'late' : 'live';
      this.ui.bowlRing(1 - e / runup, state);
      return this.release || e > runup + 350;
    });
    if (!this.release) this.release = { t: this.press.t + runup + 350 };
    const err = this.release.t - (this.press.t + runup);
    let rg = Math.abs(err) <= B.perfect ? 'perfect' : Math.abs(err) <= B.good ? 'good' : Math.abs(err) <= B.loose ? 'loose' : 'bad';
    if (this.armed.pinpoint) { rg = 'perfect'; this.armed.pinpoint = false; }
    if (opt.forceRelease) rg = opt.forceRelease(rg);
    this.ui.bowlRing(1, 'idle');
    this.ui.bowlPanel(false);
    this.fx.word(rg === 'perfect' ? 'PERFECT RELEASE!' : rg === 'good' ? 'GOOD RELEASE' : rg === 'loose' ? 'LOOSE…' : err < 0 ? 'TOO EARLY!' : 'TOO LATE!', this.W / 2, this.H * 0.55, { size: rg === 'perfect' ? 40 : 30, color: rg === 'perfect' ? '#ffd23f' : '#fff4da', stroke: INK, rot: 0, dur: 1000 });
    if (rg === 'perfect') this.charge.award('perfectRelease', 'RELEASE');
    this.charge.timingStreak(rg === 'perfect');

    if (rg === 'bad') {
      S.bowler.pose = POSES.bowl(1);
      inn.extra(1);
      this.freeHit = true;
      this.ui.banner('NO BALL!', '+1 run · next ball is a free hit', 1600);
      sfx.trombone();
      await this.sleepReal(this.bot ? 100 : 1500);
      return { rebowl: true };
    }

    // build the delivery
    const choice = this.ui.pitchChoice();
    const lenOrder = ['bouncer', 'short', 'good', 'full', 'yorker'];
    let length = choice.length;
    if (rg === 'loose' && lenOrder.includes(length)) {
      const i = clamp(lenOrder.indexOf(length) + (rng.chance(0.5) ? 1 : -1), 0, 4);
      length = lenOrder[i];
    }
    const jitter = rg === 'perfect' ? 0 : rg === 'good' ? 0.06 : 0.15;
    const params = typeParams(kind, this.bowlChoice.type, rng);
    if (rg === 'perfect') { params.move = (params.move || 0) * 1.15; params.swing = (params.swing || 0) * 1.15; }
    const spec = { x: LANES.find(l => l.id === choice.lane).x + rng.range(-jitter, jitter), length, ...params };
    const fxFlags = {};
    const A = this.armed;
    let usedPower = null;
    if (A.tornado) { Object.assign(spec, { length: 'yorker', x: 0, kmh: 160, swing: 0.05, move: 0 }); fxFlags.tornado = true; A.tornado = false; usedPower = 'tornado'; }
    if (A.maya) { fxFlags.maya = true; A.maya = false; usedPower = 'maya'; }
    if (A.shatter) { spec.move = 0.3; fxFlags.shatter = true; A.shatter = false; usedPower = 'shatter'; }
    if (opt.spec) Object.assign(spec, opt.spec);
    this.lengths.push(spec.length);
    const repeats = this.lengths.slice(-3).every(l => l === spec.length) && this.lengths.length >= 3 ? 3 : 0;
    if (repeats) this.fx.bubble("They've read you!", this.W * 0.5, this.H * 0.45, { dur: 1200 });

    const d = makeDelivery(spec);
    let ai = aiBat(d, { ballNo, need, ballsLeft: inn.ballsLeft, wicketsLeft: CFG.wickets - inn.wkts, release: rg, repeats, fx: fxFlags, stance, power: aiPower === 'thunder' ? 'thunder' : null }, rng);
    if (aiPower === 'mirror' && ai.res.outcome === 'hit' && !ai.res.loft && (ai.grade === 'perfect' || ai.grade === 'good')) ai.res.forced = { four: true, uncatchable: true };
    if (this.aiMirror > 0) this.aiMirror--;
    if (opt.forceAi) ai = opt.forceAi(d, ai) || ai;

    S.delivery = d; S.ballT0 = this.gameTime;
    S.bowler.pose = POSES.bowl(1); S.bowler.followT0 = this.realTime;
    if (fxFlags.maya) S.maya = { real: 1, picked: 0 };
    sfx.whoosh();
    await this.until(() => this.gameTime - S.ballT0 >= d.tContact);
    if (ai.res.outcome !== 'leave') S.batter.swingT0 = this.realTime;
    const res = ai.res;
    const contact = d.pos(d.tContact);
    const cs = this.cams.bowl.project(contact.x, contact.y, contact.z) || { x: this.W / 2, y: this.H / 3 };
    const outFree = () => { this.fx.word('FREE HIT · NOT OUT', this.W / 2, this.H * 0.4, { size: 40 }); };
    const freeHit = this.freeHit; this.freeHit = false;
    const bowlerHero = this.team.bowl;

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
      this.addMoment(kind2, text, extra.word || text, hero, { ballNo, ...extra });
    };

    if (res.outcome === 'bowled') {
      S.stumps[0] = { dir: rng.range(-1, 1) };
      const powerWord = usedPower ? { tornado: 'TORNADO YORKER!', maya: 'MAYA BALL!', shatter: 'SHATTERED!' }[usedPower] : null;
      wicket(res.mayaFooled ? 'FOOLED BY MAYA!' : 'BOWLED!', usedPower ? 'twoWickets' : 'wicket', bowlerHero, { word: powerWord || 'BOWLED!', detail: powerWord ? `${powerWord.replace('!', '')} wicket` : 'stumps cartwheeling' });
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
    await this.sleepReal(this.bot ? 50 : 600);
  }

  botBowl(rng) {
    const runup = CFG.bowling.runupMs;
    const noise = (Math.random() + Math.random() + Math.random() - 1.5) * 90;
    this.sleepReal(300).then(() => { this.press = { t: this.realTime }; return this.sleepReal(runup + noise); })
      .then(() => { if (!this.release) this.release = { t: this.realTime }; }).catch(() => {});
    if (rng.chance(0.3)) { this.ui.pitch.lane = rng.int(0, 4); this.ui.pitch.length = rng.int(0, 5); }
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
        inn.ball({ runs: r.runs, wicket: true });
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
    const approach = opt.approach ?? tut.approach ?? (kind === 'edge' ? 700 : 820);
    const to = { x: clamp(offset.x * 0.8, -1.05, 1.05), y: clamp(offset.y, 0.25, 1.3), z: -2.0 };
    const from = kind === 'edge' ? { x: S.batter.x + 0.35, y: 0.75, z: 1.1 } : { x: d.xt * 0.6, y: 0.5, z: 1.3 };
    const tapReach = elastic ? 0.95 : 0.45;
    const needSwipe = Math.abs(to.x - 0.3) > tapReach || to.y > 1.15;
    S.delivery = null; S.ball = null; S.flight = null;
    S.kball = { from, to, t0: this.realTime, dur: approach, done: false };
    S.reticle = { ...to, needSwipe, elastic };
    S.keeper = { x: 0.3, z: -2.4, pose: POSES.keeper(), look: this.team.field.id === 'rani' ? this.team.field.look : SIDEKICK_LOOKS[1], emblem: this.team.field.id === 'rani' ? 'R' : null };
    this.fx.word(kind === 'edge' ? 'EDGE!' : 'BEATEN!', this.W / 2, this.H * 0.18, { size: 50, dur: 900 });
    this.fx.speed = 1;
    if (elastic) this.fx.word('BOING!', this.W * 0.5, this.H * 0.3, { size: 40, color: '#ffe14d', stroke: INK });
    this.ui.hint(needSwipe ? 'SWIPE TO DIVE!' : 'TAP TO CATCH!');
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
          dirOk = angDiff(want, got) <= (elastic ? 45 : 30) * Math.PI / 180;
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
      this.fx.word('JUGGLE! TAP!', this.W / 2, this.H * 0.3, { size: 48, dur: F.rejuggleMs + 200 });
      let tap = null;
      this.onInput = (type, g) => { if (type === 'down') tap = g; };
      if (this.bot) this.sleepReal(200).then(() => this.botInput('down')).catch(() => {});
      const t0 = this.realTime;
      await this.until(() => tap || this.realTime - t0 > F.rejuggleMs);
      this.onInput = null;
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
  controlledLook() { return this.team.field.id === 'bilal' ? this.team.field.look : SIDEKICK_LOOKS[0]; }

  startEvent(field, fielderId) {
    const fs = this.setupOutfield(field, 'player');
    const me = fs.find(f => f.id === fielderId);
    me.look = this.controlledLook(); me.emblem = this.team.field.id === 'bilal' ? 'B' : null; me.ctrl = true;
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
        const out = { v: false };
        await this.batBall(inn, inn.balls + 1, straight, {
          slow, extra, assist: assistHit, onOut: () => { out.v = true; },
          hint: i === 1 ? 'HOLD · SWIPE UP · LIFT ON THE RING' : 'SAME AGAIN — TIME IT!',
        });
        if (inn.runs > runsBefore || attempt === 1) break;
        // can't be lost: undo the miss and replay once
        inn.balls = before; inn.runs = runsBefore; inn.log.pop(); if (out.v) inn.wkts--;
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
    this.lengths = []; this.aiPowerBalls = new Set(); this.freeHit = false;
    this.fieldState.setting = 'all';
    this.tutorialKeeper = { window: 600, approach: 1100 };
    this.hud(def);
    this.ui.banner('NOW DEFEND IT!', 'They need 4 off the last ball', 2000);
    await this.sleepReal(this.bot ? 100 : 2000);
    for (let attempt = 0; attempt < 3; attempt++) {
      const before = { balls: def.balls, runs: def.runs, wkts: def.wkts };
      const r = await this.bowlBall(def, 30, {
        scripted: true, stance: 'normal', glow: { lane: 'stumps', length: 'yorker' },
        hint: attempt ? 'HOLD BOWL · RELEASE ON GREEN' : 'DRAG TO THE GLOWING ZONE · HOLD BOWL · RELEASE ON GREEN',
        forceRelease: rg => (rg === 'bad' ? 'loose' : rg),
        spec: { length: 'yorker' },
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
    if (this.view === 'outfield' && this.O) this.renderOutfield();
    else if (this.view === 'bat' || this.view === 'bowl' || this.view === 'keeper') this.render3D(this.view);
    else this.renderIdle();
    ctx.restore();
    this.fx.draw(ctx, W, H);
  }

  renderIdle() {
    const cam = this.cams.bat;
    drawBackground(this.ctx, cam);
  }

  ballPos() {
    const S = this.S;
    if (S.delivery) {
      const t = this.gameTime - S.ballT0;
      if (t < 0) return null;
      return S.delivery.pos(t);
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
    const items = [];
    const push = (z, fn) => items.push({ d: cam.depth(z), fn });

    for (const f of S.field3d || []) {
      push(f.y, () => drawFigure3D(ctx, cam, f.x, f.y, kind === 'bat' ? AI_LOOK : SIDEKICK_LOOKS[0], POSES.crouch(), { noShadow: false }));
    }
    push(20, () => drawStumps(ctx, cam, 20, S.stumps[20]));
    push(0, () => drawStumps(ctx, cam, 0, S.stumps[0], S.stumpGlow ? '#e8343b' : null));

    // bowler
    if (kind !== 'keeper') {
      let bx = S.bowler.x, bz = S.bowler.z;
      if (kind === 'bowl' && S.bowler.followT0 != null) {
        const p = clamp((this.realTime - S.bowler.followT0) / 600, 0, 1);
        bx -= 1.4 * p; bz -= 1.2 * p;
      }
      push(bz, () => drawFigure3D(ctx, cam, bx, bz, S.bowler.look || AI_LOOK, S.bowler.pose, { back: kind === 'bowl', emblem: S.bowler.emblem }));
    }
    // batter with swing animation
    const b = S.batter;
    let angle = b.angle;
    if (b.swingT0 != null) {
      const p = clamp((this.realTime - b.swingT0) / 260, 0, 1);
      angle = lerp(-2.5, 2.4, p);
    }
    const batterBack = kind !== 'bowl';
    push(b.z, () => drawFigure3D(ctx, cam, b.x, b.z, b.look || AI_LOOK, POSES.bat(angle), { back: batterBack, flip: !batterBack, emblem: b.emblem, batGlow: b.glow }));
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
        push(bp.z, () => drawBall3D(ctx, cam, bp, { trail: S.trail, glow: S.batter.glow && S.flight ? S.batter.glow : null }));
      }
    } else S.trail = [];

    items.sort((a, b2) => b2.d - a.d);
    for (const it of items) it.fn();

    // timing ring (batting)
    if (kind === 'bat' && S.ring && S.delivery) this.drawTimingRing(cam);
    if (kind === 'keeper' && S.reticle) this.drawReticle(cam);
    if (S.frozen) { ctx.fillStyle = 'rgba(62,198,255,0.15)'; ctx.fillRect(0, 0, this.W, this.H); }
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
      ...O.batters.map(b => ({ y: b.y, draw: () => V.figure(ctx, b.x, b.y, b.look, O.running ? POSES.run(this.gameTime * 12) : POSES.bat(-0.4)) })),
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

