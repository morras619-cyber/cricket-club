// Sledges, comebacks and compliments. Keyed by hero id where a hero has their own voice.
export const LINES = {
  // you (bowling) after a good ball
  sledge: {
    zara: ['Blink and you\'re back in the hut.', 'That one had your name on it.', 'Next one\'s faster. Pack your kit.', 'Too quick for you? Get used to it.'],
    babar: ['Beta, the ball is smarter than you today.', 'Even my grandson reads that one.', 'Arre, it turned! Who knew?', 'Patience, beta. The next one bites.'],
    imran: ['Calculated.', 'Probability of you surviving: low.', 'Predictable.', 'Error detected: your footwork.'],
    generic: ['Bas itna hi?', 'Hit it if you can!', 'Ghar jaana hai kya?', 'Watch the ball, hero.'],
  },
  sendoff: ['Walk, hero. The pavilion is that way.', 'Bye-bye! Wave to the crowd.', 'Next!'],
  departing: ['Lucky ball. Just lucky.', 'I\'ll be back. Remember that.', 'Hmph.'],
  // AI batter reacting to a sledge
  fired: {
    raja: ['Bas? Next one\'s going to Karachi!', 'Oh, now you\'ve done it. Aasmaan tak!', 'Say that again after this six!'],
    meher: ['Careful. I bite back.', 'Noted. Payback incoming.'],
    comet: ['Picture abhi baaki hai, mere dost!', 'You\'ve woken the comet.'],
    generic: ['Now it\'s personal.', 'Wrong batter to annoy!'],
  },
  rattled: ['…', 'Lucky ball. Just lucky.', 'Uh… fine. Fine.', 'Who said that?!', 'Just bowl, yaar.'],
  unfazed: {
    meher: ['Cute. Bowl faster.', 'Is that your best line? The bowling or the talking?'],
    generic: ['Whatever you say, bowler.', 'Heard better in gully cricket.'],
  },
  compliment: ['Good ball, yaar.', 'Too good. Respect.', 'Shabash, bowler!', 'Unplayable. Well bowled.'],
  // AI batter needling you after a boundary
  batterSledge: ['Bowl something real!', 'Thank you for the gift!', 'Same ball again? Yes please.', 'Is that all you\'ve got?'],
  revenge: ['Who\'s laughing now?', 'Remember that one.', 'Silence. Beautiful.', 'Kya hua? Quiet now?'],
  // AI bowler while you bat
  bowlerSledge: ['Can\'t see it, can you?', 'Swing and a miss, hero!', 'Bat\'s just for decoration?', 'Too quick? Aww.'],
  bowlerAfterBoundary: ['Lucky. Probably.', 'Enjoy it. It won\'t last.', 'Hmm. Do that again, I dare you.'],
  bowlerCompliment: ['Shot, hero. Shot.', 'Okay, that was good.', 'Kya shot hai!'],
  batterRevenge: ['Talk now, bowler!', 'That one\'s for you!', 'Aasmaan tak — told you!'],
};

export function line(group, id, rng) {
  const g = LINES[group];
  const list = Array.isArray(g) ? g : (g[id] || g.generic);
  return rng.pick(list);
}

// How a batter takes a sledge.
export function sledgeOutcome(profile, rng) {
  const r = rng.next();
  if (r < profile.fire) return 'fired';
  if (r < profile.fire + profile.rattle) return 'rattled';
  return 'unfazed';
}
