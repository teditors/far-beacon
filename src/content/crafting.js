/* Crafting: what the land gives, and what you can make of it on the road. Survival first: every recipe is something
   that keeps you alive or gets you further. Wood is your fuel; the rest are materials carried in the pack.
   mats: what each material is and weighs. sources: where they come from. recipes: needs (materials, and 'fuel' for
   wood), the minutes it takes, and what it makes (an item base, or a shelter built where you stand). */
export default {
  crafting: {
    mats: [
      { id: 'hide', name: 'Hide', wt: 0.5, value: 2, text: 'From a kill. Leather, waterskins, a warm cloak.' },
      { id: 'bone', name: 'Bone', wt: 0.3, value: 1, text: 'From a kill, or a cave floor. Spear points, needles, pegs.' },
      { id: 'salvage', name: 'Salvage', wt: 0.4, value: 2, text: 'Cloth, cord, nails and pitch from ruins and caches.' },
      {
        id: 'herbs',
        name: 'Herbs',
        wt: 0.1,
        value: 2,
        text: 'Gathered with wood where things grow. Bandages, salves, draughts.',
      },
    ],
    // what a kill leaves, by the creature's form
    kills: { hound: { hide: 1 }, brute: { hide: 1, bone: 1 }, wight: { bone: 2 }, serpent: { hide: 1 } },
    search: { ruin: { salvage: 2 }, cache: { salvage: 1 }, cave: { bone: 1 } },
    herbChance: 0.5, // each time you gather wood
    recipes: [
      { id: 'waterskin', name: 'Waterskin', needs: { hide: 2 }, mins: 40, makes: 'waterskin', text: 'Carry 3 more water.' },
      {
        id: 'torch',
        name: 'Torch',
        needs: { fuel: 1, salvage: 1 },
        mins: 15,
        makes: 'torch',
        text: 'Light for 8 hours: enough for the locked place without a lantern.',
      },
      {
        id: 'bandage',
        name: 'Bandages',
        needs: { herbs: 1, salvage: 1 },
        mins: 20,
        makes: 'bandage',
        text: 'Bind a wound: 6 health, even in a fight.',
      },
      {
        id: 'salve',
        name: 'Healing Salve',
        needs: { herbs: 2, fuel: 1 },
        mins: 30,
        makes: 'salve',
        text: 'Boiled down over a fire: 10 health.',
      },
      {
        id: 'draught',
        name: 'Warming Draught',
        needs: { herbs: 1, fuel: 1 },
        mins: 20,
        makes: 'draught',
        text: 'A hot bitter brew: 40 warmth.',
      },
      {
        id: 'furcloak',
        name: 'Fur Cloak',
        needs: { hide: 3, bone: 1 },
        mins: 90,
        makes: 'furcloak',
        text: 'The cold bites half as hard. For the high and frozen country.',
      },
      { id: 'hideboots', name: 'Hide Boots', needs: { hide: 2 }, mins: 45, makes: 'boots', text: 'Walking tires you less.' },
      {
        id: 'spear',
        name: 'Bone Spear',
        needs: { bone: 2, fuel: 1 },
        mins: 45,
        makes: 'spear',
        text: 'A weapon, if you have none better.',
      },
      {
        id: 'shelter',
        name: 'Shelter',
        needs: { fuel: 3, hide: 1 },
        mins: 60,
        makes: 'shelter',
        text: 'A hide-roofed lean-to where you stand: shelter from storms, and to sleep in, for as long as you need it.',
      },
    ],
    bases: [
      { id: 'torch', name: 'Torch', wt: 0.5, w: 0, consumable: true, plain: true, use: { light: 8 }, value: 3 },
      { id: 'bandage', name: 'Bandages', wt: 0.2, w: 0, consumable: true, plain: true, use: { hp: 6 }, value: 4 },
      {
        id: 'furcloak',
        slot: 'cloak',
        name: 'Fur Cloak',
        wt: 3,
        w: 0,
        mods: [{ stat: 'cold', op: 'mul', value: 0.5 }],
        value: 16,
      },
    ],
  },
};
