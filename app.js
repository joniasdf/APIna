const $=id=>document.getElementById(id);let cur=null;
function tab(t){['E','S','H','T','R','G'].forEach(x=>{$(x).style.display=x==t?(x=='E'?'flex':'block'):'none';$('t'+x).classList.toggle('on',x==t)});if(t=='S'&&!$('dash').innerHTML)demo();if(t=='H')costInit();if(t=='T'&&window.tripsInit)tripsInit();if(t=='R'&&window.ctrlInit)ctrlInit();if(t=='G'&&window.guideInit)guideInit()}
$('cnt').textContent=ENDPOINTS.length+' rajapintaa';
$('scopes').innerHTML=Object.entries(SCOPES).map(([k,v])=>`<div class=kv><span><code>${k}</code></span><span>${v}</span></div>`).join('');
function render(){const q=$('q').value.toLowerCase();let h='',last='';ENDPOINTS.forEach((e,i)=>{if(q&&!JSON.stringify(e).toLowerCase().includes(q))return;if(e.c!=last){h+=`<div class=cat>${e.c}</div>`;last=e.c}
h+=`<div class="ep" onclick="pick(${i})"><span class="m ${e.m}">${e.m}</span><code>${e.p.replace('/api/1/','')}</code><br><small style="color:#aaa;margin-left:56px">${e.d}</small></div>`});$('eps').innerHTML=h||'Ei tuloksia'}
function pick(i){const e=ENDPOINTS[i];cur=e;$('det').innerHTML=`<h2><span class="m ${e.m}">${e.m}</span> ${e.d}</h2><code>${e.p}</code><p>Kategoria: <b>${e.c}</b></p><p>Scopet: ${e.s.split(' ').map(s=>`<span class=tag>${s}</span>`).join('')}</p><p>Parametrit: ${e.a.length?e.a.map(a=>`<span class=tag>${a}${info(a)}</span>`).join(''):'–'}</p>${e.c=='Ajoneuvokomennot'?'<p style="color:#fa3">⚠ Uudemmat autot vaativat komentojen allekirjoituksen virtuaaliavaimella (Tesla vehicle-command proxy). REST-komento palauttaa muuten virheen.</p>':''}`;
$('mth').value=e.m;$('pth').value=e.p;$('bdy').value=e.m=='POST'&&e.a.length?JSON.stringify(Object.fromEntries(e.a.filter(a=>!a.endsWith('?')).map(a=>[a.split(/[ \[{=]/)[0],''])),null,1):'';curl()}
function url(){const p=$('pth').value;return p.startsWith('http')?p:$('reg').value+p}
function curl(){$('curl').textContent=`curl -X ${$('mth').value} '${url()}' \\\n  -H 'Authorization: Bearer $TESLA_TOKEN' \\\n  -H 'Content-Type: application/json'`+($('bdy').value.trim()?` \\\n  -d '${$('bdy').value.replace(/\s+/g,' ')}'`:'')}
['mth','pth','bdy','reg'].forEach(i=>$(i).addEventListener('input',curl));
if(localStorage.teslaTok){$('tok').value=localStorage.teslaTok;$('rem').checked=true}if(localStorage.teslaReg)$('reg').value=localStorage.teslaReg;
function saveTok(){if($('rem').checked){localStorage.teslaTok=$('tok').value;localStorage.teslaReg=$('reg').value}else{delete localStorage.teslaTok}}
$('rem').onchange=saveTok;
const CAP=window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform();
async function call(method,u,body,noAuth){saveTok();
if(CAP){const H={'Content-Type':'application/json'};if(!noAuth&&$('tok').value)H.Authorization='Bearer '+$('tok').value;const r=await Capacitor.Plugins.CapacitorHttp.request({url:u,method,headers:H,data:body?JSON.parse(body):undefined});return{status:r.status,json:r.data}}const NOPROXY=location.protocol=='file:'||/github\.io$/.test(location.hostname);
if(NOPROXY){try{const H={'Content-Type':'application/json'};if(!noAuth&&$('tok').value)H.Authorization='Bearer '+$('tok').value;const r=await fetch(u,{method,headers:H,body:body||undefined});const t=await r.text();try{return{status:r.status,json:JSON.parse(t)}}catch{return{status:r.status,json:t}}}catch(e){throw Error('Suora kutsu estyi (CORS): selainversio GitHub Pagesissa ei voi kutsua Teslan rajapintaa suoraan. Käytä paikallista server.py-proxyä (python3 server.py) tai Android-sovellusta. Curl-komento yllä toimii myös.')}}const r=await fetch('/proxy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:u,method,token:noAuth?'':$('tok').value,body:body||null})});const t=await r.text();try{return{status:r.status,json:JSON.parse(t)}}catch{return{status:r.status,json:t}}}
async function send(){$('out').textContent='…';try{const r=await call($('mth').value,url(),$('bdy').value.trim());$('out').textContent='HTTP '+r.status+'\n'+JSON.stringify(r.json,null,2)}catch(e){$('out').textContent=e}}
render();curl();
// ---------- Tilastot ----------
let charts=[],map=null;
async function loadVehicles(){$('sst').textContent='Haetaan…';const r=await call('GET',$('reg').value+'/api/1/vehicles');const l=(r.json&&r.json.response)||[];$('veh').innerHTML=l.map(v=>`<option value="${v.vin||v.id}">${v.display_name||''} ${v.vin} (${v.state})</option>`).join('');$('sst').textContent=l.length?'':'HTTP '+r.status+' '+JSON.stringify(r.json).slice(0,200)}
async function loadStats(){const v=$('veh').value;if(!v)return alert('Valitse ajoneuvo');const b=$('reg').value;$('sst').textContent='Haetaan…';
if($('wake').checked){await call('POST',b+`/api/1/vehicles/${v}/wake_up`);await new Promise(r=>setTimeout(r,8000))}
const ep='charge_state;climate_state;drive_state;gui_settings;location_data;vehicle_config;vehicle_state;closures_state';
const r=await call('GET',b+`/api/1/vehicles/${v}/vehicle_data?endpoints=`+encodeURIComponent(ep));
if(!r.json||!r.json.response){$('sst').textContent='HTTP '+r.status+' (auto unessa? kokeile "herätä ensin") '+JSON.stringify(r.json).slice(0,200);return}
const extra={};for(const [k,p] of [['charging',`/api/1/dx/charging/history?vin=${v}`],['products','/api/1/products']]){try{const x=await call('GET',b+p);extra[k]=x.json&&x.json.response}catch{}}
const sites=(extra.products||[]).filter(p=>p.energy_site_id);if(sites[0]){const x=await call('GET',b+`/api/1/energy_sites/${sites[0].energy_site_id}/live_status`);extra.energy=x.json&&x.json.response}
$('sst').textContent='';log(v,r.json.response);draw(r.json.response,extra,false,v)}
function log(v,d){const k='teslaLog_'+v,a=JSON.parse(localStorage[k]||'[]');const c=d.charge_state||{},cl=d.climate_state||{},vs=d.vehicle_state||{};
a.push({t:Date.now(),lat:(d.location_data||d.drive_state||{}).latitude,lon:(d.location_data||d.drive_state||{}).longitude,sh:(d.drive_state||{}).shift_state,spd:(d.drive_state||{}).speed,pw:(d.drive_state||{}).power,ub:c.usable_battery_level,ir:c.ideal_battery_range,cp:c.charger_power,bat:c.battery_level,range:c.battery_range,odo:vs.odometer,in:cl.inside_temp,out:cl.outside_temp,kwh:c.charge_energy_added,cs:c.charging_state});localStorage[k]=JSON.stringify(a.slice(-5000))}
const mi=x=>x==null?'–':(x*1.609344).toFixed(0)+' km';const bar=x=>x==null?'–':(+x).toFixed(2)+' bar';
function kvs(o){return Object.entries(o||{}).map(([k,v])=>`<div class=kv><span>${k}${info(k)}</span><span>${typeof v=='object'&&v!==null?JSON.stringify(v):v}</span></div>`).join('')}
function gauge(id,val,max,label,col){charts.push(new Chart($(id),{type:'doughnut',data:{datasets:[{data:[val||0,max-(val||0)],backgroundColor:[col,'#333'],borderWidth:0}]},options:{circumference:180,rotation:-90,cutout:'75%',plugins:{tooltip:{enabled:false},title:{display:true,text:label,color:'#eee'}}}}))}
function draw(d,extra,isDemo,v){charts.forEach(c=>c.destroy());charts=[];if(map){map.remove();map=null}
const c=d.charge_state||{},cl=d.climate_state||{},dr=d.drive_state||{},vs=d.vehicle_state||{},loc=d.location_data||dr;
$('dash').innerHTML=(isDemo?'<p class=demo>DEMOTILA – kaikki luvut ovat keksittyjä esimerkkitietoja, eivät oikean auton dataa.</p>':'')+
`<div class="card hero" style="margin:12px 0"><h2>${d.display_name||d.vin||''}</h2><span class=mut>Ohjelmisto ${vs.car_version||'–'}${info('car_version')}</span><span class=mut>Matkamittari <b style="color:#fff">${mi(vs.odometer)}</b>${info('odometer')}</span><span class=mut>Tila ${d.state||'–'}${info('state')}</span></div>
<div class=grid><div class=card><h3>Akku${info('battery_level')}</h3>${rgauge(c.battery_level,100,'varaus','%','#3ecf8e')}<p style="text-align:center" class=mut>Raja ${c.charge_limit_soc??'–'} % · <b style="color:#fff">${mi(c.battery_range)}</b> · ${c.charging_state||''}</p></div>
<div class=card><h3>Toimintamatka${info('battery_range')}</h3>${rgauge(c.battery_range==null?null:c.battery_range*1.609,600,'km','km','#8ab4ff')}<p style="text-align:center" class=mut>Arvio ajotavalla ${mi(c.est_battery_range)}</p></div>
<div class=card><h3>Lämpötilat${info('inside_temp')}</h3>${rgauge(cl.inside_temp,40,'sisä','°C','#f5a524')}<p style="text-align:center" class=mut>Ulko <b style="color:#fff">${cl.outside_temp??'–'} °C</b> · Asetus ${cl.driver_temp_setting??'–'} °C</p></div>
<div class=card><h3>Renkaat ja ovet${info('df')}</h3>${carSvg(vs)}</div>
<div class=card><h3>Sijainti${info('latitude')}</h3><div id=map></div><p class=mut>${loc.latitude??'–'}, ${loc.longitude??'–'} · ${loc.heading??'–'}°</p></div>
<div class=card style="grid-column:1/-1"><h3>Trendit · paikallinen loki</h3><div style="height:260px"><canvas id=tr></canvas></div><button class="go sec" onclick="localStorage.removeItem('teslaLog_${v}');${isDemo?'demo()':'loadStats()'}">Tyhjennä loki</button></div>
${['charge_state','climate_state','drive_state','vehicle_state','vehicle_config','gui_settings','location_data','closures_state'].filter(s=>d[s]).map(s=>`<div class=card><h3>${s}</h3>${kvs(d[s])}</div>`).join('')}
<div class=card><h3>Lataushistoria (Supercharger)</h3>${(extra.charging||[]).length?extra.charging.slice(0,20).map(s=>`<div class=kv><span>${(s.chargeStartDateTime||'').slice(0,16)} ${s.siteLocationName||''}</span><span>${(s.fees||[]).map(f=>f.usageBase+' '+(f.uom||'')+' / '+f.totalDue+' '+(f.currencyCode||'')).join(', ')}</span></div>`).join(''):'Ei saatavilla'}</div>
<div class=card><h3>Energia (Powerwall/aurinko)</h3>${extra.energy?kvs(extra.energy):'Ei energialaitteita'}</div>
<div class=card><h3>Muut tiedot</h3>${kvs({vin:d.vin,state:d.state,id:d.id,in_service:d.in_service})}</div></div>`;
if(loc.latitude&&window.L){map=L.map('map',{zoomControl:false}).setView([loc.latitude,loc.longitude],14);darkTiles(map);L.circleMarker([loc.latitude,loc.longitude],{radius:9,color:'#e82127',fillColor:'#e82127',fillOpacity:.9,weight:6,opacity:.35}).addTo(map)}
const lg=JSON.parse(localStorage['teslaLog_'+v]||'[]');
charts.push(new Chart($('tr'),{type:'line',data:{labels:lg.map(p=>new Date(p.t).toLocaleString('fi',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'})),datasets:[area('Akku %',lg.map(p=>p.bat),'#3ecf8e'),area('Toimintamatka km',lg.map(p=>p.range*1.609),'#8ab4ff','y1'),area('Sisä °C',lg.map(p=>p.in),'#f5a524'),area('Ulko °C',lg.map(p=>p.out),'#e82127')]},
options:{maintainAspectRatio:false,interaction:{mode:'index',intersect:false},scales:{x:{grid:{display:false},ticks:{maxTicksLimit:8}},y:{position:'left'},y1:{position:'right',grid:{display:false}}},plugins:{legend:{labels:{usePointStyle:true,boxWidth:8}}}}}))}
function demo(){const v='DEMO';if(!localStorage.teslaLog_DEMO){const a=[];for(let i=0;i<24;i++)a.push({t:Date.now()-(24-i)*3600e3,bat:80-i*1.5+(i>18?20:0),range:(80-i*1.5)*3.1,odo:15400+i*5,in:18+Math.sin(i/3)*3,out:4+Math.sin(i/4)*4,kwh:i<19?0:(i-18)*8,cs:i>18&&i<23?'Charging':'Disconnected'});localStorage.teslaLog_DEMO=JSON.stringify(a)}
draw({vin:'5YJ3DEMO000000000',display_name:'Demo-Model 3',state:'online',id:123,
charge_state:{battery_level:72,usable_battery_level:71,battery_range:198.4,est_battery_range:170.2,charge_limit_soc:80,charging_state:'Disconnected',charge_rate:0,charger_power:0,charge_energy_added:12.4,minutes_to_full_charge:0,charge_port_door_open:false,scheduled_charging_mode:'Off',conn_charge_cable:'<invalid>'},
climate_state:{inside_temp:19.5,outside_temp:6,driver_temp_setting:21,passenger_temp_setting:21,is_climate_on:false,seat_heater_left:0,is_preconditioning:false,cabin_overheat_protection:'On',defrost_mode:0},
drive_state:{shift_state:null,speed:null,power:0,heading:180,latitude:60.1699,longitude:24.9384,timestamp:Date.now()},
location_data:{latitude:60.1699,longitude:24.9384,heading:180},
vehicle_state:{car_version:'2026.32.5 abc123',odometer:15523.4,locked:true,sentry_mode:true,valet_mode:false,df:0,pf:0,dr:0,pr:0,ft:0,rt:0,tpms_pressure_fl:2.9,tpms_pressure_fr:2.95,tpms_pressure_rl:2.85,tpms_pressure_rr:2.9,is_user_present:false,software_update:{status:''}},
vehicle_config:{car_type:'model3',trim_badging:'74d',exterior_color:'MidnightSilver',wheel_type:'Pinwheel18',has_seat_cooling:false,motorized_charge_port:true,rear_seat_heaters:1},
gui_settings:{gui_distance_units:'km/hr',gui_temperature_units:'C',gui_charge_rate_units:'kW',gui_24_hour_time:true,gui_range_display:'Rated'}},
{charging:[{chargeStartDateTime:'2026-10-02T14:10',siteLocationName:'Helsinki – Kamppi (DEMO)',fees:[{usageBase:38.2,uom:'kWh',totalDue:15.9,currencyCode:'EUR'}]},{chargeStartDateTime:'2026-09-21T09:45',siteLocationName:'Lahti (DEMO)',fees:[{usageBase:44,uom:'kWh',totalDue:18.2,currencyCode:'EUR'}]}],
energy:{solar_power:2100,battery_power:-800,load_power:1300,grid_power:0,percentage_charged:64,grid_status:'Active',note:'DEMO'}},true,v)}
if(location.hash=='#tilastot')tab('S');if(location.hash=='#hinnat')tab('H');if(location.hash=='#ajot')tab('T');if(location.hash=='#ohjaus')tab('R');
