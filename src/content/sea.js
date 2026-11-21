/* The sea, lakes, and what lies under the water.

   Seas are whole regions: in a world that has one (the `sea` world setting, about 2 worlds in 5 by default), a patch
   of 2 to 4 neighbouring regions away from home becomes open sea, with islands where the land stands high. Lakes come
   anyway, in about one region in four. Their deep water is a ground of its own (DEEP) that no one walks on: you need a
   boat to cross it, a way to breathe water to walk along the bottom, or wings to fly over it. Shallows and lake
   margins can be waded, and lake water is sweet; the sea is salt.

   Places: on the surface a floating town (a raft-town, reached by boat) and wrecks; under the water, merfolk halls,
   sea caves and sunken wrecks (needing a way to breathe); a drowned shrine at the bottom of some lakes.
   kinds: as content/sky.js. A place `under` the water needs breathing to enter; one `afloat` needs a boat (or wings,
   or breathing to swim to it). */
export default {
  sea: {
    chance: 0.4, // as the world setting's default
    regions: [2, 4], // how many regions a sea covers
    lakeChance: 0.25, // a region has a lake
    deep: { name: 'deep water', moveMin: 12, moveSta: 1.4, wet: 6, mods: [] }, // by boat or along the bottom
    breathHours: 12, // a draught of gills lasts this long
    drown: 3, // damage an hour under water with no way to breathe
    biome: {
      id: 'sea',
      sea: true,
      sky: 0xb7cfe0,
      creatureTint: 0x26323c,
      name: 'Open Sea',
      blurb: 'Salt water to the edge of sight, and islands where the old land stands high.',
      lush: 0x4f7a5a,
      hills: 0.05,
      mountains: 0.02,
      springs: 2,
      foul: 0.2,
      day: { cold: 3, warm: 2, mods: [] },
      night: { cold: 7, warm: 0, mods: [] },
      storm: { name: 'sea storm', cold: 12, mods: [{ stat: 'moveTime', op: 'mul', value: 1.3 }] },
      colors: ['#c9b98a', '#8f9a6a', '#6c6a64', '#5d7a4c', '#2f6f9a', '#86b0b8'],
      forest: {
        name: 'salt scrub',
        frac: 0.1,
        moveMin: 18,
        moveSta: 2,
        gather: true,
        mods: [{ stat: 'cold', op: 'mul', value: 0.8 }],
        tree: { color: 0x6a7a4a, h: [2, 4], w: 1.4, n: 5 },
      },
      river: { name: 'tidal channel', count: 0, moveMin: 26, moveSta: 3, wet: 8, mods: [] },
      special: { name: 'shallows', frac: 0.9, moveMin: 28, moveSta: 3.5, wet: 10, mods: [] },
    },
    prefix: ['Sea', 'Brine', 'Reef', 'Tide'],
    items: [
      {
        id: 'coracle',
        name: 'Coracle',
        wt: 5,
        w: 0,
        boat: true, // carried, not worn: a round boat of hide on a willow frame, it carries you over deep water
        mods: [],
      },
      {
        id: 'divehelm',
        slot: 'tool',
        name: 'Diving Helm',
        wt: 3,
        w: 0,
        mods: [{ stat: 'breathe', op: 'add', value: 1 }],
      },
      { id: 'gills', name: 'Draught of Gills', wt: 0.3, w: 0, consumable: true, plain: true, use: { breathe: 12 } },
    ],
    value: { coracle: 30, divehelm: 80, gills: 14 },
    // in a world with a sea, the town nearest it sells a coracle and draughts of gills
    shop: ['coracle', 'gills', 'gills'],
    kinds: [
      {
        id: 'raft',
        name: 'Floating town',
        names: ['Driftmoor', 'the Raft of Lanterns', 'Saltholm', 'Tethertown'],
        layout: 'raft',
        afloat: true,
        levels: 1,
        sea: true,
        forms: [],
        creature: [],
        tier: 0,
        per: 0,
        text: 'Boats lashed together into a town that rides the swell. Fresh water is sold here by the cup.',
        trader: {
          name: 'the raft-master',
          talk: '"Anyone who comes in over the water is welcome to buy. Anyone who goes down under it, buy a helm first."',
          goods: [
            { base: 'divehelm', price: 85 },
            { base: 'gills', price: 14 },
            { base: 'coracle', price: 30 },
            { base: 'salve', price: 6 },
          ],
          bed: 6,
        },
        look: { stone: 0x6a4a30, floor: 0x8a6a48, bg: 0xb7cfe0, far: 160, light: 0.95, void: true, water: true },
      },
      {
        id: 'merhall',
        name: 'Merfolk halls',
        names: ['the Coral Court', 'the Halls of Kelp', 'Deepmere', 'the Pearl Steps'],
        layout: 'halls',
        under: true,
        levels: 1,
        sea: true,
        forms: [],
        creature: [],
        tier: 0,
        per: 0,
        text: 'Halls of coral and shell under the sea, lit green from above. The merfolk who live here speak slowly, and trade.',
        trader: {
          name: 'the pearl-keeper',
          talk: '"You breathe the sea now. Good. We have things for those who do."',
          goods: [
            { base: 'gills', price: 10 },
            { base: 'divehelm', price: 70 },
          ],
          bed: 4,
        },
        look: { stone: 0x5a8a7a, floor: 0x9a8f6a, bg: 0x0d3a50, far: 30, light: 0.55, glow: 0x7fd0c0 },
      },
      {
        id: 'seacave',
        name: 'Sea cave',
        names: ['the Drowned Grotto', 'the Sounding Cave', 'the Black Fathoms', 'the Kelp Throat'],
        layout: 'caves',
        under: true,
        dark: true,
        levels: 2,
        sea: true,
        coast: true, // its mouth is on the shore
        forms: ['serpent'],
        creature: ['Eel', 'Fathom', 'Grotto'],
        tier: 2,
        per: 4,
        text: 'A cave the sea fills. Your light makes a small green room in the black water.',
        prize: 'Something the sea brought in, long ago, and could not take back out.',
        look: { stone: 0x2f4048, floor: 0x5a5a48, bg: 0x04121a, far: 22, light: 0.3, glow: 0x5f9ab0 },
      },
      {
        id: 'wreck',
        name: 'Wreck',
        names: [
          'the wreck of the Gull',
          'the wreck of the Long Patience',
          'the wreck of the Salt Queen',
          'the wreck of the Heron',
        ],
        layout: 'rooms',
        under: true,
        levels: 1,
        sea: true,
        forms: ['serpent', 'wight'],
        creature: ['Wreck', 'Drowned', 'Barnacle'],
        tier: 2,
        per: 3,
        text: 'The ribs of a great ship, lying on its side on the sea floor. Its holds are still shut.',
        prize: "The captain's strongbox.",
        look: { stone: 0x4a3a2a, floor: 0x6a6048, bg: 0x0b2a40, far: 26, light: 0.45, glow: 0x6fb0d0 },
      },
      {
        id: 'drowned',
        name: 'Drowned shrine',
        names: ['the Drowned Shrine', 'the Still Chapel', 'the Mere-temple'],
        layout: 'rooms',
        under: true,
        levels: 1,
        lake: true,
        forms: ['wight'],
        creature: ['Mere', 'Silt'],
        tier: 2,
        per: 2,
        text: 'A shrine the lake rose over. Its lamps are out, but its offerings are still on the altar.',
        prize: 'The offerings of a people who are gone.',
        look: { stone: 0x5d6a5a, floor: 0x4a4a40, bg: 0x0d2a2a, far: 24, light: 0.4, glow: 0x7fb0a0 },
      },
    ],
  },
};
