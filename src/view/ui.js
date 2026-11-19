/* HUD, panels and screens, input and start-up. */
import { $, G, P, R, V, VIEW, clamp, el, f1 } from './ctx.js';
import { act, codex, codexTotal, enter, input, load, loop, placePlayer, randomSeed, save, start, sync } from './run.js';
import { box, buildDynamic, buildStatic, renderer, resize, scene } from './scene.js';

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
    fc = R.isDark(V.S) ? 'Underground' : R.indoors(V.S) ? R.forecast(V.S) + ' outside the walls' : R.forecast(V.S);
  $('when').textContent = 'Day ' + c.day + ', ' + String(c.hour).padStart(2, '0') + ':' + String(c.min).padStart(2, '0');
  $('sky').textContent = fc;
  $('sky').className = 'chip' + (R.indoors(V.S) ? '' : V.S.weather.storm ? ' bad' : fc === 'Storm close' ? ' warn' : '');
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
    (st ? 'At ' + R.aOrAn(R.siteName(V.S, st)) : ((n) => n.charAt(0).toUpperCase() + n.slice(1))(R.groundHere(V.S).name)) +
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
          on: () => (a.id === 'pactAsk' ? openPact() : a.id === 'townAsk' ? openTown(a.section) : act(() => R[a.id](V.S))),
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
function lock(b) {
  V.locked = b;
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
              if (key === 'race') ch.name = R.nameFor(Math.random, id, V.S);
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
          ch.name = R.nameFor(Math.random, ch.race, V.S);
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
            buildStatic();
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
// The town's people, one at a time: section is 'elder', 'inn' or 'shop', matching where you are standing.
function openTown(section) {
  if (section === 'elder' && !V.S.quest.told) act(() => R.talkElder(V.S));
  const t = V.S.town,
    p = V.S.player,
    T = R.C.town,
    race = R.byId(R.C.races, t.race).name.toLowerCase(),
    re = (fn) => () => {
      act(fn);
      if (!V.S.over) openTown(section);
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
  const coin = el('p', { cls: 'note', text: 'You have ' + p.coin + ' coin.' });
  if (section === 'elder')
    openModal(t.elder + ', elder of ' + t.name, [
      ...(t.speech.length
        ? t.speech.map((l) => el('p', { text: l }))
        : [el('p', { cls: 'note', text: 'An old ' + race + ' looks up from a table covered in maps.' })]),
      el('div', { cls: 'row' }, [
        btn(
          V.S.quest.told ? 'Ask what to do now' : 'Talk',
          re(() => R.talkElder(V.S)),
          'small',
        ),
      ]),
    ]);
  else if (section === 'inn')
    openModal('The inn', [
      el('p', { text: 'A fire, a long table, and rooms upstairs.' }),
      coin,
      el('div', { cls: 'row' }, [
        btn(
          'A bed for the night, ' + T.innPrice + ' coin',
          re(() => R.inn(V.S)),
          'primary',
        ),
        el('span', { cls: 'note', text: 'Eight hours. Restores everything.' }),
      ]),
    ]);
  else
    openModal(t.merchant + "'s shop", [
      coin,
      el('div', { cls: 'row' }, [
        btn(
          'Fuel, ' + T.fuelPrice + ' coin each (' + t.fuel + ' left)',
          re(() => R.buyFuel(V.S)),
        ),
      ]),
      el('h3', { text: 'For sale' }),
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
    openModal(
      V.S.over.cause === 'slain' ? 'Slain by ' + R.aOrAn(V.S.over.by) : V.S.over.cause === 'thirst' ? 'Dead of thirst' : 'Frozen',
      [
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
      ],
    );
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
  exit: '#e0a84a',
  stairsUp: '#e0a84a',
  stairsDown: '#e0a84a',
  elder: '#b8443c',
  inn: '#8a6a1f',
  shop: '#2f7fb5',
  trap: '#e0302a',
};
const INDOOR_COLS = { 6: '#3a3631', 7: '#9a948a' };
function openMap() {
  const cv = el('canvas', { id: 'mapcv', 'aria-label': 'Your map so far' }),
    rec = R.areaRec(V.S),
    indoor = R.indoors(V.S);
  openModal(
    indoor
      ? rec.kind === 'town'
        ? V.S.town.name
        : 'The ' + V.S.quest.vault.name + ', level ' + rec.level + ' of ' + rec.levels
      : 'Map',
    [
      cv,
      el('p', {
        cls: 'note',
        text: indoor
          ? rec.kind === 'town'
            ? "White dot: you. Red: the elder's hall. Brown: the inn. Blue: the shop. Gold: the gate."
            : 'Only what your light has shown you. White dot: you. Gold: stairs and the way out. Black dot: something left lying. Red: a trap. Red dot: a creature you can see.'
          : 'This region. Only what you have seen or surveyed. White dot: you. Gold: camp. Blue: water. Grey: paved road. Purple: ruin. Dark: cave. Red: shrine. Orange: beacon. Pale yellow: town. Black square: the locked place. Black dot: depot. Red dot: a creature you can currently see.',
      }),
      ...(indoor
        ? []
        : [
            el('h3', { text: 'The world' }),
            el('canvas', { id: 'worldcv', 'aria-label': 'The regions of the world you have walked in' }),
            el('p', {
              cls: 'note',
              text: 'Each square is a region like the one above. White outline: where you are. Gold dot: the well you set out from. Dark: country you have not walked. The world wraps around: walk off any edge and you come in on the far side.',
            }),
          ]),
    ],
  );
  if (!indoor) drawWorld();
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
      g.fillStyle = INDOOR_COLS[V.S.terrain[i]] || cols[V.S.terrain[i]];
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
      if (V.S.depots[i] && i !== R.campHere(V.S)) {
        g.fillStyle = '#000';
        g.beginPath();
        g.arc((x + 0.5) * ts, (y + 0.5) * ts, ts * 0.3, 0, 7);
        g.fill();
      }
    }
  if (R.campHere(V.S) !== null) {
    const x = R.campHere(V.S) % R.W,
      y = Math.floor(R.campHere(V.S) / R.W);
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
  const px = ((P.x + G.half) / G.ts) * ts,
    py = ((P.z + G.half) / G.ts) * ts;
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
function drawWorld() {
  const cv = $('worldcv'),
    w = V.S.world,
    css = Math.min(cv.parentNode.clientWidth || 240, 240),
    cell = css / Math.max(w.cols, w.rows),
    dpr = window.devicePixelRatio || 1,
    here = R.outdoorRec(V.S);
  cv.style.width = cell * w.cols + 'px';
  cv.style.height = cell * w.rows + 'px';
  cv.style.display = 'block';
  cv.style.marginTop = '8px';
  cv.width = Math.round(cell * w.cols * dpr);
  cv.height = Math.round(cell * w.rows * dpr);
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (let cy = 0; cy < w.rows; cy++)
    for (let cx = 0; cx < w.cols; cx++) {
      const rec = V.S.areas[R.regionId(V.S, cx, cy)];
      g.fillStyle = rec && rec.visited ? R.byId(R.C.biomes, rec.biome).colors[0] : '#10151d';
      g.fillRect(cx * cell + 1, cy * cell + 1, cell - 2, cell - 2);
      if (cx === w.home.cx && cy === w.home.cy) {
        g.fillStyle = '#e0a84a';
        g.beginPath();
        g.arc((cx + 0.5) * cell, (cy + 0.5) * cell, 4, 0, 7);
        g.fill();
      }
      if (rec && rec.rareTold && R.regionRareOf(V.S, rec.id)) {
        g.fillStyle = '#c9a0ff'; // a rare country you have been to
        g.fillRect((cx + 0.5) * cell - 3, cy * cell + 6, 6, 6);
      }
    }
  g.strokeStyle = '#fff';
  g.lineWidth = 2;
  g.strokeRect(here.cx * cell + 2, here.cy * cell + 2, cell - 4, cell - 4);
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
        el('li', { cls: 'item' }, [el('div', null, [el('strong', { text: a.name + ' ' + a.score }), el('p', { text: a.text })])]),
      ),
    ),
    el('h3', { text: 'Creatures met' }),
    el('p', {
      cls: 'note',
      text:
        V.S.species
          .filter((x) => x.met)
          .map(
            (x) =>
              x.name +
              ': ' +
              R.byId(R.C.creature.forms, x.form).text +
              ' ' +
              R.byId(R.C.creature.tempers, x.temper).text +
              (R.specialOf(V.S, x).text ? ' ' + R.specialOf(V.S, x).text : ''),
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
    el(
      'ul',
      { cls: 'items' },
      R.worldNotes(V.S).map((n) =>
        el('li', { cls: 'item' }, [el('div', null, [el('strong', { text: n.label }), el('p', { text: n.text })])]),
      ),
    ),
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
    el('h3', { text: 'Saved game' }),
    el('p', {
      cls: 'note',
      text: 'Your run saves itself in this browser. To move it to another device, copy it here and load it there.',
    }),
    (() => {
      const box = el('textarea', {
          id: 'save-text',
          rows: '3',
          placeholder: 'Paste a saved game here',
          'aria-label': 'Saved game text',
        }),
        msg = el('p', { cls: 'note', id: 'save-msg' });
      const copy = btn('Copy this run', () => {
        const txt = R.serialize(V.S);
        box.value = txt;
        try {
          navigator.clipboard.writeText(txt).then(
            () => (msg.textContent = 'Copied. Paste it into Menu on the other device.'),
            () => (msg.textContent = 'Copy the text in the box by hand.'),
          );
        } catch (e) {
          msg.textContent = 'Copy the text in the box by hand.';
        }
      });
      const loadIt = btn('Load the pasted run', () => {
        const res = R.deserialize(box.value.trim());
        if (res.error) {
          msg.textContent = res.error;
          return;
        }
        enter(res.state);
        if (V.S.over) showEnd();
      });
      return el('div', null, [box, el('div', { cls: 'row' }, [copy, loadIt]), msg]);
    })(),
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
    el('p', { cls: 'note', text: 'Far Beacon ' + (typeof GAME_VERSION === 'string' ? GAME_VERSION : '') }),
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
  V,
  VIEW,
  input,
  scene,
  renderer,
  buildStatic,
  // for tests and tinkering from the console: redraw everything after changing the state by hand
  refresh() {
    sync();
    placePlayer();
    buildDynamic();
    render();
  },
};
requestAnimationFrame(loop);

export {
  meter,
  render,
  openModal,
  closeModal,
  lock,
  openCreate,
  btn,
  itemRow,
  resRow,
  openPack,
  openPact,
  openTown,
  showEnd,
  MAPC,
  openMap,
  openMenu,
  cv,
  look,
  dragging,
  lx,
  ly,
  moveId,
  lookId,
  ox,
  oy,
  tlx,
  tly,
  stick,
  knob,
  endTouch,
  saved,
};
