// Walk the whole quest in every world by teleporting between objectives, to prove each rolled variant can be completed.
const { Rules } = require('./lib');
const R=Rules; const tally={}; let fail=0;
function go(s,x,y){ s.player.x=x; s.player.y=y; }
function fight(s){ let g=0; while(s.combat&&!s.over&&g++<400){ s.player.hp=s.player.hpMax=999; R.attack(s);} }
for(let seed=1;seed<=200;seed++){ const s=R.newGame(seed), q=s.quest; s.tun.carryCap=999; s.player.hp=s.player.hpMax=999; const key=q.key+'/'+q.vault.id+'/'+q.dest; tally[key]=(tally[key]||0)+1;
  const take=()=>{const d=R.depotHere(s); if(d) for(const it of d.items.slice()) R.takeItem(s,it.id);};
  go(s,s.town.x,s.town.y); R.talkElder(s);
  if(q.key==='ruin'){ go(s,q.keyTile%36,Math.floor(q.keyTile/36)); s.player.stamina=100; R.search(s); take(); }
  if(q.key==='beast'){ const c=s.creatures.find(c=>c.id===90); go(s,c.x-1>=0?c.x-1:c.x+1,c.y); s.player.stamina=100; R.move(s,c.x-s.player.x,0); fight(s); take(); }
  const v=R.findSite(s,'vault'); go(s,v.x,v.y); R.unlock(s);
  if(!R.stat(s,'nightSight',0)){ const l=s.town.stock.find(i=>i.base==='lantern'); s.player.coin=99; go(s,s.town.x,s.town.y); R.buy(s,l.id); R.equip(s,l.id); s.player.fuel=3; go(s,v.x,v.y); }
  let g=0; while(v.st.depth<v.st.floors.length&&!s.over&&g++<20){ s.player.hp=s.player.hpMax; R.descend(s); fight(s);} take();
  const d=q.dest==='beacon'?s.goal:R.findSite(s,'shrine'); go(s,d.x-1,d.y); s.player.stamina=100;s.player.water=5; R.move(s,1,0); fight(s); if(q.dest==='shrine') R.offer(s);
  if(!(s.over&&s.over.won)){ fail++; if(fail<4) console.log('FAIL',seed,key,JSON.stringify(s.over),JSON.stringify(R.objective(s)),s.log.slice(-2).map(l=>l.msg).join(' | ').slice(0,300)); } }
console.log('variants',JSON.stringify(tally),'failures',fail);
const s=R.newGame(11); console.log(s.town.name, s.town.elder, s.town.merchant, JSON.stringify(R.objective(s)), s.town.stock.map(i=>R.itemName(i)+' '+R.itemValue(i)).join(', '));
s.player.x=s.town.x;s.player.y=s.town.y;R.talkElder(s);console.log(s.town.speech.join('\n'),'\n',JSON.stringify(R.objective(s)));
