#!/usr/bin/env python3
"""Uji form Tambah Master / Follower: field wajib, validasi, submit, keamanan password."""
import json, sys, time, urllib.parse, urllib.request
sys.path.insert(0, "/Users/mohamadlioktabriansyah/.hermes/cache/scratch")
from render import new_tab, close_tab, R

BASE = "http://127.0.0.1:8080/"

def check(cond, label, detail=""):
    print(f"  [{'PASS' if cond else 'FAIL'}] {label}" + (f"  {detail}" if detail else ""))
    return bool(cond)

def main():
    tab = new_tab(BASE + "#/master/new")
    time.sleep(2.0)
    r = R(tab["webSocketDebuggerUrl"])
    results = []
    try:
        r.call("Page.enable"); r.call("Runtime.enable"); time.sleep(0.8)
        r.ev("window.__errs=[];window.onerror=function(m){window.__errs.push(''+m);return false}")

        print("== FORM MASTER ==")
        f = json.loads(r.ev("""(()=>{const ids=['m_broker','m_server','m_login','m_pw','m_label','m_symbol'];
          const out={};ids.forEach(i=>out[i]=!!document.getElementById(i));
          out.form=!!document.getElementById('form-master');
          out.pwtype=(document.getElementById('m_pw')||{}).type;
          return JSON.stringify(out);})()""") or "{}")
        results.append(check(f.get("form") and all(f.get(k) for k in
            ["m_broker","m_server","m_login","m_pw","m_label","m_symbol"]),
            "Field wajib ada: Broker, Server, ID, Password, Label, Symbol"))
        results.append(check(f.get("pwtype") == "password", "Password bertipe password (tersembunyi)"))

        # submit kosong -> harus gagal & menampilkan error
        before = r.ev("location.hash")
        r.ev("document.getElementById('form-master').requestSubmit()")
        time.sleep(0.6)
        errs = json.loads(r.ev("""JSON.stringify({
          shown:[...document.querySelectorAll('.errmsg.on')].map(e=>e.id),
          marked:document.querySelectorAll('.inp.err').length,
          hash:location.hash})""") or "{}")
        results.append(check(len(errs.get("shown", [])) >= 5 and errs.get("marked", 0) >= 5,
                             "Submit kosong ditolak + 5 kolom ditandai", str(errs.get("shown"))))
        results.append(check(errs.get("hash") == "#/master/new", "Tetap di form saat validasi gagal"))

        # ID non-angka harus ditolak
        r.ev("""(()=>{const set=(i,v)=>{const e=document.getElementById(i);e.value=v;};
          set('m_broker','Exness');set('m_server','Exness-MT5Trial14');set('m_login','abc123');
          set('m_pw','rahasia123');set('m_label','Master Uji');})()""")
        r.ev("document.getElementById('form-master').requestSubmit()")
        time.sleep(0.5)
        badid = r.ev("document.getElementById('err-m_login').classList.contains('on')")
        results.append(check(bool(badid), "ID non-angka ditolak"))

        # isian benar -> submit sukses, pindah ke daftar, jumlah master naik
        n_before = r.ev("NX.masters.length")
        r.ev("document.getElementById('m_login').value='998877665'")
        r.ev("document.getElementById('form-master').requestSubmit()")
        time.sleep(1.0)
        state = json.loads(r.ev("""JSON.stringify({
          hash:location.hash, n:NX.masters.length,
          added:NX.masters.filter(m=>m.name==='Master Uji').length,
          rows:document.querySelectorAll('#view tbody tr, #view .fgrid .f').length})""") or "{}")
        results.append(check(state.get("hash") == "#/masters", "Setelah sukses pindah ke daftar Master",
                              state.get("hash")))
        results.append(check(state.get("n") == n_before + 1 and state.get("added") == 1,
                             "Master baru masuk daftar", f"{n_before} -> {state.get('n')}"))

        # KEAMANAN: password tidak boleh ada di DOM / storage
        leak = json.loads(r.ev("""JSON.stringify({
          dom:document.body.innerHTML.includes('rahasia123'),
          ls:JSON.stringify(localStorage).includes('rahasia123'),
          ss:JSON.stringify(sessionStorage).includes('rahasia123'),
          obj:JSON.stringify(NX).includes('rahasia123')})""") or "{}")
        results.append(check(not any(leak.values()), "Password tidak tersimpan di DOM/storage/data",
                             json.dumps(leak)))

        print("== FORM FOLLOWER ==")
        r.ev("location.hash='#/follower/new'"); time.sleep(0.9)
        g = json.loads(r.ev("""(()=>{const ids=['f_broker','f_server','f_login','f_pw','f_label','f_master','f_map_dst','f_volval'];
          const out={};ids.forEach(i=>out[i]=!!document.getElementById(i));
          out.form=!!document.getElementById('form-follower');
          out.masterOpts=document.getElementById('f_master')?document.getElementById('f_master').options.length:0;
          out.volTypes=document.querySelectorAll('input[name=\"f_voltype\"]').length;
          return JSON.stringify(out);})()""") or "{}")
        results.append(check(g.get("form") and all(g.get(k) for k in
            ["f_broker","f_server","f_login","f_pw","f_label","f_master","f_map_dst","f_volval"]),
            "Field wajib ada: Broker, Server, ID, Password, Label, Master, Symbol, Volume"))
        results.append(check(g.get("masterOpts", 0) >= 1, "Dropdown master terisi", f"{g.get('masterOpts')} opsi"))
        results.append(check(g.get("volTypes") == 3, "3 pilihan volume rule (fixed/multiplier/equity)"))

        nf = r.ev("NX.followers.length")
        r.ev("""(()=>{const set=(i,v)=>{const e=document.getElementById(i);e.value=v;};
          set('f_broker','IC Markets');set('f_server','ICMarkets-MT5');set('f_login','555444333');
          set('f_pw','rahasiafollower');set('f_label','Follower Uji');set('f_map_dst','XAUUSD.m');
          set('f_volval','0.07');
          document.querySelector('input[name=\"f_voltype\"][value=\"multi\"]').checked=true;
          document.getElementById('f_master').dispatchEvent(new Event('change',{bubbles:true}));})()""")
        time.sleep(0.3)
        r.ev("document.getElementById('form-follower').requestSubmit()")
        time.sleep(1.0)
        st2 = json.loads(r.ev("""JSON.stringify({
          hash:location.hash, n:NX.followers.length,
          added:NX.followers.filter(f=>f.name==='Follower Uji').map(f=>({vol:f.vol,map:f.map}))})""") or "{}")
        results.append(check(st2.get("hash") == "#/followers", "Setelah sukses pindah ke daftar Follower"))
        results.append(check(st2.get("n") == nf + 1, "Follower baru masuk daftar", f"{nf} -> {st2.get('n')}"))
        add = (st2.get("added") or [{}])[0]
        results.append(check("Multiplier" in (add.get("vol") or ""), "Volume rule tersimpan benar", add.get("vol")))
        results.append(check("→" in (add.get("map") or ""), "Map symbol terbentuk", add.get("map")))

        leak2 = r.ev("JSON.stringify(NX).includes('rahasiafollower') || document.body.innerHTML.includes('rahasiafollower')")
        results.append(check(not leak2, "Password follower tidak tersimpan"))

        js_err = r.ev("(window.__errs||[]).length")
        results.append(check(js_err == 0, "Tidak ada error JS", f"{js_err} error"))

        print("-" * 62)
        print(f"TOTAL {len(results)} | PASS {sum(results)} | FAIL {len(results)-sum(results)}")
        print("VERDICT:", "SEMUA OK" if all(results) else "ADA MASALAH")
    finally:
        r.close(); close_tab(tab["id"])
    return 0 if all(results) else 1

if __name__ == "__main__":
    sys.exit(main())
