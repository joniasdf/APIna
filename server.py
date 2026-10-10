#!/usr/bin/env python3
"""Pieni paikallinen palvelin + CORS-proxy Tesla Fleet API:lle. Ei tallenna tokeneita."""
import http.server, urllib.request, urllib.error, urllib.parse, json, os, sys, sqlite3, threading, time
ALLOWED = ("https://fleet-api.prd.na.vn.cloud.tesla.com","https://fleet-api.prd.eu.vn.cloud.tesla.com",
           "https://fleet-api.prd.cn.vn.cloud.tesla.cn","https://auth.tesla.com","https://fleet-auth.prd.vn.cloud.tesla.com","https://api.porssisahko.net") + tuple(x for x in [os.environ.get("TESLA_CMD_PROXY","")] if x)
os.chdir(os.path.dirname(os.path.abspath(__file__)))
DB = os.environ.get("TESLA_DB", "tesla.db")
def db():
    c = sqlite3.connect(DB); c.execute("CREATE TABLE IF NOT EXISTS snap(vin TEXT, t INTEGER, j TEXT)"); c.execute("CREATE INDEX IF NOT EXISTS i ON snap(vin,t)"); return c
def point(t, d):
    c, cl, dr, vs = d.get("charge_state") or {}, d.get("climate_state") or {}, d.get("drive_state") or {}, d.get("vehicle_state") or {}
    loc = d.get("location_data") or dr
    return dict(t=t, lat=loc.get("latitude"), lon=loc.get("longitude"), sh=dr.get("shift_state"), spd=dr.get("speed"), pw=dr.get("power"),
                ub=c.get("usable_battery_level"), ir=c.get("ideal_battery_range"), cp=c.get("charger_power"), bat=c.get("battery_level"),
                range=c.get("battery_range"), odo=vs.get("odometer"), **{"in": cl.get("inside_temp")}, out=cl.get("outside_temp"),
                kwh=c.get("charge_energy_added"), cs=c.get("charging_state"))
def poller():
    """Pollaustila: TESLA_TOKEN, TESLA_VIN, TESLA_BASE (oletus EU), POLL_SEC (oletus 300). Ei herätä autoa (ei turhaa akun kulutusta)."""
    tok, vin = os.environ["TESLA_TOKEN"], os.environ["TESLA_VIN"]
    base = os.environ.get("TESLA_BASE", ALLOWED[1]); every = int(os.environ.get("POLL_SEC", "300"))
    ep = "charge_state;climate_state;drive_state;location_data;vehicle_state"
    while True:
        try:
            r = urllib.request.Request(f"{base}/api/1/vehicles/{vin}/vehicle_data?endpoints=" + urllib.parse.quote(ep), headers={"Authorization": "Bearer " + tok, "User-Agent": "TeslaApiExplorer/1.0"})
            with urllib.request.urlopen(r, timeout=30) as resp: d = json.loads(resp.read())["response"]
            c = db(); c.execute("INSERT INTO snap VALUES(?,?,?)", (vin, int(time.time() * 1000), json.dumps(d))); c.commit(); c.close()
            sh = (d.get("drive_state") or {}).get("shift_state"); cs = (d.get("charge_state") or {}).get("charging_state")
            print(time.strftime("%H:%M"), "tallennettu", vin, sh or "P", cs, flush=True)
            time.sleep(30 if sh in ("D", "R", "N") or cs == "Charging" else every)  # tiheämmin ajossa/latauksessa
        except urllib.error.HTTPError as e:
            print("poll HTTP", e.code, "(408 = auto nukkuu, ok)", flush=True); time.sleep(every)
        except Exception as e:
            print("poll virhe", e, flush=True); time.sleep(every)
class H(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/api/snapshots"):
            out = {}
            if os.path.exists(DB):
                c = db()
                for vin, t, j in c.execute("SELECT vin,t,j FROM snap ORDER BY t"): out.setdefault(vin, []).append(point(t, json.loads(j)))
                c.close()
            return self._j(200, out)
        return super().do_GET()
    def do_POST(self):
        if self.path != "/proxy": return self.send_error(404)
        req = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
        url = req.get("url", "")
        if not url.startswith(ALLOWED): return self._j(400, {"error": "URL ei sallittu"})
        body = req.get("body"); data = body.encode() if body else None
        hdr = {"Content-Type": "application/json", "User-Agent": "TeslaApiExplorer/1.0", "Accept": "application/json"}
        if req.get("token"): hdr["Authorization"] = "Bearer " + req["token"]
        r = urllib.request.Request(url, data=data, method=req.get("method", "GET"), headers=hdr)
        try:
            with urllib.request.urlopen(r, timeout=30) as resp: self._raw(resp.status, resp.read())
        except urllib.error.HTTPError as e: self._raw(e.code, e.read())
        except Exception as e: self._j(502, {"error": str(e)})
    def _raw(self, code, b):
        self.send_response(code); self.send_header("Content-Type", "application/json"); self.end_headers(); self.wfile.write(b)
    def _j(self, c, o): self._raw(c, json.dumps(o).encode())
    def log_message(self, f, *a): sys.stderr.write("[%s] %s\n" % (self.address_string(), f % a))
args = [a for a in sys.argv[1:] if not a.startswith("--")]
port = int(args[0]) if args else 8787
if "--poll" in sys.argv:
    threading.Thread(target=poller, daemon=True).start(); print("Pollaustila päällä ->", DB)
print(f"Tesla API Explorer: http://localhost:{port}")
http.server.ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
