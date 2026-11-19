/* The modifier stack (Lego rule 3). Every number passes through stat(). */
import { indoors } from './areas.js';
import { charMods } from './character.js';
import { C, biomeOf, byId, clock, godOf } from './core.js';
import { active } from './equipment.js';
import { itemAffixes, weight } from './items.js';
import { atCamp, groundHere, inShelter, phase } from './map.js';

/* Rule 3: every number passes through one modifier stack. A new feature is a new source. */
const SOURCES = [
  {
    id: 'gear',
    fn(s, out) {
      for (const it of s.player.items)
        if (active(it)) for (const m of byId(C.bases, it.base).mods || []) if (!m.needsFuel || s.player.fuel > 0) out.push(m);
    },
  },
  {
    id: 'affixes',
    fn(s, out) {
      for (const it of s.player.items) if (active(it)) for (const a of itemAffixes(it)) for (const m of a.mods) out.push(m);
    },
  },
  {
    id: 'biome',
    fn(s, out) {
      for (const m of phase(s).mods) out.push(m);
    },
  },
  {
    id: 'character',
    fn(s, out) {
      for (const m of charMods(s.char)) out.push(m);
    },
  },
  {
    id: 'terrain',
    fn(s, out) {
      for (const m of groundHere(s).mods) out.push(m);
    },
  },
  {
    id: 'weather',
    fn(s, out) {
      if (indoors(s)) return;
      if (s.weather.storm) for (const m of biomeOf(s).storm.mods) out.push(m);
    },
  },
  {
    id: 'gods',
    fn(s, out) {
      if (!s.pact) return;
      const d = clock(s).isDay ? 'day' : 'night';
      for (const m of godOf(s).mods) if (!m.when || m.when === d) out.push(m);
    },
  },
  {
    id: 'shelter',
    fn(s, out) {
      if (indoors(s)) out.push({ stat: 'waterDrain', op: 'mul', value: 0.7 }); // out of the sun and wind
      if (inShelter(s)) {
        out.push({ stat: 'cold', op: 'mul', value: 0.25 });
        out.push({ stat: 'stormCold', op: 'mul', value: 0 });
      }
      if (atCamp(s)) out.push({ stat: 'warm', op: 'add', value: 25 });
    },
  },
  {
    id: 'load',
    fn(s, out, ctx) {
      if (ctx.noLoad) return;
      const over = Math.max(0, weight(s) / carryCap(s) - 0.6);
      if (over > 0) {
        out.push({ stat: 'moveTime', op: 'mul', value: 1 + over });
        out.push({ stat: 'staminaCost', op: 'mul', value: 1 + over });
      }
    },
  },
];
function stat(s, name, base, ctx) {
  ctx = ctx || {};
  let add = 0,
    mul = 1,
    max = Infinity;
  for (const src of SOURCES) {
    if (s.off[src.id]) continue;
    const out = [];
    src.fn(s, out, ctx);
    for (const m of out)
      if (m.stat === name) {
        if (m.op === 'add') add += m.value;
        else if (m.op === 'mul') mul *= m.value;
        else if (m.op === 'max') max = Math.min(max, m.value);
      }
  }
  return Math.min((base + add) * mul, max);
}
const carryCap = (s) => Math.max(1, stat(s, 'carryCap', s.tun.carryCap, { noLoad: true }));
const waterCap = (s) => Math.max(0, stat(s, 'waterCap', 0, { noLoad: true }));

export { SOURCES, stat, carryCap, waterCap };
