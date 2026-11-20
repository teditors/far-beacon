# Far Beacon: how the code is put together

A first-person survival-exploration roguelike that runs in a browser. This file is the map of the code:
read it before changing anything large.

## The one rule that matters most

**The rules never touch the screen, and the view never decides anything.**

- `src/rules/` is the game: plain data in, plain data out. It runs in Node with no browser, which is
  what lets the tests play thousands of games in seconds.
- `src/view/` draws the state and turns taps and keys into calls on `Rules`. If you find yourself
  writing an `if` about game outcomes in the view, it belongs in the rules.
- `src/content/` is data. Most new things (a biome, an item, a creature form, a trait) are a new
  entry here and no code.

## Layout

```
src/
  content/      data only, one theme per file; index.js merges them into CONTENT
  rules/        the game logic, as ES modules
    core.js       constants, lookups, named random streams, events, the clock
    stats.js      the modifier stack: every number goes through stat()
    systems.js    things that happen as time passes (thirst, cold, weather...)
    worldgen.js   newGame(seed): builds a world
    areas.js      the overworld, the town and each dungeon level as separate maps, and moving between them
    interiors.js  generators for the town and the levels of the locked place
    map.js        questions about the map: where you are, what you can see
    actions.js    everything the player does outside a fight
    combat.js     creatures and turn-based fights
    quest.js      the rolled quest, the town, the locked place
    character.js  rolling characters, setting out, the next traveller
    civ.js        the lost people's traits
    items.js / equipment.js / progress.js
    save.js       saving, loading and save migrations
    index.js      the public Rules object; the view and tests use only this
  view/         Three.js scene, HUD, panels and input
  shell.html    the page; the build inlines the bundle into it
  main.js       browser entry point
tests/          see "Checking your work"
tools/build.js  builds dist/index.html (one self-contained page) and build/rules.cjs (for tests)
tools/check.js  runs every test
```

## How the pieces talk (the Lego rules)

1. **Systems never call each other.** They read shared state and announce events with `emit()`;
   anyone interested listens with `on()`.
2. **Things are built from parts.** An item is a base plus affixes plus an optional people's mark.
3. **Every number passes through one modifier stack** (`stat()` in stats.js). Gear, affixes, race,
   class, abilities, terrain, weather, gods and shelter are all *sources* in `SOURCES`. A new
   feature that changes numbers should be a new source, not a special case.
4. **Any system can be switched off** (`s.off[id]`). The game must still run.
5. **Tuning happens live**: the Tinker panel edits `s.tun` while you play.
6. **Build a general brick only when its second use arrives.**

## Areas

The overworld, the town and each level of the locked place are separate maps on the same 36 x 36 grid. The map the
player is in sits at the top of the state (`s.terrain`, `s.sites`, `s.depots`, `s.creatures`, `s.seen`...), so most
rules never need to know where they are. Every other area is parked in `s.areas[id].map` until the player goes back.
`enterArea` and `leaveArea` in areas.js do the swapping; an interior's map is generated the first time it is entered.

- `s.area` names where the player is; `areaRec(s)` gives its record (`kind`, `indoor`, `dark`, `level`, `from`).
- Quest places live on the overworld. Use `worldMap(s)` and `worldPos(s)` for them, never `s.sites`, which is
  whatever area the player is in.
- The view shows the same grid at two scales: 28 m tiles outdoors, 4 m tiles inside (`setGeometry` in view/ctx.js).
- New kinds of interior: add a generator to `GENERATORS` in interiors.js and an entry point in quest.js or actions.js.

## The world

The outdoors is a grid of regions (`s.world`: `cols`, `rows`, `home`, and a `sketch` with each region's biome and
danger). The size is stored per world and rolled from the seed (the `worldsize` piece, from 2 x 3 to 7 x 7); nothing
may assume 3 x 3. Each region is an area of kind `region`, parked like
any other; the home region keeps the id `overworld`, the rest are `r<cx>_<cy>`, built by `GENERATORS.region` the
first time the player arrives.

- The world wraps in both directions. `move()` in actions.js is the only place a border is crossed
  (`switchRegion`), which is where seamless borders will be added later.
- Landforms come from `worldNoise` (world.js), which repeats at the world's size, so land lines up across borders.
- `crossings(seed, world, cx, cy)` (world.js) says where rivers and roads cross each of a region's four edges. Both
  neighbours get the same answer, and nothing else may put a river or road on a region's outermost tiles.
- Mountain and hill thresholds are measured over the whole world, and biome fractions blend within 6 tiles of a border.
- The eight regions around the player's are built ahead (`ensureAround`), unvisited, so the view can draw them. The
  view (terrain.js) cuts one square of land from the nine regions: the player's at full detail plus a 22-tile margin
  at half detail. Rocks, trees and ground noise are placed from world position, so they do not move at a border.
- The town is built at world creation (`ensureTown`) and stands on the 5 x 5 outdoor tiles around its site, which
  are impassable outdoors (`inTownBlock`). `move()` north from `townDoor(s)` enters it at `TOWN_GATE`; `move()` south
  off the map from the gateway leaves it. The view draws the town's own grid in place and only shifts its origin
  (`FR`, `applyFrame`) when the player goes through the gate; nothing is rebuilt.
- Since commission 2 (the `plot` piece) the quest places are spread over the regions around home: `s.town.area`,
  `s.goal.area`, `s.quest.keyArea` / `beastArea`, and the locked place's site lives in its region's map. Use
  `findSite(s, kind)` (returns `area`), `townArea(s)`, `keyRuin(s)`, `beastOf(s)` and `mark(s, x, y, area)`; never
  assume the home region. `localPos(s, area, x, y)` gives a place in the frame of the region the player is in, and
  `homePos` in home coordinates, for directions. With `NO=plot` everything stays home as before.
- Several towns: `s.town` is the story's (area `'town'`), others are in `s.towns` (`id` = area id, `area` = region).
  Use `curTown(s)` in anything that happens in a town, `allTowns(s)`, `townById`, `townInRegion`, and `withTown(s, t,
  fn)` to run one-town code for another town. `addTown(s, cx, cy, r)` (moretowns.js) makes one.
- Plots (`plots.js`, content in `content/plots.js`): `s.plots`, each a list of steps over roles placed at creation. One is
  `main` (the great trouble: finishing it wins, `s.over.ending`). The relic's story is the plot of kind `relic`, run by
  quest.js as before; `PLOT_HOOKS` in quest.js lets plots.js take over the story town's talk and the goal line.
  `plotGoal(s, p)` says where a plot wants you next (the bot uses it). A new plot is a content entry using the role
  and step kinds listed at the top of content/plots.js.
- `s.camp` is `{ area, i }`; use `campHere(s)`. `s.biome` is the biome of the region the player is in.
- `inOverworld(s)` means "outdoors, in any region".

## The phone budget

The game must run on a phone. `src/view/quality.js` holds the graphics presets (Low / Medium / High) and the device's
settings (`farbeacon.settings` in browser storage, not in the run). Anything visual that costs reads `Q` (the preset in
use) rather than a constant: `terrain.js` takes the drawn margin and the ground's fineness from it (`setDetail`), the
scene takes tree and rock density, the renderer its pixel ratio. `src/view/perf.js` is the on-screen meter. Measure a
change with `python3 tools/bench.py low medium high` before and after. Saves write map grids as run-length text
(`packGrid` in save.js).

## Plugging a piece in

A self-contained piece (the year, for example) lives in its own module and plugs itself in without editing shared
lines: it pushes a stat source onto `SOURCES` (stats.js), a system onto `SYSTEMS`, lines for the Journal onto `NOTES`
and a Tinker switch onto `SWITCHES` (hooks.js), and listens for `'worldBorn'`, emitted at the end of `newGame`. Its
content goes in its own file in `src/content/` and gets a section in `tools/almanac.js`. `newGame(seed, off)` takes
switches that apply while the world is made, so a piece can be compared against the game without it
(`NO=year node tests/playtest.js 150`). New state fields are optional where possible, so old saves need no migration.

More hooks, added by later pieces on the commission/1 branch:

| Hook | Where | What it lets a piece do |
| --- | --- | --- |
| `emit(s, 'did', { id, site })` | rules/index.js | react to any player action (vows, errands, being told things) |
| `godMakers` | core.js | supply the world's god (rolled gods) |
| `stormMakers`, `stormOf(s)` | core.js | supply the storm now blowing (odd weather) |
| `SKETCHERS` | hooks.js | change what regions are before any land is built (generated biomes) |
| `LOADERS` | hooks.js | rebuild what is derived from the seed when a save loads |
| wrapping `GENERATORS.region` / `.vault` | the piece's module | add to a region or a level as it is built (artifacts, lairs, odd levels) |
| `town.*` stats | quest.js `priceOf`, `buyPrice` | change the town's prices through the stat stack (town cultures) |
| `ACTIONS` | hooks.js | add buttons for where the player stands, in or out of a fight (town people, fight moves) |
| `TALK` | hooks.js | people a piece puts in the world, shown by the one dialog `serviceInfo` / `useService` |
| `ITEM_HOOKS` | hooks.js | finish an item `genItem` has just made (tiers by distance) |
| `emit(s, 'killed', ...)` | combat.js | react to a kill (gains on a kill) |

Each piece's checks are a block in `tests/pieces.test.js`, and its menus a section in `tools/almanac.js`.

## State

The whole game is one plain object `s` (see `newGame` in worldgen.js). It is saved as JSON, so it
must stay plain data: no functions, no class instances, no references between objects other than
ids and tile indices. Content is never copied into the state; the state stores ids and looks content
up with `byId`.

Randomness:
- **World generation** draws from *named streams* (`stream(seed, 'terrain')`, `'sites'`, `'quest'`...).
  Each part of the world has its own, so adding a step to one part does not reshuffle the others.
  New generation code should take a new stream name rather than borrow an existing one.
- **Play** draws from `srand(s)`, a stream stored in the state, so a loaded save continues exactly
  as it would have.

## Changing the save format

The state carries a version, `s.v`, equal to `VERSION` in core.js. If you change the shape of the
state in a way old saves would not survive:

1. bump `VERSION`;
2. add a migration to `MIGRATIONS` in save.js that upgrades a save from the old version;
3. run the checks. A save that cannot be upgraded is refused with a readable message rather than
   breaking the page.

Players can copy a run out of Menu and paste it into another device.

## Adding things

| To add | Do this |
| --- | --- |
| An item base or affix | an entry in content/items.js, a value in content/tuning.js |
| A trait of the lost peoples | an entry in the right list in content/peoples.js, then make the rules read its fields in civOf() |
| A creature form | an entry in content/creatures.js, and a model in view/scene.js |
| A biome | an entry in content/biomes.js (the content test lists every field it needs), and name prefixes in content/creatures.js |
| A god | an entry in content/gods.js |
| A new kind of modifier | use a new stat name in content, read it with stat() in the rules, and add it to the known list in tests/content.test.js |
| A system that runs over time | an entry in SYSTEMS in systems.js |
| A player action | a function in actions.js, an entry in actions() so it gets a button, and export it from index.js |

## Checking your work

```
node tools/build.js          build the page into dist/index.html
node tools/check.js --quick  build plus the fast tests (about 2 seconds)
node tools/check.js          everything, including a 40-world playtest and the browser test (about 45 seconds)
```

| Test | What it catches |
| --- | --- |
| content.test.js | broken references in data, unknown stat names, missing biome fields |
| state.test.js | non-deterministic worlds, saves that load differently, broken world invariants; warns when world generation changes for existing seeds (accept with `--update`) |
| fuzz.js | crashes and impossible values under random play, with save and reload along the way |
| quest.js | every rolled quest shape can actually be completed |
| playtest.js | a bot plays honestly and reports win rate and causes of death; a balance thermometer, not a pass or fail |
| smoke.py | the built page in a real browser: create, walk, panels, town, a fight, reload, with no page errors |

## Where this is going

Planned next, in order, so changes now should not paint us into a corner:

1. **Areas.** Done in v0.8: see "Areas" above.
2. **Regions.** Started in v0.9: see "The world" above. Borders agree since v0.10, and can be seen across since v0.11. Still to do: walk-in doors and stairs for the locked place, a 5 x 5 world, towns and roads beyond
   the home region, water guaranteed along routes, and borders you can see across (seamless travel).
3. **Generated biomes** with a rare-trait slot, then side quests, creatures, races and classes,
   and unique items, all as content menus.

## Versions and git

Work goes onto `main`, one commit per working step, with all checks passing. A milestone gets a version:
set `version` in package.json, build, commit, then push that commit as the branch `version/vX.Y` (and tag it
`vX.Y` locally). Version branches are never moved. CHANGELOG.md lists them. To roll back, restore an old
version's files as a new commit on `main`, so history is never rewritten.

`tools/once/` holds the scripts that split the original single-file game into modules. They are a
record, not part of the build.
