// Render a standalone HTML page overlaying each finished BGA game on the
// simulator's distribution for that metric — so the overlap (or divergence) is
// visible at a glance. One section per player-count, teal bars = simulated
// distribution, amber line(s) = actual game(s), dashed line = sim mean, z = how
// many sim standard deviations the real mean sits from the sim mean.
//
// Reads data/games.jsonl (finished games) + runs the sim `emit` mode per
// player-count; writes a self-contained data/histograms.html (no external deps).
//
// Usage: node histogram.mjs [simGamesPerConfig]   (default 4000)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSimEmit } from './sim-runner.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, 'data');
const SIM = path.join(HERE, '..', 'sim.js');
const SIM_GAMES = parseInt(process.argv[2]) || 4000;

const METRICS = [
  ['turns', 'Turns played'], ['auctions', 'Auctions held'],
  ['jamAuctions', 'Jammed auctions'], ['plentyAuctions', 'Plenty auctions'],
  ['cardsBuilt', 'Structures built'], ['iconsWon', 'Icons won'],
  ['workersRecalled', 'Workers recalled'],
  ['winnerVP', 'Winner VP'], ['vpSpread', 'VP spread'],
];

const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const std = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };

// Sim distribution uses the --human preset (OVERBID=0.5, RECALL_RELUCTANCE=1.0),
// the profile calibrated to real BGA play; set RB_SIM_DEFAULT=1 for the old AI.
const SIM_HUMAN = process.env.RB_SIM_DEFAULT !== '1';
function simDistribution(numP) {
  return runSimEmit(SIM, numP, '', SIM_GAMES, { human: SIM_HUMAN });
}

function computeGroup(numP, real, sim) {
  const metrics = METRICS.map(([key, label]) => {
    const sv = sim.map((g) => Number(g[key])).filter(Number.isFinite);
    const rv = real.map((g) => Number(g[key])).filter(Number.isFinite);
    let lo = Math.min(...sv, ...rv), hi = Math.max(...sv, ...rv);
    if (hi === lo) hi = lo + 1;
    const nb = Math.round(Math.min(28, Math.max(8, hi - lo + 1)));
    const w = (hi - lo) / nb;
    const bins = Array.from({ length: nb }, (_, i) => ({ x0: +(lo + i * w).toFixed(2), x1: +(lo + (i + 1) * w).toFixed(2), c: 0 }));
    for (const v of sv) { let i = Math.floor((v - lo) / w); i = Math.max(0, Math.min(nb - 1, i)); bins[i].c++; }
    const sm = mean(sv), ss = std(sv);
    return { key, label, lo, hi, bins, simMean: +sm.toFixed(2), simSd: +ss.toFixed(2), real: rv, z: ss > 0 ? +((mean(rv) - sm) / ss).toFixed(2) : 0 };
  });
  return { numP, simN: sim.length, realN: real.length, realTables: real.map((r) => r.tableId), metrics };
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
    process.stderr.write(`Simulating ${SIM_GAMES} ${numP}P games…\r`);
    groups.push(computeGroup(numP, byP[numP], simDistribution(numP)));
  }
  process.stderr.write(' '.repeat(44) + '\r');

  const html = PAGE.replace('__DATA__', JSON.stringify({ simN: SIM_GAMES, groups, profile: SIM_HUMAN ? 'human' : 'default' }));
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(path.join(DATA, 'histograms.html'), html);
  const flagged = groups.flatMap((g) => g.metrics.filter((m) => Math.abs(m.z) >= 2).map((m) => `${g.numP}P ${m.label}`));
  console.log(`Wrote data/histograms.html — ${groups.map((g) => `${g.numP}P: ${g.realN} real`).join(', ')}.`);
  if (flagged.length) console.log(`Diverging (|z|>=2): ${flagged.join(', ')}`);
  console.log('Open it: any browser, or the console file preview.');
}

// --- the self-contained page (full standalone document) ----------------------
const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>River Bankers — simulation vs. actual play</title>
<style>
  :root {
    --bg:#f5f8f8; --surface:#fff; --surface-2:#eef3f3; --ink:#14201f; --muted:#5b6b6a;
    --faint:#8aa09e; --line:#dce5e4; --sim:#0e8ba0; --actual:#b9741c;
    --shadow:0 1px 2px rgba(18,32,31,.06),0 6px 20px rgba(18,32,31,.05);
    --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
    --sans:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  }
  @media (prefers-color-scheme:dark){:root{
    --bg:#0d151b; --surface:#16212b; --surface-2:#1b2833; --ink:#e7eef1; --muted:#93a4ab;
    --faint:#5f7078; --line:#26333d; --sim:#34a3b5; --actual:#c2842e;
    --shadow:0 1px 2px rgba(0,0,0,.3),0 8px 24px rgba(0,0,0,.28);}}
  :root[data-theme="light"]{--bg:#f5f8f8;--surface:#fff;--surface-2:#eef3f3;--ink:#14201f;--muted:#5b6b6a;--faint:#8aa09e;--line:#dce5e4;--sim:#0e8ba0;--actual:#b9741c;--shadow:0 1px 2px rgba(18,32,31,.06),0 6px 20px rgba(18,32,31,.05);}
  :root[data-theme="dark"]{--bg:#0d151b;--surface:#16212b;--surface-2:#1b2833;--ink:#e7eef1;--muted:#93a4ab;--faint:#5f7078;--line:#26333d;--sim:#34a3b5;--actual:#c2842e;--shadow:0 1px 2px rgba(0,0,0,.3),0 8px 24px rgba(0,0,0,.28);}
  *{box-sizing:border-box;} body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);line-height:1.5;-webkit-font-smoothing:antialiased;}
  .wrap{max-width:1080px;margin:0 auto;padding:40px 24px 72px;}
  .eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--sim);font-weight:650;margin:0 0 10px;}
  h1{font-size:clamp(26px,4vw,38px);line-height:1.08;margin:0 0 12px;letter-spacing:-.02em;text-wrap:balance;font-weight:700;}
  .lede{color:var(--muted);font-size:16px;max-width:62ch;margin:0;}
  .chips{display:flex;flex-wrap:wrap;gap:8px;margin:22px 0 4px;}
  .chip{display:inline-flex;align-items:baseline;gap:7px;background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:6px 13px;font-size:13px;color:var(--muted);box-shadow:var(--shadow);}
  .chip b{color:var(--ink);font-family:var(--mono);font-weight:600;font-variant-numeric:tabular-nums;}
  .legend{display:flex;gap:20px;flex-wrap:wrap;align-items:center;margin:24px 0 4px;font-size:13.5px;color:var(--muted);}
  .legend .item{display:inline-flex;align-items:center;gap:8px;}
  .sw-bar{width:22px;height:12px;border-radius:3px;background:var(--sim);}
  .sw-line{position:relative;width:22px;height:14px;}
  .sw-line::before{content:"";position:absolute;left:10px;top:0;width:2px;height:14px;background:var(--actual);border-radius:2px;}
  .sw-line::after{content:"";position:absolute;left:6px;top:-1px;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid var(--actual);}
  section.metric{margin-top:26px;} section.metric>h2{font-size:15px;font-weight:650;margin:0 0 10px;color:var(--ink);display:flex;align-items:baseline;gap:10px;}
  .pcrow{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;}
  .card.empty{display:flex;align-items:center;justify-content:center;opacity:.6;}
  .card .nodata{color:var(--faint);font-size:12.5px;font-family:var(--mono);padding:26px 0;text-align:center;}
  .gameslegend{display:flex;flex-wrap:wrap;gap:18px;margin:18px 0 2px;font-size:12.5px;color:var(--muted);}
  .gameslegend .pcgroup{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;}
  .gameslegend .pcgroup b{color:var(--ink);font-family:var(--mono);}
  .gameslegend .g{font-family:var(--mono);font-size:12px;}
  .card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:15px 16px 12px;box-shadow:var(--shadow);}
  .card .top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:2px;}
  .card .name{font-size:14px;font-weight:620;letter-spacing:-.01em;}
  .zpill{font-family:var(--mono);font-size:12px;font-variant-numeric:tabular-nums;padding:2px 8px;border-radius:999px;border:1px solid var(--line);color:var(--muted);white-space:nowrap;}
  .zpill.far{border-color:var(--actual);color:var(--actual);font-weight:600;}
  canvas{width:100%;height:132px;display:block;touch-action:none;}
  .cap{font-size:12.5px;color:var(--muted);font-family:var(--mono);font-variant-numeric:tabular-nums;margin-top:6px;display:flex;gap:12px;flex-wrap:wrap;}
  .cap .k{color:var(--faint);} .cap .actual{color:var(--actual);}
  .tooltip{position:fixed;z-index:20;pointer-events:none;opacity:0;background:var(--ink);color:var(--surface);border-radius:8px;padding:7px 10px;font-size:12px;font-family:var(--mono);line-height:1.4;box-shadow:0 6px 20px rgba(0,0,0,.3);transition:opacity .1s;max-width:240px;}
  .tooltip b{color:var(--surface);}
  footer{margin-top:34px;color:var(--faint);font-size:12.5px;line-height:1.6;}
  footer code{font-family:var(--mono);background:var(--surface-2);padding:1px 5px;border-radius:4px;color:var(--muted);}
  .toggle{position:fixed;top:14px;right:14px;background:var(--surface);border:1px solid var(--line);border-radius:999px;color:var(--muted);font-size:12px;padding:6px 12px;cursor:pointer;box-shadow:var(--shadow);font-family:var(--sans);}
</style>
</head>
<body>
<button class="toggle" id="toggle">◐ theme</button>
<div class="wrap">
  <header>
    <p class="eyebrow">River Bankers · simulation vs. actual play</p>
    <h1>How real games compare to the model</h1>
    <p class="lede" id="lede"></p>
    <div class="chips" id="chips"></div>
    <div class="legend">
      <span class="item"><span class="sw-bar"></span> Simulated distribution</span>
      <span class="item"><span class="sw-line"></span> Actual — from BGA (one color per game)</span>
      <span class="item" style="color:var(--faint)">z = distance from sim mean, in sim standard deviations</span>
    </div>
    <div class="gameslegend" id="gameslegend"></div>
  </header>
  <div id="sections"></div>
  <footer id="foot"></footer>
</div>
<div class="tooltip" id="tt"></div>
<script>
const DATA = __DATA__;
// Canvas reads its colors from the CSS tokens; when this page is embedded in a
// wrapper where getComputedStyle can't resolve the custom properties (e.g. an
// artifact host), fall back to explicit per-theme values so the bars/axes/mean
// still draw (the overlay lines use hard-coded hex and were never affected).
const CSS_FALLBACK={light:{"--sim":"#0e8ba0","--line":"#dce5e4","--faint":"#8aa09e","--actual":"#b9741c","--mono":"ui-monospace,Menlo,Consolas,monospace"},
  dark:{"--sim":"#34a3b5","--line":"#26333d","--faint":"#5f7078","--actual":"#c2842e","--mono":"ui-monospace,Menlo,Consolas,monospace"}};
const css=(n)=>{
  const v=getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  if(v) return v;
  const dark=(document.documentElement.getAttribute("data-theme")||(matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light"))==="dark";
  return (CSS_FALLBACK[dark?"dark":"light"][n])||"";
};
const fmt=(x,d=1)=>(x==null||Number.isNaN(x))?"—":Number(x).toFixed(d);
const tt=document.getElementById("tt");
const reduce=matchMedia("(prefers-reduced-motion:reduce)").matches;
const totalReal=DATA.groups.reduce((s,g)=>s+g.realN,0);
// Distinct per-game colors (readable on both themes); cycles if >palette.
const PALETTE=["#b9741c","#c0397b","#3b9e5b","#7b5cd6","#c0563a","#2f8f8f"];
const realColor=(i)=>PALETTE[i%PALETTE.length];

document.getElementById("lede").textContent =
  \`Teal bars bin \${DATA.simN.toLocaleString()} simulated games per player-count \`
  + \`(\${DATA.profile==="human"?"--human profile: OVERBID=0.5, RECALL_RELUCTANCE=1.0":"default AI"}); each amber line marks one of \`
  + \`\${totalReal} completed BGA game\${totalReal===1?"":"s"}. Where a line sits off the bulk of the bars, real play and the model disagree.\`;
const chips=document.getElementById("chips");
[["Simulated / config",DATA.simN.toLocaleString()],["Actual games",String(totalReal)],
 ["Player counts",DATA.groups.map(g=>g.numP+"P").join(" · ")]]
 .forEach(([k,v])=>{const c=document.createElement("span");c.className="chip";c.innerHTML=\`\${k} <b>\${v}</b>\`;chips.appendChild(c);});

// Assign every real game a globally-unique color, so a game keeps its color
// across every metric chart. Colors are grouped by player-count for the legend.
let __cc=0; const colorIdx={};
for(const g of DATA.groups) colorIdx[g.numP]=g.realTables.map(()=>__cc++);
const colorFor=(numP,i)=>realColor(colorIdx[numP][i]);

// Per-player-count game legend (color ■ tableId), shown once under the header.
const gl=document.getElementById("gameslegend");
for(const g of DATA.groups){
  const grp=document.createElement("span");grp.className="pcgroup";
  const games=g.realTables.map((t,i)=>\`<span class="g"><span style="color:\${colorFor(g.numP,i)}">■</span> \${t}</span>\`).join("&nbsp;&nbsp;");
  grp.innerHTML=\`<b>\${g.numP}P</b> \${games||'<span class="g" style="color:var(--faint)">none</span>'}\`;
  gl.appendChild(grp);
}

// Master metric order (union across player-counts, preserving first appearance).
const metricOrder=[]; const __seen=new Set();
for(const g of DATA.groups) for(const m of g.metrics){ if(!__seen.has(m.key)){__seen.add(m.key);metricOrder.push({key:m.key,label:m.label});} }

const charts=[];
for(const mo of metricOrder){
  const sec=document.createElement("section");sec.className="metric";
  sec.innerHTML=\`<h2>\${mo.label}</h2>\`;
  const row=document.createElement("div");row.className="pcrow";sec.appendChild(row);
  for(const grp of DATA.groups){
    const m=grp.metrics.find(x=>x.key===mo.key);
    const card=document.createElement("div");card.className="card";
    if(!m){card.classList.add("empty");card.innerHTML=\`<div class="nodata">\${grp.numP}P · no games</div>\`;row.appendChild(card);continue;}
    const cols=m.real.map((_,i)=>colorFor(grp.numP,i));
    const far=Math.abs(m.z)>=2, arrow=m.z>0?"▲":m.z<0?"▼":"·";
    card.innerHTML=\`<div class="top"><span class="name">\${grp.numP}P</span><span class="zpill \${far?"far":""}">z \${m.z>0?"+":""}\${fmt(m.z,2)} \${arrow}</span></div><canvas></canvas>\`
      +\`<div class="cap"><span><span class="k">actual</span> \${m.real.length?m.real.map((rv,i)=>\`<span style="color:\${cols[i]}">\${rv}</span>\`).join(", "):"—"}</span><span><span class="k">sim</span> \${fmt(m.simMean)} <span class="k">±</span> \${fmt(m.simSd)}</span></div>\`;
    row.appendChild(card);
    charts.push({m,canvas:card.querySelector("canvas"),simN:grp.simN,colors:cols});
  }
  document.getElementById("sections").appendChild(sec);
}

function draw(entry,t=1){
  const {m,canvas}=entry;
  const cols=entry.colors||m.real.map((_,i)=>realColor(i));
  const dpr=Math.min(devicePixelRatio||1,2), W=canvas.clientWidth, H=canvas.clientHeight;
  canvas.width=W*dpr;canvas.height=H*dpr;
  const g=canvas.getContext("2d");g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
  const padL=6,padR=6,padT=20,padB=16,pw=W-padL-padR,ph=H-padT-padB;
  const lo=m.lo,hi=m.hi,span=(hi-lo)||1,X=v=>padL+(v-lo)/span*pw;
  const maxC=Math.max(...m.bins.map(b=>b.c),1),baseY=padT+ph;
  g.strokeStyle=css("--line");g.lineWidth=1;g.beginPath();g.moveTo(padL,baseY+.5);g.lineTo(W-padR,baseY+.5);g.stroke();
  g.fillStyle=css("--sim");
  for(const b of m.bins){if(!b.c)continue;const x0=X(b.x0)+1,x1=X(b.x1)-1,w=Math.max(1,x1-x0),h=(b.c/maxC)*ph*t,y=baseY-h,r=Math.min(3,w/2,h);
    g.beginPath();g.moveTo(x0,baseY);g.lineTo(x0,y+r);g.arcTo(x0,y,x0+r,y,r);g.lineTo(x1-r,y);g.arcTo(x1,y,x1,y+r,r);g.lineTo(x1,baseY);g.closePath();g.fill();}
  g.strokeStyle=css("--sim");g.globalAlpha=.5;g.lineWidth=1;g.setLineDash([3,3]);
  g.beginPath();g.moveTo(X(m.simMean),padT-4);g.lineTo(X(m.simMean),baseY);g.stroke();g.setLineDash([]);g.globalAlpha=1;
  g.font=\`600 11px \${css("--mono")}\`;g.textAlign="center";
  m.real.forEach((rv,i)=>{const x=X(rv);g.fillStyle=g.strokeStyle=cols[i];g.lineWidth=2;
    g.beginPath();g.moveTo(x,padT-2);g.lineTo(x,baseY);g.stroke();
    g.beginPath();g.moveTo(x-4,padT-6);g.lineTo(x+4,padT-6);g.lineTo(x,padT+1);g.closePath();g.fill();
    g.fillText(String(rv),Math.max(padL+10,Math.min(W-padR-10,x)),padT-9);});
  g.fillStyle=css("--faint");g.font=\`11px \${css("--mono")}\`;
  g.textAlign="left";g.fillText(String(Math.round(lo)),padL,H-3);
  g.textAlign="right";g.fillText(String(Math.round(hi)),W-padR,H-3);
}
function render(){charts.forEach(e=>draw(e));}
if(reduce)render();
else{const t0=performance.now();(function anim(now){const p=Math.min(1,(now-t0)/520),e=1-Math.pow(1-p,3);charts.forEach(en=>draw(en,e));if(p<1)requestAnimationFrame(anim);})(t0);}
addEventListener("resize",()=>{clearTimeout(window.__rz);window.__rz=setTimeout(render,120);});

for(const entry of charts){const {m,canvas,simN}=entry;
  canvas.addEventListener("mousemove",(ev)=>{
    const r=canvas.getBoundingClientRect(),W=r.width,padL=6,padR=6,pw=W-padL-padR,span=(m.hi-m.lo)||1,px=ev.clientX-r.left;
    const val=m.lo+(px-padL)/pw*span,bin=m.bins.find(b=>val>=b.x0&&val<b.x1)||m.bins[m.bins.length-1];
    const pct=(100*bin.c/simN).toFixed(1);
    const near=m.real.find(rv=>Math.abs(px-(padL+(rv-m.lo)/span*pw))<7);
    tt.innerHTML=near!=null?\`<b>Actual: \${near}</b><br>z \${m.z>0?"+":""}\${m.z} vs sim\`:\`sim <b>\${Math.round(bin.x0)}–\${Math.round(bin.x1)}</b><br>\${bin.c} games · \${pct}%\`;
    tt.style.opacity=1;tt.style.left=Math.min(ev.clientX+14,innerWidth-tt.offsetWidth-8)+"px";tt.style.top=(ev.clientY+14)+"px";});
  canvas.addEventListener("mouseleave",()=>tt.style.opacity=0);}

const flagged=DATA.groups.flatMap(g=>g.metrics.filter(m=>Math.abs(m.z)>=2).map(m=>\`\${g.numP}P \${m.label}\`));
document.getElementById("foot").innerHTML=
  (flagged.length?\`Diverging (|z| ≥ 2): <b style="color:var(--actual)">\${flagged.join(", ")}</b>. \`:"")
  +\`Regenerate with <code>node fetch-games.mjs · parse-games.mjs · histogram.mjs</code>. A single game is one draw — overlap only means something once several stack up.\`;

const root=document.documentElement,tgl=document.getElementById("toggle");
tgl.addEventListener("click",()=>{const cur=root.getAttribute("data-theme")||(matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light");root.setAttribute("data-theme",cur==="dark"?"light":"dark");render();});
</script>
</body>
</html>`;

main();
