// The club map: your club's estate seen from above (img/map, tools/build_map.py), the hub of the Super League career.
// The empty estate is one picture; each building is a cut-out in a grey ramp plus a tint picture (R the club's main colour,
// G its trim), painted here in the club's colours like the own ground (ownground.js). You drag and pinch to move and zoom;
// tap a building to select it. Which building does what is main.js's (setBuildings).
const MAP_W = 1536, MAP_H = 2304;   // the base picture
const GREY = 0.7;                   // the grey every club-coloured surface was made in (tools/build_map.py)
// where each building stands: its picture's middle as a share of the map, and how wide it is drawn as a share of the map's width
// (fitted to the plots in the base picture: the building's base on the plot's ground, inside its walls)
const SITES = {
  stadium:  { x: 0.505, y: 0.465, w: 0.373 },
  training: { x: 0.317, y: 0.194, w: 0.318 },
  apartment:{ x: 0.706, y: 0.242, w: 0.296 },
  office:   { x: 0.222, y: 0.344, w: 0.359 },
  academy:  { x: 0.787, y: 0.380, w: 0.338 },
  medical:  { x: 0.211, y: 0.584, w: 0.374 },
  clubhouse:{ x: 0.796, y: 0.601, w: 0.377 },
  shop:     { x: 0.238, y: 0.744, w: 0.388 },
};
const ORDER = Object.keys(SITES).sort((a, b) => SITES[a].y - SITES[b].y);   // far to near, the near ones painted over the far
// where each building is in img/map/buildings.webp (and its tint in buildings-tint.webp): [row, height], all 1100 wide (tools/build_map.py)
const ATLAS = {"stadium": [0, 681], "training": [681, 714], "office": [1395, 704], "apartment": [2099, 732], "medical": [2831, 660], "academy": [3491, 743], "clubhouse": [4234, 702], "shop": [4936, 709]};
const AW = 1100;
const rgbOf = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const load = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
const frame = () => new Promise(r => setTimeout(r, 0));

// one building painted in the club's colours: a canvas, and where it is solid (a coarse alpha grid, for taps)
function paint(base, tint, id, club) {
  const [row, h] = ATLAS[id], w = AW;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(base, 0, row, w, h, 0, 0, w, h);
  const B = g.getImageData(0, 0, w, h), o = B.data;
  g.clearRect(0, 0, w, h); g.drawImage(tint, 0, row, w, h, 0, 0, w, h);
  const T = g.getImageData(0, 0, w, h).data;
  const su = rgbOf(club.suit).map(v => v / (255 * GREY)), tr = rgbOf(club.trim).map(v => v / (255 * GREY));
  for (let i = 0; i < o.length; i += 4) {
    const s = T[i] / 255, t = T[i + 1] / 255;
    if (s + t < 0.004) continue;
    const rest = 1 - s - t;
    o[i] *= rest + su[0] * s + tr[0] * t; o[i + 1] *= rest + su[1] * s + tr[1] * t; o[i + 2] *= rest + su[2] * s + tr[2] * t;
  }
  g.putImageData(B, 0, 0);
  const K = 4, gw = Math.ceil(w / K), gh = Math.ceil(h / K), solid = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) solid[y * gw + x] = o[((y * K) * w + x * K) * 4 + 3] > 60 ? 1 : 0;
  return { canvas: c, w, h, solid, gw, gh, K };
}

export function createClubMap(canvas, { onSelect, onFirstDraw } = {}) {
  const g = canvas.getContext('2d');
  let base = null, sheets = null, club = null, info = {}, selected = null, shown = false, dirty = false, session = 0;
  const art = {};              // id -> { canvas, solid ... }
  const cache = new Map();     // 'suit|trim' -> art (the last club painted stays)
  let vw = 1, vh = 1, dpr = 1, scale = 1, minScale = 0, maxScale = 3, ox = 0, oy = 0;   // the camera: map px * scale + offset = css px
  const pointers = new Map();
  let tap = null, pinch = null;

  const clamp = () => {
    scale = Math.max(minScale, Math.min(maxScale, scale));
    const mw = MAP_W * scale, mh = MAP_H * scale;
    ox = mw <= vw ? (vw - mw) / 2 : Math.max(vw - mw, Math.min(0, ox));
    oy = mh <= vh ? (vh - mh) / 2 : Math.max(vh - mh, Math.min(0, oy));
  };
  const redraw = () => { if (!dirty) { dirty = true; requestAnimationFrame(draw); } };
  const toMap = (px, py) => [(px - ox) / scale, (py - oy) / scale];
  const rectOf = id => { const S = SITES[id], a = art[id]; if (!a) return null; const w = S.w * MAP_W, h = w * a.h / a.w; return { x: S.x * MAP_W - w / 2, y: S.y * MAP_H - h / 2, w, h }; };

  function fit() {
    const r = canvas.getBoundingClientRect();
    vw = Math.max(1, r.width); vh = Math.max(1, r.height); dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
    const first = minScale === 0;
    minScale = vw / MAP_W;   // the whole estate across the screen (a tall phone has the map's own night above and below) maxScale = minScale * 2.4;
    if (first) { scale = minScale; ox = (vw - MAP_W * scale) / 2; oy = (vh - MAP_H * scale) / 2; }
    clamp(); redraw();
  }

  function label(id, r) {
    const b = info[id]; if (!b) return;
    const sx = (r.x + r.w / 2) * scale + ox, sy = (r.y + r.h * 0.9) * scale + oy;
    const small = scale < minScale * 1.35;
    g.font = `${small ? 11 : 13}px Bangers, Impact, sans-serif`;
    const tw = g.measureText(b.name.toUpperCase()).width, pw = tw + 16, ph = small ? 17 : 20;
    g.save();
    g.lineJoin = 'round';
    g.beginPath(); g.roundRect(sx - pw / 2, sy - ph / 2, pw, ph, 6);
    g.fillStyle = id === selected ? '#ffd23f' : 'rgba(10,14,40,.88)'; g.fill();
    g.lineWidth = 1.5; g.strokeStyle = b.soon ? 'rgba(255,255,255,.35)' : '#ffd23f'; g.stroke();
    g.fillStyle = id === selected ? '#14102a' : b.soon ? 'rgba(255,255,255,.6)' : '#fff';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(b.name.toUpperCase(), sx, sy + 0.5);
    if (b.badge) {   // a dot: something to do here
      g.beginPath(); g.arc(sx + pw / 2 - 1, sy - ph / 2 + 1, 5, 0, 7);
      g.fillStyle = '#ff4d5e'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#fff'; g.stroke();
    }
    g.restore();
  }

  function draw() {
    dirty = false;
    if (!shown) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#0a0a1c'; g.fillRect(0, 0, vw, vh);
    if (!base) return;
    g.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
    g.imageSmoothingQuality = 'high';
    g.drawImage(base, 0, 0, MAP_W, MAP_H);
    for (const [y0, y1, a, b] of [[0, 220, 1, 0], [MAP_H - 300, MAP_H, 0, 1]]) {   // the map's top and bottom fade into the night
      const f = g.createLinearGradient(0, y0, 0, y1); f.addColorStop(0, `rgba(10,10,28,${a})`); f.addColorStop(1, `rgba(10,10,28,${b})`);
      g.fillStyle = f; g.fillRect(0, y0, MAP_W, y1 - y0);
    }
    for (const id of ORDER) {
      const a = art[id], r = rectOf(id);
      if (!a) continue;
      if (id === selected) { g.save(); g.shadowColor = '#ffd23f'; g.shadowBlur = 28; g.drawImage(a.canvas, r.x, r.y, r.w, r.h); g.restore(); }
      g.drawImage(a.canvas, r.x, r.y, r.w, r.h);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const id of ORDER) { const r = rectOf(id); if (r) label(id, r); }
  }

  function hit(px, py) {
    const [mx, my] = toMap(px, py);
    for (const id of [...ORDER].reverse()) {
      const r = rectOf(id); if (!r) continue;
      // the label counts too
      const lx = (r.x + r.w / 2) * scale + ox, ly = (r.y + r.h * 0.9) * scale + oy;
      if (info[id] && Math.abs(px - lx) < 44 && Math.abs(py - ly) < 13) return id;
      if (mx < r.x || my < r.y || mx > r.x + r.w || my > r.y + r.h) continue;
      const a = art[id], gx = Math.floor((mx - r.x) / r.w * a.w / a.K), gy = Math.floor((my - r.y) / r.h * a.h / a.K);
      if (a.solid[gy * a.gw + gx]) return id;
    }
    return null;
  }

  const zoomAt = (px, py, k) => { const [mx, my] = toMap(px, py); scale *= k; clamp(); const s = scale; ox = px - mx * s; oy = py - my * s; clamp(); redraw(); };
  const local = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId, local(e));
    if (pointers.size === 1) tap = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
    else { tap = null; const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1 }; }
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId), now = local(e);
    pointers.set(e.pointerId, now);
    if (pointers.size === 1) {
      ox += now[0] - prev[0]; oy += now[1] - prev[1]; clamp();
      if (tap) tap.moved = Math.max(tap.moved, Math.hypot(e.clientX - tap.x, e.clientY - tap.y));
    } else if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
      zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, d / pinch.d);
      pinch.d = d;
    }
    redraw(); e.preventDefault();
  });
  const up = e => {
    const had = pointers.delete(e.pointerId);
    if (!had) return;
    if (pointers.size < 2) pinch = null;
    if (tap && e.type === 'pointerup' && tap.moved < 10 && performance.now() - tap.t < 600) {
      const [px, py] = local(e), id = hit(px, py);
      selected = id; redraw();
      onSelect?.(id);
    }
    if (pointers.size === 0) tap = null;
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => { e.preventDefault(); const [px, py] = local(e); zoomAt(px, py, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  addEventListener('resize', () => { if (shown) fit(); });

  return {
    // buildings: { id: { name, soon, badge } }
    setInfo(b) { info = b; redraw(); },
    select(id) { selected = id; redraw(); },
    focus(id, zoom = 1.8) {
      const r = rectOf(id); if (!r) return;
      scale = minScale * zoom; clamp(); ox = vw / 2 - (r.x + r.w / 2) * scale; oy = vh / 2 - (r.y + r.h / 2) * scale; clamp(); redraw();
    },
    reset() { scale = minScale; clamp(); redraw(); },
    get ready() { return ORDER.every(id => art[id]); },
    // the map for a club (its colours); the base shows at once, the buildings as each is painted
    async open(c) {
      shown = true; club = c; selected = null; const mine = ++session;
      fit(); redraw();
      if (!base) { base = await load('img/map/base.webp').catch(() => null); redraw(); }
      const key = `${c.suit}|${c.trim}`;
      if (cache.has(key)) { for (const id of ORDER) art[id] = cache.get(key)[id]; redraw(); onFirstDraw?.(); return; }
      const set = {};
      sheets ||= await Promise.all([load('img/map/buildings.webp'), load('img/map/buildings-tint.webp')]);
      if (mine !== session) return;
      for (const id of [...ORDER].sort((a, b) => (a === 'stadium' ? -1 : b === 'stadium' ? 1 : 0))) {
        set[id] = art[id] = paint(sheets[0], sheets[1], id, club); redraw(); await frame();
        if (mine !== session) return;
      }
      cache.clear(); cache.set(key, set);
      onFirstDraw?.();
    },
    close() { shown = false; session++; },
  };
}
