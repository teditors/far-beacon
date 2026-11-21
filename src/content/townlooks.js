/* How towns look (commission 5): data for the view only, read by src/view/buildings.js; the rules never read it.
   A town is built of what its land offers (its climate), dressed by its trade (what stands in the streets and on the
   roofs) and coloured by its custom (banners, lanterns, flowers, fences). Colours are lists; each building picks one.
   climate:  walls     texture of the walls: plaster, stone, brick, wood, cloth (src/view/paint.js); wallMix and
             roofMix: the textures a house may be built with (each picks one, in one of three variants)
             wall      wall colours; timber: dark beams over plaster; plinth: a stone footing
             roof      gable, steep, hip, flat or dome; roofTex its texture; roofCol its colours; pitch: height for width
             storeys   storeys a house may have (one picked per house); outer: what a walled town's wall is
             ground    the colour of the streets
   trade:    props     things in the streets (see PROPS in buildings.js); chimneys: share of houses with one; smoke
             awning    colour of the awnings over shop fronts, or 'stripes'
   custom:   banners   colours of banners and pennants ('god' for the god's own colour); lanterns: how many street lamps
             flowers   window boxes; fences: yards fenced; tower: a watchtower on the hall; shrine: a steeple
   rare:     overrides on top of the rest (the unfallen build in the lost people's stone). */
export default {
  townLooks: {
    // the climates of the hand-made biomes (generated ones carry their own)
    biomeClimate: { salt: 'hot', moor: 'wet', taiga: 'cold' },
    climates: {
      hot: {
        wallMix: ['plaster', 'plaster', 'adobe', 'brick'],
        roofMix: ['plaster', 'adobe'],
        walls: 'plaster',
        wall: ['#dcbc8c', '#d0a878', '#e4cca4', '#c89870'],
        plinth: '#a88a64',
        roof: 'flat',
        roofTex: 'plaster',
        roofCol: ['#c4a074', '#b89466'],
        pitch: 0,
        storeys: [1, 1, 2],
        outer: 'mud',
        ground: '#c8ae88',
        trim: '#6e4e30',
      },
      temperate: {
        wallMix: ['plaster', 'plaster', 'brick', 'stone'],
        roofMix: ['thatch', 'thatch', 'tiles'],
        walls: 'plaster',
        wall: ['#ece2c8', '#e0d4b4', '#f0e8d8'],
        timber: '#4a3424',
        plinth: '#8a8478',
        roof: 'gable',
        roofTex: 'thatch',
        roofCol: ['#b8984e', '#a88a46', '#c4a45c'],
        pitch: 0.75,
        storeys: [1, 2, 2],
        outer: 'palisade',
        ground: '#8e8470',
        trim: '#5a4030',
      },
      wet: {
        wallMix: ['stone', 'rubble', 'stone'],
        roofMix: ['thatch', 'shingle'],
        walls: 'stone',
        wall: ['#9a968a', '#8a887e', '#a8a294'],
        plinth: '#6a6860',
        roof: 'steep',
        roofTex: 'thatch',
        roofCol: ['#8c7a48', '#7e6e40'],
        pitch: 1,
        storeys: [1, 1, 2],
        outer: 'stone',
        ground: '#7a7a6c',
        trim: '#4a3a2c',
      },
      cold: {
        wallMix: ['logs', 'wood', 'logs'],
        roofMix: ['shingle', 'tiles', 'shingle'],
        walls: 'wood',
        wall: ['#7c5c3c', '#6c4e32', '#86643e'],
        plinth: '#6a6a66',
        roof: 'steep',
        roofTex: 'tiles',
        roofCol: ['#4e4440', '#5a4c44'],
        pitch: 1.15,
        snow: true,
        storeys: [1, 1, 2],
        outer: 'palisade',
        ground: '#9a9a96',
        trim: '#3e2c1e',
      },
      ashen: {
        wallMix: ['stone', 'rubble', 'brick'],
        roofMix: ['tiles', 'shingle'],
        walls: 'stone',
        wall: ['#5c5854', '#4e4a48', '#646058'],
        plinth: '#3a3836',
        roof: 'hip',
        roofTex: 'tiles',
        roofCol: ['#3a3438', '#443c3e'],
        pitch: 0.6,
        storeys: [1, 2],
        outer: 'stone',
        ground: '#4e4a46',
        trim: '#2e2622',
      },
      steppe: {
        wallMix: ['cloth'],
        roofMix: ['cloth'],
        walls: 'cloth',
        wall: ['#d8c8a4', '#c8b48c', '#e0d0b0'],
        plinth: '#8a7a5a',
        roof: 'dome',
        roofTex: 'cloth',
        roofCol: ['#b8a07a', '#a88c66'],
        pitch: 0.5,
        storeys: [1],
        outer: 'palisade',
        ground: '#a89a70',
        trim: '#6a4a2e',
      },
    },
    trades: {
      smiths: { props: ['anvil', 'barrel', 'woodpile'], chimneys: 0.6, smoke: '#5a5654', awning: '#7a4a3a' },
      herbalists: { props: ['planter', 'planter', 'barrel'], chimneys: 0.2, awning: '#5a8a4a' },
      weavers: { props: ['clothline', 'clothline', 'crates'], chimneys: 0.2, awning: '#8a4a8a' },
      charcoal: { props: ['woodpile', 'kiln', 'woodpile'], chimneys: 0.5, smoke: '#3a3836', awning: '#4a4a44' },
      traders: { props: ['stall', 'crates', 'barrel', 'cart'], chimneys: 0.25, awning: 'stripes' },
    },
    customs: {
      hospitable: { banners: ['#c4503a', '#e0a040'], lanterns: 1.5, flowers: true },
      suspicious: { banners: ['#4a4a5a', '#5a3434'], lanterns: 0.5, fences: true, tower: true },
      pious: { banners: ['god', '#e8e0c8'], lanterns: 1, shrine: true },
      lore: { banners: ['#3a5a8a', '#d0b870'], lanterns: 1, stones: true },
      thrifty: { banners: [], lanterns: 0.6 },
    },
    rares: {
      unfallen: { walls: 'stone', lost: true },
      pilgrims: { wall: ['#f2eee2', '#ece6d6'], banners: ['god', '#f2eee2', '#e0c060'], flags: true },
    },
  },
};
