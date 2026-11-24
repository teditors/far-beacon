# Measures what the phone budget cares about, in a real (software-rendered) browser: how long it takes to build the
# land around the player, how many draw calls and triangles a frame takes, and the frame time looking across the land.
# Usage: python3 tools/bench.py [quality ...]   e.g. python3 tools/bench.py low medium high medium-plain
# (a quality ending in -plain is that quality without the sky, the ground's grain and the weather)
# Set CHROME=/path/to/chrome to use a particular browser. Numbers on a software renderer are slow but comparable.
import asyncio, json, os, sys
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THREE = os.path.join(ROOT, 'node_modules/three/build/three.min.js')
SEEDS = [11, 222, 3333]
QUALS = [a for a in sys.argv[1:] if not a.startswith('-') and a not in ('places', 'rooms')] or ['default']
# `places`: also measure the new kinds of place (commission 4), each reached by god mode on Medium:
# a dungeon level, a floating castle, the open sea, a place under it, and another world
PLACES = [
    ('dungeon level', 31, {}, "S.deeps[0] && 'deep:' + S.deeps[0].id + ':1'"),
    ('sky castle', 32, {'sky': 1, 'trouble': 'tyrant'}, "'sky:' + S.skies.find(k => k.kind === 'castle').id + ':1'"),
    ('open sea', 34, {'sea': 1, 'size': '5x5'}, "'region:' + Rules.places(S).find(p => p.group === 'Water').label && 'region:' + S.seaPlaces[0].area"),
    ('under the sea', 34, {'sea': 1, 'size': '5x5'}, "Rules.places(S).find(p => p.group === 'Water').id"),
    ('other world', 35, {'doors': 1}, "'realm:' + S.doors[0].realm + ':' + S.doors[0].back.area.split(':r')[1]"),
]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], **({'executable_path': os.environ['CHROME']} if os.environ.get('CHROME') else {}))
        pg = await b.new_page(viewport={'width': 412, 'height': 915}, device_scale_factor=1)
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('**/three.min.js', lambda r: r.fulfill(path=THREE))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto('file://' + os.environ.get('PAGE', os.path.join(ROOT, 'dist/index.html'))); await pg.wait_for_timeout(1500)
        await pg.evaluate("()=>window.__g.autoQuality(false)")  # software drawing is slow: no stepping down
        out = {}
        for q in QUALS:
            rows = []
            for seed in SEEDS:
                r = await pg.evaluate("""async ([seed, q]) => {
                  const g = window.__g;
                  if (q !== 'default' && g.setQuality) g.setQuality(q.replace('-plain', ''));
                  if (q.endsWith('-plain')) Object.assign(g.Q, { sky: false, grain: false, weather: 0 }); // without the light and weather
                  g.newWorld(seed);
                  const S = g.S, wait = (ms) => new Promise((r) => setTimeout(r, ms));
                  document.querySelectorAll('#modal-close').forEach((b) => b.click());
                  await wait(300);
                  // build the land three times and keep the middle time
                  const tb = [];
                  for (let i = 0; i < 3; i++) { const t0 = performance.now(); g.buildStatic(); g.refresh(); tb.push(performance.now() - t0); }
                  tb.sort((a, b) => a - b);
                  // a view across the land, by day
                  S.time = 6 * 60; g.P.pitch = -0.05;
                  await wait(500);
                  const info = g.renderer.info.render, calls = info.calls, tris = info.triangles;
                  // frame times over two seconds, turning slowly
                  const dts = []; let last = performance.now();
                  await new Promise((res) => { const f = (now) => { dts.push(now - last); last = now; g.P.yaw += 0.01; if (dts.length < 90) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
                  dts.shift(); dts.sort((a, b) => a - b);
                  const save = Rules.serialize(S).length;
                  return { seed, build: Math.round(tb[1]), calls, tris, frame: +(dts.reduce((a, b) => a + b, 0) / dts.length).toFixed(1), p95: +dts[Math.floor(dts.length * 0.95)].toFixed(1), save, world: S.world.cols + 'x' + S.world.rows };
                }""", [seed, q])
                rows.append(r)
            out[q] = rows
            avg = lambda k: round(sum(r[k] for r in rows) / len(rows), 1)
            print('%-8s build %6.0f ms  calls %5.0f  triangles %8.0f  frame %6.1f ms (p95 %6.1f)  save %6.0f KB' % (q, avg('build'), avg('calls'), avg('tris'), avg('frame'), avg('p95'), avg('save') / 1024))
        if 'places' in sys.argv:
            for (label, seed, setting, where) in PLACES:
                r = await pg.evaluate("""async ([seed, set, where]) => {
                  const g = window.__g, wait = (ms) => new Promise((r) => setTimeout(r, ms));
                  g.setQuality('medium'); g.newWorld(seed, set);
                  document.querySelectorAll('#modal-close').forEach((b) => b.click());
                  const S = g.S; S.time = 6 * 60; S.weather.storm = false; S.weather.changeAt = 1e9;
                  Rules.setGodMode(S, true); const id = eval(where); Rules.jumpTo(S, id);
                  const t0 = performance.now(); g.buildStatic(); g.refresh(); const build = performance.now() - t0;
                  g.P.pitch = -0.05; await wait(500);
                  const info = g.renderer.info.render, calls = info.calls, tris = info.triangles;
                  const dts = []; let last = performance.now();
                  await new Promise((res) => { const f = (now) => { dts.push(now - last); last = now; g.P.yaw += 0.01; if (dts.length < 90) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
                  dts.shift(); dts.sort((a, b) => a - b);
                  return { area: S.area, build: Math.round(build), calls, tris, frame: +(dts.reduce((a, b) => a + b, 0) / dts.length).toFixed(1), save: Rules.serialize(S).length };
                }""", [seed, setting, where])
                print('%-14s %-14s build %4d ms  calls %4d  triangles %7d  frame %6.1f ms  save %4.0f KB' % (label, r['area'][:14], r['build'], r['calls'], r['tris'], r['frame'], r['save'] / 1024))
        # `rooms` (commission 7): inside the elder's hall and a house of seed 11's town, on each quality: the whole frame,
        # and the room's own share (its walls, floor, ceiling and things, outlines included)
        if 'rooms' in sys.argv:
            for q in QUALS:
                for n, label in [(0, 'hall'), (2, 'house')]:
                    r = await pg.evaluate("""async ([q, n]) => {
                      const g = window.__g, wait = (ms) => new Promise((r) => setTimeout(r, ms));
                      if (q !== 'default') g.setQuality(q); g.newWorld(11);
                      document.querySelectorAll('#modal-close').forEach((b) => b.click());
                      const S = g.S; S.time = 6 * 60; S.weather.storm = false; S.weather.changeAt = 1e9; Rules.setGodMode(S, true);
                      Rules.jumpTo(S, Rules.places(S).filter((p) => p.group === 'Houses')[n].id);
                      const t0 = performance.now(); g.buildStatic(); g.refresh(); const build = performance.now() - t0;
                      g.P.pitch = -0.15; await wait(500);
                      const info = g.renderer.info.render, calls = info.calls, tris = info.triangles;
                      let own = 0, ownTris = 0, things = 0;
                      g.scene.traverse((o) => { if (!(o.userData.room === S.area || o.userData.things === S.area)) return;
                        o.traverse((m) => { if (!m.isMesh) return; own++; const pc = m.geometry.attributes.position.count; ownTris += m.geometry.index ? m.geometry.index.count / 3 : pc / 3; }); });
                      things = Rules.thingsLeft(S, S.area).length;
                      const dts = []; let last = performance.now();
                      await new Promise((res) => { const f = (now) => { dts.push(now - last); last = now; g.P.yaw += 0.02; if (dts.length < 60) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
                      dts.shift();
                      return { build: Math.round(build), calls, tris, own, ownTris: Math.round(ownTris), things, frame: +(dts.reduce((a, b) => a + b, 0) / dts.length).toFixed(1) };
                    }""", [q, n])
                    print('%-8s %-6s frame: calls %4d  triangles %7d  %6.1f ms | the room: %3d things, %2d draw calls, %6d triangles' % (q, label, r['calls'], r['tris'], r['frame'], r['things'], r['own'], r['ownTris']))
        if '--json' in sys.argv: print(json.dumps(out))
        if errs: print('page errors:', errs[:3]); sys.exit(1)
        await b.close()
asyncio.run(main())
