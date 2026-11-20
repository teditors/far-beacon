/* Errands from content/errands.js: the inn offers one piece of work at a time in a region next to home (slay a
   creature, fetch a parcel, go and see a place), paid on your return. Sometimes the one who asks is lying.
   State: s.errand = { kind, text, area, x, y, cid, done, reward, liar, giver }, s.errandsDone. Switch: s.off.errands. */
import { C, W, H, aOrAn, byId, idx, on, say, srand } from './core.js';
import { HOME, areaRec, ensureRegion, homePos, townArea, worldPos, regionId, wrap } from './areas.js';
import { dirFrom } from './map.js';
import { genItem, itemName, makeItem } from './items.js';
import { siteName } from './map.js';
import { NOTES, SWITCHES } from './hooks.js';

const E = () => C.errands;
const mapOf = (s, id) => (id === s.area ? s : s.areas[id] && s.areas[id].map);
const atInn = (s) =>
  areaRec(s).kind === 'town' && s.sites[idx(s.player.x, s.player.y)] && s.sites[idx(s.player.x, s.player.y)].kind === 'inn';

function errandInfo(s) {
  if (s.off.errands) return { text: 'Nobody here has work for you.', canAsk: false, canClaim: false };
  const e = s.errand;
  if (!e)
    return { text: 'Travellers here sometimes have work for someone going out into the country.', canAsk: true, canClaim: false };
  const where = homePos(s, e.area, e.x, e.y),
    dir = dirFrom(worldPos(s), where.x, where.y);
  return {
    text:
      (e.done ? 'Done: go back to the inn. ' : '') +
      'Your errand for ' +
      e.giver +
      ': ' +
      e.text +
      (e.done ? '' : ' (Now to the ' + dir + '.)'),
    canAsk: false,
    canClaim: e.done,
  };
}

// A few tries: the first errand rolled may need something its region does not have.
function askErrand(s) {
  if (s.over || s.off.errands || s.errand || !atInn(s)) return false;
  for (let i = 0; i < 6; i++) if (tryErrand(s)) return true;
  return false;
}
function tryErrand(s) {
  const pick = (a) => a[Math.floor(srand(s) * a.length)], // from the play stream: errands are offered during play
    X = E(),
    home = s.areas[townArea(s)] || s.world.home, // the regions around the town
    near = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const id = ensureRegion(s, wrap(home.cx + dx, s.world.cols), wrap(home.cy + dy, s.world.rows)).id;
      if (id !== townArea(s) && mapOf(s, id) && !near.includes(id)) near.push(id);
    }
  if (!near.length) return false;
  const kind = pick(X.kinds),
    area = pick(near),
    m = mapOf(s, area),
    rec = s.areas[area],
    liar = srand(s) < X.liarChance,
    giver = pick(X.givers) + (liar ? ' ' + pick(X.tells) : ''),
    reward = kind.reward[0] + Math.floor(srand(s) * (kind.reward[1] - kind.reward[0] + 1)),
    e = { kind: kind.id, area, liar, giver, reward, done: false };
  let fill = { region: byId(C.biomes, rec.biome).name, reward };
  if (kind.id === 'slay') {
    const live = m.creatures.filter((c) => !s.species[c.sp].rare || s.species[c.sp].rare !== 'docile');
    if (!live.length) return false;
    const c = pick(live);
    Object.assign(e, { cid: c.id, x: c.x, y: c.y });
    fill.species = s.species[c.sp].name;
    fill.victims = pick(kind.victims);
  } else {
    const spots = Object.keys(m.sites).filter((k) => ['ruin', 'cave', 'cache'].includes(m.sites[k].kind));
    if (!spots.length) return false;
    const k = +pick(spots);
    Object.assign(e, { x: k % W, y: Math.floor(k / W) });
    fill.site = m.sites[k].kind === 'ruin' ? 'ruin' : siteName(s, m.sites[k]);
    fill.asite = aOrAn(fill.site);
    if (kind.id === 'fetch') {
      fill.thing = pick(kind.things);
      const it = makeItem(s, 'parcel', null, null, true);
      it.label = fill.thing.charAt(0).toUpperCase() + fill.thing.slice(1);
      it.errand = true;
      (m.depots[k] = m.depots[k] || { water: 0, fuel: 0, items: [] }).items.push(it);
    }
  }
  const where = homePos(s, area, e.x, e.y);
  fill.dir = dirFrom(worldPos(s), where.x, where.y);
  e.text = kind.text.replace(/\{(\w+)\}/g, (_, k) => fill[k]);
  s.errand = e;
  // the place is marked on that region's map
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const xx = e.x + i,
        yy = e.y + j;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H) m.seen[idx(xx, yy)] = 1;
    }
  if (m.sites[idx(e.x, e.y)]) m.sites[idx(e.x, e.y)].seen = true;
  say(s, 'At the long table, ' + giver + ' has work for you. ' + e.text, 'good');
  return true;
}

function claimErrand(s) {
  const e = s.errand;
  if (s.over || !e || !e.done || !atInn(s)) return false;
  if (e.kind === 'fetch') {
    const i = s.player.items.findIndex((it) => it.errand);
    if (i < 0) return false;
    s.player.items.splice(i, 1);
  }
  s.errand = null;
  s.errandsDone = (s.errandsDone || 0) + 1;
  if (e.liar) {
    say(
      s,
      'You look for ' +
        e.giver.split(' who')[0] +
        ' at the long table. Gone, days ago, without a word: there will be no pay. The innkeeper shrugs: "I could have told you."',
      'bad',
    );
    return true;
  }
  s.player.coin += e.reward;
  let got = e.reward + ' coin';
  if (srand(s) < E().itemChance) {
    const it = genItem(s, { relic: true, noConsumables: true });
    it.known = true;
    s.player.items.push(it);
    got += ' and ' + itemNameLower(it);
  }
  say(s, e.giver.charAt(0).toUpperCase() + e.giver.split(' who')[0].slice(1) + ' pays you: ' + got + '.', 'good');
  return true;
}
const itemNameLower = (it) => 'a ' + itemName(it);

// Steps get done as you play: the creature dies, you pick up the parcel, you reach the place.
on('did', (s) => {
  const e = s.errand;
  if (!e || e.done || s.off.errands) return;
  const m = mapOf(s, e.area);
  if (!m) return;
  if (e.kind === 'slay' && !m.creatures.some((c) => c.id === e.cid)) {
    e.done = true;
    say(s, 'That is the creature you were sent for. Back to the inn for your pay.', 'good');
  }
  if (e.kind === 'fetch' && s.player.items.some((it) => it.errand)) {
    e.done = true;
    say(s, 'You have what you were sent for. Back to the inn with it.', 'good');
  }
  if (e.kind === 'find' && s.area === e.area && s.player.x === e.x && s.player.y === e.y) {
    e.done = true;
    say(s, 'You have seen it. Back to the inn to tell them.', 'good');
  }
});
SWITCHES.push(['errands', 'Errands at the inn']);
NOTES.push((s) => {
  const out = [];
  if (s.errand && !s.off.errands) out.push({ label: 'Your errand', text: errandInfo(s).text });
  if (s.errandsDone) out.push({ label: 'Errands done', text: s.errandsDone + '' });
  return out;
});

export { askErrand, claimErrand, errandInfo };
