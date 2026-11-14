/* Equipment slots. Gear works only while worn. */
import { depotHere } from './actions.js';
import { C, byId } from './core.js';
import { waterCap } from './stats.js';

/* Equipment: gear works only while worn. Containers and consumables have no slot. */
const slotOf = (it) => byId(C.bases, it.base).slot || null,
  active = (it) => !slotOf(it) || !!it.eq;
function slotFree(s, slot) {
  const cap = C.slots.find((x) => x[0] === slot)[2];
  return s.player.items.filter((i) => i.eq === slot).length < cap;
}
function equip(s, id) {
  const it = s.player.items.find((i) => i.id === id),
    sl = it && slotOf(it);
  if (!it || !sl || it.eq) return false;
  if (!slotFree(s, sl)) {
    const old = s.player.items.find((i) => i.eq === sl);
    delete old.eq;
  }
  it.eq = sl;
  fitWater(s);
  return true;
}
function unequip(s, id) {
  const it = s.player.items.find((i) => i.id === id);
  if (!it || !it.eq) return false;
  delete it.eq;
  fitWater(s);
  return true;
}
function fitWater(s) {
  if (s.player.water > waterCap(s)) {
    const spill = s.player.water - waterCap(s);
    s.player.water = waterCap(s);
    depotHere(s, true).water += spill;
  }
}
function autoEquip(s, it) {
  const sl = slotOf(it);
  if (sl && !it.eq && slotFree(s, sl)) it.eq = sl;
}

export { slotOf, active, slotFree, equip, unequip, fitWater, autoEquip };
