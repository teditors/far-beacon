// An honest bot: walks tile by tile toward its goal, drinks at water it has seen, rests, sleeps, uses the town, fights or flees.
const { Rules } = require('./lib');
{ let a = 12345; Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; } // repeatable runs
const R=Rules,W=36;
const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
function target(s){ const q=s.quest,v=R.findSite(s,'vault');
  const loose=b=>{for(const k in s.depots) if(s.depots[k].items.some(i=>i.base===b)) return {x:k%W,y:Math.floor(k/W)}; return null;};
  if(!R.hasItem(s,'relic')){const l=loose('relic'); if(l) return l;} if(!R.hasItem(s,'key')&&!R.hasItem(s,'relic')&&!v.st.open){const l=loose('key'); if(l) return l;}
  if(R.hasItem(s,'relic')) return q.dest==='beacon'?s.goal:R.findSite(s,'shrine');
  if(v.st.open||R.hasItem(s,'key')) return v;
  if(!q.told) return s.town;
  if(q.key==='beast'){const c=s.creatures.find(c=>c.id===q.beast); if(c) return c; return v;}
  if(q.key==='ruin') return {x:q.keyTile%W,y:Math.floor(q.keyTile/W)};
  return v; }
function knownWater(s){ let best=null,bd=1e9; for(const k in s.sites){const st=s.sites[k]; if(!st.seen)continue; const ok=st.kind==='well'||st.kind==='town'||(st.kind==='spring'&&!(st.known&&st.foul&&s.player.fuel<1))||(st.kind==='ruin'&&st.water>0.5); if(!ok)continue; const p={x:k%W,y:Math.floor(k/W)},d=dist(p,s.player); if(d<bd){bd=d;best=p;}}
  for(let i=0;i<W*W;i++) if(s.seen[i]&&s.terrain[i]===4&&R.terrainInfo(s,4).drink){const p={x:i%W,y:Math.floor(i/W)},d=dist(p,s.player); if(d<bd){bd=d;best=p;}} return best?{p:best,d:bd}:null; }
function step(s,t){ const p=s.player; const opts=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({dx,dy,x:p.x+dx,y:p.y+dy})).filter(o=>o.x>=0&&o.y>=0&&o.x<W&&o.y<W);
  for(const o of opts){ const mc=R.moveCost(s,o.x,o.y); const hostile=s.creatures.some(c=>c.seen&&!c.bound&&s.species[c.sp].rare!=='docile'&&c.x===o.x&&c.y===o.y&&!(t.id&&c.id===t.id)); o.score=dist(o,t)*20+mc.mins+(hostile?400:0); }
  opts.sort((a,b)=>a.score-b.score); return R.move(s,opts[0].dx,opts[0].dy); }
function maintain(s,stats){ const p=s.player,st=R.siteHere(s);
  if(st){ if(st.kind==='spring'||st.kind==='well'||st.kind==='town'||(st.kind==='ruin'&&st.water>0.05)){ if(st.kind==='spring'&&st.known&&st.foul){ if(p.fuel>=1)R.boil(s);} else if(st.kind==='ruin'&&st.foulWater){ if(p.fuel>=1)R.boil(s);} else R.fill(s);} 
    if(['ruin','cave','cache'].includes(st.kind)&&!st.searched&&p.stamina>35) { R.search(s); stats.searches++; }
    const d=R.depotHere(s); if(d){ for(const it of d.items.slice()){ const b=R.byId(R.C.bases,it.base); if(b.quest||b.consumable||(R.slotOf(it)&&!p.items.some(i=>i.eq===R.slotOf(it))&&R.weight(s)+R.itemWeight(s,it)<R.carryCap(s)*0.7)||it.base==='waterskin') R.takeItem(s,it.id);} if(d.fuel)R.transfer(s,'fuel',-9); if(d.water)R.transfer(s,'water',-9);} }
  if(!st&&R.groundHere(s).drink&&p.water<R.waterCap(s)-0.5) R.fill(s);
  if(R.groundHere(s).gather&&p.fuel<4) R.gather(s);
  if(R.biome)0;
  if(R.biomeOf(s).melt&&p.water<1.5&&p.fuel>=2) R.melt(s);
  if(p.warmth<35&&p.fuel>=1) R.fire(s); if(s.weather.storm&&!R.inShelter(s)&&!R.groundHere(s).blind&&p.warmth<60){ const ok=[[1,0],[-1,0],[0,1],[0,-1]].find(([dx,dy])=>{const x=p.x+dx,y=p.y+dy;return x>=0&&y>=0&&x<36&&y<36&&s.terrain[y*36+x]===3;}); if(ok)R.move(s,ok[0],ok[1]); }
  if(R.atTown(s)){ if(!s.quest.told){R.talkElder(s);stats.town=R.clock(s).day;} 
    if(!R.stat(s,'nightSight',0)){const l=s.town.stock.find(i=>i.base==='lantern'); if(l&&p.coin>=R.itemValue(l)){R.buy(s,l.id);R.equip(s,l.id);}}
    for(const it of p.items.slice()) if(!it.eq&&R.slotOf(it)&&p.items.some(i=>i.eq===R.slotOf(it)&&i!==it)) R.sell(s,it.id);
    while(p.fuel<4&&p.coin>=2&&s.town.fuel>0)R.buyFuel(s);
    const sv=s.town.stock.find(i=>i.base==='salve'); if(sv&&p.coin>=R.itemValue(sv)+5)R.buy(s,sv.id);
    if(p.hp<p.hpMax*0.7&&p.coin>=5)R.inn(s); }
  if(p.stamina<25||(p.hp<p.hpMax*0.5&&R.inShelter(s))){ if(R.inShelter(s)) R.sleep(s); else R.rest(s); }
}
function fight(s,stats){ let g=0; while(s.combat&&!s.over&&g++<80){ const p=s.player,a=R.actions(s).map(x=>x.id),f=R.foe(s);
  if(p.hp<=p.hpMax*0.3){ const salve=p.items.find(i=>i.base==='salve'); if(salve){R.useItem(s,salve.id);continue;} if(a.includes('mend')&&p.mana>=3){R.mend(s);continue;} if(!s.quest||f.bound||f.key){} R.flee(s); stats.flees++; continue; }
  if(a.includes('firebolt')&&p.mana>=2)R.firebolt(s); else if(a.includes('smite')&&p.mana>=2)R.smite(s); else if(a.includes('power')&&p.stamina>30)R.power(s); else R.attack(s);} }
function play(seed){ const s=R.newGame(seed); const stats={seed,searches:0,flees:0,fights:0,town:null,deaths:[],dungeon:null,stuck:false}; let guard=0, lastTarget=null, lastD=1e9, noProg=0;
  while(guard++<2500){
    if(s.over){ if(s.over.won) break; stats.deaths.push({cause:s.over.cause+(s.over.by?':'+s.over.by:''),day:R.clock(s).day,goal:R.objective(s).text,cls:s.char.cls,lvl:s.player.level}); if(R.livesLeft(s)<=0)break; R.nextTraveller(s,R.makeChar(Math.random,s)); continue; }
    if(s.combat){ stats.fights++; fight(s,stats); continue; }
    maintain(s,stats); if(s.over||s.combat) continue;
    const p=s.player, v=R.findSite(s,'vault');
    if(v.x===p.x&&v.y===p.y){ if(!v.st.open)R.unlock(s); if(v.st.open&&v.st.depth<v.st.floors.length){ if(!R.stat(s,'nightSight',0)){ stats.noLight=(stats.noLight||0)+1; } else { if(p.hp<p.hpMax*0.6){ R.sleep(s); } R.descend(s); if(!stats.dungeon)stats.dungeon=R.clock(s).day; continue; } } }
    if(R.siteHere(s)&&R.siteHere(s).kind==='shrine'&&R.hasItem(s,'relic')) R.offer(s);
    // water safety: if water won't get us to the target, go to known water first
    let t=target(s); if(!R.stat(s,'nightSight',0)&&(v.st.open||R.hasItem(s,'key'))&&!R.hasItem(s,'relic')) t=s.town;
    const wr=R.stat(s,'waterDrain',s.tun.waterPerHour)*0.4, need=dist(p,t)*wr, kw=knownWater(s);
    const back=kw?kw.d*wr:0; if(kw&&kw.d>0&&p.water<R.waterCap(s)-0.3&&p.water<Math.min(need,back+1.2)+0.3) t=kw.p;
    if(!step(s,t)){ R.rest(s); }
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
