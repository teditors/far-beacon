# Journal of commission/1

Newest entry first. Win rates are from the playtest bot (`node tests/playtest.js 150`, seed set 0 unless stated).
Baseline before any piece: **24 / 150** (16%).

## Piece 3: rolled gods

**What it is.** The god of a world is no longer one of three: it is rolled from a gift, a cost and, half the time, a
vow ("You must never light a fire", "never run from a fight", "never disturb the ruins of the dead"). Its name and
shrine colour come from the gift's domain (water, heights, night, hearth, road, war, harvest, sight): "Karna, Who
Counts the Slain: Blows glance off you. You see less far when you survey. You must never run from a fight." Break a
vow and the god turns away: the gift is gone and the cost stays. One god in eight is rare: a generous god (no cost),
twin gods (two gifts, two costs), or a jealous god (two gifts and a vow, no cost).

**In play.** Each shrine is a real decision, different every world, and a vow changes how you play for the rest of
that traveller's life. The budget (gift + cost + vow = 1, give or take 1) keeps gods mildly worth swearing to.
Bot win rate unchanged (20 / 150 on set 5, 28 on set 1000), because the bot never swears a pact.

**Commits.** "Gods are rolled from a gift, a cost and a vow". Switch: `godslots` (the hand-written god of
content/gods.js comes back).

**Shared bricks.** `godMakers` in core.js (a piece can supply the world's god), and every player action is announced
as `emit(s, 'did', { id, site })` from the wrapper in rules/index.js.

**Choices made without asking.**
- The written gods stay as the fallback, and `s.god` is still rolled from them, so the switch and old saves work.
- A cost may not touch any stat its gift touches, so a god never gives and takes the same thing.
- When a small gift and a vow already meet the budget, the vow is the god's only price.
- The ideas "a dead god", "rival gods" and "a god only reachable far from home" are not done; the far god needs
  sites placed in other regions, which I would do after towns beyond home exist.
- tests/pieces.test.js is new: one block per piece checking its own promises (budget, vow breaking, the switch).

**Verdict: pearl.** It is the commission's slot pattern in its purest form, and vows are a new kind of rule.

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
