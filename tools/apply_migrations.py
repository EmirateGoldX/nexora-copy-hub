#!/usr/bin/env python3
"""
Terapkan migrasi SQL ke database PostgreSQL (Neon).

Memakai pglast untuk memecah file jadi statement yang benar — aman terhadap
titik-koma di dalam function body ($$ ... $$) dan di dalam komentar.

Pemakaian:
    export DATABASE_URL='postgresql://...'
    python3 tools/apply_migrations.py            # semua migrasi berurutan
    python3 tools/apply_migrations.py --dry-run  # hanya hitung statement
    python3 tools/apply_migrations.py --verify   # tampilkan tabel + jumlah baris

KEAMANAN: connection string dibaca dari environment, tidak pernah ditulis ke disk
dan tidak pernah dicetak. Hanya nama host yang ditampilkan.
"""
import glob
import os
import sys
from urllib.parse import urlparse

try:
    from pglast import parser
except ImportError:
    print("pglast belum terpasang: pip install pglast")
    sys.exit(2)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIG_DIR = os.path.join(ROOT, "db", "migrations")


def split_statements(sql):
    """Pecah jadi statement; buang BEGIN/COMMIT dan yang kosong."""
    out = []
    for s in parser.split(sql):
        body = s.strip()
        if not body:
            continue
        # buang komentar pembuka untuk cek kata pertama
        probe = body
        while probe.startswith("--"):
            probe = probe.split("\n", 1)[1] if "\n" in probe else ""
            probe = probe.lstrip()
        first = probe.split(None, 1)[0].lower() if probe else ""
        if first in ("begin", "commit", "rollback"):
            continue
        out.append(body)
    return out


def to_direct(url):
    """Migrasi WAJIB lewat endpoint direct, bukan pooler.

    Di pooler mode transaction, urutan BEGIN/COMMIT bisa mendarat di koneksi
    server berbeda sehingga migrasi tampak sukses tapi tidak tersimpan.
    Neon: host pooled berakhiran '-pooler', host direct tanpa itu.
    """
    u = urlparse(url)
    host = u.hostname or ""
    if "-pooler" not in host:
        return url, False
    direct = host.replace("-pooler", "", 1)
    rebuilt = url.replace(host, direct)
    return rebuilt, True


def connect(flag_direct=False):
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        print("DATABASE_URL belum diset.")
        sys.exit(2)
    try:
        import psycopg
    except ImportError:
        print("psycopg belum terpasang: pip install 'psycopg[binary]'")
        sys.exit(2)

    direct_url, was_pooled = to_direct(url)
    if was_pooled:
        print("CATATAN: endpoint 'pooler' terdeteksi -> memakai koneksi DIRECT untuk migrasi")
        print("         (pooler mode transaction tidak aman untuk DDL/BEGIN-COMMIT)")
    elif flag_direct:
        print("CATATAN: --direct diminta, koneksi sudah direct")

    u = urlparse(direct_url)
    print(f"host: {u.hostname}  db: {(u.path or '/').lstrip('/')}  user: {u.username}")
    return psycopg.connect(direct_url, connect_timeout=25)


def main():
    args = sys.argv[1:]
    dry = "--dry-run" in args
    verify_only = "--verify" in args

    files = sorted(glob.glob(os.path.join(MIG_DIR, "*.sql")))
    if not files:
        print("Tidak ada migrasi.")
        return 1

    if dry:
        for f in files:
            st = split_statements(open(f, encoding="utf-8").read())
            print(f"{os.path.basename(f):<34} {len(st):>3} statement")
        return 0

    conn = connect(flag_direct='--direct' in args)
    ok = True
    try:
        # autocommit=True + BEGIN/COMMIT eksplisit.
        # JANGAN pakai conn.transaction() saat autocommit=False: psycopg3 membuat
        # SAVEPOINT, bukan transaksi, sehingga hasilnya tidak pernah ter-COMMIT.
        conn.autocommit = True
        if not verify_only:
            # tabel pelacak migrasi — mencegah migrasi dijalankan dua kali
            conn.execute("""
                create table if not exists schema_migrations (
                  version    text primary key,
                  applied_at timestamptz not null default now()
                )
            """)

            applied = {r[0] for r in conn.execute("select version from schema_migrations").fetchall()}
            print(f"migrasi tercatat: {sorted(applied) or '(belum ada)'}")

            for f in files:
                name = os.path.basename(f)
                if name in applied:
                    print(f"\n== {name} — SUDAH DITERAPKAN, dilewati ==")
                    continue
                sts = split_statements(open(f, encoding="utf-8").read())
                print(f"\n== {name} ({len(sts)} statement) ==")
                done = 0
                conn.execute("BEGIN")
                try:
                    for s in sts:
                        conn.execute(s)
                        done += 1
                    conn.execute(
                        "insert into schema_migrations (version) values (%s)", (name,))
                    conn.execute("COMMIT")
                    print(f"   OK  {done}/{len(sts)}  (committed)")
                except Exception as e:
                    try:
                        conn.execute("ROLLBACK")
                    except Exception:
                        pass
                    ok = False
                    print(f"   GAGAL pada statement #{done + 1}")
                    print("   " + str(e).splitlines()[0][:300])
                    print(f"   {done} statement di-rollback (satu file = satu transaksi)")
                    break

        # verifikasi
        print("\n== VERIFIKASI ==")
        rows = conn.execute("""
            select table_name from information_schema.tables
            where table_schema='public' and table_type='BASE TABLE' order by 1
        """).fetchall()
        print(f"tabel ({len(rows)}): " + ", ".join(r[0] for r in rows))
        mig = conn.execute("select version, applied_at from schema_migrations order by version").fetchall()
        print("migrasi tercatat:")
        for v, a in mig:
            print(f"   {v:<24} {a:%Y-%m-%d %H:%M:%S}")
        views = conn.execute("""
            select table_name from information_schema.views
            where table_schema='public' order by 1
        """).fetchall()
        print(f"view  ({len(views)}): " + ", ".join(r[0] for r in views))
        typ = conn.execute("""
            select typname from pg_type t join pg_namespace n on n.oid=t.typnamespace
            where n.nspname='public' and t.typtype='e' order by 1
        """).fetchall()
        print(f"enum  ({len(typ)}): " + ", ".join(r[0] for r in typ))

        for t in ["masters", "followers", "events", "instructions", "positions_map", "workers"]:
            try:
                n = conn.execute(f"select count(*) from {t}").fetchone()[0]
                print(f"   {t:<16} {n} baris")
            except Exception:
                pass
    finally:
        conn.close()

    # ---- bukti persistensi: buka koneksi baru, baca ulang ----
    print("\n== BUKTI PERSISTENSI (koneksi baru) ==")
    try:
        import psycopg as _pg
        c2 = _pg.connect(to_direct(os.environ["DATABASE_URL"])[0], connect_timeout=25)
        n_mig = c2.execute("select count(*) from schema_migrations").fetchone()[0]
        n_m = c2.execute("select count(*) from masters").fetchone()[0]
        n_f = c2.execute("select count(*) from followers").fetchone()[0]
        print(f"   schema_migrations={n_mig}  masters={n_m}  followers={n_f}")
        if n_mig < len(files) or (n_m == 0 and any("seed" in f for f in files)):
            ok = False
            print("   PERINGATAN: data tidak terlihat dari koneksi baru -> tidak persisten")
        else:
            print("   OK: data terlihat dari koneksi terpisah")
        c2.close()
    except Exception as e:
        print("   gagal verifikasi ulang:", str(e).splitlines()[0][:160])

    print("\nHASIL:", "SEMUA OK" if ok else "ADA KEGAGALAN")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
