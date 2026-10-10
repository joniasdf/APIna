// Asetukset: vienti/tuonti (JSON-tiedosto, QR, liitä, URL #config=base64 / ?config=url, QR-skannaus)
const b64e=s=>btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const b64d=s=>decodeURIComponent(escape(atob(s.replace(/-/g,'+').replace(/_/g,'/'))));
function cfgExport(withTok){const w=JSON.parse(localStorage.wizard||'{}'),o={app:'APIna',version:1,exported:new Date().toISOString(),
 region:localStorage.teslaReg||$('reg').value,domain:'joniasdf.github.io',client_id:w.cid||'',cost:JSON.parse(localStorage.costSet||'null')||cset,trip:JSON.parse(localStorage.tripSet||'null')||tset};
 if(withTok){o.tokens={access_token:localStorage.teslaTok||$('tok').value||'',refresh_token:localStorage.teslaRefresh||''}}return o}
function cfgApply(o,ask=true){if(o&&o.access_token&&!o.app)o={tokens:o};// setup_tesla.py tokens.json
 if(!o||(typeof o!='object'))throw Error('Ei kelvollinen asetustiedosto');const ch=[];
 if(o.cost)ch.push('hinta-asetukset (marginaali '+o.cost.margin+', siirto '+(o.cost.tmode||'')+' '+(o.cost.tday??o.cost.transfer)+'/'+(o.cost.tnight??'')+', vero '+o.cost.tax+', alv '+o.cost.vat+', kk-maksut '+o.cost.fixed+' €)');
 if(o.trip)ch.push('akku '+o.trip.cap+' kWh, uutena '+o.trip.newRange+' km');if(o.region)ch.push('alue '+(o.region.includes('.eu.')?'EU':o.region.includes('.na.')?'NA':o.region));
 if(o.client_id)ch.push('Client ID');if(o.tokens&&(o.tokens.access_token||o.tokens.refresh_token))ch.push('⚠ TOKENIT (salaisia)');
 if(!ch.length)throw Error('Tiedostossa ei ollut tunnettuja asetuksia');
 if(ask&&!confirm('Tuodaanko asetukset?\n\n• '+ch.join('\n• ')))return false;
 if(o.cost)localStorage.costSet=JSON.stringify(Object.assign({},CDEF,o.cost));if(o.trip)localStorage.tripSet=JSON.stringify(o.trip);
 if(o.region)localStorage.teslaReg=o.region;if(o.client_id){const w=JSON.parse(localStorage.wizard||'{}');w.cid=o.client_id;w.d_ids=true;localStorage.wizard=JSON.stringify(w)}
 if(o.tokens){if(o.tokens.access_token)localStorage.teslaTok=o.tokens.access_token;if(o.tokens.refresh_token)localStorage.teslaRefresh=o.tokens.refresh_token}
 localStorage.costMig2='1';return true}
function cfgLink(){return location.origin+location.pathname.replace(/index\.html$/,'')+'#config='+b64e(JSON.stringify(cfgExport(false)))}
function cfgDownload(withTok){if(withTok&&!confirm('Tiedosto sisältää TOKENIT. Kuka tahansa tiedoston saava voi käyttää autoasi. Jatketaanko?'))return;
 const s=JSON.stringify(cfgExport(withTok),null,2),n=withTok?'apina-asetukset-TOKENIT.json':'apina-asetukset.json';
 if(CAP){navigator.clipboard&&navigator.clipboard.writeText(s);$('aout').textContent='Android: JSON kopioitu leikepöydälle (tiedostolataus ei toimi WebView:ssä). Liitä se esim. muistiinpanoon tai sähköpostiin.';return}
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([s],{type:'application/json'}));a.download=n;a.click()}
function cfgMsg(m){$('aout').textContent=m}
function cfgTry(fn){try{if(fn()){cfgMsg('✅ Asetukset tuotu – ladataan uudelleen…');setTimeout(()=>location.reload(),700)}}catch(e){cfgMsg('Virhe: '+e.message)}}
function cfgFile(f){const r=new FileReader();r.onload=()=>cfgTry(()=>cfgApply(JSON.parse(r.result)));r.readAsText(f)}
async function cfgUrl(u){const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);return r.json()}
let scanStream=null;
async function cfgScan(){if(!('BarcodeDetector' in window)){cfgMsg('QR-skannaus ei ole tuettu tässä selaimessa/WebView:ssä. Käytä puhelimen kamerasovellusta: se avaa QR-linkin selaimessa, tai liitä JSON.');return}
 try{const det=new BarcodeDetector({formats:['qr_code']});scanStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});const v=$('scanv');v.srcObject=scanStream;v.style.display='block';await v.play();
 const tick=async()=>{if(!scanStream)return;const c=await det.detect(v).catch(()=>[]);if(c.length){cfgStop();const t=c[0].rawValue;cfgTry(()=>{const m=t.match(/#config=([\w-]+)/);return cfgApply(JSON.parse(m?b64d(m[1]):t))})}else requestAnimationFrame(tick)};tick()}catch(e){cfgMsg('Kameraa ei saatu: '+e.message)}}
function cfgStop(){if(scanStream){scanStream.getTracks().forEach(t=>t.stop());scanStream=null}$('scanv').style.display='none'}
function settingsInit(){const link=cfgLink(),qr=qrcode(0,'L');qr.addData(link);qr.make();
$('A').innerHTML=`<div class=grid><div class=card><h3>Vie asetukset</h3><p class=mut>Sisältää hinta-asetukset, alueen, domainin, akkuasetukset ja Client ID:n. <b>Tokenit eivät ole mukana</b> QR:ssä eikä linkissä.</p>
<button class=go onclick="cfgDownload(false)">⬇ Lataa JSON</button> <button class="go sec" onclick="navigator.clipboard.writeText(cfgLink());cfgMsg('Linkki kopioitu')">🔗 Kopioi tuontilinkki</button>
<div style="background:#fff;padding:10px;border-radius:12px;width:max-content;margin-top:12px">${qr.createSvgTag(3,0)}</div><p class=mut>Skannaa toisella laitteella: avaa sovelluksen ja tuo asetukset yhdellä napautuksella.</p>
<details><summary class=mut style="cursor:pointer">Vie myös tokenit (salaiset)</summary><p style="color:#f5a524">⚠ Access ja refresh token antavat pääsyn autoosi (lukitus, sijainti). Älä jaa niitä, älä laita julkiseen paikkaan.</p><button class=go style="background:#a30" onclick="cfgDownload(true)">Lataa JSON tokeneineen</button></details></div>
<div class=card><h3>Tuo asetukset</h3><label>Tiedosto (apina-asetukset.json tai setup_tesla.py:n tokens.json)</label><input type=file accept=".json,application/json" onchange="this.files[0]&&cfgFile(this.files[0])">
<label>Liitä JSON tai tuontilinkki</label><textarea id=apaste rows=4 placeholder='{"app":"APIna",...} tai https://joniasdf.github.io/APIna/#config=...'></textarea>
<button class=go onclick="cfgTry(()=>{const t=$('apaste').value.trim(),m=t.match(/#config=([\\w-]+)/);return cfgApply(JSON.parse(m?b64d(m[1]):t))})">Tuo</button>
<label>Tai osoitteesta (URL)</label><div class=row><input id=aurl value="https://joniasdf.github.io/APIna/joni-asetukset.json" style="flex:1"><button class=go onclick="cfgUrl($('aurl').value).then(o=>cfgTry(()=>cfgApply(o))).catch(e=>cfgMsg('Virhe: '+e.message))">Hae</button></div>
<button class="go sec" onclick="cfgScan()">📷 Skannaa QR</button> <button class="go sec" onclick="cfgStop()">Lopeta</button><video id=scanv playsinline muted style="display:none;width:100%;border-radius:12px;margin-top:8px"></video></div>
<div class=card><h3>Nykyiset asetukset</h3><pre style="max-height:260px">${JSON.stringify(cfgExport(false),null,1)}</pre><button class="go sec" onclick="if(confirm('Palautetaanko oletukset (Fortum Tarkka + Vantaa aikasiirto)? Tokenit säilyvät.')){['costSet','tripSet'].forEach(k=>localStorage.removeItem(k));location.reload()}">Palauta oletukset</button></div></div><pre id=aout style="margin-top:12px"></pre>`}
// Tuonti URL:stä käynnistyksessä: #config=<base64url> tai ?config=<url>
(async()=>{const h=location.hash.match(/^#config=([\w-]+)/),q=new URLSearchParams(location.search).get('config');if(!h&&!q)return;
 let o;try{o=h?JSON.parse(b64d(h[1])):await cfgUrl(q)}catch(e){alert('Asetusten tuonti epäonnistui: '+e.message);return}
 if(o&&o.tokens){delete o.tokens}// tokeneita ei koskaan linkistä
 const okk=(()=>{try{return cfgApply(o)}catch(e){alert(e.message);return false}})();history.replaceState(null,'',location.pathname+(okk?'#asetukset':''));if(okk)location.reload()})();
if(location.hash=='#asetukset')tab('A');
