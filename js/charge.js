import { CFG } from './config.js';

// The Charge Meter: 0–100, tiers at 30 / 60 / 100. Pure logic; the UI subscribes with on().
export class Charge {
  constructor(value = 0, cfg = CFG.charge) {
    this.cfg = cfg;
    this.value = value;
    this.streak = 0;
    this.listeners = [];
  }

  on(fn) { this.listeners.push(fn); }
  emit(ev) { for (const fn of this.listeners) fn(ev); }

  tier(v = this.value) {
    return this.cfg.tiers.filter(t => v >= t).length;
  }

  add(amount, label = '') {
    if (!amount) return 0;
    const before = this.value;
    this.value = Math.max(0, Math.min(this.cfg.max, this.value + amount));
    const gained = this.value - before;
    const crossed = this.tier() > this.tier(before) ? this.cfg.tiers[this.tier() - 1] : 0;
    this.emit({ type: amount > 0 ? 'gain' : 'loss', amount: gained, label, value: this.value, crossed });
    return gained;
  }

  award(source, label) {
    return this.add(this.cfg.sources[source] || 0, label);
  }

  // Call once per batting/bowling timing result. Returns the streak bonus added.
  timingStreak(isPerfect) {
    if (!isPerfect) { this.streak = 0; return 0; }
    this.streak++;
    const bonus = Math.min(this.cfg.streakCap, (this.streak - 1) * this.cfg.streakStep);
    if (bonus) this.add(bonus, `STREAK x${this.streak}`);
    return bonus;
  }

  cost(base, ballNo) {
    return ballNo >= this.cfg.finaleFrom ? Math.round(base * (1 - this.cfg.finaleDiscount)) : base;
  }

  canAfford(base, ballNo) { return this.value >= this.cost(base, ballNo); }

  spend(base, ballNo, label = 'POWER') {
    const c = this.cost(base, ballNo);
    if (this.value < c) return false;
    this.value -= c;
    this.emit({ type: 'spend', amount: c, label, value: this.value, crossed: 0 });
    return true;
  }

  // Overheat: above 60 the meter leaks 1 per dot ball faced or conceded.
  dot() {
    if (this.value > this.cfg.overheatAt) this.add(-this.cfg.overheatDecay, 'OVERHEAT');
  }

  wicketLost() { this.add(-this.cfg.wicketLoss, 'WICKET −20'); }

  // a swing and a miss
  missed() { this.add(-(this.cfg.missLoss || 0), `MISSED −${this.cfg.missLoss}`); }

  carryOver() {
    return Math.min(this.cfg.carryMax, Math.floor(this.value * this.cfg.carryPct));
  }
}
