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
| v0.7 | Housekeeping: tests behind one command, named random streams, versioned saves with copy and paste between devices, ARCHITECTURE.md, version shown in Menu |

Versions 0.3 to 0.5 were built before the project was kept in git; their features are all in v0.6.
