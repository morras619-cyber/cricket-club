// Graphics quality. 'low' drops glows, light beams and dense crowds for budget phones.
const KEY = 'sixcharge.quality';
const MAX_RENDER_PIXELS = 8_000_000;
const MAX_RENDER_EDGE = 4096;
function detect() {
  const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  return mem <= 2 || cores <= 2 ? 'low' : 'high';
}
let level = (() => { try { const saved = localStorage.getItem(KEY); return saved === 'low' || saved === 'high' ? saved : detect(); } catch { return detect(); } })();
export const quality = {
  get level() { return level; },
  get high() { return level === 'high'; },
  // More backing pixels on capable devices, with hard limits to avoid oversized mobile canvases.
  renderDpr(width, height) {
    const native = Math.max(1, window.devicePixelRatio || 1);
    const requested = Math.min(level === 'high' ? 2.5 : 2, native);
    const areaLimit = Math.sqrt(MAX_RENDER_PIXELS / Math.max(1, width * height));
    const edgeLimit = MAX_RENDER_EDGE / Math.max(1, width, height);
    return Math.max(1, Math.min(requested, areaLimit, edgeLimit));
  },
  set(v) { if (v !== 'low' && v !== 'high') return; level = v; try { localStorage.setItem(KEY, v); } catch { /* ignore */ } },
};
