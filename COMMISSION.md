# The second commission

This branch, `commission/2`, is Andrew's second commission. The first (`commission/1`, fifteen pieces) was merged into
`main` as v0.12 and he loved all of it. He wants more, with more of your own judgement this time. Afterwards he will
play the branch, keep what he likes, and merge it into `main`.

**This file overrides the Git section of CLAUDE.md for this branch.** Everything else in CLAUDE.md applies, in
particular "How features are built: pieces". Read `JOURNAL.md` to see how the first commission worked; carry on that
journal, newest first, under a heading "Commission 2".

## What Andrew asked for

These come first, roughly in this order. Each is one or more pieces with switches.

1. **No town dialogue.** The town is walked into seamlessly now, so the "Enter <town>" / "Leave <town>" buttons are
   pointless. Remove them.
2. **Towns, open and many-gated.** Walls around towns should be rare. Most towns are open, and a walled town usually
   has several gates, not one. Today the town's 5 x 5 outdoor block is impassable except through one gate tile
   (`inTownBlock`, `townDoor`, `TOWN_GATE` in `src/rules/areas.js`; the view's wall collision in `tick()` in
   `src/view/run.js`). Rework that so you can walk in from any open side, keeping the rule that the town is its own
   map and the view only shifts its origin (`applyFrame`) when you cross into it.
3. **Towns worth visiting. This should be an extensive change.** Towns are boring: a square, a well, an elder, an
   inn and a shop. Fill them. Some directions, take any or none: generated layouts that differ town to town (streets,
   quarters, a market, a temple, a smithy, a stable, gardens, a graveyard); more people with names, trades and
   something to say, sell, teach or ask; services (a healer, a trainer, a mapmaker, a temple of this world's god);
   rumours that point at real places in the world; town sizes from hamlet to city; the town's culture (trade, custom,
   rare) shaping what is in it.
4. **Many more races and classes, and many more per world.** A world should offer between 2 and 12 races and between
   8 and 20 classes, not 3 and 3. Vanilla ones are common, exotic ones rarer. Write many new ones of both, with real
   differences in how they play, not only stat bundles. Hybrids are welcome. Creativity matters more than balance.
5. **The plot spread across the world.** Keep the present quest (key, locked place, relic, destination), but its
   places (town, key, locked place, beacon or shrine, the well you set out from) should lie in different regions
   rather than all in the home region. Keep the 3 x 3 world for now, and do not hard-code its size anywhere: it will
   grow, and the rare wide year already makes it 5 x 5. Directions, the objective line and the bot must still work
   across regions. Teach the playtest bot to travel between regions (your own first suggestion last time), so the
   bot still measures the game.
6. **One map, not squares.** The map screen should show the world as a single continuous map. The regions are how it
   is stored, not something the player sees: no grid of squares, no region borders on the map. Keep fog of war and
   the player's position; let the player pan or zoom if the whole world is too big for a phone screen.

## Then, your own ideas

After those, Andrew wants you to decide. Pick what you think would make the game better, more varied and more
surprising, and build it. Your own list from last time (towns beyond home, item tiers by distance, named streams for
generation-time items, biome rares that change the rules of the land) is a fine place to start, but follow your
taste. Fix anything you find broken or clumsy on the way.

## How to work

- **Do not stop to ask.** Make the most interesting reasonable choice, write it in the journal, carry on.
- **Pieces, with switches**, as CLAUDE.md describes. A change to something that already exists (like removing the
  town buttons) can be a plain commit; anything new gets a switch.
- **Keep it working.** `node tools/check.js` passes before every commit. Keep old saves loading where you can; if a
  change cannot, bump `VERSION`, add a migration, and say so in the journal. The bot must still win sometimes.
- **Gameplay before looks**, but things the player meets should be visible: a building, a sign, a person.
- **Stay inside the game.** No network calls and no outside services.

## Git on this branch

- Commit to `commission/2` only. Never commit to or push `main`, and never push `version/*` branches.
- Commit after each working step and push often. Every push publishes a playable copy (see CLAUDE.md), so Andrew can
  play your latest work from his phone.
- If you split work across parallel sessions, give each its own branch off `commission/2` (`commission/2-<piece>`)
  and merge it back when its checks pass.

## When you finish or run out of ideas

Write a summary at the top of the "Commission 2" part of `JOURNAL.md`: the pieces in order, your three best, and what
you would do next. If you are picked up again, read the journal first and carry on where it ends.
