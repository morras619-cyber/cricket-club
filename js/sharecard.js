import { drawFigure, POSES } from './figure.js';
import { heroById } from './heroes.js';
import { INK, FONT_DISPLAY, FONT_BODY, halftonePattern } from './fx.js';

const LINES = ['Bowler ko ghar bhejo!', 'Ek number shot!', 'Kya baat hai!', 'Shabash, hero!', 'Picture abhi baaki hai!', 'Aasmaan tak!'];

function panel(g, x, y, w, h, fill) {
  g.fillStyle = INK; g.fillRect(x + 10, y + 10, w, h);
  g.fillStyle = fill; g.fillRect(x, y, w, h);
  g.strokeStyle = INK; g.lineWidth = 8; g.strokeRect(x, y, w, h);
}

function fitText(g, text, maxW, size, font = FONT_DISPLAY) {
  let s = size;
  do { g.font = `${s}px ${font}`; s -= 4; } while (g.measureText(text).width > maxW && s > 20);
}

function comicText(g, text, x, y, size, fill, stroke, maxW, rot = 0) {
  g.save();
  g.translate(x, y); g.rotate(rot);
  fitText(g, text, maxW, size);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  const s = parseFloat(g.font);
  g.lineWidth = s * 0.24; g.strokeStyle = INK; g.strokeText(text, 8, 10);
  g.lineWidth = s * 0.14; g.strokeStyle = stroke; g.strokeText(text, 0, 0);
  g.fillStyle = fill; g.fillText(text, 0, 0);
  g.restore();
}

// summary: from Game.summary(); returns a 1080×1350 canvas.
export function renderShareCard(summary, playerName) {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const lead = summary.captain || Object.values(summary.team || {}).find(Boolean);
  const best = summary.moments[0] || { title: 'MATCH DAY!', word: 'SIXCHARGE!', heroId: lead?.id };
  const second = summary.moments.find(m => m !== best && m.kind !== best.kind) || summary.moments[1];
  const hero = heroById(best.heroId) || lead;

  // page
  g.fillStyle = '#101632'; g.fillRect(0, 0, W, H);
  g.fillStyle = halftonePattern(g, 'rgba(255,255,255,0.08)', 22, 4); g.fillRect(0, 0, W, H);

  // masthead
  comicText(g, 'SIXCHARGE!', 250, 70, 92, '#ffd23f', '#e8343b', 460, -0.04);
  g.fillStyle = '#3ec6ff'; g.strokeStyle = INK; g.lineWidth = 5;
  g.save(); g.translate(760, 70); g.rotate(0.03);
  g.fillRect(-250, -30, 500, 60); g.strokeRect(-250, -30, 500, 60);
  g.fillStyle = INK; g.font = `40px ${FONT_DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('SUPERHERO CRICKET', 0, 3);
  g.restore();

  // main panel
  const mx = 50, my = 140, mw = 980, mh = 800;
  panel(g, mx, my, mw, mh, hero.look.cape || '#1b1838');
  g.save();
  g.beginPath(); g.rect(mx, my, mw, mh); g.clip();
  const cx = mx + mw * 0.5, cy = my + mh * 0.55;
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    g.fillStyle = i % 2 ? hero.look.trim : hero.look.suit;
    g.globalAlpha = i % 2 ? 0.9 : 0.6;
    g.beginPath(); g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a) * 1400, cy + Math.sin(a) * 1400);
    g.lineTo(cx + Math.cos(a + Math.PI / 36) * 1400, cy + Math.sin(a + Math.PI / 36) * 1400);
    g.fill();
  }
  g.globalAlpha = 1;
  g.fillStyle = halftonePattern(g, 'rgba(20,16,24,0.18)', 16, 4); g.fillRect(mx, my, mw, mh);
  const pose = best.kind === 'catch' || best.kind === 'save' ? POSES.dive(-1) : best.kind === 'keeper' ? POSES.keeper([0, -30]) : best.kind === 'runout' ? POSES.bowl(0.7) : best.kind === 'wicket' || best.kind === 'twoWickets' ? POSES.celebrate() : POSES.bat(2.2);
  drawFigure(g, cx + 40, my + mh - 30, 600, hero.look, pose, { emblem: hero.emblem, batGlow: best.kind === 'ultimate' ? '#ff7a1a' : best.kind === 'powerSix' ? '#5fc8ff' : null });
  g.restore();
  comicText(g, best.word || 'WHAM!', mx + mw * 0.36, my + 150, 190, '#ffd23f', '#e8343b', mw * 0.7, -0.12);

  // speech bubble
  const line = hero.quote || LINES[(summary.seed || 0) % LINES.length];
  g.font = `600 40px ${FONT_BODY}`;
  const bw = Math.min(520, g.measureText(line).width + 60), bx = mx + mw - bw - 40, by = my + 300;
  g.fillStyle = '#fff4da'; g.strokeStyle = INK; g.lineWidth = 6;
  g.beginPath(); g.roundRect(bx, by, bw, 90, 40);
  g.moveTo(bx + bw * 0.3, by + 90); g.lineTo(bx + bw * 0.18, by + 160); g.lineTo(bx + bw * 0.45, by + 90);
  g.fill(); g.stroke();
  g.fillStyle = '#fff4da'; g.fillRect(bx + bw * 0.3 + 4, by + 84, bw * 0.15 - 6, 10);
  g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle';
  fitText(g, line, bw - 50, 40, FONT_BODY);
  g.font = `600 ${parseFloat(g.font)}px ${FONT_BODY}`;
  g.fillText(line, bx + bw / 2, by + 47);

  // caption box
  g.fillStyle = '#ffd23f'; g.strokeStyle = INK; g.lineWidth = 6;
  g.fillRect(mx + 30, my + mh - 150, 620, 120); g.strokeRect(mx + 30, my + mh - 150, 620, 120);
  g.fillStyle = INK; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  fitText(g, best.title, 580, 68);
  g.fillText(best.title, mx + 52, my + mh - 82);
  g.font = `700 32px ${FONT_BODY}`;
  g.fillText(`${hero.name}${best.ball ? ` · ball ${best.ball}` : ''}${best.detail ? ` · ${best.detail}` : ''}`.slice(0, 44), mx + 52, my + mh - 46);

  // strip of three panels
  const sy = 990, sh = 220, sw = 300;
  const inn = summary.innings.find(i => i.side === 'player') || summary.innings[0];
  const strips = [
    { head: summary.result.outcome === 'win' ? 'VICTORY!' : summary.result.outcome === 'tie' ? 'TIED!' : 'SO CLOSE!', body: summary.result.text, fill: summary.result.outcome === 'win' ? '#2ecc71' : '#e8343b' },
    { head: `${inn.runs}/${inn.wkts}`, body: `in ${inn.overs} overs`, fill: '#fff4da' },
    { head: second ? second.word : 'POWER UP', body: second ? second.title : `${summary.stats.powers} powers fired`, fill: '#3ec6ff' },
  ];
  strips.forEach((s, i) => {
    const x = 50 + i * (sw + 40);
    panel(g, x, sy, sw, sh, s.fill);
    g.fillStyle = INK; g.textAlign = 'center';
    fitText(g, s.head, sw - 30, 74);
    g.fillText(s.head, x + sw / 2, sy + 100);
    g.font = `700 28px ${FONT_BODY}`;
    const words = s.body.split(' '); let l1 = '', l2 = '';
    for (const w of words) { if (g.measureText(l1 + ' ' + w).width < sw - 30 && !l2) l1 = l1 ? l1 + ' ' + w : w; else l2 = l2 ? l2 + ' ' + w : w; }
    g.fillText(l1, x + sw / 2, sy + 150);
    if (l2) g.fillText(l2.slice(0, 22), x + sw / 2, sy + 185);
  });

  // footer
  g.fillStyle = '#fff4da'; g.textAlign = 'left'; g.font = `700 34px ${FONT_BODY}`;
  g.fillText(`${playerName || 'A Sixcharge hero'} · ${summary.myTeam?.name || Object.values(summary.team || {}).filter(Boolean).map(h => h.name).join(', ')}`.slice(0, 60), 50, 1275);
  comicText(g, 'CAN YOU BEAT THIS?', 790, 1300, 52, '#ffd23f', '#e8343b', 500, -0.03);
  return c;
}
