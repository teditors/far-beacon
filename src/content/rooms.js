/* Rooms by use (commission 8): what more a room needs to look like what it is for. Read by src/rules/rooms.js; the
   new kinds, sizes and rooms are added to content/things.js's lists (content/index.js), so the Almanac and the view see
   them like any other.

   kinds, sizes, rooms   as in content/things.js: more furniture (a nightstand, a sideboard, pews, a washstand, a
                         cradle, a tall candlestand, vestments, the god's shrine on an altar) and more small things (a
                         candlestick, a ladle, a ledger, scales, a censer, offerings); what an abandoned house holds
                         (cobwebs, fallen plaster, fallen boards, shards); and rooms for a dwelling's dining room, a
                         temple's nave and vestry, and a library's stacks. A room may also have `far` (set against the
                         wall farthest from its door: an altar) and `rows` (set in rows across the room with an aisle up
                         the middle from the door: pews, the stacks' bookcases).
   plans      a dwelling's rooms by its wealth (0 poor, 1, 2 rich), the first by the door; as many as its size allows
   buildings  rooms for other kinds of building, where they differ from content/things.js
   near       where each small thing belongs: the furniture it is put on or beside, in order of liking
   floor      small things that stand on the floor against a wall (or by what they belong to), never on a table
   groups     what goes with a piece of furniture: [kind, chance, where] with where 'side' (the next tile along its
              wall), 'front' (the tile before it, facing it), 'on' (on its top), 'hearth' (on the floor in front of it)
   abandoned  an empty house: the share of its furniture gone (`gone`), what has come in (wall, small), and the chance
              that one thing has come through it whole (`keep`)
   icons      the god's shrine on a temple's altar, by its domain: a name, and the shape the view draws */
export default {
  roomsByUse: {
    kinds: [
      {
        id: 'nightstand',
        name: 'nightstand',
        fixed: true,
        wall: true,
        top: 0.62,
        grades: ['rough', 'wooden', 'inlaid'],
        gcol: ['#8a6a4a', '#7a5434', '#5a3424'],
      },
      {
        id: 'sideboard',
        name: 'sideboard',
        fixed: true,
        wall: true,
        top: 0.92,
        grades: ['plain', 'oak', 'carved'],
        gcol: ['#8a6a44', '#6a4a2c', '#4a2c1c'],
      },
      { id: 'pew', name: 'pew', fixed: true, top: 0.45, col: '#6a4a30' },
      { id: 'washstand', name: 'washstand', fixed: true, wall: true, top: 0.8, col: '#8a6a4a' },
      { id: 'cradle', name: 'cradle', fixed: true, wall: true, col: '#a07a4a' },
      { id: 'candlestand', name: 'tall candlestand', fixed: true, wall: true, col: '#6a5a40' },
      { id: 'robes', name: 'row of vestments', fixed: true, wall: true, col: '#e8e0d0' },
      { id: 'icon', name: 'shrine', fixed: true, col: '#c8a040' },
      { id: 'cobweb', name: 'cobweb', fixed: true, wall: true, col: '#d8d4cc' },
      { id: 'rubble', name: 'heap of fallen plaster', fixed: true, col: '#a8a090' },
      { id: 'planks', name: 'fallen boards', fixed: true, col: '#6a5a44' },
      { id: 'shards', name: 'shards of a pot', wt: 0.3, value: 0, col: '#a0604a' },
      {
        id: 'candlestick',
        name: 'candlestick',
        wt: 0.5,
        value: 2,
        grades: ['tin', 'brass', 'silver'],
        gcol: ['#9a9a9a', '#c8a040', '#d8d8e0'],
        gval: [1, 2, 5],
        old: 'tarnished',
      },
      { id: 'ladle', name: 'ladle', wt: 0.2, value: 1, col: '#5a5a60', old: 'rusted' },
      { id: 'ledger', name: 'ledger', wt: 0.8, value: 2, col: '#5a3a2a', old: 'mouldering' },
      { id: 'scales', name: 'pair of scales', wt: 1, value: 4, col: '#c8a040', old: 'tarnished' },
      { id: 'censer', name: 'censer', wt: 0.6, value: 3, col: '#b8a060', old: 'tarnished' },
      { id: 'offering', name: 'bowl of offerings', wt: 0.4, value: 1, col: '#c89050', old: 'mouldering' },
    ],
    sizes: {
      nightstand: [0.45, 0.4],
      sideboard: [1.4, 0.5],
      pew: [1.2, 0.42],
      washstand: [0.6, 0.45],
      cradle: [0.5, 0.9],
      candlestand: [0.35, 0.35],
      robes: [1.2, 0.3],
      icon: [0.4, 0.3],
      cobweb: [0.6, 0.05],
      rubble: [0.8, 0.7],
      planks: [1.2, 0.5],
    },
    rooms: {
      dining: {
        wall: [
          ['sideboard', 1],
          ['cupboard', 0.5],
          ['shelf', 0.4],
          ['tapestry', 0.3],
        ],
        middle: [
          ['table', 1],
          ['rug', 0.4],
        ],
        small: [
          ['plate', 3],
          ['cup', 3],
          ['bowl', 2],
          ['candle', 2],
          ['candlestick', 1],
          ['jug', 2],
          ['spoon', 2],
          ['knife', 1],
          ['bread', 1],
          ['vase', 0.5],
        ],
        n: 0.5,
      },
      nave: {
        far: [['altar', 1]],
        rows: [['pew', 1]],
        wall: [
          ['candlestand', 0.8],
          ['tapestry', 0.7],
          ['candlestand', 0.6],
        ],
        small: [
          ['candle', 4],
          ['holy', 1],
          ['censer', 1],
          ['offering', 1],
          ['book', 1],
        ],
        n: 0.3,
      },
      vestry: {
        wall: [
          ['robes', 1],
          ['cupboard', 1],
          ['chest', 0.8],
          ['shelf', 0.6],
        ],
        middle: [['table', 0.5]],
        small: [
          ['candle', 3],
          ['censer', 1],
          ['book', 2],
          ['scroll', 1],
          ['holy', 1],
          ['candlestick', 1],
        ],
        n: 0.45,
      },
      stacks: {
        rows: [['bookcase', 1]],
        wall: [
          ['bookcase', 1],
          ['bookcase', 0.7],
        ],
        middle: [['lectern', 0.6]],
        small: [
          ['book', 4],
          ['scroll', 3],
          ['map', 2],
          ['inkpot', 1],
          ['candle', 1],
        ],
        n: 0.4,
      },
    },
    plans: {
      0: ['living', 'sleeping', 'store', 'workroom'],
      1: ['living', 'kitchen', 'sleeping', 'workroom', 'store', 'sleeping'],
      2: ['living', 'dining', 'kitchen', 'sleeping', 'study', 'sleeping', 'store'],
    },
    buildings: {
      temple: ['nave', 'vestry'],
      mapmaker: ['study', 'stacks', 'living'],
    },
    near: {
      pot: ['hearth', 'stove', 'shelf'],
      kettle: ['hearth', 'stove'],
      pan: ['hearth', 'stove', 'shelf'],
      ladle: ['hearth', 'stove', 'table'],
      bowl: ['table', 'shelf', 'cupboard', 'sideboard'],
      plate: ['table', 'longtable', 'shelf', 'sideboard', 'cupboard'],
      cup: ['table', 'longtable', 'counter', 'shelf', 'sideboard'],
      jug: ['table', 'longtable', 'counter', 'sideboard', 'washstand'],
      spoon: ['table', 'longtable'],
      knife: ['table', 'bench_w'],
      bread: ['table', 'longtable', 'counter'],
      cheese: ['table', 'counter', 'shelf'],
      apple: ['table', 'counter', 'shelf'],
      fish: ['shelf', 'table', 'counter'],
      herbs: ['drying', 'shelf', 'table'],
      bottle: ['shelf', 'counter', 'cupboard'],
      hammer: ['bench_w', 'anvil', 'rack'],
      saw: ['bench_w'],
      tongs: ['anvil', 'forge'],
      horseshoe: ['bench_w', 'anvil'],
      chain: ['bench_w', 'rack'],
      spindle: ['wheel', 'loom', 'table'],
      yarn: ['wheel', 'loom', 'shelf'],
      book: ['bookcase', 'lectern', 'nightstand', 'table', 'shelf'],
      scroll: ['bookcase', 'table', 'lectern'],
      map: ['table', 'bookcase'],
      inkpot: ['table', 'lectern'],
      ledger: ['counter', 'table'],
      scales: ['counter'],
      candle: ['nightstand', 'table', 'longtable', 'altar', 'shelf', 'counter', 'sideboard'],
      candlestick: ['altar', 'sideboard', 'table', 'nightstand'],
      lamp: ['table', 'counter', 'shelf', 'nightstand'],
      holy: ['altar', 'nightstand', 'shelf'],
      censer: ['altar', 'table', 'shelf'],
      offering: ['altar'],
      comb: ['nightstand', 'washstand', 'chest'],
      mirror: ['nightstand', 'washstand', 'chest'],
      keepsake: ['nightstand', 'chest'],
      doll: ['bed', 'chest', 'cradle'],
      toy: ['chest', 'bed'],
      dice: ['table', 'longtable'],
      lute: ['bench', 'chest'],
      vase: ['sideboard', 'table', 'shelf', 'cupboard'],
      statuette: ['sideboard', 'shelf', 'bookcase'],
      painting: ['sideboard', 'shelf'],
      helmet: ['rack', 'chest'],
      shield: ['rack'],
      net: ['nets'],
      float: ['nets'],
    },
    floor: ['bucket', 'broom', 'basket', 'shovel', 'scythe', 'pick', 'drum', 'urn', 'shards', 'bones', 'skull'],
    groups: {
      hearth: [
        ['pot', 0.9, 'hearth'],
        ['kettle', 0.6, 'hearth'],
        ['woodstack', 0.6, 'side'],
        ['stool', 0.5, 'front'],
      ],
      stove: [
        ['kettle', 0.8, 'on'],
        ['woodstack', 0.5, 'side'],
      ],
      bed: [
        ['nightstand', 0.55, 'side'],
        ['chest', 0.35, 'side'],
      ],
      bench_w: [['stool', 0.75, 'front']],
      forge: [
        ['anvil', 0.8, 'front'],
        ['bucket', 0.7, 'hearth'],
      ],
      altar: [
        ['icon', 1, 'on'],
        ['candlestick', 0.9, 'on'],
        ['candlestick', 0.7, 'on'],
      ],
      counter: [
        ['scales', 0.6, 'on'],
        ['ledger', 0.6, 'on'],
      ],
      washstand: [['jug', 0.8, 'on']],
      sideboard: [['candlestick', 0.6, 'on']],
    },
    abandoned: {
      gone: 0.3,
      keep: 0.5,
      wall: [
        ['cobweb', 0.7],
        ['rubble', 0.5],
        ['planks', 0.4],
        ['cobweb', 0.4],
      ],
      small: [
        ['shards', 3],
        ['bones', 0.15],
      ],
    },
    icons: {
      water: 'a bowl of still water',
      heights: 'a cairn of mountain stones',
      night: 'a lidless eye',
      hearth: 'a brazier that is never let go out',
      road: 'a staff and a worn pair of sandals',
      war: 'a broken shield',
      harvest: 'a sheaf of the first grain',
      sight: 'an open eye',
    },
  },
};
