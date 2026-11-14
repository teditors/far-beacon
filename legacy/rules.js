/* RULES: pure game logic. No drawing, no DOM. State is plain data, so it can be saved, replayed and tested. */
const Rules = (() => {
  const C = CONTENT,
    W = 36,
    H = 36,
    VERSION = 6,
    START = 6 * 60;
  const TERR = ['plain', 'hill', 'mountain', 'forest', 'river', 'special'];
  const byId = (list, id) => list.find((e) => e.id === id);
  const idx = (x, y) => y * W + x;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function mulberry(seed) {
    let a = seed | 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function srand(s) {
    s.rng = (s.rng + 0x6d2b79f5) | 0;
    let t = Math.imul(s.rng ^ (s.rng >>> 15), s.rng | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /* Rule 1: systems talk through events and shared state, never to each other. */
  const listeners = {};
  function on(type, fn) {
    (listeners[type] = listeners[type] || []).push(fn);
  }
  function emit(s, type, data) {
    (listeners[type] || []).forEach((fn) => fn(s, data));
  }
  on('log', (s, d) => {
    s.log.push({ t: s.time, msg: d.msg, tone: d.tone || '' });
    if (s.log.length > 80) s.log.shift();
  });
  const say = (s, msg, tone) => emit(s, 'log', { msg, tone });

  function clock(s) {
    const m = START + s.time;
    const mod = m % 1440;
    const hour = Math.floor(mod / 60);
    return { day: Math.floor(m / 1440) + 1, hour, min: Math.floor(mod % 60), isDay: hour >= 6 && hour < 20 };
  }
  const biomeOf = (s) => byId(C.biomes, s.biome),
    godOf = (s) => byId(C.gods, s.god);
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
  const phase = (s) => (clock(s).isDay ? biomeOf(s).day : biomeOf(s).night);
  const here = (s) => idx(s.player.x, s.player.y);
  /* Terrain: the three landforms are shared; forest, river and the special ground are defined per biome in CONTENT. */
  function terrainInfo(s, t) {
    const b = biomeOf(s);
    if (t < 3)
      return {
        name: ['flat ground', 'hills', 'mountains'][t],
        moveMin: s.tun.moveMin[TERR[t]],
        moveSta: s.tun.moveSta[TERR[t]],
        mods: [],
      };
    return b[TERR[t]];
  }
  const groundHere = (s) => terrainInfo(s, s.terrain[here(s)]);
  const siteHere = (s) => s.sites[here(s)] || null;
  const isShelter = (site) =>
    !!site &&
    (site.kind === 'cave' || site.kind === 'ruin' || site.kind === 'well' || site.kind === 'town' || site.kind === 'vault');
  const inShelter = (s) => isShelter(siteHere(s));
  const atCamp = (s) => s.camp === here(s);

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
    s.seen.fill(0);
    for (const k in s.sites) {
      s.sites[k].seen = false;
      s.sites[k].visited = false;
    }
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
        ' lies somewhere to the ' +
        dirTo(s, i % W, Math.floor(i / W)) +
        ', with everything they carried.',
      'good',
    );
    return true;
  }

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

  /* Level, hit points, mana */
  const amod = (v) => Math.floor((v - 10) / 2),
    clsOf = (s) => byId(C.classes, s.char.cls),
    prof = (s) => 1 + Math.floor(s.player.level / 2);
  const xpFor = (level) => 50 * level * (level + 1);
  function manaMax(s) {
    const c = clsOf(s);
    return c.caster ? s.player.level * (c.manaPer + Math.max(0, amod(scores(s.char)[c.caster]))) : 0;
  }
  function gainXp(s, n) {
    if (s.over || !n) return;
    const p = s.player;
    p.xp += n;
    while (p.xp >= xpFor(p.level)) {
      p.level++;
      const up = Math.max(1, Math.floor(clsOf(s).hd / 2) + 1 + amod(scores(s.char).con));
      p.hpMax += up;
      p.hp += up;
      p.manaMax = manaMax(s);
      p.mana = p.manaMax;
      say(
        s,
        'Level ' +
          p.level +
          '. You are harder to kill: ' +
          p.hpMax +
          ' hit points' +
          (p.manaMax ? ', ' + p.manaMax + ' mana' : '') +
          '.',
        'good',
      );
    }
  }
  on('learned', (s, d) => {
    if (d.axis !== 'god') gainXp(s, 15);
  });
  const playerAC = (s) => 10 + amod(scores(s.char).dex) + stat(s, 'ac', 0);
  function weaponOf(s) {
    const it = s.player.items.find((i) => i.eq === 'weapon');
    return it ? { it, w: byId(C.bases, it.base).weapon } : { it: null, w: { dice: [1, 3] } };
  }
  function roll(s, n, sides) {
    let t = 0;
    for (let i = 0; i < n; i++) t += 1 + Math.floor(srand(s) * sides);
    return t;
  }

  /* Creatures and combat: rare, one at a time, turn by turn. */
  function makeSpecies(s, r) {
    const cr = C.creature,
      pick = (a) => a[Math.floor(r() * a.length)],
      out = [],
      used = {};
    while (out.length < cr.speciesPerWorld) {
      const form = pick(cr.forms),
        pre = pick(cr.prefix[s.biome]),
        temper = pick(cr.tempers),
        rare = r() < cr.rareChance ? pick(cr.rares) : null,
        name = (rare ? rare.name + ' ' : '') + pre + ' ' + form.name;
      if (used[name]) continue;
      used[name] = 1;
      out.push({ name, form: form.id, temper: temper.id, rare: rare ? rare.id : null, met: false });
    }
    return out;
  }
  function placeCreatures(s, r) {
    const cr = C.creature;
    for (let k = 0; k < cr.count; k++) {
      const x0 = 2 + Math.floor((k * 32) / cr.count),
        x1 = 2 + Math.floor(((k + 1) * 32) / cr.count);
      for (let tries = 0; tries < 200; tries++) {
        const x = x0 + Math.floor(r() * (x1 - x0)),
          y = 1 + Math.floor(r() * (H - 2)),
          i = idx(x, y),
          far = Math.max(Math.abs(x - s.start.x), Math.abs(y - s.start.y));
        if (
          far < 7 ||
          Math.max(Math.abs(x - s.town.x), Math.abs(y - s.town.y)) < 4 ||
          s.terrain[i] === 2 ||
          s.sites[i] ||
          s.creatures.some((c) => c.x === x && c.y === y)
        )
          continue;
        s.creatures.push(
          makeCreature(s, k + 1, Math.floor(r() * C.creature.speciesPerWorld), x, y, clamp(1 + Math.floor((far - 4) / 5), 1, 3)),
        );
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
      (enemyFirst ? 'A ' + sp.name + ' is on you! ' : 'A ' + sp.name + ' bars your way. ') + (sp.met ? '' : formOf(s, c).text),
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
    if (c.bound) {
      const st = s.sites[idx(c.x, c.y)];
      if (st && st.kind === 'vault') {
        st.guard = null;
        vaultAdvance(s, st);
      }
    }
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
      if (c.bound) continue;
      const sp = spOf(s, c);
      if (c.cool > 0) c.cool--;
      let d = Math.max(Math.abs(c.x - p.x), Math.abs(c.y - p.y));
      let moved = false;
      const chase =
        sp.rare !== 'docile' &&
        c.cool === 0 &&
        ((sp.temper === 'hunter' && d <= 5 && srand(s) < 0.6) || (sp.temper === 'territorial' && d <= 2));
      if (chase && d > 0) {
        const dx = Math.sign(p.x - c.x),
          dy = Math.sign(p.y - c.y),
          nx = Math.abs(p.x - c.x) >= Math.abs(p.y - c.y) ? c.x + dx : c.x,
          ny = nx === c.x ? c.y + dy : c.y;
        if (s.terrain[idx(nx, ny)] !== 2) {
          c.x = nx;
          c.y = ny;
          moved = true;
        }
        d = Math.max(Math.abs(c.x - p.x), Math.abs(c.y - p.y));
      }
      if (d <= 3 && !c.seen && !s.weather.storm) {
        c.seen = true;
        say(
          s,
          (dirTo(s, c.x, c.y) === 'here' ? 'Something moves right beside you' : 'Something moves to the ' + dirTo(s, c.x, c.y)) +
            ': a ' +
            sp.name +
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

  /* Quest, town and vault */
  const hasItem = (s, base) => s.player.items.some((i) => i.base === base);
  const atTown = (s) => {
    const st = siteHere(s);
    return !!st && st.kind === 'town';
  };
  function mark(s, x, y) {
    reveal(s, x, y, 1.5, true);
    const st = s.sites[idx(x, y)];
    if (st) st.seen = true;
  }
  function findSite(s, kind) {
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
  function findLoose(s, base) {
    for (const k in s.depots)
      if (s.depots[k].items.some((i) => i.base === base)) return { x: k % W, y: Math.floor(k / W), who: s.depots[k].remains };
    return null;
  }
  function objective(s) {
    const q = s.quest,
      t = s.town,
      v = findSite(s, 'vault'),
      to = (p) => dirTo(s, p.x, p.y);
    if (!hasItem(s, 'relic')) {
      const lr = findLoose(s, 'relic');
      if (lr) return { text: 'Take up the ' + q.relic + (lr.who ? ' from ' + lr.who + "'s body" : ''), dir: to(lr) };
    }
    if (!hasItem(s, 'key') && !hasItem(s, 'relic') && !v.st.open) {
      const lk = findLoose(s, 'key');
      if (lk) return { text: 'Take the key to the ' + q.vault.name + (lk.who ? ' from ' + lk.who + "'s body" : ''), dir: to(lk) };
    }
    if (hasItem(s, 'relic')) {
      const d = q.dest === 'beacon' ? s.goal : findSite(s, 'shrine');
      return { text: 'Carry the ' + q.relic + ' to the ' + q.dest, dir: to(d) };
    }
    if (v.st.depth >= v.st.floors.length) return { text: 'Recover the ' + q.relic + ', wherever it was left', dir: null };
    if (v.st.open || hasItem(s, 'key'))
      return { text: (v.st.open ? 'Go down into the ' : 'Unlock the ') + q.vault.name, dir: q.told || v.st.seen ? to(v) : null };
    if (!q.told) return { text: 'Find the town', dir: to(t) };
    if (q.key === 'beast') {
      const c = s.creatures.find((x) => x.id === q.beast);
      return c
        ? { text: 'Kill the ' + spOf(s, c).name + ', which has the key', dir: to(c) }
        : { text: 'Take the key from the lair', dir: null };
    }
    if (q.key === 'ruin')
      return { text: 'Search the ruin where the key lies', dir: to({ x: q.keyTile % W, y: Math.floor(q.keyTile / W) }) };
    return { text: 'Find the key to the ' + q.vault.name, dir: null };
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
      for (const k in s.sites)
        if (s.sites[k].sure) {
          s.sites[k].known = true;
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
        const c = s.creatures.find((x) => x.id === q.beast);
        if (c) {
          c.seen = true;
          mark(s, c.x, c.y);
          sp.push(
            '"The key is gone. The ' +
              spOf(s, c).name +
              ' took the last warden, key and all. Its lair is marked too. I am sorry."',
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
        sp.push(
          '"What else do we remember of the ' + s.civ.name + '? Only this: ' + tx.label.toLowerCase() + '. ' + tx.text + '"',
        );
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
  function vaultAdvance(s, st) {
    st.depth++;
    if (st.depth < st.floors.length) {
      say(s, 'The way down to level ' + (st.depth + 1) + ' is clear.');
      return;
    }
    const it = makeItem(s, 'relic', null, null, true);
    it.label = s.quest.relic;
    depotHere(s, true).items.push(it);
    gainXp(s, 50);
    say(s, 'At the bottom, on a plinth, lies the ' + s.quest.relic + '. Open Pack to take it.', 'good');
  }
  function descend(s) {
    const st = siteHere(s);
    if (s.over || !st || st.kind !== 'vault' || !st.open || st.depth >= st.floors.length) return false;
    if (stat(s, 'nightSight', 0) <= 0) {
      say(s, 'It is black as pitch below. You need a light: a worn lantern with fuel will do.', 'bad');
      return false;
    }
    if (st.guard) {
      const c = s.creatures.find((x) => x.id === st.guard);
      if (c) {
        c.cool = 0;
        startCombat(s, c, false);
        return true;
      }
      st.guard = null;
    }
    advance(s, 30, 'rest');
    if (s.over) return true;
    const kind = st.floors[st.depth],
      lvl = st.depth + 1;
    if (kind === 'guard') {
      const c = makeCreature(s, 100 + lvl, s.quest.guardSp, s.player.x, s.player.y, lvl >= st.floors.length ? 2 : 1);
      c.bound = true;
      s.creatures.push(c);
      st.guard = c.id;
      say(s, 'Level ' + lvl + '. Something stands up in the dark.', 'bad');
      startCombat(s, c, false);
    } else if (kind === 'loot') {
      const it = genItem(s, { relic: true, noConsumables: true }),
        n = roll(s, 3, 6);
      depotHere(s, true).items.push(it);
      s.player.coin += n;
      say(s, 'Level ' + lvl + '. A store-room, untouched: ' + itemName(it) + ' and ' + n + ' coin.', 'good');
      vaultAdvance(s, st);
    } else {
      if (stat(s, 'trapSafe', 0) > 0)
        say(s, 'Level ' + lvl + '. You find the pressure plate with your fingertips, and step over it.', 'good');
      else {
        const n = Math.min(roll(s, 1, 6) + 2, Math.max(0, Math.ceil(s.player.hp) - 1));
        s.player.hp -= n;
        say(s, 'Level ' + lvl + '. Darts from the wall: ' + n + ' damage.', 'bad');
      }
      vaultAdvance(s, st);
    }
    return true;
  }
  function offer(s) {
    const st = siteHere(s);
    if (s.over || !st || st.kind !== 'shrine' || s.quest.dest !== 'shrine' || !hasItem(s, 'relic')) return false;
    s.over = { won: true };
    say(s, 'You set the ' + s.quest.relic + ' on the shrine. Something that was held breath for an age lets go.', 'good');
    return true;
  }

  /* Items */
  function makeItem(s, baseId, pre, suf, known) {
    const b = byId(C.bases, baseId);
    const it = { id: s.nextId++, base: baseId, pre: pre || null, suf: suf || null, known: !!known || !!b.plain, carried: 0 };
    if (b.mystery) it.effect = Math.floor(srand(s) * C.flasks.length);
    return it;
  }
  function genItem(s, o) {
    o = o || {};
    const fav = o.civ ? trait(s, 'style').favors : [],
      wOf = (b) => b.w * (fav.includes(b.id) ? 3 : 1);
    const pool = C.bases.filter((b) => b.w > 0 && !(o.noConsumables && b.consumable) && !(o.onlyConsumables && !b.consumable));
    let tot = pool.reduce((a, b) => a + wOf(b), 0),
      r = srand(s) * tot,
      base = pool[0];
    for (const b of pool) {
      r -= wOf(b);
      if (r <= 0) {
        base = b;
        break;
      }
    }
    let pre = null,
      suf = null;
    if (!base.consumable) {
      const fits = (pos) => C.affixes.filter((a) => a.pos === pos && (a.for === 'gear' || a.for.includes(base.id)));
      const pick = (a) => a[Math.floor(srand(s) * a.length)];
      const ch = o.relic ? 0.8 : 0.45;
      if (srand(s) < ch) pre = pick(fits('pre')).id;
      if (srand(s) < ch) suf = pick(fits('suf')).id;
    }
    const it = makeItem(s, base.id, pre, suf, false);
    if (o.civ && !base.consumable && srand(s) < 0.5) {
      it.mark = s.civ.affinity;
      it.markName = s.civ.name;
    }
    return it;
  }
  function itemName(it) {
    const b = byId(C.bases, it.base);
    if (it.label) return it.label;
    if (!it.known) return b.name + ' (unstudied)';
    if (b.mystery) return C.flasks[it.effect].name;
    const p = it.pre ? byId(C.affixes, it.pre).name + ' ' : '',
      f = it.suf ? ' ' + byId(C.affixes, it.suf).name : '';
    const mk = it.mark ? it.markName + ' ' : '';
    return p || f || mk ? mk + p + b.name + f : b.plain ? b.name : 'Plain ' + b.name;
  }
  function itemAffixes(it) {
    const a = [it.pre, it.suf].filter(Boolean).map((id) => byId(C.affixes, id));
    if (it.mark) a.push(byId(C.civ.affinity, it.mark));
    return a;
  }
  function itemWeight(s, it) {
    let w = byId(C.bases, it.base).wt;
    if (!s.off.affixes) for (const a of itemAffixes(it)) if (a.wtMul !== undefined) w *= a.wtMul;
    return w;
  }
  function weight(s) {
    return s.player.water + s.player.fuel * 0.5 + s.player.items.reduce((a, it) => a + itemWeight(s, it), 0);
  }

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
        if (s.weather.storm) for (const m of biomeOf(s).storm.mods) out.push(m);
      },
    },
    {
      id: 'gods',
      fn(s, out) {
        if (!s.pact) return;
        const d = clock(s).isDay ? 'day' : 'night';
        for (const m of byId(C.gods, s.pact).mods) if (!m.when || m.when === d) out.push(m);
      },
    },
    {
      id: 'shelter',
      fn(s, out) {
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

  /* Systems: each reads state, changes its own part, and can be switched off (rule 4). */
  const SYSTEMS = [
    {
      id: 'weather',
      fn(s) {
        if (s.off.weather) {
          s.weather.storm = false;
          return;
        }
        if (s.time >= s.weather.changeAt) {
          s.weather.storm = !s.weather.storm;
          s.weather.changeAt = s.time + (s.weather.storm ? 180 + srand(s) * 240 : (480 + srand(s) * 720) * s.tun.stormGap);
          say(
            s,
            s.weather.storm ? 'A ' + biomeOf(s).storm.name + ' breaks over you.' : 'The ' + biomeOf(s).storm.name + ' passes.',
            s.weather.storm ? 'bad' : 'good',
          );
        }
      },
    },
    {
      id: 'thirst',
      fn(s, dt, ctx) {
        let rate = stat(s, 'waterDrain', s.tun.waterPerHour);
        if (ctx.activity !== 'move') rate *= s.tun.restWaterFactor;
        if (s.player.water > 0) rate += stat(s, 'leak', 0);
        s.player.water = Math.max(0, s.player.water - rate * dt);
        if (s.player.water <= 0) {
          s.player.stamina -= 15 * dt;
          s.cause = 'thirst';
        }
      },
    },
    {
      id: 'warmth',
      fn(s, dt) {
        const cold =
          stat(s, 'cold', phase(s).cold * s.tun.coldScale) +
          (s.weather.storm ? stat(s, 'stormCold', biomeOf(s).storm.cold * s.tun.coldScale) : 0);
        const warm = stat(s, 'warm', phase(s).warm);
        s.player.warmth = clamp(s.player.warmth + (warm - cold) * dt, 0, 100);
        if (s.player.warmth <= 0) {
          s.player.stamina -= 12 * dt;
          s.cause = 'cold';
        }
      },
    },
    {
      id: 'lantern',
      fn(s, dt, ctx) {
        if (clock(s).isDay || ctx.activity !== 'move' || s.player.fuel <= 0) return;
        if (!s.player.items.some((it) => it.base === 'lantern')) return;
        s.player.fuel = Math.max(0, s.player.fuel - s.tun.lanternFuelPerHour * stat(s, 'fuelUse', 1) * dt);
        if (s.player.fuel <= 0) say(s, 'Your lantern gutters out. No fuel left.', 'bad');
      },
    },
    {
      id: 'identify',
      fn(s, dt) {
        for (const it of s.player.items)
          if (!it.known && active(it)) {
            it.carried += dt;
            if (it.carried >= s.tun.autoIdHours * stat(s, 'studyTime', 1)) {
              it.known = true;
              say(s, 'After long use you understand it: ' + itemName(it) + '.', isCursed(it) ? 'bad' : 'good');
            }
          }
      },
    },
    {
      id: 'vitals',
      fn(s) {
        const p = s.player,
          w = s.warn;
        if (p.water <= 1 && !w.water) {
          w.water = true;
          say(s, p.water <= 0 ? 'You are out of water.' : 'You are nearly out of water.', 'bad');
        } else if (p.water > 1.5) w.water = false;
        if (p.warmth <= 25 && !w.warmth) {
          w.warmth = true;
          say(s, 'You are shivering badly.', 'bad');
        } else if (p.warmth > 35) w.warmth = false;
        if (p.stamina <= 0) {
          p.stamina = 0;
          if (s.over) return;
          if ((p.water <= 0 && !s.off.thirst) || (p.warmth <= 0 && !s.off.warmth)) {
            s.over = { won: false, cause: p.water <= 0 ? 'thirst' : 'cold' };
            say(
              s,
              p.water <= 0 ? 'You collapse, dry as the ground. The land keeps you.' : 'The cold takes you in your sleep.',
              'bad',
            );
          }
        }
      },
    },
  ];
  const isCursed = (it) => itemAffixes(it).some((a) => a.cursed);

  function advance(s, minutes, activity) {
    let left = minutes;
    while (left > 0 && !s.over) {
      const step = Math.min(15, left);
      left -= step;
      s.time += step;
      for (const sys of SYSTEMS) if (!s.off[sys.id]) sys.fn(s, step / 60, { activity });
    }
  }

  /* World generation */
  function newGame(seed) {
    seed = seed >>> 0 || 1;
    const r = mulberry(seed),
      pick = (a) => a[Math.floor(r() * a.length)];
    const biome = pick(C.biomes),
      god = pick(C.gods),
      civ = {};
    for (const ax of AXES) civ[ax] = pick(C.civ[ax]).id;
    {
      const st = byId(C.civ.style, civ.style);
      civ.name = pick(st.a) + pick(st.b) + pick(st.c);
    }
    const habit = byId(C.civ.habit, civ.habit),
      age = byId(C.civ.age, civ.age),
      doom = byId(C.civ.doom, civ.doom);
    const layer = (cells) => {
      const g = [];
      for (let i = 0; i < (cells + 1) * (cells + 1); i++) g.push(r());
      return (x, y) => {
        const fx = (x / W) * cells,
          fy = (y / H) * cells,
          x0 = Math.floor(fx),
          y0 = Math.floor(fy);
        let tx = fx - x0,
          ty = fy - y0;
        tx = tx * tx * (3 - 2 * tx);
        ty = ty * ty * (3 - 2 * ty);
        const v = (i, j) => g[j * (cells + 1) + i];
        return (v(x0, y0) * (1 - tx) + v(x0 + 1, y0) * tx) * (1 - ty) + (v(x0, y0 + 1) * (1 - tx) + v(x0 + 1, y0 + 1) * tx) * ty;
      };
    };
    const n1 = layer(5),
      n2 = layer(11),
      hts = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) hts.push(n1(x, y) * 0.65 + n2(x, y) * 0.3 + r() * 0.05);
    const sorted = hts.slice().sort((a, b) => a - b),
      q = (f) => sorted[Math.min(sorted.length - 1, Math.floor(f * sorted.length))];
    const mT = q(1 - biome.mountains),
      hT = q(1 - biome.mountains - biome.hills);
    const terrain = hts.map((h) => (h >= mT ? 2 : h >= hT ? 1 : 0)),
      elev = terrain.slice();
    const n3 = layer(8),
      lowT = q(biome.special.frac * (1 - biome.mountains - biome.hills) * 1.0),
      fT = 1 - biome.forest.frac * 1.6;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = idx(x, y);
        if (terrain[i] === 0 && hts[i] <= lowT) {
          terrain[i] = 5;
          elev[i] = -0.15;
        } else if (terrain[i] < 2 && n3(x, y) * 0.7 + n2(x + 9, y + 5) * 0.3 > fT * 0.72 + 0.14) terrain[i] = 3;
      }
    for (let k = 0; k < biome.river.count; k++) {
      // rivers run downhill from high ground until they reach low ground or the map edge
      let best = -1,
        bh = -1;
      for (let tries = 0; tries < 40; tries++) {
        const x = 4 + Math.floor(r() * (W - 8)),
          y = 2 + Math.floor(r() * (H - 4)),
          i = idx(x, y);
        if (hts[i] > bh && terrain[i] !== 4) {
          bh = hts[i];
          best = i;
        }
      }
      let cx = best % W,
        cy = Math.floor(best / W);
      const seenR = {};
      for (let step = 0; step < 70; step++) {
        const i = idx(cx, cy);
        seenR[i] = 1;
        if (terrain[i] !== 2) {
          if (terrain[i] === 5 && step > 6) break;
          terrain[i] = 4;
          elev[i] = -0.5;
        }
        let nb = null,
          nh = 9;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const xx = cx + dx,
            yy = cy + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) {
            nb = 'edge';
            nh = -1;
            break;
          }
          const j = idx(xx, yy);
          if (seenR[j]) continue;
          const hh = hts[j] + r() * 0.035;
          if (hh < nh) {
            nh = hh;
            nb = [xx, yy];
          }
        }
        if (!nb || nb === 'edge') break;
        cx = nb[0];
        cy = nb[1];
      }
    }
    // You start in the middle. The town, the locked place and the beacon lie in three different directions.
    const sx = 17 + Math.floor(r() * 3),
      sy = 17 + Math.floor(r() * 3),
      a0 = r() * 6.283;
    const polar = (ang, rad) => ({
      x: clamp(Math.round(sx + Math.cos(ang) * rad), 2, W - 3),
      y: clamp(Math.round(sy + Math.sin(ang) * rad), 2, H - 3),
    });
    const townP = polar(a0, 6 + r() * 2),
      vaultP = polar(a0 + 1.9 + (r() - 0.5) * 0.5, 10 + r() * 2),
      goalP = polar(a0 + 3.9 + (r() - 0.5) * 0.5, 11 + r() * 2),
      gx = goalP.x,
      gy = goalP.y;
    for (const pt of [{ x: sx, y: sy }, townP, vaultP, goalP]) {
      const i = idx(pt.x, pt.y);
      terrain[i] = 0;
      elev[i] = 0;
    }
    const sites = {};
    sites[idx(sx, sy)] = { kind: 'well', seen: true };
    sites[idx(gx, gy)] = { kind: 'beacon' };
    sites[idx(townP.x, townP.y)] = { kind: 'town' };
    {
      const F = C.quest.floors;
      sites[idx(vaultP.x, vaultP.y)] = {
        kind: 'vault',
        open: false,
        depth: 0,
        guard: null,
        floors: [F[Math.floor(r() * F.length)], F[Math.floor(r() * F.length)], 'guard'],
      };
    }
    const free = (x, y) => {
      for (let j = -2; j <= 2; j++)
        for (let i = -2; i <= 2; i++) {
          const xx = x + i,
            yy = y + j;
          if (xx >= 0 && yy >= 0 && xx < W && yy < H && sites[idx(xx, yy)]) return false;
        }
      return true;
    };
    function place(n, mk, want, spread) {
      spread = spread || H; // stratified across west-to-east bands so no stretch of the map is empty
      for (let k = 0; k < n; k++) {
        const x0 = 3 + Math.floor((k * (W - 6)) / n),
          x1 = 3 + Math.floor(((k + 1) * (W - 6)) / n);
        for (let tries = 0; tries < 300; tries++) {
          const x = x0 + Math.floor(r() * Math.max(1, x1 - x0)),
            y = clamp(1 + Math.floor((((k % 2) + r()) * (H - 2)) / 2), 1, H - 2),
            t = terrain[idx(x, y)];
          if (t === 2 || t >= 4 || !free(x, y)) continue;
          if (want !== undefined && t !== want && tries < 150) continue;
          sites[idx(x, y)] = mk();
          break;
        }
      }
    }
    // A spring is guaranteed partway along each leg of the quest, so no leg is a blind gamble on water.
    for (const [a, b] of [
      [townP, vaultP],
      [vaultP, goalP],
      [{ x: sx, y: sy }, goalP],
    ]) {
      const mx = Math.round((a.x + b.x) / 2),
        my = Math.round((a.y + b.y) / 2);
      for (let rad = 0; rad < 4; rad++) {
        let done = false;
        for (let j = -rad; j <= rad && !done; j++)
          for (let i = -rad; i <= rad && !done; i++) {
            const x = clamp(mx + i, 1, W - 2),
              y = clamp(my + j, 1, H - 2),
              k = idx(x, y);
            if (terrain[k] === 2 || terrain[k] >= 4 || sites[k]) continue;
            sites[k] = { kind: 'spring', foul: false, known: false, sure: true };
            done = true;
          }
        if (done) break;
      }
    }
    place(biome.springs + 1, () => ({ kind: 'spring', foul: r() < biome.foul, known: false }), 0);
    place(age.ruins, () => ({ kind: 'ruin', searched: false }), habit.onHills ? 1 : 0);
    place(4, () => ({ kind: 'cave', searched: false, loot: r() < 0.4 }), 1);
    place(4, () => ({
      kind: 'cache',
      searched: false,
      loot: r() < 0.5,
      fuel: 1 + Math.floor(r() * 3),
      water: 1 + Math.floor(r() * 3),
    }));
    place(1, () => ({ kind: 'shrine' }));
    const ruinTiles = Object.keys(sites)
        .filter((k) => sites[k].kind === 'ruin')
        .map(Number)
        .sort((a, b) => (a % W) - (b % W)),
      road = {};
    if (habit.roads)
      for (let k = 0; k + 1 < ruinTiles.length; k++) {
        let x = ruinTiles[k] % W,
          y = Math.floor(ruinTiles[k] / W);
        const tx = ruinTiles[k + 1] % W,
          ty = Math.floor(ruinTiles[k + 1] / W);
        road[idx(x, y)] = 1;
        while (x !== tx || y !== ty) {
          if (x !== tx && (y === ty || r() < Math.abs(tx - x) / (Math.abs(tx - x) + Math.abs(ty - y)))) x += Math.sign(tx - x);
          else y += Math.sign(ty - y);
          road[idx(x, y)] = 1;
        }
      }
    for (const k in sites) {
      const st = sites[k];
      if (st.kind === 'cache' && doom.emptyCaches) {
        st.fuel = 0;
        st.water = 0;
        st.loot = false;
      }
      if (st.kind === 'spring' && doom.foulSprings)
        for (const rt of ruinTiles)
          if (Math.max(Math.abs((rt % W) - (k % W)), Math.abs(Math.floor(rt / W) - Math.floor(k / W))) <= doom.foulSprings)
            st.foul = true;
    }
    const s = {
      v: VERSION,
      seed,
      rng: Math.floor(r() * 4294967296) | 0,
      w: W,
      h: H,
      terrain,
      elev,
      dug: {},
      seen: new Array(W * H).fill(0),
      sites,
      depots: {},
      biome: biome.id,
      civ,
      civKnown: {},
      road,
      god: god.id,
      known: { civ: false, god: false },
      pact: null,
      camp: idx(sx, sy),
      goal: { x: gx, y: gy },
      player: null,
      start: { x: sx, y: sy },
      char: null,
      travellers: 1,
      lostMaps: {},
      offer: null,
      time: 0,
      weather: { storm: false, changeAt: 0 },
      log: [],
      warn: {},
      over: null,
      cause: null,
      nextId: 1,
      tun: JSON.parse(JSON.stringify(C.tun)),
      off: {},
      stats: { moves: 0, trips: 0 },
    };
    s.weather.changeAt = (360 + r() * 600) * s.tun.stormGap;
    const draw = (list, n) => {
      const a = list.map((e) => e.id);
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a.slice(0, n);
    };
    s.offer = { races: draw(C.races, C.offer.races), classes: draw(C.classes, C.offer.classes) };
    s.species = makeSpecies(s, r);
    s.creatures = [];
    makeQuest(s, r, townP, vaultP, a0, goalP);
    placeCreatures(s, r);
    spawn(s, makeChar(r, s));
    s.depots[s.camp] = {
      water: 0,
      fuel: 3,
      items: [makeItem(s, 'cloak', null, null, true), makeItem(s, 'lantern', null, null, true)],
    };
    say(s, 'Dawn, day 1. ' + biome.name + '. ' + biome.blurb);
    say(
      s,
      'Somewhere to the ' +
        dirTo(s, townP.x, townP.y) +
        ' there is a town. Find it: its people know what this land is waiting for.',
    );
    say(s, 'Your camp has a well. A cloak, a lantern and fuel are stored here: open Pack to take them.');
    if (typeof INTRO_EXTRA === 'string') say(s, INTRO_EXTRA);
    return s;
  }

  const DIRS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
  function dirTo(s, x, y) {
    const dx = x - s.player.x,
      dy = y - s.player.y;
    if (!dx && !dy) return 'here';
    return DIRS[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
  }
  const bearing = (s) => dirTo(s, s.goal.x, s.goal.y);
  const SITE_NAME = {
    spring: 'spring',
    cave: 'cave',
    cache: 'old cache',
    shrine: 'shrine',
    well: 'well',
    beacon: 'beacon',
    town: 'town',
  };
  const siteName = (s, site) =>
    site.kind === 'ruin'
      ? s.known.civ
        ? civOf(s).ruin
        : 'ruin'
      : site.kind === 'vault'
        ? s.quest.vault.name
        : SITE_NAME[site.kind];

  function reveal(s, cx, cy, rad, quiet) {
    const found = [];
    for (let y = Math.max(0, Math.floor(cy - rad)); y <= Math.min(H - 1, Math.ceil(cy + rad)); y++)
      for (let x = Math.max(0, Math.floor(cx - rad)); x <= Math.min(W - 1, Math.ceil(cx + rad)); x++) {
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > rad * rad + 0.5) continue;
        const i = idx(x, y);
        if (!s.seen[i]) {
          s.seen[i] = 1;
          const st = s.sites[i];
          if (st && !st.seen) {
            st.seen = true;
            {
              const d = dirTo(s, x, y);
              found.push(siteName(s, st) + (d === 'here' ? ', right here' : ' to the ' + d));
            }
          }
        }
      }
    if (found.length && !quiet)
      say(s, 'You sight: ' + found.slice(0, 4).join('; ') + (found.length > 4 ? '; and more' : '') + '.', 'good');
    return found.length;
  }
  function sightRadius(s) {
    if (s.weather.storm) return 0.5;
    if (groundHere(s).blind) return 1;
    if (!clock(s).isDay) return stat(s, 'nightSight', 0) > 0 ? 1 : 0.5;
    return 2;
  }

  /* Actions */
  function moveCost(s, x, y) {
    const tt = s.terrain[idx(x, y)],
      tn = TERR[tt],
      g = terrainInfo(s, tt);
    let mins = g.moveMin * stat(s, 'moveTime', 1) * stat(s, 'moveTime.' + tn, 1);
    if (!clock(s).isDay && stat(s, 'nightSight', 0) <= 0) mins *= 2;
    let sta = g.moveSta;
    if (s.road[idx(x, y)]) {
      mins = s.tun.moveMin.plain * 0.55 * stat(s, 'moveTime', 1) * (!clock(s).isDay && stat(s, 'nightSight', 0) <= 0 ? 2 : 1);
      sta = s.tun.moveSta.plain * 0.7;
    }
    return { mins, cost: sta * s.tun.staminaScale * stat(s, 'staminaCost', 1), base: s.tun.moveMin.plain };
  }
  function move(s, dx, dy) {
    if (s.over) return false;
    const nx = s.player.x + dx,
      ny = s.player.y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) {
      say(s, 'The map ends here.');
      return false;
    }
    if (weight(s) > carryCap(s) + 1e-9) {
      say(s, 'You are carrying too much to move. Leave something here.', 'bad');
      return false;
    }
    const mc = moveCost(s, nx, ny),
      mins = mc.mins,
      cost = mc.cost;
    if (s.player.stamina < cost) {
      say(s, 'You are too exhausted to go on. Rest first.', 'bad');
      return false;
    }
    if (atCamp(s)) s.stats.trips++;
    s.player.stamina -= cost;
    s.player.x = nx;
    s.player.y = ny;
    s.stats.moves++;
    const g = groundHere(s),
      was = s.lastGround;
    s.lastGround = s.terrain[here(s)];
    if (g.wet && !s.off.warmth) s.player.warmth = Math.max(0, s.player.warmth - g.wet * s.tun.coldScale);
    if (s.lastGround !== was && s.lastGround >= 3)
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
    const st = siteHere(s);
    if (!st) return;
    st.seen = true;
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
      s.over = { won: true };
      say(s, 'You set the ' + s.quest.relic + ' in the beacon. The fire catches, and turns, and holds.', 'good');
      return;
    }
    if (st.kind === 'town' && !st.visited) gainXp(s, 20);
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
        town: 'The town of ' + s.town.name + '. Smoke, voices, a well. Enter it to talk and trade.',
        vault: 'The ' + s.quest.vault.name + '. A heavy door, and a stair going down behind it.',
        beacon:
          s.quest.dest === 'beacon'
            ? 'The beacon. Its fire is failing. It needs something it does not have.'
            : 'The beacon. Its fire is steady: whatever this land needs, it is not here.',
        shrine: 'A shrine to ' + godOf(s).name + ', raised by ' + (s.known.civ ? civOf(s).name : 'a lost people') + '.',
        well: 'The well at your first camp.',
      }[st.kind];
      say(s, txt);
    }
  }
  function survey(s) {
    if (s.over) return false;
    if (s.weather.storm) {
      say(s, 'You can see nothing through the ' + biomeOf(s).storm.name + '.');
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
      say(s, 'No fire will hold in this ' + biomeOf(s).storm.name + ' out in the open. Find shelter or trees.');
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
    const room = Math.max(0, waterCap(s) - s.player.water),
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
    if (st.kind === 'well' || st.kind === 'town') {
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
        s.player.stamina = Math.max(0, s.player.stamina - 15);
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
        s.player.stamina = Math.max(0, s.player.stamina - 5);
        say(s, 'You taste it and gag. This spring is foul. Boil it, or drink and pay for it.', 'bad');
        return true;
      }
      topUp(s);
      say(s, 'Sweet water. You fill up.', 'good');
      return true;
    }
    advance(s, 15, 'rest');
    if (st.foul) {
      s.player.stamina = Math.max(0, s.player.stamina - 15);
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
    if (s.over || !b.melt) return false;
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
      if (s.quest.keyTile === here(s)) {
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
    if (s.over || s.camp !== null) return false;
    const i = s.player.items.findIndex((it) => it.base === 'campkit');
    if (i < 0) return false;
    if (!inShelter(s)) {
      say(s, 'A camp needs shelter: a cave, a ruin or the well.');
      return false;
    }
    advance(s, 120, 'rest');
    if (s.over) return true;
    s.player.items.splice(i, 1);
    s.camp = here(s);
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
      a.push({ id: 'flee', label: 'Flee', hint: '-5 stamina' });
      return a;
    }
    if (s.char.cls === 'cleric' && p.hp < p.hpMax && p.mana >= 3) a.push({ id: 'mend', label: 'Mend', hint: 'heal, 3 mana' });
    a.push({ id: 'survey', label: 'Survey', hint: '30 min' });
    if (st) {
      if (
        st.kind === 'well' ||
        st.kind === 'town' ||
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
      if (st.kind === 'town') a.push({ id: 'townAsk', label: 'Enter ' + s.town.name, hint: 'talk, trade, rest' });
      if (st.kind === 'vault' && !st.open)
        a.push({
          id: 'unlock',
          label: 'Unlock the ' + s.quest.vault.name,
          hint: hasItem(s, 'key') ? 'you have the key' : 'needs the key',
        });
      if (st.kind === 'vault' && st.open && st.depth < st.floors.length)
        a.push({
          id: 'descend',
          label: st.guard ? 'Face the guardian again' : 'Descend',
          hint: 'level ' + (st.depth + 1) + ' of ' + st.floors.length + ', needs a light',
        });
    }
    const g = groundHere(s);
    if (!st && g.drink) a.push({ id: 'fill', label: 'Fill from the ' + g.name, hint: '15 min' });
    if (g.dig && !s.dug[here(s)]) a.push({ id: 'dig', label: 'Dig for water', hint: '1 h, -12 stamina' });
    if (g.gather) a.push({ id: 'gather', label: 'Gather wood', hint: '30 min, +1 fuel' });
    if (biomeOf(s).melt && cap - p.water >= 0.05) a.push({ id: 'melt', label: 'Melt snow', hint: '1 fuel' });
    a.push({ id: 'rest', label: 'Rest', hint: '1 h' });
    if (inShelter(s)) a.push({ id: 'sleep', label: atCamp(s) ? 'Sleep at camp' : 'Sleep in shelter', hint: 'until rested' });
    if (p.warmth < 95) a.push({ id: 'fire', label: 'Light a fire', hint: '1 fuel' });
    if (atCamp(s)) a.push({ id: 'packCamp', label: 'Strike camp', hint: '1 h' });
    else if (s.camp === null && inShelter(s) && p.items.some((i) => i.base === 'campkit'))
      a.push({ id: 'makeCamp', label: 'Pitch camp here', hint: '2 h' });
    return a;
  }
  function forecast(s) {
    const n = biomeOf(s).storm.name;
    if (s.off.weather) return 'Clear';
    if (s.weather.storm) return n.charAt(0).toUpperCase() + n.slice(1);
    if (!clock(s).isDay) return 'Night sky';
    const h = (s.weather.changeAt - s.time) / 60;
    return h > 6 ? 'Clear' : h > 2.5 ? 'Clouds building' : 'Storm close';
  }
  function shrineBearing(s) {
    if (stat(s, 'shrineSense', 0) <= 0) return null;
    for (const k in s.sites) if (s.sites[k].kind === 'shrine') return dirTo(s, k % W, Math.floor(k / W));
    return null;
  }
  function wellfinder(s) {
    if (stat(s, 'wellfinder', 0) <= 0) return null;
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
  function describeMods(mods) {
    const N = {
      studyTime: 'time to understand items',
      searchTime: 'search time',
      waterDrain: 'water use',
      cold: 'cold',
      stormCold: 'storm cold',
      staminaCost: 'effort',
      moveTime: 'travel time',
      'moveTime.hill': 'time on hills',
      'moveTime.mountain': 'time on mountains',
      'moveTime.plain': 'time on flat ground',
      restGain: 'rest',
      fuelUse: 'fuel use',
    };
    return mods
      .map((m) => {
        if (m.op === 'mul') {
          if (m.value === 0) return 'no ' + (N[m.stat] || m.stat);
          const p = Math.round((m.value - 1) * 100);
          if (!p) return '';
          return (N[m.stat] || m.stat) + ' ' + (p > 0 ? '+' : '') + p + '%';
        }
        if (m.stat === 'waterCap') return m.op === 'max' ? 'water limit ' + m.value : 'holds ' + m.value + ' water';
        if (m.stat === 'ac') return 'armor ' + (m.value > 0 ? '+' : '') + m.value;
        if (m.stat === 'hit') return 'to hit ' + (m.value > 0 ? '+' : '') + m.value;
        if (m.stat === 'dmg') return 'damage +' + m.value;
        if (m.stat === 'carryCap') return m.value ? 'carry ' + (m.value > 0 ? '+' : '') + m.value : '';
        if (m.stat === 'luck') return m.value ? 'luck +' + Math.round(m.value * 100) + '%' : '';
        if (m.stat === 'surveyRadius') return m.value ? 'survey range ' + (m.value > 0 ? '+' : '') + m.value : '';
        if (m.stat === 'nightSight') return m.needsFuel ? 'lights the night (burns fuel)' : 'see in the dark';
        if (m.stat === 'leak') return 'leaks ' + m.value + ' water an hour';
        if (m.stat === 'goalDistance') return 'shows distance to the beacon';
        if (m.stat === 'wellfinder') return 'points to the nearest spring';
        return m.stat;
      })
      .filter(Boolean)
      .join(', ');
  }
  function describeItem(s, it) {
    const b = byId(C.bases, it.base);
    if (b.quest) return b.quest;
    if (!it.known) return 'Unstudied. Whatever it does, it is already doing.';
    if (b.mystery) return describeUse(C.flasks[it.effect].use);
    if (b.consumable) return describeUse(b.use);
    if (b.id === 'campkit') return 'Pitch it in any shelter to make camp.';
    let mods = (b.mods || []).slice();
    const ax = itemAffixes(it);
    for (const a of ax) mods = mods.concat(a.mods);
    let t = b.weapon ? b.weapon.dice[0] + 'd' + b.weapon.dice[1] + ' damage' + (b.weapon.finesse ? ', uses Dexterity' : '') : '';
    {
      const dm = describeMods(mods);
      t += (t && dm ? ', ' : '') + dm;
    }
    for (const a of ax)
      if (a.wtMul !== undefined)
        t += (t ? ', ' : '') + (a.wtMul === 0 ? 'weighs nothing' : 'weighs ' + a.wtMul + ' times normal');
    return t;
  }
  const describeUse = (u) =>
    Object.keys(u)
      .map((k) => (u[k] > 0 ? '+' : '') + u[k] + ' ' + (k === 'hp' ? 'hit points' : k))
      .join(', ');

  const api = {
    VERSION,
    W,
    H,
    C,
    rollAbilities,
    nameFor,
    makeChar,
    scores,
    charSheet,
    charTitle,
    setCharacter,
    nextTraveller,
    livesLeft,
    shrineBearing,
    on,
    AXES,
    trait,
    traitText,
    civTraits,
    TERR,
    terrainInfo,
    groundHere,
    dig,
    gather,
    newGame,
    moveCost,
    move,
    survey,
    rest,
    sleep,
    fire,
    fill,
    boil,
    melt,
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
    clock,
    forecast,
    bearing,
    wellfinder,
    stat,
    weight,
    carryCap,
    waterCap,
    itemName,
    itemWeight,
    describeItem,
    isCursed,
    siteName,
    siteHere,
    depotHere,
    atCamp,
    inShelter,
    biomeOf,
    civOf,
    godOf,
    reveal,
    byId,
    objective,
    talkElder,
    buy,
    buyFuel,
    sell,
    sellPrice,
    appraise,
    inn,
    unlock,
    descend,
    offer,
    itemValue,
    hasItem,
    atTown,
    findSite,
    equip,
    unequip,
    slotOf,
    active,
    attack,
    power,
    firebolt,
    smite,
    mend,
    flee,
    identify,
    foe,
    spOf,
    formOf,
    playerAC,
    xpFor,
    weaponOf,
    SWITCHES: [
      ['weather', 'Weather'],
      ['warmth', 'Cold and warmth'],
      ['thirst', 'Thirst'],
      ['affixes', 'Item affixes'],
      ['gods', 'God pacts'],
    ],
  };
  for (const k of [
    'move',
    'survey',
    'rest',
    'sleep',
    'fire',
    'fill',
    'boil',
    'melt',
    'search',
    'pact',
    'packCamp',
    'makeCamp',
    'study',
    'transfer',
    'leaveItem',
    'takeItem',
    'dig',
    'gather',
    'equip',
    'unequip',
    'talkElder',
    'buy',
    'buyFuel',
    'sell',
    'appraise',
    'inn',
    'unlock',
    'descend',
    'offer',
  ]) {
    const fn = api[k];
    api[k] = function (s) {
      if (s.combat) return false;
      return fn.apply(null, arguments);
    };
  }
  return api;
})();
