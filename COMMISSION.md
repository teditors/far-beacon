# The third commission

This branch, `commission/3`, is Andrew's third commission. The first two were merged into `main` as v0.12 and v0.13,
and he was very pleased with your judgement both times. This time the reins are looser: the asks are broader, larger
restructures are welcome, and the order and shape of the work are mostly yours to decide.

**This file overrides the Git section of CLAUDE.md for this branch.** Everything else in CLAUDE.md applies, in
particular "How features are built: pieces". Read `JOURNAL.md` first: it records both earlier commissions, including
your own suggestions for what to do next. Carry the journal on under a heading "Commission 3", newest first.

## The constraint over everything: a phone browser

This is a demo that must run comfortably in a browser on a mid-range-to-good phone (Andrew plays on a Pixel 9).
Every piece in this commission is measured against that.

## What Andrew asked for

The order below is a recommendation, because each step builds on the one before. Change it if you see a better one,
and say why in the journal.

### 1. Efficiency and a measured budget (do this first)

You cannot play on Andrew's phone, so give him and yourself a way to measure:

- An on-screen performance meter he can turn on (frame rate, frame time, draw calls and triangles, save size, memory
  if the browser reports it), so "runs comfortably" becomes a number he can read off and send back.
- A graphics quality setting (low / medium / high, or similar) that later visual work respects.
- Make the game cheaper where it counts. Some known costs: a save with all nine regions is about 266 KB and phone
  browsers allow only a few MB of storage, so larger worlds need saves that store what changed and rebuild the rest
  from the seed; the view builds and draws the eight neighbouring regions in full, so distant land could be simpler;
  crossing a border rebuilds the scene and can hitch. Find the real costs yourself, measure before and after (the
  browser smoke test can time frames and count draw calls, even on a software renderer), and record the numbers in
  the journal.

### 2. A world of varying size

Worlds should differ in size, not only in the rare wide year: small worlds, large worlds, and odd shapes (a 4 x 7 world
is as valid as 5 x 5). The size already lives in `s.world` and `s.tun.world`. Nothing may assume 3 x 3. Keep the
largest worlds within the phone budget from step 1.

### 3. Many plots, of real variety

The present story (find the key, go through the locked place, take the relic, light the beacon) should become one
possibility among many. Andrew wants real variety: rescue someone held captive, slay a dragon or some other great
beast, lift a curse from a town or a land, end a feud, find someone lost, escort a caravan, stop a cult, break a siege,
recover something stolen, cure a plague, and whatever else you think of. Plots can be:

- separate events, several in one world at once, some optional;
- stages of a larger quest, where finishing one opens the next;
- linked to each other (helping one side of a feud angers the other; the cure for the plague is in the dragon's hoard).

A plot may need a town, or none; it may happen in the wild, under the ground, or across several regions. Each world
needs at least one way to win, and the ending should fit the plot (not always a beacon). Andrew says this is ill
defined on purpose: he wants to see what you come up with. Expect this to need a restructure of the quest code
(`quest.js`, `plot.js`) into steps that can be chained and combined; that is welcome. Your own earlier note applies:
the town code still assumes one `town` area per world, and several plots will want several towns, so "any number of
towns" probably comes first.

### 4. Crafting and an economy

Give the player things to make and reasons to trade:

- Crafting from what the land gives (wood, hides, bones, salvage from ruins, herbs), tied to survival first: a
  waterskin, a torch, bandages, a better shelter, a cold-weather cloak. It should feed the journey, not be a menu
  for its own sake.
- An economy across towns: prices that differ from town to town and with the town's trade and the world's year,
  goods worth carrying from one place to another, things that are scarce in one region and common in another.
- Coin should have more uses, and earning it more ways (selling what you make, trade runs, plot rewards).

### 5. Modest graphical improvements (last)

Small, cheap gains that make the world easier to read and nicer to be in: light and sky, simple textures or patterns
on the ground and walls, buildings and creatures that are easier to tell apart, a few effects for weather. Everything
here sits behind the quality setting from step 1 and stays inside the measured budget. Gameplay still comes first.

### Then, your own ideas

Anything you think the game needs. Fix whatever you find broken or clumsy on the way.

## Freedom and guardrails

- **Larger restructures are allowed**, including the quest system, the town code and the save format. Save-format
  changes need a migration and fixtures, as CLAUDE.md says, so Andrew's current game keeps loading.
- **Parallel sessions are allowed** (see Git below).
- **A difficulty floor.** The bot's win rate has fallen from about 16% to about 11% over two commissions. Keep it at or
  above 8% over three seed sets of 150 worlds, with every piece on. If a piece pushes it below, ease that piece, or
  give the player more tools, rather than switching it off. Keep teaching the bot new things (crafting, trading, new
  plots) so it keeps measuring the game.
- **Do not stop to ask.** Make the most interesting reasonable choice, record it in the journal, carry on.
- **Stay inside the game.** No network calls and no outside services.

## Git on this branch

- Commit to `commission/3` only. Never commit to or push `main`, and never push `version/*` branches.
- Commit after each working step and push often. Every push publishes a playable copy at
  https://teditors.github.io/far-beacon/ so Andrew can play your latest work on his phone.
- For parallel sessions, give each its own branch off `commission/3` (`commission/3-<piece>`) and merge it back when
  its checks pass.

## When you finish or run out of ideas

Write a summary at the top of the "Commission 3" part of `JOURNAL.md`: the pieces in order, the performance numbers
before and after, your three best, and what you would do next. If you are picked up again, read the journal first
and carry on where it ends.
