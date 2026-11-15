/* Characters: rolling, race and class, setting out, and the next traveller after a death. */
import { areaRec, forgetMaps, inOverworld, toOverworld, worldPos } from './areas.js';
import { C, START, W, byId, clock, idx, say } from './core.js';
import { autoEquip } from './equipment.js';
import { describeMods, makeItem } from './items.js';
import { dirTo, here, reveal } from './map.js';
import { amod, manaMax } from './progress.js';
import { waterCap } from './stats.js';

/* Characters */
function rollAbilities(rnd) {
  const o = {};
  for (const a of C.abilities) {
    const d = [0, 0, 0, 0].map(() => 1 + Math.floor(rnd() * 6)).sort((x, y) => x - y);
    o[a.id] = d[1] + d[2] + d[3];
  }
  return o;
}
const nameFor = (rnd, raceId) => {
  const n = byId(C.races, raceId).names;
  return n[Math.floor(rnd() * n.length)];
};
function makeChar(rnd, s) {
  const race = s.offer.races[Math.floor(rnd() * s.offer.races.length)],
    cls = s.offer.classes[Math.floor(rnd() * s.offer.classes.length)];
  return { name: nameFor(rnd, race), race, cls, abil: rollAbilities(rnd) };
}
function scores(ch) {
  const adj = byId(C.races, ch.race).adj,
    o = {};
  for (const a of C.abilities) o[a.id] = ch.abil[a.id] + (adj[a.id] || 0);
  return o;
}
function charMods(ch) {
  const sc = scores(ch);
  let m = [];
  for (const a of C.abilities) m = m.concat(a.mods(sc[a.id]));
  return m.concat(byId(C.races, ch.race).mods, byId(C.classes, ch.cls).mods);
}
const charTitle = (ch) =>
  ch.name + ' the ' + byId(C.races, ch.race).name.toLowerCase() + ' ' + byId(C.classes, ch.cls).name.toLowerCase();
function charSheet(ch) {
  const sc = scores(ch),
    adj = byId(C.races, ch.race).adj;
  return C.abilities.map((a) => ({
    id: a.id,
    name: a.name,
    score: sc[a.id],
    adj: adj[a.id] || 0,
    text: describeMods(a.mods(sc[a.id])) || 'no effect',
    does: a.does,
  }));
}
function spawn(s, ch) {
  s.char = ch;
  s.player = {
    x: s.start.x,
    y: s.start.y,
    water: 0,
    warmth: 100,
    stamina: 100,
    fuel: 2,
    items: [makeItem(s, 'waterskin', null, null, true), makeItem(s, 'waterskin', null, null, true)],
  };
  for (const k of byId(C.classes, ch.cls).kit) {
    const it = makeItem(s, k, null, null, true);
    if (it.effect !== undefined) it.known = true;
    s.player.items.push(it);
    autoEquip(s, it);
  }
  {
    const p = s.player;
    p.level = 1;
    p.xp = 0;
    p.hpMax = Math.max(8, byId(C.classes, ch.cls).hd + amod(scores(ch).con) + 4);
    p.hp = p.hpMax;
    p.manaMax = manaMax(s);
    p.mana = p.manaMax;
  }
  s.combat = null;
  s.player.coin = 10;
  s.pact = null;
  s.warn = {};
  s.cause = null;
  s.over = null;
  s.lastGround = 0;
  s.onRoad = false;
  s.player.water = Math.min(6, waterCap(s));
  s.sites[idx(s.start.x, s.start.y)].seen = true;
  reveal(s, s.start.x, s.start.y, 2, true);
}
function setCharacter(s, ch) {
  spawn(s, ch);
  say(s, charTitle(ch) + ' sets out.', 'good');
  return true;
}
const livesLeft = (s) => Math.max(0, s.tun.lives - s.travellers);
function nextTraveller(s, ch) {
  // the world goes on: the dead traveller's goods and map stay where they fell
  if (!s.over || s.over.won || livesLeft(s) <= 0) return false;
  const p = s.player,
    i = here(s),
    d = s.depots[i] || (s.depots[i] = { water: 0, fuel: 0, items: [] });
  d.water += p.water;
  d.fuel += p.fuel;
  for (const it of p.items) {
    delete it.eq;
    d.items.push(it);
  }
  d.remains = s.char.name;
  d.coin = (d.coin || 0) + p.coin;
  s.lostMaps[i] = s.seen.join('');
  const diedIn = areaRec(s),
    inside = !inOverworld(s),
    where = worldPos(s);
  forgetMaps(s);
  toOverworld(s);
  const mod = (START + s.time) % 1440;
  s.time += (1440 + 360 - mod) % 1440 || 1440;
  s.travellers++;
  spawn(s, ch);
  say(
    s,
    'Dawn, day ' +
      clock(s).day +
      '. ' +
      charTitle(ch) +
      ' sets out from the well. ' +
      d.remains +
      (inside
        ? ' lies somewhere ' +
          (diedIn.kind === 'town' ? 'in ' + s.town.name : 'inside the ' + s.quest.vault.name) +
          ', to the ' +
          dirTo(s, where.x, where.y)
        : ' lies somewhere to the ' + dirTo(s, where.x, where.y)) +
      ', with everything they carried.',
    'good',
  );
  return true;
}

export {
  rollAbilities,
  nameFor,
  makeChar,
  scores,
  charMods,
  charTitle,
  charSheet,
  spawn,
  setCharacter,
  livesLeft,
  nextTraveller,
};
