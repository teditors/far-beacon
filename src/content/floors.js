/* Odd levels of the locked place: now and then (chance, per level above the last) a level is one of these instead of
   the usual guard, loot or trap level. Rarely (rareChance) it is the rare one.
   pools: depots of water standing on the level; guards: extra tier-1 guardians; reveal: the whole level is known on
   arrival; items: good items left on the level; sleep: the guardians sleep and never wake; mods: while on it. */
export default {
  floorKinds: {
    chance: 0.3,
    rareChance: 0.08,
    list: [
      {
        id: 'flooded',
        text: 'Black water stands knee-deep on this level. It is drinkable, and it is very cold.',
        pools: 3,
        mods: [
          { stat: 'moveTime', op: 'mul', value: 1.5 },
          { stat: 'cold', op: 'mul', value: 2.5 },
        ],
      },
      { id: 'ossuary', text: 'Bones are stacked to the ceiling here, and some of them are standing up.', guards: 3 },
      {
        id: 'archive',
        text: 'An archive: shelves of tablets, and a plan of the level carved by the door.',
        reveal: true,
        items: 2,
      },
    ],
    rare: { id: 'sleepers', text: 'The guardians of this level are asleep, and nothing you do will wake them.', sleep: true },
  },
};
