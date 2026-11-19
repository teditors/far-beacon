/* Hamlets: a few houses round a well in the country between places, in regions away from home. Water, a roof, a bed,
   a little to buy, and someone with a rumour. */
export default {
  hamlets: {
    chance: 0.45, // per region away from home
    a: ['Low', 'High', 'Far', 'Thorn', 'Cold', 'Black', 'Little', 'Old'],
    b: ['cot', 'stead', 'ing', 'hope', 'well', 'croft', 'fold', 'hithe'],
    bed: 3,
    goods: [
      { base: 'salve', price: 9 },
      { base: 'tonic', price: 7 },
      { base: 'draught', price: 7 },
      { base: 'waterskin', price: 8 },
    ],
    fuel: 2,
    talk: [
      'A few houses round a well. People here see few travellers, and are glad of news.',
      'Smoke from three chimneys, a dog, a well with a bucket on a chain.',
      'A huddle of turf-roofed houses. Someone is singing.',
    ],
  },
};
