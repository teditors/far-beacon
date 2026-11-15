/* The rolled quest, the town and the locked place. */
import { depotHere, restHour } from './actions.js';
import { AXES, learn, traitText } from './civ.js';
import { makeCreature, spOf, startCombat } from './combat.js';
import { C, H, W, byId, clamp, clock, idx, say, srand } from './core.js';
import { autoEquip, fitWater } from './equipment.js';
import { genItem, isCursed, itemName, makeItem } from './items.js';
import { dirFrom, dirTo, reveal, siteHere, sightRadius } from './map.js';
import { allMaps, areaRec, enterArea, homePos, inOverworld, leaveArea, worldMap, worldPos } from './areas.js';
import { gainXp, roll } from './progress.js';
import { stat } from './stats.js';
import { advance } from './systems.js';

/* Quest, town and vault */
const hasItem = (s, base) => s.player.items.some((i) => i.base === base);
const atTown = (s) => s.area === 'town';
// Mark a place on the overworld map, wherever the player happens to be standing.
function mark(s, x, y) {
  const m = worldMap(s);
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const xx = x + i,
        yy = y + j;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H) m.seen[idx(xx, yy)] = 1;
    }
  const st = m.sites[idx(x, y)];
  if (st) st.seen = true;
}
// Quest places are on the overworld, whichever area the player is in.
function findSite(s, kind) {
  const m = worldMap(s);
  for (const k in m.sites) if (m.sites[k].kind === kind) return { x: k % W, y: Math.floor(k / W), st: m.sites[k] };
  return null;
}
function findHere(s, kind) {
  for (const k in s.sites) if (s.sites[k].kind === kind) return { x: k % W, y: Math.floor(k / W), st: s.sites[k] };
  return null;
}
function itemValue(it) {
  const b = byId(C.bases, it.base);
  if (b.quest || b.id === 'campkit') return 0;
  let v = C.value[it.base] || 5;
  for (const id of [it.pre, it.suf]) if (id) v += byId(C.affixes, id).cursed ? -4 : 8;
  if (it.mark) v += 6;
  return Math.max(1, v);
}
function makeQuest(s, r, townP, vaultP, a0, goalP) {
  const Q = C.quest,
    T = C.town,
    pick = (a) => a[Math.floor(r() * a.length)];
  const race = pick(C.races),
    q = (s.quest = {
      key: pick(Q.keys),
      vault: pick(Q.vaults),
      relic: pick(Q.relics) + ' of the ' + s.civ.name,
      dest: pick(Q.dests),
      told: false,
      keyTile: null,
      beast: null,
    });
  s.town = {
    x: townP.x,
    y: townP.y,
    name: pick(T.a) + pick(T.b),
    race: race.id,
    elder: pick(race.names),
    merchant: pick(race.names),
    fuel: T.fuel,
    stock: [],
    speech: [],
  };
  while (s.town.merchant === s.town.elder) s.town.merchant = pick(race.names);
  for (const b of T.staples) s.town.stock.push(makeItem(s, b, null, null, true));
  for (let i = 0; i < T.stock; i++) {
    const it = genItem(s, { noConsumables: i < 3 });
    it.known = true;
    s.town.stock.push(it);
  }
  if (q.dest === 'shrine') {
    for (const k in s.sites) if (s.sites[k].kind === 'shrine') delete s.sites[k]; // the shrine stands near where the beacon would have been
    for (let tries = 0; tries < 80; tries++) {
      const x = clamp(goalP.x + Math.round((r() - 0.5) * 8), 1, W - 2),
        y = clamp(goalP.y + Math.round((r() - 0.5) * 8), 1, H - 2),
        k = idx(x, y),
        d = Math.abs(x - goalP.x) + Math.abs(y - goalP.y);
      if (d < 3 || s.terrain[k] === 2 || s.terrain[k] >= 4 || s.sites[k]) continue;
      s.sites[k] = { kind: 'shrine' };
      break;
    }
  }
  const f = pick(C.creature.forms.filter((x) => x.id !== 'hound'));
  s.species.push({ name: q.vault.guard + ' ' + f.name, form: f.id, temper: 'territorial', rare: null, met: false });
  q.guardSp = s.species.length - 1;
  if (q.key === 'ruin') {
    let best = null,
      bd = 1e9;
    for (const k in s.sites)
      if (s.sites[k].kind === 'ruin') {
        const d = Math.abs((k % W) - vaultP.x) + Math.abs(Math.floor(k / W) - vaultP.y);
        if (d >= 4 && d < bd) {
          bd = d;
          best = +k;
        }
      }
    if (best === null) q.key = 'elder';
    else q.keyTile = best;
  }
  if (q.key === 'beast') {
    const bf = pick(C.creature.forms);
    s.species.push({
      name: pick(Q.beastNames) + ' ' + pick(C.creature.prefix[s.biome]) + ' ' + bf.name,
      form: bf.id,
      temper: 'territorial',
      rare: 'elder',
      met: false,
      named: true,
    });
    let x = 0,
      y = 0;
    for (let tries = 0; tries < 60; tries++) {
      const ang = a0 + Math.PI + (r() - 0.5) * 1.2,
        rad = 8 + r() * 4;
      x = clamp(Math.round(s.start.x + Math.cos(ang) * rad), 2, W - 3);
      y = clamp(Math.round(s.start.y + Math.sin(ang) * rad), 2, H - 3);
      if (s.terrain[idx(x, y)] !== 2 && !s.sites[idx(x, y)]) break;
    }
    const c = makeCreature(s, 90, s.species.length - 1, x, y, 1);
    c.key = true;
    s.creatures.push(c);
    q.beast = 90;
  }
}
// Where a key or relic lies when nobody is carrying it: { area, x, y, who }.
function findLoose(s, base) {
  for (const [area, m] of allMaps(s))
    for (const k in m.depots)
      if (m.depots[k].items.some((i) => i.base === base))
        return { area, x: k % W, y: Math.floor(k / W), who: m.depots[k].remains };
  return null;
}
function objective(s) {
  const q = s.quest,
    t = s.town,
    v = findSite(s, 'vault'),
    wp = worldPos(s),
    toWorld = (p) => dirFrom(wp, p.x, p.y),
    toHere = (p) => dirTo(s, p.x, p.y),
    vaultName = q.vault.name,
    inVault = areaRec(s).kind === 'vault';
  const loose = (base, what) => {
    const l = findLoose(s, base);
    if (!l) return null;
    const from = l.who ? ' from ' + l.who + "'s body" : '';
    if (l.area === s.area) return { text: 'Take ' + what + from, dir: toHere(l) };
    if (s.areas[l.area].kind === 'region') return { text: 'Take ' + what + from, dir: toWorld(homePos(s, l.area, l.x, l.y)) };
    const deeper = s.areas[l.area].kind === 'vault' && (!inVault || s.areas[l.area].level > areaRec(s).level);
    if (inVault && deeper) {
      const st = findHere(s, 'stairsDown');
      return { text: 'Go deeper for ' + what, dir: st && st.st.seen ? toHere(st) : null };
    }
    if (inVault) return { text: 'Go back up for ' + what, dir: null };
    return { text: 'Go into the ' + vaultName + ' for ' + what + from, dir: toWorld(v) };
  };
  if (!hasItem(s, 'relic')) {
    const lr = loose('relic', 'the ' + q.relic);
    if (lr && (findLoose(s, 'relic').who || !inVault || findLoose(s, 'relic').area === s.area)) return lr;
  }
  if (!hasItem(s, 'key') && !hasItem(s, 'relic') && !v.st.open) {
    const lk = loose('key', 'the key to the ' + vaultName);
    if (lk) return lk;
  }
  if (hasItem(s, 'relic')) {
    const d = q.dest === 'beacon' ? s.goal : findSite(s, 'shrine');
    if (inVault) {
      const up = findHere(s, areaRec(s).level === 1 ? 'exit' : 'stairsUp');
      return { text: 'Carry the ' + q.relic + ' out of the ' + vaultName, dir: up ? toHere(up) : null };
    }
    return { text: 'Carry the ' + q.relic + ' to the ' + q.dest, dir: toWorld(d) };
  }
  if (inVault) {
    const st = findHere(s, 'stairsDown');
    return { text: 'Find the way down', dir: st && st.st.seen ? toHere(st) : null };
  }
  if (v.st.open || hasItem(s, 'key'))
    return { text: (v.st.open ? 'Go down into the ' : 'Unlock the ') + vaultName, dir: q.told || v.st.seen ? toWorld(v) : null };
  if (!q.told)
    return {
      text: s.area === 'town' ? 'Talk to the elder' : 'Find the town',
      dir: s.area === 'town' ? toHere(findHere(s, 'elder')) : toWorld(t),
    };
  if (q.key === 'beast') {
    const c = worldMap(s).creatures.find((x) => x.id === q.beast);
    return c
      ? { text: 'Kill the ' + spOf(s, c).name + ', which has the key', dir: toWorld(c) }
      : { text: 'Take the key from the lair', dir: null };
  }
  if (q.key === 'ruin')
    return { text: 'Search the ruin where the key lies', dir: toWorld({ x: q.keyTile % W, y: Math.floor(q.keyTile / W) }) };
  return { text: 'Find the key to the ' + vaultName, dir: null };
}
function talkElder(s) {
  if (s.over || !atTown(s)) return false;
  const q = s.quest,
    t = s.town,
    v = findSite(s, 'vault'),
    sp = (t.speech = []);
  if (!q.told) {
    q.told = true;
    mark(s, v.x, v.y);
    const d = q.dest === 'beacon' ? s.goal : findSite(s, 'shrine');
    mark(s, d.x, d.y);
    const wm = worldMap(s);
    for (const k in wm.sites)
      if (wm.sites[k].sure) {
        wm.sites[k].known = true;
        mark(s, k % W, Math.floor(k / W));
      }
    sp.push(
      '"You came across the open ground alone? Then listen. ' +
        (q.dest === 'beacon'
          ? 'The beacon is dying. It was lit with'
          : 'The shrine has stood empty since the ' + s.civ.name + ' took from it') +
        ' the ' +
        q.relic +
        ', and the ' +
        s.civ.name +
        ' locked that away in the ' +
        q.vault.name +
        ' before the end."',
    );
    sp.push(
      '"Bring it out, and carry it to the ' +
        q.dest +
        '. I have marked both on your map, and the springs our people use on the way."',
    );
    if (q.key === 'elder') {
      const k = makeItem(s, 'key', null, null, true);
      k.label = 'Key to the ' + q.vault.name;
      s.player.items.push(k);
      sp.push('"Here is the key. We have kept it three generations, and not one of us has dared use it."');
    } else if (q.key === 'beast') {
      const c = worldMap(s).creatures.find((x) => x.id === q.beast);
      if (c) {
        c.seen = true;
        mark(s, c.x, c.y);
        sp.push(
          '"The key is gone. The ' + spOf(s, c).name + ' took the last warden, key and all. Its lair is marked too. I am sorry."',
        );
      }
    } else {
      mark(s, q.keyTile % W, Math.floor(q.keyTile / W));
      sp.push('"The key was buried with the last warden, in a ruin of theirs. I have marked that as well."');
    }
    const left = AXES.filter((a) => !s.civKnown[a]);
    if (left.length) {
      const ax = left[Math.floor(srand(s) * left.length)],
        tx = traitText(ax, s.civ[ax]);
      s.known.civ = true;
      learn(s, ax);
      sp.push('"What else do we remember of the ' + s.civ.name + '? Only this: ' + tx.label.toLowerCase() + '. ' + tx.text + '"');
    }
    gainXp(s, 30);
    say(s, t.elder + ', elder of ' + t.name + ', tells you what this land needs. Your goal is under the meters.', 'good');
  } else {
    const o = objective(s);
    sp.push('"' + o.text + (o.dir && o.dir !== 'here' ? ', to the ' + o.dir : '') + '. Nothing has changed, traveller."');
  }
  return true;
}
function buy(s, id) {
  if (s.over || !atTown(s)) return false;
  const t = s.town,
    i = t.stock.findIndex((x) => x.id === id);
  if (i < 0) return false;
  const price = itemValue(t.stock[i]);
  if (s.player.coin < price) {
    say(s, 'You cannot afford that.');
    return false;
  }
  s.player.coin -= price;
  const it = t.stock.splice(i, 1)[0];
  s.player.items.push(it);
  autoEquip(s, it);
  say(s, 'You buy the ' + itemName(it) + ' for ' + price + ' coin.');
  return true;
}
function buyFuel(s) {
  const t = s.town;
  if (s.over || !atTown(s) || t.fuel < 1) return false;
  if (s.player.coin < C.town.fuelPrice) {
    say(s, 'You cannot afford that.');
    return false;
  }
  s.player.coin -= C.town.fuelPrice;
  t.fuel--;
  s.player.fuel += 1;
  return true;
}
const sellPrice = (it) => (itemValue(it) ? (it.known ? Math.max(1, Math.floor(itemValue(it) * C.town.sellRate)) : 3) : 0);
function sell(s, id) {
  if (s.over || !atTown(s)) return false;
  const i = s.player.items.findIndex((x) => x.id === id);
  if (i < 0) return false;
  const it = s.player.items[i],
    price = sellPrice(it);
  if (!price) {
    say(s, 'No one here will buy that.');
    return false;
  }
  s.player.items.splice(i, 1);
  delete it.eq;
  it.known = true;
  s.town.stock.push(it);
  s.player.coin += price;
  fitWater(s);
  say(s, 'You sell the ' + itemName(it) + ' for ' + price + ' coin.');
  return true;
}
function appraise(s, id) {
  if (s.over || !atTown(s)) return false;
  const it = s.player.items.find((x) => x.id === id);
  if (!it || it.known) return false;
  if (s.player.coin < C.town.appraisePrice) {
    say(s, 'You cannot afford that.');
    return false;
  }
  s.player.coin -= C.town.appraisePrice;
  it.known = true;
  say(s, s.town.merchant + ' turns it over twice: ' + itemName(it) + '.', isCursed(it) ? 'bad' : 'good');
  return true;
}
function inn(s) {
  if (s.over || !atTown(s)) return false;
  if (s.player.coin < C.town.innPrice) {
    say(s, 'You cannot afford a bed.');
    return false;
  }
  s.player.coin -= C.town.innPrice;
  const p = s.player,
    w = p.water;
  for (let i = 0; i < 8 && !s.over; i++) restHour(s);
  if (s.over) return true;
  p.water = Math.max(p.water, w);
  p.hp = p.hpMax;
  p.mana = p.manaMax;
  p.stamina = 100;
  p.warmth = 100;
  say(s, 'A bed, a fire and a meal. You wake whole.', 'good');
  return true;
}
function unlock(s) {
  const st = siteHere(s);
  if (s.over || !st || st.kind !== 'vault' || st.open) return false;
  if (!hasItem(s, 'key')) {
    say(s, 'The door of the ' + s.quest.vault.name + ' is locked, and will not be forced.');
    return false;
  }
  st.open = true;
  gainXp(s, 20);
  say(s, 'The key turns. Cold air comes up the stair.', 'good');
  return true;
}
/* Going in and out of places */
function enterTown(s) {
  const st = siteHere(s);
  if (s.over || !st || st.kind !== 'town') return false;
  enterArea(s, 'town', { kind: 'town', indoor: true, name: s.town.name });
  if (!st.entered) {
    st.entered = true;
    gainXp(s, 20);
  }
  say(
    s,
    'You pass the gate of ' +
      s.town.name +
      '.' +
      (s.quest.told ? '' : ' The elder will be at the hall on the north side of the square.'),
  );
  return true;
}
const vaultLevelId = (n) => 'vault' + n;
function enterVault(s) {
  const st = siteHere(s);
  if (s.over || !st || st.kind !== 'vault' || !st.open) return false;
  if (stat(s, 'nightSight', 0) <= 0) {
    say(s, 'It is black as pitch inside. You need a light: a worn lantern with fuel will do.', 'bad');
    return false;
  }
  goToLevel(s, 1, st.floors);
  say(s, 'You go down into the ' + s.quest.vault.name + '. Level 1 of ' + st.floors.length + '.');
  return true;
}
function goToLevel(s, n, floors) {
  const id = vaultLevelId(n);
  enterArea(s, id, { kind: 'vault', indoor: true, dark: true, level: n, levels: floors.length, floor: floors[n - 1] });
  reveal(s, s.player.x, s.player.y, sightRadius(s), true);
}
function goDown(s) {
  const st = siteHere(s),
    rec = areaRec(s);
  if (s.over || !st || st.kind !== 'stairsDown') return false;
  if (stat(s, 'nightSight', 0) <= 0) {
    say(s, 'You will not find the next stair without a light.', 'bad');
    return false;
  }
  advance(s, 10, 'rest');
  if (s.over) return true;
  const n = rec.level + 1,
    floors = findSite(s, 'vault').st.floors;
  goToLevel(s, n, floors);
  say(s, 'Level ' + n + ' of ' + floors.length + (n === floors.length ? '. The air is older here.' : '.'));
  return true;
}
function goUp(s) {
  const st = siteHere(s);
  if (s.over || !st || (st.kind !== 'stairsUp' && st.kind !== 'exit')) return false;
  const leaving = areaRec(s);
  advance(s, 10, 'rest');
  if (s.over) return true;
  leaveArea(s);
  if (leaving.kind === 'town') say(s, 'You leave ' + s.town.name + ' by the south gate.');
  else if (inOverworld(s)) say(s, 'You climb out into the ' + (clock(s).isDay ? 'daylight' : 'night') + '.');
  else say(s, 'You climb back up to level ' + areaRec(s).level + '.');
  return true;
}
function offer(s) {
  const st = siteHere(s);
  if (s.over || !st || st.kind !== 'shrine' || s.quest.dest !== 'shrine' || !hasItem(s, 'relic')) return false;
  s.over = { won: true };
  say(s, 'You set the ' + s.quest.relic + ' on the shrine. Something that was held breath for an age lets go.', 'good');
  return true;
}

export {
  hasItem,
  atTown,
  mark,
  findSite,
  itemValue,
  makeQuest,
  findLoose,
  objective,
  talkElder,
  buy,
  buyFuel,
  sellPrice,
  sell,
  appraise,
  inn,
  unlock,
  findHere,
  enterTown,
  enterVault,
  goToLevel,
  goDown,
  goUp,
  offer,
};
