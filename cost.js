// Latauskustannukset – pörssisähkö (api.porssisahko.net, hinnat sis. alv 25,5 %)
const CDEF={margin:0.59,tax:2.918,transfer:3.80,tmode:'aika',tday:3.80,tnight:1.61,twin:4.30,tother:2.70,vat:25.5,fixed:0,kwh:40,kw:11,cons:17};
let cset=Object.assign({},CDEF,JSON.parse(localStorage.costSet||'{}')),prices=[],priceDemo=false,pchart=null,cchart=null;
if(!localStorage.costMig2){if(cset.fixed==17.99)cset.fixed=0;localStorage.costMig2='1';if(localStorage.costSet)localStorage.costSet=JSON.stringify(cset)}

const fmt=(x,d=2)=>x==null||isNaN(x)?'–':(+x).toLocaleString('fi',{minimumFractionDigits:d,maximumFractionDigits:d});
// Kaikki asetukset sis. alv; spot (porssisahko.net) sis. alv 25,5 % -> skaalataan asetettuun alv:hen
function transferAt(t){const d=new Date(t||Date.now()),h=d.getHours(),m=d.getMonth(),wd=d.getDay();
if(cset.tmode=='aika')return h>=7&&h<22?cset.tday:cset.tnight;
if(cset.tmode=='kausi')return (m>=10||m<=2)&&wd!=0&&h>=7&&h<22?cset.twin:cset.tother;return cset.transfer}
function total(spotIncl,t){return spotIncl/1.255*(1+cset.vat/100)+cset.margin+transferAt(t)+cset.tax}
function priceAt(t){const c=JSON.parse(localStorage.priceCache||'{}');const h=new Date(t);h.setMinutes(0,0,0);const k=h.toISOString();
if(c[k]!=null)return total(c[k],t);const v=Object.values(c);return v.length?total(v.reduce((a,b)=>a+b,0)/v.length,t):null}
async function loadPrices(){priceDemo=false;try{const r=await call('GET','https://api.porssisahko.net/v1/latest-prices.json',null,true);
const p=(r.json&&r.json.prices)||[];if(!p.length)throw 0;const c=JSON.parse(localStorage.priceCache||'{}');
p.forEach(x=>{const d=new Date(x.startDate);d.setMinutes(0,0,0);const k=d.toISOString();c[k]=c[k]==null||d.getTime()==new Date(x.startDate).getTime()?x.price:(c[k]+x.price)/2});
const ks=Object.keys(c).sort().slice(-24*120);localStorage.priceCache=JSON.stringify(Object.fromEntries(ks.map(k=>[k,c[k]])));
prices=p.map(x=>({t:new Date(x.startDate),spot:x.price})).sort((a,b)=>a.t-b.t)}catch(e){console.log("PRICEERR",e&&e.message,e);priceDemo=true;prices=demoPrices()}}
function demoPrices(){const a=[],s=new Date();s.setHours(0,0,0,0);for(let i=0;i<48;i++){const h=i%24;a.push({t:new Date(s.getTime()+i*3600e3),spot:Math.max(-0.5,6+5*Math.sin((h-6)/24*2*Math.PI)+(h>=17&&h<=20?6:0)+(i>24?-1.5:0)+Math.random()*1.5)})}return a}
function sessions(){const out=[];Object.keys(localStorage).filter(k=>k.startsWith('teslaLog_')).forEach(k=>{const lg=JSON.parse(localStorage[k]);let cur=null,prev=null;
lg.forEach(p=>{if(prev&&p.kwh!=null&&prev.kwh!=null){const dk=p.kwh-prev.kwh;if(dk>0.05){if(!cur){cur={car:k.slice(9),start:prev.t,kwh:0,eur:0}}cur.kwh+=dk;const pr=priceAt((p.t+prev.t)/2)??total(8,(p.t+prev.t)/2);cur.eur+=dk*(pr||0)/100;cur.end=p.t}else if(dk<0||(p.cs&&p.cs!='Charging'&&cur&&p.t-cur.end>3*3600e3)){if(cur)out.push(cur);cur=null}}prev=p});if(cur)out.push(cur)});return out.sort((a,b)=>b.start-a.start)}
function odoKm(car,from,to){const lg=JSON.parse(localStorage['teslaLog_'+car]||'[]').filter(p=>p.odo&&p.t>=from&&p.t<=to);return lg.length>1?(lg[lg.length-1].odo-lg[0].odo)*1.609:0}
function field(k,l){return `<label>${l}${info(k)}</label><input type=number step=any id=c_${k} value="${cset[k]}" oninput="cset.${k}=+this.value||0;localStorage.costSet=JSON.stringify(cset);costRender()">`}
async function costInit(){if(!sessions().length&&!Object.keys(localStorage).some(k=>k.startsWith('teslaLog_')&&k!='teslaLog_DEMO'))seedDemoLog();if(!$('H').innerHTML)$('H').innerHTML=`<div class=grid><div class=card><h3>Asetukset (tallentuu paikallisesti)</h3>
${field('margin','Myyjän marginaali c/kWh (sis. alv)')}<label>Siirtotuote${info('tmode')}</label><select onchange="cset.tmode=this.value;localStorage.costSet=JSON.stringify(cset);$('H').innerHTML='';costInit()"><option value=aika ${cset.tmode=='aika'?'selected':''}>Aikasiirto (päivä/yö)</option><option value=kausi ${cset.tmode=='kausi'?'selected':''}>Kausisiirto (talvipäivä/muu)</option><option value=flat ${cset.tmode=='flat'?'selected':''}>Kiinteä siirtohinta</option></select>
${cset.tmode=='aika'?field('tday','Siirto päivä 7–22 c/kWh (sis. alv)')+field('tnight','Siirto yö 22–7 c/kWh (sis. alv)'):cset.tmode=='kausi'?field('twin','Siirto talvipäivä (marras–maalis ma–la 7–22) c/kWh')+field('tother','Siirto muu aika c/kWh'):field('transfer','Siirtomaksu c/kWh (sis. alv)')}${field('tax','Sähkövero c/kWh (sis. alv)')}${field('vat','ALV %')}${field('fixed','Kuukausimaksut € / kk (myyjä + siirto)')}<p class=mut>Oletukset: Fortum Tarkka + Vantaan Energia Sähköverkot aikasiirto 25–63 A.${info('defaults')}</p>
<button class="go sec" onclick="localStorage.removeItem('costSet');cset=Object.assign({},CDEF);$('H').innerHTML='';costInit()">Palauta oletukset</button></div>
<div class=card><h3>Halvin latausikkuna</h3>${field('kwh','Tarvittava energia kWh')}${field('kw','Laturin teho kW')}${field('cons','Kulutus kWh/100 km')}<div id=win style="margin-top:12px"></div></div>
<div class=card><h3>Hinta nyt</h3><div id=now></div></div></div>
<div class=card style="margin-top:12px"><h3>Kokonaishinta c/kWh · tänään ja huomenna</h3><div id=pdemo></div><div style="height:280px"><canvas id=pc></canvas></div><p class=mut>Lähde: api.porssisahko.net (spot sis. alv 25,5 %, muunnetaan alv 0 ja lasketaan omilla asetuksilla). Kaava: spot (alv:llä) + marginaali + siirto (tunnin mukaan) + sähkövero, kaikki sis. alv.</p></div>
<div class=grid style="margin-top:12px"><div class=card style="grid-column:1/-1"><h3>Kuukausittain</h3><div style="height:220px"><canvas id=mc></canvas></div><div id=mon></div></div><div class=card style="grid-column:1/-1"><h3>Lataussessiot (lokin perusteella)</h3><div id=ses></div></div></div>`;
await loadPrices();costRender()}
function costRender(){if(!prices.length)return;const now=Date.now(),P=prices.map(p=>({t:p.t,c:total(p.spot,p.t)}));
$('pdemo').innerHTML=priceDemo?'<p class=demo>DEMOHINNAT – hintarajapintaa ei tavoitettu, käyräesimerkki on keksitty.</p>':'';
const cur=P.find(p=>p.t<=now&&now<p.t.getTime()+3600e3);$('now').innerHTML=`<div class=big style="color:var(--red)">${fmt(cur&&cur.c)} <span class=mut>c/kWh</span></div><p class=mut>Spot ${fmt(cur&&prices[P.indexOf(cur)].spot)} c/kWh sis. alv · min ${fmt(Math.min(...P.map(p=>p.c)))} · max ${fmt(Math.max(...P.map(p=>p.c)))}</p>`;
const n=Math.max(1,Math.ceil(cset.kwh/Math.max(cset.kw,0.1))),fut=P.filter(p=>p.t.getTime()+3600e3>now);let best=null;
for(let i=0;i+n<=fut.length;i++){const avg=fut.slice(i,i+n).reduce((a,b)=>a+b.c,0)/n;if(!best||avg<best.avg)best={i,avg}}
const bset=new Set(best?fut.slice(best.i,best.i+n).map(p=>p.t.getTime()):[]);
$('win').innerHTML=best?`<div class=big>${fut[best.i].t.toLocaleString('fi',{weekday:'short',hour:'2-digit',minute:'2-digit'})} → ${new Date(fut[best.i+n-1].t.getTime()+3600e3).toLocaleTimeString('fi',{hour:'2-digit',minute:'2-digit'})}</div><p class=mut>${n} h · keskihinta ${fmt(best.avg)} c/kWh · kustannus <b style="color:#fff">${fmt(best.avg*cset.kwh/100)} €</b> · ${fmt(best.avg*cset.cons/100)} €/100 km</p>`:'Ei tarpeeksi tulevia tunteja';
if(pchart)pchart.destroy();pchart=new Chart($('pc'),{type:'bar',data:{labels:P.map(p=>p.t.toLocaleString('fi',{weekday:'short',hour:'2-digit'})),datasets:[{label:'c/kWh',data:P.map(p=>p.c),borderRadius:4,
backgroundColor:P.map(p=>bset.has(p.t.getTime())?'#3ecf8e':(p.t.getTime()+3600e3<now?'#ffffff22':'#e82127cc'))}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{maxTicksLimit:12}}}}});
const S=sessions(),M={};S.forEach(s=>{const k=new Date(s.start).toISOString().slice(0,7);(M[k]=M[k]||{kwh:0,eur:0,n:0,km:0,car:s.car}).kwh+=s.kwh;M[k].eur+=s.eur;M[k].n++});
Object.keys(M).forEach(k=>{const d=new Date(k+'-01');M[k].km=odoKm(M[k].car,d.getTime(),new Date(d.getFullYear(),d.getMonth()+1,1).getTime());M[k].tot=M[k].eur+cset.fixed});
const demoS=S.some(s=>s.car=='DEMO');
$('ses').innerHTML=(demoS?'<p class=demo>Sisältää DEMO-auton esimerkkisessioita.</p>':'')+(S.length?`<table><tr><th>Alku</th><th>Auto</th><th>kWh</th><th>€</th><th>c/kWh</th></tr>${S.map(s=>`<tr><td>${new Date(s.start).toLocaleString('fi')}</td><td>${s.car}</td><td>${fmt(s.kwh,1)}</td><td>${fmt(s.eur)}</td><td>${fmt(s.eur/s.kwh*100)}</td></tr>`).join('')}</table>`:'Ei sessioita vielä. Päivitä Tilastot-näkymää säännöllisesti latauksen aikana, niin sovellus kirjaa charge_energy_added-arvot.')+'<p class=mut>Kustannus = lisätyn energian (charge_energy_added) tuntikohtaiset lisäykset × kyseisen tunnin hinta. Lataushäviöitä (~5–10 %) ei lasketa.</p>';
const mk=Object.keys(M).sort();$('mon').innerHTML=mk.length?`<table><tr><th>Kk</th><th>Sessiot</th><th>kWh</th><th>Energia €</th><th>Sis. kk-maksut €</th><th>€/100 km</th></tr>${mk.map(k=>`<tr><td>${k}</td><td>${M[k].n}</td><td>${fmt(M[k].kwh,1)}</td><td>${fmt(M[k].eur)}</td><td>${fmt(M[k].tot)}</td><td>${M[k].km>1?fmt(M[k].tot/M[k].km*100):fmt(M[k].eur/M[k].kwh*cset.cons)+' (arvio)'}</td></tr>`).join('')}</table>`:'';
if(cchart)cchart.destroy();cchart=new Chart($('mc'),{type:'line',data:{labels:mk,datasets:[area('€ / kk',mk.map(k=>M[k].tot),'#e82127'),area('kWh',mk.map(k=>M[k].kwh),'#8ab4ff','y1')]},options:{maintainAspectRatio:false,scales:{x:{grid:{display:false}},y1:{position:'right',grid:{display:false}}}}})}

function seedDemoLog(){const a=[],now=Date.now();let odo=15000,kwh=0;for(let d=60;d>=0;d--){for(let h=0;h<24;h+=2){const t=now-d*864e5-(24-h)*3600e3;odo+=h>6&&h<20?4:0;
const ch=d%3==0&&h<6;kwh=ch?kwh+16:(h==6?0:kwh);a.push({t,bat:60,range:200,odo,in:18,out:3,kwh,cs:ch?'Charging':'Disconnected'})}}localStorage.teslaLog_DEMO=JSON.stringify(a.slice(-500))}
