/* The lost people of a world: five rolled traits, revealed one at a time. */
import { C, byId, emit, say } from './core.js';

/* The people of this world: five trait ids in state, resolved against CONTENT.civ. */
const AXES = ['habit', 'age', 'style', 'affinity', 'doom'];
const trait = (s, axis) => byId(C.civ[axis], s.civ[axis]);
function civOf(s) {
  const h = trait(s, 'habit'),
    a = trait(s, 'age'),
    d = trait(s, 'doom');
  return {
    name: 'the ' + s.civ.name,
    ruin: h.ruin,
    search: {
      hours: Math.max(0.5, ((h.hours || 1) + (a.hoursAdd || 0) + (d.hoursAdd || 0)) * (a.hoursMul || 1) * (d.hoursMul || 1)),
      items: (h.items || 0) + (a.itemsAdd || 0) + (d.itemsAdd || 0),
      stamina: (h.stamina || 0) + (d.staminaAdd || 0),
      water: h.water || 0,
      fuel: (h.fuel || 0) + (d.fuel || 0),
      reveal: h.reveal || 0,
      roads: !!h.roads,
      itemChance: a.itemChance || 1,
      relic: !!a.relic,
      burn: d.burn || 0,
      noConsumables: !!d.noConsumables,
      trap: d.trap || 0,
      bonusConsumable: d.bonusConsumable || 0,
      foulWater: !!d.foulWater,
    },
  };
}
function traitText(axis, id) {
  const e = byId(C.civ[axis], id);
  if (axis === 'style')
    return {
      label: e.label,
      text:
        'Their craft ran to ' +
        e.favors
          .map((f) => {
            const n = byId(C.bases, f).name.toLowerCase();
            return n + (n.endsWith('s') ? 'es' : 's');
          })
          .join(', ') +
        '.',
    };
  if (axis === 'affinity') return { label: 'Sign of the ' + e.name, text: e.text };
  return { label: e.label, text: (e.sign ? e.sign + ' ' : '') + e.text };
}
const civTraits = (s) =>
  AXES.map((axis) => Object.assign({ axis, id: s.civ[axis], known: !!s.civKnown[axis] }, traitText(axis, s.civ[axis])));
function learn(s, axis) {
  if (s.civKnown[axis]) return;
  s.civKnown[axis] = true;
  const t = traitText(axis, s.civ[axis]);
  say(
    s,
    {
      habit: 'Ruins of the ' + s.civ.name + ', ' + t.label.toLowerCase() + '. ',
      age: t.label + '. ',
      style: 'The ' + s.civ.name + ' were ' + t.label.toLowerCase() + '. ',
      affinity: 'Their sign is the ' + trait(s, 'affinity').name + '. ',
      doom: 'Their end: ' + t.label.toLowerCase() + '. ',
    }[axis] + t.text,
    'good',
  );
  emit(s, 'learned', { axis, id: s.civ[axis] });
}

export { AXES, trait, civOf, traitText, civTraits, learn };
