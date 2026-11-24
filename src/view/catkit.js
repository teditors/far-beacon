/* The catted model kit (commission 9, Super Feline Mode): parts actors.js puts on its models when the world is feline
   (view/themeflag.js). Everyone gets a cat's head (ears with pink insides, a muzzle, a pink nose, whiskers, almond eyes
   that shine in the dark) and a tail that swishes; hands become paws in the fur's colour. The creatures become what
   a cat fears: the dog next door (floppy ears, a red collar with a tag), the vacuum cleaner (upright, on wheels, a
   hose for an arm and a glaring headlight), the spray bottle (floating, its trigger for a head and a nozzle that
   watches you), the cucumber (bumpy, with googly eyes) and, for the docile ones, dust bunnies (grey fluff with long
   ears). Same joints as the models they replace (actors.js: 0 body, 1 and 2 the gait, 3 and 4 the arms, 5 the head,
   6 a tail, 7 a serpent's body, 8 the bright eyes), so they walk, look and lunge as before. */
import { P as PT } from './kit.js';

// fur, by the person's seed: ginger, grey, black, white, cream, brown tabby, blue-grey, tortoiseshell brown
const FURS = [0xe08a3a, 0x8f8f98, 0x26252a, 0xf2efe8, 0xe8c890, 0x9a6a48, 0x6e7a8a, 0x5a3a2a];
const EYES = [0x8ad04a, 0xf0c030, 0x4ab0e8, 0xe8a03a];
const furOf = (seed) => FURS[Math.abs(seed | 0) % FURS.length];
const eyeOf = (seed) => EYES[(Math.abs(seed | 0) >> 3) % EYES.length];

/* A cat's head on a person (head pivot H, the head's middle at y), facing +z. fur: its colour; eye: the eyes'. */
function catHead(k, fur, eye, H, y) {
  const o = { bone: 5, pivot: H },
    light = fur === 0x26252a ? 0x3a393f : 0xfaf6ee, // a black cat's muzzle stays black
    pink = 0xf2a0b0;
  k.add(PT.ball(0.175, 12, 9), fur, { y, sx: 1.12, sy: 0.95 }, o);
  for (const s of [-1, 1]) {
    // ears: a cut cone, tipped out, with a pink inside
    k.add(
      PT.cone(0.075, 0.17, 4),
      fur,
      { x: s * 0.11, y: y + 0.17, z: -0.01, rz: -s * 0.3, ry: Math.PI / 4 },
      Object.assign({ flat: true }, o),
    );
    k.add(
      PT.cone(0.045, 0.11, 4),
      pink,
      { x: s * 0.108, y: y + 0.155, z: 0.02, rz: -s * 0.3, ry: Math.PI / 4 },
      Object.assign({ flat: true }, o),
    );
    // the muzzle's two cheeks
    k.add(PT.ball(0.055, 8, 6), light, { x: s * 0.045, y: y - 0.06, z: 0.15, sz: 0.8 }, o);
    // almond eyes, shining (bone 8), with a slit
    k.add(PT.ball(0.034, 8, 6), eye, { x: s * 0.07, y: y + 0.03, z: 0.155, sx: 1.25, sy: 0.85 }, { bone: 8, pivot: H });
    k.add(PT.box(0.008, 0.045, 0.01), 0x101010, { x: s * 0.07, y: y + 0.03, z: 0.19 }, o);
    // whiskers, three a side
    for (const w of [-1, 0, 1])
      k.add(
        PT.box(0.2, 0.006, 0.006),
        0xf4f4f4,
        { x: s * 0.15, y: y - 0.06 + w * 0.018, z: 0.16, rz: s * w * 0.15, ry: -s * 0.25 },
        o,
      );
  }
  k.add(PT.ball(0.022, 6, 4), pink, { y: y - 0.025, z: 0.19, sy: 0.7 }, o); // the nose
  k.add(PT.ball(0.03, 6, 4), light, { y: y - 0.1, z: 0.14 }, o); // the chin
}
/* A tail from the small of the back, curling up, on the tail's joint so it swishes. */
function catTail(k, fur, y) {
  const o = { bone: 6, pivot: [0, y, -0.2] };
  k.add(PT.cyl(0.045, 0.055, 0.5, 6), fur, { y: y - 0.12, z: -0.38, rx: -1.1 }, o);
  k.add(PT.cyl(0.04, 0.045, 0.4, 6), fur, { y: y + 0.18, z: -0.62, rx: -0.3 }, o);
  k.add(PT.ball(0.045, 6, 4), fur, { y: y + 0.38, z: -0.67 }, o);
}

/* The feline foes, by form. W: white where the creature's tint goes; eye: the temper's colour (bone 8). */
function catCreature(k, form, eye) {
  const W = 0xffffff,
    D = 0xb8b8b8;
  if (form === 'hound') {
    // the dog next door: a stocky dog, floppy ears, a red collar with a gold tag, a black nose, a wagging tail
    k.add(PT.blob(0.5, 1), W, { y: 0.8, sx: 0.66, sy: 0.6, sz: 1.35 }, { bone: 0, round: true });
    const hp = [0, 1.0, 0.7];
    k.add(PT.blob(0.3, 1), W, { y: 1.2, z: 0.95, sx: 1.1 }, { bone: 5, pivot: hp, round: true });
    k.add(PT.box(0.26, 0.2, 0.3), D, { y: 1.1, z: 1.22 }, { bone: 5, pivot: hp }); // the snout
    k.add(PT.ball(0.06, 6, 4), 0x151515, { y: 1.18, z: 1.38 }, { bone: 5, pivot: hp }); // the nose
    k.add(PT.box(0.16, 0.03, 0.14), 0xd04050, { y: 1.02, z: 1.28 }, { bone: 5, pivot: hp }); // a lolling tongue
    for (const s of [-1, 1]) {
      k.add(PT.box(0.08, 0.32, 0.18), D, { x: s * 0.3, y: 1.08, z: 0.9, rz: s * 0.25 }, { bone: 5, pivot: hp }); // floppy ears
      k.add(PT.box(0.08, 0.06, 0.03), eye, { x: s * 0.1, y: 1.3, z: 1.2 }, { bone: 8, pivot: hp });
    }
    k.add(PT.cyl(0.27, 0.27, 0.09, 10), 0xd02838, { y: 1.02, z: 0.72, rx: 0.9 }, { bone: 0 }); // the collar
    k.add(PT.cyl(0.07, 0.07, 0.02, 8), 0xf0c030, { y: 0.84, z: 0.92, rx: Math.PI / 2 }, { bone: 0 }); // its tag
    for (const [x, z, b] of [
      [-0.2, 0.5, 1],
      [0.2, 0.5, 2],
      [-0.2, -0.5, 2],
      [0.2, -0.5, 1],
    ])
      k.add(PT.cyl(0.08, 0.1, 0.7, 6), W, { x, y: 0.38, z }, { bone: b, pivot: [x, 0.75, z] });
    k.add(PT.cyl(0.04, 0.07, 0.6, 5), W, { y: 1.05, z: -0.85, rx: -0.6 }, { bone: 6, pivot: [0, 0.95, -0.7] });
  } else if (form === 'brute') {
    // the vacuum cleaner: a base on wheels, an upright body with its bag, a handle, a hose for an arm, a headlight
    for (const [x, b] of [
      [-0.5, 1],
      [0.5, 2],
    ])
      k.add(
        PT.cyl(0.25, 0.25, 0.14, 10),
        0x202024,
        { x, y: 0.25, z: -0.2, rz: Math.PI / 2 },
        { bone: b, pivot: [x, 0.25, -0.2] },
      );
    k.add(PT.box(1.2, 0.36, 1.2), W, { y: 0.32, z: 0.2 }, { bone: 0 }); // the base
    k.add(PT.box(1.24, 0.1, 0.12), 0x2a2a30, { y: 0.14, z: 0.82 }, { bone: 0 }); // its brush
    k.add(PT.cyl(0.42, 0.5, 1.8, 12), W, { y: 1.4, z: -0.15 }, { bone: 0 }); // the body
    k.add(PT.cyl(0.46, 0.46, 0.5, 12), 0xd02838, { y: 1.5, z: -0.15 }, { bone: 0 }); // a red band (the bag)
    k.add(PT.cyl(0.05, 0.05, 1.0, 6), 0x2a2a30, { y: 2.75, z: -0.2 }, { bone: 0 }); // the handle's shaft
    k.add(PT.box(0.5, 0.1, 0.12), 0x2a2a30, { y: 3.25, z: -0.2 }, { bone: 0 }); // its grip
    const hp = [0, 0.4, 0.6];
    k.add(PT.box(0.6, 0.22, 0.08), 0xf4f0c0, { y: 0.4, z: 0.82 }, { bone: 5, pivot: hp }); // the headlight
    k.add(PT.box(0.14, 0.08, 0.03), eye, { x: -0.16, y: 0.42, z: 0.87 }, { bone: 8, pivot: hp });
    k.add(PT.box(0.14, 0.08, 0.03), eye, { x: 0.16, y: 0.42, z: 0.87 }, { bone: 8, pivot: hp });
    for (const [x, b] of [
      [-0.55, 3],
      [0.55, 4],
    ]) {
      // a ribbed hose, ending in a nozzle
      for (let i = 0; i < 4; i++)
        k.add(
          PT.cyl(0.11, 0.11, 0.26, 8),
          i % 2 ? 0x3a3a40 : 0x55555c,
          { x, y: 1.9 - i * 0.27, z: 0.1 },
          { bone: b, pivot: [x, 2.0, 0.1] },
        );
      k.add(PT.cone(0.17, 0.32, 8), 0x2a2a30, { x, y: 0.75, z: 0.1, rx: Math.PI }, { bone: b, pivot: [x, 2.0, 0.1] });
    }
  } else if (form === 'wight') {
    // the spray bottle: floats; a clear body, a trigger head with a nozzle that watches you, a mist about it
    k.add(PT.cyl(0.42, 0.42, 1.5, 12), W, { y: 1.35 }, { bone: 0 });
    k.add(PT.cyl(0.25, 0.42, 0.3, 12), W, { y: 2.25 }, { bone: 0 });
    k.add(PT.cyl(0.38, 0.38, 0.5, 12), 0x5ab0e8, { y: 1.0 }, { bone: 0 }); // the water in it
    const hp = [0, 2.4, 0];
    k.add(PT.box(0.36, 0.34, 0.75), 0xe8344a, { y: 2.6, z: 0.15 }, { bone: 5, pivot: hp }); // the trigger head
    k.add(PT.cyl(0.07, 0.07, 0.22, 8), 0xe8344a, { y: 2.65, z: 0.6, rx: Math.PI / 2 }, { bone: 5, pivot: hp }); // nozzle
    k.add(PT.box(0.1, 0.07, 0.03), eye, { x: -0.1, y: 2.68, z: 0.53 }, { bone: 8, pivot: hp });
    k.add(PT.box(0.1, 0.07, 0.03), eye, { x: 0.1, y: 2.68, z: 0.53 }, { bone: 8, pivot: hp });
    k.add(PT.box(0.12, 0.42, 0.12), 0xe8344a, { y: 2.3, z: 0.45, rx: 0.3 }, { bone: 3, pivot: [0, 2.45, 0.4] }); // the trigger
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05;
      k.add(
        PT.ball(0.08 + (i % 3) * 0.03, 6, 4),
        0xd8eef8,
        { x: Math.cos(a) * 0.7, y: 1.2 + (i % 3) * 0.5, z: Math.sin(a) * 0.7 },
        { bone: 0 },
      );
    }
  } else if (form === 'dustbunny') {
    // a dust bunny: a ball of grey fluff with long ears and tiny feet
    k.add(PT.blob(0.45, 1), 0x9a9aa0, { y: 0.5, sy: 0.85 }, { bone: 0 });
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9;
      k.add(
        PT.blob(0.16, 0),
        0xb0b0b6,
        { x: Math.cos(a) * 0.38, y: 0.45 + Math.sin(i * 2.1) * 0.25, z: Math.sin(a) * 0.38 },
        { bone: 0 },
      );
    }
    const hp = [0, 0.7, 0.2];
    for (const s of [-1, 1]) {
      k.add(PT.cyl(0.06, 0.1, 0.55, 6), 0xa8a8ae, { x: s * 0.16, y: 1.15, z: 0, rz: -s * 0.2 }, { bone: 5, pivot: hp });
      k.add(PT.box(0.07, 0.07, 0.03), eye, { x: s * 0.14, y: 0.62, z: 0.42 }, { bone: 8, pivot: hp });
      k.add(
        PT.ball(0.08, 6, 4),
        0x8a8a90,
        { x: s * 0.2, y: 0.07, z: 0.15 },
        { bone: s < 0 ? 1 : 2, pivot: [s * 0.2, 0.2, 0.15] },
      );
    }
  } else {
    // the cucumber: bumpy green segments, a stalk, googly eyes on the raised end
    for (let i = 0; i < 8; i++) {
      const z = 1.1 - i * 0.5,
        r = 0.3 - i * 0.012;
      k.add(PT.blob(r, 1), i % 2 ? 0x3a8a3a : 0x4aa04a, { y: r * 0.95, z, sz: 1.6 }, { bone: 7, pivot: [0, 0, i], round: true });
      k.add(PT.ball(0.05, 5, 4), 0x2a6a2a, { x: (i % 2 ? 1 : -1) * r * 0.7, y: r * 1.4, z }, { bone: 7, pivot: [0, 0, i] });
    }
    k.add(PT.cyl(0.05, 0.07, 0.25, 6), 0x7a6a3a, { y: 0.3, z: -2.85, rx: Math.PI / 2 }, { bone: 7, pivot: [0, 0, 8] }); // stalk
    const hp = [0, 0.7, 1.2];
    k.add(PT.blob(0.3, 1), 0x4aa04a, { y: 0.75, z: 1.5, sx: 1.0, sy: 0.9, sz: 1.3 }, { bone: 5, pivot: hp, round: true });
    for (const s of [-1, 1]) {
      k.add(PT.ball(0.11, 8, 6), 0xffffff, { x: s * 0.13, y: 1.02, z: 1.65 }, { bone: 5, pivot: hp });
      k.add(PT.ball(0.05, 6, 4), eye, { x: s * 0.13, y: 1.02, z: 1.76 }, { bone: 8, pivot: hp });
    }
  }
}
export { FURS, furOf, eyeOf, catHead, catTail, catCreature };
