# Journal of commission/1

Newest entry first. Win rates are from the playtest bot (`node tests/playtest.js 150`, seed set 0 unless stated).
Baseline before any piece: **24 / 150** (16%).

## Piece 2: the year

**What it is.** Every world has a year: a drought, a hard winter, a still year, long nights, a lean year, and so on.
One world in seven gets a rare year instead: a wide world (5 x 5 regions), two moons (you can see at night), thin
air, heavy ground, or the long dark (the sun is up only from ten until four). The year is announced in the first
lines of the log and listed in the Journal under "This world".

**In play.** The weather, light and water budget of a world now differ from world to world even when the biome is the
same. Bot win rate: seed set 5: 20 / 150 with the year, 24 without; set 1000: 28 vs 29. A little harder on average,
as expected, since several years are pure hardship.

**Commits.** "Every world has a year". Switch: `year` (in the Tinker panel; `NO=year` in the playtest turns it off from
world creation on).

**Shared bricks this piece added** (later pieces use them, so lift this piece first):
- `src/rules/hooks.js`: `NOTES` (lines for the Journal's "This world"), `SWITCHES` (extra Tinker switches).
- `newGame(seed, off)`: switches passed in apply while the world is made too, and end up in `s.off`.
- `emit(s, 'worldBorn', { rnd, off })` at the end of `newGame`, so a piece can roll and announce its part.
- A piece adds a stat source with `SOURCES.push` from its own module.
- `clock()` reads `s.tun.dawn` and `s.tun.dusk` when present.
- `tests/playtest.js` reads `NO=a,b` to switch pieces off.

**Choices made without asking.**
- New state fields are optional (`s.year` absent means no year), so old saves keep loading with no VERSION bump. I
  will follow this rule in every piece where I can: it keeps pieces independent of each other's migrations.
- The year's changes to tuning numbers (storm gap, lantern fuel, world size, dawn and dusk) are made once, into `s.tun`,
  so the Tinker panel shows them. The runtime switch turns off only the year's modifiers; `NO=year` turns off all of it.
- The game still starts at 6:00, so in a year of long nights or the long dark you set out in the dark.

**Verdict: pearl.** Small, cheap, felt from the first line of the log. The wide world in particular is a genuinely
different game, once there is more to do away from home.

## Piece 1: the Almanac

**What it is.** `ALMANAC.md` is a catalogue of every menu the game rolls from and every option on it, with the numbers
that matter. It is written by `node tools/almanac.js` straight from `src/content/`, so it cannot drift: `tools/check.js`
now runs `node tools/almanac.js --check` and fails if the file is out of date.

**In play.** Nothing changes. Win rate unchanged (24 / 150).

**Commits.** "Almanac: a generated catalogue of every menu the game rolls from". No switch (it is a document).

**Choices made without asking.**
- Modifiers are written exactly (`waterDrain x0.5`, `carryCap +2`) rather than in the game's friendlier wording, because the
  Almanac is for the designer, not the player.
- A content key that no section covers is listed under "Not yet catalogued", so a new menu shows up even before it gets
  its own section.

**Verdict: pearl.** Cheap, and it makes every later piece reviewable at a glance.
