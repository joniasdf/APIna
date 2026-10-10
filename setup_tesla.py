#!/usr/bin/env python3
"""Tesla Fleet API -käyttöönotto (vain Pythonin vakiokirjasto).
Käyttö:  python3 setup_tesla.py            -> koko käyttöönotto
         python3 setup_tesla.py refresh_token -> päivitä access token
         python3 setup_tesla.py vehicles   -> listaa ajoneuvot
Tokenit tallennetaan tiedostoon tokens.json tämän skriptin viereen. Client Secretiä EI tallenneta."""
import json, os, sys, secrets, webbrowser, getpass, urllib.request, urllib.parse, urllib.error, http.server, threading, time

DOMAIN = "joniasdf.github.io"
FLEET = "https://fleet-api.prd.eu.vn.cloud.tesla.com"
AUTH_URL = "https://auth.tesla.com/oauth2/v3/authorize"
TOKEN_URL = "https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token"
REDIRECT = "http://localhost:8787/callback"
SCOPES = "openid offline_access user_data vehicle_device_data vehicle_location vehicle_cmds vehicle_charging_cmds energy_device_data energy_cmds"
HERE = os.path.dirname(os.path.abspath(__file__))
TOK = os.path.join(HERE, "tokens.json")
CFG = os.path.join(HERE, "tesla_config.json")
UA = {"User-Agent": "APIna-setup/1.0", "Accept": "application/json"}

def ok(m): print("  \u2705 " + m)
def warn(m): print("  \u26a0\ufe0f  " + m)
def step(n, m): print(f"\n[{n}] {m}")

def req_(method, url, data=None, token=None, form=False):
    h = dict(UA)
    if token: h["Authorization"] = "Bearer " + token
    body = None
    if data is not None:
        if form: body = urllib.parse.urlencode(data).encode(); h["Content-Type"] = "application/x-www-form-urlencoded"
        else: body = json.dumps(data).encode(); h["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=30) as r: return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        raw = e.read()
        try: return e.code, json.loads(raw)
        except Exception: return e.code, {"raw": raw.decode(errors="ignore")[:500]}

def load(p):
    try:
        with open(p, encoding="utf-8") as f: return json.load(f)
    except Exception: return {}

def save(p, d):
    with open(p, "w", encoding="utf-8") as f: json.dump(d, f, indent=2)
    try: os.chmod(p, 0o600)
    except Exception: pass

def build_authorize_url(client_id, state):
    return AUTH_URL + "?" + urllib.parse.urlencode({"response_type": "code", "client_id": client_id, "redirect_uri": REDIRECT,
        "scope": SCOPES, "state": state, "prompt_missing_scopes": "true", "locale": "fi-FI"})

def wait_for_code(state, timeout=300):
    got = {}
    class H(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            if not self.path.startswith("/callback"): self.send_response(404); self.end_headers(); return
            got.update({k: v[0] for k, v in q.items()})
            msg = "Kirjautuminen onnistui! Voit sulkea tämän välilehden ja palata ohjelmaan." if "code" in got else "Virhe: " + got.get("error", "tuntematon")
            self.send_response(200); self.send_header("Content-Type", "text/html; charset=utf-8"); self.end_headers()
            self.wfile.write(f"<html><body style='font-family:sans-serif;background:#111;color:#eee;padding:40px'><h2>{msg}</h2></body></html>".encode())
        def log_message(self, *a): pass
    try:
        srv = http.server.HTTPServer(("127.0.0.1", 8787), H)
    except OSError:
        print("  Portti 8787 on varattu (onko server.py käynnissä?). Sulje se ja yritä uudelleen."); sys.exit(1)
    srv.timeout = 1; end = time.time() + timeout
    while "code" not in got and "error" not in got and time.time() < end: srv.handle_request()
    srv.server_close()
    if got.get("state") and got["state"] != state: print("  state ei täsmää – keskeytetään turvallisuussyistä."); sys.exit(1)
    return got.get("code"), got

def list_vehicles(tok):
    s, j = req_("GET", FLEET + "/api/1/vehicles", token=tok)
    if s != 200: warn(f"Ajoneuvojen haku epäonnistui (HTTP {s}): {j}"); return
    v = j.get("response") or []
    ok(f"Löytyi {len(v)} ajoneuvo(a):")
    for x in v: print(f"     - {x.get('display_name') or '(nimetön)'}  VIN {x.get('vin')}  tila: {x.get('state')}")

def refresh():
    cfg, t = load(CFG), load(TOK)
    cid = cfg.get("client_id") or input("Client ID: ").strip()
    if not t.get("refresh_token"): print("tokens.json:ssa ei ole refresh_tokenia – aja ensin koko käyttöönotto."); sys.exit(1)
    s, j = req_("POST", TOKEN_URL, {"grant_type": "refresh_token", "client_id": cid, "refresh_token": t["refresh_token"]}, form=True)
    if s != 200 or "access_token" not in j: print(f"Päivitys epäonnistui (HTTP {s}): {j}"); sys.exit(1)
    j["obtained_at"] = int(time.time()); save(TOK, j); ok("Uusi access token tallennettu tokens.json (refresh token vaihtui myös).")
    return j

def main():
    print("=== Tesla Fleet API -käyttöönotto (APIna) ===")
    print(f"Domain: {DOMAIN}   Alue: EU   Paluuosoite: {REDIRECT}")
    print("Varmista, että Tesla-sovelluksesi Redirect URI -listassa on:", REDIRECT)
    cfg = load(CFG)
    cid = input(f"\nClient ID{' [' + cfg['client_id'] + ']' if cfg.get('client_id') else ''}: ").strip() or cfg.get("client_id", "")
    sec = getpass.getpass("Client Secret (ei näy, ei tallenneta): ").strip()
    if not cid or not sec: print("Client ID ja Secret tarvitaan."); sys.exit(1)
    save(CFG, {"client_id": cid})

    step(1, "Tarkistetaan julkinen avain")
    pem = f"https://{DOMAIN}/.well-known/appspecific/com.tesla.3p.public-key.pem"
    try:
        with urllib.request.urlopen(urllib.request.Request(pem, headers=UA), timeout=20) as r: txt = r.read().decode()
        ok("Avain löytyy") if "BEGIN PUBLIC KEY" in txt else warn("Tiedosto löytyi, mutta ei näytä julkiselta avaimelta")
    except Exception as e: warn(f"Avainta ei saatu: {e}")

    step(2, "Haetaan partner-token")
    s, j = req_("POST", TOKEN_URL, {"grant_type": "client_credentials", "client_id": cid, "client_secret": sec,
        "scope": "openid vehicle_device_data vehicle_cmds vehicle_charging_cmds", "audience": FLEET}, form=True)
    if s != 200 or "access_token" not in j: print(f"  Partner-token epäonnistui (HTTP {s}): {j}\n  Tarkista Client ID/Secret ja että sovellus on hyväksytty."); sys.exit(1)
    ptok = j["access_token"]; ok("Partner-token saatu")

    step(3, "Rekisteröidään domain EU-alueelle")
    s, j = req_("POST", FLEET + "/api/1/partner_accounts", {"domain": DOMAIN}, token=ptok)
    ok("Rekisteröity") if s == 200 else warn(f"HTTP {s}: {j} (jos jo rekisteröity, tämä on ok)")
    s, j = req_("GET", FLEET + "/api/1/partner_accounts/public_key?domain=" + DOMAIN, token=ptok)
    ok("Tesla näkee julkisen avaimen") if s == 200 else warn(f"Avaintarkistus HTTP {s}: {j}")

    step(4, "Kirjautuminen selaimessa")
    state = secrets.token_urlsafe(16); url = build_authorize_url(cid, state)
    print("  Avataan selain. Jos se ei aukea, kopioi tämä osoite selaimeen:\n  " + url)
    webbrowser.open(url)
    print("  Odotetaan kirjautumista (max 5 min)...")
    code, got = wait_for_code(state)
    if not code: print(f"  Kirjautuminen ei onnistunut: {got}"); sys.exit(1)
    ok("Koodi vastaanotettu")

    step(5, "Vaihdetaan koodi tokeneiksi")
    s, j = req_("POST", TOKEN_URL, {"grant_type": "authorization_code", "client_id": cid, "client_secret": sec, "code": code,
        "redirect_uri": REDIRECT, "audience": FLEET}, form=True)
    if s != 200 or "access_token" not in j: print(f"  Vaihto epäonnistui (HTTP {s}): {j}"); sys.exit(1)
    j["obtained_at"] = int(time.time()); save(TOK, j)
    ok(f"Tallennettu: {TOK}")

    step(6, "Haetaan ajoneuvot")
    list_vehicles(j["access_token"])
    print(f"\nVALMIS! Seuraavaksi:\n  1) Parita virtuaaliavain puhelimella: https://tesla.com/_ak/{DOMAIN}\n  2) Tuo tokens.json APIna-sovellukseen (Käyttöönotto → vaihe 6) tai käytä server.py:tä.\n  3) Access token vanhenee ~8 h: päivitä komennolla  python3 setup_tesla.py refresh_token")

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    try:
        if cmd in ("refresh_token", "refresh"): refresh()
        elif cmd == "vehicles": list_vehicles(load(TOK).get("access_token") or sys.exit("tokens.json puuttuu"))
        elif cmd in ("-h", "--help", "help"): print(__doc__)
        else: main()
    except KeyboardInterrupt: print("\nKeskeytetty.")
    if os.name == "nt" and not sys.argv[1:]: input("\nPaina Enter sulkeaksesi...")
