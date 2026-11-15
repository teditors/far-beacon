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
        # the town, walked into
        async def goto(kind, area_check=None):
            await pg.evaluate("k=>{const g=window.__g,S=g.S,f=Rules.findHere(S,k);S.player.x=f.x;S.player.y=f.y;g.refresh();}", kind)
            await pg.wait_for_timeout(150)
        async def press(text):
            await pg.locator('#actions button', has_text=text).first.click(); await pg.wait_for_timeout(200)
        await pg.evaluate("()=>{const g=window.__g,S=g.S;S.player.x=S.town.x;S.player.y=S.town.y;S.player.coin=60;g.refresh();}")
        await press('Enter'); steps.append('enter town')
        assert await pg.evaluate("()=>window.__g.S.area") == 'town', 'did not enter the town'
        await shot('3-town')
        await pg.keyboard.down('w'); await pg.wait_for_timeout(1200); await pg.keyboard.up('w'); steps.append('walk in town')
        await goto('elder'); await press('Talk to'); await shot('4-elder'); await pg.click('#modal-close'); steps.append('elder')
        await goto('shop'); await press('Trade'); await pg.locator('#modal-body button', has_text='Buy').first.click(); await pg.click('#modal-close'); steps.append('shop')
        await goto('inn'); await press('The inn'); await pg.locator('#modal-body button', has_text='A bed').click(); await pg.wait_for_timeout(150); await pg.click('#modal-close'); steps.append('inn')
        await goto('exit'); await press('Leave'); steps.append('leave town')
        assert await pg.evaluate("()=>window.__g.S.area") == 'overworld', 'did not leave the town'
        # the locked place: key and light by hand, then in, down a level, and the map
        await pg.evaluate("()=>{const g=window.__g,S=g.S,v=Rules.findSite(S,'vault');if(!Rules.hasItem(S,'key'))S.player.items.push({id:9001,base:'key',known:true,label:'Key'});S.player.items.forEach(i=>{if(i.eq==='tool')delete i.eq});S.player.items.push({id:9002,base:'lantern',known:true,eq:'tool'});S.player.fuel=5;S.player.x=v.x;S.player.y=v.y;g.refresh();}")
        await press('Unlock'); await press('Go into'); steps.append('enter vault')
        assert (await pg.evaluate("()=>window.__g.S.area")).startswith('vault'), 'did not enter the vault'
        await pg.wait_for_timeout(300); await shot('5-vault')
        await pg.keyboard.down('w'); await pg.wait_for_timeout(1500); await pg.keyboard.up('w')
        await pg.evaluate("()=>{const S=window.__g.S;S.creatures.forEach(c=>c.cool=99);}")
        await goto('stairsDown'); await press('Go down'); steps.append('down a level')
        assert await pg.evaluate("()=>window.__g.S.area") == 'vault2', 'did not go down'
        await pg.click('#btn-map'); await pg.wait_for_timeout(150); await shot('6-vault-map'); await pg.click('#modal-close')
        await goto('stairsUp'); await press('Go up')
        await goto('exit'); await press('Climb out'); steps.append('climb out')
        assert await pg.evaluate("()=>window.__g.S.area") == 'overworld', 'did not climb out'
        # a fight: put a hostile creature on the next tile east and walk into it
        await pg.evaluate("()=>{const g=window.__g,S=g.S;const c=S.creatures.find(c=>S.species[c.sp].rare!=='docile'&&!c.bound);S.player.x=Math.min(34,Math.max(1,S.player.x));c.x=S.player.x+1;c.y=S.player.y;c.cool=0;S.player.hp=S.player.hpMax=200;g.P.x=(S.player.x+0.5)*28-504;g.P.z=(S.player.y+0.5)*28-504;g.P.yaw=-Math.PI/2;}")
        await pg.keyboard.down('w'); await pg.wait_for_timeout(3000); await pg.keyboard.up('w'); await pg.wait_for_timeout(200)
        print('  after walk:', await pg.evaluate("()=>{const S=window.__g.S,P=window.__g.P;return JSON.stringify({combat:!!S.combat,p:[S.player.x,S.player.y],P:[P.x|0,P.z|0],w:Rules.weight(S),cap:Rules.carryCap(S),st:S.player.stamina|0,modal:!document.getElementById('modal').hidden,log:S.log.slice(-2).map(l=>l.msg)})}"))
        fought = 0
        for i in range(40):
            if not await pg.evaluate("()=>!!window.__g.S.combat"): break
            await pg.locator('#actions button', has_text='Attack').click(); fought += 1; await pg.wait_for_timeout(40)
        steps.append('fight(%d turns)' % fought)
        await shot('4-after-fight')
        # walk east off the edge of the home region into the next one, then look at the world map
        await pg.evaluate("()=>{const S=window.__g.S;S.combat=null;S.creatures.length=0;S.player.stamina=100;S.player.water=Rules.waterCap(S);document.getElementById('modal').hidden=true;}")
        crossed = False
        for y in range(4, 32, 3):
            ok = await pg.evaluate("y=>{const g=window.__g,S=g.S;if(S.area!=='overworld')return true;if(!Rules.passable(S,35,y))return false;S.player.x=35;S.player.y=y;g.refresh();g.P.x=35.5*28-504;g.P.z=(y+0.5)*28-504;g.P.yaw=-Math.PI/2;return true}", y)
            if not ok: continue
            await pg.keyboard.down('w'); await pg.wait_for_timeout(2500); await pg.keyboard.up('w'); await pg.wait_for_timeout(200)
            if await pg.evaluate("()=>window.__g.S.area") != 'overworld': crossed = True; break
        assert crossed, 'could not walk into the next region'
        st = await pg.evaluate("()=>{const g=window.__g,S=g.S;return {x:S.player.x,px:g.P.x,area:S.area,biome:S.biome}}")
        assert st['x'] < 8 and st['px'] < -280, 'did not arrive on the west edge of the next region: %r' % st
        await shot('7-next-region'); steps.append('cross a border (' + st['area'] + ', ' + st['biome'] + ')')
        await pg.click('#btn-map'); await pg.wait_for_timeout(200); await shot('8-world-map')
        assert await pg.evaluate("()=>document.getElementById('worldcv').width>0"), 'no world map'
        await pg.click('#modal-close'); steps.append('world map')
        await pg.reload(); await pg.wait_for_timeout(1200); steps.append('reload')
        await b.close()
        print('smoke steps:', ', '.join(steps))
        if errs:
            print('PAGE ERRORS:', errs); sys.exit(1)
        if fought == 0: print('warning: no fight happened')
        print('smoke ok')
asyncio.run(main())
