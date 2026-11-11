# NEXORA COPY HUB — ALUR SISTEM

**Status: RANCANGAN. Belum diimplementasikan.**
PoC-1 (master observer) belum dijalankan dan belum menghasilkan data pengujian apa pun.

Dokumen ini menjelaskan bagaimana satu transaksi master berjalan sampai tereksekusi di follower,
termasuk kontrak data, state machine, dan kasus tepi yang wajib ditangani.

---

## 1. Prinsip yang mengikat

| # | Prinsip | Konsekuensi |
|---|---|---|
| P1 | Sumber kebenaran = state di trade server broker | Sistem tidak pernah "menebak"; selalu baca ulang state |
| P2 | Observer bersifat read-only | Master tidak bisa dan tidak boleh dieksekusi |
| P3 | Deteksi dua lapisan (L1 state + L2 deal history) | L1 saja kehilangan transaksi antar-poll |
| P4 | Setiap instruksi harus idempoten | Satu event = maksimal satu eksekusi per follower |
| P5 | Instruksi punya TTL | Instruksi basi dibuang, tidak dieksekusi |
| P6 | Tidak ada blind retry | Retry hanya setelah status order diverifikasi |
| P7 | Spesifikasi eksekusi tidak diasumsikan sama antar broker | Baca spec broker tujuan sebelum kirim |
| P8 | Reconciler wajib, bukan opsional | Tanpa itu drift tidak terdeteksi |

---

## 2. Alur utama (10 langkah)

```
[1] Master trading (mobile / desktop / web)
        │  tidak ada EA di sisi master
        ▼
[2] Broker master mengeksekusi → state akun berubah (server-side)
        │
        ▼
[3] MASTER OBSERVER (Windows worker, investor password)
        ├─ L1: PositionsTotal() / OrdersTotal() + detail per ticket
        └─ L2: HistorySelect → deal (ENTRY, VOLUME, POSITION_ID, REASON)
        │
        ▼
[4] NORMALISASI EVENT  → tipe: OPEN | MODIFY | PARTIAL | CLOSE | PENDING_*
        │
        ▼
[5] DEDUPE & IDEMPOTENCY  (kunci: master | deal_ticket)
        │
        ▼
[6] ROUTING  → daftar follower terdaftar untuk master ini
        │
        ▼
[7] RISK & MAPPING  (per follower)
        ├─ symbol map
        ├─ volume: fixed / multiplier / equity-ratio → round ke lot step
        ├─ clamp SL/TP ke SYMBOL_TRADE_STOPS_LEVEL
        └─ OrderCheck (margin, filling mode, volume min/max)
        │
        ▼
[8] QUEUE per follower (FIFO, persist, TTL 8 s)
        │
        ▼
[9] FOLLOWER EXECUTOR (Windows worker, trading credential)
        └─ OrderCheck → OrderSend → retcode + fill aktual
        │
        ▼
[10] ACK + RECONCILE (loop 10 s)
        └─ banding state follower vs master → allowed drift | sync error
```

---

## 3. Kontrak event

```json
{
  "event_id":        "auto-increment / UUID",
  "idempotency_key": "A|deal:9001",
  "master_id":       "A",
  "type":            "OPEN | MODIFY | PARTIAL_CLOSE | CLOSE | PENDING_PLACED |
                      PENDING_MODIFIED | PENDING_CANCELLED | PENDING_FILLED |
                      REVERSAL | CLOSE_BY",
  "position_id":     50121,
  "deal_ticket":     9001,
  "symbol":          "XAUUSD",
  "side":            "buy | sell",
  "volume":          0.10,
  "price":           4100.00,
  "sl":              4090.00,
  "tp":              4120.00,
  "reason":          "DEAL_REASON_MOBILE",
  "source_time":     "2026-11-11T02:14:36Z",
  "detected_at":     "2026-11-11T02:14:36.120Z",
  "latency_ms":      120
}
```

**Kunci idempotency**: `master_id` + `deal_ticket`.
Deal ticket unik dan tidak berubah, jadi lebih aman daripada kombinasi symbol+waktu.

---

## 4. Kontrak instruksi (per follower)

```json
{
  "instruction_id": "…",
  "event_id":       42,
  "follower_id":    3,
  "action":         "OPEN | MODIFY | CLOSE_PARTIAL | CLOSE_FULL | PENDING_*",
  "symbol":         "XAUUSD.m",
  "side":           "buy",
  "volume":         0.08,
  "price":          4100.00,
  "sl":             4093.20,
  "tp":             4120.00,
  "ttl_ms":         8000,
  "created_at":     "…",
  "state":          "QUEUED"
}
```

---

## 5. State machine instruksi

```
QUEUED ──► SENT ──► ACKED
             │
             ├──► RETRY ──► SENT        (requote / gagal sementara, setelah verifikasi)
             ├──► FAILED                (margin / symbol / volume ditolak)
             └──► STALE ──► DIBUANG     (TTL lewat)
```

| State | Arti |
|---|---|
| QUEUED | Menunggu giliran di antrean follower |
| SENT | Sudah dikirim ke worker |
| ACKED | Broker menerima, retcode sukses, fill tercatat |
| RETRY | Gagal sementara; retry hanya setelah status diverifikasi |
| FAILED | Ditolak permanen; alert operator |
| STALE | Lewat TTL sebelum dieksekusi |

---

## 6. Pemetaan posisi (wajib)

Untuk setiap posisi master, sistem menyimpan relasi ke posisi follower:

```
positions_map
  master_id, master_position_id, master_ticket
  follower_id, follower_ticket
  volume_master, volume_follower
  direction, sl, tp
  state: OPEN | PARTIALLY_CLOSED | CLOSED | ORPHANED
```

Tanpa tabel ini, sistem tidak bisa tahu follower ticket mana yang harus ditutup
ketika master menutup posisi.

---

## 7. Kasus tepi yang wajib ditangani

### 7.1 Partial close (kritis)
`DEAL_ENTRY_OUT` muncul pada partial **dan** full close. Pembeda:

```
jika PositionSelectByTicket(DEAL_POSITION_ID) == true
    → PARTIAL, sisa = PositionGetDouble(POSITION_VOLUME)
selain itu
    → FULL
```
Volume yang ditutup = `DEAL_VOLUME`, bukan volume posisi.

### 7.2 Double copy (kritis)
Penyebab: reconnect, replay queue, dua poll membaca state yang sama.
Mitigasi: idempotency key + pencatatan event yang sudah diproses.

### 7.3 Reverse & close-by
- `DEAL_ENTRY_INOUT` = reversal (netting) — satu deal menutup dan membuka
- `DEAL_ENTRY_OUT_BY` = close by posisi berlawanan (hedging)

Keduanya **bukan** close biasa dan harus ditangani terpisah.

### 7.4 Pending order
Order pending bisa **terisi** (jadi posisi) atau **hilang** (cancel/expire).
Dua-duanya hilang dari daftar order tapi artinya berbeda — bedakan lewat history.

### 7.5 Instruksi stale
Follower reconnect lalu menerima instruksi lama. Instruksi lewat TTL dibuang.
Reconcile dijalankan sebelum menerima instruksi baru.

### 7.6 Lintas broker
Yang berbeda per broker: nama symbol, digits, contract size, lot step, min/max volume,
filling mode, stops level, jam sesi, leverage.

Semua harus dibaca dari terminal follower saat onboarding, disimpan sebagai broker profile,
bukan di-hardcode.

### 7.7 Master stale
Observer hidup tapi tidak ada update. Deteksi lewat heartbeat (bandingkan waktu terakhir
data berubah), bukan menyimpulkan "tidak ada transaksi".

### 7.8 Posisi orphan
Koneksi putus saat follower masih punya posisi:
1. Jangan buka posisi baru
2. Jangan auto-close
3. Pertahankan SL/TP yang ada
4. Tandai ORPHANED
5. Alert operator
6. Reconcile sebelum lanjut

---

## 8. Definisi drift

| Jenis | Contoh | Tindakan |
|---|---|---|
| **Allowed drift** | multiplier lot, pembulatan lot step, min volume broker | Dicatat, tidak diperbaiki |
| **Sync error** | posisi hilang, posisi ganda, arah salah, SL/TP tidak sinkron | Diperbaiki / alert |

Target: **zero unexplained drift** setelah reconciliation.

---

## 9. Yang harus dibuktikan sebelum alur ini dibangun

| Langkah | Butuh bukti dari |
|---|---|
| [3] Observer membaca | PoC-1: 100% deteksi, 0 missed, termasuk order dari MT5 Mobile |
| [4] Normalisasi event | PoC-1: partial close terbukti bisa dibedakan dari full |
| [9] Eksekusi follower | PoC-3: perilaku reject/requote tiap broker |
| [10] Reconcile | PoC-4: drift bisa mencapai nol unexplained |

**Selama PoC-1 belum lulus, tidak ada production coding untuk alur ini.**

---

## 10. Referensi

- Halaman visual: `#/flow` di dashboard
- Fakta teknis terverifikasi: lihat `README.md` bagian keamanan + skill `nexora-copy-hub`
- Dokumen arsitektur lengkap: `~/NEXORA_COPYHUB_DOCS/` (01–05)
