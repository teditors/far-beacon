/* Trade: goods that are cheap where they are made and dear where they are not, so they are worth carrying from one
   town to another. A town makes a good when its country or its people do (made: tests on the biome of its region and
   on its culture's trade). The year moves some prices. Each town's prices also wander a little, from the seed.
   Goods are carried as counts (s.player.goods) and weigh what they weigh. */
export default {
  trade: {
    goods: [
      { id: 'furs', name: 'Furs', wt: 1, price: 9, made: { cold: 10 }, text: 'Pelts from the cold country.' },
      {
        id: 'salt',
        name: 'Salt',
        wt: 1,
        price: 7,
        made: { special: 'salt', warm: 6 },
        text: 'For curing meat; the flats are white with it.',
      },
      {
        id: 'timber',
        name: 'Timber',
        wt: 2,
        price: 5,
        made: { forest: 0.25, trade: 'charcoal' },
        text: 'Seasoned wood and charcoal.',
      },
      {
        id: 'tools',
        name: 'Iron tools',
        wt: 1.5,
        price: 12,
        made: { mountains: 0.1, trade: 'smiths' },
        text: 'Blades, nails and pots from the hill forges.',
      },
      { id: 'cloth', name: 'Cloth', wt: 0.5, price: 8, made: { hills: 0.3, trade: 'weavers' }, text: 'Wool, woven.' },
      {
        id: 'remedies',
        name: 'Remedies',
        wt: 0.3,
        price: 10,
        made: { trade: 'herbalists', special: 'meadow' },
        text: 'Dried herbs, tinctures and poultices.',
      },
    ],
    made: 0.6, // a town sells what it makes at this share of the price
    wanted: 1.45, // and buys what it does not make at this much
    spread: 0.8, // a town buys from you at this share of its own price
    wander: 0.15, // each town's prices wander this much either way
    stock: [2, 5], // how many of each good it makes a town has to sell
    year: {
      hardwinter: { furs: 1.6, timber: 1.3 },
      drought: { salt: 0.8, remedies: 1.4 },
      lean: { tools: 1.3, cloth: 1.2 },
      plenty: { tools: 0.8, cloth: 0.8 },
    },
    mats: 1, // materials (hides, bone, salvage, herbs) sell at their value in every town
  },
};
