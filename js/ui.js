import { portrait } from './figure.js';

const $ = id => document.getElementById(id);

// Sets text and shrinks the font until it fits its box, so nothing gets cut off.
function setFit(el, text) {
  if (el.textContent !== text) el.textContent = text;
  el.style.fontSize = '';
  if (!el.clientWidth) return;
  let size = parseFloat(getComputedStyle(el).fontSize);
  while (el.scrollWidth > el.clientWidth + 0.5 && size > 8) { size -= 0.5; el.style.fontSize = `${size}px`; }
}

export class UI {
  constructor() {
    this.screens = ['home', 'squad', 'stats', 'toss', 'cover', 'pause', 'result', 'league', 'daily', 'trophies', 'career', 'records'];
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

  score(inn, { label, need, phase, heroLine = '', logo }) {
    const lg = $('hudLogo');
    if (logo && !lg.src.endsWith(logo)) lg.src = logo;
    lg.hidden = !logo;
    setFit($('hudTeam'), label);
    $('hudRuns').textContent = inn.runs;
    $('hudWkts').textContent = inn.wkts;
    setFit($('hudOvers'), `${inn.overs} overs`);
    setFit($('hudLeft'), `${inn.ballsLeft} ball${inn.ballsLeft === 1 ? '' : 's'} left`);
    setFit($('hudLine'), heroLine);
    // run rates (per 6-ball over): current always once a ball is bowled, required while chasing
    const crr = inn.balls ? (inn.runs * 6) / inn.balls : null;
    const left = inn.target != null ? inn.target - inn.runs : null;
    const rrr = left != null && left > 0 && inn.ballsLeft > 0 ? (left * 6) / inn.ballsLeft : null;
    const parts = [];
    if (crr != null) parts.push(`CRR <b>${crr.toFixed(2)}</b>`);
    if (rrr != null) parts.push(`RRR <b class="${crr != null && rrr > crr ? 'hot' : ''}">${rrr.toFixed(2)}</b>`);
    $('hudRates').innerHTML = parts.join(' · ');
    setFit($('hudNeed'), need);
    setFit($('hudPhase'), phase.toUpperCase());
    // this over, with empty slots for the balls still to come
    const done = inn.log.length;
    const start = done && done % 6 === 0 ? done - 6 : Math.floor(done / 6) * 6;
    const over = inn.log.slice(start, start + 6);
    const cells = [];
    const nbAt = i => (inn.noBalls || []).filter(b => b === start + i).length; // no-balls before legal ball i
    for (let i = 0; i < 6; i++) {
      for (let k = nbAt(i); k > 0; k--) cells.push('<b class="nb">NB</b>');
      const r = over[i];
      cells.push(r == null ? '<b class="empty"></b>' : `<b class="r${r}">${r}</b>`);
    }
    // six circles at most: once no-balls push it past that, the oldest drop off the left so the
    // latest ball always shows on the right
    $('hudOver').innerHTML = cells.slice(-6).join('');
  }

  // team v team, shown with the next banner (cleared after it)
  matchup(a, b) {
    $('vsA').src = `img/logo-${a}.webp`; $('vsB').src = `img/logo-${b}.webp`;
    $('bannerVs').hidden = false;
  }
  // face: an optional portrait canvas shown beside the text (a new batter, the bowler of the over)
  banner(head, sub = '', ms = 1300, face = null) {
    let slot = $('bannerFace');
    if (!slot) { slot = document.createElement('div'); slot.id = 'bannerFace'; slot.className = 'banner-face'; $('banner').prepend(slot); }
    slot.innerHTML = '';
    slot.hidden = !face;
    if (face) { const c = document.createElement('canvas'); c.width = face.width; c.height = face.height; c.getContext('2d').drawImage(face, 0, 0); slot.append(c); }
    $('bannerHead').textContent = head;
    $('bannerSub').textContent = sub;
    const b = $('banner');
    b.classList.add('show');
    clearTimeout(this.bannerTimer);
    if (ms) this.bannerTimer = setTimeout(() => { b.classList.remove('show'); $('bannerVs').hidden = true; }, ms);
  }
  clearBanner() { $('banner').classList.remove('show'); }

  hint(text) {
    const h = $('hint');
    if (text) { h.textContent = text; h.classList.add('show'); } else h.classList.remove('show');
  }

  charge(value) {
    const c = $('charge');
    $('chargeFill').style.width = `${value}%`;
    $('chargeVal').textContent = `${Math.round(value)} ⚡`;
    const sp = $('chargeSpark');
    sp.hidden = value < 2;
    sp.style.left = `${value}%`;
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
      box.classList.toggle('n3', list.length >= 3);
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
      const pn = b.querySelector('.pname');
      // refit when the name or the card width changes (the SET FIELD button narrows the row)
      const fitKey = `${p.name}|${pn.clientWidth}`;
      if (pn.dataset.fit !== fitKey) { setFit(pn, p.name); pn.dataset.fit = `${p.name}|${pn.clientWidth}`; }
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
  fieldButton(on, onTap) {
    const b = $('fieldBtn'), changed = b.hidden === on;
    b.hidden = !on; this.onFieldBtn = on ? onTap : null;
    if (changed) for (const pn of document.querySelectorAll('#powers .pname')) { setFit(pn, pn.textContent); pn.dataset.fit = `${pn.textContent}|${pn.clientWidth}`; }
  }

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
      c.className = 'chip' + (id === opts.current ? ' on' : '');
      c.dataset.preset = id;
      c.textContent = name;
      c.addEventListener('click', e => { e.stopPropagation(); opts.onPreset(id); for (const x of box.children) x.classList.toggle('on', x === c); });
      box.append(c);
    }
    this.fieldNote('Drag a fielder to move them.', false);
  }
  editing(on) { $('hud').classList.toggle('editing', on); }
  fieldPreset(id) { for (const x of $('fieldPresets').children) x.classList.toggle('on', x.dataset.preset === id); }
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
  // Choose who bowls the next over. Resolves with the chosen player id.
  pickBowler({ over, left, options }) {
    return new Promise(resolve => {
      const box = document.createElement('div');
      box.className = 'overpick';
      const card = document.createElement('div');
      card.className = 'panel paper overpick-card';
      const h = document.createElement('h3');
      h.textContent = `Over ${over} · who bowls?`;
      const sub = document.createElement('p');
      sub.className = 'overpick-sub';
      sub.textContent = `${left} over${left === 1 ? '' : 's'} left · ${options[0]?.max ?? 2} max each, never two in a row`;
      card.append(h, sub);
      for (const o of options) {
        const b = document.createElement('button');
        b.className = `overpick-btn${o.star ? ' star' : ''}`;
        b.disabled = !o.ok;
        const name = document.createElement('b');
        name.textContent = `${o.star ? '★ ' : ''}${o.name}`;
        const type = document.createElement('span');
        type.textContent = o.type;
        const meta = document.createElement('small');
        meta.textContent = o.ok ? `${o.overs}/${o.max} overs${o.figs ? ` · ${o.figs}` : ''}` : o.why;
        b.append(name, type, meta);
        b.addEventListener('click', () => { box.remove(); resolve(o.id); });
        card.append(b);
      }
      box.append(card);
      $('hud').append(box);
    });
  }

  banterTimer(p) { $('banterBar').style.width = `${Math.max(0, p) * 100}%`; }
}
