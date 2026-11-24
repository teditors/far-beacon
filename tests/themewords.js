// The words a theme must never let through (commission 9): every word in the names content gives things (races,
// classes, items, creatures, places, weathers, troubles...), and the game's core words, less the small words that make
// any sentence and the plain adjectives that suit a cat as well as anyone.
const CORE = `water fire tent camp rest sleep fuel warmth stamina health mana storm rain snow blizzard town inn shop elder
beacon relic key coin traveller race class god shrine cave ruin dungeon map pack menu journal codex settings tinker
creature hound brute wight serpent wolf dog human elf dwarf orc halfling gnome paladin ranger rogue cleric wizard fighter
spring well cistern river lake sea forest tree trees hill mountain desert moor taiga steppe sky cloud wind dust ash salt
stair stairs door vault locked lantern torch cloak boots dagger sword spear shield armor armour salve tonic draught
flask bandages rope compass staff waterskin day night hour hours thirst cold kill fight strike bite wounds hit heal
drink eat walk climb search survey fly swim people peoples folk world land country region ground beast monster tyrant
king curse sickness cure feud cult siege caravan captive stolen trouble quest goal level`.split(/\s+/);
const SMALL = `the of a an and or but to in on at by for with from into onto over under up down out off as is are was were
be been it its they them their this that these those there here what who whom whose which when where how why not no nor
so if then than too very all any each every some many more most less least few one two three four five six seven eight
nine ten first second last next other another same such only own half you your yours i me my we us our he him his she her
has have had do does did can could will would shall should may might must lies lie little big small great long short
old new young high low far near good bad best better worse worst grey gray black white red green blue yellow pale dark
light bright dim deep shallow wide thin thick heavy hard soft dry wet hot warm still clear rare odd strange true false
open shut fallen broken lost hidden empty full whole round tall flat sweet bitter foul sickly fevered golden blessed
ordinary twin last ever never always once again something nothing places place end side look make guard
held march wild rough beyond arms recently visible dressing keeping reading fell north south east west s t d x ing un ar al ir os eth i ur esh ak ek im ki tu ma ni`.split(
  /\s+/,
);

function nameWords(R) {
  const out = new Set(),
    seen = new Set();
  const walk = (o, key) => {
    if (o == null) return;
    if (typeof o === 'string') {
      if (!['name', 'label', 'title', 'words', 'nouns'].includes(key)) return;
      for (const w of o.toLowerCase().match(/[a-z']+/g) || []) out.add(w.replace(/'s$/, ''));
      return;
    }
    if (typeof o !== 'object' || seen.has(o)) return;
    seen.add(o);
    for (const k in o) walk(o[k], Array.isArray(o) ? key : k);
  };
  for (const k in R.C) if (!['themes', 'looks', 'music'].includes(k)) walk(R.C[k], k);
  return out;
}
// The syllables names are built from, and whole given names: these become cat names, not cat words.
function nameParts(R, keys) {
  const parts = new Set(),
    seen = new Set();
  const walk = (o, key) => {
    if (o == null || typeof o !== 'object' || seen.has(o)) return;
    seen.add(o);
    if (Array.isArray(o) && keys.includes(key)) {
      for (const v of o) if (typeof v === 'string') for (const w of v.toLowerCase().split(/[ -]/)) parts.add(w);
      return;
    }
    for (const k in o) walk(o[k], Array.isArray(o) ? key : k);
  };
  walk(R.C, '');
  return parts;
}
function banned(R, id = 'feline') {
  const t = R.themeById(id),
    parts = nameParts(R, t.nameKeys),
    small = new Set(SMALL),
    out = new Set(CORE);
  for (const w of nameWords(R)) if (!small.has(w) && !parts.has(w) && w.length > 1) out.add(w);
  // words that are part of a proper name in content (gods' and places' own names) are names too
  return out;
}
module.exports = { banned, nameWords, CORE, SMALL };
