// Graphics quality. 'low' drops glows, light beams and dense crowds for budget phones.
const KEY = 'sixcharge.quality';
function detect() {
  const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  return mem <= 2 || cores <= 2 ? 'low' : 'high';
}
let level = (() => { try { return localStorage.getItem(KEY) || detect(); } catch { return detect(); } })();
export const quality = {
  get level() { return level; },
  get high() { return level === 'high'; },
  set(v) { level = v; try { localStorage.setItem(KEY, v); } catch { /* ignore */ } },
};
