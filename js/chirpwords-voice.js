// How the people of Chirp sound. A voice (a persona) wraps a line in how that kind of fan talks, and replies to a post in his own words.
// Slots: {p} the player, {me} {they} the clubs, {tag} the club's hashtag, {sruns} {swk} {ducks} {last} {k} {cruns} his numbers.

// which kind of line each persona likes, for a good moment and for a bad one
export const REGISTER = {
  hype: { good: 'hype', bad: 'warm' },
  loyal: { good: 'warm', bad: 'warm' },
  nerd: { good: 'stat', bad: 'stat' },
  old: { good: 'old', bad: 'old' },
  joker: { good: 'wry', bad: 'wry' },
  grumpy: { good: 'wry', bad: 'rage' },
  doubter: { good: 'stat', bad: 'rage' },
  rival: { good: 'rival', bad: 'rival' },
};

// who each fan is: his persona (a few of each kind, so the same two or three people are not in every thread)
export const PERSONA_OF = {
  arjun_sixes: 'hype', ravi_roars: 'hype', sana_shouts: 'hype', omar_oval: 'hype', anjali_batting: 'hype', amara_arc: 'hype', sofia_scoreboard: 'hype',
  kenji_cricket: 'joker', jackrowe9: 'joker', kofi_k6: 'joker', sam_slog: 'joker', cami_catches: 'joker', leila_long_on: 'joker', emma_extra_cover: 'joker', ollie_omg: 'joker',
  priya_pavilion: 'loyal', lakshmi_laughs: 'loyal', nia_never_out: 'loyal', kavita_keeper: 'loyal', chloe_cover_drive: 'loyal', meilin_matchday: 'loyal',
  aisha_inswing: 'nerd', graham_googly: 'nerd', luca_late_cut: 'nerd', andre_covers: 'nerd', tayla_third_man: 'nerd',
  oldwinston: 'old', tomfletcher_: 'old', marcus_mid_on: 'old', dev_in_the_stands: 'old', imani_in_form: 'old',
  meera_mad: 'grumpy', imran_ultra: 'grumpy', zawadi_z: 'grumpy',
  ali_astonished: 'doubter', yuki_yorker: 'doubter', kate_the_crease: 'doubter', jamal_jaffa: 'doubter',
};

// before and after a line, now and then (with a persona's own habits)
export const OPENERS = {
  hype: { good: ["OMG.", "Listen,", "Okay,", "I am not joking,", "Honestly,", "Guys,", "Wait,", "Breaking:", "PSA:", "Everyone,"], bad: ["Okay,", "Listen,", "Guys,", "Come on,", "Right,", "Deep breath,"] },
  loyal: { good: ["Honestly,", "Still,", "Love this club.", "Proud fan here:", "Say what you like,", "As always,", "From the stands:", "Tonight,"], bad: ["Honestly,", "Still,", "Proud fan here:", "Say what you like,", "As always,", "From the stands:"] },
  nerd: { good: ["By the numbers:", "For the record:", "Stat check:", "Context:", "Quick maths:", "Looking at the sheet,", "Small sample, but:", "Facts only:"], bad: ["By the numbers:", "For the record:", "Stat check:", "Context:", "Quick maths:", "Looking at the sheet,", "Facts only:"] },
  old: { good: ["Mark my words,", "In all my years,", "Back in my day,", "I will say this:", "Young people,", "I have seen it all,", "As a lifelong fan,"], bad: ["Mark my words,", "In all my years,", "Back in my day,", "I will say this:", "I have seen it all,", "As a lifelong fan,"] },
  joker: { good: ["Hot take:", "Not me crying:", "Plot twist:", "Dear diary,", "Breaking news from my couch:", "Me, watching this:", "Excuse me?", "Spoiler:"], bad: ["Hot take:", "Not me crying:", "Plot twist:", "Dear diary,", "Me, watching this:", "Spoiler:"] },
  grumpy: { good: ["Fine.", "Okay,", "Look,", "Right,", "Well,"], bad: ["Typical.", "Unbelievable.", "Honestly,", "Look,", "Right,", "Not again.", "Say it with me:", "I will say it again:"] },
  doubter: { good: ["Hmm.", "Early days,", "Calm down,", "Let us see,", "Okay,"], bad: ["I did say.", "Not buying it.", "Hmm.", "Let me guess:", "Told you,", "Early days,", "We will see."] },
  rival: { good: ["Lol.", "Hmm,", "Respectfully,", "Love to see it,", "Okay,", "Not gonna lie,", "Just saying,"], bad: ["Lol.", "Hmm,", "Respectfully,", "Love to see it,", "Okay,", "Not gonna lie,", "Just saying,"] },
};
export const CLOSERS = {
  hype: { good: ["{tag}", "LET'S GOOOO", "🔥🔥🔥", "{me} FOREVER", "Up the {me}!", "Cannot wait for next week!", "{tag} 💙", "BRING ON THE NEXT ONE"], bad: ["{tag}", "Come on {me}!", "We go again!", "Heads up!", "{tag} 💙", "Bounce back, lads!"] },
  loyal: { good: ["{tag} 💙", "Always {me}.", "Proud of you all.", "See you at the next one.", "{tag}", "Love this team.", "Heart and soul."], bad: ["{tag} 💙", "Always {me}.", "Proud of you all.", "See you at the next one.", "{tag}", "Heart and soul."] },
  nerd: { good: ["📊", "Numbers do not lie.", "The data agrees.", "Sample size: small. Excitement: large.", "Check the scorecard.", "(All stats from the scorecard.)"], bad: ["📊", "The data agrees.", "Check the scorecard.", "(All stats from the scorecard.)", "Just a thought."] },
  old: { good: ["That is how it is done.", "Lovely stuff.", "Good to see.", "A joy.", "Keep it up, lads.", "Carry on."], bad: ["That is all.", "Carry on.", "Learn and move on.", "Time will tell.", "Keep working, lads."] },
  joker: { good: ["😂", "I cannot.", "10/10, would stress again.", "This club is a sitcom.", "Anyway.", "I need a nap."], bad: ["😂", "I cannot.", "Send help.", "This club is a sitcom.", "Anyway.", "I need a nap."] },
  grumpy: { good: ["Fine.", "Do not get used to it.", "Let us see if it lasts.", "Just saying."], bad: ["Fix it.", "Enough is enough.", "It is not hard.", "Wake up.", "Pathetic.", "Do better.", "Just saying.", "😤"] },
  doubter: { good: ["Let's see.", "Check back next week.", "Do not get carried away.", "Time will tell."], bad: ["Let's see.", "We will see.", "Not convinced.", "Not the first time.", "Check back next week.", "Hmm.", "Time will tell."] },
  rival: { good: ["{they} forever.", "See you in the return.", "😏", "Take notes, {me}.", "{tag}"], bad: ["{they} forever.", "See you in the return.", "😏", "Enjoy it.", "Rent free.", "Take notes, {me}.", "Bye!", "{tag}"] },
};

// replies that fit any post about a moment: good or bad. Keyed by register
export const REPLY = {
  good: {
    hype: ["YES!!! {p}!!!", "That is what I am talking about!", "{p} is unreal!", "I am screaming right now.", "Take a bow, {p}!", "Best player in the league, no debate."],
    stat: ["Numbers back it up.", "{p}'s season is incredible.", "Strong numbers from {p}.", "The stats are on his side.", "This is a trend now.", "Check his average. It is silly."],
    wry: ["{p} is just showing off now. 😂", "Somebody stop him. Please.", "The other teams are filing complaints.", "Imagine being a bowler against {p}.", "I need a lie down after that.", "Absolute scenes."],
    warm: ["So happy for {p}. 💙", "He deserves all of this.", "Love this lad.", "{p} is one of ours.", "What a person and a player.", "Proud of him."],
    old: ["Class is permanent.", "That is proper cricket.", "{p} has the touch.", "Lovely to watch.", "Good stuff.", "I have seen a few and this is up there."],
    rival: ["Annoyingly good.", "Enjoy it, {me}.", "{p} is a threat. Noted.", "We will have a plan.", "Fair play to {p}.", "Okay, respect."],
  },
  bad: {
    rage: ["This is not good enough.", "{p} needs to do better. Now.", "Same story every week.", "I am tired of this.", "Pathetic.", "Drop him and try someone else."],
    stat: ["The numbers are not kind.", "A trend is forming. Not a good one.", "Below his usual standard.", "Check his average. It is falling.", "The sample is growing. Not in his favour.", "Not great, statistically."],
    wry: ["{p} is having a moment. A bad one. 😂", "At least {p} is consistent.", "Somebody check on {p}.", "{p} could not hit a barn door. Today.", "I laughed. Sorry. I laughed.", "It happens to the best. Or the worst."],
    warm: ["Chin up, {p}. 💙", "We are behind you.", "Bad day, that is all.", "He will bounce back.", "Do not be too hard on him.", "Keep your head up, {p}."],
    old: ["Back to basics, lad.", "It happens.", "A bad day at the office.", "Learn from it, {p}.", "Time in the nets will help.", "He will come good."],
    rival: ["Thanks, {p}.", "Keep playing him, {me}!", "Lovely to see.", "Great news for us.", "{p} is a gift. 🎁", "Ha!"],
  },
};

// the memory, spoken: lines a fan adds when the numbers back him up. Keyed by what is true.
export const CALLBACK = {
  ducks: ["That is {ducks} ducks for {p} this season.", "{ducks} ducks this season. {p} has to turn it around.", "{p}'s ducks this season: {ducks}. Not ideal.", "Another duck. That makes {ducks} for the season."],
  lastScores: ["{p}'s last scores: {last}. The trend is clear.", "{last}. That is {p}'s recent form.", "{p}: {last} in his recent games.", "His last few: {last}. Make of that what you will."],
  seasonRuns: ["{p} now has {sruns} runs this season.", "{sruns} runs for {p} this season. Class.", "That takes {p} to {sruns} runs for the season.", "{sruns} season runs for {p} and counting."],
  seasonWkts: ["{p} has {swk} wickets this season.", "{swk} wickets this season for {p}. Reliable.", "That is {swk} for the season for {p}.", "{p}: {swk} wickets this season and counting."],
  careerRuns: ["{p} has {cruns} career runs for this club.", "That is {cruns} runs in the shirt for {p}.", "{cruns} runs in {me} colours. A club man.", "{cruns} career runs for {p}. A real servant."],
  streak: ["{k} games in a row now.", "That is {k} in a row.", "{k} straight. Can he make it more?", "A run of {k}. Keep it going."],
};

// replies to a moment of the whole team (no one player in it): good or bad. Keyed by register
export const REPLY_TEAM = {
  good: {
    hype: ["{me} are flying right now!", "This team is something else!", "I love this squad so much.", "Nobody wants to play us!", "What a day to be a {me} fan!", "Up the {me}! 🔥"],
    stat: ["The results back this up.", "That is the best the side has looked all season.", "The form line is pointing up.", "A complete team performance, in numbers.", "Third good result in recent weeks. A trend.", "Strong across the board."],
    wry: ["My nerves have not recovered. 😂", "Can we do that again, please? Slower?", "I forgot to blink. Worth it.", "This team is going to give me a heart attack. In a good way.", "I told my cat. She did not care. I do.", "The group chat has gone mad."],
    warm: ["So proud of every one of them. 💙", "We are lucky to support this club.", "What a team. What a day.", "The whole squad deserves a pat on the back.", "Thank you lads.", "This is why we love them."],
    old: ["A proper performance.", "That is how a team should play.", "I have seen worse days at the ground. Many worse.", "Good cricket. Good result.", "Well done, all of them.", "That is what I come for."],
  },
  bad: {
    rage: ["This is not good enough.", "The whole team needs a good look in the mirror.", "Same mistakes every week.", "I am tired of watching this.", "Wake up, {me}!", "Fix it. Now."],
    stat: ["The numbers are not kind.", "A pattern is forming. Not a good one.", "Below par in every department.", "The margins are small but they keep going the wrong way.", "That is a worrying trend.", "The sheet tells the story."],
    wry: ["I am used to disappointment. It is how I stay fit. 😂", "At least the snacks were good.", "Anyone for therapy?", "I am calm. I am very calm. I am screaming inside.", "That was a lot. I need a lie down.", "{me}: keeping their fans humble since forever."],
    warm: ["Keep your heads up, lads. 💙", "We will bounce back. We always do.", "Bad day, that is all.", "Still proud of this team.", "Love this club, whatever the result.", "On to the next one."],
    old: ["I have seen worse and we came back.", "The lads will learn.", "That happens in cricket.", "Back to basics, I would say.", "Patience. It is a long season.", "Chin up. It is only one match."],
  },
};

// replies to a club event (a signing, a departure, a promotion). Keyed by register
export const REPLY_STORY = {
  good: {
    hype: ["Let's gooo! 🔥", "This club is going places!", "I am so excited I cannot sit down.", "Big news! Love it!", "We are building something special.", "Best news I have heard all week!"],
    stat: ["That is a real step forward on paper.", "The squad looks stronger on the numbers.", "A sensible move, by the numbers.", "Good business, judging by the figures.", "The data likes this.", "A solid piece of work from the board."],
    wry: ["The board did something right. Mark the calendar. 😂", "I need a minute. Good news makes me nervous.", "I have been waiting for this. Do not mess it up now.", "I will believe it when he scores. 😂", "My wallet cries but my heart sings.", "Somebody tell the board to keep going."],
    warm: ["So happy for the club. 💙", "A great day to be a fan.", "Welcome. We are glad you are here.", "This club deserves good things.", "Proud of everyone involved.", "Love this club. Always have."],
    old: ["That is how a club is built, a step at a time.", "I like it. Good work.", "Good to see the club moving forward.", "Patience is paying off.", "A fine day.", "I have waited a long time for news like this."],
    rival: ["Interesting move. We will be watching.", "Fair play to them.", "That makes them a bit more dangerous.", "Noted.", "Respect.", "Good for them. Not so good for us."],
  },
  bad: {
    rage: ["This club never learns.", "The board has a lot to answer for.", "Same old story.", "I am so tired of this.", "Unbelievable.", "Somebody tell the board how this feels."],
    stat: ["On paper, that hurts.", "The squad is thinner now.", "That is a real loss, by any measure.", "The numbers do not make that easy to absorb.", "A big gap to fill.", "We will feel that in the results."],
    wry: ["The club has a weird sense of timing. 😂", "I need a hug. And a new team. Just kidding. Mostly.", "Another day, another departure. 😂", "My heart is fine. I am fine. Everything is fine.", "At least the biscuits are still here.", "I will cope. With snacks."],
    warm: ["Thank you for everything. 💙", "We will miss you.", "Good luck wherever you go.", "Once one of us, always one of us.", "We wish you the very best.", "The club will not forget."],
    old: ["That is cricket. Players come and go.", "Time marches on.", "I have seen it before. We will manage.", "A sad day, but life goes on.", "The good ones always leave in the end.", "We will be fine."],
    rival: ["Interesting. We might have a word.", "That is a big loss for them.", "Their loss is somebody's gain.", "Hmm. Opportunity.", "Sorry to hear. Not that sorry.", "That makes them easier to beat."],
  },
};

// a fan's shout-out at the end of his post about the match, for the best of mine (good) or the worst of the day (bad). Keyed by register
export const SHOUT = {
  good: {
    hype: ["Man of the match: {p}! 🔥", "{p} won it for us! {runs} off {balls}!", "Shout-out to {p}!!", "{p}, you absolute star!"],
    stat: ["Special mention: {p}, {runs} off {balls}.", "Key performer: {p}.", "{p} was the difference: {runs} off {balls}.", "Player of the match for me: {p}."],
    wry: ["{p} did the work. The rest of us just stressed. 😂", "Somebody buy {p} a drink.", "{p}, whatever you are on, share it.", "Thank {p}. Seriously."],
    warm: ["Proud of {p} today. 💙", "{p} was brilliant.", "Big hug to {p}.", "{p} deserves all the credit."],
    old: ["{p} played like a veteran.", "A fine game from {p}.", "{p} did what a good player does.", "Credit to {p}."],
  },
  bad: {
    rage: ["{p} has to answer for that. 😤", "{p} was awful today.", "Not good enough, {p}.", "I blame {p}. Sorry, not sorry."],
    stat: ["{p} was the weak link today.", "{p}'s numbers were poor.", "A bad day for {p}.", "{p}'s day to forget."],
    wry: ["{p} had a day off. We all noticed. 😂", "Somebody check on {p}.", "Not {p}'s finest hour.", "{p} was on holiday. In the middle of the match."],
    warm: ["Chin up, {p}. 💙", "Do not be too hard on {p}.", "{p} will be back.", "We are still with you, {p}."],
    old: ["{p} will learn from it.", "A rough one for {p}.", "Back to the nets, {p}.", "{p} is better than that."],
  },
};
