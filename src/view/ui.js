/* HUD, panels and screens, input and start-up. */
import { $, G, P, R, V, VIEW, clamp, el, f1 } from './ctx.js';
import { guard, showError, errors } from './oops.js';
import { act, codex, codexTotal, enter, input, load, loop, placePlayer, randomSeed, save, start, sync } from './run.js';
import { box, buildDynamic, buildStatic, renderer, resize, scene } from './scene.js';
import { Q, QUALITY, SET, saveSettings, setQuality } from './quality.js';
import { PF } from './perf.js';

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
  $('when').textContent =
    'Day ' +
    c.day +
    ', ' +
    String(c.hour).padStart(2, '0') +
    ':' +
    String(c.min).padStart(2, '0') +
    (V.S.godMode ? ' · God mode' : '');
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
          on: () => (a.id === 'pactAsk' ? openPact() : a.id === 'townAsk' ? openTown(a.section) : act(() => R[a.id](V.S, a.arg))),
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
// Materials you carry, and what you could make of them (crafting).
function craftRows() {
  const list = R.recipes(V.S);
  if (!list.length) return [];
  const m = V.S.player.mats || {},
    have = R.C.crafting.mats.filter((x) => m[x.id] > 0);
  return [
    el('h3', { text: 'Materials' }),
    el('p', {
      cls: 'note',
      text:
        (have.length ? have.map((x) => m[x.id] + ' ' + x.name.toLowerCase()).join(', ') + ', and ' : '') +
        Math.floor(V.S.player.fuel) +
        ' wood (your fuel). Hides and bone come from kills, salvage from ruins and caches, herbs from gathering wood.',
    }),
    el('h3', { text: 'Make' }),
    el(
      'ul',
      { cls: 'items' },
      list.map(({ r, ok }) =>
        el('li', { cls: 'item' }, [
          el('div', null, [
            el('strong', { text: r.name }),
            el('p', {
              text:
                r.text +
                ' Needs ' +
                Object.keys(r.needs)
                  .map((k) => r.needs[k] + ' ' + (k === 'fuel' ? 'wood' : R.byId(R.C.crafting.mats, k).name.toLowerCase()))
                  .join(', ') +
                '; ' +
                r.mins +
                ' min.',
            }),
          ]),
          ok
            ? btn('Make', () => {
                act(() => R.craft(V.S, r.id));
                if (r.makes === 'shelter') buildStatic(); // it stands in the land from now on
                if (!V.S.over) openPack();
              })
            : el('span', { cls: 'wt', text: '' }),
        ]),
      ),
    ),
  ];
}
// The market: trade goods, cheap where they are made and dear where they are not, and materials to sell.
function marketRows(t, re) {
  const rows = R.market(V.S);
  if (!rows.length) return [];
  const made = rows.filter((m) => m.made),
    tip = made.length ? R.bestMarket(V.S, made[0].id) : null,
    m = V.S.player.mats || {},
    mats = (R.C.crafting ? R.C.crafting.mats : []).filter((x) => m[x.id] > 0);
  return [
    el('h3', { text: 'Market' }),
    el('p', {
      cls: 'note',
      text:
        (made.length
          ? t.name + ' makes ' + made.map((x) => x.name.toLowerCase()).join(' and ') + ', and sells it cheap.'
          : t.name + ' makes nothing to trade, and pays well for what others make.') +
        (tip && tip.t !== t ? ' ' + t.merchant + ': "' + made[0].name + ' fetch the most in ' + tip.t.name + '."' : ''),
    }),
    el(
      'ul',
      { cls: 'items' },
      rows.map((g) =>
        el('li', { cls: 'item' }, [
          el('div', null, [
            el('strong', { text: g.name + (g.have ? ' (you have ' + g.have + ')' : '') }),
            el('p', { text: g.text + ' ' + g.wt + ' wt each.' + (g.made ? ' Made here: ' + g.stock + ' left.' : '') }),
          ]),
          el('div', { cls: 'row' }, [
            g.stock > 0
              ? btn(
                  'Buy ' + g.buy,
                  re(() => R.buyGood(V.S, g.id)),
                )
              : null,
            g.have > 0
              ? btn(
                  'Sell ' + g.sell,
                  re(() => R.sellGood(V.S, g.id)),
                )
              : null,
          ]),
        ]),
      ),
    ),
    ...(mats.length
      ? [
          el('h3', { text: 'Materials' }),
          el(
            'div',
            { cls: 'row' },
            mats.map((x) =>
              btn(
                'Sell ' + x.name.toLowerCase() + ' (' + m[x.id] + '), ' + x.value + ' each',
                re(() => R.sellMat(V.S, x.id)),
              ),
            ),
          ),
        ]
      : []),
  ];
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
    ...craftRows(),
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
// Anyone else in town: what they say and what they offer, from R.serviceInfo.
function openService() {
  const info = R.serviceInfo(V.S);
  if (!info) return;
  openModal(info.title, [
    ...info.text.map((t) => el('p', { text: t })),
    info.options.length ? el('p', { cls: 'note', text: 'You have ' + V.S.player.coin + ' coin.' }) : null,
    el(
      'ul',
      { cls: 'items' },
      info.options.map((o) =>
        el('li', { cls: 'item' }, [
          el('div', null, [el('strong', { text: o.label }), o.note ? el('p', { text: o.note }) : null]),
          el('div', { cls: 'row' }, [
            btn(
              o.price ? o.price + ' coin' : 'Yes',
              () => {
                act(() => R.useService(V.S, o.id, o.arg));
                if (!V.S.over) openService();
              },
              'small' + (V.S.player.coin >= o.price ? ' sel' : ''),
            ),
          ]),
        ]),
      ),
    ),
  ]);
}
function openTown(section) {
  if (!['elder', 'inn', 'shop'].includes(section)) return openService();
  const t = R.curTown(V.S);
  if (section === 'elder' && (!V.S.quest.told || t !== V.S.town)) act(() => R.talkElder(V.S));
  const p = V.S.player,
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
          'Buy, ' + R.buyPrice(V.S, it),
          re(() => R.buy(V.S, it.id)),
          'small' + (p.coin >= R.buyPrice(V.S, it) ? ' sel' : ''),
        ),
      ]),
    ]),
  );
  const mine = p.items
    .filter((it) => R.sellPrice(it, V.S) > 0)
    .map((it) =>
      el('li', { cls: 'item' }, [
        el('div', null, [el('strong', { text: R.itemName(it) }), el('span', { cls: 'wt', text: it.eq ? 'worn' : '' })]),
        el('div', { cls: 'row' }, [
          it.known
            ? null
            : btn(
                'Appraise, ' + R.priceOf(V.S, 'appraisePrice'),
                re(() => R.appraise(V.S, it.id)),
              ),
          btn(
            'Sell, ' + R.sellPrice(it, V.S),
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
      ...R.plotChoices(V.S).map((o) =>
        el('div', { cls: 'row' }, [
          btn(
            o.label,
            re(() => R.choosePlot(V.S, o.plot, o.id)),
          ),
        ]),
      ),
    ]);
  else if (section === 'inn')
    openModal('The inn', [
      el('p', { text: 'A fire, a long table, and rooms upstairs.' }),
      coin,
      el('div', { cls: 'row' }, [
        btn(
          'A bed for the night, ' + R.priceOf(V.S, 'innPrice') + ' coin',
          re(() => R.inn(V.S)),
          'primary',
        ),
        el('span', { cls: 'note', text: 'Eight hours. Restores everything.' }),
      ]),
      el('h3', { text: 'Work' }),
      el('p', { text: R.errandInfo(V.S).text }),
      el('div', { cls: 'row' }, [
        R.errandInfo(V.S).canAsk
          ? btn(
              'Ask about work',
              re(() => R.askErrand(V.S)),
            )
          : null,
        R.errandInfo(V.S).canClaim
          ? btn(
              'Claim your pay',
              re(() => R.claimErrand(V.S)),
              'primary',
            )
          : null,
      ]),
    ]);
  else
    openModal(t.merchant + "'s shop", [
      coin,
      el('div', { cls: 'row' }, [
        btn(
          'Fuel, ' + R.priceOf(V.S, 'fuelPrice') + ' coin each (' + t.fuel + ' left)',
          re(() => R.buyFuel(V.S)),
        ),
      ]),
      el('h3', { text: 'For sale' }),
      el('ul', { cls: 'items' }, stock),
      el('h3', { text: 'Your goods' }),
      mine.length ? el('ul', { cls: 'items' }, mine) : el('p', { cls: 'note', text: 'Nothing they would buy.' }),
      ...marketRows(t, re),
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
      '.' +
      (V.S.cheated ? ' Walked in god mode: this ' + (won ? 'win' : 'run') + ' does not count.' : ''),
  });
  if (won && V.S.over.ending)
    openModal(R.byId(R.C.plots.kinds, V.S.over.plot).name + ': the end', [
      el('p', { text: V.S.over.ending }),
      el('p', { text: who + ', on day ' + c.day + ', traveller ' + V.S.travellers + ' of this world.' }),
      world,
      el('div', { cls: 'row' }, [
        btn('New world', () => openNewWorld(), 'primary'),
        btn('Same world again', () => start(V.S.seed)),
      ]),
    ]);
  else if (won)
    openModal('The ' + V.S.quest.relic + ' is home', [
      el('p', {
        text:
          who + ' carried it to the ' + V.S.quest.dest + ' on day ' + c.day + ', traveller ' + V.S.travellers + ' of this world.',
      }),
      world,
      el('div', { cls: 'row' }, [
        btn('New world', () => openNewWorld(), 'primary'),
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
      el('div', { cls: 'row' }, [btn('New world', () => openNewWorld(), 'primary')]),
    ]);
  lock(true);
}
const MAPC = {
  shadow: '#1d2430',
  landing: '#e0a84a',
  skyway: '#e0a84a',
  trader: '#3a6a9a',
  seaplace: '#7fd0e0',
  wayfarer: '#f0a040',
  door: '#b48ce0',
  throne: '#c0612f',
  cellar: '#3b332c',
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
  hamlet: '#d8c9a0',
  trap: '#e0302a',
  den: '#5a2a22',
  camp: '#c0612f',
  lost: '#e8d27a',
  stone: '#111111',
  herbs: '#6fae4f',
  siege: '#c0612f',
  shelter: '#a07a4a',
};
const INDOOR_COLS = { 6: '#3a3631', 7: '#9a948a', 8: '#9cc4ec' };
// The map screen. Indoors: the town or the level you are on. Outdoors: the whole world as one continuous map, drawn from
// every region you have seen, centred on you; it wraps around like the world. Drag to pan, + and - to zoom.
const mapView = { zoom: 54, dx: 0, dy: 0 }; // tiles across the canvas, and how far it has been panned from you
function openMap() {
  const rec = R.areaRec(V.S),
    indoor = R.indoors(V.S);
  if (!indoor) return openWorldMap();
  const cv = el('canvas', { id: 'mapcv', 'aria-label': 'Your map so far' });
  openModal(rec.kind === 'town' ? R.curTown(V.S).name : R.levelTitle(V.S), [
    cv,
    el('p', {
      cls: 'note',
      text:
        rec.kind === 'town'
          ? "White dot: you. Red: the elder's hall. Brown: the inn. Blue: the shop. Gold: a gate."
          : 'Only what your light has shown you. White dot: you. Gold: stairs and the way out. Black dot: something left lying. Red: a trap. Red dot: a creature you can see. Gold ring: where your goal leads next.',
    }),
  ]);
  const css = cv.clientWidth,
    dpr = window.devicePixelRatio || 1;
  cv.width = cv.height = Math.round(css * dpr);
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const ts = css / R.W;
  g.fillStyle = '#10151d';
  g.fillRect(0, 0, css, css);
  for (let y = 0; y < R.H; y++)
    for (let x = 0; x < R.W; x++) {
      const i = y * R.W + x;
      if (!V.S.seen[i]) continue;
      g.fillStyle = INDOOR_COLS[V.S.terrain[i]] || '#9a948a';
      g.fillRect(x * ts, y * ts, ts + 0.5, ts + 0.5);
      const st = V.S.sites[i];
      if (st && MAPC[st.kind]) {
        g.fillStyle = MAPC[st.kind];
        g.fillRect(x * ts - 1, y * ts - 1, ts + 2, ts + 2);
      }
      if (V.S.depots[i]) {
        g.fillStyle = '#000';
        g.beginPath();
        g.arc((x + 0.5) * ts, (y + 0.5) * ts, ts * 0.3, 0, 7);
        g.fill();
      }
    }
  for (const c of V.S.creatures)
    if (c.seen && Math.max(Math.abs(c.x - V.S.player.x), Math.abs(c.y - V.S.player.y)) <= 4) {
      g.fillStyle = '#e0302a';
      g.beginPath();
      g.arc((c.x + 0.5) * ts, (c.y + 0.5) * ts, 4, 0, 7);
      g.fill();
    }
  const gm = R.goalMark(V.S);
  if (gm) goalAt(g, (gm.x + 0.5) * ts, (gm.y + 0.5) * ts);
  youAt(g, ((P.x + G.half) / G.ts) * ts, ((P.z + G.half) / G.ts) * ts);
}
// The next place the goal line points to: a gold ring.
function goalAt(g, px, py) {
  g.beginPath();
  g.arc(px, py, 9, 0, 7);
  g.lineWidth = 3;
  g.strokeStyle = '#ffd24a';
  g.stroke();
  g.lineWidth = 1;
  g.strokeStyle = '#141a22';
  g.beginPath();
  g.arc(px, py, 11, 0, 7);
  g.stroke();
}
function youAt(g, px, py) {
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
function openWorldMap() {
  const cv = el('canvas', { id: 'worldcv', 'aria-label': 'Your map of the world so far' });
  cv.style.touchAction = 'none';
  const zoom = (f) => () => {
    mapView.zoom = Math.max(18, Math.min(V.S.world.cols * R.W * 1.5, Math.round(mapView.zoom * f)));
    drawWorldMap(cv);
  };
  openModal('Map', [
    cv,
    el('div', { cls: 'row' }, [
      btn('+', zoom(1 / 1.5)),
      btn('-', zoom(1.5)),
      btn('Centre on me', () => {
        mapView.dx = mapView.dy = 0;
        drawWorldMap(cv);
      }),
    ]),
    el('p', {
      cls: 'note',
      text:
        (V.S.godMode ? 'God mode: tap anywhere to go there. ' : '') +
        'The world as you have seen it. Drag to look around; it wraps around, like the world. White dot: you. Gold: camp and the well. Blue: water. Grey: paved road. Purple: ruin. Dark: cave. Red: shrine. Orange: beacon. Pale yellow: town. Black square: the locked place. Black dot: something left lying. Red dot: a creature you can see. Gold ring: where your goal leads next.',
    }),
  ]);
  // drag to pan
  let drag = null;
  cv.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, dx: mapView.dx, dy: mapView.dy };
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const ts = cv.clientWidth / mapView.zoom;
    mapView.dx = drag.dx - (e.clientX - drag.x) / ts;
    mapView.dy = drag.dy - (e.clientY - drag.y) / ts;
    drawWorldMap(cv);
  });
  cv.addEventListener('pointerup', (e) => {
    // in god mode a tap (not a drag) jumps to the tapped place
    const tap = drag && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6;
    drag = null;
    if (!tap || !V.S.godMode || !mapView.last) return;
    const r = cv.getBoundingClientRect(),
      L = mapView.last;
    act(() => R.jumpMap(V.S, L.x0 + (e.clientX - r.left) / L.ts, L.y0 + (e.clientY - r.top) / L.ts));
    closeModal();
  });
  drawWorldMap(cv);
}
function drawWorldMap(cv) {
  cv.style.width = '100%';
  cv.style.display = 'block';
  const css = cv.clientWidth || 300;
  cv.style.height = css + 'px';
  const S = V.S,
    w = S.world,
    WW = w.cols * R.W,
    HH = w.rows * R.H,
    dpr = window.devicePixelRatio || 1,
    n = mapView.zoom,
    ts = css / n,
    wrapN = (v, m) => ((v % m) + m) % m;
  cv.width = cv.height = Math.round(css * dpr);
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = '#10151d';
  g.fillRect(0, 0, css, css);
  // where you are, in world tiles from the home region's corner, and the corner of the window
  const wp = R.worldPos(S),
    fx = R.inOverworld(S) ? (P.x + G.half) / G.ts - S.player.x : 0.5,
    fy = R.inOverworld(S) ? (P.z + G.half) / G.ts - S.player.y : 0.5,
    youX = wp.x + fx,
    youY = wp.y + fy,
    x0 = youX + mapView.dx - n / 2,
    y0 = youY + mapView.dy - n / 2;
  mapView.last = { x0, y0, ts };
  const regions = {};
  const regionAt = (gx, gy) => {
    const rx = Math.floor(gx / R.W),
      ry = Math.floor(gy / R.H),
      cx = wrapN(w.home.cx + rx, w.cols),
      cy = wrapN(w.home.cy + ry, w.rows),
      id = R.regionId(S, cx, cy);
    if (!(id in regions)) {
      const rec = S.areas[id],
        m = rec ? R.mapOf(S, id) : null;
      regions[id] = m && m.terrain ? { m, cols: R.byId(R.C.biomes, rec.biome).colors, id } : null;
    }
    return { r: regions[id], x: gx - rx * R.W, y: gy - ry * R.H };
  };
  for (let sy = Math.floor(y0); sy < y0 + n + 1; sy++)
    for (let sx = Math.floor(x0); sx < x0 + n + 1; sx++) {
      const { r, x, y } = regionAt(sx, sy);
      if (!r) continue;
      const i = y * R.W + x,
        m = r.m;
      if (!m.seen[i]) continue;
      const px = (sx - x0) * ts,
        py = (sy - y0) * ts;
      g.fillStyle = m.terrain[i] === R.DEEP ? '#1d4e78' : r.cols[m.terrain[i]] || '#555';
      g.fillRect(px, py, ts + 0.6, ts + 0.6);
      if (m.road[i]) {
        g.fillStyle = '#8c8a86';
        g.fillRect(px + ts * 0.25, py + ts * 0.25, ts * 0.5, ts * 0.5);
      }
      const st = m.sites[i];
      if (st && MAPC[st.kind]) {
        const big = Math.max(ts + 2, 5);
        g.fillStyle = st.kind === 'spring' && st.known && st.foul ? '#6f6a35' : MAPC[st.kind];
        g.fillRect(px + ts / 2 - big / 2, py + ts / 2 - big / 2, big, big);
      }
      if (m.depots[i] && !(S.camp && S.camp.area === r.id && S.camp.i === i)) {
        g.fillStyle = '#000';
        g.beginPath();
        g.arc(px + ts / 2, py + ts / 2, Math.max(1.5, ts * 0.3), 0, 7);
        g.fill();
      }
      if (S.camp && S.camp.area === r.id && S.camp.i === i) {
        g.fillStyle = '#e0a84a';
        g.beginPath();
        g.moveTo(px + ts / 2 - 6, py + ts + 2);
        g.lineTo(px + ts / 2, py - 6);
        g.lineTo(px + ts / 2 + 6, py + ts + 2);
        g.closePath();
        g.fill();
      }
    }
  // creatures you can see, near you
  if (R.inOverworld(S))
    for (const c of S.creatures)
      if (c.seen && Math.max(Math.abs(c.x - S.player.x), Math.abs(c.y - S.player.y)) <= 4) {
        g.fillStyle = '#e0302a';
        g.beginPath();
        g.arc((wp.x + c.x - S.player.x + 0.5 - x0) * ts, (wp.y + c.y - S.player.y + 0.5 - y0) * ts, 4, 0, 7);
        g.fill();
      }
  // where the goal line points, a ring (it may be in another region: in your region's frame it lies off its edges)
  const gm = R.inOverworld(S) ? R.goalMark(S) : null;
  if (gm) {
    let gx = wrapN(wp.x + gm.x - S.player.x + 0.5 - x0, WW),
      gy = wrapN(wp.y + gm.y - S.player.y + 0.5 - y0, HH);
    if (gx > n + 1) gx -= WW;
    if (gy > n + 1) gy -= HH;
    // off the window: pinned to its edge, on the line from you toward it, so it still shows the way
    const cx = n / 2 - mapView.dx,
      cy = n / 2 - mapView.dy,
      m = 1.2;
    if (gx < m || gy < m || gx > n - m || gy > n - m) {
      const dx = gx - cx,
        dy = gy - cy,
        k = Math.min(
          Math.abs((dx > 0 ? n - m - cx : m - cx) / (dx || 1e-9)),
          Math.abs((dy > 0 ? n - m - cy : m - cy) / (dy || 1e-9)),
          1,
        );
      gx = cx + dx * k;
      gy = cy + dy * k;
    }
    goalAt(g, gx * ts, gy * ts);
  }
  // you, wherever the window has been panned to (the world wraps, so find the copy of you that is in view)
  let ux = wrapN(youX - x0, WW),
    uy = wrapN(youY - y0, HH);
  if (ux > n + 1) ux -= WW;
  if (uy > n + 1) uy -= HH;
  youAt(g, ux * ts, uy * ts);
}
// God mode and the list of places it can jump to (Tinker panel). A world that has used it is marked for good.
function godPanel() {
  const cb = el('input', { type: 'checkbox', id: 'god-mode' });
  cb.checked = !!V.S.godMode;
  cb.addEventListener('change', () => {
    act(() => R.setGodMode(V.S, cb.checked));
    openMenu();
  });
  const out = [
    el('ul', { cls: 'items' }, [
      el('li', { cls: 'item' }, [
        el('label', {
          for: 'god-mode',
          text: 'God mode: unseen, unhurt, tireless; walk through anything, fly, breathe water, open any door',
        }),
        cb,
      ]),
    ]),
  ];
  if (V.S.cheated && !V.S.godMode)
    out.push(el('p', { cls: 'note', text: 'This world has used god mode, and says so at the end.' }));
  if (V.S.godMode) {
    const list = R.places(V.S),
      groups = [...new Set(list.map((p) => p.group))],
      sel = el(
        'select',
        { id: 'jump-to', 'aria-label': 'Place to jump to' },
        groups.map((g) =>
          el(
            'optgroup',
            { label: g },
            list.filter((p) => p.group === g).map((p) => el('option', { value: p.id, text: p.label })),
          ),
        ),
      );
    out.push(
      el('div', { cls: 'row' }, [
        sel,
        btn(
          'Go there',
          () => {
            act(() => R.jumpTo(V.S, sel.value));
            closeModal();
          },
          'primary',
        ),
      ]),
      el('p', { cls: 'note', text: 'Or open the map and tap anywhere.' }),
    );
  }
  return el('div', null, out);
}
/* The new world screen: a seed, and the world settings folded away underneath (content/worldset.js), so an ordinary
   new world is one tap. The choices are remembered for the next new world on this page. */
let lastSet = {};
function openNewWorld() {
  const M = R.C.worldSet.menus,
    D = R.C.worldSet.defaults,
    cur = (k) => (lastSet[k] !== undefined ? lastSet[k] : D[k]),
    seedIn = el('input', { type: 'number', id: 'nw-seed', value: randomSeed(), inputmode: 'numeric', 'aria-label': 'Seed' }),
    fields = {};
  const choose = (key, label, list, val) => {
    const sel = el(
      'select',
      { id: 'nw-' + key },
      list.map(([v, txt]) => {
        const o = el('option', { value: String(v), text: txt });
        if (String(v) === String(val)) o.setAttribute('selected', 'selected');
        return o;
      }),
    );
    fields[key] = sel;
    return el('li', { cls: 'item' }, [el('label', { for: 'nw-' + key, text: label }), sel]);
  };
  const many = (key, label, list) => {
    const sel = el(
      'select',
      { id: 'nw-' + key, multiple: 'multiple', size: '5' },
      list.map((e) => el('option', { value: e.id, text: e.name })),
    );
    for (const o of sel.options) if ((lastSet[key] || []).includes(o.value)) o.selected = true;
    fields[key] = sel;
    return el('li', { cls: 'item' }, [el('label', { for: 'nw-' + key, text: label }), sel]);
  };
  const count = (key, label) => {
    const inp = el('input', { type: 'number', id: 'nw-' + key, min: '0', max: '40', value: String(cur(key) || 0) });
    fields[key] = inp;
    return el('li', { cls: 'item' }, [el('label', { for: 'nw-' + key, text: label }), inp]);
  };
  const troubles = [['', 'Rolled']].concat(R.C.plots.kinds.filter((k) => k.main).map((k) => [k.id, k.name]));
  const details = el('details', { id: 'nw-more' }, [
    el('summary', { text: 'World settings' }),
    el('p', { cls: 'note', text: 'Leave these alone for an ordinary world. Hold Ctrl (or long-press) to pick several peoples.' }),
    el('ul', { cls: 'items' }, [
      choose('size', 'Size', M.size, lastSet.size || ''),
      many('races', 'Races that may appear (none picked: any)', R.C.races),
      count('nRaces', 'How many races (0: rolled)'),
      many('classes', 'Classes that may appear (none picked: any)', R.C.classes),
      count('nClasses', 'How many classes (0: rolled)'),
      choose('towns', 'Other towns', M.towns, cur('towns')),
      choose('dungeons', 'Dungeons', M.dungeons, cur('dungeons')),
      choose('depth', 'How deep they go', M.depth, cur('depth')),
      choose('sky', 'Places in the sky', M.sky, cur('sky')),
      choose('sea', 'A sea', M.sea, cur('sea')),
      choose('doors', 'Doors to other worlds', M.doors, cur('doors')),
      choose('maxDoors', 'How many doors', M.maxDoors, cur('maxDoors')),
      choose('trouble', 'The great trouble', troubles, cur('trouble')),
    ]),
  ]);
  openModal('A new world', [
    el('div', { cls: 'row' }, [el('label', { for: 'nw-seed', text: 'Seed' }), seedIn]),
    details,
    el('div', { cls: 'row' }, [
      btn(
        'Make this world',
        () => {
          const set = {};
          for (const k in fields) {
            const f = fields[k];
            if (f.multiple) set[k] = [...f.options].filter((o) => o.selected).map((o) => o.value);
            else if (k === 'size' || k === 'trouble') set[k] = f.value;
            else set[k] = parseFloat(f.value);
          }
          lastSet = set;
          start(parseInt(seedIn.value, 10) || 1, set);
        },
        'primary',
      ),
      V.S && !V.S.over ? btn('Back', () => openMenu()) : null,
    ]),
  ]);
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
      text: "Time only passes when you walk or act, so stop whenever you want to think. Creatures are rare and usually visible before they reach you; a fight is turn by turn, and fleeing is often the right call. A creature's eyes tell its temper: red hunts you, orange guards its ground, yellow keeps to itself. Water drains as you travel. Cold drains warmth at night and in storms. Stamina keeps you alive when either runs out.",
    }),
    el('p', {
      text: 'You cannot carry enough water to cross in one go. Look for green ground and blue pools, search ruins and caves, leave water and fuel as depots from the Pack screen, and move your camp forward to a cave or ruin.',
    }),
    el('p', {
      text: 'The ground matters. Each land has its own woods, watercourses and odd terrain: some shelter you, some give water or fuel, some are fast and some are punishing. The line under the meters says what you are standing on.',
    }),
    el('p', {
      text: 'There is more than the land. Stairs in caves, ruins and town cellars go down into dungeons, harder and richer the deeper you go; they are dark, so bring a light. Something may float in the sky over a shadow with no cloud to cast it: you need a way to fly, and flying is quick but tiring, cold and grounded by storms. Deep water needs a boat or a way to breathe it. And rarely a door of old stone leads to another world. The goal line always points the next step of the way: a stair, a shadow, a door.',
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
    ...(() => {
      // the troubles you know of: the one on the top panel, and a button to follow another
      const known = R.plotsOf(V.S).filter((p) => (p.kind === 'relic' ? V.S.quest.told && !p.main : p.known));
      if (!known.length) return [];
      const cur = R.tracked(V.S);
      return [
        el('h3', { text: 'Troubles' }),
        el(
          'ul',
          { cls: 'items' },
          known.map((p) => {
            const k = R.byId(R.C.plots.kinds, p.kind),
              o = p.kind === 'relic' ? { text: k.text } : R.plotObjective(V.S, p);
            return el('li', { cls: 'item' }, [
              el('div', null, [
                el('strong', { text: k.name + (p.main ? ' (the great trouble)' : '') }),
                el('p', {
                  text: p.done
                    ? 'Done.'
                    : p.failed
                      ? 'Failed.'
                      : o.text + (o.dir && o.dir !== 'here' ? ', to the ' + o.dir : '') + '.',
                }),
              ]),
              !p.done && !p.failed && cur !== p
                ? btn('Follow', () => {
                    R.trackPlot(V.S, p.id);
                    render();
                    save();
                    openMenu();
                  })
                : el('span', { cls: 'wt', text: cur === p ? 'followed' : '' }),
            ]);
          }),
        ),
      ];
    })(),
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
      btn('New world', () => openNewWorld(), 'primary'),
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
    el('h3', { text: 'Settings' }),
    el('p', {
      cls: 'note',
      text: 'Graphics quality for this device. Low draws less land and fewer trees, at a lower resolution: use it if the game stutters. Smoothing of edges changes the next time the page is loaded.',
    }),
    el(
      'div',
      { cls: 'row' },
      Object.keys(QUALITY).map((k) =>
        btn(
          QUALITY[k].label + (SET.quality === k ? ' (now)' : ''),
          () => {
            setQuality(k);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.ratio));
            resize();
            buildStatic();
            buildDynamic();
            openMenu();
          },
          SET.quality === k ? 'primary' : '',
        ),
      ),
    ),
    (() => {
      const cb = el('input', { type: 'checkbox', id: 'perf-meter' });
      cb.checked = !!SET.meter;
      cb.addEventListener('change', () => {
        SET.meter = cb.checked;
        saveSettings();
      });
      return el('ul', { cls: 'items' }, [
        el('li', { cls: 'item' }, [el('label', { for: 'perf-meter', text: 'Show the performance meter' }), cb]),
      ]);
    })(),
    el('h3', { text: 'Tinker' }),
    el('p', { cls: 'note', text: 'Switch whole systems off, or change the numbers while you play.' }),
    godPanel(),
    errors.length || V.S.godMode
      ? el('div', { cls: 'row' }, [
          btn('Rescue: back to the well', () => {
            act(() => R.rescue(V.S));
            buildStatic();
            placePlayer();
            closeModal();
          }),
        ])
      : null,
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
  PF,
  Q,
  setQuality(name) {
    setQuality(name);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.ratio));
    resize();
  },
  // a fresh world on this seed, without the character screen (for the benchmark)
  newWorld(seed, set) {
    enter(R.newGame(seed, {}, set));
  },
  // for tests and tinkering from the console: redraw everything after changing the state by hand
  refresh() {
    sync();
    placePlayer();
    buildDynamic();
    render();
  },
};
// nothing that goes wrong anywhere may leave a black screen: errors outside the frame are caught and shown too
window.addEventListener('error', (e) => showError('the page', e.error || e.message));
window.addEventListener('unhandledrejection', (e) => showError('the page', e.reason));
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
