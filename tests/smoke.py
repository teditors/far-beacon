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
        b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], **({'executable_path': os.environ['CHROME']} if os.environ.get('CHROME') else {}))
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
        await pg.evaluate("()=>window.__g.autoQuality(false)")  # software drawing is slow: no stepping down
        await shot('1-create')
        await pg.locator('#modal-body button', has_text='Roll again').click()
        await pg.locator('#modal-body button', has_text='Begin').click(); await pg.wait_for_timeout(300); steps.append('create')
        # sound starts with the first tap (Begin), never before
        snd = await pg.evaluate("()=>window.__g.sound()")
        assert snd['running'] and snd['mood'], 'sound did not start after the first tap: %r' % snd
        steps.append('sound (' + snd['mood'] + ')')
        await pg.evaluate("()=>{window.__g.VIEW.speed=16}")
        await pg.keyboard.down('w'); await pg.wait_for_timeout(2500); await pg.keyboard.up('w'); steps.append('walk')
        await shot('2-walk')
        for b_ in ['#btn-pack', '#btn-map', '#btn-menu']:
            await pg.click(b_); await pg.wait_for_timeout(150); await pg.click('#modal-close'); steps.append(b_[5:])
        # the performance meter, turned on from Menu, and the low quality setting
        await pg.click('#btn-menu'); await pg.wait_for_timeout(150)
        await pg.locator('#modal-body button', has_text='Low').click(); await pg.wait_for_timeout(300)
        await pg.check('#perf-meter'); await pg.click('#modal-close'); await pg.wait_for_timeout(1200)
        meter = await pg.evaluate("()=>{const e=document.getElementById('perf');return e&&!e.hidden?e.textContent:''}")
        assert 'fps' in meter and 'draws' in meter and 'low' in meter, 'performance meter not shown: %r' % meter
        steps.append('meter: ' + meter.split('\n')[1])
        # too slow: the game steps down from Low to the hidden Fallback by itself, and says so
        got = await pg.evaluate("()=>{window.__g.stepDown();const n=document.getElementById('quality-note');return [window.__g.Q.label,n?n.textContent:'']}")
        assert got[0] == 'Fallback' and 'slowly' in got[1], 'no step down to Fallback: %r' % got
        steps.append('step down')
        await pg.click('#btn-menu'); await pg.wait_for_timeout(150)
        await pg.locator('#modal-body button', has_text='Medium').click(); await pg.wait_for_timeout(300)
        await pg.uncheck('#perf-meter'); await pg.click('#modal-close')
        # the town, walked into
        async def goto(kind, area_check=None):
            await pg.evaluate("k=>{const g=window.__g,S=g.S,f=Rules.findHere(S,k);S.player.x=f.x;S.player.y=f.y;g.refresh();}", kind)
            await pg.wait_for_timeout(150)
        async def press(text):
            await pg.locator('#actions button', has_text=text).first.click(); await pg.wait_for_timeout(200)
        # stand below the gate, look at the town from outside, then walk north through the gateway
        await pg.evaluate("()=>{const g=window.__g,S=g.S,d=Rules.townDoor(S);Rules.travelTo(S,Rules.townArea(S),d.x,d.y);S.creatures.forEach(c=>{c.cool=999;if(Math.abs(c.x-d.x)+Math.abs(c.y-d.y)<8){c.x=1;c.y=1}});S.player.x=d.x;S.player.y=d.y;S.player.coin=60;S.player.stamina=100;g.refresh();const t=g.V.townAt;g.P.x=t.x+1.9;g.P.z=t.z+92;g.P.yaw=0;g.P.pitch=0.1;}")
        await pg.wait_for_timeout(400); await shot('3-town-outside')
        # the wall is solid: walking at it away from the gate gets nowhere
        if await pg.evaluate("()=>!!window.__g.S.town.walled"):
            # a walled town's wall is solid away from its gates
            await pg.evaluate("()=>{const g=window.__g;g.P.x=g.V.townAt.x+30;}")
            await pg.keyboard.down('w'); await pg.wait_for_timeout(2500); await pg.keyboard.up('w')
            assert await pg.evaluate("()=>{const g=window.__g;return g.S.area!=='town'&&g.P.z>g.V.townAt.z+70}"), 'walked through the town wall'
        await pg.evaluate("()=>{const g=window.__g,t=g.V.townAt;g.P.x=t.x+1.9;g.P.z=t.z+80;g.P.yaw=0;}")
        await pg.keyboard.down('w')
        for _ in range(80):
            await pg.wait_for_timeout(250)
            if await pg.evaluate("()=>window.__g.S.area") == 'town': break
        await pg.wait_for_timeout(1500); await pg.keyboard.up('w'); steps.append('walk into town')
        assert await pg.evaluate("()=>window.__g.S.area") == 'town', 'did not walk in through the gate'
        for _ in range(20):  # the eye eases down to the town's ground over a few frames
            if await pg.evaluate("()=>window.__g.P.y<4"): break
            await pg.wait_for_timeout(200)
        st = await pg.evaluate("()=>{const g=window.__g;return {x:g.S.player.x,y:g.S.player.y,px:g.P.x,pz:g.P.z,py:g.P.y}}")
        assert st['x'] == 18 and 28 <= st['y'] <= 35 and abs(st['px'] - 1.9) < 2 and 40 < st['pz'] < 70 and st['py'] < 4, 'not standing in the gateway after walking in: %r' % st
        await shot('3-town')
        await pg.keyboard.down('w'); await pg.wait_for_timeout(1200); await pg.keyboard.up('w'); steps.append('walk in town')
        # townsfolk walk where the rules move them: none jumps or vanishes between frames while the player walks about
        jump = await pg.evaluate("""async()=>{const g=window.__g,S=g.S,wait=(ms)=>new Promise(r=>setTimeout(r,ms));let prev=null,worst=0,counts=new Set();
          const look=()=>{const now={};g.scene.traverse(o=>{if(o.userData&&o.userData.actor&&o.userData.actor.kind==='person'&&o.userData.key){const w=new THREE.Vector3();o.parent.getWorldPosition(w);now[o.userData.key]=w}});return now};
          for(let step=0;step<12;step++){Rules.move(S,step%6<3?1:-1,0);g.refresh();for(let f=0;f<3;f++){await wait(100);const now=look();counts.add(Object.keys(now).length);
            if(prev)for(const k in now)if(prev[k]){const d=now[k].distanceTo(prev[k]);if(d>worst){worst=d;window.__jw=[k,step,f,S.area,prev[k].toArray().map(v=>+v.toFixed(1)),now[k].toArray().map(v=>+v.toFixed(1))]}}prev=now}}
          return [worst,[...counts],window.__jw]}""")
        assert jump[0] < 1.5 and len(jump[1]) == 1 and jump[1][0] > 0, 'townsfolk jumped or vanished: %r' % jump
        steps.append('townsfolk walk (%d, at most %.2f m a frame)' % (jump[1][0], jump[0]))
        await goto('elder'); await press('Talk to'); await shot('4-elder'); await pg.click('#modal-close'); steps.append('elder')
        await goto('shop'); await press('Trade'); await pg.locator('#modal-body button', has_text='Buy').first.click(); await pg.click('#modal-close'); steps.append('shop')
        await goto('inn'); await press('The inn'); await pg.locator('#modal-body button', has_text='A bed').click(); await pg.wait_for_timeout(150); await pg.click('#modal-close'); steps.append('inn')
        # into a house on foot (C7.4): in the street before a building's door, facing it, walk in; take something; walk out
        hid = await pg.evaluate("""()=>{const g=window.__g,S=g.S,bs=Rules.buildingsOf(S,S.area),b=bs.find(x=>x.kind==='house')||bs[0];if(!b)return null;
          S.player.items=S.player.items.filter(i=>i.eq);S.player.water=Math.min(4,Rules.waterCap(S));S.player.x=b.door.ox;S.player.y=b.door.oy;g.refresh();const ts=5*28/36,h=18*ts,dx=b.door.ox-b.door.x,dy=b.door.oy-b.door.y;
          g.P.x=(b.door.x+0.5)*ts-h+dx*ts*0.9;g.P.z=(b.door.y+0.5)*ts-h+dy*ts*0.9;g.P.yaw=Math.atan2(dx,dy);g.P.pitch=0;window.__door=b;return b.id}""")
        assert hid, 'the town has no building to walk into'
        await pg.keyboard.down('w')
        for _ in range(60):
            await pg.wait_for_timeout(200)
            if await pg.evaluate("()=>window.__g.S.area") == hid: break
        await pg.wait_for_timeout(600); await pg.keyboard.up('w')
        assert await pg.evaluate("()=>window.__g.S.area") == hid, 'did not walk in through the door: %r' % await pg.evaluate("()=>[window.__g.S.area,window.__g.S.player,window.__g.P.x,window.__g.P.z]")
        await shot('3-house'); steps.append('walk into a house')
        # stand by something that can be carried, and take it with its button
        took = await pg.evaluate("""()=>{const g=window.__g,S=g.S,L=Rules.houseOf(S,S.area);
          for(const t of Rules.thingsLeft(S,S.area)){if(Rules.thingKind(t.k).fixed)continue;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const x=t.x+i,y=t.y+j;
            if(Rules.passable(S,x,y)){S.player.x=x;S.player.y=y;g.refresh();return [S.player.items.length,t.id]}}}return null}""")
        assert took, 'nothing in the house to take'
        await press('Take the'); await pg.wait_for_timeout(300)
        if await pg.evaluate("()=>!document.getElementById('modal').hidden"): await pg.click('#modal-close')
        n = await pg.evaluate("()=>window.__g.S.player.items.length")
        if n == took[0]:  # seen and made to put it back (the theft piece): it can be taken where no one lives
            await pg.evaluate("()=>{const g=window.__g;g.S.off.theft=true;g.refresh()}")
            await press('Take the'); await pg.wait_for_timeout(300)
            n = await pg.evaluate("()=>window.__g.S.player.items.length")
            await pg.evaluate("()=>{const g=window.__g;delete g.S.off.theft;g.refresh()}")
        assert n == took[0] + 1, 'could not pick a thing up in a house'
        steps.append('took ' + await pg.evaluate("()=>{const S=window.__g.S;return Rules.itemName(S.player.items[S.player.items.length-1])}"))
        # and out of the door again
        await pg.evaluate("""()=>{const g=window.__g,S=g.S,L=Rules.houseOf(S,S.area),e=L.exit,ex=e%36,ey=Math.floor(e/36),dx=ex-L.entry.x,dy=ey-L.entry.y;
          S.player.x=L.entry.x-dx;S.player.y=L.entry.y-dy;g.refresh();g.P.yaw=Math.atan2(-dx,-dy);g.P.pitch=0}""")
        await pg.keyboard.down('w')
        for _ in range(60):
            await pg.wait_for_timeout(200)
            if await pg.evaluate("()=>window.__g.S.area") == 'town': break
        await pg.wait_for_timeout(400); await pg.keyboard.up('w')
        assert await pg.evaluate("()=>window.__g.S.area") == 'town', 'did not walk out of the house'
        steps.append('walk out of the house')
        # and out again on foot: from just inside the gate, south through the gateway
        await pg.evaluate("()=>{const g=window.__g,S=g.S;S.player.x=18;S.player.y=34;g.refresh();g.P.x=1.9;g.P.z=62;g.P.yaw=Math.PI;g.P.pitch=0;}")
        await pg.keyboard.down('w')
        for _ in range(80):
            await pg.wait_for_timeout(250)
            if await pg.evaluate("()=>window.__g.S.area") != 'town': break
        await pg.wait_for_timeout(800); await pg.keyboard.up('w'); steps.append('walk out of town')
        assert await pg.evaluate("()=>Rules.inOverworld(window.__g.S)"), 'did not walk out through the gate'
        st = await pg.evaluate("()=>{const g=window.__g,S=g.S,d=Rules.townDoor(S),t=g.V.townAt;return {ok:S.player.x===d.x&&S.player.y>=d.y, dz:g.P.z-t.z, dx:g.P.x-t.x}}")
        assert st['ok'] and 70 < st['dz'] < 110 and abs(st['dx'] - 1.9) < 2, 'not standing below the gate after walking out: %r' % st
        await shot('3-town-left')
        # the locked place: key and light by hand, then in, down a level, and the map
        await pg.evaluate("()=>{const g=window.__g,S=g.S,v=Rules.findSite(S,'vault');if(!Rules.hasItem(S,'key'))S.player.items.push({id:9001,base:'key',known:true,label:'Key'});S.player.items.forEach(i=>{if(i.eq==='tool')delete i.eq});S.player.items.push({id:9002,base:'lantern',known:true,eq:'tool'});S.player.fuel=5;Rules.travelTo(S,v.area,v.x,v.y);g.refresh();}")
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
        assert await pg.evaluate("()=>Rules.inOverworld(window.__g.S)"), 'did not climb out'
        # a fight: put a hostile creature on the next tile east and walk into it
        await pg.evaluate("()=>{const g=window.__g,S=g.S;const c=S.creatures.find(c=>S.species[c.sp].rare!=='docile'&&!c.bound);if(!c)return;S.player.x=Math.min(34,Math.max(1,S.player.x));c.x=S.player.x+1;c.y=S.player.y;c.cool=0;S.player.hp=S.player.hpMax=200;g.P.x=(S.player.x+0.5)*28-504;g.P.z=(S.player.y+0.5)*28-504;g.P.yaw=-Math.PI/2;}")
        await pg.keyboard.down('w')
        for _ in range(60):
            await pg.wait_for_timeout(250)
            if await pg.evaluate("()=>!!window.__g.S.combat"): break
        await pg.keyboard.up('w'); await pg.wait_for_timeout(200)
        print('  after walk:', await pg.evaluate("()=>{const S=window.__g.S,P=window.__g.P;return JSON.stringify({combat:!!S.combat,p:[S.player.x,S.player.y],P:[P.x|0,P.z|0],w:Rules.weight(S),cap:Rules.carryCap(S),st:S.player.stamina|0,modal:!document.getElementById('modal').hidden,log:S.log.slice(-2).map(l=>l.msg)})}"))
        fought = 0
        for i in range(40):
            if not await pg.evaluate("()=>!!window.__g.S.combat"): break
            await pg.locator('#actions button', has_text='Attack').click(); fought += 1; await pg.wait_for_timeout(40)
        steps.append('fight(%d turns)' % fought)
        await shot('4-after-fight')
        # walk east off the edge of the home region into the next one, then look at the world map
        await pg.evaluate("()=>{const g=window.__g,S=g.S;Rules.travelTo(S,'overworld',18,18);g.refresh();S.combat=null;S.creatures.length=0;S.player.stamina=100;S.player.items=S.player.items.filter(i=>i.eq);S.player.water=Math.min(4,Rules.waterCap(S));document.getElementById('modal').hidden=true;}")
        crossed = False
        for y in range(4, 32, 3):
            ok = await pg.evaluate("y=>{const g=window.__g,S=g.S;if(S.area!=='overworld')return true;if(!Rules.passable(S,35,y))return false;S.player.x=35;S.player.y=y;g.refresh();g.P.x=35.5*28-504+9;g.P.z=(y+0.5)*28-504;g.P.yaw=-Math.PI/2;return true}", y)
            if not ok: continue
            await pg.keyboard.down('w')
            for _ in range(60):
                await pg.wait_for_timeout(250)
                if await pg.evaluate("()=>window.__g.S.area") != 'overworld': crossed = True; break
            await pg.keyboard.up('w'); await pg.wait_for_timeout(200)
            if crossed: break
        assert crossed, 'could not walk into the next region: %r' % await pg.evaluate("()=>{const g=window.__g,S=g.S;return {area:S.area,p:[S.player.x,S.player.y],P:[g.P.x|0,g.P.z|0],over:S.over,modal:!document.getElementById('modal').hidden,st:S.player.stamina,w:Rules.weight(S),cap:Rules.carryCap(S),log:S.log.slice(-3).map(l=>l.msg),fps:g.PF&&g.PF.fps}}")
        st = await pg.evaluate("()=>{const g=window.__g,S=g.S;return {x:S.player.x,px:g.P.x,area:S.area,biome:S.biome}}")
        assert st['x'] < 8 and st['px'] < -280, 'did not arrive on the west edge of the next region: %r' % st
        # the new land is built over the next frames, a few milliseconds each, while the old one stands in; then swapped
        for _ in range(300):  # software drawing: a few frames a second, so this can take a while
            if await pg.evaluate("()=>{const v=window.__g.V;return v.shift&&v.shift.x===0&&v.shift.z===0}"): break
            await pg.wait_for_timeout(100)
        sp = await pg.evaluate("()=>window.__g.PF.parts")
        # the land comes in slices of a few milliseconds; a town or a ruin seen for the first time is still built in one
        # step (cached after), which on this software renderer at Medium (the old High) can take 150 ms
        assert 'spread' in sp and sp['frames'] > 3 and sp['longest'] < 250, 'the new land was not built over several frames: %r' % sp
        await shot('7-next-region'); steps.append('cross a border (' + st['area'] + ', ' + st['biome'] + ', built over %d frames, at most %d ms each)' % (sp['frames'], sp['longest']))
        # another town: walk in from the south, talk to its elder
        tid = await pg.evaluate("()=>{const g=window.__g,S=g.S,t=S.towns[0],d=Rules.townDoor(S,t);Rules.travelTo(S,t.area,d.x,d.y);S.creatures.length=0;S.combat=null;S.player.stamina=100;g.refresh();const a=g.V.townAt;g.P.x=a.x+1.9;g.P.z=a.z+80;g.P.yaw=0;g.P.pitch=0;return g.V.townId===t.id?t.id:'wrong town in view: '+g.V.townId}")
        assert tid.startswith('t_'), tid
        await pg.keyboard.down('w')
        for _ in range(80):
            await pg.wait_for_timeout(250)
            if await pg.evaluate("()=>window.__g.S.area") == tid: break
        await pg.wait_for_timeout(600); await pg.keyboard.up('w')
        assert await pg.evaluate("()=>window.__g.S.area") == tid, 'did not walk into the other town'
        await shot('7b-other-town')
        await goto('elder'); await press('Talk to')
        title = await pg.evaluate("()=>document.getElementById('modal-title').textContent")
        tname = await pg.evaluate("()=>window.__g.S.towns[0].name")
        assert tname in title, 'the other town\'s elder is not of that town: %r' % title
        await pg.click('#modal-close'); steps.append('another town (' + tname + ')')
        # step out over the south edge from any open tile on it (towns are laid out differently every world)
        left = await pg.evaluate("()=>{const g=window.__g,S=g.S;for(let x=0;x<Rules.W;x++){if(!Rules.passable(S,x,Rules.H-1))continue;S.player.x=x;S.player.y=Rules.H-1;S.combat=null;S.player.stamina=100;if(Rules.move(S,0,1)){g.refresh();return x}}return -1}")
        assert left >= 0, 'no open tile on the south edge of the other town: %r' % await pg.evaluate("()=>{const S=window.__g.S;return [S.area,S.over,S.player.water,Rules.weight(S),Rules.carryCap(S),S.log.slice(-3).map(l=>l.msg)]}")
        assert await pg.evaluate("()=>Rules.inOverworld(window.__g.S)"), 'could not leave the other town'
        # a wayfarer at a fire: the first choice answers in the window (C8.1: "Yes" used to do nothing)
        wf = await pg.evaluate("""()=>{const g=window.__g,S=g.S;for(let cy=0;cy<S.world.rows;cy++)for(let cx=0;cx<S.world.cols;cx++)Rules.ensureRegion(S,cx,cy);
          for(const id in S.areas){const m=Rules.mapOf(S,id);if(!m||!m.sites||S.areas[id].kind!=='region')continue;for(const k in m.sites){const st=m.sites[k];if(st.kind!=='wayfarer'||st.gone)continue;
          Rules.travelTo(S,id,(+k)%36,Math.floor(+k/36));S.creatures.length=0;S.combat=null;S.player.coin=100;S.player.water=Rules.waterCap(S);g.refresh();return st.name}}return null}""")
        if wf:
            await press('Talk to')
            await pg.locator('#modal-body ul.items button').first.click(); await pg.wait_for_timeout(200)
            said = await pg.evaluate("()=>!document.getElementById('modal').hidden&&document.querySelectorAll('#modal-body p.said').length")
            assert said, 'a wayfarer\'s choice did nothing in the window'
            await pg.click('#modal-close'); steps.append('a wayfarer (' + wf + ')')
        await pg.click('#btn-map'); await pg.wait_for_timeout(200); await shot('8-world-map')
        assert await pg.evaluate("()=>document.getElementById('worldcv').width>0"), 'no world map'
        await pg.click('#modal-close'); steps.append('world map')
        # god mode from the Tinker panel, a jump from the list, and a tap on the map
        await pg.click('#btn-menu'); await pg.wait_for_timeout(150)
        await pg.check('#god-mode'); await pg.wait_for_timeout(200)
        n = await pg.evaluate("()=>document.querySelectorAll('#jump-to option').length")
        assert n > 5, 'the jump list is nearly empty: %d' % n
        await pg.select_option('#jump-to', index=1)
        await pg.locator('#modal-body button', has_text='Go there').click(); await pg.wait_for_timeout(400)
        await shot('9-god-jump'); steps.append('god mode jump (%d places)' % n)
        await pg.click('#btn-map'); await pg.wait_for_timeout(200)
        box = await pg.locator('#worldcv').bounding_box()
        await pg.mouse.click(box['x'] + box['width'] * 0.2, box['y'] + box['height'] * 0.2); await pg.wait_for_timeout(400)
        assert await pg.evaluate("()=>document.getElementById('modal').hidden && Rules.inOverworld(window.__g.S)"), 'a tap on the map did not jump'
        steps.append('map tap jump')
        # the look of commission 5, close up: a ruin, a creature, the town and a camp at night (see build/shots with --shots)
        for name, js in [
            ('12-ruin', "let f=null;for(const k in S.sites){if(S.sites[k].kind==='ruin'){f={x:k%36,y:Math.floor(k/36)};break}}if(!f)return;S.player.x=f.x;S.player.y=Math.min(35,f.y+1);g.refresh();const cx=(f.x+0.5)*28-504,cz=(f.y+0.5)*28-504;g.P.x=cx+8;g.P.z=cz+20;g.P.yaw=Math.atan2(-(cx-g.P.x),-(cz-g.P.z));g.P.pitch=-0.1;"),
            ('13-creature', "const c=S.creatures.find(c=>!c.bound);if(!c)return;c.cool=999;S.player.x=c.x;S.player.y=Math.min(35,c.y+1);g.refresh();const cx=(c.x+0.5)*28-504-4,cz=(c.y+0.5)*28-504-5;g.P.x=cx+1.5;g.P.z=cz+6;g.P.yaw=Math.atan2(-(cx-g.P.x),-(cz-g.P.z));g.P.pitch=-0.2;"),
            ('14-camp-night', "S.time+=(24-((S.time/60+6)%24)+22)*60;S.camp={area:S.area,i:S.player.y*36+S.player.x};g.refresh();g.P.z+=14;g.P.x-=2;g.P.yaw=0.3;g.P.pitch=-0.15;"),
        ]:
            await pg.evaluate("()=>{const g=window.__g,S=g.S;Rules.travelTo(S,'overworld',18,18);S.combat=null;S.weather.storm=false;g.refresh();" + js + "}")
            await pg.wait_for_timeout(700); await shot(name)
        steps.append('the new look')
        # every new kind of place, in a world that has them all, reached by god mode and drawn without an error
        await pg.evaluate("()=>{const g=window.__g;g.newWorld(34,{sky:1,sea:1,doors:1,size:'5x5'});document.querySelectorAll('#modal-close').forEach(b=>b.click());Rules.setGodMode(g.S,true);}")
        for group in ['Below', 'Above', 'Water', 'Other worlds']:
            got = await pg.evaluate("(gr)=>{const g=window.__g,S=g.S,p=Rules.places(S).find(p=>p.group===gr);if(!p)return null;Rules.jumpTo(S,p.id);g.refresh();g.buildStatic();g.refresh();return p.label}", group)
            assert got, 'no %s place in a world made to have them all' % group
            await pg.wait_for_timeout(500); await shot('11-' + group.replace(' ', '-').lower())
            steps.append(group.lower() + ': ' + got)
        await pg.evaluate("()=>{const S=window.__g.S;Rules.setGodMode(S,false);}")
        # the new world screen, with its settings opened
        await pg.click('#btn-menu'); await pg.wait_for_timeout(150)
        await pg.locator('#modal-body button', has_text='New world').first.click(); await pg.wait_for_timeout(150)
        await pg.click('#nw-more summary'); await pg.select_option('#nw-size', '3x3'); await pg.select_option('#nw-towns', '0')
        await shot('10-new-world')
        await pg.locator('#modal-body button', has_text='Make this world').click(); await pg.wait_for_timeout(600)
        await pg.locator('#modal-body button', has_text='Begin').click(); await pg.wait_for_timeout(300)
        w = await pg.evaluate("()=>{const S=window.__g.S;return [S.world.cols,S.world.rows,(S.towns||[]).filter(t=>!t.realm&&!t.hamlet).length,!!S.cheated]}")
        assert w == [3, 3, 0, False], 'the new world did not follow its settings: %r' % w
        steps.append('new world with settings')  # (a door's other world may hold a town of its own: not counted)
        await pg.reload(); await pg.wait_for_timeout(1200); steps.append('reload')
        await b.close()
        print('smoke steps:', ', '.join(steps))
        if errs:
            print('PAGE ERRORS:', errs); sys.exit(1)
        if fought == 0: print('warning: no fight happened')
        print('smoke ok')
asyncio.run(main())
