/* Super Feline Mode's own voice (commission 9): what a cat would actually say, rather than the words swapped.
   lines   [pattern, line]: a whole line of the game (as the base game writes it, a regular expression from start to
           end) rewritten by a cat. $1, $2... are the pattern's groups, each turned into cat words by themselves (names,
           places, creatures). The lines players meet most come first; a line no pattern matches is turned word by word.
   quips   the cat's inner monologue, by event: a thought shown now and then in a bubble when something happens (the
           player's action by its id, 'kill', 'hurt', 'storm', 'thirsty', 'levelUp', 'town', 'death', 'win', 'idle').
           The view picks one (view/catpov.js); the rules never see them. */
export default {
  lines: [
    ['You rest for an hour\\.', 'You curl into a croissant and nap for an hour. It was not enough. It is never enough.'],
    [
      'You are too exhausted to go on\\. Rest first\\.',
      'Your legs have filed a formal complaint. Nap first. Naps are not optional.',
    ],
    ['You are nearly out of water\\.', 'The kibble bowl is VISIBLY EMPTY IN THE MIDDLE. This is an emergency. Yowl accordingly.'],
    [
      'You collapse, dry as the ground\\. The land keeps you\\.',
      'You flop over, dry as old kibble. The carpet keeps you. That is one of your lives, gone.',
    ],
    [
      'You warm yourself at a small fire\\.',
      'You loaf beside a small sunbeam until your fur is too hot to touch, and then a little longer.',
    ],
    [
      'Paved road underfoot\\. The going is fast and easy\\.',
      'A catwalk underpaw. You strut. Everyone is watching. (Nobody is watching.)',
    ],
    [
      'You need (\\d+) fuel to light a fire\\.',
      'You need $1 catnip to summon a sunbeam. You stare at where one should be. It does not come.',
    ],
    [
      'You study the land\\. Higher ground would show more\\.',
      'You stare at nothing for a long time, as cats do. Higher up would show more. Higher up is always better.',
    ],
    ['You study the land and add it to your map\\.', 'You stare meaningfully at the horizon, then sniff it into your map.'],
    ['You are shivering badly\\.', 'You are shivering badly. Where is a lap when you need one? Where is ANY lap?'],
    ['An? (.+) breaks over you\\.', 'A $1 bursts over you. You flatten your ears and take it personally.'],
    ['The (.+) passes\\.', 'The $1 passes. You groom yourself back to dignity, one indignant lick at a time.'],
    ['You can see nothing through the (.+)\\.', 'You can see nothing through the $1. You squint at it resentfully.'],
    [
      'Somewhere to the (\\S+) there is a town\\. Find it: its people know what this land is waiting for\\.',
      'Somewhere to the $1 there is a colony. Find it: its cats know what this territory is waiting for (dinner, probably).',
    ],
    ['The cold takes you in your sleep\\.', 'The chill takes you in your sleep. No lap was found. A life is spent.'],
    [
      'You sleep (\\d+) hours and wake rested\\.',
      'You sleep $1 hours, a light nap by any cat standard, and wake demanding breakfast.',
    ],
    ['You fill up at the well\\.', 'You fill up at the food bowl, eating only from the middle, as is proper.'],
    ['You melt snow for (\\d+) water\\.', 'You melt fluff into $1 kibble. It is wet kibble now. Disgusting. You eat it anyway.'],
    [
      'You gather wood: (\\d+) fuel\\.',
      'You sharpen your claws on a tree trunk for a while and come away with $1 catnip. Worth it.',
    ],
    ['And with the wood, (\\d+) herbs\\.', 'And, stuck in your fur, $1 sprigs of catnip. You roll in them. Obviously.'],
    [
      'You enter (.+)\\. It breaks the wind, and hides the land\\.',
      'You slink into $1. It stops the draught and hides you: perfect for ambushing ankles.',
    ],
    ['Dawn, day (\\d+)\\. (.*)', 'Breakfast time, caturday $1. You yowl until the sun gets up. $2'],
    [
      'A spring\\. You cannot tell if it is sweet until you taste it\\.',
      'A kibble bowl. You cannot tell if it is yummy until you sniff it, sniff it again, walk off, and come back.',
    ],
    ['You taste it and gag\\. This spring is foul\\. (.*)', 'You taste it and make the face. This bowl is yucky. $1'],
    ['Sweet water\\. You fill up\\.', 'Yummy kibble. You fill up, then push the bowl a little to the left for no reason.'],
    ['The (.+) hits you for (\\d+)\\. You fall\\.', 'The $1 swats you for $2. You fall, and not on your feet. Embarrassing.'],
    ['The (.+) hits you for (\\d+)\\.(.*)', 'The $1 bops you for $2. Rude.$3'],
    ['The (.+) misses you\\.', 'The $1 misses you. You were never there. You are a cat.'],
    ['You strike camp\\. The kit is on your back: (.*)', 'You fold up the cat bed and carry it, sulking: $1'],
    ['You make camp\\. (.*)', 'You knead the cat bed until it is exactly right. $1'],
    ['You need (\\d+) fuel to melt snow\\.', 'You need $1 catnip to melt fluff. Fluff should melt on its own. It does not.'],
    ['You sight: (.*)', 'Your ears swivel: $1'],
    ['A hard winter\\. (.*)', 'A hard radiator season. Laps are scarce. $1'],
    [
      'Hail hurts out in the open\\. Get under cover\\.',
      'It is raining kibble and it HURTS. Get under something. A table. A box. Anything.',
    ],
    [
      'You are carrying too much to move\\. Leave something here\\.',
      'You are carrying too much to move. Drop something off a ledge, as a cat should.',
    ],
    [
      'You fill up with foul water and feel it at once\\.',
      'You eat the yucky kibble and feel it at once. A hairball is on its way.',
    ],
    // the town's people, the elder, the graves, the shop (C9.5)
    [
      '"You came across the open ground alone\\? Then listen\\. The beacon is dying\\. It was lit with the (.+), and the (.+) locked that away in the (.+) before the end\\."',
      '"You came across the open ground ALONE? With your little paws? Then listen. The Red Dot is fading. It was lit with the $1, and the $2 shut it in the $3 before the end, which was rude of them. Nobody shuts a cat out of anything."',
    ],
    [
      '"You came across the open ground alone\\? Then listen\\. The shrine has stood empty since the (.+) took from it the (.+), and the (.+) locked that away in the (.+) before the end\\."',
      '"You came across the open ground ALONE? Then listen. The sunbeam shrine has been empty since the $1 took the $2 from it, and the $3 shut it in the $4. An empty shrine is just a cold windowsill."',
    ],
    [
      '"Bring it out, and carry it to the (.+)\\. I have marked both on your map, and the springs our people use on the way\\."',
      '"Fetch it, and carry it to the $1 in your mouth, as is traditional. I have marked both on your sniff map, and the kibble bowls we use on the way. Do not drop it on anyone\'s pillow."',
    ],
    [
      '"Here is the key\\. We have kept it three generations, and not one of us has dared use it\\."',
      '"Here is the tin opener. We have kept it three litters, and not one of us has dared open the tin. Mostly because we have no thumbs."',
    ],
    [
      '"The key is gone\\. The (.+) took the last warden, key and all\\. Its lair is marked too\\. I am sorry\\."',
      '"The tin opener is gone. The $1 took the last lap-warden, tin opener and all. Its lair is marked too. I would go myself, but I am very busy lying here."',
    ],
    [
      '"Fine weather for it, if you like weather\\."',
      '"Fine weather for it, if you like weather. I prefer a windowsill and a view of weather."',
    ],
    [
      '"Mind the well, it is deeper than it looks\\."',
      '"Mind the food bowl. It is emptier than it looks. It is always emptier than it looks."',
    ],
    [
      '"The ruins\\? Leave them be\\. Nothing good ever came out of a ruin\\."',
      '"The cardboard ruins? Leave them be. Well. Sit in them first. Then leave them be."',
    ],
    [
      '"My grandmother saw the beacon lit, once\\. She said it turned the clouds gold\\."',
      '"My grandmother saw the Red Dot lit, once. She chased it for eleven years. She never caught it. None of us ever catch it."',
    ],
    ['"Buy something, or get out of my light\\."', '"Buy something, or get out of my sunbeam."'],
    [
      '"They say the old people could talk to the springs\\."',
      '"They say the old breed could open doors by themselves. Witchcraft."',
    ],
    [
      'They went out for water and did not come back\\.',
      'Went out for kibble. Did not come back. Probably being fed by another family.',
    ],
    ['Beloved\\. Lost in the (.+)\\.', 'Beloved. Lost in the $1. Had it coming: went outside on purpose.'],
    ['Killed by an? (.+)\\.', 'Bested by a $1. Eight lives ago. We do not talk about it.'],
    [
      'Walked to the (\\S+) to see what was there\\.',
      'Walked to the $1 to see what was there. It was a box. They are still in it.',
    ],
    ['Kept the well for forty years\\.', 'Guarded the food bowl for forty years. Never once let it be half full.'],
    ['Taken by the cold in a hard winter\\.', 'Taken by the chill in a hard radiator season. Could not find a lap.'],
    ['She found the (\\S+) and never told us where\\.', 'She found the $1 and never told us where. Typical cat.'],
    [
      '"Watch out for the (.+?)\\. (.+)"',
      '"Watch out for the $1. $2 I saw one once. I went up the curtains and stayed there for a day."',
    ],
    [
      '"Our god is (.+)\\. Its terms are these: (.+) Its shrine is marked on your map\\."',
      '"Our Cat God is $1. It demands: $2 Also tuna. Its sunbeam shrine is marked on your sniff map."',
    ],
    [
      '"You have learned all you will learn from me\\. Go and use it\\."',
      '"You have learned all I will teach. Now go and ignore it, as cats do."',
    ],
    [
      'A bed, a fire and a meal\\. You wake whole\\.',
      'A cat bed, a radiator and a whole tin of tuna. You wake purring. You were brushed in your sleep and did not even mind.',
    ],
    [
      'The key turns\\. Cold air comes up the stair\\.',
      'The tin opener bites, and turns, and turns. The lid lifts. A smell of very old tuna comes up the stair.',
    ],
    ['You cannot afford that\\.', 'You cannot afford that. You stare at it until someone gives it to you. Nobody does.'],
    ['You cannot afford a bed\\.', 'You cannot afford a bed. You will sit in the box it came in instead.'],
    ['You buy the (.+) for (\\d+) coin\\.', 'You trade $2 treats for the $1. You will ignore it and play with the bag.'],
    ['You sell the (.+) for (\\d+) coin\\.', 'You swap the $1 for $2 treats. It was beneath you anyway.'],
    ['No one here will buy that\\.', 'No one here will buy that. Their loss. You leave it on their doorstep anyway.'],
    [
      'It is black as pitch inside\\. You need a light: (.*)',
      'It is dark inside, which is fine, you are a cat, but the RULES say you need a light: $1',
    ],
    [
      'You climb out into the (daylight|night)\\.',
      'You squeeze out through the gap into the $1, and at once want to go back in.',
    ],
    // the troubles' endings (C9.6): the payoff, as a cat sees it
    [
      'You lay the horn of the (.+) on the table in (.+)\\. By morning the herds are out on the hills again, and the roads are walked without fear\\.',
      'You lay the squeaky horn of the $1 on the table in $2, then knock it off the table, then lay it on again. By morning the hills are safe for napping, and the catwalks are strutted without fear.',
    ],
    [
      '(.+) is home\\. (.+) lights every lamp it has\\.',
      '$1 is down from the tree at last. $2 lights every warm lamp it has, and nobody sits in front of them but you.',
    ],
    [
      '(.+) is home, thin and sunburnt and alive\\.',
      '$1 is home, thin and sunburnt and alive, and demanding dinner as if nothing had happened.',
    ],
    [
      'The black stone cracks from top to foot\\. By the time you are back in (.+), there is green along the ditches\\.',
      'The bath drains with a horrible gurgle. The Bath Curse is lifted. By the time you are back in $1, there is catgrass along the ditches and nobody is wet.',
    ],
    [
      'The feverwort is boiled in every pot in (.+)\\. In three days the bell for the dead stops ringing\\.',
      'The fevermint is steeped in every bowl in $1. In three days nobody has to go to the Vet. The cat carrier is put back in the attic, where it belongs, forever.',
    ],
    [
      'You set the iron crown on the table in (.+)\\. Nothing comes up out of the ground at night any more\\.',
      'You set the paper crown of the Vacuum King on the table in $1. Nothing roars out from under the sofa at night any more. You sit in the crown.',
    ],
    [
      'The castle in the sky drifts away on the wind, empty\\. In (.+) they bring in the harvest, and keep all of it\\.',
      'The castle of cushions drifts away on the draught, empty, its Vacuum Tyrant unplugged. In $1 they bring in the kibble harvest, and keep all of it, and give you the first bowl.',
    ],
    [
      'The pearl-moss is steeped in every kettle in (.+)\\. The coughing stops\\.',
      'The Secret Pudding is shared out in every bowl in $1. The hairballs stop. Somebody licks the spoon. It was you.',
    ],
    [
      '(.+) is home, and will not stop talking about the other sky\\. (.+) bricks up the door\\.',
      '$1 is back inside, and will not stop meowing about the other side of the door. $2 bricks up the cat flap. $1 sits by it, yowling, every night.',
    ],
    [
      'The feud is over, one way or another\\. (.+) and (.+) will remember who you were\\.',
      'The war between the indoor cats and the outdoor cats is over, one way or another. $1 and $2 will remember who you were, and pretend they do not.',
    ],
    [
      'The charter is read aloud in both squares\\. (.*)',
      'The treaty of the fence is read aloud in both squares, slowly, with a lot of tail-flicking. $1',
    ],
    [
      'The bales are in (.+) in time\\. The merchants there know your name now, and sell to you for less\\.',
      'The crunchy cat cookies are in $1 in time, and only slightly nibbled. The Pet Shop there knows your name now, and gives you treats for less.',
    ],
    [
      'The sigil goes into the well of (.+), and the masks go into the fire\\.',
      'The cucumber goes into the compost of $1, and the Cult of the Cucumber goes up the curtains and is never seen again.',
    ],
    [
      'The warband scatters without its captain\\. (.+) opens its gates and comes out into the fields for the first time in a month\\.',
      'The dogs scatter without their Alpha. $1 opens its cat flaps and comes out to sun itself in the fields for the first time in a month.',
    ],
    [
      'The bell of (.+) rings again at noon\\. They ring it once more for you\\.',
      'The jingle bell of $1 rings again at noon. They found who stole the crunchy cat cookies (it was the dog). They ring it once more for you.',
    ],
    [
      'You set the (.+) on the shrine\\. Something that was held breath for an age lets go\\.',
      'You set the $1 on the sunbeam shrine. Something that has held its breath for an age lets go, and purrs.',
    ],
  ],
  quips: {
    rest: [
      'Eighteen hours a day is a minimum, not a goal.',
      'I am not sleeping. I am charging.',
      'A short nap. Then a medium nap. Then the main nap.',
      'This spot was warm before me. It is mine now.',
      'Wake me if something interesting falls off something.',
    ],
    sleep: [
      'Goodnight, world. I will be up at four to yell at you.',
      'Zzz. (Twitching. Chasing something. Winning.)',
      'Do not disturb. Ever.',
    ],
    makeCamp: ['If I fits, I sits. I fits.', 'Knead, knead, knead, turn, turn, flop.', 'Home is wherever I lie down in the way.'],
    fill: [
      'Only from the middle. The edges are for peasants.',
      'I demand a fresh bowl. This one is three seconds old.',
      'Wet. Ugh. Fine.',
    ],
    search: [
      'Is it food? Is it a box? Is it a box with food?',
      'I shall knock everything onto the floor to check.',
      'Nothing here. Knocking it over anyway.',
    ],
    survey: ['Staring at nothing. Deeply.', 'I saw something. You will never know what.', 'The horizon owes me money.'],
    attack: ['SWAT.', 'Bap.', 'Claws are a love language.', 'Get bopped.', 'Hiss first, ask questions never.'],
    flee: ['Strategic zoomies.', 'I was leaving anyway.', 'Not running. Relocating with urgency.'],
    kill: [
      'I will leave its body on your pillow, as a gift.',
      'Another one for the collection.',
      'And THAT is why we do not touch the tail.',
      'Victory. Now to sit on its face.',
    ],
    hurt: ['How DARE.', 'This is a formal grudge now.', 'I will remember this at three in the morning.'],
    storm: [
      'The sky is having a hissy fit. Relatable.',
      'Wet. From ABOVE. Unacceptable.',
      'I am going under the bed of the world.',
    ],
    thirsty: [
      'The bowl. Is. Empty. Somebody fix this.',
      'I can see the bottom of the bowl. I am in crisis.',
      'Feed me or I knock the world off the table.',
    ],
    levelUp: [
      'I have grown wiser. I will now ignore you more efficiently.',
      'Level up. Still will not come when called.',
      'I have achieved new heights. Of the bookshelf.',
    ],
    town: [
      'So many laps. So little time.',
      'Which of these humans is the softest?',
      'I will now sit on the one person here who is allergic.',
    ],
    buy: ['Treats well spent.', 'Put it on my tab. I do not have a tab. I have claws.'],
    sell: ['It was beneath me anyway.', 'Sold. I was going to knock it off the table.'],
    goDown: ['Down the dark hole? Obviously. Curiosity has never once killed anyone.', 'Ooh, a dark hole. Must investigate.'],
    unlock: ['A tin, opened. The tuna of destiny awaits.', 'The tin opener sings. I come running.'],
    idle: [
      'What if I just knocked that over.',
      'I have been staring at this wall for an hour. It knows what it did.',
      'Is that a bug? No. Yes. No.',
      'My tail is plotting against me.',
      'I could go outside. I could also stay inside. I want both. At once.',
      'Somewhere, a cucumber is waiting.',
      'The red dot is out there. I can feel it.',
    ],
    death: ['Eight lives left. Probably. I lost count.', 'I meant to do that.'],
    win: ['I caught the red dot. It is in my paws. ...It is on my paws. Where did it go.', 'Purrfect.'],
  },
};
