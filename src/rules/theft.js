/* Theft (commission 7): in someone's house or shop, and in the places people live (a cloud city, a merfolk hall, a
   floating town), taking a thing is theft. For now it is simple: you are always seen, and made to put it back, and a
   window says so. A real crime system (being seen or not, a price, a bad name in the town) can replace this piece:
   it is one check on taking (TAKE_CHECKS in things.js) and the 'caught' event the view shows.
   Where nobody lives (ruins, caves, dungeons, the wild, an empty house), things are free to take.
   Switch: s.off.theft (take anything anywhere). */
import { W, emit, say, srand } from './core.js';
import { curTown, mapOf } from './areas.js';
import { NOTES, SWITCHES } from './hooks.js';
import { TAKE_CHECKS } from './things.js';

const HOUSEHOLD = [
  'the woman of the house',
  'the man of the house',
  'a girl of the house',
  'an old man by the hearth',
  'a boy of the house',
];
const PLACE_PEOPLE = { city: 'a cloud-dweller', merhall: 'one of the merfolk', raft: 'a raftsman' };
// Who sees you: the person whose building it is, by name where the town knows it.
function ownerOf(s, rec) {
  if (rec.kind !== 'house') return PLACE_PEOPLE[rec.place] || 'someone';
  const t = curTown(s),
    b = rec.b || {};
  if (b.kind === 'elder') return t.elder + ', the elder,';
  if (b.kind === 'shop') return t.merchant + ', whose shop it is,';
  if (b.kind === 'house') return HOUSEHOLD[Math.floor(srand(s) * HOUSEHOLD.length)];
  // a service: the person at the door has a name
  const m = mapOf(s, rec.town),
    st = m && b.door ? m.sites[b.door.oy * W + b.door.ox] : null;
  if (st && st.name) return st.name + ', ' + (st.role || 'whose house it is') + ',';
  return b.kind === 'inn' ? 'the innkeeper' : 'someone';
}
TAKE_CHECKS.push((s, t, rec, name) => {
  if (s.off.theft || !t.own) return false;
  const who = ownerOf(s, rec);
  s.stats.caught = (s.stats.caught || 0) + 1;
  say(s, 'You lift the ' + name + ', and ' + who + ' sees you. You put it back.', 'bad');
  emit(s, 'caught', {
    title: 'Seen',
    text:
      who.charAt(0).toUpperCase() +
      who.slice(1).replace(/,$/, '') +
      ' sees you lift the ' +
      name +
      '. "That is not yours." You put it back where it was. In ' +
      (rec.kind === 'house' ? 'a house where people live' : 'a place where people live') +
      ', what lies about belongs to someone; in ruins and empty places it is anyone’s.',
  });
  return true;
});
SWITCHES.push(['theft', 'Taking from houses is theft']);
NOTES.push((s) =>
  s.off.theft || !s.stats.caught
    ? []
    : [
        {
          label: 'Seen',
          text: 'You have been caught lifting things ' + s.stats.caught + ' time' + (s.stats.caught === 1 ? '' : 's') + '.',
        },
      ],
);
export { ownerOf };
