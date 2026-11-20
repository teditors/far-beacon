/* World settings: the choices on the "new world" screen, all plain data passed into newGame(seed, off, set) and kept in
   s.gen. Anything left out takes the default here, so a world made with no settings is an ordinary rolled world.
   The tests and the playtest bot use the same settings (SET='sky=1,doors=1' node tests/playtest.js). */
export default {
  worldSet: {
    defaults: {
      cols: 0, // regions across; 0 rolls the size from the seed (with rows)
      rows: 0,
      races: null, // ids of the races that may be offered; null for any
      classes: null,
      nRaces: 0, // how many races and classes a world offers; 0 rolls it
      nClasses: 0,
      towns: -1, // other towns besides the story's; -1 rolls it
      dungeons: 1, // how many dungeons, against the usual (0 for none, 2 for twice as many)
      depth: 4, // the most levels an ordinary dungeon goes down (plot dungeons may go deeper)
      sky: 0.25, // the chance that a world has places in the sky
      sea: 0.4, // the chance that a world has a sea (lakes come anyway)
      doors: 0.08, // the chance that a world has a door to another world
      maxDoors: 3, // the most doors a world can have, when it has any
      trouble: '', // the great trouble's kind; '' rolls it
    },
    // what the new world screen offers for each setting
    menus: {
      size: [
        ['', 'Rolled from the seed'],
        ['2x3', 'Small, 2 x 3'],
        ['3x3', 'Three by three'],
        ['4x4', 'Four by four'],
        ['5x5', 'Five by five'],
        ['3x7', 'Long, 3 x 7'],
        ['7x7', 'Vast, 7 x 7'],
      ],
      towns: [
        [-1, 'Rolled'],
        [0, 'Only the story town'],
        [1, 'One more'],
        [2, 'Two more'],
        [3, 'Three more'],
        [5, 'Five more'],
      ],
      dungeons: [
        [0, 'None but the locked place'],
        [0.5, 'Few'],
        [1, 'Usual'],
        [2, 'Many'],
      ],
      depth: [
        [1, 'One level'],
        [2, 'Two levels'],
        [4, 'Up to four (usual)'],
        [8, 'Up to eight'],
        [16, 'Up to sixteen'],
      ],
      sky: [
        [0, 'Never'],
        [0.1, 'Rarely'],
        [0.25, '1 world in 4 (usual)'],
        [0.6, 'Often'],
        [1, 'Always'],
      ],
      sea: [
        [0, 'Never'],
        [0.4, 'Sometimes (usual)'],
        [1, 'Always'],
      ],
      doors: [
        [0, 'Never'],
        [0.08, 'Rarely (usual)'],
        [0.4, 'Often'],
        [1, 'Always'],
      ],
      maxDoors: [
        [1, 'One at most'],
        [3, 'Up to three'],
      ],
    },
  },
};
