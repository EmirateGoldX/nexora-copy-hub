-- ============================================================================
-- NEXORA COPY HUB — Skema awal (PostgreSQL / Neon)
-- Migrasi 0001
--
-- ATURAN KEAMANAN YANG MENGIKAT:
--   TIDAK ADA kolom password di skema ini.
--   Kredensial hanya disimpan sebagai REFERENSI ke secret manager (KMS/Vault).
--   Nilai password asli tidak boleh pernah masuk database, log, atau repo.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- ENUM
-- ---------------------------------------------------------------------------
create type account_role      as enum ('master', 'follower');
create type account_status    as enum ('active', 'paused', 'error', 'archived');
create type event_type        as enum (
  'OPEN', 'MODIFY', 'PARTIAL_CLOSE', 'CLOSE',
  'PENDING_PLACED', 'PENDING_MODIFIED', 'PENDING_CANCELLED', 'PENDING_FILLED',
  'REVERSAL', 'CLOSE_BY'
);
create type instruction_action as enum (
  'OPEN', 'MODIFY', 'CLOSE_PARTIAL', 'CLOSE_FULL',
  'PENDING_PLACE', 'PENDING_MODIFY', 'PENDING_CANCEL'
);
create type instruction_state  as enum ('QUEUED', 'SENT', 'ACKED', 'RETRY', 'FAILED', 'STALE');
create type volume_rule        as enum ('fixed', 'multiplier', 'equity');
create type position_state     as enum ('OPEN', 'PARTIALLY_CLOSED', 'CLOSED', 'ORPHANED');
create type drift_category     as enum ('allowed', 'sync_error');
create type worker_role        as enum ('master_observer', 'follower_executor');

-- ---------------------------------------------------------------------------
-- UTIL: updated_at otomatis
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 1. WORKERS — Windows cloud worker (didefinisikan lebih dulu: dipakai master & follower)
-- ---------------------------------------------------------------------------
create table workers (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,     -- W1, W2, ...
  host              text not null,
  region            text,
  role              worker_role not null,
  status            text not null default 'unknown',
  last_heartbeat_at timestamptz,
  created_at        timestamptz not null default now()
);
create index workers_heartbeat_idx on workers (last_heartbeat_at desc);

-- metrik per worker (dipisah supaya tabel utama tidak terus ditulis)
create table worker_metrics (
  worker_id      uuid not null references workers(id) on delete cascade,
  captured_at    timestamptz not null default now(),
  terminal_count integer,
  ram_used_mb    integer,
  ram_total_mb   integer,
  cpu_pct        numeric(5, 2),
  disk_io_kbps   integer,
  restart_count  integer,
  primary key (worker_id, captured_at)
);

-- ---------------------------------------------------------------------------
-- 2. MASTER — akun sumber, diakses read-only lewat investor password
-- ---------------------------------------------------------------------------
create table masters (
  id                uuid primary key default gen_random_uuid(),
  label             text        not null,
  broker            text        not null,
  server            text        not null,
  login             text        not null,
  symbol            text        not null default 'XAUUSD',
  poll_interval_ms  integer     not null default 250
                    check (poll_interval_ms between 100 and 10000),
  l2_enabled        boolean     not null default true,   -- deal history
  stale_after_s     integer     not null default 180,
  status            account_status not null default 'active',
  worker_id         uuid references workers(id) on delete set null,

  -- Referensi ke secret manager. BUKAN password.
  credential_ref    text,
  credential_set_at timestamptz,

  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index masters_server_login_uk on masters (server, login);
create trigger masters_touch before update on masters
  for each row execute function set_updated_at();

comment on column masters.credential_ref is
  'Path/ID di secret manager (KMS/Vault). Tidak pernah berisi password.';

-- ---------------------------------------------------------------------------
-- 3. FOLLOWER — akun eksekutor, butuh kredensial dengan hak transaksi
-- ---------------------------------------------------------------------------
create table followers (
  id                uuid primary key default gen_random_uuid(),
  label             text        not null,
  broker            text        not null,
  server            text        not null,
  login             text        not null,

  master_id          uuid references masters(id) on delete set null,

  -- pemetaan symbol lintas broker
  map_symbol_from    text       not null default 'XAUUSD',
  map_symbol_to      text       not null,

  -- aturan volume
  volume_rule        volume_rule not null default 'fixed',
  volume_value       numeric(18, 8) not null default 0.01
                     check (volume_value > 0),

  -- opsi eksekusi
  copy_partial       boolean    not null default true,
  copy_pending       boolean    not null default true,
  clamp_sltp         boolean    not null default true,

  -- batas aman
  max_lot            numeric(18, 8),
  max_positions      integer,
  instruction_ttl_ms integer    not null default 8000,

  status             account_status not null default 'active',
  worker_id          uuid references workers(id) on delete set null,
  credential_ref     text,
  credential_set_at  timestamptz,

  note               text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create unique index followers_server_login_uk on followers (server, login);
create index followers_master_idx on followers (master_id);
create trigger followers_touch before update on followers
  for each row execute function set_updated_at();

comment on column followers.credential_ref is
  'Referensi KMS ke trading password. Password asli tidak boleh ada di tabel ini.';

-- ---------------------------------------------------------------------------
-- 4. BROKER PROFILE — spesifikasi eksekusi per broker (dibaca dari terminal)
--    Tidak boleh diasumsikan sama antar broker.
-- ---------------------------------------------------------------------------
create table broker_profiles (
  id              uuid primary key default gen_random_uuid(),
  server          text not null,
  symbol          text not null,
  digits          smallint,
  point           numeric(18, 10),
  contract_size   numeric(18, 8),
  tick_value      numeric(18, 8),
  volume_min      numeric(18, 8),
  volume_max      numeric(18, 8),
  volume_step     numeric(18, 8),
  stops_level_pts integer,
  filling_modes   text[],          -- IOC / FOK / RETURN
  trade_mode      text,            -- demo / real / contest
  probed_at       timestamptz not null default now()
);
create unique index broker_profiles_uk on broker_profiles (server, symbol);

-- ---------------------------------------------------------------------------
-- 5. EVENTS — hasil deteksi observer (L1 current state + L2 deal history)
-- ---------------------------------------------------------------------------
create table events (
  id               bigserial primary key,
  idempotency_key  text        not null unique,     -- mis. 'A|deal:9001'
  master_id        uuid        not null references masters(id) on delete cascade,
  type             event_type  not null,

  position_id      bigint,                          -- DEAL_POSITION_ID
  deal_ticket      bigint,                          -- deal yang memicu event

  symbol           text,
  side             text check (side in ('buy', 'sell')),
  volume           numeric(18, 8),
  price            numeric(18, 8),
  sl               numeric(18, 8),
  tp               numeric(18, 8),

  reason           text,        -- DEAL_REASON_* (client/mobile/web/expert/sl/tp/so)
  source_time      timestamptz, -- waktu server broker
  detected_at      timestamptz not null default now(),
  latency_ms       integer,

  processed_at     timestamptz,
  created_at       timestamptz not null default now()
);
create index events_master_time_idx on events (master_id, created_at desc);
create index events_unprocessed_idx on events (created_at) where processed_at is null;

comment on column events.idempotency_key is
  'Unik per transaksi. Mencegah double-copy saat reconnect atau replay queue.';

-- ---------------------------------------------------------------------------
-- 6. INSTRUCTIONS — satu baris per follower per event
-- ---------------------------------------------------------------------------
create table instructions (
  id               bigserial primary key,
  event_id         bigint      not null references events(id) on delete cascade,
  follower_id      uuid        not null references followers(id) on delete cascade,

  action           instruction_action not null,
  symbol           text        not null,
  side             text,
  volume           numeric(18, 8),
  price            numeric(18, 8),
  sl               numeric(18, 8),
  tp               numeric(18, 8),

  state            instruction_state not null default 'QUEUED',
  ttl_ms           integer     not null default 8000,
  expires_at       timestamptz not null,

  attempt          smallint    not null default 0 check (attempt between 0 and 5),
  retcode          integer,                        -- MqlTradeResult.retcode
  fill_volume      numeric(18, 8),
  broker_order_id  bigint,
  error            text,

  created_at       timestamptz not null default now(),
  sent_at          timestamptz,
  acked_at         timestamptz
);
create index instructions_queue_idx on instructions (follower_id, state, created_at);
create index instructions_expiry_idx on instructions (expires_at) where state in ('QUEUED', 'SENT');
create unique index instructions_event_follower_uk on instructions (event_id, follower_id);

-- ---------------------------------------------------------------------------
-- 7. POSITIONS_MAP — relasi posisi master ke posisi follower
--    Tanpa tabel ini, sistem tidak tahu ticket mana yang harus ditutup.
-- ---------------------------------------------------------------------------
create table positions_map (
  id                  uuid primary key default gen_random_uuid(),
  master_id           uuid   not null references masters(id) on delete cascade,
  master_position_id  bigint not null,
  master_ticket       bigint,

  follower_id         uuid   not null references followers(id) on delete cascade,
  follower_ticket     bigint not null,

  symbol_master       text,
  symbol_follower     text,
  direction           text check (direction in ('buy', 'sell')),
  volume_master       numeric(18, 8),
  volume_follower     numeric(18, 8),
  sl                  numeric(18, 8),
  tp                  numeric(18, 8),

  state               position_state not null default 'OPEN',
  opened_at           timestamptz not null default now(),
  closed_at           timestamptz,
  updated_at          timestamptz not null default now()
);
create unique index positions_map_uk on positions_map (follower_id, master_position_id);
create index positions_map_state_idx on positions_map (state) where state <> 'CLOSED';
create trigger positions_map_touch before update on positions_map
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. DRIFT_LOG — allowed drift vs sync error
-- ---------------------------------------------------------------------------
create table drift_log (
  id            bigserial primary key,
  follower_id   uuid not null references followers(id) on delete cascade,
  category      drift_category not null,
  field         text,
  expected      text,
  actual        text,
  note          text,
  detected_at   timestamptz not null default now(),
  resolved_at   timestamptz
);
create index drift_open_idx on drift_log (follower_id) where resolved_at is null;
create index drift_category_idx on drift_log (category, detected_at desc);

comment on table drift_log is
  'allowed = perbedaan akibat konfigurasi/batasan broker (wajib tercatat, tidak diperbaiki). '
  'sync_error = kegagalan sinkronisasi (harus diperbaiki atau di-alert).';

-- ---------------------------------------------------------------------------
-- 9. USERS — akses dashboard
-- ---------------------------------------------------------------------------
create table users (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,
  display_name   text,
  role           text not null default 'viewer'
                 check (role in ('owner', 'admin', 'operator', 'viewer')),
  mfa_enabled    boolean not null default false,
  password_hash  text,          -- hash argon2/bcrypt, BUKAN password
  last_login_at  timestamptz,
  disabled_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger users_touch before update on users
  for each row execute function set_updated_at();

comment on column users.password_hash is
  'Hash Argon2id/bcrypt untuk login dashboard. Bukan password trading.';

-- ---------------------------------------------------------------------------
-- 10. AUDIT_LOG — semua instruksi dan perubahan konfigurasi
-- ---------------------------------------------------------------------------
create table audit_log (
  id           bigserial primary key,
  actor        text,                -- user id / 'system' / worker code
  action       text not null,
  target_type  text,
  target_id    text,
  before       jsonb,
  after        jsonb,
  ip           inet,
  created_at   timestamptz not null default now()
);
create index audit_time_idx on audit_log (created_at desc);
create index audit_target_idx on audit_log (target_type, target_id);

-- ---------------------------------------------------------------------------
-- VIEW: ringkasan untuk dashboard
-- ---------------------------------------------------------------------------
create view v_follower_status as
select
  f.id,
  f.label,
  f.broker,
  f.login,
  m.label                                   as master_label,
  f.map_symbol_from || ' → ' || f.map_symbol_to as symbol_map,
  f.volume_rule,
  f.volume_value,
  f.status,
  coalesce(p.open_positions, 0)             as open_positions,
  coalesce(p.orphaned, 0)                   as orphaned,
  coalesce(d.sync_errors, 0)                as sync_errors,
  coalesce(d.allowed_drift, 0)              as allowed_drift,
  w.last_heartbeat_at
from followers f
left join masters m on m.id = f.master_id
left join lateral (
  select count(*) filter (where state in ('OPEN', 'PARTIALLY_CLOSED')) as open_positions,
         count(*) filter (where state = 'ORPHANED')                   as orphaned
  from positions_map pm where pm.follower_id = f.id
) p on true
left join lateral (
  select count(*) filter (where category = 'sync_error' and resolved_at is null) as sync_errors,
         count(*) filter (where category = 'allowed')                            as allowed_drift
  from drift_log dl where dl.follower_id = f.id
) d on true
left join workers w on w.id = f.worker_id;

commit;

-- ============================================================================
-- CATATAN NEON
-- ----------------------------------------------------------------------------
-- 1. Password TIDAK ada di skema ini. Simpan di KMS/Vault, simpan referensinya
--    di kolom credential_ref.
-- 2. Gunakan koneksi POOLED (hostname berakhiran -pooler) untuk aplikasi.
--    Koneksi langsung hanya untuk migrasi.
-- 3. SSL wajib: sslmode=require
-- 4. Gunakan timestamptz, bukan timestamp — server broker punya zona waktu beda.
-- 5. numeric untuk harga/volume, jangan float (pembulatan lot harus eksak).
-- ============================================================================
