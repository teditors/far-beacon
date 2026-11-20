/* Hooks that let a self-contained piece plug itself in without editing the shared files.
   - NOTES: functions (s) => [{ label, text }] describing this world; the Journal screen shows them all.
   - SWITCHES: [id, label] pairs added to the Tinker panel's on/off switches.
   A piece also adds stat sources with SOURCES.push (stats.js), systems with SYSTEMS.push (systems.js), and listens for
   'worldBorn' (emitted at the end of newGame, with { rnd, off }) to roll and announce what it adds to a new world. */
const NOTES = [];
// SKETCHERS: functions (seed, world, off) run in newGame right after the world's sketch is made, before any land is
// built, so a piece can change what each region will be. LOADERS: functions (s) run when a save is loaded, before
// anything else, so a piece can rebuild what it derives from the seed.
const SKETCHERS = [];
// ACTIONS: functions (s, site, list) that may push buttons onto the list of actions for where the player stands.
const ACTIONS = [];
// TALK: { info(s), use(s, option, arg) } for people a piece puts in the world; the first whose info(s) answers speaks.
const TALK = [];
// ITEM_HOOKS: functions (s, item, options) that may finish an item genItem has just made.
const ITEM_HOOKS = [];
const LOADERS = [];
// TUNERS: functions (seed, tun, off, year, set) run in newGame right after the year has set the tuning numbers and before
// the world is sketched, so a piece can change the world's size or other numbers fixed at creation.
const TUNERS = [];
// TOWN_MAKERS: functions (s, t, r) run for each town made after the first (a piece adds towns), with s.town standing
// for the new town t (see withTown) and r its own random stream, so a piece can give it what the first town gets.
const TOWN_MAKERS = [];
// WEIGHTS: functions (s) giving more weight the traveller carries (materials, trade goods).
const WEIGHTS = [];
// RUMOURS: functions (s, out) that may push rumours onto the list a townsperson picks from; each is a function () giving
// the words (and marking the map, if the rumour points somewhere).
const RUMOURS = [];
// PLACES: functions (s, out) that push places god mode can jump to: { id, group, label, go(s) }.
const PLACES = [];
// LEVELS: what the shared stair actions call for levels a piece owns: down(s) for a stair down below the first level.
const LEVELS = {};
const SWITCHES = [];
const worldNotes = (s) => NOTES.flatMap((fn) => fn(s) || []);
export {
  LEVELS,
  PLACES,
  NOTES,
  SWITCHES,
  SKETCHERS,
  LOADERS,
  TUNERS,
  TOWN_MAKERS,
  WEIGHTS,
  RUMOURS,
  ACTIONS,
  TALK,
  ITEM_HOOKS,
  worldNotes,
};
