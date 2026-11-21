/* Wayfarers (content/wayfarers.js): people met at their own small fire in the wilds, about one region in three away
   from home, put there when the region is first built. A water-carrier sells water, a mapmaker draws the country round
   about on your map, a pilgrim tells you where the nearest thing you have not found lies (a dungeon's stair, a shadow
   in the sky, a place in the water, a door), a trapper buys hides and bone, and a lost traveller needs water and pays
   it back. Once dealt with they move on. They give the long legs between towns a chance of help, and point the way to
   the places of commission 4. Switch: s.off.wayfarers (at creation of each region; and they stop talking). */
import { C, H, W, byId, clamp, idx, on, say, srand, stream } from './core.js';
import './worldgen.js';
import {
  GENERATORS,
  HOME,
  ensureRegion,
  mapOf,
  outdoorRec,
  realmOf,
  regionId,
  townInRegion,
  worldPos,
  homePos,
  wrap,
} from './areas.js';
import { makeItem } from './items.js';
import { SITE_NAME, dirFrom, siteHere } from './map.js';
import { mark } from './quest.js';
import { gainXp } from './progress.js';
import { waterCap } from './stats.js';
import { ACTIONS, SWITCHES, TALK } from './hooks.js';
import { deepDoor, deepsOf } from './deeps.js';
import { skiesOf } from './sky.js';
import { seaPlacesOf } from './sea.js';
import { doorsOf } from './realms.js';

const X = () => C.wayfarers;
const kindOf = (st) => byId(X().kinds, st.way);
SITE_NAME.wayfarer = 'campfire';

/* ---------- one at a fire, put down as a region is built ---------- */
{
  const region = GENERATORS.region;
  GENERATORS.region = (s, rec) => {
    const m = region(s, rec);
    if (s.off.wayfarers || rec.id === HOME) return m;
    const r = stream(s.seed, 'wayfarer:' + rec.id);
    if (!(r() < X().chance)) return m;
    let t = X().kinds.reduce((a, k) => a + k.weight, 0) * r(),
      kind = X().kinds[0];
    for (const k of X().kinds)
      if ((t -= k.weight) < 0) {
        kind = k;
        break;
      }
    // somewhere open, near the middle, on a road if there is one close
    const town = townInRegion(s, rec.id);
    let best = null,
      bs = -1e9;
    for (let n = 0; n < 120; n++) {
      const x = 4 + Math.floor(r() * (W - 8)),
        y = 4 + Math.floor(r() * (H - 8)),
        i = idx(x, y),
        g = m.terrain[i];
      if (g === 2 || g >= 4 || m.sites[i]) continue;
      if (town && Math.max(Math.abs(town.x - x), Math.abs(town.y - y)) < 5) continue;
      let near = false;
      for (let j = -2; j <= 2 && !near; j++)
        for (let k = -2; k <= 2; k++) if (m.sites[idx(clamp(x + k, 0, W - 1), clamp(y + j, 0, H - 1))]) near = true;
      if (near) continue;
      const sc = (m.road && m.road[i] ? 20 : 0) - Math.abs(x - 18) - Math.abs(y - 18) + r() * 6;
      if (sc > bs) {
        bs = sc;
        best = i;
      }
    }
    if (best !== null)
      m.sites[best] = {
        kind: 'wayfarer',
        way: kind.id,
        name: kind.names[Math.floor(r() * kind.names.length)],
        have: (kind.offers.water || {}).have || 0,
      };
    return m;
  };
}

/* ---------- what a pilgrim knows: the nearest thing you have not found ---------- */
function unknownThings(s) {
  const out = [],
    here = s.realm || null,
    add = (area, x, y, what) => {
      if (x === undefined || (realmOf(s, area) || null) !== here) return;
      out.push({ area, x, y, what });
    };
  for (const d of deepsOf(s)) if (!d.entered && d.at !== 'town') add(d.area, d.x, d.y, 'a stair going down, into ' + d.name);
  for (const k of skiesOf(s))
    if (!k.reached) add(k.area, k.x, k.y, 'a shadow on the ground with no cloud to cast it, and ' + k.name + ' above it');
  for (const p of seaPlacesOf(s)) if (!p.reached) add(p.area, p.x, p.y, p.name + ', in the water');
  for (const d of doorsOf(s)) if (!d.crossed && !here) add(d.area, d.x, d.y, 'a door of old stone, standing on its own');
  return out;
}
function nearestUnknown(s) {
  const from = worldPos(s);
  let best = null,
    bd = 1e9;
  for (const t of unknownThings(s)) {
    if (!s.areas[t.area]) continue;
    const h = homePos(s, t.area, t.x, t.y),
      d = Math.hypot(h.x - from.x, h.y - from.y);
    if (d < bd) {
      bd = d;
      best = Object.assign({ dist: d, at: h }, t);
    }
  }
  return best;
}

/* ---------- talking at the fire ---------- */
const atFire = (s) => {
  const st = siteHere(s);
  return st && st.kind === 'wayfarer' && !st.gone && !s.off.wayfarers ? st : null;
};
TALK.push({
  info(s) {
    const st = atFire(s);
    if (!st) return null;
    const k = kindOf(st),
      o = k.offers,
      p = s.player,
      opts = [];
    if (o.water && st.have > 0) {
      const room = Math.max(0, Math.floor(waterCap(s) - p.water));
      if (room > 0)
        opts.push({
          id: 'water',
          label: 'A measure of water (' + st.have + ' left)',
          price: o.water.price,
          note: 'fills one more',
        });
    }
    if (o.map)
      opts.push({
        id: 'map',
        label: 'Have the country drawn on your map',
        price: o.map.price,
        note: 'this region and those round it, springs marked',
      });
    if (o.sign) opts.push({ id: 'sign', label: 'Sit and listen', price: 0, note: 'news of the road' });
    if (o.mats) {
      for (const m of ['hide', 'bone'])
        if ((p.mats || {})[m] > 0)
          opts.push({ id: 'sell', arg: m, label: 'Sell a ' + m, price: -o.mats[m], note: o.mats[m] + ' coin' });
      opts.push({ id: 'bandage', label: 'Bandages', price: o.mats.bandage });
    }
    if (o.need)
      opts.push({
        id: 'give',
        label: 'Share ' + o.need.water + ' water',
        price: 0,
        note: p.water >= o.need.water ? 'they need it' : 'you have too little',
      });
    return { title: st.name + ', ' + k.name, text: [k.talk], options: opts };
  },
  use(s, opt, arg) {
    const st = atFire(s);
    if (!st || s.over) return false;
    const k = kindOf(st),
      o = k.offers,
      p = s.player,
      info = this.info(s),
      op = info.options.find((x) => x.id === opt && (arg === undefined || x.arg === arg));
    if (!op) return false;
    if (op.price > 0 && p.coin < op.price) {
      say(s, 'You cannot afford that.');
      return false;
    }
    if (opt === 'water') {
      p.coin -= op.price;
      p.water = Math.min(waterCap(s), p.water + 1);
      st.have--;
      say(s, 'A measure of cold water, poured into your skin.', 'good');
      if (st.have <= 0) moveOn(s, st, 'The water-carrier has no more, and shoulders the empty yoke.');
    } else if (opt === 'map') {
      p.coin -= op.price;
      const here = outdoorRec(s),
        rad = o.map.radius;
      let n = 0;
      for (let dy = -rad; dy <= rad; dy++)
        for (let dx = -rad; dx <= rad; dx++) {
          const rec = ensureRegion(s, wrap(here.cx + dx, s.world.cols), wrap(here.cy + dy, s.world.rows)),
            m = mapOf(s, rec.id);
          for (let i = 0; i < W * H; i++) if (!m.seen[i]) (m.seen[i] = 1), n++;
          for (const q in m.sites) if (m.sites[q].kind === 'spring') (m.sites[q].seen = true), (m.sites[q].known = true);
        }
      say(
        s,
        'The mapmaker draws quickly and well: ' + n + ' tiles of country on your map, every spring marked, sweet or foul.',
        'good',
      );
      moveOn(s, st, 'The mapmaker rolls up the charts and goes on.');
    } else if (opt === 'sign') {
      const t = nearestUnknown(s);
      if (t) {
        if (!mapOf(s, t.area)) {
          const c = t.area.match(/r(\d+)_(\d+)$/);
          if (c) ensureRegion(s, +c[1], +c[2]);
        }
        mark(s, t.x, t.y, t.area);
        say(
          s,
          '"Off to the ' + dirFrom(worldPos(s), t.at.x, t.at.y) + ', a day or two, I saw ' + t.what + '." It is on your map now.',
          'good',
        );
      } else say(s, '"I have seen nothing on this road that you have not." The pilgrim smiles and says no more.');
      gainXp(s, 5);
      moveOn(s, st, 'The pilgrim blesses the road you are on, and goes the other way.');
    } else if (opt === 'sell') {
      p.mats[arg]--;
      p.coin += o.mats[arg];
      say(s, 'The trapper weighs the ' + arg + ' and pays ' + o.mats[arg] + ' coin.');
    } else if (opt === 'bandage') {
      p.coin -= op.price;
      p.items.push(makeItem(s, 'bandage', null, null, true));
      say(s, 'You buy bandages.');
    } else if (opt === 'give') {
      if (p.water < o.need.water) {
        say(s, 'You have too little water to share.', 'bad');
        return false;
      }
      p.water -= o.need.water;
      const coin = o.need.coin[0] + Math.floor(srand(s) * (o.need.coin[1] - o.need.coin[0] + 1));
      p.coin += coin;
      gainXp(s, o.need.xp);
      say(
        s,
        st.name + ' drinks, and lives. "Take this. It is all I have, and it is less than I owe." ' + coin + ' coin.',
        'good',
      );
      moveOn(s, st, st.name + ' sets off for the nearest town, slowly.');
    }
    return true;
  },
});
function moveOn(s, st, text) {
  st.gone = true;
  say(s, text);
}
ACTIONS.push((s, st, a) => {
  if (s.combat || !atFire(s)) return;
  a.push({ id: 'townAsk', section: 'wayfarer', label: 'Talk to ' + st.name, hint: kindOf(st).name });
});
on('did', (s, ev) => {
  if (ev.id !== 'move') return;
  const st = siteHere(s);
  if (!st || st.kind !== 'wayfarer' || st.told) return;
  st.told = true;
  st.seen = true;
  say(
    s,
    st.gone
      ? 'The ashes of a small fire. Whoever sat here has gone on.'
      : 'A small fire, and someone beside it: ' + st.name + ', ' + kindOf(st).name + '.',
  );
});
SWITCHES.push(['wayfarers', 'Wayfarers in the wilds']);

export { unknownThings, nearestUnknown };
