/* Named artifacts: a few per world, each a common base with a power no affix has, named for the lost people.
   for    the bases it can be
   names  what it is called (the artifact is "<Name>, <Base> of the <people>")
   mods   stat modifiers while worn (or carried, for things without a slot)
   tick   what it does each hour while worn: water (fills itself), warmthFloor (you never get colder than this),
          stamina (per hour of walking) */
export default {
  artifacts: {
    count: 3, // one in the town's shop, one beside the relic, one in a cache in a far region
    value: 45, // price in the shop, on top of the base
    powers: [
      {
        id: 'wellspring',
        names: ['Dewcatcher', 'the Unfailing', 'Wellspring'],
        for: ['waterskin', 'staff', 'cloak'],
        text: 'Fills itself: a third of a measure of water every hour.',
        tick: { water: 0.33 },
        mods: [{ stat: 'waterCap', op: 'add', value: 1 }],
      },
      {
        id: 'ember',
        names: ['Emberheart', 'the Banked Coal', 'Hearthkeeper'],
        for: ['cloak', 'lantern'],
        text: 'You never grow colder than a hearth would let you.',
        tick: { warmthFloor: 40 },
        mods: [],
      },
      {
        id: 'stride',
        names: ['Longstride', 'the Wayfarer', 'Milestealer'],
        for: ['boots', 'staff'],
        text: 'Ground passes under you: much less time and effort on every step.',
        mods: [
          { stat: 'moveTime', op: 'mul', value: 0.75 },
          { stat: 'staminaCost', op: 'mul', value: 0.8 },
        ],
      },
      {
        id: 'peak',
        names: ['Peakwalker', 'the Goat-King', 'Cloudstep'],
        for: ['boots', 'rope'],
        text: 'Mountains are no harder than hills, and hills hardly slow you.',
        mods: [
          { stat: 'moveTime.mountain', op: 'mul', value: 0.35 },
          { stat: 'moveTime.hill', op: 'mul', value: 0.6 },
        ],
      },
      {
        id: 'quiet',
        names: ['Hush', 'the Unheard', 'Mothwing'],
        for: ['cloak', 'boots', 'dagger'],
        text: 'Creatures never hunt you or guard their ground against you. They fight only if you walk into them.',
        mods: [{ stat: 'quiet', op: 'add', value: 1 }],
      },
      {
        id: 'vigil',
        names: ['Tireless', 'the Long Watch', 'Second Wind'],
        for: ['framepack', 'leather', 'mail'],
        text: 'Your strength comes back as you walk: stamina every hour on the move.',
        tick: { stamina: 6 },
        mods: [],
      },
      {
        id: 'seer',
        names: ['Farsight', 'the Open Eye', 'Starglass'],
        for: ['spyglass', 'compass', 'lantern'],
        text: 'See far when you survey, and see in the dark without fuel.',
        mods: [
          { stat: 'surveyRadius', op: 'add', value: 4 },
          { stat: 'nightSight', op: 'add', value: 1 },
        ],
      },
      {
        id: 'slayer',
        names: ['Widowmaker', 'the Red Tooth', 'Lastword'],
        for: ['dagger', 'sword', 'spear', 'axe'],
        text: 'It finds the gap in anything: to hit +2, damage +3.',
        mods: [
          { stat: 'hit', op: 'add', value: 2 },
          { stat: 'dmg', op: 'add', value: 3 },
        ],
      },
      {
        id: 'bulwark',
        names: ['the Unbroken', 'Stonehide', 'Bulwark'],
        for: ['leather', 'mail', 'cloak'],
        text: 'Blows slide off it: armor +4.',
        mods: [{ stat: 'ac', op: 'add', value: 4 }],
      },
    ],
  },
};
