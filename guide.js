// Ohjeet – Fleet API -käyttöönotto (tarkistettu developer.tesla.com 11.10.2026)
const D='https://developer.tesla.com/docs/fleet-api/';
const lk=(u,t)=>`<a href="${u}" target=_blank style="color:#8ab4ff">${t||u}</a>`;
const STEPS=[
['1. Tesla-tili ja MFA',`Luo/käytä Tesla-tiliä, jonka sähköposti on vahvistettu ja <b>kaksivaiheinen tunnistautuminen (MFA)</b> on päällä. ${lk(D+'getting-started/what-is-fleet-api','Getting Started')}`],
['2. Sovellus developer.tesla.comissa',`Kirjaudu ${lk('https://developer.tesla.com')} → <i>Create Application</i>. Anna nimi (oltava yksilöllinen), kuvaus, käyttötarkoitus ja yritys-/henkilötiedot.<ul>
<li><b>Allowed Origin</b>: oma domainisi, esim. <code>https://oma-domain.fi</code></li><li><b>Redirect URI</b>: esim. <code>https://oma-domain.fi/callback</code> (tai <code>http://localhost:8787/callback</code> testiin)</li>
<li><b>Scopet</b>: <code>openid offline_access user_data vehicle_device_data vehicle_location vehicle_cmds vehicle_charging_cmds</code> (+ <code>energy_device_data energy_cmds</code> Powerwallille).</li></ul>Saat <b>Client ID</b>:n ja <b>Client Secret</b>in – älä koskaan laita secretiä sovellukseen tai gitiin.`],
['3. Avainpari ja julkisen avaimen julkaisu',`<pre>openssl ecparam -name prime256v1 -genkey -noout -out private-key.pem
openssl ec -in private-key.pem -pubout -out public-key.pem</pre>Julkaise <b>public-key.pem</b> osoitteeseen<br><code>https://oma-domain.fi/.well-known/appspecific/com.tesla.3p.public-key.pem</code><br>Domainin on oltava sama kuin Allowed Origin. <b>private-key.pem pidetään salassa</b> (tarvitaan tesla-http-proxyssa). Ilmainen hosting käy (esim. GitHub Pages omalla domainilla).`],
['4. Partner-token ja rekisteröinti alueelle (EU)',`Hae partner-token (client_credentials):<pre>curl -X POST https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token \\
 -d grant_type=client_credentials -d client_id=$CLIENT_ID -d client_secret=$CLIENT_SECRET \\
 -d "scope=openid vehicle_device_data vehicle_cmds vehicle_charging_cmds" \\
 -d audience=https://fleet-api.prd.eu.vn.cloud.tesla.com</pre>Rekisteröi domain <b>jokaisella alueella erikseen</b> (Suomi = EU):<pre>curl -X POST https://fleet-api.prd.eu.vn.cloud.tesla.com/api/1/partner_accounts \\
 -H "Authorization: Bearer $PARTNER_TOKEN" -H "Content-Type: application/json" \\
 -d '{"domain":"oma-domain.fi"}'</pre>Tarkista: <code>GET /api/1/partner_accounts/public_key?domain=oma-domain.fi</code>. ${lk(D+'authentication/partner-tokens','Partner tokens')}`],
['5. OAuth: käyttäjän access + refresh token',`Avaa selaimessa (oma client_id ja redirect_uri):<pre>https://auth.tesla.com/oauth2/v3/authorize?response_type=code&client_id=$CLIENT_ID
&redirect_uri=$REDIRECT_URI&scope=openid%20offline_access%20user_data%20vehicle_device_data%20vehicle_location%20vehicle_cmds%20vehicle_charging_cmds&state=satunnainen</pre>
Kirjautumisen jälkeen selain ohjautuu redirect_uri:in parametrilla <code>?code=…</code>. Vaihda koodi tokeniksi:<pre>curl -X POST https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token \\
 -d grant_type=authorization_code -d client_id=$CLIENT_ID -d client_secret=$CLIENT_SECRET \\
 -d code=$CODE -d redirect_uri=$REDIRECT_URI -d audience=https://fleet-api.prd.eu.vn.cloud.tesla.com</pre>
<b>access_token</b> (voimassa ~8 h) syötetään Kokeile-paneeliin. <b>refresh_token</b> on kertakäyttöinen ja vanhenee 3 kk:ssa – uusi saadaan joka päivityksellä:<pre>curl -X POST https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token \\
 -d grant_type=refresh_token -d client_id=$CLIENT_ID -d refresh_token=$REFRESH_TOKEN</pre>${lk(D+'authentication/third-party-tokens','Third-party tokens')} · Tarkista oikea alue: <code>GET /api/1/users/region</code>.`],
['6. Virtuaaliavaimen paritus autoon',`Avaa puhelimella (Tesla-sovellus asennettuna) <code>https://tesla.com/_ak/oma-domain.fi</code> ja hyväksy avain auton luona. Avain näkyy autossa <i>Lukot</i>-näytöllä ja sen voi poistaa sieltä milloin vain. Avain tarvitaan komentoihin ja Fleet Telemetryyn. ${lk(D+'virtual-keys/overview','Virtual keys')}`],
['7. tesla-http-proxy komentoja varten',`Uudet autot hyväksyvät vain allekirjoitetut komennot. Aja Teslan proxy omalla koneella (Go):<pre>git clone https://github.com/teslamotors/vehicle-command && cd vehicle-command
go build ./... && go install ./cmd/tesla-http-proxy
openssl req -x509 -nodes -newkey ec -pkeyopt ec_paramgen_curve:secp384r1 \\
 -subj /CN=localhost -keyout tls-key.pem -out tls-cert.pem -days 365
tesla-http-proxy -tls-key tls-key.pem -cert tls-cert.pem -key-file private-key.pem -port 4443</pre>
Käynnistä tämä sovellus: <code>TESLA_CMD_PROXY=https://localhost:4443 python3 server.py</code> ja anna Ohjaus-välilehdellä base URL <code>https://localhost:4443</code>. (Itse allekirjoitettu sertifikaatti: Python-proxy voi vaatia sertifikaatin luottamisen.) ${lk('https://github.com/teslamotors/vehicle-command','vehicle-command')}`],
['8. Kustannukset ja laskutus',`Fleet API on pay-per-use: kuukausilaskutus, <b>10 $/kk alennus</b> yksittäisille kehittäjille (pienellä käytöllä käytännössä ilmainen). Kaikki alle 500-statuskoodin pyynnöt laskutetaan; autentikointikutsuja ei. Oletusarvoinen <b>laskutusraja on 0</b> – lisää maksutapa ja aseta raja portaalissa, muuten sovellus estetään rajan ylittyessä. vehicle_data ja wake_up ovat kalliimpia kuin muut. ${lk(D+'billing-and-limits','Billing and Limits')}`],
['9. Uni ja herätys',`Auto nukkuu säästääkseen akkua; vehicle_data palauttaa silloin <b>408</b>. Älä pollaa tiheästi (estää nukkumisen → vampire drain 2–4 %/vrk ja kustannukset). Herätä <code>wake_up</code>-kutsulla vain tarvittaessa ja odota 10–30 s. Kevyt tilan tarkistus: <code>GET /api/1/vehicles/{vin}</code> (kertoo state: online/asleep herättämättä). Jatkuvaan dataan Tesla suosittelee <b>Fleet Telemetryä</b>. server.py --poll ei herätä autoa.`],
['10. Helpompi vaihtoehto: kolmannen osapuolen palvelu',`Jos oma sovellusrekisteröinti, domain ja avaimet tuntuvat raskailta, palvelut kuten ${lk('https://tessie.com','Tessie')} hoitavat rekisteröinnin, virtuaaliavaimen ja datan keruun puolestasi (maksullinen tilaus) ja antavat oman API-tokenin. <b>Huom:</b> Tessien token toimii Tessien omaan rajapintaan (${lk('https://developer.tessie.com','developer.tessie.com')}, eri polut kuin Fleet API), ei suoraan Teslan Fleet API -osoitteisiin – tämän sovelluksen Kokeile/Tilastot vaativat Teslan oman access tokenin. Vanha "Owner API" -token ei enää ole tuettu tapa.`]];
function guideInit(){$('G').innerHTML=`<div class=card style="margin-bottom:12px"><h3>Ohjeet: Tesla Fleet API -käyttöoikeus</h3><p class=mut>Vaiheittainen opas. Tarkistettu Teslan virallista dokumentaatiota vasten 11.10.2026 – tarkista ajantasaisuus ${lk(D+'getting-started/what-is-fleet-api','developer.tesla.com')}.</p></div>${STEPS.map(s=>`<div class=card style="margin-bottom:12px"><h3>${s[0]}</h3><div style="font-size:14px;line-height:1.55">${s[1]}</div></div>`).join('')}`}

