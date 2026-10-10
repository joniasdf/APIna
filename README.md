# Tesla Fleet API -tutkija (PWA + Android)
Selain: `python3 server.py` → http://localhost:8787 (server.py = staattinen palvelin + CORS-proxy vain Teslan ja api.porssisahko.net:n osoitteisiin).
Android: `npm i && npm run cap:sync && cd android && ./gradlew assembleDebug` (JDK 17+, Android SDK). Androidissa kutsut menevät suoraan CapacitorHttp:llä, proxyä ei tarvita.
Näkymät: Rajapinnat (129 endpointia, haku, scopet, parametrit, Kokeile + curl), Tilastot (vehicle_data, mittarit, rengas/ovi-kuva, kartta, trendit, demotila), Latauskustannukset (pörssisähkö, omat maksut, halvin ikkuna, sessio-/kk-kustannukset, €/100 km).
Token tallentuu vain "Muista"-valinnalla localStorageen. Kaikki kirjastot paikallisesti vendor/-kansiossa (karttalaatat vaativat verkon).

## Pollaustila (Tessie-tyyppinen jatkuva loki)
`TESLA_TOKEN=... TESLA_VIN=... TESLA_BASE=https://fleet-api.prd.eu.vn.cloud.tesla.com POLL_SEC=300 python3 server.py --poll`
Tallentaa vehicle_data-snapshotit SQLiteen (tesla.db, TESLA_DB muuttaa), 30 s välein ajossa/latauksessa, muuten POLL_SEC. Ei herätä autoa. Selain hakee /api/snapshots ja yhdistää lokit Ajopäiväkirjaan. Token vain ympäristömuuttujassa.
Komentojen proxy: TESLA_CMD_PROXY=https://localhost:4443 sallii tesla-http-proxyn osoitteen.
Huom: jatkuva pollaus maksaa Fleet API -kutsuja; Fleet Telemetry on tehokkaampi tuotantokäyttöön.

## GitHub Pages
Web-versio: https://joniasdf.github.io/APIna/ (OAuth Redirect URI: https://joniasdf.github.io/APIna/callback.html).
Pagesissa ei ole server.py-proxyä: Tesla Fleet API ja api.porssisahko.net eivät palauta CORS-otsakkeita, joten oikeat API-kutsut toimivat vain paikallisesti (`python3 server.py`) tai Android-sovelluksessa (CapacitorHttp). Pagesissa toimivat selaus, demotila, ohjeet ja curl-generointi; hinnat näytetään demona.
Tesla-julkinen avain: https://joniasdf.github.io/.well-known/appspecific/com.tesla.3p.public-key.pem (repo joniasdf.github.io). Yksityinen avain EI ole repossa.

## Helppo käyttöönotto
1. Sovelluksessa: **Käyttöönotto**-välilehti (vaiheet, kopioitavat arvot, QR-koodi virtuaaliavaimelle).
2. Tietokoneella: Windows `setup_tesla.bat` (tuplaklikkaus), Mac/Linux `./setup_tesla.sh`. Kysyy Client ID + Secret, rekisteröi domainin (EU), tarkistaa avaimen, kirjaa sisään (paluu http://localhost:8787/callback), tallentaa tokens.json ja listaa autot. Päivitys: `setup_tesla.py refresh_token`.
Tesla-sovelluksen Redirect URI -listaan: `https://joniasdf.github.io/APIna/callback.html` **ja** `http://localhost:8787/callback`.

## Asetusten tuonti/vienti
Asetukset-välilehti: vie JSON/QR/linkki, tuo tiedostosta, liittämällä, URL:sta tai QR-skannauksella (jos laite tukee BarcodeDetectoria).
Jonin asetukset yhdellä napautuksella: https://joniasdf.github.io/APIna/?config=joni-asetukset.json
tai suoraan linkkiin pakattuna: https://joniasdf.github.io/APIna/#config=eyJhcHAiOiJBUEluYSIsInZlcnNpb24iOjEsInJlZ2lvbiI6Imh0dHBzOi8vZmxlZXQtYXBpLnByZC5ldS52bi5jbG91ZC50ZXNsYS5jb20iLCJkb21haW4iOiJqb25pYXNkZi5naXRodWIuaW8iLCJjbGllbnRfaWQiOiIiLCJjb3N0Ijp7Im1hcmdpbiI6MC41OSwidG1vZGUiOiJhaWthIiwidGRheSI6My44LCJ0bmlnaHQiOjEuNjEsInR3aW4iOjQuMywidG90aGVyIjoyLjcsInRyYW5zZmVyIjozLjgsInRheCI6Mi45MTgsInZhdCI6MjUuNSwiZml4ZWQiOjAsImt3aCI6NDAsImt3IjoxMSwiY29ucyI6MTd9LCJ0cmlwIjp7ImNhcCI6NzUsIm5ld1JhbmdlIjo2Mjl9fQ
Tokeneita ei koskaan tuoda linkistä/QR:stä.
