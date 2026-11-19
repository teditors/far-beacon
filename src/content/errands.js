/* Errands: work offered at the inn, one at a time, sending you into the country around home.
   Each kind is a template; {thing} {species} {site} {asite} {region} {dir} {victims} are filled in when it is offered.
   Now and then (liarChance) the one who asks is lying and will not pay: they always show a tell. */
export default {
  errands: {
    liarChance: 0.15,
    itemChance: 0.5, // an honest reward includes a good item this often
    givers: ['a carter', 'a widow', 'a tinker', 'a scribe', 'a herder', 'an old soldier', 'a miller', 'a ferryman'],
    tells: [
      'who will not meet your eye',
      'whose purse looks very thin',
      'who smiles a little too much',
      'who keeps glancing at the door',
    ],
    kinds: [
      {
        id: 'slay',
        text: '"A {species} has been taking {victims} out in the {region}, to the {dir}. Kill it, and I will pay you {reward} coin."',
        victims: ['goats', 'travellers', 'the post rider', 'my dogs', 'children, they say'],
        reward: [16, 26],
      },
      {
        id: 'fetch',
        text: '"My {thing} is in {asite} in the {region}, to the {dir}. Bring it back to me here and I will pay you {reward} coin."',
        things: ["brother's satchel", 'box of letters', "father's ledger", 'seed-corn', "mother's ring", 'bundle of deeds'],
        reward: [14, 22],
      },
      {
        id: 'find',
        text: '"Nobody has been to the {site} in the {region}, to the {dir}, in years. Go there, come back and tell me what you saw: {reward} coin."',
        reward: [10, 18],
      },
    ],
  },
};
