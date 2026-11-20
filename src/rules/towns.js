/* Town cultures from content/towns.js: a trade, a custom and, rarely, something stranger, rolled into
   s.townCulture = { trade, custom, rare }. Their numbers act through the stat stack (town.* stats); their goods are
   added to the shop at world creation; their elder says more on the first talk. Switch: s.off.towns. */
import { C, W, byId, godOf, on, say, stream } from './core.js';
import { learn, AXES } from './civ.js';
import { genItem, makeItem } from './items.js';
import { mark, findSite } from './quest.js';
import { curTown, inTown, mapOf, townArea, withTown } from './areas.js';
import { SOURCES } from './stats.js';
import { NOTES, SWITCHES, TOWN_MAKERS } from './hooks.js';

const T = () => C.townCulture;
const cultureOf = (s) => {
  const t = curTown(s);
  return t === s.town ? s.townCulture : t.culture;
};
const partsOf = (s) => {
  const c = cultureOf(s);
  if (!c || s.off.towns) return [];
  return [byId(T().trades, c.trade), byId(T().customs, c.custom), c.rare ? byId(T().rares, c.rare) : null].filter(Boolean);
};
const describe = (s) => {
  const c = s.townCulture,
    tr = byId(T().trades, c.trade),
    cu = byId(T().customs, c.custom),
    ra = c.rare ? byId(T().rares, c.rare) : null;
  return (
    (ra ? s.town.name + ' is a town of ' + ra.name + '. ' + ra.text + ' ' : '') +
    'Its people are ' +
    tr.name +
    ', and ' +
    cu.name +
    '. ' +
    tr.text +
    ' ' +
    cu.text
  );
};

function rollCulture(s, r) {
  const pick = (a) => a[Math.floor(r() * a.length)],
    X = T(),
    rare = r() < X.rareChance ? pick(X.rares) : null,
    trade = pick(X.trades),
    custom = pick(X.customs.filter((c) => !rare || !c.elder || c.elder !== rare.elder));
  s.townCulture = { trade: trade.id, custom: custom.id, rare: rare ? rare.id : null };
  if (trade.stock)
    for (let i = 0; i < trade.stock.n; i++) s.town.stock.push(makeItem(s, pick(trade.stock.bases), null, null, true));
  if (trade.fuel) s.town.fuel += trade.fuel;
  if (rare && rare.marked) {
    // the people who never fell: the town takes their tongue, and their shop holds their own marked gear
    const st = byId(C.civ.style, s.civ.style);
    s.town.name = pick(st.a) + pick(st.b) + pick(st.c);
    s.town.elder = pick(st.a) + pick(st.b);
    s.town.merchant = pick(st.a) + pick(st.b);
    s.town.lost = true;
    for (let i = 0; i < rare.marked; i++) {
      const it = genItem(s, { civ: true, noConsumables: true });
      it.mark = s.civ.affinity;
      it.markName = s.civ.name;
      it.known = true;
      s.town.stock.push(it);
    }
  }
}
on('worldBorn', (s, d) => {
  if (!d.off.towns) rollCulture(s, stream(s.seed, 'townCulture'));
});
TOWN_MAKERS.push((s, t, r) => {
  if (!s.off.towns) rollCulture(s, r);
});

SOURCES.push({
  id: 'towns',
  fn(s, out) {
    for (const p of partsOf(s)) for (const m of p.mods || []) out.push(m);
  },
});

// Told at the gate, the first time.
on('did', (s, d) => withTown(s, curTown(s), () => cultureTalk(s, d)));
function cultureTalk(s, d) {
  if (!s.townCulture || s.off.towns) return;
  if (inTown(s) && !s.townCulture.told) {
    s.townCulture.told = true;
    say(s, describe(s), 'good');
  }
  if (d.id !== 'talkElder' || s.townCulture.elderDone) return;
  s.townCulture.elderDone = true;
  const sp = s.town.speech;
  for (const p of partsOf(s)) {
    if (p.elder === 'lore') {
      for (const ax of AXES) learn(s, ax);
      s.known.civ = true;
      sp.push(
        s.town.lost
          ? '"You think the ' +
              s.civ.name +
              ' are gone? We are the ' +
              s.civ.name +
              '. We only stopped building. Ask, and I will tell you all we were."'
          : '"We keep the old lore here. Sit, and I will tell you all we know of the ' + s.civ.name + '."',
      );
    }
    if (p.elder === 'shrine') {
      const sh = findSite(s, 'shrine');
      if (sh) {
        mark(s, sh.x, sh.y, sh.area);
        s.known.god = true;
        sp.push('"The shrine of ' + godOf(s).name + ' is marked on your map. Its terms are these: ' + godOf(s).terms + '"');
      }
    }
    if (p.elder === 'springs') {
      const m = mapOf(s, townArea(s));
      let n = 0;
      for (const k in m.sites)
        if (m.sites[k].kind === 'spring' && Math.max(Math.abs((k % W) - s.town.x), Math.abs(Math.floor(k / W) - s.town.y)) <= 8) {
          m.sites[k].known = true;
          mark(s, k % W, Math.floor(k / W), townArea(s));
          n++;
        }
      sp.push(
        '"We do not trust strangers. But nobody should die of thirst: here are the ' +
          n +
          ' springs near us, and which are foul."',
      );
    }
  }
}

SWITCHES.push(['towns', 'Town cultures']);
NOTES.push((s) =>
  s.townCulture && s.townCulture.told && !s.off.towns ? [{ label: 'The people of ' + s.town.name, text: describe(s) }] : [],
);

export { partsOf as townParts };
