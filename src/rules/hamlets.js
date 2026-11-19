/* Hamlets, from content/hamlets.js: in regions away from home, now and then a few houses round a well, built with the
   region. You can draw water, sleep under a roof, pay for a bed, buy a little, and hear a rumour. Switch: s.off.hamlets
   (when a region is built; in play, the trading and beds stop, the well and shelter stay). */
import { C, idx, on, say, stream } from './core.js';
import './worldgen.js';
import { GENERATORS, HOME } from './areas.js';
import { SITE_NAME, siteHere } from './map.js';
import { restHour } from './actions.js';
import { makeItem } from './items.js';
import { rumour } from './townlife.js';
import { ACTIONS, NOTES, SWITCHES, TALK } from './hooks.js';

const X = () => C.hamlets;
SITE_NAME.hamlet = 'hamlet';
{
  const region = GENERATORS.region;
  GENERATORS.region = (s, rec) => {
    const m = region(s, rec);
    if (s.off.hamlets || rec.id === HOME) return m;
    const r = stream(s.seed, 'hamlet:' + rec.id),
      pick = (a) => a[Math.floor(r() * a.length)];
    if (r() >= X().chance) return m;
    // by a road if there is one, else anywhere clear
    const clear = (k) => {
      const x = k % 36,
        y = Math.floor(k / 36);
      if (x < 4 || y < 4 || x > 31 || y > 31 || m.terrain[k] === 2 || m.terrain[k] >= 4) return false;
      for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (m.sites[idx(x + i, y + j)]) return false;
      return true;
    };
    const byRoad = Object.keys(m.road || {})
        .map(Number)
        .filter((k) => clear(k + 1)),
      all = [];
    for (let k = 0; k < 36 * 36; k++) if (clear(k)) all.push(k);
    const k = byRoad.length ? byRoad[Math.floor(r() * byRoad.length)] + 1 : all.length ? pick(all) : null;
    if (k === null) return m;
    m.sites[k] = { kind: 'hamlet', name: pick(X().a) + pick(X().b), talk: pick(X().talk) };
    m.creatures = m.creatures.filter((c) => Math.max(Math.abs(c.x - (k % 36)), Math.abs(c.y - Math.floor(k / 36))) > 3);
    return m;
  };
}
const atHamlet = (s) => {
  const st = siteHere(s);
  return st && st.kind === 'hamlet' && !s.off.hamlets ? st : null;
};
TALK.push({
  info(s) {
    const st = atHamlet(s);
    if (!st) return null;
    if (!st.said) st.said = rumour(s);
    const H = X();
    return {
      title: st.name,
      text: [st.talk, st.said],
      options: [
        { id: 'bed', label: 'A bed by the fire', price: H.bed, note: 'eight hours; wake whole' },
        { id: 'fuel', label: 'A bundle of wood', price: H.fuel, note: '1 fuel' },
        ...H.goods.map((g) => ({
          id: 'buy',
          arg: g.base,
          label: 'A ' + C.bases.find((b) => b.id === g.base).name.toLowerCase(),
          price: g.price,
        })),
      ],
    };
  },
  use(s, opt, arg) {
    const st = atHamlet(s),
      p = s.player,
      o = this.info(s).options.find((x) => x.id === opt && (arg === undefined || x.arg === arg));
    if (!st || !o || s.over) return false;
    if (p.coin < o.price) {
      say(s, 'You cannot afford that.');
      return false;
    }
    p.coin -= o.price;
    if (opt === 'bed') {
      const w = p.water;
      for (let i = 0; i < 8 && !s.over; i++) restHour(s);
      if (s.over) return true;
      p.water = Math.max(p.water, w);
      p.hp = p.hpMax;
      p.stamina = 100;
      p.warmth = 100;
      say(s, 'A bed by the fire in ' + st.name + '. You wake whole.', 'good');
    } else if (opt === 'fuel') p.fuel += 1;
    else {
      p.items.push(makeItem(s, o.arg, null, null, true));
      say(s, 'You buy a ' + o.label.replace(/^A /, '').toLowerCase() + '.');
    }
    return true;
  },
});
ACTIONS.push((s, st, a) => {
  if (!s.combat && st && st.kind === 'hamlet' && !s.off.hamlets)
    a.push({ id: 'townAsk', section: 'hamlet', label: 'Talk in ' + st.name, hint: 'a bed, wood, news' });
});
on('did', (s, d) => {
  const st = d.id === 'move' ? siteHere(s) : null;
  if (!st || st.kind !== 'hamlet' || st.told) return;
  st.told = true;
  st.seen = true;
  say(s, st.name + ', a hamlet. ' + st.talk + ' There is a well, and shelter.', 'good');
});
SWITCHES.push(['hamlets', 'Hamlets']);
NOTES.push((s) => {
  const known = [];
  for (const id in s.areas) {
    const m = s.areas[id].map || (id === s.area ? s : null);
    if (m && m.sites) for (const k in m.sites) if (m.sites[k].kind === 'hamlet' && m.sites[k].told) known.push(m.sites[k].name);
  }
  return known.length ? [{ label: 'Hamlets you have found', text: known.join(', ') + '.' }] : [];
});
