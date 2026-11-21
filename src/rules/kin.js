/* Kin of the new places (content/kin.js): the windborn, who fly by nature, and the merrow, who breathe water. They join
   C.races (marked exotic, and `kin`, so no ordinary draw offers them), and are offered beside the usual races only in
   a world that has places in the sky, or a sea. Switch: s.off.kin (at creation). */
import { C, byId, on, say, stream } from './core.js';
import { SWITCHES } from './hooks.js';
import { updateSwim } from './sea.js';

for (const r of C.kin.races) if (!byId(C.races, r.id)) C.races.push(Object.assign({}, r));
on('worldBorn', (s, d) => {
  if (d.off.kin) return;
  const r = stream(s.seed, 'kin'),
    offer = (id, why) => {
      if (r() < C.kin.chance && !s.offer.races.includes(id)) {
        // beside the usual offer, or in place of its last if the offer is already as long as a world's can be
        const most = C.roster ? C.roster.offer.races[1] : 12;
        if (s.offer.races.length >= most) {
          const k = s.offer.races
            .map((x, i) => i)
            .reverse()
            .find((i) => s.offer.races[i] !== s.char.race); // not the first traveller's
          s.offer.races[k] = id;
        } else s.offer.races.push(id);
        say(s, 'Among the travellers this world can send are ' + byId(C.races, id).name.toLowerCase() + ' folk: ' + why + '.');
      }
    };
  if ((s.skies || []).length) offer('windborn', 'something floats in this sky');
  if (s.world.sea) offer('merrow', 'this world has a sea');
});
// a merrow traveller can go on deep water from the first step
on('did', (s, d) => {
  if (d.id === 'setCharacter' || d.id === 'nextTraveller') updateSwim(s);
});
SWITCHES.push(['kin', 'Windborn and merrow (new worlds)']);
