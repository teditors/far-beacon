/* Town cultures: the living people of a town are a trade and a custom, and rarely something stranger.
   mods   modifiers on the town's numbers: town.innPrice, town.fuelPrice, town.appraisePrice, town.sellRate,
          town.buy (all goods), town.buy.weapon / .armor / .consumable / .gear (one kind of goods)
   stock  extra goods in the shop: { bases: [...], n }
   fuel   extra fuel for sale
   elder  what the elder adds when you first talk: 'lore' (tells everything about the lost people), 'shrine' (marks the
          shrine and tells the god's terms), 'springs' (marks every spring within 8 tiles of the town) */
export default {
  townCulture: {
    rareChance: 0.12,
    trades: [
      {
        id: 'smiths',
        name: 'smiths',
        text: 'Weapons and armor are cheap here, and there are more of them.',
        mods: [
          { stat: 'town.buy.weapon', op: 'mul', value: 0.7 },
          { stat: 'town.buy.armor', op: 'mul', value: 0.7 },
        ],
        stock: { bases: ['sword', 'spear', 'axe', 'leather', 'mail'], n: 2 },
      },
      {
        id: 'herbalists',
        name: 'herbalists',
        text: 'Salves, tonics and draughts are cheap and plentiful.',
        mods: [{ stat: 'town.buy.consumable', op: 'mul', value: 0.6 }],
        stock: { bases: ['salve', 'tonic', 'draught', 'salve'], n: 4 },
      },
      {
        id: 'weavers',
        name: 'weavers',
        text: 'Cloaks, packs and waterskins are cheap here.',
        mods: [{ stat: 'town.buy.gear', op: 'mul', value: 0.8 }],
        stock: { bases: ['cloak', 'waterskin', 'framepack'], n: 2 },
      },
      {
        id: 'charcoal',
        name: 'charcoal-burners',
        text: 'Fuel is cheap and there is a great deal of it.',
        mods: [{ stat: 'town.fuelPrice', op: 'mul', value: 0.5 }],
        fuel: 12,
      },
      {
        id: 'traders',
        name: 'traders',
        text: 'They buy anything, at a better price than most.',
        mods: [{ stat: 'town.sellRate', op: 'mul', value: 1.5 }],
        stock: { bases: ['compass', 'spyglass', 'rope', 'lantern'], n: 2 },
      },
    ],
    customs: [
      {
        id: 'hospitable',
        name: 'hospitable',
        text: 'A bed at the inn costs almost nothing.',
        mods: [{ stat: 'town.innPrice', op: 'mul', value: 0.4 }],
      },
      {
        id: 'suspicious',
        name: 'suspicious of strangers',
        text: 'Everything costs more, but the elder marks every spring near the town on your map.',
        mods: [{ stat: 'town.buy', op: 'mul', value: 1.3 }],
        elder: 'springs',
      },
      { id: 'pious', name: 'pious', text: 'The elder tells you of the god of this land and marks its shrine.', elder: 'shrine' },
      {
        id: 'lore',
        name: 'keepers of old lore',
        text: 'The elder tells you everything known about the lost people.',
        elder: 'lore',
      },
      {
        id: 'thrifty',
        name: 'thrifty',
        text: 'Appraisal is free, and they drive a hard bargain when buying.',
        mods: [
          { stat: 'town.appraisePrice', op: 'mul', value: 0 },
          { stat: 'town.sellRate', op: 'mul', value: 0.75 },
        ],
      },
    ],
    rares: [
      {
        id: 'unfallen',
        name: 'the people who never fell',
        text: 'This town is of the lost people themselves: they did not fall, they only stopped building. They tell you all they are, and their shop is full of their own marked gear.',
        elder: 'lore',
        marked: 3,
      },
      {
        id: 'pilgrims',
        name: 'pilgrims',
        text: 'A town of pilgrims to the shrine. They tell you its terms and mark it, and every bed is free.',
        elder: 'shrine',
        mods: [{ stat: 'town.innPrice', op: 'mul', value: 0 }],
      },
    ],
  },
};
