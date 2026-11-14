/* Creatures: forms, temperaments and the rare slot. */
export default {
  /* Creatures: a species is a form, a name drawn from the biome, a temperament and, rarely, something odd. */
  creature: {
    count: 7,
    speciesPerWorld: 3,
    rareChance: 0.12,
    forms: [
      {
        id: 'hound',
        name: 'Hound',
        hp: [6, 5],
        ac: 12,
        hit: 2,
        dice: [1, 6],
        xp: 30,
        text: 'Fast. Hard to flee from.',
        fleePenalty: 0.25,
      },
      { id: 'brute', name: 'Brute', hp: [12, 8], ac: 10, hit: 1, dice: [1, 10], xp: 45, text: 'Slow and heavy. Hits very hard.' },
      {
        id: 'wight',
        name: 'Wight',
        hp: [8, 6],
        ac: 11,
        hit: 2,
        dice: [1, 6],
        xp: 40,
        chill: 8,
        text: 'Its touch drains warmth.',
      },
      {
        id: 'serpent',
        name: 'Serpent',
        hp: [5, 4],
        ac: 13,
        hit: 3,
        dice: [1, 4],
        xp: 30,
        venom: 6,
        text: 'Its bite drains stamina.',
      },
    ],
    prefix: { salt: ['Salt', 'Dust', 'Sun'], moor: ['Bog', 'Mist', 'Heath'], taiga: ['Frost', 'Snow', 'Pine'] },
    tempers: [
      { id: 'hunter', text: 'It hunts: it will come for you from several tiles away.' },
      { id: 'territorial', text: 'It guards its ground: come close and it attacks.' },
      { id: 'skittish', text: 'It keeps to itself, and fights only if you walk into it.' },
    ],
    rares: [
      { id: 'elder', name: 'Elder', text: 'Old and strong: half again as tough.' },
      { id: 'gilded', name: 'Gilded', text: 'It carries something worth having.' },
      { id: 'docile', name: 'Docile', text: 'It will not fight at all.' },
    ],
  },
};
