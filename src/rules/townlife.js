/* Town life, from content/townlife.js: a town has a size (hamlet to city), a layout of streets and building lots that
   differs town to town, named people at their doors who sell, heal, teach, bless and map, townsfolk with rumours that
   point at real places, and a graveyard. Switch: s.off.townlife (when the world is made: the old small town comes back;
   in play: the people's services and the lessons' and blessing's modifiers stop). */
import { C, H, W, WALL, FLOOR, byId, clock, godOf, idx, on, say, srand, stream } from './core.js';
import './interiors.js'; // the old town generator, kept for the switch
import {
  GENERATORS,
  HOME,
  curTown,
  inTown,
  mapOf,
  townArea,
  townById,
  townSfx,
  withTown,
  worldMap,
  worldPos,
  homePos,
  outdoorRec,
} from './areas.js';
import { AXES, learn, traitText } from './civ.js';
import { dirFrom, siteHere, SITE_NAME } from './map.js';
import { findSite, mark } from './quest.js';
import { isCursed, itemName, makeItem } from './items.js';
import { gainXp } from './progress.js';
import { SOURCES, stat } from './stats.js';
import { ACTIONS, NOTES, SWITCHES, TALK, TOWN_MAKERS } from './hooks.js';

const L = () => C.townLife;
const SERVICE_IDS = () => L().services.map((x) => x.id);
const price = (s, k) => Math.max(0, Math.round(stat(s, 'town.' + k, L().prices[k])));
if (!C.bases.some((b) => b.id === 'mule')) {
  const m = L().mule;
  C.bases.push({ id: m.id, name: m.name, wt: m.wt, w: m.w, plain: true, mods: m.mods, text: m.text });
  C.value.mule = m.value;
}
for (const sv of L().services) SITE_NAME[sv.id] = sv.role.replace(/^the /, '') + "'s door";
Object.assign(SITE_NAME, { folk: 'townsperson', grave: 'grave' });

/* ---------- at world creation: size, services, lessons ---------- */
function rollLife(s, r) {
  const X = L(),
    pick = (a) => a[Math.floor(r() * a.length)];
  let t = X.sizes.reduce((a, e) => a + e.w, 0) * r(),
    size = X.sizes[0];
  for (const e of X.sizes)
    if ((t -= e.w) < 0) {
      size = e;
      break;
    }
  const cul = s.townCulture ? Object.values(s.townCulture).filter((v) => typeof v === 'string') : [],
    want = X.services.filter((sv) => sv.always.some((a) => cul.includes(a))).map((sv) => sv.id),
    rest = SERVICE_IDS().filter((id) => !want.includes(id));
  while (want.length < size.services && rest.length) want.push(rest.splice(Math.floor(r() * rest.length), 1)[0]);
  const ls = X.lessons.map((l) => l.id);
  s.town.size = size.id;
  s.town.services = want;
  s.town.lessons = [];
  while (s.town.lessons.length < X.lessonsOffered) s.town.lessons.push(ls.splice(Math.floor(r() * ls.length), 1)[0]);
  // bigger towns have more for sale
  if (size.stock < 0) s.town.stock.splice(5, -size.stock);
  for (let i = 0; i < size.stock; i++) {
    const b = pick(['sword', 'spear', 'cloak', 'boots', 'framepack', 'compass', 'spyglass', 'salve', 'tonic', 'draught']);
    s.town.stock.push(makeItem(s, b, null, null, true));
  }
}
on('worldBorn', (s, d) => {
  if (!d.off.townlife) rollLife(s, stream(s.seed, 'townlife'));
});
// any other town is given its size, services and lessons the same way, as it is made
TOWN_MAKERS.push((s, t, r) => {
  if (!s.off.townlife) rollLife(s, r);
});

/* ---------- the layout ---------- */
const oldTown = GENERATORS.town;
GENERATORS.town = (s, rec) => withTown(s, townById(s, rec.id) || s.town, () => lifeTown(s, rec));
function lifeTown(s, rec) {
  if (s.off.townlife || !s.town.size) return oldTown(s, rec);
  const X = L(),
    size = byId(X.sizes, s.town.size),
    r = stream(s.seed, 'area:town2' + townSfx(s)),
    rw = stream(s.seed, 'town:walls' + townSfx(s)),
    pick = (a) => a[Math.floor(r() * a.length)],
    terrain = new Array(W * H).fill(FLOOR),
    sites = {},
    c = 18,
    big = size.id === 'town' || size.id === 'city',
    plaza = { hamlet: 3, village: 4, town: 5, city: 6 }[size.id],
    walled = rw() < size.walled,
    ring = (x, y) => big && Math.max(Math.abs(x - c), Math.abs(y - c)) === 12,
    street = (x, y) => Math.abs(x - c) <= 1 || Math.abs(y - c) <= 1 || ring(x, y),
    used = new Array(W * H).fill(0);
  if (walled)
    for (let i = 0; i < W; i++)
      for (const [x, y] of [
        [i, 0],
        [i, H - 1],
        [0, i],
        [W - 1, i],
      ])
        terrain[idx(x, y)] = WALL;
  // building lots along the four main streets, on both sides, stepping out from the square
  const lots = [];
  for (const [ax, ay] of [
    [0, -1],
    [0, 1],
    [1, 0],
    [-1, 0],
  ])
    for (const side of [-1, 1]) {
      let pos = plaza + 1;
      while (pos < 15) {
        const len = 3 + Math.floor(r() * 3),
          depth = 3 + Math.floor(r() * 3),
          cells = [];
        let door = null;
        for (let a = 0; a < len; a++)
          for (let b = 0; b < depth; b++) {
            const along = pos + a,
              across = 3 + b; // two tiles off the street's middle: one tile of street edge, one gap for the door
            const x = c + ax * along + (ax ? 0 : side * across),
              y = c + ay * along + (ay ? 0 : side * across);
            cells.push([x, y]);
          }
        {
          const along = pos + Math.floor(len / 2);
          door = { x: c + ax * along + (ax ? 0 : side * 2), y: c + ay * along + (ay ? 0 : side * 2) };
        }
        const ok = cells.every(([x, y]) => {
          if (x < 2 || y < 2 || x > W - 3 || y > H - 3 || street(x, y)) return false;
          for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (used[idx(x + i, y + j)]) return false;
          return true;
        });
        if (ok) {
          for (const [x, y] of cells) used[idx(x, y)] = 1;
          lots.push({ cells, door, dist: pos, arm: ay < 0 ? 'N' : ay > 0 ? 'S' : ax > 0 ? 'E' : 'W' });
          pos += len + 1;
        } else pos += 1;
      }
    }
  lots.sort((a, b) => a.dist - b.dist || (a.arm === 'N' ? -1 : 0));
  const names = byId(C.races, s.town.race).names.slice(),
    taken = new Set([s.town.elder, s.town.merchant]),
    nameOf = () => {
      const free = names.filter((n) => !taken.has(n)),
        n = free.length ? pick(free) : pick(names) + ' the Younger';
      taken.add(n);
      return n;
    };
  const build = (lot, site) => {
    for (const [x, y] of lot.cells) terrain[idx(x, y)] = WALL;
    if (site) sites[idx(lot.door.x, lot.door.y)] = Object.assign({ seen: true }, site);
  };
  // the elder's hall on the north street, then the inn, the shop and the services nearest the square
  const north = lots.findIndex((l) => l.arm === 'N');
  const order = [lots.splice(north >= 0 ? north : 0, 1)[0], ...lots.splice(0)];
  const queue = [
    { kind: 'elder' },
    { kind: 'inn' },
    { kind: 'shop' },
    ...s.town.services.map((id) => ({ kind: id, name: nameOf(), role: byId(X.services, id).role })),
  ];
  let li = 0;
  for (const q of queue) if (order[li]) build(order[li++], q);
  // a graveyard in the next lot, if the town is big enough for one
  if (size.graveyard && order[li]) {
    const lot = order[li++],
      sp = s.species.filter((x) => !x.named),
      fill = (t) =>
        t
          .replace('{storm}', byId(C.biomes, s.biome).storm.name)
          .replace('{species}', sp.length ? pick(sp).name : 'wolf')
          .replace('{dir}', pick(['north', 'south', 'east', 'west']))
          .replace('{site}', pick(['spring', 'ruin', 'cave'])),
      nm = byId(C.races, s.town.race).names;
    lot.cells.forEach(([x, y], i) => {
      if ((x + y) % 2 === 0 && i % 2 === 0)
        sites[idx(x, y)] = { kind: 'grave', seen: true, name: pick(nm), text: fill(pick(X.epitaphs)) };
    });
  }
  // houses in the rest, sparse in a hamlet, packed in a city
  const fill = { hamlet: 0.35, village: 0.55, town: 0.8, city: 1 }[size.id];
  for (; li < order.length; li++) if (r() < fill) build(order[li], null);
  sites[idx(c, c)] = { kind: 'well', seen: true };
  // townsfolk standing about in the streets
  for (let n = 0, tries = 0; n < size.folk && tries < 300; tries++) {
    const x = 2 + Math.floor(r() * (W - 4)),
      y = 2 + Math.floor(r() * (H - 4)),
      k = idx(x, y);
    if (terrain[k] !== FLOOR || sites[k] || (Math.abs(x - c) <= 1 && Math.abs(y - c) <= 1)) continue;
    let nearDoor = false;
    for (const key in sites) if (Math.abs((key % W) - x) + Math.abs(Math.floor(key / W) - y) <= 1) nearDoor = true;
    if (nearDoor) continue;
    sites[k] = { kind: 'folk', seen: true, name: nameOf(), role: pick(X.folkRoles) };
    n++;
  }
  if (walled) {
    const ends = [
        [c, H - 1],
        [c, 0],
        [0, c],
        [W - 1, c],
      ],
      n = 2 + Math.floor(rw() * 3);
    for (let k = 0; k < n; k++) {
      terrain[idx(ends[k][0], ends[k][1])] = FLOOR;
      sites[idx(ends[k][0], ends[k][1])] = { kind: 'gate', seen: true };
    }
  }
  rec.walled = walled;
  s.town.walled = walled;
  rec.entry = { x: c, y: H - 2 };
  return { terrain, sites, seen: new Array(W * H).fill(1) };
}

/* ---------- talking to people ---------- */
const svc = (kind) => byId(L().services, kind);
const atPerson = (s, kind) => inTown(s) && siteHere(s) && siteHere(s).kind === kind;
const learned = (s) => (s.char && s.char.lessons) || [];
const blessed = (s) => s.blessUntil && s.time < s.blessUntil;

// Where a place in any area lies from here, in words.
const dirOf = (s, area, x, y) => {
  const p = homePos(s, area, x, y);
  return dirFrom(worldPos(s), p.x, p.y);
};
const markIn = (s, area, k) => {
  const m = mapOf(s, area);
  if (!m) return;
  const x = k % W,
    y = Math.floor(k / W);
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) if (x + i >= 0 && y + j >= 0 && x + i < W && y + j < H) m.seen[idx(x + i, y + j)] = 1;
  if (m.sites[k]) m.sites[k].seen = true;
};
// A rumour about something real, marked on your map, or else a bit of talk.
function rumour(s) {
  const pick = (a) => a[Math.floor(srand(s) * a.length)],
    out = [];
  for (const id in s.areas) {
    const a = s.areas[id],
      m = mapOf(s, id);
    if (a.kind !== 'region' || !m || !m.creatures) continue;
    for (const c of m.creatures)
      if (c.lair && !c.seen)
        out.push(
          () => (
            markIn(s, id, c.y * W + c.x),
            '"They say the ' +
              s.species[c.sp].name +
              ' lies in a cave to the ' +
              dirOf(s, id, c.x, c.y) +
              ', on a hoard. Nobody who went for it came back."'
          ),
        );
    for (const k in m.depots)
      if (m.depots[k].items.some((i) => i.art))
        out.push(
          () => (
            markIn(s, id, +k),
            '"My uncle swore there is a cache to the ' +
              dirOf(s, id, k % W, Math.floor(k / W)) +
              ' with something in it the ' +
              s.civ.name +
              ' made. I have marked where he said."'
          ),
        );
    for (const k in m.sites)
      if (m.sites[k].kind === 'spring' && m.sites[k].sure && !m.sites[k].known && id === townArea(s))
        out.push(() => {
          m.sites[k].known = true;
          markIn(s, id, +k);
          return (
            '"There is a sweet spring to the ' + dirOf(s, id, k % W, Math.floor(k / W)) + '. Drink there, not from the others."'
          );
        });
  }
  const sh = findSite(s, 'shrine');
  if (sh && !s.known.god)
    out.push(
      () => (
        mark(s, sh.x, sh.y, sh.area),
        '"There is a shrine to the ' +
          dirOf(s, sh.area, sh.x, sh.y) +
          '. To ' +
          godOf(s).name +
          '. My mother would go there to ask for rain."'
      ),
    );
  for (const id in s.regionRares || {})
    if (s.areas[id] && !s.areas[id].rareTold)
      out.push(
        () =>
          '"Do not go into the country to the ' +
          dirOf(s, id, 18, 18) +
          '. It is not like here. ' +
          byId(C.regionRares.list, s.regionRares[id]).text +
          '"',
      );
  const left = AXES.filter((a) => !s.civKnown[a]);
  if (left.length)
    out.push(() => {
      const ax = pick(left),
        tx = traitText(ax, s.civ[ax]);
      learn(s, ax);
      return '"The ' + s.civ.name + '? ' + tx.label + ', my grandfather said. ' + tx.text + '"';
    });
  const home = mapOf(s, townArea(s)).creatures.filter((c) => !s.species[c.sp].met);
  if (home.length)
    out.push(() => {
      const sp = s.species[pick(home).sp];
      return '"Watch out for the ' + sp.name + '. ' + byId(C.creature.tempers, sp.temper).text + '"';
    });
  return out.length && srand(s) < 0.8 ? pick(out)() : pick(L().flavour);
}

// What a person says and offers: { title, text: [...], options: [{ id, label, price, arg, note }] }.
function serviceInfo(s) {
  for (const t of TALK) {
    const i = t.info(s);
    if (i) return i;
  }
  const st = siteHere(s);
  if (!st || s.off.townlife || !inTown(s)) return null;
  const p = s.player,
    opt = [],
    text = [];
  if (st.kind === 'folk') {
    if (!st.said) st.said = rumour(s);
    return { title: st.name + ', ' + st.role, text: [st.said], options: [] };
  }
  if (st.kind === 'grave') return { title: 'A grave', text: ['Here lies ' + st.name + '. ' + st.text], options: [] };
  const sv = svc(st.kind);
  if (!sv) return null;
  text.push(sv.text);
  if (st.kind === 'healer')
    opt.push({ id: 'heal', label: 'Be healed', price: price(s, 'heal'), note: 'all wounds, cold and weariness' });
  if (st.kind === 'temple') {
    text.push(
      '"Our god is ' + godOf(s).name + '. Its terms are these: ' + godOf(s).terms + ' Its shrine is marked on your map."',
    );
    if (!blessed(s)) opt.push({ id: 'bless', label: 'Ask a blessing', price: price(s, 'bless'), note: L().blessing.text });
    else text.push('You carry the blessing still.');
  }
  if (st.kind === 'trainer') {
    if (learned(s).length >= L().maxLessons) text.push('"You have learned all you will learn from me. Go and use it."');
    else
      for (const id of curTown(s).lessons || [])
        if (!learned(s).includes(id)) {
          const l = byId(L().lessons, id);
          opt.push({ id: 'learn', arg: id, label: l.name, price: l.price, note: l.text });
        }
  }
  if (st.kind === 'smith')
    for (const it of p.items) {
      const b = byId(C.bases, it.base);
      if (it.known && isCursed(it))
        opt.push({ id: 'uncurse', arg: it.id, label: 'Strip the curse from the ' + itemName(it), price: price(s, 'uncurse') });
      else if (b.weapon && !it.pre)
        opt.push({
          id: 'improve',
          arg: it.id,
          label: 'Hone the ' + itemName(it),
          price: price(s, 'improve'),
          note: 'it becomes Keen',
        });
      else if (['armor', 'cloak'].includes(b.slot) && !it.suf)
        opt.push({
          id: 'improve',
          arg: it.id,
          label: 'Reinforce the ' + itemName(it),
          price: price(s, 'improve'),
          note: 'of Warding',
        });
    }
  if (st.kind === 'mapmaker') {
    opt.push({
      id: 'mapHome',
      label: 'A map of this country',
      price: price(s, 'mapHome'),
      note: 'shows every place in the land around the town',
    });
    opt.push({
      id: 'mapNear',
      label: 'A map of the lands beyond',
      price: price(s, 'mapNear'),
      note: 'marks the springs, ruins and caves of the countries next to this one',
    });
  }
  if (st.kind === 'stable' && !p.items.some((i) => i.base === 'mule'))
    opt.push({ id: 'mule', label: 'Buy a pack mule', price: price(s, 'mule'), note: 'carry 10 more' });
  return { title: st.name + ', ' + sv.role, text, options: opt };
}
function useService(s, optId, arg) {
  for (const t of TALK) if (t.info(s)) return t.use(s, optId, arg);
  const info = serviceInfo(s),
    o = info && info.options.find((x) => x.id === optId && (arg === undefined || x.arg === arg));
  if (!o || s.over) return false;
  const p = s.player;
  if (p.coin < o.price) {
    say(s, 'You cannot afford that.');
    return false;
  }
  p.coin -= o.price;
  if (optId === 'heal') {
    p.hp = p.hpMax;
    p.warmth = 100;
    p.stamina = 100;
    say(s, 'Poultices, a hot drink and a hard bench. You feel whole.', 'good');
  } else if (optId === 'bless') {
    s.blessUntil = s.time + L().blessing.hours * 60;
    say(s, 'The priest marks your forehead with ash: ' + L().blessing.text + '.', 'good');
  } else if (optId === 'learn') {
    s.char.lessons = learned(s).concat([o.arg]);
    say(s, 'You learn ' + byId(L().lessons, o.arg).name.toLowerCase() + '. ' + byId(L().lessons, o.arg).text, 'good');
    gainXp(s, 10);
  } else if (optId === 'improve' || optId === 'uncurse') {
    const it = p.items.find((i) => i.id === o.arg),
      b = byId(C.bases, it.base);
    if (optId === 'uncurse') {
      if (it.pre && byId(C.affixes, it.pre).cursed) it.pre = null;
      if (it.suf && byId(C.affixes, it.suf).cursed) it.suf = null;
    } else if (b.weapon) it.pre = 'keen';
    else it.suf = 'warding';
    say(s, 'The smith hands it back: ' + itemName(it) + '.', 'good');
  } else if (optId === 'mapHome') {
    const m = mapOf(s, townArea(s));
    m.seen.fill(1);
    for (const k in m.sites) m.sites[k].seen = true;
    say(s, 'A good map, on oiled cloth. Every place in this country is on it now.', 'good');
  } else if (optId === 'mapNear') {
    let n = 0;
    for (const id in s.areas) {
      const m = mapOf(s, id);
      if (id === townArea(s) || s.areas[id].kind !== 'region' || !m) continue;
      for (const k in m.sites) if (['spring', 'ruin', 'cave'].includes(m.sites[k].kind)) markIn(s, id, +k), n++;
    }
    say(s, 'A map of the lands beyond, with ' + n + ' places marked. Half of it may even be right.', 'good');
  } else if (optId === 'mule') {
    p.items.push(makeItem(s, 'mule', null, null, true));
    say(s, 'A grey mule with a patient face. It will carry what you cannot.', 'good');
  }
  return true;
}
// Townsfolk wander the streets while you walk in town (never onto a door, a grave, the well or you).
on('did', (s, d) => {
  if (d.id !== 'move' || !inTown(s) || s.off.townlife) return;
  for (const k of Object.keys(s.sites)) {
    const st = s.sites[k];
    if (st.kind !== 'folk' || srand(s) > 0.3) continue;
    const x = k % W,
      y = Math.floor(k / W),
      [dx, dy] = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ][Math.floor(srand(s) * 4)],
      nk = idx(x + dx, y + dy);
    if (x + dx < 1 || y + dy < 1 || x + dx > W - 2 || y + dy > H - 2) continue;
    if (s.terrain[nk] !== FLOOR || s.sites[nk] || (x + dx === s.player.x && y + dy === s.player.y)) continue;
    s.sites[nk] = st;
    delete s.sites[k];
  }
});
// Standing on the temple's door also teaches you the god and marks its shrine.
on('did', (s, d) => {
  if (d.id !== 'move' || s.off.townlife) return;
  const st = siteHere(s);
  if (st && st.kind === 'temple' && !s.known.god) {
    s.known.god = true;
    const sh = findSite(s, 'shrine');
    if (sh) mark(s, sh.x, sh.y, sh.area);
  }
  if (st && st.kind === 'grave' && !st.read) {
    st.read = true;
    say(s, 'A grave. Here lies ' + st.name + '. ' + st.text);
  }
});

ACTIONS.push((s, st, a) => {
  if (!st || s.combat || !inTown(s) || s.off.townlife) return;
  if (svc(st.kind)) a.push({ id: 'townAsk', section: st.kind, label: 'Talk to ' + st.name, hint: svc(st.kind).role });
  if (st.kind === 'folk') a.push({ id: 'townAsk', section: 'folk', label: 'Talk to ' + st.name, hint: st.role });
});
SOURCES.push({
  id: 'townlife',
  fn(s, out) {
    for (const id of learned(s)) for (const m of byId(L().lessons, id).mods) out.push(m);
    if (blessed(s)) for (const m of L().blessing.mods) out.push(m);
  },
});
SWITCHES.push(['townlife', 'Town life']);
NOTES.push((s) => {
  if (!s.town.size || s.off.townlife) return [];
  const out = [
    {
      label: s.town.name + ', ' + byId(L().sizes, s.town.size).name,
      text:
        'Here you can find ' +
        ['the elder', 'the inn', 'a shop'].concat(s.town.services.map((id) => svc(id).role)).join(', ') +
        '.',
    },
  ];
  if (learned(s).length)
    out.push({
      label: 'Lessons learned',
      text:
        learned(s)
          .map((id) => byId(L().lessons, id).name)
          .join(', ') + '.',
    });
  return out;
});

export { serviceInfo, useService, rumour };
