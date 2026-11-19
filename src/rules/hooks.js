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
const LOADERS = [];
const SWITCHES = [];
const worldNotes = (s) => NOTES.flatMap((fn) => fn(s) || []);
export { NOTES, SWITCHES, SKETCHERS, LOADERS, ACTIONS, TALK, worldNotes };
