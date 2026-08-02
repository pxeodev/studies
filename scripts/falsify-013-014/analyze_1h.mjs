// FALSIFY-013 as originally pre-registered: 168-cell dow x hour, Binance spot 1h.
import { readFileSync, writeFileSync } from 'fs';

const DIR=process.env.F013_DATA || '.';
const HOUR=3600000, DAY=86400000, NPERM=200000, NCELL=168;
const DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const idx=(d,h)=>d*24+h;
const mulberry32=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};

// ---- day matrix: keep only days with all 24 bars whose PREDECESSOR day is also complete,
//      so every retained day yields exactly 24 valid close-to-close returns (hours 0..23). ----
function buildDays(bars){
  const byDay=new Map();
  for(const b of bars){
    const d=Math.floor(b.t/DAY)*DAY;
    if(!byDay.has(d)) byDay.set(d,new Array(24).fill(null));
    byDay.get(d)[new Date(b.t).getUTCHours()]=b.c;
  }
  const complete=new Set([...byDay.entries()].filter(([,a])=>a.every(v=>v>0)).map(([d])=>d));
  const days=[];
  for(const d of [...complete].sort((a,b)=>a-b)){
    if(!complete.has(d-DAY)) continue;             // need prev day's 23:00 close for the 00:00 return
    const prev=byDay.get(d-DAY), cur=byDay.get(d);
    const r=new Float64Array(24);
    r[0]=Math.log(cur[0]/prev[23]);
    for(let h=1;h<24;h++) r[h]=Math.log(cur[h]/cur[h-1]);
    days.push({ t:d, dow:new Date(d).getUTCDay(), r });
  }
  return { days, totalDays:byDay.size, completeDays:complete.size };
}

function cellStats(days){
  const sum=new Float64Array(NCELL), sq=new Float64Array(NCELL), n=new Int32Array(NCELL);
  for(const day of days) for(let h=0;h<24;h++){
    const k=idx(day.dow,h), v=day.r[h];
    sum[k]+=v; sq[k]+=v*v; n[k]++;
  }
  const out=[];
  for(let k=0;k<NCELL;k++){
    const mean=n[k]?sum[k]/n[k]:NaN;
    const varr=n[k]>1?(sq[k]-n[k]*mean*mean)/(n[k]-1):NaN;
    out.push({ k, dow:DOW[Math.floor(k/24)], hour:k%24, n:n[k], mean, sd:Math.sqrt(varr) });
  }
  return out;
}

// 24h-block permutation: shuffle whole days across dow slots; every bar keeps its hour.
function permTest(days){
  const obs=cellStats(days);
  const obsAbs=Float64Array.from(obs.map(c=>Math.abs(c.mean)));
  const slotDow=Int32Array.from(days.map(d=>d.dow));      // label sequence, held fixed
  const mat=days.map(d=>d.r);                             // return blocks, shuffled
  const perm=Int32Array.from(mat.keys());
  const rng=mulberry32(20260801);
  const ge=new Int32Array(NCELL);
  const sum=new Float64Array(NCELL), n=new Int32Array(NCELL);
  for(let p=0;p<NPERM;p++){
    for(let i=perm.length-1;i>0;i--){const j=(rng()*(i+1))|0;const t=perm[i];perm[i]=perm[j];perm[j]=t;}
    sum.fill(0); n.fill(0);
    for(let i=0;i<perm.length;i++){
      const base=slotDow[i]*24, r=mat[perm[i]];
      for(let h=0;h<24;h++){ sum[base+h]+=r[h]; n[base+h]++; }
    }
    for(let k=0;k<NCELL;k++) if(n[k] && Math.abs(sum[k]/n[k])>=obsAbs[k]) ge[k]++;
  }
  obs.forEach((c,k)=>{ c.p=(ge[k]+1)/(NPERM+1); });
  return obs;
}

function bh(cells){
  const s=cells.filter(c=>Number.isFinite(c.p)).sort((a,b)=>a.p-b.p);
  let prev=1;
  for(let i=s.length-1;i>=0;i--){ prev=Math.min(prev,s[i].p*s.length/(i+1)); s[i].q=prev; }
}

// regime: BTC daily SuperTrend, lagged 1 day (no same-close leakage)
// OPTIONAL. The regime-conditional split needs a CoinRotator SuperTrend table, which is not
// public. It is a side analysis: no permutation test was run on it and it carries none of the
// headline results. Without a DB the script runs everything else and reports the split as null.
const REGIME=new Map();
if (process.env.CR_DATABASE_URL) {
  const { default: postgres } = await import('postgres');
  const sql = postgres(process.env.CR_DATABASE_URL);
  const rrows = await sql`
    SELECT to_char(date,'YYYY-MM-DD') AS day, trend FROM "SuperTrend"
    WHERE "coinId"='bitcoin' AND flavor='CoinRotator' AND interval='1d'
      AND "quoteSymbol"='usd' AND weekly=false ORDER BY date`;
  await sql.end();
  for (let i=1;i<rrows.length;i++) REGIME.set(rrows[i].day, rrows[i-1].trend);
  console.log(`regime days: ${REGIME.size} (${rrows[0].day} -> ${rrows.at(-1).day})`);
} else {
  console.log('regime split skipped (set CR_DATABASE_URL to enable) - headline results unaffected');
}

const report={};
for(const sym of ['BTC','ETH','SOL']){
  const bars=JSON.parse(readFileSync(`${DIR}/${sym}_1h.json`,'utf8'));
  const { days, totalDays, completeDays }=buildDays(bars);
  const iso=t=>new Date(t).toISOString().slice(0,10);

  const cut3=days.at(-1).t-90*DAY;
  const d3=days.filter(d=>d.t>=cut3);

  const half=Math.floor(days.length/2);
  const h1=cellStats(days.slice(0,half)), h2=cellStats(days.slice(half));
  let agree=0, comparable=0;
  for(let k=0;k<NCELL;k++){
    if(Number.isFinite(h1[k].mean)&&Number.isFinite(h2[k].mean)){
      comparable++; if(Math.sign(h1[k].mean)===Math.sign(h2[k].mean)) agree++;
    }
  }

  const t0=Date.now();
  const full=permTest(days); bh(full);
  const up=days.filter(d=>REGIME.get(iso(d.t))==='UP');
  const dn=days.filter(d=>REGIME.get(iso(d.t))==='DOWN');

  report[sym]={
    bars:bars.length, totalDays, completeDays, usedDays:days.length,
    returns:days.length*24, span:[iso(days[0].t), iso(days.at(-1).t)],
    w3mo:{ cut:iso(cut3), days:d3.length, cells:cellStats(d3) },
    full, half1:h1, half2:h2,
    signAgreement:{ agree, comparable, rate:agree/comparable },
    regime:{ upDays:up.length, downDays:dn.length,
             unmappedDays:days.filter(d=>!REGIME.has(iso(d.t))).length,
             up:cellStats(up), down:cellStats(dn) },
  };
  const surv=full.filter(c=>c.q<=0.05);
  console.log(`${sym}: ${days.length} days (${completeDays} complete of ${totalDays}), ${days.length*24} returns, ${iso(days[0].t)}..${iso(days.at(-1).t)}`);
  console.log(`   n/cell=${Math.min(...full.map(c=>c.n))}-${Math.max(...full.map(c=>c.n))}  signAgree=${agree}/${comparable} (${(agree/comparable*100).toFixed(1)}%)`);
  console.log(`   minP=${Math.min(...full.map(c=>c.p)).toFixed(4)} minQ=${Math.min(...full.map(c=>c.q)).toFixed(4)}  survivors=${surv.length}${surv.length?': '+surv.map(c=>c.dow+String(c.hour).padStart(2,'0')+'Z').join(','):''}`);
  console.log(`   regime UP=${up.length}d DOWN=${dn.length}d unmapped=${report[sym].regime.unmappedDays}d  [perm ${((Date.now()-t0)/1000).toFixed(1)}s]`);
}
writeFileSync(`${DIR}/out_1h_200k.json`, JSON.stringify(report));
console.log('written');
