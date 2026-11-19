# Journal of commission/1

Newest entry first. Win rates are from the playtest bot (`node tests/playtest.js 150`, seed set 0 unless stated).
Baseline before any piece: **24 / 150** (16%).

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
