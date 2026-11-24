# The ninth commission: Super Feline Mode

This branch, `commission/9`, is Andrew's ninth commission. The first eight were merged into `main` as v0.12 to v0.19.
This one is different, and Andrew is a little sheepish about it: a new mode, **Super Feline Mode**, in which the whole
game becomes about cats.

**This file overrides the Git section of CLAUDE.md for this branch.** Everything else in CLAUDE.md applies, including
"How features are built: pieces" and `ART.md`. Read `JOURNAL.md` first; carry it on under "Commission 9", newest first.

## The idea

All the rules stay the same. Only the surface changes, but it changes **everywhere**: a total conversion, at least
superficially, touching every part of the game, so that no screen, word, sound or model escapes it. The result should
make it plain that the developer has a troubling obsession with cats. Commit to the bit fully; the jokes should be
affectionate, silly and relentless.

- **Rules unchanged.** As much as possible, this is done by renaming and re-dressing what exists: little or no
  gameplay difference. Water is still water underneath, it is just called kibble.
- **Unavoidable once on.** Every word, picture and sound the player meets is catted: names, the log, the journal, the
  map, menus, the Almanac's player-facing names, the death and victory screens, the codex.

## What changes (starting points; go further)

- **The traveller and peoples.** Every race is a breed of cat (Maine Coon, Siamese, Sphynx, Persian, tabby, tuxedo,
  calico, Scottish Fold, the exotic and hybrid ones as stranger or rarer breeds). Classes are catted up: Paladin to
  Meowladin, Ranger to Rangefur, Wizard to Whiskard, Rogue to Clawgue, Cleric to Purrist, and so on for every class,
  vanilla and exotic.
- **Everyone has a cat face.** All townsfolk, travellers, enemies, guardians and villains get cat heads: ears,
  whiskers, a muzzle, cat eyes. Creatures become cat-themed foes: **deadly vacuum cleaners**, **dust bunnies**, the
  dog next door, the bath, the cucumber, the spray bottle, the vet.
- **Survival.** Water becomes kibble (or milk), the tent or shelter becomes a cat bed, a campfire is a sunbeam or a
  warm laptop, fuel is catnip or yarn, warmth is purr, rest is a nap, and so on through every item, stat and action.
- **The world.** Blizzards are furricanes, rain is a hairball shower, dust storms are litter storms. Biomes, ruins,
  dungeons, towns, the sky and the sea all get cat names and touches: scratching-post towers, cardboard-box ruins, the
  Great Litter Desert, cat-tree forests, a floating castle of cushions.
- **The plots.** The great troubles and side troubles are re-dressed: chasing the **laser pointer** (the red dot as the
  beacon, perhaps), recovering the **secret pudding**, finding the **crunchy cat cookies**, defeating the Vacuum
  Tyrant, rescuing a kitten stuck up a tree, curing the dreaded Bath Curse, a feud between the indoor cats and the
  outdoor cats. Artifacts and relics become legendary cat treasures (the Golden Feather Wand, the Infinite Box).
- **Textures and look.** Paw prints, fur patterns, tabby stripes, yarn, cardboard, carpet and cushion where they fit,
  within the art style. The sun might have whiskers. Use judgement: it must stay readable and playable.
- **Sound and music.** A cat soundtrack: the score's instruments joined or replaced by meows, purrs, chirps and trills
  (synthesised, as now), hisses for danger, a purr when you rest. Tunes can keep their shapes.

## Turning it on

- A switch like any piece (in Settings and on the "new world" screen). Off by default.
- Since Andrew wants it to be unavoidable, also consider a rare roll: once in a long while (say 1 world in 50), a world
  simply is feline, whether the player asked or not, with a suitable announcement. Make that its own switch.
- Build it as **a theme layer** rather than edits everywhere: a dictionary of renamings in `src/content/`, applied
  wherever text is shown; a catted model kit applied through the same hooks the view already has; a sound bank for the
  score. That way other themes could be made the same way later. If some text cannot be reached that way, fix how it
  is produced rather than special-casing it.

## Andrew's own cat songs (optional)

Andrew has made a set of cat songs of his own. They may become an optional full soundtrack for this mode:

- The song files are **not** in the repository yet. Andrew will add the ones he chooses later (for example in
  `assets/cat-songs/`). Build the player so it picks up whatever audio files are there, plays them in this mode only,
  and works fine with none.
- Keep them out of the one-file game: the main page should not grow by megabytes. Load them only when the player turns
  the full soundtrack on (a setting), from separate files published alongside the game on the site.

## Guardrails

- Rules and balance unchanged: the bot's win rate with the mode on should match it with the mode off, within noise.
  Run the playtest both ways and record both.
- Tests: a check that, in Super Feline Mode, no player-facing text from the base game leaks through untranslated (as
  far as can be tested), and that turning the mode off restores everything.
- Saves keep loading. The mode should not need a save-format change; if it does, a migration and fixtures.
- Update `docs/look/` with pictures of the mode: a cat-faced townsperson, a vacuum cleaner, a cat-bed camp, a street.
- `node tools/check.js` passes before every commit.
- **Do not stop to ask.** Make the most interesting reasonable choice, record it in the journal, carry on.
- **Stay inside the game.** No network calls, outside services or downloaded assets.

## Git on this branch

- Commit to `commission/9` only. Never commit to or push `main`, and never push `version/*` branches.
- Merge `main` into `commission/9` at the start of each session and before each large piece.
- Commit after each working step and push often. Every push publishes a playable copy at
  https://teditors.github.io/far-beacon/
- For a long run, start a new session part way rather than letting one grow very long: read `JOURNAL.md` and carry on.

## When you finish or run out of ideas

Write a summary at the top of the "Commission 9" part of `JOURNAL.md`: the pieces in order, the win rates with the mode
on and off, your three best jokes, what you would do next, and a CHANGELOG row for the merge into `main`.
