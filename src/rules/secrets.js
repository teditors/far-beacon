/* Secret value (commission 7): a few old things, in ruins, caves, dungeons and empty houses, are not what they seem. A
   dull ring is old gold, a cracked bowl is of rare make, a mouldering book is one the lost people wrote. It looks like
   nothing much (the merchant pays as for anything unknown) until it is appraised in a town; then it has its true name
   and its worth. Which things are secrets is rolled as each place's things are made (THING_FINISH), from the seed.
   Content: `secrets` in content/things.js. Switch: s.off.secrets (none are secrets; places keep the same things). */
import { C } from './core.js';
import { ITEM_NAMES, ITEM_VALUES, NOTES, SWITCHES } from './hooks.js';
import { THING_FINISH, thingKind } from './things.js';

const S = () => C.things.secrets;
THING_FINISH.push((s, t, o, r) => {
  const roll = r(), // always drawn, so that switching secrets off leaves every place as it was
    pick = r();
  if (s.off.secrets || !t.old || thingKind(t.k).fixed) return;
  const can = S().list.filter((x) => x.of.includes(t.k));
  if (!can.length || roll >= S().chance) return;
  t.sec = can[Math.floor(pick * can.length)].id;
});
const secretOf = (it) => (it.thing && it.thing.sec ? S().list.find((x) => x.id === it.thing.sec) : null);
// known (appraised, or sold): its true name and worth
ITEM_NAMES.unshift((it) => {
  const sec = secretOf(it);
  if (!sec || !it.known) return null;
  const n = sec.name.replace('{thing}', thingKind(it.thing.k).name).replace('{people}', it.thing.people || 'lost');
  return n.charAt(0).toUpperCase() + n.slice(1);
});
ITEM_VALUES.unshift((it) => {
  const sec = secretOf(it);
  return sec && it.known ? sec.value : undefined;
});
SWITCHES.push(['secrets', 'Old things that are secretly valuable']);
NOTES.push((s) => {
  if (s.off.secrets) return [];
  const found = s.player.items.filter((it) => secretOf(it) && it.known).length;
  return found
    ? [
        {
          label: 'Finds',
          text: 'You carry ' + found + ' old thing' + (found === 1 ? '' : 's') + ' that proved worth far more than they looked.',
        },
      ]
    : [];
});
export { secretOf };
