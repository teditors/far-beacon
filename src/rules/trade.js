/* Trade, from content/trade.js: every town has a market. It sells cheap what its country or its people make, buys dear
   what they do not, and the year moves some prices; buy furs in the cold north, sell them in the salt flats. Prices are
   worked out when asked (nothing stored but what each town has left to sell and what you carry), so they follow the
   town's culture and the year. Materials from crafting sell in every town. Switch: s.off.trade. */
import { C, byId, stream } from './core.js';
import { areaRec, curTown, townArea, townId } from './areas.js';
import { say } from './core.js';
import { stat } from './stats.js';
import { NOTES, SWITCHES, WEIGHTS } from './hooks.js';

const X = () => C.trade;
const goods = (s) => (s.player.goods = s.player.goods || {});
const goodOf = (id) => byId(X().goods, id);
// The culture a town's people have: the story town's is s.townCulture, the others carry their own.
const cultureOf = (s, t) => (t === s.town ? s.townCulture : t.culture) || {};
const biomeOfTown = (s, t) => {
  const a = s.areas[townArea(s, t)];
  return byId(C.biomes, a ? a.biome : s.biome);
};
// Does this town make this good?
function makes(s, t, g) {
  const b = biomeOfTown(s, t),
    m = g.made,
    cu = cultureOf(s, t);
  if (m.trade && cu.trade === m.trade) return true;
  if (m.cold && (b.night.cold || 0) >= m.cold) return true;
  if (m.warm && (b.day.warm || 0) >= m.warm) return true;
  if (m.forest && b.forest.frac >= m.forest) return true;
  if (m.mountains && b.mountains >= m.mountains) return true;
  if (m.hills && b.hills >= m.hills) return true;
  if (m.special && b.special && b.special.name.includes(m.special)) return true;
  return false;
}
// A town's price for a good, before its buying and selling spread.
function price(s, t, id) {
  const g = goodOf(id),
    r = stream(s.seed, 'market:' + townId(t) + ':' + id)(),
    y = (X().year[s.year] || {})[id] || 1;
  return g.price * (makes(s, t, g) ? X().made : X().wanted) * (1 + (r * 2 - 1) * X().wander) * y;
}
const buyAt = (s, t, id) => Math.max(1, Math.round(price(s, t, id) * stat(s, 'town.buy', 1)));
const sellAt = (s, t, id) => Math.max(1, Math.floor(price(s, t, id) * X().spread));
// What a town has left of a good it makes (the first time anyone asks, from the seed).
function stockOf(s, t, id) {
  t.goods = t.goods || {};
  if (t.goods[id] === undefined) {
    const r = stream(s.seed, 'marketstock:' + townId(t) + ':' + id)(),
      [a, b] = X().stock;
    t.goods[id] = makes(s, t, goodOf(id)) ? a + Math.floor(r * (b - a + 1)) : 0;
  }
  return t.goods[id];
}
// The market of the town you are in: [{ id, name, buy, sell, have, stock, made }].
function market(s) {
  if (s.off.trade || areaRec(s).kind !== 'town') return [];
  const t = curTown(s);
  return X().goods.map((g) => ({
    id: g.id,
    name: g.name,
    text: g.text,
    wt: g.wt,
    buy: buyAt(s, t, g.id),
    sell: sellAt(s, t, g.id),
    have: goods(s)[g.id] || 0,
    stock: stockOf(s, t, g.id),
    made: makes(s, t, g),
  }));
}
function buyGood(s, id) {
  const row = market(s).find((m) => m.id === id);
  if (s.over || !row || row.stock < 1) return false;
  if (s.player.coin < row.buy) {
    say(s, 'You cannot afford that.');
    return false;
  }
  s.player.coin -= row.buy;
  curTown(s).goods[id]--;
  goods(s)[id] = (goods(s)[id] || 0) + 1;
  return true;
}
function sellGood(s, id) {
  const row = market(s).find((m) => m.id === id);
  if (s.over || !row || row.have < 1) return false;
  s.player.coin += row.sell;
  goods(s)[id]--;
  if (row.made) curTown(s).goods[id]++; // a town that makes it puts it back on the shelf
  return true;
}
// Materials from crafting: any town buys them at their value.
function sellMat(s, id) {
  if (s.over || s.off.trade || areaRec(s).kind !== 'town' || !C.crafting) return false;
  const m = byId(C.crafting.mats, id),
    have = s.player.mats || {};
  if (!m || !(have[id] > 0)) return false;
  have[id]--;
  const n = Math.max(1, Math.round(m.value * X().mats));
  s.player.coin += n;
  return true;
}
// Where a good fetches the most, among the towns you know of: for the merchant's word of advice.
function bestMarket(s, id) {
  let best = null;
  for (const t of [s.town].concat(s.towns || [])) {
    const p = sellAt(s, t, id);
    if (!best || p > best.p) best = { t, p };
  }
  return best;
}
WEIGHTS.push((s) => {
  let w = 0;
  const g = s.player.goods || {};
  for (const k in g) w += (g[k] || 0) * ((goodOf(k) || {}).wt || 0);
  return w;
});
SWITCHES.push(['trade', 'Trade between towns']);
NOTES.push((s) => {
  const g = s.player.goods || {},
    have = Object.keys(g).filter((k) => g[k] > 0);
  return have.length
    ? [{ label: 'Trade goods', text: have.map((k) => g[k] + ' ' + goodOf(k).name.toLowerCase()).join(', ') + '.' }]
    : [];
});
export { market, buyGood, sellGood, sellMat, bestMarket, makes as townMakes, sellAt as goodSellAt };
