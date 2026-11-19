/* Hooks that let a self-contained piece plug itself in without editing the shared files.
   - NOTES: functions (s) => [{ label, text }] describing this world; the Journal screen shows them all.
   - SWITCHES: [id, label] pairs added to the Tinker panel's on/off switches.
   A piece also adds stat sources with SOURCES.push (stats.js), systems with SYSTEMS.push (systems.js), and listens for
   'worldBorn' (emitted at the end of newGame, with { rnd, off }) to roll and announce what it adds to a new world. */
const NOTES = [];
const SWITCHES = [];
const worldNotes = (s) => NOTES.flatMap((fn) => fn(s) || []);
export { NOTES, SWITCHES, worldNotes };
