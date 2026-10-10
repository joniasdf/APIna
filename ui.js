// Yhteiset premium-grafiikat
Chart.defaults.font.family='Inter,system-ui';Chart.defaults.color='#9a9ca1';Chart.defaults.borderColor='#ffffff10';
function rgauge(val,max,label,unit,col){const p=Math.max(0,Math.min(1,(val||0)/max)),L=2*Math.PI*80*0.75,id='g'+Math.random().toString(36).slice(2);
setTimeout(()=>{const e=document.getElementById(id);if(e)e.style.strokeDashoffset=L*(1-p)},50);
return `<svg class=gauge viewBox="0 0 200 180" style="--glow:${col}"><defs><linearGradient id="${id}l" x1=0 x2=1><stop offset=0 stop-color="${col}" stop-opacity=.5 /><stop offset=1 stop-color="${col}"/></linearGradient></defs>
<circle cx=100 cy=100 r=80 fill=none stroke="#ffffff10" stroke-width=12 stroke-linecap=round stroke-dasharray="${L} 999" transform="rotate(135 100 100)"/>
<circle id=${id} class=arc cx=100 cy=100 r=80 fill=none stroke="url(#${id}l)" stroke-width=12 stroke-linecap=round stroke-dasharray="${L} 999" stroke-dashoffset="${L}" transform="rotate(135 100 100)"/>
<text x=100 y=105 text-anchor=middle class=gval>${val==null?'–':(+val).toFixed(val%1?1:0)}<tspan font-size=14 fill="#9a9ca1"> ${unit}</tspan></text><text x=100 y=130 text-anchor=middle class=glab>${label.toUpperCase()}</text></svg>`}
function grad(ctx,col){const g=ctx.chart.ctx.createLinearGradient(0,0,0,ctx.chart.height);g.addColorStop(0,col+'66');g.addColorStop(1,col+'00');return g}
function area(label,data,col,ax){return{label,data,borderColor:col,backgroundColor:c=>grad(c,col),fill:true,tension:.4,cubicInterpolationMode:'monotone',pointRadius:0,pointHoverRadius:4,borderWidth:2.5,yAxisID:ax||'y'}}
function carSvg(vs){const t=k=>vs[k]==null?'–':(+vs[k]).toFixed(2),open=k=>vs[k]?'#e82127':'#3ecf8e',low=k=>vs[k]!=null&&vs[k]<2.6?'#f5a524':'#fff';
const tire=(x,y,k,lx,anc)=>`<rect x=${x} y=${y} width=16 height=38 rx=6 fill="#2a2b2f" stroke="${low(k)}" stroke-opacity=.4 /><text x=${lx} y=${y+18} text-anchor=${anc} font-size=13 font-weight=600 fill="${low(k)}">${t(k)}</text><text x=${lx} y=${y+32} text-anchor=${anc} font-size=9 fill="#9a9ca1">bar</text>`;
return `<svg class=carsvg viewBox="0 0 260 340"><defs><linearGradient id=body x1=0 x2=1><stop offset=0 stop-color="#2b2d31"/><stop offset=.5 stop-color="#45474d"/><stop offset=1 stop-color="#2b2d31"/></linearGradient></defs>
${tire(62,62,'tpms_pressure_fl',54,'end')}${tire(182,62,'tpms_pressure_fr',206,'start')}${tire(62,230,'tpms_pressure_rl',54,'end')}${tire(182,230,'tpms_pressure_rr',206,'start')}
<path d="M130 20 C 175 20 192 40 194 80 L 196 270 C 196 305 175 320 130 320 C 85 320 64 305 64 270 L 66 80 C 68 40 85 20 130 20Z" fill="url(#body)" stroke="#ffffff22"/>
<path d="M84 110 C 100 95 160 95 176 110 L 170 150 L 90 150Z" fill="#0d1117" stroke="#ffffff18"/><rect x=90 y=152 width=80 height=88 rx=10 fill="#111418" opacity=.85 /><path d="M90 245 L 170 245 L 174 275 C 150 285 110 285 86 275Z" fill="#0d1117"/>
<rect x=100 y=30 width=60 height=60 rx=12 fill="${open('ft')}" opacity=.18 /><rect x=100 y=284 width=60 height=28 rx=10 fill="${open('rt')}" opacity=.18 />
<rect x=64 y=150 width=5 height=45 rx=2 fill="${open('df')}"/><rect x=191 y=150 width=5 height=45 rx=2 fill="${open('pf')}"/><rect x=64 y=198 width=5 height=42 rx=2 fill="${open('dr')}"/><rect x=191 y=198 width=5 height=42 rx=2 fill="${open('pr')}"/>
<text x=130 y=202 text-anchor=middle font-size=22>${vs.locked?'🔒':'🔓'}</text></svg><p class=mut style="text-align:center">Vihreä = kiinni, punainen = auki${info('tpms_pressure_fl')}</p>`}
function darkTiles(m){L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19,className:'darktiles'}).addTo(m)}
