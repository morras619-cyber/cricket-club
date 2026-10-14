import { portrait } from './figure.js';
import { LANES, LENGTHS } from './physics.js';
import { CFG } from './config.js';

const $ = id => document.getElementById(id);

export class UI {
  constructor() {
    this.screens = ['home', 'squad', 'cover', 'pause', 'result'];
    this.portraits = new Map();
    this.bannerTimer = 0;
    this.powerKeys = '';
    this.pitch = { lane: 1, length: 2, glow: null, onChange: null };
    this.setupMiniPitch();
  }

  show(id) {
    for (const s of this.screens) $(s).hidden = s !== id;
  }
  hud(on) { $('hud').hidden = !on; }

  score(inn, { label, need, phase }) {
    $('hudTeam').textContent = label;
    $('hudRuns').textContent = inn.runs;
    $('hudWkts').textContent = inn.wkts;
    $('hudOvers').textContent = `${inn.overs} ov · ${inn.ballsLeft} left`;
    $('hudNeed').textContent = need;
    $('hudPhase').textContent = phase.toUpperCase();
    const start = Math.floor(Math.max(0, inn.log.length - 1) / 6) * 6;
    const over = inn.log.length && inn.log.length % 6 === 0 ? inn.log.slice(-6) : inn.log.slice(start);
    $('hudOver').innerHTML = over.map(r => `<b class="r${r}">${r === '0' ? '•' : r}</b>`).join('');
  }

  banner(head, sub = '', ms = 1300) {
    $('bannerHead').textContent = head;
    $('bannerSub').textContent = sub;
    const b = $('banner');
    b.classList.add('show');
    clearTimeout(this.bannerTimer);
    if (ms) this.bannerTimer = setTimeout(() => b.classList.remove('show'), ms);
  }
  clearBanner() { $('banner').classList.remove('show'); }

  hint(text) {
    const h = $('hint');
    if (text) { h.textContent = text; h.classList.add('show'); } else h.classList.remove('show');
  }

  charge(value) {
    const c = $('charge');
    $('chargeFill').style.width = `${value}%`;
    $('chargeVal').textContent = Math.round(value);
    c.setAttribute('aria-valuenow', Math.round(value));
    c.classList.toggle('t2', value >= 60 && value < 100);
    c.classList.toggle('t3', value >= 100);
  }

  portraitFor(hero, pose) {
    const key = hero.id + pose;
    if (!this.portraits.has(key)) this.portraits.set(key, portrait(hero, 40, pose));
    return this.portraits.get(key);
  }

  // list: [{ key, name, cost, hero, pose, state: 'ready'|'armed'|'off', onTap }]
  powers(list) {
    const box = $('powers');
    const keys = list.map(p => p.key).join('|');
    if (keys !== this.powerKeys) {
      this.powerKeys = keys;
      box.innerHTML = '';
      for (const p of list) {
        const b = document.createElement('button');
        b.className = 'power';
        b.dataset.key = p.key;
        const pc = this.portraitFor(p.hero, p.pose).cloneNode();
        pc.getContext('2d').drawImage(this.portraitFor(p.hero, p.pose), 0, 0);
        b.append(pc);
        const t = document.createElement('span');
        t.innerHTML = `<span class="pname"></span><span class="pcost"></span>`;
        b.append(t);
        b.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); if (!b.disabled) b._onTap?.(); });
        box.append(b);
      }
    }
    for (const p of list) {
      const b = box.querySelector(`[data-key="${p.key}"]`);
      b.querySelector('.pname').textContent = p.name;
      b.querySelector('.pcost').textContent = p.state === 'armed' ? 'ARMED' : `${p.cost} ⚡`;
      b.disabled = p.state === 'off';
      b.classList.toggle('armed', p.state === 'armed');
      b.classList.toggle('ready', p.state === 'ready');
      b.setAttribute('aria-label', `${p.name}, costs ${p.cost} charge${p.state === 'armed' ? ', armed' : ''}`);
      b._onTap = p.onTap;
    }
  }

  toast(msg, ms = 1800) {
    const t = $('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  // ---------- bowling panel ----------
  bowlPanel(on, opts = {}) {
    $('bowlPanel').hidden = !on;
    $('bowlBtn').hidden = !on;
    if (!on) return;
    Object.assign(this.pitch, opts.pitch || {});
    this.renderPitch();
    const tc = $('typeChips');
    tc.innerHTML = '';
    for (const t of opts.types) {
      const c = document.createElement('button');
      c.className = 'chip' + (t === opts.type ? ' on' : '');
      c.textContent = t;
      c.addEventListener('pointerdown', e => { e.stopPropagation(); opts.onType(t); for (const x of tc.children) x.classList.toggle('on', x === c); });
      tc.append(c);
    }
    const fc = $('fieldChips');
    fc.innerHTML = '';
    for (const [id, name] of [['attack', 'Attack'], ['balanced', 'Balanced'], ['defend', 'Defend']]) {
      const c = document.createElement('button');
      c.className = 'chip' + (id === opts.field ? ' on' : '');
      c.textContent = name;
      c.addEventListener('pointerdown', e => { e.stopPropagation(); opts.onField(id); for (const x of fc.children) x.classList.toggle('on', x === c); });
      fc.append(c);
    }
  }

  setupMiniPitch() {
    const cv = $('miniPitch');
    const pick = e => {
      const r = cv.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      const lane = Math.max(0, Math.min(4, Math.floor((x - 0.05) / 0.9 * 5)));
      const length = Math.max(0, Math.min(5, Math.floor((y - 0.04) / 0.92 * 6)));
      if (lane !== this.pitch.lane || length !== this.pitch.length) {
        this.pitch.lane = lane; this.pitch.length = length;
        this.renderPitch();
        this.pitch.onChange?.(this.pitchChoice());
      }
    };
    let dragging = false;
    cv.addEventListener('pointerdown', e => { e.stopPropagation(); dragging = true; cv.setPointerCapture(e.pointerId); pick(e); });
    cv.addEventListener('pointermove', e => { if (dragging) pick(e); });
    cv.addEventListener('pointerup', () => { dragging = false; });
    cv.addEventListener('pointercancel', () => { dragging = false; });
  }

  // Rows top → bottom run from the batter's end to the bowler's.
  static PITCH_ROWS = ['fulltoss', 'yorker', 'full', 'good', 'short', 'bouncer'];

  pitchChoice() {
    return { lane: LANES[this.pitch.lane].id, length: UI.PITCH_ROWS[this.pitch.length] };
  }

  renderPitch() {
    const cv = $('miniPitch');
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = r.width || 92, H = r.height || 132;
    cv.width = W * dpr; cv.height = H * dpr;
    const g = cv.getContext('2d');
    g.scale(dpr, dpr);
    g.fillStyle = '#1f7a3e'; g.fillRect(0, 0, W, H);
    const px = W * 0.05, pw = W * 0.9, py = H * 0.04, ph = H * 0.92;
    g.fillStyle = '#d8b878'; g.fillRect(px, py, pw, ph);
    const rowH = ph / 6, colW = pw / 5;
    const colors = ['#b8e0ff', '#ffe27a', '#ffd23f', '#9be59b', '#ffb37a', '#ff8a8a'];
    UI.PITCH_ROWS.forEach((id, i) => {
      g.fillStyle = colors[i]; g.globalAlpha = 0.35;
      g.fillRect(px, py + i * rowH, pw, rowH);
      g.globalAlpha = 1;
      if (this.pitch.glow && this.pitch.glow.length === id) {
        g.fillStyle = 'rgba(255,210,63,0.9)';
        const c = LANES.findIndex(l => l.id === this.pitch.glow.lane);
        g.fillRect(px + c * colW, py + i * rowH, colW, rowH);
      }
      g.fillStyle = '#141018'; g.font = '700 8px system-ui'; g.textAlign = 'left';
      g.fillText(LENGTHS.find(l => l.id === id).name.toUpperCase(), px + 2, py + i * rowH + 9);
    });
    // stumps at the batter's end
    g.fillStyle = '#fff4da';
    g.fillRect(px + pw / 2 - 5, py + 1, 10, 3);
    const cx = px + (this.pitch.lane + 0.5) * colW, cy = py + (this.pitch.length + 0.5) * rowH + 3;
    g.strokeStyle = '#141018'; g.lineWidth = 2.5; g.fillStyle = '#e8343b';
    g.beginPath(); g.arc(cx, cy, 7, 0, Math.PI * 2); g.fill(); g.stroke();
    g.strokeStyle = '#fff4da'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(cx - 11, cy); g.lineTo(cx - 8, cy); g.moveTo(cx + 8, cy); g.lineTo(cx + 11, cy); g.stroke();
  }

  bowlRing(p, state) {
    // p: 1 → 0 as the run-up completes. The live ring meets the green target ring at the ideal release.
    const ring = $('bowlRing');
    const r = 30 + 16 * Math.max(-0.6, p);
    ring.setAttribute('r', Math.max(8, r).toFixed(1));
    ring.style.stroke = state === 'green' ? 'var(--good)' : state === 'late' ? 'var(--hot)' : 'var(--paper)';
    $('bowlBtn').classList.toggle('down', state !== 'idle');
  }
  bowlText(t) { $('bowlBtnText').innerHTML = t; }
}

export const RUNUP_MS = CFG.bowling.runupMs;
