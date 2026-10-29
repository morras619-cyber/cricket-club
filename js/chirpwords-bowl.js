// What the fans of Chirp say about a bowler's spell. Same voices as chirpwords-bat.js.
// Slots: {p} {pf} {nick} the bowler, {w} his wickets, {r} runs he gave, {balls} balls bowled, {econ} runs an over, {swk} his wickets this season,
// {me} {they} the clubs.
export const BOWL = {
  // three wickets in three balls
  hatTrick: {
    hype: ["HAT-TRICK!!! {p} with THREE IN THREE BALLS!!! 🎩🎩🎩", "I am screaming! {p} took a hat-trick! A HAT-TRICK!", "{nick} has a HAT-TRICK! Put that on the club wall forever!", "Three balls, three wickets. {p}, you absolute legend! 🎩"],
    stat: ["{p}: a hat-trick. Three wickets in three balls. {w} for {r} in all.", "A hat-trick for {p}. It has been a long time since I saw one.", "Three in three. {p} finishes with {w} for {r}. Historic.", "Hat-trick! {p}'s figures: {w}/{r} from {balls} balls."],
    wry: ["{p} took a hat-trick and now the opposition needs a hat. 🎩😂", "Three wickets in three balls. {p} is just showing off now.", "That hat-trick means {p} owes the team a drink. 🍻", "{p}: three balls, three wickets. The batters did not even have time to find the dressing room."],
    warm: ["Our {p} with a HAT-TRICK! So proud of him. 💙💙", "{nick} deserves this more than anyone. A hat-trick! 😭", "Hat-trick! I have no words. Thank you, {p}!", "What a moment for {p}. A hat-trick in our shirt!"],
    old: ["A hat-trick. In all my years at this ground I have seen two. {p} just made it three.", "{p}'s hat-trick is the kind of thing I will tell my grandchildren.", "A true hat-trick. They give a hat for that, you know. {p} has earned it.", "The crowd rose as one. {p}, hat-trick. Unforgettable."],
    rival: ["{p} took a hat-trick against us. Ouch.", "A hat-trick, {p}? Seriously? We will never hear the end of it.", "Okay {p}, that is impressive. Three in three. Brutal.", "Hat-trick for {p}. We collapsed. Respect."],
  },
  // two wickets in two balls
  nearHat: {
    hype: ["TWO IN TWO for {p}! Almost a hat-trick! 😱", "{p} took two wickets in two balls! So close to a hat-trick!", "That nearly was a hat-trick! {p} is on fire! 🔥", "Two wickets in a row for {p}. The ground was buzzing!"],
    stat: ["{p}: two in two balls. One short of a hat-trick. {w} for {r}.", "Two consecutive wickets for {p}. A hat-trick ball followed. It just missed.", "{p} struck twice in two balls. The next ball was the one the crowd wanted.", "Two in two for {p}. Hat-trick chance? The numbers say close."],
    wry: ["{p} took two in two and then got greedy. Hat-trick ball? Nope. 😂", "Two in two! {p} is just teasing us now.", "{p} nearly had the hat-trick, and the crowd nearly had a heart attack.", "Two wickets in two balls. {p} says 'maybe next time' to the hat-trick."],
    warm: ["Two in two! {p}, we love you! So close to a hat-trick! 💙", "{nick} almost did it! Two in two balls. Proud of him.", "That hat-trick ball! I could not breathe. {p} is a hero.", "Two wickets in a row from {p}. Hat-trick or not, he is brilliant."],
    old: ["Two in two. I held my breath for the hat-trick ball. {p} very nearly had it.", "{p} did what every bowler dreams of: two in two. Then came the hat-trick ball.", "I have seen a few hat-tricks. {p} just got two-thirds of one. Well done.", "The crowd murmured on that hat-trick ball. Two in two, {p}."],
    rival: ["Two in two against us. {p}. Ouch.", "We nearly lost three in three. {p} was fearsome.", "{p} got two in two balls. We survived the hat-trick ball. Just.", "That was not pretty: two in two for {p}. We held on to avoid the hat-trick."],
  },
  // took all three wickets
  cleanSweep: {
    hype: ["{p} took ALL {w} wickets! Cleaned them out! 🧹", "{w} wickets for {p}! The whole innings, ended!", "{nick} bowled them all out! {w} for {r}!", "{p}, {w} wickets. The batters had no answers."],
    stat: ["{p}: {w} for {r}. All the wickets in the innings.", "{w} wickets for {p} from {balls} balls. That ends the innings, and the contest.", "Figures of {w}/{r} for {p}. Every wicket was his.", "{p} took {w} for {r}. He bowled them out on his own."],
    wry: ["{p} took every wicket and left nothing for the others. Selfish. 😂", "{w} wickets for {p}. The rest of the bowlers were just spectators.", "{p} cleaned them out. The cleaner has been fired.", "All {w} wickets? {p}, share a little!"],
    warm: ["{p} was incredible! {w} for {r}. I am so proud. 💙", "{w} wickets for {nick}! He deserves a standing ovation.", "What a spell from {p}. {w} wickets and a smile.", "Thank you {p}. {w} for {r}. You are a hero."],
    old: ["{w} wickets for {r} from {p}. That is old-fashioned bowling: line, length and nerve.", "A great spell from {p}. {w} for {r}.", "Bowled like a master. {p}, {w} wickets.", "{p}'s {w} for {r} will go down in the club's book."],
    rival: ["{p} took {w} wickets against us. We were bowled out by one man.", "{w} for {r}. {p} destroyed us.", "{p} was unplayable. {w} wickets and that was that.", "We could not read {p} at all. {w} for {r}."],
  },
  // two wickets
  twoWickets: {
    hype: ["Two wickets for {p}! He is on a roll! 🔥", "{p} took {w} wickets! Brilliant bowling!", "{nick} strikes twice! {w} for {r}!", "Two big wickets from {p}. We are loving it."],
    stat: ["{p}: {w} for {r} in {balls} balls. Economy {econ}. Efficient.", "Two wickets for {p}. His season tally is now {swk}.", "{w}/{r} for {p}. A very solid spell.", "{p} struck twice. {econ} runs an over. Quality."],
    wry: ["{p} took two wickets and a bow. Not in that order. 😂", "Two for {p}. The batters are queueing to get out.", "{p} makes it look easy: {w} wickets, no sweat.", "{p} with two wickets. The other bowlers are taking notes."],
    warm: ["Well bowled {p}! Two wickets and a lot of heart. 💙", "{nick} is bowling with such confidence. {w} for {r}!", "{p} deserved every one of those wickets.", "Proud of {p}. Two wickets today. 🙌"],
    old: ["Two wickets, tidy line. {p} knows what he is doing.", "{p} bowled with intelligence. Two wickets.", "A sound spell from {p}. {w} for {r}. Good.", "That is proper bowling. {p}, two wickets."],
    rival: ["{p} got two of ours. We will be ready next time.", "Two wickets for {p}. Annoying, but fair.", "{p} did the damage. Two wickets against us.", "Good bowling from {p}. We have to find a way past him."],
  },
  // six dots in an over
  maiden: {
    hype: ["A MAIDEN from {p}! Not a run given! 🙌", "Six dots from {p}! The batters could not do a thing!", "{nick} bowled a maiden! Brilliant!", "Maiden over! {p} is a wall!"],
    stat: ["{p} bowled a maiden: six balls, no runs. {econ} an over overall.", "A maiden for {p}. They are rare in this format.", "Six dot balls from {p}. That is pressure.", "{p}'s maiden over: 0 runs, {balls} balls bowled. Elite."],
    wry: ["{p} bowled a maiden. The batters are still looking for a gap. 😂", "Six dots! {p} gave them nothing. Not even a smile.", "A maiden over from {p}. I have seen less action at a library.", "{p} said 'no' six times. Politely. Firmly."],
    warm: ["Love the control from {p}. A maiden! 💙", "{nick} is bowling beautifully. A maiden over!", "What a spell from {p}. A maiden and a half.", "{p} is giving nothing away. Proud of him."],
    old: ["A maiden. That is the sign of a proper bowler. {p} did it.", "Line and length. Six dots from {p}. Lovely.", "I enjoy a maiden over more than a six. {p} delivered one.", "That is pressure bowling, and {p} is a master."],
    rival: ["A maiden from {p}. We could not score off him.", "Six dots from {p}. We froze.", "{p} bowled a maiden against us. Embarrassing for the batters.", "We could not get {p} away. A maiden."],
  },
  // a maiden that also took a wicket
  wicketMaiden: {
    hype: ["A WICKET MAIDEN from {p}!!! Dots AND a wicket! 🔥", "{p} bowled a wicket maiden! Pure class!", "Not a run and a wicket! {nick} is magnificent!", "Wicket maiden! {p} is unstoppable!"],
    stat: ["{p}: a wicket maiden. Six balls, no runs, one wicket.", "A wicket maiden for {p}. The sort of over that decides matches.", "Zero runs, one wicket. {p}'s over was a work of art.", "{p} bowled a wicket maiden. Statistically, one of the best overs you can bowl."],
    wry: ["A wicket maiden. {p} took a wicket and gave nothing back. 😂", "{p} bowled a wicket maiden. The batters are still confused.", "No runs and a wicket. {p} is a miser.", "That over from {p} should be framed."],
    warm: ["A wicket maiden! {p}, you beauty! 💙", "{nick} is showing everyone how it is done. Wicket maiden!", "So proud of {p}. A wicket maiden!", "Thank you {p}! A wicket maiden is pure joy."],
    old: ["A wicket maiden! A rare and beautiful thing. {p} produced one.", "That is old-school bowling. {p}, a wicket maiden.", "I could watch {p} bowl that over all day.", "Not one run and a wicket. {p} is a craftsman."],
    rival: ["A wicket maiden for {p}. That over broke us.", "{p} gave us nothing and took a wicket. Ouch.", "That wicket maiden from {p} turned the game.", "{p}: a wicket maiden. We were out of ideas."],
  },
  // a very tight spell
  tight: {
    hype: ["{p}'s spell: {w} for {r} from {balls} balls! Too tight to hit! 🔒", "{p} choked the batters! {econ} an over!", "{nick} strangled the innings. Brilliant spell!", "What control from {p}! {r} runs from {balls} balls!"],
    stat: ["{p}: {r} runs from {balls} balls. Economy {econ}. The pick of our bowlers.", "An economy of {econ} for {p}. In this format, that is gold.", "{p} conceded just {r} from {balls}. The batters could not get him away.", "{econ} an over from {p}. The squeeze was on."],
    wry: ["{p} bowled so tight the batters asked for a bigger bat. 😂", "{r} runs from {balls} balls. {p} is a human brake pedal.", "{p} bowled like a locked door. {econ} an over.", "Nobody can score off {p}. It is rude, really."],
    warm: ["Love how {p} controls an innings. {r} from {balls}. 💙", "{nick} was brilliant. Tight, clever, calm.", "{p} is such a smart bowler. {econ} an over!", "Thank you {p}. You made them work for every run."],
    old: ["That is control. {p}, {r} off {balls}. A bowler's spell.", "Tight lines, no loose balls. {p} did it right.", "In my day, a bowler like {p} was gold. Still is.", "{p} bowled the way it should be done. {econ} an over."],
    rival: ["We could not score off {p}. {r} runs from {balls} balls.", "{p} strangled us. {econ} an over. Ugh.", "That tight spell from {p} cost us the match.", "We panicked against {p}. Not a boundary in sight."],
  },
  // an expensive over
  expensive: {
    rage: ["{p} gave away {r} in {balls} balls! What was that?! 😤", "{p} is getting hammered. {r} runs. Take him off!", "Terrible bowling from {p}. {r} off {balls}. No excuses.", "{r} runs from {p}'s spell. Where is the line and length?!"],
    stat: ["{p}: {r} runs from {balls} balls, economy {econ}. The worst figures of the match.", "{p} went for {econ} an over. That is far too expensive.", "{r} conceded by {p}. The match swung on that spell.", "{p}'s {econ} economy hurts. The other bowlers were better."],
    wry: ["{p} bowled like a catering service: lots of free runs. 😂", "{r} off {balls}. {p} is a very generous man.", "{p} is serving up full tosses like a buffet.", "{p} gave them a gift bag. {r} runs."],
    warm: ["Tough day for {p}. {r} off {balls}. But he will bounce back. 💙", "{nick} was unlucky today. We still believe in him.", "{p} got hit, it happens. Keep your head up, mate.", "Bad spell for {p}, that is all. He will be fine."],
    old: ["{p} lost his line. {r} off {balls}. Back to the basics, son.", "That was not a good spell. {p} knows it.", "Even the best bowlers get hit. {p} must learn from it.", "{p} bowled too many bad balls. It cost us."],
    rival: ["{p} gave us {r}. Thank you very much!", "Please keep bowling {p}, {me}. {r} off {balls}!", "{p} is our favourite bowler now. {r} runs!", "We hit {p} everywhere. {r} off {balls}."],
  },
  // a spell with no wickets and lots of runs
  disaster: {
    rage: ["{p}: 0 wickets and {r} runs. That is a disaster. 😡", "Why is {p} still bowling? {r} runs and nothing to show.", "{p} went for {r} and took nothing. Awful.", "I have seen better bowling at the village green. {p}, {r} runs, no wickets."],
    stat: ["{p}: 0 for {r} from {balls} balls. Economy {econ}. A rough spell.", "{p} has not taken a wicket and gave {r} runs. The pressure is on him.", "0/{r} for {p}. The season figures take a hit.", "{p}'s {r} runs without a wicket decided the contest."],
    wry: ["{p}: 0 for {r}. A masterclass in how not to bowl. 😂", "{p} gave away {r} and took nothing. Charity work.", "{r} runs, no wickets. {p} was a very kind host.", "{p} should be paid in sixes for the amount he gave away."],
    warm: ["Rough day for {p}. 0 for {r}. We still love him. 💙", "{nick}'s time will come. {r} runs today, wickets tomorrow.", "{p} gave it everything. Not his day.", "Chin up {p}. We trust you."],
    old: ["0 for {r}. That is a bad day at the office, {p}. Learn and move on.", "Wicketless and expensive. {p} must find his rhythm.", "{p} has to bowl better than that. He knows.", "The nets for {p} tomorrow. {r} runs is too many."],
    rival: ["{p} went for {r} and no wickets. Wonderful.", "Please never change {p}. 0 for {r}!", "Thanks for the runs, {p}.", "{p} was our best friend today. 0 for {r}."],
  },
};
