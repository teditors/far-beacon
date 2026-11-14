/* Towns and the parts the quest is rolled from. */
export default {
  town: {
    a: ['Ash', 'Stone', 'Mill', 'Crow', 'Salt', 'Wind', 'Dun', 'Marrow', 'Elm', 'Grey'],
    b: ['ford', 'wick', 'holt', 'stead', 'mere', 'gate', 'by', 'wall'],
    staples: ['lantern', 'waterskin', 'salve', 'salve', 'tonic'],
    stock: 5,
    fuel: 8,
    fuelPrice: 2,
    innPrice: 5,
    appraisePrice: 4,
    sellRate: 0.4,
  },
  /* The quest is rolled too: who holds the key, what the locked place is, what lies in it, and where it must go. */
  quest: {
    keys: ['elder', 'beast', 'ruin'],
    vaults: [
      { id: 'castle', name: 'castle', guard: 'Hollow' },
      { id: 'barrow', name: 'barrow', guard: 'Barrow' },
      { id: 'temple', name: 'sunken temple', guard: 'Drowned' },
    ],
    relics: ['Ember', 'Lens', 'Horn', 'Crown', 'Bell'],
    dests: ['beacon', 'beacon', 'shrine'],
    beastNames: ['Old', 'Grey', 'Lame', 'One-Eyed'],
    floors: ['guard', 'loot', 'trap'],
  },
};
