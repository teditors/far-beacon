/* Wayfarers: people met in the wilds, at a small fire of their own. About one region in three away from home has one,
   chosen when the region is first built. Each kind has something to offer at a price, or a need of its own, and
   moves on once you have dealt with them (gone: true), so they are a chance, not a shop.

   offers: water (sells water by the measure), map (the country round about drawn on your map, its springs marked),
           sign (tells you where the nearest unknown thing lies: a dungeon's stair, a shadow in the sky, a place in the
           water, a door), mats (buys hides and bone, sells bandages), need (asks for water; gives back what they carry) */
export default {
  wayfarers: {
    chance: 0.35, // a region away from home has one
    kinds: [
      {
        id: 'waterseller',
        name: 'a water-carrier',
        names: ['Old Tam', 'Hessa', 'Brannoc', 'Jory'],
        talk: '"Water, sweet and cold, carried from a spring you will never find. Two coin the measure, and I have six."',
        weight: 3,
        offers: { water: { price: 2, have: 6 } },
      },
      {
        id: 'mapmaker',
        name: 'a wandering mapmaker',
        names: ['Ildra', 'Penhal', 'Quill', 'Marrit'],
        talk: '"I have walked every hill of this country. For a little coin I will draw it on your map, springs and all."',
        weight: 2,
        offers: { map: { price: 12, radius: 1 } },
      },
      {
        id: 'pilgrim',
        name: 'a pilgrim',
        names: ['Brother Aun', 'Sister Wenna', 'the grey pilgrim', 'Old Ysolt'],
        talk: '"I go where the old stories go. Sit with me a while, and I will tell you what I have seen on the road."',
        weight: 3,
        offers: { sign: { price: 0 } },
      },
      {
        id: 'trapper',
        name: 'a trapper',
        names: ['Corl', 'Ama', 'Riddock', 'Fen'],
        talk: '"Hides, bone: I buy them all, and I sell bandages to the ones who bleed for them."',
        weight: 2,
        offers: { mats: { hide: 3, bone: 2, bandage: 5 } },
      },
      {
        id: 'castaway',
        name: 'a lost traveller',
        names: ['Petra', 'Lowan', 'Siske', 'Garet'],
        talk: '"Water. Please. I lost my skin at the river and I have not drunk in two days."',
        weight: 1,
        offers: { need: { water: 2, coin: [8, 20], xp: 25 } },
      },
    ],
  },
};
