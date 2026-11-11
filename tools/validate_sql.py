#!/usr/bin/env python3
"""
Validasi sintaks SQL (PostgreSQL) untuk semua file migrasi.

Memakai parser PostgreSQL asli (pglast) — bukan regex.

Pemakaian:
    python3 tools/validate_sql.py

Butuh: pip install pglast
Catatan: ini memeriksa SINTAKS, bukan semantik. Urutan foreign key, izin,
dan validitas view hanya terbukti saat dijalankan di database sungguhan.
"""
import glob
import os
import sys

try:
    from pglast import parser
except ImportError:
    print("pglast belum terpasang. Jalankan: pip install pglast")
    sys.exit(2)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATTERNS = ["db/migrations/*.sql"]


def main():
    files = []
    for pat in PATTERNS:
        files.extend(sorted(glob.glob(os.path.join(ROOT, pat))))
    if not files:
        print("Tidak ada file SQL ditemukan.")
        return 1

    allok = True
    for f in files:
        rel = os.path.relpath(f, ROOT)
        sql = open(f, encoding="utf-8").read()
        try:
            tree = parser.parse_sql(sql)
            print(f"OK    {rel:<38} {len(tree):>3} statement  {len(sql):>6} char")
        except Exception as e:
            allok = False
            print(f"GAGAL {rel}")
            for line in str(e).splitlines()[:8]:
                print("      " + line)

    print("-" * 66)
    print("VALIDASI SINTAKS:", "SEMUA OK" if allok else "ADA ERROR")
    return 0 if allok else 1


if __name__ == "__main__":
    sys.exit(main())
