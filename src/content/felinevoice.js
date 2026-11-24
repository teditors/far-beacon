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
