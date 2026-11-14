/* Gods and their pacts. */
export default {
  gods: [
    {
      id: 'thirst',
      color: 0xd9973a, // the glow above its shrine
      name: 'Ushet, the Dry Mother',
      terms: 'You need half the water. You can never carry more than 4.',
      mods: [
        { stat: 'waterDrain', op: 'mul', value: 0.5 },
        { stat: 'waterCap', op: 'max', value: 4 },
      ],
    },
    {
      id: 'climber',
      color: 0xbfe3ff, // the glow above its shrine
      name: 'Karn of the High Places',
      terms: 'Hills and mountains cost you far less time. Flat ground costs more.',
      mods: [
        { stat: 'moveTime.hill', op: 'mul', value: 0.6 },
        { stat: 'moveTime.mountain', op: 'mul', value: 0.6 },
        { stat: 'moveTime.plain', op: 'mul', value: 1.3 },
      ],
    },
    {
      id: 'night',
      color: 0x9a6be0, // the glow above its shrine
      name: 'Nym, the Lidless',
      terms: 'You see in the dark and the night cold bites less. By day you need much more water.',
      mods: [
        { stat: 'nightSight', op: 'add', value: 1, when: 'night' },
        { stat: 'cold', op: 'mul', value: 0.6, when: 'night' },
        { stat: 'waterDrain', op: 'mul', value: 1.4, when: 'day' },
      ],
    },
  ],
};
