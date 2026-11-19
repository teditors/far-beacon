/* What the relic does while you carry it, by the first word of its name (the relic names are in quest.js). */
export default {
  relicNatures: {
    Ember: {
      text: 'It is warm in your hands: the cold bites half as hard while you carry it.',
      mods: [{ stat: 'cold', op: 'mul', value: 0.5 }],
    },
    Lens: {
      text: 'Through it the dark is clear and the land is near: you see at night, and further when you survey.',
      mods: [
        { stat: 'nightSight', op: 'add', value: 1 },
        { stat: 'surveyRadius', op: 'add', value: 3 },
      ],
    },
    Horn: {
      text: 'It sounds when you strike, and whatever you fight falters: to hit +2, damage +1.',
      mods: [
        { stat: 'hit', op: 'add', value: 2 },
        { stat: 'dmg', op: 'add', value: 1 },
      ],
    },
    Crown: {
      text: 'It is heavy, and it guards whoever bears it: armor +2, but every step costs more.',
      mods: [
        { stat: 'ac', op: 'add', value: 2 },
        { stat: 'staminaCost', op: 'mul', value: 1.2 },
      ],
    },
    Bell: {
      text: 'Its faint note keeps creatures from hunting you while you carry it.',
      mods: [{ stat: 'quiet', op: 'add', value: 1 }],
    },
  },
};
