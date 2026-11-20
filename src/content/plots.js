/* Plots: the troubles of a world, as data. One plot is the world's great trouble, told by the elder of the story's
   town: finishing it wins the world, with its own ending. Other towns each have a trouble of their own, which you may
   take up or not. The old story (the key, the locked place, the relic and the beacon or shrine) is one kind among them.

   A plot names its ROLES (what it needs placed in the world) and its STEPS (what you do, in order). The rules know how
   to place each kind of role and how to tell when each kind of step is done (src/rules/plots.js); a new plot is a new
   entry here. Text may use {giver} (the town that asks), {elder} (its elder), {other} (a second town), {land} (the
   country a place lies in) and any role by name ({beast}, {captive}, {cure}...).

   Roles:
     town      { town: 'other' }                         another town than the giver (a feud, a caravan's end)
     place     { site, dist: [least, most] regions from the giver, far: true for the farthest country }
     creature  { at: place role, kind: 'beast'|'guards', n, tier, names, forms, carries: item role }
     item      { base: 'token'|'goods', label, at: place role | carried by a creature role | given at a step }
     curse     { at: place role }                         the place's region is cursed until the plot is done
   Steps (do):
     talk  { to }            talk to the elder of a town role ('giver' is the town that asks)
     kill  { what }          kill every creature of a creature role
     take  { what }          carry the item (found in a place, dropped by a creature, or gathered)
     bring { what, to }      carry the item to a town's elder; it is handed over
     free  { who, clear, water }   at a place: free someone (once its guards are dead, or by sharing water)
     lead  { who, to }       bring whoever you freed to a town's elder
     use   { what, at }      use an item at a place (it is spent)
     choose { options }      at a town's elder: pick a side, each option a branch of further steps */
export default {
  plots: {
    side: [1, 3], // side plots in a world, at most one per town other than the story's
    linkChance: 0.6, // when a world has both, the cure for a sickness lies in the great beast's hoard
    chainChance: 0.35, // finishing a side plot tells you of the next one, at the next town
    reward: { coin: [20, 45], xp: 60 },
    // in a world where the old story is not the great trouble, carrying the relic home still earns this
    relicSide: { coin: 60, xp: 120 },
    kinds: [
      {
        id: 'relic',
        name: 'The relic',
        main: 4, // weight as the world's great trouble
        text: 'The old story: a key, the locked place, the relic and where it belongs.',
      },
      {
        id: 'beast',
        name: 'The great beast',
        main: 2,
        side: 2,
        roles: {
          lair: { place: true, site: 'den', dist: [1, 2] },
          beast: { creature: true, at: 'lair', kind: 'beast', tier: 2, carries: 'horn' },
          horn: { item: true, base: 'token', label: 'Horn of the {beast}' },
        },
        tell: '"Something has come down out of the {land}: the {beast}. It takes the herds, and it took the last three who went after it. Its den is marked on your map. Kill it, and bring us its horn, so we know."',
        steps: [
          { do: 'kill', what: 'beast', text: 'Kill the {beast}' },
          { do: 'bring', what: 'horn', to: 'giver', text: 'Bring the horn of the {beast} to {giver}' },
        ],
        end: 'You lay the horn of the {beast} on the table in {giver}. By morning the herds are out on the hills again, and the roads are walked without fear.',
      },
      {
        id: 'captive',
        name: 'Held captive',
        side: 3,
        roles: {
          camp: { place: true, site: 'camp', dist: [1, 2] },
          guards: {
            creature: true,
            at: 'camp',
            kind: 'guards',
            n: 2,
            tier: 2,
            names: ['Raider', 'Reaver', 'Brigand', 'Cutthroat'],
          },
          captive: { person: true, at: 'camp' },
        },
        tell: '"They took {captive}, my sister\'s child, on the road. Raiders, camped in the {land}; I have marked it. We have no one who can fight. Bring {captive} home."',
        steps: [
          { do: 'free', who: 'captive', clear: 'guards', text: "Free {captive} from the raiders' camp" },
          { do: 'lead', who: 'captive', to: 'giver', text: 'Bring {captive} home to {giver}' },
        ],
        end: '{captive} is home. {giver} lights every lamp it has.',
      },
      {
        id: 'lost',
        name: 'Lost in the wild',
        side: 3,
        roles: { lost: { place: true, site: 'lost', dist: [1, 2] }, wanderer: { person: true, at: 'lost' } },
        tell: '"{wanderer} went out to the {land} for herbs four days ago and has not come back. Somewhere about here, on your map. Take water: they will have none."',
        steps: [
          { do: 'free', who: 'wanderer', water: 2, text: 'Find {wanderer} in the {land}, and share your water' },
          { do: 'lead', who: 'wanderer', to: 'giver', text: 'Bring {wanderer} back to {giver}' },
        ],
        end: '{wanderer} is home, thin and sunburnt and alive.',
      },
      {
        id: 'curse',
        name: 'The curse on the land',
        main: 2,
        side: 1,
        roles: {
          stone: { place: true, site: 'stone', dist: [1, 2] },
          blight: { curse: true, at: 'stone' },
          salt: { item: true, base: 'token', label: 'Blessed salt', given: 1 },
        },
        tell: '"Since the black stone stood up in the {land}, nothing there grows, the water there turns, and the cold there is wrong. Our priests can bless salt enough to break it; take it, and pour it on the stone. Then come back and tell us."',
        steps: [
          { do: 'talk', to: 'giver', give: 'salt', text: 'Take the blessed salt from {elder}' },
          { do: 'use', what: 'salt', at: 'stone', text: 'Pour the salt on the black stone in the {land}' },
          { do: 'talk', to: 'giver', text: 'Tell {giver} the curse is broken' },
        ],
        end: 'The black stone cracks from top to foot. By the time you are back in {giver}, there is green along the ditches.',
      },
      {
        id: 'plague',
        name: 'The sickness',
        main: 2,
        side: 2,
        roles: {
          patch: { place: true, site: 'herbs', dist: [1, 2], far: true },
          cure: { item: true, base: 'token', label: 'Feverwort', at: 'patch' },
        },
        tell: '"The sweating sickness is in {giver}. Our healer says one herb will break it, feverwort, and it grows only in the {land}, far from here. The place is on your map. Be quick: every day we bury someone."',
        tellHoard:
          '"The sweating sickness is in {giver}. The only feverwort left in this land was in the hoard of the {beast}, which keeps it with the bones of the last healer who went looking. Its den is marked."',
        steps: [
          { do: 'take', what: 'cure', text: 'Gather feverwort in the {land}' },
          { do: 'bring', what: 'cure', to: 'giver', text: 'Bring the feverwort to {giver}' },
        ],
        end: 'The feverwort is boiled in every pot in {giver}. In three days the bell for the dead stops ringing.',
      },
      {
        id: 'feud',
        name: 'The feud',
        side: 2,
        needs: 'other',
        roles: {
          other: { town: 'other' },
          ruin: { place: true, site: 'ruin', dist: [1, 2] },
          charter: { item: true, base: 'token', label: 'The old boundary charter', at: 'ruin' },
        },
        tell: '"{other} has stolen water from our spring for the last time. You are a stranger: go and hear their lies if you must, then come back and tell me whose side you are on."',
        steps: [
          { do: 'talk', to: 'other', text: 'Hear what {other} has to say' },
          {
            do: 'choose',
            at: 'giver',
            text: 'Choose a side in the feud, in {giver}',
            options: [
              { id: 'giver', label: 'Side with {giver}', hostile: 'other', then: 'giverSide' },
              { id: 'other', label: 'Side with {other}', hostile: 'giver', then: 'otherSide' },
              { id: 'peace', label: 'Look for the old charter, and make peace', then: 'peace' },
            ],
          },
        ],
        branches: {
          giverSide: [{ do: 'talk', to: 'giver', text: 'Tell {giver} you stand with them' }],
          otherSide: [{ do: 'talk', to: 'other', text: 'Tell {other} you stand with them' }],
          peace: [
            { do: 'take', what: 'charter', text: 'Find the old boundary charter in a ruin in the {land}' },
            { do: 'bring', what: 'charter', to: 'other', text: 'Show the charter to {other}' },
            { do: 'talk', to: 'giver', text: 'Bring word of the peace to {giver}' },
          ],
        },
        hostileText: 'The people of {town} will not deal with you: you took the other side in the feud.',
        end: 'The feud is over, one way or another. {giver} and {other} will remember who you were.',
        peaceEnd:
          'The charter is read aloud in both squares. The spring is shared, as it was meant to be, and both towns will sell to you for less.',
      },
      {
        id: 'caravan',
        name: 'The caravan',
        side: 2,
        needs: 'other',
        roles: { other: { town: 'other' }, goods: { item: true, base: 'goods', label: 'Bales for {other}', given: 0 } },
        tell: '"Our carter broke his leg, and {other} is waiting on these bales. Carry them there before {days} days are out, and they will pay you, and we will owe you."',
        days: 6,
        steps: [
          { do: 'talk', to: 'giver', give: 'goods', text: 'Take the bales from {elder}' },
          { do: 'bring', what: 'goods', to: 'other', text: 'Carry the bales to {other} (by day {due})' },
        ],
        end: 'The bales are in {other} in time. The merchants there know your name now, and sell to you for less.',
        failText: 'Day {due} has passed. The bales for {other} are worthless now, and nobody will thank you for them.',
      },
      {
        id: 'cult',
        name: 'The cult',
        main: 1,
        side: 2,
        roles: {
          camp: { place: true, site: 'camp', dist: [1, 2] },
          cultists: { creature: true, at: 'camp', kind: 'guards', n: 2, tier: 2, names: ['Cultist', 'Acolyte', 'Masked One'] },
          leader: {
            creature: true,
            at: 'camp',
            kind: 'beast',
            tier: 2,
            names: ['the Hollow Prophet', 'the Ash Mother', 'the Last Voice', 'the Unlit'],
            carries: 'sigil',
          },
          sigil: { item: true, base: 'token', label: 'The sigil of {leader}' },
        },
        tell: '"People go out at night now and do not come back, and those who do come back wear masks. They follow {leader}, who keeps a camp in the {land}. Bring me the sigil off its neck."',
        steps: [
          { do: 'kill', what: 'leader', text: "Kill {leader} at the cult's camp" },
          { do: 'bring', what: 'sigil', to: 'giver', text: 'Bring the sigil of {leader} to {giver}' },
        ],
        end: 'The sigil goes into the well of {giver}, and the masks go into the fire.',
      },
      {
        id: 'siege',
        name: 'The siege',
        main: 1,
        side: 1,
        roles: {
          gate: { place: true, site: 'siege', near: 'giver' },
          besiegers: { creature: true, at: 'gate', kind: 'guards', n: 3, tier: 2, names: ['Besieger', 'Raider', 'Warband'] },
          captain: {
            creature: true,
            at: 'gate',
            kind: 'beast',
            tier: 2,
            names: ['the Iron Captain', 'the Red Hand', 'Old Tusk'],
          },
        },
        tell: '"You came through that? They have camped round {giver} for a month: {captain} and its warband. While {captain} lives they will not leave. Kill it, and the rest will scatter."',
        steps: [
          { do: 'kill', what: 'captain', text: 'Kill {captain}, who leads the siege of {giver}' },
          { do: 'talk', to: 'giver', text: 'Tell {giver} the siege is broken' },
        ],
        end: 'The warband scatters without its captain. {giver} opens its gates and comes out into the fields for the first time in a month.',
      },
      {
        id: 'stolen',
        name: 'Something stolen',
        side: 3,
        roles: {
          hideout: { place: true, site: 'den', dist: [1, 2] },
          thief: {
            creature: true,
            at: 'hideout',
            kind: 'beast',
            tier: 2,
            names: ['Magpie', 'Quickfingers', 'the Night Fox'],
            carries: 'bell',
          },
          bell: { item: true, base: 'token', label: 'The bell of {giver}' },
        },
        tell: '"Our bell is gone from the tower, and the {thief} has it: it was seen dragging it into the {land}. A town without its bell does not know when to wake or when to grieve. Bring it back."',
        steps: [
          { do: 'kill', what: 'thief', text: 'Take the bell back from the {thief}' },
          { do: 'bring', what: 'bell', to: 'giver', text: 'Bring the bell back to {giver}' },
        ],
        end: 'The bell of {giver} rings again at noon. They ring it once more for you.',
      },
    ],
    // creatures for the 'beast' role, named like the quest's beast
    beastNames: ['Old', 'Gaunt', 'Black', 'Red', 'Hungry', 'Grey'],
    // people for the 'person' role
    people: ['Mara', 'Tobin', 'Ilse', 'Corran', 'Wren', 'Bek', 'Sella', 'Davin', 'Oona', 'Pell'],
    sites: {
      den: { name: 'den', text: 'A den: bones at the mouth, and a smell.' },
      camp: { name: 'camp', text: 'A camp: rough shelters, a fire pit, and someone always watching.' },
      lost: { name: 'tracks', text: 'Tracks, a dropped basket, a lean-to of branches.' },
      stone: { name: 'black stone', text: 'A black standing stone. The ground round it is grey and cold.' },
      herbs: { name: 'herb patch', text: 'A patch of low grey-leaved herbs, in a sheltered hollow.' },
      siege: { name: 'siege camp', text: "The warband's camp, close under the town." },
    },
    curse: {
      text: 'A curse lies on this country: the cold bites harder and water runs out faster.',
      mods: [
        { stat: 'cold', op: 'mul', value: 1.4 },
        { stat: 'waterDrain', op: 'mul', value: 1.25 },
      ],
    },
    hostile: { buy: 1.6 }, // a town that hates you sells dear
    friend: { buy: 0.85 }, // and one you helped sells cheap
  },
};
