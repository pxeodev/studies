// FALSIFY-014 — executes FALSIFY-014-PREREGISTRATION.md exactly. No hypotheses added.
import { readFileSync, writeFileSync } from 'fs';
const DAY=86400000;
const DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const B_HOUR=20000, B_DOW=200000;      // both satisfy B >= m/q - 1 (479 and 3359)
const mulberry32=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
function pearson(a,b){const n=a.length,ma=mean(a),mb=mean(b);let p=0,da=0,db=0;
  for(let i=0;i<n;i++){const x=a[i]-ma,y=b[i]-mb;p+=x*y;da+=x*x;db+=y*y;}return p/Math.sqrt(da*db);}
const rank=a=>{const s=a.map((v,i)=>[v,i]).sort((x,y)=>x[0]-y[0]);const r=[];s.forEach(([,i],k)=>r[i]=k);return r;};
const spearman=(a,b)=>pearson(rank(a),rank(b));
const isEDT=t=>new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',timeZoneName:'short'})
  .formatToParts(new Date(t)).find(p=>p.type==='timeZoneName').value==='EDT';

function bh(ps,q=0.05){
  const o=ps.map((p,k)=>({p,k})).sort((a,b)=>a.p-b.p); const m=o.length;
  let prev=1; const out=new Array(m);
  for(let i=m-1;i>=0;i--){ prev=Math.min(prev,o[i].p*m/(i+1)); out[o[i].k]=prev; }
  return out;
}

// ---- build day x hour matrices of day-normalised rel_range and rel_volume ----
function build(sym){
  const bars=JSON.parse(readFileSync(`./${sym}_1h.json`,'utf8'));
  const byDay=new Map();
  for(const b of bars){ const d=Math.floor(b.t/DAY)*DAY;
    if(!byDay.has(d)) byDay.set(d,new Array(24).fill(null));
    byDay.get(d)[new Date(b.t).getUTCHours()]=b; }
  const days=[], rng=[], vol=[];
  for(const [d,a] of [...byDay.entries()].sort((x,y)=>x[0]-y[0])){
    if(!a.every(b=>b && b.h>0 && b.l>0 && b.v>0)) continue;
    const r=a.map(b=>Math.log(b.h/b.l)), v=a.map(b=>b.v);
    const mr=mean(r), mv=mean(v);
    if(!(mr>0&&mv>0)) continue;
    days.push({ t:d, dow:new Date(d).getUTCDay(), edt:isEDT(d+12*3600000) });
    rng.push(Float64Array.from(r,x=>x/mr));      // centres on 1.0, day total preserved
    vol.push(Float64Array.from(v,x=>x/mv));
  }
  return { days, rng, vol };
}

const hourProfile=(mat,sel)=>{ const s=new Float64Array(24); let n=0;
  for(let i=0;i<mat.length;i++){ if(sel&&!sel(i)) continue; n++; for(let h=0;h<24;h++) s[h]+=mat[i][h]; }
  return { profile:Array.from(s,x=>x/n), n }; };

// T1/T2: within-day permutation — destroys hour identity, preserves each day's total exactly
function testHour(mat,seed){
  const { profile:obs, n:nd }=hourProfile(mat);
  const obsDev=obs.map(v=>Math.abs(v-1));
  const rnd=mulberry32(seed), ge=new Int32Array(24), col=new Float64Array(24), perm=new Int32Array(24);
  for(let p=0;p<B_HOUR;p++){
    col.fill(0);
    for(let i=0;i<mat.length;i++){
      for(let j=0;j<24;j++) perm[j]=j;
      for(let j=23;j>0;j--){const k=(rnd()*(j+1))|0;const t=perm[j];perm[j]=perm[k];perm[k]=t;}
      const row=mat[i];
      for(let j=0;j<24;j++) col[perm[j]]+=row[j];
    }
    for(let h=0;h<24;h++) if(Math.abs(col[h]/mat.length-1)>=obsDev[h]) ge[h]++;
  }
  const ps=Array.from(ge,g=>(g+1)/(B_HOUR+1));
  const qs=bh(ps);
  return obs.map((mean_,h)=>({ hour:h, n:nd, mean:mean_, p:ps[h], q:qs[h] }));
}

// T3/T4: whole-day block permutation — reassigns dow, every bar keeps its hour
function testDow(days,mat,seed){
  const sum=new Float64Array(168), cnt=new Int32Array(168);
  for(let i=0;i<mat.length;i++){ const base=days[i].dow*24;
    for(let h=0;h<24;h++){ sum[base+h]+=mat[i][h]; cnt[base+h]++; } }
  const obs=Array.from({length:168},(_,k)=>cnt[k]?sum[k]/cnt[k]:NaN);
  const obsDev=obs.map(v=>Math.abs(v-1));
  const slotDow=Int32Array.from(days.map(d=>d.dow));
  const perm=Int32Array.from(mat.keys());
  const rnd=mulberry32(seed), ge=new Int32Array(168);
  const s2=new Float64Array(168), c2=new Int32Array(168);
  for(let p=0;p<B_DOW;p++){
    for(let i=perm.length-1;i>0;i--){const j=(rnd()*(i+1))|0;const t=perm[i];perm[i]=perm[j];perm[j]=t;}
    s2.fill(0); c2.fill(0);
    for(let i=0;i<perm.length;i++){ const base=slotDow[i]*24, row=mat[perm[i]];
      for(let h=0;h<24;h++){ s2[base+h]+=row[h]; c2[base+h]++; } }
    for(let k=0;k<168;k++) if(c2[k]&&Math.abs(s2[k]/c2[k]-1)>=obsDev[k]) ge[k]++;
  }
  const ps=Array.from(ge,g=>(g+1)/(B_DOW+1));
  const qs=bh(ps);
  return obs.map((m,k)=>({ k, dow:DOW[Math.floor(k/24)], hour:k%24, n:cnt[k], mean:m, p:ps[k], q:qs[k] }));
}

const out={};
for(const sym of ['BTC','ETH','SOL']){
  const t0=Date.now();
  const { days, rng, vol }=build(sym);
  const H=Math.floor(days.length/2), T=Math.floor(days.length/3);
  const res={ nDays:days.length, span:[new Date(days[0].t).toISOString().slice(0,10), new Date(days.at(-1).t).toISOString().slice(0,10)] };

  for(const [name,mat] of [['range',rng],['volume',vol]]){
    const hour=testHour(mat, 20260801);
    const dow =testDow(days, mat, 20260802);
    // S1 split-half, S3 incremental dow value
    const p1=hourProfile(mat,i=>i<H).profile, p2=hourProfile(mat,i=>i>=H).profile;
    const cellHalf=(lo,hi)=>{const s=new Float64Array(168),c=new Int32Array(168);
      for(let i=lo;i<hi;i++){const b=days[i].dow*24; for(let h=0;h<24;h++){s[b+h]+=mat[i][h];c[b+h]++;}}
      return Array.from({length:168},(_,k)=>c[k]?s[k]/c[k]:NaN);};
    const c1=cellHalf(0,H), c2=cellHalf(H,days.length);
    // S2 three eras
    const eras=[hourProfile(mat,i=>i<T).profile, hourProfile(mat,i=>i>=T&&i<2*T).profile, hourProfile(mat,i=>i>=2*T).profile];
    // S4 DST
    const edt=hourProfile(mat,i=>days[i].edt), est=hourProfile(mat,i=>!days[i].edt);
    const peak=a=>a.indexOf(Math.max(...a));
    res[name]={ hour, dow,
      s1:{ hourPearson:pearson(p1,p2), hourSpearman:spearman(p1,p2),
           cellPearson:pearson(c1,c2), cellSpearman:spearman(c1,c2) },
      s2:{ e12:pearson(eras[0],eras[1]), e13:pearson(eras[0],eras[2]), e23:pearson(eras[1],eras[2]), eras },
      s4:{ edtPeak:peak(edt.profile), edtN:edt.n, estPeak:peak(est.profile), estN:est.n,
           edtProfile:edt.profile, estProfile:est.profile },
      profile:hourProfile(mat).profile };
    const hs=hour.filter(c=>c.q<=0.05).length, ds=dow.filter(c=>c.q<=0.05).length;
    console.log(`${sym} ${name}: hour ${hs}/24 survive (minQ=${Math.min(...hour.map(c=>c.q)).toExponential(2)}) | dow ${ds}/168 survive (minQ=${Math.min(...dow.map(c=>c.q)).toFixed(4)}) | halfR hour=${pearson(p1,p2).toFixed(3)} cell=${pearson(c1,c2).toFixed(3)} | DST peak EDT=${res[name].s4.edtPeak}:00 EST=${res[name].s4.estPeak}:00`);
  }
  out[sym]=res;
  console.log(`  ${sym} done in ${((Date.now()-t0)/1000).toFixed(0)}s (${days.length} days)\n`);
}
writeFileSync('./out_014.json', JSON.stringify(out));
console.log('written');
