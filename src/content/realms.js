/* Other worlds: rarely (the `doors` world setting, about 1 world in 12 by default) a door stands in the land, and
   through it lies another world: made from a seed of its own, like the home world but stranger, with its rare traits
   rolled far more often. Very rarely there are two or three doors, each to a world of its own. The plot always uses a
   door: something it needs is on the other side (content/plots.js, `realm` places).

   A door is a site in a region of the home world and another in the other world; stepping through one brings you out
   of the other. Only the regions of the other world that you (or the plot) touch are ever made. */
export default {
  realms: {
    names: [
      'the Glass Country',
      'Underheaven',
      'the Hollow World',
      'the Land of Long Shadows',
      'Elsewhere',
      'the Mirror Marches',
      'the Country Behind the Sky',
      'the Ashen Reach',
    ],
    sizes: [
      [2, 3],
      [3, 3],
      [3, 4],
    ],
    genChance: 0.65, // a region of another world is one of its own generated countries (home: about half that)
    rareChance: 0.5, // a region of another world holds something strange (home: 0.15)
    moreDoors: 0.25, // a world with a door has a second (and then a third) this often
    town: true, // another world has one town, of its own strange people
    text: 'A door stands alone in the open, in a frame of old stone. Through it is another sky.',
    backText: 'The door you came through stands here, in its frame of old stone. Through it is the sky of home.',
  },
};
