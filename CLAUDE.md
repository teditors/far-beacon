# Far Beacon: notes for Claude

> **On a `commission/*` branch, read `COMMISSION.md` first.** It is the brief for that branch and overrides the
> Git section below.

A hobby game: a first-person, procedurally generated survival-exploration roguelike in the browser (Three.js r128).
The owner, Andrew, is learning as he goes. Tinkering is the real goal, so keep the code modular, readable and
easy to change. Read `ARCHITECTURE.md` before changing anything structural; `CHANGELOG.md` says what each version did.

## Working with Andrew

- He mostly works from his phone. Keep replies short and lead with the outcome. Say what changed for the player,
  not which functions moved.
- He relies on Claude to keep git clean. He wants "check in, check out" and nothing fancier.
- Aesthetics come last: the game must work as a game first. Ask before large visual or design changes.
- Design discussion and the design doc live in a separate claude.ai chat. Record what you build in `CHANGELOG.md`
  and `ARCHITECTURE.md` so that chat can catch up from the repo.

## Commands

- `npm install`, then `pip install playwright && playwright install chromium` for the browser test.
- `node tools/build.js` bundles `src/` into `dist/index.html`, a single self-contained page. Open it in a
  browser to play. `dist/index.html` is committed with each version, so a frozen branch holds a playable copy.
- Every push to `main` or a `commission/*` branch rebuilds playable copies of `main`, every commission branch and every
  frozen version, and publishes them with GitHub Pages (`.github/workflows/site.yml`, `tools/site.sh`). Each copy keeps
  its own saves.
- `node tools/check.js --quick` runs everything except the slow bot playtest and browser smoke test. Run it after
  every change.
- `node tools/check.js` runs everything (about 3 minutes). Run it before every commit.
- `node tests/state.test.js --update` accepts a deliberate change to world generation (it rewrites
  `tests/snapshot.json`). Only use it when you meant to change what worlds look like.
- `node tests/playtest.js 150` is the balance thermometer: an honest bot plays 150 worlds. Set `OFF=<n>` to use a
  different seed set. Win rates swing by a few runs between seed sets, so compare several sets before believing a
  change.

## Git

- One commit per working step, with all checks passing, straight to `main`, then push.
- A milestone gets a version bump in `package.json`, a `CHANGELOG.md` row, and a frozen branch:
  `git push origin HEAD:refs/heads/version/vX.Y`. Pushing tags has been refused by the git proxy in cloud sessions,
  so frozen branches stand in for tags; do not try to work around a refusal.
- To roll back, restore the old files as a new commit. Never rewrite history on `main`.
- A commission branch is deleted once it is merged into `main` (its history lives on in `main`). The git proxy in
  cloud sessions refuses branch deletion, so Andrew deletes merged branches on GitHub (Branches page).

## How features are built: pieces

Since v0.12 every feature is a **piece**: one idea that works on its own, the way the first commission built them.

- Its data in its own file in `src/content/`, its rules in its own module in `src/rules/`, hooked in through
  `src/rules/hooks.js`, events and generator wrappers rather than edits scattered through other files.
- A switch in `s.off` (listed in the Tinker panel), so it can be turned off to compare, and `NO=<switch>` in the
  playtest. If a piece only acts when a world is made, `newGame(seed, off)` takes the switches.
- A block in `tests/pieces.test.js` checking its own promises, and its menus in the generated `ALMANAC.md`
  (`node tools/almanac.js`).
- An entry in `JOURNAL.md`, newest first: what it is, what it changes in play, its commits and switch, choices made,
  and a verdict.
- New state fields optional where possible, so old saves load without a migration.

## Code rules (see ARCHITECTURE.md for the why)

- Three layers: `src/rules/` is pure game logic and runs in Node (no DOM, no Three.js), `src/view/` draws and
  handles input, and `src/content/` is data. Content changes should not need rule changes.
- All game state is one plain JSON object `s`. Randomness during play comes from `srand(s)`. World generation uses
  named streams, `stream(seed, name)`, so adding a stream never changes other things. Never call `Math.random` in
  the rules.
- Numbers go through the modifier stack `stat(s, name, base)`. A new race, god, item or ground type should be a name
  plus modifiers in `src/content/`.
- Systems talk through `emit` / `on`. A system can be switched off (`s.off`), and tuning lives in `s.tun`.
- **Saves must keep loading.** Any change to the shape of `s` bumps `VERSION` in `src/rules/core.js` and adds a
  migration in `src/rules/save.js`. Before bumping, run `node tools/once/make-fixtures.js` to freeze saves in the old
  format into `tests/fixtures/`. The state test loads every fixture, upgrades it, and plays on.
- The world is a wrapping grid of regions. A border is crossed in exactly one place, `move()` in
  `src/rules/actions.js`. The home region's id is `'overworld'`. The quest's places lie across a chain of regions (the `plot` piece).
- Rules keep separate maps (regions, the town, vault levels). The view stitches them so the player sees no seams.
- Run `npx prettier --write src` before committing.

## Commit messages

Say what changed for the player in the first line. End with the attribution lines the session gives you.
