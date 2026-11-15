/* Creatures and turn-based combat. */
import { depotHere } from './actions.js';
import { scores } from './character.js';
import { C, H, byId, clamp, idx, say, srand, stream } from './core.js';
import { aOrAn } from './core.js';
import { genItem, isCursed, itemName, makeItem } from './items.js';
import { dirTo, lineOfSight, passable, sightRadius } from './map.js';
import { isDark } from './areas.js';
import { amod, gainXp, playerAC, prof, roll, weaponOf } from './progress.js';
import { stat } from './stats.js';

/* Creatures and combat: rare, one at a time, turn by turn. */
function makeSpecies(s, r, biomeId) {
  const cr = C.creature,
    pick = (a) => a[Math.floor(r() * a.length)],
    out = [],
    used = {};
  for (const sp of s.species || []) used[sp.name] = 1;
  while (out.length < cr.speciesPerWorld) {
    const form = pick(cr.forms),
      pre = pick(cr.prefix[biomeId]),
      temper = pick(cr.tempers),
      rare = r() < cr.rareChance ? pick(cr.rares) : null,
      name = (rare ? rare.name + ' ' : '') + pre + ' ' + form.name;
    if (used[name]) continue;
    used[name] = 1;
    out.push({ name, form: form.id, temper: temper.id, rare: rare ? rare.id : null, met: false });
  }
  return out;
}
// Each biome has its own creatures, rolled the first time a region of that biome is built.
function speciesFor(s, biomeId) {
  if (!s.speciesByBiome[biomeId]) {
    const made = makeSpecies(s, stream(s.seed, 'species:' + biomeId), biomeId);
    s.speciesByBiome[biomeId] = made.map((sp) => s.species.push(sp) - 1);
  }
  return s.speciesByBiome[biomeId];
}
// Places creatures on a map m ({ terrain, sites, creatures }), spread across west-to-east bands.
function placeCreatures(s, r, m, o) {
  for (let k = 0; k < o.count; k++) {
    const x0 = 2 + Math.floor((k * 32) / o.count),
      x1 = 2 + Math.floor(((k + 1) * 32) / o.count);
    for (let tries = 0; tries < 200; tries++) {
      const x = x0 + Math.floor(r() * (x1 - x0)),
        y = 1 + Math.floor(r() * (H - 2)),
        i = idx(x, y),
        far = o.far(x, y);
      if (o.avoid(x, y, far) || m.terrain[i] === 2 || m.sites[i] || m.creatures.some((c) => c.x === x && c.y === y)) continue;
      m.creatures.push(makeCreature(s, k + 1, o.species[Math.floor(r() * o.species.length)], x, y, o.tier(x, y, far)));
      break;
    }
  }
}
function makeCreature(s, id, spi, x, y, tier) {
  const sp = s.species[spi],
    f = byId(C.creature.forms, sp.form),
    eld = sp.rare === 'elder' ? 1.5 : 1,
    hp = Math.round((f.hp[0] + f.hp[1] * (tier - 1)) * eld);
  return {
    id,
    sp: spi,
    x,
    y,
    tier,
    hp,
    hpMax: hp,
    ac: f.ac + tier,
    hit: f.hit + tier + (eld > 1 ? 1 : 0),
    add: tier - 1,
    cool: 0,
    seen: false,
  };
}
const spOf = (s, c) => s.species[c.sp],
  formOf = (s, c) => byId(C.creature.forms, spOf(s, c).form),
  foe = (s) => (s.combat ? s.creatures.find((c) => c.id === s.combat.cid) : null);
function clog(s, msg, tone) {
  if (s.combat) {
    s.combat.lines.push(msg);
    if (s.combat.lines.length > 6) s.combat.lines.shift();
  }
  say(s, msg, tone);
}
function startCombat(s, c, enemyFirst) {
  const sp = spOf(s, c);
  s.combat = { cid: c.id, lines: [], round: 0 };
  c.seen = true;
  clog(
    s,
    (enemyFirst ? aOrAn(sp.name, true) + ' is on you! ' : aOrAn(sp.name, true) + ' bars your way. ') +
      (sp.met ? '' : formOf(s, c).text),
    'bad',
  );
  sp.met = true;
  if (s.char.cls === 'ranger') {
    clog(s, 'You loose a shot before it closes.');
    strike(s, { ranged: true });
  } else if (enemyFirst) enemyTurn(s);
}
function strike(s, o) {
  o = o || {};
  const c = foe(s),
    sp = spOf(s, c),
    wp = weaponOf(s),
    sc = scores(s.char),
    ab = wp.w.finesse || o.ranged ? Math.max(amod(sc.dex), amod(sc.str)) : amod(sc.str),
    d20 = roll(s, 1, 20),
    tot = d20 + prof(s) + ab + stat(s, 'hit', 0);
  if (d20 === 1 || (d20 !== 20 && tot < c.ac)) {
    clog(s, 'You miss the ' + sp.name + '.');
    return false;
  }
  let dmg = Math.max(1, roll(s, wp.w.dice[0], wp.w.dice[1]) + ab + stat(s, 'dmg', 0) + (o.dmg || 0));
  if (d20 === 20) dmg += roll(s, wp.w.dice[0], wp.w.dice[1]);
  if (o.double) dmg *= 2;
  hurt(
    s,
    c,
    dmg,
    (d20 === 20 ? 'A perfect blow: you hit' : o.double ? 'You strike from its blind side:' : 'You hit') + ' the ' + sp.name,
  );
  return true;
}
function hurt(s, c, dmg, lead) {
  const sp = spOf(s, c);
  c.hp -= dmg;
  if (c.hp > 0) {
    clog(s, lead + ' for ' + dmg + '.');
    return;
  }
  const f = formOf(s, c),
    xp = f.xp * c.tier;
  s.combat = null;
  s.creatures = s.creatures.filter((x) => x.id !== c.id);
  say(s, lead + ' for ' + dmg + '. The ' + sp.name + ' is dead. ' + xp + ' experience.', 'good');
  if (sp.rare === 'gilded' || srand(s) < 0.25) {
    const it = genItem(s, sp.rare === 'gilded' ? { relic: true, noConsumables: true } : { onlyConsumables: true });
    depotHere(s, true).items.push(it);
    say(s, 'It leaves behind: ' + itemName(it) + '. Open Pack to take it.', 'good');
  }
  {
    const n = c.tier * roll(s, 1, 6);
    s.player.coin += n;
    say(s, 'You find ' + n + ' coin on it.');
  }
  if (c.key) {
    const k = makeItem(s, 'key', null, null, true);
    k.label = 'Key to the ' + s.quest.vault.name;
    depotHere(s, true).items.push(k);
    say(s, 'In its lair lies the key to the ' + s.quest.vault.name + '. Open Pack to take it.', 'good');
  }
  if (c.warden)
    say(
      s,
      'The warden of the ' + s.quest.vault.name + ' is dead. Nothing stands between you and the ' + s.quest.relic + '.',
      'good',
    );
  gainXp(s, xp);
}
function enemyTurn(s) {
  const c = foe(s);
  if (!c || s.over) return;
  const sp = spOf(s, c),
    f = formOf(s, c),
    p = s.player,
    d20 = roll(s, 1, 20);
  if (d20 === 1 || (d20 !== 20 && d20 + c.hit < playerAC(s))) {
    clog(s, 'The ' + sp.name + ' misses you.');
    return;
  }
  const dmg = Math.max(1, roll(s, f.dice[0], f.dice[1]) + c.add);
  p.hp -= dmg;
  let extra = '';
  if (f.chill && !s.off.warmth) {
    p.warmth = Math.max(0, p.warmth - f.chill);
    extra = ' Cold floods in.';
  }
  if (f.venom) {
    p.stamina = Math.max(0, p.stamina - f.venom);
    extra = ' Venom saps you.';
  }
  if (p.hp <= 0) {
    p.hp = 0;
    s.over = { won: false, cause: 'slain', by: sp.name };
    s.combat = null;
    say(s, 'The ' + sp.name + ' hits you for ' + dmg + '. You fall.', 'bad');
    return;
  }
  clog(s, 'The ' + sp.name + ' hits you for ' + dmg + '.' + extra, 'bad');
}
const turn = (s, fn) => {
  if (!s.combat || s.over) return false;
  const r = fn();
  if (r === false) return false;
  if (s.combat) {
    s.combat.round++;
    enemyTurn(s);
  }
  return true;
};
const attack = (s) =>
  turn(s, () => {
    strike(s, { double: s.char.cls === 'rogue' && s.combat.round === 0 });
  });
const power = (s) =>
  turn(s, () => {
    if (s.player.stamina < 6) {
      say(s, 'Too tired for that.');
      return false;
    }
    s.player.stamina -= 6;
    strike(s, { dmg: 4 });
  });
const firebolt = (s) =>
  turn(s, () => {
    const p = s.player,
      c = foe(s),
      sp = spOf(s, c),
      im = amod(scores(s.char).int);
    if (p.mana < 2) {
      say(s, 'Not enough mana.');
      return false;
    }
    p.mana -= 2;
    const d20 = roll(s, 1, 20);
    if (d20 === 1 || d20 + prof(s) + im + 2 < c.ac) clog(s, 'Your firebolt goes wide.');
    else hurt(s, c, roll(s, 2, 6) + Math.max(0, im), 'Your firebolt burns the ' + sp.name);
  });
const smite = (s) =>
  turn(s, () => {
    const p = s.player,
      c = foe(s);
    if (p.mana < 2) {
      say(s, 'Not enough mana.');
      return false;
    }
    p.mana -= 2;
    strike(s, { dmg: roll(s, 1, 8) * (spOf(s, c).form === 'wight' ? 2 : 1) });
  });
function mend(s) {
  const p = s.player;
  if (s.over || s.char.cls !== 'cleric') return false;
  if (p.mana < 3) {
    say(s, 'Not enough mana.');
    return false;
  }
  if (p.hp >= p.hpMax) {
    say(s, 'You are not hurt.');
    return false;
  }
  p.mana -= 3;
  const n = roll(s, 1, 8) + Math.max(0, amod(scores(s.char).wis)) + p.level;
  p.hp = Math.min(p.hpMax, p.hp + n);
  clog(s, 'You mend your wounds: ' + n + ' hit points.', 'good');
  if (s.combat) {
    s.combat.round++;
    enemyTurn(s);
  }
  return true;
}
function identify(s, id) {
  const p = s.player,
    it = p.items.find((i) => i.id === id);
  if (s.over || s.combat || s.char.cls !== 'wizard' || !it || it.known) return false;
  if (p.mana < 2) {
    say(s, 'Not enough mana.');
    return false;
  }
  p.mana -= 2;
  it.known = true;
  say(s, 'The spell lays it bare: ' + itemName(it) + '.', isCursed(it) ? 'bad' : 'good');
  return true;
}
function flee(s) {
  const c = foe(s);
  if (!c || s.over) return false;
  const f = formOf(s, c),
    sp = spOf(s, c),
    ch = s.char.cls === 'rogue' ? 1 : 0.65 + amod(scores(s.char).dex) * 0.05 - (f.fleePenalty || 0);
  s.player.stamina = Math.max(0, s.player.stamina - 5);
  if (srand(s) < ch) {
    c.cool = 5;
    s.combat = null;
    say(s, 'You break away from the ' + sp.name + '. Keep moving.', 'good');
    return true;
  }
  clog(s, 'You cannot shake the ' + sp.name + '.', 'bad');
  s.combat.round++;
  enemyTurn(s);
  return true;
}
function stepCreatures(s) {
  if (s.over) return;
  const p = s.player;
  for (const c of s.creatures) {
    const sp = spOf(s, c);
    if (c.cool > 0) c.cool--;
    let d = Math.max(Math.abs(c.x - p.x), Math.abs(c.y - p.y));
    let moved = false;
    const chase =
      sp.rare !== 'docile' &&
      c.cool === 0 &&
      ((sp.temper === 'hunter' && d <= 5 && srand(s) < 0.6) || (sp.temper === 'territorial' && d <= 2)) &&
      lineOfSight(s, c.x, c.y, p.x, p.y);
    if (chase && d > 0) {
      const dx = Math.sign(p.x - c.x),
        dy = Math.sign(p.y - c.y),
        nx = Math.abs(p.x - c.x) >= Math.abs(p.y - c.y) ? c.x + dx : c.x,
        ny = nx === c.x ? c.y + dy : c.y;
      if (s.terrain[idx(nx, ny)] !== 2 && passable(s, nx, ny)) {
        c.x = nx;
        c.y = ny;
        moved = true;
      }
      d = Math.max(Math.abs(c.x - p.x), Math.abs(c.y - p.y));
    }
    if (
      d <= Math.max(1, Math.min(3, sightRadius(s))) &&
      !c.seen &&
      lineOfSight(s, p.x, p.y, c.x, c.y) &&
      (isDark(s) || !s.weather.storm)
    ) {
      c.seen = true;
      say(
        s,
        (dirTo(s, c.x, c.y) === 'here' ? 'Something moves right beside you' : 'Something moves to the ' + dirTo(s, c.x, c.y)) +
          ': ' +
          aOrAn(sp.name) +
          '. ' +
          (sp.rare === 'docile' ? 'It watches you without interest.' : byId(C.creature.tempers, sp.temper).text),
        sp.rare === 'docile' ? '' : 'bad',
      );
    }
    if (d === 0 && !s.combat && c.cool === 0) {
      if (sp.rare === 'docile') {
        if (!c.greeted) {
          c.greeted = true;
          say(s, 'The ' + sp.name + " lets you pass within arm's reach.");
        }
      } else startCombat(s, c, moved);
    }
  }
}

export {
  makeSpecies,
  speciesFor,
  placeCreatures,
  makeCreature,
  spOf,
  formOf,
  foe,
  clog,
  startCombat,
  strike,
  hurt,
  enemyTurn,
  turn,
  attack,
  power,
  firebolt,
  smite,
  mend,
  identify,
  flee,
  stepCreatures,
};
