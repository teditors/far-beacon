/* Light and weather, behind the quality setting (quality.js): a sky that darkens toward the top with a sun and a moon
   in it, and rain, snow, hail, dust, ash or falling stars while a storm blows. Each is one mesh, updated each frame
   from numbers the frame already has; on Low there is none of it and the sky is the flat colour of the fog. */
import { P, R, V } from './ctx.js';
import { LOOK_SWITCHES, Q, lookOn } from './quality.js';
import { camera, scene } from './scene.js';
import { NOW } from './mood.js';
import { hideSkyline, updateSkyline } from './skyline.js';

const SKY_R = 1800;
let dome = null,
  sunDisc = null,
  moonDisc = null,
  fall = null,
  fallKind = '',
  fallN = 0;
// A dome whose vertices are the fog's colour at the horizon, so the land fades into it exactly, shading to a deeper blue
// overhead and warming round the sun. Its few vertices are recoloured each frame (paintDome), which costs nothing.
function makeDome() {
  const g = new THREE.SphereGeometry(SKY_R, 24, 18, 0, Math.PI * 2, 0, Math.PI / 2 + 0.15),
    pos = g.attributes.position;
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3));
  const m = new THREE.Mesh(
    g,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  m.renderOrder = -10;
  m.frustumCulled = false;
  return m;
}
const ZENITH_DAY = new THREE.Color(0x4f86cf),
  ZENITH_NIGHT = new THREE.Color(0x060a18),
  GLOW_LOW = new THREE.Color(0xffb070),
  GLOW_HIGH = new THREE.Color(0xfff4dc),
  zen = new THREE.Color(),
  haze = new THREE.Color(),
  glowC = new THREE.Color(),
  vc = new THREE.Color(),
  sd = new THREE.Vector3();
function paintDome(skyColor, sunPos, day, storm) {
  const g = dome.geometry,
    pos = g.attributes.position,
    col = g.attributes.color,
    painted = lookOn('light');
  if (NOW.look)
    zen.copy(NOW.look.c.zenith); // the look's own sky (C6)
  else
    zen
      .copy(ZENITH_NIGHT)
      .lerp(ZENITH_DAY, day)
      .lerp(skyColor, storm ? 0.85 : 0.35);
  if (NOW.look) {
    // the band between: the zenith lightened toward the horizon's brightness, keeping the zenith's hue
    const lz = zen.r * 0.3 + zen.g * 0.59 + zen.b * 0.11,
      lh = skyColor.r * 0.3 + skyColor.g * 0.59 + skyColor.b * 0.11;
    haze.copy(zen).multiplyScalar(Math.min(2.5, (lz * 0.4 + lh * 0.6) / Math.max(0.02, lz)));
    haze.lerp(skyColor, 0.25);
  }
  sd.copy(sunPos).normalize();
  const low = 1 - Math.min(1, Math.max(0, sd.y) * 2.5); // 1 when the sun is on the horizon
  glowC.copy(GLOW_HIGH).lerp(GLOW_LOW, low);
  const glowK = storm ? 0 : day * (0.25 + 0.45 * low);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / SKY_R,
      y = pos.getY(i) / SKY_R,
      z = pos.getZ(i) / SKY_R,
      up = Math.max(0, y);
    if (!painted) {
      // the old sky: one colour, darker overhead
      const k = 1 - 0.38 * Math.pow(up, 0.8);
      vc.setRGB(skyColor.r * k * 0.92, skyColor.g * k * 0.97, Math.min(1, skyColor.b * k * 1.08));
    } else {
      if (NOW.look) {
        // three stops (C6): the horizon, a pale band of the zenith's own colour, the zenith; a straight mix of a warm
        // horizon and a blue zenith would pass through a muddy green
        const t = Math.pow(up, 0.55);
        if (t < 0.35) vc.copy(skyColor).lerp(haze, t / 0.35);
        else vc.copy(haze).lerp(zen, (t - 0.35) / 0.65);
      } else vc.copy(skyColor).lerp(zen, Math.pow(up, 0.6));
      const toward = Math.max(0, x * sd.x + y * sd.y + z * sd.z);
      vc.lerp(glowC, glowK * Math.pow(toward, 6));
    }
    col.setXYZ(i, vc.r, vc.g, vc.b);
  }
  col.needsUpdate = true;
}
const disc = (r, color) => {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(r, 20),
    new THREE.MeshBasicMaterial({ color, fog: false, transparent: true, depthWrite: false }),
  );
  m.renderOrder = -9;
  m.frustumCulled = false;
  return m;
};
// What falls in a storm, from its name.
function kindOf(name) {
  const n = (name || '').toLowerCase();
  if (/snow|blizzard/.test(n)) return 'snow';
  if (/hail/.test(n)) return 'hail';
  if (/dust|sand|gale|wind/.test(n)) return 'dust';
  if (/ash/.test(n)) return 'ash';
  if (/star/.test(n)) return 'stars';
  if (/fog/.test(n)) return '';
  return 'rain';
}
const FALL = {
  rain: { color: 0x9fb4c8, size: 0.12, speed: 26, drift: 1, n: 1 },
  hail: { color: 0xe8eef2, size: 0.2, speed: 18, drift: 1, n: 0.6 },
  snow: { color: 0xffffff, size: 0.22, speed: 2.2, drift: 1.6, n: 1 },
  dust: { color: 0xc9a77a, size: 0.18, speed: 0.6, drift: 9, n: 1 },
  ash: { color: 0x4a4744, size: 0.2, speed: 1.5, drift: 2, n: 0.8 },
  stars: { color: 0xffe9a8, size: 0.6, speed: 40, drift: 4, n: 0.05 },
};
const BOX = 40;
function makeFall(kind) {
  const f = FALL[kind],
    n = Math.max(1, Math.round(Q.weather * f.n)),
    pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * BOX * 2;
    pos[i * 3 + 1] = Math.random() * BOX;
    pos[i * 3 + 2] = (Math.random() - 0.5) * BOX * 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.Points(
    g,
    new THREE.PointsMaterial({ color: f.color, size: f.size, transparent: true, opacity: 0.85, depthWrite: false }),
  );
  m.frustumCulled = false;
  fallN = n;
  return m;
}
// Called every frame outdoors: sky colour, how far round the sun is (0 dawn to 1 dusk, day 0..1), and the storm.
/* Clouds (C5.18): soft heaps of white drawn in code, standing in a ring high round the traveller and drifting with the
   wind; tinted by the hour (gold and rose at dawn and dusk, grey under a storm, faint at night). A halo round the sun.
   Medium has a dozen clouds, High two dozen; Low none. Switch: `clouds`. */
LOOK_SWITCHES.push(['clouds', "Clouds and the sun's glow"]);
let clouds = null,
  halo = null;
function cloudTexture(seed) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  let a = seed;
  const r = () => (a = (a * 16807) % 2147483647) / 2147483647;
  // puffs heaped along a flat base: white on top, a grey shadow under
  for (let pass = 0; pass < 2; pass++)
    for (let i = 0; i < 22; i++) {
      const x = 40 + r() * 176,
        rad = 14 + r() * 30 * (1 - Math.abs(x - 128) / 160),
        y = 88 - rad * (0.4 + r() * 0.6) + (pass ? -6 : 4);
      const grad = g.createRadialGradient(x, y - rad * 0.3, rad * 0.1, x, y, rad);
      grad.addColorStop(0, pass ? 'rgba(255,255,255,0.95)' : 'rgba(170,176,190,0.7)');
      grad.addColorStop(0.7, pass ? 'rgba(250,250,252,0.6)' : 'rgba(160,166,180,0.35)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, rad, 0, Math.PI * 2);
      g.fill();
    }
  const t = new THREE.CanvasTexture(c);
  return t;
}
function makeClouds() {
  const g = new THREE.Group(),
    n = Q.texPx >= 256 ? 24 : 12,
    texes = [cloudTexture(7), cloudTexture(19), cloudTexture(41), cloudTexture(77)];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texes[i % 4], fog: false, transparent: true, depthWrite: false, opacity: 0.9 }),
    );
    const a = (i / n) * Math.PI * 2 + (i % 3) * 0.4,
      d = 900 + ((i * 37) % 7) * 110,
      w = 260 + ((i * 53) % 5) * 70;
    m.userData.a = a;
    m.userData.d = d;
    m.userData.h = 260 + ((i * 29) % 6) * 45;
    m.scale.set(w, w * 0.45, 1);
    m.renderOrder = -8;
    g.add(m);
  }
  const ht = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d'),
      gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,240,200,0.9)');
    gr.addColorStop(0.2, 'rgba(255,220,160,0.35)');
    gr.addColorStop(1, 'rgba(255,200,120,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  halo = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: ht, fog: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  halo.scale.setScalar(700);
  halo.renderOrder = -9;
  scene.add(g, halo);
  return g;
}
const cTint = new THREE.Color(),
  cDusk = new THREE.Color(0xf0a080),
  cNight = new THREE.Color(0x30384c),
  cStorm = new THREE.Color(0x7c8088);
function updateClouds(on, skyColor, sunPos, day, storm, dt) {
  if (on && !clouds) clouds = makeClouds();
  if (!clouds) return;
  clouds.visible = halo.visible = on;
  if (!on) return;
  const t = performance.now() / 1000,
    low = 1 - Math.min(1, Math.max(0, sunPos.y / 300) * 2.5);
  if (NOW.look)
    cTint.copy(NOW.look.c.cloud).lerp(NOW.look.c.horizon, 0.3); // clouds in the air's colour
  else {
    cTint
      .setRGB(1, 1, 1)
      .lerp(cDusk, low * day * 0.7)
      .lerp(cNight, 1 - day);
    if (storm) cTint.lerp(cStorm, 0.7);
  }
  for (const m of clouds.children) {
    const a = m.userData.a + t * 0.004; // drifting round, slowly
    m.position.set(
      camera.position.x + Math.cos(a) * m.userData.d,
      camera.position.y + m.userData.h,
      camera.position.z + Math.sin(a) * m.userData.d,
    );
    m.material.color.copy(cTint);
    m.material.opacity = (storm ? 0.95 : 0.85) * (0.35 + 0.65 * day);
  }
  const d = sunPos
    .clone()
    .normalize()
    .multiplyScalar(SKY_R * 0.9);
  halo.position.copy(camera.position).add(d);
  halo.material.opacity = storm ? 0 : day * (0.55 + 0.45 * low);
}
function updateSky(skyColor, sunPos, day, storm, dt) {
  const on = Q.sky && !R.isDark(V.S);
  updateSkyline(on, scene.fog ? scene.fog.far : 600); // far hills (C6)
  updateClouds(on && lookOn('clouds') && lookOn('light'), skyColor, sunPos, day, storm, dt);
  if (on && !dome) {
    dome = makeDome();
    sunDisc = disc(70, 0xfff2c8);
    moonDisc = disc(40, 0xdfe6f0);
    scene.add(dome, sunDisc, moonDisc);
  }
  if (dome) {
    dome.visible = sunDisc.visible = moonDisc.visible = on;
    if (on) {
      dome.position.copy(camera.position);
      paintDome(skyColor, sunPos, day, storm);
      const d = sunPos
        .clone()
        .normalize()
        .multiplyScalar(SKY_R * 0.95);
      sunDisc.position.copy(camera.position).add(d);
      sunDisc.lookAt(camera.position);
      sunDisc.material.opacity = storm ? 0 : Math.max(0, Math.min(1, day * 1.5));
      moonDisc.position.copy(camera.position).sub(d.setY(Math.abs(d.y)));
      moonDisc.lookAt(camera.position);
      moonDisc.material.opacity = storm ? 0 : Math.max(0, 0.9 - day * 1.6);
    }
  }
  // what falls in the storm
  const kind = Q.weather > 0 && storm && !R.indoors(V.S) ? kindOf(storm.name) : '';
  if (kind !== fallKind || (fall && fallN !== Math.max(1, Math.round(Q.weather * (FALL[kind] || { n: 1 }).n)))) {
    if (fall) {
      scene.remove(fall);
      fall.geometry.dispose();
      fall.material.dispose();
      fall = null;
    }
    fallKind = kind;
    if (kind) scene.add((fall = makeFall(kind)));
  }
  if (fall) {
    const f = FALL[kind],
      a = fall.geometry.attributes.position,
      p = a.array,
      wind = Math.sin(performance.now() / 3000) * f.drift;
    for (let i = 0; i < p.length; i += 3) {
      p[i + 1] -= f.speed * dt;
      p[i] += wind * dt;
      p[i + 2] += f.drift * 0.3 * dt;
      if (p[i + 1] < 0) p[i + 1] += BOX;
      if (p[i] > BOX) p[i] -= 2 * BOX;
      if (p[i] < -BOX) p[i] += 2 * BOX;
      if (p[i + 2] > BOX) p[i + 2] -= 2 * BOX;
    }
    a.needsUpdate = true;
    fall.position.set(P.x, P.y - BOX * 0.4, P.z);
  }
}
function hideSky() {
  hideSkyline();
  if (dome) dome.visible = sunDisc.visible = moonDisc.visible = false;
  if (clouds) clouds.visible = halo.visible = false;
  if (fall) fall.visible = false;
}
function showFall() {
  if (fall) fall.visible = true;
}
export { updateSky, hideSky, showFall, kindOf };
