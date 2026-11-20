/* Everything the player can do outside a fight. */
import { AXES, civOf, learn, trait } from './civ.js';
import { enemyTurn, stepCreatures } from './combat.js';
import { C, H, TERR, W, WALL, biomeOf, byId, clamp, clock, emit, godOf, idx, say, srand, stormOf } from './core.js';
import { autoEquip } from './equipment.js';
import { genItem, isCursed, itemName, makeItem, weight } from './items.js';
import {
  atCamp,
  dirFrom,
  dirTo,
  groundHere,
  here,
  inShelter,
  passable,
  reveal,
  sightRadius,
  siteHere,
  siteName,
  terrainInfo,
} from './map.js';
import { gainXp, roll, weaponOf } from './progress.js';
import { PLOT_HOOKS, enterTown, findSite, hasItem, leaveTown } from './quest.js';
import {
  TOWN_GATE,
  curTown,
  townById,
  inTownBlock,
  townDoor,
  areaRec,
  inOverworld,
  indoors,
  isDark,
  sketchOf,
  switchRegion,
  wrap,
  worldMap,
  worldPos,
  homePos,
} from './areas.js';
import { carryCap, stat, waterCap } from './stats.js';
import { advance } from './systems.js';
import { ACTIONS as ACTION_HOOKS } from './hooks.js';

/* Actions */
// How much foul water hurts you: not at all if something makes you safe from it.
const foulHarm = (s) => (stat(s, 'foulSafe', 0) > 0 ? 0 : 1);
function moveCost(s, x, y) {
  const tt = s.terrain[idx(x, y)],
    tn = TERR[tt],
    g = terrainInfo(s, tt);
  let mins = g.moveMin * stat(s, 'moveTime', 1) * stat(s, 'moveTime.' + tn, 1);
  if ((!clock(s).isDay || isDark(s)) && stat(s, 'nightSight', 0) <= 0) mins *= 2;
  let sta = g.moveSta;
  if (s.road[idx(x, y)]) {
    mins = s.tun.moveMin.plain * 0.55 * stat(s, 'moveTime', 1) * (!clock(s).isDay && stat(s, 'nightSight', 0) <= 0 ? 2 : 1);
    sta = s.tun.moveSta.plain * 0.7;
  }
  return { mins, cost: sta * s.tun.staminaScale * stat(s, 'staminaCost', 1), base: s.tun.moveMin.plain };
}
function move(s, dx, dy, at) {
  if (s.over) return false;
  let nx = s.player.x + dx,
    ny = s.player.y + dy;
  const out = nx < 0 || ny < 0 || nx >= W || ny >= H,
    was = s.lastGround,
    leftCamp = atCamp(s);
  if (out && !inOverworld(s) && areaRec(s).kind !== 'town') return false;
  if (weight(s) > carryCap(s) + 1e-9) {
    say(s, 'You are carrying too much to move. Leave something here.', 'bad');
    return false;
  }
  // The town: walk into its block from any side and you are in it, unless a wall stands there; walk off any edge of
  // it and you are back outside. `at` is where the view says you arrive, so its picture and the rules agree.
  if (!out && inTownBlock(s, nx, ny) && !inTownBlock(s, s.player.x, s.player.y)) return enterTown(s, nx, ny, at);
  if (out && areaRec(s).kind === 'town') return leaveTown(s, dx, dy);
  // Walking off the edge of a region brings you onto the facing edge of its neighbour; the world wraps around.
  // This is the one place a border is crossed, so that borders can be made seamless later.
  let back = null;
  if (out) {
    const rec = areaRec(s);
    back = { cx: rec.cx, cy: rec.cy, x: s.player.x, y: s.player.y };
    switchRegion(s, wrap(rec.cx + Math.floor(nx / W), s.world.cols), wrap(rec.cy + Math.floor(ny / H), s.world.rows), {
      x: wrap(nx, W),
      y: wrap(ny, H),
    });
    nx = s.player.x;
    ny = s.player.y;
  }
  const retreat = () => {
    if (back) switchRegion(s, back.cx, back.cy, back);
    return false;
  };
  if (!passable(s, nx, ny)) return retreat();
  const mc = moveCost(s, nx, ny),
    mins = mc.mins,
    cost = mc.cost;
  if (s.player.stamina < cost) {
    say(s, 'You are too exhausted to go on. Rest first.', 'bad');
    return retreat();
  }
  if (leftCamp) s.stats.trips++;
  s.player.stamina -= cost;
  s.player.x = nx;
  s.player.y = ny;
  s.stats.moves++;
  if (back) {
    const rec = areaRec(s),
      name = biomeOf(s).name;
    say(
      s,
      rec.visited ? 'You cross into ' + name + ' again.' : 'You cross into country no map of yours shows: ' + name + '.',
      rec.visited ? undefined : 'good',
    );
    if (!rec.visited) s.stats.regions = (s.stats.regions || 1) + 1;
    rec.visited = true;
  }
  const g = groundHere(s);
  s.lastGround = s.terrain[here(s)];
  if (g.wet && !s.off.warmth && stat(s, 'wetSafe', 0) <= 0)
    s.player.warmth = Math.max(0, s.player.warmth - g.wet * s.tun.coldScale);
  if (s.lastGround !== was && s.lastGround >= 3 && s.lastGround < WALL)
    say(
      s,
      {
        forest: 'You enter ' + g.name + (g.blind ? '. It breaks the wind, and hides the land.' : '. There is wood to gather.'),
        river:
          'You reach a ' +
          g.name +
          (g.drink
            ? '. Sweet running water, and a cold crossing.'
            : g.dig
              ? '. Easy walking, and water under the sand if you dig.'
              : '. Fast, exposed going.'),
        special: 'You step onto ' + g.name + (g.wet ? '. Every step is slow, wet work.' : '. Flat, fast and exposed.'),
      }[TERR[s.lastGround]],
    );
  if (s.road[here(s)] && !s.onRoad) say(s, 'Paved road underfoot. The going is fast and easy.', 'good');
  s.onRoad = !!s.road[here(s)];
  advance(s, mins, 'move');
  if (s.over) return true;
  reveal(s, nx, ny, sightRadius(s));
  arrive(s);
  if (!s.over) stepCreatures(s);
  return true;
}
function arrive(s) {
  if (s.lostMaps[here(s)]) {
    const m = s.lostMaps[here(s)],
      d = s.depots[here(s)];
    let n = 0;
    for (let i = 0; i < m.length; i++)
      if (m[i] === '1' && !s.seen[i]) {
        s.seen[i] = 1;
        n++;
      }
    delete s.lostMaps[here(s)];
    if (d && d.coin) {
      s.player.coin += d.coin;
      d.coin = 0;
    }
    say(
      s,
      'Here lies ' +
        (d && d.remains ? d.remains : 'a traveller') +
        '. Their goods are in the Pack screen, their purse is yours, and their map adds ' +
        n +
        ' tiles to yours.',
      'good',
    );
  }
  {
    const d = s.depots[here(s)];
    if (d && d.coin && !d.remains) {
      s.player.coin += d.coin;
      say(
        s,
        (d.store ? 'A store-room, untouched. ' : '') +
          'You pick up ' +
          d.coin +
          ' coin.' +
          (d.items.length ? ' There is more in the Pack screen.' : ''),
        'good',
      );
      d.coin = 0;
    }
    if (d && d.items.some((i) => i.base === 'relic') && !hasItem(s, 'relic'))
      say(s, 'On a plinth lies the ' + s.quest.relic + '. Open Pack to take it.', 'good');
  }
  const st = siteHere(s);
  if (!st) return;
  st.seen = true;
  if (st.kind === 'trap' && !st.sprung) {
    st.sprung = true;
    if (stat(s, 'trapSafe', 0) > 0)
      say(s, 'You feel the pressure plate shift under your boot, and step off it before it fires.', 'good');
    else {
      const n = Math.min(roll(s, 1, 6) + 2, Math.max(0, Math.ceil(s.player.hp) - 1));
      s.player.hp -= n;
      say(s, 'A plate clicks underfoot. Darts from the wall: ' + n + ' damage.', 'bad');
    }
    return;
  }
  if (st.kind === 'spring' && !st.known && stat(s, 'tasteWater', 0) > 0) {
    st.known = true;
    say(
      s,
      st.foul ? 'A spring. You can tell at a glance that it is foul.' : 'A spring, and by the look of it sweet.',
      st.foul ? 'bad' : 'good',
    );
    st.visited = true;
  }
  if (st.kind === 'beacon' && s.quest.dest === 'beacon' && hasItem(s, 'relic')) {
    say(s, 'You set the ' + s.quest.relic + ' in the beacon. The fire catches, and turns, and holds.', 'good');
    if (PLOT_HOOKS.relicWins(s)) s.over = { won: true };
    else PLOT_HOOKS.relicSideDone(s);
    return;
  }
  if (st.kind === 'shrine' && !s.known.god) {
    s.known.god = true;
    emit(s, 'learned', { axis: 'god', id: s.god });
  }
  if (!st.visited) {
    st.visited = true;
    if (!st.xp) {
      st.xp = 1;
      gainXp(s, 5);
    }
    const txt = {
      spring: 'A spring. You cannot tell if it is sweet until you taste it.',
      cave: 'A cave: shelter from wind and weather.',
      ruin:
        'A ruin of ' +
        (s.known.civ ? civOf(s).name : 'some lost people') +
        '. ' +
        trait(s, 'age').sign +
        ' ' +
        trait(s, 'doom').sign,
      cache: 'Someone left a cache here under stones.',
      town:
        'The town of ' +
        ((st.town && townById(s, st.town)) || s.town).name +
        '. Smoke, voices, a well. Walk in to talk and trade.',
      vault: 'The ' + s.quest.vault.name + '. A heavy door, and a stair going down behind it.',
      beacon:
        s.quest.dest === 'beacon'
          ? 'The beacon. Its fire is failing. It needs something it does not have.'
          : 'The beacon. Its fire is steady: whatever this land needs, it is not here.',
      shrine: 'A shrine to ' + godOf(s).name + ', raised by ' + (s.known.civ ? civOf(s).name : 'a lost people') + '.',
      well: 'The well at your first camp.',
    }[st.kind];
    if (txt) say(s, txt); // a piece's own kind of place tells itself
  }
}
function survey(s) {
  if (s.over || indoors(s)) return false;
  if (s.weather.storm) {
    say(s, 'You can see nothing through the ' + stormOf(s).name + '.');
    return false;
  }
  const t = s.terrain[here(s)],
    blindG = groundHere(s).blind;
  let rad = (blindG ? 1.5 : [3, 5, 7, 3, 3, 4][t]) + (blindG ? 0 : stat(s, 'surveyRadius', 0));
  if (!clock(s).isDay && stat(s, 'nightSight', 0) <= 0) rad = Math.min(rad, 1.5);
  rad = Math.max(1.5, rad);
  advance(s, 30, 'rest');
  if (s.over) return true;
  const n = reveal(s, s.player.x, s.player.y, rad);
  if (!n)
    say(
      s,
      blindG
        ? 'The trees hide everything. Survey from open ground.'
        : 'You study the land' + (t === 0 ? '. Higher ground would show more.' : ' and add it to your map.'),
    );
  return true;
}
function restHour(s) {
  const gain = (atCamp(s) ? 22 : inShelter(s) ? 14 : 8) * stat(s, 'restGain', 1);
  advance(s, 60, 'rest');
  if (!s.over && s.player.water > 0) {
    const p = s.player;
    p.stamina = Math.min(100, p.stamina + gain);
    p.hp = Math.min(p.hpMax, p.hp + (atCamp(s) ? 2 + p.level : inShelter(s) ? 1 : 0));
    p.mana = Math.min(p.manaMax, p.mana + (atCamp(s) ? 2 : 1));
  }
}
function rest(s) {
  if (s.over) return false;
  restHour(s);
  if (!s.over) say(s, 'You rest for an hour.');
  return true;
}
function sleep(s) {
  if (s.over) return false;
  let h = 0;
  while (h < 16 && !s.over) {
    restHour(s);
    h++;
    if (s.player.water <= 0.5 || s.player.warmth <= 10) break;
    if (clock(s).isDay && s.player.stamina >= 90) break;
  }
  if (!s.over)
    say(
      s,
      s.player.water <= 0.5
        ? 'Thirst wakes you after ' + h + ' hours.'
        : s.player.warmth <= 10
          ? 'Cold wakes you after ' + h + ' hours.'
          : 'You sleep ' + h + ' hours and wake rested.',
    );
  return true;
}
function fire(s) {
  if (s.over) return false;
  if (s.player.fuel < 1) {
    say(s, 'You need 1 fuel to light a fire.');
    return false;
  }
  if (s.weather.storm && !inShelter(s) && !groundHere(s).blind) {
    say(s, 'No fire will hold in this ' + stormOf(s).name + ' out in the open. Find shelter or trees.');
    return false;
  }
  s.player.fuel -= 1;
  advance(s, 30, 'rest');
  if (!s.over) {
    s.player.warmth = Math.min(100, s.player.warmth + 35);
    say(s, 'You warm yourself at a small fire.');
  }
  return true;
}
function topUp(s, limit) {
  // never fill past what you can carry: water you cannot walk with is no use
  const room = Math.max(0, Math.min(waterCap(s) - s.player.water, carryCap(s) - weight(s))),
    got = Math.min(room, limit === undefined ? room : limit);
  s.player.water += got;
  return got;
}
function fill(s) {
  if (s.over) return false;
  const st = siteHere(s);
  if (!st && groundHere(s).drink) {
    advance(s, 15, 'rest');
    topUp(s);
    say(s, 'You fill up from the ' + groundHere(s).name + '.');
    return true;
  }
  if (!st) return false;
  if (st.kind === 'well' || st.kind === 'town' || st.kind === 'hamlet') {
    advance(s, 15, 'rest');
    topUp(s);
    say(s, 'You fill up at the well.');
    return true;
  }
  if (st.kind === 'ruin' && st.water > 0) {
    advance(s, 15, 'rest');
    const g = topUp(s, st.water);
    st.water -= g;
    if (st.foulWater && g > 0) {
      s.player.stamina = Math.max(0, s.player.stamina - foulHarm(s) * 15);
      say(s, 'The cistern water is foul. You feel it at once.', 'bad');
    }
    say(
      s,
      'You draw ' +
        g.toFixed(1) +
        ' from the cistern. ' +
        (st.water > 0.05 ? st.water.toFixed(1) + ' remains.' : 'It is dry now.'),
    );
    return true;
  }
  if (st.kind !== 'spring') return false;
  if (!st.known) {
    st.known = true;
    advance(s, 15, 'rest');
    if (st.foul) {
      s.player.stamina = Math.max(0, s.player.stamina - foulHarm(s) * 5);
      say(s, 'You taste it and gag. This spring is foul. Boil it, or drink and pay for it.', 'bad');
      return true;
    }
    topUp(s);
    say(s, 'Sweet water. You fill up.', 'good');
    return true;
  }
  advance(s, 15, 'rest');
  if (st.foul) {
    s.player.stamina = Math.max(0, s.player.stamina - foulHarm(s) * 15);
    say(s, 'You fill up with foul water and feel it at once.', 'bad');
  } else say(s, 'You fill up at the spring.');
  topUp(s);
  return true;
}
function boil(s) {
  const st = siteHere(s);
  if (s.over || !st) return false;
  const spring = st.kind === 'spring' && st.foul && st.known,
    cis = st.kind === 'ruin' && st.foulWater && st.water > 0.05;
  if (!spring && !cis) return false;
  if (s.player.fuel < 1) {
    say(s, 'You need 1 fuel to boil water.');
    return false;
  }
  s.player.fuel -= 1;
  advance(s, 30, 'rest');
  if (cis) {
    const g = topUp(s, st.water);
    st.water -= g;
  } else topUp(s);
  say(s, 'You boil the foul water clean and fill up.');
  return true;
}
function melt(s) {
  const b = biomeOf(s);
  if (s.over || !b.melt || indoors(s)) return false;
  if (s.player.fuel < 1) {
    say(s, 'You need 1 fuel to melt snow.');
    return false;
  }
  if (waterCap(s) - s.player.water < 0.05) {
    say(s, 'You have nothing to hold more water.');
    return false;
  }
  s.player.fuel -= 1;
  advance(s, 30, 'rest');
  const g = topUp(s, b.melt);
  say(s, 'You melt snow for ' + g.toFixed(1) + ' water.');
  return true;
}
function dig(s) {
  const g = groundHere(s);
  if (s.over || !g.dig || s.dug[here(s)]) return false;
  if (s.player.stamina < 12) {
    say(s, 'Digging needs 12 stamina. Rest first.');
    return false;
  }
  s.player.stamina -= 12;
  advance(s, 60, 'rest');
  if (s.over) return true;
  s.dug[here(s)] = 1;
  const got = topUp(s, g.dig);
  say(
    s,
    got > 0.05
      ? 'An hour of digging brings up ' + got.toFixed(1) + ' water. This spot is spent.'
      : 'You dig down to damp sand, but have nothing to carry water in.',
  );
  return true;
}
function gather(s) {
  const g = groundHere(s);
  if (s.over || !g.gather) return false;
  advance(s, 30, 'rest');
  if (s.over) return true;
  const n = 1 + stat(s, 'gatherYield', 0);
  s.player.fuel += n;
  say(s, 'You gather wood: ' + n + ' fuel.');
  return true;
}
const depotHere = (s, make) => {
  const i = here(s);
  if (!s.depots[i] && make) s.depots[i] = { water: 0, fuel: 0, items: [] };
  return s.depots[i] || null;
};
function tidy(s) {
  const i = here(s),
    d = s.depots[i];
  if (d && d.water < 0.05 && d.fuel < 0.05 && !d.items.length) delete s.depots[i];
}
function search(s) {
  if (s.over) return false;
  const st = siteHere(s);
  if (!st || st.searched || !['ruin', 'cave', 'cache'].includes(st.kind)) return false;
  const d = () => depotHere(s, true),
    found = [];
  if (st.kind === 'ruin') {
    const sr = civOf(s).search;
    if (sr.stamina && s.player.stamina < sr.stamina) {
      say(s, 'Getting in needs ' + sr.stamina + ' stamina. Rest first.');
      return false;
    }
    if (sr.stamina) s.player.stamina -= sr.stamina;
    advance(s, sr.hours * 60 * stat(s, 'searchTime', 1), 'rest');
    if (s.over) return true;
    st.searched = true;
    s.known.civ = true;
    learn(s, 'habit');
    {
      const left = AXES.filter((a) => !s.civKnown[a]);
      if (left.length) learn(s, left[Math.floor(srand(s) * left.length)]);
    }
    let burned = 0;
    for (let i = 0; i < sr.items; i++) {
      if (srand(s) >= sr.itemChance) continue;
      if (sr.burn && srand(s) < sr.burn) {
        burned++;
        continue;
      }
      const it = genItem(s, { civ: true, relic: sr.relic, noConsumables: sr.noConsumables });
      d().items.push(it);
      found.push(itemName(it));
    }
    for (let i = 0; i < sr.bonusConsumable; i++) {
      const it = genItem(s, { onlyConsumables: true });
      d().items.push(it);
      found.push(itemName(it));
    }
    if (burned) found.push('the ash of ' + burned + ' burned thing' + (burned > 1 ? 's' : ''));
    if (sr.fuel) {
      d().fuel += sr.fuel;
      found.push(sr.fuel + ' fuel');
    }
    {
      const n = roll(s, 2, 6);
      s.player.coin += n;
      found.push(n + ' coin');
    }
    if (s.quest.keyTile === here(s) && (s.quest.keyArea || 'overworld') === s.area) {
      const k = makeItem(s, 'key', null, null, true);
      k.label = 'Key to the ' + s.quest.vault.name;
      d().items.push(k);
      found.push('the ' + k.label.toLowerCase() + ', on a warden long dead');
    }
    if (sr.water) {
      st.water = sr.water;
      st.foulWater = sr.foulWater;
      found.push('a cistern holding ' + sr.water + (sr.foulWater ? ' foul' : '') + ' water');
    }
    if (sr.reveal) reveal(s, s.player.x, s.player.y, sr.reveal);
    if (sr.roads) {
      let n = 0;
      for (const k in s.road) {
        const x = k % W,
          y = Math.floor(k / W);
        if (Math.abs(x - s.player.x) + Math.abs(y - s.player.y) <= 14 && !s.seen[k]) {
          s.seen[k] = 1;
          n++;
        }
      }
      if (n) found.push('a milestone marking the road on your map');
    }
    if (sr.trap && srand(s) < sr.trap && stat(s, 'trapSafe', 0) > 0)
      say(s, 'You spot the deadfall before it spots you, and step around it.', 'good');
    else if (sr.trap && srand(s) < sr.trap) {
      s.player.stamina = Math.max(0, s.player.stamina - 15);
      say(s, 'A deadfall drops as you step in. You get clear, bruised and shaken.', 'bad');
    }
  } else if (st.kind === 'cave') {
    advance(s, 30 * stat(s, 'searchTime', 1), 'rest');
    if (s.over) return true;
    st.searched = true;
    if (st.loot || srand(s) < stat(s, 'luck', 0)) {
      const it = genItem(s);
      d().items.push(it);
      found.push(itemName(it));
    }
  } else {
    advance(s, 15, 'rest');
    if (s.over) return true;
    st.searched = true;
    d().fuel += st.fuel;
    d().water += st.water;
    if (st.fuel || st.water) found.push(st.fuel + ' fuel', st.water + ' water');
    {
      const n = roll(s, 1, 6);
      s.player.coin += n;
      found.push(n + ' coin');
    }
    if (st.loot || srand(s) < stat(s, 'luck', 0)) {
      const it = genItem(s);
      d().items.push(it);
      found.push(itemName(it));
    }
  }
  gainXp(s, st.kind === 'ruin' ? 25 : 10);
  say(
    s,
    found.length ? 'You find: ' + found.join(', ') + '. Open Pack to take what you want.' : 'You find nothing of use.',
    found.length ? 'good' : '',
  );
  return true;
}
function pact(s) {
  const st = siteHere(s);
  if (s.over || !st || st.kind !== 'shrine' || s.pact) return false;
  s.pact = s.god;
  say(s, 'You swear to ' + godOf(s).name + '. ' + godOf(s).terms, 'good');
  if (s.player.water > waterCap(s)) s.player.water = waterCap(s);
  return true;
}
function packCamp(s) {
  if (s.over || !atCamp(s)) return false;
  advance(s, 60, 'rest');
  if (s.over) return true;
  s.camp = null;
  s.player.items.push(makeItem(s, 'campkit', null, null, true));
  say(s, 'You strike camp. The kit is on your back: 5 weight until you pitch it again.');
  return true;
}
function makeCamp(s) {
  if (s.over || s.camp || !inOverworld(s)) return false;
  const i = s.player.items.findIndex((it) => it.base === 'campkit');
  if (i < 0) return false;
  if (!inShelter(s)) {
    say(s, 'A camp needs shelter: a cave, a ruin or the well.');
    return false;
  }
  advance(s, 120, 'rest');
  if (s.over) return true;
  s.player.items.splice(i, 1);
  s.camp = { area: s.area, i: here(s) };
  say(s, 'You pitch camp. This is home now.', 'good');
  return true;
}
function study(s, id) {
  if (s.over || !atCamp(s)) return false;
  const it = s.player.items.find((i) => i.id === id);
  if (!it || it.known) return false;
  advance(s, 120 * stat(s, 'studyTime', 1), 'rest');
  if (s.over) return true;
  it.known = true;
  say(s, 'You study it by the fire: ' + itemName(it) + '.', isCursed(it) ? 'bad' : 'good');
  return true;
}
function useItem(s, id) {
  if (s.over) return false;
  const i = s.player.items.findIndex((x) => x.id === id);
  if (i < 0) return false;
  const it = s.player.items[i],
    b = byId(C.bases, it.base);
  if (!b.consumable) return false;
  const use = b.mystery ? C.flasks[it.effect].use : b.use;
  it.known = true;
  const p = s.player;
  if (use.stamina) p.stamina = clamp(p.stamina + use.stamina, 0, 100);
  if (use.warmth) p.warmth = clamp(p.warmth + use.warmth, 0, 100);
  if (use.water) p.water = Math.min(Math.max(waterCap(s), p.water), p.water + use.water);
  if (use.hp) p.hp = Math.min(p.hpMax, p.hp + use.hp);
  say(s, 'You drink the ' + itemName(it) + '.', (use.stamina || 0) < -5 ? 'bad' : 'good');
  p.items.splice(i, 1);
  if (s.combat) {
    s.combat.round++;
    enemyTurn(s);
  }
  return true;
}
function transfer(s, kind, n) {
  if (s.over || (kind !== 'water' && kind !== 'fuel')) return false;
  const p = s.player;
  if (n > 0) {
    const a = Math.min(n, p[kind]);
    if (a <= 0) return false;
    depotHere(s, true)[kind] += a;
    p[kind] -= a;
  } else {
    const d = depotHere(s);
    if (!d) return false;
    let a = Math.min(-n, d[kind]);
    if (kind === 'water') a = Math.min(a, Math.max(0, waterCap(s) - p.water));
    if (a <= 0) return false;
    d[kind] -= a;
    p[kind] += a;
    tidy(s);
  }
  return true;
}
function leaveItem(s, id) {
  if (s.over) return false;
  const i = s.player.items.findIndex((x) => x.id === id);
  if (i < 0) return false;
  {
    const it = s.player.items.splice(i, 1)[0];
    delete it.eq;
    depotHere(s, true).items.push(it);
  }
  if (s.player.water > waterCap(s)) {
    const spill = s.player.water - waterCap(s);
    s.player.water = waterCap(s);
    depotHere(s, true).water += spill;
  }
  return true;
}
function takeItem(s, id) {
  if (s.over) return false;
  const d = depotHere(s);
  if (!d) return false;
  const i = d.items.findIndex((x) => x.id === id);
  if (i < 0) return false;
  const it = d.items.splice(i, 1)[0];
  s.player.items.push(it);
  autoEquip(s, it);
  tidy(s);
  return true;
}

function actions(s) {
  if (s.over) return [];
  const a = [],
    st = siteHere(s),
    p = s.player,
    cap = waterCap(s);
  if (s.combat) {
    const w = weaponOf(s),
      cl = s.char.cls;
    a.push({
      id: 'attack',
      label: 'Attack',
      hint: (w.it ? byId(C.bases, w.it.base).name : 'bare hands') + ', ' + w.w.dice[0] + 'd' + w.w.dice[1],
    });
    if (cl === 'fighter') a.push({ id: 'power', label: 'Power strike', hint: '+4 damage, -6 stamina' });
    if (cl === 'wizard') a.push({ id: 'firebolt', label: 'Firebolt', hint: '2d6, 2 mana' });
    if (cl === 'cleric') {
      a.push({ id: 'smite', label: 'Smite', hint: '+1d8, 2 mana' });
      a.push({ id: 'mend', label: 'Mend', hint: 'heal, 3 mana' });
    }
    for (const f of ACTION_HOOKS) f(s, st, a); // fight moves added by pieces
    a.push({ id: 'flee', label: 'Flee', hint: '-5 stamina' });
    return a;
  }
  if (s.char.cls === 'cleric' && p.hp < p.hpMax && p.mana >= 3) a.push({ id: 'mend', label: 'Mend', hint: 'heal, 3 mana' });
  for (const f of ACTION_HOOKS) f(s, st, a); // buttons added by pieces (people in town, ...)
  if (!indoors(s)) a.push({ id: 'survey', label: 'Survey', hint: '30 min' });
  if (st) {
    if (st.kind === 'exit' && areaRec(s).kind !== 'town') a.push({ id: 'goUp', label: 'Climb out', hint: 'back outside' });
    if (st.kind === 'stairsUp') a.push({ id: 'goUp', label: 'Go up', hint: 'level ' + (areaRec(s).level - 1) });
    if (st.kind === 'stairsDown')
      a.push({ id: 'goDown', label: 'Go down', hint: 'level ' + (areaRec(s).level + 1) + ' of ' + areaRec(s).levels });
    if (st.kind === 'elder') a.push({ id: 'townAsk', section: 'elder', label: 'Talk to ' + curTown(s).elder, hint: 'the elder' });
    if (st.kind === 'inn') a.push({ id: 'townAsk', section: 'inn', label: 'The inn', hint: 'a bed for the night' });
    if (st.kind === 'shop')
      a.push({ id: 'townAsk', section: 'shop', label: 'Trade with ' + curTown(s).merchant, hint: 'buy, sell, appraise' });
    if (
      st.kind === 'well' ||
      st.kind === 'hamlet' ||
      (st.kind === 'ruin' && st.water > 0.05 && !st.foulWater) ||
      (st.kind === 'spring' && (!st.known || !st.foul))
    )
      a.push({ id: 'fill', label: st.kind === 'spring' && !st.known ? 'Taste the spring' : 'Fill water', hint: '15 min' });
    if ((st.kind === 'spring' && st.known && st.foul) || (st.kind === 'ruin' && st.foulWater && st.water > 0.05)) {
      a.push({ id: 'boil', label: 'Boil and fill', hint: '1 fuel' });
      a.push({ id: 'fill', label: 'Fill with foul water', hint: '-15 stamina' });
    }
    if (['ruin', 'cave', 'cache'].includes(st.kind) && !st.searched) {
      const sr = st.kind === 'ruin' ? civOf(s).search : null;
      a.push({
        id: 'search',
        label: st.kind === 'cache' ? 'Open the cache' : 'Search the ' + siteName(s, st),
        hint:
          st.kind === 'ruin'
            ? s.known.civ
              ? sr.hours + ' h' + (sr.stamina ? ', -' + sr.stamina + ' stamina' : '')
              : sr.stamina
                ? 'hard work, time unknown'
                : 'time unknown'
            : st.kind === 'cave'
              ? '30 min'
              : '15 min',
      });
    }
    if (st.kind === 'shrine' && !s.pact) a.push({ id: 'pactAsk', label: 'Approach the shrine', hint: 'hear the terms' });
    if (st.kind === 'shrine' && s.quest.dest === 'shrine' && hasItem(s, 'relic'))
      a.push({ id: 'offer', label: 'Offer the ' + s.quest.relic, hint: 'end the journey' });
    if (st.kind === 'vault' && !st.open)
      a.push({
        id: 'unlock',
        label: 'Unlock the ' + s.quest.vault.name,
        hint: hasItem(s, 'key') ? 'you have the key' : 'needs the key',
      });
    if (st.kind === 'vault' && st.open)
      a.push({ id: 'enterVault', label: 'Go into the ' + s.quest.vault.name, hint: st.floors.length + ' levels, needs a light' });
  }
  const g = groundHere(s);
  if (!st && g.drink) a.push({ id: 'fill', label: 'Fill from the ' + g.name, hint: '15 min' });
  if (g.dig && !s.dug[here(s)]) a.push({ id: 'dig', label: 'Dig for water', hint: '1 h, -12 stamina' });
  if (g.gather) a.push({ id: 'gather', label: 'Gather wood', hint: '30 min, +1 fuel' });
  if (biomeOf(s).melt && !indoors(s) && cap - p.water >= 0.05) a.push({ id: 'melt', label: 'Melt snow', hint: '1 fuel' });
  a.push({ id: 'rest', label: 'Rest', hint: '1 h' });
  if (inShelter(s)) a.push({ id: 'sleep', label: atCamp(s) ? 'Sleep at camp' : 'Sleep in shelter', hint: 'until rested' });
  if (p.warmth < 95) a.push({ id: 'fire', label: 'Light a fire', hint: '1 fuel' });
  if (atCamp(s)) a.push({ id: 'packCamp', label: 'Strike camp', hint: '1 h' });
  else if (!s.camp && inOverworld(s) && inShelter(s) && p.items.some((i) => i.base === 'campkit'))
    a.push({ id: 'makeCamp', label: 'Pitch camp here', hint: '2 h' });
  return a;
}
function forecast(s) {
  const n = stormOf(s).name;
  if (s.off.weather) return 'Clear';
  if (s.weather.storm) return n.charAt(0).toUpperCase() + n.slice(1);
  if (!clock(s).isDay) return 'Night sky';
  const h = (s.weather.changeAt - s.time) / 60;
  return h > 6 ? 'Clear' : h > 2.5 ? 'Clouds building' : 'Storm close';
}
function shrineBearing(s) {
  if (stat(s, 'shrineSense', 0) <= 0) return null;
  const sh = findSite(s, 'shrine');
  if (!sh) return null;
  const p = homePos(s, sh.area, sh.x, sh.y);
  return dirFrom(worldPos(s), p.x, p.y);
}
function wellfinder(s) {
  if (indoors(s) || stat(s, 'wellfinder', 0) <= 0) return null;
  let best = null,
    bd = 1e9;
  for (const k in s.sites) {
    const st = s.sites[k];
    if (st.kind !== 'spring' || (st.known && st.foul)) continue;
    const x = k % W,
      y = Math.floor(k / W),
      d = Math.abs(x - s.player.x) + Math.abs(y - s.player.y);
    if (d < bd && d > 0) {
      bd = d;
      best = dirTo(s, x, y);
    }
  }
  return best;
}

export {
  moveCost,
  move,
  arrive,
  survey,
  restHour,
  rest,
  sleep,
  fire,
  topUp,
  fill,
  boil,
  melt,
  dig,
  gather,
  depotHere,
  tidy,
  search,
  pact,
  packCamp,
  makeCamp,
  study,
  useItem,
  transfer,
  leaveItem,
  takeItem,
  actions,
  forecast,
  shrineBearing,
  wellfinder,
};
