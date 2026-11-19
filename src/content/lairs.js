/* Lairs: some regions away from home (chance each) hold a creature that is the only one of its kind, lying in a cave
   on a hoard. It is named like the beast of the quest, always elder, and guards its ground. */
export default {
  lairs: {
    chance: 0.35,
    names: ['Old', 'Grey', 'Lame', 'One-Eyed', 'Hollow', 'Last', 'Pale', 'Great'],
    hoard: { coin: [20, 40], items: 2 },
  },
};
