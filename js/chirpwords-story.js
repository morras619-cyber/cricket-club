// What the fans of Chirp say about the club's own story: a signing, a player leaving, a promotion, the journey from the lower divisions.
// Same voices as chirpwords-bat.js (the sad or angry ones are 'rage'). Slots: {p} {pf} {nick} the player, {me} the club, {they} the club he joined,
// {price} what he cost, {ovr} his rating, {age} his age, {div} the division now, {from} the division the club started in (when it differs),
// {yrs} how many seasons the fans have been through, {pos} the finishing place, {sruns} {swk} his season, {cruns} {cwk} his career.
export const STORY = {
  // a new player at the auction, rated 82 or more
  signedStar: {
    hype: ["WE SIGNED {pf}!!! {ovr} rated! The ambition is REAL! 🔥", "{p} is a {me} player! Unbelievable signing! 🙌", "Rated {ovr}, and he chose {me}! LET'S GO!", "A star at last! {pf} joins the club!"],
    stat: ["{p} arrives for {price}. He is rated {ovr}, among the best in the squad.", "The club paid {price} for {pf}. At {ovr}, the price looks fair.", "{p}: {ovr} overall, {age} years old, {price}. A statement signing.", "{pf} costs {price}. The squad gets better on paper."],
    wry: ["{p} for {price}. I hope he is worth every penny. And I hope the bank still likes us. 😂", "We bought a star. Somebody check the wallet.", "{price} for {p}? I would have done it for free. Just kidding. Do not tell the board.", "Sign {p}: done. Win the league: next."],
    warm: ["Welcome to {me}, {pf}! We are so happy to have you. 💙", "{p} in our colours! I cannot wait.", "A big welcome to {nick}! You will love it here.", "So proud of the club for signing {p}."],
    old: ["A signing like {p}. In my day we never saw such talent come here. Welcome.", "{pf} for {price}. A good piece of business, I would say.", "A real player. {p} will do well here.", "I like it. {p} has the quality."],
    rival: ["{me} signed {p}? Not bad. Worried now.", "{p} at {me}. The league just got harder.", "A smart signing from {me}. We will have to watch out.", "{me} buying {p}. Interesting."],
  },
  // a new player who cost little
  signedBargain: {
    hype: ["{p} for just {price}! What a BARGAIN! 🔥", "{price} for a {ovr}-rated player! Genius work!", "Steal of the auction: {p}! {price}!", "{pf} for {price}. The board knows what it is doing!"],
    stat: ["{p} cost {price} and is rated {ovr}. The value is clear.", "A bargain: {pf}, {ovr}, {price}.", "At {price}, {p} is among the best-value signings.", "{p}: {ovr} rated, only {price}. Good business."],
    wry: ["{p} for {price}. I paid more for lunch. 😂", "We bought {p} at a discount. Someone check the receipt.", "A bargain! Hope there is no catch.", "{price}! The other clubs are weeping."],
    warm: ["Welcome {p}! We got a good one. 💙", "A great signing at a great price.", "We are lucky to have {nick}.", "So pleased to see {p} at the club."],
    old: ["Good money management. {p} for {price}. I approve.", "Value for money. {pf} will do well.", "The board has done well here. {price} for {p}.", "A canny signing."],
    rival: ["{me} got {p} for {price}?! How?!", "Great deal for {me}. We missed out.", "{p} at {price}. We should have bid.", "Clever work from {me}."],
  },
  // a new player who cost a lot
  signedBig: {
    hype: ["{price} for {p}! The club is going BIG! 💰🔥", "We spent {price} on {pf}! That is ambition!", "{p} joins for {price}! Let's gooo!", "Big spending, big dreams. {pf}!"],
    stat: ["{pf} cost {price}: among the club's biggest outlays. He is rated {ovr}.", "{price} for {p}. Expectations are high.", "{p}, {ovr} rated, {price}. The club has invested heavily.", "A major signing at {price}."],
    wry: ["{price} for {p}. He had better score a hundred every week. 😂", "The wallet is empty but the squad looks great.", "{p} costs {price}. Let's hope the bank manager is a cricket fan.", "Spent big, hoping bigger."],
    warm: ["I trust the club. {p} will be worth it. 💙", "Welcome {pf}! We are with you.", "A big price, but I think he will pay it back.", "Come on, {nick}. Show us."],
    old: ["{price} is a lot of money. {p} had better deliver.", "A heavy investment. Let us see if it pays off.", "I remember when {price} could buy a whole team. {p} had better be good.", "Time will tell with {p}."],
    rival: ["{me} spent {price} on {p}. Brave.", "{price}?! {me} are going for it.", "{p} costs {price}. We will see.", "A big risk for {me}."],
  },
  // a player who cost a lot and is not rated for it
  signedOverpay: {
    rage: ["{price} for {p}?! He is rated {ovr}! Has the board lost its mind? 😤", "We paid {price} for a {ovr}. Someone explain this to me.", "{pf} for {price}? I could have found a better one at the market.", "{price} on {p}. Terrible business."],
    stat: ["{p} is rated {ovr} and cost {price}. That is expensive for the rating.", "{price} for a {ovr}-rated player is a lot, however you look at it.", "The club paid {price} for {pf}, rated {ovr}. The value is not obvious.", "{p}: {ovr} rated, {price}. Questions will be asked."],
    wry: ["{price} for {p}. I hope the receipt says 'returnable'. 😂", "We paid {price} for a {ovr}. Bold. Very bold.", "{p} must have a great agent. {price}!", "The board shops without a list. {price}."],
    warm: ["Let us give {p} a chance. We backed bigger risks. 💙", "{nick} will show us why. I believe it.", "Welcome {pf}. Prove them wrong.", "A big price, a big heart. Come on, {p}."],
    old: ["{price} is a lot of money for a {ovr}. We shall see.", "I have seen worse deals. And better ones.", "Time will tell whether {p} was worth {price}.", "A price like that puts pressure on a lad."],
    rival: ["{me} paid {price} for {p}? Thanks for the entertainment.", "{price} for a {ovr}? Brilliant. Keep it coming.", "Good luck with that, {me}.", "{me} are making our season easy."],
  },
  // a young player with a future
  signedYoung: {
    hype: ["{p} is only {age}! The future is bright! ⭐", "A young talent! {pf} joins {me}!", "{age} years old and rated {ovr}. Watch out!", "{nick} has a huge future ahead. Welcome!"],
    stat: ["{p}, {age}, rated {ovr}: a long-term signing.", "At {age}, {pf} has years of growth ahead.", "A young signing: {p}, {age}, {price}.", "{p} could improve a lot in the next seasons."],
    wry: ["{p} is {age}. I have socks older than him. 😂", "We signed a youngster. Hope he does his homework.", "A kid! The crowd has to behave.", "{age} years old. I want to be {age} again."],
    warm: ["Welcome {p}! We will look after you. 💙", "A bright young talent. So excited!", "{nick} has everything. Let's help him grow.", "{pf} is the future of {me}."],
    old: ["A young one. Patience, he will grow.", "I like seeing a young player given a chance.", "{p} has plenty of time. A fine signing.", "In my day youngsters learned from the old hands. {p} will too."],
    rival: ["{me} found a gem in {p}. Watch him.", "A talented {age}-year-old. {me} are planning.", "{p} is one to watch. Annoying.", "{me} have an eye for talent."],
  },
  // a find from the scouts
  scouted: {
    hype: ["Our scouts found {p}! Wow! 🔍", "{pf}, a scouted gem, joins {me}!", "The scouts delivered! {p} is ours!", "A find! Welcome {nick}!"],
    stat: ["{p} came from the scouts: {ovr} rated, {age}, signed for {price}.", "The scouting network delivered {pf}.", "A scouting success: {p}, {ovr}.", "{p}: found by the scouts, signed by the club."],
    wry: ["The scouts found {p}. Finally they did something useful. 😂", "The scouts are worth their sandwiches after all.", "Found {p} in the wild. Impressive.", "Somebody give the scouts a raise."],
    warm: ["Thank you to the scouts! Welcome {p}! 💙", "Proud of the scouts and of {nick}.", "A great find. Welcome to {me}!", "{p} found us. We are lucky."],
    old: ["A good eye from the scouts. {p} looks like a player.", "Scouting is the heart of a club. {p} proves it.", "A fine find, that.", "The scouts earned their keep."],
    rival: ["{me} scouted {p}. Clever.", "{me}'s scouts are on form.", "{p} came out of nowhere. Nice work, {me}.", "Fair play to {me}'s scouts."],
  },
  // a youth graduate
  academy: {
    hype: ["{p} from the academy! A homegrown hero! 🏠", "{pf} is one of ours! Welcome to the first team!", "The academy delivers! {p}!", "Homegrown talent! {nick}!"],
    stat: ["{p}, an academy graduate, joins the squad: {age}, rated {ovr}.", "The academy produced {pf}: {ovr}.", "A homegrown player: {p}.", "{p} rises from the academy."],
    wry: ["{p} from the academy. He probably still does his homework. 😂", "We grew our own. Nice.", "Cheaper than buying one. {p}!", "The academy is paying off."],
    warm: ["Our own boy! {p}! So proud. 💙", "Homegrown! Welcome {nick}!", "The academy is a joy. Welcome {p}.", "We love our youngsters."],
    old: ["A lad from our own academy. That is how clubs are built.", "Homegrown players are the best. {p} will give everything.", "I like seeing {p} come through.", "The club is in good hands."],
    rival: ["{me} have another youngster. {p}.", "{me}'s academy is strong.", "Watch {p}. A good one.", "Homegrown, and likely good."],
  },
  // a player whose contract ended
  contractEnd: {
    rage: ["{p} has left the club?! His contract ran out and we let him go?! 😡", "We lost {pf}! Terrible management.", "{p} gone. After all he did for us. Shocking.", "{pf} walked out of the door. The board should be ashamed."],
    stat: ["{p}'s contract has ended. He leaves after {cruns} runs and {cwk} wickets.", "{pf} leaves the club. His record: {cruns} runs, {cwk} wickets.", "{p} departs. A significant loss to the squad.", "{p} is no longer with {me}."],
    wry: ["{p} has left. His locker is empty. So is mine. 😂", "{p} gone? Who will carry the drinks now?", "Contract expired. Like my milk.", "I will miss {p}. And his weird warm-up."],
    warm: ["Thank you {p}, for everything. You will always be one of us. 💙", "Goodbye {nick}. The club will miss you.", "We wish {p} the very best.", "{pf}, a true {me} man. Thank you."],
    old: ["{p} served this club well. We say goodbye with respect.", "A good servant. {pf} will be remembered.", "Another one leaves. Time moves on.", "I will always remember {p}'s efforts."],
    rival: ["{p} has left {me}! Open the doors!", "{me} lost {p}. Interesting.", "{p} could come to us. Just saying.", "A big loss for {me}."],
  },
  // a player who left and signed elsewhere
  poached: {
    rage: ["{p} has joined {they}?! After everything?! 😤", "{pf} signed for {they}. Traitor!", "{they} took {p}. I am furious.", "{p} to {they}. Disgraceful."],
    stat: ["{p} joins {they} after leaving {me}. He had {cruns} runs and {cwk} wickets for the club.", "{pf} is at {they} now. A rival gain.", "{p} to {they}: a loss for {me}.", "{p} moves to {they}."],
    wry: ["{p} joined {they}. Well, he will be missed. At least the wages. 😂", "See you on the pitch, {p}. We will remember how to get you out.", "{p} at {they}. I never liked his hat anyway.", "Good luck, {p}. We will be waiting."],
    warm: ["I wish {p} well at {they}. He gave us so much. 💙", "Goodbye {nick}. Thank you.", "No hard feelings. {pf} will always be one of ours.", "Go well, {p}."],
    old: ["Players come and go. That is cricket.", "{p} will play well for {they}. He always did.", "I wish him luck.", "A loss, but life goes on."],
    rival: ["Welcome {p}! {they} are happy to have him!", "{p} joins us from {me}. Great!", "{they} signed {p}. Love it.", "Thank you, {me}, for {p}."],
  },
  // released
  released: {
    rage: ["The club released {p}?! Why?! 😠", "{pf} let go. I do not understand this club.", "Dropped and released. {p} deserved better.", "Releasing {p}. Terrible decision."],
    stat: ["{p} has been released after {cruns} runs and {cwk} wickets for the club.", "{pf} leaves {me}: released.", "The squad loses {p}. A tough call.", "{p} is released."],
    wry: ["{p} released. Another one off the books. 😂", "{p} cleared his locker. Hope he left the biscuits.", "The club trims the squad. Bye {p}.", "Fare thee well, {p}."],
    warm: ["Thank you {p}, for your service. We wish you the best. 💙", "Goodbye {nick}. You gave your all.", "Not the end. Keep your head up, {p}.", "We will not forget you, {pf}."],
    old: ["Sad to see {p} go. Releases are part of the game.", "A hard decision for the club.", "He gave good service.", "Time moves on."],
    rival: ["{me} released {p}! Open season!", "{p} is on the market. Interesting.", "{p} is available. We could use him.", "{me} let {p} go. Ha!"],
  },
  // retired
  retired: {
    rage: ["{p} retires. I cannot believe it. The end of an era. 😭", "No! Not {p}! Not now!", "{pf} calls it a day. What will we do without him?", "{p} retired. My heart is broken."],
    stat: ["{pf} retires: {cruns} runs and {cwk} wickets for the club.", "{p} hangs up his boots at {age}.", "{p} leaves with {cruns} runs, {cwk} wickets. A fine career.", "A career ends: {p}, {age}."],
    wry: ["{p} retires. The pavilion bar will never be the same. 😂", "{p} is retiring. Who will tell the tall stories now?", "He retired. We are going to need a bigger card.", "{p} gone. Make room for the golf clubs."],
    warm: ["Thank you {p}. For everything. You will be missed. 💙", "A true servant of the club. Goodbye, {nick}.", "Retirement well earned, {pf}.", "{p}, we love you. Enjoy your rest."],
    old: ["I watched {p} grow up. A fine career. Well done.", "It is the end of an era. {p} gave everything.", "I will tell the grandchildren about {p}.", "A proper servant. Farewell."],
    rival: ["{p} retires. A great player. Respect.", "Farewell {p}. We enjoyed the battles.", "{p} leaves a gap in the league.", "A legend retires."],
  },
  // promotion
  promoted: {
    hype: ["PROMOTED!!! {me} are heading up to {div}! 🎉🎉", "WE DID IT! {div} next season!", "UP WE GO! {me} in {div}!", "Promotion! Pop the champagne!"],
    stat: ["{me} finished {pos} and are promoted to {div} after {yrsn}.", "Promotion confirmed. {me} move up to {div}.", "{me}: promoted to {div}. A record of progress.", "{me} go up. The next test: {div}."],
    wry: ["We got promoted! I do not know what to do with my life. 😂", "{div}! Our wage bill is going to cry.", "Promotion! Now we have to play better teams. Uh oh.", "I am going to need a bigger scarf."],
    warm: ["Promoted! So proud of every single one. 💙", "{yrsn} of work and now {div}! I am in tears.", "What a team. What a club. {me}!", "I never doubted them. Never."],
    old: ["I have seen this club in the lower divisions for years. Promotion is a joy.", "{div}. I did not think I would see it.", "A great day for the club.", "Well done, lads. Well done."],
    rival: ["{me} are going up. Fair play.", "Welcome to {div}, {me}. It is hard here.", "{me} deserve it. Enjoy the ride.", "We will be waiting for you in {div}."],
  },
  // relegation
  relegated: {
    rage: ["RELEGATED. I cannot believe it. 😭", "{me} go down. The board must answer for this.", "Relegation. We deserve better.", "Down to {div}. A disgrace."],
    stat: ["{me} finished {pos} and are relegated to {div}.", "{me} drop to {div}. A season to forget.", "Relegation is confirmed for {me}.", "{me}: relegated. Rebuilding begins."],
    wry: ["Relegated. Well, at least the away trips are shorter. 😂", "{div} here we come. Pack the sandwiches.", "We are going down. Quick, someone say something positive.", "I will bring a flask to {div}."],
    warm: ["We go again. I am staying with {me} forever. 💙", "Heads high. We come back stronger.", "Relegation hurts but we are not finished.", "Love you, {me}. Always."],
    old: ["I have seen relegations before. This club bounces back.", "A bad day for the club. We will be back.", "We learn and we rebuild.", "Hold your heads high, lads."],
    rival: ["{me} relegated. Sad. Well, not that sad.", "Bye {me}! See you in {div}.", "{me} go down. That is cricket.", "Good luck rebuilding, {me}."],
  },
  // champions
  champion: {
    hype: ["CHAMPIONS!!! {me} are CHAMPIONS OF {div}! 🏆🏆🏆", "WE WON THE LEAGUE! I cannot stop screaming!", "{me}, champions! Unreal!", "Best day of my life! CHAMPIONS!"],
    stat: ["{me} win the {div} title after {yrsn}.", "{me}: champions. A fine season.", "{me} top the table and win the title.", "A title for {me} in {div}."],
    wry: ["We won the league! Did anyone tell the other teams? 😂", "Champions! I will be insufferable for months.", "Somebody check the trophy is real. 😂", "I did not think I would live to see this."],
    warm: ["So proud of this team. CHAMPIONS! 💙", "I am crying. {me} are champions!", "What a journey. {me}!", "A dream come true."],
    old: ["I have waited so long. Champions at last.", "I never thought I would see this day.", "Now I can retire happy.", "A great day for the club. A great day."],
    rival: ["{me} are champions. Well deserved.", "Fair play to {me}. A great season.", "{me} deserved it.", "Champions {me}. We will be back."],
  },
  survivedPlayoff: {
    hype: ["WE STAYED UP!!! {me} win the play-off! 🙌", "Survival! {me} live to fight another season!", "What a relief! We are staying in {div}!", "Safe! {me} win the play-off!"],
    stat: ["{me} won the relegation play-off and stay in {div}.", "Survival confirmed for {me}.", "{me} stay up after the play-off.", "The play-off is won. {me} remain in {div}."],
    wry: ["We stayed up! My heart did not. 😂", "Survival! The club is allowed to keep its name.", "I aged ten years in that play-off.", "Phew. {me} are still here."],
    warm: ["So relieved. {me} stay up! 💙", "Proud of this team. The fight was brilliant.", "We are staying. Thank you lads.", "What a relief."],
    old: ["A narrow escape. This club knows how to fight.", "That was close, but we survived.", "Well done, lads. That is spirit.", "Never underestimate this club."],
    rival: ["{me} stayed up. Impressive.", "A lucky escape for {me}.", "{me} survive! Good for them.", "Respect, {me}."],
  },
};

// the journey, from where the club started: said when something big happens, by anyone with a memory (it needs {from}, {div}, {yrs})
export const JOURNEY = [
  "Remember when {me} were in {from}? Look at us now in {div}! 🥲", "{yrsn} ago we were in {from}. Now it is {div}. What a journey.", "From {from} to {div}. I never thought I would see the day.",
  "I was there in {from}. Now we are in {div}. I am emotional.", "Some of us remember {from}. And some of us never stopped believing. {div} now!", "We started in {from} and look where we are. {div}!",
  "Do you remember the {from} days? The empty stands? Now {div}.", "{from} to {div} in {yrsn}. That is progress.", "When I started following {me} they were in {from}. Now {div}. I am very, very proud.",
  "We were in {from} not so long ago. Now {div}. Never give up on this club.", "From {from} to {div}: I will tell my kids this story.", "{yrsn} from {from} to {div}. And we are not finished.",
  "The long road from {from} to {div}. It was worth every minute.", "Lest we forget: {from}. And now {div}. Stay humble, {me}.", "{me}: from {from} nobodies to {div}. 💙",
];
