import { portrait } from './figure.js';

const $ = id => document.getElementById(id);

export class UI {
  constructor() {
    this.screens = ['home', 'squad', 'cover', 'pause', 'result'];
    this.portraits = new Map();
    this.bannerTimer = 0;
    this.powerKeys = '';
    $('fieldBtn').addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); this.onFieldBtn?.(); });
    $('fieldDone').addEventListener('click', e => { e.stopPropagation(); this.onFieldDone?.(); });
    $('btnSmack').addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); this.onBanter?.('smack'); });
    $('btnCool').addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); this.onBanter?.('cool'); });
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

  // ---------- bowling ----------
  fieldButton(on, onTap) { $('fieldBtn').hidden = !on; this.onFieldBtn = on ? onTap : null; }

  // presets: [[id, name]]; onPreset(id); onDone()
  fieldEditor(on, opts = {}) {
    $('fieldSheet').hidden = !on;
    $('powers').hidden = on;
    if (!on) { this.onFieldDone = null; return; }
    this.onFieldDone = opts.onDone;
    const box = $('fieldPresets');
    box.innerHTML = '';
    for (const [id, name] of opts.presets) {
      const c = document.createElement('button');
      c.className = 'chip';
      c.textContent = name;
      c.addEventListener('click', e => { e.stopPropagation(); opts.onPreset(id); for (const x of box.children) x.classList.toggle('on', x === c); });
      box.append(c);
    }
    this.fieldNote('Drag a fielder to move them.', false);
  }
  fieldNote(text, warn) {
    const n = $('fieldNote');
    if (n.textContent !== text) n.textContent = text;
    n.classList.toggle('warn', !!warn);
  }

  banter(on, onPick) {
    $('banterBox').hidden = !on;
    $('powers').hidden = on;
    this.onBanter = on ? onPick : null;
  }
  banterTimer(p) { $('banterBar').style.width = `${Math.max(0, p) * 100}%`; }
}
