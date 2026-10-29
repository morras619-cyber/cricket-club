// What the fans of Chirp say about a batter's innings (js/chirpfacts.js finds the moment, js/chirpvoice.js picks the voice).
// Each moment has the voices that would speak about it: hype (over the moon), stat (the numbers man), wry (the joker), warm (the loyal fan),
// old (the old-timer), rage (the angry fan, for a bad moment), rival (a fan of another club).
// Slots: {p} his surname, {pf} his full name, {nick} his nickname (or his surname), {runs} {balls} {sixes} {fours} {sr} this innings,
// {sruns} his runs this season, {ducks} his ducks this season, {me} {they} the clubs.
export const BAT = {
  // 25 or more
  bigKnock: {
    hype: ["{p} with {runs} off {balls}! That is how you bat!", "{runs} from {p} and the whole ground was on its feet. LOVE IT.", "Give {p} the match ball. {runs}! 🔥", "{nick} is in the mood and the bowlers know it. {runs} off {balls}!"],
    stat: ["{p}: {runs} off {balls}, strike rate {sr}. That is a serious innings.", "{runs} from {balls} balls with {fourn} and {sixn}. Efficient. Brutally so.", "{p} scored {runs}. That is {sruns} runs for the season now. The numbers keep climbing.", "{runs} off {balls} is a {sr} strike rate. Check the sheet."],
    wry: ["{p} walked in, looked at the bowlers, said 'nah' and scored {runs}. 😂", "Somebody tell {p} it is only a league game. {runs} off {balls}?!", "{p} batting like he owes the bowlers money. {runs}!", "{runs} off {balls}. {p} has done his homework and the bowlers have not."],
    warm: ["So happy for {p}. {runs} off {balls}, and he deserves every run of it. 💙", "{p} has worked so hard and today it showed. {runs}!", "Proud of {nick}. That was a proper innings. 👏", "Everyone writing {p} off? Not today. {runs}!"],
    old: ["I have watched this club for thirty years and {p}'s {runs} was a proper knock. Real timing.", "{runs} off {balls}. Reminds me of the old days, when a batter meant it.", "Good, clean striking from {p}. Textbook, and I do not say that lightly.", "That is how it was done when I was young. {p} has the touch."],
    rival: ["{p} played well, I will admit it. {runs} is not nothing.", "Fine, {p} was good today. We will have a plan for the rematch.", "{runs} off {balls} from {p}. Annoying. Very annoying.", "Credit to {p}. Do not expect that every week, {me}."],
  },
  // 35 or more
  masterclass: {
    hype: ["{p}!!! {runs}!!! I CANNOT BELIEVE WHAT I JUST WATCHED! 🔥🔥", "{runs} off {balls}. {p} just played the innings of the season.", "STANDING OVATION for {p}. {runs} and not a false shot.", "Whatever {p} had for breakfast, give it to everyone. {runs}!"],
    stat: ["{p} made {runs} off {balls} balls ({sr} SR). Only a handful of innings this good in the whole league.", "{runs} for {p}: {fourn}, {sixn}, no real mistakes. A statistical outlier.", "{p} scoring {runs} takes him to {sruns} runs this season. Orange cap talk.", "I rate that one a 9/10 innings. {runs} off {balls}, {sr} strike rate. {p} is something else."],
    wry: ["{p} made {runs} and the scoreboard operator had to sit down. 😂", "That was not an innings, that was a hostage situation. {p}, {runs}.", "{runs} off {balls}. The bowlers are filing a complaint with the umpire. 😂", "{p} taking the bowling apart like flat-pack furniture. {runs}."],
    warm: ["I got goosebumps watching {p} today. {runs}. What a player we have. ❤️", "This is why I love this club. {p}, {runs}, pure joy.", "{nick} the master. {runs} and a smile on every face in the ground.", "Tell {p} thank you from all of us. {runs}!"],
    old: ["In all my years I have seen few innings like {p}'s {runs}. Few.", "That, young people, is what class looks like. {p}, {runs}.", "{runs} off {balls} and never a hurry in it. The mark of a real batter.", "I will be telling people about {p}'s {runs} for years."],
    rival: ["{p} has been unreal and I hate it. {runs} against us!", "Okay {p}, that was special. {runs}. Respect, {me}.", "Somebody get {p} out. We keep trying. {runs}!", "Fine. {p} is brilliant. Do not tell anyone I said it."],
  },
  // 20 or more at a very high rate
  blitz: {
    hype: ["{p}! {runs} off just {balls}! That is lightning! ⚡", "{runs} off {balls} balls. {nick} went berserk and I loved every second.", "Fastest hands in the league. {p}, {runs} off {balls}!", "{p} came in swinging: {runs} off {balls}! 🚀"],
    stat: ["{p}: {runs} off {balls} is a strike rate of {sr}. That does not happen by accident.", "{runs} from {balls} balls. {p} scored faster than most of us can talk.", "{sr} strike rate from {p} today. Over two runs a ball.", "A {sr} SR for {p}. Pure arithmetic: the bowlers lost."],
    wry: ["{p} was in such a hurry. Had a bus to catch? {runs} off {balls}. 😂", "{runs} off {balls}. {p} does not do slow, apparently.", "{p} treated the bowlers like a speed-dating event: quick and unforgettable. {runs}!", "Blink and you missed {p}'s innings. {runs} off {balls}."],
    warm: ["{p} just goes out there and plays with joy. {runs} off {balls}! 😊", "Love the fearless way {nick} bats. {runs} off {balls}!", "This is the cricket I signed up for. {p}, you star!", "{p} is not scared of anyone. {runs} off {balls}. Proud of him."],
    old: ["Quick runs, quick feet. {p} is a throwback with {runs} off {balls}.", "In my day we called that 'having a go'. {p}, {runs} off {balls}!", "I worried he would be too brave. Then {p} scored {runs} off {balls}. Fair play.", "That is positive batting. {p}, well done."],
    rival: ["{p} was too quick for us. {runs} off {balls}. Ugh.", "{runs} off {balls} from {p}. We bowled him gifts.", "Good hitting, {p}. We will bowl better in the return.", "That innings from {p} hurt. We saw it coming and still could not stop it."],
  },
  // 3+ sixes
  sixFest: {
    hype: ["{sixes} SIXES from {p}! The roof is gone! 🚀🚀🚀", "{p} cleared the rope {sixes} times! I need a new telly!", "{sixn}! {nick} is a one-man fireworks show!", "Somebody count the sixes: {sixes}! {p} is on another planet."],
    stat: ["{sixn} from {p} in {balls} balls. Elite six-hitting.", "{p} cleared the boundary {sixes} times. Six-hitting rate: elite.", "{sixn} and {fourn} from {p}: {runs} off {balls}. That is a lot of rope.", "{sixes} maximums from {p}. Wow. Just wow."],
    wry: ["{p} is hitting the ball so far somebody should send a postcard. {sixn}! 😂", "The fans in the stands should get a hard hat. {p}, {sixn}!", "{sixn} and not one fielder even tried. Good call, honestly.", "{p} sent {sixes} balls into orbit. NASA called. 🚀"],
    warm: ["{p} has given the crowd {sixes} reasons to scream. Thank you! 🙌", "What a joy it is to watch {nick} bat. {sixn}!", "{sixn}! My heart! My poor heart! I love this team.", "{p} entertains like no one else. {sixn} and a huge smile."],
    old: ["{sixn} in one innings. I never saw that in my day, and I saw plenty.", "The ball does not go that far on its own. {p} sent {sixes} of them over the rope.", "I need a sit down after {p}'s {sixn}.", "Modern cricket! {p} hit {sixn}. Lovely stuff."],
    rival: ["{sixn} for {p}. Our bowlers are going to need counselling.", "{p} took us apart: {sixn}. Credit where it is due.", "{sixn}! {p} is in a different league from us today.", "{p}, {sixn}. We will not forget this, {me}."],
  },
  // not out and useful
  notOutHero: {
    hype: ["{p} stays NOT OUT on {runs}! Take a bow, hero! 🙌", "{runs} not out from {p} and the job is done!", "{nick} saw it through! {runs}* is brilliant!", "Not out! {p} finishes on {runs}*!"],
    stat: ["{p}: {runs}* off {balls}. Not out, and the team needed every one.", "{runs} not out for {p}. He faced {balls}, he left the field unbeaten.", "{p} finished on {runs}*, strike rate {sr}. Calm and efficient.", "{runs}* for {p}: the kind of innings that does not show in highlights but wins games."],
    wry: ["{p} refused to get out. Stubborn. I love it. {runs}*! 😂", "{p} is still out there, probably. {runs} not out.", "{runs} not out. {p} has more patience than my doctor's waiting room.", "{p} outlasted everyone. {runs}*."],
    warm: ["So proud of {p}, {runs} not out. Steady as a rock. 💙", "{p} kept his head when others lost theirs. {runs}*!", "{nick} came through for the team again. {runs} not out!", "That is a captain's knock, even if he is not the captain. {p} {runs}*."],
    old: ["{runs} not out. {p} has a head on his shoulders, that is for sure.", "A sensible innings from {p}. They do not make them like that any more. {runs}*.", "That is how you build an innings. {p}, {runs} not out.", "I like a batter who gets the job done. {p}, {runs}*."],
    rival: ["{p} stayed in and made {runs}*. That was the difference.", "We could not get {p} out. {runs}*. Painful.", "{runs} not out from {p}. Not a bad innings, I suppose.", "Credit to {p}. We could not shift him."],
  },
  // one man carried the innings
  oneManShow: {
    hype: ["{p} did it ALL! {runs} of the team's total. One man show! 🎭", "Without {p} we are nowhere. {runs} and a whole innings on his back.", "{nick} carried the whole side today. {runs}!", "What a one-man army. {p} with {runs}."],
    stat: ["{p} scored {runs}: more than half of the innings. That is a heavy load.", "{runs} from {p}. The rest of the order combined barely matched it.", "One batter, {runs} runs, a whole total. {p}, take a bow.", "{p}'s {runs} was the innings. The others were passengers."],
    wry: ["{p} batted like it was a solo gig. The rest of us were the audience. {runs}!", "Somebody tell the rest of the top order {p} scored {runs} and they can join in next time. 😂", "{runs} from {p}. The others just came for the snacks.", "{p} doing the work of six. Where is his pay rise?"],
    warm: ["{p} gave everything for this team. {runs}! Thank you.", "Hero of the day: {p}. {runs} and the rest of us just watched in awe. 💙", "{nick} holding it all together. We need others to step up, but wow. {runs}!", "Love this man. {runs} and the weight of the whole innings."],
    old: ["Every side needs one like {p}: when the rest wobble, {runs}.", "{p} played a captain's innings. {runs}. The others should take notes.", "A proper old-fashioned anchor, {p}. {runs}, and the innings stood on it.", "Good players make runs. A great one makes them when nobody else does. {p}, {runs}."],
    rival: ["{p} was the whole {me} innings. {runs}. Take him out and they are done.", "{p} did it alone. Respect, but you cannot do it every week.", "The {me} innings was {p} and nothing else.", "We got {p} eventually. There was nothing behind him."],
  },
  // the batter who finished the chase
  finisher: {
    hype: ["{p} finished it! {runs}* and the job is done! 🏆", "That is a finisher! {p}, not out, and we win!", "{nick} to the rescue! {runs} not out in the chase!", "Ice cold, {p}. Walked us home with {runs}*!"],
    stat: ["{p} saw the chase through: {runs}* off {balls}. The target gone, the win in the bag.", "{runs}* off {balls} when it mattered. {p}'s chase numbers are elite.", "{p} finished unbeaten on {runs}. A finisher's job, completed.", "{p}: {runs}* in a successful chase. Cool head, cool numbers."],
    wry: ["{p} walked in, saw a chase, thought 'meh' and won it. {runs}*! 😂", "Calm as you like. {p} finished the chase like he was ordering coffee.", "{p} does not do last-over drama. He ends it. {runs}*.", "{runs}* and a win. {p} just took the stress out of my evening."],
    warm: ["{p} finished it for us! {runs}* and I could cry. 💙", "What a calm head {nick} has. {runs}* and we are winning!", "Thank you {p}! {runs} not out! The chase is ours!", "That's our {p}! Cool when it counts. {runs}*!"],
    old: ["That is how you finish a chase. {p}, {runs}*, well done.", "A cool head and a straight bat. {p} {runs}*.", "I trust {p} to finish. Today he did. {runs} not out.", "Patience, nerve and a clean strike. {p}, {runs}*."],
    rival: ["{p} finished us off with {runs}*. Annoying.", "We had it until {p} came and hit {runs}* in the chase.", "{p} made it look easy. {runs} not out. We lost.", "We could not stop {p}. {runs}* and the win."],
  },
  // out for nothing
  duck: {
    rage: ["{p}. A duck. AGAIN?! This is not good enough. 😡", "A duck from {p}. In a game like this? Unacceptable.", "{p} gets 0 and wonders why the fans are angry. Wake up!", "How do you score a duck on a pitch like that, {p}?? Come on."],
    stat: ["{p}: 0 off {balls}. That is {duckn} this season.", "{p} out for a duck. His season total: {sruns} runs. The numbers are getting worse.", "A duck for {p}. It happens, but the pattern is worrying.", "0 off {balls} for {p}. The average takes another hit."],
    wry: ["{p} brought a duck to the party. Quack. 🦆", "0 for {p}. At least he is consistent. 😂", "{p} made the shortest innings of the day. A career in sprinting, perhaps?", "{p} was in and out faster than a bad takeaway order. 🦆"],
    warm: ["Chin up, {p}. Everybody gets a duck. You will bounce back, I know it. 💙", "Not {p}'s day, that is all. We believe in him.", "Come on {nick}. Next innings is yours. We are still behind you.", "Ducks happen. {p} will be fine. Keep going, lad."],
    old: ["A duck. In my day we would just say 'bad luck' and move on. Come on {p}.", "{p} should keep his head still and watch the ball. Basics.", "We have seen {p} do better. Back to the nets, son.", "A duck is not the end of the world, but {p} must tighten up."],
    rival: ["Cheers for the duck, {p}. 🦆", "{p} out for nothing. Please keep picking him, {me}.", "Thanks {p}! A duck is always welcome. 😂", "Bye {p}! 0! Easy wicket!"],
  },
  // out first ball
  goldenDuck: {
    rage: ["{p}, first ball, GONE?! What was that?! 😤", "A golden duck from {p}. Embarrassing. Absolutely embarrassing.", "First ball! {p}! I do not even know what to say.", "{p} did not even face a second ball. That is unacceptable."],
    stat: ["{p} out first ball: a golden duck. Dismissed before the innings began.", "A golden duck for {p}. His {sruns} runs this season suddenly look fragile.", "0 off 1 for {p}. The shortest possible innings.", "Golden duck for {p}: season ducks now {ducks}."],
    wry: ["{p} faced exactly one ball. A personal best for brevity. 🦆", "Golden duck! {p} should have stayed in the pavilion and saved us the suspense. 😂", "{p} was there for the first ball and that is about it.", "That was the fastest walk to the crease and back I have ever seen. {p}!"],
    warm: ["Oh {p}. First ball. We still love you, mate. 💙", "That is cruel for {nick}. Shake it off, you will be back.", "Golden ducks happen to the best. Stay strong, {p}.", "Not the start {p} wanted. Keep your head up!"],
    old: ["First ball! In all my years... {p}, concentrate lad.", "A golden duck. It is no shame, but {p} should learn from it.", "The first ball is the hardest. {p} could not find it. Next time.", "I have seen it before. {p} will come back stronger."],
    rival: ["First ball!! Thanks {p}! 😂", "Golden duck for {p}! Our bowler is a legend!", "{p} gone first ball. Please never change, {me}.", "What a start! {p} out for a golden duck!"],
  },
  // a rated batter fails
  starFlop: {
    rage: ["{p} is meant to be one of our best batters and we get {runs}?! Not good enough!", "{runs} from {p}. We need so much more from him.", "Where is the big-game {p}? {runs} is no use to anyone.", "Our top batter makes {runs} and we wonder why we lose. Fix it, {p}."],
    stat: ["{p} made {runs} off {balls}. For a player of his rating, that is a poor return.", "{runs} for {p}: well below what he normally gives us.", "{p} scored {runs}. The side leans on him; today he could not carry it.", "{p}'s {runs} was a rare off-day. The squad needs him to bounce back."],
    wry: ["{p} had a day off. Everybody else did too, apparently. {runs}.", "{runs} from {p}. Even the umpire looked disappointed. 😂", "{p} giving the bowlers a day to feel good about themselves. {runs}.", "{runs}. {p} must have been saving his runs for another day."],
    warm: ["Bad day for {p}, that is all. {runs}. We back him. 💙", "{nick} is better than that and we all know it. Next time.", "Hey, even the best have a bad day. {p}, {runs}. Get back out there.", "Not {p}'s day. Supporting him all the way."],
    old: ["Class is permanent but form is temporary. {p} will find it again.", "A rough one for {p}. Do not worry, the touch comes back.", "{runs} from {p}. It happens. The great ones come back stronger.", "Back to basics for {p}. He will be fine."],
    rival: ["{p} failed. Great news for us. {runs} only!", "Thanks for the early wicket, {p}. Cheers.", "{p} made {runs}. We will gladly take it.", "One of their best batters gone for {runs}. Big wicket for us."],
  },
  // too slow
  tooSlow: {
    rage: ["{runs} off {balls} from {p}?! That is not batting, that is a nap!", "{p} blocking and blocking. {balls} balls for {runs}. We needed runs!", "Please, {p}. Hit the ball! {runs} off {balls} is no use.", "Anchor? {runs} off {balls}? That is a sedative, not an innings."],
    stat: ["{p}: {runs} off {balls}, strike rate {sr}. Far too slow for this format.", "{runs} off {balls} is a strike rate of {sr}. The required rate was higher.", "{p} used {balls} balls for {runs}. That is a costly innings.", "The numbers say it all: {runs} off {balls} for {p}."],
    wry: ["{p} is batting at the pace of my grandmother's driving. {runs} off {balls}. 😂", "{runs} off {balls}. {p} must be saving the runs for later.", "Somebody check on {p}. {runs} off {balls}. Is he okay?", "{p} defended every ball like it was a family heirloom."],
    warm: ["{p} was trying to hold the innings together. Maybe too slowly, but we love him. 💙", "Tough for {nick}. {runs} off {balls}. He will try to push on next time.", "{p} gave it everything. We will find the rhythm.", "Not the quickest, but {p} was brave. Next time faster!"],
    old: ["{p} had the right idea but not the speed. {runs} off {balls} is too few.", "I like a solid defence, but {p} should try to score.", "In the old days a block was an art. In this format, {p}, it is a crime.", "{runs} off {balls}. A bit too careful for me."],
    rival: ["{p} blocked away. {runs} off {balls}! Keep it up!", "Thanks {p} for the dot balls!", "{runs} off {balls} from {p}? That helped us a lot.", "{p}'s slow innings made life very easy for our bowlers."],
  },
};
