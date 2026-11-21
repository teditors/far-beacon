/* Dungeons: places below the world, entered by a stair in a cave, a ruin, a cellar in a town or the locked place's
   door. Each is one THEME, which says how its levels are laid out, what lives there and what it holds. Levels are
   built the first time you go down to them, so a dungeon costs nothing until it is walked; deeper is harder and richer.

   layout: rooms (rooms and corridors), caves (open caverns grown from noise), tunnels (long winding passages),
           halls (great pillared halls, cut square)
   dark:   no light down there (you need a lantern or a torch); a glowing theme is lit
   forms:  creature forms that live there; names: what they are called (one is picked per world and theme)
   tier:   [at level 1, added per level] for the creatures; the deepest level has an elder of its own (the Heart)
   per:    creatures on a level; traps: pressure plates per level; pools: standing water per level
   mods:   while you are down there (stat modifiers); prize: what the bottom holds
   look:   colours for the view (stone, floor), as numbers */
export default {
  deeps: {
    perRegion: 0.45, // dungeons per region, on average, at the usual setting (some regions have none, a few two)
    townChance: 0.35, // a town has a cellar going down (an old crypt, a cistern, a mine-head)
    depth: [1, 4], // levels in an ordinary dungeon (the world setting caps the most)
    plotDepth: [4, 7], // a dungeon the plot uses goes deeper
    // creature ids for dungeon levels start here (each level has its own block of 40)
    idBase: 20000,
    maxTier: 8, // no creature below is stronger than this, however deep
    quirkChance: 0.3, // a level is now and then one of the odd levels (content/floors.js), as the locked place's are
    themes: [
      {
        id: 'mine',
        name: 'Old mine',
        names: ['the Deep Seam', 'the Black Drift', 'the Lost Lode', 'the Tallow Shaft'],
        entry: ['cave', 'town'],
        layout: 'tunnels',
        dark: true,
        forms: ['brute', 'hound'],
        creature: ['Tunnel', 'Shaft', 'Ore'],
        tier: [1, 0.6],
        per: 4,
        traps: 2,
        pools: 1,
        coin: [4, 14],
        text: 'Timbered tunnels running into the rock, and the smell of old lamp-oil.',
        prize: 'A seam of something that is not ore, and what the last miners left beside it.',
        mats: { salvage: 2 },
        look: { stone: 0x5b4a3a, floor: 0x3a3028 },
      },
      {
        id: 'crypt',
        name: 'Crypt',
        names: ['the Bone Vaults', 'the Silent Crypt', 'the Hollow Tombs', 'the Low Catacomb'],
        entry: ['ruin', 'town'],
        layout: 'rooms',
        dark: true,
        forms: ['wight'],
        creature: ['Crypt', 'Grave', 'Hollow'],
        tier: [1, 0.7],
        per: 3,
        traps: 3,
        pools: 0,
        coin: [8, 22],
        text: 'Niches cut in the walls, each with its dead. The air has not moved in a long time.',
        prize: 'A lord laid out in state, with the grave-goods of a lord.',
        mats: { bone: 3 },
        look: { stone: 0x6e6a62, floor: 0x37342f },
      },
      {
        id: 'cistern',
        name: 'Flooded cistern',
        names: ['the Drowned Cistern', 'the Sunken Wells', 'the Echo Tanks', 'the Old Waterworks'],
        entry: ['ruin', 'town'],
        layout: 'halls',
        dark: true,
        forms: ['serpent'],
        creature: ['Cistern', 'Pale', 'Drowned'],
        tier: [1, 0.6],
        per: 3,
        traps: 0,
        pools: 4,
        coin: [5, 15],
        text: 'Pillared halls standing in black water. Every sound comes back to you twice.',
        prize: "The sluice-keeper's room, dry and sealed, with what they kept there.",
        mods: [
          { stat: 'moveTime', op: 'mul', value: 1.3 },
          { stat: 'cold', op: 'mul', value: 1.8 },
        ],
        look: { stone: 0x4a5a5c, floor: 0x24343a },
      },
      {
        id: 'fungus',
        name: 'Fungus cavern',
        names: ['the Glimmering Deep', 'the Spore Gardens', 'the Soft Caverns', 'the Lantern Grotto'],
        entry: ['cave'],
        layout: 'caves',
        dark: false, // the fungus glows: no light needed
        forms: ['hound', 'serpent', 'brute'],
        creature: ['Spore', 'Mould', 'Glimmer'],
        tier: [1, 0.55],
        per: 4,
        traps: 0,
        pools: 2,
        coin: [3, 10],
        text: 'Caverns lit by pale fungus, soft underfoot. Things grow here that grow nowhere else.',
        prize: 'A garden of the great fungus, and the bones of those who came to pick it.',
        mats: { herbs: 4 },
        mods: [{ stat: 'waterDrain', op: 'mul', value: 0.8 }],
        look: { stone: 0x4d5a3e, floor: 0x2e3a2a, glow: 0x9fe0a0, bg: 0x0c1a10, far: 30, light: 0.5 },
      },
      {
        id: 'hold',
        name: 'Dwarf-hold',
        names: ['the Hall of Anvils', 'the Sealed Hold', 'the Stone Gate', 'the Under-hall'],
        entry: ['cave', 'ruin'],
        layout: 'halls',
        dark: true,
        forms: ['brute', 'wight'],
        creature: ['Hold', 'Iron', 'Forge'],
        tier: [2, 0.7],
        per: 3,
        traps: 4,
        pools: 1,
        coin: [12, 30],
        text: 'Square halls cut true, and doors that once had guards. Whoever built this meant to stay.',
        prize: "The hold's treasury: the last thing its people kept for themselves.",
        mats: { salvage: 3 },
        look: { stone: 0x7a6e5e, floor: 0x45403a },
      },
      {
        id: 'warren',
        name: 'Warren',
        names: ['the Gnawed Ways', 'the Burrows', 'the Under-warren', 'the Den Roads'],
        entry: ['cave'],
        layout: 'caves',
        dark: true,
        forms: ['hound'],
        creature: ['Warren', 'Burrow', 'Blind'],
        tier: [1, 0.5],
        per: 6,
        traps: 0,
        pools: 1,
        coin: [2, 8],
        text: 'Low, gnawed tunnels, and the sound of many small feet.',
        prize: 'The great den, and everything the warren has dragged down in a hundred years.',
        mats: { hide: 4 },
        look: { stone: 0x5e5040, floor: 0x3b3226 },
      },
    ],
  },
};
