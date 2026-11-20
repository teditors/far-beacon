# Measures what the phone budget cares about, in a real (software-rendered) browser: how long it takes to build the
# land around the player, how many draw calls and triangles a frame takes, and the frame time looking across the land.
# Usage: python3 tools/bench.py [quality ...]   e.g. python3 tools/bench.py low medium high
# Set CHROME=/path/to/chrome to use a particular browser. Numbers on a software renderer are slow but comparable.
import asyncio, json, os, sys
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THREE = os.path.join(ROOT, 'node_modules/three/build/three.min.js')
SEEDS = [11, 222, 3333]
QUALS = [a for a in sys.argv[1:] if not a.startswith('-')] or ['default']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], **({'executable_path': os.environ['CHROME']} if os.environ.get('CHROME') else {}))
        pg = await b.new_page(viewport={'width': 412, 'height': 915}, device_scale_factor=1)
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('**/three.min.js', lambda r: r.fulfill(path=THREE))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto('file://' + os.path.join(ROOT, 'dist/index.html')); await pg.wait_for_timeout(1500)
        out = {}
        for q in QUALS:
            rows = []
            for seed in SEEDS:
                r = await pg.evaluate("""async ([seed, q]) => {
                  const g = window.__g;
                  if (q !== 'default' && g.setQuality) g.setQuality(q);
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
        if '--json' in sys.argv: print(json.dumps(out))
        if errs: print('page errors:', errs[:3]); sys.exit(1)
        await b.close()
asyncio.run(main())
