// Watches the frame rate and steps the optional ground effects (the Foundry's smoke) down on a device
// that can't keep up: 0 full, 1 lighter, 2 off. It only ever steps down in a session, so it can't flap.
const SLOW = 26, OK = 22, HOLD = 3000, GAP = 250;   // ms per frame (under ~38 fps is slow), ms of slowness, a pause
export function makeEffectLevel() {
  let last = null, avg = 16.7, slow = 0, level = 0;
  return t => {
    if (last !== null) {
      const dt = t - last;
      if (dt > 0 && dt < GAP) {                       // (a pause or a hidden tab isn't slowness)
        avg += (dt - avg) * 0.1;
        slow = avg > SLOW ? slow + dt : avg < OK ? 0 : slow;
        if (slow > HOLD && level < 2) { level++; slow = 0; avg = 16.7; }
      }
    }
    last = t;
    return level;
  };
}
