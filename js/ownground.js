// Your own club's ground (create-your-club), at its level: rendered in Blender in plain grey
// (tools/blender/ownground.py) and painted here in the club's colours. For each view there are
// three pictures: the ground (view-<v>.webp), where the colours go (-tint: R the main colour,
// G the trim, as weights) and where the crest pictures go (-uv: B the picture, R and G where in it).
// The painted views are then used like any other built ground (scene.js).
const GREY = 0.7; // the grey every club-coloured surface was rendered in
// the crest pictures, by id: their size in metres (as ownground.py builds them)
const PICS = { 1: [7.0, 0.95], 2: [6.0, 1.8], 3: [4.6, 4.6], 4: [13.0, 6.5], 5: [27.0, 27 * 210 / 494], 6: [9.0, 4.4] };

const load = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
function pixels(img, w = img.naturalWidth || img.width, h = img.naturalHeight || img.height) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  c.width = c.height = 0;
  return d;
}
const rgbOf = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const css = (c, k = 1) => `rgb(${c.map(v => Math.round(v * k)).join(',')})`;

// the name in the comic display font, fitted to a box
function fitText(g, text, x, y, w, h, fill, lines = 2) {
  const words = text.toUpperCase().split(/\s+/);
  const rows = words.length > 1 && lines > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [words.join(' ')];
  let size = h / rows.length * 0.92;
  g.font = `${size}px Bangers, Impact, sans-serif`;
  const widest = Math.max(...rows.map(r => g.measureText(r).width));
  if (widest > w) { size *= w / widest; g.font = `${size}px Bangers, Impact, sans-serif`; }
  g.textAlign = 'left'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  rows.forEach((r, i) => {
    const ty = y + h / 2 + (i - (rows.length - 1) / 2) * size * 1.02;
    g.lineWidth = size * 0.14; g.strokeStyle = '#141018'; g.strokeText(r, x, ty);
    g.fillStyle = fill; g.fillText(r, x, ty);
  });
}

// the crest pictures for a club: { id: { w, h, d (pixels) } }
function pictures(club, crest) {
  const su = rgbOf(club.suit), tr = rgbOf(club.trim), out = {};
  for (const [id, [mw, mh]] of Object.entries(PICS)) {
    const W = id === '5' || id === '4' || id === '6' ? 768 : 384, H = Math.max(8, Math.round(W * mh / mw));
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const cs = Math.min(H, W) * (id === '3' ? 0.98 : 0.84);
    if (id === '1' || id === '2') {
      // a board, a band panel: the crest on the club's colour, darkened
      g.fillStyle = css(su, id === '1' ? 0.32 : 0.45); g.fillRect(0, 0, W, H);
      g.fillStyle = css(tr); g.fillRect(0, H * 0.9, W, H * 0.1);
      if (crest) g.drawImage(crest, (W - cs) / 2, (H - cs) / 2, cs, cs);
    } else if (id === '3') {
      if (crest) g.drawImage(crest, (W - cs) / 2, (H - cs) / 2, cs, cs);
    } else {
      // a screen, a scoreboard, the sign: the crest and the club's name on a framed plate
      const r = H * 0.12, b = H * 0.05, sign = id === '5';
      g.beginPath(); g.roundRect(b / 2, b / 2, W - b, H - b, r);
      g.fillStyle = sign ? css(su, 0.55) : '#0b0f26'; g.fill();
      g.lineWidth = b; g.strokeStyle = css(tr); g.stroke();
      if (!sign) { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, css(su, 0.45)); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fill(); }
      const k = H * 0.72;
      if (crest) g.drawImage(crest, W * 0.05, (H - k) / 2, k, k);
      fitText(g, club.name, W * 0.07 + k, H * 0.14, W * 0.88 - k, H * 0.72, css(tr));
    }
    out[id] = { w: W, h: H, d: g.getImageData(0, 0, W, H).data };
    c.width = c.height = 0;
  }
  return out;
}

// one view painted: the grey ground, the colours, the crest pictures
function paint(base, tint, uv, w, h, club, pics) {
  const B = pixels(base, w, h), T = pixels(tint, w, h), U = pixels(uv, w, h);
  const su = rgbOf(club.suit).map(v => v / (255 * GREY)), tr = rgbOf(club.trim).map(v => v / (255 * GREY));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), img = g.createImageData(w, h), o = img.data;
  for (let i = 0; i < o.length; i += 4) {
    const s = T[i] / 255, t = T[i + 1] / 255, rest = 1 - s - t;
    let r = B[i], gg = B[i + 1], b = B[i + 2];
    if (s + t > 0.004) {
      r *= rest + su[0] * s + tr[0] * t; gg *= rest + su[1] * s + tr[1] * t; b *= rest + su[2] * s + tr[2] * t;
    }
    const id = Math.round(U[i + 2] / 40);
    if (id > 0 && pics[id]) {
      const P = pics[id], px = Math.min(P.w - 1, (U[i] / 255 * (P.w - 1)) | 0), py = Math.min(P.h - 1, ((1 - U[i + 1] / 255) * (P.h - 1)) | 0);
      const j = (py * P.w + px) * 4, a = P.d[j + 3] / 255;
      r = r * (1 - a) + P.d[j] * a; gg = gg * (1 - a) + P.d[j + 1] * a; b = b * (1 - a) + P.d[j + 2] * a;
    }
    o[i] = r; o[i + 1] = gg; o[i + 2] = b; o[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}
const frame = () => new Promise(r => setTimeout(r, 0));

// The whole ground for a club at a level: { bat, bowl, keeper, top } as canvases. One view at a
// time, so the phone never holds more than one view's pixels at once.
// (art 'nets': the cricket nets, whose own pictures stand for the bat, bowl and keeper cameras; the view from above is the club's ground at that level)
export async function paintGround(level, club, crestSrc, views = ['bat', 'bowl', 'keeper', 'top'], art = 'own') {
  const dirOf = v => `img/ground/${v === 'top' ? 'own' : art}${level}/`;
  await document.fonts?.load?.('40px Bangers').catch(() => {});
  const crest = await load(crestSrc).catch(() => null);
  const pics = pictures(club, crest), out = {};
  for (const v of views) {
    const [base, tint, uv] = await Promise.all(['', '-tint', '-uv'].map(x => load(`${dirOf(v)}view-${v}${x}.webp`)));
    out[v] = paint(base, tint, uv, base.naturalWidth, base.naturalHeight, club, pics);
    await frame();
  }
  return out;
}

// A small picture of the ground from the batter's end, for the stadium card
export async function stadiumThumb(level, club, crestSrc) {
  const dir = `img/ground/own${level}/`;
  await document.fonts?.load?.('40px Bangers').catch(() => {});
  const [crest, base, tint, uv] = await Promise.all([load(crestSrc).catch(() => null), ...['', '-tint', '-uv'].map(x => load(`${dir}thumb${x}.webp`))]);
  return paint(base, tint, uv, base.naturalWidth, base.naturalHeight, club, pictures(club, crest));
}
