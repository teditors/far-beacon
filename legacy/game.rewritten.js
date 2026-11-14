/* VIEW + UI: a 3D way of looking at and moving through the same Rules state the 2D game uses. No game logic lives here. */
(function () {
  const R = Rules,
    $ = (id) => document.getElementById(id),
    KEY = 'farbeacon3d.run.v6',
    CODEX = 'farbeacon3d.codex.v1';
  if (!window.THREE) {
    $('log').innerHTML = '<li class="bad new">The 3D library did not load. Check your connection and reload the page.</li>';
    return;
  }
  const TS = 28,
    WORLD = R.W * TS,
    HALF = WORLD / 2,
    N = 216,
    CELL = WORLD / N,
    EYE = 1.7;
  const VIEW = { speed: 7 };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
    lerp = (a, b, t) => a + (b - a) * t,
    smooth = (t) => t * t * (3 - 2 * t);
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const el = (tag, props, kids) => {
    const e = document.createElement(tag);
    if (props)
      for (const k in props) {
        if (k === 'text') e.textContent = props[k];
        else if (k === 'on') e.addEventListener('click', props[k]);
        else if (k === 'cls') e.className = props[k];
        else e.setAttribute(k, props[k]);
      }
    (kids || []).forEach((c) => c && e.appendChild(c));
    return e;
  };
  function mulberry(a) {
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const tileX = (tx) => (tx + 0.5) * TS - HALF,
    toTile = (x) => clamp(Math.floor((x + HALF) / TS), 0, R.W - 1);
  let S = null,
    P = { x: 0, z: 0, y: 0, yaw: 0, pitch: 0, walked: 0 },
    terrain = null,
    blockedUntil = 0;

  /* ---------- terrain from the rules map ---------- */
  function makeTerrain(s) {
    const r = mulberry(s.seed ^ 0x51f15e),
      T = new Float32Array(4096);
    for (let i = 0; i < 4096; i++) T[i] = r();
    const at = (ix, iz) => T[((ix * 73856093) ^ (iz * 19349663)) & 4095];
    const noise = (x, z) => {
      const x0 = Math.floor(x),
        z0 = Math.floor(z),
        tx = smooth(x - x0),
        tz = smooth(z - z0);
      return (
        (at(x0, z0) * (1 - tx) + at(x0 + 1, z0) * tx) * (1 - tz) + (at(x0, z0 + 1) * (1 - tx) + at(x0 + 1, z0 + 1) * tx) * tz
      );
    };
    const W = R.W,
      lv = new Float32Array(W * W);
    for (let y = 0; y < W; y++)
      for (let x = 0; x < W; x++) {
        let a = 0,
          n = 0;
        for (let j = -1; j <= 1; j++)
          for (let i = -1; i <= 1; i++) {
            const xx = x + i,
              yy = y + j;
            if (xx < 0 || yy < 0 || xx >= W || yy >= W) continue;
            a += s.elev[yy * W + xx];
            n++;
          }
        lv[y * W + x] = 0.55 * s.elev[y * W + x] + (0.45 * a) / n;
      }
    const level = (x, z) => {
      const fx = clamp((x + HALF) / TS - 0.5, 0, W - 1.001),
        fz = clamp((z + HALF) / TS - 0.5, 0, W - 1.001),
        ix = Math.floor(fx),
        iz = Math.floor(fz),
        tx = smooth(fx - ix),
        tz = smooth(fz - iz);
      return (
        (lv[iz * W + ix] * (1 - tx) + lv[iz * W + ix + 1] * tx) * (1 - tz) +
        (lv[(iz + 1) * W + ix] * (1 - tx) + lv[(iz + 1) * W + ix + 1] * tx) * tz
      );
    };
    const mask = (type) => {
      const g = new Float32Array(W * W);
      for (let i = 0; i < W * W; i++) g[i] = s.terrain[i] === type ? 1 : 0;
      return (x, z) => {
        const fx = clamp((x + HALF) / TS - 0.5, 0, W - 1.001),
          fz = clamp((z + HALF) / TS - 0.5, 0, W - 1.001),
          ix = Math.floor(fx),
          iz = Math.floor(fz),
          tx = fx - ix,
          tz = fz - iz;
        return clamp(
          ((g[iz * W + ix] * (1 - tx) + g[iz * W + ix + 1] * tx) * (1 - tz) +
            (g[(iz + 1) * W + ix] * (1 - tx) + g[(iz + 1) * W + ix + 1] * tx) * tz -
            0.3) /
            0.4,
          0,
          1,
        );
      };
    };
    const masks = [mask(3), mask(4), mask(5)],
      rg = new Float32Array(W * W);
    for (const k in s.road) rg[k] = 1;
    const roadAt = (x, z) =>
      rg[toTile(z) * W + toTile(x)] &&
      Math.max(Math.abs(((x + HALF) % TS) - TS / 2), Math.abs(((z + HALF) % TS) - TS / 2)) < TS * 0.5
        ? 1
        : 0;
    const raw = (x, z) => {
      const l = level(x, z);
      return (
        (l <= 1 ? l * 15 : 15 + (l - 1) * 34) +
        14 * noise(x / 380 + 7, z / 380 + 7) +
        7 * noise(x / 85 + 40, z / 85 + 40) * Math.max(0.15, 0.4 + l * 0.6) +
        1.6 * noise(x / 22 + 90, z / 22 + 90)
      );
    };
    const hg = new Float32Array((N + 1) * (N + 1)),
      gx = (i) => -HALF + i * CELL;
    for (let iz = 0; iz <= N; iz++) for (let ix = 0; ix <= N; ix++) hg[iz * (N + 1) + ix] = raw(gx(ix), gx(iz));
    for (const k in s.sites) {
      const cx = tileX(k % W),
        cz = tileX(Math.floor(k / W)),
        ci = Math.round((cx + HALF) / CELL),
        cj = Math.round((cz + HALF) / CELL),
        h0 = hg[cj * (N + 1) + ci] - (s.sites[k].kind === 'spring' ? 1.2 : 0),
        rad = 11,
        n = Math.ceil(rad / CELL);
      for (let j = -n; j <= n; j++)
        for (let i = -n; i <= n; i++) {
          const d = Math.hypot(i, j) * CELL;
          if (d >= rad) continue;
          const q = (cj + j) * (N + 1) + ci + i;
          if (q < 0 || q >= hg.length) continue;
          hg[q] = lerp(hg[q], h0, smooth(1 - d / rad));
        }
    }
    const height = (x, z) => {
      const fx = clamp((x + HALF) / CELL, 0, N - 0.001),
        fz = clamp((z + HALF) / CELL, 0, N - 0.001),
        ix = Math.floor(fx),
        iz = Math.floor(fz),
        tx = fx - ix,
        tz = fz - iz,
        H = (a, b) => hg[b * (N + 1) + a];
      return (H(ix, iz) * (1 - tx) + H(ix + 1, iz) * tx) * (1 - tz) + (H(ix, iz + 1) * (1 - tx) + H(ix + 1, iz + 1) * tx) * tz;
    };
    return { height, level, noise, masks, roadAt, rand: r };
  }

  /* ---------- scene ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(70, 1, 0.3, 3000);
  camera.rotation.order = 'YXZ';
  const hemi = new THREE.HemisphereLight(0xdfe7ee, 0x5a554c, 0.75),
    sun = new THREE.DirectionalLight(0xfff1dc, 0.9),
    lamp = new THREE.PointLight(0xffc477, 0, 45, 1.6);
  scene.add(hemi, sun, lamp);
  scene.fog = new THREE.Fog(0xb9c7d1, 40, 600);
  scene.background = new THREE.Color(0xb9c7d1);
  let staticGroup = null,
    dynGroup = null;
  const std = (color, extra) =>
    new THREE.MeshStandardMaterial(Object.assign({ color, flatShading: true, roughness: 1 }, extra || {}));
  const glow = (color, opacity) =>
    new THREE.MeshBasicMaterial({ color, fog: false, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
  const box = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x || 0, y || 0, z || 0);
    return m;
  };
  const dispose = (g) => {
    if (!g) return;
    scene.remove(g);
    g.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  };
  const SKY = { salt: 0xd3d2c2, moor: 0xaab7bb, taiga: 0xc6d3db },
    GOD = { thirst: 0xd9973a, climber: 0xbfe3ff, night: 0x9a6be0 };
  const BUILD = {
    well() {
      const g = new THREE.Group(),
        m = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 1, 10), std(0x5d5a55));
      m.position.y = 0.5;
      const w = new THREE.Mesh(
        new THREE.CircleGeometry(1.3, 12).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x3f8fc0 }),
      );
      w.position.y = 1.02;
      g.add(m, w);
      return g;
    },
    cave() {
      const g = new THREE.Group(),
        m = new THREE.Mesh(new THREE.IcosahedronGeometry(7, 1), std(0x55524c));
      m.scale.set(1.35, 0.8, 1.1);
      m.position.y = 1.5;
      const d = new THREE.Mesh(new THREE.SphereGeometry(3.1, 10, 8), new THREE.MeshBasicMaterial({ color: 0x08090b }));
      d.position.set(0, 0.6, 6.2);
      d.scale.set(1, 1, 0.5);
      g.add(m, d);
      return g;
    },
    cache() {
      const g = new THREE.Group(),
        s = std(0x6b675f);
      g.add(box(1.6, 0.8, 1.4, s, 0, 0.4, 0), box(1.1, 0.7, 1, s, 0.1, 1.15, 0), box(0.7, 0.6, 0.6, s, 0, 1.8, 0.1));
      return g;
    },
    shrine(s) {
      const g = new THREE.Group(),
        st = std(0x8d8a84);
      for (let i = 0; i < 3; i++) {
        const a = i * 2.094;
        g.add(box(0.7, 6, 0.7, st, Math.cos(a) * 3, 3, Math.sin(a) * 3));
      }
      const o = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8), glow(GOD[s.god], 1));
      o.position.y = 4.4;
      g.add(o);
      return g;
    },
    town() {
      const g = new THREE.Group(),
        wall = std(0xb9a98a),
        roof = std(0x7a3f2c),
        spots = [
          [-9, -6, 1],
          [-2, -9, 1.2],
          [7, -7, 0.9],
          [9, 2, 1.1],
          [-8, 5, 1],
          [0, 8, 1.2],
          [6, 9, 0.8],
        ];
      for (const [x, z, k] of spots) {
        const h = box(5 * k, 3 * k, 4.5 * k, wall, x, 1.5 * k, z),
          rf = new THREE.Mesh(new THREE.ConeGeometry(4.2 * k, 2.4 * k, 4), roof);
        rf.position.set(x, 3 * k + 1.2 * k, z);
        rf.rotation.y = Math.PI / 4;
        g.add(h, rf);
      }
      const well = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 1, 10), std(0x5d5a55));
      well.position.y = 0.5;
      g.add(well);
      for (const [x, z] of [
        [-2, -9],
        [9, 2],
      ]) {
        const sm = new THREE.Mesh(new THREE.CylinderGeometry(1, 2.4, 170, 8, 1, true), glow(0xd9d4c4, 0.42));
        sm.material.side = THREE.DoubleSide;
        sm.position.set(x, 88, z);
        g.add(sm);
      }
      return g;
    },
    vault(s) {
      const g = new THREE.Group(),
        id = s.quest.vault.id,
        st = std(id === 'temple' ? 0x5c7a78 : id === 'barrow' ? 0x5d6a4a : 0x55524e),
        dark = new THREE.MeshBasicMaterial({ color: 0x08090b });
      if (id === 'castle') {
        g.add(box(16, 7, 16, st, 0, 3.5, 0));
        for (const [x, z] of [
          [-8, -8],
          [8, -8],
          [-8, 8],
          [8, 8],
        ]) {
          const tw = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.9, 13, 8), st);
          tw.position.set(x, 6.5, z);
          g.add(tw);
        }
        g.add(box(3, 4, 0.4, dark, 0, 2, 8.05));
      } else if (id === 'barrow') {
        const m = new THREE.Mesh(new THREE.SphereGeometry(11, 12, 8, 0, 6.283, 0, 1.571), st);
        m.scale.y = 0.55;
        g.add(
          m,
          box(1.2, 4, 1.2, std(0x8d8a84), -2, 2, 10.6),
          box(1.2, 4, 1.2, std(0x8d8a84), 2, 2, 10.6),
          box(5.6, 1, 1.4, std(0x8d8a84), 0, 4.4, 10.6),
          box(2.6, 3.4, 0.4, dark, 0, 1.7, 10.2),
        );
      } else {
        for (let i = 0; i < 3; i++) g.add(box(18 - i * 4, 1.6, 18 - i * 4, st, 0, 0.8 + i * 1.6, 0));
        for (const [x, z] of [
          [-5, -5],
          [5, -5],
          [-5, 5],
          [5, 5],
        ])
          g.add(box(1, 7, 1, st, x, 8.2, z));
        g.add(box(12, 1, 12, st, 0, 12.2, 0), box(3, 3, 0.4, dark, 0, 6.2, 5.05));
      }
      return g;
    },
    beacon() {
      const g = new THREE.Group(),
        p = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.4, 30, 6), std(0x4b4843));
      p.position.y = 15;
      const o = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 8), glow(0xffb84a, 1));
      o.position.y = 33;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 420, 8, 1, true), glow(0xffb040, 0.45));
      b.position.y = 240;
      b.material.side = THREE.DoubleSide;
      g.add(p, o, b);
      return g;
    },
    ruin(s) {
      // shape = building habit, stone = style, height = age, tint and props = doom, flag = affinity
      const g = new THREE.Group(),
        body = new THREE.Group(),
        hb = s.civ.habit,
        doom = s.civ.doom,
        col = new THREE.Color(R.trait(s, 'style').stone);
      if (doom === 'fire') col.multiplyScalar(0.3);
      if (doom === 'plague') col.lerp(new THREE.Color(0xe6e6d6), 0.35);
      const st = std(col),
        dark = new THREE.MeshBasicMaterial({ color: 0x0b0c0e });
      if (hb === 'cistern') {
        body.add(
          box(9, 2.6, 0.9, st, 0, 1.3, -4),
          box(9, 1.8, 0.9, st, 0, 0.9, 4),
          box(0.9, 2.2, 8, st, -4, 1.1, 0),
          box(0.9, 3, 8, st, 4, 1.5, 0),
        );
        const w = new THREE.Mesh(new THREE.CircleGeometry(2.2, 12).rotateX(-Math.PI / 2), std(0x2c3a44));
        w.position.y = 0.15;
        g.add(w);
      } else if (hb === 'tower') {
        const tw = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 3, 17, 8), st);
        tw.position.y = 8.5;
        const c = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 2.6, 2.2, 8), st);
        c.position.y = 18;
        body.add(tw, c);
      } else if (hb === 'tomb')
        body.add(
          box(10, 2.4, 7, st, 0, 1.2, 0),
          box(11.5, 0.8, 8.5, st, 0, 2.7, 0),
          box(0.9, 4.2, 0.9, st, -2.2, 2.1, 4.2),
          box(0.9, 4.2, 0.9, st, 2.2, 2.1, 4.2),
          box(2.4, 2.1, 0.3, dark, 0, 1.05, 3.55),
        );
      else if (hb === 'granary') {
        const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 4.6, 3, 4, 1), st);
        roof.rotation.y = Math.PI / 4;
        roof.scale.set(1, 1, 2.1);
        roof.position.y = 5.5;
        body.add(box(6, 4, 13, st, 0, 2, 0), roof, box(1.8, 2.4, 0.3, dark, 0, 1.2, 6.55));
      } else
        body.add(
          box(1.4, 6, 1.4, st, -3.2, 3, 0),
          box(1.4, 6, 1.4, st, 3.2, 3, 0),
          box(9, 1.3, 1.8, st, 0, 6.6, 0),
          box(7, 0.3, 12, st, 0, 0.15, 0),
        );
      body.scale.y = R.trait(s, 'age').scale;
      g.add(body);
      const prop = (geo, mat, n, rad, y) => {
        for (let i = 0; i < n; i++) {
          const a = (i / n) * 6.283 + 0.4,
            m = new THREE.Mesh(geo, mat);
          m.position.set(Math.cos(a) * rad, y, Math.sin(a) * rad);
          g.add(m);
        }
      };
      if (doom === 'plague') prop(new THREE.CylinderGeometry(0.12, 0.12, 7, 5), std(0xf2f2ea), 3, 8.5, 3.5);
      if (doom === 'war') prop(new THREE.ConeGeometry(0.35, 2.6, 5), std(0x3a3027), 12, 8.5, 1.3);
      if (doom === 'famine') prop(new THREE.CylinderGeometry(0.5, 0.35, 1, 8), std(0xa8623a), 4, 6.5, 0.5);
      const pole = box(0.2, 5, 0.2, std(0x3a3027), 6, 2.5, 6),
        flag = box(1.8, 1.1, 0.1, new THREE.MeshBasicMaterial({ color: R.trait(s, 'affinity').color }), 6.95, 4.4, 6);
      g.add(pole, flag);
      return g;
    },
  };
  function buildStatic() {
    dispose(staticGroup);
    staticGroup = new THREE.Group();
    scene.add(staticGroup);
    terrain = makeTerrain(V.S);
    const b = R.biomeOf(V.S),
      cols = b.colors.map((c) => new THREE.Color(c)),
      lush = new THREE.Color(b.id === 'taiga' ? 0x5d7a78 : 0x5f8a45),
      paved = new THREE.Color(0x8c8a86),
      c = new THREE.Color();
    const springs = Object.keys(V.S.sites)
      .filter((k) => V.S.sites[k].kind === 'spring')
      .map((k) => ({ x: tileX(k % R.W), z: tileX(Math.floor(k / R.W)) }));
    const geo = new THREE.PlaneGeometry(WORLD, WORLD, N, N);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position,
      col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        z = pos.getZ(i);
      pos.setY(i, V.terrain.height(x, z));
      const l = V.terrain.level(x, z);
      if (l <= 1) c.copy(cols[0]).lerp(cols[1], Math.max(0, l));
      else c.copy(cols[1]).lerp(cols[2], Math.min(1, l - 1));
      for (let mi = 0; mi < 3; mi++) {
        const mv = V.terrain.masks[mi](x, z);
        if (mv > 0) c.lerp(cols[3 + mi], mv * (mi === 0 ? 0.7 : 1));
      }
      if (V.terrain.roadAt(x, z)) c.lerp(paved, 0.85);
      c.multiplyScalar(0.88 + 0.2 * V.terrain.noise(x / 40 + 3, z / 40 + 3));
      for (const s of springs) {
        const d = Math.hypot(s.x - x, s.z - z);
        if (d < 34) c.lerp(lush, (1 - d / 34) * 0.8);
      }
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    staticGroup.add(
      new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 })),
    );
    const r = V.terrain.rand,
      m = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      e = new THREE.Euler(),
      v = new THREE.Vector3(),
      sc = new THREE.Vector3();
    const nearSite = (x, z) => {
      const s = V.S.sites[toTile(z) * R.W + toTile(x)];
      return s && Math.hypot(tileX(toTile(x)) - x, tileX(toTile(z)) - z) < 11;
    };
    function scatter(geom, mat, count, fn) {
      const inst = new THREE.InstancedMesh(geom, mat, count);
      let n = 0;
      for (let i = 0; i < count * 3 && n < count; i++) {
        const x = (r() - 0.5) * (WORLD - 10),
          z = (r() - 0.5) * (WORLD - 10);
        if (nearSite(x, z)) continue;
        const o = fn(x, z, V.terrain.level(x, z));
        if (!o) continue;
        e.set(o.rx || 0, r() * 6.28, o.rz || 0);
        q.setFromEuler(e);
        sc.set(o.sx, o.sy, o.sx);
        v.set(x, V.terrain.height(x, z) + o.lift, z);
        m.compose(v, q, sc);
        inst.setMatrixAt(n++, m);
      }
      inst.count = n;
      staticGroup.add(inst);
    }
    const rockCol = cols[2].clone().multiplyScalar(0.85);
    scatter(new THREE.IcosahedronGeometry(1, 0), std(rockCol), b.id === 'salt' ? 800 : 450, (x, z, l) => {
      const s = 0.3 + r() * r() * (1.5 + l * 1.6);
      return { sx: s, sy: s * (0.6 + r() * 0.6), lift: s * 0.2, rx: r() * 3, rz: r() * 3 };
    });
    scatter(new THREE.IcosahedronGeometry(1, 0), std(rockCol), 16, () => {
      const s = 1.8 + r() * 1.6;
      return { sx: s, sy: s * (3 + r() * 2.5), lift: s, rx: r() * 0.15, rz: r() * 0.15 };
    });
    const tr = b.forest.tree,
      ftiles = [];
    for (let i = 0; i < V.S.terrain.length; i++) if (V.S.terrain[i] === 3) ftiles.push(i);
    if (ftiles.length) {
      const trees = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 6), std(tr.color), ftiles.length * tr.n);
      let n = 0;
      for (const i of ftiles)
        for (let j = 0; j < tr.n; j++) {
          const x = tileX(i % R.W) + (r() - 0.5) * TS,
            z = tileX(Math.floor(i / R.W)) + (r() - 0.5) * TS;
          if (nearSite(x, z)) continue;
          const hgt = tr.h[0] + r() * (tr.h[1] - tr.h[0]),
            wd = tr.w * (0.7 + r() * 0.6);
          e.set(0, r() * 6.28, 0);
          q.setFromEuler(e);
          sc.set(wd, hgt, wd);
          v.set(x, V.terrain.height(x, z) + hgt / 2 - 0.3, z);
          m.compose(v, q, sc);
          trees.setMatrixAt(n++, m);
        }
      trees.count = n;
      staticGroup.add(trees);
    }
    for (const k in V.S.sites) {
      const st = V.S.sites[k];
      if (st.kind === 'spring') continue;
      const x = tileX(k % R.W),
        z = tileX(Math.floor(k / R.W)),
        g = BUILD[st.kind](V.S);
      g.position.set(x, V.terrain.height(x, z), z);
      if (st.kind !== 'beacon') g.rotation.y = (k % 7) * 0.9;
      staticGroup.add(g);
    }
  }
  function buildDynamic() {
    dispose(dynGroup);
    dynGroup = new THREE.Group();
    scene.add(dynGroup);
    const at = (k, dx, dz) => {
      const x = tileX(k % R.W) + (dx || 0),
        z = tileX(Math.floor(k / R.W)) + (dz || 0);
      return [x, V.terrain.height(x, z), z];
    };
    for (const k in V.S.sites) {
      const st = V.S.sites[k];
      if (st.kind !== 'spring') continue;
      const [x, y, z] = at(+k),
        w = new THREE.Mesh(
          new THREE.CircleGeometry(4.6, 16).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({ color: st.known && st.foul ? 0x6f6a35 : 0x3f8fc0 }),
        );
      w.position.set(x, y + 0.3, z);
      dynGroup.add(w);
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9 + (+k % 5),
          d = 5.5 + (i % 3) * 1.6,
          rx = x + Math.cos(a) * d,
          rz = z + Math.sin(a) * d,
          c = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.4 + (i % 3), 5), std(0x587a40));
        c.position.set(rx, V.terrain.height(rx, rz) + 1.1, rz);
        dynGroup.add(c);
      }
    }
    for (const k in V.S.depots) {
      if (+k === V.S.camp) continue;
      const [x, y, z] = at(+k, 3.5, 2.5);
      dynGroup.add(box(1.2, 1, 1.2, std(0x8a5a2b), x, y + 0.5, z));
    }
    const TINT = { salt: 0x6e4a2a, moor: 0x3a2f2a, taiga: 0x3b4a5c };
    for (const c of V.S.creatures) {
      if (c.bound && !(V.S.combat && V.S.combat.cid === c.id)) continue;
      const sp = R.spOf(V.S, c),
        g = new THREE.Group(),
        col = sp.rare === 'gilded' ? 0xd9a520 : sp.rare === 'docile' ? 0x7fae7a : TINT[V.S.biome],
        mat = std(col),
        k = (sp.rare === 'elder' ? 1.45 : 1) * (0.9 + c.tier * 0.12),
        eye = new THREE.MeshBasicMaterial({ color: 0xff3b2f, fog: false });
      if (sp.form === 'hound')
        g.add(
          box(0.6, 0.7, 1.7, mat, 0, 0.8, 0),
          box(0.5, 0.5, 0.6, mat, 0, 1.15, 1),
          box(0.15, 0.8, 0.15, mat, -0.2, 0.4, 0.6),
          box(0.15, 0.8, 0.15, mat, 0.2, 0.4, 0.6),
          box(0.15, 0.8, 0.15, mat, -0.2, 0.4, -0.6),
          box(0.15, 0.8, 0.15, mat, 0.2, 0.4, -0.6),
          box(0.3, 0.08, 0.05, eye, 0, 1.25, 1.31),
        );
      else if (sp.form === 'brute')
        g.add(
          box(1.8, 1.9, 1.5, mat, 0, 1.8, 0),
          box(0.9, 0.8, 0.9, mat, 0, 3, 0.3),
          box(0.55, 1.7, 0.55, mat, -1.2, 1.5, 0.2),
          box(0.55, 1.7, 0.55, mat, 1.2, 1.5, 0.2),
          box(0.6, 0.9, 0.6, mat, -0.5, 0.45, 0),
          box(0.6, 0.9, 0.6, mat, 0.5, 0.45, 0),
          box(0.5, 0.1, 0.05, eye, 0, 3.1, 0.76),
        );
      else if (sp.form === 'wight') {
        const pale = new THREE.MeshBasicMaterial({ color: 0xcfe9e4, transparent: true, opacity: 0.8, fog: false });
        g.add(
          box(0.5, 1.6, 0.3, pale, 0, 1.5, 0),
          box(0.35, 0.4, 0.35, pale, 0, 2.55, 0),
          box(0.14, 1.3, 0.14, pale, -0.4, 1.6, 0.1),
          box(0.14, 1.3, 0.14, pale, 0.4, 1.6, 0.1),
          box(0.25, 0.06, 0.05, eye, 0, 2.6, 0.19),
        );
      } else {
        for (let i = 0; i < 6; i++)
          g.add(box(0.4 - i * 0.03, 0.3, 0.75, mat, Math.sin(i * 1.1) * 0.45, 0.2 + (i === 0 ? 0.5 : 0), 1.6 - i * 0.7));
        g.add(box(0.25, 0.06, 0.05, eye, Math.sin(0) * 0.45, 0.75, 1.99));
      }
      g.scale.setScalar(k * (sp.form === 'wight' ? 0.85 : 1.1));
      let x, y, z;
      if (V.S.combat && V.S.combat.cid === c.id) {
        x = P.x - Math.sin(P.yaw) * 7.5;
        z = P.z - Math.cos(P.yaw) * 7.5;
        P.pitch = 0;
        y = V.terrain.height(x, z);
        g.rotation.y = P.yaw;
      } else {
        [x, y, z] = at(c.y * R.W + c.x, -4, -5);
        g.rotation.y = Math.atan2(P.x - x, P.z - z);
      }
      g.position.set(x, y, z);
      dynGroup.add(g);
    }
    if (V.S.camp !== null) {
      const [x, y, z] = at(V.S.camp, 5, 3),
        t = new THREE.Mesh(new THREE.ConeGeometry(3, 3.6, 4), std(0xd9a24a));
      t.position.set(x, y + 1.8, z);
      const sm = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.6, 150, 8, 1, true), glow(0xf2f2ee, 0.38));
      sm.material.side = THREE.DoubleSide;
      sm.position.set(x + 3, y + 76, z - 2);
      dynGroup.add(t, sm);
    }
  }
  function resize() {
    const w = window.innerWidth,
      h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* ---------- codex: what you have learned across every run ---------- */
  let codex = {};
  try {
    codex = JSON.parse(localStorage.getItem(CODEX) || '{}') || {};
  } catch (e) {
    codex = {};
  }
  R.on('learned', (s, d) => {
    if (d.axis === 'god') return;
    codex[d.axis + ':' + d.id] = 1;
    try {
      localStorage.setItem(CODEX, JSON.stringify(codex));
    } catch (e) {}
  });
  const codexTotal = R.AXES.reduce((n, a) => n + R.C.civ[a].length, 0);
  /* ---------- run control ---------- */
  function save() {
    try {
      if (!V.S || (V.S.over && (V.S.over.won || R.livesLeft(V.S) <= 0))) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, JSON.stringify(V.S));
    } catch (e) {
      /* storage is optional */
    }
  }
  function load() {
    try {
      const t = localStorage.getItem(KEY);
      if (t) {
        const s = JSON.parse(t);
        if (s && s.v === R.VERSION) return s;
      }
    } catch (e) {}
    return null;
  }
  function placePlayer() {
    P.x = tileX(V.S.player.x) + 6;
    P.z = tileX(V.S.player.y) + 7;
    P.y = V.terrain.height(P.x, P.z) + EYE;
    P.pitch = 0;
    P.walked = 0;
    P.yaw = Math.atan2(-(tileX(V.S.town.x) - P.x), -(tileX(V.S.town.y) - P.z));
    shown.t = V.S.time;
  }
  function enter(state) {
    S = state;
    buildStatic();
    buildDynamic();
    placePlayer();
    lock(false);
    closeModal();
    render.stamp = '';
    render();
    save();
  }
  const randomSeed = () => 10000 + Math.floor(Math.random() * 90000),
    start = (seed) => {
      enter(R.newGame(seed));
      openCreate(false);
    };
  function act(fn) {
    if (!V.S || V.S.over) return;
    fn();
    buildDynamic();
    render();
    save();
    if (V.S.over) showEnd();
  }

  /* ---------- per-frame ---------- */
  const input = { fx: 0, fy: 0, keys: {} },
    shown = { t: 0, far: 600 },
    skyC = new THREE.Color(),
    dayC = new THREE.Color(),
    duskC = new THREE.Color(0xd99a6c),
    nightC = new THREE.Color(0x121827),
    stormC = new THREE.Color(0x8d8f8c);
  const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function tick(dt, now) {
    if (!V.S || V.S.over || !$('modal').hidden) return;
    const k = input.keys;
    let fx = input.fx,
      fy = input.fy;
    if (V.S.combat) {
      fx = fy = 0;
      input.keys.w = input.keys.s = input.keys.a = input.keys.d = input.keys.arrowup = input.keys.arrowdown = false;
    }
    if (k.w || k.arrowup) fy += 1;
    if (k.s || k.arrowdown) fy -= 1;
    if (k.d) fx += 1;
    if (k.a) fx -= 1;
    if (k.arrowleft || k.q) P.yaw += 1.9 * dt;
    if (k.arrowright || k.e) P.yaw -= 1.9 * dt;
    let mag = Math.hypot(fx, fy);
    if (mag < 0.05) return;
    if (mag > 1) {
      fx /= mag;
      fy /= mag;
      mag = 1;
    }
    const sn = Math.sin(P.yaw),
      cs = Math.cos(P.yaw),
      dx = -sn * fy + cs * fx,
      dz = -cs * fy - sn * fx,
      mc = R.moveCost(V.S, V.S.player.x, V.S.player.y),
      sp = VIEW.speed * clamp(mc.base / mc.mins, 0.3, 1.15);
    const nx = clamp(P.x + dx * sp * dt, -HALF + 3, HALF - 3),
      nz = clamp(P.z + dz * sp * dt, -HALF + 3, HALF - 3),
      tx = toTile(nx),
      tz = toTile(nz);
    if (tx !== V.S.player.x || tz !== V.S.player.y) {
      if (now < V.blockedUntil) return;
      const before = V.S.log.length,
        ok = R.move(V.S, tx - V.S.player.x, tz - V.S.player.y);
      if (!ok) {
        blockedUntil = now + 1500;
        render();
        return;
      }
      buildDynamic();
      render();
      save();
      if (V.S.over) {
        showEnd();
        return;
      }
    }
    P.walked += Math.hypot(nx - P.x, nz - P.z);
    P.x = nx;
    P.z = nz;
  }
  const DIRN = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  function frame() {
    shown.t = lerp(shown.t, V.S.time, 0.06);
    const h = ((360 + shown.t) / 60) % 24,
      b = R.biomeOf(V.S),
      day = smooth(clamp((h - 5) / 2, 0, 1)) * (1 - smooth(clamp((h - 18.5) / 2, 0, 1))),
      dusk = Math.max(0, 1 - Math.abs(h - 6) / 1.3, 1 - Math.abs(h - 19.4) / 1.5);
    dayC.setHex(SKY[b.id]);
    skyC
      .copy(nightC)
      .lerp(dayC, day)
      .lerp(duskC, dusk * 0.55);
    const storm = V.S.weather.storm;
    if (storm) skyC.lerp(stormC, 0.6).multiplyScalar(0.5 + 0.5 * day);
    scene.background.copy(skyC);
    scene.fog.color.copy(skyC);
    const sight = R.stat(V.S, 'nightSight', 0) > 0,
      far = storm ? 85 : lerp(sight ? 260 : 110, 620, day);
    shown.far = lerp(shown.far, far, 0.05);
    scene.fog.far = shown.far;
    scene.fog.near = Math.min(40, shown.far * 0.2);
    hemi.intensity = lerp(0.22, 0.78, day);
    sun.intensity = lerp(0.03, 0.9, day) * (storm ? 0.4 : 1);
    const sa = ((h - 6) / 14) * Math.PI;
    sun.position.set(-Math.cos(sa) * 300, Math.max(20, Math.sin(sa) * 300), 120);
    lamp.intensity = sight && day < 0.5 ? 1.4 * (1 - day * 2) : 0;
    lamp.position.set(P.x, P.y + 0.3, P.z);
    const target = V.terrain.height(P.x, P.z) + EYE + (still ? 0 : Math.sin(P.walked * 1.7) * 0.05);
    P.y = lerp(P.y, target, 0.35);
    camera.position.set(P.x, P.y, P.z);
    camera.rotation.set(P.pitch, P.yaw, 0);
    const deg = ((((-P.yaw * 180) / Math.PI) % 360) + 360) % 360;
    $('facing').textContent = 'Facing ' + DIRN[Math.round(deg / 45) % 8];
    renderer.render(scene, camera);
  }
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (V.S) {
      tick(dt, now);
      frame();
    }
    requestAnimationFrame(loop);
  }

  /* ---------- HUD and panels ---------- */
  function meter(id, v, max, txt) {
    $(id + '-bar').style.width = clamp((v / max) * 100, 0, 100) + '%';
    $(id + '-val').textContent = txt;
    $(id).classList.toggle('low', v / max <= 0.25);
  }
  function render() {
    if (!V.S) return;
    const c = R.clock(V.S),
      p = V.S.player,
      cap = R.waterCap(V.S),
      wt = R.weight(V.S),
      cc = R.carryCap(V.S),
      fc = R.forecast(V.S);
    $('when').textContent = 'Day ' + c.day + ', ' + String(c.hour).padStart(2, '0') + ':' + String(c.min).padStart(2, '0');
    $('sky').textContent = fc;
    $('sky').className = 'chip' + (V.S.weather.storm ? ' bad' : fc === 'Storm close' ? ' warn' : '');
    const ob = R.objective(V.S);
    let b = 'Goal: ' + ob.text + (ob.dir ? (ob.dir === 'here' ? ' (here)' : ', ' + ob.dir) : '');
    const wf = R.wellfinder(V.S);
    if (wf) b += ' · Spring ' + wf;
    const sb = R.shrineBearing(V.S);
    if (sb) b += ' · Shrine ' + sb;
    $('bearing').textContent = b;
    meter('m-hp', p.hp, p.hpMax, Math.ceil(p.hp) + '/' + p.hpMax);
    $('m-mana').style.visibility = p.manaMax ? 'visible' : 'hidden';
    meter('m-mana', p.mana, Math.max(1, p.manaMax), Math.floor(p.mana) + '/' + p.manaMax);
    $('lvl').textContent = 'Level ' + p.level + ' · ' + p.xp + '/' + R.xpFor(p.level) + ' xp';
    const fo = R.foe(V.S),
      fc2 = $('fight');
    fc2.hidden = !fo;
    if (fo) {
      $('foe-name').textContent = R.spOf(V.S, fo).name;
      $('foe-bar').style.width = clamp((fo.hp / fo.hpMax) * 100, 0, 100) + '%';
      $('foe-val').textContent = fo.hp + '/' + fo.hpMax;
      const fl = $('foe-log');
      fl.textContent = '';
      V.S.combat.lines.slice(-3).forEach((l) => fl.appendChild(el('li', { text: l })));
    }
    meter('m-water', p.water, Math.max(cap, 1), f1(p.water) + '/' + f1(cap));
    meter('m-warm', p.warmth, 100, Math.round(p.warmth));
    meter('m-stam', p.stamina, 100, Math.round(p.stamina));
    $('load').textContent = 'Load ' + f1(wt) + '/' + f1(cc) + (wt > cc ? ' too heavy' : wt / cc > 0.5 ? ' slow' : '');
    $('load').classList.toggle('bad', wt > cc);
    $('fuel').textContent = 'Fuel ' + f1(p.fuel) + ' · Armor ' + R.playerAC(V.S) + ' · Coin ' + p.coin;
    const st = R.siteHere(V.S);
    $('place').textContent =
      (st ? 'At a ' + R.siteName(V.S, st) : ((n) => n.charAt(0).toUpperCase() + n.slice(1))(R.groundHere(V.S).name)) +
      (R.atCamp(V.S) ? ' (camp)' : '');
    const box = $('actions');
    box.textContent = '';
    R.actions(V.S).forEach((a) =>
      box.appendChild(
        el(
          'button',
          {
            cls: 'act',
            type: 'button',
            on: () => (a.id === 'pactAsk' ? openPact() : a.id === 'townAsk' ? openTown() : act(() => R[a.id](V.S))),
          },
          [el('span', { text: a.label }), el('small', { text: a.hint })],
        ),
      ),
    );
    $('btn-pack').classList.toggle('has', !!R.depotHere(V.S));
    $('btn-pack').textContent = R.depotHere(V.S) ? 'Pack +' : 'Pack';
    const lg = $('log'),
      newest = V.S.log[V.S.log.length - 1],
      stamp = newest ? V.S.seed + ':' + newest.t + ':' + newest.msg : '';
    if (stamp !== render.stamp) {
      render.stamp = stamp;
      lg.textContent = '';
      if (newest) {
        lg.appendChild(el('li', { cls: (newest.tone || '') + ' new', text: newest.msg }));
        clearTimeout(render.timer);
        render.timer = setTimeout(
          () => {
            lg.textContent = '';
          },
          newest.tone === 'bad' ? 9000 : 6000,
        );
      }
    }
  }
  function openModal(title, body) {
    $('modal-title').textContent = title;
    const b = $('modal-body');
    b.textContent = '';
    body.forEach((n) => n && b.appendChild(n));
    $('modal').hidden = false;
    input.fx = input.fy = 0;
    input.keys = {};
  }
  function closeModal() {
    $('modal').hidden = true;
  }
  let locked = false;
  function lock(b) {
    locked = b;
    $('modal-close').hidden = b;
  }
  function openCreate(next) {
    let ch = R.makeChar(Math.random, V.S);
    const paint = () => {
      const race = R.byId(R.C.races, ch.race),
        cls = R.byId(R.C.classes, ch.cls),
        adj = Object.keys(race.adj)
          .map((k) => (race.adj[k] > 0 ? '+' : '') + race.adj[k] + ' ' + k.toUpperCase())
          .join(', ');
      const pick = (ids, key, all) =>
        el(
          'div',
          { cls: 'row' },
          ids.map((id) =>
            btn(
              R.byId(all, id).name,
              () => {
                ch[key] = id;
                if (key === 'race') ch.name = R.nameFor(Math.random, id);
                paint();
              },
              'small' + (id === ch[key] ? ' sel' : ''),
            ),
          ),
        );
      openModal(next ? 'The next traveller' : 'A traveller sets out', [
        el('p', {
          cls: 'note',
          text:
            'Traveller ' +
            (V.S.travellers + (next ? 1 : 0)) +
            ' of the ' +
            V.S.tun.lives +
            ' this world can send. Only some peoples and callings are found in any one world.',
        }),
        el('div', { cls: 'row' }, [
          el('strong', { text: ch.name }),
          btn('Another name', () => {
            ch.name = R.nameFor(Math.random, ch.race);
            paint();
          }),
        ]),
        el('h3', { text: 'Race' }),
        pick(V.S.offer.races, 'race', R.C.races),
        el('p', { cls: 'note', text: race.text + ' ' + adj + '.' }),
        el('h3', { text: 'Class' }),
        pick(V.S.offer.classes, 'cls', R.C.classes),
        el('p', { cls: 'note', text: cls.text + ' Hit die d' + cls.hd + '. In a fight: ' + cls.fight }),
        el('h3', { text: 'Abilities' }),
        el(
          'ul',
          { cls: 'items scores' },
          R.charSheet(ch).map((a) =>
            el('li', { cls: 'item' }, [
              el('div', null, [el('strong', { text: a.name + ' ' + a.score }), el('p', { text: a.text })]),
            ]),
          ),
        ),
        el('div', { cls: 'row' }, [
          btn('Roll again', () => {
            ch.abil = R.rollAbilities(Math.random);
            paint();
          }),
          btn(
            'Begin',
            () => {
              lock(false);
              closeModal();
              if (next) R.nextTraveller(V.S, ch);
              else R.setCharacter(V.S, ch);
              placePlayer();
              buildDynamic();
              render.stamp = '';
              render();
              save();
            },
            'primary',
          ),
        ]),
      ]);
      lock(true);
    };
    paint();
  }
  const btn = (label, fn, cls) => el('button', { type: 'button', cls: cls || 'small', on: fn, text: label });
  function itemRow(it, side) {
    const b = R.byId(R.C.bases, it.base),
      acts = [];
    if (side === 'me') {
      if (R.slotOf(it))
        acts.push(
          it.eq
            ? btn('Take off', () => {
                act(() => R.unequip(V.S, it.id));
                openPack();
              })
            : btn(
                'Wear',
                () => {
                  act(() => R.equip(V.S, it.id));
                  openPack();
                },
                'small sel',
              ),
        );
      if (!it.known && V.S.char.cls === 'wizard' && !V.S.combat)
        acts.push(
          btn('Identify, 2 mana', () => {
            act(() => R.identify(V.S, it.id));
            openPack();
          }),
        );
      if (b.consumable)
        acts.push(
          btn('Drink', () => {
            act(() => R.useItem(V.S, it.id));
            if (!V.S.over) openPack();
          }),
        );
      if (!it.known && R.atCamp(V.S))
        acts.push(
          btn('Study ' + f1(2 * R.stat(V.S, 'studyTime', 1)) + ' h', () => {
            act(() => R.study(V.S, it.id));
            if (!V.S.over) openPack();
          }),
        );
      acts.push(
        btn('Leave', () => {
          act(() => R.leaveItem(V.S, it.id));
          openPack();
        }),
      );
    } else
      acts.push(
        btn('Take', () => {
          act(() => R.takeItem(V.S, it.id));
          openPack();
        }),
      );
    return el('li', { cls: 'item' + (it.known && R.isCursed(it) ? ' cursed' : '') }, [
      el('div', null, [
        el('strong', { text: R.itemName(it) }),
        el('span', {
          cls: 'wt',
          text:
            f1(R.itemWeight(V.S, it)) + ' wt' + (side === 'me' && R.slotOf(it) ? (it.eq ? ' · worn' : ' · packed, no effect') : ''),
        }),
        el('p', { text: R.describeItem(V.S, it) }),
      ]),
      el('div', { cls: 'row' }, acts),
    ]);
  }
  function resRow(kind, label) {
    const d = R.depotHere(V.S);
    return el('li', { cls: 'item' }, [
      el('div', null, [
        el('strong', { text: label }),
        el('p', {
          text:
            'Carrying ' +
            f1(V.S.player[kind]) +
            (kind === 'water' ? ' of ' + f1(R.waterCap(V.S)) : '') +
            ' · stored here ' +
            f1(d ? d[kind] : 0),
        }),
      ]),
      el('div', { cls: 'row' }, [
        btn('Leave 1', () => {
          act(() => R.transfer(V.S, kind, 1));
          openPack();
        }),
        btn('Take 1', () => {
          act(() => R.transfer(V.S, kind, -1));
          openPack();
        }),
        btn('Take all', () => {
          act(() => R.transfer(V.S, kind, -99));
          openPack();
        }),
      ]),
    ]);
  }
  function openPack() {
    const d = R.depotHere(V.S);
    openModal('Pack', [
      el('p', {
        cls: 'note',
        text:
          'Load ' +
          f1(R.weight(V.S)) +
          ' of ' +
          f1(R.carryCap(V.S)) +
          '. Past half, you walk slower and tire faster. Anything you leave stays at this spot as a depot. Gear only works while worn: one weapon, armor, cloak, boots and pack, and two tools.',
      }),
      el('h3', { text: 'Stored at this spot' }),
      d && d.items.length
        ? el(
            'ul',
            { cls: 'items' },
            d.items.map((it) => itemRow(it, 'here')),
          )
        : el('p', { cls: 'note', text: 'No gear here.' }),
      el('ul', { cls: 'items' }, [resRow('water', 'Water (1 wt each)'), resRow('fuel', 'Fuel (0.5 wt each)')]),
      el('h3', { text: 'Carrying' }),
      V.S.player.items.length
        ? el(
            'ul',
            { cls: 'items' },
            V.S.player.items.map((it) => itemRow(it, 'me')),
          )
        : el('p', { cls: 'note', text: 'Nothing.' }),
    ]);
  }
  function openPact() {
    const g = R.godOf(V.S);
    openModal('The shrine of ' + g.name, [
      el('p', { text: g.terms }),
      el('p', { cls: 'note', text: 'A pact lasts until you die. It cannot be undone.' }),
      el('div', { cls: 'row' }, [
        btn(
          'Swear the pact',
          () => {
            closeModal();
            act(() => R.pact(V.S));
          },
          'primary',
        ),
        btn('Walk away', closeModal),
      ]),
    ]);
  }
  function openTown() {
    const t = V.S.town,
      p = V.S.player,
      T = R.C.town,
      race = R.byId(R.C.races, t.race).name.toLowerCase(),
      re = (fn) => () => {
        act(fn);
        if (!V.S.over) openTown();
      };
    const stock = t.stock.map((it) =>
      el('li', { cls: 'item' }, [
        el('div', null, [
          el('strong', { text: R.itemName(it) }),
          el('span', { cls: 'wt', text: f1(R.itemWeight(V.S, it)) + ' wt' }),
          el('p', { text: R.describeItem(V.S, it) }),
        ]),
        el('div', { cls: 'row' }, [
          btn(
            'Buy, ' + R.itemValue(it),
            re(() => R.buy(V.S, it.id)),
            'small' + (p.coin >= R.itemValue(it) ? ' sel' : ''),
          ),
        ]),
      ]),
    );
    const mine = p.items
      .filter((it) => R.sellPrice(it) > 0)
      .map((it) =>
        el('li', { cls: 'item' }, [
          el('div', null, [el('strong', { text: R.itemName(it) }), el('span', { cls: 'wt', text: it.eq ? 'worn' : '' })]),
          el('div', { cls: 'row' }, [
            it.known
              ? null
              : btn(
                  'Appraise, ' + T.appraisePrice,
                  re(() => R.appraise(V.S, it.id)),
                ),
            btn(
              'Sell, ' + R.sellPrice(it),
              re(() => R.sell(V.S, it.id)),
            ),
          ]),
        ]),
      );
    openModal('The town of ' + t.name, [
      el('p', { cls: 'note', text: 'A ' + race + ' town with a well. You have ' + p.coin + ' coin.' }),
      el('h3', { text: t.elder + ', the elder' }),
      ...(t.speech.length
        ? t.speech.map((l) => el('p', { text: l }))
        : [el('p', { cls: 'note', text: 'An old ' + race + ' watches you from a bench by the well.' })]),
      el('div', { cls: 'row' }, [
        btn(
          V.S.quest.told ? 'Ask again' : 'Talk to the elder',
          re(() => R.talkElder(V.S)),
          V.S.quest.told ? 'small' : 'primary',
        ),
      ]),
      el('h3', { text: 'The inn' }),
      el('div', { cls: 'row' }, [
        btn(
          'A bed for the night, ' + T.innPrice + ' coin',
          re(() => R.inn(V.S)),
        ),
        el('span', { cls: 'note', text: 'Eight hours. Restores everything.' }),
      ]),
      el('h3', { text: t.merchant + ', the merchant' }),
      el('div', { cls: 'row' }, [
        btn(
          'Fuel, ' + T.fuelPrice + ' coin each (' + t.fuel + ' left)',
          re(() => R.buyFuel(V.S)),
        ),
      ]),
      el('ul', { cls: 'items' }, stock),
      el('h3', { text: 'Your goods' }),
      mine.length ? el('ul', { cls: 'items' }, mine) : el('p', { cls: 'note', text: 'Nothing they would buy.' }),
    ]);
  }
  function showEnd() {
    const c = R.clock(V.S),
      won = V.S.over.won,
      left = R.livesLeft(V.S),
      who = R.charTitle(V.S.char),
      dist = 'with this still undone: ' + R.objective(V.S).text.toLowerCase();
    const world = el('p', {
      cls: 'note',
      text:
        'This world: ' +
        R.biomeOf(V.S).name +
        ', shrine of ' +
        R.godOf(V.S).name +
        '. Its people were ' +
        R.civOf(V.S).name +
        '. Seed ' +
        V.S.seed +
        '.',
    });
    if (won)
      openModal('The ' + V.S.quest.relic + ' is home', [
        el('p', {
          text:
            who + ' carried it to the ' + V.S.quest.dest + ' on day ' + c.day + ', traveller ' + V.S.travellers + ' of this world.',
        }),
        world,
        el('div', { cls: 'row' }, [
          btn('New world', () => start(randomSeed()), 'primary'),
          btn('Same world again', () => start(V.S.seed)),
        ]),
      ]);
    else if (left > 0)
      openModal(V.S.over.cause === 'slain' ? 'Slain by a ' + V.S.over.by : V.S.over.cause === 'thirst' ? 'Dead of thirst' : 'Frozen', [
        el('p', { text: who + ' died on day ' + c.day + ', ' + dist + '.' }),
        el('p', {
          text:
            'The world goes on. What was learned of ' +
            (V.S.known.civ ? R.civOf(V.S).name : 'its people') +
            ' is now common knowledge, camp and depots stay where they are, and the body lies with its goods, its purse and its map. ' +
            left +
            ' more ' +
            (left === 1 ? 'traveller' : 'travellers') +
            ' can be sent.',
        }),
        el('div', { cls: 'row' }, [
          btn('Send another traveller', () => openCreate(true), 'primary'),
          btn('Abandon this world', () => start(randomSeed())),
        ]),
      ]);
    else
      openModal('The beacon goes dark', [
        el('p', { text: who + ' died on day ' + c.day + ', ' + dist + '. No one is left to send, and this world is lost.' }),
        world,
        el('div', { cls: 'row' }, [btn('New world', () => start(randomSeed()), 'primary')]),
      ]);
    lock(true);
  }
  const MAPC = {
    spring: '#2f7fb5',
    cave: '#3b332c',
    ruin: '#7b4a8c',
    cache: '#8a6a1f',
    shrine: '#b8443c',
    well: '#2f7fb5',
    beacon: '#d98a1c',
    town: '#f2e2a0',
    vault: '#15171c',
  };
  function openMap() {
    const cv = el('canvas', { id: 'mapcv', 'aria-label': 'Your map so far' });
    openModal('Map', [
      cv,
      el('p', {
        cls: 'note',
        text: 'Only what you have seen or surveyed. White dot: you. Gold: camp. Blue: water. Grey: paved road. Purple: ruin. Dark: cave. Red: shrine. Orange: beacon. Pale yellow: town. Black square: the locked place. Black dot: depot. Red dot: a creature you can currently see.',
      }),
    ]);
    const css = cv.clientWidth,
      dpr = window.devicePixelRatio || 1;
    cv.width = cv.height = Math.round(css * dpr);
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ts = css / R.W,
      cols = R.biomeOf(V.S).colors;
    g.fillStyle = '#10151d';
    g.fillRect(0, 0, css, css);
    for (let y = 0; y < R.H; y++)
      for (let x = 0; x < R.W; x++) {
        const i = y * R.W + x;
        if (!V.S.seen[i]) continue;
        g.fillStyle = cols[V.S.terrain[i]];
        g.fillRect(x * ts, y * ts, ts + 0.5, ts + 0.5);
        if (V.S.road[i]) {
          g.fillStyle = '#8c8a86';
          g.fillRect((x + 0.25) * ts, (y + 0.25) * ts, ts * 0.5, ts * 0.5);
        }
        const st = V.S.sites[i];
        if (st) {
          g.fillStyle = st.kind === 'spring' && st.known && st.foul ? '#6f6a35' : MAPC[st.kind];
          g.fillRect(x * ts - 1, y * ts - 1, ts + 2, ts + 2);
        }
        if (V.S.depots[i] && i !== V.S.camp) {
          g.fillStyle = '#000';
          g.beginPath();
          g.arc((x + 0.5) * ts, (y + 0.5) * ts, ts * 0.3, 0, 7);
          g.fill();
        }
      }
    if (V.S.camp !== null) {
      const x = V.S.camp % R.W,
        y = Math.floor(V.S.camp / R.W);
      g.fillStyle = '#e0a84a';
      g.strokeStyle = '#1a1205';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo((x + 0.5) * ts - 6, (y + 1) * ts + 2);
      g.lineTo((x + 0.5) * ts, y * ts - 6);
      g.lineTo((x + 0.5) * ts + 6, (y + 1) * ts + 2);
      g.closePath();
      g.fill();
      g.stroke();
    }
    for (const c of V.S.creatures)
      if (c.seen && Math.max(Math.abs(c.x - V.S.player.x), Math.abs(c.y - V.S.player.y)) <= 4) {
        g.fillStyle = '#e0302a';
        g.beginPath();
        g.arc((c.x + 0.5) * ts, (c.y + 0.5) * ts, 4, 0, 7);
        g.fill();
      }
    const px = ((P.x + HALF) / TS) * ts,
      py = ((P.z + HALF) / TS) * ts;
    g.beginPath();
    g.arc(px, py, 4.5, 0, 7);
    g.fillStyle = '#fff';
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = '#141a22';
    g.stroke();
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(px - Math.sin(P.yaw) * 12, py - Math.cos(P.yaw) * 12);
    g.strokeStyle = '#fff';
    g.stroke();
  }
  function openMenu() {
    const sw = el(
      'ul',
      { cls: 'items' },
      R.SWITCHES.map(([id, label]) => {
        const cb = el('input', { type: 'checkbox', id: 'sw-' + id });
        cb.checked = !V.S.off[id];
        cb.addEventListener('change', () => {
          V.S.off[id] = !cb.checked;
          render();
          save();
        });
        return el('li', { cls: 'item' }, [el('label', { for: 'sw-' + id, text: label }), cb]);
      }),
    );
    const tune = (obj, key, label, min, max, step) => {
      const out = el('span', { cls: 'wt', text: String(obj[key]) }),
        r = el('input', { type: 'range', id: 'tn-' + key, min, max, step, value: obj[key] });
      r.addEventListener('input', () => {
        obj[key] = parseFloat(r.value);
        out.textContent = r.value;
        render();
        save();
      });
      return el('li', { cls: 'item tune' }, [el('label', { for: 'tn-' + key, text: label }), out, r]);
    };
    const seedIn = el('input', { type: 'number', id: 'seed-in', value: V.S.seed, inputmode: 'numeric' });
    openModal('Menu', [
      el('h3', { text: 'How to play' }),
      el('p', {
        text: 'Your goal is on the top panel, with a direction when you know one. It begins with finding the town, whose smoke you can see from far off. Phone: left thumb walks, right thumb looks. Computer: W A S D to walk, drag the view or use Q and E to turn.',
      }),
      el('p', {
        text: 'Time only passes when you walk or act, so stop whenever you want to think. Creatures are rare and usually visible before they reach you; a fight is turn by turn, and fleeing is often the right call. Water drains as you travel. Cold drains warmth at night and in storms. Stamina keeps you alive when either runs out.',
      }),
      el('p', {
        text: 'You cannot carry enough water to cross in one go. Look for green ground and blue pools, search ruins and caves, leave water and fuel as depots from the Pack screen, and move your camp forward to a cave or ruin.',
      }),
      el('p', {
        text: 'The ground matters. Each land has its own woods, watercourses and odd terrain: some shelter you, some give water or fuel, some are fast and some are punishing. The line under the meters says what you are standing on.',
      }),
      el('h3', { text: 'Goal' }),
      el('p', {
        text:
          ((o) => o.text + (o.dir && o.dir !== 'here' ? ', to the ' + o.dir : '') + '.')(R.objective(V.S)) +
          (V.S.quest.told
            ? ' ' +
              V.S.town.elder +
              ' of ' +
              V.S.town.name +
              ' told you: the ' +
              V.S.quest.relic +
              ' lies in the ' +
              V.S.quest.vault.name +
              ' and belongs at the ' +
              V.S.quest.dest +
              '.'
            : ' The town will know what this land needs.'),
      }),
      el('h3', { text: 'Traveller' }),
      el('p', {
        text:
          R.charTitle(V.S.char) +
          ', traveller ' +
          V.S.travellers +
          ' of ' +
          V.S.tun.lives +
          '. ' +
          R.byId(R.C.races, V.S.char.race).text +
          ' ' +
          R.byId(R.C.classes, V.S.char.cls).text,
      }),
      el('p', {
        cls: 'note',
        text:
          'Level ' +
          V.S.player.level +
          ', ' +
          V.S.player.xp +
          ' of ' +
          R.xpFor(V.S.player.level) +
          ' experience. Experience comes from finding places, searching them, learning about the lost people, and winning fights. In a fight: ' +
          R.byId(R.C.classes, V.S.char.cls).fight,
      }),
      el(
        'ul',
        { cls: 'items scores' },
        R.charSheet(V.S.char).map((a) =>
          el('li', { cls: 'item' }, [
            el('div', null, [el('strong', { text: a.name + ' ' + a.score }), el('p', { text: a.text })]),
          ]),
        ),
      ),
      el('h3', { text: 'Creatures met' }),
      el('p', {
        cls: 'note',
        text:
          V.S.species
            .filter((x) => x.met)
            .map(
              (x) => x.name + ': ' + R.byId(R.C.creature.forms, x.form).text + ' ' + R.byId(R.C.creature.tempers, x.temper).text,
            )
            .join(' ') || 'None yet. They are few, and you will usually see one before it reaches you.',
      }),
      el('h3', { text: 'This world' }),
      el('p', {
        text:
          R.biomeOf(V.S).name +
          '. ' +
          (V.S.known.god ? 'Shrine of ' + R.godOf(V.S).name + '.' : 'A god is worshipped somewhere here.') +
          ' Seed ' +
          V.S.seed +
          '.',
      }),
      el('p', {
        text: V.S.known.civ
          ? 'The people who lived here were ' + R.civOf(V.S).name + '. Each ruin you search teaches you more about them.'
          : 'A people lived here once. Search a ruin to learn who they were.',
      }),
      el(
        'ul',
        { cls: 'items' },
        R.civTraits(V.S).map((tr) =>
          el('li', { cls: 'item' }, [
            el('div', null, [
              el('strong', {
                text: tr.known
                  ? tr.label
                  : {
                      habit: 'What they built',
                      age: 'How long ago',
                      style: 'Who they were',
                      affinity: 'Their sign',
                      doom: 'How they ended',
                    }[tr.axis] + ': unknown',
              }),
              tr.known ? el('p', { text: tr.text }) : null,
            ]),
          ]),
        ),
      ),
      el('h3', { text: 'Codex' }),
      el('p', {
        cls: 'note',
        text: Object.keys(codex).length + ' of ' + codexTotal + ' traits of lost peoples understood, across all your runs.',
      }),
      el(
        'ul',
        { cls: 'items journal' },
        Object.keys(codex)
          .sort()
          .map((k) => {
            const [ax, id] = k.split(':'),
              tx = R.traitText(ax, id);
            return el('li', { text: tx.label + ': ' + tx.text });
          }),
      ),
      el('div', { cls: 'row' }, [
        btn('New world', () => start(randomSeed()), 'primary'),
        seedIn,
        btn('Play this seed', () => start(parseInt(seedIn.value, 10) || 1)),
      ]),
      el('h3', { text: 'Journal' }),
      el(
        'ul',
        { cls: 'items journal' },
        V.S.log
          .slice(-12)
          .reverse()
          .map((l) => el('li', { cls: l.tone || '', text: l.msg })),
      ),
      el('h3', { text: 'Tinker' }),
      el('p', { cls: 'note', text: 'Switch whole systems off, or change the numbers while you play.' }),
      sw,
      el('ul', { cls: 'items' }, [
        tune(VIEW, 'speed', 'Walking speed (m/s)', 3, 16, 0.5),
        tune(V.S.tun, 'waterPerHour', 'Water used per hour', 0.2, 2, 0.1),
        tune(V.S.tun, 'coldScale', 'Cold strength', 0, 2, 0.1),
        tune(V.S.tun, 'staminaScale', 'Effort per step', 0.2, 2, 0.1),
        tune(V.S.tun, 'stormGap', 'Time between storms', 0.2, 3, 0.1),
        tune(V.S.tun, 'carryCap', 'Carry limit', 8, 40, 1),
        tune(V.S.tun, 'lives', 'Travellers per world', 1, 9, 1),
      ]),
      el('div', { cls: 'row' }, [
        btn('Reveal the whole map', () => {
          R.reveal(V.S, 18, 18, 60, true);
          save();
          openMap();
        }),
      ]),
    ]);
  }

  /* ---------- input ---------- */
  const cv = $('c'),
    look = (mx, my, k) => {
      P.yaw -= mx * k;
      P.pitch = clamp(P.pitch - my * k, -1.2, 1.2);
    };
  document.addEventListener('keydown', (e) => {
    if (!$('modal').hidden) {
      if (e.key === 'Escape' && !V.locked) closeModal();
      return;
    }
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      input.keys[k] = true;
      e.preventDefault();
    }
  });
  document.addEventListener('keyup', (e) => {
    input.keys[e.key.toLowerCase()] = false;
  });
  window.addEventListener('blur', () => {
    input.keys = {};
  });
  let dragging = false,
    lx = 0,
    ly = 0;
  cv.addEventListener('mousedown', (e) => {
    dragging = true;
    lx = e.clientX;
    ly = e.clientY;
  });
  window.addEventListener('mouseup', () => {
    dragging = false;
  });
  window.addEventListener('mousemove', (e) => {
    if (dragging) {
      look(e.clientX - lx, e.clientY - ly, 0.005);
      lx = e.clientX;
      ly = e.clientY;
    }
  });
  let moveId = null,
    lookId = null,
    ox = 0,
    oy = 0,
    tlx = 0,
    tly = 0;
  const stick = $('stick'),
    knob = $('knob');
  cv.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.clientX < window.innerWidth * 0.45 && moveId === null) {
          moveId = t.identifier;
          ox = t.clientX;
          oy = t.clientY;
          stick.style.display = 'block';
          stick.style.left = ox + 'px';
          stick.style.top = oy + 'px';
          knob.style.transform = '';
        } else if (lookId === null) {
          lookId = t.identifier;
          tlx = t.clientX;
          tly = t.clientY;
        }
      }
    },
    { passive: false },
  );
  cv.addEventListener(
    'touchmove',
    (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === moveId) {
          let dx = t.clientX - ox,
            dy = t.clientY - oy;
          const d = Math.hypot(dx, dy),
            RR = 50;
          if (d > RR) {
            dx *= RR / d;
            dy *= RR / d;
          }
          input.fx = dx / RR;
          input.fy = -dy / RR;
          knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        } else if (t.identifier === lookId) {
          look(t.clientX - tlx, t.clientY - tly, 0.006);
          tlx = t.clientX;
          tly = t.clientY;
        }
      }
    },
    { passive: false },
  );
  const endTouch = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === moveId) {
        moveId = null;
        input.fx = input.fy = 0;
        stick.style.display = 'none';
      }
      if (t.identifier === lookId) lookId = null;
    }
  };
  cv.addEventListener('touchend', endTouch);
  cv.addEventListener('touchcancel', endTouch);
  $('btn-pack').addEventListener('click', () => V.S && !V.S.over && openPack());
  $('btn-map').addEventListener('click', () => V.S && openMap());
  $('btn-menu').addEventListener('click', () => V.S && openMenu());
  $('modal-close').addEventListener('click', () => {
    if (!V.locked) closeModal();
  });
  window.addEventListener('resize', resize);
  resize();
  const saved = load();
  if (saved) {
    enter(saved);
    if (V.S.over) showEnd();
  } else start(randomSeed());
  window.__g = {
    get S() {
      return V.S;
    },
    P,
    VIEW,
    input,
  };
  requestAnimationFrame(loop);
})();
