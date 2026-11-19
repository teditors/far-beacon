/* Rare regions: a region away from home is usually just its biome, but sometimes (chance) it holds something strange.
   mods  stat modifiers while you are anywhere in that region
   gen   what is done to the region when it is built: noCreatures, moreCreatures (how many more), springs ('sweet' or
         'foul', all of them except the sure one), richCaches (every cache holds an item, and more fuel and water) */
export default {
  regionRares: {
    chance: 0.15,
    list: [
      {
        id: 'glowing',
        name: 'Glowing',
        text: 'The ground here gives off a faint light at night: enough to see by.',
        mods: [{ stat: 'nightSight', op: 'add', value: 1, when: 'night' }],
      },
      {
        id: 'heavy',
        name: 'Heavy',
        text: 'The air is thick and the ground pulls at you: every step is harder work.',
        mods: [{ stat: 'staminaCost', op: 'mul', value: 1.3 }],
      },
      { id: 'sweet', name: 'Sweet-watered', text: 'Every spring here is sweet.', gen: { springs: 'sweet' } },
      { id: 'bitter', name: 'Bitter', text: 'Every spring here is foul, save one.', gen: { springs: 'foul' } },
      { id: 'empty', name: 'Silent', text: 'Nothing lives here. Not one creature.', gen: { noCreatures: true } },
      { id: 'teeming', name: 'Teeming', text: 'Creatures are everywhere here.', gen: { moreCreatures: 6 } },
      {
        id: 'sacred',
        name: 'Hallowed',
        text: 'An old peace lies on this country: rest here restores far more.',
        mods: [{ stat: 'restGain', op: 'mul', value: 1.5 }],
      },
      {
        id: 'parched',
        name: 'Parched',
        text: 'The air here dries you out: you need much more water.',
        mods: [{ stat: 'waterDrain', op: 'mul', value: 1.35 }],
      },
      { id: 'rich', name: 'Rich', text: 'Every cache here is full.', gen: { richCaches: true } },
      {
        id: 'hollow',
        name: 'Hollow',
        text: 'The wind never stops: storms here bite twice as hard.',
        mods: [{ stat: 'stormCold', op: 'mul', value: 2 }],
      },
    ],
  },
};
