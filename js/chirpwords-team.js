// What the fans of Chirp say about the whole team's day, the other side's stars, a player's run of form over several games, and the table.
// Same voices as chirpwords-bat.js. Slots: {me} {they} the clubs, {mine} {theirs} the scores, {by} how it was won ("by 6 runs"), {n} a number,
// {p} {pf} {nick} a player, {runs} {balls} {w} {r} his figures, {sruns} {swk} {cruns} his runs and wickets this season and in his career,
// {ducks} his ducks, {last} his last scores, {pos} a place in the table ("2nd"), {k} how many games in a row.
export const TEAM = {
  // lost two wickets in three balls and then the innings fell apart
  collapse: {
    rage: ["That collapse. THAT COLLAPSE. Three wickets gone in no time. 😤", "{me} fell apart again. The middle order folded like a deckchair.", "Wickets falling like dominoes. Is anybody out there trying?", "Wickets in a heap. We cannot keep doing this against {they}!"],
    stat: ["{me} lost wickets in a cluster: a collapse in the middle of the innings. {mine} was never enough.", "A cluster of wickets undid the innings. {me} {mine}.", "Three wickets in a handful of balls. The collapse cost us.", "The innings hinged on a collapse. {me} finished {mine}."],
    wry: ["{me}'s batting order tried to see who could get back to the pavilion fastest. 😂", "That collapse was a masterclass in disappearing acts.", "Wickets falling so fast the scoreboard needed a rest.", "The {me} middle order discovered gravity today."],
    warm: ["We will bounce back from that collapse. We always do. 💙", "One bad passage, that is all. Heads up, lads.", "That collapse hurts, but I still believe in this team.", "Not our best ten minutes. We learn and go again."],
    old: ["A collapse like that tells me the shot selection was poor. Think, lads.", "In my day we would play the ball, not the occasion. Collapses happen when you panic.", "The batters need patience. Wickets in a heap is not the way.", "Collapses happen when nerves jump. {me} must stay calm."],
    rival: ["The {me} collapse was beautiful. Thank you!", "We took the wickets in a heap. Great bowling by us.", "That {me} collapse sealed it.", "Wickets in a cluster. We love to see it."],
  },
  // chased it down from a bad start / won batting second against the odds
  comeback: {
    hype: ["WHAT A COMEBACK!!! {me} found a way again! 🔥", "From nowhere! {me} pulled it back and won! Unreal!", "We were dead and buried. Now look at us! {mine} to {theirs}!", "That is a comeback for the ages. {me}!!!"],
    stat: ["{me} won {by} after looking beaten. The comeback was the story.", "A win from a losing position: {mine} against {theirs}. Remarkable.", "{me} turned a bad position into a win {by}.", "The comeback: written off, then {mine} to {theirs}. Winners."],
    wry: ["{me} like to make it dramatic. A comeback {by}? Of course. 😂", "Did we really win that? I had already switched off. 😂", "My heart rate is still up. Thanks for nothing, {me}. And thanks for everything.", "That comeback gave me a stress rash."],
    warm: ["That is what a team looks like. {me} never gave up! 💙", "Proud of every one of them. The comeback was pure heart.", "We never stopped believing. And neither did they.", "A win like that is a family win. {me}!"],
    old: ["I said before the match: never write {me} off. A comeback to remember.", "That is the spirit of this club. Never beaten until the last ball.", "A comeback win {by}. Wonderful stuff.", "I have seen this club do that before. It is why I come back."],
    rival: ["{me} got away with that one. We were so close.", "Some comeback by {me}. We let it slip.", "We had them, and then we did not. {me} deserve it, though.", "Painful. {me} came back and we could not stop them."],
  },
  // defended a total
  defended: {
    hype: ["WE DEFENDED IT! The bowlers won us the game! 🔥", "That total was not much, and the bowlers made it enough! {me}!", "Defending {mine} and winning {by}! What a performance!", "Bowlers to the rescue! {me} win!"],
    stat: ["{me} defended {mine} and won {by}. The bowling did the work.", "{they} chased {mine} and fell short. A bowling win for {me}.", "A defended total: {mine} was enough. {they} managed {theirs}.", "The bowlers won the match. {mine} defended."],
    wry: ["We scored {mine} and told the bowlers 'good luck'. They did it. 😂", "Defending {mine} like a fortress. I did not think it was possible.", "The batting got us {mine}. The bowling got us the win. Teamwork.", "A total that looked small became a mountain."],
    warm: ["Bowlers were fantastic. A defended total and a win! 💙", "What a bowling effort! Thank you lads.", "We trusted our bowlers and they delivered.", "That is a proper team win."],
    old: ["Bowlers win matches. {me} proved it again.", "Defending a small total takes nerve. The bowlers had it.", "A great day for the bowling attack.", "Good, solid bowling. A defended total and a deserved win."],
    rival: ["We should have chased that. {me} bowled well.", "We threw it away. {me} defended it fair and square.", "Not enough from our batters. Credit to the {me} bowlers.", "We choked a chase. Ugh."],
  },
  // won with plenty of time
  chaseEasy: {
    hype: ["Chased it down with balls to spare! Easy! 💪", "That chase was a stroll. {me} are flying!", "Done and dusted with time to spare. {me}!!", "{they} could not do a thing. We cruised it."],
    stat: ["{me} chased down {theirs} {by}, with plenty of balls to spare.", "A comfortable chase: {mine} against {theirs}. Not even close.", "{me} wrapped it up early. The batters did the job.", "Chasing {theirs}, {me} finished {by} with time in hand."],
    wry: ["We chased that so quickly I missed it. Went to make tea. 😂", "Easy win. Almost boring. Almost.", "{me}'s chase was so smooth I fell asleep. Wonderful.", "That chase had no drama. Disappointing, honestly. I need drama."],
    warm: ["Lovely, calm win for {me}. Nice to relax. 💙", "A comfortable chase! Thank you lads.", "The batters were brilliant today.", "No stress, no drama, just the win. Perfect."],
    old: ["A chase done properly. No panic, no fuss.", "That is how to chase. {me} did it right.", "Calm heads, clean hitting. Well played.", "A well-judged chase. {me} deserved it."],
    rival: ["We never got going. {me} won that chase easily.", "{me} made that look easy. Annoying.", "We bowled badly and they took advantage.", "A comfortable chase for {me}. We were poor."],
  },
  // won on the last ball or the last over
  lastBallWin: {
    hype: ["WON IT ON THE LAST BALL!!! I AM SHAKING!!! 😱", "The last ball! {me} win! I cannot breathe!", "Down to the final delivery and {me} came through! 🙌", "That finish! {me}! {me}! {me}!"],
    stat: ["{me} won {by}: it went to the last over.", "A thriller: {mine} to {theirs}. Decided in the final over.", "{me} won on the very last ball. The margin: {by}.", "{theirs} chased by {they} fell short. {me} won {by} at the death."],
    wry: ["My heart cannot take this club. Every match is a thriller. 😂", "Another last-ball finish. {me} love drama too much.", "I aged ten years in that last over. Worth it.", "Anyone have a spare heart? Mine just exploded."],
    warm: ["That was incredible. I am so proud of this team. 💙", "I cried a little. {me} are special.", "What a finish. Thank you, lads.", "Nerves of steel. {me}, forever."],
    old: ["I have seen many finishes. That was one of the best.", "A last-ball finish. Wonderful cricket.", "The old ground held its breath. {me} came through.", "Magnificent. That is what cricket is for."],
    rival: ["We were so close! The last ball!", "Heartbreaking. {me} won it at the death.", "That last over destroyed us. Ugh.", "{me} got lucky on the last ball."],
  },
  lastBallLoss: {
    rage: ["Lost on the last ball. THE LAST BALL. I cannot believe it. 😭", "We threw it away in the final over. Unbelievable.", "We were right there! The last ball! 😤", "{they} stole it at the death. Rubbish bowling."],
    stat: ["{me} lost {by}: it went to the final over and slipped away.", "A narrow defeat: {mine} to {theirs}. The last ball decided it.", "{me} fell short on the last ball. Fine margins.", "Lost {by} at the death. Painful."],
    wry: ["We lose the ones we should win and win the ones we should lose. Classic {me}. 😂", "That last ball cost us a year of my life. Thanks.", "Why do we always do it the hard way?", "I might need a lie down. Or a therapist."],
    warm: ["So close, so close. Heads up, {me}. We will get them next time. 💙", "That hurts, but I am proud of the fight.", "We gave everything. Not our day.", "A heartbreak, but a brave one."],
    old: ["A close one. Close ones go either way. This time it did not go ours.", "We had the chance and let it go. Learn from it.", "In the last over, nerves matter. We lost ours.", "That is cricket. Cruel and wonderful."],
    rival: ["We scraped it on the last ball. Phew!", "{me} were so close. We got lucky at the death.", "We won, but it should not have been that close.", "Last ball win! Lovely!"],
  },
  bigTotal: {
    hype: ["{mine}! Wow! That is a BIG total! 🔥", "{me} piled up {mine}. Just brilliant!", "{mine} on the board! Good luck chasing that, {they}!", "What a batting display! {mine}!"],
    stat: ["{me} scored {mine}: one of the highest totals in the league this season.", "A big total: {mine}. The batters delivered.", "{mine} against {they}. That is a lot to chase.", "{me}: {mine}. The batting order clicked."],
    wry: ["{me} remembered how to bat. {mine}! 😂", "{mine}? Somebody pinch me.", "{me} scored {mine} and I am still in shock.", "The batters woke up. {mine}."],
    warm: ["So proud of the batters today. {mine}! 💙", "What a team effort. {mine}!", "Love it when it all clicks. {mine}!", "{mine}! That is how you build a total."],
    old: ["{mine} is a fine total. Well made.", "Good batting, good running. {mine} is plenty.", "A solid, big total. {me} batted well.", "{mine}. They played the situation well."],
    rival: ["{me} put {mine} on us. Tough to chase.", "{mine} is a lot. They batted well.", "We had no answer to {me}'s batting.", "A big total from {me}. Ouch."],
  },
  lowTotal: {
    rage: ["{mine}?! That is NOT a total! 😠", "Our batting was dreadful. {mine} is a disgrace.", "{mine}. Come on, {me}. We cannot win with that.", "How do you score {mine}? Embarrassing."],
    stat: ["{me} managed {mine}: well below par. The batting let the side down.", "{mine} is one of the lowest totals this season for {me}.", "{me} scored {mine}. The bowlers had little to defend.", "A poor total: {mine}. The batting needs a rethink."],
    wry: ["{mine}. I have scored more in a pub quiz. 😂", "The batters decided to take the day off. {mine}.", "{me} treated runs like a rare commodity. {mine}.", "{mine} is not a score, it is a cry for help."],
    warm: ["Bad day with the bat. {mine}. We still love you, {me}. 💙", "One poor innings. We will come back stronger.", "We know the batters are better than that.", "Not our day. Move on."],
    old: ["{mine}. The batting was careless. Think about the ball, lads.", "A poor total. Back to the basics.", "{mine} is not enough. Batters, get your heads right.", "Shot selection was poor. That is what happens."],
    rival: ["{me} could only manage {mine}. Easy.", "A tiny total from {me}. We cruised.", "{mine}? We were never in danger.", "{me} fell away. Just {mine}."],
  },
  sixesBonanza: {
    hype: ["SIXES EVERYWHERE! {me} cleared the rope again and again! 🚀", "What a six-hitting display from {me}!", "The crowd loved every six! {me}!", "{me} are the six-hitting kings!"],
    stat: ["{me} hit a barrage of sixes today. That is why the total was so big.", "A six-hitting day for {me}. The rope never had a chance.", "{me} cleared the boundary again and again against {they}.", "So many sixes from {me}. The stats will look good."],
    wry: ["{me} treated the rope like a suggestion. 😂", "So many sixes we lost count. I ran out of fingers.", "The stand behind the bowler's arm needs a helmet.", "The sixes just kept coming. {they} were not amused."],
    warm: ["I love watching this team hit sixes. Pure joy. 💙", "{me} are so much fun to watch.", "Every six made my day. Thank you lads.", "What entertainment! {me} forever!"],
    old: ["In my day a six was rare. {me} hit loads today.", "I am not sure what to say. So many sixes.", "Entertaining cricket from {me}. A real show.", "Big hitting. {me} gave the crowd a treat."],
    rival: ["{me} cleared the rope for fun. We could not stop them.", "So many sixes from {me}. Painful.", "We bowled gift balls. {me} said thank you.", "{me}'s sixes sank us."],
  },
  lostToBottom: {
    rage: ["We lost to {they}?! THEM?! This is a disgrace. 😡", "{they} are near the bottom and they beat us. Embarrassing.", "How can we lose to {they}? How?!", "Lost to {they}. I do not know what to say. Pathetic."],
    stat: ["{me} lost to {they}, who sit well below {me} in the table. A damaging defeat.", "{they} were outsiders and beat {me} {by}. That hurts the table.", "A defeat against {they} is rare: they were the lower side.", "{me} slipped up against {they}. Points dropped."],
    wry: ["{me} lost to {they}. Good news for neutrals, I suppose. 😂", "We found a way to lose to the team we should beat. Typical.", "{they} must be thrilled. We just made their season.", "I did not think it was possible to lose to {they}. Congratulations, {me}."],
    warm: ["Upsets happen. We will bounce back against {they} next time. 💙", "Not our day, {me}. We are better than that.", "Hard to take, but we believe.", "Keep going, lads. A bad result does not define us."],
    old: ["I never like losing to the lower sides. It says something about focus.", "Respect the opposition, always. {they} proved why.", "We took {they} too lightly. A lesson.", "A defeat to {they} is a wake-up call."],
    rival: ["{they} beat {me}!! Hilarious!", "Thanks {they}! Cheers for beating {me}.", "{me} lost to {they}. Brilliant.", "Another upset: {they} win. Well done, {they}."],
  },
  beatTop: {
    hype: ["WE BEAT {they}!!! The top side! UNBELIEVABLE! 🏆", "{they} are meant to be the best and {me} just beat them! {by}!", "That is a statement win! {me} can beat anyone!", "{they}? Beaten! Take that!"],
    stat: ["{me} beat {they}, who were well above them in the table. A statement result.", "{me} won {by} against a higher-ranked side. The table notices.", "A win against {they}: the biggest scalp of the season so far.", "{they} came in above {me}. They left below. {by}."],
    wry: ["{they} must have been tired. Or it is a miracle. Either way. 😂", "We beat {they} and the world did not end. Surprising.", "I will tell everybody we beat {they}. For years.", "{they} had a bad day. We had a good one. That is cricket."],
    warm: ["So proud of this team! We beat {they}! 💙", "That win meant so much. {me}, you are heroes.", "Beating {they} proves we belong. I am crying.", "What a day for {me}!"],
    old: ["A fine win against {they}. Well played.", "This club is growing up. A win against the top side.", "Beating {they} shows how far we have come.", "The old ground has not seen a win like that in a while."],
    rival: ["We lost to {me}?! How?!", "{me} beat {they} and I am still in shock.", "A huge result for {me}. Respect.", "{me} deserved it. We were poor."],
  },
  derbyWin: {
    hype: ["WE BEAT {they}!!! DERBY WINNERS!!! 🔥🔥", "Bragging rights are OURS! {me} {by}!", "Derby day and {me} won it! I am hoarse!", "Take that, {they}! Not even close!"],
    stat: ["{me} won the derby against {they} {by}. Rivalry settled, for now.", "{mine} to {theirs} in the derby. {me} take the points and the bragging rights.", "A derby win for {me}: {by}.", "{me} beat {they} in a heated derby."],
    wry: ["{they} fans going quiet. I can hear it from here. 😂", "Derby win! My neighbour supports {they} and I will never let him forget it.", "Sweet, sweet derby revenge.", "That feels good. Very good. 😂"],
    warm: ["Derby day magic! I love this club. 💙", "What a day for {me}! The fans were electric.", "Beating {they} means everything.", "Pure joy. Thank you, lads."],
    old: ["Nothing beats beating your rivals. {me} did it today.", "Derby day. I never get tired of it.", "That is why I follow this club. Derby wins.", "A proper derby win. Lovely."],
    rival: ["Not today, {me}. We will get you next time.", "A derby loss. Hard to take.", "{me} take this one. We will remember.", "Painful. {me} earned it, though."],
  },
  derbyLoss: {
    rage: ["We lost to {they}. In a DERBY. I am furious. 😡", "Derby day and we lose? Unacceptable!", "{they} will never let us forget this.", "How do you lose a derby like that?!"],
    stat: ["{me} lost the derby to {they}: {mine} against {theirs}.", "A derby defeat {by}. The rivalry swings {they}'s way.", "{they} won the derby. {me} must respond.", "A loss to {they}: points and pride gone."],
    wry: ["{they} fans are going to be unbearable now. 😂", "I am going to avoid my {they}-supporting neighbours for a week.", "Derby loss. Time to hide under a blanket.", "Congratulations {they}. We will remember this. 😂"],
    warm: ["We will get {they} in the return. I just know it. 💙", "A tough day. We will bounce back.", "Not the result we wanted, but still proud.", "Keep going, {me}."],
    old: ["Derby defeats are the worst. But we go again.", "I remember better days against {they}. They will return.", "A bitter pill. Learn from it.", "Derbies are not easy. {they} played well."],
    rival: ["WE BEAT {me}!!! DERBY WINNERS!!! 🎉", "Derby day delivered! {me}, cheers!", "Take that, {me}! Bragging rights are ours.", "{they} forever!"],
  },
  revengeWin: {
    hype: ["REVENGE!!! We beat {they} after they beat us before! 💪", "Payback! {me} win {by}!", "That's for the last time! Revenge is sweet!", "{they} won last time. Not now!"],
    stat: ["{me} beat {they} {by}, avenging an earlier defeat this season.", "Revenge: {me} won the return against {they}.", "{mine} to {theirs}: the score settled with {they}.", "{me} avenged the earlier loss to {they}."],
    wry: ["{they} remember beating us? We remember too. And now we have the points. 😂", "Revenge served cold. Delicious.", "Take that, {they}. We keep a list.", "We told them. We said payback."],
    warm: ["Sweet revenge! So proud of this team. 💙", "We fought back for this. {me}!", "That win meant a lot.", "Payback achieved. Time to celebrate."],
    old: ["A good win. Revenge is best served calmly.", "{me} had a score to settle, and settled it.", "That is how you answer a defeat.", "Well done, {me}. The score is settled."],
    rival: ["We lost the return to {me}. Fair play.", "{me} got revenge. Fair enough.", "We will go again. {me} earned it.", "Our turn will come again."],
  },
};

// the other side's players, and a former player of ours
export const OPP = {
  theirStar: {
    rage: ["{p} destroyed us: {runs} off {balls}. We could not get him out! 😤", "{p} made {runs} against us. Our bowlers were awful.", "Why did we bowl so badly to {p}? {runs}!", "{p}, {runs}. Another bowling disaster."],
    stat: ["{p} made {runs} off {balls} for {they}. That was the difference in the match.", "{runs} from {p}: that innings decided the contest.", "{p}'s {runs} did the damage. {they} won the contest.", "{p} hit {runs} off {balls}, strike rate {sr}. Hard to stop."],
    wry: ["{p} had a lovely time against our bowlers. {runs}. 😂", "Thank you for the practice, {p}. {runs}.", "{p} wrote a {runs}-run letter to our bowling attack.", "Our bowlers: 'Who is this {p}?' Everybody: {runs}."],
    warm: ["{p} was brilliant, {runs}. Hats off. We go again.", "Credit to {p}. We will learn from it. 💙", "A fine knock from {p}. {me} will be stronger.", "{p} played well. Our turn next."],
    old: ["{p} was too good for us. {runs}. That is that.", "A class innings by {p}. We must respect it.", "{p} made {runs}. The best I have seen from the other side.", "{p} is a proper batter. {runs}."],
    rival: ["{p} was unreal! {runs}!", "Our {p} destroyed {me}!", "{p} made {runs} and carried us.", "{p}! {runs}! Legend!"],
  },
  theirBowler: {
    rage: ["{p} took {w} against us. Our batters could not handle him! 😠", "{p}, {w} wickets. Pathetic from our order.", "How did {p} get {w}? Our batters were useless.", "{w} for {p}. The batting collapsed again."],
    stat: ["{p} took {w} for {they}. He decided the match.", "{p}: {w} wickets, {r} runs. A spell that mattered.", "{w} wickets for {p}. {me} had no answer.", "{p}'s {w} for {r} told the story."],
    wry: ["{p} was kind enough to take {w} of our wickets. 😂", "Thanks for the wickets, {p}. We will send a card.", "{p}: {w} wickets. We just gave them away.", "Our batters walked into {p}'s traps. {w} wickets."],
    warm: ["Hats off to {p}. {w} wickets. We go again. 💙", "{p} bowled well. We will find a way.", "Fair play to {p}. Strong bowling.", "A good spell from {p}. Respect."],
    old: ["{p} bowled well. Line and length. That is all there is to it.", "A fine spell from {p}. We must be sharper.", "{w} for {r}. {p} was good.", "{p} did what a bowler should: attacked the stumps."],
    rival: ["{p} was brilliant! {w} wickets!", "Our {p} took {w}! What a bowler!", "{p} won it for us.", "{p}! {w} wickets! Hero!"],
  },
  // a player we sold or let go does well against us
  formerHurt: {
    rage: ["Our old boy {p} scores {runs} against us. Typical. 😤", "We let {p} go and he comes back to hurt us. Brilliant.", "{p}, {runs} against us. That is a bit rich.", "Why did we ever let {p} leave? {runs}!"],
    stat: ["{p}, who left {me}, hit {runs} off {balls} against his old club.", "A former {me} man: {p} made {runs}. A reminder of what we gave up.", "{runs} for {p} against {me}. He remembers.", "{p} has {runs} against us. Revenge is a dish best served in runs."],
    wry: ["{p} showed up to remind us why we signed him. {runs}. 😂", "A great job by {p}. Against us. Of course.", "{p} loves playing against his old team. {runs}!", "I wonder if {p} sent a thank-you card. {runs}."],
    warm: ["Good for {p}. {runs}. We wish him the best, even if it hurts. 💙", "{nick} was always a good one. Proud of him, even today.", "I hold no grudge. {p} did well. {runs}.", "Once a {me} man, always a {me} man. {p}, {runs}."],
    old: ["That is what happens when you let a good player go. {p}, {runs}.", "I told them. {p} had more to give. {runs}.", "A player of {p}'s quality never forgets his old club. {runs}.", "We have seen it before. The one who leaves comes back to hurt."],
    rival: ["{p}! {runs} against his old club! Perfect!", "Our {p} showed {me} what they lost!", "{runs}! {p} remembers!", "{p} against his old side. {runs}. Sweet."],
  },
  formerWickets: {
    rage: ["{p} takes {w} against his old club. That stings. 😤", "{p} bowling for {they} and taking {w}. Typical.", "We let {p} go and he returns with {w} wickets.", "{w} for {p}. Why did we let him go?"],
    stat: ["{p}, a former {me} bowler, took {w} against his old side.", "{w} wickets for {p} against {me}. He left, and he is making a point.", "{p} took {w} for {r} against us. A reminder.", "{p} returns to bite: {w} wickets."],
    wry: ["{p} took {w} against us. Thanks for the memories. 😂", "{p} remembers how to get {me} out.", "{p} found our weakness: all of it.", "{w} wickets for our old boy. Cheers."],
    warm: ["Good for {p}, even if it hurts. {w} wickets. 💙", "{nick} always had it. Proud of him.", "No hard feelings. {p}, {w} wickets.", "He will always be one of ours."],
    old: ["That is what happens when you let a good bowler go. {p}, {w}.", "I told them to keep {p}. {w} wickets.", "A good bowler remembers his old club.", "We should have kept him."],
    rival: ["{p}! {w} wickets against his old club!", "Our {p} did the job against {me}!", "{p} showed {me} what they lost!", "{w} wickets! {p} is back!"],
  },
};

// a player's run of form over several games
export const MEM = {
  formBat: {
    hype: ["{p} has now scored {last} in his last {k} games. HE IS ON FIRE! 🔥", "{k} good knocks in a row for {p}. Unstoppable!", "{p}: {last}. Somebody get that man a trophy!", "Form is temporary but {p}'s run is glorious!"],
    stat: ["{p}'s last {k} innings: {last}. That is {sruns} runs this season.", "{p} has made 20 or more in {k} straight games. Elite consistency.", "{p}: {last}. A very hard streak to ignore.", "{k} in a row for {p}. His season total: {sruns}."],
    wry: ["{p} keeps scoring runs and I keep running out of compliments. 😂", "{p}'s form is so good the bowlers are fleeing the country.", "{p} again? {last}? Give someone else a go.", "I think {p} is just showing off at this point."],
    warm: ["Proud of {p}. {k} good innings in a row. A lovely run. 💙", "{nick} is playing with such confidence now.", "So happy for {p}. He deserves it.", "What a streak for {p}! Keep going, lad."],
    old: ["Good players find form and keep it. {p} has done both.", "{p} has class. {k} knocks in a row proves it.", "A consistent run from {p}. That is how a player should be.", "{p}'s form reminds me of the greats."],
  },
  slumpBat: {
    rage: ["{p}: {last}. When is he going to start scoring?! 😠", "{k} poor innings in a row from {p}. Drop him!", "{p} has not scored in {k} games. Wake up!", "{last} from {p}. Not good enough."],
    stat: ["{p}'s last {k} innings: {last}. A real slump.", "{p} has failed to make double figures in {k} straight.", "{p}: {last}. Season runs: {sruns}. The numbers are concerning.", "A {k}-innings dip for {p}."],
    wry: ["{p} is on a streak! Of ducks and tiny scores! 😂", "{p} is saving all his runs for retirement.", "Someone tell {p}: runs count. {last}.", "{p}'s bat is on holiday."],
    warm: ["Hang in there, {p}. Form will come back. 💙", "{nick} is too good to keep failing. Keep believing.", "We are behind you, {p}.", "Bad patch, that is all. {p} will be back."],
    old: ["Form leaves every batter at some point. {p} needs a rest or a net.", "Come on {p}. Stay behind the ball.", "A slump is a test of character. {p} must find it.", "He will come through, I have seen it before."],
  },
  formBowl: {
    hype: ["{p} has taken wickets in {k} games in a row! 🔥", "{k} matches, {k} wicket-takers. {p} is a machine!", "{p} just keeps taking wickets! {swk} this season!", "Wicket after wicket from {p}. What a streak!"],
    stat: ["{p} has taken a wicket in each of his last {k} games. {swk} this season.", "{p}: wickets in {k} straight. Reliable.", "A {k}-game wicket streak for {p}. Impressive.", "{swk} wickets this season for {p} now."],
    wry: ["{p} is collecting wickets like stamps. 😂", "{p} cannot stop taking wickets. Someone check his pockets.", "Batters are afraid of {p}. Rightly so.", "{p} has a nose for wickets. And a streak."],
    warm: ["{p} is bowling beautifully lately. So proud. 💙", "{nick} is flying right now.", "Love seeing {p} so confident.", "Well deserved, {p}. Keep going."],
    old: ["{p} has the knack. Wickets come to a bowler who bowls the right line.", "A consistent bowler. {p} delivers.", "{p} knows how to take wickets, that is plain to see.", "That is a proper bowler's run."],
  },
  dryBowl: {
    rage: ["{p} has not taken a wicket in {k} games! What is going on?! 😤", "{p}: no wickets in {k}. Time for a change.", "Our bowler {p} is not delivering. {k} games without a wicket.", "{p} bowling is not good enough. {k} blanks."],
    stat: ["{p} has gone {k} games without a wicket. {swk} for the season.", "No wickets in his last {k}: {p} needs a spark.", "{p}'s dry run: {k} matches.", "{k} games, 0 wickets for {p}."],
    wry: ["{p} is on a wicket diet. It is not working. 😂", "{p} has not taken a wicket in so long that I forgot he was a bowler.", "The batters thank {p} for his service. {k} games.", "{p} is just keeping the ball warm."],
    warm: ["{p} will find his rhythm again. We trust him. 💙", "{nick} is working hard. Wickets will come.", "Just a dry spell. Keep going, {p}.", "We believe in {p}."],
    old: ["Every bowler has dry spells. {p} will come through.", "{p} must stick to line and length. The wickets will come.", "A dry run is not the end. {p} is a good bowler.", "Patience. {p} needs time."],
  },
  duckCount: {
    rage: ["That is {duckn} for {p} this season! ENOUGH! 😡", "{p} has {duckn}. How much longer?", "{duckn}! {p} should be dropped!", "{p}: another duck. {ducks} in total. Unreal."],
    stat: ["{p} now has {duckn} in the season. A poor record.", "{duckn} for {p}. His average suffers.", "{p}: {duckn}, {sruns} runs. The ratio is not great.", "{duckn} and counting for {p}."],
    wry: ["{p} is collecting ducks. A whole pond by now. 🦆😂", "{duckn} for {p}. He could open a farm.", "A duck count of {ducks}. That is a record, surely.", "{p} is the king of ducks. 🦆"],
    warm: ["{p} is going through a tough time. {duckn}. We still love him. 💙", "He will get through this, {nick}.", "A duck is just a duck. {p} will come good.", "Stay strong, {p}."],
    old: ["{duckn}. That is a bad run. {p} should work on the basics.", "{p} must reset. Ducks are a matter of focus.", "He should watch the ball. That is all.", "{p} is a better player than {duckn}."],
  },
  seasonRuns: {
    hype: ["{p} has crossed {sruns} runs this season! 🔥", "{sruns} runs for {p}! What a season!", "{p} is smashing records. {sruns} runs!", "{sruns} this season! {p}, you star!"],
    stat: ["{p}: {sruns} runs this season. A milestone.", "{p} has passed {sruns} runs for the season.", "A milestone: {sruns} runs for {p}.", "{sruns} season runs for {p}, in only {k} matches."],
    wry: ["{p} has {sruns} runs and still wants more. Greedy. 😂", "{sruns} runs? {p} is just getting started.", "{p} keeps the scorers busy: {sruns}.", "{sruns}! {p} is a run machine."],
    warm: ["So proud of {p} reaching {sruns} runs. 💙", "{nick}'s season is brilliant: {sruns} runs.", "What a player. {sruns} runs and counting.", "Thank you {p}. {sruns} runs!"],
    old: ["{sruns} runs in a season. That is a fine tally.", "A good season for {p}. {sruns} runs.", "{p} is playing well. {sruns} runs now.", "Another milestone for {p}. {sruns}."],
  },
  seasonWkts: {
    hype: ["{p} has {swk} wickets this season! 🔥", "{swk} wickets for {p}! Absolute legend!", "{p} is the wicket-taker we needed. {swk}!", "{swk} wickets and counting for {p}!"],
    stat: ["{p}: {swk} wickets this season. A milestone.", "{p} has passed {swk} wickets.", "A fine tally: {swk} wickets for {p}.", "{swk} season wickets for {p}, in {k} matches."],
    wry: ["{swk} wickets for {p}. The batters are scared. 😂", "{p} is a wicket magnet. {swk}.", "{swk}! {p} is cleaning house.", "{p} keeps taking wickets. {swk} now."],
    warm: ["So proud of {p}. {swk} wickets. 💙", "{nick} is a hero. {swk} wickets.", "What a bowler! {swk} this season.", "Thank you {p}. {swk}!"],
    old: ["{swk} wickets. That is a proper season.", "A fine bowler. {swk} wickets for {p}.", "{p} bowls well. {swk} now.", "{swk} wickets. Another milestone."],
  },
  careerRuns: {
    hype: ["{p} has passed {cruns} career runs for {me}! 🎉", "{cruns} runs and counting for {p}!", "A club legend: {p}, {cruns} runs!", "{cruns}! Happy milestone, {p}!"],
    stat: ["{p}: {cruns} career runs. A big milestone.", "{p} reached {cruns} runs in his career.", "{cruns} runs for {p}. A real servant of the club.", "{p}'s career total is now {cruns}."],
    wry: ["{p} has {cruns} career runs for {me}. I have never scored that many in anything. 😂", "{cruns} runs? {p} deserves a statue.", "Somebody get {p} a cake. {cruns} runs!", "{cruns} runs and still smiling. {p}."],
    warm: ["So proud of {p}. {cruns} runs for our club. 💙", "A true servant. {cruns} runs.", "{nick}: {cruns}. Thank you for everything.", "What a career. {cruns} runs!"],
    old: ["{cruns} runs. {p} has served the club well.", "A fine career total. {p}, {cruns}.", "{p} is a club man. {cruns} runs.", "{cruns} runs. They do not make them like {p}."],
  },
  capRace: {
    hype: ["{p} is now the top run-scorer in the league! ORANGE CAP! 🧡", "{p} leads the runs table! What a season!", "Top of the run charts: {p}! {sruns} runs!", "{p} takes the lead in the runs race! 🧡"],
    stat: ["{p} now leads the league in runs with {sruns}.", "{p}: {sruns} runs and the orange cap.", "The runs race: {p} is first with {sruns}.", "{p} tops the scoring charts: {sruns}."],
    wry: ["{p} has taken the orange cap. The other batters are furious. 😂", "{p} is now top scorer. Do not tell the other teams.", "{p} leads the run charts. Not bad for a part-timer.", "The orange cap looks good on {p}."],
    warm: ["So proud of {p}. Top scorer in the league! 💙", "{nick} is brilliant. Orange cap!", "What a player. {sruns} runs, top of the charts.", "{p}, the league's top run-scorer. Our boy."],
    old: ["A top scorer from our club. Wonderful.", "{p} leads the league in runs. A joy to see.", "{sruns} runs and top of the table for batters. {p} deserves it.", "Orange cap for {p}. About time."],
  },
};

// the table
export const TABLE = {
  topSpot: {
    hype: ["TOP OF THE TABLE! {me} are number one! 🥇", "Look at the table! {me} on top! 🏆", "We are first! {me}, first! I am dreaming!", "{me} lead the league! Unreal!"],
    stat: ["{me} move up to {pos} in the table.", "{me}: first place. The points tell the story.", "{me} top the table after this result.", "The league table: {me} are {pos}."],
    wry: ["{me} are top of the league. Somebody pinch me. 😂", "Did we really go top? Check the table again.", "{me} at the top. Keep them there. Please, keep them there.", "I am not looking at the table. I am not looking."],
    warm: ["Top of the table! So proud of this team. 💙", "{me} deserve every point.", "First place! Thank you lads!", "What a season. {me}!"],
    old: ["I never thought I would see us top. Wonderful.", "Top of the table. It has been too long.", "{me} are leading. Lovely to see.", "Top spot. Do not mess it up, lads."],
  },
  slide: {
    rage: ["We are slipping down the table! This is not good enough! 😤", "{me} dropped to {pos}. Embarrassing.", "Another defeat and we slide down. Fix it!", "The table looks awful. Wake up, {me}!"],
    stat: ["{me} fall to {pos} in the table.", "{me}: {pos} now. The slide continues.", "The table does not lie. {me} are {pos}.", "{me} slip down to {pos} after the defeat."],
    wry: ["{me} are in free fall. At least the view is nice. 😂", "Down the table we go. Wheeee.", "The table is a cruel mistress. {me} are {pos}.", "I do not look at the table any more. It makes me sad."],
    warm: ["It is only {pos}. We will climb again. 💙", "Chin up, {me}. The season is long.", "Table positions change. We are not done.", "We believe."],
    old: ["The table has its ups and downs. Do not panic.", "I have seen this club in worse places. Stay calm.", "{pos} is not a disaster. Yet.", "Keep working, lads."],
  },
  bottomThree: {
    rage: ["We are in the relegation places! Wake up! 😱", "Bottom three! This is a disaster!", "{me} are in trouble. Real trouble.", "The drop is looming. Fix it now!"],
    stat: ["{me} sit in {pos}, inside the relegation places.", "{me} are {pos} in the table. A real danger.", "The bottom of the table: {me} are {pos}.", "{pos} place. The drop zone is close."],
    wry: ["{me} are in the relegation zone. At least we are consistent. 😂", "Relegation fight? {me} love drama.", "The only way is up. Right? Right?", "I am not panicking. I am not panicking."],
    warm: ["We can get out of this. Believe. 💙", "Stay strong, {me}. We have a squad.", "Keep fighting.", "One win and everything changes."],
    old: ["I have seen relegation battles before. Fight.", "Do not give up. Clubs come back from this.", "It will be a long season. Keep fighting.", "The lads must dig in."],
  },
};
