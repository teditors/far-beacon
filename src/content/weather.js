/* Odd weather: now and then (chance) a storm is not the biome's usual one but one of these. Like any storm it hides
   the land and stops survey. cold: per hour, as a biome's storm (negative warms you); mods: while it blows.
   hurt: hit points lost per hour out in the open (never below 1); star: it leaves a fallen star to find. */
export default {
  oddWeather: {
    chance: 0.15,
    list: [
      {
        id: 'hail',
        name: 'hailstorm',
        cold: 8,
        hurt: 2,
        mods: [{ stat: 'moveTime', op: 'mul', value: 1.3 }],
        text: 'Hail hurts out in the open. Get under cover.',
      },
      {
        id: 'ash',
        name: 'fall of ash',
        cold: 3,
        mods: [{ stat: 'waterDrain', op: 'mul', value: 1.4 }],
        text: 'Grey ash falls from a clear sky. It gets in your throat.',
      },
      {
        id: 'fog',
        name: 'thick fog',
        cold: 2,
        mods: [{ stat: 'moveTime', op: 'mul', value: 1.15 }],
        text: 'A white fog, so thick you cannot see your feet.',
      },
      {
        id: 'warm',
        name: 'warm wind',
        cold: -8,
        mods: [{ stat: 'waterDrain', op: 'mul', value: 1.2 }],
        text: 'A warm wind out of nowhere, full of dust. It warms you through, and dries you out.',
      },
      {
        id: 'stars',
        name: 'shower of falling stars',
        cold: 0,
        star: true,
        mods: [],
        text: 'The sky is full of falling stars. One comes down not far off.',
      },
    ],
  },
};
