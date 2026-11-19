/* The year: every world has one, which bends the weather, the light and the land a little. Rarely, the year is
   something stranger (the rare slot). Fields:
   mods  stat modifiers that hold all year (through the 'year' source)
   tun   changes to the tuning numbers, made once when the world is made: { name: ['mul' | 'set', value] }
   day   hours of dawn and dusk, if not 6 and 20
   w     how often it is rolled, against the others on its menu */
export default {
  year: {
    rareChance: 0.15,
    common: [
      { id: 'ordinary', name: 'An ordinary year', text: 'Nothing out of the way.', w: 3 },
      {
        id: 'drought',
        name: 'A year of drought',
        text: 'The heat dries you out: you need more water.',
        w: 2,
        mods: [{ stat: 'waterDrain', op: 'mul', value: 1.15 }],
      },
      {
        id: 'hardwinter',
        name: 'A hard winter',
        text: 'Everything is colder, and storms come more often.',
        w: 2,
        mods: [{ stat: 'cold', op: 'mul', value: 1.25 }],
        tun: { stormGap: ['mul', 0.8] },
      },
      {
        id: 'mild',
        name: 'A mild year',
        text: 'The cold bites less than it should.',
        w: 2,
        mods: [{ stat: 'cold', op: 'mul', value: 0.75 }],
      },
      { id: 'stormy', name: 'A year of storms', text: 'Storms come twice as often.', w: 2, tun: { stormGap: ['mul', 0.5] } },
      { id: 'still', name: 'A still year', text: 'Storms are rare.', w: 2, tun: { stormGap: ['mul', 2] } },
      { id: 'summer', name: 'A long summer', text: 'Days run from five until nine at night.', w: 2, day: [5, 21] },
      { id: 'longnight', name: 'A year of long nights', text: 'Days run only from eight until six.', w: 2, day: [8, 18] },
      {
        id: 'lean',
        name: 'A lean year',
        text: 'Little to eat: rest restores less, and lanterns burn more oil.',
        w: 2,
        mods: [{ stat: 'restGain', op: 'mul', value: 0.85 }],
        tun: { lanternFuelPerHour: ['mul', 1.5] },
      },
      {
        id: 'plenty',
        name: 'A year of plenty',
        text: 'Rest comes easy, and caves and caches are fuller.',
        w: 2,
        mods: [
          { stat: 'restGain', op: 'mul', value: 1.15 },
          { stat: 'luck', op: 'add', value: 0.15 },
        ],
      },
    ],
    rare: [
      {
        id: 'wide',
        name: 'A wide world',
        text: 'This world is five regions across and five down, not three: the far country is further, and stranger.',
        tun: { world: ['set', { cols: 5, rows: 5 }] },
      },
      {
        id: 'twomoons',
        name: 'A year of two moons',
        text: 'The nights are bright enough to see by.',
        mods: [{ stat: 'nightSight', op: 'add', value: 1, when: 'night' }],
      },
      {
        id: 'thinair',
        name: 'A year of thin air',
        text: 'Every step is harder work, but the air is so clear you see much further.',
        mods: [
          { stat: 'staminaCost', op: 'mul', value: 1.15 },
          { stat: 'surveyRadius', op: 'add', value: 3 },
        ],
      },
      {
        id: 'heavy',
        name: 'A year of heavy ground',
        text: 'The land pulls at you: travel is slower, but you can carry more before it tells.',
        mods: [
          { stat: 'moveTime', op: 'mul', value: 1.15 },
          { stat: 'carryCap', op: 'add', value: 5 },
        ],
      },
      {
        id: 'longdark',
        name: 'The long dark',
        text: 'The sun is up only from ten until four. The dark is strangely mild.',
        day: [10, 16],
        mods: [{ stat: 'cold', op: 'mul', value: 0.8, when: 'night' }],
      },
    ],
  },
};
