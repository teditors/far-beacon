/* Plots, from content/plots.js: the troubles of a world. One is the world's great trouble, told by the elder of the
   story's town, and finishing it wins the world with its own ending; the old story of the relic is one kind among
   several. Every other town may have a trouble of its own, told by its elder, which you may take up or leave.
   A plot is a list of steps (talk, kill, take, bring, free, lead, use, choose) over roles placed in the world when it
   is made (a den, a camp, a black stone, a beast, raiders, someone held captive, an item). Plots can be linked: the cure
   for a sickness may lie in the great beast's hoard, a feud sets one town against you, finishing one trouble tells you
   of the next. State: s.plots (a list), s.track (the plot whose next step is on the top panel), s.curses.
   Switch: s.off.plots (at creation: the old story alone, as before). */
import { C, H, W, byId, clock, emit, idx, on, say, srand, stream } from './core.js';
import {
  HOME,
  allMaps,
  areaRec,
  curTown,
  ensureRegion,
  homePos,
  mapOf,
  outdoorRec,
  regionId,
  sketchOf,
  townArea,
  townById,
  townId,
  townInRegion,
  wrap,
  wrapDelta,
  worldPos,
} from './areas.js';
import { makeCreature } from './combat.js';
import { makeItem } from './items.js';
import { SITE_NAME, dirFrom, siteHere } from './map.js';
import { ELDER_TALK, PLOT_HOOKS, findHere, mark } from './quest.js';
import { gainXp } from './progress.js';
import { road, spot, waterAt } from './plot.js';
import { SOURCES } from './stats.js';
import { ACTIONS, NOTES, SWITCHES } from './hooks.js';

const P = () => C.plots;
const kindOf = (p) => byId(P().kinds, p.kind);
// plot items: light tokens (a horn, a sigil, salt, a herb) and heavy goods, both quest items that cannot be sold
if (!C.bases.some((b) => b.id === 'token')) {
  C.bases.push({ id: 'token', name: 'Token', wt: 0.3, w: 0, plain: true, quest: 'Someone is waiting for this.' });
  C.bases.push({
    id: 'goods',
    name: 'Goods',
    wt: 5,
    w: 0,
    plain: true,
    quest: 'Heavy, and not yours: carry it where it is wanted.',
  });
}
for (const k in P().sites) SITE_NAME[k] = P().sites[k].name;

/* ---------- helpers ---------- */
const plotsOf = (s) => s.plots || [];
const plotById = (s, id) => plotsOf(s).find((p) => p.id === id) || null;
const mainPlot = (s) => plotsOf(s).find((p) => p.main) || null;
// Is the old story of the relic the world's great trouble? (Always, in a world made without plots.)
const relicWins = (s) => !mainPlot(s) || mainPlot(s).kind === 'relic';
const tracked = (s) => {
  const p = plotById(s, s.track);
  return p && !p.done && !p.failed ? p : mainPlot(s);
};
const stepsOf = (p) => {
  const k = kindOf(p);
  return (k.steps || []).concat(p.branch && k.branches ? k.branches[p.branch] : []);
};
const stepOf = (p) => (p.done || p.failed ? null : stepsOf(p)[p.step] || null);
const townName = (s, id) => (townById(s, id) || s.town).name;
const roleTown = (s, p, key) => (key === 'giver' ? p.giver : p.roles[key]);
// The country a role's place lies in, for "{land}".
const landOf = (s, p) => {
  for (const k in p.roles) {
    const r = p.roles[k];
    if (r && r.area && s.areas[r.area] && s.areas[r.area].kind === 'region') return byId(C.biomes, s.areas[r.area].biome).name;
  }
  return 'wilds';
};
function fill(s, p, text) {
  const g = townById(s, p.giver) || s.town;
  return text.replace(/\{(\w+)\}/g, (m, k) => {
    if (k === 'giver') return g.name;
    if (k === 'elder') return g.elder;
    if (k === 'land') return landOf(s, p).toLowerCase();
    if (k === 'days') return String(kindOf(p).days || '');
    if (k === 'due') return String(p.due || '');
    if (k === 'town') return p.hostile ? townName(s, p.hostile) : g.name;
    const r = p.roles[k];
    if (r === undefined) return m;
    if (typeof r === 'string') return townName(s, r);
    return r.name || r.label || m;
  });
}
const dist = (s, a, b) => {
  const A = s.areas[a] || outdoorRec(s),
    B = s.areas[b] || outdoorRec(s);
  return Math.max(Math.abs(wrapDelta(A.cx, B.cx, s.world.cols)), Math.abs(wrapDelta(A.cy, B.cy, s.world.rows)));
};

/* ---------- placing a plot's roles ---------- */
function placeRoles(s, p, r, link) {
  const k = kindOf(p),
    giverArea = townArea(s, townById(s, p.giver)),
    g = s.areas[giverArea] || s.areas[HOME],
    pick = (a) => a[Math.floor(r() * a.length)],
    roles = (p.roles = {});
  let cid = 600 + 20 * +p.id.slice(1); // creature ids, unique within the world and the same every time it is made
  // regions at a distance from the giver's (any region will do if none is at that distance)
  // never near a town's block, or near the well where the traveller sets out
  const clear = (area, x, y, rad) => {
    const t = townInRegion(s, area);
    if (t && Math.max(Math.abs(t.x - x), Math.abs(t.y - y)) < rad) return false;
    if (area === HOME && Math.max(Math.abs(s.start.x - x), Math.abs(s.start.y - y)) < 8) return false;
    return true;
  };
  const regionAt = (d, far) => {
    const all = [];
    for (let cy = 0; cy < s.world.rows; cy++)
      for (let cx = 0; cx < s.world.cols; cx++) {
        const dd = Math.max(Math.abs(wrapDelta(cx, g.cx, s.world.cols)), Math.abs(wrapDelta(cy, g.cy, s.world.rows)));
        if (s.regionRares && s.regionRares[regionId(s, cx, cy)] === 'empty') continue; // a silent country stays silent
        all.push({ cx, cy, dd });
      }
    const most = Math.max(...all.map((a) => a.dd));
    // the great trouble keeps to the ring of regions round home where it can, as the old story does: a long way into
    // dangerous country is for side troubles, which you may leave alone
    if (p.main) {
      const ring = all.filter((a) => a.dd >= 1 && a.dd <= d[1] && sketchOf(s, a.cx, a.cy).danger === 1);
      if (ring.length) return pick(ring);
    }
    let opts = all.filter((a) => (far ? a.dd === Math.max(d[0], Math.min(d[1], most)) : a.dd >= d[0] && a.dd <= d[1]));
    if (!opts.length) opts = all.filter((a) => a.dd > 0);
    if (!opts.length) opts = all;
    return pick(opts);
  };
  for (const key in k.roles || {}) {
    const R = k.roles[key];
    if (R.town) {
      const others = [s.town].concat(s.towns || []).filter((t) => townId(t) !== p.giver);
      if (!others.length) return false;
      roles[key] = townId(pick(others));
    } else if (R.place) {
      if (link && link.place && key === link.place) {
        roles[key] = Object.assign({}, link.at);
        continue;
      }
      let at = null;
      for (let tries = 0; tries < 6 && !at; tries++) {
        let rec, m;
        if (R.near === 'giver') {
          rec = g;
          m = mapOf(s, rec.id);
        } else {
          const c = regionAt(R.dist || [1, 2], R.far);
          rec = ensureRegion(s, c.cx, c.cy);
          if (rec.id === s.area) continue; // never the map being played on (at creation, home)
          m = rec.map;
        }
        if (!m || (s.regionRares && s.regionRares[rec.id] === 'empty')) continue;
        if (R.site === 'ruin') {
          const ruins = Object.keys(m.sites).filter((q) => m.sites[q].kind === 'ruin' && !m.sites[q].plot);
          if (ruins.length) {
            const q = +pick(ruins);
            m.sites[q].plot = p.id;
            at = { area: rec.id, x: q % W, y: Math.floor(q / W) };
            continue;
          }
        }
        const t = R.near === 'giver' ? townById(s, p.giver) : null,
          q = spot(m, r, 1, 1, t ? { x: t.x, y: t.y + 7 } : null);
        if (!q || !clear(rec.id, q.x, q.y, 6)) continue;
        m.sites[idx(q.x, q.y)] = { kind: R.site, plot: p.id, role: key };
        // its ground is its own: the creatures that lived there move on
        m.creatures = m.creatures.filter(
          (c) => c.plot || c.key || c.lair || Math.max(Math.abs(c.x - q.x), Math.abs(c.y - q.y)) > 3,
        );
        at = { area: rec.id, x: q.x, y: q.y };
      }
      if (!at) return false;
      roles[key] = Object.assign({ site: R.site }, at);
    } else if (R.person) {
      roles[key] = { name: pick(P().people), freed: false };
    } else if (R.curse) {
      const at = roles[R.at];
      if (at) (s.curses = s.curses || {})[at.area] = p.id;
      roles[key] = { area: at && at.area };
    }
  }
  // creatures and items once the places are known
  for (const key in k.roles || {}) {
    const R = k.roles[key];
    if (R.creature) {
      const at = roles[R.at],
        m = mapOf(s, at.area),
        biome = s.areas[at.area] ? s.areas[at.area].biome : s.biome,
        ids = [];
      let name = '';
      for (let n = 0; n < (R.n || 1); n++) {
        const f = R.kind === 'guards' ? byId(C.creature.forms, 'brute') : pick(C.creature.forms.filter((x) => x.id !== 'hound'));
        name = R.names ? pick(R.names) : pick(P().beastNames) + ' ' + pick(C.creature.prefix[biome] || ['Wild']) + ' ' + f.name;
        s.species.push({
          name,
          form: f.id,
          temper: 'territorial',
          rare: R.kind === 'beast' ? 'elder' : null,
          met: false,
          named: true,
        });
        let x = at.x,
          y = at.y;
        for (let t = 0; t < 30; t++) {
          const xx = at.x + Math.round((r() - 0.5) * 4),
            yy = at.y + Math.round((r() - 0.5) * 4);
          if (xx < 1 || yy < 1 || xx > W - 2 || yy > H - 2 || m.terrain[idx(xx, yy)] === 2) continue;
          if (m.creatures.some((c) => c.x === xx && c.y === yy) || (xx === at.x && yy === at.y) || !clear(at.area, xx, yy, 4))
            continue;
          x = xx;
          y = yy;
          break;
        }
        const c = makeCreature(s, cid++, s.species.length - 1, x, y, R.tier || 2);
        Object.assign(c, { plot: p.id, role: key });
        if (R.carries) c.carries = R.carries;
        m.creatures.push(c);
        ids.push(c.id);
      }
      roles[key] = { area: at.area, name: R.kind === 'guards' ? name.toLowerCase() + 's' : name, left: ids.length };
    } else if (R.item) {
      roles[key] = { label: fill(s, p, R.label), base: R.base };
      const at = R.at && (link && link.item === key ? link.at : roles[R.at]);
      if (at) {
        const m = mapOf(s, at.area),
          d = (m.depots[idx(at.x, at.y)] = m.depots[idx(at.x, at.y)] || { water: 0, fuel: 0, items: [] });
        d.items.push(plotItem(s, p, key));
        roles[key].at = { area: at.area, x: at.x, y: at.y };
      }
    }
  }
  // labels that name other roles ("Horn of the {beast}") are filled now that every name is known
  for (const key in roles) if (roles[key] && roles[key].label) roles[key].label = fill(s, p, k.roles[key].label);
  // water on the way, as for the old story: sure springs every seven tiles from the giver's door to each place (and to
  // the other town), which the elder marks when telling; the great trouble also gets an old road
  const gt = townById(s, p.giver) || s.town,
    door = { area: townArea(s, gt), x: gt.x, y: gt.y + 3 };
  for (const key in roles) {
    const R = roles[key],
      to =
        typeof R === 'string'
          ? (() => {
              const o = townById(s, R);
              return o && { area: townArea(s, o), x: o.x, y: o.y + 3 };
            })()
          : R && R.x !== undefined && R.area
            ? R
            : null;
    if (!to || to.area === undefined) continue;
    const pa = homePos(s, door.area, door.x, door.y),
      pb = homePos(s, to.area, to.x, to.y),
      n = Math.floor(Math.hypot(pb.x - pa.x, pb.y - pa.y) / 7);
    for (let i = 0; i <= n + 1; i++) {
      const gx = Math.round(pa.x + ((pb.x - pa.x) * i) / (n + 1)),
        gy = Math.round(pa.y + ((pb.y - pa.y) * i) / (n + 1));
      if (i > 0 && i <= n) waterAt(s, gx, gy, false);
      // the regions the leg crosses: the elder marks their sure springs
      const h = s.world.home,
        id = regionId(s, wrap(h.cx + Math.floor(gx / W), s.world.cols), wrap(h.cy + Math.floor(gy / H), s.world.rows));
      if (!(p.legs = p.legs || []).includes(id)) p.legs.push(id);
    }
    if (p.main) road(s, door, to);
  }
  return true;
}
function plotItem(s, p, key) {
  const R = kindOf(p).roles[key],
    it = makeItem(s, R.base, null, null, true);
  it.label = fill(s, p, R.label);
  it.plot = p.id;
  it.role = key;
  return it;
}
const carrying = (s, p, key) => s.player.items.find((i) => i.plot === p.id && i.role === key);

/* ---------- at world creation ---------- */
on('worldBorn', (s, d) => {
  if (d.off.plots) return;
  const r = stream(s.seed, 'plots'),
    X = P(),
    pickW = (list, w) => {
      let t = list.reduce((a, e) => a + (e[w] || 0), 0) * r();
      for (const e of list) if ((t -= e[w] || 0) < 0) return e;
      return list[0];
    };
  s.plots = [];
  // the great trouble, told in the story's town
  const main = pickW(X.kinds, 'main');
  let n = 0;
  const add = (kind, giver, isMain, link) => {
    const p = { id: 'p' + n++, kind: kind.id, giver, main: !!isMain, known: false, step: 0 };
    if (kind.id !== 'relic' && !placeRoles(s, p, r, link)) return null;
    s.plots.push(p);
    return p;
  };
  let mp = add(main, 'town', true);
  if (!mp) mp = add(byId(X.kinds, 'relic'), 'town', true);
  if (mp.kind !== 'relic') add(byId(X.kinds, 'relic'), 'town', false); // the old story is still there, for whoever hears it
  // a trouble for some of the other towns
  const towns = (s.towns || []).slice(),
    want = Math.min(towns.length, X.side[0] + Math.floor(r() * (X.side[1] - X.side[0] + 1)));
  for (let i = 0; i < want && towns.length; i++) {
    const t = towns.splice(Math.floor(r() * towns.length), 1)[0];
    for (let tries = 0; tries < 4; tries++) {
      const kind = pickW(X.kinds, 'side');
      if (kind.needs === 'other' && !(s.towns || []).length) continue;
      if (s.plots.some((q) => q.kind === kind.id)) continue;
      // a sickness and a beast in one world: the cure may be in the beast's hoard
      const beast = s.plots.find((q) => q.kind === 'beast');
      let link = null;
      if (kind.id === 'plague' && beast && r() < X.linkChance) link = { place: 'patch', item: 'cure', at: beast.roles.lair };
      const p = add(kind, townId(t), false, link);
      if (p) {
        if (link) p.linked = beast.id;
        break;
      }
    }
  }
  // finishing one side trouble tells you of the next
  const sides = s.plots.filter((q) => !q.main && q.kind !== 'relic');
  for (let i = 0; i + 1 < sides.length; i++) if (r() < X.chainChance) sides[i].opens = sides[i + 1].id;
  s.track = mp.id;
  if (mp.kind === 'relic') mp.known = false;
});

/* ---------- what to do next ---------- */
// The place a step points at: { area, x, y } (outdoors), or a town's id ({ town }).
function stepPlace(s, p, st) {
  if (!st) return null;
  const R = p.roles;
  if (st.do === 'talk') return { town: roleTown(s, p, st.to) };
  if (st.do === 'choose') return { town: roleTown(s, p, st.at) };
  if (st.do === 'bring' || st.do === 'lead') {
    if (st.do === 'bring' && !carrying(s, p, st.what)) return takePlace(s, p, st.what);
    return { town: roleTown(s, p, st.to) };
  }
  if (st.do === 'kill') return creaturePlace(s, p, st.what);
  if (st.do === 'take') return takePlace(s, p, st.what);
  if (st.do === 'free') return placeOfPerson(s, p, st.who);
  if (st.do === 'use') return carrying(s, p, st.what) ? R[st.at] : takePlace(s, p, st.what);
  return null;
}
const placeOfPerson = (s, p, who) => {
  const k = kindOf(p).roles[who];
  return p.roles[k.at];
};
function creaturePlace(s, p, key) {
  for (const [area, m] of allMaps(s)) {
    const c = m.creatures.find((x) => x.plot === p.id && x.role === key);
    if (c) return { area, x: c.x, y: c.y, cid: c.id };
  }
  return null;
}
// Where a plot item is: carried, lying in a depot, or still on a creature.
function takePlace(s, p, key) {
  for (const [area, m] of allMaps(s))
    for (const k in m.depots)
      if (m.depots[k].items.some((i) => i.plot === p.id && i.role === key)) return { area, x: k % W, y: Math.floor(k / W) };
  for (const ck in kindOf(p).roles) if (kindOf(p).roles[ck].carries === key) return creaturePlace(s, p, ck);
  return null;
}
// For the bot and the tests: where the tracked plot wants you now, as { area, x, y, cid } outdoors or { town }.
function plotGoal(s, p) {
  p = p || tracked(s);
  if (!p || p.kind === 'relic') return null;
  return stepPlace(s, p, stepOf(p));
}
// The top panel's goal for a plot other than the relic's.
function plotObjective(s, p) {
  const st = stepOf(p);
  if (!st) return { text: p.done ? 'Done: ' + kindOf(p).name : kindOf(p).name + ': failed', dir: null };
  if (!p.known) return { text: 'Find ' + townName(s, p.giver), dir: dirToTown(s, p.giver) };
  const at = stepPlace(s, p, st),
    text = fill(s, p, st.text);
  if (!at) return { text, dir: null };
  if (at.town) {
    if (areaRec(s).kind === 'town' && townId(curTown(s)) === at.town) {
      const e = findHere(s, 'elder');
      return { text, dir: e ? dirLocal(s, e) : null };
    }
    return { text, dir: dirToTown(s, at.town) };
  }
  if (at.area === s.area) return { text, dir: dirLocal(s, at) };
  const h = homePos(s, at.area, at.x, at.y);
  return { text, dir: dirFrom(worldPos(s), h.x, h.y) };
}
const dirLocal = (s, at) => (at.x === s.player.x && at.y === s.player.y ? 'here' : dirFrom(s.player, at.x, at.y));
function dirToTown(s, id) {
  const t = townById(s, id) || s.town,
    h = homePos(s, townArea(s, t), t.x, t.y);
  return dirFrom(worldPos(s), h.x, h.y);
}

/* ---------- doing the steps ---------- */
function finishStep(s, p) {
  p.step++;
  if (!stepOf(p)) finishPlot(s, p);
}
function finishPlot(s, p, ending) {
  if (p.done) return;
  p.done = true;
  const k = kindOf(p),
    X = P();
  say(s, fill(s, p, ending || (p.branch === 'peace' && k.peaceEnd) || k.end), 'good');
  if (s.curses) for (const a in s.curses) if (s.curses[a] === p.id) delete s.curses[a];
  if (k.id === 'feud' && p.branch === 'peace') p.friends = [p.giver, p.roles.other];
  else if (k.id === 'caravan') p.friends = [p.roles.other];
  else if (k.id !== 'feud') p.friends = [p.giver];
  if (p.main) {
    s.over = { won: true, ending: fill(s, p, k.end), plot: k.id };
    return;
  }
  const coin = X.reward.coin[0] + Math.floor(srand(s) * (X.reward.coin[1] - X.reward.coin[0] + 1));
  s.player.coin += coin;
  gainXp(s, X.reward.xp);
  say(s, 'They give you ' + coin + ' coin for it.');
  emit(s, 'plotDone', { id: p.id, kind: k.id });
  const next = plotById(s, p.opens);
  if (next && !next.known) {
    const t = townById(s, next.giver);
    if (t) {
      mark(s, t.x, t.y, townArea(s, t));
      say(s, '"If you are the kind who helps, go to ' + t.name + '. They have trouble of their own." It is marked on your map.');
    }
  }
}
// The elder of a town hears you: tells a trouble, and takes the steps that end at this town.
function plotTalk(s, t, sp) {
  const id = townId(t);
  let told = false;
  for (const p of plotsOf(s)) {
    if (p.kind === 'relic') continue;
    if (p.hostile === id) {
      sp.push('"' + fill(s, p, kindOf(p).hostileText).replace(/^"|"$/g, '') + '"');
      continue;
    }
    if (p.done || p.failed) continue;
    if (p.giver === id && !p.known) {
      if (told) continue;
      told = true;
      p.known = true;
      if (!s.track || !plotById(s, s.track) || plotById(s, s.track).done) s.track = p.id;
      const k = kindOf(p),
        linked = p.linked && plotById(s, p.linked);
      if (k.days) p.due = clock(s).day + k.days;
      sp.push(fill(s, p, linked ? k.tellHoard.replace('{beast}', linked.roles.beast.name) : k.tell));
      const areas = new Set([townArea(s, t)].concat(p.legs || []));
      for (const key in p.roles) {
        const r = p.roles[key];
        if (r && r.area) areas.add(r.area);
        if (r && r.area && r.x !== undefined) mark(s, r.x, r.y, r.area);
        if (typeof r === 'string' && townById(s, r)) mark(s, townById(s, r).x, townById(s, r).y, townArea(s, townById(s, r)));
      }
      // and the springs on the way, as the story's elder does
      for (const a of areas) {
        const m = mapOf(s, a);
        if (m)
          for (const q in m.sites)
            if (m.sites[q].sure) {
              m.sites[q].known = true;
              mark(s, q % W, Math.floor(q / W), a);
            }
      }
      say(s, t.elder + ' of ' + t.name + ' asks for your help: ' + k.name.toLowerCase() + '.', 'good');
      gainXp(s, 15);
    }
    if (!p.known) continue;
    // steps that end here, as many as are ready
    for (let guard = 0; guard < 4; guard++) {
      const st = stepOf(p);
      if (!st) break;
      if (st.do === 'talk' && roleTown(s, p, st.to) === id) {
        if (st.give) {
          s.player.items.push(plotItem(s, p, st.give));
          sp.push('"Here: ' + p.roles[st.give].label.toLowerCase() + '. Go carefully."');
        }
        finishStep(s, p);
        continue;
      }
      if (st.do === 'bring' && roleTown(s, p, st.to) === id && carrying(s, p, st.what)) {
        const it = carrying(s, p, st.what);
        s.player.items = s.player.items.filter((i) => i !== it);
        sp.push('"' + it.label + '. You have done what we could not."');
        finishStep(s, p);
        continue;
      }
      if (st.do === 'lead' && roleTown(s, p, st.to) === id && p.roles[st.who].freed) {
        sp.push('"' + p.roles[st.who].name + '! We had given you up."');
        finishStep(s, p);
        continue;
      }
      break;
    }
  }
  return told;
}
ELDER_TALK.push((s, t, sp) => plotTalk(s, t, sp));
// The story's town and the relic, through quest.js's hooks (quest.js cannot import this module).
Object.assign(PLOT_HOOKS, {
  // talking to the story town's elder: true if a plot was told (and the relic's story should wait)
  storyTalk: (s, sp) => plotTalk(s, s.town, sp) && !relicWins(s),
  objective: (s) => {
    const p = tracked(s);
    return p && p.kind !== 'relic' ? plotObjective(s, p) : null;
  },
  relicWins,
  relicSideDone: (s) => relicSideDone(s),
});
// Choices at a town's elder (the feud): [{ plot, id, label }].
function plotChoices(s) {
  if (areaRec(s).kind !== 'town') return [];
  const id = townId(curTown(s)),
    out = [];
  for (const p of plotsOf(s)) {
    const st = stepOf(p);
    if (p.known && st && st.do === 'choose' && roleTown(s, p, st.at) === id)
      for (const o of st.options) out.push({ plot: p.id, id: o.id, label: fill(s, p, o.label) });
  }
  return out;
}
function choosePlot(s, plotId, optId) {
  const p = plotById(s, plotId),
    st = p && stepOf(p);
  if (s.over || !st || st.do !== 'choose' || areaRec(s).kind !== 'town' || townId(curTown(s)) !== roleTown(s, p, st.at))
    return false;
  const o = st.options.find((x) => x.id === optId);
  if (!o) return false;
  p.branch = o.then;
  if (o.hostile) p.hostile = roleTown(s, p, o.hostile);
  say(s, fill(s, p, o.label) + '.', o.hostile ? '' : 'good');
  finishStep(s, p);
  return true;
}
// Actions where a plot's place is: free someone, share water, use an item.
function plotHere(s) {
  if (areaRec(s).kind === 'town') return [];
  const out = [];
  for (const p of plotsOf(s)) {
    const st = stepOf(p);
    if (!p.known || !st) continue;
    if (st.do === 'free') {
      const at = placeOfPerson(s, p, st.who);
      if (at && at.area === s.area && at.x === s.player.x && at.y === s.player.y) out.push({ p, st });
    }
    if (st.do === 'use') {
      const at = p.roles[st.at];
      if (at && at.area === s.area && at.x === s.player.x && at.y === s.player.y && carrying(s, p, st.what)) out.push({ p, st });
    }
  }
  return out;
}
function plotAct(s, plotId) {
  if (s.over || s.combat) return false;
  const h = plotHere(s).find((x) => x.p.id === plotId);
  if (!h) return false;
  const { p, st } = h,
    person = st.who && p.roles[st.who];
  if (st.do === 'free') {
    if (st.clear && p.roles[st.clear].left > 0) {
      say(s, 'Not while the ' + p.roles[st.clear].name + ' still stand guard.', 'bad');
      return false;
    }
    if (st.water) {
      if (s.player.water < st.water) {
        say(s, person.name + ' needs water, and you have too little to share.', 'bad');
        return false;
      }
      s.player.water -= st.water;
    }
    person.freed = true;
    say(s, person.name + ' is free, and will walk with you.', 'good');
    gainXp(s, 20);
    finishStep(s, p);
    return true;
  }
  if (st.do === 'use') {
    const it = carrying(s, p, st.what);
    s.player.items = s.player.items.filter((i) => i !== it);
    say(s, 'You use the ' + it.label.toLowerCase() + '.', 'good');
    gainXp(s, 20);
    finishStep(s, p);
    return true;
  }
  return false;
}
// Kills, and things picked up, move plots along.
on('killed', (s, d) => {
  const c = d.c;
  if (!c || !c.plot) return;
  const p = plotById(s, c.plot);
  if (!p) return;
  const r = p.roles[c.role];
  if (r && r.left > 0) r.left--;
  if (c.carries) {
    const m = s,
      k = idx(s.player.x, s.player.y),
      dp = (m.depots[k] = m.depots[k] || { water: 0, fuel: 0, items: [] });
    dp.items.push(plotItem(s, p, c.carries));
    say(s, 'It had ' + p.roles[c.carries].label.toLowerCase() + '. Open Pack to take it.', 'good');
  }
  if (p.kind === 'siege' && c.role === 'captain') {
    // without its captain the warband scatters
    const m = mapOf(s, p.roles.besiegers.area);
    if (m) m.creatures = m.creatures.filter((x) => !(x.plot === p.id && x.role === 'besiegers'));
    p.roles.besiegers.left = 0;
  }
  const st = stepOf(p);
  if (st && st.do === 'kill' && p.roles[st.what].left <= 0) finishStep(s, p);
});
on('did', (s) => {
  for (const p of plotsOf(s)) {
    const st = stepOf(p);
    if (!st) continue;
    if (st.do === 'take' && carrying(s, p, st.what)) finishStep(s, p);
    const k = kindOf(p);
    if (k.days && p.due && p.known && !p.done && clock(s).day > p.due) {
      p.failed = true;
      say(s, fill(s, p, k.failText), 'bad');
      s.player.items = s.player.items.filter((i) => i.plot !== p.id);
    }
  }
});
// The old story, when it is not the world's great trouble: carrying the relic home earns a reward, not the world.
function relicSideDone(s) {
  const p = plotsOf(s).find((q) => q.kind === 'relic');
  if (p) p.done = true;
  const X = P().relicSide;
  s.player.items = s.player.items.filter((i) => i.base !== 'relic');
  s.player.coin += X.coin;
  gainXp(s, X.xp);
  say(s, 'The old story is ended, and this land remembers you for it: ' + X.coin + ' coin, and a name in every town.', 'good');
}

/* ---------- the world's effects ---------- */
SOURCES.push({
  id: 'plots',
  fn(s, out) {
    if (s.off.plots || !s.plots) return;
    const here = outdoorRec(s);
    if (s.curses && here && s.curses[here.id]) for (const m of P().curse.mods) out.push(m);
    // a town you angered sells dear; one you helped sells cheap
    if (areaRec(s).kind === 'town') {
      const id = townId(curTown(s));
      for (const p of s.plots) {
        if (p.hostile === id) out.push({ stat: 'town.buy', op: 'mul', value: P().hostile.buy });
        if (p.done && (p.friends || []).includes(id)) out.push({ stat: 'town.buy', op: 'mul', value: P().friend.buy });
      }
    }
  },
});
ACTIONS.push((s, st, a) => {
  if (s.combat || s.off.plots) return;
  for (const { p, st: step } of plotHere(s)) {
    const who = step.who && p.roles[step.who];
    a.push({
      id: 'plotAct',
      arg: p.id,
      label:
        step.do === 'free'
          ? (step.water ? 'Share water with ' : 'Free ') + who.name
          : 'Use the ' + carrying(s, p, step.what).label.toLowerCase(),
      hint: kindOf(p).name.toLowerCase(),
    });
  }
});
// Told when you first come to a plot's place.
on('did', (s, d) => {
  if (d.id !== 'move') return;
  const st = siteHere(s);
  if (!st || !st.plot || st.told || !P().sites[st.kind]) return;
  st.told = true;
  say(s, P().sites[st.kind].text);
  if (s.curses && s.curses[s.area]) say(s, P().curse.text, 'bad');
});
SWITCHES.push(['plots', 'Many plots (new worlds)']);
NOTES.push((s) =>
  plotsOf(s)
    .filter((p) => p.known && p.kind !== 'relic')
    .map((p) => ({
      label: kindOf(p).name + (p.main ? ' (the great trouble)' : '') + (p.done ? ': done' : p.failed ? ': failed' : ''),
      text:
        p.done || p.failed
          ? 'Asked by ' + townName(s, p.giver) + '.'
          : plotObjective(s, p).text + '. Asked by ' + townName(s, p.giver) + '.',
    })),
);
// Which plot's next step is on the top panel.
function trackPlot(s, id) {
  const p = plotById(s, id);
  if (!p || p.done || (p.kind === 'relic' ? !s.quest.told : !p.known && !p.main)) return false;
  s.track = id;
  return true;
}

export {
  plotsOf,
  plotById,
  mainPlot,
  relicWins,
  tracked,
  stepOf,
  stepsOf,
  plotGoal,
  plotObjective,
  plotTalk,
  plotChoices,
  choosePlot,
  plotAct,
  plotHere,
  relicSideDone,
  trackPlot,
  fill as fillPlot,
};
