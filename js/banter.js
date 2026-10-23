// Sledges, comebacks and compliments. Keyed by hero id where a hero has their own voice.
export const LINES = {
  // you (bowling) after a good ball
  sledge: {
    zara: ['Blink and you\'re back in the hut.', 'That one had your name on it.', 'Next one\'s faster. Pack your kit.', 'Too quick for you? Get used to it.', 'You heard that one. You didn\'t see it.', 'I\'ve got six of those an over.', 'Feel the breeze? That was the ball.', 'Speed check: you\'re late.'],
    babar: ['The ball is smarter than you today, son.', 'Even my grandson reads that one.', 'Oh, it turned! Who knew?', 'Patience. The next one bites.', 'Spin is a puzzle. You\'re missing pieces.', 'Look at the hand, not the ball. Too late now.', 'That one\'s still spinning in your head.'],
    imran: ['Calculated.', 'Probability of you surviving: low.', 'Predictable.', 'Error detected: your footwork.', 'Line and length. You can\'t argue with maths.', 'Data says you\'re in trouble.', 'Same spot. Same result.'],
    generic: ['Is that all you\'ve got?', 'Hit it if you can!', 'Want to go home already?', 'Watch the ball, hero.', 'Did you even see that one?', 'Keep swinging. One might connect.', 'Lovely leave. Oh wait, that was a miss.', 'You look nervous out there.', 'That\'s a bat, not a broom.', 'Plenty more where that came from.', 'Too good for you, mate.', 'Hands shaking yet?', 'Your timing\'s on holiday.', 'That one nearly took your shoelaces.'],
  },
  sendoff: ['Walk, hero. The pavilion is that way.', 'Bye-bye! Wave to the crowd.', 'Next!', 'Mind the steps on the way up.', 'Enjoy the view from the dressing room.', 'Thanks for coming.', 'Don\'t forget your helmet.', 'Off you pop.', 'Shower\'s free. Go use it.', 'One down. Who\'s next?'],
  departing: ['Lucky ball. Just lucky.', 'I\'ll be back. Remember that.', 'Hmph.', 'That kept low!', 'Enjoy it while it lasts.', 'One good ball in twenty.', 'Not a word. Not one word.', 'See you next match.', 'Fluke.'],
  // AI batter reacting to a sledge
  fired: {
    raja: ['Next one\'s going into orbit!', 'Oh, now you\'ve done it. Sky high!', 'Say that again after this six!', 'Fetch your binoculars.', 'That ball is going to the car park.'],
    meher: ['Careful. I bite back.', 'Noted. Payback incoming.', 'You talk. I\'ll answer with the bat.'],
    comet: ['The show\'s not over yet, friend!', 'You\'ve woken the comet.', 'Big mistake. Huge.', 'Now I\'m interested.'],
    generic: ['Now it\'s personal.', 'Wrong batter to annoy!', 'Bring it on.', 'You\'ll regret that.', 'Bowl it then. I\'m waiting.', 'Talk is cheap. Sixes aren\'t.', 'Oh, it\'s on now.', 'Write that down. I\'m coming for you.'],
  },
  rattled: ['…', 'Lucky ball. Just lucky.', 'Uh… fine. Fine.', 'Who said that?!', 'Just bowl, mate.', 'Stop talking, please.', 'I\'m fine. Totally fine.', 'Can we just play?', 'Um. Okay.'],
  unfazed: {
    meher: ['Cute. Bowl faster.', 'Is that your best line? The bowling or the talking?', 'Yawn.'],
    generic: ['Whatever you say, bowler.', 'Heard better in street cricket.', 'Is that meant to scare me?', 'My nan sledges better.', 'Sure. Bowl the next one.', 'Not listening.', 'Water off a duck\'s back.', 'Save your breath for the run-up.'],
  },
  compliment: ['Good ball, mate.', 'Too good. Respect.', 'Well bowled, bowler!', 'Unplayable. Well bowled.', 'Fair play. That was a jaffa.', 'Nice one. Won\'t happen twice.', 'Beauty of a ball.', 'Okay, I tip my cap.'],
  // AI batter needling you after a boundary
  batterSledge: ['Bowl something real!', 'Thank you for the gift!', 'Same ball again? Yes please.', 'Is that all you\'ve got?', 'Keep them coming!', 'Easy runs, these.', 'Was that meant to be fast?', 'I could do this all day.', 'The fielders need a map.', 'Your captain looks worried.', 'Put a man in the crowd.', 'Delivered to order.'],
  revenge: ['Who\'s laughing now?', 'Remember that one.', 'Silence. Beautiful.', 'Quiet now, aren\'t you?', 'Lost your voice?', 'That\'s how it\'s done.', 'Not so chatty now.', 'Payback.'],
  // AI bowler while you bat
  bowlerSledge: ['Can\'t see it, can you?', 'Swing and a miss, hero!', 'Bat\'s just for decoration?', 'Too quick? Aww.', 'Plenty of air there.', 'Want me to bowl it slower?', 'You were miles away.', 'Nearly. Not really.', 'That bat has a hole in it.', 'Ball one, me. Ball two, also me.'],
  bowlerAfterBoundary: ['Lucky. Probably.', 'Enjoy it. It won\'t last.', 'Do that again, I dare you.', 'Top edge, that.', 'Fine. Have that one.', 'Even a broken clock is right twice a day.', 'Watch the next one.'],
  bowlerCompliment: ['Shot, hero. Shot.', 'Okay, that was good.', 'What a shot!', 'Fair play. Lovely hit.', 'That one deserved four.', 'Class.'],
  // you answer a bowler's sledge (or open on him) while batting
  batterReply: ['Is that all you\'ve got?', 'Bowl faster, I\'m bored!', 'Talk is cheap, bowler.', 'Keep talking. I\'ll keep hitting.', 'You\'re about to regret that.', 'Say that again after this over!'],
  // a hot duel: the AI bowler to you (batting), the AI batter to you (bowling)
  heatBowler: ['This ball has your name on it!', 'I\'m coming for you. Right now.', 'One of us is walking off. It\'s not me.', 'Look me in the eye, hero.', 'Here comes the quick one!', 'You wanted a duel? Duck!'],
  heatBatter: ['Bowl it! I\'ll send it to the moon!', 'Your best ball? I\'ll take it apart.', 'I\'m taking you down, bowler.', 'Come on then. Show me what you\'ve got!', 'Every ball is mine now.', 'You started this. I\'ll finish it.'],
  batterRevenge: ['Talk now, bowler!', 'That one\'s for you!', 'Sky high. Told you!', 'Go fetch.', 'Still talking?', 'Words, meet bat.'],
};

// A line from the group, never one of the last few said from it (so the same words don't come round
// again soon).
const recent = new Map();
export function line(group, id, rng) {
  const g = LINES[group];
  const own = Array.isArray(g) ? g : g[id];
  const list = own ? (Array.isArray(g) ? own : [...own, ...(g.generic || [])]) : g.generic;
  const key = `${group}:${id || ''}`, seen = recent.get(key) || [];
  const fresh = list.filter(l => !seen.includes(l));
  const pick = rng.pick(fresh.length ? fresh : list);
  seen.push(pick);
  while (seen.length > Math.floor(list.length * 0.7)) seen.shift();
  recent.set(key, seen);
  return pick;
}

// How a batter takes a sledge.
export function sledgeOutcome(profile, rng) {
  const r = rng.next();
  if (r < profile.fire) return 'fired';
  if (r < profile.fire + profile.rattle) return 'rattled';
  return 'unfazed';
}
