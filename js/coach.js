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
    "Let's start with a final over. You need 14 off the last 4 balls. Don't worry, I'll be right here.",
  ],
  tutBat: [
    "Batting is all in the timing. Hold your finger down, swipe up, and lift off when the ring lights up.",
    "Middle it and the ball flies. Mistime it and it doesn't. Watch the ring, not the bowler!",
  ],
  tutBlock: [
    "Uh-oh, beta. Their star bowler has fired his power. This ball is special and it's coming at you hard.",
    "The safe play is to tap anywhere to defend it. Block it, survive, and we'll score off the next one.",
    "But if you're feeling really brave... go for it! Time it perfectly and it flies. Your call!",
  ],
  tutKeeper: [
    "Edge! Now you're the wicket-keeper. The ball is flying to you behind the stumps.",
    "Watch the ring and tap the moment it turns green. If it's wide of you, swipe that way and you'll dive for it.",
  ],
  tutCatch: [
    "He's skied it! Now you're the fielder underneath it.",
    "Wait for the ring to shrink and turn green, then tap. Too early and it's a drop. Patience, beta!",
  ],
  tutRunOut: [
    "They're going for a quick single. Run-out chance!",
    "Tap when the ring turns green to pick up the ball. Then slide your finger toward the wicket you want to hit. Follow the arrows to choose the keeper's end or the bowler's end. Hit the stumps and he's gone!",
  ],
  tutYorker: [
    "Two down! Last ball. Aim for the glowing zone at his feet.",
    "A yorker there is the hardest ball in cricket to hit. If he gets a nick, it's coming to the keeper. That's you!",
  ],
  tutPower: [
    "See your meter? Good shots and big moments fill it. Full enough means your hero can fire his power.",
    "Tap your hero's card first, then swipe as normal. That's how you win the impossible ones.",
  ],
  tutBowl: [
    "Now we bowl. They need 10 off the last 3 balls. Swipe from your bowler up the pitch to where you want the ball to land.",
    "Bowl well and they'll make mistakes. When the ball comes to your fielders, I'll tell you what to do.",
  ],
  // the first-time story (js/story.js)
  storyWalk: [
    "Hear that, beta? Twenty thousand Thunder fans, and not one of them is on your side.",
    "Breathe. Boos are only noise. The ball is all that matters: watch the ring, not the crowd.",
  ],
  storyCalm: [
    "They're laughing now. Let them. Every great player was laughed at once.",
    "You need 12 off 4 balls. That's it. I believe in you, beta.",
  ],
  storyBlocked: [
    "Cool as ice! Did you see Johan's face? They didn't expect that.",
  ],
  storyMid: [
    "TWELVE off four, in the Thunderdome! Hear that? Listen. The crowd has gone quiet.",
    "But the Strikers aren't finished. Now THEY chase, and their captain is coming out.",
  ],
  storyDefend: [
    "They need 10 off 3 balls, and Thunder Raja himself will be walking out.",
    "Take them out one ball at a time. You can do it, beta. I promise the crowd will go quiet.",
  ],
  storyDone: [
    "YOU DID IT! You beat the Thunder Strikers, in their own house! Do you know how long people have waited to see that?",
    "But it was one match. They'll be back, stronger and angrier. And they will never forget your face.",
    "Build a squad, climb through the divisions and reach the Super League. That's where you meet them again. And that's where you beat them for good.",
    "Tap Play, then Super League. Your career starts now, beta.",
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
    "Asia has three divisions. At the top, the Asian Super League: the Thunder Strikers, the Green Cyclones, the Volt Vipers and the rest. Tap Asia and let's go.",
  ],
  leagueTeam: [
    "Every great story starts at the bottom, beta. Your career begins in Division 3.",
    "Win Division 3 and you go up to Division 2. Win that, and you're in the Asian Super League with the big names.",
    "It's a grind. Pick the club you believe in: you'll be with them all the way up.",
  ],
  makeClub: [
    "Your own club? Now that's the spirit, beta! Give it a name the crowd can sing.",
    "Pick two colours that look good together: a bold main colour and a bright trim. Then choose a crest.",
    "You'll start in Division 3 with a squad of young unknowns. Raw, but they'll grow with you.",
  ],
  madeClub: [
    "Welcome to the league! Every big club started like this: a few kids, a small ground and a dream.",
    "Your players are young, so their potential matters more than their rating. Keep them and they'll get better every season.",
  ],
  stadium: [
    "This is your ground, beta. Small for now, but every home match brings in ticket money.",
    "Save up and you can build it bigger: a Club Stadium, then one day an Arena. More fans, more money, more noise!",
  ],
  stadiumCan: [
    "You have enough in the bank to build the next level of your ground. More seats means more ticket money every home match.",
    "But think about it: that money could also buy a player at the auction. Your call, captain.",
  ],
  stadiumBuilt: [
    "Look at it! The fans will remember this day. Now give them something to cheer about.",
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
  scoutTip: [
    "One more thing, beta. The best clubs don't only shop at the auction. They send scouts around the world.",
    "Send a scout to a region and he'll find you players there: raw talent in Africa, accurate bowlers in Europe, big hitters in North America, mavericks in South America, quicks in Oceania.",
    "Next season you can sign his finds at a set price, before the auction even starts. No bidding war!",
  ],
  scoutFound: [
    "Your scout has sent his first report! Have a look under Travelling scouts.",
    "He'll keep searching all season. When the new season begins, his players are yours to sign first.",
  ],
  scoutSign: [
    "Your scouts are home, beta, and look what they've brought back!",
    "These players are yours to sign at a set price, before the other clubs even see them. Anyone you leave goes into the auction.",
  ],
  slump: [
    "Two defeats in a row. It happens to every team, beta.",
    "Check your batting order and bowling attack in the squad screen. Sometimes one change is all it takes.",
  ],
  champion: ["Champions! I always knew you had it in you. Enjoy it, then let's do it again next season."],
  promoted: [
    "PROMOTED! Beta, I'm so proud. We're going up!",
    "The next division is tougher: better players, bigger crowds. Strengthen the squad at the auction and send your scouts out.",
  ],
  relegated: [
    "Relegated. It hurts, I know. Every great club has been down before.",
    "We rebuild, we learn, and we come back stronger. Chin up, beta.",
  ],
  playoff: [
    "This is it, beta. One match to stay in the Asian Super League.",
    "Lose, and we drop to Division 2. Win, and we're safe. No pressure... play your game!",
  ],
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
