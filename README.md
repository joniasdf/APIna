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
