import { portrait } from './figure.js';
import { portraitFace } from './futcard.js';
import { faceEl } from './looks.js';
import { musicWanted } from './audio.js';
import { drawEffect } from './fx.js';
import { logoSrc } from './teams.js';
import { tiredness } from './stamina.js';

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
    this.screens = ['title', 'home', 'pitches', 'settings', 'shop', 'pass', 'region', 'pickteam', 'makeclub', 'squad', 'stats', 'toss', 'cover', 'pause', 'result', 'league', 'daily', 'trophies', 'career', 'clubmap', 'records', 'war'];
    this.portraits = new Map();
    this.bannerTimer = 0;
    this.powerKeys = '';
    $('fieldBtn').addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); this.onFieldBtn?.(); });
    $('shotBtn').addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); if (this.onShotBtn) this.setShot(this.onShotBtn()); });
    $('fieldDone').addEventListener('click', e => { e.stopPropagation(); this.onFieldDone?.(); });
    $('btnSmack').addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); this.onBanter?.('smack'); });
    $('btnCool').addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); this.onBanter?.('cool'); });
  }

  show(id) {
    for (const s of this.screens) $(s).hidden = s !== id;
    musicWanted(!!id && !['toss', 'pause', 'result'].includes(id));   // (the menu music plays on the menu screens, not at the toss, the pause or the result)
  }
  hud(on) { $('hud').hidden = !on; if (on) musicWanted(false); }
  // the heat between this batter and bowler: a bar under the scorecard (null hides it)
  heat(info) {
    let box = $('heatMeter');
    if (!box) {
      if (!info) return;
      box = document.createElement('div'); box.id = 'heatMeter'; box.className = 'heat';
      box.innerHTML = '<b class="heat-label"></b><div class="heat-bar"><i></i></div>';
      $('hud').append(box);
    }
    box.hidden = !info || (info.frac <= 0.02 && !info.hot);
    if (!info) return;
    box.querySelector('.heat-label').textContent = info.hot ? `FACE-OFF! · ${info.label}` : `HEAT · ${info.label}`;
    box.querySelector('i').style.width = `${Math.round(Math.min(1, info.frac) * 100)}%`;
    box.classList.toggle('hot', !!info.hot);
  }

  score(inn, { label, need, phase, heroLine = '', logo, stam = null }) {
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
    if (stam) {
      for (const [id, e, name] of [['stamBat', stam.bat, 'batter'], ['stamBowl', stam.bowl, 'bowler']]) {
        const el = $(id), v = Math.round(e), t = tiredness(e);
        el.firstElementChild.textContent = t >= 0.5 ? 'TIRED' : id === 'stamBat' ? 'BAT' : 'BOWL';
        el.classList.toggle('tired', t >= 0.5); el.classList.toggle('low', t > 0 && t < 0.5);
        el.firstElementChild.nextElementSibling.firstElementChild.style.width = `${v}%`;
        el.title = `${name} stamina ${v}`;
      }
    }
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
    $('vsA').src = logoSrc(a); $('vsB').src = logoSrc(b);
    $('bannerVs').hidden = false;
  }
  // face: an optional portrait canvas, or a player card, shown above the text (a new batter, the bowler of the over)
  // look: an optional heading style, { cls, color } (the openers' heading in the cards' lettering)
  banner(head, sub = '', ms = 1300, face = null, look = null) {
    let slot = $('bannerFace');
    if (!slot) { slot = document.createElement('div'); slot.id = 'bannerFace'; slot.className = 'banner-face'; $('banner').prepend(slot); }
    slot.innerHTML = '';
    slot.hidden = !face;
    slot.classList.toggle('has-card', !!face && !(face instanceof HTMLCanvasElement));
    if (face instanceof HTMLCanvasElement) { const c = document.createElement('canvas'); c.width = face.width; c.height = face.height; c.getContext('2d').drawImage(face, 0, 0); slot.append(c); }
    else if (face) slot.append(face); // a player card
    const bh = $('bannerHead');
    bh.textContent = head;
    bh.className = look?.cls || '';
    bh.style.setProperty('--head', look?.color || '');
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

  // electricity crawling along a full charge bar: set is the team's effect set, or null to stop
  chargeZap(set, t) {
    let c = $('chargeZap');
    if (!set) { if (c && !c.hidden) c.hidden = true; return; }
    const bar = $('charge');
    if (!c) { c = document.createElement('canvas'); c.id = 'chargeZap'; c.className = 'charge-zap'; bar.append(c); }
    c.hidden = false;
    const W = bar.clientWidth + 24, H = bar.clientHeight + 24, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (Math.floor(t / 60) % 3 === 2) return; // it flickers
    const n = Math.max(2, Math.round(W / 90)), seed = Math.floor(t / 110);
    for (let i = 0; i < n; i++) {
      const r = ((seed * 7 + i * 13) % 17) / 17;
      drawEffect(g, set, 'zigzag', 12 + (i + 0.5) * ((W - 24) / n) + (r - 0.5) * 20, H / 2 + (r - 0.5) * 6, { w: (W - 24) / n * 1.15, h: H * 0.95, alpha: 0.65 + 0.35 * r, flip: (seed + i) % 2 === 0 });
    }
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
      box.classList.toggle('n4', list.length === 4);
      box.classList.toggle('n5', list.length >= 5);   // (four or more: narrow cards, the face over the name)
      for (const p of list) {
        const b = document.createElement('button');
        b.className = p.key.startsWith('cnt-') ? 'power cnt' : 'power';   // (cnt: an answer to a power, swapped in for a few seconds)
        b.dataset.key = p.key;
        // the hero's painted face in the club's colours (it draws itself once its picture has loaded); the drawn figure if he has none
        const face = (p.player && (portraitFace(p.player, p.team || null, 40) || faceEl(p.player, p.team || { suit: '#f3efe2', trim: '#3a3a4a' }, 40, 'face'))) || (p.hero?.id && portraitFace({ heroId: p.hero.id }, p.team || null, 40));
        if (face) { face.className = 'powerface'; b.append(face); }
        else {
          const pc = this.portraitFor(p.hero, p.pose).cloneNode();
          pc.getContext('2d').drawImage(this.portraitFor(p.hero, p.pose), 0, 0);
          b.append(pc);
        }
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
      const label = list.length >= 5 && p.short ? p.short : p.name;   // (a crowded row: the one-word names)
      const fitKey = `${label}|${pn.clientWidth}`;
      if (pn.dataset.fit !== fitKey) { setFit(pn, label); pn.dataset.fit = `${label}|${pn.clientWidth}`; }
      b.querySelector('.pcost').textContent = p.state === 'armed' ? 'ARMED' : p.cost == null ? (p.sub || '') : `${p.cost} ⚡`;
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

  // ---------- batting: GROUND / LOFT ----------
  // onTap flips the choice and returns the new one (true = loft)
  shotButton(on, loft = false, onTap = null) {
    const b = $('shotBtn'), changed = b.hidden === on;
    b.hidden = !on; this.onShotBtn = on ? onTap : null;
    if (on) this.setShot(loft);
    if (changed) for (const pn of document.querySelectorAll('#powers .pname')) { setFit(pn, pn.textContent); pn.dataset.fit = `${pn.textContent}|${pn.clientWidth}`; }
  }
  setShot(loft) {
    const b = $('shotBtn');
    b.classList.toggle('loft', !!loft);
    b.setAttribute('aria-pressed', loft ? 'true' : 'false');
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

  // While you may answer a power fired at you, a timer bar sits over the buttons (the buttons themselves are the powers row, swapped: game.js)
  counterBar(on) {
    let bar = $('counterTimerBar');
    if (!bar) {
      if (!on) return;
      bar = document.createElement('div'); bar.id = 'counterTimerBar'; bar.className = 'banter-timer counter-timer'; bar.hidden = true;
      bar.innerHTML = '<i id="counterBar"></i>';
      $('powers').closest('.actionrow').before(bar);
    }
    bar.hidden = !on;
    $('hint').classList.toggle('up', on);   // (the timer bar makes the row taller: the hint rises with it)
  }
  counterTimer(p) { const b = $('counterBar'); if (b) b.style.width = `${Math.max(0, p) * 100}%`; }
  banterTimer(p) { $('banterBar').style.width = `${Math.max(0, p) * 100}%`; }
}
