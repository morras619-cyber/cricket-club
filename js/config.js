// Tuning values. Numbers follow the Sixcharge GDD; tweak here, not in game code.
export const CFG = {
  balls: 30,
  wickets: 3,

  // Batting timing half-windows in ms of ball time (GDD: perfect ±40, good ±80, early/late ±150, edge to 220).
  // touchSlackMs is added to every window to absorb touch-screen latency.
  timing: { perfect: 40, good: 80, okay: 150, edge: 220, defend: 230 },
  touchSlackMs: 20,

  // Simulated ball speed = real speed × paceScale, so a 140 km/h ball takes ~1 s to arrive.
  paceScale: 0.5,
  paceSpread: 1.35,

  bowling: { perfect: 35, good: 75, loose: 125, runupMs: 1100 },

  charge: {
    max: 100,
    tiers: [30, 60, 100],
    sources: {
      perfectBat: 8, goodBat: 4, four: 6, six: 10, edgeSurvived: 3,
      dot: 4, perfectRelease: 6, wicket: 15,
      catch: 12, diveBonus: 6, directHit: 15, longThrowBonus: 5,
      boundarySave: 8, keeperDismissal: 14,
    },
    streakStep: 2, streakCap: 10,
    overheatAt: 60, overheatDecay: 1,
    wicketLoss: 20,
    carryPct: 0.25, carryMax: 25,
    finaleFrom: 25, finaleDiscount: 0.2,
  },

  fielding: {
    cap: 6, minP: 0.05, maxP: 0.9,
    keeperWindow: 800, elasticWindow: 1000, keeperClean: 200, slowmo: 0.35,
    catchPerfect: 240, catchGood: 420, rejuggleMs: 700,
    collectWindow: 200, stumpWindow: 400,
    runSpeed: 7, react: 0.25, catchRun: 4.2, catchReact: 0.7, reach: 1.3, diveReach: 2.4, catchDive: 1.0, throwSpeed: 28,
  },

  ground: { boundaryR: 62, centerY: 10, pitch: 20 },
  running: { first: 2.6, next: 2.4 },
  phases: [
    { name: 'Power Burst', from: 1, to: 12 },
    { name: 'Middle Battle', from: 13, to: 24 },
    { name: 'Super Over Finale', from: 25, to: 30 },
  ],
};

export function phaseFor(ballNo) {
  return CFG.phases.find(p => ballNo >= p.from && ballNo <= p.to) || CFG.phases[2];
}
