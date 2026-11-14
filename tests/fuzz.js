const { Rules } = require('./lib');
const R=Rules;
// 1) fuzz: random actions, catch exceptions, check save/load roundtrip
let crashes=0;
for(let seed=1;seed<=150;seed++){ let s=R.newGame(seed); const r=()=>Math.random();
  for(let i=0;i<400&&!s.over;i++){ const k=r();
    if(k<0.6){const d=[[1,0],[1,0],[0,1],[0,-1],[-1,0]][Math.floor(r()*5)];R.move(s,d[0],d[1]);}
    else if(k<0.7||s.combat){ const a=R.actions(s); const x=a[Math.floor(r()*a.length)]; if(x){ if(x.id==='pactAsk')R.pact(s); else if(x.id==='townAsk'){R.talkElder(s); if(s.town.stock[0])R.buy(s,s.town.stock[0].id); if(s.player.items[2])R.sell(s,s.player.items[2].id); R.buyFuel(s); R.inn(s);} else R[x.id](s);} }
    else if(k<0.8){ R.transfer(s,r()<.5?'water':'fuel',r()<.5?1:-1); }
    else if(k<0.9){ const d=R.depotHere(s); if(d&&d.items.length)R.takeItem(s,d.items[0].id); else if(s.player.items.length&&r()<.3)R.leaveItem(s,s.player.items[0].id); }
    else { const it=s.player.items[Math.floor(r()*s.player.items.length)]; if(it){R.useItem(s,it.id);R.study(s,it.id);R.describeItem(s,it);R.itemName(it);} }
    if(i%50===0){ s=JSON.parse(JSON.stringify(s)); }
    const p=s.player; if([p.water,p.warmth,p.stamina,p.fuel,s.time].some(v=>!isFinite(v)||v<-1e-6)){crashes++;console.log('bad value',seed,p);break;}
  } }
if (crashes) { console.log('fuzz found bad values in', crashes, 'worlds'); process.exit(1); }
console.log('fuzz ok: 150 worlds of random actions, saving and reloading every 50 steps');
