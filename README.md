# NEXORA COPY HUB — Interface

Prototype antarmuka untuk **NEXORA COPY HUB**: platform copy trading **100% cloud-based**
(multiple master, multiple follower, tanpa batas follower dari software).

> **Status tahap ini: TAMPILAN & NAVIGASI SAJA.**
> Belum ada backend, belum ada koneksi MT5, belum ada eksekusi order.
> Seluruh angka di dashboard adalah **data contoh** untuk keperluan desain.

---

## Yang sudah ada

- **8 halaman** yang semuanya bisa dibuka dan saling terhubung
- **Responsif**: desktop (≥1280px sampai ultrawide), tablet, mobile (≤640px)
- **Tema gelap dominan** dengan aksen status (hijau / amber / merah / cyan)
- **Router hash** — setiap halaman punya URL sendiri, tombol back/forward browser bekerja
- **Tidak ada build step** — buka `index.html` langsung di browser

## Halaman

| Route | Halaman | Isi |
|---|---|---|
| `#/` | Control Room | status sistem, latensi (median/P95/P99), drift, grup master→follower |
| `#/masters` | Master | daftar master + follower masing-masing |
| `#/master/:id` | Master detail | observer health, beban, follower, event terbaru |
| `#/followers` | Follower | tabel semua follower lintas broker |
| `#/follower/:id` | Follower detail | koneksi, drift, konfigurasi copy, aksi, riwayat |
| `#/routing` | Routing | matriks master→follower + aturan penyalinan |
| `#/log` | Event Log | event live + reconciler/drift |
| `#/workers` | Workers | health check Windows cloud worker |
| `#/keamanan` → `#/security` | Keamanan | kontrol kredensial + aturan keras |
| `#/settings` | Pengaturan | parameter aktif + keputusan yang belum dikunci |

## Menjalankan

Cukup buka `index.html` di browser:

```bash
open index.html          # macOS
```

Atau lewat server lokal (disarankan agar path konsisten):

```bash
python3 -m http.server 8080
# lalu buka http://localhost:8080
```

## Struktur

```
index.html                 shell + navigasi
assets/
  css/app.css              design system (token, komponen, breakpoint)
  js/data.js               data contoh (MOCK) — ditandai jelas di header file
  js/app.js                router + render tiap halaman
tools/
  test_nav.py              uji otomatis: buka semua route, cek render + error JS
docs/shots/                tangkapan layar hasil render
```

## Uji navigasi

```bash
python3 tools/test_nav.py
```

Membuka setiap route di browser sungguhan (CDP), memeriksa halaman ter-render,
tidak ada error JS, dan tidak ada scroll horizontal. Hasil terakhir:
**15/15 route PASS**.

## Prinsip desain

- **Keterbacaan dulu** — ukuran teks minimum 12px, kontras teks sekunder dinaikkan
- **Status harus jelas** — ORPHANED, STALE, sync error dibedakan warna + label, bukan hanya warna
- **Emergency Stop selalu terjangkau** — di header (desktop) dan bar bawah melekat (mobile)
- **Informasi operasional wajib** — drift dipisah *allowed* vs *sync error*; latensi dilaporkan
  median/P95/P99 terpisah; master "hidup tapi stale" dibedakan dari "mati"

## Yang BELUM dikerjakan (sengaja)

- Backend, database, queue, reconciler
- Koneksi ke terminal MT5 (observer / executor)
- Autentikasi nyata (login, MFA) — tombol saat ini hanya menampilkan notifikasi
- Data nyata — `assets/js/data.js` masih mock

## Peringatan keamanan

Repo ini **hanya berisi kode antarmuka dan data contoh**. Tidak ada kredensial akun trading.

`.gitignore` sudah memblokir `.env`, file kredensial, private key, dan dump database.
**Jangan pernah** menambahkan investor password, trading password, atau API key ke repo ini.

Sebelum kode backend ditambahkan kelak, pertimbangkan untuk menjadikan repo ini **private**.

---

## Konteks proyek

Arsitektur target (dokumen terpisah, belum diimplementasikan):

```
Master (mobile/desktop/web) → Broker master
    ↓ investor password (read-only)
Windows Cloud Worker — Master Observer
    ↓ event (L1 current state + L2 transaction history)
Linux Application Server — API · Copy Engine · Risk · Queue · Reconciler · Database
    ↓ instruksi (TTL, idempotency)
Windows Cloud Worker — Follower Executors (trading credential)
    ↓ order
Broker follower (spesifikasi beda per broker)

Dashboard (browser desktop + mobile) = KONTROL & MONITORING SAJA
```

Gate yang belum dilewati: **PoC-1 Master Observer** — belum dijalankan, belum ada hasil.
