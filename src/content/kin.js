/* Kin of the new places: two rare races, offered only in a world that has what they were born to. The windborn fly
   by nature (light-boned, feathered at the arms), at a cost in what they can carry; the merrow breathe water and
   need less of it to drink, but walk slowly on dry ground. Each is offered in about half the worlds that have places
   in the sky or a sea, beside the usual offer. */
export default {
  kin: {
    chance: 0.5,
    races: [
      {
        id: 'windborn',
        kin: 'sky',
        exotic: true,
        name: 'Windborn',
        adj: { dex: 2, str: -2 },
        text: 'Light-boned and feathered at the arms: you can fly, a little, without wings to borrow. You carry less, and the cold up high bites you less.',
        mods: [
          { stat: 'fly', op: 'add', value: 1 },
          { stat: 'flyEffort', op: 'mul', value: 1.6 },
          { stat: 'carryCap', op: 'add', value: -4 },
        ],
        names: ['Kestrel', 'Swift', 'Ree', 'Aloft', 'Sorrel', 'Hobby'],
      },
      {
        id: 'merrow',
        kin: 'sea',
        exotic: true,
        name: 'Merrow',
        adj: { con: 2, dex: -1 },
        text: 'Of the sea-people: you breathe water as easily as air and need less of it to drink, but you are slow on dry ground.',
        mods: [
          { stat: 'breathe', op: 'add', value: 1 },
          { stat: 'waterDrain', op: 'mul', value: 0.8 },
          { stat: 'moveTime.plain', op: 'mul', value: 1.15 },
        ],
        names: ['Maren', 'Pelle', 'Shoal', 'Coral', 'Ondine', 'Brack'],
      },
    ],
  },
};
