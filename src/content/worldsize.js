/* The size and shape of the world, rolled from the seed before any land is made. The world is a grid of regions that
   wraps round in both directions; a region is 36 x 36 tiles. Only the player's region and its eight neighbours are
   ever drawn, so a large world costs the phone nothing more to show: only its save grows with what you explore.
   cols, rows: [least, most] regions across and down. swap: the shape may be turned on its side. */
export default {
  worldSize: {
    shapes: [
      {
        id: 'small',
        name: 'A small world',
        w: 3,
        cols: [2, 3],
        rows: [3, 3],
        swap: true,
        text: 'the places of the story are close together, and the far country is never far',
      },
      {
        id: 'usual',
        name: 'An ordinary world',
        w: 5,
        cols: [3, 4],
        rows: [3, 4],
        text: 'a fair journey from one side to the other',
      },
      {
        id: 'long',
        name: 'A long world',
        w: 2,
        cols: [2, 3],
        rows: [5, 7],
        swap: true,
        text: 'a narrow land, short one way and long the other',
      },
      {
        id: 'broad',
        name: 'A broad world',
        w: 2,
        cols: [4, 5],
        rows: [4, 6],
        swap: true,
        text: 'wide country, with room for the far places to be truly far',
      },
      { id: 'vast', name: 'A vast world', w: 1, cols: [6, 7], rows: [6, 7], text: 'more land than one life can walk' },
    ],
    most: 49, // never more regions than this, whatever is rolled
  },
};
