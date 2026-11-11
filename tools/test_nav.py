#!/usr/bin/env python3
"""Uji navigasi NEXORA COPY HUB: buka tiap route, cek render + error JS."""
import json, os, sys, time, urllib.parse, urllib.request
sys.path.insert(0, "/Users/mohamadlioktabriansyah/.hermes/cache/scratch")
from cdp import send_text, recv_text, ws_connect

PORT = 9222
APP = "/Users/mohamadlioktabriansyah/nexora-copy-hub/index.html"
URL = "file://" + urllib.parse.quote(APP)

ROUTES = [
    ("#/",                 "Control Room"),
    ("#/masters",          "Master list"),
    ("#/master/A",         "Master A detail"),
    ("#/master/B",         "Master B detail"),
    ("#/master/C",         "Master C detail"),
    ("#/master/new",       "Form tambah master"),
    ("#/followers",        "Follower list"),
    ("#/follower/1",       "Follower 1 detail"),
    ("#/follower/7",       "Follower 7 (orphan)"),
    ("#/follower/4",       "Follower 4 (hold)"),
    ("#/follower/new",     "Form tambah follower"),
    ("#/routing",          "Routing"),
    ("#/log",              "Event Log"),
    ("#/workers",          "Workers"),
    ("#/security",         "Keamanan"),
    ("#/settings",         "Pengaturan"),
    ("#/tidak-ada",        "404 fallback"),
]

def new_tab(url):
    req = urllib.request.Request(
        f"http://127.0.0.1:{PORT}/json/new?{urllib.parse.quote(url, safe='')}", method="PUT")
    return json.load(urllib.request.urlopen(req, timeout=20))

def close_tab(tid):
    try: urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/close/{tid}", timeout=10).read()
    except Exception: pass

class R:
    def __init__(self, ws): self.s = ws_connect(ws); self.i = 0; self.errs = []
    def call(self, method, **p):
        self.i += 1
        send_text(self.s, json.dumps({"id": self.i, "method": method, "params": p}))
        while True:
            m = json.loads(recv_text(self.s))
            if m.get("method") == "Runtime.consoleAPICalled":
                if m["params"].get("type") == "error":
                    self.errs.append("console: " + json.dumps(m["params"].get("args"))[:200])
            if m.get("method") == "Runtime.exceptionThrown":
                self.errs.append("exception: " + m["params"]["exceptionDetails"].get("text", "")[:200])
            if m.get("id") == self.i:
                if "error" in m: raise RuntimeError(f"{method}: {m['error']}")
                return m.get("result", {})
    def ev(self, expr):
        r = self.call("Runtime.evaluate", expression=expr, returnByValue=True)
        return r.get("result", {}).get("value")

def main():
    tag = new_tab(URL); tid = tag.get("id")
    time.sleep(1.5)
    r = R(tag["webSocketDebuggerUrl"])
    results = []
    try:
        r.call("Runtime.enable")
        r.call("Page.enable")
        time.sleep(1.0)
        # matikan alert supaya tidak memblokir
        r.ev("window.alert=function(){}")
        r.ev("window.__errs=[]; window.onerror=function(m){window.__errs.push(''+m); return false};")
        for route, label in ROUTES:
            n_before = len(r.errs)
            r.ev(f"location.hash={json.dumps(route)}")
            time.sleep(0.45)
            info = json.loads(r.ev("""(()=>{
                const v=document.getElementById('view');
                const nav=document.querySelectorAll('[data-nav]');
                const active=[...nav].filter(a=>a.classList.contains('on')).map(a=>a.dataset.nav);
                return JSON.stringify({
                  len:(v?v.innerText.trim().length:0),
                  cards:(v?v.querySelectorAll('.card').length:0),
                  tables:(v?v.querySelectorAll('table').length:0),
                  links:(v?v.querySelectorAll('a[href^="#/"]').length:0),
                  active:active,
                  title:document.title,
                  errs:(window.__errs||[]).slice(0,3)
                });})()""") or "{}")
            new_err = r.errs[n_before:]
            # halaman 404 memang ringkas; ambang minimum lebih rendah
            min_len = 80 if route == "#/tidak-ada" else 200
            ok = info.get("len", 0) > min_len and not new_err and not info.get("errs")
            results.append((route, label, info, ok, new_err))
    finally:
        # ringkasan
        print(f"{'ROUTE':<20}{'HALAMAN':<24}{'TEKS':>6}{'CARD':>6}{'TBL':>5}{'LINK':>6}  HASIL")
        print("-" * 88)
        allok = True
        for route, label, info, ok, err in results:
            print(f"{route:<20}{label:<24}{info.get('len',0):>6}{info.get('cards',0):>6}"
                  f"{info.get('tables',0):>5}{info.get('links',0):>6}  {'PASS' if ok else 'FAIL'}")
            if not ok:
                allok = False
                if err: print("      err:", err[:180])
                if info.get("errs"): print("      js :", info["errs"])
        print("-" * 88)
        print("TOTAL:", len(results), "| PASS:", sum(1 for x in results if x[3]),
              "| FAIL:", sum(1 for x in results if not x[3]))
        # cek tidak ada scroll horizontal
        ovf = r.ev("document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
        print("scroll horizontal berlebih:", bool(ovf))
        print("VERDICT:", "SEMUA HALAMAN OK" if allok else "ADA MASALAH")
        r.s.close(); close_tab(tid)
    return 0 if allok else 1

if __name__ == "__main__":
    sys.exit(main())
