import asyncio, os, sys
from playwright.async_api import async_playwright
ROOT='/home/user/far-beacon'; THREE=ROOT+'/node_modules/three/build/three.min.js'
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium', args=['--use-gl=swiftshader','--enable-unsafe-swiftshader'])
    pg = await b.new_page(viewport={'width':360,'height':640})
    await pg.route('**/three.min.js', lambda r: r.fulfill(path=THREE))
    await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    await pg.goto('file://'+sys.argv[1]); await pg.wait_for_timeout(1500)
    for seed in [11,222,3333,31]:
      r = await pg.evaluate("""(seed) => { const g = window.__g; g.setQuality('high'); g.newWorld(seed, {}); const S = g.S; Rules.setGodMode(S, true);
        const out = {}; for (const pl of Rules.places(S).slice(0, 30)) { try { Rules.jumpTo(S, pl.id); g.refresh(); g.buildStatic(); g.refresh(); } catch (e) { continue; }
        g.scene.traverse((o) => { const m = o.material; if (!o.isMesh || !m || Array.isArray(m)) return; if (m.fog !== false || m.transparent) return;
          const c = m.color || {r:1,g:1,b:1}; const l = 0.3*c.r+0.6*c.g+0.1*c.b; if (l < 0.25) { const k = pl.group + ': ' + o.geometry.type + ' ' + m.type + ' #' + (m.color ? m.color.getHexString() : '?'); out[k] = (out[k]||0)+1; } }); }
        return out; }""", seed)
      print(seed, r)
    await b.close()
asyncio.run(main())
