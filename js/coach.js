// Uncle Dev, your mentor: a card that slides up with his advice, a line at a time. Each piece of
// advice is given once (profile.coachSeen); the Coach buttons give a screen's again on request.
const $ = id => document.getElementById(id);
let queue = Promise.resolve(), store = null;

// store: { seen(key), mark(key) }, from the player's profile
export function initCoach(s) {
  store = s;
  const box = document.createElement('div');
  box.id = 'coach'; box.hidden = true;
  box.innerHTML = '<div class="coach-card"><img class="coach-face" src="img/menu/coach-dev.webp" alt="">'
    + '<div class="coach-bubble"><b class="coach-name">Uncle Dev</b><p id="coachText"></p>'
    + '<div class="coach-btns"><button id="coachSkip">Skip</button><button id="coachNext" class="go">Next</button></div></div></div>';
  document.getElementById('app').append(box);
}

// show these lines now (one card, tap Next through them). Resolves when he's done.
export function coachSay(lines) {
  queue = queue.then(() => new Promise(done => {
    const box = $('coach'), text = $('coachText'), next = $('coachNext'), skip = $('coachSkip');
    let i = 0;
    const show = () => {
      text.textContent = lines[i];
      next.textContent = i < lines.length - 1 ? 'Next' : 'Got it';
      skip.hidden = i >= lines.length - 1;
    };
    const close = () => {
      box.classList.remove('up');
      next.onclick = skip.onclick = null;
      setTimeout(() => { box.hidden = true; done(); }, 220);
    };
    next.onclick = e => { e.stopPropagation(); if (++i >= lines.length) close(); else show(); };
    skip.onclick = e => { e.stopPropagation(); close(); };
    show();
    box.hidden = false;
    requestAnimationFrame(() => box.classList.add('up'));
  }));
  return queue;
}

// his advice for a moment, the first time it comes up (then never again unless asked)
export function coachOnce(key, lines) {
  if (!store || store.seen(key)) return Promise.resolve(false);
  store.mark(key);
  return coachSay(lines).then(() => true);
}

// ---------- what he says ----------
export const DEV = {
  welcome: [
    "Welcome, beta! I'm Uncle Dev. I've watched cricket for fifty years and coached for thirty, so stick with me.",
    "This is Sixcharge: cricket with superheroes. Every player has a power, and your charge meter decides when you can use it.",
    "Let's start with a final over. You need 14 off the last 3 balls. Don't worry, I'll be right here.",
  ],
  tutBat: [
    "Batting is all in the timing. Hold your finger down, swipe up, and lift off when the ring lights up.",
    "Middle it and the ball flies. Mistime it and it doesn't. Watch the ring, not the bowler!",
  ],
  tutPower: [
    "See your meter? Good shots and big moments fill it. Full enough means your hero can fire his power.",
    "Tap your hero's card first, then swipe as normal. That's how you win the impossible ones.",
  ],
  tutBowl: [
    "Now we bowl. They need 4 off one ball. Swipe from your bowler up the pitch to where you want the ball to land.",
    "Aim for the glowing zone at his feet. A yorker there is the hardest ball in cricket to hit.",
  ],
  tutDone: [
    "What did I tell you? A natural!",
    "Quick Game is for a single match. When you're ready for a whole career, come and find me in the Super League.",
  ],
  quickTeam: [
    "Pick your side, beta. Swipe through the clubs and check their ratings underneath.",
    "Each club plays differently: big hitters, swing bowlers, spinners. Choose one that suits how you like to play.",
  ],
  region: [
    "So, the Super League! Every region of the world will have its own league. Asia's is the first one open.",
    "It's home to the Thunder Strikers, the Green Cyclones, the Volt Vipers and more. Tap Asia and let's go.",
  ],
  leagueTeam: [
    "Now choose your club. The big clubs are locked for now. You earn your way up to them season by season.",
    "My advice? Take an underdog. A small club that wins the league is worth more to me than a giant that was expected to.",
  ],
  auction: [
    "Auction day! Every player goes under the hammer. Bid against the other clubs, or pass if the price runs too high.",
    "Watch your money. You need at least 10 players, so don't spend it all on the first star you see.",
    "Rating is now, potential is later. A young player with high potential gets better every season you keep him.",
  ],
  auctionLow: [
    "Careful, beta, the money is running low and your squad is still short.",
    "Look for the bargains now. Solid players that nobody else is bidding on win you plenty of matches.",
  ],
  season: [
    "The season starts here. Play your fixtures, climb the table, and the top four go through to the semi-finals.",
    "Before each match, check the opposition card. It tells you who their danger man is.",
    "And set your line-up in the squad screen. Your best batters near the top, your best bowlers in the attack.",
  ],
  slump: [
    "Two defeats in a row. It happens to every team, beta.",
    "Check your batting order and bowling attack in the squad screen. Sometimes one change is all it takes.",
  ],
  champion: ["Champions! I always knew you had it in you. Enjoy it, then let's do it again next season."],
  seasonEnd: [
    "The season's over. Win or lose, every match teaches you something.",
    "Players with good form improve, and new clubs unlock. Spend wisely at the next auction.",
  ],
};
// occasional tips before a quick match: the unseen ones in order, then now and then at random
export const QUICK_TIPS = [
  ['tipPower', "Your hero's power costs charge. Save it for when the match is on the line, not the first over."],
  ['tipField', 'When you bowl, tap Set Field before the ball. Put your fielders where this batter likes to hit it.'],
  ['tipScout', "Around the seventh ball you'll get a scouting report. It marks the batter's weak spot on the pitch. Bowl there!"],
  ['tipDefend', "Not every ball has to go for six. A tap to defend keeps you in, and the big shots can come later."],
  ['tipSwing', 'Drag sideways after you release the ball to bend it in the air. Swing bowlers move it the most.'],
  ['tipBanter', 'A bit of banter rattles the batter, but he can rattle you right back. Pick your moment.'],
];
