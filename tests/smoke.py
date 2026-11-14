# Browser smoke test: loads the built page, plays through the main screens, and fails on any page error.
# Usage: python3 tests/smoke.py [--shots]   (screenshots go to build/shots/)
import asyncio, os, sys
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THREE = os.path.join(ROOT, 'node_modules/three/build/three.min.js')
SHOTS = '--shots' in sys.argv
async def main():
    os.makedirs(os.path.join(ROOT, 'build/shots'), exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 390, 'height': 780})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'ERR_FAILED' not in m.text else None)
        await pg.route('**/three.min.js', lambda r: r.fulfill(path=THREE))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        steps = []
        async def shot(name):
            if SHOTS: await pg.screenshot(path=os.path.join(ROOT, 'build/shots', name + '.png'))
        await pg.goto('file://' + os.path.join(ROOT, 'dist/index.html')); await pg.wait_for_timeout(1500)
        await shot('1-create')
        await pg.locator('#modal-body button', has_text='Roll again').click()
        await pg.locator('#modal-body button', has_text='Begin').click(); await pg.wait_for_timeout(300); steps.append('create')
        await pg.evaluate("()=>{window.__g.VIEW.speed=16}")
        await pg.keyboard.down('w'); await pg.wait_for_timeout(2500); await pg.keyboard.up('w'); steps.append('walk')
        await shot('2-walk')
        for b_ in ['#btn-pack', '#btn-map', '#btn-menu']:
            await pg.click(b_); await pg.wait_for_timeout(150); await pg.click('#modal-close'); steps.append(b_[5:])
        # town
        await pg.evaluate("()=>{const g=window.__g,S=g.S;S.player.x=S.town.x;S.player.y=S.town.y;S.player.coin=60;}")
        await pg.locator('#actions button', has_text='Survey').click(); await pg.wait_for_timeout(150)
        await pg.locator('#actions button', has_text='Enter').click(); await pg.wait_for_timeout(150)
        await pg.locator('#modal-body button', has_text='Talk to the elder').click()
        await pg.locator('#modal-body button', has_text='Buy').first.click()
        await pg.locator('#modal-body button', has_text='A bed').click(); await pg.wait_for_timeout(150)
        await shot('3-town'); await pg.click('#modal-close'); steps.append('town')
        # a fight: put a hostile creature on the next tile east and walk into it
        await pg.evaluate("()=>{const g=window.__g,S=g.S;const c=S.creatures.find(c=>S.species[c.sp].rare!=='docile'&&!c.bound);S.player.x=Math.min(34,Math.max(1,S.player.x));c.x=S.player.x+1;c.y=S.player.y;c.cool=0;S.player.hp=S.player.hpMax=200;g.P.x=(S.player.x+0.5)*28-504;g.P.z=(S.player.y+0.5)*28-504;g.P.yaw=-Math.PI/2;}")
        await pg.keyboard.down('w'); await pg.wait_for_timeout(3000); await pg.keyboard.up('w'); await pg.wait_for_timeout(200)
        print('  after walk: combat', await pg.evaluate("()=>!!window.__g.S.combat"), await pg.evaluate("()=>window.__g.S.log.slice(-2).map(l=>l.msg).join(' | ')"))
        fought = 0
        for i in range(40):
            if not await pg.evaluate("()=>!!window.__g.S.combat"): break
            await pg.locator('#actions button', has_text='Attack').click(); fought += 1; await pg.wait_for_timeout(40)
        steps.append('fight(%d turns)' % fought)
        await shot('4-after-fight')
        await pg.reload(); await pg.wait_for_timeout(1200); steps.append('reload')
        await b.close()
        print('smoke steps:', ', '.join(steps))
        if errs:
            print('PAGE ERRORS:', errs); sys.exit(1)
        if fought == 0: print('warning: no fight happened')
        print('smoke ok')
asyncio.run(main())
