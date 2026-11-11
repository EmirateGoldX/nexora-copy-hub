# NEXORA COPY HUB — DATABASE

**Mesin:** PostgreSQL serverless di **Neon**
**Proyek:** `young-silence-64409572`
**Branch:** `br-still-mud-ao2vyeav`

---

## 1. Status

| Item | Status |
|---|---|
| Skema ditulis | ✅ `db/migrations/0001_init.sql` |
| Data contoh | ✅ `db/migrations/0002_seed_demo.sql` |
| Diterapkan ke Neon | ❌ **belum** — butuh persetujuan + kredensial koneksi |
| Backend yang memakainya | ❌ belum ada |

Skema ini **rancangan**. Belum dijalankan di database mana pun.

---

## 2. Cara menerapkan

### Manual (paling terkontrol)

Ambil connection string dari Neon Console → **Connect** → pilih branch
`br-still-mud-ao2vyeav`. Pakai **direct** connection (bukan pooled) untuk migrasi:

```bash
export DATABASE_URL='postgresql://<user>:<pass>@<host>/<db>?sslmode=require'

psql "$DATABASE_URL" -f db/migrations/0001_init.sql
psql "$DATABASE_URL" -f db/migrations/0002_seed_demo.sql
```

Verifikasi:

```sql
select label, broker, login, symbol, status from masters order by label;
select * from v_follower_status order by label;
```

### Lewat Neon MCP

Konektor `neon_mcp` sudah terpasang tapi **belum terhubung**. Setelah diotorisasi,
skema ini bisa diterapkan langsung ke branch tersebut tanpa keluar dari sesi ini.

---

## 3. Aturan keamanan (mengikat)

| # | Aturan | Alasan |
|---|---|---|
| D1 | **Tidak ada kolom password** untuk akun trading | Password hidup di KMS/Vault; database hanya menyimpan `credential_ref` |
| D2 | `users.password_hash` hanya untuk login dashboard, bukan password trading | Dua hal yang sangat berbeda |
| D3 | Connection string **tidak pernah** masuk repo | `.gitignore` sudah memblokir `.env` |
| D4 | Gunakan `timestamptz`, jangan `timestamp` | Jam server broker berbeda per broker |
| D5 | Harga & volume pakai `numeric`, jangan `float` | Pembulatan lot harus eksak |
| D6 | Koneksi aplikasi pakai **pooled** endpoint | Serverless Postgres punya batas koneksi |

---

## 4. Peta tabel

| Tabel | Isi |
|---|---|
| `masters` | Akun sumber, diakses read-only lewat investor password |
| `followers` | Akun eksekutor + aturan penyalinan (symbol map, volume rule) |
| `broker_profiles` | Spesifikasi eksekusi per broker/symbol — dibaca dari terminal, bukan diasumsikan |
| `events` | Hasil deteksi observer; `idempotency_key` unik mencegah double-copy |
| `instructions` | Satu baris per follower per event; punya `expires_at` (TTL) |
| `positions_map` | Relasi posisi master ↔ posisi follower |
| `drift_log` | `allowed` vs `sync_error` |
| `workers` | Windows cloud worker + heartbeat |
| `users` | Akses dashboard |
| `audit_log` | Jejak semua instruksi & perubahan konfigurasi |
| `v_follower_status` | View ringkasan untuk dashboard |

---

## 5. Keputusan desain yang perlu diketahui

**Idempotency.** `events.idempotency_key` unik. Format: `<master_id>|deal:<deal_ticket>`.
Deal ticket unik dan tidak berubah, jadi lebih aman daripada kombinasi symbol+waktu.

**TTL instruksi.** `instructions.expires_at` diisi saat pembuatan. Instruksi yang lewat
waktu itu tidak boleh dieksekusi — ini yang mencegah follower mengeksekusi order basi
setelah reconnect.

**`positions_map` adalah tabel paling penting.** Tanpa itu sistem tidak tahu follower
ticket mana yang harus ditutup ketika master menutup posisi. Unik per
`(follower_id, master_position_id)`.

**`broker_profiles` menyimpan hasil probe, bukan hardcode.** Angka di seed demo
adalah contoh — wajib diganti hasil pembacaan nyata dari terminal tiap broker.

**Drift dipisah dua kategori.** `allowed` (akibat konfigurasi/batasan broker) dicatat
tapi tidak diperbaiki. `sync_error` harus diperbaiki atau di-alert.

---

## 6. Yang belum ada

- Tabel untuk sesi login dashboard
- Tabel untuk snapshot equity/margin (kalau nanti dibutuhkan)
- Retention / partisi untuk `events` dan `audit_log` (akan tumbuh cepat)
- Row-level security (kalau nanti multi-tenant)

Belum ada backend yang tersambung. Belum ada satu baris kode aplikasi yang
membaca database ini.
