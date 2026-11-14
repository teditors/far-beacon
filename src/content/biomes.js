/* Biomes: climate, ground types, colours and creature names. */
export default {
  biomes: [
    {
      id: 'salt',
      sky: 0xd3d2c2, // daytime sky and fog colour
      creatureTint: 0x6e4a2a, // must stand out against the ground colours
      name: 'Salt Flats',
      blurb: 'Hot days, thin water, dust on the wind.',
      hills: 0.18,
      mountains: 0.05,
      springs: 4,
      foul: 0.15,
      day: { cold: 0, warm: 6, mods: [{ stat: 'waterDrain', op: 'mul', value: 1.4 }] },
      night: { cold: 6, warm: 0, mods: [] },
      storm: {
        name: 'dust storm',
        cold: 0,
        mods: [
          { stat: 'moveTime', op: 'mul', value: 1.6 },
          { stat: 'waterDrain', op: 'mul', value: 1.3 },
        ],
      },
      colors: ['#cdbf9c', '#b0966a', '#7a6650', '#9c8a5c', '#dccfa6', '#f1ecdf'],
      forest: {
        name: 'thorn scrub',
        frac: 0.07,
        moveMin: 18,
        moveSta: 2.5,
        gather: true,
        mods: [],
        tree: { color: 0x6e5c44, h: [1, 2.2], w: 0.9, n: 6 },
      },
      river: { name: 'dry wash', count: 2, moveMin: 12, moveSta: 1.6, dig: 2, mods: [] },
      special: { name: 'salt pan', frac: 0.1, moveMin: 12, moveSta: 1.8, mods: [{ stat: 'waterDrain', op: 'mul', value: 1.25 }] },
    },
    {
      id: 'moor',
      sky: 0xaab7bb, // daytime sky and fog colour
      creatureTint: 0x3a2f2a, // must stand out against the ground colours
      name: 'High Moor',
      blurb: 'Water everywhere, much of it foul. Rain and cold nights.',
      hills: 0.3,
      mountains: 0.06,
      springs: 7,
      foul: 0.4,
      day: { cold: 3, warm: 2, mods: [] },
      night: { cold: 8, warm: 0, mods: [] },
      storm: { name: 'rainstorm', cold: 10, mods: [{ stat: 'moveTime', op: 'mul', value: 1.25 }] },
      colors: ['#7c9463', '#5f7653', '#55585e', '#4c6a3c', '#3f7fa8', '#4b5637'],
      forest: {
        name: 'birch copse',
        frac: 0.12,
        moveMin: 20,
        moveSta: 2.5,
        gather: true,
        blind: true,
        mods: [
          { stat: 'cold', op: 'mul', value: 0.6 },
          { stat: 'stormCold', op: 'mul', value: 0.4 },
        ],
        tree: { color: 0x7d9a5a, h: [5, 9], w: 1.5, n: 7 },
      },
      river: { name: 'stream', count: 3, moveMin: 30, moveSta: 4, wet: 8, drink: true, mods: [] },
      special: { name: 'bog', frac: 0.1, moveMin: 35, moveSta: 6, wet: 5, mods: [] },
    },
    {
      id: 'taiga',
      sky: 0xc6d3db, // daytime sky and fog colour
      creatureTint: 0x3b4a5c, // must stand out against the ground colours
      name: 'Snowbound Taiga',
      blurb: 'Always cold. Snow can be melted for water if you have fuel.',
      hills: 0.25,
      mountains: 0.1,
      springs: 2,
      foul: 0.1,
      melt: 3,
      day: { cold: 6, warm: 2, mods: [] },
      night: { cold: 12, warm: 0, mods: [] },
      storm: { name: 'blizzard', cold: 14, mods: [{ stat: 'moveTime', op: 'mul', value: 1.5 }] },
      colors: ['#dfe6e8', '#a3b7b3', '#6c7b85', '#b4c6bd', '#bfe0f0', '#d3ebf6'],
      forest: {
        name: 'pine forest',
        frac: 0.28,
        moveMin: 22,
        moveSta: 3,
        gather: true,
        blind: true,
        mods: [
          { stat: 'cold', op: 'mul', value: 0.55 },
          { stat: 'stormCold', op: 'mul', value: 0.3 },
        ],
        tree: { color: 0x2f4a3c, h: [7, 13], w: 2.2, n: 8 },
      },
      river: { name: 'frozen river', count: 2, moveMin: 11, moveSta: 1.6, mods: [{ stat: 'cold', op: 'mul', value: 1.3 }] },
      special: { name: 'frozen lake', frac: 0.07, moveMin: 11, moveSta: 1.6, mods: [{ stat: 'cold', op: 'mul', value: 1.3 }] },
    },
  ],
};
