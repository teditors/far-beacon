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
2. **Regions.** A large world of regions generated as you reach them. Each region will be an area of kind
   `region`, using the same parking as interiors; the open question is how the grid size and the overworld-only
   fields (`s.goal`, `s.town`, `s.start`, `s.camp`) become per-region.
3. **Generated biomes** with a rare-trait slot, then side quests, creatures, races and classes,
   and unique items, all as content menus.

## Versions and git

Work goes onto `main`, one commit per working step, with all checks passing. A milestone gets a version:
set `version` in package.json, build, commit, then push that commit as the branch `version/vX.Y` (and tag it
`vX.Y` locally). Version branches are never moved. CHANGELOG.md lists them. To roll back, restore an old
version's files as a new commit on `main`, so history is never rewritten.

`tools/once/` holds the scripts that split the original single-file game into modules. They are a
record, not part of the build.
