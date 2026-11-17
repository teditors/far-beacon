# Versions

From v0.6 on, each version is a frozen branch named `version/v0.X`. On GitHub, open the branch menu (it says
`main`) and pick one to see the whole project as it was, including the playable `dist/index.html`. `main` is always
the latest. Version branches are never changed after they are made. The two early prototypes are kept as files in `prototypes/`.

| Version | What it added |
| --- | --- |
| v0.1 | 2D turn-based prototype of the expedition loop (`prototypes/2d/`) |
| v0.2 | First-person grey-box walk test with water pressure (`prototypes/walk-test/`) |
| v0.6 | The 3D game as of 13 Nov 2026: survival, biomes and ground types, generated lost peoples, characters and persistent worlds, levels and equipment, combat, towns, merchants and the rolled quest. Rebuilt as modules with identical behaviour |
| v0.8 | Towns and the locked place are places you walk into. The town has a gate, a square, a well, and the elder, the inn and the shop as people you walk up to. The locked place is three dark levels of rooms and corridors with guardians, store-rooms and traps, stairs between them, and the relic on the last level; you carry it back out. Filling water stops at what you can carry. Lanterns cost 8 |
| v0.9 | The world is nine regions in a three-by-three grid that wraps around: walk off any edge of a region and you arrive on the facing edge of the next, and keep going one way and you come home. Each region has its own biome, creatures, water, ruins and caves, built the first time you reach it; regions further from home are more dangerous. The quest stays in the home region. The Map screen shows the world. Old saves become the home region of a new world |
| v0.10 | Land agrees across region borders: what counts as a mountain is measured over the whole world, biomes blend into each other near a border, and rivers and roads cross borders at points both sides share, so they carry on into the next region. Buildings and creatures stand on the ground: sites get a level pad as wide as what stands there |
| v0.11 | You can see across borders: the eight regions around you are built ahead and drawn out to the limit of sight, so hills, forests, ruins and the beacon are visible in the next region and nothing changes as you step over. The town stands in the land as a real walled town, seen from far off by its hearth smoke; you walk in through the gate in its south wall and out again, with no button and no jump. Its 5 x 5 tiles can no longer be walked on outdoors; old saves move anything left there to the gate |
| v0.7 | Housekeeping: tests behind one command, named random streams, versioned saves with copy and paste between devices, ARCHITECTURE.md, version shown in Menu |

Versions 0.3 to 0.5 were built before the project was kept in git; their features are all in v0.6.
