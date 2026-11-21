/* Light and weather, behind the quality setting (quality.js): a sky that darkens toward the top with a sun and a moon
   in it, and rain, snow, hail, dust, ash or falling stars while a storm blows. Each is one mesh, updated each frame
   from numbers the frame already has; on Low there is none of it and the sky is the flat colour of the fog. */
import { P, R, V } from './ctx.js';
import { Q, lookOn } from './quality.js';
import { camera, scene } from './scene.js';

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
  const g = new THREE.SphereGeometry(SKY_R, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2 + 0.15),
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
  glowC = new THREE.Color(),
  vc = new THREE.Color(),
  sd = new THREE.Vector3();
function paintDome(skyColor, sunPos, day, storm) {
  const g = dome.geometry,
    pos = g.attributes.position,
    col = g.attributes.color,
    painted = lookOn('light');
  zen
    .copy(ZENITH_NIGHT)
    .lerp(ZENITH_DAY, day)
    .lerp(skyColor, storm ? 0.85 : 0.35);
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
      vc.copy(skyColor).lerp(zen, Math.pow(up, 0.6));
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
function updateSky(skyColor, sunPos, day, storm, dt) {
  const on = Q.sky && !R.isDark(V.S);
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
  if (dome) dome.visible = sunDisc.visible = moonDisc.visible = false;
  if (fall) fall.visible = false;
}
function showFall() {
  if (fall) fall.visible = true;
}
export { updateSky, hideSky, showFall, kindOf };
