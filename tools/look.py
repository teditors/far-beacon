# Photographs the look (commission 6) for Andrew to review on his phone: each biome by day and night, towns of each
# climate, a ruin, a dungeon, the sky, the sea and another world. JPEGs go to docs/look/<set>/ (default: after).
# Usage: python3 tools/look.py [set] [quality]     e.g. python3 tools/look.py before high
# Set CHROME=/opt/pw-browsers/chromium in a cloud session. Software rendering: slow, but the pictures are the same.
import asyncio, os, sys
from playwright.async_api import async_playwright
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THREE = os.path.join(ROOT, 'node_modules/three/build/three.min.js')
SET = sys.argv[1] if len(sys.argv) > 1 else 'after'
QUAL = sys.argv[2] if len(sys.argv) > 2 else 'high'
OUT = os.path.join(ROOT, 'docs/look', SET)
W, H = 360, 640
# (name, seed, world settings, javascript run with g, S, wait in scope; returns false to skip the shot)
DAY, NIGHT = 'S.time = 13 * 60 - 360;', 'S.time = 23 * 60 - 360;'
def region(biome, when):
    return """const p = Rules.places(S).find((p) => p.group === 'Regions' && p.label.includes(%r));
      if (!p) return false; Rules.jumpTo(S, p.id); %s g.refresh(); g.buildStatic(); g.refresh();
      // look the way the land is open and dry: the longest clear sight over land
      let best = 0, top = -1; const T = g.V.terrain, wat = g.V.base && g.V.base.waterAt;
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, sx = -Math.sin(a), sz = -Math.cos(a); let d = 20;
        for (; d < 300; d += 20) if (T.height(g.P.x + sx * d, g.P.z + sz * d) > T.height(g.P.x, g.P.z) + 1.7 + d * 0.02) break;
        if (wat && wat(g.P.x + sx * 40, g.P.z + sz * 40) > T.height(g.P.x + sx * 40, g.P.z + sz * 40)) d -= 150;
        if (d > top) { top = d; best = a; } }
      g.P.yaw = best; g.P.pitch = -0.03;""" % (biome, when)
def town(n, when):
    return """const t = Rules.places(S).filter((p) => p.group === 'Towns')[%d]; if (!t) return false;
      Rules.jumpTo(S, t.id); %s g.refresh(); g.buildStatic(); g.refresh(); g.P.pitch = 0.02;""" % (n, when)
def place(group, when):
    return """const p = Rules.places(S).find((p) => p.group === %r); if (!p) return false;
      Rules.jumpTo(S, p.id); %s g.refresh(); g.buildStatic(); g.refresh(); g.P.pitch = -0.04;""" % (group, when)
REALM = """const id = 'realm:' + S.doors[0].realm + ':' + S.doors[0].back.area.split(':r')[1];
  if (!Rules.jumpTo(S, id)) return false; %s g.refresh(); g.buildStatic(); g.refresh(); g.P.pitch = -0.03;"""
RUIN = """Rules.travelTo(S, 'overworld', 18, 18); g.refresh(); let f = null;
  for (const k in S.sites) if (S.sites[k].kind === 'ruin') { f = { x: k %% 36, y: Math.floor(k / 36) }; break; }
  if (!f) return false; S.player.x = f.x; S.player.y = Math.min(35, f.y + 1); %s g.refresh();
  const cx = (f.x + 0.5) * 28 - 504, cz = (f.y + 0.5) * 28 - 504; g.P.x = cx + 8; g.P.z = cz + 20;
  g.P.yaw = Math.atan2(-(cx - g.P.x), -(cz - g.P.z)); g.P.pitch = -0.1;"""
PERSON = """let a = null, best = 1e9; const w = new THREE.Vector3();
  g.scene.traverse((o) => { if (o.userData.actor && o.userData.actor.kind === 'person') { o.getWorldPosition(w);
    const d = Math.hypot(w.x - g.P.x, w.z - g.P.z); if (d < best) { best = d; a = o; } } });
  if (!a) return false; a.getWorldPosition(w); const f = a.getWorldDirection(new THREE.Vector3());
  g.P.x = w.x + f.x * %s; g.P.z = w.z + f.z * %s; g.P.yaw = Math.atan2(-(w.x - g.P.x), -(w.z - g.P.z)); g.P.pitch = %s;
  if (g.P.fixY !== undefined) g.P.fixY = w.y + 1.75; await wait(1500);"""
THING = """const L = Rules.thingsLeft(S, S.area).filter((t) => %s || !Rules.thingKind(t.k).fixed);
  const T = L.slice().sort((a, b) => L.filter((u) => Math.abs(u.x - b.x) + Math.abs(u.y - b.y) <= 1).length - L.filter((u) => Math.abs(u.x - a.x) + Math.abs(u.y - a.y) <= 1).length)[0]; if (!T) return false;
  const ts = Rules.isLevel(S) ? 4 : 28, hw = 18 * ts, mx = (T.x + 0.5) * ts - hw, mz = (T.y + 0.5) * ts - hw, qx = mx + T.px * ts, qz = mz + T.pz * ts;
  S.player.x = T.x; S.player.y = T.y; g.refresh(); const d = %s, l = Math.hypot(qx - mx, qz - mz) || 1;
  g.P.x = qx - ((qx - mx) / l) * d + 0.01; g.P.z = qz - ((qz - mz) / l) * d; g.P.yaw = Math.atan2(-(qx - g.P.x), -(qz - g.P.z)); g.P.pitch = %s; await wait(800);"""
HOUSE = """const p = Rules.places(S).filter((p) => p.group === 'Houses')[%d]; if (!p) return false;
  Rules.jumpTo(S, p.id); %s g.refresh(); g.buildStatic(); g.refresh();
  // stand toward one end of the room and look across it, at the side with the most furniture
  const L = Rules.houseOf(S, S.area), ts = 5 * 28 / 36 / 3, h = 18 * ts; let x0 = 99, x1 = 0, y0 = 99, y1 = 0;
  for (let k = 0; k < 36 * 36; k++) if (L.cells[k] === 0) { x0 = Math.min(x0, k %% 36); x1 = Math.max(x1, k %% 36); y0 = Math.min(y0, Math.floor(k / 36)); y1 = Math.max(y1, Math.floor(k / 36)); }
  const cx = ((x0 + x1 + 1) / 2) * ts - h, cz = ((y0 + y1 + 1) / 2) * ts - h, F = L.things.filter((t) => Rules.thingKind(t.k).fixed && L.cells[t.y * 36 + t.x] === 0);
  let ax = 0, az = 0; for (const t of F) { ax += (t.x + 0.5) * ts - h - cx; az += (t.y + 0.5) * ts - h - cz; }
  const l = Math.hypot(ax, az) || 1; g.P.x = cx - (ax / l) * 2.5 + (az / l) * 1.5; g.P.z = cz - (az / l) * 2.5 - (ax / l) * 1.5;
  g.P.yaw = Math.atan2(-(ax / l) - (az / l) * 0.5, -(az / l) + (ax / l) * 0.5); g.P.pitch = -0.22; await wait(600);"""
DOOR = """const bs = Rules.buildingsOf(S, S.area); const b = bs.find((x) => x.kind === 'house') || bs[0]; if (!b) return false;
  const ts = 5 * 28 / 36, h = 18 * ts, dx = b.door.ox - b.door.x, dy = b.door.oy - b.door.y;
  const qx = (b.door.x + 0.5) * ts - h, qz = (b.door.y + 0.5) * ts - h;
  S.player.x = b.door.ox; S.player.y = b.door.oy; g.refresh();
  g.P.x = qx + dx * 7 + dy * 2.5; g.P.z = qz + dy * 7 + dx * 2.5; g.P.yaw = Math.atan2(-(qx - g.P.x), -(qz - g.P.z)); g.P.pitch = -0.05; await wait(800);"""
OUTDOOR = """const L2 = Rules.houseOf(S, S.area), e = L2.exit, ts2 = 5 * 28 / 36 / 3, h2 = 18 * ts2, ex = e % 36, ey = Math.floor(e / 36);
  const dx = ex - L2.entry.x, dy = ey - L2.entry.y; g.P.x = (L2.entry.x + 0.5 - dx * 3.2) * ts2 - h2; g.P.z = (L2.entry.y + 0.5 - dy * 3.2) * ts2 - h2;
  g.P.yaw = Math.atan2(-dx, -dy); g.P.pitch = -0.02; await wait(600);"""
# commission 8: inside a building of a kind (or an empty house), found in any town of the world and walked into
KIND = """let ok = false; for (const t of Rules.places(S).filter((p) => p.group === 'Towns')) { Rules.jumpTo(S, t.id);
    const b = Rules.buildingsOf(S, S.area).find((x) => %s); if (!b) continue;
    S.player.x = b.door.ox; S.player.y = b.door.oy; %s Rules.move(S, b.door.x - b.door.ox, b.door.y - b.door.oy); ok = S.area === b.id; break; }
  if (!ok) return false; g.refresh(); g.buildStatic(); g.refresh();
  const L = Rules.houseOf(S, S.area), ts = 5 * 28 / 36 / 3, h = 18 * ts; let x0 = 99, x1 = 0, y0 = 99, y1 = 0; const room = %d;
  for (let k = 0; k < 36 * 36; k++) if (L.cells[k] === Math.min(room, L.rooms.length - 1)) { x0 = Math.min(x0, k %% 36); x1 = Math.max(x1, k %% 36); y0 = Math.min(y0, Math.floor(k / 36)); y1 = Math.max(y1, Math.floor(k / 36)); }
  // stand in the room's corner nearest its door and look across to the far corner, down a little
  const e = L.entry, near = (a, b, v) => (Math.abs(v - a) <= Math.abs(v - b) ? a + 0.9 : b + 0.1);
  const sx = near(x0, x1, e.x), sy = near(y0, y1, e.y), fx = sx < (x0 + x1) / 2 ? x1 + 1 : x0, fy = sy < (y0 + y1) / 2 ? y1 + 1 : y0;
  g.P.x = sx * ts - h; g.P.z = sy * ts - h; g.P.yaw = Math.atan2(-(fx - sx), -(fy - sy)); g.P.pitch = -0.14; await wait(600);"""
EMPTY = "Rules.houseLayout(S, S.area, x).empty"
# an open field underfoot and toward the horizon, and a road looked along
FIELD = " g.P.pitch = %s; await wait(400);"
ROAD = """Rules.travelTo(S, 'overworld', 18, 18); %s g.refresh(); let best = null;
  for (const id of Object.keys(S.areas)) { const rec = S.areas[id]; if (rec.kind !== 'region' || rec.realm) continue; const m = Rules.mapOf(S, id);
    const ks = Object.keys(m.road || {}).map(Number); if (ks.length < 12) continue;
    for (const k of ks) { const x = k %% 36, y = Math.floor(k / 36); if (x < 6 || y < 6 || x > 29 || y > 29) continue;
      for (const [dx, dy] of [[1, 0], [0, 1]]) if (m.road[k + dx + dy * 36] !== undefined && m.road[k + 2 * dx + 2 * dy * 36] !== undefined && m.road[k - dx - dy * 36] !== undefined) { best = { id, x, y, dx, dy }; break; }
      if (best) break; } if (best) break; }
  if (!best) return false; Rules.travelTo(S, best.id, best.x, best.y); g.refresh(); g.buildStatic(); g.refresh();
  const cx = (best.x + 0.5) * 28 - 504, cz = (best.y + 0.5) * 28 - 504; g.P.x = cx - best.dx * 10 + best.dy * 0.5; g.P.z = cz - best.dy * 10 + best.dx * 0.5;
  g.P.yaw = Math.atan2(-best.dx, -best.dy); g.P.pitch = -0.18; await wait(800);"""
ROADTOWN = """const t = S.town, d = Rules.townDoor(S); Rules.travelTo(S, Rules.townArea(S), d.x, d.y); %s g.refresh();
  let best = null; for (const k of Object.keys(S.road).map(Number)) { const x = k %% 36, y = Math.floor(k / 36), c = Math.max(Math.abs(x - t.x), Math.abs(y - t.y));
    if (c >= 4 && c <= 6 && (!best || c > best.c)) best = { x, y, c }; }
  if (!best) return false; Rules.travelTo(S, Rules.townArea(S), best.x, best.y); g.refresh(); g.buildStatic(); g.refresh();
  const a = g.V.townAt; if (!a) return false; const px = (best.x + 0.5) * 28 - 504, pz = (best.y + 0.5) * 28 - 504;
  g.P.x = px; g.P.z = pz; g.P.yaw = Math.atan2(-(a.x - px), -(a.z - pz)); g.P.pitch = -0.1; await wait(600);"""
# a road over a river, from the bank (any of a few worlds)
BRIDGE = """let f = null; for (const id of Object.keys(S.areas)) { const rec = S.areas[id]; if (rec.kind !== 'region' || rec.realm) continue; Rules.ensureRegion(S, rec.cx, rec.cy); const m = Rules.mapOf(S, id);
    for (const k of Object.keys(m.road || {}).map(Number)) if (m.terrain[k] === 4) { const x = k %% 36, y = Math.floor(k / 36); if (x > 3 && y > 3 && x < 32 && y < 32) { f = { id, x, y }; break; } } if (f) break; }
  if (!f) return false; Rules.travelTo(S, f.id, f.x, f.y); %s g.refresh(); g.buildStatic(); g.refresh();
  const cx = (f.x + 0.5) * 28 - 504, cz = (f.y + 0.5) * 28 - 504; g.P.x = cx + 16; g.P.z = cz + 20; g.P.yaw = Math.atan2(-(cx - g.P.x), -(cz - g.P.z)); g.P.pitch = -0.12; await wait(600);"""
HAMLET = """const t = (S.towns || []).find((t) => t.hamlet && !t.realm); if (!t) return false; const d = Rules.townDoor(S, t);
  Rules.travelTo(S, t.area, d.x, d.y + 2); %s g.refresh(); g.buildStatic(); g.refresh(); const a = g.V.townAt; if (!a) return false;
  g.P.x = a.x + 6; g.P.z = a.z + 95; g.P.yaw = 0.05; g.P.pitch = -0.02; await wait(600);"""
SHOTS = [
    ('salt-day', 11, {}, region('Salt', DAY)),
    ('salt-night', 11, {}, region('Salt', NIGHT)),
    ('moor-day', 11, {}, region('Moor', DAY)),
    ('moor-night', 11, {}, region('Moor', NIGHT)),
    ('taiga-day', 11, {}, region('Taiga', DAY)),
    ('taiga-night', 11, {}, region('Taiga', NIGHT)),
    ('wild-day', 11, {}, region('(0, 1)', DAY)),
    ('wild-dusk', 11, {}, region('(0, 1)', 'S.time = 19.3 * 60 - 360;')),
    ('town-1', 11, {}, town(0, DAY)),
    ('town-2', 222, {}, town(1, DAY)),
    ('town-3', 3333, {}, town(2, 'S.time = 18.6 * 60 - 360;')),
    ('town-night', 11, {}, town(0, NIGHT)),
    ('ruin', 11, {}, RUIN % DAY),
    ('street', 11, {}, town(0, 'S.time = 16 * 60 - 360;') + "g.P.z -= 46; g.P.x += 3; g.P.yaw = -0.5; g.P.pitch = 0.05;"),
    ('creature', 11, {}, "Rules.travelTo(S, 'overworld', 18, 18); " + DAY + " g.refresh(); const c = S.creatures.find((c) => !c.bound); if (!c) return false; c.cool = 999; S.player.x = c.x; S.player.y = Math.min(35, c.y + 1); g.refresh(); let a = null; g.scene.traverse((o) => { if (!a && o.userData.actor && o.userData.actor.kind !== 'person') a = o; }); if (!a) return false; const w = new THREE.Vector3(); a.parent.getWorldPosition(w); g.P.x = w.x + 2.4; g.P.z = w.z + 5.2; g.P.yaw = Math.atan2(-(w.x - g.P.x), -(w.z - g.P.z)); g.P.pitch = -0.3; await wait(2500);"),
    # a townsperson up close, as Andrew saw one on his phone (C7.1), and from a few steps
    ('person-close', 11, {}, town(0, 'S.time = 16 * 60 - 360;') + PERSON % (0.75, 0.75, 0.0)),
    ('person-near', 11, {}, town(0, 'S.time = 16 * 60 - 360;') + PERSON % (3.0, 3.0, -0.1)),
    # things (C7.3): a dungeon's level with its furniture and small things, close to, and old things round a ruin
    ('things-level', 31, {}, place('Below', '') + THING % ('true', 2.2, -0.3)),
    ('things-ruin', 11, {}, RUIN % DAY + THING % ('false', -3, -0.45)),
    # inside buildings (C7.4): the elder's hall, a house, the inn; and a house's open door from the street
    ('house-hall', 11, {}, HOUSE % (0, DAY)),
    ('house-home', 11, {}, HOUSE % (2, DAY)),
    ('house-inn', 222, {}, HOUSE % (1, 'S.time = 21 * 60 - 360;')),
    ('house-door', 11, {}, town(0, DAY) + DOOR),
    ('house-out', 11, {}, HOUSE % (2, DAY) + OUTDOOR),
    # commission 8: surfaces, roads, rooms by use, a temple, a hamlet
    ('field-near', 7, {}, region('Elder Downs', DAY) + FIELD % '-0.55'),
    ('field-far', 7, {}, region('Elder Downs', DAY) + FIELD % '-0.12'),
    ('field-knolls', 3333, {}, region('Knolls', DAY) + FIELD % '-0.3'),
    ('field-moor', 3333, {}, region('High Moor (3, 1)', DAY) + FIELD % '-0.3'),
    ('road', 11, {}, ROAD % DAY),
    ('road-2', 3333, {}, ROAD % DAY),
    ('road-old', 12, {}, ROAD % DAY),
    ('road-old-2', 14, {}, ROAD % DAY),
    ('road-town', 11, {}, ROADTOWN % DAY),
    ('bridge', 222, {}, BRIDGE % DAY),
    ('dwelling-1', 11, {}, KIND % ("x.kind === 'house' && !" + EMPTY.replace('x).', 'x).'), DAY, 0)),
    ('dwelling-2', 11, {}, KIND % ("x.kind === 'house' && !" + EMPTY, DAY, 1)),
    ('dwelling-3', 222, {}, KIND % ("x.kind === 'house' && !" + EMPTY, DAY, 2)),
    ('empty-house', 11, {}, KIND % (EMPTY, DAY, 0)),
    ('temple', 11, {}, KIND % ("x.kind === 'temple'", DAY, 0)),
    ('shop', 222, {}, KIND % ("x.kind === 'shop'", DAY, 0)),
    ('smithy', 11, {}, KIND % ("x.kind === 'smith'", DAY, 0)),
    ('hamlet', 11, {}, HAMLET % DAY),
    ('fields', 11, {}, "const d = Rules.townDoor(S); Rules.travelTo(S, Rules.townArea(S), d.x, d.y + 2); " + DAY + " g.refresh(); g.buildStatic(); g.refresh(); let f = null; g.scene.traverse((o) => { if (!f && o.userData.fields === true) f = o; }); if (!f) return false; const p = f.geometry.attributes.position, w = new THREE.Vector3(p.getX(0), 0, p.getZ(0)).applyMatrix4(f.matrixWorld), c = new THREE.Vector3(p.getX(40), 0, p.getZ(40)).applyMatrix4(f.matrixWorld); g.P.x = w.x - 12; g.P.z = w.z - 12; g.P.yaw = Math.atan2(-(c.x - g.P.x), -(c.z - g.P.z)); g.P.pitch = -0.12; await wait(800);"),
    ('rare-sepia', 9, {}, region('Home', DAY)),
    ('rare-reds', 251, {}, region('Home', 'S.time = 17.8 * 60 - 360;')),
    ('storm', 222, {}, region('(1, 1)', DAY + 'S.weather.storm = Rules.stormOfNow ? true : true;')),
    ('dungeon', 31, {}, place('Below', '')),
    ('sky', 32, {'sky': 1, 'trouble': 'tyrant'}, place('Above', DAY)),
    ('sea', 34, {'sea': 1, 'size': '5x5'}, "if (!Rules.jumpTo(S, 'region:' + S.seaPlaces[0].area)) return false; " + DAY + " g.refresh(); g.buildStatic(); g.refresh(); g.P.pitch = -0.02;"),
    ('under-sea', 34, {'sea': 1, 'size': '5x5'}, place('Water', DAY)),
    ('other-world', 35, {'doors': 1}, REALM % DAY),
    ('other-world-2', 36, {'doors': 1}, REALM % 'S.time = 17.5 * 60 - 360;'),
    ('other-world-3', 37, {'doors': 1}, REALM % 'S.time = 10 * 60 - 360;'),
]
async def main():
    os.makedirs(OUT, exist_ok=True)
    only = [a for a in sys.argv[3:]]
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], **({'executable_path': os.environ['CHROME']} if os.environ.get('CHROME') else {}))
        pg = await b.new_page(viewport={'width': W, 'height': H}, device_scale_factor=1)
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('**/three.min.js', lambda r: r.fulfill(path=THREE))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto('file://' + os.environ.get('PAGE', os.path.join(ROOT, 'dist/index.html'))); await pg.wait_for_timeout(1500)
        await pg.evaluate("(q) => { const g = window.__g; g.setQuality(q); if (g.autoQuality) g.autoQuality(false); }", QUAL)
        total = 0
        for (name, seed, setting, js) in SHOTS:
            if only and name not in only: continue
            ok = await pg.evaluate("""async ([seed, set, js]) => {
              const g = window.__g, wait = (ms) => new Promise((r) => setTimeout(r, ms));
              g.newWorld(seed, set); document.querySelectorAll('#modal-close').forEach((b) => b.click());
              const S = g.S; S.weather.storm = false; S.weather.changeAt = 1e9; Rules.setGodMode(S, true);
              S.creatures.forEach((c) => (c.cool = 999));
              const r = await (new Function('g', 'S', 'wait', 'return (async () => {' + js + '})()'))(g, S, wait);
              document.getElementById('modal').hidden = true;
              // the picture only: hide the panels and buttons
              for (const e of document.body.children) if (!e.querySelector('canvas') && e.tagName !== 'CANVAS') e.style.visibility = 'hidden';
              return r !== false;
            }""", [seed, setting, js])
            if not ok: print('  skipped', name); continue
            await pg.wait_for_timeout(1200)
            path = os.path.join(OUT, name + '.jpg')
            await pg.screenshot(path=path, type='jpeg', quality=90)
            # small enough for the repository: 288 x 512, quality 45 (a few hundred KB for the whole set)
            im = Image.open(path); im.load(); im.resize((288, 512), Image.LANCZOS).save(path, quality=45, optimize=True)
            total += os.path.getsize(path)
            lk = await pg.evaluate("() => window.__g.look ? window.__g.look() : null")
            print('  %-14s %3d KB  %s' % (name, os.path.getsize(path) // 1024, lk and ', '.join(lk['names']) + ' ' + lk['zenith'] + ' ' + lk['horizon'] or ''))
        print('%d KB in all, in %s' % (total // 1024, os.path.relpath(OUT, ROOT)))
        if errs: print('page errors:', errs[:3]); sys.exit(1)
        await b.close()
asyncio.run(main())
