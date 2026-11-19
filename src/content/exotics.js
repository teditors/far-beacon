/* Exotic races and classes: offered only now and then (chance per world), in place of one of the usual three.
   A race with namesFrom: 'civ' takes its names from this world's lost people; a class with sworn: true starts every
   traveller already bound by a pact to this world's god. */
export default {
  exotics: { raceChance: 0.2, classChance: 0.2 },
  exoticRaces: [
    {
      id: 'lostborn',
      exotic: true,
      name: 'Lostborn',
      adj: { int: 1, wis: 1, con: -1 },
      text: 'Descended from the lost people of this world. Their ruins give up their secrets to you: you search them faster and find more.',
      mods: [
        { stat: 'searchTime', op: 'mul', value: 0.6 },
        { stat: 'luck', op: 'add', value: 0.2 },
      ],
      namesFrom: 'civ',
      names: ['Ashki', 'Temur', 'Rinpo', 'Melic'],
    },
    {
      id: 'ashborn',
      exotic: true,
      name: 'Ashborn',
      adj: { con: 2, cha: -1, dex: -1 },
      text: 'Born of a fire that went out. Cold hardly touches you, but you burn through water.',
      mods: [
        { stat: 'cold', op: 'mul', value: 0.5 },
        { stat: 'waterDrain', op: 'mul', value: 1.2 },
      ],
      names: ['Cinder', 'Smoke', 'Ember', 'Soot', 'Kiln', 'Brand'],
    },
    {
      id: 'saltkin',
      exotic: true,
      name: 'Saltkin',
      adj: { con: 1, str: 1, cha: -2 },
      text: 'A people of the dry places: you need little water, but the cold is cruel to you.',
      mods: [
        { stat: 'waterDrain', op: 'mul', value: 0.6 },
        { stat: 'cold', op: 'mul', value: 1.35 },
      ],
      names: ['Hesh', 'Ruma', 'Tazi', 'Okar', 'Sefa', 'Imri'],
    },
    {
      id: 'mothfolk',
      exotic: true,
      name: 'Mothfolk',
      adj: { dex: 2, wis: 1, str: -3 },
      text: 'Small, pale and wide-eyed: you see in the dark, but carry little.',
      mods: [
        { stat: 'nightSight', op: 'add', value: 1 },
        { stat: 'carryCap', op: 'add', value: -3 },
      ],
      names: ['Pale', 'Flit', 'Hush', 'Dusk', 'Wane', 'Lune'],
    },
    {
      id: 'stonekin',
      exotic: true,
      name: 'Stone-kin',
      adj: { str: 2, con: 1, dex: -2 },
      text: 'Heavy and hard: blows glance off you and you carry a great deal, but you are slow.',
      mods: [
        { stat: 'ac', op: 'add', value: 2 },
        { stat: 'carryCap', op: 'add', value: 4 },
        { stat: 'moveTime', op: 'mul', value: 1.1 },
      ],
      names: ['Flint', 'Slate', 'Granit', 'Tor', 'Basalt', 'Cairn'],
    },
  ],
  exoticClasses: [
    {
      id: 'votary',
      exotic: true,
      name: 'Votary',
      text: "Sworn to this world's god before setting out: you begin bound by its pact, and always know which way its shrine lies. Starts with a staff and a warming draught.",
      kit: ['staff', 'draught'],
      hd: 8,
      sworn: true,
      fight: 'Nothing special.',
      mods: [{ stat: 'shrineSense', op: 'add', value: 1 }],
    },
    {
      id: 'delver',
      exotic: true,
      name: 'Delver',
      text: 'A robber of ruins: searches in half the time, is never caught by a trap, and has an eye for what is worth taking. Starts with a dagger, a rope and a lantern.',
      kit: ['dagger', 'rope', 'lantern'],
      hd: 6,
      fight: 'Nothing special.',
      mods: [
        { stat: 'searchTime', op: 'mul', value: 0.5 },
        { stat: 'trapSafe', op: 'add', value: 1 },
        { stat: 'luck', op: 'add', value: 0.2 },
      ],
    },
    {
      id: 'nomad',
      exotic: true,
      name: 'Nomad',
      text: 'Born on the move: needs less water, carries more, and never tires on flat ground. Starts with a spear, boots and a frame pack.',
      kit: ['spear', 'boots', 'framepack'],
      hd: 8,
      fight: 'Nothing special.',
      mods: [
        { stat: 'waterDrain', op: 'mul', value: 0.85 },
        { stat: 'carryCap', op: 'add', value: 3 },
        { stat: 'moveTime.plain', op: 'mul', value: 0.85 },
      ],
    },
  ],
};
