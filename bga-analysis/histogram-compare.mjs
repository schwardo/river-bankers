// Two-model histogram: for each metric and player-count, overlay the OLD default
// sim distribution and a TUNED sim distribution (env override) behind the real
// BGA game lines — so you can see which model's bulk sits closer to real play.
//
// Layout mirrors histogram.mjs: one section per metric, 2P/3P/4P as columns.
// Teal filled bars = old/default model; orange step outline = tuned model;
// vertical lines = actual BGA games. z-before / z-after printed per column.
//
// Usage: SIM_CPULIMIT=50 node histogram-compare.mjs [simGamesPerConfig]
//   Tuned model defaults to NAIVE_BID=1 RECALL_RELUCTANCE=0.7; override via
//   TUNED_ENV='{"NAIVE_BID":"1","RECALL_RELUCTANCE":"0.6"}'.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSimEmit } from './sim-runner.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, 'data');
const SIM = path.join(HERE, '..', 'sim.js');
const SIM_GAMES = parseInt(process.argv[2]) || 4000;
const TUNED_ENV = process.env.TUNED_ENV ? JSON.parse(process.env.TUNED_ENV)
  : { NAIVE_BID: '1', RECALL_RELUCTANCE: '0.7' };
const TUNED_LABEL = Object.entries(TUNED_ENV).map(([k, v]) => `${k}=${v}`).join(' ');

const METRICS = [
  ['turns', 'Turns played'], ['auctions', 'Auctions held'],
  ['jamAuctions', 'Jammed auctions'], ['plentyAuctions', 'Plenty auctions'],
  ['cardsBuilt', 'Structures built'], ['iconsWon', 'Icons won'],
  ['workersRecalled', 'Workers recalled'],
  ['winnerVP', 'Winner VP'], ['vpSpread', 'VP spread'],
];

const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const std = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };

function computeGroup(numP, real, base, tuned) {
  const metrics = METRICS.map(([key, label]) => {
    const bv = base.map((g) => Number(g[key])).filter(Number.isFinite);
    const tv = tuned.map((g) => Number(g[key])).filter(Number.isFinite);
    const rv = real.map((g) => Number(g[key])).filter(Number.isFinite);
    let lo = Math.min(...bv, ...tv, ...rv), hi = Math.max(...bv, ...tv, ...rv);
    if (hi === lo) hi = lo + 1;
    const nb = Math.round(Math.min(28, Math.max(8, hi - lo + 1)));
    const w = (hi - lo) / nb;
    const bins = Array.from({ length: nb }, (_, i) => ({ x0: +(lo + i * w).toFixed(2), x1: +(lo + (i + 1) * w).toFixed(2), b: 0, t: 0 }));
    const fill = (arr, k) => { for (const v of arr) { let i = Math.floor((v - lo) / w); i = Math.max(0, Math.min(nb - 1, i)); bins[i][k]++; } };
    fill(bv, 'b'); fill(tv, 't');
    const bm = mean(bv), bs = std(bv), tm = mean(tv), ts = std(tv), rm = rv.length ? mean(rv) : null;
    return {
      key, label, lo, hi, bins,
      baseMean: +bm.toFixed(2), baseSd: +bs.toFixed(2), tunedMean: +tm.toFixed(2), tunedSd: +ts.toFixed(2),
      real: rv,
      zBase: rm != null && bs > 0 ? +((rm - bm) / bs).toFixed(2) : null,
      zTuned: rm != null && ts > 0 ? +((rm - tm) / ts).toFixed(2) : null,
    };
  });
  return { numP, realN: real.length, realTables: real.map((r) => r.tableId), metrics };
}

function main() {
  const gf = path.join(DATA, 'games.jsonl');
  if (!fs.existsSync(gf)) { console.error('No data/games.jsonl. Run: node parse-games.mjs'); process.exit(1); }
  const games = fs.readFileSync(gf, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
    .filter((g) => g.hasLog && g.turns != null);
  const byP = {};
  for (const g of games) (byP[g.numP] ??= []).push(g);
  const counts = Object.keys(byP).map(Number).sort();
  if (!counts.length) { console.error('No finished games with logs yet.'); process.exit(1); }

  const groups = [];
  for (const numP of counts) {
    process.stderr.write(`Simulating ${SIM_GAMES} ${numP}P games (base + tuned)…\r`);
    const base = runSimEmit(SIM, numP, '', SIM_GAMES);
    const tuned = runSimEmit(SIM, numP, '', SIM_GAMES, { env: TUNED_ENV });
    groups.push(computeGroup(numP, byP[numP], base, tuned));
  }
  process.stderr.write(' '.repeat(60) + '\r');

  const html = PAGE.replace('__DATA__', JSON.stringify({ simN: SIM_GAMES, tunedLabel: TUNED_LABEL, groups }));
  fs.mkdirSync(DATA, { recursive: true });
  const outPath = path.join(DATA, 'histograms-compare.html');
  fs.writeFileSync(outPath, html);
  // Mean |z| improvement across scored metrics (exclude workersRecalled + length).
  const scored = new Set(['jamAuctions', 'plentyAuctions', 'cardsBuilt', 'iconsWon', 'winnerVP', 'vpSpread']);
  let sb = [], st = [];
  for (const g of groups) for (const m of g.metrics) if (scored.has(m.key) && m.zBase != null) { sb.push(Math.abs(m.zBase)); st.push(Math.abs(m.zTuned)); }
  const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  console.log(`Wrote data/histograms-compare.html — base vs tuned (${TUNED_LABEL}).`);
  console.log(`Scored mean|z|: before ${avg(sb).toFixed(2)} → after ${avg(st).toFixed(2)}.`);
}

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>River Bankers — tuned model vs. default vs. actual</title>
<style>
  :root{--bg:#f5f8f8;--surface:#fff;--surface-2:#eef3f3;--ink:#14201f;--muted:#5b6b6a;--faint:#8aa09e;--line:#dce5e4;--base:#0e8ba0;--tuned:#c0563a;--actual:#7b5cd6;--shadow:0 1px 2px rgba(18,32,31,.06),0 6px 20px rgba(18,32,31,.05);--mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;--sans:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;}
  @media (prefers-color-scheme:dark){:root{--bg:#0d151b;--surface:#16212b;--surface-2:#1b2833;--ink:#e7eef1;--muted:#93a4ab;--faint:#5f7078;--line:#26333d;--base:#34a3b5;--tuned:#e0795a;--actual:#9b7ce6;--shadow:0 1px 2px rgba(0,0,0,.3),0 8px 24px rgba(0,0,0,.28);}}
  :root[data-theme="light"]{--bg:#f5f8f8;--surface:#fff;--surface-2:#eef3f3;--ink:#14201f;--muted:#5b6b6a;--faint:#8aa09e;--line:#dce5e4;--base:#0e8ba0;--tuned:#c0563a;--actual:#7b5cd6;}
  :root[data-theme="dark"]{--bg:#0d151b;--surface:#16212b;--surface-2:#1b2833;--ink:#e7eef1;--muted:#93a4ab;--faint:#5f7078;--line:#26333d;--base:#34a3b5;--tuned:#e0795a;--actual:#9b7ce6;}
  *{box-sizing:border-box;}body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);line-height:1.5;-webkit-font-smoothing:antialiased;}
  .wrap{max-width:1080px;margin:0 auto;padding:40px 24px 72px;}
  .eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--base);font-weight:650;margin:0 0 10px;}
  h1{font-size:clamp(26px,4vw,38px);line-height:1.08;margin:0 0 12px;letter-spacing:-.02em;font-weight:700;}
  .lede{color:var(--muted);font-size:16px;max-width:64ch;margin:0;}
  .legend{display:flex;gap:20px;flex-wrap:wrap;align-items:center;margin:22px 0 4px;font-size:13.5px;color:var(--muted);}
  .legend .item{display:inline-flex;align-items:center;gap:8px;}
  .sw-bar{width:22px;height:12px;border-radius:3px;background:var(--base);}
  .sw-step{width:22px;height:12px;border:2px solid var(--tuned);border-radius:3px;background:transparent;}
  .sw-line{position:relative;width:22px;height:14px;}
  .sw-line::before{content:"";position:absolute;left:10px;top:0;width:2px;height:14px;background:var(--actual);border-radius:2px;}
  section.metric{margin-top:26px;}section.metric>h2{font-size:15px;font-weight:650;margin:0 0 10px;color:var(--ink);}
  .pcrow{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;}
  .card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:15px 16px 12px;box-shadow:var(--shadow);}
  .card.empty{display:flex;align-items:center;justify-content:center;opacity:.6;}
  .card .nodata{color:var(--faint);font-size:12.5px;font-family:var(--mono);padding:26px 0;text-align:center;}
  .card .top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:2px;}
  .card .name{font-size:14px;font-weight:620;}
  .zwrap{display:flex;gap:6px;align-items:center;}
  .zpill{font-family:var(--mono);font-size:11.5px;font-variant-numeric:tabular-nums;padding:2px 7px;border-radius:999px;border:1px solid var(--line);color:var(--muted);white-space:nowrap;}
  .zpill.base{border-color:var(--base);color:var(--base);}
  .zpill.tuned{border-color:var(--tuned);color:var(--tuned);font-weight:600;}
  canvas{width:100%;height:132px;display:block;touch-action:none;}
  .cap{font-size:12px;color:var(--muted);font-family:var(--mono);font-variant-numeric:tabular-nums;margin-top:6px;display:flex;gap:12px;flex-wrap:wrap;}
  .cap .k{color:var(--faint);}
  footer{margin-top:34px;color:var(--faint);font-size:12.5px;line-height:1.6;}
  footer code{font-family:var(--mono);background:var(--surface-2);padding:1px 5px;border-radius:4px;color:var(--muted);}
  .toggle{position:fixed;top:14px;right:14px;background:var(--surface);border:1px solid var(--line);border-radius:999px;color:var(--muted);font-size:12px;padding:6px 12px;cursor:pointer;box-shadow:var(--shadow);}
</style>
</head>
<body>
<button class="toggle" id="toggle">◐ theme</button>
<div class="wrap">
  <header>
    <p class="eyebrow">River Bankers · model tuning</p>
    <h1>Tuned model vs. the default, against real play</h1>
    <p class="lede" id="lede"></p>
    <div class="legend">
      <span class="item"><span class="sw-bar"></span> Default model</span>
      <span class="item"><span class="sw-step"></span> Tuned model</span>
      <span class="item"><span class="sw-line"></span> Actual BGA game(s)</span>
      <span class="item" style="color:var(--faint)">closer bulk to the purple lines = better fit</span>
    </div>
  </header>
  <div id="sections"></div>
  <footer id="foot"></footer>
</div>
<script>
const DATA=__DATA__;
const CSSF={light:{"--base":"#0e8ba0","--tuned":"#c0563a","--line":"#dce5e4","--faint":"#8aa09e","--actual":"#7b5cd6","--mono":"ui-monospace,Menlo,Consolas,monospace"},dark:{"--base":"#34a3b5","--tuned":"#e0795a","--line":"#26333d","--faint":"#5f7078","--actual":"#9b7ce6","--mono":"ui-monospace,Menlo,Consolas,monospace"}};
const css=(n)=>{const v=getComputedStyle(document.documentElement).getPropertyValue(n).trim();if(v)return v;const dark=(document.documentElement.getAttribute("data-theme")||(matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light"))==="dark";return CSSF[dark?"dark":"light"][n]||"";};
const fmt=(x,d=1)=>(x==null||Number.isNaN(x))?"—":Number(x).toFixed(d);
const totalReal=DATA.groups.reduce((s,g)=>s+g.realN,0);
document.getElementById("lede").textContent=\`Teal bars = the default AI's distribution; the orange outline = the tuned model (\${DATA.tunedLabel}). Purple lines mark the \${totalReal} real BGA game\${totalReal===1?"":"s"}. Each column is a player-count; \${DATA.simN.toLocaleString()} sim games per model per count.\`;

const charts=[];
const metricOrder=[];const seen=new Set();
for(const g of DATA.groups)for(const m of g.metrics){if(!seen.has(m.key)){seen.add(m.key);metricOrder.push({key:m.key,label:m.label});}}
for(const mo of metricOrder){
  const sec=document.createElement("section");sec.className="metric";sec.innerHTML=\`<h2>\${mo.label}</h2>\`;
  const row=document.createElement("div");row.className="pcrow";sec.appendChild(row);
  for(const grp of DATA.groups){
    const m=grp.metrics.find(x=>x.key===mo.key);
    const card=document.createElement("div");card.className="card";
    if(!m){card.classList.add("empty");card.innerHTML=\`<div class="nodata">\${grp.numP}P · no games</div>\`;row.appendChild(card);continue;}
    const zb=m.zBase,zt=m.zTuned,better=zb!=null&&zt!=null&&Math.abs(zt)<Math.abs(zb);
    card.innerHTML=\`<div class="top"><span class="name">\${grp.numP}P\${better?' <span style="color:var(--tuned)">✓</span>':''}</span>\`
      +\`<span class="zwrap"><span class="zpill base">z \${zb==null?'—':(zb>0?'+':'')+fmt(zb,1)}</span><span class="zpill tuned">z \${zt==null?'—':(zt>0?'+':'')+fmt(zt,1)}</span></span></div><canvas></canvas>\`
      +\`<div class="cap"><span><span class="k">actual</span> \${m.real.length?m.real.join(", "):"—"}</span><span><span class="k">def</span> \${fmt(m.baseMean)}</span><span><span class="k">tuned</span> \${fmt(m.tunedMean)}</span></div>\`;
    row.appendChild(card);
    charts.push({m,canvas:card.querySelector("canvas")});
  }
  document.getElementById("sections").appendChild(sec);
}

function draw(entry,t=1){
  const {m,canvas}=entry;
  const dpr=Math.min(devicePixelRatio||1,2),W=canvas.clientWidth,H=canvas.clientHeight;
  canvas.width=W*dpr;canvas.height=H*dpr;
  const g=canvas.getContext("2d");g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
  const padL=6,padR=6,padT=20,padB=16,pw=W-padL-padR,ph=H-padT-padB;
  const lo=m.lo,hi=m.hi,span=(hi-lo)||1,X=v=>padL+(v-lo)/span*pw;
  const maxC=Math.max(...m.bins.map(b=>Math.max(b.b,b.t)),1),baseY=padT+ph;
  g.strokeStyle=css("--line");g.lineWidth=1;g.beginPath();g.moveTo(padL,baseY+.5);g.lineTo(W-padR,baseY+.5);g.stroke();
  // default model: filled teal bars
  g.fillStyle=css("--base");g.globalAlpha=.85;
  for(const b of m.bins){if(!b.b)continue;const x0=X(b.x0)+1,x1=X(b.x1)-1,w=Math.max(1,x1-x0),h=(b.b/maxC)*ph*t,y=baseY-h,r=Math.min(3,w/2,h);
    g.beginPath();g.moveTo(x0,baseY);g.lineTo(x0,y+r);g.arcTo(x0,y,x0+r,y,r);g.lineTo(x1-r,y);g.arcTo(x1,y,x1,y+r,r);g.lineTo(x1,baseY);g.closePath();g.fill();}
  g.globalAlpha=1;
  // tuned model: orange step outline
  g.strokeStyle=css("--tuned");g.lineWidth=1.5;g.beginPath();
  let started=false;
  for(const b of m.bins){const x0=X(b.x0),x1=X(b.x1),h=(b.t/maxC)*ph*t,y=baseY-h;
    if(!started){g.moveTo(x0,baseY);started=true;}g.lineTo(x0,y);g.lineTo(x1,y);}
  if(started){const last=m.bins[m.bins.length-1];g.lineTo(X(last.x1),baseY);}
  g.stroke();
  // actual games: purple vertical lines
  g.strokeStyle=g.fillStyle=css("--actual");g.font=\`600 11px \${css("--mono")}\`;g.textAlign="center";
  m.real.forEach((rv)=>{const x=X(rv);g.lineWidth=2;
    g.beginPath();g.moveTo(x,padT-2);g.lineTo(x,baseY);g.stroke();
    g.beginPath();g.moveTo(x-4,padT-6);g.lineTo(x+4,padT-6);g.lineTo(x,padT+1);g.closePath();g.fill();
    g.fillText(String(rv),Math.max(padL+10,Math.min(W-padR-10,x)),padT-9);});
  g.fillStyle=css("--faint");g.font=\`11px \${css("--mono")}\`;
  g.textAlign="left";g.fillText(String(Math.round(lo)),padL,H-3);
  g.textAlign="right";g.fillText(String(Math.round(hi)),W-padR,H-3);
}
function render(){charts.forEach(e=>draw(e));}
const reduce=matchMedia("(prefers-reduced-motion:reduce)").matches;
if(reduce)render();else{const t0=performance.now();(function anim(now){const p=Math.min(1,(now-t0)/520),e=1-Math.pow(1-p,3);charts.forEach(en=>draw(en,e));if(p<1)requestAnimationFrame(anim);})(t0);}
addEventListener("resize",()=>{clearTimeout(window.__rz);window.__rz=setTimeout(render,120);});

document.getElementById("foot").innerHTML=\`Teal ✓ marks columns where the tuned model's real-vs-sim z shrank. Real n is small (per-count game counts in the captions) — directional, not definitive. Regenerate: <code>SIM_CPULIMIT=50 node histogram-compare.mjs</code>.\`;
const root=document.documentElement,tgl=document.getElementById("toggle");
tgl.addEventListener("click",()=>{const cur=root.getAttribute("data-theme")||(matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light");root.setAttribute("data-theme",cur==="dark"?"light":"dark");render();});
</script>
</body>
</html>`;

main();
