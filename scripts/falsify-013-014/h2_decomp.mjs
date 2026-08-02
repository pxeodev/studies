// POST-HOC decomposition of the passing H2, not a new pre-registered hypothesis.
// Q: does dow structure survive once weekday/weekend is removed? i.e. do Mon-Fri differ from EACH OTHER?
import { readFileSync, writeFileSync } from 'fs';
const DAY=86400000, B=200000, DOWN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const mulberry32=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
function bh(ps){const o=ps.map((p,k)=>({p,k})).sort((a,b)=>a.p-b.p);let prev=1;const out=[];
  for(let i=o.length-1;i>=0;i--){prev=Math.min(prev,o[i].p*o.length/(i+1));out[o[i].k]=prev;}return out;}

function build(sym){
  const bars=JSON.parse(readFileSync(`./${sym}_1h.json`,'utf8'));
  const byDay=new Map();
  for(const b of bars){const d=Math.floor(b.t/DAY)*DAY;
    if(!byDay.has(d))byDay.set(d,new Array(24).fill(null)); byDay.get(d)[new Date(b.t).getUTCHours()]=b;}
  const days=[],rng=[],vol=[];
  for(const [d,a] of [...byDay.entries()].sort((x,y)=>x[0]-y[0])){
    if(!a.every(b=>b&&b.h>0&&b.l>0&&b.v>0)) continue;
    const r=a.map(b=>Math.log(b.h/b.l)), v=a.map(b=>b.v), mr=mean(r), mv=mean(v);
    if(!(mr>0&&mv>0)) continue;
    days.push({dow:new Date(d).getUTCDay()});
    rng.push(Float64Array.from(r,x=>x/mr)); vol.push(Float64Array.from(v,x=>x/mv));
  }
  return {days,rng,vol};
}

// same whole-day block null, but the pool is restricted to a given set of dows
function testSubset(days,mat,keepDows,seed){
  const idx=[...days.keys()].filter(i=>keepDows.includes(days[i].dow));
  const dows=[...keepDows].sort(); const m=dows.length*24;
  const slot=Int32Array.from(idx.map(i=>dows.indexOf(days[i].dow)));
  const rows=idx.map(i=>mat[i]);
  const sum=new Float64Array(m), cnt=new Int32Array(m);
  for(let i=0;i<rows.length;i++){const b=slot[i]*24; for(let h=0;h<24;h++){sum[b+h]+=rows[i][h];cnt[b+h]++;}}
  // observed deviation is measured against the SUBSET's own pooled hour profile, not against 1.0
  const pool=new Float64Array(24);
  for(let h=0;h<24;h++){let s=0;for(let i=0;i<rows.length;i++)s+=rows[i][h];pool[h]=s/rows.length;}
  const obs=Array.from({length:m},(_,k)=>cnt[k]?sum[k]/cnt[k]:NaN);
  const obsDev=obs.map((v,k)=>Math.abs(v-pool[k%24]));
  const perm=Int32Array.from(rows.keys()), rnd=mulberry32(seed), ge=new Int32Array(m);
  const s2=new Float64Array(m), c2=new Int32Array(m);
  for(let p=0;p<B;p++){
    for(let i=perm.length-1;i>0;i--){const j=(rnd()*(i+1))|0;const t=perm[i];perm[i]=perm[j];perm[j]=t;}
    s2.fill(0);c2.fill(0);
    for(let i=0;i<perm.length;i++){const b=slot[i]*24,row=rows[perm[i]];
      for(let h=0;h<24;h++){s2[b+h]+=row[h];c2[b+h]++;}}
    for(let k=0;k<m;k++) if(c2[k]&&Math.abs(s2[k]/c2[k]-pool[k%24])>=obsDev[k]) ge[k]++;
  }
  const ps=Array.from(ge,g=>(g+1)/(B+1)), qs=bh(ps);
  return { m, cells:obs.map((v,k)=>({dow:DOWN[dows[Math.floor(k/24)]],hour:k%24,n:cnt[k],mean:v,pool:pool[k%24],p:ps[k],q:qs[k]})) };
}

const res={};
for(const sym of ['BTC','ETH','SOL']){
  const {days,rng,vol}=build(sym); res[sym]={};
  for(const [name,mat] of [['range',rng],['volume',vol]]){
    const wd=testSubset(days,mat,[1,2,3,4,5],20260803);   // Mon-Fri only
    const we=testSubset(days,mat,[0,6],20260804);          // Sat+Sun only
    const sWd=wd.cells.filter(c=>c.q<=0.05), sWe=we.cells.filter(c=>c.q<=0.05);
    res[sym][name]={ weekdayOnly:{m:wd.m,survivors:sWd.length,minQ:Math.min(...wd.cells.map(c=>c.q)),cells:sWd},
                     weekendOnly:{m:we.m,survivors:sWe.length,minQ:Math.min(...we.cells.map(c=>c.q))} };
    console.log(`${sym} ${name}:  Mon-Fri vs each other: ${sWd.length}/${wd.m} survive (minQ=${Math.min(...wd.cells.map(c=>c.q)).toFixed(4)})   |   Sat vs Sun: ${sWe.length}/${we.m} (minQ=${Math.min(...we.cells.map(c=>c.q)).toFixed(4)})`);
  }
}
writeFileSync('./out_014_decomp.json',JSON.stringify(res));
