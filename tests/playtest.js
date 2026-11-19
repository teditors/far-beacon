// An honest bot: walks tile by tile toward its goal, drinks at water it has seen, rests, sleeps, uses the town, fights or flees.
const { Rules } = require('./lib');
{ let a = 12345; Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; } // repeatable runs
const R=Rules,W=36;
const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
// Every place is given in the frame of the region the bot stands in, so places in other regions lie off its edges and
// the bot walks toward them across borders.
const loc=(s,p)=>p&&p.area?R.localPos(s,p.area,p.x,p.y):p;
const door=(s)=>{const d=R.townDoor(s); return R.localPos(s,R.townArea(s),d.x,d.y);}; // the tile below the town's south side, where the road comes in
let trail=[];
function target(s){ const q=s.quest,v0=R.findSite(s,'vault'),v=Object.assign({st:v0.st},loc(s,v0));
  const loose=b=>{const l=R.findLoose(s,b); if(!l) return null; return s.areas[l.area].kind==='region'?loc(s,l):v;};
  if(!R.hasItem(s,'relic')){const l=loose('relic'); if(l) return l;} if(!R.hasItem(s,'key')&&!R.hasItem(s,'relic')&&!v.st.open){const l=loose('key'); if(l) return l;}
  if(R.hasItem(s,'relic')) return loc(s,q.dest==='beacon'?s.goal:R.findSite(s,'shrine'));
  if(v.st.open||R.hasItem(s,'key')) return v;
  if(!q.told) return door(s);
  if(q.key==='beast'){const b=R.beastOf(s); if(b) return Object.assign(loc(s,b),{id:b.c.id}); return v;}
  if(q.key==='ruin') return loc(s,R.keyRuin(s));
  return v; }
// Water it knows of: seen springs and wells here and in the regions around, in this region's frame.
function farWater(s){ let best=null,bd=1e9; for(const id in s.areas){ if(id===s.area||s.areas[id].kind!=='region'||!s.areas[id].map) continue; const m=s.areas[id].map;
  for(const k in m.sites){ const st=m.sites[k]; if(!st.seen||st.kind!=='spring'||(st.known&&st.foul)) continue; const p=R.localPos(s,id,k%W,Math.floor(k/W)),d=dist(p,s.player); if(d<bd){bd=d;best=p;} } } return best?{p:best,d:bd}:null; }
// Every water it knows of, here and in the regions around, in this region's frame.
function allWater(s){ const out=[]; for(const id in s.areas){ if(id===s.area||s.areas[id].kind!=='region'||!s.areas[id].map) continue; const m=s.areas[id].map;
    for(const k in m.sites){ const st=m.sites[k]; if(st.seen&&st.kind==='spring'&&!(st.known&&st.foul&&s.player.fuel<1)) out.push(R.localPos(s,id,k%W,Math.floor(k/W))); } }
  for(const k in s.sites){ const st=s.sites[k]; if(st.seen&&(st.kind==='well'||(st.kind==='spring'&&!(st.known&&st.foul&&s.player.fuel<1)))) out.push({x:k%W,y:Math.floor(k/W)}); }
  return out; }
function knownWater(s){ let best=null,bd=1e9; { const f=farWater(s); if(f){best=f.p;bd=f.d;} } for(const k in s.sites){const st=s.sites[k]; if(!st.seen)continue; const ok=st.kind==='well'||st.kind==='town'||(st.kind==='spring'&&!(st.known&&st.foul&&s.player.fuel<1))||(st.kind==='ruin'&&st.water>0.5); if(!ok)continue; const p=st.kind==='town'?door(s):{x:k%W,y:Math.floor(k/W)},d=dist(p,s.player); if(d<bd){bd=d;best=p;}}
  for(let i=0;i<W*W;i++) if(s.seen[i]&&s.terrain[i]===4&&R.terrainInfo(s,4).drink){const p={x:i%W,y:Math.floor(i/W)},d=dist(p,s.player); if(d<bd){bd=d;best=p;}} return best?{p:best,d:bd}:null; }
function step(s,t){ const p=s.player, out=(o)=>o.x<0||o.y<0||o.x>=W||o.y>=W; // outdoors the bot may step over a region's edge
  const opts=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({dx,dy,x:p.x+dx,y:p.y+dy})).filter(o=>out(o)?R.inOverworld(s):R.passable(s,o.x,o.y));
  if(!opts.length) return false;
  for(const o of opts){ const mc=out(o)?{mins:15}:R.moveCost(s,o.x,o.y); const hostile=s.creatures.some(c=>c.seen&&!c.bound&&s.species[c.sp].rare!=='docile'&&c.x===o.x&&c.y===o.y&&!(t.id&&c.id===t.id)); o.score=dist(o,t)*20+mc.mins+(hostile?400:0)+(trail.includes(o.y*W+o.x)?+(process.env.TP||70):0); }
  trail.push(p.y*W+p.x); if(trail.length>10) trail.shift();
  opts.sort((a,b)=>a.score-b.score); return R.move(s,opts[0].dx,opts[0].dy); }
function maintain(s,stats){ const p=s.player,st=R.siteHere(s);
  if(st){ if(st.kind==='spring'||st.kind==='well'||st.kind==='town'||(st.kind==='ruin'&&st.water>0.05)){ if(st.kind==='spring'&&st.known&&st.foul){ if(p.fuel>=1)R.boil(s);} else if(st.kind==='ruin'&&st.foulWater){ if(p.fuel>=1)R.boil(s);} else R.fill(s);} 
    if(['ruin','cave','cache'].includes(st.kind)&&!st.searched&&p.stamina>35) { R.search(s); stats.searches++; }
 }
  const d=R.depotHere(s); if(d){ for(const it of d.items.slice()){ const b=R.byId(R.C.bases,it.base); if(b.quest||b.consumable||(R.slotOf(it)&&!p.items.some(i=>i.eq===R.slotOf(it))&&R.weight(s)+R.itemWeight(s,it)<R.carryCap(s)*0.7)||it.base==='waterskin') R.takeItem(s,it.id);} if(d.fuel)R.transfer(s,'fuel',-9); if(d.water)R.transfer(s,'water',-9);}
  if(!st&&R.groundHere(s).drink&&p.water<R.waterCap(s)-0.5) R.fill(s);
  if(R.groundHere(s).gather&&p.fuel<4) R.gather(s);
  if(R.biome)0;
  if(R.biomeOf(s).melt&&p.water<1.5&&p.fuel>=2) R.melt(s);
  if(p.warmth<35&&p.fuel>=1) R.fire(s);
  // freezing in a storm in the open, where no fire will light: make for the nearest trees or shelter
  if(p.warmth<40&&s.weather.storm&&!R.inShelter(s)&&!R.groundHere(s).blind&&R.inOverworld(s)){ let best=null,bd=9; for(let y=Math.max(0,p.y-6);y<=Math.min(W-1,p.y+6);y++) for(let x=Math.max(0,p.x-6);x<=Math.min(W-1,p.x+6);x++){ const i=y*W+x,st=s.sites[i]; if((s.terrain[i]===3&&R.terrainInfo(s,3).blind)||(st&&['cave','ruin','well'].includes(st.kind))){ const d=Math.abs(x-p.x)+Math.abs(y-p.y); if(d<bd){bd=d;best={x,y};} } }
    if(best){ for(let k=0;k<bd&&!s.over&&!s.combat;k++) if(!bfsStep(s,best.x,best.y)) break; if(p.fuel>=1&&!s.combat) R.fire(s); } } if(s.weather.storm&&!R.inShelter(s)&&!R.groundHere(s).blind&&p.warmth<60){ const ok=[[1,0],[-1,0],[0,1],[0,-1]].find(([dx,dy])=>{const x=p.x+dx,y=p.y+dy;return x>=0&&y>=0&&x<36&&y<36&&s.terrain[y*36+x]===3;}); if(ok)R.move(s,ok[0],ok[1]); }
  if(R.atTown(s)&&st&&st.kind==='elder'&&!s.quest.told){R.talkElder(s);stats.town=R.clock(s).day;}
  if(R.atTown(s)&&st&&st.kind==='shop'){ stats.shopped=true;
    if(!R.stat(s,'nightSight',0)){const l=s.town.stock.find(i=>i.base==='lantern'); if(l&&p.coin>=R.itemValue(l)){R.buy(s,l.id);R.equip(s,l.id);}}
    for(const it of p.items.slice()) if(!it.eq&&R.slotOf(it)&&p.items.some(i=>i.eq===R.slotOf(it)&&i!==it)) R.sell(s,it.id);
    while(p.fuel<4&&p.coin>=2&&s.town.fuel>0)R.buyFuel(s);
    const sv=s.town.stock.find(i=>i.base==='salve'); if(sv&&p.coin>=R.itemValue(sv)+5)R.buy(s,sv.id);
  }
  if(R.atTown(s)&&st&&st.kind==='inn'){ stats.rested=true; if(p.hp<p.hpMax*0.7&&p.coin>=5)R.inn(s); }
  if(p.stamina<25||(p.hp<p.hpMax*0.5&&R.inShelter(s))){ if(R.inShelter(s)&&R.areaRec(s).kind!=='vault') R.sleep(s); else R.rest(s); }
  // too heavy to walk: drop spare gear first, then pour out water
  for(const it of p.items.slice()){ if(R.weight(s)<=R.carryCap(s))break; const b=R.byId(R.C.bases,it.base); if(!it.eq&&!b.quest&&it.base!=='waterskin'&&it.base!=='campkit') R.leaveItem(s,it.id); }
  if(R.weight(s)>R.carryCap(s)) p.water=Math.max(0,p.water-(R.weight(s)-R.carryCap(s))-0.1);
}
function fight(s,stats){ let g=0; while(s.combat&&!s.over&&g++<80){ const p=s.player,a=R.actions(s).map(x=>x.id),f=R.foe(s);
  if(p.hp<=p.hpMax*0.3){ const salve=p.items.find(i=>i.base==='salve'); if(salve){R.useItem(s,salve.id);continue;} if(a.includes('mend')&&p.mana>=3){R.mend(s);continue;} if(!s.quest||f.bound||f.key){} R.flee(s); stats.flees++; continue; }
  { const mv=R.actions(s).find(x=>x.id==='classMove'&&x.arg!=='vanish'); if(mv&&p.stamina>30&&R.classMove(s,mv.arg)) continue; } // a class's own fight move, when it can afford one
  if(a.includes('firebolt')&&p.mana>=2)R.firebolt(s); else if(a.includes('smite')&&p.mana>=2)R.smite(s); else if(a.includes('power')&&p.stamina>30)R.power(s); else R.attack(s);} }
// Inside the town or the locked place: walk the shortest open path, one step per turn.
function bfsStep(s,tx,ty){ if(tx<0||ty<0||tx>=W||ty>=W) return step(s,{x:tx,y:ty}); // a target in another region: walk toward its edge
  const prev=new Array(W*W).fill(-1),start=s.player.y*W+s.player.x,goal=ty*W+tx,q=[start]; prev[start]=start;
  while(q.length&&prev[goal]<0){ const i=q.shift(); for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const x=i%W+dx,y=Math.floor(i/W)+dy,j=y*W+x; if(R.passable(s,x,y)&&prev[j]<0){prev[j]=i;q.push(j);} } }
  if(prev[goal]<0) return false; let j=goal; while(prev[j]!==start&&j!==start) j=prev[j]; if(j===start) return true; return R.move(s,j%W-s.player.x,Math.floor(j/W)-s.player.y); }
function interior(s,stats){ const p=s.player, rec=R.areaRec(s), at=(k)=>{const f=R.findHere(s,k); return f;}, onIt=(f)=>f&&f.x===p.x&&f.y===p.y;
  if(rec.kind==='town'){ let t=!s.quest.told?at('elder'):!stats.shopped?at('shop'):(p.hp<p.hpMax*0.7&&p.coin>=5&&!stats.rested)?at('inn'):{x:18,y:R.H-1,st:{kind:'out'}}; // out by the south edge, where the road comes in
    if(p.water<R.waterCap(s)*0.95&&!stats.drank){ t=at('well'); if(onIt(t)){ R.fill(s); stats.drank=true; return; } }
    if(onIt(t)&&t.st.kind==='out'){ R.move(s,0,1); return; } if(!onIt(t)) { if(!bfsStep(s,t.x,t.y)) R.rest(s); } return; }
  // the locked place
  if(!R.stat(s,'nightSight',0)&&!R.hasItem(s,'relic')){ stats.darkness=(stats.darkness||0)+1; }
  let relicAt=null; for(const k in s.depots) if(s.depots[k].items.some(i=>i.base==='relic')) relicAt={x:k%W,y:Math.floor(k/W)};
  let t; if(R.hasItem(s,'relic')||(!R.stat(s,'nightSight',0)&&p.fuel<=0)) t=at('stairsUp')||at('exit'); else if(relicAt) t=relicAt; else t=at('stairsDown');
  if(!t) t=at('stairsUp')||at('exit');
  if(onIt(t)){ const k=t.st&&t.st.kind; if(k==='stairsDown')R.goDown(s); else if(k==='stairsUp'||k==='exit')R.goUp(s); return; }
  if(p.hp<p.hpMax*0.35){ R.rest(s); return; }
  if(!bfsStep(s,t.x,t.y)) R.rest(s); }
// NO=year,gods plays with those switches off, from world creation on, to compare a piece against the game without it
const NO={}; for(const k of (process.env.NO||'').split(',').filter(Boolean)) NO[k]=true;
function play(seed){ trail=[]; const s=R.newGame(seed,NO); const stats={seed,searches:0,flees:0,fights:0,town:null,deaths:[],dungeon:null,stuck:false}; let guard=0, lastTarget=null, lastD=1e9, noProg=0;
  while(guard++<2500){
    if(s.over){ if(s.over.won) break; stats.deaths.push({cause:s.over.cause+(s.over.by?':'+s.over.by:''),day:R.clock(s).day,goal:R.objective(s).text,cls:s.char.cls,lvl:s.player.level}); if(R.livesLeft(s)<=0)break; R.nextTraveller(s,R.makeChar(Math.random,s)); continue; }
    if(s.combat){ stats.fights++; fight(s,stats); continue; }
    maintain(s,stats); if(s.over||s.combat) continue;
    if(!R.inOverworld(s)){ interior(s,stats); continue; }
    if(s.area!==stats.lastArea){ trail=[]; stats.lastArea=s.area; }
    const p=s.player, v0=R.findSite(s,'vault'), v=Object.assign({st:v0.st},loc(s,v0)), here=R.siteHere(s);
    { const d=door(s); if(p.x===d.x&&p.y===d.y&&(!s.quest.told||p.water<R.waterCap(s)*0.85||(!R.stat(s,'nightSight',0)&&(v.st.open||R.hasItem(s,'key'))))){ stats.shopped=false; stats.rested=false; stats.drank=false; trail=[]; R.move(s,0,-1); continue; } }
    if(v.x===p.x&&v.y===p.y&&!R.hasItem(s,'relic')){ if(!v.st.open)R.unlock(s); if(v.st.open&&p.water<R.waterCap(s)*0.7){ stats.refill=true; } else if(v.st.open){ if(!R.stat(s,'nightSight',0)){ stats.noLight=(stats.noLight||0)+1; } else { if(p.hp<p.hpMax*0.6){ R.sleep(s); } R.enterVault(s); if(!stats.dungeon)stats.dungeon=R.clock(s).day; continue; } } }
    if(R.siteHere(s)&&R.siteHere(s).kind==='shrine'&&R.hasItem(s,'relic')) R.offer(s);
    // water safety: if water won't get us to the target, go to known water first
    let t=target(s); if(stats.refill){ const kw0=knownWater(s); if(kw0&&p.water<R.waterCap(s)*0.9) t=kw0.p; else stats.refill=false; } if(!R.stat(s,'nightSight',0)&&(v.st.open||R.hasItem(s,'key'))&&!R.hasItem(s,'relic')) t=door(s);
    const wr=R.stat(s,'waterDrain',s.tun.waterPerHour)*0.4, need=dist(p,t)*wr, kw=knownWater(s);
    const back=kw?kw.d*wr:0;
    // once it decides to go for water it keeps to that water (held in home-region coordinates, so a border does not
    // make it change its mind), until it has drunk or found the place dry
    { const wp=R.worldPos(s), toLocal=(g)=>({x:g.x-wp.x+p.x,y:g.y-wp.y+p.y});
      if(stats.wg){ const l=toLocal(stats.wg); if(p.water>=R.waterCap(s)-0.5||(l.x===p.x&&l.y===p.y&&++stats.wgAt>3)) stats.wg=null; else t=l; }
      else if(kw&&kw.d>0&&p.water<R.waterCap(s)-0.3&&p.water<Math.min(need,back+1.2)+0.3){ t=kw.p; stats.wg={x:kw.p.x-p.x+wp.x,y:kw.p.y-p.y+wp.y}; stats.wgAt=0; }
      else { // a long way to go: hop to the reachable water that is nearest the target
        const range=p.water/wr-2, dt=dist(p,t);
        if(dt>range){ let best=null; for(const w of allWater(s)){ const a=dist(p,w),b=dist(w,t); if(a>0&&a<=range&&b<dt-3&&(!best||b<dist(best,t))) best=w; }
          if(best){ t=best; stats.wg={x:best.x-p.x+wp.x,y:best.y-p.y+wp.y}; stats.wgAt=0; } } } }
    // near the walled town a greedy walk gets caught on the wall, so there the bot plans its way round
    const nearTown=s.area===R.townArea(s)&&Math.max(Math.abs(p.x-s.town.x),Math.abs(p.y-s.town.y))<=5;
    if(!(nearTown?bfsStep(s,t.x,t.y):step(s,t))){ R.rest(s); }
    const dd=dist(p,t); if(t===lastTarget&&dd>=lastD){ if(++noProg>40){stats.stuck=true;break;} } else noProg=0; lastTarget=t; lastD=dd;
  }
  stats.won=!!(s.over&&s.over.won); stats.days=R.clock(s).day; stats.travellers=s.travellers; stats.shape=s.quest.key+'/'+s.quest.vault.id+'/'+s.quest.dest; stats.biome=s.biome; stats.lastGoal=R.objective(s).text; return stats; }
const N=+process.argv[2]||150, res=[]; for(let i=1;i<=N;i++){ const t0=Date.now(); res.push(play(i*13+(+process.env.OFF||5))); if(Date.now()-t0>3000) console.log("slow seed",i*13+5,Date.now()-t0); }
const won=res.filter(r=>r.won); console.log('won',won.length,'/',N,' avg days',(won.reduce((a,r)=>a+r.days,0)/Math.max(1,won.length)).toFixed(1),' avg travellers used',(won.reduce((a,r)=>a+r.travellers,0)/Math.max(1,won.length)).toFixed(2));
const deaths={},goals={},cls={}; for(const r of res) for(const d of r.deaths){ const k=d.cause.replace(/:.*(Brute|Hound|Wight|Serpent)$/,':$1'); deaths[k]=(deaths[k]||0)+1; goals[d.goal.split(',')[0].replace(/the [A-Z].*/,'')]=(goals[d.goal]||0)+1; cls[d.cls]=(cls[d.cls]||0)+1; }
console.log('deaths by cause',JSON.stringify(deaths)); console.log('deaths during goal',JSON.stringify(goals)); console.log('deaths by class',JSON.stringify(cls));
console.log('stuck',res.filter(r=>r.stuck).length,' lost worlds',res.filter(r=>!r.won&&!r.stuck).length, ' avg fights',(res.reduce((a,r)=>a+r.fights,0)/N).toFixed(1),' flees',(res.reduce((a,r)=>a+r.flees,0)/N).toFixed(1));
const byBiome={}; for(const r of res){byBiome[r.biome]=byBiome[r.biome]||[0,0]; byBiome[r.biome][0]++; if(r.won)byBiome[r.biome][1]++;} console.log('wins by biome',JSON.stringify(byBiome));
const byKey={}; for(const r of res){const k=r.shape.split('/')[0]; byKey[k]=byKey[k]||[0,0]; byKey[k][0]++; if(r.won)byKey[k][1]++;} console.log('wins by key holder',JSON.stringify(byKey));
console.log('stuck examples',res.filter(r=>r.stuck).slice(0,4).map(r=>r.seed+' '+r.lastGoal).join(' | '));
console.log('noLight runs',res.filter(r=>r.noLight).length);
