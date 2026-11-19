# The commission: a long, free run on world-building and generation

This branch, `commission/1`, is a commission. Andrew is handing Claude a broad direction and letting it work for as
long as it can, the way one commissions a piece of art. Afterwards he will look through what was made, keep the
pearls, and bring them into `main` on purpose. Some or all of this branch may be thrown away, and that is fine.

**This file overrides the Git section of CLAUDE.md for this branch.** Everything else in CLAUDE.md still applies.

## The direction

Make every part of the game more varied, more procedural and more surprising, so that no two worlds feel alike.
Far Beacon wants to be as roguelike as possible in all its aspects. Read `ARCHITECTURE.md` and `CHANGELOG.md` first,
then read everything in `src/content/`: that is what the game can roll today.

**Your first piece:** write `ALMANAC.md`, a catalogue of every menu in the game and every option on it, with the
numbers that matter, built from the content files. If you can, make a small tool that generates it, so it never
goes stale. Keep it current as you add things; Andrew will read it to see what changed.

### A starting menu of ideas

These came out of an earlier review. Treat them as a starting point, not a contract, and follow your own taste.

| System | Today | As slots | Rare slot ideas |
| --- | --- | --- | --- |
| Biomes | 3 hand-written bundles | Climate, landform, water, woodland, special ground, palette | Odd colour, self-lit at night, haunted, every creature docile, heavier gravity |
| Gods | 3 written, one pact each | Domain, gift, cost, demand (what pleases or angers them) | A dead god, rival gods, a god only reachable far from home |
| Races | 5 written | Body (size, senses), heritage trait, name style | Hybrids, an exotic race every few worlds |
| Classes | 5 written | Travel trait, fight ability, starting kit | Hybrids, a class tied to this world's god or people |
| Creatures | 4 forms, one special each | Form, special, temper; groups and lairs | More rares, a species unique to one region |
| Items | Base and two affixes | Tiers that grow with distance from home | Artifacts: a few named items per world with powers no affix has |
| Living cultures | A town name and a race | Lost-people slots reused for the living; several per world, by region | A town of the "lost" people who never fell |
| Quests | One fixed shape | Chains of steps from a menu: fetch, slay, deliver, escort, find out | A quest giver who lies |
| World traits | none | A per-world rare slot on the tuning numbers | Long nights, rare storms, scarce fuel, a bigger world |

Three ideas worth keeping in mind:

- **Levels of variation.** Some things vary per world (the people, the god, the quest), some per region (biome,
  creatures, danger), some per thing (items). Per-world variety is felt most and costs least.
- **A budget.** Give options a rough worth, positive for gifts and negative for costs, and keep a rolled thing near
  its target. That stops a rolled god from being all gift.
- **Rare stays rare.** One rare per thing, around 10 to 15%, and always visible to the player.

The pattern that already works (lost peoples, items, creatures): a thing is a handful of **slots**, each slot is
drawn from a **menu**, each option is a name plus a few modifiers and something the player can see, and a
**rare slot** is usually empty but occasionally holds something strange. Apply it everywhere it fits: biomes, gods,
races, classes, creatures, items and artifacts, living cultures and towns, quests and side quests, world traits,
weather, the dungeons. New kinds of thing are welcome too.

Balance will suffer, and Andrew accepts that. A world that is hard, odd or lopsided is fine. A world that cannot
be won at all, or that crashes, is not.

## How to work

- **Do not stop to ask questions.** Andrew is not watching. When something is unclear, make the most interesting
  reasonable choice, write it down in `JOURNAL.md`, and carry on.
- **Work in pieces.** One piece is one idea that works on its own: "gods become slots", "world traits", "named
  artifacts". Finish each piece, with checks passing, before starting the next.
- **Make pieces easy to lift out.** Andrew will pick pieces to bring into `main` one at a time:
  - keep each piece in as few commits as you can;
  - put its content in `src/content/` and its rules in their own module where possible;
  - give it a switch in `s.off` so it can be turned off to compare;
  - avoid touching the same lines as unrelated pieces.
- **Gameplay before looks.** Something the player can see is good (a sign, a colour, a shape), but spend the effort
  on what the game does, not on graphics.
- **Keep it working.** `node tools/check.js` must pass before every commit. Old saves on this branch may stop
  loading if you have to break them; if you do, bump `VERSION`, say so in the journal, and keep `newGame` and
  everything after it working. Update the snapshot with `--update` when you meant to change world generation.
  Keep the playtest bot able to win sometimes. If a piece makes it never win, fix or rethink that piece.
- **Stay inside the game.** No network calls, no outside services, and no new npm dependencies unless one is truly
  needed (then say why in the journal).

## Git on this branch

- Commit to `commission/1` only. **Never commit to or push `main`**, and never push `version/*` branches.
- Commit after each working step and push the branch often, so nothing is lost if the session ends.
- If you split work across parallel sessions, give each its own branch off `commission/1`
  (`commission/1-<piece>`) and merge it back into `commission/1` when its checks pass.

## Keep a journal

Keep `JOURNAL.md` at the top of the repo, newest entry first. For each piece write:

- what it is, in a sentence a player would understand;
- what it changes in play, and the playtest win rate before and after;
- the commits it lives in, and its switch;
- choices you made without asking, and anything you are unsure of;
- your own verdict: **pearl** (worth keeping), **maybe**, or **experiment** (interesting but probably not).


## When you finish or run out of ideas

Write a short summary at the top of `JOURNAL.md`: the pieces in order, your three best, and what you would do next.
Then stop. If you are picked up again later, read the journal first and carry on from where it ends.
