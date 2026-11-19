/* Creature specials: a second slot on a species, besides its form. Half of all species have one. Fields the rules read:
   ac (armor +), hpMul, chill (warmth lost per hit), venom (stamina lost per hit), steal (water spilled per hit),
   regen (hit points back each round), attacks (blows per round), nightOnly (hunts and guards only at night),
   fleesAt (runs off when its hit points fall below this share), coin (extra coin when killed), fleePenalty */
export default {
  specials: {
    chance: 0.5,
    list: [
      { id: 'plated', text: 'It is plated like a beetle: hard to hit.', ac: 3 },
      { id: 'thief', text: 'It goes for your water: every hit spills some.', steal: 1 },
      { id: 'regen', text: 'Its wounds close as you watch.', regen: 2 },
      { id: 'twice', text: 'It strikes twice, quick and light.', attacks: 2, hpMul: 0.75 },
      { id: 'nocturnal', text: 'It hunts only by night. By day it sleeps.', nightOnly: true },
      { id: 'frost', text: 'Its touch is ice.', chill: 10 },
      { id: 'venom', text: 'Its bite saps your strength.', venom: 8 },
      { id: 'swift', text: 'It is very fast: almost impossible to outrun.', fleePenalty: 0.3 },
      { id: 'coward', text: 'It is a coward: badly hurt, it runs.', fleesAt: 0.35 },
      { id: 'hoarder', text: 'It hoards coin in its lair.', coin: 15 },
      { id: 'huge', text: 'It is huge: twice as hard to kill.', hpMul: 2 },
    ],
  },
};
