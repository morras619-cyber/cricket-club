// Challenge links: the hash carries a compact base64url payload, e.g. https://…/#cAbC123…
// Only letters, digits, '-' and '_' are used, so the token survives hosts that keep a bare #anchor.

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36).slice(0, 4);
}

const b64url = s => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = s => atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));

// c: { seed, target (runs to beat), wkts, balls, name, squad: [bat, bowl, field], moment }
export function encodeChallenge(c) {
  const body = [c.seed >>> 0, c.target, c.wkts, c.balls, (c.name || 'A friend').slice(0, 14), c.squad.join('.'), c.moment || ''].join('~');
  const raw = encodeURIComponent(body);
  return 'c' + b64url(raw + '~' + hash(raw));
}

export function decodeChallenge(token) {
  try {
    if (!token || token[0] !== 'c') return null;
    const raw = unb64url(token.slice(1));
    const cut = raw.lastIndexOf('~');
    const body = raw.slice(0, cut);
    if (hash(body) !== raw.slice(cut + 1)) return null;
    const [seed, target, wkts, balls, name, squad, moment] = decodeURIComponent(body).split('~');
    const c = { seed: Number(seed) >>> 0, target: Number(target), wkts: Number(wkts), balls: Number(balls), name, squad: squad.split('.'), moment };
    if (!Number.isFinite(c.target) || c.squad.length !== 3) return null;
    return c;
  } catch {
    return null;
  }
}
