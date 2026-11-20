/* The sky: things that let you fly, and places that float above the world.

   Flying (rules/sky.js): anything that gives `fly` lets you take to the air outdoors. Aloft you cross rivers, marsh
   and mountains at the same quick pace and nothing on the ground can reach you, but it is hard work (stamina per
   tile, times the item's flyEffort), cold and thirsty up there, a storm throws you down, and you cannot fill water,
   search, gather, make a fire or sleep without landing. So the ground keeps its uses: water, shelter and every place
   worth finding are on it.

   Sky places float over a region, marked on the ground by a shadow with no cloud to cast it. Fly over the shadow and
   up. Each kind has a layout (isle: a floating island; castle: an island with a keep on it; city: streets of
   cloud-houses; moon: a wide grey plain), levels (a castle and a moon have more than one), creature names, tier and a
   prize. They are late-game: their creatures start at tier 3. */
export default {
  sky: {
    chance: 0.2, // as the world setting's default; with the plot's own (the tyrant's castle), about 1 world in 4
    places: [1, 3], // how many, in a world that has them
    cold: 4, // more cold an hour, aloft (it is cold up there)
    thirst: 1.2, // water used aloft
    fall: [2, 6], // damage when a storm throws you down (or you jump)
    lowStamina: 8, // below this you must land
    // flying items (no `w`: never rolled as ordinary finds; they are placed)
    items: [
      {
        id: 'wingboots',
        slot: 'boots',
        name: 'Boots of the Updraft',
        wt: 1,
        w: 0,
        mods: [
          { stat: 'fly', op: 'add', value: 1 },
          { stat: 'flyEffort', op: 'mul', value: 1.4 },
        ],
      },
      {
        id: 'windcloak',
        slot: 'cloak',
        name: 'Cloak of the West Wind',
        wt: 1.5,
        w: 0,
        mods: [
          { stat: 'fly', op: 'add', value: 1 },
          { stat: 'cold', op: 'mul', value: 0.85 },
        ],
      },
      {
        id: 'carpet',
        slot: 'pack',
        name: 'Flying Carpet',
        wt: 4,
        w: 0,
        mods: [
          { stat: 'fly', op: 'add', value: 1 },
          { stat: 'flyEffort', op: 'mul', value: 0.6 },
          { stat: 'carryCap', op: 'add', value: 4 },
        ],
      },
      {
        id: 'bridle',
        slot: 'tool',
        name: "Griffin's Bridle",
        wt: 1,
        w: 0,
        quest: 'A tame griffin answers this bridle, and carries you.',
        mods: [
          { stat: 'fly', op: 'add', value: 1 },
          { stat: 'flyEffort', op: 'mul', value: 0.45 },
        ],
      },
    ],
    // where a world that has sky places gets its first way of flying
    firstFlight: { shop: 0.5, price: [90, 140] }, // a town's shop sells one; otherwise the deepest dungeon holds one
    kinds: [
      {
        id: 'isle',
        name: 'Drifting isle',
        names: ['the Drifting Isle', 'the Wandering Rock', 'the Lofted Garden', 'the Cloud Orchard'],
        layout: 'isle',
        levels: 1,
        weight: 4,
        forms: ['hound', 'serpent'],
        creature: ['Sky', 'Wind', 'Cloud'],
        tier: 3,
        per: 4,
        text: 'An island of grass and broken stone, turning slowly on the wind. Ruins of whoever lived here stand at its heart.',
        ruins: 3,
        look: { stone: 0xb9b4a6, floor: 0x7d9a5c, bg: 0x9cc4ec, far: 160, light: 0.95, void: true },
      },
      {
        id: 'castle',
        name: 'Floating castle',
        names: ['the Castle of the Winds', 'the High Keep', 'the Sky-hold', 'the Unfallen Tower'],
        layout: 'castle',
        levels: 3,
        weight: 2,
        forms: ['wight', 'brute'],
        creature: ['Storm', 'Gale', 'Thunder'],
        tier: 3,
        per: 4,
        text: 'A castle on a crag of rock that hangs in the sky, its gates open to the wind.',
        prize: 'The lord of the keep kept the best of everything up here, out of reach.',
        look: { stone: 0xd2cfc7, floor: 0x8a8578, bg: 0x9cc4ec, far: 160, light: 0.9, void: true },
      },
      {
        id: 'city',
        name: 'Cloud city',
        names: ['Highwater', 'Aerie', 'the City of Bridges', 'Stillcloud'],
        layout: 'city',
        levels: 1,
        weight: 2,
        forms: [],
        creature: [],
        tier: 0,
        per: 0,
        people: true,
        text: 'White houses on banks of cloud, joined by rope bridges. People live here, and trade with anyone who can reach them.',
        trader: {
          name: 'the windwright',
          talk: '"Few walk in here. Fewer leave by the stair. What will you have?"',
          goods: [
            { base: 'windcloak', price: 70 },
            { base: 'salve', price: 6 },
            { base: 'furcloak', price: 18 },
          ],
          bed: 6,
        },
        look: { stone: 0xf0f0f4, floor: 0xd8dde4, bg: 0xa8cdf0, far: 180, light: 1, void: true },
      },
      {
        id: 'moon',
        name: 'Low moon',
        names: ['the Low Moon', 'the Pale Moon', 'the Small Moon'],
        layout: 'moon',
        levels: 2,
        weight: 1,
        rare: true, // only in a world with another sky place, and then only now and then
        forms: ['hound', 'wight'],
        creature: ['Moon', 'Silver', 'Hollow'],
        tier: 4,
        per: 5,
        text: 'Grey dust and silence. Everything weighs half what it should, and the cold is the cold between the stars.',
        prize: 'At the bottom of the deepest crater, something that fell here long before you.',
        mods: [
          { stat: 'carryCap', op: 'mul', value: 1.6 },
          { stat: 'cold', op: 'add', value: 6 },
          { stat: 'staminaCost', op: 'mul', value: 0.7 },
        ],
        look: { stone: 0x8e8e94, floor: 0xb8b8bc, bg: 0x06070d, far: 120, light: 0.75, void: true },
      },
    ],
  },
};
