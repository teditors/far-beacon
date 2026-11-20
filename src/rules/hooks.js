/* Hooks that let a self-contained piece plug itself in without editing the shared files.
   - NOTES: functions (s) => [{ label, text }] describing this world; the Journal screen shows them all.
   - SWITCHES: [id, label] pairs added to the Tinker panel's on/off switches.
   A piece also adds stat sources with SOURCES.push (stats.js), systems with SYSTEMS.push (systems.js), and listens for
   'worldBorn' (emitted at the end of newGame, with { rnd, off }) to roll and announce what it adds to a new world. */
const NOTES = [];
// SKETCHERS: functions (seed, world, off, set) run in newGame right after the world's sketch is made, before any land is
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
// COSTS: functions (s, x, y, mc) returning the cost of a step ({ mins, cost, base }), given the usual one (flying).
const COSTS = [];
// LOOKS: functions (s, rec) giving how a level a piece owns looks ({ stone, floor, bg, glow, void, title... }), or null.
const LOOKS = [];
// OBJECTIVES: functions (s, goalArea) that may turn the goal into another: the way to the door of the world the goal
// is in ({ text, at: { area, x, y } }), or null to leave it alone. goalArea null means a place of the home world.
const OBJECTIVES = [];
// ENTRANCES: functions (s, areaId) saying how a level a piece owns is entered from the area it opens off:
// { area, x, y, act, fly } or null (see route.js).
const ENTRANCES = [];
// LEVELS: for levels a piece owns, by area kind: LEVELS[kind](s) takes the stair down (goDown calls it).
const LEVELS = {};
const SWITCHES = [];
const worldNotes = (s) => NOTES.flatMap((fn) => fn(s) || []);
export {
  ENTRANCES,
  OBJECTIVES,
  COSTS,
  LOOKS,
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
